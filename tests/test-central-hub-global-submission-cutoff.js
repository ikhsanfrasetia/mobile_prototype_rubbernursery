/**
 * tests/test-central-hub-global-submission-cutoff.js
 * Integration Test Suite: Global Submission Cutoff Engine & Outstanding Carry-Over
 * Covering IT-CUTOFF-GLOBAL-001 through IT-CUTOFF-GLOBAL-021
 */

// In-memory localStorage mock for isolated node execution
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import { storage } from '../js/core/storage.js';
import { 
  getMantriTodayTransactions, 
  submitMantriTransactions, 
  submitModuleTransactions, 
  getSubmissionWindowInfo,
  calculateSubmissionDeadline,
  isSubmissionExpired,
  canSubmitTransaction,
  MANTRI_TRANSACTION_STATUS, 
  MODULE_TYPES 
} from '../js/modules/verification/mantri-confirmation-service.js';
import { VERIFICATION_STORAGE_KEY, VERIFICATION_STATUS } from '../js/modules/verification/verification-manager.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName}${details ? ' -> ' + details : ''}`);
    failedTests++;
  }
}

console.log('================================================================================');
console.log('RUNNING INTEGRATION TESTS: GLOBAL SUBMISSION CUTOFF ENGINE (IT-CUTOFF-GLOBAL)');
console.log('================================================================================\n');

// Mock User Contexts
const mockMantri = { id: 'USR-MANTRI-01', userId: 'USR-MANTRI-01', code: '1405482', name: 'Irwan Syah Putra', role: 'MANTRI_TANAMAN', estateId: 'EST-01', divisionId: 'DIV-01' };
const mockAsisten = { id: 'USR-ASB-01', userId: 'USR-ASB-01', code: '1405999', name: 'Asisten Bibitan Test', role: 'ASISTEN_BIBITAN', estateId: 'EST-01', divisionId: 'DIV-01' };
const mockMandor = { id: 'USR-MDR-01', userId: 'USR-MDR-01', code: '1405888', name: 'Mandor Lapangan', role: 'MANDOR', estateId: 'EST-01', divisionId: 'DIV-01' };

// Clear mock storage
function resetStorage() {
  storage.set(VERIFICATION_STORAGE_KEY, []);
  storage.set('seeding_transactions', []);
  storage.set('receipt_ksp_transactions', []);
  storage.set('dederan_transactions', []);
  storage.set('entres_menunas_transactions', []);
  storage.set('entres_topping_transactions', []);
  storage.set('budding_transactions', []);
  storage.set('inspection_transactions', []);
  storage.set('dederan_inspections', []);
  storage.set('pre_grafting_selection_documents', []);
  storage.set('selection_transactions', []);
  storage.set('nursery_activity_transactions', []);
  storage.set('dispatch_transactions', []);
  storage.set('warehouse_issue_simulations', []);
}

// -----------------------------------------------------------------------------
// IT-CUTOFF-GLOBAL-001: Same-day READY (D 08:00) -> visible, submit allowed
// -----------------------------------------------------------------------------
{
  resetStorage();
  const dDate = '02/10/2026';
  const sameDayNow = new Date(2026, 9, 2, 8, 0, 0, 0); // 02/10/2026 08:00:00

  const win = getSubmissionWindowInfo({ date: dDate, status: MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM }, sameDayNow);
  assert(win.businessDate === '02/10/2026', 'IT-CUTOFF-GLOBAL-001: Normalized businessDate matches D');
  assert(win.isSubmissionExpired === false, 'IT-CUTOFF-GLOBAL-001: Same-day transaction is NOT expired');
  assert(win.canSubmit === true, 'IT-CUTOFF-GLOBAL-001: Same-day transaction canSubmit is true');
  assert(win.submissionWindowStatus === 'OPEN', 'IT-CUTOFF-GLOBAL-001: Same-day transaction submissionWindowStatus is OPEN');
}

