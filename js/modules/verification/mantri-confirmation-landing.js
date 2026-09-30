/**
 * js/modules/verification/mantri-confirmation-landing.js
 * Halaman Landing "Konfirmasi untuk Verifikasi" Mantri Bibitan.
 * UI Compact Operasional dengan arsitektur submission tingkat modul (Module-Level Submission)
 * dan Modal Detail Transaksi.
 */

import { session } from '../../core/session.js';
import { navigate } from '../../core/router.js';
import { toast } from '../../components/toast.js';
import { esc, todayDDMMYYYY } from '../../core/utils.js';
import { getCurrentUserContext, resolveUserContext } from '../../core/user-context.js';
import { renderEmptyStateCard } from '../../components/empty-state.js';
import {
  getMantriTodayTransactions,
  submitModuleTransactions,
  MANTRI_TRANSACTION_STATUS,
  MODULE_TYPES,
  MODULE_LABELS,
  normalizeDateStr
} from './mantri-confirmation-service.js';

let activeTabFilter = null; // Menyimpan modul aktif (e.g. 'PENERIMAAN', 'PENYEMAIAN', etc.)
const moduleCheckedStates = new Map(); // Menyimpan state centang per modul
let selectedTxForModal = null; // Menyimpan transaksi yang sedang dilihat detailnya

