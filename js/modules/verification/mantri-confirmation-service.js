/**
 * js/modules/verification/mantri-confirmation-service.js
 * Central Aggregator Service untuk "Konfirmasi untuk Verifikasi" Mantri Bibitan.
 * 
 * Tanggung Jawab Utama:
 * 1. Mengagregasi transaksi hari ini dari seluruh modul operasional Mantri Bibitan.
 * 2. Memfilter transaksi berdasarkan Actor (Current Logged-in Mantri) & Today (Business Transaction Date).
 * 3. Menormalisasi setiap transaksi ke model standar tanpa mengubah skema raw data.
 * 4. Menyediakan mekanisme submission idempotent ke Asisten Bibitan (menghasilkan verification_transactions).
 */

import { storage } from '../../core/storage.js';
import { todayISO, todayDDMMYYYY } from '../../core/utils.js';
import { getCurrentUserContext, resolveUserContext, ROLES } from '../../core/user-context.js';
import { VERIFICATION_STORAGE_KEY, VERIFICATION_STATUS } from './verification-manager.js';
import { submitPreGraftingSelectionDocumentToAsisten } from '../selection/selection-manager.js';

export const MANTRI_TRANSACTION_STATUS = Object.freeze({
  READY_TO_CONFIRM: 'READY_TO_CONFIRM',
  SUBMITTED_TO_ASB: 'SUBMITTED_TO_ASB',
  PENDING_ASB: 'PENDING_ASB',
  VERIFIED: 'VERIFIED',
  APPROVED: 'APPROVED',
  REVISION: 'REVISION'
});

