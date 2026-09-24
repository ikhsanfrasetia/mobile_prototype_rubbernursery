import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { formatStandardDocNo } from '../../core/utils.js';
import { toast } from '../../components/toast.js';
import {
  syncDederanIndukDocuments,
  getDederanIndukDocuments,
  getDederanTransactions,
  getBedenganInspectionSummary,
  deleteDederanInspection,
  DEDERAN_STORAGE_KEYS
} from '../seeding/dederan-manager.js';
import { renderEmptyStateCard } from '../../components/empty-state.js';

let activeInspectionModuleTab = 'DEDERAN'; // 'DEDERAN' | 'OKULASI'

export function renderInspectionLanding() {
  const app = document.getElementById('app');
  if (!app) return;

  // Load all budding transactions (both Grafting & Regrafting) and inspection transactions
  const buddingTxs = storage.get('budding_transactions', []);
  let rawInspectionTxs = storage.get('inspection_transactions', []);

  // Normalize legacy doc numbers to 2026/INS/xxx
  let hasMigration = false;
  const inspectionTxs = rawInspectionTxs.map((insp, i) => {
    let doc = insp.docNo || formatStandardDocNo(2026, 'INS', i + 1);
    if (doc.includes('/PRK/') || doc.includes('/INSP/')) {
      doc = doc.replace('/PRK/', '/INS/').replace('/INSP/', '/INS/');
      hasMigration = true;
    }
    return { ...insp, docNo: doc };
  });

  if (hasMigration) {
    storage.set('inspection_transactions', inspectionTxs);
  }

  // Group or map budding transactions with cumulative inspection stats (Strict per Dokumen Okulasi)
  const items = buddingTxs.map((btx, idx) => {
    const populasiDiokulasi = parseInt(btx.jumlah || 0);
    const isRegrafting = btx.type === 'REGRAFTING';
    const relatedInspections = inspectionTxs.filter(insp => insp.buddingDocNo === btx.docNo);
    
    let totalDiperiksa = 0;
    let totalJadi = 0;
    let totalGagal = 0;
    let totalRegrafting = 0;
    let totalSelection = 0;

    relatedInspections.forEach(insp => {
      const dip = parseInt(insp.totalDiperiksa || (parseInt(insp.jumlahJadi || 0) + parseInt(insp.jumlahGagal || 0)));
      const jadi = parseInt(insp.jumlahJadi || 0);
      const gagal = parseInt(insp.jumlahGagal || 0);

      let regraft = 0;
      let seleksi = 0;
      if (insp.totalToRegrafting !== undefined) {
        regraft = parseInt(insp.totalToRegrafting || 0);
        seleksi = insp.totalToSelection !== undefined ? parseInt(insp.totalToSelection || 0) : Math.max(0, gagal - regraft);
      } else {
        regraft = gagal;
        seleksi = 0;
      }

      totalDiperiksa += dip;
      totalJadi += jadi;
      totalGagal += gagal;
      totalRegrafting += regraft;
      totalSelection += seleksi;
    });

    const sisaBelumDiperiksa = Math.max(0, populasiDiokulasi - totalDiperiksa);
    
    // Perhitungan persentase progres pemeriksaan (Total Diperiksa / Populasi Diokulasi)
    const progressPercent = populasiDiokulasi > 0 ? (totalDiperiksa / populasiDiokulasi) * 100 : 0;
    let progressDiperiksaDisplay = '0%';
    if (progressPercent >= 100) {
      progressDiperiksaDisplay = '100%';
    } else if (progressPercent % 1 === 0) {
      progressDiperiksaDisplay = `${progressPercent}%`;
    } else {
      progressDiperiksaDisplay = `${progressPercent.toFixed(1)}%`;
    }

    // Perhitungan persentase keberhasilan (% Jadi) untuk rincian detail transaksi
    let persenJadiDisplay = '0%';
    let rawPercent = 0;
    if (totalDiperiksa > 0) {
      rawPercent = (totalJadi / totalDiperiksa) * 100;
      if (totalGagal === 0 && totalJadi === totalDiperiksa) {
        persenJadiDisplay = '100%';
      } else if (rawPercent % 1 === 0) {
        persenJadiDisplay = `${rawPercent}%`;
      } else {
        persenJadiDisplay = `${rawPercent.toFixed(1)}%`;
      }
    }

    let statusText = 'Perlu Pemeriksaan';
    let statusBg = '#E53935';
    let statusColor = '#FFFFFF';
    let statusBorder = 'none';

    if (totalDiperiksa === 0) {
      statusText = 'Perlu Pemeriksaan';
      statusBg = '#E53935';
      statusColor = '#FFFFFF';
    } else if (sisaBelumDiperiksa <= 0) {
      statusText = `Selesai (${progressDiperiksaDisplay})`;
      statusBg = '#E8F5E9';
      statusColor = '#116834';
      statusBorder = '1px solid #116834';
    } else {
      statusText = `Sisa ${sisaBelumDiperiksa} Pkk`;
      statusBg = '#FFF8E1';
      statusColor = '#F57F17';
      statusBorder = '1px solid #FFE082';
    }

    return {
      ...btx,
      originalIndex: idx,
      isRegrafting,
      typeLabel: isRegrafting ? 'Okulasi Janda (Regrafting)' : 'Okulasi (Grafting)',
      typeBadgeBg: isRegrafting ? '#FFFBEB' : '#F0FDF4',
      typeBadgeColor: isRegrafting ? '#B45309' : '#116834',
      typeBadgeBorder: isRegrafting ? '1px solid #FDE68A' : '1px solid #BBF7D0',
      populasiDiokulasi,
      totalDiperiksa,
      totalJadi,
      totalGagal,
      totalRegrafting,
      totalSelection,
      sisaBelumDiperiksa,
      persenJadiDisplay,
      statusText,
      statusBg,
      statusColor,
      statusBorder,
      relatedInspections,
      inspectionsCount: relatedInspections.length
    };
  });

  // Urutkan: Dokumen yang memiliki label "Perlu Pemeriksaan" / belum selesai berada di posisi PALING ATAS
  items.sort((a, b) => {
    const aNeed = a.sisaBelumDiperiksa > 0;
    const bNeed = b.sisaBelumDiperiksa > 0;
    if (aNeed !== bNeed) {
      return aNeed ? -1 : 1;
    }
    const aPerlu = a.statusText === 'Perlu Pemeriksaan';
    const bPerlu = b.statusText === 'Perlu Pemeriksaan';
    if (aPerlu !== bPerlu) {
      return aPerlu ? -1 : 1;
    }
    return 0;
  });

  const graftingCount = items.filter(i => !i.isRegrafting).length;
  const regraftingCount = items.filter(i => i.isRegrafting).length;

  // Dederan Inspections data
  syncDederanIndukDocuments();
  const dederIndukDocs = getDederanIndukDocuments();
  const dederTxs = getDederanTransactions();
  const dederInspections = storage.get(DEDERAN_STORAGE_KEYS.INSPECTIONS, []);

  // Calculate pending Dederan inspection count
  let pendingDederInspCount = 0;
  dederTxs.forEach(dtx => {
    const parent = dederIndukDocs.find(d => d.docNo === dtx.parentDederIndukDocNo || d.id === dtx.parentDederIndukId);
    if (parent && parent.sisaBelumDeder === 0) {
      const summary = getBedenganInspectionSummary(dtx);
      if (!summary.isComplete && summary.sisaBelumDiperiksa > 0) {
        pendingDederInspCount++;
      }
    }
  });

  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #F5F5F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; position: relative;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #D9D9D9; flex-shrink: 0;">
        <div style="display: flex; align-items: center;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 700; color: #111111; margin: 0 0 0 6px; letter-spacing: -0.01em;">Pemeriksaan</h1>
        </div>
      </header>

      <!-- TAB SELEKTOR MODUL: PEMERIKSAAN DEDERAN vs OKULASI -->
      <div style="display: flex; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 0 16px; gap: 16px; flex-shrink: 0;">
        <button id="tab-insp-dederan" type="button" style="padding: 12px 4px; font-size: 0.82rem; font-weight: ${activeInspectionModuleTab === 'DEDERAN' ? '700' : '600'}; color: ${activeInspectionModuleTab === 'DEDERAN' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeInspectionModuleTab === 'DEDERAN' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <span>Pemeriksaan Dederan</span>
          ${pendingDederInspCount > 0 ? `<span style="background: #116834; color: #FFFFFF; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${pendingDederInspCount}</span>` : ''}
        </button>
        <button id="tab-insp-okulasi" type="button" style="padding: 12px 4px; font-size: 0.82rem; font-weight: ${activeInspectionModuleTab === 'OKULASI' ? '700' : '600'}; color: ${activeInspectionModuleTab === 'OKULASI' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeInspectionModuleTab === 'OKULASI' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <span>Pemeriksaan Okulasi</span>
          ${items.length > 0 ? `<span style="background: #64748B; color: #FFFFFF; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${items.length}</span>` : ''}
        </button>
      </div>

      <!-- MAIN CONTENT -->
      <main style="flex: 1; overflow-y: auto; padding: 16px;">
        ${activeInspectionModuleTab === 'DEDERAN'
          ? renderDederanInspectionSection(dederTxs, dederInspections, dederIndukDocs)
          : renderOkulasiInspectionSection(items, graftingCount, regraftingCount, inspectionTxs)}

        <!-- MODAL DIALOG KONFIRMASI HAPUS -->
        <div id="modal-delete-insp-overlay" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.45); z-index: 1000; backdrop-filter: blur(2px);"></div>
        
        <div id="dialog-delete-insp" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 88%; max-width: 320px; background: #FFFFFF; border-radius: 12px; padding: 20px 18px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 1001; text-align: center; box-sizing: border-box;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: #FEE2E2; color: #DC2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </div>
          <h3 style="font-size: 1.02rem; font-weight: 800; color: #111111; margin: 0 0 6px 0;">Hapus Transaksi?</h3>
          <p id="dialog-delete-insp-msg" style="font-size: 0.78rem; color: #666666; margin: 0 0 18px 0; line-height: 1.45;">
            Apakah Anda yakin ingin menghapus data pemeriksaan ini? Data yang terhubung ke Okulasi Janda & Seleksi juga akan dibersihkan.
          </p>
          <div style="display: flex; gap: 8px;">
            <button id="btn-cancel-delete-insp" type="button" style="flex: 1; height: 38px; background: #F3F4F6; color: #374151; border: none; border-radius: 8px; font-size: 0.82rem; font-weight: 700; cursor: pointer;">
              Batal
            </button>
            <button id="btn-confirm-delete-insp" type="button" style="flex: 1; height: 38px; background: #DC2626; color: #FFFFFF; border: none; border-radius: 8px; font-size: 0.82rem; font-weight: 700; cursor: pointer;">
              Ya, Hapus
            </button>
          </div>
        </div>

        <!-- MODAL DIALOG JIKA BATCH TELAH 100% SELESAI DIPERIKSA -->
        <div id="modal-completed-overlay" style="display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.45); z-index: 1000; backdrop-filter: blur(2px);"></div>
        
        <div id="dialog-batch-completed" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 88%; max-width: 320px; background: #FFFFFF; border-radius: 12px; padding: 20px 18px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 1001; text-align: center; box-sizing: border-box;">
          <div style="width: 48px; height: 48px; border-radius: 50%; background: #E8F5E9; color: #116834; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
            <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h3 style="font-size: 1.02rem; font-weight: 800; color: #111111; margin: 0 0 6px 0;">Pemeriksaan Selesai</h3>
          <p id="dialog-completed-desc" style="font-size: 0.78rem; color: #666666; margin: 0 0 18px 0; line-height: 1.45;">
            Seluruh populasi pada batch ini telah selesai diperiksa 100%. Tidak ada pemeriksaan yang perlu dilakukan lagi.
          </p>
          <button id="btn-close-completed-dialog" type="button" style="width: 100%; height: 42px; background: #116834; color: #FFFFFF; border: none; border-radius: 8px; font-size: 0.86rem; font-weight: 700; cursor: pointer; box-shadow: 0 2px 4px rgba(17,104,52,0.2);">
            Tutup Pesan
          </button>
        </div>

      </main>
    </div>
  `;

  // Event Listener: Back button
  app.querySelector('#btn-back')?.addEventListener('click', () => {
    navigate('/home');
  });

  // Event Listener: Module Tabs (Dederan vs Okulasi)
  app.querySelector('#tab-insp-dederan')?.addEventListener('click', () => {
    activeInspectionModuleTab = 'DEDERAN';
    renderInspectionLanding();
  });

  app.querySelector('#tab-insp-okulasi')?.addEventListener('click', () => {
    activeInspectionModuleTab = 'OKULASI';
    renderInspectionLanding();
  });

  // Attach tab-specific events
  if (activeInspectionModuleTab === 'DEDERAN') {
    attachDederanInspectionEvents(app);
  } else {
    attachOkulasiInspectionEvents(app, items, inspectionTxs);
  }
}

/**
 * Render Section Pemeriksaan Dederan
 */
function renderDederanInspectionSection(dederTxs, dederInspections, dederIndukDocs) {
  if (dederTxs.length === 0) {
    return renderEmptyStateCard({
      title: 'Belum Ada Transaksi Dederan',
      description: 'Lakukan transaksi Dederan di modul <strong>Penyemaian</strong> terlebih dahulu.',
      customStyle: 'margin-top: 16px; margin-bottom: 20px;'
    });
  }

  return `
    <div style="margin-bottom: 12px;">
      <h2 style="font-size: 0.92rem; font-weight: 700; color: #111111; margin: 0 0 10px 0;">Daftar Bedengan Dederan Siap Periksa (${dederTxs.length})</h2>
    </div>

    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
      ${dederTxs.map((dtx) => {
        const summary = getBedenganInspectionSummary(dtx);

        let statusText = 'Siap Diperiksa';
        let statusBg = '#E53935';
        let statusColor = '#FFFFFF';
        let statusBorder = 'none';

        if (summary.isComplete) {
          statusText = '✓ Selesai (100%)';
          statusBg = '#E8F5E9';
          statusColor = '#116834';
          statusBorder = '1px solid #116834';
        } else if (summary.totalDiperiksa > 0) {
          statusText = `Sisa ${summary.sisaBelumDiperiksa} Butir`;
          statusBg = '#FFF8E1';
          statusColor = '#F57F17';
          statusBorder = '1px solid #FFE082';
        }

        return `
          <div class="card-deder-insp-wrapper" style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); box-sizing: border-box;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; gap: 8px;">
              <div style="font-size: 0.95rem; font-weight: 800; color: #116834; letter-spacing: -0.01em;">
                ${dtx.bedenganCode || 'Bedengan'}
              </div>
              <span style="background: ${statusBg}; color: ${statusColor}; font-size: 0.68rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; white-space: nowrap; border: ${statusBorder};">
                ${statusText}
              </span>
            </div>

            <div style="font-size: 0.78rem; font-weight: 700; color: #111827; margin-bottom: 2px;">
              ${dtx.docNo}
            </div>
            <div style="font-size: 0.72rem; color: #888888; margin-bottom: 10px;">
              Induk: ${dtx.parentDederIndukDocNo || '-'} • Klon: ${dtx.klon || 'GT 1'} • Tgl: ${dtx.tanggalDeder || '-'}
            </div>

            <hr style="border: none; border-top: 1px solid #F3F4F6; margin: 0 0 10px 0;" />

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; text-align: center; margin-bottom: 10px;">
              <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 6px 2px;">
                <div style="font-size: 0.65rem; color: #6B7280;">Populasi Deder</div>
                <div style="font-size: 0.82rem; font-weight: 800; color: #111827; margin-top: 1px;">${(dtx.jumlahDeder || 0).toLocaleString('id-ID')}</div>
              </div>
              <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 6px 2px;">
                <div style="font-size: 0.65rem; color: #116834;">Berhasil</div>
                <div style="font-size: 0.82rem; font-weight: 800; color: #116834; margin-top: 1px;">${(summary.totalBerhasil || 0).toLocaleString('id-ID')}</div>
              </div>
              <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 6px 2px;">
                <div style="font-size: 0.65rem; color: ${summary.sisaBelumDiperiksa > 0 ? '#D97706' : '#116834'};">Sisa Periksa</div>
                <div style="font-size: 0.82rem; font-weight: 800; color: ${summary.sisaBelumDiperiksa > 0 ? '#D97706' : '#116834'}; margin-top: 1px;">${(summary.sisaBelumDiperiksa || 0).toLocaleString('id-ID')}</div>
              </div>
            </div>

            ${!summary.isComplete ? `
              <button type="button" class="btn-rekam-pemeriksaan-deder" data-id="${dtx.id || dtx.docNo}" style="width: 100%; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 1px 2px rgba(17,104,52,0.2);">
                Rekam Pemeriksaan Dederan
              </button>
            ` : `
              <div style="text-align: center; font-size: 0.74rem; font-weight: 700; color: #116834; padding: 6px 0;">
                ✓ Pemeriksaan Bedengan Selesai 100%
              </div>
            `}
          </div>
        `;
      }).join('')}
    </div>

    <!-- HISTORI PEMERIKSAAN DEDERAN -->
    ${dederInspections.length > 0 ? `
      <div style="margin: 20px 0 10px 0;">
        <h2 style="font-size: 0.92rem; font-weight: 700; color: #111111; margin: 0 0 10px 0;">Ringkasan Data Pemeriksaan Dederan (${dederInspections.length})</h2>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${dederInspections.map((insp, idx) => `
            <div class="card-deder-insp-summary-wrapper" style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; font-size: 0.78rem; box-shadow: 0 1px 2px rgba(0,0,0,0.03); position: relative;">
              
              <!-- BARIS 1: JUDUL DOKUMEN & TANGGAL & 3-DOTS ACTION -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <strong style="color: #116834; font-size: 0.90rem; font-weight: 800;">${insp.docNo}</strong>
                  <span style="color: #6B7280; font-size: 0.70rem;">${insp.tanggalPemeriksaan || '-'}</span>
                </div>

                <!-- TOMBOL AKSI 3-DOTS -->
                <div style="position: relative;">
                  <button type="button" class="btn-deder-insp-action-trigger" data-index="${idx}" aria-label="Menu Aksi" style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #4B5563; padding: 0;">
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="1.2" fill="currentColor"></circle>
                      <circle cx="19" cy="12" r="1.2" fill="currentColor"></circle>
                      <circle cx="5" cy="12" r="1.2" fill="currentColor"></circle>
                    </svg>
                  </button>

                  <!-- POPUP MENU -->
                  <div class="deder-insp-action-menu" style="display: none; position: absolute; right: 0; top: 32px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.14); z-index: 100; min-width: 130px; overflow: hidden;">
                    <button type="button" class="menu-action-edit-deder-insp" data-doc="${insp.docNo}" data-tx="${insp.dederanTxDocNo || insp.dederanTxId}" style="width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; font-size: 0.75rem; font-weight: 600; color: #116834; display: flex; align-items: center; gap: 8px; cursor: pointer; border-bottom: 1px solid #F3F4F6;">
                      <svg viewBox="0 0 24 24" width="13" height="13" stroke="#116834" stroke-width="2.2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      <span>Edit</span>
                    </button>
                    <button type="button" class="menu-action-delete-deder-insp" data-doc="${insp.docNo}" style="width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; font-size: 0.75rem; font-weight: 600; color: #DC2626; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                      <svg viewBox="0 0 24 24" width="13" height="13" stroke="#DC2626" stroke-width="2.2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- BARIS 2: BEDENGAN & SUMBER DEDER -->
              <div style="color: #4B5563; font-size: 0.72rem; margin-bottom: 8px;">
                Bedengan: <strong style="color: #0F172A;">${insp.bedenganCode}</strong> • Sumber Deder: <strong>${insp.dederanTxDocNo}</strong>
              </div>

              <!-- BARIS 3: STATISTIK 3-KOLOM -->
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 8px; font-size: 0.72rem; text-align: center;">
                <div>
                  <span style="color: #64748B; font-size: 0.65rem;">Diperiksa:</span>
                  <div style="font-weight: 800; color: #0F172A; margin-top: 1px;">${(insp.jumlahDiperiksa || 0).toLocaleString('id-ID')}</div>
                </div>
                <div>
                  <span style="color: #116834; font-size: 0.65rem;">Berhasil:</span>
                  <div style="font-weight: 800; color: #116834; margin-top: 1px;">${(insp.jumlahBerhasil || 0).toLocaleString('id-ID')}</div>
                </div>
                <div>
                  <span style="color: #DC2626; font-size: 0.65rem;">Tidak Berhasil:</span>
                  <div style="font-weight: 800; color: #DC2626; margin-top: 1px;">${(insp.jumlahTidakBerhasil || 0).toLocaleString('id-ID')}</div>
                </div>
              </div>

            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

/**
 * Render Section Pemeriksaan Okulasi (Existing)
 */
function renderOkulasiInspectionSection(items, graftingCount, regraftingCount, inspectionTxs) {
  return `
    <div style="margin-bottom: 12px;">
      <h2 style="font-size: 0.92rem; font-weight: 700; color: #111111; margin: 0 0 10px 0;">Daftar Hasil Okulasi Siap Periksa</h2>

      <!-- TAB FILTER KLASIFIKASI SUMBER DOKUMEN -->
      <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px;">
        <button type="button" class="btn-filter-insp-tab" data-filter="ALL" style="padding: 6px 12px; font-size: 0.72rem; font-weight: 700; border-radius: 20px; border: 1px solid #116834; background: #116834; color: #FFFFFF; cursor: pointer; white-space: nowrap; box-sizing: border-box;">
          Semua (${items.length})
        </button>
        <button type="button" class="btn-filter-insp-tab" data-filter="GRAFTING" style="padding: 6px 12px; font-size: 0.72rem; font-weight: 700; border-radius: 20px; border: 1px solid #D1D5DB; background: #FFFFFF; color: #374151; cursor: pointer; white-space: nowrap; box-sizing: border-box;">
          Okulasi (${graftingCount})
        </button>
        <button type="button" class="btn-filter-insp-tab" data-filter="REGRAFTING" style="padding: 6px 12px; font-size: 0.72rem; font-weight: 700; border-radius: 20px; border: 1px solid #FDE68A; background: #FFFBEB; color: #B45309; cursor: pointer; white-space: nowrap; box-sizing: border-box;">
          Okulasi Janda (${regraftingCount})
        </button>
      </div>
    </div>

    <!-- EMPTY STATE CONTAINER UNTUK DAFTAR OKULASI SIAP PERIKSA -->
    ${renderEmptyStateCard({
      id: 'insp-empty-state',
      title: 'Belum Ada Data Okulasi',
      description: items.length === 0 ? 'Lakukan proses <strong>Okulasi (Grafting)</strong> terlebih dahulu agar data batch otomatis masuk ke tahap Pemeriksaan.' : 'Tidak ditemukan dokumen okulasi untuk diperiksa',
      customStyle: `display: ${items.length === 0 ? 'block' : 'none'}; margin-top: 16px; margin-bottom: 20px;`
    })}

    ${items.length > 0 ? `
      <div id="insp-cards-container" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
        ${items.map((item, idx) => {
          const workers = item.workers || [];
          return `
            <div class="card-inspection-wrapper" data-type="${item.isRegrafting ? 'REGRAFTING' : 'GRAFTING'}" style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); box-sizing: border-box;">
              
              <!-- HEADER BARIS 1: NOMOR BATCH & STATUS BADGE -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; gap: 8px;">
                <div style="font-size: 0.95rem; font-weight: 800; color: #116834; white-space: nowrap; letter-spacing: -0.01em;">
                  ${item.batchNo || 'Batch-01'}
                </div>
                <span style="background: ${item.statusBg}; color: ${item.statusColor}; font-size: 0.68rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; white-space: nowrap; border: ${item.statusBorder}; flex-shrink: 0;">
                  ${item.statusText}
                </span>
              </div>

              <!-- HEADER BARIS 2: BADGE SUMBER & DOKUMEN -->
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; gap: 6px; flex-wrap: wrap;">
                <span style="background: ${item.typeBadgeBg}; color: ${item.typeBadgeColor}; font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; border: ${item.typeBadgeBorder}; white-space: nowrap;">
                  ${item.typeLabel}
                </span>
                <span style="font-size: 0.78rem; font-weight: 700; color: #111827;">
                  ${item.docNo || `OKL/2026/0${idx + 1}`}
                </span>
              </div>

              <!-- HEADER BARIS 3: TANGGAL & DOKUMEN ASAL -->
              <div style="font-size: 0.72rem; color: #888888; margin-bottom: 10px;">
                ${item.isRegrafting ? `Regrafting: ${item.tanggal || 'Hari ini'} • Pool: ${item.regraftPoolDocNo || '-'}` : `Okulasi: ${item.tanggal || 'Hari ini'} • Asal: ${item.sourceDocNo || '-'}`}
              </div>

              <hr style="border: none; border-top: 1px solid #F3F4F6; margin: 0 0 10px 0;" />

              <!-- GRID DETAIL 2x2 -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; margin-bottom: 10px;">
                <div>
                  <div style="font-size: 0.7rem; color: #6B7280; margin-bottom: 2px;">Klon Entres</div>
                  <div style="font-size: 0.84rem; font-weight: 800; color: #116834;">${item.klonEntres || 'PB 260'}</div>
                </div>
                <div>
                  <div style="font-size: 0.7rem; color: #6B7280; margin-bottom: 2px;">Lokasi Bedengan</div>
                  <div style="font-size: 0.82rem; font-weight: 700; color: #111111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.bedengan || 'Bedengan 01'}</div>
                </div>
                <div>
                  <div style="font-size: 0.7rem; color: #6B7280; margin-bottom: 2px;">${item.isRegrafting ? 'Populasi Regrafting' : 'Populasi Diokulasi'}</div>
                  <div style="font-size: 0.82rem; font-weight: 700; color: #116834;">${item.populasiDiokulasi} Pkk</div>
                </div>
                <div>
                  <div style="font-size: 0.7rem; color: #6B7280; margin-bottom: 2px;">Belum Diperiksa</div>
                  <div style="font-size: 0.82rem; font-weight: 700; color: ${item.sisaBelumDiperiksa > 0 ? '#D32F2F' : '#116834'};">${item.sisaBelumDiperiksa} Pkk</div>
                </div>
              </div>

              <!-- TOMBOL TOGGLE EXPAND DETAIL -->
              <div style="margin-bottom: 6px;">
                <button type="button" class="btn-toggle-expand-insp" style="background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 6px; width: 100%; padding: 6px 10px; font-size: 0.74rem; font-weight: 700; color: #116834; cursor: pointer; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box;">
                  <span class="text-expand-insp">Tampilkan Detail Akumulasi</span>
                  <svg class="icon-expand-insp" viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.2s ease;">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>

              <!-- EXPANDABLE ACCORDION DETAIL AKUMULASI -->
              <div class="insp-expand-content" style="display: none; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; font-size: 0.74rem;">
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #6B7280;">Klon Batang Bawah:</span>
                    <span style="font-weight: 700; color: #111827; text-align: right;">${item.klonRootstock || 'GT-01'}</span>
                  </div>
                  ${item.isRegrafting ? `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="color: #6B7280;">Pemeriksaan Asal:</span>
                      <span style="font-weight: 700; color: #111827; text-align: right;">${item.inspectionDocNo || '-'}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="color: #6B7280;">Penyebab Okulasi Ulang:</span>
                      <span style="font-weight: 700; color: #D97706; text-align: right;">${item.alasan || 'Okulasi Ulang'}</span>
                    </div>
                  ` : `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="color: #6B7280;">Bibit Ditolak Okulasi:</span>
                      <span style="font-weight: 700; color: #D32F2F; text-align: right;">${item.jumlahDitolak || 0} Pkk</span>
                    </div>
                  `}
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #6B7280;">Jumlah Kayu Okulasi:</span>
                    <span style="font-weight: 700; color: #111827; text-align: right;">${item.jumlahKayu || 0} Batang</span>
                  </div>
                </div>

                <!-- REKAPITULASI AKUMULASI PEMERIKSAAN -->
                <div style="background: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 6px; padding: 10px 12px; margin: 10px 0; display: flex; flex-direction: column; gap: 6px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #374151; font-weight: 600;">Telah Diperiksa:</span>
                    <span style="font-weight: 800; color: #111827; text-align: right;">${item.totalDiperiksa} Pkk</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #116834; font-weight: 600;">Berhasil:</span>
                    <span style="font-weight: 800; color: #116834; text-align: right;">${item.totalJadi} Pkk (${item.persenJadiDisplay})</span>
                  </div>
                  ${item.totalRegrafting > 0 ? `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="color: #D97706; font-weight: 600;">Okulasi Janda:</span>
                      <span style="font-weight: 800; color: #D97706; text-align: right;">${item.totalRegrafting} Pkk</span>
                    </div>
                  ` : ''}
                  ${item.totalSelection > 0 ? `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="color: #DC2626; font-weight: 600;">Gagal (Mati):</span>
                      <span style="font-weight: 800; color: #DC2626; text-align: right;">${item.totalSelection} Pkk</span>
                    </div>
                  ` : ''}
                </div>

                <!-- PEKERJA OKULASI -->
                ${workers.length > 0 ? `
                  <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #D1D5DB;">
                    <div style="font-weight: 700; color: #374151; margin-bottom: 6px; font-size: 0.74rem;">Pekerja Okulasi:</div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                      ${workers.map(w => `
                        <div style="display: flex; justify-content: space-between; align-items: center; color: #4B5563;">
                          <span>• ${w.name} <span style="color: #9CA3AF;">(${w.code})</span></span>
                          <span style="font-weight: 700; color: #116834; text-align: right;">${w.qty || 0} Pkk</span>
                        </div>
                      `).join('')}
                    </div>
                  </div>
                ` : ''}
              </div>

              <!-- FOOTER ACTION ROW -->
              ${item.sisaBelumDiperiksa <= 0 ? `
                <div class="card-action-periksa" data-index="${item.originalIndex}" data-completed="true" data-batch="${item.batchNo || 'Batch'}" data-total="${item.populasiDiokulasi}" style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px dashed #E5E7EB; cursor: pointer;">
                  <span style="font-size: 0.74rem; color: #116834; font-weight: 700;">✓ Pemeriksaan Selesai (100% Diperiksa)</span>
                  <div style="display: flex; align-items: center; gap: 4px; color: #116834; font-weight: 700; font-size: 0.74rem;">
                    <span>Selesai</span>
                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2.5" fill="none">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                </div>
              ` : `
                <div class="card-action-periksa" data-index="${item.originalIndex}" data-completed="false" data-batch="${item.batchNo || 'Batch'}" data-total="${item.populasiDiokulasi}" style="display: flex; justify-content: space-between; align-items: center; background: #116834; color: #FFFFFF; border-radius: 6px; padding: 10px 14px; margin-top: 10px; cursor: pointer; box-shadow: 0 2px 4px rgba(17,104,52,0.22); transition: opacity 0.15s ease;">
                  <span style="font-size: 0.78rem; color: #FFFFFF; font-weight: 700; letter-spacing: -0.01em;">Ketuk untuk Rekam Pemeriksaan</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              `}

            </div>
          `;
        }).join('')}
      </div>
    ` : ''}

    <!-- HISTORI PEMERIKSAAN OKULASI -->
    ${inspectionTxs.length > 0 ? `
      <div id="insp-summary-section" style="margin: 20px 0 10px 0;">
        <div id="insp-summary-header" style="margin-bottom: 10px;">
          <h2 id="insp-summary-title" style="font-size: 0.92rem; font-weight: 700; color: #111111; margin: 0;">Ringkasan Data Pemeriksaan (${inspectionTxs.length})</h2>
        </div>
        <div id="insp-summary-cards-container" style="display: flex; flex-direction: column; gap: 8px;">
          ${inspectionTxs.map((insp, idx) => {
            const inspGagal = parseInt(insp.jumlahGagal || 0);
            const regraftTotal = insp.totalToRegrafting !== undefined ? parseInt(insp.totalToRegrafting || 0) : inspGagal;
            const selectionTotal = insp.totalToSelection !== undefined ? parseInt(insp.totalToSelection || 0) : Math.max(0, inspGagal - regraftTotal);
            const isRegraftInsp = insp.buddingType === 'REGRAFTING';

            return `
              <div class="card-insp-summary-wrapper" data-type="${isRegraftInsp ? 'REGRAFTING' : 'GRAFTING'}" style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; font-size: 0.78rem; box-shadow: 0 1px 2px rgba(0,0,0,0.03); box-sizing: border-box; position: relative;">
                
                <!-- BARIS 1: JUDUL BATCH & TOMBOL AKSI 3-DOTS -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-weight: 800; font-size: 0.88rem; color: #111827;">${insp.batchNo || 'Batch'} - ${insp.klonEntres || 'PB 260'}</span>
                    <span style="font-size: 0.62rem; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: ${isRegraftInsp ? '#FFFBEB' : '#F0FDF4'}; color: ${isRegraftInsp ? '#B45309' : '#116834'}; border: ${isRegraftInsp ? '1px solid #FDE68A' : '1px solid #BBF7D0'};">
                      ${isRegraftInsp ? 'Regrafting' : 'Okulasi'}
                    </span>
                  </div>

                  <!-- TOMBOL AKSI 3-DOTS -->
                  <div style="position: relative;">
                    <button type="button" class="btn-tx-action-trigger" data-index="${idx}" aria-label="Menu Aksi" style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #4B5563; padding: 0;">
                      <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="1.2" fill="currentColor"></circle>
                        <circle cx="19" cy="12" r="1.2" fill="currentColor"></circle>
                        <circle cx="5" cy="12" r="1.2" fill="currentColor"></circle>
                      </svg>
                    </button>

                    <!-- DROPDOWN POPUP MENU -->
                    <div class="tx-action-menu" style="display: none; position: absolute; right: 0; top: 32px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.14); z-index: 100; min-width: 130px; overflow: hidden;">
                      <button type="button" class="menu-action-rincian" data-index="${idx}" style="width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; font-size: 0.75rem; font-weight: 600; color: #374151; display: flex; align-items: center; gap: 8px; cursor: pointer; border-bottom: 1px solid #F3F4F6;">
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="#116834" stroke-width="2.2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        <span class="text-menu-rincian">Rincian</span>
                      </button>
                      <button type="button" class="menu-action-edit" data-index="${idx}" style="width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; font-size: 0.75rem; font-weight: 600; color: #116834; display: flex; align-items: center; gap: 8px; cursor: pointer; border-bottom: 1px solid #F3F4F6;">
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="#116834" stroke-width="2.2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        <span>Edit</span>
                      </button>
                      <button type="button" class="menu-action-delete" data-index="${idx}" data-doc="${insp.docNo || ''}" style="width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; font-size: 0.75rem; font-weight: 600; color: #DC2626; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <svg viewBox="0 0 24 24" width="13" height="13" stroke="#DC2626" stroke-width="2.2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                </div>

                <!-- BARIS 2: LOKASI & TANGGAL -->
                <div style="font-size: 0.72rem; color: #6B7280; margin-bottom: 8px;">
                  ${insp.bedengan || 'Bedengan 01'} • ${insp.tanggal || 'Hari ini'}
                </div>

                <!-- BARIS 3: METRIK STATISTIK SIMETRIS 3-KOLOM -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 6px; padding: 7px 4px; text-align: center;">
                  <div>
                    <div style="font-size: 0.65rem; color: #6B7280;">Keberhasilan</div>
                    <div style="font-size: 0.82rem; font-weight: 800; color: #116834; margin-top: 1px;">${insp.persenJadi || 100}%</div>
                  </div>
                  <div>
                    <div style="font-size: 0.65rem; color: #116834;">Berhasil</div>
                    <div style="font-size: 0.82rem; font-weight: 800; color: #116834; margin-top: 1px;">${insp.jumlahJadi || 0} Pkk</div>
                  </div>
                  <div>
                    <div style="font-size: 0.65rem; color: ${regraftTotal > 0 ? '#D97706' : (selectionTotal > 0 ? '#DC2626' : '#6B7280')};">
                      ${regraftTotal > 0 ? 'Okulasi Janda' : 'Mati / Gagal'}
                    </div>
                    <div style="font-size: 0.82rem; font-weight: 800; color: ${regraftTotal > 0 ? '#D97706' : (selectionTotal > 0 ? '#DC2626' : '#6B7280')}; margin-top: 1px;">
                      ${regraftTotal > 0 ? regraftTotal : selectionTotal} Pkk
                    </div>
                  </div>
                </div>

              </div>
            `;
          }).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

/**
 * Event listeners for Dederan Inspection
 */
function attachDederanInspectionEvents(app) {
  // Action: Rekam Pemeriksaan Dederan (New)
  app.querySelectorAll('.btn-rekam-pemeriksaan-deder').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const txId = e.currentTarget.dataset.id;
      storage.remove('editing_dederan_inspection_id');
      storage.set('active_dederan_inspection_tx_id', txId);
      navigate('/inspection/dederan/form');
    });
  });

  // 3-dots action popup toggle
  app.querySelectorAll('.btn-deder-insp-action-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wrapper = e.currentTarget.closest('.card-deder-insp-summary-wrapper');
      const menu = wrapper?.querySelector('.deder-insp-action-menu');
      app.querySelectorAll('.deder-insp-action-menu').forEach(m => {
        if (m !== menu) m.style.display = 'none';
      });
      if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
      }
    });
  });

  document.addEventListener('click', () => {
    app.querySelectorAll('.deder-insp-action-menu').forEach(m => m.style.display = 'none');
  });

  // Action: Edit Dederan Inspection
  app.querySelectorAll('.menu-action-edit-deder-insp').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const docNo = e.currentTarget.dataset.doc;
      const txDocNo = e.currentTarget.dataset.tx;
      storage.set('editing_dederan_inspection_id', docNo);
      storage.set('active_dederan_inspection_tx_id', txDocNo);
      navigate('/inspection/dederan/form');
    });
  });

  // Delete dialog handling for Dederan
  const modalDeleteOverlay = app.querySelector('#modal-delete-insp-overlay');
  const dialogDelete = app.querySelector('#dialog-delete-insp');
  const dialogDeleteMsg = app.querySelector('#dialog-delete-insp-msg');
  const btnCancelDelete = app.querySelector('#btn-cancel-delete-insp');
  const btnConfirmDelete = app.querySelector('#btn-confirm-delete-insp');
  let pendingDeleteDederDocNo = null;

  function closeDeleteDialog() {
    if (modalDeleteOverlay) modalDeleteOverlay.style.display = 'none';
    if (dialogDelete) dialogDelete.style.display = 'none';
    pendingDeleteDederDocNo = null;
  }

  btnCancelDelete?.addEventListener('click', closeDeleteDialog);
  modalDeleteOverlay?.addEventListener('click', closeDeleteDialog);

  app.querySelectorAll('.menu-action-delete-deder-insp').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      pendingDeleteDederDocNo = e.currentTarget.dataset.doc;
      if (dialogDeleteMsg) {
        dialogDeleteMsg.innerHTML = `Apakah Anda yakin ingin menghapus data pemeriksaan dederan <strong>${pendingDeleteDederDocNo}</strong>? Data yang terhubung ke Seleksi Bibit juga akan disinkronisasikan kembali.`;
      }
      if (modalDeleteOverlay) modalDeleteOverlay.style.display = 'block';
      if (dialogDelete) dialogDelete.style.display = 'block';
    });
  });

  btnConfirmDelete?.addEventListener('click', () => {
    if (pendingDeleteDederDocNo) {
      const res = deleteDederanInspection(pendingDeleteDederDocNo);
      if (res.success) {
        toast.success(`Data pemeriksaan ${pendingDeleteDederDocNo} berhasil dihapus`);
      } else {
        toast.error(res.message || 'Gagal menghapus data pemeriksaan');
      }
      closeDeleteDialog();
      renderInspectionLanding();
    }
  });
}

