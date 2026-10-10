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
import { session } from '../../core/session.js';
import { normalizeRole, ROLES, getCurrentUserContext, resolveUserContext } from '../../core/user-context.js';
import { getConsolidatedData, runConsistencyCheck, buildTraceabilityChain } from '../consolidation/consolidation-manager.js';
import { getAllBatches } from '../../data/batch-master.js';
import { getAllBedengan } from '../../data/bedengan-master.js';
import { getProgramById } from '../../data/program-master.js';
import { getEstateById } from '../../data/estate-master.js';
import { getWorkersForUserContext } from '../../data/worker-master.js';
import {
  getSelectionStageLabel,
  createSelection2DocumentFromSelection1,
  createSelection3DocumentFromSelection2,
  validateSelectionTransactionAgainstSource,
  getActionableSelectionCount,
  syncAllSeedingsToPreGraftingSelectionDocuments
} from '../selection/selection-manager.js';
import { getInspectionChronologicalMaxAllowed, syncAllDederanRejectionsToSelectionPool } from '../seeding/dederan-manager.js';

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
    types: ['TIDAK_HADIR', 'PRESENSI'],
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
  PRESENSI: 'Presensi',
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
 * Canonical Storage Map per Reference Type
 */
export const CANONICAL_STORAGE_MAP = Object.freeze({
  TIDAK_HADIR: ['virtual_tidak_hadir'],
  PRESENSI: ['attendance_transactions'],
  PENERIMAAN: ['receipt_ksp_transactions', 'penerimaan_biji_records', 'receipt_transactions'],
  RECEIPT: ['receipt_ksp_transactions', 'penerimaan_biji_records', 'receipt_transactions'],
  PENYEMAIAN: ['seeding_transactions'],
  SEEDING: ['seeding_transactions'],
  DEDERAN: ['dederan_transactions'],
  OKULASI: ['budding_transactions'],
  BUDDING: ['budding_transactions'],
  PEMERIKSAAN: ['inspection_transactions'],
  INSPECTION: ['inspection_transactions'],
  PEMERIKSAAN_DEDERAN: ['dederan_inspections'],
  PENYELEKSIAN: ['selection_transactions'],
  SELECTION: ['selection_transactions'],
  SELEKSI_PRA_OKULASI: ['pre_grafting_selection_documents'],
  KEBUN_ENTRES: ['entres_topping_transactions', 'entres_menunas_transactions', 'entres_transactions'],
  ENTRES: ['entres_topping_transactions', 'entres_menunas_transactions', 'entres_transactions'],
  MENUNAS: ['entres_menunas_transactions', 'entres_transactions'],
  TOPPING: ['entres_topping_transactions', 'entres_transactions'],
  MATERIAL: ['seeding_transactions', 'material_usage_transactions'],
  SIMULASI_GUDANG: ['warehouse_issue_simulations'],
  REKAM_PEMELIHARAAN: ['nursery_activity_transactions', 'nursery_activity_records'],
  PEMELIHARAAN: ['nursery_activity_transactions', 'nursery_activity_records'],
  NURSERY_ACTIVITY: ['nursery_activity_transactions', 'nursery_activity_records'],
  PENGELUARAN: ['dispatch_transactions'],
  DISPATCH: ['dispatch_transactions'],
  DESTRUCTION: ['destruction_transactions'],
  REQUEST: ['requests_transactions']
});

/**
 * Helper: Safe number formatting yang aman terhadap null, undefined, numeric string, '-' (hyphen)
 */
export function formatSafeNumber(val, defaultFallback = '-') {
  if (val === undefined || val === null || val === '') return defaultFallback;
  if (val === '-') return '-';
  const n = Number(val);
  if (Number.isNaN(n)) return String(val);
  return n.toLocaleString('id-ID');
}

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
 * Deterministic Reconstruction untuk TIDAK_HADIR berdasarkan attendance_transactions
 */
export function resolveTidakHadirDeterministic(referenceId, userCtx = null) {
  if (!referenceId) return null;
  const targetId = String(referenceId);

  // Extract date from referenceId (e.g. ABSEN-02102026 -> 02/10/2026 or ABSEN-20261002)
  let dateStr = '';
  const m1 = targetId.match(/ABSEN-(\d{2})(\d{2})(\d{4})/i);
  if (m1) {
    dateStr = `${m1[1]}/${m1[2]}/${m1[3]}`;
  } else {
    const m2 = targetId.match(/ABSEN-(\d{4})(\d{2})(\d{2})/i);
    if (m2) {
      dateStr = `${m2[3]}/${m2[2]}/${m2[1]}`;
    }
  }

  const user = userCtx || getCurrentUserContext() || resolveUserContext();
  const storedAtts = storage.get('attendance_transactions', []);

  // Find attendance records matching the date and scope
  const matchingAtts = storedAtts.filter(a => {
    if (a.type !== 'WORKER' && a.attendanceType !== 'DATANG') return false;
    if (a.attendanceType && a.attendanceType !== 'DATANG') return false;

    if (dateStr) {
      const aDate = a.date || a.tanggal || a.attendanceDate || '';
      const normADate = aDate.includes('-') ? aDate.split('-').reverse().join('/') : aDate;
      if (normADate && !normADate.includes(dateStr) && !dateStr.includes(normADate)) return false;
    }

    if (user?.estateId && a.estateId && a.estateId !== user.estateId) return false;
    if (user?.divisionId && a.divisionId && a.divisionId !== user.divisionId) return false;
    return true;
  });

  if (matchingAtts.length > 0) {
    let scopedAll = [];
    try {
      scopedAll = getWorkersForUserContext(user, { activeOnly: false }) || [];
    } catch (_) {
      scopedAll = [];
    }

    const presentWorkerKeys = new Set();
    matchingAtts.forEach(a => {
      if (a.workerId) presentWorkerKeys.add(String(a.workerId));
      if (a.code) presentWorkerKeys.add(String(a.code));
      if (a.workerCode) presentWorkerKeys.add(String(a.workerCode));
    });

    const scopedAbsent = scopedAll.filter(
      w => w.status !== 'ACTIVE' || w.active === false || !!w.absentType
    );

    const activeUnchecked = scopedAll.filter(
      w =>
        (w.status === 'ACTIVE' && w.active !== false && !w.absentType) &&
        !presentWorkerKeys.has(String(w.id)) &&
        !presentWorkerKeys.has(String(w.code))
    );

    const absentWorkers = [...scopedAbsent, ...activeUnchecked];

    return {
      id: targetId,
      docNo: targetId,
      date: dateStr || matchingAtts[0]?.date || matchingAtts[0]?.tanggal || '-',
      type: 'TIDAK_HADIR',
      status: 'SUBMITTED',
      submittedByUserId: matchingAtts[0]?.createdByUserId || user?.id || user?.userId,
      submittedByName: matchingAtts[0]?.createdByName || user?.name || 'Mantri Bibitan',
      estateId: matchingAtts[0]?.estateId || user?.estateId,
      divisionId: matchingAtts[0]?.divisionId || user?.divisionId,
      totalAbsent: absentWorkers.length,
      detailPekerja: absentWorkers.map(w => ({
        workerId: w.id,
        name: w.name,
        code: w.code,
        absentType: w.absentType || 'C'
      })),
      _isDeterministic: true
    };
  }

  // Fallback: legacy read-only virtual_tidak_hadir
  const virtualList = storage.get('virtual_tidak_hadir', []);
  const vMatch = virtualList.find(item =>
    String(item.id || item.docNo || '') === targetId
  );
  if (vMatch) {
    return { ...vMatch, _storeKey: 'virtual_tidak_hadir' };
  }

  // Fallback default structure with "-" (guardrail: do not invent fake data)
  return {
    id: targetId,
    docNo: targetId,
    date: dateStr || '-',
    type: 'TIDAK_HADIR',
    status: 'SUBMITTED',
    submittedByName: 'Mantri Bibitan',
    estateId: user?.estateId || '-',
    divisionId: user?.divisionId || '-',
    totalAbsent: '-',
    detailPekerja: [],
    _isFallback: true
  };
}

