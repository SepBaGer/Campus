import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient, resolveUserFromRequest } from "../_shared/auth.ts";
import { corsHeaders, createHttpError, jsonResponse } from "../_shared/http.ts";
import { resolveCourseProgress } from "../_shared/learning.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await resolveUserFromRequest(req);
    const adminClient = createAdminClient();
    const body = await req.json().catch(() => ({}));
    const badgeSlug = body.badge_class_slug || "badge-power-skills-pilot";

    const { data: badgeClass, error: badgeClassError } = await adminClient
      .schema("credentials")
      .from("badge_class")
      .select("id, title")
      .eq("slug", badgeSlug)
      .single();

    if (badgeClassError || !badgeClass) {
      throw createHttpError(badgeClassError?.message || "Badge class no encontrada", 404);
    }

    const { data: existingAssertion } = await adminClient
      .schema("credentials")
      .from("badge_assertion")
      .select("id, verification_token, issued_at")
      .eq("badge_class_id", badgeClass.id)
      .eq("person_id", user.id)
      .maybeSingle();

    if (existingAssertion) {
      return jsonResponse({
        assertion_id: existingAssertion.id,
        token: existingAssertion.verification_token,
        issued_at: existingAssertion.issued_at,
        reused: true
      });
    }

    const { data: latestEnrollment, error: latestEnrollmentError } = await adminClient
      .schema("enrollment")
      .from("enrollment")
      .select("id, course_run_id")
      .eq("person_id", user.id)
      .in("status", ["active", "completed"])
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestEnrollmentError || !latestEnrollment) {
      throw createHttpError(latestEnrollmentError?.message || "No existe una matricula valida para emitir la credencial", 409);
    }

    const { data: courseRun, error: courseRunError } = await adminClient
      .schema("delivery")
      .from("course_run")
      .select("id, course_id, title")
      .eq("id", latestEnrollment.course_run_id)
      .maybeSingle();

    if (courseRunError || !courseRun) {
      throw createHttpError(courseRunError?.message || "No se encontro el course run asociado a la matricula", 404);
    }

    const progress = await resolveCourseProgress(adminClient, user.id, Number(courseRun.course_id));
    if (progress.totalBlocks <= 0 || progress.completedBlocks < progress.totalBlocks) {
      const remainingBlocks = Math.max(progress.totalBlocks - progress.completedBlocks, 1);
      throw createHttpError(
        `La credencial solo se emite al completar la ruta. Faltan ${remainingBlocks} bloque(s).`,
        409
      );
    }

    const { data: insertedAssertion, error: insertError } = await adminClient
      .schema("credentials")
      .from("badge_assertion")
      .insert({
        badge_class_id: badgeClass.id,
        person_id: user.id,
        enrollment_id: latestEnrollment?.id || null,
        status: "issued",
        public_note: "Emitida desde credential-issue"
      })
      .select("id, verification_token, issued_at")
      .single();

    if (insertError || !insertedAssertion) {
      throw createHttpError(insertError?.message || "No se pudo emitir la credencial", 400);
    }

    return jsonResponse({
      assertion_id: insertedAssertion.id,
      token: insertedAssertion.verification_token,
      issued_at: insertedAssertion.issued_at,
      completed_blocks: progress.completedBlocks,
      total_blocks: progress.totalBlocks,
      course_run: courseRun.title
    });
  } catch (error) {
    const status = (error as { status?: number }).status || 400;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
