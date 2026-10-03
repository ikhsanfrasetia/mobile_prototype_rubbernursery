/**
 * tests/test-batch-centric-seleksi-downstream.js
 * 
 * INTEGRATION TEST SUITE:
 * BATCH-CENTRIC SELEKSI PRA-OKULASI I & BATCH POPULATION RESOLVER
 * 
 * Skenario:
 * IT-BATCH-CENTRIC-001: SOW-001 -> BTCH-001 -> 1.000 Pokok -> Selection I Batch population = 1.000
 * IT-BATCH-CENTRIC-002: SOW-001 (1.000) & SOW-002 (2.000) -> BTCH-001 -> ONE canonical Selection I doc, population = 3.000
 * IT-BATCH-CENTRIC-003: Repeated sync -> Tidak membuat Selection I duplicate
 * IT-BATCH-CENTRIC-004: Batch has BED-001, BED-002, BED-003 -> ONE Selection I parent, bedengan in rows/metadata
 * IT-BATCH-CENTRIC-005: Execution BED-001 -> tx memiliki batchId/batchCode
 * IT-BATCH-CENTRIC-006: Execution BED-002 -> tx tetap parent ke Batch yang sama
 * IT-BATCH-CENTRIC-007: Batch population: 3.000, Execution: 1.000 -> Remaining: 2.000
 * IT-BATCH-CENTRIC-008: CULL approved: 500, Batch: 3.000 -> Selection I available population: 2.500
 * IT-BATCH-CENTRIC-009: CULL pending: 500, Batch: 3.000 -> Selection I available population: 3.000
 * IT-BATCH-CENTRIC-010: Cross-batch isolation (BTCH-001 = 3.000, BTCH-002 = 5.000) -> Tidak tercampur
 * IT-BATCH-CENTRIC-011: Existing legacy Selection I per-SOW -> tidak membuat duplicate baru saat lookup/sync
 * IT-BATCH-CENTRIC-012: Batch + multi-SOW repeated sync -> population tidak double count
 * IT-BATCH-CENTRIC-013: Downstream Selection II -> batchId/batchCode diwariskan
 * IT-BATCH-CENTRIC-014: Downstream Selection III -> batchId/batchCode diwariskan
 * IT-BATCH-CENTRIC-015: No mutation safety pada read-only resolver checks
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
  syncAllSeedingsToPreGraftingSelectionDocuments,
  canCreatePreGraftingSelection1Document,
  createSeleksi1ExecutionTransaction,
  getSeleksi1ExecutionsByDocument,
  getBedenganScopeStatusForSeleksi1,
  createSelection2DocumentFromSelection1,
  createSelection3DocumentFromSelection2,
  approveSelectionRecord,
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  SELECTION_STORAGE_KEY,
  SELECTION_STATUS
} from '../js/modules/selection/selection-manager.js';

console.log('======================================================================');
console.log('INTEGRATION TEST: BATCH-CENTRIC SELEKSI PRA-OKULASI I & DOWNSTREAM');
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

const mockAsistenUser = {
  id: 'USR-ASB-01',
  userId: 'USR-ASB-01',
  code: 'ASB001',
  name: 'Budi Santoso',
  position: 'Asisten Pembibitan',
  role: 'ASISTEN_BIBITAN'
};

function resetAllStorage() {
  resetInventoryToDefault();
  store.clear();
  storage.set('seeding_transactions', []);
  storage.set('selection_transactions', []);
  storage.set('selection_pool', []);
  storage.set('pre_grafting_selection_documents', []);
  storage.set('nursery_batches', [
    {
      id: 'BTCH-001',
      batchId: 'BTCH-001',
      batchCode: 'BTCH-001',
      batchNo: 'BTCH-001',
      programId: 'PRG-2026-001',
      programCode: 'PRG/NUR/01/2026',
      programName: 'Main Nursery Program 2026',
      availableQty: 0
    },
    {
      id: 'BTCH-002',
      batchId: 'BTCH-002',
      batchCode: 'BTCH-002',
      batchNo: 'BTCH-002',
      programId: 'PRG-2026-001',
      programCode: 'PRG/NUR/01/2026',
      programName: 'Main Nursery Program 2026',
      availableQty: 0
    }
  ]);
}

// -----------------------------------------------------------------------------
// IT-BATCH-CENTRIC-001: SOW-001 -> BTCH-001 -> 1.000
// -----------------------------------------------------------------------------
runTest('IT-BATCH-CENTRIC-001', 'SOW-001 -> BTCH-001 -> 1.000 Pokok -> Selection I Batch population = 1.000', () => {
  resetAllStorage();

  const sow1 = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    batchNo: 'BTCH-001',
    totalDisemai: 1000,
    totalPolybag: 500,
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 500, disemai: 1000 }]
  };
  storage.set('seeding_transactions', [sow1]);

  const doc = createPreGraftingSelectionDocument(sow1, mockMantriUser);
  assert.strictEqual(doc.batchId, 'BTCH-001');
  assert.strictEqual(doc.batchCode, 'BTCH-001');
  assert.strictEqual(doc.sourceBibitQty, 1000, 'Populasi Selection I harus 1.000 Pokok');
  assert.strictEqual(doc.sourcePolybagQty, 500, 'Populasi Polybag harus 500');
});

// -----------------------------------------------------------------------------
// IT-BATCH-CENTRIC-002: SOW-001 (1.000) & SOW-002 (2.000) -> BTCH-001
// -----------------------------------------------------------------------------
runTest('IT-BATCH-CENTRIC-002', 'SOW-001 (1.000) & SOW-002 (2.000) -> ONE canonical Selection I doc, population = 3.000', () => {
  resetAllStorage();

  const sow1 = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    batchNo: 'BTCH-001',
    totalDisemai: 1000,
    totalPolybag: 500,
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 500, disemai: 1000 }]
  };
  const sow2 = {
    id: 'SOW-002',
    docNo: '2026/SOW/002',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    batchNo: 'BTCH-001',
    totalDisemai: 2000,
    totalPolybag: 1000,
    rows: [{ bedenganId: 'BED-002', bedenganCode: 'BED-002', polybag: 1000, disemai: 2000 }]
  };
  storage.set('seeding_transactions', [sow1, sow2]);

  const doc1 = createPreGraftingSelectionDocument(sow1, mockMantriUser);
  const doc2 = createPreGraftingSelectionDocument(sow2, mockMantriUser);

  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  assert.strictEqual(allDocs.length, 1, 'Hanya ada SATU Dokumen Seleksi I untuk BTCH-001');
  assert.strictEqual(doc1.id, doc2.id, 'Kedua SOW mengembalikan Dokumen Seleksi I yang sama');
  assert.strictEqual(doc2.sourceBibitQty, 3000, 'Populasi agregat batch harus 3.000 Pokok');
  assert.strictEqual(doc2.sourcePolybagQty, 1500, 'Populasi agregat polybag harus 1.500');
  assert(Array.isArray(doc2.sourceSeedingDocNos), 'sourceSeedingDocNos harus berupa array');
  assert(doc2.sourceSeedingDocNos.includes('2026/SOW/001') && doc2.sourceSeedingDocNos.includes('2026/SOW/002'), 'Memuat kedua dokumen SOW');
});

// -----------------------------------------------------------------------------
// IT-BATCH-CENTRIC-003: Repeated sync
// -----------------------------------------------------------------------------
runTest('IT-BATCH-CENTRIC-003', 'Repeated sync -> Tidak membuat Selection I duplicate', () => {
  resetAllStorage();

  const sow1 = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    batchNo: 'BTCH-001',
    totalDisemai: 1000,
    totalPolybag: 500
  };
  storage.set('seeding_transactions', [sow1]);

  syncAllSeedingsToPreGraftingSelectionDocuments(mockMantriUser);
  syncAllSeedingsToPreGraftingSelectionDocuments(mockMantriUser);
  syncAllSeedingsToPreGraftingSelectionDocuments(mockMantriUser);

  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  assert.strictEqual(allDocs.length, 1, 'Sync berulang kali menghasilkan tepat 1 dokumen');
});

// -----------------------------------------------------------------------------
// IT-BATCH-CENTRIC-004: Batch has BED-001, BED-002, BED-003
// -----------------------------------------------------------------------------
runTest('IT-BATCH-CENTRIC-004', 'Batch has BED-001, BED-002, BED-003 -> ONE Selection I parent, bedengan in rows/metadata', () => {
  resetAllStorage();

  const sow1 = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    batchNo: 'BTCH-001',
    totalDisemai: 3000,
    totalPolybag: 1500,
    rows: [
      { bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 500, disemai: 1000 },
      { bedenganId: 'BED-002', bedenganCode: 'BED-002', polybag: 500, disemai: 1000 },
      { bedenganId: 'BED-003', bedenganCode: 'BED-003', polybag: 500, disemai: 1000 }
    ]
  };
  storage.set('seeding_transactions', [sow1]);

  const doc = createPreGraftingSelectionDocument(sow1, mockMantriUser);
  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  assert.strictEqual(allDocs.length, 1, 'Hanya 1 parent document');
  assert.strictEqual(doc.rows.length, 3, 'Memuat 3 baris bedengan');
  assert.strictEqual(doc.sourceBibitQty, 3000);
});

// -----------------------------------------------------------------------------
// IT-BATCH-CENTRIC-005: Execution BED-001
// -----------------------------------------------------------------------------
runTest('IT-BATCH-CENTRIC-005', 'Execution BED-001 -> tx memiliki batchId/batchCode', () => {
  resetAllStorage();

  const sow1 = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    batchNo: 'BTCH-001',
    totalDisemai: 3000,
    totalPolybag: 1500,
    rows: [
      { bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 500, disemai: 1000 },
      { bedenganId: 'BED-002', bedenganCode: 'BED-002', polybag: 500, disemai: 1000 },
      { bedenganId: 'BED-003', bedenganCode: 'BED-003', polybag: 500, disemai: 1000 }
    ]
  };
  storage.set('seeding_transactions', [sow1]);
  const doc = createPreGraftingSelectionDocument(sow1, mockMantriUser);

  const res1 = createSeleksi1ExecutionTransaction({
    selectionDocumentId: doc.id,
    bedenganCode: 'BED-001',
    bedenganId: 'BED-001',
    actualPolybagInspectedQty: 500,
    actualBibitSelectedQty: 1000,
    actualBibitRetainedQty: 900
  }, mockMantriUser);

  const tx1 = res1.transaction;
  assert.strictEqual(tx1.batchId, 'BTCH-001');
  assert.strictEqual(tx1.batchCode, 'BTCH-001');
  assert.strictEqual(tx1.bedenganCode, 'BED-001');
  assert.strictEqual(tx1.parentSelectionDocumentId, doc.id);
});

// -----------------------------------------------------------------------------
// IT-BATCH-CENTRIC-006: Execution BED-002
// -----------------------------------------------------------------------------
runTest('IT-BATCH-CENTRIC-006', 'Execution BED-002 -> tx tetap parent ke Batch yang sama', () => {
  // Melanjutkan state dari test sebelumnya
  const doc = getPreGraftingSelectionDocumentById('BTCH-001');
  const res2 = createSeleksi1ExecutionTransaction({
    selectionDocumentId: doc.id,
    bedenganCode: 'BED-002',
    bedenganId: 'BED-002',
    actualPolybagInspectedQty: 500,
    actualBibitSelectedQty: 1000,
    actualBibitRetainedQty: 850
  }, mockMantriUser);

  const tx2 = res2.transaction;
  assert.strictEqual(tx2.batchId, 'BTCH-001');
  assert.strictEqual(tx2.batchCode, 'BTCH-001');
  assert.strictEqual(tx2.bedenganCode, 'BED-002');
  assert.strictEqual(tx2.parentSelectionDocumentId, doc.id);
});

// -----------------------------------------------------------------------------
// IT-BATCH-CENTRIC-007: Batch population: 3.000, Execution: 1.000 -> Remaining: 2.000
// -----------------------------------------------------------------------------
runTest('IT-BATCH-CENTRIC-007', 'Batch population: 3.000, Execution: 1.000 -> Remaining: 2.000', () => {
  resetAllStorage();

  const sow1 = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    batchNo: 'BTCH-001',
    totalDisemai: 3000,
    totalPolybag: 1500,
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 1500, disemai: 3000 }]
  };
  storage.set('seeding_transactions', [sow1]);
  const doc = createPreGraftingSelectionDocument(sow1, mockMantriUser);

  createSeleksi1ExecutionTransaction({
    selectionDocumentId: doc.id,
    bedenganCode: 'BED-001',
    bedenganId: 'BED-001',
    actualPolybagInspectedQty: 500,
    actualBibitSelectedQty: 1000,
    actualBibitRetainedQty: 900
  }, mockMantriUser);

  const bedScope = getBedenganScopeStatusForSeleksi1(doc);
  assert.strictEqual(bedScope[0].inspectedBibit, 1000);
  assert.strictEqual(bedScope[0].remainingBibit, 2000, 'Sisa populasi bibit bedengan harus 2.000');
  assert.strictEqual(bedScope[0].remainingPolybag, 1000, 'Sisa polybag harus 1.000');
});

// -----------------------------------------------------------------------------
// IT-BATCH-CENTRIC-008: CULL approved: 500, Batch: 3.000
// -----------------------------------------------------------------------------
runTest('IT-BATCH-CENTRIC-008', 'CULL approved: 500, Batch: 3.000 -> Selection I available population: 2.500', () => {
  resetAllStorage();

  const sow1 = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    batchNo: 'BTCH-001',
    totalDisemai: 3000,
    totalPolybag: 1500
  };
  storage.set('seeding_transactions', [sow1]);

  const cull1 = {
    id: 'CULL-001',
    docNo: '2026/CULL/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    sourceDocNo: '2026/SOW/001',
    originType: 'REJECT_PENYEMAIAN',
    status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
    jumlahAfkir: 500,
    stockMutationStatus: 'PENDING'
  };
  storage.set('selection_transactions', [cull1]);

  // Approve CULL
  approveSelectionRecord('CULL-001', 'Approved', mockAsistenUser, true);

  // Sync / Create Seleksi I
  const doc = createPreGraftingSelectionDocument(sow1, mockMantriUser);
  assert.strictEqual(doc.sourceBibitQty, 2500, 'Selection I available population harus berkurang menjadi 2.500');
});

// -----------------------------------------------------------------------------
// IT-BATCH-CENTRIC-009: CULL pending: 500, Batch: 3.000
// -----------------------------------------------------------------------------
runTest('IT-BATCH-CENTRIC-009', 'CULL pending: 500, Batch: 3.000 -> Selection I available population: 3.000', () => {
  resetAllStorage();

  const sow1 = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    batchNo: 'BTCH-001',
    totalDisemai: 3000,
    totalPolybag: 1500
  };
  storage.set('seeding_transactions', [sow1]);

  const cullPending = {
    id: 'CULL-002',
    docNo: '2026/CULL/002',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    sourceDocNo: '2026/SOW/001',
    originType: 'REJECT_PENYEMAIAN',
    status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
    jumlahAfkir: 500,
    stockMutationStatus: 'PENDING'
  };
  storage.set('selection_transactions', [cullPending]);

  // Cek gate: CULL pending blocks creation under strict gate, but if checked via inventory:
  const inv = syncBatchPopulationFromSeeding('BTCH-001');
  assert.strictEqual(inv.availableQty, 3000, 'Batch available population tetap 3.000 sebelum CULL disetujui');
});

// -----------------------------------------------------------------------------
// IT-BATCH-CENTRIC-010: Cross-batch isolation
// -----------------------------------------------------------------------------
runTest('IT-BATCH-CENTRIC-010', 'Cross-batch: BTCH-001 = 3.000, BTCH-002 = 5.000 -> Tidak tercampur', () => {
  resetAllStorage();

  const sow1 = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    totalDisemai: 3000,
    totalPolybag: 1500
  };
  const sow2 = {
    id: 'SOW-002',
    docNo: '2026/SOW/002',
    batchId: 'BTCH-002',
    batchCode: 'BTCH-002',
    totalDisemai: 5000,
    totalPolybag: 2500
  };
  storage.set('seeding_transactions', [sow1, sow2]);

  const doc1 = createPreGraftingSelectionDocument(sow1, mockMantriUser);
  const doc2 = createPreGraftingSelectionDocument(sow2, mockMantriUser);

  assert.strictEqual(doc1.sourceBibitQty, 3000);
  assert.strictEqual(doc2.sourceBibitQty, 5000);
  assert.notStrictEqual(doc1.id, doc2.id);
});

// -----------------------------------------------------------------------------
// IT-BATCH-CENTRIC-011: Existing legacy Selection I per-SOW
// -----------------------------------------------------------------------------
runTest('IT-BATCH-CENTRIC-011', 'Existing legacy Selection I per-SOW -> tidak membuat duplicate baru saat lookup/sync', () => {
  resetAllStorage();

  const legacyDoc = {
    id: 'SEL-DOC-LEGACY-01',
    docNo: '2026/SEL/001',
    selectionStage: 'SELEKSI_I',
    sourceSeedingDocNo: '2026/SOW/001',
    sourceDocNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    sourceBibitQty: 1000,
    sourcePolybagQty: 500
  };
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [legacyDoc]);

  const sow1 = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    totalDisemai: 1000,
    totalPolybag: 500
  };
  storage.set('seeding_transactions', [sow1]);

  const resolved = createPreGraftingSelectionDocument(sow1, mockMantriUser);
  assert.strictEqual(resolved.id, 'SEL-DOC-LEGACY-01', 'Menggunakan existing legacy document');
  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  assert.strictEqual(allDocs.length, 1, 'Tidak ada dokumen duplikat');
});

// -----------------------------------------------------------------------------
// IT-BATCH-CENTRIC-012: Batch + multi-SOW repeated sync -> population does not double count
// -----------------------------------------------------------------------------
runTest('IT-BATCH-CENTRIC-012', 'Batch + multi-SOW repeated sync -> population tidak double count', () => {
  resetAllStorage();

  const sow1 = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    totalDisemai: 1000,
    totalPolybag: 500
  };
  const sow2 = {
    id: 'SOW-002',
    docNo: '2026/SOW/002',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    totalDisemai: 2000,
    totalPolybag: 1000
  };
  storage.set('seeding_transactions', [sow1, sow2]);

  syncAllSeedingsToPreGraftingSelectionDocuments(mockMantriUser);
  syncAllSeedingsToPreGraftingSelectionDocuments(mockMantriUser);

  const doc = getPreGraftingSelectionDocumentById('BTCH-001');
  assert.strictEqual(doc.sourceBibitQty, 3000, 'Populasi tetap 3.000 tanpa double count');
});

// -----------------------------------------------------------------------------
// IT-BATCH-CENTRIC-013: Downstream Selection II -> batchId/batchCode diwariskan
// -----------------------------------------------------------------------------
runTest('IT-BATCH-CENTRIC-013', 'Downstream Selection II -> batchId/batchCode diwariskan', () => {
  resetAllStorage();

  const sel1Doc = {
    id: 'SEL1-DOC-01',
    docNo: '2026/SEL/001',
    selectionStage: 'SELEKSI_I',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    batchNo: 'BTCH-001',
    status: 'DISETUJUI',
    isFinal: true,
    totalLayak: 2800,
    activePolybagQty: 1400,
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 1400, disemai: 2800 }]
  };
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [sel1Doc]);

  const sel2Doc = createSelection2DocumentFromSelection1(sel1Doc.id, mockMantriUser);
  assert.strictEqual(sel2Doc.batchId, 'BTCH-001');
  assert.strictEqual(sel2Doc.batchCode, 'BTCH-001');
  assert.strictEqual(sel2Doc.sourceBibitQty, 2800);
});

// -----------------------------------------------------------------------------
// IT-BATCH-CENTRIC-014: Downstream Selection III -> batchId/batchCode diwariskan
// -----------------------------------------------------------------------------
runTest('IT-BATCH-CENTRIC-014', 'Downstream Selection III -> batchId/batchCode diwariskan', () => {
  const sel2Doc = {
    id: 'SEL2-DOC-01',
    docNo: '2026/SEL-II/001',
    selectionStage: 'SELEKSI_II',
    batchId: 'BTCH-001',
    batchCode: 'BTCH-001',
    batchNo: 'BTCH-001',
    status: 'DISETUJUI',
    isFinal: true,
    totalLayak: 2600,
    activePolybagQty: 1300,
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 1300, disemai: 2600 }]
  };
  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  allDocs.push(sel2Doc);
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, allDocs);

  const sel3Doc = createSelection3DocumentFromSelection2(sel2Doc.id, mockMantriUser);
  assert.strictEqual(sel3Doc.batchId, 'BTCH-001');
  assert.strictEqual(sel3Doc.batchCode, 'BTCH-001');
  assert.strictEqual(sel3Doc.sourceBibitQty, 2600);
});

// -----------------------------------------------------------------------------
// IT-BATCH-CENTRIC-015: No mutation safety
// -----------------------------------------------------------------------------
runTest('IT-BATCH-CENTRIC-015', 'No mutation safety pada read-only resolver checks', () => {
  const beforeState = JSON.stringify(storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []));
  getPreGraftingSelectionDocumentById('BTCH-001');
  getPreGraftingSelectionDocumentById('2026/SEL/001');
  canCreatePreGraftingSelection1Document('BTCH-001');
  const afterState = JSON.stringify(storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []));

  assert.strictEqual(beforeState, afterState, 'Storage state tidak berubah pada operasi read-only');
});

console.log('======================================================================');
console.log(`TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED (TOTAL ${passCount + failCount})`);
console.log('======================================================================\n');

if (failCount > 0) {
  process.exit(1);
}
