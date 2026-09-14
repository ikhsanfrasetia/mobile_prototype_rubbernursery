/**
 * core/receipt-ksp-manager.js
 * Manajer Data & State Machine Transaksi Penerimaan Bibit Kebun Sepupu.
 * 
 * Sesuai Arsitektur Terkunci:
 * 1. 1 Dispatch (DSP-xxx) = 1 Dokumen Penerimaan (RCP-YYYY-NNN).
 * 2. Menyimpan referensi parentRequestId, dispatchId, dan dispatchDocNo.
 * 3. Lifecycle terisolasi dari parent request (Dispatch selesai -> Receipt MENUNGGU_PENERIMAAN_PENGURUS).
 * 4. Audit trail terintegrasi via transaction-actor.js.
 */

import { storage } from './storage.js';
import { applyTransactionActor, AUDIT_EVENT_TYPES } from './transaction-actor.js';
import {
  RECEIPT_KSP_STATUS,
  RECEIPT_KSP_STATUS_LABELS,
  RECEIPT_KSP_STORAGE_KEY
} from './receipt-ksp-constants.js';
import { addBatchStockFromReceipt, initBatchInventory } from './batch-inventory-service.js';

/**
 * Generator Nomor Dokumen Penerimaan Kebun Sepupu Terstandarisasi
 * Format: RCP-YYYY-NNN (misal: RCP-2026-001)
 * @param {Array<Object>} existingReceipts - Daftar transaksi receipt existing
 * @param {number} year - Tahun dokumen (default: 2026)
 * @returns {string} Canonical Doc No
 */
