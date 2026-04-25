import { LitElement, css, html } from "lit";
import { getBrowserSession, isBrowserLiveMode, requestMagicLink } from "../../lib/browser-platform";
import {
  LOCALE_CHANGE_EVENT,
  getActiveLocale,
  translate,
  type SupportedLocale
} from "../../lib/i18n";
import { normalizeRedirectPath } from "../../lib/runtime-config";

class MagicLinkFormElement extends LitElement {
  static properties = {
    redirectPath: { type: String, attribute: "redirect-path" },
    message: { state: true },
    errorMessage: { state: true },
    loading: { state: true },
    sessionEmail: { state: true },
    locale: { state: true }
  };

  redirectPath = "/portal";
  message = "";
  errorMessage = "";
  loading = false;
  sessionEmail = "";
  locale: SupportedLocale = getActiveLocale();
  private readonly handleLocaleChange = (event: Event) => {
    this.locale = (event as CustomEvent<{ locale?: SupportedLocale }>).detail?.locale || getActiveLocale();
  };

  static styles = css`
    :host {
      display: block;
    }

    .card {
      display: grid;
      gap: 1rem;
      padding: 1.45rem;
      border-radius: 24px;
      border: 1px solid var(--brand-border, rgba(15, 23, 42, 0.12));
      background: var(
        --surface-panel-strong,
        linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(250, 244, 232, 0.92))
      );
      color: var(--brand-text, #0f172a);
      box-shadow: var(--shadow-lg, 0 18px 48px rgba(15, 23, 42, 0.08));
    }

    form {
      display: grid;
      gap: 0.9rem;
    }

    label {
      display: grid;
      gap: 0.4rem;
      font-weight: 700;
      color: var(--brand-text-soft, #334155);
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

    button,
    a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 2.95rem;
      padding: 0.75rem 1rem;
      border-radius: 999px;
      border: 1px solid transparent;
      text-decoration: none;
      font-weight: 800;
    }

    button {
      background: var(--brand-gold, #b88700);
      border-color: var(--brand-gold, #b88700);
      color: var(--brand-dark, #09162c);
      cursor: pointer;
    }

    .secondary {
      background: var(--surface-soft, rgba(184, 135, 0, 0.08));
      border-color: var(--brand-border-strong, rgba(184, 135, 0, 0.28));
      color: var(--brand-gold, #b88700);
    }

    .message,
    .error {
      padding: 0.9rem 1rem;
      border: 1px solid transparent;
      border-radius: 16px;
    }

    .message {
      background: var(--positive-bg, rgba(220, 252, 231, 0.92));
      border-color: var(--positive-border, rgba(22, 101, 52, 0.18));
      color: var(--positive-text, #166534);
    }

    .error {
      background: var(--danger-bg, rgba(254, 242, 242, 0.96));
      border-color: var(--danger-border, rgba(185, 28, 28, 0.16));
      color: var(--danger-text, #b91c1c);
    }

    h2,
    p {
      margin: 0;
    }

    p {
      color: var(--brand-text-soft, #334155);
    }
  `;

  async connectedCallback() {
    super.connectedCallback();
    window.addEventListener(LOCALE_CHANGE_EVENT, this.handleLocaleChange as EventListener);

    if (!isBrowserLiveMode()) {
      return;
    }

    const session = await getBrowserSession();
    this.sessionEmail = session?.user.email || "";
  }

  disconnectedCallback() {
    window.removeEventListener(LOCALE_CHANGE_EVENT, this.handleLocaleChange as EventListener);
    super.disconnectedCallback();
  }

  async handleSubmit(event: Event) {
    event.preventDefault();
    this.loading = true;
    this.errorMessage = "";
    this.message = "";

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim();
    const next = normalizeRedirectPath(new URL(window.location.href).searchParams.get("next"), this.redirectPath);

    try {
      const result = await requestMagicLink(email, next);
      this.message = result.message;
    } catch (error) {
      this.errorMessage = (error as Error).message;
    } finally {
      this.loading = false;
    }
  }

  render() {
    return html`
      <div class="card">
        <span class="secondary">${translate(this.locale, "magic.badge")}</span>
        <h2>${translate(this.locale, "magic.title")}</h2>
        <p>
          ${translate(this.locale, "magic.subtitle")}
        </p>

        ${this.sessionEmail
          ? html`
              <div class="message">
                ${translate(this.locale, "magic.activeSession", { email: this.sessionEmail })}
              </div>
              <a class="secondary" href="/portal">${translate(this.locale, "magic.goPortal")}</a>
            `
          : html`
              <form @submit=${this.handleSubmit}>
                <label>
                  ${translate(this.locale, "magic.email")}
                  <input type="email" name="email" placeholder="tu@correo.com" required />
                </label>
                <button type="submit" ?disabled=${this.loading}>
                  ${this.loading ? translate(this.locale, "magic.submitting") : translate(this.locale, "magic.submit")}
                </button>
              </form>
            `}

        ${!isBrowserLiveMode()
          ? html`<div class="message">${translate(this.locale, "magic.demo")}</div>`
          : null}
        ${this.message ? html`<div class="message">${this.message}</div>` : null}
        ${this.errorMessage ? html`<div class="error">${this.errorMessage}</div>` : null}
      </div>
    `;
  }
}

if (!customElements.get("magic-link-form")) {
  customElements.define("magic-link-form", MagicLinkFormElement);
}
