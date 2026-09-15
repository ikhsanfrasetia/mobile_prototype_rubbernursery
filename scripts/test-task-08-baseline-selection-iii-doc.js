/**
 * scripts/test-task-08-baseline-selection-iii-doc.js
 * Integration test for TASK-08-BASELINE-SELECTION-III-DOCUMENT-01
 */

// Mock localStorage for Node.js environment
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => store.get(key) || null,
  setItem: (key, val) => store.set(key, String(val)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear()
};

const { storage } = await import('../js/core/storage.js');
const {
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  SELECTION_STORAGE_KEY,
  createPreGraftingSelectionDocument,
  getPreGraftingSelectionDocuments,
  getPreGraftingSelectionDocumentById,
  setPreGraftingSelectionDocumentCompletion,
  submitPreGraftingSelectionDocumentToAsisten,
  approvePreGraftingSelectionDocument,
  returnPreGraftingSelectionDocument,
  createSeleksi1ExecutionTransaction,
  createSeleksi2ExecutionTransaction,
  canCreateSelection2Document,
  createSelection2DocumentFromSelection1,
  canCreateSelection3Document,
  createSelection3DocumentFromSelection2
} = await import('../js/modules/selection/selection-manager.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== START INTEGRATION TEST: TASK-08 SELEKSI III BASELINE DOCUMENT ===');

// Setup mock user
const mantriUser = { id: 'usr-mantri-1', name: 'Mantri Bibitan', role: 'MANTRI_TANAMAN', estateId: 'EST_01', divisionId: 'DIV_01' };
const asbUser = { id: 'usr-asb-1', name: 'Asisten Bibitan', role: 'ASISTEN_BIBITAN', estateId: 'EST_01', divisionId: 'DIV_01' };

// Reset storage for clean test
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
storage.set(SELECTION_STORAGE_KEY, []);

// Step 1: Create Seed Doc & Seleksi I Doc
const seedDoc = {
  docNo: '2026/SDG/001',
  batchId: 'BATCH_001',
  batchCode: 'B-2026-01',
  programId: 'PROG_001',
  programCode: 'PRG-2026',
  estateId: 'EST_01',
  divisionId: 'DIV_01',
  klon: 'PB 260',
  totalBibitSemai: 2000,
  totalPolybag: 1000,
  bedenganIds: ['BED_01', 'BED_02'],
  rows: [
    { bedenganId: 'BED_01', bedenganCode: 'Bed A-01', polybag: 500, disemai: 1000 },
    { bedenganId: 'BED_02', bedenganCode: 'Bed A-02', polybag: 500, disemai: 1000 }
  ]
};

const sel1Doc = createPreGraftingSelectionDocument(seedDoc, mantriUser);

// Create Execution Transaction for Seleksi I
createSeleksi1ExecutionTransaction({
  selectionDocumentId: sel1Doc.id,
  bedenganId: 'BED_01',
  polybagScope: 500,
  bibitAwal: 1000,
  polybag2Bibit: 450,
  polybag1Bibit: 50,
  polybag0Bibit: 0,
  tanggalSeleksi: '2026-09-16'
}, mantriUser);

// Complete, Submit and Approve Seleksi 1 to FINAL
setPreGraftingSelectionDocumentCompletion(sel1Doc.id, true, mantriUser);
submitPreGraftingSelectionDocumentToAsisten(sel1Doc.id, mantriUser);
const approvedSel1 = approvePreGraftingSelectionDocument(sel1Doc.id, 'Approved by ASB', asbUser);

// Step 2: Create Seleksi II Doc
const sel2Doc = createSelection2DocumentFromSelection1(approvedSel1.id, mantriUser);

// Test 2: Gate Check - Seleksi II DRAFT -> Rejected
assert(canCreateSelection3Document(sel2Doc).canCreate === false, 'Test 2A: Seleksi II DRAFT cannot create Seleksi III');
try {
  createSelection3DocumentFromSelection2(sel2Doc.id, mantriUser);
  assert(false, 'Should throw error when creating Seleksi III from DRAFT Seleksi II');
} catch (e) {
  assert(true, 'Test 2B: createSelection3DocumentFromSelection2 thrown error on DRAFT source: ' + e.message);
}

