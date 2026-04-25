import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { createHttpError } from "./http.ts";

export function getSupabaseConfig() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!supabaseUrl || !serviceRoleKey) {
    throw createHttpError("Supabase no esta configurado correctamente", 500);
  }

  return { supabaseUrl, serviceRoleKey };
}

export function createAdminClient() {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();
  return createClient(supabaseUrl, serviceRoleKey);
}

export async function resolveUserFromRequest(req: Request) {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();
  const authHeader = req.headers.get("Authorization") || "";

  if (!authHeader) {
    throw createHttpError("No autorizado", 401);
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: authHeader,
      apikey: serviceRoleKey
    }
  });

  if (!response.ok) {
    throw createHttpError("No autorizado", 401);
  }

  return await response.json();
}

export function resolveRequestOrigin(req: Request) {
  return req.headers.get("origin") || Deno.env.get("SITE_URL") || "http://127.0.0.1:4321";
}
