/**
 * scripts/test-asb-workspace-redesign.js
 * Comprehensive Integration Test Suite for Asisten Bibitan Workspace Redesign
 * 
 * Tests IT-ASB-01 through IT-ASB-22
 */

if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    }
  };
  global.localStorage = globalThis.localStorage;
}

import { storage } from '../js/core/storage.js';
import {
  VERIFICATION_STORAGE_KEY,
  VERIFICATION_STATUS,
  VERIFICATION_10_MODULES,
  LOGISTICS_TYPES,
  REFERENCE_TYPES,
  getAllVerifications,
  getVerificationByReference,
  getActionableRecordsForAsb,
  getPendingVerificationCount,
  getVerificationHistory,
  getVerifiedTransactionsByScope,
  get10ModulesSummary,
  canSubmitFinalVerificationToServer,
  submitFinalVerificationToServer,
  approveVerification,
  returnVerification,
  findSourceRecord
} from '../js/modules/verification/verification-manager.js';

import {
  ASISTEN_BIBITAN_BERANDA_MENUS
} from '../js/modules/dashboard/beranda.js';

import {
  ASISTEN_BIBITAN_PEMERIKSAAN_MENUS
} from '../js/modules/inspection/inspection-landing.js';

import {
  REPORT_MENUS
} from '../js/modules/reports/reports-landing.js';

import {
  ASB_NAV_ITEMS
} from '../js/components/bottom-nav-asb.js';

import {
  submitMantriTransactions,
  MODULE_TYPES
} from '../js/modules/verification/mantri-confirmation-service.js';

import {
  getPreGraftingSelectionDocumentById,
  submitPreGraftingSelectionDocumentToAsisten,
  approvePreGraftingSelectionDocument
} from '../js/modules/selection/selection-manager.js';

const testResults = {};
let totalPassed = 0;
let totalFailed = 0;

function reportTest(id, passed, description, details = '') {
  testResults[id] = { passed, description, details };
  if (passed) {
    totalPassed++;
    console.log(`✅ [${id}] PASS: ${description}`);
  } else {
    totalFailed++;
    console.error(`❌ [${id}] FAIL: ${description} -> ${details}`);
  }
}

console.log('================================================================================');
console.log('       INTEGRATION TEST SUITE: REDESIGN WORKSPACE ASISTEN BIBITAN (IT-ASB)     ');
console.log('================================================================================\n');

// ---------------------------------------------------------------------------------------------
// SETUP DATA CONTEXTS
// ---------------------------------------------------------------------------------------------
localStorage.clear();

const asbTanahBesihDiv1 = {
  id: 'USR-ASB-TBS-01',
  name: 'Annisa Nurul (Asisten)',
  role: 'ASISTEN_BIBITAN',
  estateId: 'Tanah Besih',
  divisionId: 'Divisi I'
};

const asbTanahBesihDiv2 = {
  id: 'USR-ASB-TBS-02',
  name: 'Budi Santoso (Asisten)',
  role: 'ASISTEN_BIBITAN',
  estateId: 'Tanah Besih',
  divisionId: 'Divisi II'
};

const asbAekPamingkeDiv1 = {
  id: 'USR-ASB-APM-01',
  name: 'Citra Dewi (Asisten)',
  role: 'ASISTEN_BIBITAN',
  estateId: 'Aek Pamingke',
  divisionId: 'Divisi I'
};

const mantriTanahBesihDiv1 = {
  id: 'USR-MNT-TBS-01',
  name: 'Wagiman',
  role: 'MANTRI_TANAMAN',
  estateId: 'Tanah Besih',
  divisionId: 'Divisi I'
};

// ---------------------------------------------------------------------------------------------
// IT-ASB-01: Beranda Menus
// ---------------------------------------------------------------------------------------------
{
  const menuTitles = ASISTEN_BIBITAN_BERANDA_MENUS.map(m => m.label || m.title.replace(/<br\s*[\/]?>/gi, ' '));
  const hasPenerimaan = menuTitles.includes('Penerimaan Bibit');
  const hasPermintaan = menuTitles.includes('Permintaan Bibit');
  const hasPengeluaran = menuTitles.includes('Pengeluaran Bibit');
  const exactThree = ASISTEN_BIBITAN_BERANDA_MENUS.length === 3;

  reportTest(
    'IT-ASB-01',
    hasPenerimaan && hasPermintaan && hasPengeluaran && exactThree,
    'Beranda menampilkan tepat 3 menu: Penerimaan Bibit, Permintaan Bibit, Pengeluaran Bibit',
    `Found: ${menuTitles.join(', ')} (count: ${ASISTEN_BIBITAN_BERANDA_MENUS.length})`
  );
}

