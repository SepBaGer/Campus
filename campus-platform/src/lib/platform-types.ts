export interface HeroMetric {
  label: string;
  value: string;
}

export type CanonicalBlockKind = "video" | "quiz" | "reading" | "interactive" | "project";
export type BloomLevel = "recordar" | "comprender" | "aplicar" | "analizar" | "evaluar" | "crear";
export type CommunityProvider = "discourse";
export type CommunityToolMode = "none" | "mock" | "custom";
export type CommunityLaunchPresentation = "iframe" | "window";
export type RevenueShareSettlementMode = "manual_monthly" | "stripe_connect_destination_charge";
export type OneRosterProvisionMode = "match_only" | "invite_missing";

export interface RevenueShareManifest {
  enabled: boolean;
  settlement_mode: RevenueShareSettlementMode;
  currency: string;
  teacher: {
    person_id: string | null;
    display_name: string;
    stripe_account_id: string | null;
  };
  split: {
    platform_percent: number;
    teacher_percent: number;
  };
  settlement_window_days: number;
  minimum_amount_minor: number;
  stripe_connect: {
    charge_type: "destination";
    on_behalf_of: boolean;
  };
}

export interface OneRosterManifest {
  enabled: boolean;
  provider: "oneroster";
  version: "1.2";
  base_url: string | null;
  auth: {
    method: "bearer";
    token_secret_name: string | null;
  };
  sourced_ids: {
    school: string | null;
    class: string | null;
  };
  sync_direction: "pull";
  provision_mode: OneRosterProvisionMode;
  invite_redirect_path: string;
  sync_teacher_roles: boolean;
  request_options: {
    limit: number;
    timeout_ms: number;
  };
}

export interface CompetencySnapshot {
  slug: string;
  title: string;
  bloomLevel: BloomLevel;
  bloomLabel: string;
  position: number;
}

export interface RepresentationVariants {
  modes: string[];
  contrast_ratio_min: number;
  alt_text: string;
  transcript_url: string | null;
  simplified_version_url: string | null;
  reading_level: string;
}

export interface ExpressionVariants {
  accepted_formats: string[];
  time_extension_pct: number;
  assistive_tech_hints: string[];
}

export interface EngagementHooks {
  choice_points: string[];
  goal_relevance_prompt: string;
  feedback_cadence: string;
  collaboration_mode: string;
}

export interface RendererManifest {
  component: string;
  props: Record<string, unknown>;
  a11y: {
    role?: string;
    aria_label?: string;
    keyboard_map?: Record<string, string>;
  };
  offline_capable: boolean;
}

export interface RubricCriterion {
  slug: string;
  title: string;
  description: string | null;
  weight: number;
}

export interface RubricSnapshot {
  id: number | null;
  slug: string;
  title: string;
  summary: string;
  status: "draft" | "published" | "archived";
  scaleMax: number;
  criteria: RubricCriterion[];
}

export interface SubmissionCriterionScore {
  slug: string;
  title: string;
  weight: number;
  score: number;
  note: string | null;
}

export interface ProjectSubmissionSnapshot {
  id: number;
  attemptId: number | null;
  personId: string;
  contentBlockId: number;
  rubricId: number | null;
  status: string;
  submissionText: string;
  submissionUrl: string;
  submissionPayload: Record<string, unknown>;
  learnerNote: string;
  criterionScores: SubmissionCriterionScore[];
  overallScore: number | null;
  reviewNote: string;
  submittedAt: string;
  reviewedAt: string;
  learnerName: string;
  learnerEmail: string;
  reviewerName: string;
  reviewerEmail: string;
  blockSlug: string;
  blockTitle: string;
  rubricSlug: string;
  rubricTitle: string;
  rubricScaleMax: number;
  rubricCriteria: RubricCriterion[];
}

export interface TeacherRunReportSnapshot {
  runId: number;
  runSlug: string;
  runTitle: string;
  runStatus: string;
  activeEnrollments: number;
  completedEnrollments: number;
  totalLearners: number;
  totalBlocks: number;
  completedAttempts: number;
  completionPercent: number;
  dueReviewsCount: number;
  atRiskLearners: number;
  xapiStatements24h: number;
  pendingProjectSubmissions: number;
  badgesIssued: number;
  lastActivityAt: string;
  reportingWindowStartedAt: string;
}

export interface PortalNotificationSnapshot {
  id: number;
  channelCode: "email" | "web";
  status: string;
  subject: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  sentAt: string;
  templateSlug: string;
  templateTitle: string;
}

export interface NotificationCenterSnapshot {
  preferences: {
    emailEnabled: boolean;
    webEnabled: boolean;
    updatedAt: string;
  };
  webPush: {
    supported: boolean;
    publicKey: string;
    activeSubscriptions: number;
    lastSeenAt: string | null;
  };
  recent: PortalNotificationSnapshot[];
}