/**
 * Event listeners for Okulasi Inspection
 */
function attachOkulasiInspectionEvents(app, items, inspectionTxs) {
  // Toggle detail expand
  app.querySelectorAll('.btn-toggle-expand-insp').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.currentTarget.closest('.card-inspection-wrapper');
      if (!card) return;
      const content = card.querySelector('.insp-expand-content');
      const textSpan = card.querySelector('.text-expand-insp');
      const icon = card.querySelector('.icon-expand-insp');
      if (!content) return;

      const isHidden = content.style.display === 'none';
      content.style.display = isHidden ? 'block' : 'none';
      if (textSpan) textSpan.textContent = isHidden ? 'Sembunyikan Detail' : 'Tampilkan Detail Akumulasi';
      if (icon) icon.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    });
  });

  // Action periksa okulasi
  app.querySelectorAll('.card-action-periksa').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const isCompleted = e.currentTarget.dataset.completed === 'true';
      if (isCompleted) {
        const overlay = app.querySelector('#modal-completed-overlay');
        const dialog = app.querySelector('#dialog-batch-completed');
        if (overlay) overlay.style.display = 'block';
        if (dialog) dialog.style.display = 'block';
      } else {
        const index = e.currentTarget.dataset.index;
        storage.remove('editing_inspection_index');
        storage.set('active_inspection_budding_index', index);
        navigate('/inspection/form');
      }
    });
  });

  app.querySelector('#btn-close-completed-dialog')?.addEventListener('click', () => {
    const overlay = app.querySelector('#modal-completed-overlay');
    const dialog = app.querySelector('#dialog-batch-completed');
    if (overlay) overlay.style.display = 'none';
    if (dialog) dialog.style.display = 'none';
  });

  // Filter tabs
  app.querySelectorAll('.btn-filter-insp-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const filter = e.currentTarget.dataset.filter;
      app.querySelectorAll('.btn-filter-insp-tab').forEach(t => {
        const isSelected = t === e.currentTarget;
        t.style.background = isSelected ? '#116834' : '#FFFFFF';
        t.style.color = isSelected ? '#FFFFFF' : '#374151';
        t.style.border = isSelected ? '1px solid #116834' : '1px solid #D1D5DB';
      });

      app.querySelectorAll('.card-inspection-wrapper').forEach(card => {
        const type = card.dataset.type;
        if (filter === 'ALL' || type === filter) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // 3-dots actions
  app.querySelectorAll('.btn-tx-action-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wrapper = e.currentTarget.closest('.card-insp-summary-wrapper');
      const menu = wrapper?.querySelector('.tx-action-menu');
      app.querySelectorAll('.tx-action-menu').forEach(m => {
        if (m !== menu) m.style.display = 'none';
      });
      if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
      }
    });
  });

  document.addEventListener('click', () => {
    app.querySelectorAll('.tx-action-menu').forEach(m => m.style.display = 'none');
  });

  // Action: Edit Okulasi Inspection
  app.querySelectorAll('.menu-action-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const index = e.currentTarget.dataset.index;
      storage.set('editing_inspection_index', index);
      navigate('/inspection/form');
    });
  });

  // Delete dialog for Okulasi
  const modalDeleteOverlay = app.querySelector('#modal-delete-insp-overlay');
  const dialogDelete = app.querySelector('#dialog-delete-insp');
  const dialogDeleteMsg = app.querySelector('#dialog-delete-insp-msg');
  const btnCancelDelete = app.querySelector('#btn-cancel-delete-insp');
  const btnConfirmDelete = app.querySelector('#btn-confirm-delete-insp');
  let pendingDeleteDocNo = null;

  function closeDeleteDialog() {
    if (modalDeleteOverlay) modalDeleteOverlay.style.display = 'none';
    if (dialogDelete) dialogDelete.style.display = 'none';
    pendingDeleteDocNo = null;
  }

  btnCancelDelete?.addEventListener('click', closeDeleteDialog);
  modalDeleteOverlay?.addEventListener('click', closeDeleteDialog);

  app.querySelectorAll('.menu-action-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      pendingDeleteDocNo = e.currentTarget.dataset.doc;
      if (dialogDeleteMsg) {
        dialogDeleteMsg.innerHTML = `Apakah Anda yakin ingin menghapus data pemeriksaan okulasi <strong>${pendingDeleteDocNo}</strong>?`;
      }
      if (modalDeleteOverlay) modalDeleteOverlay.style.display = 'block';
      if (dialogDelete) dialogDelete.style.display = 'block';
    });
  });

  btnConfirmDelete?.addEventListener('click', () => {
    if (pendingDeleteDocNo) {
      let currentInspTxs = storage.get('inspection_transactions', []);
      currentInspTxs = currentInspTxs.filter(i => i.docNo !== pendingDeleteDocNo);
      storage.set('inspection_transactions', currentInspTxs);
      toast.success(`Data pemeriksaan ${pendingDeleteDocNo} berhasil dihapus`);
    }
    closeDeleteDialog();
    renderInspectionLanding();
  });
}

