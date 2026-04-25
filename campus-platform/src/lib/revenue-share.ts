import type {
  RevenueShareManifest,
  RevenueShareSettlementMode
} from "./platform-types";

type JsonRecord = Record<string, unknown>;

export interface RevenueShareAuthoringModel {
  enabled: boolean;
  settlementMode: RevenueShareSettlementMode;
  currency: string;
  teacherPersonId: string;
  teacherDisplayName: string;
  stripeAccountId: string;
  platformPercent: number;
  teacherPercent: number;
  settlementWindowDays: number;
  minimumAmountMinor: number;
  onBehalfOf: boolean;
  summary: string;
}

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

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSettlementMode(value: unknown): RevenueShareSettlementMode {
  return toStringValue(value).toLowerCase() === "stripe_connect_destination_charge"
    ? "stripe_connect_destination_charge"
    : "manual_monthly";
}

function roundPercent(value: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Number(value.toFixed(2))));
}

export function createDefaultRevenueShareManifest(): RevenueShareManifest {
  return {
    enabled: false,
    settlement_mode: "manual_monthly",
    currency: "usd",
    teacher: {
      person_id: null,
      display_name: "Docente invitado",
      stripe_account_id: null
    },
    split: {
      platform_percent: 30,
      teacher_percent: 70
    },
    settlement_window_days: 15,
    minimum_amount_minor: 0,
    stripe_connect: {
      charge_type: "destination",
      on_behalf_of: false
    }
  };
}

export function normalizeRevenueShareManifest(value: unknown): RevenueShareManifest {
  const defaults = createDefaultRevenueShareManifest();
  let manifest: JsonRecord = {};

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      manifest = isRecord(parsed) ? parsed : {};
    } catch {
      manifest = {};
    }
  } else {
    manifest = isRecord(value) ? value : {};
  }
  const teacher = isRecord(manifest.teacher) ? manifest.teacher : {};
  const split = isRecord(manifest.split) ? manifest.split : {};
  const stripeConnect = isRecord(manifest.stripe_connect) ? manifest.stripe_connect : {};

  const platformPercent = roundPercent(
    toNumber(split.platform_percent, defaults.split.platform_percent),
    defaults.split.platform_percent
  );
  const teacherPercent = roundPercent(
    toNumber(split.teacher_percent, defaults.split.teacher_percent),
    defaults.split.teacher_percent
  );
  const percentTotal = Number((platformPercent + teacherPercent).toFixed(2));

  return {
    enabled: toBoolean(manifest.enabled, defaults.enabled),
    settlement_mode: normalizeSettlementMode(manifest.settlement_mode),
    currency: toStringValue(manifest.currency).toLowerCase() || defaults.currency,
    teacher: {
      person_id: toNullableString(teacher.person_id),
      display_name: toStringValue(teacher.display_name) || defaults.teacher.display_name,
      stripe_account_id: toNullableString(teacher.stripe_account_id)
    },
    split: percentTotal === 100
      ? {
          platform_percent: platformPercent,
          teacher_percent: teacherPercent
        }
      : { ...defaults.split },
    settlement_window_days: Math.max(
      0,
      Math.round(toNumber(manifest.settlement_window_days, defaults.settlement_window_days))
    ),
    minimum_amount_minor: Math.max(
      0,
      Math.round(toNumber(manifest.minimum_amount_minor, defaults.minimum_amount_minor))
    ),
    stripe_connect: {
      charge_type: "destination",
      on_behalf_of: toBoolean(
        stripeConnect.on_behalf_of,
        defaults.stripe_connect.on_behalf_of
      )
    }
  };
}

export function formatRevenueShareSummary(value: RevenueShareManifest) {
  if (!value.enabled) {
    return "Revenue share inactivo para esta cohorte.";
  }

  const splitLabel = `${value.split.platform_percent}% plataforma / ${value.split.teacher_percent}% docente`;
  const settlementLabel = value.settlement_mode === "stripe_connect_destination_charge"
    ? "Stripe Connect inmediato"
    : `Liquidacion mensual T+${value.settlement_window_days}`;
  const teacherLabel = value.teacher.display_name || "Docente invitado";
  const thresholdLabel = value.minimum_amount_minor > 0
    ? `| minimo ${value.minimum_amount_minor} ${value.currency.toUpperCase()} minor`
    : "";

  return `${splitLabel} | ${teacherLabel} | ${settlementLabel}${thresholdLabel}`;
}

export function resolveRevenueShareAuthoringModel(value: unknown): RevenueShareAuthoringModel {
  const manifest = normalizeRevenueShareManifest(value);

  return {
    enabled: manifest.enabled,
    settlementMode: manifest.settlement_mode,
    currency: manifest.currency,
    teacherPersonId: manifest.teacher.person_id || "",
    teacherDisplayName: manifest.teacher.display_name,
    stripeAccountId: manifest.teacher.stripe_account_id || "",
    platformPercent: manifest.split.platform_percent,
    teacherPercent: manifest.split.teacher_percent,
    settlementWindowDays: manifest.settlement_window_days,
    minimumAmountMinor: manifest.minimum_amount_minor,
    onBehalfOf: manifest.stripe_connect.on_behalf_of,
    summary: formatRevenueShareSummary(manifest)
  };
}

export function buildRevenueShareManifestFromForm(formData: FormData) {
  const defaults = createDefaultRevenueShareManifest();
  const manifest: RevenueShareManifest = {
    enabled: toBoolean(formData.get("revenue_share_enabled"), defaults.enabled),
    settlement_mode: normalizeSettlementMode(formData.get("revenue_share_settlement_mode")),
    currency: toStringValue(formData.get("revenue_share_currency")).toLowerCase() || defaults.currency,
    teacher: {
      person_id: toNullableString(formData.get("revenue_share_teacher_person_id")),
      display_name: toStringValue(formData.get("revenue_share_teacher_display_name"))
        || defaults.teacher.display_name,
      stripe_account_id: toNullableString(formData.get("revenue_share_teacher_stripe_account_id"))
    },
    split: {
      platform_percent: roundPercent(
        toNumber(formData.get("revenue_share_platform_percent"), defaults.split.platform_percent),
        defaults.split.platform_percent
      ),
      teacher_percent: roundPercent(
        toNumber(formData.get("revenue_share_teacher_percent"), defaults.split.teacher_percent),
        defaults.split.teacher_percent
      )
    },
    settlement_window_days: Math.max(
      0,
      Math.round(toNumber(formData.get("revenue_share_settlement_window_days"), defaults.settlement_window_days))
    ),
    minimum_amount_minor: Math.max(
      0,
      Math.round(toNumber(formData.get("revenue_share_minimum_amount_minor"), defaults.minimum_amount_minor))
    ),
    stripe_connect: {
      charge_type: "destination",
      on_behalf_of: toBoolean(
        formData.get("revenue_share_on_behalf_of"),
        defaults.stripe_connect.on_behalf_of
      )
    }
  };

  return manifest;
}
