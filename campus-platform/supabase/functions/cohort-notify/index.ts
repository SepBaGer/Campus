import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveAdminActor } from "../_shared/admin.ts";
import { createAdminClient } from "../_shared/auth.ts";
import { corsHeaders, createHttpError, jsonResponse } from "../_shared/http.ts";
import {
  type JsonRecord,
  type NotificationAudience,
  type NotificationChannel,
  type NotificationRunContext,
  type NotificationTemplateRow,
  normalizeNotificationDispatchStatus,
  renderNotificationCopy,
  renderNotificationEmailHtml,
  resolveNotificationSchedule,
  sendResendEmail,
  sendWebPushNotification,
  toNullableString
} from "../_shared/notifications.ts";

type TargetEnrollment = {
  person_id: string;
  status: string;
  email: string;
  full_name: string;
};

type SessionSummary = {
  sessionCount: number;
  nextSessionTitle: string;
  nextSessionStartsAt: string;
  nextSessionLocationLabel: string;
};

function getAudienceStatuses(audience: NotificationAudience) {
  switch (audience) {
    case "invited":
      return ["invited"];
    case "completed":
      return ["completed"];
    case "all":
      return ["invited", "active", "completed", "cancelled"];
    case "active":
    default:
      return ["active"];
  }
}

async function resolveRunContext(
  adminClient: ReturnType<typeof createAdminClient>,
  runSlug: string
): Promise<NotificationRunContext> {
  const { data, error } = await adminClient
    .schema("delivery")
    .from("course_run")
    .select("id, slug, title, starts_at, ends_at, course:course_id (slug, title)")
    .eq("slug", runSlug)
    .maybeSingle();

  if (error || !data) {
    throw createHttpError(error?.message || "Cohorte no encontrada", 404);
  }

  const course = (data.course && typeof data.course === "object" ? data.course : {}) as Record<string, unknown>;
  return {
    id: Number(data.id),
    slug: String(data.slug || ""),
    title: String(data.title || ""),
    starts_at: toNullableString(data.starts_at),
    ends_at: toNullableString(data.ends_at),
    course_slug: String(course.slug || ""),
    course_title: String(course.title || "")
  };
}

async function resolveTemplate(
  adminClient: ReturnType<typeof createAdminClient>,
  runId: number,
  templateSlug: string
): Promise<NotificationTemplateRow> {
  const { data, error } = await adminClient
    .schema("delivery")
    .from("notification_template")
    .select("id, course_run_id, slug, title, channel_code, audience_code, trigger_code, offset_days, offset_hours, subject_template, body_template, cta_label, cta_url, status")
    .eq("course_run_id", runId)
    .eq("slug", templateSlug)
    .maybeSingle();

  if (error || !data) {
    throw createHttpError(error?.message || "Plantilla no encontrada", 404);
  }

  return {
    id: Number(data.id),
    course_run_id: Number(data.course_run_id),
    slug: String(data.slug || ""),
    title: String(data.title || ""),
    channel_code: String(data.channel_code || "email") as NotificationChannel,
    audience_code: String(data.audience_code || "active") as NotificationAudience,
    trigger_code: String(data.trigger_code || "manual") as NotificationTemplateRow["trigger_code"],
    offset_days: Number(data.offset_days || 0),
    offset_hours: Number(data.offset_hours || 0),
    subject_template: String(data.subject_template || ""),
    body_template: String(data.body_template || ""),
    cta_label: toNullableString(data.cta_label),
    cta_url: toNullableString(data.cta_url),
    status: String(data.status || "draft") as NotificationTemplateRow["status"]
  };
}

async function resolveActiveTemplates(
  adminClient: ReturnType<typeof createAdminClient>,
  runId: number
) {
  const { data, error } = await adminClient
    .schema("delivery")
    .from("notification_template")
    .select("id, course_run_id, slug, title, channel_code, audience_code, trigger_code, offset_days, offset_hours, subject_template, body_template, cta_label, cta_url, status")
    .eq("course_run_id", runId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) {
    throw createHttpError(error.message, 400);
  }

  return (data || []).map((entry) => ({
    id: Number(entry.id),
    course_run_id: Number(entry.course_run_id),
    slug: String(entry.slug || ""),
    title: String(entry.title || ""),
    channel_code: String(entry.channel_code || "email") as NotificationChannel,
    audience_code: String(entry.audience_code || "active") as NotificationAudience,
    trigger_code: String(entry.trigger_code || "manual") as NotificationTemplateRow["trigger_code"],
    offset_days: Number(entry.offset_days || 0),
    offset_hours: Number(entry.offset_hours || 0),
    subject_template: String(entry.subject_template || ""),
    body_template: String(entry.body_template || ""),
    cta_label: toNullableString(entry.cta_label),
    cta_url: toNullableString(entry.cta_url),
    status: String(entry.status || "active") as NotificationTemplateRow["status"]
  })) satisfies NotificationTemplateRow[];
}

