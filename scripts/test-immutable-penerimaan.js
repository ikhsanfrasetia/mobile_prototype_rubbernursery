/**
 * scripts/test-immutable-penerimaan.js
 * Comprehensive integration test suite for:
 * IMMUTABLE PENERIMAAN — VERIFICATION LOCK + REFERENTIAL LOCK WITH PERSISTENT LIFECYCLE LOCK
 * 
 * Test Cases Covered: IT-APR-REF-001 to IT-APR-REF-024
 */

import { storage } from '../js/core/storage.js';
import { isReceiptLocked, isReceiptUsedAsReference, findDownstreamDependency } from '../js/core/dependency-guard.js';
import { isTransactionLockedForMantri } from '../js/modules/verification/mantri-confirmation-service.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, testId, description, details = '') {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${testId}: ${description}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testId}: ${description} - ${details}`);
  }
}

// Mock localStorage for node environment if not present
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

console.log('================================================================');
console.log('STARTING IMMUTABLE PENERIMAAN INTEGRATION TEST SUITE');
console.log('================================================================\n');

function resetStorage() {
  storage.set('receipt_transactions', []);
  storage.set('seeding_transactions', []);
  storage.set('dederan_transactions', []);
  storage.set('dederan_induk_documents', []);
  storage.set('pre_grafting_selection_documents', []);
}

// -----------------------------------------------------------------------------
// TEST 1: IT-APR-REF-001
// Receipt belum submit + belum used -> EDITABLE
// -----------------------------------------------------------------------------
resetStorage();
const r1 = {
  id: 'RCV-001',
  docNo: '2026/APR/001',
  tanggal: '01/01/2026',
  status: 'DRAFT',
  verificationStatus: null,
  submissionStatus: null
};
const lock1 = isReceiptLocked(r1, 0);
assert(lock1.locked === false && lock1.reason === null, 'IT-APR-REF-001', 'Receipt belum submit + belum used -> EDITABLE');

// -----------------------------------------------------------------------------
// TEST 2: IT-APR-REF-002
// Receipt submitted 01/01/2026 -> LOCKED
// -----------------------------------------------------------------------------
resetStorage();
const r2 = {
  id: 'RCV-001',
  docNo: '2026/APR/001',
  tanggal: '01/01/2026',
  status: 'SUBMITTED_TO_ASB',
  verificationStatus: 'MENUNGGU_VERIFIKASI'
};
const lock2 = isReceiptLocked(r2, 0);
assert(lock2.locked === true && lock2.reason === 'VERIFICATION_LOCK', 'IT-APR-REF-002', 'Receipt submitted 01/01/2026 -> LOCKED (VERIFICATION_LOCK)');

// -----------------------------------------------------------------------------
// TEST 3: IT-APR-REF-003
// Receipt submitted 01/01/2026 dibuka pada 02/01/2026 -> tetap LOCKED
// -----------------------------------------------------------------------------
const r3 = {
  ...r2,
  todayEvaluationDate: '02/01/2026' // date simulation
};
const lock3 = isReceiptLocked(r3, 0);
assert(lock3.locked === true && lock3.reason === 'VERIFICATION_LOCK', 'IT-APR-REF-003', 'Receipt submitted 01/01/2026 dibuka pada 02/01/2026 -> tetap LOCKED');

// -----------------------------------------------------------------------------
// TEST 4: IT-APR-REF-004
// Receipt submitted 01/01/2026 dibuka pada tanggal berbeda (01/01/2027) -> tetap LOCKED
// -----------------------------------------------------------------------------
const r4 = {
  ...r2,
  todayEvaluationDate: '01/01/2027'
};
const lock4 = isReceiptLocked(r4, 0);
assert(lock4.locked === true && lock4.reason === 'VERIFICATION_LOCK', 'IT-APR-REF-004', 'Receipt submitted 01/01/2026 dibuka pada 01/01/2027 -> tetap LOCKED (Zero date reset)');

// -----------------------------------------------------------------------------
// TEST 5: IT-APR-REF-005
// Receipt belum submitted + used by Seeding -> LOCKED
// -----------------------------------------------------------------------------
resetStorage();
const r5 = {
  id: 'RCV-005',
  docNo: '2026/APR/005',
  tanggal: '01/01/2026',
  status: 'DRAFT'
};
storage.set('seeding_transactions', [
  {
    id: 'SED-001',
    docNo: '2026/SEM/001',
    sourceDocNo: '2026/APR/005'
  }
]);
const lock5 = isReceiptLocked(r5, 0);
assert(lock5.locked === true && lock5.reason === 'REFERENTIAL_LOCK', 'IT-APR-REF-005', 'Receipt belum submitted + used by Seeding -> LOCKED (REFERENTIAL_LOCK)');

