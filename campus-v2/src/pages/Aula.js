import { store } from '../store.js';
import { supabase } from '../supabase.js';
import { escapeHtml } from '../utils/sanitize.js';

export function Aula(container, id) {
  const levelId = parseInt(id, 10);
  const nivel = store.state.levels.find((level) => level.id === levelId);

  if (!nivel) {
    container.innerHTML = `<div style="padding: 40px;"><h2>Nivel no encontrado o sin acceso</h2><a href="#/dashboard">Volver</a></div>`;
    return;
  }

  container.innerHTML = `<div style="padding: 40px;"><h3>Cargando lecciones del nivel...</h3></div>`;

  supabase
    .from('lessons')
    .select('*')
    .eq('level_id', nivel.id)
    .order('orden')
    .then(({ data: lessons, error }) => {
      if (error) {
        container.innerHTML = `<div style="padding: 40px;"><h2>Error cargando lecciones</h2><p>${escapeHtml(error.message)}</p></div>`;
        return;
      }

      const lessonList = lessons || [];
      const uncompletedLessons = lessonList.filter(
        (lesson) => !store.state.progress.find((item) => item.lesson_id === lesson.id)
      );
      const isCompleted = uncompletedLessons.length === 0 && lessonList.length > 0;
      const isUnlocked = store.isLevelUnlocked(nivel.id);
      const canAccessPremium = store.isMembershipActive();
      const emptyStateMessage = !isUnlocked
        ? 'Este nivel se desbloquea cuando alcances el progreso requerido.'
        : !canAccessPremium
          ? 'Activa tu membresia para acceder a las lecciones premium de este nivel.'
          : 'No hay lecciones disponibles en este nivel todavia.';

      const html = `
        <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; position: relative; z-index: 1;">
          <div style="padding: 24px 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--panel-border); background: rgba(15, 17, 26, 0.8); backdrop-filter: var(--glass-blur); position: sticky; top: 0; z-index: 20;">
            <div>
              <a href="#/dashboard" style="color: var(--text-secondary); text-decoration: none; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 8px; margin-bottom: 8px; transition: color 0.3s;">
                <i data-lucide="arrow-left" style="width: 16px;"></i> Volver al Programa
              </a>
              <h2 style="font-size: 1.4rem;">Nivel ${nivel.orden}: ${escapeHtml(nivel.titulo)}</h2>
            </div>

            <div style="display: flex; gap: 12px; align-items: center;">
              ${isCompleted ? `<span style="color: var(--success); display:flex; align-items:center; gap: 6px;"><i data-lucide="check-circle" style="width:18px;"></i> Nivel Completado</span>` : ''}
            </div>
          </div>

          <div style="padding: 40px; max-width: 900px;">
            <p style="color: var(--text-secondary); font-size: 1.1rem; line-height: 1.6; margin-bottom: 30px;">
              ${escapeHtml(nivel.descripcion || 'Bienvenido a este nivel maestro. Selecciona una leccion para comenzar.')}
            </p>

            <h3 style="margin-bottom: 20px; font-weight: 600;">Lecciones Disponibles</h3>
            <div style="display: flex; flex-direction: column; gap: 16px;">
              ${lessonList.map((lesson) => {
                const isLessonCompleted = !!store.state.progress.find((item) => item.lesson_id === lesson.id);
                return `
                  <a href="#/leccion/${lesson.id}" style="text-decoration: none; color: inherit;">
                    <div class="glass-panel" style="padding: 20px; display: flex; align-items: center; justify-content: space-between; transition: 0.3s; border: 1px solid ${isLessonCompleted ? 'rgba(16, 185, 129, 0.3)' : 'var(--panel-border)'};" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='var(--panel-bg)'">
                      <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: ${isLessonCompleted ? 'rgba(16,185,129,0.1)' : 'rgba(255, 215, 0, 0.1)'}; display: flex; align-items: center; justify-content: center; color: ${isLessonCompleted ? 'var(--success)' : 'var(--accent-color)'};">
                          <i data-lucide="${isLessonCompleted ? 'check' : 'play'}" style="width: 20px;"></i>
                        </div>
                        <div>
                          <h4 style="font-size: 1.1rem; margin-bottom: 4px;">${lesson.orden}. ${escapeHtml(lesson.titulo)}</h4>
                          <span style="color: var(--text-secondary); font-size: 0.85rem;">${lesson.tipo === 'video' ? 'Video' : 'Documento'} • ${lesson.duracion_minutos} min</span>
                        </div>
                      </div>
                      <span style="color: var(--accent-color); font-weight: 600;">+${lesson.xp_reward} XP</span>
                    </div>
                  </a>
                `;
              }).join('') || `<p style="color: var(--text-secondary);">${escapeHtml(emptyStateMessage)}</p>`}
            </div>
          </div>
        </div>
      `;

      container.innerHTML = html;
      if (window.lucide) window.lucide.createIcons();
    });
}
