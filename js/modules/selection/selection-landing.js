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
  getSeleksi2ExecutionsByDocument,
  getBedenganScopeStatusForSeleksi2,
  validateSeleksi2Execution,
  createSeleksi2ExecutionTransaction,
  getSeleksi3ExecutionsByDocument,
  getBedenganScopeStatusForSeleksi3,
  validateSeleksi3Execution,
  createSeleksi3ExecutionTransaction
} from './selection-manager.js';
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
  getSeleksi2ExecutionsByDocument,
  getBedenganScopeStatusForSeleksi2,
  validateSeleksi2Execution,
  createSeleksi2ExecutionTransaction
};

let activeAsbTab = 'PENDING'; // 'PENDING' | 'HISTORY'
let activeMantriTab = 'PRE_GRAFTING'; // 'PRE_GRAFTING' | 'POST_GRAFTING'
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
        
        ${(activeAsbTab === 'PENDING' ? totalPendingCount : totalHistoryCount) === 0 ? `
          <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 40px 20px; text-align: center; margin-top: 10px;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; color: #64748B;">
              <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="2" fill="none">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h3 style="font-size: 0.95rem; font-weight: 700; color: #1E293B; margin: 0 0 4px 0;">
              ${activeAsbTab === 'PENDING' ? 'Tidak Ada Pengajuan Seleksi' : 'Belum Ada Riwayat'}
            </h3>
            <p style="font-size: 0.78rem; color: #64748B; margin: 0; line-height: 1.45;">
              ${activeAsbTab === 'PENDING' 
                ? 'Semua hasil seleksi bibit dari Mantri telah diperiksa atau belum ada pengajuan baru.' 
                : 'Daftar hasil seleksi yang telah disetujui atau dikembalikan akan tampil di sini.'}
            </p>
          </div>
        ` : `
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
              const stageBadgeText = isSeleksi3 ? 'SELEKSI III (PRA-OKULASI)' : (isSeleksi2 ? 'SELEKSI II (PRA-OKULASI)' : 'SELEKSI I (PRA-OKULASI)');
              const stageLabel = isSeleksi3 ? 'Seleksi III' : (isSeleksi2 ? 'Seleksi II' : 'Seleksi I');

              let statusBadge = `<span style="font-size: 0.68rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A;">MENUNGGU PEMERIKSAAN</span>`;
              if (isApproved) {
                statusBadge = `<span style="font-size: 0.68rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0;">DISETUJUI (FINAL)</span>`;
              } else if (isReturned) {
                statusBadge = `<span style="font-size: 0.68rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA;">DIKEMBALIKAN</span>`;
              }

              return `
                <div class="card-pre-grafting-asb" data-id="${esc(doc.id)}" style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 10px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                  
                  <!-- HEADER DOKUMEN -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 0.64rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: #EEF2FF; color: #3730A3; border: 1px solid #C7D2FE;">
                          ${stageBadgeText}
                        </span>
                        <strong style="font-size: 0.95rem; color: #0F172A;">${esc(doc.docNo)}</strong>
                      </div>
                      <div style="font-size: 0.74rem; color: #64748B; margin-top: 3px;">
                        ${isSeleksi3 ? `
                          Sumber Seleksi II: <strong style="color: #1E293B;">${esc(doc.sourceSelectionDocNo || doc.sourceDocNo || '-')}</strong>
                          ${doc.sourceSelection1DocNo && doc.sourceSelection1DocNo !== '-' ? `<span style="color: #94A3B8; margin-left: 6px;">(Seleksi I: ${esc(doc.sourceSelection1DocNo)})</span>` : ''}
                          ${doc.sourceSeedingDocNo && doc.sourceSeedingDocNo !== '-' ? `<span style="color: #94A3B8; margin-left: 6px;">(Penyemaian: ${esc(doc.sourceSeedingDocNo)})</span>` : ''}
                        ` : (isSeleksi2 ? `
                          Sumber Seleksi I: <strong style="color: #1E293B;">${esc(doc.sourceSelectionDocNo || doc.sourceDocNo || '-')}</strong>
                          ${doc.sourceSeedingDocNo && doc.sourceSeedingDocNo !== '-' ? `<span style="color: #94A3B8; margin-left: 6px;">(Penyemaian: ${esc(doc.sourceSeedingDocNo)})</span>` : ''}
                        ` : `
                          Sumber Penyemaian: <strong style="color: #1E293B;">${esc(doc.sourceDocNo || '-')}</strong>
                        `)}
                      </div>
                    </div>
                    <div>
                      ${statusBadge}
                    </div>
                  </div>

                  <!-- METADATA BATCH & BEDENGAN -->
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; font-size: 0.73rem; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; margin-bottom: 10px;">
                    <div>Batch: <strong style="color: #0F172A;">${esc(doc.batchCode || '-')}</strong></div>
                    <div>Klon: <strong style="color: #0F172A;">${esc(doc.clone || doc.klon || '-')}</strong></div>
                    <div>Bedengan: <strong style="color: #0F172A;">${esc(bedDisplay)}</strong></div>
                    <div>Program: <strong style="color: #0F172A;">${esc(doc.programCode || doc.programName || '-')}</strong></div>
                  </div>

                  <!-- 4-KOLOM METRIK AGREGAT DOKUMEN -->
                  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px; background: #FFFFFF; margin-bottom: 10px;">
                    <div>
                      <div style="font-size: 0.60rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Polybag Source</div>
                      <div style="font-size: 0.90rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${sourcePolybag.toLocaleString('id-ID')}</div>
                      <div style="font-size: 0.60rem; color: #94A3B8;">Ply</div>
                    </div>
                    <div style="border-left: 1px solid #E2E8F0;">
                      <div style="font-size: 0.60rem; font-weight: 700; color: #64748B; text-transform: uppercase;">${isSeleksi2 || isSeleksi3 ? 'Bibit Source' : 'Bibit Awal'}</div>
                      <div style="font-size: 0.90rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${sourceBibit.toLocaleString('id-ID')}</div>
                      <div style="font-size: 0.60rem; color: #94A3B8;">Pkk</div>
                    </div>
                    <div style="border-left: 1px solid #E2E8F0;">
                      <div style="font-size: 0.60rem; font-weight: 700; color: #15803D; text-transform: uppercase;">Dipertahankan</div>
                      <div style="font-size: 0.90rem; font-weight: 800; color: #15803D; margin-top: 2px;">${totalLayak.toLocaleString('id-ID')}</div>
                      <div style="font-size: 0.60rem; color: #15803D;">${isSeleksi2 ? 'Pkk (1/Ply)' : 'Pkk'}</div>
                    </div>
                    <div style="border-left: 1px solid #E2E8F0;">
                      <div style="font-size: 0.60rem; font-weight: 700; color: #DC2626; text-transform: uppercase;">Reject ${stageLabel}</div>
                      <div style="font-size: 0.90rem; font-weight: 800; color: #DC2626; margin-top: 2px;">${totalAfkir.toLocaleString('id-ID')}</div>
                      <div style="font-size: 0.60rem; color: #DC2626;">Pkk</div>
                    </div>
                  </div>

                  <!-- DETAIL SESI PELAKSANAAN CHILD -->
                  <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px; margin-bottom: 10px;">
                    <div style="font-size: 0.70rem; font-weight: 700; color: #475569; margin-bottom: 6px;">
                      Daftar Sesi Pelaksanaan ${stageLabel} (${executions.length} Sesi):
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                      ${executions.map(tx => `
                        <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 8px; font-size: 0.70rem; display: flex; justify-content: space-between; align-items: center;">
                          <div>
                            <div><strong style="color: #0F172A;">${esc(tx.bedenganCode || '-')}</strong> • ${esc(tx.docNo)}</div>
                            <div style="color: #64748B; font-size: 0.65rem; margin-top: 1px;">
                              ${isSeleksi3
                                ? `${tx.polybagScope || tx.initialPolybagCount || 0} Ply (${tx.bibitAwal || 0} Pkk) • ${esc(tx.tanggalSeleksi || tx.tanggal)}`
                                : (isSeleksi2 
                                    ? `${tx.polybagScope} Ply (${tx.polybag2Bibit || 0}x2→1, ${tx.polybag1Bibit || 0}x1→1, ${tx.polybag0Bibit || 0}x0) • ${esc(tx.tanggalSeleksi || tx.tanggal)}`
                                    : `${tx.polybagScope} Ply (${tx.polybag2Bibit || 0}x2, ${tx.polybag1Bibit || 0}x1, ${tx.polybag0Bibit || 0}x0) • ${esc(tx.tanggalSeleksi || tx.tanggal)}`)}
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

                  <!-- METADATA SUBMISSION / VERIFICATION -->
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.70rem; color: #64748B; margin-bottom: ${isActionable ? '10px' : '0'};">
                    <div>
                      Diajukan oleh: <strong>${esc(doc.submittedByName || doc.completedByName || 'Mantri Bibitan')}</strong>
                    </div>
                    <div>
                      ${esc(doc.submittedAt ? formatDate(doc.submittedAt) : (doc.completedAt ? formatDate(doc.completedAt) : '-'))}
                    </div>
                  </div>

                  ${isReturned && doc.returnReason ? `
                    <div style="margin-top: 8px; padding: 6px 10px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; font-size: 0.72rem; color: #991B1B;">
                      <strong>Alasan Pengembalian:</strong> ${esc(doc.returnReason)}
                    </div>
                  ` : ''}

                  <!-- AKSI ASISTEN BIBITAN UNTUK PRE-GRAFTING DOC -->
                  ${isActionable ? `
                    <div style="display: flex; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #F1F5F9;">
                      <button type="button" class="btn-asb-pre-return" data-id="${esc(doc.id)}" style="flex: 1; height: 36px; background: #FFFFFF; color: #DC2626; border: 1px solid #FCA5A5; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                          <polyline points="9 14 4 9 9 4"></polyline>
                          <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                        </svg>
                        Kembalikan ke Mantri
                      </button>
                      <button type="button" class="btn-asb-pre-approve" data-id="${esc(doc.id)}" style="flex: 1.3; height: 36px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; box-shadow: 0 1px 2px rgba(17,104,52,0.2);">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Setujui Dokumen ${stageLabel}
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

              let statusBadge = `<span style="font-size: 0.68rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A;">MENUNGGU PEMERIKSAAN</span>`;
              if (isApproved) {
                statusBadge = `<span style="font-size: 0.68rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: #F0FDF4; color: #15803D; border: 1px solid #BBF7D0;">DISETUJUI</span>`;
              } else if (isReturned) {
                statusBadge = `<span style="font-size: 0.68rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: #FEF2F2; color: #B91C1C; border: 1px solid #FECACA;">DIKEMBALIKAN</span>`;
              }

              return `
                <div class="card-selection-item" data-id="${esc(item.id)}" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
                  
                  <!-- HEADER BARIS 1 -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <div>
                      <div style="font-weight: 800; font-size: 0.95rem; color: #0F172A;">
                        ${esc(item.batchCode || item.batchNo || 'Batch')} • ${esc(item.clone || item.klon || '-')}
                      </div>
                      <div style="font-size: 0.74rem; color: #64748B; margin-top: 2px;">
                        ${esc(item.programName || item.programId || 'Program Pembibitan')}
                      </div>
                    </div>
                    <div>
                      ${statusBadge}
                    </div>
                  </div>

                  <!-- METADATA BARIS 2 -->
                  <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #64748B; margin-bottom: 10px; border-bottom: 1px dashed #E2E8F0; padding-bottom: 8px;">
                    <div>
                      Bedengan: <strong style="color: #334155;">${esc(item.bedengan || (item.bedenganIds ? item.bedenganIds.join(', ') : '-'))}</strong>
                    </div>
                    <div>
                      Dok: <strong style="color: #334155;">${esc(item.docNo || item.selectionNo || '-')}</strong>
                    </div>
                  </div>

                  <!-- 3-KOLOM METRIK SELEKSI -->
                  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px; margin-bottom: 10px; text-align: center;">
                    <div>
                      <div style="font-size: 0.65rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Diperiksa</div>
                      <div style="font-size: 0.92rem; font-weight: 800; color: #0F172A; margin-top: 2px;">
                        ${checked.toLocaleString('id-ID')}
                      </div>
                      <div style="font-size: 0.64rem; color: #94A3B8;">100%</div>
                    </div>
                    <div style="border-left: 1px solid #E2E8F0; border-right: 1px solid #E2E8F0;">
                      <div style="font-size: 0.65rem; font-weight: 700; color: #15803D; text-transform: uppercase;">Layak</div>
                      <div style="font-size: 0.92rem; font-weight: 800; color: #15803D; margin-top: 2px;">
                        ${pass.toLocaleString('id-ID')}
                      </div>
                      <div style="font-size: 0.64rem; color: #15803D; font-weight: 600;">${passPct}%</div>
                    </div>
                    <div>
                      <div style="font-size: 0.65rem; font-weight: 700; color: #DC2626; text-transform: uppercase;">Afkir</div>
                      <div style="font-size: 0.92rem; font-weight: 800; color: #DC2626; margin-top: 2px;">
                        ${cull.toLocaleString('id-ID')}
                      </div>
                      <div style="font-size: 0.64rem; color: #DC2626; font-weight: 600;">${cullPct}%</div>
                    </div>
                  </div>

                  <!-- METADATA SUBMISSION -->
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.70rem; color: #64748B; margin-bottom: ${isActionable ? '12px' : '0'};">
                    <div>
                      Diajukan oleh: <strong>${esc(item.createdByName || item.mantri || 'Mantri')}</strong>
                    </div>
                    <div>
                      ${esc(item.tanggalSeleksi || item.tanggal || '-')}
                    </div>
                  </div>

                  <!-- AKSI ASISTEN BIBITAN (JIKA ACTIONABLE) -->
                  ${isActionable ? `
                    <div style="display: flex; gap: 8px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #F1F5F9;">
                      <button type="button" class="btn-asb-return" data-id="${esc(item.id)}" style="flex: 1; height: 36px; background: #FFFFFF; color: #DC2626; border: 1px solid #FCA5A5; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none">
                          <polyline points="9 14 4 9 9 4"></polyline>
                          <path d="M20 20v-7a4 4 0 0 0-4-4H4"></path>
                        </svg>
                        Kembalikan
                      </button>
                      <button type="button" class="btn-asb-approve" data-id="${esc(item.id)}" style="flex: 1.3; height: 36px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; box-shadow: 0 1px 2px rgba(17,104,52,0.2);">
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none">
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

  // Post-Grafting Afkir items (Hanya REJECT_OKULASI, REJECT_PEMERIKSAAN, REJECT_REGRAFTING)
  const isPostGraftingReject = (item) => (
    item && (
      item.originType === 'REJECT_OKULASI' ||
      item.originType === 'REJECT_PEMERIKSAAN' ||
      item.originType === 'REJECT_REGRAFTING'
    )
  );
  let rawSelectionPool = storage.get('selection_pool', []);
  rawSelectionPool = rawSelectionPool.filter(item => isPostGraftingReject(item) && !findExistingSelectionTransaction(item));
  let selectionPool = filterSelectionByScope(rawSelectionPool, user);
  const allCulledTxs = storage.get('selection_transactions', []);
  const culledTxs = filterSelectionByScope(allCulledTxs, user).filter(tx => !tx.selectionDocumentId && !tx.parentSelectionDocumentId && tx.selectionType !== SELECTION_TYPES.PRA_OKULASI);

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

      <!-- TAB NAVIGATION MANTRI: PRA-OKULASI vs PASCA-OKULASI -->
      <div style="display: flex; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; padding: 0 16px; gap: 16px;">
        <button id="tab-mantri-pre-grafting" type="button" style="padding: 12px 4px; font-size: 0.82rem; font-weight: ${activeMantriTab === 'PRE_GRAFTING' ? '700' : '600'}; color: ${activeMantriTab === 'PRE_GRAFTING' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeMantriTab === 'PRE_GRAFTING' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <span>Seleksi Pra-Okulasi</span>
          ${preGraftingDocs.length > 0 ? `<span style="background: #116834; color: #FFFFFF; font-size: 0.68rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">${preGraftingDocs.length}</span>` : ''}
        </button>
        <button id="tab-mantri-post-grafting" type="button" style="padding: 12px 4px; font-size: 0.82rem; font-weight: ${activeMantriTab === 'POST_GRAFTING' ? '700' : '600'}; color: ${activeMantriTab === 'POST_GRAFTING' ? '#116834' : '#64748B'}; border: none; border-bottom: 2.5px solid ${activeMantriTab === 'POST_GRAFTING' ? '#116834' : 'transparent'}; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 6px;">
          <span>Bibit Afkir Pasca-Okulasi</span>
          ${selectionPool.length > 0 ? `<span class="notif-dot" style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #DC2626; margin-left: 2px;"></span>` : ''}
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

            ${seleksi1Docs.length === 0 ? `
              <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 40px 20px; text-align: center; margin-top: 10px;">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; color: #64748B;">
                  <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="2" fill="none">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h3 style="font-size: 0.95rem; font-weight: 700; color: #0F172A; margin: 0 0 4px 0;">Belum Ada Dokumen Seleksi I</h3>
                <p style="font-size: 0.78rem; color: #64748B; margin: 0; line-height: 1.45;">Dokumen seleksi pra-okulasi otomatis dibentuk saat transaksi Penyemaian dicatat.</p>
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
                ${seleksi1Docs.map(doc => {
                  const bedScopeList = getBedenganScopeStatusForSeleksi1(doc);
                  const executions = getSeleksi1ExecutionsByDocument(doc.id || doc.docNo);
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
                  const totalDiperiksa = parseInt(doc.totalDiperiksa || 0, 10);
                  const currentBibit = parseInt(doc.currentBibitQty || sourceBibit, 10);

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
                    badgeText = 'DISETUJUI (FINAL)';
                    badgeBg = '#F0FDF4';
                    badgeColor = '#15803D';
                    badgeBorder = '#BBF7D0';
                  } else if (isReturned) {
                    badgeText = 'DIKEMBALIKAN';
                    badgeBg = '#FEF2F2';
                    badgeColor = '#DC2626';
                    badgeBorder = '#FECACA';
                  } else if (isSubmitted) {
                    badgeText = 'MENUNGGU VERIFIKASI ASISTEN';
                    badgeBg = '#EFF6FF';
                    badgeColor = '#1D4ED8';
                    badgeBorder = '#BFDBFE';
                  } else if (isCompleted) {
                    badgeText = 'SELESAI (SIAP REVIEW)';
                    badgeBg = '#F0FDF4';
                    badgeColor = '#15803D';
                    badgeBorder = '#BBF7D0';
                  } else if (executions.length > 0) {
                    badgeText = 'SEDANG BERJALAN';
                    badgeBg = '#FEF3C7';
                    badgeColor = '#B45309';
                    badgeBorder = '#FDE68A';
                  }

                  return `
                    <div class="card-pre-grafting-doc" data-id="${esc(doc.id)}" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); display: flex; flex-direction: column; gap: 10px;">
                      
                      <!-- 1. HEADER CARD: DOK NO & STATUS -->
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                        <div>
                          <div style="font-weight: 800; font-size: 0.96rem; color: #0F172A;">
                            ${esc(doc.docNo || doc.selectionDocNo)}
                          </div>
                          <div style="font-size: 0.72rem; color: #64748B; margin-top: 1px;">
                            Sumber Penyemaian: <strong style="color: #0F172A;">${esc(doc.sourceDocNo || '-')}</strong>
                          </div>
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                          <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">
                            ${badgeText}
                          </span>
                          <span style="font-size: 0.62rem; color: #94A3B8;">${executions.length} Sesi Transaksi</span>
                        </div>
                      </div>

                      <!-- 2. BATCH & SCOPE INFO -->
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; font-size: 0.73rem; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px;">
                        <div>Batch: <strong style="color: #0F172A;">${esc(doc.batchCode || doc.batchNo || '-')}</strong></div>
                        <div>Klon: <strong style="color: #0F172A;">${esc(doc.clone || doc.klon || '-')}</strong></div>
                        <div>Bedengan: <strong style="color: #0F172A;">${esc(bedDisplay)}</strong></div>
                        <div>Program: <strong style="color: #0F172A;">${esc(doc.programCode || doc.programName || '-')}</strong></div>
                      </div>

                      <!-- 3. POPULATION & RESULT METRICS (4-KOLOM) -->
                      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px; background: #FFFFFF;">
                        <div>
                          <div style="font-size: 0.60rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Polybag Source</div>
                          <div style="font-size: 0.90rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${sourcePolybag.toLocaleString('id-ID')}</div>
                          <div style="font-size: 0.60rem; color: #94A3B8;">Ply</div>
                        </div>
                        <div style="border-left: 1px solid #E2E8F0;">
                          <div style="font-size: 0.60rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Bibit Awal</div>
                          <div style="font-size: 0.90rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${sourceBibit.toLocaleString('id-ID')}</div>
                          <div style="font-size: 0.60rem; color: #94A3B8;">Pkk (2/Ply)</div>
                        </div>
                        <div style="border-left: 1px solid #E2E8F0;">
                          <div style="font-size: 0.60rem; font-weight: 700; color: #15803D; text-transform: uppercase;">Dipertahankan</div>
                          <div style="font-size: 0.90rem; font-weight: 800; color: #15803D; margin-top: 2px;">${totalLayak.toLocaleString('id-ID')}</div>
                          <div style="font-size: 0.60rem; color: #15803D;">Pkk</div>
                        </div>
                        <div style="border-left: 1px solid #E2E8F0;">
                          <div style="font-size: 0.60rem; font-weight: 700; color: #DC2626; text-transform: uppercase;">Reject Seleksi I</div>
                          <div style="font-size: 0.90rem; font-weight: 800; color: #DC2626; margin-top: 2px;">${totalAfkir.toLocaleString('id-ID')}</div>
                          <div style="font-size: 0.60rem; color: #DC2626;">Pkk</div>
                        </div>
                      </div>

                      <!-- 4. RIWAYAT SESI PELAKSANAAN SELEKSI I (JIKA ADA) -->
                      ${executions.length > 0 ? `
                        <div style="border-top: 1px dashed #CBD5E1; padding-top: 8px;">
                          <div style="font-size: 0.70rem; font-weight: 700; color: #475569; margin-bottom: 6px;">Riwayat Sesi Pelaksanaan Seleksi I:</div>
                          <div style="display: flex; flex-direction: column; gap: 6px;">
                            ${executions.map(tx => `
                              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 8px; font-size: 0.70rem; display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                  <div><strong style="color: #0F172A;">${esc(tx.bedenganCode || tx.bedengan || '-')}</strong> • ${esc(tx.docNo)}</div>
                                  <div style="color: #64748B; font-size: 0.65rem; margin-top: 1px;">
                                    ${tx.polybagScope} Ply (${tx.polybag2Bibit || 0}x2, ${tx.polybag1Bibit || 0}x1, ${tx.polybag0Bibit || 0}x0) • ${esc(tx.tanggalSeleksi || tx.tanggal)}
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
                      ` : ''}

                      ${isReturned && doc.returnReason ? `
                        <div style="padding: 8px 10px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; font-size: 0.72rem; color: #991B1B;">
                          <strong>Catatan Pengembalian Asisten:</strong> ${esc(doc.returnReason)}
                        </div>
                      ` : ''}

                      <!-- 5. TOMBOL AKSI, COMPLETION CHECKBOX, SUBMISSION & SELEKSI II GENERATION -->
                      <div style="display: flex; flex-direction: column; gap: 8px; border-top: 1px solid #F1F5F9; padding-top: 8px;">
                        
                        ${!isApproved && !isSubmitted ? `
                          <button type="button" class="btn-execute-seleksi1" data-id="${esc(doc.id)}" style="width: 100%; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 1px 2px rgba(17,104,52,0.2);">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            + Catat Transaksi Pelaksanaan Seleksi I
                          </button>
                        ` : ''}

                        ${!isApproved && !isSubmitted ? `
                          <label style="display: flex; align-items: center; gap: 8px; font-size: 0.76rem; color: #1E293B; cursor: pointer; user-select: none; font-weight: 600; padding: 4px 0;">
                            <input type="checkbox" class="chk-doc-completed" data-id="${esc(doc.id)}" ${isCompleted ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer; accent-color: #116834;">
                            <span>Seleksi Selesai</span>
                            <span style="font-size: 0.68rem; color: #64748B; font-weight: normal;">(Deklarasi Manual Mantri)</span>
                          </label>
                        ` : ''}

                        ${isCompleted && !isSubmitted && !isApproved ? `
                          <button type="button" class="btn-open-review-modal" data-id="${esc(doc.id)}" style="width: 100%; height: 38px; background: #2563EB; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 1px 2px rgba(37,99,235,0.2);">
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
                              <button type="button" class="btn-create-seleksi2" data-id="${esc(doc.id)}" style="width: 100%; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 1px 2px rgba(17,104,52,0.2);">
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                + Buat Dokumen Seleksi II
                              </button>
                            `}
                          </div>
                        ` : ''}

                      </div>

                    </div>
                  `;
                }).join('')}
              </div>
            `}
          ` : activePreGraftingTab === 'SELEKSI_2' ? `
            <!-- VIEW 1B: DOKUMEN SELEKSI II PRA-OKULASI -->
            <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
              <h2 style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin: 0;">Dokumen Seleksi II (Pra-Okulasi) (${seleksi2Docs.length})</h2>
            </div>

            ${seleksi2Docs.length === 0 ? `
              <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 40px 20px; text-align: center; margin-top: 10px;">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; color: #64748B;">
                  <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="2" fill="none">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h3 style="font-size: 0.95rem; font-weight: 700; color: #0F172A; margin: 0 0 4px 0;">Belum Ada Dokumen Seleksi II</h3>
                <p style="font-size: 0.78rem; color: #64748B; margin: 0; line-height: 1.45;">Dokumen Seleksi II dapat dibuat setelah Dokumen Seleksi I berstatus FINAL disetujui oleh Asisten Bibitan.</p>
              </div>
            ` : `
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
                    badgeText = 'DISETUJUI (FINAL)';
                    badgeBg = '#F0FDF4';
                    badgeColor = '#15803D';
                    badgeBorder = '#BBF7D0';
                  } else if (isReturned) {
                    badgeText = 'DIKEMBALIKAN';
                    badgeBg = '#FEF2F2';
                    badgeColor = '#DC2626';
                    badgeBorder = '#FECACA';
                  } else if (isSubmitted) {
                    badgeText = 'MENUNGGU VERIFIKASI ASISTEN';
                    badgeBg = '#EFF6FF';
                    badgeColor = '#1D4ED8';
                    badgeBorder = '#BFDBFE';
                  } else if (isCompleted) {
                    badgeText = 'SELESAI (SIAP REVIEW)';
                    badgeBg = '#F0FDF4';
                    badgeColor = '#15803D';
                    badgeBorder = '#BBF7D0';
                  } else if (executions.length > 0) {
                    badgeText = 'SEDANG BERJALAN';
                    badgeBg = '#FEF3C7';
                    badgeColor = '#B45309';
                    badgeBorder = '#FDE68A';
                  }

                  return `
                    <div class="card-pre-grafting-doc card-seleksi2-doc" data-id="${esc(doc.id)}" style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 10px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); display: flex; flex-direction: column; gap: 10px;">
                      
                      <!-- 1. HEADER CARD: DOK NO & STAGE BADGE -->
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                        <div>
                          <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="font-size: 0.62rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: #EEF2FF; color: #3730A3; border: 1px solid #C7D2FE;">
                              SELEKSI II (PRA-OKULASI)
                            </span>
                            <span style="font-weight: 800; font-size: 0.96rem; color: #0F172A;">
                              ${esc(doc.docNo)}
                            </span>
                          </div>
                          <div style="font-size: 0.72rem; color: #64748B; margin-top: 3px;">
                            Sumber Seleksi I: <strong style="color: #0F172A;">${esc(doc.sourceSelectionDocNo || doc.sourceDocNo || '-')}</strong>
                            <span style="font-size: 0.64rem; font-weight: 700; color: #15803D; margin-left: 4px;">(DISETUJUI FINAL)</span>
                          </div>
                          ${doc.sourceSeedingDocNo && doc.sourceSeedingDocNo !== '-' ? `
                            <div style="font-size: 0.68rem; color: #94A3B8; margin-top: 1px;">
                              Penyemaian Asal: ${esc(doc.sourceSeedingDocNo)}
                            </div>
                          ` : ''}
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                          <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">
                            ${badgeText}
                          </span>
                          <span style="font-size: 0.62rem; color: #94A3B8;">${executions.length} Sesi Transaksi</span>
                        </div>
                      </div>

                      <!-- 2. BATCH & SCOPE INFO -->
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; font-size: 0.73rem; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px;">
                        <div>Batch: <strong style="color: #0F172A;">${esc(doc.batchCode || doc.batchNo || '-')}</strong></div>
                        <div>Klon: <strong style="color: #0F172A;">${esc(doc.clone || doc.klon || '-')}</strong></div>
                        <div>Bedengan: <strong style="color: #0F172A;">${esc(bedDisplay)}</strong></div>
                        <div>Program: <strong style="color: #0F172A;">${esc(doc.programCode || doc.programName || '-')}</strong></div>
                      </div>

                      <!-- 3. POPULATION & RESULT METRICS (4-KOLOM DOKUMEN SELEKSI II) -->
                      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center; border: 1px solid #CBD5E1; border-radius: 6px; padding: 8px; background: #FFFFFF;">
                        <div>
                          <div style="font-size: 0.60rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Polybag Source</div>
                          <div style="font-size: 0.90rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${sourcePolybag.toLocaleString('id-ID')}</div>
                          <div style="font-size: 0.60rem; color: #94A3B8;">Ply (Dari Sel. I)</div>
                        </div>
                        <div style="border-left: 1px solid #E2E8F0;">
                          <div style="font-size: 0.60rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Bibit Source</div>
                          <div style="font-size: 0.90rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${sourceBibit.toLocaleString('id-ID')}</div>
                          <div style="font-size: 0.60rem; color: #94A3B8;">Pkk (Final Sel. I)</div>
                        </div>
                        <div style="border-left: 1px solid #E2E8F0;">
                          <div style="font-size: 0.60rem; font-weight: 700; color: #15803D; text-transform: uppercase;">Dipertahankan</div>
                          <div style="font-size: 0.90rem; font-weight: 800; color: #15803D; margin-top: 2px;">${totalLayak.toLocaleString('id-ID')}</div>
                          <div style="font-size: 0.60rem; color: #15803D;">Pkk (1 Bibit/Ply)</div>
                        </div>
                        <div style="border-left: 1px solid #E2E8F0;">
                          <div style="font-size: 0.60rem; font-weight: 700; color: #DC2626; text-transform: uppercase;">Reject Seleksi II</div>
                          <div style="font-size: 0.90rem; font-weight: 800; color: #DC2626; margin-top: 2px;">${totalAfkir.toLocaleString('id-ID')}</div>
                          <div style="font-size: 0.60rem; color: #DC2626;">Pkk (Dieliminasi)</div>
                        </div>
                      </div>

                      <!-- 4. RIWAYAT SESI PELAKSANAAN SELEKSI II (JIKA ADA) -->
                      ${executions.length > 0 ? `
                        <div style="border-top: 1px dashed #CBD5E1; padding-top: 8px;">
                          <div style="font-size: 0.70rem; font-weight: 700; color: #475569; margin-bottom: 6px;">Riwayat Sesi Pelaksanaan Seleksi II:</div>
                          <div style="display: flex; flex-direction: column; gap: 6px;">
                            ${executions.map(tx => `
                              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 8px; font-size: 0.70rem; display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                  <div><strong style="color: #0F172A;">${esc(tx.bedenganCode || tx.bedengan || '-')}</strong> • ${esc(tx.docNo)}</div>
                                  <div style="color: #64748B; font-size: 0.65rem; margin-top: 1px;">
                                    ${tx.polybagScope} Ply (${tx.polybag2Bibit || 0}x2→1, ${tx.polybag1Bibit || 0}x1→1, ${tx.polybag0Bibit || 0}x0) • ${esc(tx.tanggalSeleksi || tx.tanggal)}
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
                      ` : ''}

                      ${isReturned && doc.returnReason ? `
                        <div style="padding: 8px 10px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; font-size: 0.72rem; color: #991B1B;">
                          <strong>Catatan Pengembalian Asisten:</strong> ${esc(doc.returnReason)}
                        </div>
                      ` : ''}

                      <!-- 5. TOMBOL AKSI, COMPLETION CHECKBOX & SUBMISSION & SELEKSI III GENERATION -->
                      <div style="display: flex; flex-direction: column; gap: 8px; border-top: 1px solid #F1F5F9; padding-top: 8px;">
                        
                        ${!isApproved && !isSubmitted ? `
                          <button type="button" class="btn-execute-seleksi2" data-id="${esc(doc.id)}" style="width: 100%; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 1px 2px rgba(17,104,52,0.2);">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            + Catat Transaksi Pelaksanaan Seleksi II
                          </button>
                        ` : ''}

                        ${!isApproved && !isSubmitted ? `
                          <label style="display: flex; align-items: center; gap: 8px; font-size: 0.76rem; color: #1E293B; cursor: pointer; user-select: none; font-weight: 600; padding: 4px 0;">
                            <input type="checkbox" class="chk-doc-completed" data-id="${esc(doc.id)}" ${isCompleted ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer; accent-color: #116834;">
                            <span>Seleksi Selesai</span>
                            <span style="font-size: 0.68rem; color: #64748B; font-weight: normal;">(Deklarasi Manual Mantri)</span>
                          </label>
                        ` : ''}

                        ${isCompleted && !isSubmitted && !isApproved ? `
                          <button type="button" class="btn-open-review-modal" data-id="${esc(doc.id)}" style="width: 100%; height: 38px; background: #2563EB; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 1px 2px rgba(37,99,235,0.2);">
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
                              <button type="button" class="btn-create-seleksi3" data-id="${esc(doc.id)}" style="width: 100%; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 1px 2px rgba(17,104,52,0.2);">
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                + Buat Dokumen Seleksi III
                              </button>
                            `}
                          </div>
                        ` : ''}

                      </div>

                    </div>
                  `;
                }).join('')}
              </div>
            `}
          ` : `
            <!-- VIEW 1C: DOKUMEN SELEKSI III PRA-OKULASI -->
            <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
              <h2 style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin: 0;">Dokumen Seleksi III (Pra-Okulasi) (${seleksi3Docs.length})</h2>
            </div>

            ${seleksi3Docs.length === 0 ? `
              <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 40px 20px; text-align: center; margin-top: 10px;">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; color: #64748B;">
                  <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="2" fill="none">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <h3 style="font-size: 0.95rem; font-weight: 700; color: #0F172A; margin: 0 0 4px 0;">Belum Ada Dokumen Seleksi III</h3>
                <p style="font-size: 0.78rem; color: #64748B; margin: 0; line-height: 1.45;">Dokumen Seleksi III dapat dibuat setelah Dokumen Seleksi II berstatus FINAL disetujui oleh Asisten Bibitan.</p>
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
                ${seleksi3Docs.map(doc => {
                  const bedDisplay = formatBedenganDisplayCode(doc);
                  const sourcePolybag = parseInt(doc.sourcePolybagQty || 0, 10);
                  const sourceBibit = parseInt(doc.sourceBibitQty || 0, 10);
                  const totalLayak = parseInt(doc.totalLayak || 0, 10);
                  const totalAfkir = parseInt(doc.totalAfkir || 0, 10);
                  const executions = getSeleksi3ExecutionsByDocument(doc.id || doc.docNo);
                  const isCompleted = Boolean(doc.isCompleted);
                  const isSubmitted = doc.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI || doc.status === 'DIAJUKAN';
                  const isApproved = doc.status === SELECTION_STATUS.DISETUJUI;
                  const isReturned = doc.status === SELECTION_STATUS.DIKEMBALIKAN;
                  const isFinal = Boolean(doc.isFinal);

                  let badgeText = 'DRAFT (CONTAINER)';
                  let badgeBg = '#FEF3C7';
                  let badgeColor = '#B45309';
                  let badgeBorder = '#FDE68A';

                  if (isApproved) {
                    badgeText = 'DISETUJUI (FINAL)';
                    badgeBg = '#F0FDF4';
                    badgeColor = '#15803D';
                    badgeBorder = '#BBF7D0';
                  } else if (isSubmitted) {
                    badgeText = 'MENUNGGU VERIFIKASI ASISTEN';
                    badgeBg = '#EFF6FF';
                    badgeColor = '#1D4ED8';
                    badgeBorder = '#BFDBFE';
                  } else if (isReturned) {
                    badgeText = 'DIKEMBALIKAN';
                    badgeBg = '#FEF2F2';
                    badgeColor = '#DC2626';
                    badgeBorder = '#FECACA';
                  } else if (isCompleted) {
                    badgeText = 'SELESAI (SIAP REVIEW)';
                    badgeBg = '#F5F3FF';
                    badgeColor = '#6D28D9';
                    badgeBorder = '#DDD6FE';
                  } else if (executions.length > 0) {
                    badgeText = 'SEDANG BERJALAN';
                    badgeBg = '#FEF3C7';
                    badgeColor = '#B45309';
                    badgeBorder = '#FDE68A';
                  }

                  return `
                    <div class="card-pre-grafting-doc card-seleksi3-doc" data-id="${esc(doc.id)}" style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 10px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); display: flex; flex-direction: column; gap: 10px;">
                      
                      <!-- 1. HEADER CARD: DOK NO & STAGE BADGE -->
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                        <div>
                          <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="font-size: 0.62rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: #FDF2F8; color: #9D174D; border: 1px solid #FBCFE8;">
                              SELEKSI III (PRA-OKULASI)
                            </span>
                            <span style="font-weight: 800; font-size: 0.96rem; color: #0F172A;">
                              ${esc(doc.docNo)}
                            </span>
                          </div>
                          <div style="font-size: 0.72rem; color: #64748B; margin-top: 3px;">
                            Sumber Seleksi II: <strong style="color: #0F172A;">${esc(doc.sourceSelectionDocNo || doc.sourceDocNo || '-')}</strong>
                            <span style="font-size: 0.64rem; font-weight: 700; color: #15803D; margin-left: 4px;">(DISETUJUI FINAL)</span>
                          </div>
                          ${doc.sourceSeedingDocNo && doc.sourceSeedingDocNo !== '-' ? `
                            <div style="font-size: 0.68rem; color: #94A3B8; margin-top: 1px;">
                              Penyemaian Asal: ${esc(doc.sourceSeedingDocNo)}
                            </div>
                          ` : ''}
                        </div>
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 2px;">
                          <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">
                            ${badgeText}
                          </span>
                          <span style="font-size: 0.62rem; color: #94A3B8;">${executions.length} Sesi Transaksi</span>
                        </div>
                      </div>

                      ${isReturned && doc.returnReason ? `
                        <div style="margin-top: 4px; padding: 6px 10px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; font-size: 0.72rem; color: #991B1B;">
                          <strong>Catatan Pengembalian Asisten:</strong> ${esc(doc.returnReason)}
                        </div>
                      ` : ''}

                      <!-- 2. BATCH & SCOPE INFO -->
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 10px; font-size: 0.73rem; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 8px 10px;">
                        <div>Batch: <strong style="color: #0F172A;">${esc(doc.batchCode || doc.batchNo || '-')}</strong></div>
                        <div>Klon: <strong style="color: #0F172A;">${esc(doc.clone || doc.klon || '-')}</strong></div>
                        <div>Bedengan: <strong style="color: #0F172A;">${esc(bedDisplay)}</strong></div>
                        <div>Program: <strong style="color: #0F172A;">${esc(doc.programCode || doc.programName || '-')}</strong></div>
                      </div>

                      <!-- 3. POPULATION & RESULT METRICS (4-KOLOM DOKUMEN SELEKSI III) -->
                      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; text-align: center; border: 1px solid #CBD5E1; border-radius: 6px; padding: 8px; background: #FFFFFF;">
                        <div>
                          <div style="font-size: 0.60rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Polybag Source</div>
                          <div style="font-size: 0.90rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${sourcePolybag.toLocaleString('id-ID')}</div>
                          <div style="font-size: 0.60rem; color: #94A3B8;">Ply (Dari Sel. II)</div>
                        </div>
                        <div style="border-left: 1px solid #E2E8F0;">
                          <div style="font-size: 0.60rem; font-weight: 700; color: #64748B; text-transform: uppercase;">Bibit Source</div>
                          <div style="font-size: 0.90rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${sourceBibit.toLocaleString('id-ID')}</div>
                          <div style="font-size: 0.60rem; color: #94A3B8;">Pkk (Final Sel. II)</div>
                        </div>
                        <div style="border-left: 1px solid #E2E8F0;">
                          <div style="font-size: 0.60rem; font-weight: 700; color: #15803D; text-transform: uppercase;">Dipertahankan</div>
                          <div style="font-size: 0.90rem; font-weight: 800; color: #15803D; margin-top: 2px;">${totalLayak.toLocaleString('id-ID')}</div>
                          <div style="font-size: 0.60rem; color: #15803D;">Pkk</div>
                        </div>
                        <div style="border-left: 1px solid #E2E8F0;">
                          <div style="font-size: 0.60rem; font-weight: 700; color: #DC2626; text-transform: uppercase;">Reject Seleksi III</div>
                          <div style="font-size: 0.90rem; font-weight: 800; color: #DC2626; margin-top: 2px;">${totalAfkir.toLocaleString('id-ID')}</div>
                          <div style="font-size: 0.60rem; color: #DC2626;">Pkk</div>
                        </div>
                      </div>

                      <!-- 4. RIWAYAT SESI PELAKSANAAN SELEKSI III (JIKA ADA) -->
                      ${executions.length > 0 ? `
                        <div style="border-top: 1px dashed #CBD5E1; padding-top: 8px;">
                          <div style="font-size: 0.70rem; font-weight: 700; color: #475569; margin-bottom: 6px;">Riwayat Sesi Pelaksanaan Seleksi III:</div>
                          <div style="display: flex; flex-direction: column; gap: 6px;">
                            ${executions.map(tx => `
                              <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 8px; font-size: 0.70rem; display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                  <div><strong style="color: #0F172A;">${esc(tx.bedenganCode || tx.bedengan || '-')}</strong> • ${esc(tx.docNo)}</div>
                                  <div style="color: #64748B; font-size: 0.65rem; margin-top: 1px;">
                                    ${tx.polybagScope} Ply (${tx.bibitAwal || 0} Pkk) • ${esc(tx.tanggalSeleksi || tx.tanggal)}
                                  </div>
                                </div>
                                <div style="text-align: right;">
                                  <div style="font-weight: 700; color: #15803D;">${(tx.bibitDipertahankan || 0).toLocaleString('id-ID')} Dipertahankan</div>
                                  <div style="font-weight: 700; color: #DC2626; font-size: 0.65rem;">${(tx.bibitReject || 0).toLocaleString('id-ID')} Reject</div>
                                </div>
                              </div>
                            `).join('')}
                          </div>
                        </div>
                      ` : ''}

                      <!-- 5. TOMBOL AKSI SELEKSI III -->
                      <div style="display: flex; flex-direction: column; gap: 8px; border-top: 1px solid #F1F5F9; padding-top: 8px; margin-top: 8px;">
                        ${!isApproved && !isSubmitted ? `
                          <button type="button" class="btn-execute-seleksi3" data-id="${esc(doc.id)}" style="width: 100%; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 1px 2px rgba(17,104,52,0.2);">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none">
                              <line x1="12" y1="5" x2="12" y2="19"></line>
                              <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            + Catat Transaksi Pelaksanaan Seleksi III
                          </button>
                        ` : ''}

                        ${!isApproved && !isSubmitted ? `
                          <label style="display: flex; align-items: center; gap: 8px; font-size: 0.76rem; color: #1E293B; cursor: pointer; user-select: none; font-weight: 600; padding: 4px 0;">
                            <input type="checkbox" class="chk-doc-completed" data-id="${esc(doc.id)}" ${isCompleted ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer; accent-color: #116834;">
                            <span>Seleksi Selesai</span>
                            <span style="font-size: 0.68rem; color: #64748B; font-weight: normal;">(Deklarasi Manual Mantri)</span>
                          </label>
                        ` : ''}

                        ${isCompleted && !isSubmitted && !isApproved ? `
                          <button type="button" class="btn-open-review-modal" data-id="${esc(doc.id)}" style="width: 100%; height: 38px; background: #2563EB; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 1px 2px rgba(37,99,235,0.2);">
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

                    </div>
                  `;
                }).join('')}
              </div>
            `}
          `}
        ` : `
          <!-- VIEW 2: BIBIT AFKIR PASCA-OKULASI (EXISTING VIEW) -->
          ${selectionPool.length > 0 ? `
            <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
              <h2 style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin: 0;">Daftar Bibit Afkir / Diseleksi (${selectionPool.length})</h2>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
              ${selectionPool.map((item, idx) => {
                const isDeclared = item.status === 'DECLARED_CULLED';
                const displayDocNo = standardizeSelectionDocNo(item.docNo, idx + 1);
                const sourceLabel = getSelectionSourceLabel(item);
                const categoryLabel = getSelectionCategoryLabel(item);
                const batchDisplay = item.batchCode || item.batchNo || 'Batch';
                const sourceDocNo = item.sourceDocNo || item.seedingDocNo || item.buddingDocNo || item.inspectionDocNo || '-';
                const bedenganDisplay = formatBedenganDisplayCode(item);
                const programDisplay = item.programCode || item.programName || item.program || '-';
                const qtyAfkir = parseInt(item.jumlahAfkir || item.quantity || 0, 10);

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
                          Pkk
                        </div>
                      </div>
                    </div>

                    <!-- 5. TOMBOL DEKLARASI -->
                    ${!isDeclared ? `
                      <button type="button" class="btn-deklarasi-afkir" data-index="${idx}" style="width: 100%; height: 38px; background: #DC2626; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer; box-shadow: 0 1px 2px rgba(220,38,38,0.2); transition: background 0.15s ease;">
                        Deklarasi Bibit Afkir (${qtyAfkir.toLocaleString('id-ID')} Pkk)
                      </button>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}

          ${selectionPool.length === 0 && culledTxs.length === 0 ? `
            <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 40px 20px; text-align: center; margin-top: 10px;">
              <div style="width: 56px; height: 56px; border-radius: 50%; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; color: #64748B;">
                <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="2" fill="none">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <h3 style="font-size: 0.95rem; font-weight: 700; color: #0F172A; margin: 0 0 4px 0;">Belum Ada Data Penyeleksian</h3>
              <p style="font-size: 0.78rem; color: #64748B; margin: 0; line-height: 1.45;">Data bibit afkir akan muncul saat terdapat bibit yang diseleksi pada transaksi hulu (Penyemaian, Okulasi, atau Pemeriksaan).</p>
            </div>
          ` : ''}

          ${culledTxs.length > 0 ? `
            <div style="margin: 20px 0 10px 0;">
              <h2 style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin: 0;">Histori Deklarasi Pengurangan Stok (${culledTxs.length})</h2>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${culledTxs.map((ctx) => {
                const src = getSelectionSourceLabel(ctx);
                const cat = getSelectionCategoryLabel(ctx);
                const qty = parseInt(ctx.jumlahAfkir || ctx.quantity || 0, 10);
                const bedDisplay = formatBedenganDisplayCode(ctx);
                return `
                  <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 4px;">
                      <div style="min-width: 0;">
                        <div style="font-weight: 800; font-size: 0.88rem; color: #0F172A; word-break: break-word;">
                          ${esc(ctx.batchCode || ctx.batchNo || 'Batch')}
                        </div>
                        <div style="font-size: 0.70rem; color: #64748B; margin-top: 1px;">
                          Sumber: <strong style="color: #0F172A;">${esc(src)}</strong> • <span style="color: #DC2626; font-weight: 600;">${esc(cat)}</span>
                        </div>
                      </div>
                      <div style="text-align: right; flex-shrink: 0;">
                        <span style="font-weight: 900; font-size: 0.95rem; color: #DC2626;">-${qty.toLocaleString('id-ID')}</span>
                        <span style="font-size: 0.68rem; font-weight: 700; color: #991B1B; margin-left: 1px;">Pkk</span>
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

  // Post-Grafting declaration flow
  app.querySelectorAll('.btn-deklarasi-afkir').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      const targetPoolItem = selectionPool[idx];
      if (!targetPoolItem) return;

      if (targetPoolItem.status === 'DECLARED_CULLED') {
        toast('Hasil seleksi ini sudah pernah dideklarasikan.', 'info');
        return;
      }

      const displayDocNo = standardizeSelectionDocNo(targetPoolItem.docNo, idx + 1);

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
          <div style="font-size: 0.62rem; font-weight: 700; color: #64748B; text-transform: uppercase;">${isSeleksi2 || isSeleksi3 ? 'Bibit Source' : 'Bibit Awal'}</div>
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
          <button id="btn-confirm-submit-asb" type="button" style="flex: 1.8; height: 38px; background: #2563EB; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; cursor: pointer; box-shadow: 0 1px 3px rgba(37,99,235,0.25);">
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
 * =============================================================================
 * MODAL PELAKSANAAN TRANSAKSI SELEKSI I (TASK-03)
 * =============================================================================
 */
export function openSeleksi1ExecutionModal({ doc, user, onSaved }) {
  const today = formatDate(new Date().toISOString());
  const bedScopeList = getBedenganScopeStatusForSeleksi1(doc);
  
  // Find first bedengan with remaining polybag
  const initialBed = bedScopeList.find(b => b.remainingPolybag > 0) || bedScopeList[0] || {
    bedenganCode: 'BED-001',
    remainingPolybag: doc.sourcePolybagQty || 0,
    initialPolybag: doc.sourcePolybagQty || 0
  };

  const initialScope = initialBed.remainingPolybag > 0 ? initialBed.remainingPolybag : (initialBed.initialPolybag || 0);

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
                ${esc(bed.bedenganCode)} (Sisa: ${bed.remainingPolybag} / ${bed.initialPolybag} Ply)
              </option>
            `).join('')}
          </select>
        </div>

        <!-- SCOPE POLYBAG -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <label style="font-size: 0.75rem; font-weight: 700; color: #0F172A;">
              Scope Polybag Diperiksa <span style="color: #DC2626;">*</span>
            </label>
            <span id="modal-sel1-bibit-awal-label" style="font-size: 0.70rem; color: #64748B; font-weight: 600;">
              Bibit Awal: <strong id="modal-sel1-bibit-awal-val" style="color: #0F172A;">${initialScope * 2}</strong> Pkk
            </span>
          </div>
          <input id="modal-sel1-polybag-scope" type="number" min="1" max="${initialBed.remainingPolybag || 1000}" value="${initialScope}" style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; font-size: 0.85rem; box-sizing: border-box; font-weight: 700;">
          <div style="font-size: 0.68rem; color: #64748B; margin-top: 2px;">
            * Rule baseline: 1 Polybag = 2 Bibit pada populasi awal Penyemaian.
          </div>
        </div>

        <!-- BREAKDOWN HASIL PER POLIBAG -->
        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px;">
          <div style="font-size: 0.74rem; font-weight: 800; color: #0F172A; margin-bottom: 8px; text-transform: uppercase;">
            Hasil Seleksi I per Kondisi Polybag:
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <!-- 2 BIBIT -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="flex: 1;">
                <div style="font-size: 0.74rem; font-weight: 700; color: #15803D;">Tetap 2 Bibit (Normal)</div>
                <div style="font-size: 0.65rem; color: #64748B;">Polybag dengan 2 bibit bertahan</div>
              </div>
              <div style="width: 100px;">
                <input id="modal-sel1-p2" type="number" min="0" value="${initialScope}" style="width: 100%; height: 34px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; text-align: right; font-weight: 700; box-sizing: border-box;">
              </div>
            </div>

            <!-- 1 BIBIT -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="flex: 1;">
                <div style="font-size: 0.74rem; font-weight: 700; color: #D97706;">Tersisa 1 Bibit</div>
                <div style="font-size: 0.65rem; color: #64748B;">1 bibit bertahan, 1 bibit reject</div>
              </div>
              <div style="width: 100px;">
                <input id="modal-sel1-p1" type="number" min="0" value="0" style="width: 100%; height: 34px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; text-align: right; font-weight: 700; box-sizing: border-box;">
              </div>
            </div>

            <!-- 0 BIBIT -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="flex: 1;">
                <div style="font-size: 0.74rem; font-weight: 700; color: #DC2626;">Kosong (0 Bibit)</div>
                <div style="font-size: 0.65rem; color: #64748B;">2 bibit reject / mati</div>
              </div>
              <div style="width: 100px;">
                <input id="modal-sel1-p0" type="number" min="0" value="0" style="width: 100%; height: 34px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; text-align: right; font-weight: 700; box-sizing: border-box;">
              </div>
            </div>
          </div>
        </div>

        <!-- LIVE RESULT SUMMARY -->
        <div style="background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px; font-size: 0.74rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px;">
            <div>Total Polybag: <strong id="modal-summary-poly-total">${initialScope}</strong> / <span id="modal-summary-poly-target">${initialScope}</span> Ply</div>
            <div>Status Balance: <strong id="modal-summary-balance" style="color: #15803D;">BALANCE ✅</strong></div>
            <div>Bibit Dipertahankan: <strong id="modal-summary-layak" style="color: #15803D;">${initialScope * 2}</strong> Pkk</div>
            <div>Bibit Reject: <strong id="modal-summary-reject" style="color: #DC2626;">0</strong> Pkk</div>
          </div>
        </div>

        <!-- TANGGAL & CATATAN -->
        <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 8px;">
          <div>
            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 2px;">Tanggal</label>
            <input id="modal-sel1-date" type="date" value="${new Date().toISOString().slice(0, 10)}" style="width: 100%; height: 36px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; font-size: 0.78rem; box-sizing: border-box;">
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
  const inputScope = document.getElementById('modal-sel1-polybag-scope');
  const inputP2 = document.getElementById('modal-sel1-p2');
  const inputP1 = document.getElementById('modal-sel1-p1');
  const inputP0 = document.getElementById('modal-sel1-p0');
  const inputDate = document.getElementById('modal-sel1-date');
  const inputNotes = document.getElementById('modal-sel1-notes');

  const lblBibitAwalVal = document.getElementById('modal-sel1-bibit-awal-val');
  const sumPolyTotal = document.getElementById('modal-summary-poly-total');
  const sumPolyTarget = document.getElementById('modal-summary-poly-target');
  const sumBalance = document.getElementById('modal-summary-balance');
  const sumLayak = document.getElementById('modal-summary-layak');
  const sumReject = document.getElementById('modal-summary-reject');

  function updateCalculations() {
    const scope = parseInt(inputScope.value || 0, 10);
    const p2 = parseInt(inputP2.value || 0, 10);
    const p1 = parseInt(inputP1.value || 0, 10);
    const p0 = parseInt(inputP0.value || 0, 10);

    const bibitAwal = scope * 2;
    const bibitLayak = (p2 * 2) + (p1 * 1);
    const bibitReject = (p1 * 1) + (p0 * 2);
    const totalPolyResult = p2 + p1 + p0;
    const isBalanced = totalPolyResult === scope && (bibitLayak + bibitReject === bibitAwal);

    if (lblBibitAwalVal) lblBibitAwalVal.textContent = bibitAwal;
    if (sumPolyTotal) sumPolyTotal.textContent = totalPolyResult;
    if (sumPolyTarget) sumPolyTarget.textContent = scope;
    if (sumLayak) sumLayak.textContent = bibitLayak;
    if (sumReject) sumReject.textContent = bibitReject;

    if (sumBalance) {
      if (isBalanced) {
        sumBalance.textContent = 'BALANCE ✅';
        sumBalance.style.color = '#15803D';
      } else {
        sumBalance.textContent = `MISMATCH ❌ (${totalPolyResult} vs ${scope})`;
        sumBalance.style.color = '#DC2626';
      }
    }
  }

  selBed?.addEventListener('change', () => {
    const opt = selBed.options[selBed.selectedIndex];
    const rem = parseInt(opt.getAttribute('data-remaining') || 0, 10);
    const init = parseInt(opt.getAttribute('data-initial') || 0, 10);
    const targetVal = rem > 0 ? rem : init;

    inputScope.value = targetVal;
    inputScope.max = rem > 0 ? rem : init;
    inputP2.value = targetVal;
    inputP1.value = 0;
    inputP0.value = 0;
    updateCalculations();
  });

  inputScope?.addEventListener('input', () => {
    const scope = parseInt(inputScope.value || 0, 10);
    inputP2.value = scope;
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
    const polybagScope = parseInt(inputScope?.value || 0, 10);
    const p2 = parseInt(inputP2?.value || 0, 10);
    const p1 = parseInt(inputP1?.value || 0, 10);
    const p0 = parseInt(inputP0?.value || 0, 10);
    const tanggalSeleksi = inputDate?.value ? formatDate(inputDate.value) : today;
    const catatan = inputNotes?.value || '';

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
 * MODAL PELAKSANAAN TRANSAKSI SELEKSI II (TASK-06)
 * Mengimplementasikan Model Populasi Seleksi II:
 * - Polybag 2 Bibit (P2): 1 dipertahankan + 1 reject (membuang 1 tanaman terhambat)
 * - Polybag 1 Bibit (P1): 1 dipertahankan + 0 reject (tidak dipaksa reject)
 * - Polybag 0 Bibit (P0): 0 dipertahankan + 0 reject (kosong)
 * =============================================================================
 */
export function openSeleksi2ExecutionModal({ doc, user, onSaved }) {
  const today = formatDate(new Date().toISOString());
  const bedScopeList = getBedenganScopeStatusForSeleksi2(doc);
  
  // Find first bedengan with remaining polybag
  const initialBed = bedScopeList.find(b => b.remainingPolybag > 0) || bedScopeList[0] || {
    bedenganCode: 'BED-001',
    remainingPolybag: doc.sourcePolybagQty || 0,
    initialPolybag: doc.sourcePolybagQty || 0,
    remainingBibit: doc.sourceBibitQty || 0,
    initialBibit: doc.sourceBibitQty || 0
  };

  const initialScope = initialBed.remainingPolybag > 0 ? initialBed.remainingPolybag : (initialBed.initialPolybag || 0);

  const bodyContent = `
    <div style="font-size: 0.82rem; color: #334155; line-height: 1.45;">
      
      <!-- HEADER INFO -->
      <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; font-size: 0.72rem;">
          <div>Dok. Seleksi II: <strong style="color: #0F172A;">${esc(doc.docNo)}</strong></div>
          <div>Sumber Seleksi I: <strong style="color: #0F172A;">${esc(doc.sourceSelectionDocNo || doc.sourceDocNo)}</strong></div>
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
          <select id="modal-sel2-bedengan" style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; font-size: 0.80rem; background: #FFFFFF;">
            ${bedScopeList.map(bed => `
              <option value="${esc(bed.bedenganCode)}" data-remaining-poly="${bed.remainingPolybag}" data-initial-poly="${bed.initialPolybag}" data-remaining-bibit="${bed.remainingBibit}" data-initial-bibit="${bed.initialBibit}" ${bed.bedenganCode === initialBed.bedenganCode ? 'selected' : ''}>
                ${esc(bed.bedenganCode)} (Sisa: ${bed.remainingPolybag} Ply / ${bed.remainingBibit} Pkk)
              </option>
            `).join('')}
          </select>
        </div>

        <!-- SCOPE POLYBAG -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <label style="font-size: 0.75rem; font-weight: 700; color: #0F172A;">
              Scope Polybag Diperiksa <span style="color: #DC2626;">*</span>
            </label>
            <span id="modal-sel2-bibit-awal-label" style="font-size: 0.70rem; color: #64748B; font-weight: 600;">
              Bibit Awal Scope: <strong id="modal-sel2-bibit-awal-val" style="color: #0F172A;">${initialScope * 2}</strong> Pkk
            </span>
          </div>
          <input id="modal-sel2-polybag-scope" type="number" min="1" max="${initialBed.remainingPolybag || 1000}" value="${initialScope}" style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; font-size: 0.85rem; box-sizing: border-box; font-weight: 700;">
          <div style="font-size: 0.68rem; color: #64748B; margin-top: 2px;">
            * Seleksi II dilakukan pada stadia payung satu tua untuk menyisakan 1 bibit terbaik per polybag.
          </div>
        </div>

        <!-- BREAKDOWN KONDISI POLYBAG SAAT INI (SELEKSI II MODEL) -->
        <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 12px;">
          <div style="font-size: 0.74rem; font-weight: 800; color: #0F172A; margin-bottom: 8px; text-transform: uppercase;">
            Kondisi Polybag & Hasil Seleksi II:
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <!-- 2 BIBIT -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="flex: 1;">
                <div style="font-size: 0.74rem; font-weight: 700; color: #15803D;">Polybag 2 Bibit (P2)</div>
                <div style="font-size: 0.65rem; color: #64748B;">→ 1 bibit terbaik dipertahankan + 1 bibit reject</div>
              </div>
              <div style="width: 100px;">
                <input id="modal-sel2-p2" type="number" min="0" value="${initialScope}" style="width: 100%; height: 34px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; text-align: right; font-weight: 700; box-sizing: border-box;">
              </div>
            </div>

            <!-- 1 BIBIT -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="flex: 1;">
                <div style="font-size: 0.74rem; font-weight: 700; color: #D97706;">Polybag 1 Bibit (P1)</div>
                <div style="font-size: 0.65rem; color: #64748B;">→ 1 bibit dipertahankan (0 reject, tidak dipaksa reject)</div>
              </div>
              <div style="width: 100px;">
                <input id="modal-sel2-p1" type="number" min="0" value="0" style="width: 100%; height: 34px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; text-align: right; font-weight: 700; box-sizing: border-box;">
              </div>
            </div>

            <!-- 0 BIBIT -->
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
              <div style="flex: 1;">
                <div style="font-size: 0.74rem; font-weight: 700; color: #DC2626;">Polybag Kosong (P0)</div>
                <div style="font-size: 0.65rem; color: #64748B;">→ 0 bibit dipertahankan + 0 reject (kosong)</div>
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
            <div>Total Polybag: <strong id="modal-sel2-summary-poly-total">${initialScope}</strong> / <span id="modal-sel2-summary-poly-target">${initialScope}</span> Ply</div>
            <div>Status Balance: <strong id="modal-sel2-summary-balance" style="color: #15803D;">BALANCE ✅</strong></div>
            <div>Bibit Dipertahankan: <strong id="modal-sel2-summary-layak" style="color: #15803D;">${initialScope}</strong> Pkk (1/Ply)</div>
            <div>Bibit Reject Seleksi II: <strong id="modal-sel2-summary-reject" style="color: #DC2626;">${initialScope}</strong> Pkk</div>
          </div>
        </div>

        <!-- TANGGAL & CATATAN -->
        <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 8px;">
          <div>
            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 2px;">Tanggal</label>
            <input id="modal-sel2-date" type="date" value="${new Date().toISOString().slice(0, 10)}" style="width: 100%; height: 36px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; font-size: 0.78rem; box-sizing: border-box;">
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
          Simpan Transaksi Seleksi II
        </button>
      </div>

    </div>
  `;

  openModal({
    title: 'Pelaksanaan Seleksi II (Pra-Okulasi)',
    body: bodyContent
  });

  const selBed = document.getElementById('modal-sel2-bedengan');
  const inputScope = document.getElementById('modal-sel2-polybag-scope');
  const inputP2 = document.getElementById('modal-sel2-p2');
  const inputP1 = document.getElementById('modal-sel2-p1');
  const inputP0 = document.getElementById('modal-sel2-p0');
  const inputDate = document.getElementById('modal-sel2-date');
  const inputNotes = document.getElementById('modal-sel2-notes');

  const lblBibitAwalVal = document.getElementById('modal-sel2-bibit-awal-val');
  const sumPolyTotal = document.getElementById('modal-sel2-summary-poly-total');
  const sumPolyTarget = document.getElementById('modal-sel2-summary-poly-target');
  const sumBalance = document.getElementById('modal-sel2-summary-balance');
  const sumLayak = document.getElementById('modal-sel2-summary-layak');
  const sumReject = document.getElementById('modal-sel2-summary-reject');

  function updateCalculations() {
    const scope = parseInt(inputScope.value || 0, 10);
    const p2 = parseInt(inputP2.value || 0, 10);
    const p1 = parseInt(inputP1.value || 0, 10);
    const p0 = parseInt(inputP0.value || 0, 10);

    // Seleksi II: P2 -> 1 layak + 1 reject; P1 -> 1 layak + 0 reject; P0 -> 0 layak + 0 reject
    const bibitAwal = (p2 * 2) + (p1 * 1);
    const bibitLayak = (p2 * 1) + (p1 * 1);
    const bibitReject = (p2 * 1);
    const totalPolyResult = p2 + p1 + p0;
    const isBalanced = totalPolyResult === scope && (bibitLayak + bibitReject === bibitAwal);

    if (lblBibitAwalVal) lblBibitAwalVal.textContent = bibitAwal;
    if (sumPolyTotal) sumPolyTotal.textContent = totalPolyResult;
    if (sumPolyTarget) sumPolyTarget.textContent = scope;
    if (sumLayak) sumLayak.textContent = bibitLayak;
    if (sumReject) sumReject.textContent = bibitReject;

    if (sumBalance) {
      if (isBalanced) {
        sumBalance.textContent = 'BALANCE ✅';
        sumBalance.style.color = '#15803D';
      } else {
        sumBalance.textContent = `MISMATCH ❌ (${totalPolyResult} vs ${scope})`;
        sumBalance.style.color = '#DC2626';
      }
    }
  }

  selBed?.addEventListener('change', () => {
    const opt = selBed.options[selBed.selectedIndex];
    const remPoly = parseInt(opt.getAttribute('data-remaining-poly') || 0, 10);
    const initPoly = parseInt(opt.getAttribute('data-initial-poly') || 0, 10);
    const targetVal = remPoly > 0 ? remPoly : initPoly;

    inputScope.value = targetVal;
    inputScope.max = remPoly > 0 ? remPoly : initPoly;
    inputP2.value = targetVal;
    inputP1.value = 0;
    inputP0.value = 0;
    updateCalculations();
  });

  inputScope?.addEventListener('input', () => {
    const scope = parseInt(inputScope.value || 0, 10);
    inputP2.value = scope;
    inputP1.value = 0;
    inputP0.value = 0;
    updateCalculations();
  });

  inputP2?.addEventListener('input', updateCalculations);
  inputP1?.addEventListener('input', updateCalculations);
  inputP0?.addEventListener('input', updateCalculations);

  document.getElementById('btn-modal-cancel-sel2')?.addEventListener('click', closeModal);

  document.getElementById('btn-modal-save-sel2')?.addEventListener('click', () => {
    const bedenganCode = selBed?.value || '';
    const polybagScope = parseInt(inputScope?.value || 0, 10);
    const p2 = parseInt(inputP2?.value || 0, 10);
    const p1 = parseInt(inputP1?.value || 0, 10);
    const p0 = parseInt(inputP0?.value || 0, 10);
    const tanggalSeleksi = inputDate?.value ? formatDate(inputDate.value) : today;
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
 * MODAL PELAKSANAAN TRANSAKSI SELEKSI III (TASK-09)
 * - polybagScope (read-only / info)
 * - jumlahDiperiksa (Bibit Awal)
 * - jumlahLayak (Dipertahankan)
 * - jumlahAfkir (Reject)
 * =============================================================================
 */
export function openSeleksi3ExecutionModal({ doc, user, onSaved }) {
  const today = formatDate(new Date().toISOString());
  const bedScopeList = getBedenganScopeStatusForSeleksi3(doc);
  
  const initialBed = bedScopeList.find(b => b.remainingPolybag > 0) || bedScopeList[0] || {
    bedenganCode: 'BED-001',
    remainingPolybag: doc.sourcePolybagQty || 0,
    initialPolybag: doc.sourcePolybagQty || 0,
    remainingBibit: doc.sourceBibitQty || 0,
    initialBibit: doc.sourceBibitQty || 0
  };

  const initialScopePoly = initialBed.remainingPolybag > 0 ? initialBed.remainingPolybag : (initialBed.initialPolybag || 0);
  const initialScopeBibit = initialBed.remainingBibit > 0 ? initialBed.remainingBibit : (initialBed.initialBibit || 0);

  const bodyContent = `
    <div style="font-size: 0.82rem; color: #334155; line-height: 1.45;">
      
      <!-- HEADER INFO -->
      <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 8px; padding: 10px 12px; margin-bottom: 12px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; font-size: 0.72rem;">
          <div>Dok. Seleksi III: <strong style="color: #0F172A;">${esc(doc.docNo)}</strong></div>
          <div>Sumber Seleksi II: <strong style="color: #0F172A;">${esc(doc.sourceSelectionDocNo || doc.sourceDocNo)}</strong></div>
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
          <select id="modal-sel3-bedengan" style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; font-size: 0.80rem; background: #FFFFFF;">
            ${bedScopeList.map(bed => `
              <option value="${esc(bed.bedenganCode)}" data-remaining-poly="${bed.remainingPolybag}" data-initial-poly="${bed.initialPolybag}" data-remaining-bibit="${bed.remainingBibit}" data-initial-bibit="${bed.initialBibit}" ${bed.bedenganCode === initialBed.bedenganCode ? 'selected' : ''}>
                ${esc(bed.bedenganCode)} (Sisa: ${bed.remainingPolybag} Ply / ${bed.remainingBibit} Pkk)
              </option>
            `).join('')}
          </select>
        </div>

        <!-- SCOPE POLYBAG -->
        <div>
          <label style="font-size: 0.75rem; font-weight: 700; color: #0F172A; display: block; margin-bottom: 4px;">
            Scope Polybag Diperiksa (Unit Container) <span style="color: #DC2626;">*</span>
          </label>
          <input id="modal-sel3-polybag-scope" type="number" min="1" max="${initialBed.remainingPolybag || 1000}" value="${initialScopePoly}" style="width: 100%; height: 38px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 10px; font-size: 0.85rem; box-sizing: border-box; font-weight: 700;">
          <div style="font-size: 0.68rem; color: #64748B; margin-top: 2px;">
            * Polybag adalah unit fisik yang immutable.
          </div>
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
                <input id="modal-sel3-bibit-awal" type="number" min="1" max="${initialBed.remainingBibit || 2000}" value="${initialScopeBibit}" style="width: 100%; height: 34px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; text-align: right; font-weight: 700; box-sizing: border-box;">
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
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>Status Keseimbangan Bibit:</div>
            <strong id="modal-sel3-summary-balance" style="color: #15803D; font-size: 0.85rem;">BALANCE ✅</strong>
          </div>
        </div>

        <!-- TANGGAL & CATATAN -->
        <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 8px;">
          <div>
            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #0F172A; margin-bottom: 2px;">Tanggal</label>
            <input id="modal-sel3-date" type="date" value="${today.slice(0, 10)}" style="width: 100%; height: 36px; border: 1px solid #CBD5E1; border-radius: 6px; padding: 0 8px; font-size: 0.78rem; box-sizing: border-box;">
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
          Simpan Transaksi Seleksi III
        </button>
      </div>

    </div>
  `;

  openModal({
    title: 'Pelaksanaan Seleksi III (Pra-Okulasi)',
    body: bodyContent
  });

  const selBed = document.getElementById('modal-sel3-bedengan');
  const inputScopePoly = document.getElementById('modal-sel3-polybag-scope');
  const inputBibitAwal = document.getElementById('modal-sel3-bibit-awal');
  const inputLayak = document.getElementById('modal-sel3-layak');
  const inputReject = document.getElementById('modal-sel3-reject');
  const sumBalance = document.getElementById('modal-sel3-summary-balance');
  const inputDate = document.getElementById('modal-sel3-date');
  const inputNotes = document.getElementById('modal-sel3-notes');

  function updateCalculations(changedField) {
    const awal = parseInt(inputBibitAwal.value || 0, 10);
    let layak = parseInt(inputLayak.value || 0, 10);
    let reject = parseInt(inputReject.value || 0, 10);

    if (changedField === 'layak') {
      reject = Math.max(0, awal - layak);
      inputReject.value = reject;
    } else if (changedField === 'reject') {
      layak = Math.max(0, awal - reject);
      inputLayak.value = layak;
    } else if (changedField === 'awal') {
      layak = Math.max(0, awal - reject);
      inputLayak.value = layak;
    }

    const isBalanced = (layak + reject === awal);

    if (sumBalance) {
      if (isBalanced) {
        sumBalance.textContent = 'BALANCE ✅';
        sumBalance.style.color = '#15803D';
      } else {
        sumBalance.textContent = `MISMATCH ❌ (${layak + reject} vs ${awal})`;
        sumBalance.style.color = '#DC2626';
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

    inputScopePoly.value = targetPoly;
    inputScopePoly.max = targetPoly;
    inputBibitAwal.value = targetBibit;
    inputBibitAwal.max = targetBibit;
    inputLayak.value = targetBibit;
    inputReject.value = 0;
    
    updateCalculations();
  });

  inputBibitAwal?.addEventListener('input', () => updateCalculations('awal'));
  inputLayak?.addEventListener('input', () => updateCalculations('layak'));
  inputReject?.addEventListener('input', () => updateCalculations('reject'));

  document.getElementById('btn-modal-cancel-sel3')?.addEventListener('click', closeModal);

  document.getElementById('btn-modal-save-sel3')?.addEventListener('click', () => {
    const bedenganCode = selBed?.value || '';
    const polybagScope = parseInt(inputScopePoly?.value || 0, 10);
    const bibitAwal = parseInt(inputBibitAwal?.value || 0, 10);
    const layak = parseInt(inputLayak?.value || 0, 10);
    const reject = parseInt(inputReject?.value || 0, 10);
    const tanggalSeleksi = inputDate?.value ? formatDate(inputDate.value) : today;
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
