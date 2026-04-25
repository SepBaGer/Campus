import { createHttpError } from "./http.ts";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
type JsonRecord = Record<string, unknown>;

export interface ReviewScheduleInput {
  repetitions?: number | null;
  interval_days?: number | null;
  ease_factor?: number | null;
}

export interface ReviewSchedule {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  reviewedAt: string;
  nextReviewAt: string;
}

export interface CompetencyContext {
  id: number;
  slug: string;
  title: string;
  bloomLevel: string;
  position: number;
}

export interface RubricContext {
  id: number;
  slug: string;
  title: string;
  scaleMax: number;
  criteria: unknown[];
}

export interface ContentBlockContext {
  id: number;
  title: string;
  position: number;
  durationMinutes: number;
  kind: string;
  courseId: number;
  courseSlug: string;
  courseTitle: string;
  competency: CompetencyContext;
  rubric: RubricContext | null;
}

export interface EnrollmentContext {
  enrollmentId: number;
  courseRunId: number;
  courseRunTitle: string;
}

export interface CourseProgress {
  courseId: number;
  totalBlocks: number;
  completedBlocks: number;
  progressPercent: number;
}

export interface MasteryUpdateResult extends ReviewSchedule {
  competencyId: number;
  competencySlug: string;
  competencyTitle: string;
  masteryLevel: number;
  masteryPercent: number;
}

export interface ProjectSubmissionInput {
  submissionText?: unknown;
  submissionUrl?: unknown;
  learnerNote?: unknown;
  submissionPayload?: unknown;
}

export interface ProjectSubmissionResult {
  submissionId: number;
  status: string;
  rubricId: number | null;
  rubricSlug: string | null;
  rubricTitle: string | null;
  submittedAt: string;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toNullableString(value: unknown) {
  const resolved = typeof value === "string" ? value.trim() : "";
  return resolved || null;
}

function toJsonRecord(value: unknown) {
  return isRecord(value) ? value : {};
}

function toProgressPercent(completedBlocks: number, totalBlocks: number) {
  if (totalBlocks <= 0) return 0;
  return Math.floor((completedBlocks / totalBlocks) * 100);
}

function toDifficultyScore(easeFactor: number) {
  return Number(Math.max(0, 5 - easeFactor).toFixed(2));
}

export function computeReviewSchedule(
  existingState: ReviewScheduleInput | null | undefined,
  correct: boolean,
  referenceDate = new Date()
): ReviewSchedule {
  const previousRepetitions = existingState?.repetitions ?? 0;
  const previousIntervalDays = existingState?.interval_days ?? 0;
  const previousEaseFactor = existingState?.ease_factor ?? 2.5;

  const repetitions = correct ? previousRepetitions + 1 : 1;
  const intervalDays = correct
    ? Math.max(1, previousIntervalDays > 0 ? previousIntervalDays * 2 : repetitions === 1 ? 1 : 3)
    : 1;
  const easeFactor = Number(
    (correct
      ? Math.min(2.9, previousEaseFactor + 0.15)
      : Math.max(1.3, previousEaseFactor - 0.2)).toFixed(2)
  );

  return {
    repetitions,
    intervalDays,
    easeFactor,
    reviewedAt: referenceDate.toISOString(),
    nextReviewAt: new Date(referenceDate.getTime() + intervalDays * DAY_IN_MS).toISOString()
  };
}

async function resolvePrimaryCompetencyContext(
  adminClient: any,
  courseId: number,
  contentBlockId: number
): Promise<CompetencyContext> {
  const { data: blockMapping, error: blockMappingError } = await adminClient
    .schema("catalog")
    .from("content_block_competency")
    .select("position, competency_id, competency:competency_id (slug, title, bloom_level)")
    .eq("content_block_id", contentBlockId)
    .eq("is_primary", true)
    .order("position", { ascending: true })
    .maybeSingle();

  if (blockMappingError) {
    throw createHttpError(blockMappingError.message, 400);
  }

  const blockCompetency = blockMapping && typeof blockMapping === "object"
    ? blockMapping
    : null;

  if (blockCompetency) {
    const competency = blockCompetency.competency && typeof blockCompetency.competency === "object"
      ? blockCompetency.competency
      : {};

    return {
      id: Number(blockCompetency.competency_id),
      slug: String((competency as { slug?: string }).slug || ""),
      title: String((competency as { title?: string }).title || ""),
      bloomLevel: String((competency as { bloom_level?: string }).bloom_level || "comprender"),
      position: Number(blockCompetency.position || 1)
    };
  }

  const { data: fallbackMapping, error: fallbackError } = await adminClient
    .schema("catalog")
    .from("course_competency")
    .select("position, competency_id, competency:competency_id (slug, title, bloom_level)")
    .eq("course_id", courseId)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fallbackError || !fallbackMapping) {
    throw createHttpError(fallbackError?.message || "El bloque no tiene una competencia primaria asignada", 409);
  }

