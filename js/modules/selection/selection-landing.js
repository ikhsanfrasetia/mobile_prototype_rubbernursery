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
import { formatDate, formatStandardDocNo, esc } from '../../core/utils.js';
import { getCurrentUserContext, resolveUserContext, normalizeRole, ROLES } from '../../core/user-context.js';
import { openModal, closeModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import {
  syncAllDederanRejectionsToSelectionPool
} from '../seeding/dederan-manager.js';
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
};

let activeAsbTab = 'PENDING'; // 'PENDING' | 'HISTORY'
let activeMantriTab = 'PRE_SOWING'; // 'PRE_SOWING' | 'PRE_GRAFTING' | 'POST_GRAFTING'
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
  const pendingPreDocs = allPreDocs.filter(d => (
    (d.status || '').toUpperCase() === SELECTION_STATUS.MENUNGGU_VERIFIKASI ||
    (d.status || '').toUpperCase() === SELECTION_STATUS.DIAJUKAN
  ));
  const historyPreDocs = allPreDocs.filter(d => (
    (d.status || '').toUpperCase() === SELECTION_STATUS.DISETUJUI ||
    (d.status || '').toUpperCase() === SELECTION_STATUS.DIKEMBALIKAN
  ));

  // 2. Post-Grafting Records (Existing)
  const allRecords = storage.get(SELECTION_STORAGE_KEY, []);
  const postGraftingRecords = allRecords.filter(r => !r.selectionDocumentId && !r.parentSelectionDocumentId && r.selectionType !== SELECTION_TYPES.PRA_OKULASI && r.selectionStage !== SELECTION_STAGES.SELEKSI_1);
  const scopedPostRecords = filterSelectionByScope(postGraftingRecords, currentUser);

  const pendingPostRecords = scopedPostRecords.filter(r => (
    (r.status || '').toUpperCase() === SELECTION_STATUS.MENUNGGU_VERIFIKASI ||
    (r.status || '').toUpperCase() === SELECTION_STATUS.DIAJUKAN ||
    (r.status || '').toUpperCase() === 'PENDING_DECLARATION'
  ));

  const historyPostRecords = scopedPostRecords.filter(r => (
    (r.status || '').toUpperCase() === SELECTION_STATUS.DISETUJUI ||
    (r.status || '').toUpperCase() === SELECTION_STATUS.DIKEMBALIKAN ||
    (r.status || '').toUpperCase() === 'DECLARED_CULLED'
  ));

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

          let statusBadge = `<span style="font-size: 0.64rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; white-space: nowrap;">MENUNGGU PEMERIKSAAN</span>`;
          if (isApproved) {
            statusBadge = `<span style="font-size: 0.64rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0; white-space: nowrap;">DISETUJUI (FINAL)</span>`;
          } else if (isReturned) {
            statusBadge = `<span style="font-size: 0.64rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; white-space: nowrap;">DIKEMBALIKAN</span>`;
          }

          return `
                <div class="card-pre-grafting-asb" data-id="${esc(doc.id)}" style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 10px; padding: 12px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                  
                  <!-- HEADER DOKUMEN -->
                  <div style="margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 5px;">
                      <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #EEF2FF; color: #3730A3; border: 1px solid #C7D2FE; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${stageBadgeText}
                      </span>
                      <div style="flex-shrink: 0;">
                        ${statusBadge}
                      </div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
                      <strong style="font-size: 0.95rem; font-weight: 800; color: #0F172A; letter-spacing: -0.01em;">${esc(doc.docNo)}</strong>
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
              : (isSeleksi2
                ? `${tx.polybagScope} Ply (${tx.polybag2Bibit || 0}x2→1, ${tx.polybag1Bibit || 0}x1→1, ${tx.polybag0Bibit || 0}x0) • ${esc(tx.tanggalSeleksi || tx.tanggal)}`
                : `${tx.polybagScope} Ply (${tx.polybag2Bibit || 0}x2, ${tx.polybag1Bibit || 0}x1, ${tx.polybag0Bibit || 0}x0) • ${esc(tx.tanggalSeleksi || tx.tanggal)}`)}
                            </div>
                          </div>
                          <div style="text-align: right; flex-shrink: 0;">
                            <div style="font-weight: 700; color: #15803D; font-size: 0.70rem;">+${(tx.bibitDipertahankan || tx.jumlahLayak || 0).toLocaleString('id-ID')} Pkk</div>
                            <div style="font-size: 0.62rem; font-weight: 600; color: #DC2626;">-${(tx.bibitReject || tx.jumlahAfkir || 0).toLocaleString('id-ID')} Reject</div>
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

            <!-- B. SECTION POST-GRAFTING RECORDS (EXISTING) -->
            ${(activeAsbTab === 'PENDING' ? pendingPostRecords : historyPostRecords).map(item => {
          const checked = parseInt(item.jumlahDiperiksa || 0, 10);
          const pass = parseInt(item.jumlahLayak || 0, 10);
          const cull = parseInt(item.jumlahAfkir || 0, 10);
          const passPct = checked > 0 ? Math.round((pass / checked) * 100) : 0;
          const cullPct = checked > 0 ? Math.round((cull / checked) * 100) : 0;
          const isActionable = canPerformAsistenSelectionAction(item, currentUser);
          const isApproved = item.status === SELECTION_STATUS.DISETUJUI;
          const isReturned = item.status === SELECTION_STATUS.DIKEMBALIKAN;

          let statusBadge = `<span style="font-size: 0.64rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; white-space: nowrap;">MENUNGGU PEMERIKSAAN</span>`;
          if (isApproved) {
            statusBadge = `<span style="font-size: 0.64rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0; white-space: nowrap;">DISETUJUI</span>`;
          } else if (isReturned) {
            statusBadge = `<span style="font-size: 0.64rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA; white-space: nowrap;">DIKEMBALIKAN</span>`;
          }

          return `
                <div class="card-selection-item" data-id="${esc(item.id)}" style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 10px; padding: 12px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                  
                  <!-- HEADER BARIS 1 -->
                  <div style="margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 5px;">
                      <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #EEF2FF; color: #3730A3; border: 1px solid #C7D2FE; white-space: nowrap;">
                        ${esc(item.selectionType || item.selectionStage || 'PASCA-OKULASI')}
                      </span>
                      <div style="flex-shrink: 0;">
                        ${statusBadge}
                      </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
                      <strong style="font-size: 0.95rem; font-weight: 800; color: #0F172A; letter-spacing: -0.01em;">${esc(item.docNo || item.selectionNo || '-')}</strong>
                      <span style="font-size: 0.70rem; color: #64748B; white-space: nowrap;">
                        ${esc(item.batchCode || item.batchNo || 'Batch')} • ${esc(item.clone || item.klon || '-')}
                      </span>
                    </div>
                  </div>

                  <!-- METADATA BARIS 2 -->
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 8px; font-size: 0.70rem; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 10px; margin-bottom: 8px;">
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      <span style="color: #64748B;">Bedengan:</span> <strong style="color: #0F172A;">${esc(item.bedengan || (item.bedenganIds ? item.bedenganIds.join(', ') : '-'))}</strong>
                    </div>
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      <span style="color: #64748B;">Program:</span> <strong style="color: #0F172A;">${esc(item.programName || item.programId || '-')}</strong>
                    </div>
                  </div>

                  <!-- 3-KOLOM METRIK SELEKSI -->
                  <div style="display: grid; grid-template-columns: repeat(3, 1fr); background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 2px; margin-bottom: 8px; text-align: center;">
                    <div>
                      <div style="font-size: 0.58rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.02em;">Diperiksa</div>
                      <div style="font-size: 0.88rem; font-weight: 800; color: #0F172A; line-height: 1.2; margin-top: 1px;">
                        ${checked.toLocaleString('id-ID')}
                      </div>
                      <div style="font-size: 0.58rem; color: #94A3B8;">100%</div>
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

                  <!-- METADATA SUBMISSION -->
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.68rem; color: #64748B; margin-bottom: ${isActionable ? '8px' : '0'};">
                    <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      Diajukan oleh: <strong style="color: #334155;">${esc(item.createdByName || item.mantri || 'Mantri')}</strong>
                    </div>
                    <div style="flex-shrink: 0;">
                      ${esc(item.tanggalSeleksi || item.tanggal || '-')}
                    </div>
                  </div>

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

  // Action Buttons Post-Grafting
  app.querySelectorAll('.btn-asb-approve').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      const target = allRecords.find(r => r.id === id);
      if (!target) return;

      openModal({
        title: 'Persetujuan Hasil Seleksi',
        body: `
          <div style="font-size: 0.84rem; color: #334155; line-height: 1.5;">
            <p style="margin: 0 0 10px 0;">
              Apakah Anda yakin ingin menyetujui hasil seleksi bibit untuk batch <strong>${esc(target.batchCode)}</strong>?
            </p>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; font-size: 0.78rem;">
              <div>Diperiksa: <strong>${parseInt(target.jumlahDiperiksa || 0).toLocaleString('id-ID')}</strong> Pkk</div>
              <div>Layak: <strong style="color: #15803D;">${parseInt(target.jumlahLayak || 0).toLocaleString('id-ID')}</strong> Pkk</div>
              <div>Afkir: <strong style="color: #DC2626;">${parseInt(target.jumlahAfkir || 0).toLocaleString('id-ID')}</strong> Pkk</div>
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

      openModal({
        title: 'Kembalikan Hasil Seleksi',
        body: `
          <div style="font-size: 0.84rem; color: #334155; line-height: 1.5;">
            <p style="margin: 0 0 12px 0;">
              Kembalikan hasil seleksi batch <strong>${esc(target.batchCode)}</strong> ke Mantri untuk perbaikan atau penghitungan ulang.
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
 * MANTRI BIBITAN: OPERASIONAL SELEKSI PRA-OKULASI & PASCA-OKULASI
 * =============================================================================
 */
function renderMantriSelectionLanding(app, user) {
  const today = formatDate(new Date().toISOString());

  // Pastikan sinkronisasi dederan rejections selalu dilakukan saat render mantri view
  try {
    syncAllDederanRejectionsToSelectionPool();
  } catch (err) {
    console.warn('[renderMantriSelectionLanding] Gagal sync Dederan rejections:', err);
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
  const preGraftingDocs = getPreGraftingSelectionDocuments({}, user);
  const seleksi1Docs = preGraftingDocs.filter(d => (d.selectionStage || 'SELEKSI_I') === 'SELEKSI_I' || d.selectionStage === 'SELEKSI_1');
  const seleksi2Docs = preGraftingDocs.filter(d => d.selectionStage === 'SELEKSI_II' || d.selectionStage === 'SELEKSI_2');
  const seleksi3Docs = preGraftingDocs.filter(d => d.selectionStage === 'SELEKSI_III' || d.selectionStage === 'SELEKSI_3');

  // Filter Selection Pool into Pra-Semai (Dederan) vs Pasca-Okulasi
  let rawSelectionPool = storage.get('selection_pool', []);
  let scopedPool = filterSelectionByScope(rawSelectionPool, user).filter(item => !findExistingSelectionTransaction(item));

  const preSowingSelectionPool = scopedPool.filter(item => item.originType === 'REJECT_DEDERAN' || item.sourceModule === 'DEDERAN');
  const postGraftingSelectionPool = scopedPool.filter(item => item.originType !== 'REJECT_DEDERAN' && item.sourceModule !== 'DEDERAN');

  const allCulledTxs = storage.get('selection_transactions', []);
  const scopedCulledTxs = filterSelectionByScope(allCulledTxs, user).filter(tx => !tx.selectionDocumentId && !tx.parentSelectionDocumentId && tx.selectionType !== SELECTION_TYPES.PRA_OKULASI);

  const preSowingCulledTxs = scopedCulledTxs.filter(tx => tx.originType === 'REJECT_DEDERAN' || tx.sourceModule === 'DEDERAN');
  const postGraftingCulledTxs = scopedCulledTxs.filter(tx => tx.originType !== 'REJECT_DEDERAN' && tx.sourceModule !== 'DEDERAN');

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
      </header>

      <!-- TAB NAVIGATION MANTRI: PRA-SEMAI (DEDERAN) vs PRA-OKULASI vs PASCA-OKULASI -->
      <div style="display: flex; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 0 16px; gap: 14px; overflow-x: auto; flex-shrink: 0;">
        <button id="tab-mantri-pre-sowing" type="button" style="padding: 12px 2px; font-size: 0.80rem; font-weight: ${activeMantriTab === 'PRE_SOWING' ? '700' : '600'}; color: ${activeMantriTab === 'PRE_SOWING' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeMantriTab === 'PRE_SOWING' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 5px; white-space: nowrap;">
          <span>Seleksi Pra-Semai (Dederan)</span>
          ${preSowingSelectionPool.length > 0 ? `<span style="background: #DC2626; color: #FFFFFF; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${preSowingSelectionPool.length}</span>` : ''}
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
              ${seleksi1Docs.length > 0 ? `<span style="background: ${activePreGraftingTab === 'SELEKSI_1' ? '#116834' : '#94A3B8'}; color: #FFF; font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${seleksi1Docs.length}</span>` : ''}
            </button>
            <button id="subtab-seleksi-2" type="button" style="flex: 1; padding: 8px 4px; font-size: 0.78rem; font-weight: ${activePreGraftingTab === 'SELEKSI_2' ? '700' : '600'}; color: ${activePreGraftingTab === 'SELEKSI_2' ? '#116834' : '#64748B'}; background: ${activePreGraftingTab === 'SELEKSI_2' ? '#FFFFFF' : 'transparent'}; border: none; border-radius: 6px; cursor: pointer; box-shadow: ${activePreGraftingTab === 'SELEKSI_2' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'}; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span>Seleksi II</span>
              ${seleksi2Docs.length > 0 ? `<span style="background: ${activePreGraftingTab === 'SELEKSI_2' ? '#116834' : '#94A3B8'}; color: #FFF; font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${seleksi2Docs.length}</span>` : ''}
            </button>
            <button id="subtab-seleksi-3" type="button" style="flex: 1; padding: 8px 4px; font-size: 0.78rem; font-weight: ${activePreGraftingTab === 'SELEKSI_3' ? '700' : '600'}; color: ${activePreGraftingTab === 'SELEKSI_3' ? '#116834' : '#64748B'}; background: ${activePreGraftingTab === 'SELEKSI_3' ? '#FFFFFF' : 'transparent'}; border: none; border-radius: 6px; cursor: pointer; box-shadow: ${activePreGraftingTab === 'SELEKSI_3' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'}; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <span>Seleksi III</span>
              ${seleksi3Docs.length > 0 ? `<span style="background: ${activePreGraftingTab === 'SELEKSI_3' ? '#116834' : '#94A3B8'}; color: #FFF; font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${seleksi3Docs.length}</span>` : ''}
            </button>
          </div>

          ${activePreGraftingTab === 'SELEKSI_1' ? `
            <!-- VIEW 1A: DOKUMEN SELEKSI I PRA-OKULASI -->
            <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
              <h2 style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin: 0;">Dokumen Seleksi I (Pra-Okulasi) (${seleksi1Docs.length})</h2>
            </div>

            ${seleksi1Docs.length === 0 ? renderEmptyStateCard({
              title: 'Belum Ada Dokumen Seleksi I',
              description: 'Dokumen seleksi pra-okulasi otomatis dibentuk saat transaksi Penyemaian dicatat.'
            }) : `
              <!-- LIST DOKUMEN INDUK SELEKSI I (TASK-26 ENHANCE HIERARCHY) -->
              <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 14px;">
                ${seleksi1Docs.map(doc => {
                  const bedScopeList = getBedenganScopeStatusForSeleksi1(doc);
                  const executions = getSeleksi1ExecutionsByDocument(doc.id || doc.docNo);
                  const bedDisplay = formatBedenganDisplayCode(doc);
                  const sourcePolybag = parseInt(doc.sourcePolybagQty || 0, 10);
                  const sourceBibit = parseInt(doc.sourceBibitQty || 0, 10);
                  const totalLayak = parseInt(doc.totalLayak || 0, 10);
                  const totalAfkir = parseInt(doc.totalAfkir || 0, 10);

                  // Perhitungan Akurat Sisa Populasi dari Dokumen Induk & Child Transactions
                  const totalInspectedPolybag = executions.reduce((sum, tx) => sum + parseInt(tx.polybagScope || tx.initialPolybagCount || 0, 10), 0);
                  const remainingPolybag = Math.max(0, sourcePolybag - totalInspectedPolybag);
                  const progressPercent = sourcePolybag > 0 ? ((totalInspectedPolybag / sourcePolybag) * 100) : 0;
                  const formattedProgress = (Math.round(progressPercent * 10) / 10).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
                  const isAllChecked = (sourcePolybag > 0 && totalInspectedPolybag >= sourcePolybag) || (bedScopeList.length > 0 && bedScopeList.every(b => b.remainingPolybag <= 0));
                  const isCompleted = Boolean(doc.isCompleted) || isAllChecked;
                  const isSubmitted = doc.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI || doc.status === 'DIAJUKAN';
                  const isApproved = doc.status === SELECTION_STATUS.DISETUJUI;
                  const isReturned = doc.status === SELECTION_STATUS.DIKEMBALIKAN;
                  const isFinal = Boolean(doc.isFinal);

                  // Cek apakah Dokumen Seleksi II sudah pernah dibuat dari Seleksi I ini
                  const existingSel2 = seleksi2Docs.find(d =>
                    d.sourceSelectionDocumentId === doc.id ||
                    d.sourceSelectionDocNo === doc.docNo ||
                    d.sourceDocNo === doc.docNo
                  );

                  let badgeText = 'DRAFT';
                  let badgeBg = '#FEF3C7';
                  let badgeColor = '#B45309';
                  let badgeBorder = '#FDE68A';

                  if (isApproved && isFinal) {
                    badgeText = 'Disetujui';
                    badgeBg = '#F0FDF4';
                    badgeColor = '#15803D';
                    badgeBorder = '#BBF7D0';
                  } else if (isReturned) {
                    badgeText = 'Dikembalikan';
                    badgeBg = '#FEF2F2';
                    badgeColor = '#DC2626';
                    badgeBorder = '#FECACA';
                  } else if (isSubmitted) {
                    badgeText = 'Menunggu Verifikasi';
                    badgeBg = '#EFF6FF';
                    badgeColor = '#1D4ED8';
                    badgeBorder = '#BFDBFE';
                  } else if (isAllChecked || isCompleted) {
                    badgeText = 'Siap Review';
                    badgeBg = '#F0FDF4';
                    badgeColor = '#15803D';
                    badgeBorder = '#BBF7D0';
                  } else if (executions.length > 0) {
                    badgeText = 'Sedang Diperiksa';
                    badgeBg = '#FEF3C7';
                    badgeColor = '#B45309';
                    badgeBorder = '#FDE68A';
                  }

                  return `
                    <!-- CARD DOKUMEN INDUK (COLLAPSED BY DEFAULT, TASK-29 INDEPENDENT EXPAND) -->
                    <div class="card-pre-grafting-doc card-parent-doc" id="selection-parent-${esc(doc.id)}" data-id="${esc(doc.id)}" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); display: flex; flex-direction: column; gap: 10px;">
                      
                      <!-- 1. PROGRAM PEMBIBITAN (PALING ATAS) & STATUS BADGE -->
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                        <div>
                          <div style="font-size: 0.62rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Program Pembibitan</div>
                          <div style="font-weight: 800; font-size: 0.90rem; color: #0F172A; margin-top: 1px;">
                            ${esc(doc.programCode || doc.programName || '-')}
                          </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                          <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">
                            ${badgeText}
                          </span>
                          <span style="font-size: 0.62rem; color: #94A3B8;">${executions.length} Sesi Transaksi</span>
                        </div>
                      </div>

                      <!-- 2. DOKUMEN SELEKSI & 3. SUMBER PENYEMAIAN -->
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px;">
                        <div>
                          <div style="font-size: 0.62rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Dokumen Seleksi</div>
                          <div style="font-weight: 800; font-size: 0.90rem; color: #116834; margin-top: 1px;">
                            Seleksi I — ${esc(doc.docNo || doc.selectionDocNo)}
                          </div>
                        </div>
                        <div style="text-align: right;">
                          <div style="font-size: 0.62rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Sumber Penyemaian</div>
                          <div style="font-weight: 700; font-size: 0.82rem; color: #0F172A; margin-top: 1px;">
                            ${esc(doc.sourceDocNo || '-')}
                          </div>
                        </div>
                      </div>

                      <!-- 4. BATCH & BEDENGAN -->
                      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #475569; padding: 0 2px;">
                        <div>Batch: <strong style="color: #0F172A;">${esc(doc.batchCode || doc.batchNo || '-')}</strong> • Klon: <strong style="color: #0F172A;">${esc(doc.clone || doc.klon || '-')}</strong></div>
                        <div>Bedengan: <strong style="color: #0F172A;">${esc(bedDisplay)}</strong></div>
                      </div>

                      <!-- 5. POPULASI PEMERIKSAAN DENGAN VISUAL PROGRESS BAR (TASK-29 TYPOGRAPHY) -->
                      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                          <span style="font-size: 0.62rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Populasi Pemeriksaan</span>
                          <div style="text-align: right;">
                            <div style="font-size: 0.92rem; font-weight: 800; color: #0F172A; line-height: 1.2;">
                              ${totalInspectedPolybag.toLocaleString('id-ID')} / ${sourcePolybag.toLocaleString('id-ID')}
                            </div>
                            <div style="font-size: 0.68rem; font-weight: 600; color: #64748B; line-height: 1.2;">Diperiksa</div>
                          </div>
                        </div>

                        <!-- PROGRESS BAR VISUAL HORIZONTAL FULL-WIDTH -->
                        <div style="background: #E2E8F0; border-radius: 999px; height: 8px; width: 100%; overflow: hidden;">
                          <div style="background: ${progressPercent >= 100 ? '#15803D' : '#116834'}; height: 100%; width: ${Math.min(100, Math.max(0, progressPercent))}%; border-radius: 999px; transition: width 0.3s ease;"></div>
                        </div>

                        <!-- TEKS PENDUKUNG: PERSENTASE + SISA -->
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.70rem;">
                          <span style="font-weight: 700; color: ${progressPercent >= 100 ? '#15803D' : '#116834'};">${formattedProgress}</span>
                          <span style="font-weight: 600; color: ${remainingPolybag === 0 ? '#15803D' : '#94A3B8'};">
                            ${remainingPolybag === 0 ? '✓ Selesai' : 'Sisa ' + remainingPolybag.toLocaleString('id-ID') + ' Polybag'}
                          </span>
                        </div>
                      </div>

                      <!-- 6. STATUS / ACTION -->
                      ${(isAllChecked || remainingPolybag === 0) ? `
                        <div style="padding: 6px 10px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; font-size: 0.74rem; color: #166534; font-weight: 700; text-align: center;">
                          ✓ Seluruh populasi telah diperiksa
                        </div>
                      ` : (!isApproved && !isSubmitted) ? `
                        <button type="button" class="btn-execute-seleksi1" data-id="${esc(doc.id)}" style="width: 100%; height: 36px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 1px 2px rgba(17,104,52,0.15);">
                          Rekam Data Seleksi I
                        </button>
                      ` : ''}

                      <!-- 7. KONTROL EXPAND/COLLAPSE DOKUMEN INDUK -->
                      <div>
                        <button type="button" class="btn-toggle-parent-detail" data-target="selection-detail-${esc(doc.id)}" style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; width: 100%; padding: 6px 10px; font-size: 0.74rem; font-weight: 700; color: #116834; cursor: pointer; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box;">
                          <span class="text-parent-toggle">Lihat Detail</span>
                          <svg class="icon-parent-toggle" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" style="transition: transform 0.2s ease;">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                      </div>

                      <!-- 8. EXPANDED DETAIL DOKUMEN INDUK (HANYA METADATA TAMBAHAN NON-REDUNDANT) -->
                      <div class="parent-detail-content" id="selection-detail-${esc(doc.id)}" style="display: none; border-top: 1px dashed #CBD5E1; padding-top: 10px; flex-direction: column; gap: 10px;">
                        
                        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 12px; font-size: 0.74rem; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px;">
                          <div>Estate: <strong style="color: #0F172A;">${esc(doc.estateName || doc.estateId || '-')}</strong></div>
                          <div>Divisi: <strong style="color: #0F172A;">${esc(doc.divisionName || doc.divisionId || '-')}</strong></div>
                          <div>Tahap: <strong style="color: #0F172A;">Seleksi I (Pra-Okulasi)</strong></div>
                          <div>Klon: <strong style="color: #0F172A;">${esc(doc.clone || doc.klon || '-')}</strong></div>
                        </div>

                        ${isReturned && doc.returnReason ? `
                          <div style="padding: 8px 10px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; font-size: 0.72rem; color: #991B1B;">
                            <strong>Catatan Pengembalian Asisten:</strong> ${esc(doc.returnReason)}
                          </div>
                        ` : ''}

                        <!-- TOMBOL WORKFLOW PADA DOKUMEN INDUK -->
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                          
                          ${!isApproved && !isSubmitted ? `
                            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.76rem; color: #1E293B; cursor: pointer; user-select: none; font-weight: 600; padding: 4px 0;">
                              <input type="checkbox" class="chk-doc-completed" data-id="${esc(doc.id)}" ${isCompleted ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer; accent-color: #116834;">
                              <span>Seleksi Selesai</span>
                              <span style="font-size: 0.68rem; color: #64748B; font-weight: normal;">(Centang jika Seleksi I Selesai)</span>
                            </label>
                          ` : ''}

                          ${isCompleted && !isSubmitted && !isApproved ? `
                            <button type="button" class="btn-open-review-modal" data-id="${esc(doc.id)}" style="width: 100%; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 1px 2px rgba(17,104,52,0.2);">
                              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none">
                                <polyline points="9 11 12 14 22 4"></polyline>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                              </svg>
                              Tinjau & Kirim ke Asisten Bibitan
                            </button>
                          ` : ''}

                          ${isSubmitted ? `
                            <button type="button" class="btn-open-review-modal" data-id="${esc(doc.id)}" style="width: 100%; height: 34px; background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; border-radius: 6px; font-weight: 600; font-size: 0.76rem; cursor: pointer;">
                              Lihat Rincian Verifikasi Data
                            </button>
                          ` : ''}

                          ${isApproved ? `
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                              <div style="padding: 6px 10px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; font-size: 0.72rem; color: #166534;">
                                ✅ <strong>Data Final:</strong> Disetujui oleh ${esc(doc.verifiedByName || 'Asisten Bibitan')} pada ${doc.verifiedAt ? formatDate(doc.verifiedAt) : '-'}.
                              </div>
                              ${existingSel2 ? `
                                <button type="button" class="btn-view-seleksi2" data-id="${esc(existingSel2.id)}" style="width: 100%; height: 36px; background: #EEF2FF; color: #3730A3; border: 1px solid #C7D2FE; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                  <span>Dokumen Seleksi II Terbentuk: <strong>${esc(existingSel2.docNo)}</strong> →</span>
                                </button>
                              ` : `
                                <button type="button" class="btn-create-seleksi2" data-id="${esc(doc.id)}" style="width: 100%; height: 36px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(17,104,52,0.15);">
                                  Buat Dokumen Seleksi II
                                </button>
                              `}
                            </div>
                          ` : ''}

                        </div>

                      </div><!-- END parent-detail-content -->

                    </div><!-- END card-parent-doc -->
                  `;
                }).join('')}
              </div>

              <!-- GLOBAL CONTAINER RINGKASAN TRANSAKSI PELAKSANAAN (SESUAI POLA MODUL PENYEMAIAN - POIN H, I, J) -->
              ${(() => {
                const allRawTxs = storage.get(SELECTION_STORAGE_KEY, []);
                const allSeleksi1Txs = allRawTxs.filter(tx => {
                  const isStage1 = (
                    tx.selectionStage === SELECTION_STAGES.SELEKSI_1 ||
                    tx.stage === 'SELEKSI_I' ||
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

                return `
                  <div class="section-global-child-transactions" style="margin-top: 20px; padding-top: 14px; border-top: 2px solid #E2E8F0;">
                    <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                      <h2 style="font-size: 0.92rem; font-weight: 800; color: #0F172A; margin: 0;">
                        Ringkasan Transaksi (${allSeleksi1Txs.length})
                      </h2>
                    </div>

                    ${allSeleksi1Txs.length === 0 ? renderEmptyStateCard({
                      title: 'Belum ada transaksi pelaksanaan',
                      description: 'Belum ada pemeriksaan yang dicatat untuk Seleksi I.'
                    }) : `
                      <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${allSeleksi1Txs.map((tx, txIdx) => {
                          const parentDoc = seleksi1Docs.find(d => 
                            d.id === tx.parentSelectionDocumentId || 
                            d.id === tx.selectionDocumentId ||
                            d.docNo === tx.parentSelectionDocNo ||
                            d.docNo === tx.selectionDocNo ||
                            d.docNo === tx.sourceDocNo
                          ) || {};
                          const p2 = tx.polybag2Bibit || 0;
                          const p1 = tx.polybag1Bibit || 0;
                          const p0 = tx.polybag0Bibit || 0;
                          const polyChecked = tx.polybagScope || tx.initialPolybagCount || (p2 + p1 + p0);
                          const bibitLayak = tx.bibitDipertahankan || tx.jumlahLayak || ((p2 * 2) + p1);
                          const bibitAfkir = tx.bibitReject || tx.jumlahAfkir || (p1 + (p0 * 2));
                          const bibitAwal = polyChecked * 2;
                          const isBalanced = (p2 + p1 + p0 === polyChecked) && (bibitLayak + bibitAfkir === bibitAwal);
                          const isParentApprovedOrSubmitted = parentDoc.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI || parentDoc.status === 'DIAJUKAN' || parentDoc.status === SELECTION_STATUS.DISETUJUI;

                          return `
                            <!-- CARD TRANSAKSI GLOBAL (DEFAULT: COLLAPSED) -->
                            <div class="card-child-tx" data-tx-id="${esc(tx.id)}" data-doc-no="${esc(tx.docNo)}" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                              
                              <!-- HEADER ROW TRANSAKSI (ALWAYS VISIBLE - POIN I) -->
                              <div class="btn-toggle-child-tx" style="display: flex; justify-content: space-between; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
                                <div style="flex: 1; min-width: 0;">
                                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                    <span style="font-weight: 800; color: #116834; font-size: 0.80rem;">Seleksi I</span>
                                    <span style="color: #64748B; font-size: 0.72rem;">• Transaksi #${txIdx + 1} (${esc(tx.docNo)})</span>
                                    <span style="background: #F1F5F9; color: #475569; font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 4px;">${esc(tx.bedenganCode || tx.bedengan || '-')}</span>
                                  </div>
                                  <div style="color: #64748B; font-size: 0.72rem; margin-top: 3px;">
                                    ${esc(tx.tanggalSeleksi || tx.tanggal || '-')} • <strong style="color: #0F172A;">${polyChecked.toLocaleString('id-ID')} Polybag</strong> • Dok. <strong style="color: #334155;">${esc(parentDoc.docNo || tx.parentSelectionDocNo || tx.selectionDocNo || '-')}</strong>
                                  </div>
                                </div>
                                
                                <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                                  <span style="font-size: 0.65rem; font-weight: 700; color: #15803D; background: #F0FDF4; border: 1px solid #BBF7D0; padding: 2px 6px; border-radius: 4px;">
                                    Selesai
                                  </span>
                                  <svg class="icon-child-toggle" viewBox="0 0 24 24" width="14" height="14" stroke="#64748B" stroke-width="2.5" fill="none" style="transition: transform 0.2s ease;">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                  </svg>
                                </div>
                              </div>

                              <!-- DETAIL TRANSAKSI EXPANDED (DEFAULT: HIDDEN - POIN J) -->
                              <div class="child-tx-detail-content" style="display: none; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #E2E8F0;">
                                
                                <!-- CONTEXT METADATA -->
                                <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; font-size: 0.72rem; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; margin-bottom: 8px;">
                                  <div>Program: <strong style="color: #0F172A;">${esc(parentDoc.programCode || parentDoc.programName || tx.programCode || '-')}</strong></div>
                                  <div>Dokumen Induk: <strong style="color: #0F172A;">${esc(parentDoc.docNo || tx.parentSelectionDocNo || tx.selectionDocNo || '-')}</strong></div>
                                  <div>Sumber Penyemaian: <strong style="color: #0F172A;">${esc(parentDoc.sourceDocNo || tx.sourceSeedingDocNo || '-')}</strong></div>
                                  <div>Bedengan: <strong style="color: #0F172A;">${esc(tx.bedenganCode || tx.bedengan || '-')}</strong></div>
                                  <div>Tanggal Transaksi: <strong style="color: #0F172A;">${esc(tx.tanggalSeleksi || tx.tanggal || '-')}</strong></div>
                                  <div>Status: <strong style="color: #15803D;">Selesai</strong></div>
                                </div>

                                <!-- BREAKDOWN P2, P1, P0 -->
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; text-align: center; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 8px; margin-bottom: 8px;">
                                  <div>
                                    <div style="font-size: 0.60rem; font-weight: 700; color: #15803D;">2 Bibit / Ply (P2)</div>
                                    <div style="font-size: 0.82rem; font-weight: 800; color: #15803D; margin-top: 1px;">${p2.toLocaleString('id-ID')}</div>
                                  </div>
                                  <div style="border-left: 1px solid #E2E8F0;">
                                    <div style="font-size: 0.60rem; font-weight: 700; color: #D97706;">1 Bibit / Ply (P1)</div>
                                    <div style="font-size: 0.82rem; font-weight: 800; color: #D97706; margin-top: 1px;">${p1.toLocaleString('id-ID')}</div>
                                  </div>
                                  <div style="border-left: 1px solid #E2E8F0;">
                                    <div style="font-size: 0.60rem; font-weight: 700; color: #DC2626;">0 Bibit / Ply (P0)</div>
                                    <div style="font-size: 0.82rem; font-weight: 800; color: #DC2626; margin-top: 1px;">${p0.toLocaleString('id-ID')}</div>
                                  </div>
                                </div>

                                <!-- METRICS HASIL BIBIT -->
                                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; font-size: 0.70rem; margin-bottom: 8px; text-align: center; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 4px;">
                                  <div>Bibit Awal: <strong style="color: #0F172A;">${bibitAwal.toLocaleString('id-ID')}</strong></div>
                                  <div>Layak: <strong style="color: #15803D;">${bibitLayak.toLocaleString('id-ID')}</strong></div>
                                  <div>Reject: <strong style="color: #DC2626;">${bibitAfkir.toLocaleString('id-ID')}</strong></div>
                                  <div>Balance: <strong style="color: #15803D;">${isBalanced ? 'BALANCE ✅' : 'MISMATCH ❌'}</strong></div>
                                </div>

                                <!-- PENCATAT & CATATAN -->
                                <div style="font-size: 0.68rem; color: #64748B; display: flex; flex-direction: column; gap: 2px; margin-bottom: 6px;">
                                  <div>Pencatat: <strong>${esc(tx.createdByName || tx.createdByUserId || 'Mantri')}</strong> (${esc(tx.createdByRole || 'MANTRI_TANAMAN')})</div>
                                  ${tx.catatan && tx.catatan !== '-' ? `<div>Catatan: <em>${esc(tx.catatan)}</em></div>` : ''}
                                </div>

                                <!-- ACTION DELETE -->
                                ${!isParentApprovedOrSubmitted ? `
                                  <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid #F1F5F9; padding-top: 6px; margin-top: 6px;">
                                    <button type="button" class="btn-delete-child-tx" data-tx-id="${esc(tx.id)}" data-doc-no="${esc(tx.docNo)}" style="padding: 4px 10px; background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; border-radius: 4px; font-size: 0.70rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;">
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
              })()}
            `}
          ` : activePreGraftingTab === 'SELEKSI_2' ? `
            <!-- VIEW 1B: DOKUMEN SELEKSI II PRA-OKULASI -->
            <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
              <h2 style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin: 0;">Dokumen Seleksi II (Pra-Okulasi) (${seleksi2Docs.length})</h2>
            </div>

            ${seleksi2Docs.length === 0 ? renderEmptyStateCard({
              title: 'Belum Ada Dokumen Seleksi II',
              description: 'Dokumen Seleksi II dapat dibuat setelah Dokumen Seleksi I berstatus FINAL disetujui oleh Asisten Bibitan.'
            }) : `
              <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
                ${seleksi2Docs.map(doc => {
    const bedScopeList = getBedenganScopeStatusForSeleksi2(doc);
    const executions = getSeleksi2ExecutionsByDocument(doc.id || doc.docNo);
    const isCompleted = Boolean(doc.isCompleted);
    const isSubmitted = doc.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI || doc.status === 'DIAJUKAN';
    const isApproved = doc.status === SELECTION_STATUS.DISETUJUI;
    const isReturned = doc.status === SELECTION_STATUS.DIKEMBALIKAN;
    const isFinal = Boolean(doc.isFinal);
    const bedDisplay = formatBedenganDisplayCode(doc);
    const sourcePolybag = parseInt(doc.sourcePolybagQty || 0, 10);
    const sourceBibit = parseInt(doc.sourceBibitQty || 0, 10);
    const totalLayak = parseInt(doc.totalLayak || 0, 10);
    const totalAfkir = parseInt(doc.totalAfkir || 0, 10);

    const totalInspectedPolybag = executions.reduce((sum, tx) => sum + parseInt(tx.polybagScope || 0, 10), 0);
    const remainingPolybag = Math.max(0, sourcePolybag - totalInspectedPolybag);
    const isAllChecked = (sourcePolybag > 0 && totalInspectedPolybag >= sourcePolybag);
    const progressPercent = sourcePolybag > 0 ? Math.min(100, Math.round((totalInspectedPolybag / sourcePolybag) * 100)) : 0;
    const formattedProgress = `${progressPercent}% Selesai`;

    // Cek apakah Dokumen Seleksi III sudah pernah dibuat dari Seleksi II ini
    const existingSel3 = seleksi3Docs.find(d =>
      d.sourceSelectionDocumentId === doc.id ||
      d.sourceSelectionDocNo === doc.docNo ||
      d.sourceDocNo === doc.docNo
    );

    let badgeText = 'DRAFT';
    let badgeBg = '#FEF3C7';
    let badgeColor = '#B45309';
    let badgeBorder = '#FDE68A';

    if (isApproved && isFinal) {
      badgeText = 'Disetujui';
      badgeBg = '#F0FDF4';
      badgeColor = '#15803D';
      badgeBorder = '#BBF7D0';
    } else if (isReturned) {
      badgeText = 'Dikembalikan';
      badgeBg = '#FEF2F2';
      badgeColor = '#DC2626';
      badgeBorder = '#FECACA';
    } else if (isSubmitted) {
      badgeText = 'Menunggu Verifikasi';
      badgeBg = '#EFF6FF';
      badgeColor = '#1D4ED8';
      badgeBorder = '#BFDBFE';
    } else if (isAllChecked || isCompleted) {
      badgeText = 'Siap Review';
      badgeBg = '#F0FDF4';
      badgeColor = '#15803D';
      badgeBorder = '#BBF7D0';
    } else if (executions.length > 0) {
      badgeText = 'Sedang Diperiksa';
      badgeBg = '#FEF3C7';
      badgeColor = '#B45309';
      badgeBorder = '#FDE68A';
    }

    return `
                    <!-- CARD DOKUMEN INDUK SELEKSI II (COLLAPSED BY DEFAULT) -->
                    <div class="card-pre-grafting-doc card-parent-doc card-seleksi2-doc" id="selection-parent-${esc(doc.id)}" data-id="${esc(doc.id)}" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); display: flex; flex-direction: column; gap: 10px;">
                      
                      <!-- 1. PROGRAM PEMBIBITAN (PALING ATAS) & STATUS BADGE -->
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                        <div>
                          <div style="font-size: 0.62rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Program Pembibitan</div>
                          <div style="font-weight: 800; font-size: 0.90rem; color: #0F172A; margin-top: 1px;">
                            ${esc(doc.programCode || doc.programName || '-')}
                          </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                          <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">
                            ${badgeText}
                          </span>
                          <span style="font-size: 0.62rem; color: #94A3B8;">${executions.length} Sesi Transaksi</span>
                        </div>
                      </div>

                      <!-- 2. DOKUMEN SELEKSI & 3. SUMBER SELEKSI I -->
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px;">
                        <div>
                          <div style="font-size: 0.62rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Dokumen Seleksi</div>
                          <div style="font-weight: 800; font-size: 0.90rem; color: #116834; margin-top: 1px;">
                            Seleksi II — ${esc(doc.docNo || doc.selectionDocNo)}
                          </div>
                        </div>
                        <div style="text-align: right;">
                          <div style="font-size: 0.62rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Sumber Seleksi I</div>
                          <div style="font-weight: 700; font-size: 0.82rem; color: #0F172A; margin-top: 1px;">
                            ${esc(doc.sourceSelectionDocNo || doc.sourceDocNo || '-')}
                          </div>
                        </div>
                      </div>

                      <!-- 4. BATCH & BEDENGAN -->
                      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #475569; padding: 0 2px;">
                        <div>Batch: <strong style="color: #0F172A;">${esc(doc.batchCode || doc.batchNo || '-')}</strong> • Klon: <strong style="color: #0F172A;">${esc(doc.clone || doc.klon || '-')}</strong></div>
                        <div>Bedengan: <strong style="color: #0F172A;">${esc(bedDisplay)}</strong></div>
                      </div>

                      <!-- 5. POPULASI PEMERIKSAAN DENGAN VISUAL PROGRESS BAR -->
                      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                          <span style="font-size: 0.62rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Populasi Pemeriksaan</span>
                          <div style="text-align: right;">
                            <div style="font-size: 0.92rem; font-weight: 800; color: #0F172A; line-height: 1.2;">
                              ${totalInspectedPolybag.toLocaleString('id-ID')} / ${sourcePolybag.toLocaleString('id-ID')}
                            </div>
                            <div style="font-size: 0.68rem; font-weight: 600; color: #64748B; line-height: 1.2;">Diperiksa</div>
                          </div>
                        </div>

                        <!-- PROGRESS BAR VISUAL HORIZONTAL FULL-WIDTH -->
                        <div style="background: #E2E8F0; border-radius: 999px; height: 8px; width: 100%; overflow: hidden;">
                          <div style="background: ${progressPercent >= 100 ? '#15803D' : '#116834'}; height: 100%; width: ${Math.min(100, Math.max(0, progressPercent))}%; border-radius: 999px; transition: width 0.3s ease;"></div>
                        </div>

                        <!-- TEKS PENDUKUNG: PERSENTASE + SISA -->
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.70rem;">
                          <span style="font-weight: 700; color: ${progressPercent >= 100 ? '#15803D' : '#116834'};">${formattedProgress}</span>
                          <span style="font-weight: 600; color: ${remainingPolybag === 0 ? '#15803D' : '#94A3B8'};">
                            ${remainingPolybag === 0 ? '✓ Selesai' : 'Sisa ' + remainingPolybag.toLocaleString('id-ID') + ' Polybag'}
                          </span>
                        </div>
                      </div>

                      <!-- 6. STATUS / ACTION -->
                      ${(isAllChecked || remainingPolybag === 0) ? `
                        <div style="padding: 6px 10px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; font-size: 0.74rem; color: #166534; font-weight: 700; text-align: center;">
                          ✓ Seluruh populasi telah diperiksa
                        </div>
                      ` : (!isApproved && !isSubmitted) ? `
                        <button type="button" class="btn-execute-seleksi2" data-id="${esc(doc.id)}" style="width: 100%; height: 36px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(17,104,52,0.15);">
                          Rekam Data Seleksi II
                        </button>
                      ` : ''}

                      <!-- 7. KONTROL EXPAND/COLLAPSE DOKUMEN INDUK -->
                      <div>
                        <button type="button" class="btn-toggle-parent-detail" data-target="selection-detail-${esc(doc.id)}" style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; width: 100%; padding: 6px 10px; font-size: 0.74rem; font-weight: 700; color: #116834; cursor: pointer; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box;">
                          <span class="text-parent-toggle">Lihat Detail</span>
                          <svg class="icon-parent-toggle" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" style="transition: transform 0.2s ease;">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                      </div>

                      <!-- 8. EXPANDED DETAIL DOKUMEN INDUK -->
                      <div class="parent-detail-content" id="selection-detail-${esc(doc.id)}" style="display: none; border-top: 1px dashed #CBD5E1; padding-top: 10px; flex-direction: column; gap: 10px;">
                        
                        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 12px; font-size: 0.74rem; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px;">
                          <div>Estate: <strong style="color: #0F172A;">${esc(doc.estateName || doc.estateId || '-')}</strong></div>
                          <div>Divisi: <strong style="color: #0F172A;">${esc(doc.divisionName || doc.divisionId || '-')}</strong></div>
                          <div>Tahap: <strong style="color: #0F172A;">Seleksi II (Pra-Okulasi)</strong></div>
                          <div>Klon: <strong style="color: #0F172A;">${esc(doc.clone || doc.klon || '-')}</strong></div>
                        </div>

                        <!-- 4-KOLOM METRIK SELEKSI II (RINGKAS & RAPI) -->
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 2px; text-align: center;">
                          <div>
                            <div style="font-size: 0.58rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.02em;">Polybag</div>
                            <div style="font-size: 0.88rem; font-weight: 800; color: #0F172A; line-height: 1.2; margin-top: 1px;">${sourcePolybag.toLocaleString('id-ID')}</div>
                            <div style="font-size: 0.58rem; color: #94A3B8;">Ply</div>
                          </div>
                          <div style="border-left: 1px solid #E2E8F0;">
                            <div style="font-size: 0.58rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.02em;">Bibit Sumber</div>
                            <div style="font-size: 0.88rem; font-weight: 800; color: #0F172A; line-height: 1.2; margin-top: 1px;">${sourceBibit.toLocaleString('id-ID')}</div>
                            <div style="font-size: 0.58rem; color: #94A3B8;">Pkk</div>
                          </div>
                          <div style="border-left: 1px solid #E2E8F0;">
                            <div style="font-size: 0.58rem; font-weight: 700; color: #15803D; text-transform: uppercase; letter-spacing: 0.02em;">Layak</div>
                            <div style="font-size: 0.88rem; font-weight: 800; color: #15803D; line-height: 1.2; margin-top: 1px;">${totalLayak.toLocaleString('id-ID')}</div>
                            <div style="font-size: 0.58rem; color: #15803D;">Pkk (1/Ply)</div>
                          </div>
                          <div style="border-left: 1px solid #E2E8F0;">
                            <div style="font-size: 0.58rem; font-weight: 700; color: #DC2626; text-transform: uppercase; letter-spacing: 0.02em;">Reject</div>
                            <div style="font-size: 0.88rem; font-weight: 800; color: #DC2626; line-height: 1.2; margin-top: 1px;">${totalAfkir.toLocaleString('id-ID')}</div>
                            <div style="font-size: 0.58rem; color: #DC2626;">Pkk</div>
                          </div>
                        </div>

                        ${isReturned && doc.returnReason ? `
                          <div style="padding: 8px 10px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; font-size: 0.72rem; color: #991B1B;">
                            <strong>Catatan Pengembalian Asisten:</strong> ${esc(doc.returnReason)}
                          </div>
                        ` : ''}

                        <!-- TOMBOL WORKFLOW PADA DOKUMEN INDUK -->
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                          ${!isApproved && !isSubmitted ? `
                            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.76rem; color: #1E293B; cursor: pointer; user-select: none; font-weight: 600; padding: 4px 0;">
                              <input type="checkbox" class="chk-doc-completed" data-id="${esc(doc.id)}" ${isCompleted ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer; accent-color: #116834;">
                              <span>Seleksi Selesai</span>
                              <span style="font-size: 0.68rem; color: #64748B; font-weight: normal;">(Centang jika Seleksi II Selesai)</span>
                            </label>
                          ` : ''}

                          ${isCompleted && !isSubmitted && !isApproved ? `
                            <button type="button" class="btn-open-review-modal" data-id="${esc(doc.id)}" style="width: 100%; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 1px 2px rgba(17,104,52,0.2);">
                              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none">
                                <polyline points="9 11 12 14 22 4"></polyline>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                              </svg>
                              Tinjau & Kirim ke Asisten Bibitan
                            </button>
                          ` : ''}

                          ${isSubmitted ? `
                            <button type="button" class="btn-open-review-modal" data-id="${esc(doc.id)}" style="width: 100%; height: 34px; background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; border-radius: 6px; font-weight: 600; font-size: 0.76rem; cursor: pointer;">
                              Lihat Rincian Verifikasi Data
                            </button>
                          ` : ''}

                          ${isApproved ? `
                            <div style="display: flex; flex-direction: column; gap: 6px;">
                              <div style="padding: 6px 10px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; font-size: 0.72rem; color: #166534;">
                                ✅ <strong>Data Final:</strong> Disetujui oleh ${esc(doc.verifiedByName || 'Asisten Bibitan')} pada ${doc.verifiedAt ? formatDate(doc.verifiedAt) : '-'}.
                              </div>
                              ${existingSel3 ? `
                                <button type="button" class="btn-view-seleksi3" data-id="${esc(existingSel3.id)}" style="width: 100%; height: 36px; background: #EEF2FF; color: #3730A3; border: 1px solid #C7D2FE; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
                                  <span>Dokumen Seleksi III Terbentuk: <strong>${esc(existingSel3.docNo)}</strong> →</span>
                                </button>
                              ` : `
                                <button type="button" class="btn-create-seleksi3" data-id="${esc(doc.id)}" style="width: 100%; height: 36px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(17,104,52,0.15);">
                                  Buat Dokumen Seleksi III
                                </button>
                              `}
                            </div>
                          ` : ''}

                        </div>

                      </div><!-- END parent-detail-content -->

                    </div><!-- END card-parent-doc -->
                  `;
                }).join('')}
              </div>

              <!-- GLOBAL CONTAINER RINGKASAN TRANSAKSI PELAKSANAAN SELEKSI II -->
              ${(() => {
                const allRawTxs = storage.get(SELECTION_STORAGE_KEY, []);
                const allSeleksi2Txs = allRawTxs.filter(tx => {
                  const isStage2 = (
                    tx.selectionStage === SELECTION_STAGES.SELEKSI_2 ||
                    tx.stage === 'SELEKSI_II' ||
                    tx.stage === 'SELEKSI_2' ||
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

                return `
                  <div class="section-global-child-transactions" style="margin-top: 20px; padding-top: 14px; border-top: 2px solid #E2E8F0;">
                    <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                      <h2 style="font-size: 0.92rem; font-weight: 800; color: #0F172A; margin: 0;">
                        Ringkasan Transaksi (${allSeleksi2Txs.length})
                      </h2>
                    </div>

                    ${allSeleksi2Txs.length === 0 ? renderEmptyStateCard({
                      title: 'Belum ada transaksi pelaksanaan',
                      description: 'Belum ada pemeriksaan yang dicatat untuk Seleksi II.'
                    }) : `
                      <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${allSeleksi2Txs.map((tx, txIdx) => {
                          const parentDoc = seleksi2Docs.find(d => 
                            d.id === tx.parentSelectionDocumentId || 
                            d.id === tx.selectionDocumentId ||
                            d.docNo === tx.parentSelectionDocNo ||
                            d.docNo === tx.selectionDocNo ||
                            d.docNo === tx.sourceDocNo
                          ) || {};
                          const p2 = tx.polybag2Bibit || 0;
                          const p1 = tx.polybag1Bibit || 0;
                          const p0 = tx.polybag0Bibit || 0;
                          const polyChecked = tx.polybagScope || tx.initialPolybagCount || (p2 + p1 + p0);
                          const bibitLayak = tx.bibitDipertahankan || tx.jumlahLayak || (p2 + p1);
                          const bibitAfkir = tx.bibitReject || tx.jumlahAfkir || p2;
                          const bibitAwal = tx.bibitAwal || (p2 * 2 + p1);
                          const isBalanced = (bibitLayak + bibitAfkir === bibitAwal);
                          const isParentApprovedOrSubmitted = parentDoc.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI || parentDoc.status === 'DIAJUKAN' || parentDoc.status === SELECTION_STATUS.DISETUJUI;

                          return `
                            <!-- CARD TRANSAKSI GLOBAL (DEFAULT: COLLAPSED) -->
                            <div class="card-child-tx" data-tx-id="${esc(tx.id)}" data-doc-no="${esc(tx.docNo)}" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                              
                              <!-- HEADER ROW TRANSAKSI -->
                              <div class="btn-toggle-child-tx" style="display: flex; justify-content: space-between; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
                                <div style="flex: 1; min-width: 0;">
                                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                    <span style="font-weight: 800; color: #116834; font-size: 0.80rem;">Seleksi II</span>
                                    <span style="color: #64748B; font-size: 0.72rem;">• Transaksi #${txIdx + 1} (${esc(tx.docNo)})</span>
                                    <span style="background: #F1F5F9; color: #475569; font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 4px;">${esc(tx.bedenganCode || tx.bedengan || '-')}</span>
                                  </div>
                                  <div style="color: #64748B; font-size: 0.72rem; margin-top: 3px;">
                                    ${esc(tx.tanggalSeleksi || tx.tanggal || '-')} • <strong style="color: #0F172A;">${polyChecked.toLocaleString('id-ID')} Polybag</strong> • Dok. <strong style="color: #334155;">${esc(parentDoc.docNo || tx.parentSelectionDocNo || tx.selectionDocNo || '-')}</strong>
                                  </div>
                                </div>
                                
                                <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                                  <span style="font-size: 0.65rem; font-weight: 700; color: #15803D; background: #F0FDF4; border: 1px solid #BBF7D0; padding: 2px 6px; border-radius: 4px;">
                                    Selesai
                                  </span>
                                  <svg class="icon-child-toggle" viewBox="0 0 24 24" width="14" height="14" stroke="#64748B" stroke-width="2.5" fill="none" style="transition: transform 0.2s ease;">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                  </svg>
                                </div>
                              </div>

                              <!-- DETAIL TRANSAKSI EXPANDED -->
                              <div class="child-tx-detail-content" style="display: none; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #E2E8F0;">
                                
                                <!-- CONTEXT METADATA -->
                                <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; font-size: 0.72rem; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; margin-bottom: 8px;">
                                  <div>Program: <strong style="color: #0F172A;">${esc(parentDoc.programCode || parentDoc.programName || tx.programCode || '-')}</strong></div>
                                  <div>Dokumen Induk: <strong style="color: #0F172A;">${esc(parentDoc.docNo || tx.parentSelectionDocNo || tx.selectionDocNo || '-')}</strong></div>
                                  <div>Sumber Seleksi I: <strong style="color: #0F172A;">${esc(parentDoc.sourceSelectionDocNo || parentDoc.sourceDocNo || tx.sourceSelectionDocNo || '-')}</strong></div>
                                  <div>Bedengan: <strong style="color: #0F172A;">${esc(tx.bedenganCode || tx.bedengan || '-')}</strong></div>
                                  <div>Tanggal Transaksi: <strong style="color: #0F172A;">${esc(tx.tanggalSeleksi || tx.tanggal || '-')}</strong></div>
                                  <div>Status: <strong style="color: #15803D;">Selesai</strong></div>
                                </div>

                                <!-- BREAKDOWN P2, P1, P0 -->
                                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; text-align: center; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 8px; margin-bottom: 8px;">
                                  <div>
                                    <div style="font-size: 0.60rem; font-weight: 700; color: #15803D;">Polybag 2 Bibit (P2)</div>
                                    <div style="font-size: 0.82rem; font-weight: 800; color: #15803D; margin-top: 1px;">${p2.toLocaleString('id-ID')}</div>
                                  </div>
                                  <div style="border-left: 1px solid #E2E8F0;">
                                    <div style="font-size: 0.60rem; font-weight: 700; color: #D97706;">Polybag 1 Bibit (P1)</div>
                                    <div style="font-size: 0.82rem; font-weight: 800; color: #D97706; margin-top: 1px;">${p1.toLocaleString('id-ID')}</div>
                                  </div>
                                  <div style="border-left: 1px solid #E2E8F0;">
                                    <div style="font-size: 0.60rem; font-weight: 700; color: #DC2626;">Polybag Kosong (P0)</div>
                                    <div style="font-size: 0.82rem; font-weight: 800; color: #DC2626; margin-top: 1px;">${p0.toLocaleString('id-ID')}</div>
                                  </div>
                                </div>

                                <!-- METRICS HASIL BIBIT -->
                                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; font-size: 0.70rem; margin-bottom: 8px; text-align: center; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 4px;">
                                  <div>Bibit Awal: <strong style="color: #0F172A;">${bibitAwal.toLocaleString('id-ID')}</strong></div>
                                  <div>Layak: <strong style="color: #15803D;">${bibitLayak.toLocaleString('id-ID')}</strong></div>
                                  <div>Reject: <strong style="color: #DC2626;">${bibitAfkir.toLocaleString('id-ID')}</strong></div>
                                  <div>Balance: <strong style="color: #15803D;">${isBalanced ? 'BALANCE ✅' : 'MISMATCH ❌'}</strong></div>
                                </div>

                                <!-- PENCATAT & CATATAN -->
                                <div style="font-size: 0.68rem; color: #64748B; display: flex; flex-direction: column; gap: 2px; margin-bottom: 6px;">
                                  <div>Pencatat: <strong>${esc(tx.createdByName || tx.createdByUserId || 'Mantri')}</strong> (${esc(tx.createdByRole || 'MANTRI_TANAMAN')})</div>
                                  ${tx.catatan && tx.catatan !== '-' ? `<div>Catatan: <em>${esc(tx.catatan)}</em></div>` : ''}
                                </div>

                                <!-- ACTION DELETE -->
                                ${!isParentApprovedOrSubmitted ? `
                                  <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid #F1F5F9; padding-top: 6px; margin-top: 6px;">
                                    <button type="button" class="btn-delete-child-tx" data-stage="SELEKSI_2" data-stage-label="Seleksi II" data-tx-id="${esc(tx.id)}" data-doc-no="${esc(tx.docNo)}" style="padding: 4px 10px; background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; border-radius: 4px; font-size: 0.70rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;">
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
              })()}
            `}
          ` : `
            <!-- VIEW 1C: DOKUMEN SELEKSI III PRA-OKULASI -->
            <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
              <h2 style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin: 0;">Dokumen Seleksi III (Pra-Okulasi) (${seleksi3Docs.length})</h2>
            </div>

            ${seleksi3Docs.length === 0 ? renderEmptyStateCard({
              title: 'Belum Ada Dokumen Seleksi III',
              description: 'Dokumen Seleksi III dapat dibuat setelah Dokumen Seleksi II berstatus FINAL disetujui oleh Asisten Bibitan.'
            }) : `
              <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
                ${seleksi3Docs.map(doc => {
    const bedDisplay = formatBedenganDisplayCode(doc);
    const executions = getSeleksi3ExecutionsByDocument(doc.id || doc.docNo);
    const metrics = getSeleksi3Metrics(doc, executions);

    const sourcePolybag = metrics.totalPopulasi;
    const totalInspectedPolybag = metrics.totalBibitDiperiksa;
    const totalLayak = metrics.totalBibitLayak;
    const totalAfkir = metrics.totalBibitReject;
    const remainingPolybag = metrics.sisaPemeriksaan;
    const progressPercent = metrics.progress;
    const formattedProgress = `${progressPercent}% Selesai`;

    const isCompleted = Boolean(doc.isCompleted);
    const isSubmitted = doc.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI || doc.status === 'DIAJUKAN';
    const isApproved = doc.status === SELECTION_STATUS.DISETUJUI;
    const isReturned = doc.status === SELECTION_STATUS.DIKEMBALIKAN;
    const isFinal = Boolean(doc.isFinal);

    let badgeText = 'Belum Dimulai';
    let badgeBg = '#F1F5F9';
    let badgeColor = '#64748B';
    let badgeBorder = '#E2E8F0';

    if (isApproved && isFinal) {
      badgeText = 'Disetujui';
      badgeBg = '#F0FDF4';
      badgeColor = '#15803D';
      badgeBorder = '#BBF7D0';
    } else if (isReturned) {
      badgeText = 'Dikembalikan';
      badgeBg = '#FEF2F2';
      badgeColor = '#DC2626';
      badgeBorder = '#FECACA';
    } else if (isSubmitted) {
      badgeText = 'Menunggu Verifikasi';
      badgeBg = '#EFF6FF';
      badgeColor = '#1D4ED8';
      badgeBorder = '#BFDBFE';
    } else if (metrics.status === 'Data Tidak Seimbang') {
      badgeText = 'Data Tidak Seimbang';
      badgeBg = '#FEF2F2';
      badgeColor = '#DC2626';
      badgeBorder = '#FECACA';
    } else if (metrics.status === 'Siap Review') {
      badgeText = 'Siap Review';
      badgeBg = '#F0FDF4';
      badgeColor = '#15803D';
      badgeBorder = '#BBF7D0';
    } else if (metrics.status === 'Sedang Diperiksa') {
      badgeText = 'Sedang Diperiksa';
      badgeBg = '#FEF3C7';
      badgeColor = '#B45309';
      badgeBorder = '#FDE68A';
    }

    return `
                    <!-- CARD DOKUMEN INDUK SELEKSI III (COLLAPSED BY DEFAULT) -->
                    <div class="card-pre-grafting-doc card-parent-doc card-seleksi3-doc" id="selection-parent-${esc(doc.id)}" data-id="${esc(doc.id)}" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); display: flex; flex-direction: column; gap: 10px;">
                      
                      <!-- 1. PROGRAM PEMBIBITAN (PALING ATAS) & STATUS BADGE -->
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                        <div>
                          <div style="font-size: 0.62rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">Program Pembibitan</div>
                          <div style="font-weight: 800; font-size: 0.90rem; color: #0F172A; margin-top: 1px;">
                            ${esc(doc.programCode || doc.programName || '-')}
                          </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                          <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">
                            ${badgeText}
                          </span>
                          <span style="font-size: 0.62rem; color: #94A3B8;">${executions.length} Sesi Transaksi</span>
                        </div>
                      </div>

                      <!-- 2. DOKUMEN SELEKSI & 3. SUMBER SELEKSI II -->
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px;">
                        <div>
                          <div style="font-size: 0.62rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Dokumen Seleksi</div>
                          <div style="font-weight: 800; font-size: 0.90rem; color: #116834; margin-top: 1px;">
                            Seleksi III — ${esc(doc.docNo || doc.selectionDocNo)}
                          </div>
                        </div>
                        <div style="text-align: right;">
                          <div style="font-size: 0.62rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Sumber Seleksi II</div>
                          <div style="font-weight: 700; font-size: 0.82rem; color: #0F172A; margin-top: 1px;">
                            ${esc(doc.sourceSelectionDocNo || doc.sourceDocNo || '-')}
                          </div>
                        </div>
                      </div>

                      <!-- 4. BATCH & BEDENGAN -->
                      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; color: #475569; padding: 0 2px;">
                        <div>Batch: <strong style="color: #0F172A;">${esc(doc.batchCode || doc.batchNo || '-')}</strong> • Klon: <strong style="color: #0F172A;">${esc(doc.clone || doc.klon || '-')}</strong></div>
                        <div>Bedengan: <strong style="color: #0F172A;">${esc(bedDisplay)}</strong></div>
                      </div>

                      <!-- 5. POPULASI PEMERIKSAAN DENGAN VISUAL PROGRESS BAR -->
                      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                          <span style="font-size: 0.62rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px;">Populasi Pemeriksaan</span>
                          <div style="text-align: right;">
                            <div style="font-size: 0.92rem; font-weight: 800; color: #0F172A; line-height: 1.2;">
                              ${totalInspectedPolybag.toLocaleString('id-ID')} / ${sourcePolybag.toLocaleString('id-ID')}
                            </div>
                            <div style="font-size: 0.68rem; font-weight: 600; color: #64748B; line-height: 1.2;">Diperiksa</div>
                          </div>
                        </div>

                        <!-- PROGRESS BAR VISUAL HORIZONTAL FULL-WIDTH -->
                        <div style="background: #E2E8F0; border-radius: 999px; height: 8px; width: 100%; overflow: hidden;">
                          <div style="background: ${progressPercent >= 100 ? (metrics.balanceValid ? '#15803D' : '#DC2626') : '#116834'}; height: 100%; width: ${Math.min(100, Math.max(0, progressPercent))}%; border-radius: 999px; transition: width 0.3s ease;"></div>
                        </div>

                        <!-- TEKS PENDUKUNG: PERSENTASE + SISA -->
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.70rem;">
                          <span style="font-weight: 700; color: ${progressPercent >= 100 ? (metrics.balanceValid ? '#15803D' : '#DC2626') : '#116834'};">${formattedProgress}</span>
                          <span style="font-weight: 600; color: ${remainingPolybag === 0 ? (metrics.balanceValid ? '#15803D' : '#DC2626') : '#94A3B8'};">
                            ${remainingPolybag === 0 ? (metrics.balanceValid ? '✓ Selesai' : '⚠️ Tidak Seimbang') : 'Sisa ' + remainingPolybag.toLocaleString('id-ID') + ' Bibit'}
                          </span>
                        </div>
                      </div>

                      <!-- 6. STATUS / ACTION -->
                      ${metrics.seleksiValidUntukSelesai ? `
                        <div style="padding: 6px 10px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; font-size: 0.74rem; color: #166534; font-weight: 700; text-align: center;">
                          ✓ Seluruh populasi telah diperiksa & seimbang
                        </div>
                      ` : (metrics.pemeriksaanSelesai && (!metrics.balanceValid || metrics.belumDiklasifikasikan > 0)) ? `
                        <div style="padding: 6px 10px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; font-size: 0.74rem; color: #DC2626; font-weight: 700; text-align: center;">
                          ⚠️ Data Tidak Seimbang (Belum diklasifikasikan: ${metrics.belumDiklasifikasikan.toLocaleString('id-ID')} Pkk)
                        </div>
                      ` : (!isApproved && !isSubmitted) ? `
                        <button type="button" class="btn-execute-seleksi3" data-id="${esc(doc.id)}" style="width: 100%; height: 36px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(17,104,52,0.15);">
                          Rekam Data Seleksi III
                        </button>
                      ` : ''}

                      <!-- 7. KONTROL EXPAND/COLLAPSE DOKUMEN INDUK -->
                      <div>
                        <button type="button" class="btn-toggle-parent-detail" data-target="selection-detail-${esc(doc.id)}" style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 6px; width: 100%; padding: 6px 10px; font-size: 0.74rem; font-weight: 700; color: #116834; cursor: pointer; display: flex; align-items: center; justify-content: space-between; box-sizing: border-box;">
                          <span class="text-parent-toggle">Lihat Detail</span>
                          <svg class="icon-parent-toggle" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" style="transition: transform 0.2s ease;">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                      </div>

                      <!-- 8. EXPANDED DETAIL DOKUMEN INDUK -->
                      <div class="parent-detail-content" id="selection-detail-${esc(doc.id)}" style="display: none; border-top: 1px dashed #CBD5E1; padding-top: 10px; flex-direction: column; gap: 10px;">
                        
                        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px 12px; font-size: 0.74rem; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px;">
                          <div>Estate: <strong style="color: #0F172A;">${esc(doc.estateName || doc.estateId || '-')}</strong></div>
                          <div>Divisi: <strong style="color: #0F172A;">${esc(doc.divisionName || doc.divisionId || '-')}</strong></div>
                          <div>Tahap: <strong style="color: #0F172A;">Seleksi III (Pra-Okulasi)</strong></div>
                          <div>Klon: <strong style="color: #0F172A;">${esc(doc.clone || doc.klon || '-')}</strong></div>
                        </div>

                        <!-- 6-KOLOM METRIK LENGKAP SELEKSI III -->
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; text-align: center;">
                          <div style="border-right: 1px solid #E2E8F0; padding-right: 4px;">
                            <div style="font-size: 0.58rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Total Populasi</div>
                            <div style="font-size: 0.86rem; font-weight: 800; color: #0F172A; line-height: 1.2; margin-top: 1px;">${sourcePolybag.toLocaleString('id-ID')}</div>
                            <div style="font-size: 0.58rem; color: #94A3B8;">Ply / Pkk</div>
                          </div>
                          <div style="border-right: 1px solid #E2E8F0; padding: 0 4px;">
                            <div style="font-size: 0.58rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Total Diperiksa</div>
                            <div style="font-size: 0.86rem; font-weight: 800; color: #0F172A; line-height: 1.2; margin-top: 1px;">${totalInspectedPolybag.toLocaleString('id-ID')}</div>
                            <div style="font-size: 0.58rem; color: #94A3B8;">Pkk</div>
                          </div>
                          <div style="padding-left: 4px;">
                            <div style="font-size: 0.58rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Sisa Periksa</div>
                            <div style="font-size: 0.86rem; font-weight: 800; color: ${remainingPolybag > 0 ? '#B45309' : '#15803D'}; line-height: 1.2; margin-top: 1px;">${remainingPolybag.toLocaleString('id-ID')}</div>
                            <div style="font-size: 0.58rem; color: #94A3B8;">Pkk</div>
                          </div>
                        </div>

                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; text-align: center;">
                          <div style="border-right: 1px solid #E2E8F0; padding-right: 4px;">
                            <div style="font-size: 0.58rem; font-weight: 700; color: #15803D; text-transform: uppercase;">Bibit Layak</div>
                            <div style="font-size: 0.86rem; font-weight: 800; color: #15803D; line-height: 1.2; margin-top: 1px;">${totalLayak.toLocaleString('id-ID')}</div>
                            <div style="font-size: 0.58rem; color: #15803D;">Pkk</div>
                          </div>
                          <div style="border-right: 1px solid #E2E8F0; padding: 0 4px;">
                            <div style="font-size: 0.58rem; font-weight: 700; color: #DC2626; text-transform: uppercase;">Bibit Reject</div>
                            <div style="font-size: 0.86rem; font-weight: 800; color: #DC2626; line-height: 1.2; margin-top: 1px;">${totalAfkir.toLocaleString('id-ID')}</div>
                            <div style="font-size: 0.58rem; color: #DC2626;">Pkk</div>
                          </div>
                          <div style="padding-left: 4px;">
                            <div style="font-size: 0.58rem; font-weight: 700; color: ${metrics.belumDiklasifikasikan > 0 ? '#DC2626' : '#64748B'}; text-transform: uppercase;">Belum Diklasifikasi</div>
                            <div style="font-size: 0.86rem; font-weight: 800; color: ${metrics.belumDiklasifikasikan > 0 ? '#DC2626' : '#0F172A'}; line-height: 1.2; margin-top: 1px;">${metrics.belumDiklasifikasikan.toLocaleString('id-ID')}</div>
                            <div style="font-size: 0.58rem; color: ${metrics.belumDiklasifikasikan > 0 ? '#DC2626' : '#94A3B8'};">Pkk</div>
                          </div>
                        </div>

                        <!-- STATUS BALANCE BAR -->
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem; padding: 6px 10px; background: ${metrics.balanceValid ? '#F0FDF4' : '#FEF2F2'}; border: 1px solid ${metrics.balanceValid ? '#BBF7D0' : '#FECACA'}; border-radius: 6px;">
                          <span style="font-weight: 600; color: ${metrics.balanceValid ? '#166534' : '#991B1B'};">Status Balance:</span>
                          <span style="font-weight: 800; color: ${metrics.balanceValid ? '#15803D' : '#DC2626'};">${metrics.balanceValid ? 'VALID (Seimbang) ✅' : 'TIDAK VALID (Mismatch) ❌'}</span>
                        </div>

                        ${isReturned && doc.returnReason ? `
                          <div style="padding: 8px 10px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; font-size: 0.72rem; color: #991B1B;">
                            <strong>Catatan Pengembalian Asisten:</strong> ${esc(doc.returnReason)}
                          </div>
                        ` : ''}

                        <!-- TOMBOL WORKFLOW PADA DOKUMEN INDUK -->
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                          ${!isApproved && !isSubmitted ? `
                            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.76rem; color: ${metrics.seleksiValidUntukSelesai ? '#1E293B' : '#94A3B8'}; cursor: ${metrics.seleksiValidUntukSelesai ? 'pointer' : 'not-allowed'}; user-select: none; font-weight: 600; padding: 4px 0;" title="${!metrics.seleksiValidUntukSelesai ? 'Seluruh populasi harus diperiksa dan balance valid untuk menyelesaikan Seleksi III' : ''}">
                              <input type="checkbox" class="chk-doc-completed" data-id="${esc(doc.id)}" ${isCompleted && metrics.seleksiValidUntukSelesai ? 'checked' : ''} ${!metrics.seleksiValidUntukSelesai ? 'disabled' : ''} style="width: 16px; height: 16px; cursor: ${metrics.seleksiValidUntukSelesai ? 'pointer' : 'not-allowed'}; accent-color: #116834;">
                              <span>Seleksi Selesai</span>
                              <span style="font-size: 0.68rem; color: ${metrics.seleksiValidUntukSelesai ? '#64748B' : '#DC2626'}; font-weight: normal;">
                                ${metrics.seleksiValidUntukSelesai ? '(Centang jika Seleksi III Selesai)' : (metrics.pemeriksaanSelesai ? '(Data tidak seimbang)' : `(Belum selesai, sisa ${remainingPolybag.toLocaleString('id-ID')} Pkk)`)}
                              </span>
                            </label>
                          ` : ''}

                          ${isCompleted && metrics.seleksiValidUntukSelesai && !isSubmitted && !isApproved ? `
                            <button type="button" class="btn-open-review-modal" data-id="${esc(doc.id)}" style="width: 100%; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 1px 2px rgba(17,104,52,0.2);">
                              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none">
                                <polyline points="9 11 12 14 22 4"></polyline>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                              </svg>
                              Tinjau & Kirim ke Asisten Bibitan
                            </button>
                          ` : ''}

                          ${isSubmitted ? `
                            <button type="button" class="btn-open-review-modal" data-id="${esc(doc.id)}" style="width: 100%; height: 34px; background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; border-radius: 6px; font-weight: 600; font-size: 0.76rem; cursor: pointer;">
                              Lihat Rincian Verifikasi Data
                            </button>
                          ` : ''}

                          ${isApproved ? `
                            <div style="padding: 6px 10px; background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 6px; font-size: 0.72rem; color: #166534;">
                              ✅ <strong>Data Final:</strong> Disetujui oleh ${esc(doc.verifiedByName || 'Asisten Bibitan')} pada ${doc.verifiedAt ? formatDate(doc.verifiedAt) : '-'}.
                            </div>
                          ` : ''}

                        </div>

                      </div><!-- END parent-detail-content -->

                    </div><!-- END card-parent-doc -->
                  `;
                }).join('')}
              </div>

              <!-- GLOBAL CONTAINER RINGKASAN TRANSAKSI PELAKSANAAN SELEKSI III -->
              ${(() => {
                const allRawTxs = storage.get(SELECTION_STORAGE_KEY, []);
                const allSeleksi3Txs = allRawTxs.filter(tx => {
                  const isStage3 = (
                    tx.selectionStage === SELECTION_STAGES.SELEKSI_3 ||
                    tx.stage === 'SELEKSI_III' ||
                    tx.stage === 'SELEKSI_3' ||
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

                return `
                  <div class="section-global-child-transactions" style="margin-top: 20px; padding-top: 14px; border-top: 2px solid #E2E8F0;">
                    <div style="margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                      <h2 style="font-size: 0.92rem; font-weight: 800; color: #0F172A; margin: 0;">
                        Ringkasan Transaksi (${allSeleksi3Txs.length})
                      </h2>
                    </div>

                    ${allSeleksi3Txs.length === 0 ? renderEmptyStateCard({
                      title: 'Belum ada transaksi pelaksanaan',
                      description: 'Belum ada pemeriksaan yang dicatat untuk Seleksi III.'
                    }) : `
                      <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${allSeleksi3Txs.map((tx, txIdx) => {
                          const parentDoc = seleksi3Docs.find(d => 
                            d.id === tx.parentSelectionDocumentId || 
                            d.id === tx.selectionDocumentId ||
                            d.docNo === tx.parentSelectionDocNo ||
                            d.docNo === tx.selectionDocNo ||
                            d.docNo === tx.sourceDocNo
                          ) || {};
                          const polyChecked = tx.polybagScope || tx.initialPolybagCount || 0;
                          const bibitLayak = tx.bibitDipertahankan || tx.jumlahLayak || 0;
                          const bibitAfkir = tx.bibitReject || tx.jumlahAfkir || 0;
                          const bibitAwal = tx.bibitAwal || tx.jumlahDiperiksa || (bibitLayak + bibitAfkir);
                          const isBalanced = (bibitLayak + bibitAfkir === bibitAwal);
                          const isParentApprovedOrSubmitted = parentDoc.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI || parentDoc.status === 'DIAJUKAN' || parentDoc.status === SELECTION_STATUS.DISETUJUI;

                          return `
                            <!-- CARD TRANSAKSI GLOBAL (DEFAULT: COLLAPSED) -->
                            <div class="card-child-tx" data-tx-id="${esc(tx.id)}" data-doc-no="${esc(tx.docNo)}" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                              
                              <!-- HEADER ROW TRANSAKSI -->
                              <div class="btn-toggle-child-tx" style="display: flex; justify-content: space-between; align-items: center; gap: 8px; cursor: pointer; user-select: none;">
                                <div style="flex: 1; min-width: 0;">
                                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                    <span style="font-weight: 800; color: #116834; font-size: 0.80rem;">Seleksi III</span>
                                    <span style="color: #64748B; font-size: 0.72rem;">• Transaksi #${txIdx + 1} (${esc(tx.docNo)})</span>
                                    <span style="background: #F1F5F9; color: #475569; font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 4px;">${esc(tx.bedenganCode || tx.bedengan || '-')}</span>
                                  </div>
                                  <div style="color: #64748B; font-size: 0.72rem; margin-top: 3px;">
                                    ${esc(tx.tanggalSeleksi || tx.tanggal || '-')} • <strong style="color: #0F172A;">${polyChecked.toLocaleString('id-ID')} Polybag (${bibitAwal.toLocaleString('id-ID')} Bibit)</strong> • Dok. <strong style="color: #334155;">${esc(parentDoc.docNo || tx.parentSelectionDocNo || tx.selectionDocNo || '-')}</strong>
                                  </div>
                                </div>
                                
                                <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                                  <span style="font-size: 0.65rem; font-weight: 700; color: #15803D; background: #F0FDF4; border: 1px solid #BBF7D0; padding: 2px 6px; border-radius: 4px;">
                                    Selesai
                                  </span>
                                  <svg class="icon-child-toggle" viewBox="0 0 24 24" width="14" height="14" stroke="#64748B" stroke-width="2.5" fill="none" style="transition: transform 0.2s ease;">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                  </svg>
                                </div>
                              </div>

                              <!-- DETAIL TRANSAKSI EXPANDED -->
                              <div class="child-tx-detail-content" style="display: none; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #E2E8F0;">
                                
                                <!-- CONTEXT METADATA -->
                                <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; font-size: 0.72rem; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; margin-bottom: 8px;">
                                  <div>Program: <strong style="color: #0F172A;">${esc(parentDoc.programCode || parentDoc.programName || tx.programCode || '-')}</strong></div>
                                  <div>Dokumen Induk: <strong style="color: #0F172A;">${esc(parentDoc.docNo || tx.parentSelectionDocNo || tx.selectionDocNo || '-')}</strong></div>
                                  <div>Sumber Seleksi II: <strong style="color: #0F172A;">${esc(parentDoc.sourceSelectionDocNo || parentDoc.sourceDocNo || tx.sourceSelectionDocNo || '-')}</strong></div>
                                  <div>Bedengan: <strong style="color: #0F172A;">${esc(tx.bedenganCode || tx.bedengan || '-')}</strong></div>
                                  <div>Tanggal Transaksi: <strong style="color: #0F172A;">${esc(tx.tanggalSeleksi || tx.tanggal || '-')}</strong></div>
                                  <div>Status: <strong style="color: #15803D;">Selesai</strong></div>
                                </div>

                                <!-- METRICS HASIL BIBIT SELEKSI III -->
                                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; font-size: 0.70rem; margin-bottom: 8px; text-align: center; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 4px;">
                                  <div>Bibit Awal: <strong style="color: #0F172A;">${bibitAwal.toLocaleString('id-ID')}</strong></div>
                                  <div>Layak: <strong style="color: #15803D;">${bibitLayak.toLocaleString('id-ID')}</strong></div>
                                  <div>Reject: <strong style="color: #DC2626;">${bibitAfkir.toLocaleString('id-ID')}</strong></div>
                                  <div>Balance: <strong style="color: #15803D;">${isBalanced ? 'BALANCE ✅' : 'MISMATCH ❌'}</strong></div>
                                </div>

                                <!-- PENCATAT & CATATAN -->
                                <div style="font-size: 0.68rem; color: #64748B; display: flex; flex-direction: column; gap: 2px; margin-bottom: 6px;">
                                  <div>Pencatat: <strong>${esc(tx.createdByName || tx.createdByUserId || 'Mantri')}</strong> (${esc(tx.createdByRole || 'MANTRI_TANAMAN')})</div>
                                  ${tx.catatan && tx.catatan !== '-' ? `<div>Catatan: <em>${esc(tx.catatan)}</em></div>` : ''}
                                </div>

                                <!-- ACTION DELETE -->
                                ${!isParentApprovedOrSubmitted ? `
                                  <div style="display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid #F1F5F9; padding-top: 6px; margin-top: 6px;">
                                    <button type="button" class="btn-delete-child-tx" data-stage="SELEKSI_3" data-stage-label="Seleksi III" data-tx-id="${esc(tx.id)}" data-doc-no="${esc(tx.docNo)}" style="padding: 4px 10px; background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; border-radius: 4px; font-size: 0.70rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px;">
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
              })()}
            `}
          `}
        ` : activeMantriTab === 'PRE_SOWING' ? `
          <!-- VIEW: BIBIT AFKIR PRA-SEMAI (DEDERAN) -->
          ${renderAfkirPoolList(preSowingSelectionPool, preSowingCulledTxs, 'Belum Ada Data Afkir Dederan', 'Data afkir dederan akan muncul saat terdapat bibit yang tidak berhasil pada pemeriksaan dederan.', 'Daftar Bibit Afkir Pra-Semai (Dederan)', today)}
        ` : `
          <!-- VIEW: BIBIT AFKIR PASCA-OKULASI -->
          ${renderAfkirPoolList(postGraftingSelectionPool, postGraftingCulledTxs, 'Belum Ada Data Afkir Pasca-Okulasi', 'Data bibit afkir akan muncul saat terdapat bibit yang ditolak pada transaksi Okulasi, Pemeriksaan Okulasi, atau Regrafting.', 'Daftar Bibit Afkir Pasca-Okulasi', today)}
        `}

      </main>
    </div>
  `;

  // Back button
  app.querySelector('#btn-back')?.addEventListener('click', () => navigate('/home'));

  // Main Tab switching
  app.querySelector('#tab-mantri-pre-grafting')?.addEventListener('click', () => {
    activeMantriTab = 'PRE_GRAFTING';
    renderMantriSelectionLanding(app, user);
  });

  app.querySelector('#tab-mantri-pre-sowing')?.addEventListener('click', () => {
    activeMantriTab = 'PRE_SOWING';
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

  // Action: Create Dokumen Seleksi II from FINAL Seleksi I
  app.querySelectorAll('.btn-create-seleksi2').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const docId = e.currentTarget.dataset.id;
      try {
        const newSel2Doc = createSelection2DocumentFromSelection1(docId, user);
        toast(`Dokumen Seleksi II (${newSel2Doc.docNo}) berhasil dibuat dari hasil final Seleksi I.`, 'success');
        activePreGraftingTab = 'SELEKSI_2';
        renderMantriSelectionLanding(app, user);
      } catch (err) {
        toast(err.message || 'Gagal membuat Dokumen Seleksi II', 'error');
      }
    });
  });

  // Action: Switch to Seleksi II tab to view created Seleksi II document
  app.querySelectorAll('.btn-view-seleksi2').forEach(btn => {
    btn.addEventListener('click', () => {
      activePreGraftingTab = 'SELEKSI_2';
      renderMantriSelectionLanding(app, user);
    });
  });

  // Action: Create Dokumen Seleksi III from FINAL Seleksi II
  app.querySelectorAll('.btn-create-seleksi3').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const docId = e.currentTarget.dataset.id;
      try {
        const newSel3Doc = createSelection3DocumentFromSelection2(docId, user);
        toast(`Dokumen Seleksi III (${newSel3Doc.docNo}) berhasil dibuat dari hasil final Seleksi II.`, 'success');
        activePreGraftingTab = 'SELEKSI_3';
        renderMantriSelectionLanding(app, user);
      } catch (err) {
        toast(err.message || 'Gagal membuat Dokumen Seleksi III', 'error');
      }
    });
  });

  // Action: Switch to Seleksi III tab to view created Seleksi III document
  app.querySelectorAll('.btn-view-seleksi3').forEach(btn => {
    btn.addEventListener('click', () => {
      activePreGraftingTab = 'SELEKSI_3';
      renderMantriSelectionLanding(app, user);
    });
  });

  // Toggle Parent Document Detail Expand/Collapse (TASK-29 INDEPENDENT)
  app.querySelectorAll('.btn-toggle-parent-detail').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = e.currentTarget.dataset.target;
      if (!targetId) return;
      const detailContent = document.getElementById(targetId);
      const textSpan = e.currentTarget.querySelector('.text-parent-toggle');
      const icon = e.currentTarget.querySelector('.icon-parent-toggle');
      if (!detailContent) return;

      const isExpanded = detailContent.style.display !== 'none';
      if (isExpanded) {
        detailContent.style.display = 'none';
        if (textSpan) textSpan.textContent = 'Lihat Detail';
        if (icon) icon.style.transform = 'rotate(0deg)';
      } else {
        detailContent.style.display = 'flex';
        if (textSpan) textSpan.textContent = 'Sembunyikan Detail';
        if (icon) icon.style.transform = 'rotate(180deg)';
      }
    });
  });

  // Toggle Child Transaction Detail Expand/Collapse (TASK-26)
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

  // Delete Child Transaction with Dependency Guard (TASK-26)
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

  // Execute Seleksi I button
  app.querySelectorAll('.btn-execute-seleksi1').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const docId = e.currentTarget.dataset.id;
      const targetDoc = preGraftingDocs.find(d => d.id === docId);
      if (!targetDoc) return;

      openSeleksi1ExecutionModal({
        doc: targetDoc,
        user,
        onSaved: () => {
          renderMantriSelectionLanding(app, user);
        }
      });
    });
  });

  // Execute Seleksi II button
  app.querySelectorAll('.btn-execute-seleksi2').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const docId = e.currentTarget.dataset.id;
      const targetDoc = preGraftingDocs.find(d => d.id === docId);
      if (!targetDoc) return;

      openSeleksi2ExecutionModal({
        doc: targetDoc,
        user,
        onSaved: () => {
          renderMantriSelectionLanding(app, user);
        }
      });
    });
  });

  // Execute Seleksi III button
  app.querySelectorAll('.btn-execute-seleksi3').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const docId = e.currentTarget.dataset.id;
      const targetDoc = preGraftingDocs.find(d => d.id === docId);
      if (!targetDoc) return;

      openSeleksi3ExecutionModal({
        doc: targetDoc,
        user,
        onSaved: () => {
          renderMantriSelectionLanding(app, user);
        }
      });
    });
  });

  // Completion checkbox listener (Scope 1, 2 & 3)
  app.querySelectorAll('.chk-doc-completed').forEach(chk => {
    chk.addEventListener('change', (e) => {
      const docId = e.currentTarget.dataset.id;
      const isChecked = e.currentTarget.checked;
      const targetDoc = preGraftingDocs.find(d => d.id === docId);
      const isStage3 = targetDoc && (
        targetDoc.selectionStage === SELECTION_STAGES.SELEKSI_3 ||
        targetDoc.selectionStage === 'SELEKSI_III' ||
        targetDoc.selectionStage === 'SELEKSI_3'
      );
      const isStage2 = targetDoc && (
        targetDoc.selectionStage === SELECTION_STAGES.SELEKSI_2 ||
        targetDoc.selectionStage === 'SELEKSI_II' ||
        targetDoc.selectionStage === 'SELEKSI_2'
      );
      const stageLabel = isStage3 ? 'Seleksi III' : (isStage2 ? 'Seleksi II' : 'Seleksi I');
      try {
        setPreGraftingSelectionDocumentCompletion(docId, isChecked, user);
        toast(`Dokumen ${stageLabel} ${isChecked ? 'dinyatakan Selesai.' : 'diubah menjadi Belum Selesai.'}`, 'info');
        renderMantriSelectionLanding(app, user);
      } catch (err) {
        e.currentTarget.checked = !isChecked; // revert on error
        toast(err.message || 'Gagal mengubah status selesai dokumen', 'error');
      }
    });
  });

  // Review & Submit modal trigger (Scope 3 & 4)
  app.querySelectorAll('.btn-open-review-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const docId = e.currentTarget.dataset.id;
      const targetDoc = preGraftingDocs.find(d => d.id === docId);
      if (!targetDoc) return;

      openPreGraftingReviewModal({
        doc: targetDoc,
        user,
        onSubmitted: () => {
          renderMantriSelectionLanding(app, user);
        }
      });
    });
  });

  // Declaration flow
  app.querySelectorAll('.btn-deklarasi-afkir').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const poolId = e.currentTarget.dataset.poolId;
      const targetPoolItem = scopedPool.find(s => (s.id && s.id === poolId) || (s.docNo && s.docNo === poolId));
      if (!targetPoolItem) return;

      if (targetPoolItem.status === 'DECLARED_CULLED') {
        toast('Hasil seleksi ini sudah pernah dideklarasikan.', 'info');
        return;
      }

      const displayDocNo = standardizeSelectionDocNo(targetPoolItem.docNo, 1);

      // STEP 1: Modal Konfirmasi
      openSelectionConfirmationModal({
        item: targetPoolItem,
        displayDocNo,
        user,
        onConfirm: () => {
          // STEP 2: Kamera
          openSelectionCameraModal({
            item: targetPoolItem,
            displayDocNo,
            user,
            onCaptureCancel: () => {
              toast('Pengambilan foto dokumentasi dibatalkan. Deklarasi belum disimpan.', 'info');
            },
            onCaptureSuccess: (photoResult) => {
              try {
                const res = declareSelectionItem(targetPoolItem, photoResult, user);
                if (res.isNew) {
                  toast(`Pengurangan stok seleksi ${getSelectionCategoryLabel(targetPoolItem)} (${res.transaction.docNo}) berhasil dideklarasikan dan dokumentasi tersimpan.`, 'success');
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
          <div style="font-size: 0.62rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Polybag</div>
          <div style="font-size: 0.95rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${sourcePolybag.toLocaleString('id-ID')}</div>
          <div style="font-size: 0.60rem; color: #94A3B8;">Ply</div>
        </div>
        <div style="border-left: 1px solid #E2E8F0;">
          <div style="font-size: 0.62rem; font-weight: 700; color: #64748B; text-transform: uppercase;">${isSeleksi2 || isSeleksi3 ? 'Bibit Sumber' : 'Bibit Awal'}</div>
          <div style="font-size: 0.95rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${sourceBibit.toLocaleString('id-ID')}</div>
          <div style="font-size: 0.60rem; color: #94A3B8;">Pkk</div>
        </div>
        <div style="border-left: 1px solid #E2E8F0;">
          <div style="font-size: 0.62rem; font-weight: 700; color: #15803D; text-transform: uppercase;">Dipertahankan</div>
          <div style="font-size: 0.95rem; font-weight: 800; color: #15803D; margin-top: 2px;">${totalLayak.toLocaleString('id-ID')}</div>
          <div style="font-size: 0.60rem; color: #15803D;">${isSeleksi2 ? 'Pkk (1/Ply)' : 'Pkk'}</div>
        </div>
        <div style="border-left: 1px solid #E2E8F0;">
          <div style="font-size: 0.62rem; font-weight: 700; color: #DC2626; text-transform: uppercase;">Reject ${stageLabel}</div>
          <div style="font-size: 0.95rem; font-weight: 800; color: #DC2626; margin-top: 2px;">${totalAfkir.toLocaleString('id-ID')}</div>
          <div style="font-size: 0.60rem; color: #DC2626;">Pkk</div>
        </div>
      </div>

      <!-- DETAIL PER SESI TRANSAKSI -->
      <div style="margin-bottom: 14px;">
        <div style="font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 6px;">
          Rincian Transaksi Pelaksanaan ${stageLabel}:
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px; max-height: 180px; overflow-y: auto;">
          ${executions.map((tx, idx) => `
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; font-size: 0.72rem; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div><strong>${idx + 1}. Bedengan ${esc(tx.bedenganCode || '-')}</strong> (${esc(tx.docNo)})</div>
                <div style="color: #64748B; font-size: 0.66rem; margin-top: 2px;">
                  Scope: ${tx.polybagScope || tx.initialPolybagCount || 0} Ply ${isSeleksi3 ? `(${tx.bibitAwal || 0} Pkk)` : (isSeleksi2 ? `(${tx.polybag2Bibit || 0}x2→1, ${tx.polybag1Bibit || 0}x1→1, ${tx.polybag0Bibit || 0}x0)` : `(${tx.polybag2Bibit || 0}x2, ${tx.polybag1Bibit || 0}x1, ${tx.polybag0Bibit || 0}x0)`)} • ${esc(tx.tanggalSeleksi || tx.tanggal)}
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: 700; color: #15803D;">+${(tx.bibitDipertahankan || tx.jumlahLayak || 0).toLocaleString('id-ID')} Pkk</div>
                <div style="font-size: 0.65rem; color: #DC2626;">-${(tx.bibitReject || tx.jumlahAfkir || 0).toLocaleString('id-ID')} Reject</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- ACTION BUTTONS -->
      <div style="display: flex; gap: 8px;">
        <button id="btn-close-review" type="button" style="flex: 1; height: 38px; background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; border-radius: 6px; font-weight: 600; cursor: pointer;">
          Tutup
        </button>
        ${!isSubmitted && !isApproved ? `
          <button id="btn-confirm-submit-asb" type="button" style="flex: 1.8; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; box-shadow: 0 1px 3px rgba(17,104,52,0.25);">
            Kirim ke Asisten Bibitan
          </button>
        ` : ''}
      </div>

    </div>
  `;

  openModal({
    title: `Verifikasi Data ${stageLabel} (Mantri)`,
    body: modalBody
  });

  document.getElementById('btn-close-review')?.addEventListener('click', closeModal);

  document.getElementById('btn-confirm-submit-asb')?.addEventListener('click', () => {
    try {
      submitPreGraftingSelectionDocumentToAsisten(doc.id, user);
      closeModal();
      toast(`Dokumen ${stageLabel} (${doc.docNo}) berhasil diajukan ke Asisten Bibitan untuk verifikasi.`, 'success');
      if (onSubmitted) onSubmitted();
    } catch (err) {
      toast(err.message || 'Gagal mengajukan dokumen ke Asisten', 'error');
    }
  });
}

/**
 * Render reusable pool and history list for Afkir declarations
 */
function renderAfkirPoolList(poolItems, culledItems, emptyTitle, emptyDesc, poolTitle, today) {
  return `
    ${poolItems.length > 0 ? `
      <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
        <h2 style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin: 0;">${poolTitle} (${poolItems.length})</h2>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
        ${poolItems.map((item, idx) => {
          const isDeclared = item.status === 'DECLARED_CULLED';
          const displayDocNo = item.docNo || formatStandardDocNo(2026, 'CULL', idx + 1);
          const sourceLabel = getSelectionSourceLabel(item);
          const categoryLabel = getSelectionCategoryLabel(item);
          const batchDisplay = item.batchCode || item.batchNo || (item.originType === 'REJECT_DEDERAN' ? (item.bedenganCode || 'Bedengan Dederan') : 'Batch');
          const sourceDocNo = item.sourceDocNo || item.dederanDocNo || item.seedingDocNo || item.buddingDocNo || item.inspectionDocNo || '-';
          const bedenganDisplay = formatBedenganDisplayCode(item);
          const programDisplay = item.programCode || item.programName || item.program || '-';
          const qtyAfkir = parseInt(item.jumlahAfkir || item.quantity || 0, 10);
          const unit = item.originType === 'REJECT_DEDERAN' ? 'Butir' : 'Pkk';

          let categoryBadgeBg = '#FEF2F2';
          let categoryBadgeColor = '#DC2626';
          let categoryBadgeBorder = '#FECACA';
          if (categoryLabel === 'Mati') {
            categoryBadgeBg = '#FFF1F2';
            categoryBadgeColor = '#BE123C';
            categoryBadgeBorder = '#FFE4E6';
          } else if (categoryLabel === 'Lainnya') {
            categoryBadgeBg = '#F1F5F9';
            categoryBadgeColor = '#475569';
            categoryBadgeBorder = '#CBD5E1';
          }

          return `
            <div class="card-selection-wrapper" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); display: flex; flex-direction: column; box-sizing: border-box;">
              
              <!-- 1. HEADER CARD: BATCH (KIRI) & BADGES (KANAN) -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">
                <div style="min-width: 0;">
                  <div style="font-weight: 800; font-size: 0.95rem; color: #0F172A; letter-spacing: -0.01em; word-break: break-word;">
                    ${esc(batchDisplay)}
                  </div>
                </div>
                <div style="display: flex; gap: 4px; flex-wrap: wrap; align-items: center; justify-content: flex-end;">
                  <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; background: ${categoryBadgeBg}; color: ${categoryBadgeColor}; border: 1px solid ${categoryBadgeBorder}; white-space: nowrap;">
                    ${esc(categoryLabel)}
                  </span>
                  <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; background: ${isDeclared ? '#F0FDF4' : '#FEF2F2'}; color: ${isDeclared ? '#15803D' : '#DC2626'}; border: 1px solid ${isDeclared ? '#BBF7D0' : '#FECACA'}; white-space: nowrap;">
                    ${isDeclared ? 'Telah Dikurangi' : 'Perlu Deklarasi'}
                  </span>
                </div>
              </div>

              <!-- 2. INFORMASI SUMBER (COMPACT 1-BARIS) -->
              <div style="font-size: 0.74rem; color: #64748B; margin-bottom: 8px;">
                Sumber: <strong style="color: #0F172A; font-weight: 700;">${esc(sourceLabel)}</strong>
              </div>

              <!-- 3. INFORMASI REFERENSI COMPACT (GRID 2 KOLOM) -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; padding: 7px 0; border-top: 1px solid #F1F5F9; border-bottom: 1px solid #F1F5F9; margin-bottom: 9px; font-size: 0.74rem;">
                <div style="min-width: 0;">
                  <div style="font-size: 0.66rem; color: #64748B; margin-bottom: 1px;">Bedengan</div>
                  <div style="font-weight: 700; color: #1E293B; word-break: break-word; overflow-wrap: break-word;">
                    ${esc(bedenganDisplay)}
                  </div>
                </div>
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
              </div>

              <!-- 4. PANEL JUMLAH AFKIR (HORIZONTAL & COMPACT) -->
              <div style="background: #FEF2F2; border: 1px solid #FEE2E2; border-radius: 8px; padding: 8px 12px; margin-bottom: 9px; display: flex; justify-content: space-between; align-items: center; gap: 10px; box-sizing: border-box;">
                <div style="min-width: 0; flex: 1;">
                  <div style="font-size: 0.65rem; font-weight: 800; color: #DC2626; text-transform: uppercase; letter-spacing: 0.03em;">
                    BIBIT AFKIR (${categoryLabel.toUpperCase()})
                  </div>
                  <div style="font-size: 0.70rem; color: #4B5563; margin-top: 1px; word-break: break-word; line-height: 1.3;">
                    ${esc(item.alasan || `Bibit ${categoryLabel} saat ${sourceLabel}`)}${sourceDocNo && sourceDocNo !== '-' && !item.alasan?.includes(sourceDocNo) ? ` (${esc(sourceDocNo)})` : ''}
                  </div>
                </div>
                <div style="text-align: right; flex-shrink: 0;">
                  <div style="font-size: 1.30rem; font-weight: 900; color: #DC2626; line-height: 1; letter-spacing: -0.02em;">
                    ${qtyAfkir.toLocaleString('id-ID')}
                  </div>
                  <div style="font-size: 0.68rem; font-weight: 700; color: #991B1B; margin-top: 1px;">
                    ${unit}
                  </div>
                </div>
              </div>

              <!-- 5. TOMBOL DEKLARASI -->
              ${!isDeclared ? `
                <button type="button" class="btn-deklarasi-afkir" data-pool-id="${esc(item.id || item.docNo)}" style="width: 100%; height: 38px; background: #DC2626; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer; box-shadow: 0 1px 2px rgba(220,38,38,0.2); transition: background 0.15s ease;">
                  Deklarasi Bibit Afkir (${qtyAfkir.toLocaleString('id-ID')} ${unit})
                </button>
              ` : ''}
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
        <h2 style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin: 0;">Histori Deklarasi Pengurangan Stok (${culledItems.length})</h2>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${culledItems.map((ctx) => {
          const src = getSelectionSourceLabel(ctx);
          const cat = getSelectionCategoryLabel(ctx);
          const qty = parseInt(ctx.jumlahAfkir || ctx.quantity || 0, 10);
          const bedDisplay = formatBedenganDisplayCode(ctx);
          const unit = ctx.originType === 'REJECT_DEDERAN' ? 'Butir' : 'Pkk';
          return `
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 4px;">
                <div style="min-width: 0;">
                  <div style="font-weight: 800; font-size: 0.88rem; color: #0F172A; word-break: break-word;">
                    ${esc(ctx.batchCode || ctx.batchNo || (ctx.originType === 'REJECT_DEDERAN' ? (ctx.bedenganCode || 'Bedengan Dederan') : 'Batch'))}
                  </div>
                  <div style="font-size: 0.70rem; color: #64748B; margin-top: 1px;">
                    Sumber: <strong style="color: #0F172A;">${esc(src)}</strong> • <span style="color: #DC2626; font-weight: 600;">${esc(cat)}</span>
                  </div>
                </div>
                <div style="text-align: right; flex-shrink: 0;">
                  <span style="font-weight: 900; font-size: 0.95rem; color: #DC2626;">-${qty.toLocaleString('id-ID')}</span>
                  <span style="font-size: 0.68rem; font-weight: 700; color: #991B1B; margin-left: 1px;">${unit}</span>
                </div>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; font-size: 0.70rem; color: #64748B; padding-top: 6px; border-top: 1px solid #F1F5F9;">
                <div>Bedengan: <strong style="color: #334155;">${esc(bedDisplay)}</strong></div>
                <div>Dok. Asal: <strong style="color: #334155;">${esc(ctx.sourceDocNo || '-')}</strong></div>
              </div>
              <div style="font-size: 0.68rem; color: #94A3B8; margin-top: 4px;">
                Pengaju: <strong>${esc(ctx.createdByName || ctx.mantri || user.name)}</strong> • ${esc(ctx.tanggalSeleksi || ctx.tanggal || today)}
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
  const bedScopeList = getBedenganScopeStatusForSeleksi1(doc);

  // Check if any bedengan has remaining uninspected polybag
  const availableBeds = bedScopeList.filter(b => b.remainingPolybag > 0);
  if (bedScopeList.length > 0 && availableBeds.length === 0) {
    toast('Seluruh populasi telah diperiksa.', 'warning');
    return;
  }

  // Find initial bedengan (first one with remaining polybag > 0)
  const initialBed = availableBeds[0] || bedScopeList[0] || {
    bedenganCode: 'BED-001',
    remainingPolybag: doc.sourcePolybagQty || 0,
    initialPolybag: doc.sourcePolybagQty || 0
  };

  const initialRemaining = initialBed.remainingPolybag !== undefined ? initialBed.remainingPolybag : (doc.sourcePolybagQty || 0);

  const bodyContent = `
    <div style="font-size: 0.82rem; color: #334155; line-height: 1.45;">
      
      <!-- HEADER INFO -->
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; font-size: 0.72rem;">
          <div>Dok. Seleksi: <strong style="color: #0F172A;">${esc(doc.docNo)}</strong></div>
          <div>Dok. Asal: <strong style="color: #0F172A;">${esc(doc.sourceDocNo)}</strong></div>
          <div>Batch: <strong style="color: #0F172A;">${esc(doc.batchCode || '-')}</strong></div>
          <div>Klon: <strong style="color: #0F172A;">${esc(doc.clone || doc.klon || '-')}</strong></div>
        </div>
      </div>

      <!-- FORM FIELDS -->
      <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px;">
        
        <!-- PILIH BEDENGAN -->
        <div>
          <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
            Bedengan Pemeriksaan <span style="color: #DC2626;">*</span>
          </label>
          <select id="modal-sel1-bedengan" style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; font-size: 0.80rem; background: #FFFFFF;">
            ${bedScopeList.map(bed => `
              <option value="${esc(bed.bedenganCode)}" data-remaining="${bed.remainingPolybag}" data-initial="${bed.initialPolybag}" ${bed.bedenganCode === initialBed.bedenganCode ? 'selected' : ''}>
                ${esc(bed.bedenganCode)} (Sisa: ${bed.remainingPolybag.toLocaleString('id-ID')} / ${bed.initialPolybag.toLocaleString('id-ID')} Polybag)
              </option>
            `).join('')}
          </select>
        </div>

        <!-- TASK-25: POPULASI TERSEDIA UNTUK DIPERIKSA (READ-ONLY) -->
        <div>
          <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
            Populasi Tersedia untuk Diperiksa
          </label>
          <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 6px; padding: 8px 12px; font-weight: 800; font-size: 0.88rem; color: #0F172A;">
            <span id="modal-sel1-populasi-tersedia-val">${initialRemaining.toLocaleString('id-ID')} Polybag</span>
          </div>
          <input type="hidden" id="modal-sel1-current-remaining" value="${initialRemaining}">
        </div>

        <!-- BREAKDOWN HASIL PER POLIBAG (P2, P1, P0) -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px;">
          <div style="font-size: 0.74rem; font-weight: 800; color: #0F172A; margin-bottom: 8px; text-transform: uppercase;">
            Hasil Seleksi I per Kondisi Polybag:
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <!-- 2 BIBIT / POLYBAG -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="flex: 1;">
                <div style="font-size: 0.74rem; font-weight: 700; color: #15803D;">2 Bibit / Polybag (Normal)</div>
                <div style="font-size: 0.65rem; color: #64748B;">Polybag dengan 2 bibit bertahan</div>
              </div>
              <div style="width: 100px;">
                <input id="modal-sel1-p2" type="number" min="0" value="${initialRemaining}" style="width: 100%; height: 34px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; text-align: right; font-weight: 700; box-sizing: border-box;">
              </div>
            </div>

            <!-- 1 BIBIT / POLYBAG -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="flex: 1;">
                <div style="font-size: 0.74rem; font-weight: 700; color: #D97706;">1 Bibit / Polybag</div>
                <div style="font-size: 0.65rem; color: #64748B;">1 bibit bertahan, 1 bibit reject</div>
              </div>
              <div style="width: 100px;">
                <input id="modal-sel1-p1" type="number" min="0" value="0" style="width: 100%; height: 34px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; text-align: right; font-weight: 700; box-sizing: border-box;">
              </div>
            </div>

            <!-- 0 BIBIT / POLYBAG -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="flex: 1;">
                <div style="font-size: 0.74rem; font-weight: 700; color: #DC2626;">0 Bibit / Polybag (Kosong)</div>
                <div style="font-size: 0.65rem; color: #64748B;">2 bibit reject / mati</div>
              </div>
              <div style="width: 100px;">
                <input id="modal-sel1-p0" type="number" min="0" value="0" style="width: 100%; height: 34px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; text-align: right; font-weight: 700; box-sizing: border-box;">
              </div>
            </div>
          </div>
        </div>

        <!-- LIVE RESULT SUMMARY (TASK-25) -->
        <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px; font-size: 0.74rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px;">
            <div>Diperiksa Sesi Ini (P2+P1+P0): <strong id="modal-summary-session-total" style="color: #0F172A;">${initialRemaining.toLocaleString('id-ID')}</strong> Ply</div>
            <div>Sisa Tersedia: <strong id="modal-summary-rem-target" style="color: #64748B;">${initialRemaining.toLocaleString('id-ID')}</strong> Ply</div>
            <div>Bibit Dipertahankan: <strong id="modal-summary-layak" style="color: #15803D;">${(initialRemaining * 2).toLocaleString('id-ID')}</strong> Pkk</div>
            <div>Bibit Reject: <strong id="modal-summary-reject" style="color: #DC2626;">0</strong> Pkk</div>
          </div>
          <div id="modal-sel1-quota-warning" style="display: none; margin-top: 6px; padding: 6px 8px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 4px; color: #DC2626; font-size: 0.72rem; font-weight: 700;"></div>
        </div>

        <!-- TANGGAL TRANSAKSI (READ-ONLY) & CATATAN -->
        <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 8px;">
          <div>
            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 2px;">Tanggal Transaksi</label>
            <input id="modal-sel1-date" type="text" value="${today}" readonly disabled style="width: 100%; height: 36px; border: 1px solid #E2E8F0; border-radius: 6px; padding: 0 8px; font-size: 0.78rem; background: #F1F5F9; color: #475569; cursor: not-allowed; box-sizing: border-box;">
          </div>
          <div>
            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 2px;">Catatan (Opsional)</label>
            <input id="modal-sel1-notes" type="text" placeholder="Catatan mantri..." style="width: 100%; height: 36px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; font-size: 0.78rem; box-sizing: border-box;">
          </div>
        </div>

      </div>

      <!-- BUTTONS -->
      <div style="display: flex; gap: 8px;">
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

  const selBed = document.getElementById('modal-sel1-bedengan');
  const inputP2 = document.getElementById('modal-sel1-p2');
  const inputP1 = document.getElementById('modal-sel1-p1');
  const inputP0 = document.getElementById('modal-sel1-p0');
  const inputNotes = document.getElementById('modal-sel1-notes');
  const hiddenRemaining = document.getElementById('modal-sel1-current-remaining');
  const labelTersedia = document.getElementById('modal-sel1-populasi-tersedia-val');

  const sumSessionTotal = document.getElementById('modal-summary-session-total');
  const sumRemTarget = document.getElementById('modal-summary-rem-target');
  const sumLayak = document.getElementById('modal-summary-layak');
  const sumReject = document.getElementById('modal-summary-reject');
  const warningEl = document.getElementById('modal-sel1-quota-warning');
  const saveBtn = document.getElementById('btn-modal-save-sel1');

  function updateCalculations() {
    const rem = parseInt(hiddenRemaining?.value || 0, 10);
    const p2 = parseInt(inputP2.value || 0, 10);
    const p1 = parseInt(inputP1.value || 0, 10);
    const p0 = parseInt(inputP0.value || 0, 10);

    const sessionPolybag = p2 + p1 + p0;
    const bibitLayak = (p2 * 2) + (p1 * 1);
    const bibitReject = (p1 * 1) + (p0 * 2);

    if (sumSessionTotal) sumSessionTotal.textContent = sessionPolybag.toLocaleString('id-ID');
    if (sumRemTarget) sumRemTarget.textContent = rem.toLocaleString('id-ID');
    if (sumLayak) sumLayak.textContent = bibitLayak.toLocaleString('id-ID');
    if (sumReject) sumReject.textContent = bibitReject.toLocaleString('id-ID');

    if (sessionPolybag > rem) {
      if (warningEl) {
        warningEl.textContent = 'Jumlah polybag melebihi sisa populasi yang belum diperiksa.';
        warningEl.style.display = 'block';
      }
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
        saveBtn.style.cursor = 'not-allowed';
      }
    } else if (sessionPolybag <= 0) {
      if (warningEl) {
        warningEl.textContent = 'Jumlah polybag yang diperiksa harus lebih besar dari 0.';
        warningEl.style.display = 'block';
      }
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
        saveBtn.style.cursor = 'not-allowed';
      }
    } else {
      if (warningEl) {
        warningEl.style.display = 'none';
      }
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
        saveBtn.style.cursor = 'pointer';
      }
    }
  }

  selBed?.addEventListener('change', () => {
    const opt = selBed.options[selBed.selectedIndex];
    const rem = parseInt(opt.getAttribute('data-remaining') || 0, 10);

    if (hiddenRemaining) hiddenRemaining.value = rem;
    if (labelTersedia) labelTersedia.textContent = `${rem.toLocaleString('id-ID')} Polybag`;

    inputP2.value = rem;
    inputP1.value = 0;
    inputP0.value = 0;
    updateCalculations();
  });

  inputP2?.addEventListener('input', updateCalculations);
  inputP1?.addEventListener('input', updateCalculations);
  inputP0?.addEventListener('input', updateCalculations);

  document.getElementById('btn-modal-cancel-sel1')?.addEventListener('click', closeModal);

  document.getElementById('btn-modal-save-sel1')?.addEventListener('click', () => {
    const bedenganCode = selBed?.value || '';
    const rem = parseInt(hiddenRemaining?.value || 0, 10);
    const p2 = parseInt(inputP2?.value || 0, 10);
    const p1 = parseInt(inputP1?.value || 0, 10);
    const p0 = parseInt(inputP0?.value || 0, 10);
    const polybagScope = p2 + p1 + p0;
    const tanggalSeleksi = today;
    const catatan = inputNotes?.value || '';

    // Over-quota protection
    if (polybagScope > rem) {
      toast('Jumlah polybag melebihi sisa populasi yang belum diperiksa.', 'error');
      return;
    }
    if (polybagScope <= 0) {
      toast('Jumlah polybag yang diperiksa harus lebih besar dari 0.', 'error');
      return;
    }

    try {
      const res = createSeleksi1ExecutionTransaction({
        selectionDocumentId: doc.id,
        selectionDocNo: doc.docNo,
        bedenganCode,
        polybagScope,
        polybag2Bibit: p2,
        polybag1Bibit: p1,
        polybag0Bibit: p0,
        tanggalSeleksi,
        catatan
      }, user);

      closeModal();
      toast(`Transaksi Seleksi I (${res.transaction.docNo}) pada ${bedenganCode} berhasil dicatat. (${res.transaction.bibitDipertahankan} Dipertahankan, ${res.transaction.bibitReject} Reject)`, 'success');
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
 * Mengimplementasikan Model Populasi Seleksi II:
 * - Polybag 2 Bibit (P2): 1 dipertahankan + 1 reject (membuang 1 tanaman terhambat)
 * - Polybag 1 Bibit (P1): 1 dipertahankan + 0 reject (tidak dipaksa reject)
 * - Polybag 0 Bibit (P0): 0 dipertahankan + 0 reject (kosong)
 * =============================================================================
 */
export function openSeleksi2ExecutionModal({ doc, user, onSaved }) {
  const today = formatDate(new Date().toISOString());
  const bedScopeList = getBedenganScopeStatusForSeleksi2(doc);

  // Check if any bedengan has remaining uninspected polybag
  const availableBeds = bedScopeList.filter(b => b.remainingPolybag > 0);
  if (bedScopeList.length > 0 && availableBeds.length === 0) {
    toast('Seluruh populasi Seleksi II telah diperiksa.', 'warning');
    return;
  }

  // Find first bedengan with remaining polybag
  const initialBed = availableBeds[0] || bedScopeList[0] || {
    bedenganCode: 'BED-001',
    remainingPolybag: doc.sourcePolybagQty || 0,
    initialPolybag: doc.sourcePolybagQty || 0,
    remainingBibit: doc.sourceBibitQty || 0,
    initialBibit: doc.sourceBibitQty || 0
  };

  const initialRemaining = initialBed.remainingPolybag !== undefined ? initialBed.remainingPolybag : (doc.sourcePolybagQty || 0);

  const bodyContent = `
    <div style="font-size: 0.82rem; color: #334155; line-height: 1.45;">
      
      <!-- HEADER INFO -->
      <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; font-size: 0.72rem;">
          <div>Dok. Seleksi II: <strong style="color: #0F172A;">${esc(doc.docNo)}</strong></div>
          <div>Sumber Seleksi I: <strong style="color: #0F172A;">${esc(doc.sourceSelectionDocNo || doc.sourceDocNo)}</strong></div>
          <div>Program: <strong style="color: #0F172A;">${esc(doc.programCode || doc.programName || '-')}</strong></div>
          <div>Batch: <strong style="color: #0F172A;">${esc(doc.batchCode || '-')}</strong></div>
          <div>Klon: <strong style="color: #0F172A;">${esc(doc.clone || doc.klon || '-')}</strong></div>
          <div>Tahap: <strong style="color: #0F172A;">Seleksi II (Pra-Okulasi)</strong></div>
        </div>
      </div>

      <!-- FORM FIELDS -->
      <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px;">
        
        <!-- PILIH BEDENGAN -->
        <div>
          <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
            Bedengan Pemeriksaan <span style="color: #DC2626;">*</span>
          </label>
          <select id="modal-sel2-bedengan" style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; font-size: 0.80rem; background: #FFFFFF;">
            ${bedScopeList.map(bed => `
              <option value="${esc(bed.bedenganCode)}" data-remaining-poly="${bed.remainingPolybag}" data-initial-poly="${bed.initialPolybag}" data-remaining-bibit="${bed.remainingBibit}" data-initial-bibit="${bed.initialBibit}" ${bed.bedenganCode === initialBed.bedenganCode ? 'selected' : ''}>
                ${esc(bed.bedenganCode)} (Sisa: ${bed.remainingPolybag.toLocaleString('id-ID')} Ply / ${bed.remainingBibit.toLocaleString('id-ID')} Pkk)
              </option>
            `).join('')}
          </select>
        </div>

        <!-- POPULASI TERSEDIA UNTUK DIPERIKSA (READ-ONLY) -->
        <div>
          <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
            Populasi Tersedia untuk Diperiksa
          </label>
          <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 6px; padding: 8px 12px; font-weight: 800; font-size: 0.88rem; color: #0F172A;">
            <span id="modal-sel2-populasi-tersedia-val">${initialRemaining.toLocaleString('id-ID')} Polybag</span>
          </div>
          <input type="hidden" id="modal-sel2-current-remaining" value="${initialRemaining}">
        </div>

        <!-- BREAKDOWN KONDISI POLYBAG SAAT INI (SELEKSI II MODEL) -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px;">
          <div style="font-size: 0.74rem; font-weight: 800; color: #0F172A; margin-bottom: 8px; text-transform: uppercase;">
            Kondisi Polybag & Hasil Seleksi II:
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <!-- 2 BIBIT -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="flex: 1;">
                <div style="font-size: 0.74rem; font-weight: 700; color: #15803D;">Polybag 2 Bibit (P2)</div>
                <div style="font-size: 0.65rem; color: #64748B;">1 bibit terbaik dipertahankan + 1 bibit reject</div>
              </div>
              <div style="width: 100px;">
                <input id="modal-sel2-p2" type="number" min="0" value="${initialRemaining}" style="width: 100%; height: 34px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; text-align: right; font-weight: 700; box-sizing: border-box;">
              </div>
            </div>

            <!-- 1 BIBIT -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="flex: 1;">
                <div style="font-size: 0.74rem; font-weight: 700; color: #D97706;">Polybag 1 Bibit (P1)</div>
                <div style="font-size: 0.65rem; color: #64748B;">1 bibit dipertahankan (0 reject, tidak dipaksa reject)</div>
              </div>
              <div style="width: 100px;">
                <input id="modal-sel2-p1" type="number" min="0" value="0" style="width: 100%; height: 34px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; text-align: right; font-weight: 700; box-sizing: border-box;">
              </div>
            </div>

            <!-- 0 BIBIT -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="flex: 1;">
                <div style="font-size: 0.74rem; font-weight: 700; color: #DC2626;">Polybag Kosong (P0)</div>
                <div style="font-size: 0.65rem; color: #64748B;">0 bibit dipertahankan + 0 reject (kosong)</div>
              </div>
              <div style="width: 100px;">
                <input id="modal-sel2-p0" type="number" min="0" value="0" style="width: 100%; height: 34px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; text-align: right; font-weight: 700; box-sizing: border-box;">
              </div>
            </div>
          </div>
        </div>

        <!-- LIVE RESULT SUMMARY -->
        <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px; font-size: 0.74rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px;">
            <div>Diperiksa Sesi Ini (P2+P1+P0): <strong id="modal-sel2-summary-session-total" style="color: #0F172A;">${initialRemaining.toLocaleString('id-ID')}</strong> Ply</div>
            <div>Sisa Tersedia: <strong id="modal-sel2-summary-rem-target" style="color: #64748B;">${initialRemaining.toLocaleString('id-ID')}</strong> Ply</div>
            <div>Status Balance: <strong id="modal-sel2-summary-balance" style="color: #15803D;">BALANCE ✅</strong></div>
            <div>Bibit Dipertahankan: <strong id="modal-sel2-summary-layak" style="color: #15803D;">${initialRemaining.toLocaleString('id-ID')}</strong> Pkk (1/Ply)</div>
            <div>Bibit Reject Seleksi II: <strong id="modal-sel2-summary-reject" style="color: #DC2626;">${initialRemaining.toLocaleString('id-ID')}</strong> Pkk</div>
          </div>
          <div id="modal-sel2-quota-warning" style="display: none; margin-top: 6px; padding: 6px 8px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 4px; color: #DC2626; font-size: 0.72rem; font-weight: 700;"></div>
        </div>

        <!-- TANGGAL TRANSAKSI (READ-ONLY) & CATATAN -->
        <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 8px;">
          <div>
            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 2px;">Tanggal Transaksi</label>
            <input id="modal-sel2-date" type="text" value="${today}" readonly disabled style="width: 100%; height: 36px; border: 1px solid #E2E8F0; border-radius: 6px; padding: 0 8px; font-size: 0.78rem; background: #F1F5F9; color: #475569; cursor: not-allowed; box-sizing: border-box;">
          </div>
          <div>
            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 2px;">Catatan (Opsional)</label>
            <input id="modal-sel2-notes" type="text" placeholder="Catatan Seleksi II..." style="width: 100%; height: 36px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; font-size: 0.78rem; box-sizing: border-box;">
          </div>
        </div>

      </div>

      <!-- BUTTONS -->
      <div style="display: flex; gap: 8px;">
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
  const inputP2 = document.getElementById('modal-sel2-p2');
  const inputP1 = document.getElementById('modal-sel2-p1');
  const inputP0 = document.getElementById('modal-sel2-p0');
  const inputNotes = document.getElementById('modal-sel2-notes');
  const hiddenRemaining = document.getElementById('modal-sel2-current-remaining');
  const labelTersedia = document.getElementById('modal-sel2-populasi-tersedia-val');

  const sumSessionTotal = document.getElementById('modal-sel2-summary-session-total');
  const sumRemTarget = document.getElementById('modal-sel2-summary-rem-target');
  const sumBalance = document.getElementById('modal-sel2-summary-balance');
  const sumLayak = document.getElementById('modal-sel2-summary-layak');
  const sumReject = document.getElementById('modal-sel2-summary-reject');
  const warningEl = document.getElementById('modal-sel2-quota-warning');
  const saveBtn = document.getElementById('btn-modal-save-sel2');

  function updateCalculations() {
    const rem = parseInt(hiddenRemaining?.value || 0, 10);
    const p2 = parseInt(inputP2?.value || 0, 10);
    const p1 = parseInt(inputP1?.value || 0, 10);
    const p0 = parseInt(inputP0?.value || 0, 10);

    // Seleksi II: P2 -> 1 layak + 1 reject; P1 -> 1 layak + 0 reject; P0 -> 0 layak + 0 reject
    const bibitAwal = (p2 * 2) + (p1 * 1);
    const bibitLayak = (p2 * 1) + (p1 * 1);
    const bibitReject = (p2 * 1);
    const totalPolyResult = p2 + p1 + p0;
    const isBalanced = (bibitLayak + bibitReject === bibitAwal);

    if (sumSessionTotal) sumSessionTotal.textContent = totalPolyResult.toLocaleString('id-ID');
    if (sumRemTarget) sumRemTarget.textContent = rem.toLocaleString('id-ID');
    if (sumLayak) sumLayak.textContent = bibitLayak.toLocaleString('id-ID');
    if (sumReject) sumReject.textContent = bibitReject.toLocaleString('id-ID');

    if (sumBalance) {
      if (isBalanced && totalPolyResult > 0 && totalPolyResult <= rem) {
        sumBalance.textContent = 'BALANCE ✅';
        sumBalance.style.color = '#15803D';
      } else {
        sumBalance.textContent = `MISMATCH ❌`;
        sumBalance.style.color = '#DC2626';
      }
    }

    if (totalPolyResult > rem) {
      if (warningEl) {
        warningEl.textContent = 'Jumlah polybag melebihi sisa populasi yang belum diperiksa.';
        warningEl.style.display = 'block';
      }
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
        saveBtn.style.cursor = 'not-allowed';
      }
    } else if (totalPolyResult <= 0) {
      if (warningEl) {
        warningEl.textContent = 'Jumlah polybag yang diperiksa harus lebih besar dari 0.';
        warningEl.style.display = 'block';
      }
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
        saveBtn.style.cursor = 'not-allowed';
      }
    } else {
      if (warningEl) {
        warningEl.style.display = 'none';
      }
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
        saveBtn.style.cursor = 'pointer';
      }
    }
  }

  selBed?.addEventListener('change', () => {
    const opt = selBed.options[selBed.selectedIndex];
    const remPoly = parseInt(opt.getAttribute('data-remaining-poly') || 0, 10);
    const initPoly = parseInt(opt.getAttribute('data-initial-poly') || 0, 10);
    const targetVal = remPoly > 0 ? remPoly : initPoly;

    if (hiddenRemaining) hiddenRemaining.value = targetVal;
    if (labelTersedia) labelTersedia.textContent = `${targetVal.toLocaleString('id-ID')} Polybag`;
    if (inputP2) inputP2.value = targetVal;
    if (inputP1) inputP1.value = 0;
    if (inputP0) inputP0.value = 0;
    updateCalculations();
  });

  inputP2?.addEventListener('input', updateCalculations);
  inputP1?.addEventListener('input', updateCalculations);
  inputP0?.addEventListener('input', updateCalculations);

  document.getElementById('btn-modal-cancel-sel2')?.addEventListener('click', closeModal);

  document.getElementById('btn-modal-save-sel2')?.addEventListener('click', () => {
    const bedenganCode = selBed?.value || '';
    const p2 = parseInt(inputP2?.value || 0, 10);
    const p1 = parseInt(inputP1?.value || 0, 10);
    const p0 = parseInt(inputP0?.value || 0, 10);
    const polybagScope = p2 + p1 + p0;
    const tanggalSeleksi = today;
    const catatan = inputNotes?.value || '';

    try {
      const res = createSeleksi2ExecutionTransaction({
        selectionDocumentId: doc.id,
        selectionDocNo: doc.docNo,
        bedenganCode,
        polybagScope,
        polybag2Bibit: p2,
        polybag1Bibit: p1,
        polybag0Bibit: p0,
        tanggalSeleksi,
        catatan
      }, user);

      closeModal();
      toast(`Transaksi Seleksi II (${res.transaction.docNo}) pada ${bedenganCode} berhasil dicatat. (${res.transaction.bibitDipertahankan} Dipertahankan, ${res.transaction.bibitReject} Reject)`, 'success');
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
 * - Scope Polybag & Bibit Awal dihitung otomatis dari sisa populasi bedengan
 * - Mantri mencatat bibit abnormal/sakit (Reject) dan bibit sehat (Layak)
 * - Tidak menerapkan aturan otomatis 2 menjadi 1
 * =============================================================================
 */
export function openSeleksi3ExecutionModal({ doc, user, onSaved }) {
  const today = formatDate(new Date().toISOString());
  const bedScopeList = getBedenganScopeStatusForSeleksi3(doc);

  // Check if any bedengan has remaining uninspected polybag
  const availableBeds = bedScopeList.filter(b => b.remainingPolybag > 0);
  if (bedScopeList.length > 0 && availableBeds.length === 0) {
    toast('Seluruh populasi Seleksi III telah diperiksa.', 'warning');
    return;
  }

  const initialBed = availableBeds[0] || bedScopeList[0] || {
    bedenganCode: 'BED-001',
    remainingPolybag: doc.sourcePolybagQty || 0,
    initialPolybag: doc.sourcePolybagQty || 0,
    remainingBibit: doc.sourceBibitQty || 0,
    initialBibit: doc.sourceBibitQty || 0
  };

  const initialScopePoly = initialBed.remainingPolybag !== undefined ? initialBed.remainingPolybag : (doc.sourcePolybagQty || 0);
  const initialScopeBibit = initialBed.remainingBibit !== undefined ? initialBed.remainingBibit : (doc.sourceBibitQty || 0);

  const bodyContent = `
    <div style="font-size: 0.82rem; color: #334155; line-height: 1.45;">
      
      <!-- HEADER INFO -->
      <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; font-size: 0.72rem;">
          <div>Dok. Seleksi III: <strong style="color: #0F172A;">${esc(doc.docNo)}</strong></div>
          <div>Sumber Seleksi II: <strong style="color: #0F172A;">${esc(doc.sourceSelectionDocNo || doc.sourceDocNo)}</strong></div>
          <div>Program: <strong style="color: #0F172A;">${esc(doc.programCode || doc.programName || '-')}</strong></div>
          <div>Batch: <strong style="color: #0F172A;">${esc(doc.batchCode || '-')}</strong></div>
          <div>Klon: <strong style="color: #0F172A;">${esc(doc.clone || doc.klon || '-')}</strong></div>
          <div>Tahap: <strong style="color: #0F172A;">Seleksi III (Pra-Okulasi)</strong></div>
        </div>
      </div>

      <!-- FORM FIELDS -->
      <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px;">
        
        <!-- PILIH BEDENGAN -->
        <div>
          <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
            Bedengan Pemeriksaan <span style="color: #DC2626;">*</span>
          </label>
          <select id="modal-sel3-bedengan" style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; font-size: 0.80rem; background: #FFFFFF;">
            ${bedScopeList.map(bed => `
              <option value="${esc(bed.bedenganCode)}" data-remaining-poly="${bed.remainingPolybag}" data-initial-poly="${bed.initialPolybag}" data-remaining-bibit="${bed.remainingBibit}" data-initial-bibit="${bed.initialBibit}" ${bed.bedenganCode === initialBed.bedenganCode ? 'selected' : ''}>
                ${esc(bed.bedenganCode)} (Sisa: ${bed.remainingPolybag.toLocaleString('id-ID')} Ply / ${bed.remainingBibit.toLocaleString('id-ID')} Pkk)
              </option>
            `).join('')}
          </select>
        </div>

        <!-- POPULASI TERSEDIA UNTUK DIPERIKSA (READ-ONLY) -->
        <div>
          <label style="display: block; font-size: 0.75rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
            Populasi Tersedia untuk Diperiksa
          </label>
          <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 6px; padding: 8px 12px; font-weight: 800; font-size: 0.88rem; color: #0F172A;">
            <span id="modal-sel3-populasi-tersedia-val">${initialScopePoly.toLocaleString('id-ID')} Polybag (${initialScopeBibit.toLocaleString('id-ID')} Bibit)</span>
          </div>
          <input type="hidden" id="modal-sel3-current-remaining-poly" value="${initialScopePoly}">
          <input type="hidden" id="modal-sel3-current-remaining-bibit" value="${initialScopeBibit}">
        </div>

        <!-- PERHITUNGAN HASIL SELEKSI III -->
        <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 12px;">
          <div style="font-size: 0.74rem; font-weight: 800; color: #0F172A; margin-bottom: 8px; text-transform: uppercase;">
            Kondisi Bibit & Hasil Seleksi III:
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="flex: 1;">
                <div style="font-size: 0.74rem; font-weight: 700; color: #0F172A;">Bibit Diperiksa (Awal)</div>
                <div style="font-size: 0.65rem; color: #64748B;">Total bibit yang diperiksa dalam scope ini</div>
              </div>
              <div style="width: 100px;">
                <input id="modal-sel3-bibit-awal" type="number" min="1" max="${initialScopeBibit}" value="${initialScopeBibit}" style="width: 100%; height: 34px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; text-align: right; font-weight: 700; box-sizing: border-box;">
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="flex: 1;">
                <div style="font-size: 0.74rem; font-weight: 700; color: #15803D;">Bibit Dipertahankan (Layak)</div>
                <div style="font-size: 0.65rem; color: #64748B;">Bibit sehat & siap okulasi</div>
              </div>
              <div style="width: 100px;">
                <input id="modal-sel3-layak" type="number" min="0" value="${initialScopeBibit}" style="width: 100%; height: 34px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; text-align: right; font-weight: 700; box-sizing: border-box;">
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="flex: 1;">
                <div style="font-size: 0.74rem; font-weight: 700; color: #DC2626;">Bibit Reject (Abnormal/Sakit)</div>
                <div style="font-size: 0.65rem; color: #64748B;">Bibit ditolak pada Seleksi III</div>
              </div>
              <div style="width: 100px;">
                <input id="modal-sel3-reject" type="number" min="0" value="0" style="width: 100%; height: 34px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; text-align: right; font-weight: 700; box-sizing: border-box;">
              </div>
            </div>

          </div>
        </div>

        <!-- LIVE RESULT SUMMARY -->
        <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px; font-size: 0.74rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px;">
            <div>Diperiksa Sesi Ini: <strong id="modal-sel3-summary-session-total" style="color: #0F172A;">${initialScopeBibit.toLocaleString('id-ID')}</strong> Pkk</div>
            <div>Sisa Tersedia: <strong id="modal-sel3-summary-rem-target" style="color: #64748B;">${initialScopeBibit.toLocaleString('id-ID')}</strong> Pkk</div>
            <div>Status Balance: <strong id="modal-sel3-summary-balance" style="color: #15803D;">BALANCE ✅</strong></div>
            <div>Bibit Layak: <strong id="modal-sel3-summary-layak" style="color: #15803D;">${initialScopeBibit.toLocaleString('id-ID')}</strong> Pkk</div>
            <div>Bibit Reject: <strong id="modal-sel3-summary-reject" style="color: #DC2626;">0</strong> Pkk</div>
          </div>
          <div id="modal-sel3-quota-warning" style="display: none; margin-top: 6px; padding: 6px 8px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 4px; color: #DC2626; font-size: 0.72rem; font-weight: 700;"></div>
        </div>

        <!-- TANGGAL TRANSAKSI (READ-ONLY) & CATATAN -->
        <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 8px;">
          <div>
            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 2px;">Tanggal Transaksi</label>
            <input id="modal-sel3-date" type="text" value="${today}" readonly disabled style="width: 100%; height: 36px; border: 1px solid #E2E8F0; border-radius: 6px; padding: 0 8px; font-size: 0.78rem; background: #F1F5F9; color: #475569; cursor: not-allowed; box-sizing: border-box;">
          </div>
          <div>
            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 2px;">Catatan (Opsional)</label>
            <input id="modal-sel3-notes" type="text" placeholder="Abnormal / Sakit..." style="width: 100%; height: 36px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; font-size: 0.78rem; box-sizing: border-box;">
          </div>
        </div>

      </div>

      <!-- BUTTONS -->
      <div style="display: flex; gap: 8px;">
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
    title: 'Pelaksanaan Seleksi III',
    body: bodyContent
  });

  const selBed = document.getElementById('modal-sel3-bedengan');
  const inputBibitAwal = document.getElementById('modal-sel3-bibit-awal');
  const inputLayak = document.getElementById('modal-sel3-layak');
  const inputReject = document.getElementById('modal-sel3-reject');
  const inputNotes = document.getElementById('modal-sel3-notes');
  const hiddenRemainingPoly = document.getElementById('modal-sel3-current-remaining-poly');
  const hiddenRemainingBibit = document.getElementById('modal-sel3-current-remaining-bibit');
  const labelTersedia = document.getElementById('modal-sel3-populasi-tersedia-val');

  const sumSessionTotal = document.getElementById('modal-sel3-summary-session-total');
  const sumRemTarget = document.getElementById('modal-sel3-summary-rem-target');
  const sumBalance = document.getElementById('modal-sel3-summary-balance');
  const sumLayak = document.getElementById('modal-sel3-summary-layak');
  const sumReject = document.getElementById('modal-sel3-summary-reject');
  const warningEl = document.getElementById('modal-sel3-quota-warning');
  const saveBtn = document.getElementById('btn-modal-save-sel3');

  function updateCalculations(changedField) {
    const remBibit = parseInt(hiddenRemainingBibit?.value || 0, 10);
    const remPoly = parseInt(hiddenRemainingPoly?.value || 0, 10);
    const awal = parseInt(inputBibitAwal?.value || 0, 10);
    let layak = parseInt(inputLayak?.value || 0, 10);
    let reject = parseInt(inputReject?.value || 0, 10);

    if (changedField === 'layak') {
      reject = Math.max(0, awal - layak);
      if (inputReject) inputReject.value = reject;
    } else if (changedField === 'reject') {
      layak = Math.max(0, awal - reject);
      if (inputLayak) inputLayak.value = layak;
    } else if (changedField === 'awal') {
      layak = Math.max(0, awal - reject);
      if (inputLayak) inputLayak.value = layak;
    }

    const isBalanced = (layak + reject === awal);

    if (sumSessionTotal) sumSessionTotal.textContent = awal.toLocaleString('id-ID');
    if (sumRemTarget) sumRemTarget.textContent = remBibit.toLocaleString('id-ID');
    if (sumLayak) sumLayak.textContent = layak.toLocaleString('id-ID');
    if (sumReject) sumReject.textContent = reject.toLocaleString('id-ID');

    if (sumBalance) {
      if (isBalanced && awal > 0 && awal <= remBibit) {
        sumBalance.textContent = 'BALANCE ✅';
        sumBalance.style.color = '#15803D';
      } else {
        sumBalance.textContent = `MISMATCH ❌`;
        sumBalance.style.color = '#DC2626';
      }
    }

    if (awal > remBibit) {
      if (warningEl) {
        warningEl.textContent = 'Jumlah bibit melebihi sisa bibit yang tersedia pada bedengan ini.';
        warningEl.style.display = 'block';
      }
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
        saveBtn.style.cursor = 'not-allowed';
      }
    } else if (awal <= 0) {
      if (warningEl) {
        warningEl.textContent = 'Jumlah bibit yang diperiksa harus lebih besar dari 0.';
        warningEl.style.display = 'block';
      }
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
        saveBtn.style.cursor = 'not-allowed';
      }
    } else if (!isBalanced) {
      if (warningEl) {
        warningEl.textContent = 'Keseimbangan bibit tidak sesuai (Layak + Reject harus sama dengan Bibit Awal).';
        warningEl.style.display = 'block';
      }
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
        saveBtn.style.cursor = 'not-allowed';
      }
    } else {
      if (warningEl) {
        warningEl.style.display = 'none';
      }
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
        saveBtn.style.cursor = 'pointer';
      }
    }
  }

  selBed?.addEventListener('change', () => {
    const opt = selBed.options[selBed.selectedIndex];
    const remPoly = parseInt(opt.getAttribute('data-remaining-poly') || 0, 10);
    const initPoly = parseInt(opt.getAttribute('data-initial-poly') || 0, 10);
    const remBibit = parseInt(opt.getAttribute('data-remaining-bibit') || 0, 10);
    const initBibit = parseInt(opt.getAttribute('data-initial-bibit') || 0, 10);

    const targetPoly = remPoly > 0 ? remPoly : initPoly;
    const targetBibit = remBibit > 0 ? remBibit : initBibit;

    if (hiddenRemainingPoly) hiddenRemainingPoly.value = targetPoly;
    if (hiddenRemainingBibit) hiddenRemainingBibit.value = targetBibit;
    if (labelTersedia) labelTersedia.textContent = `${targetPoly.toLocaleString('id-ID')} Polybag (${targetBibit.toLocaleString('id-ID')} Bibit)`;

    if (inputBibitAwal) {
      inputBibitAwal.value = targetBibit;
      inputBibitAwal.max = targetBibit;
    }
    if (inputLayak) inputLayak.value = targetBibit;
    if (inputReject) inputReject.value = 0;

    updateCalculations();
  });

  inputBibitAwal?.addEventListener('input', () => updateCalculations('awal'));
  inputLayak?.addEventListener('input', () => updateCalculations('layak'));
  inputReject?.addEventListener('input', () => updateCalculations('reject'));

  document.getElementById('btn-modal-cancel-sel3')?.addEventListener('click', closeModal);

  document.getElementById('btn-modal-save-sel3')?.addEventListener('click', () => {
    const bedenganCode = selBed?.value || '';
    const remPoly = parseInt(hiddenRemainingPoly?.value || 0, 10);
    const bibitAwal = parseInt(inputBibitAwal?.value || 0, 10);
    const layak = parseInt(inputLayak?.value || 0, 10);
    const reject = parseInt(inputReject?.value || 0, 10);
    const polybagScope = remPoly > 0 ? remPoly : bibitAwal; // Polybag is immutable container unit
    const tanggalSeleksi = today;
    const catatan = inputNotes?.value || '';

    try {
      const res = createSeleksi3ExecutionTransaction({
        selectionDocumentId: doc.id,
        selectionDocNo: doc.docNo,
        bedenganCode,
        polybagScope,
        bibitAwal,
        bibitDipertahankan: layak,
        bibitReject: reject,
        tanggalSeleksi,
        catatan
      }, user);

      closeModal();
      toast(`Transaksi Seleksi III (${res.transaction.docNo}) pada ${bedenganCode} berhasil dicatat. (${res.transaction.bibitDipertahankan} Dipertahankan, ${res.transaction.bibitReject} Reject)`, 'success');
      if (onSaved) onSaved(res);
    } catch (err) {
      console.error('[Seleksi 3 Save Error]', err);
      toast(err.message || 'Gagal menyimpan transaksi Seleksi III', 'error');
    }
  });
}
