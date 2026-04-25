import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient, resolveUserFromRequest } from "../_shared/auth.ts";
import {
  parseCourseRunCommunityManifest,
  resolveCourseRunCommunityToolConfig
} from "../_shared/community.ts";
import { corsHeaders, createHttpError, jsonResponse } from "../_shared/http.ts";
import {
  createSignedHint,
  getLtiPlatformRuntime,
  getLtiPublicJwks,
  mapRoleToLtiRoles,
  resolveLtiToolConfig,
  signLtiIdToken,
  verifySignedHint
} from "../_shared/lti.ts";

type JsonRecord = Record<string, unknown>;

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

function splitName(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) {
    return {
      givenName: "",
      familyName: ""
    };
  }

  return {
    givenName: parts[0],
    familyName: parts.slice(1).join(" ")
  };
}

async function resolvePersonContext(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string
) {
  const { data: person, error: personError } = await adminClient
    .schema("identity")
    .from("person")
    .select("id, email, full_name, locale")
    .eq("id", userId)
    .maybeSingle();

  if (personError || !person) {
    throw createHttpError(personError?.message || "No se pudo resolver la persona que lanza la herramienta", 404);
  }

  const { data: roleRows, error: roleError } = await adminClient
    .schema("identity")
    .from("person_role")
    .select("role_code")
    .eq("person_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (roleError) {
    throw createHttpError(roleError.message, 400);
  }

  return {
    id: String(person.id || userId),
    email: String(person.email || ""),
    displayName: String(person.full_name || person.email || "Learner"),
    locale: String(person.locale || "es-CO"),
    primaryRole: (roleRows || []).map((entry) => String(entry.role_code || "")).find(Boolean) || "student"
  };
}

async function resolveLaunchContext(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  contentBlockId: number
) {
  const { data: block, error: blockError } = await adminClient
    .schema("catalog")
    .from("content_block")
    .select(`
      id,
      slug,
      title,
      summary,
      kind,
      is_public,
      course_id,
      renderer_manifest,
      course:course_id (
        id,
        slug,
        title
      )
    `)
    .eq("id", contentBlockId)
    .maybeSingle();

  if (blockError || !block) {
    throw createHttpError(blockError?.message || "Bloque no encontrado para launch LTI", 404);
  }

  if (String(block.kind || "") !== "interactive") {
    throw createHttpError("Solo los bloques interactivos soportan launch LTI", 409);
  }

  const toolConfig = resolveLtiToolConfig(block.renderer_manifest);
  if (!toolConfig) {
    throw createHttpError("El bloque interactivo no tiene una configuracion LTI valida", 409);
  }

  const course = isRecord(block.course) ? block.course : {};
  const person = await resolvePersonContext(adminClient, userId);
  const { data: runRows, error: runError } = await adminClient
    .schema("delivery")
    .from("course_run")
    .select("id, slug, title, status, starts_at")
    .eq("course_id", Number(block.course_id))
    .in("status", ["open", "closed"])
    .order("starts_at", { ascending: false })
    .limit(1);

  if (runError) {
    throw createHttpError(runError.message, 400);
  }

  const activeRun = Array.isArray(runRows) ? runRows[0] : null;

  return {
    block: {
      id: Number(block.id),
      slug: String(block.slug || ""),
      title: String(block.title || ""),
      summary: toNullableString(block.summary),
      isPublic: Boolean(block.is_public)
    },
    course: {
      id: Number(course.id || block.course_id || 0),
      slug: String(course.slug || ""),
      title: String(course.title || "")
    },
    person: {
      ...person
    },
    run: activeRun
      ? {
          id: Number(activeRun.id || 0),
          slug: String(activeRun.slug || ""),
          title: String(activeRun.title || "")
        }
      : null,
    toolConfig
  };
}

