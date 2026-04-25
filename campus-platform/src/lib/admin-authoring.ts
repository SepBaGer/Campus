import { getDefaultBlockCatalogContract, normalizeBlockKind } from "./block-profile";
import type { CanonicalBlockKind, ExpressionVariants, RendererManifest } from "./platform-types";

type JsonRecord = Record<string, unknown>;

export interface RendererManifestAuthoringModel {
  component: string;
  offlineCapable: boolean;
  a11yRole: string;
  ariaLabel: string;
  video: {
    src: string;
    transcriptUrl: string;
    durationSeconds: number;
  };
  quiz: {
    questionsJson: string;
    passingScore: number;
    timeLimitSeconds: number;
  };
  reading: {
    markdown: string;
    estimatedMinutes: number;
    readingLevel: string;
  };
  interactive: {
    toolMode: "none" | "mock" | "custom";
    title: string;
    ltiLaunchUrl: string;
    loginInitiationUrl: string;
    targetLinkUri: string;
    clientId: string;
    deploymentId: string;
    resourceLinkId: string;
    launchPresentation: "iframe" | "window";
    customParametersJson: string;
    h5pContentId: string;
  };
  project: {
    briefMarkdown: string;
    submissionFormat: string;
    rubricId: string;
  };
}

export interface ExpressionVariantsAuthoringModel {
  acceptedFormats: string[];
  assistiveTechHints: string[];
  voiceDictationEnabled: boolean;
}

export interface AdminBlockPayloadOptions {
  kind?: string | null;
  durationMinutes?: number;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNullableString(value: unknown) {
  const resolved = toStringValue(value);
  return resolved || null;
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

function toInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

function toBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }

    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
  }

  return fallback;
}

function getFormValue(formData: FormData, key: string) {
  return formData.get(key);
}

function parseJsonRecord(value: FormDataEntryValue | unknown, field: string): JsonRecord {
  if (typeof value !== "string") {
    return {};
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!isRecord(parsed)) {
      throw new Error("Expected JSON object");
    }

    return parsed;
  } catch {
    throw new Error(`El campo ${field} debe ser un JSON valido.`);
  }
}

function parseQuestionsJson(value: FormDataEntryValue | unknown) {
  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      throw new Error("Expected JSON array");
    }

    return parsed;
  } catch {
    throw new Error("Las preguntas del quiz deben ser un arreglo JSON valido.");
  }
}

function parseJsonRecordOrEmpty(value: FormDataEntryValue | unknown, field: string) {
  const parsed = parseJsonRecord(value, field);
  return isRecord(parsed) ? parsed : {};
}

function mergeExpressionVariants(
  kind: CanonicalBlockKind,
  currentExpressionVariants: unknown
): ExpressionVariants {
  const defaults = getDefaultBlockCatalogContract(kind).expressionVariants;
  const current = isRecord(currentExpressionVariants) ? currentExpressionVariants : {};

  return {
    accepted_formats: toStringArray(current.accepted_formats, defaults.accepted_formats),
    time_extension_pct: toInteger(current.time_extension_pct, defaults.time_extension_pct),
    assistive_tech_hints: toStringArray(
      current.assistive_tech_hints,
      defaults.assistive_tech_hints
    )
  };
}

function setTokenEnabled(values: string[], token: string, enabled: boolean) {
  const nextValues = values.filter((entry) => entry !== token);
  return enabled ? [...nextValues, token] : nextValues;
}

function resolveCanonicalKind(kind: string | null | undefined): CanonicalBlockKind {
  return normalizeBlockKind(kind);
}

function mergeRendererManifest(
  kind: CanonicalBlockKind,
  currentManifest: unknown
): RendererManifest {
  const defaults = getDefaultBlockCatalogContract(kind).rendererManifest;
  const current = isRecord(currentManifest) ? currentManifest : {};
  const defaultProps = isRecord(defaults.props) ? cloneJson(defaults.props) : {};
  const currentProps = isRecord(current.props) ? cloneJson(current.props) : {};
  const defaultA11y = isRecord(defaults.a11y) ? cloneJson(defaults.a11y) : {};
  const currentA11y = isRecord(current.a11y) ? cloneJson(current.a11y) : {};
  const defaultKeyboardMap = isRecord(defaultA11y.keyboard_map) ? defaultA11y.keyboard_map : {};
  const currentKeyboardMap = isRecord(currentA11y.keyboard_map) ? currentA11y.keyboard_map : {};

  return {
    ...(cloneJson(defaults) as RendererManifest),
    ...(cloneJson(current) as Partial<RendererManifest>),
    component: toStringValue(current.component) || defaults.component,
    props: {
      ...defaultProps,
      ...currentProps
    },
    a11y: {
      ...defaultA11y,
      ...currentA11y,
      keyboard_map: {
        ...defaultKeyboardMap,
        ...currentKeyboardMap
      } as Record<string, string>
    },
    offline_capable: toBoolean(current.offline_capable, defaults.offline_capable)
  };
}

