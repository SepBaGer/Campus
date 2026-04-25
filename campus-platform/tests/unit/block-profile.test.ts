import { describe, expect, it } from "vitest";
import {
  getBlockExperienceProfile,
  getDefaultBlockCatalogContract,
  getDefaultBlockDuaContract,
  normalizeBlockKind,
  resolveBlockCatalogContract,
  resolveBlockDuaContract
} from "../../src/lib/block-profile";

describe("block profile helpers", () => {
  it("normalizes legacy kinds into the canonical taxonomy", () => {
    expect(normalizeBlockKind("lesson")).toBe("reading");
    expect(normalizeBlockKind("practice")).toBe("quiz");
    expect(normalizeBlockKind("workshop")).toBe("interactive");
    expect(normalizeBlockKind("milestone")).toBe("project");
  });

  it("preserves canonical kinds when they already match the spec", () => {
    expect(normalizeBlockKind("video")).toBe("video");
    expect(normalizeBlockKind("reading")).toBe("reading");
    expect(normalizeBlockKind("project")).toBe("project");
  });

  it("returns visible DUA signals for each canonical family", () => {
    const reading = getBlockExperienceProfile("lesson");
    const project = getBlockExperienceProfile("project");

    expect(reading.kindLabel).toBe("Lectura operativa");
    expect(reading.representationModes.length).toBeGreaterThanOrEqual(2);
    expect(reading.voiceDictationEnabled).toBe(true);
    expect(reading.assistiveTechHints).toContain("Dictado por voz");
    expect(project.rendererLabel).toBe("project-block");
    expect(project.bloomLabel).toBe("Crear");
    expect(project.engagementHooks).toContain("Elegir formato de entrega");
  });

  it("exposes a valid default DUA contract per canonical kind", () => {
    const contract = getDefaultBlockDuaContract("video");

    expect(contract.representationVariants.modes.length).toBeGreaterThanOrEqual(2);
    expect(contract.representationVariants.alt_text).not.toHaveLength(0);
    expect(contract.expressionVariants.accepted_formats.length).toBeGreaterThanOrEqual(1);
    expect(contract.expressionVariants.assistive_tech_hints).toContain("voice_dictation");
    expect(contract.engagementHooks.choice_points.length).toBeGreaterThanOrEqual(1);
  });

  it("exposes a valid default renderer manifest and bloom level per canonical kind", () => {
    const contract = getDefaultBlockCatalogContract("interactive");

    expect(contract.rendererManifest.component).toBe("interactive-block");
    expect(contract.rendererManifest.props).toHaveProperty("lti_tool_mode");
    expect(contract.rendererManifest.props).toHaveProperty("lti_target_link_uri");
    expect(contract.bloomLevel).toBe("analizar");
  });

  it("prefers persisted DUA JSON while keeping safe fallbacks", () => {
    const contract = resolveBlockDuaContract("quiz", {
      representationVariants: {
        modes: ["text", "audio"],
        alt_text: "Resumen alternativo del quiz"
      },
      expressionVariants: {
        accepted_formats: ["drawing"]
      },
      engagementHooks: {
        choice_points: ["pick_scenario"]
      }
    });
    const profile = getBlockExperienceProfile("quiz", contract);

    expect(contract.representationVariants.alt_text).toBe("Resumen alternativo del quiz");
    expect(contract.expressionVariants.accepted_formats).toEqual(["drawing"]);
    expect(profile.expressionFormats).toEqual(["Dibujo / esquema"]);
    expect(profile.engagementHooks).toEqual(["Elegir escenario"]);
  });

  it("prefers persisted renderer manifest and bloom level while keeping safe fallbacks", () => {
    const contract = resolveBlockCatalogContract("video", {
      rendererManifest: {
        component: "custom-video-block",
        props: {
          src: "https://example.com/video.mp4"
        },
        a11y: {
          role: "region",
          aria_label: "Video accesible"
        },
        offline_capable: true
      },
      bloomLevel: "evaluar"
    });
    const profile = getBlockExperienceProfile("video", contract);

    expect(contract.rendererManifest.component).toBe("custom-video-block");
    expect(contract.rendererManifest.offline_capable).toBe(true);
    expect(profile.rendererLabel).toBe("custom-video-block");
    expect(profile.bloomLevel).toBe("evaluar");
    expect(profile.bloomLabel).toBe("Evaluar");
  });
});
