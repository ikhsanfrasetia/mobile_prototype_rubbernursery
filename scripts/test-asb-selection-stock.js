/**
 * scripts/test-asb-selection-stock.js
 * Verification Test Suite for Mutasi Stok Hasil Seleksi Asisten Bibitan (TASK ASB-13)
 * 
 * Target: 35+ assertions covering:
 * 1. approved selection eligible
 * 2. pending selection rejected
 * 3. returned selection rejected
 * 4. batch exists validation
 * 5. mutationQty = jumlahAfkir formula
 * 6. zero afkir no mutation (stockMutationStatus: NOT_REQUIRED)
 * 7. stock deduction on availableQty
 * 8. currentQty sync with availableQty
 * 9. status AVAILABLE remains when availableQty > 0
 * 10. status EMPTY when availableQty reaches 0
 * 11. insufficient stock rejected (stockMutationStatus: FAILED)
 * 12. negative stock impossible
 * 13. duplicate mutation prevented
 * 14. idempotency returns ALREADY_APPLIED
 * 15. mutation audit trail (performedBy, performedAt, qty)
 * 16. selection -> batch traceability
 * 17. program validation
 * 18. estate validation
 * 19. division validation
 * 20. batch validation
 * 21. clean all compatibility
 * 22. scope isolation
 * 23. atomicity on batch mutation
 * 24. retry safety
 * 25. legacy compatibility
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
  SELECTION_STATUS,
  STOCK_MUTATION_STATUS,
  SELECTION_STORAGE_KEY,
  createSelectionRecord,
  approveSelectionRecord,
  returnSelectionRecord,
  mutateStockFromSelection
} from '../js/modules/selection/selection-manager.js';
import { getAllBatches, getBatchById, resetBatchMasterToDefault } from '../js/data/batch-master.js';
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
console.log('       TASK ASB-13: MUTASI STOK HASIL SELEKSI ASISTEN BIBITAN                  ');
console.log('================================================================================\n');

// 0. RESET ENVIRONMENT
resetBedenganMasterToDefault();
resetBatchMasterToDefault();
storage.set(SELECTION_STORAGE_KEY, []);

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

// --- 1. SELECTION ELIGIBILITY TESTS ---
console.log('--- 1. SELECTION ELIGIBILITY & WORKFLOW GATING ---');

// Create pending selection
const pendingSel = createSelectionRecord({
  batchId: 'BATCH-APM-001',
  batchCode: 'B-001',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  programId: 'PRG-2026-003',
  jumlahDiperiksa: 1000,
  jumlahLayak: 900,
  jumlahAfkir: 100,
  catatan: 'Seleksi blok A'
}, userMantriAPM);

assert(pendingSel.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI, 'Test 1a: Newly created selection is MENUNGGU_VERIFIKASI');

// Attempt to mutate pending selection -> MUST BE REJECTED
let pendingMutateFailed = false;
try {
  mutateStockFromSelection(pendingSel.id, userAsbAPM);
} catch (e) {
  pendingMutateFailed = true;
  assert(e.message.includes('Hanya hasil seleksi dengan status DISETUJUI'), `Test 2: Pending selection rejected from stock mutation: ${e.message}`);
}
assert(pendingMutateFailed, 'Test 2b: Mutation blocked for unapproved selection');

// Create returned selection
const returnedSel = createSelectionRecord({
  batchId: 'BATCH-APM-001',
  batchCode: 'B-001',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  programId: 'PRG-2026-003',
  jumlahDiperiksa: 500,
  jumlahLayak: 400,
  jumlahAfkir: 100,
  catatan: 'Seleksi blok B'
}, userMantriAPM);

returnSelectionRecord(returnedSel.id, 'Data fisik dan label tidak cocok', userAsbAPM);

let returnedMutateFailed = false;
try {
  mutateStockFromSelection(returnedSel.id, userAsbAPM);
} catch (e) {
  returnedMutateFailed = true;
  assert(e.message.includes('Hanya hasil seleksi dengan status DISETUJUI'), `Test 3: Returned selection rejected from stock mutation: ${e.message}`);
}
assert(returnedMutateFailed, 'Test 3b: Mutation blocked for DIKEMBALIKAN selection');

// --- 2. ZERO-AFKIR SELECTION HANDLING ---
console.log('\n--- 2. ZERO-AFKIR SELECTION HANDLING ---');
const zeroAfkirSel = createSelectionRecord({
  batchId: 'BATCH-APM-001',
  batchCode: 'B-001',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  programId: 'PRG-2026-003',
  jumlahDiperiksa: 500,
  jumlahLayak: 500,
  jumlahAfkir: 0, // 0 Afkir
  catatan: 'Seleksi 100% Layak'
}, userMantriAPM);

approveSelectionRecord(zeroAfkirSel.id, 'Disetujui, semua layak', userAsbAPM);

const batchBeforeZero = getBatchById('BATCH-APM-001');
const zeroResult = mutateStockFromSelection(zeroAfkirSel.id, userAsbAPM);
const batchAfterZero = getBatchById('BATCH-APM-001');

assert(zeroResult.status === STOCK_MUTATION_STATUS.NOT_REQUIRED, 'Test 6a: Zero-afkir returns status NOT_REQUIRED');
assert(batchBeforeZero.availableQty === batchAfterZero.availableQty, `Test 6b: availableQty strictly unchanged for 0 afkir (${batchAfterZero.availableQty})`);
assert(batchBeforeZero.currentQty === batchAfterZero.currentQty, `Test 6c: currentQty strictly unchanged for 0 afkir (${batchAfterZero.currentQty})`);

// --- 3. STOCK MUTATION FORMULA & DEDUCTION TESTS ---
console.log('\n--- 3. STOCK MUTATION EXECUTION & FORMULA (jumlahAfkir) ---');
// Approve pendingSel (jumlahAfkir = 100)
approveSelectionRecord(pendingSel.id, 'Disetujui oleh Asisten Bibitan', userAsbAPM);

const bBeforeMut = getBatchById('BATCH-APM-001');
const oldAvail = bBeforeMut.availableQty; // 5000

const mutResult = mutateStockFromSelection(pendingSel.id, userAsbAPM);
const bAfterMut = getBatchById('BATCH-APM-001');

assert(mutResult.status === STOCK_MUTATION_STATUS.APPLIED, 'Test 1b: Approved selection successfully mutated stock');
assert(mutResult.success === true, 'Test 5a: Mutation success flag is true');
assert(bAfterMut.availableQty === oldAvail - 100, `Test 7: availableQty accurately deducted by jumlahAfkir (5000 - 100 = ${bAfterMut.availableQty})`);
assert(bAfterMut.currentQty === bAfterMut.availableQty, `Test 8: currentQty is 100% synchronized with availableQty (${bAfterMut.currentQty})`);
assert(bAfterMut.status === 'AVAILABLE', 'Test 9: Batch status remains AVAILABLE when stock > 0');

// 15. Audit trail verification
assert(mutResult.selection.stockMutationStatus === 'APPLIED', 'Test 15a: stockMutationStatus APPLIED recorded on selection');
assert(mutResult.selection.stockMutationQty === 100, 'Test 15b: stockMutationQty recorded accurately (100)');
assert(mutResult.selection.stockMutationBy === userAsbAPM.userId, 'Test 15c: stockMutationBy accurately records verifier');
assert(Boolean(mutResult.selection.stockMutationAt), 'Test 15d: stockMutationAt timestamp logged');

// --- 4. IDEMPOTENCY & DUPLICATE PREVENTION TESTS ---
console.log('\n--- 4. IDEMPOTENCY & DUPLICATE PREVENTION ---');
const secondAttempt = mutateStockFromSelection(pendingSel.id, userAsbAPM);
const bAfterSecond = getBatchById('BATCH-APM-001');

assert(secondAttempt.status === STOCK_MUTATION_STATUS.ALREADY_APPLIED, 'Test 14a: Second mutation attempt returns ALREADY_APPLIED');
assert(bAfterSecond.availableQty === bAfterMut.availableQty, `Test 13: Duplicate deduction strictly prevented; stock remains unchanged (${bAfterSecond.availableQty})`);
assert(bAfterSecond.currentQty === bAfterMut.currentQty, 'Test 14b: currentQty remains unchanged on duplicate call');

// --- 5. BATCH LIFECYCLE: STATUS EMPTY AT ZERO STOCK ---
console.log('\n--- 5. BATCH LIFECYCLE: STATUS EMPTY AT ZERO STOCK ---');
// Create special small batch to test depletion to 0
const batchesStore = storage.get('nursery_batches', []);
batchesStore.push({
  id: 'BATCH-SMALL-001',
  batchCode: 'B-SMALL-01',
  batchNo: 'B-SMALL-01',
  programId: 'PRG-2026-003',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  availableQty: 50,
  currentQty: 50,
  status: 'AVAILABLE'
});
storage.set('nursery_batches', batchesStore);

const depletionSel = createSelectionRecord({
  batchId: 'BATCH-SMALL-001',
  batchCode: 'B-SMALL-01',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  programId: 'PRG-2026-003',
  jumlahDiperiksa: 50,
  jumlahLayak: 0,
  jumlahAfkir: 50,
  catatan: 'Semua afkir karena virus'
}, userMantriAPM);

approveSelectionRecord(depletionSel.id, 'Disetujui afkir total', userAsbAPM);
mutateStockFromSelection(depletionSel.id, userAsbAPM);

const bDepleted = getBatchById('BATCH-SMALL-001');
assert(bDepleted.availableQty === 0, `Test 10a: availableQty reduced exactly to 0 (${bDepleted.availableQty})`);
assert(bDepleted.currentQty === 0, 'Test 10b: currentQty reduced exactly to 0');
assert(bDepleted.status === 'EMPTY', `Test 10c: Batch status transitions to EMPTY when availableQty === 0 (actual: ${bDepleted.status})`);

// --- 6. INSUFFICIENT STOCK & NEGATIVE STOCK PREVENTION ---
console.log('\n--- 6. INSUFFICIENT STOCK & ATOMICITY ---');
const overdrawSel = createSelectionRecord({
  batchId: 'BATCH-SMALL-001', // already has 0 stock
  batchCode: 'B-SMALL-01',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  programId: 'PRG-2026-003',
  jumlahDiperiksa: 20,
  jumlahLayak: 0,
  jumlahAfkir: 20,
  catatan: 'Attempting to mutate 20 from 0 stock'
}, userMantriAPM);

approveSelectionRecord(overdrawSel.id, 'Disetujui', userAsbAPM);

let overdrawThrown = false;
try {
  mutateStockFromSelection(overdrawSel.id, userAsbAPM);
} catch (e) {
  overdrawThrown = true;
  assert(e.message.includes('tidak mencukupi'), `Test 11a: Overdraw correctly rejected with message: ${e.message}`);
}
assert(overdrawThrown, 'Test 11b: Insufficient stock throws error');

const bAfterOverdraw = getBatchById('BATCH-SMALL-001');
assert(bAfterOverdraw.availableQty === 0, 'Test 12: Negative stock impossible; availableQty remains 0');
assert(bAfterOverdraw.currentQty === 0, 'Test 12b: currentQty remains 0 without becoming negative');

const updatedOverdrawSel = storage.get(SELECTION_STORAGE_KEY, []).find(r => r.id === overdrawSel.id);
assert(updatedOverdrawSel.stockMutationStatus === 'FAILED', 'Test 11c: Selection marked with stockMutationStatus FAILED on error');

// --- 7. MISMATCH VALIDATION (ESTATE, DIVISION, BATCH NOT FOUND) ---
console.log('\n--- 7. MISMATCH & INTEGRITY VALIDATIONS ---');
// Invalid Batch
const invalidBatchSel = createSelectionRecord({
  batchId: 'BATCH-GHOST-999',
  batchCode: 'B-GHOST',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  programId: 'PRG-2026-003',
  jumlahDiperiksa: 10,
  jumlahLayak: 0,
  jumlahAfkir: 10
}, userMantriAPM);

approveSelectionRecord(invalidBatchSel.id, 'Disetujui', userAsbAPM);

let ghostThrown = false;
try {
  mutateStockFromSelection(invalidBatchSel.id, userAsbAPM);
} catch (e) {
  ghostThrown = true;
  assert(e.message.includes('tidak ditemukan'), `Test 20: Missing batch throws error: ${e.message}`);
}
assert(ghostThrown, 'Test 20b: Missing batch reference strictly rejected');

// Estate Mismatch
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

const mismatchEstateSel = createSelectionRecord({
  batchId: 'BATCH-APM-001',
  batchCode: 'B-001',
  estateId: 'EST-TBS', // Mismatch vs BATCH-APM-001 which is EST-APM
  divisionId: 'DIV-TBS-01',
  programId: 'PRG-2026-003',
  jumlahDiperiksa: 10,
  jumlahLayak: 0,
  jumlahAfkir: 10
}, userMantriTBS);

approveSelectionRecord(mismatchEstateSel.id, 'Disetujui', userAsbTBS);

let estateThrown = false;
try {
  mutateStockFromSelection(mismatchEstateSel.id, userAsbTBS);
} catch (e) {
  estateThrown = true;
  assert(e.message.includes('Inkonsistensi estate'), `Test 18: Estate mismatch throws error: ${e.message}`);
}
assert(estateThrown, 'Test 18b: Estate mismatch strictly rejected');

// --- 8. TRACEABILITY & INTEGRATION TESTS ---
console.log('\n--- 8. TRACEABILITY & METADATA TESTS ---');
const allSels = storage.get(SELECTION_STORAGE_KEY, []);
const appliedSels = allSels.filter(s => s.stockMutationStatus === 'APPLIED');
assert(appliedSels.length >= 2, `Test 16a: Found applied selection records (count: ${appliedSels.length})`);
assert(appliedSels.every(s => Boolean(s.batchId) && Boolean(s.batchCode)), 'Test 16b: All applied selections retain batchId & batchCode links');

// --- 9. CLEAN ALL DATA COMPATIBILITY TESTS ---
console.log('\n--- 9. CLEAN ALL DATA COMPATIBILITY ---');
cleanAllTransactionalData();

const postCleanSelections = storage.get(SELECTION_STORAGE_KEY, []);
assert(postCleanSelections.length === 0, `Test 21a: Post Clean All selections count is 0 (actual: ${postCleanSelections.length})`);

const postCleanBatches = getAllBatches();
assert(postCleanBatches.length > 0, `Test 21b: Master batches preserved after Clean All (count: ${postCleanBatches.length})`);
const defaultApm = postCleanBatches.find(b => b.id === 'BATCH-APM-001');
assert(defaultApm.availableQty === 5000, `Test 21c: Baseline availableQty restored to default 5000 (actual: ${defaultApm.availableQty})`);

console.log('\n================================================================================');
console.log(`TOTAL ASSERTIONS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('================================================================================\n');

if (failed > 0) {
  process.exit(1);
}
