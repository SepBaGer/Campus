import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { resolveAdminActor } from "../_shared/admin.ts";
import { createAdminClient } from "../_shared/auth.ts";
import { parseCourseRunCommunityManifest } from "../_shared/community.ts";
import { corsHeaders, createHttpError, jsonResponse } from "../_shared/http.ts";
import { serializeOneRosterManifest } from "../_shared/oneroster.ts";
import { normalizeRevenueShareManifest } from "../_shared/revenue-share.ts";
import {
  type NotificationAudience,
  type NotificationChannel,
  type NotificationTemplateStatus,
  normalizeNotificationAudience,
  normalizeNotificationChannel,
  normalizeNotificationTemplateStatus,
  normalizeNotificationTrigger
} from "../_shared/notifications.ts";

const canonicalBlockKinds = ["video", "quiz", "reading", "interactive", "project"] as const;
const canonicalBloomLevels = ["recordar", "comprender", "aplicar", "analizar", "evaluar", "crear"] as const;
const canonicalRubricStatuses = ["draft", "published", "archived"] as const;

type CanonicalBlockKind = (typeof canonicalBlockKinds)[number];
type BloomLevel = (typeof canonicalBloomLevels)[number];
type RubricStatus = (typeof canonicalRubricStatuses)[number];
type JsonRecord = Record<string, unknown>;
type CompetencyManifestItem = {
  slug: string;
  title: string;
  bloom_level: BloomLevel;
  position: number;
};
type ResolvedCourseCompetency = CompetencyManifestItem & {
  id: number;
};
type RubricCriterion = {
  slug: string;
  title: string;
  description: string | null;
  weight: number;
};
type ResolvedRubric = {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  status: RubricStatus;
  scale_max: number;
  criteria: RubricCriterion[];
};
type CriterionScore = {
  slug: string;
  title: string;
  weight: number;
  score: number;
  note: string | null;
};
type NotificationTemplateSnapshot = {
  id: number;
  run_id: number;
  run_slug: string;
  run_title: string;
  slug: string;
  title: string;
  channel_code: NotificationChannel;
  audience_code: NotificationAudience;
  trigger_code: "manual" | "before_run_start" | "after_run_start" | "after_run_end";
  offset_days: number;
  offset_hours: number;
  subject_template: string;
  body_template: string;
  cta_label: string | null;
  cta_url: string | null;
  status: NotificationTemplateStatus;
};
type NotificationDispatchSnapshot = {
  id: number;
  template_slug: string;
  template_title: string;
  run_slug: string;
  run_title: string;
  channel_code: NotificationChannel;
  status: string;
  person_id: string;
  person_name: string;
  person_email: string;
  rendered_subject: string;
  rendered_body: string;
  scheduled_for: string;
  sent_at: string | null;
  error_message: string | null;
};
type OneRosterSyncSnapshot = {
  id: number;
  run_id: number;
  run_slug: string;
  run_title: string;
  direction: "pull";
  status: "pending" | "running" | "completed" | "partial" | "failed";
  processed_seats: number;
  matched_seats: number;
  invited_seats: number;
  enrolled_seats: number;
  teacher_role_seats: number;
  skipped_seats: number;
  failed_seats: number;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
};
type OneRosterSeatSnapshot = {
  id: number;
  run_id: number;
  run_slug: string;
  run_title: string;
  enrollment_sourced_id: string;
  user_sourced_id: string;
  role_code: "student" | "teacher" | "admin" | "unknown";
  external_status: string;
  user_email: string | null;
  user_name: string;
  person_id: string | null;
  enrollment_id: number | null;
  sync_state: "staged" | "matched" | "invited" | "enrolled" | "skipped" | "error";
  sync_note: string | null;
  last_seen_at: string;
  matched_at: string | null;
  invited_at: string | null;
  enrolled_at: string | null;
};
type TeacherRunReportSnapshot = {
  run_id: number;
  run_slug: string;
  run_title: string;
  run_status: string;
  active_enrollments: number;
  completed_enrollments: number;
  total_learners: number;
  total_blocks: number;
  completed_attempts: number;
  completion_percent: number;
  due_reviews_count: number;
  at_risk_learners: number;
  xapi_statements_24h: number;
  pending_project_submissions: number;
  badges_issued: number;
  last_activity_at: string | null;
  reporting_window_started_at: string;
};

const legacyToCanonicalKind: Record<string, CanonicalBlockKind> = {
  lesson: "reading",
  resource: "reading",
  workshop: "interactive",
  practice: "quiz",
  milestone: "project"
};

const DEFAULT_COURSE_COMPETENCIES: CompetencyManifestItem[] = [
  {
    slug: "foco-y-autonomia-operativa",
    title: "Foco y autonomia operativa",
    bloom_level: "aplicar",
    position: 1
  },
  {
    slug: "pensamiento-estrategico-y-sistemico",
    title: "Pensamiento estrategico y sistemico",
    bloom_level: "analizar",
    position: 2
  },
  {
    slug: "comunicacion-estructurada-con-evidencia",
    title: "Comunicacion estructurada con evidencia",
    bloom_level: "evaluar",
    position: 3
  },
  {
    slug: "diseno-de-soluciones-con-ia",
    title: "Diseno de soluciones con IA",
    bloom_level: "crear",
    position: 4
  }
];

const DEFAULT_BLOCK_CONTRACT_BY_KIND: Record<
  CanonicalBlockKind,
  {
    representation_variants: JsonRecord;
    expression_variants: JsonRecord;
    engagement_hooks: JsonRecord;
    renderer_manifest: JsonRecord;
    bloom_level: BloomLevel;
  }
