/**
 * modules/dashboard/beranda.js — Halaman Beranda Mantri Bibitan.
 * Sesuai desain acuan: 3x3 Grid Menu (Presensi, Penerimaan, Penyemaian, Okulasi,
 * Pemeriksaan, Penyeleksian, Material & Bahan, Rekam Pemeliharaan, Permintaan)
 * dan 2 tombol bottom (Konfirmasi untuk Konsolidasi, Konfirmasi untuk Verifikasi).
 */

import { session } from '../../core/session.js';
import { storage } from '../../core/storage.js';
import { openDrawer } from '../../components/drawer.js';
import { toast } from '../../components/toast.js';
import { navigate } from '../../core/router.js';
import { formatStandardDocNo } from '../../core/utils.js';
import { ROLE_LABELS, ROLES } from '../../core/permissions.js';
import { syncAllSeedingsToSelectionPool, filterSelectionByScope } from '../selection/selection-manager.js';

/* SVG Icons sesuai desain acuan - proporsional & tajam */
const ICONS = {
  team: `
    <svg viewBox="2 3 26 22" width="56" height="56" fill="#116834">
      <circle cx="11" cy="9" r="4.3" fill="#116834"/>
      <path d="M4 23 C4 18 7.5 15.5 11 15.5 C14.5 15.5 18 18 18 23 Z" fill="#116834"/>
      <circle cx="21" cy="10.5" r="3.5" fill="#116834"/>
      <path d="M16.8 23 C17 19.8 18.8 17.8 21 17.8 C23.5 17.8 26.5 19.8 26.5 23 Z" fill="#116834"/>
    </svg>
  `,
  documentPlus: `
    <svg viewBox="3 2 26 27" width="56" height="56" fill="#116834">
      <rect x="5" y="4" width="22" height="24" rx="4.5" fill="#116834"/>
      <line x1="9" y1="12" x2="19" y2="12" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="9" y1="16" x2="19" y2="16" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="9" y1="20" x2="16" y2="20" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="23" cy="7" r="4.2" fill="#116834" stroke="#ffffff" stroke-width="1.5"/>
      <line x1="23" y1="4.8" x2="23" y2="9.2" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="20.8" y1="7" x2="25.2" y2="7" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `,
  sprout: `
    <svg viewBox="2 1.5 28 19" width="56" height="56" fill="#116834">
      <path d="M16 2.5 C16 2.5 11.5 8.5 11.5 14 C11.5 16.8 13.5 19 16 19 C18.5 19 20.5 16.8 20.5 14 C20.5 8.5 16 2.5 16 2.5 Z" fill="#116834"/>
      <path d="M13.2 19.5 C9.5 19.5 3.5 15.2 3.5 9 C9.5 8.5 13.8 13.2 13.8 17 C13.8 18 13.5 18.8 13.2 19.5 Z" fill="#116834"/>
      <path d="M18.8 19.5 C22.5 19.5 28.5 15.2 28.5 9 C22.5 8.5 18.2 13.2 18.2 17 C18.2 18 18.5 18.8 18.8 19.5 Z" fill="#116834"/>
    </svg>
  `,
  entres: `
    <svg viewBox="2 2 28 28" width="56" height="56" fill="#116834">
      <path d="M14 26 C14 26 14 13 14 9 C14 5.5 17.5 3 22 2.5 C22.5 7 19.5 10.5 15.8 11 C15.8 13 15.8 17 15.8 26 Z" fill="#116834"/>
      <path d="M14 16.5 C10.5 16.5 6.5 14 6 10 C10 9.5 13.5 12 14 15 Z" fill="#116834"/>
      <circle cx="14" cy="24" r="2.5" fill="#116834"/>
    </svg>
  `
};

const MENU_ITEMS = [
  { id: 'presensi', title: 'Presensi', icon: ICONS.team, route: '/attendance' },
  { id: 'penerimaan', title: 'Penerimaan', icon: ICONS.documentPlus, route: '/reception' },
  { id: 'penyemaian', title: 'Penyemaian', icon: ICONS.sprout, route: '/seeding' },
  { id: 'okulasi', title: 'Okulasi', icon: ICONS.sprout, route: '/budding' },
  { id: 'pemeriksaan', title: 'Pemeriksaan', icon: ICONS.documentPlus, route: '/inspection' },
  { id: 'penyeleksian', title: 'Penyeleksian', icon: ICONS.sprout, route: '/selection' },
  { id: 'kebun-entres', title: 'Kebun<br>Entres', icon: ICONS.entres, route: '/entres' },
  { id: 'material', title: 'Material &<br>Bahan', icon: ICONS.sprout, route: '/material' },
  { id: 'pemeliharaan', title: 'Rekam<br>Pemeliharaan', icon: ICONS.documentPlus, route: '/nursery-activity' },
  { id: 'pengeluaran', title: 'Pengeluaran', icon: ICONS.sprout, route: '/dispatch' }
];

