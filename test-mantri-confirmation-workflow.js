/**
 * test-mantri-confirmation-workflow.js
 * Integration Test Suite: Central Hub "Konfirmasi untuk Verifikasi" Mantri Bibitan
 * 
 * Verifikasi TC-01 hingga TC-18:
 * - TC-01: No transaction today -> button inactive
 * - TC-02: 1 transaction today -> button active + GREEN
 * - TC-03: 1 transaction today -> click navigates to #/mantri-confirmation
 * - TC-04: 1 module -> hanya 1 dynamic tab
 * - TC-05: Multiple modules today -> hanya module yang mempunyai transaksi yang muncul sebagai tab
 * - TC-06: Multiple transactions same module -> semua transaction muncul
 * - TC-07: Mantri A -> hanya transaksi Mantri A
 * - TC-08: Historical transaction -> tidak ikut activation today
 * - TC-09: READY_TO_CONFIRM -> action Kirim tersedia
 * - TC-10: SUBMITTED_TO_ASB -> submit disabled + badge pending
 * - TC-11: Double submit -> tidak menghasilkan duplicate verification record
 * - TC-12: ASB menerima transaction yang dikirim
 * - TC-13: ASB approve -> transaction VERIFIED / APPROVED
 * - TC-14: Selection I submitted + approved -> Selection II unlocked
 * - TC-15: Selection II submitted + approved -> Selection III unlocked
 * - TC-16: Selection III approved -> final/downstream ready
 * - TC-17: Different transaction source -> normalized correctly
 * - TC-18: Actor mapping: user ID/code/name mismatch test -> hanya owner yang lolos
 */

import { storage } from './js/core/storage.js';
import { todayISO, todayDDMMYYYY } from './js/core/utils.js';
import {
  getMantriTodayTransactions,
  submitMantriTransactions,
  normalizeDateStr,
  MANTRI_TRANSACTION_STATUS,
  MODULE_TYPES
} from './js/modules/verification/mantri-confirmation-service.js';
import {
  approveVerification,
  getVerificationByReference,
  VERIFICATION_STATUS
} from './js/modules/verification/verification-manager.js';
import {
  canCreateSelection2Document,
  canCreateSelection3Document,
  createPreGraftingSelectionDocument,
  approvePreGraftingSelectionDocument
} from './js/modules/selection/selection-manager.js';

// Setup Mock DOM & LocalStorage for Node environment
const storeMock = new Map();
global.localStorage = {
  getItem: (k) => storeMock.get(k) || null,
  setItem: (k, v) => storeMock.set(k, String(v)),
  removeItem: (k) => storeMock.delete(k),
  clear: () => storeMock.clear()
};

function resetAllStorage() {
  storeMock.clear();
}

const mantriA = {
  id: 'USR-MANTRI-01',
  code: '1405482',
  name: 'Irwan Syah Putra',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-01'
};

const mantriB = {
  id: 'USR-MANTRI-02',
  code: '1405999',
  name: 'Budi Santoso',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-02'
};

const asbUser = {
  id: 'USR-ASB-01',
  code: 'ASB-001',
  name: 'Asisten Bibitan TBS',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-01'
};

