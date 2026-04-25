import { describe, expect, it } from "vitest";
import {
  buildAdminBlockPayload,
  buildExpressionVariantsFromForm,
  buildRendererManifestFromForm,
  resolveExpressionVariantsAuthoringModel,
  resolveRendererManifestAuthoringModel
} from "../../src/lib/admin-authoring";

describe("admin authoring", () => {
  it("resolves semantic authoring fields from a reading renderer manifest", () => {
    const model = resolveRendererManifestAuthoringModel("reading", {
      component: "reading-block",
      props: {
        markdown: "# Hola\n\nTexto base",
        estimated_minutes: 12,
        reading_level: "B2"
      },
      a11y: {
        role: "article",
        aria_label: "Lectura inicial",
        keyboard_map: {}
      },
      offline_capable: true
    }, 15);

    expect(model.reading.markdown).toContain("Hola");
    expect(model.reading.estimatedMinutes).toBe(12);
    expect(model.offlineCapable).toBe(true);
    expect(model.ariaLabel).toBe("Lectura inicial");
  });

  it("builds a project renderer manifest from guided authoring fields", () => {
    const formData = new FormData();
    formData.set("kind", "project");
    formData.set("renderer_manifest", JSON.stringify({
      component: "project-block",
      props: {
        rubric_id: "rubric-existing",
        custom_flag: true
      },
      a11y: {
        role: "article",
        aria_label: "Proyecto base",
        keyboard_map: {}
      },
      offline_capable: true
    }));
    formData.set("renderer_component", "project-block");
    formData.set("renderer_role", "article");
    formData.set("renderer_aria_label", "Proyecto final");
    formData.set("renderer_offline_capable", "true");
    formData.set("project_brief_md", "## Brief\n\nEntrega una evidencia concreta.");
    formData.set("project_submission_format", "video_upload");
    formData.set("project_rubric_id", "rubric-42");

    const manifest = buildRendererManifestFromForm(formData, {
      kind: "project",
      durationMinutes: 30
    });

    expect(manifest.component).toBe("project-block");
    expect(manifest.a11y.aria_label).toBe("Proyecto final");
    expect((manifest.props.brief_md as string)).toContain("Brief");
    expect(manifest.props.submission_format).toBe("video_upload");
    expect(manifest.props.rubric_id).toBe("rubric-42");
    expect(manifest.props.custom_flag).toBe(true);
  });

  it("builds an interactive LTI renderer manifest from guided authoring fields", () => {
    const formData = new FormData();
    formData.set("kind", "interactive");
    formData.set("renderer_manifest", JSON.stringify({
      component: "interactive-block",
      props: {
        h5p_content_id: "legacy-h5p"
      },
      a11y: {
        role: "application",
        aria_label: "Practica base",
        keyboard_map: {}
      },
      offline_capable: false
    }));
    formData.set("renderer_component", "interactive-block");
    formData.set("renderer_role", "application");
    formData.set("renderer_aria_label", "Practica guiada");
    formData.set("interactive_lti_tool_mode", "custom");
    formData.set("interactive_lti_title", "Sandbox externo");
    formData.set("interactive_lti_login_initiation_url", "https://tool.example.com/oidc/login");
    formData.set("interactive_lti_target_link_uri", "https://tool.example.com/lti/launch");
    formData.set("interactive_lti_client_id", "tool-client-1");
    formData.set("interactive_lti_deployment_id", "deployment-1");
    formData.set("interactive_lti_resource_link_id", "resource-1");
    formData.set("interactive_lti_launch_presentation", "iframe");
    formData.set("interactive_lti_custom_parameters_json", JSON.stringify({
      cohort: "pilot-open"
    }));
    formData.set("interactive_h5p_content_id", "h5p-42");

    const manifest = buildRendererManifestFromForm(formData, {
      kind: "interactive",
      durationMinutes: 20
    });

    expect(manifest.component).toBe("interactive-block");
    expect(manifest.a11y.aria_label).toBe("Practica guiada");
    expect(manifest.props.lti_tool_mode).toBe("custom");
    expect(manifest.props.lti_title).toBe("Sandbox externo");
    expect(manifest.props.lti_login_initiation_url).toBe("https://tool.example.com/oidc/login");
    expect(manifest.props.lti_target_link_uri).toBe("https://tool.example.com/lti/launch");
    expect(manifest.props.lti_client_id).toBe("tool-client-1");
    expect(manifest.props.lti_deployment_id).toBe("deployment-1");
    expect(manifest.props.lti_resource_link_id).toBe("resource-1");
    expect(manifest.props.lti_launch_presentation).toBe("iframe");
    expect(manifest.props.lti_custom_parameters).toEqual({ cohort: "pilot-open" });
    expect(manifest.props.h5p_content_id).toBe("h5p-42");
  });

  it("toggles voice dictation within the expression variants contract", () => {
    const model = resolveExpressionVariantsAuthoringModel("project", {
      accepted_formats: ["text", "video_upload"],
      assistive_tech_hints: ["screen_reader_friendly", "voice_dictation"]
    });

    expect(model.voiceDictationEnabled).toBe(true);

    const formData = new FormData();
    formData.set("kind", "project");
    formData.set("expression_variants", JSON.stringify({
      accepted_formats: ["text", "video_upload"],
      assistive_tech_hints: ["screen_reader_friendly", "voice_dictation", "keyboard_only"]
    }));
    formData.set("assistive_voice_dictation", "false");

    const expressionVariants = buildExpressionVariantsFromForm(formData, {
      kind: "project"
    });

    expect(expressionVariants.assistive_tech_hints).not.toContain("voice_dictation");
    expect(expressionVariants.assistive_tech_hints).toContain("keyboard_only");
  });

  it("replaces the raw renderer manifest payload with the guided result", () => {
    const formData = new FormData();
    formData.set("kind", "reading");
    formData.set("block_slug", "bloque-demo");
    formData.set("duration_minutes", "18");
    formData.set("renderer_manifest", JSON.stringify({
      component: "reading-block",
      props: {
        markdown: "texto viejo"
      },
      a11y: {
        role: "article",
        aria_label: "Lectura antigua",
        keyboard_map: {}
      },
      offline_capable: true
    }));
    formData.set("renderer_component", "reading-block");
    formData.set("renderer_role", "article");
    formData.set("renderer_aria_label", "Lectura reescrita");
    formData.set("renderer_offline_capable", "true");
    formData.set("reading_markdown", "## Nuevo contenido\n\nCon estructura.");
    formData.set("reading_estimated_minutes", "18");
    formData.set("reading_level", "C1");
    formData.set("expression_variants", JSON.stringify({
      accepted_formats: ["text", "audio_upload"],
      assistive_tech_hints: ["screen_reader_friendly", "keyboard_only"]
    }));
    formData.set("assistive_voice_dictation", "true");

    const payload = buildAdminBlockPayload(formData, {
      kind: "reading",
      durationMinutes: 18
    });
    const manifest = JSON.parse(String(payload.renderer_manifest));
    const expressionVariants = JSON.parse(String(payload.expression_variants));

    expect(payload.kind).toBe("reading");
    expect(manifest.props.markdown).toContain("Nuevo contenido");
    expect(manifest.props.reading_level).toBe("C1");
    expect(manifest.a11y.aria_label).toBe("Lectura reescrita");
    expect(expressionVariants.assistive_tech_hints).toContain("voice_dictation");
  });
});
