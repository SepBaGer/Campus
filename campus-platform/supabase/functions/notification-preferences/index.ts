import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient, resolveUserFromRequest } from "../_shared/auth.ts";
import { corsHeaders, createHttpError, jsonResponse } from "../_shared/http.ts";
import {
  getWebPushPublicKey,
  isRecord,
  normalizeNotificationChannel,
  toBoolean
} from "../_shared/notifications.ts";

async function ensurePreferenceRows(
  adminClient: ReturnType<typeof createAdminClient>,
  personId: string
) {
  await adminClient
    .schema("identity")
    .from("person_notification_preference")
    .upsert(
      [
        { person_id: personId, channel_code: "email", is_enabled: true },
        { person_id: personId, channel_code: "web", is_enabled: false }
      ],
      { onConflict: "person_id,channel_code", ignoreDuplicates: true }
    );
}

async function handleSnapshot(
  adminClient: ReturnType<typeof createAdminClient>,
  personId: string
) {
  await ensurePreferenceRows(adminClient, personId);

  const [{ data: preferences, error: preferencesError }, { data: subscriptions, error: subscriptionsError }, { data: dispatches, error: dispatchesError }] = await Promise.all([
    adminClient
      .schema("identity")
      .from("person_notification_preference")
      .select("channel_code, is_enabled, updated_at")
      .eq("person_id", personId),
    adminClient
      .schema("identity")
      .from("web_push_subscription")
      .select("id, endpoint, is_active, last_seen_at, created_at")
      .eq("person_id", personId)
      .eq("is_active", true)
      .order("last_seen_at", { ascending: false }),
    adminClient
      .schema("delivery")
      .from("notification_dispatch")
      .select("id, channel_code, status, rendered_subject, rendered_body, cta_label, cta_url, sent_at, created_at, template:template_id (slug, title)")
      .eq("person_id", personId)
      .in("status", ["sent", "skipped"])
      .order("created_at", { ascending: false })
      .limit(8)
  ]);

  if (preferencesError || subscriptionsError || dispatchesError) {
    throw createHttpError(
      preferencesError?.message || subscriptionsError?.message || dispatchesError?.message || "No se pudo cargar el centro de notificaciones",
      400
    );
  }

  const emailPreference = (preferences || []).find((entry) => entry.channel_code === "email");
  const webPreference = (preferences || []).find((entry) => entry.channel_code === "web");

  return {
    preferences: {
      email_enabled: Boolean(emailPreference?.is_enabled),
      web_enabled: Boolean(webPreference?.is_enabled),
      updated_at: String(webPreference?.updated_at || emailPreference?.updated_at || "")
    },
    web_push: {
      supported: Boolean(getWebPushPublicKey()),
      public_key: getWebPushPublicKey(),
      active_subscriptions: (subscriptions || []).length,
      last_seen_at: subscriptions?.[0]?.last_seen_at || null
    },
    recent: (dispatches || []).map((entry) => {
      const template = isRecord(entry.template) ? entry.template : {};

      return {
        id: Number(entry.id),
        channel_code: String(entry.channel_code || "email"),
        status: String(entry.status || "sent"),
        subject: String(entry.rendered_subject || template.title || ""),
        body: String(entry.rendered_body || ""),
        cta_label: entry.cta_label ? String(entry.cta_label) : "",
        cta_url: entry.cta_url ? String(entry.cta_url) : "",
        sent_at: String(entry.sent_at || entry.created_at || ""),
        template_slug: String(template.slug || ""),
        template_title: String(template.title || "")
      };
    })
  };
}

async function handleUpdatePreference(
  adminClient: ReturnType<typeof createAdminClient>,
  personId: string,
  body: Record<string, unknown>
) {
  const channel = normalizeNotificationChannel(body.channel_code);
  const isEnabled = toBoolean(body.is_enabled, channel === "email");

  const { error } = await adminClient
    .schema("identity")
    .from("person_notification_preference")
    .upsert(
      {
        person_id: personId,
        channel_code: channel,
        is_enabled: isEnabled
      },
      { onConflict: "person_id,channel_code" }
    );

  if (error) {
    throw createHttpError(error.message, 400);
  }

  if (channel === "web" && !isEnabled) {
    await adminClient
      .schema("identity")
      .from("web_push_subscription")
      .update({ is_active: false })
      .eq("person_id", personId)
      .eq("is_active", true);
  }

  return handleSnapshot(adminClient, personId);
}

async function handleRegisterWebPush(
  adminClient: ReturnType<typeof createAdminClient>,
  personId: string,
  body: Record<string, unknown>,
  req: Request
) {
  const subscription = isRecord(body.subscription) ? body.subscription : {};
  const keys = isRecord(subscription.keys) ? subscription.keys : {};
  const endpoint = typeof subscription.endpoint === "string" ? subscription.endpoint.trim() : "";
  const p256dhKey = typeof keys.p256dh === "string" ? keys.p256dh.trim() : "";
  const authKey = typeof keys.auth === "string" ? keys.auth.trim() : "";

  if (!endpoint || !p256dhKey || !authKey) {
    throw createHttpError("La suscripcion web push es invalida o incompleta", 400);
  }

  const { error: subscriptionError } = await adminClient
    .schema("identity")
    .from("web_push_subscription")
    .upsert(
      {
        person_id: personId,
        endpoint,
        p256dh_key: p256dhKey,
        auth_key: authKey,
        user_agent: req.headers.get("user-agent"),
        is_active: true,
        last_seen_at: new Date().toISOString()
      },
      { onConflict: "endpoint" }
    );

  if (subscriptionError) {
    throw createHttpError(subscriptionError.message, 400);
  }

  const { error: preferenceError } = await adminClient
    .schema("identity")
    .from("person_notification_preference")
    .upsert(
      {
        person_id: personId,
        channel_code: "web",
        is_enabled: true
      },
      { onConflict: "person_id,channel_code" }
    );

  if (preferenceError) {
    throw createHttpError(preferenceError.message, 400);
  }

  return handleSnapshot(adminClient, personId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await resolveUserFromRequest(req);
    const adminClient = createAdminClient();
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "snapshot");

    switch (action) {
      case "snapshot":
        return jsonResponse(await handleSnapshot(adminClient, user.id));
      case "update-preference":
        return jsonResponse(await handleUpdatePreference(adminClient, user.id, body));
      case "register-web-push":
        return jsonResponse(await handleRegisterWebPush(adminClient, user.id, body, req));
      default:
        throw createHttpError("Accion no soportada", 400);
    }
  } catch (error) {
    const status = (error as { status?: number }).status || 400;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
