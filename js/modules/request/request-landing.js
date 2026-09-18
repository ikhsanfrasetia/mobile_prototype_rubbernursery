/**
 * modules/request/request-landing.js — Landing Page Permintaan Bibit (Role Pengurus).
 * Menu: Permintaan Bibit Kebun Sepupu (Hub), Buat Permintaan Mata Entres.
 */

import { session } from '../../core/session.js';
import { storage } from '../../core/storage.js';
import { ROLES } from '../../core/permissions.js';
import { toast } from '../../components/toast.js';
import { navigate } from '../../core/router.js';
import { getCurrentUserContext, resolveUserContext, normalizeRole } from '../../core/user-context.js';
import { requestRepository } from '../../db/repositories.js';
import { 
  filterIncomingRequests as filterIncomingKspRequests, 
  getActionableIncomingCount as getActionableIncomingKspCount 
} from './request-kebun-sepupu-landing.js';
import {
  filterIncomingRequests as filterIncomingSendiriRequests,
  getActionableIncomingCount as getActionableIncomingSendiriCount
} from './request-kebun-sendiri-landing.js';
import {
  getActionableMataEntresCount
} from './request-mata-entres-landing.js';

/* SVG Icons sesuai visual baseline approved — proporsional & rapi #116834 */
const ICONS = {
  spbBibit: `
    <svg viewBox="3 2 26 27" width="38" height="38" fill="#116834">
      <rect x="5" y="4" width="22" height="24" rx="4.5" fill="#116834"/>
      <line x1="9" y1="12" x2="19" y2="12" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="9" y1="16" x2="19" y2="16" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="9" y1="20" x2="16" y2="20" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="23" cy="7" r="4.2" fill="#116834" stroke="#ffffff" stroke-width="1.5"/>
      <line x1="23" y1="4.8" x2="23" y2="9.2" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="20.8" y1="7" x2="25.2" y2="7" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `,
  spbEntres: `
    <svg viewBox="2 2 28 28" width="38" height="38" fill="#116834">
      <path d="M14 26 C14 26 14 13 14 9 C14 5.5 17.5 3 22 2.5 C22.5 7 19.5 10.5 15.8 11 C15.8 13 15.8 17 15.8 26 Z" fill="#116834"/>
      <path d="M14 16.5 C10.5 16.5 6.5 14 6 10 C10 9.5 13.5 12 14 15 Z" fill="#116834"/>
      <circle cx="14" cy="24" r="2.5" fill="#116834"/>
    </svg>
  `,
  approvalKsp: `
    <svg viewBox="3 2 26 27" width="38" height="38" fill="#116834">
      <rect x="5" y="4" width="22" height="24" rx="4.5" fill="#116834"/>
      <line x1="9" y1="13" x2="19" y2="13" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
      <line x1="9" y1="18" x2="19" y2="18" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
      <circle cx="23" cy="7.5" r="4.2" fill="#116834" stroke="#ffffff" stroke-width="1.5"/>
      <path d="M21 7.5 L22.5 9 L25.5 6" stroke="#ffffff" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `,
};

