import { createClient } from "@supabase/supabase-js";
import { parseEnterpriseSsoConnections } from "./enterprise-sso";

const platformMode = import.meta.env.PUBLIC_CAMPUS_PLATFORM_MODE || "demo";
const configuredSiteUrl = import.meta.env.PUBLIC_CAMPUS_PLATFORM_SITE_URL;
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const configuredEnterpriseSsoConnections = parseEnterpriseSsoConnections(
  import.meta.env.PUBLIC_CAMPUS_PLATFORM_SSO_CONNECTIONS
);

export function hasPublicSupabaseConfig(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export function isLiveMode(): boolean {
  return platformMode === "live" && hasPublicSupabaseConfig();
}

export function getConfiguredSiteUrl(): string | undefined {
  return configuredSiteUrl;
}

export function getSupabaseUrl(): string | undefined {
  return supabaseUrl;
}

export function getConfiguredEnterpriseSsoConnections() {
  return configuredEnterpriseSsoConnections;
}

export function createPublicSupabaseClient() {
  if (!hasPublicSupabaseConfig()) {
    throw new Error("Missing public Supabase configuration.");
  }

  return createClient(supabaseUrl as string, supabasePublishableKey as string);
}