> = {
  video: {
    representation_variants: {
      modes: ["text", "audio", "video_caption"],
      contrast_ratio_min: 4.5,
      alt_text: "Resumen accesible del bloque de video",
      transcript_url: null,
      simplified_version_url: null,
      reading_level: "B1"
    },
    expression_variants: {
      accepted_formats: ["text", "audio_upload"],
      time_extension_pct: 25,
      assistive_tech_hints: ["screen_reader_friendly", "keyboard_only", "voice_dictation"]
    },
    engagement_hooks: {
      choice_points: ["pick_scenario", "select_depth"],
      goal_relevance_prompt: "Como aplicaras este video en tu operacion esta semana?",
      feedback_cadence: "per_attempt",
      collaboration_mode: "optional_peer_review"
    },
    renderer_manifest: {
      component: "video-block",
      props: {
        src: null,
        captions: [],
        transcript_url: null,
        duration_s: 900
      },
      a11y: {
        role: "document",
        aria_label: "Bloque de video",
        keyboard_map: {}
      },
      offline_capable: false
    },
    bloom_level: "comprender"
  },
  quiz: {
    representation_variants: {
      modes: ["text", "audio", "diagram"],
      contrast_ratio_min: 4.5,
      alt_text: "Mapa accesible del bloque de quiz",
      transcript_url: null,
      simplified_version_url: null,
      reading_level: "B1"
    },
    expression_variants: {
      accepted_formats: ["text", "audio_upload"],
      time_extension_pct: 25,
      assistive_tech_hints: ["screen_reader_friendly", "keyboard_only", "voice_dictation"]
    },
    engagement_hooks: {
      choice_points: ["pick_scenario", "choose_retry_path"],
      goal_relevance_prompt: "Que decision concreta quieres validar con este quiz?",
      feedback_cadence: "per_attempt",
      collaboration_mode: "solo_reflection"
    },
    renderer_manifest: {
      component: "quiz-block",
      props: {
        questions: [],
        passing_score: 80,
        time_limit_s: 900
      },
      a11y: {
        role: "form",
        aria_label: "Bloque de quiz",
        keyboard_map: {}
      },
      offline_capable: false
    },
    bloom_level: "aplicar"
  },
  reading: {
    representation_variants: {
      modes: ["text", "audio", "simplified_text"],
      contrast_ratio_min: 4.5,
      alt_text: "Resumen accesible de la lectura",
      transcript_url: null,
      simplified_version_url: null,
      reading_level: "B1"
    },
    expression_variants: {
      accepted_formats: ["text", "audio_upload"],
      time_extension_pct: 25,
      assistive_tech_hints: ["screen_reader_friendly", "keyboard_only", "voice_dictation"]
    },
    engagement_hooks: {
      choice_points: ["pick_scenario", "select_depth"],
      goal_relevance_prompt: "Como conectas esta lectura con tu rol actual?",
      feedback_cadence: "reflection_prompt",
      collaboration_mode: "solo_reflection"
    },
    renderer_manifest: {
      component: "reading-block",
      props: {
        markdown: null,
        estimated_minutes: 15,
        reading_level: "B1"
      },
      a11y: {
        role: "article",
        aria_label: "Bloque de lectura",
        keyboard_map: {}
      },
      offline_capable: true
    },
    bloom_level: "comprender"
  },
  interactive: {
    representation_variants: {
      modes: ["text", "guided_demo", "keyboard_navigation"],
      contrast_ratio_min: 4.5,
      alt_text: "Guia accesible de la practica interactiva",
      transcript_url: null,
      simplified_version_url: null,
      reading_level: "B1"
    },
    expression_variants: {
      accepted_formats: ["text", "drawing"],
      time_extension_pct: 25,
      assistive_tech_hints: ["keyboard_only", "step_by_step_prompting", "voice_dictation"]
    },
    engagement_hooks: {
      choice_points: ["pick_scenario", "select_depth"],
      goal_relevance_prompt: "Que ruta refleja mejor tu contexto real de trabajo?",
      feedback_cadence: "guided_steps",
      collaboration_mode: "optional_peer_review"
    },
    renderer_manifest: {
      component: "interactive-block",
      props: {
        lti_tool_mode: null,
        lti_login_initiation_url: null,
        lti_target_link_uri: null,
        lti_launch_url: null,
        lti_client_id: null,
        lti_deployment_id: null,
        lti_resource_link_id: null,
        lti_launch_presentation: "window",
        lti_custom_parameters: {},
        lti_title: null,
        client_id: null,
        h5p_content_id: null
      },
      a11y: {
        role: "application",
        aria_label: "Bloque interactivo",
        keyboard_map: {}
      },
      offline_capable: false
    },
    bloom_level: "analizar"
  },
  project: {
    representation_variants: {
      modes: ["text", "rubric", "worked_example"],
      contrast_ratio_min: 4.5,
      alt_text: "Brief accesible del proyecto",
      transcript_url: null,
      simplified_version_url: null,
      reading_level: "B1"
    },
    expression_variants: {
      accepted_formats: ["text", "video_upload", "drawing"],
      time_extension_pct: 25,
      assistive_tech_hints: ["screen_reader_friendly", "keyboard_only", "voice_dictation"]
    },
    engagement_hooks: {
      choice_points: ["select_depth", "choose_submission_format"],
      goal_relevance_prompt: "Que evidencia concreta demostrara el cambio logrado?",
      feedback_cadence: "milestone_based",
      collaboration_mode: "optional_peer_review"
    },
    renderer_manifest: {
      component: "project-block",
      props: {
        brief_md: null,
        submission_format: "text",
        rubric_id: null
      },
      a11y: {
        role: "article",
        aria_label: "Bloque de proyecto",
        keyboard_map: {}
      },
      offline_capable: true
    },
    bloom_level: "crear"
  }
};

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value === "true" || value === "1" || value === "yes";
  }
  return fallback;
}

function toNullableString(value: unknown) {
  const resolved = typeof value === "string" ? value.trim() : "";
  return resolved || null;
}

function toInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeBlockKind(value: unknown): CanonicalBlockKind {
  const resolved = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (!resolved) {
    return "reading";
  }

  if (canonicalBlockKinds.includes(resolved as CanonicalBlockKind)) {
    return resolved as CanonicalBlockKind;
  }

  if (resolved in legacyToCanonicalKind) {
    return legacyToCanonicalKind[resolved];
  }

  throw createHttpError("Tipo de bloque no soportado", 400);
}

function normalizeBloomLevel(value: unknown, fallback: BloomLevel): BloomLevel {
  const resolved = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (canonicalBloomLevels.includes(resolved as BloomLevel)) {
    return resolved as BloomLevel;
  }

  return fallback;
}

function normalizeRubricStatus(value: unknown, fallback: RubricStatus = "draft"): RubricStatus {
  const resolved = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (canonicalRubricStatuses.includes(resolved as RubricStatus)) {
    return resolved as RubricStatus;
  }

  return fallback;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneJsonRecord(value: JsonRecord) {
  return JSON.parse(JSON.stringify(value)) as JsonRecord;
}

function parseJsonRecord(value: unknown, field: string): JsonRecord | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (!isRecord(parsed)) {
        throw new Error("Expected a JSON object");
      }
      return parsed;
    } catch {
      throw createHttpError(`El campo ${field} debe ser un JSON valido`, 400);
    }
  }

  if (isRecord(value)) {
    return value;
  }

  throw createHttpError(`El campo ${field} debe ser un objeto JSON`, 400);
}

function parseJsonArray(value: unknown, field: string) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (!Array.isArray(parsed)) {
        throw new Error("Expected a JSON array");
      }
      return parsed;
    } catch {
      throw createHttpError(`El campo ${field} debe ser un JSON valido`, 400);
    }
  }

  if (Array.isArray(value)) {
    return value;
  }

  throw createHttpError(`El campo ${field} debe ser un arreglo JSON`, 400);
}

function toNumeric(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseCompetenciesManifest(value: unknown): CompetencyManifestItem[] {
  const parsed = parseJsonArray(value, "competencies_manifest");
  const source = parsed && parsed.length ? parsed : DEFAULT_COURSE_COMPETENCIES;
  const seen = new Set<string>();

  return source
    .map((entry, index) => {
      if (!isRecord(entry)) {
        throw createHttpError("Cada competency del manifest debe ser un objeto JSON", 400);
      }

      const title = typeof entry.title === "string" ? entry.title.trim() : "";
      if (!title) {
        throw createHttpError("Cada competency requiere title", 400);
      }

      const slugInput = typeof entry.slug === "string" ? entry.slug.trim() : "";
      const slug = toSlug(slugInput || title);
      if (!slug) {
        throw createHttpError("Cada competency requiere slug valido", 400);
      }

      if (seen.has(slug)) {
        return null;
      }
      seen.add(slug);

      return {
        slug,
        title,
        bloom_level: normalizeBloomLevel(entry.bloom_level, "comprender"),
        position: toInteger(entry.position, index + 1)
      } satisfies CompetencyManifestItem;
    })
    .filter((entry): entry is CompetencyManifestItem => Boolean(entry))
    .sort((left, right) => left.position - right.position)
    .map((entry, index) => ({
      ...entry,
      position: index + 1
    }));
}

function parseCompetencySlug(value: unknown) {
  const resolved = typeof value === "string" ? value.trim() : "";
  return resolved ? toSlug(resolved) : "";
}

function parseNotificationTemplatePayload(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    throw createHttpError("La plantilla requiere title", 400);
  }

  const slugInput = typeof body.template_slug === "string" ? body.template_slug.trim() : "";
  const slug = toSlug(slugInput || title);
  if (!slug) {
    throw createHttpError("La plantilla requiere slug valido", 400);
  }

  const bodyTemplate = typeof body.body_template === "string" ? body.body_template.trim() : "";
  if (!bodyTemplate) {
    throw createHttpError("La plantilla requiere body_template", 400);
  }

  return {
    slug,
    title,
    channel_code: normalizeNotificationChannel(body.channel_code, "email"),
    audience_code: normalizeNotificationAudience(body.audience_code, "active"),
    trigger_code: normalizeNotificationTrigger(body.trigger_code, "manual"),
    offset_days: toInteger(body.offset_days, 0),
    offset_hours: toInteger(body.offset_hours, 0),
    subject_template: typeof body.subject_template === "string" && body.subject_template.trim()
      ? body.subject_template.trim()
      : title,
    body_template: bodyTemplate,
    cta_label: toNullableString(body.cta_label),
    cta_url: toNullableString(body.cta_url),
    status: normalizeNotificationTemplateStatus(body.status, "draft")
  };
}