export function generateReceiptDocNo(existingReceipts = null, year = 2026) {
  const list = Array.isArray(existingReceipts) ? existingReceipts : storage.get(RECEIPT_KSP_STORAGE_KEY, []);
  const prefix = `RCP-${year}-`;
  
  let maxSeq = 0;
  for (const r of list) {
    const docNo = r.receiptDocNo || r.docNo || '';
    if (docNo.startsWith(prefix)) {
      const seqStr = docNo.slice(prefix.length);
      const seqNum = parseInt(seqStr, 10);
      if (!isNaN(seqNum) && seqNum > maxSeq) {
        maxSeq = seqNum;
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const paddedSeq = String(nextSeq).padStart(3, '0');
  return `${prefix}${paddedSeq}`;
}

/**
 * Mengambil seluruh data transaksi penerimaan kebun sepupu dari storage
 * @param {Object} filter - Filter options (parentRequestId, dispatchId, targetEstateId, status, targetNextRole, targetNextDivisionId)
 * @returns {Array<Object>}
 */
export function getReceiptKspTransactions(filter = null) {
  const list = storage.get(RECEIPT_KSP_STORAGE_KEY, []);
  if (!filter) return list;

  return list.filter(r => {
    if (filter.parentRequestId && r.parentRequestId !== filter.parentRequestId) return false;
    if (filter.dispatchId && r.dispatchId !== filter.dispatchId) return false;
    if (filter.dispatchDocNo && r.dispatchDocNo !== filter.dispatchDocNo) return false;
    if (filter.targetEstateId && r.targetEstateId !== filter.targetEstateId) return false;
    if (filter.sourceEstateId && r.sourceEstateId !== filter.sourceEstateId) return false;
    if (filter.status && r.status !== filter.status) return false;
    if (filter.targetNextRole && r.targetNextRole !== filter.targetNextRole) return false;
    if (filter.targetNextDivisionId && r.targetNextDivisionId !== filter.targetNextDivisionId) return false;
    if (filter.targetNextEstateId && r.targetNextEstateId !== filter.targetNextEstateId) return false;
    if (filter.jalurPenerimaan && r.jalurPenerimaan !== filter.jalurPenerimaan) return false;
    return true;
  });
}

/**
 * Mengambil dokumen penerimaan berdasarkan ID
 * @param {string} id
 * @returns {Object|null}
 */
export function getReceiptKspById(id) {
  if (!id) return null;
  const list = storage.get(RECEIPT_KSP_STORAGE_KEY, []);
  return list.find(r => r.id === id) || null;
}

/**
 * Mengambil dokumen penerimaan berdasarkan Dispatch ID
 * @param {string} dispatchId
 * @returns {Object|null}
 */
export function getReceiptKspByDispatchId(dispatchId) {
  if (!dispatchId) return null;
  const list = storage.get(RECEIPT_KSP_STORAGE_KEY, []);
  return list.find(r => r.dispatchId === dispatchId) || null;
}

/**
 * Membuat Dokumen Penerimaan baru secara otomatis dari Transaksi Pengeluaran (Handoff Trigger)
 * @param {Object} dispatchRecord - Record dispatch yang telah dikeluarkan Mantri
 * @param {Object} parentRequest - Record permintaan induk
 * @param {Object} currentUser - Actor session saat ini
 * @returns {Object} Newly created receipt record
 */
export function createReceiptFromDispatch(dispatchRecord, parentRequest, currentUser) {
  if (!dispatchRecord || !parentRequest) {
    throw new Error('Dispatch record dan Parent Request wajib ada untuk membuat dokumen penerimaan.');
  }

  const allReceipts = storage.get(RECEIPT_KSP_STORAGE_KEY, []);
  
  // Cek idempoten: jika receipt untuk dispatchId ini sudah ada, kembalikan record existing
  const existing = allReceipts.find(r => r.dispatchId === dispatchRecord.id);
  if (existing) {
    return existing;
  }

  const receiptDocNo = generateReceiptDocNo(allReceipts, 2026);
  const shippedQty = parseInt(dispatchRecord.issuedQty || dispatchRecord.qty || 0, 10);

  // Buat detail penerimaan per batch sumber dari dispatchRecord.details
  const rawDetails = Array.isArray(dispatchRecord.details) ? dispatchRecord.details : [];
  const receiptDetails = rawDetails.map((b, idx) => ({
    id: `RCP-DTL-${Date.now()}-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`,
    sourceBatchId: b.batchId || b.id || b.batchCode || `BATCH-${idx + 1}`,
    sourceBatchCode: b.batchCode || b.batchNo || '-',
    cloneId: b.clone || b.klon || parentRequest.approvedClone || parentRequest.requestedClone || '-',
    growthStage: parentRequest.growthStage || 'Rubber Advance Planting Material',
    category: parentRequest.category || 'Polibag Besar',
    qtyShipped: parseInt(b.qty || 0, 10),
    qtyAccepted: 0,
    qtyRejected: 0,
    rejectReason: null,
    newBatchId: null,
    newBatchCode: null
  }));

  // Jika dispatchRecord tidak memiliki details array terinci, buat fallback 1 baris
  if (receiptDetails.length === 0) {
    receiptDetails.push({
      id: `RCP-DTL-${Date.now()}-1`,
      sourceBatchId: dispatchRecord.batchId || 'BATCH-SRC-001',
      sourceBatchCode: dispatchRecord.batchCode || dispatchRecord.batchNo || 'B-001',
      cloneId: dispatchRecord.clone || parentRequest.approvedClone || parentRequest.requestedClone || '-',
      growthStage: parentRequest.growthStage || 'Rubber Advance Planting Material',
      category: parentRequest.category || 'Polibag Besar',
      qtyShipped: shippedQty,
      qtyAccepted: 0,
      qtyRejected: 0,
      rejectReason: null,
      newBatchId: null,
      newBatchCode: null
    });
  }

  const initialPayload = {
    id: `RCP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    receiptDocNo: receiptDocNo,
    docNo: receiptDocNo,
    parentRequestId: parentRequest.id,
    parentRequestDocNo: parentRequest.docNo || parentRequest.nomorDokumen || '-',
    dispatchId: dispatchRecord.id,
    dispatchDocNo: dispatchRecord.docNo,
    dispatchNo: dispatchRecord.dispatchNo || dispatchRecord.docNo,
    
    // Asal & Tujuan
    sourceEstateId: dispatchRecord.estateId || currentUser?.estateId,
    sourceEstateName: dispatchRecord.estateName || currentUser?.estateName || '-',
    targetEstateId: parentRequest.estateId, // Kebun Pemohon
    targetEstateName: parentRequest.estateName || '-',
    
    sourceDivisionId: dispatchRecord.divisionId || dispatchRecord.targetDivisionId || null,
    targetDivisionId: parentRequest.divisionId || null,

    jalurPenerimaan: null, // Diisi nanti oleh Asisten Kepala (LAPANGAN | BIBITAN)

    // Kuantitas
    totalShippedQty: shippedQty,
    totalAcceptedQty: 0,
    totalRejectedQty: 0,
    discrepancyQty: 0,
    discrepancyReason: null,

    // Status & Next Routing
    status: RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_PENGURUS,
    statusLabel: RECEIPT_KSP_STATUS_LABELS[RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_PENGURUS],

    targetNextRole: 'PENGURUS',
    targetNextEstateId: parentRequest.estateId, // Ditujukan ke Pengurus Kebun Pemohon
    targetNextDivisionId: null,

    // Child Data
    details: receiptDetails,
    batchAllocations: receiptDetails,
    blockAllocations: [],
    photoEvidence: null,

    vehiclePlate: dispatchRecord.vehiclePlate || null,
    dispatchDate: dispatchRecord.issuedDate || dispatchRecord.createdAt,

    createdAt: new Date().toISOString()
  };

  const auditDetails = `Dokumen penerimaan ${receiptDocNo} dibuat otomatis dari pengeluaran ${dispatchRecord.docNo} (${shippedQty.toLocaleString('id-ID')} Pkk)`;
  const newReceiptRecord = applyTransactionActor(
    initialPayload,
    AUDIT_EVENT_TYPES.CREATE,
    currentUser,
    auditDetails
  );

  allReceipts.push(newReceiptRecord);
  storage.set(RECEIPT_KSP_STORAGE_KEY, allReceipts);

  return newReceiptRecord;
}

/**
 * Update Transaksi Penerimaan Kebun Sepupu dengan Actor Snapshot
 * @param {string} id - Receipt ID
 * @param {Object} patch - Partial update data
 * @param {string} actionType - AUDIT_EVENT_TYPES (UPDATE, APPROVE, VERIFY, dsb)
 * @param {string} details - Catatan audit trail
 * @param {Object} currentUser - Actor session
 * @returns {Object} Updated receipt record
 */
export function updateReceiptKsp(id, patch, actionType = AUDIT_EVENT_TYPES.UPDATE, details = null, currentUser = null) {
  const allReceipts = storage.get(RECEIPT_KSP_STORAGE_KEY, []);
  const idx = allReceipts.findIndex(r => r.id === id);
  if (idx === -1) {
    throw new Error(`Dokumen penerimaan tidak ditemukan: ${id}`);
  }

  const existing = allReceipts[idx];
  const merged = {
    ...existing,
    ...patch,
    id: existing.id,
    receiptDocNo: existing.receiptDocNo,
    parentRequestId: existing.parentRequestId,
    dispatchId: existing.dispatchId,
    updatedAt: new Date().toISOString()
  };

  if (patch.status && RECEIPT_KSP_STATUS_LABELS[patch.status]) {
    merged.statusLabel = RECEIPT_KSP_STATUS_LABELS[patch.status];
  }

  const updatedRecord = applyTransactionActor(
    merged,
    actionType,
    currentUser,
    details || `Perubahan data pada dokumen penerimaan ${existing.receiptDocNo}`
  );

  allReceipts[idx] = updatedRecord;
  storage.set(RECEIPT_KSP_STORAGE_KEY, allReceipts);

  return updatedRecord;
}

/**
 * Generator Kode Batch Pembibitan Baru Khusus Jalur Penerimaan Bibitan
 * Format: B-${cleanClone}-${cleanEstate}-${seq} atau B-RCP-${cleanEstate}-${seq}
 * @param {string} estateIdOrCode - Estate ID / Code (e.g. 'EST-APM' -> 'APM')
 * @param {string} cloneName - Nama Klon (e.g. 'IRCA 19' -> 'IRCA19')
 * @param {string} sourceBatchCode - Kode batch sumber (untuk memastikan tidak ada duplikasi)
 * @param {Array<Object>} [customBatches] - Daftar batch existing opsional
 * @returns {string} Unique new batch code
 */
export function generateReceiptNewBatchCode(estateIdOrCode, cloneName = '', sourceBatchCode = null, customBatches = null) {
  const existingBatches = Array.isArray(customBatches) ? customBatches : storage.get('nursery_batches', []);
  
  const rawEstate = String(estateIdOrCode || 'NUR').trim().toUpperCase();
  const cleanEstate = rawEstate.replace(/^EST-/, '').replace(/[^A-Z0-9]/g, '') || 'NUR';
  const cleanClone = String(cloneName || 'GEN').trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'GEN';
  
  const prefix = `B-${cleanClone}-${cleanEstate}-`;
  const cleanSource = sourceBatchCode ? String(sourceBatchCode).trim().toUpperCase() : null;

  let maxSeq = 0;
  for (const b of existingBatches) {
    const bCode = String(b.batchCode || b.batchNo || b.id || '').trim().toUpperCase();
    if (bCode.startsWith(prefix)) {
      const seqStr = bCode.slice(prefix.length);
      const seqNum = parseInt(seqStr, 10);
      if (!isNaN(seqNum) && seqNum > maxSeq) {
        maxSeq = seqNum;
      }
    }
  }

  let nextSeq = maxSeq + 1;
  let candidateCode = `${prefix}${String(nextSeq).padStart(2, '0')}`;

  // Pastikan candidateCode tidak sama dengan sourceBatchCode dan belum pernah digunakan
  while (
    (cleanSource && candidateCode.toUpperCase() === cleanSource) ||
    existingBatches.some(b => (b.batchCode || b.batchNo || b.id || '').trim().toUpperCase() === candidateCode.toUpperCase())
  ) {
    nextSeq++;
    candidateCode = `${prefix}${String(nextSeq).padStart(2, '0')}`;
  }

  return candidateCode;
}

/**
 * Membuat data batch baru pada nursery_batches untuk setiap rincian batch yang diterima
 * @param {Object} receipt - Dokumen receipt
 * @param {Array<Object>} detailsResults - Rincian kuantitas per batch [{ sourceBatchId, sourceBatchCode, cloneId, category, growthStage, qtyAccepted, qtyRejected }]
 * @param {Object} currentUser - Actor session
 * @returns {Array<Object>} Array of newly created nursery batches
 */
export function createNurseryBatchesFromReceipt(receipt, detailsResults, currentUser) {
  if (!receipt || !Array.isArray(detailsResults)) {
    throw new Error('Receipt dan rincian kuantitas penerimaan wajib ada.');
  }

  let allNurseryBatches = storage.get('nursery_batches', []);
  const createdBatches = [];

  for (let idx = 0; idx < detailsResults.length; idx++) {
    const d = detailsResults[idx];
    const acceptedQty = parseInt(d.qtyAccepted, 10) || 0;
    const rejectedQty = parseInt(d.qtyRejected, 10) || 0;

    // Jika kuantitas layak > 0, bentuk nursery batch baru
    if (acceptedQty > 0) {
      const estateId = receipt.targetEstateId || currentUser.estateId;
      const divisionId = receipt.targetNextDivisionId || receipt.targetDivisionId || currentUser.divisionId || 'DIV-01';
      const cloneName = d.cloneId || receipt.clone || 'IRCA 19';
      const sourceBatchCode = d.sourceBatchCode || d.batchCode || '-';
      
      const newBatchCode = d.newBatchCode || generateReceiptNewBatchCode(estateId, cloneName, sourceBatchCode, allNurseryBatches);
      const newBatchId = `BATCH-${Date.now()}-${idx + 1}-${Math.random().toString(36).slice(2, 6)}`;

      const newBatchObj = {
        id: newBatchId,
        batchId: newBatchId,
        batchCode: newBatchCode,
        batchNo: newBatchCode,
        sourceBatchId: d.sourceBatchId || d.batchId || sourceBatchCode,
        sourceBatchCode: sourceBatchCode,

        estateId: estateId,
        estateCode: estateId,
        estateName: receipt.targetEstateName || estateId,
        divisionId: divisionId,
        divisionCode: divisionId,
        divisionName: receipt.targetNextDivisionName || divisionId,

        cloneId: cloneName,
        clone: cloneName,
        klon: cloneName,
        programId: receipt.programId || 'PRG-2026-001',
        category: d.category || 'Polibag Besar',
        growthStage: d.growthStage || 'Rubber Advance Planting Material',
        stage: d.growthStage || 'Rubber Advance Planting Material',
        bedenganIds: d.bedenganIds || (d.bedenganId ? [d.bedenganId] : []),

        receivedQty: acceptedQty,
        availableQty: acceptedQty,
        initialQty: acceptedQty,
        currentQty: acceptedQty,
        rejectedQty: rejectedQty,

        sourceReceiptId: receipt.id,
        sourceReceiptDocNo: receipt.receiptDocNo || receipt.docNo,
        sourceDispatchId: receipt.dispatchId,
        sourceDispatchDocNo: receipt.dispatchDocNo,
        sourceParentRequestId: receipt.parentRequestId,
        sourceParentRequestDocNo: receipt.parentRequestDocNo,

        status: 'AVAILABLE',
        createdAt: new Date().toISOString(),
        createdBy: currentUser.name || currentUser.userId
      };

      allNurseryBatches.push(newBatchObj);
      createdBatches.push(newBatchObj);

      // Inisialisasi inventory state & catat jurnal mutasi via Batch Inventory Service
      initBatchInventory(newBatchId, newBatchCode, acceptedQty, {
        refId: receipt.receiptDocNo || receipt.docNo,
        createdBy: currentUser.name || currentUser.userId,
        notes: `Penerimaan bibit dari transaksi ${receipt.receiptDocNo || receipt.docNo}`
      });

      // Simpan referensi new batch ke detail
      d.newBatchId = newBatchId;
      d.newBatchCode = newBatchCode;
    }
  }

  // Simpan ke storage jika ada batch baru yang terbentuk
  if (createdBatches.length > 0) {
    storage.set('nursery_batches', allNurseryBatches);
  }

  return createdBatches;
}

