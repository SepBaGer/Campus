export function Logo() {
  return `
    <div class="brand-logotype" style="display: flex; align-items: center; gap: 14px; cursor: pointer;" onclick="window.location.hash='#/dashboard'">
      <div class="brand-svg-container" style="background: none; border: none; box-shadow: none; padding: 0; width: 34px; height: 34px; overflow: visible;">
        <svg width="34" height="34" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" class="logo-svg" role="img">
            <defs>
                <linearGradient id="logoGradientPremiumOfficial" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#0f172a" stop-opacity="1"></stop>
                    <stop offset="100%" stop-color="#1e293b" stop-opacity="1"></stop>
                </linearGradient>
            </defs>
            <rect width="36" height="36" rx="10" fill="url(#logoGradientPremiumOfficial)"></rect>
            <path d="M10 12h3v12h-3V12zm6 0h3v8h-3v-8zm0 10h3v2h-3v-2zm6-10h3v6h-3v-6zm0 8h3v4h-3v-4z" fill="white"></path>
            <circle cx="18" cy="8" r="2" fill="#FFD700"></circle>
        </svg>
      </div>
      <div style="display: flex; flex-direction: column;">
        <span class="brand-text" style="font-family: 'Poppins', sans-serif; letter-spacing: -0.5px; font-size: 1.1rem; line-height: 1.1;">
          Metodolog<span class="ia-highlight" style="color: #FFD700; font-weight: 900;">IA</span>
        </span>
        <span style="font-size: 0.55rem; color: var(--text-secondary); font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase;">Aceleremos su Estrategia</span>
      </div>
    </div>
  `;
}
