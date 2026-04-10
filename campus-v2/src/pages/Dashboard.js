import { store } from '../store.js';
import { supabase } from '../supabase.js';
import { escapeHtml, toDisplayNumber } from '../utils/sanitize.js';

export function Dashboard(container) {
  const state = store.state;
  const stats = store.getProgressStats();
  const safeDisplayName = escapeHtml(state.user?.display_name || 'Estudiante');

  // Find the current active level (first unlocked-but-incomplete)
  const userLevel = state.user?.current_level ?? 0;
  const nextLevel = (state.levels && state.levels.find(l => l.orden === userLevel))
    || (state.levels && state.levels[0])
    || { id: 1, orden: 0 };

  const levelsHtml = state.levels && state.levels.length > 0
    ? state.levels.map(lvl => renderLevelCard(lvl, state.user)).join('')
    : '<p style="color: var(--text-secondary)">Aún no hay niveles cargados.</p>';

  container.innerHTML = `
    <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
      <div style="flex:1;overflow-y:auto;padding:32px;position:relative;z-index:1;">

        <div class="dashboard-grid">
          <div class="glass-panel card-welcome" style="animation: fadeIn 0.4s ease-out;">
            <h1 style="font-size:1.8rem;margin-bottom:8px;">Programa de <span class="text-gradient">Empoderamiento</span></h1>
            <p style="font-size:0.95rem;color:var(--text-secondary);">Transforma tu relación con el trabajo y la productividad usando IA.</p>
            <div style="margin-top:16px;">
              <a href="#/aula/${nextLevel.id}" style="text-decoration:none;">
                <button class="btn-primary" style="font-size:0.9rem;padding:10px 20px;display:inline-flex;align-items:center;gap:8px;">
                  Retomar: Nivel ${nextLevel.orden} <i data-lucide="play" style="width:16px;fill:white;"></i>
                </button>
              </a>
            </div>
          </div>

          <div class="glass-panel card-progress" style="animation: fadeIn 0.6s ease-out;">
            <h3 style="margin-bottom:16px;font-weight:500;font-size:1rem;">${safeDisplayName} - Nivel ${state.user?.current_level || 0}</h3>
            <div class="circular-progress" style="width:90px;height:90px;margin-bottom:12px;background:conic-gradient(var(--accent-color) ${stats.percentage}%,rgba(255,255,255,0.05) 0deg);">
              <span class="progress-value" style="font-size:1.4rem;">${stats.percentage}%</span>
            </div>
            <p style="color:var(--text-secondary);font-size:0.8rem;">${stats.completed} / ${stats.total} Lecciones Completadas</p>
          </div>
        </div>

        <!-- NEW: Snippets Section (Mundo MetodologIA) -->
        <div class="dashboard-grid" style="margin-top:24px; animation: fadeIn 0.8s ease-out;">
          <div class="glass-panel" style="grid-column: span 6; padding: 20px; display: flex; flex-direction: column; gap: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <h4 style="font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="trophy" style="width: 16px; color: var(--accent-color);"></i> Tabla de Maestría
              </h4>
              <a href="#/ranking" style="font-size: 0.75rem; color: var(--accent-color); text-decoration: none; font-weight: 600;">Ver Todos</a>
            </div>
            <div id="ranking-snippet" style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
               <div style="height: 40px; background: rgba(255,255,255,0.03); border-radius: 8px; animation: pulse 2s infinite;"></div>
               <div style="height: 40px; background: rgba(255,255,255,0.03); border-radius: 8px; animation: pulse 2s infinite;"></div>
            </div>
          </div>

          <div class="glass-panel" style="grid-column: span 6; padding: 20px; display: flex; flex-direction: column; gap: 15px;">
             <div style="display: flex; justify-content: space-between; align-items: center;">
              <h4 style="font-size: 0.95rem; display: flex; align-items: center; gap: 8px;">
                <i data-lucide="calendar" style="width: 16px; color: var(--accent-color);"></i> Próxima Mentoría
              </h4>
              <a href="#/calendario" style="font-size: 0.75rem; color: var(--accent-color); text-decoration: none; font-weight: 600;">Agenda</a>
            </div>
            <div id="event-snippet" style="flex: 1;">
               <div style="height: 100px; background: rgba(255,255,255,0.03); border-radius: 12px; animation: pulse 2s infinite;"></div>
            </div>
          </div>
        </div>

        <div style="margin-top:40px; animation: fadeIn 1s ease-out;">
          <div style="margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;">
            <h2 style="font-size:1.6rem;letter-spacing:-0.5px;">Ruta de (R)Evolución Digital</h2>
            <a href="#/ruta" style="color:var(--accent-color);text-decoration:none;font-size:0.9rem;font-weight:600;display:flex;align-items:center;gap:8px;background:rgba(255,215,0,0.05);padding:8px 16px;border-radius:12px;border:1px solid rgba(255,215,0,0.2);transition:0.3s;" onmouseover="this.style.background='rgba(255,215,0,0.1)'" onmouseout="this.style.background='rgba(255,215,0,0.05)'">
              Ver Ruta Completa <i data-lucide="map" style="width:16px;"></i>
            </a>
          </div>

          <div class="courses-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:24px;">
            ${levelsHtml}
          </div>
        </div>

      </div>
    </div>
  `;
  
  if (window.lucide) window.lucide.createIcons();
  
  // Async loading of snippets
  loadRankingSnippet();
  loadEventSnippet();
}