// ---------------------------------------------------------------------------------------------
// IT-ASB-02: Pemeriksaan Menus
// ---------------------------------------------------------------------------------------------
{
  const inspTitles = ASISTEN_BIBITAN_PEMERIKSAAN_MENUS.map(m => m.label || m.title.replace(/<br\s*[\/]?>/gi, ' '));
  const hasSeleksi = inspTitles.includes('Pemeriksaan Hasil Seleksi');
  const hasPemusnahan = inspTitles.includes('Pemusnahan Bibit');
  const exactTwo = ASISTEN_BIBITAN_PEMERIKSAAN_MENUS.length === 2;

  reportTest(
    'IT-ASB-02',
    hasSeleksi && hasPemusnahan && exactTwo,
    'Pemeriksaan menampilkan tepat 2 menu: Pemeriksaan Hasil Seleksi, Pemusnahan Bibit',
    `Found: ${inspTitles.join(', ')} (count: ${ASISTEN_BIBITAN_PEMERIKSAAN_MENUS.length})`
  );
}

// ---------------------------------------------------------------------------------------------
// IT-ASB-03: Verifikasi 10 Modul
// ---------------------------------------------------------------------------------------------
{
  const modLabels = VERIFICATION_10_MODULES.map(m => m.label);
  const expected10 = [
    'Presensi',
    'Penerimaan',
    'Penyemaian',
    'Okulasi',
    'Pemeriksaan',
    'Penyeleksian',
    'Kebun Entres',
    'Material',
    'Rekam Pemeliharaan',
    'Pengeluaran'
  ];

  const allPresent = expected10.every(exp => modLabels.includes(exp));
  const exact10 = VERIFICATION_10_MODULES.length === 10;

  reportTest(
    'IT-ASB-03',
    allPresent && exact10,
    'Verifikasi memiliki tepat 10 modul operasional kanonikal',
    `Found: ${modLabels.join(', ')} (count: ${VERIFICATION_10_MODULES.length})`
  );
}

// ---------------------------------------------------------------------------------------------
// IT-ASB-04: Permintaan Tidak Muncul di Verifikasi
// ---------------------------------------------------------------------------------------------
{
  const modKeys = VERIFICATION_10_MODULES.map(m => m.id);
  const hasRequest = modKeys.includes('REQUEST') || modKeys.includes('PERMINTAAN') || LOGISTICS_TYPES.includes('REQUEST');
  const requestExcludedFromVerif = LOGISTICS_TYPES.includes('REQUEST');

  reportTest(
    'IT-ASB-04',
    requestExcludedFromVerif && !modKeys.includes('REQUEST') && !modKeys.includes('PERMINTAAN'),
    'Permintaan Bibit tidak muncul di workspace Verifikasi',
    `LOGISTICS_TYPES: ${LOGISTICS_TYPES.join(', ')}`
  );
}

// ---------------------------------------------------------------------------------------------
// IT-ASB-05: Transaksi Mantri Berhasil Muncul di Verifikasi
// ---------------------------------------------------------------------------------------------
// Seed raw Mantri transactions in Tanah Besih Divisi I
storage.set('attendance_transactions', [
  {
    id: 'ATT-20260928-001',
    docNo: 'PRS-20260928-001',
    attendanceDate: '28/09/2026',
    actorName: 'Wagiman',
    actorId: 'USR-MNT-TBS-01',
    totalWorkers: 15,
    estateId: 'Tanah Besih',
    divisionId: 'Divisi I',
    status: 'HADIR'
  }
]);

