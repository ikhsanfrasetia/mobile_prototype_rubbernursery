/**
 * js/modules/reports/reports-landing.js
 * Halaman Workspace Laporan Asisten Bibitan (#/reports)
 * 
 * Menampilkan 2 Menu Read-Only:
 * 1. Stok Bibit (Visualisasi stok bibit)
 * 2. Riwayat Transaksi (Log transaksi pembibitan)
 */

import { openDrawer } from '../../components/drawer.js';
import { navigate } from '../../core/router.js';
import { toast } from '../../components/toast.js';
import { renderAsbBottomNav, attachAsbBottomNavEvents } from '../../components/bottom-nav-asb.js';
import { getCurrentUserContext } from '../../core/user-context.js';
import { getReturnedDocumentsData } from './returned-documents-report.js';

const REPORT_ICONS = {
  chart: `
    <svg viewBox="0 0 24 24" width="56" height="56" fill="#116834">
      <rect x="3" y="12" width="4" height="9" rx="1" fill="#116834"/>
      <rect x="10" y="7" width="4" height="14" rx="1" fill="#116834"/>
      <rect x="17" y="3" width="4" height="18" rx="1" fill="#116834"/>
    </svg>
  `,
  document: `
    <svg viewBox="0 0 24 24" width="56" height="56" fill="#116834">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#116834"/>
      <polyline points="14 2 14 8 20 8" stroke="#FFFFFF" stroke-width="1.5" fill="none"/>
      <line x1="8" y1="13" x2="16" y2="13" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="8" y1="17" x2="16" y2="17" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `,
  returnDoc: `
    <svg viewBox="0 0 24 24" width="56" height="56" fill="none">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="#116834"/>
      <polyline points="14 2 14 8 20 8" stroke="#FFFFFF" stroke-width="1.5" fill="none"/>
      <path d="M15 14l-2.5 2.5m0 0l2.5 2.5m-2.5-2.5h4.5a2 2 0 0 0 2-2v-1" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `
};

export const REPORT_MENUS = [
  {
    id: 'stok-bibit',
    title: 'Stok Bibit',
    route: '/reports/stock',
    icon: REPORT_ICONS.chart
  },
  {
    id: 'riwayat-transaksi',
    title: 'Riwayat<br>Transaksi',
    route: '/history',
    icon: REPORT_ICONS.document
  },
  {
    id: 'daftar-dokumen-dikembalikan',
    title: 'Daftar Dokumen<br>Dikembalikan',
    route: '/reports/returned-docs',
    icon: REPORT_ICONS.returnDoc
  }
];

export function renderReportsLanding() {
  const app = document.getElementById('main-content') || document.getElementById('app');
  if (!app) return;

  const userCtx = getCurrentUserContext();
  const returnedList = getReturnedDocumentsData(userCtx);
  const pendingRevisionCount = returnedList.filter(d => d.progressStatus === 'MENUNGGU_REVISI').length;

  const menuCards = REPORT_MENUS.map((item) => {
    const hasBadge = item.id === 'daftar-dokumen-dikembalikan' && pendingRevisionCount > 0;
    return `
      <button class="beranda-menu-card report-menu-card" data-menu-id="${item.id}" data-route="${item.route}" type="button" style="position: relative;">
        <div class="beranda-card-icon">${item.icon}</div>
        <div class="beranda-card-title">${item.title}</div>
        ${hasBadge ? `
          <span style="position: absolute; top: 6px; right: 6px; background: #EF4444; color: #FFFFFF; font-size: 0.62rem; font-weight: 800; min-width: 18px; height: 18px; border-radius: 999px; display: flex; align-items: center; justify-content: center; padding: 0 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.2); z-index: 5;">
            ${pendingRevisionCount}
          </span>
        ` : ''}
      </button>
    `;
  }).join('');

  app.innerHTML = `
    <div class="page reports-page" style="display: flex; flex-direction: column; height: 100%; min-height: 0; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; position: relative;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <button id="reports-drawer-btn" type="button" aria-label="Menu" style="background: transparent; border: none; padding: 4px; cursor: pointer; display: flex; align-items: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="#116834" stroke-width="2.2" fill="none" stroke-linecap="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 800; color: #111827; margin: 0; letter-spacing: -0.01em;">Laporan</h1>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <button id="reports-refresh-btn" type="button" aria-label="Segarkan" style="background: transparent; border: none; padding: 4px; cursor: pointer; display: flex; align-items: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="#116834" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
          </button>
          <button id="reports-notif-btn" type="button" aria-label="Notifikasi" style="background: transparent; border: none; padding: 4px; cursor: pointer; display: flex; align-items: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="#116834" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
        </div>
      </header>

      <!-- BODY / CARDS GRID -->
      <main class="beranda-body" style="flex: 1; min-height: 0; overflow-y: auto; padding: 12px 10px 14px; display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${menuCards}
        </div>
      </main>

      <!-- BOTTOM NAVIGATION (4 ITEMS) -->
      ${renderAsbBottomNav('laporan')}

    </div>
  `;

  // Attach drawer
  app.querySelector('#reports-drawer-btn')?.addEventListener('click', openDrawer);

  // Refresh
  app.querySelector('#reports-refresh-btn')?.addEventListener('click', () => {
    toast('Data laporan diperbarui', 'info');
    renderReportsLanding();
  });

  // Notif
  app.querySelector('#reports-notif-btn')?.addEventListener('click', () => {
    toast('Tidak ada notifikasi baru', 'info');
  });

  // Menu clicks
  app.querySelectorAll('.report-menu-card').forEach((card) => {
    card.addEventListener('click', () => {
      const route = card.dataset.route;
      if (route) {
        navigate(route);
      } else {
        toast('Laporan akan segera dibuka', 'info');
      }
    });
  });

  // Attach bottom nav events
  attachAsbBottomNavEvents(app);
}