export function getSubMenuItemsForRole(userRole) {
  const role = normalizeRole(userRole);
  if (role === 'ASISTEN_BIBITAN') {
    return [
      {
        id: 'ksp-bibit-sendiri',
        title: 'Permintaan Bibit<br>Kebun Sendiri',
        rawTitle: 'Permintaan Bibit Kebun Sendiri',
        icon: ICONS.spbBibit,
        route: '/request/kebun-sendiri'
      },
      {
        id: 'ksp-bibit',
        title: 'Verifikasi Permintaan<br>Kebun Sepupu',
        rawTitle: 'Verifikasi Permintaan Kebun Sepupu',
        icon: ICONS.approvalKsp,
        route: '/request/kebun-sepupu'
      },
      {
        id: 'me-bibit',
        title: 'Verifikasi Permintaan<br>Mata Entres',
        rawTitle: 'Verifikasi Permintaan Mata Entres',
        icon: ICONS.spbEntres,
        route: '/request/mata-entres'
      }
    ];
  }

  if (role === 'ASISTEN') {
    return [
      {
        id: 'ksp-bibit-sendiri',
        title: 'Permintaan Bibit<br>Kebun Sendiri',
        rawTitle: 'Permintaan Bibit Kebun Sendiri',
        icon: ICONS.spbBibit,
        route: '/request/kebun-sendiri'
      },
      {
        id: 'ksp-bibit',
        title: 'Melanjutkan Permintaan<br>dari Kebun Sepupu',
        rawTitle: 'Melanjutkan Permintaan dari Kebun Sepupu',
        icon: ICONS.spbBibit,
        route: '/request/kebun-sepupu'
      },
      {
        id: 'me-bibit',
        title: 'Daftar Permintaan<br>Mata Entres',
        rawTitle: 'Daftar Permintaan Mata Entres',
        icon: ICONS.spbEntres,
        route: '/request/mata-entres'
      }
    ];
  }

  if (role === 'ASKEP' || role === 'ASISTEN_KEPALA') {
    return [
      {
        id: 'ksp-bibit-sendiri',
        title: 'Permintaan Bibit<br>Kebun Sendiri',
        rawTitle: 'Permintaan Bibit Kebun Sendiri',
        icon: ICONS.spbBibit,
        route: '/request/kebun-sendiri'
      },
      {
        id: 'ksp-bibit',
        title: 'Melanjutkan Permintaan<br>Kebun Sepupu',
        rawTitle: 'Melanjutkan Permintaan Kebun Sepupu',
        icon: ICONS.spbBibit,
        route: '/request/kebun-sepupu'
      },
      {
        id: 'me-bibit',
        title: 'Verifikasi Permintaan<br>Mata Entres',
        rawTitle: 'Verifikasi Permintaan Mata Entres',
        icon: ICONS.spbEntres,
        route: '/request/mata-entres'
      }
    ];
  }

  // MANTRI_TANAMAN / MANTRI
  if (role === 'MANTRI_TANAMAN' || role === 'MANTRI') {
    return [
      {
        id: 'ksp-bibit',
        title: 'Daftar Permintaan<br>Kebun Sepupu',
        rawTitle: 'Daftar Permintaan Kebun Sepupu',
        icon: ICONS.approvalKsp,
        route: '/request/kebun-sepupu'
      },
      {
        id: 'me-bibit',
        title: 'Daftar Permintaan<br>Mata Entres',
        rawTitle: 'Daftar Permintaan Mata Entres',
        icon: ICONS.spbEntres,
        route: '/request/mata-entres'
      }
    ];
  }

  // Default / PENGURUS
  return [
    {
      id: 'ksp-bibit-sendiri',
      title: 'Permintaan Bibit<br>Kebun Sendiri',
      rawTitle: 'Permintaan Bibit Kebun Sendiri',
      icon: ICONS.spbBibit,
      route: '/request/kebun-sendiri'
    },
    {
      id: 'ksp-bibit',
      title: 'Permintaan Bibit<br>Kebun Sepupu',
      rawTitle: 'Permintaan Bibit Kebun Sepupu',
      icon: ICONS.spbBibit,
      route: '/request/kebun-sepupu'
    },
    {
      id: 'me-bibit',
      title: 'Buat Permintaan<br>Mata Entres',
      rawTitle: 'Buat Permintaan Mata Entres',
      icon: ICONS.spbEntres,
      route: '/request/mata-entres'
    }
  ];
}

