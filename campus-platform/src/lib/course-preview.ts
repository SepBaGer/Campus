import type { BlockSnapshot } from "./platform-types";

export interface BlockPreviewContent {
  paragraphs: string[];
  experiencePoints: string[];
  evidencePoints: string[];
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value, index, source) => source.indexOf(value) === index);
}

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_>~-]+/g, " ")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function splitParagraphs(value: string) {
  return stripMarkdown(value)
    .split(/\n\s*\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function resolveManifestParagraphs(block: BlockSnapshot) {
  const props = isRecord(block.rendererManifest?.props) ? block.rendererManifest.props : {};
  const markdown = typeof props.markdown === "string" ? props.markdown : "";
  const brief = typeof props.brief_md === "string" ? props.brief_md : "";
  const questions = Array.isArray(props.questions) ? props.questions.length : 0;
  const durationSeconds = Number(props.duration_s);

  if (markdown.trim()) {
    return splitParagraphs(markdown).slice(0, 2);
  }

  if (brief.trim()) {
    return splitParagraphs(brief).slice(0, 2);
  }

  if (questions > 0) {
    return [
      `La experiencia gratuita incluye ${questions} preguntas guiadas para validar criterio antes de activar la ruta completa.`
    ];
  }

  if (block.kind === "interactive" && (props.h5p_content_id || props.lti_launch_url || props.client_id)) {
    return [
      "Esta vista gratuita abre una practica guiada con pasos claros, soporte accesible y una alternativa orientada en texto."
    ];
  }

  if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
    return [
      `La pieza central se recorre en aproximadamente ${Math.max(1, Math.round(durationSeconds / 60))} minutos y deja una accion concreta para aplicar de inmediato.`
    ];
  }

  return [];
}

export function resolveCoursePreviewBlock(blocks: BlockSnapshot[]) {
  return blocks.find((block) => block.isFree);
}

export function buildBlockPreviewContent(block: BlockSnapshot): BlockPreviewContent {
  const manifestParagraphs = resolveManifestParagraphs(block);
  const paragraphs = uniqueStrings([
    block.summary,
    block.objective,
    ...manifestParagraphs
  ]).slice(0, 3);

  const experiencePoints = uniqueStrings([
    `${block.kindLabel} con foco en ${block.rendererLabel}.`,
    block.representationModes[0]
      ? `Incluye ${block.representationModes[0].toLowerCase()} como puerta de entrada.`
      : null,
    block.expressionFormats[0]
      ? `Permite responder o apropiarte del ejercicio en ${block.expressionFormats[0].toLowerCase()}.`
      : null,
    block.engagementHooks[0]
      ? `Abre ${block.engagementHooks[0].toLowerCase()} para conectar la leccion con tu contexto.`
      : null
  ]).slice(0, 4);

  const evidencePoints = uniqueStrings([
    `Competencia objetivo: ${block.competencyTitle}.`,
    `Nivel Bloom priorizado: ${block.bloomLabel}.`,
    `Tiempo estimado: ${block.durationMinutes} minutos.`,
    block.rendererManifest.offline_capable
      ? "El material base puede consumirse sin depender de una practica en vivo."
      : "La experiencia prioriza acompanamiento guiado y feedback en contexto."
  ]).slice(0, 4);

  return {
    paragraphs,
    experiencePoints,
    evidencePoints
  };
}
