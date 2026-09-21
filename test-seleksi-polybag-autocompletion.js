/**
 * test-seleksi-polybag-autocompletion.js
 * Integration test suite for Seleksi Pra-Okulasi I, II, and III Logic & Field Revision
 * Covering TEST 01 through TEST 14.
 */

// Setup Mock Environment for Node.js
const storageMap = new Map();
globalThis.localStorage = {
  getItem: (k) => storageMap.has(k) ? storageMap.get(k) : null,
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear()
};

import { storage } from './js/core/storage.js';
import {
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  SELECTION_STORAGE_KEY,
  SELECTION_STAGES,
  getPreGraftingSelectionDocumentById,
  validateSeleksi1Execution,
  createSeleksi1ExecutionTransaction,
  deleteSeleksi1ExecutionTransaction,
  validateSeleksi2Execution,
  createSeleksi2ExecutionTransaction,
  deleteSeleksi2ExecutionTransaction,
  validateSeleksi3Execution,
  createSeleksi3ExecutionTransaction,
  updateSeleksi3ExecutionTransaction,
  deleteSeleksi3ExecutionTransaction,
  getSeleksi3Metrics,
  getBedenganScopeStatusForSeleksi1
} from './js/modules/selection/selection-manager.js';
import fs from 'fs';

const results = [];

function assert(id, desc, condition, detail = '') {
  const status = condition ? 'PASS' : 'FAIL';
  results.push({ id, desc, status, detail });
  console.log(`[${status}] ${id}: ${desc} ${detail ? '-> ' + detail : ''}`);
  if (!condition) {
    console.error(`  FAIL DETAIL: ${detail}`);
  }
}

console.log('============================================================');
console.log('INTEGRATION TEST: SELEKSI I-III LOGIC & FIELD REVISION');
console.log('============================================================\n');

const mockUser = {
  userId: 'USR-MANTRI-01',
  code: 'USR-MANTRI-01',
  name: 'Mantri Test',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TEST',
  divisionId: 'DIV-TEST'
};

// ============================================================
// TEST 01: Seleksi I 2 Transaksi Kumulatif & Auto-Completion
// ============================================================
globalThis.localStorage.clear();
const docSel1 = {
  id: 'DOC-SEL1-001',
  docNo: 'SEL1/TEST/2026/001',
  sourceType: 'SEEDING',
  sourceDocNo: 'SD-TEST-001',
  selectionStage: SELECTION_STAGES.SELEKSI_1,
  stage: 'SELEKSI_I',
  sourcePolybagQty: 2500,
  sourceBibitQty: 5000,
  initialPolybagQty: 2500,
  initialBibitQty: 5000,
  totalPolybagDiperiksa: 0,
  totalBibitDiperiksa: 0,
  totalBibitSelectedQty: 0,
  totalBibitRetainedQty: 5000,
  progress: 0,
  status: 'IN_PROGRESS',
  isCompleted: false,
  bedenganIds: ['BED-01'],
  rows: [{ bedenganId: 'BED-01', bedenganCode: 'BED-01', polybag: 2500, disemai: 5000 }]
};
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [docSel1]);

// TX1: Polybag = 1000, Bibit Diseleksi = 100
createSeleksi1ExecutionTransaction({
  selectionDocumentId: docSel1.id,
  bedenganCode: 'BED-01',
  actualPolybagInspectedQty: 1000,
  actualBibitSelectedQty: 100,
  executionDate: '2026-09-20'
}, mockUser);

// TX2: Polybag = 1500, Bibit Diseleksi = 200
createSeleksi1ExecutionTransaction({
  selectionDocumentId: docSel1.id,
  bedenganCode: 'BED-01',
  actualPolybagInspectedQty: 1500,
  actualBibitSelectedQty: 200,
  executionDate: '2026-09-21'
}, mockUser);

