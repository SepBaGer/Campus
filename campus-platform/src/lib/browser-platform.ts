import { createClient, type RealtimeChannel, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { getBlockExperienceProfile, getBloomLabel, getDefaultBlockCatalogContract } from "./block-profile";
import { resolveCommunitySnapshot } from "./community-config";
import { createDefaultOneRosterManifest } from "./oneroster-config";
import {
  getDemoVerificationSnapshot,
  getDemoCourseSnapshot,
  getDemoNotificationCenterSnapshot,
  getDemoNotificationDispatches,
  getDemoNotificationTemplates,
  getDemoPortalSnapshot
} from "./platform-data";
import type {
  NotificationCenterSnapshot,
  NotificationDispatchSnapshot,
  NotificationTemplateSnapshot,
  OneRosterManifest,
  OneRosterSeatSnapshot,
  OneRosterSyncSnapshot,
  AttemptCompletionResult,
  BadgeSnapshot,
  BadgeSnapshotRow,
  BloomLevel,
  CourseBlockRow,
  CourseCommunityRow,
  CourseCompetencyRow,
  CourseSnapshot,
  EngagementHooks,
  ExpressionVariants,
  LeaderboardEntryRow,
  OpenRunRow,
  ProjectSubmissionSnapshot,
  PortalGamificationRow,
  PortalMasteryRow,
  PortalSnapshot,
  PortalSnapshotRow,
  RevenueShareManifest,
  RubricSnapshot,
  RendererManifest,
  RepresentationVariants,
  TeacherRunReportSnapshot
} from "./platform-types";
import { buildRedirectUrl, normalizeRedirectPath, resolveSiteUrl } from "./runtime-config";
import {
  getConfiguredSiteUrl,
  getSupabaseUrl,
  hasPublicSupabaseConfig,
  isLiveMode
} from "./supabase";
import { normalizeLocale, type SupportedLocale } from "./i18n";
import { resolveEnterpriseSsoRequest } from "./enterprise-sso";
import { createDefaultRevenueShareManifest } from "./revenue-share";
import {
  isOfflineAccessEnabled,
  persistOfflineCourseSnapshot,
  persistOfflinePortalSnapshot,
  readOfflineCourseSnapshot,
  readOfflinePortalSnapshot
} from "./offline-access";

export interface AdminCatalogSnapshot {
  course: {
    id: number | null;
    slug: string;
    title: string;
    summary: string;
    transformation_promise: string;
    audience_label: string;
    price_label: string;
    delivery_label: string;
    duration_label: string;
    status: string;
  } | null;
  runs: Array<{
    id: number;
    slug: string;
    title: string;
    status: string;
    modality: string;
    starts_at: string | null;
    ends_at: string | null;
    community_manifest: Record<string, unknown>;
    revenue_share_manifest: RevenueShareManifest;
    oneroster_manifest: OneRosterManifest;
  }>;
  blocks: Array<{
    id: number;
    slug: string;
    title: string;
    summary: string;
    objective: string;
    kind: string;
    position: number;
    duration_minutes: number;
    is_public: boolean;
    representation_variants: RepresentationVariants;
    expression_variants: ExpressionVariants;
    engagement_hooks: EngagementHooks;
    renderer_manifest: RendererManifest;
    bloom_level: BloomLevel;
    competency_slug: string;
    competency_title: string;
    rubric_slug: string;
    rubric_title: string;
  }>;
  competencies: Array<{
    slug: string;
    title: string;
    bloom_level: BloomLevel;
    position: number;
  }>;
  notificationTemplates: NotificationTemplateSnapshot[];
  notificationDispatches: NotificationDispatchSnapshot[];
  onerosterSyncs: OneRosterSyncSnapshot[];
  onerosterSeats: OneRosterSeatSnapshot[];
  rubrics: RubricSnapshot[];
  submissions: ProjectSubmissionSnapshot[];
  teacherReports: TeacherRunReportSnapshot[];
  access: {
    mode: "demo" | "live";
    can_edit: boolean;
    email: string;
  };
}

let browserClient: SupabaseClient | null = null;

const demoProjectRubric: RubricSnapshot = {
  id: null,
  slug: "rubrica-proyecto-evidencia-de-impacto",
  title: "Rubrica de evidencia de impacto",
  summary: "Evalua claridad, aplicacion, evidencia y reflexion final.",
  status: "published",
  scaleMax: 4,
  criteria: [
    {
      slug: "claridad-del-problema",
      title: "Claridad del problema",
      description: "Explica reto, contexto y resultado esperado.",
      weight: 0.25
    },
    {
      slug: "aplicacion-metodologica",
      title: "Aplicacion metodologica",
      description: "Usa el framework o lenguaje trabajado en la ruta.",
      weight: 0.25
    },
    {
      slug: "evidencia-de-ejecucion",
      title: "Evidencia de ejecucion",
      description: "Muestra prueba observable del cambio.",
      weight: 0.3
    },
    {
      slug: "reflexion-y-siguientes-pasos",
      title: "Reflexion y siguientes pasos",
      description: "Explica aprendizaje, tradeoffs y siguiente iteracion.",
      weight: 0.2
    }
  ]
};

function hasWindow() {
  return typeof window !== "undefined";
}

function mapPortalSnapshot(
  row: PortalSnapshotRow,
  masteryRows: PortalMasteryRow[],
  gamificationRow: PortalGamificationRow | null,
  leaderboardRows: LeaderboardEntryRow[]
): PortalSnapshot {
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
    gamification: gamificationRow
      ? {
          completedAttempts: Number(gamificationRow.completed_attempts || 0),
          totalXp: Number(gamificationRow.total_xp || 0),
          currentStreakDays: Number(gamificationRow.current_streak_days || 0),
          longestStreakDays: Number(gamificationRow.longest_streak_days || 0),
          lastActivityOn: gamificationRow.last_activity_on ? String(gamificationRow.last_activity_on) : null,
          leaderboardOptIn: Boolean(gamificationRow.leaderboard_opt_in),
          rankPosition: gamificationRow.rank_position === null || gamificationRow.rank_position === undefined
            ? null
            : Number(gamificationRow.rank_position),
          participantCount: Number(gamificationRow.participant_count || 0),
          refreshedAt: gamificationRow.refreshed_at ? String(gamificationRow.refreshed_at) : null
        }
      : null,
    leaderboard: leaderboardRows.map((entry) => ({
      personId: String(entry.person_id || ""),
      learnerName: String(entry.learner_name || ""),
      completedAttempts: Number(entry.completed_attempts || 0),
      totalXp: Number(entry.total_xp || 0),
      currentStreakDays: Number(entry.current_streak_days || 0),
      longestStreakDays: Number(entry.longest_streak_days || 0),
      lastActivityOn: entry.last_activity_on ? String(entry.last_activity_on) : null,
      rankPosition: Number(entry.rank_position || 0),
      participantCount: Number(entry.participant_count || 0),
      isCurrentLearner: Boolean(entry.is_current_learner)
    })),
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

function mapBadgeSnapshot(row: BadgeSnapshotRow): BadgeSnapshot {
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

function mapCourseSnapshot(
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
      { label: "Duracion", value: head.duration_label },
      { label: "Competencias", value: String(competencies.length || 0) }
    ],
    competencies,
    sessions: runRows.map((runRow) => ({
      id: runRow.session_id,
      title: runRow.session_title,
      startsAt: runRow.starts_at,
      endsAt: runRow.ends_at ?? undefined,
      modality: runRow.modality,
      locationLabel: runRow.location_label
    })),
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

function mapAdminCatalogSnapshotResponse(payload: any): AdminCatalogSnapshot {
  return {
    course: payload?.course || null,
    runs: Array.isArray(payload?.runs)
      ? payload.runs.map((entry: any) => ({
          id: Number(entry?.id || 0),
          slug: String(entry?.slug || ""),
          title: String(entry?.title || ""),
          status: String(entry?.status || "draft"),
          modality: String(entry?.modality || "cohort-guided"),
          starts_at: entry?.starts_at ? String(entry.starts_at) : null,
          ends_at: entry?.ends_at ? String(entry.ends_at) : null,
          community_manifest: entry?.community_manifest && typeof entry.community_manifest === "object"
            ? entry.community_manifest
            : {},
          revenue_share_manifest: entry?.revenue_share_manifest && typeof entry.revenue_share_manifest === "object"
            ? entry.revenue_share_manifest
            : createDefaultRevenueShareManifest(),
          oneroster_manifest: entry?.oneroster_manifest && typeof entry.oneroster_manifest === "object"
            ? entry.oneroster_manifest
            : createDefaultOneRosterManifest()
        }))
      : [],
    blocks: Array.isArray(payload?.blocks) ? payload.blocks : [],
    competencies: Array.isArray(payload?.competencies) ? payload.competencies : [],
    notificationTemplates: Array.isArray(payload?.notification_templates)
      ? payload.notification_templates.map((entry: any) => ({
          id: entry?.id ?? null,
          runId: entry?.run_id ? Number(entry.run_id) : null,
          runSlug: String(entry?.run_slug || ""),
          runTitle: String(entry?.run_title || ""),
          slug: String(entry?.slug || ""),
          title: String(entry?.title || ""),
          channelCode: entry?.channel_code === "web" ? "web" : "email",
          audienceCode: entry?.audience_code === "all" || entry?.audience_code === "invited" || entry?.audience_code === "completed"
            ? entry.audience_code
            : "active",
          triggerCode: entry?.trigger_code === "before_run_start" || entry?.trigger_code === "after_run_start" || entry?.trigger_code === "after_run_end"
            ? entry.trigger_code
            : "manual",
          offsetDays: Number(entry?.offset_days || 0),
          offsetHours: Number(entry?.offset_hours || 0),
          subjectTemplate: String(entry?.subject_template || ""),
          bodyTemplate: String(entry?.body_template || ""),
          ctaLabel: String(entry?.cta_label || ""),
          ctaUrl: String(entry?.cta_url || ""),
          status: entry?.status === "active" || entry?.status === "archived" ? entry.status : "draft"
        }))
      : [],
    notificationDispatches: Array.isArray(payload?.notification_dispatches)
      ? payload.notification_dispatches.map((entry: any) => ({
          id: Number(entry?.id || 0),
          templateSlug: String(entry?.template_slug || ""),
          templateTitle: String(entry?.template_title || ""),
          runSlug: String(entry?.run_slug || ""),
          runTitle: String(entry?.run_title || ""),
          channelCode: entry?.channel_code === "web" ? "web" : "email",
          status: String(entry?.status || "pending"),
          personId: String(entry?.person_id || ""),
          personName: String(entry?.person_name || ""),
          personEmail: String(entry?.person_email || ""),
          renderedSubject: String(entry?.rendered_subject || ""),
          renderedBody: String(entry?.rendered_body || ""),
          scheduledFor: String(entry?.scheduled_for || ""),
          sentAt: String(entry?.sent_at || ""),
          errorMessage: String(entry?.error_message || "")
        }))
      : [],
    onerosterSyncs: Array.isArray(payload?.oneroster_syncs)
      ? payload.oneroster_syncs.map((entry: any) => ({
          id: Number(entry?.id || 0),
          runId: entry?.run_id ? Number(entry.run_id) : null,
          runSlug: String(entry?.run_slug || ""),
          runTitle: String(entry?.run_title || ""),
          direction: "pull",
          status: entry?.status === "running" || entry?.status === "completed" || entry?.status === "partial" || entry?.status === "failed"
            ? entry.status
            : "pending",
          processedSeats: Number(entry?.processed_seats || 0),
          matchedSeats: Number(entry?.matched_seats || 0),
          invitedSeats: Number(entry?.invited_seats || 0),
          enrolledSeats: Number(entry?.enrolled_seats || 0),
          teacherRoleSeats: Number(entry?.teacher_role_seats || 0),
          skippedSeats: Number(entry?.skipped_seats || 0),
          failedSeats: Number(entry?.failed_seats || 0),
          startedAt: String(entry?.started_at || ""),
          finishedAt: String(entry?.finished_at || ""),
          errorMessage: String(entry?.error_message || "")
        }))
      : [],
    onerosterSeats: Array.isArray(payload?.oneroster_seats)
      ? payload.oneroster_seats.map((entry: any) => ({
          id: Number(entry?.id || 0),
          runId: entry?.run_id ? Number(entry.run_id) : null,
          runSlug: String(entry?.run_slug || ""),
          runTitle: String(entry?.run_title || ""),
          enrollmentSourcedId: String(entry?.enrollment_sourced_id || ""),
          userSourcedId: String(entry?.user_sourced_id || ""),
          roleCode: entry?.role_code === "student" || entry?.role_code === "teacher" || entry?.role_code === "admin"
            ? entry.role_code
            : "unknown",
          externalStatus: String(entry?.external_status || "active"),
          userEmail: String(entry?.user_email || ""),
          userName: String(entry?.user_name || ""),
          personId: String(entry?.person_id || ""),
          enrollmentId: entry?.enrollment_id ? Number(entry.enrollment_id) : null,
          syncState: entry?.sync_state === "matched"
            || entry?.sync_state === "invited"
            || entry?.sync_state === "enrolled"
            || entry?.sync_state === "skipped"
            || entry?.sync_state === "error"
            ? entry.sync_state
            : "staged",
          syncNote: String(entry?.sync_note || ""),
          lastSeenAt: String(entry?.last_seen_at || ""),
          matchedAt: String(entry?.matched_at || ""),
          invitedAt: String(entry?.invited_at || ""),
          enrolledAt: String(entry?.enrolled_at || "")
        }))
      : [],
    rubrics: Array.isArray(payload?.rubrics)
      ? payload.rubrics.map((entry: any) => ({
          id: entry?.id ?? null,
          slug: String(entry?.slug || ""),
          title: String(entry?.title || ""),
          summary: String(entry?.summary || ""),
          status: entry?.status === "published" || entry?.status === "archived"
            ? entry.status
            : "draft",
          scaleMax: Number(entry?.scale_max || entry?.scaleMax || 4),
          criteria: Array.isArray(entry?.criteria) ? entry.criteria : []
        }))
      : [],
    submissions: Array.isArray(payload?.submissions)
      ? payload.submissions.map((entry: any) => ({
          id: Number(entry?.id || 0),
          attemptId: entry?.attempt_id ? Number(entry.attempt_id) : null,
          personId: String(entry?.person_id || ""),
          contentBlockId: Number(entry?.content_block_id || 0),
          rubricId: entry?.rubric_id ? Number(entry.rubric_id) : null,
          status: String(entry?.status || "submitted"),
          submissionText: String(entry?.submission_text || ""),
          submissionUrl: String(entry?.submission_url || ""),
          submissionPayload: entry?.submission_payload || {},
          learnerNote: String(entry?.learner_note || ""),
          criterionScores: Array.isArray(entry?.criterion_scores) ? entry.criterion_scores : [],
          overallScore: entry?.overall_score === null || entry?.overall_score === undefined
            ? null
            : Number(entry.overall_score),
          reviewNote: String(entry?.review_note || ""),
          submittedAt: String(entry?.submitted_at || ""),
          reviewedAt: String(entry?.reviewed_at || ""),
          learnerName: String(entry?.learner_name || ""),
          learnerEmail: String(entry?.learner_email || ""),
          reviewerName: String(entry?.reviewer_name || ""),
          reviewerEmail: String(entry?.reviewer_email || ""),
          blockSlug: String(entry?.block_slug || ""),
          blockTitle: String(entry?.block_title || ""),
          rubricSlug: String(entry?.rubric_slug || ""),
          rubricTitle: String(entry?.rubric_title || ""),
          rubricScaleMax: Number(entry?.rubric_scale_max || 4),
          rubricCriteria: Array.isArray(entry?.rubric_criteria) ? entry.rubric_criteria : []
        }))
      : [],
    teacherReports: Array.isArray(payload?.teacher_reports)
      ? payload.teacher_reports.map((entry: any) => ({
          runId: Number(entry?.run_id || 0),
          runSlug: String(entry?.run_slug || ""),
          runTitle: String(entry?.run_title || ""),
          runStatus: String(entry?.run_status || "draft"),
          activeEnrollments: Number(entry?.active_enrollments || 0),
          completedEnrollments: Number(entry?.completed_enrollments || 0),
          totalLearners: Number(entry?.total_learners || 0),
          totalBlocks: Number(entry?.total_blocks || 0),
          completedAttempts: Number(entry?.completed_attempts || 0),
          completionPercent: Number(entry?.completion_percent || 0),
          dueReviewsCount: Number(entry?.due_reviews_count || 0),
          atRiskLearners: Number(entry?.at_risk_learners || 0),
          xapiStatements24h: Number(entry?.xapi_statements_24h || 0),
          pendingProjectSubmissions: Number(entry?.pending_project_submissions || 0),
          badgesIssued: Number(entry?.badges_issued || 0),
          lastActivityAt: String(entry?.last_activity_at || ""),
          reportingWindowStartedAt: String(entry?.reporting_window_started_at || "")
        }))
      : [],
    access: payload?.access || {
      mode: "demo",
      can_edit: true,
      email: ""
    }
  };
}

export function isBrowserLiveMode() {
  return hasWindow() && isLiveMode() && hasPublicSupabaseConfig();
}

export function getBrowserSiteUrl() {
  return resolveSiteUrl(getConfiguredSiteUrl(), hasWindow() ? window.location.origin : undefined);
}

export function getBrowserSupabaseClient() {
  if (!browserClient) {
    if (!hasPublicSupabaseConfig()) {
      throw new Error("Missing public Supabase configuration.");
    }

    browserClient = createClient(getSupabaseUrl() as string, import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY as string, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce"
      }
    });
  }

  return browserClient;
}

export function subscribeAdminReportingRealtimeForBrowser(input: {
  courseSlug: string;
  onChange: () => void;
}) {
  if (!isBrowserLiveMode()) {
    return {
      status: "disabled" as const,
      unsubscribe() {}
    };
  }

  const client = getBrowserSupabaseClient();
  const channelName = `admin-reporting:${input.courseSlug}:${Date.now()}`;
  let channel: RealtimeChannel | null = client
    .channel(channelName)
    .on("postgres_changes", { event: "*", schema: "enrollment", table: "enrollment" }, input.onChange)
    .on("postgres_changes", { event: "*", schema: "learning", table: "attempt" }, input.onChange)
    .on("postgres_changes", { event: "*", schema: "learning", table: "mastery_state" }, input.onChange)
    .on("postgres_changes", { event: "*", schema: "learning", table: "spaced_schedule" }, input.onChange)
    .on("postgres_changes", { event: "*", schema: "learning", table: "xapi_statement" }, input.onChange)
    .on("postgres_changes", { event: "*", schema: "learning", table: "project_submission" }, input.onChange)
    .on("postgres_changes", { event: "*", schema: "credentials", table: "badge_assertion" }, input.onChange)
    .subscribe();

  return {
    status: "subscribed" as const,
    unsubscribe() {
      if (!channel) return;
      const currentChannel = channel;
      channel = null;
      void client.removeChannel(currentChannel);
    }
  };
}

export async function getBrowserSession(): Promise<Session | null> {
  if (!isBrowserLiveMode()) return null;
  const client = getBrowserSupabaseClient();
  const { data } = await client.auth.getSession();
  return data.session;
}

export async function loadPreferredLocaleForBrowser(): Promise<SupportedLocale | null> {
  if (!isBrowserLiveMode()) {
    return null;
  }

  const session = await getBrowserSession();
  if (!session) {
    return null;
  }

  const client = getBrowserSupabaseClient();
  const { data, error } = await client
    .schema("identity")
    .from("person")
    .select("locale")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.locale ? normalizeLocale(String(data.locale)) : null;
}

export async function updatePreferredLocaleForBrowser(locale: SupportedLocale) {
  if (!isBrowserLiveMode()) {
    return { locale };
  }

  const session = await getBrowserSession();
  if (!session) {
    return { locale };
  }

  const client = getBrowserSupabaseClient();
  const { error } = await client
    .schema("identity")
    .from("person")
    .update({ locale })
    .eq("id", session.user.id);

  if (error) {
    throw error;
  }

  return { locale };
}

export function onBrowserAuthStateChange(callback: (session: Session | null) => void) {
  if (!isBrowserLiveMode()) {
    return { unsubscribe() {} };
  }

  const client = getBrowserSupabaseClient();
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return data.subscription;
}

export async function requestMagicLink(email: string, redirectPath?: string) {
  if (!isBrowserLiveMode()) {
    return { message: "Modo demo: el magic link no se envia sin configurar Supabase publico." };
  }

  const client = getBrowserSupabaseClient();
  const redirectTo = buildRedirectUrl(getBrowserSiteUrl(), normalizeRedirectPath(redirectPath));
  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true
    }
  });

  if (error) {
    throw error;
  }

  return { message: `Magic link enviado a ${email}. Revisa tu correo y vuelve a ${redirectTo}.` };
}

