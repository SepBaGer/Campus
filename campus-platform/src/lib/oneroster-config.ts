import type {
  OneRosterManifest,
  OneRosterProvisionMode
} from "./platform-types";

type JsonRecord = Record<string, unknown>;

export interface OneRosterAuthoringModel {
  enabled: boolean;
  baseUrl: string;
  schoolSourcedId: string;
  classSourcedId: string;
  tokenSecretName: string;
  provisionMode: OneRosterProvisionMode;
  inviteRedirectPath: string;
  syncTeacherRoles: boolean;
  requestLimit: number;
  timeoutMs: number;
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

function toInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

function normalizeInviteRedirectPath(value: unknown) {
  const resolved = toStringValue(value) || "/portal";
  return resolved.startsWith("/") ? resolved : "/portal";
}

export function createDefaultOneRosterManifest(): OneRosterManifest {
  return {
    enabled: false,
    provider: "oneroster",
    version: "1.2",
    base_url: null,
    auth: {
      method: "bearer",
      token_secret_name: null
    },
    sourced_ids: {
      school: null,
      class: null
    },
    sync_direction: "pull",
    provision_mode: "match_only",
    invite_redirect_path: "/portal",
    sync_teacher_roles: false,
    request_options: {
      limit: 100,
      timeout_ms: 15000
    }
  };
}

export function normalizeOneRosterManifest(value: unknown): OneRosterManifest {
  const defaults = createDefaultOneRosterManifest();
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

  const auth = isRecord(manifest.auth) ? manifest.auth : {};
  const sourcedIds = isRecord(manifest.sourced_ids) ? manifest.sourced_ids : {};
  const requestOptions = isRecord(manifest.request_options) ? manifest.request_options : {};

  return {
    enabled: toBoolean(manifest.enabled, defaults.enabled),
    provider: "oneroster",
    version: "1.2",
    base_url: toNullableString(manifest.base_url),
    auth: {
      method: "bearer",
      token_secret_name: toNullableString(auth.token_secret_name)
    },
    sourced_ids: {
      school: toNullableString(sourcedIds.school),
      class: toNullableString(sourcedIds.class)
    },
    sync_direction: "pull",
    provision_mode: toStringValue(manifest.provision_mode).toLowerCase() === "invite_missing"
      ? "invite_missing"
      : "match_only",
    invite_redirect_path: normalizeInviteRedirectPath(manifest.invite_redirect_path),
    sync_teacher_roles: toBoolean(manifest.sync_teacher_roles, defaults.sync_teacher_roles),
    request_options: {
      limit: Math.max(1, Math.min(500, toInteger(requestOptions.limit, defaults.request_options.limit))),
      timeout_ms: Math.max(1000, Math.min(60000, toInteger(requestOptions.timeout_ms, defaults.request_options.timeout_ms)))
    }
  };
}

export function formatOneRosterSummary(manifest: OneRosterManifest) {
  if (!manifest.enabled) {
    return "OneRoster deshabilitado para esta cohorte.";
  }

  const school = manifest.sourced_ids.school || "school sin sourcedId";
  const klass = manifest.sourced_ids.class || "class sin sourcedId";
  const token = manifest.auth.token_secret_name || "sin secreto";
  const mode = manifest.provision_mode === "invite_missing"
    ? "invita faltantes"
    : "solo match local";
  const teacherLabel = manifest.sync_teacher_roles ? "incluye docentes" : "solo learners";

  return `${school} / ${klass} | ${mode} | ${teacherLabel} | secret ${token}`;
}

export function resolveOneRosterAuthoringModel(value: unknown): OneRosterAuthoringModel {
  const manifest = normalizeOneRosterManifest(value);

  return {
    enabled: manifest.enabled,
    baseUrl: manifest.base_url || "",
    schoolSourcedId: manifest.sourced_ids.school || "",
    classSourcedId: manifest.sourced_ids.class || "",
    tokenSecretName: manifest.auth.token_secret_name || "",
    provisionMode: manifest.provision_mode,
    inviteRedirectPath: manifest.invite_redirect_path,
    syncTeacherRoles: manifest.sync_teacher_roles,
    requestLimit: manifest.request_options.limit,
    timeoutMs: manifest.request_options.timeout_ms,
    summary: formatOneRosterSummary(manifest)
  };
}

export function buildOneRosterManifestFromForm(formData: FormData): OneRosterManifest {
  const defaults = createDefaultOneRosterManifest();

  return {
    enabled: toBoolean(formData.get("oneroster_enabled"), defaults.enabled),
    provider: "oneroster",
    version: "1.2",
    base_url: toNullableString(formData.get("oneroster_base_url")),
    auth: {
      method: "bearer",
      token_secret_name: toNullableString(formData.get("oneroster_token_secret_name"))
    },
    sourced_ids: {
      school: toNullableString(formData.get("oneroster_school_sourced_id")),
      class: toNullableString(formData.get("oneroster_class_sourced_id"))
    },
    sync_direction: "pull",
    provision_mode: toStringValue(formData.get("oneroster_provision_mode")).toLowerCase() === "invite_missing"
      ? "invite_missing"
      : "match_only",
    invite_redirect_path: normalizeInviteRedirectPath(formData.get("oneroster_invite_redirect_path")),
    sync_teacher_roles: toBoolean(formData.get("oneroster_sync_teacher_roles"), defaults.sync_teacher_roles),
    request_options: {
      limit: Math.max(1, Math.min(500, toInteger(formData.get("oneroster_request_limit"), defaults.request_options.limit))),
      timeout_ms: Math.max(1000, Math.min(60000, toInteger(formData.get("oneroster_timeout_ms"), defaults.request_options.timeout_ms)))
    }
  };
}