storage.set('entres_topping_transactions', [
  {
    id: 'TOP-20260928-002',
    docNo: 'TOP-20260928-002',
    tanggalTopping: '28/09/2026',
    actorName: 'Wagiman',
    actorId: 'USR-MNT-TBS-01',
    jumlahStikHijau: 500,
    jumlahPerisai: 120,
    estateId: 'Tanah Besih',
    divisionId: 'Divisi I',
    status: 'MENUNGGU_VERIFIKASI'
  }
]);

storage.set('budding_transactions', [
  {
    id: 'OKL-20260927-001',
    docNo: 'OKL-20260927-001',
    tanggal: '27/09/2026',
    actorName: 'Sutrisno',
    actorId: 'USR-MNT-TBS-01',
    jumlahMataOkulasi: 300,
    jumlahStik: 250,
    estateId: 'Tanah Besih',
    divisionId: 'Divisi I',
    status: 'MENUNGGU_VERIFIKASI'
  }
]);

// Mantri submits to Central Hub -> writes verification_transactions
storage.set(VERIFICATION_STORAGE_KEY, [
  {
    verificationId: 'VRF-TEMP-001',
    verificationNo: 'VRF-20260928-0001',
    referenceType: 'PRESENSI',
    referenceId: 'ATT-20260928-001',
    referenceDocNo: 'PRS-20260928-001',
    estateId: 'Tanah Besih',
    divisionId: 'Divisi I',
    verificationStatus: VERIFICATION_STATUS.MENUNGGU_VERIFIKASI,
    submittedByName: 'Wagiman',
    submittedAt: '2026-09-28T08:00:00.000Z'
  },
  {
    verificationId: 'VRF-TEMP-002',
    verificationNo: 'VRF-20260928-0002',
    referenceType: 'TOPPING',
    referenceId: 'TOP-20260928-002',
    referenceDocNo: 'TOP-20260928-002',
    estateId: 'Tanah Besih',
    divisionId: 'Divisi I',
    verificationStatus: VERIFICATION_STATUS.MENUNGGU_VERIFIKASI,
    submittedByName: 'Wagiman',
    submittedAt: '2026-09-28T09:00:00.000Z'
  },
  {
    verificationId: 'VRF-TEMP-003',
    verificationNo: 'VRF-20260928-0003',
    referenceType: 'OKULASI',
    referenceId: 'OKL-20260927-001',
    referenceDocNo: 'OKL-20260927-001',
    estateId: 'Tanah Besih',
    divisionId: 'Divisi I',
    verificationStatus: VERIFICATION_STATUS.MENUNGGU_VERIFIKASI,
    submittedByName: 'Sutrisno',
    submittedAt: '2026-09-28T09:30:00.000Z'
  }
]);

{
  const actionable = getActionableRecordsForAsb(asbTanahBesihDiv1);
  const foundPresensi = actionable.some(a => a.referenceDocNo === 'PRS-20260928-001');
  const foundTopping = actionable.some(a => a.referenceDocNo === 'TOP-20260928-002');
  const foundOkulasi = actionable.some(a => a.referenceDocNo === 'OKL-20260927-001');

  reportTest(
    'IT-ASB-05',
    foundPresensi && foundTopping && foundOkulasi,
    'Transaksi Mantri berhasil muncul di antrian Verifikasi Asisten',
    `Found ${actionable.length} records: ${actionable.map(a => a.referenceDocNo).join(', ')}`
  );
}

// ---------------------------------------------------------------------------------------------
// IT-ASB-06: Data Verifikasi Sama dengan Source Transaction Mantri
// ---------------------------------------------------------------------------------------------
{
  const toppingVerif = getActionableRecordsForAsb(asbTanahBesihDiv1).find(a => a.referenceDocNo === 'TOP-20260928-002');
  const sourceTopping = findSourceRecord('TOPPING', 'TOP-20260928-002');

  const matchData = toppingVerif && sourceTopping &&
    toppingVerif.rawRecord.docNo === sourceTopping.docNo &&
    toppingVerif.rawRecord.jumlahStikHijau === sourceTopping.jumlahStikHijau &&
    toppingVerif.rawRecord.jumlahPerisai === sourceTopping.jumlahPerisai;

  reportTest(
    'IT-ASB-06',
    Boolean(matchData),
    'Data Verifikasi sama persis dengan source transaction Mantri',
    `DocNo: ${toppingVerif?.rawRecord?.docNo} vs ${sourceTopping?.docNo}`
  );
}