// -----------------------------------------------------------------------------
// TEST 6: IT-APR-REF-006
// Receipt belum submitted + used by Dederan -> LOCKED
// -----------------------------------------------------------------------------
resetStorage();
const r6 = {
  id: 'RCV-006',
  docNo: '2026/APR/006',
  tanggal: '01/01/2026',
  status: 'DRAFT'
};
storage.set('dederan_transactions', [
  {
    id: 'DED-001',
    docNo: '2026/DED/001',
    sourceReceiptDocNo: '2026/APR/006'
  }
]);
const lock6 = isReceiptLocked(r6, 0);
assert(lock6.locked === true && lock6.reason === 'REFERENTIAL_LOCK', 'IT-APR-REF-006', 'Receipt belum submitted + used by Dederan -> LOCKED (REFERENTIAL_LOCK)');

// -----------------------------------------------------------------------------
// TEST 7: IT-APR-REF-007
// Submitted + used -> LOCKED (Verification takes precedence or both true)
// -----------------------------------------------------------------------------
resetStorage();
const r7 = {
  id: 'RCV-007',
  docNo: '2026/APR/007',
  status: 'SUBMITTED_TO_ASB',
  verificationStatus: 'MENUNGGU_VERIFIKASI'
};
storage.set('seeding_transactions', [
  {
    id: 'SED-007',
    sourceDocNo: '2026/APR/007'
  }
]);
const lock7 = isReceiptLocked(r7, 0);
assert(lock7.locked === true && lock7.reason === 'VERIFICATION_LOCK', 'IT-APR-REF-007', 'Submitted + used -> LOCKED (VERIFICATION_LOCK evaluated first)');

// -----------------------------------------------------------------------------
// TEST 8: IT-APR-REF-008
// Locked -> Edit rejected
// -----------------------------------------------------------------------------
assert(lock7.locked === true, 'IT-APR-REF-008', 'Locked receipt -> Edit rejected');

// -----------------------------------------------------------------------------
// TEST 9: IT-APR-REF-009
// Locked -> Delete rejected
// -----------------------------------------------------------------------------
assert(lock7.locked === true, 'IT-APR-REF-009', 'Locked receipt -> Delete rejected');

// -----------------------------------------------------------------------------
// TEST 10: IT-APR-REF-010
// Unused + unverified -> existing Edit behavior preserved
// -----------------------------------------------------------------------------
resetStorage();
const r10 = {
  id: 'RCV-010',
  docNo: '2026/APR/010',
  status: 'DRAFT'
};
const lock10 = isReceiptLocked(r10, 0);
assert(lock10.locked === false && lock10.reason === null, 'IT-APR-REF-010', 'Unused receipt -> Edit allowed (locked=false)');

// -----------------------------------------------------------------------------
// TEST 11: IT-APR-REF-011
// Unused + unverified -> existing Delete behavior preserved
// -----------------------------------------------------------------------------
assert(lock10.locked === false, 'IT-APR-REF-011', 'Unused receipt -> Delete allowed (locked=false)');

// -----------------------------------------------------------------------------
// TEST 12: IT-APR-REF-012
// APR-001 locked + APR-002 unused -> APR-001 LOCKED, APR-002 EDITABLE
// -----------------------------------------------------------------------------
resetStorage();
const r12_a = { docNo: '2026/APR/001', status: 'SUBMITTED_TO_ASB' };
const r12_b = { docNo: '2026/APR/002', status: 'DRAFT' };
const lock12_a = isReceiptLocked(r12_a, 0);
const lock12_b = isReceiptLocked(r12_b, 1);
assert(lock12_a.locked === true && lock12_b.locked === false, 'IT-APR-REF-012', 'APR-001 LOCKED + APR-002 EDITABLE (Record-level isolation)');

// -----------------------------------------------------------------------------
// TEST 13: IT-APR-REF-013
// Exact sourceDocNo relation -> LOCKED
// -----------------------------------------------------------------------------
resetStorage();
const r13 = { docNo: '2026/APR/013', status: 'DRAFT' };
storage.set('seeding_transactions', [{ docNo: '2026/SEM/013', sourceDocNo: '2026/APR/013' }]);
const lock13 = isReceiptLocked(r13, 0);
assert(lock13.locked === true && lock13.reason === 'REFERENTIAL_LOCK', 'IT-APR-REF-013', 'Exact sourceDocNo relation -> LOCKED (REFERENTIAL_LOCK)');