export function renderMantriConfirmationLanding() {
  const app = document.getElementById('app');
  if (!app) return;

  const rawUser = session.get() || { name: 'Irwan Syah Putra', code: '1405482', role: 'MANTRI_TANAMAN' };
  const currentUser = getCurrentUserContext() || resolveUserContext(rawUser);

  const todayStr = todayDDMMYYYY();
  const allTodayTxs = getMantriTodayTransactions(currentUser, todayStr);

  // Hitung modul-modul yang aktif (hanya modul dengan transaksi hari ini, tanpa tab kosong)
  const activeModulesMap = new Map();
  allTodayTxs.forEach(tx => {
    const mType = tx.moduleType;
    const currentCount = activeModulesMap.get(mType) || 0;
    activeModulesMap.set(mType, currentCount + 1);
  });

  const activeModules = Array.from(activeModulesMap.entries()).map(([type, count]) => ({
    type,
    label: MODULE_LABELS[type] || type,
    count
  }));

  // Jika activeTabFilter tidak valid atau belum di-set, default ke modul pertama
  if (!activeTabFilter || !activeModulesMap.has(activeTabFilter)) {
    activeTabFilter = activeModules.length > 0 ? activeModules[0].type : null;
  }

  // Filter transaksi sesuai tab modul yang dipilih
  const currentModuleType = activeTabFilter;
  const currentModuleLabel = MODULE_LABELS[currentModuleType] || currentModuleType || 'Modul';
  const visibleTxs = currentModuleType
    ? allTodayTxs.filter(tx => tx.moduleType === currentModuleType)
    : [];

  // Hitung metrik untuk modul aktif saat ini
  const moduleEligibleTxs = visibleTxs.filter(tx => 
    tx.status === MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM || 
    tx.status === MANTRI_TRANSACTION_STATUS.REVISION
  );
  const hasEligibleTxs = moduleEligibleTxs.length > 0;
  const isStatementChecked = Boolean(moduleCheckedStates.get(currentModuleType));
  const canSubmitModule = hasEligibleTxs && isStatementChecked;

  const isAllModuleSubmitted = visibleTxs.length > 0 && !hasEligibleTxs && visibleTxs.some(tx => 
    tx.status === MANTRI_TRANSACTION_STATUS.SUBMITTED_TO_ASB || tx.status === MANTRI_TRANSACTION_STATUS.PENDING_ASB
  );
  const isAllModuleVerified = visibleTxs.length > 0 && !hasEligibleTxs && visibleTxs.every(tx => 
    tx.status === MANTRI_TRANSACTION_STATUS.VERIFIED || tx.status === MANTRI_TRANSACTION_STATUS.APPROVED
  );

  app.innerHTML = `
    <div class="page mantri-confirmation-page" style="display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; position: relative;">
      
      <!-- 1. TOP HEADER (Fixed 56px, Flex-shrink 0) -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #F1F5F9; flex-shrink: 0; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
          <button id="btn-back-home" type="button" aria-label="Kembali ke Beranda" style="background: transparent; border: none; padding: 6px; margin-left: -6px; color: #0F172A; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div style="min-width: 0; flex: 1;">
            <h1 style="font-size: 0.96rem; font-weight: 800; color: #0F172A; margin: 0; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Konfirmasi untuk Verifikasi</h1>
          </div>
        </div>
      </header>

      <!-- 2. DYNAMIC TABS PER ACTIVE MODULE (Flex-shrink 0, Horizontal Scroll) -->
      ${activeModules.length > 0 ? `
        <nav style="display: flex; overflow-x: auto; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 0 12px; gap: 16px; flex-shrink: 0; width: 100%; min-width: 0; scrollbar-width: none; -webkit-overflow-scrolling: touch;">
          ${activeModules.map(m => {
            const isActive = activeTabFilter === m.type;
            return `
              <button class="dynamic-tab-btn" data-module="${esc(m.type)}" style="flex-shrink: 0; padding: 10px 4px; font-size: 0.80rem; font-weight: ${isActive ? '800' : '600'}; color: ${isActive ? '#057A55' : '#64748B'}; background: transparent; border: none; border-bottom: 2.5px solid ${isActive ? '#057A55' : 'transparent'}; cursor: pointer; white-space: nowrap; transition: all 0.15s ease;">
                ${esc(m.label)} (${m.count})
              </button>
            `;
          }).join('')}
        </nav>
      ` : ''}

      <!-- 3. MAIN TRANSACTION LIST (Flex 1, Vertically Scrollable) -->
      <main style="flex: 1; min-height: 0; overflow-y: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;">
        ${activeModules.length === 0 ? renderEmptyStateCard({
          title: 'Tidak Ada Transaksi Hari Ini',
          description: 'Belum ada transaksi operasional yang dicatat untuk hari ini. Silakan input transaksi melalui modul menu Beranda.'
        }) : `
          <!-- Compact Transaction Cards List -->
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${visibleTxs.map(tx => renderCompactTransactionCard(tx)).join('')}
          </div>
        `}
      </main>

      <!-- 4. BOTTOM ACTION AREA (Flex-shrink 0, Fixed at bottom of device frame) -->
      ${activeModules.length > 0 ? `
        <div class="module-submit-area" style="flex-shrink: 0; width: 100%; padding: 12px 14px; background: #FFFFFF; border-top: 1px solid #E2E8F0; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 -2px 6px rgba(0,0,0,0.03); z-index: 10;">
          <div style="font-size: 0.82rem; font-weight: 800; color: #0F172A;">
            Pernyataan
          </div>

          <label style="display: flex; align-items: flex-start; gap: 8px; cursor: ${hasEligibleTxs ? 'pointer' : 'default'}; font-size: 0.72rem; color: #334155; line-height: 1.45;">
            <input type="checkbox" id="chk-statement-${esc(currentModuleType)}" class="chk-module-statement" data-module="${esc(currentModuleType)}" style="margin-top: 2px; width: 16px; height: 16px; accent-color: #057A55; cursor: ${hasEligibleTxs ? 'pointer' : 'not-allowed'}; flex-shrink: 0;" ${isStatementChecked ? 'checked' : ''} ${hasEligibleTxs ? '' : 'disabled'} />
            <span>Saya dengan ini menyatakan bahwa seluruh transaksi pada modul ${esc(currentModuleLabel)} telah diperiksa dan sesuai dengan kondisi lapangan.</span>
          </label>

          <button type="button" id="btn-submit-module-${esc(currentModuleType)}" class="btn-submit-module" data-module="${esc(currentModuleType)}" ${canSubmitModule ? '' : 'disabled'} style="width: 100%; height: 42px; background: ${canSubmitModule ? '#057A55' : '#D1D5DB'}; color: ${canSubmitModule ? '#FFFFFF' : '#9CA3AF'}; font-size: 0.82rem; font-weight: 700; border: none; border-radius: 8px; cursor: ${canSubmitModule ? 'pointer' : 'not-allowed'}; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: ${canSubmitModule ? '0 2px 5px rgba(5,122,85,0.25)' : 'none'}; transition: all 0.2s ease;">
            <svg viewBox="0 0 24 24" width="17" height="17" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            <span>${
              isAllModuleVerified
                ? '✓ Seluruh Transaksi Terverifikasi'
                : isAllModuleSubmitted
                  ? 'Menunggu Verifikasi Asisten'
                  : 'Kirim Data ke Asisten'
            }</span>
          </button>
        </div>
      ` : ''}

      <!-- 5. DETAIL TRANSACTION MODAL (Rendered if selectedTxForModal is set) -->
      ${selectedTxForModal ? renderDetailModal(selectedTxForModal, currentUser) : ''}

    </div>
  `;

  attachEvents(allTodayTxs, currentUser);
}