// ---------------------------------------------------------------------------------------------
// IT-ASB-07: Topping/Kebun Entres: Jumlah Stik Hijau dan Jumlah Perisai Matching
// ---------------------------------------------------------------------------------------------
{
  const sourceTopping = findSourceRecord('TOPPING', 'TOP-20260928-002');
  const matchingNumbers = sourceTopping && sourceTopping.jumlahStikHijau === 500 && sourceTopping.jumlahPerisai === 120;

  reportTest(
    'IT-ASB-07',
    Boolean(matchingNumbers),
    'Topping/Kebun Entres: Jumlah Stik Hijau = 500 dan Jumlah Perisai = 120 matching',
    `Stik Hijau: ${sourceTopping?.jumlahStikHijau}, Perisai: ${sourceTopping?.jumlahPerisai}`
  );
}

// ---------------------------------------------------------------------------------------------
// IT-ASB-08: Approve Transaction
// ---------------------------------------------------------------------------------------------
{
  const approved = approveVerification({
    referenceType: 'OKULASI',
    referenceId: 'OKL-20260927-001',
    notes: 'Disetujui lengkap',
    currentUser: asbTanahBesihDiv1
  });

  const isApproved = approved && approved.verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI;
  const verifRecord = getVerificationByReference('OKULASI', 'OKL-20260927-001');

  reportTest(
    'IT-ASB-08',
    isApproved && verifRecord && verifRecord.verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI,
    'Approve transaction: status berubah menjadi TERVERIFIKASI sesuai existing contract',
    `Status: ${verifRecord?.verificationStatus}, VRF No: ${verifRecord?.verificationNo}`
  );
}

// ---------------------------------------------------------------------------------------------
// IT-ASB-09: Return Transaction
// ---------------------------------------------------------------------------------------------
{
  const returned = returnVerification({
    referenceType: 'PRESENSI',
    referenceId: 'ATT-20260928-001',
    returnReason: 'Jumlah kehadiran tidak sesuai dengan absensi fisik mandor.',
    currentUser: asbTanahBesihDiv1
  });

  const isReturned = returned && returned.verificationStatus === VERIFICATION_STATUS.DIKEMBALIKAN;
  const verifRecord = getVerificationByReference('PRESENSI', 'ATT-20260928-001');

  reportTest(
    'IT-ASB-09',
    isReturned && verifRecord && verifRecord.verificationStatus === VERIFICATION_STATUS.DIKEMBALIKAN,
    'Return transaction: status berubah menjadi DIKEMBALIKAN dengan alasan revisi',
    `Status: ${verifRecord?.verificationStatus}, Reason: ${verifRecord?.returnReason}`
  );
}

// ---------------------------------------------------------------------------------------------
// IT-ASB-10: Reference Resolver Exact Match
// ---------------------------------------------------------------------------------------------
{
  const exactMatch = findSourceRecord('TOPPING', 'TOP-20260928-002');
  const nonExistent = findSourceRecord('TOPPING', 'TOP-NON-EXISTENT');

  reportTest(
    'IT-ASB-10',
    exactMatch !== null && nonExistent === null && exactMatch.id === 'TOP-20260928-002',
    'Reference resolver melakukan exact match dengan scope referenceType',
    `Match: ${exactMatch?.id}, Non-existent: ${nonExistent}`
  );
}

// ---------------------------------------------------------------------------------------------
// IT-ASB-11: Cross-Module Identifier Collision Prevention
// ---------------------------------------------------------------------------------------------
{
  // Seed another module with the exact same ID "TOP-20260928-002"
  storage.set('material_usage_transactions', [
    {
      id: 'TOP-20260928-002',
      docNo: 'MAT-COLLISION-001',
      materialName: 'Pupuk NPK',
      estateId: 'Tanah Besih',
      divisionId: 'Divisi I'
    }
  ]);

  const resolvedTopping = findSourceRecord('TOPPING', 'TOP-20260928-002');
  const resolvedMaterial = findSourceRecord('MATERIAL', 'TOP-20260928-002');

  const correctlyScoped = resolvedTopping && resolvedTopping.jumlahStikHijau === 500 &&
    resolvedMaterial && resolvedMaterial.materialName === 'Pupuk NPK';

  reportTest(
    'IT-ASB-11',
    Boolean(correctlyScoped),
    'Cross-module identifier collision tidak salah resolve karena referenceType menjadi hard scope',
    `Topping resolved store: ${resolvedTopping?._storeKey}, Material resolved store: ${resolvedMaterial?._storeKey}`
  );
}