  const competency = fallbackMapping.competency && typeof fallbackMapping.competency === "object"
    ? fallbackMapping.competency
    : {};

  return {
    id: Number(fallbackMapping.competency_id),
    slug: String((competency as { slug?: string }).slug || ""),
    title: String((competency as { title?: string }).title || ""),
    bloomLevel: String((competency as { bloom_level?: string }).bloom_level || "comprender"),
    position: Number(fallbackMapping.position || 1)
  };
}

async function resolveRubricContext(
  adminClient: any,
  courseId: number,
  rendererManifest: unknown
): Promise<RubricContext | null> {
  const manifest = isRecord(rendererManifest) ? rendererManifest : {};
  const props = isRecord(manifest.props) ? manifest.props : {};
  const rubricRef = toNullableString(props.rubric_id);

  if (!rubricRef) {
    return null;
  }

  const rubricId = Number(rubricRef);
  let query = adminClient
    .schema("catalog")
    .from("rubric")
    .select("id, slug, title, scale_max, criteria")
    .eq("course_id", courseId)
    .limit(1);

  query = Number.isFinite(rubricId) && rubricId > 0
    ? query.eq("id", rubricId)
    : query.eq("slug", rubricRef);

  const { data: rubricRow, error } = await query.maybeSingle();

  if (error) {
    throw createHttpError(error.message, 400);
  }

  if (!rubricRow) {
    throw createHttpError("La rubrica referenciada por el bloque no existe", 409);
  }

  return {
    id: Number(rubricRow.id),
    slug: String(rubricRow.slug || ""),
    title: String(rubricRow.title || ""),
    scaleMax: Number(rubricRow.scale_max || 4),
    criteria: Array.isArray(rubricRow.criteria) ? rubricRow.criteria : []
  };
}

export async function resolveContentBlockContext(adminClient: any, contentBlockId: number): Promise<ContentBlockContext> {
  const { data: blockRow, error: blockError } = await adminClient
    .schema("catalog")
    .from("content_block")
    .select("id, course_id, title, kind, position, duration_minutes, renderer_manifest")
    .eq("id", contentBlockId)
    .maybeSingle();

  if (blockError || !blockRow) {
    throw createHttpError(blockError?.message || "Bloque no encontrado", 404);
  }

  const { data: courseRow, error: courseError } = await adminClient
    .schema("catalog")
    .from("course")
    .select("id, slug, title")
    .eq("id", blockRow.course_id)
    .maybeSingle();

  if (courseError || !courseRow) {
    throw createHttpError(courseError?.message || "Curso no encontrado para el bloque", 404);
  }

  const competency = await resolvePrimaryCompetencyContext(
    adminClient,
    Number(courseRow.id),
    Number(blockRow.id)
  );
  const rubric = await resolveRubricContext(
    adminClient,
    Number(courseRow.id),
    blockRow.renderer_manifest
  );

  return {
    id: Number(blockRow.id),
    title: String(blockRow.title),
    position: Number(blockRow.position),
    durationMinutes: Number(blockRow.duration_minutes || 15),
    kind: String(blockRow.kind || "reading"),
    courseId: Number(courseRow.id),
    courseSlug: String(courseRow.slug),
    courseTitle: String(courseRow.title),
    competency,
    rubric
  };
}

