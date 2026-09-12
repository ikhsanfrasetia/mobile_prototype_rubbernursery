/**
 * modules/dispatch/dispatch-report.js — Halaman Laporan Riwayat Pengeluaran Bibit.
 */

import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { formatDate, esc } from '../../core/utils.js';
import { resolveEstate } from '../../data/estate-master.js';

export function renderDispatchReport() {
  const app = document.getElementById('app');
  if (!app) return;

  const dispatches = storage.get('dispatch_transactions', []);

  let bodyContentHtml = '';

  if (dispatches.length === 0) {
    bodyContentHtml = `
      <main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 20px; text-align: center;">
        <div style="width: 80px; height: 80px; border-radius: 50%; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; color: #64748B;">
          <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
        </div>
        <h2 style="font-size: 1.05rem; font-weight: 700; color: #1E293B; margin: 0 0 8px 0; line-height: 1.3;">
          Tidak ditemukan dokumen pengeluaran
        </h2>
        <p style="font-size: 0.84rem; color: #64748B; margin: 0; line-height: 1.45; max-width: 260px;">
          Saat ini belum ada data transaksi dokumen pengeluaran bibit yang tercatat.
        </p>
      </main>
    `;
  } else {
    const listHtml = dispatches.map((dsp, idx) => {
      const sourceEst = resolveEstate(dsp.estateId);
      const targetEst = resolveEstate(dsp.targetEstateId);
      const batchListStr = (dsp.details || []).map(b => `${b.batchCode} (${(b.qty || 0).toLocaleString('id-ID')} Pkk)`).join(', ');

      return `
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,0.03);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <div>
              <div style="font-weight: 800; color: #116834; font-size: 0.86rem;">${esc(dsp.docNo || `DSP-${idx + 1}`)}</div>
              <div style="font-size: 0.72rem; color: #64748B;">Ref SPB: <strong>${esc(dsp.parentRequestDocNo || '-')}</strong></div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 800; color: #1E293B; font-size: 0.88rem;">${(dsp.issuedQty || 0).toLocaleString('id-ID')} Pkk</div>
              <div style="font-size: 0.70rem; color: #15803D; font-weight: 700;">${esc(dsp.clone || 'Bibit')}</div>
            </div>
          </div>
          <div style="font-size: 0.74rem; color: #475569; background: #F8FAFC; border-radius: 4px; padding: 6px 8px; margin-top: 6px;">
            <div>Tanggal: <strong>${esc(formatDate(dsp.issuedDate || dsp.createdAt))}</strong> | Mantri: <strong>${esc(dsp.issuedByName || 'Mantri')}</strong></div>
            <div style="margin-top: 2px;">Tujuan: <strong>${esc(targetEst ? targetEst.estate_name : (dsp.targetEstateId || '-'))}</strong></div>
            <div style="margin-top: 2px; color: #64748B;">Detail Batch: ${esc(batchListStr || '-')}</div>
          </div>
        </div>
      `;
    }).join('');

    bodyContentHtml = `
      <main style="flex: 1; overflow-y: auto; padding: 12px 14px;">
        <div style="font-size: 0.76rem; color: #64748B; font-weight: 700; margin-bottom: 8px; text-transform: uppercase;">
          Total ${dispatches.length} Transaksi Pengeluaran Tercatat
        </div>
        ${listHtml}
      </main>
    `;
  }

  app.innerHTML = `
    <div class="page dispatch-report-page" style="display: flex; flex-direction: column; height: 100%; background: #FAFAFA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; position: relative;">
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 52px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;">
        <div style="display: flex; align-items: center;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 700; color: #111111; margin: 0 0 0 8px; letter-spacing: -0.01em;">Laporan Pengeluaran Bibit</h1>
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

      ${bodyContentHtml}
    </div>
  `;

  // Back button to Pengeluaran Landing
  app.querySelector('#btn-back')?.addEventListener('click', () => {
    navigate('/dispatch');
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
        renderDispatchReport();
      }, 300);
    });
  }
}
