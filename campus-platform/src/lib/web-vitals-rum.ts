import {
  getSupabaseUrl,
  hasPublicSupabaseConfig,
  isLiveMode
} from "./supabase";
import type { MetricWithAttribution } from "web-vitals/attribution";

export type RumMetricName = "CLS" | "FCP" | "INP" | "LCP" | "TTFB";
export type RumRating = "good" | "needs-improvement" | "poor";
export type RumDeviceType = "mobile" | "tablet" | "desktop" | "unknown";

export interface RumMetricPayload {
  id: string;
  name: RumMetricName;
  value: number;
  delta: number;
  rating: RumRating;
  navigation_type: string;
  page_load_id: string;
  client_session_id: string;
  path: string;
  origin: string;
  viewport_width: number;
  viewport_height: number;
  device_type: RumDeviceType;
  effective_connection_type: string;
  visibility_state: string;
  sample_rate: number;
  reported_at: string;
  attribution: Record<string, string | number>;
}

const rumSessionKey = "mdg_rum_session_id";
const allowedMetricNames = new Set(["CLS", "FCP", "INP", "LCP", "TTFB"]);
const allowedRatings = new Set(["good", "needs-improvement", "poor"]);

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `00000000-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, "0")}`;
}

export function resolveRumSampleRate(rawValue: unknown) {
  const parsed = Number(rawValue ?? 1);
  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.min(1, Math.max(0, parsed));
}

function normalizeRumPathname(pathname: string) {
  const safePathname = pathname || "/";
  return safePathname.replace(/^\/verify\/[^/]+/i, "/verify/:token");
}