async function resolveCommunityLaunchContext(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  runSlug: string
) {
  const { data: runRow, error: runError } = await adminClient
    .schema("delivery")
    .from("course_run")
    .select(`
      id,
      slug,
      title,
      status,
      community_manifest,
      course:course_id (
        id,
        slug,
        title
      )
    `)
    .eq("slug", runSlug)
    .maybeSingle();

  if (runError || !runRow) {
    throw createHttpError(runError?.message || "Cohorte no encontrada para launch de comunidad", 404);
  }

  if (!["open", "closed"].includes(String(runRow.status || ""))) {
    throw createHttpError("La comunidad solo puede lanzarse desde cohortes abiertas o cerradas", 409);
  }

  const communityManifest = parseCourseRunCommunityManifest(runRow.community_manifest, String(runRow.title || "Cohorte abierta"));
  const toolConfig = resolveCourseRunCommunityToolConfig(communityManifest);
  if (!toolConfig) {
    throw createHttpError("La comunidad de cohorte no tiene una configuracion LTI valida", 409);
  }

  const course = isRecord(runRow.course) ? runRow.course : {};
  const person = await resolvePersonContext(adminClient, userId);

  return {
    course: {
      id: Number(course.id || 0),
      slug: String(course.slug || ""),
      title: String(course.title || "")
    },
    person,
    run: {
      id: Number(runRow.id || 0),
      slug: String(runRow.slug || ""),
      title: String(runRow.title || "")
    },
    community: {
      title: toStringValue(communityManifest.title) || `Comunidad ${String(runRow.title || "")}`.trim(),
      summary: toNullableString(communityManifest.summary),
      prompt: toNullableString(communityManifest.discussion_prompt),
      expectations: Array.isArray(communityManifest.expectations) ? communityManifest.expectations : [],
      peerReviewEnabled: Boolean(communityManifest.peer_review_enabled)
    },
    toolConfig
  };
}

async function handleInitiate(req: Request) {
  const user = await resolveUserFromRequest(req);
  const adminClient = createAdminClient();
  const body = await req.json().catch(() => ({}));
  const contentBlockId = Number(body.content_block_id || 0);
  const returnUrl = toStringValue(body.return_url) || `${getLtiPlatformRuntime().siteUrl}/portal`;

  if (!contentBlockId) {
    throw createHttpError("Falta content_block_id para iniciar el launch LTI", 400);
  }

  const context = await resolveLaunchContext(adminClient, String(user.id || ""), contentBlockId);
  const loginHint = await createSignedHint("login_hint", {
    user_id: context.person.id,
    email: context.person.email,
    display_name: context.person.displayName,
    locale: context.person.locale,
    primary_role: context.person.primaryRole,
    return_url: returnUrl
  });
  const messageHint = await createSignedHint("message_hint", {
    course_id: context.course.id,
    course_slug: context.course.slug,
    course_title: context.course.title,
    block_id: context.block.id,
    block_slug: context.block.slug,
    block_title: context.block.title,
    block_summary: context.block.summary,
    run_id: context.run?.id || null,
    run_slug: context.run?.slug || null,
    run_title: context.run?.title || null,
    client_id: context.toolConfig.clientId,
    deployment_id: context.toolConfig.deploymentId,
    resource_link_id: context.toolConfig.resourceLinkId,
    target_link_uri: context.toolConfig.targetLinkUri,
    launch_presentation: context.toolConfig.launchPresentation,
    tool_mode: context.toolConfig.toolMode,
    tool_title: context.toolConfig.title,
    custom_parameters: context.toolConfig.customParameters
  });

  const initiationUrl = new URL(context.toolConfig.loginInitiationUrl);
  initiationUrl.searchParams.set("iss", getLtiPlatformRuntime().issuer);
  initiationUrl.searchParams.set("login_hint", loginHint);
  initiationUrl.searchParams.set("target_link_uri", context.toolConfig.targetLinkUri);
  initiationUrl.searchParams.set("client_id", context.toolConfig.clientId);
  initiationUrl.searchParams.set("lti_message_hint", messageHint);

  return jsonResponse({
    launch_url: initiationUrl.toString(),
    launch_presentation: context.toolConfig.launchPresentation,
    tool_title: context.toolConfig.title,
    tool_mode: context.toolConfig.toolMode
  });
}

