export const ENTERPRISE_SSO_VENDORS = ["azure-ad", "google-workspace", "okta", "custom"] as const;

export type EnterpriseSsoVendor = (typeof ENTERPRISE_SSO_VENDORS)[number];

export interface EnterpriseSsoConnection {
  slug: string;
  label: string;
  vendor: EnterpriseSsoVendor;
  hint: string;
  domain?: string;
  providerId?: string;
}

export type EnterpriseSsoRequest =
  | {
      kind: "providerId";
      providerId: string;
      targetLabel: string;
    }
  | {
      kind: "domain";
      domain: string;
      targetLabel: string;
    };

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isEnterpriseSsoVendor(value: string): value is EnterpriseSsoVendor {
  return (ENTERPRISE_SSO_VENDORS as readonly string[]).includes(value);
}

function getEnterpriseSsoVendorLabel(vendor: EnterpriseSsoVendor) {
  switch (vendor) {
    case "azure-ad":
      return "Azure AD";
    case "google-workspace":
      return "Google Workspace";
    case "okta":
      return "Okta";
    default:
      return "Enterprise SSO";
  }
}

export function normalizeEnterpriseSsoDomain(value: string) {
  let normalized = cleanText(value).toLowerCase();
  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("mailto:")) {
    normalized = normalized.slice("mailto:".length);
  }

  if (normalized.includes("@")) {
    normalized = normalized.split("@").pop() || "";
  }

  normalized = normalized.replace(/^https?:\/\//, "").replace(/^www\./, "");
  normalized = normalized.split("/")[0]?.split("?")[0]?.split("#")[0] || "";

  return normalized.replace(/^\.+|\.+$/g, "");
}

export function resolveEnterpriseSsoRequest(input: {
  emailOrDomain?: string | null;
  providerId?: string | null;
}): EnterpriseSsoRequest {
  const providerId = cleanText(input.providerId);
  if (providerId) {
    return {
      kind: "providerId",
      providerId,
      targetLabel: providerId
    };
  }

  const domain = normalizeEnterpriseSsoDomain(cleanText(input.emailOrDomain));
  if (!domain || !domain.includes(".") || domain.startsWith(".")) {
    throw new Error("INVALID_ENTERPRISE_SSO_TARGET");
  }

  return {
    kind: "domain",
    domain,
    targetLabel: domain
  };
}

export function parseEnterpriseSsoConnections(raw?: string | null): EnterpriseSsoConnection[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .flatMap((entry, index) => {
        if (!entry || typeof entry !== "object") {
          return [];
        }

        const record = entry as Record<string, unknown>;
        const rawVendor = cleanText(record.vendor);
        const vendor = isEnterpriseSsoVendor(rawVendor) ? rawVendor : "custom";
        const domain = normalizeEnterpriseSsoDomain(cleanText(record.domain));
        const providerId = cleanText(record.providerId);

        if (!domain && !providerId) {
          return [];
        }

        return [{
          slug: cleanText(record.slug) || `enterprise-sso-${vendor}-${index + 1}`,
          label: cleanText(record.label) || getEnterpriseSsoVendorLabel(vendor),
          vendor,
          hint: cleanText(record.hint),
          ...(domain ? { domain } : {}),
          ...(providerId ? { providerId } : {})
        } satisfies EnterpriseSsoConnection];
      })
      .filter((entry, index, array) => array.findIndex((candidate) => candidate.slug === entry.slug) === index);
  } catch {
    return [];
  }
}
