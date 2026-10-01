/**
 * js/components/bottom-nav-asb.js
 * Bottom Navigation Component untuk Workspace Asisten Bibitan (4 Item):
 * 1. Beranda (#/home)
 * 2. Pemeriksaan (#/inspection)
 * 3. Verifikasi (#/verification)
 * 4. Laporan (#/reports)
 */

import { navigate } from '../core/router.js';

export const ASB_NAV_ITEMS = Object.freeze([
  {
    id: 'beranda',
    label: 'Beranda',
    route: '/home',
    icon: `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    `
  },
  {
    id: 'pemeriksaan',
    label: 'Pemeriksaan',
    route: '/inspection',
    icon: `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <circle cx="12" cy="14" r="3"></circle>
      </svg>
    `
  },
  {
    id: 'verifikasi',
    label: 'Verifikasi',
    route: '/verification',
    icon: `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 11l3 3L22 4"></path>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
      </svg>
    `
  },
  {
    id: 'laporan',
    label: 'Laporan',
    route: '/reports',
    icon: `
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
    `
  }
]);

/**
 * Render HTML string untuk bottom navigation bar ASB
 * @param {'beranda'|'pemeriksaan'|'verifikasi'|'laporan'} activeId
 */
export function renderAsbBottomNav(activeId = 'beranda') {
  return `
    <footer class="asb-bottom-nav" style="display: flex; align-items: center; justify-content: space-around; height: 58px; background: #FFFFFF; border-top: 1px solid #E5E7EB; flex-shrink: 0; padding: 0 4px; box-shadow: 0 -2px 6px rgba(0,0,0,0.03); z-index: 50; position: relative;">
      ${ASB_NAV_ITEMS.map((item) => {
        const isActive = item.id === activeId;
        const color = isActive ? '#116834' : '#9CA3AF';
        const fontWeight = isActive ? '800' : '600';
        const bgPill = isActive ? '#E8F5E9' : 'transparent';
        return `
          <button class="asb-bottom-nav-btn ${isActive ? 'is-active' : ''}" data-nav-id="${item.id}" data-nav-route="${item.route}" type="button" style="display: flex; flex-direction: column; align-items: center; justify-content: center; background: transparent; border: none; padding: 4px 12px; border-radius: 8px; cursor: pointer; color: ${color}; gap: 2px; flex: 1; height: 100%; transition: all 0.15s ease;">
            <div style="display: flex; align-items: center; justify-content: center; width: 34px; height: 26px; border-radius: 12px; background: ${bgPill};">
              ${item.icon}
            </div>
            <span style="font-size: 0.68rem; font-weight: ${fontWeight}; letter-spacing: -0.01em; color: ${color};">${item.label}</span>
          </button>
        `;
      }).join('')}
    </footer>
  `;
}

/**
 * Pasang event listener ke elemen container
 */
export function attachAsbBottomNavEvents(container) {
  if (!container) return;
  container.querySelectorAll('.asb-bottom-nav-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const route = btn.getAttribute('data-nav-route');
      if (route) {
        navigate(route);
      }
    });
  });
}