const updatedDoc1 = getPreGraftingSelectionDocumentById(docSel1.id);
assert(
  'TEST 01',
  'Seleksi I: 2 Transaksi Kumulatif, Progress 100%, Auto-Completion, Bibit Dipertahankan',
  updatedDoc1.totalPolybagDiperiksa === 2500 &&
  updatedDoc1.remainingPolybag === 0 &&
  updatedDoc1.progress === 100 &&
  updatedDoc1.isCompleted === true &&
  updatedDoc1.status === 'COMPLETED' &&
  updatedDoc1.totalBibitSelectedQty === 300 &&
  updatedDoc1.totalBibitRetainedQty === 4700,
  `Polybag: ${updatedDoc1.totalPolybagDiperiksa}/2500, Sisa: ${updatedDoc1.remainingPolybag}, Prog: ${updatedDoc1.progress}%, Status: ${updatedDoc1.status}, Selected: ${updatedDoc1.totalBibitSelectedQty}, Retained: ${updatedDoc1.totalBibitRetainedQty}`
);

// ============================================================
// TEST 02: Multi-day 4 Transaksi (500 + 700 + 600 + 700 = 2500)
// ============================================================
globalThis.localStorage.clear();
const docSel1Multi = {
  id: 'DOC-SEL1-002',
  docNo: 'SEL1/TEST/2026/002',
  sourceType: 'SEEDING',
  sourceDocNo: 'SD-TEST-002',
  selectionStage: SELECTION_STAGES.SELEKSI_1,
  stage: 'SELEKSI_I',
  sourcePolybagQty: 2500,
  sourceBibitQty: 5000,
  rows: [{ bedenganId: 'BED-01', bedenganCode: 'BED-01', polybag: 2500, disemai: 5000 }]
};
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [docSel1Multi]);

createSeleksi1ExecutionTransaction({ selectionDocumentId: docSel1Multi.id, bedenganCode: 'BED-01', actualPolybagInspectedQty: 500, actualBibitSelectedQty: 20 }, mockUser);
createSeleksi1ExecutionTransaction({ selectionDocumentId: docSel1Multi.id, bedenganCode: 'BED-01', actualPolybagInspectedQty: 700, actualBibitSelectedQty: 30 }, mockUser);
createSeleksi1ExecutionTransaction({ selectionDocumentId: docSel1Multi.id, bedenganCode: 'BED-01', actualPolybagInspectedQty: 600, actualBibitSelectedQty: 40 }, mockUser);
createSeleksi1ExecutionTransaction({ selectionDocumentId: docSel1Multi.id, bedenganCode: 'BED-01', actualPolybagInspectedQty: 700, actualBibitSelectedQty: 50 }, mockUser);

const updatedDoc1Multi = getPreGraftingSelectionDocumentById(docSel1Multi.id);
assert(
  'TEST 02',
  'Multi-day 4 Transaksi (500, 700, 600, 700 => 2500) Auto-Completion',
  updatedDoc1Multi.totalPolybagDiperiksa === 2500 &&
  updatedDoc1Multi.remainingPolybag === 0 &&
  updatedDoc1Multi.isCompleted === true,
  `Total: ${updatedDoc1Multi.totalPolybagDiperiksa}, Sisa: ${updatedDoc1Multi.remainingPolybag}, Completed: ${updatedDoc1Multi.isCompleted}`
);

// ============================================================
// TEST 03: Seleksi II Multi-day Completion Berdasarkan Polybag
// ============================================================
globalThis.localStorage.clear();
const docSel2 = {
  id: 'DOC-SEL2-001',
  docNo: 'SEL2/TEST/2026/001',
  sourceType: 'SELEKSI_I',
  sourceDocNo: 'SEL1/TEST/2026/001',
  selectionStage: SELECTION_STAGES.SELEKSI_2,
  stage: 'SELEKSI_II',
  sourcePolybagQty: 2500,
  sourceBibitQty: 4700,
  rows: [{ bedenganId: 'BED-01', bedenganCode: 'BED-01', polybag: 2500, disemai: 4700 }]
};
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [docSel2]);

createSeleksi2ExecutionTransaction({ selectionDocumentId: docSel2.id, bedenganCode: 'BED-01', actualPolybagInspectedQty: 1200, actualBibitSelectedQty: 50 }, mockUser);
createSeleksi2ExecutionTransaction({ selectionDocumentId: docSel2.id, bedenganCode: 'BED-01', actualPolybagInspectedQty: 1300, actualBibitSelectedQty: 70 }, mockUser);

