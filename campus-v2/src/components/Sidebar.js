import { Logo } from './Logo.js';

export function Sidebar() {
  return `
    <aside class="sidebar">
      ${Logo()}
      
      <ul class="nav-menu">
        <li class="nav-item">
          <a href="#/dashboard">
            <i data-lucide="layout-grid"></i>
            Panel
          </a>
        </li>
        <li class="nav-item">
          <a href="#/ruta">
            <i data-lucide="map"></i>
            Ruta 10 Niveles
          </a>
        </li>
        <li class="nav-item">
          <a href="#/calendario">
            <i data-lucide="calendar"></i>
            Calendario
          </a>
        </li>
        <li class="nav-item">
          <a href="#/ranking">
            <i data-lucide="award"></i>
            Ranking 50
          </a>
        </li>
        <li class="nav-item">
          <a href="#/comunidad">
            <i data-lucide="users"></i>
            Comunidad
          </a>
        </li>
      </ul>

      <div style="margin-top: auto; display: flex; flex-direction: column; gap: 8px;">
        <li class="nav-item" style="list-style: none;">
          <a href="#/perfil">
            <i data-lucide="user-circle"></i>
            Mi Perfil
          </a>
        </li>
        <li class="nav-item" style="list-style: none;">
          <a href="#/configuracion">
            <i data-lucide="settings"></i>
            Configuración
          </a>
        </li>
      </div>
    </aside>
  `;
}
