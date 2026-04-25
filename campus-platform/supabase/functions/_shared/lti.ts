import { createHttpError } from "./http.ts";

type JsonRecord = Record<string, unknown>;
type HintKind = "login_hint" | "message_hint";
export type LtiLaunchPresentation = "iframe" | "window";
export type LtiToolMode = "mock" | "custom";

export interface LtiToolConfig {
  toolMode: LtiToolMode;
  title: string;
  clientId: string;
  deploymentId: string;
  resourceLinkId: string;
  loginInitiationUrl: string;
  targetLinkUri: string;
  launchPresentation: LtiLaunchPresentation;
  customParameters: JsonRecord;
}

export interface LtiPlatformRuntime {
  issuer: string;
  siteUrl: string;
  functionsBaseUrl: string;
  authorizeUrl: string;
  authorizeApiUrl: string;
  jwksUrl: string;
  keyId: string;
  platformGuid: string;
  platformName: string;
  productFamilyCode: string;
  supportEmail: string;
}

interface SignedHintPayload extends JsonRecord {
  kind: HintKind;
  iat: number;
  exp: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

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

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function encodeBase64UrlBytes(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function encodeBase64UrlJson(value: unknown) {
  return encodeBase64UrlBytes(encoder.encode(JSON.stringify(value)));
}

function decodeBase64UrlBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function decodeBase64UrlJson(value: string) {
  return JSON.parse(decoder.decode(decodeBase64UrlBytes(value))) as JsonRecord;
}

function getSigningAlgorithm() {
  return {
    name: "RSASSA-PKCS1-v1_5",
    hash: "SHA-256"
  } as const;
}

function getSharedSecret() {
  const secret = Deno.env.get("LTI_PLATFORM_SHARED_SECRET") || "";
  if (!secret) {
    throw createHttpError("Falta LTI_PLATFORM_SHARED_SECRET para el launch LTI", 500);
  }
  return secret;
}

function getPrivateJwk() {
  const rawValue = Deno.env.get("LTI_PLATFORM_PRIVATE_JWK") || "";
  if (!rawValue) {
    throw createHttpError("Falta LTI_PLATFORM_PRIVATE_JWK para firmar mensajes LTI", 500);
  }

  try {
    const parsed = JSON.parse(rawValue) as JsonWebKey;
    if (!parsed.kty || !parsed.n || !parsed.e || !parsed.d) {
      throw new Error("Missing RSA fields");
    }
    return parsed;
  } catch {
    throw createHttpError("LTI_PLATFORM_PRIVATE_JWK no es un JWK RSA valido", 500);
  }
}

export function getLtiPlatformRuntime(): LtiPlatformRuntime {
  const supabaseUrl = stripTrailingSlash(Deno.env.get("SUPABASE_URL") || "");
  const siteUrl = stripTrailingSlash(Deno.env.get("SITE_URL") || "http://127.0.0.1:4321");
  const issuer = stripTrailingSlash(Deno.env.get("LTI_PLATFORM_ISSUER") || siteUrl);

  if (!supabaseUrl) {
    throw createHttpError("SUPABASE_URL es obligatorio para construir los endpoints LTI", 500);
  }

  return {
    issuer,
    siteUrl,
    functionsBaseUrl: `${supabaseUrl}/functions/v1`,
    authorizeUrl: `${siteUrl}/lti/authorize`,
    authorizeApiUrl: `${supabaseUrl}/functions/v1/lti-launch?action=authorize`,
    jwksUrl: `${supabaseUrl}/functions/v1/lti-launch?action=jwks`,
    keyId: Deno.env.get("LTI_PLATFORM_KEY_ID") || "campus-platform-lti-key",
    platformGuid: Deno.env.get("LTI_PLATFORM_GUID") || new URL(issuer).host,
    platformName: Deno.env.get("LTI_PLATFORM_NAME") || "MetodologIA Campus",
    productFamilyCode: Deno.env.get("LTI_PLATFORM_PRODUCT_FAMILY_CODE") || "campus-platform-v3",
    supportEmail: Deno.env.get("LTI_PLATFORM_SUPPORT_EMAIL") || "campus@metodologia.info"
  };
}

export function getLtiPublicJwks() {
  const privateJwk = getPrivateJwk();
  const runtime = getLtiPlatformRuntime();

  return {
    keys: [
      {
        kty: privateJwk.kty,
        use: "sig",
        alg: "RS256",
        kid: privateJwk.kid || runtime.keyId,
        n: privateJwk.n,
        e: privateJwk.e
      }
    ]
  };
}

async function importPrivateSigningKey() {
  const privateJwk = getPrivateJwk();
  return await crypto.subtle.importKey(
    "jwk",
    privateJwk,
    getSigningAlgorithm(),
    false,
    ["sign"]
  );
}

export async function importPublicVerificationKey(publicJwk: JsonWebKey) {
  return await crypto.subtle.importKey(
    "jwk",
    publicJwk,
    getSigningAlgorithm(),
    false,
    ["verify"]
  );
}

async function importSharedSecretKey() {
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSharedSecret()),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign", "verify"]
  );
}

