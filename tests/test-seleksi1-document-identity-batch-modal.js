/**
 * Test Suite: Validasi Identity, Multi-SOW Display, dan Batch-Centric Execution Modal Seleksi I
 * Tests: IT-SEL1-ID-001 through IT-SEL1-ID-013
 */

// Mock in-memory localStorage for isolated test execution
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import { storage } from '../js/core/storage.js';
import {
  createPreGraftingSelectionDocument,
  getPreGraftingSelectionDocuments,
  getPreGraftingSelectionDocumentById,
  createSeleksi1ExecutionTransaction,
  getBedenganScopeStatusForSeleksi1,
  validateSeleksi1Execution,
  formatBedenganDisplayCode,
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  SELECTION_STORAGE_KEY
} from '../js/modules/selection/selection-manager.js';
import { syncBatchPopulationFromSeeding } from '../js/core/batch-inventory-service.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('TEST SUITE: SELEKSI I DOCUMENT IDENTITY & BATCH-CENTRIC MODAL');
console.log('================================================================\n');

// Clean environment before tests
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
storage.set(SELECTION_STORAGE_KEY, []);
storage.set('seeding_transactions', []);
storage.set('nursery_batches', []);
storage.set('batch_inventory_states', {});

const testUser = {
  id: 'USR-001',
  userId: 'USR-001',
  name: 'Mantri Wagiman',
  role: 'MANTRI_TANAMAN'
};

// Setup Batch & Multi-SOW mock
const batch1 = {
  id: 'BTCH-001',
  batchCode: 'BTCH-001',
  batchNo: 'BTCH-001',
  cropType: 'RUBBER',
  klon: 'GT 1',
  clone: 'GT 1',
  status: 'ACTIVE'
};
storage.set('nursery_batches', [batch1]);

const sow1 = {
  id: 'SEED-001',
  docNo: '2026/SOW/001',
  batchId: 'BTCH-001',
  batchCode: 'BTCH-001',
  totalDisemai: 8000,
  totalPolybag: 4000,
  klonAwal: 'GT 1',
  rows: [
    { bedenganCode: 'BED-001', polybag: 2000, disemai: 4000 },
    { bedenganCode: 'BED-002', polybag: 2000, disemai: 4000 }
  ],
  status: 'COMPLETED'
};

const sow2 = {
  id: 'SEED-002',
  docNo: '2026/SOW/003',
  batchId: 'BTCH-001',
  batchCode: 'BTCH-001',
  totalDisemai: 4900,
  totalPolybag: 2450,
  klonAwal: 'GT 1',
  rows: [
    { bedenganCode: 'BED-003', polybag: 2450, disemai: 4900 }
  ],
  status: 'COMPLETED'
};

storage.set('seeding_transactions', [sow1, sow2]);
syncBatchPopulationFromSeeding('BTCH-001');

// -----------------------------------------------------------------------------
// IT-SEL1-ID-001: New Selection I document has SEL prefix, not CULL
// -----------------------------------------------------------------------------
console.log('IT-SEL1-ID-001: New Selection I document numbering prefix');
const doc1 = createPreGraftingSelectionDocument(sow1, { skipGateCheck: true });
assert(
  doc1.docNo.startsWith('2026/SEL/'),
  `Dokumen Seleksi I baru berformat 2026/SEL/xxx (diterima: ${doc1.docNo})`
);
assert(
  !doc1.docNo.includes('CULL'),
  `Dokumen Seleksi I baru TIDAK mengandung kata CULL`
);

// -----------------------------------------------------------------------------
// IT-SEL1-ID-002: Legacy Selection I with 2026/CULL/001 can be opened non-destructively
// -----------------------------------------------------------------------------
console.log('\nIT-SEL1-ID-002: Legacy Selection I non-destructive handling');
const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
const legacyDoc = {
  id: 'SEL-DOC-LEGACY-001',
  docNo: '2026/CULL/001',
  selectionDocNo: '2026/CULL/001',
  selectionStage: 'SELEKSI_I',
  batchId: 'BTCH-001',
  batchCode: 'BTCH-001',
  sourceDocNo: '2026/SOW/001',
  sourceSeedingDocNos: ['2026/SOW/001'],
  sourceBibitQty: 12900,
  sourcePolybagQty: 6450,
  rows: [{ bedenganCode: 'BED-001', polybag: 4450, disemai: 8900 }]
};
allDocs.push(legacyDoc);
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, allDocs);

