import { supabase } from '../supabase.js';
import { store } from '../store.js';
import { escapeHtml, safeUrl, toDisplayNumber } from '../utils/sanitize.js';

export function Ranking(container) {
  container.innerHTML = `
    <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 40px; position: relative; z-index: 1;">

      <div style="margin-top: 30px; animation: fadeIn 0.5s ease-out;">
        <div class="section-title" style="margin-bottom: 24px;">
          <h2 style="font-size: 1.8rem; letter-spacing: -0.5px;">Tabla de <span class="text-gradient">Maestria</span></h2>
          <p style="color: var(--text-secondary); margin-top: 8px;">Los 50 estudiantes con mas XP acumulado en el campus.</p>
        </div>

        <div id="ranking-list" class="glass-panel" style="padding: 0; overflow: hidden; border-radius: 16px;">
          <div style="padding: 40px; text-align: center; color: var(--text-secondary);">
            <div class="spinner" style="margin: 0 auto 20px;"></div>
            Cargando ranking en tiempo real...
          </div>
        </div>
      </div>
    </div>
  `;

  loadRankingData();
}

async function loadRankingData() {
  const rankingList = document.getElementById('ranking-list');
  if (!rankingList) return;

  const currentUserId = store.state.user?.id;
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, display_name, total_xp, current_level, avatar_url')
    .order('total_xp', { ascending: false })
    .limit(50);

  if (error) {
    rankingList.innerHTML = `<div style="padding: 40px; color: #ef4444;">Error al cargar el ranking: ${escapeHtml(error.message)}</div>`;
    return;
  }

  if (!profiles || profiles.length === 0) {
    rankingList.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-secondary);">Aun no hay estudiantes en el ranking. Se el primero.</div>`;
    return;
  }

  let html = `
    <table style="width: 100%; border-collapse: collapse; text-align: left;">
      <thead style="background: rgba(255,255,255,0.03); color: var(--text-secondary); font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">
        <tr>
          <th style="padding: 20px 30px; font-weight: 600;">#</th>
          <th style="padding: 20px; font-weight: 600;">Estudiante</th>
          <th style="padding: 20px; font-weight: 600;">Nivel</th>
          <th style="padding: 20px 30px; font-weight: 600; text-align: right;">Total XP</th>
        </tr>
      </thead>
      <tbody style="font-size: 1rem;">
  `;

  profiles.forEach((profile, index) => {
    const isTop3 = index < 3;
    const isCurrentUser = profile.id === currentUserId;
    const medalColor = index === 0 ? '#FFD700' : (index === 1 ? '#C0C0C0' : '#CD7F32');
    const rowBg = isCurrentUser
      ? 'linear-gradient(90deg, rgba(255,215,0,0.08) 0%, rgba(255,215,0,0.02) 100%)'
      : isTop3
        ? 'linear-gradient(90deg, rgba(99,102,241,0.05) 0%, transparent 100%)'
        : 'transparent';
    const avatarUrl = safeUrl(profile.avatar_url);

    html += `
      <tr style="border-bottom: 1px solid var(--panel-border); background: ${rowBg}; transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='${rowBg}'">
        <td style="padding: 20px 30px; font-weight: 700; width: 60px;">
          ${isTop3 ? `<span style="display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 50%; background: ${medalColor}; color: #000; font-size: 0.8rem;">${index + 1}</span>` : `<span style="padding-left: 10px;">${index + 1}</span>`}
        </td>
        <td style="padding: 20px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 36px; height: 36px; border-radius: 50%; background: var(--panel-bg); border: 1px solid var(--panel-border); display: flex; align-items: center; justify-content: center; overflow: hidden;">
              ${avatarUrl ? `<img src="${avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">` : `<i data-lucide="user" style="width: 18px; color: var(--text-secondary);"></i>`}
            </div>
            <span style="font-weight: 500;">${escapeHtml(profile.display_name || 'Anonimo')}${isCurrentUser ? ' (Tu)' : ''}</span>
          </div>
        </td>
        <td style="padding: 20px;">
          <span class="badge" style="background: rgba(99,102,241,0.1); color: var(--accent-color); border: 1px solid rgba(99,102,241,0.2);">Nivel ${toDisplayNumber(profile.current_level)}</span>
        </td>
        <td style="padding: 20px 30px; text-align: right; font-weight: 700; font-family: 'Inter', sans-serif; color: var(--accent-color);">
          ${toDisplayNumber(profile.total_xp).toLocaleString()} XP
        </td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  rankingList.innerHTML = html;

  if (window.lucide) window.lucide.createIcons();
}