export interface NotificationTemplateSnapshot {
  id: number | null;
  runId: number | null;
  runSlug: string;
  runTitle: string;
  slug: string;
  title: string;
  channelCode: "email" | "web";
  audienceCode: "all" | "invited" | "active" | "completed";
  triggerCode: "manual" | "before_run_start" | "after_run_start" | "after_run_end";
  offsetDays: number;
  offsetHours: number;
  subjectTemplate: string;
  bodyTemplate: string;
  ctaLabel: string;
  ctaUrl: string;
  status: "draft" | "active" | "archived";
}

export interface NotificationDispatchSnapshot {
  id: number;
  templateSlug: string;
  templateTitle: string;
  runSlug: string;
  runTitle: string;
  channelCode: "email" | "web";
  status: string;
  personId: string;
  personName: string;
  personEmail: string;
  renderedSubject: string;
  renderedBody: string;
  scheduledFor: string;
  sentAt: string;
  errorMessage: string;
}

export interface OneRosterSyncSnapshot {
  id: number;
  runId: number | null;
  runSlug: string;
  runTitle: string;
  direction: "pull";
  status: "pending" | "running" | "completed" | "partial" | "failed";
  processedSeats: number;
  matchedSeats: number;
  invitedSeats: number;
  enrolledSeats: number;
  teacherRoleSeats: number;
  skippedSeats: number;
  failedSeats: number;
  startedAt: string;
  finishedAt: string;
  errorMessage: string;
}

export interface OneRosterSeatSnapshot {
  id: number;
  runId: number | null;
  runSlug: string;
  runTitle: string;
  enrollmentSourcedId: string;
  userSourcedId: string;
  roleCode: "student" | "teacher" | "admin" | "unknown";
  externalStatus: string;
  userEmail: string;
  userName: string;
  personId: string;
  enrollmentId: number | null;
  syncState: "staged" | "matched" | "invited" | "enrolled" | "skipped" | "error";
  syncNote: string;
  lastSeenAt: string;
  matchedAt: string;
  invitedAt: string;
  enrolledAt: string;
}

export interface SessionSnapshot {
  id: number;
  title: string;
  startsAt: string;
  endsAt?: string;
  modality: string;
  locationLabel: string;
}

export interface CourseCommunitySnapshot {
  runId: number | null;
  runSlug: string;
  runTitle: string;
  enabled: boolean;
  provider: CommunityProvider;
  title: string;
  summary: string;
  entryLabel: string;
  discussionPrompt: string;
  peerReviewEnabled: boolean;
  surfaceModes: string[];
  expectations: string[];
  toolMode: CommunityToolMode;
  ltiTitle: string;
  launchPresentation: CommunityLaunchPresentation;
  launchReady: boolean;
}

export interface PortalGamificationSnapshot {
  completedAttempts: number;
  totalXp: number;
  currentStreakDays: number;
  longestStreakDays: number;
  lastActivityOn: string | null;
  leaderboardOptIn: boolean;
  rankPosition: number | null;
  participantCount: number;
  refreshedAt: string | null;
}

export interface LeaderboardEntrySnapshot {
  personId: string;
  learnerName: string;
  completedAttempts: number;
  totalXp: number;
  currentStreakDays: number;
  longestStreakDays: number;
  lastActivityOn: string | null;
  rankPosition: number;
  participantCount: number;
  isCurrentLearner: boolean;
}

export interface BlockSnapshot {
  id: number;
  slug: string;
  title: string;
  summary: string;
  objective: string;
  kind: CanonicalBlockKind;
  kindLabel: string;
  rendererLabel: string;
  rendererManifest: RendererManifest;
  representationModes: string[];
  expressionFormats: string[];
  assistiveTechHints: string[];
  voiceDictationEnabled: boolean;
  engagementHooks: string[];
  bloomLevel: BloomLevel;
  bloomLabel: string;
  order: number;
  durationMinutes: number;
  isFree: boolean;
  competencySlug: string;
  competencyTitle: string;
  rubricSlug: string;
  rubricTitle: string;
  rubricScaleMax: number;
  rubricCriteria: RubricCriterion[];
}

export interface CourseCardSnapshot {
  slug: string;
  title: string;
  summary: string;
  eyebrow: string;
  audience: string;
  accessModel: string;
  priceLabel: string;
  deliveryLabel: string;
  runLabel: string;
  progressPercent: number;
  competencies: CompetencySnapshot[];
}

export interface CourseSnapshot extends CourseCardSnapshot {
  trackTitle: string;
  transformationPromise: string;
  durationLabel: string;
  heroMetrics: HeroMetric[];
  sessions: SessionSnapshot[];
  community: CourseCommunitySnapshot | null;
  blocks: BlockSnapshot[];
}

