import { describe, expect, it } from "vitest";
import { hasLtiLaunchConfig, resolveLtiLaunchConfig } from "../../src/lib/lti-config";

describe("lti config helpers", () => {
  it("resolves a mock tool launch contract from renderer props", () => {
    const config = resolveLtiLaunchConfig({
      component: "interactive-block",
      props: {
        lti_tool_mode: "mock",
        lti_client_id: "campus-platform-v3",
        lti_deployment_id: "deployment-42",
        lti_resource_link_id: "resource-42",
        lti_launch_presentation: "window"
      },
      a11y: {},
      offline_capable: false
    });

    expect(config.toolMode).toBe("mock");
    expect(config.isConfigured).toBe(true);
    expect(config.launchPresentation).toBe("window");
    expect(config.deploymentId).toBe("deployment-42");
  });

  it("resolves a custom tool launch contract from explicit LTI URLs", () => {
    const config = resolveLtiLaunchConfig({
      component: "interactive-block",
      props: {
        lti_tool_mode: "custom",
        lti_title: "Discourse cohort",
        lti_login_initiation_url: "https://community.example.com/lti/login",
        lti_target_link_uri: "https://community.example.com/lti/launch",
        lti_client_id: "client-123",
        lti_deployment_id: "deployment-123",
        lti_resource_link_id: "resource-123",
        lti_launch_presentation: "iframe",
        lti_custom_parameters: {
          category: "power-skills"
        }
      },
      a11y: {},
      offline_capable: false
    });

    expect(config.toolMode).toBe("custom");
    expect(config.title).toBe("Discourse cohort");
    expect(config.isConfigured).toBe(true);
    expect(config.loginInitiationUrl).toContain("/lti/login");
    expect(config.targetLinkUri).toContain("/lti/launch");
    expect(config.launchPresentation).toBe("iframe");
    expect(config.customParameters).toEqual({ category: "power-skills" });
    expect(hasLtiLaunchConfig({
      component: "interactive-block",
      props: {
        lti_login_initiation_url: "https://community.example.com/lti/login",
        lti_target_link_uri: "https://community.example.com/lti/launch",
        lti_client_id: "client-123",
        lti_deployment_id: "deployment-123",
        lti_resource_link_id: "resource-123"
      },
      a11y: {},
      offline_capable: false
    })).toBe(true);
  });
});