export async function renderRequestLanding() {
  const app = document.getElementById('app');
  if (!app) return;

  const user = session.get();
  const userCtx = getCurrentUserContext() || resolveUserContext(user);
  const activeSubMenuItems = getSubMenuItemsForRole(userCtx?.role || userCtx?.rawRole);

  let allRequests = [];
  try {
    allRequests = await requestRepository.list();
  } catch (err) {
    allRequests = storage.get('requests_transactions', []);
  }
  if (!allRequests || allRequests.length === 0) {
    allRequests = storage.get('requests_transactions', []);
  }

  const incomingKsp = filterIncomingKspRequests(allRequests, userCtx);
  const hasActionableRequest = getActionableIncomingKspCount(incomingKsp, userCtx) > 0;

  const incomingSendiri = filterIncomingSendiriRequests(allRequests, userCtx);
  const hasActionableSendiri = getActionableIncomingSendiriCount(incomingSendiri, userCtx) > 0;

  const hasActionableMataEntres = getActionableMataEntresCount(allRequests, userCtx) > 0;

  const menuCards = activeSubMenuItems.map((item) => {
    let badgeHtml = '';
    if (item.id === 'ksp-bibit' && hasActionableRequest) {
      badgeHtml = `
        <div class="beranda-menu-badge-dot notif-dot" style="position: absolute; top: 10px; right: 10px; width: 10px; height: 10px; background-color: #D32F2F; border-radius: 50%; box-shadow: 0 0 0 2px #FFFFFF; z-index: 5;"></div>
      `;
    } else if (item.id === 'ksp-bibit-sendiri' && hasActionableSendiri) {
      badgeHtml = `
        <div class="beranda-menu-badge-dot notif-dot" style="position: absolute; top: 10px; right: 10px; width: 10px; height: 10px; background-color: #D32F2F; border-radius: 50%; box-shadow: 0 0 0 2px #FFFFFF; z-index: 5;"></div>
      `;
    } else if (item.id === 'me-bibit' && hasActionableMataEntres) {
      badgeHtml = `
        <div class="beranda-menu-badge-dot notif-dot" style="position: absolute; top: 10px; right: 10px; width: 10px; height: 10px; background-color: #D32F2F; border-radius: 50%; box-shadow: 0 0 0 2px #FFFFFF; z-index: 5;"></div>
      `;
    }

    return `
      <button class="beranda-menu-card request-menu-card" data-sub-id="${item.id}" ${item.route ? `data-route="${item.route}"` : ''} type="button" style="height: 120px; padding: 10px 4px 6px; position: relative;">
        <div class="beranda-card-icon" style="width: 40px; height: 40px; margin-bottom: 6px;">${item.icon}</div>
        <div class="beranda-card-title" style="font-size: 0.68rem; line-height: 1.18; min-height: 38px; display: flex; align-items: center; justify-content: center; text-align: center;">
          ${item.title}
        </div>
        ${badgeHtml}
      </button>
    `;
  }).join('');

  app.innerHTML = `
    <div class="page request-landing-page" style="display: flex; flex-direction: column; height: 100%; background: #FAFAFA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; position: relative;">
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;">
        <div style="display: flex; align-items: center;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.15rem; font-weight: 700; color: #111111; margin: 0 0 0 8px; letter-spacing: -0.01em;">Permintaan Bibit</h1>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-right: -4px;">
          <button id="btn-sync" type="button" aria-label="Refresh" style="padding: 6px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg id="sync-icon-svg" viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.4s ease;">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>
      </header>

      <!-- CONTENT BODY -->
      <main class="beranda-body">
        <div class="beranda-grid">
          ${menuCards}
        </div>
      </main>
    </div>
  `;

  // Back button to Beranda
  app.querySelector('#btn-back')?.addEventListener('click', () => {
    navigate('/home');
  });

  // Sync / Refresh button
  const btnSync = app.querySelector('#btn-sync');
  if (btnSync) {
    let rotation = 0;
    btnSync.addEventListener('click', () => {
      rotation += 360;
      const iconSvg = app.querySelector('#sync-icon-svg');
      if (iconSvg) {
        iconSvg.style.transform = `rotate(${rotation}deg)`;
      }
      setTimeout(() => {
        renderRequestLanding();
      }, 300);
    });
  }

  // Sub-menu card interactions
  app.querySelectorAll('.request-menu-card').forEach((card) => {
    card.addEventListener('click', () => {
      const subId = card.dataset.subId;
      const targetRoute = card.dataset.route;
      const item = activeSubMenuItems.find((m) => m.id === subId);
      const title = item ? item.rawTitle : 'Sub-menu';

      if (targetRoute) {
        navigate(targetRoute);
      } else {
        toast(`Modul ${title} sedang disiapkan`, 'info');
      }
    });
  });
}
