/**
 * tests/test-seleksi1-batch-bedengan-scope.js
 * 
 * INTEGRATION TEST SUITE:
 * SELEKSI I BATCH + BEDENGAN SCOPE MIGRATION & EXECUTION ISOLATION
 * 
 * Skenario:
 * IT-BB-001: Batch + BED-001 -> one Selection I
 * IT-BB-002: Batch + BED-002 -> second Selection I
 * IT-BB-003: Same Batch + same Bedengan -> no duplicate document (idempotent)
 * IT-BB-004: Same Batch + different Bedengan -> separate document
 * IT-BB-005: SOW source isolation (BED-001: SOW-001, BED-002: SOW-003, no cross-source contamination)
 * IT-BB-006: Batch population remains canonical (12.900 Pkk)
 * IT-BB-007: Polybag scope per Bedengan (BED-001 != BED-002)
 * IT-BB-008: Execution BED-001 does not affect BED-002
 * IT-BB-009: Execution BED-002 does not affect BED-001
 * IT-BB-010: Repeated execution open does not create duplicate transaction
 * IT-BB-011: Legacy aggregate document split -> two target documents
 * IT-BB-012: Legacy execution transaction re-assignment
 * IT-BB-013: Legacy downstream references remain valid
 * IT-BB-014: Cross-batch isolation
 * IT-BB-015: New Selection I numbering uses SEL
 * IT-BB-016: Legacy CULL/old document not destructively renamed
 * IT-BB-017: No double population count
 * IT-BB-018: No storage mutation during read-only resolver
 */

// Mock in-memory localStorage for isolated test execution
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import assert from 'assert';
import { storage } from '../js/core/storage.js';
import {
  syncBatchPopulationFromSeeding,
  syncAllBatchPopulationsFromSeeding,
  getAvailableQty,
  getBatchInventory,
  resetInventoryToDefault
} from '../js/core/batch-inventory-service.js';
import {
  createPreGraftingSelectionDocument,
  getPreGraftingSelectionDocumentById,
  getPreGraftingSelectionDocuments,
  syncAllSeedingsToPreGraftingSelectionDocuments,
  migrateLegacyAggregateSelection1Documents,
  canCreatePreGraftingSelection1Document,
  createSeleksi1ExecutionTransaction,
  getSeleksi1ExecutionsByDocument,
  getBedenganScopeStatusForSeleksi1,
  validateSeleksi1Execution,
  createSelection2DocumentFromSelection1,
  createSelection3DocumentFromSelection2,
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  SELECTION_STORAGE_KEY,
  SELECTION_STATUS
} from '../js/modules/selection/selection-manager.js';

console.log('======================================================================');
console.log('INTEGRATION TEST: SELEKSI I BATCH + BEDENGAN SCOPE & LEGACY MIGRATION');
console.log('======================================================================\n');

let passCount = 0;
let failCount = 0;