/**
 * Helper mencari source transaction record dan storage key-nya dengan EXACT MATCH referenceType scope
 */
export function findSourceRecord(referenceType, referenceId, userCtx = null) {
  if (!referenceType || !referenceId) return null;
  const targetId = String(referenceId);

  // 1. TIDAK_HADIR special deterministic resolution
  if (referenceType === 'TIDAK_HADIR') {
    return resolveTidakHadirDeterministic(targetId, userCtx);
  }

  const storeKeys = CANONICAL_STORAGE_MAP[referenceType] || [];
  if (storeKeys.length === 0) return null;

  for (const storeKey of storeKeys) {
    const items = storage.get(storeKey, []);
    if (!Array.isArray(items) || items.length === 0) continue;

    // Filter by type if in mixed table like entres_transactions
    let filteredItems = items;
    if (storeKey === 'entres_transactions') {
      if (referenceType === 'MENUNAS') {
        filteredItems = items.filter(t => (t.activityType || t.type || '').toUpperCase() === 'MENUNAS');
      } else if (referenceType === 'TOPPING') {
        filteredItems = items.filter(t => (t.activityType || t.type || '').toUpperCase() === 'TOPPING');
      }
    }

    // 1. Exact match by primary IDs
    let match = filteredItems.find(item =>
      String(item.id || item.requestId || item.dispatchId || item.receiptId || item.selectionId || item.destructionId || '') === targetId
    );
    if (match) return { ...match, _storeKey: storeKey };

    // 2. Match by docNo / nomorDokumen / selectionDocNo / issueDocNo
    match = filteredItems.find(item =>
      String(item.docNo || item.nomorDokumen || item.selectionDocNo || item.issueDocNo || '') === targetId
    );
    if (match) return { ...match, _storeKey: storeKey };

    // 3. Match by nir
    match = filteredItems.find(item => String(item.nir || '') === targetId);
    if (match) return { ...match, _storeKey: storeKey };

    // 4. Match by referenceDocNo / selectionNo / dispatchNo / receiptDocNo / destructionNo
    match = filteredItems.find(item =>
      String(item.referenceDocNo || item.selectionNo || item.dispatchNo || item.receiptDocNo || item.destructionNo || '') === targetId
    );
    if (match) return { ...match, _storeKey: storeKey };
  }

  return null;
}

/**
 * Normalisasi data detail transaksi untuk List dan Detail view secara terpusat (Single Source of Truth)
 * Menghilangkan seluruh hardcoded fallback angka (500, 120, 300, 250, 1).
 */
export function getVerificationDetailData(sourceRecord, userCtx = null, referenceType = null) {
  const raw = sourceRecord || {};
  const refType = referenceType || raw.referenceType || raw.type || raw.moduleType || 'PENERIMAAN';
  const res = _computeVerificationDetailData(raw, userCtx, refType);
  if (res && typeof res === 'object') {
    res.returnReason = raw.returnReason || null;
    res.status = raw.status || raw.verificationStatus || null;
  }
  return res;
}