export function resolveRendererManifestAuthoringModel(
  kindInput: string | null | undefined,
  rendererManifest: unknown,
  defaultDurationMinutes = 15
): RendererManifestAuthoringModel {
  const kind = resolveCanonicalKind(kindInput);
  const manifest = mergeRendererManifest(kind, rendererManifest);
  const props = isRecord(manifest.props) ? manifest.props : {};
  const a11y = isRecord(manifest.a11y) ? manifest.a11y : {};
  const fallbackSeconds = Math.max(300, defaultDurationMinutes * 60);

  return {
    component: toStringValue(manifest.component),
    offlineCapable: toBoolean(manifest.offline_capable, false),
    a11yRole: toStringValue(a11y.role),
    ariaLabel: toStringValue(a11y.aria_label),
    video: {
      src: toStringValue(props.src),
      transcriptUrl: toStringValue(props.transcript_url),
      durationSeconds: toInteger(props.duration_s, fallbackSeconds)
    },
    quiz: {
      questionsJson: JSON.stringify(Array.isArray(props.questions) ? props.questions : [], null, 2),
      passingScore: toInteger(props.passing_score, 80),
      timeLimitSeconds: toInteger(props.time_limit_s, fallbackSeconds)
    },
    reading: {
      markdown: toStringValue(props.markdown),
      estimatedMinutes: toInteger(props.estimated_minutes, defaultDurationMinutes),
      readingLevel: toStringValue(props.reading_level) || "B1"
    },
    interactive: {
      toolMode: toStringValue(props.lti_tool_mode) === "mock"
        ? "mock"
        : toStringValue(props.lti_tool_mode) === "custom"
          ? "custom"
          : (toStringValue(props.lti_login_initiation_url)
            || toStringValue(props.lti_target_link_uri)
            || toStringValue(props.lti_launch_url)
            || toStringValue(props.lti_client_id)
            || toStringValue(props.lti_deployment_id)
            || toStringValue(props.lti_resource_link_id))
            ? "custom"
            : "none",
      title: toStringValue(props.lti_title),
      ltiLaunchUrl: toStringValue(props.lti_launch_url),
      loginInitiationUrl: toStringValue(props.lti_login_initiation_url),
      targetLinkUri: toStringValue(props.lti_target_link_uri) || toStringValue(props.lti_launch_url),
      clientId: toStringValue(props.lti_client_id) || toStringValue(props.client_id),
      deploymentId: toStringValue(props.lti_deployment_id),
      resourceLinkId: toStringValue(props.lti_resource_link_id),
      launchPresentation: toStringValue(props.lti_launch_presentation).toLowerCase() === "iframe"
        ? "iframe"
        : "window",
      customParametersJson: JSON.stringify(
        isRecord(props.lti_custom_parameters) ? props.lti_custom_parameters : {},
        null,
        2
      ),
      h5pContentId: toStringValue(props.h5p_content_id)
    },
    project: {
      briefMarkdown: toStringValue(props.brief_md),
      submissionFormat: toStringValue(props.submission_format) || "text",
      rubricId: toStringValue(props.rubric_id)
    }
  };
}

export function resolveExpressionVariantsAuthoringModel(
  kindInput: string | null | undefined,
  expressionVariants: unknown
): ExpressionVariantsAuthoringModel {
  const kind = resolveCanonicalKind(kindInput);
  const variants = mergeExpressionVariants(kind, expressionVariants);

  return {
    acceptedFormats: variants.accepted_formats,
    assistiveTechHints: variants.assistive_tech_hints,
    voiceDictationEnabled: variants.assistive_tech_hints.includes("voice_dictation")
  };
}