const updatedDoc2 = getPreGraftingSelectionDocumentById(docSel2.id);
assert(
  'TEST 03',
  'Seleksi II Multi-day: Completion berbasis Polybag (1200 + 1300 = 2500)',
  updatedDoc2.totalPolybagDiperiksa === 2500 &&
  updatedDoc2.remainingPolybag === 0 &&
  updatedDoc2.isCompleted === true &&
  updatedDoc2.totalBibitRetainedQty === (4700 - 120),
  `Total Polybag: ${updatedDoc2.totalPolybagDiperiksa}/2500, Completed: ${updatedDoc2.isCompleted}, Retained: ${updatedDoc2.totalBibitRetainedQty}`
);

// ============================================================
// TEST 04: Seleksi III Multi-day Completion Berdasarkan Polybag
// ============================================================
globalThis.localStorage.clear();
const docSel3 = {
  id: 'DOC-SEL3-001',
  docNo: 'SEL3/TEST/2026/001',
  sourceType: 'SELEKSI_II',
  sourceDocNo: 'SEL2/TEST/2026/001',
  selectionStage: SELECTION_STAGES.SELEKSI_3,
  stage: 'SELEKSI_III',
  sourcePolybagQty: 2500,
  sourceBibitQty: 4580,
  rows: [{ bedenganId: 'BED-01', bedenganCode: 'BED-01', polybag: 2500, disemai: 4580 }]
};
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [docSel3]);

createSeleksi3ExecutionTransaction({ selectionDocumentId: docSel3.id, bedenganCode: 'BED-01', actualPolybagInspectedQty: 1000, actualBibitSelectedQty: 40 }, mockUser);
createSeleksi3ExecutionTransaction({ selectionDocumentId: docSel3.id, bedenganCode: 'BED-01', actualPolybagInspectedQty: 1500, actualBibitSelectedQty: 60 }, mockUser);

const updatedDoc3 = getPreGraftingSelectionDocumentById(docSel3.id);
assert(
  'TEST 04',
  'Seleksi III Multi-day: Completion berbasis Polybag (1000 + 1500 = 2500)',
  updatedDoc3.totalPolybagDiperiksa === 2500 &&
  updatedDoc3.remainingPolybag === 0 &&
  updatedDoc3.isCompleted === true &&
  updatedDoc3.totalBibitRetainedQty === (4580 - 100),
  `Total Polybag: ${updatedDoc3.totalPolybagDiperiksa}/2500, Completed: ${updatedDoc3.isCompleted}, Retained: ${updatedDoc3.totalBibitRetainedQty}`
);

// ============================================================
// TEST 05: Overflow Protection (Source = 2500, Processed = 2000, Input = 501 -> REJECT)
// ============================================================
globalThis.localStorage.clear();
const docOverflow = {
  id: 'DOC-OVERFLOW-001',
  docNo: 'SEL1/TEST/2026/OF1',
  sourceType: 'SEEDING',
  sourceDocNo: 'SD-OF-001',
  selectionStage: SELECTION_STAGES.SELEKSI_1,
  stage: 'SELEKSI_I',
  sourcePolybagQty: 2500,
  sourceBibitQty: 5000,
  rows: [{ bedenganId: 'BED-01', bedenganCode: 'BED-01', polybag: 2500, disemai: 5000 }]
};
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [docOverflow]);
createSeleksi1ExecutionTransaction({ selectionDocumentId: docOverflow.id, bedenganCode: 'BED-01', actualPolybagInspectedQty: 2000, actualBibitSelectedQty: 100 }, mockUser);

let overflowRejected = false;
try {
  createSeleksi1ExecutionTransaction({ selectionDocumentId: docOverflow.id, bedenganCode: 'BED-01', actualPolybagInspectedQty: 501, actualBibitSelectedQty: 10 }, mockUser);
} catch (err) {
  overflowRejected = true;
}
const valResOverflow = validateSeleksi1Execution(
  { selectionDocumentId: docOverflow.id, bedenganCode: 'BED-01', actualPolybagInspectedQty: 501, actualBibitSelectedQty: 10 },
  getPreGraftingSelectionDocumentById(docOverflow.id),
  storage.get(SELECTION_STORAGE_KEY, [])
);

assert(
  'TEST 05',
  'Overflow Protection: Input 501 when Remaining 500 is REJECTED',
  overflowRejected || !valResOverflow.isValid,
  `Validation isValid: ${valResOverflow.isValid}, Errors: ${valResOverflow.errors.join('; ')}`
);