// ---------------------------------------------------------------------------------------------
// IT-ASB-12: Ambiguous Candidate Tidak Dipilih Arbitrer
// ---------------------------------------------------------------------------------------------
{
  const nonMatch = findSourceRecord('PRESENSI', 'INVALID-KEY-999');
  reportTest(
    'IT-ASB-12',
    nonMatch === null,
    'Ambiguous / non-matching candidate tidak dipilih secara arbitrer (returns null)',
    `Result: ${nonMatch}`
  );
}

// ---------------------------------------------------------------------------------------------
// IT-ASB-13: Estate Isolation: Tanah Besih Tidak Melihat Kebun Lain
// ---------------------------------------------------------------------------------------------
{
  // Seed record for Aek Pamingke
  const allVerifs = getAllVerifications();
  allVerifs.push({
    verificationId: 'VRF-APM-999',
    verificationNo: 'VRF-APM-999',
    referenceType: 'PENYEMAIAN',
    referenceId: 'SEED-APM-001',
    referenceDocNo: 'SEED-APM-001',
    estateId: 'Aek Pamingke',
    divisionId: 'Divisi I',
    verificationStatus: VERIFICATION_STATUS.MENUNGGU_VERIFIKASI
  });
  storage.set(VERIFICATION_STORAGE_KEY, allVerifs);

  const tbsActionable = getActionableRecordsForAsb(asbTanahBesihDiv1);
  const leaksApm = tbsActionable.some(a => a.estateId === 'Aek Pamingke' || a.referenceDocNo === 'SEED-APM-001');

  reportTest(
    'IT-ASB-13',
    !leaksApm,
    'Estate isolation: Asisten Tanah Besih tidak dapat melihat data dari kebun lain (Aek Pamingke)',
    `TBS actionable count: ${tbsActionable.length}`
  );
}

// ---------------------------------------------------------------------------------------------
// IT-ASB-14: Division Isolation: Divisi I Tidak Melihat Divisi II
// ---------------------------------------------------------------------------------------------
{
  // Seed record for Tanah Besih Divisi II
  const allVerifs = getAllVerifications();
  allVerifs.push({
    verificationId: 'VRF-TBS-DIV2',
    verificationNo: 'VRF-TBS-DIV2',
    referenceType: 'PENYEMAIAN',
    referenceId: 'SEED-TBS-DIV2-001',
    referenceDocNo: 'SEED-TBS-DIV2-001',
    estateId: 'Tanah Besih',
    divisionId: 'Divisi II',
    verificationStatus: VERIFICATION_STATUS.MENUNGGU_VERIFIKASI
  });
  storage.set(VERIFICATION_STORAGE_KEY, allVerifs);

  const div1Actionable = getActionableRecordsForAsb(asbTanahBesihDiv1);
  const leaksDiv2 = div1Actionable.some(a => a.divisionId === 'Divisi II');

  reportTest(
    'IT-ASB-14',
    !leaksDiv2,
    'Division isolation: Asisten Divisi I tidak dapat melihat data dari Divisi II',
    `Div1 items: ${div1Actionable.map(a => a.divisionId).join(', ')}`
  );
}

