import { createHttpError } from "./http.ts";

type JsonRecord = Record<string, unknown>;

export type OneRosterProvisionMode = "match_only" | "invite_missing";
export type OneRosterRoleCode = "student" | "teacher" | "admin" | "unknown";

export interface OneRosterManifest {
  enabled: boolean;
  provider: "oneroster";
  version: "1.2";
  baseUrl: string;
  auth: {
    method: "bearer";
    tokenSecretName: string;
  };
  sourcedIds: {
    school: string;
    class: string;
  };
  syncDirection: "pull";
  provisionMode: OneRosterProvisionMode;
  inviteRedirectPath: string;
  syncTeacherRoles: boolean;
  requestOptions: {
    limit: number;
    timeoutMs: number;
  };
}

export interface OneRosterSeatCandidate {
  schoolSourcedId: string;
  classSourcedId: string;
  enrollmentSourcedId: string;
  userSourcedId: string;
  roleCode: OneRosterRoleCode;
  externalStatus: "active" | "inactive";
  userEmail: string | null;
  userName: string;
  userUsername: string | null;
  userIdentifier: string | null;
  rawUser: JsonRecord;
  rawEnrollment: JsonRecord;
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

function normalizeLowercase(value: unknown) {
  return toStringValue(value).toLowerCase();
}

function normalizePath(value: unknown, fallback = "/portal") {
  const resolved = toStringValue(value) || fallback;
  return resolved.startsWith("/") ? resolved : fallback;
}

function normalizeBaseUrl(value: unknown) {
  const resolved = toStringValue(value).replace(/\/+$/, "");
  return resolved;
}

export function createDefaultOneRosterManifest(): OneRosterManifest {
  return {
    enabled: false,
    provider: "oneroster",
    version: "1.2",
    baseUrl: "",
    auth: {
      method: "bearer",
      tokenSecretName: ""
    },
    sourcedIds: {
      school: "",
      class: ""
    },
    syncDirection: "pull",
    provisionMode: "match_only",
    inviteRedirectPath: "/portal",
    syncTeacherRoles: false,
    requestOptions: {
      limit: 100,
      timeoutMs: 15000
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
    baseUrl: normalizeBaseUrl(manifest.base_url),
    auth: {
      method: "bearer",
      tokenSecretName: toStringValue(auth.token_secret_name)
    },
    sourcedIds: {
      school: toStringValue(sourcedIds.school),
      class: toStringValue(sourcedIds.class)
    },
    syncDirection: "pull",
    provisionMode: normalizeLowercase(manifest.provision_mode) === "invite_missing"
      ? "invite_missing"
      : "match_only",
    inviteRedirectPath: normalizePath(manifest.invite_redirect_path, defaults.inviteRedirectPath),
    syncTeacherRoles: toBoolean(manifest.sync_teacher_roles, defaults.syncTeacherRoles),
    requestOptions: {
      limit: Math.max(1, Math.min(500, toInteger(requestOptions.limit, defaults.requestOptions.limit))),
      timeoutMs: Math.max(1000, Math.min(60000, toInteger(requestOptions.timeout_ms, defaults.requestOptions.timeoutMs)))
    }
  };
}

export function serializeOneRosterManifest(value: unknown) {
  const manifest = normalizeOneRosterManifest(value);

  return {
    enabled: manifest.enabled,
    provider: manifest.provider,
    version: manifest.version,
    base_url: manifest.baseUrl || null,
    auth: {
      method: manifest.auth.method,
      token_secret_name: manifest.auth.tokenSecretName || null
    },
    sourced_ids: {
      school: manifest.sourcedIds.school || null,
      class: manifest.sourcedIds.class || null
    },
    sync_direction: manifest.syncDirection,
    provision_mode: manifest.provisionMode,
    invite_redirect_path: manifest.inviteRedirectPath,
    sync_teacher_roles: manifest.syncTeacherRoles,
    request_options: {
      limit: manifest.requestOptions.limit,
      timeout_ms: manifest.requestOptions.timeoutMs
    }
  } satisfies JsonRecord;
}

export function resolveOneRosterBearerToken(manifest: OneRosterManifest) {
  if (!manifest.auth.tokenSecretName) {
    throw createHttpError("OneRoster no tiene configurado auth.token_secret_name", 400);
  }

  const token = Deno.env.get(manifest.auth.tokenSecretName) || "";
  if (!token) {
    throw createHttpError(
      `No existe el secreto ${manifest.auth.tokenSecretName} para sincronizar OneRoster`,
      500
    );
  }

  return token;
}

function buildOneRosterUrl(
  manifest: OneRosterManifest,
  resourcePath: string,
  query?: Record<string, string | number | boolean | null | undefined>
) {
  const baseUrl = manifest.baseUrl.endsWith("/") ? manifest.baseUrl : `${manifest.baseUrl}/`;
  const url = new URL(resourcePath.replace(/^\/+/, ""), baseUrl);

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }
    url.searchParams.set(key, String(value));
  });

  return url;
}

function createTimedAbortSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeout)
  };
}

async function fetchOneRosterJson(
  manifest: OneRosterManifest,
  resourcePath: string,
  query?: Record<string, string | number | boolean | null | undefined>
) {
  const token = resolveOneRosterBearerToken(manifest);
  const request = buildOneRosterUrl(manifest, resourcePath, query);
  const { signal, cleanup } = createTimedAbortSignal(manifest.requestOptions.timeoutMs);

  try {
    const response = await fetch(request, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`
      },
      signal
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw createHttpError(
        `OneRoster devolvio ${response.status} al consultar ${request.pathname}: ${body || response.statusText}`,
        502
      );
    }

    const payload = await response.json().catch(() => ({}));
    return {
      payload: isRecord(payload) ? payload : {},
      headers: response.headers
    };
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw createHttpError(`OneRoster excedio el timeout al consultar ${request.pathname}`, 504);
    }
    throw error;
  } finally {
    cleanup();
  }
}

function readTotalCount(headers: Headers) {
  const raw = headers.get("x-total-count") || headers.get("X-Total-Count");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function fetchOneRosterCollection<T>(input: {
  manifest: OneRosterManifest;
  resourcePath: string;
  collectionKey: string;
  query?: Record<string, string | number | boolean | null | undefined>;
}) {
  const items: T[] = [];
  const limit = input.manifest.requestOptions.limit;
  let offset = 0;
  let totalCount: number | null = null;

  while (true) {
    const { payload, headers } = await fetchOneRosterJson(
      input.manifest,
      input.resourcePath,
      {
        ...(input.query || {}),
        limit,
        offset
      }
    );
    const page = Array.isArray(payload[input.collectionKey]) ? payload[input.collectionKey] as T[] : [];
    items.push(...page);
    totalCount = totalCount ?? readTotalCount(headers);

    if (!page.length) {
      break;
    }

    offset += page.length;
    if ((totalCount !== null && offset >= totalCount) || page.length < limit) {
      break;
    }
  }

  return items;
}

export async function fetchOneRosterResource<T>(input: {
  manifest: OneRosterManifest;
  resourcePath: string;
  resourceKey: string;
}) {
  const { payload } = await fetchOneRosterJson(input.manifest, input.resourcePath);
  return (payload[input.resourceKey] as T | undefined) || null;
}

function resolveLinkedSourcedId(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (isRecord(value)) {
    return toStringValue(value.sourcedId) || toStringValue(value.href).split("/").filter(Boolean).pop() || "";
  }

  return "";
}

export function resolveOneRosterRoleCode(value: unknown): OneRosterRoleCode {
  const normalized = normalizeLowercase(value);

  if (normalized === "student") {
    return "student";
  }

  if (["teacher", "proctor", "aide", "guardian", "parent", "relative"].includes(normalized)) {
    return "teacher";
  }

  if (["administrator", "systemadministrator", "districtadministrator"].includes(normalized)) {
    return "admin";
  }

  return "unknown";
}

export function resolveOneRosterEnrollmentStatus(value: unknown) {
  const normalized = normalizeLowercase(value);
  if (normalized === "inactive" || normalized === "tobedeleted") {
    return "inactive" as const;
  }
  return "active" as const;
}

export function extractOneRosterEmail(user: unknown) {
  if (!isRecord(user)) {
    return null;
  }

  const direct = toNullableString(user.email);
  if (direct?.includes("@")) {
    return direct.toLowerCase();
  }

  const username = toNullableString(user.username);
  if (username?.includes("@")) {
    return username.toLowerCase();
  }

  const identifier = toNullableString(user.identifier);
  if (identifier?.includes("@")) {
    return identifier.toLowerCase();
  }

  const userIds = Array.isArray(user.userIds) ? user.userIds : [];
  for (const candidate of userIds) {
    if (!isRecord(candidate)) continue;
    const maybeEmail = toNullableString(candidate.identifier)
      || toNullableString(candidate.value)
      || toNullableString(candidate.userId);
    if (maybeEmail?.includes("@")) {
      return maybeEmail.toLowerCase();
    }
  }

  return null;
}

export function extractOneRosterDisplayName(user: unknown) {
  if (!isRecord(user)) {
    return "";
  }

  const nameParts = [
    toStringValue(user.preferredFirstName),
    toStringValue(user.preferredMiddleName),
    toStringValue(user.preferredLastName)
  ].filter(Boolean);

  if (nameParts.length) {
    return nameParts.join(" ").trim();
  }

  const legalName = [
    toStringValue(user.givenName),
    toStringValue(user.middleName),
    toStringValue(user.familyName)
  ].filter(Boolean);

  if (legalName.length) {
    return legalName.join(" ").trim();
  }

  return toStringValue(user.username)
    || toStringValue(user.identifier)
    || toStringValue(user.sourcedId);
}

export function extractOneRosterIdentifiers(user: unknown) {
  if (!isRecord(user)) {
    return {
      username: null,
      identifier: null
    };
  }

  return {
    username: toNullableString(user.username),
    identifier: toNullableString(user.identifier)
  };
}

export function buildOneRosterSeatCandidate(input: {
  schoolSourcedId: string;
  classSourcedId: string;
  enrollment: unknown;
  user: unknown;
}) {
  const enrollment = isRecord(input.enrollment) ? input.enrollment : {};
  const user = isRecord(input.user) ? input.user : {};
  const enrollmentSourcedId = toStringValue(enrollment.sourcedId);
  const userSourcedId = resolveLinkedSourcedId(enrollment.user)
    || toStringValue(enrollment.userSourcedId)
    || toStringValue(user.sourcedId);

  if (!enrollmentSourcedId) {
    throw createHttpError("OneRoster devolvio un enrollment sin sourcedId", 502);
  }

  if (!userSourcedId) {
    throw createHttpError(`OneRoster devolvio el enrollment ${enrollmentSourcedId} sin user sourcedId`, 502);
  }

  const identifiers = extractOneRosterIdentifiers(user);

  return {
    schoolSourcedId: input.schoolSourcedId,
    classSourcedId: input.classSourcedId,
    enrollmentSourcedId,
    userSourcedId,
    roleCode: resolveOneRosterRoleCode(enrollment.role),
    externalStatus: resolveOneRosterEnrollmentStatus(enrollment.status),
    userEmail: extractOneRosterEmail(user),
    userName: extractOneRosterDisplayName(user),
    userUsername: identifiers.username,
    userIdentifier: identifiers.identifier,
    rawUser: user,
    rawEnrollment: enrollment
  } satisfies OneRosterSeatCandidate;
}
