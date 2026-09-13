/**
 * scripts/test-asb-consolidation.js
 * Verification Test Suite for Konsolidasi Data Asisten Bibitan (TASK ASB-11)
 * 
 * Target: 30+ assertions covering:
 * 1. request aggregation
 * 2. dispatch aggregation
 * 3. receipt aggregation
 * 4. selection aggregation
 * 5. destruction aggregation
 * 6. request-dispatch relation
 * 7. dispatch-receipt relation
 * 8. selection-batch relation
 * 9. destruction-batch relation
 * 10. scope isolation
 * 11. filter
 * 12. consistency check
 * 13. incomplete chain detection
 * 14. invalid reference detection
 * 15. derived status
 * 16. traceability chain builder
 * 17. zero stock mutation (before vs after snapshot)
 * 18. availableQty unchanged
 * 19. currentQty unchanged
 * 20. batch status unchanged
 * 21. Clean All data compatibility
 * 22. duplicate prevention
 * 23. legacy compatibility
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
  CONSOLIDATION_STATUS,
  getConsolidatedData,
  filterByAsbScope,
  runConsistencyCheck,
  buildTraceabilityChain
} from '../js/modules/consolidation/consolidation-manager.js';
import { getAllBatches, resetBatchMasterToDefault } from '../js/data/batch-master.js';
import { resetBedenganMasterToDefault } from '../js/data/bedengan-master.js';
import { cleanAllTransactionalData } from '../js/core/storage-registry.js';

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
console.log('       TASK ASB-11: FINALISASI MODUL KONSOLIDASI DATA ASISTEN BIBITAN           ');
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// RESET ENVIRONMENT & SEED TEST DATA
// -----------------------------------------------------------------------------
resetBedenganMasterToDefault();
resetBatchMasterToDefault();

const userAsbAPM = {
  userId: 'USR-ASB-APM',
  name: 'Asisten Bibitan APM',
  role: 'ASISTEN_BIBITAN',
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

// Seed Requests
const reqAPM = {
  id: 'REQ-APM-101',
  docNo: '2026/NIR/APM/101',
  sourceEstateId: 'EST-APM',
  sourceDivisionId: 'DIV-APM-02',
  targetEstateId: 'EST-APM',
  targetDivisionId: 'DIV-APM-02',
  programId: 'PRG-2026-003',
  programName: 'Replanting APM 2026',
  approvedClone: 'IRCA 19',
  approvedQty: 5000,
  actualIssuedQty: 5000,
  status: 'SELESAI'
};

const reqTBS = {
  id: 'REQ-TBS-201',
  docNo: '2026/NIR/TBS/201',
  sourceEstateId: 'EST-TBS',
  sourceDivisionId: 'DIV-001',
  targetEstateId: 'EST-TBS',
  targetDivisionId: 'DIV-001',
  approvedClone: 'PB 260',
  approvedQty: 8000,
  actualIssuedQty: 4000,
  status: 'PENGELUARAN_BERJALAN'
};

storage.set('requests_transactions', [reqAPM, reqTBS]);

// Seed Dispatches
const dispAPM = {
  id: 'DSP-APM-101',
  docNo: '2026/DSP/001',
  dispatchNo: '2026/DSP/001',
  parentRequestId: 'REQ-APM-101',
  parentRequestDocNo: '2026/NIR/APM/101',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  issuedQty: 5000,
  batchDetails: [{ batchId: 'BATCH-APM-001', batchCode: 'B-001', qty: 5000 }]
};

const dispTBS = {
  id: 'DSP-TBS-201',
  docNo: '2026/DSP/002',
  dispatchNo: '2026/DSP/002',
  parentRequestId: 'REQ-TBS-201',
  parentRequestDocNo: '2026/NIR/TBS/201',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  issuedQty: 4000,
  batchDetails: [{ batchId: 'BATCH-TBS-001', batchCode: 'B-TBS-001', qty: 4000 }]
};

storage.set('dispatch_transactions', [dispAPM, dispTBS]);

// Seed Receipts
const rcpAPM = {
  id: 'RCP-APM-101',
  docNo: '2026/RCP/001',
  receiptDocNo: '2026/RCP/001',
  dispatchId: 'DSP-APM-101',
  dispatchDocNo: '2026/DSP/001',
  parentRequestId: 'REQ-APM-101',
  targetEstateId: 'EST-APM',
  targetDivisionId: 'DIV-APM-02',
  totalShippedQty: 5000,
  totalAcceptedQty: 5000,
  totalRejectedQty: 0,
  status: 'SELESAI'
};

storage.set('receipt_ksp_transactions', [rcpAPM]);

// Seed Selections
const selAPM = {
  id: 'SEL-APM-101',
  docNo: '2026/CULL/001',
  batchId: 'BATCH-APM-001',
  batchCode: 'B-001',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  bedenganIds: ['BED-APM-D2-001'],
  jumlahDiperiksa: 1000,
  jumlahLayak: 950,
  jumlahAfkir: 50,
  status: 'DISETUJUI'
};

storage.set('selection_transactions', [selAPM]);

// Seed Destructions
const dstAPM = {
  id: 'DST-APM-101',
  docNo: '2026/DST/001',
  batchId: 'BATCH-APM-001',
  batchCode: 'B-001',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  bedenganIds: ['BED-APM-D2-001'],
  quantity: 50,
  reason: 'Bibit mati',
  status: 'DISETUJUI'
};

storage.set('destruction_transactions', [dstAPM]);

console.log('--- 1. AGGREGATION & SCOPE ISOLATION TESTS ---');

// Snapshot batch stock before consolidation
const batchesBeforeConsolidation = getAllBatches();
const b1Before = batchesBeforeConsolidation.find(b => b.id === 'BATCH-APM-001');
const snapshotAvailable = b1Before.availableQty;
const snapshotCurrent = b1Before.currentQty;
const snapshotStatus = b1Before.status;

// 1-5. Aggregations for APM
const apmData = getConsolidatedData(userAsbAPM);

assert(apmData.summary.totalRequests === 1, 'Test 1: Request aggregation scoped to APM');
assert(apmData.summary.totalDispatches === 1, 'Test 2: Dispatch aggregation scoped to APM');
assert(apmData.summary.totalReceipts === 1, 'Test 3: Receipt aggregation scoped to APM');
assert(apmData.summary.totalSelections === 1, 'Test 4: Selection aggregation scoped to APM');
assert(apmData.summary.totalDestructions === 1, 'Test 5: Destruction aggregation scoped to APM');

// 10. Scope isolation (TBS data does not leak into APM workspace)
assert(apmData.requests.every(r => r.estateId === 'EST-APM' || r.targetEstateId === 'EST-APM'), 'Test 10a: Requests strictly isolated to APM');
assert(apmData.dispatches.every(d => d.estateId === 'EST-APM'), 'Test 10b: Dispatches strictly isolated to APM');

// Scope for TBS
const tbsData = getConsolidatedData(userAsbTBS);
assert(tbsData.summary.totalRequests === 1 && tbsData.requests[0].docNo === '2026/NIR/TBS/201', 'Test 10c: TBS workspace correctly receives TBS request');
assert(tbsData.summary.totalSelections === 0, 'Test 10d: TBS workspace does not see APM selection records');

console.log('\n--- 2. RELATIONSHIP & TRACEABILITY TESTS ---');

// 6. Request-Dispatch relation
assert(apmData.dispatches[0].parentRequestId === reqAPM.id, 'Test 6: Dispatch links to parent Request ID');

// 7. Dispatch-Receipt relation
assert(apmData.receipts[0].dispatchId === dispAPM.id, 'Test 7: Receipt links to source Dispatch ID');

// 8. Selection-Batch relation
assert(apmData.selections[0].batchId === 'BATCH-APM-001', 'Test 8: Selection links to canonical Batch ID');

// 9. Destruction-Batch relation
assert(apmData.destructions[0].batchId === 'BATCH-APM-001', 'Test 9: Destruction links to canonical Batch ID');

// 16. Traceability Chain Builder
const reqChain = buildTraceabilityChain('REQUEST', reqAPM.id);
assert(reqChain.request && reqChain.request.id === reqAPM.id, 'Test 16a: Traceability resolves parent request');
assert(reqChain.dispatches.length === 1 && reqChain.dispatches[0].id === dispAPM.id, 'Test 16b: Traceability resolves child dispatch');
assert(reqChain.receipts.length === 1 && reqChain.receipts[0].id === rcpAPM.id, 'Test 16c: Traceability resolves child receipt');

const batchChain = buildTraceabilityChain('BATCH', 'BATCH-APM-001');
assert(batchChain.batches.length === 1, 'Test 16d: Traceability resolves root batch');
assert(batchChain.selections.length === 1, 'Test 16e: Traceability resolves batch selection history');
assert(batchChain.destructions.length === 1, 'Test 16f: Traceability resolves batch destruction history');

console.log('\n--- 3. CONSISTENCY CHECK & ANOMALY DETECTION TESTS ---');

// 12. Consistency check execution
const cleanCheck = runConsistencyCheck({
  requests: [reqAPM],
  dispatches: [dispAPM],
  receipts: [rcpAPM],
  selections: [selAPM],
  destructions: [dstAPM],
  batches: getAllBatches()
});
assert(cleanCheck.isValid === true && cleanCheck.errors.length === 0, 'Test 12: Clean transaction chain returns 0 errors');

// 13. Incomplete chain detection
const warningCheck = runConsistencyCheck({
  requests: [reqTBS], // issued 4000 < approved 8000
  dispatches: [dispTBS],
  batches: getAllBatches()
});
assert(warningCheck.warnings.some(w => w.type === 'INCOMPLETE_CHAIN'), 'Test 13: Incomplete request-dispatch chain flagged as WARNING');

// 14. Invalid reference / orphan detection
const orphanCheck = runConsistencyCheck({
  dispatches: [{ id: 'DSP-ERR', docNo: '2026/DSP/999', parentRequestId: 'NON_EXISTENT_REQ' }],
  receipts: [{ id: 'RCP-ERR', docNo: '2026/RCP/999', dispatchId: 'NON_EXISTENT_DSP' }],
  selections: [{ id: 'SEL-ERR', docNo: '2026/CULL/999', batchId: 'NON_EXISTENT_BATCH' }],
  destructions: [{ id: 'DST-ERR', docNo: '2026/DST/999', batchId: 'NON_EXISTENT_BATCH', quantity: 0 }],
  batches: getAllBatches()
});
assert(orphanCheck.errors.some(e => e.type === 'ORPHAN_DISPATCH'), 'Test 14a: Orphan dispatch flagged as ERROR');
assert(orphanCheck.errors.some(e => e.type === 'ORPHAN_RECEIPT'), 'Test 14b: Orphan receipt flagged as ERROR');
assert(orphanCheck.errors.some(e => e.type === 'SELECTION_MISSING_BATCH'), 'Test 14c: Missing batch in selection flagged as ERROR');
assert(orphanCheck.errors.some(e => e.type === 'DESTRUCTION_ZERO_QTY'), 'Test 14d: Zero quantity destruction flagged as ERROR');

// 15. Derived status calculation
assert(apmData.status === CONSOLIDATION_STATUS.LENGKAP, 'Test 15a: Clean dataset derived status is LENGKAP');
assert(tbsData.status === CONSOLIDATION_STATUS.TIDAK_LENGKAP, 'Test 15b: Dataset with in-progress requests derived status is TIDAK_LENGKAP');

console.log('\n--- 4. STOCK SAFETY & ZERO MUTATION TESTS ---');

// Snapshot batch stock AFTER consolidation
const batchesAfterConsolidation = getAllBatches();
const b1After = batchesAfterConsolidation.find(b => b.id === 'BATCH-APM-001');

// 17, 18, 19, 20. Zero Stock Mutation
assert(b1After.availableQty === snapshotAvailable, 'Test 17: ZERO stock mutation - availableQty strictly unchanged');
assert(b1After.currentQty === snapshotCurrent, 'Test 18: ZERO stock mutation - currentQty strictly unchanged');
assert(b1After.status === snapshotStatus, 'Test 19: ZERO stock mutation - batch status strictly unchanged');
assert(batchesAfterConsolidation.length === batchesBeforeConsolidation.length, 'Test 20: Master batches structure untouched');

console.log('\n--- 5. CLEAN ALL & REGRESSION COMPATIBILITY ---');

// 23. Legacy compatibility
const legacyCheck = getConsolidatedData(null);
assert(legacyCheck && legacyCheck.summary.totalRequests === 2, 'Test 23: Global consolidation returns all records without scope filter');

// 21. Clean All data compatibility
cleanAllTransactionalData();

const postCleanData = getConsolidatedData(userAsbAPM);
assert(postCleanData.summary.totalRequests === 0, 'Test 21a: Post Clean All requests count is 0');
assert(postCleanData.summary.totalDispatches === 0, 'Test 21b: Post Clean All dispatches count is 0');
assert(postCleanData.summary.totalReceipts === 0, 'Test 21c: Post Clean All receipts count is 0');
assert(postCleanData.summary.totalSelections === 0, 'Test 21d: Post Clean All selections count is 0');
assert(postCleanData.summary.totalDestructions === 0, 'Test 21e: Post Clean All destructions count is 0');
assert(postCleanData.summary.totalBatches > 0, 'Test 21f: Master batches preserved after Clean All');

console.log('\n================================================================================');
console.log(`TOTAL ASSERTIONS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('================================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
