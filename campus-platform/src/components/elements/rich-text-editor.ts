import { LitElement, css, html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  buildAuthoringMediaMarkdown,
  listAuthoringMediaAssets,
  uploadAuthoringMediaFile,
  type AuthoringMediaAsset
} from "../../lib/authoring-media";
import {
  convertHtmlToRichMarkdown,
  renderRichMarkdownToHtml
} from "../../lib/rich-text-markdown";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

class RichTextEditorElement extends LitElement {
  static properties = {
    fieldName: { type: String, attribute: "field-name" },
    value: { type: String },
    placeholder: { type: String },
    courseSlug: { type: String, attribute: "course-slug" },
    blockSlug: { type: String, attribute: "block-slug" },
    mode: { state: true },
    uploading: { state: true },
    assetsLoading: { state: true },
    assets: { state: true },
    message: { state: true },
    errorMessage: { state: true }
  };

  static styles = css`
    :host {
      display: grid;
      gap: 0.85rem;
      padding: 1rem;
      border-radius: 20px;
      border: 1px solid var(--brand-border, rgba(15, 23, 42, 0.12));
      background: var(--surface-soft, rgba(184, 135, 0, 0.05));
    }

    button,
    textarea,
    input {
      font: inherit;
    }

    .toolbar,
    .toolbar__group,
    .mode-switch,
    .editor-actions,
    .assets-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
    }

    .toolbar {
      justify-content: space-between;
      align-items: center;
    }

    .toolbar button,
    .editor-actions button,
    .asset-card button {
      min-height: 2.5rem;
      padding: 0.55rem 0.8rem;
      border-radius: 999px;
      border: 1px solid var(--brand-border, rgba(15, 23, 42, 0.12));
      background: var(--surface-card, rgba(255, 255, 255, 0.94));
      color: var(--brand-text, #0f172a);
      cursor: pointer;
    }

    .toolbar button.is-active,
    .mode-switch button.is-active {
      border-color: var(--brand-border-strong, rgba(184, 135, 0, 0.28));
      background: var(--surface-soft-strong, rgba(184, 135, 0, 0.14));
      color: var(--brand-gold, #b88700);
    }

    .editor-shell,
    textarea,
    .preview,
    .assets-panel {
      border-radius: 18px;
      border: 1px solid var(--brand-border, rgba(15, 23, 42, 0.12));
      background: var(--surface-card, rgba(255, 255, 255, 0.97));
    }

    .editor-shell {
      min-height: 18rem;
      padding: 0.85rem 1rem;
    }

    .editor-shell :global(.ProseMirror) {
      min-height: 16rem;
      outline: none;
      color: var(--brand-text, #0f172a);
      line-height: 1.75;
    }

    .editor-shell :global(.ProseMirror p.is-editor-empty:first-child::before) {
      content: attr(data-placeholder);
      color: var(--brand-muted, #64748b);
      pointer-events: none;
      float: left;
      height: 0;
    }

    .editor-shell :global(.ProseMirror img),
    .preview img {
      display: block;
      max-width: 100%;
      height: auto;
      margin: 1rem 0;
      border-radius: 16px;
    }

    .editor-shell :global(.ProseMirror a),
    .preview a {
      color: var(--brand-gold, #b88700);
      font-weight: 700;
    }

    .editor-shell :global(.ProseMirror blockquote),
    .preview blockquote {
      margin: 1rem 0;
      padding-left: 1rem;
      border-left: 3px solid var(--brand-gold, #b88700);
      color: var(--brand-text-soft, #334155);
    }

    .editor-shell :global(.ProseMirror pre),
    .preview pre {
      margin: 0;
      overflow: auto;
      padding: 0.95rem 1rem;
      border-radius: 16px;
      background: var(--surface-tint, rgba(15, 23, 42, 0.04));
    }

    textarea {
      width: 100%;
      min-height: 18rem;
      padding: 0.95rem 1rem;
      resize: vertical;
    }

    .preview {
      min-height: 18rem;
      padding: 1rem 1.1rem;
    }

    .meta,
    .message,
    .error {
      margin: 0;
    }

    .meta {
      color: var(--brand-text-soft, #334155);
    }

    .message,
    .error {
      padding: 0.8rem 0.9rem;
      border-radius: 16px;
      border: 1px solid transparent;
    }

    .message {
      background: var(--info-bg, rgba(239, 246, 255, 0.96));
      border-color: var(--info-border, rgba(29, 78, 216, 0.14));
      color: var(--info-text, #1d4ed8);
    }

    .error {
      background: var(--danger-bg, rgba(254, 242, 242, 0.96));
      border-color: var(--danger-border, rgba(185, 28, 28, 0.16));
      color: var(--danger-text, #b91c1c);
    }

    .assets-panel {
      padding: 0.9rem 1rem;
    }

    .assets-panel h4 {
      margin: 0 0 0.7rem;
      font-size: 1rem;
    }

    .asset-card {
      display: grid;
      gap: 0.5rem;
      width: min(13rem, 100%);
      padding: 0.7rem;
      border-radius: 16px;
      border: 1px solid var(--brand-border, rgba(15, 23, 42, 0.12));
      background: var(--surface-base, rgba(255, 255, 255, 0.82));
    }

    .asset-card img {
      width: 100%;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      border-radius: 12px;
      background: var(--surface-soft, rgba(184, 135, 0, 0.08));
    }

    .asset-card strong,
    .asset-card span {
      display: block;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    .asset-card span {
      font-size: 0.9rem;
      color: var(--brand-muted, #64748b);
    }
  `;

