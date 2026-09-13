/**
 * js/modules/consolidation/consolidation-manager.js
 * Engine Konsolidasi Data Transaksi Pembibitan (TASK ASB-11)
 * 
 * Prinsip:
 * - Dikelola oleh Role ASISTEN_BIBITAN
 * - PURE AGGREGATION & DERIVED VIEW: Tidak membuat storage source of truth baru
 * - ZERO STOCK MUTATION: Tidak mengubah availableQty, currentQty, atau status batch
 * - Scope Isolation: Hanya menampilkan transaksi dalam lingkup estateId & divisionId ASB
 * - Consistency Check: Mendeteksi anomali/rantai transaksi yang tidak lengkap
 */

import { storage } from '../../core/storage.js';
import { normalizeRole, ROLES } from '../../core/user-context.js';
import { getAllBatches, getBatchById, getBatchByCode } from '../../data/batch-master.js';
import { getAllBedengan, getBedenganById } from '../../data/bedengan-master.js';
import { getActivePrograms, getProgramById } from '../../data/program-master.js';
import { getAllEstates, getEstateById } from '../../data/estate-master.js';
import { getActiveKlons } from '../../data/klon-master.js';

export const CONSOLIDATION_STATUS = Object.freeze({
  LENGKAP: 'LENGKAP',
  PERLU_PERHATIAN: 'PERLU_PERHATIAN',
  TIDAK_LENGKAP: 'TIDAK_LENGKAP'
});

/**
 * Filter item berdasarkan scope Asisten Bibitan (estateId dan opsional divisionId)
 */
export function filterByAsbScope(records, currentUser) {
  if (!Array.isArray(records) || !currentUser) return [];
  const userEstateId = currentUser.estateId;
  const userDivisionId = currentUser.divisionId;

  return records.filter(item => {
    // Cek targetEstateId / estateId / sourceEstateId
    const itemEstate = item.targetEstateId || item.estateId || item.sourceEstateId;
    if (userEstateId && itemEstate && itemEstate !== userEstateId) {
      return false;
    }

    // Cek targetDivisionId / divisionId / sourceDivisionId jika ada pada user
    const itemDivision = item.targetDivisionId || item.divisionId || item.sourceDivisionId;
    if (userDivisionId && itemDivision && itemDivision !== userDivisionId) {
      return false;
    }

    return true;
  });
}

/**
 * Mengambil seluruh data transaksi terkonsolidasi dalam scope pengguna aktif
 */
export function getConsolidatedData(currentUser = null, filters = {}) {
  const allRequests = storage.get('requests_transactions', []);
  const allDispatches = storage.get('dispatch_transactions', []);
  const allReceipts = storage.get('receipt_ksp_transactions', []);
  const allSelections = storage.get('selection_transactions', []);
  const allDestructions = storage.get('destruction_transactions', []);
  const allBatches = storage.get('nursery_batches', []);
  const allBedengan = getAllBedengan();

  // Scope filtering jika currentUser diberikan
  const scopedRequests = currentUser ? filterByAsbScope(allRequests, currentUser) : allRequests;
  const scopedDispatches = currentUser ? filterByAsbScope(allDispatches, currentUser) : allDispatches;
  const scopedReceipts = currentUser ? filterByAsbScope(allReceipts, currentUser) : allReceipts;
  const scopedSelections = currentUser ? filterByAsbScope(allSelections, currentUser) : allSelections;
  const scopedDestructions = currentUser ? filterByAsbScope(allDestructions, currentUser) : allDestructions;
  const scopedBatches = currentUser && currentUser.estateId 
    ? allBatches.filter(b => b.estateId === currentUser.estateId && (!currentUser.divisionId || b.divisionId === currentUser.divisionId))
    : allBatches;

  // Consistency checks
  const consistencyReport = runConsistencyCheck({
    requests: scopedRequests,
    dispatches: scopedDispatches,
    receipts: scopedReceipts,
    selections: scopedSelections,
    destructions: scopedDestructions,
    batches: allBatches
  });

  // Derived Status
  let overallStatus = CONSOLIDATION_STATUS.LENGKAP;
  if (consistencyReport.errors.length > 0) {
    overallStatus = CONSOLIDATION_STATUS.PERLU_PERHATIAN;
  } else if (consistencyReport.warnings.length > 0) {
    overallStatus = CONSOLIDATION_STATUS.TIDAK_LENGKAP;
  }

  return {
    currentUser,
    status: overallStatus,
    summary: {
      totalRequests: scopedRequests.length,
      totalDispatches: scopedDispatches.length,
      totalReceipts: scopedReceipts.length,
      totalSelections: scopedSelections.length,
      totalDestructions: scopedDestructions.length,
      totalBatches: scopedBatches.length,
      inconsistenciesCount: consistencyReport.errors.length + consistencyReport.warnings.length
    },
    requests: scopedRequests,
    dispatches: scopedDispatches,
    receipts: scopedReceipts,
    selections: scopedSelections,
    destructions: scopedDestructions,
    batches: scopedBatches,
    consistency: consistencyReport
  };
}

