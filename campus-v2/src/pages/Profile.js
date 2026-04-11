import { store } from '../store.js';
import { escapeHtml, toDisplayNumber } from '../utils/sanitize.js';

function formatMembership(user) {
  const plan = user?.membership_plan || 'free';
  const status = user?.membership_status || 'inactive';

  const labels = {
    free: 'Plan Free',
    basic: 'Plan Basic',
    premium: 'Plan Premium',
    enterprise: 'Plan Enterprise'
  };

  const statusLabels = {
    active: 'Activa',
    inactive: 'Inactiva',
    cancelled: 'Cancelada',
    past_due: 'Pago pendiente'
  };

  return `${labels[plan] || 'Plan Free'} - ${statusLabels[status] || 'Inactiva'}`;
}

export function Profile(container) {
  const user = store.state.user;
  const stats = store.getProgressStats();

  if (!user) {
    container.innerHTML = '<div style="padding: 40px;"><h2>Inicia sesion para ver tu perfil</h2></div>';
    return;
  }

  const safeName = escapeHtml(user.display_name || 'Estudiante MetodologIA');
  const safeEmail = escapeHtml(user.email || 'Sin email');
  const recentProgress = [...store.state.progress]
    .sort((left, right) => new Date(right.completed_at || 0) - new Date(left.completed_at || 0))
    .slice(0, 5);

  const html = `
    <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 40px;">
      <div style="max-width: 800px; margin: 0 auto; width: 100%;">
        <div class="glass-panel" style="padding: 40px; border-radius: 24px; display: flex; align-items: center; gap: 32px; margin-bottom: 32px; background: linear-gradient(135deg, rgba(255,215,0,0.05) 0%, rgba(15,17,26,0.8) 100%);">
          <div style="position: relative;">
            <div style="width: 120px; height: 120px; border-radius: 50%; background: var(--panel-bg); border: 3px solid var(--accent-color); display: flex; align-items: center; justify-content: center; font-size: 3rem; font-weight: 800; color: var(--accent-color); box-shadow: 0 0 30px var(--accent-glow);">
              ${safeName.charAt(0).toUpperCase()}
            </div>
            <div style="position: absolute; bottom: 0; right: 0; background: var(--accent-secondary); color: white; padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; border: 2px solid var(--page-bg);">
              FASE ${toDisplayNumber(user.current_level)}
            </div>
          </div>
          <div>
            <h1 style="font-size: 2rem; margin-bottom: 8px;">${safeName}</h1>
            <p style="color: var(--text-secondary); margin-bottom: 16px;">${safeEmail}</p>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <span class="glass-btn" style="padding: 6px 12px; font-size: 0.8rem; border-radius: 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);">
                <i data-lucide="award" style="width: 14px; margin-right: 4px; color: var(--accent-color);"></i>
                ${toDisplayNumber(user.total_xp).toLocaleString()} XP Acumulados
              </span>
              <span class="glass-btn" style="padding: 6px 12px; font-size: 0.8rem; border-radius: 8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);">
                <i data-lucide="check-circle" style="width: 14px; margin-right: 4px; color: var(--success);"></i>
                ${stats.completed} Lecciones
              </span>
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-bottom: 32px;">
          <div class="glass-panel" style="padding: 24px; border-radius: 20px;">
            <h3 style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 20px;">Progreso General</h3>
            <div style="font-size: 2.5rem; font-weight: 800; margin-bottom: 8px;">${stats.percentage}%</div>
            <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden;">
              <div style="width: ${stats.percentage}%; height: 100%; background: var(--accent-color); box-shadow: 0 0 10px var(--accent-glow);"></div>
            </div>
          </div>

          <div class="glass-panel" style="padding: 24px; border-radius: 20px;">
            <h3 style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 20px;">Membresia</h3>
            <div style="font-size: 1.2rem; font-weight: 700; color: var(--accent-color); margin-bottom: 8px;">${escapeHtml(formatMembership(user))}</div>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">Tu acceso premium se valida desde Stripe y Supabase.</p>
          </div>
        </div>

        <h3 style="margin-bottom: 20px;">Lecciones recientes</h3>
        <div class="glass-panel" style="padding: 0; border-radius: 20px; overflow: hidden;">
          ${recentProgress.map((progressItem) => {
            const lesson = store.state.lessons.find((item) => item.id === progressItem.lesson_id);
            return `
              <div style="padding: 16px 24px; border-bottom: 1px solid var(--panel-border); display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 16px;">
                  <div style="color: var(--success);"><i data-lucide="check-circle" style="width: 18px;"></i></div>
                  <div>
                    <div style="font-weight: 600; font-size: 0.95rem;">${escapeHtml(lesson?.titulo || 'Leccion completada')}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${new Date(progressItem.completed_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div style="color: var(--accent-color); font-weight: 700; font-size: 0.85rem;">+${toDisplayNumber(lesson?.xp_reward)} XP</div>
              </div>
            `;
          }).join('') || '<div style="padding: 40px; text-align: center; color: var(--text-secondary);">No has completado lecciones aun.</div>'}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}