async function handleInitiateCommunity(req: Request) {
  const user = await resolveUserFromRequest(req);
  const adminClient = createAdminClient();
  const body = await req.json().catch(() => ({}));
  const runSlug = toStringValue(body.run_slug);
  const returnUrl = toStringValue(body.return_url) || `${getLtiPlatformRuntime().siteUrl}/portal`;

  if (!runSlug) {
    throw createHttpError("Falta run_slug para iniciar la comunidad de cohorte", 400);
  }

  const context = await resolveCommunityLaunchContext(adminClient, String(user.id || ""), runSlug);
  const loginHint = await createSignedHint("login_hint", {
    user_id: context.person.id,
    email: context.person.email,
    display_name: context.person.displayName,
    locale: context.person.locale,
    primary_role: context.person.primaryRole,
    return_url: returnUrl
  });
  const messageHint = await createSignedHint("message_hint", {
    launch_kind: "community",
    course_id: context.course.id,
    course_slug: context.course.slug,
    course_title: context.course.title,
    run_id: context.run.id,
    run_slug: context.run.slug,
    run_title: context.run.title,
    community_title: context.community.title,
    community_summary: context.community.summary,
    community_prompt: context.community.prompt,
    community_expectations: context.community.expectations,
    community_peer_review_enabled: context.community.peerReviewEnabled,
    client_id: context.toolConfig.clientId,
    deployment_id: context.toolConfig.deploymentId,
    resource_link_id: context.toolConfig.resourceLinkId,
    target_link_uri: context.toolConfig.targetLinkUri,
    launch_presentation: context.toolConfig.launchPresentation,
    tool_mode: context.toolConfig.toolMode,
    tool_title: context.toolConfig.title,
    custom_parameters: context.toolConfig.customParameters
  });

  const initiationUrl = new URL(context.toolConfig.loginInitiationUrl);
  initiationUrl.searchParams.set("iss", getLtiPlatformRuntime().issuer);
  initiationUrl.searchParams.set("login_hint", loginHint);
  initiationUrl.searchParams.set("target_link_uri", context.toolConfig.targetLinkUri);
  initiationUrl.searchParams.set("client_id", context.toolConfig.clientId);
  initiationUrl.searchParams.set("lti_message_hint", messageHint);

  return jsonResponse({
    launch_url: initiationUrl.toString(),
    launch_presentation: context.toolConfig.launchPresentation,
    tool_title: context.toolConfig.title,
    tool_mode: context.toolConfig.toolMode
  });
}