export function sanitizeRumPath(rawValue: string | undefined, origin = "https://campus.local") {
  if (!rawValue) {
    return "/";
  }

  try {
    const url = new URL(rawValue, origin);
    if (!["http:", "https:"].includes(url.protocol)) {
      return "/";
    }

    return normalizeRumPathname(url.pathname || "/");
  } catch {
    return rawValue.startsWith("/") ? normalizeRumPathname(rawValue.split(/[?#]/)[0] || "/") : "/";
  }
}

export function resolveRumDeviceType(width: number): RumDeviceType {
  if (!Number.isFinite(width) || width <= 0) {
    return "unknown";
  }

  if (width < 768) {
    return "mobile";
  }

  if (width < 1080) {
    return "tablet";
  }

  return "desktop";
}

export function getOrCreateRumSessionId(storage: Pick<Storage, "getItem" | "setItem"> | undefined) {
  if (!storage) {
    return createId();
  }

  try {
    const existing = storage.getItem(rumSessionKey);
    if (existing) {
      return existing;
    }

    const nextId = createId();
    storage.setItem(rumSessionKey, nextId);
    return nextId;
  } catch {
    return createId();
  }
}

function toFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Number(parsed.toFixed(4)) : 0;
}

function sanitizeText(value: unknown, maxLength = 180) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function sanitizeResourcePath(value: unknown) {
  const rawValue = sanitizeText(value, 512);
  if (!rawValue) {
    return "";
  }

  return sanitizeRumPath(rawValue);
}

function isAttributionRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function summarizeRumAttribution(metric: { name?: string; attribution?: unknown }) {
  const attribution = isAttributionRecord(metric.attribution) ? metric.attribution : {};
  const summary: Record<string, string | number> = {};

  const textFields = [
    "target",
    "interactionTarget",
    "interactionType",
    "loadState",
    "largestShiftTarget"
  ];
  const numberFields = [
    "inputDelay",
    "processingDuration",
    "presentationDelay",
    "largestShiftTime",
    "largestShiftValue",
    "timeToFirstByte",
    "resourceLoadDelay",
    "resourceLoadDuration",
    "elementRenderDelay"
  ];

  for (const field of textFields) {
    const value = sanitizeText(attribution[field]);
    if (value) {
      summary[field] = value;
    }
  }

  for (const field of numberFields) {
    const value = toFiniteNumber(attribution[field]);
    if (value > 0) {
      summary[field] = value;
    }
  }

  const resourcePath = sanitizeResourcePath(attribution.url);
  if (resourcePath) {
    summary.resourcePath = resourcePath;
  }

  return summary;
}

export function buildRumTarget(node: Node | null) {
  if (!(node instanceof Element)) {
    return undefined;
  }

  const tagName = node.tagName.toLowerCase();
  const rumId = node.getAttribute("data-rum-id");
  const i18nKey = node.getAttribute("data-i18n");
  const role = node.getAttribute("role");
  const className = Array.from(node.classList)
    .filter((entry) => /^[a-z0-9_-]{1,40}$/i.test(entry))
    .slice(0, 2)
    .join(".");

  if (rumId) {
    return `${tagName}[data-rum-id="${rumId.slice(0, 80)}"]`;
  }

  if (i18nKey) {
    return `${tagName}[data-i18n="${i18nKey.slice(0, 80)}"]`;
  }

  if (role) {
    return `${tagName}[role="${role.slice(0, 40)}"]`;
  }

  return className ? `${tagName}.${className}` : tagName;
}

function normalizeMetricName(value: unknown): RumMetricName {
  const name = typeof value === "string" ? value.toUpperCase() : "";
  return allowedMetricNames.has(name) ? name as RumMetricName : "TTFB";
}

function normalizeRating(value: unknown): RumRating {
  return allowedRatings.has(String(value)) ? value as RumRating : "needs-improvement";
}

function getConnectionType() {
  const connection = (navigator as Navigator & {
    connection?: { effectiveType?: string };
  }).connection;

  return connection?.effectiveType || "";
}

export function createRumPayload(metric: {
  id: string;
  name: string;
  value: number;
  delta: number;
  rating: string;
  navigationType?: string;
  attribution?: unknown;
}, context: {
  pageLoadId: string;
  clientSessionId: string;
  sampleRate: number;
  href: string;
  origin: string;
  viewportWidth: number;
  viewportHeight: number;
  visibilityState: string;
  effectiveConnectionType?: string;
}): RumMetricPayload {
  return {
    id: metric.id,
    name: normalizeMetricName(metric.name),
    value: toFiniteNumber(metric.value),
    delta: toFiniteNumber(metric.delta),
    rating: normalizeRating(metric.rating),
    navigation_type: metric.navigationType || "navigate",
    page_load_id: context.pageLoadId,
    client_session_id: context.clientSessionId,
    path: sanitizeRumPath(context.href, context.origin),
    origin: context.origin,
    viewport_width: Math.round(context.viewportWidth),
    viewport_height: Math.round(context.viewportHeight),
    device_type: resolveRumDeviceType(context.viewportWidth),
    effective_connection_type: context.effectiveConnectionType || "",
    visibility_state: context.visibilityState,
    sample_rate: context.sampleRate,
    reported_at: new Date().toISOString(),
    attribution: summarizeRumAttribution(metric)
  };
}

function sendRumPayload(payload: RumMetricPayload) {
  const supabaseUrl = getSupabaseUrl();
  const publishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !publishableKey) {
    return;
  }

  void fetch(`${supabaseUrl}/functions/v1/rum-web-vitals`, {
    method: "POST",
    headers: {
      "apikey": publishableKey,
      "authorization": `Bearer ${publishableKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ events: [payload] }),
    keepalive: true
  }).catch(() => {
    // RUM must never affect the learner journey.
  });
}

export function initWebVitalsRum() {
  const rumEnabled = import.meta.env.PUBLIC_CAMPUS_RUM_ENABLED !== "false";
  const sampleRate = resolveRumSampleRate(import.meta.env.PUBLIC_CAMPUS_RUM_SAMPLE_RATE);

  if (
    !rumEnabled
    || sampleRate <= 0
    || !isLiveMode()
    || !hasPublicSupabaseConfig()
    || typeof window === "undefined"
    || navigator.webdriver
    || Math.random() > sampleRate
  ) {
    return;
  }

  const pageLoadId = createId();
  const clientSessionId = getOrCreateRumSessionId(window.sessionStorage);

  const reportMetric = (metric: MetricWithAttribution) => {
    sendRumPayload(createRumPayload(metric, {
      pageLoadId,
      clientSessionId,
      sampleRate,
      href: window.location.href,
      origin: window.location.origin,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      visibilityState: document.visibilityState,
      effectiveConnectionType: getConnectionType()
    }));
  };

  void import("web-vitals/attribution").then(({ onCLS, onFCP, onINP, onLCP, onTTFB }) => {
    const attributionOptions = {
      generateTarget: buildRumTarget,
      reportAllChanges: false
    };

    onCLS(reportMetric, attributionOptions);
    onFCP(reportMetric, attributionOptions);
    onLCP(reportMetric, attributionOptions);
    onTTFB(reportMetric, attributionOptions);
    onINP(reportMetric, {
      ...attributionOptions,
      includeProcessedEventEntries: false
    });
  }).catch(() => {
    // Optional observability should not break the app shell.
  });
}