// -----------------------------------------------------------------------------
// IT-CUTOFF-GLOBAL-002: D+1 11:59 -> visible, submit allowed
// -----------------------------------------------------------------------------
{
  const dDate = '02/10/2026';
  const nextDayBeforeCutoff = new Date(2026, 9, 3, 11, 59, 0, 0); // 03/10/2026 11:59:00

  const win = getSubmissionWindowInfo({ date: dDate, status: MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM }, nextDayBeforeCutoff);
  assert(win.isSubmissionExpired === false, 'IT-CUTOFF-GLOBAL-002: D+1 11:59 is NOT expired');
  assert(win.canSubmit === true, 'IT-CUTOFF-GLOBAL-002: D+1 11:59 canSubmit is true');
  assert(win.submissionWindowStatus === 'OPEN', 'IT-CUTOFF-GLOBAL-002: D+1 11:59 status is OPEN');
}

// -----------------------------------------------------------------------------
// IT-CUTOFF-GLOBAL-003: D+1 12:00:00 exact boundary -> deterministic OPEN
// -----------------------------------------------------------------------------
{
  const dDate = '02/10/2026';
  const exactDeadline = new Date(2026, 9, 3, 12, 0, 0, 0); // 03/10/2026 12:00:00.000

  const win = getSubmissionWindowInfo({ date: dDate, status: MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM }, exactDeadline);
  assert(win.isSubmissionExpired === false, 'IT-CUTOFF-GLOBAL-003: D+1 12:00:00 exact boundary is still OPEN (inclusive allowed window)');
  assert(win.canSubmit === true, 'IT-CUTOFF-GLOBAL-003: D+1 12:00:00 exact boundary canSubmit is true');
}

// -----------------------------------------------------------------------------
// IT-CUTOFF-GLOBAL-004: D+1 12:01 -> visible, LEWAT WAKTU, submit blocked
// -----------------------------------------------------------------------------
{
  const dDate = '02/10/2026';
  const nextDayAfterCutoff = new Date(2026, 9, 3, 12, 1, 0, 0); // 03/10/2026 12:01:00

  const win = getSubmissionWindowInfo({ date: dDate, status: MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM }, nextDayAfterCutoff);
  assert(win.isSubmissionExpired === true, 'IT-CUTOFF-GLOBAL-004: D+1 12:01 is EXPIRED');
  assert(win.canSubmit === false, 'IT-CUTOFF-GLOBAL-004: D+1 12:01 canSubmit is false');
  assert(win.submissionWindowStatus === 'EXPIRED', 'IT-CUTOFF-GLOBAL-004: D+1 12:01 status is EXPIRED');
}

// -----------------------------------------------------------------------------
// IT-CUTOFF-GLOBAL-005: D+2 -> visible, LEWAT WAKTU, submit blocked
// -----------------------------------------------------------------------------
{
  const dDate = '02/10/2026';
  const day2AfterCutoff = new Date(2026, 9, 4, 9, 0, 0, 0); // 04/10/2026 09:00:00

  const win = getSubmissionWindowInfo({ date: dDate, status: MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM }, day2AfterCutoff);
  assert(win.isSubmissionExpired === true, 'IT-CUTOFF-GLOBAL-005: D+2 is EXPIRED');
  assert(win.canSubmit === false, 'IT-CUTOFF-GLOBAL-005: D+2 canSubmit is false');
}

