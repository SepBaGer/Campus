import { LitElement, css, html } from "lit";
import { createEnrollmentIntent } from "../../lib/browser-platform";
import {
  LOCALE_CHANGE_EVENT,
  getActiveLocale,
  translate,
  type SupportedLocale
} from "../../lib/i18n";

class EnrollmentFormElement extends LitElement {
  static properties = {
    courseTitle: { type: String, attribute: "course-title" },
    accessModel: { type: String, attribute: "access-model" },
    priceLabel: { type: String, attribute: "price-label" },
    ctaLabel: { type: String, attribute: "cta-label" },
    checkoutUrl: { type: String, attribute: "checkout-url" },
    courseRunSlug: { type: String, attribute: "course-run-slug" },
    planCode: { type: String, attribute: "plan-code" },
    priceId: { type: String, attribute: "price-id" },
    submitted: { state: true },
    message: { state: true },
    errorMessage: { state: true },
    loading: { state: true },
    locale: { state: true }
  };

  courseTitle = "";
  accessModel = "";
  priceLabel = "";
  ctaLabel = "Continuar";
  checkoutUrl = "";
  courseRunSlug = "power-skills-pilot-open";
  planCode = "premium";
  priceId = "";
  submitted = false;
  message = "";
  errorMessage = "";
  loading = false;
  locale: SupportedLocale = getActiveLocale();
  private readonly handleLocaleChange = (event: Event) => {
    this.locale = (event as CustomEvent<{ locale?: SupportedLocale }>).detail?.locale || getActiveLocale();
  };

  static styles = css`
    :host {
      display: block;
    }

    form {
      display: grid;
      gap: 0.95rem;
    }

    label {
      display: grid;
      gap: 0.35rem;
      color: var(--brand-text-soft, #334155);
      font-weight: 700;
    }

    input {
      min-height: 2.95rem;
      padding: 0.8rem 0.95rem;
      border: 1px solid var(--brand-border, rgba(15, 23, 42, 0.12));
      border-radius: 16px;
      background: var(--surface-input, rgba(255, 255, 255, 0.86));
      color: var(--brand-text, #0f172a);
    }

    input::placeholder {
      color: var(--brand-muted, #64748b);
    }

    button {
      min-height: 2.95rem;
      border: 1px solid var(--brand-gold, #b88700);
      border-radius: 999px;
      background: var(--brand-gold, #b88700);
      color: var(--brand-dark, #09162c);
      font-weight: 800;
      cursor: pointer;
    }

    .note,
    .error {
      padding: 0.9rem 1rem;
      border: 1px solid transparent;
      border-radius: 16px;
    }

    .note {
      background: var(--surface-soft, rgba(184, 135, 0, 0.08));
      border-color: var(--brand-border-strong, rgba(184, 135, 0, 0.28));
      color: var(--brand-text-soft, #334155);
    }

    .error {
      background: var(--danger-bg, rgba(254, 242, 242, 0.96));
      border-color: var(--danger-border, rgba(185, 28, 28, 0.16));
      color: var(--danger-text, #b91c1c);
    }

    strong {
      color: var(--brand-text, #0f172a);
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener(LOCALE_CHANGE_EVENT, this.handleLocaleChange as EventListener);
  }

  disconnectedCallback() {
    window.removeEventListener(LOCALE_CHANGE_EVENT, this.handleLocaleChange as EventListener);
    super.disconnectedCallback();
  }

  async handleSubmit(event: Event) {
    event.preventDefault();
    this.loading = true;
    this.submitted = true;
    this.message = "";
    this.errorMessage = "";

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim();

    try {
      if (this.checkoutUrl) {
        window.location.assign(this.checkoutUrl);
        return;
      }

      const result = await createEnrollmentIntent({
        email,
        courseRunSlug: this.courseRunSlug,
        planCode: this.planCode,
        priceId: this.priceId || undefined,
        planLabel: this.priceLabel
      });

      const checkoutUrl = "checkout_url" in result ? result.checkout_url : undefined;
      this.message = "message" in result ? String(result.message || "") : "Tu acceso quedo listo para el siguiente paso.";

      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }
    } catch (error) {
      this.errorMessage = (error as Error).message;
    } finally {
      this.loading = false;
    }
  }

  render() {
    return html`
      <form @submit=${this.handleSubmit}>
        <div class="note">
          <strong>${this.courseTitle}</strong><br />
          ${this.accessModel} | ${this.priceLabel}
        </div>
        <label>
          ${translate(this.locale, "enrollment.email")}
          <input type="email" name="email" placeholder="tu@correo.com" required />
        </label>
        <button type="submit">
          ${this.loading ? translate(this.locale, "enrollment.submitting") : this.ctaLabel}
        </button>
        ${this.submitted
          ? html`<div class="note">${translate(this.locale, "enrollment.sessionHint")}</div>`
          : null}
        ${this.message ? html`<div class="note">${this.message}</div>` : null}
        ${this.errorMessage ? html`<div class="error">${this.errorMessage}</div>` : null}
      </form>
    `;
  }
}

if (!customElements.get("enrollment-form")) {
  customElements.define("enrollment-form", EnrollmentFormElement);
}
