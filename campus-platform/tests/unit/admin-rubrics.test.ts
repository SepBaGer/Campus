import { describe, expect, it } from "vitest";
import {
  buildAdminRubricPayload,
  buildProjectSubmissionReviewPayload,
  normalizeRubricCriteria,
  resolveRubricAuthoringModel
} from "../../src/lib/admin-rubrics";

describe("admin rubrics", () => {
  it("normalizes rubric criteria and keeps the weight total stable", () => {
    const criteria = normalizeRubricCriteria([
      {
        title: "Claridad",
        weight: 2
      },
      {
        title: "Evidencia",
        weight: 3
      }
    ]);

    expect(criteria).toHaveLength(2);
    expect(criteria[0].slug).toBe("claridad");
    expect(criteria[1].weight).toBeCloseTo(0.6, 5);
  });

  it("builds a rubric payload from the authoring form", () => {
    const formData = new FormData();
    formData.set("rubric_title", "Rubrica Final");
    formData.set("rubric_summary", "Resumen corto");
    formData.set("rubric_status", "published");
    formData.set("rubric_scale_max", "5");
    formData.set("rubric_criteria_json", JSON.stringify([
      {
        title: "Claridad",
        description: "Explica el reto",
        weight: 1
      },
      {
        title: "Evidencia",
        description: "Prueba observable",
        weight: 1
      }
    ]));

    const payload = buildAdminRubricPayload(formData);
    const criteria = JSON.parse(String(payload.criteria));

    expect(payload.rubric_slug).toBe("rubrica-final");
    expect(payload.status).toBe("published");
    expect(payload.scale_max).toBe(5);
    expect(criteria).toHaveLength(2);
    expect(criteria[0].slug).toBe("claridad");
  });

  it("computes a weighted review payload from rubric criteria", () => {
    const rubric = resolveRubricAuthoringModel({
      slug: "rubrica-final",
      title: "Rubrica Final",
      scaleMax: 4,
      criteria: [
        {
          slug: "claridad",
          title: "Claridad",
          description: null,
          weight: 0.4
        },
        {
          slug: "evidencia",
          title: "Evidencia",
          description: null,
          weight: 0.6
        }
      ]
    });

    const formData = new FormData();
    formData.set("submission_id", "18");
    formData.set("review_status", "reviewed");
    formData.set("review_note", "Buen cierre");
    formData.set("review_score_claridad", "4");
    formData.set("review_note_claridad", "Problema bien definido");
    formData.set("review_score_evidencia", "3");
    formData.set("review_note_evidencia", "Falta una prueba mas fuerte");

    const payload = buildProjectSubmissionReviewPayload(formData, {
      id: 1,
      slug: rubric.slug,
      title: rubric.title,
      summary: rubric.summary,
      status: rubric.status,
      scaleMax: rubric.scaleMax,
      criteria: rubric.criteria
    });
    const scores = JSON.parse(String(payload.criterion_scores));

    expect(payload.submission_id).toBe(18);
    expect(payload.review_status).toBe("reviewed");
    expect(payload.overall_score).toBe(85);
    expect(scores[0].score).toBe(4);
    expect(scores[1].note).toContain("prueba");
  });
});
