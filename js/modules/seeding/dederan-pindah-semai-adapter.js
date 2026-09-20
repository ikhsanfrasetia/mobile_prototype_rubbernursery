/**
 * modules/seeding/dederan-pindah-semai-adapter.js
 * Pindah Semai Source Adapter & Normalization Layer.
 *
 * Responsibilities:
 * - Reads 100% complete Dederan Inspections with successful quantities (jumlahBerhasil > 0).
 * - Enforces SELECTION APPROVAL GATE: Only Dederan sources with SELECTION_STATUS.DISETUJUI
 *   from selection_transactions are eligible for Pindah Semai (Polybag).
 * - Tracks processed quantities in existing seeding_transactions.
 * - Computes remaining eligible quantities without mutating seeding_transactions schema.
 * - Normalizes inspection records into the standard interface expected by seeding-landing.js and seeding-form.js.
 * - Prevents duplicate Pindah Semai processing.
 * - Preserves downstream technical identifiers (SOW, seeding_transactions, sourceSeedingDocNo).
 */

import { storage } from '../../core/storage.js';
import { DEDERAN_STORAGE_KEYS, getBedenganInspectionSummary, getDederanTransactionsByParent } from './dederan-manager.js';
import { SELECTION_STATUS } from '../selection/selection-manager.js';
import { 
  getAllIssueDocuments, 
  calculateRemainingIssueBalance as calcRemainingIssueBalance 
} from '../../data/material-master.js';

/**
 * Finds the selection transaction record associated with a specific Dederan transaction
 * @param {Object} dtx - Dederan Transaction object
 * @returns {Object|null} Matching selection transaction object
 */
export function getDederanSelectionRecord(dtx) {
  if (!dtx) return null;
  const selTxs = storage.get('selection_transactions', []);
  const docNo = String(dtx.docNo || dtx.dederanTxDocNo || '').trim();
  const txId = String(dtx.id || '').trim();
  const bedId = String(dtx.bedenganId || '').trim();
  const bedCode = String(dtx.bedenganCode || dtx.bedengan || '').trim();

  return selTxs.find(tx => {
    const isDederan = tx.originType === 'REJECT_DEDERAN' || tx.sourceModule === 'DEDERAN';
    if (!isDederan) return false;

    // Direct docNo match
    if (docNo && (tx.sourceDocNo === docNo || tx.dederanDocNo === docNo || tx.dederanTxDocNo === docNo || tx.sourceTransactionId === docNo)) {
      return true;
    }
    // Direct ID match
    if (txId && (tx.sourceTransactionId === txId || tx.sourceDocNo === txId)) {
      return true;
    }
    // Bedengan + Parent Induk match
    if (tx.parentDederIndukDocNo && dtx.parentDederIndukDocNo && tx.parentDederIndukDocNo === dtx.parentDederIndukDocNo) {
      if ((bedId && tx.bedenganId === bedId) || (bedCode && (tx.bedenganCode === bedCode || tx.bedengan === bedCode))) {
        return true;
      }
    }
    return false;
  }) || null;
}

/**
 * Resolves the current Selection Approval Status for a Dederan transaction
 * @param {Object} dtx - Dederan Transaction object
 * @returns {{ isApproved: boolean, status: string, statusLabel: string, selectionRecord: Object|null }}
 */
