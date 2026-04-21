import { Logo } from './Logo.js';

import { store } from '../store.js';

export function Sidebar() {
  const showUpgradeCta = !store.hasPremiumAccess();

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
            Ruta del Programa
          </a>
        </li>
        <li class="nav-item">
          <a href="#/calendario">
            <i data-lucide="calendar"></i>
            Agenda en Vivo
          </a>
        </li>
        <li class="nav-item">
          <a href="#/ranking">
            <i data-lucide="award"></i>
            Ranking XP
          </a>
        </li>
        <li class="nav-item">
          <a href="#/comunidad">
            <i data-lucide="users"></i>
            Comunidad
          </a>
        </li>
        <li class="nav-item">
          <a href="#/planes">
            <i data-lucide="gem"></i>
            Planes
          </a>
        </li>
      </ul>

      <div style="margin-top: auto; display: flex; flex-direction: column; gap: 8px;">
        ${showUpgradeCta ? `
        <a href="#/planes" class="btn-primary" style="justify-content:center;text-decoration:none;margin-bottom:8px;">
          Desbloquear premium
        </a>` : ''}
        <li class="nav-item" style="list-style: none;">
          <a href="#/perfil">
            <i data-lucide="user-circle"></i>
            Mi Perfil
          </a>
        </li>
        <li class="nav-item" style="list-style: none;">
          <a href="#/configuracion">
            <i data-lucide="settings"></i>
            Configuracion
          </a>
        </li>
      </div>
    </aside>
  `;
}
