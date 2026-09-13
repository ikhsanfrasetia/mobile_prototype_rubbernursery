/**
 * js/modules/verification/verification-manager.js
 * Engine Verifikasi Data Transaksi Pembibitan untuk ASISTEN_BIBITAN (TASK ASB-12)
 * 
 * Prinsip:
 * - Layer pemeriksaan audit final atas transaksi terkonsolidasi
 * - ZERO STOCK MUTATION: Tidak mengubah availableQty, currentQty, atau status batch
 * - Consistency Gate: Pengecekan konsistensi data sebelum approval (ERROR memblokir approve; WARNING diizinkan dengan catatan)
 * - Scope Isolation: Hanya memproses transaksi dalam lingkup estateId & divisionId ASB
 * - Audit Trail: Menyimpan riwayat keputusan audit dalam verification_transactions tanpa menduplikasi data transaksi sumber
 */

import { storage } from '../../core/storage.js';
import { normalizeRole, ROLES } from '../../core/user-context.js';
import { getConsolidatedData, runConsistencyCheck, buildTraceabilityChain } from '../consolidation/consolidation-manager.js';
import { getAllBatches } from '../../data/batch-master.js';
import { getAllBedengan } from '../../data/bedengan-master.js';
import { getProgramById } from '../../data/program-master.js';
import { getEstateById } from '../../data/estate-master.js';

export const VERIFICATION_STORAGE_KEY = 'verification_transactions';

export const VERIFICATION_STATUS = Object.freeze({
  TERVERIFIKASI: 'TERVERIFIKASI',
  DIKEMBALIKAN: 'DIKEMBALIKAN',
  MENUNGGU_VERIFIKASI: 'MENUNGGU_VERIFIKASI'
});

export const REFERENCE_TYPES = Object.freeze({
  REQUEST: 'REQUEST',
  DISPATCH: 'DISPATCH',
  RECEIPT: 'RECEIPT',
  SELECTION: 'SELECTION',
  DESTRUCTION: 'DESTRUCTION'
});

/**
 * Mengambil semua riwayat verifikasi audit dari storage
 */
export function getAllVerifications() {
  return storage.get(VERIFICATION_STORAGE_KEY, []);
}

/**
 * Mencari catatan verifikasi berdasarkan referenceType dan referenceId
 */
export function getVerificationByReference(referenceType, referenceId) {
  if (!referenceType || !referenceId) return null;
  const list = getAllVerifications();
  // Ambil verifikasi terbaru untuk referensi terkait
  return list
    .filter(v => v.referenceType === referenceType && String(v.referenceId) === String(referenceId))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0] || null;
}

/**
 * Evaluasi konsistensi khusus untuk 1 record spesifik
 */
