/**
 * js/modules/destruction/destruction-manager.js
 * Manager, Business Logic, & Resolver for Pemusnahan Bibit (TASK ASB-10)
 * 
 * Prinsip:
 * - Dikelola oleh Role ASISTEN_BIBITAN (Pemeriksaan, Setujui, Kembalikan)
 * - Diajukan oleh MANTRI_TANAMAN (Pengajuan Pemusnahan)
 * - SANGAT PENTING: ZERO STOCK MUTATION pada ASB-10 (Mutasi stok ditunda ke ASB-14)
 * - Single Source of Truth: storage key 'destruction_transactions'
 * - Traceability: Pemusnahan -> Batch -> Bedengan -> Program -> Estate -> Divisi
 */

import { storage } from '../../core/storage.js';
import { normalizeRole, ROLES } from '../../core/user-context.js';
import { getBatchById, getBatchByCode } from '../../data/batch-master.js';
import { getBedenganById } from '../../data/bedengan-master.js';
import { getProgramById } from '../../data/program-master.js';
import { getEstateById, resolveNurseryDivision } from '../../data/estate-master.js';
import { formatStandardDocNo, formatDate } from '../../core/utils.js';
import { applyTransactionActor, AUDIT_EVENT_TYPES } from '../../core/transaction-actor.js';
import { 
  deductBatchStock as deductInventoryStock, 
  getAvailableQty as getInventoryAvailableQty, 
  INVENTORY_TX_TYPE 
} from '../../core/batch-inventory-service.js';
import { getBatchContext } from '../../core/master-context-service.js';

export const DESTRUCTION_STATUS = Object.freeze({
  MENUNGGU_VERIFIKASI: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
  DISETUJUI: 'DISETUJUI',
  DIKEMBALIKAN: 'DIKEMBALIKAN'
});

export const STOCK_MUTATION_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPLIED: 'APPLIED',
  FAILED: 'FAILED',
  ALREADY_APPLIED: 'ALREADY_APPLIED'
});

export const DESTRUCTION_REASONS = Object.freeze([
  'Bibit mati',
  'Bibit sakit / Hama & Penyakit',
  'Kerusakan fisik / Abnormal',
  'Tidak memenuhi standar mutu',
  'Lainnya'
]);

export const DESTRUCTION_STORAGE_KEY = 'destruction_transactions';

/**
 * Validasi otorisasi Asisten Bibitan untuk memeriksa pengajuan pemusnahan
 */
export function canPerformAsistenDestructionAction(item, currentUser) {
  if (!item || !currentUser) return false;
  const role = normalizeRole(currentUser.role || currentUser.rawRole);
  if (role !== ROLES.ASISTEN_BIBITAN) return false;

  // Scope: Estate match
  if (currentUser.estateId && item.estateId && currentUser.estateId !== item.estateId) {
    return false;
  }

  // Scope: Division match if present on user
  if (currentUser.divisionId && item.divisionId && currentUser.divisionId !== item.divisionId) {
    return false;
  }

  const s = (item.status || '').toUpperCase();
  return (
    s === DESTRUCTION_STATUS.MENUNGGU_VERIFIKASI ||
    s === 'DIAJUKAN' ||
    s === 'PENDING'
  );
}

/**
 * Filter daftar pemusnahan sesuai scope pengguna
 */
export function filterDestructionByScope(records, currentUser) {
  if (!Array.isArray(records) || !currentUser) return [];
  const role = normalizeRole(currentUser.role || currentUser.rawRole);

  return records.filter(item => {
    // Estate scope
    if (currentUser.estateId && item.estateId && item.estateId !== currentUser.estateId) {
      return false;
    }
    // Division scope for division-level roles
    if (currentUser.divisionId && item.divisionId && item.divisionId !== currentUser.divisionId) {
      return false;
    }
    return true;
  });
}

/**
 * Hitung jumlah transaksi pemusnahan yang memerlukan tindakan Asisten Bibitan
 */
export function getActionableDestructionCount(records = null, currentUser) {
  if (!currentUser) return 0;
  const list = records !== null ? records : storage.get(DESTRUCTION_STORAGE_KEY, []);
  if (!Array.isArray(list)) return 0;

  return list.filter(item => canPerformAsistenDestructionAction(item, currentUser)).length;
}

/**
 * Validasi form pengajuan pemusnahan bibit
 */
