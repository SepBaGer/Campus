import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient, resolveUserFromRequest } from "../_shared/auth.ts";
import { completeDsarRequest, countRows, createDsarRequest, failDsarRequest, recordAuditEvent, sha256Hex } from "../_shared/dsar.ts";
import { corsHeaders, jsonResponse } from "../_shared/http.ts";

async function unwrap(resultPromise: Promise<{ data: unknown; error: { message: string } | null }>, label: string) {
  const { data, error } = await resultPromise;

  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }

  return data;
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
    dsarRequest = await createDsarRequest(adminClient, {
      personId: user.id,
      kind: "access",
      source: "dsar-export",
      eventType: "dsar_export_requested",
      evidence: {
        auth_context: "self_service_jwt"
      }
    });

    const [
      person,
      roles,
      dsarRequests,
      consents,
      notificationPreferences,
      webPushSubscriptions,
      notificationDispatches,
      entitlements,
      enrollments,
      checkoutIntents,
      paymentAllocations,
      attempts,
      mastery,
      reviewQueue,
      xapiStatements,
      projectSubmissions,
      badges
    ] = await Promise.all([
      unwrap(adminClient.schema("identity").from("person").select("*").eq("id", user.id).maybeSingle(), "identity.person"),
      unwrap(adminClient.schema("identity").from("person_role").select("*").eq("person_id", user.id), "identity.person_role"),
      unwrap(
        adminClient.schema("identity").from("dsar_request").select("*").eq("person_id", user.id).order("requested_at", { ascending: false }),
        "identity.dsar_request"
      ),
      unwrap(adminClient.schema("identity").from("person_consent").select("*").eq("person_id", user.id), "identity.person_consent"),
      unwrap(
        adminClient.schema("identity").from("person_notification_preference").select("*").eq("person_id", user.id),
        "identity.person_notification_preference"
      ),
      unwrap(
        adminClient.schema("identity").from("web_push_subscription").select("*").eq("person_id", user.id),
        "identity.web_push_subscription"
      ),
      unwrap(
        adminClient.schema("delivery").from("notification_dispatch").select("*").eq("person_id", user.id),
        "delivery.notification_dispatch"
      ),
      unwrap(adminClient.schema("enrollment").from("entitlement").select("*").eq("person_id", user.id), "enrollment.entitlement"),
      unwrap(adminClient.schema("enrollment").from("enrollment").select("*").eq("person_id", user.id), "enrollment.enrollment"),
      unwrap(adminClient.schema("enrollment").from("checkout_intent").select("*").eq("person_id", user.id), "enrollment.checkout_intent"),
      unwrap(
        adminClient.schema("enrollment").from("payment_allocation").select("*").eq("person_id", user.id),
        "enrollment.payment_allocation"
      ),
      unwrap(adminClient.schema("learning").from("attempt").select("*").eq("person_id", user.id), "learning.attempt"),
      unwrap(adminClient.schema("learning").from("mastery_state").select("*").eq("person_id", user.id), "learning.mastery_state"),
      unwrap(adminClient.schema("learning").from("spaced_schedule").select("*").eq("person_id", user.id), "learning.spaced_schedule"),
      unwrap(adminClient.schema("learning").from("xapi_statement").select("*").eq("person_id", user.id), "learning.xapi_statement"),
      unwrap(adminClient.schema("learning").from("project_submission").select("*").eq("person_id", user.id), "learning.project_submission"),
      unwrap(adminClient.schema("credentials").from("badge_assertion").select("*").eq("person_id", user.id), "credentials.badge_assertion")
    ]);

    const payload = {
      identity: {
        person,
        roles: roles || [],
        dsar_requests: dsarRequests || [],
        consents: consents || [],
        notification_preferences: notificationPreferences || [],
        web_push_subscriptions: webPushSubscriptions || []
      },
      delivery: {
        notification_dispatches: notificationDispatches || []
      },
      enrollment: {
        entitlements: entitlements || [],
        enrollments: enrollments || [],
        checkout_intents: checkoutIntents || [],
        payment_allocations: paymentAllocations || []
      },
      learning: {
        attempts: attempts || [],
        mastery_states: mastery || [],
        spaced_schedule: reviewQueue || [],
        xapi_statements: xapiStatements || [],
        project_submissions: projectSubmissions || []
      },
      credentials: badges || []
    };

    const exportSha256 = await sha256Hex(payload);
    const evidence = {
      export_sha256: exportSha256,
      counts: {
        roles: countRows(roles),
        dsar_requests: countRows(dsarRequests),
        consents: countRows(consents),
        notification_preferences: countRows(notificationPreferences),
        web_push_subscriptions: countRows(webPushSubscriptions),
        notification_dispatches: countRows(notificationDispatches),
        entitlements: countRows(entitlements),
        enrollments: countRows(enrollments),
        checkout_intents: countRows(checkoutIntents),
        payment_allocations: countRows(paymentAllocations),
        attempts: countRows(attempts),
        mastery_states: countRows(mastery),
        spaced_schedule: countRows(reviewQueue),
        xapi_statements: countRows(xapiStatements),
        project_submissions: countRows(projectSubmissions),
        credentials: countRows(badges)
      }
    };
    const completedRequest = await completeDsarRequest(adminClient, dsarRequest.id, "exported", evidence, {
      export_sha256: exportSha256
    });

    await recordAuditEvent(adminClient, {
      eventType: "dsar_export_completed",
      source: "dsar-export",
      actorPersonId: user.id,
      subjectPersonId: user.id,
      dsarRequestId: dsarRequest.id,
      metadata: evidence
    });

    return jsonResponse({
      ...payload,
      dsar_request: completedRequest
    });
  } catch (error) {
    if (adminClient && dsarRequest && personId) {
      try {
        await failDsarRequest(adminClient, dsarRequest.id, (error as Error).message);
        await recordAuditEvent(adminClient, {
          eventType: "dsar_export_failed",
          source: "dsar-export",
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
