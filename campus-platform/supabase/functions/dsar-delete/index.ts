import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient, resolveUserFromRequest } from "../_shared/auth.ts";
import { completeDsarRequest, createDsarRequest, failDsarRequest, recordAuditEvent } from "../_shared/dsar.ts";
import { corsHeaders, jsonResponse } from "../_shared/http.ts";

async function runMutation(resultPromise: Promise<{ error: { message: string } | null }>, label: string) {
  const { error } = await resultPromise;

  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let adminClient: ReturnType<typeof createAdminClient> | null = null;
  let dsarRequest: { id: string } | null = null;
  let personId: string | null = null;

  try {
    const user = await resolveUserFromRequest(req);
    personId = user.id;
    adminClient = createAdminClient();
    const archivedAt = new Date().toISOString();
    dsarRequest = await createDsarRequest(adminClient, {
      personId: user.id,
      kind: "deletion",
      source: "dsar-delete",
      eventType: "dsar_delete_requested",
      evidence: {
        auth_context: "self_service_jwt",
        retention_policy: "financial_records_retained"
      }
    });

    await Promise.all([
      runMutation(adminClient.schema("identity").from("person_consent").delete().eq("person_id", user.id), "identity.person_consent"),
      runMutation(
        adminClient.schema("identity").from("person_notification_preference").delete().eq("person_id", user.id),
        "identity.person_notification_preference"
      ),
      runMutation(
        adminClient.schema("identity").from("web_push_subscription").delete().eq("person_id", user.id),
        "identity.web_push_subscription"
      ),
      runMutation(
        adminClient.schema("delivery").from("notification_dispatch").delete().eq("person_id", user.id),
        "delivery.notification_dispatch"
      ),
      runMutation(adminClient.schema("learning").from("project_submission").delete().eq("person_id", user.id), "learning.project_submission"),
      runMutation(adminClient.schema("learning").from("xapi_statement").delete().eq("person_id", user.id), "learning.xapi_statement"),
      runMutation(adminClient.schema("learning").from("attempt").delete().eq("person_id", user.id), "learning.attempt"),
      runMutation(adminClient.schema("learning").from("mastery_state").delete().eq("person_id", user.id), "learning.mastery_state"),
      runMutation(adminClient.schema("learning").from("spaced_schedule").delete().eq("person_id", user.id), "learning.spaced_schedule"),
      runMutation(
        adminClient
          .schema("credentials")
          .from("badge_assertion")
          .update({ status: "revoked", revoked_at: archivedAt })
          .eq("person_id", user.id),
        "credentials.badge_assertion"
      ),
      runMutation(
        adminClient
          .schema("enrollment")
          .from("entitlement")
          .update({ status: "inactive", ends_at: archivedAt })
          .eq("person_id", user.id),
        "enrollment.entitlement"
      ),
      runMutation(
        adminClient
          .schema("enrollment")
          .from("enrollment")
          .update({ status: "cancelled" })
          .eq("person_id", user.id),
        "enrollment.enrollment"
      ),
      runMutation(
        adminClient
          .schema("identity")
          .from("person")
          .update({
            status: "archived",
            email: null,
            full_name: "deleted-user",
            avatar_url: null
          })
          .eq("id", user.id),
        "identity.person"
      )
    ]);

    const evidence = {
      archived_at: archivedAt,
      deleted_domains: [
        "identity.person_consent",
        "identity.person_notification_preference",
        "identity.web_push_subscription",
        "delivery.notification_dispatch",
        "learning.project_submission",
        "learning.xapi_statement",
        "learning.attempt",
        "learning.mastery_state",
        "learning.spaced_schedule"
      ],
      redacted_domains: ["identity.person"],
      revoked_domains: ["credentials.badge_assertion"],
      retained_domains: ["enrollment.checkout_intent", "enrollment.payment_allocation"],
      retention_policy: "financial_records_retained"
    };
    const completedRequest = await completeDsarRequest(adminClient, dsarRequest.id, "deleted", evidence, {
      delete_confirmed_at: archivedAt
    });

    await recordAuditEvent(adminClient, {
      eventType: "dsar_delete_completed",
      source: "dsar-delete",
      actorPersonId: user.id,
      subjectPersonId: user.id,
      dsarRequestId: dsarRequest.id,
      metadata: evidence
    });

    return jsonResponse({
      status: "archived",
      person_id: user.id,
      archived_at: archivedAt,
      dsar_request: completedRequest
    });
  } catch (error) {
    if (adminClient && dsarRequest && personId) {
      try {
        await failDsarRequest(adminClient, dsarRequest.id, (error as Error).message);
        await recordAuditEvent(adminClient, {
          eventType: "dsar_delete_failed",
          source: "dsar-delete",
          actorPersonId: personId,
          subjectPersonId: personId,
          dsarRequestId: dsarRequest.id,
          severity: "error",
          metadata: {
            error: (error as Error).message
          }
        });
      } catch (_) {
        // Preserve the original handler error.
      }
    }

    const status = (error as { status?: number }).status || 400;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