export interface PortalSnapshot {
  learnerName: string;
  membershipLabel: string;
  enrolledCourseTitle: string;
  activeRunLabel: string;
  completedBlocks: number;
  totalBlocks: number;
  progressPercent: number;
  nextReviewAt: string;
  dueReviewsCount: number;
  atRiskLabel: string;
  gamification: PortalGamificationSnapshot | null;
  leaderboard: LeaderboardEntrySnapshot[];
  mastery: MasterySnapshot[];
}

export interface MasterySnapshot {
  competencySlug: string;
  competencyTitle: string;
  bloomLevel: BloomLevel;
  bloomLabel: string;
  position: number;
  masteryLevel: number;
  masteryPercent: number;
  nextReviewAt: string | null;
  repetitions: number;
  intervalDays: number;
  isDue: boolean;
}

export interface BadgeSnapshot {
  token: string;
  learnerName: string;
  courseTitle: string;
  issuedAt: string;
  issuer: string;
  status: string;
  criteria: string;
}

export interface CredentialSnapshot {
  assertionId?: number;
  token: string;
  issuedAt: string;
  reused: boolean;
}

export interface AttemptCompletionResult {
  mode: "demo" | "live";
  status: string;
  courseSlug: string;
  courseTitle: string;
  contentBlockId: number;
  contentBlockTitle: string;
  completedAt: string;
  xpEarned: number;
  completedBlocks: number;
  totalBlocks: number;
  progressPercent: number;
  competencySlug: string;
  competencyTitle: string;
  masteryLevel: number;
  masteryPercent: number;
  nextReviewAt: string;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  submissionId?: number | null;
  submissionStatus?: string | null;
  reviewRequired?: boolean;
  rubricTitle?: string | null;
  xapiStatementId: number | string;
  credential: CredentialSnapshot | null;
}

export interface CourseCatalogRow {
  course_slug: string;
  course_title: string;
  course_summary: string;
  track_title: string;
  audience_label: string;
  access_model: string;
  price_label: string;
  delivery_label: string;
  run_label: string;
  progress_percent: number | null;
}

export interface CourseCompetencyRow {
  course_slug: string;
  course_title: string;
  competency_slug: string;
  competency_title: string;
  bloom_level: BloomLevel;
  position: number;
}

export interface CourseBlockRow {
  course_slug: string;
  course_title: string;
  course_summary: string;
  track_title: string;
  transformation_promise: string;
  duration_label: string;
  audience_label: string;
  access_model: string;
  price_label: string;
  delivery_label: string;
  run_label: string;
  block_id: number;
  block_slug: string;
  block_title: string;
  block_summary: string;
  block_objective: string;
  block_kind: string;
  block_order: number;
  duration_minutes: number;
  is_free: boolean;
  representation_variants: RepresentationVariants | null;
  expression_variants: ExpressionVariants | null;
  engagement_hooks: EngagementHooks | null;
  renderer_manifest: RendererManifest | null;
  bloom_level: BloomLevel | null;
  competency_slug: string | null;
  competency_title: string | null;
  competency_bloom_level: BloomLevel | null;
  rubric_slug: string | null;
  rubric_title: string | null;
  rubric_scale_max: number | null;
  rubric_criteria: RubricCriterion[] | null;
}

export interface OpenRunRow {
  course_slug: string;
  run_label: string;
  session_id: number;
  session_title: string;
  starts_at: string;
  ends_at: string | null;
  modality: string;
  location_label: string;
}

export interface CourseCommunityRow {
  course_slug: string;
  course_title: string;
  run_id: number;
  run_slug: string;
  run_title: string;
  community_manifest: Record<string, unknown> | null;
}

export interface PortalSnapshotRow {
  learner_name: string;
  membership_label: string;
  enrolled_course_title: string;
  active_run_label: string;
  completed_blocks: number;
  total_blocks: number;
  progress_percent: number;
  next_review_at: string | null;
  due_reviews_count: number;
  at_risk_label: string;
}

export interface PortalGamificationRow {
  person_id: string;
  course_run_id: number;
  completed_attempts: number;
  total_xp: number;
  current_streak_days: number;
  longest_streak_days: number;
  last_activity_on: string | null;
  leaderboard_opt_in: boolean;
  rank_position: number | null;
  participant_count: number;
  refreshed_at: string | null;
}

export interface LeaderboardEntryRow {
  person_id: string;
  learner_name: string;
  completed_attempts: number;
  total_xp: number;
  current_streak_days: number;
  longest_streak_days: number;
  last_activity_on: string | null;
  rank_position: number;
  participant_count: number;
  is_current_learner: boolean;
}

export interface PortalMasteryRow {
  course_title: string;
  competency_slug: string;
  competency_title: string;
  bloom_level: BloomLevel;
  position: number;
  mastery_level: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  repetitions: number;
  interval_days: number;
  ease_factor: number;
  is_due: boolean;
}

export interface BadgeSnapshotRow {
  token: string;
  learner_name: string;
  course_title: string;
  issued_at: string;
  issuer: string;
  status: string;
  criteria: string;
}
