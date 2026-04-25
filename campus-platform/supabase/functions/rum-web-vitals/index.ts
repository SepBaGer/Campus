import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient } from "../_shared/auth.ts";
import { corsHeaders, createHttpError, jsonResponse } from "../_shared/http.ts";

const allowedMetricNames = new Set(["CLS", "FCP", "INP", "LCP", "TTFB"]);
const allowedRatings = new Set(["good", "needs-improvement", "poor"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type IncomingMetric = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function toFiniteNumber(value: unknown, fallback = 0) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : fallback;
}

function toOptionalInteger(value: unknown) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0 || numberValue > 10000) {
    return null;
  }

  return Math.round(numberValue);
}

function sanitizeString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function sanitizePath(value: unknown) {
  const rawValue = sanitizeString(value, 512);
  if (!rawValue) {
    return "/";
  }

  const normalizePathname = (pathname: string) =>
    (pathname || "/").replace(/^\/verify\/[^/]+/i, "/verify/:token");

  try {
    const url = new URL(rawValue, "https://campus.local");
    return url.pathname.startsWith("/") ? normalizePathname(url.pathname).slice(0, 512) : "/";
  } catch {
    return rawValue.startsWith("/") ? normalizePathname(rawValue.split(/[?#]/)[0]).slice(0, 512) : "/";
  }
}

function sanitizeRating(value: unknown) {
  const rating = sanitizeString(value, 32);
  return allowedRatings.has(rating) ? rating : "needs-improvement";
}

function sanitizeUuid(value: unknown) {
  const rawValue = sanitizeString(value, 64);
  return uuidPattern.test(rawValue) ? rawValue : crypto.randomUUID();
}

function sanitizeDeviceType(value: unknown) {
  const rawValue = sanitizeString(value, 24);
  return ["mobile", "tablet", "desktop", "unknown"].includes(rawValue) ? rawValue : "unknown";
}

function sanitizeAttribution(value: unknown) {
  const source = isRecord(value) ? value : {};
  const allowedKeys = [
    "target",
    "interactionTarget",
    "interactionType",
    "loadState",
    "inputDelay",
    "processingDuration",
    "presentationDelay",
    "largestShiftTarget",
    "largestShiftTime",
    "largestShiftValue",
    "timeToFirstByte",
    "resourceLoadDelay",
    "resourceLoadDuration",
    "elementRenderDelay",
    "resourcePath"
  ];
  const output: Record<string, string | number> = {};

  for (const key of allowedKeys) {
    const entry = source[key];
    if (typeof entry === "number" && Number.isFinite(entry)) {
      output[key] = Math.max(0, Number(entry.toFixed(4)));
      continue;
    }

    if (typeof entry === "string") {
      output[key] = sanitizeString(entry, 180);
    }
  }

  return output;
}

function assertPublishableKey(req: Request) {
  const acceptedKeys = [
    Deno.env.get("SUPABASE_ANON_KEY"),
    Deno.env.get("RUM_PUBLISHABLE_KEY")
  ].filter((value): value is string => Boolean(value));

  if (!acceptedKeys.length) {
    return;
  }

  const authorization = req.headers.get("authorization") || "";
  const bearer = authorization.replace(/^Bearer\s+/i, "").trim();
  const apiKey = req.headers.get("apikey") || bearer;

  if (!acceptedKeys.includes(apiKey)) {
    throw createHttpError("No autorizado", 401);
  }
}

function normalizeMetric(input: IncomingMetric, req: Request) {
  const metricName = sanitizeString(input.name || input.metric_name, 16).toUpperCase();
  if (!allowedMetricNames.has(metricName)) {
    throw createHttpError("Metrica no soportada", 400);
  }

  const sampleRate = Math.min(1, Math.max(0.00001, toFiniteNumber(input.sample_rate, 1)));
  const reportedAt = sanitizeString(input.reported_at, 64);

  return {
    event_id: sanitizeString(input.id || input.event_id, 128) || crypto.randomUUID(),
    page_load_id: sanitizeUuid(input.page_load_id),
    client_session_id: sanitizeUuid(input.client_session_id),
    metric_name: metricName,
    metric_value: toFiniteNumber(input.value || input.metric_value),
    metric_delta: toFiniteNumber(input.delta || input.metric_delta),
    metric_rating: sanitizeRating(input.rating || input.metric_rating),
    navigation_type: sanitizeString(input.navigation_type, 48) || "navigate",
    page_path: sanitizePath(input.path || input.page_path),
    page_origin: sanitizeString(input.origin || input.page_origin || req.headers.get("origin"), 180),
    viewport_width: toOptionalInteger(input.viewport_width),
    viewport_height: toOptionalInteger(input.viewport_height),
    device_type: sanitizeDeviceType(input.device_type),
    effective_connection_type: sanitizeString(input.effective_connection_type, 32) || null,
    visibility_state: sanitizeString(input.visibility_state, 32) || null,
    sample_rate: sampleRate,
    attribution: sanitizeAttribution(input.attribution),
    source: "web-vitals",
    reported_at: reportedAt || new Date().toISOString()
  };
}

function extractEvents(body: unknown) {
  if (!isRecord(body)) {
    return [];
  }

  const rawEvents = Array.isArray(body.events) ? body.events : [body];
  return rawEvents.filter(isRecord).slice(0, 10);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method === "GET") {
    return jsonResponse({ status: "ok", endpoint: "rum-web-vitals" });
  }

  try {
    if (req.method !== "POST") {
      throw createHttpError("Metodo no soportado", 405);
    }

    assertPublishableKey(req);

    const body = await req.json().catch(() => ({}));
    const incomingEvents = extractEvents(body);
    if (!incomingEvents.length) {
      throw createHttpError("Payload sin eventos RUM", 400);
    }

    const rows = incomingEvents.map((event) => normalizeMetric(event, req));
    const { data, error } = await createAdminClient()
      .rpc("ingest_web_vital_events", { payload: rows });

    if (error) {
      throw createHttpError(error.message, 400);
    }

    return jsonResponse({ accepted: rows.length, inserted: data ?? 0 }, 202);
  } catch (error) {
    const status = (error as { status?: number }).status || 400;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
