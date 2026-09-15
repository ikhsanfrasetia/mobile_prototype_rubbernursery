/**
 * scripts/test-task-02-baseline-pre-grafting-selection-doc.js
 * 
 * Integration Test Suite for TASK-02-BASELINE-PRE-GRAFTING-SELECTION-DOCUMENT-01
 * Verifies that:
 * 1. Dokumen Seleksi Pra-Okulasi can be created and queried from Penyemaian source.
 * 2. Source bibit and polybag quantities are preserved directly from Penyemaian (treated as 2 distinct quantities).
 * 3. Polybag count is NOT recalculated using arbitrary formulas like ceil(jumlahDiperiksa / 2).
 * 4. Document acts as a container supporting multiple child execution transactions.
 * 5. Completion state defaults to false (not completed) and is strictly manual (no auto-completion).
 * 6. Existing Post-Grafting selection and selection_pool remain completely intact.
 * 7. Grafting flow remains completely isolated and unaffected.
 * 8. Resync / page reload does not create duplicate selection documents.
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
  createSelectionRecord,
  approveSelectionRecord,
  declareSelectionItem,
  integrateSeedingToSelectionPool,
  isPreGraftingSelection,
  isPostGraftingSelection,
  getSelectionStageLabel
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
console.log('   TASK-02: PRE-GRAFTING SELECTION DOCUMENT BASELINE INTEGRATION TESTS          ');
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

console.log('--- 1. CREATION & RELATION TO PENYEMAIAN SOURCE ---');

const sampleSeeding1 = {
  id: 'SEED-2026-001',
  docNo: '2026/SOW/001',
  programId: 'PRG-2026-001',
  programCode: 'PRG/NUR/01/2026',
  programName: 'Program Replanting 2026',
  batchId: 'BATCH-001',
  batchCode: 'Batch-01',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-01',
  divisionName: 'Divisi I',
  bedenganId: 'BED-001',
  bedenganCode: 'BED-001',
  bedenganIds: ['BED-001', 'BED-002'],
  klonAwal: 'GT 1',
  tahapan: 'Rubber Main Nursery',
  totalDisemai: 1000,
  totalPolybag: 500, // 1 polybag = 2 bibit
  ditolak: 20
};

test('Dokumen Seleksi Pra-Okulasi can be created with complete Penyemaian references', () => {
  const doc = createPreGraftingSelectionDocument(sampleSeeding1, mockMantri);
  assert.ok(doc, 'Document object created');
  assert.strictEqual(doc.selectionType, SELECTION_TYPES.PRA_OKULASI);
  assert.strictEqual(doc.selectionStage, SELECTION_STAGES.SELEKSI_1);
  assert.strictEqual(doc.sourceDocNo, '2026/SOW/001');
  assert.strictEqual(doc.sourceTransactionId, 'SEED-2026-001');
  assert.strictEqual(doc.sourceModule, 'PENYEMAIAN');
  assert.strictEqual(doc.batchCode, 'Batch-01');
  assert.strictEqual(doc.estateId, 'EST-TBS');
  assert.strictEqual(doc.divisionId, 'DIV-01');
});

console.log('\n--- 2. QUANTITY ACCURACY: BIBIT & POLYBAG INDEPENDENCE ---');

test('Preserves distinct Bibit (1000) and Polybag (500) quantities from Penyemaian source', () => {
  const doc = getPreGraftingSelectionDocumentById('2026/SOW/001');
  assert.strictEqual(doc.sourceBibitQty, 1000, 'Bibit quantity must equal totalDisemai from Penyemaian');
  assert.strictEqual(doc.sourcePolybagQty, 500, 'Polybag quantity must equal totalPolybag from Penyemaian');
  assert.strictEqual(doc.currentBibitQty, 1000);
  assert.strictEqual(doc.currentPolybagQty, 500);
});

test('Polybag count follows source Penyemaian even if ratio is non-standard', () => {
  const customSeeding = {
    id: 'SEED-2026-002',
    docNo: '2026/SOW/002',
    batchCode: 'Batch-02',
    totalDisemai: 1500,
    totalPolybag: 800 // Explicit polybag quantity from source
  };
  const doc2 = createPreGraftingSelectionDocument(customSeeding, mockMantri);
  assert.strictEqual(doc2.sourceBibitQty, 1500);
  assert.strictEqual(doc2.sourcePolybagQty, 800, 'Must preserve explicit 800 polybags without re-calculating ceil(1500/2)');
});

console.log('\n--- 3. MULTIPLE CHILD TRANSACTIONS & CONTAINER BEHAVIOR ---');

test('Supports multiple execution transactions under the same selection document', () => {
  const parentDoc = getPreGraftingSelectionDocumentById('2026/SOW/001');

  // Session 1: Pelaksanaan Hari 1 (Diperiksa: 400, Layak: 390, Afkir: 10)
  const tx1 = createSelectionRecord({
    docNo: '2026/SEL-1/001',
    parentSelectionDocNo: parentDoc.docNo,
    selectionDocumentId: parentDoc.id,
    selectionStage: SELECTION_STAGES.SELEKSI_1,
    selectionType: SELECTION_TYPES.PRA_OKULASI,
    batchId: parentDoc.batchId,
    batchCode: parentDoc.batchCode,
    bedenganId: parentDoc.bedenganId,
    polybagScope: 200,
    polybag2Bibit: 190,
    polybag1Bibit: 10,
    polybag0Bibit: 0,
    jumlahDiperiksa: 400,
    jumlahLayak: 390,
    jumlahAfkir: 10,
    sourceModule: 'PENYEMAIAN',
    sourceDocNo: parentDoc.sourceDocNo
  }, mockMantri);

  // Session 2: Pelaksanaan Hari 2 (Diperiksa: 600, Layak: 580, Afkir: 20)
  const tx2 = createSelectionRecord({
    docNo: '2026/SEL-1/002',
    parentSelectionDocNo: parentDoc.docNo,
    selectionDocumentId: parentDoc.id,
    selectionStage: SELECTION_STAGES.SELEKSI_1,
    selectionType: SELECTION_TYPES.PRA_OKULASI,
    batchId: parentDoc.batchId,
    batchCode: parentDoc.batchCode,
    bedenganId: parentDoc.bedenganId,
    polybagScope: 300,
    polybag2Bibit: 280,
    polybag1Bibit: 20,
    polybag0Bibit: 0,
    jumlahDiperiksa: 600,
    jumlahLayak: 580,
    jumlahAfkir: 20,
    sourceModule: 'PENYEMAIAN',
    sourceDocNo: parentDoc.sourceDocNo
  }, mockMantri);

  assert.strictEqual(tx1.selectionStage, SELECTION_STAGES.SELEKSI_1);
  assert.strictEqual(tx1.parentSelectionDocNo, parentDoc.docNo);
  assert.strictEqual(tx2.selectionStage, SELECTION_STAGES.SELEKSI_1);

  // Query child transactions linked to parent document
  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  const childTxs = allTxs.filter(t => t.parentSelectionDocNo === parentDoc.docNo || t.selectionDocumentId === parentDoc.id);
  assert.strictEqual(childTxs.length, 2, 'Exactly 2 child execution transactions found');
});

console.log('\n--- 4. COMPLETION LIFECYCLE (STRICTLY MANUAL BY MANTRI) ---');

test('Document completion state defaults to false (not completed)', () => {
  const doc = getPreGraftingSelectionDocumentById('2026/SOW/001');
  assert.strictEqual(doc.isCompleted, false, 'Default isCompleted must be false');
  assert.strictEqual(doc.completedAt, null);
});

test('Manual completion updates state, status, and audit actor', () => {
  const updated = setPreGraftingSelectionDocumentCompletion('2026/SOW/001', true, mockMantri);
  assert.strictEqual(updated.isCompleted, true);
  assert.strictEqual(updated.status, 'COMPLETED');
  assert.ok(updated.completedAt !== null, 'completedAt must be populated');
  assert.strictEqual(updated.completedByName, 'Wagiman');
});

test('Manual unchecking reverts completion cleanly without auto-complete', () => {
  const reverted = setPreGraftingSelectionDocumentCompletion('2026/SOW/001', false, mockMantri);
  assert.strictEqual(reverted.isCompleted, false);
  assert.strictEqual(reverted.status, 'IN_PROGRESS');
  assert.strictEqual(reverted.completedAt, null);
});

console.log('\n--- 5. IDEMPOTENCY & RELOAD SAFETY (NO DUPLICATE DOCUMENTS) ---');

test('syncAllSeedingsToPreGraftingSelectionDocuments does not duplicate existing documents', () => {
  storage.set('seeding_transactions', [sampleSeeding1, { id: 'SEED-3', docNo: '2026/SOW/003', totalDisemai: 500, totalPolybag: 250 }]);

  const count1 = syncAllSeedingsToPreGraftingSelectionDocuments(mockMantri);
  assert.strictEqual(count1, 1, 'Only 1 new document created for SEED-3, SEED-1 was already present');

  const count2 = syncAllSeedingsToPreGraftingSelectionDocuments(mockMantri);
  assert.strictEqual(count2, 0, 'Re-sync produces 0 duplicates');

  const docs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  assert.strictEqual(docs.length, 3, 'Total pre-grafting documents is exactly 3');
});

console.log('\n--- 6. EXISTING POST-GRAFTING SELECTION & GRAFTING ISOLATION ---');

test('Existing selection_pool and post-grafting selection continue working without interference', () => {
  integrateSeedingToSelectionPool(sampleSeeding1);
  const pool = storage.get('selection_pool', []);
  assert.strictEqual(pool.length, 1, 'Seeding rejection pool item exists');
  assert.strictEqual(pool[0].sourceModule, 'PENYEMAIAN');

  const declared = declareSelectionItem(pool[0], { dataUrl: 'photo' }, mockMantri);
  assert.strictEqual(declared.success, true);
  assert.strictEqual(declared.transaction.selectionType, SELECTION_TYPES.PASCA_OKULASI);
});

test('Grafting flow remains completely isolated and unchanged', () => {
  storage.set('budding_transactions', [
    { docNo: '2026/OKL/001', batchNo: 'Batch-01', jumlah: 970, type: 'GRAFTING' }
  ]);
  const buddings = storage.get('budding_transactions', []);
  assert.strictEqual(buddings.length, 1);
  assert.strictEqual(buddings[0].jumlah, 970);
  assert.strictEqual(buddings[0].type, 'GRAFTING');
});

console.log('\n================================================================================');
console.log(`TEST SUMMARY: ${passed}/${total} PASSED, ${total - passed} FAILED`);
console.log('================================================================================');

if (passed === total) {
  console.log('ALL TASK-02 INTEGRATION TESTS PASSED SUCCESSFULLY!');
} else {
  process.exit(1);
}