function _computeVerificationDetailData(raw, userCtx = null, refType = 'PENERIMAAN') {
  switch (refType) {
    case 'TIDAK_HADIR': {
      const totalAbsent = raw.totalAbsent !== undefined
        ? raw.totalAbsent
        : (raw.detailPekerja?.length !== undefined ? raw.detailPekerja.length : (raw.absentWorkers?.length !== undefined ? raw.absentWorkers.length : '-'));
      const workers = raw.detailPekerja || raw.absentWorkers || [];
      const info = workers.length > 0 ? workers.map(w => w.name || w.code).join(', ') : (raw.info || '-');
      const summary = totalAbsent !== '-' ? `${totalAbsent} Pekerja Tidak Hadir` : 'Tidak Hadir';

      return {
        title: 'Tidak Hadir',
        info: info || '-',
        mainQty: totalAbsent !== '-' ? `${totalAbsent} Pekerja Tidak Hadir` : '-',
        unit: 'Orang',
        summary,
        fields: [
          { label: 'Total Tidak Hadir', value: totalAbsent !== '-' ? `${totalAbsent} Orang` : '-', highlight: true },
          { label: 'Rincian Pekerja', value: workers.length > 0 ? workers.map(w => `${w.name || '-'} (${w.code || '-'}) · Izin: ${w.absentType || 'C'}`).join('<br>') : (raw.keterangan || '-') }
        ]
      };
    }

    case 'PRESENSI': {
      const totalWorkers = raw.totalWorkers !== undefined ? raw.totalWorkers : (raw.workerCount !== undefined ? raw.workerCount : (raw.totalAbsent !== undefined ? raw.totalAbsent : '-'));
      const formattedWorkers = formatSafeNumber(totalWorkers);
      const presensiStatus = raw.status || raw.type || 'HADIR';
      return {
        title: 'Presensi Pekerja',
        info: `Status: ${presensiStatus}`,
        mainQty: totalWorkers !== '-' ? `${formattedWorkers} Orang` : '-',
        unit: 'Orang',
        summary: `Presensi: ${formattedWorkers} Orang (${presensiStatus})`,
        fields: [
          { label: 'Jumlah Pekerja', value: totalWorkers !== '-' ? `${formattedWorkers} Orang` : '-', highlight: true },
          { label: 'Status Presensi', value: presensiStatus },
          { label: 'Keterangan', value: raw.keterangan || raw.notes || '-' }
        ]
      };
    }

    case 'PENERIMAAN':
    case 'RECEIPT': {
      const rawQty = raw.qty !== undefined
        ? raw.qty
        : (raw.quantity !== undefined ? raw.quantity : (raw.receivedQty !== undefined ? raw.receivedQty : (raw.acceptedQty !== undefined ? raw.acceptedQty : '-')));
      const unit = raw.satuan || raw.unit || 'Butir';
      const hasUnitInRaw = typeof rawQty === 'string' && /[a-zA-Z]/.test(rawQty.trim());
      const safeQtyFormatted = formatSafeNumber(rawQty);
      const formattedDisplayQty = rawQty === '-' ? '-' : (hasUnitInRaw ? rawQty.trim() : `${safeQtyFormatted} ${unit}`);
      const klon = raw.klon || raw.clone || '-';
      const tipeAsal = raw.tipeAsal || raw.asal || raw.sumber || raw.sourceType || 'Kebun Induk';
      const summary = `${formattedDisplayQty} (Klon: ${klon})`;

      return {
        title: 'Penerimaan Benih',
        info: `Klon ${klon} · ${tipeAsal}`,
        mainQty: formattedDisplayQty,
        unit,
        summary,
        fields: [
          { label: 'Klon', value: klon },
          { label: 'Tipe Asal', value: tipeAsal },
          { label: 'Sumber', value: raw.sumber || '-' },
          { label: 'No. SIR', value: raw.sir || '-' },
          { label: 'Jumlah Diterima', value: formattedDisplayQty, highlight: true },
          { label: 'Keterangan', value: raw.keterangan || raw.notes || '-' }
        ]
      };
    }

    case 'PENYEMAIAN':
    case 'SEEDING': {
      const qty = raw.totalDisemai !== undefined ? raw.totalDisemai : (raw.qty !== undefined ? raw.qty : '-');
      const formattedQty = formatSafeNumber(qty);
      const bedengan = raw.bedengan || raw.bedenganCode || '-';
      const batch = raw.batchNo || raw.batchCode || '-';
      const klon = raw.klonAwal || raw.klon || '-';
      const summary = `${formattedQty} Butir di Bedengan ${bedengan} (Batch: ${batch})`;

      return {
        title: 'Penyemaian Benih',
        info: `Batch ${batch} · Bedengan ${bedengan}`,
        mainQty: qty !== '-' ? `${formattedQty} Bibit` : '-',
        unit: 'Bibit',
        summary,
        fields: [
          { label: 'Program', value: raw.program || '-' },
          { label: 'Batch', value: batch },
          { label: 'Bedengan', value: bedengan },
          { label: 'Klon', value: klon },
          { label: 'Total Disemai', value: qty !== '-' ? `${formattedQty} Bibit` : '-', highlight: true },
          { label: 'Total Polybag', value: raw.totalPolybag !== undefined ? `${formatSafeNumber(raw.totalPolybag)} Pkk` : '-' },
          { label: 'Keterangan', value: raw.keterangan || raw.notes || '-' }
        ]
      };
    }

    case 'DEDERAN': {
      const qty = raw.jumlahDeder !== undefined
        ? raw.jumlahDeder
        : (raw.totalDeder !== undefined ? raw.totalDeder : (raw.qty !== undefined ? raw.qty : '-'));
      const formattedQty = formatSafeNumber(qty);
      const bedengan = raw.bedenganCode || raw.bedengan || '-';
      const klon = raw.klon || raw.varietas || '-';
      const summary = `${formattedQty} Butir Germinasi di Bedengan ${bedengan}`;

      return {
        title: 'Germinasi / Dederan',
        info: `Bedengan ${bedengan} · Klon ${klon}`,
        mainQty: qty !== '-' ? `${formattedQty} Butir Deder` : '-',
        unit: 'Butir',
        summary,
        fields: [
          { label: 'Bedengan', value: bedengan },
          { label: 'Klon', value: klon },
          { label: 'Jumlah Deder', value: qty !== '-' ? `${formattedQty} Butir` : '-', highlight: true },
          { label: 'Keterangan', value: raw.keterangan || raw.notes || '-' }
        ]
      };
    }

    case 'OKULASI':
    case 'BUDDING': {
      const qty = raw.jumlah !== undefined
        ? raw.jumlah
        : (raw.jumlahMataOkulasi !== undefined ? raw.jumlahMataOkulasi : (raw.qty !== undefined ? raw.qty : '-'));
      const formattedQty = formatSafeNumber(qty);
      const typeLabel = raw.type === 'REGRAFTING' ? 'Regrafting' : 'Grafting';
      const bedengan = raw.bedengan || '-';
      const klon = raw.klonEntres || raw.klon || '-';
      const summary = `${formattedQty} Pkk (${typeLabel}) di Bedengan ${bedengan} (Klon: ${klon})`;

      return {
        title: 'Okulasi Bibitan',
        info: `${typeLabel} · Bedengan ${bedengan}`,
        mainQty: qty !== '-' ? `${formattedQty} Pkk` : '-',
        unit: 'Pkk',
        summary,
        fields: [
          { label: 'Tipe Okulasi', value: typeLabel },
          { label: 'Bedengan', value: bedengan },
          { label: 'Klon Entres', value: klon },
          { label: 'Klon Batang Bawah', value: raw.klonRootstock || '-' },
          { label: 'Total Okulasi', value: qty !== '-' ? `${formattedQty} Pkk` : '-', highlight: true },
          { label: 'Keterangan', value: raw.keterangan || raw.notes || '-' }
        ]
      };
    }

    case 'PEMERIKSAAN':
    case 'INSPECTION': {
      const checked = raw.totalDiperiksa !== undefined ? raw.totalDiperiksa : (raw.qty !== undefined ? raw.qty : '-');
      const jadi = raw.jumlahJadi !== undefined ? raw.jumlahJadi : '-';
      const gagal = raw.jumlahGagal !== undefined ? raw.jumlahGagal : (checked !== '-' && jadi !== '-' ? Number(checked) - Number(jadi) : '-');
      const pct = raw.persenJadi !== undefined ? raw.persenJadi : (checked !== '-' && jadi !== '-' && Number(checked) > 0 ? Math.round((Number(jadi) / Number(checked)) * 100) : '-');
      const formattedChecked = formatSafeNumber(checked);
      const formattedJadi = formatSafeNumber(jadi);
      const formattedGagal = formatSafeNumber(gagal);
      const bedengan = raw.bedengan || '-';
      const klon = raw.klonEntres || '-';
      const summary = `Periksa: ${formattedChecked} Pkk, Jadi: ${formattedJadi} Pkk (${pct !== '-' ? `${pct}%` : '-'})`;

      return {
        title: 'Pemeriksaan Okulasi',
        info: `Bedengan ${bedengan} · Klon ${klon}`,
        mainQty: checked !== '-' ? `${formattedChecked} Diperiksa` : '-',
        breakdown: `${formattedJadi} Berhasil, ${formattedGagal} Tidak Berhasil`,
        unit: 'Pkk',
        summary,
        fields: [
          { label: 'Bedengan', value: bedengan },
          { label: 'Klon', value: klon },
          { label: 'Total Diperiksa', value: checked !== '-' ? `${formattedChecked} Pkk` : '-' },
          { label: 'Jumlah Berhasil', value: jadi !== '-' ? `${formattedJadi} Pkk` : '-', highlight: true },
          { label: 'Jumlah Tidak Berhasil', value: gagal !== '-' ? `${formattedGagal} Pkk` : '-' },
          { label: 'Persentase Jadi', value: pct !== '-' ? `${pct}%` : '-', highlight: true },
          { label: 'Keterangan', value: raw.keterangan || raw.notes || '-' }
        ]
      };
    }

    case 'PEMERIKSAAN_DEDERAN': {
      const diperiksa = raw.jumlahDiperiksa !== undefined
        ? raw.jumlahDiperiksa
        : (raw.totalDiperiksa !== undefined ? raw.totalDiperiksa : (raw.jumlahDeder !== undefined ? raw.jumlahDeder : '-'));
      const berhasil = raw.jumlahBerhasil !== undefined
        ? raw.jumlahBerhasil
        : (raw.totalLayak !== undefined ? raw.totalLayak : (raw.sproutNormal !== undefined ? raw.sproutNormal : (raw.jumlahLayak !== undefined ? raw.jumlahLayak : '-')));
      const tidakBerhasil = raw.jumlahTidakBerhasil !== undefined
        ? raw.jumlahTidakBerhasil
        : (raw.totalAfkir !== undefined ? raw.totalAfkir : (raw.sproutAfkir !== undefined ? raw.sproutAfkir : (raw.jumlahAfkir !== undefined ? raw.jumlahAfkir : '-')));
      const formattedDiperiksa = formatSafeNumber(diperiksa);
      const formattedBerhasil = formatSafeNumber(berhasil);
      const formattedTidakBerhasil = formatSafeNumber(tidakBerhasil);
      const bedengan = raw.bedenganCode || raw.bedengan || '-';
      const klon = raw.klon || '-';
      const summary = `Bedengan ${bedengan}: ${formattedDiperiksa} Diperiksa, ${formattedBerhasil} Berhasil, ${formattedTidakBerhasil} Tidak Berhasil`;

      return {
        title: 'Pemeriksaan Dederan',
        info: `Bedengan ${bedengan} · Klon ${klon}`,
        mainQty: diperiksa !== '-' ? `${formattedDiperiksa} Diperiksa` : '-',
        breakdown: `${formattedBerhasil} Berhasil, ${formattedTidakBerhasil} Tidak Berhasil`,
        unit: 'Butir',
        summary,
        fields: [
          { label: 'Bedengan', value: bedengan },
          { label: 'Klon', value: klon },
          { label: 'Total Diperiksa', value: diperiksa !== '-' ? `${formattedDiperiksa} Butir` : '-' },
          { label: 'Jumlah Berhasil', value: berhasil !== '-' ? `${formattedBerhasil} Butir` : '-', highlight: true },
          { label: 'Jumlah Tidak Berhasil', value: tidakBerhasil !== '-' ? `${formattedTidakBerhasil} Butir` : '-' },
          { label: 'Keterangan', value: raw.keterangan || raw.notes || '-' }
        ]
      };
    }

    case 'SELEKSI_PRA_OKULASI': {
      const stage = raw.selectionStage || 'Seleksi I';
      const layak = raw.totalLayak !== undefined ? raw.totalLayak : (raw.finalBibitQty !== undefined ? raw.finalBibitQty : '-');
      const afkir = raw.totalAfkir !== undefined ? raw.totalAfkir : (raw.rejectedBibitQty !== undefined ? raw.rejectedBibitQty : '-');
      const diperiksa = raw.totalDiperiksa !== undefined ? raw.totalDiperiksa : (layak !== '-' && afkir !== '-' ? Number(layak) + Number(afkir) : '-');
      const formattedLayak = formatSafeNumber(layak);
      const formattedAfkir = formatSafeNumber(afkir);
      const formattedDiperiksa = formatSafeNumber(diperiksa);
      const batch = raw.batchCode || raw.batchNo || '-';
      const bedengan = raw.bedengan || '-';
      const summary = `${stage}: ${formattedLayak} Layak, ${formattedAfkir} Afkir (Batch: ${batch})`;

      return {
        title: `Seleksi Pra-Okulasi (${stage})`,
        info: `Batch ${batch} · Bedengan ${bedengan}`,
        mainQty: layak !== '-' ? `${formattedLayak} Layak` : '-',
        unit: 'Pkk',
        summary,
        fields: [
          { label: 'Tahap Seleksi', value: stage },
          { label: 'Batch', value: batch },
          { label: 'Bedengan', value: bedengan },
          { label: 'Populasi Diperiksa', value: diperiksa !== '-' ? `${formattedDiperiksa} Pkk` : '-' },
          { label: 'Bibit Layak', value: layak !== '-' ? `${formattedLayak} Pkk` : '-', highlight: true },
          { label: 'Bibit Afkir', value: afkir !== '-' ? `${formattedAfkir} Pkk` : '-' },
          { label: 'Keterangan', value: raw.keterangan || raw.notes || '-' }
        ]
      };
    }

    case 'PENYELEKSIAN':
    case 'SELECTION': {
      const stage = getSelectionStageLabel(raw);
      const layak = raw.actualBibitRetainedQty !== undefined
        ? raw.actualBibitRetainedQty
        : (raw.bibitDipertahankan !== undefined ? raw.bibitDipertahankan : (raw.jumlahLayak !== undefined ? raw.jumlahLayak : '-'));
      const afkir = raw.actualBibitSelectedQty !== undefined
        ? raw.actualBibitSelectedQty
        : (raw.bibitReject !== undefined ? raw.bibitReject : (raw.jumlahAfkir !== undefined ? raw.jumlahAfkir : '-'));
      const formattedLayak = formatSafeNumber(layak);
      const formattedAfkir = formatSafeNumber(afkir);
      const reason = raw.reason || raw.kategoriAfkir || stage;
      const bedengan = raw.bedengan || raw.lokasi || '-';
      const summary = `${stage}: ${formattedLayak} Layak, ${formattedAfkir} Afkir`;

      const rawNotes = raw.keterangan || raw.catatan || raw.notes;
      const isLegacyFallback = Boolean(rawNotes && raw.alasan && String(rawNotes).trim() === String(raw.alasan).trim());
      const displayNotes = (!isLegacyFallback && rawNotes !== undefined && rawNotes !== null && String(rawNotes).trim() !== '' && String(rawNotes).trim() !== '-') ? String(rawNotes).trim() : '-';

      return {
        title: 'Penyeleksian Bibit',
        info: `Kategori ${reason} · Bedengan ${bedengan}`,
        mainQty: afkir !== '-' ? `${formattedAfkir} Bibit Afkir` : '-',
        unit: 'Pkk',
        summary,
        fields: [
          { label: 'Tahap Seleksi', value: stage },
          { label: 'Kategori / Alasan Afkir', value: reason },
          { label: 'Bedengan / Lokasi', value: bedengan },
          { label: 'Bibit Afkir (Selected)', value: afkir !== '-' ? `${formattedAfkir} Pkk` : '-', highlight: true },
          { label: 'Bibit Dipertahankan (Retained)', value: layak !== '-' ? `${formattedLayak} Pkk` : '-' },
          { label: 'Keterangan', value: displayNotes }
        ]
      };
    }

    case 'TOPPING': {
      const stik = raw.jumlahKayu !== undefined
        ? raw.jumlahKayu
        : (raw.jumlahStik !== undefined ? raw.jumlahStik : (raw.jumlahStikHijau !== undefined ? raw.jumlahStikHijau : (raw.jumlahPokok !== undefined ? raw.jumlahPokok : '-')));
      const perisai = raw.jumlahPerisai !== undefined
        ? raw.jumlahPerisai
        : (raw.jumlahMata !== undefined ? raw.jumlahMata : (raw.jumlahTopping !== undefined ? raw.jumlahTopping : '-'));
      const formattedStik = formatSafeNumber(stik);
      const formattedPerisai = formatSafeNumber(perisai);
      const plot = raw.kodePlot || raw.plotId || raw.plotNo || '-';
      const klon = raw.namaKlon || raw.klon || '-';
      const summary = `${formattedStik} Btg · ${formattedPerisai} Perisai di Plot ${plot} (Klon: ${klon})`;

      return {
        title: 'Entres Topping',
        info: `Plot ${plot} · Klon ${klon}`,
        mainQty: `${stik !== '-' ? `${formattedStik} Btg` : '-'} · ${perisai !== '-' ? `${formattedPerisai} Perisai` : '-'}`,
        unit: 'Btg/Perisai',
        summary,
        fields: [
          { label: 'Plot', value: plot },
          { label: 'Klon', value: klon },
          { label: 'Kebun Entres', value: raw.budwoodCode || '-' },
          { label: 'Jumlah Kayu', value: stik !== '-' ? `${formattedStik} Btg` : '-', highlight: true },
          { label: 'Panen Perisai (Mata Entres)', value: perisai !== '-' ? `${formattedPerisai} Perisai` : '-', highlight: true },
          { label: 'Keterangan', value: raw.keterangan || raw.notes || '-' }
        ]
      };
    }

    case 'MENUNAS': {
      const qty = raw.jumlahPohonDitunas !== undefined
        ? raw.jumlahPohonDitunas
        : (raw.jumlahPokok !== undefined ? raw.jumlahPokok : (raw.jumlahTunas !== undefined ? raw.jumlahTunas : (raw.qty !== undefined ? raw.qty : '-')));
      const formattedQty = formatSafeNumber(qty);
      const plot = raw.kodePlot || raw.plotId || raw.plotNo || '-';
      const klon = raw.namaKlon || raw.klon || '-';
      const summary = `${formattedQty} Pokok Ditunas di Plot ${plot} (Klon: ${klon})`;

      return {
        title: 'Entres Menunas',
        info: `Plot ${plot} · Klon ${klon}`,
        mainQty: qty !== '-' ? `${formattedQty} Pokok Ditunas` : '-',
        unit: 'Pkk',
        summary,
        fields: [
          { label: 'Plot', value: plot },
          { label: 'Klon', value: klon },
          { label: 'Kebun Entres', value: raw.budwoodCode || '-' },
          { label: 'Realisasi Ditunas', value: qty !== '-' ? `${formattedQty} Pkk` : '-', highlight: true },
          { label: 'Keterangan', value: raw.keterangan || raw.notes || '-' }
        ]
      };
    }

    case 'KEBUN_ENTRES':
    case 'ENTRES': {
      if ((raw.activityType || raw.type || '').toUpperCase() === 'MENUNAS' || raw.jumlahPohonDitunas !== undefined) {
        return getVerificationDetailData(raw, userCtx, 'MENUNAS');
      }
      return getVerificationDetailData(raw, userCtx, 'TOPPING');
    }

    case 'MATERIAL': {
      const isSowMaterial = Boolean(raw.issueDocNo || raw.totalPolybag !== undefined || raw.sourceTransactionType === 'PINDAH_SEMAI_MATERIAL' || raw.dederanTxDocNo || raw.sourceDederDocNo);
      const qty = raw.totalPolybag !== undefined
        ? raw.totalPolybag
        : (raw.quantityUsed !== undefined
            ? raw.quantityUsed
            : (raw.qty !== undefined
                ? raw.qty
                : (raw.quantity !== undefined ? raw.quantity : (raw.qtyOut !== undefined ? raw.qtyOut : (raw.currentStock !== undefined ? raw.currentStock : '-')))));
      const formattedQty = formatSafeNumber(qty);
      const unit = raw.uom || raw.unit || raw.satuan || 'LBR';
      const matName = raw.itemName || raw.materialName || raw.name || 'Biaya Polybag';
      const issueDoc = raw.issueDocNo || raw.noIssue || '-';
      const sowDoc = raw.docNo || raw.referenceDocNo || '-';
      const batch = raw.batchCode || raw.batchNo || '-';
      const bedengan = raw.bedenganCode || raw.bedengan || '-';
      const category = raw.category || raw.kategori || (isSowMaterial ? 'Pindah Semai (SOW)' : 'Umum');
      const summary = `${matName}: ${formattedQty} ${unit} (${sowDoc})`;

      const fields = [
        { label: 'Nama Material', value: matName },
        { label: 'No. Dokumen Issue', value: issueDoc },
        { label: 'Dokumen SOW', value: sowDoc },
        { label: 'Batch', value: batch },
        { label: 'Bedengan', value: bedengan },
        { label: 'Jumlah Digunakan', value: qty !== '-' ? `${formattedQty} ${unit}` : '-', highlight: true },
        { label: 'Kategori / Keterangan', value: raw.keterangan || raw.notes || (isSowMaterial ? 'Material Pindah Semai (SOW)' : '-') }
      ];

      return {
        title: 'Material & Bahan',
        info: `${matName} · ${category}`,
        mainQty: qty !== '-' ? `${formattedQty} ${unit}` : '-',
        unit,
        summary,
        fields
      };
    }

    case 'SIMULASI_GUDANG': {
      const qty = raw.qty !== undefined ? raw.qty : (raw.quantity !== undefined ? raw.quantity : '-');
      const formattedQty = formatSafeNumber(qty);
      const unit = raw.unit || 'Unit';
      const itemName = raw.itemName || raw.materialName || '-';
      const issueDoc = raw.issueDocNo || raw.docNo || '-';
      const summary = `Issue ${itemName}: ${formattedQty} ${unit}`;

      return {
        title: 'Simulasi Issue Gudang',
        info: `No ${issueDoc} · ${itemName}`,
        mainQty: qty !== '-' ? `${formattedQty} ${unit}` : '-',
        unit,
        summary,
        fields: [
          { label: 'No. Issue Gudang', value: issueDoc },
          { label: 'Nama Item / Barang', value: itemName },
          { label: 'Jumlah Issue', value: qty !== '-' ? `${formattedQty} ${unit}` : '-', highlight: true },
          { label: 'Keterangan', value: raw.keterangan || raw.notes || '-' }
        ]
      };
    }

    case 'PEMELIHARAAN':
    case 'REKAM_PEMELIHARAAN':
    case 'NURSERY_ACTIVITY': {
      const actName = raw.aktivitas?.nama || raw.activityType || 'Pemeliharaan';
      const vol = raw.volumePkk !== undefined
        ? raw.volumePkk
        : (raw.aktivitas?.volume !== undefined ? raw.aktivitas?.volume : (raw.volume !== undefined ? raw.volume : (raw.qty !== undefined ? raw.qty : '-')));
      const formattedVol = formatSafeNumber(vol);
      const loc = raw.bedengan || raw.location || raw.lokasiBlok || raw.blok || '-';
      const summary = `${actName} - Bedengan: ${loc} (${formattedVol} Pkk)`;

      return {
        title: 'Rekam Pemeliharaan',
        info: `${actName} · Bedengan ${loc}`,
        mainQty: vol !== '-' ? `${formattedVol} Pkk` : '-',
        unit: 'Pkk',
        summary,
        fields: [
          { label: 'Jenis Pemeliharaan', value: actName },
          { label: 'Lokasi / Bedengan', value: loc },
          { label: 'Volume Realisasi', value: vol !== '-' ? `${formattedVol} Pkk` : '-', highlight: true },
          { label: 'Keterangan', value: raw.keterangan || raw.notes || '-' }
        ]
      };
    }

    case 'PENGELUARAN':
    case 'DISPATCH': {
      const qty = raw.issuedQty !== undefined
        ? raw.issuedQty
        : (raw.qtyDispatched !== undefined ? raw.qtyDispatched : (raw.quantity !== undefined ? raw.quantity : (raw.qty !== undefined ? raw.qty : (raw.totalBatang !== undefined ? raw.totalBatang : '-'))));
      const formattedQty = formatSafeNumber(qty);
      const clone = raw.clone || raw.klon || '-';
      const destination = raw.targetDivisionName || raw.targetEstateId || raw.destination || raw.targetDivision || raw.targetEstate || '-';
      const plate = raw.vehiclePlate || '-';
      const summary = `Dispatch: ${formattedQty} Pkk ke ${destination} (Klon: ${clone})`;

      return {
        title: 'Pengeluaran Bibit',
        info: `Tujuan ${destination} · Klon ${clone}`,
        mainQty: qty !== '-' ? `${formattedQty} Pkk` : '-',
        unit: 'Pkk',
        summary,
        fields: [
          { label: 'Klon', value: clone },
          { label: 'Tujuan Pengiriman', value: destination },
          { label: 'Jumlah Pengeluaran', value: qty !== '-' ? `${formattedQty} Pkk` : '-', highlight: true },
          { label: 'Kendaraan / Plat', value: plate },
          { label: 'Keterangan', value: raw.keterangan || raw.notes || '-' }
        ]
      };
    }

    case 'DESTRUCTION': {
      const qty = raw.qty !== undefined ? raw.qty : (raw.destructionQty !== undefined ? raw.destructionQty : (raw.jumlah !== undefined ? raw.jumlah : '-'));
      const formattedQty = formatSafeNumber(qty);
      const batch = raw.batchId || raw.batchCode || '-';
      const reason = raw.reason || raw.alasan || '-';
      const summary = `Pemusnahan: ${formattedQty} Pkk (Batch: ${batch})`;

      return {
        title: 'Pemusnahan Bibit',
        info: `Batch ${batch} · Alasan ${reason}`,
        mainQty: qty !== '-' ? `${formattedQty} Pkk` : '-',
        unit: 'Pkk',
        summary,
        fields: [
          { label: 'Batch', value: batch },
          { label: 'Alasan Pemusnahan', value: reason },
          { label: 'Jumlah Dimusnahkan', value: qty !== '-' ? `${formattedQty} Pkk` : '-', highlight: true },
          { label: 'Keterangan', value: raw.keterangan || raw.notes || '-' }
        ]
      };
    }

    default: {
      const qty = raw.qty !== undefined ? raw.qty : (raw.quantity !== undefined ? raw.quantity : '-');
      const formattedQty = formatSafeNumber(qty);
      const unit = raw.unit || raw.satuan || 'Pkk';
      const title = REFERENCE_TYPE_LABELS[refType] || refType || 'Transaksi';
      const summary = qty !== '-' ? `${formattedQty} ${unit}` : title;

      return {
        title,
        info: raw.docNo || raw.id || '-',
        mainQty: qty !== '-' ? `${formattedQty} ${unit}` : '-',
        unit,
        summary,
        fields: [
          { label: 'Nomor Referensi', value: raw.docNo || raw.id || '-' },
          { label: 'Kuantitas', value: qty !== '-' ? `${formattedQty} ${unit}` : '-', highlight: true },
          { label: 'Keterangan', value: raw.keterangan || raw.notes || '-' }
        ]
      };
    }
  }
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
  } else if (referenceType === REFERENCE_TYPES.SELECTION || referenceType === REFERENCE_TYPES.DESTRUCTION || referenceType === 'PENYELEKSIAN' || referenceType === 'SELECTION') {
    try { syncAllDederanRejectionsToSelectionPool(); } catch (_) {}
    const dataset = fullDataset || getConsolidatedData(null);
    const bId = record.batchId || record.batchCode || record.batchNo;
    const batchExists = dataset.batches.some(b => b.id === bId || b.batchCode === bId || b.batchNo === bId);
    if (bId && !batchExists) {
      errors.push({ type: 'INVALID_BATCH_REFERENCE', severity: 'ERROR', message: `Batch ${bId} tidak terdaftar di nursery_batches.` });
    }

    // Validasi konsistensi dinamis terhadap dokumen sumber terbaru
    const selValidation = validateSelectionTransactionAgainstSource(record);
    if (!selValidation.isValid) {
      errors.push({
        type: 'STALE_SOURCE_QUANTITY',
        severity: 'ERROR',
        message: selValidation.reason || 'Dokumen sumber telah mengalami koreksi kuantitas setelah transaksi ini diajukan.'
      });
    }
  } else if (referenceType === REFERENCE_TYPES.PEMERIKSAAN_DEDERAN || referenceType === 'PEMERIKSAAN_DEDERAN') {
    const dederTxDocNo = record.dederanTxDocNo || record.dederanTxId;
    if (dederTxDocNo) {
      const dederTxs = storage.get('dederan_transactions', []);
      const parentDeder = dederTxs.find(t => (t.docNo && t.docNo === dederTxDocNo) || t.id === dederTxDocNo);
      if (parentDeder) {
        const diperiksa = parseInt(record.jumlahDiperiksa || 0, 10);
        const maxAllowed = getInspectionChronologicalMaxAllowed(parentDeder, record);
        if (maxAllowed >= 0 && diperiksa > maxAllowed) {
          errors.push({
            type: 'STALE_SOURCE_QUANTITY',
            severity: 'ERROR',
            message: `Jumlah diperiksa (${diperiksa.toLocaleString('id-ID')}) melebihi kuota kronologis terbaru (${maxAllowed.toLocaleString('id-ID')}).`
          });
        }
      }
    }
  } else if (referenceType === REFERENCE_TYPES.PENYEMAIAN || referenceType === 'PENYEMAIAN' || referenceType === 'SEEDING') {
    const dederDocNo = record.dederanTxDocNo || record.sourceDocNo || record.sourceReceiptDocNo;
    if (dederDocNo) {
      const dederTxs = storage.get('dederan_transactions', []);
      const parentDeder = dederTxs.find(t => (t.docNo && t.docNo === dederDocNo) || t.id === dederDocNo);
      if (parentDeder) {
        const parentQty = parseInt(parentDeder.jumlahDeder || parentDeder.jumlahKecambahDitanam || 0, 10);
        const seedingTxs = storage.get('seeding_transactions', []);
        let otherApprovedQty = 0;
        seedingTxs.forEach(s => {
          if (!s || s.id === record.id || s.docNo === record.docNo) return;
          const isRef = (s.dederanTxDocNo && s.dederanTxDocNo === dederDocNo) || (s.sourceDocNo && s.sourceDocNo === dederDocNo);
          const isApproved = String(s.status || '').toUpperCase() === 'DISETUJUI' || String(s.status || '').toUpperCase() === 'TERVERIFIKASI';
          if (isRef && isApproved) {
            otherApprovedQty += parseInt(s.jumlahBibitDipindahkan || s.totalDisemai || s.qty || 0, 10);
          }
        });
        const maxAvailable = Math.max(0, parentQty - otherApprovedQty);
        const thisQty = parseInt(record.jumlahBibitDipindahkan || record.totalDisemai || record.qty || 0, 10);
        if (thisQty > maxAvailable) {
          errors.push({
            type: 'STALE_SOURCE_QUANTITY',
            severity: 'ERROR',
            message: `Jumlah bibit dipindahkan (${thisQty.toLocaleString('id-ID')}) melebihi sisa kuota Dederan sumber terbaru (${maxAvailable.toLocaleString('id-ID')}).`
          });
        }
      }
    }
  } else if (referenceType === REFERENCE_TYPES.BUDDING || referenceType === 'BUDDING' || referenceType === 'OKULASI') {
    const isRegrafting = record.isRegrafting || record.type === 'REGRAFTING' || record.jenisOkulasi === 'OKULASI_JANDA' || record.jenisOkulasi === 'Regrafting' || (record.docNo && String(record.docNo).includes('RGRF'));
    if (isRegrafting) {
      const poolList = storage.get('regrafting_pool', []);
      const refPool = poolList.find(p => 
        (record.sourceInspectionDocNo && (p.inspectionDocNo === record.sourceInspectionDocNo || p.docNo === record.sourceInspectionDocNo)) ||
        (record.poolId && p.id === record.poolId) ||
        (record.batchId && (p.batchId === record.batchId || p.batchNo === record.batchNo)) ||
        (record.bedenganCode && (p.bedenganCode === record.bedenganCode || p.bedenganName === record.bedenganCode))
      );
      if (refPool) {
        const availablePoolQty = parseInt(refPool.quantity !== undefined ? refPool.quantity : (refPool.availableQty !== undefined ? refPool.availableQty : refPool.sisa || 0), 10);
        const reqQty = parseInt(record.jumlahOkulasi !== undefined ? record.jumlahOkulasi : (record.totalOkulasi !== undefined ? record.totalOkulasi : record.jumlahBatangOkulasi || 0), 10);
        if (reqQty > availablePoolQty && availablePoolQty >= 0) {
          errors.push({
            type: 'STALE_POOL_QUANTITY',
            severity: 'ERROR',
            message: `Kuantitas Okulasi Janda (${reqQty.toLocaleString('id-ID')}) melebihi saldo Regrafting Pool yang tersedia (${availablePoolQty.toLocaleString('id-ID')}).`
          });
        }
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
 * Mengambil daftar record yang actionable (menunggu verifikasi) dalam scope ASB.
 * 
 * SOURCE: verification_transactions
 * FILTER: ROLE AKTIF (ASISTEN_BIBITAN) + ESTATE AKTIF + DIVISI AKTIF
 * EXCLUDE: REQUEST
 */
export function getActionableRecordsForAsb(currentUser, filters = {}) {
  try {
    syncAllDederanRejectionsToSelectionPool();
  } catch (_) {}

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

    // 2. Jika sudah TERVERIFIKASI final atau DIKEMBALIKAN, tidak actionable lagi untuk pending queue Asisten
    if (
      verifRecord.verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI ||
      verifRecord.verificationStatus === VERIFICATION_STATUS.DATA_TERKONFIRMASI ||
      verifRecord.verificationStatus === VERIFICATION_STATUS.DIKEMBALIKAN ||
      verifRecord.verificationStatus === 'REVISION' ||
      verifRecord.verificationStatus === 'DIKEMBALIKAN'
    ) return;

    // 3. Resolve source record untuk enrichment & scope check
    const sourceRecord = findSourceRecord(refType, refId, currentUser);
    const rawRecord = sourceRecord || verifRecord;

    // Jika source record berstatus DIKEMBALIKAN / REVISION, tidak actionable untuk pending queue Asisten
    if (rawRecord.status === 'DIKEMBALIKAN' || rawRecord.status === 'REVISION' || rawRecord.materialSubmissionStatus === 'DIKEMBALIKAN') return;

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

    // 8. Single canonical normalization
    const normalizedData = getVerificationDetailData(sourceRecord || rawRecord, currentUser, refType);

    actionableList.push({
      referenceType: refType,
      referenceId: refId,
      referenceDocNo: docNo,
      moduleCategory,
      rawRecord: sourceRecord || rawRecord,
      normalizedData,
      summary: normalizedData.summary,
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
 * Mengambil seluruh catatan verifikasi dalam scope ASB (Pending, Dikembalikan, Terverifikasi)
 * Digunakan untuk Transaction List View pada layar per modul.
 */
export function getVerificationRecordsByScope(currentUser, filters = {}) {
  const allVerifRecords = getAllVerifications();

  // Deduplicate: ambil verifikasi terbaru per (referenceType:referenceId)
  const latestMap = new Map();
  allVerifRecords.forEach(v => {
    const key = `${v.referenceType}:${v.referenceId}`;
    if (!latestMap.has(key) || new Date(v.createdAt || v.submittedAt || 0) > new Date(latestMap.get(key).createdAt || latestMap.get(key).submittedAt || 0)) {
      latestMap.set(key, v);
    }
  });

  const list = [];

  latestMap.forEach((verifRecord) => {
    const refType = verifRecord.referenceType;
    const refId = verifRecord.referenceId;

    // Exclude logistics types (REQUEST)
    if (LOGISTICS_TYPES.includes(refType)) return;

    const sourceRecord = findSourceRecord(refType, refId, currentUser);
    const rawRecord = sourceRecord || verifRecord;

    const estateId = verifRecord.estateId || rawRecord.targetEstateId || rawRecord.estateId || rawRecord.sourceEstateId;
    const divisionId = verifRecord.divisionId || rawRecord.targetDivisionId || rawRecord.divisionId || rawRecord.sourceDivisionId;
    const docNo = verifRecord.referenceDocNo || rawRecord.docNo || rawRecord.id || refId;

    // ROLE + ESTATE + DIVISION ISOLATION
    if (currentUser?.role && normalizeRole(currentUser.role) === ROLES.ASISTEN_BIBITAN) {
      if (currentUser.estateId && estateId && estateId !== currentUser.estateId) return;
      if (currentUser.divisionId && divisionId && divisionId !== currentUser.divisionId) return;
    } else if (currentUser?.estateId && estateId && estateId !== currentUser.estateId) {
      return;
    }

    let evalResult = { canApprove: true, errors: [], warnings: [] };
    if (sourceRecord) {
      try {
        evalResult = evaluateRecordConsistency(refType, sourceRecord);
      } catch (_) {
        // Operational types default to clean
      }
    }

    const dateValue = rawRecord.date || rawRecord.tanggal || rawRecord.tanggalSeleksi || rawRecord.tanggalDeder ||
      rawRecord.tanggalOkulasi || rawRecord.tanggalPemeriksaan || rawRecord.tanggalTopping || rawRecord.tanggalTunas ||
      rawRecord.activityDate || rawRecord.attendanceDate || rawRecord.dispatchDate || rawRecord.receiptDate ||
      verifRecord.submittedAt || verifRecord.createdAt;

    const matchedModule = VERIFICATION_10_MODULES.find(m => m.types.includes(refType) || m.id === refType);
    const moduleCategory = matchedModule ? matchedModule.id : refType;

    const normalizedData = getVerificationDetailData(sourceRecord || rawRecord, currentUser, refType);

    list.push({
      referenceType: refType,
      referenceId: refId,
      referenceDocNo: docNo,
      moduleCategory,
      rawRecord: sourceRecord || rawRecord,
      normalizedData,
      summary: normalizedData.summary,
      estateId,
      divisionId,
      currentStatus: rawRecord.status || verifRecord.verificationStatus || 'SUBMITTED',
      verificationStatus: verifRecord.verificationStatus || VERIFICATION_STATUS.MENUNGGU_VERIFIKASI,
      returnReason: rawRecord.returnReason || verifRecord.returnReason || null,
      latestVerification: verifRecord,
      canApprove: evalResult.canApprove,
      errors: evalResult.errors,
      warnings: evalResult.warnings,
      date: dateValue,
      submittedByName: verifRecord.submittedByName || rawRecord.mantri || rawRecord.submittedByName || 'Mantri Bibitan',
      submittedAt: verifRecord.submittedAt || verifRecord.createdAt
    });
  });

  return list.filter(item => {
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
    const sourceRecord = findSourceRecord(v.referenceType, v.referenceId, currentUser);
    const matchedModule = VERIFICATION_10_MODULES.find(m => m.types.includes(v.referenceType) || m.id === v.referenceType);
    const rawRecord = sourceRecord || v;
    const normalizedData = getVerificationDetailData(rawRecord, currentUser, v.referenceType);

    return {
      ...v,
      moduleCategory: matchedModule ? matchedModule.id : v.referenceType,
      rawRecord,
      normalizedData,
      summary: normalizedData.summary
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
 * Memeriksa apakah ASB terhalang (gated) dari melakukan Verifikasi
 * karena masih terdapat dokumen Pemeriksaan Hasil Seleksi yang belum selesai.
 * @param {Object} [user]
 * @returns {{ isGated: boolean, pendingSelectionCount: number }}
 */
export function checkAsbSelectionGate(user = null) {
  const currentUser = user || (session.getUser ? session.getUser() : (session.get ? session.get() : null));
  const userCtx = user ? resolveUserContext(user) : (getCurrentUserContext() || resolveUserContext(currentUser));
  if (!userCtx) {
    return { isGated: false, pendingSelectionCount: 0 };
  }

  const role = normalizeRole(userCtx.role || userCtx.rawRole);
  if (role !== ROLES.ASISTEN_BIBITAN && role !== ROLES.ASISTEN && role !== 'ASISTEN_BIBITAN' && role !== 'ASISTEN') {
    return { isGated: false, pendingSelectionCount: 0 };
  }

  const pendingSelectionCount = getActionableSelectionCount(null, userCtx);
  return {
    isGated: pendingSelectionCount > 0,
    pendingSelectionCount
  };
}

/**
 * Cek apakah Tinjau Data Hari Ini sudah siap dikirim ke server
 */
export function canSubmitFinalVerificationToServer(currentUser, periodDate = null) {
  const gate = checkAsbSelectionGate(currentUser);
  if (gate.isGated) return false;

  const pendingList = getActionableRecordsForAsb(currentUser, { date: periodDate });
  const verifiedList = getVerifiedTransactionsByScope(currentUser, { periodDate });

  // Harus ada transaksi terverifikasi dan TIDAK ada transaksi yang masih pending/revision
  return verifiedList.length > 0 && pendingList.length === 0;
}

/**
 * Kirim Data ke Server (Final submit pada Tinjau Data Hari Ini)
 */
export function submitFinalVerificationToServer(currentUser, periodDate = null) {
  const gate = checkAsbSelectionGate(currentUser);
  if (gate.isGated) {
    throw new Error(`Pengiriman ke server diblokir: Harap selesaikan ${gate.pendingSelectionCount} dokumen Pemeriksaan Hasil Seleksi terlebih dahulu.`);
  }

  if (!canSubmitFinalVerificationToServer(currentUser, periodDate)) {
    throw new Error('Pengiriman ke server belum dapat dilakukan: Masih ada transaksi yang belum selesai diverifikasi.');
  }

  const allVerifs = getAllVerifications();
  const nowIso = new Date().toISOString();
  let updatedCount = 0;
  const syncedItems = [];

  allVerifs.forEach(v => {
    if (v.verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI || v.verificationStatus === VERIFICATION_STATUS.DATA_TERKONFIRMASI) {
      if (currentUser?.estateId && v.estateId && v.estateId !== currentUser.estateId) return;
      if (currentUser?.divisionId && v.divisionId && v.divisionId !== currentUser.divisionId) return;

      v.serverSyncStatus = 'SYNCED';
      v.syncedAt = nowIso;
      v.syncedByUserId = currentUser?.userId || currentUser?.id;
      v.syncedByName = currentUser?.name || 'Asisten Bibitan';
      updatedCount++;
      syncedItems.push({
        ...v,
        syncedAt: nowIso
      });
    }
  });

  storage.set(VERIFICATION_STORAGE_KEY, allVerifs);

  return {
    success: true,
    syncedCount: updatedCount,
    syncedAt: nowIso,
    syncedItems,
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

  const gateCheck = checkAsbSelectionGate(currentUser);
  if (gateCheck.isGated) {
    throw new Error(`Verifikasi diblokir: Harap selesaikan ${gateCheck.pendingSelectionCount} dokumen Pemeriksaan Hasil Seleksi terlebih dahulu.`);
  }

  // 1. Ambil source record
  const sourceRecord = findSourceRecord(referenceType, referenceId, currentUser);
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
  if (existingVerif && (existingVerif.verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI || existingVerif.verificationStatus === VERIFICATION_STATUS.DATA_TERKONFIRMASI)) {
    throw new Error(`Dokumen ini sudah diverifikasi sebelumnya dengan No: ${existingVerif.verificationNo || existingVerif.verificationId}.`);
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
    ((v.referenceType || v.moduleType || '').toUpperCase() === (referenceType || '').toUpperCase()) &&
    (String(v.referenceId) === String(referenceId) || String(v.referenceDocNo) === String(docNo))
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
    const idx = records.findIndex(r => String(r.id || r.docNo || '') === String(referenceId) || String(r.docNo || '') === String(docNo));
    if (idx !== -1) {
      if (referenceType === 'MATERIAL') {
        records[idx].materialSubmissionStatus = 'DISETUJUI';
      } else {
        records[idx].status = referenceType === 'TIDAK_HADIR' ? 'TERKONFIRMASI' : 'DISETUJUI';
        records[idx].isFinal = true;
        records[idx].verificationStatus = referenceType === 'TIDAK_HADIR' ? VERIFICATION_STATUS.DATA_TERKONFIRMASI : VERIFICATION_STATUS.TERVERIFIKASI;
      }
      records[idx].verifiedAt = nowIso;
      records[idx].verifiedByUserId = currentUser.userId || currentUser.id;
      records[idx].verifiedByName = currentUser.name || 'Asisten Bibitan';
      storage.set(sourceRecord._storeKey, records);

      // Downstream Document Generation for Seleksi Pra-Okulasi (Seleksi I -> II, Seleksi II -> III)
      if (referenceType === 'SELEKSI_PRA_OKULASI' || sourceRecord._storeKey === 'pre_grafting_selection_documents') {
        const approvedDoc = records[idx];
        const stageNorm = String(approvedDoc.selectionStage || '').toUpperCase();
        try {
          if (stageNorm === 'SELEKSI_I' || stageNorm === 'SELEKSI_1') {
            createSelection2DocumentFromSelection1(approvedDoc.id, currentUser);
          } else if (stageNorm === 'SELEKSI_II' || stageNorm === 'SELEKSI_2') {
            createSelection3DocumentFromSelection2(approvedDoc.id, currentUser);
          }
        } catch (genErr) {
          console.warn('[approveVerification] Downstream generation notice:', genErr.message);
        }
      }

      // Auto-reconcile Dokumen Seleksi Pra-Okulasi jika Pindah Semai (SEEDING) atau CULL baru disetujui ASB
      if (referenceType === 'PENYEMAIAN' || referenceType === 'SEEDING' || referenceType === 'SELEKSI' || sourceRecord._storeKey === 'seeding_transactions' || sourceRecord._storeKey === 'selection_transactions') {
        try {
          syncAllSeedingsToPreGraftingSelectionDocuments(currentUser);
        } catch (syncErr) {
          console.warn('[approveVerification] Auto-reconcile pre-grafting notice:', syncErr.message);
        }
      }
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

  // 1. Cegah Return untuk TIDAK_HADIR
  if (referenceType === 'TIDAK_HADIR') {
    throw new Error('Dokumen Tidak Hadir tidak dapat dikembalikan (Return). Hanya dapat diverifikasi.');
  }

  // 2. Ambil source record
  const sourceRecord = findSourceRecord(referenceType, referenceId, currentUser);
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
    ((v.referenceType || v.moduleType || '').toUpperCase() === (referenceType || '').toUpperCase()) &&
    (String(v.referenceId) === String(referenceId) || String(v.referenceDocNo) === String(docNo))
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
    const idx = records.findIndex(r => String(r.id || r.docNo || '') === String(referenceId) || String(r.docNo || '') === String(docNo));
    if (idx !== -1) {
      if (referenceType === 'MATERIAL') {
        records[idx].materialSubmissionStatus = 'DIKEMBALIKAN';
      } else {
        records[idx].status = 'DIKEMBALIKAN';
        records[idx].verificationStatus = VERIFICATION_STATUS.DIKEMBALIKAN;
        if (records[idx].submissionStatus) {
          records[idx].submissionStatus = 'DIKEMBALIKAN';
        }
      }
      records[idx].returnReason = returnReason.trim();
      records[idx].returnedAt = nowIso;
      records[idx].returnedByUserId = currentUser.userId || currentUser.id;
      storage.set(sourceRecord._storeKey, records);
    }
  }

  return auditRecord;
}
