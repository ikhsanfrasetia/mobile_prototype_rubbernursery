/**
 * modules/seeding/seeding-landing.js
 * Landing Hub for Penyemaian with Dual-Tab Architecture:
 * 1. 🌱 Dederan (Dokumen Induk Deder & Transaksi Dederan)
 * 2. 🌿 Pindah Semai (Consuming Eligible 100% Completed Dederan Inspection Results)
 *
 * Preserves all legacy downstream identifiers (seeding_transactions, seedings, SOW, etc.).
 */

import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { formatStandardDocNo, todayDDMMYYYY, esc } from '../../core/utils.js';
import { guardDependency } from '../../core/dependency-guard.js';
import {
  syncDederanIndukDocuments,
  getDederanIndukDocuments,
  getDederanTransactions,
  getDederanTransactionsByParent,
  getBedenganInspectionSummary,
  deleteDederanTransaction
} from './dederan-manager.js';
import { getEligiblePindahSemaiSources, getAllInspectedDederanSources } from './dederan-pindah-semai-adapter.js';
import { isTransactionLockedForMantri } from '../verification/mantri-confirmation-service.js';
import { hasExistingCullDeclarationForSeeding } from '../selection/selection-manager.js';
import { renderEmptyStateCard } from '../../components/empty-state.js';
import { toast } from '../../components/toast.js';
import { renderStatusDots } from '../../core/status-dot-renderer.js';
import {
  normalizeDateStr,
  renderCalendarHeaderButton,
  renderDateFilterBannerHtml,
  renderDatePickerModalHtml,
  attachDatePickerModalEvents
} from '../../components/date-filter-modal.js';

let activeTab = 'DEDERAN'; // 'DEDERAN' | 'PINDAH_SEMAI'
let selectedSeedingDate = todayDDMMYYYY();

export function setSelectedSeedingDate(dateStr) {
  selectedSeedingDate = normalizeDateStr(dateStr) || todayDDMMYYYY();
}

export function getSelectedSeedingDate() {
  return selectedSeedingDate;
}

