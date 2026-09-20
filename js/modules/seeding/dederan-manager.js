/**
 * modules/seeding/dederan-manager.js
 * Manager, Business Logic, and Storage Access for Baseline Dederan & Pemeriksaan Dederan (Prototype).
 *
 * Rules:
 * - 1 receipt_transactions (Benih/Biji Kelatak) = 1 dederan_induk_documents (1:1)
 * - 1 dederan_induk_documents = N dederan_transactions (1:N)
 * - Unique Bedengan per Dokumen Induk: 1 bedengan can only be used once per Dokumen Induk.
 * - Aggregate Quota Balance: Over-deder is blocked. Sisa = Total - Sum(Child Deder).
 * - Prototype Bypass 15 Days: Once parent is fully dedered, bedengans are eligible for inspection immediately.
 *   (TODO: Minimum age ±15 days rule to be enforced in production development).
 * - Partial Inspection Rule: Successful quantity only becomes eligible for Pindah Semai when bedengan is 100% inspected.
 * - Rejection Output: Inspection only outputs raw failure quantity. Sent to selection_pool as PENDING_DECLARATION (not MATI).
 */

import { storage } from '../../core/storage.js';
import { formatStandardDocNo, formatDate, generateUniqueDocNo, todayISO } from '../../core/utils.js';

export const DEDERAN_STORAGE_KEYS = Object.freeze({
  INDUK: 'dederan_induk_documents',
  TRANSACTIONS: 'dederan_transactions',
  INSPECTIONS: 'dederan_inspections'
});

export const DEDERAN_INDUK_STATUS = Object.freeze({
  NOT_STARTED: 'Belum Dideder',
  IN_PROGRESS: 'Deder Belum Selesai',
  COMPLETED: 'Selesai Dideder'
});

/**
 * Normalizes and syncs Dokumen Induk Deder for all Benih receipts in receipt_transactions (1:1)
 */
