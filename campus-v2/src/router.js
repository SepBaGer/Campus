import { AuthService } from './auth.js';
import { store } from './store.js';

export const router = {
  routes: {},
  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    // Subscribe to store changes to re-render when data arrives F11.5
    store.subscribe(() => {
        const hash = window.location.hash || '#/dashboard';
        // Lesson pages manage their own reactivity via internal store.subscribe
        // Skip full re-render for lesson routes to avoid player reset on completion
        const SELF_REACTIVE_ROUTES = ['#/login', '#/planes', '#/leccion/'];
        if (SELF_REACTIVE_ROUTES.some(r => hash.startsWith(r))) return;
        this.handleRoute();
    });
    // Trigger initial route
    this.handleRoute();
  },
  
  addRoute(path, component) {
    this.routes[path] = component;
  },

  async handleRoute() {
    const hash = window.location.hash || '#/';
    
    let path = hash;
    let param = null;

    if (hash.startsWith('#/aula/')) {
        path = '#/aula';
        param = hash.replace('#/aula/', '');
    } else if (hash.startsWith('#/leccion/')) {
        path = '#/leccion';
        param = hash.replace('#/leccion/', '');
    }

    const PROTECTED_ROUTES = ['#/dashboard', '#/aula', '#/leccion', '#/ranking', '#/calendario', '#/configuracion', '#/comunidad', '#/perfil', '#/ruta'];
    const AUTH_ROUTES = ['#/login'];
    
    const user = await AuthService.getCurrentUser();
    const isProtected = PROTECTED_ROUTES.some(r => path.startsWith(r));
    const isAuth = AUTH_ROUTES.some(r => path.startsWith(r));

    if (isProtected && !user) {
      return this.navigate('#/login');
    }
    if (isAuth && user) {
      return this.navigate('#/dashboard');
    }
    if (path === '#/' && user) {
      return this.navigate('#/dashboard');
    }

    const component = this.routes[path] || (user ? this.routes['#/dashboard'] : this.routes['#/']);
    
    if (component) {
      const container = document.getElementById('router-view');
      const isLogin = path === '#/login';
      
      // If the component is login or landing, hide sidebar by adding a class to app
      const appDiv = document.getElementById('app');
      if (appDiv) {
        if (isLogin || path === '#/') appDiv.classList.add('no-sidebar');
        else appDiv.classList.remove('no-sidebar');
      }

      // If component exports render and init (like Login)
      if (typeof component === 'object' && component.render) {
        container.innerHTML = component.render();
        if (component.init) setTimeout(() => component.init(), 0);
      } else if (typeof component === 'function') {
        component(container, param);
      }
      
      // Dinamic Title for SEO
      const routeTitles = {
          '#/dashboard': 'Estudio - MetodologIA',
          '#/aula': 'Aula Virtual - MetodologIA',
          '#/leccion': 'Lección - MetodologIA',
          '#/perfil': 'Mi Perfil - MetodologIA',
          '#/ruta': 'Ruta de Maestría - MetodologIA',
          '#/ranking': 'Ranking de Maestría - MetodologIA',
          '#/comunidad': 'Comunidad MetodologIA',
          '#/calendario': 'Agenda Académica - MetodologIA',
          '#/configuracion': 'Ajustes de Cuenta - MetodologIA',
          '#/login': 'Acceso - MetodologIA',
          '#/planes': 'Membresías Premium - MetodologIA'
      };
      document.title = routeTitles[path] || 'Campus MetodologIA';

      setTimeout(() => {
        if(window.lucide) window.lucide.createIcons();
      }, 50);
    }
  },
  
  navigate(path) {
    window.location.hash = path;
  }
};
