import { store } from '../store.js';
import { escapeHtml } from '../utils/sanitize.js';

function splitCatalogTitle(rawTitle) {
  const parts = String(rawTitle || '').split(' - ').map((part) => part.trim()).filter(Boolean);

  if (parts.length >= 3) {
    return {
      meta: `${parts[0]} - ${parts[1]}`,
      title: parts.slice(2).join(' - ')
    };
  }

  if (parts.length === 2) {
    return {
      meta: parts[0],
      title: parts[1]
    };
  }

  return {
    meta: '',
    title: rawTitle || 'Contenido'
  };
}

function renderSectionHeader({ icon, label, color = 'var(--navy)' }) {
  return `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
      <i data-lucide="${icon}" style="width:18px;color:${color};"></i>
      <h2 style="margin:0;font-size:1.65rem;letter-spacing:1px;text-transform:uppercase;color:${color};">${escapeHtml(label)}</h2>
    </div>
  `;
}

function renderCatalogCard({ href, meta, title, subtitle, body, accent = '#C9A227', completed = false }) {
  return `
    <a href="${href}" style="text-decoration:none;color:inherit;">
      <div class="glass-panel" style="height:100%;padding:24px 28px;border-radius:22px;border-left:4px solid ${accent};background:rgba(255,255,255,0.88);box-shadow:0 16px 40px rgba(18,37,98,0.08);display:flex;flex-direction:column;gap:10px;transition:transform .25s,border-color .25s,box-shadow .25s;" onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 24px 50px rgba(18,37,98,0.12)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 16px 40px rgba(18,37,98,0.08)'">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
          <div style="font-size:0.82rem;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;color:${accent};">${escapeHtml(meta)}</div>
          ${completed ? '<i data-lucide="check-circle-2" style="width:18px;color:var(--success);"></i>' : ''}
        </div>
        <h3 style="margin:0;font-size:1.15rem;line-height:1.25;color:var(--navy);">${escapeHtml(title)}</h3>
        ${subtitle ? `<p style="margin:0;color:var(--text-secondary);font-size:0.98rem;font-weight:500;line-height:1.45;">${escapeHtml(subtitle)}</p>` : ''}
        ${body ? `<p style="margin:0;color:var(--text-muted);font-size:0.93rem;line-height:1.65;">${escapeHtml(body)}</p>` : ''}
      </div>
    </a>
  `;
}

export function Syllabus(container) {
  const levels = store.state.levels || [];
  const lessons = store.state.lessons || [];
  const progress = store.state.progress || [];

  const getLevel = (id) => levels.find((level) => level.id === id) || null;
  const getLessonsForLevel = (id) => lessons.filter((lesson) => lesson.level_id === id).sort((a, b) => a.orden - b.orden);
  const isCompleted = (lessonId) => progress.some((item) => item.lesson_id === lessonId);

  const receptionLevel = getLevel(1);
  const receptionLesson = getLessonsForLevel(1)[0];
  const onboardingLevel = getLevel(2);
  const onboardingLesson = getLessonsForLevel(2)[0];
  const methodLessons = getLessonsForLevel(3);
  const appliedLessons = getLessonsForLevel(4);
  const closingLevel = getLevel(5);
  const closingLesson = getLessonsForLevel(5)[0];

  const onboardingParts = String(onboardingLevel?.descripcion || '').split('.').map((part) => part.trim()).filter(Boolean);
  const onboardingSubtitle = onboardingLesson?.descripcion || onboardingParts[0] || '';
  const onboardingBody = onboardingParts.slice(1).join('. ') || 'Configuras entorno, completas Brujula, recibes primeros aceleradores.';

  const html = `
    <div style="flex:1;display:flex;flex-direction:column;overflow-y:auto;padding:40px;">
      <div style="max-width:1080px;margin:0 auto;width:100%;">
        <div style="margin-bottom:42px;">
          <h1 style="font-size:2.5rem;margin-bottom:10px;">Ruta visual del <span class="text-gradient">Programa</span></h1>
          <p style="color:var(--text-secondary);font-size:1.08rem;max-width:760px;">La ruta del Campus ahora sigue el mismo orden narrativo de la cartilla: recepcion, metodo, IA aplicada y cierre.</p>
        </div>

        <section style="margin-bottom:46px;">
          ${renderSectionHeader({ icon: 'play-circle', label: 'Recepcion - Tu puerta de entrada', color: 'var(--blue)' })}
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;">
            ${receptionLevel && receptionLesson ? renderCatalogCard({
              href: `#/leccion/${receptionLesson.id}`,
              meta: receptionLevel.titulo,
              title: splitCatalogTitle(receptionLesson.titulo).title,
              subtitle: receptionLesson.descripcion,
              accent: receptionLevel.color_hex || '#C9A227',
              completed: isCompleted(receptionLesson.id)
            }) : ''}
            ${onboardingLevel && onboardingLesson ? renderCatalogCard({
              href: `#/leccion/${onboardingLesson.id}`,
              meta: onboardingLevel.titulo,
              title: splitCatalogTitle(onboardingLesson.titulo).title,
              subtitle: onboardingSubtitle,
              body: onboardingBody,
              accent: onboardingLevel.color_hex || '#137DC5',
              completed: isCompleted(onboardingLesson.id)
            }) : ''}
          </div>
        </section>

        <section style="margin-bottom:46px;">
          ${renderSectionHeader({ icon: 'book-open', label: 'Parte 1: Metodo - Semanas 3 a 8', color: '#B8860B' })}
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;">
            ${methodLessons.map((lesson) => {
              const titleParts = splitCatalogTitle(lesson.titulo);
              return renderCatalogCard({
                href: `#/leccion/${lesson.id}`,
                meta: titleParts.meta,
                title: titleParts.title,
                subtitle: lesson.descripcion,
                accent: '#E2B007',
                completed: isCompleted(lesson.id)
              });
            }).join('')}
          </div>
        </section>

        <section style="margin-bottom:46px;">
          ${renderSectionHeader({ icon: 'sparkles', label: 'Parte 2: IA Aplicada - Semanas 9 a 15', color: '#B8860B' })}
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;">
            ${appliedLessons.map((lesson) => {
              const titleParts = splitCatalogTitle(lesson.titulo);
              return renderCatalogCard({
                href: `#/leccion/${lesson.id}`,
                meta: titleParts.meta,
                title: titleParts.title,
                subtitle: lesson.descripcion,
                accent: '#E2B007',
                completed: isCompleted(lesson.id)
              });
            }).join('')}
          </div>
        </section>

        <section>
          ${renderSectionHeader({ icon: 'badge-check', label: 'Cierre - Semana 16', color: 'var(--navy)' })}
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;">
            ${closingLevel && closingLesson ? renderCatalogCard({
              href: `#/leccion/${closingLesson.id}`,
              meta: closingLevel.titulo,
              title: splitCatalogTitle(closingLesson.titulo).title,
              subtitle: closingLesson.descripcion,
              accent: closingLevel.color_hex || 'var(--navy)',
              completed: isCompleted(closingLesson.id)
            }) : ''}
          </div>
        </section>
      </div>
    </div>
  `;

  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
}