export function getDederanSelectionApprovalStatus(dtx) {
  if (!dtx) {
    return { isApproved: false, status: 'NO_SELECTION', statusLabel: 'Belum Ada Seleksi', selectionRecord: null };
  }

  const selTx = getDederanSelectionRecord(dtx);
  if (!selTx) {
    // Check if in selection_pool as PENDING_DECLARATION
    const pool = storage.get('selection_pool', []);
    const poolItem = pool.find(p => 
      (p.originType === 'REJECT_DEDERAN' || p.sourceModule === 'DEDERAN') &&
      (p.dederanDocNo === dtx.docNo || p.sourceDocNo === dtx.docNo || (p.bedenganId && p.bedenganId === dtx.bedenganId))
    );
    if (poolItem) {
      return { isApproved: false, status: 'PENDING_DECLARATION', statusLabel: 'Perlu Deklarasi Afkir', selectionRecord: null, poolItem };
    }
    return { isApproved: false, status: 'NO_SELECTION', statusLabel: 'Belum Ada Seleksi', selectionRecord: null };
  }

  const rawStatus = (selTx.status || '').toUpperCase();
  const isApproved = rawStatus === SELECTION_STATUS.DISETUJUI || rawStatus === 'DISETUJUI';
  const isWaiting = rawStatus === SELECTION_STATUS.MENUNGGU_VERIFIKASI || rawStatus === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' || rawStatus === 'DIAJUKAN';
  const isReturned = rawStatus === SELECTION_STATUS.DIKEMBALIKAN || rawStatus === 'DIKEMBALIKAN';

  let statusLabel = 'Belum Disetujui';
  if (isApproved) statusLabel = 'Disetujui Asisten Bibitan';
  else if (isWaiting) statusLabel = 'Menunggu Persetujuan Asisten Bibitan';
  else if (isReturned) statusLabel = 'Dikembalikan oleh Asisten Bibitan';

  return {
    isApproved,
    status: rawStatus,
    statusLabel,
    selectionRecord: selTx,
    verifiedAt: selTx.verifiedAt,
    verifiedByName: selTx.verifiedByName
  };
}

/**
 * Gets all eligible Pindah Semai sources derived from 100% completed Dederan Inspections
 * with mandatory SELECTION APPROVAL GATE (status === DISETUJUI)
 * @returns {Array<Object>} Normalized Source Objects
 */
export function getEligiblePindahSemaiSources() {
  const dederTxs = storage.get(DEDERAN_STORAGE_KEYS.TRANSACTIONS, []);
  const seedingTxs = storage.get('seeding_transactions', []);
  const allInspections = storage.get(DEDERAN_STORAGE_KEYS.INSPECTIONS, []);

  const eligibleSources = [];

  dederTxs.forEach((dtx) => {
    const summary = getBedenganInspectionSummary(dtx);

    // 1. Only 100% complete bedengan inspections produce eligible Pindah Semai sources
    if (!summary.isComplete || summary.totalBerhasil <= 0) return;

    // 2. MANDATORY APPROVAL GATE: Selection Pra-Semai must be APPROVED by Asisten Bibitan
    const approval = getDederanSelectionApprovalStatus(dtx);
    if (!approval.isApproved) return;

    // 3. Calculate how much has already been processed by existing Pindah Semai (seeding_transactions)
    let processedQty = 0;
    seedingTxs.forEach(stx => {
      if (
        stx.sourceDederTxId === dtx.id ||
        stx.sourceDederDocNo === dtx.docNo ||
        stx.sourceDocNo === dtx.docNo ||
        stx.dederanTxDocNo === dtx.docNo ||
        stx.dederanDocNo === dtx.docNo ||
        (stx.bedenganId === dtx.bedenganId && stx.parentDederIndukDocNo === dtx.parentDederIndukDocNo)
      ) {
        processedQty += parseInt(stx.totalDisemai || stx.disemai || 0, 10);
      }
    });

    const remainingQty = Math.max(0, summary.totalBerhasil - processedQty);

    // Get primary inspection record reference
    const primaryInsp = allInspections.find(i => i.dederanTxDocNo === dtx.docNo) || {};

    const normalizedSource = {
      sourceType: 'DEDER_INSPECTION',
      // Canonical Source Deder References
      sourceDederTxId: dtx.id || dtx.docNo,
      sourceDederDocNo: dtx.docNo,
      sourceDocNo: dtx.docNo,
      sourceInspectionDocNo: primaryInsp.docNo || dtx.docNo,
      dederanTxDocNo: dtx.docNo,
      parentDederIndukDocNo: dtx.parentDederIndukDocNo,
      sourceIndex: `DED_${dtx.id || dtx.docNo}`,
      originalIndex: `DED_${dtx.id || dtx.docNo}`,
      docNo: dtx.docNo,
      nomorDokumen: dtx.docNo,
      tanggal: primaryInsp.tanggalPemeriksaan || dtx.tanggalDeder,
      program: dtx.programCode || dtx.program || 'PRG/NUR/01/2026',
      programId: dtx.programId || null,
      estateId: dtx.estateId || 'EST-TBS',
      divisionId: dtx.divisionId || 'DIV-001',
      tahapan: 'Rubber Main Nursery',
      klon: dtx.klon || 'GT 1',
      bedenganId: dtx.bedenganId,
      bedenganCode: dtx.bedenganCode,
      bedengan: dtx.bedenganCode,
      qty: summary.totalBerhasil,
      totalBerhasil: summary.totalBerhasil,
      processedQty,
      remainingQty,
      isFullyProcessed: remainingQty === 0,
      isFromDederan: true,
      selectionStatus: approval.status,
      selectionApprovedAt: approval.verifiedAt,
      selectionApprovedBy: approval.verifiedByName
    };

    eligibleSources.push(normalizedSource);
  });

  return eligibleSources;
}