export async function requestEnterpriseSso(input: {
  emailOrDomain?: string;
  providerId?: string;
  redirectPath?: string;
}) {
  const target = resolveEnterpriseSsoRequest(input);

  if (!isBrowserLiveMode()) {
    return {
      mode: "demo" as const,
      targetLabel: target.targetLabel
    };
  }

  const client = getBrowserSupabaseClient();
  const redirectTo = buildRedirectUrl(getBrowserSiteUrl(), normalizeRedirectPath(input.redirectPath));
  const { data, error } = await client.auth.signInWithSSO({
    ...(target.kind === "domain"
      ? { domain: target.domain }
      : { providerId: target.providerId }),
    options: {
      redirectTo,
      skipBrowserRedirect: true
    }
  });

  if (error) {
    throw error;
  }

  if (!data?.url) {
    throw new Error("SSO_URL_MISSING");
  }

  if (hasWindow()) {
    window.location.assign(data.url);
  }

  return {
    mode: "live" as const,
    url: data.url,
    redirectTo,
    targetLabel: target.targetLabel
  };
}

export async function signOutBrowserSession() {
  if (!isBrowserLiveMode()) return;
  const client = getBrowserSupabaseClient();
  await client.auth.signOut();
}

export async function loadPortalSnapshotForBrowser() {
  if (!isBrowserLiveMode()) {
    return getDemoPortalSnapshot();
  }

  try {
    const client = getBrowserSupabaseClient();
    const [
      { data, error },
      { data: masteryRows, error: masteryError },
      { data: gamificationRow, error: gamificationError }
    ] = await Promise.all([
      client.from("platform_portal_snapshot_v").select("*").limit(1).maybeSingle(),
      client.from("platform_portal_mastery_v").select("*").order("position"),
      client.from("platform_portal_gamification_v").select("*").limit(1).maybeSingle()
    ]);
    if (error || masteryError || gamificationError || !data) {
      throw error || masteryError || gamificationError || new Error("No se encontro snapshot del portal.");
    }

    let leaderboardRows: LeaderboardEntryRow[] = [];
    if (gamificationRow?.leaderboard_opt_in) {
      const { data: leaderboardData, error: leaderboardError } = await client
        .from("platform_course_leaderboard_v")
        .select("*")
        .order("rank_position");

      if (leaderboardError) {
        throw leaderboardError;
      }

      leaderboardRows = (leaderboardData ?? []) as LeaderboardEntryRow[];
    }

    const snapshot = mapPortalSnapshot(
      data as PortalSnapshotRow,
      (masteryRows ?? []) as PortalMasteryRow[],
      (gamificationRow ?? null) as PortalGamificationRow | null,
      leaderboardRows
    );
    if (await isOfflineAccessEnabled()) {
      await persistOfflinePortalSnapshot(snapshot).catch(() => {
        // offline persistence is best-effort and should never block the live experience
      });
    }
    return snapshot;
  } catch (error) {
    const offlineEnabled = await isOfflineAccessEnabled().catch(() => false);
    const offlineSnapshot = offlineEnabled
      ? await readOfflinePortalSnapshot().catch(() => null)
      : null;
    if (offlineSnapshot) {
      return offlineSnapshot;
    }

    throw error;
  }
}

