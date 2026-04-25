import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveAdminActor } from "../_shared/admin.ts";
import { createAdminClient, resolveRequestOrigin } from "../_shared/auth.ts";
import { corsHeaders, createHttpError, jsonResponse } from "../_shared/http.ts";
import {
  buildOneRosterSeatCandidate,
  fetchOneRosterCollection,
  fetchOneRosterResource,
  normalizeOneRosterManifest,
  type OneRosterManifest,
  type OneRosterSeatCandidate
} from "../_shared/oneroster.ts";

type JsonRecord = Record<string, unknown>;
type AdminClient = ReturnType<typeof createAdminClient>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNullableString(value: unknown) {
  const resolved = toStringValue(value);
  return resolved || null;
}

async function resolveRunBySlug(adminClient: AdminClient, runSlug: string) {
  const { data, error } = await adminClient
    .schema("delivery")
    .from("course_run")
    .select("id, slug, title, oneroster_manifest")
    .eq("slug", runSlug)
    .maybeSingle();

  if (error || !data) {
    throw createHttpError(error?.message || "Cohorte no encontrada para OneRoster", 404);
  }

  return {
    id: Number(data.id),
    slug: String(data.slug || ""),
    title: String(data.title || ""),
    onerosterManifest: normalizeOneRosterManifest(data.oneroster_manifest)
  };
}

async function resolveActorPersonId(adminClient: AdminClient, actorId: string) {
  const { data, error } = await adminClient
    .schema("identity")
    .from("person")
    .select("id")
    .eq("id", actorId)
    .maybeSingle();

  if (error) {
    throw createHttpError(error.message, 400);
  }

  return data?.id ? String(data.id) : null;
}

async function createSyncLog(adminClient: AdminClient, input: {
  courseRunId: number;
  actorPersonId: string | null;
  manifest: OneRosterManifest;
}) {
  const { data, error } = await adminClient
    .schema("delivery")
    .from("course_run_roster_sync")
    .insert({
      course_run_id: input.courseRunId,
      actor_person_id: input.actorPersonId,
      provider: "oneroster",
      version: "1.2",
      direction: "pull",
      status: "running",
      request_snapshot: {
        manifest: input.manifest,
        started_by: input.actorPersonId
      }
    })
    .select("id")
    .single();

  if (error || !data) {
    throw createHttpError(error?.message || "No se pudo crear la corrida de OneRoster", 400);
  }

  return Number(data.id);
}

async function finalizeSyncLog(adminClient: AdminClient, syncId: number, payload: {
  status: "completed" | "partial" | "failed";
  processedSeats: number;
  matchedSeats: number;
  invitedSeats: number;
  enrolledSeats: number;
  teacherRoleSeats: number;
  skippedSeats: number;
  failedSeats: number;
  responseSnapshot: JsonRecord;
  errorMessage?: string | null;
}) {
  const { error } = await adminClient
    .schema("delivery")
    .from("course_run_roster_sync")
    .update({
      status: payload.status,
      processed_seats: payload.processedSeats,
      matched_seats: payload.matchedSeats,
      invited_seats: payload.invitedSeats,
      enrolled_seats: payload.enrolledSeats,
      teacher_role_seats: payload.teacherRoleSeats,
      skipped_seats: payload.skippedSeats,
      failed_seats: payload.failedSeats,
      response_snapshot: payload.responseSnapshot,
      error_message: payload.errorMessage || null,
      finished_at: new Date().toISOString()
    })
    .eq("id", syncId);

  if (error) {
    throw createHttpError(error.message, 400);
  }
}

async function findPersonByEmail(adminClient: AdminClient, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const exact = await adminClient
    .schema("identity")
    .from("person")
    .select("id, email, full_name")
    .eq("email", normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (exact.error) {
    throw createHttpError(exact.error.message, 400);
  }

  if (exact.data) {
    return exact.data;
  }

  const fuzzy = await adminClient
    .schema("identity")
    .from("person")
    .select("id, email, full_name")
    .ilike("email", normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (fuzzy.error) {
    throw createHttpError(fuzzy.error.message, 400);
  }

  return fuzzy.data || null;
}

async function findAuthUserByEmail(adminClient: AdminClient, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;

  while (page <= 10) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 200
    });

    if (error) {
      throw createHttpError(error.message, 400);
    }

    const users = data?.users || [];
    const match = users.find((entry) => String(entry.email || "").trim().toLowerCase() === normalizedEmail);
    if (match) {
      return match;
    }

    if (users.length < 200) {
      break;
    }

    page += 1;
  }

  return null;
}

