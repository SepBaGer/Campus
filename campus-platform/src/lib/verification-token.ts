export function extractVerificationToken(candidate?: string | null) {
  const normalized = (candidate || "").trim().replace(/^\/+|\/+$/g, "");
  return normalized || "";
}

export function resolveVerificationTokenFromUrl(url: URL, basePath = "/verify") {
  const queryToken = extractVerificationToken(url.searchParams.get("token"));
  if (queryToken) return queryToken;

  const normalizedPath = url.pathname.replace(/\/+$/, "");
  if (normalizedPath === basePath || normalizedPath === `${basePath}/index.html`) {
    return "";
  }

  if (normalizedPath.startsWith(`${basePath}/`)) {
    const suffix = normalizedPath.slice(basePath.length + 1);
    return extractVerificationToken(decodeURIComponent(suffix.replace(/\/index\.html$/i, "")));
  }

  return "";
}
