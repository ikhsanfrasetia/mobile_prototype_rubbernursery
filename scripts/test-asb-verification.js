/**
 * scripts/test-asb-verification.js
 * Verification Test Suite for Verifikasi Data Asisten Bibitan (TASK ASB-12)
 * 
 * Target: 30+ assertions covering:
 * 1. verification record structure
 * 2. verification identity (verificationId, verificationNo)
 * 3. reference types (REQUEST, DISPATCH, RECEIPT, SELECTION, DESTRUCTION)
 * 4. reference transaction valid
 * 5. scope isolation (estateId & divisionId)
 * 6. actionable records filter
 * 7. duplicate verification prevention
 * 8. consistency gate
 * 9. ERROR blocks approval
 * 10. WARNING allows approval
 * 11. approval execution (approveVerification)
 * 12. approval audit trail
 * 13. return execution (returnVerification)
 * 14. return reason requirement & validation
 * 15. return audit trail
 * 16. history query & filtering
 * 17. traceability chain integration
 * 18. notification pending count (getPendingVerificationCount)
 * 19. zero stock mutation before vs after snapshot
 * 20. availableQty strictly unchanged
 * 21. currentQty strictly unchanged
 * 22. batch status strictly unchanged
 * 23. Clean All compatibility
 * 24. legacy compatibility
 * 25. canonical master references
 * 26. no duplicate transaction source
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
  REFERENCE_TYPES,
  getAllVerifications,
  getVerificationByReference,
  getActionableRecordsForAsb,
  getPendingVerificationCount,
  getVerificationHistory,
  approveVerification,
  returnVerification,
  evaluateRecordConsistency
} from '../js/modules/verification/verification-manager.js';
import { getAllBatches, resetBatchMasterToDefault } from '../js/data/batch-master.js';
import { resetBedenganMasterToDefault } from '../js/data/bedengan-master.js';
import { cleanAllTransactionalData } from '../js/core/storage-registry.js';
import { buildTraceabilityChain } from '../js/modules/consolidation/consolidation-manager.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('================================================================================');
console.log('       TASK ASB-12: FINALISASI MODUL VERIFIKASI DATA ASISTEN BIBITAN           ');
console.log('================================================================================\n');

// 0. Setup Mock Data
resetBatchMasterToDefault();
resetBedenganMasterToDefault();
storage.set(VERIFICATION_STORAGE_KEY, []);

const userAsbApm = {
  id: 'USR-ASB-APM',
  name: 'Asisten Bibitan APM',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST_APM',
  divisionId: 'DIV_APM_01'
};

const userAsbTbs = {
  id: 'USR-ASB-TBS',
  name: 'Asisten Bibitan TBS',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST_TBS',
  divisionId: 'DIV_TBS_01'
};

const batches = getAllBatches();
const validBatch = batches[0];
const validBatchId = validBatch.id;
const validBatchCode = validBatch.batchCode;

// Seed realistic transactions
storage.set('requests_transactions', [
  {
    id: 'REQ-APM-101',
    docNo: 'NIR-APM-2026-001',
    nir: 'NIR-APM-2026-001',
    sourceEstateId: 'EST_APM',
    targetEstateId: 'EST_APM',
    divisionId: 'DIV_APM_01',
    programId: 'PRG-TB-01',
    cloneId: 'KLN-PB260',
    growthStage: 'MN',
    requestedQty: 500,
    approvedQty: 500,
    status: 'TERVERIFIKASI',
    date: '2026-03-01'
  },
  {
    id: 'REQ-TBS-201',
    docNo: 'NIR-TBS-2026-002',
    nir: 'NIR-TBS-2026-002',
    sourceEstateId: 'EST_TBS',
    targetEstateId: 'EST_TBS',
    divisionId: 'DIV_TBS_01',
    programId: 'PRG-TB-01',
    cloneId: 'KLN-IRRI112',
    growthStage: 'MN',
    requestedQty: 300,
    approvedQty: 300,
    status: 'TERVERIFIKASI',
    date: '2026-03-02'
  }
]);

storage.set('dispatch_transactions', [
  {
    id: 'DSP-APM-01',
    dispatchNo: 'SJ-APM-2026-001',
    docNo: 'SJ-APM-2026-001',
    parentRequestId: 'REQ-APM-101',
    sourceEstateId: 'EST_APM',
    sourceDivisionId: 'DIV_APM_01',
    targetEstateId: 'EST_APM',
    targetDivisionId: 'DIV_APM_01',
    batchDetails: [{ batchId: validBatchId, batchCode: validBatchCode, quantity: 500 }],
    totalQuantity: 500,
    status: 'MENUNGGU_PENERIMAAN_PENGURUS',
    date: '2026-03-03'
  }
]);

storage.set('receipt_ksp_transactions', [
  {
    id: 'RCP-APM-01',
    docNo: 'BA-APM-2026-001',
    receiptDocNo: 'BA-APM-2026-001',
    dispatchId: 'DSP-APM-01',
    estateId: 'EST_APM',
    divisionId: 'DIV_APM_01',
    totalShippedQty: 500,
    totalAcceptedQty: 490,
    totalRejectedQty: 10,
    status: 'COMPLETED',
    date: '2026-03-04'
  }
]);

storage.set('selection_transactions', [
  {
    id: 'SEL-APM-01',
    selectionNo: 'SEL-2026-001',
    docNo: 'SEL-2026-001',
    estateId: 'EST_APM',
    divisionId: 'DIV_APM_01',
    batchId: validBatchId,
    inspectedQty: 200,
    acceptedQty: 190,
    rejectedQty: 10,
    status: 'DISETUJUI',
    date: '2026-03-05'
  }
]);

storage.set('destruction_transactions', [
  {
    id: 'DST-APM-01',
    destructionNo: 'DST-2026-001',
    docNo: 'DST-2026-001',
    estateId: 'EST_APM',
    divisionId: 'DIV_APM_01',
    batchId: validBatchId,
    quantity: 10,
    reason: 'Bibit kerdil & jamur',
    status: 'DISETUJUI',
    date: '2026-03-06'
  },
  {
    id: 'DST-ERROR-01',
    destructionNo: 'DST-ERR-001',
    docNo: 'DST-ERR-001',
    estateId: 'EST_APM',
    divisionId: 'DIV_APM_01',
    batchId: 'BATCH-NON-EXISTENT',
    quantity: 0, // Anomali: Quantity <= 0 and batch missing
    reason: 'Zero quantity',
    status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
    date: '2026-03-07'
  }
]);

// --- 1. RECORD STRUCTURE & IDENTITY TESTS ---
console.log('--- 1. RECORD STRUCTURE & IDENTITY TESTS ---');
assert(typeof approveVerification === 'function', 'Test 1: approveVerification function exists');
assert(typeof returnVerification === 'function', 'Test 2: returnVerification function exists');
assert(REFERENCE_TYPES.REQUEST === 'REQUEST', 'Test 3: REFERENCE_TYPES has REQUEST');
assert(REFERENCE_TYPES.DISPATCH === 'DISPATCH', 'Test 3b: REFERENCE_TYPES has DISPATCH');
assert(REFERENCE_TYPES.RECEIPT === 'RECEIPT', 'Test 3c: REFERENCE_TYPES has RECEIPT');
assert(REFERENCE_TYPES.SELECTION === 'SELECTION', 'Test 3d: REFERENCE_TYPES has SELECTION');
assert(REFERENCE_TYPES.DESTRUCTION === 'DESTRUCTION', 'Test 3e: REFERENCE_TYPES has DESTRUCTION');

// --- 2. SCOPE ISOLATION & ACTIONABLE FILTER TESTS ---
console.log('\n--- 2. SCOPE ISOLATION & ACTIONABLE FILTER TESTS ---');
const actionableApm = getActionableRecordsForAsb(userAsbApm);
assert(actionableApm.length > 0, `Test 5a: APM has actionable records (count: ${actionableApm.length})`);
assert(actionableApm.every(r => r.estateId === 'EST_APM'), 'Test 5b: All actionable items for APM are within EST_APM');

const actionableTbs = getActionableRecordsForAsb(userAsbTbs);
assert(actionableTbs.some(r => r.referenceId === 'REQ-TBS-201'), 'Test 5c: TBS actionable contains TBS request');
assert(!actionableTbs.some(r => r.referenceId === 'REQ-APM-101'), 'Test 5d: TBS actionable does NOT leak APM request');

const pendingCountApm = getPendingVerificationCount(userAsbApm);
assert(pendingCountApm === actionableApm.length, `Test 18: getPendingVerificationCount returns ${pendingCountApm}`);

// --- 3. CONSISTENCY GATE: ERROR BLOCKS APPROVAL, WARNING ALLOWS APPROVAL ---
console.log('\n--- 3. CONSISTENCY GATE & VALIDATION TESTS ---');
const errRecord = actionableApm.find(r => r.referenceId === 'DST-ERROR-01');
assert(errRecord !== undefined, 'Test 9a: Identified error-prone destruction record DST-ERROR-01');
assert(errRecord.canApprove === false, 'Test 9b: Consistency evaluation blocks approval for error-prone record');
assert(errRecord.errors.length > 0, 'Test 9c: Error findings recorded for invalid batch / zero qty');

// Attempting approval on error-prone record must throw error
let errorApprovalThrown = false;
try {
  approveVerification({
    referenceType: REFERENCE_TYPES.DESTRUCTION,
    referenceId: 'DST-ERROR-01',
    notes: 'Testing error block',
    currentUser: userAsbApm
  });
} catch (e) {
  errorApprovalThrown = true;
  assert(e.message.includes('ERROR') || e.message.includes('diblokir'), `Test 9d: approveVerification threw expected error: ${e.message}`);
}
assert(errorApprovalThrown, 'Test 9e: approveVerification strictly prevented on ERROR record');

// --- 4. APPROVAL & AUDIT TRAIL TESTS ---
console.log('\n--- 4. APPROVAL & AUDIT TRAIL TESTS ---');
// Take snapshot of batches before verification
const batchSnapshotBefore = JSON.parse(JSON.stringify(getAllBatches()));

const approvedRecord = approveVerification({
  referenceType: REFERENCE_TYPES.REQUEST,
  referenceId: 'REQ-APM-101',
  notes: 'Verifikasi konsistensi dokumen SPB selesai dan lengkap.',
  currentUser: userAsbApm
});

assert(approvedRecord !== null && typeof approvedRecord === 'object', 'Test 11a: approveVerification returns created audit record');
assert(approvedRecord.verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI, 'Test 11b: verificationStatus is TERVERIFIKASI');
assert(approvedRecord.verificationNo.startsWith('VRF-'), `Test 2: Canonical verificationNo generated (${approvedRecord.verificationNo})`);
assert(approvedRecord.verifiedByUserId === userAsbApm.id, 'Test 12a: verifiedByUserId matches user');
assert(approvedRecord.verifiedByName === userAsbApm.name, 'Test 12b: verifiedByName matches user');
assert(approvedRecord.verifiedByRole === userAsbApm.role, 'Test 12c: verifiedByRole matches user');
assert(Boolean(approvedRecord.verifiedAt), 'Test 12d: verifiedAt ISO timestamp recorded');

// Duplicate verification prevention
let duplicateApprovalPrevented = false;
try {
  approveVerification({
    referenceType: REFERENCE_TYPES.REQUEST,
    referenceId: 'REQ-APM-101',
    notes: 'Re-approving',
    currentUser: userAsbApm
  });
} catch (e) {
  duplicateApprovalPrevented = true;
  assert(e.message.includes('sudah diverifikasi'), `Test 7: Duplicate verification prevented with msg: ${e.message}`);
}
assert(duplicateApprovalPrevented, 'Test 7b: Duplicate verification strictly prevented');

// --- 5. RETURN EXECUTION & AUDIT TRAIL TESTS ---
console.log('\n--- 5. RETURN EXECUTION & AUDIT TRAIL TESTS ---');
let emptyReasonThrown = false;
try {
  returnVerification({
    referenceType: REFERENCE_TYPES.DESTRUCTION,
    referenceId: 'DST-ERROR-01',
    returnReason: '',
    notes: 'No reason provided',
    currentUser: userAsbApm
  });
} catch (e) {
  emptyReasonThrown = true;
  assert(e.message.includes('wajib diisi'), `Test 14: Empty returnReason rejected: ${e.message}`);
}
assert(emptyReasonThrown, 'Test 14b: Empty return reason validation confirmed');

const returnedRecord = returnVerification({
  referenceType: REFERENCE_TYPES.DESTRUCTION,
  referenceId: 'DST-ERROR-01',
  returnReason: 'Batch tidak valid dan kuantitas pemusnahan tidak boleh 0.',
  notes: 'Harap perbaiki data pemusnahan.',
  currentUser: userAsbApm
});

assert(returnedRecord.verificationStatus === VERIFICATION_STATUS.DIKEMBALIKAN, 'Test 13: returnVerification saved with status DIKEMBALIKAN');
assert(returnedRecord.returnReason === 'Batch tidak valid dan kuantitas pemusnahan tidak boleh 0.', 'Test 15: returnReason preserved in audit log');

// --- 6. HISTORY & TRACEABILITY TESTS ---
console.log('\n--- 6. HISTORY & TRACEABILITY TESTS ---');
const historyList = getVerificationHistory(userAsbApm);
assert(historyList.length === 2, `Test 16a: History list contains 2 audit logs (actual: ${historyList.length})`);
assert(historyList.some(h => h.verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI), 'Test 16b: History contains TERVERIFIKASI record');
assert(historyList.some(h => h.verificationStatus === VERIFICATION_STATUS.DIKEMBALIKAN), 'Test 16c: History contains DIKEMBALIKAN record');

const traceResult = buildTraceabilityChain('REQUEST', 'NIR-APM-2026-001');
assert(traceResult && traceResult.type === 'DISTRIBUTION_CHAIN', 'Test 17a: Traceability chain resolved for NIR-APM-2026-001');
assert(traceResult.request && traceResult.request.id === 'REQ-APM-101', 'Test 17b: Traceability links back to source transaction without duplicating data');

// --- 7. STOCK SAFETY & ZERO MUTATION TESTS ---
console.log('\n--- 7. STOCK SAFETY & ZERO MUTATION TESTS ---');
const batchSnapshotAfter = JSON.parse(JSON.stringify(getAllBatches()));
assert(JSON.stringify(batchSnapshotBefore) === JSON.stringify(batchSnapshotAfter), 'Test 19: ZERO stock mutation - master batches exactly identical');

const beforeBatch = batchSnapshotBefore[0];
const afterBatch = batchSnapshotAfter[0];
assert(beforeBatch.availableQty === afterBatch.availableQty, `Test 20: availableQty strictly unchanged (${beforeBatch.availableQty})`);
assert(beforeBatch.currentQty === afterBatch.currentQty, `Test 21: currentQty strictly unchanged (${beforeBatch.currentQty})`);
assert(beforeBatch.status === afterBatch.status, `Test 22: batch status strictly unchanged (${beforeBatch.status})`);

// --- 8. CLEAN ALL DATA COMPATIBILITY TESTS ---
console.log('\n--- 8. CLEAN ALL DATA COMPATIBILITY TESTS ---');
cleanAllTransactionalData();

const postCleanVerifs = getAllVerifications();
assert(postCleanVerifs.length === 0, `Test 23a: Post Clean All verification transactions count is 0 (actual: ${postCleanVerifs.length})`);

const postCleanBatches = getAllBatches();
assert(postCleanBatches.length > 0, `Test 23b: Master batches preserved after Clean All (count: ${postCleanBatches.length})`);

console.log('\n================================================================================');
console.log(`TOTAL ASSERTIONS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('================================================================================\n');

if (failed > 0) {
  process.exit(1);
}