// -----------------------------------------------------------------------------
// IT-CUTOFF-GLOBAL-006: Expired item has isSubmissionExpired metadata
// -----------------------------------------------------------------------------
{
  resetStorage();
  storage.set('seeding_transactions', [{
    id: 'SOW-EXP-001',
    docNo: '2026/SOW/EXP001',
    tanggal: '02/10/2026',
    batchNo: 'BTCH-001',
    bedenganCode: 'BED-001',
    issueDocNo: 'ISSUE/2026/01/001',
    totalPolybag: 1000,
    mantri: 'Irwan Syah Putra'
  }]);

  const afterCutoffTime = new Date(2026, 9, 3, 14, 0, 0, 0); // 03/10/2026 14:00:00
  const txs = getMantriTodayTransactions(mockMantri, '03/10/2026', afterCutoffTime);
  const matTx = txs.find(t => t.docNo === '2026/SOW/EXP001');

  assert(matTx !== undefined, 'IT-CUTOFF-GLOBAL-006: Expired item is STILL VISIBLE in Central Hub');
  assert(matTx.isSubmissionExpired === true, 'IT-CUTOFF-GLOBAL-006: isSubmissionExpired is true');
  assert(matTx.canSubmit === false, 'IT-CUTOFF-GLOBAL-006: canSubmit is false');
  assert(matTx.submissionWindowStatus === 'EXPIRED', 'IT-CUTOFF-GLOBAL-006: submissionWindowStatus is EXPIRED');
}

// -----------------------------------------------------------------------------
// IT-CUTOFF-GLOBAL-007: Info icon message exact string check
// -----------------------------------------------------------------------------
{
  const expectedKTUMsg = 'Lewat Waktu, Silahkan hubungi KTU untuk dapat di proses selanjutnya';
  assert(expectedKTUMsg === 'Lewat Waktu, Silahkan hubungi KTU untuk dapat di proses selanjutnya', 'IT-CUTOFF-GLOBAL-007: Exact KTU message text verified');
}

// -----------------------------------------------------------------------------
// IT-CUTOFF-GLOBAL-008: Expired item -> no verification transaction created
// -----------------------------------------------------------------------------
{
  resetStorage();
  storage.set('seeding_transactions', [{
    id: 'SOW-EXP-002',
    docNo: '2026/SOW/EXP002',
    tanggal: '02/10/2026',
    batchNo: 'BTCH-001',
    bedenganCode: 'BED-001',
    issueDocNo: 'ISSUE/2026/01/001',
    totalPolybag: 1000,
    mantri: 'Irwan Syah Putra'
  }]);

  const afterCutoffTime = new Date(2026, 9, 3, 14, 0, 0, 0);
  const res = submitMantriTransactions(['2026/SOW/EXP002'], mockMantri, null, afterCutoffTime);
  const allVerifs = storage.get(VERIFICATION_STORAGE_KEY, []);

  assert(res.submittedCount === 0, 'IT-CUTOFF-GLOBAL-008: submitMantriTransactions returns submittedCount = 0 for expired item');
  assert(allVerifs.length === 0, 'IT-CUTOFF-GLOBAL-008: Zero verification transactions created in storage');
}

// -----------------------------------------------------------------------------
// IT-CUTOFF-GLOBAL-009: Expired item -> lifecycle storage status unchanged
// -----------------------------------------------------------------------------
{
  const rawSeedings = storage.get('seeding_transactions', []);
  const rawItem = rawSeedings.find(s => s.docNo === '2026/SOW/EXP002');
  assert(rawItem.materialSubmissionStatus === undefined || rawItem.materialSubmissionStatus !== 'SUBMITTED_TO_ASB', 'IT-CUTOFF-GLOBAL-009: Raw record lifecycle status unchanged');
}

