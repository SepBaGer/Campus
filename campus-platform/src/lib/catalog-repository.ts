import {
  getDemoCatalogSnapshot,
  getDemoCourseSnapshot,
  getDemoPortalSnapshot,
  getDemoVerificationSnapshot,
  getDemoVerificationTokens
} from "./platform-data";
import { getBlockExperienceProfile, getBloomLabel } from "./block-profile";
import { resolveCommunitySnapshot } from "./community-config";
import type {
  BadgeSnapshot,
  BadgeSnapshotRow,
  CourseBlockRow,
  CourseCatalogRow,
  CourseCommunityRow,
  CourseCompetencyRow,
  CourseSnapshot,
  OpenRunRow,
  PortalMasteryRow,
  PortalSnapshot,
  PortalSnapshotRow,
  SessionSnapshot
} from "./platform-types";
import { createPublicSupabaseClient, isLiveMode } from "./supabase";

function toSessionSnapshot(row: OpenRunRow): SessionSnapshot {
  return {
    id: row.session_id,
    title: row.session_title,
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? undefined,
    modality: row.modality,
    locationLabel: row.location_label
  };
}

function groupCompetenciesByCourse(rows: CourseCompetencyRow[]) {
  return rows.reduce<Record<string, CourseSnapshot["competencies"]>>((accumulator, row) => {
    const courseCompetencies = accumulator[row.course_slug] || [];

    courseCompetencies.push({
      slug: row.competency_slug,
      title: row.competency_title,
      bloomLevel: row.bloom_level,
      bloomLabel: getBloomLabel(row.bloom_level),
      position: row.position
    });

    accumulator[row.course_slug] = courseCompetencies.sort((left, right) => left.position - right.position);
    return accumulator;
  }, {});
}

function toCourseSnapshot(
  rows: CourseBlockRow[],
  runRows: OpenRunRow[],
  competencyRows: CourseCompetencyRow[],
  communityRow: CourseCommunityRow | null
): CourseSnapshot | undefined {
  const [head] = rows;
  if (!head) return undefined;
  const competencies = groupCompetenciesByCourse(competencyRows)[head.course_slug] || [];

  return {
    slug: head.course_slug,
    title: head.course_title,
    summary: head.course_summary,
    eyebrow: "M1 foundation",
    audience: head.audience_label,
    accessModel: head.access_model,
    priceLabel: head.price_label,
    deliveryLabel: head.delivery_label,
    runLabel: head.run_label,
    progressPercent: 0,
    trackTitle: head.track_title,
    transformationPromise: head.transformation_promise,
    durationLabel: head.duration_label,
    heroMetrics: [
      { label: "Ruta", value: head.track_title },
      { label: "Entrega", value: head.delivery_label },
      { label: "Competencias", value: String(competencies.length || 0) }
    ],
    competencies,
    sessions: runRows.map(toSessionSnapshot),
    community: communityRow
      ? resolveCommunitySnapshot(
          {
            id: communityRow.run_id,
            slug: communityRow.run_slug,
            title: communityRow.run_title
          },
          communityRow.community_manifest
        )
      : null,
    blocks: rows
      .sort((left, right) => left.block_order - right.block_order)
      .map((row) => {
        const profile = getBlockExperienceProfile(row.block_kind, {
          representationVariants: row.representation_variants,
          expressionVariants: row.expression_variants,
          engagementHooks: row.engagement_hooks,
          rendererManifest: row.renderer_manifest,
          bloomLevel: row.bloom_level
        });

        return {
          id: row.block_id,
          slug: row.block_slug,
          title: row.block_title,
          summary: row.block_summary,
          objective: row.block_objective,
          kind: profile.kind,
          kindLabel: profile.kindLabel,
          rendererLabel: profile.rendererLabel,
          rendererManifest: profile.rendererManifest,
          representationModes: profile.representationModes,
          expressionFormats: profile.expressionFormats,
          assistiveTechHints: profile.assistiveTechHints,
          voiceDictationEnabled: profile.voiceDictationEnabled,
          engagementHooks: profile.engagementHooks,
          bloomLevel: profile.bloomLevel,
          bloomLabel: profile.bloomLabel,
          order: row.block_order,
          durationMinutes: row.duration_minutes,
          isFree: row.is_free,
          competencySlug: row.competency_slug || "sin-competencia",
          competencyTitle: row.competency_title || "Competencia por definir",
          rubricSlug: row.rubric_slug || "",
          rubricTitle: row.rubric_title || "",
          rubricScaleMax: Number(row.rubric_scale_max || 0),
          rubricCriteria: Array.isArray(row.rubric_criteria) ? row.rubric_criteria : []
        };
      })
  };
}

function toPortalSnapshot(row: PortalSnapshotRow, masteryRows: PortalMasteryRow[]): PortalSnapshot {
  return {
    learnerName: row.learner_name,
    membershipLabel: row.membership_label,
    enrolledCourseTitle: row.enrolled_course_title,
    activeRunLabel: row.active_run_label,
    completedBlocks: row.completed_blocks,
    totalBlocks: row.total_blocks,
    progressPercent: row.progress_percent,
    nextReviewAt: row.next_review_at || new Date().toISOString(),
    dueReviewsCount: row.due_reviews_count ?? 0,
    atRiskLabel: row.at_risk_label,
    gamification: null,
    leaderboard: [],
    mastery: masteryRows
      .sort((left, right) => left.position - right.position)
      .map((masteryRow) => ({
        competencySlug: masteryRow.competency_slug,
        competencyTitle: masteryRow.competency_title,
        bloomLevel: masteryRow.bloom_level,
        bloomLabel: getBloomLabel(masteryRow.bloom_level),
        position: masteryRow.position,
        masteryLevel: Number(masteryRow.mastery_level || 0),
        masteryPercent: Math.round(Number(masteryRow.mastery_level || 0) * 100),
        nextReviewAt: masteryRow.next_review_at,
        repetitions: masteryRow.repetitions,
        intervalDays: masteryRow.interval_days,
        isDue: Boolean(masteryRow.is_due)
      }))
  };
}

