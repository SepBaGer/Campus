import type {
  ProjectSubmissionSnapshot,
  RubricCriterion,
  RubricSnapshot,
  SubmissionCriterionScore
} from "./platform-types";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toNullableString(value: unknown) {
  const resolved = toStringValue(value);
  return resolved || null;
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseJsonArray(value: FormDataEntryValue | unknown, field: string) {
  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      throw new Error("Expected array");
    }

    return parsed;
  } catch {
    throw new Error(`El campo ${field} debe ser un arreglo JSON valido.`);
  }
}

export function normalizeRubricCriteria(criteriaInput: unknown): RubricCriterion[] {
  const source = Array.isArray(criteriaInput) ? criteriaInput : [];
  const seen = new Set<string>();
  const criteria = source
    .map((entry) => {
      if (!isRecord(entry)) {
        throw new Error("Cada criterio de la rubrica debe ser un objeto.");
      }

      const title = toStringValue(entry.title);
      if (!title) {
        throw new Error("Cada criterio de la rubrica requiere title.");
      }

      const slug = toSlug(toStringValue(entry.slug) || title);
      if (!slug) {
        throw new Error("Cada criterio de la rubrica requiere slug valido.");
      }

      if (seen.has(slug)) {
        return null;
      }

      seen.add(slug);

      return {
        slug,
        title,
        description: toNullableString(entry.description),
        weight: Math.max(0, toNumber(entry.weight, 0))
      } satisfies RubricCriterion;
    })
    .filter((entry): entry is RubricCriterion => Boolean(entry));

  const totalWeight = criteria.reduce((sum, entry) => sum + entry.weight, 0);
  if (!criteria.length || totalWeight <= 0) {
    throw new Error("La rubrica requiere al menos un criterio con peso positivo.");
  }

  return criteria.map((entry) => ({
    ...entry,
    weight: Number((entry.weight / totalWeight).toFixed(4))
  }));
}

export function resolveRubricAuthoringModel(rubric?: Partial<RubricSnapshot> | null) {
  const criteria = normalizeRubricCriteria(
    Array.isArray(rubric?.criteria) && rubric?.criteria.length
      ? rubric.criteria
      : [
          {
            slug: "claridad-del-problema",
            title: "Claridad del problema",
            description: "Explica el reto y el resultado esperado.",
            weight: 0.25
          },
          {
            slug: "aplicacion-metodologica",
            title: "Aplicacion metodologica",
            description: "Usa el metodo o framework trabajado.",
            weight: 0.25
          },
          {
            slug: "evidencia-de-ejecucion",
            title: "Evidencia de ejecucion",
            description: "Presenta una prueba observable del cambio.",
            weight: 0.3
          },
          {
            slug: "reflexion-y-siguientes-pasos",
            title: "Reflexion y siguientes pasos",
            description: "Explica aprendizaje y proxima iteracion.",
            weight: 0.2
          }
        ]
  );

  return {
    slug: toStringValue(rubric?.slug) || "rubrica-proyecto",
    title: toStringValue(rubric?.title) || "Rubrica de proyecto",
    summary: toStringValue(rubric?.summary),
    status: rubric?.status || "draft",
    scaleMax: Math.max(2, Math.min(10, toNumber(rubric?.scaleMax, 4))),
    criteria,
    criteriaJson: JSON.stringify(criteria, null, 2)
  };
}

export function buildAdminRubricPayload(formData: FormData) {
  const title = toStringValue(formData.get("rubric_title"));
  if (!title) {
    throw new Error("La rubrica requiere un titulo.");
  }

  const slug = toSlug(toStringValue(formData.get("rubric_slug")) || title);
  if (!slug) {
    throw new Error("La rubrica requiere un slug valido.");
  }

  const criteria = normalizeRubricCriteria(
    parseJsonArray(formData.get("rubric_criteria_json"), "rubric_criteria_json")
  );

  return {
    rubric_slug: slug,
    title,
    summary: toStringValue(formData.get("rubric_summary")),
    status: toStringValue(formData.get("rubric_status")) || "draft",
    scale_max: Math.max(2, Math.min(10, toNumber(formData.get("rubric_scale_max"), 4))),
    criteria: JSON.stringify(criteria)
  };
}

export function resolveSubmissionReviewModel(submission?: ProjectSubmissionSnapshot | null) {
  const scoreBySlug = new Map(
    (submission?.criterionScores || []).map((entry) => [entry.slug, entry])
  );

  return (submission?.rubricCriteria || []).map((criterion) => {
    const score = scoreBySlug.get(criterion.slug);

    return {
      ...criterion,
      score: Number(score?.score || 0),
      note: score?.note || ""
    };
  });
}

export function buildProjectSubmissionReviewPayload(
  formData: FormData,
  rubric: RubricSnapshot
) {
  const criterionScores = rubric.criteria.map((criterion) => {
    const rawScore = toNumber(formData.get(`review_score_${criterion.slug}`), 0);
    const note = toNullableString(formData.get(`review_note_${criterion.slug}`));

    return {
      slug: criterion.slug,
      title: criterion.title,
      weight: criterion.weight,
      score: Number(Math.max(0, Math.min(rubric.scaleMax, rawScore)).toFixed(2)),
      note
    } satisfies SubmissionCriterionScore;
  });

  const overallScore = Number(
    (
      criterionScores.reduce((sum, criterion) => {
        const normalized = rubric.scaleMax > 0 ? criterion.score / rubric.scaleMax : 0;
        return sum + normalized * criterion.weight;
      }, 0) * 100
    ).toFixed(2)
  );

  return {
    submission_id: Number(formData.get("submission_id") || 0),
    review_status: toStringValue(formData.get("review_status")) || "reviewed",
    review_note: toStringValue(formData.get("review_note")),
    criterion_scores: JSON.stringify(criterionScores),
    overall_score: overallScore
  };
}