export async function updateLeaderboardOptInForBrowser(isEnabled: boolean) {
  if (!isBrowserLiveMode()) {
    return { leaderboardOptIn: isEnabled };
  }

  const session = await getBrowserSession();
  if (!session) {
    throw new Error("Necesitas iniciar sesion para cambiar tu participacion en el leaderboard.");
  }

  const client = getBrowserSupabaseClient();
  const { error } = await client
    .schema("identity")
    .from("person_gamification_preference")
    .upsert(
      {
        person_id: session.user.id,
        leaderboard_opt_in: isEnabled
      },
      { onConflict: "person_id" }
    );

  if (error) {
    throw error;
  }

  return { leaderboardOptIn: isEnabled };
}

export async function initiateLtiLaunchForBrowser(input: {
  contentBlockId: number;
  returnUrl?: string;
}) {
  if (!isBrowserLiveMode()) {
    return {
      launchUrl: "",
      launchPresentation: "window" as const,
      toolTitle: "Sandbox LTI",
      toolMode: "mock" as const
    };
  }

  const session = await getBrowserSession();
  if (!session) {
    throw new Error("Necesitas iniciar sesion antes de abrir una herramienta externa.");
  }

  const data = await invokePlatformFunction<{
    launch_url: string;
    launch_presentation: "iframe" | "window";
    tool_title: string;
    tool_mode: "mock" | "custom";
  }>("lti-launch", {
    action: "initiate",
    content_block_id: input.contentBlockId,
    return_url: input.returnUrl || (hasWindow() ? window.location.href : getBrowserSiteUrl())
  });

  return {
    launchUrl: String(data.launch_url || ""),
    launchPresentation: data.launch_presentation === "iframe" ? "iframe" : "window",
    toolTitle: String(data.tool_title || "Herramienta LTI"),
    toolMode: data.tool_mode === "mock" ? "mock" : "custom"
  };
}