export const MODULE_TYPES = Object.freeze({
  PRESENSI: 'PRESENSI',
  PENERIMAAN: 'PENERIMAAN',
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

export const MODULE_LABELS = Object.freeze({
  [MODULE_TYPES.PRESENSI]: 'Presensi',
  [MODULE_TYPES.PENERIMAAN]: 'Penerimaan',
  [MODULE_TYPES.PENYEMAIAN]: 'Penyemaian',
  [MODULE_TYPES.DEDERAN]: 'Dederan (Germinasi)',
  [MODULE_TYPES.MENUNAS]: 'Menunas',
  [MODULE_TYPES.TOPPING]: 'Topping',
  [MODULE_TYPES.OKULASI]: 'Okulasi',
  [MODULE_TYPES.PEMERIKSAAN]: 'Pemeriksaan Okulasi',
  [MODULE_TYPES.PEMERIKSAAN_DEDERAN]: 'Pemeriksaan Dederan',
  [MODULE_TYPES.SELEKSI_PRA_OKULASI]: 'Seleksi Pra-Okulasi',
  [MODULE_TYPES.PENYELEKSIAN]: 'Penyeleksian Bibit',
  [MODULE_TYPES.PEMELIHARAAN]: 'Rekam Pemeliharaan',
  [MODULE_TYPES.PENGELUARAN]: 'Pengeluaran Bibit',
  [MODULE_TYPES.MATERIAL]: 'Material & Bahan',
  [MODULE_TYPES.SIMULASI_GUDANG]: 'Simulasi Issue Gudang'
});

/**
 * Helper: Normalisasi date bisnis ke format kanonikal DD/MM/YYYY
 * Mendukung: DD/MM/YYYY, YYYY-MM-DD, ISO string, dan Date object.
 */
export function normalizeDateStr(rawDate) {
  if (!rawDate) return '';
  if (rawDate instanceof Date) {
    if (Number.isNaN(rawDate.getTime())) return '';
    const d = String(rawDate.getDate()).padStart(2, '0');
    const m = String(rawDate.getMonth() + 1).padStart(2, '0');
    const y = rawDate.getFullYear();
    return `${d}/${m}/${y}`;
  }
  const str = String(rawDate).trim();
  if (!str) return '';

  // Case 1: Already DD/MM/YYYY (e.g. "01/10/2026", "1/10/2026", "01-10-2026")
  const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddmmyyyyMatch) {
    const day = ddmmyyyyMatch[1].padStart(2, '0');
    const month = ddmmyyyyMatch[2].padStart(2, '0');
    const year = ddmmyyyyMatch[3];
    return `${day}/${month}/${year}`;
  }

  // Case 2: ISO date or timestamp YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ
  const yyyymmddMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (yyyymmddMatch) {
    const year = yyyymmddMatch[1];
    const month = yyyymmddMatch[2].padStart(2, '0');
    const day = yyyymmddMatch[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  // Case 3: Parse with Date as fallback
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, '0');
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const y = parsed.getFullYear();
    return `${d}/${m}/${y}`;
  }

  return str;
}

/**
 * Helper: Mengekstrak tanggal transaksi bisnis dengan prioritas spesifik
 */
function extractBusinessDate(item) {
  if (!item || typeof item !== 'object') return '';
  const priorityFields = [
    item.tanggal,
    item.tanggalSeleksi,
    item.date,
    item.tanggalDeder,
    item.tanggalTunas,
    item.tanggalTopping,
    item.tanggalOkulasi,
    item.tanggalSemai,
    item.tanggalPenerimaan,
    item.tanggalPemeriksaan,
    item.tanggalInspeksi,
    item.activityDate,
    item.dispatchDate,
    item.receiptDate,
    item.attendanceDate,
    item.usageDate,
    item.issueDate,
    item.completedAt,
    item.createdAt
  ];

  for (const f of priorityFields) {
    if (f) {
      const d = normalizeDateStr(f);
      if (d) return d;
    }
  }
  return '';
}

/**
 * Helper: Cek apakah item milik logged-in Mantri berdasarkan identity adapter
 */
function matchActor(item, userCtx) {
  if (!userCtx) return true;

  const validIds = [userCtx.id, userCtx.userId].filter(Boolean).map(String);
  const validCodes = [userCtx.code, userCtx.userCode, userCtx.badgeNumber, userCtx.nik, userCtx.nip].filter(Boolean).map(String);
  const validNames = [userCtx.name, userCtx.fullName, userCtx.userName, userCtx.mantriName]
    .filter(Boolean)
    .map(s => String(s).toLowerCase().trim());

  // Periksa field id
  const itemIds = [
    item.actorId,
    item.userId,
    item.createdByUserId,
    item.mantriId,
    item.workerId,
    item.penerimaId,
    item.submittedByUserId
  ].filter(Boolean).map(String);

  if (itemIds.length > 0 && validIds.length > 0) {
    if (itemIds.some(id => validIds.includes(id))) return true;
  }

  // Periksa field code
  const itemCodes = [
    item.actorCode,
    item.userCode,
    item.mantriCode,
    item.workerCode,
    item.penerimaCode,
    item.code,
    item.nik,
    item.nip
  ].filter(Boolean).map(String);

  if (itemCodes.length > 0 && validCodes.length > 0) {
    if (itemCodes.some(c => validCodes.includes(c))) return true;
  }

  // Periksa field name
  const itemNames = [
    item.actorName,
    item.userName,
    item.mantri,
    item.createdByName,
    item.recordedBy,
    item.workerName,
    item.penerima,
    item.mandor,
    item.submittedByName,
    item.name
  ].filter(Boolean).map(s => String(s).toLowerCase().trim());

  if (itemNames.length > 0 && validNames.length > 0) {
    if (itemNames.some(n => validNames.includes(n))) return true;
  }

  // Jika item memiliki data actor eksplisit namun tidak cocok sama sekali, tolak
  if (itemIds.length > 0 || itemCodes.length > 0 || itemNames.length > 0) {
    return false;
  }

  // Default fallback bila tidak ada metadata actor sama sekali
  return true;
}

/**
 * Helper: Tentukan status siklus hidup konfirmasi untuk record tertentu
 */
function resolveTransactionStatus(item, moduleType, verifMap) {
  const itemId = String(item.id || item.docNo || '');
  const itemDocNo = String(item.docNo || item.id || '');

  // 1. Cek dari verification_transactions
  const verifRecord = verifMap.get(itemId) || verifMap.get(itemDocNo);
  if (verifRecord) {
    const vStat = (verifRecord.verificationStatus || '').toUpperCase();
    if (vStat === VERIFICATION_STATUS.TERVERIFIKASI || vStat === 'VERIFIED' || vStat === 'APPROVED') {
      return {
        status: MANTRI_TRANSACTION_STATUS.VERIFIED,
        verificationStatus: VERIFICATION_STATUS.TERVERIFIKASI,
        latestVerification: verifRecord
      };
    }
    if (vStat === VERIFICATION_STATUS.DIKEMBALIKAN || vStat === 'REVISION') {
      return {
        status: MANTRI_TRANSACTION_STATUS.REVISION,
        verificationStatus: VERIFICATION_STATUS.DIKEMBALIKAN,
        latestVerification: verifRecord
      };
    }
    if (vStat === VERIFICATION_STATUS.MENUNGGU_VERIFIKASI || vStat === 'SUBMITTED_TO_ASB' || vStat === 'PENDING_ASB') {
      return {
        status: MANTRI_TRANSACTION_STATUS.SUBMITTED_TO_ASB,
        verificationStatus: VERIFICATION_STATUS.MENUNGGU_VERIFIKASI,
        latestVerification: verifRecord
      };
    }
  }

  // 2. Cek dari internal status item itu sendiri
  const rawStat = (item.status || item.verificationStatus || item.submissionStatus || '').toUpperCase();
  const isFinal = Boolean(item.isFinal);

  if (rawStat === 'DISETUJUI' || rawStat === 'VERIFIED' || rawStat === 'APPROVED' || (rawStat === 'DISETUJUI' && isFinal)) {
    return {
      status: MANTRI_TRANSACTION_STATUS.VERIFIED,
      verificationStatus: VERIFICATION_STATUS.TERVERIFIKASI,
      latestVerification: null
    };
  }

  if (rawStat === 'DIKEMBALIKAN' || rawStat === 'REVISION') {
    return {
      status: MANTRI_TRANSACTION_STATUS.REVISION,
      verificationStatus: VERIFICATION_STATUS.DIKEMBALIKAN,
      latestVerification: null
    };
  }

  if (
    rawStat === 'MENUNGGU_VERIFIKASI' ||
    rawStat === 'DIAJUKAN' ||
    rawStat === 'DIAJUKAN_PEMERIKSAAN' ||
    rawStat === 'SUBMITTED_TO_ASB' ||
    rawStat === 'PENDING_ASB'
  ) {
    return {
      status: MANTRI_TRANSACTION_STATUS.SUBMITTED_TO_ASB,
      verificationStatus: VERIFICATION_STATUS.MENUNGGU_VERIFIKASI,
      latestVerification: null
    };
  }

  return {
    status: MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM,
    verificationStatus: MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM,
    latestVerification: null
  };
}

/**
 * Service Utama: Mengambil daftar seluruh transaksi Mantri login hari ini dalam bentuk ternormalisasi
 */
export function getMantriTodayTransactions(userContext = null, targetDate = null) {
  const user = userContext || getCurrentUserContext() || resolveUserContext();
  const todayStr = targetDate ? normalizeDateStr(targetDate) : todayDDMMYYYY();

  // Ambil data verifikasi untuk mapping status verifikasi terbaru
  const allVerifications = storage.get(VERIFICATION_STORAGE_KEY, []);
  const verifMap = new Map();
  allVerifications.forEach(v => {
    if (v.referenceId) verifMap.set(String(v.referenceId), v);
    if (v.referenceDocNo) verifMap.set(String(v.referenceDocNo), v);
  });

  const normalizedList = [];

  // 1. Presensi: attendance_transactions & attendance_records
  const attendances = [
    ...storage.get('attendance_transactions', []),
    ...storage.get('attendance_records', [])
  ];
  const seenAttendanceIds = new Set();
  attendances.forEach(item => {
    const id = item.id || item.docNo;
    if (!id || seenAttendanceIds.has(id)) return;
    seenAttendanceIds.add(id);

    const bDate = extractBusinessDate(item);
    if (bDate !== todayStr) return;
    if (!matchActor(item, user)) return;

    const stat = resolveTransactionStatus(item, MODULE_TYPES.PRESENSI, verifMap);
    const docNo = item.docNo || item.id || `ATT-${id}`;
    const actor = item.actorName || item.workerName || item.name || user?.name || 'Mantri Bibitan';
    const summary = `${item.totalWorkers || item.workerCount || 1} Kehadiran (${item.status || item.type || 'HADIR'})`;

    normalizedList.push({
      id: String(id),
      docNo,
      moduleType: MODULE_TYPES.PRESENSI,
      moduleLabel: MODULE_LABELS[MODULE_TYPES.PRESENSI],
      date: bDate,
      actor,
      summary,
      status: stat.status,
      verificationStatus: stat.verificationStatus,
      rawRecord: item,
      storageKey: 'attendance_transactions'
    });
  });

  // 2. Penerimaan: receipt_ksp_transactions & penerimaan_biji_records & receipt_transactions
  const receipts = [
    ...storage.get('receipt_ksp_transactions', []),
    ...storage.get('penerimaan_biji_records', []),
    ...storage.get('receipt_transactions', [])
  ];
  const seenReceiptIds = new Set();
  receipts.forEach(item => {
    const id = item.id || item.docNo || item.receiptId;
    if (!id || seenReceiptIds.has(id)) return;
    seenReceiptIds.add(id);

    const bDate = extractBusinessDate(item);
    if (bDate !== todayStr) return;
    if (!matchActor(item, user)) return;

    const stat = resolveTransactionStatus(item, MODULE_TYPES.PENERIMAAN, verifMap);
    const docNo = item.docNo || item.receiptDocNo || item.id || `RCV-${id}`;
    const actor = item.penerima || item.actorName || item.createdByName || user?.name || 'Mantri Bibitan';
    const qty = item.qty || item.quantity || item.receivedQty || item.acceptedQty || 0;
    const unit = item.satuan || item.unit || 'Pkk';
    const summary = `${Number(qty).toLocaleString('id-ID')} ${unit} (Klon: ${item.klon || item.clone || '-'})`;

    normalizedList.push({
      id: String(id),
      docNo,
      moduleType: MODULE_TYPES.PENERIMAAN,
      moduleLabel: MODULE_LABELS[MODULE_TYPES.PENERIMAAN],
      date: bDate,
      actor,
      summary,
      status: stat.status,
      verificationStatus: stat.verificationStatus,
      rawRecord: item,
      storageKey: 'receipt_ksp_transactions'
    });
  });

  // 3. Penyemaian: seeding_transactions
  const seedings = storage.get('seeding_transactions', []);
  const seenSeedingIds = new Set();
  seedings.forEach(item => {
    const id = item.id || item.docNo;
    if (!id || seenSeedingIds.has(id)) return;
    seenSeedingIds.add(id);

    const bDate = extractBusinessDate(item);
    if (bDate !== todayStr) return;
    if (!matchActor(item, user)) return;

    const stat = resolveTransactionStatus(item, MODULE_TYPES.PENYEMAIAN, verifMap);
    const docNo = item.docNo || item.nomorDokumen || item.id || `SEED-${id}`;
    const actor = item.mantri || item.actorName || item.createdByName || user?.name || 'Mantri Bibitan';
    const qty = item.totalDisemai || item.qty || 0;
    const summary = `${Number(qty).toLocaleString('id-ID')} Butir di Bedengan ${item.bedengan || item.bedenganCode || '-'} (Batch: ${item.batchNo || '-'})`;

    normalizedList.push({
      id: String(id),
      docNo,
      moduleType: MODULE_TYPES.PENYEMAIAN,
      moduleLabel: MODULE_LABELS[MODULE_TYPES.PENYEMAIAN],
      date: bDate,
      actor,
      summary,
      status: stat.status,
      verificationStatus: stat.verificationStatus,
      rawRecord: item,
      storageKey: 'seeding_transactions'
    });
  });

  // 4. Dederan: dederan_transactions
  const dederans = storage.get('dederan_transactions', []);
  const seenDederIds = new Set();
  dederans.forEach(item => {
    const id = item.id || item.docNo;
    if (!id || seenDederIds.has(id)) return;
    seenDederIds.add(id);

    const bDate = extractBusinessDate(item);
    if (bDate !== todayStr) return;
    if (!matchActor(item, user)) return;

    const stat = resolveTransactionStatus(item, MODULE_TYPES.DEDERAN, verifMap);
    const docNo = item.docNo || item.id || `DED-${id}`;
    const actor = item.mantri || item.actorName || item.recordedBy || user?.name || 'Mantri Bibitan';
    const qty = item.totalDeder || item.jumlahDeder || item.qty || 0;
    const summary = `${Number(qty).toLocaleString('id-ID')} Butir Germinasi di Bedengan ${item.bedenganCode || item.bedengan || '-'}`;

    normalizedList.push({
      id: String(id),
      docNo,
      moduleType: MODULE_TYPES.DEDERAN,
      moduleLabel: MODULE_LABELS[MODULE_TYPES.DEDERAN],
      date: bDate,
      actor,
      summary,
      status: stat.status,
      verificationStatus: stat.verificationStatus,
      rawRecord: item,
      storageKey: 'dederan_transactions'
    });
  });

  // 5. Entres Menunas: entres_menunas_transactions (dan entres_transactions type=MENUNAS)
  const allEntres = [
    ...storage.get('entres_menunas_transactions', []),
    ...storage.get('entres_transactions', []).filter(t => (t.activityType || t.type || '').toUpperCase() === 'MENUNAS')
  ];
  const seenMenunasIds = new Set();
  allEntres.forEach(item => {
    const id = item.id || item.docNo;
    if (!id || seenMenunasIds.has(id)) return;
    seenMenunasIds.add(id);

    const bDate = extractBusinessDate(item);
    if (bDate !== todayStr) return;
    if (!matchActor(item, user)) return;

    const stat = resolveTransactionStatus(item, MODULE_TYPES.MENUNAS, verifMap);
    const docNo = item.docNo || item.id || `TUNAS-${id}`;
    const actor = item.mantri || item.actorName || item.mandor || user?.name || 'Mantri Bibitan';
    const qty = item.jumlahPokok || item.jumlahTunas || item.qty || 0;
    const summary = `${Number(qty).toLocaleString('id-ID')} Pokok di Plot ${item.plotId || item.plotNo || '-'} (Klon: ${item.klon || '-'})`;

    normalizedList.push({
      id: String(id),
      docNo,
      moduleType: MODULE_TYPES.MENUNAS,
      moduleLabel: MODULE_LABELS[MODULE_TYPES.MENUNAS],
      date: bDate,
      actor,
      summary,
      status: stat.status,
      verificationStatus: stat.verificationStatus,
      rawRecord: item,
      storageKey: 'entres_menunas_transactions'
    });
  });

  // 6. Entres Topping: entres_topping_transactions (dan entres_transactions type=TOPPING)
  const allToppings = [
    ...storage.get('entres_topping_transactions', []),
    ...storage.get('entres_transactions', []).filter(t => (t.activityType || t.type || '').toUpperCase() === 'TOPPING')
  ];
  const seenToppingIds = new Set();
  allToppings.forEach(item => {
    const id = item.id || item.docNo;
    if (!id || seenToppingIds.has(id)) return;
    seenToppingIds.add(id);

    const bDate = extractBusinessDate(item);
    if (bDate !== todayStr) return;
    if (!matchActor(item, user)) return;

    const stat = resolveTransactionStatus(item, MODULE_TYPES.TOPPING, verifMap);
    const docNo = item.docNo || item.id || `TOP-${id}`;
    const actor = item.mantri || item.actorName || item.mandor || user?.name || 'Mantri Bibitan';
    const qty = item.jumlahPokok || item.jumlahTopping || item.qty || 0;
    const summary = `${Number(qty).toLocaleString('id-ID')} Pokok di Plot ${item.plotId || item.plotNo || '-'} (Klon: ${item.klon || '-'})`;

    normalizedList.push({
      id: String(id),
      docNo,
      moduleType: MODULE_TYPES.TOPPING,
      moduleLabel: MODULE_LABELS[MODULE_TYPES.TOPPING],
      date: bDate,
      actor,
      summary,
      status: stat.status,
      verificationStatus: stat.verificationStatus,
      rawRecord: item,
      storageKey: 'entres_topping_transactions'
    });
  });

  // 7. Okulasi: budding_transactions
  const buddings = storage.get('budding_transactions', []);
  const seenBuddingIds = new Set();
  buddings.forEach(item => {
    const id = item.id || item.docNo;
    if (!id || seenBuddingIds.has(id)) return;
    seenBuddingIds.add(id);

    const bDate = extractBusinessDate(item);
    if (bDate !== todayStr) return;
    if (!matchActor(item, user)) return;

    const stat = resolveTransactionStatus(item, MODULE_TYPES.OKULASI, verifMap);
    const docNo = item.docNo || item.nomorDokumen || item.id || `OKL-${id}`;
    const actor = item.mantri || item.actorName || item.okulator || user?.name || 'Mantri Bibitan';
    const qty = item.jumlah || item.qty || 0;
    const typeLabel = item.type === 'REGRAFTING' ? 'Regrafting' : 'Grafting';
    const summary = `${Number(qty).toLocaleString('id-ID')} Pkk (${typeLabel}) di Bedengan ${item.bedengan || '-'} (Klon: ${item.klonEntres || item.klon || '-'})`;

    normalizedList.push({
      id: String(id),
      docNo,
      moduleType: MODULE_TYPES.OKULASI,
      moduleLabel: MODULE_LABELS[MODULE_TYPES.OKULASI],
      date: bDate,
      actor,
      summary,
      status: stat.status,
      verificationStatus: stat.verificationStatus,
      rawRecord: item,
      storageKey: 'budding_transactions'
    });
  });

  // 8. Pemeriksaan Okulasi: inspection_transactions
  const inspections = storage.get('inspection_transactions', []);
  const seenInspIds = new Set();
  inspections.forEach(item => {
    const id = item.id || item.docNo;
    if (!id || seenInspIds.has(id)) return;
    seenInspIds.add(id);

    const bDate = extractBusinessDate(item);
    if (bDate !== todayStr) return;
    if (!matchActor(item, user)) return;

    const stat = resolveTransactionStatus(item, MODULE_TYPES.PEMERIKSAAN, verifMap);
    const docNo = item.docNo || item.id || `INSP-${id}`;
    const actor = item.mantri || item.actorName || item.inspektur || user?.name || 'Mantri Bibitan';
    const checked = item.totalDiperiksa || item.qty || 0;
    const jadi = item.jumlahJadi || 0;
    const pct = item.persenJadi || (checked > 0 ? Math.round((jadi / checked) * 100) : 0);
    const summary = `Periksa: ${Number(checked).toLocaleString('id-ID')} Pkk, Jadi: ${Number(jadi).toLocaleString('id-ID')} Pkk (${pct}%)`;

    normalizedList.push({
      id: String(id),
      docNo,
      moduleType: MODULE_TYPES.PEMERIKSAAN,
      moduleLabel: MODULE_LABELS[MODULE_TYPES.PEMERIKSAAN],
      date: bDate,
      actor,
      summary,
      status: stat.status,
      verificationStatus: stat.verificationStatus,
      rawRecord: item,
      storageKey: 'inspection_transactions'
    });
  });

  // 9. Pemeriksaan Dederan: dederan_inspections
  const dederInspections = storage.get('dederan_inspections', []);
  const seenDederInspIds = new Set();
  dederInspections.forEach(item => {
    const id = item.id || item.docNo;
    if (!id || seenDederInspIds.has(id)) return;
    seenDederInspIds.add(id);

    const bDate = extractBusinessDate(item);
    if (bDate !== todayStr) return;
    if (!matchActor(item, user)) return;

    const stat = resolveTransactionStatus(item, MODULE_TYPES.PEMERIKSAAN_DEDERAN, verifMap);
    const docNo = item.docNo || item.id || `DINSP-${id}`;
    const actor = item.mantri || item.actorName || item.inspektur || user?.name || 'Mantri Bibitan';
    const normal = item.totalLayak || item.sproutNormal || item.jumlahLayak || 0;
    const afkir = item.totalAfkir || item.sproutAfkir || item.jumlahAfkir || 0;
    const summary = `Bedengan ${item.bedenganCode || item.bedengan || '-'}: ${Number(normal).toLocaleString('id-ID')} Normal, ${Number(afkir).toLocaleString('id-ID')} Afkir`;

    normalizedList.push({
      id: String(id),
      docNo,
      moduleType: MODULE_TYPES.PEMERIKSAAN_DEDERAN,
      moduleLabel: MODULE_LABELS[MODULE_TYPES.PEMERIKSAAN_DEDERAN],
      date: bDate,
      actor,
      summary,
      status: stat.status,
      verificationStatus: stat.verificationStatus,
      rawRecord: item,
      storageKey: 'dederan_inspections'
    });
  });

  // 10. Seleksi Pra-Okulasi: pre_grafting_selection_documents
  const preGraftingDocs = storage.get('pre_grafting_selection_documents', []);
  const seenPreGraftIds = new Set();
  preGraftingDocs.forEach(item => {
    const id = item.id || item.docNo;
    if (!id || seenPreGraftIds.has(id)) return;
    seenPreGraftIds.add(id);

    const bDate = extractBusinessDate(item);
    if (bDate !== todayStr) return;
    if (!matchActor(item, user)) return;

    const stat = resolveTransactionStatus(item, MODULE_TYPES.SELEKSI_PRA_OKULASI, verifMap);
    const docNo = item.docNo || item.selectionDocNo || item.id || `PRE-${id}`;
    const actor = item.submittedByName || item.createdByName || item.mantri || user?.name || 'Mantri Bibitan';
    const stage = item.selectionStage || 'Seleksi I';
    const layak = item.totalLayak !== undefined ? item.totalLayak : (item.finalBibitQty || 0);
    const afkir = item.totalAfkir !== undefined ? item.totalAfkir : (item.rejectedBibitQty || 0);
    const summary = `${stage}: ${Number(layak).toLocaleString('id-ID')} Layak, ${Number(afkir).toLocaleString('id-ID')} Afkir (Batch: ${item.batchCode || '-'})`;

    normalizedList.push({
      id: String(id),
      docNo,
      moduleType: MODULE_TYPES.SELEKSI_PRA_OKULASI,
      moduleLabel: MODULE_LABELS[MODULE_TYPES.SELEKSI_PRA_OKULASI],
      date: bDate,
      actor,
      summary,
      status: stat.status,
      verificationStatus: stat.verificationStatus,
      rawRecord: item,
      storageKey: 'pre_grafting_selection_documents'
    });
  });

  // 11. Penyeleksian (Sesi / Pasca-Okulasi): selection_transactions
  const selections = storage.get('selection_transactions', []);
  const seenSelectionIds = new Set();
  selections.forEach(item => {
    const id = item.id || item.docNo || item.selectionNo;
    if (!id || seenSelectionIds.has(id)) return;
    seenSelectionIds.add(id);

    const bDate = extractBusinessDate(item);
    if (bDate !== todayStr) return;
    if (!matchActor(item, user)) return;

    const stat = resolveTransactionStatus(item, MODULE_TYPES.PENYELEKSIAN, verifMap);
    const docNo = item.docNo || item.selectionNo || item.id || `SEL-${id}`;
    const actor = item.mantri || item.createdByName || item.actorName || user?.name || 'Mantri Bibitan';
    const layak = item.actualBibitRetainedQty !== undefined ? item.actualBibitRetainedQty : (item.bibitDipertahankan !== undefined ? item.bibitDipertahankan : (item.jumlahLayak || 0));
    const afkir = item.actualBibitSelectedQty !== undefined ? item.actualBibitSelectedQty : (item.bibitReject !== undefined ? item.bibitReject : (item.jumlahAfkir || 0));
    const summary = `Seleksi ${item.stage || item.selectionStage || 'Bibit'}: ${Number(layak).toLocaleString('id-ID')} Layak, ${Number(afkir).toLocaleString('id-ID')} Afkir`;

    normalizedList.push({
      id: String(id),
      docNo,
      moduleType: MODULE_TYPES.PENYELEKSIAN,
      moduleLabel: MODULE_LABELS[MODULE_TYPES.PENYELEKSIAN],
      date: bDate,
      actor,
      summary,
      status: stat.status,
      verificationStatus: stat.verificationStatus,
      rawRecord: item,
      storageKey: 'selection_transactions'
    });
  });

  // 12. Rekam Pemeliharaan: nursery_activity_transactions & nursery_activity_records
  const activities = [
    ...storage.get('nursery_activity_transactions', []),
    ...storage.get('nursery_activity_records', [])
  ];
  const seenActivityIds = new Set();
  activities.forEach(item => {
    const id = item.id || item.docNo;
    if (!id || seenActivityIds.has(id)) return;
    seenActivityIds.add(id);

    const bDate = extractBusinessDate(item);
    if (bDate !== todayStr) return;
    if (!matchActor(item, user)) return;

    const stat = resolveTransactionStatus(item, MODULE_TYPES.PEMELIHARAAN, verifMap);
    const docNo = item.docNo || item.id || `ACT-${id}`;
    const actor = item.mantri || item.actorName || item.mandor || user?.name || 'Mantri Bibitan';
    const vol = item.volumePkk || item.volume || item.qty || 0;
    const summary = `${item.activityType || 'Pemeliharaan'} - Bedengan: ${item.bedengan || '-'} (${Number(vol).toLocaleString('id-ID')} Pkk)`;

    normalizedList.push({
      id: String(id),
      docNo,
      moduleType: MODULE_TYPES.PEMELIHARAAN,
      moduleLabel: MODULE_LABELS[MODULE_TYPES.PEMELIHARAAN],
      date: bDate,
      actor,
      summary,
      status: stat.status,
      verificationStatus: stat.verificationStatus,
      rawRecord: item,
      storageKey: 'nursery_activity_transactions'
    });
  });

  // 13. Pengeluaran: dispatch_transactions
  const dispatches = storage.get('dispatch_transactions', []);
  const seenDispatchIds = new Set();
  dispatches.forEach(item => {
    const id = item.id || item.docNo || item.dispatchId;
    if (!id || seenDispatchIds.has(id)) return;
    seenDispatchIds.add(id);

    const bDate = extractBusinessDate(item);
    if (bDate !== todayStr) return;
    if (!matchActor(item, user)) return;

    const stat = resolveTransactionStatus(item, MODULE_TYPES.PENGELUARAN, verifMap);
    const docNo = item.docNo || item.dispatchNo || item.id || `DSP-${id}`;
    const actor = item.mantri || item.dispatcher || item.actorName || user?.name || 'Mantri Bibitan';
    const qty = item.qtyDispatched || item.quantity || item.qty || 0;
    const summary = `Dispatch: ${Number(qty).toLocaleString('id-ID')} Pkk ke ${item.targetDivision || item.targetEstate || '-'}`;

    normalizedList.push({
      id: String(id),
      docNo,
      moduleType: MODULE_TYPES.PENGELUARAN,
      moduleLabel: MODULE_LABELS[MODULE_TYPES.PENGELUARAN],
      date: bDate,
      actor,
      summary,
      status: stat.status,
      verificationStatus: stat.verificationStatus,
      rawRecord: item,
      storageKey: 'dispatch_transactions'
    });
  });

  // 14. Material: material_usage_transactions & materials_transactions
  const materials = [
    ...storage.get('material_usage_transactions', []),
    ...storage.get('materials_transactions', [])
  ];
  const seenMaterialIds = new Set();
  materials.forEach(item => {
    const id = item.id || item.docNo;
    if (!id || seenMaterialIds.has(id)) return;
    seenMaterialIds.add(id);

    const bDate = extractBusinessDate(item);
    if (bDate !== todayStr) return;
    if (!matchActor(item, user)) return;

    const stat = resolveTransactionStatus(item, MODULE_TYPES.MATERIAL, verifMap);
    const docNo = item.docNo || item.id || `MAT-${id}`;
    const actor = item.mantri || item.actorName || user?.name || 'Mantri Bibitan';
    const qty = item.qty || item.quantity || item.qtyOut || 0;
    const unit = item.unit || item.satuan || 'Unit';
    const summary = `${item.materialName || item.itemName || 'Material'}: ${Number(qty).toLocaleString('id-ID')} ${unit}`;

    normalizedList.push({
      id: String(id),
      docNo,
      moduleType: MODULE_TYPES.MATERIAL,
      moduleLabel: MODULE_LABELS[MODULE_TYPES.MATERIAL],
      date: bDate,
      actor,
      summary,
      status: stat.status,
      verificationStatus: stat.verificationStatus,
      rawRecord: item,
      storageKey: 'material_usage_transactions'
    });
  });

  // 15. Simulasi Issue Gudang: warehouse_issue_simulations
  const warehouseIssues = storage.get('warehouse_issue_simulations', []);
  const seenWarehouseIds = new Set();
  warehouseIssues.forEach(item => {
    const id = item.id || item.docNo;
    if (!id || seenWarehouseIds.has(id)) return;
    seenWarehouseIds.add(id);

    const bDate = extractBusinessDate(item);
    if (bDate !== todayStr) return;
    if (!matchActor(item, user)) return;

    const stat = resolveTransactionStatus(item, MODULE_TYPES.SIMULASI_GUDANG, verifMap);
    const docNo = item.docNo || item.issueDocNo || item.id || `WHS-${id}`;
    const actor = item.mantri || item.actorName || user?.name || 'Mantri Bibitan';
    const qty = item.qty || item.quantity || 0;
    const unit = item.unit || 'Unit';
    const summary = `Issue ${item.itemName || item.materialName || '-'}: ${Number(qty).toLocaleString('id-ID')} ${unit}`;

    normalizedList.push({
      id: String(id),
      docNo,
      moduleType: MODULE_TYPES.SIMULASI_GUDANG,
      moduleLabel: MODULE_LABELS[MODULE_TYPES.SIMULASI_GUDANG],
      date: bDate,
      actor,
      summary,
      status: stat.status,
      verificationStatus: stat.verificationStatus,
      rawRecord: item,
      storageKey: 'warehouse_issue_simulations'
    });
  });

  return normalizedList;
}

/**
 * Service Submission: Mengirim satu atau beberapa transaksi Mantri ke Asisten Bibitan
 * Menghasilkan data audit di `verification_transactions` secara idempotent (mencegah duplicate).
 */
export function submitMantriTransactions(transactionIds = [], userContext = null) {
  const user = userContext || getCurrentUserContext() || resolveUserContext();
  const allToday = getMantriTodayTransactions(user);

  const targetItems = (transactionIds.length > 0
    ? allToday.filter(tx => transactionIds.includes(tx.id) || transactionIds.includes(tx.docNo))
    : allToday
  ).filter(tx => tx.status === MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM || tx.status === MANTRI_TRANSACTION_STATUS.REVISION);

  if (targetItems.length === 0) {
    return {
      success: true,
      submittedCount: 0,
      submittedItems: [],
      message: 'Tidak ada transaksi baru yang perlu dikirim ke Asisten.'
    };
  }

  const nowIso = new Date().toISOString();
  const allVerifs = storage.get(VERIFICATION_STORAGE_KEY, []);
  const submittedItems = [];

  targetItems.forEach(tx => {
    // 1. Update status pada data raw source
    if (tx.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI) {
      const preDocs = storage.get('pre_grafting_selection_documents', []);
      const pIdx = preDocs.findIndex(d => d.id === tx.id || d.docNo === tx.docNo);
      if (pIdx !== -1) {
        preDocs[pIdx].status = 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN';
        preDocs[pIdx].verificationStatus = 'MENUNGGU_VERIFIKASI';
        preDocs[pIdx].submittedAt = nowIso;
        preDocs[pIdx].submittedByUserId = user?.id || user?.userId || 'MANTRI';
        preDocs[pIdx].submittedByName = user?.name || 'Mantri Bibitan';
        storage.set('pre_grafting_selection_documents', preDocs);
      }
      try {
        submitPreGraftingSelectionDocumentToAsisten(tx.id, user);
      } catch (err) {
        // status already updated in pre_grafting_selection_documents above
      }
    } else if (tx.storageKey) {
      const records = storage.get(tx.storageKey, []);
      const rIdx = records.findIndex(r => String(r.id || r.docNo || '') === String(tx.id));
      if (rIdx !== -1) {
        records[rIdx].status = 'MENUNGGU_VERIFIKASI';
        records[rIdx].submissionStatus = 'SUBMITTED_TO_ASB';
        records[rIdx].submittedAt = nowIso;
        records[rIdx].submittedByUserId = user?.id || user?.userId || 'MANTRI';
        records[rIdx].submittedByName = user?.name || 'Mantri Bibitan';
        storage.set(tx.storageKey, records);
      }
    }

    // 2. Buat / perbarui catatan di verification_transactions secara IDEMPOTENT
    const existingIdx = allVerifs.findIndex(v =>
      (v.referenceId && String(v.referenceId) === String(tx.id)) ||
      (v.referenceDocNo && String(v.referenceDocNo) === String(tx.docNo))
    );

    if (existingIdx !== -1) {
      allVerifs[existingIdx].verificationStatus = VERIFICATION_STATUS.MENUNGGU_VERIFIKASI;
      allVerifs[existingIdx].submittedAt = nowIso;
      allVerifs[existingIdx].submittedByUserId = user?.id || user?.userId || 'MANTRI';
      allVerifs[existingIdx].submittedByName = user?.name || 'Mantri Bibitan';
      allVerifs[existingIdx].updatedAt = nowIso;
    } else {
      const vNo = `VRF-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
      allVerifs.push({
        verificationId: `VRF-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        verificationNo: vNo,
        referenceType: tx.moduleType,
        referenceId: tx.id,
        referenceDocNo: tx.docNo,
        estateId: tx.rawRecord?.targetEstateId || tx.rawRecord?.estateId || tx.rawRecord?.sourceEstateId || user?.estateId || 'EST-01',
        divisionId: tx.rawRecord?.targetDivisionId || tx.rawRecord?.divisionId || tx.rawRecord?.sourceDivisionId || user?.divisionId || 'DIV-01',
        verificationStatus: VERIFICATION_STATUS.MENUNGGU_VERIFIKASI,
        findings: [],
        notes: '',
        submittedByUserId: user?.id || user?.userId || 'MANTRI',
        submittedByName: user?.name || 'Mantri Bibitan',
        submittedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso
      });
    }

    submittedItems.push(tx);
  });

  storage.set(VERIFICATION_STORAGE_KEY, allVerifs);

  return {
    success: true,
    submittedCount: submittedItems.length,
    submittedItems,
    message: `${submittedItems.length} transaksi berhasil dikirim ke Asisten Bibitan untuk verifikasi.`
  };
}

