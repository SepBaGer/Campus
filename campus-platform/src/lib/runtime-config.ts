const defaultSiteUrl = "http://127.0.0.1:4321";

export function resolveSiteUrl(configuredSiteUrl?: string, currentOrigin?: string): string {
  const candidate = configuredSiteUrl || currentOrigin || defaultSiteUrl;
  return candidate.replace(/\/+$/, "");
}

export function buildRedirectUrl(siteUrl: string, redirectPath = "/portal"): string {
  return new URL(redirectPath, `${resolveSiteUrl(siteUrl)}/`).toString();
}

export function normalizeRedirectPath(candidate?: string | null, fallback = "/portal"): string {
  if (!candidate) return fallback;
  if (!candidate.startsWith("/")) return fallback;
  return candidate;
}
