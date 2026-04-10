import { router } from './router.js';
import { store } from './store.js';
import { Login } from './pages/Login.js';
import { Landing } from './pages/Landing.js';
import { Dashboard } from './pages/Dashboard.js';
import { Aula } from './pages/Aula.js';
import { Leccion } from './pages/Leccion.js';
import { Ranking } from './pages/Ranking.js';
import { Comunidad } from './pages/Comunidad.js';
import { Calendario } from './pages/Calendario.js';
import { Configuracion } from './pages/Configuracion.js';
import { Planes } from './pages/Planes.js';
import { Profile } from './pages/Profile.js';
import { Syllabus } from './pages/Syllabus.js';
import { Sidebar } from './components/Sidebar.js';
import { Topbar } from './components/Topbar.js';

// Initialize App
async function initApp() {
  const appContainer = document.getElementById('app');
  
  // 1. Initial State Load
  await store.init();
  
  // 2. Setup Base Layout (Sidebar + Router View)
  // For landing/login it will be hidden by CSS (.no-sidebar hides sidebar and topbar)
  appContainer.innerHTML = `
    ${Sidebar()}
    <div id="main-content" style="flex: 1; display: flex; flex-direction: column; height: 100vh; overflow: hidden; background: var(--bg-primary);">
      ${Topbar()}
      <div id="router-view" style="flex: 1; display: flex; flex-direction: column; overflow: hidden; background: transparent;">
        <!-- Page Content will be injected here -->
      </div>
    </div>
  `;

  // 3. Register Routes
  router.addRoute('#/', Landing);
  router.addRoute('#/login', Login);
  router.addRoute('#/planes', Planes);
  router.addRoute('#/dashboard', Dashboard);
  router.addRoute('#/aula', Aula);
  router.addRoute('#/leccion', Leccion);
  router.addRoute('#/ranking', Ranking);
  router.addRoute('#/comunidad', Comunidad);
  router.addRoute('#/calendario', Calendario);
  router.addRoute('#/configuracion', Configuracion);
  router.addRoute('#/perfil', Profile);
  router.addRoute('#/ruta', Syllabus);

  // 4. Start Router
  router.init();

  // 5. Watch for auth changes to re-init store F11.5
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
      await store.init();
    }
  });

  // 6. Watch for state changes to update UI transparently (Globals)
  store.subscribe(() => {
    // router.js handles page re-rendering. We handle the static global Topbar here.
    const topbarElement = document.getElementById('global-topbar');
    if (topbarElement) {
      topbarElement.outerHTML = Topbar(); // Re-render ONLY topbar with fresh store data
      // Re-initialize icons for the new topbar elements
      if (window.lucide) {
        setTimeout(() => window.lucide.createIcons(), 0);
      }
    }
  });
}

// Global Exports
import { supabase } from './supabase.js';
window.supabase = supabase; // Expose for subagent/debug

// Global Exports for inline handlers
window.navigate = (path) => router.navigate(path);

document.addEventListener('DOMContentLoaded', initApp);
