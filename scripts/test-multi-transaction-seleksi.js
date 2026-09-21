/**
 * scripts/test-multi-transaction-seleksi.js
 * 
 * INTEGRATION TEST SUITE: MICRO-FIX MULTI-TRANSACTION SCOPE SELEKSI PRA-OKULASI I–III
 * Tests: IT-MULTI-01 through IT-MULTI-15
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
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  createPreGraftingSelectionDocument,
  getPreGraftingSelectionDocuments,
  getPreGraftingSelectionDocumentById,
  validatePreGraftingSelectionCompletion,
  setPreGraftingSelectionDocumentCompletion,
  submitPreGraftingSelectionDocumentToAsisten,
  getSeleksi1ExecutionsByDocument,
  getBedenganScopeStatusForSeleksi1,
  validateSeleksi1Execution,
  createSeleksi1ExecutionTransaction,
  deleteSeleksi1ExecutionTransaction,
  getSeleksi2ExecutionsByDocument,
  getBedenganScopeStatusForSeleksi2,
  validateSeleksi2Execution,
  createSeleksi2ExecutionTransaction,
  deleteSeleksi2ExecutionTransaction,
  getSeleksi3Metrics,
  getBedenganScopeStatusForSeleksi3,
  validateSeleksi3Execution,
  createSeleksi3ExecutionTransaction,
  deleteSeleksi3ExecutionTransaction,
  canCreateSelection2Document,
  createSelection2DocumentFromSelection1,
  canCreateSelection3Document,
  createSelection3DocumentFromSelection2,
  approvePreGraftingSelectionDocument
} from '../js/modules/selection/selection-manager.js';

let passed = 0;
let failed = 0;

function runTest(id, name, fn) {
  try {
    fn();
    console.log(`[PASS] ${id} - ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${id} - ${name}`);
    console.error(`       Error: ${err.message}`);
    failed++;
  }
}

const mockMantri = { id: 'MTR-01', name: 'Mantri Tanaman', role: 'MANTRI_TANAMAN', estateId: 'EST-01', divisionId: 'DIV-01' };
const mockAsisten = { id: 'AST-01', name: 'Asisten Bibitan', role: 'ASISTEN_BIBITAN', estateId: 'EST-01', divisionId: 'DIV-01' };

console.log('\n============================================================');
console.log('STARTING INTEGRATION SUITE: MULTI-TRANSACTION SCOPE FIX');
console.log('============================================================\n');

// Clear storage
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
storage.set('selection_transactions', []);

// Create base Seleksi I document: 2.500 Polybag, 5.000 Bibit
const seedDoc1 = {
  id: 'SEED-001',
  docNo: '2026/SDG/001',
  batchId: 'BATCH-TEST-01',
  batchCode: 'BATCH-2026-001',
  programId: 'PROG-01',
  programName: 'Program Replanting 2026',
  estateId: 'EST-01',
  divisionId: 'DIV-01',
  klon: 'GT 1',
  totalPolybag: 2500,
  totalDisemai: 5000,
  rows: [
    { bedenganCode: 'BED-01', polybag: 2500, disemai: 5000 }
  ]
};

const doc1 = createPreGraftingSelectionDocument(seedDoc1, mockMantri);

runTest('IT-MULTI-01', 'Source 2.500 polybag / 5.000 bibit', () => {
  assert.strictEqual(doc1.sourcePolybagQty, 2500);
  assert.strictEqual(doc1.sourceBibitQty, 5000);
  assert.strictEqual(doc1.selectionStage, SELECTION_STAGES.SELEKSI_1);
});

let tx1;
runTest('IT-MULTI-02', 'Tx #1: selected=4.000, retained=4.000 -> diperiksa=4.000, reject=0, sisa=1.000, belum selesai', () => {
  const res = createSeleksi1ExecutionTransaction({
    selectionDocumentId: doc1.id,
    selectionDocNo: doc1.docNo,
    bedenganCode: 'BED-01',
    polybagScope: 2500,
    actualPolybagActiveQty: 2500,
    actualBibitSelectedQty: 4000,
    actualBibitRetainedQty: 4000,
    tanggalSeleksi: '2026-09-21'
  }, mockMantri);

  tx1 = res.transaction;
  assert.strictEqual(tx1.actualBibitSelectedQty, 4000);
  assert.strictEqual(tx1.actualBibitRetainedQty, 4000);
  assert.strictEqual(tx1.bibitReject, 0);

  const updatedDoc = getPreGraftingSelectionDocumentById(doc1.id);
  assert.strictEqual(updatedDoc.totalDiperiksa, 4000);
  assert.strictEqual(updatedDoc.totalLayak, 4000);
  assert.strictEqual(updatedDoc.totalAfkir, 0);
  assert.strictEqual(updatedDoc.sisaBibit, 1000);
  assert.strictEqual(updatedDoc.status, 'IN_PROGRESS');
});

runTest('IT-MULTI-03', 'Checkbox Seleksi Selesai disabled / validate error saat sisa=1.000', () => {
  const val = validatePreGraftingSelectionCompletion(doc1.id);
  assert.strictEqual(val.isValid, false, 'Should not be valid for completion when sisa=1.000');
  assert.ok(val.message.includes('1.000') || val.message.includes('belum selesai'), 'Error should specify uninspected population');

  assert.throws(() => {
    setPreGraftingSelectionDocumentCompletion(doc1.id, true, mockMantri);
  }, /belum selesai diperiksa/, 'Setting completion must throw when sisa > 0');
});

let tx2;
runTest('IT-MULTI-04', 'Tx #2: selected=1.000, retained=800 -> totalDiperiksa=5.000, totalLayak=4.800, totalAfkir=200, sisa=0', () => {
  const res = createSeleksi1ExecutionTransaction({
    selectionDocumentId: doc1.id,
    selectionDocNo: doc1.docNo,
    bedenganCode: 'BED-01',
    polybagScope: 0,
    actualPolybagActiveQty: 0,
    actualBibitSelectedQty: 1000,
    actualBibitRetainedQty: 800,
    tanggalSeleksi: '2026-09-21'
  }, mockMantri);

  tx2 = res.transaction;
  assert.strictEqual(tx2.actualBibitSelectedQty, 1000);
  assert.strictEqual(tx2.actualBibitRetainedQty, 800);
  assert.strictEqual(tx2.bibitReject, 200);

  const updatedDoc = getPreGraftingSelectionDocumentById(doc1.id);
  assert.strictEqual(updatedDoc.totalDiperiksa, 5000);
  assert.strictEqual(updatedDoc.totalLayak, 4800);
  assert.strictEqual(updatedDoc.totalAfkir, 200);
  assert.strictEqual(updatedDoc.sisaBibit, 0);
  assert.strictEqual(updatedDoc.status, 'SIAP_REVIEW');
});

runTest('IT-MULTI-05', 'Dokumen eligible selesai setelah Tx #2', () => {
  const val = validatePreGraftingSelectionCompletion(doc1.id);
  assert.strictEqual(val.isValid, true, 'Must be valid when all 5.000 are inspected');

  const completedDoc = setPreGraftingSelectionDocumentCompletion(doc1.id, true, mockMantri);
  assert.strictEqual(completedDoc.isCompleted, true);

  const submittedDoc = submitPreGraftingSelectionDocumentToAsisten(doc1.id, mockMantri);
  assert.strictEqual(submittedDoc.status, SELECTION_STATUS.MENUNGGU_VERIFIKASI);
});

runTest('IT-MULTI-06', 'Over-selected: transaction selected > remaining -> Expected BLOCK', () => {
  // Create another test document
  const seedTest2 = {
    id: 'SEED-002',
    docNo: '2026/SDG/002',
    batchId: 'BATCH-TEST-02',
    batchCode: 'BATCH-2026-002',
    estateId: 'EST-01',
    divisionId: 'DIV-01',
    totalPolybag: 1000,
    totalDisemai: 2000,
    rows: [{ bedenganCode: 'BED-01', polybag: 1000, disemai: 2000 }]
  };
  const docTest = createPreGraftingSelectionDocument(seedTest2, mockMantri);

  assert.throws(() => {
    createSeleksi1ExecutionTransaction({
      selectionDocumentId: docTest.id,
      selectionDocNo: docTest.docNo,
      bedenganCode: 'BED-01',
      actualPolybagActiveQty: 1000,
      actualBibitSelectedQty: 2500, // Exceeds 2000
      actualBibitRetainedQty: 2000
    }, mockMantri);
  }, /melebihi sisa scope/);
});

runTest('IT-MULTI-07', 'Retained > selected -> Expected BLOCK', () => {
  const seedTest3 = {
    id: 'SEED-003',
    docNo: '2026/SDG/003',
    batchId: 'BATCH-TEST-03',
    batchCode: 'BATCH-2026-003',
    estateId: 'EST-01',
    divisionId: 'DIV-01',
    totalPolybag: 1000,
    totalDisemai: 2000,
    rows: [{ bedenganCode: 'BED-01', polybag: 1000, disemai: 2000 }]
  };
  const docTest = createPreGraftingSelectionDocument(seedTest3, mockMantri);

  assert.throws(() => {
    createSeleksi1ExecutionTransaction({
      selectionDocumentId: docTest.id,
      selectionDocNo: docTest.docNo,
      bedenganCode: 'BED-01',
      actualPolybagActiveQty: 1000,
      actualBibitSelectedQty: 1000,
      actualBibitRetainedQty: 1200 // Exceeds selected (1000)
    }, mockMantri);
  }, /tidak boleh melebihi/);
});

runTest('IT-MULTI-08', 'Partial transaction 3 sesi: 2.000 + 1.500 + 1.500 = 5.000 -> parent totalDiperiksa = 5.000', () => {
  const seedTest4 = {
    id: 'SEED-004',
    docNo: '2026/SDG/004',
    batchId: 'BATCH-TEST-04',
    batchCode: 'BATCH-2026-004',
    estateId: 'EST-01',
    divisionId: 'DIV-01',
    totalPolybag: 2500,
    totalDisemai: 5000,
    rows: [{ bedenganCode: 'BED-01', polybag: 2500, disemai: 5000 }]
  };
  const doc3 = createPreGraftingSelectionDocument(seedTest4, mockMantri);

  createSeleksi1ExecutionTransaction({
    selectionDocumentId: doc3.id,
    selectionDocNo: doc3.docNo,
    bedenganCode: 'BED-01',
    actualPolybagActiveQty: 1000,
    actualBibitSelectedQty: 2000,
    actualBibitRetainedQty: 1900
  }, mockMantri);

  createSeleksi1ExecutionTransaction({
    selectionDocumentId: doc3.id,
    selectionDocNo: doc3.docNo,
    bedenganCode: 'BED-01',
    actualPolybagActiveQty: 750,
    actualBibitSelectedQty: 1500,
    actualBibitRetainedQty: 1400
  }, mockMantri);

  createSeleksi1ExecutionTransaction({
    selectionDocumentId: doc3.id,
    selectionDocNo: doc3.docNo,
    bedenganCode: 'BED-01',
    actualPolybagActiveQty: 750,
    actualBibitSelectedQty: 1500,
    actualBibitRetainedQty: 1450
  }, mockMantri);

  const updatedDoc = getPreGraftingSelectionDocumentById(doc3.id);
  assert.strictEqual(updatedDoc.totalDiperiksa, 5000);
  assert.strictEqual(updatedDoc.totalLayak, 4750);
  assert.strictEqual(updatedDoc.totalAfkir, 250);
  assert.strictEqual(updatedDoc.sisaBibit, 0);
  assert.strictEqual(updatedDoc.status, 'SIAP_REVIEW');
});

runTest('IT-MULTI-09', 'Edit / recreate existing transaction -> parent re-aggregation benar', () => {
  // Test deleting and re-creating a transaction
  const seedTest5 = {
    id: 'SEED-005',
    docNo: '2026/SDG/005',
    batchId: 'BATCH-TEST-05',
    batchCode: 'BATCH-2026-005',
    estateId: 'EST-01',
    divisionId: 'DIV-01',
    totalPolybag: 1000,
    totalDisemai: 2000,
    rows: [{ bedenganCode: 'BED-01', polybag: 1000, disemai: 2000 }]
  };
  const docTest = createPreGraftingSelectionDocument(seedTest5, mockMantri);

  const txA = createSeleksi1ExecutionTransaction({
    selectionDocumentId: docTest.id,
    selectionDocNo: docTest.docNo,
    bedenganCode: 'BED-01',
    actualPolybagActiveQty: 500,
    actualBibitSelectedQty: 1000,
    actualBibitRetainedQty: 900
  }, mockMantri).transaction;

  let d = getPreGraftingSelectionDocumentById(docTest.id);
  assert.strictEqual(d.totalDiperiksa, 1000);

  deleteSeleksi1ExecutionTransaction(txA.id, mockMantri);
  d = getPreGraftingSelectionDocumentById(docTest.id);
  assert.strictEqual(d.totalDiperiksa, 0);
  assert.strictEqual(d.sisaBibit, 2000);
});

runTest('IT-MULTI-10', 'Delete transaction -> remaining scope dihitung ulang', () => {
  const seedTest6 = {
    id: 'SEED-006',
    docNo: '2026/SDG/006',
    batchId: 'BATCH-TEST-06',
    batchCode: 'BATCH-2026-006',
    estateId: 'EST-01',
    divisionId: 'DIV-01',
    totalPolybag: 1000,
    totalDisemai: 2000,
    rows: [{ bedenganCode: 'BED-01', polybag: 1000, disemai: 2000 }]
  };
  const docTest = createPreGraftingSelectionDocument(seedTest6, mockMantri);

  const txA = createSeleksi1ExecutionTransaction({
    selectionDocumentId: docTest.id,
    selectionDocNo: docTest.docNo,
    bedenganCode: 'BED-01',
    actualPolybagActiveQty: 500,
    actualBibitSelectedQty: 1000,
    actualBibitRetainedQty: 900
  }, mockMantri).transaction;

  const scopeBefore = getBedenganScopeStatusForSeleksi1(docTest);
  assert.strictEqual(scopeBefore[0].remainingBibit, 1000);

  deleteSeleksi1ExecutionTransaction(txA.id, mockMantri);

  const scopeAfter = getBedenganScopeStatusForSeleksi1(docTest);
  assert.strictEqual(scopeAfter[0].remainingBibit, 2000);
});

let doc2;
runTest('IT-MULTI-11', 'Seleksi I final -> Seleksi II: sourceBibitQty = totalLayak final Seleksi I', () => {
  // Approve doc1 (4.800 layak)
  const approvedSel1 = approvePreGraftingSelectionDocument(doc1.id, 'Approved Seleksi 1', mockAsisten);

  // Create Seleksi II from Seleksi I
  doc2 = createSelection2DocumentFromSelection1(approvedSel1.id, mockMantri);

  assert.strictEqual(doc2.sourceBibitQty, 4800);
  assert.strictEqual(doc2.sourcePolybagQty, 2500);
});

runTest('IT-MULTI-12', 'Seleksi II multi-session: same partial-scope behavior', () => {
  // Session 1: 3.000 selected / 2.500 retained
  const res1 = createSeleksi2ExecutionTransaction({
    selectionDocumentId: doc2.id,
    selectionDocNo: doc2.docNo,
    bedenganCode: 'BED-01',
    polybagScope: 2500,
    actualPolybagActiveQty: 2500,
    actualBibitSelectedQty: 3000,
    actualBibitRetainedQty: 2500
  }, mockMantri);

  let updatedDoc2 = getPreGraftingSelectionDocumentById(doc2.id);
  assert.strictEqual(updatedDoc2.totalDiperiksa, 3000);
  assert.strictEqual(updatedDoc2.totalLayak, 2500);
  assert.strictEqual(updatedDoc2.totalAfkir, 500);
  assert.strictEqual(updatedDoc2.sisaBibit, 1800); // 4800 - 3000
  assert.strictEqual(updatedDoc2.status, 'IN_PROGRESS');

  // Session 2: 1.800 selected / 1.800 retained
  const res2 = createSeleksi2ExecutionTransaction({
    selectionDocumentId: doc2.id,
    selectionDocNo: doc2.docNo,
    bedenganCode: 'BED-01',
    polybagScope: 0,
    actualPolybagActiveQty: 0,
    actualBibitSelectedQty: 1800,
    actualBibitRetainedQty: 1800
  }, mockMantri);

  updatedDoc2 = getPreGraftingSelectionDocumentById(doc2.id);
  assert.strictEqual(updatedDoc2.totalDiperiksa, 4800);
  assert.strictEqual(updatedDoc2.totalLayak, 4300);
  assert.strictEqual(updatedDoc2.totalAfkir, 500);
  assert.strictEqual(updatedDoc2.sisaBibit, 0);
  assert.strictEqual(updatedDoc2.status, 'SIAP_REVIEW');
});

let doc3;
runTest('IT-MULTI-13', 'Seleksi III multi-session: same partial-scope behavior', () => {
  // Complete, submit, and approve doc2
  setPreGraftingSelectionDocumentCompletion(doc2.id, true, mockMantri);
  submitPreGraftingSelectionDocumentToAsisten(doc2.id, mockMantri);
  const approvedSel2 = approvePreGraftingSelectionDocument(doc2.id, 'Approved Seleksi 2', mockAsisten);

  // Create Seleksi III
  doc3 = createSelection3DocumentFromSelection2(approvedSel2.id, mockMantri);

  // Session 1: 3.000 selected / 2.000 active & retained
  createSeleksi3ExecutionTransaction({
    selectionDocumentId: doc3.id,
    selectionDocNo: doc3.docNo,
    bedenganCode: 'BED-01',
    polybagScope: 2500,
    actualPolybagActiveQty: 2000,
    actualBibitSelectedQty: 3000,
    actualBibitRetainedQty: 2000
  }, mockMantri);

  let updatedDoc3 = getPreGraftingSelectionDocumentById(doc3.id);
  let metrics = getSeleksi3Metrics(updatedDoc3);
  assert.strictEqual(metrics.totalDiperiksa, 3000);
  assert.strictEqual(metrics.totalLayak, 2000);
  assert.strictEqual(metrics.totalAfkir, 1000);
  assert.strictEqual(metrics.sisaBibit, 1300);
  assert.strictEqual(metrics.seleksiValidUntukSelesai, false);

  // Session 2: 1.300 selected / 500 active & retained
  createSeleksi3ExecutionTransaction({
    selectionDocumentId: doc3.id,
    selectionDocNo: doc3.docNo,
    bedenganCode: 'BED-01',
    polybagScope: 500,
    actualPolybagActiveQty: 500,
    actualBibitSelectedQty: 1300,
    actualBibitRetainedQty: 500
  }, mockMantri);

  updatedDoc3 = getPreGraftingSelectionDocumentById(doc3.id);
  metrics = getSeleksi3Metrics(updatedDoc3);
  assert.strictEqual(metrics.totalDiperiksa, 4300);
  assert.strictEqual(metrics.totalLayak, 2500);
  assert.strictEqual(metrics.totalAfkir, 1800);
  assert.strictEqual(metrics.sisaBibit, 0);
  assert.strictEqual(metrics.seleksiValidUntukSelesai, true);
});

runTest('IT-MULTI-14', 'Seleksi III final -> downstream Okulasi membaca finalBibitQty / totalLayak', () => {
  // Mark doc3 completed, submit, and approve
  setPreGraftingSelectionDocumentCompletion(doc3.id, true, mockMantri);
  submitPreGraftingSelectionDocumentToAsisten(doc3.id, mockMantri);
  const approvedSel3 = approvePreGraftingSelectionDocument(doc3.id, 'Approved Seleksi 3', mockAsisten);

  const allSelectionDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  const seleksi3FinalDocs = allSelectionDocs.filter(d => 
    (d.selectionStage === 'SELEKSI_III' || d.selectionStage === 'SELEKSI_3') &&
    d.status === 'DISETUJUI' &&
    Boolean(d.isFinal)
  );
  assert.strictEqual(seleksi3FinalDocs.length, 1);
  const s3Doc = seleksi3FinalDocs[0];
  const populasiBibit = parseInt(
    s3Doc.totalLayak !== undefined
      ? s3Doc.totalLayak
      : (s3Doc.finalBibitQty !== undefined ? s3Doc.finalBibitQty : (s3Doc.currentBibitQty || 0)),
    10
  );
  assert.strictEqual(populasiBibit, 2500);
});

runTest('IT-MULTI-15', 'Legacy transaction fallback reader tetap berjalan', () => {
  const seedLegacy = {
    id: 'SEED-LEGACY-01',
    docNo: '2026/SDG/LEGACY/001',
    batchId: 'BATCH-LEGACY-01',
    batchCode: 'BATCH-2026-LEGACY',
    estateId: 'EST-01',
    divisionId: 'DIV-01',
    totalPolybag: 1000,
    totalDisemai: 2000,
    rows: [{ bedenganCode: 'BED-01', polybag: 1000, disemai: 2000 }]
  };
  const docLegacy = createPreGraftingSelectionDocument(seedLegacy, mockMantri);

  // Directly insert legacy transaction without actualBibitSelectedQty
  const txs = storage.get('selection_transactions', []);
  txs.push({
    id: 'TX-LEGACY-01',
    docNo: 'TX/SEL1/LEGACY/001',
    selectionDocumentId: docLegacy.id,
    selectionStage: SELECTION_STAGES.SELEKSI_1,
    bedenganCode: 'BED-01',
    polybagDiperiksa: 1000,
    bibitAwal: 2000,
    jumlahLayak: 1800,
    jumlahAfkir: 200,
    // Note: no actualBibitSelectedQty or actualBibitRetainedQty
    status: SELECTION_STATUS.DISETUJUI
  });
  storage.set('selection_transactions', txs);

  const scope = getBedenganScopeStatusForSeleksi1(docLegacy);
  assert.strictEqual(scope[0].inspectedBibit, 2000, 'Legacy transaction fallback should read bibitAwal as inspected');
  assert.strictEqual(scope[0].remainingBibit, 0);
});

console.log(`\n------------------------------------------------------------`);
console.log(`INTEGRATION TEST SUMMARY: Passed: ${passed} / Total: ${passed + failed}`);
console.log(`------------------------------------------------------------\n`);

if (failed > 0) {
  process.exit(1);
}
