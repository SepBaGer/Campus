import { LitElement, css, html } from "lit";
import {
  LOCALE_CHANGE_EVENT,
  getActiveLocale,
  translate,
  type SupportedLocale
} from "../../lib/i18n";

class CourseCardElement extends LitElement {
  static properties = {
    title: { type: String },
    summary: { type: String },
    eyebrow: { type: String },
    audience: { type: String, attribute: "audience" },
    accessModel: { type: String, attribute: "access-model" },
    priceLabel: { type: String, attribute: "price-label" },
    deliveryLabel: { type: String, attribute: "delivery-label" },
    runLabel: { type: String, attribute: "run-label" },
    progressPercent: { type: Number, attribute: "progress-percent" },
    competenciesJson: { type: String, attribute: "competencies-json" },
    href: { type: String },
    locale: { state: true }
  };

  title = "";
  summary = "";
  eyebrow = "";
  audience = "";
  accessModel = "";
  priceLabel = "";
  deliveryLabel = "";
  runLabel = "";
  progressPercent = 0;
  competenciesJson = "[]";
  href = "/catalogo";
  locale: SupportedLocale = getActiveLocale();
  private readonly handleLocaleChange = (event: Event) => {
    this.locale = (event as CustomEvent<{ locale?: SupportedLocale }>).detail?.locale || getActiveLocale();
  };

  static styles = css`
    :host {
      display: block;
      height: 100%;
    }

    article {
      display: grid;
      gap: 1rem;
      height: 100%;
      padding: 1.35rem;
      border-radius: 24px;
      border: 1px solid var(--brand-border, rgba(15, 23, 42, 0.12));
      background: var(
        --surface-panel-strong,
        linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(250, 244, 232, 0.92))
      );
      box-shadow: var(--shadow-lg, 0 18px 48px rgba(15, 23, 42, 0.08));
      color: var(--brand-text, #0f172a);
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      width: fit-content;
      padding: 0.35rem 0.65rem;
      border-radius: 999px;
      background: var(--surface-soft, rgba(184, 135, 0, 0.08));
      color: var(--brand-gold, #b88700);
      font-family: var(--font-mono, "Trebuchet MS", sans-serif);
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    h3 {
      margin: 0;
      font-family: var(--font-display, "Poppins", sans-serif);
      font-size: 1.42rem;
      line-height: 1.12;
    }

    p {
      margin: 0;
      color: var(--brand-text-soft, #334155);
      line-height: 1.65;
    }

    .meta {
      display: grid;
      gap: 0.65rem;
    }

    .competencies {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .competency {
      display: inline-flex;
      align-items: center;
      padding: 0.42rem 0.68rem;
      border-radius: 999px;
      background: var(--surface-soft, rgba(184, 135, 0, 0.08));
      border: 1px solid var(--brand-border-strong, rgba(184, 135, 0, 0.28));
      color: var(--brand-text-soft, #334155);
      font-size: 0.82rem;
      font-weight: 600;
    }

    .meta-row {
      display: grid;
      gap: 0.18rem;
      padding: 0.85rem 0.95rem;
      border-radius: 16px;
      border: 1px solid var(--brand-border, rgba(15, 23, 42, 0.12));
      background: var(--surface-tint, rgba(15, 23, 42, 0.04));
    }

    .meta-row strong {
      font-size: 0.82rem;
      color: var(--brand-gold, #b88700);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .meta-row span {
      color: var(--brand-text-soft, #334155);
      font-size: 0.94rem;
    }

    .footer {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
      justify-content: space-between;
      margin-top: auto;
    }

    .progress {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--brand-muted, #64748b);
      font-size: 0.9rem;
      font-weight: 600;
    }

    .progress::before {
      content: "";
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: var(--brand-gold, #b88700);
      box-shadow: 0 0 0 8px var(--surface-soft, rgba(184, 135, 0, 0.08));
    }

    a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 0.78rem 1rem;
      border-radius: 999px;
      border: 1px solid var(--brand-gold, #b88700);
      background: var(--brand-gold, #b88700);
      color: var(--brand-dark, #09162c);
      font-weight: 800;
      letter-spacing: 0.04em;
      text-decoration: none;
    }
  `;

  resolveCompetencies() {
    try {
      const parsed = JSON.parse(this.competenciesJson) as Array<{ title?: string; bloomLabel?: string }>;
      return Array.isArray(parsed) ? parsed.filter((entry) => entry?.title).slice(0, 3) : [];
    } catch {
      return [];
    }
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(LOCALE_CHANGE_EVENT, this.handleLocaleChange as EventListener);
  }

  disconnectedCallback() {
    window.removeEventListener(LOCALE_CHANGE_EVENT, this.handleLocaleChange as EventListener);
    super.disconnectedCallback();
  }

  render() {
    const competencies = this.resolveCompetencies();

    return html`
      <article>
        <span class="eyebrow">${this.eyebrow}</span>
        <h3>${this.title}</h3>
        <p>${this.summary}</p>

        ${competencies.length
          ? html`
              <div class="competencies" role="list" aria-label=${translate(this.locale, "course.meta.competencies")}>
                ${competencies.map((competency) => html`
                  <span class="competency" role="listitem">${competency.title}${competency.bloomLabel ? ` | ${competency.bloomLabel}` : ""}</span>
                `)}
              </div>
            `
          : null}

        <div class="meta">
          <div class="meta-row">
            <strong>${translate(this.locale, "course.meta.audience")}</strong>
            <span>${this.audience}</span>
          </div>
          <div class="meta-row">
            <strong>${translate(this.locale, "course.meta.access")}</strong>
            <span>${this.accessModel}</span>
          </div>
          <div class="meta-row">
            <strong>${translate(this.locale, "course.meta.rhythm")}</strong>
            <span>${this.deliveryLabel} | ${this.runLabel}</span>
          </div>
        </div>

        <div class="footer">
          <span class="progress">
            ${translate(this.locale, "course.progress.visible", { percent: this.progressPercent })}
          </span>
          <a href="${this.href}">${this.priceLabel}</a>
        </div>
      </article>
    `;
  }
}

if (!customElements.get("course-card")) {
  customElements.define("course-card", CourseCardElement);
}
