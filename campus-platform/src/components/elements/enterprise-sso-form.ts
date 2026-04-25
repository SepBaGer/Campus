import { LitElement, css, html } from "lit";
import {
  isBrowserLiveMode,
  requestEnterpriseSso
} from "../../lib/browser-platform";
import type { EnterpriseSsoConnection } from "../../lib/enterprise-sso";
import { getConfiguredEnterpriseSsoConnections } from "../../lib/supabase";
import {
  LOCALE_CHANGE_EVENT,
  getActiveLocale,
  translate,
  type SupportedLocale
} from "../../lib/i18n";
import { normalizeRedirectPath } from "../../lib/runtime-config";

class EnterpriseSsoFormElement extends LitElement {
  static properties = {
    redirectPath: { type: String, attribute: "redirect-path" },
    message: { state: true },
    errorMessage: { state: true },
    loading: { state: true },
    locale: { state: true }
  };

  redirectPath = "/portal";
  message = "";
  errorMessage = "";
  loading = false;
  locale: SupportedLocale = getActiveLocale();
  private readonly connections: EnterpriseSsoConnection[] = getConfiguredEnterpriseSsoConnections();
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

    h2,
    p,
    details,
    small {
      margin: 0;
    }

    p,
    small {
      color: var(--brand-text-soft, #334155);
    }

    form,
    .connections {
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

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 2.95rem;
      padding: 0.75rem 1rem;
      border-radius: 999px;
      border: 1px solid transparent;
      font-weight: 800;
      cursor: pointer;
      background: var(--brand-gold, #b88700);
      border-color: var(--brand-gold, #b88700);
      color: var(--brand-dark, #09162c);
    }

    button.secondary {
      justify-content: flex-start;
      border-radius: 18px;
      background: var(--surface-soft, rgba(184, 135, 0, 0.08));
      border-color: var(--brand-border-strong, rgba(184, 135, 0, 0.28));
      color: var(--brand-text, #0f172a);
      text-align: left;
    }

    button:disabled {
      cursor: wait;
      opacity: 0.72;
    }

    .message,
    .error,
    .meta {
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

    .meta {
      background: var(--surface-soft, rgba(184, 135, 0, 0.08));
      border-color: var(--brand-border-strong, rgba(184, 135, 0, 0.18));
    }

    .eyebrow {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: fit-content;
      min-height: 2rem;
      padding: 0.35rem 0.85rem;
      border-radius: 999px;
      background: var(--surface-soft, rgba(184, 135, 0, 0.08));
      border: 1px solid var(--brand-border-strong, rgba(184, 135, 0, 0.28));
      color: var(--brand-gold, #b88700);
      font-size: 0.85rem;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .connection-copy {
      display: grid;
      gap: 0.2rem;
    }

    .connection-label {
      font-weight: 800;
    }

    .connection-meta {
      font-size: 0.9rem;
      color: var(--brand-text-soft, #334155);
    }

    details {
      display: grid;
      gap: 0.8rem;
    }

    summary {
      cursor: pointer;
      font-weight: 700;
      color: var(--brand-text-soft, #334155);
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

  private getNextRedirectPath() {
    return normalizeRedirectPath(new URL(window.location.href).searchParams.get("next"), this.redirectPath);
  }

  private mapError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "");
    if (message === "INVALID_ENTERPRISE_SSO_TARGET") {
      return translate(this.locale, "sso.error.invalid");
    }
    if (/No SSO provider found/i.test(message)) {
      return translate(this.locale, "sso.error.notConfigured");
    }
    if (/SSO is not enabled/i.test(message) || /SAML is not enabled/i.test(message)) {
      return translate(this.locale, "sso.error.disabled");
    }

    return translate(this.locale, "sso.error.generic", { detail: message });
  }

  private async launch(input: { emailOrDomain?: string; providerId?: string }) {
    this.loading = true;
    this.message = "";
    this.errorMessage = "";

    try {
      const result = await requestEnterpriseSso({
        ...input,
        redirectPath: this.getNextRedirectPath()
      });
      this.message = isBrowserLiveMode()
        ? translate(this.locale, "sso.redirecting", { target: result.targetLabel })
        : translate(this.locale, "sso.demo");
    } catch (error) {
      this.errorMessage = this.mapError(error);
    } finally {
      this.loading = false;
    }
  }

  private async handleSubmit(event: Event) {
    event.preventDefault();

    const form = event.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    await this.launch({
      emailOrDomain: String(formData.get("email_or_domain") || ""),
      providerId: String(formData.get("provider_id") || "")
    });
  }

  private async handleConnectionClick(connection: EnterpriseSsoConnection) {
    await this.launch({
      emailOrDomain: connection.domain || "",
      providerId: connection.providerId || ""
    });
  }

  private renderConnection(connection: EnterpriseSsoConnection) {
    const meta = connection.domain || connection.providerId || "";
    return html`
      <button
        class="secondary"
        type="button"
        ?disabled=${this.loading}
        @click=${() => void this.handleConnectionClick(connection)}
      >
        <span class="connection-copy">
          <span class="connection-label">${connection.label}</span>
          ${meta ? html`<span class="connection-meta">${meta}</span>` : null}
          ${connection.hint ? html`<small>${connection.hint}</small>` : null}
        </span>
      </button>
    `;
  }

  render() {
    return html`
      <div class="card">
        <span class="eyebrow">${translate(this.locale, "sso.badge")}</span>
        <h2>${translate(this.locale, "sso.title")}</h2>
        <p>${translate(this.locale, "sso.subtitle")}</p>

        ${this.connections.length
          ? html`
              <div class="connections">
                ${this.connections.map((connection) => this.renderConnection(connection))}
              </div>
            `
          : null}

        <div class="meta">${translate(this.locale, "sso.manualHint")}</div>

        <form @submit=${this.handleSubmit}>
          <label>
            ${translate(this.locale, "sso.emailOrDomain")}
            <input
              type="text"
              name="email_or_domain"
              placeholder=${translate(this.locale, "sso.emailOrDomain.placeholder")}
            />
          </label>

          <details>
            <summary>${translate(this.locale, "sso.providerToggle")}</summary>
            <label>
              ${translate(this.locale, "sso.providerId")}
              <input
                type="text"
                name="provider_id"
                placeholder=${translate(this.locale, "sso.providerId.placeholder")}
              />
            </label>
          </details>

          <button type="submit" ?disabled=${this.loading}>
            ${this.loading ? translate(this.locale, "sso.submitting") : translate(this.locale, "sso.submit")}
          </button>
        </form>

        ${!isBrowserLiveMode()
          ? html`<div class="message">${translate(this.locale, "sso.demo")}</div>`
          : null}
        ${this.message ? html`<div class="message">${this.message}</div>` : null}
        ${this.errorMessage ? html`<div class="error">${this.errorMessage}</div>` : null}
      </div>
    `;
  }
}

if (!customElements.get("enterprise-sso-form")) {
  customElements.define("enterprise-sso-form", EnterpriseSsoFormElement);
}