async function loadRankingSnippet() {
  const container = document.getElementById('ranking-snippet');
  if (!container) return;

  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('display_name, total_xp, current_level')
      .order('total_xp', { ascending: false })
      .limit(3);

    if (!profiles || profiles.length === 0) {
      container.innerHTML = '<p style="font-size:0.8rem;color:var(--text-muted);text-align:center;padding:10px;">No hay datos de ranking.</p>';
      return;
    }

    container.innerHTML = profiles.map((p, i) => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:8px 12px; border-radius:10px; border:1px solid rgba(255,255,255,0.05); transition:0.3s;" onmouseover="this.style.borderColor='rgba(255,215,0,0.2)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.05)'">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:0.8rem; font-weight:700; color:${i === 0 ? 'var(--accent-color)' : 'var(--text-muted)'}">${i + 1}</span>
          <span style="font-size:0.85rem; font-weight:500;">${escapeHtml(p.display_name || 'Estudiante')}</span>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end;">
          <span style="font-size:0.75rem; color:var(--accent-color); font-weight:600;">${toDisplayNumber(p.total_xp).toLocaleString()} XP</span>
          <span style="font-size:0.65rem; color:var(--text-muted);">Niv ${toDisplayNumber(p.current_level)}</span>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p style="font-size:0.75rem; color:var(--text-muted);">Error al cargar ranking.</p>';
  }
}

async function loadEventSnippet() {
  const container = document.getElementById('event-snippet');
  if (!container) return;

  try {
    const { data: events } = await supabase
      .from('events')
      .select('*')
      .gt('fecha_inicio', new Date().toISOString())
      .order('fecha_inicio', { ascending: true })
      .limit(1);

    if (!events || events.length === 0) {
      container.innerHTML = `
        <div style="background:rgba(255,255,255,0.02); padding:15px; border-radius:12px; border:1px dashed rgba(255,255,255,0.1); text-align:center; height:100%; display:flex; align-items:center; justify-content:center;">
          <p style="font-size:0.8rem; color:var(--text-muted);">Próximamente nuevas mentorías.</p>
        </div>
      `;
      return;
    }

    const ev = events[0];
    const date = new Date(ev.fecha_inicio);
    const day = date.getDate();
    const month = date.toLocaleString('es-ES', { month: 'short' }).toUpperCase();
    
    container.innerHTML = `
      <div class="glass-panel" style="background:linear-gradient(135deg, rgba(255,215,0,0.05), transparent); padding:16px; border-radius:12px; border:1px solid rgba(255,215,0,0.15); height:100%;">
        <div style="display:flex; gap:12px; align-items:center; margin-bottom:10px;">
          <div style="background:rgba(255,215,0,0.1); padding:5px 8px; border-radius:8px; text-align:center; border:1px solid rgba(255,215,0,0.2);">
            <div style="font-size:0.9rem; font-weight:700; color:var(--text-primary); line-height:1;">${day}</div>
            <div style="font-size:0.6rem; font-weight:700; color:var(--accent-color);">${month}</div>
          </div>
          <span style="font-size:0.75rem; color:var(--text-secondary); font-weight:600;">Mentoría en Vivo</span>
        </div>
        <h5 style="font-size:0.9rem; margin-bottom:12px; line-height:1.4; color:var(--text-primary); font-weight:600;">${escapeHtml(ev.titulo)}</h5>
        <a href="#/calendario" style="font-size:0.8rem; color:var(--accent-color); text-decoration:none; display:flex; align-items:center; gap:5px; font-weight:700; transition:0.3s;" onmouseover="this.style.gap='8px'" onmouseout="this.style.gap='5px'">
          Ir al Calendario <i data-lucide="arrow-right" style="width:14px;"></i>
        </a>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    container.innerHTML = '<p style="font-size:0.75rem; color:var(--text-muted);">Error al cargar eventos.</p>';
  }
}

function renderLevelCard(lvl, user) {
  const userCurrentLevel = user?.current_level ?? 0;
  const isUnlocked = userCurrentLevel >= lvl.orden;
  const isCompleted = userCurrentLevel > lvl.orden;
  const color = isCompleted ? 'var(--success,#22c55e)' : (isUnlocked ? 'var(--accent-color)' : 'var(--text-muted)');
  const icon = isCompleted ? 'check-circle' : (isUnlocked ? 'play-circle' : 'lock');
  const progress = isCompleted ? 100 : 0;

  return `
    <a href="${isUnlocked ? '#/aula/' + lvl.id : 'javascript:void(0)'}" style="text-decoration:none;color:inherit;${!isUnlocked ? 'opacity:0.55;cursor:not-allowed;' : ''}">
      <div class="glass-panel course-card" style="padding:20px;display:flex;flex-direction:column;gap:16px;height:100%;border:1px solid ${isCompleted ? 'rgba(34,197,94,0.2)' : 'var(--panel-border)'};transition:border-color .3s,transform .3s;" ${isUnlocked ? `onmouseover="this.style.transform='translateY(-2px)';this.style.borderColor='rgba(255,215,0,0.3)'" onmouseout="this.style.transform='none';this.style.borderColor='${isCompleted ? 'rgba(34,197,94,0.2)' : 'var(--panel-border)'}'"` : ''}>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="color:var(--text-secondary);font-size:0.8rem;font-weight:600;text-transform:uppercase;letter-spacing:1px;">Nivel ${lvl.orden}</div>
          <i data-lucide="${icon}" style="color:${color};width:20px;"></i>
        </div>
        <h3 style="font-size:1.05rem;line-height:1.3;margin:0;min-height:44px;display:flex;align-items:center;">${escapeHtml(lvl.titulo)}</h3>
        <div style="background:rgba(255,255,255,0.05);height:3px;border-radius:3px;overflow:hidden;margin-top:auto;">
          <div style="width:${progress}%;background:${color};height:100%;transition:width .5s;"></div>
        </div>
      </div>
    </a>
  `;
}