// Create Execution Transaction for Seleksi II
createSeleksi2ExecutionTransaction({
  selectionDocumentId: sel2Doc.id,
  bedenganId: 'BED_01',
  polybagScope: 500,
  sourceBibit: 950,
  polybag2Bibit: 0,
  polybag1Bibit: 480,
  polybag0Bibit: 20,
  tanggalSeleksi: '2026-09-16'
}, mantriUser);

// Test 3: Gate Check - Seleksi II MENUNGGU_VERIFIKASI -> Rejected
setPreGraftingSelectionDocumentCompletion(sel2Doc.id, true, mantriUser);
submitPreGraftingSelectionDocumentToAsisten(sel2Doc.id, mantriUser);

const submittedSel2 = getPreGraftingSelectionDocumentById(sel2Doc.id);
assert(canCreateSelection3Document(submittedSel2).canCreate === false, 'Test 3: Seleksi II MENUNGGU_VERIFIKASI cannot create Seleksi III');

// Test 4: Gate Check - Seleksi II DIKEMBALIKAN -> Rejected
returnPreGraftingSelectionDocument(sel2Doc.id, 'Perbaiki data Seleksi II', asbUser);
const returnedSel2 = getPreGraftingSelectionDocumentById(sel2Doc.id);
assert(canCreateSelection3Document(returnedSel2).canCreate === false, 'Test 4: Seleksi II DIKEMBALIKAN cannot create Seleksi III');

// Re-submit Seleksi II for approval
setPreGraftingSelectionDocumentCompletion(sel2Doc.id, true, mantriUser);
submitPreGraftingSelectionDocumentToAsisten(sel2Doc.id, mantriUser);

// Test 5: Gate Check - Seleksi II DISETUJUI + isFinal=true -> Accepted
const approvedSel2 = approvePreGraftingSelectionDocument(sel2Doc.id, 'Seleksi II Final Approval by ASB', asbUser);
assert(approvedSel2.status === 'DISETUJUI' && approvedSel2.isFinal === true, 'Test 5A: Seleksi II is DISETUJUI and isFinal=true');
assert(canCreateSelection3Document(approvedSel2).canCreate === true, 'Test 5B: canCreateSelection3Document returns canCreate=true for FINAL Seleksi II');

// Step: Create Seleksi III Document
const sel3Doc = createSelection3DocumentFromSelection2(approvedSel2.id, mantriUser);

// Test 1 & 6: Source Seleksi III points to Seleksi II FINAL
assert(sel3Doc.sourceModule === 'SELEKSI', 'Test 6A: sourceModule is SELEKSI');
assert(sel3Doc.sourceSelectionStage === 'SELEKSI_II', 'Test 6B: sourceSelectionStage is SELEKSI_II');
assert(sel3Doc.sourceSelectionType === 'PRA_OKULASI', 'Test 6C: sourceSelectionType is PRA_OKULASI');
assert(sel3Doc.sourceSelectionDocumentId === approvedSel2.id, 'Test 6D: sourceSelectionDocumentId matches Seleksi II id');
assert(sel3Doc.sourceSelectionDocNo === approvedSel2.docNo, 'Test 6E: sourceSelectionDocNo matches Seleksi II docNo');
assert(sel3Doc.sourceDocNo === approvedSel2.docNo, 'Test 6F: sourceDocNo matches Seleksi II docNo');
assert(sel3Doc.sourceFinalStatus === 'DISETUJUI', 'Test 6G: sourceFinalStatus is DISETUJUI');

// Test 7: Source seeding lineage preserved
assert(sel3Doc.sourceSeedingDocNo === '2026/SDG/001', 'Test 7: sourceSeedingDocNo lineage preserved (' + sel3Doc.sourceSeedingDocNo + ')');

