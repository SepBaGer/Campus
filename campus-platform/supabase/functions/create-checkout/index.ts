import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

const ALLOWED_PLAN_CODES = new Set(['basic', 'premium', 'enterprise'])

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status
  })
}

async function resolveUserFromToken(supabaseUrl: string, authHeader: string, serviceKey: string) {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: authHeader,
      apikey: serviceKey
    }
  })

  if (!response.ok) return null
  return await response.json()
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY') || ''
    const authHeader = req.headers.get('Authorization') || ''

    if (!stripeKey) throw new Error('STRIPE_SECRET_KEY no configurada')
    if (!authHeader) throw new Error('No autorizado')

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2022-11-15',
      httpClient: Stripe.createFetchHttpClient()
    })

    const user = await resolveUserFromToken(supabaseUrl, authHeader, supabaseServiceKey)
    if (!user) throw new Error('No autorizado')

    const { price_id, plan_code, plan_label } = await req.json()
    if (!price_id) throw new Error('Falta price_id')
    if (!ALLOWED_PLAN_CODES.has(plan_code)) throw new Error('Plan invalido')

    const origin = req.headers.get('origin') || Deno.env.get('SITE_URL') || 'http://127.0.0.1:3000'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: price_id, quantity: 1 }],
      mode: 'subscription',
      customer_email: user.email,
      client_reference_id: user.id,
      success_url: `${origin}/#/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#/planes?checkout=cancelled`,
      metadata: {
        user_id: user.id,
        plan_code,
        plan_label: plan_label || plan_code
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_code,
          plan_label: plan_label || plan_code
        }
      }
    })

    return jsonResponse({ url: session.url })
  } catch (error) {
    return jsonResponse({ error: (error as Error).message }, 400)
  }
})
