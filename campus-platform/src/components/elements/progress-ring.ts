import { LitElement, css, html } from "lit";

class ProgressRingElement extends LitElement {
  static properties = {
    percent: { type: Number },
    label: { type: String },
    detail: { type: String }
  };

  percent = 0;
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
        conic-gradient(var(--brand-gold, #b88700) calc(var(--percent) * 1%), var(--surface-soft, rgba(184, 135, 0, 0.08)) 0);
      padding: 0.85rem;
      box-shadow: inset 0 0 0 1px var(--brand-border, rgba(15, 23, 42, 0.12));
    }

    .ring::before {
      content: "";
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: var(--surface-card, rgba(255, 255, 255, 0.97));
      box-shadow: inset 0 0 0 1px var(--brand-border, rgba(15, 23, 42, 0.12));
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
      font-size: 2rem;
    }

    p,
    span {
      margin: 0;
      color: var(--brand-text-soft, #334155);
      text-align: center;
    }
  `;

  render() {
    return html`
      <div class="ring" style="--percent:${this.percent}">
        <div class="value">
          <strong>${this.percent}%</strong>
          <span>${this.label}</span>
        </div>
      </div>
      <p>${this.detail}</p>
    `;
  }
}

if (!customElements.get("progress-ring")) {
  customElements.define("progress-ring", ProgressRingElement);
}
