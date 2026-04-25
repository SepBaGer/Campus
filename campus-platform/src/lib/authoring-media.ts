import { getBrowserSupabaseClient, isBrowserLiveMode } from "./browser-platform";

export const AUTHORING_MEDIA_BUCKET = "authoring-media";

export interface AuthoringMediaAsset {
  name: string;
  path: string;
  publicUrl: string;
  kind: "image" | "video" | "audio" | "document" | "file";
  updatedAt: string | null;
  size: number | null;
}

function sanitizePathSegment(value: string | null | undefined) {
  return String(value || "draft")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "draft";
}

function createToken() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().slice(0, 8);
  }

  return Math.random().toString(36).slice(2, 10);
}

function resolveAssetKind(mimeType: string, fileName: string): AuthoringMediaAsset["kind"] {
  const normalizedType = mimeType.toLowerCase();
  const normalizedName = fileName.toLowerCase();

  if (normalizedType.startsWith("image/")) {
    return "image";
  }

  if (normalizedType.startsWith("video/")) {
    return "video";
  }

  if (normalizedType.startsWith("audio/")) {
    return "audio";
  }

  if (normalizedType.includes("pdf") || normalizedName.endsWith(".pdf")) {
    return "document";
  }

  return "file";
}

function deriveAssetLabel(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "recurso";
}

export function buildAuthoringMediaPath(options: {
  courseSlug: string;
  blockSlug: string;
  fileName: string;
}) {
  const courseSlug = sanitizePathSegment(options.courseSlug);
  const blockSlug = sanitizePathSegment(options.blockSlug);
  const normalizedName = String(options.fileName || "archivo")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "")
    .slice(-120) || "archivo";

  return `${courseSlug}/${blockSlug}/${Date.now()}-${createToken()}-${normalizedName}`;
}

export function buildAuthoringMediaMarkdown(asset: Pick<AuthoringMediaAsset, "kind" | "name" | "publicUrl">) {
  const label = deriveAssetLabel(asset.name);
  if (asset.kind === "image") {
    return `![${label}](${asset.publicUrl})`;
  }

  return `[${label}](${asset.publicUrl})`;
}

export async function uploadAuthoringMediaFile(options: {
  courseSlug: string;
  blockSlug: string;
  file: File;
}): Promise<AuthoringMediaAsset> {
  if (!isBrowserLiveMode()) {
    throw new Error("El upload de medios solo esta disponible en modo live.");
  }

  const client = getBrowserSupabaseClient();
  const path = buildAuthoringMediaPath({
    courseSlug: options.courseSlug,
    blockSlug: options.blockSlug,
    fileName: options.file.name
  });
  const { error } = await client.storage.from(AUTHORING_MEDIA_BUCKET).upload(path, options.file, {
    cacheControl: "3600",
    upsert: false,
    contentType: options.file.type || undefined
  });

  if (error) {
    throw error;
  }

  const { data } = client.storage.from(AUTHORING_MEDIA_BUCKET).getPublicUrl(path);

  return {
    name: options.file.name,
    path,
    publicUrl: data.publicUrl,
    kind: resolveAssetKind(options.file.type || "", options.file.name),
    updatedAt: new Date().toISOString(),
    size: Number.isFinite(options.file.size) ? options.file.size : null
  };
}

export async function listAuthoringMediaAssets(options: {
  courseSlug: string;
  blockSlug: string;
  limit?: number;
}): Promise<AuthoringMediaAsset[]> {
  if (!isBrowserLiveMode()) {
    return [];
  }

  const client = getBrowserSupabaseClient();
  const folder = `${sanitizePathSegment(options.courseSlug)}/${sanitizePathSegment(options.blockSlug)}`;
  const { data, error } = await client.storage.from(AUTHORING_MEDIA_BUCKET).list(folder, {
    limit: options.limit ?? 12,
    sortBy: { column: "updated_at", order: "desc" }
  });

  if (error) {
    throw error;
  }

  return (data || [])
    .filter((entry) => Boolean(entry.name))
    .map((entry) => {
      const path = `${folder}/${entry.name}`;
      const { data: publicData } = client.storage.from(AUTHORING_MEDIA_BUCKET).getPublicUrl(path);

      return {
        name: entry.name,
        path,
        publicUrl: publicData.publicUrl,
        kind: resolveAssetKind(entry.metadata?.mimetype || "", entry.name),
        updatedAt: entry.updated_at ? String(entry.updated_at) : null,
        size: typeof entry.metadata?.size === "number" ? entry.metadata.size : null
      };
    });
}
