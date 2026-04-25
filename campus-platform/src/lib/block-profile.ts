import type {
  BloomLevel,
  CanonicalBlockKind,
  EngagementHooks,
  ExpressionVariants,
  RendererManifest,
  RepresentationVariants
} from "./platform-types";

export interface BlockExperienceProfile {
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
}

export interface BlockDuaContract {
  representationVariants: RepresentationVariants;
  expressionVariants: ExpressionVariants;
  engagementHooks: EngagementHooks;
}

export interface BlockCatalogContract extends BlockDuaContract {
  rendererManifest: RendererManifest;
  bloomLevel: BloomLevel;
}

const LEGACY_KIND_MAP: Record<string, CanonicalBlockKind> = {
  lesson: "reading",
  resource: "reading",
  workshop: "interactive",
  practice: "quiz",
  milestone: "project",
  video: "video",
  quiz: "quiz",
  reading: "reading",
  interactive: "interactive",
  project: "project"
};

const DISPLAY_TOKEN_MAP: Record<string, string> = {
  text: "Texto semantico",
  audio: "Audio explicativo",
  video_caption: "Video con subtitulos",
  diagram: "Diagrama guiado",
  guided_demo: "Demo guiada",
  keyboard_navigation: "Navegacion por teclado",
  rubric: "Rubrica visible",
  worked_example: "Ejemplo resuelto",
  simplified_text: "Version simplificada",
  audio_upload: "Audio grabado",
  video_upload: "Video breve",
  drawing: "Dibujo / esquema",
  voice_dictation: "Dictado por voz",
  pick_scenario: "Elegir escenario",
  select_depth: "Elegir profundidad",
  choose_retry_path: "Elegir reintento",
  choose_submission_format: "Elegir formato de entrega"
};

const BLOOM_LABEL_MAP: Record<BloomLevel, string> = {
  recordar: "Recordar",
  comprender: "Comprender",
  aplicar: "Aplicar",
  analizar: "Analizar",
  evaluar: "Evaluar",
  crear: "Crear"
};

export function getBloomLabel(value: BloomLevel) {
  return BLOOM_LABEL_MAP[value];
}

