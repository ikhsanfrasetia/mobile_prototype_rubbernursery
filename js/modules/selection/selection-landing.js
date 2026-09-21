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

            <!-- B. SECTION POST-GRAFTING & DEDERAN RECORDS -->
            ${(activeAsbTab === 'PENDING' ? pendingPostRecords : historyPostRecords).map(item => {
    const isDederan = item.originType === 'REJECT_DEDERAN' || item.sourceModule === 'DEDERAN';
    const unit = isDederan ? 'Butir' : 'Pkk';
    const checked = parseInt(item.jumlahDiperiksa || item.quantity || 0, 10);
    const pass = parseInt(item.jumlahLayak || 0, 10);
    const cull = parseInt(item.jumlahAfkir || item.quantity || 0, 10);
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
                        ${isDederan ? 'PASCA-SEMAI (DEDERAN)' : esc(item.selectionType || item.selectionStage || 'PASCA-OKULASI')}
                      </span>
                      <div style="flex-shrink: 0;">
                        ${statusBadge}
                      </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px;">
                      <strong style="font-size: 0.95rem; font-weight: 800; color: #0F172A; letter-spacing: -0.01em;">${esc(item.docNo || item.selectionNo || '-')}</strong>
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

                  <!-- 3-KOLOM METRIK SELEKSI -->
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
      const targetUnit = isDederan ? 'Butir' : 'Pkk';

      openModal({
        title: 'Persetujuan Hasil Seleksi',
        body: `
          <div style="font-size: 0.84rem; color: #334155; line-height: 1.5;">
            <p style="margin: 0 0 10px 0;">
              ${isDederan
            ? `Apakah Anda yakin ingin menyetujui hasil seleksi Dederan <strong>${esc(target.docNo)}</strong> (${esc(target.bedengan || target.bedenganCode || '-')})?`
            : `Apakah Anda yakin ingin menyetujui hasil seleksi bibit untuk batch <strong>${esc(target.batchCode)}</strong>?`}
            </p>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; font-size: 0.78rem;">
              <div>Diperiksa: <strong>${parseInt(target.jumlahDiperiksa || target.quantity || 0).toLocaleString('id-ID')}</strong> ${targetUnit}</div>
              <div>Layak: <strong style="color: #15803D;">${parseInt(target.jumlahLayak || 0).toLocaleString('id-ID')}</strong> ${targetUnit}</div>
              <div>Afkir: <strong style="color: #DC2626;">${parseInt(target.jumlahAfkir || target.quantity || 0).toLocaleString('id-ID')}</strong> ${targetUnit}</div>
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

      openModal({
        title: 'Kembalikan Hasil Seleksi',
        body: `
          <div style="font-size: 0.84rem; color: #334155; line-height: 1.5;">
            <p style="margin: 0 0 12px 0;">
              ${isDederan
            ? `Kembalikan hasil seleksi Dederan <strong>${esc(target.docNo)}</strong> (${esc(target.bedengan || target.bedenganCode || '-')}) ke Mantri untuk perbaikan atau deklarasi ulang.`
            : `Kembalikan hasil seleksi batch <strong>${esc(target.batchCode)}</strong> ke Mantri untuk perbaikan atau penghitungan ulang.`}
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
  let scopedPool = filterSelectionByScope(rawSelectionPool, user).filter(item => {
    const existing = findExistingSelectionTransaction(item);
    if (!existing) {
      return item.status !== 'DECLARED_CULLED' && item.status !== SELECTION_STATUS.DISETUJUI && item.status !== SELECTION_STATUS.MENUNGGU_VERIFIKASI;
    }
    // If existing transaction or item is DIKEMBALIKAN, Mantri can see it in the pool to re-declare!
    if (existing.status === SELECTION_STATUS.DIKEMBALIKAN || item.status === SELECTION_STATUS.DIKEMBALIKAN) {
      if (existing.returnReason && !item.returnReason) {
        item.returnReason = existing.returnReason;
      }
      item.status = SELECTION_STATUS.DIKEMBALIKAN;
      return true;
    }
    // Otherwise it's either MENUNGGU_VERIFIKASI or DISETUJUI, so it's not in the pending action pool
    return false;
  });

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
          Klasifikasi Deklarasi Bibit <span style="color: #DC2626;">*</span>
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
        <button type="button" class="btn btn-primary" id="btn-submit-to-asisten" style="flex: 2; height: 38px; background: #116834; color: #FFFFFF; font-weight: 700; font-size: 0.80rem; border: none; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
          Kirim ke Asisten Bibitan
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

  modalRoot.querySelector('#btn-submit-to-asisten')?.addEventListener('click', () => {
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
        <h2 style="font-size: 0.90rem; font-weight: 800; color: #0F172A; margin: 0;">Histori Deklarasi & Verifikasi (${culledItems.length})</h2>
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
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
                <div style="min-width: 0;">
                  <div style="font-weight: 800; font-size: 0.90rem; color: #0F172A; word-break: break-word;">
                    ${esc(histCardTitle)}${klonDisplay ? ` <span style="font-size: 0.74rem; font-weight: 600; color: #64748B;">• Klon ${esc(klonDisplay)}</span>` : ''}
                  </div>
                  <div style="font-size: 0.70rem; color: #64748B; margin-top: 2px;">
                    Dok. Seleksi: <strong style="color: #0F172A;">${esc(ctx.docNo || '-')}</strong> • Sumber: <strong style="color: #0F172A;">${esc(src)}</strong>
                  </div>
                </div>
                <div style="flex-shrink: 0; text-align: right;">
                  <div>${badgeHtml}</div>
                  <div style="margin-top: 4px;">
                    <span style="font-weight: 900; font-size: 0.95rem; color: #DC2626;">-${qty.toLocaleString('id-ID')}</span>
                    <span style="font-size: 0.68rem; font-weight: 700; color: #991B1B; margin-left: 1px;">${unit}</span>
                  </div>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; font-size: 0.70rem; color: #64748B; padding: 6px 0; border-top: 1px solid #F1F5F9; border-bottom: 1px solid #F1F5F9;">
                <div>Dok. Asal: <strong style="color: #334155;">${esc(ctx.sourceDocNo || '-')}</strong></div>
                <div>Program: <strong style="color: #334155;">${esc(ctx.programName || ctx.programCode || '-')}</strong></div>
              </div>

              ${isApproved && ctx.approvalNotes ? `
                <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 4px; padding: 6px 8px; font-size: 0.70rem; color: #15803D; margin-top: 6px;">
                  <strong>Catatan Persetujuan:</strong> ${esc(ctx.approvalNotes)}
                </div>
              ` : ''}

              ${isReturned && ctx.returnReason ? `
                <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 4px; padding: 6px 8px; font-size: 0.70rem; color: #DC2626; margin-top: 6px;">
                  <strong>Alasan Pengembalian:</strong> ${esc(ctx.returnReason)}
                </div>
              ` : ''}

              <div style="font-size: 0.68rem; color: #94A3B8; margin-top: 6px; display: flex; justify-content: space-between;">
                <div>Pengaju: <strong>${esc(ctx.createdByName || ctx.mantri || user.name)}</strong></div>
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
    initialPolybag: doc.sourcePolybagQty || 0,
    remainingBibit: doc.sourceBibitQty || ((doc.sourcePolybagQty || 0) * 2),
    initialBibit: doc.sourceBibitQty || ((doc.sourcePolybagQty || 0) * 2)
  };

  const initialRemainingPolybag = initialBed.remainingPolybag !== undefined ? initialBed.remainingPolybag : (doc.sourcePolybagQty || 0);
  const initialRemainingBibit = initialBed.remainingBibit !== undefined ? initialBed.remainingBibit : (initialRemainingPolybag * 2);

  const bodyContent = `
    <div style="font-size: 0.82rem; color: #334155; line-height: 1.45;">
      
      <!-- HEADER INFO & DOKUMEN ASAL -->
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; font-size: 0.72rem;">
          <div>Dok. Seleksi I: <strong style="color: #0F172A;">${esc(doc.docNo)}</strong></div>
          <div>Dok. Asal (Penyemaian): <strong style="color: #0F172A;">${esc(doc.sourceDocNo)}</strong></div>
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
              <option value="${esc(bed.bedenganCode)}" data-remaining-poly="${bed.remainingPolybag}" data-initial-poly="${bed.initialPolybag}" data-remaining-bibit="${bed.remainingBibit || (bed.remainingPolybag * 2)}" data-initial-bibit="${bed.initialBibit || (bed.initialPolybag * 2)}" ${bed.bedenganCode === initialBed.bedenganCode ? 'selected' : ''}>
                ${esc(bed.bedenganCode)} (Sisa Polybag: ${bed.remainingPolybag.toLocaleString('id-ID')} / ${bed.initialPolybag.toLocaleString('id-ID')})
              </option>
            `).join('')}
          </select>
        </div>

        <!-- REFERENCE DARI DOKUMEN SEBELUMNYA (READ-ONLY) -->
        <div style="background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 12px;">
          <div style="font-size: 0.70rem; font-weight: 700; color: #475569; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.03em;">
            Reference dari Dokumen Sebelumnya (Read-Only)
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 10px;">
              <div style="font-size: 0.65rem; color: #64748B;">Sisa Polybag Tersedia</div>
              <div id="modal-sel1-ref-polybag" style="font-size: 0.88rem; font-weight: 800; color: #0F172A; margin-top: 1px;">
                ${initialRemainingPolybag.toLocaleString('id-ID')} Ply
              </div>
            </div>
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 10px;">
              <div style="font-size: 0.65rem; color: #64748B;">Sisa Bibit Tersedia</div>
              <div id="modal-sel1-ref-bibit" style="font-size: 0.88rem; font-weight: 800; color: #0F172A; margin-top: 1px;">
                ${initialRemainingBibit.toLocaleString('id-ID')} Pkk
              </div>
            </div>
          </div>
          <input type="hidden" id="modal-sel1-current-remaining-poly" value="${initialRemainingPolybag}">
          <input type="hidden" id="modal-sel1-current-remaining-bibit" value="${initialRemainingBibit}">
        </div>

        <!-- INPUT MANTRI (2 INPUT BARU) -->
        <div style="background: #FFFFFF; border: 1.5px solid #116834; border-radius: 8px; padding: 10px 12px;">
          <div style="font-size: 0.74rem; font-weight: 800; color: #116834; margin-bottom: 8px; text-transform: uppercase;">
            Input Pemeriksaan Mantri:
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <!-- 1. Jlh Polybag Terisi Bibit -->
            <div>
              <label style="display: block; font-size: 0.73rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
                1. Jlh Polybag Terisi Bibit <span style="color: #DC2626;">*</span>
              </label>
              <input id="modal-sel1-polybag-active" type="number" min="0" max="${initialRemainingPolybag}" value="${initialRemainingPolybag}" placeholder="0" style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; font-weight: 700; font-size: 0.88rem; box-sizing: border-box; color: #0F172A;">
              <div style="font-size: 0.62rem; color: #64748B; margin-top: 2px;">Polybag aktif (ada bibit)</div>
            </div>

            <!-- 2. Jlh Bibit Dipertahankan -->
            <div>
              <label style="display: block; font-size: 0.73rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
                2. Jlh Bibit Dipertahankan <span style="color: #DC2626;">*</span>
              </label>
              <input id="modal-sel1-bibit-retained" type="number" min="0" max="${initialRemainingBibit}" value="${initialRemainingBibit}" placeholder="0" style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; font-weight: 700; font-size: 0.88rem; box-sizing: border-box; color: #15803D;">
              <div style="font-size: 0.62rem; color: #64748B; margin-top: 2px;">Bibit layak dipertahankan</div>
            </div>
          </div>
        </div>

        <!-- RINGKASAN OTOMATIS (4 METRIK AUTO) -->
        <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 12px; font-size: 0.74rem;">
          <div style="font-size: 0.70rem; font-weight: 700; color: #475569; margin-bottom: 6px; text-transform: uppercase;">
            Ringkasan Hasil Pemeriksaan (Auto):
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px;">
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 8px;">
              <span style="color: #64748B;">Ttl Polybag Tidak Aktif:</span>
              <div id="modal-sel1-sum-inactive-poly" style="font-size: 0.85rem; font-weight: 700; color: #DC2626; margin-top: 1px;">0 Ply</div>
            </div>
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 8px;">
              <span style="color: #64748B;">Ttl Bibit Diseleksi:</span>
              <div id="modal-sel1-sum-selected-bibit" style="font-size: 0.85rem; font-weight: 700; color: #DC2626; margin-top: 1px;">0 Pkk</div>
            </div>
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 8px;">
              <span style="color: #64748B;">Jlh Polybag Aktif:</span>
              <div id="modal-sel1-sum-active-poly" style="font-size: 0.85rem; font-weight: 700; color: #15803D; margin-top: 1px;">${initialRemainingPolybag.toLocaleString('id-ID')} Ply</div>
            </div>
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 8px;">
              <span style="color: #64748B;">Jlh Bibit Dipertahankan:</span>
              <div id="modal-sel1-sum-retained-bibit" style="font-size: 0.85rem; font-weight: 700; color: #15803D; margin-top: 1px;">${initialRemainingBibit.toLocaleString('id-ID')} Pkk</div>
            </div>
          </div>
          <div id="modal-sel1-quota-warning" style="display: none; margin-top: 8px; padding: 6px 8px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 4px; color: #DC2626; font-size: 0.72rem; font-weight: 700;"></div>
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
  const inputActivePoly = document.getElementById('modal-sel1-polybag-active');
  const inputRetainedBibit = document.getElementById('modal-sel1-bibit-retained');
  const inputNotes = document.getElementById('modal-sel1-notes');
  const hiddenRemPoly = document.getElementById('modal-sel1-current-remaining-poly');
  const hiddenRemBibit = document.getElementById('modal-sel1-current-remaining-bibit');
  const labelRefPoly = document.getElementById('modal-sel1-ref-polybag');
  const labelRefBibit = document.getElementById('modal-sel1-ref-bibit');

  const sumInactivePoly = document.getElementById('modal-sel1-sum-inactive-poly');
  const sumSelectedBibit = document.getElementById('modal-sel1-sum-selected-bibit');
  const sumActivePoly = document.getElementById('modal-sel1-sum-active-poly');
  const sumRetainedBibit = document.getElementById('modal-sel1-sum-retained-bibit');
  const warningEl = document.getElementById('modal-sel1-quota-warning');
  const saveBtn = document.getElementById('btn-modal-save-sel1');

  function updateCalculations() {
    const remPoly = parseInt(hiddenRemPoly?.value || 0, 10);
    const remBibit = parseInt(hiddenRemBibit?.value || 0, 10);
    const activePoly = parseInt(inputActivePoly?.value || 0, 10);
    const retainedBibit = parseInt(inputRetainedBibit?.value || 0, 10);

    const inactivePoly = Math.max(0, remPoly - activePoly);
    const selectedBibit = remBibit;

    if (sumInactivePoly) sumInactivePoly.textContent = `${inactivePoly.toLocaleString('id-ID')} Ply`;
    if (sumSelectedBibit) sumSelectedBibit.textContent = `${selectedBibit.toLocaleString('id-ID')} Pkk`;
    if (sumActivePoly) sumActivePoly.textContent = `${activePoly.toLocaleString('id-ID')} Ply`;
    if (sumRetainedBibit) sumRetainedBibit.textContent = `${retainedBibit.toLocaleString('id-ID')} Pkk`;

    let errorMsg = null;

    if (isNaN(activePoly) || activePoly < 0) {
      errorMsg = 'Jumlah polybag terisi bibit tidak valid.';
    } else if (isNaN(retainedBibit) || retainedBibit < 0) {
      errorMsg = 'Jumlah bibit dipertahankan tidak valid.';
    } else if (activePoly > remPoly) {
      errorMsg = `Jumlah polybag terisi bibit (${activePoly.toLocaleString('id-ID')}) melebihi sisa scope polybag (${remPoly.toLocaleString('id-ID')}).`;
    } else if (retainedBibit > remBibit) {
      errorMsg = `Jumlah bibit dipertahankan (${retainedBibit.toLocaleString('id-ID')}) melebihi sisa scope bibit (${remBibit.toLocaleString('id-ID')}).`;
    } else if (retainedBibit > (activePoly * 2)) {
      errorMsg = `Jumlah bibit dipertahankan (${retainedBibit.toLocaleString('id-ID')}) tidak boleh melebihi 2x polybag terisi bibit (${(activePoly * 2).toLocaleString('id-ID')}).`;
    } else if (activePoly === 0 && retainedBibit === 0 && remPoly > 0) {
      errorMsg = 'Peringatan: Seluruh populasi akan dinyatakan afkir/kosong.';
    }

    if (errorMsg) {
      if (warningEl) {
        warningEl.textContent = errorMsg;
        warningEl.style.display = 'block';
      }
      const isCriticalError = activePoly > remPoly || retainedBibit > remBibit || retainedBibit > (activePoly * 2);
      if (saveBtn) {
        saveBtn.disabled = isCriticalError;
        saveBtn.style.opacity = isCriticalError ? '0.5' : '1';
        saveBtn.style.cursor = isCriticalError ? 'not-allowed' : 'pointer';
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
    const remBibit = parseInt(opt.getAttribute('data-remaining-bibit') || (remPoly * 2), 10);

    if (hiddenRemPoly) hiddenRemPoly.value = remPoly;
    if (hiddenRemBibit) hiddenRemBibit.value = remBibit;
    if (labelRefPoly) labelRefPoly.textContent = `${remPoly.toLocaleString('id-ID')} Ply`;
    if (labelRefBibit) labelRefBibit.textContent = `${remBibit.toLocaleString('id-ID')} Pkk`;

    if (inputActivePoly) {
      inputActivePoly.max = remPoly;
      inputActivePoly.value = remPoly;
    }
    if (inputRetainedBibit) {
      inputRetainedBibit.max = remBibit;
      inputRetainedBibit.value = remBibit;
    }
    updateCalculations();
  });

  inputActivePoly?.addEventListener('input', updateCalculations);
  inputRetainedBibit?.addEventListener('input', updateCalculations);

  document.getElementById('btn-modal-cancel-sel1')?.addEventListener('click', closeModal);

  document.getElementById('btn-modal-save-sel1')?.addEventListener('click', () => {
    const bedenganCode = selBed?.value || '';
    const remPoly = parseInt(hiddenRemPoly?.value || 0, 10);
    const remBibit = parseInt(hiddenRemBibit?.value || 0, 10);
    const activePoly = parseInt(inputActivePoly?.value || 0, 10);
    const retainedBibit = parseInt(inputRetainedBibit?.value || 0, 10);
    const tanggalSeleksi = today;
    const catatan = inputNotes?.value || '';

    // Validations
    if (activePoly > remPoly) {
      toast(`Jumlah polybag terisi bibit melebihi sisa scope (${remPoly.toLocaleString('id-ID')}).`, 'error');
      return;
    }
    if (retainedBibit > remBibit) {
      toast(`Jumlah bibit dipertahankan melebihi sisa scope (${remBibit.toLocaleString('id-ID')}).`, 'error');
      return;
    }
    if (retainedBibit > (activePoly * 2)) {
      toast(`Jumlah bibit dipertahankan (${retainedBibit}) tidak boleh melebihi 2x polybag terisi bibit (${activePoly * 2}).`, 'error');
      return;
    }

    try {
      const res = createSeleksi1ExecutionTransaction({
        selectionDocumentId: doc.id,
        selectionDocNo: doc.docNo,
        bedenganCode,
        polybagScope: remPoly,
        actualPolybagActiveQty: activePoly,
        actualBibitRetainedQty: retainedBibit,
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

  const initialRemainingPolybag = initialBed.remainingPolybag !== undefined ? initialBed.remainingPolybag : (doc.sourcePolybagQty || 0);
  const initialRemainingBibit = initialBed.remainingBibit !== undefined ? initialBed.remainingBibit : (doc.sourceBibitQty || initialRemainingPolybag);

  const bodyContent = `
    <div style="font-size: 0.82rem; color: #334155; line-height: 1.45;">
      
      <!-- HEADER INFO & DOKUMEN SUMBER -->
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
                ${esc(bed.bedenganCode)} (Sisa Polybag: ${bed.remainingPolybag.toLocaleString('id-ID')} / ${bed.initialPolybag.toLocaleString('id-ID')})
              </option>
            `).join('')}
          </select>
        </div>

        <!-- REFERENCE DARI DOKUMEN SEBELUMNYA (READ-ONLY) -->
        <div style="background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 12px;">
          <div style="font-size: 0.70rem; font-weight: 700; color: #475569; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.03em;">
            Reference dari Seleksi I Final (Read-Only)
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 10px;">
              <div style="font-size: 0.65rem; color: #64748B;">Sisa Polybag Tersedia</div>
              <div id="modal-sel2-ref-polybag" style="font-size: 0.88rem; font-weight: 800; color: #0F172A; margin-top: 1px;">
                ${initialRemainingPolybag.toLocaleString('id-ID')} Ply
              </div>
            </div>
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 10px;">
              <div style="font-size: 0.65rem; color: #64748B;">Sisa Bibit Tersedia</div>
              <div id="modal-sel2-ref-bibit" style="font-size: 0.88rem; font-weight: 800; color: #0F172A; margin-top: 1px;">
                ${initialRemainingBibit.toLocaleString('id-ID')} Pkk
              </div>
            </div>
          </div>
          <input type="hidden" id="modal-sel2-current-remaining-poly" value="${initialRemainingPolybag}">
          <input type="hidden" id="modal-sel2-current-remaining-bibit" value="${initialRemainingBibit}">
        </div>

        <!-- INPUT MANTRI (2 INPUT BARU) -->
        <div style="background: #FFFFFF; border: 1.5px solid #116834; border-radius: 8px; padding: 10px 12px;">
          <div style="font-size: 0.74rem; font-weight: 800; color: #116834; margin-bottom: 8px; text-transform: uppercase;">
            Input Pemeriksaan Mantri:
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <!-- 1. Jlh Polybag Terisi Bibit -->
            <div>
              <label style="display: block; font-size: 0.73rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
                1. Jlh Polybag Terisi Bibit <span style="color: #DC2626;">*</span>
              </label>
              <input id="modal-sel2-polybag-active" type="number" min="0" max="${initialRemainingPolybag}" value="${initialRemainingPolybag}" placeholder="0" style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; font-weight: 700; font-size: 0.88rem; box-sizing: border-box; color: #0F172A;">
              <div style="font-size: 0.62rem; color: #64748B; margin-top: 2px;">Polybag aktif (ada bibit)</div>
            </div>

            <!-- 2. Jlh Bibit Dipertahankan -->
            <div>
              <label style="display: block; font-size: 0.73rem; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
                2. Jlh Bibit Dipertahankan <span style="color: #DC2626;">*</span>
              </label>
              <input id="modal-sel2-bibit-retained" type="number" min="0" max="${initialRemainingBibit}" value="${initialRemainingPolybag}" placeholder="0" style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; font-weight: 700; font-size: 0.88rem; box-sizing: border-box; color: #15803D;">
              <div style="font-size: 0.62rem; color: #64748B; margin-top: 2px;">Bibit layak dipertahankan</div>
            </div>
          </div>
        </div>

        <!-- RINGKASAN OTOMATIS (4 METRIK AUTO) -->
        <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 12px; font-size: 0.74rem;">
          <div style="font-size: 0.70rem; font-weight: 700; color: #475569; margin-bottom: 6px; text-transform: uppercase;">
            Ringkasan Hasil Pemeriksaan (Auto):
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px;">
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 8px;">
              <span style="color: #64748B;">Ttl Polybag Tidak Aktif:</span>
              <div id="modal-sel2-sum-inactive-poly" style="font-size: 0.85rem; font-weight: 700; color: #DC2626; margin-top: 1px;">0 Ply</div>
            </div>
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 8px;">
              <span style="color: #64748B;">Ttl Bibit Diseleksi:</span>
              <div id="modal-sel2-sum-selected-bibit" style="font-size: 0.85rem; font-weight: 700; color: #DC2626; margin-top: 1px;">0 Pkk</div>
            </div>
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 8px;">
              <span style="color: #64748B;">Jlh Polybag Aktif:</span>
              <div id="modal-sel2-sum-active-poly" style="font-size: 0.85rem; font-weight: 700; color: #15803D; margin-top: 1px;">${initialRemainingPolybag.toLocaleString('id-ID')} Ply</div>
            </div>
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 8px;">
              <span style="color: #64748B;">Jlh Bibit Dipertahankan:</span>
              <div id="modal-sel2-sum-retained-bibit" style="font-size: 0.85rem; font-weight: 700; color: #15803D; margin-top: 1px;">${initialRemainingPolybag.toLocaleString('id-ID')} Pkk</div>
            </div>
          </div>
          <div id="modal-sel2-quota-warning" style="display: none; margin-top: 8px; padding: 6px 8px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 4px; color: #DC2626; font-size: 0.72rem; font-weight: 700;"></div>
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
  const inputActivePoly = document.getElementById('modal-sel2-polybag-active');
  const inputRetainedBibit = document.getElementById('modal-sel2-bibit-retained');
  const inputNotes = document.getElementById('modal-sel2-notes');
  const hiddenRemPoly = document.getElementById('modal-sel2-current-remaining-poly');
  const hiddenRemBibit = document.getElementById('modal-sel2-current-remaining-bibit');
  const labelRefPoly = document.getElementById('modal-sel2-ref-polybag');
  const labelRefBibit = document.getElementById('modal-sel2-ref-bibit');

  const sumInactivePoly = document.getElementById('modal-sel2-sum-inactive-poly');
  const sumSelectedBibit = document.getElementById('modal-sel2-sum-selected-bibit');
  const sumActivePoly = document.getElementById('modal-sel2-sum-active-poly');
  const sumRetainedBibit = document.getElementById('modal-sel2-sum-retained-bibit');
  const warningEl = document.getElementById('modal-sel2-quota-warning');
  const saveBtn = document.getElementById('btn-modal-save-sel2');

  function updateCalculations() {
    const remPoly = parseInt(hiddenRemPoly?.value || 0, 10);
    const remBibit = parseInt(hiddenRemBibit?.value || 0, 10);
    const activePoly = parseInt(inputActivePoly?.value || 0, 10);
    const retainedBibit = parseInt(inputRetainedBibit?.value || 0, 10);

    const inactivePoly = Math.max(0, remPoly - activePoly);
    const selectedBibit = remBibit;

    if (sumInactivePoly) sumInactivePoly.textContent = `${inactivePoly.toLocaleString('id-ID')} Ply`;
    if (sumSelectedBibit) sumSelectedBibit.textContent = `${selectedBibit.toLocaleString('id-ID')} Pkk`;
    if (sumActivePoly) sumActivePoly.textContent = `${activePoly.toLocaleString('id-ID')} Ply`;
    if (sumRetainedBibit) sumRetainedBibit.textContent = `${retainedBibit.toLocaleString('id-ID')} Pkk`;

    let errorMsg = null;

    if (isNaN(activePoly) || activePoly < 0) {
      errorMsg = 'Jumlah polybag terisi bibit tidak valid.';
    } else if (isNaN(retainedBibit) || retainedBibit < 0) {
      errorMsg = 'Jumlah bibit dipertahankan tidak valid.';
    } else if (activePoly > remPoly) {
      errorMsg = `Jumlah polybag terisi bibit (${activePoly.toLocaleString('id-ID')}) melebihi sisa scope polybag (${remPoly.toLocaleString('id-ID')}).`;
    } else if (retainedBibit > remBibit) {
      errorMsg = `Jumlah bibit dipertahankan (${retainedBibit.toLocaleString('id-ID')}) melebihi sisa scope bibit (${remBibit.toLocaleString('id-ID')}).`;
    } else if (activePoly === 0 && retainedBibit === 0 && remPoly > 0) {
      errorMsg = 'Peringatan: Seluruh populasi akan dinyatakan afkir/kosong.';
    }

    if (errorMsg) {
      if (warningEl) {
        warningEl.textContent = errorMsg;
        warningEl.style.display = 'block';
      }
      const isCriticalError = activePoly > remPoly || retainedBibit > remBibit;
      if (saveBtn) {
        saveBtn.disabled = isCriticalError;
        saveBtn.style.opacity = isCriticalError ? '0.5' : '1';
        saveBtn.style.cursor = isCriticalError ? 'not-allowed' : 'pointer';
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
    const remBibit = parseInt(opt.getAttribute('data-remaining-bibit') || 0, 10);

    if (hiddenRemPoly) hiddenRemPoly.value = remPoly;
    if (hiddenRemBibit) hiddenRemBibit.value = remBibit;
    if (labelRefPoly) labelRefPoly.textContent = `${remPoly.toLocaleString('id-ID')} Ply`;
    if (labelRefBibit) labelRefBibit.textContent = `${remBibit.toLocaleString('id-ID')} Pkk`;

    if (inputActivePoly) {
      inputActivePoly.max = remPoly;
      inputActivePoly.value = remPoly;
    }
    if (inputRetainedBibit) {
      inputRetainedBibit.max = remBibit;
      inputRetainedBibit.value = remPoly;
    }
    updateCalculations();
  });

  inputActivePoly?.addEventListener('input', updateCalculations);
  inputRetainedBibit?.addEventListener('input', updateCalculations);

  document.getElementById('btn-modal-cancel-sel2')?.addEventListener('click', closeModal);

  document.getElementById('btn-modal-save-sel2')?.addEventListener('click', () => {
    const bedenganCode = selBed?.value || '';
    const remPoly = parseInt(hiddenRemPoly?.value || 0, 10);
    const remBibit = parseInt(hiddenRemBibit?.value || 0, 10);
    const activePoly = parseInt(inputActivePoly?.value || 0, 10);
    const retainedBibit = parseInt(inputRetainedBibit?.value || 0, 10);
    const tanggalSeleksi = today;
    const catatan = inputNotes?.value || '';

    // Validations
    if (activePoly > remPoly) {
      toast(`Jumlah polybag terisi bibit melebihi sisa scope (${remPoly.toLocaleString('id-ID')}).`, 'error');
      return;
    }
    if (retainedBibit > remBibit) {
      toast(`Jumlah bibit dipertahankan melebihi sisa scope (${remBibit.toLocaleString('id-ID')}).`, 'error');
      return;
    }

    try {
      const res = createSeleksi2ExecutionTransaction({
        selectionDocumentId: doc.id,
        selectionDocNo: doc.docNo,
        bedenganCode,
        polybagScope: remPoly,
        actualPolybagActiveQty: activePoly,
        actualBibitRetainedQty: retainedBibit,
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

        <!-- REFERENCE (READ-ONLY) DOKUMEN SEBELUMNYA / SISA SCOPE -->
        <div style="background: #F1F5F9; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 12px;">
          <div style="font-size: 0.70rem; font-weight: 800; color: #475569; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
            Referensi Dokumen Sebelumnya (Seleksi II / Sisa Scope):
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 10px;">
              <div style="font-size: 0.68rem; color: #64748B;">Sisa Polybag Tersedia</div>
              <div id="modal-sel3-ref-poly" style="font-size: 0.92rem; font-weight: 800; color: #0F172A;">${initialScopePoly.toLocaleString('id-ID')} Ply</div>
            </div>
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 10px;">
              <div style="font-size: 0.68rem; color: #64748B;">Sisa Bibit Tersedia</div>
              <div id="modal-sel3-ref-bibit" style="font-size: 0.92rem; font-weight: 800; color: #0F172A;">${initialScopeBibit.toLocaleString('id-ID')} Pkk</div>
            </div>
          </div>
          <input type="hidden" id="modal-sel3-current-remaining-poly" value="${initialScopePoly}">
          <input type="hidden" id="modal-sel3-current-remaining-bibit" value="${initialScopeBibit}">
        </div>

        <!-- INPUT MANTRI (AKTUAL) -->
        <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 12px;">
          <div style="font-size: 0.74rem; font-weight: 800; color: #0F172A; margin-bottom: 8px; text-transform: uppercase;">
            Input Pemeriksaan Aktual Mantri:
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="flex: 1;">
                <div style="font-size: 0.74rem; font-weight: 700; color: #0F172A;">1. Jlh Polybag Terisi Bibit</div>
                <div style="font-size: 0.65rem; color: #64748B;">Polybag aktif dengan tanaman hidup</div>
              </div>
              <div style="width: 120px;">
                <input id="modal-sel3-actual-poly" type="number" min="0" max="${initialScopePoly}" value="${initialScopePoly}" style="width: 100%; height: 34px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; text-align: right; font-weight: 700; box-sizing: border-box;">
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="flex: 1;">
                <div style="font-size: 0.74rem; font-weight: 700; color: #15803D;">2. Jlh Bibit Dipertahankan</div>
                <div style="font-size: 0.65rem; color: #64748B;">Bibit sehat & siap okulasi (1 Ply = 1 Bibit)</div>
              </div>
              <div style="width: 120px;">
                <input id="modal-sel3-actual-bibit" type="number" min="0" max="${initialScopeBibit}" value="${initialScopePoly}" style="width: 100%; height: 34px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; text-align: right; font-weight: 700; box-sizing: border-box;">
              </div>
            </div>

          </div>
        </div>

        <!-- RINGKASAN DERIVED (AUTO) -->
        <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 12px;">
          <div style="font-size: 0.70rem; font-weight: 800; color: #475569; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
            Ringkasan Hasil Seleksi III (Otomatis):
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; font-size: 0.74rem;">
            <div>1. Ttl Polybag Tidak Aktif: <strong id="modal-sel3-sum-inactive-poly" style="color: #DC2626;">0</strong> Ply</div>
            <div>2. Ttl Bibit Diseleksi: <strong id="modal-sel3-sum-selected-bibit" style="color: #DC2626;">0</strong> Pkk</div>
            <div>3. Jlh Polybag Aktif: <strong id="modal-sel3-sum-active-poly" style="color: #15803D;">${initialScopePoly.toLocaleString('id-ID')}</strong> Ply</div>
            <div>4. Jlh Bibit Dipertahankan: <strong id="modal-sel3-sum-retained-bibit" style="color: #15803D;">${initialScopePoly.toLocaleString('id-ID')}</strong> Pkk</div>
          </div>
          <div id="modal-sel3-quota-warning" style="display: none; margin-top: 8px; padding: 6px 8px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 4px; color: #DC2626; font-size: 0.72rem; font-weight: 700;"></div>
        </div>

        <!-- TANGGAL TRANSAKSI (READ-ONLY) & CATATAN -->
        <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 8px;">
          <div>
            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 2px;">Tanggal Transaksi</label>
            <input id="modal-sel3-date" type="text" value="${today}" readonly disabled style="width: 100%; height: 36px; border: 1px solid #E2E8F0; border-radius: 6px; padding: 0 8px; font-size: 0.78rem; background: #F1F5F9; color: #475569; cursor: not-allowed; box-sizing: border-box;">
          </div>
          <div>
            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 2px;">Catatan (Opsional)</label>
            <input id="modal-sel3-notes" type="text" placeholder="Catatan seleksi..." style="width: 100%; height: 36px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; font-size: 0.78rem; box-sizing: border-box;">
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
    title: 'Pelaksanaan Seleksi III (Pra-Okulasi)',
    body: bodyContent
  });

  const selBed = document.getElementById('modal-sel3-bedengan');
  const inputActivePoly = document.getElementById('modal-sel3-actual-poly');
  const inputRetainedBibit = document.getElementById('modal-sel3-actual-bibit');
  const inputNotes = document.getElementById('modal-sel3-notes');
  const hiddenRemPoly = document.getElementById('modal-sel3-current-remaining-poly');
  const hiddenRemBibit = document.getElementById('modal-sel3-current-remaining-bibit');
  const labelRefPoly = document.getElementById('modal-sel3-ref-poly');
  const labelRefBibit = document.getElementById('modal-sel3-ref-bibit');

  const sumInactivePoly = document.getElementById('modal-sel3-sum-inactive-poly');
  const sumSelectedBibit = document.getElementById('modal-sel3-sum-selected-bibit');
  const sumActivePoly = document.getElementById('modal-sel3-sum-active-poly');
  const sumRetainedBibit = document.getElementById('modal-sel3-sum-retained-bibit');
  const warningEl = document.getElementById('modal-sel3-quota-warning');
  const saveBtn = document.getElementById('btn-modal-save-sel3');

  function updateCalculations() {
    const remPoly = parseInt(hiddenRemPoly?.value || 0, 10);
    const remBibit = parseInt(hiddenRemBibit?.value || 0, 10);
    const activePoly = parseInt(inputActivePoly?.value || 0, 10);
    const retainedBibit = parseInt(inputRetainedBibit?.value || 0, 10);

    const inactivePoly = Math.max(0, remPoly - activePoly);
    const selectedBibit = remBibit;

    if (sumInactivePoly) sumInactivePoly.textContent = inactivePoly.toLocaleString('id-ID');
    if (sumSelectedBibit) sumSelectedBibit.textContent = selectedBibit.toLocaleString('id-ID');
    if (sumActivePoly) sumActivePoly.textContent = activePoly.toLocaleString('id-ID');
    if (sumRetainedBibit) sumRetainedBibit.textContent = retainedBibit.toLocaleString('id-ID');

    let errorMsg = null;
    if (isNaN(activePoly) || activePoly < 0) {
      errorMsg = 'Jumlah polybag terisi bibit tidak boleh negatif.';
    } else if (isNaN(retainedBibit) || retainedBibit < 0) {
      errorMsg = 'Jumlah bibit dipertahankan tidak boleh negatif.';
    } else if (activePoly > remPoly) {
      errorMsg = `Jumlah polybag terisi bibit (${activePoly.toLocaleString('id-ID')}) melebihi sisa scope (${remPoly.toLocaleString('id-ID')}).`;
    } else if (retainedBibit > remBibit) {
      errorMsg = `Jumlah bibit dipertahankan (${retainedBibit.toLocaleString('id-ID')}) melebihi sisa scope (${remBibit.toLocaleString('id-ID')}).`;
    } else if (activePoly === 0 && retainedBibit === 0 && remPoly > 0) {
      errorMsg = 'Peringatan: Seluruh populasi akan dinyatakan afkir/kosong.';
    }

    if (errorMsg) {
      if (warningEl) {
        warningEl.textContent = errorMsg;
        warningEl.style.display = 'block';
      }
      const isCriticalError = activePoly > remPoly || retainedBibit > remBibit;
      if (saveBtn) {
        saveBtn.disabled = isCriticalError;
        saveBtn.style.opacity = isCriticalError ? '0.5' : '1';
        saveBtn.style.cursor = isCriticalError ? 'not-allowed' : 'pointer';
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
    const remBibit = parseInt(opt.getAttribute('data-remaining-bibit') || 0, 10);

    if (hiddenRemPoly) hiddenRemPoly.value = remPoly;
    if (hiddenRemBibit) hiddenRemBibit.value = remBibit;
    if (labelRefPoly) labelRefPoly.textContent = `${remPoly.toLocaleString('id-ID')} Ply`;
    if (labelRefBibit) labelRefBibit.textContent = `${remBibit.toLocaleString('id-ID')} Pkk`;

    if (inputActivePoly) {
      inputActivePoly.max = remPoly;
      inputActivePoly.value = remPoly;
    }
    if (inputRetainedBibit) {
      inputRetainedBibit.max = remBibit;
      inputRetainedBibit.value = remPoly;
    }
    updateCalculations();
  });

  inputActivePoly?.addEventListener('input', updateCalculations);
  inputRetainedBibit?.addEventListener('input', updateCalculations);

  document.getElementById('btn-modal-cancel-sel3')?.addEventListener('click', closeModal);

  document.getElementById('btn-modal-save-sel3')?.addEventListener('click', () => {
    const bedenganCode = selBed?.value || '';
    const remPoly = parseInt(hiddenRemPoly?.value || 0, 10);
    const remBibit = parseInt(hiddenRemBibit?.value || 0, 10);
    const activePoly = parseInt(inputActivePoly?.value || 0, 10);
    const retainedBibit = parseInt(inputRetainedBibit?.value || 0, 10);
    const tanggalSeleksi = today;
    const catatan = inputNotes?.value || '';

    // Validations
    if (activePoly > remPoly) {
      toast(`Jumlah polybag terisi bibit melebihi sisa scope (${remPoly.toLocaleString('id-ID')}).`, 'error');
      return;
    }
    if (retainedBibit > remBibit) {
      toast(`Jumlah bibit dipertahankan melebihi sisa scope (${remBibit.toLocaleString('id-ID')}).`, 'error');
      return;
    }

    try {
      const res = createSeleksi3ExecutionTransaction({
        selectionDocumentId: doc.id,
        selectionDocNo: doc.docNo,
        bedenganCode,
        polybagScope: remPoly,
        actualPolybagActiveQty: activePoly,
        actualBibitRetainedQty: retainedBibit,
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

