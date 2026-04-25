import { describe, expect, it } from "vitest";
import {
  buildAuthoringMediaMarkdown,
  buildAuthoringMediaPath
} from "../../src/lib/authoring-media";

describe("authoring-media", () => {
  it("builds stable storage paths by course and block", () => {
    const path = buildAuthoringMediaPath({
      courseSlug: "Programa Empoderamiento Power Skills",
      blockSlug: "Bloque 01: Apertura",
      fileName: "Mi recurso final.png"
    });

    expect(path).toContain("programa-empoderamiento-power-skills");
    expect(path).toContain("bloque-01-apertura");
    expect(path.endsWith("Mi-recurso-final.png")).toBe(true);
  });

  it("renders markdown snippets for images and linked files", () => {
    const imageMarkdown = buildAuthoringMediaMarkdown({
      kind: "image",
      name: "hero-final.png",
      publicUrl: "https://cdn.test/hero-final.png"
    });
    const fileMarkdown = buildAuthoringMediaMarkdown({
      kind: "document",
      name: "guia-final.pdf",
      publicUrl: "https://cdn.test/guia-final.pdf"
    });

    expect(imageMarkdown).toBe("![hero final](https://cdn.test/hero-final.png)");
    expect(fileMarkdown).toBe("[guia final](https://cdn.test/guia-final.pdf)");
  });
});
