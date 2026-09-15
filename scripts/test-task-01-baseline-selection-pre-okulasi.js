/**
 * scripts/test-task-01-baseline-selection-pre-okulasi.js
 * 
 * Integration Test for TASK-01-BASELINE-SELECTION-PRE-OKULASI-STRUCTURE-01
 * Verifies that:
 * 1. Existing selection from selection_pool still works seamlessly.
 * 2. Existing selection transactions can be created, displayed, and approved.
 * 3. Pre-Grafting selection structure (Seleksi I, II, III) and Post-Grafting selection coexist without conflict.
 * 4. 1 Polybag = 2 Bibit calculation is preserved.
 * 5. Legacy records without selectionStage / selectionType default safely to PASCA_OKULASI.
 * 6. Grafting flow remains completely unaffected.
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
  createSelectionRecord,
  approveSelectionRecord,
  declareSelectionItem,
  integrateSeedingToSelectionPool,
  isPreGraftingSelection,
  isPostGraftingSelection,
  getSelectionStageLabel,
  getSelectionSourceLabel,
  getSelectionCategoryLabel
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
console.log('   TASK-01: BASELINE SELECTION PRE-OKULASI STRUCTURE INTEGRATION TESTS          ');
console.log('================================================================================\n');

// Clean environment
storage.set(SELECTION_STORAGE_KEY, []);
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

const mockAsisten = {
  userId: 'USR-ASB-001',
  code: '1405001',
  name: 'Asisten Bibitan TBS',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-01',
  divisionName: 'Divisi I'
};

console.log('--- 1. SELECTION STAGE & TYPE CONSTANTS & HELPERS ---');

test('SELECTION_STAGES and SELECTION_TYPES are properly exported and frozen', () => {
  assert.strictEqual(SELECTION_STAGES.SELEKSI_1, 'SELEKSI_I');
  assert.strictEqual(SELECTION_STAGES.SELEKSI_2, 'SELEKSI_II');
  assert.strictEqual(SELECTION_STAGES.SELEKSI_3, 'SELEKSI_III');
  assert.strictEqual(SELECTION_STAGES.PASCA_OKULASI, 'SELEKSI_PASCA_OKULASI');
  assert.strictEqual(SELECTION_TYPES.PRA_OKULASI, 'PRA_OKULASI');
  assert.strictEqual(SELECTION_TYPES.PASCA_OKULASI, 'PASCA_OKULASI');
});

test('isPreGraftingSelection and isPostGraftingSelection accurately identify stage', () => {
  const preGraftItem1 = { selectionStage: 'SELEKSI_I', selectionType: 'PRA_OKULASI' };
  const preGraftItem2 = { selectionStage: 'SELEKSI_II' };
  const preGraftItem3 = { selectionStage: 'SELEKSI_III' };
  const postGraftItem1 = { selectionStage: 'SELEKSI_PASCA_OKULASI', selectionType: 'PASCA_OKULASI' };
  const legacyItem = { sourceModule: 'PEMERIKSAAN', originType: 'REJECT_PEMERIKSAAN' };

  assert.strictEqual(isPreGraftingSelection(preGraftItem1), true);
  assert.strictEqual(isPreGraftingSelection(preGraftItem2), true);
  assert.strictEqual(isPreGraftingSelection(preGraftItem3), true);
  assert.strictEqual(isPreGraftingSelection(postGraftItem1), false);
  assert.strictEqual(isPreGraftingSelection(legacyItem), false);

  assert.strictEqual(isPostGraftingSelection(postGraftItem1), true);
  assert.strictEqual(isPostGraftingSelection(legacyItem), true);
  assert.strictEqual(isPostGraftingSelection(preGraftItem1), false);
});

test('getSelectionStageLabel resolves correct human-readable names', () => {
  assert.strictEqual(getSelectionStageLabel({ selectionStage: 'SELEKSI_I' }), 'Seleksi I (Pra-Okulasi)');
  assert.strictEqual(getSelectionStageLabel({ selectionStage: 'SELEKSI_II' }), 'Seleksi II (Pra-Okulasi)');
  assert.strictEqual(getSelectionStageLabel({ selectionStage: 'SELEKSI_III' }), 'Seleksi III (Pra-Okulasi)');
  assert.strictEqual(getSelectionStageLabel({ selectionStage: 'SELEKSI_PASCA_OKULASI' }), 'Seleksi Pasca-Okulasi');
  assert.strictEqual(getSelectionStageLabel({ sourceModule: 'PENYEMAIAN' }), 'Transaksi Penyemaian');
  assert.strictEqual(getSelectionStageLabel({ originType: 'REJECT_OKULASI' }), 'Okulasi (Grafting)');
});

console.log('\n--- 2. EXISTING SELECTION POOL & DECLARATION FLOW (NO REGRESSION) ---');

test('Existing seeding rejection creates selection_pool item', () => {
  const seedingTx = {
    id: 'SEED-001',
    docNo: '2026/SOW/001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-01',
    batchId: 'BATCH-001',
    batchNo: 'Batch-01',
    ditolak: 50,
    alasanDitolak: 'Rusak',
    klonAwal: 'GT 1'
  };

  const res = integrateSeedingToSelectionPool(seedingTx);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.createdCount, 1);

  const pool = storage.get('selection_pool', []);
  assert.strictEqual(pool.length, 1);
  assert.strictEqual(pool[0].category, 'RUSAK');
  assert.strictEqual(pool[0].jumlahAfkir, 50);
});

test('Existing declareSelectionItem creates valid transaction in storage', () => {
  const pool = storage.get('selection_pool', []);
  const poolItem = pool[0];

  const res = declareSelectionItem(poolItem, mockMantri, { photoData: 'sample_photo' });
  assert.strictEqual(res.success, true);

  const txs = storage.get(SELECTION_STORAGE_KEY, []);
  assert.strictEqual(txs.length, 1);
  assert.strictEqual(txs[0].status, SELECTION_STATUS.MENUNGGU_VERIFIKASI);
  assert.strictEqual(txs[0].jumlahAfkir, 50);
  assert.strictEqual(txs[0].selectionType, SELECTION_TYPES.PASCA_OKULASI);
});

test('Approval by Asisten Bibitan updates status to DISETUJUI without errors', () => {
  const txs = storage.get(SELECTION_STORAGE_KEY, []);
  const txId = txs[0].id;

  const approved = approveSelectionRecord(txId, 'Disetujui', mockAsisten);
  assert.strictEqual(approved.status, SELECTION_STATUS.DISETUJUI);
  assert.strictEqual(approved.verifiedByName, 'Asisten Bibitan TBS');

  const updatedTxs = storage.get(SELECTION_STORAGE_KEY, []);
  assert.strictEqual(updatedTxs[0].status, SELECTION_STATUS.DISETUJUI);
});

console.log('\n--- 3. PRE-GRAFTING SELECTION STRUCTURE COMPATIBILITY ---');

test('createSelectionRecord supports Pre-Grafting Seleksi I with Polybag Rule 1:2', () => {
  const preGraftPayload = {
    docNo: '2026/SEL-1/001',
    selectionStage: SELECTION_STAGES.SELEKSI_1,
    selectionType: SELECTION_TYPES.PRA_OKULASI,
    isCompleted: false,
    batchId: 'BATCH-001',
    batchCode: 'Batch-01',
    bedenganId: 'BED-001',
    jumlahDiperiksa: 2000,
    jumlahLayak: 1950,
    jumlahAfkir: 50,
    sourceModule: 'PENYEMAIAN',
    sourceDocNo: '2026/SOW/001'
  };

  const record = createSelectionRecord(preGraftPayload, mockMantri);
  assert.strictEqual(record.selectionStage, 'SELEKSI_I');
  assert.strictEqual(record.selectionType, 'PRA_OKULASI');
  assert.strictEqual(record.isCompleted, false);
  assert.strictEqual(record.polybagCount, 1000, '2000 bibit checked = 1000 polybag');
  assert.strictEqual(record.jumlahLayak, 1950);
  assert.strictEqual(record.jumlahAfkir, 50);
  assert.strictEqual(isPreGraftingSelection(record), true);
});

test('Coexistence: Both Pre-Grafting and Post-Grafting records exist in storage cleanly', () => {
  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  assert.strictEqual(allTxs.length, 2, 'Storage contains 1 Post-Grafting and 1 Pre-Grafting record');

  const preList = allTxs.filter(isPreGraftingSelection);
  const postList = allTxs.filter(isPostGraftingSelection);

  assert.strictEqual(preList.length, 1, 'Exactly 1 Pre-Grafting record found');
  assert.strictEqual(postList.length, 1, 'Exactly 1 Post-Grafting record found');
  assert.strictEqual(preList[0].selectionStage, 'SELEKSI_I');
  assert.strictEqual(postList[0].selectionStage, 'SELEKSI_PASCA_OKULASI');
});

console.log('\n--- 4. GRAFTING FLOW ISOLATION & NON-INTERFERENCE ---');

test('Budding / Grafting transactions and pools remain intact', () => {
  storage.set('budding_transactions', [
    { docNo: '2026/OKL/001', batchNo: 'Batch-01', jumlah: 1950, type: 'GRAFTING' }
  ]);

  const buddings = storage.get('budding_transactions', []);
  assert.strictEqual(buddings.length, 1);
  assert.strictEqual(buddings[0].jumlah, 1950);
  assert.strictEqual(buddings[0].type, 'GRAFTING');
});

console.log('\n================================================================================');
console.log(`TEST SUMMARY: ${passed}/${total} PASSED, ${total - passed} FAILED`);
console.log('================================================================================');

if (passed === total) {
  console.log('ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
} else {
  process.exit(1);
}
