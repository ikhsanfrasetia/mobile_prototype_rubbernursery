/**
 * tests/test-selection-verification-stage-and-lifecycle.js
 * 
 * INTEGRATION TEST SUITE:
 * SELECTION STAGE, VERIFICATION LIFECYCLE, DAN BYPASS CENTRAL HUB -> ASISTEN BIBITAN
 * 
 * Test Cases:
 * IT-SELECTION-FLOW-001: Deklarasi afkir Dederan menghasilkan selectionStage = SELEKSI_PRA_SEMAI & selectionType = PRA_SEMAI
 * IT-SELECTION-FLOW-002: Setelah deklarasi: verification_transactions = 0
 * IT-SELECTION-FLOW-003: Setelah deklarasi: submissionStatus bukan SUBMITTED_TO_ASB (null/undefined)
 * IT-SELECTION-FLOW-004: Setelah deklarasi: Central Hub status = READY_TO_CONFIRM
 * IT-SELECTION-FLOW-005: Setelah deklarasi: ASB actionable queue TIDAK berisi transaksi tersebut
 * IT-SELECTION-FLOW-006: Klik "Kirim Data ke Asisten": verification_transactions dibuat
 * IT-SELECTION-FLOW-007: Setelah submit: status = SUBMITTED_TO_ASB
 * IT-SELECTION-FLOW-008: Setelah submit: verificationStatus = MENUNGGU_VERIFIKASI
 * IT-SELECTION-FLOW-009: Setelah submit: submittedAt valid
 * IT-SELECTION-FLOW-010: Setelah submit: ASB actionable queue berisi transaksi tersebut
 * IT-SELECTION-FLOW-011: Sebelum submit: "Data Terkonfirmasi / Selesai" TIDAK muncul
 * IT-SELECTION-FLOW-012: Setelah ASB approve: status = VERIFIED / TERVERIFIKASI
 * IT-SELECTION-FLOW-013: Central Hub dan ASB detail sama-sama menampilkan "Seleksi Pra-Semai (Dederan)"
 * IT-SELECTION-FLOW-014: Transaksi valid Pasca-Okulasi tetap SELEKSI_PASCA_OKULASI
 * IT-SELECTION-FLOW-015: Read/discovery/render tidak menyebabkan storage mutation
 */

// Mock in-memory localStorage for isolated test execution
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import assert from 'assert';
import { storage } from '../js/core/storage.js';
import { 
  getMantriTodayTransactions, 
  submitModuleTransactions,
  submitMantriTransactions,
  MANTRI_TRANSACTION_STATUS,
  MODULE_TYPES
} from '../js/modules/verification/mantri-confirmation-service.js';
import { 
  declareSelectionItem, 
  canPerformAsistenSelectionAction, 
  getActionableSelectionCount,
  getSelectionStageLabel,
  approveSelectionRecord,
  SELECTION_STATUS, 
  SELECTION_STAGES, 
  SELECTION_TYPES,
  SELECTION_STORAGE_KEY
} from '../js/modules/selection/selection-manager.js';
import { 
  approveVerification, 
  getVerificationDetailData,
  VERIFICATION_STORAGE_KEY,
  VERIFICATION_STATUS
} from '../js/modules/verification/verification-manager.js';
import { getUniversalCardConfig } from '../js/modules/verification/mantri-confirmation-landing.js';
import { todayDDMMYYYY } from '../js/core/utils.js';

console.log('======================================================================');
console.log('INTEGRATION TEST: SELECTION STAGE, VERIFICATION LIFECYCLE & ASB GATE');
console.log('======================================================================\n');

let passCount = 0;
let failCount = 0;

