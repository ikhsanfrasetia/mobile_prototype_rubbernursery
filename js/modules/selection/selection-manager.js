/**
 * js/modules/selection/selection-manager.js
 * Manager, Business Logic, & Resolver for Pemeriksaan Hasil Seleksi (TASK ASB-09)
 * 
 * Prinsip:
 * - Dikelola oleh Role ASISTEN_BIBITAN (Pemeriksaan, Setujui, Kembalikan)
 * - Diinput/diajukan oleh MANTRI_TANAMAN
 * - PENTING: ZERO STOCK MUTATION (Mutasi stok ditunda ke ASB-13)
 * - Single Source of Truth: storage key 'selection_transactions'
 * - Traceability: Selection -> Batch -> Bedengan -> Program -> Estate -> Divisi
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

export const SELECTION_STATUS = Object.freeze({
  MENUNGGU_VERIFIKASI: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
  DIAJUKAN: 'DIAJUKAN_PEMERIKSAAN',
  DISETUJUI: 'DISETUJUI',
  DIKEMBALIKAN: 'DIKEMBALIKAN'
});

export const STOCK_MUTATION_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPLIED: 'APPLIED',
  NOT_REQUIRED: 'NOT_REQUIRED',
  FAILED: 'FAILED',
  ALREADY_APPLIED: 'ALREADY_APPLIED'
});

export const SELECTION_STORAGE_KEY = 'selection_transactions';

/**
 * Validasi otorisasi Asisten Bibitan untuk memeriksa seleksi
 */
export function canPerformAsistenSelectionAction(item, currentUser) {
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
    s === SELECTION_STATUS.MENUNGGU_VERIFIKASI ||
    s === SELECTION_STATUS.DIAJUKAN ||
    s === 'PENDING_DECLARATION'
  );
}

/**
 * Filter daftar hasil seleksi sesuai scope pengguna
 */
