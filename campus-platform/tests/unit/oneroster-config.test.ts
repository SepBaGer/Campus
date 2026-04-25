import { describe, expect, it } from "vitest";
import {
  buildOneRosterManifestFromForm,
  normalizeOneRosterManifest,
  resolveOneRosterAuthoringModel
} from "../../src/lib/oneroster-config";

describe("oneroster-config", () => {
  it("normalizes a persisted manifest into an authoring model", () => {
    const authoring = resolveOneRosterAuthoringModel({
      enabled: true,
      provider: "oneroster",
      version: "1.2",
      base_url: "https://district.example.com/ims/oneroster/rostering/v1p2",
      auth: {
        method: "bearer",
        token_secret_name: "ONEROSTER_POWER_SKILLS_TOKEN"
      },
      sourced_ids: {
        school: "school-123",
        class: "class-456"
      },
      sync_direction: "pull",
      provision_mode: "invite_missing",
      invite_redirect_path: "/portal",
      sync_teacher_roles: true,
      request_options: {
        limit: 250,
        timeout_ms: 20000
      }
    });

    expect(authoring).toMatchObject({
      enabled: true,
      baseUrl: "https://district.example.com/ims/oneroster/rostering/v1p2",
      schoolSourcedId: "school-123",
      classSourcedId: "class-456",
      tokenSecretName: "ONEROSTER_POWER_SKILLS_TOKEN",
      provisionMode: "invite_missing",
      syncTeacherRoles: true,
      requestLimit: 250,
      timeoutMs: 20000
    });
  });

  it("builds a normalized OneRoster manifest from form data", () => {
    const formData = new FormData();
    formData.set("oneroster_enabled", "true");
    formData.set("oneroster_base_url", "https://district.example.com/ims/oneroster/rostering/v1p2");
    formData.set("oneroster_school_sourced_id", "school-123");
    formData.set("oneroster_class_sourced_id", "class-456");
    formData.set("oneroster_token_secret_name", "ONEROSTER_POWER_SKILLS_TOKEN");
    formData.set("oneroster_provision_mode", "invite_missing");
    formData.set("oneroster_invite_redirect_path", "/portal");
    formData.set("oneroster_sync_teacher_roles", "true");
    formData.set("oneroster_request_limit", "600");
    formData.set("oneroster_timeout_ms", "500");

    expect(buildOneRosterManifestFromForm(formData)).toEqual({
      enabled: true,
      provider: "oneroster",
      version: "1.2",
      base_url: "https://district.example.com/ims/oneroster/rostering/v1p2",
      auth: {
        method: "bearer",
        token_secret_name: "ONEROSTER_POWER_SKILLS_TOKEN"
      },
      sourced_ids: {
        school: "school-123",
        class: "class-456"
      },
      sync_direction: "pull",
      provision_mode: "invite_missing",
      invite_redirect_path: "/portal",
      sync_teacher_roles: true,
      request_options: {
        limit: 500,
        timeout_ms: 1000
      }
    });
  });

  it("falls back safely when the manifest is empty", () => {
    expect(normalizeOneRosterManifest(null)).toMatchObject({
      enabled: false,
      provider: "oneroster",
      version: "1.2",
      base_url: null,
      provision_mode: "match_only",
      invite_redirect_path: "/portal"
    });
  });
});
