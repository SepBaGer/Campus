import type { RendererManifest } from "./platform-types";

type JsonRecord = Record<string, unknown>;

export type LtiToolMode = "none" | "mock" | "custom";
export type LtiLaunchPresentation = "iframe" | "window";

export interface LtiLaunchConfig {
  toolMode: LtiToolMode;
  title: string;
  clientId: string;
  deploymentId: string;
  resourceLinkId: string;
  loginInitiationUrl: string;
  targetLinkUri: string;
  launchPresentation: LtiLaunchPresentation;
  customParameters: JsonRecord;
  h5pContentId: string;
  isConfigured: boolean;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toLaunchPresentation(value: unknown): LtiLaunchPresentation {
  return toStringValue(value).toLowerCase() === "iframe" ? "iframe" : "window";
}

export function resolveLtiLaunchConfig(rendererManifest?: RendererManifest | JsonRecord | null): LtiLaunchConfig {
  const manifest = isRecord(rendererManifest) ? rendererManifest : {};
  const props = isRecord(manifest.props) ? manifest.props : {};
  const toolModeRaw = toStringValue(props.lti_tool_mode).toLowerCase();
  const legacyLaunchUrl = toStringValue(props.lti_launch_url);
  const loginInitiationUrl = toStringValue(props.lti_login_initiation_url);
  const targetLinkUri = toStringValue(props.lti_target_link_uri) || legacyLaunchUrl;
  const clientId = toStringValue(props.lti_client_id) || toStringValue(props.client_id);
  const deploymentId = toStringValue(props.lti_deployment_id);
  const resourceLinkId = toStringValue(props.lti_resource_link_id);
  const h5pContentId = toStringValue(props.h5p_content_id);
  const customParameters = isRecord(props.lti_custom_parameters) ? props.lti_custom_parameters : {};
  const title = toStringValue(props.lti_title) || h5pContentId || "Herramienta LTI";

  let toolMode: LtiToolMode = "none";
  if (toolModeRaw === "mock" || toolModeRaw === "custom") {
    toolMode = toolModeRaw;
  } else if (loginInitiationUrl || targetLinkUri || legacyLaunchUrl || clientId || deploymentId || resourceLinkId) {
    toolMode = "custom";
  }

  const resolvedLoginInitiationUrl = toolMode === "custom"
    ? (loginInitiationUrl || legacyLaunchUrl)
    : "";
  const isConfigured = toolMode === "mock"
    ? Boolean(clientId && deploymentId && resourceLinkId)
    : toolMode === "custom"
      ? Boolean(resolvedLoginInitiationUrl && targetLinkUri && clientId && deploymentId && resourceLinkId)
      : false;

  return {
    toolMode,
    title,
    clientId,
    deploymentId,
    resourceLinkId,
    loginInitiationUrl: resolvedLoginInitiationUrl,
    targetLinkUri,
    launchPresentation: toLaunchPresentation(props.lti_launch_presentation),
    customParameters,
    h5pContentId,
    isConfigured
  };
}

export function hasLtiLaunchConfig(rendererManifest?: RendererManifest | JsonRecord | null) {
  return resolveLtiLaunchConfig(rendererManifest).isConfigured;
}
