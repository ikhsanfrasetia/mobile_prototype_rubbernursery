/**
 * scripts/test-asb-destruction-stock.js
 * Verification Test Suite for Mutasi Stok Pemusnahan Bibit Asisten Bibitan (TASK ASB-14)
 * 
 * Target: 35+ assertions covering:
 * 1. approved destruction eligible
 * 2. pending destruction rejected
 * 3. returned destruction rejected
 * 4. batch exists validation
 * 5. destructionQty validation (> 0 required, 0 rejected)
 * 6. stock deduction on availableQty
 * 7. currentQty sync with availableQty
 * 8. AVAILABLE lifecycle remains when availableQty > 0
 * 9. EMPTY lifecycle when availableQty reaches 0
 * 10. insufficient stock rejection (stockMutationStatus: FAILED)
 * 11. negative stock impossible
 * 12. duplicate mutation prevention
 * 13. idempotency returns ALREADY_APPLIED
 * 14. mutation audit trail (performedBy, performedAt, qty)
 * 15. traceability (Destruction -> Batch -> Stock Mutation)
 * 16. program validation
 * 17. estate validation
 * 18. division validation
 * 19. batch validation
 * 20. scope isolation
 * 21. failed mutation metadata
 * 22. retry safety
 * 23. clean all compatibility
 * 24. legacy compatibility
 * 25. bedengan untouched
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
  DESTRUCTION_STATUS,
  STOCK_MUTATION_STATUS,
  DESTRUCTION_STORAGE_KEY,
  createDestructionRecord,
  approveDestructionRecord,
  returnDestructionRecord,
  mutateStockFromDestruction
} from '../js/modules/destruction/destruction-manager.js';
import { getAllBatches, getBatchById, resetBatchMasterToDefault } from '../js/data/batch-master.js';
import { getAllBedengan, resetBedenganMasterToDefault } from '../js/data/bedengan-master.js';
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
console.log('       TASK ASB-14: MUTASI STOK PEMUSNAHAN BIBIT ASISTEN BIBITAN               ');
console.log('================================================================================\n');

// 0. RESET ENVIRONMENT
resetBedenganMasterToDefault();
resetBatchMasterToDefault();
storage.set(DESTRUCTION_STORAGE_KEY, []);

const userAsbAPM = {
  userId: 'USR-ASB-APM',
  name: 'Asisten Bibitan APM',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02'
};

const userMantriAPM = {
  userId: 'USR-MNT-APM',
  name: 'Mantri Bibitan APM',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02'
};

const userAsbTBS = {
  userId: 'USR-ASB-TBS',
  name: 'Asisten Bibitan TBS',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-TBS-01'
};

const userMantriTBS = {
  userId: 'USR-MNT-TBS',
  name: 'Mantri Bibitan TBS',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-TBS-01'
};

// --- 1. DESTRUCTION ELIGIBILITY TESTS ---
console.log('--- 1. DESTRUCTION ELIGIBILITY & WORKFLOW GATING ---');

// Create pending destruction
const pendingDest = createDestructionRecord({
  batchId: 'BATCH-APM-001',
  batchCode: 'B-001',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  programId: 'PRG-2026-003',
  quantity: 200,
  reason: 'Bibit mati kekeringan',
  description: 'Pemusnahan bibit mati di bedengan 1'
}, userMantriAPM);

assert(pendingDest.status === DESTRUCTION_STATUS.MENUNGGU_VERIFIKASI, 'Test 1a: Newly created destruction is MENUNGGU_VERIFIKASI');

// Attempt to mutate pending destruction -> MUST BE REJECTED
let pendingMutateFailed = false;
try {
  mutateStockFromDestruction(pendingDest.id, userAsbAPM);
} catch (e) {
  pendingMutateFailed = true;
  assert(e.message.includes('Hanya pengajuan pemusnahan dengan status DISETUJUI'), `Test 2: Pending destruction rejected from stock mutation: ${e.message}`);
}
assert(pendingMutateFailed, 'Test 2b: Mutation blocked for unapproved destruction');

// Create returned destruction
const returnedDest = createDestructionRecord({
  batchId: 'BATCH-APM-001',
  batchCode: 'B-001',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  programId: 'PRG-2026-003',
  quantity: 50,
  reason: 'Kerusakan fisik',
  description: 'Pengajuan pemusnahan'
}, userMantriAPM);

returnDestructionRecord(returnedDest.id, 'Dokumen foto tidak jelas', userAsbAPM);

let returnedMutateFailed = false;
try {
  mutateStockFromDestruction(returnedDest.id, userAsbAPM);
} catch (e) {
  returnedMutateFailed = true;
  assert(e.message.includes('Hanya pengajuan pemusnahan dengan status DISETUJUI'), `Test 3: Returned destruction rejected from stock mutation: ${e.message}`);
}
assert(returnedMutateFailed, 'Test 3b: Mutation blocked for DIKEMBALIKAN destruction');

// --- 2. DESTRUCTION QUANTITY VALIDATION (> 0 REQUIRED) ---
console.log('\n--- 2. DESTRUCTION QUANTITY VALIDATION ---');
let zeroQtyRejected = false;
try {
  createDestructionRecord({
    batchId: 'BATCH-APM-001',
    batchCode: 'B-001',
    estateId: 'EST-APM',
    divisionId: 'DIV-APM-02',
    programId: 'PRG-2026-003',
    quantity: 0,
    reason: 'Bibit mati'
  }, userMantriAPM);
} catch (e) {
  zeroQtyRejected = true;
  assert(e.message.includes('lebih besar dari 0'), `Test 5: Zero destruction quantity strictly rejected at validation: ${e.message}`);
}
assert(zeroQtyRejected, 'Test 5b: Zero destruction quantity rejection confirmed');

// --- 3. STOCK DEDUCTION FORMULA & EXECUTION TESTS ---
console.log('\n--- 3. STOCK DEDUCTION FORMULA (destructionQty) ---');
const bedenganBefore = JSON.parse(JSON.stringify(getAllBedengan()));
const bBefore = getBatchById('BATCH-APM-001');
const initialAvail = bBefore.availableQty; // 5000

// Approve pendingDest (quantity = 200)
approveDestructionRecord(pendingDest.id, 'Disetujui untuk dimusnahkan di tempat', userAsbAPM);

const mutResult = mutateStockFromDestruction(pendingDest.id, userAsbAPM);
const bAfter = getBatchById('BATCH-APM-001');

assert(mutResult.status === STOCK_MUTATION_STATUS.APPLIED, 'Test 1: Approved destruction successfully mutated stock');
assert(mutResult.success === true, 'Test 6a: Mutation success flag is true');
assert(bAfter.availableQty === initialAvail - 200, `Test 6b: availableQty accurately deducted by destructionQty (5000 - 200 = ${bAfter.availableQty})`);
assert(bAfter.currentQty === bAfter.availableQty, `Test 7: currentQty is 100% synchronized with availableQty (${bAfter.currentQty})`);
assert(bAfter.status === 'AVAILABLE', 'Test 8: Batch status remains AVAILABLE when stock > 0');

// 25. Bedengan untouched
const bedenganAfter = JSON.parse(JSON.stringify(getAllBedengan()));
assert(JSON.stringify(bedenganBefore) === JSON.stringify(bedenganAfter), 'Test 25: Master Bedengan is 100% UNTOUCHED by destruction stock mutation');

// 14. Audit trail verification
assert(mutResult.destruction.stockMutationStatus === 'APPLIED', 'Test 14a: stockMutationStatus APPLIED recorded on destruction transaction');
assert(mutResult.destruction.stockMutationQty === 200, 'Test 14b: stockMutationQty accurately recorded (200)');
assert(mutResult.destruction.stockMutationByUserId === userAsbAPM.userId, 'Test 14c: stockMutationByUserId recorded');
assert(mutResult.destruction.stockMutationByName === userAsbAPM.name, 'Test 14d: stockMutationByName recorded');
assert(mutResult.destruction.stockMutationByRole === 'ASISTEN_BIBITAN', 'Test 14e: stockMutationByRole recorded');
assert(Boolean(mutResult.destruction.stockMutationAt), 'Test 14f: stockMutationAt timestamp logged');

// --- 4. IDEMPOTENCY & DUPLICATE PREVENTION TESTS ---
console.log('\n--- 4. IDEMPOTENCY & DUPLICATE PREVENTION ---');
const secondAttempt = mutateStockFromDestruction(pendingDest.id, userAsbAPM);
const bAfterSecond = getBatchById('BATCH-APM-001');

assert(secondAttempt.status === STOCK_MUTATION_STATUS.ALREADY_APPLIED, 'Test 13: Second mutation attempt returns ALREADY_APPLIED');
assert(bAfterSecond.availableQty === bAfter.availableQty, `Test 12: Duplicate deduction strictly prevented; stock remains ${bAfterSecond.availableQty}`);
assert(bAfterSecond.currentQty === bAfter.currentQty, 'Test 12b: currentQty remains unchanged on duplicate call');

// --- 5. BATCH LIFECYCLE: STATUS EMPTY AT ZERO STOCK ---
console.log('\n--- 5. BATCH LIFECYCLE: STATUS EMPTY AT ZERO STOCK ---');
const batchesStore = storage.get('nursery_batches', []);
batchesStore.push({
  id: 'BATCH-DEP-002',
  batchCode: 'B-DEP-02',
  batchNo: 'B-DEP-02',
  programId: 'PRG-2026-003',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  availableQty: 150,
  currentQty: 150,
  status: 'AVAILABLE'
});
storage.set('nursery_batches', batchesStore);

const depletionDest = createDestructionRecord({
  batchId: 'BATCH-DEP-002',
  batchCode: 'B-DEP-02',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  programId: 'PRG-2026-003',
  quantity: 150,
  reason: 'Pemusnahan total karena busuk akar',
  description: 'Musnahkan 150 Pkk'
}, userMantriAPM);

approveDestructionRecord(depletionDest.id, 'Disetujui pemusnahan total', userAsbAPM);
mutateStockFromDestruction(depletionDest.id, userAsbAPM);

const bDepleted = getBatchById('BATCH-DEP-002');
assert(bDepleted.availableQty === 0, `Test 9a: availableQty reduced exactly to 0 (${bDepleted.availableQty})`);
assert(bDepleted.currentQty === 0, 'Test 9b: currentQty reduced exactly to 0');
assert(bDepleted.status === 'EMPTY', `Test 9c: Batch status transitions to EMPTY when availableQty === 0 (actual: ${bDepleted.status})`);

// --- 6. INSUFFICIENT STOCK & ATOMICITY TESTS ---
console.log('\n--- 6. INSUFFICIENT STOCK & ATOMICITY ---');
const batchesStore2 = storage.get('nursery_batches', []);
batchesStore2.push({
  id: 'BATCH-OVERDRAW-003',
  batchCode: 'B-OVD-03',
  batchNo: 'B-OVD-03',
  programId: 'PRG-2026-003',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  availableQty: 100,
  currentQty: 100,
  status: 'AVAILABLE'
});
storage.set('nursery_batches', batchesStore2);

const overdrawDest = createDestructionRecord({
  batchId: 'BATCH-OVERDRAW-003',
  batchCode: 'B-OVD-03',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  programId: 'PRG-2026-003',
  quantity: 100,
  reason: 'Bibit mati'
}, userMantriAPM);

approveDestructionRecord(overdrawDest.id, 'Disetujui', userAsbAPM);

// Simulate stock being reduced by another operation before this mutation executes
const batchesUpdated = storage.get('nursery_batches', []);
const ovdIdx = batchesUpdated.findIndex(b => b.id === 'BATCH-OVERDRAW-003');
batchesUpdated[ovdIdx].availableQty = 30; // only 30 available now, but destruction requests 100
batchesUpdated[ovdIdx].currentQty = 30;
storage.set('nursery_batches', batchesUpdated);

let overdrawThrown = false;
try {
  mutateStockFromDestruction(overdrawDest.id, userAsbAPM);
} catch (e) {
  overdrawThrown = true;
  assert(e.message.includes('tidak mencukupi'), `Test 10a: Overdraw correctly rejected with message: ${e.message}`);
}
assert(overdrawThrown, 'Test 10b: Insufficient stock throws error');

const bAfterOverdraw = getBatchById('BATCH-OVERDRAW-003');
assert(bAfterOverdraw.availableQty === 30, `Test 11: Negative stock impossible; availableQty remains intact (${bAfterOverdraw.availableQty})`);
assert(bAfterOverdraw.currentQty === 30, `Test 11b: currentQty remains 30 without becoming negative (${bAfterOverdraw.currentQty})`);

const updatedOverdrawDest = storage.get(DESTRUCTION_STORAGE_KEY, []).find(r => r.id === overdrawDest.id);
assert(updatedOverdrawDest.stockMutationStatus === 'FAILED', 'Test 21: Destruction marked with stockMutationStatus FAILED on error');

// --- 7. SCOPE ISOLATION & MISMATCH INTEGRITY TESTS ---
console.log('\n--- 7. SCOPE ISOLATION & MISMATCH INTEGRITY ---');
// Scope mismatch
let scopeThrown = false;
try {
  mutateStockFromDestruction(pendingDest.id, userAsbTBS); // TBS trying to mutate APM record
} catch (e) {
  scopeThrown = true;
  assert(e.message.includes('Akses ditolak') || e.message.includes('lingkup'), `Test 20a: Cross-estate mutation rejected: ${e.message}`);
}
assert(scopeThrown, 'Test 20b: Scope isolation strictly enforced');

// Estate Mismatch against Batch
const mismatchEstateDest = createDestructionRecord({
  batchId: 'BATCH-APM-001',
  batchCode: 'B-001',
  estateId: 'EST-TBS', // Mismatch vs BATCH-APM-001 (EST-APM)
  divisionId: 'DIV-TBS-01',
  programId: 'PRG-2026-003',
  quantity: 25,
  reason: 'Bibit patah'
}, userMantriTBS);

approveDestructionRecord(mismatchEstateDest.id, 'Disetujui', userAsbTBS);

let estateThrown = false;
try {
  mutateStockFromDestruction(mismatchEstateDest.id, userAsbTBS);
} catch (e) {
  estateThrown = true;
  assert(e.message.includes('Inkonsistensi estate'), `Test 17: Estate mismatch throws error: ${e.message}`);
}
assert(estateThrown, 'Test 17b: Estate mismatch strictly rejected');

// --- 8. TRACEABILITY & METADATA TESTS ---
console.log('\n--- 8. TRACEABILITY & METADATA TESTS ---');
const allDests = storage.get(DESTRUCTION_STORAGE_KEY, []);
const appliedDests = allDests.filter(d => d.stockMutationStatus === 'APPLIED');
assert(appliedDests.length >= 2, `Test 15a: Found applied destruction records (count: ${appliedDests.length})`);
assert(appliedDests.every(d => Boolean(d.batchId) && Boolean(d.batchCode)), 'Test 15b: All applied destructions retain batchId & batchCode links');

// --- 9. CLEAN ALL DATA COMPATIBILITY TESTS ---
console.log('\n--- 9. CLEAN ALL DATA COMPATIBILITY ---');
cleanAllTransactionalData();

const postCleanDests = storage.get(DESTRUCTION_STORAGE_KEY, []);
assert(postCleanDests.length === 0, `Test 23a: Post Clean All destruction transactions count is 0 (actual: ${postCleanDests.length})`);

const postCleanBatches = getAllBatches();
assert(postCleanBatches.length > 0, `Test 23b: Master batches preserved after Clean All (count: ${postCleanBatches.length})`);
const defaultApm = postCleanBatches.find(b => b.id === 'BATCH-APM-001');
assert(defaultApm.availableQty === 5000, `Test 23c: Baseline availableQty restored to default 5000 (actual: ${defaultApm.availableQty})`);

console.log('\n================================================================================');
console.log(`TOTAL ASSERTIONS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('================================================================================\n');

if (failed > 0) {
  process.exit(1);
}