export async function initiateCommunityLaunchForBrowser(input: {
  runSlug: string;
  returnUrl?: string;
}) {
  if (!isBrowserLiveMode()) {
    return {
      launchUrl: "",
      launchPresentation: "window" as const,
      toolTitle: "Discourse sandbox de cohorte",
      toolMode: "mock" as const
    };
  }

  const session = await getBrowserSession();
  if (!session) {
    throw new Error("Necesitas iniciar sesion antes de abrir la comunidad de cohorte.");
  }

  const data = await invokePlatformFunction<{
    launch_url: string;
    launch_presentation: "iframe" | "window";
    tool_title: string;
    tool_mode: "mock" | "custom";
  }>("lti-launch", {
    action: "initiate-community",
    run_slug: input.runSlug,
    return_url: input.returnUrl || (hasWindow() ? window.location.href : getBrowserSiteUrl())
  });

  return {
    launchUrl: String(data.launch_url || ""),
    launchPresentation: data.launch_presentation === "iframe" ? "iframe" : "window",
    toolTitle: String(data.tool_title || "Comunidad de cohorte"),
    toolMode: data.tool_mode === "mock" ? "mock" : "custom"
  };
}

export async function loadCourseSnapshotForBrowser(slug: string): Promise<CourseSnapshot | undefined> {
  if (!isBrowserLiveMode()) {
    return getDemoCourseSnapshot(slug);
  }

  try {
    const client = getBrowserSupabaseClient();
    const [
      { data: blockRows, error: blockError },
      { data: runRows, error: runError },
      { data: competencyRows, error: competencyError },
      { data: communityRow, error: communityError }
    ] = await Promise.all([
      client.from("platform_course_blocks_v").select("*").eq("course_slug", slug),
      client.from("platform_open_runs_v").select("*").eq("course_slug", slug),
      client.from("platform_course_competencies_v").select("*").eq("course_slug", slug).order("position"),
      client.from("platform_course_community_v").select("*").eq("course_slug", slug).limit(1).maybeSingle()
    ]);

    if (blockError || runError || competencyError || communityError || !blockRows?.length) {
      throw blockError || runError || competencyError || communityError || new Error("No se encontro el curso.");
    }

    const snapshot = mapCourseSnapshot(
      blockRows as CourseBlockRow[],
      (runRows ?? []) as OpenRunRow[],
      (competencyRows ?? []) as CourseCompetencyRow[],
      (communityRow ?? null) as CourseCommunityRow | null
    );

    if (snapshot && await isOfflineAccessEnabled(slug)) {
      await persistOfflineCourseSnapshot(snapshot).catch(() => {
        // offline persistence is best-effort and should never block the live experience
      });
    }

    return snapshot;
  } catch (error) {
    const offlineEnabled = await isOfflineAccessEnabled(slug).catch(() => false);
    const offlineSnapshot = offlineEnabled
      ? await readOfflineCourseSnapshot(slug).catch(() => null)
      : null;
    if (offlineSnapshot) {
      return offlineSnapshot;
    }

    throw error;
  }
}