function runTest(testId, description, fn) {
  try {
    console.log(`--- ${testId}: ${description} ---`);
    fn();
    console.log(`  [PASS] ${description}\n`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${err.message}\n`);
    failCount++;
  }
}

const mockMantri = {
  id: 'USR-MANTRI-01',
  userId: 'USR-MANTRI-01',
  name: 'Mantri Dederan',
  fullName: 'Mantri Dederan',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

const mockAsisten = {
  id: 'USR-ASB-01',
  userId: 'USR-ASB-01',
  name: 'Asisten Bibitan Test',
  fullName: 'Asisten Bibitan Test',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

const todayStr = todayDDMMYYYY();

// Setup fresh fixture for Dederan cull declaration
function setupDederanFixture() {
  global.localStorage.clear();

  const todayISOStr = new Date().toISOString().split('T')[0];
  const attendanceRecords = [
    {
      id: 'ATT-SUP-001',
      type: 'SUPERVISOR',
      userId: mockMantri.id,
      name: mockMantri.name,
      code: mockMantri.id,
      role: 'MANTRI_TANAMAN',
      attendanceType: 'DATANG',
      status: 'HADIR',
      date: todayISOStr,
      estateId: 'EST-01',
      divisionId: 'DIV-01'
    },
    {
      id: 'ATT-WRK-001',
      type: 'WORKER',
      workerId: 'WRK-001',
      workerName: 'Pekerja 1',
      attendanceType: 'DATANG',
      status: 'HADIR',
      date: todayISOStr,
      estateId: 'EST-01',
      divisionId: 'DIV-01'
    }
  ];
  storage.set('attendance_transactions', attendanceRecords);
  
  const poolItem = {
    id: 'POOL-DEDER-001',
    sourceModule: 'DEDERAN',
    sourceTransactionType: 'DEDER_INSPECTION',
    originType: 'REJECT_DEDERAN',
    dederanDocNo: '2026/DEDER/001',
    sourceDocNo: '2026/DEDER/001',
    sourceTransactionId: '2026/DEDER/001',
    bedenganCode: 'BED-001',
    klon: 'GT 1',
    jumlahDiperiksa: 1000,
    jumlahAfkir: 50,
    quantity: 50,
    estateId: 'EST-01',
    divisionId: 'DIV-01',
    status: 'MENUNGGU_VERIFIKASI',
    tanggal: todayStr
  };

  storage.set('selection_pool', [poolItem]);
  storage.set(SELECTION_STORAGE_KEY, []);
  storage.set(VERIFICATION_STORAGE_KEY, []);

  return poolItem;
}

// -----------------------------------------------------------------------------
// IT-SELECTION-FLOW-001: Deklarasi afkir Dederan menghasilkan stage SELEKSI_PRA_SEMAI
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-FLOW-001', 'Deklarasi afkir Dederan menghasilkan selectionStage = SELEKSI_PRA_SEMAI & selectionType = PRA_SEMAI', () => {
  const poolItem = setupDederanFixture();
  
  const result = declareSelectionItem(poolItem, 'RUSAK', 'Bibit berjamur', mockMantri);
  assert.strictEqual(result.success, true, 'Deklarasi harus sukses');
  assert.ok(result.transaction, 'Transaction record harus dikembalikan');

  const tx = result.transaction;
  assert.strictEqual(tx.selectionStage, SELECTION_STAGES.PRA_SEMAI, 'selectionStage harus SELEKSI_PRA_SEMAI');
  assert.strictEqual(tx.selectionType, SELECTION_TYPES.PRA_SEMAI, 'selectionType harus PRA_SEMAI');
  assert.notStrictEqual(tx.selectionStage, SELECTION_STAGES.PASCA_OKULASI, 'TIDAK boleh fallback ke SELEKSI_PASCA_OKULASI');
  assert.notStrictEqual(tx.selectionType, SELECTION_TYPES.PASCA_OKULASI, 'TIDAK boleh fallback ke PASCA_OKULASI');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-FLOW-002: Setelah deklarasi: verification_transactions = 0
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-FLOW-002', 'Setelah deklarasi afkir: verification_transactions masih kosong (0)', () => {
  const poolItem = setupDederanFixture();
  declareSelectionItem(poolItem, 'RUSAK', 'Bibit berjamur', mockMantri);

  const verifs = storage.get(VERIFICATION_STORAGE_KEY, []);
  assert.strictEqual(verifs.length, 0, 'Belum boleh ada verification_transactions sebelum submit via Central Hub');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-FLOW-003: Setelah deklarasi: submissionStatus bukan SUBMITTED_TO_ASB
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-FLOW-003', 'Setelah deklarasi: submissionStatus null/undefined dan submittedAt null/undefined', () => {
  const poolItem = setupDederanFixture();
  const res = declareSelectionItem(poolItem, 'RUSAK', 'Bibit berjamur', mockMantri);

  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  const createdTx = allTxs.find(t => t.id === res.transaction.id);
  
  assert.ok(createdTx, 'Transaksi seleksi harus tersimpan di storage');
  assert.ok(!createdTx.submissionStatus || createdTx.submissionStatus !== 'SUBMITTED_TO_ASB', 'submissionStatus tidak boleh SUBMITTED_TO_ASB');
  assert.ok(!createdTx.submittedAt, 'submittedAt harus null / undefined');
  assert.strictEqual(createdTx.status, SELECTION_STATUS.READY_TO_CONFIRM, 'status awal transaksi harus READY_TO_CONFIRM');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-FLOW-004: Setelah deklarasi: Central Hub status = READY_TO_CONFIRM
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-FLOW-004', 'Setelah deklarasi: Central Hub menampilkan status READY_TO_CONFIRM (Siap Dikirim)', () => {
  const poolItem = setupDederanFixture();
  declareSelectionItem(poolItem, 'RUSAK', 'Bibit berjamur', mockMantri);

  const todayTxs = getMantriTodayTransactions(mockMantri, todayStr);
  const selItem = todayTxs.find(t => t.moduleType === MODULE_TYPES.PENYELEKSIAN);

  assert.ok(selItem, 'Central Hub harus menemukan transaksi penyeleksian hari ini');
  assert.strictEqual(selItem.status, MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM, 'Central Hub status harus READY_TO_CONFIRM');
  assert.strictEqual(selItem.verificationStatus, null, 'verificationStatus harus null');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-FLOW-005: Setelah deklarasi: ASB actionable queue TIDAK berisi transaksi tersebut
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-FLOW-005', 'Setelah deklarasi: ASB actionable queue TIDAK berisi transaksi tersebut (bypass dicegah)', () => {
  const poolItem = setupDederanFixture();
  const res = declareSelectionItem(poolItem, 'RUSAK', 'Bibit berjamur', mockMantri);

  const isActionable = canPerformAsistenSelectionAction(res.transaction, mockAsisten);
  assert.strictEqual(isActionable, false, 'Asisten Bibitan TIDAK boleh dapat mereview transaksi sebelum Mantri submit');

  const count = getActionableSelectionCount(null, mockAsisten);
  assert.strictEqual(count, 0, 'Actionable count untuk ASB harus 0');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-FLOW-006: Klik "Kirim Data ke Asisten": verification_transactions dibuat
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-FLOW-006', 'Klik "Kirim Data ke Asisten": verification_transactions record dibuat', () => {
  const poolItem = setupDederanFixture();
  const res = declareSelectionItem(poolItem, 'RUSAK', 'Bibit berjamur', mockMantri);

  // Mantri submit transaksi penyeleksian melalui Central Hub
  const submitRes = submitModuleTransactions(MODULE_TYPES.PENYELEKSIAN, mockMantri);
  assert.strictEqual(submitRes.success, true, 'Submission Central Hub harus sukses');

  const verifs = storage.get(VERIFICATION_STORAGE_KEY, []);
  assert.strictEqual(verifs.length, 1, 'Harus ada 1 verification_transactions setelah submit');
  assert.ok(verifs[0].referenceType === 'PENYELEKSIAN' || verifs[0].referenceType === 'SELECTION', 'referenceType harus PENYELEKSIAN / SELECTION');
  assert.strictEqual(verifs[0].referenceDocNo, res.transaction.docNo, 'referenceDocNo harus cocok');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-FLOW-007: Setelah submit: status = SUBMITTED_TO_ASB
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-FLOW-007', 'Setelah submit: Central Hub status = SUBMITTED_TO_ASB', () => {
  const poolItem = setupDederanFixture();
  const res = declareSelectionItem(poolItem, 'RUSAK', 'Bibit berjamur', mockMantri);
  submitModuleTransactions(MODULE_TYPES.PENYELEKSIAN, mockMantri);

  const todayTxs = getMantriTodayTransactions(mockMantri, todayStr);
  const selItem = todayTxs.find(t => t.moduleType === MODULE_TYPES.PENYELEKSIAN);

  assert.ok(selItem, 'Item harus ada di Central Hub');
  assert.strictEqual(selItem.status, MANTRI_TRANSACTION_STATUS.SUBMITTED_TO_ASB, 'Status harus SUBMITTED_TO_ASB');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-FLOW-008: Setelah submit: verificationStatus = MENUNGGU_VERIFIKASI
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-FLOW-008', 'Setelah submit: verificationStatus = MENUNGGU_VERIFIKASI', () => {
  const poolItem = setupDederanFixture();
  const res = declareSelectionItem(poolItem, 'RUSAK', 'Bibit berjamur', mockMantri);
  submitModuleTransactions(MODULE_TYPES.PENYELEKSIAN, mockMantri);

  const verifs = storage.get(VERIFICATION_STORAGE_KEY, []);
  assert.strictEqual(verifs[0].verificationStatus, VERIFICATION_STATUS.MENUNGGU_VERIFIKASI, 'verificationStatus harus MENUNGGU_VERIFIKASI');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-FLOW-009: Setelah submit: submittedAt valid
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-FLOW-009', 'Setelah submit: submittedAt terisi dengan ISO timestamp yang valid', () => {
  const poolItem = setupDederanFixture();
  const res = declareSelectionItem(poolItem, 'RUSAK', 'Bibit berjamur', mockMantri);
  submitModuleTransactions(MODULE_TYPES.PENYELEKSIAN, mockMantri);

  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  const updatedTx = allTxs.find(t => t.id === res.transaction.id);
  assert.ok(updatedTx.submittedAt, 'submittedAt harus terisi pada transaksi seleksi');
  assert.ok(!isNaN(new Date(updatedTx.submittedAt).getTime()), 'submittedAt harus berupa tanggal ISO valid');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-FLOW-010: Setelah submit: ASB actionable queue berisi transaksi tersebut
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-FLOW-010', 'Setelah submit: ASB actionable queue berisi transaksi tersebut', () => {
  const poolItem = setupDederanFixture();
  const res = declareSelectionItem(poolItem, 'RUSAK', 'Bibit berjamur', mockMantri);
  submitModuleTransactions(MODULE_TYPES.PENYELEKSIAN, mockMantri);

  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  const updatedTx = allTxs.find(t => t.id === res.transaction.id);

  const isActionable = canPerformAsistenSelectionAction(updatedTx, mockAsisten);
  assert.strictEqual(isActionable, true, 'Transaksi harus dapat direview oleh ASB setelah Mantri submit');

  const count = getActionableSelectionCount(null, mockAsisten);
  assert.strictEqual(count, 1, 'Actionable count untuk ASB harus bernilai 1');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-FLOW-011: Sebelum submit: "Data Terkonfirmasi / Selesai" TIDAK muncul
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-FLOW-011', 'Sebelum submit: "Data Terkonfirmasi / Selesai" TIDAK muncul di Central Hub', () => {
  const poolItem = setupDederanFixture();
  declareSelectionItem(poolItem, 'RUSAK', 'Bibit berjamur', mockMantri);

  const todayTxs = getMantriTodayTransactions(mockMantri, todayStr);
  const selItem = todayTxs.find(t => t.moduleType === MODULE_TYPES.PENYELEKSIAN);

  assert.notStrictEqual(selItem.status, MANTRI_TRANSACTION_STATUS.VERIFIED, 'TIDAK boleh berstatus VERIFIED sebelum submit/approve');
  assert.notStrictEqual(selItem.verificationStatus, VERIFICATION_STATUS.TERVERIFIKASI, 'TIDAK boleh berstatus TERVERIFIKASI sebelum approve');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-FLOW-012: Setelah ASB approve: status = VERIFIED / TERVERIFIKASI
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-FLOW-012', 'Setelah ASB approve: verification record = TERVERIFIKASI dan Central Hub = VERIFIED', () => {
  const poolItem = setupDederanFixture();
  const res = declareSelectionItem(poolItem, 'RUSAK', 'Bibit berjamur', mockMantri);
  submitModuleTransactions(MODULE_TYPES.PENYELEKSIAN, mockMantri);

  const verifs = storage.get(VERIFICATION_STORAGE_KEY, []);
  const refType = verifs[0]?.referenceType || 'PENYELEKSIAN';

  // ASB approves
  const verifyRes = approveVerification({
    referenceType: refType,
    referenceId: res.transaction.id,
    notes: 'Disetujui lengkap',
    currentUser: mockAsisten
  });
  assert.ok(verifyRes, 'Persetujuan verifikasi ASB harus menghasilkan auditRecord');
  assert.strictEqual(verifyRes.verificationStatus, VERIFICATION_STATUS.TERVERIFIKASI, 'Status verifikasi harus TERVERIFIKASI');

  const todayTxs = getMantriTodayTransactions(mockMantri, todayStr);
  const selItem = todayTxs.find(t => t.moduleType === MODULE_TYPES.PENYELEKSIAN);
  assert.strictEqual(selItem.status, MANTRI_TRANSACTION_STATUS.VERIFIED, 'Central Hub status harus VERIFIED');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-FLOW-013: Central Hub dan ASB detail sama-sama menampilkan "Seleksi Pra-Semai (Dederan)"
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-FLOW-013', 'Central Hub dan ASB detail sama-sama menampilkan label "Seleksi Pra-Semai (Dederan)"', () => {
  const poolItem = setupDederanFixture();
  const res = declareSelectionItem(poolItem, 'RUSAK', 'Bibit berjamur', mockMantri);
  submitModuleTransactions(MODULE_TYPES.PENYELEKSIAN, mockMantri);

  // 1. Central Hub Display
  const todayTxs = getMantriTodayTransactions(mockMantri, todayStr);
  const selItem = todayTxs.find(t => t.moduleType === MODULE_TYPES.PENYELEKSIAN);
  const hubStageField = selItem.display.fields.find(f => f.label === 'Tahap Seleksi');
  assert.ok(hubStageField, 'Field Tahap Seleksi harus ada di Central Hub');
  assert.strictEqual(hubStageField.value, 'Seleksi Pra-Semai (Dederan)', 'Central Hub harus menampilkan "Seleksi Pra-Semai (Dederan)"');

  // 2. ASB Verification Detail Data Display
  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  const targetTx = allTxs.find(t => t.id === res.transaction.id);
  const asbDetail = getVerificationDetailData(targetTx, mockAsisten, 'PENYELEKSIAN');
  const asbStageField = asbDetail.fields.find(f => f.label === 'Tahap Seleksi');
  assert.ok(asbStageField, 'Field Tahap Seleksi harus ada di ASB verification detail');
  assert.strictEqual(asbStageField.value, 'Seleksi Pra-Semai (Dederan)', 'ASB detail harus menampilkan "Seleksi Pra-Semai (Dederan)"');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-FLOW-014: Transaksi valid Pasca-Okulasi tetap SELEKSI_PASCA_OKULASI
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-FLOW-014', 'Transaksi valid Pasca-Okulasi (BUDDING/OKULASI) tetap SELEKSI_PASCA_OKULASI', () => {
  global.localStorage.clear();
  const todayISOStr = new Date().toISOString().split('T')[0];
  storage.set('attendance_transactions', [
    {
      id: 'ATT-SUP-001',
      type: 'SUPERVISOR',
      userId: mockMantri.id,
      name: mockMantri.name,
      code: mockMantri.id,
      role: 'MANTRI_TANAMAN',
      attendanceType: 'DATANG',
      status: 'HADIR',
      date: todayISOStr,
      estateId: 'EST-01',
      divisionId: 'DIV-01'
    },
    {
      id: 'ATT-WRK-001',
      type: 'WORKER',
      workerId: 'WRK-001',
      workerName: 'Pekerja 1',
      attendanceType: 'DATANG',
      status: 'HADIR',
      date: todayISOStr,
      estateId: 'EST-01',
      divisionId: 'DIV-01'
    }
  ]);
  const okulasiPoolItem = {
    id: 'POOL-OKULASI-001',
    sourceModule: 'BUDDING',
    sourceTransactionType: 'GRAFTING',
    originType: 'REJECT_OKULASI',
    sourceDocNo: '2026/BUD/001',
    sourceTransactionId: '2026/BUD/001',
    bedenganCode: 'BED-005',
    klon: 'AVROS 2037',
    jumlahDiperiksa: 500,
    jumlahAfkir: 20,
    quantity: 20,
    estateId: 'EST-01',
    divisionId: 'DIV-01',
    status: 'MENUNGGU_VERIFIKASI',
    tanggal: todayStr
  };

  storage.set('selection_pool', [okulasiPoolItem]);
  storage.set(SELECTION_STORAGE_KEY, []);

  const res = declareSelectionItem(okulasiPoolItem, 'MATI', 'Mata entres hitam', mockMantri);
  assert.strictEqual(res.transaction.selectionStage, SELECTION_STAGES.PASCA_OKULASI, 'Pasca-okulasi selectionStage harus SELEKSI_PASCA_OKULASI');
  assert.strictEqual(res.transaction.selectionType, SELECTION_TYPES.PASCA_OKULASI, 'Pasca-okulasi selectionType harus PASCA_OKULASI');

  const stageLabel = getSelectionStageLabel(res.transaction);
  assert.strictEqual(stageLabel, 'Seleksi Pasca-Okulasi', 'Label harus "Seleksi Pasca-Okulasi"');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-FLOW-015: Read/discovery/render tidak menyebabkan storage mutation
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-FLOW-015', 'Read / discovery / render tidak menyebabkan storage mutation', () => {
  const poolItem = setupDederanFixture();
  declareSelectionItem(poolItem, 'RUSAK', 'Bibit berjamur', mockMantri);

  // Take snapshot of storage BEFORE discovery
  const snapshotBefore = {
    selection_pool: JSON.stringify(storage.get('selection_pool', [])),
    selection_transactions: JSON.stringify(storage.get(SELECTION_STORAGE_KEY, [])),
    verification_transactions: JSON.stringify(storage.get(VERIFICATION_STORAGE_KEY, []))
  };

  // Perform multiple read operations
  getMantriTodayTransactions(mockMantri, todayStr);
  getActionableSelectionCount(null, mockAsisten);
  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  getSelectionStageLabel(allTxs[0]);
  getVerificationDetailData(allTxs[0], mockAsisten, 'PENYELEKSIAN');

  // Take snapshot of storage AFTER discovery
  const snapshotAfter = {
    selection_pool: JSON.stringify(storage.get('selection_pool', [])),
    selection_transactions: JSON.stringify(storage.get(SELECTION_STORAGE_KEY, [])),
    verification_transactions: JSON.stringify(storage.get(VERIFICATION_STORAGE_KEY, []))
  };

  assert.strictEqual(snapshotBefore.selection_pool, snapshotAfter.selection_pool, 'selection_pool tidak boleh termutasi saat read');
  assert.strictEqual(snapshotBefore.selection_transactions, snapshotAfter.selection_transactions, 'selection_transactions tidak boleh termutasi saat read');
  assert.strictEqual(snapshotBefore.verification_transactions, snapshotAfter.verification_transactions, 'verification_transactions tidak boleh termutasi saat read');
});

// =============================================================================
// DISPLAY NORMALIZATION TESTS (IT-SELECTION-DISPLAY-001 TO 010)
// =============================================================================

// -----------------------------------------------------------------------------
// IT-SELECTION-DISPLAY-001: 2026/CULL/001 card menampilkan "Tahap: Seleksi Pra-Semai (Dederan)"
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-DISPLAY-001', '2026/CULL/001 pada Central Hub menampilkan "Tahap: Seleksi Pra-Semai (Dederan)"', () => {
  const poolItem = setupDederanFixture();
  poolItem.docNo = '2026/CULL/001';
  poolItem.selectionNo = '2026/CULL/001';
  const res = declareSelectionItem(poolItem, 'RUSAK', 'Bibit berjamur', mockMantri);

  const todayTxs = getMantriTodayTransactions(mockMantri, todayStr);
  const selTx = todayTxs.find(t => t.moduleType === MODULE_TYPES.PENYELEKSIAN);
  assert.ok(selTx, 'Transaksi penyeleksian harus ditemukan di Central Hub');

  const cardConfig = getUniversalCardConfig(selTx);
  assert.strictEqual(cardConfig.referenceText, 'Tahap: Seleksi Pra-Semai (Dederan)', 'Card referenceText harus "Tahap: Seleksi Pra-Semai (Dederan)"');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-DISPLAY-002: 2026/CULL/002 card menampilkan "Tahap: Seleksi Pra-Semai (Dederan)"
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-DISPLAY-002', '2026/CULL/002 pada Central Hub menampilkan "Tahap: Seleksi Pra-Semai (Dederan)"', () => {
  const poolItem = setupDederanFixture();
  poolItem.id = 'POOL-DEDER-002';
  poolItem.docNo = '2026/CULL/002';
  poolItem.selectionNo = '2026/CULL/002';
  const res = declareSelectionItem(poolItem, 'MATI', 'Bibit kering', mockMantri);

  const todayTxs = getMantriTodayTransactions(mockMantri, todayStr);
  const selTx = todayTxs.find(t => t.moduleType === MODULE_TYPES.PENYELEKSIAN);
  assert.ok(selTx, 'Transaksi penyeleksian harus ditemukan di Central Hub');

  const cardConfig = getUniversalCardConfig(selTx);
  assert.strictEqual(cardConfig.referenceText, 'Tahap: Seleksi Pra-Semai (Dederan)', 'Card referenceText harus "Tahap: Seleksi Pra-Semai (Dederan)"');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-DISPLAY-003: Historical record dengan selectionStage = SELEKSI_PASCA_OKULASI & originType = REJECT_DEDERAN
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-DISPLAY-003', 'Historical record Dederan (walau bertuliskan SELEKSI_PASCA_OKULASI) dinormalisasi ke "Seleksi Pra-Semai (Dederan)"', () => {
  setupDederanFixture();

  // Simulasikan historical record yang tersimpan sebelum fix Stage 2
  const historicalRecord = {
    id: 'SEL-HIST-004',
    selectionId: 'SEL-HIST-004',
    docNo: '2026/CULL/004',
    selectionNo: '2026/CULL/004',
    sourceModule: 'DEDERAN',
    sourceTransactionType: 'DEDER_INSPECTION',
    sourceDocNo: '2026/DEDER/004',
    originType: 'REJECT_DEDERAN',
    selectionStage: 'SELEKSI_PASCA_OKULASI', // Historical raw value
    selectionType: 'PASCA_OKULASI',          // Historical raw value
    jumlahAfkir: 30,
    quantity: 30,
    tanggal: todayStr,
    mantri: mockMantri.name,
    createdByName: mockMantri.name,
    status: 'READY_TO_CONFIRM'
  };

  storage.set(SELECTION_STORAGE_KEY, [historicalRecord]);

  const todayTxs = getMantriTodayTransactions(mockMantri, todayStr);
  const selTx = todayTxs.find(t => t.moduleType === MODULE_TYPES.PENYELEKSIAN && t.docNo === '2026/CULL/004');
  assert.ok(selTx, 'Historical record harus muncul di Central Hub');

  const cardConfig = getUniversalCardConfig(selTx);
  assert.strictEqual(cardConfig.referenceText, 'Tahap: Seleksi Pra-Semai (Dederan)', 'Historical Dederan harus dinormalisasi ke "Tahap: Seleksi Pra-Semai (Dederan)"');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-DISPLAY-004: Central Hub card TIDAK mengandung SELEKSI_PASCA_OKULASI untuk REJECT_DEDERAN
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-DISPLAY-004', 'Central Hub card TIDAK mengandung SELEKSI_PASCA_OKULASI untuk REJECT_DEDERAN', () => {
  setupDederanFixture();
  const histRecord = {
    id: 'SEL-HIST-005',
    docNo: '2026/CULL/005',
    sourceModule: 'DEDERAN',
    originType: 'REJECT_DEDERAN',
    selectionStage: 'SELEKSI_PASCA_OKULASI',
    jumlahAfkir: 25,
    tanggal: todayStr,
    mantri: mockMantri.name,
    status: 'READY_TO_CONFIRM'
  };
  storage.set(SELECTION_STORAGE_KEY, [histRecord]);

  const todayTxs = getMantriTodayTransactions(mockMantri, todayStr);
  const selTx = todayTxs.find(t => t.docNo === '2026/CULL/005');
  const cardConfig = getUniversalCardConfig(selTx);

  assert.ok(!cardConfig.referenceText.includes('SELEKSI_PASCA_OKULASI'), 'referenceText tidak boleh mengandung SELEKSI_PASCA_OKULASI');
  assert.ok(!cardConfig.primaryEntity.includes('SELEKSI_PASCA_OKULASI'), 'primaryEntity tidak boleh mengandung SELEKSI_PASCA_OKULASI');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-DISPLAY-005: BUDDING / GRAFTING valid tetap menampilkan "Tahap: Seleksi Pasca-Okulasi"
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-DISPLAY-005', 'Transaksi valid BUDDING/GRAFTING tetap menampilkan "Tahap: Seleksi Pasca-Okulasi"', () => {
  setupDederanFixture();
  const buddingCullRecord = {
    id: 'SEL-BUD-010',
    docNo: '2026/CULL/010',
    sourceModule: 'BUDDING',
    sourceTransactionType: 'GRAFTING',
    originType: 'REJECT_OKULASI',
    selectionStage: SELECTION_STAGES.PASCA_OKULASI,
    selectionType: SELECTION_TYPES.PASCA_OKULASI,
    jumlahAfkir: 15,
    tanggal: todayStr,
    mantri: mockMantri.name,
    status: 'READY_TO_CONFIRM'
  };
  storage.set(SELECTION_STORAGE_KEY, [buddingCullRecord]);

  const todayTxs = getMantriTodayTransactions(mockMantri, todayStr);
  const selTx = todayTxs.find(t => t.docNo === '2026/CULL/010');
  const cardConfig = getUniversalCardConfig(selTx);

  assert.strictEqual(cardConfig.referenceText, 'Tahap: Seleksi Pasca-Okulasi', 'BUDDING/GRAFTING harus menghasilkan "Tahap: Seleksi Pasca-Okulasi"');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-DISPLAY-006: SELEKSI_1 / SELEKSI_I menampilkan "Tahap: Seleksi I (Pra-Okulasi)"
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-DISPLAY-006', 'SELEKSI_1 / SELEKSI_I pada card menampilkan "Tahap: Seleksi I (Pra-Okulasi)"', () => {
  setupDederanFixture();
  const sel1Doc = {
    id: 'PRE-SEL-001',
    docNo: '2026/SEL/001',
    selectionStage: 'SELEKSI_I',
    selectionType: 'PRA_OKULASI',
    batchCode: 'B-001',
    bedengan: 'BED-001',
    totalLayak: 1000,
    totalAfkir: 50,
    tanggal: todayStr,
    mantri: mockMantri.name,
    submittedByName: mockMantri.name,
    status: 'COMPLETED',
    isCompleted: true
  };
  storage.set('pre_grafting_selection_documents', [sel1Doc]);
  storage.set(SELECTION_STORAGE_KEY, [
    {
      id: 'SEL-EXEC-001',
      parentSelectionDocumentId: 'PRE-SEL-001',
      selectionStage: 'SELEKSI_I',
      transactionType: 'PELAKSANAAN_SELEKSI_I',
      batchCode: 'B-001',
      bedenganCode: 'BED-001',
      jumlahLayak: 1000,
      jumlahAfkir: 50,
      tanggal: todayStr,
      status: 'COMPLETED'
    }
  ]);

  const todayTxs = getMantriTodayTransactions(mockMantri, todayStr);
  const preTx = todayTxs.find(t => t.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && t.docNo === '2026/SEL/001');
  assert.ok(preTx, 'Dokumen Seleksi 1 harus ditemukan');

  const cardConfig = getUniversalCardConfig(preTx);
  assert.strictEqual(cardConfig.referenceText, 'Tahap: Seleksi I (Pra-Okulasi)', 'Card referenceText harus "Tahap: Seleksi I (Pra-Okulasi)"');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-DISPLAY-007: SELEKSI_2 / SELEKSI_II menampilkan "Tahap: Seleksi II (Pra-Okulasi)"
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-DISPLAY-007', 'SELEKSI_2 / SELEKSI_II pada card menampilkan "Tahap: Seleksi II (Pra-Okulasi)"', () => {
  setupDederanFixture();
  const sel2Doc = {
    id: 'PRE-SEL-002',
    docNo: '2026/SEL/002',
    selectionStage: 'SELEKSI_II',
    selectionType: 'PRA_OKULASI',
    batchCode: 'B-001',
    bedengan: 'BED-001',
    totalLayak: 950,
    totalAfkir: 30,
    tanggal: todayStr,
    mantri: mockMantri.name,
    submittedByName: mockMantri.name,
    status: 'COMPLETED',
    isCompleted: true
  };
  storage.set('pre_grafting_selection_documents', [sel2Doc]);
  storage.set(SELECTION_STORAGE_KEY, [
    {
      id: 'SEL-EXEC-002',
      parentSelectionDocumentId: 'PRE-SEL-002',
      selectionStage: 'SELEKSI_II',
      transactionType: 'PELAKSANAAN_SELEKSI_II',
      batchCode: 'B-001',
      bedenganCode: 'BED-001',
      jumlahLayak: 950,
      jumlahAfkir: 30,
      tanggal: todayStr,
      status: 'COMPLETED'
    }
  ]);

  const todayTxs = getMantriTodayTransactions(mockMantri, todayStr);
  const preTx = todayTxs.find(t => t.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && t.docNo === '2026/SEL/002');
  assert.ok(preTx, 'Dokumen Seleksi 2 harus ditemukan');

  const cardConfig = getUniversalCardConfig(preTx);
  assert.strictEqual(cardConfig.referenceText, 'Tahap: Seleksi II (Pra-Okulasi)', 'Card referenceText harus "Tahap: Seleksi II (Pra-Okulasi)"');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-DISPLAY-008: SELEKSI_3 / SELEKSI_III menampilkan "Tahap: Seleksi III (Pra-Okulasi)"
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-DISPLAY-008', 'SELEKSI_3 / SELEKSI_III pada card menampilkan "Tahap: Seleksi III (Pra-Okulasi)"', () => {
  setupDederanFixture();
  const sel3Doc = {
    id: 'PRE-SEL-003',
    docNo: '2026/SEL/003',
    selectionStage: 'SELEKSI_III',
    selectionType: 'PRA_OKULASI',
    batchCode: 'B-001',
    bedengan: 'BED-001',
    totalLayak: 920,
    totalAfkir: 20,
    tanggal: todayStr,
    mantri: mockMantri.name,
    submittedByName: mockMantri.name,
    status: 'COMPLETED',
    isCompleted: true
  };
  storage.set('pre_grafting_selection_documents', [sel3Doc]);
  storage.set(SELECTION_STORAGE_KEY, [
    {
      id: 'SEL-EXEC-003',
      parentSelectionDocumentId: 'PRE-SEL-003',
      selectionStage: 'SELEKSI_III',
      transactionType: 'PELAKSANAAN_SELEKSI_III',
      batchCode: 'B-001',
      bedenganCode: 'BED-001',
      jumlahLayak: 920,
      jumlahAfkir: 20,
      tanggal: todayStr,
      status: 'COMPLETED'
    }
  ]);

  const todayTxs = getMantriTodayTransactions(mockMantri, todayStr);
  const preTx = todayTxs.find(t => t.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && t.docNo === '2026/SEL/003');
  assert.ok(preTx, 'Dokumen Seleksi 3 harus ditemukan');

  const cardConfig = getUniversalCardConfig(preTx);
  assert.strictEqual(cardConfig.referenceText, 'Tahap: Seleksi III (Pra-Okulasi)', 'Card referenceText harus "Tahap: Seleksi III (Pra-Okulasi)"');
});

// -----------------------------------------------------------------------------
// IT-SELECTION-DISPLAY-009: Central Hub renderer konsisten dengan canonical getSelectionStageLabel
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-DISPLAY-009', 'Central Hub renderer menghasilkan output yang 100% konsisten dengan getSelectionStageLabel()', () => {
  setupDederanFixture();
  const testPool = [
    { originType: 'REJECT_DEDERAN', sourceModule: 'DEDERAN' },
    { originType: 'REJECT_PENYEMAIAN', sourceModule: 'PENYEMAIAN' },
    { originType: 'REJECT_OKULASI', sourceModule: 'BUDDING' },
    { selectionStage: 'SELEKSI_1' },
    { selectionStage: 'SELEKSI_2' },
    { selectionStage: 'SELEKSI_3' }
  ];

  testPool.forEach((item, idx) => {
    const canonicalLabel = getSelectionStageLabel(item);
    const mockTx = {
      moduleType: item.selectionStage ? MODULE_TYPES.SELEKSI_PRA_OKULASI : MODULE_TYPES.PENYELEKSIAN,
      docNo: `TEST/DOC/${idx}`,
      rawRecord: item,
      display: {}
    };
    const cardConfig = getUniversalCardConfig(mockTx);
    assert.strictEqual(cardConfig.referenceText, `Tahap: ${canonicalLabel}`, `referenceText untuk item ${idx} harus konsisten dengan canonical resolver`);
  });
});

// -----------------------------------------------------------------------------
// IT-SELECTION-DISPLAY-010: Card config / render tidak menyebabkan storage mutation
// -----------------------------------------------------------------------------
runTest('IT-SELECTION-DISPLAY-010', 'Card config generation dan rendering tidak menyebabkan mutasi pada storage', () => {
  setupDederanFixture();
  const sampleTx = {
    id: 'SEL-001',
    docNo: '2026/CULL/001',
    sourceModule: 'DEDERAN',
    originType: 'REJECT_DEDERAN',
    jumlahAfkir: 50,
    tanggal: todayStr,
    mantri: mockMantri.name,
    status: 'READY_TO_CONFIRM'
  };
  storage.set(SELECTION_STORAGE_KEY, [sampleTx]);

  const snapBefore = {
    pool: JSON.stringify(storage.get('selection_pool', [])),
    txs: JSON.stringify(storage.get(SELECTION_STORAGE_KEY, [])),
    verifs: JSON.stringify(storage.get(VERIFICATION_STORAGE_KEY, []))
  };

  const todayTxs = getMantriTodayTransactions(mockMantri, todayStr);
  todayTxs.forEach(tx => getUniversalCardConfig(tx));

  const snapAfter = {
    pool: JSON.stringify(storage.get('selection_pool', [])),
    txs: JSON.stringify(storage.get(SELECTION_STORAGE_KEY, [])),
    verifs: JSON.stringify(storage.get(VERIFICATION_STORAGE_KEY, []))
  };

  assert.strictEqual(snapBefore.pool, snapAfter.pool, 'selection_pool tidak termutasi');
  assert.strictEqual(snapBefore.txs, snapAfter.txs, 'selection_transactions tidak termutasi');
  assert.strictEqual(snapBefore.verifs, snapAfter.verifs, 'verification_transactions tidak termutasi');
});

console.log('======================================================================');
console.log(`TOTAL PASS: ${passCount} / 25`);
console.log(`TOTAL FAIL: ${failCount} / 25`);
console.log('======================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