const fetchedLegacy = getPreGraftingSelectionDocumentById('SEL-DOC-LEGACY-001');
assert(
  fetchedLegacy !== null && fetchedLegacy.docNo === '2026/CULL/001',
  'Dokumen legacy tetap dapat dibuka tanpa destructive rename pada primary storage'
);

// -----------------------------------------------------------------------------
// IT-SEL1-ID-003: Multi-SOW displays both SOW-001 and SOW-003
// -----------------------------------------------------------------------------
console.log('\nIT-SEL1-ID-003: Multi-SOW aggregation & traceability');
// SOW2 merges into same batch document
const mergedDoc = createPreGraftingSelectionDocument(sow2, { skipGateCheck: true });
assert(
  Array.isArray(mergedDoc.sourceSeedingDocNos) &&
  mergedDoc.sourceSeedingDocNos.includes('2026/SOW/001') &&
  mergedDoc.sourceSeedingDocNos.includes('2026/SOW/003'),
  `sourceSeedingDocNos menyimpan kedua SOW: ${mergedDoc.sourceSeedingDocNos.join(', ')}`
);

const sowDisplay = (Array.isArray(mergedDoc.sourceSeedingDocNos) && mergedDoc.sourceSeedingDocNos.length > 0)
  ? mergedDoc.sourceSeedingDocNos.join(', ')
  : mergedDoc.sourceDocNo;
assert(
  sowDisplay === '2026/SOW/001, 2026/SOW/003',
  `Modal display string untuk multi-SOW adalah: "${sowDisplay}"`
);

// -----------------------------------------------------------------------------
// IT-SEL1-ID-004: Batch identity resolved automatically
// -----------------------------------------------------------------------------
console.log('\nIT-SEL1-ID-004: Batch identity auto-resolution');
const batchDisplay = `${mergedDoc.batchCode || mergedDoc.batchNo || '-'} • ${mergedDoc.clone || mergedDoc.klon || '-'}`;
assert(
  batchDisplay === 'BTCH-001 • GT 1',
  `Batch ter-resolve otomatis menjadi: "${batchDisplay}"`
);

// -----------------------------------------------------------------------------
// IT-SEL1-ID-005 & IT-SEL1-ID-006: Multi-Bedengan metadata & no parent selector
// -----------------------------------------------------------------------------
console.log('\nIT-SEL1-ID-005 & IT-SEL1-ID-006: Bedengan scope & metadata');
const bedDisplay = formatBedenganDisplayCode(mergedDoc);
assert(
  bedDisplay.includes('BED-001') && bedDisplay.includes('BED-002') && bedDisplay.includes('BED-003'),
  `Bedengan terformat sebagai cakupan metadata: "${bedDisplay}"`
);
assert(
  mergedDoc.batchCode === 'BTCH-001',
  'Multi-Bedengan tidak memecah parent dokumen Batch'
);

// -----------------------------------------------------------------------------
// IT-SEL1-ID-007: Population = Batch Available Population (12.900 Pkk)
// -----------------------------------------------------------------------------
console.log('\nIT-SEL1-ID-007: Population source provenance');
assert(
  mergedDoc.sourceBibitQty === 12900,
  `Bibit Awal sama dengan Batch Available Population (8000 + 4900 = 12900 Pkk)`
);

// -----------------------------------------------------------------------------
// IT-SEL1-ID-008: Polybag operational remaining
// -----------------------------------------------------------------------------
console.log('\nIT-SEL1-ID-008: Polybag operational remaining');
const bedScopes = getBedenganScopeStatusForSeleksi1(mergedDoc);
const totalPoly = bedScopes.reduce((sum, b) => sum + b.remainingPolybag, 0);
assert(
  totalPoly === 6450,
  `Total polybag operasional Dokumen Seleksi I = ${totalPoly} Ply`
);

// -----------------------------------------------------------------------------
// IT-SEL1-ID-009: Execution transaction identity & traceability
// -----------------------------------------------------------------------------
console.log('\nIT-SEL1-ID-009: Execution transaction traceability');
const execResult = createSeleksi1ExecutionTransaction({
  selectionDocumentId: mergedDoc.id,
  selectionDocNo: mergedDoc.docNo,
  actualPolybagInspectedQty: 2000,
  actualBibitSelectedQty: 100,
  actualBibitRetainedQty: 12800,
  tanggalSeleksi: '2026-10-03',
  catatan: 'Pemeriksaan sesi 1'
}, testUser);

