/**
 * components/drawer.js — Sidebar Navigation Drawer.
 * Sesuai desain acuan: Profil (Avatar, Nama, Posisi), Menu (Beranda, Riwayat Data,
 * Sinkronisasi, Profil Saya, Keluar Aplikasi), dan Footer App Version 1.0.
 */

import { session } from '../core/session.js';
import { ROLE_LABELS } from '../core/permissions.js';
import { navigate, getCurrent } from '../core/router.js';
import { toast } from './toast.js';
import { esc } from '../core/utils.js';
import { userRepository } from '../db/repositories.js';

let drawerEl = null;

/* SVGs persis sesuai desain acuan */
const SVGS = {
  avatar: `
    <svg viewBox="0 0 64 64" width="68" height="68">
      <circle cx="32" cy="32" r="30" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="2.5"/>
      <circle cx="32" cy="24" r="9.5" fill="#cbd5e1"/>
      <path d="M15 50 C15 40 22.5 36 32 36 C41.5 36 49 40 49 50 Z" fill="#cbd5e1"/>
    </svg>
  `,
  home: `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="#116834">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
    </svg>
  `,
  calendar: `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#222222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
      <line x1="8" y1="14" x2="8.01" y2="14"></line>
      <line x1="12" y1="14" x2="12.01" y2="14"></line>
      <line x1="16" y1="14" x2="16.01" y2="14"></line>
      <line x1="8" y1="18" x2="8.01" y2="18"></line>
      <line x1="12" y1="18" x2="12.01" y2="18"></line>
      <line x1="16" y1="18" x2="16.01" y2="18"></line>
    </svg>
  `,
  sync: `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#222222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
    </svg>
  `,
  checkCircle: `
    <svg viewBox="0 0 20 20" width="20" height="20" fill="#22c55e">
      <circle cx="10" cy="10" r="9" fill="#22c55e"/>
      <path d="M6 10.5 L8.5 13 L14 7.5" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>
  `,
  profile: `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#222222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  `,
  logout: `
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#222222" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
      <line x1="12" y1="2" x2="12" y2="12"></line>
    </svg>
  `,
  chevron: `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
  `
};

