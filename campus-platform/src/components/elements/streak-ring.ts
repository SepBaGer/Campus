import { LitElement, css, html } from "lit";

class StreakRingElement extends LitElement {
  static properties = {
    days: { type: Number },
    target: { type: Number },
    label: { type: String },
    detail: { type: String }
  };

  days = 0;
  target = 7;
  label = "";
  detail = "";

  static styles = css`
    :host {
      display: grid;
      justify-items: center;
      gap: 1rem;
    }

    .ring {
      position: relative;
      display: grid;
      place-items: center;
      width: 11rem;
      aspect-ratio: 1;
      border-radius: 50%;
      background:
        conic-gradient(var(--brand-ink, #09162c) calc(var(--percent) * 1%), rgba(9, 22, 44, 0.08) 0);
      padding: 0.9rem;
      box-shadow: inset 0 0 0 1px var(--brand-border, rgba(15, 23, 42, 0.12));
    }

    .ring::before {
      content: "";
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background:
        radial-gradient(circle at top, rgba(184, 135, 0, 0.22), transparent 58%),
        var(--surface-card, rgba(255, 255, 255, 0.97));
      box-shadow: inset 0 0 0 1px rgba(9, 22, 44, 0.08);
    }

    .value {
      position: absolute;
      display: grid;
      justify-items: center;
      gap: 0.2rem;
      font-family: var(--font-display, "Poppins", sans-serif);
      color: var(--brand-text, #0f172a);
    }

    strong {
      font-size: 2.4rem;
      line-height: 1;
    }

    span,
    p {
      margin: 0;
      text-align: center;
      color: var(--brand-text-soft, #334155);
    }

    .target {
      display: inline-flex;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      background: rgba(184, 135, 0, 0.1);
      color: var(--brand-gold, #b88700);
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
  `;

  render() {
    const safeTarget = this.target > 0 ? this.target : 7;
    const percent = Math.max(0, Math.min(100, Math.round((this.days / safeTarget) * 100)));

    return html`
      <div class="ring" style="--percent:${percent}">
        <div class="value">
          <strong>${this.days}</strong>
          <span>${this.label}</span>
        </div>
      </div>
      <span class="target">${safeTarget}</span>
      <p>${this.detail}</p>
    `;
  }
}

if (!customElements.get("streak-ring")) {
  customElements.define("streak-ring", StreakRingElement);
}
