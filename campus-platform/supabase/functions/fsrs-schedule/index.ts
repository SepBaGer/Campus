import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAdminClient, resolveUserFromRequest } from "../_shared/auth.ts";
import { corsHeaders, createHttpError, jsonResponse } from "../_shared/http.ts";
import { resolveContentBlockContext, upsertMasteryState } from "../_shared/learning.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await resolveUserFromRequest(req);
    const adminClient = createAdminClient();
    const body = await req.json();
    const contentBlockId = Number(body.content_block_id);
    const correct = body.correct !== false;

    if (!contentBlockId) {
      throw createHttpError("Falta content_block_id", 400);
    }
    const blockContext = await resolveContentBlockContext(adminClient, contentBlockId);
    const schedule = await upsertMasteryState(adminClient, user.id, blockContext, correct);

    return jsonResponse({
      person_id: user.id,
      content_block_id: contentBlockId,
      competency_id: schedule.competencyId,
      competency_slug: schedule.competencySlug,
      competency_title: schedule.competencyTitle,
      mastery_level: schedule.masteryLevel,
      mastery_percent: schedule.masteryPercent,
      repetitions: schedule.repetitions,
      interval_days: schedule.intervalDays,
      ease_factor: schedule.easeFactor,
      next_review_at: schedule.nextReviewAt
    });
  } catch (error) {
    const status = (error as { status?: number }).status || 400;
    return jsonResponse({ error: (error as Error).message }, status);
  }
});
