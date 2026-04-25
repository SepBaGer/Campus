import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient } from "../_shared/auth.ts";
import { corsHeaders, createHttpError, jsonResponse } from "../_shared/http.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const adminClient = createAdminClient();
    const url = new URL(req.url);
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const token = url.searchParams.get("token") || body.token || body.verification_token;

    if (!token) {
      throw createHttpError("Falta token", 400);
    }

    const { data, error } = await adminClient
      .from("platform_badge_assertions_v")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (error) {
      throw createHttpError(error.message, 400);
    }

    if (!data) {
      throw createHttpError("Credencial no encontrada", 404);
    }

    return jsonResponse({ credential: data });
  } catch (error) {
    const status = (error as { status?: number }).status || 400;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