export async function signLtiIdToken(payload: JsonRecord) {
  const runtime = getLtiPlatformRuntime();
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: getPrivateJwk().kid || runtime.keyId
  };
  const encodedHeader = encodeBase64UrlJson(header);
  const encodedPayload = encodeBase64UrlJson(payload);
  const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
  const signingKey = await importPrivateSigningKey();
  const signature = new Uint8Array(await crypto.subtle.sign(getSigningAlgorithm(), signingKey, data));

  return `${encodedHeader}.${encodedPayload}.${encodeBase64UrlBytes(signature)}`;
}

export async function createSignedHint<T extends JsonRecord>(
  kind: HintKind,
  payload: T,
  expiresInSeconds = 300
) {
  const signingKey = await importSharedSecretKey();
  const now = Math.floor(Date.now() / 1000);
  const signedPayload: SignedHintPayload = {
    ...payload,
    kind,
    iat: now,
    exp: now + expiresInSeconds
  };
  const encodedHeader = encodeBase64UrlJson({
    alg: "HS256",
    typ: "JWT"
  });
  const encodedPayload = encodeBase64UrlJson(signedPayload);
  const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", signingKey, data));

  return `${encodedHeader}.${encodedPayload}.${encodeBase64UrlBytes(signature)}`;
}

export async function verifySignedHint<T extends JsonRecord>(token: string, expectedKind: HintKind) {
  const signingKey = await importSharedSecretKey();
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw createHttpError("Hint LTI invalido", 400);
  }

  const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
  const signature = decodeBase64UrlBytes(encodedSignature);
  const isValid = await crypto.subtle.verify("HMAC", signingKey, signature, data);

  if (!isValid) {
    throw createHttpError("Hint LTI no valido", 400);
  }

  const payload = decodeBase64UrlJson(encodedPayload) as SignedHintPayload;
  const now = Math.floor(Date.now() / 1000);
  if (payload.kind !== expectedKind || Number(payload.exp || 0) < now) {
    throw createHttpError("Hint LTI expirado o invalido", 400);
  }

  return payload as T & SignedHintPayload;
}

