import { LitElement, css, html } from "lit";
import { loadVerificationSnapshotForBrowser } from "../../lib/browser-platform";
import {
  formatDateTime,
  LOCALE_CHANGE_EVENT,
  getActiveLocale,
  translate,
  type SupportedLocale
} from "../../lib/i18n";
import type { BadgeSnapshot } from "../../lib/platform-types";
import { resolveVerificationTokenFromUrl } from "../../lib/verification-token";

class BadgeViewerElement extends LitElement {
  static properties = {
    token: { type: String },
    learnerName: { type: String, attribute: "learner-name" },
    courseTitle: { type: String, attribute: "course-title" },
    issuedAt: { type: String, attribute: "issued-at" },
    issuer: { type: String },
    status: { type: String },
    criteria: { type: String },
    loading: { state: true },
    errorMessage: { state: true },
    locale: { state: true }
  };

  token = "";
  learnerName = "";
  courseTitle = "";
  issuedAt = "";
  issuer = "";
  status = "";
  criteria = "";
  loading = false;
  errorMessage = "";
  locale: SupportedLocale = getActiveLocale();
  private readonly handleLocaleChange = (event: Event) => {
    this.locale = (event as CustomEvent<{ locale?: SupportedLocale }>).detail?.locale || getActiveLocale();
  };

  static styles = css`
    :host {
      display: block;
    }

    article {
      padding: 1.6rem;
      border-radius: 26px;
      border: 1px solid var(--brand-border-strong, rgba(184, 135, 0, 0.28));
      background: var(
        --surface-panel-strong,
        linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(250, 244, 232, 0.92))
      );
      color: var(--brand-text, #0f172a);
      box-shadow: var(--shadow-xl, 0 28px 80px rgba(15, 23, 42, 0.12));
    }

    h3,
    p {
      margin: 0;
    }

    .status {
      display: inline-flex;
      margin-bottom: 1rem;
      padding: 0.38rem 0.72rem;
      border-radius: 999px;
      background: var(--surface-soft, rgba(184, 135, 0, 0.08));
      color: var(--brand-gold, #b88700);
      font-family: var(--font-mono, "Trebuchet MS", sans-serif);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 0.78rem;
    }

    .grid {
      display: grid;
      gap: 0.7rem;
      margin-top: 1rem;
      color: var(--brand-text-soft, #334155);
    }

    .message,
    .error {
      margin-top: 1rem;
      padding: 0.9rem 1rem;
      border: 1px solid transparent;
      border-radius: 16px;
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
  `;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(LOCALE_CHANGE_EVENT, this.handleLocaleChange as EventListener);
    if (!this.token && typeof window !== "undefined") {
      this.token = resolveVerificationTokenFromUrl(new URL(window.location.href));
    }

    if (this.token) {
      void this.loadTokenSnapshot();
    }
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has("token") && this.token) {
      void this.loadTokenSnapshot();
    }
  }

  disconnectedCallback() {
    window.removeEventListener(LOCALE_CHANGE_EVENT, this.handleLocaleChange as EventListener);
    super.disconnectedCallback();
  }

  applySnapshot(snapshot: BadgeSnapshot) {
    this.learnerName = snapshot.learnerName;
    this.courseTitle = snapshot.courseTitle;
    this.issuedAt = snapshot.issuedAt;
    this.issuer = snapshot.issuer;
    this.status = snapshot.status;
    this.criteria = snapshot.criteria;
  }

  async loadTokenSnapshot() {
    this.loading = true;
    this.errorMessage = "";

    try {
      const snapshot = await loadVerificationSnapshotForBrowser(this.token);
      if (!snapshot) {
        throw new Error("No se encontro la credencial solicitada.");
      }

      this.applySnapshot(snapshot);
    } catch (error) {
      this.errorMessage = (error as Error).message;
    } finally {
      this.loading = false;
    }
  }

  render() {
    if (!this.token && !this.loading && !this.errorMessage) {
      return html`
        <article>
          <span class="status">awaiting-token</span>
          <h3>${translate(this.locale, "badge.awaiting")}</h3>
          <p>${translate(this.locale, "badge.awaiting.copy")}</p>
        </article>
      `;
    }

    const issuedAt = this.issuedAt
      ? formatDateTime(this.issuedAt, this.locale)
      : translate(this.locale, "badge.pending");

    return html`
      <article>
        <span class="status">${this.status || "issued"}</span>
        <h3>${this.courseTitle}</h3>
        <p>${this.learnerName}</p>
        <div class="grid">
          <span>${translate(this.locale, "badge.issuedAt", { value: issuedAt })}</span>
          <span>${translate(this.locale, "badge.issuer", { value: this.issuer })}</span>
          <span>${translate(this.locale, "badge.criteria", { value: this.criteria })}</span>
          ${this.token ? html`<span>${translate(this.locale, "badge.token", { value: this.token })}</span>` : null}
        </div>
        ${this.loading ? html`<div class="message">${translate(this.locale, "badge.validating")}</div>` : null}
        ${this.errorMessage ? html`<div class="error">${this.errorMessage}</div>` : null}
      </article>
    `;
  }
}

if (!customElements.get("badge-viewer")) {
  customElements.define("badge-viewer", BadgeViewerElement);
}