function parseRubricCriteria(value: unknown): RubricCriterion[] {
  const parsed = parseJsonArray(value, "criteria");

  if (!parsed?.length) {
    throw createHttpError("La rubrica requiere al menos un criterio", 400);
  }

  const seen = new Set<string>();
  const normalized = parsed
    .map((entry) => {
      if (!isRecord(entry)) {
        throw createHttpError("Cada criterio de rubrica debe ser un objeto JSON", 400);
      }

      const title = typeof entry.title === "string" ? entry.title.trim() : "";
      if (!title) {
        throw createHttpError("Cada criterio de rubrica requiere title", 400);
      }

      const slugInput = typeof entry.slug === "string" ? entry.slug.trim() : "";
      const slug = toSlug(slugInput || title);
      if (!slug) {
        throw createHttpError("Cada criterio de rubrica requiere slug valido", 400);
      }

      if (seen.has(slug)) {
        return null;
      }

      seen.add(slug);

      return {
        slug,
        title,
        description: toNullableString(entry.description),
        weight: Math.max(0, toNumeric(entry.weight, 0))
      } satisfies RubricCriterion;
    })
    .filter((entry): entry is RubricCriterion => Boolean(entry));

  const totalWeight = normalized.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) {
    throw createHttpError("La rubrica requiere pesos positivos", 400);
  }

  return normalized.map((entry) => ({
    ...entry,
    weight: Number((entry.weight / totalWeight).toFixed(4))
  }));
}

function parseRendererRubricRef(rendererManifest: unknown) {
  const manifest = isRecord(rendererManifest) ? rendererManifest : {};
  const props = isRecord(manifest.props) ? manifest.props : {};
  return typeof props.rubric_id === "string" ? props.rubric_id.trim() : "";
}

function getDefaultBlockContract(kind: CanonicalBlockKind) {
  const defaults = DEFAULT_BLOCK_CONTRACT_BY_KIND[kind];

  return {
    representation_variants: cloneJsonRecord(defaults.representation_variants),
    expression_variants: cloneJsonRecord(defaults.expression_variants),
    engagement_hooks: cloneJsonRecord(defaults.engagement_hooks),
    renderer_manifest: cloneJsonRecord(defaults.renderer_manifest),
    bloom_level: defaults.bloom_level
  };
}

function resolveRendererManifest(kind: CanonicalBlockKind, input: unknown) {
  const defaults = getDefaultBlockContract(kind).renderer_manifest;
  const manifest = parseJsonRecord(input, "renderer_manifest");

  if (!manifest) {
    return defaults;
  }

  const defaultProps = isRecord(defaults.props) ? defaults.props : {};
  const defaultA11y = isRecord(defaults.a11y) ? defaults.a11y : {};
  const manifestProps = isRecord(manifest.props) ? manifest.props : {};
  const manifestA11y = isRecord(manifest.a11y) ? manifest.a11y : {};
  const defaultKeyboardMap = isRecord(defaultA11y.keyboard_map) ? defaultA11y.keyboard_map : {};
  const manifestKeyboardMap = isRecord(manifestA11y.keyboard_map) ? manifestA11y.keyboard_map : {};

  return {
    ...defaults,
    ...manifest,
    component: typeof manifest.component === "string" && manifest.component.trim()
      ? manifest.component.trim()
      : defaults.component,
    props: {
      ...defaultProps,
      ...manifestProps
    },
    a11y: {
      ...defaultA11y,
      ...manifestA11y,
      keyboard_map: {
        ...defaultKeyboardMap,
        ...manifestKeyboardMap
      }
    },
    offline_capable: toBoolean(manifest.offline_capable, Boolean(defaults.offline_capable))
  };
}

function resolveBlockContract(
  kind: CanonicalBlockKind,
  input: {
    representation_variants?: unknown;
    expression_variants?: unknown;
    engagement_hooks?: unknown;
    renderer_manifest?: unknown;
    bloom_level?: unknown;
  }
) {
  const defaults = getDefaultBlockContract(kind);
  const representation = parseJsonRecord(input.representation_variants, "representation_variants");
  const expression = parseJsonRecord(input.expression_variants, "expression_variants");
  const engagement = parseJsonRecord(input.engagement_hooks, "engagement_hooks");

  return {
    representation_variants: representation
      ? { ...defaults.representation_variants, ...representation }
      : defaults.representation_variants,
    expression_variants: expression
      ? { ...defaults.expression_variants, ...expression }
      : defaults.expression_variants,
    engagement_hooks: engagement
      ? { ...defaults.engagement_hooks, ...engagement }
      : defaults.engagement_hooks,
    renderer_manifest: resolveRendererManifest(kind, input.renderer_manifest),
    bloom_level: normalizeBloomLevel(input.bloom_level, defaults.bloom_level)
  };
}

async function syncCourseCompetencies(
  adminClient: ReturnType<typeof createAdminClient>,
  courseId: number,
  manifestInput: unknown
) {
  const manifest = parseCompetenciesManifest(manifestInput);

  const { error: upsertCompetenciesError } = await adminClient
    .schema("catalog")
    .from("competency")
    .upsert(
      manifest.map((entry) => ({
        slug: entry.slug,
        title: entry.title,
        bloom_level: entry.bloom_level
      })),
      { onConflict: "slug" }
    );

  if (upsertCompetenciesError) {
    throw createHttpError(upsertCompetenciesError.message, 400);
  }

  const { data: competencies, error: competenciesError } = await adminClient
    .schema("catalog")
    .from("competency")
    .select("id, slug")
    .in("slug", manifest.map((entry) => entry.slug));

  if (competenciesError || !competencies?.length) {
    throw createHttpError(competenciesError?.message || "No se pudieron resolver las competencies", 400);
  }

  const competencyIdBySlug = new Map(
    competencies.map((entry) => [String(entry.slug), Number(entry.id)])
  );

  const { error: deleteError } = await adminClient
    .schema("catalog")
    .from("course_competency")
    .delete()
    .eq("course_id", courseId);

  if (deleteError) {
    throw createHttpError(deleteError.message, 400);
  }

  const courseCompetencies = manifest.map((entry) => {
    const competencyId = competencyIdBySlug.get(entry.slug);

    if (!competencyId) {
      throw createHttpError(`No se pudo resolver el id para competency ${entry.slug}`, 400);
    }

    return {
      course_id: courseId,
      competency_id: competencyId,
      position: entry.position
    };
  });

  const { error: insertError } = await adminClient
    .schema("catalog")
    .from("course_competency")
    .insert(courseCompetencies);

  if (insertError) {
    throw createHttpError(insertError.message, 400);
  }

  return manifest;
}

async function resolveCourseCompetencies(
  adminClient: ReturnType<typeof createAdminClient>,
  courseId: number
): Promise<ResolvedCourseCompetency[]> {
  const { data, error } = await adminClient
    .schema("catalog")
    .from("course_competency")
    .select("position, competency_id, competency:competency_id (slug, title, bloom_level)")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  if (error) {
    throw createHttpError(error.message, 400);
  }

  return (data || []).map((entry) => {
    const competency = isRecord(entry.competency) ? entry.competency : {};

    return {
      id: Number(entry.competency_id),
      slug: String(competency.slug || ""),
      title: String(competency.title || ""),
      bloom_level: normalizeBloomLevel(competency.bloom_level, "comprender"),
      position: toInteger(entry.position, 1)
    } satisfies ResolvedCourseCompetency;
  });
}

async function resolveCourseRubrics(
  adminClient: ReturnType<typeof createAdminClient>,
  courseId: number
): Promise<ResolvedRubric[]> {
  const { data, error } = await adminClient
    .schema("catalog")
    .from("rubric")
    .select("id, slug, title, summary, status, scale_max, criteria")
    .eq("course_id", courseId)
    .order("created_at", { ascending: true });

  if (error) {
    throw createHttpError(error.message, 400);
  }

  return (data || []).map((entry) => ({
    id: Number(entry.id),
    slug: String(entry.slug || ""),
    title: String(entry.title || ""),
    summary: toNullableString(entry.summary),
    status: normalizeRubricStatus(entry.status, "draft"),
    scale_max: toInteger(entry.scale_max, 4),
    criteria: Array.isArray(entry.criteria)
      ? parseRubricCriteria(entry.criteria)
      : []
  }));
}

async function resolveCourseRubric(
  adminClient: ReturnType<typeof createAdminClient>,
  courseId: number,
  rubricRefInput: unknown
): Promise<ResolvedRubric | null> {
  const rubricRef = typeof rubricRefInput === "string"
    ? rubricRefInput.trim()
    : Number.isFinite(Number(rubricRefInput))
      ? String(rubricRefInput)
      : "";

  if (!rubricRef) {
    return null;
  }

  const rubricId = Number(rubricRef);
  let query = adminClient
    .schema("catalog")
    .from("rubric")
    .select("id, slug, title, summary, status, scale_max, criteria")
    .eq("course_id", courseId)
    .limit(1);

  query = Number.isFinite(rubricId) && rubricId > 0
    ? query.eq("id", rubricId)
    : query.eq("slug", rubricRef);

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw createHttpError(error.message, 400);
  }

  if (!data) {
    throw createHttpError("La rubrica seleccionada no pertenece al curso", 400);
  }

  return {
    id: Number(data.id),
    slug: String(data.slug || ""),
    title: String(data.title || ""),
    summary: toNullableString(data.summary),
    status: normalizeRubricStatus(data.status, "draft"),
    scale_max: toInteger(data.scale_max, 4),
    criteria: Array.isArray(data.criteria)
      ? parseRubricCriteria(data.criteria)
      : []
  };
}

