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
 * Format label sumber transaksi asal seleksi
 */
export function getSelectionSourceLabel(item) {
  if (!item) return 'Transaksi Seleksi';
  if (item.sourceModule === 'PENYEMAIAN' || item.originType === 'REJECT_PENYEMAIAN') {
    return 'Transaksi Penyemaian';
  }
  if (item.originType === 'REJECT_OKULASI') {
    return 'Okulasi (Grafting)';
  }
  if (item.originType === 'REJECT_REGRAFTING') {
    return 'Okulasi Janda (Regrafting)';
  }
  if (item.originType === 'REJECT_PEMERIKSAAN' || item.inspectionDocNo) {
    return 'Pemeriksaan Okulasi';
  }
  if (item.originType === 'REJECT_PENERIMAAN') {
    return 'Penerimaan Bibit';
  }
  return item.sourceModule || item.sumberAsal || 'Transaksi Seleksi';
}

/**
 * Format label kategori penyeleksian (Rusak / Mati / Lainnya)
 */
export function getSelectionCategoryLabel(item) {
  if (!item) return 'Afkir';
  const cat = String(item.category || item.alasanDitolakCategory || '').trim().toUpperCase();
  if (cat === 'RUSAK') return 'Rusak';
  if (cat === 'MATI') return 'Mati';
  if (cat === 'LAINNYA') return 'Lainnya';
  if (item.alasan && item.alasan !== '-' && !item.alasan.startsWith('Bibit ')) {
    return item.alasan;
  }
  return 'Afkir';
}

function formatSingleBedenganCode(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (/^BED-\d+/i.test(s)) return s.toUpperCase();
  const match = s.match(/Bedengan[- ]*(\d+)/i);
  if (match) {
    return `BED-${String(match[1]).padStart(3, '0')}`;
  }
  const digits = s.match(/^(\d+)$/);
  if (digits) {
    return `BED-${String(digits[1]).padStart(3, '0')}`;
  }
  return s;
}

/**
 * Format Bedengan agar hanya menampilkan Kode Bisnis Bedengan saja (BED-001, BED-002)
 */
