/**
 * js/modules/verification/mantri-confirmation-landing.js
 * Halaman Landing "Konfirmasi untuk Verifikasi" Mantri Bibitan.
 * Unified UI/UX Pattern across ALL Modules based on Canonical Design System.
 */

import { storage } from '../../core/storage.js';
import { session } from '../../core/session.js';
import { navigate } from '../../core/router.js';
import { toast } from '../../components/toast.js';
import { esc, todayDDMMYYYY } from '../../core/utils.js';
import { getCurrentUserContext, resolveUserContext } from '../../core/user-context.js';
import { renderEmptyStateCard } from '../../components/empty-state.js';
import { VERIFICATION_STORAGE_KEY } from './verification-manager.js';
import {
  getMantriTodayTransactions,
  submitModuleTransactions,
  MANTRI_TRANSACTION_STATUS,
  MODULE_TYPES,
  MODULE_LABELS,
  normalizeDateStr
} from './mantri-confirmation-service.js';

let activeTabFilter = null; // Menyimpan modul aktif (e.g. 'TIDAK_HADIR', 'PENERIMAAN', etc.)
const moduleCheckedStates = new Map(); // Menyimpan state centang per modul
let selectedTxForModal = null; // Menyimpan transaksi yang sedang dilihat detailnya
let isSubmitting = false; // Double-click protection
let showLoadingModal = false; // Loading modal state
let showSuccessModal = false; // Success modal state

// Canonical Section Titles matching reference design screens
const MODULE_SECTION_TITLES = {
  [MODULE_TYPES.TIDAK_HADIR]: 'Tidak Hadir',
  [MODULE_TYPES.PENERIMAAN]: 'Penerimaan',
  [MODULE_TYPES.PENYEMAIAN]: 'Penyemaian',
  [MODULE_TYPES.DEDERAN]: 'Pemeriksaan Dederan',
  [MODULE_TYPES.OKULASI]: 'Okulasi',
  [MODULE_TYPES.PEMERIKSAAN_OKULASI]: 'Pemeriksaan Okulasi',
  [MODULE_TYPES.PENYELEKSIAN]: 'Penyeleksian',
  [MODULE_TYPES.KEBUN_ENTRES]: 'Kebun Entres',
  [MODULE_TYPES.MATERIAL]: 'Material & Bahan',
  [MODULE_TYPES.PEMELIHARAAN]: 'Rekam Pemeliharaan',
  [MODULE_TYPES.PENGELUARAN]: 'Pengeluaran Bibit'
};

