import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient } from "../_shared/auth.ts";
import { corsHeaders, createHttpError, textResponse } from "../_shared/http.ts";

function toIcsDate(value: string) {
  return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

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

    const events = (data || []).map((session) => [
      "BEGIN:VEVENT",
      `UID:${session.session_id}@campus.metodologia.info`,
      `DTSTAMP:${toIcsDate(new Date().toISOString())}`,
      `DTSTART:${toIcsDate(session.starts_at)}`,
      `DTEND:${toIcsDate(session.ends_at || session.starts_at)}`,
      `SUMMARY:${session.session_title}`,
      `DESCRIPTION:Run ${session.run_label}`,
      `LOCATION:${session.location_label}`,
      "END:VEVENT"
    ].join("\r\n"));

    const calendar = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Campus MetodologIA//Campus Platform V3//ES",
      ...events,
      "END:VCALENDAR"
    ].join("\r\n");

    return textResponse(calendar, 200, "text/calendar; charset=utf-8");
  } catch (error) {
    const status = (error as { status?: number }).status || 400;
    return textResponse((error as Error).message, status);
  }
});
