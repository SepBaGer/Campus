import { store } from '../store.js';
import { escapeHtml } from '../utils/sanitize.js';

export function Topbar() {
  const user = store.state.user;
  const stats = store.getProgressStats();
  const displayName = user?.display_name || user?.email?.split('@')[0] || 'Estudiante';
  const safeDisplayName = escapeHtml(displayName);
  const phase = user?.current_level ?? 0;
  const xp = user?.total_xp ?? 0;
  const pct = stats.percentage ?? 0;

  return `
    <header id="global-topbar" class="top-header" style="margin-bottom:0;padding:0 32px;height:64px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--panel-border);background:var(--glass-bg);backdrop-filter:blur(16px);flex-shrink:0;z-index:40;position:sticky;top:0;">
      <div class="search-bar" style="max-width:320px;">
        <i data-lucide="search" style="color:var(--text-secondary);width:18px;"></i>
        <input type="text" placeholder="Buscar fases, modulos, lecciones..." style="background:none;border:none;outline:none;color:var(--text-primary);font-size:0.9rem;width:100%;">
      </div>

      <div style="display:flex;align-items:center;gap:20px;">
        <div style="display:flex;align-items:center;gap:10px;background:rgba(18,37,98,0.03);border:1px solid var(--panel-border);border-radius:12px;padding:6px 14px;box-shadow:0 8px 18px rgba(18,37,98,0.05);">
          <div style="text-align:right;">
            <div style="font-size:0.7rem;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase;">Fase activa ${phase}</div>
            <div style="font-size:0.85rem;font-weight:700;color:var(--navy);">${xp.toLocaleString()} XP</div>
          </div>
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold-dark));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:0.9rem;color:var(--navy);">
            ${phase}
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:8px;" title="${pct}% completado">
          <svg width="36" height="36" viewBox="0 0 36 36" style="transform:rotate(-90deg);">
            <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(18,37,98,0.10)" stroke-width="3"/>
            <circle cx="18" cy="18" r="14" fill="none" stroke="var(--accent-color)" stroke-width="3"
              stroke-dasharray="${Math.round(2 * Math.PI * 14)}"
              stroke-dashoffset="${Math.round(2 * Math.PI * 14 * (1 - pct / 100))}"
              stroke-linecap="round" style="transition:stroke-dashoffset .5s;"/>
          </svg>
          <span style="font-size:0.8rem;color:var(--text-secondary);">${pct}%</span>
        </div>

        <div style="position:relative;cursor:pointer;">
          <i data-lucide="bell" style="width:20px;color:var(--navy);"></i>
          <span style="position:absolute;top:-2px;right:-2px;width:7px;height:7px;background:var(--blue);border-radius:50%;border:1.5px solid var(--page-bg);"></span>
        </div>

        <div style="display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="window.location.hash='#/perfil'" title="Mi Perfil">
          <div class="user-avatar" style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--gold),var(--gold-dark));display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;color:var(--navy);flex-shrink:0;">${safeDisplayName.charAt(0).toUpperCase()}</div>
          <span style="font-size:0.85rem;font-weight:500;color:var(--text-primary);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${safeDisplayName}</span>
        </div>

        <button id="logout-btn" onclick="window.logoutUser()" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;padding:6px;border-radius:8px;transition:color .2s;" title="Cerrar sesion" onmouseover="this.style.color='var(--navy)'" onmouseout="this.style.color='var(--text-secondary)'">
          <i data-lucide="log-out" style="width:18px;"></i>
        </button>
      </div>
    </header>
  `;
}
