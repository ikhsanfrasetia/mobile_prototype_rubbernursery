/**
 * js/modules/verification/verification-manager.js
 * Engine Verifikasi Data Transaksi Pembibitan untuk ASISTEN_BIBITAN (TASK ASB Redesign)
 * 
 * Prinsip:
 * - Layer pemeriksaan audit final atas transaksi yang dikirim oleh Mantri via Central Hub
 * - ZERO STOCK MUTATION: Tidak mengubah availableQty, currentQty, atau status batch
 * - Consistency Gate: Pengecekan konsistensi data sebelum approval
 * - Scope Isolation: ROLE AKTIF (ASISTEN_BIBITAN) + ESTATE AKTIF + DIVISI AKTIF
 * - 10 Modul Operasional: Presensi, Penerimaan, Penyemaian, Okulasi, Pemeriksaan, Penyeleksian, Kebun Entres, Material, Rekam Pemeliharaan, Pengeluaran
 * - Source Utama Verifikasi: verification_transactions
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
  DATA_TERKONFIRMASI: 'DATA TERKONFIRMASI',
  DIKEMBALIKAN: 'DIKEMBALIKAN',
  MENUNGGU_VERIFIKASI: 'MENUNGGU_VERIFIKASI'
});

export const REFERENCE_TYPES = Object.freeze({
  REQUEST: 'REQUEST',
  DISPATCH: 'DISPATCH',
  RECEIPT: 'RECEIPT',
  SELECTION: 'SELECTION',
  DESTRUCTION: 'DESTRUCTION',
  TIDAK_HADIR: 'TIDAK_HADIR',
  PENYEMAIAN: 'PENYEMAIAN',
  DEDERAN: 'DEDERAN',
  MENUNAS: 'MENUNAS',
  TOPPING: 'TOPPING',
  OKULASI: 'OKULASI',
  PEMERIKSAAN: 'PEMERIKSAAN',
  PEMERIKSAAN_DEDERAN: 'PEMERIKSAAN_DEDERAN',
  SELEKSI_PRA_OKULASI: 'SELEKSI_PRA_OKULASI',
  PENYELEKSIAN: 'PENYELEKSIAN',
  PEMELIHARAAN: 'PEMELIHARAAN',
  PENGELUARAN: 'PENGELUARAN',
  MATERIAL: 'MATERIAL',
  SIMULASI_GUDANG: 'SIMULASI_GUDANG'
});

/**
 * Permintaan (REQUEST) TIDAK masuk Verifikasi Data.
 * Penerimaan dan Pengeluaran MASUK ke Verifikasi setelah disubmit melalui Central Hub.
 */
export const LOGISTICS_TYPES = Object.freeze([
  'REQUEST'
]);

/**
 * 10 Canonical Modules untuk Workspace Verifikasi
 */
export const VERIFICATION_10_MODULES = Object.freeze([
  {
    id: 'TIDAK_HADIR',
    label: 'Tidak Hadir',
    types: ['TIDAK_HADIR'],
    iconName: 'team',
    order: 1
  },
  {
    id: 'PENERIMAAN',
    label: 'Penerimaan',
    types: ['PENERIMAAN', 'RECEIPT'],
    iconName: 'documentPlus',
    order: 2
  },
  {
    id: 'PENYEMAIAN',
    label: 'Penyemaian',
    types: ['PENYEMAIAN', 'DEDERAN', 'SEEDING'],
    iconName: 'sprout',
    order: 3
  },
  {
    id: 'OKULASI',
    label: 'Okulasi',
    types: ['OKULASI', 'BUDDING'],
    iconName: 'scissors',
    order: 4
  },
  {
    id: 'PEMERIKSAAN',
    label: 'Pemeriksaan',
    types: ['PEMERIKSAAN', 'PEMERIKSAAN_DEDERAN', 'INSPECTION'],
    iconName: 'documentSearch',
    order: 5
  },
  {
    id: 'PENYELEKSIAN',
    label: 'Penyeleksian',
    types: ['PENYELEKSIAN', 'SELEKSI_PRA_OKULASI', 'SELECTION'],
    iconName: 'leafCheck',
    order: 6
  },
  {
    id: 'KEBUN_ENTRES',
    label: 'Kebun Entres',
    types: ['KEBUN_ENTRES', 'ENTRES', 'MENUNAS', 'TOPPING'],
    iconName: 'tree',
    order: 7
  },
  {
    id: 'MATERIAL',
    label: 'Material',
    types: ['MATERIAL', 'SIMULASI_GUDANG'],
    iconName: 'material',
    order: 8
  },
  {
    id: 'REKAM_PEMELIHARAAN',
    label: 'Rekam Pemeliharaan',
    types: ['REKAM_PEMELIHARAAN', 'PEMELIHARAAN', 'NURSERY_ACTIVITY'],
    iconName: 'plantCare',
    order: 9
  },
  {
    id: 'PENGELUARAN',
    label: 'Pengeluaran',
    types: ['PENGELUARAN', 'DISPATCH'],
    iconName: 'dispatch',
    order: 10
  }
]);

