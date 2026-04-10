import { supabase } from '../supabase.js';
import { escapeHtml, formatText, safeUrl, toDisplayNumber } from '../utils/sanitize.js';

export function Comunidad(container) {
  container.innerHTML = `
    <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 40px; position: relative; z-index: 1;"><div class="comunidad-layout" style="display: flex; gap: 32px; margin-top: 30px; animation: slideUp 0.6s ease-out;">
        <div style="flex: 1;">
          <div class="section-title" style="margin-bottom: 24px;">
            <h2 style="font-size: 1.8rem;">Muro de la <span class="text-gradient">Comunidad</span></h2>
            <p style="color: var(--text-secondary); margin-top: 8px;">Actividad reciente y comentarios de tus companeros.</p>
          </div>

          <div class="glass-panel" style="padding: 20px; margin-bottom: 30px; border-radius: 16px;">
            <div style="display:flex; gap:16px;">
                 <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--panel-bg); border: 1px solid var(--panel-border); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i data-lucide="user" style="width: 20px; color: var(--text-secondary);"></i>
                 </div>
                 <div style="flex:1;">
                    <textarea id="wall-input" placeholder="Que tienes en mente hoy?" style="width:100%; background:transparent; border:none; color:var(--text-primary); font-family:inherit; font-size:1rem; resize:none; outline:none; padding:8px 0;" rows="2"></textarea>
                    <div id="wall-status" style="display:none; margin-top: 8px; font-size: 0.85rem;"></div>
                    <div style="display:flex; justify-content:flex-end; border-top:1px solid rgba(255,255,255,0.05); padding-top:12px; margin-top:8px;">
                        <button id="btn-post-wall" onclick="window.postToWall()" class="btn-primary" style="padding:8px 24px; font-size:0.85rem; display:flex; align-items:center; gap:8px;">
                            Publicar <i data-lucide="send" style="width:14px;"></i>
                        </button>
                    </div>
                 </div>
            </div>
          </div>

          <div id="activity-feed" class="activity-feed" style="display: flex; flex-direction: column; gap: 20px;">
            <div style="padding: 40px; text-align: center; color: var(--text-secondary);">
              <div class="spinner" style="margin: 0 auto 20px;"></div>
              Sintonizando canal de comunidad...
            </div>
          </div>
        </div>

        <div style="width: 380px; display: flex; flex-direction: column; gap: 24px;">
          <div class="glass-panel" style="padding: 24px; border-radius: 16px; background: linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.1) 100%);">
            <h3 style="margin-bottom: 12px; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;">
              <i data-lucide="radio" style="width: 20px; color: var(--accent-color);"></i> Directos y Mentorias
            </h3>
            <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5;">La agenda en vivo se consolida en el calendario oficial del campus.</p>
            <a href="#/calendario" class="btn-primary" style="margin-top: 16px; width: 100%; justify-content: center; background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1);">Ver Calendario <i data-lucide="calendar" style="width: 16px; margin-left: 6px;"></i></a>
          </div>

          <div class="glass-panel" style="padding: 24px; border-radius: 16px;">
            <h4 style="margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <i data-lucide="award" style="color: #FFD700; width: 18px;"></i> Estudiantes Top
            </h4>
            <div id="mini-ranking-comunidad"></div>
            <a href="#/ranking" style="color: var(--accent-color); font-size: 0.85rem; text-decoration: none; margin-top: 12px; display: inline-block;">Ver ranking completo -></a>
          </div>
        </div>
      </div>
    </div>
  `;

  loadActivityFeed();
  loadMiniRanking();

  window.postToWall = async () => {
    const input = document.getElementById('wall-input');
    const btn = document.getElementById('btn-post-wall');
    const content = input?.value.trim();

    if (!content) return;

    setWallStatus('', 'neutral');
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" style="width:14px; animation:spin 1s linear infinite;"></i> Publicando';
    if (window.lucide) window.lucide.createIcons();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Debes iniciar sesion para publicar');

      const { error } = await supabase.from('comments').insert([{
        user_id: user.id,
        content
      }]);

      if (error) throw error;

      input.value = '';
      setWallStatus('Publicacion creada correctamente.', 'success');
      await loadActivityFeed();
    } catch (error) {
      setWallStatus(error.message || 'No fue posible publicar en este momento.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Publicar <i data-lucide="send" style="width:14px;"></i>';
      if (window.lucide) window.lucide.createIcons();
    }
  };
}

