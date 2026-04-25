import { createHttpError } from "./http.ts";
import {
  getLtiPlatformRuntime,
  normalizeNullableString,
  resolveCustomParameters,
  resolveDocumentTarget,
  type LtiToolConfig
} from "./lti.ts";

type JsonRecord = Record<string, unknown>;

const DEFAULT_COMMUNITY_EXPECTATIONS = [
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

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no") return false;
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

function parseJsonRecord(value: unknown, field: string) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (!isRecord(parsed)) {
        throw new Error("Expected JSON object");
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

function normalizeToolMode(value: unknown) {
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

export function defaultCourseRunCommunityManifest(runTitle = "Cohorte abierta") {
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

export function parseCourseRunCommunityManifest(value: unknown, runTitle = "Cohorte abierta") {
  const defaults = defaultCourseRunCommunityManifest(runTitle);
  const manifest = parseJsonRecord(value, "community_manifest") || defaults;
  const peerReviewEnabled = toBoolean(
    manifest.peer_review_enabled,
    toStringArray(manifest.surface_modes, ["forum"]).includes("peer_review")
  );
  const lti = isRecord(manifest.lti) ? manifest.lti : {};
  const toolMode = normalizeToolMode(lti.tool_mode);

  return {
    enabled: toBoolean(manifest.enabled, false),
    provider: "discourse",
    title: toStringValue(manifest.title) || toStringValue(defaults.title),
    summary: toStringValue(manifest.summary) || toStringValue(defaults.summary),
    entry_label: toStringValue(manifest.entry_label) || toStringValue(defaults.entry_label),
    discussion_prompt: toStringValue(manifest.discussion_prompt) || toStringValue(defaults.discussion_prompt),
    peer_review_enabled: peerReviewEnabled,
    surface_modes: buildSurfaceModes(peerReviewEnabled, manifest.surface_modes),
    expectations: toStringArray(manifest.expectations, DEFAULT_COMMUNITY_EXPECTATIONS),
    lti: {
      tool_mode: toolMode === "none" ? null : toolMode,
      title: toStringValue(lti.title) || toStringValue((defaults.lti as JsonRecord).title),
      login_initiation_url: toolMode === "custom"
        ? normalizeNullableString(lti.login_initiation_url)
        : null,
      target_link_uri: toolMode === "custom"
        ? normalizeNullableString(lti.target_link_uri)
        : null,
      client_id: normalizeNullableString(lti.client_id),
      deployment_id: normalizeNullableString(lti.deployment_id),
      resource_link_id: normalizeNullableString(lti.resource_link_id),
      launch_presentation: resolveDocumentTarget(lti.launch_presentation),
      custom_parameters: resolveCustomParameters(lti.custom_parameters)
    }
  } satisfies JsonRecord;
}

export function resolveCourseRunCommunityToolConfig(communityManifest: unknown): LtiToolConfig | null {
  const runtime = getLtiPlatformRuntime();
  const manifest = isRecord(communityManifest) ? communityManifest : {};
  if (!toBoolean(manifest.enabled, false)) {
    return null;
  }

  const lti = isRecord(manifest.lti) ? manifest.lti : {};
  const toolMode = normalizeToolMode(lti.tool_mode);
  const title = toStringValue(lti.title) || toStringValue(manifest.title) || "Discourse de cohorte";
  const clientId = toStringValue(lti.client_id);
  const deploymentId = toStringValue(lti.deployment_id);
  const resourceLinkId = toStringValue(lti.resource_link_id);
  const launchPresentation = resolveDocumentTarget(lti.launch_presentation);
  const customParameters = {
    provider: "discourse",
    surface: "community",
    ...resolveCustomParameters(lti.custom_parameters)
  };

  if (toolMode === "mock" && clientId && deploymentId && resourceLinkId) {
    return {
      toolMode: "mock",
      title,
      clientId,
      deploymentId,
      resourceLinkId,
      loginInitiationUrl: `${runtime.functionsBaseUrl}/lti-mock-tool?action=login`,
      targetLinkUri: `${runtime.functionsBaseUrl}/lti-mock-tool?action=launch`,
      launchPresentation,
      customParameters
    };
  }

  const loginInitiationUrl = toStringValue(lti.login_initiation_url);
  const targetLinkUri = toStringValue(lti.target_link_uri);
  if (toolMode === "custom" && clientId && deploymentId && resourceLinkId && loginInitiationUrl && targetLinkUri) {
    return {
      toolMode: "custom",
      title,
      clientId,
      deploymentId,
      resourceLinkId,
      loginInitiationUrl,
      targetLinkUri,
      launchPresentation,
      customParameters
    };
  }

  return null;
}