export function renderSeedingLanding() {
  const app = document.getElementById('app');
  if (!app) return;

  // Sync Dederan Induk with Benih receipts (1:1)
  syncDederanIndukDocuments();

  const dederanIndukDocs = getDederanIndukDocuments();
  const dederanTxs = getDederanTransactions();
  const eligiblePindahSemai = getEligiblePindahSemaiSources();
  const allInspectedSources = getAllInspectedDederanSources();
  const pendingApprovalSources = allInspectedSources.filter(s => !s.isApproved);
  const seedingTxs = storage.get('seeding_transactions', []);

  // Counts for tab badges
  const pendingDederCount = dederanIndukDocs.filter(d => (d.sisaBelumDeder || 0) > 0).length;
  const pendingPindahCount = eligiblePindahSemai.filter(s => (s.remainingQty || 0) > 0).length;

  const todayStr = todayDDMMYYYY();
  const isFiltered = selectedSeedingDate !== todayStr;

  app.innerHTML = `
    <div class="page seeding-landing-page" style="display: flex; flex-direction: column; height: 100%; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;">
        <div style="display: flex; align-items: center;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 700; color: #0F172A; margin: 0 0 0 6px; letter-spacing: -0.01em;">Penyemaian & Dederan</h1>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; margin-right: -4px;">
          ${renderCalendarHeaderButton(selectedSeedingDate, isFiltered, 'btn-calendar-seeding')}
        </div>
      </header>

      <!-- DUAL TAB NAVIGATION -->
      <div style="display: flex; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 0 16px; gap: 16px;">
        <button id="tab-btn-dederan" type="button" style="padding: 12px 4px; font-size: 0.82rem; font-weight: ${activeTab === 'DEDERAN' ? '700' : '600'}; color: ${activeTab === 'DEDERAN' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeTab === 'DEDERAN' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <span>Germinasi</span>
          ${pendingDederCount > 0 ? `<span style="background: #116834; color: #FFFFFF; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${pendingDederCount}</span>` : ''}
        </button>

        <button id="tab-btn-pindah-semai" type="button" style="padding: 12px 4px; font-size: 0.82rem; font-weight: ${activeTab === 'PINDAH_SEMAI' ? '700' : '600'}; color: ${activeTab === 'PINDAH_SEMAI' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeTab === 'PINDAH_SEMAI' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <span>Pindah Semai</span>
          ${pendingPindahCount > 0 ? `<span style="background: #116834; color: #FFFFFF; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${pendingPindahCount}</span>` : ''}
        </button>
      </div>

      <!-- MAIN SCROLLABLE CONTENT -->
      <main style="flex: 1; overflow-y: auto; padding: 16px;">
        ${activeTab === 'DEDERAN' ? renderDederanTabContent(dederanIndukDocs, dederanTxs, isFiltered, selectedSeedingDate) : renderPindahSemaiTabContent(eligiblePindahSemai, seedingTxs, pendingApprovalSources, isFiltered, selectedSeedingDate)}
      </main>

      <!-- MODAL DATE PICKER -->
      ${renderDatePickerModalHtml({
        modalId: 'modal-seeding-date-picker',
        inputId: 'input-seeding-filter-date',
        activeDate: selectedSeedingDate,
        title: 'Pilih Tanggal Penyemaian & Dederan'
      })}

    </div>
  `;

  // Bind Event Listeners
  app.querySelector('#btn-back')?.addEventListener('click', () => {
    navigate('/home');
  });

  app.querySelector('#tab-btn-dederan')?.addEventListener('click', () => {
    activeTab = 'DEDERAN';
    renderSeedingLanding();
  });

  app.querySelector('#tab-btn-pindah-semai')?.addEventListener('click', () => {
    activeTab = 'PINDAH_SEMAI';
    renderSeedingLanding();
  });

  // Attach Date Picker Events
  attachDatePickerModalEvents({
    app,
    modalId: 'modal-seeding-date-picker',
    btnCalendarId: 'btn-calendar-seeding',
    inputId: 'input-seeding-filter-date',
    resetBtnId: 'btn-reset-date-seeding',
    emptyResetBtnId: 'btn-empty-reset-seeding',
    getActiveDate: () => selectedSeedingDate,
    onDateSelected: (newDate) => {
      selectedSeedingDate = newDate;
      renderSeedingLanding();
    },
    onResetToday: () => {
      selectedSeedingDate = todayDDMMYYYY();
      renderSeedingLanding();
    }
  });

  if (activeTab === 'DEDERAN') {
    attachDederanEvents(app);
  } else {
    attachPindahSemaiEvents(app);
  }
}

/**
 * Render Content for Tab 1: Dederan
 */
function renderDederanTabContent(indukDocs, dederanTxs = [], isFiltered = false, selectedDate = todayDDMMYYYY()) {
  if (indukDocs.length === 0) {
    return renderEmptyStateCard({
      title: 'Belum Ada Penerimaan Benih',
      description: 'Lakukan transaksi <strong>Penerimaan Benih / Biji Kelatak</strong> terlebih dahulu agar Dokumen Induk Deder otomatis terbentuk.'
    });
  }

  const filteredDederanTxs = dederanTxs.filter(tx => {
    const d = normalizeDateStr(tx.tanggalDeder || tx.tanggal || tx.date || tx.createdAt);
    return d === selectedDate;
  });

  return `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      
      <!-- SECTION 1: DOKUMEN INDUK DEDER -->
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${indukDocs.map((induk) => {
    const totalPenerimaan = induk.totalNilaiButirPenerimaan || 0;
    const totalDideder = induk.totalDidederSDHI || 0;
    const sisa = induk.sisaBelumDeder || 0;
    const isComplete = sisa === 0 && totalPenerimaan > 0;

    const activeFlags = [];
    if (isComplete) {
      activeFlags.push({ key: 'DEDER_SELESAI', label: 'Selesai Dideder (100%)' });
    } else if (totalDideder === 0) {
      activeFlags.push({ key: 'DEDER_BELUM', label: 'Belum Dideder' });
    } else {
      activeFlags.push({ key: 'DEDER_SISA', label: `Sisa ${sisa.toLocaleString('id-ID')} Butir` });
    }

    return `
            <div class="card-dederan-induk" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); display: flex; flex-direction: column; gap: 10px; min-width: 0;">
              
              <!-- HEADER: DOC NO & STATUS BADGE -->
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <div style="min-width: 0; flex: 1; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  ${renderStatusDots(activeFlags)}
                  <strong style="font-size: 1.02rem; font-weight: 800; color: #0F172A; letter-spacing: -0.01em; word-break: break-word;">${induk.docNo}</strong>
                </div>
              </div>

              <!-- SUBTITLE METADATA -->
              <div style="font-size: 0.74rem; color: #64748B; line-height: 1.4;">
                <div>Asal Penerimaan: <strong style="color: #1E293B;">${induk.sourceReceiptDocNo}</strong></div>
                <div style="margin-top: 2px;">Klon: <strong style="color: #116834;">${induk.klon || 'GT 1'}</strong> • Tgl: ${induk.tanggalPenerimaan || '-'}</div>
              </div>

              <!-- METRIC GRID 3-KOLOM -->
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 6px; text-align: center;">
                <div>
                  <div style="font-size: 0.65rem; color: #64748B; font-weight: 600;">Total Penerimaan</div>
                  <div style="font-size: 0.85rem; font-weight: 800; color: #0F172A; margin-top: 2px;">
                    ${totalPenerimaan.toLocaleString('id-ID')}
                  </div>
                </div>
                <div>
                  <div style="font-size: 0.65rem; color: #116834; font-weight: 600;">Sudah Dideder</div>
                  <div style="font-size: 0.85rem; font-weight: 800; color: #116834; margin-top: 2px;">
                    ${totalDideder.toLocaleString('id-ID')}
                  </div>
                </div>
                <div>
                  <div style="font-size: 0.65rem; color: ${sisa > 0 ? '#D97706' : '#64748B'}; font-weight: 600;">Sisa Belum Deder</div>
                  <div style="font-size: 0.85rem; font-weight: 800; color: ${sisa > 0 ? '#D97706' : '#116834'}; margin-top: 2px;">
                    ${sisa.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>

              <!-- ACTION BUTTON -->
              <div>
                ${sisa > 0 ? `
                  <button type="button" class="btn-tambah-deder" data-doc="${induk.docNo}" style="width: 100%; height: 40px; background: #116834; color: #FFFFFF; border: none; border-radius: 8px; font-weight: 700; font-size: 0.80rem; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(17,104,52,0.2); transition: all 0.15s ease;">
                    Rekam Data Dederan
                  </button>
                ` : `
                  <div style="width: 100%; height: 38px; background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0; border-radius: 8px; font-weight: 700; font-size: 0.78rem; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">
                    Seluruh Benih Telah Selesai Dideder
                  </div>
                `}
              </div>

            </div>
          `;
  }).join('')}
      </div>

      <!-- SECTION 2: RINGKASAN TRANSAKSI DEDERAN -->
      <div>
        ${renderDateFilterBannerHtml(selectedDate, isFiltered, 'btn-reset-date-seeding')}

        <div style="margin-bottom: 10px;">
          <h2 style="font-size: 0.92rem; font-weight: 700; color: #0F172A; margin: 0;">
            Ringkasan Transaksi Dederan (${filteredDederanTxs.length})
          </h2>
        </div>

        ${filteredDederanTxs.length === 0 ? `
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px 16px; text-align: center; font-size: 0.78rem; color: #64748B;">
            Tidak ada transaksi Dederan pada tanggal ${esc(selectedDate)}.
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${filteredDederanTxs.map((tx, idx) => {
    const inspSummary = getBedenganInspectionSummary(tx);
    const hasInspection = inspSummary.totalDiperiksa > 0;

    const activeDederFlags = [];
    if (inspSummary.isComplete) {
      activeDederFlags.push({ key: 'INSP_DEDER_DONE', label: 'Selesai Periksa' });
    } else if (inspSummary.totalDiperiksa > 0) {
      activeDederFlags.push({ key: 'INSP_DEDER_PARTIAL', label: `${inspSummary.totalDiperiksa}/${tx.jumlahDeder} Diperiksa` });
    }

    return `
                <div class="card-summary-wrapper" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; font-size: 0.78rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03); position: relative;">
                  
                  <!-- IDENTITAS DOKUMEN & 3-DOTS ACTION -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <div style="flex: 1; min-width: 0;">
                      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        ${renderStatusDots(activeDederFlags)}
                        <span style="font-weight: 800; font-size: 0.92rem; color: #0F172A; letter-spacing: -0.01em;">${tx.docNo}</span>
                      </div>
                      
                      <div style="font-size: 0.74rem; color: #64748B; margin-top: 4px; line-height: 1.3;">
                        Dok. Induk: <strong style="color: #334155;">${tx.parentDederIndukDocNo || '-'}</strong> • Klon: <strong style="color: #116834;">${tx.klon || 'GT 1'}</strong>
                      </div>
                      <div style="font-size: 0.74rem; color: #64748B; margin-top: 2px; line-height: 1.3;">
                        Bedengan: <strong style="color: #0F172A;">${tx.bedenganCode || tx.bedengan || 'BED-001'}</strong> • Tgl: ${tx.tanggalDeder || tx.tanggal || '-'}
                      </div>
                    </div>

                    <!-- 3-DOTS ACTION TRIGGER -->
                    <div style="position: relative; flex-shrink: 0; margin-left: 8px;">
                      <button type="button" class="btn-tx-action-trigger" data-index="${idx}" aria-label="Menu Aksi" style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #4B5563; padding: 0;">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="1.2" fill="currentColor"></circle>
                          <circle cx="19" cy="12" r="1.2" fill="currentColor"></circle>
                          <circle cx="5" cy="12" r="1.2" fill="currentColor"></circle>
                        </svg>
                      </button>

                      <!-- POPUP MENU -->
                      <div class="tx-action-menu" style="display: none; position: absolute; right: 0; top: 32px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.14); z-index: 100; min-width: 140px; overflow: hidden;">
                        ${hasInspection ? `
                          <button type="button" class="menu-action-locked" style="width: 100%; padding: 8px 12px; text-align: left; background: #FAFAFA; border: none; font-size: 0.75rem; font-weight: 600; color: #9CA3AF; cursor: not-allowed;">
                            <span>Hapus (Terkunci)</span>
                          </button>
                        ` : `
                          <button type="button" class="menu-action-delete-deder" data-doc="${tx.docNo}" data-index="${idx}" style="width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; font-size: 0.75rem; font-weight: 600; color: #DC2626; display: flex; align-items: center; gap: 8px; cursor: pointer;">
                            <svg viewBox="0 0 24 24" width="13" height="13" stroke="#DC2626" stroke-width="2.2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            <span>Hapus</span>
                          </button>
                        `}
                      </div>
                    </div>
                  </div>

                  <!-- METRICS CONTAINER -->
                  <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                    <div>
                      <span style="font-size: 0.68rem; color: #64748B;">Jumlah Dideder</span>
                      <div style="font-size: 0.84rem; font-weight: 800; color: #116834; margin-top: 1px;">
                        ${(tx.jumlahDeder || 0).toLocaleString('id-ID')} Butir
                      </div>
                    </div>
                    <div style="text-align: right;">
                      <span style="font-size: 0.68rem; color: #64748B;">Hasil Periksa</span>
                      <div style="font-size: 0.80rem; font-weight: 700; color: ${inspSummary.totalDiperiksa > 0 ? '#15803D' : '#64748B'}; margin-top: 1px;">
                        ${inspSummary.totalDiperiksa > 0 ? `${inspSummary.totalBerhasil.toLocaleString('id-ID')} Berhasil` : 'Belum Diperiksa'}
                      </div>
                    </div>
                  </div>

                </div>
              `;
  }).join('')}
          </div>
        `}
      </div>

    </div>
  `;
}

/**
 * Render Content for Tab 2: Pindah Semai (Source strictly from Dederan Inspection Berhasil + Seleksi DISETUJUI)
 */
export function renderPindahSemaiTabContent(eligibleSources = [], seedingTxs = [], pendingApprovalSources = [], isFiltered = false, selectedDate = todayDDMMYYYY()) {
  const totalSourceExistence = (eligibleSources?.length || 0) + (pendingApprovalSources?.length || 0);

  const filteredSeedingTxs = seedingTxs.filter(stx => {
    const d = normalizeDateStr(stx.date || stx.tanggal || stx.createdAt);
    return d === selectedDate;
  });

  return `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      
      <!-- SECTION 1: ELIGIBLE SOURCES FOR PINDAH SEMAI (APPROVED BY ASISTEN) -->
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 10px;">
          <h2 style="font-size: 0.90rem; font-weight: 700; color: #0F172A; margin: 0; letter-spacing: -0.01em; min-width: 0; flex: 1;">
            Bedengan Siap Pindah Semai
          </h2>
          <span style="font-size: 0.68rem; font-weight: 700; background: #E2E8F0; color: #475569; padding: 2px 8px; border-radius: 9999px; flex-shrink: 0; white-space: nowrap;">
            ${eligibleSources.length}
          </span>
        </div>

        ${totalSourceExistence === 0 ? renderEmptyStateCard({
          title: 'Belum Ada Sumber Siap Pindah Semai',
          description: 'Hasil Dederan 100% selesai diperiksa dan telah disetujui Asisten Bibitan akan tampil di sini.',
          customStyle: 'padding: 24px 16px;'
        }) : (eligibleSources.length > 0 ? `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${eligibleSources.map((src, idx) => {
              const isCompleted = (src.remainingQty || 0) === 0;
              const docNumber = src.dederanTxDocNo || src.docNo || '-';
              const parentDoc = src.parentDederIndukDocNo || '-';
              const klonVal = src.klon || '-';
              const bedenganVal = src.bedenganCode || src.bedengan || '-';
              const tanggalVal = src.tanggal || '-';
              const totalBerhasil = (src.totalBerhasil || 0).toLocaleString('id-ID');
              const remainingQty = (src.remainingQty || 0).toLocaleString('id-ID');

              return `
                <div class="card-summary-wrapper card-pindah-semai-wrapper" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; font-size: 0.78rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03); position: relative; width: 100%; box-sizing: border-box;">
                  
                  <!-- IDENTITAS DOKUMEN & 3-DOTS ACTION -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <div style="flex: 1; min-width: 0;">
                      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        ${renderStatusDots([{ key: 'SELECTION_APPROVED', label: 'Disetujui Siap Pindah Semai' }])}
                        <span style="font-weight: 800; font-size: 0.92rem; color: #0F172A; letter-spacing: -0.01em; word-break: break-word;">${esc(docNumber)}</span>
                      </div>
                      
                      <!-- METADATA (BARIS KEDUA & KETIGA MENGIKUTI HIERARCHY GERMINASI) -->
                      <div style="font-size: 0.74rem; color: #64748B; margin-top: 4px; line-height: 1.35;">
                        Dok. Induk: <strong style="color: #334155; font-weight: 600;">${esc(parentDoc)}</strong> • Klon: <strong style="color: #116834; font-weight: 600;">${esc(klonVal)}</strong>
                      </div>
                      <div style="font-size: 0.74rem; color: #64748B; margin-top: 2px; line-height: 1.35;">
                        Bedengan: <strong style="color: #0F172A; font-weight: 600;">${esc(bedenganVal)}</strong> • Tgl: <span style="color: #475569; font-weight: 500;">${esc(tanggalVal)}</span>
                      </div>
                    </div>

                    <!-- 3-DOTS ACTION TRIGGER -->
                    <div style="position: relative; flex-shrink: 0; margin-left: 10px;">
                      <button type="button" class="btn-tx-action-trigger" data-index="${idx}" aria-label="Menu Aksi" style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #4B5563; padding: 0;">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="1.2" fill="currentColor"></circle>
                          <circle cx="19" cy="12" r="1.2" fill="currentColor"></circle>
                          <circle cx="5" cy="12" r="1.2" fill="currentColor"></circle>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <!-- METRICS CONTAINER -->
                  <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                    <div>
                      <span style="font-size: 0.68rem; color: #64748B; display: block; margin-bottom: 2px;">Jumlah Hasil Deder</span>
                      <div style="font-size: 0.84rem; font-weight: 800; color: #0F172A; line-height: 1.2;">
                        ${totalBerhasil} Butir
                      </div>
                    </div>
                    <div style="text-align: right;">
                      <span style="font-size: 0.68rem; color: #64748B; display: block; margin-bottom: 2px;">Belum Pindah Semai</span>
                      <div style="font-size: 0.84rem; font-weight: 800; color: #116834; line-height: 1.2;">
                        ${remainingQty} Butir
                      </div>
                    </div>
                  </div>

                  <!-- PRIMARY ACTION -->
                  <div style="margin-top: 8px;">
                    ${!isCompleted ? `
                      <button type="button" class="btn-execute-pindah-semai" data-source-id="${esc(src.sourceIndex)}" style="width: 100%; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 8px; font-weight: 700; font-size: 0.80rem; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(17,104,52,0.2); text-align: center; transition: all 0.15s ease;">
                        Proses Pindah Semai (Polybag)
                      </button>
                    ` : `
                      <div style="width: 100%; height: 36px; background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0; border-radius: 8px; font-weight: 700; font-size: 0.78rem; display: flex; align-items: center; justify-content: center; box-sizing: border-box;">
                        Seluruh Bibit Telah Selesai Pindah Semai
                      </div>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : '')}
      </div>

      <!-- SECTION 1B: INFORMATIONAL QUEUE - MENUNGGU PERSETUJUAN ASISTEN BIBITAN -->
      ${pendingApprovalSources.length > 0 ? `
        <div>
          
          <!-- SECTION HEADER: TITLE & COUNT BADGE -->
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 10px;">
            <h2 style="font-size: 0.90rem; font-weight: 700; color: #0F172A; margin: 0; letter-spacing: -0.01em; min-width: 0; flex: 1;">
              Menunggu Persetujuan Asisten
            </h2>
            <span style="font-size: 0.68rem; font-weight: 700; background: #E2E8F0; color: #475569; padding: 2px 8px; border-radius: 9999px; flex-shrink: 0; white-space: nowrap;">
              ${pendingApprovalSources.length} Bedengan
            </span>
          </div>

          <!-- DIRECT CARDS LIST (WITHOUT HEAVY GRAY PARENT WRAPPER) -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${pendingApprovalSources.map((psrc, idx) => {
              const docNumber = psrc.dederanTxDocNo || psrc.docNo || '-';
              const parentDoc = psrc.parentDederIndukDocNo || '-';
              const klonVal = psrc.klon || '-';
              const bedenganVal = psrc.bedenganCode || psrc.bedengan || '-';
              const tanggalVal = psrc.tanggal || '-';
              const totalBerhasil = (psrc.totalBerhasil || 0).toLocaleString('id-ID');
              const totalTidakBerhasil = (psrc.totalTidakBerhasil || 0).toLocaleString('id-ID');

              return `
                <div class="card-summary-wrapper card-waiting-approval" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; font-size: 0.78rem; box-shadow: 0 1px 3px rgba(0,0,0,0.03); position: relative; width: 100%; box-sizing: border-box;">
                  
                  <!-- IDENTITAS DOKUMEN & 3-DOTS ACTION -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <div style="flex: 1; min-width: 0;">
                      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        ${renderStatusDots([{ key: 'PINDAH_SEMAI_WAIT', label: psrc.selectionStatusLabel || 'Menunggu Persetujuan Pemeriksaan' }])}
                        <span style="font-weight: 800; font-size: 0.92rem; color: #0F172A; letter-spacing: -0.01em; word-break: break-word;">${esc(docNumber)}</span>
                      </div>
                      
                      <!-- METADATA (BARIS KEDUA & KETIGA MENGIKUTI HIERARCHY GERMINASI) -->
                      <div style="font-size: 0.74rem; color: #64748B; margin-top: 4px; line-height: 1.35;">
                        Dok. Induk: <strong style="color: #334155; font-weight: 600;">${esc(parentDoc)}</strong> • Klon: <strong style="color: #116834; font-weight: 600;">${esc(klonVal)}</strong>
                      </div>
                      <div style="font-size: 0.74rem; color: #64748B; margin-top: 2px; line-height: 1.35;">
                        Bedengan: <strong style="color: #0F172A; font-weight: 600;">${esc(bedenganVal)}</strong> • Tgl: <span style="color: #475569; font-weight: 500;">${esc(tanggalVal)}</span>
                      </div>
                    </div>

                    <!-- 3-DOTS ACTION TRIGGER -->
                    <div style="position: relative; flex-shrink: 0; margin-left: 10px;">
                      <button type="button" class="btn-tx-action-trigger" data-index="${idx}" aria-label="Menu Aksi" style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #4B5563; padding: 0;">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="1.2" fill="currentColor"></circle>
                          <circle cx="19" cy="12" r="1.2" fill="currentColor"></circle>
                          <circle cx="5" cy="12" r="1.2" fill="currentColor"></circle>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <!-- METRICS CONTAINER -->
                  <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                    <div>
                      <span style="font-size: 0.68rem; color: #64748B; display: block; margin-bottom: 2px;">Hasil Layak</span>
                      <div style="font-size: 0.84rem; font-weight: 800; color: #0F172A; line-height: 1.2;">
                        ${totalBerhasil} Butir
                      </div>
                    </div>
                    <div style="text-align: right;">
                      <span style="font-size: 0.68rem; color: #64748B; display: block; margin-bottom: 2px;">Afkir</span>
                      <div style="font-size: 0.80rem; font-weight: 700; color: #DC2626; line-height: 1.2;">
                        ${totalTidakBerhasil} Butir
                      </div>
                    </div>
                  </div>

                </div>
              `;
            }).join('')}
          </div>

        </div>
      ` : ''}

      <!-- SECTION 2: RINGKASAN DATA TRANSAKSI -->
      <div>
        ${renderDateFilterBannerHtml(selectedDate, isFiltered, 'btn-reset-date-seeding')}

        <div style="margin-bottom: 12px;">
          <h2 style="font-size: 0.92rem; font-weight: 700; color: #0F172A; margin: 0; letter-spacing: -0.01em;">
            Ringkasan Data Transaksi (${filteredSeedingTxs.length})
          </h2>
        </div>

        ${filteredSeedingTxs.length === 0 ? renderEmptyStateCard({
    title: `Belum Ada Transaksi Pindah Semai pada ${isFiltered ? selectedDate : 'hari ini'}`,
    description: 'Transaksi Pindah Semai yang telah dicatat akan tampil pada daftar ini.'
  }) : `
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${filteredSeedingTxs.map((stx, idx) => {
              const isPindahLocked = isTransactionLockedForMantri(stx) || hasExistingCullDeclarationForSeeding(stx);
              const rawDitolak = (stx.ditolak !== undefined && stx.ditolak !== null && stx.ditolak !== '')
                ? stx.ditolak
                : (stx.jumlahDitolak !== undefined && stx.jumlahDitolak !== null && stx.jumlahDitolak !== '')
                  ? stx.jumlahDitolak
                  : 0;
              const ditolakQty = parseInt(rawDitolak, 10) || 0;
              return `
              <div class="card-summary-wrapper card-pindah-summary-wrapper" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 16px; font-size: 0.78rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); position: relative; display: flex; flex-direction: column; gap: 10px;">
                
                <!-- HEADER BARIS 1: NO DOKUMEN & 3-DOTS -->
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    ${isPindahLocked ? renderStatusDots([{
                      key: stx.status === 'DISETUJUI' || stx.verificationStatus === 'TERVERIFIKASI' ? 'CENTRAL_TERVERIFIKASI' : 'TX_LOCKED_VERIF',
                      label: stx.status === 'DISETUJUI' || stx.verificationStatus === 'TERVERIFIKASI' ? 'Terverifikasi' : 'Menunggu Verifikasi (Terkunci)'
                    }]) : ''}
                    <span style="font-weight: 800; font-size: 0.95rem; color: #0F172A; letter-spacing: -0.01em;">${esc(stx.docNo || `2026/SOW/0${idx + 1}`)}</span>
                    <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; background: #E8F5E9; color: #116834; border: 1px solid #C8E6C9;">
                      Pindah Semai
                    </span>
                  </div>

                  <!-- 3-DOTS ACTION TRIGGER -->
                  ${!isPindahLocked ? `
                    <div style="position: relative; flex-shrink: 0;">
                      <button type="button" class="btn-pindah-action-trigger" data-index="${idx}" aria-label="Menu Aksi" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #475569; padding: 0; transition: background 0.15s ease;">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
                          <circle cx="12" cy="12" r="1.2" fill="currentColor"></circle>
                          <circle cx="19" cy="12" r="1.2" fill="currentColor"></circle>
                          <circle cx="5" cy="12" r="1.2" fill="currentColor"></circle>
                        </svg>
                      </button>

                      <!-- POPUP MENU -->
                      <div class="pindah-action-menu" style="display: none; position: absolute; right: 0; top: 36px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.18), 0 8px 10px -6px rgba(0,0,0,0.08); z-index: 1000; min-width: 140px; overflow: hidden;">
                        <button type="button" class="menu-action-edit-pindah" data-index="${idx}" data-doc="${esc(stx.docNo || '')}" style="width: 100%; padding: 10px 14px; text-align: left; background: #FFFFFF; border: none; font-size: 0.78rem; font-weight: 600; color: #1E293B; display: flex; align-items: center; gap: 8px; cursor: pointer; border-bottom: 1px solid #F1F5F9; transition: background 0.15s ease;">
                          <svg viewBox="0 0 24 24" width="14" height="14" stroke="#2563EB" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                          <span>Edit</span>
                        </button>
                        <button type="button" class="menu-action-delete-pindah" data-index="${idx}" data-doc="${esc(stx.docNo || '')}" style="width: 100%; padding: 10px 14px; text-align: left; background: #FFFFFF; border: none; font-size: 0.78rem; font-weight: 600; color: #DC2626; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: background 0.15s ease;">
                          <svg viewBox="0 0 24 24" width="14" height="14" stroke="#DC2626" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="pointer-events: none;">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  ` : ''}
                </div>

                <!-- HARMONIZED STRUCTURED METADATA (2-COLUMN GRID) -->
                <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 8px;">
                  
                  <!-- GRID 2x2: Dederan, Klon, Bedengan, Batch -->
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; font-size: 0.74rem;">
                    <div style="min-width: 0;">
                      <span style="font-size: 0.67rem; color: #64748B; display: block; margin-bottom: 2px;">Sumber Dederan</span>
                      <strong style="color: #1E293B; font-size: 0.78rem; word-break: break-word;">${esc(stx.sourceDocNo || '-')}</strong>
                    </div>
                    <div style="min-width: 0;">
                      <span style="font-size: 0.67rem; color: #64748B; display: block; margin-bottom: 2px;">Klon</span>
                      <strong style="color: #116834; font-size: 0.78rem; word-break: break-word;">${esc(stx.klon || stx.klonAwal || stx.rows?.[0]?.klon || 'GT 1')}</strong>
                    </div>
                    <div style="min-width: 0;">
                      <span style="font-size: 0.67rem; color: #64748B; display: block; margin-bottom: 2px;">Bedengan Semai</span>
                      <strong style="color: #0F172A; font-size: 0.78rem; word-break: break-word;">${esc(stx.bedengan || '-')}</strong>
                    </div>
                    <div style="min-width: 0;">
                      <span style="font-size: 0.67rem; color: #64748B; display: block; margin-bottom: 2px;">Kode Batch</span>
                      <strong style="color: #0284C7; font-size: 0.78rem; word-break: break-word;">${esc(stx.batchCode || stx.batchNo || stx.rows?.[0]?.batchCode || stx.rows?.[0]?.batchNo || '-')}</strong>
                    </div>
                  </div>

                  <!-- TGL TRANSAKSI & ISSUE SECTION -->
                  <div style="border-top: 1px solid #E2E8F0; padding-top: 7px; display: flex; flex-direction: column; gap: 6px; font-size: 0.74rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-size: 0.68rem; color: #64748B;">Tanggal Transaksi:</span>
                      <strong style="color: #334155; font-size: 0.76rem;">${esc(stx.date || '-')}</strong>
                    </div>

                    ${stx.issueDocNo ? `
                    <div>
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 0.68rem; color: #64748B;">Dokumen Issue:</span>
                        <strong style="color: #0F766E; font-size: 0.76rem; font-family: monospace;">${esc(stx.issueDocNo)}</strong>
                      </div>
                      ${stx.itemCode ? `
                        <div style="font-size: 0.70rem; color: #334155; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 5px; padding: 4px 8px; margin-top: 4px; line-height: 1.35; font-weight: 600;">
                          ${esc(stx.itemName || stx.itemCode)}
                        </div>
                      ` : ''}
                    </div>
                    ` : ''}
                  </div>

                </div>

                <!-- METRICS CONTAINER -->
                <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px; display: flex; flex-direction: column; gap: 8px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <span style="font-size: 0.68rem; color: #64748B; font-weight: 500;">Bibit Disemai</span>
                      <div style="font-size: 0.88rem; font-weight: 800; color: #116834; margin-top: 2px;">
                        ${(stx.totalDisemai || 0).toLocaleString('id-ID')} Pkk
                      </div>
                    </div>
                    <div style="text-align: right;">
                      <span style="font-size: 0.68rem; color: #64748B; font-weight: 500;">Polybag Terisi</span>
                      <div style="font-size: 0.88rem; font-weight: 800; color: #0F172A; margin-top: 2px;">
                        ${(stx.totalPolybag || 0).toLocaleString('id-ID')} Ply
                      </div>
                    </div>
                  </div>

                  ${ditolakQty > 0 ? `
                    <div style="border-top: 1px dashed #CBD5E1; padding-top: 6px; display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-size: 0.68rem; color: #64748B; font-weight: 500;">Jumlah Ditolak/Seleksi</span>
                      <div style="font-size: 0.82rem; font-weight: 800; color: #DC2626;">
                        ${ditolakQty.toLocaleString('id-ID')} Pkk
                      </div>
                    </div>
                  ` : ''}
                </div>

              </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

    </div>
  `;
}

/**
 * Event bindings for Dederan Tab
 */
function attachDederanEvents(app) {
  // Tambah Dederan
  app.querySelectorAll('.btn-tambah-deder').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const docNo = e.currentTarget.dataset.doc;
      storage.set('active_dederan_parent_doc', docNo);
      storage.remove('scanned_dederan_bedengan_id');
      storage.remove('scanned_dederan_bedengan_code');
      storage.remove('scanned_dederan_bedengan_name');
      navigate('/seeding/dederan/scan');
    });
  });

  // 3-Dots Action Trigger Popovers
  app.querySelectorAll('.btn-tx-action-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = e.currentTarget.closest('div');
      const menu = parent?.querySelector('.tx-action-menu');
      const isVisible = menu && menu.style.display === 'block';

      // Close all other open menus first
      app.querySelectorAll('.tx-action-menu').forEach(m => {
        m.style.display = 'none';
      });

      if (menu && !isVisible) {
        menu.style.display = 'block';
      }
    });
  });

  // Delete Dederan Transaction
  app.querySelectorAll('.menu-action-delete-deder').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const docNo = e.currentTarget.dataset.doc;
      if (!confirm(`Apakah Anda yakin ingin menghapus transaksi Dederan '${docNo}'?`)) {
        return;
      }

      const res = deleteDederanTransaction(docNo);
      if (res.success) {
        toast('Transaksi Dederan berhasil dihapus', 'success');
        renderSeedingLanding();
      } else {
        toast(res.error || 'Gagal menghapus transaksi', 'error');
      }
    });
  });

  // Close menus on click outside within app
  app.addEventListener('click', (e) => {
    if (!e.target.closest('.btn-tx-action-trigger') && !e.target.closest('.tx-action-menu')) {
      app.querySelectorAll('.tx-action-menu').forEach(m => {
        m.style.display = 'none';
      });
    }
  });
}

