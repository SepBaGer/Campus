import { store } from '../store.js';
import { escapeHtml } from '../utils/sanitize.js';

export function Syllabus(container) {
  const levels = store.state.levels || [];
  const lessons = store.state.lessons || [];
  const progress = store.state.progress || [];

  const html = `
    <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 40px;">
      <div style="max-width: 900px; margin: 0 auto; width: 100%;">
        <div style="margin-bottom: 40px;">
          <h1 style="font-size: 2.5rem; margin-bottom: 12px;">Ruta de <span class="text-gradient">Maestria</span></h1>
          <p style="color: var(--text-secondary); font-size: 1.1rem;">Explora el programa completo de 10 niveles y sigue tu progreso hacia la soberania tecnica.</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 40px;">
          ${levels.map((level) => {
            const levelLessons = lessons.filter((lesson) => lesson.level_id === level.id);
            const levelProgress = levelLessons.filter((lesson) => progress.find((item) => item.lesson_id === lesson.id)).length;
            const levelPercentage = levelLessons.length > 0 ? Math.round((levelProgress / levelLessons.length) * 100) : 0;

            return `
              <div class="glass-panel" style="padding: 0; border-radius: 24px; overflow: hidden; border: 1px solid ${levelPercentage === 100 ? 'rgba(16, 185, 129, 0.3)' : 'var(--panel-border)'};">
                <div style="padding: 24px 32px; background: rgba(255,255,255,0.02); display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--panel-border);">
                  <div style="display: flex; align-items: center; gap: 16px;">
                    <div style="width: 40px; height: 40px; border-radius: 12px; background: ${level.color_hex}; color: black; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.2rem;">
                      ${level.orden}
                    </div>
                    <div>
                      <h3 style="font-size: 1.2rem; margin-bottom: 4px;">${escapeHtml(level.titulo)}</h3>
                      <span style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px;">Nivel de Maestria</span>
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 1.1rem; font-weight: 700; color: ${levelPercentage === 100 ? 'var(--success)' : 'var(--text-primary)'};">${levelPercentage}%</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${levelProgress}/${levelLessons.length} Lecciones</div>
                  </div>
                </div>

                <div style="padding: 16px 32px 32px;">
                  <p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 24px; line-height: 1.6;">${escapeHtml(level.descripcion || 'Descripcion pendiente')}</p>

                  <div style="display: grid; grid-template-columns: repeat(1, 1fr); gap: 12px;">
                    ${levelLessons.map((lesson) => {
                      const isCompleted = progress.find((item) => item.lesson_id === lesson.id);
                      return `
                        <a href="#/leccion/${lesson.id}" style="text-decoration: none; color: inherit;">
                          <div style="padding: 14px 20px; background: rgba(255,255,255,0.03); border-radius: 12px; display: flex; align-items: center; justify-content: space-between; border: 1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.2)' : 'transparent'}; transition: background 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
                            <div style="display: flex; align-items: center; gap: 12px;">
                              <i data-lucide="${isCompleted ? 'check-circle' : 'circle'}" style="width: 18px; color: ${isCompleted ? 'var(--success)' : 'var(--text-muted)'};"></i>
                              <span style="font-weight: 500; font-size: 0.95rem;">${lesson.orden}. ${escapeHtml(lesson.titulo)}</span>
                            </div>
                            <i data-lucide="chevron-right" style="width: 16px; color: var(--text-muted);"></i>
                          </div>
                        </a>
                      `;
                    }).join('') || '<div style="color: var(--text-secondary); font-size: 0.9rem; padding: 20px; text-align: center;">Contenido disponible al desbloquear el nivel.</div>'}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}
