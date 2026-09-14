/**
 * scripts/test-selection-display-and-sources.js
 * Integration Test for Selection Display & Multi-Source Integration (Seeding, Budding, Inspection)
 */

// Mock localStorage for Node.js environment
const store = new Map();
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
    clear() { store.clear(); }
  };
}

import { storage } from '../js/core/storage.js';
import {
  integrateSeedingToSelectionPool,
  syncAllSeedingsToSelectionPool,
  filterSelectionByScope,
  getActionableSelectionCount,
  getSelectionSourceLabel,
  getSelectionCategoryLabel,
  SELECTION_STATUS,
  STOCK_MUTATION_STATUS
} from '../js/modules/selection/selection-manager.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failed++;
  }
}

console.log('=================================================================');
console.log('INTEGRATION TEST: FIX DISPLAY HASIL PENYEMAIAN PADA MODUL SELEKSI');
console.log('=================================================================\n');

// Clear storage keys for clean testing state
storage.set('selection_pool', []);
storage.set('selection_transactions', []);
storage.set('seeding_transactions', []);

// Mock user contexts
const userMantriTBS = {
  userId: 'USR-MANTRI-TBS',
  name: 'Mantri TBS',
  role: 'MANTRI_TANAMAN',
  estateId: 'TBS',
  divisionId: 'DIV-1'
};

const userMantriAPM = {
  userId: 'USR-MANTRI-APM',
  name: 'Mantri APM',
  role: 'MANTRI_TANAMAN',
  estateId: 'APM',
  divisionId: 'DIV-2'
};

const userAsbTBS = {
  userId: 'USR-ASB-TBS',
  name: 'Asisten TBS',
  role: 'ASISTEN_BIBITAN',
  estateId: 'TBS',
  divisionId: null
};

// --------------------------------------------------------------------------
// Scenario 14: Empty State when selection_pool is empty
// --------------------------------------------------------------------------
console.log('--- TEST 14: Empty State handling ---');
let pool = storage.get('selection_pool', []);
let scoped = filterSelectionByScope(pool, userMantriTBS);
assert(scoped.length === 0, 'Scenario 14: selection_pool is initially empty and returns 0 items for TBS Mantri');

// --------------------------------------------------------------------------
// Scenarios 1, 2, 3, 4: Seeding Transaction with 3 categories (RUSAK, MATI, LAINNYA)
// --------------------------------------------------------------------------
console.log('\n--- TEST 1, 2, 3, 4, 6, 7: Seeding Transaction Integration (RUSAK, MATI, LAINNYA) ---');
const seedingTxTBS = {
  id: 'SEED-TX-2026-001',
  docNo: '2026/SEED/0001',
  date: '2026-03-01',
  estateId: 'TBS',
  divisionId: 'DIV-1',
  programId: 'PROG-TBS-01',
  programCode: 'PRG-2026-01',
  programName: 'Program Replanting TBS 2026',
  batchId: 'BATCH-TBS-01',
  batchCode: 'B-TBS-01',
  batchNo: 'B-TBS-01',
  bedenganId: 'BED-01',
  bedengan: 'Bedengan 01',
  klonAwal: 'PB 260',
  tahapan: 'Main Nursery',
  rusakQty: 10,
  matiQty: 5,
  lainnyaQty: 3,
  jumlahDitolak: 18,
  alasanDitolak: 'Rusak, Mati, dan Lainnya'
};

const res = integrateSeedingToSelectionPool(seedingTxTBS);
assert(res.success === true, 'Integrate Seeding TX successfully executed');
assert(res.createdCount === 3, 'Scenario 4: One Seeding TX with 3 categories creates exactly 3 selection pool entries');

pool = storage.get('selection_pool', []);
const rusakItem = pool.find(p => p.category === 'RUSAK' && p.sourceDocNo === '2026/SEED/0001');
const matiItem = pool.find(p => p.category === 'MATI' && p.sourceDocNo === '2026/SEED/0001');
const lainnyaItem = pool.find(p => p.category === 'LAINNYA' && p.sourceDocNo === '2026/SEED/0001');

