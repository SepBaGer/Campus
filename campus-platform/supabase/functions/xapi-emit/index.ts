import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient, resolveUserFromRequest } from "../_shared/auth.ts";
import { corsHeaders, createHttpError, jsonResponse } from "../_shared/http.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await resolveUserFromRequest(req);
    const adminClient = createAdminClient();
    const body = await req.json();

    if (!body.verb || !body.object_id) {
      throw createHttpError("Faltan verb u object_id", 400);
    }

    const { data, error } = await adminClient
      .schema("learning")
      .from("xapi_statement")
      .insert({
        person_id: user.id,
        verb: body.verb,
        object_id: body.object_id,
        payload: body.payload || {}
      })
      .select("id, emitted_at")
      .single();

    if (error || !data) {
      throw createHttpError(error?.message || "No se pudo emitir xAPI", 400);
    }

    return jsonResponse({
      statement_id: data.id,
      emitted_at: data.emitted_at
    });
  } catch (error) {
    const status = (error as { status?: number }).status || 400;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
