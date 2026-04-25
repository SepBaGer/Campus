import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status
  })
}

function createHttpError(message: string, status = 400) {
  const error = new Error(message) as Error & { status?: number }
  error.status = status
  return error
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
    const authHeader = req.headers.get('Authorization') || ''

    if (!supabaseUrl || !supabaseServiceKey) {
      throw createHttpError('Supabase no esta configurado correctamente', 500)
    }

    if (!authHeader) throw createHttpError('No hay cabecera de autorizacion', 401)

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const user = await resolveUserFromToken(supabaseUrl, authHeader, supabaseServiceKey)
    if (!user) throw createHttpError('No autorizado', 401)

    const { lesson_id } = await req.json()
    if (!lesson_id) throw createHttpError('Falta lesson_id', 400)

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('membership_status, current_level')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) throw createHttpError('Perfil no encontrado', 404)

    const { data: lesson, error: lessonError } = await adminClient
      .from('lessons')
      .select('id, level_id, is_free, xp_reward')
      .eq('id', lesson_id)
      .single()

    if (lessonError || !lesson) throw createHttpError('Leccion no disponible', 404)

    const { data: level, error: levelError } = await adminClient
      .from('levels')
      .select('orden')
      .eq('id', lesson.level_id)
      .single()

    if (levelError || !level) throw createHttpError('Nivel no disponible', 404)

    const canAccessLesson = lesson.is_free || (
      profile.membership_status === 'active'
      && profile.current_level >= level.orden
    )

    if (!canAccessLesson) {
      throw createHttpError('Tu membresia o nivel actual no permite completar esta leccion', 403)
    }

    const { data: existingProgress } = await adminClient
      .from('progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('lesson_id', lesson_id)
      .maybeSingle()

    if (existingProgress) {
      return jsonResponse({ message: 'Ya completada', level_up: false })
    }

    const xpGained = lesson.xp_reward || 100

    const { error: progressError } = await adminClient
      .from('progress')
      .insert({ user_id: user.id, lesson_id, xp_earned: xpGained })

    if (progressError) throw createHttpError(progressError.message, 400)

    const { data: levelUp, error: rpcError } = await adminClient.rpc('add_xp_and_check_level_up', {
      p_user_id: user.id,
      p_xp_gained: xpGained
    })

    if (rpcError) throw createHttpError(rpcError.message, 400)

    return jsonResponse({
      message: 'Procesado',
      xp_gained: xpGained,
      level_up: levelUp || false
    })
  } catch (error) {
    const status = (error as { status?: number }).status || 400
    return jsonResponse({ error: (error as Error).message }, status)
  }
})
