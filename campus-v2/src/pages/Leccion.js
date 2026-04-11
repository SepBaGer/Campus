import { store } from '../store.js';
import { supabase } from '../supabase.js';
import { AuthService } from '../auth.js';
import { buildYoutubeEmbedUrl, escapeHtml, formatText, safeUrl } from '../utils/sanitize.js';

function parseMarkdown(markdown) {
  if (!markdown) return '';

  return escapeHtml(markdown)
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;font-family:monospace;">$1</code>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/<\/li>\n<li>/g, '</li><li>')
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul style="padding-left:1.5rem;margin:12px 0;">$1</ul>')
    .replace(/\n\n/g, '</p><p style="margin:12px 0;">')
    .replace(/\n/g, '<br>')
    .trim();
}

function setLessonStatus(message, tone = 'neutral') {
  const status = document.getElementById('lesson-status');
  if (!status) return;

  if (!message) {
    status.style.display = 'none';
    status.textContent = '';
    return;
  }

  status.style.display = 'block';
  status.style.padding = '10px 16px';
  status.style.borderRadius = '10px';
  status.style.margin = '16px 32px 0';
  status.style.background = tone === 'error' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)';
  status.style.color = tone === 'error' ? '#ef4444' : '#22c55e';
  status.textContent = message;
}