/**
 * Helper: Merender Compact Card per Transaksi sesuai Screenshot Referensi
 */
function renderCompactTransactionCard(tx) {
  const isReady = tx.status === MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM;
  const isRevision = tx.status === MANTRI_TRANSACTION_STATUS.REVISION;
  const isSubmitted = tx.status === MANTRI_TRANSACTION_STATUS.SUBMITTED_TO_ASB || tx.status === MANTRI_TRANSACTION_STATUS.PENDING_ASB;
  const isVerified = tx.status === MANTRI_TRANSACTION_STATUS.VERIFIED || tx.status === MANTRI_TRANSACTION_STATUS.APPROVED;

  let badgeHtml = '';
  if (isVerified) {
    badgeHtml = `<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.65rem; font-weight: 700; padding: 3px 8px; border-radius: 999px; background: #DEF7EC; color: #03543F;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #0E9F6E;"></span>Terverifikasi</span>`;
  } else if (isRevision) {
    badgeHtml = `<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.65rem; font-weight: 700; padding: 3px 8px; border-radius: 999px; background: #FEECDC; color: #B43403;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #F97316;"></span>Perlu Revisi</span>`;
  } else if (isSubmitted) {
    badgeHtml = `<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.65rem; font-weight: 700; padding: 3px 8px; border-radius: 999px; background: #E1EFFE; color: #1E429F;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #3F83F8;"></span>Menunggu Verifikasi</span>`;
  } else {
    badgeHtml = `<span style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.65rem; font-weight: 700; padding: 3px 8px; border-radius: 999px; background: #DEF7EC; color: #03543F;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #0E9F6E;"></span>Siap Dikirim</span>`;
  }

  const raw = tx.rawRecord || {};
  let title = '';
  let info = '';
  let mainQty = '';

  switch (tx.moduleType) {
    case MODULE_TYPES.PRESENSI:
      title = 'Presensi Harian';
      info = `${raw.attendanceType || raw.type || raw.shift || 'Reguler'} · ${tx.actor || '-'}`;
      mainQty = `${Number(raw.workerCount || raw.totalWorkers || 1).toLocaleString('id-ID')} Kehadiran`;
      break;

    case MODULE_TYPES.PENERIMAAN:
      title = 'Penerimaan Benih';
      info = `Klon ${raw.klon || raw.clone || '-'} · ${raw.tipeAsal || raw.asal || raw.sumber || raw.sourceType || 'Kebun Induk'}`;
      mainQty = `${Number(raw.qty || raw.quantity || raw.receivedQty || raw.acceptedQty || 0).toLocaleString('id-ID')} ${raw.satuan || raw.unit || 'Butir'}`;
      break;

    case MODULE_TYPES.PENYEMAIAN:
      title = 'Penyemaian Benih';
      info = `Batch ${raw.batchNo || '-'} · Bedengan ${raw.bedengan || raw.bedenganCode || '-'}`;
      mainQty = `${Number(raw.totalDisemai || raw.qty || 0).toLocaleString('id-ID')} Bibit`;
      break;

    case MODULE_TYPES.DEDERAN:
      title = 'Germinasi / Dederan';
      info = `Bedengan ${raw.bedenganCode || raw.bedengan || '-'} · Klon ${raw.klon || raw.varietas || '-'}`;
      mainQty = `${Number(raw.totalDeder || raw.jumlahDeder || raw.qty || 0).toLocaleString('id-ID')} Butir Deder`;
      break;

    case MODULE_TYPES.MENUNAS:
      title = 'Entres Menunas';
      info = `Plot ${raw.kodePlot || raw.plotId || raw.plotNo || '-'} · Klon ${raw.namaKlon || raw.klon || '-'}`;
      mainQty = `${Number(raw.jumlahPohonDitunas || raw.jumlahPokok || raw.qty || 0).toLocaleString('id-ID')} Pokok Ditunas`;
      break;

    case MODULE_TYPES.TOPPING:
      title = 'Entres Topping';
      info = `Plot ${raw.kodePlot || raw.plotId || raw.plotNo || '-'} · Klon ${raw.namaKlon || raw.klon || '-'}`;
      mainQty = `${Number(raw.jumlahKayu || raw.jumlahStik || 0).toLocaleString('id-ID')} Stik Hijau · ${Number(raw.jumlahPerisai || 0).toLocaleString('id-ID')} Perisai`;
      break;

    case MODULE_TYPES.OKULASI:
      title = 'Okulasi Bibitan';
      info = `${raw.type === 'REGRAFTING' ? 'Regrafting' : 'Grafting'} · Bedengan ${raw.bedengan || '-'}`;
      mainQty = `${Number(raw.jumlah || raw.qty || 0).toLocaleString('id-ID')} Pkk`;
      break;

    case MODULE_TYPES.PEMERIKSAAN:
      title = 'Pemeriksaan Okulasi';
      info = `Periksa ${Number(raw.totalDiperiksa || raw.qty || 0).toLocaleString('id-ID')} Pkk · ${raw.persenJadi !== undefined ? raw.persenJadi : (raw.totalDiperiksa ? Math.round(((raw.jumlahJadi || 0) / raw.totalDiperiksa) * 100) : 0)}% Jadi`;
      mainQty = `${Number(raw.jumlahJadi || 0).toLocaleString('id-ID')} Pkk Jadi`;
      break;

    case MODULE_TYPES.PEMERIKSAAN_DEDERAN:
      title = 'Pemeriksaan Dederan';
      info = `Bedengan ${raw.bedenganCode || raw.bedengan || '-'} · ${Number(raw.totalLayak || raw.sproutNormal || 0).toLocaleString('id-ID')} Normal, ${Number(raw.totalAfkir || raw.sproutAfkir || 0).toLocaleString('id-ID')} Afkir`;
      mainQty = `${Number(raw.totalLayak || raw.sproutNormal || 0).toLocaleString('id-ID')} Layak`;
      break;

    case MODULE_TYPES.SELEKSI_PRA_OKULASI:
      title = `Seleksi Pra-Okulasi (${raw.selectionStage || 'Seleksi I'})`;
      info = `Batch ${raw.batchCode || '-'} · Bedengan ${raw.bedengan || '-'}`;
      mainQty = `${Number(raw.totalLayak !== undefined ? raw.totalLayak : (raw.finalBibitQty || 0)).toLocaleString('id-ID')} Layak`;
      break;

    case MODULE_TYPES.PENYELEKSIAN:
      title = 'Penyeleksian Bibit';
      info = `Kategori ${raw.reason || raw.kategoriAfkir || raw.stage || 'Afkir'} · Bedengan ${raw.bedengan || raw.lokasi || '-'}`;
      mainQty = `${Number(raw.actualBibitSelectedQty !== undefined ? raw.actualBibitSelectedQty : (raw.jumlahAfkir || raw.bibitReject || 0)).toLocaleString('id-ID')} Bibit Afkir`;
      break;

    case MODULE_TYPES.PEMELIHARAAN:
      title = 'Rekam Pemeliharaan';
      info = `${raw.activityType || 'Pemeliharaan'} · Bedengan ${raw.bedengan || raw.location || raw.blok || '-'}`;
      mainQty = `${Number(raw.volumePkk || raw.volume || raw.qty || 0).toLocaleString('id-ID')} Pkk`;
      break;

    case MODULE_TYPES.PENGELUARAN:
      title = 'Pengeluaran Bibit';
      info = `Tujuan ${raw.destination || raw.targetDivision || raw.targetEstate || '-'} · Klon ${raw.klon || '-'}`;
      mainQty = `${Number(raw.qtyDispatched || raw.quantity || raw.qty || raw.totalBatang || 0).toLocaleString('id-ID')} Batang`;
      break;

    case MODULE_TYPES.MATERIAL:
      title = 'Material & Bahan';
      info = `${raw.materialName || raw.name || '-'} · ${raw.category || raw.kategori || 'Umum'}`;
      mainQty = `${Number(raw.qty || raw.quantity || 0).toLocaleString('id-ID')} ${raw.unit || raw.satuan || 'Satuan'}`;
      break;

    case MODULE_TYPES.SIMULASI_GUDANG:
      title = 'Simulasi Issue Gudang';
      info = `No ${raw.issueDocNo || raw.docNo || '-'} · ${raw.itemName || raw.materialName || '-'}`;
      mainQty = `${Number(raw.qty || raw.quantity || 0).toLocaleString('id-ID')} ${raw.unit || 'Unit'}`;
      break;

    default:
      title = tx.moduleLabel || 'Transaksi';
      info = tx.summary || '-';
      mainQty = '1 Transaksi';
  }

  const dateFormatted = normalizeDateStr(tx.date);

  return `
    <div class="card-compact-item" data-tx-id="${esc(tx.id)}" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 11px 13px; display: flex; flex-direction: column; gap: 3px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); cursor: pointer; transition: all 0.15s ease;">
      
      <!-- Baris 1: Doc No & Date & Chevron Right -->
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
        <span style="font-size: 0.82rem; font-weight: 800; color: #057A55; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${esc(tx.docNo)}
        </span>
        <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
          <span style="font-size: 0.70rem; color: #64748B;">
            ${esc(dateFormatted)}
          </span>
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="#94A3B8" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>

      <!-- Baris 2: Nama Transaksi -->
      <div style="font-size: 0.78rem; font-weight: 700; color: #0F172A; margin-top: 1px;">
        ${esc(title)}
      </div>

      <!-- Baris 3: Info Utama -->
      <div style="font-size: 0.72rem; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        ${esc(info)}
      </div>

      <!-- Baris 4: Main Qty & Status Badge -->
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 4px;">
        <div style="font-size: 0.82rem; font-weight: 800; color: #0F172A;">
          ${esc(mainQty)}
        </div>
        <div>
          ${badgeHtml}
        </div>
      </div>

    </div>
  `;
}

