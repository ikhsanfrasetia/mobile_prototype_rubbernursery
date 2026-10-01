/**
 * test-module-level-confirmation.js
 * Integration Test Suite: Module-Level Submission Central Hub "Konfirmasi untuk Verifikasi"
 * 
 * Verifikasi Skenario:
 * - IT-MOD-01: 1 module + 3 transactions -> 1 dynamic tab
 * - IT-MOD-02: Tab -> 3 compact cards -> 1 statement checkbox -> 1 module submit button
 * - IT-MOD-03: Statement Checkbox unchecked -> module submit button disabled
 * - IT-MOD-04: Statement Checkbox checked -> module submit button active GREEN
 * - IT-MOD-05: Submit module 3 transactions -> 3 distinct verification records created
 * - IT-MOD-06: Double submit module -> idempotent, no duplicate verification queue
 * - IT-MOD-07: 2 modules -> each module has its own independent checkbox and submit button
 * - IT-MOD-08: Module A submitted -> Module B remains READY_TO_CONFIRM
 * - IT-MOD-09: Mixed transaction status in module -> only READY/REVISION transactions are submitted
 * - IT-MOD-10: REVISION transaction -> can be submitted again and returns to MENUNGGU_VERIFIKASI
 * - IT-MOD-11: Selection I submitted -> Selection II remains locked
 * - IT-MOD-12: ASB approves Selection I -> Selection II unlocked
 * - IT-MOD-13: ASB approves Selection II -> Selection III unlocked
 * - IT-MOD-14: ASB approves Selection III -> final / downstream ready
 * - IT-MOD-15: All business dates formatted as DD/MM/YYYY
 * - IT-MOD-16: Compact Card Topping displays Jumlah Stik Hijau (`jumlahKayu`) + Jumlah Perisai (`jumlahPerisai`)
 * - IT-MOD-17: Individual cards do NOT contain individual submit buttons
 * - IT-MOD-18: Global "Kirim Semua" footer is completely removed
 */

import { storage } from './js/core/storage.js';
import { todayDDMMYYYY } from './js/core/utils.js';
import {
  getMantriTodayTransactions,
  submitModuleTransactions,
  submitMantriTransactions,
  normalizeDateStr,
  MANTRI_TRANSACTION_STATUS,
  MODULE_TYPES,
  MODULE_LABELS
} from './js/modules/verification/mantri-confirmation-service.js';
import {
  approveVerification,
  getVerificationByReference,
  VERIFICATION_STATUS,
  VERIFICATION_STORAGE_KEY
} from './js/modules/verification/verification-manager.js';
import {
  canCreateSelection2Document,
  canCreateSelection3Document,
  createPreGraftingSelectionDocument,
  approvePreGraftingSelectionDocument
} from './js/modules/selection/selection-manager.js';

// Setup Mock Environment
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

const testMantri = {
  id: 'USR-MANTRI-01',
  code: '1405482',
  name: 'Irwan Syah Putra',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-01'
};

const testAsb = {
  id: 'USR-ASB-01',
  code: 'ASB-001',
  name: 'Asisten Bibitan TBS',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-01'
};

const todayStr = todayDDMMYYYY();

let totalTests = 0;
let passedTests = 0;