export function evaluateRecordConsistency(referenceType, record, fullDataset = null) {
  const errors = [];
  const warnings = [];

  if (!record) {
    errors.push({ type: 'INVALID_RECORD', severity: 'ERROR', message: 'Record referensi tidak valid / tidak ditemukan.' });
    return { isValid: false, canApprove: false, errors, warnings };
  }

  const dataset = fullDataset || getConsolidatedData(null);
  const consistency = dataset.consistency || runConsistencyCheck(dataset);

  const docNo = record.docNo || record.nir || record.dispatchNo || record.receiptDocNo || record.selectionNo || record.destructionNo || record.id;

  // Temukan error dan warning yang terkait langsung dengan dokumen ini
  consistency.errors.forEach(err => {
    if (err.docNo === docNo || (record.id && String(err.docNo).includes(String(record.id)))) {
      errors.push(err);
    }
  });

  consistency.warnings.forEach(warn => {
    if (warn.docNo === docNo || (record.id && String(warn.docNo).includes(String(record.id)))) {
      warnings.push(warn);
    }
  });

  // Validasi spesifik per tipe referensi
  if (referenceType === REFERENCE_TYPES.DISPATCH) {
    if (record.parentRequestId && !dataset.requests.some(r => r.id === record.parentRequestId || r.docNo === record.parentRequestId)) {
      if (!errors.some(e => e.type === 'ORPHAN_DISPATCH')) {
        errors.push({ type: 'ORPHAN_DISPATCH', severity: 'ERROR', message: `Parent Request (${record.parentRequestId}) tidak ditemukan.` });
      }
    }
  } else if (referenceType === REFERENCE_TYPES.RECEIPT) {
    if (record.dispatchId && !dataset.dispatches.some(d => d.id === record.dispatchId || d.docNo === record.dispatchId || d.dispatchNo === record.dispatchId)) {
      if (!errors.some(e => e.type === 'ORPHAN_RECEIPT')) {
        errors.push({ type: 'ORPHAN_RECEIPT', severity: 'ERROR', message: `Dispatch referensi (${record.dispatchId}) tidak ditemukan.` });
      }
    }
  } else if (referenceType === REFERENCE_TYPES.SELECTION || referenceType === REFERENCE_TYPES.DESTRUCTION) {
    const bId = record.batchId || record.batchCode || record.batchNo;
    const batchExists = dataset.batches.some(b => b.id === bId || b.batchCode === bId || b.batchNo === bId);
    if (bId && !batchExists) {
      if (!errors.some(e => e.type === 'INVALID_BATCH_REFERENCE')) {
        errors.push({ type: 'INVALID_BATCH_REFERENCE', severity: 'ERROR', message: `Batch ${bId} tidak terdaftar di nursery_batches.` });
      }
    }
  }

  const canApprove = errors.length === 0;

  return {
    isValid: errors.length === 0,
    canApprove,
    errors,
    warnings,
    docNo
  };
}

/**
 * Mengambil daftar record yang actionable (menunggu verifikasi) dalam scope ASB
 */
export function getActionableRecordsForAsb(currentUser, filters = {}) {
  const dataset = getConsolidatedData(currentUser);
  const verifications = getAllVerifications();

  // Map latest verification status per (type:id)
  const verifMap = new Map();
  verifications.forEach(v => {
    const key = `${v.referenceType}:${v.referenceId}`;
    if (!verifMap.has(key) || new Date(v.createdAt) > new Date(verifMap.get(key).createdAt)) {
      verifMap.set(key, v);
    }
  });

  const actionableList = [];

  const processRecords = (records, type) => {
    records.forEach(r => {
      const id = r.id || r.requestId || r.dispatchId || r.receiptId || r.selectionId || r.destructionId;
      const key = `${type}:${id}`;
      const latestVerif = verifMap.get(key);

      // Jika sudah diverifikasi final (TERVERIFIKASI), tidak actionable lagi
      if (latestVerif && latestVerif.verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI) {
        return;
      }

      const evalResult = evaluateRecordConsistency(type, r, dataset);
      const docNo = r.docNo || r.nir || r.dispatchNo || r.receiptDocNo || r.selectionNo || r.destructionNo || id;

      actionableList.push({
        referenceType: type,
        referenceId: id,
        referenceDocNo: docNo,
        rawRecord: r,
        estateId: r.targetEstateId || r.estateId || r.sourceEstateId || currentUser?.estateId,
        divisionId: r.targetDivisionId || r.divisionId || r.sourceDivisionId || currentUser?.divisionId,
        currentStatus: r.status || 'SUBMITTED',
        verificationStatus: latestVerif ? latestVerif.verificationStatus : VERIFICATION_STATUS.MENUNGGU_VERIFIKASI,
        latestVerification: latestVerif || null,
        canApprove: evalResult.canApprove,
        errors: evalResult.errors,
        warnings: evalResult.warnings,
        date: r.date || r.requestDate || r.dispatchDate || r.receiptDate || r.selectionDate || r.destructionDate || r.createdAt
      });
    });
  };

  if (!filters.referenceType || filters.referenceType === 'ALL' || filters.referenceType === REFERENCE_TYPES.REQUEST) {
    processRecords(dataset.requests, REFERENCE_TYPES.REQUEST);
  }
  if (!filters.referenceType || filters.referenceType === 'ALL' || filters.referenceType === REFERENCE_TYPES.DISPATCH) {
    processRecords(dataset.dispatches, REFERENCE_TYPES.DISPATCH);
  }
  if (!filters.referenceType || filters.referenceType === 'ALL' || filters.referenceType === REFERENCE_TYPES.RECEIPT) {
    processRecords(dataset.receipts, REFERENCE_TYPES.RECEIPT);
  }
  if (!filters.referenceType || filters.referenceType === 'ALL' || filters.referenceType === REFERENCE_TYPES.SELECTION) {
    processRecords(dataset.selections, REFERENCE_TYPES.SELECTION);
  }
  if (!filters.referenceType || filters.referenceType === 'ALL' || filters.referenceType === REFERENCE_TYPES.DESTRUCTION) {
    processRecords(dataset.destructions, REFERENCE_TYPES.DESTRUCTION);
  }

  // Filter tambahan
  return actionableList.filter(item => {
    if (filters.estateId && item.estateId !== filters.estateId) return false;
    if (filters.divisionId && item.divisionId !== filters.divisionId) return false;
    if (filters.status && filters.status !== 'ALL' && item.verificationStatus !== filters.status) return false;
    if (filters.severity) {
      if (filters.severity === 'ERROR' && item.errors.length === 0) return false;
      if (filters.severity === 'WARNING' && item.warnings.length === 0) return false;
      if (filters.severity === 'CLEAN' && (item.errors.length > 0 || item.warnings.length > 0)) return false;
    }
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase();
      const matchNo = item.referenceDocNo && String(item.referenceDocNo).toLowerCase().includes(kw);
      const matchType = item.referenceType.toLowerCase().includes(kw);
      if (!matchNo && !matchType) return false;
    }
    return true;
  });
}