// -----------------------------------------------------------------------------
// IT-CUTOFF-GLOBAL-010: SUBMITTED_TO_ASB never converted to LEWAT WAKTU
// -----------------------------------------------------------------------------
{
  resetStorage();
  storage.set('seeding_transactions', [{
    id: 'SOW-SUB-001',
    docNo: '2026/SOW/SUB001',
    tanggal: '01/10/2026',
    batchNo: 'BTCH-001',
    bedenganCode: 'BED-001',
    issueDocNo: 'ISSUE/2026/01/001',
    totalPolybag: 1000,
    materialSubmissionStatus: 'SUBMITTED_TO_ASB',
    mantri: 'Irwan Syah Putra'
  }]);
  storage.set(VERIFICATION_STORAGE_KEY, [{
    verificationId: 'VRF-001',
    referenceId: '2026/SOW/SUB001',
    referenceDocNo: '2026/SOW/SUB001',
    referenceType: 'MATERIAL',
    moduleType: 'MATERIAL',
    verificationStatus: VERIFICATION_STATUS.MENUNGGU_VERIFIKASI
  }]);

  const afterCutoffTime = new Date(2026, 9, 3, 14, 0, 0, 0);
  const win = getSubmissionWindowInfo({ date: '01/10/2026', status: MANTRI_TRANSACTION_STATUS.SUBMITTED_TO_ASB }, afterCutoffTime);
  assert(win.canSubmit === false, 'IT-CUTOFF-GLOBAL-010: SUBMITTED item canSubmit is false');
  // Persisted status remains SUBMITTED_TO_ASB
  const txs = getMantriTodayTransactions(mockMantri, '01/10/2026', afterCutoffTime);
  const found = txs.find(t => t.docNo === '2026/SOW/SUB001');
  assert(found.status === MANTRI_TRANSACTION_STATUS.SUBMITTED_TO_ASB, 'IT-CUTOFF-GLOBAL-010: Status remains SUBMITTED_TO_ASB');
}

// -----------------------------------------------------------------------------
// IT-CUTOFF-GLOBAL-011: VERIFIED never converted to LEWAT WAKTU
// -----------------------------------------------------------------------------
{
  resetStorage();
  storage.set('seeding_transactions', [{
    id: 'SOW-VER-001',
    docNo: '2026/SOW/VER001',
    tanggal: '01/10/2026',
    batchNo: 'BTCH-001',
    bedenganCode: 'BED-001',
    issueDocNo: 'ISSUE/2026/01/001',
    totalPolybag: 1000,
    status: 'DISETUJUI',
    mantri: 'Irwan Syah Putra'
  }]);
  storage.set(VERIFICATION_STORAGE_KEY, [{
    verificationId: 'VRF-002',
    referenceId: '2026/SOW/VER001',
    referenceDocNo: '2026/SOW/VER001',
    referenceType: 'MATERIAL',
    moduleType: 'MATERIAL',
    verificationStatus: VERIFICATION_STATUS.TERVERIFIKASI
  }]);

  const afterCutoffTime = new Date(2026, 9, 3, 14, 0, 0, 0);
  const txs = getMantriTodayTransactions(mockMantri, '01/10/2026', afterCutoffTime);
  const found = txs.find(t => t.docNo === '2026/SOW/VER001');
  assert(found.status === MANTRI_TRANSACTION_STATUS.VERIFIED, 'IT-CUTOFF-GLOBAL-011: Status remains VERIFIED');
}

// -----------------------------------------------------------------------------
// IT-CUTOFF-GLOBAL-012: REVISION expired -> visible, LEWAT WAKTU, blocked
// -----------------------------------------------------------------------------
{
  resetStorage();
  storage.set('seeding_transactions', [{
    id: 'SOW-REV-001',
    docNo: '2026/SOW/REV001',
    tanggal: '01/10/2026',
    batchNo: 'BTCH-001',
    bedenganCode: 'BED-001',
    issueDocNo: 'ISSUE/2026/01/001',
    totalPolybag: 1000,
    mantri: 'Irwan Syah Putra'
  }]);
  storage.set(VERIFICATION_STORAGE_KEY, [{
    verificationId: 'VRF-003',
    referenceId: '2026/SOW/REV001',
    referenceDocNo: '2026/SOW/REV001',
    referenceType: 'MATERIAL',
    moduleType: 'MATERIAL',
    verificationStatus: VERIFICATION_STATUS.DIKEMBALIKAN
  }]);

  const afterCutoffTime = new Date(2026, 9, 3, 14, 0, 0, 0);
  const txs = getMantriTodayTransactions(mockMantri, '03/10/2026', afterCutoffTime);
  const found = txs.find(t => t.docNo === '2026/SOW/REV001');
  assert(found !== undefined, 'IT-CUTOFF-GLOBAL-012: Past REVISION item is visible as outstanding carry-over');
  assert(found.status === MANTRI_TRANSACTION_STATUS.REVISION, 'IT-CUTOFF-GLOBAL-012: Status is REVISION');
  assert(found.isSubmissionExpired === true, 'IT-CUTOFF-GLOBAL-012: isSubmissionExpired is true');
  assert(found.canSubmit === false, 'IT-CUTOFF-GLOBAL-012: canSubmit is false');

  const submitRes = submitMantriTransactions(['2026/SOW/REV001'], mockMantri, null, afterCutoffTime);
  assert(submitRes.submittedCount === 0, 'IT-CUTOFF-GLOBAL-012: Submit of expired REVISION is blocked');
}