async function ensureIdentityPerson(adminClient: AdminClient, input: {
  authUserId: string;
  email: string | null;
  fullName: string;
}) {
  const payload = {
    id: input.authUserId,
    email: input.email ? input.email.toLowerCase() : null,
    full_name: input.fullName || input.email || input.authUserId,
    source: "oneroster-sync"
  };

  const { data, error } = await adminClient
    .schema("identity")
    .from("person")
    .upsert(payload, { onConflict: "id" })
    .select("id, email, full_name")
    .single();

  if (error || !data) {
    throw createHttpError(error?.message || "No se pudo asegurar identity.person para OneRoster", 400);
  }

  return data;
}

async function ensurePersonRole(adminClient: AdminClient, personId: string, roleCode: "student" | "teacher" | "admin") {
  const { error } = await adminClient
    .schema("identity")
    .from("person_role")
    .upsert(
      {
        person_id: personId,
        role_code: roleCode,
        source: "oneroster-sync"
      },
      { onConflict: "person_id,role_code" }
    );

  if (error) {
    throw createHttpError(error.message, 400);
  }
}

async function inviteOrResolvePerson(adminClient: AdminClient, input: {
  email: string;
  fullName: string;
  redirectTo: string;
  runSlug: string;
}) {
  const email = input.email.trim().toLowerCase();
  const metadata = {
    full_name: input.fullName,
    campus_source: "oneroster",
    campus_run_slug: input.runSlug
  };

  const invited = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: input.redirectTo,
    data: metadata
  });

  if (invited.error) {
    const existingUser = await findAuthUserByEmail(adminClient, email);
    if (!existingUser) {
      throw createHttpError(invited.error.message, 400);
    }

    const person = await ensureIdentityPerson(adminClient, {
      authUserId: existingUser.id,
      email,
      fullName: input.fullName
    });

    return {
      person,
      invited: false
    };
  }

  const user = invited.data?.user;
  if (!user?.id) {
    throw createHttpError("Supabase no devolvio un usuario al invitar por OneRoster", 500);
  }

  const person = await ensureIdentityPerson(adminClient, {
    authUserId: user.id,
    email,
    fullName: input.fullName
  });

  return {
    person,
    invited: true
  };
}

async function ensureEnrollment(adminClient: AdminClient, input: {
  personId: string;
  courseRunId: number;
  status: "invited" | "active" | "cancelled";
}) {
  const { data, error } = await adminClient
    .schema("enrollment")
    .from("enrollment")
    .upsert(
      {
        person_id: input.personId,
        course_run_id: input.courseRunId,
        status: input.status,
        source: "oneroster-sync"
      },
      { onConflict: "person_id,course_run_id" }
    )
    .select("id, status")
    .single();

  if (error || !data) {
    throw createHttpError(error?.message || "No se pudo sincronizar enrollment desde OneRoster", 400);
  }

  return {
    id: Number(data.id),
    status: String(data.status || input.status)
  };
}

async function upsertRosterSeat(adminClient: AdminClient, payload: Record<string, unknown>) {
  const { error } = await adminClient
    .schema("delivery")
    .from("course_run_roster_seat")
    .upsert(payload, { onConflict: "course_run_id,enrollment_sourced_id" });

  if (error) {
    throw createHttpError(error.message, 400);
  }
}

async function resolveUserMap(
  manifest: OneRosterManifest,
  enrollments: JsonRecord[]
) {
  const userMap = new Map<string, JsonRecord>();
  const seenUserIds = new Set<string>();

  for (const enrollment of enrollments) {
    const userSourcedId = toStringValue(
      isRecord(enrollment.user) ? enrollment.user.sourcedId : enrollment.user
    ) || toStringValue(enrollment.userSourcedId);

    if (!userSourcedId || seenUserIds.has(userSourcedId)) {
      continue;
    }

    seenUserIds.add(userSourcedId);
    const user = await fetchOneRosterResource<JsonRecord>({
      manifest,
      resourcePath: `users/${encodeURIComponent(userSourcedId)}`,
      resourceKey: "user"
    });

    if (user && isRecord(user)) {
      userMap.set(userSourcedId, user);
    }
  }

  return userMap;
}

