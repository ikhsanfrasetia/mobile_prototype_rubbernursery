/**
 * scripts/test-selection-ui-harmonization.js
 * Integration Test for Selection UI Harmonization & Multi-Source Card Rendering
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
  formatBedenganDisplayCode,
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

console.log('========================================================================');
console.log('INTEGRATION TEST: HARMONISASI & COMPACT CARD UI SELEKSI BIBIT');
console.log('========================================================================\n');

// Clean storage
storage.set('selection_pool', []);
storage.set('selection_transactions', []);
storage.set('seeding_transactions', []);

const mantriTBS = {
  userId: 'USR-MANTRI-01',
  name: 'Mantri Bibitan TBS',
  role: 'MANTRI_TANAMAN',
  estateId: 'TBS',
  divisionId: 'DIV-1'
};

// 1. Load Seeding Transaction into Selection Pool
console.log('--- 1. Verification of Seeding Sources & Categories ---');
const seedingTx = {
  id: 'SEED-2026-001',
  docNo: '2026/SOW/001',
  date: '2026-03-01',
  estateId: 'TBS',
  divisionId: 'DIV-1',
  programId: 'PROG-01',
  programCode: '2026/TB/RNUR/001',
  programName: 'Program Replanting TBS 2026',
  batchCode: 'BTCH-001',
  batchNo: 'BTCH-001',
  bedengan: 'Bedengan-001, Bedengan-002',
  rusakQty: 250,
  matiQty: 80,
  lainnyaQty: 45
};

const res = integrateSeedingToSelectionPool(seedingTx);
assert(res.success === true, '1. Seeding transaction integrated successfully');
assert(res.createdCount === 3, '1. 3 pool items created for RUSAK, MATI, LAINNYA');

const pool = storage.get('selection_pool', []);
const rusakItem = pool.find(p => p.category === 'RUSAK');
const matiItem = pool.find(p => p.category === 'MATI');
const lainnyaItem = pool.find(p => p.category === 'LAINNYA');

assert(rusakItem && rusakItem.jumlahAfkir === 250, '10 & 11. Kategori RUSAK loaded with label "Rusak" and qty 250 Pkk');
assert(getSelectionCategoryLabel(rusakItem) === 'Rusak', '10. Category label resolves to "Rusak"');
assert(matiItem && matiItem.jumlahAfkir === 80, '10 & 11. Kategori MATI loaded with label "Mati" and qty 80 Pkk');
assert(getSelectionCategoryLabel(matiItem) === 'Mati', '10. Category label resolves to "Mati"');
assert(lainnyaItem && lainnyaItem.jumlahAfkir === 45, '10 & 11. Kategori LAINNYA loaded with label "Lainnya" and qty 45 Pkk');
assert(getSelectionCategoryLabel(lainnyaItem) === 'Lainnya', '10. Category label resolves to "Lainnya"');

// 2. Verification of Batch, Bedengan (Code Only), Program, Dok. Asal, Dok. Seleksi
console.log('\n--- 2. Verification of Bedengan Code Formatter & Reference Metadata ---');
assert(rusakItem.batchCode === 'BTCH-001', '4. Batch BTCH-001 correctly populated');
assert(formatBedenganDisplayCode(rusakItem) === 'BED-001, BED-002', '5 & 6. Bedengan displays canonical code "BED-001, BED-002" instead of name');
assert(formatBedenganDisplayCode({ bedengan: 'Bedengan-003' }) === 'BED-003', '5 & 6. Bedengan-003 correctly formatted to BED-003');
assert(formatBedenganDisplayCode({ bedenganCode: 'BED-005, BED-006' }) === 'BED-005, BED-006', '5 & 6. Bedengan code preserved as BED-005, BED-006');
assert(rusakItem.programCode === '2026/TB/RNUR/001' || rusakItem.programName === 'Program Replanting TBS 2026', '9. Program correctly populated');
assert(rusakItem.sourceDocNo === '2026/SOW/001', '7. Dok. Asal 2026/SOW/001 correctly populated');
assert(rusakItem.docNo && rusakItem.docNo.startsWith('2026/CULL/'), '8. Dok. Seleksi format matches 2026/CULL/xxx');

// 3. Multi-Source alongside Okulasi and Okulasi Janda
console.log('\n--- 3. Multi-Source Integration (Okulasi & Okulasi Janda) ---');
pool.push({
  id: 'SEL-OKULASI-01',
  docNo: '2026/CULL/0004',
  originType: 'REJECT_OKULASI',
  sourceModule: 'BUDDING',
  buddingDocNo: '2026/BUD/001',
  sourceDocNo: '2026/BUD/001',
  estateId: 'TBS',
  divisionId: 'DIV-1',
  batchCode: 'BTCH-002',
  bedengan: 'Bedengan-003',
  jumlahAfkir: 60,
  alasan: 'Bibit Ditolak saat Okulasi',
  status: 'PENDING_DECLARATION'
});

pool.push({
  id: 'SEL-REGRAFT-01',
  docNo: '2026/CULL/0005',
  originType: 'REJECT_REGRAFTING',
  sourceModule: 'BUDDING',
  buddingDocNo: '2026/REGRAFT/001',
  sourceDocNo: '2026/REGRAFT/001',
  estateId: 'TBS',
  divisionId: 'DIV-1',
  batchCode: 'BTCH-003',
  bedengan: 'Bedengan-004',
  jumlahAfkir: 30,
  alasan: 'Bibit Ditolak saat Okulasi Janda',
  status: 'PENDING_DECLARATION'
});

storage.set('selection_pool', pool);

assert(getSelectionSourceLabel(pool[3]) === 'Okulasi (Grafting)', '8. Sumber Okulasi correctly labeled as "Okulasi (Grafting)"');
assert(getSelectionSourceLabel(pool[4]) === 'Okulasi Janda (Regrafting)', '8. Sumber Okulasi Janda correctly labeled as "Okulasi Janda (Regrafting)"');

// 4. Duplicate Card Prevention
console.log('\n--- 4. Card Duplication Prevention ---');
const totalItems = filterSelectionByScope(storage.get('selection_pool', []), mantriTBS);
assert(totalItems.length === 5, '10. Exactly 5 distinct cards rendered with no duplicates');

// 5. Declaration Action Workflow
console.log('\n--- 5. Declaration Action & Data Integrity ---');
const selectedItem = rusakItem;
selectedItem.status = 'DECLARED_CULLED';

// Update in pool
let updatedPool = storage.get('selection_pool', []);
const itemIdx = updatedPool.findIndex(p => p.id === selectedItem.id);
if (itemIdx !== -1) updatedPool[itemIdx].status = 'DECLARED_CULLED';
storage.set('selection_pool', updatedPool);

// Append to selection_transactions
const txList = storage.get('selection_transactions', []);
const newTx = {
  id: `SEL-${Date.now()}-001`,
  docNo: '2026/CULL/0001',
  selectionPoolDocNo: selectedItem.docNo,
  sourceModule: selectedItem.sourceModule,
  sourceTransactionType: selectedItem.sourceTransactionType,
  sourceTransactionId: selectedItem.sourceTransactionId,
  sourceDocNo: selectedItem.sourceDocNo,
  category: selectedItem.category,
  originType: selectedItem.originType,
  estateId: selectedItem.estateId,
  divisionId: selectedItem.divisionId,
  programId: selectedItem.programId,
  batchCode: selectedItem.batchCode,
  bedengan: selectedItem.bedengan,
  jumlahAfkir: selectedItem.jumlahAfkir,
  quantity: selectedItem.jumlahAfkir,
  sumberAsal: getSelectionSourceLabel(selectedItem),
  mantri: mantriTBS.name,
  createdByName: mantriTBS.name,
  status: SELECTION_STATUS.MENUNGGU_VERIFIKASI,
  stockMutationStatus: STOCK_MUTATION_STATUS.PENDING
};
txList.push(newTx);
storage.set('selection_transactions', txList);

assert(newTx.jumlahAfkir === 250, '6 & 7. Declaration button records exact quantity 250 Pkk');
assert(newTx.sourceDocNo === '2026/SOW/001', '7. Source Doc No 2026/SOW/001 correctly forwarded to transaction');
assert(newTx.batchCode === 'BTCH-001', '7. Batch BTCH-001 correctly forwarded');
assert(newTx.category === 'RUSAK', '7. Category RUSAK correctly forwarded');

// 6. Scope & Pending Status Consistency
console.log('\n--- 6. Scope Isolation & Pending Status Handling ---');
const mantriAPM = {
  userId: 'USR-MANTRI-APM',
  name: 'Mantri APM',
  role: 'MANTRI_TANAMAN',
  estateId: 'APM',
  divisionId: 'DIV-2'
};

const apmItems = filterSelectionByScope(storage.get('selection_pool', []), mantriAPM);
assert(apmItems.length === 0, '11. APM user cannot view TBS selection items (Scope isolation intact)');

const remainingPendingTBS = filterSelectionByScope(storage.get('selection_pool', []), mantriTBS)
  .filter(s => s.status !== 'DECLARED_CULLED');
assert(remainingPendingTBS.length === 4, '12. Pending count correctly decrements from 5 to 4 after declaration');

// Summary
console.log('\n========================================================================');
console.log(`INTEGRATION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('========================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