/**
 * Label display untuk setiap referenceType
 */
export const REFERENCE_TYPE_LABELS = Object.freeze({
  TIDAK_HADIR: 'Tidak Hadir',
  PENYEMAIAN: 'Penyemaian',
  DEDERAN: 'Dederan (Germinasi)',
  MENUNAS: 'Menunas',
  TOPPING: 'Topping',
  OKULASI: 'Okulasi',
  PEMERIKSAAN: 'Pemeriksaan Okulasi',
  PEMERIKSAAN_DEDERAN: 'Pemeriksaan Dederan',
  SELEKSI_PRA_OKULASI: 'Seleksi Pra-Okulasi',
  PENYELEKSIAN: 'Penyeleksian Bibit',
  PEMELIHARAAN: 'Rekam Pemeliharaan',
  MATERIAL: 'Material & Bahan',
  SIMULASI_GUDANG: 'Simulasi Issue Gudang',
  REQUEST: 'Permintaan (SPB)',
  DISPATCH: 'Pengeluaran (Dispatch)',
  RECEIPT: 'Penerimaan KSP',
  SELECTION: 'Hasil Seleksi',
  DESTRUCTION: 'Pemusnahan Bibit',
  PENGELUARAN: 'Pengeluaran Bibit',
  PENERIMAAN: 'Penerimaan Bibit',
  KEBUN_ENTRES: 'Kebun Entres',
  REKAM_PEMELIHARAAN: 'Rekam Pemeliharaan'
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
  return list
    .filter(v => v.referenceType === referenceType && String(v.referenceId) === String(referenceId))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0] || null;
}

/**
 * Helper mencari source transaction record dan storage key-nya dengan EXACT MATCH referenceType scope
 * 
 * Priority:
 * 1. referenceType + referenceId
 * Fallback:
 * 2. referenceType + source.id
 * 3. referenceType + source.docNo
 * 4. referenceType + source.nir
 * 5. referenceType + source.referenceDocNo
 */