import { getCurrentUserContext, resolveUserContext } from '../../core/user-context.js';
import { requestRepository } from '../../db/repositories.js';
import { 
  filterIncomingRequests as filterIncomingKspRequests, 
  getActionableIncomingCount as getActionableIncomingKspCount 
} from '../request/request-kebun-sepupu-landing.js';
import {
  filterIncomingRequests as filterIncomingSendiriRequests,
  getActionableIncomingCount as getActionableIncomingSendiriCount
} from '../request/request-kebun-sendiri-landing.js';
import { filterReceiptKspRequests, getActionableReceiptCount } from '../receipt/receipt-kebun-sepupu-landing.js';
import { getActionableSelectionCount } from '../selection/selection-manager.js';
import { getActionableDestructionCount } from '../destruction/destruction-manager.js';
import { ASISTEN_BIBITAN_MAIN_MENUS } from '../../core/menu-registry.js';

function hasActionablePermintaan(requests, userCtx) {
  if (!requests || !userCtx) return false;
  const kspIncoming = filterIncomingKspRequests(requests, userCtx);
  const kspCount = getActionableIncomingKspCount(kspIncoming, userCtx);

  const sendiriIncoming = filterIncomingSendiriRequests(requests, userCtx);
  const sendiriCount = getActionableIncomingSendiriCount(sendiriIncoming, userCtx);

  return (kspCount + sendiriCount) > 0;
}

const PENGURUS_MENU_ITEMS = [
  { id: 'penerimaan', title: 'Penerimaan<br>Bibit', icon: ICONS.documentPlus, route: '/reception/kebun-sepupu' },
  { id: 'permintaan-bibit', title: 'Permintaan<br>Bibit', icon: ICONS.documentPlus, route: '/request' },
  { id: 'pengeluaran-bibit', title: 'Pengeluaran<br>Bibit', icon: ICONS.sprout, route: '/dispatch' }
];

const ASKEP_MENU_ITEMS = [
  { id: 'penerimaan', title: 'Penerimaan<br>Bibit', icon: ICONS.documentPlus, route: '/reception/kebun-sepupu' },
  { id: 'permintaan-bibit', title: 'Permintaan<br>Bibit', icon: ICONS.documentPlus, route: '/request' },
  { id: 'pengeluaran-bibit', title: 'Pengeluaran<br>Bibit', icon: ICONS.sprout, route: '/dispatch' }
];

const ASISTEN_MENU_ITEMS = [
  { id: 'penerimaan', title: 'Penerimaan<br>Bibit', icon: ICONS.documentPlus, route: '/reception/kebun-sepupu' },
  { id: 'permintaan-bibit', title: 'Permintaan<br>Bibit', icon: ICONS.documentPlus, route: '/request' },
  { id: 'pemeriksaan', title: 'Pemeriksaan', icon: ICONS.documentPlus, route: '/inspection' },
  { id: 'penyeleksian', title: 'Penyeleksian', icon: ICONS.sprout, route: '/selection' },
  { id: 'pemeliharaan', title: 'Rekam<br>Pemeliharaan', icon: ICONS.documentPlus, route: '/nursery-activity' },
  { id: 'pengeluaran-bibit', title: 'Pengeluaran<br>Bibit', icon: ICONS.sprout, route: '/dispatch' }
];