/**
 * Menghitung jumlah record pending verifikasi untuk notifikasi red-dot
 */
export function getPendingVerificationCount(currentUser) {
  if (!currentUser) return 0;
  const list = getActionableRecordsForAsb(currentUser);
  return list.length;
}

/**
 * Mengambil riwayat verifikasi audit terfilter scope ASB
 */
export function getVerificationHistory(currentUser, filters = {}) {
  let list = getAllVerifications();

  if (currentUser) {
    const userEstateId = currentUser.estateId;
    const userDivisionId = currentUser.divisionId;

    list = list.filter(v => {
      if (userEstateId && v.estateId && v.estateId !== userEstateId) return false;
      if (userDivisionId && v.divisionId && v.divisionId !== userDivisionId) return false;
      return true;
    });
  }

  if (filters.referenceType && filters.referenceType !== 'ALL') {
    list = list.filter(v => v.referenceType === filters.referenceType);
  }
  if (filters.verificationStatus && filters.verificationStatus !== 'ALL') {
    list = list.filter(v => v.verificationStatus === filters.verificationStatus);
  }
  if (filters.dateFrom) {
    list = list.filter(v => (v.verifiedAt || v.createdAt) >= filters.dateFrom);
  }
  if (filters.dateTo) {
    list = list.filter(v => (v.verifiedAt || v.createdAt) <= `${filters.dateTo}T23:59:59.999Z`);
  }
  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase();
    list = list.filter(v => 
      (v.verificationNo && v.verificationNo.toLowerCase().includes(kw)) ||
      (v.referenceDocNo && v.referenceDocNo.toLowerCase().includes(kw)) ||
      (v.notes && v.notes.toLowerCase().includes(kw)) ||
      (v.returnReason && v.returnReason.toLowerCase().includes(kw))
    );
  }

  return list.sort((a, b) => new Date(b.verifiedAt || b.createdAt || 0) - new Date(a.verifiedAt || a.createdAt || 0));
}

/**
 * Helper generate nomor verifikasi canonical
 */
function generateVerificationNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `VRF-${y}${m}${d}-${rand}`;
}

/**
 * Helper mencari source transaction record
 */