async function processSeat(adminClient: AdminClient, input: {
  candidate: OneRosterSeatCandidate;
  manifest: OneRosterManifest;
  courseRunId: number;
  runSlug: string;
  syncId: number;
  inviteRedirectTo: string;
}) {
  const candidate = input.candidate;
  const upsertBase = {
    course_run_id: input.courseRunId,
    latest_sync_id: input.syncId,
    school_sourced_id: candidate.schoolSourcedId,
    class_sourced_id: candidate.classSourcedId,
    enrollment_sourced_id: candidate.enrollmentSourcedId,
    user_sourced_id: candidate.userSourcedId,
    role_code: candidate.roleCode,
    external_status: candidate.externalStatus,
    user_email: candidate.userEmail,
    user_name: candidate.userName || candidate.userEmail || candidate.userSourcedId,
    user_username: candidate.userUsername,
    user_identifier: candidate.userIdentifier,
    raw_user: candidate.rawUser,
    raw_enrollment: candidate.rawEnrollment,
    last_seen_at: new Date().toISOString()
  } satisfies Record<string, unknown>;

  if (candidate.roleCode === "unknown") {
    await upsertRosterSeat(adminClient, {
      ...upsertBase,
      sync_state: "skipped",
      sync_note: "Rol OneRoster no soportado por el campus"
    });

    return {
      matched: false,
      invited: false,
      enrolled: false,
      teacherRole: false,
      skipped: true,
      failed: false
    };
  }

  if (candidate.roleCode === "teacher" && !input.manifest.syncTeacherRoles) {
    await upsertRosterSeat(adminClient, {
      ...upsertBase,
      sync_state: "skipped",
      sync_note: "sync_teacher_roles esta apagado para esta cohorte"
    });

    return {
      matched: false,
      invited: false,
      enrolled: false,
      teacherRole: false,
      skipped: true,
      failed: false
    };
  }

  try {
    let person = candidate.userEmail
      ? await findPersonByEmail(adminClient, candidate.userEmail)
      : null;
    let invited = false;

    if (!person && input.manifest.provisionMode === "invite_missing") {
      if (!candidate.userEmail) {
        throw new Error("El seat no trae email y no puede invitarse");
      }

      const invitedPerson = await inviteOrResolvePerson(adminClient, {
        email: candidate.userEmail,
        fullName: candidate.userName || candidate.userEmail,
        redirectTo: input.inviteRedirectTo,
        runSlug: input.runSlug
      });

      person = invitedPerson.person;
      invited = invitedPerson.invited;
    }

    if (!person) {
      await upsertRosterSeat(adminClient, {
        ...upsertBase,
        sync_state: "staged",
        sync_note: candidate.userEmail
          ? "Seat importado sin match local; provision_mode=match_only"
          : "Seat importado sin email resoluble para match local"
      });

      return {
        matched: false,
        invited: false,
        enrolled: false,
        teacherRole: false,
        skipped: false,
        failed: false
      };
    }

    const roleCode = candidate.roleCode === "teacher"
      ? "teacher"
      : candidate.roleCode === "admin"
        ? "admin"
        : "student";
    await ensurePersonRole(adminClient, String(person.id), roleCode);

    let enrollmentId: number | null = null;
    let syncState: "matched" | "invited" | "enrolled" = invited ? "invited" : "matched";
    let syncNote = invited
      ? "Usuario invitado desde OneRoster y preparado para onboarding en Campus"
      : "Usuario vinculado por email con identity.person";

    if (candidate.roleCode === "student") {
      const enrollment = await ensureEnrollment(adminClient, {
        personId: String(person.id),
        courseRunId: input.courseRunId,
        status: invited
          ? "invited"
          : candidate.externalStatus === "active"
            ? "active"
            : "cancelled"
      });

      enrollmentId = enrollment.id;
      syncState = invited ? "invited" : "enrolled";
      syncNote = invited
        ? "Learner invitado y matricula creada en estado invited"
        : enrollment.status === "cancelled"
          ? "Learner sincronizado y matricula marcada como cancelled por estado externo"
          : "Learner sincronizado y matricula activa";
    } else if (candidate.roleCode === "teacher") {
      syncNote = invited
        ? "Docente invitado y rol teacher sincronizado"
        : "Docente sincronizado en identity.person_role";
    } else {
      syncNote = invited
        ? "Administrador invitado y rol admin sincronizado"
        : "Administrador sincronizado en identity.person_role";
    }

    const now = new Date().toISOString();
    await upsertRosterSeat(adminClient, {
      ...upsertBase,
      person_id: person.id,
      enrollment_id: enrollmentId,
      sync_state: syncState,
      sync_note: syncNote,
      matched_at: now,
      invited_at: invited ? now : null,
      enrolled_at: enrollmentId ? now : null
    });

    return {
      matched: true,
      invited,
      enrolled: Boolean(enrollmentId),
      teacherRole: candidate.roleCode === "teacher",
      skipped: false,
      failed: false
    };
  } catch (error) {
    await upsertRosterSeat(adminClient, {
      ...upsertBase,
      sync_state: "error",
      sync_note: (error as Error).message
    });

    return {
      matched: false,
      invited: false,
      enrolled: false,
      teacherRole: false,
      skipped: false,
      failed: true
    };
  }
}

