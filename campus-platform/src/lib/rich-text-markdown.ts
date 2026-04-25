import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import TurndownService from "turndown";
import type { RendererManifest } from "./platform-types";

type JsonRecord = Record<string, unknown>;

const turndownService = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
  strongDelimiter: "**"
});

turndownService.addRule("images", {
  filter: "img",
  replacement(_content: string, node: HTMLElement) {
    const element = node as HTMLElement;
    const src = element.getAttribute("src")?.trim() || "";
    if (!src) {
      return "";
    }

    const alt = element.getAttribute("alt")?.trim() || "";
    return `![${alt}](${src})`;
  }
});

turndownService.addRule("hard-breaks", {
  filter: "br",
  replacement() {
    return "  \n";
  }
});

turndownService.addRule("horizontal-rules", {
  filter: "hr",
  replacement() {
    return "\n\n---\n\n";
  }
});

marked.use({
  breaks: true,
  gfm: true
});

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function renderRichMarkdownToHtml(markdown: string | null | undefined) {
  const source = toStringValue(markdown).trim();
  if (!source) {
    return "";
  }

  const parsed = marked.parse(source) as string;
  return sanitizeHtml(parsed, {
    allowedTags: [
      "p",
      "br",
      "h1",
      "h2",
      "h3",
      "h4",
      "blockquote",
      "strong",
      "em",
      "code",
      "pre",
      "hr",
      "ul",
      "ol",
      "li",
      "a",
      "img"
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "loading", "decoding"]
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noreferrer noopener"
      }),
      img(tagName: string, attribs: Record<string, string>) {
        return {
          tagName,
          attribs: {
            ...attribs,
            loading: "lazy",
            decoding: "async"
          }
        };
      }
    }
  });
}

export function convertHtmlToRichMarkdown(html: string | null | undefined) {
  const source = toStringValue(html).trim();
  if (!source) {
    return "";
  }

  return turndownService
    .turndown(source)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractRendererMarkdown(
  kindInput: string | null | undefined,
  rendererManifest: RendererManifest | JsonRecord | null | undefined
) {
  const manifest = isRecord(rendererManifest) ? rendererManifest : {};
  const props = isRecord(manifest.props) ? manifest.props : {};

  if (kindInput === "project") {
    return toStringValue(props.brief_md);
  }

  return toStringValue(props.markdown);
}

export function renderRendererMarkdownToHtml(
  kindInput: string | null | undefined,
  rendererManifest: RendererManifest | JsonRecord | null | undefined
) {
  return renderRichMarkdownToHtml(extractRendererMarkdown(kindInput, rendererManifest));
}

export function summarizeMarkdownPlainText(markdown: string | null | undefined, maxLength = 180) {
  const html = renderRichMarkdownToHtml(markdown);
  const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  if (!plain || plain.length <= maxLength) {
    return plain;
  }

  return `${plain.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}
