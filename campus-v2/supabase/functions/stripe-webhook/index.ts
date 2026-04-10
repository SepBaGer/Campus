import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'

const ALLOWED_PLAN_CODES = new Set(['basic', 'premium', 'enterprise'])

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient()
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

function mapStripeStatus(status: string) {
  if (status === 'active' || status === 'trialing') return 'active'
  if (status === 'past_due' || status === 'unpaid') return 'past_due'
  return 'cancelled'
}

function normalizePlanCode(planCode?: string | null) {
  if (planCode && ALLOWED_PLAN_CODES.has(planCode)) return planCode
  return 'premium'
}

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('No signature', { status: 400 })

  try {
    const body = await req.text()
    const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

    let event
    if (endpointSecret) {
      event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret, undefined, cryptoProvider)
    } else {
      event = JSON.parse(body)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const syncMembership = async (params: {
      userId?: string | null
      planCode?: string | null
      status: string
      customerId?: string | null
      expiresAt?: string | null
    }) => {
      if (!params.userId) return

      const { error } = await supabase
        .from('profiles')
        .update({
          membership_status: params.status,
          membership_plan: normalizePlanCode(params.planCode),
          stripe_customer_id: params.customerId || null,
          membership_expires_at: params.expiresAt || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.userId)

      if (error) throw error
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
      let expiresAt: string | null = null
      let planCode = session.metadata?.plan_code || null

      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        expiresAt = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null
        planCode = subscription.metadata?.plan_code || planCode
      }

      await syncMembership({
        userId: session.client_reference_id || session.metadata?.user_id,
        planCode,
        status: 'active',
        customerId,
        expiresAt
      })
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id

      await syncMembership({
        userId: subscription.metadata?.user_id,
        planCode: subscription.metadata?.plan_code,
        status: mapStripeStatus(subscription.status),
        customerId,
        expiresAt: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null
      })
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id

      await syncMembership({
        userId: subscription.metadata?.user_id,
        planCode: subscription.metadata?.plan_code,
        status: 'cancelled',
        customerId,
        expiresAt: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null
      })
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })
  } catch (error) {
    console.error(`Webhook Error: ${(error as Error).message}`)
    return new Response(`Webhook Error: ${(error as Error).message}`, { status: 400 })
  }
})