function renderBerandaAskep() {
  const app = document.getElementById('app');
  if (!app) return;

  const user = session.get();
  const userCtx = getCurrentUserContext() || resolveUserContext(user);

  const allRequests = storage.get('requests_transactions', []);
  const hasActionableRequest = hasActionablePermintaan(allRequests, userCtx);

  const allReceipts = storage.get('receipt_ksp_transactions', []);
  const estateReceipts = filterReceiptKspRequests(allReceipts, userCtx);
  const hasActionableReceipt = getActionableReceiptCount(estateReceipts, userCtx) > 0;

  // Background sync from IndexedDB if available
  requestRepository.list().then((dbList) => {
    if (dbList && dbList.length > 0) {
      const dbHasActionable = hasActionablePermintaan(dbList, userCtx);
      if (dbHasActionable !== hasActionableRequest) {
        const badgeEl = app.querySelector('[data-menu-id="permintaan-bibit"] .notif-dot');
        if (dbHasActionable && !badgeEl) {
          renderBerandaAskep();
        } else if (!dbHasActionable && badgeEl) {
          renderBerandaAskep();
        }
      }
    }
  }).catch(() => {});

  const menuCards = ASKEP_MENU_ITEMS.map((item) => {
    let badgeHtml = '';
    if (item.id === 'permintaan-bibit' && hasActionableRequest) {
      badgeHtml = `
        <div class="beranda-menu-badge-dot notif-dot" style="position: absolute; top: 12px; right: 12px; width: 11px; height: 11px; background-color: #D32F2F; border-radius: 50%; box-shadow: 0 0 0 2px #FFFFFF; z-index: 5;"></div>
      `;
    } else if (item.id === 'penerimaan' && hasActionableReceipt) {
      badgeHtml = `
        <div class="beranda-menu-badge-dot notif-dot" style="position: absolute; top: 12px; right: 12px; width: 11px; height: 11px; background-color: #D32F2F; border-radius: 50%; box-shadow: 0 0 0 2px #FFFFFF; z-index: 5;"></div>
      `;
    }

    return `
      <button class="beranda-menu-card" data-menu-id="${item.id}" data-route="${item.route}" type="button" style="position: relative;">
        <div class="beranda-card-icon">${item.icon}</div>
        <div class="beranda-card-title">${item.title}</div>
        ${badgeHtml}
      </button>
    `;
  }).join('');

  app.innerHTML = `
    <div class="page beranda-page">
      <header class="beranda-header">
        <button class="beranda-menu-btn" id="beranda-drawer-btn" type="button" aria-label="Menu">
          <svg viewBox="0 0 24 24" width="26" height="26" stroke="#116834" stroke-width="2.2" fill="none" stroke-linecap="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <h1 class="beranda-header-title">Beranda</h1>
      </header>

      <main class="beranda-body">
        <div class="beranda-grid">
          ${menuCards}
        </div>
      </main>
    </div>
  `;

  // Drawer Toggle
  app.querySelector('#beranda-drawer-btn')?.addEventListener('click', openDrawer);

  // Menu clicks
  app.querySelectorAll('.beranda-menu-card').forEach((card) => {
    card.addEventListener('click', () => {
      const route = card.dataset.route;
      if (route) {
        navigate(route);
      } else {
        const title = card.querySelector('.beranda-card-title')?.textContent.trim() || 'Modul';
        toast(`Modul ${title} akan segera dibuka`, 'info');
      }
    });
  });
}

function renderBerandaAsisten() {
  const app = document.getElementById('app');
  if (!app) return;

  const user = session.get();
  const userCtx = getCurrentUserContext() || resolveUserContext(user);

  const allRequests = storage.get('requests_transactions', []);
  const hasActionableRequest = hasActionablePermintaan(allRequests, userCtx);

  const allReceipts = storage.get('receipt_ksp_transactions', []);
  const estateReceipts = filterReceiptKspRequests(allReceipts, userCtx);
  const hasActionableReceipt = getActionableReceiptCount(estateReceipts, userCtx) > 0;

  // Background sync from IndexedDB if available
  requestRepository.list().then((dbList) => {
    if (dbList && dbList.length > 0) {
      const dbHasActionable = hasActionablePermintaan(dbList, userCtx);
      if (dbHasActionable !== hasActionableRequest) {
        const badgeEl = app.querySelector('[data-menu-id="permintaan-bibit"] .notif-dot');
        if (dbHasActionable && !badgeEl) {
          renderBerandaAsisten();
        } else if (!dbHasActionable && badgeEl) {
          renderBerandaAsisten();
        }
      }
    }
  }).catch(() => {});

  const menuCards = ASISTEN_MENU_ITEMS.map((item) => {
    let badgeHtml = '';
    if (item.id === 'permintaan-bibit' && hasActionableRequest) {
      badgeHtml = `
        <div class="beranda-menu-badge-dot notif-dot" style="position: absolute; top: 12px; right: 12px; width: 11px; height: 11px; background-color: #D32F2F; border-radius: 50%; box-shadow: 0 0 0 2px #FFFFFF; z-index: 5;"></div>
      `;
    } else if (item.id === 'penerimaan' && hasActionableReceipt) {
      badgeHtml = `
        <div class="beranda-menu-badge-dot notif-dot" style="position: absolute; top: 12px; right: 12px; width: 11px; height: 11px; background-color: #D32F2F; border-radius: 50%; box-shadow: 0 0 0 2px #FFFFFF; z-index: 5;"></div>
      `;
    }

    return `
      <button class="beranda-menu-card" data-menu-id="${item.id}" data-route="${item.route}" type="button" style="position: relative;">
        <div class="beranda-card-icon">${item.icon}</div>
        <div class="beranda-card-title">${item.title}</div>
        ${badgeHtml}
      </button>
    `;
  }).join('');

  app.innerHTML = `
    <div class="page beranda-page">
      <header class="beranda-header">
        <button class="beranda-menu-btn" id="beranda-drawer-btn" type="button" aria-label="Menu">
          <svg viewBox="0 0 24 24" width="26" height="26" stroke="#116834" stroke-width="2.2" fill="none" stroke-linecap="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <h1 class="beranda-header-title">Beranda</h1>
      </header>

      <main class="beranda-body">
        <div class="beranda-grid">
          ${menuCards}
        </div>
      </main>
    </div>
  `;

  // Drawer Toggle
  app.querySelector('#beranda-drawer-btn')?.addEventListener('click', openDrawer);

  // Menu clicks
  app.querySelectorAll('.beranda-menu-card').forEach((card) => {
    card.addEventListener('click', () => {
      const route = card.dataset.route;
      if (route) {
        navigate(route);
      } else {
        const title = card.querySelector('.beranda-card-title')?.textContent.trim() || 'Modul';
        toast(`Modul ${title} akan segera dibuka`, 'info');
      }
    });
  });
}