export function renderMantriConfirmationLanding() {
  const app = document.getElementById('app');
  if (!app) return;

  const rawUser = session.get() || { name: 'Irwan Syah Putra', code: '1405482', role: 'MANTRI_TANAMAN' };
  const currentUser = getCurrentUserContext() || resolveUserContext(rawUser);

  const todayStr = todayDDMMYYYY();
  const allTodayTxs = getMantriTodayTransactions(currentUser, todayStr);

  // Hitung modul-modul yang aktif
  const activeModulesMap = new Map();
  allTodayTxs.forEach(tx => {
    const mType = tx.moduleType;
    let count = 1;
    if (mType === MODULE_TYPES.TIDAK_HADIR && tx.rawRecord?.detailPekerja) {
      count = tx.rawRecord.detailPekerja.length;
    }
    const currentCount = activeModulesMap.get(mType) || 0;
    activeModulesMap.set(mType, currentCount + (mType === MODULE_TYPES.TIDAK_HADIR ? count : 1));
  });

  const activeModules = Array.from(activeModulesMap.entries()).map(([type, count]) => ({
    type,
    label: MODULE_LABELS[type] || type,
    count
  }));

  // Jika activeTabFilter belum di-set atau tidak ada di activeModules, pilih modul pertama
  if (!activeTabFilter || !activeModulesMap.has(activeTabFilter)) {
    activeTabFilter = activeModules.length > 0 ? activeModules[0].type : null;
  }

  // Filter transaksi sesuai tab modul yang dipilih
  const currentModuleType = activeTabFilter;
  const currentModuleLabel = MODULE_LABELS[currentModuleType] || currentModuleType || 'Modul';
  const currentSectionTitle = MODULE_SECTION_TITLES[currentModuleType] || currentModuleLabel;
  const visibleTxs = currentModuleType
    ? allTodayTxs.filter(tx => tx.moduleType === currentModuleType)
    : [];

  // Hitung status eligibilitas modul
  const moduleEligibleTxs = visibleTxs.filter(tx =>
    tx.status === MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM ||
    tx.status === MANTRI_TRANSACTION_STATUS.REVISION
  );
  const hasEligibleTxs = moduleEligibleTxs.length > 0;
  const isStatementChecked = Boolean(moduleCheckedStates.get(currentModuleType));
  const canSubmitModule = hasEligibleTxs && isStatementChecked && !isSubmitting;

  const isAllModuleSubmitted = visibleTxs.length > 0 && !hasEligibleTxs && visibleTxs.some(tx =>
    tx.status === MANTRI_TRANSACTION_STATUS.SUBMITTED_TO_ASB || tx.status === MANTRI_TRANSACTION_STATUS.PENDING_ASB
  );
  const isAllModuleVerified = visibleTxs.length > 0 && !hasEligibleTxs && visibleTxs.every(tx =>
    tx.status === MANTRI_TRANSACTION_STATUS.VERIFIED || tx.status === MANTRI_TRANSACTION_STATUS.APPROVED
  );

  // Resolve submission timestamp for confirmed modules
  const submissionTimestamp = getModuleSubmissionTimestamp(currentModuleType, visibleTxs);

  // Statement text canonical for all modules
  const statementText = 'Saya dengan ini menyatakan bahwa informasi di atas adalah benar dan sesuai dengan kondisi lapangan.';

  app.innerHTML = `
    <div class="page mantri-confirmation-page" style="display: flex; flex-direction: column; height: 100%; min-height: 0; overflow: hidden; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; position: relative;">
      
      <!-- 1. HEADER (Fixed 56px, Flex-shrink 0) -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
          <button id="btn-back-home" type="button" aria-label="Kembali ke Beranda" style="background: transparent; border: none; padding: 6px; margin-left: -6px; color: #057A55; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <div style="min-width: 0; flex: 1;">
            <h1 style="font-size: 0.96rem; font-weight: 800; color: #0F172A; margin: 0; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Konfirmasi untuk Verifikasi</h1>
          </div>
        </div>
      </header>

      <!-- 2. TAB BAR (Flex-shrink 0, Horizontal Scroll) -->
      ${activeModules.length > 0 ? `
        <nav style="display: flex; overflow-x: auto; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 0 12px; gap: 12px; flex-shrink: 0; width: 100%; min-width: 0; scrollbar-width: none; -webkit-overflow-scrolling: touch;">
          ${activeModules.map(m => {
    const isActive = activeTabFilter === m.type;
    return `
              <button class="dynamic-tab-btn" data-module="${esc(m.type)}" style="flex-shrink: 0; padding: 10px 6px; font-size: 0.80rem; font-weight: ${isActive ? '800' : '600'}; color: ${isActive ? '#057A55' : '#64748B'}; background: transparent; border: none; border-bottom: 2.5px solid ${isActive ? '#057A55' : 'transparent'}; cursor: pointer; white-space: nowrap; transition: all 0.15s ease;">
                ${esc(m.label)} (${m.count})
              </button>
            `;
  }).join('')}
        </nav>
      ` : ''}

      <!-- 3. MAIN CONTENT (Flex 1, Vertically Scrollable) -->
      <main style="flex: 1; min-height: 0; overflow-y: auto; padding: 14px 14px 16px; display: flex; flex-direction: column; gap: 10px;">
        ${activeModules.length === 0 ? renderEmptyStateCard({
    title: 'Tidak Ada Transaksi Hari Ini',
    description: 'Belum ada transaksi operasional yang dicatat untuk hari ini. Silakan input transaksi melalui modul menu Beranda.'
  }) : `
          <!-- Section Header with Title & Info Icon (i) -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 2px 2px 4px;">
            <h2 style="font-size: 0.95rem; font-weight: 800; color: #0284C7; margin: 0; letter-spacing: -0.2px;">
              ${esc(currentSectionTitle)}
            </h2>
            <button id="btn-section-info" type="button" aria-label="Informasi Modul" style="background: #0284C7; color: #FFFFFF; border: none; border-radius: 50%; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; cursor: pointer; line-height: 1; flex-shrink: 0; box-shadow: 0 1px 2px rgba(2,132,199,0.3);">
              i
            </button>
          </div>

          <!-- Module Specific List (Row Mode for Tidak Hadir, Group Mode for Kebun Entres, Card Mode for Transactions) -->
          ${currentModuleType === MODULE_TYPES.TIDAK_HADIR
      ? renderTidakHadirList(visibleTxs)
      : currentModuleType === MODULE_TYPES.KEBUN_ENTRES
      ? renderKebunEntresGroupedList(visibleTxs)
      : `
              <div style="display: flex; flex-direction: column; gap: 10px;">
                ${visibleTxs.map(tx => renderCompactTransactionCard(tx)).join('')}
              </div>
            `
    }
        `}
      </main>

      <!-- 4. BOTTOM ACTION AREA (Flex-shrink 0, Fixed at bottom of device frame) -->
      ${activeModules.length > 0 ? `
        <div class="module-submit-area" style="flex-shrink: 0; width: 100%; padding: 12px 14px 16px; background: #FFFFFF; border-top: 1px solid #E2E8F0; box-sizing: border-box; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 -2px 6px rgba(0,0,0,0.03); z-index: 10;">
          ${(isAllModuleSubmitted || isAllModuleVerified) ? `
            <!-- DATA TERKONFIRMASI STATE -->
            <div style="display: flex; align-items: flex-start; gap: 10px; padding: 4px 0;">
              <div style="width: 28px; height: 28px; border-radius: 50%; background: #DEF7EC; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#057A55" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0;">
                <span style="font-size: 0.84rem; font-weight: 800; color: #0F172A; line-height: 1.3;">Data Terkonfirmasi</span>
                <span style="font-size: 0.72rem; color: #64748B; line-height: 1.35;">${submissionTimestamp ? submissionTimestamp : 'Selesai'}</span>
              </div>
            </div>
          ` : `
            <!-- PERNYATAAN + SUBMIT BUTTON STATE -->
            <div style="font-size: 0.82rem; font-weight: 800; color: #0F172A;">
              Pernyataan
            </div>

            <label style="display: flex; align-items: flex-start; gap: 8px; cursor: ${hasEligibleTxs && !isSubmitting ? 'pointer' : 'default'}; font-size: 0.72rem; color: #334155; line-height: 1.45;">
              <input type="checkbox" id="chk-statement-${esc(currentModuleType)}" class="chk-module-statement" data-module="${esc(currentModuleType)}" style="margin-top: 2px; width: 16px; height: 16px; accent-color: #057A55; cursor: ${hasEligibleTxs && !isSubmitting ? 'pointer' : 'not-allowed'}; flex-shrink: 0;" ${isStatementChecked ? 'checked' : ''} ${hasEligibleTxs && !isSubmitting ? '' : 'disabled'} />
              <span>${statementText}</span>
            </label>

            <button type="button" id="btn-submit-module-${esc(currentModuleType)}" class="btn-submit-module" data-module="${esc(currentModuleType)}" ${canSubmitModule ? '' : 'disabled'} style="width: 100%; height: 42px; background: ${canSubmitModule ? '#057A55' : '#D1D5DB'}; color: ${canSubmitModule ? '#FFFFFF' : '#9CA3AF'}; font-size: 0.82rem; font-weight: 700; border: none; border-radius: 8px; cursor: ${canSubmitModule ? 'pointer' : 'not-allowed'}; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: ${canSubmitModule ? '0 2px 5px rgba(5,122,85,0.25)' : 'none'}; transition: all 0.2s ease;">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
              <span>Kirim Data ke Asisten</span>
            </button>
          `}
        </div>
      ` : ''}

      <!-- 5. DETAIL TRANSACTION MODAL (Rendered if selectedTxForModal is set) -->
      ${selectedTxForModal ? renderDetailModal(selectedTxForModal, currentUser) : ''}

      <!-- 6. LOADING MODAL (Rendered during submission) -->
      ${showLoadingModal ? renderLoadingModal() : ''}

      <!-- 7. SUCCESS MODAL (Rendered after successful submission) -->
      ${showSuccessModal ? renderSuccessModal() : ''}

    </div>
  `;

  attachEvents(allTodayTxs, currentUser, currentSectionTitle);
}

