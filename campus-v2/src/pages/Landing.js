import { Logo } from '../components/Logo.js';

export const Landing = {
  render() {
    return `
      <div id="landing-page" style="height: 100vh; overflow-y: auto; background: var(--page-bg); color: var(--text-primary); font-family: var(--font-main);">
        <nav style="padding: 24px 60px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--panel-border); background: var(--glass-bg); backdrop-filter: var(--glass-blur); position: sticky; top: 0; z-index: 100;">
          ${Logo()}
          <div style="display: flex; gap: 24px; align-items: center;">
            <a href="#/login" style="color: var(--navy); text-decoration: none; font-weight: 600;">Iniciar sesion</a>
            <a href="#/planes" class="btn-primary" style="padding: 10px 20px; font-size: 0.9rem;">Ver planes</a>
          </div>
        </nav>

        <section style="padding: 120px 60px; text-align: center; position: relative; overflow: hidden;">
          <div class="hero-glow" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 600px; height: 600px; background: radial-gradient(circle, rgba(255,215,0,0.18) 0%, rgba(19,125,197,0.08) 38%, transparent 72%); filter: blur(60px); z-index: -1;"></div>
          <div style="max-width: 900px; margin: 0 auto; animation: fadeInUp 0.8s ease-out;">
            <span class="badge" style="margin-bottom: 24px; padding: 8px 16px; border-radius: 20px; background: rgba(19, 125, 197, 0.08); color: var(--blue); border: 1px solid rgba(19, 125, 197, 0.18); font-size: 0.85rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase;">
              Programa de Empoderamiento en Power Skills
            </span>
            <h1 style="font-size: 4.5rem; letter-spacing: -3px; line-height: 1; margin-bottom: 24px; font-weight: 800; color: var(--navy);">
              Metodo primero. <span class="text-gradient">IA despues.</span>
            </h1>
            <p style="font-size: 1.25rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 40px; max-width: 700px; margin-left: auto; margin-right: auto;">
              Recorre una experiencia de 16 semanas con modulo cero, onboarding, ruta de (R)Evolucion y cierre con hitos reales de aplicacion.
            </p>
            <div style="display: flex; gap: 16px; justify-content: center;">
              <a href="#/login" class="btn-primary" style="padding: 16px 32px; font-size: 1.1rem; border-radius: 14px;">
                Empezar mi ruta <i data-lucide="zap" style="width: 20px; fill: white;"></i>
              </a>
              <a href="#/planes" class="glass-btn" style="padding: 16px 32px; font-size: 1.1rem; border-radius: 14px;">
                Ver membresias
              </a>
            </div>
          </div>
        </section>

        <section style="padding: 60px; background: var(--page-bg-soft); border-top: 1px solid var(--panel-border); border-bottom: 1px solid var(--panel-border);">
          <div style="max-width: 1000px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; text-align: center;">
            <div>
              <div style="font-size: 2.5rem; font-weight: 800;" class="gold-gradient">16</div>
              <div style="color: var(--text-secondary); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">Semanas de recorrido</div>
            </div>
            <div>
              <div style="font-size: 2.5rem; font-weight: 800;" class="gold-gradient">4</div>
              <div style="color: var(--text-secondary); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">Fases del programa</div>
            </div>
            <div>
              <div style="font-size: 2.5rem; font-weight: 800;" class="gold-gradient">12+</div>
              <div style="color: var(--text-secondary); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px;">Modulos aplicados</div>
            </div>
          </div>
        </section>

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