export async function upsertProjectSubmission(
  adminClient: any,
  personId: string,
  blockContext: ContentBlockContext,
  attemptId: number,
  input: ProjectSubmissionInput
): Promise<ProjectSubmissionResult | null> {
  if (blockContext.kind !== "project") {
    return null;
  }

  if (!blockContext.rubric) {
    throw createHttpError("El bloque project todavia no tiene una rubrica vinculada", 409);
  }

  const submissionText = toNullableString(input.submissionText);
  const submissionUrl = toNullableString(input.submissionUrl);
  const learnerNote = toNullableString(input.learnerNote);
  const submissionPayload = toJsonRecord(input.submissionPayload);

  if (!submissionText && !submissionUrl && Object.keys(submissionPayload).length === 0) {
    throw createHttpError("Este bloque requiere evidencia antes de registrarse como entrega", 400);
  }

  const submittedAt = new Date().toISOString();
  const { data, error } = await adminClient
    .schema("learning")
    .from("project_submission")
    .upsert(
      {
        person_id: personId,
        content_block_id: blockContext.id,
        rubric_id: blockContext.rubric.id,
        attempt_id: attemptId,
        status: "submitted",
        submission_text: submissionText,
        submission_url: submissionUrl,
        submission_payload: submissionPayload,
        learner_note: learnerNote,
        submitted_at: submittedAt
      },
      { onConflict: "person_id,content_block_id" }
    )
    .select("id, status, submitted_at")
    .single();

  if (error || !data) {
    throw createHttpError(error?.message || "No se pudo guardar la entrega del proyecto", 400);
  }

  return {
    submissionId: Number(data.id),
    status: String(data.status || "submitted"),
    rubricId: blockContext.rubric.id,
    rubricSlug: blockContext.rubric.slug,
    rubricTitle: blockContext.rubric.title,
    submittedAt: String(data.submitted_at || submittedAt)
  };
}

async function resolveCompetencyProgress(
  adminClient: any,
  personId: string,
  competencyId: number
) {
  const { data: mappingRows, error: mappingError } = await adminClient
    .schema("catalog")
    .from("content_block_competency")
    .select("content_block_id")
    .eq("competency_id", competencyId)
    .eq("is_primary", true)
    .order("content_block_id", { ascending: true });

  if (mappingError) {
    throw createHttpError(mappingError.message, 400);
  }

  const blockIds = (mappingRows ?? []).map((row: { content_block_id: number }) => Number(row.content_block_id));
  const totalBlocks = blockIds.length;

  if (totalBlocks === 0) {
    return {
      completedBlocks: 0,
      totalBlocks: 0,
      level: 0
    };
  }

  const { data: attemptRows, error: attemptError } = await adminClient
    .schema("learning")
    .from("attempt")
    .select("content_block_id")
    .eq("person_id", personId)
    .eq("status", "completed")
    .in("content_block_id", blockIds);

  if (attemptError) {
    throw createHttpError(attemptError.message, 400);
  }

  const completedBlocks = new Set(
    (attemptRows ?? []).map((row: { content_block_id: number }) => Number(row.content_block_id))
  ).size;
  const level = Number((completedBlocks / totalBlocks).toFixed(2));

  return {
    completedBlocks,
    totalBlocks,
    level
  };
}

