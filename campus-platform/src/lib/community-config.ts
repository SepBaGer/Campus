import type {
  CommunityLaunchPresentation,
  CommunityProvider,
  CommunityToolMode,
  CourseCommunitySnapshot
} from "./platform-types";

type JsonRecord = Record<string, unknown>;

export interface CommunityAuthoringModel {
  enabled: boolean;
  provider: CommunityProvider;
  title: string;
  summary: string;
  entryLabel: string;
  discussionPrompt: string;
  expectationsText: string;
  peerReviewEnabled: boolean;
  toolMode: CommunityToolMode;
  ltiTitle: string;
  loginInitiationUrl: string;
  targetLinkUri: string;
  clientId: string;
  deploymentId: string;
  resourceLinkId: string;
  launchPresentation: CommunityLaunchPresentation;
  customParametersJson: string;
}

export interface CommunityLtiConfig {
  toolMode: CommunityToolMode;
  title: string;
  clientId: string;
  deploymentId: string;
  resourceLinkId: string;
  loginInitiationUrl: string;
  targetLinkUri: string;
  launchPresentation: CommunityLaunchPresentation;
  customParameters: JsonRecord;
  isConfigured: boolean;
}

export const DEFAULT_COMMUNITY_EXPECTATIONS = [
  "Comparte un avance real con contexto y evidencia cada semana.",
  "Pide feedback con una pregunta concreta y un siguiente paso visible.",
  "Devuelve revision accionable a por lo menos dos pares de la cohorte."
];

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

function toBoolean(value: unknown, fallback = false) {
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

function toStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const cleaned = value
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);

  return cleaned.length ? cleaned : [...fallback];
}

function parseCustomParametersJson(value: FormDataEntryValue | unknown) {
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
    throw new Error("Los custom parameters de comunidad deben ser un JSON valido.");
  }
}

function resolveLaunchPresentation(value: unknown): CommunityLaunchPresentation {
  return toStringValue(value).toLowerCase() === "iframe" ? "iframe" : "window";
}

function normalizeToolMode(value: unknown): CommunityToolMode {
  const resolved = toStringValue(value).toLowerCase();
  if (resolved === "mock" || resolved === "custom") {
    return resolved;
  }

  return "none";
}

function buildSurfaceModes(peerReviewEnabled: boolean, source?: unknown) {
  const values = new Set(toStringArray(source, ["forum"]));
  values.add("forum");

  if (peerReviewEnabled) {
    values.add("peer_review");
  } else {
    values.delete("peer_review");
  }

  return Array.from(values);
}

function parseExpectations(value: FormDataEntryValue | unknown) {
  if (typeof value !== "string") {
    return [...DEFAULT_COMMUNITY_EXPECTATIONS];
  }

  const parsed = value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);

  return parsed.length ? parsed : [...DEFAULT_COMMUNITY_EXPECTATIONS];
}

export function createDefaultCommunityManifest(runTitle = "Cohorte abierta") {
  return {
    enabled: false,
    provider: "discourse",
    title: `Comunidad ${runTitle}`.trim(),
    summary: "Foro privado de cohorte para preguntas, avances y peer-review con evidencia.",
    entry_label: "Abrir comunidad de cohorte",
    discussion_prompt: "Comparte un avance aplicable esta semana y pide una retroalimentacion concreta.",
    peer_review_enabled: true,
    surface_modes: ["forum", "peer_review"],
    expectations: [...DEFAULT_COMMUNITY_EXPECTATIONS],
    lti: {
      tool_mode: null,
      title: "Discourse de cohorte",
      login_initiation_url: null,
      target_link_uri: null,
      client_id: null,
      deployment_id: null,
      resource_link_id: null,
      launch_presentation: "window",
      custom_parameters: {
        provider: "discourse",
        surface: "community"
      }
    }
  } satisfies JsonRecord;
}

export function resolveCommunityLtiConfig(communityManifest: unknown): CommunityLtiConfig {
  const manifest = isRecord(communityManifest) ? communityManifest : {};
  const lti = isRecord(manifest.lti) ? manifest.lti : {};
  const toolMode = normalizeToolMode(lti.tool_mode);
  const title = toStringValue(lti.title) || toStringValue(manifest.title) || "Comunidad de cohorte";
  const clientId = toStringValue(lti.client_id);
  const deploymentId = toStringValue(lti.deployment_id);
  const resourceLinkId = toStringValue(lti.resource_link_id);
  const loginInitiationUrl = toStringValue(lti.login_initiation_url);
  const targetLinkUri = toStringValue(lti.target_link_uri);
  const launchPresentation = resolveLaunchPresentation(lti.launch_presentation);
  const customParameters = isRecord(lti.custom_parameters) ? lti.custom_parameters : {};

  const isConfigured = toolMode === "mock"
    ? Boolean(clientId && deploymentId && resourceLinkId)
    : toolMode === "custom"
      ? Boolean(clientId && deploymentId && resourceLinkId && loginInitiationUrl && targetLinkUri)
      : false;

  return {
    toolMode,
    title,
    clientId,
    deploymentId,
    resourceLinkId,
    loginInitiationUrl,
    targetLinkUri,
    launchPresentation,
    customParameters,
    isConfigured
  };
}