async function handleAuthorize(req: Request) {
  const url = new URL(req.url);
  const params = url.searchParams;
  const responseType = params.get("response_type") || "";
  const responseMode = params.get("response_mode") || "";
  const clientId = params.get("client_id") || "";
  const redirectUri = params.get("redirect_uri") || "";
  const loginHint = params.get("login_hint") || "";
  const messageHint = params.get("lti_message_hint") || "";
  const state = params.get("state") || "";
  const nonce = params.get("nonce") || "";

  if (
    responseType !== "id_token" ||
    responseMode !== "form_post" ||
    !clientId ||
    !redirectUri ||
    !loginHint ||
    !messageHint ||
    !state ||
    !nonce
  ) {
    throw createHttpError("La solicitud OIDC del tool no trae los parametros minimos esperados", 400);
  }

  const loginPayload = await verifySignedHint<JsonRecord>(loginHint, "login_hint");
  const messagePayload = await verifySignedHint<JsonRecord>(messageHint, "message_hint");
  if (toStringValue(messagePayload.client_id) !== clientId) {
    throw createHttpError("El client_id recibido no coincide con el launch preparado por el Campus", 400);
  }

  if (toStringValue(messagePayload.target_link_uri) !== redirectUri) {
    throw createHttpError("El redirect_uri del tool no coincide con el target_link_uri esperado", 400);
  }

  const runtime = getLtiPlatformRuntime();
  const displayName = toStringValue(loginPayload.display_name) || toStringValue(loginPayload.email) || "Learner";
  const { givenName, familyName } = splitName(displayName);
  const now = Math.floor(Date.now() / 1000);
  const roles = mapRoleToLtiRoles(toStringValue(loginPayload.primary_role) || "student");
  const runTitle = toStringValue(messagePayload.run_title);
  const contextId = messagePayload.run_id ? `course-run-${messagePayload.run_id}` : `course-${messagePayload.course_id}`;
  const contextTitle = runTitle || toStringValue(messagePayload.course_title);
  const launchKind = toStringValue(messagePayload.launch_kind) === "community" ? "community" : "block";
  const resourceLinkTitle = launchKind === "community"
    ? toStringValue(messagePayload.community_title) || runTitle || toStringValue(messagePayload.course_title)
    : toStringValue(messagePayload.block_title);
  const resourceLinkDescription = launchKind === "community"
    ? toStringValue(messagePayload.community_summary) || toStringValue(messagePayload.community_prompt)
    : toStringValue(messagePayload.block_summary);
  const launchPresentation = toStringValue(messagePayload.launch_presentation).toLowerCase() === "iframe"
    ? "iframe"
    : "window";
  const idToken = await signLtiIdToken({
    iss: runtime.issuer,
    sub: toStringValue(loginPayload.user_id),
    aud: [clientId],
    azp: clientId,
    exp: now + 300,
    iat: now,
    nonce,
    name: displayName,
    given_name: givenName,
    family_name: familyName,
    email: toStringValue(loginPayload.email),
    locale: toStringValue(loginPayload.locale) || "es-CO",
    "https://purl.imsglobal.org/spec/lti/claim/deployment_id": toStringValue(messagePayload.deployment_id),
    "https://purl.imsglobal.org/spec/lti/claim/message_type": "LtiResourceLinkRequest",
    "https://purl.imsglobal.org/spec/lti/claim/version": "1.3.0",
    "https://purl.imsglobal.org/spec/lti/claim/roles": roles,
    "https://purl.imsglobal.org/spec/lti/claim/context": {
      id: contextId,
      label: toStringValue(messagePayload.run_slug) || toStringValue(messagePayload.course_slug),
      title: contextTitle,
      type: ["http://purl.imsglobal.org/vocab/lis/v2/course#CourseOffering"]
    },
    "https://purl.imsglobal.org/spec/lti/claim/resource_link": {
      id: toStringValue(messagePayload.resource_link_id),
      title: resourceLinkTitle,
      description: resourceLinkDescription
    },
    "https://purl.imsglobal.org/spec/lti/claim/tool_platform": {
      guid: runtime.platformGuid,
      contact_email: runtime.supportEmail,
      name: runtime.platformName,
      url: runtime.siteUrl,
      product_family_code: runtime.productFamilyCode,
      version: "v3"
    },
    "https://purl.imsglobal.org/spec/lti/claim/target_link_uri": redirectUri,
    "https://purl.imsglobal.org/spec/lti/claim/launch_presentation": {
      document_target: launchPresentation,
      return_url: toStringValue(loginPayload.return_url) || `${runtime.siteUrl}/portal`
    },
    "https://purl.imsglobal.org/spec/lti/claim/custom": {
      ...(isRecord(messagePayload.custom_parameters) ? messagePayload.custom_parameters : {}),
      course_slug: toStringValue(messagePayload.course_slug),
      course_title: toStringValue(messagePayload.course_title),
      block_slug: toStringValue(messagePayload.block_slug),
      block_title: toStringValue(messagePayload.block_title),
      launch_kind: launchKind,
      run_slug: toNullableString(messagePayload.run_slug),
      return_url: toStringValue(loginPayload.return_url) || `${runtime.siteUrl}/portal`,
      community_title: toNullableString(messagePayload.community_title),
      community_summary: toNullableString(messagePayload.community_summary),
      community_prompt: toNullableString(messagePayload.community_prompt),
      community_peer_review_enabled: String(Boolean(messagePayload.community_peer_review_enabled)),
      community_expectations: Array.isArray(messagePayload.community_expectations)
        ? messagePayload.community_expectations.map((entry) => String(entry || "")).filter(Boolean).join(" | ")
        : toStringValue(messagePayload.community_expectations)
    }
  });

  return jsonResponse({
    redirect_uri: redirectUri,
    state,
    id_token: idToken,
    tool_title: toStringValue(messagePayload.tool_title) || "Herramienta LTI"
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || (req.method === "POST" ? "initiate" : "platform-config");

    switch (action) {
      case "initiate":
        if (req.method !== "POST") {
          throw createHttpError("initiate solo acepta POST", 405);
        }
        return await handleInitiate(req);
      case "initiate-community":
        if (req.method !== "POST") {
          throw createHttpError("initiate-community solo acepta POST", 405);
        }
        return await handleInitiateCommunity(req);
      case "authorize":
        return await handleAuthorize(req);
      case "jwks":
        return jsonResponse(getLtiPublicJwks());
      case "platform-config": {
        const runtime = getLtiPlatformRuntime();
        return jsonResponse({
          issuer: runtime.issuer,
          authorize_url: runtime.authorizeUrl,
          authorize_api_url: runtime.authorizeApiUrl,
          jwks_url: runtime.jwksUrl,
          product_family_code: runtime.productFamilyCode,
          platform_name: runtime.platformName,
          mock_tool_login_url: `${runtime.functionsBaseUrl}/lti-mock-tool?action=login`,
          mock_tool_target_link_uri: `${runtime.functionsBaseUrl}/lti-mock-tool?action=launch`
        });
      }
      default:
        throw createHttpError("Accion LTI no soportada", 400);
    }
  } catch (error) {
    const status = (error as { status?: number }).status || 400;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
