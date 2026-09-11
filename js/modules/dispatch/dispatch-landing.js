/**
 * modules/dispatch/dispatch-landing.js — Landing Page Pengeluaran Bibit (Role Pengurus).
 * Menampilkan 1 menu utama: Laporan Pengeluaran Bibit.
 */

import { navigate } from '../../core/router.js';

/* SVG Icon sesuai visual baseline approved — proporsional & rapi #116834 */
const ICONS = {
  reportDoc: `
    <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="#116834" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  `
};

export function renderDispatchLanding() {
  const app = document.getElementById('app');
  if (!app) return;

  app.innerHTML = `
    <div class="page dispatch-landing-page" style="display: flex; flex-direction: column; height: 100%; background: #FAFAFA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; position: relative;">
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;">
        <div style="display: flex; align-items: center;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.15rem; font-weight: 700; color: #111111; margin: 0 0 0 8px; letter-spacing: -0.01em;">Pengeluaran Bibit</h1>
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
          <button id="btn-report-pengeluaran" class="beranda-menu-card" type="button" style="height: 120px; padding: 10px 4px 6px;">
            <div class="beranda-card-icon" style="width: 40px; height: 40px; margin-bottom: 6px;">
              ${ICONS.reportDoc}
            </div>
            <div class="beranda-card-title" style="font-size: 0.68rem; line-height: 1.18; min-height: 38px; display: flex; align-items: center; justify-content: center; text-align: center;">
              Laporan<br>Pengeluaran<br>Bibit
            </div>
          </button>
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
        renderDispatchLanding();
      }, 300);
    });
  }

  // Navigate to Laporan Pengeluaran Bibit (Empty State)
  app.querySelector('#btn-report-pengeluaran')?.addEventListener('click', () => {
    navigate('/dispatch/report');
  });
}