function runTest(testId, description, fn) {
  try {
    console.log(`--- ${testId}: ${description} ---`);
    fn();
    console.log(`  [PASS] ${description}\n`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${err.message}\n`);
    failCount++;
  }
}

const mockMantriUser = {
  id: 'USR-MNT-01',
  userId: 'USR-MNT-01',
  code: 'MNT001',
  name: 'Mantri Ahmad',
  position: 'Mantri Pembibitan',
  role: 'MANTRI_TANAMAN'
};

function resetAllStorage() {
  resetInventoryToDefault();
  store.clear();
  storage.set('seeding_transactions', []);
  storage.set('selection_pool', []);
  storage.set(SELECTION_STORAGE_KEY, []);
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  storage.set('attendance_transactions', [
    {
      id: 'ATT-SUP-01',
      type: 'SUPERVISOR',
      userId: mockMantriUser.id,
      name: mockMantriUser.name,
      role: 'MANTRI_TANAMAN',
      attendanceType: 'DATANG',
      status: 'HADIR',
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString()
    },
    {
      id: 'ATT-WRK-01',
      type: 'WORKER',
      workerId: 'WRK-001',
      workerName: 'Pekerja 1',
      position: 'Pekerja Bibitan',
      attendanceType: 'DATANG',
      status: 'HADIR',
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString()
    }
  ]);
}

// -----------------------------------------------------------------------------
// IT-BB-001: Batch + BED-001 -> one Selection I document
// -----------------------------------------------------------------------------
runTest('IT-BB-001', 'Batch + BED-001 creates exactly one Selection I document', () => {
  resetAllStorage();

  const seedingTx1 = {
    id: 'SOW-TX-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    programCode: 'PRG/NUR/01/2026',
    klon: 'GT 1',
    totalDisemai: 6000,
    totalPolybag: 3000,
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 3000, disemai: 6000 }]
  };
  storage.set('seeding_transactions', [seedingTx1]);
  syncBatchPopulationFromSeeding('BTCH-001');

  const doc1 = createPreGraftingSelectionDocument(seedingTx1, mockMantriUser);
  assert.ok(doc1, 'Document 1 should be created');
  assert.strictEqual(doc1.batchCode, 'BTCH-001');
  assert.strictEqual(doc1.bedenganCode, 'BED-001');
  assert.strictEqual(doc1.sourceSeedingDocNo, '2026/SOW/001');
  assert.strictEqual(doc1.sourcePolybagQty, 3000);
});

// -----------------------------------------------------------------------------
// IT-BB-002: Batch + BED-002 -> second Selection I document
// -----------------------------------------------------------------------------
runTest('IT-BB-002', 'Batch + BED-002 creates second Selection I document', () => {
  resetAllStorage();

  const seedingTx1 = {
    id: 'SOW-TX-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    programCode: 'PRG/NUR/01/2026',
    klon: 'GT 1',
    totalDisemai: 6000,
    totalPolybag: 3000,
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 3000, disemai: 6000 }]
  };
  const seedingTx2 = {
    id: 'SOW-TX-002',
    docNo: '2026/SOW/002',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    programCode: 'PRG/NUR/01/2026',
    klon: 'GT 1',
    totalDisemai: 6900,
    totalPolybag: 3450,
    rows: [{ bedenganId: 'BED-002', bedenganCode: 'BED-002', polybag: 3450, disemai: 6900 }]
  };
  storage.set('seeding_transactions', [seedingTx1, seedingTx2]);
  syncBatchPopulationFromSeeding('BTCH-001');

  const doc1 = createPreGraftingSelectionDocument(seedingTx1, mockMantriUser);
  const doc2 = createPreGraftingSelectionDocument(seedingTx2, mockMantriUser);

  assert.ok(doc1 && doc2, 'Both documents should be created');
  assert.notStrictEqual(doc1.id, doc2.id, 'Document IDs must be distinct');
  assert.notStrictEqual(doc1.docNo, doc2.docNo, 'Document numbers must be distinct');
  assert.strictEqual(doc2.bedenganCode, 'BED-002');
  assert.strictEqual(doc2.sourceSeedingDocNo, '2026/SOW/002');
  assert.strictEqual(doc2.sourcePolybagQty, 3450);

  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  assert.strictEqual(allDocs.length, 2, 'Must have exactly 2 Selection I documents');
});

// -----------------------------------------------------------------------------
// IT-BB-003: Same Batch + same Bedengan -> no duplicate document
// -----------------------------------------------------------------------------
runTest('IT-BB-003', 'Same Batch + same Bedengan repeated creation is idempotent', () => {
  resetAllStorage();

  const seedingTx1 = {
    id: 'SOW-TX-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 3000, disemai: 6000 }]
  };
  storage.set('seeding_transactions', [seedingTx1]);
  syncBatchPopulationFromSeeding('BTCH-001');

  const docFirst = createPreGraftingSelectionDocument(seedingTx1, mockMantriUser);
  const docSecond = createPreGraftingSelectionDocument(seedingTx1, mockMantriUser);

  assert.strictEqual(docFirst.id, docSecond.id, 'Must return same document instance');
  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  assert.strictEqual(allDocs.length, 1, 'No duplicate document created in storage');
});

// -----------------------------------------------------------------------------
// IT-BB-004: Same Batch + different Bedengan -> separate documents
// -----------------------------------------------------------------------------
runTest('IT-BB-004', 'Multi-bedengan in single SOW creates separate documents per bedengan', () => {
  resetAllStorage();

  const seedingMultiBed = {
    id: 'SOW-TX-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    totalDisemai: 12900,
    totalPolybag: 6450,
    rows: [
      { bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 3000, disemai: 6000 },
      { bedenganId: 'BED-002', bedenganCode: 'BED-002', polybag: 3450, disemai: 6900 }
    ]
  };
  storage.set('seeding_transactions', [seedingMultiBed]);
  syncBatchPopulationFromSeeding('BTCH-001');

  createPreGraftingSelectionDocument(seedingMultiBed, mockMantriUser);
  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);

  assert.strictEqual(allDocs.length, 2, 'Must create 2 separate documents for 2 bedengans');
  const docBed1 = allDocs.find(d => d.bedenganCode === 'BED-001');
  const docBed2 = allDocs.find(d => d.bedenganCode === 'BED-002');
  assert.ok(docBed1 && docBed2, 'Both BED-001 and BED-002 documents must exist');
  assert.strictEqual(docBed1.sourcePolybagQty, 3000);
  assert.strictEqual(docBed2.sourcePolybagQty, 3450);
});

// -----------------------------------------------------------------------------
// IT-BB-005: SOW source isolation
// -----------------------------------------------------------------------------
runTest('IT-BB-005', 'SOW source isolation: BED-001: SOW-001, BED-002: SOW-003, no contamination', () => {
  resetAllStorage();

  const sow1 = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 3000, disemai: 6000 }]
  };
  const sow3 = {
    id: 'SOW-003',
    docNo: '2026/SOW/003',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    rows: [{ bedenganId: 'BED-002', bedenganCode: 'BED-002', polybag: 3450, disemai: 6900 }]
  };
  storage.set('seeding_transactions', [sow1, sow3]);
  syncBatchPopulationFromSeeding('BTCH-001');

  const doc1 = createPreGraftingSelectionDocument(sow1, mockMantriUser);
  const doc2 = createPreGraftingSelectionDocument(sow3, mockMantriUser);

  assert.strictEqual(doc1.sourceSeedingDocNo, '2026/SOW/001', 'BED-001 must have SOW-001 source');
  assert.strictEqual(doc2.sourceSeedingDocNo, '2026/SOW/003', 'BED-002 must have SOW-003 source');
  assert.strictEqual(doc1.sourceDocNo, '2026/SOW/001');
  assert.strictEqual(doc2.sourceDocNo, '2026/SOW/003');
});

// -----------------------------------------------------------------------------
// IT-BB-006: Batch population remains canonical
// -----------------------------------------------------------------------------
runTest('IT-BB-006', 'Batch population remains canonical across all bedengan documents', () => {
  resetAllStorage();

  const sow1 = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    totalDisemai: 6000,
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 3000, disemai: 6000 }]
  };
  const sow2 = {
    id: 'SOW-002',
    docNo: '2026/SOW/002',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    totalDisemai: 6900,
    rows: [{ bedenganId: 'BED-002', bedenganCode: 'BED-002', polybag: 3450, disemai: 6900 }]
  };
  storage.set('seeding_transactions', [sow1, sow2]);
  syncBatchPopulationFromSeeding('BTCH-001'); // Total batch population = 12.900

  const doc1 = createPreGraftingSelectionDocument(sow1, mockMantriUser);
  const doc2 = createPreGraftingSelectionDocument(sow2, mockMantriUser);

  assert.strictEqual(doc1.sourceBibitQty, 6000, 'BED-001 sourceBibitQty must reflect Bedengan initial Bibit');
  assert.strictEqual(doc2.sourceBibitQty, 6900, 'BED-002 sourceBibitQty must reflect Bedengan initial Bibit');
  assert.strictEqual(doc1.batchTotalBibit, 12900, 'BED-001 batchTotalBibit must reflect canonical Batch Population');
  assert.strictEqual(doc2.batchTotalBibit, 12900, 'BED-002 batchTotalBibit must reflect canonical Batch Population');
});

// -----------------------------------------------------------------------------
// IT-BB-007: Polybag scope per Bedengan
// -----------------------------------------------------------------------------
runTest('IT-BB-007', 'Polybag scope is isolated per Bedengan (3.000 vs 3.450)', () => {
  resetAllStorage();

  const sow1 = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 3000, disemai: 6000 }]
  };
  const sow2 = {
    id: 'SOW-002',
    docNo: '2026/SOW/002',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    rows: [{ bedenganId: 'BED-002', bedenganCode: 'BED-002', polybag: 3450, disemai: 6900 }]
  };
  storage.set('seeding_transactions', [sow1, sow2]);
  syncBatchPopulationFromSeeding('BTCH-001');

  const doc1 = createPreGraftingSelectionDocument(sow1, mockMantriUser);
  const doc2 = createPreGraftingSelectionDocument(sow2, mockMantriUser);

  assert.strictEqual(doc1.sourcePolybagQty, 3000);
  assert.strictEqual(doc2.sourcePolybagQty, 3450);
});

// -----------------------------------------------------------------------------
// IT-BB-008: Execution BED-001 does not affect BED-002
// -----------------------------------------------------------------------------
runTest('IT-BB-008', 'Execution on BED-001 does not reduce BED-002 remaining polybag', () => {
  resetAllStorage();

  const sow1 = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 3000, disemai: 6000 }]
  };
  const sow2 = {
    id: 'SOW-002',
    docNo: '2026/SOW/002',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    rows: [{ bedenganId: 'BED-002', bedenganCode: 'BED-002', polybag: 3450, disemai: 6900 }]
  };
  storage.set('seeding_transactions', [sow1, sow2]);
  syncBatchPopulationFromSeeding('BTCH-001');

  const doc1 = createPreGraftingSelectionDocument(sow1, mockMantriUser);
  const doc2 = createPreGraftingSelectionDocument(sow2, mockMantriUser);

  // Execute 1.000 polybag on doc1 (BED-001)
  createSeleksi1ExecutionTransaction({
    selectionDocumentId: doc1.id,
    selectionDocNo: doc1.docNo,
    bedenganId: 'BED-001',
    bedenganCode: 'BED-001',
    actualPolybagInspectedQty: 1000,
    actualBibitSelectedQty: 50,
    tanggalSeleksi: '03/10/2026'
  }, mockMantriUser);

  const bed1Scope = getBedenganScopeStatusForSeleksi1(getPreGraftingSelectionDocumentById(doc1.id));
  const bed2Scope = getBedenganScopeStatusForSeleksi1(getPreGraftingSelectionDocumentById(doc2.id));

  assert.strictEqual(bed1Scope[0].remainingPolybag, 2000, 'BED-001 remaining must be 2000');
  assert.strictEqual(bed2Scope[0].remainingPolybag, 3450, 'BED-002 remaining must stay 3450 untouched');
});

// -----------------------------------------------------------------------------
// IT-BB-009: Execution BED-002 does not affect BED-001
// -----------------------------------------------------------------------------
runTest('IT-BB-009', 'Execution on BED-002 does not reduce BED-001 remaining polybag', () => {
  resetAllStorage();

  const sow1 = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 3000, disemai: 6000 }]
  };
  const sow2 = {
    id: 'SOW-002',
    docNo: '2026/SOW/002',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    rows: [{ bedenganId: 'BED-002', bedenganCode: 'BED-002', polybag: 3450, disemai: 6900 }]
  };
  storage.set('seeding_transactions', [sow1, sow2]);
  syncBatchPopulationFromSeeding('BTCH-001');

  const doc1 = createPreGraftingSelectionDocument(sow1, mockMantriUser);
  const doc2 = createPreGraftingSelectionDocument(sow2, mockMantriUser);

  // Execute 500 polybag on doc2 (BED-002)
  createSeleksi1ExecutionTransaction({
    selectionDocumentId: doc2.id,
    selectionDocNo: doc2.docNo,
    bedenganId: 'BED-002',
    bedenganCode: 'BED-002',
    actualPolybagInspectedQty: 500,
    actualBibitSelectedQty: 20,
    tanggalSeleksi: '03/10/2026'
  }, mockMantriUser);

  const bed1Scope = getBedenganScopeStatusForSeleksi1(getPreGraftingSelectionDocumentById(doc1.id));
  const bed2Scope = getBedenganScopeStatusForSeleksi1(getPreGraftingSelectionDocumentById(doc2.id));

  assert.strictEqual(bed1Scope[0].remainingPolybag, 3000, 'BED-001 remaining must stay 3000 untouched');
  assert.strictEqual(bed2Scope[0].remainingPolybag, 2950, 'BED-002 remaining must be 2950');
});

// -----------------------------------------------------------------------------
// IT-BB-010: Repeated execution open does not create duplicate transaction
// -----------------------------------------------------------------------------
runTest('IT-BB-010', 'Opening execution validation does not mutate or duplicate records', () => {
  resetAllStorage();

  const sow1 = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 3000, disemai: 6000 }]
  };
  storage.set('seeding_transactions', [sow1]);
  syncBatchPopulationFromSeeding('BTCH-001');

  const doc1 = createPreGraftingSelectionDocument(sow1, mockMantriUser);
  const txsBefore = storage.get(SELECTION_STORAGE_KEY, []).length;

  // Validation only (e.g. Mantri opening modal and checking remaining quota)
  const val = validateSeleksi1Execution({
    bedenganCode: 'BED-001',
    actualPolybagInspectedQty: 500,
    actualBibitSelectedQty: 10
  }, doc1);

  assert.strictEqual(val.isValid, true);
  const txsAfter = storage.get(SELECTION_STORAGE_KEY, []).length;
  assert.strictEqual(txsBefore, txsAfter, 'Validation must not create transaction records');
});

// -----------------------------------------------------------------------------
// IT-BB-011: Legacy aggregate document split
// -----------------------------------------------------------------------------
runTest('IT-BB-011', 'Legacy aggregate document splits into two target documents', () => {
  resetAllStorage();

  // Create legacy aggregate document
  const legacyDoc = {
    id: 'SEL-LEGACY-001',
    docNo: '2026/CULL/001',
    selectionDocNo: '2026/CULL/001',
    selectionStage: 'SELEKSI_1',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    sourceSeedingDocNos: ['2026/SOW/001', '2026/SOW/003'],
    sourceDocNo: '2026/SOW/001',
    bedenganIds: ['BED-001', 'BED-002'],
    bedengan: 'BED-001, BED-002',
    rows: [
      { bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 3000, disemai: 6000, seedingDocNo: '2026/SOW/001' },
      { bedenganId: 'BED-002', bedenganCode: 'BED-002', polybag: 3450, disemai: 6900, seedingDocNo: '2026/SOW/003' }
    ],
    sourceBibitQty: 12900,
    sourcePolybagQty: 6450,
    status: 'DRAFT'
  };
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [legacyDoc]);

  const res = migrateLegacyAggregateSelection1Documents();
  assert.strictEqual(res.migratedCount, 2, 'Must split into 2 target documents');

  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  assert.strictEqual(allDocs.length, 3, '1 legacy + 2 split docs');

  const split1 = allDocs.find(d => d.bedenganCode === 'BED-001' && d.id !== legacyDoc.id);
  const split2 = allDocs.find(d => d.bedenganCode === 'BED-002' && d.id !== legacyDoc.id);
  assert.ok(split1 && split2, 'Both split target documents exist');
  assert.strictEqual(split1.sourceSeedingDocNo, '2026/SOW/001');
  assert.strictEqual(split2.sourceSeedingDocNo, '2026/SOW/003');
  assert.strictEqual(split1.sourcePolybagQty, 3000);
  assert.strictEqual(split2.sourcePolybagQty, 3450);
});

// -----------------------------------------------------------------------------
// IT-BB-012: Legacy execution transaction re-assignment
// -----------------------------------------------------------------------------
runTest('IT-BB-012', 'Legacy execution transaction re-assignment preserves transaction ID & updates parent', () => {
  resetAllStorage();

  const legacyDoc = {
    id: 'SEL-LEGACY-001',
    docNo: '2026/CULL/001',
    selectionStage: 'SELEKSI_1',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    rows: [
      { bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 3000, disemai: 6000 },
      { bedenganId: 'BED-002', bedenganCode: 'BED-002', polybag: 3450, disemai: 6900 }
    ],
    sourceBibitQty: 12900,
    sourcePolybagQty: 6450
  };
  const legacyTx = {
    id: 'SEL-TX-LEGACY-99',
    docNo: '2026/SEL-I/001',
    selectionStage: 'SELEKSI_1',
    transactionType: 'PELAKSANAAN_SELEKSI_I',
    parentSelectionDocumentId: 'SEL-LEGACY-001',
    parentSelectionDocNo: '2026/CULL/001',
    bedenganCode: 'BED-001',
    actualPolybagInspectedQty: 500,
    actualBibitSelectedQty: 25
  };
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [legacyDoc]);
  storage.set(SELECTION_STORAGE_KEY, [legacyTx]);

  migrateLegacyAggregateSelection1Documents();

  const updatedTxs = storage.get(SELECTION_STORAGE_KEY, []);
  assert.strictEqual(updatedTxs[0].id, 'SEL-TX-LEGACY-99', 'Transaction ID must be preserved');
  assert.notStrictEqual(updatedTxs[0].parentSelectionDocumentId, 'SEL-LEGACY-001', 'Parent ID must be re-assigned');
  assert.strictEqual(updatedTxs[0].bedenganCode, 'BED-001');

  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  const targetDoc = allDocs.find(d => d.id === updatedTxs[0].parentSelectionDocumentId);
  assert.ok(targetDoc, 'Target parent document must exist');
  assert.strictEqual(targetDoc.bedenganCode, 'BED-001');
  assert.strictEqual(targetDoc.totalDiperiksa, 500);
});

// -----------------------------------------------------------------------------
// IT-BB-013: Legacy downstream references remain valid
// -----------------------------------------------------------------------------
runTest('IT-BB-013', 'Legacy downstream Selection II reference re-links cleanly without orphan', () => {
  resetAllStorage();

  const legacyDoc = {
    id: 'SEL-LEGACY-001',
    docNo: '2026/CULL/001',
    selectionStage: 'SELEKSI_1',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    rows: [
      { bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 3000, disemai: 6000 },
      { bedenganId: 'BED-002', bedenganCode: 'BED-002', polybag: 3450, disemai: 6900 }
    ],
    sourceBibitQty: 12900,
    sourcePolybagQty: 6450
  };
  const downstreamSel2 = {
    id: 'SEL2-DOC-001',
    docNo: '2026/SEL-II/001',
    selectionStage: 'SELEKSI_2',
    sourceSelectionDocumentId: 'SEL-LEGACY-001',
    sourceSelectionDocNo: '2026/CULL/001',
    batchId: 'BTCH-001',
    bedenganCode: 'BED-001'
  };
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [legacyDoc, downstreamSel2]);

  migrateLegacyAggregateSelection1Documents();

  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  const updatedSel2 = allDocs.find(d => d.id === 'SEL2-DOC-001');
  const targetSel1 = allDocs.find(d => (d.selectionStage === 'SELEKSI_1' || d.selectionStage === 'SELEKSI_I') && d.bedenganCode === 'BED-001' && d.id !== legacyDoc.id);

  assert.strictEqual(updatedSel2.sourceSelectionDocumentId, targetSel1.id, 'Selection II must link to target split Seleksi I');
  assert.strictEqual(updatedSel2.sourceSelectionDocNo, targetSel1.docNo);
});

// -----------------------------------------------------------------------------
// IT-BB-014: Cross-batch isolation
// -----------------------------------------------------------------------------
runTest('IT-BB-014', 'Cross-batch isolation (BTCH-001 vs BTCH-002)', () => {
  resetAllStorage();

  const sowB1 = {
    id: 'SOW-B1',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 3000, disemai: 6000 }]
  };
  const sowB2 = {
    id: 'SOW-B2',
    docNo: '2026/SOW/002',
    batchId: 'BTCH-002',
    batchCode: 'BTCH-002',
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 5000, disemai: 10000 }]
  };
  storage.set('seeding_transactions', [sowB1, sowB2]);
  syncBatchPopulationFromSeeding('BTCH-001');
  syncBatchPopulationFromSeeding('BTCH-002');

  const docB1 = createPreGraftingSelectionDocument(sowB1, mockMantriUser);
  const docB2 = createPreGraftingSelectionDocument(sowB2, mockMantriUser);

  assert.notStrictEqual(docB1.id, docB2.id, 'Different batches with same bedengan code must have separate docs');
  assert.strictEqual(docB1.batchCode, 'BTCH-001');
  assert.strictEqual(docB2.batchCode, 'BTCH-002');
  assert.strictEqual(docB1.sourcePolybagQty, 3000);
  assert.strictEqual(docB2.sourcePolybagQty, 5000);
});

// -----------------------------------------------------------------------------
// IT-BB-015: New Selection I numbering uses SEL
// -----------------------------------------------------------------------------
runTest('IT-BB-015', 'New Selection I numbering uses format 2026/SEL/xxx', () => {
  resetAllStorage();

  const sow = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 3000, disemai: 6000 }]
  };
  storage.set('seeding_transactions', [sow]);
  syncBatchPopulationFromSeeding('BTCH-001');

  const doc = createPreGraftingSelectionDocument(sow, mockMantriUser);
  assert.match(doc.docNo, /^2026\/SEL\/\d{3}$/, 'Document number must match 2026/SEL/xxx');
});

// -----------------------------------------------------------------------------
// IT-BB-016: Legacy CULL/old document not destructively renamed
// -----------------------------------------------------------------------------
runTest('IT-BB-016', 'Legacy document not destructively renamed or deleted', () => {
  resetAllStorage();

  const legacyDoc = {
    id: 'SEL-LEGACY-ORIGINAL',
    docNo: '2026/CULL/001',
    selectionStage: 'SELEKSI_1',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    rows: [
      { bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 3000, disemai: 6000 },
      { bedenganId: 'BED-002', bedenganCode: 'BED-002', polybag: 3450, disemai: 6900 }
    ],
    sourceBibitQty: 12900,
    sourcePolybagQty: 6450
  };
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [legacyDoc]);

  migrateLegacyAggregateSelection1Documents();

  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  const oldDoc = allDocs.find(d => d.id === 'SEL-LEGACY-ORIGINAL');
  assert.ok(oldDoc, 'Old legacy document must still exist in storage');
  assert.strictEqual(oldDoc.docNo, '2026/CULL/001', 'Old docNo must NOT be renamed');
  assert.strictEqual(oldDoc.isSplit, true, 'Old doc must be flagged as isSplit');
});

// -----------------------------------------------------------------------------
// IT-BB-017: No double population count
// -----------------------------------------------------------------------------
runTest('IT-BB-017', 'Repeated syncAllSeedingsToPreGraftingSelectionDocuments does not double count', () => {
  resetAllStorage();

  const sow1 = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    totalDisemai: 6000,
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 3000, disemai: 6000 }]
  };
  storage.set('seeding_transactions', [sow1]);
  syncBatchPopulationFromSeeding('BTCH-001');

  syncAllSeedingsToPreGraftingSelectionDocuments(mockMantriUser);
  syncAllSeedingsToPreGraftingSelectionDocuments(mockMantriUser);
  syncAllSeedingsToPreGraftingSelectionDocuments(mockMantriUser);

  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  assert.strictEqual(allDocs.length, 1, 'Exactly 1 document must exist');
  assert.strictEqual(allDocs[0].sourceBibitQty, 6000);
  assert.strictEqual(allDocs[0].sourcePolybagQty, 3000);
});

// -----------------------------------------------------------------------------
// IT-BB-018: No storage mutation during read-only resolver
// -----------------------------------------------------------------------------
runTest('IT-BB-018', 'No storage mutation during read-only resolver (getPreGraftingSelectionDocumentById)', () => {
  resetAllStorage();

  const sow1 = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 3000, disemai: 6000 }]
  };
  storage.set('seeding_transactions', [sow1]);
  syncBatchPopulationFromSeeding('BTCH-001');

  const createdDoc = createPreGraftingSelectionDocument(sow1, mockMantriUser);
  const snap1 = JSON.stringify(storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []));

  getPreGraftingSelectionDocumentById(createdDoc.id);
  getPreGraftingSelectionDocumentById('2026/SEL/001');
  getPreGraftingSelectionDocumentById('BTCH-001');
  getPreGraftingSelectionDocuments({});

  const snap2 = JSON.stringify(storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []));
  assert.strictEqual(snap1, snap2, 'Read-only queries must never mutate storage');
});

console.log('======================================================================');
console.log(`SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('======================================================================');

if (failCount > 0) {
  process.exit(1);
}
