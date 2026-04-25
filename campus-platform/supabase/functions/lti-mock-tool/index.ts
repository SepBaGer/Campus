import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, createHttpError, jsonResponse } from "../_shared/http.ts";
import {
  createHtmlPage,
  decodeJwt,
  getLtiPlatformRuntime,
  getLtiPublicJwks,
  verifyJwtWithPublicJwk
} from "../_shared/lti.ts";

function toStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderLaunchPage(idToken: string, verificationPassed: boolean) {
  const { header, payload } = decodeJwt(idToken);
  const custom = payload["https://purl.imsglobal.org/spec/lti/claim/custom"];
  const customRecord = custom && typeof custom === "object" ? custom as Record<string, unknown> : {};
  const resourceLink = payload["https://purl.imsglobal.org/spec/lti/claim/resource_link"];
  const context = payload["https://purl.imsglobal.org/spec/lti/claim/context"];
  const roles = Array.isArray(payload["https://purl.imsglobal.org/spec/lti/claim/roles"])
    ? payload["https://purl.imsglobal.org/spec/lti/claim/roles"]
    : [];
  const launchKind = toStringValue(customRecord.launch_kind);
  const communityExpectations = toStringValue(customRecord.community_expectations);
  const communitySection = launchKind === "community"
    ? `
      <h2>Community launch</h2>
      <p>Este sandbox esta simulando un launch de comunidad por cohorte con proveedor <strong>${escapeHtml(toStringValue(customRecord.provider) || "discourse")}</strong>.</p>
      <ul>
        <li><strong>Community title:</strong> ${escapeHtml(toStringValue(customRecord.community_title) || "Community")}</li>
        <li><strong>Summary:</strong> ${escapeHtml(toStringValue(customRecord.community_summary) || "No summary")}</li>
        <li><strong>Prompt:</strong> ${escapeHtml(toStringValue(customRecord.community_prompt) || "No prompt")}</li>
        <li><strong>Peer review:</strong> ${escapeHtml(toStringValue(customRecord.community_peer_review_enabled) || "false")}</li>
        <li><strong>Expectations:</strong> ${escapeHtml(communityExpectations || "No expectations")}</li>
      </ul>
    `
    : "";

  const body = `
    <h1>Mock LTI Tool</h1>
    <p>Este sandbox confirma que Campus ya puede actuar como plataforma LTI 1.3 y entregar un <code>id_token</code> valido a una herramienta externa.</p>
    <p><span class="pill">${verificationPassed ? "signature verified" : "signature could not be verified"}</span></p>
    <h2>Launch summary</h2>
    <ul>
      <li><strong>Message type:</strong> ${escapeHtml(String(payload["https://purl.imsglobal.org/spec/lti/claim/message_type"] || ""))}</li>
      <li><strong>Deployment ID:</strong> ${escapeHtml(String(payload["https://purl.imsglobal.org/spec/lti/claim/deployment_id"] || ""))}</li>
      <li><strong>Target link URI:</strong> ${escapeHtml(String(payload["https://purl.imsglobal.org/spec/lti/claim/target_link_uri"] || ""))}</li>
      <li><strong>Context:</strong> ${escapeHtml(JSON.stringify(context || {}, null, 2))}</li>
      <li><strong>Resource link:</strong> ${escapeHtml(JSON.stringify(resourceLink || {}, null, 2))}</li>
      <li><strong>Roles:</strong> ${escapeHtml(JSON.stringify(roles, null, 2))}</li>
    </ul>
    ${communitySection}
    <h2>Custom payload</h2>
    <pre>${escapeHtml(JSON.stringify(custom || {}, null, 2))}</pre>
    <h2>Decoded header</h2>
    <pre>${escapeHtml(JSON.stringify(header, null, 2))}</pre>
    <h2>Decoded payload</h2>
    <pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>
  `;

  return createHtmlPage("Mock LTI Tool", body);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const runtime = getLtiPlatformRuntime();
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "login";

    if (action === "login") {
      const iss = url.searchParams.get("iss") || "";
      const loginHint = url.searchParams.get("login_hint") || "";
      const targetLinkUri = url.searchParams.get("target_link_uri") || "";
      const clientId = url.searchParams.get("client_id") || "";
      const messageHint = url.searchParams.get("lti_message_hint") || "";

      if (!iss || !loginHint || !targetLinkUri || !clientId || !messageHint) {
        throw createHttpError("El login initiation no trae los parametros requeridos", 400);
      }

      const authorizeUrl = new URL(runtime.authorizeUrl);
      authorizeUrl.searchParams.set("response_type", "id_token");
      authorizeUrl.searchParams.set("response_mode", "form_post");
      authorizeUrl.searchParams.set("scope", "openid");
      authorizeUrl.searchParams.set("prompt", "none");
      authorizeUrl.searchParams.set("client_id", clientId);
      authorizeUrl.searchParams.set("redirect_uri", targetLinkUri);
      authorizeUrl.searchParams.set("login_hint", loginHint);
      authorizeUrl.searchParams.set("lti_message_hint", messageHint);
      authorizeUrl.searchParams.set("state", crypto.randomUUID());
      authorizeUrl.searchParams.set("nonce", crypto.randomUUID());

      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: authorizeUrl.toString()
        }
      });
    }

    if (action === "launch") {
      const formData = req.method === "POST" ? await req.formData() : null;
      const idToken = toStringValue(formData?.get("id_token")) || url.searchParams.get("id_token") || "";

      if (!idToken) {
        throw createHttpError("No llego id_token al mock tool", 400);
      }

      const publicJwk = getLtiPublicJwks().keys[0];
      const verificationPassed = await verifyJwtWithPublicJwk(idToken, publicJwk as JsonWebKey);
      const html = renderLaunchPage(idToken, verificationPassed);

      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ...corsHeaders
        }
      });
    }

    if (action === "meta") {
      return jsonResponse({
        tool_name: "Mock LTI Tool",
        login_url: `${runtime.functionsBaseUrl}/lti-mock-tool?action=login`,
        launch_url: `${runtime.functionsBaseUrl}/lti-mock-tool?action=launch`
      });
    }

    throw createHttpError("Accion mock LTI no soportada", 400);
  } catch (error) {
    const status = (error as { status?: number }).status || 400;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