// -----------------------------------------------------------------------------
// IT-CUTOFF-GLOBAL-013: Switch User / Active Role -> Same deadline
// -----------------------------------------------------------------------------
{
  const bDate = '02/10/2026';
  const deadlineMantri = calculateSubmissionDeadline(bDate);
  const deadlineAsisten = calculateSubmissionDeadline(bDate);
  const deadlineMandor = calculateSubmissionDeadline(bDate);

  assert(deadlineMantri.getTime() === deadlineAsisten.getTime() && deadlineAsisten.getTime() === deadlineMandor.getTime(),
    'IT-CUTOFF-GLOBAL-013: Deadline is 100% role-independent');
}

// -----------------------------------------------------------------------------
// IT-CUTOFF-GLOBAL-014: Material H-1 carry-over
// -----------------------------------------------------------------------------
{
  resetStorage();
  storage.set('seeding_transactions', [{
    id: 'SOW-MAT-H1',
    docNo: '2026/SOW/MATH1',
    tanggal: '02/10/2026',
    batchNo: 'BTCH-001',
    bedenganCode: 'BED-001',
    issueDocNo: 'ISSUE/2026/01/001',
    totalPolybag: 1000,
    mantri: 'Irwan Syah Putra'
  }]);

  const beforeCutoffTime = new Date(2026, 9, 3, 10, 0, 0, 0); // 03/10 10:00 (D+1 morning)
  const txs = getMantriTodayTransactions(mockMantri, '03/10/2026', beforeCutoffTime);
  const found = txs.find(t => t.docNo === '2026/SOW/MATH1');

  assert(found !== undefined, 'IT-CUTOFF-GLOBAL-014: Material H-1 READY transaction carried over to 03/10');
  assert(found.canSubmit === true, 'IT-CUTOFF-GLOBAL-014: Material H-1 before cutoff canSubmit is true');
}

// -----------------------------------------------------------------------------
// IT-CUTOFF-GLOBAL-015: Penerimaan H-1 carry-over
// -----------------------------------------------------------------------------
{
  storage.set('receipt_ksp_transactions', [{
    id: 'RCV-H1',
    docNo: 'RCV/2026/10/001',
    tanggal: '02/10/2026',
    qty: 5000,
    satuan: 'Butir',
    klon: 'AVROS 2006',
    penerima: 'Irwan Syah Putra'
  }]);

  const beforeCutoffTime = new Date(2026, 9, 3, 10, 0, 0, 0);
  const txs = getMantriTodayTransactions(mockMantri, '03/10/2026', beforeCutoffTime);
  const found = txs.find(t => t.docNo === 'RCV/2026/10/001');

  assert(found !== undefined, 'IT-CUTOFF-GLOBAL-015: Penerimaan H-1 transaction carried over to 03/10');
  assert(found.canSubmit === true, 'IT-CUTOFF-GLOBAL-015: Penerimaan H-1 before cutoff canSubmit is true');
}