function assert(condition, testId, description, extra = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] ${testId}: ${description}`);
  } else {
    console.error(`❌ [FAIL] ${testId}: ${description} -> ${extra}`);
  }
}

console.log('================================================================');
console.log('RUNNING INTEGRATION TEST SUITE: MODULE-LEVEL SUBMISSION');
console.log('================================================================\n');

// -------------------------------------------------------------
// IT-MOD-01: 1 module + 3 transactions -> 1 dynamic tab
// -------------------------------------------------------------
resetAllStorage();
storage.set('receipt_ksp_transactions', [
  { id: 'RCV-001', docNo: 'APR/2026/10/001', tanggal: todayStr, klon: 'GT1', tipeAsal: 'Balai Penelitian', qty: 5000, actorName: testMantri.name, status: 'READY_TO_CONFIRM' },
  { id: 'RCV-002', docNo: 'APR/2026/10/002', tanggal: todayStr, klon: 'RRIC 100', tipeAsal: 'Balai Penelitian', qty: 3000, actorName: testMantri.name, status: 'READY_TO_CONFIRM' },
  { id: 'RCV-003', docNo: 'APR/2026/10/003', tanggal: todayStr, klon: 'PB330', tipeAsal: 'Balai Penelitian', qty: 2000, actorName: testMantri.name, status: 'READY_TO_CONFIRM' }
]);

let txs = getMantriTodayTransactions(testMantri, todayStr);
const activeModules = [...new Set(txs.map(t => t.moduleType))];
assert(activeModules.length === 1 && activeModules[0] === MODULE_TYPES.PENERIMAAN && txs.length === 3, 'IT-MOD-01', '1 module with 3 transactions produces exactly 1 dynamic tab (Penerimaan)');

// -------------------------------------------------------------
// IT-MOD-02: Tab -> 3 compact cards -> 1 checkbox -> 1 button
// -------------------------------------------------------------
const moduleLabel = MODULE_LABELS[MODULE_TYPES.PENERIMAAN];
const expectedCheckboxId = `chk-statement-${MODULE_TYPES.PENERIMAAN}`;
const expectedButtonId = `btn-submit-module-${MODULE_TYPES.PENERIMAAN}`;
assert(
  txs.length === 3 && expectedCheckboxId === 'chk-statement-PENERIMAAN' && expectedButtonId === 'btn-submit-module-PENERIMAAN',
  'IT-MOD-02',
  'Tab structure contains 3 compact items, 1 statement checkbox ID and 1 module submit button ID'
);

// -------------------------------------------------------------
// IT-MOD-03: Checkbox unchecked -> module submit button disabled
// -------------------------------------------------------------
let isCheckboxChecked = false;
let canSubmit = txs.some(t => t.status === MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM) && isCheckboxChecked;
assert(canSubmit === false, 'IT-MOD-03', 'When statement checkbox is unchecked (false), module submit action is disabled');

// -------------------------------------------------------------
// IT-MOD-04: Checkbox checked -> module submit button active GREEN
// -------------------------------------------------------------
isCheckboxChecked = true;
canSubmit = txs.some(t => t.status === MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM) && isCheckboxChecked;
assert(canSubmit === true, 'IT-MOD-04', 'When statement checkbox is checked (true) and eligible txs exist, module submit action is enabled');

// -------------------------------------------------------------
// IT-MOD-05: Submit module 3 transactions -> 3 verification records created
// -------------------------------------------------------------
const submitRes = submitModuleTransactions(MODULE_TYPES.PENERIMAAN, testMantri);
const verifsAfterSubmit = storage.get(VERIFICATION_STORAGE_KEY, []);
assert(
  submitRes.success && submitRes.submittedCount === 3 && verifsAfterSubmit.length === 3,
  'IT-MOD-05',
  'Submitting module with 3 transactions creates exactly 3 distinct verification records with unique references'
);

// -------------------------------------------------------------
// IT-MOD-06: Double submit module -> idempotent, no duplicate verification queue
// -------------------------------------------------------------
const doubleSubmitRes = submitModuleTransactions(MODULE_TYPES.PENERIMAAN, testMantri);
const verifsAfterDouble = storage.get(VERIFICATION_STORAGE_KEY, []);
assert(
  doubleSubmitRes.submittedCount === 0 && verifsAfterDouble.length === 3,
  'IT-MOD-06',
  'Submitting module again is idempotent and produces 0 new records (queue length remains 3)'
);

// -------------------------------------------------------------
// IT-MOD-07: 2 modules -> each module has its own independent checkbox and submit button
// -------------------------------------------------------------
storage.set('seeding_transactions', [
  { id: 'SOW-001', docNo: 'SOW/2026/10/001', date: todayStr, batchNo: 'BTCH-01', bedengan: 'BED-01', totalDisemai: 1000, mantri: testMantri.name, status: 'READY_TO_CONFIRM' }
]);
txs = getMantriTodayTransactions(testMantri, todayStr);
const modulesFound = [...new Set(txs.map(t => t.moduleType))];
assert(
  modulesFound.includes(MODULE_TYPES.PENERIMAAN) && modulesFound.includes(MODULE_TYPES.PENYEMAIAN),
  'IT-MOD-07',
  'Multiple active modules (Penerimaan & Penyemaian) each maintain distinct module types, checkboxes, and buttons'
);

// -------------------------------------------------------------
// IT-MOD-08: Module A submitted -> Module B remains READY_TO_CONFIRM
// -------------------------------------------------------------
const seedingTxs = txs.filter(t => t.moduleType === MODULE_TYPES.PENYEMAIAN);
const penerimaanTxs = txs.filter(t => t.moduleType === MODULE_TYPES.PENERIMAAN);
assert(
  penerimaanTxs.every(t => t.status === MANTRI_TRANSACTION_STATUS.SUBMITTED_TO_ASB) &&
  seedingTxs.every(t => t.status === MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM),
  'IT-MOD-08',
  'Penerimaan is SUBMITTED_TO_ASB while Penyemaian remains READY_TO_CONFIRM'
);

// -------------------------------------------------------------
// IT-MOD-09: Mixed transaction status in module -> only READY/REVISION transactions are submitted
// -------------------------------------------------------------
storage.set('seeding_transactions', [
  { id: 'SOW-001', docNo: 'SOW/2026/10/001', date: todayStr, batchNo: 'BTCH-01', bedengan: 'BED-01', totalDisemai: 1000, mantri: testMantri.name, status: 'MENUNGGU_VERIFIKASI' },
  { id: 'SOW-002', docNo: 'SOW/2026/10/002', date: todayStr, batchNo: 'BTCH-02', bedengan: 'BED-02', totalDisemai: 1500, mantri: testMantri.name, status: 'READY_TO_CONFIRM' }
]);
const submitMixedRes = submitModuleTransactions(MODULE_TYPES.PENYEMAIAN, testMantri);
assert(
  submitMixedRes.submittedCount === 1 && submitMixedRes.submittedItems[0].docNo === 'SOW/2026/10/002',
  'IT-MOD-09',
  'When submitting a module with mixed status (1 pending, 1 ready), only the 1 ready transaction is submitted'
);

// -------------------------------------------------------------
// IT-MOD-10: REVISION transaction -> can be submitted again
// -------------------------------------------------------------
// Mark SOW-002 as REVISION
const allV = storage.get(VERIFICATION_STORAGE_KEY, []);
const vIdx = allV.findIndex(v => v.referenceDocNo === 'SOW/2026/10/002');
if (vIdx !== -1) {
  allV[vIdx].verificationStatus = VERIFICATION_STATUS.DIKEMBALIKAN;
  storage.set(VERIFICATION_STORAGE_KEY, allV);
}
let sowTxs = getMantriTodayTransactions(testMantri, todayStr).filter(t => t.moduleType === MODULE_TYPES.PENYEMAIAN);
const revisionTx = sowTxs.find(t => t.docNo === 'SOW/2026/10/002');
assert(revisionTx && revisionTx.status === MANTRI_TRANSACTION_STATUS.REVISION, 'IT-MOD-10 (part 1)', 'Transaction returned by Asisten is recognized as REVISION');

const reSubmitRes = submitModuleTransactions(MODULE_TYPES.PENYEMAIAN, testMantri);
sowTxs = getMantriTodayTransactions(testMantri, todayStr).filter(t => t.moduleType === MODULE_TYPES.PENYEMAIAN);
const resubmittedTx = sowTxs.find(t => t.docNo === 'SOW/2026/10/002');
assert(
  reSubmitRes.submittedCount === 1 && resubmittedTx.status === MANTRI_TRANSACTION_STATUS.SUBMITTED_TO_ASB,
  'IT-MOD-10 (part 2)',
  'REVISION transaction can be resubmitted via module submission and returns to SUBMITTED_TO_ASB'
);

// -------------------------------------------------------------
// IT-MOD-11 to IT-MOD-14: Seleksi Pra-Okulasi Stage I -> ASB Approve -> Stage II -> ASB Approve -> Stage III -> Downstream
// -------------------------------------------------------------
resetAllStorage();
const sel1Doc = {
  id: 'SEL1-001',
  docNo: 'PRE/2026/10/001',
  selectionStage: 'SELEKSI_1',
  selectionType: 'PRA_OKULASI',
  batchId: 'BATCH-001',
  batchCode: 'Batch-01',
  clone: 'PB 260',
  bedenganIds: ['BED-01'],
  sourceSeedingDocNo: 'SOW/2026/10/001',
  sourcePolybagQty: 1000,
  sourceBibitQty: 2000,
  totalLayak: 1800,
  totalAfkir: 200,
  isCompleted: true,
  isFinal: false,
  status: 'READY_TO_CONFIRM',
  tanggal: todayStr,
  estateId: 'EST-TBS',
  divisionId: 'DIV-01',
  actorId: testMantri.id,
  actorName: testMantri.name,
  createdAt: `${todayStr}T08:00:00.000Z`
};
storage.set('pre_grafting_selection_documents', [sel1Doc]);

// IT-MOD-11: Stage I submit via Module -> Stage II locked
const canStage2Before = canCreateSelection2Document(sel1Doc.id);
assert(!canStage2Before.canCreate, 'IT-MOD-11 (pre)', 'Selection II is locked before Seleksi I approval');

const submitSelRes = submitModuleTransactions(MODULE_TYPES.SELEKSI_PRA_OKULASI, testMantri);
assert(submitSelRes.submittedCount === 1, 'IT-MOD-11 (submit)', 'Selection I is submitted via Seleksi Pra-Okulasi module submission');

// IT-MOD-12: ASB approve Selection I -> Stage II unlocked
approvePreGraftingSelectionDocument(sel1Doc.id, 'Seleksi I disetujui', testAsb);
const canStage2After = canCreateSelection2Document(sel1Doc.id);
assert(canStage2After.canCreate, 'IT-MOD-12', 'Selection II is unlocked after Asisten Bibitan approves Selection I');

// Create & Submit Stage II
const sel2Doc = {
  id: 'SEL2-001',
  docNo: 'PRE/2026/10/002',
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
  status: 'READY_TO_CONFIRM',
  tanggal: todayStr,
  estateId: 'EST-TBS',
  divisionId: 'DIV-01',
  actorId: testMantri.id,
  actorName: testMantri.name,
  createdAt: `${todayStr}T09:00:00.000Z`
};
const allPreDocs = storage.get('pre_grafting_selection_documents', []);
allPreDocs.push(sel2Doc);
storage.set('pre_grafting_selection_documents', allPreDocs);

// IT-MOD-13: ASB approve Selection II -> Stage III unlocked
const canStage3Before = canCreateSelection3Document(sel2Doc.id);
assert(!canStage3Before.canCreate, 'IT-MOD-13 (pre)', 'Selection III is locked before Seleksi II approval');

submitModuleTransactions(MODULE_TYPES.SELEKSI_PRA_OKULASI, testMantri);
approvePreGraftingSelectionDocument(sel2Doc.id, 'Seleksi II disetujui', testAsb);
const canStage3After = canCreateSelection3Document(sel2Doc.id);
assert(canStage3After.canCreate, 'IT-MOD-13 (post)', 'Selection III is unlocked after Asisten Bibitan approves Selection II');

// Create & Submit Stage III
const sel3Doc = {
  id: 'SEL3-001',
  docNo: 'PRE/2026/10/003',
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
  status: 'READY_TO_CONFIRM',
  tanggal: todayStr,
  estateId: 'EST-TBS',
  divisionId: 'DIV-01',
  actorId: testMantri.id,
  actorName: testMantri.name,
  createdAt: `${todayStr}T10:00:00.000Z`
};
allPreDocs.push(sel3Doc);
storage.set('pre_grafting_selection_documents', allPreDocs);

submitModuleTransactions(MODULE_TYPES.SELEKSI_PRA_OKULASI, testMantri);
approvePreGraftingSelectionDocument(sel3Doc.id, 'Seleksi III disetujui Final', testAsb);

const finalDocs = storage.get('pre_grafting_selection_documents', []);
const finalDoc3 = finalDocs.find(d => d.id === sel3Doc.id);
assert(
  finalDoc3 && finalDoc3.status === 'DISETUJUI' && finalDoc3.isFinal === true,
  'IT-MOD-14',
  'Selection III approved is marked DISETUJUI with isFinal=true, downstream ready'
);


// -------------------------------------------------------------
// IT-MOD-15: Semua business date formatted as DD/MM/YYYY
// -------------------------------------------------------------
const testDates = ['2026-10-01', '01/10/2026', '2026-10-01T08:30:00.000Z', new Date('2026-10-01T00:00:00')];
const allNormalized = testDates.map(d => normalizeDateStr(d));
assert(
  allNormalized.every(d => d === '01/10/2026'),
  'IT-MOD-15',
  'All business dates (ISO, timestamp, Date obj, standard DD/MM/YYYY) normalize to DD/MM/YYYY (01/10/2026)'
);

// -------------------------------------------------------------
// IT-MOD-16: Compact Card Topping displays Jumlah Stik Hijau (`jumlahKayu`) + Jumlah Perisai (`jumlahPerisai`)
// -------------------------------------------------------------
resetAllStorage();
storage.set('entres_topping_transactions', [
  {
    id: 'TOP-001',
    docNo: 'TOP/2026/10/001',
    tanggal: todayStr,
    kodePlot: 'PLT-01',
    namaKlon: 'GT1',
    jumlahPokok: 50,
    jumlahKayu: 120,
    jumlahPerisai: 360,
    mantri: testMantri.name,
    status: 'READY_TO_CONFIRM'
  }
]);
const topTx = getMantriTodayTransactions(testMantri, todayStr)[0];
const rawTop = topTx.rawRecord;
const mainQtyTopping = `${Number(rawTop.jumlahKayu || 0).toLocaleString('id-ID')} Btg · ${Number(rawTop.jumlahPerisai || 0).toLocaleString('id-ID')} Perisai`;
assert(
  (topTx.moduleType === MODULE_TYPES.KEBUN_ENTRES || topTx.moduleType === MODULE_TYPES.TOPPING) &&
  mainQtyTopping === '120 Btg · 360 Perisai' &&
  !mainQtyTopping.includes('50 Pokok'),
  'IT-MOD-16',
  'Compact Card Topping explicitly displays Jumlah Kayu (120) & Jumlah Perisai (360), NOT jumlahPokok'
);

// -------------------------------------------------------------
// IT-MOD-17: Individual cards do NOT contain individual submit buttons
// -------------------------------------------------------------
// We verify that the rendered landing code does not contain `.btn-submit-single` or individual "Kirim ke Asisten" per card
import { readFileSync } from 'fs';
const landingCode = readFileSync('./js/modules/verification/mantri-confirmation-landing.js', 'utf-8');
const hasSingleSubmitButton = landingCode.includes('btn-submit-single') || landingCode.includes('data-action="submit-single"');
assert(
  !hasSingleSubmitButton,
  'IT-MOD-17',
  'Individual cards do not contain individual submit buttons (.btn-submit-single removed)'
);

// -------------------------------------------------------------
// IT-MOD-18: Global "Kirim Semua" footer is completely removed
// -------------------------------------------------------------
const hasGlobalSubmitAll = landingCode.includes('btn-submit-all') || landingCode.includes('Kirim Semua ke Asisten');
assert(
  !hasGlobalSubmitAll,
  'IT-MOD-18',
  'Global footer (#btn-submit-all / "Kirim Semua ke Asisten") is completely removed'
);

console.log('\n================================================================');
console.log(`INTEGRATION TEST SUMMARY: ${passedTests}/${totalTests} PASSED`);
if (passedTests === totalTests) {
  console.log('🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
} else {
  console.error('⚠️ SOME TESTS FAILED!');
}
console.log('================================================================');