/**
 * Event bindings for Pindah Semai Tab
 */
function attachPindahSemaiEvents(app) {
  // Expand / Collapse Toggle Data
  app.querySelectorAll('.btn-toggle-pindah-expand').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const card = e.currentTarget.closest('.card-pindah-semai-wrapper');
      const content = card?.querySelector('.pindah-expandable-content');
      const textSpan = e.currentTarget.querySelector('.toggle-text');
      const icon = e.currentTarget.querySelector('.toggle-icon');

      if (content) {
        const isHidden = content.style.display === 'none' || !content.style.display;
        if (isHidden) {
          content.style.display = 'flex';
          if (textSpan) textSpan.textContent = 'Tutup Rincian Data';
          if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
          content.style.display = 'none';
          if (textSpan) textSpan.textContent = 'Lihat Rincian Data';
          if (icon) icon.style.transform = 'rotate(0deg)';
        }
      }
    });
  });

  // 3-Dots Action Trigger Popovers for Pindah Semai Cards
  app.querySelectorAll('.btn-pindah-action-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wrapper = e.currentTarget.closest('.card-pindah-summary-wrapper');
      const menu = wrapper?.querySelector('.pindah-action-menu');
      app.querySelectorAll('.pindah-action-menu').forEach(m => {
        if (m !== menu) m.style.display = 'none';
      });
      if (menu) {
        menu.style.display = (menu.style.display === 'none' || !menu.style.display) ? 'block' : 'none';
      }
    });
  });

  // Close menus on outside click
  document.addEventListener('click', () => {
    app.querySelectorAll('.pindah-action-menu').forEach(m => {
      m.style.display = 'none';
    });
  });

  // Proses Pindah Semai
  app.querySelectorAll('.btn-execute-pindah-semai').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sourceId = e.currentTarget.dataset.sourceId;
      storage.set('seeding_source_index', sourceId);
      storage.set('editing_seeding_index', null);
      storage.remove('scanned_bedengan');
      navigate('/seeding/scan');
    });
  });

  // Edit Pindah Semai Transaction
  app.querySelectorAll('.menu-action-edit-pindah').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      const txs = storage.get('seeding_transactions', []);
      const stx = txs[idx];
      if (!stx) {
        toast('Data transaksi tidak ditemukan', 'error');
        return;
      }

      if (isTransactionLockedForMantri(stx) || hasExistingCullDeclarationForSeeding(stx)) {
        toast('Transaksi tidak dapat diubah karena sedang dalam proses verifikasi Asisten Bibitan atau sudah disetujui.', 'error');
        return;
      }

      // Set edit mode session keys
      storage.set('editing_seeding_index', idx);
      storage.set('seeding_source_index', stx.sourceIndex || stx.sourceDederTxId || stx.sourceDocNo || stx.dederanTxDocNo);
      storage.set('scanned_bedengan_id', stx.bedenganId || null);
      storage.set('scanned_bedengan_code', stx.bedenganCode || null);
      storage.set('scanned_bedengan_name', stx.bedengan || null);

      if (stx.issueDocNo) {
        storage.set('selected_issue_doc_no', stx.issueDocNo);
        storage.set('selected_issue_item_id', stx.issueItemId || null);
        storage.set('selected_issue_item_code', stx.itemCode || null);
        storage.set('selected_issue_item_name', stx.itemName || null);
        storage.set('selected_issue_uom', stx.uom || 'LBR');
      }

      navigate('/seeding/form');
    });
  });

  // Delete Pindah Semai Transaction
  app.querySelectorAll('.menu-action-delete-pindah').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      const docNo = e.currentTarget.dataset.doc;
      const txs = storage.get('seeding_transactions', []);
      const stx = txs[idx];

      if (isTransactionLockedForMantri(stx) || hasExistingCullDeclarationForSeeding(stx)) {
        toast('Transaksi tidak dapat dihapus karena sedang dalam proses verifikasi Asisten Bibitan atau sudah disetujui.', 'error');
        return;
      }

      if (!confirm(`Apakah Anda yakin ingin menghapus transaksi Pindah Semai '${docNo}'?`)) {
        return;
      }

      if (idx >= 0 && idx < txs.length) {
        txs.splice(idx, 1);
        storage.set('seeding_transactions', txs);
        toast('Transaksi Pindah Semai berhasil dihapus', 'success');
        renderSeedingLanding();
      }
    });
  });
}