async function resolveSessionSummary(
  adminClient: ReturnType<typeof createAdminClient>,
  runId: number
): Promise<SessionSummary> {
  const { data, error } = await adminClient
    .schema("delivery")
    .from("session")
    .select("title, starts_at, location_label")
    .eq("course_run_id", runId)
    .order("starts_at", { ascending: true });

  if (error) {
    throw createHttpError(error.message, 400);
  }

  const sessions = data || [];
  const now = Date.now();
  const nextSession = sessions.find((entry) => entry.starts_at && new Date(entry.starts_at).getTime() >= now)
    || sessions[0];

  return {
    sessionCount: sessions.length,
    nextSessionTitle: String(nextSession?.title || "Sin sesion programada"),
    nextSessionStartsAt: nextSession?.starts_at
      ? new Date(nextSession.starts_at).toLocaleString("es-CO")
      : "Sin fecha definida",
    nextSessionLocationLabel: String(nextSession?.location_label || "Campus")
  };
}

async function resolveTargets(
  adminClient: ReturnType<typeof createAdminClient>,
  runId: number,
  audience: NotificationAudience
) {
  const { data, error } = await adminClient
    .schema("enrollment")
    .from("enrollment")
    .select("person_id, status, person:person_id (email, full_name)")
    .eq("course_run_id", runId)
    .in("status", getAudienceStatuses(audience));

  if (error) {
    throw createHttpError(error.message, 400);
  }

  const targets = (data || []).map((entry) => {
    const person = (entry.person && typeof entry.person === "object" ? entry.person : {}) as Record<string, unknown>;
    return {
      person_id: String(entry.person_id || ""),
      status: String(entry.status || ""),
      email: String(person.email || ""),
      full_name: String(person.full_name || "")
    } satisfies TargetEnrollment;
  }).filter((entry) => entry.person_id);

  return targets;
}

async function resolvePreferences(
  adminClient: ReturnType<typeof createAdminClient>,
  personIds: string[],
  channel: NotificationChannel
) {
  if (!personIds.length) {
    return new Map<string, boolean>();
  }

  const { data, error } = await adminClient
    .schema("identity")
    .from("person_notification_preference")
    .select("person_id, is_enabled")
    .in("person_id", personIds)
    .eq("channel_code", channel);

  if (error) {
    throw createHttpError(error.message, 400);
  }

  return new Map((data || []).map((entry) => [String(entry.person_id || ""), Boolean(entry.is_enabled)]));
}

async function resolveSubscriptions(
  adminClient: ReturnType<typeof createAdminClient>,
  personIds: string[]
) {
  if (!personIds.length) {
    return new Map<string, Array<{ endpoint: string; p256dh_key: string; auth_key: string }>>();
  }

  const { data, error } = await adminClient
    .schema("identity")
    .from("web_push_subscription")
    .select("person_id, endpoint, p256dh_key, auth_key")
    .in("person_id", personIds)
    .eq("is_active", true);

  if (error) {
    throw createHttpError(error.message, 400);
  }

  return (data || []).reduce((map, entry) => {
    const personId = String(entry.person_id || "");
    const rows = map.get(personId) || [];
    rows.push({
      endpoint: String(entry.endpoint || ""),
      p256dh_key: String(entry.p256dh_key || ""),
      auth_key: String(entry.auth_key || "")
    });
    map.set(personId, rows);
    return map;
  }, new Map<string, Array<{ endpoint: string; p256dh_key: string; auth_key: string }>>());
}