function setWallStatus(message, tone) {
  const status = document.getElementById('wall-status');
  if (!status) return;

  if (!message) {
    status.style.display = 'none';
    status.textContent = '';
    return;
  }

  status.style.display = 'block';
  status.style.color = tone === 'error' ? '#ef4444' : '#22c55e';
  status.textContent = message;
}

async function loadActivityFeed() {
  const feed = document.getElementById('activity-feed');
  if (!feed) return;

  const { data: items, error } = await supabase
    .from('comments')
    .select('*, profiles(display_name, avatar_url), lessons(titulo)')
    .order('created_at', { ascending: false })
    .limit(15);

  if (error || !items || items.length === 0) {
    feed.innerHTML = `
      <div class="glass-panel" style="padding: 40px; text-align: center;">
        <i data-lucide="message-square-dashed" style="width: 48px; height: 48px; color: var(--text-secondary); margin-bottom: 16px; opacity: 0.3;"></i>
        <p style="color: var(--text-secondary);">Aun no hay mensajes en el muro. Se el primero en compartir algo.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  feed.innerHTML = items.map((comment) => {
    const isLessonComment = !!comment.lesson_id;
    const activityText = isLessonComment
      ? `Comento en <b>${escapeHtml(comment.lessons?.titulo || 'una leccion')}</b>`
      : 'Hizo una <b>publicacion general</b>';
    const activityIcon = isLessonComment ? 'message-circle' : 'megaphone';
    const avatarUrl = safeUrl(comment.profiles?.avatar_url);

    return `
      <div class="glass-panel" style="padding: 24px; display: flex; gap: 16px; animation: fadeInRight 0.4s ease-out;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: var(--panel-bg); border: 1px solid var(--panel-border); overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          ${avatarUrl ? `<img src="${avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">` : `<i data-lucide="user" style="color: var(--text-secondary);"></i>`}
        </div>
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-weight: 600; font-size: 1rem;">${escapeHtml(comment.profiles?.display_name || 'Anonimo')}</span>
            <span style="font-size: 0.8rem; color: var(--text-secondary);">${new Date(comment.created_at).toLocaleDateString()}</span>
          </div>
          <p style="color: var(--text-primary); line-height: 1.5; margin-bottom: 12px; font-size: 0.95rem;">${formatText(comment.content)}</p>
          <div style="display: flex; align-items: center; gap: 4px; font-size: 0.8rem;">
            <i data-lucide="${activityIcon}" style="width: 14px; color: var(--accent-color);"></i>
            <span style="color: var(--text-secondary);">${activityText}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  if (window.lucide) window.lucide.createIcons();
}

async function loadMiniRanking() {
  const list = document.getElementById('mini-ranking-comunidad');
  if (!list) return;

  const { data: top } = await supabase
    .from('profiles')
    .select('display_name, total_xp')
    .order('total_xp', { ascending: false })
    .limit(3);

  if (top) {
    list.innerHTML = top.map((profile, index) => `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-weight: 700; color: #FFD700;">#${index + 1}</span>
          <span style="font-size: 0.9rem;">${escapeHtml(profile.display_name || '...')}</span>
        </div>
        <span style="font-weight: 600; font-size: 0.85rem; color: var(--accent-color);">${Math.floor(toDisplayNumber(profile.total_xp) / 1000)}k XP</span>
      </div>
    `).join('');
  }
}