/**
 * Menghitung jumlah batch okulasi yang membutuhkan tindakan pemeriksaan
 */
export function getActionableInspectionCount(currentUser) {
  const buddingTxs = storage.get('budding_transactions', []).filter(b => b.type !== 'REGRAFTING');
  const inspectionTxs = storage.get('inspection_transactions', []);
  
  const userEstateId = currentUser?.estateId;
  const userDivisionId = currentUser?.divisionId;

  let count = 0;
  buddingTxs.forEach((btx, i) => {
    if (userEstateId && btx.estateId && btx.estateId !== userEstateId) return;
    if (userDivisionId && btx.divisionId && btx.divisionId !== userDivisionId) return;

    const populasiDiokulasi = parseInt(btx.jumlah || 0);
    let totalDiperiksa = 0;
    inspectionTxs.filter(insp => insp.buddingDocNo === btx.docNo || insp.buddingIndex === i).forEach(insp => {
      totalDiperiksa += parseInt(insp.totalDiperiksa || (parseInt(insp.jumlahJadi || 0) + parseInt(insp.jumlahGagal || 0)));
    });
    if (populasiDiokulasi - totalDiperiksa > 0) {
      count++;
    }
  });

  return count;
}

export function hasActionableInspection(currentUser) {
  return getActionableInspectionCount(currentUser) > 0;
}