export function buildRendererManifestFromForm(
  formData: FormData,
  options: AdminBlockPayloadOptions = {}
) {
  const kind = resolveCanonicalKind(options.kind || getFormValue(formData, "kind")?.toString());
  const defaultDurationMinutes = options.durationMinutes ?? toInteger(getFormValue(formData, "duration_minutes"), 15);
  const rawManifest = parseJsonRecord(getFormValue(formData, "renderer_manifest"), "renderer_manifest");
  const manifest = mergeRendererManifest(kind, rawManifest);
  const props = isRecord(manifest.props) ? cloneJson(manifest.props) : {};

  manifest.component = toStringValue(getFormValue(formData, "renderer_component")) || manifest.component;
  manifest.offline_capable = toBoolean(
    getFormValue(formData, "renderer_offline_capable"),
    manifest.offline_capable
  );
  manifest.a11y = {
    ...manifest.a11y,
    role: toStringValue(getFormValue(formData, "renderer_role")) || manifest.a11y.role,
    aria_label: toStringValue(getFormValue(formData, "renderer_aria_label")) || manifest.a11y.aria_label,
    keyboard_map: isRecord(manifest.a11y.keyboard_map) ? manifest.a11y.keyboard_map : {}
  };

  switch (kind) {
    case "video":
      props.src = toNullableString(getFormValue(formData, "video_src"));
      props.transcript_url = toNullableString(getFormValue(formData, "video_transcript_url"));
      props.duration_s = toInteger(getFormValue(formData, "video_duration_s"), defaultDurationMinutes * 60);
      break;
    case "quiz":
      props.questions = parseQuestionsJson(getFormValue(formData, "quiz_questions_json"));
      props.passing_score = toInteger(getFormValue(formData, "quiz_passing_score"), 80);
      props.time_limit_s = toInteger(getFormValue(formData, "quiz_time_limit_s"), defaultDurationMinutes * 60);
      break;
    case "interactive":
      props.lti_tool_mode = toStringValue(getFormValue(formData, "interactive_lti_tool_mode")) || null;
      props.lti_title = toNullableString(getFormValue(formData, "interactive_lti_title"));
      props.lti_login_initiation_url = toNullableString(
        getFormValue(formData, "interactive_lti_login_initiation_url")
      );
      props.lti_target_link_uri = toNullableString(getFormValue(formData, "interactive_lti_target_link_uri"));
      props.lti_launch_url = toNullableString(getFormValue(formData, "interactive_lti_target_link_uri"));
      props.lti_client_id = toNullableString(getFormValue(formData, "interactive_lti_client_id"));
      props.client_id = props.lti_client_id;
      props.lti_deployment_id = toNullableString(getFormValue(formData, "interactive_lti_deployment_id"));
      props.lti_resource_link_id = toNullableString(getFormValue(formData, "interactive_lti_resource_link_id"));
      props.lti_launch_presentation = toStringValue(
        getFormValue(formData, "interactive_lti_launch_presentation")
      ) === "iframe"
        ? "iframe"
        : "window";
      props.lti_custom_parameters = parseJsonRecordOrEmpty(
        getFormValue(formData, "interactive_lti_custom_parameters_json"),
        "interactive_lti_custom_parameters_json"
      );
      props.h5p_content_id = toNullableString(getFormValue(formData, "interactive_h5p_content_id"));
      break;
    case "project":
      props.brief_md = toNullableString(getFormValue(formData, "project_brief_md"));
      props.submission_format = toStringValue(getFormValue(formData, "project_submission_format")) || "text";
      props.rubric_id = toNullableString(getFormValue(formData, "project_rubric_id"));
      break;
    case "reading":
    default:
      props.markdown = toNullableString(getFormValue(formData, "reading_markdown"));
      props.estimated_minutes = toInteger(
        getFormValue(formData, "reading_estimated_minutes"),
        defaultDurationMinutes
      );
      props.reading_level = toStringValue(getFormValue(formData, "reading_level")) || "B1";
      break;
  }

  manifest.props = props;
  return manifest;
}

export function buildExpressionVariantsFromForm(
  formData: FormData,
  options: AdminBlockPayloadOptions = {}
) {
  const kind = resolveCanonicalKind(options.kind || getFormValue(formData, "kind")?.toString());
  const rawVariants = parseJsonRecord(getFormValue(formData, "expression_variants"), "expression_variants");
  const variants = mergeExpressionVariants(kind, rawVariants);
  const voiceDictationEnabled = toBoolean(
    getFormValue(formData, "assistive_voice_dictation"),
    variants.assistive_tech_hints.includes("voice_dictation")
  );

  variants.assistive_tech_hints = setTokenEnabled(
    variants.assistive_tech_hints,
    "voice_dictation",
    voiceDictationEnabled
  );

  return variants;
}

export function buildAdminBlockPayload(formData: FormData, options: AdminBlockPayloadOptions = {}) {
  const rawPayload = Object.fromEntries(formData.entries());
  const { assistive_voice_dictation: _assistiveVoiceDictation, ...payload } = rawPayload;
  const kind = resolveCanonicalKind(String(rawPayload.kind || options.kind || "reading"));
  const manifest = buildRendererManifestFromForm(formData, { ...options, kind });
  const expressionVariants = buildExpressionVariantsFromForm(formData, { ...options, kind });

  return {
    ...payload,
    kind,
    expression_variants: JSON.stringify(expressionVariants),
    renderer_manifest: JSON.stringify(manifest)
  };
}