// ============================================================
// TEST 06: Exact Remaining (Source = 2500, Processed = 2000, Input = 500 -> ALLOW & COMPLETE)
// ============================================================
createSeleksi1ExecutionTransaction({ selectionDocumentId: docOverflow.id, bedenganCode: 'BED-01', actualPolybagInspectedQty: 500, actualBibitSelectedQty: 20 }, mockUser);
const docExact = getPreGraftingSelectionDocumentById(docOverflow.id);

assert(
  'TEST 06',
  'Exact Remaining: Input 500 when Remaining 500 is ALLOWED & Auto-completes',
  docExact.totalPolybagDiperiksa === 2500 &&
  docExact.remainingPolybag === 0 &&
  docExact.isCompleted === true,
  `Total: ${docExact.totalPolybagDiperiksa}, Sisa: ${docExact.remainingPolybag}, Completed: ${docExact.isCompleted}`
);

// ============================================================
// TEST 07: Cumulative Bibit Calculation (Bibit Awal = 5000, TX1 = 100, TX2 = 200 -> Total = 300, Retained = 4700)
// ============================================================
globalThis.localStorage.clear();
const docBibit = {
  id: 'DOC-BIBIT-001',
  docNo: 'SEL1/TEST/2026/B1',
  sourceType: 'SEEDING',
  sourceDocNo: 'SD-B-001',
  selectionStage: SELECTION_STAGES.SELEKSI_1,
  stage: 'SELEKSI_I',
  sourcePolybagQty: 2500,
  sourceBibitQty: 5000,
  rows: [{ bedenganId: 'BED-01', bedenganCode: 'BED-01', polybag: 2500, disemai: 5000 }]
};
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [docBibit]);
createSeleksi1ExecutionTransaction({ selectionDocumentId: docBibit.id, bedenganCode: 'BED-01', actualPolybagInspectedQty: 500, actualBibitSelectedQty: 100 }, mockUser);
createSeleksi1ExecutionTransaction({ selectionDocumentId: docBibit.id, bedenganCode: 'BED-01', actualPolybagInspectedQty: 500, actualBibitSelectedQty: 200 }, mockUser);

const docBibitUpdated = getPreGraftingSelectionDocumentById(docBibit.id);
assert(
  'TEST 07',
  'Bibit Calculation: Total Selected = 300, Retained = 4700',
  docBibitUpdated.totalBibitSelectedQty === 300 &&
  docBibitUpdated.totalBibitRetainedQty === 4700,
  `Selected: ${docBibitUpdated.totalBibitSelectedQty}, Retained: ${docBibitUpdated.totalBibitRetainedQty}`
);

// ============================================================
// TEST 08: Retained Field is Readonly / Calculated (Not directly set by Mantri payload)
// ============================================================
// Even if Mantri attempts to pass arbitrary actualBibitRetainedQty, the system calculates cumulative retained
const txTamperResult = createSeleksi1ExecutionTransaction({
  selectionDocumentId: docBibit.id,
  bedenganCode: 'BED-01',
  actualPolybagInspectedQty: 500,
  actualBibitSelectedQty: 50,
  actualBibitRetainedQty: 99999 // Tampered value
}, mockUser);

const txTamper = txTamperResult.transaction;

assert(
  'TEST 08',
  'Retained Field: System overrides/computes cumulative retained bibit accurately',
  txTamper.actualBibitRetainedQty === (5000 - 350) &&
  getPreGraftingSelectionDocumentById(docBibit.id).totalBibitRetainedQty === 4650,
  `Tx Retained: ${txTamper.actualBibitRetainedQty}, Doc Retained: ${getPreGraftingSelectionDocumentById(docBibit.id).totalBibitRetainedQty}`
);

// ============================================================
// TEST 09: UI Field Inspection in selection-landing.js
// ============================================================
const landingContent = fs.readFileSync('./js/modules/selection/selection-landing.js', 'utf8');
const hasPolybagInspectedInput = landingContent.includes('modal-sel1-polybag-inspected') &&
                                landingContent.includes('modal-sel2-polybag-inspected') &&
                                landingContent.includes('modal-sel3-polybag-inspected');
const hasBibitSelectedInput = landingContent.includes('modal-sel1-bibit-selected') &&
                              landingContent.includes('modal-sel2-bibit-selected') &&
                              landingContent.includes('modal-sel3-bibit-selected');