  fieldName = "";
  value = "";
  placeholder = "Escribe o pega markdown aqui.";
  courseSlug = "";
  blockSlug = "";
  mode: "visual" | "markdown" | "preview" = "visual";
  uploading = false;
  assetsLoading = false;
  assets: AuthoringMediaAsset[] = [];
  message = "";
  errorMessage = "";
  private editor: Editor | null = null;
  private syncingFromValue = false;
  private uploadIntent: "image" | "file" = "image";

  firstUpdated() {
    this.initializeEditor();
    void this.refreshAssets();
  }

  disconnectedCallback() {
    this.editor?.destroy();
    this.editor = null;
    super.disconnectedCallback();
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("value") && !this.syncingFromValue) {
      this.syncEditorFromValue();
    }

    if (changedProperties.has("courseSlug") || changedProperties.has("blockSlug")) {
      void this.refreshAssets();
    }
  }

  private get editorSurface() {
    return this.renderRoot.querySelector<HTMLElement>("[data-editor-surface]");
  }

  private get uploadInput() {
    return this.renderRoot.querySelector<HTMLInputElement>("[data-upload-input]");
  }

  private initializeEditor() {
    if (this.editor || !this.editorSurface) {
      return;
    }

    this.editor = new Editor({
      element: this.editorSurface,
      extensions: [
        StarterKit,
        Image,
        Link.configure({
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https"
        }),
        Placeholder.configure({
          placeholder: this.placeholder
        })
      ],
      content: renderRichMarkdownToHtml(this.value),
      onUpdate: ({ editor }) => {
        if (this.syncingFromValue) {
          return;
        }

        const nextValue = convertHtmlToRichMarkdown(editor.getHTML());
        if (nextValue !== this.value) {
          this.value = nextValue;
          this.dispatchEvent(new CustomEvent("editor-change", {
            bubbles: true,
            composed: true,
            detail: {
              fieldName: this.fieldName,
              value: nextValue
            }
          }));
        }
      }
    });
  }

  private syncEditorFromValue() {
    if (!this.editor) {
      return;
    }

    const currentMarkdown = convertHtmlToRichMarkdown(this.editor.getHTML());
    if (currentMarkdown === this.value.trim()) {
      return;
    }

    this.syncingFromValue = true;
    this.editor.commands.setContent(renderRichMarkdownToHtml(this.value) || "<p></p>", {
      emitUpdate: false
    });
    this.syncingFromValue = false;
  }

  private async refreshAssets() {
    if (!this.courseSlug || !this.blockSlug) {
      this.assets = [];
      return;
    }

    try {
      this.assetsLoading = true;
      this.assets = await listAuthoringMediaAssets({
        courseSlug: this.courseSlug,
        blockSlug: this.blockSlug
      });
    } catch (error) {
      this.errorMessage = (error as Error).message;
    } finally {
      this.assetsLoading = false;
    }
  }

  private runCommand(callback: (editor: Editor) => void) {
    if (!this.editor) {
      return;
    }

    callback(this.editor);
    this.requestUpdate();
  }

  private insertUploadedAsset(asset: AuthoringMediaAsset) {
    if (!this.editor) {
      return;
    }

    if (asset.kind === "image") {
      this.editor.chain().focus().setImage({
        src: asset.publicUrl,
        alt: asset.name,
        title: asset.name
      }).run();
      return;
    }

    const label = buildAuthoringMediaMarkdown(asset)
      .replace(/^\[/, "")
      .replace(/\]\(.+$/, "");

    this.editor.chain().focus().insertContent(
      `<p><a href="${escapeHtml(asset.publicUrl)}" target="_blank" rel="noreferrer noopener">${escapeHtml(label)}</a></p>`
    ).run();
  }

  private async handleUploadSelection(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    this.errorMessage = "";
    this.message = "";

    try {
      this.uploading = true;
      const asset = await uploadAuthoringMediaFile({
        courseSlug: this.courseSlug,
        blockSlug: this.blockSlug,
        file
      });
      this.insertUploadedAsset(asset);
      this.message = this.uploadIntent === "image"
        ? "Imagen subida e insertada en el contenido."
        : "Archivo subido e insertado como enlace.";
      await this.refreshAssets();
    } catch (error) {
      this.errorMessage = (error as Error).message;
    } finally {
      this.uploading = false;
      input.value = "";
    }
  }

  private requestUpload(intent: "image" | "file") {
    this.uploadIntent = intent;

    const input = this.uploadInput;
    if (!input) {
      return;
    }

    input.accept = intent === "image"
      ? "image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
      : "image/*,application/pdf,video/mp4,video/webm,audio/mpeg,audio/webm";
    input.click();
  }

  private handleMarkdownInput(event: Event) {
    this.value = (event.currentTarget as HTMLTextAreaElement).value;
  }

  private promptForLink() {
    if (!this.editor) {
      return;
    }

    const previousUrl = String(this.editor.getAttributes("link").href || "");
    const nextUrl = window.prompt("URL del enlace", previousUrl);

    if (nextUrl === null) {
      return;
    }

    const normalized = nextUrl.trim();
    if (!normalized) {
      this.editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    this.editor.chain().focus().extendMarkRange("link").setLink({
      href: normalized,
      target: "_blank",
      rel: "noreferrer noopener"
    }).run();
  }

  private renderToolbarButton(label: string, active: boolean, handler: () => void) {
    return html`
      <button
        type="button"
        class=${active ? "is-active" : ""}
        @click=${handler}
      >
        ${label}
      </button>
    `;
  }

  render() {
    const previewHtml = renderRichMarkdownToHtml(this.value);
    const editor = this.editor;

    return html`
      <div class="toolbar">
        <div class="toolbar__group">
          ${this.renderToolbarButton("B", Boolean(editor?.isActive("bold")), () => {
            this.runCommand((instance) => instance.chain().focus().toggleBold().run());
          })}
          ${this.renderToolbarButton("I", Boolean(editor?.isActive("italic")), () => {
            this.runCommand((instance) => instance.chain().focus().toggleItalic().run());
          })}
          ${this.renderToolbarButton("H2", Boolean(editor?.isActive("heading", { level: 2 })), () => {
            this.runCommand((instance) => instance.chain().focus().toggleHeading({ level: 2 }).run());
          })}
          ${this.renderToolbarButton("Lista", Boolean(editor?.isActive("bulletList")), () => {
            this.runCommand((instance) => instance.chain().focus().toggleBulletList().run());
          })}
          ${this.renderToolbarButton("Cita", Boolean(editor?.isActive("blockquote")), () => {
            this.runCommand((instance) => instance.chain().focus().toggleBlockquote().run());
          })}
          ${this.renderToolbarButton("Link", Boolean(editor?.isActive("link")), () => this.promptForLink())}
          ${this.renderToolbarButton("Undo", false, () => {
            this.runCommand((instance) => instance.chain().focus().undo().run());
          })}
          ${this.renderToolbarButton("Redo", false, () => {
            this.runCommand((instance) => instance.chain().focus().redo().run());
          })}
        </div>

        <div class="mode-switch">
          ${(["visual", "markdown", "preview"] as const).map((mode) => html`
            <button
              type="button"
              class=${this.mode === mode ? "is-active" : ""}
              @click=${() => {
                this.mode = mode;
              }}
            >
              ${mode === "visual" ? "Rico" : mode === "markdown" ? "Markdown" : "Preview"}
            </button>
          `)}
        </div>
      </div>

      <p class="meta">
        Editor rico sobre markdown. Puedes mezclar texto, enlaces, imagenes y adjuntos sin tocar JSON del renderer.
      </p>

      <div class="editor-actions">
        <button type="button" ?disabled=${this.uploading} @click=${() => this.requestUpload("image")}>
          ${this.uploading && this.uploadIntent === "image" ? "Subiendo imagen..." : "Subir imagen"}
        </button>
        <button type="button" ?disabled=${this.uploading} @click=${() => this.requestUpload("file")}>
          ${this.uploading && this.uploadIntent === "file" ? "Subiendo archivo..." : "Adjuntar archivo"}
        </button>
      </div>

      ${this.message ? html`<p class="message">${this.message}</p>` : null}
      ${this.errorMessage ? html`<p class="error">${this.errorMessage}</p>` : null}

      <div class="editor-shell" ?hidden=${this.mode !== "visual"}>
        <div data-editor-surface></div>
      </div>

      <textarea
        ?hidden=${this.mode !== "markdown"}
        .value=${this.value}
        @input=${(event: Event) => this.handleMarkdownInput(event)}
      ></textarea>

      <div class="preview" ?hidden=${this.mode !== "preview"}>
        ${previewHtml ? unsafeHTML(previewHtml) : html`<p class="meta">Todavia no hay contenido escrito.</p>`}
      </div>

      <div class="assets-panel">
        <h4>Media del bloque</h4>
        ${this.assetsLoading
          ? html`<p class="meta">Cargando assets recientes...</p>`
          : this.assets.length
            ? html`
                <div class="assets-grid">
                  ${this.assets.map((asset) => html`
                    <article class="asset-card">
                      ${asset.kind === "image"
                        ? html`<img src=${asset.publicUrl} alt=${asset.name} />`
                        : html`<span>${asset.kind}</span>`}
                      <div>
                        <strong title=${asset.name}>${asset.name}</strong>
                        <span>${asset.updatedAt ? new Date(asset.updatedAt).toLocaleString() : "sin fecha"}</span>
                      </div>
                      <button type="button" @click=${() => this.insertUploadedAsset(asset)}>
                        Insertar
                      </button>
                    </article>
                  `)}
                </div>
              `
            : html`<p class="meta">Todavia no hay assets en este bloque. El primer upload crea la libreria.</p>`}
      </div>

      <input data-upload-input type="file" hidden @change=${(event: Event) => void this.handleUploadSelection(event)} />
    `;
  }
}

if (!customElements.get("rich-text-editor")) {
  customElements.define("rich-text-editor", RichTextEditorElement);
}
