import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@11.1.0?target=deno";
import { createAdminClient } from "../_shared/auth.ts";
import {
  createDefaultRevenueShareManifest,
  resolveRevenueShareAllocation
} from "../_shared/revenue-share.ts";

const ALLOWED_PLAN_CODES = new Set(["basic", "premium", "enterprise"]);

const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
const stripe = new Stripe(stripeKey, {
  apiVersion: "2022-11-15",
  httpClient: Stripe.createFetchHttpClient()
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

function mapStripeStatus(status: string) {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  return "cancelled";
}

function normalizePlanCode(planCode?: string | null) {
  if (planCode && ALLOWED_PLAN_CODES.has(planCode)) return planCode;
  return "premium";
}

function toNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toIsoFromUnix(value?: number | null) {
  return value ? new Date(value * 1000).toISOString() : null;
}

function extractInvoiceTaxAmount(invoice: Stripe.Invoice) {
  const directTax = Number((invoice as Stripe.Invoice & { tax?: number | null }).tax || 0);
  const aggregateTax = Array.isArray(invoice.total_tax_amounts)
    ? invoice.total_tax_amounts.reduce((sum, entry) => sum + Number(entry.amount || 0), 0)
    : 0;

  return Math.max(0, directTax || aggregateTax || 0);
}

async function syncLegacyProfileMembership(
  adminClient: ReturnType<typeof createAdminClient>,
  params: {
    userId?: string | null;
    planCode?: string | null;
    status: string;
    customerId?: string | null;
    expiresAt?: string | null;
  }
) {
  if (!params.userId) return;

  const { error } = await adminClient
    .from("profiles")
    .update({
      membership_status: params.status,
      membership_plan: normalizePlanCode(params.planCode),
      stripe_customer_id: params.customerId || null,
      membership_expires_at: params.expiresAt || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", params.userId);

  if (error) {
    console.warn("Legacy profile sync skipped:", error.message);
  }
}

async function resolveCourseRunBySlug(
  adminClient: ReturnType<typeof createAdminClient>,
  courseRunSlug?: string | null
) {
  if (!courseRunSlug) {
    return null;
  }

  const { data, error } = await adminClient
    .schema("delivery")
    .from("course_run")
    .select("id, slug, title, revenue_share_manifest")
    .eq("slug", courseRunSlug)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function resolveCheckoutIntent(
  adminClient: ReturnType<typeof createAdminClient>,
  params: {
    stripeSessionId?: string | null;
    stripeSubscriptionId?: string | null;
    stripeInvoiceId?: string | null;
  }
) {
  if (params.stripeSessionId) {
    const { data, error } = await adminClient
      .schema("enrollment")
      .from("checkout_intent")
      .select(
        "id, person_id, course_run_id, plan_code, status, stripe_session_id, stripe_subscription_id, stripe_invoice_id, revenue_share_snapshot, teacher_person_id, stripe_connected_account_id, course_run:course_run_id (id, slug, title, revenue_share_manifest)"
      )
      .eq("stripe_session_id", params.stripeSessionId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  if (params.stripeSubscriptionId) {
    const { data, error } = await adminClient
      .schema("enrollment")
      .from("checkout_intent")
      .select(
        "id, person_id, course_run_id, plan_code, status, stripe_session_id, stripe_subscription_id, stripe_invoice_id, revenue_share_snapshot, teacher_person_id, stripe_connected_account_id, course_run:course_run_id (id, slug, title, revenue_share_manifest)"
      )
      .eq("stripe_subscription_id", params.stripeSubscriptionId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  if (params.stripeInvoiceId) {
    const { data, error } = await adminClient
      .schema("enrollment")
      .from("checkout_intent")
      .select(
        "id, person_id, course_run_id, plan_code, status, stripe_session_id, stripe_subscription_id, stripe_invoice_id, revenue_share_snapshot, teacher_person_id, stripe_connected_account_id, course_run:course_run_id (id, slug, title, revenue_share_manifest)"
      )
      .eq("stripe_invoice_id", params.stripeInvoiceId)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  return null;
}

async function updateCheckoutIntent(
  adminClient: ReturnType<typeof createAdminClient>,
  checkoutIntentId: number,
  values: Record<string, unknown>
) {
  const { error } = await adminClient
    .schema("enrollment")
    .from("checkout_intent")
    .update(values)
    .eq("id", checkoutIntentId);

  if (error) {
    throw error;
  }
}

async function upsertPremiumAccess(
  adminClient: ReturnType<typeof createAdminClient>,
  params: {
    userId?: string | null;
    courseRunId?: number | null;
    planCode?: string | null;
    source: string;
    status: string;
    customerId?: string | null;
    expiresAt?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  if (!params.userId) {
    return;
  }

  const entitlementStatus = params.status === "active" ? "active" : params.status === "past_due" ? "past_due" : "cancelled";
  const enrollmentStatus = entitlementStatus === "cancelled" ? "cancelled" : "active";
  const metadata = params.metadata || {};

  const { error: entitlementError } = await adminClient
    .schema("enrollment")
    .from("entitlement")
    .upsert(
      {
        person_id: params.userId,
        code: "premium-membership",
        status: entitlementStatus,
        source: params.source,
        starts_at: new Date().toISOString(),
        ends_at: entitlementStatus === "cancelled" ? params.expiresAt || new Date().toISOString() : params.expiresAt,
        metadata: {
          ...metadata,
          stripe_customer_id: params.customerId || null,
          plan_code: normalizePlanCode(params.planCode)
        }
      },
      { onConflict: "person_id,code" }
    );

  if (entitlementError) {
    throw entitlementError;
  }

  if (params.courseRunId) {
    const { error: enrollmentError } = await adminClient
      .schema("enrollment")
      .from("enrollment")
      .upsert(
        {
          person_id: params.userId,
          course_run_id: params.courseRunId,
          status: enrollmentStatus,
          source: params.source
        },
        { onConflict: "person_id,course_run_id" }
      );

    if (enrollmentError) {
      throw enrollmentError;
    }
  }

  await syncLegacyProfileMembership(adminClient, {
    userId: params.userId,
    planCode: params.planCode,
    status: entitlementStatus,
    customerId: params.customerId,
    expiresAt: params.expiresAt
  });
}

async function upsertPaymentAllocation(
  adminClient: ReturnType<typeof createAdminClient>,
  params: {
    checkoutIntentId?: number | null;
    userId: string;
    courseRunId: number;
    planCode: string;
    teacherPersonId?: string | null;
    teacherStripeAccountId?: string | null;
    revenueShareSnapshot?: unknown;
    stripeSessionId?: string | null;
    stripeSubscriptionId?: string | null;
    stripeInvoiceId?: string | null;
    stripeChargeId?: string | null;
    stripeTransferId?: string | null;
    grossAmountMinor: number;
    taxAmountMinor: number;
    stripeFeeMinor: number;
    currency: string;
  }
) {
  const allocation = resolveRevenueShareAllocation({
    manifest: params.revenueShareSnapshot || createDefaultRevenueShareManifest(),
    grossAmountMinor: params.grossAmountMinor,
    taxAmountMinor: params.taxAmountMinor,
    stripeFeeMinor: params.stripeFeeMinor
  });

  const values = {
    checkout_intent_id: params.checkoutIntentId || null,
    person_id: params.userId,
    course_run_id: params.courseRunId,
    teacher_person_id: params.teacherPersonId || allocation.manifest.teacher.person_id,
    settlement_mode: allocation.manifest.settlement_mode,
    allocation_status: params.stripeTransferId ? "paid_out" : "recognized",
    plan_code: normalizePlanCode(params.planCode),
    currency: (params.currency || allocation.manifest.currency || "usd").toLowerCase(),
    gross_amount_minor: allocation.grossAmountMinor,
    tax_amount_minor: allocation.taxAmountMinor,
    stripe_fee_minor: allocation.stripeFeeMinor,
    net_amount_minor: allocation.netAmountMinor,
    teacher_amount_minor: allocation.teacherAmountMinor,
    platform_amount_minor: allocation.platformAmountMinor,
    teacher_share_percent: allocation.manifest.split.teacher_percent,
    platform_share_percent: allocation.manifest.split.platform_percent,
    stripe_session_id: params.stripeSessionId || null,
    stripe_subscription_id: params.stripeSubscriptionId || null,
    stripe_invoice_id: params.stripeInvoiceId || null,
    stripe_charge_id: params.stripeChargeId || null,
    stripe_transfer_id: params.stripeTransferId || null,
    stripe_connected_account_id: params.teacherStripeAccountId || allocation.manifest.teacher.stripe_account_id,
    revenue_share_snapshot: allocation.manifest,
    recognized_at: new Date().toISOString(),
    paid_out_at: params.stripeTransferId ? new Date().toISOString() : null
  };

  const { error } = await adminClient
    .schema("enrollment")
    .from("payment_allocation")
    .upsert(values, { onConflict: "stripe_invoice_id" });

  if (error) {
    throw error;
  }
}

async function retrieveSubscription(subscriptionId?: string | null) {
  if (!subscriptionId || !stripeKey) {
    return null;
  }

  return await stripe.subscriptions.retrieve(subscriptionId);
}

async function retrieveChargeDetails(chargeId?: string | null) {
  if (!chargeId || !stripeKey) {
    return {
      stripeFeeMinor: 0,
      stripeTransferId: null as string | null
    };
  }

  const charge = await stripe.charges.retrieve(chargeId, {
    expand: ["balance_transaction", "transfer"]
  });

  const balanceTransaction = typeof charge.balance_transaction === "object" && charge.balance_transaction
    ? charge.balance_transaction
    : null;
  const transfer = typeof charge.transfer === "object" && charge.transfer
    ? charge.transfer
    : null;

  return {
    stripeFeeMinor: balanceTransaction ? Number(balanceTransaction.fee || 0) : 0,
    stripeTransferId: transfer ? String(transfer.id) : toNullableString(charge.transfer)
  };
}

serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("No signature", { status: 400 });

  try {
    const body = await req.text();
    const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

    let event;
    if (endpointSecret) {
      event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret, undefined, cryptoProvider);
    } else {
      event = JSON.parse(body);
    }

    const adminClient = createAdminClient();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const invoiceId = typeof session.invoice === "string" ? session.invoice : session.invoice?.id;
      const subscription = await retrieveSubscription(subscriptionId);
      const checkoutIntent = await resolveCheckoutIntent(adminClient, {
        stripeSessionId: session.id,
        stripeSubscriptionId: subscriptionId,
        stripeInvoiceId: invoiceId
      });

      if (checkoutIntent?.id) {
        await updateCheckoutIntent(adminClient, Number(checkoutIntent.id), {
          status: session.payment_status === "paid" ? "completed" : "created",
          stripe_customer_id: customerId || null,
          stripe_subscription_id: subscriptionId || null,
          stripe_invoice_id: invoiceId || null
        });
      }

      await upsertPremiumAccess(adminClient, {
        userId: session.client_reference_id || session.metadata?.user_id || subscription?.metadata?.user_id,
        courseRunId: checkoutIntent?.course_run_id ? Number(checkoutIntent.course_run_id) : Number(checkoutIntent?.course_run?.id || 0) || null,
        planCode: subscription?.metadata?.plan_code || session.metadata?.plan_code || checkoutIntent?.plan_code || null,
        source: "stripe-webhook",
        status: session.payment_status === "paid" ? "active" : "past_due",
        customerId,
        expiresAt: toIsoFromUnix(subscription?.current_period_end ?? null),
        metadata: {
          stripe_session_id: session.id,
          stripe_subscription_id: subscriptionId || null,
          stripe_invoice_id: invoiceId || null
        }
      });
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      const chargeId = typeof invoice.charge === "string" ? invoice.charge : invoice.charge?.id;
      const subscription = await retrieveSubscription(subscriptionId);
      const checkoutIntent = await resolveCheckoutIntent(adminClient, {
        stripeSubscriptionId: subscriptionId,
        stripeInvoiceId: invoice.id
      });
      const courseRun = checkoutIntent?.course_run
        || await resolveCourseRunBySlug(
          adminClient,
          subscription?.metadata?.course_run_slug || invoice.lines.data[0]?.metadata?.course_run_slug || null
        );
      const { stripeFeeMinor, stripeTransferId } = await retrieveChargeDetails(chargeId);
      const revenueShareSnapshot = checkoutIntent?.revenue_share_snapshot
        || courseRun?.revenue_share_manifest
        || createDefaultRevenueShareManifest();
      const userId = checkoutIntent?.person_id
        || subscription?.metadata?.user_id
        || invoice.lines.data[0]?.metadata?.user_id;
      const planCode = checkoutIntent?.plan_code
        || subscription?.metadata?.plan_code
        || invoice.lines.data[0]?.metadata?.plan_code
        || null;

      if (checkoutIntent?.id) {
        await updateCheckoutIntent(adminClient, Number(checkoutIntent.id), {
          status: "completed",
          stripe_customer_id: customerId || null,
          stripe_subscription_id: subscriptionId || null,
          stripe_invoice_id: invoice.id,
          stripe_charge_id: chargeId || null
        });
      }

      if (userId && courseRun?.id) {
        await upsertPaymentAllocation(adminClient, {
          checkoutIntentId: checkoutIntent?.id ? Number(checkoutIntent.id) : null,
          userId: String(userId),
          courseRunId: Number(courseRun.id),
          planCode: normalizePlanCode(planCode),
          teacherPersonId: checkoutIntent?.teacher_person_id || null,
          teacherStripeAccountId: checkoutIntent?.stripe_connected_account_id || null,
          revenueShareSnapshot,
          stripeSessionId: checkoutIntent?.stripe_session_id || null,
          stripeSubscriptionId: subscriptionId || null,
          stripeInvoiceId: invoice.id,
          stripeChargeId: chargeId || null,
          stripeTransferId,
          grossAmountMinor: Number(invoice.total || invoice.amount_paid || 0),
          taxAmountMinor: extractInvoiceTaxAmount(invoice),
          stripeFeeMinor,
          currency: String(invoice.currency || "usd")
        });

        await upsertPremiumAccess(adminClient, {
          userId: String(userId),
          courseRunId: Number(courseRun.id),
          planCode,
          source: "stripe-webhook",
          status: subscription ? mapStripeStatus(subscription.status) : "active",
          customerId,
          expiresAt: toIsoFromUnix(subscription?.current_period_end ?? null),
          metadata: {
            stripe_invoice_id: invoice.id,
            stripe_charge_id: chargeId || null,
            stripe_subscription_id: subscriptionId || null,
            stripe_transfer_id: stripeTransferId
          }
        });
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      const subscription = await retrieveSubscription(subscriptionId);
      const checkoutIntent = await resolveCheckoutIntent(adminClient, {
        stripeSubscriptionId: subscriptionId,
        stripeInvoiceId: invoice.id
      });

      if (checkoutIntent?.id) {
        await updateCheckoutIntent(adminClient, Number(checkoutIntent.id), {
          status: "failed",
          stripe_customer_id: customerId || null,
          stripe_subscription_id: subscriptionId || null,
          stripe_invoice_id: invoice.id
        });
      }

      await upsertPremiumAccess(adminClient, {
        userId: checkoutIntent?.person_id || subscription?.metadata?.user_id,
        courseRunId: checkoutIntent?.course_run_id ? Number(checkoutIntent.course_run_id) : Number(checkoutIntent?.course_run?.id || 0) || null,
        planCode: checkoutIntent?.plan_code || subscription?.metadata?.plan_code || null,
        source: "stripe-webhook",
        status: "past_due",
        customerId,
        expiresAt: toIsoFromUnix(subscription?.current_period_end ?? null),
        metadata: {
          stripe_invoice_id: invoice.id,
          stripe_subscription_id: subscriptionId || null
        }
      });
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
      const checkoutIntent = await resolveCheckoutIntent(adminClient, {
        stripeSubscriptionId: subscription.id
      });

      if (checkoutIntent?.id) {
        await updateCheckoutIntent(adminClient, Number(checkoutIntent.id), {
          status: mapStripeStatus(subscription.status) === "cancelled" ? "failed" : "completed",
          stripe_customer_id: customerId || null,
          stripe_subscription_id: subscription.id
        });
      }

      await upsertPremiumAccess(adminClient, {
        userId: checkoutIntent?.person_id || subscription.metadata?.user_id,
        courseRunId: checkoutIntent?.course_run_id ? Number(checkoutIntent.course_run_id) : Number(checkoutIntent?.course_run?.id || 0) || null,
        planCode: checkoutIntent?.plan_code || subscription.metadata?.plan_code || null,
        source: "stripe-webhook",
        status: mapStripeStatus(subscription.status),
        customerId,
        expiresAt: toIsoFromUnix(subscription.current_period_end),
        metadata: {
          stripe_subscription_id: subscription.id
        }
      });
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
      const checkoutIntent = await resolveCheckoutIntent(adminClient, {
        stripeSubscriptionId: subscription.id
      });

      if (checkoutIntent?.id) {
        await updateCheckoutIntent(adminClient, Number(checkoutIntent.id), {
          status: "failed",
          stripe_customer_id: customerId || null,
          stripe_subscription_id: subscription.id
        });
      }

      await upsertPremiumAccess(adminClient, {
        userId: checkoutIntent?.person_id || subscription.metadata?.user_id,
        courseRunId: checkoutIntent?.course_run_id ? Number(checkoutIntent.course_run_id) : Number(checkoutIntent?.course_run?.id || 0) || null,
        planCode: checkoutIntent?.plan_code || subscription.metadata?.plan_code || null,
        source: "stripe-webhook",
        status: "cancelled",
        customerId,
        expiresAt: toIsoFromUnix(subscription.current_period_end),
        metadata: {
          stripe_subscription_id: subscription.id
        }
      });
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error(`Webhook Error: ${(error as Error).message}`);
    return new Response(`Webhook Error: ${(error as Error).message}`, { status: 400 });
  }
});