/**
 * Consistency Check Engine
 * Memeriksa integritas dan relasi antar rantai transaksi
 */
export function runConsistencyCheck(dataset) {
  const { requests = [], dispatches = [], receipts = [], selections = [], destructions = [], batches = [] } = dataset;
  const errors = [];
  const warnings = [];

  const batchMap = new Map();
  batches.forEach(b => {
    batchMap.set(b.id, b);
    if (b.batchCode) batchMap.set(b.batchCode, b);
    if (b.batchNo) batchMap.set(b.batchNo, b);
  });

  const requestMap = new Map();
  requests.forEach(r => {
    requestMap.set(r.id, r);
    if (r.docNo) requestMap.set(r.docNo, r);
  });

  const dispatchMap = new Map();
  dispatches.forEach(d => {
    dispatchMap.set(d.id, d);
    if (d.docNo) dispatchMap.set(d.docNo, d);
    if (d.dispatchNo) dispatchMap.set(d.dispatchNo, d);
  });

  // 1. Validasi Dispatches
  dispatches.forEach(d => {
    // 1a. Dispatch tanpa parent request valid
    if (d.parentRequestId && !requestMap.has(d.parentRequestId)) {
      errors.push({
        type: 'ORPHAN_DISPATCH',
        severity: 'ERROR',
        docNo: d.docNo || d.dispatchNo,
        message: `Dispatch ${d.docNo || d.dispatchNo} menunjuk Parent Request (${d.parentRequestId}) yang tidak ditemukan.`
      });
    }

    // 1b. Batch detail reference
    const bRows = d.details || d.batchDetails || [];
    bRows.forEach(b => {
      const bCode = b.batchId || b.batchCode || b.batchNo;
      if (bCode && !batchMap.has(bCode)) {
        errors.push({
          type: 'MISSING_BATCH_REFERENCE',
          severity: 'ERROR',
          docNo: d.docNo || d.dispatchNo,
          message: `Dispatch ${d.docNo || d.dispatchNo} menggunakan batch ${bCode} yang tidak terdaftar di nursery_batches.`
        });
      }
    });
  });

  // 2. Validasi Receipts
  receipts.forEach(rcp => {
    // 2a. Receipt tanpa dispatch valid
    if (rcp.dispatchId && !dispatchMap.has(rcp.dispatchId)) {
      errors.push({
        type: 'ORPHAN_RECEIPT',
        severity: 'ERROR',
        docNo: rcp.docNo || rcp.receiptDocNo,
        message: `Tanda Terima ${rcp.docNo || rcp.receiptDocNo} menunjuk Dispatch (${rcp.dispatchId}) yang tidak ditemukan.`
      });
    }

    // 2b. Accepted + Rejected > Shipped
    const shipped = parseInt(rcp.totalShippedQty || rcp.shippedQty || 0, 10);
    const accepted = parseInt(rcp.totalAcceptedQty || rcp.acceptedQty || 0, 10);
    const rejected = parseInt(rcp.totalRejectedQty || rcp.rejectedQty || 0, 10);
    if (accepted + rejected > shipped && shipped > 0) {
      errors.push({
        type: 'RECEIPT_QTY_OVERFLOW',
        severity: 'ERROR',
        docNo: rcp.docNo || rcp.receiptDocNo,
        message: `Penerimaan ${rcp.docNo || rcp.receiptDocNo}: Diterima (${accepted}) + Ditolak (${rejected}) melebihi kuantitas dikirim (${shipped}).`
      });
    }
  });

  // 3. Validasi Requests
  requests.forEach(req => {
    const approved = parseInt(req.approvedQty || req.requestedQty || 0, 10);
    const issued = parseInt(req.totalIssuedQty || req.actualIssuedQty || 0, 10);
    if (issued > approved && approved > 0) {
      errors.push({
        type: 'REQUEST_OVER_ISSUED',
        severity: 'ERROR',
        docNo: req.docNo,
        message: `Permintaan ${req.docNo}: Total dikeluarkan (${issued}) melebihi kuota disetujui (${approved}).`
      });
    } else if (approved > 0 && issued < approved && (req.status === 'TERVERIFIKASI' || req.status === 'PENGELUARAN_BERJALAN')) {
      warnings.push({
        type: 'INCOMPLETE_CHAIN',
        severity: 'WARNING',
        docNo: req.docNo,
        message: `Permintaan ${req.docNo}: Pengeluaran belum selesai (${issued}/${approved} Pkk). Sisa: ${approved - issued} Pkk.`
      });
    }
  });

  // 4. Validasi Selections
  selections.forEach(sel => {
    const bCode = sel.batchId || sel.batchCode || sel.batchNo;
    if (bCode && !batchMap.has(bCode)) {
      errors.push({
        type: 'SELECTION_MISSING_BATCH',
        severity: 'ERROR',
        docNo: sel.docNo || sel.selectionNo,
        message: `Hasil Seleksi ${sel.docNo || sel.selectionNo} menunjuk batch ${bCode} yang tidak terdaftar.`
      });
    }

    const checked = parseInt(sel.jumlahDiperiksa || 0, 10);
    const pass = parseInt(sel.jumlahLayak || 0, 10);
    const cull = parseInt(sel.jumlahAfkir || 0, 10);
    if (checked > 0 && pass + cull !== checked) {
      errors.push({
        type: 'SELECTION_SUM_MISMATCH',
        severity: 'ERROR',
        docNo: sel.docNo || sel.selectionNo,
        message: `Hasil Seleksi ${sel.docNo || sel.selectionNo}: Layak (${pass}) + Afkir (${cull}) != Diperiksa (${checked}).`
      });
    }
  });

  // 5. Validasi Destructions
  destructions.forEach(dst => {
    const bCode = dst.batchId || dst.batchCode || dst.batchNo;
    if (bCode && !batchMap.has(bCode)) {
      errors.push({
        type: 'DESTRUCTION_MISSING_BATCH',
        severity: 'ERROR',
        docNo: dst.docNo || dst.destructionNo,
        message: `Pemusnahan ${dst.docNo || dst.destructionNo} menunjuk batch ${bCode} yang tidak terdaftar.`
      });
    }

    const qty = parseInt(dst.quantity || dst.destructionQty || 0, 10);
    if (qty <= 0) {
      errors.push({
        type: 'DESTRUCTION_ZERO_QTY',
        severity: 'ERROR',
        docNo: dst.docNo || dst.destructionNo,
        message: `Pemusnahan ${dst.docNo || dst.destructionNo} memiliki kuantitas tidak valid (${qty}).`
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Resolver Rantai Traceability Lengkap untuk Transaksi Tertentu
 */
export function buildTraceabilityChain(recordType, recordIdOrDocNo) {
  const allRequests = storage.get('requests_transactions', []);
  const allDispatches = storage.get('dispatch_transactions', []);
  const allReceipts = storage.get('receipt_ksp_transactions', []);
  const allSelections = storage.get('selection_transactions', []);
  const allDestructions = storage.get('destruction_transactions', []);
  const allBatches = storage.get('nursery_batches', []);

  let matchedRequest = null;
  let matchedDispatches = [];
  let matchedReceipts = [];
  let matchedBatches = [];
  let matchedSelections = [];
  let matchedDestructions = [];
  let chainType = 'DISTRIBUTION_CHAIN';

  if (recordType === 'REQUEST') {
    chainType = 'DISTRIBUTION_CHAIN';
    matchedRequest = allRequests.find(r => r.id === recordIdOrDocNo || r.docNo === recordIdOrDocNo || r.nir === recordIdOrDocNo || r.requestNumber === recordIdOrDocNo);
    if (matchedRequest) {
      matchedDispatches = allDispatches.filter(d => d.parentRequestId === matchedRequest.id || d.parentRequestDocNo === matchedRequest.docNo || d.parentRequestDocNo === matchedRequest.nir);
      const dispIds = new Set(matchedDispatches.map(d => d.id));
      const dispDocNos = new Set(matchedDispatches.map(d => d.docNo || d.dispatchNo));
      matchedReceipts = allReceipts.filter(rcp => dispIds.has(rcp.dispatchId) || dispDocNos.has(rcp.dispatchDocNo) || dispDocNos.has(rcp.dispatchNo) || rcp.parentRequestId === matchedRequest.id);
    }
  } else if (recordType === 'DISPATCH') {
    chainType = 'DISTRIBUTION_CHAIN';
    const disp = allDispatches.find(d => d.id === recordIdOrDocNo || d.docNo === recordIdOrDocNo || d.dispatchNo === recordIdOrDocNo);
    if (disp) {
      matchedDispatches = [disp];
      if (disp.parentRequestId) {
        matchedRequest = allRequests.find(r => r.id === disp.parentRequestId || r.docNo === disp.parentRequestDocNo || r.nir === disp.parentRequestDocNo);
      }
      matchedReceipts = allReceipts.filter(rcp => rcp.dispatchId === disp.id || rcp.dispatchDocNo === disp.docNo || rcp.dispatchNo === disp.dispatchNo);
    }
  } else if (recordType === 'RECEIPT') {
    chainType = 'DISTRIBUTION_CHAIN';
    const rcp = allReceipts.find(r => r.id === recordIdOrDocNo || r.docNo === recordIdOrDocNo || r.receiptDocNo === recordIdOrDocNo);
    if (rcp) {
      matchedReceipts = [rcp];
      if (rcp.dispatchId) {
        const disp = allDispatches.find(d => d.id === rcp.dispatchId || d.docNo === rcp.dispatchDocNo || d.dispatchNo === rcp.dispatchNo);
        if (disp) {
          matchedDispatches = [disp];
          if (disp.parentRequestId) {
            matchedRequest = allRequests.find(r => r.id === disp.parentRequestId || r.docNo === disp.parentRequestDocNo);
          }
        }
      }
    }
  } else if (recordType === 'BATCH' || recordType === 'SELECTION' || recordType === 'DESTRUCTION') {
    chainType = 'BATCH_LIFECYCLE_CHAIN';
    let bObj = null;
    if (recordType === 'BATCH') {
      bObj = allBatches.find(b => b.id === recordIdOrDocNo || b.batchCode === recordIdOrDocNo || b.batchNo === recordIdOrDocNo);
    } else if (recordType === 'SELECTION') {
      const sel = allSelections.find(s => s.id === recordIdOrDocNo || s.docNo === recordIdOrDocNo || s.selectionNo === recordIdOrDocNo);
      if (sel) {
        matchedSelections = [sel];
        const bId = sel.batchId || sel.batchCode;
        bObj = allBatches.find(b => b.id === bId || b.batchCode === bId || b.batchNo === bId);
      }
    } else if (recordType === 'DESTRUCTION') {
      const dst = allDestructions.find(d => d.id === recordIdOrDocNo || d.docNo === recordIdOrDocNo || d.destructionNo === recordIdOrDocNo);
      if (dst) {
        matchedDestructions = [dst];
        const bId = dst.batchId || dst.batchCode;
        bObj = allBatches.find(b => b.id === bId || b.batchCode === bId || b.batchNo === bId);
      }
    }

    if (bObj) {
      matchedBatches = [bObj];
      const bKey = bObj.id;
      const bCode = bObj.batchCode || bObj.batchNo;
      matchedSelections = allSelections.filter(s => s.batchId === bKey || s.batchCode === bCode || s.batchNo === bCode);
      matchedDestructions = allDestructions.filter(d => d.batchId === bKey || d.batchCode === bCode || d.batchNo === bCode);
    }
  }

  return {
    type: chainType,
    recordType,
    recordId: recordIdOrDocNo,
    request: matchedRequest,
    dispatch: matchedDispatches[0] || null,
    receipt: matchedReceipts[0] || null,
    dispatches: matchedDispatches,
    receipts: matchedReceipts,
    batch: matchedBatches[0] || null,
    batches: matchedBatches,
    selections: matchedSelections,
    destructions: matchedDestructions
  };
}