/**
 * Gets all inspected Dederan sources including those pending selection approval (for UX status overview)
 * @returns {Array<Object>} List of all sources with approval metadata
 */
export function getAllInspectedDederanSources() {
  const dederTxs = storage.get(DEDERAN_STORAGE_KEYS.TRANSACTIONS, []);
  const seedingTxs = storage.get('seeding_transactions', []);
  const allInspections = storage.get(DEDERAN_STORAGE_KEYS.INSPECTIONS, []);

  const sources = [];

  dederTxs.forEach((dtx) => {
    const summary = getBedenganInspectionSummary(dtx);
    if (!summary.isComplete || summary.totalBerhasil <= 0) return;

    const approval = getDederanSelectionApprovalStatus(dtx);

    let processedQty = 0;
    seedingTxs.forEach(stx => {
      if (
        stx.sourceDederTxId === dtx.id ||
        stx.sourceDederDocNo === dtx.docNo ||
        stx.sourceDocNo === dtx.docNo ||
        stx.dederanTxDocNo === dtx.docNo ||
        stx.dederanDocNo === dtx.docNo ||
        (stx.bedenganId === dtx.bedenganId && stx.parentDederIndukDocNo === dtx.parentDederIndukDocNo)
      ) {
        processedQty += parseInt(stx.totalDisemai || stx.disemai || 0, 10);
      }
    });

    const remainingQty = Math.max(0, summary.totalBerhasil - processedQty);
    const primaryInsp = allInspections.find(i => i.dederanTxDocNo === dtx.docNo) || {};

    sources.push({
      sourceType: 'DEDER_INSPECTION',
      sourceDederTxId: dtx.id || dtx.docNo,
      sourceDederDocNo: dtx.docNo,
      sourceDocNo: dtx.docNo,
      sourceInspectionDocNo: primaryInsp.docNo || dtx.docNo,
      dederanTxDocNo: dtx.docNo,
      parentDederIndukDocNo: dtx.parentDederIndukDocNo,
      sourceIndex: `DED_${dtx.id || dtx.docNo}`,
      originalIndex: `DED_${dtx.id || dtx.docNo}`,
      docNo: dtx.docNo,
      nomorDokumen: dtx.docNo,
      tanggal: primaryInsp.tanggalPemeriksaan || dtx.tanggalDeder,
      program: dtx.programCode || dtx.program || 'PRG/NUR/01/2026',
      programId: dtx.programId || null,
      estateId: dtx.estateId || 'EST-TBS',
      divisionId: dtx.divisionId || 'DIV-001',
      tahapan: 'Rubber Main Nursery',
      klon: dtx.klon || 'GT 1',
      bedenganId: dtx.bedenganId,
      bedenganCode: dtx.bedenganCode,
      bedengan: dtx.bedenganCode,
      qty: summary.totalBerhasil,
      totalBerhasil: summary.totalBerhasil,
      totalTidakBerhasil: summary.totalTidakBerhasil,
      processedQty,
      remainingQty,
      isFullyProcessed: remainingQty === 0,
      isFromDederan: true,
      isApproved: approval.isApproved,
      selectionStatus: approval.status,
      selectionStatusLabel: approval.statusLabel,
      selectionApprovedAt: approval.verifiedAt,
      selectionApprovedBy: approval.verifiedByName
    });
  });

  return sources;
}

/**
 * Checks if a specific Dederan transaction has remaining eligible Pindah Semai quota
 */