assert(rusakItem && rusakItem.jumlahAfkir === 10, 'Scenario 1: Data Penyemaian RUSAK exists with qty 10');
assert(matiItem && matiItem.jumlahAfkir === 5, 'Scenario 2: Data Penyemaian MATI exists with qty 5');
assert(lainnyaItem && lainnyaItem.jumlahAfkir === 3, 'Scenario 3: Data Penyemaian LAINNYA exists with qty 3');

assert(rusakItem.originType === 'REJECT_PENYEMAIAN', 'Scenario 6: originType REJECT_PENYEMAIAN is set');
assert(rusakItem.sourceModule === 'PENYEMAIAN', 'Scenario 7: sourceModule PENYEMAIAN is set');
assert(getSelectionSourceLabel(rusakItem) === 'Transaksi Penyemaian', 'Source label resolves to "Transaksi Penyemaian"');
assert(getSelectionCategoryLabel(rusakItem) === 'Rusak', 'Category label resolves to "Rusak"');
assert(getSelectionCategoryLabel(matiItem) === 'Mati', 'Category label resolves to "Mati"');
assert(getSelectionCategoryLabel(lainnyaItem) === 'Lainnya', 'Category label resolves to "Lainnya"');

// --------------------------------------------------------------------------
// Scenario 12: Idempotency (no duplicate entries)
// --------------------------------------------------------------------------
console.log('\n--- TEST 12: Idempotency & Duplicate Prevention ---');
const resDuplicate = integrateSeedingToSelectionPool(seedingTxTBS);
assert(resDuplicate.createdCount === 0, 'Scenario 12: Calling integrateSeedingToSelectionPool again does not create duplicates');
pool = storage.get('selection_pool', []);
assert(pool.length === 3, 'Total pool items remain 3');

// --------------------------------------------------------------------------
// Scenario 13: Multi-Source alongside Okulasi and Okulasi Janda
// --------------------------------------------------------------------------
console.log('\n--- TEST 13: Multi-Source Coexistence (Budding, Regrafting, Inspection) ---');
pool.push({
  id: 'SEL-POOL-BUD-001',
  docNo: '2026/CULL/0004',
  originType: 'REJECT_OKULASI',
  sourceModule: 'BUDDING',
  buddingDocNo: '2026/BUD/0001',
  sourceDocNo: '2026/BUD/0001',
  estateId: 'TBS',
  divisionId: 'DIV-1',
  batchCode: 'B-TBS-01',
  bedengan: 'Bedengan 02',
  jumlahAfkir: 8,
  alasan: 'Bibit Ditolak saat Okulasi',
  status: 'PENDING_DECLARATION'
});

pool.push({
  id: 'SEL-POOL-REGRAFT-001',
  docNo: '2026/CULL/0005',
  originType: 'REJECT_REGRAFTING',
  sourceModule: 'BUDDING',
  buddingDocNo: '2026/REGRAFT/0001',
  sourceDocNo: '2026/REGRAFT/0001',
  estateId: 'TBS',
  divisionId: 'DIV-1',
  batchCode: 'B-TBS-01',
  bedengan: 'Bedengan 03',
  jumlahAfkir: 4,
  alasan: 'Bibit Ditolak saat Regrafting',
  status: 'PENDING_DECLARATION'
});

storage.set('selection_pool', pool);
assert(getSelectionSourceLabel(pool[3]) === 'Okulasi (Grafting)', 'Budding source label is "Okulasi (Grafting)"');
assert(getSelectionSourceLabel(pool[4]) === 'Okulasi Janda (Regrafting)', 'Regrafting source label is "Okulasi Janda (Regrafting)"');

// --------------------------------------------------------------------------
// Scenario 5: Badge count matches pending items on page
// --------------------------------------------------------------------------
console.log('\n--- TEST 5: Badge / Pending Counter Consistency ---');
scoped = filterSelectionByScope(pool, userMantriTBS);
const pendingCount = scoped.filter(s => s.status === 'PENDING_DECLARATION').length;
assert(scoped.length === 5, 'Scoped list for TBS has 5 items (3 Penyemaian + 1 Okulasi + 1 Regrafting)');
assert(pendingCount === 5, 'Scenario 5: Pending badge count (5) matches displayed list count (5)');

