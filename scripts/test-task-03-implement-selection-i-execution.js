/**
 * scripts/test-task-03-implement-selection-i-execution.js
 * 
 * Integration Test Suite for TASK-03-IMPLEMENT-SELECTION-I-EXECUTION-01
 * Verifies that:
 * 1. Membuat Dokumen Seleksi I from Seeding.
 * 2. Membuat 1 transaksi Seleksi I.
 * 3. Membuat beberapa transaksi Seleksi I pada dokumen yang sama (multi-session).
 * 4. Memastikan source bedengan benar.
 * 5. Memastikan polybag source benar (preserved from Seeding).
 * 6. Memastikan rule 2 bibit/polybag pada populasi awal tidak berubah.
 * 7. Memastikan hasil 2/1/0 bibit per polybag dapat direpresentasikan.
 * 8. Memastikan quantity balance (bibit & polybag).
 * 9. Memastikan transaksi overlap tidak menyebabkan double count.
 * 10. Memastikan Selection Pasca-Okulasi existing tetap berjalan.
 * 11. Memastikan tidak ada perubahan pada Grafting.
 * 12. Refresh/reload tetap mempertahankan transaksi.
 * 13. Completion state parent dokumen tetap manual.
 * 14. Source document Penyemaian tetap tidak diubah.
 */

// Mock localStorage for Node.js environment
const memoryStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in memoryStore ? memoryStore[k] : null),
  setItem: (k, v) => { memoryStore[k] = String(v); },
  removeItem: (k) => { delete memoryStore[k]; },
  clear: () => { for (const k of Object.keys(memoryStore)) delete memoryStore[k]; }
};