const DEFAULT_BLOCK_CONTRACT_BY_KIND: Record<CanonicalBlockKind, BlockCatalogContract> = {
  video: {
    representationVariants: {
      modes: ["text", "audio", "video_caption"],
      contrast_ratio_min: 4.5,
      alt_text: "Resumen accesible del bloque de video",
      transcript_url: null,
      simplified_version_url: null,
      reading_level: "B1"
    },
    expressionVariants: {
      accepted_formats: ["text", "audio_upload"],
      time_extension_pct: 25,
      assistive_tech_hints: ["screen_reader_friendly", "keyboard_only", "voice_dictation"]
    },
    engagementHooks: {
      choice_points: ["pick_scenario", "select_depth"],
      goal_relevance_prompt: "Como aplicaras este video en tu operacion esta semana?",
      feedback_cadence: "per_attempt",
      collaboration_mode: "optional_peer_review"
    },
    rendererManifest: {
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
    bloomLevel: "comprender"
  },
  quiz: {
    representationVariants: {
      modes: ["text", "audio", "diagram"],
      contrast_ratio_min: 4.5,
      alt_text: "Mapa accesible del bloque de quiz",
      transcript_url: null,
      simplified_version_url: null,
      reading_level: "B1"
    },
    expressionVariants: {
      accepted_formats: ["text", "audio_upload"],
      time_extension_pct: 25,
      assistive_tech_hints: ["screen_reader_friendly", "keyboard_only", "voice_dictation"]
    },
    engagementHooks: {
      choice_points: ["pick_scenario", "choose_retry_path"],
      goal_relevance_prompt: "Que decision concreta quieres validar con este quiz?",
      feedback_cadence: "per_attempt",
      collaboration_mode: "solo_reflection"
    },
    rendererManifest: {
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
    bloomLevel: "aplicar"
  },
  reading: {
    representationVariants: {
      modes: ["text", "audio", "simplified_text"],
      contrast_ratio_min: 4.5,
      alt_text: "Resumen accesible de la lectura",
      transcript_url: null,
      simplified_version_url: null,
      reading_level: "B1"
    },
    expressionVariants: {
      accepted_formats: ["text", "audio_upload"],
      time_extension_pct: 25,
      assistive_tech_hints: ["screen_reader_friendly", "keyboard_only", "voice_dictation"]
    },
    engagementHooks: {
      choice_points: ["pick_scenario", "select_depth"],
      goal_relevance_prompt: "Como conectas esta lectura con tu rol actual?",
      feedback_cadence: "reflection_prompt",
      collaboration_mode: "solo_reflection"
    },
    rendererManifest: {
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
    bloomLevel: "comprender"
  },
  interactive: {
    representationVariants: {
      modes: ["text", "guided_demo", "keyboard_navigation"],
      contrast_ratio_min: 4.5,
      alt_text: "Guia accesible de la practica interactiva",
      transcript_url: null,
      simplified_version_url: null,
      reading_level: "B1"
    },
    expressionVariants: {
      accepted_formats: ["text", "drawing"],
      time_extension_pct: 25,
      assistive_tech_hints: ["keyboard_only", "step_by_step_prompting", "voice_dictation"]
    },
    engagementHooks: {
      choice_points: ["pick_scenario", "select_depth"],
      goal_relevance_prompt: "Que ruta refleja mejor tu contexto real de trabajo?",
      feedback_cadence: "guided_steps",
      collaboration_mode: "optional_peer_review"
    },
    rendererManifest: {
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
    bloomLevel: "analizar"
  },
  project: {
    representationVariants: {
      modes: ["text", "rubric", "worked_example"],
      contrast_ratio_min: 4.5,
      alt_text: "Brief accesible del proyecto",
      transcript_url: null,
      simplified_version_url: null,
      reading_level: "B1"
    },
    expressionVariants: {
      accepted_formats: ["text", "video_upload", "drawing"],
      time_extension_pct: 25,
      assistive_tech_hints: ["screen_reader_friendly", "keyboard_only", "voice_dictation"]
    },
    engagementHooks: {
      choice_points: ["select_depth", "choose_submission_format"],
      goal_relevance_prompt: "Que evidencia concreta demostrara el cambio logrado?",
      feedback_cadence: "milestone_based",
      collaboration_mode: "optional_peer_review"
    },
    rendererManifest: {
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
    bloomLevel: "crear"
  }
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const cleaned = value
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);

  return cleaned.length ? cleaned : [...fallback];
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStringValue(value: unknown, fallback: string) {
  const resolved = typeof value === "string" ? value.trim() : "";
  return resolved || fallback;
}

function toNullableString(value: unknown, fallback: string | null) {
  if (value === null) {
    return null;
  }

  const resolved = typeof value === "string" ? value.trim() : "";
  return resolved || fallback;
}

function toBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true" || value === "1" || value === "yes";
  }

  return fallback;
}

function humanizeToken(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    return "";
  }

  if (normalized in DISPLAY_TOKEN_MAP) {
    return DISPLAY_TOKEN_MAP[normalized];
  }

  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getKindLabel(kind: CanonicalBlockKind) {
  switch (kind) {
    case "video":
      return "Video guiado";
    case "quiz":
      return "Quiz aplicado";
    case "interactive":
      return "Practica interactiva";
    case "project":
      return "Proyecto / hito";
    case "reading":
    default:
      return "Lectura operativa";
  }
}

function normalizeBloomLevel(value: unknown, fallback: BloomLevel): BloomLevel {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (
    normalized === "recordar" ||
    normalized === "comprender" ||
    normalized === "aplicar" ||
    normalized === "analizar" ||
    normalized === "evaluar" ||
    normalized === "crear"
  ) {
    return normalized;
  }

  return fallback;
}

export function normalizeBlockKind(value: string | null | undefined): CanonicalBlockKind {
  const normalized = String(value || "").trim().toLowerCase();
  return LEGACY_KIND_MAP[normalized] || "reading";
}

export function getDefaultBlockCatalogContract(value: string | null | undefined): BlockCatalogContract {
  const kind = normalizeBlockKind(value);
  return cloneJson(DEFAULT_BLOCK_CONTRACT_BY_KIND[kind]);
}

export function getDefaultBlockDuaContract(value: string | null | undefined): BlockDuaContract {
  const defaults = getDefaultBlockCatalogContract(value);
  return {
    representationVariants: defaults.representationVariants,
    expressionVariants: defaults.expressionVariants,
    engagementHooks: defaults.engagementHooks
  };
}

export function resolveBlockCatalogContract(
  value: string | null | undefined,
  overrides?: {
    representationVariants?: unknown;
    expressionVariants?: unknown;
    engagementHooks?: unknown;
    rendererManifest?: unknown;
    bloomLevel?: unknown;
  }
): BlockCatalogContract {
  const defaults = getDefaultBlockCatalogContract(value);
  const representation = isRecord(overrides?.representationVariants) ? overrides?.representationVariants : {};
  const expression = isRecord(overrides?.expressionVariants) ? overrides?.expressionVariants : {};
  const engagement = isRecord(overrides?.engagementHooks) ? overrides?.engagementHooks : {};
  const rendererManifest = isRecord(overrides?.rendererManifest) ? overrides?.rendererManifest : {};
  const rendererProps = isRecord(rendererManifest.props) ? rendererManifest.props : defaults.rendererManifest.props;
  const rendererA11y = isRecord(rendererManifest.a11y) ? rendererManifest.a11y : {};
  const rendererKeyboardMap = isRecord(rendererA11y.keyboard_map)
    ? rendererA11y.keyboard_map
    : defaults.rendererManifest.a11y.keyboard_map || {};

  return {
    representationVariants: {
      modes: toStringArray(representation.modes, defaults.representationVariants.modes),
      contrast_ratio_min: toNumber(
        representation.contrast_ratio_min,
        defaults.representationVariants.contrast_ratio_min
      ),
      alt_text: toStringValue(representation.alt_text, defaults.representationVariants.alt_text),
      transcript_url: toNullableString(
        representation.transcript_url,
        defaults.representationVariants.transcript_url
      ),
      simplified_version_url: toNullableString(
        representation.simplified_version_url,
        defaults.representationVariants.simplified_version_url
      ),
      reading_level: toStringValue(
        representation.reading_level,
        defaults.representationVariants.reading_level
      )
    },
    expressionVariants: {
      accepted_formats: toStringArray(
        expression.accepted_formats,
        defaults.expressionVariants.accepted_formats
      ),
      time_extension_pct: toNumber(
        expression.time_extension_pct,
        defaults.expressionVariants.time_extension_pct
      ),
      assistive_tech_hints: toStringArray(
        expression.assistive_tech_hints,
        defaults.expressionVariants.assistive_tech_hints
      )
    },
    engagementHooks: {
      choice_points: toStringArray(engagement.choice_points, defaults.engagementHooks.choice_points),
      goal_relevance_prompt: toStringValue(
        engagement.goal_relevance_prompt,
        defaults.engagementHooks.goal_relevance_prompt
      ),
      feedback_cadence: toStringValue(
        engagement.feedback_cadence,
        defaults.engagementHooks.feedback_cadence
      ),
      collaboration_mode: toStringValue(
        engagement.collaboration_mode,
        defaults.engagementHooks.collaboration_mode
      )
    },
    rendererManifest: {
      component: toStringValue(rendererManifest.component, defaults.rendererManifest.component),
      props: cloneJson(rendererProps),
      a11y: {
        role: toStringValue(rendererA11y.role, defaults.rendererManifest.a11y.role || ""),
        aria_label: toStringValue(
          rendererA11y.aria_label,
          defaults.rendererManifest.a11y.aria_label || ""
        ),
        keyboard_map: cloneJson(rendererKeyboardMap as Record<string, string>)
      },
      offline_capable: toBoolean(
        rendererManifest.offline_capable,
        defaults.rendererManifest.offline_capable
      )
    },
    bloomLevel: normalizeBloomLevel(overrides?.bloomLevel, defaults.bloomLevel)
  };
}

export function resolveBlockDuaContract(
  value: string | null | undefined,
  overrides?: {
    representationVariants?: unknown;
    expressionVariants?: unknown;
    engagementHooks?: unknown;
  }
): BlockDuaContract {
  const contract = resolveBlockCatalogContract(value, overrides);

  return {
    representationVariants: contract.representationVariants,
    expressionVariants: contract.expressionVariants,
    engagementHooks: contract.engagementHooks
  };
}

export function getBlockExperienceProfile(
  value: string | null | undefined,
  overrides?: {
    representationVariants?: unknown;
    expressionVariants?: unknown;
    engagementHooks?: unknown;
    rendererManifest?: unknown;
    bloomLevel?: unknown;
  }
): BlockExperienceProfile {
  const kind = normalizeBlockKind(value);
  const contract = resolveBlockCatalogContract(kind, overrides);

  return {
    kind,
    kindLabel: getKindLabel(kind),
    rendererLabel: contract.rendererManifest.component,
    rendererManifest: contract.rendererManifest,
    representationModes: contract.representationVariants.modes.map(humanizeToken),
    expressionFormats: contract.expressionVariants.accepted_formats.map(humanizeToken),
    assistiveTechHints: contract.expressionVariants.assistive_tech_hints.map(humanizeToken),
    voiceDictationEnabled: contract.expressionVariants.assistive_tech_hints.includes("voice_dictation"),
    engagementHooks: contract.engagementHooks.choice_points.map(humanizeToken),
    bloomLevel: contract.bloomLevel,
    bloomLabel: getBloomLabel(contract.bloomLevel)
  };
}
