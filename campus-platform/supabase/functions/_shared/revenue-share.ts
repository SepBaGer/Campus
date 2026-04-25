type JsonRecord = Record<string, unknown>;

export type RevenueShareSettlementMode = "manual_monthly" | "stripe_connect_destination_charge";

export interface RevenueShareManifest {
  enabled: boolean;
  settlement_mode: RevenueShareSettlementMode;
  currency: string;
  teacher: {
    person_id: string | null;
    display_name: string;
    stripe_account_id: string | null;
  };
  split: {
    platform_percent: number;
    teacher_percent: number;
  };
  settlement_window_days: number;
  minimum_amount_minor: number;
  stripe_connect: {
    charge_type: "destination";
    on_behalf_of: boolean;
  };
}

export interface RevenueShareAllocation {
  manifest: RevenueShareManifest;
  grossAmountMinor: number;
  taxAmountMinor: number;
  stripeFeeMinor: number;
  netAmountMinor: number;
  teacherAmountMinor: number;
  platformAmountMinor: number;
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

function roundPercent(value: number, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(100, Number(value.toFixed(2))));
}

function normalizeSettlementMode(value: unknown): RevenueShareSettlementMode {
  return toStringValue(value).toLowerCase() === "stripe_connect_destination_charge"
    ? "stripe_connect_destination_charge"
    : "manual_monthly";
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

export function isStripeConnectDestinationReady(manifest: RevenueShareManifest) {
  return manifest.enabled
    && manifest.settlement_mode === "stripe_connect_destination_charge"
    && Boolean(manifest.teacher.stripe_account_id);
}

export function resolveRevenueShareAllocation(input: {
  manifest: unknown;
  grossAmountMinor: number;
  taxAmountMinor?: number;
  stripeFeeMinor?: number;
}) {
  const manifest = normalizeRevenueShareManifest(input.manifest);
  const grossAmountMinor = Math.max(0, Math.round(input.grossAmountMinor || 0));
  const taxAmountMinor = Math.max(0, Math.round(input.taxAmountMinor || 0));
  const stripeFeeMinor = Math.max(0, Math.round(input.stripeFeeMinor || 0));
  const netAmountMinor = Math.max(0, grossAmountMinor - taxAmountMinor - stripeFeeMinor);
  const teacherAmountMinor = manifest.enabled
    ? Math.max(0, Math.round((netAmountMinor * manifest.split.teacher_percent) / 100))
    : 0;
  const platformAmountMinor = manifest.enabled
    ? Math.max(0, netAmountMinor - teacherAmountMinor)
    : netAmountMinor;

  return {
    manifest,
    grossAmountMinor,
    taxAmountMinor,
    stripeFeeMinor,
    netAmountMinor,
    teacherAmountMinor,
    platformAmountMinor
  } satisfies RevenueShareAllocation;
}
