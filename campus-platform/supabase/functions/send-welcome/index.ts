// supabase/functions/send-welcome/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS and preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { record } = await req.json()
    const email = record.email
    const name = record.raw_user_meta_data?.display_name || 'Estudiante'

    console.log(`[T-020] Preparando bienvenida para: ${email} (${name})`)

    if (!RESEND_API_KEY || RESEND_API_KEY === 'mock_key') {
      console.warn("RESEND_API_KEY no configurada. Simulando envío...");
      return new Response(JSON.stringify({ 
        message: "Simulación exitosa", 
        id: "mock_id_" + Date.now() 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    // Call Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Campus MetodologIA <campus@metodologia.info>',
        to: [email],
        subject: '¡Bienvenido a tu nueva (R)evolución Digital!',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #020617; color: #fff; padding: 40px; border-radius: 16px;">
            <h1 style="color: #FFD700;">¡Hola, ${name}!</h1>
            <p style="font-size: 1.1rem; line-height: 1.6; color: #cbd5e1;">Ya eres parte del <strong>Programa de Empoderamiento</strong>. Estamos emocionados de acompañarte en este viaje para transformar tu productividad con IA.</p>
            <div style="margin: 30px 0;">
              <a href="https://metodologia.info/campus/#/login" style="background: #FFD700; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Acceder al Campus</a>
            </div>
            <p style="color: #94a3b8; font-size: 0.9rem;">Si no te registraste en MetodologIA, puedes ignorar este correo.</p>
            <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 30px 0;">
            <p style="text-align: center; color: #64748b; font-size: 0.8rem;">© 2026 MetodologIA. Todos los derechos reservados.</p>
          </div>
        `,
      }),
    })

    const data = await res.json()

    if (!res.ok) throw new Error(`Error de Resend: ${data.message || 'Desconocido'}`)

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error(`[T-020 Error]: ${error.message}`)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
