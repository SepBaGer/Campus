type SupabaseAdminClient = {
  schema: (schema: string) => {
    from: (table: string) => any;
  };
};

type DsarKind = "access" | "deletion" | "access_deletion" | "rectification" | "portability";
type DsarStatus = "processing" | "exported" | "deleted" | "failed";

type DsarRequestOptions = {
  personId: string;
  kind: DsarKind;
  source: string;
  eventType: string;
  evidence?: Record<string, unknown>;
};

type AuditEventOptions = {
  eventType: string;
  source: string;
  actorPersonId?: string;
  subjectPersonId?: string;
  dsarRequestId?: string;
  severity?: "debug" | "info" | "warning" | "error" | "critical";
  metadata?: Record<string, unknown>;
};

function normalizeObject(value: Record<string, unknown> = {}) {
  return JSON.parse(JSON.stringify(value));
}

export function countRows(value: unknown) {
  if (!value) {
    return 0;
  }

  return Array.isArray(value) ? value.length : 1;
}

export async function sha256Hex(value: unknown) {
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function recordAuditEvent(adminClient: SupabaseAdminClient, options: AuditEventOptions) {
  const { error } = await adminClient
    .schema("audit")
    .from("event")
    .insert({
      event_type: options.eventType,
      severity: options.severity || "info",
      source: options.source,
      actor_person_id: options.actorPersonId || null,
      subject_person_id: options.subjectPersonId || null,
      dsar_request_id: options.dsarRequestId || null,
      metadata: normalizeObject(options.metadata || {})
    });

  if (error) {
    throw new Error(`audit.event: ${error.message}`);
  }
}

export async function createDsarRequest(adminClient: SupabaseAdminClient, options: DsarRequestOptions) {
  const now = new Date().toISOString();
  const { data, error } = await adminClient
    .schema("identity")
    .from("dsar_request")
    .insert({
      person_id: options.personId,
      kind: options.kind,
      status: "processing",
      request_source: options.source,
      verification_method: "self_service_jwt",
      verified_at: now,
      evidence: normalizeObject(options.evidence || {})
    })
    .select("id, person_id, kind, status, requested_at, due_at, resolved_at, export_sha256, delete_confirmed_at")
    .single();

  if (error) {
    throw new Error(`identity.dsar_request: ${error.message}`);
  }

  await recordAuditEvent(adminClient, {
    eventType: options.eventType,
    source: options.source,
    actorPersonId: options.personId,
    subjectPersonId: options.personId,
    dsarRequestId: data.id,
    metadata: {
      kind: options.kind,
      request_source: options.source
    }
  });

  return data;
}

export async function completeDsarRequest(
  adminClient: SupabaseAdminClient,
  requestId: string,
  status: DsarStatus,
  evidence: Record<string, unknown>,
  extra: Record<string, unknown> = {}
) {
  const now = new Date().toISOString();
  const updatePayload = {
    status,
    resolved_at: now,
    evidence: normalizeObject(evidence),
    error_message: null,
    ...extra
  };

  const { data, error } = await adminClient
    .schema("identity")
    .from("dsar_request")
    .update(updatePayload)
    .eq("id", requestId)
    .select("id, person_id, kind, status, requested_at, due_at, resolved_at, export_sha256, delete_confirmed_at, evidence")
    .single();

  if (error) {
    throw new Error(`identity.dsar_request: ${error.message}`);
  }

  return data;
}

export async function failDsarRequest(adminClient: SupabaseAdminClient, requestId: string, message: string) {
  const { error } = await adminClient
    .schema("identity")
    .from("dsar_request")
    .update({
      status: "failed",
      resolved_at: new Date().toISOString(),
      error_message: message
    })
    .eq("id", requestId);

  if (error) {
    throw new Error(`identity.dsar_request: ${error.message}`);
  }
}