export async function upsertMasteryState(
  adminClient: any,
  personId: string,
  blockContext: ContentBlockContext,
  correct: boolean
): Promise<MasteryUpdateResult> {
  const { data: existingState, error: existingStateError } = await adminClient
    .schema("learning")
    .from("mastery_state")
    .select("repetitions, interval_days, ease_factor")
    .eq("person_id", personId)
    .eq("competency_id", blockContext.competency.id)
    .maybeSingle();

  if (existingStateError) {
    throw createHttpError(existingStateError.message, 400);
  }

  const schedule = computeReviewSchedule(existingState as ReviewScheduleInput | null, correct);
  const competencyProgress = await resolveCompetencyProgress(
    adminClient,
    personId,
    blockContext.competency.id
  );

  const masteryLevel = competencyProgress.totalBlocks > 0
    ? competencyProgress.level
    : Number((correct ? 1 : 0).toFixed(2));
  const masteryPercent = Math.round(masteryLevel * 100);

  const { error: upsertError } = await adminClient
    .schema("learning")
    .from("mastery_state")
    .upsert(
      {
        person_id: personId,
        competency_id: blockContext.competency.id,
        level: masteryLevel,
        repetitions: schedule.repetitions,
        interval_days: schedule.intervalDays,
        ease_factor: schedule.easeFactor,
        last_reviewed_at: schedule.reviewedAt,
        next_review_at: schedule.nextReviewAt
      },
      { onConflict: "person_id,competency_id" }
    );

  if (upsertError) {
    throw createHttpError(upsertError.message, 400);
  }

  const { error: scheduleError } = await adminClient
    .schema("learning")
    .from("spaced_schedule")
    .upsert(
      {
        person_id: personId,
        competency_id: blockContext.competency.id,
        source_content_block_id: blockContext.id,
        next_review_at: schedule.nextReviewAt,
        stability: schedule.intervalDays,
        difficulty: toDifficultyScore(schedule.easeFactor),
        last_reviewed_at: schedule.reviewedAt
      },
      { onConflict: "person_id,competency_id" }
    );

  if (scheduleError) {
    throw createHttpError(scheduleError.message, 400);
  }

  return {
    ...schedule,
    competencyId: blockContext.competency.id,
    competencySlug: blockContext.competency.slug,
    competencyTitle: blockContext.competency.title,
    masteryLevel,
    masteryPercent
  };
}

export async function ensureEnrollmentForCourse(
  adminClient: any,
  personId: string,
  courseId: number,
  source: string
): Promise<EnrollmentContext> {
  const { data: runRow, error: runError } = await adminClient
    .schema("delivery")
    .from("course_run")
    .select("id, title")
    .eq("course_id", courseId)
    .in("status", ["open", "closed", "draft"])
    .order("starts_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (runError || !runRow) {
    throw createHttpError(runError?.message || "No hay course run disponible para registrar el avance", 409);
  }

  const { data: existingEnrollment, error: existingEnrollmentError } = await adminClient
    .schema("enrollment")
    .from("enrollment")
    .select("id, status")
    .eq("person_id", personId)
    .eq("course_run_id", runRow.id)
    .maybeSingle();

  if (existingEnrollmentError) {
    throw createHttpError(existingEnrollmentError.message, 400);
  }

  if (existingEnrollment) {
    return {
      enrollmentId: Number(existingEnrollment.id),
      courseRunId: Number(runRow.id),
      courseRunTitle: String(runRow.title)
    };
  }

  const { data: insertedEnrollment, error: insertError } = await adminClient
    .schema("enrollment")
    .from("enrollment")
    .insert({
      person_id: personId,
      course_run_id: runRow.id,
      status: "active",
      source
    })
    .select("id")
    .single();

  if (insertError || !insertedEnrollment) {
    throw createHttpError(insertError?.message || "No se pudo crear la matricula del curso", 400);
  }

  return {
    enrollmentId: Number(insertedEnrollment.id),
    courseRunId: Number(runRow.id),
    courseRunTitle: String(runRow.title)
  };
}

export async function resolveCourseProgress(
  adminClient: any,
  personId: string,
  courseId: number
): Promise<CourseProgress> {
  const { data: blockRows, error: blockError } = await adminClient
    .schema("catalog")
    .from("content_block")
    .select("id")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  if (blockError) {
    throw createHttpError(blockError.message, 400);
  }

  const blockIds = (blockRows ?? []).map((row: { id: number }) => Number(row.id));
  const totalBlocks = blockIds.length;

  if (totalBlocks === 0) {
    return {
      courseId,
      totalBlocks: 0,
      completedBlocks: 0,
      progressPercent: 0
    };
  }

  const { data: attemptRows, error: attemptError } = await adminClient
    .schema("learning")
    .from("attempt")
    .select("content_block_id")
    .eq("person_id", personId)
    .eq("status", "completed")
    .in("content_block_id", blockIds);

  if (attemptError) {
    throw createHttpError(attemptError.message, 400);
  }

  const completedBlocks = new Set(
    (attemptRows ?? []).map((row: { content_block_id: number }) => Number(row.content_block_id))
  ).size;

  return {
    courseId,
    totalBlocks,
    completedBlocks,
    progressPercent: toProgressPercent(completedBlocks, totalBlocks)
  };
}
