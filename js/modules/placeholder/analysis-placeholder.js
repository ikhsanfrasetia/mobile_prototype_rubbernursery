/**
 * modules/placeholder/analysis-placeholder.js
 * Halaman sementara untuk modul yang sedang dalam tahap analisis dan belum dapat diakses.
 */

import { navigate } from '../../core/router.js';

const ROUTE_TITLE_MAP = {
  '/budding': { title: 'Okulasi', desc: 'Pencatatan dan monitoring kegiatan okulasi bibit nursery.' },
  '/inspection': { title: 'Pemeriksaan', desc: 'Pemeriksaan standar mutu dan kesehatan bibitan.' },
  '/selection': { title: 'Penyeleksian', desc: 'Penyeleksian dan afkir bibit sesuai kriteria operasional.' },
  '/material': { title: 'Material & Bahan', desc: 'Pencatatan dan pemakaian material serta bahan pembibitan.' },
  '/nursery-activity': { title: 'Rekam Pemeliharaan', desc: 'Pencatatan berkala kegiatan pemeliharaan tanaman di nursery.' },
  '/request': { title: 'Permintaan', desc: 'Pengajuan dan monitoring permintaan bibit & kebutuhan nursery.' },
  '/entres': { title: 'Kebun Entres', desc: 'Pengelolaan dan monitoring kebun mata entres.' }
};

export function renderAnalysisPlaceholder(context = {}) {
  const app = document.getElementById('app');
  if (!app) return;

  // Deteksi rute saat ini dari hash atau context
  const hash = (location.hash || '').replace(/^#/, '').split('?')[0] || '';
  const meta = ROUTE_TITLE_MAP[hash] || {
    title: context.title || 'Modul Sedang Dianalisis',
    desc: 'Modul ini sedang dalam proses analisis dan perancangan sistem.'
  };

  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #F8FAF9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="placeholder-btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 6px;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="#116834" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.1rem; font-weight: 700; color: #111827; margin: 0;">${meta.title}</h1>
        </div>
      </header>

      <!-- CONTENT BODY -->
      <main style="flex: 1; overflow-y: auto; padding: 24px 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
        
        <!-- ICON BADGE -->
        <div style="width: 88px; height: 88px; background: #E8F3EC; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(17, 104, 52, 0.1);">
          <svg viewBox="0 0 24 24" width="44" height="44" stroke="#116834" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
          </svg>
        </div>

        <!-- STATUS PILL -->
        <div style="display: inline-flex; align-items: center; gap: 6px; background: #FEF3C7; color: #92400E; padding: 6px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; margin-bottom: 14px; border: 1px solid #FDE68A;">
          <span style="width: 8px; height: 8px; background: #D97706; border-radius: 50%; display: inline-block;"></span>
          Tahap Analisis
        </div>

        <!-- HEADLINE & DESCRIPTION -->
        <h2 style="font-size: 1.25rem; font-weight: 700; color: #111827; margin: 0 0 10px 0; line-height: 1.4;">
          Halaman Sedang Dalam Tahap Analisis
        </h2>
        <p style="font-size: 0.92rem; color: #4B5563; line-height: 1.55; margin: 0 0 24px 0; max-width: 320px;">
          Modul <strong>${meta.title}</strong> saat ini sedang dalam proses analisis dan perancangan alur kerja, sehingga belum dapat diakses.
        </p>

        <!-- INFO CARD -->
        <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 10px; padding: 16px; width: 100%; max-width: 340px; margin-bottom: 28px; text-align: left; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div style="font-size: 0.8rem; font-weight: 600; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
            Rencana Fitur
          </div>
          <div style="font-size: 0.88rem; color: #374151; line-height: 1.45;">
            ${meta.desc}
          </div>
        </div>

        <!-- BACK BUTTON -->
        <button id="placeholder-btn-home" type="button" style="width: 100%; max-width: 340px; height: 48px; background: #116834; color: #FFFFFF; border: none; border-radius: 8px; font-size: 0.95rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.2s; box-shadow: 0 2px 6px rgba(17, 104, 52, 0.25);">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          Kembali ke Beranda
        </button>

      </main>
    </div>
  `;

  // Event Listeners
  const btnBack = app.querySelector('#placeholder-btn-back');
  const btnHome = app.querySelector('#placeholder-btn-home');

  const goHome = () => navigate('/home');
  if (btnBack) btnBack.addEventListener('click', goHome);
  if (btnHome) btnHome.addEventListener('click', goHome);
}