// Test 8: Quantity source comes from FINAL Seleksi II
assert(sel3Doc.sourceBibitQty === approvedSel2.totalLayak, 'Test 8A: sourceBibitQty matches Seleksi II final totalLayak (' + sel3Doc.sourceBibitQty + ')');
assert(sel3Doc.sourcePolybagQty === approvedSel2.sourcePolybagQty || sel3Doc.sourcePolybagQty === approvedSel2.currentPolybagQty, 'Test 8B: sourcePolybagQty preserves physical polybags (' + sel3Doc.sourcePolybagQty + ')');

// Test 9 & 10: No raw seeding reading, no polybag recalculation with ceil
assert(sel3Doc.sourceBibitQty !== 2000, 'Test 9: Did NOT read raw seeding bibit (2000)');
assert(sel3Doc.sourcePolybagQty !== Math.ceil(sel3Doc.sourceBibitQty / 2), 'Test 10: Polybags NOT recalculated with ceil(N/2)');

// Test 11: Scope estate/division/batch/bedengan consistent
assert(sel3Doc.batchId === 'BATCH_001' && sel3Doc.batchCode === 'B-2026-01', 'Test 11A: Batch matches');
assert(sel3Doc.programId === 'PROG_001' && sel3Doc.programCode === 'PRG-2026', 'Test 11B: Program matches');
assert(sel3Doc.estateId === 'EST_01' && sel3Doc.divisionId === 'DIV_01', 'Test 11C: Estate & Division match');
assert(Array.isArray(sel3Doc.bedenganIds) && sel3Doc.bedenganIds.length === 2, 'Test 11D: Bedengan scope preserved');

// Test 12: Reload from storage
const reloadedSel3 = getPreGraftingSelectionDocumentById(sel3Doc.id);
assert(reloadedSel3 !== null && reloadedSel3.id === sel3Doc.id, 'Test 12: Seleksi III successfully reloaded from storage');

// Test 13: Idempotency - Trigger ulang returns existing doc without duplicating
const existingAllDocsCount = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []).length;
const duplicateAttempt = createSelection3DocumentFromSelection2(approvedSel2.id, mantriUser);
const afterAllDocsCount = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []).length;
assert(duplicateAttempt.id === sel3Doc.id, 'Test 13A: Idempotent call returns identical document');
assert(existingAllDocsCount === afterAllDocsCount, 'Test 13B: No duplicate document created in storage');

// Test 14, 15, 16: Seleksi I & II & Pasca-Okulasi intact
const allPreDocs = getPreGraftingSelectionDocuments({}, mantriUser);
const s1Count = allPreDocs.filter(d => (d.selectionStage || 'SELEKSI_I') === 'SELEKSI_I' || d.selectionStage === 'SELEKSI_1').length;
const s2Count = allPreDocs.filter(d => d.selectionStage === 'SELEKSI_II' || d.selectionStage === 'SELEKSI_2').length;
const s3Count = allPreDocs.filter(d => d.selectionStage === 'SELEKSI_III' || d.selectionStage === 'SELEKSI_3').length;
assert(s1Count === 1, 'Test 14: Seleksi I document intact');
assert(s2Count === 1, 'Test 15: Seleksi II document intact');
assert(s3Count === 1, 'Test 16A: Seleksi III document created');

// Test 17: Grafting unaffected
assert(sel3Doc.selectionType === 'PRA_OKULASI', 'Test 17: Seleksi III is PRA_OKULASI, does not alter Grafting/Pasca-Okulasi');

// Test 18: Container lifecycle state (no completion/approval)
assert(sel3Doc.isCompleted === false, 'Test 18A: isCompleted is false');
assert(sel3Doc.isFinal === false, 'Test 18B: isFinal is false');
assert(sel3Doc.status === 'DRAFT', 'Test 18C: status is DRAFT');
assert(sel3Doc.executionCount === 0, 'Test 18D: executionCount is 0');
assert(Array.isArray(sel3Doc.executionTransactionIds) && sel3Doc.executionTransactionIds.length === 0, 'Test 18E: executionTransactionIds is empty');

console.log(`\n=== INTEGRATION TEST SUMMARY ===`);
console.log(`Total Passed: ${passed}`);
console.log(`Total Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED SUCCESSFULLY! 🎉');
}