function renderBerandaPengurus() {
  const app = document.getElementById('app');
  if (!app) return;

  const user = session.get();
  const userCtx = getCurrentUserContext() || resolveUserContext(user);

  const allRequests = storage.get('requests_transactions', []);
  const hasActionableRequest = hasActionablePermintaan(allRequests, userCtx);

  const allReceipts = storage.get('receipt_ksp_transactions', []);
  const estateReceipts = filterReceiptKspRequests(allReceipts, userCtx);
  const hasActionableReceipt = getActionableReceiptCount(estateReceipts, userCtx) > 0;

  // Background sync from IndexedDB if available
  requestRepository.list().then((dbList) => {
    if (dbList && dbList.length > 0) {
      const dbHasActionable = hasActionablePermintaan(dbList, userCtx);
      if (dbHasActionable !== hasActionableRequest) {
        const badgeEl = app.querySelector('[data-menu-id="permintaan-bibit"] .notif-dot');
        if (dbHasActionable && !badgeEl) {
          renderBerandaPengurus();
        } else if (!dbHasActionable && badgeEl) {
          renderBerandaPengurus();
        }
      }
    }
  }).catch(() => {});

  const menuCards = PENGURUS_MENU_ITEMS.map((item) => {
    let badgeHtml = '';
    if (item.id === 'permintaan-bibit' && hasActionableRequest) {
      badgeHtml = `
        <div class="beranda-menu-badge-dot notif-dot" style="position: absolute; top: 12px; right: 12px; width: 11px; height: 11px; background-color: #D32F2F; border-radius: 50%; box-shadow: 0 0 0 2px #FFFFFF; z-index: 5;"></div>
      `;
    } else if (item.id === 'penerimaan' && hasActionableReceipt) {
      badgeHtml = `
        <div class="beranda-menu-badge-dot notif-dot" style="position: absolute; top: 12px; right: 12px; width: 11px; height: 11px; background-color: #D32F2F; border-radius: 50%; box-shadow: 0 0 0 2px #FFFFFF; z-index: 5;"></div>
      `;
    }

    return `
      <button class="beranda-menu-card" data-menu-id="${item.id}" data-route="${item.route}" type="button" style="position: relative;">
        <div class="beranda-card-icon">${item.icon}</div>
        <div class="beranda-card-title">${item.title}</div>
        ${badgeHtml}
      </button>
    `;
  }).join('');

  app.innerHTML = `
    <div class="page beranda-page">
      <header class="beranda-header">
        <button class="beranda-menu-btn" id="beranda-drawer-btn" type="button" aria-label="Menu">
          <svg viewBox="0 0 24 24" width="26" height="26" stroke="#116834" stroke-width="2.2" fill="none" stroke-linecap="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <h1 class="beranda-header-title">Beranda</h1>
      </header>

      <main class="beranda-body">
        <div class="beranda-grid">
          ${menuCards}
        </div>
      </main>
    </div>
  `;

  // Drawer Toggle
  app.querySelector('#beranda-drawer-btn')?.addEventListener('click', openDrawer);

  // Menu clicks
  app.querySelectorAll('.beranda-menu-card').forEach((card) => {
    card.addEventListener('click', () => {
      const route = card.dataset.route;
      if (route) {
        navigate(route);
      } else {
        const title = card.querySelector('.beranda-card-title')?.textContent.trim() || 'Modul';
        toast(`Modul ${title} akan segera dibuka`, 'info');
      }
    });
  });
}

function renderRoleDevelopmentHome(user) {
  const app = document.getElementById('app');
  const roleLabel = ROLE_LABELS[user?.role] || user?.position || 'Pengguna';
  const userName = user?.name || roleLabel;

  app.innerHTML = `
    <div class="page beranda-page">
      <header class="beranda-header">
        <button class="beranda-menu-btn" id="beranda-drawer-btn" type="button" aria-label="Menu">
          <svg viewBox="0 0 24 24" width="26" height="26" stroke="#116834" stroke-width="2.2" fill="none" stroke-linecap="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <h1 class="beranda-header-title">Beranda</h1>
      </header>

      <main class="beranda-body" style="display: flex; align-items: center; justify-content: center; padding: 24px;">
        <section style="width: 100%; max-width: 340px; text-align: center;">
          <div style="width: 88px; height: 88px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #E8F3EC; color: #116834; font-size: 42px;">🛠️</div>
          <div style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; margin-bottom: 16px; border: 1px solid #FDE68A; border-radius: 999px; background: #FEF3C7; color: #92400E; font-size: 0.78rem; font-weight: 700;">DALAM PENGEMBANGAN</div>
          <h2 style="margin: 0 0 10px; color: #111827; font-size: 1.3rem; line-height: 1.35;">Beranda ${roleLabel}</h2>
          <p style="margin: 0 0 8px; color: #374151; font-size: 0.95rem; line-height: 1.55;">Halo, ${userName}.</p>
          <p style="margin: 0; color: #6B7280; font-size: 0.9rem; line-height: 1.55;">Navigasi dan fitur khusus untuk role ini sedang disiapkan untuk kebutuhan review prototype.</p>
        </section>
      </main>
    </div>
  `;

  app.querySelector('#beranda-drawer-btn')?.addEventListener('click', openDrawer);
}