function parseCriterionScores(value: unknown, rubric: ResolvedRubric) {
  const parsed = parseJsonArray(value, "criterion_scores");
  const source = new Map<string, JsonRecord>();

  for (const entry of parsed || []) {
    if (!isRecord(entry)) {
      continue;
    }

    const slug = typeof entry.slug === "string" ? toSlug(entry.slug) : "";
    if (!slug) {
      continue;
    }

    source.set(slug, entry);
  }

  const criterion_scores = rubric.criteria.map((criterion) => {
    const entry = source.get(criterion.slug) || {};
    const score = Math.max(0, Math.min(rubric.scale_max, toNumeric(entry.score, 0)));

    return {
      slug: criterion.slug,
      title: criterion.title,
      weight: criterion.weight,
      score: Number(score.toFixed(2)),
      note: toNullableString(entry.note)
    } satisfies CriterionScore;
  });

  const overall_score = Number(
    (
      criterion_scores.reduce((sum, entry) => {
        const normalized = rubric.scale_max > 0 ? entry.score / rubric.scale_max : 0;
        return sum + normalized * entry.weight;
      }, 0) * 100
    ).toFixed(2)
  );

  return {
    criterion_scores,
    overall_score
  };
}

async function syncPrimaryBlockCompetency(
  adminClient: ReturnType<typeof createAdminClient>,
  courseId: number,
  contentBlockId: number,
  competencySlugInput: unknown
) {
  const courseCompetencies = await resolveCourseCompetencies(adminClient, courseId);

  if (!courseCompetencies.length) {
    throw createHttpError("El curso todavia no tiene competencias disponibles", 409);
  }

  const requestedSlug = parseCompetencySlug(competencySlugInput);
  const selectedCompetency = requestedSlug
    ? courseCompetencies.find((entry) => entry.slug === requestedSlug)
    : courseCompetencies[0];

  if (!selectedCompetency) {
    throw createHttpError("La competencia primaria del bloque no pertenece al curso", 400);
  }

  const { error: deleteError } = await adminClient
    .schema("catalog")
    .from("content_block_competency")
    .delete()
    .eq("content_block_id", contentBlockId);

  if (deleteError) {
    throw createHttpError(deleteError.message, 400);
  }

  const { error: insertError } = await adminClient
    .schema("catalog")
    .from("content_block_competency")
    .insert({
      content_block_id: contentBlockId,
      competency_id: selectedCompetency.id,
      position: 1,
      weight: 1,
      is_primary: true
    });

  if (insertError) {
    throw createHttpError(insertError.message, 400);
  }

  return selectedCompetency;
}

async function resolveTrackId(adminClient: ReturnType<typeof createAdminClient>, trackSlug = "power-skills") {
  const { data: track } = await adminClient
    .schema("catalog")
    .from("track")
    .select("id")
    .eq("slug", trackSlug)
    .maybeSingle();

  if (track?.id) {
    return track.id;
  }

  const { data: insertedTrack, error } = await adminClient
    .schema("catalog")
    .from("track")
    .insert({
      slug: trackSlug,
      title: "Power Skills",
      summary: "Track bootstrap desde admin-catalog",
      is_published: true
    })
    .select("id")
    .single();

  if (error || !insertedTrack) {
    throw createHttpError(error?.message || "No se pudo crear el track", 400);
  }

  return insertedTrack.id;
}

async function resolveCourse(adminClient: ReturnType<typeof createAdminClient>, courseSlug: string) {
  const { data: course, error } = await adminClient
    .schema("catalog")
    .from("course")
    .select("id, slug, title, summary, transformation_promise, audience_label, price_label, delivery_label, duration_label, status")
    .eq("slug", courseSlug)
    .maybeSingle();

  if (error) {
    throw createHttpError(error.message, 400);
  }

  return course;
}