export function filterSelectionByScope(records, currentUser) {
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
 * Hitung jumlah transaksi seleksi yang memerlukan tindakan Asisten Bibitan
 */
export function getActionableSelectionCount(records = null, currentUser) {
  if (!currentUser) return 0;
  const list = records !== null ? records : storage.get(SELECTION_STORAGE_KEY, []);
  if (!Array.isArray(list)) return 0;

  return list.filter(item => canPerformAsistenSelectionAction(item, currentUser)).length;
}

/**
 * Validasi form pengajuan / input hasil seleksi
 */
export function validateSelectionData(payload) {
  const errors = [];
  if (!payload) {
    return { isValid: false, errors: ['Data seleksi tidak boleh kosong.'] };
  }

  const checked = parseInt(payload.jumlahDiperiksa || payload.totalChecked || 0, 10);
  const pass = parseInt(payload.jumlahLayak || payload.layakQty || 0, 10);
  const cull = parseInt(payload.jumlahAfkir || payload.afkirQty || 0, 10);

  if (isNaN(checked) || checked <= 0) {
    errors.push('Jumlah bibit yang diperiksa harus lebih besar dari 0.');
  }
  if (isNaN(pass) || pass < 0) {
    errors.push('Jumlah bibit layak tidak boleh negatif.');
  }
  if (isNaN(cull) || cull < 0) {
    errors.push('Jumlah bibit afkir tidak boleh negatif.');
  }
  if (pass + cull !== checked) {
    errors.push(`Kombinasi Layak (${pass.toLocaleString('id-ID')}) + Afkir (${cull.toLocaleString('id-ID')}) harus sama dengan Total Diperiksa (${checked.toLocaleString('id-ID')}).`);
  }

  if (!payload.batchId && !payload.batchCode && !payload.batchNo) {
    errors.push('Batch sumber bibit wajib dipilih.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    checked,
    pass,
    cull
  };
}

/**
 * Membuat transaksi hasil seleksi baru (oleh Mantri Bibitan)
 */
export function createSelectionRecord(payload, currentUser) {
  const val = validateSelectionData(payload);
  if (!val.isValid) {
    throw new Error(val.errors.join(' '));
  }

  const allRecords = storage.get(SELECTION_STORAGE_KEY, []);
  const docNo = payload.docNo || payload.selectionNo || formatStandardDocNo(2026, 'CULL', allRecords.length + 1);

  // Resolve batch metadata
  const bObj = payload.batchId ? getBatchById(payload.batchId) : getBatchByCode(payload.batchCode || payload.batchNo);
  const batchId = bObj ? bObj.id : (payload.batchId || `BATCH-${Date.now()}`);
  const batchCode = bObj ? (bObj.batchCode || bObj.batchNo) : (payload.batchCode || payload.batchNo || 'B-001');

  // Resolve bedengan
  const bedenganIds = payload.bedenganIds || (payload.bedenganId ? [payload.bedenganId] : (bObj?.bedenganIds || []));

  const newRecord = applyTransactionActor(
    {
      id: `SEL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      selectionId: `SEL-${Date.now()}`,
      docNo: docNo,
      selectionNo: docNo,
      transactionType: 'PEMERIKSAAN_HASIL_SELEKSI',
      
      batchId: batchId,
      batchCode: batchCode,
      
      estateId: payload.estateId || bObj?.estateId || currentUser.estateId,
      estateName: payload.estateName || bObj?.estateName || currentUser.estateName || '-',
      divisionId: payload.divisionId || bObj?.divisionId || currentUser.divisionId,
      divisionName: payload.divisionName || bObj?.divisionName || currentUser.divisionName || '-',
      
      programId: payload.programId || bObj?.programId || 'PRG-2026-001',
      programName: payload.programName || bObj?.programName || '-',
      
      clone: payload.clone || payload.klon || bObj?.clone || 'IRCA 19',
      klon: payload.clone || payload.klon || bObj?.clone || 'IRCA 19',
      growthStage: payload.growthStage || payload.stage || bObj?.growthStage || 'Rubber Advance Planting Material',
      category: payload.category || bObj?.category || 'Polibag Besar',
      
      bedenganIds: bedenganIds,
      bedenganId: bedenganIds.length > 0 ? bedenganIds[0] : (payload.bedenganId || null),
      bedengan: payload.bedengan || (bedenganIds.length > 0 ? bedenganIds.join(', ') : '-'),
      
      jumlahDiperiksa: val.checked,
      jumlahLayak: val.pass,
      jumlahAfkir: val.cull,
      
      tanggalSeleksi: payload.tanggalSeleksi || payload.selectionDate || formatDate(new Date().toISOString()),
      catatan: payload.catatan || payload.remarks || payload.alasan || '-',
      
      status: SELECTION_STATUS.MENUNGGU_VERIFIKASI,
      
      createdByUserId: currentUser.userId || currentUser.code || currentUser.id,
      createdByName: currentUser.name || 'Mantri Bibitan',
      createdByRole: currentUser.role || 'MANTRI_TANAMAN',
      createdAt: new Date().toISOString()
    },
    AUDIT_EVENT_TYPES.CREATE,
    currentUser,
    `Pengajuan hasil seleksi batch ${batchCode} (Diperiksa: ${val.checked}, Layak: ${val.pass}, Afkir: ${val.cull})`
  );

  allRecords.push(newRecord);
  storage.set(SELECTION_STORAGE_KEY, allRecords);
  return newRecord;
}

/**
 * Approve Pemeriksaan Hasil Seleksi oleh Asisten Bibitan
 */
export function approveSelectionRecord(recordIdOrDocNo, notes = '', currentUser, autoMutateStock = false) {
  if (!currentUser) throw new Error('Pengguna aktif tidak valid.');
  const role = normalizeRole(currentUser.role || currentUser.rawRole);
  if (role !== ROLES.ASISTEN_BIBITAN) {
    throw new Error('Hanya Asisten Bibitan yang berhak menyetujui hasil seleksi.');
  }

  const allRecords = storage.get(SELECTION_STORAGE_KEY, []);
  const idx = allRecords.findIndex(r => r.id === recordIdOrDocNo || r.selectionId === recordIdOrDocNo || r.docNo === recordIdOrDocNo);
  if (idx === -1) {
    throw new Error(`Data seleksi dengan identitas ${recordIdOrDocNo} tidak ditemukan.`);
  }

  const target = allRecords[idx];
  if (!canPerformAsistenSelectionAction(target, currentUser)) {
    throw new Error('Anda tidak memiliki otorisasi untuk menyetujui dokumen ini.');
  }

  const updatedRecord = applyTransactionActor(
    {
      ...target,
      status: SELECTION_STATUS.DISETUJUI,
      approvalNotes: notes || 'Disetujui oleh Asisten Bibitan',
      verifiedByUserId: currentUser.userId || currentUser.code || currentUser.id,
      verifiedByName: currentUser.name || 'Asisten Bibitan',
      verifiedByRole: ROLES.ASISTEN_BIBITAN,
      verifiedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    AUDIT_EVENT_TYPES.APPROVE,
    currentUser,
    `Persetujuan hasil seleksi untuk batch ${target.batchCode} (${target.jumlahLayak} Layak, ${target.jumlahAfkir} Afkir)`
  );

  allRecords[idx] = updatedRecord;
  storage.set(SELECTION_STORAGE_KEY, allRecords);

  if (autoMutateStock) {
    const mutationResult = mutateStockFromSelection(updatedRecord.id, currentUser);
    return mutationResult.selection;
  }

  return updatedRecord;
}

/**
 * MUTASI STOK HASIL SELEKSI (TASK ASB-13)
 * Mengurangi availableQty & currentQty pada nursery_batches berdasarkan jumlahAfkir hasil seleksi yang DISETUJUI.
 */
export function mutateStockFromSelection(recordIdOrDocNo, currentUser) {
  const allRecords = storage.get(SELECTION_STORAGE_KEY, []);
  const idx = allRecords.findIndex(r => r.id === recordIdOrDocNo || r.selectionId === recordIdOrDocNo || r.docNo === recordIdOrDocNo);
  if (idx === -1) {
    throw new Error(`Data seleksi dengan identitas ${recordIdOrDocNo} tidak ditemukan.`);
  }

  const target = allRecords[idx];

  // 1. Validasi Status Seleksi: Hanya DISETUJUI yang boleh memutasi stok
  const statusUpper = (target.status || '').toUpperCase();
  if (statusUpper !== SELECTION_STATUS.DISETUJUI) {
    throw new Error(`Hanya hasil seleksi dengan status DISETUJUI yang dapat melakukan mutasi stok (status saat ini: ${target.status}).`);
  }

  // 2. IDEMPOTENCY CHECK: Jika sudah dimutasi, jangan mutasi lagi
  if (target.stockMutationStatus === STOCK_MUTATION_STATUS.APPLIED) {
    return {
      status: STOCK_MUTATION_STATUS.ALREADY_APPLIED,
      success: true,
      message: 'Mutasi stok sudah pernah diterapkan sebelumnya.',
      selection: target,
      batch: null
    };
  }

  // 3. Formula: stockMutationQty = jumlahAfkir
  const mutationQty = parseInt(target.jumlahAfkir || 0, 10);

  // 4. Zero-Afkir Handling: Jika afkir = 0, stok tidak berubah
  if (mutationQty === 0) {
    const updatedRecord = {
      ...target,
      stockMutationStatus: STOCK_MUTATION_STATUS.NOT_REQUIRED,
      stockMutationAt: new Date().toISOString(),
      stockMutationBy: currentUser?.userId || currentUser?.id || 'SYSTEM',
      stockMutationQty: 0,
      stockMutationError: null,
      updatedAt: new Date().toISOString()
    };
    allRecords[idx] = updatedRecord;
    storage.set(SELECTION_STORAGE_KEY, allRecords);

    return {
      status: STOCK_MUTATION_STATUS.NOT_REQUIRED,
      success: true,
      message: 'Jumlah afkir 0, mutasi stok tidak diperlukan.',
      selection: updatedRecord,
      batch: null
    };
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
    storage.set(SELECTION_STORAGE_KEY, allRecords);
    throw new Error(`Batch ${target.batchCode || target.batchId} tidak ditemukan di nursery_batches.`);
  }

  const batchObj = allBatches[bIdx];
  const batchCtx = getBatchContext(batchObj.id || batchObj.batchId || target.batchId || target.batchCode) || batchObj;

  // 6. Validasi Program / Estate / Division Alignment via Context Relation Layer
  if (target.estateId && batchCtx.estateId && target.estateId.toUpperCase() !== batchCtx.estateId.toUpperCase()) {
    const failedRecord = {
      ...target,
      stockMutationStatus: STOCK_MUTATION_STATUS.FAILED,
      stockMutationError: `Inkonsistensi estate: Selection (${target.estateId}) vs Batch (${batchCtx.estateId})`,
      updatedAt: new Date().toISOString()
    };
    allRecords[idx] = failedRecord;
    storage.set(SELECTION_STORAGE_KEY, allRecords);
    throw new Error(`Inkonsistensi estate: Selection (${target.estateId}) vs Batch (${batchCtx.estateId}).`);
  }

  if (target.divisionId && batchCtx.divisionId && target.divisionId.toUpperCase() !== batchCtx.divisionId.toUpperCase()) {
    const failedRecord = {
      ...target,
      stockMutationStatus: STOCK_MUTATION_STATUS.FAILED,
      stockMutationError: `Inkonsistensi divisi: Selection (${target.divisionId}) vs Batch (${batchCtx.divisionId})`,
      updatedAt: new Date().toISOString()
    };
    allRecords[idx] = failedRecord;
    storage.set(SELECTION_STORAGE_KEY, allRecords);
    throw new Error(`Inkonsistensi divisi: Selection (${target.divisionId}) vs Batch (${batchCtx.divisionId}).`);
  }

  // 7. Validasi Kecukupan Stok via Inventory Service
  const currentAvailable = getInventoryAvailableQty(batchObj.id || batchObj.batchCode || batchObj.batchNo);
  if (currentAvailable < mutationQty) {
    const failedRecord = {
      ...target,
      stockMutationStatus: STOCK_MUTATION_STATUS.FAILED,
      stockMutationError: `Stok tidak mencukupi: Tersedia ${currentAvailable}, Afkir ${mutationQty}`,
      updatedAt: new Date().toISOString()
    };
    allRecords[idx] = failedRecord;
    storage.set(SELECTION_STORAGE_KEY, allRecords);
    throw new Error(`Stok batch ${batchObj.batchCode || batchObj.batchNo} tidak mencukupi (Tersedia: ${currentAvailable} < Afkir: ${mutationQty}).`);
  }

  // 8. Atomic Stock Mutation Commit via Inventory Service
  const updatedInvState = deductInventoryStock(
    batchObj.id || batchObj.batchCode || batchObj.batchNo,
    mutationQty,
    INVENTORY_TX_TYPE.SELECTION,
    target.docNo || target.id,
    currentUser,
    `Pengurangan stok seleksi afkir ${target.docNo || target.id}`
  );

  const updatedBatch = {
    ...batchObj,
    availableQty: updatedInvState.availableQty,
    currentQty: updatedInvState.availableQty,
    status: updatedInvState.status,
    updatedAt: updatedInvState.updatedAt
  };

  // 9. Update Transaction Metadata
  const updatedSelection = {
    ...target,
    stockMutationStatus: STOCK_MUTATION_STATUS.APPLIED,
    stockMutationAt: new Date().toISOString(),
    stockMutationBy: currentUser?.userId || currentUser?.id || 'SYSTEM',
    stockMutationQty: mutationQty,
    stockMutationError: null,
    updatedAt: new Date().toISOString()
  };

  allRecords[idx] = updatedSelection;
  storage.set(SELECTION_STORAGE_KEY, allRecords);

  return {
    status: STOCK_MUTATION_STATUS.APPLIED,
    success: true,
    batch: updatedBatch,
    selection: updatedSelection
  };
}

/**
 * Kembalikan (Return) Pemeriksaan Hasil Seleksi oleh Asisten Bibitan
 * CATATAN PENTING: TIDAK BOLEH MEMUTASI STOCK BATCH
 */
export function returnSelectionRecord(recordIdOrDocNo, reason, currentUser) {
  if (!currentUser) throw new Error('Pengguna aktif tidak valid.');
  const role = normalizeRole(currentUser.role || currentUser.rawRole);
  if (role !== ROLES.ASISTEN_BIBITAN) {
    throw new Error('Hanya Asisten Bibitan yang berhak mengembalikan hasil seleksi.');
  }

  if (!reason || !reason.trim()) {
    throw new Error('Alasan pengembalian wajib diisi.');
  }

  const allRecords = storage.get(SELECTION_STORAGE_KEY, []);
  const idx = allRecords.findIndex(r => r.id === recordIdOrDocNo || r.selectionId === recordIdOrDocNo || r.docNo === recordIdOrDocNo);
  if (idx === -1) {
    throw new Error(`Data seleksi dengan identitas ${recordIdOrDocNo} tidak ditemukan.`);
  }

  const target = allRecords[idx];
  if (!canPerformAsistenSelectionAction(target, currentUser)) {
    throw new Error('Anda tidak memiliki otorisasi untuk mengembalikan dokumen ini.');
  }

  const updatedRecord = applyTransactionActor(
    {
      ...target,
      status: SELECTION_STATUS.DIKEMBALIKAN,
      returnReason: reason.trim(),
      returnedByUserId: currentUser.userId || currentUser.code || currentUser.id,
      returnedByName: currentUser.name || 'Asisten Bibitan',
      returnedByRole: ROLES.ASISTEN_BIBITAN,
      returnedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    AUDIT_EVENT_TYPES.REJECT,
    currentUser,
    `Pengembalian hasil seleksi untuk batch ${target.batchCode}: ${reason.trim()}`
  );

  allRecords[idx] = updatedRecord;
  storage.set(SELECTION_STORAGE_KEY, allRecords);

  return updatedRecord;
}