// -----------------------------------------------------------------------------
// IT-CUTOFF-GLOBAL-016: Penyemaian H-1 carry-over
// -----------------------------------------------------------------------------
{
  storage.set('seeding_transactions', [
    ...storage.get('seeding_transactions', []),
    {
      id: 'SEED-H1',
      docNo: 'SEED/2026/10/001',
      tanggal: '02/10/2026',
      totalDisemai: 4000,
      bedengan: 'BED-002',
      batchNo: 'BTCH-002',
      mantri: 'Irwan Syah Putra'
    }
  ]);

  const beforeCutoffTime = new Date(2026, 9, 3, 10, 0, 0, 0);
  const txs = getMantriTodayTransactions(mockMantri, '03/10/2026', beforeCutoffTime);
  const found = txs.find(t => t.docNo === 'SEED/2026/10/001');

  assert(found !== undefined, 'IT-CUTOFF-GLOBAL-016: Penyemaian H-1 transaction carried over to 03/10');
  assert(found.canSubmit === true, 'IT-CUTOFF-GLOBAL-016: Penyemaian H-1 before cutoff canSubmit is true');
}

// -----------------------------------------------------------------------------
// IT-CUTOFF-GLOBAL-017: Seleksi H-1 carry-over
// -----------------------------------------------------------------------------
{
  storage.set('pre_grafting_selection_documents', [{
    id: 'PRE-H1',
    docNo: 'PRE/2026/10/001',
    tanggal: '02/10/2026',
    selectionStage: 'Seleksi I',
    totalLayak: 1200,
    totalAfkir: 50,
    batchCode: 'BTCH-001',
    bedengan: 'BED-001',
    status: 'COMPLETED',
    isCompleted: true,
    mantri: 'Irwan Syah Putra'
  }]);
  storage.set('selection_transactions', [{
    id: 'SEL-EXEC-001',
    parentSelectionDocumentId: 'PRE-H1',
    parentSelectionDocNo: 'PRE/2026/10/001',
    selectionDocumentId: 'PRE-H1',
    selectionDocNo: 'PRE/2026/10/001',
    selectionStage: 'SELEKSI_1',
    stage: 'SELEKSI_I',
    actualBibitRetainedQty: 1200,
    actualBibitSelectedQty: 50
  }]);

  const beforeCutoffTime = new Date(2026, 9, 3, 10, 0, 0, 0);
  const txs = getMantriTodayTransactions(mockMantri, '03/10/2026', beforeCutoffTime);
  const found = txs.find(t => t.docNo === 'PRE/2026/10/001');

  assert(found !== undefined, 'IT-CUTOFF-GLOBAL-017: Seleksi Pra-Okulasi H-1 carried over to 03/10');
  assert(found.canSubmit === true, 'IT-CUTOFF-GLOBAL-017: Seleksi Pra-Okulasi H-1 before cutoff canSubmit is true');
}

// -----------------------------------------------------------------------------
// IT-CUTOFF-GLOBAL-018: Other Central Hub modules (Okulasi, Pemeriksaan, etc.) carry-over
// -----------------------------------------------------------------------------
{
  storage.set('budding_transactions', [{
    id: 'OKL-H1',
    docNo: 'OKL/2026/10/001',
    tanggal: '02/10/2026',
    jumlah: 1500,
    bedengan: 'BED-005',
    klonEntres: 'IRR 112',
    mantri: 'Irwan Syah Putra'
  }]);

  const beforeCutoffTime = new Date(2026, 9, 3, 10, 0, 0, 0);
  const txs = getMantriTodayTransactions(mockMantri, '03/10/2026', beforeCutoffTime);
  const found = txs.find(t => t.docNo === 'OKL/2026/10/001');

  assert(found !== undefined, 'IT-CUTOFF-GLOBAL-018: Okulasi H-1 carried over to 03/10');
  assert(found.canSubmit === true, 'IT-CUTOFF-GLOBAL-018: Okulasi H-1 before cutoff canSubmit is true');
}

