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
    const courseSlug = url.searchParams.get("course_slug");
    let query = adminClient.from("platform_open_runs_v").select("*").order("starts_at");

    if (courseSlug) {
      query = query.eq("course_slug", courseSlug);
    }

    const { data, error } = await query;
    if (error) {
      throw createHttpError(error.message, 400);
    }

    return jsonResponse({ runs: data || [] });
  } catch (error) {
    const status = (error as { status?: number }).status || 400;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