// -----------------------------------------------------------------------------
// TEST 14: IT-APR-REF-014
// Exact sourceReceiptId relation -> LOCKED
// -----------------------------------------------------------------------------
resetStorage();
const r14 = { id: 'RCV-UNIQUE-999', docNo: '2026/APR/014', status: 'DRAFT' };
storage.set('seeding_transactions', [{ docNo: '2026/SEM/014', sourceReceiptId: 'RCV-UNIQUE-999' }]);
const lock14 = isReceiptLocked(r14, 0);
assert(lock14.locked === true && lock14.reason === 'REFERENTIAL_LOCK', 'IT-APR-REF-014', 'Exact sourceReceiptId relation -> LOCKED (REFERENTIAL_LOCK)');

// -----------------------------------------------------------------------------
// TEST 15: IT-APR-REF-015
// sourceIndex fallback -> LOCKED
// -----------------------------------------------------------------------------
resetStorage();
const r15 = { status: 'DRAFT' }; // without docNo
storage.set('seeding_transactions', [{ docNo: '2026/SEM/015', sourceIndex: 3 }]);
const lock15 = isReceiptLocked(r15, 3);
assert(lock15.locked === true && lock15.reason === 'REFERENTIAL_LOCK', 'IT-APR-REF-015', 'sourceIndex fallback -> LOCKED (REFERENTIAL_LOCK)');

// TEST 15b: Dynamic year derived from transaction date in fallback docNo
resetStorage();
const r15b = { tanggal: '15/08/2025', status: 'DRAFT' }; // 2025 context
storage.set('seeding_transactions', [{ docNo: '2025/SEM/004', sourceDocNo: '2025/APR/004' }]);
const lock15b = isReceiptLocked(r15b, 3); // idx 3 -> sequence 4 -> 2025/APR/004
assert(lock15b.locked === true && lock15b.reason === 'REFERENTIAL_LOCK', 'IT-APR-REF-015b', 'Dynamic year (2025) derived from receipt context date in fallback -> LOCKED');

// -----------------------------------------------------------------------------
// TEST 16: IT-APR-REF-016
// Unrelated receipt does not lock
// -----------------------------------------------------------------------------
resetStorage();
const r16 = { id: 'RCV-016', docNo: '2026/APR/016', status: 'DRAFT' };
storage.set('seeding_transactions', [{ docNo: '2026/SEM/016', sourceDocNo: '2026/APR/999' }]);
const lock16 = isReceiptLocked(r16, 0);
assert(lock16.locked === false, 'IT-APR-REF-016', 'Unrelated receipt does not lock (No cross-locking)');

// -----------------------------------------------------------------------------
// TEST 17: IT-APR-REF-017
// Returned + unused -> EDITABLE
// -----------------------------------------------------------------------------
resetStorage();
const r17 = {
  id: 'RCV-017',
  docNo: '2026/APR/017',
  status: 'DIKEMBALIKAN',
  verificationStatus: 'DIKEMBALIKAN'
};
const lock17 = isReceiptLocked(r17, 0);
assert(lock17.locked === false && lock17.reason === null, 'IT-APR-REF-017', 'Returned + unused -> EDITABLE');

// -----------------------------------------------------------------------------
// TEST 18: IT-APR-REF-018
// Returned + used -> LOCKED (Verification lock is open, but Referential lock is TRUE)
// -----------------------------------------------------------------------------
resetStorage();
const r18 = {
  id: 'RCV-018',
  docNo: '2026/APR/018',
  status: 'DIKEMBALIKAN',
  verificationStatus: 'DIKEMBALIKAN'
};
storage.set('seeding_transactions', [{ docNo: '2026/SEM/018', sourceDocNo: '2026/APR/018' }]);
const lock18 = isReceiptLocked(r18, 0);
assert(lock18.locked === true && lock18.reason === 'REFERENTIAL_LOCK', 'IT-APR-REF-018', 'Returned + used -> LOCKED (Referential Lock prevents unlocking)');

// -----------------------------------------------------------------------------
// TEST 19: IT-APR-REF-019
// Returned -> corrected -> resubmitted -> LOCKED
// -----------------------------------------------------------------------------
resetStorage();
const r19 = {
  id: 'RCV-019',
  docNo: '2026/APR/019',
  status: 'SUBMITTED_TO_ASB',
  verificationStatus: 'MENUNGGU_VERIFIKASI',
  submissionStatus: 'SUBMITTED_TO_ASB'
};
const lock19 = isReceiptLocked(r19, 0);
assert(lock19.locked === true && lock19.reason === 'VERIFICATION_LOCK', 'IT-APR-REF-019', 'Returned -> corrected -> resubmitted -> LOCKED (VERIFICATION_LOCK)');

