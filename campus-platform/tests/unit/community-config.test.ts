import { describe, expect, it } from "vitest";
import {
  buildCommunityManifestFromForm,
  resolveCommunityAuthoringModel,
  resolveCommunityLtiConfig,
  resolveCommunitySnapshot
} from "../../src/lib/community-config";

describe("community config helpers", () => {
  it("resolves an enabled cohort community with mock LTI launch", () => {
    const snapshot = resolveCommunitySnapshot(
      {
        id: 1,
        slug: "power-skills-pilot-open",
        title: "Cohorte abierta"
      },
      {
        enabled: true,
        provider: "discourse",
        title: "Comunidad Power Skills",
        summary: "Foro de cohorte",
        entry_label: "Abrir comunidad",
        discussion_prompt: "Comparte tu avance",
        peer_review_enabled: true,
        surface_modes: ["forum", "peer_review"],
        expectations: ["Trae evidencia", "Da feedback"],
        lti: {
          tool_mode: "mock",
          title: "Discourse sandbox",
          client_id: "campus-platform-v3",
          deployment_id: "deployment-community",
          resource_link_id: "resource-community",
          launch_presentation: "iframe"
        }
      }
    );

    expect(snapshot?.enabled).toBe(true);
    expect(snapshot?.provider).toBe("discourse");
    expect(snapshot?.launchReady).toBe(true);
    expect(snapshot?.toolMode).toBe("mock");
    expect(snapshot?.launchPresentation).toBe("iframe");
    expect(snapshot?.surfaceModes).toContain("peer_review");
  });

  it("builds and rehydrates a custom community manifest from authoring fields", () => {
    const formData = new FormData();
    formData.set("community_enabled", "true");
    formData.set("community_title", "Comunidad de cohortes");
    formData.set("community_summary", "Espacio para dialogo aplicado");
    formData.set("community_entry_label", "Abrir Discourse");
    formData.set("community_discussion_prompt", "Comparte un caso real");
    formData.set("community_expectations", "Comparte evidencia\nDevuelve feedback");
    formData.set("community_peer_review_enabled", "true");
    formData.set("community_lti_tool_mode", "custom");
    formData.set("community_lti_title", "Discourse real");
    formData.set("community_lti_login_initiation_url", "https://community.example.com/lti/login");
    formData.set("community_lti_target_link_uri", "https://community.example.com/lti/launch");
    formData.set("community_lti_client_id", "client-123");
    formData.set("community_lti_deployment_id", "deployment-123");
    formData.set("community_lti_resource_link_id", "resource-123");
    formData.set("community_lti_launch_presentation", "window");
    formData.set("community_lti_custom_parameters_json", JSON.stringify({ channel: "power-skills" }));

    const manifest = buildCommunityManifestFromForm(formData, "Cohorte real");
    const authoring = resolveCommunityAuthoringModel(manifest, "power-skills-pilot-open", "Cohorte real");
    const launchConfig = resolveCommunityLtiConfig(manifest);

    expect(authoring.enabled).toBe(true);
    expect(authoring.toolMode).toBe("custom");
    expect(authoring.expectationsText).toContain("Devuelve feedback");
    expect(launchConfig.isConfigured).toBe(true);
    expect(launchConfig.loginInitiationUrl).toContain("/lti/login");
    expect(launchConfig.customParameters).toEqual({ channel: "power-skills" });
  });
});