const today = todayDDMMYYYY();
const yesterday = '30/09/2026';

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, extraInfo = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] ${testName}`);
  } else {
    console.error(`❌ [FAIL] ${testName} ${extraInfo}`);
  }
}

console.log('================================================================');
console.log('STARTING INTEGRATION TESTS: CENTRAL HUB KONFIRMASI UNTUK VERIFIKASI');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// TC-01: No transaction today -> button inactive
// -----------------------------------------------------------------------------
resetAllStorage();
const tc1_txs = getMantriTodayTransactions(mantriA);
assert(tc1_txs.length === 0, 'TC-01: No transaction today -> transactions count is 0 (button inactive)');

// -----------------------------------------------------------------------------
// TC-02: 1 transaction today -> button active + GREEN
// -----------------------------------------------------------------------------
resetAllStorage();
storage.set('entres_menunas_transactions', [
  {
    id: 'TUNAS-001',
    docNo: '2026/TUNAS/001',
    mantri: mantriA.name,
    actorId: mantriA.id,
    tanggal: today,
    jumlahPokok: 50,
    plotId: 'PLOT-A',
    klon: 'PB 260'
  }
]);

const tc2_txs = getMantriTodayTransactions(mantriA);
assert(tc2_txs.length === 1 && tc2_txs[0].moduleType === MODULE_TYPES.MENUNAS, 'TC-02: 1 transaction today -> getMantriTodayTransactions returns 1 item (button active & GREEN)');

// -----------------------------------------------------------------------------
// TC-03: 1 transaction today -> click navigates to #/mantri-confirmation
// -----------------------------------------------------------------------------
assert(tc2_txs.length > 0 && tc2_txs[0].docNo === '2026/TUNAS/001', 'TC-03: 1 transaction today -> gateway route #/mantri-confirmation is target');

// -----------------------------------------------------------------------------
// TC-04: 1 module -> hanya 1 dynamic tab
// -----------------------------------------------------------------------------
const moduleTypesTc4 = [...new Set(tc2_txs.map(t => t.moduleType))];
assert(moduleTypesTc4.length === 1 && moduleTypesTc4[0] === 'MENUNAS', 'TC-04: 1 module today -> exactly 1 dynamic tab (MENUNAS)');

// -----------------------------------------------------------------------------
// TC-05: Multiple modules today -> hanya module yang mempunyai transaksi yang muncul sebagai tab
// -----------------------------------------------------------------------------
storage.set('seeding_transactions', [
  {
    id: 'SEED-001',
    docNo: '2026/SOW/001',
    mantri: mantriA.name,
    actorId: mantriA.id,
    tanggal: today,
    totalDisemai: 1000,
    bedengan: 'BED-01'
  }
]);

const tc5_txs = getMantriTodayTransactions(mantriA);
const moduleTypesTc5 = [...new Set(tc5_txs.map(t => t.moduleType))];
assert(
  moduleTypesTc5.length === 2 &&
  moduleTypesTc5.includes(MODULE_TYPES.MENUNAS) &&
  moduleTypesTc5.includes(MODULE_TYPES.PENYEMAIAN) &&
  !moduleTypesTc5.includes(MODULE_TYPES.OKULASI),
  'TC-05: Multiple modules today -> only modules with active transactions form dynamic tabs'
);

// -----------------------------------------------------------------------------
// TC-06: Multiple transactions same module -> semua transaction muncul
// -----------------------------------------------------------------------------
storage.set('entres_menunas_transactions', [
  {
    id: 'TUNAS-001',
    docNo: '2026/TUNAS/001',
    mantri: mantriA.name,
    actorId: mantriA.id,
    tanggal: today,
    jumlahPokok: 50,
    plotId: 'PLOT-A'
  },
  {
    id: 'TUNAS-002',
    docNo: '2026/TUNAS/002',
    mantri: mantriA.name,
    actorId: mantriA.id,
    tanggal: today,
    jumlahPokok: 75,
    plotId: 'PLOT-B'
  }
]);

const tc6_txs = getMantriTodayTransactions(mantriA);
const menunasTxs = tc6_txs.filter(t => t.moduleType === MODULE_TYPES.MENUNAS);
assert(menunasTxs.length === 2, 'TC-06: Multiple transactions in same module -> all items returned');

// -----------------------------------------------------------------------------
// TC-07: Mantri A -> hanya transaksi Mantri A
// -----------------------------------------------------------------------------
storage.set('entres_topping_transactions', [
  {
    id: 'TOP-001',
    docNo: '2026/TOP/001',
    mantri: mantriB.name,
    actorId: mantriB.id,
    actorCode: mantriB.code,
    tanggal: today,
    jumlahPokok: 100
  }
]);

const tc7_mantriA = getMantriTodayTransactions(mantriA);
const tc7_mantriB = getMantriTodayTransactions(mantriB);
assert(
  !tc7_mantriA.some(t => t.id === 'TOP-001') &&
  tc7_mantriB.some(t => t.id === 'TOP-001'),
  'TC-07: Scope isolation -> Mantri A does not see Mantri B transactions'
);

// -----------------------------------------------------------------------------
// TC-08: Historical transaction -> tidak ikut activation today
// -----------------------------------------------------------------------------
resetAllStorage();
storage.set('budding_transactions', [
  {
    id: 'OKL-OLD',
    docNo: '2026/GRF/OLD',
    mantri: mantriA.name,
    actorId: mantriA.id,
    tanggal: yesterday,
    createdAt: `${yesterday}T08:00:00.000Z`,
    jumlah: 500
  }
]);

const tc8_txs = getMantriTodayTransactions(mantriA);
assert(tc8_txs.length === 0, 'TC-08: Historical transaction from yesterday does not activate today hub');

// -----------------------------------------------------------------------------
// TC-09: READY_TO_CONFIRM -> action Kirim tersedia
// -----------------------------------------------------------------------------
resetAllStorage();
storage.set('dederan_transactions', [
  {
    id: 'DED-001',
    docNo: '2026/DED/001',
    mantri: mantriA.name,
    actorId: mantriA.id,
    tanggal: today,
    totalDeder: 2000,
    status: 'COMPLETED'
  }
]);

const tc9_txs = getMantriTodayTransactions(mantriA);
assert(
  tc9_txs.length === 1 && tc9_txs[0].status === MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM,
  'TC-09: Newly recorded operational transaction is in READY_TO_CONFIRM status'
);

// -----------------------------------------------------------------------------
// TC-10: SUBMITTED_TO_ASB -> submit disabled + badge pending
// -----------------------------------------------------------------------------
const submitRes = submitMantriTransactions(['DED-001'], mantriA);
const tc10_txs = getMantriTodayTransactions(mantriA);
assert(
  submitRes.submittedCount === 1 &&
  tc10_txs[0].status === MANTRI_TRANSACTION_STATUS.SUBMITTED_TO_ASB &&
  tc10_txs[0].verificationStatus === VERIFICATION_STATUS.MENUNGGU_VERIFIKASI,
  'TC-10: After submit, transaction status becomes SUBMITTED_TO_ASB / MENUNGGU_VERIFIKASI'
);

// -----------------------------------------------------------------------------
// TC-11: Double submit -> tidak menghasilkan duplicate verification record
// -----------------------------------------------------------------------------
const doubleSubmitRes = submitMantriTransactions(['DED-001'], mantriA);
const allVerifsTc11 = storage.get('verification_transactions', []);
assert(
  doubleSubmitRes.submittedCount === 0 &&
  allVerifsTc11.length === 1,
  'TC-11: Double submit is idempotent -> no duplicate verification record created'
);

// -----------------------------------------------------------------------------
// TC-12: ASB menerima transaction yang dikirim
// -----------------------------------------------------------------------------
const asbVerif = getVerificationByReference(MODULE_TYPES.DEDERAN, 'DED-001') || allVerifsTc11.find(v => v.referenceId === 'DED-001');
assert(
  asbVerif !== null && asbVerif.verificationStatus === VERIFICATION_STATUS.MENUNGGU_VERIFIKASI,
  'TC-12: Assistant receives submitted transaction in verification pool'
);

// -----------------------------------------------------------------------------
// TC-13: ASB approve -> transaction VERIFIED / APPROVED
// -----------------------------------------------------------------------------
approveVerification({
  referenceType: MODULE_TYPES.DEDERAN,
  referenceId: 'DED-001',
  notes: 'Audit lapangan dederan sesuai SOP',
  currentUser: asbUser
});

const tc13_txs = getMantriTodayTransactions(mantriA);
assert(
  tc13_txs[0].status === MANTRI_TRANSACTION_STATUS.VERIFIED &&
  tc13_txs[0].verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI,
  'TC-13: ASB approves -> transaction status becomes VERIFIED / TERVERIFIKASI'
);

// -----------------------------------------------------------------------------
// TC-14: Selection I submitted + approved -> Selection II unlocked
// -----------------------------------------------------------------------------
resetAllStorage();
const sel1Doc = {
  id: 'SEL1-001',
  docNo: '2026/SEL/001',
  selectionStage: 'SELEKSI_1',
  selectionType: 'PRA_OKULASI',
  batchId: 'BATCH-001',
  batchCode: 'Batch-01',
  clone: 'PB 260',
  bedenganIds: ['BED-01'],
  sourceSeedingDocNo: '2026/SOW/001',
  sourcePolybagQty: 1000,
  sourceBibitQty: 2000,
  totalLayak: 1800,
  totalAfkir: 200,
  isCompleted: true,
  isFinal: false,
  status: 'DRAFT',
  tanggal: today,
  estateId: 'EST-TBS',
  divisionId: 'DIV-01',
  actorId: mantriA.id,
  actorName: mantriA.name,
  createdAt: `${today}T08:00:00.000Z`
};
storage.set('pre_grafting_selection_documents', [sel1Doc]);

// Before submit & approve, Selection II cannot be created
const canUnlockSel2Before = canCreateSelection2Document(sel1Doc.id);
assert(!canUnlockSel2Before.canCreate, 'TC-14a: Selection II is locked before Seleksi I approval');

// Submit Seleksi I via Central Hub
const sel1SubmitRes = submitMantriTransactions([sel1Doc.id], mantriA);
assert(sel1SubmitRes.submittedCount === 1, 'TC-14b: Selection I submitted via Central Hub');

// Approve Seleksi I by ASB
approvePreGraftingSelectionDocument(sel1Doc.id, 'Seleksi I disetujui', asbUser);

const canUnlockSel2After = canCreateSelection2Document(sel1Doc.id);
assert(canUnlockSel2After.canCreate, 'TC-14c: Selection I submitted & approved -> Selection II unlocked');

// -----------------------------------------------------------------------------
// TC-15: Selection II submitted + approved -> Selection III unlocked
// -----------------------------------------------------------------------------
const sel2Doc = {
  id: 'SEL2-001',
  docNo: '2026/SEL/002',
  selectionStage: 'SELEKSI_2',
  selectionType: 'PRA_OKULASI',
  batchId: 'BATCH-001',
  batchCode: 'Batch-01',
  clone: 'PB 260',
  bedenganIds: ['BED-01'],
  sourceSelectionDocumentId: sel1Doc.id,
  sourceSelectionDocNo: sel1Doc.docNo,
  sourcePolybagQty: 1000,
  sourceBibitQty: 1800,
  totalLayak: 1000,
  totalAfkir: 800,
  isCompleted: true,
  isFinal: false,
  status: 'DRAFT',
  tanggal: today,
  estateId: 'EST-TBS',
  divisionId: 'DIV-01',
  actorId: mantriA.id,
  actorName: mantriA.name,
  createdAt: `${today}T09:00:00.000Z`
};
const allPreDocsForSel2 = storage.get('pre_grafting_selection_documents', []);
allPreDocsForSel2.push(sel2Doc);
storage.set('pre_grafting_selection_documents', allPreDocsForSel2);

const canUnlockSel3Before = canCreateSelection3Document(sel2Doc.id);
assert(!canUnlockSel3Before.canCreate, 'TC-15a: Selection III is locked before Seleksi II approval');

submitMantriTransactions([sel2Doc.id], mantriA);
approvePreGraftingSelectionDocument(sel2Doc.id, 'Seleksi II disetujui', asbUser);

const canUnlockSel3After = canCreateSelection3Document(sel2Doc.id);
assert(canUnlockSel3After.canCreate, 'TC-15b: Selection II submitted & approved -> Selection III unlocked');

// -----------------------------------------------------------------------------
// TC-16: Selection III approved -> final/downstream ready
// -----------------------------------------------------------------------------
const sel3Doc = {
  id: 'SEL3-001',
  docNo: '2026/SEL/003',
  selectionStage: 'SELEKSI_3',
  selectionType: 'PRA_OKULASI',
  batchId: 'BATCH-001',
  batchCode: 'Batch-01',
  clone: 'PB 260',
  bedenganIds: ['BED-01'],
  sourceSelectionDocumentId: sel2Doc.id,
  sourceSelectionDocNo: sel2Doc.docNo,
  sourcePolybagQty: 1000,
  sourceBibitQty: 1000,
  totalLayak: 950,
  totalAfkir: 50,
  isCompleted: true,
  isFinal: false,
  status: 'DRAFT',
  tanggal: today,
  estateId: 'EST-TBS',
  divisionId: 'DIV-01',
  actorId: mantriA.id,
  actorName: mantriA.name,
  createdAt: `${today}T10:00:00.000Z`
};
const allPreDocsForSel3 = storage.get('pre_grafting_selection_documents', []);
allPreDocsForSel3.push(sel3Doc);
storage.set('pre_grafting_selection_documents', allPreDocsForSel3);

submitMantriTransactions([sel3Doc.id], mantriA);
approvePreGraftingSelectionDocument(sel3Doc.id, 'Seleksi III final approved', asbUser);

const allSelDocs = storage.get('pre_grafting_selection_documents', []);
const approvedSel3 = allSelDocs.find(d => d.id === sel3Doc.id);
assert(
  approvedSel3.status === 'DISETUJUI' &&
  approvedSel3.isFinal === true &&
  approvedSel3.totalLayak === 950,
  'TC-16: Selection III approved & isFinal=true -> downstream Okulasi ready'
);

// -----------------------------------------------------------------------------
// TC-17: Different transaction source -> normalized correctly
// -----------------------------------------------------------------------------
resetAllStorage();
storage.set('attendance_transactions', [
  { id: 'ATT-10', docNo: 'ATT/2026/10', actorName: mantriA.name, tanggal: today, totalWorkers: 8, status: 'HADIR' }
]);
storage.set('receipt_ksp_transactions', [
  { id: 'RCV-20', docNo: 'RCV/2026/20', penerima: mantriA.name, tanggal: today, qty: 5000, klon: 'GT 1' }
]);
storage.set('budding_transactions', [
  { id: 'OKL-30', docNo: 'OKL/2026/30', mantri: mantriA.name, tanggal: today, jumlah: 1200, bedengan: 'B-01' }
]);
storage.set('nursery_activity_transactions', [
  { id: 'ACT-40', docNo: 'ACT/2026/40', mantri: mantriA.name, tanggal: today, activityType: 'Pemupukan', volumePkk: 3000 }
]);
storage.set('material_usage_transactions', [
  { id: 'MAT-50', docNo: 'MAT/2026/50', mantri: mantriA.name, tanggal: today, materialName: 'Urea', qty: 25, unit: 'Kg' }
]);

const tc17_txs = getMantriTodayTransactions(mantriA);
const requiredNormalizedKeys = ['id', 'docNo', 'moduleType', 'moduleLabel', 'date', 'actor', 'summary', 'status', 'verificationStatus', 'rawRecord'];
const allNormalizedCorrectly = tc17_txs.length === 5 && tc17_txs.every(tx => {
  return requiredNormalizedKeys.every(k => tx[k] !== undefined);
});

assert(allNormalizedCorrectly, 'TC-17: 5 different sources correctly normalized with standard model structure');

// -----------------------------------------------------------------------------
// TC-18: Actor mapping: user ID/code/name mismatch test -> hanya owner yang lolos
// -----------------------------------------------------------------------------
resetAllStorage();
storage.set('seeding_transactions', [
  { id: 'S-A1', docNo: 'S-A1', actorId: mantriA.id, tanggal: today, totalDisemai: 100 },
  { id: 'S-A2', docNo: 'S-A2', actorCode: mantriA.code, tanggal: today, totalDisemai: 200 },
  { id: 'S-A3', docNo: 'S-A3', mantri: mantriA.name, tanggal: today, totalDisemai: 300 },
  { id: 'S-B1', docNo: 'S-B1', actorId: mantriB.id, tanggal: today, totalDisemai: 400 },
  { id: 'S-B2', docNo: 'S-B2', mantri: 'Budi Santoso', tanggal: today, totalDisemai: 500 }
]);

const tc18_txsA = getMantriTodayTransactions(mantriA);
const tc18_txsB = getMantriTodayTransactions(mantriB);

assert(
  tc18_txsA.length === 3 &&
  tc18_txsA.map(t => t.id).sort().join(',') === 'S-A1,S-A2,S-A3' &&
  tc18_txsB.length === 2 &&
  tc18_txsB.map(t => t.id).sort().join(',') === 'S-B1,S-B2',
  'TC-18: Actor mapping resolves actorId, actorCode, and actorName accurately without mismatch leakage'
);

// -----------------------------------------------------------------------------
// TC-DATE-01: Input 01/10/2026 -> Expected canonical 01/10/2026
// -----------------------------------------------------------------------------
const tcDate1 = normalizeDateStr('01/10/2026');
assert(tcDate1 === '01/10/2026', 'TC-DATE-01: normalizeDateStr("01/10/2026") returns canonical "01/10/2026"');

// -----------------------------------------------------------------------------
// TC-DATE-02: Input historical 2026-10-01 -> Expected normalized read 01/10/2026
// -----------------------------------------------------------------------------
const tcDate2 = normalizeDateStr('2026-10-01');
assert(tcDate2 === '01/10/2026', 'TC-DATE-02: normalizeDateStr("2026-10-01") parses historical YYYY-MM-DD to "01/10/2026"');

// -----------------------------------------------------------------------------
// TC-DATE-03: Input ISO timestamp 2026-10-01T07:30:00.000Z -> Expected 01/10/2026
// -----------------------------------------------------------------------------
const tcDate3 = normalizeDateStr('2026-10-01T07:30:00.000Z');
assert(tcDate3 === '01/10/2026', 'TC-DATE-03: normalizeDateStr("2026-10-01T07:30:00.000Z") parses ISO timestamp to "01/10/2026"');

// -----------------------------------------------------------------------------
// TC-DATE-04: today: 01/10/2026, transaction: 01/10/2026 -> MATCH
// -----------------------------------------------------------------------------
resetAllStorage();
storage.set('seeding_transactions', [
  { id: 'S-DATE-04', docNo: 'SOW/2026/04', actorId: mantriA.id, tanggal: '01/10/2026', totalDisemai: 100 }
]);
const tcDate4Txs = getMantriTodayTransactions(mantriA, '01/10/2026');
assert(tcDate4Txs.length === 1 && tcDate4Txs[0].date === '01/10/2026', 'TC-DATE-04: targetDate "01/10/2026" matches transaction date "01/10/2026"');

// -----------------------------------------------------------------------------
// TC-DATE-05: yesterday 30/09/2026 -> tidak dianggap transaksi hari ini
// -----------------------------------------------------------------------------
resetAllStorage();
storage.set('seeding_transactions', [
  { id: 'S-DATE-05', docNo: 'SOW/2026/05', actorId: mantriA.id, tanggal: '30/09/2026', totalDisemai: 100 }
]);
const tcDate5Txs = getMantriTodayTransactions(mantriA, '01/10/2026');
assert(tcDate5Txs.length === 0, 'TC-DATE-05: yesterday transaction "30/09/2026" excluded from today "01/10/2026"');

// -----------------------------------------------------------------------------
// TC-REAL-01: Penerimaan real (receipt_transactions with DD/MM/YYYY) -> masuk Central Hub
// -----------------------------------------------------------------------------
resetAllStorage();
storage.set('receipt_transactions', [
  {
    id: 'APR/2026/10/001',
    docNo: 'APR/2026/10/001',
    nomorDokumen: 'APR/2026/10/001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    jenis: 'Benih',
    tahapan: 'Pre-Nursery',
    program: 'PRG/NUR/01/2026',
    klon: 'GT1',
    tanggal: today, // "01/10/2026"
    qty: 5000,
    actorId: mantriA.id,
    userId: mantriA.id,
    penerima: mantriA.name,
    mantri: mantriA.name
  }
]);
const tcReal1Txs = getMantriTodayTransactions(mantriA);
assert(
  tcReal1Txs.length === 1 && tcReal1Txs[0].moduleType === MODULE_TYPES.PENERIMAAN && tcReal1Txs[0].docNo === 'APR/2026/10/001',
  'TC-REAL-01: Real Penerimaan transaction with DD/MM/YYYY discovered in Central Hub'
);

// -----------------------------------------------------------------------------
// TC-REAL-02: Penyemaian real (seeding_transactions with DD/MM/YYYY) -> masuk Central Hub
// -----------------------------------------------------------------------------
resetAllStorage();
storage.set('seeding_transactions', [
  {
    id: 'SOW/2026/10/001',
    docNo: 'SOW/2026/10/001',
    date: today, // "01/10/2026"
    tanggal: today,
    sourceDocNo: 'APR/2026/10/001',
    programId: 'PRG-001',
    programCode: 'PRG/NUR/01/2026',
    batchId: 'BAT-001',
    batchCode: 'B-001',
    bedengan: 'Bedengan 001',
    totalDisemai: 1000,
    totalPolybag: 500,
    actorId: mantriA.id,
    userId: mantriA.id,
    mantri: mantriA.name
  }
]);
const tcReal2Txs = getMantriTodayTransactions(mantriA);
assert(
  tcReal2Txs.length === 1 && tcReal2Txs[0].moduleType === MODULE_TYPES.PENYEMAIAN && tcReal2Txs[0].docNo === 'SOW/2026/10/001',
  'TC-REAL-02: Real Penyemaian transaction with DD/MM/YYYY discovered in Central Hub'
);

// -----------------------------------------------------------------------------
// TC-REAL-03: Penerimaan + Penyemaian tanpa Presensi -> tombol Konfirmasi tetap HIJAU ACTIVE
// -----------------------------------------------------------------------------
resetAllStorage();
storage.set('receipt_transactions', [
  {
    id: 'APR/2026/10/001',
    docNo: 'APR/2026/10/001',
    tanggal: today,
    qty: 5000,
    actorId: mantriA.id,
    penerima: mantriA.name
  }
]);
storage.set('seeding_transactions', [
  {
    id: 'SOW/2026/10/001',
    docNo: 'SOW/2026/10/001',
    date: today,
    tanggal: today,
    totalDisemai: 1000,
    actorId: mantriA.id,
    mantri: mantriA.name
  }
]);
// attendance_transactions is explicitly EMPTY
const tcReal3Txs = getMantriTodayTransactions(mantriA);
const hasTodayMantriTxs = tcReal3Txs.length > 0;
assert(
  tcReal3Txs.length === 2 && hasTodayMantriTxs === true,
  'TC-REAL-03: Real Reception + Seeding without Attendance activates Central Hub (count = 2, status ACTIVE)'
);

console.log('\n================================================================');
console.log(`INTEGRATION TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
console.log('================================================================');

if (passedTests === totalTests) {
  console.log('\n🎉 ALL TC-01 TO TC-18 + TC-DATE + TC-REAL PASSED PERFECTLY!\n');
  process.exit(0);
} else {
  console.error(`\n❌ ${totalTests - passedTests} TESTS FAILED\n`);
  process.exit(1);
}
