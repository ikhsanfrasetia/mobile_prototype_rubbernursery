import assert from 'node:assert';
import { storage } from '../js/core/storage.js';
import {
  findSourceRecord,
  getVerificationDetailData,
  approveVerification,
  returnVerification,
  CANONICAL_STORAGE_MAP
} from '../js/modules/verification/verification-manager.js';
import { getMantriTodayTransactions, MODULE_TYPES } from '../js/modules/verification/mantri-confirmation-service.js';

console.log('====================================================');
console.log('TEST SUITE: QUOTA MANAGEMENT & SELEKSI SOURCE LOOKUP');
console.log('====================================================');

// Mock localStorage if in node environment
if (typeof globalThis.localStorage === 'undefined') {
  let store = {};
  globalThis.localStorage = {
    getItem(k) { return store[k] !== undefined ? store[k] : null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
    clear() { store = {}; },
    get length() { return Object.keys(store).length; },
    key(i) { return Object.keys(store)[i] || null; }
  };
}

const asbUser = {
  id: 'USR-ASB-01',
  name: 'Asisten Lapangan',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

const mantriUser = {
  id: 'USR-MAN-01',
  name: 'Wagiman',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

function resetAll() {
  localStorage.clear();
}

// -------------------------------------------------------------
// TEST 1: Storage quota compaction resilience
// -------------------------------------------------------------
resetAll();
let quotaTriggered = false;
const originalSetItem = localStorage.setItem;

// Temporarily simulate QuotaExceededError on first huge attempt
let attemptCount = 0;
localStorage.setItem = function(k, v) {
  if (k === 'sigma:selection_transactions' && attemptCount === 0) {
    attemptCount++;
    const err = new Error("Failed to execute 'setItem' on 'Storage': Setting the value exceeded the quota.");
    err.name = 'QuotaExceededError';
    err.code = 22;
    throw err;
  }
  return originalSetItem.call(localStorage, k, v);
};

const massiveArray = [
  { id: 'TX-1', photoData: 'data:image/jpeg;base64,' + 'A'.repeat(600000) },
  { id: 'TX-2', photo: { dataUrl: 'data:image/jpeg;base64,' + 'B'.repeat(600000) } }
];

try {
  storage.set('selection_transactions', massiveArray);
  const saved = storage.get('selection_transactions', []);
  assert(saved.length === 2, 'Storage successfully saved data after quota compaction fallback');
  console.log('✓ PASS: Test 1: Storage safely handles QuotaExceededError and performs compaction');
} finally {
  localStorage.setItem = originalSetItem;
}

// -------------------------------------------------------------
// TEST 2: CANONICAL_STORAGE_MAP includes selection_transactions for SELEKSI_PRA_OKULASI
// -------------------------------------------------------------
assert(
  CANONICAL_STORAGE_MAP.SELEKSI_PRA_OKULASI.includes('pre_grafting_selection_documents') &&
  CANONICAL_STORAGE_MAP.SELEKSI_PRA_OKULASI.includes('selection_transactions'),
  'CANONICAL_STORAGE_MAP.SELEKSI_PRA_OKULASI maps to both pre_grafting_selection_documents and selection_transactions'
);
console.log('✓ PASS: Test 2: CANONICAL_STORAGE_MAP properly configured for SELEKSI_PRA_OKULASI');

// -------------------------------------------------------------
// TEST 3: findSourceRecord resolves SEL-TX-... and enriches details
// -------------------------------------------------------------
resetAll();
const sampleParentDoc = {
  id: 'SEL1-DOC-008',
  docNo: '2026/SEL-I/008',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_I',
  batchCode: 'BTCH-003',
  bedengan: 'BED-002',
  totalDiperiksa: 5000,
  totalLayak: 4800,
  totalAfkir: 200,
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

const sampleExecTx = {
  id: 'SEL-TX-1791960568487-13j1',
  docNo: '2026/SEL-I/008',
  parentSelectionDocumentId: 'SEL1-DOC-008',
  parentSelectionDocNo: '2026/SEL-I/008',
  selectionStage: 'SELEKSI_I',
  batchCode: 'BTCH-003',
  bedenganCode: 'BED-002',
  actualPolybagInspectedQty: 5000,
  actualBibitRetainedQty: 4800,
  actualBibitSelectedQty: 200,
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

storage.set('pre_grafting_selection_documents', [sampleParentDoc]);
storage.set('selection_transactions', [sampleExecTx]);

const resolvedSource = findSourceRecord('SELEKSI_PRA_OKULASI', 'SEL-TX-1791960568487-13j1', asbUser);
assert(resolvedSource !== null, 'findSourceRecord finds execution record by SEL-TX- id');
assert(resolvedSource.batchCode === 'BTCH-003', 'Batch code is correctly resolved');
assert(resolvedSource.bedengan === 'BED-002', 'Bedengan is correctly resolved');
assert(resolvedSource.totalLayak === 4800, 'totalLayak is correctly resolved');
assert(resolvedSource.totalAfkir === 200, 'totalAfkir is correctly resolved');
console.log('✓ PASS: Test 3: findSourceRecord resolves SEL-TX ID and enriches parent document data');

// -------------------------------------------------------------
// TEST 4: getVerificationDetailData displays non-hyphen values for SELEKSI_PRA_OKULASI
// -------------------------------------------------------------
const detailData = getVerificationDetailData(resolvedSource, asbUser, 'SELEKSI_PRA_OKULASI');
const fieldBedengan = detailData.fields.find(f => f.label === 'Bedengan')?.value;
const fieldDiperiksa = detailData.fields.find(f => f.label === 'Populasi Diperiksa')?.value;
const fieldLayak = detailData.fields.find(f => f.label === 'Bibit Layak')?.value;
const fieldAfkir = detailData.fields.find(f => f.label === 'Bibit Afkir')?.value;

assert(fieldBedengan !== '-', `Bedengan is populated: ${fieldBedengan}`);
assert(fieldDiperiksa.includes('5.000'), `Populasi Diperiksa is formatted: ${fieldDiperiksa}`);
assert(fieldLayak.includes('4.800'), `Bibit Layak is formatted: ${fieldLayak}`);
assert(fieldAfkir.includes('200'), `Bibit Afkir is formatted: ${fieldAfkir}`);
console.log('✓ PASS: Test 4: getVerificationDetailData displays complete and accurate quantities (no dashes)');

// -------------------------------------------------------------
// TEST 5: approveVerification succeeds without "Data transaksi sumber tidak ditemukan"
// -------------------------------------------------------------
const approveResult = approveVerification({
  referenceType: 'SELEKSI_PRA_OKULASI',
  referenceId: 'SEL-TX-1791960568487-13j1',
  notes: 'Disetujui tes',
  currentUser: asbUser
});
assert(approveResult !== null, 'approveVerification succeeds');

const updatedExecs = storage.get('selection_transactions', []);
const updatedPreDocs = storage.get('pre_grafting_selection_documents', []);
assert(updatedExecs[0].status === 'DISETUJUI', 'Execution transaction updated to DISETUJUI');
assert(updatedPreDocs[0].status === 'DISETUJUI', 'Parent pre-grafting document synchronized to DISETUJUI');
console.log('✓ PASS: Test 5: approveVerification approves execution transaction and synchronizes parent document');

// -------------------------------------------------------------
// TEST 6: returnVerification succeeds and synchronizes
// -------------------------------------------------------------
resetAll();
storage.set('pre_grafting_selection_documents', [{ ...sampleParentDoc, status: 'SUBMITTED' }]);
storage.set('selection_transactions', [{ ...sampleExecTx, status: 'SUBMITTED' }]);

const returnResult = returnVerification({
  referenceType: 'SELEKSI_PRA_OKULASI',
  referenceId: 'SEL-TX-1791960568487-13j1',
  returnReason: 'Perbaiki data bedengan',
  currentUser: asbUser
});
assert(returnResult !== null, 'returnVerification succeeds');

const returnedExecs = storage.get('selection_transactions', []);
const returnedPreDocs = storage.get('pre_grafting_selection_documents', []);
assert(returnedExecs[0].status === 'DIKEMBALIKAN', 'Execution transaction updated to DIKEMBALIKAN');
assert(returnedPreDocs[0].status === 'DIKEMBALIKAN', 'Parent pre-grafting document synchronized to DIKEMBALIKAN');
console.log('✓ PASS: Test 6: returnVerification returns execution transaction and synchronizes parent document');

// -------------------------------------------------------------
// TEST 7: Section 11 in getMantriTodayTransactions filters out child execution transactions
// -------------------------------------------------------------
resetAll();
storage.set('selection_transactions', [
  // Child execution transaction (must NOT be in Section 11)
  {
    ...sampleExecTx,
    transactionType: 'PELAKSANAAN_SELEKSI_I',
    status: 'RECORDED'
  },
  // Genuine CULL transaction (MUST be in Section 11)
  {
    id: 'CULL-001',
    docNo: '2026/CULL/DDR/001',
    originType: 'REJECT_DEDERAN',
    status: 'READY_TO_CONFIRM',
    mantri: mantriUser.name,
    createdByUserId: mantriUser.id,
    jumlahAfkir: 100,
    jumlahLayak: 0
  }
]);

const todayTxs = getMantriTodayTransactions(mantriUser);
const penyeleksianTxs = todayTxs.filter(t => t.moduleType === MODULE_TYPES.PENYELEKSIAN);

assert(penyeleksianTxs.length === 1, `Expected exactly 1 PENYELEKSIAN transaction, found ${penyeleksianTxs.length}`);
assert(penyeleksianTxs[0].docNo === '2026/CULL/DDR/001', 'Only CULL transactions appear in Section 11');
assert(!penyeleksianTxs.some(t => t.id === 'SEL-TX-1791960568487-13j1'), 'Child execution transaction is excluded from Section 11');
console.log('✓ PASS: Test 7: Section 11 excludes child execution transactions while preserving CULL items');

console.log('====================================================');
console.log('ALL TESTS PASSED (7/7)');
console.log('====================================================');