import assert from 'node:assert';
import { storage } from '../js/core/storage.js';
import {
  SELECTION_STATUS,
  SELECTION_STAGES,
  SELECTION_TYPES,
  SELECTION_STORAGE_KEY,
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  createPreGraftingSelectionDocument,
  getPreGraftingSelectionDocuments,
  getPreGraftingSelectionDocumentById,
  setPreGraftingSelectionDocumentCompletion,
  syncAllSeedingsToPreGraftingSelectionDocuments,
  getSeleksi1ExecutionsByDocument,
  getBedenganScopeStatusForSeleksi1,
  validateSeleksi1Execution,
  createSeleksi1ExecutionTransaction,
  declareSelectionItem,
  integrateSeedingToSelectionPool,
  isPreGraftingSelection,
  isPostGraftingSelection
} from '../js/modules/selection/selection-manager.js';

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${name} ->`, err.message);
  }
}

console.log('================================================================================');
console.log('   TASK-03: SELEKSI I EXECUTION TRANSACTION INTEGRATION TESTS                   ');
console.log('================================================================================\n');

// Reset storages
storage.set(SELECTION_STORAGE_KEY, []);
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
storage.set('selection_pool', []);
storage.set('seeding_transactions', []);
storage.set('budding_transactions', []);

const mockMantri = {
  userId: 'USR-MNT-001',
  code: '1405482',
  name: 'Wagiman',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-01',
  divisionName: 'Divisi I'
};

// 1. SETUP PENYEMAIAN DOKUMEN DENGAN 2 BEDENGAN
const seedingTx = {
  id: 'SEED-2026-001',
  docNo: '2026/SOW/001',
  programId: 'PRG-2026-001',
  programCode: 'PRG/NUR/01/2026',
  programName: 'Program Nursery 2026',
  batchId: 'BATCH-2026-001',
  batchCode: 'Batch-01',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-01',
  divisionName: 'Divisi I',
  klonAwal: 'GT 1',
  totalDisemai: 400,
  totalPolybag: 200,
  rows: [
    { bedenganId: 'BED-001', bedenganCode: 'BED-001', disemai: 200, polybag: 100 },
    { bedenganId: 'BED-002', bedenganCode: 'BED-002', disemai: 200, polybag: 100 }
  ]
};

storage.set('seeding_transactions', [seedingTx]);

console.log('--- TEST GROUP 1: MEMBUAT DOKUMEN SELEKSI I DARI PENYEMAIAN ---');

let parentDoc = null;
test('1.1 Create parent Pre-Grafting Selection Document from Seeding', () => {
  parentDoc = createPreGraftingSelectionDocument(seedingTx, mockMantri);
  assert.ok(parentDoc, 'Parent document must be created');
  assert.strictEqual(parentDoc.sourceDocNo, '2026/SOW/001');
  assert.strictEqual(parentDoc.sourcePolybagQty, 200);
  assert.strictEqual(parentDoc.sourceBibitQty, 400);
  assert.strictEqual(parentDoc.selectionStage, SELECTION_STAGES.SELEKSI_1);
  assert.strictEqual(parentDoc.isCompleted, false);
});

test('1.2 Verify Bedengan scope status calculation before any execution', () => {
  const bedScope = getBedenganScopeStatusForSeleksi1(parentDoc);
  assert.strictEqual(bedScope.length, 2);
  assert.strictEqual(bedScope[0].bedenganCode, 'BED-001');
  assert.strictEqual(bedScope[0].initialPolybag, 100);
  assert.strictEqual(bedScope[0].remainingPolybag, 100);
  assert.strictEqual(bedScope[0].inspectedPolybag, 0);
  assert.strictEqual(bedScope[1].bedenganCode, 'BED-002');
  assert.strictEqual(bedScope[1].initialPolybag, 100);
  assert.strictEqual(bedScope[1].remainingPolybag, 100);
});

console.log('\n--- TEST GROUP 2: MEMBUAT 1 TRANSAKSI SELEKSI I & VALIDASI POLIBAG 2/1/0 ---');

let tx1 = null;
test('2.1 Single Seleksi I execution on Bedengan BED-001 (80x2, 15x1, 5x0)', () => {
  // 100 polybags on BED-001:
  // 80 polybag -> 2 bibit (160 bibit)
  // 15 polybag -> 1 bibit (15 bibit)
  // 5 polybag  -> 0 bibit (0 bibit)
  // Bibit dipertahankan = 175
  // Bibit reject = 25 (15 + 10)
  // Bibit awal diperiksa = 200 (100 * 2)
  const res = createSeleksi1ExecutionTransaction({
    selectionDocumentId: parentDoc.id,
    bedenganCode: 'BED-001',
    polybagScope: 100,
    polybag2Bibit: 80,
    polybag1Bibit: 15,
    polybag0Bibit: 5,
    tanggalSeleksi: '16/09/2026',
    catatan: 'Pemeriksaan sesi 1 BED-001'
  }, mockMantri);

  assert.ok(res.success);
  tx1 = res.transaction;
  assert.strictEqual(tx1.selectionStage, SELECTION_STAGES.SELEKSI_1);
  assert.strictEqual(tx1.selectionType, SELECTION_TYPES.PRA_OKULASI);
  assert.strictEqual(tx1.transactionType, 'PELAKSANAAN_SELEKSI_I');
  assert.strictEqual(tx1.selectionDocumentId, parentDoc.id);
  assert.strictEqual(tx1.selectionDocNo, parentDoc.docNo);
  assert.strictEqual(tx1.sourceDocNo, '2026/SOW/001');
  assert.strictEqual(tx1.bedenganCode, 'BED-001');
  assert.strictEqual(tx1.polybagScope, 100);
  assert.strictEqual(tx1.bibitAwal, 200);
  assert.strictEqual(tx1.jumlahDiperiksa, 200);
  assert.strictEqual(tx1.polybag2Bibit, 80);
  assert.strictEqual(tx1.polybag1Bibit, 15);
  assert.strictEqual(tx1.polybag0Bibit, 5);
  assert.strictEqual(tx1.bibitDipertahankan, 175);
  assert.strictEqual(tx1.jumlahLayak, 175);
  assert.strictEqual(tx1.bibitReject, 25);
  assert.strictEqual(tx1.jumlahAfkir, 25);
});

test('2.2 Verify quantity balance in Tx 1: bibitDiperiksa = bibitDipertahankan + bibitReject', () => {
  assert.strictEqual(tx1.jumlahDiperiksa, tx1.bibitDipertahankan + tx1.bibitReject);
  assert.strictEqual(tx1.polybagScope, tx1.polybag2Bibit + tx1.polybag1Bibit + tx1.polybag0Bibit);
  assert.strictEqual(tx1.bibitAwal, tx1.polybagScope * 2);
});

test('2.3 Verify parent document counters update correctly after Tx 1', () => {
  const updatedParent = getPreGraftingSelectionDocumentById(parentDoc.id);
  assert.strictEqual(updatedParent.executionCount, 1);
  assert.strictEqual(updatedParent.totalDiperiksa, 200);
  assert.strictEqual(updatedParent.totalLayak, 175);
  assert.strictEqual(updatedParent.totalAfkir, 25);
  assert.strictEqual(updatedParent.currentBibitQty, 375); // 400 - 25
  assert.strictEqual(updatedParent.isCompleted, false); // NOT auto-completed
  assert.strictEqual(updatedParent.status, 'IN_PROGRESS');
});

console.log('\n--- TEST GROUP 3: MULTI-SESI TRANSAKSI PADA DOKUMEN YANG SAMA ---');

let tx2 = null;
test('3.1 Multi-session execution on Bedengan BED-002 on Day 2', () => {
  // BED-002 (100 polybags):
  // 90 polybag -> 2 bibit (180 bibit)
  // 10 polybag -> 1 bibit (10 bibit)
  // 0 polybag  -> 0 bibit (0 bibit)
  // Bibit dipertahankan = 190
  // Bibit reject = 10
  const res = createSeleksi1ExecutionTransaction({
    selectionDocumentId: parentDoc.id,
    bedenganCode: 'BED-002',
    polybagScope: 100,
    polybag2Bibit: 90,
    polybag1Bibit: 10,
    polybag0Bibit: 0,
    tanggalSeleksi: '17/09/2026',
    catatan: 'Pemeriksaan sesi 2 BED-002'
  }, mockMantri);

  assert.ok(res.success);
  tx2 = res.transaction;
  assert.strictEqual(tx2.bedenganCode, 'BED-002');
  assert.strictEqual(tx2.bibitDipertahankan, 190);
  assert.strictEqual(tx2.bibitReject, 10);
});

test('3.2 Verify getSeleksi1ExecutionsByDocument returns all child sessions', () => {
  const childTxs = getSeleksi1ExecutionsByDocument(parentDoc.id);
  assert.strictEqual(childTxs.length, 2);
  assert.strictEqual(childTxs[0].id, tx1.id);
  assert.strictEqual(childTxs[1].id, tx2.id);
});

test('3.3 Verify cumulative totals on parent document across all sessions', () => {
  const updatedParent = getPreGraftingSelectionDocumentById(parentDoc.id);
  assert.strictEqual(updatedParent.executionCount, 2);
  assert.strictEqual(updatedParent.totalDiperiksa, 400); // 200 + 200
  assert.strictEqual(updatedParent.totalLayak, 365);     // 175 + 190
  assert.strictEqual(updatedParent.totalAfkir, 35);       // 25 + 10
  assert.strictEqual(updatedParent.currentBibitQty, 365); // 400 - 35
  assert.strictEqual(updatedParent.isCompleted, false);  // Still strictly manual
});

console.log('\n--- TEST GROUP 4: OVERLAP & INVALID SCOPE PROTECTION ---');

test('4.1 Overlap prevention: Attempting to inspect BED-001 again when 0 polybags remain', () => {
  let thrown = false;
  try {
    createSeleksi1ExecutionTransaction({
      selectionDocumentId: parentDoc.id,
      bedenganCode: 'BED-001',
      polybagScope: 50,
      polybag2Bibit: 50,
      polybag1Bibit: 0,
      polybag0Bibit: 0
    }, mockMantri);
  } catch (err) {
    thrown = true;
    assert.match(err.message, /melebihi sisa polybag/i);
  }
  assert.strictEqual(thrown, true, 'Must reject double inspection beyond remaining scope');
});

test('4.2 Scope check: Attempting to inspect bedengan not belonging to parent document', () => {
  let thrown = false;
  try {
    createSeleksi1ExecutionTransaction({
      selectionDocumentId: parentDoc.id,
      bedenganCode: 'BED-999',
      polybagScope: 50,
      polybag2Bibit: 50,
      polybag1Bibit: 0,
      polybag0Bibit: 0
    }, mockMantri);
  } catch (err) {
    thrown = true;
    assert.match(err.message, /tidak termasuk dalam scope/i);
  }
  assert.strictEqual(thrown, true, 'Must reject unauthorized bedengan');
});

test('4.3 Mathematical imbalance check: polybag breakdown mismatch (80 + 10 != 100)', () => {
  const validation = validateSeleksi1Execution({
    bedenganCode: 'BED-001',
    polybagScope: 100,
    polybag2Bibit: 80,
    polybag1Bibit: 10,
    polybag0Bibit: 0 // sum is 90 != 100
  }, parentDoc);

  assert.strictEqual(validation.isValid, false);
  assert.ok(validation.errors.some(e => e.includes('Total breakdown kondisi polybag')));
});

console.log('\n--- TEST GROUP 5: REJECT REFERENCE INTEGRITY ---');

test('5.1 Reject reference stored on transaction without altering selection_pool', () => {
  assert.ok(tx1.rejectSourceReference);
  assert.strictEqual(tx1.rejectSourceReference.stage, SELECTION_STAGES.SELEKSI_1);
  assert.strictEqual(tx1.rejectSourceReference.parentDocNo, parentDoc.docNo);
  assert.strictEqual(tx1.rejectSourceReference.rejectCount, 25);
  assert.strictEqual(tx1.rejectSourceReference.breakdown.fromSingleSeedPolybag, 15);
  assert.strictEqual(tx1.rejectSourceReference.breakdown.fromEmptyPolybag, 10);

  // selection_pool remains completely empty
  const pool = storage.get('selection_pool', []);
  assert.strictEqual(pool.length, 0, 'selection_pool must NOT be polluted by Seleksi I without business confirmation');
});

console.log('\n--- TEST GROUP 6: BACKWARD COMPATIBILITY & ISOLATION ---');

test('6.1 Source Penyemaian transaction remains completely untouched', () => {
  const seedings = storage.get('seeding_transactions', []);
  assert.strictEqual(seedings.length, 1);
  assert.strictEqual(seedings[0].totalDisemai, 400);
  assert.strictEqual(seedings[0].totalPolybag, 200);
  assert.strictEqual(seedings[0].docNo, '2026/SOW/001');
});

test('6.2 Post-Grafting culling and selection transactions function independently', () => {
  // Test declareSelectionItem on post-grafting afkir item
  const postGraftingItem = {
    id: 'POOL-CULL-001',
    docNo: '2026/CULL/001',
    sourceModule: 'BUDDING',
    originType: 'REJECT_OKULASI',
    sourceDocNo: '2026/OKU/001',
    jumlahAfkir: 12,
    batchCode: 'Batch-01',
    category: 'RUSAK',
    status: 'PENDING_DECLARATION'
  };
  storage.set('selection_pool', [postGraftingItem]);

  const declareRes = declareSelectionItem(postGraftingItem, null, mockMantri);
  assert.ok(declareRes.success);
  assert.strictEqual(isPostGraftingSelection(declareRes.transaction), true);
  assert.strictEqual(isPreGraftingSelection(tx1), true);
});

test('6.3 Grafting transactions storage remains completely untouched and isolated', () => {
  const buddingTxs = storage.get('budding_transactions', []);
  assert.strictEqual(buddingTxs.length, 0);
});

test('6.4 Parent document completion state can be manually toggled by Mantri', () => {
  const completedDoc = setPreGraftingSelectionDocumentCompletion(parentDoc.id, true, mockMantri);
  assert.strictEqual(completedDoc.isCompleted, true);
  assert.strictEqual(completedDoc.status, 'COMPLETED');
  assert.ok(completedDoc.completedAt);
});

console.log('\n--- TEST GROUP 7: RELOAD / PERSISTENCE FIDELITY ---');

test('7.1 Reloading all transactions from storage maintains all fields and structures', () => {
  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  const preGraftingExecs = allTxs.filter(t => isPreGraftingSelection(t));
  assert.strictEqual(preGraftingExecs.length, 2);

  const reloadedTx1 = preGraftingExecs.find(t => t.id === tx1.id);
  assert.strictEqual(reloadedTx1.polybagScope, 100);
  assert.strictEqual(reloadedTx1.bibitDipertahankan, 175);
  assert.strictEqual(reloadedTx1.bibitReject, 25);
  assert.strictEqual(reloadedTx1.polybag2Bibit, 80);
  assert.strictEqual(reloadedTx1.polybag1Bibit, 15);
  assert.strictEqual(reloadedTx1.polybag0Bibit, 5);
});

console.log('\n================================================================================');
console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
console.log('================================================================================');

if (passed === total) {
  console.log('🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!');
  process.exit(0);
} else {
  console.error('❌ SOME TESTS FAILED');
  process.exit(1);
}
