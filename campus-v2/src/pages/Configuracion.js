import { supabase } from '../supabase.js';
import { AuthService } from '../auth.js';
import { store } from '../store.js';
import { escapeHtml, safeUrl } from '../utils/sanitize.js';

export function Configuracion(container) {
  container.innerHTML = `
    <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; padding: 40px; position: relative; z-index: 1;"><div style="margin-top: 30px; animation: fadeIn 0.8s ease-out;">
        <div class="section-title" style="margin-bottom: 30px;">
          <h2 style="font-size: 1.8rem;">Ajustes de <span class="text-gradient">Cuenta</span></h2>
          <p style="color: var(--text-secondary); margin-top: 8px;">Gestiona tu perfil, membresia y preferencias del campus.</p>
        </div>

        <div style="display: grid; grid-template-columns: 280px 1fr; gap: 40px;">
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button class="glass-panel" style="padding: 14px 20px; text-align: left; background: rgba(99,102,241,0.1); border-color: rgba(99,102,241,0.2); font-weight: 600; cursor: pointer; color: var(--accent-color); display: flex; align-items: center; gap: 10px;">
              <i data-lucide="user" style="width: 18px;"></i> Perfil Publico
            </button>
            <button class="glass-panel" style="padding: 14px 20px; text-align: left; opacity: 0.6; cursor: not-allowed; display: flex; align-items: center; gap: 10px;">
              <i data-lucide="shield-check" style="width: 18px;"></i> Seguridad
            </button>
            <button class="glass-panel" style="padding: 14px 20px; text-align: left; opacity: 0.6; cursor: not-allowed; display: flex; align-items: center; gap: 10px;">
              <i data-lucide="credit-card" style="width: 18px;"></i> Facturacion
            </button>
            <hr style="border: none; border-top: 1px solid var(--panel-border); margin: 10px 0;">
            <button onclick="window.handleLogout()" style="padding: 14px 20px; text-align: left; color: #ef4444; background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 10px; font-weight: 500;">
              <i data-lucide="log-out" style="width: 18px;"></i> Cerrar Sesion
            </button>
          </div>

          <div class="glass-panel" style="padding: 40px; border-radius: 16px;">
            <div id="profile-form-status"></div>
            <form id="profile-form" style="display: flex; flex-direction: column; gap: 24px;">
              <div style="display: flex; align-items: center; gap: 30px; margin-bottom: 10px;">
                <div id="settings-avatar" style="width: 100px; height: 100px; border-radius: 50%; background: var(--panel-bg); border: 2px dashed var(--panel-border); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden;">
                   <i data-lucide="camera" style="width: 24px; color: var(--text-secondary);"></i>
                </div>
                <div>
                  <h4 style="margin-bottom: 8px;">Imagen de Perfil</h4>
                  <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 12px;">La carga directa de avatar queda pendiente. Por ahora se muestra la imagen guardada en tu perfil.</p>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="input-group">
                  <label style="display: block; font-size: 0.9rem; margin-bottom: 8px; color: var(--text-secondary);">Nombre Publico</label>
                  <input type="text" id="display_name" class="glass-panel" style="width: 100%; border-radius: 8px; padding: 12px; background: rgba(0,0,0,0.2);">
                </div>
                <div class="input-group">
                  <label style="display: block; font-size: 0.9rem; margin-bottom: 8px; color: var(--text-secondary);">Email (No editable)</label>
                  <input type="email" id="profile_email" disabled class="glass-panel" style="width: 100%; border-radius: 8px; padding: 12px; opacity: 0.5; background: rgba(0,0,0,0.2);">
                </div>
              </div>

              <div class="input-group">
                <label style="display: block; font-size: 0.9rem; margin-bottom: 8px; color: var(--text-secondary);">Biografia / Social</label>
                <textarea id="bio" class="glass-panel" rows="3" style="width: 100%; border-radius: 8px; padding: 12px; resize: none; background: rgba(0,0,0,0.2);" placeholder="Cuentanos un poco sobre ti..."></textarea>
              </div>

              <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
                <button type="submit" class="btn-primary" style="padding: 12px 30px;">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  loadProfileSettings();
  setupProfileForm();
}

async function loadProfileSettings() {
  const user = await AuthService.getCurrentUser();
  if (!user) return;

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (profile) {
    document.getElementById('display_name').value = profile.display_name || '';
    document.getElementById('profile_email').value = user.email || '';
    document.getElementById('bio').value = profile.bio || '';

    const avatarUrl = safeUrl(profile.avatar_url);
    if (avatarUrl) {
      document.getElementById('settings-avatar').innerHTML = `<img src="${avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">`;
    }
  }
}

function setupProfileForm() {
  const form = document.getElementById('profile-form');
  if (!form) return;

  form.onsubmit = async (event) => {
    event.preventDefault();
    const status = document.getElementById('profile-form-status');
    const displayName = document.getElementById('display_name').value.trim();
    const bio = document.getElementById('bio').value.trim();
    const user = await AuthService.getCurrentUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName, bio, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (error) {
      status.innerHTML = `<div style="padding:15px; border-radius:8px; background: rgba(239, 68, 68, 0.1); color: #ef4444; margin-bottom: 20px; font-size: 0.9rem;">${escapeHtml(error.message)}</div>`;
    } else {
      await store.init();
      status.innerHTML = `<div style="padding:15px; border-radius:8px; background: rgba(34, 197, 94, 0.1); color: #22c55e; margin-bottom: 20px; font-size: 0.9rem;">Perfil actualizado correctamente</div>`;
      setTimeout(() => {
        status.innerHTML = '';
      }, 3000);
    }
  };
}

window.handleLogout = async () => {
  await AuthService.logout();
  window.location.hash = '#/login';
};
