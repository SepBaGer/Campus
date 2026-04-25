import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient, resolveUserFromRequest } from "../_shared/auth.ts";
import {
  ensureEnrollmentForCourse,
  resolveContentBlockContext,
  resolveCourseProgress,
  upsertMasteryState,
  upsertProjectSubmission
} from "../_shared/learning.ts";
import { corsHeaders, createHttpError, jsonResponse } from "../_shared/http.ts";

const DEFAULT_BADGE_CLASS_SLUG = "badge-power-skills-pilot";

async function tryIssueCourseBadge(
  adminClient: any,
  userId: string,
  enrollmentId: number,
  badgeClassSlug: string,
  progress: { completedBlocks: number; totalBlocks: number }
) {
  if (progress.totalBlocks <= 0 || progress.completedBlocks < progress.totalBlocks) {
    return null;
  }

  const { data: badgeClass, error: badgeClassError } = await adminClient
    .schema("credentials")
    .from("badge_class")
    .select("id")
    .eq("slug", badgeClassSlug)
    .eq("status", "published")
    .maybeSingle();

  if (badgeClassError || !badgeClass) {
    return null;
  }

  const { data: existingAssertion, error: existingAssertionError } = await adminClient
    .schema("credentials")
    .from("badge_assertion")
    .select("id, verification_token, issued_at")
    .eq("badge_class_id", badgeClass.id)
    .eq("person_id", userId)
    .maybeSingle();

  if (existingAssertionError) {
    throw createHttpError(existingAssertionError.message, 400);
  }

  if (existingAssertion) {
    return {
      assertion_id: Number(existingAssertion.id),
      token: String(existingAssertion.verification_token),
      issued_at: String(existingAssertion.issued_at),
      reused: true
    };
  }

  const { data: insertedAssertion, error: insertAssertionError } = await adminClient
    .schema("credentials")
    .from("badge_assertion")
    .insert({
      badge_class_id: badgeClass.id,
      person_id: userId,
      enrollment_id: enrollmentId,
      status: "issued",
      public_note: "Emitida automaticamente al completar la ruta piloto."
    })
    .select("id, verification_token, issued_at")
    .single();

  if (insertAssertionError || !insertedAssertion) {
    throw createHttpError(insertAssertionError?.message || "No se pudo emitir la credencial", 400);
  }

  return {
    assertion_id: Number(insertedAssertion.id),
    token: String(insertedAssertion.verification_token),
    issued_at: String(insertedAssertion.issued_at),
    reused: false
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await resolveUserFromRequest(req);
    const adminClient = createAdminClient();
    const body = await req.json().catch(() => ({}));
    const contentBlockId = Number(body.content_block_id);
    const correct = body.correct !== false;
    const badgeClassSlug = String(body.badge_class_slug || DEFAULT_BADGE_CLASS_SLUG);

    if (!contentBlockId) {
      throw createHttpError("Falta content_block_id", 400);
    }

    const blockContext = await resolveContentBlockContext(adminClient, contentBlockId);
    const enrollmentContext = await ensureEnrollmentForCourse(
      adminClient,
      user.id,
      blockContext.courseId,
      "attempt-complete"
    );

    const completedAt = new Date().toISOString();
    const xpEarned = Number(body.xp_earned || Math.max(20, blockContext.durationMinutes * 5));

    const { data: attemptRow, error: attemptError } = await adminClient
      .schema("learning")
      .from("attempt")
      .upsert(
        {
          person_id: user.id,
          content_block_id: contentBlockId,
          status: "completed",
          completed_at: completedAt,
          xp_earned: xpEarned
        },
        { onConflict: "person_id,content_block_id" }
      )
      .select("id")
      .single();

    if (attemptError || !attemptRow) {
      throw createHttpError(attemptError?.message || "No se pudo registrar el intento", 400);
    }

    const projectSubmission = await upsertProjectSubmission(
      adminClient,
      user.id,
      blockContext,
      Number(attemptRow.id),
      {
        submissionText: body.submission_text,
        submissionUrl: body.submission_url,
        learnerNote: body.learner_note,
        submissionPayload: body.submission_payload
      }
    );

    const { data: statementRow, error: statementError } = await adminClient
      .schema("learning")
      .from("xapi_statement")
      .insert({
        person_id: user.id,
        verb: body.verb || "completed",
        object_id: `content-block:${contentBlockId}`,
        payload: {
          source: "attempt-complete",
          content_block_id: contentBlockId,
          content_block_title: blockContext.title,
          content_block_position: blockContext.position,
          course_id: blockContext.courseId,
          course_slug: blockContext.courseSlug,
          course_title: blockContext.courseTitle,
          xp_earned: xpEarned,
          rubric_slug: projectSubmission?.rubricSlug || blockContext.rubric?.slug || null,
          submission_id: projectSubmission?.submissionId || null,
          submission_status: projectSubmission?.status || null,
          ...(typeof body.payload === "object" && body.payload ? body.payload : {})
        }
      })
      .select("id, emitted_at")
      .single();

    if (statementError || !statementRow) {
      throw createHttpError(statementError?.message || "No se pudo emitir el evento xAPI", 400);
    }

    const schedule = await upsertMasteryState(adminClient, user.id, blockContext, correct);
    const progress = await resolveCourseProgress(adminClient, user.id, blockContext.courseId);
    const credential = await tryIssueCourseBadge(
      adminClient,
      user.id,
      enrollmentContext.enrollmentId,
      badgeClassSlug,
      progress
    );

    return jsonResponse({
      status: "completed",
      mode: "live",
      course_slug: blockContext.courseSlug,
      course_title: blockContext.courseTitle,
      content_block_id: contentBlockId,
      content_block_title: blockContext.title,
      completed_at: completedAt,
      xp_earned: xpEarned,
      completed_blocks: progress.completedBlocks,
      total_blocks: progress.totalBlocks,
      progress_percent: progress.progressPercent,
      competency_id: schedule.competencyId,
      competency_slug: schedule.competencySlug,
      competency_title: schedule.competencyTitle,
      mastery_level: schedule.masteryLevel,
      mastery_percent: schedule.masteryPercent,
      submission_id: projectSubmission?.submissionId || null,
      submission_status: projectSubmission?.status || null,
      review_required: Boolean(projectSubmission),
      rubric_title: projectSubmission?.rubricTitle || blockContext.rubric?.title || null,
      xapi_statement_id: statementRow.id,
      xapi_emitted_at: statementRow.emitted_at,
      next_review_at: schedule.nextReviewAt,
      repetitions: schedule.repetitions,
      interval_days: schedule.intervalDays,
      ease_factor: schedule.easeFactor,
      enrollment_id: enrollmentContext.enrollmentId,
      course_run_id: enrollmentContext.courseRunId,
      course_run_title: enrollmentContext.courseRunTitle,
      credential
    });
  } catch (error) {
    const status = (error as { status?: number }).status || 400;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