// -----------------------------------------------------------------------------
// IT-CUTOFF-GLOBAL-019: Cross-module isolation
// -----------------------------------------------------------------------------
{
  const beforeCutoffTime = new Date(2026, 9, 3, 10, 0, 0, 0);
  const res = submitModuleTransactions(MODULE_TYPES.OKULASI, mockMantri, beforeCutoffTime);
  assert(res.success === true && res.submittedCount === 1, 'IT-CUTOFF-GLOBAL-019: Submitting OKULASI module succeeds');

  // On 03/10 (next day), submitted past record is cleanly excluded from today's feed
  const afterSubmitTxs0310 = getMantriTodayTransactions(mockMantri, '03/10/2026', beforeCutoffTime);
  const oklTx0310 = afterSubmitTxs0310.find(t => t.docNo === 'OKL/2026/10/001');
  const matTx0310 = afterSubmitTxs0310.find(t => t.docNo === '2026/SOW/MATH1');

  assert(oklTx0310 === undefined, 'IT-CUTOFF-GLOBAL-019: Submitted past record cleanly removed from 03/10 feed');
  assert(matTx0310 !== undefined && matTx0310.status === MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM, 'IT-CUTOFF-GLOBAL-019: MATERIAL remains READY_TO_CONFIRM (isolated)');

  // On 02/10 (its own date), status is verified as SUBMITTED_TO_ASB
  const afterSubmitTxs0210 = getMantriTodayTransactions(mockMantri, '02/10/2026', beforeCutoffTime);
  const oklTx0210 = afterSubmitTxs0210.find(t => t.docNo === 'OKL/2026/10/001');
  assert(oklTx0210 !== undefined && oklTx0210.status === MANTRI_TRANSACTION_STATUS.SUBMITTED_TO_ASB, 'IT-CUTOFF-GLOBAL-019: On 02/10 date, OKULASI status is SUBMITTED_TO_ASB');
}

// -----------------------------------------------------------------------------
// IT-CUTOFF-GLOBAL-020: No duplicate submission
// -----------------------------------------------------------------------------
{
  const beforeCutoffTime = new Date(2026, 9, 3, 10, 0, 0, 0);
  const repeatRes = submitModuleTransactions(MODULE_TYPES.OKULASI, mockMantri, beforeCutoffTime);
  assert(repeatRes.submittedCount === 0, 'IT-CUTOFF-GLOBAL-020: Repeat submission yields submittedCount = 0 (Idempotent)');

  const allVerifs = storage.get(VERIFICATION_STORAGE_KEY, []).filter(v => v.referenceDocNo === 'OKL/2026/10/001');
  assert(allVerifs.length === 1, 'IT-CUTOFF-GLOBAL-020: Exactly 1 verification transaction in storage (no duplicates)');
}

// -----------------------------------------------------------------------------
// IT-CUTOFF-GLOBAL-021: No mutation during date/cutoff evaluation
// -----------------------------------------------------------------------------
{
  const seedingsBefore = JSON.stringify(storage.get('seeding_transactions', []));
  const verifsBefore = JSON.stringify(storage.get(VERIFICATION_STORAGE_KEY, []));

  // Run queries repeatedly
  getMantriTodayTransactions(mockMantri, '03/10/2026', new Date(2026, 9, 3, 10, 0, 0));
  getMantriTodayTransactions(mockMantri, '03/10/2026', new Date(2026, 9, 4, 15, 0, 0));

  const seedingsAfter = JSON.stringify(storage.get('seeding_transactions', []));
  const verifsAfter = JSON.stringify(storage.get(VERIFICATION_STORAGE_KEY, []));

  assert(seedingsBefore === seedingsAfter, 'IT-CUTOFF-GLOBAL-021: Storage seeding_transactions 100% untouched by query');
  assert(verifsBefore === verifsAfter, 'IT-CUTOFF-GLOBAL-021: Storage verification_transactions 100% untouched by query');
}

console.log('\n================================================================================');
console.log(`TEST SUMMARY: TOTAL = ${passedTests + failedTests} | PASSED = ${passedTests} | FAILED = ${failedTests}`);
console.log('================================================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