function renderBerandaAsistenBibitan() {
  const app = document.getElementById('app');
  if (!app) return;

  const user = session.get();
  const userCtx = getCurrentUserContext() || resolveUserContext(user);

  const allRequests = storage.get('requests_transactions', []);
  const hasActionableRequest = hasActionablePermintaan(allRequests, userCtx);

  const allReceipts = storage.get('receipt_ksp_transactions', []);
  const estateReceipts = filterReceiptKspRequests(allReceipts, userCtx);
  const hasActionableReceipt = getActionableReceiptCount(estateReceipts, userCtx) > 0;

  const allSelections = storage.get('selection_transactions', []);
  const hasActionableSelection = getActionableSelectionCount(allSelections, userCtx) > 0;

  const allDestructions = storage.get('destruction_transactions', []);
  const hasActionableDestruction = getActionableDestructionCount(allDestructions, userCtx) > 0;

  // Background sync from IndexedDB if available
  requestRepository.list().then((dbList) => {
    if (dbList && dbList.length > 0) {
      const dbHasActionable = hasActionablePermintaan(dbList, userCtx);
      if (dbHasActionable !== hasActionableRequest) {
        const badgeEl = app.querySelector('[data-menu-id="permintaan-bibit"] .notif-dot');
        if (dbHasActionable && !badgeEl) {
          renderBerandaAsistenBibitan();
        } else if (!dbHasActionable && badgeEl) {
          renderBerandaAsistenBibitan();
        }
      }
    }
  }).catch(() => {});

  const menuCards = ASISTEN_BIBITAN_MAIN_MENUS.map((item) => {
    let badgeHtml = '';
    if (item.id === 'permintaan-bibit' && hasActionableRequest) {
      badgeHtml = `
        <div class="beranda-menu-badge-dot notif-dot" style="position: absolute; top: 12px; right: 12px; width: 11px; height: 11px; background-color: #D32F2F; border-radius: 50%; box-shadow: 0 0 0 2px #FFFFFF; z-index: 5;"></div>
      `;
    } else if (item.id === 'penerimaan' && hasActionableReceipt) {
      badgeHtml = `
        <div class="beranda-menu-badge-dot notif-dot" style="position: absolute; top: 12px; right: 12px; width: 11px; height: 11px; background-color: #D32F2F; border-radius: 50%; box-shadow: 0 0 0 2px #FFFFFF; z-index: 5;"></div>
      `;
    } else if (item.id === 'pemeriksaan-seleksi' && hasActionableSelection) {
      badgeHtml = `
        <div class="beranda-menu-badge-dot notif-dot" style="position: absolute; top: 12px; right: 12px; width: 11px; height: 11px; background-color: #D32F2F; border-radius: 50%; box-shadow: 0 0 0 2px #FFFFFF; z-index: 5;"></div>
      `;
    } else if (item.id === 'pemusnahan-bibit' && hasActionableDestruction) {
      badgeHtml = `
        <div class="beranda-menu-badge-dot notif-dot" style="position: absolute; top: 12px; right: 12px; width: 11px; height: 11px; background-color: #D32F2F; border-radius: 50%; box-shadow: 0 0 0 2px #FFFFFF; z-index: 5;"></div>
      `;
    }

    const iconHtml = ICONS[item.iconName] || ICONS.documentPlus;

    return `
      <button class="beranda-menu-card" data-menu-id="${item.id}" data-route="${item.route}" type="button" style="position: relative;">
        <div class="beranda-card-icon">${iconHtml}</div>
        <div class="beranda-card-title">${item.title}</div>
        ${badgeHtml}
      </button>
    `;
  }).join('');

  app.innerHTML = `
    <div class="page beranda-page">
      <header class="beranda-header">
        <button class="beranda-menu-btn" id="beranda-drawer-btn" type="button" aria-label="Menu">
          <svg viewBox="0 0 24 24" width="26" height="26" stroke="#116834" stroke-width="2.2" fill="none" stroke-linecap="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <h1 class="beranda-header-title">Beranda</h1>
      </header>

      <main class="beranda-body">
        <div class="beranda-grid">
          ${menuCards}
        </div>
      </main>
    </div>
  `;

  // Drawer Toggle
  app.querySelector('#beranda-drawer-btn')?.addEventListener('click', openDrawer);

  // Menu clicks
  app.querySelectorAll('.beranda-menu-card').forEach((card) => {
    card.addEventListener('click', () => {
      const route = card.dataset.route;
      if (route) {
        navigate(route);
      } else {
        const title = card.querySelector('.beranda-card-title')?.textContent.trim() || 'Modul';
        toast(`Modul ${title} akan segera dibuka`, 'info');
      }
    });
  });
}