/**
 * Service Submission per Modul: Mengirim seluruh transaksi eligible dalam 1 modul ke Asisten Bibitan.
 * Memastikan pengiriman atomik di level modul tanpa menghilangkan identitas transaksi individual.
 * 
 * @param {string} moduleType - Kode modul (e.g. 'PENERIMAAN', 'PENYEMAIAN', etc.)
 * @param {object|null} userContext - Logged-in user context
 */
export function submitModuleTransactions(moduleType, userContext = null) {
  if (!moduleType) {
    return {
      success: false,
      submittedCount: 0,
      submittedItems: [],
      message: 'Kode modul tidak valid.'
    };
  }

  const user = userContext || getCurrentUserContext() || resolveUserContext();
  const allToday = getMantriTodayTransactions(user);

  const targetModuleTxs = allToday.filter(tx => 
    String(tx.moduleType).toUpperCase() === String(moduleType).toUpperCase() &&
    (tx.status === MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM || tx.status === MANTRI_TRANSACTION_STATUS.REVISION)
  );

  if (targetModuleTxs.length === 0) {
    const modLabel = MODULE_LABELS[moduleType] || moduleType;
    return {
      success: true,
      submittedCount: 0,
      submittedItems: [],
      message: `Tidak ada transaksi baru pada modul ${modLabel} yang perlu dikirim ke Asisten.`
    };
  }

  const txIds = targetModuleTxs.map(tx => tx.id);
  const result = submitMantriTransactions(txIds, user);
  const modLabel = MODULE_LABELS[moduleType] || moduleType;

  return {
    ...result,
    moduleType,
    moduleLabel: modLabel,
    message: `${result.submittedCount} transaksi ${modLabel} berhasil dikirim ke Asisten Bibitan untuk verifikasi.`
  };
}