/**
 * Helper: Merender Detail Modal Popup saat card transaksi diklik
 */
function renderDetailModal(tx, user) {
  const raw = tx.rawRecord || {};
  const dateFormatted = normalizeDateStr(tx.date);
  const timeFormatted = raw.createdAt ? new Date(raw.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '08:15';
  const fullDateTime = `${dateFormatted}, ${timeFormatted}`;

  // Ekstraksi field-field spesifik untuk modal
  const program = raw.program || raw.programCode || raw.batchCode || '2026/TB/RNUR/001';
  const klon = raw.klon || raw.namaKlon || raw.clone || 'GT1';
  const tipeAsal = raw.tipeAsal || raw.asal || raw.sumber || raw.sourceType || 'Kebun Induk';
  const bedengan = raw.bedengan || raw.bedenganCode || '-';
  const plot = raw.kodePlot || raw.plotId || raw.plotNo || '-';
  const actorName = tx.actor || user?.name || 'Wagiman';
  const actorCode = user?.code || 'MNT001';
  const notes = raw.notes || raw.catatan || raw.keterangan || `Pencatatan operasional ${tx.moduleLabel} oleh Mantri Pembibitan.`;

  let qtyFormatted = '0';
  if (tx.moduleType === MODULE_TYPES.PENERIMAAN) {
    qtyFormatted = `${Number(raw.qty || raw.receivedQty || 0).toLocaleString('id-ID')} ${raw.satuan || raw.unit || 'Butir'}`;
  } else if (tx.moduleType === MODULE_TYPES.PENYEMAIAN) {
    qtyFormatted = `${Number(raw.totalDisemai || raw.qty || 0).toLocaleString('id-ID')} Bibit`;
  } else if (tx.moduleType === MODULE_TYPES.TOPPING) {
    qtyFormatted = `${Number(raw.jumlahKayu || 0).toLocaleString('id-ID')} Stik Hijau · ${Number(raw.jumlahPerisai || 0).toLocaleString('id-ID')} Perisai`;
  } else {
    qtyFormatted = tx.summary || `${Number(raw.qty || raw.totalWorkers || 1).toLocaleString('id-ID')}`;
  }

  return `
    <div id="modal-tx-detail-backdrop" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(2px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px;">
      
      <div style="background: #FFFFFF; border-radius: 14px; width: 100%; max-width: 380px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.25); display: flex; flex-direction: column; animation: modalFadeIn 0.2s ease-out;">
        
        <!-- Modal Header -->
        <div style="background: #057A55; color: #FFFFFF; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
          <h3 style="margin: 0; font-size: 0.94rem; font-weight: 800; color: #FFFFFF; letter-spacing: 0.2px;">
            ${esc(tx.moduleLabel)}
          </h3>
          <button id="btn-close-modal-x" type="button" aria-label="Tutup" style="background: transparent; border: none; color: #FFFFFF; font-size: 1.1rem; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center;">
            ✕
          </button>
        </div>

        <!-- Modal Body -->
        <div style="padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; font-size: 0.76rem; color: #334155; max-height: 70vh; overflow-y: auto;">
          
          <!-- Top Row: Doc No & Date/Time -->
          <div style="display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 8px; border-bottom: 1px solid #F1F5F9;">
            <div style="font-weight: 800; color: #0F172A; font-size: 0.84rem;">${esc(tx.docNo)}</div>
            <div style="color: #64748B; font-size: 0.70rem;">${esc(fullDateTime)}</div>
          </div>

          <!-- Info Fields -->
          <div>
            <div style="font-size: 0.68rem; font-weight: 700; color: #64748B;">Program</div>
            <div style="font-weight: 700; color: #0F172A; margin-top: 1px;">${esc(program)}</div>
          </div>

          <div>
            <div style="font-size: 0.68rem; font-weight: 700; color: #64748B;">Klon</div>
            <div style="font-weight: 700; color: #0F172A; margin-top: 1px;">${esc(klon)}</div>
          </div>

          ${raw.bedengan ? `
            <div>
              <div style="font-size: 0.68rem; font-weight: 700; color: #64748B;">Bedengan</div>
              <div style="font-weight: 700; color: #0F172A; margin-top: 1px;">${esc(bedengan)}</div>
            </div>
          ` : ''}

          ${raw.kodePlot || raw.plotId ? `
            <div>
              <div style="font-size: 0.68rem; font-weight: 700; color: #64748B;">Plot</div>
              <div style="font-weight: 700; color: #0F172A; margin-top: 1px;">${esc(plot)}</div>
            </div>
          ` : ''}

          <div>
            <div style="font-size: 0.68rem; font-weight: 700; color: #64748B;">Tipe Asal</div>
            <div style="font-weight: 700; color: #0F172A; margin-top: 1px;">${esc(tipeAsal)}</div>
          </div>

          <div>
            <div style="font-size: 0.68rem; font-weight: 700; color: #64748B;">Jumlah</div>
            <div style="font-weight: 800; color: #057A55; margin-top: 1px;">${esc(qtyFormatted)}</div>
          </div>

          <!-- Dicatat Oleh & Tanggal Input -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: #F8FAFC; padding: 8px 10px; border-radius: 6px; border: 1px solid #E2E8F0;">
            <div>
              <div style="font-size: 0.62rem; font-weight: 700; color: #64748B;">Dicatat Oleh</div>
              <div style="font-weight: 700; color: #0F172A; margin-top: 1px;">${esc(actorName)} (${esc(actorCode)})</div>
            </div>
            <div>
              <div style="font-size: 0.62rem; font-weight: 700; color: #64748B;">Tanggal Input</div>
              <div style="font-weight: 700; color: #0F172A; margin-top: 1px;">${esc(fullDateTime)}</div>
            </div>
          </div>

          <!-- Catatan -->
          <div>
            <div style="font-size: 0.68rem; font-weight: 700; color: #64748B;">Catatan</div>
            <div style="color: #475569; margin-top: 1px; line-height: 1.4;">${esc(notes)}</div>
          </div>

        </div>

        <!-- Modal Footer: Hanya Tutup -->
        <div style="padding: 10px 16px; border-top: 1px solid #F1F5F9;">
          <button id="btn-close-modal-footer" type="button" style="width: 100%; height: 36px; background: #FFFFFF; border: 1.5px solid #057A55; color: #057A55; font-size: 0.80rem; font-weight: 700; border-radius: 8px; cursor: pointer; transition: all 0.15s ease;">
            Tutup
          </button>
        </div>

      </div>

    </div>
  `;
}

function attachEvents(allTxs, user) {
  // Kembali ke Beranda
  document.getElementById('btn-back-home')?.addEventListener('click', () => {
    navigate('/home');
  });

  // Dynamic Tab Switching
  document.querySelectorAll('.dynamic-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedModule = btn.getAttribute('data-module');
      if (selectedModule) {
        activeTabFilter = selectedModule;
        renderMantriConfirmationLanding();
      }
    });
  });

  // Klik Transaction Card -> Buka Detail Modal
  document.querySelectorAll('.card-compact-item').forEach(card => {
    card.addEventListener('click', () => {
      const txId = card.getAttribute('data-tx-id');
      const foundTx = allTxs.find(t => String(t.id) === String(txId) || String(t.docNo) === String(txId));
      if (foundTx) {
        selectedTxForModal = foundTx;
        renderMantriConfirmationLanding();
      }
    });
  });

  // Tutup Modal
  const closeModal = () => {
    selectedTxForModal = null;
    renderMantriConfirmationLanding();
  };

  document.getElementById('btn-close-modal-x')?.addEventListener('click', closeModal);
  document.getElementById('btn-close-modal-footer')?.addEventListener('click', closeModal);
  document.getElementById('modal-tx-detail-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-tx-detail-backdrop') {
      closeModal();
    }
  });

  // Checkbox Pernyataan Modul
  document.querySelectorAll('.chk-module-statement').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const mType = chk.getAttribute('data-module');
      if (mType) {
        moduleCheckedStates.set(mType, e.target.checked);
        const submitBtn = document.getElementById(`btn-submit-module-${mType}`);
        if (submitBtn) {
          if (e.target.checked) {
            submitBtn.removeAttribute('disabled');
            submitBtn.style.background = '#057A55';
            submitBtn.style.color = '#FFFFFF';
            submitBtn.style.cursor = 'pointer';
            submitBtn.style.boxShadow = '0 2px 5px rgba(5,122,85,0.25)';
          } else {
            submitBtn.setAttribute('disabled', 'true');
            submitBtn.style.background = '#D1D5DB';
            submitBtn.style.color = '#9CA3AF';
            submitBtn.style.cursor = 'not-allowed';
            submitBtn.style.boxShadow = 'none';
          }
        }
      }
    });
  });

  // Submit Module Button
  document.querySelectorAll('.btn-submit-module').forEach(btn => {
    btn.addEventListener('click', () => {
      const mType = btn.getAttribute('data-module');
      if (!mType) return;

      const isChecked = moduleCheckedStates.get(mType);
      if (!isChecked) {
        toast('Silakan centang pernyataan modul terlebih dahulu.', 'warning');
        return;
      }

      try {
        const res = submitModuleTransactions(mType, user);
        if (res.success && res.submittedCount > 0) {
          toast(res.message || `${res.submittedCount} transaksi berhasil dikirim ke Asisten!`, 'success');
          moduleCheckedStates.set(mType, false); // Reset checkbox setelah submit sukses
          renderMantriConfirmationLanding();
        } else {
          toast(res.message || 'Tidak ada transaksi baru yang perlu dikirim.', 'info');
        }
      } catch (err) {
        toast(err.message || 'Gagal mengirim transaksi modul', 'error');
      }
    });
  });
}
