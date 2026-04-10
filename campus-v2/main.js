import './style.css';
import { store } from './src/store.js';
import { router } from './src/router.js';
import { supabase } from './src/supabase.js';
import { AuthService } from './src/auth.js';
import { Sidebar } from './src/components/Sidebar.js';
import { Topbar } from './src/components/Topbar.js';

// Pages
import { Dashboard } from './src/pages/Dashboard.js';
import { Aula } from './src/pages/Aula.js';
import { Leccion } from './src/pages/Leccion.js';
import { Login } from './src/pages/Login.js';
import { Ranking } from './src/pages/Ranking.js';
import { Calendario } from './src/pages/Calendario.js';
import { Comunidad } from './src/pages/Comunidad.js';
import { Configuracion } from './src/pages/Configuracion.js';
import { Profile } from './src/pages/Profile.js';
import { Syllabus } from './src/pages/Syllabus.js';
import { Landing } from './src/pages/Landing.js';
import { Planes } from './src/pages/Planes.js';

// ── Bootstrap Application ──────────────────────────────────────────────────
async function bootstrap() {
  // 1. Load global state (await so Topbar has data on first render)
  await store.init();

  // 2. Build the static app shell (sidebar + topbar always present on authenticated routes)
  // Ensure we mount Topbar outside of router-view so it doesn't unmount on route change
  document.querySelector('#app').innerHTML = `
    <div id="sidebar-container">${Sidebar()}</div>
    <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative;">
      <div id="topbar-container"></div>
      <div id="router-view" style="flex:1;display:flex;flex-direction:column;overflow:hidden;position:relative;"></div>
    </div>
  `;

  // Define a renderTopbar function to update the Topbar when state changes
  const renderTopbar = () => {
    const container = document.getElementById('topbar-container');
    if (container) container.innerHTML = Topbar();
    // Re-create lucide icons for the topbar elements
    setTimeout(() => { if(window.lucide) window.lucide.createIcons(); }, 10);
  };

  // Initial render of topbar
  renderTopbar();

  // Re-render topbar globally whenever state (XP/Level) changes
  store.subscribe(() => {
    renderTopbar();
  });

  // 3. Inject dynamic style for no-sidebar routes (login, landing)
  const style = document.createElement('style');
  style.textContent = `#app.no-sidebar #sidebar-container { display: none; }
#app.no-sidebar #topbar-container { display: none; }`;
  document.head.appendChild(style);

  // 4. Register all routes
  router.addRoute('#/', Landing);
  router.addRoute('#/login', Login);
  router.addRoute('#/planes', Planes);
  router.addRoute('#/dashboard', Dashboard);
  router.addRoute('#/aula', Aula);
  router.addRoute('#/leccion', Leccion);
  router.addRoute('#/ranking', Ranking);
  router.addRoute('#/calendario', Calendario);
  router.addRoute('#/comunidad', Comunidad);
  router.addRoute('#/configuracion', Configuracion);
  router.addRoute('#/perfil', Profile);
  router.addRoute('#/ruta', Syllabus);

  // 5. Global Functions
  window.navigate = (path) => router.navigate(path);
  window.supabase = supabase;
  window.logoutUser = async () => {
    await AuthService.logout();
    window.location.hash = '#/login';
  };

  // 6. Watch for Supabase auth state changes
  supabase.auth.onAuthStateChange(async (event) => {
    if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
      await store.init();
    }
  });

  // 7. Start the router (triggers first render)
  router.init();
}

bootstrap();
