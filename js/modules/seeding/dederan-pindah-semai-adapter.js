/**
 * modules/seeding/dederan-pindah-semai-adapter.js
 * Pindah Semai Source Adapter & Normalization Layer.
 *
 * Responsibilities:
 * - Reads 100% complete Dederan Inspections with successful quantities (jumlahBerhasil > 0).
 * - Tracks processed quantities in existing seeding_transactions.
 * - Computes remaining eligible quantities without mutating seeding_transactions schema.
 * - Normalizes inspection records into the standard interface expected by seeding-landing.js and seeding-form.js.
 * - Prevents duplicate Pindah Semai processing.
 * - Preserves downstream technical identifiers (SOW, seeding_transactions, sourceSeedingDocNo).
 */

import { storage } from '../../core/storage.js';
import { DEDERAN_STORAGE_KEYS, getBedenganInspectionSummary, getDederanTransactionsByParent } from './dederan-manager.js';

/**
 * Gets all eligible Pindah Semai sources derived from 100% completed Dederan Inspections
 * @returns {Array<Object>} Normalized Source Objects
 */
export function getEligiblePindahSemaiSources() {
  const dederTxs = storage.get(DEDERAN_STORAGE_KEYS.TRANSACTIONS, []);
  const seedingTxs = storage.get('seeding_transactions', []);
  const allInspections = storage.get(DEDERAN_STORAGE_KEYS.INSPECTIONS, []);

  const eligibleSources = [];

  dederTxs.forEach((dtx, idx) => {
    const summary = getBedenganInspectionSummary(dtx);

    // Only 100% complete bedengan inspections produce eligible Pindah Semai sources
    if (!summary.isComplete || summary.totalBerhasil <= 0) return;

    // Calculate how much has already been processed by existing Pindah Semai (seeding_transactions)
    let processedQty = 0;
    seedingTxs.forEach(stx => {
      if (
        stx.sourceDocNo === dtx.docNo ||
        stx.dederanTxDocNo === dtx.docNo ||
        stx.dederanDocNo === dtx.docNo ||
        stx.bedenganId === dtx.bedenganId && stx.parentDederIndukDocNo === dtx.parentDederIndukDocNo
      ) {
        processedQty += parseInt(stx.totalDisemai || stx.disemai || 0, 10);
      }
    });

    const remainingQty = Math.max(0, summary.totalBerhasil - processedQty);

    // Get primary inspection record reference
    const primaryInsp = allInspections.find(i => i.dederanTxDocNo === dtx.docNo) || {};

    const normalizedSource = {
      sourceType: 'DEDER_INSPECTION',
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
      batchNo: dtx.batchNo || 'Batch-01',
      bedenganId: dtx.bedenganId,
      bedenganCode: dtx.bedenganCode,
      bedengan: dtx.bedenganCode,
      qty: summary.totalBerhasil,
      totalBerhasil: summary.totalBerhasil,
      processedQty,
      remainingQty,
      isFullyProcessed: remainingQty === 0,
      isFromDederan: true
    };

    eligibleSources.push(normalizedSource);
  });

  return eligibleSources;
}

/**
 * Checks if a specific Dederan transaction has remaining eligible Pindah Semai quota
 */
export function getRemainingPindahSemaiQuota(dederTxDocNo) {
  const sources = getEligiblePindahSemaiSources();
  const source = sources.find(s => s.dederanTxDocNo === dederTxDocNo || s.sourceDocNo === dederTxDocNo);
  return source ? source.remainingQty : 0;
}