// ---------------------------------------------------------------------------------------------
// IT-ASB-15: Role Switch: Dataset Mengikuti Context Aktif
// ---------------------------------------------------------------------------------------------
{
  const div1List = getActionableRecordsForAsb(asbTanahBesihDiv1);
  const div2List = getActionableRecordsForAsb(asbTanahBesihDiv2);
  const apmList = getActionableRecordsForAsb(asbAekPamingkeDiv1);

  const contextSwitchCorrect = div1List.every(i => i.estateId === 'Tanah Besih' && i.divisionId === 'Divisi I') &&
    div2List.every(i => i.estateId === 'Tanah Besih' && i.divisionId === 'Divisi II') &&
    apmList.every(i => i.estateId === 'Aek Pamingke' && i.divisionId === 'Divisi I');

  reportTest(
    'IT-ASB-15',
    Boolean(contextSwitchCorrect),
    'Role switch: dataset otomatis menyesuaikan dengan active estate dan division context',
    `Div1: ${div1List.length}, Div2: ${div2List.length}, APM: ${apmList.length}`
  );
}

// ---------------------------------------------------------------------------------------------
// IT-ASB-16: Mantri Tanah Besih Divisi I -> Hanya Asisten Tanah Besih Divisi I yang Melihat
// ---------------------------------------------------------------------------------------------
{
  const canSee = getActionableRecordsForAsb(asbTanahBesihDiv1).some(a => a.referenceDocNo === 'TOP-20260928-002');
  const cannotSeeDiv2 = !getActionableRecordsForAsb(asbTanahBesihDiv2).some(a => a.referenceDocNo === 'TOP-20260928-002');
  const cannotSeeApm = !getActionableRecordsForAsb(asbAekPamingkeDiv1).some(a => a.referenceDocNo === 'TOP-20260928-002');

  reportTest(
    'IT-ASB-16',
    canSee && cannotSeeDiv2 && cannotSeeApm,
    'Mantri Tanah Besih Divisi I hanya terlihat oleh Asisten Tanah Besih Divisi I',
    `ASB TBS-1: ${canSee}, ASB TBS-2: ${cannotSeeDiv2}, ASB APM-1: ${cannotSeeApm}`
  );
}

// ---------------------------------------------------------------------------------------------
// IT-ASB-17: Tinjau Data Hari Ini Hanya Berisi Transaction yang Sudah Selesai Diverifikasi
// ---------------------------------------------------------------------------------------------
{
  const verifiedList = getVerifiedTransactionsByScope(asbTanahBesihDiv1);
  const allStatusTerverifikasi = verifiedList.every(v => v.verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI);
  const containsOnlyVerified = verifiedList.length > 0 && allStatusTerverifikasi;

  reportTest(
    'IT-ASB-17',
    Boolean(containsOnlyVerified),
    'Tinjau Data Hari Ini hanya berisi transaksi yang berstatus TERVERIFIKASI',
    `Verified count: ${verifiedList.length} (${verifiedList.map(v => v.referenceDocNo).join(', ')})`
  );
}

// ---------------------------------------------------------------------------------------------
// IT-ASB-18: Tinjau Data Menggunakan Scope Estate + Division
// ---------------------------------------------------------------------------------------------
{
  const tbsVerified = getVerifiedTransactionsByScope(asbTanahBesihDiv1);
  const allTbsDiv1 = tbsVerified.every(v => v.estateId === 'Tanah Besih' && v.divisionId === 'Divisi I');

  reportTest(
    'IT-ASB-18',
    Boolean(allTbsDiv1),
    'Tinjau Data Hari Ini strictly terisolasi dalam scope estate dan division aktif',
    `Scope: ${tbsVerified.map(v => `${v.estateId}-${v.divisionId}`).join(', ')}`
  );
}

// ---------------------------------------------------------------------------------------------
// IT-ASB-19: Tinjau Data Menampilkan Data Transaction yang Sama
// ---------------------------------------------------------------------------------------------
{
  const verifiedList = getVerifiedTransactionsByScope(asbTanahBesihDiv1);
  const oklVerif = verifiedList.find(v => v.referenceDocNo === 'OKL-20260927-001');
  const oklSource = findSourceRecord('OKULASI', 'OKL-20260927-001');

  const sameData = oklVerif && oklSource && oklVerif.referenceDocNo === oklSource.docNo &&
    oklVerif.rawRecord.jumlahMataOkulasi === oklSource.jumlahMataOkulasi;

  reportTest(
    'IT-ASB-19',
    Boolean(sameData),
    'Tinjau Data Hari Ini menampilkan data transaksi yang persis sama dengan source',
    `Doc: ${oklVerif?.referenceDocNo} vs ${oklSource?.docNo}`
  );
}