export function renderBeranda() {
  const app = document.getElementById('app');
  const user = session.get();

  if (user?.role === ROLES.PENGURUS || user?.role === ROLES.PENGURUS_KEBUN_SEPUPU) {
    renderBerandaPengurus();
    return;
  }

  if (user?.role === ROLES.ASKEP || user?.role === 'ASISTEN_KEPALA') {
    renderBerandaAskep();
    return;
  }

  if (user?.role === ROLES.ASISTEN_BIBITAN) {
    renderBerandaAsistenBibitan();
    return;
  }

  if (user?.role === ROLES.ASISTEN) {
    renderBerandaAsisten();
    return;
  }

  if (user?.role !== ROLES.MANTRI_TANAMAN) {
    renderRoleDevelopmentHome(user);
    return;
  }
  
  const txs = storage.get('receipt_transactions', []);
  const seedingTxs = storage.get('seeding_transactions', []);
  let hasPendingBenih = false;

  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i];
    if (tx.jenis === 'Benih / Biji Kelatak') {
      const qty = parseInt(tx.qty || 0);
      let accumulatedDisemai = 0;
      let accumulatedDitolak = 0;
      
      seedingTxs.forEach((s) => {
        if (s.sourceIndex == i) {
          accumulatedDisemai += parseInt(s.totalDisemai || 0);
          accumulatedDitolak += parseInt(s.ditolak || 0);
        }
      });
      
      const bibitTersedia = qty - accumulatedDisemai - accumulatedDitolak;
      if (bibitTersedia > 0) {
        hasPendingBenih = true;
        break;
      }
    }
  }

  const buddingTxs = storage.get('budding_transactions', []).filter(b => b.type === 'GRAFTING' || !b.type);
  let hasPendingOkulasi = false;

  for (let i = 0; i < seedingTxs.length; i++) {
    const stx = seedingTxs[i];
    const populasiBibit = parseInt(stx.totalDisemai || 0);
    const batchNo = stx.batchNo || `Batch-0${i + 1}`;
    let ttlRealized = 0;
    buddingTxs.filter(b => b.seedingIndex === i || b.batchNo === batchNo).forEach(b => {
      ttlRealized += parseInt(b.jumlah || 0) + parseInt(b.jumlahDitolak || 0);
    });
    if (populasiBibit - ttlRealized > 0) {
      hasPendingOkulasi = true;
      break;
    }
  }

  const allBuddingTxs = storage.get('budding_transactions', []);
  const inspectionTxs = storage.get('inspection_transactions', []);
  let hasPendingPemeriksaan = false;
  for (let i = 0; i < allBuddingTxs.length; i++) {
    const btx = allBuddingTxs[i];
    const populasiDiokulasi = parseInt(btx.jumlah || 0);
    let totalDiperiksa = 0;
    inspectionTxs.filter(insp => insp.buddingDocNo === btx.docNo || insp.buddingIndex === i).forEach(insp => {
      totalDiperiksa += parseInt(insp.totalDiperiksa || (parseInt(insp.jumlahJadi || 0) + parseInt(insp.jumlahGagal || 0)));
    });
    if (populasiDiokulasi - totalDiperiksa > 0) {
      hasPendingPemeriksaan = true;
      break;
    }
  }

  const regraftPool = storage.get('regrafting_pool', []);
  const regraftTxs = storage.get('budding_transactions', []).filter(b => b.type === 'REGRAFTING');
  let hasPendingRegrafting = false;
  for (let i = 0; i < regraftPool.length; i++) {
    const item = regraftPool[i];
    const qty = parseInt(item.jumlah || 0);
    if (qty <= 0) continue;

    // Lewati jika item secara eksplisit sudah selesai (status COMPLETED atau sisa <= 0)
    if (item.status === 'COMPLETED' || (item.sisaRegrafting !== undefined && parseInt(item.sisaRegrafting) <= 0)) {
      continue;
    }

    let done = 0;
    regraftTxs.filter(r => (r.regraftPoolDocNo && r.regraftPoolDocNo === item.docNo) || (r.inspectionDocNo && item.inspectionDocNo && r.inspectionDocNo === item.inspectionDocNo)).forEach(r => {
      done += parseInt(r.jumlah || 0) + parseInt(r.jumlahDitolak || 0);
    });
    if (qty - done > 0) {
      hasPendingRegrafting = true;
      break;
    }
  }

  // Sinkronisasi bibit ditolak (Rusak, Mati, Lainnya) dari transaksi penyemaian
  try {
    syncAllSeedingsToSelectionPool();
  } catch (err) {
    console.warn('[beranda] Gagal sinkronisasi seeding ke selection_pool:', err);
  }

  // Hitung pending penyeleksian (dari pemeriksaan gagal, reject okulasi/regrafting, reject penyemaian, dan reject penerimaan APM/benih)
  let pendingSelectionCount = 0;
  const culledTxs = storage.get('selection_transactions', []);
  const culledPoolDocs = new Set(culledTxs.map(c => c.selectionPoolDocNo).filter(Boolean));
  let selectionPool = storage.get('selection_pool', []);

  // Sinkronisasi data reject dari receipt_transactions (Penerimaan Bibit APM / Benih)
  const receiptTxs = storage.get('receipt_transactions', []);
  receiptTxs.forEach((rtx, i) => {
    const rcvDocNo = rtx.docNo || rtx.nomorDokumen || formatStandardDocNo(2026, 'APR', i + 1);
    const rows = (rtx.rawState && rtx.rawState.tableRows) || [];
    if (rows.length > 0) {
      rows.forEach((row, rIdx) => {
        const rejected = parseInt(row.rejected || 0);
        if (rejected > 0) {
          const poolDocNo = formatStandardDocNo(2026, 'CULL', selectionPool.length + 1);
          if (!selectionPool.some(s => s.receiptDocNo === rcvDocNo && s.originType === 'REJECT_PENERIMAAN' && s.klon === (row.klon || rtx.klon))) {
            selectionPool.push({
              docNo: poolDocNo,
              originType: 'REJECT_PENERIMAAN',
              receiptDocNo: rcvDocNo,
              jumlahAfkir: rejected,
              status: 'PENDING_DECLARATION'
            });
          }
        }
      });
    } else if (parseInt(rtx.rejected || rtx.jumlahDitolak || 0) > 0) {
      const poolDocNo = formatStandardDocNo(2026, 'CULL', selectionPool.length + 1);
      if (!selectionPool.some(s => s.receiptDocNo === rcvDocNo && s.originType === 'REJECT_PENERIMAAN')) {
        selectionPool.push({
          docNo: poolDocNo,
          originType: 'REJECT_PENERIMAAN',
          receiptDocNo: rcvDocNo,
          jumlahAfkir: parseInt(rtx.rejected || rtx.jumlahDitolak || 0),
          status: 'PENDING_DECLARATION'
        });
      }
    }
  });

  // Sinkronisasi data reject dari budding_transactions (Okulasi Grafting & Regrafting)
  const allBuddingForSel = storage.get('budding_transactions', []);
  allBuddingForSel.forEach((btx, i) => {
    const ditolak = parseInt(btx.jumlahDitolak || 0);
    if (ditolak > 0) {
      const isRegraft = btx.type === 'REGRAFTING';
      const originType = isRegraft ? 'REJECT_REGRAFTING' : 'REJECT_OKULASI';
      if (!selectionPool.some(s => s.buddingDocNo === btx.docNo && s.originType === originType)) {
        selectionPool.push({
          docNo: formatStandardDocNo(2026, 'CULL', selectionPool.length + 1),
          originType,
          buddingDocNo: btx.docNo,
          jumlahAfkir: ditolak,
          status: 'PENDING_DECLARATION'
        });
      }
    }
  });

  // Sinkronisasi data gagal periksa dari inspection_transactions
  const allInspectionForSel = storage.get('inspection_transactions', []);
  allInspectionForSel.forEach((insp, i) => {
    const gagal = parseInt(insp.jumlahGagal || 0);
    const toRegraft = insp.totalToRegrafting !== undefined ? parseInt(insp.totalToRegrafting || 0) : gagal;
    const toSelection = insp.totalToSelection !== undefined ? parseInt(insp.totalToSelection || 0) : Math.max(0, gagal - toRegraft);
    if (toSelection > 0) {
      if (!selectionPool.some(s => s.inspectionDocNo === insp.docNo && s.originType === 'REJECT_PEMERIKSAAN')) {
        selectionPool.push({
          docNo: formatStandardDocNo(2026, 'CULL', selectionPool.length + 1),
          originType: 'REJECT_PEMERIKSAAN',
          inspectionDocNo: insp.docNo,
          jumlahAfkir: toSelection,
          status: 'PENDING_DECLARATION'
        });
      }
    }
  });

  storage.set('selection_pool', selectionPool);

  const userCtx = getCurrentUserContext() || resolveUserContext(user);
  const scopedSelectionPool = filterSelectionByScope(selectionPool, userCtx);

  // Hitung seluruh item selection_pool yang belum dideklarasikan sesuai scope
  scopedSelectionPool.forEach(s => {
    if (s.status !== 'DECLARED_CULLED' && !culledPoolDocs.has(s.docNo)) {
      pendingSelectionCount++;
    }
  });

  // Hitung pending pengeluaran bibit untuk Mantri Bibitan
  const allRequests = storage.get('requests_transactions', []);
  const mantriPendingRequests = allRequests.filter(tx => {
    const isTargetEstate = (tx.targetEstateId === userCtx?.estateId || tx.targetNextEstateId === userCtx?.estateId);
    const targetDivision = tx.targetNextDivisionId || tx.targetDivisionId;
    const isTargetDivision = !targetDivision || !userCtx?.divisionId || targetDivision === userCtx?.divisionId;
    const status = (tx.status || '').toUpperCase();
    const isActionable = status === 'TERVERIFIKASI' || status === 'MENUNGGU_PENGELUARAN_BIBIT' || status === 'PENGELUARAN_BERJALAN';
    const remainingQty = (tx.approvedQty || 0) - (tx.totalIssuedQty || tx.actualIssuedQty || 0);
    return isTargetEstate && isTargetDivision && isActionable && remainingQty > 0;
  });
  const hasPendingPengeluaran = mantriPendingRequests.length > 0;

  // Hitung pending penerimaan bibit untuk Mantri Bibitan
  const allReceipts = storage.get('receipt_ksp_transactions', []);
  const scopedReceipts = filterReceiptKspRequests(allReceipts, userCtx);
  const hasPendingPenerimaan = getActionableReceiptCount(scopedReceipts, userCtx) > 0;

  const menuCards = MENU_ITEMS.map((item) => {
    let badgeHtml = '';
    if (item.id === 'penyeleksian' && pendingSelectionCount > 0) {
      badgeHtml = `
        <div style="position: absolute; top: 10px; right: 10px; background: #DC2626; color: #FFFFFF; font-size: 0.68rem; font-weight: 800; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 4px; box-shadow: 0 2px 4px rgba(220,38,38,0.4); border: 2px solid #FFFFFF; z-index: 5;">
          ${pendingSelectionCount}
        </div>
      `;
    } else if ((item.id === 'penyemaian' && hasPendingBenih) || (item.id === 'okulasi' && (hasPendingOkulasi || hasPendingRegrafting)) || (item.id === 'pemeriksaan' && hasPendingPemeriksaan) || (item.id === 'pengeluaran' && hasPendingPengeluaran) || (item.id === 'penerimaan' && hasPendingPenerimaan)) {
      badgeHtml = `
        <div style="position: absolute; top: 12px; right: 12px; width: 11px; height: 11px; background-color: #D32F2F; border-radius: 50%; box-shadow: 0 0 0 2px #FFFFFF; z-index: 5;"></div>
      `;
    }

    return `
      <button class="beranda-menu-card" data-menu-id="${item.id}" data-route="${item.route}" type="button" style="position: relative;">
        <div class="beranda-card-icon">${item.icon}</div>
        <div class="beranda-card-title">${item.title}</div>
        ${badgeHtml}
      </button>
    `;
  }).join('');

  app.innerHTML = `
    <div class="page beranda-page">
      <header class="beranda-header">
        <button class="beranda-menu-btn" id="beranda-drawer-btn" type="button" aria-label="Menu">
          <svg viewBox="0 0 24 24" width="26" height="26" stroke="#116834" stroke-width="2.2" fill="none" stroke-linecap="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <h1 class="beranda-header-title">Beranda</h1>
      </header>

      <main class="beranda-body">
        <div class="beranda-grid">
          ${menuCards}
        </div>
      </main>

      <footer class="beranda-footer">
        <button class="beranda-action-btn" id="btn-konsolidasi" type="button">
          <span class="action-text">Konfirmasi untuk Konsolidasi</span>
          <span class="action-arrow">›</span>
        </button>
        <button class="beranda-action-btn" id="btn-verifikasi" type="button">
          <span class="action-text">Konfirmasi untuk Verifikasi</span>
          <span class="action-arrow">›</span>
        </button>
      </footer>
    </div>
  `;

  // Drawer Toggle
  app.querySelector('#beranda-drawer-btn').addEventListener('click', openDrawer);

  // Menu clicks
  app.querySelectorAll('.beranda-menu-card').forEach((card) => {
    card.addEventListener('click', () => {
      const route = card.dataset.route;
      if (route) {
        navigate(route);
      } else {
        const title = card.querySelector('.beranda-card-title')?.textContent.trim() || 'Modul';
        toast(`Modul ${title} akan segera dibuka`, 'info');
      }
    });
  });

  // Action buttons
  app.querySelector('#btn-konsolidasi').addEventListener('click', () => {
    toast('Belum ada transaksi untuk dikonsolidasi', 'info');
  });

  app.querySelector('#btn-verifikasi').addEventListener('click', () => {
    toast('Belum ada transaksi menunggu verifikasi', 'info');
  });
}
