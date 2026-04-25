import webpush from "npm:web-push@3.6.7";
import { createHttpError } from "./http.ts";

export const notificationChannels = ["email", "web"] as const;
export const notificationAudiences = ["all", "invited", "active", "completed"] as const;
export const notificationTriggers = ["manual", "before_run_start", "after_run_start", "after_run_end"] as const;
export const notificationTemplateStatuses = ["draft", "active", "archived"] as const;
export const notificationDispatchStatuses = ["pending", "sent", "skipped", "failed"] as const;

export type NotificationChannel = (typeof notificationChannels)[number];
export type NotificationAudience = (typeof notificationAudiences)[number];
export type NotificationTrigger = (typeof notificationTriggers)[number];
export type NotificationTemplateStatus = (typeof notificationTemplateStatuses)[number];
export type NotificationDispatchStatus = (typeof notificationDispatchStatuses)[number];
export type JsonRecord = Record<string, unknown>;

export type NotificationTemplateRow = {
  id: number;
  course_run_id: number;
  slug: string;
  title: string;
  channel_code: NotificationChannel;
  audience_code: NotificationAudience;
  trigger_code: NotificationTrigger;
  offset_days: number;
  offset_hours: number;
  subject_template: string;
  body_template: string;
  cta_label: string | null;
  cta_url: string | null;
  status: NotificationTemplateStatus;
};

export type NotificationRunContext = {
  id: number;
  slug: string;
  title: string;
  starts_at: string | null;
  ends_at: string | null;
  course_slug: string;
  course_title: string;
};

export type NotificationRenderContext = {
  learner_name: string;
  learner_email: string;
  course_slug: string;
  course_title: string;
  run_slug: string;
  run_title: string;
  portal_url: string;
  next_session_title: string;
  next_session_starts_at: string;
  next_session_location_label: string;
  session_count: string;
};

export type WebPushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function toNullableString(value: unknown) {
  const resolved = typeof value === "string" ? value.trim() : "";
  return resolved || null;
}

export function toInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "si"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no"].includes(normalized)) {
      return false;
    }
  }
  return fallback;
}

export function normalizeNotificationChannel(value: unknown, fallback: NotificationChannel = "email"): NotificationChannel {
  const resolved = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (notificationChannels.includes(resolved as NotificationChannel)) {
    return resolved as NotificationChannel;
  }
  return fallback;
}

export function normalizeNotificationAudience(value: unknown, fallback: NotificationAudience = "active"): NotificationAudience {
  const resolved = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (notificationAudiences.includes(resolved as NotificationAudience)) {
    return resolved as NotificationAudience;
  }
  return fallback;
}

export function normalizeNotificationTrigger(value: unknown, fallback: NotificationTrigger = "manual"): NotificationTrigger {
  const resolved = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (notificationTriggers.includes(resolved as NotificationTrigger)) {
    return resolved as NotificationTrigger;
  }
  return fallback;
}

export function normalizeNotificationTemplateStatus(
  value: unknown,
  fallback: NotificationTemplateStatus = "draft"
): NotificationTemplateStatus {
  const resolved = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (notificationTemplateStatuses.includes(resolved as NotificationTemplateStatus)) {
    return resolved as NotificationTemplateStatus;
  }
  return fallback;
}

export function normalizeNotificationDispatchStatus(
  value: unknown,
  fallback: NotificationDispatchStatus = "pending"
): NotificationDispatchStatus {
  const resolved = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (notificationDispatchStatuses.includes(resolved as NotificationDispatchStatus)) {
    return resolved as NotificationDispatchStatus;
  }
  return fallback;
}

export function toSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function resolveNotificationSchedule(template: NotificationTemplateRow, run: NotificationRunContext, now = new Date()) {
  if (template.trigger_code === "manual") {
    return now.toISOString();
  }

  const anchor =
    template.trigger_code === "after_run_end"
      ? run.ends_at
      : run.starts_at;

  if (!anchor) {
    return null;
  }

  const scheduledAt = new Date(anchor);
  if (Number.isNaN(scheduledAt.getTime())) {
    return null;
  }

  const direction = template.trigger_code === "before_run_start" ? -1 : 1;
  scheduledAt.setUTCDate(scheduledAt.getUTCDate() + direction * template.offset_days);
  scheduledAt.setUTCHours(scheduledAt.getUTCHours() + direction * template.offset_hours);
  return scheduledAt.toISOString();
}

export function renderNotificationCopy(template: string, context: NotificationRenderContext) {
  return template.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_match, token) => {
    const key = String(token || "").toLowerCase() as keyof NotificationRenderContext;
    return context[key] || "";
  });
}

export function renderNotificationEmailHtml(input: {
  title: string;
  body: string;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
}) {
  const paragraphs = input.body
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((paragraph) => `<p style="font-size:1rem;line-height:1.7;color:#d7dde8;margin:0 0 16px;">${paragraph}</p>`)
    .join("");

  const cta = input.ctaLabel && input.ctaUrl
    ? `<div style="margin:24px 0 0;"><a href="${input.ctaUrl}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#c9a227;color:#09162c;font-weight:800;text-decoration:none;">${input.ctaLabel}</a></div>`
    : "";

  return `
    <div style="font-family:'Montserrat',Arial,sans-serif;max-width:640px;margin:0 auto;background:#09162c;color:#f8fafc;padding:36px;border-radius:24px;">
      <div style="display:inline-flex;padding:6px 10px;border-radius:999px;background:rgba(201,162,39,0.12);color:#f6d86b;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;">Campus MetodologIA</div>
      <h1 style="font-family:'Poppins',Arial,sans-serif;font-size:28px;line-height:1.2;color:#f8fafc;margin:18px 0 14px;">${input.title}</h1>
      ${paragraphs}
      ${cta}
    </div>
  `;
}

export function getPortalUrl() {
  const siteUrl = (Deno.env.get("SITE_URL") || "http://127.0.0.1:4321").replace(/\/+$/, "");
  return `${siteUrl}/portal`;
}

export function getWebPushPublicKey() {
  return (Deno.env.get("VAPID_PUBLIC_KEY") || "").trim();
}

function getWebPushConfig() {
  const publicKey = (Deno.env.get("VAPID_PUBLIC_KEY") || "").trim();
  const privateKey = (Deno.env.get("VAPID_PRIVATE_KEY") || "").trim();
  const subject = (Deno.env.get("VAPID_SUBJECT") || "mailto:campus@metodologia.info").trim();

  if (!publicKey || !privateKey) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

export async function sendResendEmail(input: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = (Deno.env.get("RESEND_API_KEY") || "").trim();
  if (!apiKey) {
    throw createHttpError("RESEND_API_KEY no configurada", 503);
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      from: "Campus MetodologIA <campus@metodologia.info>",
      to: [input.to],
      subject: input.subject,
      html: input.html
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw createHttpError(
      typeof payload?.message === "string" && payload.message
        ? payload.message
        : "Fallo el envio con Resend",
      response.status
    );
  }

  return {
    id: typeof payload?.id === "string" ? payload.id : null,
    payload
  };
}

export async function sendWebPushNotification(input: {
  subscription: WebPushSubscriptionPayload;
  title: string;
  body: string;
  ctaUrl?: string | null;
  tag?: string;
}) {
  const config = getWebPushConfig();
  if (!config) {
    throw createHttpError("VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY no configuradas", 503);
  }

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    ctaUrl: input.ctaUrl || getPortalUrl(),
    tag: input.tag || "campus-notification"
  });

  const response = await webpush.sendNotification(input.subscription, payload);
  return {
    statusCode: response.statusCode,
    headers: response.headers
  };
}