function findSourceRecord(referenceType, referenceId) {
  let storeKey = '';
  switch (referenceType) {
    case REFERENCE_TYPES.REQUEST:
      storeKey = 'requests_transactions';
      break;
    case REFERENCE_TYPES.DISPATCH:
      storeKey = 'dispatch_transactions';
      break;
    case REFERENCE_TYPES.RECEIPT:
      storeKey = 'receipt_ksp_transactions';
      break;
    case REFERENCE_TYPES.SELECTION:
      storeKey = 'selection_transactions';
      break;
    case REFERENCE_TYPES.DESTRUCTION:
      storeKey = 'destruction_transactions';
      break;
    default:
      return null;
  }

  const items = storage.get(storeKey, []);
  return items.find(item => String(item.id || item.requestId || item.dispatchId || item.receiptId || item.selectionId || item.destructionId) === String(referenceId)) || null;
}

/**
 * APPROVAL VERIFIKASI (approveVerification)
 * Menyetujui hasil konsolidasi data dan mencatat keputusan audit
 */
export function approveVerification({ referenceType, referenceId, notes = '', currentUser }) {
  if (!referenceType || !referenceId) {
    throw new Error('referenceType dan referenceId wajib disertakan.');
  }

  if (!currentUser) {
    throw new Error('Otorisasi gagal: User aktif tidak ditemukan.');
  }

  // 1. Ambil source record
  const sourceRecord = findSourceRecord(referenceType, referenceId);
  if (!sourceRecord) {
    throw new Error(`Data transaksi sumber tidak ditemukan (${referenceType}:${referenceId}).`);
  }

  // 2. Scope validation
  const recordEstateId = sourceRecord.targetEstateId || sourceRecord.estateId || sourceRecord.sourceEstateId;
  const recordDivisionId = sourceRecord.targetDivisionId || sourceRecord.divisionId || sourceRecord.sourceDivisionId;
  if (currentUser.estateId && recordEstateId && recordEstateId !== currentUser.estateId) {
    throw new Error(`Akses ditolak: Dokumen berada di luar lingkup estate user (${recordEstateId} vs ${currentUser.estateId}).`);
  }
  if (currentUser.divisionId && recordDivisionId && recordDivisionId !== currentUser.divisionId) {
    throw new Error(`Akses ditolak: Dokumen berada di luar lingkup divisi user (${recordDivisionId} vs ${currentUser.divisionId}).`);
  }

  // 3. Cek apakah sudah terverifikasi final
  const existingVerif = getVerificationByReference(referenceType, referenceId);
  if (existingVerif && existingVerif.verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI) {
    throw new Error(`Dokumen ini sudah diverifikasi sebelumnya dengan No: ${existingVerif.verificationNo}.`);
  }

  // 4. CONSISTENCY GATE: Check for ERROR
  const dataset = getConsolidatedData(currentUser);
  const evalResult = evaluateRecordConsistency(referenceType, sourceRecord, dataset);
  if (!evalResult.canApprove || evalResult.errors.length > 0) {
    const errorMsg = evalResult.errors.map(e => e.message).join('; ');
    throw new Error(`Verifikasi diblokir oleh Konsistensi Gate (ERROR): ${errorMsg}`);
  }

  // 5. Build Audit Record
  const docNo = sourceRecord.docNo || sourceRecord.nir || sourceRecord.dispatchNo || sourceRecord.receiptDocNo || sourceRecord.selectionNo || sourceRecord.destructionNo || referenceId;
  const verificationId = `VRF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const verificationNo = generateVerificationNo();
  const nowIso = new Date().toISOString();

  const auditRecord = {
    verificationId,
    verificationNo,
    referenceType,
    referenceId,
    referenceDocNo: docNo,
    estateId: recordEstateId || currentUser.estateId,
    divisionId: recordDivisionId || currentUser.divisionId,
    verificationStatus: VERIFICATION_STATUS.TERVERIFIKASI,
    findings: evalResult.warnings.map(w => w.message || w),
    notes: (notes || '').trim(),
    verifiedByUserId: currentUser.userId || currentUser.id || 'ANONYMOUS',
    verifiedByName: currentUser.name || currentUser.fullName || 'Asisten Bibitan',
    verifiedByRole: currentUser.role || ROLES.ASISTEN_BIBITAN,
    verifiedAt: nowIso,
    returnReason: null,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  // 6. Simpan ke verification_transactions (ZERO STOCK MUTATION)
  const currentVerifs = storage.get(VERIFICATION_STORAGE_KEY, []);
  currentVerifs.push(auditRecord);
  storage.set(VERIFICATION_STORAGE_KEY, currentVerifs);

  return auditRecord;
}

/**
 * RETURN VERIFIKASI (returnVerification)
 * Mengembalikan data transaksi untuk perbaikan dengan alasan wajib
 */
export function returnVerification({ referenceType, referenceId, returnReason, notes = '', currentUser }) {
  if (!referenceType || !referenceId) {
    throw new Error('referenceType dan referenceId wajib disertakan.');
  }

  if (!returnReason || !returnReason.trim()) {
    throw new Error('Alasan pengembalian (returnReason) wajib diisi.');
  }

  if (!currentUser) {
    throw new Error('Otorisasi gagal: User aktif tidak ditemukan.');
  }

  // 1. Ambil source record
  const sourceRecord = findSourceRecord(referenceType, referenceId);
  if (!sourceRecord) {
    throw new Error(`Data transaksi sumber tidak ditemukan (${referenceType}:${referenceId}).`);
  }

  // 2. Scope validation
  const recordEstateId = sourceRecord.targetEstateId || sourceRecord.estateId || sourceRecord.sourceEstateId;
  const recordDivisionId = sourceRecord.targetDivisionId || sourceRecord.divisionId || sourceRecord.sourceDivisionId;
  if (currentUser.estateId && recordEstateId && recordEstateId !== currentUser.estateId) {
    throw new Error(`Akses ditolak: Dokumen berada di luar lingkup estate user (${recordEstateId} vs ${currentUser.estateId}).`);
  }
  if (currentUser.divisionId && recordDivisionId && recordDivisionId !== currentUser.divisionId) {
    throw new Error(`Akses ditolak: Dokumen berada di luar lingkup divisi user (${recordDivisionId} vs ${currentUser.divisionId}).`);
  }

  // 3. Consistency Findings Snapshot
  const dataset = getConsolidatedData(currentUser);
  const evalResult = evaluateRecordConsistency(referenceType, sourceRecord, dataset);
  const allFindings = evalResult.errors.concat(evalResult.warnings).map(f => f.message || f);

  // 4. Build Audit Record
  const docNo = sourceRecord.docNo || sourceRecord.nir || sourceRecord.dispatchNo || sourceRecord.receiptDocNo || sourceRecord.selectionNo || sourceRecord.destructionNo || referenceId;
  const verificationId = `VRF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const verificationNo = generateVerificationNo();
  const nowIso = new Date().toISOString();

  const auditRecord = {
    verificationId,
    verificationNo,
    referenceType,
    referenceId,
    referenceDocNo: docNo,
    estateId: recordEstateId || currentUser.estateId,
    divisionId: recordDivisionId || currentUser.divisionId,
    verificationStatus: VERIFICATION_STATUS.DIKEMBALIKAN,
    findings: allFindings,
    notes: (notes || '').trim(),
    returnReason: returnReason.trim(),
    verifiedByUserId: currentUser.userId || currentUser.id || 'ANONYMOUS',
    verifiedByName: currentUser.name || currentUser.fullName || 'Asisten Bibitan',
    verifiedByRole: currentUser.role || ROLES.ASISTEN_BIBITAN,
    verifiedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  // 5. Simpan ke verification_transactions (ZERO STOCK MUTATION)
  const currentVerifs = storage.get(VERIFICATION_STORAGE_KEY, []);
  currentVerifs.push(auditRecord);
  storage.set(VERIFICATION_STORAGE_KEY, currentVerifs);

  return auditRecord;
}
