import { Logo } from '../components/Logo.js';

export const Landing = {
  render() {
    return `
      <div id="landing-page" style="height: 100vh; overflow-y: auto; background: var(--page-bg); color: var(--text-primary); font-family: 'Poppins', sans-serif;">
        <!-- Header / Nav -->
        <nav style="padding: 24px 60px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--panel-border); background: rgba(15, 17, 26, 0.8); backdrop-filter: var(--glass-blur); position: sticky; top: 0; z-index: 100;">
          ${Logo()}
          <div style="display: flex; gap: 24px; align-items: center;">
            <a href="#/login" style="color: var(--text-secondary); text-decoration: none; font-weight: 500;">Iniciar Sesión</a>
            <a href="#/planes" class="btn-primary" style="padding: 10px 20px; font-size: 0.9rem;">Ver Planes</a>
          </div>
        </nav>

        <!-- Hero Section -->
        <section style="padding: 120px 60px; text-align: center; position: relative; overflow: hidden;">
          <div class="hero-glow" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 600px; height: 600px; background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%); filter: blur(60px); z-index: -1;"></div>
          <div style="max-width: 900px; margin: 0 auto; animation: fadeInUp 0.8s ease-out;">
            <span class="badge" style="margin-bottom: 24px; padding: 8px 16px; border-radius: 20px; background: rgba(255, 215, 0, 0.1); color: var(--accent-color); border: 1px solid rgba(255, 215, 0, 0.2); font-size: 0.85rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">
              Soberanía IA & Estrategia Digital
            </span>
            <h1 style="font-size: 4.5rem; letter-spacing: -3px; line-height: 1; margin-bottom: 24px; font-weight: 800;">
              Tu Carrera en la Era de la <span class="text-gradient">Inteligencia Artificial</span>
            </h1>
            <p style="font-size: 1.25rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 40px; max-width: 700px; margin-left: auto; margin-right: auto;">
              Domina las metodologías de alto impacto y escala tu autoridad digital a través de una ruta de 10 niveles de maestría asistida por IA.
            </p>
            <div style="display: flex; gap: 16px; justify-content: center;">
              <a href="#/login" class="btn-primary" style="padding: 16px 32px; font-size: 1.1rem; border-radius: 14px; box-shadow: 0 10px 30px var(--accent-glow);">
                Empezar Mi Ruta <i data-lucide="zap" style="width: 20px; fill: white;"></i>
              </a>
              <a href="#/planes" class="glass-btn" style="padding: 16px 32px; font-size: 1.1rem; border-radius: 14px;">
                Ver Membresías
              </a>
            </div>
          </div>
        </section>

        <!-- Stat Grid -->
        <section style="padding: 60px; background: rgba(255,255,255,0.02); border-top: 1px solid var(--panel-border); border-bottom: 1px solid var(--panel-border);">
          <div style="max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; text-align: center;">
            <div>
              <div style="font-size: 2.5rem; font-weight: 800; color: var(--accent-color);">10</div>
              <div style="color: var(--text-secondary); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">Niveles de Maestría</div>
            </div>
            <div>
              <div style="font-size: 2.5rem; font-weight: 800; color: var(--accent-color);">100+</div>
              <div style="color: var(--text-secondary); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">Casos de Uso IA</div>
            </div>
            <div>
              <div style="font-size: 2.5rem; font-weight: 800; color: var(--accent-color);">24/7</div>
              <div style="color: var(--text-secondary); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">Acceso al Aula Virtual</div>
            </div>
          </div>
        </section>

        <!-- Footer -->
        <footer style="padding: 60px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
          <p>© 2026 MetodologIA Campus. Todos los derechos reservados.</p>
        </footer>
      </div>
    `;
  },
  init() {
    if (window.lucide) window.lucide.createIcons();
  }
};
