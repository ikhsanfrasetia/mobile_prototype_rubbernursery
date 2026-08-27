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
  `
};

const MENU_ITEMS = [
  { id: 'presensi', title: 'Presensi', icon: ICONS.team, route: '/attendance' },
  { id: 'penerimaan', title: 'Penerimaan', icon: ICONS.documentPlus, route: '/reception' },
  { id: 'penyemaian', title: 'Penyemaian', icon: ICONS.sprout, route: '/seeding' },
  { id: 'okulasi', title: 'Okulasi', icon: ICONS.sprout, route: '/budding' },
  { id: 'pemeriksaan', title: 'Pemeriksaan', icon: ICONS.documentPlus, route: '/inspection' },
  { id: 'penyeleksian', title: 'Penyeleksian', icon: ICONS.sprout, route: '/selection' },
  { id: 'material', title: 'Material &<br>Bahan', icon: ICONS.sprout, route: '/material' },
  { id: 'pemeliharaan', title: 'Rekam<br>Pemeliharaan', icon: ICONS.documentPlus, route: '/nursery-activity' },
  { id: 'permintaan', title: 'Permintaan', icon: ICONS.sprout, route: '/request' }
];

export function renderBeranda() {
  const app = document.getElementById('app');
  
  const txs = storage.get('receipt_transactions', []);
  const hasBenih = txs.some(tx => tx.jenis === 'Benih / Biji Kelatak');

  const menuCards = MENU_ITEMS.map(
    (item) => `
    <button class="beranda-menu-card" data-menu-id="${item.id}" data-route="${item.route}" type="button" style="position: relative;">
      <div class="beranda-card-icon">${item.icon}</div>
      <div class="beranda-card-title">${item.title}</div>
      ${item.id === 'penyemaian' && hasBenih ? `
        <div style="position: absolute; top: 14px; right: 14px; width: 12px; height: 12px; background-color: #D32F2F; border-radius: 50%; box-shadow: 0 0 0 2px #FFFFFF;"></div>
      ` : ''}
    </button>
  `
  ).join('');

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