async function handleSyncRun(req: Request, adminClient: AdminClient, actorId: string, body: Record<string, unknown>) {
  const runSlug = String(body.run_slug || "power-skills-pilot-open");
  const run = await resolveRunBySlug(adminClient, runSlug);
  const manifest = run.onerosterManifest;

  if (!manifest.enabled) {
    throw createHttpError("OneRoster esta deshabilitado para esta cohorte", 409);
  }

  if (!manifest.baseUrl || !manifest.sourcedIds.school || !manifest.sourcedIds.class || !manifest.auth.tokenSecretName) {
    throw createHttpError("OneRoster no esta configurado completamente para esta cohorte", 409);
  }

  const actorPersonId = await resolveActorPersonId(adminClient, actorId);
  const syncId = await createSyncLog(adminClient, {
    courseRunId: run.id,
    actorPersonId,
    manifest
  });

  try {
    const enrollments = await fetchOneRosterCollection<JsonRecord>({
      manifest,
      resourcePath: `schools/${encodeURIComponent(manifest.sourcedIds.school)}/classes/${encodeURIComponent(manifest.sourcedIds.class)}/enrollments`,
      collectionKey: "enrollments"
    });
    const userMap = await resolveUserMap(manifest, enrollments);
    const inviteRedirectTo = new URL(manifest.inviteRedirectPath, resolveRequestOrigin(req)).toString();
    const counters = {
      processedSeats: 0,
      matchedSeats: 0,
      invitedSeats: 0,
      enrolledSeats: 0,
      teacherRoleSeats: 0,
      skippedSeats: 0,
      failedSeats: 0
    };
    const errors: string[] = [];

    for (const enrollment of enrollments) {
      try {
        const userSourcedId = toStringValue(
          isRecord(enrollment.user) ? enrollment.user.sourcedId : enrollment.user
        ) || toStringValue(enrollment.userSourcedId);
        const candidate = buildOneRosterSeatCandidate({
          schoolSourcedId: manifest.sourcedIds.school,
          classSourcedId: manifest.sourcedIds.class,
          enrollment,
          user: userMap.get(userSourcedId) || {}
        });
        const result = await processSeat(adminClient, {
          candidate,
          manifest,
          courseRunId: run.id,
          runSlug: run.slug,
          syncId,
          inviteRedirectTo
        });

        counters.processedSeats += 1;
        counters.matchedSeats += result.matched ? 1 : 0;
        counters.invitedSeats += result.invited ? 1 : 0;
        counters.enrolledSeats += result.enrolled ? 1 : 0;
        counters.teacherRoleSeats += result.teacherRole ? 1 : 0;
        counters.skippedSeats += result.skipped ? 1 : 0;
        counters.failedSeats += result.failed ? 1 : 0;
      } catch (error) {
        counters.processedSeats += 1;
        counters.failedSeats += 1;
        errors.push((error as Error).message);
      }
    }

    const status = counters.failedSeats > 0 ? "partial" : "completed";
    await finalizeSyncLog(adminClient, syncId, {
      status,
      ...counters,
      responseSnapshot: {
        run_slug: run.slug,
        processed_seats: counters.processedSeats,
        matched_seats: counters.matchedSeats,
        invited_seats: counters.invitedSeats,
        enrolled_seats: counters.enrolledSeats,
        teacher_role_seats: counters.teacherRoleSeats,
        skipped_seats: counters.skippedSeats,
        failed_seats: counters.failedSeats,
        sample_errors: errors.slice(0, 10)
      }
    });

    return {
      sync_id: syncId,
      run_slug: run.slug,
      status,
      processed_seats: counters.processedSeats,
      matched_seats: counters.matchedSeats,
      invited_seats: counters.invitedSeats,
      enrolled_seats: counters.enrolledSeats,
      teacher_role_seats: counters.teacherRoleSeats,
      skipped_seats: counters.skippedSeats,
      failed_seats: counters.failedSeats
    };
  } catch (error) {
    await finalizeSyncLog(adminClient, syncId, {
      status: "failed",
      processedSeats: 0,
      matchedSeats: 0,
      invitedSeats: 0,
      enrolledSeats: 0,
      teacherRoleSeats: 0,
      skippedSeats: 0,
      failedSeats: 0,
      responseSnapshot: {},
      errorMessage: (error as Error).message
    });
    throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const actor = await resolveAdminActor(req);
    const adminClient = createAdminClient();
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "sync-run");

    switch (action) {
      case "sync-run":
        return jsonResponse(await handleSyncRun(req, adminClient, actor.id, body));
      default:
        throw createHttpError("Accion OneRoster no soportada", 400);
    }
  } catch (error) {
    const status = (error as { status?: number }).status || 400;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