const hasBibitRetainedReadonly = landingContent.includes('modal-sel1-bibit-retained') &&
                                 landingContent.includes('readonly') &&
                                 landingContent.includes('modal-sel2-bibit-retained') &&
                                 landingContent.includes('modal-sel3-bibit-retained');
const noPolybagActiveInput = !landingContent.includes('modal-sel1-polybag-active') &&
                             !landingContent.includes('modal-sel2-polybag-active') &&
                             !landingContent.includes('modal-sel3-polybag-active') &&
                             !landingContent.includes('Jlh Polybag Terisi Bibit');

assert(
  'TEST 09',
  'UI Field Verification: 2 Inputs, 1 Readonly, No Polybag Terisi Bibit input',
  hasPolybagInspectedInput && hasBibitSelectedInput && hasBibitRetainedReadonly && noPolybagActiveInput,
  `Polybag Inspected Input: ${hasPolybagInspectedInput}, Bibit Selected Input: ${hasBibitSelectedInput}, Retained Readonly: ${hasBibitRetainedReadonly}, No Polybag Active Input: ${noPolybagActiveInput}`
);

// ============================================================
// TEST 10: Seleksi III Metric: totalPolybagDiperiksa is SUM Polybag Diperiksa (NOT bibit)
// ============================================================
globalThis.localStorage.clear();
const docSel3Metric = {
  id: 'DOC-SEL3-METRIC',
  docNo: 'SEL3/TEST/2026/M1',
  sourceType: 'SELEKSI_II',
  sourceDocNo: 'SEL2/TEST/2026/M1',
  selectionStage: SELECTION_STAGES.SELEKSI_3,
  stage: 'SELEKSI_III',
  sourcePolybagQty: 2500,
  sourceBibitQty: 4700,
  rows: [{ bedenganId: 'BED-01', bedenganCode: 'BED-01', polybag: 2500, disemai: 4700 }]
};
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [docSel3Metric]);
createSeleksi3ExecutionTransaction({ selectionDocumentId: docSel3Metric.id, bedenganCode: 'BED-01', actualPolybagInspectedQty: 800, actualBibitSelectedQty: 50 }, mockUser);
createSeleksi3ExecutionTransaction({ selectionDocumentId: docSel3Metric.id, bedenganCode: 'BED-01', actualPolybagInspectedQty: 1200, actualBibitSelectedQty: 70 }, mockUser);

const metrics3 = getSeleksi3Metrics(getPreGraftingSelectionDocumentById(docSel3Metric.id));
assert(
  'TEST 10',
  'Seleksi III Metric: totalPolybagDiperiksa equals SUM Polybag Diperiksa (2000, not bibit)',
  metrics3.totalPolybagDiperiksa === 2000 &&
  metrics3.totalBibitDiseleksi === 120 &&
  metrics3.totalBibitDipertahankan === (4700 - 120),
  `Polybag: ${metrics3.totalPolybagDiperiksa}/2500, Diseleksi: ${metrics3.totalBibitDiseleksi}, Dipertahankan: ${metrics3.totalBibitDipertahankan}`
);

// ============================================================
// TEST 11: Document Progress Denominator is Polybag
// ============================================================
const progressCalculated = metrics3.progress; // 2000 / 2500 = 80%
assert(
  'TEST 11',
  'Document Progress: Calculated from Polybag (2000 / 2500 = 80%)',
  progressCalculated === 80,
  `Progress: ${progressCalculated}%`
);

// ============================================================
// TEST 12: Update Transaction: Recalculates all Aggregates
// ============================================================
// Update TX1 of Seleksi 3 from 800 poly / 50 selected to 1300 poly / 80 selected -> Total = 2500 poly -> Auto completion!
const txsSel3 = storage.get(SELECTION_STORAGE_KEY, []);
const txToUpdate = txsSel3[0];
updateSeleksi3ExecutionTransaction(txToUpdate.id, {
  actualPolybagInspectedQty: 1300,
  actualBibitSelectedQty: 80
}, mockUser);