export function syncDederanIndukDocuments() {
  const receiptTxs = storage.get('receipt_transactions', []);
  const benihTxs = receiptTxs
    .map((tx, originalIndex) => ({ ...tx, originalIndex }))
    .filter(tx => tx.jenis === 'Benih / Biji Kelatak');

  let indukDocs = storage.get(DEDERAN_STORAGE_KEYS.INDUK, []);
  let dederTxs = storage.get(DEDERAN_STORAGE_KEYS.TRANSACTIONS, []);
  let hasChange = false;

  // Auto-migrate legacy DED-IND to DDR
  indukDocs.forEach(induk => {
    if (induk.docNo && induk.docNo.includes('/DED-IND/')) {
      const oldDocNo = induk.docNo;
      induk.docNo = oldDocNo.replace('/DED-IND/', '/DDR/');
      if (induk.id && induk.id.startsWith('DED-IND-')) {
        induk.id = induk.id.replace('DED-IND-', 'DDR-');
      }
      hasChange = true;

      // Update child transactions referencing old docNo
      dederTxs.forEach(t => {
        if (t.parentDederIndukDocNo === oldDocNo) {
          t.parentDederIndukDocNo = induk.docNo;
          storage.set(DEDERAN_STORAGE_KEYS.TRANSACTIONS, dederTxs);
        }
      });
    }
  });

  // Auto-clean any legacy batchNo on existing induk documents
  indukDocs.forEach(induk => {
    if ('batchNo' in induk || 'batchCode' in induk || 'batchId' in induk) {
      delete induk.batchNo;
      delete induk.batchCode;
      delete induk.batchId;
      hasChange = true;
    }
  });

  benihTxs.forEach((rtx, idx) => {
    const sourceReceiptDocNo = rtx.docNo || rtx.nomorDokumen || formatStandardDocNo(2026, 'APR', idx + 1);
    let induk = indukDocs.find(d => d.sourceReceiptDocNo === sourceReceiptDocNo || d.sourceReceiptIndex === rtx.originalIndex);

    const totalNilaiButirPenerimaan = parseInt(rtx.qty || rtx.jumlahBenih || rtx.totalKecambah || rtx.jumlah || 0);

    // Calculate aggregated child deder transactions
    const childTxs = dederTxs.filter(t => t.parentDederIndukDocNo === (induk?.docNo) || t.sourceReceiptDocNo === sourceReceiptDocNo);
    let totalDidederSDHI = 0;
    childTxs.forEach(t => {
      totalDidederSDHI += parseInt(t.jumlahDeder || 0);
    });

    const sisaBelumDeder = Math.max(0, totalNilaiButirPenerimaan - totalDidederSDHI);
    let status = DEDERAN_INDUK_STATUS.NOT_STARTED;
    if (totalDidederSDHI > 0 && sisaBelumDeder > 0) {
      status = DEDERAN_INDUK_STATUS.IN_PROGRESS;
    } else if (totalDidederSDHI >= totalNilaiButirPenerimaan && totalNilaiButirPenerimaan > 0) {
      status = DEDERAN_INDUK_STATUS.COMPLETED;
    }

    if (!induk) {
      // Create new Induk Doc with DDR format (tanpa Batch)
      const docNo = generateUniqueDocNo('dederanInduk', indukDocs, 2026);
      induk = {
        id: `DDR-${sourceReceiptDocNo.replace(/\//g, '-')}`,
        docNo,
        sourceReceiptDocNo,
        sourceReceiptIndex: rtx.originalIndex,
        programId: rtx.programId || null,
        programCode: rtx.program || rtx.programCode || 'PRG/NUR/01/2026',
        program: rtx.program || rtx.programCode || 'PRG/NUR/01/2026',
        estateId: rtx.estateId || 'EST-TBS',
        divisionId: rtx.divisionId || 'DIV-001',
        klon: rtx.klon || 'GT 1',
        tahapan: rtx.tahapan || 'Rubber Main Nursery',
        tanggalPenerimaan: rtx.tanggal || formatDate(new Date().toISOString()),
        totalNilaiButirPenerimaan,
        totalDidederSDHI,
        sisaBelumDeder,
        status,
        firstDederDate: childTxs[0]?.tanggalDeder || null,
        lastDederDate: childTxs[childTxs.length - 1]?.tanggalDeder || null,
        completedAt: status === DEDERAN_INDUK_STATUS.COMPLETED ? (childTxs[childTxs.length - 1]?.createdAt || new Date().toISOString()) : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      indukDocs.push(induk);
      hasChange = true;
    } else {
      // Update aggregate values
      let changed = false;
      if (induk.totalNilaiButirPenerimaan !== totalNilaiButirPenerimaan) { induk.totalNilaiButirPenerimaan = totalNilaiButirPenerimaan; changed = true; }
      if (induk.totalDidederSDHI !== totalDidederSDHI) { induk.totalDidederSDHI = totalDidederSDHI; changed = true; }
      if (induk.sisaBelumDeder !== sisaBelumDeder) { induk.sisaBelumDeder = sisaBelumDeder; changed = true; }
      if (induk.status !== status) { induk.status = status; changed = true; }
      if (childTxs.length > 0) {
        induk.firstDederDate = childTxs[0].tanggalDeder;
        induk.lastDederDate = childTxs[childTxs.length - 1].tanggalDeder;
      }
      if (status === DEDERAN_INDUK_STATUS.COMPLETED && !induk.completedAt) {
        induk.completedAt = new Date().toISOString();
        changed = true;
      }
      if (changed) hasChange = true;
    }
  });

  if (hasChange) {
    storage.set(DEDERAN_STORAGE_KEYS.INDUK, indukDocs);
  }

  // Jalankan pembersihan lineage Batch pada runtime data Dederan
  cleanupDederanBatchLineage();

  return indukDocs;
}

/**
 * Gets all Dokumen Induk Deder
 */
export function getAllDederanIndukDocuments() {
  return syncDederanIndukDocuments();
}

export const getDederanIndukDocuments = getAllDederanIndukDocuments;

/**
 * Gets Dokumen Induk Deder by docNo or ID
 */
export function getDederanIndukById(idOrDocNo) {
  if (!idOrDocNo) return null;
  const list = getAllDederanIndukDocuments();
  return list.find(d => d.id === idOrDocNo || d.docNo === idOrDocNo || d.sourceReceiptDocNo === idOrDocNo) || null;
}

/**
 * Gets all Dederan Transactions
 */
export function getDederanTransactions() {
  return storage.get(DEDERAN_STORAGE_KEYS.TRANSACTIONS, []);
}

/**
 * Gets Dederan Transaction by ID or docNo
 */
export function getDederanTransactionById(idOrDocNo) {
  if (!idOrDocNo) return null;
  const list = getDederanTransactions();
  return list.find(t => t.id === idOrDocNo || t.docNo === idOrDocNo) || null;
}

/**
 * Gets all Child Deder Transactions for a parent Dokumen Induk Deder
 */
export function getDederanTransactionsByParent(parentDocNoOrId) {
  if (!parentDocNoOrId) return [];
  const list = storage.get(DEDERAN_STORAGE_KEYS.TRANSACTIONS, []);
  return list.filter(t => t.parentDederIndukDocNo === parentDocNoOrId || t.parentDederIndukId === parentDocNoOrId || t.sourceReceiptDocNo === parentDocNoOrId);
}

/**
 * Validates a Dederan transaction payload before saving
 */
export function validateDederanTransaction(txPayload) {
  if (!txPayload) return { isValid: false, error: 'Data transaksi dederan tidak valid.' };

  const parentDocNo = txPayload.parentDederIndukDocNo;
  const parent = getDederanIndukById(parentDocNo);
  if (!parent) {
    return { isValid: false, error: `Dokumen Induk Deder '${parentDocNo}' tidak ditemukan.` };
  }

  const existingChildTxs = getDederanTransactionsByParent(parent.docNo);
  const bedId = String(txPayload.bedenganId || txPayload.bedenganCode || '').trim();
  const bedCode = String(txPayload.bedenganCode || txPayload.bedengan || '').trim();

  // UNIQUE BEDENGAN VALIDATION (Checked first)
  const isDuplicateBed = existingChildTxs.some(t =>
    (t.bedenganId && t.bedenganId === bedId) ||
    (t.bedenganCode && t.bedenganCode === bedCode) ||
    (t.bedengan && (t.bedengan === bedCode || t.bedengan === bedId))
  );

  if (isDuplicateBed) {
    return { isValid: false, error: `Bedengan '${bedCode || bedId}' sudah digunakan pada Dokumen Induk Deder ini. Satu bedengan hanya boleh digunakan satu kali.` };
  }

  const jumlahDeder = parseInt(txPayload.jumlahDeder || 0, 10);
  if (isNaN(jumlahDeder) || jumlahDeder <= 0) {
    return { isValid: false, error: 'Jumlah di deder harus berupa bilangan bulat lebih dari 0.' };
  }

  if (jumlahDeder > parent.sisaBelumDeder) {
    return { isValid: false, error: `Jumlah di deder (${jumlahDeder.toLocaleString('id-ID')}) melebihi sisa belum dideder (${parent.sisaBelumDeder.toLocaleString('id-ID')}).` };
  }

  return { isValid: true };
}

/**
 * Saves a new Transaksi Dederan with full validations:
 * - jumlahDeder > 0
 * - Unique Bedengan within same parent Induk Doc
 * - No Over-Deder (jumlahDeder <= sisaBelumDeder)
 */
export function saveDederanTransaction(txPayload) {
  if (!txPayload) throw new Error('Data transaksi dederan tidak valid.');

  const parentDocNo = txPayload.parentDederIndukDocNo;
  const parent = getDederanIndukById(parentDocNo);
  if (!parent) {
    throw new Error(`Dokumen Induk Deder '${parentDocNo}' tidak ditemukan.`);
  }

  const existingChildTxs = getDederanTransactionsByParent(parent.docNo);
  const bedId = String(txPayload.bedenganId || txPayload.bedenganCode || '').trim();
  const bedCode = String(txPayload.bedenganCode || txPayload.bedengan || '').trim();

  // UNIQUE BEDENGAN VALIDATION
  const isDuplicateBed = existingChildTxs.some(t =>
    (t.bedenganId && t.bedenganId === bedId) ||
    (t.bedenganCode && t.bedenganCode === bedCode) ||
    (t.bedengan && (t.bedengan === bedCode || t.bedengan === bedId))
  );

  if (isDuplicateBed) {
    throw new Error(`Bedengan '${bedCode || bedId}' sudah digunakan pada Dokumen Induk Deder ini. Satu bedengan hanya boleh digunakan satu kali.`);
  }

  const jumlahDeder = parseInt(txPayload.jumlahDeder || 0, 10);
  if (isNaN(jumlahDeder) || jumlahDeder <= 0) {
    throw new Error('Jumlah di deder harus berupa bilangan bulat lebih dari 0.');
  }

  if (jumlahDeder > parent.sisaBelumDeder) {
    throw new Error(`Jumlah di deder (${jumlahDeder.toLocaleString('id-ID')}) melebihi sisa belum dideder (${parent.sisaBelumDeder.toLocaleString('id-ID')}).`);
  }

  const allDederTxs = storage.get(DEDERAN_STORAGE_KEYS.TRANSACTIONS, []);
  const docNo = generateUniqueDocNo('dederan', allDederTxs, 2026);

  const newTx = {
    id: `DED-TX-${docNo.replace(/\//g, '-')}`,
    docNo,
    parentDederIndukId: parent.id,
    parentDederIndukDocNo: parent.docNo,
    sourceReceiptDocNo: parent.sourceReceiptDocNo,
    tanggalDeder: txPayload.tanggalDeder || formatDate(new Date().toISOString()),
    estateId: parent.estateId,
    divisionId: parent.divisionId,
    programId: parent.programId,
    programCode: parent.programCode,
    klon: parent.klon,
    bedenganId: bedId,
    bedenganCode: bedCode,
    bedengan: bedCode,
    qrCode: txPayload.qrCode || null,
    jumlahDeder,
    photos: txPayload.photos || [],
    createdBy: txPayload.createdBy || 'Mantri Pembibitan',
    createdAt: new Date().toISOString()
  };

  allDederTxs.push(newTx);
  storage.set(DEDERAN_STORAGE_KEYS.TRANSACTIONS, allDederTxs);

  // Re-sync induk document aggregate balance and status
  syncDederanIndukDocuments();

  return newTx;
}

/**
 * Deletes a Dederan transaction if no inspections have been recorded
 */
export function deleteDederanTransaction(docNoOrId) {
  if (!docNoOrId) return { success: false, error: 'ID transaksi tidak valid' };

  const inspections = getDederanInspectionsByDederTx(docNoOrId);
  if (inspections.length > 0) {
    return { success: false, error: 'Transaksi tidak dapat dihapus karena sudah memiliki data pemeriksaan.' };
  }

  let txs = storage.get(DEDERAN_STORAGE_KEYS.TRANSACTIONS, []);
  const idx = txs.findIndex(t => t.id === docNoOrId || t.docNo === docNoOrId);
  if (idx < 0) {
    return { success: false, error: 'Transaksi tidak ditemukan.' };
  }

  const deleted = txs.splice(idx, 1)[0];
  storage.set(DEDERAN_STORAGE_KEYS.TRANSACTIONS, txs);

  // Re-sync induk document aggregate balance and status
  syncDederanIndukDocuments();

  return { success: true, deleted };
}

/**
 * Gets all inspections performed for a specific bedengan dederan transaction
 */
export function getDederanInspectionsByDederTx(dederTxDocNo) {
  if (!dederTxDocNo) return [];
  const list = storage.get(DEDERAN_STORAGE_KEYS.INSPECTIONS, []);
  return list.filter(i => i.dederanTxDocNo === dederTxDocNo || i.dederanTxId === dederTxDocNo);
}

/**
 * Calculates inspection summary for a specific dederan transaction
 */
export function getBedenganInspectionSummary(dederTx) {
  if (!dederTx) return { totalDeder: 0, totalDiperiksa: 0, totalBerhasil: 0, totalTidakBerhasil: 0, isComplete: false, remainingToInspect: 0 };

  const inspections = getDederanInspectionsByDederTx(dederTx.docNo);
  const totalDeder = parseInt(dederTx.jumlahDeder || 0, 10);
  let totalDiperiksa = 0;
  let totalBerhasil = 0;
  let totalTidakBerhasil = 0;

  inspections.forEach(i => {
    totalDiperiksa += parseInt(i.jumlahDiperiksa || 0, 10);
    totalBerhasil += parseInt(i.jumlahBerhasil || 0, 10);
    totalTidakBerhasil += parseInt(i.jumlahTidakBerhasil || 0, 10);
  });

  const remainingToInspect = Math.max(0, totalDeder - totalDiperiksa);
  const isComplete = totalDiperiksa >= totalDeder && totalDeder > 0;

  return {
    totalDeder,
    totalDiperiksa,
    totalBerhasil,
    totalTidakBerhasil,
    isComplete,
    remainingToInspect,
    sisaBelumDiperiksa: remainingToInspect
  };
}

/**
 * Validates a Pemeriksaan Dederan payload before saving
 */
export function validateDederanInspection(payload) {
  if (!payload) return { isValid: false, error: 'Data pemeriksaan dederan tidak valid.' };

  const dederTxDocNo = payload.dederanTxDocNo || payload.dederanTxId;
  const dederTxs = storage.get(DEDERAN_STORAGE_KEYS.TRANSACTIONS, []);
  const dederTx = dederTxs.find(t => t.docNo === dederTxDocNo || t.id === dederTxDocNo);

  if (!dederTx) {
    return { isValid: false, error: `Transaksi Dederan '${dederTxDocNo}' tidak ditemukan.` };
  }

  const prevSummary = getBedenganInspectionSummary(dederTx);
  const jumlahDiperiksa = parseInt(payload.jumlahDiperiksa || 0, 10);
  const jumlahBerhasil = parseInt(payload.jumlahBerhasil || 0, 10);

  if (isNaN(jumlahDiperiksa) || jumlahDiperiksa <= 0) {
    return { isValid: false, error: 'Jumlah Diperiksa harus lebih dari 0.' };
  }
  if (jumlahDiperiksa > prevSummary.remainingToInspect) {
    return { isValid: false, error: `Jumlah Diperiksa (${jumlahDiperiksa.toLocaleString('id-ID')}) melebihi sisa yang belum diperiksa (${prevSummary.remainingToInspect.toLocaleString('id-ID')}).` };
  }
  if (isNaN(jumlahBerhasil) || jumlahBerhasil < 0) {
    return { isValid: false, error: 'Jumlah Berhasil tidak boleh bernilai negatif.' };
  }
  if (jumlahBerhasil > jumlahDiperiksa) {
    return { isValid: false, error: 'Jumlah Berhasil tidak boleh melebihi Jumlah Diperiksa.' };
  }

  return { isValid: true, dederTx, prevSummary };
}

/**
 * Creates a new Pemeriksaan Dederan record and updates the selection pool
 */
export function createDederanInspection(payload) {
  const validation = validateDederanInspection(payload);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const { dederTx } = validation;
  const allInspections = storage.get(DEDERAN_STORAGE_KEYS.INSPECTIONS, []);
  const docNo = generateUniqueDocNo('dederanInspection', allInspections, 2026);

  const jumlahDeder = parseInt(dederTx.jumlahDeder || 0, 10);
  const jumlahDiperiksa = parseInt(payload.jumlahDiperiksa || 0, 10);
  const jumlahBerhasil = parseInt(payload.jumlahBerhasil || 0, 10);
  const jumlahTidakBerhasil = jumlahDiperiksa - jumlahBerhasil;

  const newInspection = {
    id: `DED-INS-${docNo.replace(/\//g, '-')}`,
    docNo,
    parentDederIndukId: dederTx.parentDederIndukId,
    parentDederIndukDocNo: dederTx.parentDederIndukDocNo,
    dederanTxId: dederTx.id,
    dederanTxDocNo: dederTx.docNo,
    sourceReceiptDocNo: dederTx.sourceReceiptDocNo,
    tanggalPemeriksaan: payload.tanggalPemeriksaan || formatDate(new Date().toISOString()),
    estateId: dederTx.estateId,
    divisionId: dederTx.divisionId,
    programId: dederTx.programId,
    programCode: dederTx.programCode,
    bedenganId: dederTx.bedenganId,
    bedenganCode: dederTx.bedenganCode,
    klon: dederTx.klon || 'GT 1',
    jumlahDeder,
    jumlahDiperiksa,
    jumlahBerhasil,
    jumlahTidakBerhasil,
    photos: Array.isArray(payload.photos) ? payload.photos : [],
    inspectorName: payload.inspectorName || 'Mantri Pembibitan',
    createdAt: new Date().toISOString()
  };

  allInspections.push(newInspection);
  storage.set(DEDERAN_STORAGE_KEYS.INSPECTIONS, allInspections);

  // Check cumulative status for this bedengan
  const newSummary = getBedenganInspectionSummary(dederTx);

  // Consolidate rejection / inspection result to selection_pool as PENDING_DECLARATION
  if (newSummary.isComplete || newSummary.totalTidakBerhasil > 0) {
    integrateDederanRejectionToSelectionPool(newInspection, newSummary.totalTidakBerhasil);
  }

  return {
    inspection: newInspection,
    summary: newSummary
  };
}

export const saveDederanInspection = createDederanInspection;

/**
 * Integrates failed dederan inspection quantities to selection_pool as PENDING_DECLARATION
 * NOTE: Category is NOT set to MATI here; it is determined later in Pasca Semai.
 * Batch is NOT propagated for Dederan rejections.
 */
export function integrateDederanRejectionToSelectionPool(inspectionTx, totalTidakBerhasilQty) {
  const qty = parseInt(totalTidakBerhasilQty !== undefined ? totalTidakBerhasilQty : inspectionTx.jumlahTidakBerhasil, 10);
  if (isNaN(qty) || qty < 0) return;

  let selectionPool = storage.get('selection_pool', []);

  const dederanTxDocNo = inspectionTx.dederanTxDocNo || inspectionTx.docNo;
  const poolId = `SEL-POOL-DED-${dederanTxDocNo}`;
  const existingIdx = selectionPool.findIndex(s => s.id === poolId || (s.dederanDocNo === dederanTxDocNo && s.originType === 'REJECT_DEDERAN'));

  // Calculate max sequence for CULL doc number
  let maxSeq = 0;
  selectionPool.forEach(item => {
    const d = String(item.docNo || item.selectionDocNo || '');
    const match = d.match(/CULL\/(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) maxSeq = num;
    }
  });

  const existingItem = existingIdx >= 0 ? selectionPool[existingIdx] : null;

  const poolEntry = {
    id: poolId,
    docNo: existingItem?.docNo || formatStandardDocNo(2026, 'CULL', maxSeq + 1),
    originType: 'REJECT_DEDERAN',
    sourceModule: 'DEDERAN',
    sourceTransactionType: 'DEDER_INSPECTION',
    sourceTransactionId: inspectionTx.id || inspectionTx.docNo,
    sourceDocNo: inspectionTx.docNo || dederanTxDocNo,
    dederanDocNo: dederanTxDocNo,
    dederanIndukDocNo: inspectionTx.parentDederIndukDocNo || inspectionTx.dederanIndukDocNo || (existingItem?.dederanIndukDocNo || null),
    category: existingItem?.category || 'PENDING_DECLARATION', // Preserves declared state
    alasanDitolakCategory: existingItem?.alasanDitolakCategory || null,
    jumlahAfkir: qty,
    quantity: qty,
    alasan: `Hasil Pemeriksaan Dederan Tidak Berhasil (${inspectionTx.bedenganCode || (existingItem?.bedenganCode || '-')})`,
    estateId: inspectionTx.estateId || existingItem?.estateId || null,
    divisionId: inspectionTx.divisionId || existingItem?.divisionId || null,
    programId: inspectionTx.programId || existingItem?.programId || null,
    programCode: inspectionTx.programCode || inspectionTx.program || (existingItem?.programCode || null),
    program: inspectionTx.program || inspectionTx.programCode || (existingItem?.program || null),
    bedenganId: inspectionTx.bedenganId || existingItem?.bedenganId || null,
    bedenganCode: inspectionTx.bedenganCode || existingItem?.bedenganCode || null,
    klon: inspectionTx.klon || existingItem?.klon || 'GT 1',
    tahapan: 'Rubber Main Nursery',
    tanggal: inspectionTx.tanggalPemeriksaan || inspectionTx.tanggal || (existingItem?.tanggal || new Date().toISOString().split('T')[0]),
    status: existingItem?.status || 'PENDING_DECLARATION',
    declaredAt: existingItem?.declaredAt,
    declaredBy: existingItem?.declaredBy,
    selectionTransactionId: existingItem?.selectionTransactionId,
    selectionDocNo: existingItem?.selectionDocNo,
    stockMutationStatus: existingItem?.stockMutationStatus || 'PENDING',
    createdAt: existingItem?.createdAt || new Date().toISOString()
  };

  if (existingIdx >= 0) {
    const merged = { ...selectionPool[existingIdx], ...poolEntry, id: selectionPool[existingIdx].id };
    delete merged.batchId;
    delete merged.batchCode;
    delete merged.batchNo;
    selectionPool[existingIdx] = merged;
  } else {
    selectionPool.push(poolEntry);
  }

  storage.set('selection_pool', selectionPool);
  return poolEntry;
}

/**
 * Membersihkan metadata Batch dari seluruh record runtime proses Dederan
 */
export function cleanupDederanBatchLineage() {
  // 1. Clean dederan_induk_documents
  let indukDocs = storage.get(DEDERAN_STORAGE_KEYS.INDUK, []);
  let indukChanged = false;
  indukDocs.forEach(d => {
    if ('batchNo' in d || 'batchCode' in d || 'batchId' in d) {
      delete d.batchNo;
      delete d.batchCode;
      delete d.batchId;
      indukChanged = true;
    }
  });
  if (indukChanged) storage.set(DEDERAN_STORAGE_KEYS.INDUK, indukDocs);

  // 2. Clean dederan_transactions
  let dederTxs = storage.get(DEDERAN_STORAGE_KEYS.TRANSACTIONS, []);
  let txChanged = false;
  dederTxs.forEach(t => {
    if ('batchNo' in t || 'batchCode' in t || 'batchId' in t) {
      delete t.batchNo;
      delete t.batchCode;
      delete t.batchId;
      txChanged = true;
    }
  });
  if (txChanged) storage.set(DEDERAN_STORAGE_KEYS.TRANSACTIONS, dederTxs);

  // 3. Clean dederan_inspections
  let inspections = storage.get(DEDERAN_STORAGE_KEYS.INSPECTIONS, []);
  let insChanged = false;
  inspections.forEach(i => {
    if ('batchNo' in i || 'batchCode' in i || 'batchId' in i) {
      delete i.batchNo;
      delete i.batchCode;
      delete i.batchId;
      insChanged = true;
    }
  });
  if (insChanged) storage.set(DEDERAN_STORAGE_KEYS.INSPECTIONS, inspections);

  // 4. Clean selection_pool for REJECT_DEDERAN
  let pool = storage.get('selection_pool', []);
  let poolChanged = false;
  pool.forEach(p => {
    if (p.originType === 'REJECT_DEDERAN' || p.sourceModule === 'DEDERAN') {
      if ('batchNo' in p || 'batchCode' in p || 'batchId' in p) {
        delete p.batchNo;
        delete p.batchCode;
        delete p.batchId;
        poolChanged = true;
      }
    }
  });
  if (poolChanged) storage.set('selection_pool', pool);

  // 5. Clean selection_transactions for REJECT_DEDERAN
  let selTxs = storage.get('selection_transactions', []);
  let selChanged = false;
  selTxs.forEach(t => {
    if (t.originType === 'REJECT_DEDERAN' || t.sourceModule === 'DEDERAN') {
      if ('batchNo' in t || 'batchCode' in t || 'batchId' in t) {
        delete t.batchNo;
        delete t.batchCode;
        delete t.batchId;
        selChanged = true;
      }
    }
  });
  if (selChanged) storage.set('selection_transactions', selTxs);
}

/**
 * Sinkronisasi seluruh rejection hasil pemeriksaan dederan ke selection_pool
 */
export function syncAllDederanRejectionsToSelectionPool() {
  cleanupDederanBatchLineage();
  const dederTxs = getDederanTransactions();
  dederTxs.forEach(dtx => {
    const summary = getBedenganInspectionSummary(dtx);
    if (summary.isComplete || summary.totalTidakBerhasil > 0) {
      integrateDederanRejectionToSelectionPool(dtx, summary.totalTidakBerhasil);
    }
  });
}

/**
 * Gets a specific Dederan Inspection by docNo or ID
 */
export function getDederanInspectionById(idOrDocNo) {
  if (!idOrDocNo) return null;
  const list = storage.get(DEDERAN_STORAGE_KEYS.INSPECTIONS, []);
  return list.find(i => i.id === idOrDocNo || i.docNo === idOrDocNo) || null;
}

/**
 * Deletes a Dederan Inspection record and cleans up downstream integration
 */
export function deleteDederanInspection(idOrDocNo) {
  if (!idOrDocNo) return { success: false, error: 'ID pemeriksaan tidak valid' };

  let inspections = storage.get(DEDERAN_STORAGE_KEYS.INSPECTIONS, []);
  const idx = inspections.findIndex(i => i.id === idOrDocNo || i.docNo === idOrDocNo);
  if (idx < 0) {
    return { success: false, error: 'Data pemeriksaan tidak ditemukan.' };
  }

  const deleted = inspections.splice(idx, 1)[0];
  storage.set(DEDERAN_STORAGE_KEYS.INSPECTIONS, inspections);

  // Clean up or recalculate selection pool for this bedengan
  const dederTx = getDederanTransactionById(deleted.dederanTxDocNo);
  if (dederTx) {
    const newSummary = getBedenganInspectionSummary(dederTx);
    let selectionPool = storage.get('selection_pool', []);
    const poolId = `SEL-POOL-DED-${deleted.dederanTxDocNo || deleted.docNo || deleted.id}`;
    
    if (newSummary.totalTidakBerhasil > 0) {
      integrateDederanRejectionToSelectionPool(deleted, newSummary.totalTidakBerhasil);
    } else {
      selectionPool = selectionPool.filter(s => s.id !== poolId && s.dederanDocNo !== (deleted.dederanTxDocNo || deleted.docNo));
      storage.set('selection_pool', selectionPool);
    }
  }

  return { success: true, deleted };
}

/**
 * Updates an existing Dederan Inspection record
 */
export function updateDederanInspection(idOrDocNo, payload) {
  if (!idOrDocNo || !payload) throw new Error('Data update pemeriksaan tidak valid.');

  let inspections = storage.get(DEDERAN_STORAGE_KEYS.INSPECTIONS, []);
  const idx = inspections.findIndex(i => i.id === idOrDocNo || i.docNo === idOrDocNo);
  if (idx < 0) {
    throw new Error('Data pemeriksaan tidak ditemukan untuk diperbarui.');
  }

  const existing = inspections[idx];
  const dederTx = getDederanTransactionById(existing.dederanTxDocNo);
  if (!dederTx) throw new Error('Transaksi Dederan induk tidak ditemukan.');

  const prevSummary = getBedenganInspectionSummary(dederTx);
  const maxAllowed = prevSummary.remainingToInspect + parseInt(existing.jumlahDiperiksa || 0, 10);

  const jumlahDiperiksa = parseInt(payload.jumlahDiperiksa || 0, 10);
  const jumlahBerhasil = parseInt(payload.jumlahBerhasil || 0, 10);

  if (isNaN(jumlahDiperiksa) || jumlahDiperiksa <= 0) {
    throw new Error('Jumlah Diperiksa harus lebih dari 0.');
  }
  if (jumlahDiperiksa > maxAllowed) {
    throw new Error(`Jumlah Diperiksa (${jumlahDiperiksa.toLocaleString('id-ID')}) melebihi batas maksimal (${maxAllowed.toLocaleString('id-ID')}).`);
  }
  if (isNaN(jumlahBerhasil) || jumlahBerhasil < 0) {
    throw new Error('Jumlah Berhasil tidak boleh bernilai negatif.');
  }
  if (jumlahBerhasil > jumlahDiperiksa) {
    throw new Error('Jumlah Berhasil tidak boleh melebihi Jumlah Diperiksa.');
  }

  const jumlahTidakBerhasil = jumlahDiperiksa - jumlahBerhasil;

  const updatedInspection = {
    ...existing,
    jumlahDiperiksa,
    jumlahBerhasil,
    jumlahTidakBerhasil,
    photos: Array.isArray(payload.photos) ? payload.photos : existing.photos,
    inspectorName: payload.inspectorName || existing.inspectorName || 'Mantri Pembibitan',
    updatedAt: new Date().toISOString()
  };

  inspections[idx] = updatedInspection;
  storage.set(DEDERAN_STORAGE_KEYS.INSPECTIONS, inspections);

  const newSummary = getBedenganInspectionSummary(dederTx);

  // Update selection pool
  if (newSummary.totalTidakBerhasil > 0) {
    integrateDederanRejectionToSelectionPool(updatedInspection, newSummary.totalTidakBerhasil);
  } else {
    let selectionPool = storage.get('selection_pool', []);
    const poolId = `SEL-POOL-DED-${updatedInspection.dederanTxDocNo || updatedInspection.docNo || updatedInspection.id}`;
    selectionPool = selectionPool.filter(s => s.id !== poolId && s.dederanDocNo !== (updatedInspection.dederanTxDocNo || updatedInspection.docNo));
    storage.set('selection_pool', selectionPool);
  }

  return {
    inspection: updatedInspection,
    summary: newSummary
  };
}

/**
 * Updates an existing Dederan transaction (if no inspections recorded)
 */
export function updateDederanTransaction(idOrDocNo, payload) {
  if (!idOrDocNo || !payload) throw new Error('Data transaksi tidak valid.');
  let txs = storage.get(DEDERAN_STORAGE_KEYS.TRANSACTIONS, []);
  const idx = txs.findIndex(t => t.id === idOrDocNo || t.docNo === idOrDocNo);
  if (idx < 0) throw new Error('Transaksi Dederan tidak ditemukan.');

  const existing = txs[idx];
  const parent = getDederanIndukById(existing.parentDederIndukDocNo);
  if (!parent) throw new Error('Dokumen Induk Deder tidak ditemukan.');

  const inspections = getDederanInspectionsByDederTx(existing.docNo);
  if (inspections.length > 0) {
    throw new Error('Transaksi Dederan tidak dapat diedit karena sudah memiliki data pemeriksaan.');
  }

  const maxAllowed = (parent.sisaBelumDeder || 0) + parseInt(existing.jumlahDeder || 0, 10);
  const newJumlah = parseInt(payload.jumlahDeder || 0, 10);
  if (isNaN(newJumlah) || newJumlah <= 0) {
    throw new Error('Jumlah di deder harus lebih dari 0.');
  }
  if (newJumlah > maxAllowed) {
    throw new Error(`Jumlah di deder (${newJumlah.toLocaleString('id-ID')}) melebihi kuota sisa (${maxAllowed.toLocaleString('id-ID')}).`);
  }

  txs[idx] = {
    ...existing,
    jumlahDeder: newJumlah,
    photos: Array.isArray(payload.photos) ? payload.photos : existing.photos,
    updatedAt: new Date().toISOString()
  };

  storage.set(DEDERAN_STORAGE_KEYS.TRANSACTIONS, txs);
  syncDederanIndukDocuments();
  return txs[idx];
}