export function resolveCommunitySnapshot(
  run: {
    id?: number | null;
    slug?: string | null;
    title?: string | null;
  },
  communityManifest: unknown
): CourseCommunitySnapshot | null {
  const manifest = isRecord(communityManifest)
    ? communityManifest
    : createDefaultCommunityManifest(toStringValue(run.title) || "Cohorte abierta");
  const enabled = toBoolean(manifest.enabled, false);
  const title = toStringValue(manifest.title);
  const summary = toStringValue(manifest.summary);
  const hasSignal = enabled || title || summary;

  if (!hasSignal) {
    return null;
  }

  const peerReviewEnabled = toBoolean(
    manifest.peer_review_enabled,
    toStringArray(manifest.surface_modes, ["forum"]).includes("peer_review")
  );
  const launchConfig = resolveCommunityLtiConfig(manifest);

  return {
    runId: typeof run.id === "number" ? run.id : null,
    runSlug: toStringValue(run.slug),
    runTitle: toStringValue(run.title),
    enabled,
    provider: "discourse",
    title: title || "Comunidad de cohorte",
    summary: summary || "Espacio de cohorte para conversacion guiada y retroalimentacion entre pares.",
    entryLabel: toStringValue(manifest.entry_label) || "Abrir comunidad de cohorte",
    discussionPrompt: toStringValue(manifest.discussion_prompt)
      || "Comparte tu avance de la semana y pide una retroalimentacion concreta.",
    peerReviewEnabled,
    surfaceModes: buildSurfaceModes(peerReviewEnabled, manifest.surface_modes),
    expectations: toStringArray(manifest.expectations, DEFAULT_COMMUNITY_EXPECTATIONS),
    toolMode: launchConfig.toolMode,
    ltiTitle: launchConfig.title,
    launchPresentation: launchConfig.launchPresentation,
    launchReady: enabled && launchConfig.isConfigured
  };
}

export function resolveCommunityAuthoringModel(
  communityManifest: unknown,
  runSlug = "power-skills-pilot-open",
  runTitle = "Cohorte abierta"
): CommunityAuthoringModel {
  const manifest = isRecord(communityManifest)
    ? communityManifest
    : createDefaultCommunityManifest(runTitle);
  const peerReviewEnabled = toBoolean(
    manifest.peer_review_enabled,
    toStringArray(manifest.surface_modes, ["forum"]).includes("peer_review")
  );
  const ltiConfig = resolveCommunityLtiConfig(manifest);

  return {
    enabled: toBoolean(manifest.enabled, false),
    provider: "discourse",
    title: toStringValue(manifest.title) || `Comunidad ${runTitle}`.trim(),
    summary: toStringValue(manifest.summary)
      || `Foro privado de ${runTitle} para preguntas, avances y peer-review.`,
    entryLabel: toStringValue(manifest.entry_label) || "Abrir comunidad de cohorte",
    discussionPrompt: toStringValue(manifest.discussion_prompt)
      || `Presentate en ${runSlug} con un reto real y una meta visible para esta semana.`,
    expectationsText: toStringArray(manifest.expectations, DEFAULT_COMMUNITY_EXPECTATIONS).join("\n"),
    peerReviewEnabled,
    toolMode: ltiConfig.toolMode,
    ltiTitle: ltiConfig.title,
    loginInitiationUrl: ltiConfig.loginInitiationUrl,
    targetLinkUri: ltiConfig.targetLinkUri,
    clientId: ltiConfig.clientId,
    deploymentId: ltiConfig.deploymentId,
    resourceLinkId: ltiConfig.resourceLinkId,
    launchPresentation: ltiConfig.launchPresentation,
    customParametersJson: JSON.stringify(ltiConfig.customParameters, null, 2)
  };
}

export function buildCommunityManifestFromForm(
  formData: FormData,
  fallbackRunTitle = "Cohorte abierta"
) {
  const enabled = toBoolean(formData.get("community_enabled"), false);
  const peerReviewEnabled = toBoolean(formData.get("community_peer_review_enabled"), true);
  const toolMode = normalizeToolMode(formData.get("community_lti_tool_mode"));
  const customParameters = parseCustomParametersJson(formData.get("community_lti_custom_parameters_json"));

  return {
    enabled,
    provider: "discourse",
    title: toStringValue(formData.get("community_title")) || `Comunidad ${fallbackRunTitle}`.trim(),
    summary: toStringValue(formData.get("community_summary"))
      || "Foro privado de cohorte para preguntas, avances y peer-review con evidencia.",
    entry_label: toStringValue(formData.get("community_entry_label")) || "Abrir comunidad de cohorte",
    discussion_prompt: toStringValue(formData.get("community_discussion_prompt"))
      || "Comparte un avance aplicable esta semana y pide una retroalimentacion concreta.",
    peer_review_enabled: peerReviewEnabled,
    surface_modes: buildSurfaceModes(peerReviewEnabled),
    expectations: parseExpectations(formData.get("community_expectations")),
    lti: {
      tool_mode: toolMode === "none" ? null : toolMode,
      title: toStringValue(formData.get("community_lti_title")) || "Discourse de cohorte",
      login_initiation_url: toolMode === "custom"
        ? toNullableString(formData.get("community_lti_login_initiation_url"))
        : null,
      target_link_uri: toolMode === "custom"
        ? toNullableString(formData.get("community_lti_target_link_uri"))
        : null,
      client_id: toNullableString(formData.get("community_lti_client_id")),
      deployment_id: toNullableString(formData.get("community_lti_deployment_id")),
      resource_link_id: toNullableString(formData.get("community_lti_resource_link_id")),
      launch_presentation: resolveLaunchPresentation(formData.get("community_lti_launch_presentation")),
      custom_parameters: customParameters
    }
  } satisfies JsonRecord;
}
