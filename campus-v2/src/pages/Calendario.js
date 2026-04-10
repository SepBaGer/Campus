import { supabase } from '../supabase.js';
import { escapeHtml, safeUrl } from '../utils/sanitize.js';

export function Calendario(container) {
  container.innerHTML = `
    <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 40px; position: relative; z-index: 1;"><div style="margin-top: 30px; animation: slideUp 0.7s ease-out;">
        <div class="section-title" style="margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <h2 style="font-size: 1.8rem;">Agenda de <span class="text-gradient">Mentorias</span></h2>
            <p style="color: var(--text-secondary); margin-top: 8px;">Sesiones en vivo, masterclasses y eventos de la comunidad.</p>
          </div>
          <div style="font-size: 0.9rem; color: var(--accent-color); font-weight: 500; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="clock" style="width: 16px;"></i> Zona Horaria: GMT-5
          </div>
        </div>

        <div id="events-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 24px;">
            <div style="padding: 40px; text-align: center; color: var(--text-secondary); grid-column: 1 / -1;">
              <div class="spinner" style="margin: 0 auto 20px;"></div>
              Consultando la agenda de la academia...
            </div>
        </div>
      </div>
    </div>
  `;

  loadEvents();
}

async function loadEvents() {
  const list = document.getElementById('events-list');
  if (!list) return;

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .gt('fecha_inicio', new Date().toISOString())
    .order('fecha_inicio', { ascending: true });

  if (error || !events || events.length === 0) {
    list.innerHTML = `
      <div class="glass-panel" style="padding: 60px; text-align: center; grid-column: 1 / -1;">
        <i data-lucide="calendar-off" style="width: 48px; height: 48px; color: var(--text-secondary); margin-bottom: 20px; opacity: 0.4;"></i>
        <h3>No hay eventos programados</h3>
        <p style="color: var(--text-secondary); margin-top: 10px;">Vuelve pronto para ver las nuevas mentorias.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  list.innerHTML = events.map((event) => {
    const date = new Date(event.fecha_inicio);
    const day = date.getDate();
    const month = date.toLocaleString('es-ES', { month: 'short' }).toUpperCase();
    const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const meetingUrl = safeUrl(event.url_meeting);

    return `
      <div class="glass-panel event-card" style="padding: 24px; display: flex; flex-direction: column; height: 100%; border-left: 4px solid var(--accent-color);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
          <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 12px; text-align: center; min-width: 60px; border: 1px solid var(--panel-border);">
            <div style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary);">${day}</div>
            <div style="font-size: 0.7rem; font-weight: 600; color: var(--accent-color); letter-spacing: 1px;">${month}</div>
          </div>
          <span class="badge" style="background: rgba(99,102,241,0.1); color: var(--accent-color); border: 1px solid rgba(99,102,241,0.2);">LIVE</span>
        </div>

        <h3 style="font-size: 1.15rem; margin-bottom: 12px; line-height: 1.4;">${escapeHtml(event.titulo)}</h3>
        <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin-bottom: 24px; flex: 1;">${escapeHtml(event.descripcion || 'Sin descripcion detallada.')}</p>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: auto; padding-top: 20px; border-top: 1px solid var(--panel-border);">
          <div style="display: flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 0.85rem;">
            <i data-lucide="clock" style="width: 14px;"></i> ${time} HRS
          </div>
          ${meetingUrl
            ? `<a href="${meetingUrl}" target="_blank" rel="noreferrer" class="btn-primary" style="padding: 8px 16px; font-size: 0.85rem;">
                Unirse <i data-lucide="video" style="width: 14px; margin-left: 6px;"></i>
              </a>`
            : '<span style="font-size: 0.85rem; color: var(--text-muted);">Link aun no disponible</span>'}
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}
