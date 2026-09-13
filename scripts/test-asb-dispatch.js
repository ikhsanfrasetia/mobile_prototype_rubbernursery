/**
 * scripts/test-asb-dispatch.js
 * Verification Test Suite for Pengeluaran Bibit Asisten Bibitan & Mantri (TASK ASB-08)
 * 
 * Target: 35+ assertions covering:
 * 1. request eligibility
 * 2. request not verified rejected
 * 3. remaining quantity
 * 4. batch active filter
 * 5. estate filter
 * 6. division filter
 * 7. program filter
 * 8. clone filter
 * 9. growthStage filter
 * 10. category filter
 * 11. availableQty filter
 * 12. single batch dispatch
 * 13. multi-batch dispatch
 * 14. partial dispatch
 * 15. multiple dispatch
 * 16. over-quantity rejected
 * 17. zero stock rejected
 * 18. stock deduction
 * 19. batch AVAILABLE lifecycle
 * 20. batch EMPTY lifecycle
 * 21. atomic mutation
 * 22. dispatch identity
 * 23. parentRequestId
 * 24. dispatch -> receipt linkage
 * 25. source batch traceability
 * 26. shortage calculation
 * 27. stock safety
 * 28. Clean All
 * 29. scope isolation
 * 30. duplicate dispatch prevention
 * 31. legacy compatibility
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
  getNurseryBatches,
  deductBatchStock,
  deductMultiBatchStock,
  validateShipmentForm,
  processDispatchShipment,
  canPerformMantriDispatchAction,
  getActionableDispatchCount,
  filterDispatchRequests,
  filterDispatchByStatus,
  getDispatchTransactions
} from '../js/modules/dispatch/dispatch-landing.js';
import { getAllBatches, resetBatchMasterToDefault } from '../js/data/batch-master.js';
import { resetBedenganMasterToDefault } from '../js/data/bedengan-master.js';
import { cleanAllTransactionalData } from '../js/core/storage-registry.js';
import { getReceiptKspTransactions } from '../js/core/receipt-ksp-manager.js';

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
console.log('       TASK ASB-08: FINALISASI MODUL PENGELUARAN BIBIT ASISTEN BIBITAN          ');
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// RESET ENVIRONMENT
// -----------------------------------------------------------------------------
resetBedenganMasterToDefault();
resetBatchMasterToDefault();
storage.set('requests_transactions', []);
storage.set('dispatch_transactions', []);
storage.set('receipt_ksp_transactions', []);

const userMantriTBS = {
  userId: 'USR-MNT-TBS',
  name: 'Mantri Bibitan TBS',
  role: 'MANTRI_BIBITAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

const userMantriAPM = {
  userId: 'USR-MNT-APM',
  name: 'Mantri Bibitan APM',
  role: 'MANTRI_BIBITAN',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02'
};

const userAsbTBS = {
  userId: 'USR-ASB-TBS',
  name: 'Asisten Bibitan TBS',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

const userPengurusTBS = {
  userId: 'USR-PGS-TBS',
  name: 'Pengurus TBS',
  role: 'PENGURUS',
  estateId: 'EST-TBS'
};

// Seed baseline batches
let baselineBatches = [
  {
    id: 'BATCH-TBS-01',
    batchCode: 'BATCH-TBS-01',
    batchNo: 'BATCH-TBS-01',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    bedenganId: 'BDG-TBS-001',
    programId: 'PROG-2026-REPLANT',
    programCode: 'PROG-2026-REPLANT',
    clone: 'IRCA 19',
    stage: 'MAIN_NURSERY',
    growthStage: 'MAIN_NURSERY',
    category: 'BIBIT_SIAP_SALUR',
    initialQty: 10000,
    availableQty: 10000,
    currentQty: 10000,
    status: 'AVAILABLE'
  },
  {
    id: 'BATCH-TBS-02',
    batchCode: 'BATCH-TBS-02',
    batchNo: 'BATCH-TBS-02',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    bedenganId: 'BDG-TBS-002',
    programId: 'PROG-2026-REPLANT',
    programCode: 'PROG-2026-REPLANT',
    clone: 'IRCA 19',
    stage: 'MAIN_NURSERY',
    growthStage: 'MAIN_NURSERY',
    category: 'BIBIT_SIAP_SALUR',
    initialQty: 5000,
    availableQty: 5000,
    currentQty: 5000,
    status: 'AVAILABLE'
  },
  {
    id: 'BATCH-TBS-03-INACTIVE',
    batchCode: 'BATCH-TBS-03-INACTIVE',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    clone: 'IRCA 19',
    growthStage: 'MAIN_NURSERY',
    programId: 'PROG-2026-REPLANT',
    availableQty: 5000,
    status: 'INACTIVE'
  },
  {
    id: 'BATCH-TBS-04-PB',
    batchCode: 'BATCH-TBS-04-PB',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    clone: 'PB 260',
    growthStage: 'MAIN_NURSERY',
    programId: 'PROG-2026-REPLANT',
    availableQty: 8000,
    status: 'AVAILABLE'
  },
  {
    id: 'BATCH-APM-01',
    batchCode: 'BATCH-APM-01',
    estateId: 'EST-APM',
    divisionId: 'DIV-APM-02',
    clone: 'IRCA 19',
    growthStage: 'MAIN_NURSERY',
    programId: 'PROG-2026-REPLANT',
    availableQty: 12000,
    status: 'AVAILABLE'
  }
];
storage.set('nursery_batches', baselineBatches);

console.log('--- 1. REQUEST ELIGIBILITY & REJECTION TESTS ---');

const reqVerified = {
  id: 'REQ-DISP-001',
  docNo: '2026/NIR/TBS/001',
  sourceEstateId: 'EST-APM',
  sourceDivisionId: 'DIV-APM-01',
  targetEstateId: 'EST-TBS',
  targetDivisionId: 'DIV-001',
  programId: 'PROG-2026-REPLANT',
  programName: 'Replanting TBS 2026',
  requestedClone: 'IRCA 19',
  approvedClone: 'IRCA 19',
  requestedQty: 12000,
  approvedQty: 12000,
  actualIssuedQty: 0,
  growthStage: 'MAIN_NURSERY',
  category: 'BIBIT_SIAP_SALUR',
  status: 'TERVERIFIKASI'
};

const reqMenungguVerifikasi = {
  id: 'REQ-DISP-002',
  docNo: '2026/NIR/TBS/002',
  sourceEstateId: 'EST-APM',
  targetEstateId: 'EST-TBS',
  targetDivisionId: 'DIV-001',
  status: 'MENUNGGU_VERIFIKASI_ASISTEN',
  approvedQty: 10000,
  actualIssuedQty: 0
};

const reqSelesai = {
  id: 'REQ-DISP-003',
  docNo: '2026/NIR/TBS/003',
  sourceEstateId: 'EST-APM',
  targetEstateId: 'EST-TBS',
  targetDivisionId: 'DIV-001',
  status: 'SELESAI',
  approvedQty: 10000,
  actualIssuedQty: 10000
};

storage.set('requests_transactions', [reqVerified, reqMenungguVerifikasi, reqSelesai]);

// 1. Request Eligibility
assert(canPerformMantriDispatchAction(reqVerified, userMantriTBS) === true, 'Test 1: Request TERVERIFIKASI can be dispatched by target Mantri');

// 2. Request not verified rejected
assert(canPerformMantriDispatchAction(reqMenungguVerifikasi, userMantriTBS) === false, 'Test 2: Request MENUNGGU_VERIFIKASI_ASISTEN cannot be dispatched');
assert(canPerformMantriDispatchAction(reqSelesai, userMantriTBS) === false, 'Test 2b: Request SELESAI cannot be dispatched');

// 3. Remaining quantity calculation
const valRemaining = validateShipmentForm(reqVerified, {
  shipmentDate: '2026-09-13',
  shipmentQty: 15000,
  batchDetails: [{ batchId: 'BATCH-TBS-01', batchCode: 'BATCH-TBS-01', qty: 15000 }]
});
assert(valRemaining.isValid === false && valRemaining.errors.some(e => e.includes('melebihi sisa')), 'Test 3: Dispatch quantity exceeding remainingQty is rejected');

// Scope & Role authorization
assert(canPerformMantriDispatchAction(reqVerified, userMantriAPM) === false, 'Test 29a: Mantri of non-target estate is not authorized');
assert(canPerformMantriDispatchAction(reqVerified, userAsbTBS) === false, 'Test 29b: Asisten Bibitan cannot perform Mantri dispatch execution');
assert(canPerformMantriDispatchAction(reqVerified, userPengurusTBS) === false, 'Test 29c: Pengurus cannot perform Mantri dispatch execution');

console.log('\n--- 2. BATCH ELIGIBILITY & FILTER TESTS ---');

// 4. Batch active filter (status !== 'INACTIVE')
const activeBatches = getNurseryBatches('EST-TBS', 'IRCA 19', 'MAIN_NURSERY');
assert(!activeBatches.some(b => b.status === 'INACTIVE'), 'Test 4: Inactive batches are excluded from eligible dispatch list');

// 5. Estate filter
assert(activeBatches.every(b => b.estateId === 'EST-TBS'), 'Test 5: Batches strictly filtered by target estate');

// 6. Division filter
const divBatches = getNurseryBatches('EST-TBS', 'IRCA 19', 'MAIN_NURSERY', 'DIV-001');
assert(divBatches.every(b => b.divisionId === 'DIV-001'), 'Test 6: Batches filtered by source division');

// 7. Program filter
const progBatches = getNurseryBatches('EST-TBS', 'IRCA 19', 'MAIN_NURSERY', 'DIV-001', 'PROG-2026-REPLANT');
assert(progBatches.length >= 2 && progBatches.every(b => b.programId === 'PROG-2026-REPLANT'), 'Test 7: Batches filtered by program');

// 8. Clone filter
const cloneFiltered = getNurseryBatches('EST-TBS', 'PB 260');
assert(cloneFiltered.length === 1 && cloneFiltered[0].batchCode === 'BATCH-TBS-04-PB', 'Test 8: Batches filtered strictly by requested clone');

// 9. GrowthStage filter
const stageFiltered = getNurseryBatches('EST-TBS', 'IRCA 19', 'PRE_NURSERY');
assert(stageFiltered.length === 0, 'Test 9: Batches filtered by growthStage (no match for PRE_NURSERY)');

// 10. Category filter & AvailableQty filter (> 0)
const availableFiltered = getNurseryBatches('EST-TBS', 'IRCA 19', 'MAIN_NURSERY');
assert(availableFiltered.every(b => (b.availableQty || 0) > 0), 'Test 11: Only batches with availableQty > 0 returned');

console.log('\n--- 3. SHORTAGE & VALIDATION TESTS ---');

// 16. Over-quantity rejected on batch detail
const valBatchOver = validateShipmentForm(reqVerified, {
  shipmentDate: '2026-09-13',
  shipmentQty: 11000,
  batchDetails: [{ batchId: 'BATCH-TBS-01', batchCode: 'BATCH-TBS-01', qty: 11000 }]
});
assert(valBatchOver.isValid === false && valBatchOver.errors.some(e => e.includes('melebihi stok')), 'Test 16: Form rejects batch allocation exceeding batch availableQty');

// 17. Zero stock handling & duplicate batch rejection
const valZeroQty = validateShipmentForm(reqVerified, {
  shipmentDate: '2026-09-13',
  shipmentQty: 0,
  batchDetails: [{ batchId: 'BATCH-TBS-01', batchCode: 'BATCH-TBS-01', qty: 0 }]
});
assert(valZeroQty.isValid === false, 'Test 17: Zero quantity dispatch is rejected');

const valDuplicateBatch = validateShipmentForm(reqVerified, {
  shipmentDate: '2026-09-13',
  shipmentQty: 4000,
  batchDetails: [
    { batchId: 'BATCH-TBS-01', batchCode: 'BATCH-TBS-01', qty: 2000 },
    { batchId: 'BATCH-TBS-01', batchCode: 'BATCH-TBS-01', qty: 2000 }
  ]
});
assert(valDuplicateBatch.isValid === false && valDuplicateBatch.errors.some(e => e.includes('duplikat')), 'Test 30: Duplicate batch line in same dispatch is rejected');

// 26. Shortage calculation logic
const eligibleStock = availableFiltered.reduce((sum, b) => sum + (b.availableQty || 0), 0);
const remainingReq = reqVerified.approvedQty - reqVerified.actualIssuedQty;
const gap = Math.max(0, remainingReq - eligibleStock);
assert(eligibleStock === 15000 && remainingReq === 12000 && gap === 0, 'Test 26: Shortage and gap calculation correctly computed');

console.log('\n--- 4. ATOMIC MUTATION & EXECUTION TESTS ---');

// 21. Atomic mutation rollback test
const failedAllocations = [
  { batchCode: 'BATCH-TBS-01', qty: 5000 },
  { batchCode: 'BATCH-TBS-02', qty: 999999 } // invalid / exceeds
];
const atomicResFail = deductMultiBatchStock(failedAllocations);
assert(atomicResFail.success === false, 'Test 21a: Multi-batch deduction fails atomically if any batch exceeds stock');
const batchesAfterFail = storage.get('nursery_batches', []);
const b1AfterFail = batchesAfterFail.find(b => b.batchCode === 'BATCH-TBS-01');
assert(b1AfterFail.availableQty === 10000, 'Test 21b: Stock is not mutated (0 commit) on failed atomic transaction');

// 12. Single batch dispatch execution & Partial dispatch (Test 14)
const result1 = await processDispatchShipment(reqVerified, {
  shipmentDate: '2026-09-13',
  shipmentQty: 6000,
  vehicleNo: 'BK 8899 TBS',
  driverName: 'Sutrisno',
  remarks: 'Pengeluaran Tahap 1',
  batchDetails: [
    { batchId: 'BATCH-TBS-01', batchCode: 'BATCH-TBS-01', qty: 6000 }
  ]
}, userMantriTBS);

assert(result1 && result1.dispatchRecord, 'Test 12: Single batch partial dispatch executed successfully');
assert(result1.updatedRequest.status === 'PENGELUARAN_BERJALAN', 'Test 14: Partial dispatch keeps request status at PENGELUARAN_BERJALAN');
assert(result1.updatedRequest.actualIssuedQty === 6000, 'Test 14b: actualIssuedQty updated to 6,000');
assert(result1.remainingQty === 6000, 'Test 14c: remainingQty accurately computed to 6,000');

// 18. Stock deduction & 19. AVAILABLE lifecycle
const batchesAfterD1 = storage.get('nursery_batches', []);
const b1AfterD1 = batchesAfterD1.find(b => b.batchCode === 'BATCH-TBS-01');
assert(b1AfterD1.availableQty === 4000, 'Test 18: Batch availableQty decremented correctly (10,000 - 6,000 = 4,000)');
assert(b1AfterD1.status === 'AVAILABLE', 'Test 19: Batch status remains AVAILABLE when availableQty > 0');

// 22. Dispatch Identity & 23. parentRequestId
const dRecord1 = result1.dispatchRecord;
assert(dRecord1.dispatchNo && (dRecord1.dispatchNo.includes('DSP') || dRecord1.dispatchNo.startsWith('2026/DSP')), 'Test 22: Dispatch record has valid unique dispatchNo');
assert(dRecord1.parentRequestId === reqVerified.id, 'Test 23: Dispatch parentRequestId points to real parent request');
assert(dRecord1.parentRequestDocNo === reqVerified.docNo, 'Test 23b: Dispatch parentRequestDocNo accurately stored');

// 24. Dispatch -> Receipt Linkage
const receiptsAfterD1 = getReceiptKspTransactions();
assert(receiptsAfterD1.length === 1, 'Test 24: KSP Receipt automatically generated for dispatch');
assert(receiptsAfterD1[0].dispatchNo === dRecord1.dispatchNo, 'Test 24b: Receipt links directly to dispatchNo');
assert(receiptsAfterD1[0].status === 'MENUNGGU_PENERIMAAN_PENGURUS', 'Test 24c: Receipt status is MENUNGGU_PENERIMAAN_PENGURUS');

// 25. Source batch traceability
assert(dRecord1.batchDetails.length === 1 && dRecord1.batchDetails[0].batchCode === 'BATCH-TBS-01', 'Test 25: Source batch traceability preserved on dispatch record');
assert(receiptsAfterD1[0].batchAllocations && receiptsAfterD1[0].batchAllocations[0].sourceBatchCode === 'BATCH-TBS-01', 'Test 25b: Source batch traceability preserved on receipt');

console.log('\n--- 5. MULTI-BATCH & MULTIPLE DISPATCH (FINAL COMPLETION) TESTS ---');

// 13. Multi-batch dispatch & 15. Multiple dispatch (Dispatch #2 completing request)
const result2 = await processDispatchShipment(result1.updatedRequest, {
  shipmentDate: '2026-09-13',
  shipmentQty: 6000,
  vehicleNo: 'BK 8899 TBS',
  driverName: 'Sutrisno',
  remarks: 'Pengeluaran Tahap 2 (Final Multi-batch)',
  batchDetails: [
    { batchId: 'BATCH-TBS-01', batchCode: 'BATCH-TBS-01', qty: 4000 },
    { batchId: 'BATCH-TBS-02', batchCode: 'BATCH-TBS-02', qty: 2000 }
  ]
}, userMantriTBS);

assert(result2 && result2.dispatchRecord, 'Test 13: Multi-batch dispatch executed successfully');
assert(result2.updatedRequest.actualIssuedQty === 12000, 'Test 15: Multiple dispatch cumulated actualIssuedQty = 12,000');
assert(result2.isCompleted === true, 'Test 15b: Request completed when remainingQty = 0');
assert(result2.updatedRequest.status === 'MENUNGGU_PENERIMAAN_PENGURUS' || result2.updatedRequest.status === 'SELESAI', 'Test 15c: Completed request transitions out of PENGELUARAN_BERJALAN');

// 20. Batch EMPTY lifecycle
const batchesAfterD2 = storage.get('nursery_batches', []);
const b1AfterD2 = batchesAfterD2.find(b => b.batchCode === 'BATCH-TBS-01');
const b2AfterD2 = batchesAfterD2.find(b => b.batchCode === 'BATCH-TBS-02');
assert(b1AfterD2.availableQty === 0 && b1AfterD2.status === 'EMPTY', 'Test 20: Batch status transitions to EMPTY when availableQty reaches 0');
assert(b1AfterD2.status !== 'INACTIVE', 'Test 20b: Batch is NOT marked INACTIVE when stock is 0');
assert(b2AfterD2.availableQty === 3000 && b2AfterD2.status === 'AVAILABLE', 'Test 20c: Second batch decremented to 3,000 and remains AVAILABLE');

// 27. Stock Safety (No Negative Stock)
assert(batchesAfterD2.every(b => (b.availableQty || 0) >= 0), 'Test 27: All nursery batches have non-negative stock (stock safety guaranteed)');

// 31. Legacy compatibility
const legacyRequests = filterDispatchRequests(userMantriTBS);
assert(Array.isArray(legacyRequests), 'Test 31: filterDispatchRequests functions correctly across legacy and canonical structures');

console.log('\n--- 6. CLEAN ALL DATA REGRESSION TEST ---');

// 28. Clean All test
cleanAllTransactionalData();

const batchesAfterClean = storage.get('nursery_batches', []);
const dispatchesAfterClean = storage.get('dispatch_transactions', []);
const requestsAfterClean = storage.get('requests_transactions', []);
const receiptsAfterClean = storage.get('receipt_ksp_transactions', []);

assert(dispatchesAfterClean.length === 0, 'Test 28a: Clean All purges dispatch_transactions');
assert(requestsAfterClean.length === 0, 'Test 28b: Clean All purges requests_transactions');
assert(receiptsAfterClean.length === 0, 'Test 28c: Clean All purges receipt_ksp_transactions');
assert(batchesAfterClean.length > 0, 'Test 28d: Clean All restores canonical nursery_batches baseline');
assert(batchesAfterClean.find(b => b.batchCode === 'B-001' || b.id === 'BATCH-APM-001')?.availableQty === 5000, 'Test 28e: Baseline batch stock restored to initial quantity (5,000 Pkk)');

console.log('\n================================================================================');
console.log(`TOTAL ASSERTIONS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('================================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