export function openDrawer() {
  closeDrawer();

  const user = session.get() || { name: 'Wagiman', role: 'MANTRI_TANAMAN', divisionName: 'Divisi I' };
  const displayName = (user.name && user.name !== 'Mantri Tanaman') ? user.name : 'Wagiman';
  const displayRole = user.role === 'MANTRI_TANAMAN' ? 'Mandor Semprot' : (ROLE_LABELS[user.role] || user.role);
  const currentPath = (getCurrent().route || '/home');

  drawerEl = document.createElement('div');
  drawerEl.className = 'drawer-overlay';
  drawerEl.innerHTML = `
    <div class="drawer-panel">
      <div class="drawer-profile-section">
        <div class="drawer-avatar-wrap">
          ${SVGS.avatar}
        </div>
        <div class="drawer-profile-info">
          <div class="drawer-profile-name">${esc(displayName)}</div>
          <div class="drawer-profile-role">${esc(displayRole)}</div>
        </div>
      </div>

      <div class="drawer-nav-list">
        <button class="drawer-nav-row ${currentPath === '/home' ? 'is-active' : ''}" id="menu-beranda" type="button">
          <div class="drawer-row-left">
            <span class="drawer-row-icon">${SVGS.home}</span>
            <span class="drawer-row-label">Beranda</span>
          </div>
          <div class="drawer-row-right">
            ${SVGS.chevron}
          </div>
        </button>

        <button class="drawer-nav-row ${currentPath === '/history' ? 'is-active' : ''}" id="menu-riwayat" type="button">
          <div class="drawer-row-left">
            <span class="drawer-row-icon">${SVGS.calendar}</span>
            <span class="drawer-row-label">Riwayat Data</span>
          </div>
          <div class="drawer-row-right">
            ${SVGS.chevron}
          </div>
        </button>

        <button class="drawer-nav-row ${currentPath === '/sync' ? 'is-active' : ''}" id="menu-sync" type="button">
          <div class="drawer-row-left">
            <span class="drawer-row-icon">${SVGS.sync}</span>
            <span class="drawer-row-label">Sinkronisasi</span>
          </div>
          <div class="drawer-row-right">
            <span class="drawer-sync-check">${SVGS.checkCircle}</span>
            ${SVGS.chevron}
          </div>
        </button>

        <button class="drawer-nav-row" id="menu-profil" type="button">
          <div class="drawer-row-left">
            <span class="drawer-row-icon">${SVGS.profile}</span>
            <span class="drawer-row-label">Profil Saya</span>
          </div>
          <div class="drawer-row-right">
            ${SVGS.chevron}
          </div>
        </button>

        <button class="drawer-nav-row" id="menu-logout" type="button">
          <div class="drawer-row-left">
            <span class="drawer-row-icon">${SVGS.logout}</span>
            <span class="drawer-row-label">Keluar Aplikasi</span>
          </div>
          <div class="drawer-row-right">
            ${SVGS.chevron}
          </div>
        </button>
      </div>

      <div class="drawer-demo-switch">
        <div class="drawer-demo-head">Mode Demo — Ganti Role</div>
        <div class="drawer-demo-pills">
          <button class="demo-pill ${user.role === 'MANTRI_TANAMAN' ? 'active' : ''}" data-role="MANTRI_TANAMAN">Mantri</button>
          <button class="demo-pill ${user.role === 'ASISTEN' ? 'active' : ''}" data-role="ASISTEN">Asisten</button>
          <button class="demo-pill ${user.role === 'ASISTEN_BIBITAN' ? 'active' : ''}" data-role="ASISTEN_BIBITAN">Ast. Bibitan</button>
          <button class="demo-pill ${user.role === 'ASKEP' ? 'active' : ''}" data-role="ASKEP">Askep</button>
          <button class="demo-pill ${user.role === 'PENGURUS' ? 'active' : ''}" data-role="PENGURUS">Pengurus</button>
        </div>
      </div>

      <div class="drawer-bottom-version">
        App Version 1.0
      </div>
    </div>
  `;

  const container = document.querySelector('.device-screen') || document.getElementById('modal-root') || document.body;
  container.appendChild(drawerEl);

  // Close on backdrop click
  drawerEl.addEventListener('click', (e) => {
    if (e.target === drawerEl) closeDrawer();
  });

  // Handlers
  drawerEl.querySelector('#menu-beranda').addEventListener('click', () => {
    closeDrawer();
    navigate('/home');
  });

  drawerEl.querySelector('#menu-riwayat').addEventListener('click', () => {
    closeDrawer();
    navigate('/history');
  });

  drawerEl.querySelector('#menu-sync').addEventListener('click', () => {
    closeDrawer();
    navigate('/sync');
  });

  drawerEl.querySelector('#menu-profil').addEventListener('click', () => {
    toast(`Profil: ${displayName} (${displayRole})`, 'info');
  });

  drawerEl.querySelector('#menu-logout').addEventListener('click', () => {
    session.clear();
    closeDrawer();
    toast('Berhasil keluar aplikasi', 'info');
    navigate('/login');
  });

  // Demo role switcher pills
  drawerEl.querySelectorAll('.demo-pill').forEach((pill) => {
    pill.addEventListener('click', async () => {
      const targetRole = pill.dataset.role;
      const users = await userRepository.list();
      const targetUser = users.find((u) => u.role === targetRole && u.active !== false);
      if (targetUser) {
        session.start({
          userId: targetUser.id,
          role: targetUser.role,
          name: targetUser.name,
          divisionId: targetUser.divisionId,
          divisionName: targetUser.divisionId,
          isDemoSession: true
        });
        toast(`Beralih ke role ${ROLE_LABELS[targetRole]}`, 'info');
        closeDrawer();
        navigate('/home');
      }
    });
  });
}

export function closeDrawer() {
  if (drawerEl) {
    drawerEl.remove();
    drawerEl = null;
  }
}