const docUpdatedAfterEdit = getPreGraftingSelectionDocumentById(docSel3Metric.id);
assert(
  'TEST 12',
  'Update Transaction: All Aggregates Recalculated (1300 + 1200 = 2500 -> Completed)',
  docUpdatedAfterEdit.totalPolybagDiperiksa === 2500 &&
  docUpdatedAfterEdit.remainingPolybag === 0 &&
  docUpdatedAfterEdit.progress === 100 &&
  docUpdatedAfterEdit.isCompleted === true &&
  docUpdatedAfterEdit.status === 'COMPLETED' &&
  docUpdatedAfterEdit.totalBibitSelectedQty === 150 &&
  docUpdatedAfterEdit.totalBibitRetainedQty === (4700 - 150),
  `Polybag: ${docUpdatedAfterEdit.totalPolybagDiperiksa}, Sisa: ${docUpdatedAfterEdit.remainingPolybag}, Completed: ${docUpdatedAfterEdit.isCompleted}, Retained: ${docUpdatedAfterEdit.totalBibitRetainedQty}`
);

// ============================================================
// TEST 13: Delete Transaction: Recalculates Aggregates & Reverts Completion
// ============================================================
// Delete TX1 (1300 poly) -> Total decreases to 1200/2500 -> isCompleted reverts to false
deleteSeleksi3ExecutionTransaction(txToUpdate.id, mockUser);
const docAfterDelete = getPreGraftingSelectionDocumentById(docSel3Metric.id);

assert(
  'TEST 13',
  'Delete Transaction: Recalculates Aggregates & Reverts isCompleted to false',
  docAfterDelete.totalPolybagDiperiksa === 1200 &&
  docAfterDelete.remainingPolybag === 1300 &&
  docAfterDelete.progress === 48 &&
  docAfterDelete.isCompleted === false &&
  docAfterDelete.status === 'IN_PROGRESS' &&
  docAfterDelete.totalBibitSelectedQty === 70 &&
  docAfterDelete.totalBibitRetainedQty === (4700 - 70),
  `Polybag: ${docAfterDelete.totalPolybagDiperiksa}, Sisa: ${docAfterDelete.remainingPolybag}, Completed: ${docAfterDelete.isCompleted}, Status: ${docAfterDelete.status}`
);

// ============================================================
// TEST 14: Legacy Compatibility (polybagScope / actualPolybagActiveQty)
// ============================================================
globalThis.localStorage.clear();
const docLegacy = {
  id: 'DOC-LEGACY-001',
  docNo: 'SEL1/TEST/2026/LEG',
  sourceType: 'SEEDING',
  sourceDocNo: 'SD-LEG-001',
  selectionStage: SELECTION_STAGES.SELEKSI_1,
  stage: 'SELEKSI_I',
  sourcePolybagQty: 2000,
  sourceBibitQty: 4000,
  rows: [{ bedenganId: 'BED-LEG', bedenganCode: 'BED-LEG', polybag: 2000, disemai: 4000 }]
};
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [docLegacy]);

// Insert legacy transactions directly into storage
const legacyTxs = [
  {
    id: 'TX-LEG-1',
    parentSelectionDocumentId: 'DOC-LEGACY-001',
    selectionStage: SELECTION_STAGES.SELEKSI_1,
    bedenganCode: 'BED-LEG',
    polybagScope: 800, // Legacy field
    actualBibitSelectedQty: 50,
    actualBibitRetainedQty: 1550
  },
  {
    id: 'TX-LEG-2',
    parentSelectionDocumentId: 'DOC-LEGACY-001',
    selectionStage: SELECTION_STAGES.SELEKSI_1,
    bedenganCode: 'BED-LEG',
    actualPolybagActiveQty: 1200, // Legacy field
    actualBibitSelectedQty: 80,
    actualBibitRetainedQty: 2320
  }
];
storage.set(SELECTION_STORAGE_KEY, legacyTxs);

const bedScopeStatus = getBedenganScopeStatusForSeleksi1(docLegacy);
const legacyInspected = bedScopeStatus[0].inspectedPolybag;
const legacyRemaining = bedScopeStatus[0].remainingPolybag;
const legacyIsFullyInspected = bedScopeStatus[0].isFullyInspected;

assert(
  'TEST 14',
  'Legacy Compatibility: polybagScope (800) + actualPolybagActiveQty (1200) aggregated accurately to 2000',
  legacyInspected === 2000 &&
  legacyRemaining === 0 &&
  legacyIsFullyInspected === true,
  `Inspected: ${legacyInspected}/2000, Sisa: ${legacyRemaining}, Fully Inspected: ${legacyIsFullyInspected}`
);

