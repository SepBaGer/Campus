import { describe, expect, it } from "vitest";
import {
  convertHtmlToRichMarkdown,
  extractRendererMarkdown,
  renderRichMarkdownToHtml,
  summarizeMarkdownPlainText
} from "../../src/lib/rich-text-markdown";

describe("rich-text-markdown", () => {
  it("renders markdown with links and images into safe html", () => {
    const html = renderRichMarkdownToHtml("## Hola\n\nTexto con [link](https://metodologia.info) y ![hero](https://cdn.test/hero.png)");

    expect(html).toContain("<h2>Hola</h2>");
    expect(html).toContain("href=\"https://metodologia.info\"");
    expect(html).toContain("rel=\"noreferrer noopener\"");
    expect(html).toContain("<img");
    expect(html).toContain("src=\"https://cdn.test/hero.png\"");
  });

  it("converts html back to markdown for authored blocks", () => {
    const markdown = convertHtmlToRichMarkdown(
      "<h2>Framework</h2><p>Texto <strong>clave</strong> y <a href=\"https://metodologia.info\">link</a>.</p><p><img src=\"https://cdn.test/hero.png\" alt=\"hero\"></p>"
    );

    expect(markdown).toContain("## Framework");
    expect(markdown).toContain("**clave**");
    expect(markdown).toContain("[link](https://metodologia.info)");
    expect(markdown).toContain("![hero](https://cdn.test/hero.png)");
  });

  it("extracts the learner-facing markdown from renderer manifests", () => {
    expect(extractRendererMarkdown("reading", {
      props: { markdown: "Lectura guiada" }
    })).toBe("Lectura guiada");

    expect(extractRendererMarkdown("project", {
      props: { brief_md: "Brief aplicable" }
    })).toBe("Brief aplicable");
  });

  it("summarizes markdown into readable plain text", () => {
    const summary = summarizeMarkdownPlainText("**Hola** equipo.\n\nEste bloque instala criterio y accion.", 30);
    expect(summary).toContain("Hola equipo.");
    expect(summary.endsWith("…")).toBe(true);
  });
});
