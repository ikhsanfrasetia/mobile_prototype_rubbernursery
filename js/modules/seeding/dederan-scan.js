/**
 * modules/seeding/dederan-scan.js — Fitur Scan QR Code / Pilih Bedengan Manual untuk Dederan.
 *
 * Rules:
 * - Master Bedengan status ACTIVE, scoped by Estate/Division/Program.
 * - UNIQUE BEDENGAN RULE: Satu bedengan yang sudah digunakan pada Dokumen Induk Deder yang sama
 *   TIDAK BOLEH digunakan kembali pada transaksi Dederan berikutnya dalam dokumen induk tersebut.
 * - Non-GPS: Lokasi divalidasi via QR Code valid atau pilihan manual dari Master Bedengan valid.
 */

import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { toast } from '../../components/toast.js';
import { getActiveBedengan, getBedenganById, getBedenganByCode, getBedenganByQR, BEDENGAN_STATUS } from '../../data/bedengan-master.js';
import { isProgramOpen } from '../../data/program-master.js';
import { getCurrentUserContext } from '../../core/user-context.js';
import { getDederanIndukById, getDederanTransactionsByParent } from './dederan-manager.js';

export function renderDederanScan() {
  const app = document.getElementById('app');

  const parentDocNo = storage.get('active_dederan_parent_doc', null);
  const parent = getDederanIndukById(parentDocNo);

  if (!parent) {
    toast('Dokumen Induk Deder tidak ditemukan.', 'error');
    navigate('/seeding');
    return;
  }

  const userCtx = getCurrentUserContext();
  const effectiveEstateId = parent.estateId || userCtx?.estateId || 'EST-TBS';
  const effectiveDivisionId = parent.divisionId || userCtx?.divisionId || (effectiveEstateId === 'EST-APM' ? 'DIV-APM-02' : 'DIV-001');
  const effectiveProgramId = parent.programId || null;

  // Existing child transactions under this parent
  const existingChildTxs = getDederanTransactionsByParent(parent.docNo);
  const usedBedenganIds = new Set(existingChildTxs.map(t => String(t.bedenganId || t.bedenganCode || '').trim().toUpperCase()));

  const scopedBeds = getActiveBedengan({
    estateId: effectiveEstateId,
    divisionId: effectiveDivisionId,
    programId: effectiveProgramId || undefined
  });
  const bedListSource = (scopedBeds.length > 0 ? scopedBeds : getActiveBedengan({ estateId: effectiveEstateId }))
    .filter(b => b.status === BEDENGAN_STATUS.ACTIVE);

  // Filter out bedengans already used in this Dokumen Induk
  const availableBeds = bedListSource.filter(b => 
    !usedBedenganIds.has(String(b.bedenganId).trim().toUpperCase()) &&
    !usedBedenganIds.has(String(b.bedenganCode).trim().toUpperCase()) &&
    !usedBedenganIds.has(String(b.name).trim().toUpperCase())
  );

  const bedenganList = availableBeds.map(b => ({
    id: b.bedenganId,
    name: b.name,
    code: b.bedenganCode,
    qrPayload: b.qrCode,
    capacity: `${Number(b.capacity || 1000).toLocaleString('id-ID')} Benih`,
    status: 'Tersedia'
  }));

  app.innerHTML = `
    <div class="page dederan-scan-page" style="display: flex; flex-direction: column; height: 100%; background: #0F172A; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; position: relative; overflow: hidden;">
      
      <!-- TOP NAVIGATION BAR -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); border-bottom: 1px solid rgba(255,255,255,0.1); z-index: 10; flex-shrink: 0;">
        <button id="btn-scan-back" type="button" aria-label="Batal Scan" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #FFFFFF;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <div style="text-align: center; flex: 1; padding: 0 8px;">
          <h1 style="font-size: 1rem; font-weight: 700; margin: 0; color: #FFFFFF; letter-spacing: -0.01em;">Identifikasi QR Bedengan Dederan</h1>
          <div style="font-size: 0.68rem; color: #94A3B8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${parent.docNo} (${parent.sourceReceiptDocNo})</div>
        </div>
        <button id="btn-toggle-flash" type="button" aria-label="Flashlight" style="padding: 8px; margin-right: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #FBBF24;">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        </button>
      </header>

      <!-- VIEWFINDER CAMERA AREA -->
      <main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 16px 16px 20px; position: relative; z-index: 5;">
        
        <!-- INFO DOKUMEN INDUK DEDER -->
        <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 8px 14px; width: 100%; max-width: 330px; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; backdrop-filter: blur(4px);">
          <div>
            <div style="font-size: 0.66rem; color: #94A3B8;">Sisa Belum Dideder:</div>
            <div style="font-size: 0.88rem; font-weight: 800; color: #4ADE80;">${parent.sisaBelumDeder.toLocaleString('id-ID')} Butir</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.66rem; color: #94A3B8;">Klon Batang Bawah:</div>
            <div style="font-size: 0.76rem; font-weight: 700; color: #F8FAFC;">${parent.klon || 'GT 1'}</div>
          </div>
        </div>

        <!-- CAMERA FRAME / RETICLE -->
        <div style="position: relative; width: 220px; height: 220px; margin: auto 0; display: flex; align-items: center; justify-content: center;">
          <video id="scan-video-feed" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; border-radius: 16px; display: none;"></video>
          <div id="scan-mock-bg" style="position: absolute; inset: 0; background: radial-gradient(circle, rgba(17,104,52,0.2) 0%, rgba(15,23,42,0.8) 100%); border-radius: 16px;"></div>

          <!-- Targeting Frame Corners -->
          <div style="position: absolute; top: 0; left: 0; width: 32px; height: 32px; border-top: 4px solid #22C55E; border-left: 4px solid #22C55E; border-top-left-radius: 14px;"></div>
          <div style="position: absolute; top: 0; right: 0; width: 32px; height: 32px; border-top: 4px solid #22C55E; border-right: 4px solid #22C55E; border-top-right-radius: 14px;"></div>
          <div style="position: absolute; bottom: 0; left: 0; width: 32px; height: 32px; border-bottom: 4px solid #22C55E; border-left: 4px solid #22C55E; border-bottom-left-radius: 14px;"></div>
          <div style="position: absolute; bottom: 0; right: 0; width: 32px; height: 32px; border-bottom: 4px solid #22C55E; border-right: 4px solid #22C55E; border-bottom-right-radius: 14px;"></div>

          <div id="laser-line" style="position: absolute; left: 10px; right: 10px; height: 2px; background: linear-gradient(90deg, transparent, #22C55E, #4ADE80, #22C55E, transparent); box-shadow: 0 0 12px #22C55E; animation: scanLineAnim 2s infinite ease-in-out;"></div>
        </div>

        <p style="font-size: 0.76rem; color: #CBD5E1; text-align: center; margin: 0 0 8px; max-width: 280px; line-height: 1.4;">
          Arahkan kamera ke <strong>QR Code Bedengan Dederan</strong> atau gunakan tombol simulasi cepat.
        </p>

        <!-- STATUS SCAN AKTIF -->
        <div id="scan-status-pill" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 20px; padding: 4px 12px; margin-bottom: 10px;">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #22C55E; box-shadow: 0 0 6px #22C55E;"></span>
          <span style="font-size: 0.72rem; color: #86EFAC; font-weight: 600;">Pindai QR Bedengan...</span>
        </div>

        <!-- SIMULASI SCAN CEPAT (DEMO TOOLBOX) -->
        <div style="width: 100%; max-width: 330px; background: rgba(30, 41, 59, 0.85); border: 1px dashed rgba(34, 197, 94, 0.4); border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; box-sizing: border-box;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.70rem; font-weight: 700; color: #4ADE80; text-transform: uppercase;">
              ⚡ Simulasi Scan (Tersedia ${bedenganList.length}):
            </span>
            <button type="button" id="btn-mock-fail-scan" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); color: #FCA5A5; font-size: 0.65rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; cursor: pointer;">
              ⚠️ Uji Gagal Scan
            </button>
          </div>
          <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none;">
            ${bedenganList.slice(0, 6).map(b => `
              <button type="button" class="btn-mock-qr-scan" data-id="${b.id}" data-code="${b.code}" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: #F1F5F9; font-size: 0.72rem; font-weight: 600; padding: 5px 9px; border-radius: 6px; cursor: pointer; white-space: nowrap;">
                🏷️ ${b.name}
              </button>
            `).join('')}
            ${bedenganList.length === 0 ? '<span style="font-size: 0.72rem; color: #FCA5A5;">Seluruh bedengan sudah digunakan pada dokumen ini.</span>' : ''}
          </div>
        </div>

        <!-- KOTAK PILIH MANUAL -->
        <button id="btn-pilih-manual" type="button" style="width: 100%; max-width: 330px; height: 40px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.25); color: #FFFFFF; border-radius: 6px; font-weight: 700; font-size: 0.82rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <span>📋 Pilih Bedengan Manual (Master Bedengan)</span>
        </button>

      </main>

      <!-- BOTTOM SHEET: PILIH BEDENGAN MANUAL -->
      <div id="overlay-manual-sheet" style="display: none; position: absolute; inset: 0; background: rgba(0,0,0,0.65); z-index: 50; backdrop-filter: blur(2px);"></div>
      
      <div id="sheet-manual-bedengan" style="display: none; position: absolute; left: 0; right: 0; bottom: 0; background: #FFFFFF; color: #111827; border-radius: 18px 18px 0 0; padding: 20px 16px 24px; z-index: 51; flex-direction: column; max-height: 75vh; box-shadow: 0 -8px 24px rgba(0,0,0,0.3);">
        <div style="width: 36px; height: 4px; background: #E2E8F0; border-radius: 2px; margin: 0 auto 14px;"></div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <h2 style="font-size: 0.98rem; font-weight: 800; color: #111827; margin: 0 0 2px;">Pilih Bedengan Dederan</h2>
            <p style="font-size: 0.72rem; color: #64748B; margin: 0;">Menampilkan bedengan aktif yang belum digunakan pada dokumen induk ini.</p>
          </div>
          <button id="btn-close-manual-sheet" type="button" style="background: #F1F5F9; border: none; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #475569;">✕</button>
        </div>

        <div style="overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-bottom: 10px;">
          ${bedenganList.map((b) => `
            <div class="card-pick-manual-bedengan" data-id="${b.id}" data-code="${b.code}" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
              <div>
                <div style="font-weight: 800; font-size: 0.88rem; color: #1E293B;">${b.name}</div>
                <div style="font-size: 0.70rem; color: #64748B; margin-top: 2px;">Kapasitas: ${b.capacity} • Kode: ${b.code}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; background: #DCFCE7; color: #15803D;">Tersedia</span>
                <span style="font-size: 0.82rem; color: #116834; font-weight: 700;">Pilih →</span>
              </div>
            </div>
          `).join('')}
          ${bedenganList.length === 0 ? '<div style="text-align: center; color: #94A3B8; font-size: 0.82rem; padding: 20px 0;">Tidak ada bedengan aktif yang tersedia.</div>' : ''}
        </div>
      </div>

    </div>

    <style>
      @keyframes scanLineAnim {
        0% { top: 12px; opacity: 0.8; }
        50% { top: 190px; opacity: 1; }
        100% { top: 12px; opacity: 0.8; }
      }
    </style>
  `;

  // Process selected Bedengan with Unique Bedengan validation
  const proceedWithBedengan = (bedIdOrCode) => {
    const bedObj = getBedenganById(bedIdOrCode) ||
      getBedenganByCode(bedIdOrCode) ||
      getBedenganByQR(bedIdOrCode) ||
      bedListSource.find(b => b.name === bedIdOrCode || b.bedenganCode === bedIdOrCode || b.bedenganId === bedIdOrCode);

    if (!bedObj) {
      toast('Bedengan tidak ditemukan dalam master data.', 'error');
      return;
    }

    if (bedObj.status === BEDENGAN_STATUS.INACTIVE) {
      toast(`Bedengan '${bedObj.name || bedObj.bedenganCode}' tidak aktif.`, 'error');
      return;
    }

    // UNIQUE BEDENGAN VALIDATION
    const bedIdClean = String(bedObj.bedenganId).trim().toUpperCase();
    const bedCodeClean = String(bedObj.bedenganCode || bedObj.name).trim().toUpperCase();

    if (usedBedenganIds.has(bedIdClean) || usedBedenganIds.has(bedCodeClean)) {
      toast(`Bedengan '${bedObj.name || bedObj.bedenganCode}' sudah digunakan pada Dokumen Induk Deder ini. Pilih bedengan lain.`, 'error');
      return;
    }

    // Store temporary selection
    storage.set('scanned_dederan_bedengan_id', bedObj.bedenganId);
    storage.set('scanned_dederan_bedengan_code', bedObj.bedenganCode || bedObj.name);
    storage.set('scanned_dederan_bedengan_name', bedObj.name || bedObj.bedenganCode);

    toast(`Identifikasi: ${bedObj.name} (${bedObj.bedenganCode})`, 'info');

    setTimeout(() => {
      navigate('/seeding/dederan/form');
    }, 200);
  };

  app.querySelector('#btn-scan-back')?.addEventListener('click', () => {
    navigate('/seeding');
  });

  // Mock scan buttons
  app.querySelectorAll('.btn-mock-qr-scan').forEach(btn => {
    btn.addEventListener('click', () => {
      proceedWithBedengan(btn.dataset.id || btn.dataset.code);
    });
  });

  // Manual sheet handlers
  const overlay = app.querySelector('#overlay-manual-sheet');
  const sheet = app.querySelector('#sheet-manual-bedengan');
  const openSheet = () => { overlay.style.display = 'block'; sheet.style.display = 'flex'; };
  const closeSheet = () => { overlay.style.display = 'none'; sheet.style.display = 'none'; };

  app.querySelector('#btn-pilih-manual')?.addEventListener('click', openSheet);
  app.querySelector('#btn-mock-fail-scan')?.addEventListener('click', () => {
    toast('QR Code gagal dipindai. Silakan pilih dari Master Bedengan manual.', 'error');
    openSheet();
  });
  overlay?.addEventListener('click', closeSheet);
  app.querySelector('#btn-close-manual-sheet')?.addEventListener('click', closeSheet);

  app.querySelectorAll('.card-pick-manual-bedengan').forEach(card => {
    card.addEventListener('click', () => {
      closeSheet();
      proceedWithBedengan(card.dataset.id || card.dataset.code);
    });
  });
}