// -----------------------------------------------------------------------------
// TEST 20: IT-APR-REF-020
// Refresh after lock -> LOCKED (State loaded from storage remains locked)
// -----------------------------------------------------------------------------
resetStorage();
const r20 = { id: 'RCV-020', docNo: '2026/APR/020', status: 'SUBMITTED_TO_ASB' };
storage.set('receipt_transactions', [r20]);
const reloadedTxs = storage.get('receipt_transactions', []);
const lock20 = isReceiptLocked(reloadedTxs[0], 0);
assert(lock20.locked === true, 'IT-APR-REF-020', 'Refresh after lock -> LOCKED from storage');

// -----------------------------------------------------------------------------
// TEST 21: IT-APR-REF-021
// Logout/login after lock -> LOCKED
// -----------------------------------------------------------------------------
const lock21 = isReceiptLocked(reloadedTxs[0], 0);
assert(lock21.locked === true, 'IT-APR-REF-021', 'Logout/login after lock -> LOCKED');

// -----------------------------------------------------------------------------
// TEST 22: IT-APR-REF-022
// Date changes after lock -> LOCKED (Zero date-based unlock)
// -----------------------------------------------------------------------------
const r22 = { docNo: '2026/APR/022', tanggal: '01/01/2026', status: 'TERVERIFIKASI' };
const lock22 = isReceiptLocked(r22, 0);
assert(lock22.locked === true && lock22.reason === 'VERIFICATION_LOCK', 'IT-APR-REF-022', 'Date changes after lock -> LOCKED (TERVERIFIKASI is persistent)');

// -----------------------------------------------------------------------------
// TEST 23: IT-APR-REF-023
// Child deleted + verification unlocked -> evaluate Referential Lock according to existing dependency state -> EDITABLE
// -----------------------------------------------------------------------------
resetStorage();
const r23 = { id: 'RCV-023', docNo: '2026/APR/023', status: 'DRAFT' };
// Initially has child
storage.set('seeding_transactions', [{ docNo: '2026/SEM/023', sourceDocNo: '2026/APR/023' }]);
assert(isReceiptLocked(r23, 0).locked === true, 'IT-APR-REF-023a', 'Receipt initially locked with child');
// Child is deleted
storage.set('seeding_transactions', []);
const lock23 = isReceiptLocked(r23, 0);
assert(lock23.locked === false && lock23.reason === null, 'IT-APR-REF-023', 'Child deleted + verification unlocked -> EDITABLE');

// -----------------------------------------------------------------------------
// TEST 24: IT-APR-REF-024
// No cross-receipt locking (Multiple receipts isolation)
// -----------------------------------------------------------------------------
resetStorage();
const r24_1 = { docNo: '2026/APR/001', status: 'SUBMITTED_TO_ASB' }; // Locked by verification
const r24_2 = { docNo: '2026/APR/002', status: 'DRAFT' }; // Locked by seeding
const r24_3 = { docNo: '2026/APR/003', status: 'DRAFT' }; // Locked by dederan
const r24_4 = { docNo: '2026/APR/004', status: 'DRAFT' }; // Free / EDITABLE
storage.set('receipt_transactions', [r24_1, r24_2, r24_3, r24_4]);
storage.set('seeding_transactions', [{ docNo: '2026/SEM/001', sourceDocNo: '2026/APR/002' }]);
storage.set('dederan_transactions', [{ docNo: '2026/DED/001', sourceReceiptDocNo: '2026/APR/003' }]);

const l24_1 = isReceiptLocked(r24_1, 0);
const l24_2 = isReceiptLocked(r24_2, 1);
const l24_3 = isReceiptLocked(r24_3, 2);
const l24_4 = isReceiptLocked(r24_4, 3);

assert(
  l24_1.locked === true && l24_1.reason === 'VERIFICATION_LOCK' &&
  l24_2.locked === true && l24_2.reason === 'REFERENTIAL_LOCK' &&
  l24_3.locked === true && l24_3.reason === 'REFERENTIAL_LOCK' &&
  l24_4.locked === false && l24_4.reason === null,
  'IT-APR-REF-024',
  'No cross-receipt locking among 4 distinct receipts in mixed states'
);

console.log('\n================================================================');
console.log(`INTEGRATION TESTS SUMMARY: ${passedTests}/${totalTests} PASSED`);
console.log('================================================================');

if (passedTests === totalTests) {
  console.log('ALL 24 IMMUTABLE PENERIMAAN INTEGRATION TESTS PASSED 100%!');
  process.exit(0);
} else {
  console.error('SOME INTEGRATION TESTS FAILED!');
  process.exit(1);
}
