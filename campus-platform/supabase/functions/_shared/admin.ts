import { createAdminClient, resolveUserFromRequest } from "./auth.ts";
import { createHttpError } from "./http.ts";

const allowedAdminRoles = new Set(["teacher", "admin", "owner"]);

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function getBootstrapAdminEmails() {
  return (Deno.env.get("PLATFORM_BOOTSTRAP_ADMIN_EMAILS") || "")
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);
}

export async function resolveAdminActor(req: Request) {
  const user = await resolveUserFromRequest(req);
  const normalizedEmail = normalizeEmail(user.email);

  if (getBootstrapAdminEmails().includes(normalizedEmail)) {
    return user;
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .schema("identity")
    .from("person_role")
    .select("role_code")
    .eq("person_id", user.id);

  if (error) {
    throw createHttpError(error.message, 400);
  }

  if (!(data || []).some((role) => allowedAdminRoles.has(role.role_code))) {
    throw createHttpError("No autorizado para operaciones de admin", 403);
  }

  return user;
}