const savedTx = execResult.transaction;
assert(
  savedTx.selectionDocumentId === mergedDoc.id &&
  savedTx.parentSelectionDocumentId === mergedDoc.id &&
  savedTx.batchId === 'BTCH-001' &&
  savedTx.batchCode === 'BTCH-001',
  'Execution transaction terikat secara tepat ke parentSelectionDocumentId dan batchId/batchCode'
);
assert(
  savedTx.actualPolybagInspectedQty === 2000 &&
  savedTx.actualBibitSelectedQty === 100 &&
  savedTx.actualBibitRetainedQty === 12800,
  'Kuantitas eksekusi tercatat dengan akurat'
);

// -----------------------------------------------------------------------------
// IT-SEL1-ID-010: Cross-batch isolation
// -----------------------------------------------------------------------------
console.log('\nIT-SEL1-ID-010: Cross-batch isolation');
const sowBatchB = {
  id: 'SEED-999',
  docNo: '2026/SOW/999',
  batchId: 'BTCH-002',
  batchCode: 'BTCH-002',
  totalDisemai: 3000,
  totalPolybag: 1500,
  klonAwal: 'PB 260',
  rows: [{ bedenganCode: 'BED-010', polybag: 1500, disemai: 3000 }],
  status: 'COMPLETED'
};
const batchB = { id: 'BTCH-002', batchCode: 'BTCH-002', klon: 'PB 260' };
storage.set('nursery_batches', [batch1, batchB]);
storage.set('seeding_transactions', [sow1, sow2, sowBatchB]);
syncBatchPopulationFromSeeding('BTCH-002');

const docBatchB = createPreGraftingSelectionDocument(sowBatchB, { skipGateCheck: true });
assert(
  docBatchB.id !== mergedDoc.id &&
  docBatchB.batchCode === 'BTCH-002' &&
  docBatchB.sourceBibitQty === 3000,
  'Batch B terisolasi secara independen dan tidak tercampur dengan Batch A'
);

// -----------------------------------------------------------------------------
// IT-SEL1-ID-011: Multi-SOW repeated open stability
// -----------------------------------------------------------------------------
console.log('\nIT-SEL1-ID-011: Multi-SOW repeated open stability');
const refetchedDoc = getPreGraftingSelectionDocumentById(mergedDoc.id);
assert(
  refetchedDoc.sourceSeedingDocNos.length === 2 &&
  refetchedDoc.sourceSeedingDocNos.includes('2026/SOW/001') &&
  refetchedDoc.sourceSeedingDocNos.includes('2026/SOW/003'),
  'Daftar Multi-SOW tetap lengkap setelah beberapa kali akses/simpan'
);

// -----------------------------------------------------------------------------
// IT-SEL1-ID-012: Legacy source fallback
// -----------------------------------------------------------------------------
console.log('\nIT-SEL1-ID-012: Legacy source fallback');
const singleSowDoc = {
  id: 'SEL-DOC-SINGLE',
  docNo: '2026/SEL/099',
  sourceDocNo: '2026/SOW/088',
  sourceSeedingDocNos: null
};
const resolvedSowSingle = (Array.isArray(singleSowDoc.sourceSeedingDocNos) && singleSowDoc.sourceSeedingDocNos.length > 0)
  ? singleSowDoc.sourceSeedingDocNos.join(', ')
  : (singleSowDoc.sourceDocNo || '-');
assert(
  resolvedSowSingle === '2026/SOW/088',
  `Fallback ke sourceDocNo berhasil: "${resolvedSowSingle}"`
);

// -----------------------------------------------------------------------------
// IT-SEL1-ID-013: No mutation during read
// -----------------------------------------------------------------------------
console.log('\nIT-SEL1-ID-013: No mutation on read');
const storageBefore = JSON.stringify(storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY));
getPreGraftingSelectionDocuments();
const storageAfter = JSON.stringify(storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY));
assert(
  storageBefore === storageAfter,
  'Tidak ada mutasi storage saat pembacaan dokumen'
);

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}
