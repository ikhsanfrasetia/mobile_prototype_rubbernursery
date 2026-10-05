/**
 * js/modules/selection/selection-landing.js
 * Landing Page & Execution Module: Pemeriksaan Hasil Seleksi (Role Asisten Bibitan) & Penyeleksian (Mantri)
 * 
 * Prinsip:
 * - ASISTEN_BIBITAN: Memeriksa hasil seleksi (Menunggu Pemeriksaan vs Riwayat Pemeriksaan), Approve, Return.
 * - MANTRI_TANAMAN: Menginput / mendeklarasikan hasil seleksi.
 * - PENTING: ZERO STOCK MUTATION pada tahapan ASB-09 (Mutasi stok ditunda ke ASB-13).
 */

import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { session } from '../../core/session.js';
import { formatDate, formatStandardDocNo, esc, todayDDMMYYYY } from '../../core/utils.js';
import { getCurrentUserContext, resolveUserContext, normalizeRole, ROLES } from '../../core/user-context.js';
import { openModal, closeModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { renderStatusDots } from '../../core/status-dot-renderer.js';
import { getGlobalAttendanceGateStatus, showAttendanceRequirementModal } from '../../core/attendance-gate-service.js';
import {
  normalizeDateStr,
  renderCalendarHeaderButton,
  renderDateFilterBannerHtml,
  renderDatePickerModalHtml,
  attachDatePickerModalEvents
} from '../../components/date-filter-modal.js';
import {
  syncAllDederanRejectionsToSelectionPool
} from '../seeding/dederan-manager.js';

let selectedSelectionDate = todayDDMMYYYY();

export function setSelectedSelectionDate(dateStr) {
  selectedSelectionDate = normalizeDateStr(dateStr) || todayDDMMYYYY();
}

export function getSelectedSelectionDate() {
  return selectedSelectionDate;
}
import {
  SELECTION_STATUS,
  SELECTION_STAGES,
  SELECTION_TYPES,
  STOCK_MUTATION_STATUS,
  SELECTION_STORAGE_KEY,
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  filterSelectionByScope,
  getActionableSelectionCount,
  canPerformAsistenSelectionAction,
  approveSelectionRecord,
  returnSelectionRecord,
  createSelectionRecord,
  declareSelectionItem,
  findExistingSelectionTransaction,
  mutateStockFromSelection,
  syncAllSeedingsToSelectionPool,
  getSelectionSourceLabel,
  getSelectionCategoryLabel,
  getSelectionStageLabel,
  isPreGraftingSelection,
  isPostGraftingSelection,
  formatBedenganDisplayCode,
  saveSelectionDocumentationPhoto,
  getSelectionPhotos,
  getSelectionPhotosByDocNo,
  createPreGraftingSelectionDocument,
  getPreGraftingSelectionDocuments,
  getPreGraftingSelectionDocumentById,
  setPreGraftingSelectionDocumentCompletion,
  submitPreGraftingSelectionDocumentToAsisten,
  approvePreGraftingSelectionDocument,
  returnPreGraftingSelectionDocument,
  validatePreGraftingSelectionCompletion,
  canCreatePreGraftingSelection1Document,
  canCreateSelection2Document,
  createSelection2DocumentFromSelection1,
  canCreateSelection3Document,
  createSelection3DocumentFromSelection2,
  syncAllSeedingsToPreGraftingSelectionDocuments,
  getSeleksi1ExecutionsByDocument,
  getBedenganScopeStatusForSeleksi1,
  validateSeleksi1Execution,
  createSeleksi1ExecutionTransaction,
  deleteSeleksi1ExecutionTransaction,
  getSeleksi2ExecutionsByDocument,
  getBedenganScopeStatusForSeleksi2,
  validateSeleksi2Execution,
  createSeleksi2ExecutionTransaction,
  deleteSeleksi2ExecutionTransaction,
  getSeleksi3ExecutionsByDocument,
  getBedenganScopeStatusForSeleksi3,
  validateSeleksi3Execution,
  createSeleksi3ExecutionTransaction,
  updateSeleksi3ExecutionTransaction,
  deleteSeleksi3ExecutionTransaction,
  getSeleksi3Metrics
} from './selection-manager.js';
import { guardDependency } from '../../core/dependency-guard.js';
import { renderEmptyStateCard } from '../../components/empty-state.js';
import { getBatchById, getBatchByCode } from '../../data/batch-master.js';
import { getBedenganById } from '../../data/bedengan-master.js';

export {
  SELECTION_STATUS,
  SELECTION_STAGES,
  SELECTION_TYPES,
  SELECTION_STORAGE_KEY,
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  filterSelectionByScope,
  getActionableSelectionCount,
  canPerformAsistenSelectionAction,
  approveSelectionRecord,
  returnSelectionRecord,
  createSelectionRecord,
  isPreGraftingSelection,
  isPostGraftingSelection,
  getSelectionStageLabel,
  createPreGraftingSelectionDocument,
  getPreGraftingSelectionDocuments,
  getPreGraftingSelectionDocumentById,
  setPreGraftingSelectionDocumentCompletion,
  submitPreGraftingSelectionDocumentToAsisten,
  approvePreGraftingSelectionDocument,
  returnPreGraftingSelectionDocument,
  validatePreGraftingSelectionCompletion,
  canCreatePreGraftingSelection1Document,
  canCreateSelection2Document,
  createSelection2DocumentFromSelection1,
  canCreateSelection3Document,
  createSelection3DocumentFromSelection2,
  syncAllSeedingsToPreGraftingSelectionDocuments,
  getSeleksi1ExecutionsByDocument,
  getBedenganScopeStatusForSeleksi1,
  validateSeleksi1Execution,
  createSeleksi1ExecutionTransaction,
  deleteSeleksi1ExecutionTransaction,
  getSeleksi2ExecutionsByDocument,
  getBedenganScopeStatusForSeleksi2,
  validateSeleksi2Execution,
  createSeleksi2ExecutionTransaction,
  deleteSeleksi2ExecutionTransaction,
  getSeleksi3ExecutionsByDocument,
  getBedenganScopeStatusForSeleksi3,
  validateSeleksi3Execution,
  createSeleksi3ExecutionTransaction,
  updateSeleksi3ExecutionTransaction,
  deleteSeleksi3ExecutionTransaction,
  getSeleksi3Metrics,
  renderAsistenSelectionReview
};

let activeAsbTab = 'PENDING'; // 'PENDING' | 'HISTORY'
let activeMantriTab = 'PRE_SOWING'; // 'PRE_SOWING' | 'PINDAH_SEMAI_REJECT' | 'PRE_GRAFTING' | 'POST_GRAFTING'
let activePreGraftingTab = 'SELEKSI_1'; // 'SELEKSI_1' | 'SELEKSI_2' | 'SELEKSI_3'
let activeFilterProgram = 'ALL';

export function renderSelectionLanding() {
  const app = document.getElementById('app');
  if (!app) return;

  const rawUser = session.get() || { name: 'Irwan Syah Putra', code: '1405482', position: 'Mantri Pembibitan', role: 'MANTRI_TANAMAN' };
  const currentUser = getCurrentUserContext() || resolveUserContext(rawUser);
  const normalizedUserRole = normalizeRole(currentUser.role || currentUser.rawRole);
  const isAsistenBibitan = normalizedUserRole === ROLES.ASISTEN_BIBITAN;

  // Pastikan sinkronisasi data seeding ke selection_pool & pre_grafting_docs dilakukan
  try {
    syncAllSeedingsToSelectionPool();
    syncAllSeedingsToPreGraftingSelectionDocuments(currentUser);
    syncAllDederanRejectionsToSelectionPool();
  } catch (err) {
    console.warn('[renderSelectionLanding] Gagal sinkronisasi data seeding:', err);
  }

  // Jika Asisten Bibitan, render Halaman Pemeriksaan Hasil Seleksi (ASB-09 Canonical)
  if (isAsistenBibitan) {
    renderAsistenSelectionReview(app, currentUser);
    return;
  }

  // Jika Mantri atau role lain, render modul operasional penyeleksian
  renderMantriSelectionLanding(app, currentUser);
}

/**
 * =============================================================================
 * ASISTEN BIBITAN: PEMERIKSAAN HASIL SELEKSI (ASB-09 CANONICAL VIEW)
 * Mendukung verifikasi Dokumen Seleksi I (Pra-Okulasi) dan Pasca-Okulasi
 * =============================================================================
 */
function renderAsistenSelectionReview(app, currentUser) {
  // 1. Pre-Grafting Seleksi I Documents
  const allPreDocs = getPreGraftingSelectionDocuments({}, currentUser);
  const pendingPreDocs = allPreDocs.filter(d => canPerformAsistenSelectionAction(d, currentUser));
  const historyPreDocs = allPreDocs.filter(d => {
    const s = (d.status || '').toUpperCase();
    return s === SELECTION_STATUS.DISETUJUI || s === SELECTION_STATUS.DIKEMBALIKAN || s === 'TERVERIFIKASI' || s === 'VERIFIED';
  });

  // 2. Post-Grafting Records (Existing)
  const allRecords = storage.get(SELECTION_STORAGE_KEY, []);
  const postGraftingRecords = allRecords.filter(r => !r.selectionDocumentId && !r.parentSelectionDocumentId && r.selectionType !== SELECTION_TYPES.PRA_OKULASI && r.selectionStage !== SELECTION_STAGES.SELEKSI_1);
  const scopedPostRecords = filterSelectionByScope(postGraftingRecords, currentUser);

  const pendingPostRecords = scopedPostRecords.filter(r => canPerformAsistenSelectionAction(r, currentUser));

  const historyPostRecords = scopedPostRecords.filter(r => {
    const s = (r.status || '').toUpperCase();
    return s === SELECTION_STATUS.DISETUJUI || s === SELECTION_STATUS.DIKEMBALIKAN || s === 'DECLARED_CULLED' || s === 'TERVERIFIKASI' || s === 'VERIFIED';
  });

  const totalPendingCount = pendingPreDocs.length + pendingPostRecords.length;
  const totalHistoryCount = historyPreDocs.length + historyPostRecords.length;

  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;">
        <div style="display: flex; align-items: center;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 700; color: #0F172A; margin: 0 0 0 6px; letter-spacing: -0.01em;">Pemeriksaan Hasil Seleksi</h1>
        </div>
      </header>

      <!-- TAB NAVIGATION -->
      <div style="display: flex; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 0 16px; gap: 20px;">
        <button id="tab-pending" type="button" style="padding: 12px 4px; font-size: 0.85rem; font-weight: ${activeAsbTab === 'PENDING' ? '700' : '600'}; color: ${activeAsbTab === 'PENDING' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeAsbTab === 'PENDING' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <span>Menunggu Pemeriksaan</span>
          ${totalPendingCount > 0 ? `<span style="background: #DC2626; color: #FFFFFF; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${totalPendingCount}</span>` : ''}
        </button>
        <button id="tab-history" type="button" style="padding: 12px 4px; font-size: 0.85rem; font-weight: ${activeAsbTab === 'HISTORY' ? '700' : '600'}; color: ${activeAsbTab === 'HISTORY' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeAsbTab === 'HISTORY' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <span>Riwayat Pemeriksaan</span>
          ${totalHistoryCount > 0 ? `<span style="background: #E2E8F0; color: #475569; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${totalHistoryCount}</span>` : ''}
        </button>
      </div>

      <!-- MAIN CONTENT LIST -->
      <main style="flex: 1; overflow-y: auto; padding: 16px;">
        
        ${(activeAsbTab === 'PENDING' ? totalPendingCount : totalHistoryCount) === 0 ? renderEmptyStateCard({
    title: activeAsbTab === 'PENDING' ? 'Tidak Ada Pengajuan Seleksi' : 'Belum Ada Riwayat',
    description: activeAsbTab === 'PENDING'
      ? 'Semua hasil seleksi bibit dari Mantri telah diperiksa atau belum ada pengajuan baru.'
      : 'Daftar hasil seleksi yang telah disetujui atau dikembalikan akan tampil di sini.'
  }) : `
          <div style="display: flex; flex-direction: column; gap: 14px;">
            
            <!-- A. SECTION PRE-GRAFTING DOKUMEN SELEKSI I, II & III -->
            ${(activeAsbTab === 'PENDING' ? pendingPreDocs : historyPreDocs).map(doc => {
    const isSeleksi3 = (
      doc.selectionStage === SELECTION_STAGES.SELEKSI_3 ||
      doc.selectionStage === 'SELEKSI_III' ||
      doc.selectionStage === 'SELEKSI_3'
    );
    const isSeleksi2 = (
      doc.selectionStage === SELECTION_STAGES.SELEKSI_2 ||
      doc.selectionStage === 'SELEKSI_II' ||
      doc.selectionStage === 'SELEKSI_2'
    );
    const executions = isSeleksi3
      ? getSeleksi3ExecutionsByDocument(doc.id || doc.docNo)
      : (isSeleksi2
        ? getSeleksi2ExecutionsByDocument(doc.id || doc.docNo)
        : getSeleksi1ExecutionsByDocument(doc.id || doc.docNo));
    const sourcePolybag = parseInt(doc.sourcePolybagQty || 0, 10);
    const sourceBibit = parseInt(doc.sourceBibitQty || 0, 10);
    const totalLayak = parseInt(doc.totalLayak || 0, 10);
    const totalAfkir = parseInt(doc.totalAfkir || 0, 10);
    const bedDisplay = formatBedenganDisplayCode(doc);
    const isApproved = doc.status === SELECTION_STATUS.DISETUJUI;
    const isReturned = doc.status === SELECTION_STATUS.DIKEMBALIKAN;
    const isActionable = canPerformAsistenSelectionAction(doc, currentUser);
    const stageBadgeText = isSeleksi3 ? 'Seleksi III (Pra-Okulasi)' : (isSeleksi2 ? 'Seleksi II (Pra-Okulasi)' : 'Seleksi I (Pra-Okulasi)');
    const stageLabel = isSeleksi3 ? 'Seleksi III' : (isSeleksi2 ? 'Seleksi II' : 'Seleksi I');

    let activeFlags = [{ key: 'SELECTION_WAIT_ASB', label: 'Menunggu Pemeriksaan' }];
    if (isApproved) {
      activeFlags = [{ key: 'SELECTION_APPROVED', label: 'Disetujui (Final)' }];
    } else if (isReturned) {
      activeFlags = [{ key: 'SELECTION_REJECTED', label: 'Dikembalikan' }];
    }

    return `
                <div class="card-pre-grafting-asb" data-id="${esc(doc.id)}" style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 10px; padding: 12px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                  
                  <!-- HEADER DOKUMEN -->
                  <div style="margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 5px;">
                      <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #EEF2FF; color: #3730A3; border: 1px solid #C7D2FE; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${stageBadgeText}
                      </span>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
                      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        ${renderStatusDots(activeFlags)}
                        <strong style="font-size: 0.95rem; font-weight: 800; color: #0F172A; letter-spacing: -0.01em;">${esc(doc.docNo)}</strong>
                      </div>
                      <div style="font-size: 0.70rem; color: #64748B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: right;">
                        ${isSeleksi3 ? `
                          Sumber: <strong style="color: #334155;">${esc(doc.sourceSelectionDocNo || doc.sourceDocNo || '-')}</strong>
                        ` : (isSeleksi2 ? `
                          Sumber: <strong style="color: #334155;">${esc(doc.sourceSelectionDocNo || doc.sourceDocNo || '-')}</strong>
                        ` : `
                          Sumber: <strong style="color: #334155;">${esc(doc.sourceDocNo || '-')}</strong>
                        `)}
                      </div>
                    </div>
                  </div>

                  <!-- METADATA BATCH & BEDENGAN -->
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 8px; font-size: 0.70rem; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 10px; margin-bottom: 8px;">
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><span style="color: #64748B;">Batch:</span> <strong style="color: #0F172A;">${esc(doc.batchCode || '-')}</strong></div>
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><span style="color: #64748B;">Klon:</span> <strong style="color: #0F172A;">${esc(doc.clone || doc.klon || '-')}</strong></div>
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><span style="color: #64748B;">Bedengan:</span> <strong style="color: #0F172A;">${esc(bedDisplay)}</strong></div>
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><span style="color: #64748B;">Program:</span> <strong style="color: #0F172A;">${esc(doc.programCode || doc.programName || '-')}</strong></div>
                  </div>

                  <!-- 4-KOLOM METRIK AGREGAT DOKUMEN -->
                  <div style="display: grid; grid-template-columns: repeat(4, 1fr); background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 2px; margin-bottom: 8px; text-align: center;">
                    <div>
                      <div style="font-size: 0.58rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.02em;">Polybag</div>
                      <div style="font-size: 0.88rem; font-weight: 800; color: #0F172A; line-height: 1.2; margin-top: 1px;">${sourcePolybag.toLocaleString('id-ID')}</div>
                      <div style="font-size: 0.58rem; color: #94A3B8;">Ply</div>
                    </div>
                    <div style="border-left: 1px solid #E2E8F0;">
                      <div style="font-size: 0.58rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.02em;">${isSeleksi2 || isSeleksi3 ? 'Bibit' : 'Bibit Awal'}</div>
                      <div style="font-size: 0.88rem; font-weight: 800; color: #0F172A; line-height: 1.2; margin-top: 1px;">${sourceBibit.toLocaleString('id-ID')}</div>
                      <div style="font-size: 0.58rem; color: #94A3B8;">Pkk</div>
                    </div>
                    <div style="border-left: 1px solid #E2E8F0;">
                      <div style="font-size: 0.58rem; font-weight: 700; color: #15803D; text-transform: uppercase; letter-spacing: 0.02em;">Layak</div>
                      <div style="font-size: 0.88rem; font-weight: 800; color: #15803D; line-height: 1.2; margin-top: 1px;">${totalLayak.toLocaleString('id-ID')}</div>
                      <div style="font-size: 0.58rem; color: #15803D;">${isSeleksi2 ? 'Pkk (1/Ply)' : 'Pkk'}</div>
                    </div>
                    <div style="border-left: 1px solid #E2E8F0;">
                      <div style="font-size: 0.58rem; font-weight: 700; color: #DC2626; text-transform: uppercase; letter-spacing: 0.02em;">Reject</div>
                      <div style="font-size: 0.88rem; font-weight: 800; color: #DC2626; line-height: 1.2; margin-top: 1px;">${totalAfkir.toLocaleString('id-ID')}</div>
                      <div style="font-size: 0.58rem; color: #DC2626;">Pkk</div>
                    </div>
                  </div>

                  <!-- DETAIL SESI PELAKSANAAN CHILD -->
                  <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 8px; margin-bottom: 8px;">
                    <div style="font-size: 0.68rem; font-weight: 700; color: #475569; margin-bottom: 4px;">
                      Daftar Sesi Pelaksanaan ${stageLabel} (${executions.length} Sesi):
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                      ${executions.map(tx => `
                        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 5px; padding: 5px 8px; font-size: 0.68rem; display: flex; justify-content: space-between; align-items: center;">
                          <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 68%;">
                            <div><strong style="color: #0F172A;">${esc(tx.bedenganCode || '-')}</strong> • <span style="color: #475569;">${esc(tx.docNo)}</span></div>
                            <div style="color: #64748B; font-size: 0.62rem; margin-top: 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                              ${isSeleksi3
        ? `${tx.polybagScope || tx.initialPolybagCount || 0} Ply (${tx.bibitAwal || 0} Pkk) • ${esc(tx.tanggalSeleksi || tx.tanggal)}`
        : `${tx.polybagScope || tx.actualPolybagInspectedQty || 0} Ply • ${esc(tx.tanggalSeleksi || tx.tanggal)}`}
                            </div>
                          </div>
                          <div style="text-align: right; flex-shrink: 0;">
                            <div style="font-weight: 700; color: #15803D; font-size: 0.70rem;">+${(tx.bibitDipertahankan !== undefined ? tx.bibitDipertahankan : (tx.actualBibitRetainedQty !== undefined ? tx.actualBibitRetainedQty : (tx.jumlahLayak || 0))).toLocaleString('id-ID')} Pkk</div>
                            <div style="font-size: 0.62rem; font-weight: 600; color: #DC2626;">-${(tx.bibitReject !== undefined ? tx.bibitReject : (tx.actualBibitSelectedQty !== undefined ? tx.actualBibitSelectedQty : (tx.jumlahAfkir || 0))).toLocaleString('id-ID')} Reject</div>
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  </div>

                  <!-- METADATA SUBMISSION / VERIFICATION -->
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.68rem; color: #64748B; margin-bottom: ${isActionable ? '8px' : '0'};">
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      Diajukan oleh: <strong style="color: #334155;">${esc(doc.submittedByName || doc.completedByName || 'Mantri Bibitan')}</strong>
                    </div>
                    <div style="flex-shrink: 0;">
                      ${esc(doc.submittedAt ? formatDate(doc.submittedAt) : (doc.completedAt ? formatDate(doc.completedAt) : '-'))}
                    </div>
                  </div>

                  ${isReturned && doc.returnReason ? `
                    <div style="margin-top: 6px; padding: 6px 8px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; font-size: 0.70rem; color: #991B1B;">
                      <strong>Alasan Pengembalian:</strong> ${esc(doc.returnReason)}
                    </div>
                  ` : ''}

                  <!-- AKSI ASISTEN BIBITAN UNTUK PRE-GRAFTING DOC -->
                  ${isActionable ? `
                    <div style="display: flex; gap: 8px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #F1F5F9;">
                      <button type="button" class="btn-asb-pre-return" data-id="${esc(doc.id)}" style="flex: 1; height: 34px; background: #FFFFFF; color: #DC2626; border: 1px solid #FCA5A5; border-radius: 6px; font-weight: 700; font-size: 0.74rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                          <polyline points="9 14 4 9 9 4"></polyline>
                          <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                        </svg>
                        Kembalikan
                      </button>
                      <button type="button" class="btn-asb-pre-approve" data-id="${esc(doc.id)}" style="flex: 1.3; height: 34px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.74rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; box-shadow: 0 1px 2px rgba(17,104,52,0.2); white-space: nowrap;">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" fill="none">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Setujui ${stageLabel}
                      </button>
                    </div>
                  ` : ''}

                </div>
              `;
  }).join('')}

            <!-- B. SECTION POST-GRAFTING & DEDERAN RECORDS -->
            ${(activeAsbTab === 'PENDING' ? pendingPostRecords : historyPostRecords).map(item => {
    const isDederan = item.originType === 'REJECT_DEDERAN' || item.sourceModule === 'DEDERAN';
    const isPindahSemai = item.originType === 'REJECT_PENYEMAIAN' || item.sourceModule === 'PENYEMAIAN' || item.sourceTransactionType === 'SEEDING';
    const isSingleRejectDeclaration = isDederan || isPindahSemai;
    const sourceProcessName = isDederan ? 'Dederan' : 'Pindah Semai';
    const rejectUnit = isDederan ? 'Butir' : 'Pkk';
    const unit = isDederan ? 'Butir' : 'Pkk';
    const checked = parseInt(item.jumlahDiperiksa || item.quantity || 0, 10);
    const pass = parseInt(item.jumlahLayak || 0, 10);
    const cull = parseInt(item.jumlahAfkir || item.quantity || 0, 10);
    const passPct = checked > 0 ? Math.round((pass / checked) * 100) : 0;
    const cullPct = checked > 0 ? Math.round((cull / checked) * 100) : 0;
    const isActionable = canPerformAsistenSelectionAction(item, currentUser);
    const isApproved = item.status === SELECTION_STATUS.DISETUJUI;
    const isReturned = item.status === SELECTION_STATUS.DIKEMBALIKAN;

    let activePostFlags = [{ key: 'SELECTION_WAIT_ASB', label: 'Menunggu Pemeriksaan' }];
    if (isApproved) {
      activePostFlags = [{ key: 'SELECTION_APPROVED', label: 'Disetujui' }];
    } else if (isReturned) {
      activePostFlags = [{ key: 'SELECTION_REJECTED', label: 'Dikembalikan' }];
    }

    return `
                <div class="card-selection-item" data-id="${esc(item.id)}" style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 10px; padding: 12px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                  
                  <!-- HEADER BARIS 1 -->
                  <div style="margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 5px;">
                      <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #EEF2FF; color: #3730A3; border: 1px solid #C7D2FE; white-space: nowrap;">
                        ${esc(getSelectionStageLabel(item))}
                      </span>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
                      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        ${renderStatusDots(activePostFlags)}
                        <strong style="font-size: 0.95rem; font-weight: 800; color: #0F172A; letter-spacing: -0.01em;">${esc(item.docNo || item.selectionNo || '-')}</strong>
                      </div>
                      <span style="font-size: 0.70rem; color: #64748B; white-space: nowrap;">
                        ${isDederan ? `Klon <strong style="color: #0F172A;">${esc(item.clone || item.klon || '-')}</strong>` : `${esc(item.batchCode || item.batchNo || 'Batch')} • ${esc(item.clone || item.klon || '-')}`}
                      </span>
                    </div>
                  </div>

                  <!-- METADATA BARIS 2 -->
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 8px; font-size: 0.70rem; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 10px; margin-bottom: 8px;">
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      <span style="color: #64748B;">Bedengan:</span> <strong style="color: #0F172A;">${esc(item.bedengan || (item.bedenganIds ? item.bedenganIds.join(', ') : '-'))}</strong>
                    </div>
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      <span style="color: #64748B;">Program:</span> <strong style="color: #0F172A;">${esc(item.programName || item.programCode || item.programId || '-')}</strong>
                    </div>
                  </div>

                  <!-- METRIK HASIL PENGAJUAN -->
                  ${isSingleRejectDeclaration ? `
                    <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 6px;">
                      <div style="font-size: 0.62rem; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.03em;">
                        Hasil Pengajuan Mantri
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem;">
                        <span style="color: #64748B;">Diperiksa di ${sourceProcessName}</span>
                        <strong style="color: #0F172A; font-weight: 800;">${checked.toLocaleString('id-ID')} ${rejectUnit}</strong>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; padding-top: 4px; border-top: 1px dashed #CBD5E1;">
                        <span style="color: #DC2626; font-weight: 700;">Diajukan sebagai Afkir</span>
                        <div style="text-align: right;">
                          <strong style="color: #DC2626; font-weight: 900; font-size: 0.88rem;">${cull.toLocaleString('id-ID')} ${rejectUnit}</strong>
                          <span style="font-size: 0.68rem; font-weight: 700; color: #991B1B; margin-left: 2px;">(${cullPct}%)</span>
                        </div>
                      </div>
                    </div>
                  ` : `
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 2px; margin-bottom: 8px; text-align: center;">
                      <div>
                        <div style="font-size: 0.58rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.02em;">Diperiksa</div>
                        <div style="font-size: 0.88rem; font-weight: 800; color: #0F172A; line-height: 1.2; margin-top: 1px;">
                          ${checked.toLocaleString('id-ID')}
                        </div>
                        <div style="font-size: 0.58rem; color: #94A3B8;">${unit}</div>
                      </div>
                      <div style="border-left: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0;">
                        <div style="font-size: 0.58rem; font-weight: 700; color: #15803D; text-transform: uppercase; letter-spacing: 0.02em;">Layak</div>
                        <div style="font-size: 0.88rem; font-weight: 800; color: #15803D; line-height: 1.2; margin-top: 1px;">
                          ${pass.toLocaleString('id-ID')}
                        </div>
                        <div style="font-size: 0.58rem; color: #15803D; font-weight: 600;">${passPct}%</div>
                      </div>
                      <div>
                        <div style="font-size: 0.58rem; font-weight: 700; color: #DC2626; text-transform: uppercase; letter-spacing: 0.02em;">Afkir</div>
                        <div style="font-size: 0.88rem; font-weight: 800; color: #DC2626; line-height: 1.2; margin-top: 1px;">
                          ${cull.toLocaleString('id-ID')}
                        </div>
                        <div style="font-size: 0.58rem; color: #DC2626; font-weight: 600;">${cullPct}%</div>
                      </div>
                    </div>
                  `}

                  <!-- METADATA SUBMISSION -->
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.68rem; color: #64748B; margin-bottom: ${isActionable ? '8px' : '0'};">
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      Diajukan oleh: <strong style="color: #334155;">${esc(item.createdByName || item.mantri || 'Mantri')}</strong>
                    </div>
                    <div style="flex-shrink: 0;">
                      ${esc(item.tanggalSeleksi || item.tanggal || '-')}
                    </div>
                  </div>

                  ${isReturned && item.returnReason ? `
                    <div style="margin-top: 6px; padding: 6px 8px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; font-size: 0.70rem; color: #991B1B;">
                      <strong>Alasan Pengembalian:</strong> ${esc(item.returnReason)}
                    </div>
                  ` : ''}

                  <!-- AKSI ASISTEN BIBITAN (JIKA ACTIONABLE) -->
                  ${isActionable ? `
                    <div style="display: flex; gap: 8px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #F1F5F9;">
                      <button type="button" class="btn-asb-return" data-id="${esc(item.id)}" style="flex: 1; height: 34px; background: #FFFFFF; color: #DC2626; border: 1px solid #FCA5A5; border-radius: 6px; font-weight: 700; font-size: 0.74rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap;">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none">
                          <polyline points="9 14 4 9 9 4"></polyline>
                          <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                        </svg>
                        Kembalikan
                      </button>
                      <button type="button" class="btn-asb-approve" data-id="${esc(item.id)}" style="flex: 1.3; height: 34px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.74rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; box-shadow: 0 1px 2px rgba(17,104,52,0.2); white-space: nowrap;">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" fill="none">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Setujui Hasil
                      </button>
                    </div>
                  ` : ''}

                </div>
              `;
  }).join('')}

          </div>
        `}

      </main>
    </div>
  `;

  // Event Listeners
  app.querySelector('#btn-back')?.addEventListener('click', () => navigate('/home'));

  app.querySelector('#tab-pending')?.addEventListener('click', () => {
    activeAsbTab = 'PENDING';
    renderAsistenSelectionReview(app, currentUser);
  });

  app.querySelector('#tab-history')?.addEventListener('click', () => {
    activeAsbTab = 'HISTORY';
    renderAsistenSelectionReview(app, currentUser);
  });

  // Action Pre-Grafting Approve
  app.querySelectorAll('.btn-asb-pre-approve').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const docId = e.currentTarget.dataset.id;
      const targetDoc = allPreDocs.find(d => d.id === docId);
      if (!targetDoc) return;

      const isSeleksi3 = (
        targetDoc.selectionStage === SELECTION_STAGES.SELEKSI_3 ||
        targetDoc.selectionStage === 'SELEKSI_III' ||
        targetDoc.selectionStage === 'SELEKSI_3'
      );
      const isSeleksi2 = (
        targetDoc.selectionStage === SELECTION_STAGES.SELEKSI_2 ||
        targetDoc.selectionStage === 'SELEKSI_II' ||
        targetDoc.selectionStage === 'SELEKSI_2'
      );
      const stageLabel = isSeleksi3 ? 'Seleksi III' : (isSeleksi2 ? 'Seleksi II' : 'Seleksi I');

      openModal({
        title: `Persetujuan Dokumen ${stageLabel}`,
        body: `
          <div style="font-size: 0.84rem; color: #334155; line-height: 1.5;">
            <p style="margin: 0 0 10px 0;">
              Apakah Anda yakin ingin menyetujui Dokumen <strong>${esc(targetDoc.docNo)}</strong> sebagai hasil final ${stageLabel}?
            </p>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; font-size: 0.78rem;">
              <div>Polybag Source: <strong>${parseInt(targetDoc.sourcePolybagQty || 0).toLocaleString('id-ID')}</strong> Ply</div>
              <div>Bibit Dipertahankan: <strong style="color: #15803D;">${parseInt(targetDoc.totalLayak || 0).toLocaleString('id-ID')}</strong> ${isSeleksi2 ? 'Pkk (1/Ply)' : 'Pkk'}</div>
              <div>Bibit Reject ${stageLabel}: <strong style="color: #DC2626;">${parseInt(targetDoc.totalAfkir || 0).toLocaleString('id-ID')}</strong> Pkk</div>
            </div>
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">Catatan Persetujuan (Opsional)</label>
              <textarea id="modal-pre-approve-notes" rows="2" style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;" placeholder="Catatan persetujuan Asisten..."></textarea>
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="btn-cancel-modal" type="button" style="flex: 1; height: 38px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-weight: 600; cursor: pointer;">Batal</button>
              <button id="btn-confirm-pre-approve" type="button" style="flex: 1; height: 38px; background: #116834; color: #FFF; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">Setujui Final</button>
            </div>
          </div>
        `
      });

      document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);
      document.getElementById('btn-confirm-pre-approve')?.addEventListener('click', () => {
        const notes = document.getElementById('modal-pre-approve-notes')?.value || '';
        try {
          approvePreGraftingSelectionDocument(docId, notes, currentUser);
          closeModal();
          toast(`Dokumen ${stageLabel} (${targetDoc.docNo}) berhasil disetujui & ditetapkan Final.`, 'success');
          renderAsistenSelectionReview(app, currentUser);
        } catch (err) {
          toast(err.message || 'Gagal menyetujui dokumen seleksi', 'error');
        }
      });
    });
  });

  // Action Pre-Grafting Return
  app.querySelectorAll('.btn-asb-pre-return').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const docId = e.currentTarget.dataset.id;
      const targetDoc = allPreDocs.find(d => d.id === docId);
      if (!targetDoc) return;

      const isSeleksi3 = (
        targetDoc.selectionStage === SELECTION_STAGES.SELEKSI_3 ||
        targetDoc.selectionStage === 'SELEKSI_III' ||
        targetDoc.selectionStage === 'SELEKSI_3'
      );
      const isSeleksi2 = (
        targetDoc.selectionStage === SELECTION_STAGES.SELEKSI_2 ||
        targetDoc.selectionStage === 'SELEKSI_II' ||
        targetDoc.selectionStage === 'SELEKSI_2'
      );
      const stageLabel = isSeleksi3 ? 'Seleksi III' : (isSeleksi2 ? 'Seleksi II' : 'Seleksi I');

      openModal({
        title: `Kembalikan Dokumen ${stageLabel}`,
        body: `
          <div style="font-size: 0.84rem; color: #334155; line-height: 1.5;">
            <p style="margin: 0 0 12px 0;">
              Kembalikan Dokumen Seleksi <strong>${esc(targetDoc.docNo)}</strong> ke Mantri untuk perbaikan atau penyesuaian sesi transaksi.
            </p>
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">Alasan Pengembalian (Wajib) <span style="color: #DC2626;">*</span></label>
              <textarea id="modal-pre-return-reason" rows="3" style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;" placeholder="Jelaskan alasan pengembalian dokumen..."></textarea>
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="btn-cancel-modal" type="button" style="flex: 1; height: 38px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-weight: 600; cursor: pointer;">Batal</button>
              <button id="btn-confirm-pre-return" type="button" style="flex: 1; height: 38px; background: #DC2626; color: #FFF; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">Kembalikan</button>
            </div>
          </div>
        `
      });

      document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);
      document.getElementById('btn-confirm-pre-return')?.addEventListener('click', () => {
        const reason = document.getElementById('modal-pre-return-reason')?.value || '';
        if (!reason.trim()) {
          toast('Alasan pengembalian wajib diisi.', 'error');
          return;
        }
        try {
          returnPreGraftingSelectionDocument(docId, reason, currentUser);
          closeModal();
          toast(`Dokumen ${stageLabel} (${targetDoc.docNo}) berhasil dikembalikan ke Mantri.`, 'info');
          renderAsistenSelectionReview(app, currentUser);
        } catch (err) {
          toast(err.message || 'Gagal mengembalikan dokumen seleksi', 'error');
        }
      });
    });
  });

  // Action Buttons Post-Grafting & Dederan
  app.querySelectorAll('.btn-asb-approve').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const target = allRecords.find(r => r.id === id);
      if (!target) return;

      const isDederan = target.originType === 'REJECT_DEDERAN' || target.sourceModule === 'DEDERAN';
      const isPindahSemai = target.originType === 'REJECT_PENYEMAIAN' || target.sourceModule === 'PENYEMAIAN' || target.sourceTransactionType === 'SEEDING';
      const isSingleRejectDeclaration = isDederan || isPindahSemai;
      const sourceProcessName = isDederan ? 'Dederan' : 'Pindah Semai';
      const rejectUnit = isDederan ? 'Butir' : 'Pkk';
      const targetUnit = isDederan ? 'Butir' : 'Pkk';

      openModal({
        title: 'Persetujuan Hasil Seleksi',
        body: `
          <div style="font-size: 0.84rem; color: #334155; line-height: 1.5;">
            <p style="margin: 0 0 10px 0;">
              ${isDederan
            ? `Apakah Anda yakin ingin menyetujui hasil seleksi Dederan <strong>${esc(target.docNo)}</strong> (${esc(target.bedengan || target.bedenganCode || '-')})?`
            : (isPindahSemai
                ? `Apakah Anda yakin ingin menyetujui hasil seleksi Pindah Semai <strong>${esc(target.docNo)}</strong> (${esc(target.bedengan || target.bedenganCode || '-')})?`
                : `Apakah Anda yakin ingin menyetujui hasil seleksi bibit untuk batch <strong>${esc(target.batchCode)}</strong>?`)}
            </p>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; font-size: 0.78rem;">
              ${isSingleRejectDeclaration ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: #64748B;">Diperiksa di ${sourceProcessName}:</span>
                  <strong style="color: #0F172A;">${parseInt(target.jumlahDiperiksa || target.quantity || 0).toLocaleString('id-ID')} ${rejectUnit}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; color: #DC2626;">
                  <span style="font-weight: 700;">Pengajuan Afkir:</span>
                  <strong style="font-weight: 800;">${parseInt(target.jumlahAfkir || target.quantity || 0).toLocaleString('id-ID')} ${rejectUnit}</strong>
                </div>
              ` : `
                <div>Diperiksa: <strong>${parseInt(target.jumlahDiperiksa || target.quantity || 0).toLocaleString('id-ID')}</strong> ${targetUnit}</div>
                <div>Layak: <strong style="color: #15803D;">${parseInt(target.jumlahLayak || 0).toLocaleString('id-ID')}</strong> ${targetUnit}</div>
                <div>Afkir: <strong style="color: #DC2626;">${parseInt(target.jumlahAfkir || target.quantity || 0).toLocaleString('id-ID')}</strong> ${targetUnit}</div>
              `}
            </div>
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">Catatan Persetujuan (Opsional)</label>
              <textarea id="modal-approve-notes" rows="2" style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;" placeholder="Tambahkan catatan jika ada..."></textarea>
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="btn-cancel-modal" type="button" style="flex: 1; height: 38px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-weight: 600; cursor: pointer;">Batal</button>
              <button id="btn-confirm-approve" type="button" style="flex: 1; height: 38px; background: #116834; color: #FFF; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">Setujui</button>
            </div>
          </div>
        `
      });

      document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);
      document.getElementById('btn-confirm-approve')?.addEventListener('click', () => {
        const notes = document.getElementById('modal-approve-notes')?.value || '';
        try {
          approveSelectionRecord(id, notes, currentUser, true);
          closeModal();
          toast('Hasil seleksi berhasil disetujui.', 'success');
          renderAsistenSelectionReview(app, currentUser);
        } catch (err) {
          toast(err.message || 'Gagal menyetujui hasil seleksi', 'error');
        }
      });
    });
  });

  app.querySelectorAll('.btn-asb-return').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const target = allRecords.find(r => r.id === id);
      if (!target) return;

      const isDederan = target.originType === 'REJECT_DEDERAN' || target.sourceModule === 'DEDERAN';
      const isPindahSemai = target.originType === 'REJECT_PENYEMAIAN' || target.sourceModule === 'PENYEMAIAN' || target.sourceTransactionType === 'SEEDING';

      openModal({
        title: 'Kembalikan Hasil Seleksi',
        body: `
          <div style="font-size: 0.84rem; color: #334155; line-height: 1.5;">
            <p style="margin: 0 0 12px 0;">
              ${isDederan
            ? `Kembalikan hasil seleksi Dederan <strong>${esc(target.docNo)}</strong> (${esc(target.bedengan || target.bedenganCode || '-')}) ke Mantri untuk perbaikan atau deklarasi ulang.`
            : (isPindahSemai
                ? `Kembalikan hasil seleksi Pindah Semai <strong>${esc(target.docNo)}</strong> (${esc(target.bedengan || target.bedenganCode || '-')}) ke Mantri untuk perbaikan atau deklarasi ulang.`
                : `Kembalikan hasil seleksi batch <strong>${esc(target.batchCode)}</strong> ke Mantri untuk perbaikan atau penghitungan ulang.`)}
            </p>
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">Alasan Pengembalian (Wajib) <span style="color: #DC2626;">*</span></label>
              <textarea id="modal-return-reason" rows="3" style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #CBD5E1; border-radius: 6px; font-size: 0.82rem;" placeholder="Jelaskan alasan pengembalian hasil seleksi..."></textarea>
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="btn-cancel-modal" type="button" style="flex: 1; height: 38px; background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 6px; font-weight: 600; cursor: pointer;">Batal</button>
              <button id="btn-confirm-return" type="button" style="flex: 1; height: 38px; background: #DC2626; color: #FFF; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">Kembalikan</button>
            </div>
          </div>
        `
      });

      document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);
      document.getElementById('btn-confirm-return')?.addEventListener('click', () => {
        const reason = document.getElementById('modal-return-reason')?.value || '';
        if (!reason.trim()) {
          toast('Alasan pengembalian wajib diisi.', 'error');
          return;
        }
        try {
          returnSelectionRecord(id, reason, currentUser);
          closeModal();
          toast('Hasil seleksi berhasil dikembalikan ke Mantri.', 'info');
          renderAsistenSelectionReview(app, currentUser);
        } catch (err) {
          toast(err.message || 'Gagal mengembalikan hasil seleksi', 'error');
        }
      });
    });
  });
}

/**
 * =============================================================================
 * SHARED PRESENTATION BUILDERS & AGGREGATION HELPERS (GLOBAL UI STANDARDIZATION)
 * =============================================================================
 */

/**
 * Group Pre-Grafting Documents by Program Code
 * Canonical grouping key: programCode (or programId)
 */
export function groupPreGraftingDocsByProgram(docs) {
  const groups = new Map();
  (docs || []).forEach(doc => {
    // Exclude legacy split
    if (doc.isSplit || doc.isLegacyAggregateSplit) return;
    const progCode = doc.programCode || doc.programId || doc.programName || 'PROGRAM-UNKNOWN';
    if (!groups.has(progCode)) {
      groups.set(progCode, {
        programCode: progCode,
        programName: doc.programName || progCode,
        batches: new Map()
      });
    }
    const progGroup = groups.get(progCode);
    const batchCode = doc.batchCode || doc.batchNo || 'BATCH-UNKNOWN';
    if (!progGroup.batches.has(batchCode)) {
      progGroup.batches.set(batchCode, {
        batchCode,
        clone: doc.clone || doc.klon || '-',
        docs: []
      });
    }
    progGroup.batches.get(batchCode).docs.push(doc);
  });
  return Array.from(groups.values()).map(g => ({
    ...g,
    batches: Array.from(g.batches.values())
  }));
}

/**
 * Calculate Batch-level aggregated metrics for Seleksi I, II, III
 */
export function calculateBatchMetrics(batchGroup, stage = 'SELEKSI_1') {
  const docs = batchGroup.docs || [];
  const batchCode = batchGroup.batchCode || (docs[0] && (docs[0].batchCode || docs[0].batchNo)) || 'BATCH-UNKNOWN';

  // Group documents by unique composite key: `${batchCode}::${bedenganCode}`
  const bedenganMap = new Map();
  const seenExecutionTxIds = new Set();

  docs.forEach(doc => {
    const rawBed = doc.bedenganCode || doc.bedengan || (doc.bedenganList && doc.bedenganList[0]) || (doc.rows && doc.rows[0] && (doc.rows[0].bedenganCode || doc.rows[0].bedenganId)) || (doc.bedenganIds && doc.bedenganIds[0]) || 'BED-UNKNOWN';
    const bedCode = formatBedenganDisplayCode(rawBed);
    const compositeKey = `${batchCode}::${bedCode}`;

    let sourcePoly = parseInt(doc.sourcePolybagQty !== undefined ? doc.sourcePolybagQty : 0, 10);
    if (isNaN(sourcePoly) || sourcePoly <= 0) {
      if (doc.rows && doc.rows[0] && doc.rows[0].polybag) {
        sourcePoly = parseInt(doc.rows[0].polybag, 10);
      } else if (doc.sourceBibitQty) {
        sourcePoly = Math.ceil(doc.sourceBibitQty / 2);
      }
    }

    let sourceBibit = parseInt(doc.sourceBibitQty !== undefined ? doc.sourceBibitQty : 0, 10);
    if (isNaN(sourceBibit) || sourceBibit <= 0) {
      sourceBibit = stage === 'SELEKSI_1' ? sourcePoly * 2 : sourcePoly;
    } else if (doc.batchTotalBibit && sourceBibit === doc.batchTotalBibit && docs.length > 1) {
      // Guard against old record where doc.sourceBibitQty was set to total batch
      sourceBibit = stage === 'SELEKSI_1' ? sourcePoly * 2 : sourcePoly;
    }

    if (!bedenganMap.has(compositeKey)) {
      bedenganMap.set(compositeKey, {
        bedenganCode: bedCode,
        sourcePoly,
        sourceBibit,
        docs: [doc]
      });
    } else {
      const entry = bedenganMap.get(compositeKey);
      entry.docs.push(doc);
      if (sourcePoly > entry.sourcePoly) {
        entry.sourcePoly = sourcePoly;
      }
      if (sourceBibit > entry.sourceBibit) {
        entry.sourceBibit = sourceBibit;
      }
    }
  });

  let totalSourcePolybag = 0;
  let totalSourceBibit = 0;
  let totalInspectedPolybag = 0;
  let totalBibitSelected = 0;

  bedenganMap.forEach(bed => {
    totalSourcePolybag += bed.sourcePoly;
    totalSourceBibit += bed.sourceBibit;

    // Collect executions across docs belonging to this composite Bedengan
    let executions = [];
    bed.docs.forEach(d => {
      try {
        let docTxs = [];
        if (stage === 'SELEKSI_3' || stage === 'SELEKSI_III') {
          docTxs = getSeleksi3ExecutionsByDocument(d.id || d.docNo);
        } else if (stage === 'SELEKSI_2' || stage === 'SELEKSI_II') {
          docTxs = getSeleksi2ExecutionsByDocument(d.id || d.docNo);
        } else {
          docTxs = getSeleksi1ExecutionsByDocument(d.id || d.docNo);
        }
        if (Array.isArray(docTxs)) {
          executions.push(...docTxs);
        }
      } catch (e) {
        // ignore
      }
    });

    // Dedup executions by ID/docNo and ensure composite batch + bedengan scope
    const uniqueTxs = [];
    executions.forEach(tx => {
      const txKey = tx.id || tx.docNo;
      if (txKey && seenExecutionTxIds.has(txKey)) return;

      const txBatch = String(tx.batchCode || tx.batchNo || tx.sourceBatchCode || '').trim().toUpperCase();
      const bBatch = String(batchCode).trim().toUpperCase();
      if (txBatch && bBatch && txBatch !== bBatch) return; // Cross-batch isolation

      const txBed = formatBedenganDisplayCode(tx.bedenganCode || tx.bedengan || tx.bedenganId || '').toUpperCase();
      const bBed = formatBedenganDisplayCode(bed.bedenganCode).toUpperCase();
      if (txBed && bBed && txBed !== bBed) return; // Cross-bedengan isolation

      if (txKey) seenExecutionTxIds.add(txKey);
      uniqueTxs.push(tx);
    });

    if (uniqueTxs.length > 0) {
      uniqueTxs.forEach(tx => {
        const insPoly = parseInt(tx.actualPolybagInspectedQty !== undefined ? tx.actualPolybagInspectedQty : (tx.polybagScope || tx.initialPolybagCount || 0), 10);
        const selBibit = parseInt(tx.actualBibitSelectedQty !== undefined ? tx.actualBibitSelectedQty : (tx.selectedBibitScopeQty !== undefined ? tx.selectedBibitScopeQty : (tx.bibitReject || tx.jumlahAfkir || 0)), 10);
        totalInspectedPolybag += insPoly;
        totalBibitSelected += selBibit;
      });
    } else {
      // Fallback: document metrics if no child txs
      const primaryDoc = bed.docs[0];
      if (primaryDoc) {
        const insPoly = parseInt(primaryDoc.actualPolybagInspectedQty !== undefined ? primaryDoc.actualPolybagInspectedQty : (primaryDoc.inspectedQty || 0), 10);
        const selBibit = parseInt(primaryDoc.actualBibitSelectedQty !== undefined ? primaryDoc.actualBibitSelectedQty : (primaryDoc.selectedBibitQty || primaryDoc.totalAfkir || 0), 10);
        totalInspectedPolybag += insPoly;
        totalBibitSelected += selBibit;
      }
    }
  });

  const inspectedPercent = totalSourcePolybag > 0 ? Math.min(100, Math.round((totalInspectedPolybag / totalSourcePolybag) * 100)) : 0;
  const selectedPercent = totalSourceBibit > 0 ? Math.min(100, Math.round((totalBibitSelected / totalSourceBibit) * 100)) : 0;

  return {
    bedenganCount: bedenganMap.size || docs.length || 1,
    bedengans: Array.from(bedenganMap.values()).map(b => b.bedenganCode),
    totalBibitAwal: totalSourceBibit,
    totalSourceBibit,
    totalSourcePolybag,
    totalInspectedPolybag,
    totalBibitSelected,
    inspectedPercent,
    selectedPercent
  };
}

/**
 * Group Pasca-Okulasi items by Program Code
 */
export function groupPostGraftingDocsByProgram(poolItems) {
  const groups = new Map();
  (poolItems || []).forEach(item => {
    const progCode = item.programCode || item.programId || item.programName || item.program || 'PROGRAM-UNKNOWN';
    if (!groups.has(progCode)) {
      groups.set(progCode, {
        programCode: progCode,
        programName: item.programName || progCode,
        batches: new Map()
      });
    }
    const progGroup = groups.get(progCode);
    const batchCode = item.batchCode || item.batchNo || 'BATCH-UNKNOWN';
    if (!progGroup.batches.has(batchCode)) {
      progGroup.batches.set(batchCode, {
        batchCode,
        clone: item.clone || item.klon || '-',
        items: []
      });
    }
    progGroup.batches.get(batchCode).items.push(item);
  });
  return Array.from(groups.values()).map(g => ({
    ...g,
    batches: Array.from(g.batches.values())
  }));
}

/**
 * Calculate Pasca-Okulasi Batch-level aggregated metrics
 */
export function calculatePostGraftingBatchMetrics(batchGroup) {
  const items = batchGroup.items || [];
  const uniqueBedengans = new Set();
  let totalBibitAwal = 0;
  let totalAfkir = 0;

  items.forEach(item => {
    const bedCode = item.bedenganCode || item.bedengan || 'BED-UNKNOWN';
    uniqueBedengans.add(bedCode);
    const qty = parseInt(item.jumlahAfkir || item.quantity || 0, 10);
    const initialQty = parseInt(item.sourceBibitQty || item.initialQty || item.totalBibit || (qty > 0 ? qty : 0), 10);
    totalAfkir += qty;
    totalBibitAwal += initialQty > 0 ? initialQty : qty;
  });

  const selectedPercent = totalBibitAwal > 0 ? Math.min(100, Math.round((totalAfkir / totalBibitAwal) * 100)) : 0;

  return {
    bedenganCount: uniqueBedengans.size || items.length || 1,
    bedengans: Array.from(uniqueBedengans),
    totalBibitAwal,
    totalAfkir,
    selectedPercent
  };
}

/**
 * Shared Presentation Builder: renderProgramBatchCompactView
 * Renders Program Pembibitan as grouping header (rendered ONCE per program)
 * and Batches as compact list rows with TEXT ONLY progress.
 */
export function renderProgramBatchCompactView({
  programGroups,
  stage = 'SELEKSI_1',
  emptyTitle = 'Belum Ada Data Seleksi',
  emptyDesc = 'Data seleksi belum tersedia.',
  isPasca = false
}) {
  if (!programGroups || programGroups.length === 0) {
    return renderEmptyStateCard({
      title: emptyTitle,
      description: emptyDesc
    });
  }

  return `
    <div class="program-batch-compact-container" style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 16px;">
      ${programGroups.map(prog => `
        <div class="card-program-group" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
          
          <!-- PROGRAM HEADER (RENDERED EXACTLY ONCE PER GROUP) -->
          <div class="program-group-header" style="background: #F8FAFC; border-bottom: 1px solid #E2E8F0; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 0.70rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">
              PROGRAM PEMBIBITAN
            </div>
            <div class="program-code-display" style="font-size: 0.82rem; font-weight: 800; color: #0F172A; font-family: monospace;">
              ${esc(prog.programCode)}
            </div>
          </div>

          <!-- BATCH LIST (COMPACT ROWS) -->
          <div class="batch-compact-list" style="display: flex; flex-direction: column;">
            ${prog.batches.map((batch, batchIdx) => {
              if (isPasca) {
                const metrics = calculatePostGraftingBatchMetrics(batch);
                return `
                  <div class="row-batch-item row-batch-pasca-clickable" 
                       data-program-code="${esc(prog.programCode)}" 
                       data-batch-code="${esc(batch.batchCode)}" 
                       style="padding: 12px 14px; cursor: pointer; transition: background 0.15s ease; ${batchIdx > 0 ? 'border-top: 1px solid #F1F5F9;' : ''}"
                       onmouseover="this.style.background='#F8FAFC'" 
                       onmouseout="this.style.background='#FFFFFF'">
                    
                    <!-- ROW 1: BATCH & BEDENGAN COUNT + CHEVRON -->
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span class="batch-code-title" style="font-weight: 800; font-size: 0.90rem; color: #0F172A;">
                        ${esc(batch.batchCode)}
                      </span>
                      <span class="bedengan-count-label" style="font-size: 0.78rem; font-weight: 600; color: #64748B;">
                        ${metrics.bedenganCount} Bedengan &gt;
                      </span>
                    </div>

                    <!-- ROW 2: BATCH POPULATION -->
                    <div class="batch-population-label" style="font-size: 0.82rem; font-weight: 700; color: #1E293B; margin-top: 3px;">
                      ${metrics.totalBibitAwal.toLocaleString('id-ID')} Bibit
                    </div>

                    <!-- ROW 3: PROGRESS TEXT ONLY (NO PROGRESS BAR) -->
                    <div class="batch-progress-text" style="font-size: 0.75rem; color: #64748B; margin-top: 3px;">
                      Terseleksi ${metrics.selectedPercent}% (${metrics.totalAfkir.toLocaleString('id-ID')} Pkk)
                    </div>

                  </div>
                `;
              }

              const metrics = calculateBatchMetrics(batch, stage);
              return `
                <div class="row-batch-item row-batch-clickable" 
                     data-stage="${esc(stage)}" 
                     data-program-code="${esc(prog.programCode)}" 
                     data-batch-code="${esc(batch.batchCode)}" 
                     style="padding: 12px 14px; cursor: pointer; transition: background 0.15s ease; ${batchIdx > 0 ? 'border-top: 1px solid #F1F5F9;' : ''}"
                     onmouseover="this.style.background='#F8FAFC'" 
                     onmouseout="this.style.background='#FFFFFF'">
                  
                  <!-- ROW 1: BATCH & BEDENGAN COUNT + CHEVRON -->
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="batch-code-title" style="font-weight: 800; font-size: 0.90rem; color: #0F172A;">
                      ${esc(batch.batchCode)}
                    </span>
                    <span class="bedengan-count-label" style="font-size: 0.78rem; font-weight: 600; color: #64748B;">
                      ${metrics.bedenganCount} Bedengan &gt;
                    </span>
                  </div>

                  <!-- ROW 2: BATCH POPULATION -->
                  <div class="batch-population-label" style="font-size: 0.82rem; font-weight: 700; color: #1E293B; margin-top: 3px;">
                    ${metrics.totalSourceBibit.toLocaleString('id-ID')} Bibit
                  </div>

                  <!-- ROW 3: PROGRESS TEXT ONLY (NO PROGRESS BAR) -->
                  <div class="batch-progress-text" style="font-size: 0.75rem; color: #64748B; margin-top: 3px;">
                    Periksa ${metrics.inspectedPercent}% · Terseleksi ${metrics.selectedPercent}%
                  </div>

                </div>
              `;
            }).join('')}
          </div>

        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Multi-Bedengan Selector Modal (Section 11)
 * Displays Bedengan list with population and remaining uninspected polybag.
 * Deduplicates by unique composite key: `${batchCode}::${bedenganCode}`
 */
export function openBedenganSourceSelectorModal({
  stage = 'SELEKSI_1',
  batchCode,
  programCode,
  docs = [],
  user,
  onSelect
}) {
  // Deduplicate by composite key: batchCode + '::' + bedenganCode
  const uniqueBedMap = new Map();
  docs.forEach(doc => {
    let bedScopeList = [];
    if (stage === 'SELEKSI_3' || stage === 'SELEKSI_III') {
      bedScopeList = getBedenganScopeStatusForSeleksi3(doc);
    } else if (stage === 'SELEKSI_2' || stage === 'SELEKSI_II') {
      bedScopeList = getBedenganScopeStatusForSeleksi2(doc);
    } else {
      bedScopeList = getBedenganScopeStatusForSeleksi1(doc);
    }

    const rawBed = doc.bedenganCode || doc.bedengan || (bedScopeList[0] && bedScopeList[0].bedenganCode) || (doc.rows && doc.rows[0] && (doc.rows[0].bedenganCode || doc.rows[0].bedenganId)) || 'BED-001';
    const bedCode = formatBedenganDisplayCode(rawBed);
    const compositeKey = `${batchCode}::${bedCode}`;

    if (!uniqueBedMap.has(compositeKey)) {
      const sourcePoly = parseInt(doc.sourcePolybagQty !== undefined ? doc.sourcePolybagQty : (doc.sourceBibitQty || 0), 10);
      const currentScope = bedScopeList.find(b => formatBedenganDisplayCode(b.bedenganCode).toUpperCase() === bedCode.toUpperCase()) || { remainingPolybag: sourcePoly, initialPolybag: sourcePoly };
      const remainingPoly = currentScope.remainingPolybag !== undefined ? currentScope.remainingPolybag : sourcePoly;
      const isFinished = remainingPoly <= 0 && sourcePoly > 0;

      uniqueBedMap.set(compositeKey, {
        doc,
        bedCode,
        sourcePoly,
        remainingPoly,
        isFinished
      });
    }
  });

  const uniqueBedList = Array.from(uniqueBedMap.values());

  const bodyContent = `
    <div style="font-size: 0.82rem; color: #334155; line-height: 1.45;">
      
      <!-- BATCH CONTEXT INFO -->
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px;">
        <div style="font-size: 0.68rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Batch</div>
        <div style="font-size: 0.95rem; font-weight: 800; color: #0F172A;">${esc(batchCode)}</div>
        <div style="font-size: 0.72rem; color: #64748B; margin-top: 2px;">Program: <strong style="color: #334155;">${esc(programCode)}</strong></div>
      </div>

      <!-- BEDENGAN LIST (DEDUPLICATED COMPOSITE SCOPE) -->
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${uniqueBedList.map(item => `
          <div class="item-bedengan-selector" 
               data-doc-id="${esc(item.doc.id)}" 
               data-bedengan-code="${esc(item.bedCode)}" 
               style="background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 8px; padding: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.15s ease;"
               onmouseover="this.style.borderColor='#116834'; this.style.background='#F0FDF4';"
               onmouseout="this.style.borderColor='#E2E8F0'; this.style.background='#FFFFFF';">
            <div>
              <div style="font-weight: 800; font-size: 0.88rem; color: #0F172A;">${esc(item.bedCode)}</div>
              <div style="font-size: 0.78rem; font-weight: 600; color: #475569; margin-top: 2px;">
                ${item.sourcePoly.toLocaleString('id-ID')} Ply
              </div>
              <div style="font-size: 0.72rem; color: ${item.isFinished ? '#15803D' : '#64748B'}; margin-top: 2px;">
                Sisa: <strong style="color: ${item.isFinished ? '#15803D' : '#0F172A'};">${item.remainingPoly.toLocaleString('id-ID')} Ply</strong> ${item.isFinished ? '(Selesai Diperiksa)' : ''}
              </div>
            </div>
            <div style="color: #116834; font-weight: 700; font-size: 0.82rem;">
              Pilih &gt;
            </div>
          </div>
        `).join('')}
      </div>

    </div>
  `;

  openModal({
    title: 'Pilih Bedengan Sumber',
    body: bodyContent
  });

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  modalRoot.querySelectorAll('.item-bedengan-selector').forEach(el => {
    el.addEventListener('click', () => {
      const docId = el.dataset.docId;
      const targetDoc = docs.find(d => d.id === docId);
      closeModal();
      if (onSelect && targetDoc) {
        onSelect(targetDoc);
      }
    });
  });
}

/**
 * Handle Batch Row Click with Multi-Bedengan Logic (Case A vs Case B)
 */
export function handleBatchRowClick({ stage, programCode, batchCode, user, onSaved }) {
  // GLOBAL ATTENDANCE GATE: Check before opening execution or bedengan selector modal
  const gate = getGlobalAttendanceGateStatus(user);
  if (!gate.isGateUnlocked) {
    showAttendanceRequirementModal({ targetModuleName: 'Penyeleksian' });
    return;
  }

  const rawPreGraftingDocs = getPreGraftingSelectionDocuments({}, user);
  const activeDocs = rawPreGraftingDocs.filter(d => !d.isSplit && !d.isLegacyAggregateSplit);
  const stageFilteredDocs = activeDocs.filter(d => {
    const s = d.selectionStage || 'SELEKSI_I';
    if (stage === 'SELEKSI_3' || stage === 'SELEKSI_III') return s === 'SELEKSI_III' || s === 'SELEKSI_3';
    if (stage === 'SELEKSI_2' || stage === 'SELEKSI_II') return s === 'SELEKSI_II' || s === 'SELEKSI_2';
    return s === 'SELEKSI_I' || s === 'SELEKSI_1';
  });

  const batchDocs = stageFilteredDocs.filter(d => {
    const p = d.programCode || d.programId || d.programName || 'PROGRAM-UNKNOWN';
    const b = d.batchCode || d.batchNo || 'BATCH-UNKNOWN';
    return p === programCode && b === batchCode;
  });

  if (batchDocs.length === 0) {
    toast('Dokumen seleksi tidak ditemukan untuk batch ini.', 'warning');
    return;
  }

  const openExecution = (targetDoc) => {
    if (stage === 'SELEKSI_1' || stage === 'SELEKSI_I') {
      // Row berasal dari active Selection I document yang sudah valid.
      // Tidak perlu re-check canCreatePreGraftingSelection1Document — langsung buka execution.
      openSeleksi1ExecutionModal({ doc: targetDoc, user, onSaved });
    } else if (stage === 'SELEKSI_2' || stage === 'SELEKSI_II') {
      openSeleksi2ExecutionModal({ doc: targetDoc, user, onSaved });
    } else if (stage === 'SELEKSI_3' || stage === 'SELEKSI_III') {
      openSeleksi3ExecutionModal({ doc: targetDoc, user, onSaved });
    }
  };

  // Group into unique composite bedengans
  const uniqueBedMap = new Map();
  batchDocs.forEach(d => {
    const rawBed = d.bedenganCode || d.bedengan || (d.rows && d.rows[0] && (d.rows[0].bedenganCode || d.rows[0].bedenganId)) || 'BED-001';
    const bed = formatBedenganDisplayCode(rawBed);
    const key = `${batchCode}::${bed}`;
    if (!uniqueBedMap.has(key)) {
      uniqueBedMap.set(key, d);
    }
  });

  if (uniqueBedMap.size === 1) {
    // CASE A: Exactly 1 Unique Bedengan -> auto-select Bedengan -> open execution modal directly
    openExecution(uniqueBedMap.values().next().value);
  } else {
    // CASE B: >1 Unique Bedengans -> open modal "Pilih Bedengan Sumber"
    openBedenganSourceSelectorModal({
      stage,
      batchCode,
      programCode,
      docs: batchDocs,
      user,
      onSelect: (selectedDoc) => {
        openExecution(selectedDoc);
      }
    });
  }
}

/**
 * Handle Pasca-Okulasi Batch Row Click
 */
export function handlePascaBatchRowClick({ programCode, batchCode, user, onSaved }) {
  // GLOBAL ATTENDANCE GATE: Check before opening Pasca-Okulasi confirmation modal
  const gate = getGlobalAttendanceGateStatus(user);
  if (!gate.isGateUnlocked) {
    showAttendanceRequirementModal({ targetModuleName: 'Seleksi Pasca-Okulasi' });
    return;
  }

  let rawSelectionPool = storage.get('selection_pool', []);
  let scopedPool = filterSelectionByScope(rawSelectionPool, user).filter(item => {
    const existing = findExistingSelectionTransaction(item);
    if (!existing) {
      return item.status !== 'DECLARED_CULLED' && item.status !== SELECTION_STATUS.DISETUJUI && item.status !== SELECTION_STATUS.MENUNGGU_VERIFIKASI && item.status !== 'SUBMITTED_TO_ASB' && item.status !== 'VERIFIED';
    }
    if (existing.status === SELECTION_STATUS.DIKEMBALIKAN || existing.status === 'REVISION' || item.status === SELECTION_STATUS.DIKEMBALIKAN || item.status === 'REVISION') {
      if (existing.returnReason && !item.returnReason) {
        item.returnReason = existing.returnReason;
      }
      item.status = SELECTION_STATUS.DIKEMBALIKAN;
      return true;
    }
    return false;
  });

  const postGraftingSelectionPool = scopedPool.filter(item =>
    item.originType !== 'REJECT_DEDERAN' &&
    item.sourceModule !== 'DEDERAN' &&
    item.originType !== 'REJECT_PENYEMAIAN' &&
    item.sourceModule !== 'PENYEMAIAN'
  );

  const batchItems = postGraftingSelectionPool.filter(item => {
    const p = item.programCode || item.programId || item.programName || item.program || 'PROGRAM-UNKNOWN';
    const b = item.batchCode || item.batchNo || 'BATCH-UNKNOWN';
    return p === programCode && b === batchCode;
  });

  if (batchItems.length === 0) {
    toast('Data seleksi pasca-okulasi tidak ditemukan untuk batch ini.', 'warning');
    return;
  }

  const triggerDeclare = (targetItem) => {
    const displayDocNo = standardizeSelectionDocNo(targetItem.docNo, 1);
    openSelectionConfirmationModal({
      item: targetItem,
      displayDocNo,
      user,
      onConfirm: ({ category, notes }) => {
        openSelectionCameraModal({
          item: targetItem,
          displayDocNo,
          user,
          category,
          notes,
          onCaptureCancel: () => {
            toast('Pengambilan foto dokumentasi dibatalkan. Deklarasi belum disimpan.', 'info');
          },
          onCaptureSuccess: (photoResult) => {
            try {
              const res = declareSelectionItem(targetItem, photoResult, user, { category, notes });
              if (res.isNew) {
                toast(`Deklarasi bibit afkir (${res.transaction.docNo}) berhasil disimpan.`, 'success');
              } else {
                toast(`Data seleksi (${res.transaction.docNo}) sudah tercatat. Dokumentasi diperbarui.`, 'info');
              }
              if (onSaved) onSaved();
            } catch (err) {
              console.error('[Declare Selection Error]', err);
              toast(err.message || 'Gagal menyimpan deklarasi seleksi', 'error');
            }
          }
        });
      }
    });
  };

  if (batchItems.length === 1) {
    triggerDeclare(batchItems[0]);
  } else {
    // Open selector for Pasca-Okulasi items / bedengans
    const bodyContent = `
      <div style="font-size: 0.82rem; color: #334155; line-height: 1.45;">
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px;">
          <div style="font-size: 0.68rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Batch</div>
          <div style="font-size: 0.95rem; font-weight: 800; color: #0F172A;">${esc(batchCode)}</div>
          <div style="font-size: 0.72rem; color: #64748B; margin-top: 2px;">Program: <strong style="color: #334155;">${esc(programCode)}</strong></div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${batchItems.map(item => {
            const bedCode = item.bedenganCode || item.bedengan || 'BED-001';
            const qty = parseInt(item.jumlahAfkir || item.quantity || 0, 10);
            return `
              <div class="item-pasca-selector" 
                   data-item-id="${esc(item.id || item.docNo)}" 
                   style="background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 8px; padding: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.15s ease;"
                   onmouseover="this.style.borderColor='#116834'; this.style.background='#F0FDF4';"
                   onmouseout="this.style.borderColor='#E2E8F0'; this.style.background='#FFFFFF';">
                <div>
                  <div style="font-weight: 800; font-size: 0.88rem; color: #0F172A;">${esc(bedCode)}</div>
                  <div style="font-size: 0.78rem; color: #DC2626; font-weight: 700; margin-top: 2px;">
                    ${qty.toLocaleString('id-ID')} Pkk Afkir
                  </div>
                  <div style="font-size: 0.72rem; color: #64748B; margin-top: 2px;">
                    Dok. Asal: <strong style="color: #334155;">${esc(item.sourceDocNo || item.docNo || '-')}</strong>
                  </div>
                </div>
                <div style="color: #116834; font-weight: 700; font-size: 0.82rem;">
                  Pilih &gt;
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    openModal({
      title: 'Pilih Bedengan Sumber',
      body: bodyContent
    });

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    modalRoot.querySelectorAll('.item-pasca-selector').forEach(el => {
      el.addEventListener('click', () => {
        const itemId = el.dataset.itemId;
        const targetItem = batchItems.find(i => (i.id && i.id === itemId) || (i.docNo && i.docNo === itemId));
        closeModal();
        if (targetItem) {
          triggerDeclare(targetItem);
        }
      });
    });
  }
}

/**
 * Standardized Child Transactions Summary Section (Seleksi I, II, III)
 */
export function renderGlobalChildTransactionsSection(txs = [], docs = [], stage = 'SELEKSI_1', user) {
  const stageLabel = stage === 'SELEKSI_3' || stage === 'SELEKSI_III' ? 'Seleksi III' : (stage === 'SELEKSI_2' || stage === 'SELEKSI_II' ? 'Seleksi II' : 'Seleksi I');

  return `
    <div class="section-global-child-transactions" style="margin-top: 20px; padding-top: 14px; border-top: 2px solid #E2E8F0;">
      <!-- STATUS BANNER FILTER TANGGAL -->
      ${renderDateFilterBannerHtml(selectedSelectionDate, 'btn-reset-date-filter')}

      <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
        <h2 style="font-size: 0.92rem; font-weight: 800; color: #0F172A; margin: 0;">
          Ringkasan Transaksi (${txs.length})
        </h2>
      </div>

      ${txs.length === 0 ? renderEmptyStateCard({
        title: 'Belum ada transaksi pelaksanaan',
        description: `Belum ada pemeriksaan yang dicatat untuk ${stageLabel}.`
      }) : `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${txs.map((tx, txIdx) => {
            const parentDoc = docs.find(d =>
              d.id === tx.parentSelectionDocumentId ||
              d.id === tx.selectionDocumentId ||
              d.docNo === tx.parentSelectionDocNo ||
              d.docNo === tx.selectionDocNo ||
              d.docNo === tx.sourceDocNo
            ) || {};
            const polyChecked = tx.actualPolybagInspectedQty !== undefined ? tx.actualPolybagInspectedQty : (tx.polybagScope || tx.initialPolybagCount || 0);
            const bibitAfkir = tx.actualBibitSelectedQty !== undefined ? tx.actualBibitSelectedQty : (tx.bibitReject || tx.jumlahAfkir || 0);

            // Reconcile Bibit Diperiksa: 1 Polybag = 2 Bibit in Seleksi I
            const isStage1 = (stage === 'SELEKSI_1' || stage === 'SELEKSI_I' || tx.transactionType === 'PELAKSANAAN_SELEKSI_I');
            const expectedInspectedBibit = isStage1 ? (polyChecked * 2) : polyChecked;

            let bibitAwal = tx.bibitAwal !== undefined && tx.bibitAwal !== null ? tx.bibitAwal : (tx.jumlahDiperiksa !== undefined ? tx.jumlahDiperiksa : expectedInspectedBibit);
            // Historical fallback: guard against legacy record where bibitAwal was saved as actualBibitSelectedQty (Afkir)
            if (bibitAwal === bibitAfkir && polyChecked > 0 && expectedInspectedBibit > bibitAfkir) {
              bibitAwal = expectedInspectedBibit;
            } else if (bibitAwal <= 0 && polyChecked > 0) {
              bibitAwal = expectedInspectedBibit;
            }

            // Reconcile Bibit Layak: Inspected Bibit - Afkir
            let bibitLayak = tx.actualBibitRetainedQty !== undefined ? tx.actualBibitRetainedQty : (tx.bibitDipertahankan !== undefined ? tx.bibitDipertahankan : tx.jumlahLayak);
            if (bibitLayak === undefined || bibitLayak === null || bibitLayak > bibitAwal || (bibitAwal === expectedInspectedBibit && (bibitLayak + bibitAfkir !== bibitAwal))) {
              bibitLayak = Math.max(0, bibitAwal - bibitAfkir);
            }

            const isParentApprovedOrSubmitted = parentDoc.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI || parentDoc.status === 'DIAJUKAN' || parentDoc.status === SELECTION_STATUS.DISETUJUI;
            const txDate = tx.tanggalSeleksi || tx.tanggal || tx.createdAt || '-';

            return `
              <div class="card-child-tx" data-tx-id="${esc(tx.id)}" data-doc-no="${esc(tx.docNo)}" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                
                <div class="btn-toggle-child-tx" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; cursor: pointer; user-select: none;">
                  <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                      <span style="font-weight: 800; color: #116834; font-size: 0.80rem;">${stageLabel}</span>
                      <span style="color: #64748B; font-size: 0.72rem;">• Transaksi #${txIdx + 1} (${esc(tx.docNo)})</span>
                      <span style="background: #F1F5F9; color: #475569; font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 4px;">${esc(tx.bedenganCode || tx.bedengan || '-')}</span>
                    </div>
                    <div style="color: #64748B; font-size: 0.72rem; margin-top: 3px;">
                      <strong style="color: #0F172A;">${polyChecked.toLocaleString('id-ID')} Polybag (${bibitAwal.toLocaleString('id-ID')} Bibit)</strong> • Dok. <strong style="color: #334155;">${esc(parentDoc.docNo || tx.parentSelectionDocNo || tx.selectionDocNo || '-')}</strong>
                    </div>
                  </div>
                  
                  <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0;">
                    <span style="font-size: 0.65rem; font-weight: 700; color: #15803D; background: #F0FDF4; border: 1px solid #BBF7D0; padding: 2px 6px; border-radius: 4px;">
                      Selesai
                    </span>
                    <svg class="icon-child-toggle" viewBox="0 0 24 24" width="14" height="14" stroke="#64748B" stroke-width="2.5" fill="none" style="transition: transform 0.2s ease;">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>

                <!-- DATE AT BOTTOM-RIGHT -->
                <div style="text-align: right; font-size: 0.70rem; color: #64748B; margin-top: 6px;">
                  ${esc(txDate)}
                </div>

                <!-- DETAIL TRANSAKSI EXPANDED -->
                <div class="child-tx-detail-content" style="display: none; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #E2E8F0;">
                  <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; font-size: 0.72rem; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; margin-bottom: 8px;">
                    <div>Program: <strong style="color: #0F172A;">${esc(parentDoc.programCode || parentDoc.programName || tx.programCode || '-')}</strong></div>
                    <div>Dokumen Induk: <strong style="color: #0F172A;">${esc(parentDoc.docNo || tx.parentSelectionDocNo || tx.selectionDocNo || '-')}</strong></div>
                    <div>Bedengan: <strong style="color: #0F172A;">${esc(tx.bedenganCode || tx.bedengan || '-')}</strong></div>
                    <div>Tanggal: <strong style="color: #0F172A;">${esc(txDate)}</strong></div>
                  </div>

                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; font-size: 0.70rem; margin-bottom: 8px; text-align: center; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 4px;">
                    <div>Bibit Diperiksa: <strong style="color: #0F172A;">${bibitAwal.toLocaleString('id-ID')}</strong></div>
                    <div>Layak: <strong style="color: #15803D;">${bibitLayak.toLocaleString('id-ID')}</strong></div>
                    <div>Reject: <strong style="color: #DC2626;">${bibitAfkir.toLocaleString('id-ID')}</strong></div>
                  </div>

                  ${!isParentApprovedOrSubmitted ? `
                    <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid #F1F5F9; padding-top: 6px; margin-top: 6px;">
                      <button type="button" class="btn-delete-child-tx" data-stage="${esc(stage)}" data-stage-label="${esc(stageLabel)}" data-tx-id="${esc(tx.id)}" data-doc-no="${esc(tx.docNo)}" style="padding: 4px 10px; background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; border-radius: 4px; font-size: 0.70rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2.2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        Hapus
                      </button>
                    </div>
                  ` : ''}
                </div>

              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

/**
 * Standardized Reject Pool & Culled History List (Dederan, Pindah Semai, Pasca-Okulasi)
 */
export function renderStandardizedRejectList(poolItems = [], culledTxs = [], emptyTitle, emptyDesc, pageTitle, today) {
  return `
    <div style="margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
      <h2 style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin: 0;">${esc(pageTitle)} (${poolItems.length})</h2>
    </div>

    ${poolItems.length === 0 ? renderEmptyStateCard({
      title: emptyTitle,
      description: emptyDesc
    }) : `
      <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
        ${poolItems.map(item => {
          const qtyAfkir = parseInt(item.jumlahAfkir || item.quantity || 0, 10);
          const unit = item.originType === 'REJECT_DEDERAN' ? 'Butir' : 'Pkk';
          const isDederan = item.originType === 'REJECT_DEDERAN' || item.sourceModule === 'DEDERAN';
          const prog = item.programCode || item.programName || item.program || '-';
          const batch = isDederan ? null : (item.batchCode || item.batchNo || null);
          const bedDisplay = formatBedenganDisplayCode(item);
          const sourceDoc = item.sourceDocNo || item.dederanDocNo || item.seedingDocNo || item.buddingDocNo || item.docNo || '-';
          const itemDate = item.tanggalAfkir || item.tanggal || item.createdAt || today;

          return `
            <div class="card-pool-item" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); display: flex; flex-direction: column; gap: 6px;">
              
              <!-- TOP ROW: TITLE & QTY -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <div style="font-size: 0.70rem; font-weight: 700; color: #64748B; text-transform: uppercase;">
                    ${isDederan ? esc(prog) : `${esc(batch || '-')} • ${esc(prog)}`}
                  </div>
                  <div style="font-size: 0.88rem; font-weight: 800; color: #0F172A; margin-top: 1px;">
                    ${esc(bedDisplay)}
                  </div>
                </div>
                <div style="text-align: right;">
                  <span style="font-size: 1.10rem; font-weight: 800; color: #DC2626;">${qtyAfkir.toLocaleString('id-ID')}</span>
                  <span style="font-size: 0.72rem; font-weight: 700; color: #991B1B;">${unit}</span>
                </div>
              </div>

              <!-- MIDDLE ROW: SOURCE DOC & TANGGAL (SEJAJAR) -->
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; color: #64748B;">
                <div>
                  Dok. Asal: <strong style="color: #334155;">${esc(sourceDoc)}</strong>
                </div>
                <div style="font-size: 0.70rem; color: #64748B;">
                  ${esc(itemDate)}
                </div>
              </div>

              <!-- BOTTOM ROW: TOMBOL DEKLARASI FULL-WIDTH -->
              <div style="margin-top: 4px; padding-top: 6px; border-top: 1px solid #F1F5F9;">
                <button type="button" class="btn-deklarasi-afkir" data-pool-id="${esc(item.id || item.docNo)}" style="width: 100%; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(17,104,52,0.2); transition: background 0.15s ease;">
                  Deklarasi Bibit Afkir
                </button>
              </div>

            </div>
          `;
        }).join('')}
      </div>
    `}

    <!-- RIWAYAT TRANSAKSI / DEKLARASI -->
    ${renderCulledHistoryList(culledTxs, 'Belum ada riwayat deklarasi', 'Riwayat deklarasi bibit afkir akan tercatat di sini.', 'Riwayat Deklarasi', today)}
  `;
}

/**
 * Standardized Culled History List
 */
export function renderCulledHistoryList(culledTxs = [], emptyTitle, emptyDesc, title = 'Riwayat Deklarasi', today) {
  return `
    <div style="margin-top: 16px; padding-top: 12px; border-top: 2px solid #E2E8F0;">
      <!-- STATUS BANNER FILTER TANGGAL -->
      ${renderDateFilterBannerHtml(selectedSelectionDate, 'btn-reset-date-filter')}

      <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
        <h2 style="font-size: 0.90rem; font-weight: 800; color: #0F172A; margin: 0;">
          ${esc(title)} (${culledTxs.length})
        </h2>
      </div>

      ${culledTxs.length === 0 ? renderEmptyStateCard({
        title: emptyTitle,
        description: emptyDesc
      }) : `
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${culledTxs.map(tx => {
            const qty = parseInt(tx.jumlahAfkir || tx.quantity || 0, 10);
            const unit = tx.originType === 'REJECT_DEDERAN' ? 'Butir' : 'Pkk';
            const txDate = tx.tanggalSeleksi || tx.tanggal || tx.createdAt || today;
            const bedDisplay = formatBedenganDisplayCode(tx);

            return `
              <div class="card-culled-tx" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <strong style="color: #0F172A; font-size: 0.82rem;">${esc(tx.docNo || '-')}</strong>
                    <span style="font-size: 0.65rem; font-weight: 700; color: #15803D; background: #F0FDF4; border: 1px solid #BBF7D0; padding: 1px 6px; border-radius: 4px;">Tercatat</span>
                  </div>
                  <div style="font-size: 0.72rem; color: #64748B; margin-top: 2px;">
                    ${esc(bedDisplay)} • Sumber: <strong style="color: #334155;">${esc(tx.sourceDocNo || tx.sourceTransactionId || '-')}</strong>
                  </div>
                </div>

                <div style="text-align: right;">
                  <div>
                    <span style="font-weight: 800; font-size: 0.95rem; color: #DC2626;">${qty.toLocaleString('id-ID')}</span>
                    <span style="font-size: 0.70rem; font-weight: 700; color: #991B1B;">${unit}</span>
                  </div>
                  <!-- DATE AT BOTTOM-RIGHT -->
                  <div style="font-size: 0.68rem; color: #64748B; margin-top: 3px;">
                    ${esc(txDate)}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;
}

/**
 * =============================================================================
 * MANTRI BIBITAN: OPERASIONAL SELEKSI PRA-OKULASI & PASCA-OKULASI
 * =============================================================================
 */
function renderMantriSelectionLanding(app, user) {
  const today = formatDate(new Date().toISOString());

  // Pastikan sinkronisasi dederan & seeding rejections selalu dilakukan saat render mantri view
  try {
    syncAllDederanRejectionsToSelectionPool();
    syncAllSeedingsToSelectionPool();
  } catch (err) {
    console.warn('[renderMantriSelectionLanding] Gagal sync rejections:', err);
  }

  function standardizeSelectionDocNo(rawDocNo, index = 1) {
    if (!rawDocNo || typeof rawDocNo !== 'string') {
      return formatStandardDocNo(2026, 'CULL', index);
    }
    const clean = rawDocNo.trim();
    if (clean.startsWith('2026/CULL/')) return clean;
    const match = clean.match(/(\d+)(?:_\d+)?$/);
    const seq = match ? parseInt(match[1], 10) : index;
    return formatStandardDocNo(2026, 'CULL', seq > 0 ? seq : index);
  }

  // Pre-Grafting Selection Documents (Seleksi I, Seleksi II, Seleksi III)
  // Canonical Active Collection: exclude legacy aggregate split documents
  const rawPreGraftingDocs = getPreGraftingSelectionDocuments({}, user);
  const preGraftingDocs = rawPreGraftingDocs.filter(d => !d.isSplit && !d.isLegacyAggregateSplit);
  const seleksi1Docs = preGraftingDocs.filter(d => (d.selectionStage || 'SELEKSI_I') === 'SELEKSI_I' || d.selectionStage === 'SELEKSI_1');
  const seleksi2Docs = preGraftingDocs.filter(d => d.selectionStage === 'SELEKSI_II' || d.selectionStage === 'SELEKSI_2');
  const seleksi3Docs = preGraftingDocs.filter(d => d.selectionStage === 'SELEKSI_III' || d.selectionStage === 'SELEKSI_3');

  // Filter Selection Pool into Pra-Semai (Dederan) vs Pasca-Okulasi
  let rawSelectionPool = storage.get('selection_pool', []);
  let scopedPool = filterSelectionByScope(rawSelectionPool, user).filter(item => {
    const existing = findExistingSelectionTransaction(item);
    if (!existing) {
      return item.status !== 'DECLARED_CULLED' && item.status !== SELECTION_STATUS.DISETUJUI && item.status !== SELECTION_STATUS.MENUNGGU_VERIFIKASI && item.status !== 'SUBMITTED_TO_ASB' && item.status !== 'VERIFIED';
    }
    if (existing.status === SELECTION_STATUS.DIKEMBALIKAN || existing.status === 'REVISION' || item.status === SELECTION_STATUS.DIKEMBALIKAN || item.status === 'REVISION') {
      if (existing.returnReason && !item.returnReason) {
        item.returnReason = existing.returnReason;
      }
      item.status = SELECTION_STATUS.DIKEMBALIKAN;
      return true;
    }
    return false;
  });

  const preSowingSelectionPool = scopedPool.filter(item =>
    (item.originType === 'REJECT_DEDERAN' || (!item.originType && item.sourceModule === 'DEDERAN')) &&
    (parseInt(item.jumlahAfkir || item.quantity || 0, 10) > 0)
  );
  const pindahSemaiSelectionPool = scopedPool.filter(item =>
    (item.originType === 'REJECT_PENYEMAIAN' || (!item.originType && item.sourceModule === 'PENYEMAIAN')) &&
    (parseInt(item.jumlahAfkir || item.quantity || 0, 10) > 0)
  );
  const postGraftingSelectionPool = scopedPool.filter(item =>
    item.originType !== 'REJECT_DEDERAN' &&
    item.sourceModule !== 'DEDERAN' &&
    item.originType !== 'REJECT_PENYEMAIAN' &&
    item.sourceModule !== 'PENYEMAIAN'
  );

  const allCulledTxs = storage.get('selection_transactions', []);
  // scopedAllTxs: ALL scoped transactions (termasuk Seleksi I/II/III execution yang punya selectionDocumentId/parentSelectionDocumentId)
  const scopedAllTxs = filterSelectionByScope(allCulledTxs, user);
  // scopedCulledTxs: hanya standalone cull transactions (Pra-Penyemaian, Pindah Semai, Pasca-Okulasi) — TANPA execution tx
  const scopedCulledTxs = scopedAllTxs.filter(tx => !tx.selectionDocumentId && !tx.parentSelectionDocumentId && tx.selectionType !== SELECTION_TYPES.PRA_OKULASI);

  const preSowingCulledTxs = scopedCulledTxs.filter(tx =>
    tx.originType === 'REJECT_DEDERAN' || (!tx.originType && tx.sourceModule === 'DEDERAN')
  );
  const pindahSemaiCulledTxs = scopedCulledTxs.filter(tx =>
    tx.originType === 'REJECT_PENYEMAIAN' || (!tx.originType && tx.sourceModule === 'PENYEMAIAN')
  );
  const postGraftingCulledTxs = scopedCulledTxs.filter(tx =>
    tx.originType !== 'REJECT_DEDERAN' &&
    tx.sourceModule !== 'DEDERAN' &&
    tx.originType !== 'REJECT_PENYEMAIAN' &&
    tx.sourceModule !== 'PENYEMAIAN'
  );

  // Program Grouping for Compact Views
  const seleksi1ProgGroups = groupPreGraftingDocsByProgram(seleksi1Docs);
  const seleksi2ProgGroups = groupPreGraftingDocsByProgram(seleksi2Docs);
  const seleksi3ProgGroups = groupPreGraftingDocsByProgram(seleksi3Docs);
  const postGraftingProgGroups = groupPostGraftingDocsByProgram(postGraftingSelectionPool);

  // Child Transactions per Stage
  // Seleksi I/II/III execution transactions diambil dari scopedAllTxs (bukan scopedCulledTxs)
  // karena execution tx inherently punya selectionDocumentId dan selectionType PRA_OKULASI
  const allSeleksi1Txs = scopedAllTxs.filter(tx => {
    const isStage1 = (
      tx.selectionStage === 'SELEKSI_1' ||
      tx.selectionStage === 'SELEKSI_I' ||
      tx.selectionType === SELECTION_TYPES.PRA_OKULASI ||
      tx.transactionType === 'PELAKSANAAN_SELEKSI_I'
    );
    if (!isStage1) return false;
    return seleksi1Docs.some(d =>
      d.id === tx.parentSelectionDocumentId ||
      d.id === tx.selectionDocumentId ||
      d.docNo === tx.parentSelectionDocNo ||
      d.docNo === tx.selectionDocNo ||
      d.docNo === tx.sourceDocNo
    );
  });

  const allSeleksi2Txs = scopedAllTxs.filter(tx => {
    const isStage2 = (
      tx.selectionStage === 'SELEKSI_2' ||
      tx.selectionStage === 'SELEKSI_II' ||
      tx.transactionType === 'PELAKSANAAN_SELEKSI_II'
    );
    if (!isStage2) return false;
    return seleksi2Docs.some(d =>
      d.id === tx.parentSelectionDocumentId ||
      d.id === tx.selectionDocumentId ||
      d.docNo === tx.parentSelectionDocNo ||
      d.docNo === tx.selectionDocNo ||
      d.docNo === tx.sourceDocNo
    );
  });

  const allSeleksi3Txs = scopedAllTxs.filter(tx => {
    const isStage3 = (
      tx.selectionStage === 'SELEKSI_3' ||
      tx.selectionStage === 'SELEKSI_III' ||
      tx.transactionType === 'PELAKSANAAN_SELEKSI_III'
    );
    if (!isStage3) return false;
    return seleksi3Docs.some(d =>
      d.id === tx.parentSelectionDocumentId ||
      d.id === tx.selectionDocumentId ||
      d.docNo === tx.parentSelectionDocNo ||
      d.docNo === tx.selectionDocNo ||
      d.docNo === tx.sourceDocNo
    );
  });

  // Filter child & culled transactions by selectedSelectionDate for Ringkasan displays
  const filteredSeleksi1Txs = allSeleksi1Txs.filter(tx => normalizeDateStr(tx.tanggalSeleksi || tx.tanggal || tx.createdAt) === selectedSelectionDate);
  const filteredSeleksi2Txs = allSeleksi2Txs.filter(tx => normalizeDateStr(tx.tanggalSeleksi || tx.tanggal || tx.createdAt) === selectedSelectionDate);
  const filteredSeleksi3Txs = allSeleksi3Txs.filter(tx => normalizeDateStr(tx.tanggalSeleksi || tx.tanggal || tx.createdAt) === selectedSelectionDate);

  const filteredPreSowingCulledTxs = preSowingCulledTxs.filter(tx => normalizeDateStr(tx.tanggalSeleksi || tx.tanggal || tx.createdAt) === selectedSelectionDate);
  const filteredPindahSemaiCulledTxs = pindahSemaiCulledTxs.filter(tx => normalizeDateStr(tx.tanggalSeleksi || tx.tanggal || tx.createdAt) === selectedSelectionDate);
  const filteredPostGraftingCulledTxs = postGraftingCulledTxs.filter(tx => normalizeDateStr(tx.tanggalSeleksi || tx.tanggal || tx.createdAt) === selectedSelectionDate);

  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;">
        <div style="display: flex; align-items: center;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 700; color: #0F172A; margin: 0 0 0 6px; letter-spacing: -0.01em;">Penyeleksian Bibitan</h1>
        </div>
        <div>
          ${renderCalendarHeaderButton('btn-open-date-filter', selectedSelectionDate)}
        </div>
      </header>

      <!-- TAB NAVIGATION MANTRI: PRA-SEMAI (DEDERAN) vs DITOLAK PINDAH SEMAI vs PRA-OKULASI vs PASCA-OKULASI -->
      <div class="no-scrollbar" style="display: flex; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 0 16px; gap: 14px; overflow-x: auto; flex-shrink: 0; scrollbar-width: none; -ms-overflow-style: none;">
        <button id="tab-mantri-pre-sowing" type="button" style="padding: 12px 2px; font-size: 0.80rem; font-weight: ${activeMantriTab === 'PRE_SOWING' ? '700' : '600'}; color: ${activeMantriTab === 'PRE_SOWING' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeMantriTab === 'PRE_SOWING' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 5px; white-space: nowrap;">
          <span>Seleksi Pra-Semai (Dederan)</span>
          ${preSowingSelectionPool.length > 0 ? `<span style="background: #DC2626; color: #FFFFFF; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${preSowingSelectionPool.length}</span>` : ''}
        </button>
        <button id="tab-mantri-pindah-semai-reject" type="button" style="padding: 12px 2px; font-size: 0.80rem; font-weight: ${activeMantriTab === 'PINDAH_SEMAI_REJECT' ? '700' : '600'}; color: ${activeMantriTab === 'PINDAH_SEMAI_REJECT' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeMantriTab === 'PINDAH_SEMAI_REJECT' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 5px; white-space: nowrap;">
          <span>Seleksi Ditolak Pindah Semai</span>
          ${pindahSemaiSelectionPool.length > 0 ? `<span style="background: #DC2626; color: #FFFFFF; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${pindahSemaiSelectionPool.length}</span>` : ''}
        </button>
        <button id="tab-mantri-pre-grafting" type="button" style="padding: 12px 2px; font-size: 0.80rem; font-weight: ${activeMantriTab === 'PRE_GRAFTING' ? '700' : '600'}; color: ${activeMantriTab === 'PRE_GRAFTING' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeMantriTab === 'PRE_GRAFTING' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 5px; white-space: nowrap;">
          <span>Seleksi Pra-Okulasi</span>
          ${preGraftingDocs.length > 0 ? `<span style="background: #116834; color: #FFFFFF; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${preGraftingDocs.length}</span>` : ''}
        </button>
        <button id="tab-mantri-post-grafting" type="button" style="padding: 12px 2px; font-size: 0.80rem; font-weight: ${activeMantriTab === 'POST_GRAFTING' ? '700' : '600'}; color: ${activeMantriTab === 'POST_GRAFTING' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeMantriTab === 'POST_GRAFTING' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 5px; white-space: nowrap;">
          <span>Seleksi Pasca-Okulasi</span>
          ${postGraftingSelectionPool.length > 0 ? `<span style="background: #64748B; color: #FFFFFF; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${postGraftingSelectionPool.length}</span>` : ''}
        </button>
      </div>

      <!-- MAIN CONTENT -->
      <main style="flex: 1; overflow-y: auto; padding: 12px 14px;">
        
        ${activeMantriTab === 'PRE_GRAFTING' ? `
          <!-- SUB-TAB SELEKSI PRA-OKULASI: SELEKSI I vs SELEKSI II vs SELEKSI III -->
          <div style="display: flex; background: #F1F5F9; border-radius: 8px; padding: 4px; margin-bottom: 14px; gap: 4px;">
            <button id="subtab-seleksi-1" type="button" style="flex: 1; padding: 8px 4px; font-size: 0.78rem; font-weight: ${activePreGraftingTab === 'SELEKSI_1' ? '700' : '600'}; color: ${activePreGraftingTab === 'SELEKSI_1' ? '#116834' : '#64748B'}; background: ${activePreGraftingTab === 'SELEKSI_1' ? '#FFFFFF' : 'transparent'}; border: none; border-radius: 6px; cursor: pointer; box-shadow: ${activePreGraftingTab === 'SELEKSI_1' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'}; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span>Seleksi I</span>
              <span style="background: ${activePreGraftingTab === 'SELEKSI_1' ? '#116834' : '#94A3B8'}; color: #FFF; font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${seleksi1Docs.length}</span>
            </button>
            <button id="subtab-seleksi-2" type="button" style="flex: 1; padding: 8px 4px; font-size: 0.78rem; font-weight: ${activePreGraftingTab === 'SELEKSI_2' ? '700' : '600'}; color: ${activePreGraftingTab === 'SELEKSI_2' ? '#116834' : '#64748B'}; background: ${activePreGraftingTab === 'SELEKSI_2' ? '#FFFFFF' : 'transparent'}; border: none; border-radius: 6px; cursor: pointer; box-shadow: ${activePreGraftingTab === 'SELEKSI_2' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'}; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span>Seleksi II</span>
              <span style="background: ${activePreGraftingTab === 'SELEKSI_2' ? '#116834' : '#94A3B8'}; color: #FFF; font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${seleksi2Docs.length}</span>
            </button>
            <button id="subtab-seleksi-3" type="button" style="flex: 1; padding: 8px 4px; font-size: 0.78rem; font-weight: ${activePreGraftingTab === 'SELEKSI_3' ? '700' : '600'}; color: ${activePreGraftingTab === 'SELEKSI_3' ? '#116834' : '#64748B'}; background: ${activePreGraftingTab === 'SELEKSI_3' ? '#FFFFFF' : 'transparent'}; border: none; border-radius: 6px; cursor: pointer; box-shadow: ${activePreGraftingTab === 'SELEKSI_3' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'}; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span>Seleksi III</span>
              <span style="background: ${activePreGraftingTab === 'SELEKSI_3' ? '#116834' : '#94A3B8'}; color: #FFF; font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${seleksi3Docs.length}</span>
            </button>
          </div>

          ${activePreGraftingTab === 'SELEKSI_1' ? `
            <!-- VIEW 1: SELEKSI I PRA-OKULASI (COMPACT PROGRAM/BATCH VIEW) -->
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
              <h2 style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin: 0;">Dokumen Seleksi I (Pra-Okulasi) (${seleksi1Docs.length})</h2>
            </div>

            ${renderProgramBatchCompactView({
              programGroups: seleksi1ProgGroups,
              stage: 'SELEKSI_1',
              emptyTitle: 'Belum Ada Dokumen Seleksi I',
              emptyDesc: 'Dokumen seleksi pra-okulasi otomatis dibentuk saat transaksi Penyemaian dicatat.'
            })}

            <!-- SUMMARY TRANSAKSI PELAKSANAAN SELEKSI I -->
            ${renderGlobalChildTransactionsSection(filteredSeleksi1Txs, seleksi1Docs, 'SELEKSI_1', user)}

          ` : activePreGraftingTab === 'SELEKSI_2' ? `
            <!-- VIEW 2: SELEKSI II PRA-OKULASI (COMPACT PROGRAM/BATCH VIEW) -->
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
              <h2 style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin: 0;">Dokumen Seleksi II (Pra-Okulasi) (${seleksi2Docs.length})</h2>
            </div>

            ${renderProgramBatchCompactView({
              programGroups: seleksi2ProgGroups,
              stage: 'SELEKSI_2',
              emptyTitle: 'Belum Ada Dokumen Seleksi II',
              emptyDesc: 'Dokumen Seleksi II akan dibuat setelah Dokumen Seleksi I berstatus FINAL disetujui oleh Asisten Bibitan.'
            })}

            <!-- SUMMARY TRANSAKSI PELAKSANAAN SELEKSI II -->
            ${renderGlobalChildTransactionsSection(filteredSeleksi2Txs, seleksi2Docs, 'SELEKSI_2', user)}

          ` : `
            <!-- VIEW 3: SELEKSI III PRA-OKULASI (COMPACT PROGRAM/BATCH VIEW) -->
            <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
              <h2 style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin: 0;">Dokumen Seleksi III (Pra-Okulasi) (${seleksi3Docs.length})</h2>
            </div>

            ${renderProgramBatchCompactView({
              programGroups: seleksi3ProgGroups,
              stage: 'SELEKSI_3',
              emptyTitle: 'Belum Ada Dokumen Seleksi III',
              emptyDesc: 'Dokumen Seleksi III akan dibuat setelah Dokumen Seleksi II berstatus FINAL disetujui oleh Asisten Bibitan.'
            })}

            <!-- SUMMARY TRANSAKSI PELAKSANAAN SELEKSI III -->
            ${renderGlobalChildTransactionsSection(filteredSeleksi3Txs, seleksi3Docs, 'SELEKSI_3', user)}
          `}

        ` : activeMantriTab === 'PRE_SOWING' ? `
          <!-- VIEW: BIBIT AFKIR PRA-SEMAI (DEDERAN) -->
          ${renderStandardizedRejectList(preSowingSelectionPool, filteredPreSowingCulledTxs, 'Belum Ada Data Afkir Dederan', 'Data afkir dederan akan muncul saat terdapat bibit yang tidak berhasil pada pemeriksaan dederan.', 'Daftar Bibit Afkir Pra-Semai (Dederan)', today)}
        ` : activeMantriTab === 'PINDAH_SEMAI_REJECT' ? `
          <!-- VIEW: BIBIT DITOLAK PINDAH SEMAI -->
          ${renderStandardizedRejectList(pindahSemaiSelectionPool, filteredPindahSemaiCulledTxs, 'Belum Ada Data Ditolak Pindah Semai', 'Data bibit ditolak akan muncul saat transaksi Pindah Semai mencatat adanya bibit yang ditolak/afkir.', 'Daftar Hasil Ditolak Pindah Semai', today)}
        ` : `
          <!-- VIEW: BIBIT AFKIR PASCA-OKULASI (COMPACT PROGRAM/BATCH VIEW) -->
          <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin: 0;">Seleksi Pasca-Okulasi (${postGraftingSelectionPool.length})</h2>
          </div>

          ${renderProgramBatchCompactView({
            programGroups: postGraftingProgGroups,
            stage: 'POST_GRAFTING',
            emptyTitle: 'Belum Ada Data Afkir Pasca-Okulasi',
            emptyDesc: 'Data bibit afkir akan muncul saat terdapat bibit yang ditolak pada transaksi Okulasi, Pemeriksaan Okulasi, atau Okulasi Janda.',
            isPasca: true
          })}

          <!-- RIWAYAT DEKLARASI PASCA-OKULASI -->
          ${renderCulledHistoryList(filteredPostGraftingCulledTxs, 'Belum ada riwayat seleksi pasca-okulasi', 'Riwayat deklarasi seleksi pasca-okulasi akan tercatat di sini.', 'Riwayat Deklarasi Pasca-Okulasi', today)}
        `}

      </main>

      <!-- MODAL FILTER TANGGAL (HARI INI, KEMARIN, PILIH TANGGAL) -->
      ${renderDatePickerModalHtml(selectedSelectionDate)}
    </div>
  `;

  // Back button
  app.querySelector('#btn-back')?.addEventListener('click', () => navigate('/home'));

  // Main Tab switching
  app.querySelector('#tab-mantri-pre-sowing')?.addEventListener('click', () => {
    activeMantriTab = 'PRE_SOWING';
    renderMantriSelectionLanding(app, user);
  });

  app.querySelector('#tab-mantri-pindah-semai-reject')?.addEventListener('click', () => {
    activeMantriTab = 'PINDAH_SEMAI_REJECT';
    renderMantriSelectionLanding(app, user);
  });

  app.querySelector('#tab-mantri-pre-grafting')?.addEventListener('click', () => {
    activeMantriTab = 'PRE_GRAFTING';
    renderMantriSelectionLanding(app, user);
  });

  app.querySelector('#tab-mantri-post-grafting')?.addEventListener('click', () => {
    activeMantriTab = 'POST_GRAFTING';
    renderMantriSelectionLanding(app, user);
  });

  // Sub-Tab switching under Pre-Grafting
  app.querySelector('#subtab-seleksi-1')?.addEventListener('click', () => {
    activePreGraftingTab = 'SELEKSI_1';
    renderMantriSelectionLanding(app, user);
  });

  app.querySelector('#subtab-seleksi-2')?.addEventListener('click', () => {
    activePreGraftingTab = 'SELEKSI_2';
    renderMantriSelectionLanding(app, user);
  });

  app.querySelector('#subtab-seleksi-3')?.addEventListener('click', () => {
    activePreGraftingTab = 'SELEKSI_3';
    renderMantriSelectionLanding(app, user);
  });

  // Batch row click for Seleksi I, II, III
  app.querySelectorAll('.row-batch-clickable').forEach(row => {
    row.addEventListener('click', (e) => {
      const stage = row.dataset.stage || 'SELEKSI_1';
      const programCode = row.dataset.programCode;
      const batchCode = row.dataset.batchCode;
      handleBatchRowClick({
        stage,
        programCode,
        batchCode,
        user,
        onSaved: () => {
          renderMantriSelectionLanding(app, user);
        }
      });
    });
  });

  // Batch row click for Pasca-Okulasi
  app.querySelectorAll('.row-batch-pasca-clickable').forEach(row => {
    row.addEventListener('click', (e) => {
      const programCode = row.dataset.programCode;
      const batchCode = row.dataset.batchCode;
      handlePascaBatchRowClick({
        programCode,
        batchCode,
        user,
        onSaved: () => {
          renderMantriSelectionLanding(app, user);
        }
      });
    });
  });

  // Toggle Child Transaction Detail Expand/Collapse
  app.querySelectorAll('.btn-toggle-child-tx').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const childCard = e.currentTarget.closest('.card-child-tx');
      if (!childCard) return;
      const detailContent = childCard.querySelector('.child-tx-detail-content');
      const icon = e.currentTarget.querySelector('.icon-child-toggle');
      if (!detailContent) return;

      const isExpanded = detailContent.style.display !== 'none';
      if (isExpanded) {
        detailContent.style.display = 'none';
        if (icon) icon.style.transform = 'rotate(0deg)';
      } else {
        detailContent.style.display = 'block';
        if (icon) icon.style.transform = 'rotate(180deg)';
      }
    });
  });

  // Delete Child Transaction with Dependency Guard
  app.querySelectorAll('.btn-delete-child-tx').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const txId = e.currentTarget.dataset.txId;
      const docNo = e.currentTarget.dataset.docNo;
      const stage = e.currentTarget.dataset.stage || 'SELEKSI_1';
      const stageLabel = e.currentTarget.dataset.stageLabel || (stage === 'SELEKSI_2' ? 'Seleksi II' : stage === 'SELEKSI_3' ? 'Seleksi III' : 'Seleksi I');

      // Dependency Guard check
      if (guardDependency(docNo, stageLabel, 'Dihapus')) {
        return;
      }

      if (window.confirm(`Apakah Anda yakin ingin menghapus transaksi pelaksanaan ${docNo || txId}? Data akan dikembalikan ke sisa populasi Dokumen Induk.`)) {
        try {
          if (stage === 'SELEKSI_2' || stage === 'SELEKSI_II') {
            deleteSeleksi2ExecutionTransaction(txId || docNo, user);
          } else if (stage === 'SELEKSI_3' || stage === 'SELEKSI_III') {
            deleteSeleksi3ExecutionTransaction(txId || docNo, user);
          } else {
            deleteSeleksi1ExecutionTransaction(txId || docNo, user);
          }
          toast(`Transaksi pelaksanaan ${docNo || ''} berhasil dihapus.`, 'success');
          renderMantriSelectionLanding(app, user);
        } catch (err) {
          toast(err.message || 'Gagal menghapus transaksi pelaksanaan', 'error');
        }
      }
    });
  });

  // Declaration flow for standalone pool items (Dederan / Pindah Semai)
  app.querySelectorAll('.btn-deklarasi-afkir').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const poolId = e.currentTarget.dataset.poolId;
      const targetPoolItem = scopedPool.find(s => (s.id && s.id === poolId) || (s.docNo && s.docNo === poolId));
      if (!targetPoolItem) return;

      if (targetPoolItem.status === 'DECLARED_CULLED' || targetPoolItem.status === SELECTION_STATUS.DISETUJUI || targetPoolItem.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI || targetPoolItem.status === 'SUBMITTED_TO_ASB' || targetPoolItem.status === 'VERIFIED') {
        toast('Hasil seleksi ini sudah pernah dideklarasikan.', 'info');
        return;
      }

      const existingTx = findExistingSelectionTransaction(targetPoolItem);
      if (existingTx && existingTx.status !== SELECTION_STATUS.DIKEMBALIKAN && existingTx.status !== 'REVISION') {
        toast('Hasil seleksi ini sudah pernah dideklarasikan dan sedang diproses.', 'info');
        return;
      }

      const displayDocNo = standardizeSelectionDocNo(targetPoolItem.docNo, 1);

      // STEP 1: Modal Konfirmasi Deklarasi
      openSelectionConfirmationModal({
        item: targetPoolItem,
        displayDocNo,
        user,
        onConfirm: ({ category, notes }) => {
          // STEP 2: Kamera / Upload Dokumentasi Foto
          openSelectionCameraModal({
            item: targetPoolItem,
            displayDocNo,
            user,
            category,
            notes,
            onCaptureCancel: () => {
              toast('Pengambilan foto dokumentasi dibatalkan. Deklarasi belum disimpan.', 'info');
            },
            onCaptureSuccess: (photoResult) => {
              try {
                const res = declareSelectionItem(targetPoolItem, photoResult, user, { category, notes });
                if (res.isNew) {
                  toast(`Deklarasi bibit afkir (${res.transaction.docNo}) berhasil disimpan dan dokumentasi tercatat.`, 'success');
                } else {
                  toast(`Data seleksi (${res.transaction.docNo}) sudah tercatat sebelumnya. Dokumentasi diperbarui.`, 'info');
                }
                renderMantriSelectionLanding(app, user);
              } catch (err) {
                console.error('[Declare Selection Error]', err);
                toast(err.message || 'Gagal menyimpan deklarasi seleksi', 'error');
              }
            }
          });
        }
      });
    });
  });

  // Modal Events for Date Filter
  attachDatePickerModalEvents({
    container: app,
    currentDateStr: selectedSelectionDate,
    onDateSelect: (newDateStr) => {
      setSelectedSelectionDate(newDateStr);
      renderMantriSelectionLanding(app, user);
    },
    onDateReset: () => {
      setSelectedSelectionDate(todayDDMMYYYY());
      renderMantriSelectionLanding(app, user);
    }
  });
}

/**
 * Standardize Selection Document Number helper at module scope
 */
export function standardizeSelectionDocNo(rawDocNo, index = 1) {
  if (!rawDocNo || typeof rawDocNo !== 'string') {
    return formatStandardDocNo(2026, 'CULL', index);
  }
  const clean = rawDocNo.trim();
  if (clean.startsWith('2026/CULL/')) return clean;
  const match = clean.match(/(\d+)(?:_\d+)?$/);
  const seq = match ? parseInt(match[1], 10) : index;
  return formatStandardDocNo(2026, 'CULL', seq > 0 ? seq : index);
}

/**
 * =============================================================================
 * MODAL KONFIRMASI DEKLARASI BIBIT AFKIR (PASCA SEMAI / DEDERAN)
 * =============================================================================
 */
export function openSelectionConfirmationModal({ item, displayDocNo, user, onConfirm }) {
  const isDederan = item.originType === 'REJECT_DEDERAN' || item.sourceModule === 'DEDERAN';
  const sourceLabel = getSelectionSourceLabel(item);
  const bedenganDisplay = formatBedenganDisplayCode(item);
  const sourceDocNo = item.sourceDocNo || item.dederanDocNo || item.seedingDocNo || item.buddingDocNo || item.inspectionDocNo || '-';
  const programDisplay = item.programCode || item.programName || item.program || '-';
  const batchDisplay = isDederan ? null : (item.batchCode || item.batchNo || null);
  const qtyAfkir = parseInt(item.jumlahAfkir || item.quantity || 0, 10);
  const unit = item.originType === 'REJECT_DEDERAN' ? 'Butir' : 'Pkk';

  const defaultCategory = (item.category || item.alasanDitolakCategory || 'AFKIR').toUpperCase();

  const body = `
    <div style="font-size: 0.82rem; color: #334155; line-height: 1.45;">
      <!-- SOURCE CONTEXT SUMMARY -->
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; margin-bottom: 14px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; font-size: 0.74rem;">
          <div>
            <span style="color: #64748B; display: block; font-size: 0.66rem;">Sumber</span>
            <strong style="color: #0F172A;">${esc(sourceLabel)}</strong>
          </div>
          <div>
            <span style="color: #64748B; display: block; font-size: 0.66rem;">Bedengan</span>
            <strong style="color: #0F172A;">${esc(bedenganDisplay)}</strong>
          </div>
          <div>
            <span style="color: #64748B; display: block; font-size: 0.66rem;">Dokumen Asal</span>
            <strong style="color: #0F172A;">${esc(sourceDocNo)}</strong>
          </div>
          <div>
            <span style="color: #64748B; display: block; font-size: 0.66rem;">${isDederan ? 'Program' : 'Batch & Program'}</span>
            <strong style="color: #0F172A;">${isDederan ? esc(programDisplay) : `${esc(batchDisplay || '-')} • ${esc(programDisplay)}`}</strong>
          </div>
        </div>
      </div>

      <!-- KUANTITAS TIDAK BERHASIL BOX -->
      <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 0.68rem; font-weight: 700; color: #991B1B; text-transform: uppercase; letter-spacing: 0.5px;">Jumlah Tidak Berhasil</div>
          <div style="font-size: 0.72rem; color: #64748B; margin-top: 1px;">Dok. Seleksi: <strong style="color: #334155;">${esc(displayDocNo)}</strong></div>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 1.40rem; font-weight: 900; color: #DC2626; line-height: 1;">${qtyAfkir.toLocaleString('id-ID')}</span>
          <span style="font-size: 0.74rem; font-weight: 700; color: #991B1B; margin-left: 2px;">${unit}</span>
        </div>
      </div>

      <!-- PILIHAN KLASIFIKASI DEKLARASI -->
      <div style="margin-bottom: 14px;">
        <label style="display: block; font-size: 0.76rem; font-weight: 700; color: #0F172A; margin-bottom: 6px;">
          Klasifikasi Seleksi Bibit <span style="color: #DC2626;">*</span>
        </label>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;" id="declaration-category-group">
          <label style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px 4px; border: 1.5px solid #CBD5E1; border-radius: 6px; cursor: pointer; background: #FFFFFF; text-align: center; user-select: none; transition: all 0.15s ease;" class="cat-radio-label">
            <input type="radio" name="sel-declare-category" value="AFKIR" ${defaultCategory === 'AFKIR' ? 'checked' : ''} style="margin-bottom: 4px; accent-color: #116834;">
            <span style="font-weight: 700; font-size: 0.78rem; color: #0F172A;">Afkir</span>
            <span style="font-size: 0.62rem; color: #64748B;">Culling</span>
          </label>
          <label style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px 4px; border: 1.5px solid #CBD5E1; border-radius: 6px; cursor: pointer; background: #FFFFFF; text-align: center; user-select: none; transition: all 0.15s ease;" class="cat-radio-label">
            <input type="radio" name="sel-declare-category" value="REJECT" ${defaultCategory === 'REJECT' ? 'checked' : ''} style="margin-bottom: 4px; accent-color: #116834;">
            <span style="font-weight: 700; font-size: 0.78rem; color: #0F172A;">Reject</span>
            <span style="font-size: 0.62rem; color: #64748B;">Kerdil/Cacat</span>
          </label>
          <label style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px 4px; border: 1.5px solid #CBD5E1; border-radius: 6px; cursor: pointer; background: #FFFFFF; text-align: center; user-select: none; transition: all 0.15s ease;" class="cat-radio-label">
            <input type="radio" name="sel-declare-category" value="MATI" ${defaultCategory === 'MATI' ? 'checked' : ''} style="margin-bottom: 4px; accent-color: #116834;">
            <span style="font-weight: 700; font-size: 0.78rem; color: #0F172A;">Mati</span>
            <span style="font-size: 0.62rem; color: #64748B;">Busuk/Mati</span>
          </label>
        </div>
      </div>

      <!-- CATATAN OPSIONAL -->
      <div style="margin-bottom: 6px;">
        <label style="display: block; font-size: 0.74rem; font-weight: 600; color: #475569; margin-bottom: 4px;">
          Catatan / Keterangan (Opsional)
        </label>
        <textarea id="modal-declare-notes" rows="2" placeholder="Tuliskan catatan kondisi bibit jika ada..." style="width: 100%; border: 1px solid #CBD5E1; border-radius: 6px; padding: 8px; font-size: 0.78rem; font-family: inherit; resize: vertical; box-sizing: border-box;"></textarea>
      </div>
    </div>
  `;

  const footer = `
    <div style="display: flex; gap: 8px; width: 100%;">
      <button type="button" class="btn btn-ghost" id="btn-modal-declare-cancel" style="flex: 1; height: 38px; font-size: 0.80rem;">Batal</button>
      <button type="button" class="btn btn-primary" id="btn-modal-declare-next" style="flex: 2; height: 38px; background: #116834; color: #FFFFFF; font-weight: 700; font-size: 0.80rem; border: none; border-radius: 6px; display: flex; align-items: center; justify-content: center; text-align: center;">
        Lanjut Foto Dokumentasi
      </button>
    </div>
  `;

  openModal({
    title: 'Konfirmasi Deklarasi Bibit',
    body,
    footer
  });

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const btnCancel = modalRoot.querySelector('#btn-modal-declare-cancel');
  const btnNext = modalRoot.querySelector('#btn-modal-declare-next');
  const notesInput = modalRoot.querySelector('#modal-declare-notes');

  btnCancel?.addEventListener('click', () => {
    closeModal();
  });

  btnNext?.addEventListener('click', () => {
    const selectedRadio = modalRoot.querySelector('input[name="sel-declare-category"]:checked');
    const category = selectedRadio ? selectedRadio.value : 'AFKIR';
    const notes = notesInput ? notesInput.value.trim() : '';

    closeModal();
    if (onConfirm) {
      onConfirm({ category, notes });
    }
  });
}

/**
 * =============================================================================
 * MODAL KAMERA & DOKUMENTASI FOTO DEKLARASI SELEKSI BIBIT
 * =============================================================================
 */
export function openSelectionCameraModal({ item, displayDocNo, user, category = 'AFKIR', notes = '', onCaptureSuccess, onCaptureCancel }) {
  const bedLabel = formatBedenganDisplayCode(item);
  const qtyAfkir = parseInt(item.jumlahAfkir || item.quantity || 0, 10);
  const unit = item.originType === 'REJECT_DEDERAN' ? 'Butir' : 'Pkk';

  let currentStream = null;
  let isCameraActive = false;
  let capturedDataUrl = null;
  let capturedPhotoRecord = null;
  let capturedLat = null;
  let capturedLon = null;

  // Initial timestamp display
  const initialDate = new Date();
  const initialDateFormatted = formatDate(initialDate.toISOString());
  const initialTimeFormatted = initialDate.toTimeString().split(' ')[0];
  let currentTimestampStr = `${initialDateFormatted} ${initialTimeFormatted} WIB`;

  // Geolocation pre-fetch (Evidence only, non-blocking)
  try {
    if (navigator && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (pos && pos.coords) {
            capturedLat = Number(pos.coords.latitude.toFixed(6));
            capturedLon = Number(pos.coords.longitude.toFixed(6));
            updateOverlayWatermark();
          }
        },
        (err) => {
          console.info('[Selection Camera] GPS not available or permission denied (Evidence fallback used):', err?.message || err);
        },
        { timeout: 3000, enableHighAccuracy: false }
      );
    }
  } catch (geoErr) {
    console.info('[Selection Camera] Geolocation error:', geoErr?.message || geoErr);
  }

  const getLatLongDisplay = () => {
    const latDisplay = (capturedLat !== null && capturedLat !== undefined) ? String(capturedLat) : '-';
    const lonDisplay = (capturedLon !== null && capturedLon !== undefined) ? String(capturedLon) : '-';
    return { latDisplay, lonDisplay, text: `Lat: ${latDisplay} | Long: ${lonDisplay}` };
  };

  const body = `
    <div style="font-size: 0.82rem; color: #334155; line-height: 1.45;">
      <!-- TOP INFO BAR -->
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem;">
        <div style="min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <span style="color: #64748B;">Dok:</span> <strong style="color: #0F172A;">${esc(displayDocNo)}</strong> • <strong style="color: #116834;">${esc(category)} (${qtyAfkir.toLocaleString('id-ID')} ${unit})</strong>
        </div>
        <div style="flex-shrink: 0; font-weight: 700; color: #334155; margin-left: 8px;">
          ${esc(bedLabel)}
        </div>
      </div>

      <!-- CAMERA / PREVIEW VIEWPORT (REUSE SIGMA CAMERA PATTERN) -->
      <div style="position: relative; width: 100%; height: 260px; background: #0F172A; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);">
        
        <video id="sel-camera-video" playsinline autoplay muted style="width: 100%; height: 100%; object-fit: cover; display: none;"></video>
        
        <canvas id="sel-camera-canvas" style="display: none;"></canvas>

        <img id="sel-camera-preview-img" style="width: 100%; height: 100%; object-fit: cover; display: none;" alt="Preview Foto Dokumentasi">

        <!-- FALLBACK NO CAMERA VIEW -->
        <div id="sel-camera-fallback" style="text-align: center; color: #94A3B8; padding: 20px;">
          <svg viewBox="0 0 24 24" width="40" height="40" stroke="#64748B" stroke-width="1.8" fill="none" style="margin: 0 auto 8px auto; display: block;">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
            <circle cx="12" cy="13" r="4"></circle>
          </svg>
          <div style="font-size: 0.78rem; font-weight: 600; color: #E2E8F0;">Kamera Aktif / Mode Simulasi SIGMA</div>
          <div style="font-size: 0.68rem; color: #94A3B8; margin-top: 2px;">Gunakan tombol "Ambil Foto" untuk mengambil foto dokumentasi seleksi bibit.</div>
        </div>

        <!-- WATERMARK OVERLAY BAR -->
        <div id="sel-camera-watermark-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.72); color: #FFFFFF; padding: 6px 10px; font-size: 0.62rem; line-height: 1.35; display: flex; justify-content: space-between; align-items: flex-end; pointer-events: none;">
          <div>
            <div style="font-weight: 700; color: #FFFFFF;">SIGMA | ${esc(bedLabel)}</div>
            <div id="sel-watermark-time" style="color: #E2E8F0;">${currentTimestampStr}</div>
            <div id="sel-watermark-coords" style="color: #CBD5E1;">${getLatLongDisplay().text}</div>
          </div>
          <div style="font-weight: 700; color: #BBF7D0; text-align: right; flex-shrink: 0;">DEKLARASI ${esc(category)}</div>
        </div>
      </div>
    </div>
  `;

  const footer = `
    <div style="display: flex; gap: 8px; width: 100%; align-items: stretch;">
      <button type="button" class="btn btn-ghost" id="btn-camera-cancel" style="flex: 1; min-width: 60px; height: 38px; font-size: 0.78rem; border: 1px solid #CBD5E1; border-radius: 6px; font-weight: 600; background: #FFFFFF; color: #475569; cursor: pointer;">
        Batal
      </button>
      <button type="button" class="btn" id="btn-camera-shutter" style="flex: 1.2; min-width: 85px; height: 38px; background: #1E293B; color: #FFFFFF; font-weight: 700; font-size: 0.78rem; border: none; border-radius: 6px; cursor: pointer; text-align: center; display: flex; align-items: center; justify-content: center;">
        Ambil Foto
      </button>
      <button type="button" class="btn btn-primary" id="btn-camera-save" style="flex: 2.2; min-width: 140px; height: 38px; background: #116834; color: #FFFFFF; font-weight: 700; font-size: 0.76rem; line-height: 1.2; border: none; border-radius: 6px; cursor: pointer; text-align: center; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(17,104,52,0.2);">
        Simpan dan Kirim ke Asisten
      </button>
    </div>
  `;

  openModal({
    title: 'Dokumentasi Foto Seleksi',
    body,
    footer,
    onClose: () => {
      if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
        currentStream = null;
      }
    }
  });

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  const videoEl = modalRoot.querySelector('#sel-camera-video');
  const canvasEl = modalRoot.querySelector('#sel-camera-canvas');
  const previewImgEl = modalRoot.querySelector('#sel-camera-preview-img');
  const fallbackEl = modalRoot.querySelector('#sel-camera-fallback');
  const btnShutter = modalRoot.querySelector('#btn-camera-shutter');
  const btnSave = modalRoot.querySelector('#btn-camera-save');
  const btnCancel = modalRoot.querySelector('#btn-camera-cancel');
  const watermarkTimeEl = modalRoot.querySelector('#sel-watermark-time');
  const watermarkCoordsEl = modalRoot.querySelector('#sel-watermark-coords');

  function updateOverlayWatermark(timestampText = null) {
    if (timestampText && watermarkTimeEl) {
      watermarkTimeEl.textContent = timestampText;
    }
    if (watermarkCoordsEl) {
      watermarkCoordsEl.textContent = getLatLongDisplay().text;
    }
  }

  async function initCameraStream() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          currentStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
          });
        } catch (errRear) {
          currentStream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
        }
        if (videoEl) {
          videoEl.srcObject = currentStream;
          await videoEl.play();
          isCameraActive = true;
          videoEl.style.display = 'block';
          if (fallbackEl) fallbackEl.style.display = 'none';
        }
      }
    } catch (e) {
      console.info('[Selection Camera] Using canvas/simulation mode:', e?.message || e);
      isCameraActive = false;
      if (videoEl) videoEl.style.display = 'none';
      if (fallbackEl) fallbackEl.style.display = 'block';
    }
  }

  initCameraStream();

  function generateTimestampedCanvas(sourceImgOrVideo = null, captureTimestampStr = null) {
    if (!canvasEl) return '';
    const w = 480;
    const h = 360;
    canvasEl.width = w;
    canvasEl.height = h;
    const ctx = canvasEl.getContext('2d');

    const ts = captureTimestampStr || currentTimestampStr;
    const { latDisplay, lonDisplay } = getLatLongDisplay();

    if (sourceImgOrVideo && (sourceImgOrVideo.videoWidth || sourceImgOrVideo.naturalWidth || sourceImgOrVideo.width)) {
      ctx.drawImage(sourceImgOrVideo, 0, 0, w, h);
    } else {
      // Elegant simulated camera capture frame
      ctx.fillStyle = '#064E3B';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      for (let x = 30; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 30; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`DOKUMENTASI BIBIT ${category.toUpperCase()}`, w / 2, h / 2 - 20);

      ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#D1FAE5';
      ctx.fillText(`${bedLabel} • ${qtyAfkir.toLocaleString('id-ID')} ${unit}`, w / 2, h / 2 + 10);
      ctx.fillText(`Ref: ${displayDocNo}`, w / 2, h / 2 + 32);
    }

    // WATERMARK OVERLAY BAR AT BOTTOM OF PHOTO
    const barHeight = 58;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.fillRect(0, h - barHeight, w, barHeight);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SIGMA | ${bedLabel}`, 10, h - 42);

    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#E2E8F0';
    ctx.fillText(`${ts}`, 10, h - 28);
    ctx.fillText(`Lat: ${latDisplay} | Long: ${lonDisplay}`, 10, h - 14);

    ctx.fillStyle = '#BBF7D0';
    ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`DEKLARASI ${category.toUpperCase()}`, w - 10, h - 42);

    return canvasEl.toDataURL('image/jpeg', 0.85);
  }

  btnShutter?.addEventListener('click', () => {
    // Generate snapshot timestamp at exact capture moment
    const captureDate = new Date();
    const captureDateFormatted = formatDate(captureDate.toISOString());
    const captureTimeFormatted = captureDate.toTimeString().split(' ')[0];
    const captureTimestampStr = `${captureDateFormatted} ${captureTimeFormatted} WIB`;
    currentTimestampStr = captureTimestampStr;

    if (isCameraActive && videoEl && videoEl.videoWidth) {
      capturedDataUrl = generateTimestampedCanvas(videoEl, captureTimestampStr);
    } else {
      capturedDataUrl = generateTimestampedCanvas(null, captureTimestampStr);
    }

    updateOverlayWatermark(captureTimestampStr);

    const photoRecordId = `PHOTO-SEL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    capturedPhotoRecord = {
      id: photoRecordId,
      dataUrl: capturedDataUrl,
      capturedAt: captureDate.toISOString(),
      capturedAtLabel: captureTimestampStr,
      latitude: capturedLat,
      longitude: capturedLon,
      source: 'CAMERA'
    };

    if (previewImgEl) {
      previewImgEl.src = capturedDataUrl;
      previewImgEl.style.display = 'block';
    }
    if (videoEl) videoEl.style.display = 'none';
    if (fallbackEl) fallbackEl.style.display = 'none';
    toast('Foto dokumentasi seleksi berhasil diambil.', 'success');
  });

  btnSave?.addEventListener('click', () => {
    if (!capturedPhotoRecord) {
      const captureDate = new Date();
      const captureDateFormatted = formatDate(captureDate.toISOString());
      const captureTimeFormatted = captureDate.toTimeString().split(' ')[0];
      const captureTimestampStr = `${captureDateFormatted} ${captureTimeFormatted} WIB`;
      currentTimestampStr = captureTimestampStr;

      capturedDataUrl = generateTimestampedCanvas(isCameraActive && videoEl?.videoWidth ? videoEl : null, captureTimestampStr);
      const photoRecordId = `PHOTO-SEL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      capturedPhotoRecord = {
        id: photoRecordId,
        dataUrl: capturedDataUrl,
        capturedAt: captureDate.toISOString(),
        capturedAtLabel: captureTimestampStr,
        latitude: capturedLat,
        longitude: capturedLon,
        source: 'CAMERA'
      };
    }

    if (currentStream) {
      currentStream.getTracks().forEach(t => t.stop());
      currentStream = null;
    }

    closeModal();
    if (onCaptureSuccess) {
      onCaptureSuccess(capturedPhotoRecord);
    }
  });

  btnCancel?.addEventListener('click', () => {
    if (currentStream) {
      currentStream.getTracks().forEach(t => t.stop());
      currentStream = null;
    }
    closeModal();
    if (onCaptureCancel) {
      onCaptureCancel();
    }
  });
}

/**
 * =============================================================================
 * MODAL VERIFIKASI DATA MANTRI SELEKSI I, II & III
 * Menampilkan ringkasan lengkap data sebelum diajukan ke Asisten
 * =============================================================================
 */
export function openPreGraftingReviewModal({ doc, user, onSubmitted }) {
  const isSeleksi3 = (
    doc.selectionStage === SELECTION_STAGES.SELEKSI_3 ||
    doc.selectionStage === 'SELEKSI_III' ||
    doc.selectionStage === 'SELEKSI_3'
  );
  const isSeleksi2 = (
    doc.selectionStage === SELECTION_STAGES.SELEKSI_2 ||
    doc.selectionStage === 'SELEKSI_II' ||
    doc.selectionStage === 'SELEKSI_2'
  );
  const executions = isSeleksi3
    ? getSeleksi3ExecutionsByDocument(doc.id || doc.docNo)
    : (isSeleksi2
      ? getSeleksi2ExecutionsByDocument(doc.id || doc.docNo)
      : getSeleksi1ExecutionsByDocument(doc.id || doc.docNo));
  const bedDisplay = formatBedenganDisplayCode(doc);
  const sourcePolybag = parseInt(doc.sourcePolybagQty || 0, 10);
  const sourceBibit = parseInt(doc.sourceBibitQty || 0, 10);
  const totalLayak = parseInt(doc.totalLayak || 0, 10);
  const totalAfkir = parseInt(doc.totalAfkir || 0, 10);
  const isSubmitted = doc.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI || doc.status === 'DIAJUKAN';
  const isApproved = doc.status === SELECTION_STATUS.DISETUJUI;
  const stageLabel = isSeleksi3 ? 'Seleksi III' : (isSeleksi2 ? 'Seleksi II' : 'Seleksi I');
  const stageBadge = isSeleksi3 ? 'Seleksi III (Pra-Okulasi)' : (isSeleksi2 ? 'Seleksi II (Pra-Okulasi)' : 'Seleksi I (Pra-Okulasi)');

  const modalBody = `
    <div style="font-size: 0.82rem; color: #334155; line-height: 1.5;">
      
      <!-- HEADER RINGKASAN VERIFIKASI DATA -->
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; font-size: 0.74rem;">
          <div>Nomor Dokumen: <strong style="color: #0F172A;">${esc(doc.docNo)}</strong></div>
          <div>Tahap Seleksi: <strong style="color: #1E293B;">${esc(stageBadge)}</strong></div>
          <div>${isSeleksi3 ? 'Sumber Seleksi II' : (isSeleksi2 ? 'Sumber Seleksi I' : 'Dok. Penyemaian Asal')}: <strong style="color: #0F172A;">${esc(doc.sourceSelectionDocNo || doc.sourceDocNo || '-')}</strong></div>
          ${isSeleksi3 && doc.sourceSelection1DocNo && doc.sourceSelection1DocNo !== '-' ? `
            <div>Sumber Seleksi I: <strong style="color: #0F172A;">${esc(doc.sourceSelection1DocNo)}</strong></div>
          ` : ''}
          ${(isSeleksi2 || isSeleksi3) && doc.sourceSeedingDocNo && doc.sourceSeedingDocNo !== '-' ? `
            <div>Penyemaian Asal: <strong style="color: #0F172A;">${esc(doc.sourceSeedingDocNo)}</strong></div>
          ` : ''}
          <div>Batch & Klon: <strong style="color: #0F172A;">${esc(doc.batchCode || '-')} • ${esc(doc.clone || doc.klon || '-')}</strong></div>
          <div>Bedengan: <strong style="color: #0F172A;">${esc(bedDisplay)}</strong></div>
          <div>Jumlah Sesi Transaksi: <strong style="color: #0F172A;">${executions.length} Sesi</strong></div>
        </div>
      </div>

      <!-- METRIK LENGKAP -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px; background: #FFFFFF; margin-bottom: 12px;">
        <div>
          <div style="font-size: 0.60rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Total Populasi</div>
          <div style="font-size: 0.95rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${sourcePolybag.toLocaleString('id-ID')}</div>
          <div style="font-size: 0.58rem; color: #94A3B8;">${isSeleksi3 ? 'Ply / Pkk' : 'Polybag'}</div>
        </div>
        <div>
          <div style="font-size: 0.60rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Bibit Sumber</div>
          <div style="font-size: 0.95rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${sourceBibit.toLocaleString('id-ID')}</div>
          <div style="font-size: 0.58rem; color: #94A3B8;">Pkk</div>
        </div>
        <div>
          <div style="font-size: 0.60rem; font-weight: 700; color: #15803D; text-transform: uppercase;">Bibit Layak</div>
          <div style="font-size: 0.95rem; font-weight: 800; color: #15803D; margin-top: 2px;">${totalLayak.toLocaleString('id-ID')}</div>
          <div style="font-size: 0.58rem; color: #15803D;">Pkk</div>
        </div>
        <div>
          <div style="font-size: 0.60rem; font-weight: 700; color: #DC2626; text-transform: uppercase;">Bibit Reject</div>
          <div style="font-size: 0.95rem; font-weight: 800; color: #DC2626; margin-top: 2px;">${totalAfkir.toLocaleString('id-ID')}</div>
          <div style="font-size: 0.58rem; color: #DC2626;">Pkk</div>
        </div>
      </div>

      <!-- DAFTAR TRANSAKSI PELAKSANAAN -->
      <div style="margin-bottom: 12px;">
        <div style="font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 6px;">
          Rincian Transaksi Pelaksanaan (${executions.length} Sesi):
        </div>
        <div style="max-height: 180px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px;">
          ${executions.map((tx, i) => `
            <div style="background: #F8FAFC; border-radius: 4px; padding: 6px 8px; font-size: 0.72rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>#${i + 1} (${esc(tx.docNo || tx.id)})</strong> — ${esc(tx.bedenganCode || '-')} • ${esc(tx.tanggalSeleksi || tx.tanggal || '-')}
              </div>
              <div style="text-align: right;">
                <span style="color: #15803D; font-weight: 700;">+${(tx.bibitDipertahankan || tx.jumlahLayak || 0).toLocaleString('id-ID')} Layak</span> • 
                <span style="color: #DC2626; font-weight: 700;">-${(tx.bibitReject || tx.jumlahAfkir || 0).toLocaleString('id-ID')} Afkir</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      ${isSubmitted ? `
        <div style="padding: 10px 12px; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 6px; font-size: 0.76rem; color: #1D4ED8;">
          ℹ️ Dokumen ini telah diajukan ke <strong>Asisten Bibitan</strong> dan sedang menunggu verifikasi/persetujuan.
        </div>
      ` : ''}

      ${isApproved ? `
        <div style="padding: 10px 12px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; font-size: 0.76rem; color: #166534;">
          ✅ Dokumen ini telah <strong>Disetujui</strong> oleh Asisten Bibitan.
        </div>
      ` : ''}

    </div>
  `;

  const modalFooter = `
    <div style="display: flex; gap: 8px; width: 100%;">
      <button type="button" class="btn btn-ghost" id="btn-close-review-modal" style="flex: 1; height: 38px; font-size: 0.80rem;">Tutup</button>
      ${!isSubmitted && !isApproved ? `
        <button type="button" class="btn btn-primary" id="btn-go-to-confirmation-hub" style="flex: 2; height: 38px; background: #116834; color: #FFFFFF; font-weight: 700; font-size: 0.80rem; border: none; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
          Konfirmasi di Central Hub
        </button>
      ` : ''}
    </div>
  `;

  openModal({
    title: `Verifikasi Data ${stageLabel}`,
    body: modalBody,
    footer: modalFooter
  });

  const modalRoot = document.getElementById('modal-root');
  if (!modalRoot) return;

  modalRoot.querySelector('#btn-close-review-modal')?.addEventListener('click', closeModal);

  modalRoot.querySelector('#btn-go-to-confirmation-hub')?.addEventListener('click', () => {
    closeModal();
    navigate('/mantri-confirmation');
  });
}

/**
 * =============================================================================
 * RENDER PASCA SEMAI & AFKIR POOL LIST (HARMONISASI UI & MOBILE RESPONSIVE)
 * =============================================================================
 */
function renderAfkirPoolList(poolItems, culledItems, emptyTitle, emptyDesc, poolTitle, today) {
  return `
    ${poolItems.length > 0 ? `
      <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
        <h2 style="font-size: 0.90rem; font-weight: 800; color: #0F172A; margin: 0;">${poolTitle} (${poolItems.length})</h2>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
        ${poolItems.map((item, idx) => {
    const isDederan = item.originType === 'REJECT_DEDERAN' || item.sourceModule === 'DEDERAN';
    const isReturned = item.status === SELECTION_STATUS.DIKEMBALIKAN;
    const displayDocNo = item.docNo || formatStandardDocNo(2026, 'CULL', idx + 1);
    const sourceLabel = getSelectionSourceLabel(item);
    const bedenganDisplay = formatBedenganDisplayCode(item);
    const cardHeaderTitle = isDederan
      ? (bedenganDisplay && bedenganDisplay !== '-' ? bedenganDisplay : (item.dederanDocNo || item.sourceDocNo || 'Dederan'))
      : (item.batchCode || item.batchNo || 'Batch');
    const sourceDocNo = item.sourceDocNo || item.dederanDocNo || item.seedingDocNo || item.buddingDocNo || item.inspectionDocNo || '-';
    const programDisplay = item.programCode || item.programName || item.program || '-';
    const qtyAfkir = parseInt(item.jumlahAfkir || item.quantity || 0, 10);
    const unit = isDederan ? 'Butir' : 'Pkk';
    const klonDisplay = item.clone || item.klon || null;

    return `
            <!-- CARD PENYELEKSIAN BIBIT AFKIR -->
            <div class="card-selection-wrapper card-pasca-semai" data-pool-id="${esc(item.id || item.docNo)}" style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 10px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); display: flex; flex-direction: column; gap: 10px; box-sizing: border-box; min-width: 0;">
              
              <!-- 1. HEADER CARD: BEDENGAN / BATCH + KLON (KIRI) & STATUS BADGE (KANAN) -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div style="min-width: 0;">
                  <div style="font-weight: 800; font-size: 0.95rem; color: #0F172A; letter-spacing: -0.01em; word-break: break-word;">
                    ${esc(cardHeaderTitle)}${klonDisplay ? ` <span style="font-size: 0.76rem; font-weight: 600; color: #64748B;">• Klon ${esc(klonDisplay)}</span>` : ''}
                  </div>
                </div>
                <div style="flex-shrink: 0; display: flex; align-items: center; justify-content: flex-end;">
                  <span style="font-size: 0.65rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: ${isReturned ? '#FEF2F2' : '#FEF3C7'}; color: ${isReturned ? '#DC2626' : '#B45309'}; border: 1px solid ${isReturned ? '#FECACA' : '#FDE68A'}; white-space: nowrap;">
                    ${isReturned ? 'Dikembalikan' : 'Perlu Deklarasi'}
                  </span>
                </div>
              </div>

              <!-- 2. SUMBER INFORMASI SINGKAT -->
              <div style="font-size: 0.72rem; color: #64748B;">
                Sumber: <strong style="color: #0F172A;">${esc(sourceLabel)}</strong>
              </div>

              <!-- 3. CATATAN PENGEMBALIAN DARI ASISTEN (JIKA STATUS DIKEMBALIKAN) -->
              ${isReturned && item.returnReason ? `
                <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 8px 10px; font-size: 0.72rem; color: #991B1B; line-height: 1.4;">
                  <strong style="display: block; font-size: 0.68rem; color: #DC2626; margin-bottom: 2px;">Catatan Pengembalian Asisten:</strong>
                  ${esc(item.returnReason)}
                </div>
              ` : ''}

              <!-- 4. METADATA GRID 2-KOLOM -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; padding: 8px 0; border-top: 1px solid #F1F5F9; border-bottom: 1px solid #F1F5F9; font-size: 0.74rem;">
                <div style="min-width: 0;">
                  <div style="font-size: 0.66rem; color: #64748B; margin-bottom: 1px;">Dok. Asal</div>
                  <div style="font-weight: 700; color: #1E293B; word-break: break-word; overflow-wrap: break-word;">
                    ${esc(sourceDocNo)}
                  </div>
                </div>
                <div style="min-width: 0;">
                  <div style="font-size: 0.66rem; color: #64748B; margin-bottom: 1px;">Program</div>
                  <div style="font-weight: 700; color: #1E293B; word-break: break-word; overflow-wrap: break-word;">
                    ${esc(programDisplay)}
                  </div>
                </div>
                <div style="min-width: 0;">
                  <div style="font-size: 0.66rem; color: #64748B; margin-bottom: 1px;">Dok. Seleksi</div>
                  <div style="font-weight: 700; color: #1E293B; word-break: break-word; overflow-wrap: break-word;">
                    ${esc(displayDocNo)}
                  </div>
                </div>
                <div style="min-width: 0;">
                  <div style="font-size: 0.66rem; color: #64748B; margin-bottom: 1px;">${isDederan ? 'Bedengan' : 'Kategori'}</div>
                  <div style="font-weight: 700; color: #1E293B; word-break: break-word; overflow-wrap: break-word;">
                    ${esc(isDederan ? bedenganDisplay : (item.category || item.alasanDitolakCategory || 'Afkir'))}
                  </div>
                </div>
              </div>

              <!-- 5. QUANTITY SUMMARY -->
              <div style="background: #FEF2F2; border: 1px solid #FEE2E2; border-radius: 8px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; box-sizing: border-box;">
                <div style="min-width: 0; flex: 1;">
                  <div style="font-size: 0.66rem; font-weight: 800; color: #DC2626; text-transform: uppercase; letter-spacing: 0.03em;">
                    Bibit Tidak Berhasil
                  </div>
                  <div style="font-size: 0.72rem; color: #64748B; margin-top: 2px; word-break: break-word; line-height: 1.3;">
                    ${esc(isDederan ? 'Afkir Pemeriksaan Dederan' : (item.alasan || 'Bibit Afkir'))}
                  </div>
                </div>
                <div style="text-align: right; flex-shrink: 0;">
                  <div style="font-size: 1.35rem; font-weight: 900; color: #DC2626; line-height: 1; letter-spacing: -0.02em;">
                    ${qtyAfkir.toLocaleString('id-ID')}
                  </div>
                  <div style="font-size: 0.68rem; font-weight: 700; color: #991B1B; margin-top: 2px;">
                    ${unit}
                  </div>
                </div>
              </div>

              <!-- 6. PRIMARY ACTION: TOMBOL DEKLARASI (TANPA ICON, SIGMA GREEN) -->
              <button type="button" class="btn-deklarasi-afkir" data-pool-id="${esc(item.id || item.docNo)}" style="width: 100%; min-height: 40px; height: 40px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.82rem; cursor: pointer; box-shadow: 0 1px 3px rgba(17,104,52,0.25); text-align: center; transition: background 0.15s ease;">
                ${isReturned ? 'Deklarasi Ulang Bibit Afkir' : 'Deklarasi Bibit Afkir'}
              </button>
            </div>
          `;
  }).join('')}
      </div>
    ` : ''}

    ${poolItems.length === 0 && culledItems.length === 0 ? renderEmptyStateCard({
    title: emptyTitle,
    description: emptyDesc
  }) : ''}

    ${culledItems.length > 0 ? `
      <div style="margin: 20px 0 10px 0;">
        <h2 style="font-size: 0.90rem; font-weight: 800; color: #0F172A; margin: 0;">Riwayat Status Seleksi (${culledItems.length})</h2>
      </div>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        ${culledItems.map((ctx) => {
    const src = getSelectionSourceLabel(ctx);
    const isHistDederan = ctx.originType === 'REJECT_DEDERAN' || ctx.sourceModule === 'DEDERAN';
    const qty = parseInt(ctx.jumlahAfkir || ctx.quantity || 0, 10);
    const bedDisplay = formatBedenganDisplayCode(ctx);
    const histCardTitle = isHistDederan
      ? (bedDisplay && bedDisplay !== '-' ? bedDisplay : (ctx.dederanDocNo || ctx.sourceDocNo || 'Dederan'))
      : (ctx.batchCode || ctx.batchNo || 'Batch');
    const unit = isHistDederan ? 'Butir' : 'Pkk';
    const klonDisplay = ctx.clone || ctx.klon || null;

    const isApproved = ctx.status === SELECTION_STATUS.DISETUJUI;
    const isReturned = ctx.status === SELECTION_STATUS.DIKEMBALIKAN;

    let badgeHtml = `<span style="font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; white-space: nowrap;">MENUNGGU VERIFIKASI</span>`;
    if (isApproved) {
      badgeHtml = `<span style="font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0; white-space: nowrap;">DISETUJUI</span>`;
    } else if (isReturned) {
      badgeHtml = `<span style="font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; white-space: nowrap;">DIKEMBALIKAN</span>`;
    }

    return `
            <div class="card-selection-history-item" style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 10px; padding: 12px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); display: flex; flex-direction: column; gap: 8px; box-sizing: border-box; min-width: 0;">
              
              <!-- 1. HEADER: IDENTITAS (BEDENGAN / BATCH + KLON) & STATUS BADGE -->
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <div style="min-width: 0; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <span style="font-weight: 800; font-size: 0.95rem; color: #0F172A; letter-spacing: -0.01em;">
                    ${esc(histCardTitle)}
                  </span>
                  ${klonDisplay ? `
                    <span style="font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 4px; background: #F1F5F9; color: #475569; border: 1px solid #E2E8F0;">
                      Klon ${esc(klonDisplay)}
                    </span>
                  ` : ''}
                </div>
                <div style="flex-shrink: 0;">
                  ${badgeHtml}
                </div>
              </div>

              <!-- 2. QUANTITY & SUMBER SUMMARY BOX -->
              <div style="background: #FEF2F2; border: 1px solid #FEE2E2; border-radius: 6px; padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; gap: 10px; box-sizing: border-box;">
                <div style="min-width: 0; flex: 1;">
                  <div style="font-size: 0.64rem; font-weight: 800; color: #DC2626; text-transform: uppercase; letter-spacing: 0.03em;">
                    Bibit Afkir
                  </div>
                  <div style="font-size: 0.70rem; font-weight: 600; color: #64748B; margin-top: 1px; word-break: break-word;">
                    ${esc(src)}
                  </div>
                </div>
                <div style="text-align: right; flex-shrink: 0; display: flex; align-items: baseline; gap: 3px;">
                  <span style="font-size: 1.10rem; font-weight: 900; color: #DC2626; line-height: 1;">-${qty.toLocaleString('id-ID')}</span>
                  <span style="font-size: 0.68rem; font-weight: 700; color: #991B1B;">${unit}</span>
                </div>
              </div>

              <!-- 3. METADATA GRID 2-KOLOM (BERSIH & TERSTRUKTUR DENGAN LABEL ATAS) -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; padding: 6px 0; border-top: 1px solid #F1F5F9; border-bottom: 1px solid #F1F5F9; font-size: 0.72rem;">
                <div style="min-width: 0;">
                  <div style="font-size: 0.64rem; color: #64748B; margin-bottom: 1px;">Dok. Seleksi</div>
                  <div style="font-weight: 700; color: #1E293B; word-break: break-word; overflow-wrap: break-word;">
                    ${esc(ctx.docNo || '-')}
                  </div>
                </div>
                <div style="min-width: 0;">
                  <div style="font-size: 0.64rem; color: #64748B; margin-bottom: 1px;">Dok. Asal</div>
                  <div style="font-weight: 700; color: #1E293B; word-break: break-word; overflow-wrap: break-word;">
                    ${esc(ctx.sourceDocNo || ctx.dederanDocNo || '-')}
                  </div>
                </div>
                <div style="min-width: 0; grid-column: span 2;">
                  <div style="font-size: 0.64rem; color: #64748B; margin-bottom: 1px;">Program</div>
                  <div style="font-weight: 700; color: #1E293B; word-break: break-word; overflow-wrap: break-word;">
                    ${esc(ctx.programName || ctx.programCode || ctx.program || '-')}
                  </div>
                </div>
              </div>

              <!-- 4. CATATAN PERSETUJUAN / ALASAN PENGEMBALIAN -->
              ${isApproved && ctx.approvalNotes ? `
                <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; padding: 6px 8px; font-size: 0.70rem; color: #166534; line-height: 1.4;">
                  <strong style="display: block; font-size: 0.65rem; color: #15803D; margin-bottom: 1px;">Catatan Persetujuan:</strong>
                  ${esc(ctx.approvalNotes)}
                </div>
              ` : ''}

              ${isReturned && ctx.returnReason ? `
                <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 6px 8px; font-size: 0.70rem; color: #991B1B; line-height: 1.4;">
                  <strong style="display: block; font-size: 0.65rem; color: #DC2626; margin-bottom: 1px;">Alasan Pengembalian:</strong>
                  ${esc(ctx.returnReason)}
                </div>
              ` : ''}

              <!-- 5. FOOTER: PENGAJU & TANGGAL -->
              <div style="font-size: 0.68rem; color: #64748B; display: flex; justify-content: space-between; align-items: center; margin-top: 1px;">
                <div>Pengaju: <strong style="color: #334155;">${esc(ctx.createdByName || ctx.mantri || user.name)}</strong></div>
                <div>${esc(ctx.tanggalSeleksi || ctx.tanggal || today)}</div>
              </div>
            </div>
          `;
  }).join('')}
      </div>
    ` : ''}
  `;
}

/**
 * =============================================================================
 * MODAL PELAKSANAAN TRANSAKSI SELEKSI I (TASK-03)
 * =============================================================================
 */
export function openSeleksi1ExecutionModal({ doc, user, onSaved }) {
  const today = formatDate(new Date().toISOString());
  const executions = getSeleksi1ExecutionsByDocument(doc.id || doc.docNo);
  const sourcePolybag = parseInt(doc.sourcePolybagQty || 0, 10);
  const sourceBibit = parseInt(doc.sourceBibitQty !== undefined ? doc.sourceBibitQty : (sourcePolybag * 2), 10);

  const totalInspectedPolybag = executions.reduce((sum, tx) =>
    sum + parseInt(tx.actualPolybagInspectedQty !== undefined ? tx.actualPolybagInspectedQty : (tx.polybagScope !== undefined ? tx.polybagScope : (tx.actualPolybagActiveQty !== undefined ? tx.actualPolybagActiveQty : (tx.initialPolybagCount || 0))), 10),
    0
  );
  const remainingPolybag = Math.max(0, sourcePolybag - totalInspectedPolybag);

  if (remainingPolybag <= 0 && sourcePolybag > 0) {
    toast('Seluruh populasi polybag pada bedengan ini telah selesai diperiksa.', 'warning');
    return;
  }

  const existingBibitSelected = executions.reduce((sum, tx) =>
    sum + parseInt(tx.actualBibitSelectedQty !== undefined ? tx.actualBibitSelectedQty : (tx.selectedBibitScopeQty !== undefined ? tx.selectedBibitScopeQty : (tx.jumlahDiperiksa || 0)), 10),
    0
  );
  const initialRetained = Math.max(0, sourceBibit - existingBibitSelected);

  // Canonical Display Resolvers
  const displayDocNo = doc.docNo ? doc.docNo.replace(/^2026\/CULL\//i, '2026/SEL/').replace(/^CULL\//i, 'SEL/') : '-';
  const sourceSowDisplay = doc.sourceSeedingDocNo || doc.sourceDocNo || doc.seedingDocNo || (Array.isArray(doc.sourceSeedingDocNos) && doc.sourceSeedingDocNos[0]) || '-';
  const batchDisplay = `${doc.batchCode || doc.batchNo || doc.batchId || '-'} • ${doc.clone || doc.klon || '-'}`;
  const bedenganDisplay = formatBedenganDisplayCode(doc.bedenganCode || doc.bedengan || (doc.rows && doc.rows[0] ? doc.rows[0].bedenganCode : 'BED-001'));
  const bedenganId = doc.bedenganId || doc.bedenganCode || bedenganDisplay;

  const bodyContent = `
    <div style="font-size: 0.82rem; color: #334155; line-height: 1.45; display: flex; flex-direction: column; gap: 12px;">
      
      <!-- INFORMASI DOKUMEN (READ-ONLY CONTEXT) -->
      <div>
        <div style="font-size: 0.72rem; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.03em;">
          Informasi Dokumen
        </div>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;">
          <div>
            <div style="font-size: 0.68rem; color: #64748B;">Dok. Seleksi</div>
            <div style="font-size: 0.88rem; font-weight: 800; color: #0F172A;">${esc(displayDocNo)}</div>
          </div>
          
          <div>
            <div style="font-size: 0.68rem; color: #64748B;">Dok. Asal (Penyemaian)</div>
            <div style="font-size: 0.85rem; font-weight: 700; color: #0F172A;">${esc(sourceSowDisplay)}</div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 2px; padding-top: 6px; border-top: 1px dashed #E2E8F0;">
            <div>
              <div style="font-size: 0.68rem; color: #64748B;">Batch</div>
              <div style="font-size: 0.82rem; font-weight: 700; color: #0F172A;">${esc(batchDisplay)}</div>
            </div>
            <div>
              <div style="font-size: 0.68rem; color: #64748B;">Bedengan</div>
              <div style="font-size: 0.82rem; font-weight: 700; color: #0F172A;">${esc(bedenganDisplay)}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- BEDENGAN PEMERIKSAAN (READ-ONLY) -->
      <div>
        <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
          Bedengan Pemeriksaan
        </label>
        <input type="text" value="${esc(bedenganDisplay)} (Sisa: ${remainingPolybag.toLocaleString('id-ID')} / ${sourcePolybag.toLocaleString('id-ID')} Ply)" 
               readonly disabled 
               style="width: 100%; height: 38px; border: 1px solid #E2E8F0; border-radius: 6px; padding: 0 10px; font-size: 0.82rem; background: #F1F5F9; color: #475569; font-weight: 600; cursor: not-allowed; box-sizing: border-box;">
      </div>

      <!-- REFERENCE -->
      <div>
        <div style="font-size: 0.72rem; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.03em;">
          Reference
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 10px;">
            <div id="modal-sel1-ref-polybag" style="font-size: 1.05rem; font-weight: 800; color: #0F172A;">
              ${remainingPolybag.toLocaleString('id-ID')} Ply
            </div>
            <div style="font-size: 0.70rem; color: #64748B; margin-top: 1px;">Sisa Polybag Bedengan</div>
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 10px;">
            <div id="modal-sel1-ref-bibit" style="font-size: 1.05rem; font-weight: 800; color: #0F172A;">
              ${sourceBibit.toLocaleString('id-ID')} Pkk
            </div>
            <div style="font-size: 0.70rem; color: #64748B; margin-top: 1px;">Bibit Awal (Batch)</div>
          </div>
        </div>
      </div>

      <!-- INPUT PEMERIKSAAN MANTRI -->
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="font-size: 0.74rem; font-weight: 800; color: #116834; text-transform: uppercase; letter-spacing: 0.03em;">
          INPUT PEMERIKSAAN MANTRI
        </div>

        <!-- 1. Jlh Polybag Diperiksa -->
        <div>
          <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
            Jlh Polybag Diperiksa <span style="color: #DC2626;">*</span>
          </label>
          <input id="modal-sel1-polybag-inspected" type="number" min="1" max="${remainingPolybag}" value="" placeholder="Masukkan jlh polybag diperiksa..." style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; font-weight: 700; font-size: 0.90rem; box-sizing: border-box; color: #0F172A; background: #FFFFFF;">
        </div>

        <!-- 2. Jlh Bibit Diseleksi -->
        <div>
          <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
            Jlh Bibit Diseleksi <span style="color: #DC2626;">*</span>
          </label>
          <input id="modal-sel1-bibit-selected" type="number" min="0" value="" placeholder="Masukkan jlh bibit diseleksi (afkir)..." style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; font-weight: 700; font-size: 0.90rem; box-sizing: border-box; color: #DC2626; background: #FFFFFF;">
        </div>

        <!-- 3. Jlh Bibit Dipertahankan (READONLY / OTOMATIS) -->
        <div>
          <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
            Jlh Bibit Dipertahankan <span style="font-size: 0.68rem; color: #15803D; font-weight: normal;">(Otomatis Dihitung)</span>
          </label>
          <input id="modal-sel1-bibit-retained" type="number" value="${initialRetained}" readonly disabled style="width: 100%; height: 38px; border: 1px solid #E2E8F0; border-radius: 6px; padding: 0 10px; font-weight: 800; font-size: 0.90rem; box-sizing: border-box; color: #15803D; background: #F1F5F9; cursor: not-allowed;">
        </div>
      </div>

      <!-- RINGKASAN -->
      <div>
        <div style="font-size: 0.72rem; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.03em;">
          RINGKASAN
        </div>
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #E2E8F0;">
            <div style="padding: 8px 10px; border-right: 1px solid #E2E8F0;">
              <div style="font-size: 0.68rem; color: #64748B;">Polybag Diperiksa</div>
              <div id="modal-sel1-sum-inspected-poly" style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin-top: 1px;">0 Ply</div>
            </div>
            <div style="padding: 8px 10px;">
              <div style="font-size: 0.68rem; color: #64748B;">Bibit Diseleksi</div>
              <div id="modal-sel1-sum-selected-bibit" style="font-size: 0.88rem; font-weight: 700; color: #DC2626; margin-top: 1px;">0 Pkk</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr;">
            <div style="padding: 8px 10px; border-right: 1px solid #E2E8F0;">
              <div style="font-size: 0.68rem; color: #64748B;">Bibit Dipertahankan</div>
              <div id="modal-sel1-sum-retained-bibit" style="font-size: 0.88rem; font-weight: 700; color: #15803D; margin-top: 1px;">${initialRetained.toLocaleString('id-ID')} Pkk</div>
            </div>
            <div style="padding: 8px 10px;">
              <div style="font-size: 0.68rem; color: #64748B;">Sisa Polybag Bedengan</div>
              <div id="modal-sel1-sum-remaining-poly" style="font-size: 0.88rem; font-weight: 700; color: #64748B; margin-top: 1px;">${remainingPolybag.toLocaleString('id-ID')} Ply</div>
            </div>
          </div>
        </div>
        <div id="modal-sel1-quota-warning" style="display: none; margin-top: 8px; padding: 6px 8px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 4px; color: #DC2626; font-size: 0.72rem; font-weight: 700;"></div>
      </div>

      <!-- TANGGAL & CATATAN -->
      <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 8px;">
        <div>
          <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 2px;">Tanggal</label>
          <input id="modal-sel1-date" type="text" value="${today}" readonly disabled style="width: 100%; height: 36px; border: 1px solid #E2E8F0; border-radius: 6px; padding: 0 8px; font-size: 0.78rem; background: #F1F5F9; color: #475569; cursor: not-allowed; box-sizing: border-box;">
        </div>
        <div>
          <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 2px;">Catatan</label>
          <input id="modal-sel1-notes" type="text" placeholder="Catatan mantri..." style="width: 100%; height: 36px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; font-size: 0.78rem; box-sizing: border-box;">
        </div>
      </div>

      <!-- BUTTONS -->
      <div style="display: flex; gap: 8px; margin-top: 4px;">
        <button id="btn-modal-cancel-sel1" type="button" style="flex: 1; height: 38px; background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; border-radius: 6px; font-weight: 600; font-size: 0.80rem; cursor: pointer;">
          Batal
        </button>
        <button id="btn-modal-save-sel1" type="button" style="flex: 1.5; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer; box-shadow: 0 1px 3px rgba(17,104,52,0.25);">
          Simpan Transaksi
        </button>
      </div>

    </div>
  `;

  openModal({
    title: 'Pelaksanaan Seleksi I',
    body: bodyContent
  });

  const inputInspectedPoly = document.getElementById('modal-sel1-polybag-inspected');
  const inputSelectedBibit = document.getElementById('modal-sel1-bibit-selected');
  const inputRetainedBibit = document.getElementById('modal-sel1-bibit-retained');
  const inputNotes = document.getElementById('modal-sel1-notes');

  const sumInspectedPoly = document.getElementById('modal-sel1-sum-inspected-poly');
  const sumSelectedBibit = document.getElementById('modal-sel1-sum-selected-bibit');
  const sumRetainedBibit = document.getElementById('modal-sel1-sum-retained-bibit');
  const sumRemainingPoly = document.getElementById('modal-sel1-sum-remaining-poly');
  const warningEl = document.getElementById('modal-sel1-quota-warning');
  const saveBtn = document.getElementById('btn-modal-save-sel1');

  function updateCalculations() {
    const inspectedPoly = parseInt(inputInspectedPoly?.value || 0, 10);
    const selectedBibit = parseInt(inputSelectedBibit?.value || 0, 10);

    const totalSelectedAfter = existingBibitSelected + (isNaN(selectedBibit) ? 0 : selectedBibit);
    const cumulativeRetained = Math.max(0, sourceBibit - totalSelectedAfter);

    if (inputRetainedBibit) inputRetainedBibit.value = cumulativeRetained;
    if (sumInspectedPoly) sumInspectedPoly.textContent = `${(isNaN(inspectedPoly) ? 0 : inspectedPoly).toLocaleString('id-ID')} Ply`;
    if (sumSelectedBibit) sumSelectedBibit.textContent = `${(isNaN(selectedBibit) ? 0 : selectedBibit).toLocaleString('id-ID')} Pkk`;
    if (sumRetainedBibit) sumRetainedBibit.textContent = `${cumulativeRetained.toLocaleString('id-ID')} Pkk`;
    if (sumRemainingPoly) sumRemainingPoly.textContent = `${Math.max(0, remainingPolybag - (isNaN(inspectedPoly) ? 0 : inspectedPoly)).toLocaleString('id-ID')} Ply`;

    let errorMsg = null;

    if (inputInspectedPoly && inputInspectedPoly.value.trim() !== '' && (isNaN(inspectedPoly) || inspectedPoly <= 0)) {
      errorMsg = 'Jumlah polybag diperiksa harus lebih besar dari 0.';
    } else if (inspectedPoly > remainingPolybag) {
      errorMsg = `Jumlah polybag diperiksa (${inspectedPoly.toLocaleString('id-ID')}) melebihi sisa scope polybag bedengan (${remainingPolybag.toLocaleString('id-ID')}).`;
    } else if (inputSelectedBibit && inputSelectedBibit.value.trim() !== '' && (isNaN(selectedBibit) || selectedBibit < 0)) {
      errorMsg = 'Jumlah bibit diseleksi tidak boleh negatif.';
    }

    const isCriticalError = isNaN(inspectedPoly) || inspectedPoly <= 0 || inspectedPoly > remainingPolybag || isNaN(selectedBibit) || selectedBibit < 0;

    if (errorMsg) {
      if (warningEl) {
        warningEl.textContent = errorMsg;
        warningEl.style.display = 'block';
      }
    } else {
      if (warningEl) {
        warningEl.style.display = 'none';
      }
    }

    if (saveBtn) {
      saveBtn.disabled = isCriticalError;
      saveBtn.style.opacity = isCriticalError ? '0.5' : '1';
      saveBtn.style.cursor = isCriticalError ? 'not-allowed' : 'pointer';
    }
  }

  // Initial calculation trigger
  updateCalculations();

  inputInspectedPoly?.addEventListener('input', updateCalculations);
  inputSelectedBibit?.addEventListener('input', updateCalculations);

  document.getElementById('btn-modal-cancel-sel1')?.addEventListener('click', closeModal);

  document.getElementById('btn-modal-save-sel1')?.addEventListener('click', () => {
    const inspectedPoly = parseInt(inputInspectedPoly?.value || 0, 10);
    const selectedBibit = parseInt(inputSelectedBibit?.value || 0, 10);
    const tanggalSeleksi = today;
    const catatan = inputNotes?.value || '';

    // Validations
    if (isNaN(inspectedPoly) || inspectedPoly <= 0) {
      toast('Jumlah polybag diperiksa harus lebih besar dari 0.', 'error');
      return;
    }
    if (inspectedPoly > remainingPolybag) {
      toast(`Jumlah polybag diperiksa (${inspectedPoly.toLocaleString('id-ID')}) melebihi sisa scope bedengan ${bedenganDisplay} (${remainingPolybag.toLocaleString('id-ID')}).`, 'error');
      return;
    }
    if (isNaN(selectedBibit) || selectedBibit < 0) {
      toast('Jumlah bibit diseleksi tidak valid.', 'error');
      return;
    }

    const totalSelectedAfter = existingBibitSelected + selectedBibit;
    const cumulativeRetained = Math.max(0, sourceBibit - totalSelectedAfter);

    try {
      const res = createSeleksi1ExecutionTransaction({
        selectionDocumentId: doc.id,
        selectionDocNo: doc.docNo,
        bedenganId: bedenganId,
        bedenganCode: bedenganDisplay,
        sourceSeedingDocNo: sourceSowDisplay,
        actualPolybagInspectedQty: inspectedPoly,
        actualBibitSelectedQty: selectedBibit,
        actualBibitRetainedQty: cumulativeRetained,
        tanggalSeleksi,
        catatan
      }, user);

      closeModal();
      toast(`Transaksi Seleksi I (${res.transaction.docNo}) pada ${bedenganDisplay} berhasil dicatat. (${res.transaction.actualPolybagInspectedQty} Polybag, ${res.transaction.actualBibitSelectedQty} Bibit Diseleksi)`, 'success');
      if (onSaved) onSaved(res);
    } catch (err) {
      console.error('[Seleksi 1 Save Error]', err);
      toast(err.message || 'Gagal menyimpan transaksi Seleksi I', 'error');
    }
  });
}

/**
 * =============================================================================
 * MODAL PELAKSANAAN TRANSAKSI SELEKSI II (TASK-06 / TASK-26)
 * =============================================================================
 */
export function openSeleksi2ExecutionModal({ doc, user, onSaved }) {
  const today = formatDate(new Date().toISOString());
  const bedScopeList = getBedenganScopeStatusForSeleksi2(doc);
  const executions = getSeleksi2ExecutionsByDocument(doc.id || doc.docNo);
  const sourcePolybag = parseInt(doc.sourcePolybagQty || 0, 10);
  const sourceBibit = parseInt(doc.sourceBibitQty !== undefined ? doc.sourceBibitQty : sourcePolybag, 10);

  // Check if any bedengan has remaining uninspected polybag
  const availableBeds = bedScopeList.filter(b => b.remainingPolybag > 0);
  if (bedScopeList.length > 0 && availableBeds.length === 0) {
    toast('Seluruh populasi polybag telah diperiksa.', 'warning');
    return;
  }

  // Find first bedengan with remaining polybag
  const initialBed = availableBeds[0] || bedScopeList[0] || {
    bedenganCode: 'BED-001',
    remainingPolybag: doc.sourcePolybagQty || 0,
    initialPolybag: doc.sourcePolybagQty || 0
  };

  const initialRemainingPolybag = initialBed.remainingPolybag !== undefined ? initialBed.remainingPolybag : (doc.sourcePolybagQty || 0);

  const existingBibitSelected = executions.reduce((sum, tx) =>
    sum + parseInt(tx.actualBibitSelectedQty !== undefined ? tx.actualBibitSelectedQty : (tx.selectedBibitScopeQty !== undefined ? tx.selectedBibitScopeQty : (tx.jumlahDiperiksa || 0)), 10),
    0
  );
  const initialRetained = Math.max(0, sourceBibit - existingBibitSelected);

  const bodyContent = `
    <div style="font-size: 0.82rem; color: #334155; line-height: 1.45; display: flex; flex-direction: column; gap: 12px;">
      
      <!-- INFORMASI DOKUMEN -->
      <div>
        <div style="font-size: 0.72rem; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.03em;">
          Informasi Dokumen
        </div>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px;">
          <div style="font-size: 0.68rem; color: #64748B;">Dok. Seleksi</div>
          <div style="font-size: 0.88rem; font-weight: 800; color: #0F172A; margin-bottom: 6px;">${esc(doc.docNo)}</div>
          
          <div style="font-size: 0.68rem; color: #64748B;">Dok. Asal</div>
          <div style="font-size: 0.85rem; font-weight: 700; color: #0F172A;">${esc(doc.sourceSelectionDocNo || doc.sourceDocNo || '-')}</div>
          <div style="font-size: 0.74rem; color: #475569; margin-top: 2px;">${esc(doc.batchCode || '-')} • ${esc(doc.clone || doc.klon || '-')}</div>
        </div>
      </div>

      <!-- BEDENGAN PEMERIKSAAN -->
      <div>
        <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
          Bedengan Pemeriksaan <span style="color: #DC2626;">*</span>
        </label>
        <select id="modal-sel2-bedengan" style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; font-size: 0.82rem; background: #FFFFFF; color: #0F172A; font-weight: 600;">
          ${bedScopeList.map(bed => `
            <option value="${esc(bed.bedenganCode)}" data-remaining-poly="${bed.remainingPolybag}" data-initial-poly="${bed.initialPolybag}" ${bed.bedenganCode === initialBed.bedenganCode ? 'selected' : ''}>
              ${esc(bed.bedenganCode)} (Sisa Polybag: ${bed.remainingPolybag.toLocaleString('id-ID')} / ${bed.initialPolybag.toLocaleString('id-ID')})
            </option>
          `).join('')}
        </select>
      </div>

      <!-- REFERENCE -->
      <div>
        <div style="font-size: 0.72rem; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.03em;">
          Reference
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 10px;">
            <div id="modal-sel2-ref-polybag" style="font-size: 1.05rem; font-weight: 800; color: #0F172A;">
              ${initialRemainingPolybag.toLocaleString('id-ID')} Ply
            </div>
            <div style="font-size: 0.70rem; color: #64748B; margin-top: 1px;">Sisa Polybag</div>
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 10px;">
            <div id="modal-sel2-ref-bibit" style="font-size: 1.05rem; font-weight: 800; color: #0F172A;">
              ${sourceBibit.toLocaleString('id-ID')} Pkk
            </div>
            <div style="font-size: 0.70rem; color: #64748B; margin-top: 1px;">Bibit Awal</div>
          </div>
        </div>
        <input type="hidden" id="modal-sel2-current-remaining-poly" value="${initialRemainingPolybag}">
      </div>

      <!-- INPUT PEMERIKSAAN MANTRI -->
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="font-size: 0.74rem; font-weight: 800; color: #116834; text-transform: uppercase; letter-spacing: 0.03em;">
          INPUT PEMERIKSAAN MANTRI
        </div>

        <!-- 1. Jlh Polybag Diperiksa -->
        <div>
          <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
            Jlh Polybag Diperiksa <span style="color: #DC2626;">*</span>
          </label>
          <input id="modal-sel2-polybag-inspected" type="number" min="1" max="${initialRemainingPolybag}" value="" placeholder="Masukkan jlh polybag diperiksa..." style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; font-weight: 700; font-size: 0.90rem; box-sizing: border-box; color: #0F172A; background: #FFFFFF;">
        </div>

        <!-- 2. Jlh Bibit Diseleksi -->
        <div>
          <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
            Jlh Bibit Diseleksi <span style="color: #DC2626;">*</span>
          </label>
          <input id="modal-sel2-bibit-selected" type="number" min="0" value="" placeholder="Masukkan jlh bibit diseleksi (afkir)..." style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; font-weight: 700; font-size: 0.90rem; box-sizing: border-box; color: #DC2626; background: #FFFFFF;">
        </div>

        <!-- 3. Jlh Bibit Dipertahankan (READONLY / OTOMATIS) -->
        <div>
          <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
            Jlh Bibit Dipertahankan <span style="font-size: 0.68rem; color: #15803D; font-weight: normal;">(Otomatis Dihitung)</span>
          </label>
          <input id="modal-sel2-bibit-retained" type="number" value="${initialRetained}" readonly disabled style="width: 100%; height: 38px; border: 1px solid #E2E8F0; border-radius: 6px; padding: 0 10px; font-weight: 800; font-size: 0.90rem; box-sizing: border-box; color: #15803D; background: #F1F5F9; cursor: not-allowed;">
        </div>
      </div>

      <!-- RINGKASAN -->
      <div>
        <div style="font-size: 0.72rem; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.03em;">
          RINGKASAN
        </div>
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #E2E8F0;">
            <div style="padding: 8px 10px; border-right: 1px solid #E2E8F0;">
              <div style="font-size: 0.68rem; color: #64748B;">Polybag Diperiksa</div>
              <div id="modal-sel2-sum-inspected-poly" style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin-top: 1px;">0 Ply</div>
            </div>
            <div style="padding: 8px 10px;">
              <div style="font-size: 0.68rem; color: #64748B;">Bibit Diseleksi</div>
              <div id="modal-sel2-sum-selected-bibit" style="font-size: 0.88rem; font-weight: 700; color: #DC2626; margin-top: 1px;">0 Pkk</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr;">
            <div style="padding: 8px 10px; border-right: 1px solid #E2E8F0;">
              <div style="font-size: 0.68rem; color: #64748B;">Bibit Dipertahankan</div>
              <div id="modal-sel2-sum-retained-bibit" style="font-size: 0.88rem; font-weight: 700; color: #15803D; margin-top: 1px;">${initialRetained.toLocaleString('id-ID')} Pkk</div>
            </div>
            <div style="padding: 8px 10px;">
              <div style="font-size: 0.68rem; color: #64748B;">Sisa Polybag Bedengan</div>
              <div id="modal-sel2-sum-remaining-poly" style="font-size: 0.88rem; font-weight: 700; color: #64748B; margin-top: 1px;">${initialRemainingPolybag.toLocaleString('id-ID')} Ply</div>
            </div>
          </div>
        </div>
        <div id="modal-sel2-quota-warning" style="display: none; margin-top: 8px; padding: 6px 8px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 4px; color: #DC2626; font-size: 0.72rem; font-weight: 700;"></div>
      </div>

      <!-- TANGGAL & CATATAN -->
      <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 8px;">
        <div>
          <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 2px;">Tanggal</label>
          <input id="modal-sel2-date" type="text" value="${today}" readonly disabled style="width: 100%; height: 36px; border: 1px solid #E2E8F0; border-radius: 6px; padding: 0 8px; font-size: 0.78rem; background: #F1F5F9; color: #475569; cursor: not-allowed; box-sizing: border-box;">
        </div>
        <div>
          <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 2px;">Catatan</label>
          <input id="modal-sel2-notes" type="text" placeholder="Catatan Seleksi II..." style="width: 100%; height: 36px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; font-size: 0.78rem; box-sizing: border-box;">
        </div>
      </div>

      <!-- BUTTONS -->
      <div style="display: flex; gap: 8px; margin-top: 4px;">
        <button id="btn-modal-cancel-sel2" type="button" style="flex: 1; height: 38px; background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; border-radius: 6px; font-weight: 600; font-size: 0.80rem; cursor: pointer;">
          Batal
        </button>
        <button id="btn-modal-save-sel2" type="button" style="flex: 1.5; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer; box-shadow: 0 1px 3px rgba(17,104,52,0.25);">
          Simpan Transaksi
        </button>
      </div>

    </div>
  `;

  openModal({
    title: 'Pelaksanaan Seleksi II',
    body: bodyContent
  });

  const selBed = document.getElementById('modal-sel2-bedengan');
  const inputInspectedPoly = document.getElementById('modal-sel2-polybag-inspected');
  const inputSelectedBibit = document.getElementById('modal-sel2-bibit-selected');
  const inputRetainedBibit = document.getElementById('modal-sel2-bibit-retained');
  const inputNotes = document.getElementById('modal-sel2-notes');
  const hiddenRemPoly = document.getElementById('modal-sel2-current-remaining-poly');
  const labelRefPoly = document.getElementById('modal-sel2-ref-polybag');

  const sumInspectedPoly = document.getElementById('modal-sel2-sum-inspected-poly');
  const sumSelectedBibit = document.getElementById('modal-sel2-sum-selected-bibit');
  const sumRetainedBibit = document.getElementById('modal-sel2-sum-retained-bibit');
  const sumRemainingPoly = document.getElementById('modal-sel2-sum-remaining-poly');
  const warningEl = document.getElementById('modal-sel2-quota-warning');
  const saveBtn = document.getElementById('btn-modal-save-sel2');

  function updateCalculations() {
    const remPoly = parseInt(hiddenRemPoly?.value || 0, 10);
    const inspectedPoly = parseInt(inputInspectedPoly?.value || 0, 10);
    const selectedBibit = parseInt(inputSelectedBibit?.value || 0, 10);

    const totalSelectedAfter = existingBibitSelected + (isNaN(selectedBibit) ? 0 : selectedBibit);
    const cumulativeRetained = Math.max(0, sourceBibit - totalSelectedAfter);

    if (inputRetainedBibit) inputRetainedBibit.value = cumulativeRetained;
    if (sumInspectedPoly) sumInspectedPoly.textContent = `${(isNaN(inspectedPoly) ? 0 : inspectedPoly).toLocaleString('id-ID')} Ply`;
    if (sumSelectedBibit) sumSelectedBibit.textContent = `${(isNaN(selectedBibit) ? 0 : selectedBibit).toLocaleString('id-ID')} Pkk`;
    if (sumRetainedBibit) sumRetainedBibit.textContent = `${cumulativeRetained.toLocaleString('id-ID')} Pkk`;
    if (sumRemainingPoly) sumRemainingPoly.textContent = `${Math.max(0, remPoly - (isNaN(inspectedPoly) ? 0 : inspectedPoly)).toLocaleString('id-ID')} Ply`;

    let errorMsg = null;

    if (inputInspectedPoly && inputInspectedPoly.value.trim() !== '' && (isNaN(inspectedPoly) || inspectedPoly <= 0)) {
      errorMsg = 'Jumlah polybag diperiksa harus lebih besar dari 0.';
    } else if (inspectedPoly > remPoly) {
      errorMsg = `Jumlah polybag diperiksa (${inspectedPoly.toLocaleString('id-ID')}) melebihi sisa scope polybag (${remPoly.toLocaleString('id-ID')}).`;
    } else if (inputSelectedBibit && inputSelectedBibit.value.trim() !== '' && (isNaN(selectedBibit) || selectedBibit < 0)) {
      errorMsg = 'Jumlah bibit diseleksi tidak boleh negatif.';
    }

    const isCriticalError = isNaN(inspectedPoly) || inspectedPoly <= 0 || inspectedPoly > remPoly || isNaN(selectedBibit) || selectedBibit < 0;

    if (errorMsg) {
      if (warningEl) {
        warningEl.textContent = errorMsg;
        warningEl.style.display = 'block';
      }
    } else {
      if (warningEl) {
        warningEl.style.display = 'none';
      }
    }

    if (saveBtn) {
      saveBtn.disabled = isCriticalError;
      saveBtn.style.opacity = isCriticalError ? '0.5' : '1';
      saveBtn.style.cursor = isCriticalError ? 'not-allowed' : 'pointer';
    }
  }

  // Initial calculation trigger
  updateCalculations();

  selBed?.addEventListener('change', () => {
    const opt = selBed.options[selBed.selectedIndex];
    const remPoly = parseInt(opt.getAttribute('data-remaining-poly') || 0, 10);

    if (hiddenRemPoly) hiddenRemPoly.value = remPoly;
    if (labelRefPoly) labelRefPoly.textContent = `${remPoly.toLocaleString('id-ID')} Ply`;

    if (inputInspectedPoly) {
      inputInspectedPoly.max = remPoly;
      inputInspectedPoly.value = '';
    }
    if (inputSelectedBibit) {
      inputSelectedBibit.value = '';
    }
    updateCalculations();
  });

  inputInspectedPoly?.addEventListener('input', updateCalculations);
  inputSelectedBibit?.addEventListener('input', updateCalculations);

  document.getElementById('btn-modal-cancel-sel2')?.addEventListener('click', closeModal);

  document.getElementById('btn-modal-save-sel2')?.addEventListener('click', () => {
    const bedenganCode = selBed?.value || '';
    const remPoly = parseInt(hiddenRemPoly?.value || 0, 10);
    const inspectedPoly = parseInt(inputInspectedPoly?.value || 0, 10);
    const selectedBibit = parseInt(inputSelectedBibit?.value || 0, 10);
    const tanggalSeleksi = today;
    const catatan = inputNotes?.value || '';

    // Validations
    if (isNaN(inspectedPoly) || inspectedPoly <= 0) {
      toast('Jumlah polybag diperiksa harus lebih besar dari 0.', 'error');
      return;
    }
    if (inspectedPoly > remPoly) {
      toast(`Jumlah polybag diperiksa (${inspectedPoly.toLocaleString('id-ID')}) melebihi sisa scope (${remPoly.toLocaleString('id-ID')}).`, 'error');
      return;
    }
    if (isNaN(selectedBibit) || selectedBibit < 0) {
      toast('Jumlah bibit diseleksi tidak valid.', 'error');
      return;
    }

    const totalSelectedAfter = existingBibitSelected + selectedBibit;
    const cumulativeRetained = Math.max(0, sourceBibit - totalSelectedAfter);

    try {
      const res = createSeleksi2ExecutionTransaction({
        selectionDocumentId: doc.id,
        selectionDocNo: doc.docNo,
        bedenganCode,
        actualPolybagInspectedQty: inspectedPoly,
        actualBibitSelectedQty: selectedBibit,
        actualBibitRetainedQty: cumulativeRetained,
        tanggalSeleksi,
        catatan
      }, user);

      closeModal();
      toast(`Transaksi Seleksi II (${res.transaction.docNo}) pada ${bedenganCode} berhasil dicatat. (${res.transaction.actualPolybagInspectedQty} Polybag, ${res.transaction.actualBibitSelectedQty} Bibit Diseleksi)`, 'success');
      if (onSaved) onSaved(res);
    } catch (err) {
      console.error('[Seleksi 2 Save Error]', err);
      toast(err.message || 'Gagal menyimpan transaksi Seleksi II', 'error');
    }
  });
}

/**
 * =============================================================================
 * MODAL PELAKSANAAN TRANSAKSI SELEKSI III (TASK-09 / TASK-26)
 * =============================================================================
 */
export function openSeleksi3ExecutionModal({ doc, user, onSaved }) {
  const today = formatDate(new Date().toISOString());
  const bedScopeList = getBedenganScopeStatusForSeleksi3(doc);
  const executions = getSeleksi3ExecutionsByDocument(doc.id || doc.docNo);
  const sourcePolybag = parseInt(doc.sourcePolybagQty !== undefined ? doc.sourcePolybagQty : (doc.sourceBibitQty || 0), 10);
  const sourceBibit = parseInt(doc.sourceBibitQty !== undefined ? doc.sourceBibitQty : sourcePolybag, 10);

  // Check if any bedengan has remaining uninspected polybag
  const availableBeds = bedScopeList.filter(b => b.remainingPolybag > 0);
  if (bedScopeList.length > 0 && availableBeds.length === 0) {
    toast('Seluruh populasi polybag telah diperiksa.', 'warning');
    return;
  }

  const initialBed = availableBeds[0] || bedScopeList[0] || {
    bedenganCode: 'BED-001',
    remainingPolybag: doc.sourcePolybagQty || 0,
    initialPolybag: doc.sourcePolybagQty || 0
  };

  const initialScopePoly = initialBed.remainingPolybag !== undefined ? initialBed.remainingPolybag : (doc.sourcePolybagQty || 0);

  const existingBibitSelected = executions.reduce((sum, tx) =>
    sum + parseInt(tx.actualBibitSelectedQty !== undefined ? tx.actualBibitSelectedQty : (tx.selectedBibitScopeQty !== undefined ? tx.selectedBibitScopeQty : (tx.jumlahDiperiksa || 0)), 10),
    0
  );
  const initialRetained = Math.max(0, sourceBibit - existingBibitSelected);

  const bodyContent = `
    <div style="font-size: 0.82rem; color: #334155; line-height: 1.45; display: flex; flex-direction: column; gap: 12px;">
      
      <!-- INFORMASI DOKUMEN -->
      <div>
        <div style="font-size: 0.72rem; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.03em;">
          Informasi Dokumen
        </div>
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px;">
          <div style="font-size: 0.68rem; color: #64748B;">Dok. Seleksi</div>
          <div style="font-size: 0.88rem; font-weight: 800; color: #0F172A; margin-bottom: 6px;">${esc(doc.docNo)}</div>
          
          <div style="font-size: 0.68rem; color: #64748B;">Dok. Asal</div>
          <div style="font-size: 0.85rem; font-weight: 700; color: #0F172A;">${esc(doc.sourceSelectionDocNo || doc.sourceDocNo || '-')}</div>
          <div style="font-size: 0.74rem; color: #475569; margin-top: 2px;">${esc(doc.batchCode || '-')} • ${esc(doc.clone || doc.klon || '-')}</div>
        </div>
      </div>

      <!-- BEDENGAN PEMERIKSAAN -->
      <div>
        <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
          Bedengan Pemeriksaan <span style="color: #DC2626;">*</span>
        </label>
        <select id="modal-sel3-bedengan" style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; font-size: 0.82rem; background: #FFFFFF; color: #0F172A; font-weight: 600;">
          ${bedScopeList.map(bed => `
            <option value="${esc(bed.bedenganCode)}" data-remaining-poly="${bed.remainingPolybag}" data-initial-poly="${bed.initialPolybag}" ${bed.bedenganCode === initialBed.bedenganCode ? 'selected' : ''}>
              ${esc(bed.bedenganCode)} (Sisa Polybag: ${bed.remainingPolybag.toLocaleString('id-ID')} / ${bed.initialPolybag.toLocaleString('id-ID')})
            </option>
          `).join('')}
        </select>
      </div>

      <!-- REFERENCE -->
      <div>
        <div style="font-size: 0.72rem; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.03em;">
          Reference
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 10px;">
            <div id="modal-sel3-ref-poly" style="font-size: 1.05rem; font-weight: 800; color: #0F172A;">
              ${initialScopePoly.toLocaleString('id-ID')} Ply
            </div>
            <div style="font-size: 0.70rem; color: #64748B; margin-top: 1px;">Sisa Polybag</div>
          </div>
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 8px 10px;">
            <div id="modal-sel3-ref-bibit" style="font-size: 1.05rem; font-weight: 800; color: #0F172A;">
              ${sourceBibit.toLocaleString('id-ID')} Pkk
            </div>
            <div style="font-size: 0.70rem; color: #64748B; margin-top: 1px;">Bibit Awal</div>
          </div>
        </div>
        <input type="hidden" id="modal-sel3-current-remaining-poly" value="${initialScopePoly}">
      </div>

      <!-- INPUT PEMERIKSAAN MANTRI -->
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="font-size: 0.74rem; font-weight: 800; color: #116834; text-transform: uppercase; letter-spacing: 0.03em;">
          INPUT PEMERIKSAAN MANTRI
        </div>

        <!-- 1. Jlh Polybag Diperiksa -->
        <div>
          <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
            Jlh Polybag Diperiksa <span style="color: #DC2626;">*</span>
          </label>
          <input id="modal-sel3-polybag-inspected" type="number" min="1" max="${initialScopePoly}" value="" placeholder="Masukkan jlh polybag diperiksa..." style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; font-weight: 700; font-size: 0.90rem; box-sizing: border-box; color: #0F172A; background: #FFFFFF;">
        </div>

        <!-- 2. Jlh Bibit Diseleksi -->
        <div>
          <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
            Jlh Bibit Diseleksi <span style="color: #DC2626;">*</span>
          </label>
          <input id="modal-sel3-bibit-selected" type="number" min="0" value="" placeholder="Masukkan jlh bibit diseleksi (afkir)..." style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; font-weight: 700; font-size: 0.90rem; box-sizing: border-box; color: #DC2626; background: #FFFFFF;">
        </div>

        <!-- 3. Jlh Bibit Dipertahankan (READONLY / OTOMATIS) -->
        <div>
          <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
            Jlh Bibit Dipertahankan <span style="font-size: 0.68rem; color: #15803D; font-weight: normal;">(Otomatis Dihitung)</span>
          </label>
          <input id="modal-sel3-bibit-retained" type="number" value="${initialRetained}" readonly disabled style="width: 100%; height: 38px; border: 1px solid #E2E8F0; border-radius: 6px; padding: 0 10px; font-weight: 800; font-size: 0.90rem; box-sizing: border-box; color: #15803D; background: #F1F5F9; cursor: not-allowed;">
        </div>
      </div>

      <!-- RINGKASAN -->
      <div>
        <div style="font-size: 0.72rem; font-weight: 700; color: #475569; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.03em;">
          RINGKASAN
        </div>
        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid #E2E8F0;">
            <div style="padding: 8px 10px; border-right: 1px solid #E2E8F0;">
              <div style="font-size: 0.68rem; color: #64748B;">Polybag Diperiksa</div>
              <div id="modal-sel3-sum-inspected-poly" style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin-top: 1px;">0 Ply</div>
            </div>
            <div style="padding: 8px 10px;">
              <div style="font-size: 0.68rem; color: #64748B;">Bibit Diseleksi</div>
              <div id="modal-sel3-sum-selected-bibit" style="font-size: 0.88rem; font-weight: 700; color: #DC2626; margin-top: 1px;">0 Pkk</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr;">
            <div style="padding: 8px 10px; border-right: 1px solid #E2E8F0;">
              <div style="font-size: 0.68rem; color: #64748B;">Bibit Dipertahankan</div>
              <div id="modal-sel3-sum-retained-bibit" style="font-size: 0.88rem; font-weight: 700; color: #15803D; margin-top: 1px;">${initialRetained.toLocaleString('id-ID')} Pkk</div>
            </div>
            <div style="padding: 8px 10px;">
              <div style="font-size: 0.68rem; color: #64748B;">Sisa Polybag Bedengan</div>
              <div id="modal-sel3-sum-remaining-poly" style="font-size: 0.88rem; font-weight: 700; color: #64748B; margin-top: 1px;">${initialScopePoly.toLocaleString('id-ID')} Ply</div>
            </div>
          </div>
        </div>
        <div id="modal-sel3-quota-warning" style="display: none; margin-top: 8px; padding: 6px 8px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 4px; color: #DC2626; font-size: 0.72rem; font-weight: 700;"></div>
      </div>

      <!-- TANGGAL & CATATAN -->
      <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 8px;">
        <div>
          <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 2px;">Tanggal</label>
          <input id="modal-sel3-date" type="text" value="${today}" readonly disabled style="width: 100%; height: 36px; border: 1px solid #E2E8F0; border-radius: 6px; padding: 0 8px; font-size: 0.78rem; background: #F1F5F9; color: #475569; cursor: not-allowed; box-sizing: border-box;">
        </div>
        <div>
          <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 2px;">Catatan</label>
          <input id="modal-sel3-notes" type="text" placeholder="Catatan seleksi..." style="width: 100%; height: 36px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; font-size: 0.78rem; box-sizing: border-box;">
        </div>
      </div>

      <!-- BUTTONS -->
      <div style="display: flex; gap: 8px; margin-top: 4px;">
        <button id="btn-modal-cancel-sel3" type="button" style="flex: 1; height: 38px; background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; border-radius: 6px; font-weight: 600; font-size: 0.80rem; cursor: pointer;">
          Batal
        </button>
        <button id="btn-modal-save-sel3" type="button" style="flex: 1.5; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer; box-shadow: 0 1px 3px rgba(17,104,52,0.25);">
          Simpan Transaksi
        </button>
      </div>

    </div>
  `;

  openModal({
    title: 'Pelaksanaan Seleksi III (Pra-Okulasi)',
    body: bodyContent
  });

  const selBed = document.getElementById('modal-sel3-bedengan');
  const inputInspectedPoly = document.getElementById('modal-sel3-polybag-inspected');
  const inputSelectedBibit = document.getElementById('modal-sel3-bibit-selected');
  const inputRetainedBibit = document.getElementById('modal-sel3-bibit-retained');
  const inputNotes = document.getElementById('modal-sel3-notes');
  const hiddenRemPoly = document.getElementById('modal-sel3-current-remaining-poly');
  const labelRefPoly = document.getElementById('modal-sel3-ref-poly');

  const sumInspectedPoly = document.getElementById('modal-sel3-sum-inspected-poly');
  const sumSelectedBibit = document.getElementById('modal-sel3-sum-selected-bibit');
  const sumRetainedBibit = document.getElementById('modal-sel3-sum-retained-bibit');
  const sumRemainingPoly = document.getElementById('modal-sel3-sum-remaining-poly');
  const warningEl = document.getElementById('modal-sel3-quota-warning');
  const saveBtn = document.getElementById('btn-modal-save-sel3');

  function updateCalculations() {
    const remPoly = parseInt(hiddenRemPoly?.value || 0, 10);
    const inspectedPoly = parseInt(inputInspectedPoly?.value || 0, 10);
    const selectedBibit = parseInt(inputSelectedBibit?.value || 0, 10);

    const totalSelectedAfter = existingBibitSelected + (isNaN(selectedBibit) ? 0 : selectedBibit);
    const cumulativeRetained = Math.max(0, sourceBibit - totalSelectedAfter);

    if (inputRetainedBibit) inputRetainedBibit.value = cumulativeRetained;
    if (sumInspectedPoly) sumInspectedPoly.textContent = `${(isNaN(inspectedPoly) ? 0 : inspectedPoly).toLocaleString('id-ID')} Ply`;
    if (sumSelectedBibit) sumSelectedBibit.textContent = `${(isNaN(selectedBibit) ? 0 : selectedBibit).toLocaleString('id-ID')} Pkk`;
    if (sumRetainedBibit) sumRetainedBibit.textContent = `${cumulativeRetained.toLocaleString('id-ID')} Pkk`;
    if (sumRemainingPoly) sumRemainingPoly.textContent = `${Math.max(0, remPoly - (isNaN(inspectedPoly) ? 0 : inspectedPoly)).toLocaleString('id-ID')} Ply`;

    let errorMsg = null;
    if (inputInspectedPoly && inputInspectedPoly.value.trim() !== '' && (isNaN(inspectedPoly) || inspectedPoly <= 0)) {
      errorMsg = 'Jumlah polybag diperiksa harus lebih besar dari 0.';
    } else if (inspectedPoly > remPoly) {
      errorMsg = `Jumlah polybag diperiksa (${inspectedPoly.toLocaleString('id-ID')}) melebihi sisa scope polybag (${remPoly.toLocaleString('id-ID')}).`;
    } else if (inputSelectedBibit && inputSelectedBibit.value.trim() !== '' && (isNaN(selectedBibit) || selectedBibit < 0)) {
      errorMsg = 'Jumlah bibit diseleksi tidak boleh negatif.';
    }

    const isCriticalError = isNaN(inspectedPoly) || inspectedPoly <= 0 || inspectedPoly > remPoly || isNaN(selectedBibit) || selectedBibit < 0;

    if (errorMsg) {
      if (warningEl) {
        warningEl.textContent = errorMsg;
        warningEl.style.display = 'block';
      }
    } else {
      if (warningEl) {
        warningEl.style.display = 'none';
      }
    }

    if (saveBtn) {
      saveBtn.disabled = isCriticalError;
      saveBtn.style.opacity = isCriticalError ? '0.5' : '1';
      saveBtn.style.cursor = isCriticalError ? 'not-allowed' : 'pointer';
    }
  }

  // Initial calculation trigger
  updateCalculations();

  selBed?.addEventListener('change', () => {
    const opt = selBed.options[selBed.selectedIndex];
    const remPoly = parseInt(opt.getAttribute('data-remaining-poly') || 0, 10);

    if (hiddenRemPoly) hiddenRemPoly.value = remPoly;
    if (labelRefPoly) labelRefPoly.textContent = `${remPoly.toLocaleString('id-ID')} Ply`;

    if (inputInspectedPoly) {
      inputInspectedPoly.max = remPoly;
      inputInspectedPoly.value = '';
    }
    if (inputSelectedBibit) {
      inputSelectedBibit.value = '';
    }
    updateCalculations();
  });

  inputInspectedPoly?.addEventListener('input', updateCalculations);
  inputSelectedBibit?.addEventListener('input', updateCalculations);

  document.getElementById('btn-modal-cancel-sel3')?.addEventListener('click', closeModal);

  document.getElementById('btn-modal-save-sel3')?.addEventListener('click', () => {
    const bedenganCode = selBed?.value || '';
    const remPoly = parseInt(hiddenRemPoly?.value || 0, 10);
    const inspectedPoly = parseInt(inputInspectedPoly?.value || 0, 10);
    const selectedBibit = parseInt(inputSelectedBibit?.value || 0, 10);
    const tanggalSeleksi = today;
    const catatan = inputNotes?.value || '';

    // Validations
    if (isNaN(inspectedPoly) || inspectedPoly <= 0) {
      toast('Jumlah polybag diperiksa harus lebih besar dari 0.', 'error');
      return;
    }
    if (inspectedPoly > remPoly) {
      toast(`Jumlah polybag diperiksa (${inspectedPoly.toLocaleString('id-ID')}) melebihi sisa scope (${remPoly.toLocaleString('id-ID')}).`, 'error');
      return;
    }
    if (isNaN(selectedBibit) || selectedBibit < 0) {
      toast('Jumlah bibit diseleksi tidak valid.', 'error');
      return;
    }

    const totalSelectedAfter = existingBibitSelected + selectedBibit;
    const cumulativeRetained = Math.max(0, sourceBibit - totalSelectedAfter);

    try {
      const res = createSeleksi3ExecutionTransaction({
        selectionDocumentId: doc.id,
        selectionDocNo: doc.docNo,
        bedenganCode,
        actualPolybagInspectedQty: inspectedPoly,
        actualBibitSelectedQty: selectedBibit,
        actualBibitRetainedQty: cumulativeRetained,
        tanggalSeleksi,
        catatan
      }, user);

      closeModal();
      toast(`Transaksi Seleksi III (${res.transaction.docNo}) pada ${bedenganCode} berhasil dicatat. (${res.transaction.actualPolybagInspectedQty} Polybag, ${res.transaction.actualBibitSelectedQty} Bibit Diseleksi)`, 'success');
      if (onSaved) onSaved(res);
    } catch (err) {
      console.error('[Seleksi 3 Save Error]', err);
      toast(err.message || 'Gagal menyimpan transaksi Seleksi III', 'error');
    }
  });
}