export function getRemainingPindahSemaiQuota(dederTxDocNo) {
  const sources = getEligiblePindahSemaiSources();
  const source = sources.find(s => s.dederanTxDocNo === dederTxDocNo || s.sourceDocNo === dederTxDocNo);
  return source ? source.remainingQty : 0;
}

// ============================================================
// PINDAH SEMAI (POLYBAG) HELPERS
// ============================================================

/**
 * Checks if a Batch is already used in any Pindah Semai transaction (seeding_transactions ONLY).
 * Scope: seeding_transactions — NOT the global 18-key isBatchUsedInTransactions().
 * @param {string} batchId - Batch ID to check
 * @param {string|null} batchCode - Batch Code to check
 * @param {string|null} excludeDocNo - Exclude this transaction docNo (for edit mode)
 * @returns {boolean}
 */
export function isBatchUsedInPindahSemai(batchId, batchCode = null, excludeDocNo = null) {
  if (!batchId && !batchCode) return false;
  const seedingTxs = storage.get('seeding_transactions', []);

  return seedingTxs.some(tx => {
    if (excludeDocNo && tx.docNo === excludeDocNo) return false;

    // 1. Check root-level batch fields (new transaction structure)
    const matchRootId = batchId && (tx.batchId === batchId || tx.batch_id === batchId);
    const matchRootCode = batchCode && (tx.batchCode === batchCode || tx.batchNo === batchCode || tx.batch_code === batchCode);
    if (matchRootId || matchRootCode) return true;

    // 2. Check legacy rows-level batch fields (historical transactions)
    if (Array.isArray(tx.rows)) {
      return tx.rows.some(r =>
        (batchId && (r.batchId === batchId || r.batch_id === batchId)) ||
        (batchCode && (r.batchCode === batchCode || r.batchNo === batchCode || r.batch_code === batchCode))
      );
    }
    return false;
  });
}

/**
 * Calculates the remaining balance for a specific Issue Item using the Single Source of Truth.
 * @param {string} noIssue - Issue Document number or ID
 * @param {string} issueItemId - Specific item ID within the Issue document
 * @param {string|null} itemCode - Item Code for legacy compatibility fallback
 * @param {string|null} excludeDocNo - Exclude this seeding transaction docNo (edit mode)
 * @returns {{ quantityIssue: number, usedQuantity: number, remainingQuantity: number, status: string }}
 */
export function calculateRemainingIssueBalance(noIssue, issueItemId, itemCode = null, excludeDocNo = null) {
  return calcRemainingIssueBalance(noIssue, issueItemId, itemCode, excludeDocNo);
}

/**
 * Gets all eligible Polybag Issue Items for Pindah Semai.
 * Returns item-level objects with derived remaining balance.
 * Eligibility: doc status != INACTIVE, item is POLYBAG/POLIBAG, remaining > 0.
 * Documents whose entire quantity has been consumed (remainingQty <= 0) are excluded.
 * @returns {Array<Object>} Item-level eligible issue objects
 */
export function getEligiblePolybagIssueDocuments() {
  const allDocs = getAllIssueDocuments();
  const eligibleItems = [];

  allDocs.forEach(doc => {
    if (doc.status === 'INACTIVE') return;

    const items = doc.items || [];
    items.forEach(item => {
      const name = String(item.itemName || '').toUpperCase();
      const isPolybag = name.includes('POLYBAG') || name.includes('POLIBAG');
      if (!isPolybag) return;

      const quantityIssue = Number(item.quantityIssue) || 0;
      const usedQuantity = Number(item.usedQuantity) || 0;
      const remainingQuantity = Number(item.remainingQuantity) || 0;

      // JIKA SEMUA SUDAH TERPAKAI (remaining <= 0), DOKUMEN/ITEM TIDAK DAPAT DIGUNAKAN KEMBALI
      if (remainingQuantity <= 0) return;

      eligibleItems.push({
        issueDocId: doc.id,
        issueDocNo: doc.noIssue,
        issueItemId: item.id,
        itemCode: item.itemCode,
        itemName: item.itemName,
        uom: item.uom || 'LBR',
        tanggal: doc.tanggal,
        kodeAlokasi: doc.kodeAlokasi,
        namaAlokasi: doc.namaAlokasi,
        quantityIssue,
        usedQuantity,
        remainingQuantity
      });
    });
  });

  return eligibleItems;
}