export function resolveLtiToolConfig(rendererManifest: unknown): LtiToolConfig | null {
  const runtime = getLtiPlatformRuntime();
  const manifest = isRecord(rendererManifest) ? rendererManifest : {};
  const props = isRecord(manifest.props) ? manifest.props : {};
  const toolModeRaw = toStringValue(props.lti_tool_mode).toLowerCase();
  const legacyLaunchUrl = toStringValue(props.lti_launch_url);
  const loginInitiationUrl = toStringValue(props.lti_login_initiation_url);
  const targetLinkUri = toStringValue(props.lti_target_link_uri) || legacyLaunchUrl;
  const clientId = toStringValue(props.lti_client_id) || toStringValue(props.client_id);
  const deploymentId = toStringValue(props.lti_deployment_id);
  const resourceLinkId = toStringValue(props.lti_resource_link_id);
  const toolTitle = toStringValue(props.lti_title) || "Herramienta LTI";
  const launchPresentation = toStringValue(props.lti_launch_presentation).toLowerCase() === "iframe"
    ? "iframe"
    : "window";
  const customParameters = isRecord(props.lti_custom_parameters) ? props.lti_custom_parameters : {};

  if (toolModeRaw === "mock") {
    if (!clientId || !deploymentId || !resourceLinkId) {
      return null;
    }

    return {
      toolMode: "mock",
      title: toolTitle,
      clientId,
      deploymentId,
      resourceLinkId,
      loginInitiationUrl: `${runtime.functionsBaseUrl}/lti-mock-tool?action=login`,
      targetLinkUri: `${runtime.functionsBaseUrl}/lti-mock-tool?action=launch`,
      launchPresentation,
      customParameters
    };
  }

  if (loginInitiationUrl && targetLinkUri && clientId && deploymentId && resourceLinkId) {
    return {
      toolMode: "custom",
      title: toolTitle,
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

export function createLtiAutoSubmitHtml(redirectUri: string, payload: Record<string, string>) {
  const hiddenInputs = Object.entries(payload)
    .map(([key, value]) => `<input type="hidden" name="${key}" value="${escapeHtml(value)}" />`)
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Campus LTI Launch</title>
    <style>
      body { font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; display: grid; place-items: center; min-height: 100vh; margin: 0; }
      .card { max-width: 32rem; padding: 1.5rem; border-radius: 20px; background: #ffffff; box-shadow: 0 18px 48px rgba(15, 23, 42, 0.12); }
    </style>
  </head>
  <body>
    <main class="card">
      <h1>Launching tool...</h1>
      <p>Campus is preparing a secure LTI message for the external tool.</p>
      <form id="lti-launch-form" method="post" action="${escapeHtml(redirectUri)}">
        ${hiddenInputs}
      </form>
      <noscript>
        <p>JavaScript is required to continue. Use the button below to submit the launch manually.</p>
        <button form="lti-launch-form" type="submit">Continue</button>
      </noscript>
    </main>
    <script>
      document.getElementById("lti-launch-form")?.submit();
    </script>
  </body>
</html>`;
}

export function decodeJwt(token: string) {
  const [encodedHeader, encodedPayload] = token.split(".");
  if (!encodedHeader || !encodedPayload) {
    throw createHttpError("JWT invalido", 400);
  }

  return {
    header: decodeBase64UrlJson(encodedHeader),
    payload: decodeBase64UrlJson(encodedPayload)
  };
}

export async function verifyJwtWithPublicJwk(token: string, publicJwk: JsonWebKey) {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw createHttpError("JWT invalido", 400);
  }

  const verificationKey = await importPublicVerificationKey(publicJwk);
  const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
  const signature = decodeBase64UrlBytes(encodedSignature);
  return await crypto.subtle.verify(getSigningAlgorithm(), verificationKey, signature, data);
}

export function mapRoleToLtiRoles(role: string | null | undefined) {
  switch (toStringValue(role).toLowerCase()) {
    case "admin":
      return [
        "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator",
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"
      ];
    case "teacher":
      return [
        "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Instructor",
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"
      ];
    case "observer":
      return [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Observer"
      ];
    case "student":
    default:
      return [
        "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Student",
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
      ];
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function createHtmlPage(title: string, bodyHtml: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color-scheme: light; }
      body { font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 2rem; }
      main { max-width: 56rem; margin: 0 auto; padding: 1.5rem; background: #fff; border-radius: 20px; box-shadow: 0 18px 48px rgba(15, 23, 42, 0.12); }
      h1, h2, p, ul, pre { margin-top: 0; }
      code, pre { background: #e2e8f0; border-radius: 12px; padding: 0.25rem 0.5rem; }
      pre { padding: 1rem; overflow: auto; white-space: pre-wrap; }
      .pill { display: inline-flex; padding: 0.35rem 0.7rem; border-radius: 999px; background: rgba(184, 135, 0, 0.12); color: #9a6700; font-weight: 700; }
    </style>
  </head>
  <body>
    <main>
      ${bodyHtml}
    </main>
  </body>
</html>`;
}

export function resolveDocumentTarget(value: unknown) {
  return toStringValue(value).toLowerCase() === "iframe" ? "iframe" : "window";
}

export function normalizeNullableString(value: unknown) {
  const resolved = toStringValue(value);
  return resolved || null;
}

export function resolveCustomParameters(value: unknown) {
  return isRecord(value) ? value : {};
}

export function toSafeBoolean(value: unknown, fallback = false) {
  return toBoolean(value, fallback);
}
