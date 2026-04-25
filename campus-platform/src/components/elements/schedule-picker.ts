import { LitElement, css, html } from "lit";
import {
  formatDateTime,
  LOCALE_CHANGE_EVENT,
  getActiveLocale,
  translate,
  type SupportedLocale
} from "../../lib/i18n";

interface SessionOption {
  id: number;
  title: string;
  startsAt: string;
  modality: string;
  locationLabel: string;
}

class SchedulePickerElement extends LitElement {
  static properties = {
    sessions: { type: String },
    selectedIndex: { state: true },
    locale: { state: true }
  };

  sessions = "[]";
  selectedIndex = 0;
  locale: SupportedLocale = getActiveLocale();
  private readonly handleLocaleChange = (event: Event) => {
    this.locale = (event as CustomEvent<{ locale?: SupportedLocale }>).detail?.locale || getActiveLocale();
  };

  static styles = css`
    :host {
      display: grid;
      gap: 0.75rem;
    }

    button,
    .summary {
      width: 100%;
      padding: 0.95rem 1rem;
      border-radius: 18px;
      border: 1px solid var(--brand-border, rgba(15, 23, 42, 0.12));
      background: var(--surface-tint, rgba(15, 23, 42, 0.04));
      text-align: left;
      color: var(--brand-text, #0f172a);
    }

    button {
      cursor: pointer;
      transition:
        border-color 0.2s ease,
        transform 0.2s ease,
        background 0.2s ease;
    }

    button[aria-pressed="true"] {
      border-color: var(--brand-border-strong, rgba(184, 135, 0, 0.28));
      background: var(--surface-soft, rgba(184, 135, 0, 0.08));
      color: var(--brand-text, #0f172a);
      transform: translateY(-1px);
    }

    strong {
      display: block;
      margin-bottom: 0.2rem;
    }

    span {
      color: var(--brand-text-soft, #334155);
    }
  `;

  get parsedSessions(): SessionOption[] {
    try {
      const parsed = JSON.parse(this.sessions) as SessionOption[];
      return Array.isArray(parsed) ? parsed : [];
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
    const options = this.parsedSessions;
    const selected = options[this.selectedIndex];

    return html`
      ${options.map(
        (session, index) => html`
          <button type="button" aria-pressed="${index === this.selectedIndex}" @click=${() => (this.selectedIndex = index)}>
            <strong>${session.title}</strong>
            <span>${formatDateTime(session.startsAt, this.locale)} | ${session.modality}</span>
          </button>
        `
      )}
      ${selected
        ? html`
            <div class="summary">
              <strong>${translate(this.locale, "schedule.suggested")}</strong>
              <span>${selected.locationLabel}</span>
            </div>
          `
        : null}
    `;
  }
}

if (!customElements.get("schedule-picker")) {
  customElements.define("schedule-picker", SchedulePickerElement);
}