// ---------------------------------------------------------------------------------------------
// IT-ASB-20: Kirim Data ke Server Disabled Jika Requirement Belum Terpenuhi
// ---------------------------------------------------------------------------------------------
{
  // Saat ini masih ada transaksi TOPPING yang statusnya MENUNGGU_VERIFIKASI di TBS Divisi I
  const canSend = canSubmitFinalVerificationToServer(asbTanahBesihDiv1);

  reportTest(
    'IT-ASB-20',
    canSend === false,
    'Kirim Data ke Server bernilai FALSE (disabled) jika masih ada transaksi pending/belum diverifikasi',
    `canSend: ${canSend}`
  );
}

// ---------------------------------------------------------------------------------------------
// IT-ASB-21: Kirim Data ke Server Aktif Setelah Requirement Terpenuhi
// ---------------------------------------------------------------------------------------------
{
  // Approve seluruh sisa pending transaksi untuk TBS Divisi I
  approveVerification({
    referenceType: 'TOPPING',
    referenceId: 'TOP-20260928-002',
    notes: 'Approved for server submission',
    currentUser: asbTanahBesihDiv1
  });

  // Re-approve ATT-20260928-001 agar tidak ada pending
  approveVerification({
    referenceType: 'PRESENSI',
    referenceId: 'ATT-20260928-001',
    notes: 'Presensi approved',
    currentUser: asbTanahBesihDiv1
  });

  const canSendNow = canSubmitFinalVerificationToServer(asbTanahBesihDiv1);
  let submitResult = null;
  if (canSendNow) {
    submitResult = submitFinalVerificationToServer(asbTanahBesihDiv1);
  }

  reportTest(
    'IT-ASB-21',
    canSendNow === true && submitResult && submitResult.success === true,
    'Kirim Data ke Server aktif dan berhasil dieksekusi setelah seluruh transaksi terverifikasi',
    `canSendNow: ${canSendNow}, Synced: ${submitResult?.syncedCount}`
  );
}

// ---------------------------------------------------------------------------------------------
// IT-ASB-22: Selection I -> II -> III Existing Gate Tetap Bekerja
// ---------------------------------------------------------------------------------------------
{
  // Test Selection Gate: Seleksi I -> Seleksi II -> Seleksi III
  storage.set('pre_grafting_selection_documents', [
    {
      id: 'DOC-SEL-1',
      docNo: 'SEL-20260928-001',
      selectionStage: 'SELEKSI_I',
      batchCode: 'Batch-01',
      totalLayak: 1000,
      totalAfkir: 50,
      status: 'DISETUJUI',
      isFinal: true
    },
    {
      id: 'DOC-SEL-2',
      docNo: 'SEL-20260928-002',
      selectionStage: 'SELEKSI_II',
      batchCode: 'Batch-01',
      totalLayak: 950,
      totalAfkir: 50,
      status: 'DISETUJUI',
      isFinal: true
    },
    {
      id: 'DOC-SEL-3',
      docNo: 'SEL-20260928-003',
      selectionStage: 'SELEKSI_III',
      batchCode: 'Batch-01',
      totalLayak: 900,
      totalAfkir: 50,
      status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
      isFinal: false
    }
  ]);

  const approvedS3 = approvePreGraftingSelectionDocument('DOC-SEL-3', '', asbTanahBesihDiv1);
  const s3Doc = getPreGraftingSelectionDocumentById('DOC-SEL-3');

  const s3Approved = s3Doc && s3Doc.status === 'DISETUJUI' && s3Doc.isFinal === true;

  reportTest(
    'IT-ASB-22',
    Boolean(s3Approved),
    'Selection I -> II -> III existing gate tetap bekerja tanpa perubahan',
    `Doc-3 Status: ${s3Doc?.status}, isFinal: ${s3Doc?.isFinal}`
  );
}

// ---------------------------------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------------------------------
console.log('\n================================================================================');
console.log(`   TOTAL TESTS: ${totalPassed + totalFailed} | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
console.log('================================================================================\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL INTEGRATION TESTS (IT-ASB-01 TO IT-ASB-22) PASSED 100% SUCCESSFULLY!\n');
}