export function formatBedenganDisplayCode(item) {
  if (!item) return '-';
  
  if (typeof item === 'string') {
    const parts = item.split(',').map(p => formatSingleBedenganCode(p.trim())).filter(Boolean);
    return parts.length > 0 ? Array.from(new Set(parts)).join(', ') : '-';
  }

  // If bedenganCode exists
  if (item.bedenganCode && typeof item.bedenganCode === 'string') {
    const parts = item.bedenganCode.split(',').map(s => formatSingleBedenganCode(s.trim())).filter(Boolean);
    if (parts.length > 0) return Array.from(new Set(parts)).join(', ');
  }

  // If bedenganIds exists (array of IDs or codes)
  if (Array.isArray(item.bedenganIds) && item.bedenganIds.length > 0) {
    const resolved = item.bedenganIds.map(idOrCode => {
      const bObj = getBedenganById(idOrCode);
      if (bObj && bObj.bedenganCode) return formatSingleBedenganCode(bObj.bedenganCode);
      return formatSingleBedenganCode(idOrCode);
    }).filter(Boolean);
    if (resolved.length > 0) return Array.from(new Set(resolved)).join(', ');
  }

  if (item.bedenganId) {
    const bObj = getBedenganById(item.bedenganId);
    if (bObj && bObj.bedenganCode) return formatSingleBedenganCode(bObj.bedenganCode);
  }

  if (item.bedengan) {
    const str = String(item.bedengan).trim();
    if (str === '-' || !str) return '-';
    const parts = str.split(',').map(p => formatSingleBedenganCode(p.trim())).filter(Boolean);
    if (parts.length > 0) return Array.from(new Set(parts)).join(', ');
  }

  return '-';
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
 * Cari existing selection transaction berdasarkan identitas source selection
 */
export function findExistingSelectionTransaction(item) {
  if (!item) return null;
  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  
  const normCat = (c) => String(c || '').trim().toUpperCase();
  const itemCat = normCat(item.category || item.alasanDitolakCategory || 'AFKIR');
  const itemSourceDoc = String(item.sourceDocNo || item.seedingDocNo || item.buddingDocNo || item.inspectionDocNo || '').trim();
  const itemSourceTxId = String(item.sourceTransactionId || itemSourceDoc || item.id || '').trim();
  const itemDocNo = String(item.docNo || item.selectionNo || '').trim();

  return allTxs.find(tx => {
    // 1. Direct match by transaction ID or Selection ID
    if (item.selectionTransactionId && (tx.id === item.selectionTransactionId || tx.selectionId === item.selectionTransactionId)) {
      return true;
    }
    if (item.id && (tx.id === item.id || tx.selectionId === item.id)) {
      return true;
    }

    // 2. Direct match by selectionPoolDocNo or docNo
    if (itemDocNo && (tx.selectionPoolDocNo === itemDocNo || tx.docNo === itemDocNo)) {
      if (itemCat && normCat(tx.category) !== itemCat) return false;
      return true;
    }

    // 3. Match by source selection identity (sourceDocNo / sourceTransactionId + category + module)
    const txSourceDoc = String(tx.sourceDocNo || '').trim();
    const txSourceTxId = String(tx.sourceTransactionId || '').trim();
    const txCat = normCat(tx.category || tx.alasanDitolakCategory || 'AFKIR');

    const sourceMatches = (
      (itemSourceDoc && txSourceDoc && itemSourceDoc === txSourceDoc) ||
      (itemSourceTxId && txSourceTxId && itemSourceTxId === txSourceTxId) ||
      (itemSourceDoc && txSourceTxId && itemSourceDoc === txSourceTxId) ||
      (itemSourceTxId && txSourceDoc && itemSourceTxId === txSourceDoc)
    );

    if (sourceMatches && itemCat === txCat) {
      return true;
    }

    return false;
  }) || null;
}

/**
 * Membuat transaksi hasil seleksi baru (oleh Mantri Bibitan)
 */
export function createSelectionRecord(payload, currentUser) {
  const val = validateSelectionData(payload);
  if (!val.isValid) {
    throw new Error(val.errors.join(' '));
  }

  // Idempotency: Cari transaksi yang sudah ada untuk source yang sama
  const existingRecord = findExistingSelectionTransaction(payload);
  if (existingRecord) {
    return existingRecord;
  }

  const allRecords = storage.get(SELECTION_STORAGE_KEY, []);
  
  let docNo = payload.docNo || payload.selectionNo;
  if (!docNo) {
    let maxSeq = 0;
    allRecords.forEach(r => {
      const d = String(r.docNo || r.selectionNo || '');
      const match = d.match(/CULL\/(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    });
    docNo = formatStandardDocNo(2026, 'CULL', maxSeq + 1);
  }

  // Resolve batch metadata
  const bObj = payload.batchId ? getBatchById(payload.batchId) : getBatchByCode(payload.batchCode || payload.batchNo);
  const batchId = bObj ? bObj.id : (payload.batchId || `BATCH-${Date.now()}`);
  const batchCode = bObj ? (bObj.batchCode || bObj.batchNo) : (payload.batchCode || payload.batchNo || 'B-001');

  // Resolve bedengan
  const bedenganIds = payload.bedenganIds || (payload.bedenganId ? [payload.bedenganId] : (bObj?.bedenganIds || []));

  const newRecord = applyTransactionActor(
    {
      id: payload.id || `SEL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      selectionId: payload.selectionId || `SEL-${Date.now()}`,
      docNo: docNo,
      selectionNo: docNo,
      selectionPoolDocNo: payload.selectionPoolDocNo || docNo,
      sourceModule: payload.sourceModule || 'PENYEMAIAN',
      sourceTransactionType: payload.sourceTransactionType || 'SEEDING',
      sourceTransactionId: payload.sourceTransactionId || payload.sourceDocNo || docNo,
      sourceDocNo: payload.sourceDocNo || '-',
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
      stockMutationStatus: STOCK_MUTATION_STATUS.PENDING,
      
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

/**
 * Integrasi Hasil Seleksi (Rusak, Mati, Lainnya) dari Transaksi Penyemaian ke Selection Pool
 * 
 * Aturan Bisnis:
 * 1. Hanya hasil Rusak, Mati, dan Lainnya dari Transaksi Penyemaian yang masuk ke Seleksi.
 * 2. Hasil Bibit Disemai TIDAK masuk ke Seleksi.
 * 3. Kategori dibedakan: RUSAK, MATI, LAINNYA.
 * 4. Sumber integrasi ditandai: sourceModule: 'PENYEMAIAN', sourceTransactionType: 'SEEDING'.
 * 5. Membawa referensi transaksi asal, program, estate, division, batch, bedengan.
 * 6. Idempoten: mencegah duplikasi jika transaksi asal + kategori sudah ada di selection_pool.
 * 7. Tidak memutasi stok pada saat masuk pool (mutasi hanya saat ASB approve).
 * 8. Validasi: angka negatif/bukan angka melempar error; total 0 tidak membuat entry.
 */
export function integrateSeedingToSelectionPool(seedingTx, options = {}) {
  if (!seedingTx) {
    throw new Error('Data transaksi penyemaian tidak valid.');
  }

  const { isEditing = false } = options;
  const sourceDocNo = seedingTx.docNo || seedingTx.seedingDocNo || seedingTx.id;
  if (!sourceDocNo) {
    throw new Error('Nomor dokumen atau ID transaksi penyemaian wajib ada.');
  }

  // 1. Ekstraksi dan Validasi Kategori Rejection (Rusak, Mati, Lainnya)
  const categories = [];

  function parseAndValidateQty(rawVal, label) {
    if (rawVal === undefined || rawVal === null || rawVal === '') return 0;
    const n = Number(rawVal);
    if (isNaN(n) || !Number.isFinite(n)) {
      throw new Error(`Nilai jumlah ${label} tidak valid: "${rawVal}". Harus berupa bilangan bulat.`);
    }
    if (n < 0) {
      throw new Error(`Nilai jumlah ${label} tidak boleh negatif: ${n}.`);
    }
    return Math.floor(n);
  }

  // Check explicit category fields if present
  let rusakQty = parseAndValidateQty(seedingTx.rusakQty ?? seedingTx.rusak, 'Rusak');
  let matiQty = parseAndValidateQty(seedingTx.matiQty ?? seedingTx.mati, 'Mati');
  let lainnyaQty = parseAndValidateQty(seedingTx.lainnyaQty ?? seedingTx.lainnya, 'Lainnya');

  // If explicit categories are 0, check single 'ditolak' + 'alasanDitolak'
  const ditolakQty = parseAndValidateQty(seedingTx.ditolak ?? seedingTx.jumlahDitolak, 'Ditolak');
  if (ditolakQty > 0 && (rusakQty === 0 && matiQty === 0 && lainnyaQty === 0)) {
    const alasan = String(seedingTx.alasanDitolak || seedingTx.alasan || '').trim().toLowerCase();
    if (alasan.includes('rusak')) {
      rusakQty = ditolakQty;
    } else if (alasan.includes('mati')) {
      matiQty = ditolakQty;
    } else if (alasan !== 'tidak ada') {
      lainnyaQty = ditolakQty;
    }
  }

  if (rusakQty > 0) categories.push({ category: 'RUSAK', qty: rusakQty, label: 'Rusak' });
  if (matiQty > 0) categories.push({ category: 'MATI', qty: matiQty, label: 'Mati' });
  if (lainnyaQty > 0) categories.push({ category: 'LAINNYA', qty: lainnyaQty, label: 'Lainnya' });

  // If all categories are 0 (e.g. no rejected seeds), do not create any pool entries
  if (categories.length === 0) {
    return {
      success: true,
      createdCount: 0,
      entries: [],
      message: 'Tidak ada bibit ditolak (Rusak/Mati/Lainnya) pada transaksi penyemaian ini.'
    };
  }

  let selectionPool = storage.get('selection_pool', []);

  // If editing/re-syncing, purge existing entries for this seeding transaction to prevent duplicates
  if (isEditing) {
    selectionPool = selectionPool.filter(s => !(
      (s.sourceDocNo === sourceDocNo || s.seedingDocNo === sourceDocNo || s.sourceTransactionId === (seedingTx.id || sourceDocNo)) &&
      s.sourceModule === 'PENYEMAIAN'
    ));
  }

  const newEntries = [];

  categories.forEach(({ category, qty, label }) => {
    // Idempotency check: Jangan buat duplikasi jika sudah ada di pool
    const alreadyExists = selectionPool.some(s => 
      (s.sourceDocNo === sourceDocNo || s.seedingDocNo === sourceDocNo || s.sourceTransactionId === (seedingTx.id || sourceDocNo)) &&
      (s.category === category || s.alasanDitolakCategory === category) &&
      s.sourceModule === 'PENYEMAIAN'
    );

    if (!alreadyExists) {
      // Hitung max sequence dari selection_pool dan selection_transactions agar tidak terjadi duplikasi nomor
      const existingTxs = storage.get(SELECTION_STORAGE_KEY, []);
      let maxSeq = 0;
      [...selectionPool, ...existingTxs].forEach(item => {
        const d = String(item.docNo || item.selectionDocNo || item.selectionPoolDocNo || item.selectionNo || '');
        const match = d.match(/CULL\/(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) maxSeq = num;
        }
      });

      const poolSeq = maxSeq + 1;
      const poolDocNo = formatStandardDocNo(2026, 'CULL', poolSeq);
      
      const entry = {
        id: `SEL-POOL-SEED-${seedingTx.id || sourceDocNo}-${category}`,
        docNo: poolDocNo,
        originType: 'REJECT_PENYEMAIAN',
        sourceModule: 'PENYEMAIAN',
        sourceTransactionType: 'SEEDING',
        sourceTransactionId: seedingTx.id || sourceDocNo,
        sourceDocNo: sourceDocNo,
        seedingDocNo: sourceDocNo,
        sourceIndex: seedingTx.sourceIndex !== undefined ? seedingTx.sourceIndex : null,
        
        category: category, // 'RUSAK' | 'MATI' | 'LAINNYA'
        alasanDitolakCategory: category,
        jumlahAfkir: qty,
        quantity: qty,
        alasan: `Bibit ${label} saat Penyemaian (${sourceDocNo})`,
        
        // Scope & Master references
        estateId: seedingTx.estateId || null,
        divisionId: seedingTx.divisionId || null,
        programId: seedingTx.programId || null,
        programCode: seedingTx.programCode || seedingTx.program || null,
        program: seedingTx.program || seedingTx.programCode || null,
        programName: seedingTx.programName || null,
        batchId: seedingTx.batchId || null,
        batchCode: seedingTx.batchCode || seedingTx.batchNo || null,
        batchNo: seedingTx.batchNo || seedingTx.batchCode || null,
        bedenganId: seedingTx.bedenganId || null,
        bedenganCode: seedingTx.bedenganCode || null,
        bedenganIds: seedingTx.rows ? seedingTx.rows.map(r => r.bedenganId).filter(Boolean) : (seedingTx.bedenganId ? [seedingTx.bedenganId] : []),
        bedengan: seedingTx.bedengan || null,
        blockId: seedingTx.blockId || null,
        blockCode: seedingTx.blockCode || null,
        
        // Clones & stage snapshot
        klon: seedingTx.klonAwal || seedingTx.klon || 'GT 1',
        clone: seedingTx.klonAwal || seedingTx.klon || 'GT 1',
        tahapan: seedingTx.tahapan || 'Rubber Main Nursery',
        tanggal: seedingTx.date || formatDate(new Date().toISOString()),
        
        status: 'PENDING_DECLARATION',
        stockMutationStatus: 'PENDING',
        createdAt: new Date().toISOString()
      };

      selectionPool.push(entry);
      newEntries.push(entry);
    }
  });

  storage.set('selection_pool', selectionPool);

  return {
    success: true,
    createdCount: newEntries.length,
    entries: newEntries,
    message: `Berhasil mengintegrasikan ${newEntries.length} entri hasil penyemaian ke Selection Pool.`
  };
}

/**
 * Sinkronisasi seluruh transaksi penyemaian ke Selection Pool secara idempoten
 */
export function syncAllSeedingsToSelectionPool() {
  const seedingTxs = storage.get('seeding_transactions', []);
  let totalCreated = 0;
  seedingTxs.forEach(tx => {
    try {
      const res = integrateSeedingToSelectionPool(tx, { isEditing: false });
      totalCreated += res.createdCount;
    } catch (err) {
      console.warn(`[syncAllSeedingsToSelectionPool] Skip invalid tx ${tx.docNo}:`, err.message);
    }
  });
  return totalCreated;
}

export const SELECTION_PHOTO_STORAGE_KEY = 'selection_photos';

/**
 * Menyimpan data record foto dokumentasi seleksi bibit secara idempoten
 */
export function saveSelectionDocumentationPhoto(photoRecord) {
  if (!photoRecord || !photoRecord.photoData) {
    throw new Error('Data foto dokumentasi tidak valid');
  }
  const allPhotos = storage.get(SELECTION_PHOTO_STORAGE_KEY, []);
  
  // Mencegah duplikasi foto untuk transaksi / dokumen seleksi yang sama
  const existingIdx = allPhotos.findIndex(p => (
    (photoRecord.id && p.id === photoRecord.id) ||
    (photoRecord.selectionTransactionId && p.selectionTransactionId === photoRecord.selectionTransactionId) ||
    (photoRecord.selectionDocNo && p.selectionDocNo === photoRecord.selectionDocNo && p.category === photoRecord.category) ||
    (photoRecord.sourceDocNo && p.sourceDocNo === photoRecord.sourceDocNo && p.category === photoRecord.category && p.selectionDocNo === photoRecord.selectionDocNo)
  ));

  if (existingIdx !== -1) {
    allPhotos[existingIdx] = {
      ...allPhotos[existingIdx],
      ...photoRecord,
      id: allPhotos[existingIdx].id // Pertahankan ID asli
    };
  } else {
    allPhotos.push(photoRecord);
  }
  storage.set(SELECTION_PHOTO_STORAGE_KEY, allPhotos);
  return photoRecord;
}

/**
 * Mengambil daftar seluruh foto dokumentasi seleksi
 */
export function getSelectionPhotos() {
  return storage.get(SELECTION_PHOTO_STORAGE_KEY, []);
}

/**
 * Mengambil foto dokumentasi berdasarkan nomor dokumen seleksi
 */
export function getSelectionPhotosByDocNo(selectionDocNo) {
  if (!selectionDocNo) return [];
  const all = getSelectionPhotos();
  return all.filter(p => p.selectionDocNo === selectionDocNo || p.selectionPoolDocNo === selectionDocNo);
}

/**
 * Deklarasi hasil seleksi oleh Mantri Bibitan secara idempoten
 * Mencegah duplikasi transaksi dan duplikasi Dok. Seleksi
 */
export function declareSelectionItem(targetPoolItem, photoResult, user) {
  if (!targetPoolItem) {
    throw new Error('Data bibit afkir tidak valid.');
  }

  const today = formatDate(new Date().toISOString());

  // 1. Cari existing transaction berdasarkan identitas source selection
  const existingTx = findExistingSelectionTransaction(targetPoolItem);
  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);

  let finalTx = null;
  let isNewTx = false;

  // Pastikan Dok. Seleksi stabil
  let poolDocNo = targetPoolItem.docNo;
  if (!poolDocNo || !poolDocNo.startsWith('2026/CULL/')) {
    let maxSeq = 0;
    allTxs.forEach(tx => {
      const d = String(tx.docNo || tx.selectionNo || tx.selectionPoolDocNo || '');
      const match = d.match(/CULL\/(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
    });
    poolDocNo = formatStandardDocNo(2026, 'CULL', maxSeq + 1);
    targetPoolItem.docNo = poolDocNo;
  }

  if (existingTx) {
    finalTx = existingTx;
    // Update photo reference if photoResult provided
    if (photoResult && photoResult.dataUrl) {
      finalTx.photoData = photoResult.dataUrl;
      finalTx.photoCapturedAt = photoResult.capturedAt;
      finalTx.photoCapturedAtLabel = photoResult.capturedAtLabel;
      const txIdx = allTxs.findIndex(t => t.id === existingTx.id);
      if (txIdx !== -1) {
        allTxs[txIdx] = finalTx;
        storage.set(SELECTION_STORAGE_KEY, allTxs);
      }
    }
  } else {
    isNewTx = true;
    const newTxId = `SEL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const photoRecordId = `DOC-SEL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    finalTx = {
      id: newTxId,
      selectionId: newTxId,
      docNo: poolDocNo,
      selectionNo: poolDocNo,
      selectionPoolDocNo: poolDocNo,
      sourceModule: targetPoolItem.sourceModule || (targetPoolItem.originType === 'REJECT_PENYEMAIAN' ? 'PENYEMAIAN' : (targetPoolItem.originType === 'REJECT_OKULASI' ? 'BUDDING' : 'INSPECTION')),
      sourceTransactionType: targetPoolItem.sourceTransactionType || (targetPoolItem.originType === 'REJECT_PENYEMAIAN' ? 'SEEDING' : 'GRAFTING'),
      sourceTransactionId: targetPoolItem.sourceTransactionId || targetPoolItem.sourceDocNo || targetPoolItem.docNo,
      sourceDocNo: targetPoolItem.sourceDocNo || targetPoolItem.seedingDocNo || targetPoolItem.buddingDocNo || targetPoolItem.inspectionDocNo || '-',
      category: targetPoolItem.category || targetPoolItem.alasanDitolakCategory || 'AFKIR',
      originType: targetPoolItem.originType || 'REJECT_PENYEMAIAN',
      
      estateId: targetPoolItem.estateId || user.estateId || null,
      divisionId: targetPoolItem.divisionId || user.divisionId || null,
      programId: targetPoolItem.programId || null,
      programCode: targetPoolItem.programCode || targetPoolItem.program || null,
      program: targetPoolItem.program || targetPoolItem.programCode || null,
      programName: targetPoolItem.programName || null,
      
      batchId: targetPoolItem.batchId || null,
      batchCode: targetPoolItem.batchCode || targetPoolItem.batchNo || 'Batch-01',
      batchNo: targetPoolItem.batchNo || targetPoolItem.batchCode || 'Batch-01',
      bedenganId: targetPoolItem.bedenganId || null,
      bedenganCode: targetPoolItem.bedenganCode || null,
      bedenganIds: targetPoolItem.bedenganIds || (targetPoolItem.bedenganId ? [targetPoolItem.bedenganId] : []),
      bedengan: targetPoolItem.bedengan || '-',
      
      klon: targetPoolItem.klon || 'GT 1',
      clone: targetPoolItem.clone || targetPoolItem.klon || 'GT 1',
      tahapan: targetPoolItem.tahapan || 'Rubber Main Nursery',
      jumlahDiperiksa: targetPoolItem.jumlahDiperiksa || targetPoolItem.jumlahAfkir || targetPoolItem.quantity || 0,
      jumlahLayak: targetPoolItem.jumlahLayak || 0,
      jumlahAfkir: targetPoolItem.jumlahAfkir || targetPoolItem.quantity || 0,
      quantity: targetPoolItem.jumlahAfkir || targetPoolItem.quantity || 0,
      sumberAsal: getSelectionSourceLabel(targetPoolItem),
      alasan: targetPoolItem.alasan || '-',
      catatan: targetPoolItem.alasan || '-',
      tanggal: today,
      tanggalSeleksi: today,
      mantri: user.name,
      createdByName: user.name,
      createdByUserId: user.userId || user.code || user.id,
      status: SELECTION_STATUS.MENUNGGU_VERIFIKASI,
      stockMutationStatus: STOCK_MUTATION_STATUS.PENDING,
      
      // Photo reference
      photoId: photoRecordId,
      photoData: photoResult?.dataUrl || null,
      photoCapturedAt: photoResult?.capturedAt || null,
      photoCapturedAtLabel: photoResult?.capturedAtLabel || null
    };
    allTxs.push(finalTx);
    storage.set(SELECTION_STORAGE_KEY, allTxs);
  }

  // 2. Simpan record foto dokumentasi jika ada
  let photoRecord = null;
  if (photoResult && photoResult.dataUrl) {
    photoRecord = {
      id: finalTx.photoId || `DOC-SEL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      transactionType: 'SELECTION',
      selectionTransactionId: finalTx.id,
      selectionDocNo: finalTx.docNo,
      selectionPoolDocNo: finalTx.docNo,
      sourceTransactionId: finalTx.sourceTransactionId,
      sourceDocNo: finalTx.sourceDocNo,
      batchId: finalTx.batchId,
      batchCode: finalTx.batchCode,
      category: finalTx.category,
      quantity: finalTx.jumlahAfkir,
      photoData: photoResult.dataUrl,
      capturedAt: photoResult.capturedAt,
      capturedAtLabel: photoResult.capturedAtLabel,
      createdAt: new Date().toISOString(),
      createdBy: user.name
    };
    saveSelectionDocumentationPhoto(photoRecord);
  }

  // 3. Update status di selection_pool secara idempoten
  let fullPool = storage.get('selection_pool', []);
  const poolMatchIdx = fullPool.findIndex(p => (
    (p.id && targetPoolItem.id && p.id === targetPoolItem.id) ||
    (p.docNo && targetPoolItem.docNo && p.docNo === targetPoolItem.docNo) ||
    (p.sourceDocNo === targetPoolItem.sourceDocNo && p.category === targetPoolItem.category && p.sourceModule === targetPoolItem.sourceModule)
  ));
  if (poolMatchIdx !== -1) {
    fullPool[poolMatchIdx].status = 'DECLARED_CULLED';
    fullPool[poolMatchIdx].docNo = finalTx.docNo;
  }
  storage.set('selection_pool', fullPool);

  return {
    success: true,
    isNew: isNewTx,
    transaction: finalTx,
    photoRecord
  };
}

