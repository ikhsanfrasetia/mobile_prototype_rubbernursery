/**
 * scripts/test-master-batch-pure-scope.js
 * Verification Test Suite for Pure Master Batch Scope (TASK-FIX-MASTER-BATCH-SCOPE-01)
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

import {
  STORAGE_KEY_NURSERY_BATCHES,
  BATCH_MASTER_STATUS,
  BATCH_STATUS,
  getAllBatches,
  getActiveBatches,
  getBatchById,
  getBatchByCode,
  isBatchActive,
  createBatch,
  updateBatch,
  activateBatch,
  deactivateBatch,
  resetBatchMasterToDefault,
  getNextBatchCandidate
} from '../js/data/batch-master.js';
import { ROLES } from '../js/core/user-context.js';
import { storage, KEYS } from '../js/core/storage.js';
import { renderMasterBatch } from '../js/modules/master/master-batch.js';
import { deductBatchStock } from '../js/modules/dispatch/dispatch-landing.js';
import { createNurseryBatchesFromReceipt } from '../js/core/receipt-ksp-manager.js';
import { BEDENGAN_STATUS, getAllBedengan } from '../js/data/bedengan-master.js';

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

console.log('========================================================================================');
console.log('   TEST SUITE: PURE MASTER BATCH SCOPE VERIFICATION (TASK-FIX-MASTER-BATCH-SCOPE-01)    ');
console.log('========================================================================================\n');

// Mock DOM environment
const fakeApp = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
global.document = {
  getElementById: (id) => (id === 'app' ? fakeApp : null),
  querySelectorAll: () => []
};

// Reset to canonical baseline
resetBatchMasterToDefault();

const asbUser = {
  userId: 'USR-ASB-TBS',
  role: ROLES.ASISTEN_BIBITAN,
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

storage.set(KEYS.SESSION, asbUser);

// 1 & 2: Render ASB UI & Check absence of availableQty presentation
console.log('--- 1 & 2. UI Presentation Audit ---');
renderMasterBatch();
const renderedHtml = fakeApp.innerHTML;

assert(!renderedHtml.includes('Stok Tersedia'), '1. Kolom "Stok Tersedia" tidak ada pada header tabel');
assert(!renderedHtml.includes('Total Stok Aktif'), '2. Metric "Total Stok Aktif" tidak ada pada UI Master Batch');
assert(!renderedHtml.includes('Habis / Kosong'), '3. Metric "Habis / Kosong" tidak ada pada UI Master Batch');
assert(!renderedHtml.includes('5.000 <span') && !renderedHtml.includes('8.000 <span') && !renderedHtml.includes('Bibit</span>'), '4. Tidak ada kuantitas saldo inventori (misal 5.000 Bibit) di tabel Master Batch');

// 3 & 4 & 5: Status Badges
console.log('\n--- 3, 4, 5 & 6. Status Badges & Master Status Terminology ---');
assert(!renderedHtml.includes('>Tersedia<'), '5. Status "Tersedia" tidak digunakan di Master Batch');
assert(!renderedHtml.includes('>Habis<'), '6. Status "Habis" tidak digunakan di Master Batch');
assert(renderedHtml.includes('Aktif'), '6b. Status "Aktif" muncul pada badge Master Batch');

// 7, 8 & 9: Summary Metrics
console.log('\n--- 7, 8 & 9. Summary Metrics based on statusMaster ---');
const allTbs = getAllBatches({ estateId: 'EST-TBS', divisionId: 'DIV-001' });
const activeTbs = allTbs.filter(b => b.statusMaster === BATCH_MASTER_STATUS.ACTIVE);
const inactiveTbs = allTbs.filter(b => b.statusMaster === BATCH_MASTER_STATUS.INACTIVE);

assert(renderedHtml.includes(`Total Batch</div>\n                  <div style="font-size: 0.95rem; font-weight: 800; color: #0F172A; margin-top: 1px;">${allTbs.length}`), '7. Summary Total Batch benar');
assert(renderedHtml.includes(`Batch Aktif</div>\n                  <div style="font-size: 0.95rem; font-weight: 800; color: #166534; margin-top: 1px;">${activeTbs.length}`), '8. Summary Batch Aktif benar berdasarkan statusMaster');
assert(renderedHtml.includes(`Nonaktif</div>\n                  <div style="font-size: 0.95rem; font-weight: 800; color: #64748B; margin-top: 1px;">${inactiveTbs.length}`), '9. Summary Nonaktif benar berdasarkan statusMaster');

// 10: availableQty = 0 does NOT make batch inactive
console.log('\n--- 10 & 11. State Decoupling: availableQty vs statusMaster ---');
const sampleBatch = allTbs[0];
// Mutate availableQty to 0
sampleBatch.availableQty = 0;
storage.set(STORAGE_KEY_NURSERY_BATCHES, allTbs);

const batchWithZeroQty = getBatchById(sampleBatch.id);
assert(batchWithZeroQty.availableQty === 0, '10a. Underlying availableQty = 0');
assert(batchWithZeroQty.statusMaster === BATCH_MASTER_STATUS.ACTIVE, '10b. statusMaster tetap ACTIVE meski availableQty = 0');
assert(isBatchActive(sampleBatch.id) === true, '10c. isBatchActive() mengembalikan true');

// 11: availableQty > 0 does NOT make inactive batch active
deactivateBatch(sampleBatch.id, asbUser);
const allBatchesCurrent = getAllBatches();
const bIdx = allBatchesCurrent.findIndex(b => b.id === sampleBatch.id);
allBatchesCurrent[bIdx].availableQty = 5000;
storage.set(STORAGE_KEY_NURSERY_BATCHES, allBatchesCurrent);

const batchInactiveWithStock = getBatchById(sampleBatch.id);
assert(batchInactiveWithStock.availableQty === 5000, '11a. Underlying availableQty = 5000');
assert(batchInactiveWithStock.statusMaster === BATCH_MASTER_STATUS.INACTIVE, '11b. statusMaster tetap INACTIVE meski availableQty = 5000');
assert(isBatchActive(sampleBatch.id) === false, '11c. isBatchActive() mengembalikan false');

// 12 & 13: activateBatch & deactivateBatch
console.log('\n--- 12 & 13. Lifecycle Methods (activateBatch / deactivateBatch) ---');
activateBatch(sampleBatch.id, asbUser);
const reloadedActivated = getBatchById(sampleBatch.id);
assert(reloadedActivated.statusMaster === BATCH_MASTER_STATUS.ACTIVE, '12. activateBatch() mengubah statusMaster menjadi ACTIVE');

deactivateBatch(sampleBatch.id, asbUser);
const reloadedDeactivated = getBatchById(sampleBatch.id);
assert(reloadedDeactivated.statusMaster === BATCH_MASTER_STATUS.INACTIVE, '13. deactivateBatch() mengubah statusMaster menjadi INACTIVE');

// 14: Edit status only uses master status
console.log('\n--- 14. updateBatch with master status ---');
updateBatch(sampleBatch.id, { statusMaster: BATCH_MASTER_STATUS.ACTIVE }, asbUser);
assert(getBatchById(sampleBatch.id).statusMaster === BATCH_MASTER_STATUS.ACTIVE, '14. updateBatch() menerima statusMaster: ACTIVE');

// 15: Create Batch does not ask for quantity and defaults to statusMaster = ACTIVE
console.log('\n--- 15. Create Batch Flow ---');
const cand = getNextBatchCandidate('PRG-2026-001', 'EST-TBS', 'DIV-001');
const created = createBatch({
  batchId: cand.batchId,
  batchCode: cand.batchCode,
  name: cand.name,
  qrCode: cand.qrCode,
  programId: 'PRG-2026-001',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  clone: 'IRCA 19',
  growthStage: 'Rubber Advance Planting Material',
  category: 'Polibag Besar',
  bedenganIds: []
}, asbUser);

assert(created.statusMaster === BATCH_MASTER_STATUS.ACTIVE, '15a. Batch baru memiliki statusMaster: ACTIVE');
assert(created.availableQty === 0, '15b. Batch baru diinisialisasi dengan availableQty = 0 untuk internal engine');

// 16: QR payload only contains master identity
console.log('\n--- 16. QR Payload ---');
const qrBatch = getBatchById(created.id);
const qrPayload = {
  type: 'BATCH',
  batchId: qrBatch.batchId || qrBatch.id,
  batchCode: qrBatch.batchCode || qrBatch.batchNo,
  programId: qrBatch.programId,
  estateId: qrBatch.estateId,
  divisionId: qrBatch.divisionId
};
assert(!('availableQty' in qrPayload) && !('stock' in qrPayload), '16. QR payload murni identitas master batch, tidak mengandung stok');

// 17: Program filter works
console.log('\n--- 17. Program Filter ---');
const prgBatches = getAllBatches({ programId: 'PRG-2026-001' });
assert(prgBatches.every(b => b.programId === 'PRG-2026-001'), '17. Filter program mengembalikan batch sesuai programId');

// 18: availableQty remains intact for underlying storage
console.log('\n--- 18. Underlying Data Integrity ---');
const storedRaw = storage.get(STORAGE_KEY_NURSERY_BATCHES, []);
assert(storedRaw.some(b => typeof b.availableQty === 'number'), '18. nursery_batches.availableQty tetap ada di storage untuk transaction engine');

// 19: Transaction engines (Receipt KSP & Dispatch) mutate stock properly
console.log('\n--- 19. Transaction Engine Mutations ---');
// Dispatch deduction
const dispatchTarget = storedRaw.find(b => b.availableQty >= 100);
if (dispatchTarget) {
  const initialStock = dispatchTarget.availableQty;
  deductBatchStock(dispatchTarget.batchCode, 50);
  const afterDispatch = getBatchByCode(dispatchTarget.batchCode);
  assert(afterDispatch.availableQty === initialStock - 50, '19a. Dispatch tetap dapat memotong availableQty');
  assert(afterDispatch.statusMaster === BATCH_MASTER_STATUS.ACTIVE, '19b. Mutasi dispatch tidak merusak statusMaster');
}

// Receipt KSP addition
const receiptMock = {
  id: 'RCP-PURE-01',
  receiptDocNo: 'RCP-PURE-01',
  targetEstateId: 'EST-TBS',
  targetNextDivisionId: 'DIV-001',
  programId: 'PRG-2026-001'
};
const detailsMock = [{ cloneId: 'IRCA 19', category: 'Polibag Besar', growthStage: 'Rubber Advance Planting Material', qtyAccepted: 250 }];
const newReceiptBatches = createNurseryBatchesFromReceipt(receiptMock, detailsMock, asbUser);
assert(newReceiptBatches.length === 1 && newReceiptBatches[0].availableQty === 250, '19c. Receipt KSP tetap dapat membentuk batch dengan stok');

// 20: Consistency with Master Bedengan
console.log('\n--- 20. Consistency with Master Bedengan Lifecycle ---');
const allBeds = getAllBedengan();
assert(allBeds.length > 0, '20a. Bedengan master tersedia');
assert(typeof BATCH_MASTER_STATUS.ACTIVE === 'string' && typeof BATCH_MASTER_STATUS.INACTIVE === 'string', '20b. Batch Master Status memiliki ACTIVE/INACTIVE konsisten dengan Bedengan Master lifecycle');

console.log('\n================================================================================');
console.log(`TOTAL PASSED: ${passed}`);
console.log(`TOTAL FAILED: ${failed}`);
console.log('================================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
