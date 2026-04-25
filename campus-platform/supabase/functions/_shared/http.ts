export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

export function jsonResponse(payload: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(payload), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status
  });
}

export function textResponse(payload: string, status = 200, contentType = "text/plain; charset=utf-8") {
  return new Response(payload, {
    headers: { ...corsHeaders, "Content-Type": contentType },
    status
  });
}

export function createHttpError(message: string, status = 400) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}