export function Leccion(container, id) {
  const lessonId = parseInt(id, 10);

  if (container._lessonUnsubscribe) {
    container._lessonUnsubscribe();
  }

  async function loadAndRender() {
    const { data: lesson, error } = await supabase
      .from('lessons')
      .select('*, levels(id, titulo, orden)')
      .eq('id', lessonId)
      .single();

    if (error || !lesson) {
      container.innerHTML = `
        <div style="padding: 60px; text-align: center;">
          <i data-lucide="lock" style="width: 64px; height: 64px; color: var(--text-muted); margin-bottom: 24px;"></i>
          <h2 style="margin-bottom: 12px;">Leccion inaccesible</h2>
          <p style="color: var(--text-secondary); margin-bottom: 24px;">Esta leccion requiere membresia activa o desbloquear fases previas.</p>
          <a href="#/dashboard" class="btn-primary" style="text-decoration: none;">Volver al panel</a>
        </div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const { data: siblingLessons } = await supabase
      .from('lessons')
      .select('id, titulo')
      .eq('level_id', lesson.level_id)
      .order('orden');

    const lessonList = siblingLessons || [];
    const currentIndex = lessonList.findIndex((item) => item.id === lessonId);
    const nextLesson = currentIndex !== -1 && currentIndex < lessonList.length - 1 ? lessonList[currentIndex + 1] : null;
    const prevLesson = currentIndex > 0 ? lessonList[currentIndex - 1] : null;
    const isLessonCompleted = !!store.state.progress?.find((item) => item.lesson_id === lessonId);

    window.markLessonCompleted = async () => {
      const btn = document.getElementById('complete-btn');
      setLessonStatus('', 'neutral');

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" style="width:18px;animation:spin 1s linear infinite;"></i> Guardando...';
        if (window.lucide) window.lucide.createIcons();
      }

      try {
        await store.completeLesson(lessonId);
        setLessonStatus('Leccion marcada como completada.', 'success');

        if (nextLesson) {
          window.location.hash = `#/leccion/${nextLesson.id}`;
        } else {
          window.location.hash = `#/aula/${lesson.level_id}`;
        }
      } catch (completionError) {
        setLessonStatus(completionError.message || 'No fue posible registrar tu progreso.', 'error');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `<i data-lucide="check-circle" style="width:18px;"></i> Marcar Finalizada (+${lesson.xp_reward || 100} XP)`;
          if (window.lucide) window.lucide.createIcons();
        }
      }
    };

    const prevBtnHtml = prevLesson
      ? `<button onclick="window.location.hash='#/leccion/${prevLesson.id}'" class="nav-btn" style="padding:8px 14px;border-radius:8px;border:none;background:none;color:var(--text-primary);cursor:pointer;display:flex;align-items:center;gap:6px;font-size:0.85rem;transition:background .2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='none'">
          <i data-lucide="chevron-left" style="width:16px;"></i> Anterior
        </button>`
      : `<button disabled style="padding:8px 14px;border-radius:8px;border:none;background:none;color:var(--text-muted);cursor:not-allowed;display:flex;align-items:center;gap:6px;font-size:0.85rem;opacity:0.4;">
          <i data-lucide="chevron-left" style="width:16px;"></i> Anterior
        </button>`;

    const nextBtnHtml = nextLesson
      ? `<button onclick="window.location.hash='#/leccion/${nextLesson.id}'" class="nav-btn" style="padding:8px 14px;border-radius:8px;border:none;background:none;color:var(--text-primary);cursor:pointer;display:flex;align-items:center;gap:6px;font-size:0.85rem;transition:background .2s;" onmouseover="this.style.background='rgba(255,255,255,0.08)'" onmouseout="this.style.background='none'">
          Siguiente <i data-lucide="chevron-right" style="width:16px;"></i>
        </button>`
      : `<button disabled style="padding:8px 14px;border-radius:8px;border:none;background:none;color:var(--text-muted);cursor:not-allowed;display:flex;align-items:center;gap:6px;font-size:0.85rem;opacity:0.4;">
          Siguiente <i data-lucide="chevron-right" style="width:16px;"></i>
        </button>`;

    const completeBtnHtml = isLessonCompleted
      ? `<button id="complete-btn" disabled class="btn-primary" style="background:var(--success,#22c55e);border:none;font-size:0.9rem;padding:10px 20px;opacity:0.8;cursor:default;display:flex;align-items:center;gap:8px;">
          <i data-lucide="check-circle-2" style="width:18px;"></i> Completada
        </button>`
      : `<button id="complete-btn" onclick="window.markLessonCompleted()" class="btn-primary" style="background:var(--accent-color);border:none;font-size:0.9rem;padding:10px 20px;box-shadow:0 0 20px var(--accent-glow,rgba(234,179,8,0.4));display:flex;align-items:center;gap:8px;">
          <i data-lucide="check-circle" style="width:18px;"></i> Marcar Finalizada (+${lesson.xp_reward || 100} XP)
        </button>`;

    const contentHtml = lesson.contenido_markdown
      ? `<div class="glass-panel" style="padding:40px;border-radius:16px;">
          <div style="font-size:1.05rem;line-height:1.85;color:var(--text-primary);">
            <p style="margin:12px 0;">${parseMarkdown(lesson.contenido_markdown)}</p>
          </div>
        </div>`
      : '';

    const youtubeUrl = buildYoutubeEmbedUrl(lesson.video_url);
    const vimeoUrl = safeUrl(lesson.video_url);
    const videoHtml = (lesson.tipo === 'video' || lesson.tipo === 'mixed') ? `
      <div class="glass-panel" style="padding:8px;border-radius:16px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,0.5);margin-bottom:30px;">
        <div style="position:relative;padding-bottom:56.25%;background:#000;border-radius:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;">
          ${vimeoUrl && vimeoUrl.includes('vimeo')
            ? `<iframe src="${vimeoUrl}" style="position:absolute;inset:0;width:100%;height:100%;border:none;" allow="autoplay; fullscreen" allowfullscreen></iframe>`
            : youtubeUrl
              ? `<iframe src="${youtubeUrl}" style="position:absolute;inset:0;width:100%;height:100%;border:none;" allow="autoplay; fullscreen" allowfullscreen></iframe>`
              : `<div style="position:absolute;inset:0;background:linear-gradient(135deg,rgba(30,27,75,0.7),rgba(49,46,129,0.7));opacity:0.8;"></div>
                 <div style="position:absolute;z-index:2;width:80px;height:80px;border-radius:50%;background:var(--accent-color);display:flex;align-items:center;justify-content:center;box-shadow:0 0 30px var(--accent-glow);">
                   <i data-lucide="play" style="fill:white;width:32px;height:32px;margin-left:5px;"></i>
                 </div>`}
        </div>
      </div>` : '';

    const progressBar = lesson.levels ? `
      <div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;display:flex;align-items:center;gap:8px;">
        <span>Leccion ${currentIndex + 1} de ${lessonList.length || 1}</span>
        <div style="flex:1;height:3px;background:rgba(255,255,255,0.1);border-radius:2px;overflow:hidden;">
          <div style="height:100%;width:${Math.round(((currentIndex + 1) / (lessonList.length || 1)) * 100)}%;background:var(--accent-color);border-radius:2px;transition:width .5s;"></div>
        </div>
      </div>` : '';

    const pdfUrl = safeUrl(lesson.pdf_url);

    container.innerHTML = `
      <div style="flex:1;display:flex;flex-direction:column;overflow-y:auto;position:relative;">
        <div style="padding:16px 32px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--panel-border);background:rgba(15,17,26,0.95);backdrop-filter:blur(16px);position:sticky;top:0;z-index:20;">
          <div style="display:flex;align-items:center;gap:20px;">
            <a href="#/aula/${lesson.level_id}" class="glass-btn" style="padding:8px;border-radius:8px;color:var(--text-secondary);text-decoration:none;display:flex;transition:color .2s;" title="Volver a la fase">
              <i data-lucide="arrow-left" style="width:20px;"></i>
            </a>
            <div>
              <div style="color:var(--accent-color);font-size:0.7rem;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:2px;font-weight:600;">${escapeHtml(lesson.levels?.titulo || 'Fase')}</div>
              <h2 style="font-size:1.1rem;font-weight:700;margin:0;">${lesson.orden}. ${escapeHtml(lesson.titulo)}</h2>
              ${progressBar}
            </div>
          </div>

          <div style="display:flex;gap:8px;align-items:center;">
            <div style="display:flex;background:rgba(255,255,255,0.05);padding:4px;border-radius:10px;border:1px solid var(--panel-border);margin-right:8px;">
              ${prevBtnHtml}
              <div style="width:1px;background:var(--panel-border);margin:4px 2px;"></div>
              ${nextBtnHtml}
            </div>
            ${completeBtnHtml}
          </div>
        </div>

        <div id="lesson-status" style="display:none;"></div>

        <div style="display:flex;gap:28px;padding:32px;flex-wrap:wrap;">
          <div style="flex:1;min-width:0;">
            ${videoHtml}
            ${contentHtml}
          </div>

          <div style="width:320px;display:flex;flex-direction:column;gap:20px;flex-shrink:0;">
            ${pdfUrl ? `
            <div class="glass-panel" style="padding:20px;">
              <h4 style="margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                <i data-lucide="download" style="color:var(--accent-secondary);width:18px;"></i> Recursos
              </h4>
              <a href="${pdfUrl}" target="_blank" rel="noreferrer" style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(255,255,255,0.05);border-radius:8px;text-decoration:none;color:var(--text-primary);transition:background .2s;" onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='rgba(255,255,255,0.05)'">
                <i data-lucide="file-text" style="width:18px;color:var(--accent-color);"></i>
                <span style="flex:1;font-size:0.9rem;font-weight:500;">Material adjunto</span>
                <i data-lucide="arrow-down-to-line" style="width:15px;color:var(--text-secondary);"></i>
              </a>
            </div>` : ''}

            <div class="glass-panel" style="padding:20px;flex:1;display:flex;flex-direction:column;max-height:500px;">
              <h4 style="margin-bottom:14px;display:flex;align-items:center;gap:8px;">
                <i data-lucide="message-square" style="color:var(--accent-color);width:18px;"></i> Comentarios
              </h4>

              <div id="comments-list" style="flex:1;overflow-y:auto;margin-bottom:16px;display:flex;flex-direction:column;gap:12px;padding-right:4px;">
                <div style="text-align:center;padding:20px;opacity:0.5;font-size:0.8rem;">Cargando comentarios...</div>
              </div>

              <div style="border-top:1px solid var(--panel-border);padding-top:16px;">
                <textarea id="comment-input" placeholder="Escribe un comentario..." style="width:100%;background:rgba(255,255,255,0.05);border:1px solid var(--panel-border);border-radius:8px;padding:10px;color:var(--text-primary);font-family:inherit;font-size:0.85rem;resize:none;margin-bottom:8px;outline:none;" rows="2"></textarea>
                <div id="comment-status" style="display:none; font-size:0.8rem; margin-bottom:8px;"></div>
                <button id="send-comment-btn" onclick="window.submitLessonComment()" class="btn-primary" style="width:100%;justify-content:center;font-size:0.8rem;padding:8px;">
                  Enviar Comentario
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    const commentStatus = document.getElementById('comment-status');
    const setCommentStatus = (message, tone = 'neutral') => {
      if (!commentStatus) return;

      if (!message) {
        commentStatus.style.display = 'none';
        commentStatus.textContent = '';
        return;
      }

      commentStatus.style.display = 'block';
      commentStatus.style.color = tone === 'error' ? '#ef4444' : '#22c55e';
      commentStatus.textContent = message;
    };

    const renderComments = (comments) => {
      const area = document.getElementById('comments-list');
      if (!area) return;

      if (!comments || comments.length === 0) {
        area.innerHTML = `
          <div style="color:var(--text-secondary);font-size:0.85rem;text-align:center;padding:20px 0;">
            <i data-lucide="message-circle" style="width:24px;opacity:0.3;margin-bottom:8px;display:block;margin:0 auto 8px;"></i>
            Se el primero en comentar
          </div>`;
      } else {
        area.innerHTML = comments.map((comment) => `
          <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.05);">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="font-weight:600;font-size:0.8rem;color:var(--accent-color);">${escapeHtml(comment.profiles?.display_name || 'Estudiante')}</span>
              <span style="font-size:0.7rem;color:var(--text-muted);">${new Date(comment.created_at).toLocaleDateString()}</span>
            </div>
            <div style="font-size:0.85rem;line-height:1.4;color:var(--text-primary);">${formatText(comment.content)}</div>
          </div>
        `).join('');
      }

      if (window.lucide) window.lucide.createIcons();
      area.scrollTop = area.scrollHeight;
    };

    const { data: commentRows } = await supabase
      .from('comments')
      .select('*, profiles(display_name, avatar_url)')
      .eq('lesson_id', lessonId)
      .order('created_at', { ascending: true });

    const comments = [...(commentRows || [])];
    renderComments(comments);

    window.submitLessonComment = async () => {
      const input = document.getElementById('comment-input');
      const btn = document.getElementById('send-comment-btn');
      const content = input?.value.trim();

      if (!content) return;

      setCommentStatus('', 'neutral');
      btn.disabled = true;
      btn.textContent = 'Enviando...';

      try {
        const user = await AuthService.getCurrentUser();
        if (!user) throw new Error('Debes iniciar sesion');

        const { data: newComment, error: commentError } = await supabase
          .from('comments')
          .insert([{
            lesson_id: lessonId,
            user_id: user.id,
            content
          }])
          .select('*, profiles(display_name, avatar_url)')
          .single();

        if (commentError) throw commentError;

        comments.push(newComment);
        renderComments(comments);
        input.value = '';
        setCommentStatus('Comentario enviado correctamente.', 'success');
      } catch (commentSubmitError) {
        setCommentStatus(commentSubmitError.message || 'No fue posible enviar el comentario.', 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Enviar Comentario';
      }
    };
  }

  container.innerHTML = `<div style="padding:60px;text-align:center;"><i data-lucide="loader-2" style="width:48px;animation:spin 1s linear infinite;opacity:0.5;"></i></div>`;
  if (window.lucide) window.lucide.createIcons();

  loadAndRender();

  const unsubscribe = store.subscribe(() => {
    const btn = document.getElementById('complete-btn');
    if (!btn) return;

    const nowCompleted = !!store.state.progress?.find((progressItem) => progressItem.lesson_id === lessonId);
    if (nowCompleted) {
      btn.disabled = true;
      btn.style.background = 'var(--success,#22c55e)';
      btn.style.boxShadow = 'none';
      btn.style.opacity = '0.8';
      btn.style.cursor = 'default';
      btn.innerHTML = '<i data-lucide="check-circle-2" style="width:18px;"></i> Completada';
      if (window.lucide) window.lucide.createIcons();
    }
  });

  container._lessonUnsubscribe = unsubscribe;
}