// ============================================================
// TEST A: Dokumen COMPLETED -> Tidak ada tombol "Tinjau & Kirim ke Asisten"
// ============================================================
const noTinjauKirimInHtml = !landingContent.includes('Tinjau & Kirim ke Asisten') &&
                           !landingContent.includes('Tinjau & Kirim') &&
                           !landingContent.includes('btn-open-review-modal" data-id="${esc(doc.id)}" style="width: 100%; height: 38px');

assert(
  'TEST A',
  'Workflow Guard: Dokumen COMPLETED tidak menampilkan tombol "Tinjau & Kirim ke Asisten"',
  noTinjauKirimInHtml,
  `No Tinjau & Kirim Button Found: ${noTinjauKirimInHtml}`
);

// ============================================================
// TEST B: Dokumen COMPLETED tetapi belum verified
// ============================================================
// On updatedDoc1 (from TEST 01), SUM polybag === 2500 -> isCompleted === true
assert(
  'TEST B',
  'COMPLETED != VERIFIED: Dokumen isCompleted tetap bernilai true namun tidak otomatis terverifikasi (status !== DISETUJUI, isFinal !== true)',
  updatedDoc1.isCompleted === true &&
  updatedDoc1.status === 'COMPLETED' &&
  updatedDoc1.status !== 'DISETUJUI' &&
  !updatedDoc1.isFinal &&
  !updatedDoc1.verifiedAt,
  `isCompleted: ${updatedDoc1.isCompleted}, status: ${updatedDoc1.status}, isFinal: ${Boolean(updatedDoc1.isFinal)}, verifiedAt: ${updatedDoc1.verifiedAt || 'none'}`
);

// ============================================================
// TEST C: Legacy Transaction tanpa actualBibitSelectedQty
// ============================================================
globalThis.localStorage.clear();
const docSel3LegacyBibit = {
  id: 'DOC-SEL3-LEG-BIBIT',
  docNo: 'SEL3/TEST/2026/LEG-B',
  sourceType: 'SELEKSI_II',
  sourceDocNo: 'SEL2/TEST/2026/LEG-B',
  selectionStage: SELECTION_STAGES.SELEKSI_3,
  stage: 'SELEKSI_III',
  sourcePolybagQty: 1000,
  sourceBibitQty: 2000,
  rows: [{ bedenganId: 'BED-LEG-B', bedenganCode: 'BED-LEG-B', polybag: 1000, disemai: 2000 }]
};
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [docSel3LegacyBibit]);

// Insert legacy transaction with bibitAwal: 2000, but NO actualBibitSelectedQty / selectedBibitScopeQty / jumlahDiperiksa
storage.set(SELECTION_STORAGE_KEY, [{
  id: 'TX-LEG-NO-SELECTED',
  parentSelectionDocumentId: 'DOC-SEL3-LEG-BIBIT',
  selectionStage: SELECTION_STAGES.SELEKSI_3,
  bedenganCode: 'BED-LEG-B',
  actualPolybagInspectedQty: 1000,
  bibitAwal: 2000 // Should NOT be treated as actualBibitSelectedQty!
}]);

const metricsLegacyC = getSeleksi3Metrics(getPreGraftingSelectionDocumentById(docSel3LegacyBibit.id));
assert(
  'TEST C',
  'Bibit Fallback: Legacy transaction tanpa actualBibitSelectedQty TIDAK menjadikan bibitAwal sebagai Bibit Diseleksi',
  metricsLegacyC.totalBibitDiseleksi === 0 &&
  metricsLegacyC.totalBibitDipertahankan === 2000,
  `totalBibitDiseleksi: ${metricsLegacyC.totalBibitDiseleksi} (expected 0), totalBibitDipertahankan: ${metricsLegacyC.totalBibitDipertahankan} (expected 2000)`
);

console.log('\n============================================================');
console.log('TEST SUMMARY');
console.log('============================================================');
const passCount = results.filter(r => r.status === 'PASS').length;
const failCount = results.filter(r => r.status === 'FAIL').length;
console.log(`TOTAL TESTS: ${results.length}`);
console.log(`PASSED: ${passCount}`);
console.log(`FAILED: ${failCount}`);
console.log(`OVERALL RESULT: ${failCount === 0 ? 'PASS' : 'FAIL'}`);

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