export async function invokePlatformFunction<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const client = getBrowserSupabaseClient();
  const { data, error } = await client.functions.invoke(name, { body });
  if (error) {
    throw error;
  }
  return data as T;
}

export async function createEnrollmentIntent(input: {
  email: string;
  courseRunSlug: string;
  planCode: string;
  priceId?: string;
  planLabel?: string;
}) {
  const session = await getBrowserSession();
  if (!session) {
    return requestMagicLink(input.email, "/portal");
  }

  const idempotencyKey = hasWindow() && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${input.courseRunSlug}`;

  return invokePlatformFunction<{
    checkout_url?: string;
    live_mode?: boolean;
    status?: string;
  }>("checkout-create", {
    course_run_slug: input.courseRunSlug,
    idempotency_key: idempotencyKey,
    plan_code: input.planCode,
    plan_label: input.planLabel || input.planCode,
    price_id: input.priceId || null
  });
}

export async function completeLearningAttempt(input: {
  contentBlockId: number;
  courseSlug?: string;
  badgeClassSlug?: string;
  payload?: Record<string, unknown>;
  submissionText?: string;
  submissionUrl?: string;
  learnerNote?: string;
  submissionPayload?: Record<string, unknown>;
}) {
  const completedAt = new Date().toISOString();

  if (!isBrowserLiveMode()) {
    const demoCourse = getDemoCourseSnapshot(input.courseSlug || "programa-empoderamiento-power-skills");
    const demoBlock = demoCourse?.blocks.find((block) => block.id === input.contentBlockId) || demoCourse?.blocks[0];
    const totalBlocks = demoCourse?.blocks.length || 1;
    const xpEarned = Math.max(20, (demoBlock?.durationMinutes || 10) * 5);

    return {
      mode: "demo",
      status: "completed",
      courseSlug: demoCourse?.slug || "programa-empoderamiento-power-skills",
      courseTitle: demoCourse?.title || "Programa demo",
      contentBlockId: input.contentBlockId,
      contentBlockTitle: demoBlock?.title || "Bloque demo",
      completedAt,
      xpEarned,
      completedBlocks: 1,
      totalBlocks,
      progressPercent: Math.floor((1 / totalBlocks) * 100),
      competencySlug: demoBlock?.competencySlug || "sin-competencia",
      competencyTitle: demoBlock?.competencyTitle || "Competencia demo",
      masteryLevel: 0.25,
      masteryPercent: 25,
      nextReviewAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      repetitions: 1,
      intervalDays: 3,
      easeFactor: 2.65,
      submissionId: demoBlock?.kind === "project" ? input.contentBlockId : null,
      submissionStatus: demoBlock?.kind === "project" ? "submitted" : null,
      reviewRequired: demoBlock?.kind === "project",
      rubricTitle: demoBlock?.rubricTitle || null,
      xapiStatementId: `demo-${input.contentBlockId}-${Date.now()}`,
      credential: demoBlock && demoBlock.order >= totalBlocks
        ? {
            token: "demo-badge-power-skills",
            issuedAt: completedAt,
            reused: false
          }
        : null
    } satisfies AttemptCompletionResult;
  }

  const session = await getBrowserSession();
  if (!session) {
    throw new Error("Necesitas iniciar sesion antes de registrar el avance.");
  }

  const data = await invokePlatformFunction<{
    status: string;
    mode: "live";
    course_slug: string;
    course_title: string;
    content_block_id: number;
    content_block_title: string;
    completed_at: string;
    xp_earned: number;
    completed_blocks: number;
    total_blocks: number;
    progress_percent: number;
    next_review_at: string;
    competency_slug: string;
    competency_title: string;
    mastery_level: number;
    mastery_percent: number;
    submission_id?: number | null;
    submission_status?: string | null;
    review_required?: boolean;
    rubric_title?: string | null;
    repetitions: number;
    interval_days: number;
    ease_factor: number;
    xapi_statement_id: number;
    credential?: {
      assertion_id?: number;
      token: string;
      issued_at: string;
      reused: boolean;
    } | null;
  }>("attempt-complete", {
    content_block_id: input.contentBlockId,
    badge_class_slug: input.badgeClassSlug || "badge-power-skills-pilot",
    submission_text: input.submissionText || null,
    submission_url: input.submissionUrl || null,
    learner_note: input.learnerNote || null,
    submission_payload: input.submissionPayload || {},
    payload: input.payload || {}
  });

  return {
    mode: data.mode,
    status: data.status,
    courseSlug: data.course_slug,
    courseTitle: data.course_title,
    contentBlockId: data.content_block_id,
    contentBlockTitle: data.content_block_title,
    completedAt: data.completed_at,
    xpEarned: Number(data.xp_earned || 0),
    completedBlocks: data.completed_blocks,
    totalBlocks: data.total_blocks,
    progressPercent: data.progress_percent,
    competencySlug: data.competency_slug,
    competencyTitle: data.competency_title,
    masteryLevel: data.mastery_level,
    masteryPercent: data.mastery_percent,
    nextReviewAt: data.next_review_at,
    repetitions: data.repetitions,
    intervalDays: data.interval_days,
    easeFactor: data.ease_factor,
    submissionId: data.submission_id ?? null,
    submissionStatus: data.submission_status ?? null,
    reviewRequired: Boolean(data.review_required),
    rubricTitle: data.rubric_title ?? null,
    xapiStatementId: data.xapi_statement_id,
    credential: data.credential
      ? {
          assertionId: data.credential.assertion_id,
          token: data.credential.token,
          issuedAt: data.credential.issued_at,
          reused: data.credential.reused
        }
      : null
  } satisfies AttemptCompletionResult;
}

export async function issueCredentialForBrowser(badgeClassSlug = "badge-power-skills-pilot") {
  if (!isBrowserLiveMode()) {
    const demoBadge = getDemoVerificationSnapshot("demo-badge-power-skills");
    if (!demoBadge) {
      throw new Error("No existe credencial demo.");
    }

    return {
      token: demoBadge.token,
      issuedAt: demoBadge.issuedAt,
      reused: true
    };
  }

  const session = await getBrowserSession();
  if (!session) {
    throw new Error("Necesitas iniciar sesion para emitir o recuperar tu badge.");
  }

  const data = await invokePlatformFunction<{
    assertion_id?: number;
    token: string;
    issued_at: string;
    reused: boolean;
  }>("credential-issue", {
    badge_class_slug: badgeClassSlug
  });

  return {
    assertionId: data.assertion_id,
    token: data.token,
    issuedAt: data.issued_at,
    reused: data.reused
  };
}

export async function loadVerificationSnapshotForBrowser(token: string): Promise<BadgeSnapshot | undefined> {
  if (!isBrowserLiveMode()) {
    return getDemoVerificationSnapshot(token);
  }

  const data = await invokePlatformFunction<{ credential?: BadgeSnapshotRow }>("verify-credential", {
    token
  });

  if (!data.credential) {
    return undefined;
  }

  return mapBadgeSnapshot(data.credential);
}

export async function loadAdminCatalogSnapshot(courseSlug: string): Promise<AdminCatalogSnapshot> {
  if (!isBrowserLiveMode()) {
    const demoCourse = getDemoCourseSnapshot(courseSlug) || getDemoCourseSnapshot("programa-empoderamiento-power-skills");
    const demoRubrics = demoCourse?.blocks.some((block) => block.kind === "project")
      ? [demoProjectRubric]
      : [];

    return {
      course: demoCourse
        ? {
            id: null,
            slug: demoCourse.slug,
            title: demoCourse.title,
            summary: demoCourse.summary,
            transformation_promise: demoCourse.transformationPromise,
            audience_label: demoCourse.audience,
            price_label: demoCourse.priceLabel,
            delivery_label: demoCourse.deliveryLabel,
            duration_label: demoCourse.durationLabel,
            status: "published"
          }
        : null,
      runs: demoCourse
        ? [{
            id: 1,
            slug: "power-skills-pilot-open",
            title: demoCourse.runLabel,
            status: "open",
            modality: "cohort-guided",
            starts_at: demoCourse.sessions[0]?.startsAt || null,
            ends_at: demoCourse.sessions[0]?.endsAt || null,
            community_manifest: demoCourse.community
              ? {
                  enabled: demoCourse.community.enabled,
                  provider: demoCourse.community.provider,
                  title: demoCourse.community.title,
                  summary: demoCourse.community.summary,
                  entry_label: demoCourse.community.entryLabel,
                  discussion_prompt: demoCourse.community.discussionPrompt,
                  peer_review_enabled: demoCourse.community.peerReviewEnabled,
                  surface_modes: demoCourse.community.surfaceModes,
                  expectations: demoCourse.community.expectations,
                  lti: {
                    tool_mode: demoCourse.community.toolMode === "none"
                      ? null
                      : demoCourse.community.toolMode,
                    title: demoCourse.community.ltiTitle,
                    launch_presentation: demoCourse.community.launchPresentation
                  }
                }
              : {},
            revenue_share_manifest: {
              ...createDefaultRevenueShareManifest(),
              enabled: true,
              teacher: {
                person_id: null,
                display_name: "Docente invitado",
                stripe_account_id: null
              }
            },
            oneroster_manifest: createDefaultOneRosterManifest()
          }]
        : [],
      blocks: demoCourse
        ? demoCourse.blocks.map((block) => {
            const contract = getDefaultBlockCatalogContract(block.kind);
            const rendererManifest = block.kind === "project"
              ? {
                  ...contract.rendererManifest,
                  props: {
                    ...contract.rendererManifest.props,
                    rubric_id: demoProjectRubric.slug
                  }
                }
              : contract.rendererManifest;

            return {
              id: block.id,
              slug: block.slug,
              title: block.title,
              summary: block.summary,
              objective: block.objective,
              kind: block.kind,
              position: block.order,
              duration_minutes: block.durationMinutes,
              is_public: block.isFree,
              representation_variants: contract.representationVariants,
              expression_variants: contract.expressionVariants,
              engagement_hooks: contract.engagementHooks,
              renderer_manifest: rendererManifest,
              bloom_level: contract.bloomLevel,
              competency_slug: block.competencySlug,
              competency_title: block.competencyTitle,
              rubric_slug: block.kind === "project" ? demoProjectRubric.slug : "",
              rubric_title: block.kind === "project" ? demoProjectRubric.title : ""
            };
          })
        : [],
      competencies: demoCourse
        ? demoCourse.competencies.map((competency) => ({
            slug: competency.slug,
            title: competency.title,
            bloom_level: competency.bloomLevel,
            position: competency.position
          }))
        : [],
      notificationTemplates: getDemoNotificationTemplates(),
      notificationDispatches: getDemoNotificationDispatches(),
      onerosterSyncs: [],
      onerosterSeats: [],
      rubrics: demoRubrics,
      submissions: [],
      teacherReports: demoCourse
        ? [{
            runId: 1,
            runSlug: "power-skills-pilot-open",
            runTitle: demoCourse.runLabel,
            runStatus: "open",
            activeEnrollments: 12,
            completedEnrollments: 3,
            totalLearners: 15,
            totalBlocks: demoCourse.blocks.length,
            completedAttempts: Math.max(0, demoCourse.blocks.length * 8),
            completionPercent: 53,
            dueReviewsCount: 4,
            atRiskLearners: 2,
            xapiStatements24h: 18,
            pendingProjectSubmissions: demoCourse.blocks.filter((block) => block.kind === "project").length,
            badgesIssued: 3,
            lastActivityAt: new Date().toISOString(),
            reportingWindowStartedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
          }]
        : [],
      access: {
        mode: "demo",
        can_edit: true,
        email: "demo@campus.local"
      }
    };
  }

  const payload = await invokePlatformFunction("admin-catalog", {
    action: "snapshot",
    course_slug: courseSlug
  });

  return mapAdminCatalogSnapshotResponse(payload);
}

export async function upsertAdminCatalogEntity(
  action: "upsert-course" | "upsert-run" | "upsert-block" | "upsert-rubric" | "upsert-notification-template" | "review-project-submission",
  payload: Record<string, unknown>
) {
  return invokePlatformFunction("admin-catalog", {
    action,
    ...payload
  });
}

export async function syncOneRosterRunForBrowser(runSlug: string) {
  if (!isBrowserLiveMode()) {
    return {
      status: "completed" as const,
      run_slug: runSlug,
      processed_seats: 0,
      matched_seats: 0,
      invited_seats: 0,
      enrolled_seats: 0,
      teacher_role_seats: 0,
      skipped_seats: 0,
      failed_seats: 0
    };
  }

  return invokePlatformFunction<{
    sync_id: number;
    run_slug: string;
    status: "completed" | "partial" | "failed";
    processed_seats: number;
    matched_seats: number;
    invited_seats: number;
    enrolled_seats: number;
    teacher_role_seats: number;
    skipped_seats: number;
    failed_seats: number;
  }>("oneroster-sync", {
    action: "sync-run",
    run_slug: runSlug
  });
}

export async function loadNotificationCenterForBrowser(): Promise<NotificationCenterSnapshot> {
  if (!isBrowserLiveMode()) {
    return getDemoNotificationCenterSnapshot();
  }

  const session = await getBrowserSession();
  if (!session) {
    throw new Error("Necesitas iniciar sesion para usar notificaciones.");
  }

  const payload = await invokePlatformFunction<any>("notification-preferences", {
    action: "snapshot"
  });

  return {
    preferences: {
      emailEnabled: Boolean(payload?.preferences?.email_enabled),
      webEnabled: Boolean(payload?.preferences?.web_enabled),
      updatedAt: String(payload?.preferences?.updated_at || "")
    },
    webPush: {
      supported: Boolean(payload?.web_push?.supported),
      publicKey: String(payload?.web_push?.public_key || ""),
      activeSubscriptions: Number(payload?.web_push?.active_subscriptions || 0),
      lastSeenAt: payload?.web_push?.last_seen_at ? String(payload.web_push.last_seen_at) : null
    },
    recent: Array.isArray(payload?.recent)
      ? payload.recent.map((entry: any) => ({
          id: Number(entry?.id || 0),
          channelCode: entry?.channel_code === "web" ? "web" : "email",
          status: String(entry?.status || "sent"),
          subject: String(entry?.subject || ""),
          body: String(entry?.body || ""),
          ctaLabel: String(entry?.cta_label || ""),
          ctaUrl: String(entry?.cta_url || ""),
          sentAt: String(entry?.sent_at || ""),
          templateSlug: String(entry?.template_slug || ""),
          templateTitle: String(entry?.template_title || "")
        }))
      : []
  };
}

export async function updateNotificationPreferenceForBrowser(
  channelCode: "email" | "web",
  isEnabled: boolean
) {
  if (!isBrowserLiveMode()) {
    return getDemoNotificationCenterSnapshot();
  }

  return invokePlatformFunction("notification-preferences", {
    action: "update-preference",
    channel_code: channelCode,
    is_enabled: isEnabled
  });
}

export async function registerWebPushForBrowser(subscription: PushSubscription) {
  if (!isBrowserLiveMode()) {
    return getDemoNotificationCenterSnapshot();
  }

  return invokePlatformFunction("notification-preferences", {
    action: "register-web-push",
    subscription: subscription.toJSON()
  });
}

export async function dispatchNotificationTemplateForBrowser(runSlug: string, templateSlug: string) {
  return invokePlatformFunction("cohort-notify", {
    action: "dispatch-template",
    run_slug: runSlug,
    template_slug: templateSlug
  });
}

export async function processDueNotificationsForBrowser(runSlug: string) {
  return invokePlatformFunction("cohort-notify", {
    action: "process-due",
    run_slug: runSlug
  });
}