/**
 * Helper: Merender Row-Mode untuk Modul Tidak Hadir sesuai Reference Screen 1
 */
function renderTidakHadirList(txs) {
  const workers = [];
  txs.forEach(tx => {
    if (tx.rawRecord && Array.isArray(tx.rawRecord.detailPekerja)) {
      tx.rawRecord.detailPekerja.forEach(w => workers.push(w));
    }
  });

  if (workers.length === 0) {
    return `
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; text-align: center; color: #64748B; font-size: 0.78rem;">
        Tidak ada data pekerja tidak hadir hari ini.
      </div>
    `;
  }

  return `
    <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
      <!-- Table Subheader -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid #E2E8F0; background: #FFFFFF;">
        <span style="font-size: 0.75rem; font-weight: 700; color: #64748B;">Nama Pekerja</span>
        <span style="font-size: 0.75rem; font-weight: 700; color: #64748B;">Status Kehadiran</span>
      </div>

      <!-- Workers List -->
      <div style="display: flex; flex-direction: column;">
        ${workers.map((w, idx) => {
    const type = (w.absentType || 'C').toUpperCase();
    let badgeBg = '#3B82F6'; // C (Cuti/Izin) -> Blue
    if (type === 'M' || type === 'ALPHA') {
      badgeBg = '#EF4444'; // M (Mangkir) -> Red
    } else if (type === 'S') {
      badgeBg = '#F59E0B'; // S (Sakit) -> Amber
    }

    const isLast = idx === workers.length - 1;

    return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; ${isLast ? '' : 'border-bottom: 1px solid #F1F5F9;'}">
              <div style="display: flex; flex-direction: column; gap: 2px;">
                <span style="font-size: 0.82rem; font-weight: 700; color: #0F172A;">${esc(w.name || '-')}</span>
                <span style="font-size: 0.70rem; color: #64748B;">${esc(w.code || '-')}</span>
              </div>
              <div>
                <span style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 4px; background: ${badgeBg}; color: #FFFFFF; font-size: 0.76rem; font-weight: 800;">
                  ${esc(type)}
                </span>
              </div>
            </div>
          `;
  }).join('')}
      </div>
    </div>
  `;
}

/**
 * Helper: Merender transaksi Kebun Entres terkelompok berdasarkan MENUNAS dan TOPPING
 */
function renderKebunEntresGroupedList(txs) {
  const menunasTxs = txs.filter(t => (t.activityType || t.rawRecord?.type || t.type || '').toUpperCase() === 'MENUNAS');
  const toppingTxs = txs.filter(t => (t.activityType || t.rawRecord?.type || t.type || '').toUpperCase() === 'TOPPING');

  if (menunasTxs.length === 0 && toppingTxs.length === 0) {
    return `
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; text-align: center; color: #64748B; font-size: 0.78rem;">
        Tidak ada data transaksi Kebun Entres hari ini.
      </div>
    `;
  }

  return `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      ${menunasTxs.length > 0 ? `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 0.74rem; font-weight: 800; color: #116834; letter-spacing: 0.5px; text-transform: uppercase; padding-left: 2px;">
            MENUNAS
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${menunasTxs.map(tx => renderCompactTransactionCard(tx)).join('')}
          </div>
        </div>
      ` : ''}

      ${toppingTxs.length > 0 ? `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 0.74rem; font-weight: 800; color: #116834; letter-spacing: 0.5px; text-transform: uppercase; padding-left: 2px;">
            TOPPING
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${toppingTxs.map(tx => renderCompactTransactionCard(tx)).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Helper: Merender Compact Card per Transaksi sesuai Screens 2-10
 */
function renderCompactTransactionCard(tx) {
  const isRevision = tx.status === MANTRI_TRANSACTION_STATUS.REVISION;
  const isSubmitted = tx.status === MANTRI_TRANSACTION_STATUS.SUBMITTED_TO_ASB || tx.status === MANTRI_TRANSACTION_STATUS.PENDING_ASB;
  const isVerified = tx.status === MANTRI_TRANSACTION_STATUS.VERIFIED || tx.status === MANTRI_TRANSACTION_STATUS.APPROVED;

  let badgeHtml = '';
  if (isVerified) {
    badgeHtml = `<span style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.65rem; font-weight: 700; padding: 4px 9px; border-radius: 999px; background: #DEF7EC; color: #03543F; white-space: nowrap; flex-shrink: 0;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #0E9F6E; flex-shrink: 0;"></span>Terverifikasi</span>`;
  } else if (isRevision) {
    badgeHtml = `<span style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.65rem; font-weight: 700; padding: 4px 9px; border-radius: 999px; background: #FEECDC; color: #B43403; white-space: nowrap; flex-shrink: 0;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #F97316; flex-shrink: 0;"></span>Perlu Revisi</span>`;
  } else if (isSubmitted) {
    badgeHtml = `<span style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.65rem; font-weight: 700; padding: 4px 9px; border-radius: 999px; background: #E1EFFE; color: #1E429F; white-space: nowrap; flex-shrink: 0;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #3F83F8; flex-shrink: 0;"></span>Menunggu Verifikasi</span>`;
  } else {
    badgeHtml = `<span style="display: inline-flex; align-items: center; gap: 5px; font-size: 0.65rem; font-weight: 700; padding: 4px 9px; border-radius: 999px; background: #DEF7EC; color: #03543F; white-space: nowrap; flex-shrink: 0;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #0E9F6E; flex-shrink: 0;"></span>Siap Dikirim</span>`;
  }

  const disp = tx.display || {};
  const title = disp.title || tx.moduleLabel || 'Transaksi';
  const info = disp.info || tx.summary || '-';
  const mainQty = disp.mainQty || tx.summary || '1 Transaksi';
  const breakdown = disp.breakdown || '';
  const dateFormatted = normalizeDateStr(tx.date);

  // Deteksi apakah title modul redundan dengan info lokasi/klon (seperti Pemeriksaan Dederan, Okulasi, Penyeleksian, Entres)
  const isLocationBasedModule = [
    'Pemeriksaan Dederan', 'Germinasi', 'Dederan', 'Okulasi', 'Pemeriksaan Okulasi',
    'Penyeleksian', 'Penyeleksian Bibit', 'Entres Menunas', 'Entres Topping', 'Menunas', 'Topping'
  ].some(m => title.toLowerCase().includes(m.toLowerCase()));

  return `
    <div class="card-compact-item" data-tx-id="${esc(tx.id)}" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 11px 13px; display: flex; flex-direction: column; gap: 3px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); cursor: pointer; transition: all 0.15s ease;">
      
      <!-- Baris 1: Doc No & Date -->
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
        <span style="font-size: 0.82rem; font-weight: 800; color: #057A55; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${esc(tx.docNo)}
        </span>
        <span style="font-size: 0.70rem; color: #64748B; flex-shrink: 0;">
          ${esc(dateFormatted)}
        </span>
      </div>

      <!-- Baris 2 & 3: Deskripsi Operasional / Metadata Lokasi -->
      ${isLocationBasedModule && info && info !== '-' ? `
        <div style="font-size: 0.74rem; color: #475569; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${esc(info)}
        </div>
      ` : `
        <div style="font-size: 0.78rem; font-weight: 700; color: #0F172A; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
          ${esc(title)}
        </div>
        ${info && info !== '-' && info !== title ? `
          <div style="font-size: 0.72rem; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${esc(info)}
          </div>
        ` : ''}
      `}

      <!-- Baris Bawah: Quantity + Sub-breakdown (Kiri) & Status Badge (Kanan) -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 8px; margin-top: 5px;">
        <div style="display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1;">
          <span style="font-size: 0.82rem; font-weight: 800; color: #0F172A; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${esc(mainQty)}
          </span>
          ${breakdown ? `
            <span style="font-size: 0.68rem; color: #64748B; font-weight: 500; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${esc(breakdown)}
            </span>
          ` : ''}
        </div>
        <div style="flex-shrink: 0;">
          ${badgeHtml}
        </div>
      </div>

    </div>
  `;
}