export function validateDestructionData(payload) {
  const errors = [];
  if (!payload) {
    return { isValid: false, errors: ['Data pengajuan pemusnahan tidak boleh kosong.'] };
  }

  const qty = parseInt(payload.quantity || payload.destructionQty || 0, 10);
  if (isNaN(qty) || qty <= 0) {
    errors.push('Jumlah bibit yang dimusnahkan harus lebih besar dari 0.');
  }

  // Reason validation
  const reason = (payload.reason || payload.alasan || '').trim();
  if (!reason) {
    errors.push('Alasan pemusnahan wajib dipilih.');
  }

  const description = (payload.description || payload.catatan || '').trim();
  if (reason.toLowerCase() === 'lainnya' && !description) {
    errors.push('Catatan/keterangan rinci wajib diisi jika memilih alasan Lainnya.');
  }

  // Batch validation
  const batchCodeOrId = payload.batchId || payload.batchCode || payload.batchNo;
  if (!batchCodeOrId) {
    errors.push('Batch sumber bibit wajib dipilih.');
  }

  const bObj = payload.batchId ? getBatchById(payload.batchId) : getBatchByCode(batchCodeOrId);
  if (bObj) {
    if (bObj.status === 'INACTIVE') {
      errors.push(`Batch ${bObj.batchCode || bObj.batchNo} dalam status INACTIVE (nonaktif) dan tidak dapat dimusnahkan.`);
    }
    if ((bObj.availableQty || 0) === 0 || bObj.status === 'EMPTY') {
      errors.push(`Stok batch ${bObj.batchCode || bObj.batchNo} sudah habis (0 Pkk).`);
    } else if (qty > (bObj.availableQty || 0)) {
      errors.push(`Jumlah pemusnahan (${qty.toLocaleString('id-ID')} Pkk) melebihi stok tersedia pada batch (${(bObj.availableQty || 0).toLocaleString('id-ID')} Pkk).`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    quantity: qty,
    reason,
    description,
    batchObj: bObj || null
  };
}

/**
 * Membuat transaksi pengajuan pemusnahan baru (oleh Mantri Bibitan)
 */
export function createDestructionRecord(payload, currentUser) {
  const val = validateDestructionData(payload);
  if (!val.isValid) {
    throw new Error(val.errors.join(' '));
  }

  const allRecords = storage.get(DESTRUCTION_STORAGE_KEY, []);
  const docNo = payload.docNo || payload.destructionNo || formatStandardDocNo(2026, 'DST', allRecords.length + 1);

  const bObj = val.batchObj || (payload.batchId ? getBatchById(payload.batchId) : getBatchByCode(payload.batchCode || payload.batchNo));
  const batchId = bObj ? bObj.id : (payload.batchId || `BATCH-${Date.now()}`);
  const batchCode = bObj ? (bObj.batchCode || bObj.batchNo) : (payload.batchCode || payload.batchNo || 'B-001');

  const bedenganIds = payload.bedenganIds || (payload.bedenganId ? [payload.bedenganId] : (bObj?.bedenganIds || []));

  const destructionId = `DST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const newRecord = applyTransactionActor(
    {
      id: destructionId,
      destructionId: destructionId,
      docNo: docNo,
      destructionNo: docNo,
      transactionType: 'PEMUSNAHAN_BIBIT',
      
      batchId: batchId,
      batchCode: batchCode,
      
      estateId: payload.estateId || bObj?.estateId || currentUser.estateId,
      estateName: payload.estateName || bObj?.estateName || currentUser.estateName || '-',
      divisionId: payload.divisionId || bObj?.divisionId || currentUser.divisionId,
      divisionName: payload.divisionName || bObj?.divisionName || currentUser.divisionName || '-',
      
      programId: payload.programId || bObj?.programId || 'PRG-2026-001',
      programName: payload.programName || bObj?.programName || '-',
      
      cloneId: payload.cloneId || payload.clone || payload.klon || bObj?.clone || 'IRCA 19',
      clone: payload.clone || payload.klon || bObj?.clone || 'IRCA 19',
      klon: payload.clone || payload.klon || bObj?.clone || 'IRCA 19',
      growthStage: payload.growthStage || payload.stage || bObj?.growthStage || 'Rubber Advance Planting Material',
      category: payload.category || bObj?.category || 'Polibag Besar',
      
      bedenganIds: bedenganIds,
      bedenganId: bedenganIds.length > 0 ? bedenganIds[0] : (payload.bedenganId || null),
      bedengan: payload.bedengan || (bedenganIds.length > 0 ? bedenganIds.join(', ') : '-'),
      
      quantity: val.quantity,
      destructionQty: val.quantity,
      reason: val.reason,
      alasan: val.reason,
      description: val.description || '-',
      catatan: val.description || '-',
      
      sourceSelectionId: payload.sourceSelectionId || null,
      sourceSelectionNo: payload.sourceSelectionNo || null,
      photoEvidence: payload.photoEvidence || null,
      
      tanggalPemusnahan: payload.tanggalPemusnahan || payload.destructionDate || payload.date || formatDate(new Date().toISOString()),
      date: payload.tanggalPemusnahan || payload.destructionDate || payload.date || formatDate(new Date().toISOString()),
      
      status: DESTRUCTION_STATUS.MENUNGGU_VERIFIKASI,
      
      createdByUserId: currentUser.userId || currentUser.code || currentUser.id,
      createdByName: currentUser.name || 'Mantri Bibitan',
      createdByRole: currentUser.role || 'MANTRI_TANAMAN',
      createdAt: new Date().toISOString()
    },
    AUDIT_EVENT_TYPES.CREATE,
    currentUser,
    `Pengajuan pemusnahan ${val.quantity.toLocaleString('id-ID')} Pkk batch ${batchCode} (Alasan: ${val.reason})`
  );

  allRecords.push(newRecord);
  storage.set(DESTRUCTION_STORAGE_KEY, allRecords);
  return newRecord;
}

/**
 * Approve Pemusnahan Bibit oleh Asisten Bibitan
 */
export function approveDestructionRecord(recordIdOrDocNo, notes = '', currentUser, autoMutateStock = false) {
  if (!currentUser) throw new Error('Pengguna aktif tidak valid.');
  const role = normalizeRole(currentUser.role || currentUser.rawRole);
  if (role !== ROLES.ASISTEN_BIBITAN) {
    throw new Error('Hanya Asisten Bibitan yang berhak menyetujui pengajuan pemusnahan bibit.');
  }

  const allRecords = storage.get(DESTRUCTION_STORAGE_KEY, []);
  const idx = allRecords.findIndex(r => r.id === recordIdOrDocNo || r.destructionId === recordIdOrDocNo || r.docNo === recordIdOrDocNo || r.destructionNo === recordIdOrDocNo);
  if (idx === -1) {
    throw new Error(`Dokumen pemusnahan dengan identitas ${recordIdOrDocNo} tidak ditemukan.`);
  }

  const target = allRecords[idx];
  if (!canPerformAsistenDestructionAction(target, currentUser)) {
    throw new Error('Anda tidak memiliki otorisasi untuk menyetujui dokumen pemusnahan ini.');
  }

  const updatedRecord = applyTransactionActor(
    {
      ...target,
      status: DESTRUCTION_STATUS.DISETUJUI,
      approvalNotes: notes || 'Disetujui oleh Asisten Bibitan',
      catatanPersetujuan: notes || 'Disetujui oleh Asisten Bibitan',
      approvedByUserId: currentUser.userId || currentUser.code || currentUser.id,
      approvedByName: currentUser.name || 'Asisten Bibitan',
      approvedByRole: ROLES.ASISTEN_BIBITAN,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    AUDIT_EVENT_TYPES.APPROVE,
    currentUser,
    `Persetujuan pemusnahan ${target.quantity || target.destructionQty} Pkk bibit batch ${target.batchCode}`
  );

  allRecords[idx] = updatedRecord;
  storage.set(DESTRUCTION_STORAGE_KEY, allRecords);

  if (autoMutateStock) {
    const mutationResult = mutateStockFromDestruction(updatedRecord.id, currentUser);
    return mutationResult.destruction;
  }

  return updatedRecord;
}

/**
 * MUTASI STOK PEMUSNAHAN BIBIT (TASK ASB-14)
 * Mengurangi availableQty & currentQty pada nursery_batches berdasarkan destructionQty yang DISETUJUI.
 */
export function mutateStockFromDestruction(recordIdOrDocNo, currentUser) {
  if (!currentUser) {
    throw new Error('Otorisasi gagal: Pengguna aktif tidak ditemukan.');
  }

  const allRecords = storage.get(DESTRUCTION_STORAGE_KEY, []);
  const idx = allRecords.findIndex(r => r.id === recordIdOrDocNo || r.destructionId === recordIdOrDocNo || r.docNo === recordIdOrDocNo || r.destructionNo === recordIdOrDocNo);
  if (idx === -1) {
    throw new Error(`Dokumen pemusnahan dengan identitas ${recordIdOrDocNo} tidak ditemukan.`);
  }

  const target = allRecords[idx];

  // 1. Validasi Status Pemusnahan: Hanya DISETUJUI yang boleh memutasi stok
  const statusUpper = (target.status || '').toUpperCase();
  if (statusUpper !== DESTRUCTION_STATUS.DISETUJUI) {
    throw new Error(`Hanya pengajuan pemusnahan dengan status DISETUJUI yang dapat melakukan mutasi stok (status saat ini: ${target.status}).`);
  }

  // 2. Scope Validation
  if (currentUser.estateId && target.estateId && currentUser.estateId !== target.estateId) {
    throw new Error(`Akses ditolak: Dokumen berada di luar lingkup estate user (${target.estateId} vs ${currentUser.estateId}).`);
  }
  if (currentUser.divisionId && target.divisionId && currentUser.divisionId !== target.divisionId) {
    throw new Error(`Akses ditolak: Dokumen berada di luar lingkup divisi user (${target.divisionId} vs ${currentUser.divisionId}).`);
  }

  // 3. Idempotency Check: Jika sudah dimutasi, jangan deduct lagi
  if (target.stockMutationStatus === STOCK_MUTATION_STATUS.APPLIED) {
    return {
      status: STOCK_MUTATION_STATUS.ALREADY_APPLIED,
      success: true,
      message: 'Mutasi stok pemusnahan sudah pernah diterapkan sebelumnya.',
      destruction: target,
      batch: null
    };
  }

  // 4. Formula Quantity: stockMutationQty = destructionQty (wajib > 0)
  const mutationQty = parseInt(target.destructionQty !== undefined ? target.destructionQty : (target.quantity || 0), 10);
  if (isNaN(mutationQty) || mutationQty <= 0) {
    const failedRecord = {
      ...target,
      stockMutationStatus: STOCK_MUTATION_STATUS.FAILED,
      stockMutationError: `Jumlah pemusnahan tidak valid (${mutationQty}).`,
      updatedAt: new Date().toISOString()
    };
    allRecords[idx] = failedRecord;
    storage.set(DESTRUCTION_STORAGE_KEY, allRecords);
    throw new Error(`Jumlah pemusnahan tidak valid (${mutationQty}).`);
  }

  // 5. Muat nursery_batches & Validasi Batch
  const allBatches = storage.get('nursery_batches', []);
  const bIdx = allBatches.findIndex(b => b.id === target.batchId || b.batchCode === target.batchCode || b.batchNo === target.batchCode);
  
  if (bIdx === -1) {
    const failedRecord = {
      ...target,
      stockMutationStatus: STOCK_MUTATION_STATUS.FAILED,
      stockMutationError: `Batch ${target.batchCode || target.batchId} tidak ditemukan di nursery_batches.`,
      updatedAt: new Date().toISOString()
    };
    allRecords[idx] = failedRecord;
    storage.set(DESTRUCTION_STORAGE_KEY, allRecords);
    throw new Error(`Batch ${target.batchCode || target.batchId} tidak ditemukan di nursery_batches.`);
  }

  const batchObj = allBatches[bIdx];
  const batchCtx = getBatchContext(batchObj.id || batchObj.batchId || target.batchId || target.batchCode) || batchObj;

  // 6. Validasi Program / Estate / Division Alignment via Context Relation Layer
  if (target.estateId && batchCtx.estateId && target.estateId.toUpperCase() !== batchCtx.estateId.toUpperCase()) {
    const failedRecord = {
      ...target,
      stockMutationStatus: STOCK_MUTATION_STATUS.FAILED,
      stockMutationError: `Inkonsistensi estate: Pemusnahan (${target.estateId}) vs Batch (${batchCtx.estateId})`,
      updatedAt: new Date().toISOString()
    };
    allRecords[idx] = failedRecord;
    storage.set(DESTRUCTION_STORAGE_KEY, allRecords);
    throw new Error(`Inkonsistensi estate: Pemusnahan (${target.estateId}) vs Batch (${batchCtx.estateId}).`);
  }

  if (target.divisionId && batchCtx.divisionId && target.divisionId.toUpperCase() !== batchCtx.divisionId.toUpperCase()) {
    const failedRecord = {
      ...target,
      stockMutationStatus: STOCK_MUTATION_STATUS.FAILED,
      stockMutationError: `Inkonsistensi divisi: Pemusnahan (${target.divisionId}) vs Batch (${batchCtx.divisionId})`,
      updatedAt: new Date().toISOString()
    };
    allRecords[idx] = failedRecord;
    storage.set(DESTRUCTION_STORAGE_KEY, allRecords);
    throw new Error(`Inkonsistensi divisi: Pemusnahan (${target.divisionId}) vs Batch (${batchCtx.divisionId}).`);
  }

  // 7. Validasi Kecukupan Stok via Inventory Service
  const currentAvailable = getInventoryAvailableQty(batchObj.id || batchObj.batchCode || batchObj.batchNo);
  if (currentAvailable < mutationQty) {
    const failedRecord = {
      ...target,
      stockMutationStatus: STOCK_MUTATION_STATUS.FAILED,
      stockMutationError: `Stok batch tidak mencukupi: Tersedia ${currentAvailable}, Pemusnahan ${mutationQty}`,
      updatedAt: new Date().toISOString()
    };
    allRecords[idx] = failedRecord;
    storage.set(DESTRUCTION_STORAGE_KEY, allRecords);
    throw new Error(`Stok batch ${batchObj.batchCode || batchObj.batchNo} tidak mencukupi (Tersedia: ${currentAvailable} < Pemusnahan: ${mutationQty}).`);
  }

  // 8. Atomic Stock Mutation Commit via Inventory Service
  const updatedInvState = deductInventoryStock(
    batchObj.id || batchObj.batchCode || batchObj.batchNo,
    mutationQty,
    INVENTORY_TX_TYPE.DESTRUCTION,
    target.docNo || target.id,
    currentUser,
    `Pengurangan stok pemusnahan ${target.docNo || target.id}`
  );

  const updatedBatch = {
    ...batchObj,
    availableQty: updatedInvState.availableQty,
    currentQty: updatedInvState.availableQty,
    status: updatedInvState.status,
    updatedAt: updatedInvState.updatedAt
  };

  // 9. Update Transaction Metadata
  const updatedDestruction = {
    ...target,
    stockMutationStatus: STOCK_MUTATION_STATUS.APPLIED,
    stockMutationQty: mutationQty,
    stockMutationAt: new Date().toISOString(),
    stockMutationByUserId: currentUser?.userId || currentUser?.id || 'SYSTEM',
    stockMutationByName: currentUser?.name || currentUser?.fullName || 'Asisten Bibitan',
    stockMutationByRole: currentUser?.role || ROLES.ASISTEN_BIBITAN,
    stockMutationError: null,
    updatedAt: new Date().toISOString()
  };

  allRecords[idx] = updatedDestruction;
  storage.set(DESTRUCTION_STORAGE_KEY, allRecords);

  return {
    status: STOCK_MUTATION_STATUS.APPLIED,
    success: true,
    batch: updatedBatch,
    destruction: updatedDestruction
  };
}

/**
 * Kembalikan (Return) Pemusnahan Bibit oleh Asisten Bibitan
 * CATATAN PENTING: ZERO STOCK MUTATION
 */
export function returnDestructionRecord(recordIdOrDocNo, reason, currentUser) {
  if (!currentUser) throw new Error('Pengguna aktif tidak valid.');
  const role = normalizeRole(currentUser.role || currentUser.rawRole);
  if (role !== ROLES.ASISTEN_BIBITAN) {
    throw new Error('Hanya Asisten Bibitan yang berhak mengembalikan pengajuan pemusnahan.');
  }

  if (!reason || !reason.trim()) {
    throw new Error('Alasan pengembalian pengajuan pemusnahan wajib diisi.');
  }

  const allRecords = storage.get(DESTRUCTION_STORAGE_KEY, []);
  const idx = allRecords.findIndex(r => r.id === recordIdOrDocNo || r.destructionId === recordIdOrDocNo || r.docNo === recordIdOrDocNo || r.destructionNo === recordIdOrDocNo);
  if (idx === -1) {
    throw new Error(`Dokumen pemusnahan dengan identitas ${recordIdOrDocNo} tidak ditemukan.`);
  }

  const target = allRecords[idx];
  if (!canPerformAsistenDestructionAction(target, currentUser)) {
    throw new Error('Anda tidak memiliki otorisasi untuk mengembalikan dokumen pemusnahan ini.');
  }

  const updatedRecord = applyTransactionActor(
    {
      ...target,
      status: DESTRUCTION_STATUS.DIKEMBALIKAN,
      returnReason: reason.trim(),
      alasanPengembalian: reason.trim(),
      returnedByUserId: currentUser.userId || currentUser.code || currentUser.id,
      returnedByName: currentUser.name || 'Asisten Bibitan',
      returnedByRole: ROLES.ASISTEN_BIBITAN,
      returnedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    AUDIT_EVENT_TYPES.REJECT,
    currentUser,
    `Pengembalian pengajuan pemusnahan batch ${target.batchCode}: ${reason.trim()}`
  );

  allRecords[idx] = updatedRecord;
  storage.set(DESTRUCTION_STORAGE_KEY, allRecords);

  return updatedRecord;
}