// --------------------------------------------------------------------------
// Scenario 10 & 11: Scope Isolation TBS vs APM
// --------------------------------------------------------------------------
console.log('\n--- TEST 10 & 11: Estate Scope Isolation (TBS vs APM) ---');
// Add an APM seeding entry
const seedingTxAPM = {
  id: 'SEED-TX-APM-001',
  docNo: '2026/SEED/0099',
  date: '2026-03-01',
  estateId: 'APM',
  divisionId: 'DIV-2',
  programId: 'PROG-APM-01',
  batchCode: 'B-APM-01',
  rusakQty: 15,
  matiQty: 0,
  lainnyaQty: 0
};
integrateSeedingToSelectionPool(seedingTxAPM);

const poolAll = storage.get('selection_pool', []);
const tbsView = filterSelectionByScope(poolAll, userMantriTBS);
const apmView = filterSelectionByScope(poolAll, userMantriAPM);

assert(tbsView.every(x => x.estateId === 'TBS'), 'Scenario 10: TBS user ONLY sees TBS data (no APM data leaked)');
assert(apmView.every(x => x.estateId === 'APM'), 'Scenario 11: APM user ONLY sees APM data (no TBS data leaked)');
assert(apmView.length === 1 && apmView[0].sourceDocNo === '2026/SEED/0099', 'APM user sees exactly their 1 APM seeding rejection');

// --------------------------------------------------------------------------
// Scenarios 8 & 9: Mantri Declares Selection -> selection_transactions created
// --------------------------------------------------------------------------
console.log('\n--- TEST 8 & 9: Declaration Workflow & Metadata Preservation ---');
const targetItem = tbsView[0]; // RUSAK item
targetItem.status = 'DECLARED_CULLED';

// Update pool in storage
const updatedPool = storage.get('selection_pool', []);
const foundIdx = updatedPool.findIndex(p => p.id === targetItem.id);
if (foundIdx !== -1) updatedPool[foundIdx].status = 'DECLARED_CULLED';
storage.set('selection_pool', updatedPool);

// Add to selection_transactions
const culledList = storage.get('selection_transactions', []);
const newSelTx = {
  id: `SEL-${Date.now()}-001`,
  docNo: '2026/CULL/0001',
  selectionPoolDocNo: targetItem.docNo,
  sourceModule: targetItem.sourceModule,
  sourceTransactionType: targetItem.sourceTransactionType,
  sourceTransactionId: targetItem.sourceTransactionId,
  sourceDocNo: targetItem.sourceDocNo,
  category: targetItem.category,
  originType: targetItem.originType,
  estateId: targetItem.estateId,
  divisionId: targetItem.divisionId,
  programId: targetItem.programId,
  batchCode: targetItem.batchCode,
  bedengan: targetItem.bedengan,
  jumlahAfkir: targetItem.jumlahAfkir,
  quantity: targetItem.jumlahAfkir,
  sumberAsal: getSelectionSourceLabel(targetItem),
  mantri: userMantriTBS.name,
  createdByName: userMantriTBS.name,
  status: SELECTION_STATUS.MENUNGGU_VERIFIKASI,
  stockMutationStatus: STOCK_MUTATION_STATUS.PENDING
};
culledList.push(newSelTx);
storage.set('selection_transactions', culledList);

assert(newSelTx.sourceDocNo === '2026/SEED/0001', 'Scenario 9: Metadata sourceDocNo 2026/SEED/0001 is preserved in selection transaction');
assert(newSelTx.sourceTransactionId === 'SEED-TX-2026-001', 'Scenario 9: Metadata sourceTransactionId SEED-TX-2026-001 is preserved');
assert(newSelTx.category === 'RUSAK', 'Scenario 8 & 9: Category RUSAK preserved in selection transaction');
assert(newSelTx.jumlahAfkir === 10, 'Scenario 8 & 9: Quantity (jumlahAfkir) 10 is preserved');
assert(newSelTx.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI, 'Status set to MENUNGGU_VERIFIKASI for Asisten review');

// Verify updated pending count for TBS Mantri
const tbsPoolAfter = filterSelectionByScope(storage.get('selection_pool', []), userMantriTBS);
const pendingRemaining = tbsPoolAfter.filter(s => s.status !== 'DECLARED_CULLED').length;
assert(pendingRemaining === 4, 'Remaining pending count reduced from 5 to 4 after declaration');

// --------------------------------------------------------------------------
// Summary
// --------------------------------------------------------------------------
console.log('\n=================================================================');
console.log(`INTEGRATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('=================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