/**
 * Helper: Merender Detail Modal Popup sesuai Screen 11 (Detail Transaksi)
 */
function renderDetailModal(tx, user) {
  const raw = tx.rawRecord || {};
  const disp = tx.display || {};
  const dateFormatted = normalizeDateStr(tx.date);
  const timeFormatted = raw.createdAt ? new Date(raw.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '09:15';
  const fullDateTime = `${dateFormatted}, ${timeFormatted}`;

  const actorName = tx.actor || raw.submittedByName || raw.createdByName || raw.mantri || user?.name || 'Mantri Bibitan';
  const actorCode = raw.actorCode || raw.userCode || user?.code || '1405482';
  const rawNotes = raw.notes || raw.catatan || raw.keterangan || raw.remarks;
  const notes = (rawNotes !== undefined && rawNotes !== null && String(rawNotes).trim() !== '') ? String(rawNotes).trim() : '-';
  const fields = disp.fields || [];

  return `
    <div id="modal-tx-detail-backdrop" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(2px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box;">
      
      <div style="background: #FFFFFF; border-radius: 12px; width: 100%; max-width: 380px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.25); display: flex; flex-direction: column; animation: modalFadeIn 0.2s ease-out;">
        
        <!-- Modal Header (Clean White with Title & Close Icon X) -->
        <div style="background: #FFFFFF; color: #0F172A; padding: 14px 16px 12px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #F1F5F9;">
          <h3 style="margin: 0; font-size: 0.94rem; font-weight: 800; color: #0F172A;">
            ${esc(disp.title || tx.moduleLabel)}
          </h3>
          <button id="btn-close-modal-x" type="button" aria-label="Tutup" style="background: transparent; border: none; color: #64748B; font-size: 1.15rem; cursor: pointer; padding: 2px 6px; display: flex; align-items: center; justify-content: center;">
            ✕
          </button>
        </div>

        <!-- Modal Body (Two-column colon layout matching Screen 11) -->
        <div style="padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; font-size: 0.76rem; color: #334155; max-height: 70vh; overflow-y: auto;">
          
          <div style="display: grid; grid-template-columns: 110px 10px 1fr; align-items: baseline; gap: 2px;">
            <span style="color: #64748B; font-weight: 600;">No. Dokumen</span>
            <span style="color: #64748B;">:</span>
            <span style="font-weight: 700; color: #0F172A;">${esc(tx.docNo)}</span>
          </div>

          <div style="display: grid; grid-template-columns: 110px 10px 1fr; align-items: baseline; gap: 2px;">
            <span style="color: #64748B; font-weight: 600;">Tanggal</span>
            <span style="color: #64748B;">:</span>
            <span style="color: #0F172A; font-weight: 600;">${esc(fullDateTime)}</span>
          </div>

          <!-- Dynamic Canonical Display Fields -->
          ${fields.map(f => `
            <div style="display: grid; grid-template-columns: 110px 10px 1fr; align-items: baseline; gap: 2px;">
              <span style="color: #64748B; font-weight: 600;">${esc(f.label)}</span>
              <span style="color: #64748B;">:</span>
              <span style="font-weight: ${f.highlight ? '800' : '600'}; color: ${f.highlight ? '#057A55' : '#0F172A'};">
                ${f.value}
              </span>
            </div>
          `).join('')}

          <div style="display: grid; grid-template-columns: 110px 10px 1fr; align-items: baseline; gap: 2px;">
            <span style="color: #64748B; font-weight: 600;">Dicatat Oleh</span>
            <span style="color: #64748B;">:</span>
            <span style="color: #0F172A; font-weight: 600;">${esc(actorName)} (${esc(actorCode)})</span>
          </div>

          <!-- Catatan Section with Shaded Box -->
          <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
            <span style="color: #64748B; font-weight: 600;">Catatan</span>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; color: #475569; font-size: 0.74rem; line-height: 1.45;">
              ${esc(notes)}
            </div>
          </div>

        </div>

        <!-- Modal Footer: Full width Tutup button -->
        <div style="padding: 12px 16px; border-top: 1px solid #F1F5F9; background: #FFFFFF;">
          <button id="btn-close-modal-footer" type="button" style="width: 100%; height: 38px; background: #FFFFFF; border: 1.5px solid #057A55; color: #057A55; font-size: 0.82rem; font-weight: 700; border-radius: 8px; cursor: pointer; transition: all 0.15s ease;">
            Tutup
          </button>
        </div>

      </div>

    </div>
  `;
}

/**
 * Helper: Render Loading Modal Overlay inside mobile device frame
 */
function renderLoadingModal() {
  return `
    <div id="modal-loading-backdrop" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(2px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box;">
      <div style="background: #FFFFFF; border-radius: 16px; width: 240px; padding: 32px 24px; display: flex; flex-direction: column; align-items: center; gap: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.25); animation: modalFadeIn 0.2s ease-out;">
        <div style="width: 48px; height: 48px; border: 3px solid #E2E8F0; border-top: 3px solid #0284C7; border-radius: 50%; animation: spinLoader 1s linear infinite;"></div>
        <div style="text-align: center;">
          <div style="font-size: 0.88rem; font-weight: 800; color: #0F172A; margin-bottom: 4px;">Mengirim data...</div>
          <div style="font-size: 0.74rem; color: #64748B;">Mohon tunggu, data sedang dikirim ke Asisten Bibitan.</div>
        </div>
      </div>
    </div>
    <style>
      @keyframes spinLoader {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
}

/**
 * Helper: Render Success Modal Overlay inside mobile device frame
 */
function renderSuccessModal() {
  return `
    <div id="modal-success-backdrop" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(15, 23, 42, 0.55); backdrop-filter: blur(2px); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box;">
      <div style="background: #FFFFFF; border-radius: 16px; width: 280px; padding: 28px 24px 20px; display: flex; flex-direction: column; align-items: center; gap: 14px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.25); animation: modalFadeIn 0.2s ease-out;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: #DEF7EC; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#057A55" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 0.92rem; font-weight: 800; color: #0F172A; margin-bottom: 6px; line-height: 1.3;">Data berhasil terkirim ke Asisten Bibitan</div>
          <div style="font-size: 0.74rem; color: #64748B; line-height: 1.45;">Data telah berhasil dikonfirmasi dan menunggu verifikasi oleh Asisten Bibitan.</div>
        </div>
        <button type="button" id="btn-success-ok" style="width: 100%; height: 40px; background: #057A55; color: #FFFFFF; font-size: 0.82rem; font-weight: 700; border: none; border-radius: 8px; cursor: pointer; margin-top: 4px; box-shadow: 0 2px 5px rgba(5,122,85,0.25); transition: all 0.15s ease;">OK</button>
      </div>
    </div>
  `;
}

/**
 * Helper: Format confirmation timestamp in Indonesian locale & Asia/Jakarta (WIB) timezone
 * Output: "Selesai, DD NamaBulan YYYY, HH:mm:ss" (e.g. "Selesai, 01 Oktober 2026, 20:45:30")
 */
export function formatConfirmationTimestamp(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });

  const parts = formatter.formatToParts(d);
  const getPart = type => parts.find(p => p.type === type)?.value || '';

  const day = getPart('day').padStart(2, '0');
  let month = getPart('month');
  if (month) {
    month = month.charAt(0).toUpperCase() + month.slice(1);
  }
  const year = getPart('year');
  let hour = getPart('hour').padStart(2, '0');
  if (hour === '24') hour = '00';
  const minute = getPart('minute').padStart(2, '0');
  const second = getPart('second').padStart(2, '0');

  return `Selesai, ${day} ${month} ${year}, ${hour}:${minute}:${second}`;
}

/**
 * Helper: Resolve submission timestamp for a module that has been submitted
 */
export function getModuleSubmissionTimestamp(moduleType, txs = []) {
  const candidateTimestamps = [];

  // 1. Check tx objects, their rawRecords, and their latestVerification
  for (const tx of txs) {
    if (tx.submittedAt) candidateTimestamps.push(tx.submittedAt);
    if (tx.latestVerification?.submittedAt) candidateTimestamps.push(tx.latestVerification.submittedAt);
    const raw = tx.rawRecord || {};
    if (raw.submittedAt) candidateTimestamps.push(raw.submittedAt);
  }

  // 2. Lookup in verification_transactions storage via storage wrapper
  try {
    const allVerifs = storage.get(VERIFICATION_STORAGE_KEY, []);
    for (const tx of txs) {
      const v = allVerifs.find(vr =>
        (vr.referenceId && String(vr.referenceId) === String(tx.id)) ||
        (vr.referenceDocNo && String(vr.referenceDocNo) === String(tx.docNo)) ||
        (vr.referenceType && String(vr.referenceType).toUpperCase() === String(tx.moduleType).toUpperCase()) ||
        (vr.referenceType && String(vr.referenceType).toUpperCase() === String(tx.referenceType || tx.activityType || '').toUpperCase())
      );
      if (v && v.submittedAt) {
        candidateTimestamps.push(v.submittedAt);
      }
    }

    // Module-level verif record
    const modVerifs = allVerifs.filter(vr =>
      vr.referenceType && (
        String(vr.referenceType).toUpperCase() === String(moduleType).toUpperCase() ||
        (moduleType === MODULE_TYPES.KEBUN_ENTRES && (String(vr.referenceType).toUpperCase() === 'MENUNAS' || String(vr.referenceType).toUpperCase() === 'TOPPING'))
      ) && vr.submittedAt
    );
    for (const mv of modVerifs) {
      candidateTimestamps.push(mv.submittedAt);
    }
  } catch (e) {
    // ignore
  }

  // 3. Lookup in individual transaction raw storage if available
  try {
    for (const tx of txs) {
      if (tx.storageKey && tx.storageKey !== 'virtual_tidak_hadir') {
        const records = storage.get(tx.storageKey, []);
        const r = records.find(rec => String(rec.id || rec.docNo || '') === String(tx.id));
        if (r && r.submittedAt) {
          candidateTimestamps.push(r.submittedAt);
        }
      }
    }
  } catch (e) {
    // ignore
  }

  // Filter valid timestamps and get the latest
  const validTimestamps = candidateTimestamps
    .filter(t => Boolean(t) && !isNaN(new Date(t).getTime()))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  if (validTimestamps.length > 0) {
    return formatConfirmationTimestamp(validTimestamps[0]);
  }

  return '';
}

function attachEvents(allTxs, user, currentSectionTitle) {
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

  // Info Icon (i) Click
  document.getElementById('btn-section-info')?.addEventListener('click', () => {
    toast(`Informasi Modul: ${currentSectionTitle} - Periksa rincian sebelum konfirmasi dan kirim data ke Asisten.`, 'info');
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

  // Submit Module Button — with loading modal (3 seconds) and success flow
  document.querySelectorAll('.btn-submit-module').forEach(btn => {
    btn.addEventListener('click', () => {
      const mType = btn.getAttribute('data-module');
      if (!mType) return;

      // Double-click protection
      if (isSubmitting) return;

      const isChecked = moduleCheckedStates.get(mType);
      if (!isChecked) {
        toast('Silakan centang pernyataan modul terlebih dahulu.', 'warning');
        return;
      }

      // Lock submission immediately
      isSubmitting = true;

      // Disable checkbox and button immediately
      const chk = document.getElementById(`chk-statement-${mType}`);
      if (chk) chk.disabled = true;
      btn.disabled = true;
      btn.style.background = '#D1D5DB';
      btn.style.color = '#9CA3AF';
      btn.style.cursor = 'not-allowed';
      btn.style.boxShadow = 'none';

      // Step 1: Execute existing submit logic FIRST
      let submitResult = null;
      let submitError = null;
      try {
        submitResult = submitModuleTransactions(mType, user);
      } catch (err) {
        submitError = err;
      }

      // Step 2: Show loading modal regardless (3 second simulation)
      showLoadingModal = true;
      showSuccessModal = false;
      renderMantriConfirmationLanding();

      // Step 3: After 3 seconds, show result
      setTimeout(() => {
        showLoadingModal = false;

        if (submitError || !submitResult || !submitResult.success || submitResult.submittedCount === 0) {
          // FAILURE: Reset state and show error
          isSubmitting = false;
          showSuccessModal = false;
          moduleCheckedStates.set(mType, true); // Preserve checkbox state for retry
          renderMantriConfirmationLanding();
          toast(submitError?.message || submitResult?.message || 'Data gagal dikirim ke Asisten Bibitan.', 'error');
          return;
        }

        // SUCCESS: Show success modal
        showSuccessModal = true;
        renderMantriConfirmationLanding();

        // Attach OK button handler for success modal
        const okBtn = document.getElementById('btn-success-ok');
        if (okBtn) {
          okBtn.addEventListener('click', () => {
            showSuccessModal = false;
            isSubmitting = false;
            moduleCheckedStates.set(mType, false);
            renderMantriConfirmationLanding();
          });
        }
      }, 3000);
    });
  });

  // Success Modal OK button (re-attach in case of re-render)
  const successOkBtn = document.getElementById('btn-success-ok');
  if (successOkBtn) {
    successOkBtn.addEventListener('click', () => {
      showSuccessModal = false;
      isSubmitting = false;
      renderMantriConfirmationLanding();
    });
  }
}