function normalizeIsoCandidate(value: unknown) {
  const resolved = typeof value === "string" ? value : "";
  if (!resolved) return null;

  const timestamp = Date.parse(resolved);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function latestIso(left: string | null, right: unknown) {
  const normalizedRight = normalizeIsoCandidate(right);
  if (!normalizedRight) return left;
  if (!left) return normalizedRight;
  return Date.parse(normalizedRight) > Date.parse(left) ? normalizedRight : left;
}

function uniqueSize(values: Iterable<string>) {
  return new Set(Array.from(values).filter(Boolean)).size;
}

async function loadTeacherRunReports(
  adminClient: ReturnType<typeof createAdminClient>,
  courseId: number,
  runsInput: unknown[],
  blocksInput: unknown[],
  submissionsInput: unknown[]
): Promise<TeacherRunReportSnapshot[]> {
  const runs = (runsInput || [])
    .filter(isRecord)
    .map((entry) => ({
      id: Number(entry.id || 0),
      slug: String(entry.slug || ""),
      title: String(entry.title || ""),
      status: String(entry.status || "draft")
    }))
    .filter((entry) => entry.id > 0);
  const blockIds = (blocksInput || [])
    .filter(isRecord)
    .map((entry) => Number(entry.id || 0))
    .filter((entry) => entry > 0);

  if (!runs.length) {
    return [];
  }

  const runIds = runs.map((entry) => entry.id);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const nowTime = Date.now();
  const [
    { data: enrollments, error: enrollmentsError },
    { data: attempts, error: attemptsError },
    { data: spacedSchedules, error: spacedSchedulesError }
  ] = await Promise.all([
    adminClient
      .schema("enrollment")
      .from("enrollment")
      .select("id, person_id, course_run_id, status, created_at, updated_at")
      .in("course_run_id", runIds),
    blockIds.length
      ? adminClient
          .schema("learning")
          .from("attempt")
          .select("id, person_id, content_block_id, status, completed_at, updated_at")
          .in("content_block_id", blockIds)
      : Promise.resolve({ data: [], error: null }),
    blockIds.length
      ? adminClient
          .schema("learning")
          .from("spaced_schedule")
          .select("person_id, competency_id, source_content_block_id, next_review_at, updated_at")
          .in("source_content_block_id", blockIds)
      : Promise.resolve({ data: [], error: null })
  ]);

  if (enrollmentsError || attemptsError || spacedSchedulesError) {
    throw createHttpError(
      enrollmentsError?.message
        || attemptsError?.message
        || spacedSchedulesError?.message
        || "No se pudo cargar la reporteria docente",
      400
    );
  }

  const enrollmentRows = (enrollments || []).filter(isRecord);
  const learnerIds = Array.from(new Set(
    enrollmentRows
      .map((entry) => String(entry.person_id || ""))
      .filter(Boolean)
  ));

  const [
    { data: xapiStatements, error: xapiError },
    { data: badgeAssertions, error: badgeError }
  ] = learnerIds.length
    ? await Promise.all([
        adminClient
          .schema("learning")
          .from("xapi_statement")
          .select("id, person_id, emitted_at, payload")
          .in("person_id", learnerIds)
          .gte("emitted_at", since),
        adminClient
          .schema("credentials")
          .from("badge_assertion")
          .select("id, person_id, enrollment_id, status, issued_at")
          .in("person_id", learnerIds)
      ])
    : [{ data: [], error: null }, { data: [], error: null }];

  if (xapiError || badgeError) {
    throw createHttpError(xapiError?.message || badgeError?.message || "No se pudo cargar actividad docente", 400);
  }

  const attemptRows = (attempts || []).filter(isRecord);
  const scheduleRows = (spacedSchedules || []).filter(isRecord);
  const xapiRows = (xapiStatements || []).filter(isRecord);
  const badgeRows = (badgeAssertions || []).filter(isRecord);
  const submissionRows = (submissionsInput || []).filter(isRecord);
  const blockIdSet = new Set(blockIds.map(String));

  return runs.map((run) => {
    const runEnrollments = enrollmentRows.filter((entry) => Number(entry.course_run_id || 0) === run.id);
    const enrollmentIds = new Set(runEnrollments.map((entry) => Number(entry.id || 0)).filter((entry) => entry > 0));
    const runLearnerIds = new Set(
      runEnrollments
        .filter((entry) => ["active", "completed"].includes(String(entry.status || "")))
        .map((entry) => String(entry.person_id || ""))
        .filter(Boolean)
    );
    const activeEnrollments = runEnrollments.filter((entry) => String(entry.status || "") === "active").length;
    const completedEnrollments = runEnrollments.filter((entry) => String(entry.status || "") === "completed").length;
    const completedAttemptPairs = new Set<string>();
    let lastActivityAt: string | null = null;

    for (const enrollment of runEnrollments) {
      lastActivityAt = latestIso(lastActivityAt, enrollment.updated_at);
      lastActivityAt = latestIso(lastActivityAt, enrollment.created_at);
    }

    for (const attempt of attemptRows) {
      const personId = String(attempt.person_id || "");
      const blockId = String(attempt.content_block_id || "");
      const status = String(attempt.status || "");
      if (!runLearnerIds.has(personId) || !blockIdSet.has(blockId)) {
        continue;
      }

      lastActivityAt = latestIso(lastActivityAt, attempt.completed_at);
      lastActivityAt = latestIso(lastActivityAt, attempt.updated_at);
      if (status === "completed" || status === "reviewed") {
        completedAttemptPairs.add(`${personId}:${blockId}`);
      }
    }

    const dueScheduleRows = scheduleRows.filter((entry) => {
      const personId = String(entry.person_id || "");
      const nextReviewAt = normalizeIsoCandidate(entry.next_review_at);
      if (!runLearnerIds.has(personId) || !nextReviewAt) {
        return false;
      }
      return Date.parse(nextReviewAt) < nowTime;
    });

    for (const schedule of scheduleRows) {
      if (runLearnerIds.has(String(schedule.person_id || ""))) {
        lastActivityAt = latestIso(lastActivityAt, schedule.updated_at);
      }
    }

    const runXapiRows = xapiRows.filter((entry) => {
      const personId = String(entry.person_id || "");
      const payload = isRecord(entry.payload) ? entry.payload : {};
      return runLearnerIds.has(personId)
        && Number(payload.course_id || 0) === courseId;
    });

    for (const statement of runXapiRows) {
      lastActivityAt = latestIso(lastActivityAt, statement.emitted_at);
    }

    const pendingSubmissions = submissionRows.filter((entry) => {
      const personId = String(entry.person_id || "");
      const status = String(entry.status || "submitted");
      return runLearnerIds.has(personId)
        && blockIdSet.has(String(entry.content_block_id || ""))
        && status !== "reviewed";
    });

    for (const submission of pendingSubmissions) {
      lastActivityAt = latestIso(lastActivityAt, submission.submitted_at);
      lastActivityAt = latestIso(lastActivityAt, submission.reviewed_at);
    }

    const issuedBadges = badgeRows.filter((entry) => {
      const personId = String(entry.person_id || "");
      const enrollmentId = Number(entry.enrollment_id || 0);
      return String(entry.status || "") === "issued"
        && runLearnerIds.has(personId)
        && (!enrollmentId || enrollmentIds.has(enrollmentId));
    });

    for (const badge of issuedBadges) {
      lastActivityAt = latestIso(lastActivityAt, badge.issued_at);
    }

    const totalLearners = runLearnerIds.size;
    const expectedCompletions = totalLearners * blockIds.length;
    const completionPercent = expectedCompletions > 0
      ? Math.min(100, Math.round((completedAttemptPairs.size / expectedCompletions) * 100))
      : 0;

    return {
      run_id: run.id,
      run_slug: run.slug,
      run_title: run.title,
      run_status: run.status,
      active_enrollments: activeEnrollments,
      completed_enrollments: completedEnrollments,
      total_learners: totalLearners,
      total_blocks: blockIds.length,
      completed_attempts: completedAttemptPairs.size,
      completion_percent: completionPercent,
      due_reviews_count: dueScheduleRows.length,
      at_risk_learners: uniqueSize(dueScheduleRows.map((entry) => String(entry.person_id || ""))),
      xapi_statements_24h: runXapiRows.length,
      pending_project_submissions: pendingSubmissions.length,
      badges_issued: issuedBadges.length,
      last_activity_at: lastActivityAt,
      reporting_window_started_at: since
    } satisfies TeacherRunReportSnapshot;
  });
}

async function handleSnapshot(adminClient: ReturnType<typeof createAdminClient>, courseSlug: string, email: string) {
  const course = await resolveCourse(adminClient, courseSlug);
  const [{ data: runs, error: runsError }, { data: blocks, error: blocksError }, { data: competencies, error: competenciesError }, { data: rubrics, error: rubricsError }] = await Promise.all([
    course
        ? adminClient
          .schema("delivery")
          .from("course_run")
          .select("id, slug, title, status, modality, starts_at, ends_at, community_manifest, revenue_share_manifest, oneroster_manifest")
          .eq("course_id", course.id)
          .order("starts_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    course
      ? adminClient
          .schema("catalog")
          .from("content_block")
          .select(
            "id, slug, title, summary, objective, kind, position, duration_minutes, is_public, representation_variants, expression_variants, engagement_hooks, renderer_manifest, bloom_level, content_block_competency(position, is_primary, competency:competency_id (slug, title, bloom_level))"
          )
          .eq("course_id", course.id)
          .order("position", { ascending: true })
      : Promise.resolve({ data: [], error: null })
    ,
    course
      ? adminClient
          .schema("catalog")
          .from("course_competency")
          .select("position, competency:competency_id (slug, title, bloom_level)")
          .eq("course_id", course.id)
          .order("position", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    course
      ? adminClient
          .schema("catalog")
          .from("rubric")
          .select("id, slug, title, summary, status, scale_max, criteria")
          .eq("course_id", course.id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null })
  ]);

  if (runsError || blocksError || competenciesError || rubricsError) {
    throw createHttpError(
      runsError?.message || blocksError?.message || competenciesError?.message || rubricsError?.message || "No se pudo cargar el snapshot",
      400
    );
  }

  const resolvedRubrics = (rubrics || []).map((entry) => ({
    id: Number(entry.id),
    slug: String(entry.slug || ""),
    title: String(entry.title || ""),
    summary: toNullableString(entry.summary),
    status: normalizeRubricStatus(entry.status, "draft"),
    scale_max: toInteger(entry.scale_max, 4),
    criteria: Array.isArray(entry.criteria)
      ? parseRubricCriteria(entry.criteria)
      : []
  })) satisfies ResolvedRubric[];
  const rubricBySlug = new Map(resolvedRubrics.map((entry) => [entry.slug, entry]));
  const blockIds = (blocks || []).map((entry) => Number(entry.id)).filter((entry) => entry > 0);

  const { data: submissions, error: submissionsError } = blockIds.length
    ? await adminClient
        .schema("learning")
        .from("project_submission")
        .select(
          "id, attempt_id, person_id, content_block_id, rubric_id, reviewer_person_id, status, submission_text, submission_url, submission_payload, learner_note, criterion_scores, overall_score, review_note, submitted_at, reviewed_at"
        )
        .in("content_block_id", blockIds)
        .order("submitted_at", { ascending: false })
    : { data: [], error: null };

  if (submissionsError) {
    throw createHttpError(submissionsError.message, 400);
  }

  const submissionPersonIds = Array.from(new Set(
    (submissions || [])
      .flatMap((entry) => [String(entry.person_id || ""), String(entry.reviewer_person_id || "")])
      .filter(Boolean)
  ));
  const { data: submissionPeople, error: submissionPeopleError } = submissionPersonIds.length
    ? await adminClient
        .schema("identity")
        .from("person")
        .select("id, full_name, email")
        .in("id", submissionPersonIds)
    : { data: [], error: null };

  if (submissionPeopleError) {
    throw createHttpError(submissionPeopleError.message, 400);
  }

  const submissionPeopleById = new Map(
    (submissionPeople || []).map((entry) => [String(entry.id), entry])
  );
  const blockById = new Map((blocks || []).map((entry) => [Number(entry.id), entry]));
  const rubricById = new Map(resolvedRubrics.map((entry) => [entry.id, entry]));

  const teacherReports = course
    ? await loadTeacherRunReports(adminClient, Number(course.id), runs || [], blocks || [], submissions || [])
    : [];

  const runIds = (runs || []).map((entry) => Number(entry.id)).filter((entry) => entry > 0);
  const [
    { data: notificationTemplates, error: notificationTemplatesError },
    { data: notificationDispatches, error: notificationDispatchesError },
    { data: rosterSyncs, error: rosterSyncsError },
    { data: rosterSeats, error: rosterSeatsError }
  ] = runIds.length
    ? await Promise.all([
        adminClient
          .schema("delivery")
          .from("notification_template")
          .select("id, slug, title, channel_code, audience_code, trigger_code, offset_days, offset_hours, subject_template, body_template, cta_label, cta_url, status, run:course_run_id (id, slug, title)")
          .in("course_run_id", runIds)
          .order("created_at", { ascending: true }),
        adminClient
          .schema("delivery")
          .from("notification_dispatch")
          .select("id, channel_code, status, person_id, rendered_subject, rendered_body, scheduled_for, sent_at, error_message, template:template_id (slug, title), run:course_run_id (slug, title)")
          .in("course_run_id", runIds)
          .order("created_at", { ascending: false })
          .limit(24),
        adminClient
          .schema("delivery")
          .from("course_run_roster_sync")
          .select("id, direction, status, processed_seats, matched_seats, invited_seats, enrolled_seats, teacher_role_seats, skipped_seats, failed_seats, started_at, finished_at, error_message, run:course_run_id (id, slug, title)")
          .in("course_run_id", runIds)
          .order("started_at", { ascending: false })
          .limit(12),
        adminClient
          .schema("delivery")
          .from("course_run_roster_seat")
          .select("id, enrollment_sourced_id, user_sourced_id, role_code, external_status, user_email, user_name, person_id, enrollment_id, sync_state, sync_note, last_seen_at, matched_at, invited_at, enrolled_at, run:course_run_id (id, slug, title)")
          .in("course_run_id", runIds)
          .order("updated_at", { ascending: false })
          .limit(36)
      ])
    : Promise.resolve([
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null },
        { data: [], error: null }
      ]);

  if (notificationTemplatesError || notificationDispatchesError || rosterSyncsError || rosterSeatsError) {
    throw createHttpError(
      notificationTemplatesError?.message
        || notificationDispatchesError?.message
        || rosterSyncsError?.message
        || rosterSeatsError?.message
        || "No se pudieron cargar las operaciones de cohorte",
      400
    );
  }

  const notificationPersonIds = Array.from(new Set(
    (notificationDispatches || [])
      .map((entry) => String(entry.person_id || ""))
      .filter(Boolean)
  ));
  const { data: notificationPeople, error: notificationPeopleError } = notificationPersonIds.length
    ? await adminClient
        .schema("identity")
        .from("person")
        .select("id, full_name, email")
        .in("id", notificationPersonIds)
    : { data: [], error: null };

  if (notificationPeopleError) {
    throw createHttpError(notificationPeopleError.message, 400);
  }

  const notificationPeopleById = new Map(
    (notificationPeople || []).map((entry) => [String(entry.id), entry])
  );

  return {
    course,
    runs: (runs || []).map((entry) => ({
      ...entry,
      oneroster_manifest: serializeOneRosterManifest(entry.oneroster_manifest)
    })),
    blocks: (blocks || []).map((entry) => {
      const competencyLinks = Array.isArray(entry.content_block_competency)
        ? entry.content_block_competency
        : [];
      const primaryLink = competencyLinks.find((link) => Boolean(link?.is_primary)) || competencyLinks[0];
      const competency = primaryLink && isRecord(primaryLink.competency)
        ? primaryLink.competency
        : {};
      const rubricRef = parseRendererRubricRef(entry.renderer_manifest);
      const rubric = rubricBySlug.get(rubricRef);

      return {
        id: Number(entry.id),
        slug: String(entry.slug || ""),
        title: String(entry.title || ""),
        summary: String(entry.summary || ""),
        objective: String(entry.objective || ""),
        kind: String(entry.kind || "reading"),
        position: toInteger(entry.position, 1),
        duration_minutes: toInteger(entry.duration_minutes, 15),
        is_public: toBoolean(entry.is_public, false),
        representation_variants: entry.representation_variants,
        expression_variants: entry.expression_variants,
        engagement_hooks: entry.engagement_hooks,
        renderer_manifest: entry.renderer_manifest,
        bloom_level: normalizeBloomLevel(entry.bloom_level, "comprender"),
        competency_slug: String(competency.slug || ""),
        competency_title: String(competency.title || ""),
        rubric_slug: rubric?.slug || rubricRef,
        rubric_title: rubric?.title || ""
      };
    }),
    competencies: (competencies || []).map((entry) => {
      const competency = isRecord(entry.competency) ? entry.competency : {};

      return {
        slug: String(competency.slug || ""),
        title: String(competency.title || ""),
        bloom_level: normalizeBloomLevel(competency.bloom_level, "comprender"),
        position: toInteger(entry.position, 1)
      };
    }),
    rubrics: resolvedRubrics,
    teacher_reports: teacherReports,
    oneroster_syncs: (rosterSyncs || []).map((entry) => {
      const run = isRecord(entry.run) ? entry.run : {};

      return {
        id: Number(entry.id),
        run_id: Number(run.id || 0),
        run_slug: String(run.slug || ""),
        run_title: String(run.title || ""),
        direction: "pull",
        status: String(entry.status || "pending") as OneRosterSyncSnapshot["status"],
        processed_seats: toInteger(entry.processed_seats, 0),
        matched_seats: toInteger(entry.matched_seats, 0),
        invited_seats: toInteger(entry.invited_seats, 0),
        enrolled_seats: toInteger(entry.enrolled_seats, 0),
        teacher_role_seats: toInteger(entry.teacher_role_seats, 0),
        skipped_seats: toInteger(entry.skipped_seats, 0),
        failed_seats: toInteger(entry.failed_seats, 0),
        started_at: String(entry.started_at || ""),
        finished_at: toNullableString(entry.finished_at),
        error_message: toNullableString(entry.error_message)
      } satisfies OneRosterSyncSnapshot;
    }),
    oneroster_seats: (rosterSeats || []).map((entry) => {
      const run = isRecord(entry.run) ? entry.run : {};
      const roleCode = String(entry.role_code || "unknown");
      const syncState = String(entry.sync_state || "staged");

      return {
        id: Number(entry.id),
        run_id: Number(run.id || 0),
        run_slug: String(run.slug || ""),
        run_title: String(run.title || ""),
        enrollment_sourced_id: String(entry.enrollment_sourced_id || ""),
        user_sourced_id: String(entry.user_sourced_id || ""),
        role_code: roleCode === "student" || roleCode === "teacher" || roleCode === "admin"
          ? roleCode
          : "unknown",
        external_status: String(entry.external_status || "active"),
        user_email: toNullableString(entry.user_email),
        user_name: String(entry.user_name || ""),
        person_id: toNullableString(entry.person_id),
        enrollment_id: entry.enrollment_id ? Number(entry.enrollment_id) : null,
        sync_state: syncState === "matched"
          || syncState === "invited"
          || syncState === "enrolled"
          || syncState === "skipped"
          || syncState === "error"
          ? syncState
          : "staged",
        sync_note: toNullableString(entry.sync_note),
        last_seen_at: String(entry.last_seen_at || ""),
        matched_at: toNullableString(entry.matched_at),
        invited_at: toNullableString(entry.invited_at),
        enrolled_at: toNullableString(entry.enrolled_at)
      } satisfies OneRosterSeatSnapshot;
    }),
    notification_templates: (notificationTemplates || []).map((entry) => {
      const run = isRecord(entry.run) ? entry.run : {};

      return {
        id: Number(entry.id),
        run_id: Number(run.id || 0),
        run_slug: String(run.slug || ""),
        run_title: String(run.title || ""),
        slug: String(entry.slug || ""),
        title: String(entry.title || ""),
        channel_code: normalizeNotificationChannel(entry.channel_code, "email"),
        audience_code: normalizeNotificationAudience(entry.audience_code, "active"),
        trigger_code: normalizeNotificationTrigger(entry.trigger_code, "manual"),
        offset_days: toInteger(entry.offset_days, 0),
        offset_hours: toInteger(entry.offset_hours, 0),
        subject_template: String(entry.subject_template || ""),
        body_template: String(entry.body_template || ""),
        cta_label: toNullableString(entry.cta_label),
        cta_url: toNullableString(entry.cta_url),
        status: normalizeNotificationTemplateStatus(entry.status, "draft")
      } satisfies NotificationTemplateSnapshot;
    }),
    notification_dispatches: (notificationDispatches || []).map((entry) => {
      const person = notificationPeopleById.get(String(entry.person_id || "")) || {};
      const template = isRecord(entry.template) ? entry.template : {};
      const run = isRecord(entry.run) ? entry.run : {};

      return {
        id: Number(entry.id),
        template_slug: String(template.slug || ""),
        template_title: String(template.title || ""),
        run_slug: String(run.slug || ""),
        run_title: String(run.title || ""),
        channel_code: normalizeNotificationChannel(entry.channel_code, "email"),
        status: String(entry.status || "pending"),
        person_id: String(entry.person_id || ""),
        person_name: String(person.full_name || ""),
        person_email: String(person.email || ""),
        rendered_subject: String(entry.rendered_subject || ""),
        rendered_body: String(entry.rendered_body || ""),
        scheduled_for: String(entry.scheduled_for || ""),
        sent_at: toNullableString(entry.sent_at),
        error_message: toNullableString(entry.error_message)
      } satisfies NotificationDispatchSnapshot;
    }),
    submissions: (submissions || []).map((entry) => {
      const learner = submissionPeopleById.get(String(entry.person_id || "")) || {};
      const reviewer = submissionPeopleById.get(String(entry.reviewer_person_id || "")) || {};
      const rubric = rubricById.get(Number(entry.rubric_id || 0));
      const block = blockById.get(Number(entry.content_block_id || 0)) || {};

      return {
        id: Number(entry.id),
        attempt_id: entry.attempt_id ? Number(entry.attempt_id) : null,
        person_id: String(entry.person_id || ""),
        content_block_id: Number(entry.content_block_id),
        rubric_id: entry.rubric_id ? Number(entry.rubric_id) : null,
        status: String(entry.status || "submitted"),
        submission_text: toNullableString(entry.submission_text),
        submission_url: toNullableString(entry.submission_url),
        submission_payload: isRecord(entry.submission_payload) ? entry.submission_payload : {},
        learner_note: toNullableString(entry.learner_note),
        criterion_scores: Array.isArray(entry.criterion_scores) ? entry.criterion_scores : [],
        overall_score: entry.overall_score === null || entry.overall_score === undefined
          ? null
          : Number(entry.overall_score),
        review_note: toNullableString(entry.review_note),
        submitted_at: String(entry.submitted_at || ""),
        reviewed_at: toNullableString(entry.reviewed_at),
        learner_name: String(learner.full_name || ""),
        learner_email: String(learner.email || ""),
        reviewer_name: String(reviewer.full_name || ""),
        reviewer_email: String(reviewer.email || ""),
        block_slug: String(block.slug || ""),
        block_title: String(block.title || ""),
        rubric_slug: rubric?.slug || "",
        rubric_title: rubric?.title || "",
        rubric_scale_max: rubric?.scale_max || 4,
        rubric_criteria: rubric?.criteria || []
      };
    }),
    access: {
      mode: "live",
      can_edit: true,
      email
    }
  };
}

async function handleUpsertCourse(
  adminClient: ReturnType<typeof createAdminClient>,
  body: Record<string, unknown>
) {
  const courseSlug = String(body.course_slug || "programa-empoderamiento-power-skills");
  const trackId = await resolveTrackId(adminClient, String(body.track_slug || "power-skills"));

  const { data, error } = await adminClient
    .schema("catalog")
    .from("course")
    .upsert(
      {
        track_id: trackId,
        slug: courseSlug,
        title: String(body.title || "Programa de Empoderamiento en Power Skills"),
        summary: toNullableString(body.summary),
        transformation_promise: toNullableString(body.transformation_promise),
        audience_label: String(body.audience_label || "Profesionales y equipos"),
        access_model: String(body.access_model || "free-plus-premium"),
        price_label: String(body.price_label || "Piloto premium"),
        delivery_label: String(body.delivery_label || "Cohorte guiada"),
        duration_label: String(body.duration_label || "4 bloques"),
        status: String(body.status || "published")
      },
      { onConflict: "slug" }
    )
    .select("id, slug, title")
    .single();

  if (error || !data) {
    throw createHttpError(error?.message || "No se pudo guardar el curso", 400);
  }

  const competencies = await syncCourseCompetencies(
    adminClient,
    Number(data.id),
    body.competencies_manifest
  );

  return { course: data, competencies };
}

async function handleUpsertRubric(
  adminClient: ReturnType<typeof createAdminClient>,
  body: Record<string, unknown>
) {
  const courseSlug = String(body.course_slug || "programa-empoderamiento-power-skills");
  const course = await resolveCourse(adminClient, courseSlug);
  if (!course) {
    throw createHttpError("Curso no encontrado", 404);
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    throw createHttpError("La rubrica requiere title", 400);
  }

  const rubricSlugInput = typeof body.rubric_slug === "string" ? body.rubric_slug.trim() : "";
  const rubricSlug = toSlug(rubricSlugInput || title);
  if (!rubricSlug) {
    throw createHttpError("La rubrica requiere slug valido", 400);
  }

  const criteria = parseRubricCriteria(body.criteria);
  const { data, error } = await adminClient
    .schema("catalog")
    .from("rubric")
    .upsert(
      {
        course_id: Number(course.id),
        slug: rubricSlug,
        title,
        summary: toNullableString(body.summary),
        status: normalizeRubricStatus(body.status, "draft"),
        scale_max: Math.max(2, Math.min(10, toInteger(body.scale_max, 4))),
        criteria
      },
      { onConflict: "course_id,slug" }
    )
    .select("id, slug, title, summary, status, scale_max, criteria")
    .single();

  if (error || !data) {
    throw createHttpError(error?.message || "No se pudo guardar la rubrica", 400);
  }

  return {
    rubric: {
      id: Number(data.id),
      slug: String(data.slug || ""),
      title: String(data.title || ""),
      summary: toNullableString(data.summary),
      status: normalizeRubricStatus(data.status, "draft"),
      scale_max: toInteger(data.scale_max, 4),
      criteria: Array.isArray(data.criteria)
        ? parseRubricCriteria(data.criteria)
        : []
    }
  };
}

async function handleUpsertRun(
  adminClient: ReturnType<typeof createAdminClient>,
  body: Record<string, unknown>
) {
  const courseSlug = String(body.course_slug || "programa-empoderamiento-power-skills");
  const course = await resolveCourse(adminClient, courseSlug);
  if (!course) {
    throw createHttpError("Curso no encontrado", 404);
  }

  const { data, error } = await adminClient
    .schema("delivery")
    .from("course_run")
    .upsert(
      {
        course_id: course.id,
        slug: String(body.run_slug || "power-skills-pilot-open"),
        title: String(body.title || "Cohorte abierta"),
        status: String(body.status || "open"),
        modality: String(body.modality || "cohort-guided"),
        starts_at: toNullableString(body.starts_at),
        ends_at: toNullableString(body.ends_at),
        enrollment_opens_at: toNullableString(body.starts_at),
        enrollment_closes_at: toNullableString(body.ends_at),
        community_manifest: parseCourseRunCommunityManifest(body.community_manifest, String(body.title || "Cohorte abierta")),
        revenue_share_manifest: normalizeRevenueShareManifest(body.revenue_share_manifest),
        oneroster_manifest: serializeOneRosterManifest(body.oneroster_manifest)
      },
      { onConflict: "slug" }
    )
    .select("id, slug, title, community_manifest, revenue_share_manifest, oneroster_manifest")
    .single();

  if (error || !data) {
    throw createHttpError(error?.message || "No se pudo guardar el run", 400);
  }

  return { run: data };
}

async function handleUpsertNotificationTemplate(
  adminClient: ReturnType<typeof createAdminClient>,
  body: Record<string, unknown>
) {
  const courseSlug = String(body.course_slug || "programa-empoderamiento-power-skills");
  const runSlug = String(body.run_slug || "");
  const course = await resolveCourse(adminClient, courseSlug);
  if (!course) {
    throw createHttpError("Curso no encontrado", 404);
  }

  const { data: run, error: runError } = await adminClient
    .schema("delivery")
    .from("course_run")
    .select("id, slug, title")
    .eq("course_id", Number(course.id))
    .eq("slug", runSlug || "power-skills-pilot-open")
    .maybeSingle();

  if (runError || !run) {
    throw createHttpError(runError?.message || "Cohorte no encontrada para la plantilla", 404);
  }

  const payload = parseNotificationTemplatePayload(body);
  const { data, error } = await adminClient
    .schema("delivery")
    .from("notification_template")
    .upsert(
      {
        course_run_id: Number(run.id),
        slug: payload.slug,
        title: payload.title,
        channel_code: payload.channel_code,
        audience_code: payload.audience_code,
        trigger_code: payload.trigger_code,
        offset_days: payload.offset_days,
        offset_hours: payload.offset_hours,
        subject_template: payload.subject_template,
        body_template: payload.body_template,
        cta_label: payload.cta_label,
        cta_url: payload.cta_url,
        status: payload.status
      },
      { onConflict: "course_run_id,slug" }
    )
    .select("id, slug, title, channel_code, audience_code, trigger_code, offset_days, offset_hours, status")
    .single();

  if (error || !data) {
    throw createHttpError(error?.message || "No se pudo guardar la plantilla", 400);
  }

  return {
    notification_template: {
      id: Number(data.id),
      run_slug: String(run.slug || ""),
      run_title: String(run.title || ""),
      slug: String(data.slug || ""),
      title: String(data.title || ""),
      channel_code: normalizeNotificationChannel(data.channel_code, "email"),
      audience_code: normalizeNotificationAudience(data.audience_code, "active"),
      trigger_code: normalizeNotificationTrigger(data.trigger_code, "manual"),
      offset_days: toInteger(data.offset_days, 0),
      offset_hours: toInteger(data.offset_hours, 0),
      status: normalizeNotificationTemplateStatus(data.status, "draft")
    }
  };
}

async function handleReviewProjectSubmission(
  adminClient: ReturnType<typeof createAdminClient>,
  reviewerId: string,
  body: Record<string, unknown>
) {
  const submissionId = Number(body.submission_id);
  if (!submissionId) {
    throw createHttpError("Falta submission_id", 400);
  }

  const { data: submission, error: submissionError } = await adminClient
    .schema("learning")
    .from("project_submission")
    .select("id, attempt_id, rubric_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (submissionError || !submission) {
    throw createHttpError(submissionError?.message || "Entrega no encontrada", 404);
  }

  if (!submission.rubric_id) {
    throw createHttpError("La entrega no tiene una rubrica asociada", 409);
  }

  const { data: rubricRow, error: rubricError } = await adminClient
    .schema("catalog")
    .from("rubric")
    .select("id, slug, title, summary, status, scale_max, criteria")
    .eq("id", submission.rubric_id)
    .maybeSingle();

  if (rubricError || !rubricRow) {
    throw createHttpError(rubricError?.message || "Rubrica no encontrada", 404);
  }

  const rubric: ResolvedRubric = {
    id: Number(rubricRow.id),
    slug: String(rubricRow.slug || ""),
    title: String(rubricRow.title || ""),
    summary: toNullableString(rubricRow.summary),
    status: normalizeRubricStatus(rubricRow.status, "draft"),
    scale_max: toInteger(rubricRow.scale_max, 4),
    criteria: Array.isArray(rubricRow.criteria)
      ? parseRubricCriteria(rubricRow.criteria)
      : []
  };

  const reviewStatus = String(body.review_status || "reviewed") === "changes_requested"
    ? "changes_requested"
    : "reviewed";
  const review = parseCriterionScores(body.criterion_scores, rubric);
  const reviewedAt = new Date().toISOString();

  const { data: updatedSubmission, error: updateSubmissionError } = await adminClient
    .schema("learning")
    .from("project_submission")
    .update({
      status: reviewStatus,
      criterion_scores: review.criterion_scores,
      overall_score: review.overall_score,
      review_note: toNullableString(body.review_note),
      reviewer_person_id: reviewerId,
      reviewed_at: reviewedAt
    })
    .eq("id", submissionId)
    .select("id, status, overall_score, reviewed_at")
    .single();

  if (updateSubmissionError || !updatedSubmission) {
    throw createHttpError(updateSubmissionError?.message || "No se pudo guardar la revision", 400);
  }

  if (submission.attempt_id) {
    const { error: updateAttemptError } = await adminClient
      .schema("learning")
      .from("attempt")
      .update({
        status: "reviewed",
        score: review.overall_score
      })
      .eq("id", submission.attempt_id);

    if (updateAttemptError) {
      throw createHttpError(updateAttemptError.message, 400);
    }
  }

  return {
    submission: {
      id: Number(updatedSubmission.id),
      status: String(updatedSubmission.status || reviewStatus),
      overall_score: Number(updatedSubmission.overall_score || review.overall_score),
      reviewed_at: String(updatedSubmission.reviewed_at || reviewedAt)
    }
  };
}

async function handleUpsertBlock(
  adminClient: ReturnType<typeof createAdminClient>,
  body: Record<string, unknown>
) {
  const courseSlug = String(body.course_slug || "programa-empoderamiento-power-skills");
  const course = await resolveCourse(adminClient, courseSlug);
  if (!course) {
    throw createHttpError("Curso no encontrado", 404);
  }

  const kind = normalizeBlockKind(body.kind);
  const contract = resolveBlockContract(kind, {
    representation_variants: body.representation_variants,
    expression_variants: body.expression_variants,
    engagement_hooks: body.engagement_hooks,
    renderer_manifest: body.renderer_manifest,
    bloom_level: body.bloom_level
  });
  const rendererProps = isRecord(contract.renderer_manifest.props)
    ? contract.renderer_manifest.props
    : {};
  const requestedRubricRef = parseRendererRubricRef(contract.renderer_manifest);
  const defaultRubric = kind === "project"
    ? (await resolveCourseRubrics(adminClient, Number(course.id)))[0] || null
    : null;
  const resolvedRubric = kind === "project"
    ? await resolveCourseRubric(
        adminClient,
        Number(course.id),
        requestedRubricRef || defaultRubric?.slug || ""
      )
    : null;

  if (kind === "project") {
    contract.renderer_manifest = {
      ...contract.renderer_manifest,
      props: {
        ...rendererProps,
        rubric_id: resolvedRubric?.slug || null
      }
    };
  }

  const { data, error } = await adminClient
    .schema("catalog")
    .from("content_block")
    .upsert(
      {
        course_id: course.id,
        slug: String(body.block_slug || "nuevo-bloque"),
        title: String(body.title || "Nuevo bloque"),
        summary: toNullableString(body.summary),
        objective: toNullableString(body.objective),
        kind,
        position: toInteger(body.position, 1),
        duration_minutes: toInteger(body.duration_minutes, 15),
        is_public: toBoolean(body.is_public, false),
        representation_variants: contract.representation_variants,
        expression_variants: contract.expression_variants,
        engagement_hooks: contract.engagement_hooks,
        renderer_manifest: contract.renderer_manifest,
        bloom_level: contract.bloom_level
      },
      { onConflict: "course_id,slug" }
    )
    .select("id, slug, title")
    .single();

  if (error || !data) {
    throw createHttpError(error?.message || "No se pudo guardar el bloque", 400);
  }

  const competency = await syncPrimaryBlockCompetency(
    adminClient,
    Number(course.id),
    Number(data.id),
    body.competency_slug
  );

  return {
    block: data,
    competency,
    rubric: resolvedRubric
      ? {
          id: resolvedRubric.id,
          slug: resolvedRubric.slug,
          title: resolvedRubric.title
        }
      : null
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await resolveAdminActor(req);
    const adminClient = createAdminClient();
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "snapshot");
    const courseSlug = String(body.course_slug || "programa-empoderamiento-power-skills");

    switch (action) {
      case "snapshot":
        return jsonResponse(await handleSnapshot(adminClient, courseSlug, user.email || ""));
      case "upsert-course":
        return jsonResponse(await handleUpsertCourse(adminClient, body));
      case "upsert-rubric":
        return jsonResponse(await handleUpsertRubric(adminClient, body));
      case "upsert-run":
        return jsonResponse(await handleUpsertRun(adminClient, body));
      case "upsert-notification-template":
        return jsonResponse(await handleUpsertNotificationTemplate(adminClient, body));
      case "upsert-block":
        return jsonResponse(await handleUpsertBlock(adminClient, body));
      case "review-project-submission":
        return jsonResponse(await handleReviewProjectSubmission(adminClient, user.id, body));
      default:
        throw createHttpError("Accion no soportada", 400);
    }
  } catch (error) {
    const status = (error as { status?: number }).status || 400;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
