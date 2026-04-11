import { AuthService } from '../auth.js';

export const Login = {
  _mode: 'login',

  render() {
    const isAuthConfigured = AuthService.isConfigured();
    const pendingMessage = AuthService.getPendingMessage();
    const submitAttrs = isAuthConfigured
      ? 'style="width:100%;justify-content:center;margin-top:4px;"'
      : 'style="width:100%;justify-content:center;margin-top:4px;opacity:.6;cursor:not-allowed;" disabled aria-disabled="true"';

    return `
      <div style="display: flex; height: 100vh; align-items: center; justify-content: center; width: 100vw;">
        <div class="glass-panel" style="padding: 40px; width: 100%; max-width: 420px; animation: fadeIn 0.4s ease-out;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display:flex;flex-direction:column;align-items:center;gap:16px;margin-bottom:24px;">
              <svg width="56" height="56" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="36" height="36" rx="10" fill="#0f172a"></rect>
                <path d="M10 12h3v12h-3V12zm6 0h3v8h-3v-8zm0 10h3v2h-3v-2zm6-10h3v6h-3v-6zm0 8h3v4h-3v-4z" fill="white"></path>
                <circle cx="18" cy="8" r="2" fill="#FFD700"></circle>
              </svg>
              <div>
                <span style="display:block;font-family:'Poppins',sans-serif;font-size:1.8rem;font-weight:800;letter-spacing:-1px;line-height:1;">
                  Campus Metodolog<span style="color:#FFD700;font-weight:900;">IA</span>
                </span>
                <span style="display:block;font-size:0.75rem;color:var(--text-secondary);font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-top:8px;">Aceleremos su Estrategia</span>
              </div>
            </div>

            <div style="display:flex;gap:8px;background:rgba(255,255,255,0.04);padding:4px;border-radius:12px;margin-bottom:28px;">
              <button id="tabLogin" onclick="window._loginSetMode('login')" style="flex:1;padding:10px;border-radius:8px;border:none;cursor:pointer;font-weight:600;font-size:0.9rem;transition:all .2s;background:var(--accent-color);color:#000;">Iniciar Sesion</button>
              <button id="tabRegister" onclick="window._loginSetMode('register')" style="flex:1;padding:10px;border-radius:8px;border:none;cursor:pointer;font-weight:600;font-size:0.9rem;transition:all .2s;background:transparent;color:var(--text-secondary);">Crear Cuenta</button>
            </div>
          </div>

          <form id="loginForm" style="display:flex;flex-direction:column;gap:18px;">
            <div id="errorMsg" style="color:#ef4444;font-size:0.9rem;text-align:center;padding:10px;background:rgba(239,68,68,0.1);border-radius:8px;display:none;"></div>
            <div id="successMsg" style="color:#22c55e;font-size:0.9rem;text-align:center;padding:10px;background:rgba(34,197,94,0.1);border-radius:8px;display:none;"></div>
            <div id="pendingMsg" style="display:${isAuthConfigured ? 'none' : 'block'}; color:var(--navy); font-size:0.9rem; text-align:center; padding:12px; background:rgba(19,125,197,0.08); border:1px solid rgba(19,125,197,0.16); border-radius:12px;">
              ${pendingMessage}
            </div>

            <div class="form-group" id="nameGroup" style="display:none;">
              <label for="displayName">Tu nombre</label>
              <input type="text" id="displayName" class="form-control" placeholder="Maria Gonzalez">
            </div>

            <div class="form-group">
              <label for="email">Email</label>
              <input type="email" id="email" class="form-control" required placeholder="tu@email.com">
            </div>

            <div class="form-group">
              <label for="password">Contrasena</label>
              <input type="password" id="password" class="form-control" required placeholder="********" minlength="6">
            </div>

            <button type="submit" id="btnSubmit" class="btn-primary" ${submitAttrs}>
              ${isAuthConfigured ? 'Ingresar' : 'Acceso pendiente'}
            </button>
          </form>

          <p id="modeHint" style="text-align:center;margin-top:20px;font-size:0.85rem;color:var(--text-secondary);">
            ${isAuthConfigured
              ? '¿Sin cuenta? <a href="#" onclick="window._loginSetMode(\'register\');return false;" style="color:var(--accent-color);font-weight:600;">Registrate gratis</a>'
              : 'El acceso quedara habilitado al finalizar la configuracion remota.'}
          </p>
        </div>
      </div>
    `;
  },

  init() {
    const form = document.getElementById('loginForm');
    const errorMsg = document.getElementById('errorMsg');
    const successMsg = document.getElementById('successMsg');
    const nameGroup = document.getElementById('nameGroup');
    const btnSubmit = document.getElementById('btnSubmit');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const modeHint = document.getElementById('modeHint');
    const pendingMsg = document.getElementById('pendingMsg');
    const isAuthConfigured = AuthService.isConfigured();

    const showError = (msg) => {
      errorMsg.textContent = msg;
      errorMsg.style.display = 'block';
      successMsg.style.display = 'none';
    };

    const showSuccess = (msg) => {
      successMsg.textContent = msg;
      successMsg.style.display = 'block';
      errorMsg.style.display = 'none';
    };

    const clearMessages = () => {
      errorMsg.style.display = 'none';
      successMsg.style.display = 'none';
    };

    window._loginSetMode = (mode) => {
      if (!isAuthConfigured) return;

      this._mode = mode;
      clearMessages();

      if (mode === 'register') {
        nameGroup.style.display = 'block';
        btnSubmit.textContent = 'Crear Cuenta';
        tabLogin.style.background = 'transparent';
        tabLogin.style.color = 'var(--text-secondary)';
        tabRegister.style.background = 'var(--accent-color)';
        tabRegister.style.color = '#000';
        modeHint.innerHTML = '¿Ya tienes cuenta? <a href="#" onclick="window._loginSetMode(\'login\');return false;" style="color:var(--accent-color);font-weight:600;">Inicia sesion</a>';
      } else {
        nameGroup.style.display = 'none';
        btnSubmit.textContent = 'Ingresar';
        tabLogin.style.background = 'var(--accent-color)';
        tabLogin.style.color = '#000';
        tabRegister.style.background = 'transparent';
        tabRegister.style.color = 'var(--text-secondary)';
        modeHint.innerHTML = '¿Sin cuenta? <a href="#" onclick="window._loginSetMode(\'register\');return false;" style="color:var(--accent-color);font-weight:600;">Registrate gratis</a>';
      }
    };

    if (!isAuthConfigured) {
      tabRegister.disabled = true;
      tabRegister.style.opacity = '0.5';
      tabRegister.style.cursor = 'not-allowed';
      tabLogin.style.background = 'rgba(19,125,197,0.12)';
      tabLogin.style.color = 'var(--navy)';
      if (pendingMsg) pendingMsg.style.display = 'block';
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!isAuthConfigured) {
        showError(AuthService.getPendingMessage());
        return;
      }

      clearMessages();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      btnSubmit.disabled = true;
      btnSubmit.textContent = this._mode === 'login' ? 'Entrando...' : 'Creando cuenta...';

      try {
        if (this._mode === 'login') {
          await AuthService.login(email, password);
          window.location.hash = '#/dashboard';
        } else {
          const displayName = document.getElementById('displayName').value.trim() || email.split('@')[0];
          await AuthService.register(email, password, displayName);
          showSuccess(`Cuenta creada. Bienvenido, ${displayName}. Redirigiendo...`);
          setTimeout(() => { window.location.hash = '#/dashboard'; }, 1200);
        }
      } catch (err) {
        showError(err.message || 'Ocurrio un error. Intentalo de nuevo.');
        btnSubmit.disabled = false;
        btnSubmit.textContent = this._mode === 'login' ? 'Ingresar' : 'Crear Cuenta';
      }
    });
  }
};