async function findExistingDispatch(
  adminClient: ReturnType<typeof createAdminClient>,
  templateId: number,
  personId: string,
  channel: NotificationChannel,
  scheduledFor: string
) {
  const { data, error } = await adminClient
    .schema("delivery")
    .from("notification_dispatch")
    .select("id, status")
    .eq("template_id", templateId)
    .eq("person_id", personId)
    .eq("channel_code", channel)
    .eq("scheduled_for", scheduledFor)
    .maybeSingle();

  if (error) {
    throw createHttpError(error.message, 400);
  }

  return data
    ? {
        id: Number(data.id),
        status: normalizeNotificationDispatchStatus(data.status, "pending")
      }
    : null;
}

async function persistDispatch(
  adminClient: ReturnType<typeof createAdminClient>,
  payload: JsonRecord
) {
  const { data, error } = await adminClient
    .schema("delivery")
    .from("notification_dispatch")
    .upsert(payload, { onConflict: "template_id,person_id,channel_code,scheduled_for" })
    .select("id, status, sent_at, provider_message_id, error_message")
    .single();

  if (error || !data) {
    throw createHttpError(error?.message || "No se pudo guardar el despacho", 400);
  }

  return {
    id: Number(data.id),
    status: String(data.status || "pending"),
    sent_at: toNullableString(data.sent_at),
    provider_message_id: toNullableString(data.provider_message_id),
    error_message: toNullableString(data.error_message)
  };
}

async function dispatchTemplate(
  adminClient: ReturnType<typeof createAdminClient>,
  run: NotificationRunContext,
  template: NotificationTemplateRow,
  options: { forceNow: boolean }
) {
  const now = new Date();
  const sessionSummary = await resolveSessionSummary(adminClient, run.id);
  const targets = await resolveTargets(adminClient, run.id, template.audience_code);
  const personIds = targets.map((entry) => entry.person_id);
  const preferenceMap = await resolvePreferences(adminClient, personIds, template.channel_code);
  const subscriptionMap = template.channel_code === "web"
    ? await resolveSubscriptions(adminClient, personIds)
    : new Map<string, Array<{ endpoint: string; p256dh_key: string; auth_key: string }>>();

  const results: Array<Record<string, unknown>> = [];
  const summary = {
    processed: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    duplicates: 0,
    not_due: 0
  };

  for (const target of targets) {
    const scheduledFor = options.forceNow
      ? now.toISOString()
      : resolveNotificationSchedule(template, run, now);

    if (!scheduledFor) {
      summary.skipped += 1;
      results.push({
        person_id: target.person_id,
        status: "skipped",
        reason: "missing_anchor"
      });
      continue;
    }

    if (!options.forceNow && new Date(scheduledFor).getTime() > now.getTime()) {
      summary.not_due += 1;
      continue;
    }

    const existingDispatch = await findExistingDispatch(
      adminClient,
      template.id,
      target.person_id,
      template.channel_code,
      scheduledFor
    );

    if (existingDispatch?.status === "sent") {
      summary.duplicates += 1;
      continue;
    }

    const context = {
      learner_name: target.full_name || target.email || "Participante",
      learner_email: target.email,
      course_slug: run.course_slug,
      course_title: run.course_title,
      run_slug: run.slug,
      run_title: run.title,
      portal_url: `${Deno.env.get("SITE_URL") || "http://127.0.0.1:4321"}`.replace(/\/+$/, "") + "/portal",
      next_session_title: sessionSummary.nextSessionTitle,
      next_session_starts_at: sessionSummary.nextSessionStartsAt,
      next_session_location_label: sessionSummary.nextSessionLocationLabel,
      session_count: String(sessionSummary.sessionCount)
    };

    const renderedSubject = renderNotificationCopy(
      template.subject_template || template.title,
      context
    );
    const renderedBody = renderNotificationCopy(template.body_template, context);
    const renderedCtaUrl = template.cta_url
      ? renderNotificationCopy(template.cta_url, context)
      : context.portal_url;
    const preferenceEnabled = preferenceMap.get(target.person_id) ?? false;

    let status: "sent" | "skipped" | "failed" = "sent";
    let errorMessage: string | null = null;
    let providerMessageId: string | null = null;
    let sentAt: string | null = null;

    try {
      if (!preferenceEnabled) {
        status = "skipped";
        errorMessage = "channel_disabled";
      } else if (template.channel_code === "email") {
        if (!target.email) {
          status = "skipped";
          errorMessage = "missing_email";
        } else {
          const emailResult = await sendResendEmail({
            to: target.email,
            subject: renderedSubject,
            html: renderNotificationEmailHtml({
              title: renderedSubject,
              body: renderedBody,
              ctaLabel: template.cta_label,
              ctaUrl: renderedCtaUrl
            })
          });
          providerMessageId = emailResult.id;
          sentAt = now.toISOString();
        }
      } else {
        const subscriptions = subscriptionMap.get(target.person_id) || [];
        if (!subscriptions.length) {
          status = "skipped";
          errorMessage = "missing_web_subscription";
        } else {
          const pushResults = await Promise.allSettled(
            subscriptions.map((subscription) =>
              sendWebPushNotification({
                subscription: {
                  endpoint: subscription.endpoint,
                  keys: {
                    p256dh: subscription.p256dh_key,
                    auth: subscription.auth_key
                  }
                },
                title: renderedSubject,
                body: renderedBody,
                ctaUrl: renderedCtaUrl,
                tag: template.slug
              })
            )
          );

          const firstSuccess = pushResults.find((entry) => entry.status === "fulfilled");
          if (!firstSuccess) {
            status = "failed";
            const firstFailure = pushResults.find((entry) => entry.status === "rejected") as PromiseRejectedResult | undefined;
            errorMessage = firstFailure?.reason instanceof Error ? firstFailure.reason.message : "web_push_failed";
          } else {
            providerMessageId = "web-push";
            sentAt = now.toISOString();
          }
        }
      }
    } catch (error) {
      status = "failed";
      errorMessage = error instanceof Error ? error.message : "dispatch_failed";
    }

    const persisted = await persistDispatch(adminClient, {
      template_id: template.id,
      course_run_id: run.id,
      person_id: target.person_id,
      channel_code: template.channel_code,
      scheduled_for: scheduledFor,
      status,
      rendered_subject: renderedSubject,
      rendered_body: renderedBody,
      cta_label: template.cta_label,
      cta_url: renderedCtaUrl,
      provider_message_id: providerMessageId,
      error_message: errorMessage,
      sent_at: sentAt,
      metadata: {
        audience_code: template.audience_code,
        trigger_code: template.trigger_code,
        enrollment_status: target.status
      }
    });

    summary.processed += 1;
    if (status === "sent") summary.sent += 1;
    if (status === "skipped") summary.skipped += 1;
    if (status === "failed") summary.failed += 1;

    results.push({
      person_id: target.person_id,
      person_email: target.email,
      status,
      dispatch_id: persisted.id,
      error_message: errorMessage
    });
  }

  return {
    template: {
      slug: template.slug,
      title: template.title,
      channel_code: template.channel_code,
      audience_code: template.audience_code,
      trigger_code: template.trigger_code
    },
    summary,
    results
  };
}

