import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@11.1.0?target=deno";
import { createAdminClient, resolveRequestOrigin, resolveUserFromRequest } from "../_shared/auth.ts";
import { corsHeaders, createHttpError, jsonResponse } from "../_shared/http.ts";
import {
  isStripeConnectDestinationReady,
  normalizeRevenueShareManifest
} from "../_shared/revenue-share.ts";

const allowedPlanCodes = new Set(["basic", "premium", "enterprise"]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await resolveUserFromRequest(req);
    const adminClient = createAdminClient();
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const origin = resolveRequestOrigin(req);

    const body = await req.json();
    const idempotencyKey = body.idempotency_key || body.idempotencyKey;
    const priceId = body.price_id;
    const planCode = body.plan_code || "premium";
    const planLabel = body.plan_label || planCode;
    const courseRunSlug = body.course_run_slug || "power-skills-pilot-open";

    if (!idempotencyKey) {
      throw createHttpError("Falta idempotency_key", 400);
    }

    if (!allowedPlanCodes.has(planCode)) {
      throw createHttpError("Plan invalido", 400);
    }

    const { data: existingIntent } = await adminClient
      .schema("enrollment")
      .from("checkout_intent")
      .select("id, status, checkout_url, stripe_session_id")
      .eq("person_id", user.id)
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingIntent) {
      return jsonResponse({
        ...existingIntent,
        reused: true
      });
    }

    const { data: courseRun, error: runError } = await adminClient
      .schema("delivery")
      .from("course_run")
      .select("id, title, revenue_share_manifest")
      .eq("slug", courseRunSlug)
      .maybeSingle();

    if (runError) {
      throw createHttpError(runError.message, 400);
    }

    const revenueShareManifest = normalizeRevenueShareManifest(courseRun?.revenue_share_manifest);
    const stripeConnectReady = isStripeConnectDestinationReady(revenueShareManifest);

    let checkoutUrl = `${origin}/portal?checkout=stub`;
    let stripeSessionId: string | null = null;
    let stripeSubscriptionId: string | null = null;
    let stripeCustomerId: string | null = null;
    let status = "pending";

    if (stripeKey && priceId) {
      const stripe = new Stripe(stripeKey, {
        apiVersion: "2022-11-15",
        httpClient: Stripe.createFetchHttpClient()
      });

      const sessionPayload: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        customer_email: user.email,
        client_reference_id: user.id,
        success_url: `${origin}/portal?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/curso/programa-empoderamiento-power-skills?checkout=cancelled`,
        metadata: {
          user_id: user.id,
          plan_code: planCode,
          plan_label: planLabel,
          course_run_slug: courseRunSlug,
          revenue_share_enabled: String(revenueShareManifest.enabled),
          revenue_share_mode: revenueShareManifest.settlement_mode,
          revenue_share_teacher_display_name: revenueShareManifest.teacher.display_name,
          revenue_share_teacher_person_id: revenueShareManifest.teacher.person_id || "",
          revenue_share_teacher_account_id: revenueShareManifest.teacher.stripe_account_id || "",
          revenue_share_teacher_percent: String(revenueShareManifest.split.teacher_percent),
          revenue_share_platform_percent: String(revenueShareManifest.split.platform_percent)
        },
        subscription_data: {
          metadata: {
            user_id: user.id,
            plan_code: planCode,
            plan_label: planLabel,
            course_run_slug: courseRunSlug,
            revenue_share_enabled: String(revenueShareManifest.enabled),
            revenue_share_mode: revenueShareManifest.settlement_mode,
            revenue_share_teacher_display_name: revenueShareManifest.teacher.display_name,
            revenue_share_teacher_person_id: revenueShareManifest.teacher.person_id || "",
            revenue_share_teacher_account_id: revenueShareManifest.teacher.stripe_account_id || "",
            revenue_share_teacher_percent: String(revenueShareManifest.split.teacher_percent),
            revenue_share_platform_percent: String(revenueShareManifest.split.platform_percent)
          }
        }
      };

      if (stripeConnectReady && revenueShareManifest.teacher.stripe_account_id) {
        sessionPayload.subscription_data = {
          ...(sessionPayload.subscription_data || {}),
          transfer_data: {
            destination: revenueShareManifest.teacher.stripe_account_id,
            amount_percent: revenueShareManifest.split.teacher_percent
          },
          on_behalf_of: revenueShareManifest.stripe_connect.on_behalf_of
            ? revenueShareManifest.teacher.stripe_account_id
            : undefined
        };
      }

      const session = await stripe.checkout.sessions.create(sessionPayload);

      checkoutUrl = session.url || checkoutUrl;
      stripeSessionId = session.id;
      stripeCustomerId = typeof session.customer === "string"
        ? session.customer
        : session.customer?.id || null;
      stripeSubscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id || null;
      status = "created";
    }

    const { data: insertedIntent, error: insertError } = await adminClient
      .schema("enrollment")
      .from("checkout_intent")
      .insert({
        person_id: user.id,
        course_run_id: courseRun?.id || null,
        idempotency_key: idempotencyKey,
        plan_code: planCode,
        status,
        stripe_session_id: stripeSessionId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        stripe_price_id: priceId || null,
        teacher_person_id: revenueShareManifest.teacher.person_id,
        stripe_connected_account_id: revenueShareManifest.teacher.stripe_account_id,
        revenue_share_snapshot: revenueShareManifest,
        checkout_url: checkoutUrl
      })
      .select("id, status, checkout_url, stripe_session_id")
      .single();

    if (insertError || !insertedIntent) {
      throw createHttpError(insertError?.message || "No se pudo crear el checkout", 400);
    }

    return jsonResponse({
      ...insertedIntent,
      live_mode: Boolean(stripeKey && priceId),
      course_run: courseRun?.title || courseRunSlug,
      revenue_share_enabled: revenueShareManifest.enabled,
      revenue_share_mode: revenueShareManifest.settlement_mode,
      stripe_connect_ready: Boolean(stripeKey && priceId && stripeConnectReady)
    });
  } catch (error) {
    const status = (error as { status?: number }).status || 400;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