export function findSourceRecord(referenceType, referenceId) {
  if (!referenceType || !referenceId) return null;

  const typeMap = {
    TIDAK_HADIR: 'virtual_tidak_hadir',
    PENERIMAAN: 'receipt_ksp_transactions',
    RECEIPT: 'receipt_ksp_transactions',
    PENYEMAIAN: 'seeding_transactions',
    SEEDING: 'seeding_transactions',
    DEDERAN: 'dederan_transactions',
    OKULASI: 'budding_transactions',
    BUDDING: 'budding_transactions',
    PEMERIKSAAN: 'inspection_transactions',
    INSPECTION: 'inspection_transactions',
    PEMERIKSAAN_DEDERAN: 'dederan_inspections',
    PENYELEKSIAN: 'selection_transactions',
    SELECTION: 'selection_transactions',
    SELEKSI_PRA_OKULASI: 'pre_grafting_selection_documents',
    KEBUN_ENTRES: 'entres_topping_transactions',
    ENTRES: 'entres_topping_transactions',
    MENUNAS: 'entres_menunas_transactions',
    TOPPING: 'entres_topping_transactions',
    MATERIAL: 'material_usage_transactions',
    SIMULASI_GUDANG: 'warehouse_issue_simulations',
    REKAM_PEMELIHARAAN: 'nursery_activity_transactions',
    PEMELIHARAAN: 'nursery_activity_transactions',
    NURSERY_ACTIVITY: 'nursery_activity_transactions',
    PENGELUARAN: 'dispatch_transactions',
    DISPATCH: 'dispatch_transactions',
    REQUEST: 'requests_transactions',
    DESTRUCTION: 'destruction_transactions'
  };

  const storeKey = typeMap[referenceType];
  if (!storeKey) return null;

  const items = storage.get(storeKey, []);
  const targetId = String(referenceId);

  // 1. Exact match by id/referenceId
  let match = items.find(item => String(item.id || item.requestId || item.dispatchId || item.receiptId || item.selectionId || item.destructionId || '') === targetId);
  if (match) return { ...match, _storeKey: storeKey };

  // 2. Fallback: match by docNo
  match = items.find(item => String(item.docNo || '') === targetId);
  if (match) return { ...match, _storeKey: storeKey };

  // 3. Fallback: match by nir
  match = items.find(item => String(item.nir || '') === targetId);
  if (match) return { ...match, _storeKey: storeKey };

  // 4. Fallback: match by referenceDocNo / selectionNo / dispatchNo / receiptDocNo / destructionNo
  match = items.find(item => String(item.referenceDocNo || item.selectionNo || item.dispatchNo || item.receiptDocNo || item.destructionNo || '') === targetId);
  if (match) return { ...match, _storeKey: storeKey };

  return null;
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

  const docNo = record.docNo || record.nir || record.dispatchNo || record.receiptDocNo || record.selectionNo || record.destructionNo || record.id;

  // Validasi spesifik per tipe referensi
  if (referenceType === REFERENCE_TYPES.DISPATCH || referenceType === 'PENGELUARAN') {
    const dataset = fullDataset || getConsolidatedData(null);
    if (record.parentRequestId && !dataset.requests.some(r => r.id === record.parentRequestId || r.docNo === record.parentRequestId)) {
      errors.push({ type: 'ORPHAN_DISPATCH', severity: 'ERROR', message: `Parent Request (${record.parentRequestId}) tidak ditemukan.` });
    }
  } else if (referenceType === REFERENCE_TYPES.RECEIPT || referenceType === 'PENERIMAAN') {
    const dataset = fullDataset || getConsolidatedData(null);
    if (record.dispatchId && !dataset.dispatches.some(d => d.id === record.dispatchId || d.docNo === record.dispatchId || d.dispatchNo === record.dispatchId)) {
      errors.push({ type: 'ORPHAN_RECEIPT', severity: 'ERROR', message: `Dispatch referensi (${record.dispatchId}) tidak ditemukan.` });
    }
  } else if (referenceType === REFERENCE_TYPES.SELECTION || referenceType === REFERENCE_TYPES.DESTRUCTION || referenceType === 'PENYELEKSIAN') {
    const dataset = fullDataset || getConsolidatedData(null);
    const bId = record.batchId || record.batchCode || record.batchNo;
    const batchExists = dataset.batches.some(b => b.id === bId || b.batchCode === bId || b.batchNo === bId);
    if (bId && !batchExists) {
      errors.push({ type: 'INVALID_BATCH_REFERENCE', severity: 'ERROR', message: `Batch ${bId} tidak terdaftar di nursery_batches.` });
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
 * Mengambil daftar record yang actionable (menunggu verifikasi) dalam scope ASB.
 * 
 * SOURCE: verification_transactions
 * FILTER: ROLE AKTIF (ASISTEN_BIBITAN) + ESTATE AKTIF + DIVISI AKTIF
 * EXCLUDE: REQUEST
 */
export function getActionableRecordsForAsb(currentUser, filters = {}) {
  const allVerifRecords = getAllVerifications();

  // Deduplicate: ambil verifikasi terbaru per (referenceType:referenceId)
  const latestMap = new Map();
  allVerifRecords.forEach(v => {
    const key = `${v.referenceType}:${v.referenceId}`;
    if (!latestMap.has(key) || new Date(v.createdAt || v.submittedAt || 0) > new Date(latestMap.get(key).createdAt || latestMap.get(key).submittedAt || 0)) {
      latestMap.set(key, v);
    }
  });

  const actionableList = [];

  latestMap.forEach((verifRecord) => {
    const refType = verifRecord.referenceType;
    const refId = verifRecord.referenceId;

    // 1. Exclude logistics types (REQUEST)
    if (LOGISTICS_TYPES.includes(refType)) return;

    // 2. Jika sudah TERVERIFIKASI final, tidak actionable lagi untuk pending
    if (verifRecord.verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI || verifRecord.verificationStatus === VERIFICATION_STATUS.DATA_TERKONFIRMASI) return;

    // 3. Resolve source record untuk enrichment & scope check
    const sourceRecord = findSourceRecord(refType, refId);
    const rawRecord = sourceRecord || verifRecord;

    const estateId = verifRecord.estateId || rawRecord.targetEstateId || rawRecord.estateId || rawRecord.sourceEstateId;
    const divisionId = verifRecord.divisionId || rawRecord.targetDivisionId || rawRecord.divisionId || rawRecord.sourceDivisionId;
    const docNo = verifRecord.referenceDocNo || rawRecord.docNo || rawRecord.id || refId;

    // 4. ROLE + ESTATE + DIVISION ISOLATION
    if (currentUser?.role && normalizeRole(currentUser.role) === ROLES.ASISTEN_BIBITAN) {
      if (currentUser.estateId && estateId && estateId !== currentUser.estateId) return;
      if (currentUser.divisionId && divisionId && divisionId !== currentUser.divisionId) return;
    } else if (currentUser?.estateId && estateId && estateId !== currentUser.estateId) {
      return;
    }

    // 5. Evaluate consistency
    let evalResult = { canApprove: true, errors: [], warnings: [] };
    if (sourceRecord) {
      try {
        evalResult = evaluateRecordConsistency(refType, sourceRecord);
      } catch (_) {
        // Operational types default to clean
      }
    }

    // 6. Extract date
    const dateValue = rawRecord.date || rawRecord.tanggal || rawRecord.tanggalSeleksi || rawRecord.tanggalDeder ||
      rawRecord.tanggalOkulasi || rawRecord.tanggalPemeriksaan || rawRecord.tanggalTopping || rawRecord.tanggalTunas ||
      rawRecord.activityDate || rawRecord.attendanceDate || rawRecord.dispatchDate || rawRecord.receiptDate ||
      verifRecord.submittedAt || verifRecord.createdAt;

    // 7. Find canonical module category
    const matchedModule = VERIFICATION_10_MODULES.find(m => m.types.includes(refType) || m.id === refType);
    const moduleCategory = matchedModule ? matchedModule.id : refType;

    actionableList.push({
      referenceType: refType,
      referenceId: refId,
      referenceDocNo: docNo,
      moduleCategory,
      rawRecord: sourceRecord || rawRecord,
      estateId,
      divisionId,
      currentStatus: rawRecord.status || verifRecord.verificationStatus || 'SUBMITTED',
      verificationStatus: verifRecord.verificationStatus || VERIFICATION_STATUS.MENUNGGU_VERIFIKASI,
      latestVerification: verifRecord,
      canApprove: evalResult.canApprove,
      errors: evalResult.errors,
      warnings: evalResult.warnings,
      date: dateValue,
      submittedByName: verifRecord.submittedByName || rawRecord.mantri || rawRecord.submittedByName || 'Mantri Bibitan',
      submittedAt: verifRecord.submittedAt || verifRecord.createdAt
    });
  });

  // Filter tambahan jika ada
  return actionableList.filter(item => {
    if (filters.estateId && item.estateId !== filters.estateId) return false;
    if (filters.divisionId && item.divisionId !== filters.divisionId) return false;
    if (filters.moduleCategory && filters.moduleCategory !== 'ALL' && item.moduleCategory !== filters.moduleCategory) return false;
    if (filters.referenceType && filters.referenceType !== 'ALL' && item.referenceType !== filters.referenceType) return false;
    if (filters.status && filters.status !== 'ALL' && item.verificationStatus !== filters.status) return false;
    if (filters.date) {
      const itemDateStr = String(item.date || '').substring(0, 10);
      const filterDateStr = String(filters.date).substring(0, 10);
      if (itemDateStr && filterDateStr && !itemDateStr.includes(filterDateStr) && !filterDateStr.includes(itemDateStr)) return false;
    }
    return true;
  });
}

/**
 * Menghitung jumlah record pending verifikasi untuk notifikasi
 */
export function getPendingVerificationCount(currentUser) {
  if (!currentUser) return 0;
  const list = getActionableRecordsForAsb(currentUser);
  return list.length;
}

/**
 * Mengambil transaksi yang sudah terverifikasi dalam scope ASB
 */
export function getVerifiedTransactionsByScope(currentUser, filters = {}) {
  const allVerifRecords = getAllVerifications();

  const userEstateId = currentUser?.estateId;
  const userDivisionId = currentUser?.divisionId;

  return allVerifRecords.filter(v => {
    // Exclude REQUEST
    if (LOGISTICS_TYPES.includes(v.referenceType)) return false;

    // Only TERVERIFIKASI or DATA TERKONFIRMASI
    if (v.verificationStatus !== VERIFICATION_STATUS.TERVERIFIKASI && v.verificationStatus !== VERIFICATION_STATUS.DATA_TERKONFIRMASI) return false;

    // Scope check
    if (userEstateId && v.estateId && v.estateId !== userEstateId) return false;
    if (userDivisionId && v.divisionId && v.divisionId !== userDivisionId) return false;

    // Period check if specified
    if (filters.periodDate) {
      const vDate = v.verifiedAt || v.createdAt || '';
      if (!vDate.includes(filters.periodDate)) return false;
    }

    return true;
  }).map(v => {
    const sourceRecord = findSourceRecord(v.referenceType, v.referenceId);
    const matchedModule = VERIFICATION_10_MODULES.find(m => m.types.includes(v.referenceType) || m.id === v.referenceType);
    return {
      ...v,
      moduleCategory: matchedModule ? matchedModule.id : v.referenceType,
      rawRecord: sourceRecord || v
    };
  });
}

/**
 * Ringkasan 10 Modul untuk Tinjau Data Hari Ini
 */
export function get10ModulesSummary(currentUser, periodDate = null) {
  const verifiedList = getVerifiedTransactionsByScope(currentUser, { periodDate });
  const pendingList = getActionableRecordsForAsb(currentUser, { date: periodDate });

  return VERIFICATION_10_MODULES.map(mod => {
    const modVerified = verifiedList.filter(v => mod.types.includes(v.referenceType) || v.moduleCategory === mod.id);
    const modPending = pendingList.filter(p => mod.types.includes(p.referenceType) || p.moduleCategory === mod.id);

    return {
      id: mod.id,
      label: mod.label,
      verifiedCount: modVerified.length,
      pendingCount: modPending.length,
      verifiedItems: modVerified,
      pendingItems: modPending,
      isComplete: modPending.length === 0
    };
  });
}

/**
 * Cek apakah Tinjau Data Hari Ini sudah siap dikirim ke server
 */
export function canSubmitFinalVerificationToServer(currentUser, periodDate = null) {
  const pendingList = getActionableRecordsForAsb(currentUser, { date: periodDate });
  const verifiedList = getVerifiedTransactionsByScope(currentUser, { periodDate });

  // Harus ada transaksi terverifikasi dan TIDAK ada transaksi yang masih pending/revision
  return verifiedList.length > 0 && pendingList.length === 0;
}

/**
 * Kirim Data ke Server (Final submit pada Tinjau Data Hari Ini)
 */
export function submitFinalVerificationToServer(currentUser, periodDate = null) {
  if (!canSubmitFinalVerificationToServer(currentUser, periodDate)) {
    throw new Error('Pengiriman ke server belum dapat dilakukan: Masih ada transaksi yang belum selesai diverifikasi.');
  }

  const allVerifs = getAllVerifications();
  const nowIso = new Date().toISOString();
  let updatedCount = 0;

  allVerifs.forEach(v => {
    if (v.verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI || v.verificationStatus === VERIFICATION_STATUS.DATA_TERKONFIRMASI) {
      if (currentUser?.estateId && v.estateId && v.estateId !== currentUser.estateId) return;
      if (currentUser?.divisionId && v.divisionId && v.divisionId !== currentUser.divisionId) return;

      v.serverSyncStatus = 'SYNCED';
      v.syncedAt = nowIso;
      v.syncedByUserId = currentUser?.userId || currentUser?.id;
      v.syncedByName = currentUser?.name || 'Asisten Bibitan';
      updatedCount++;
    }
  });

  storage.set(VERIFICATION_STORAGE_KEY, allVerifs);

  return {
    success: true,
    syncedCount: updatedCount,
    syncedAt: nowIso,
    message: `Sebanyak ${updatedCount} transaksi terverifikasi berhasil dikirim ke server.`
  };
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
 * APPROVAL VERIFIKASI (approveVerification)
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

  // 4. CONSISTENCY GATE
  const evalResult = evaluateRecordConsistency(referenceType, sourceRecord);
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
    verificationStatus: referenceType === 'TIDAK_HADIR' ? VERIFICATION_STATUS.DATA_TERKONFIRMASI : VERIFICATION_STATUS.TERVERIFIKASI,
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

  // 6. Simpan / perbarui di verification_transactions
  const currentVerifs = storage.get(VERIFICATION_STORAGE_KEY, []);
  const existIdx = currentVerifs.findIndex(v =>
    (v.referenceType === referenceType && String(v.referenceId) === String(referenceId)) ||
    (v.referenceDocNo && String(v.referenceDocNo) === String(docNo))
  );

  if (existIdx !== -1) {
    currentVerifs[existIdx] = {
      ...currentVerifs[existIdx],
      ...auditRecord,
      verificationNo: currentVerifs[existIdx].verificationNo || verificationNo
    };
  } else {
    currentVerifs.push(auditRecord);
  }
  storage.set(VERIFICATION_STORAGE_KEY, currentVerifs);

  // 7. Update status pada raw source record jika ada storeKey
  if (sourceRecord._storeKey) {
    const records = storage.get(sourceRecord._storeKey, []);
    const idx = records.findIndex(r => String(r.id || r.docNo || '') === String(referenceId));
    if (idx !== -1) {
      records[idx].status = referenceType === 'TIDAK_HADIR' ? 'TERKONFIRMASI' : 'DISETUJUI';
      records[idx].isFinal = true;
      records[idx].verificationStatus = referenceType === 'TIDAK_HADIR' ? VERIFICATION_STATUS.DATA_TERKONFIRMASI : VERIFICATION_STATUS.TERVERIFIKASI;
      records[idx].verifiedAt = nowIso;
      records[idx].verifiedByUserId = currentUser.userId || currentUser.id;
      records[idx].verifiedByName = currentUser.name || 'Asisten Bibitan';
      storage.set(sourceRecord._storeKey, records);
    }
  }

  return auditRecord;
}

/**
 * RETURN VERIFIKASI (returnVerification)
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

  // 1.5 Cegah Return untuk TIDAK_HADIR
  if (referenceType === 'TIDAK_HADIR') {
    throw new Error('Dokumen Tidak Hadir tidak dapat dikembalikan (Return). Hanya dapat diverifikasi.');
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
  const evalResult = evaluateRecordConsistency(referenceType, sourceRecord);
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

  // 5. Simpan / perbarui ke verification_transactions (ZERO STOCK MUTATION)
  const currentVerifs = storage.get(VERIFICATION_STORAGE_KEY, []);
  const existIdx = currentVerifs.findIndex(v =>
    (v.referenceType === referenceType && String(v.referenceId) === String(referenceId)) ||
    (v.referenceDocNo && String(v.referenceDocNo) === String(docNo))
  );

  if (existIdx !== -1) {
    currentVerifs[existIdx] = {
      ...currentVerifs[existIdx],
      ...auditRecord,
      verificationNo: currentVerifs[existIdx].verificationNo || verificationNo
    };
  } else {
    currentVerifs.push(auditRecord);
  }
  storage.set(VERIFICATION_STORAGE_KEY, currentVerifs);

  // 6. Update status raw record menjadi REVISION / DIKEMBALIKAN
  if (sourceRecord._storeKey) {
    const records = storage.get(sourceRecord._storeKey, []);
    const idx = records.findIndex(r => String(r.id || r.docNo || '') === String(referenceId));
    if (idx !== -1) {
      records[idx].status = 'DIKEMBALIKAN';
      records[idx].verificationStatus = VERIFICATION_STATUS.DIKEMBALIKAN;
      records[idx].returnReason = returnReason.trim();
      records[idx].returnedAt = nowIso;
      storage.set(sourceRecord._storeKey, records);
    }
  }

  return auditRecord;
}