function toBadgeSnapshot(row: BadgeSnapshotRow): BadgeSnapshot {
  return {
    token: row.token,
    learnerName: row.learner_name,
    courseTitle: row.course_title,
    issuedAt: row.issued_at,
    issuer: row.issuer,
    status: row.status,
    criteria: row.criteria
  };
}

export async function loadCatalogSnapshot() {
  if (!isLiveMode()) {
    return getDemoCatalogSnapshot();
  }

  try {
    const supabase = createPublicSupabaseClient();
    const [{ data: catalogRows, error: catalogError }, { data: competencyRows, error: competencyError }] = await Promise.all([
      supabase
        .from("platform_course_catalog_v")
        .select("*")
        .order("course_title"),
      supabase
        .from("platform_course_competencies_v")
        .select("*")
        .order("position")
    ]);

    if (catalogError || competencyError || !catalogRows?.length) {
      return getDemoCatalogSnapshot();
    }

    const competenciesByCourse = groupCompetenciesByCourse((competencyRows ?? []) as CourseCompetencyRow[]);

    return (catalogRows as CourseCatalogRow[]).map((row) => ({
      slug: row.course_slug,
      title: row.course_title,
      summary: row.course_summary,
      eyebrow: row.track_title,
      audience: row.audience_label,
      accessModel: row.access_model,
      priceLabel: row.price_label,
      deliveryLabel: row.delivery_label,
      runLabel: row.run_label,
      progressPercent: row.progress_percent ?? 0,
      competencies: competenciesByCourse[row.course_slug] || [],
      trackTitle: row.track_title,
      transformationPromise: row.course_summary,
      durationLabel: "Ruta publicada desde Supabase",
      heroMetrics: [
        { label: "Ruta", value: row.track_title },
        { label: "Entrega", value: row.delivery_label },
        { label: "Acceso", value: row.access_model }
      ],
      sessions: [],
      community: null,
      blocks: []
    }));
  } catch {
    return getDemoCatalogSnapshot();
  }
}

export async function loadCourseSnapshot(slug: string): Promise<CourseSnapshot | undefined> {
  if (!isLiveMode()) {
    return getDemoCourseSnapshot(slug);
  }

  try {
    const supabase = createPublicSupabaseClient();
    const [
      { data: blockRows, error: blockError },
      { data: runRows, error: runError },
      { data: competencyRows, error: competencyError },
      { data: communityRows, error: communityError }
    ] = await Promise.all([
      supabase.from("platform_course_blocks_v").select("*").eq("course_slug", slug),
      supabase.from("platform_open_runs_v").select("*").eq("course_slug", slug),
      supabase.from("platform_course_competencies_v").select("*").eq("course_slug", slug).order("position"),
      supabase.from("platform_course_community_v").select("*").eq("course_slug", slug).limit(1).maybeSingle()
    ]);

    if (blockError || runError || competencyError || communityError || !blockRows?.length) {
      return getDemoCourseSnapshot(slug);
    }

    return toCourseSnapshot(
      blockRows as CourseBlockRow[],
      (runRows ?? []) as OpenRunRow[],
      (competencyRows ?? []) as CourseCompetencyRow[],
      (communityRows ?? null) as CourseCommunityRow | null
    );
  } catch {
    return getDemoCourseSnapshot(slug);
  }
}

export async function loadPortalSnapshot(): Promise<PortalSnapshot> {
  if (!isLiveMode()) {
    return getDemoPortalSnapshot();
  }

  try {
    const supabase = createPublicSupabaseClient();
    const [{ data, error }, { data: masteryRows, error: masteryError }] = await Promise.all([
      supabase.from("platform_portal_snapshot_v").select("*").limit(1).maybeSingle(),
      supabase.from("platform_portal_mastery_v").select("*").order("position")
    ]);
    if (error || masteryError || !data) {
      return getDemoPortalSnapshot();
    }
    return toPortalSnapshot(
      data as PortalSnapshotRow,
      (masteryRows ?? []) as PortalMasteryRow[]
    );
  } catch {
    return getDemoPortalSnapshot();
  }
}

export async function loadVerificationSnapshot(token: string): Promise<BadgeSnapshot | undefined> {
  if (!isLiveMode()) {
    return getDemoVerificationSnapshot(token);
  }

  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("platform_badge_assertions_v")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (error || !data) {
      return getDemoVerificationSnapshot(token);
    }

    return toBadgeSnapshot(data as BadgeSnapshotRow);
  } catch {
    return getDemoVerificationSnapshot(token);
  }
}

export async function loadVerificationTokens(): Promise<string[]> {
  if (!isLiveMode()) {
    return getDemoVerificationTokens();
  }

  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase.from("platform_badge_assertions_v").select("token");
    if (error || !data?.length) {
      return getDemoVerificationTokens();
    }
    return data.map((row) => row.token as string);
  } catch {
    return getDemoVerificationTokens();
  }
}