async function handleDispatchTemplate(
  adminClient: ReturnType<typeof createAdminClient>,
  body: Record<string, unknown>
) {
  const runSlug = String(body.run_slug || "");
  const templateSlug = String(body.template_slug || "");
  if (!runSlug || !templateSlug) {
    throw createHttpError("Faltan run_slug o template_slug", 400);
  }

  const run = await resolveRunContext(adminClient, runSlug);
  const template = await resolveTemplate(adminClient, run.id, templateSlug);
  return dispatchTemplate(adminClient, run, template, { forceNow: true });
}

async function handleProcessDue(
  adminClient: ReturnType<typeof createAdminClient>,
  body: Record<string, unknown>
) {
  const runSlug = String(body.run_slug || "");
  if (!runSlug) {
    throw createHttpError("Falta run_slug", 400);
  }

  const run = await resolveRunContext(adminClient, runSlug);
  const templates = await resolveActiveTemplates(adminClient, run.id);
  const templateResults = [];

  for (const template of templates.filter((entry) => entry.trigger_code !== "manual")) {
    templateResults.push(await dispatchTemplate(adminClient, run, template, { forceNow: false }));
  }

  return {
    run: {
      slug: run.slug,
      title: run.title
    },
    templates: templateResults
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await resolveAdminActor(req);
    const adminClient = createAdminClient();
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "process-due");

    switch (action) {
      case "dispatch-template":
        return jsonResponse(await handleDispatchTemplate(adminClient, body));
      case "process-due":
        return jsonResponse(await handleProcessDue(adminClient, body));
      default:
        throw createHttpError("Accion no soportada", 400);
    }
  } catch (error) {
    const status = (error as { status?: number }).status || 400;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
