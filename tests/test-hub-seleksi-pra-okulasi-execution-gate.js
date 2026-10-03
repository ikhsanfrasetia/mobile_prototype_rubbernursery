/**
 * tests/test-hub-seleksi-pra-okulasi-execution-gate.js
 * Integration Test Suite for Central Hub Execution Gate — Seleksi Pra-Okulasi I-III
 *
 * Test Scenarios:
 * IT-EXEC-SEL-001: Selection I DRAFT + 0 execution -> NOT VISIBLE
 * IT-EXEC-SEL-002: Selection I IN_PROGRESS + 0 execution -> NOT VISIBLE
 * IT-EXEC-SEL-003: Selection I COMPLETED + isCompleted true + 0 execution -> NOT VISIBLE
 * IT-EXEC-SEL-004: Selection I COMPLETED + isCompleted true + >=1 valid execution -> READY_TO_CONFIRM
 * IT-EXEC-SEL-005: Selection II COMPLETED + isCompleted true + 0 execution -> NOT VISIBLE
 * IT-EXEC-SEL-006: Selection II COMPLETED + isCompleted true + >=1 valid execution -> READY_TO_CONFIRM
 * IT-EXEC-SEL-007: Selection III COMPLETED + isCompleted true + 0 execution -> NOT VISIBLE
 * IT-EXEC-SEL-008: Selection III COMPLETED + isCompleted true + >=1 valid execution -> READY_TO_CONFIRM
 * IT-EXEC-SEL-009: Existing CULL/001 + valid executions -> SUBMITTED_TO_ASB / Data Terkonfirmasi
 * IT-EXEC-SEL-010: Cross-stage execution -> execution stage lain TIDAK dihitung
 * IT-EXEC-SEL-011: Cross-document execution -> execution parent lain TIDAK dihitung
 * IT-EXEC-SEL-012: Central Hub badge -> parent tanpa execution TIDAK dihitung
 * IT-EXEC-SEL-013: No mutation -> Tidak ada perubahan storage selama evaluasi getMantriTodayTransactions
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
import { todayDDMMYYYY } from '../js/core/utils.js';
import {
  getMantriTodayTransactions,
  MANTRI_TRANSACTION_STATUS,
  MODULE_TYPES
} from '../js/modules/verification/mantri-confirmation-service.js';
import {
  SELECTION_STORAGE_KEY,
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY
} from '../js/modules/selection/selection-manager.js';
import { VERIFICATION_STORAGE_KEY } from '../js/modules/verification/verification-manager.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

const userMantri = {
  id: 'USR-MANTRI-01',
  userId: 'USR-MANTRI-01',
  name: 'Mantri Bibitan',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

const todayStr = todayDDMMYYYY();

function resetStorage() {
  store.clear();
}

console.log('\n======================================================================');
console.log('INTEGRATION TEST: CENTRAL HUB EXECUTION GATE (SELEKSI PRA-OKULASI I-III)');
console.log('======================================================================\n');

// IT-EXEC-SEL-001: Selection I DRAFT + 0 execution -> NOT VISIBLE
console.log('--- IT-EXEC-SEL-001: Selection I DRAFT + 0 Execution ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL1-DOC-001',
  docNo: '2026/CULL/003',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_I',
  tanggalSeleksi: todayStr,
  batchCode: 'Batch-01',
  sourcePolybagQty: 2000,
  sourceBibitQty: 4000,
  totalDiperiksa: 0,
  totalLayak: 0,
  totalAfkir: 0,
  isCompleted: false,
  isFinal: false,
  status: 'DRAFT',
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
storage.set(SELECTION_STORAGE_KEY, []);
let txs = getMantriTodayTransactions(userMantri, todayStr);
let found = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/CULL/003');
assert(!found, 'Selection I (DRAFT, 0 execution) TIDAK MUNCUL di Central Hub');

// IT-EXEC-SEL-002: Selection I IN_PROGRESS + 0 execution -> NOT VISIBLE
console.log('\n--- IT-EXEC-SEL-002: Selection I IN_PROGRESS + 0 Execution ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL1-DOC-002',
  docNo: '2026/SEL-I/002',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_I',
  tanggalSeleksi: todayStr,
  batchCode: 'Batch-01',
  sourcePolybagQty: 2000,
  sourceBibitQty: 4000,
  totalDiperiksa: 500,
  totalLayak: 450,
  totalAfkir: 50,
  isCompleted: false,
  isFinal: false,
  status: 'IN_PROGRESS',
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
storage.set(SELECTION_STORAGE_KEY, []);
txs = getMantriTodayTransactions(userMantri, todayStr);
found = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-I/002');
assert(!found, 'Selection I (IN_PROGRESS, 0 execution) TIDAK MUNCUL di Central Hub');

// IT-EXEC-SEL-003: Selection I COMPLETED + isCompleted true + 0 execution -> NOT VISIBLE (GAP CLOSURE)
console.log('\n--- IT-EXEC-SEL-003: Selection I COMPLETED + isCompleted true + 0 Execution (Anomaly) ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL1-DOC-003',
  docNo: '2026/SEL-I/003',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_I',
  tanggalSeleksi: todayStr,
  batchCode: 'Batch-01',
  sourcePolybagQty: 2000,
  sourceBibitQty: 4000,
  totalDiperiksa: 2000,
  totalLayak: 1900,
  totalAfkir: 100,
  isCompleted: true,
  isFinal: false,
  status: 'COMPLETED',
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
storage.set(SELECTION_STORAGE_KEY, []); // 0 child executions
txs = getMantriTodayTransactions(userMantri, todayStr);
found = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-I/003');
assert(!found, 'Selection I (COMPLETED anomaly dengan 0 execution) TIDAK MUNCUL di Central Hub');

// IT-EXEC-SEL-004: Selection I COMPLETED + isCompleted true + >=1 valid execution -> READY_TO_CONFIRM
console.log('\n--- IT-EXEC-SEL-004: Selection I COMPLETED + isCompleted true + >=1 Valid Execution ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL1-DOC-004',
  docNo: '2026/SEL-I/004',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_I',
  tanggalSeleksi: todayStr,
  batchCode: 'Batch-01',
  bedengan: 'BED-001',
  sourcePolybagQty: 2000,
  sourceBibitQty: 4000,
  totalDiperiksa: 2000,
  totalLayak: 1900,
  totalAfkir: 100,
  isCompleted: true,
  isFinal: false,
  status: 'COMPLETED',
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
storage.set(SELECTION_STORAGE_KEY, [{
  id: 'SEL-TX-004-1',
  docNo: '2026/SEL-I/004-01',
  parentSelectionDocumentId: 'SEL1-DOC-004',
  selectionDocumentId: 'SEL1-DOC-004',
  parentSelectionDocNo: '2026/SEL-I/004',
  selectionDocNo: '2026/SEL-I/004',
  selectionStage: 'SELEKSI_I',
  actualPolybagInspectedQty: 2000,
  bibitDipertahankan: 1900,
  bibitReject: 100,
  status: 'COMPLETED',
  createdAt: new Date().toISOString()
}]);
txs = getMantriTodayTransactions(userMantri, todayStr);
found = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-I/004');
assert(Boolean(found), 'Selection I dengan execution valid MUNCUL di Central Hub');
assert(found && found.status === MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM, 'Item berstatus READY_TO_CONFIRM');

// IT-EXEC-SEL-005: Selection II COMPLETED + isCompleted true + 0 execution -> NOT VISIBLE
console.log('\n--- IT-EXEC-SEL-005: Selection II COMPLETED + isCompleted true + 0 Execution ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL2-DOC-005',
  docNo: '2026/SEL-II/001',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_II',
  tanggalSeleksi: todayStr,
  batchCode: 'Batch-01',
  sourcePolybagQty: 2000,
  sourceBibitQty: 1900,
  totalDiperiksa: 2000,
  totalLayak: 1850,
  totalAfkir: 50,
  isCompleted: true,
  isFinal: false,
  status: 'COMPLETED',
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
storage.set(SELECTION_STORAGE_KEY, []); // 0 executions
txs = getMantriTodayTransactions(userMantri, todayStr);
found = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-II/001');
assert(!found, 'Selection II (COMPLETED dengan 0 execution) TIDAK MUNCUL di Central Hub');

// IT-EXEC-SEL-006: Selection II COMPLETED + isCompleted true + >=1 valid execution -> READY_TO_CONFIRM
console.log('\n--- IT-EXEC-SEL-006: Selection II COMPLETED + isCompleted true + >=1 Valid Execution ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL2-DOC-006',
  docNo: '2026/SEL-II/002',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_II',
  tanggalSeleksi: todayStr,
  batchCode: 'Batch-01',
  bedengan: 'BED-001',
  sourcePolybagQty: 2000,
  sourceBibitQty: 1900,
  totalDiperiksa: 2000,
  totalLayak: 1850,
  totalAfkir: 50,
  isCompleted: true,
  isFinal: false,
  status: 'COMPLETED',
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
storage.set(SELECTION_STORAGE_KEY, [{
  id: 'SEL-TX-006-1',
  docNo: '2026/SEL-II/002-01',
  parentSelectionDocumentId: 'SEL2-DOC-006',
  selectionDocumentId: 'SEL2-DOC-006',
  parentSelectionDocNo: '2026/SEL-II/002',
  selectionDocNo: '2026/SEL-II/002',
  selectionStage: 'SELEKSI_II',
  actualPolybagInspectedQty: 2000,
  bibitDipertahankan: 1850,
  bibitReject: 50,
  status: 'COMPLETED',
  createdAt: new Date().toISOString()
}]);
txs = getMantriTodayTransactions(userMantri, todayStr);
found = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-II/002');
assert(Boolean(found), 'Selection II dengan execution valid MUNCUL di Central Hub');
assert(found && found.status === MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM, 'Item Seleksi II berstatus READY_TO_CONFIRM');

// IT-EXEC-SEL-007: Selection III COMPLETED + isCompleted true + 0 execution -> NOT VISIBLE
console.log('\n--- IT-EXEC-SEL-007: Selection III COMPLETED + isCompleted true + 0 Execution ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL3-DOC-007',
  docNo: '2026/SEL-III/001',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_III',
  tanggalSeleksi: todayStr,
  batchCode: 'Batch-01',
  sourcePolybagQty: 2000,
  sourceBibitQty: 1850,
  totalDiperiksa: 2000,
  totalLayak: 1800,
  totalAfkir: 50,
  isCompleted: true,
  isFinal: false,
  status: 'COMPLETED',
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
storage.set(SELECTION_STORAGE_KEY, []); // 0 executions
txs = getMantriTodayTransactions(userMantri, todayStr);
found = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-III/001');
assert(!found, 'Selection III (COMPLETED dengan 0 execution) TIDAK MUNCUL di Central Hub');

// IT-EXEC-SEL-008: Selection III COMPLETED + isCompleted true + >=1 valid execution -> READY_TO_CONFIRM
console.log('\n--- IT-EXEC-SEL-008: Selection III COMPLETED + isCompleted true + >=1 Valid Execution ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL3-DOC-008',
  docNo: '2026/SEL-III/002',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_III',
  tanggalSeleksi: todayStr,
  batchCode: 'Batch-01',
  bedengan: 'BED-001',
  sourcePolybagQty: 2000,
  sourceBibitQty: 1850,
  totalDiperiksa: 2000,
  totalLayak: 1800,
  totalAfkir: 50,
  isCompleted: true,
  isFinal: false,
  status: 'COMPLETED',
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
storage.set(SELECTION_STORAGE_KEY, [{
  id: 'SEL-TX-008-1',
  docNo: '2026/SEL-III/002-01',
  parentSelectionDocumentId: 'SEL3-DOC-008',
  selectionDocumentId: 'SEL3-DOC-008',
  parentSelectionDocNo: '2026/SEL-III/002',
  selectionDocNo: '2026/SEL-III/002',
  selectionStage: 'SELEKSI_III',
  actualPolybagInspectedQty: 2000,
  bibitDipertahankan: 1800,
  bibitReject: 50,
  status: 'COMPLETED',
  createdAt: new Date().toISOString()
}]);
txs = getMantriTodayTransactions(userMantri, todayStr);
found = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-III/002');
assert(Boolean(found), 'Selection III dengan execution valid MUNCUL di Central Hub');
assert(found && found.status === MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM, 'Item Seleksi III berstatus READY_TO_CONFIRM');

// IT-EXEC-SEL-009: Existing CULL/001 + valid executions -> SUBMITTED_TO_ASB / Data Terkonfirmasi
console.log('\n--- IT-EXEC-SEL-009: Existing CULL/001 + Valid Executions ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL-DOC-2026-001',
  docNo: '2026/CULL/001',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_I',
  tanggalSeleksi: todayStr,
  batchCode: 'Batch-01',
  bedengan: 'BED-001',
  sourcePolybagQty: 2000,
  sourceBibitQty: 4000,
  totalDiperiksa: 2000,
  totalLayak: 1900,
  totalAfkir: 100,
  isCompleted: true,
  isFinal: false,
  status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
  submittedAt: '2026-10-01T14:50:18.000Z',
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
storage.set(SELECTION_STORAGE_KEY, [
  {
    id: 'SEL-TX-001-A',
    docNo: '2026/CULL/001-01',
    parentSelectionDocumentId: 'SEL-DOC-2026-001',
    parentSelectionDocNo: '2026/CULL/001',
    selectionStage: 'SELEKSI_I',
    actualPolybagInspectedQty: 1000,
    bibitDipertahankan: 950,
    bibitReject: 50,
    status: 'MENUNGGU_VERIFIKASI'
  },
  {
    id: 'SEL-TX-001-B',
    docNo: '2026/CULL/001-02',
    parentSelectionDocumentId: 'SEL-DOC-2026-001',
    parentSelectionDocNo: '2026/CULL/001',
    selectionStage: 'SELEKSI_I',
    actualPolybagInspectedQty: 1000,
    bibitDipertahankan: 950,
    bibitReject: 50,
    status: 'MENUNGGU_VERIFIKASI'
  }
]);
storage.set(VERIFICATION_STORAGE_KEY, [{
  verificationId: 'VRF-20261001-4821',
  referenceId: 'SEL-DOC-2026-001',
  referenceDocNo: '2026/CULL/001',
  referenceType: 'SELEKSI_PRA_OKULASI',
  verificationStatus: 'MENUNGGU_VERIFIKASI',
  submittedAt: '2026-10-01T14:50:18.000Z'
}]);
txs = getMantriTodayTransactions(userMantri, todayStr);
found = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/CULL/001');
assert(Boolean(found), 'Existing CULL/001 MUNCUL di Central Hub');
assert(found && found.status === MANTRI_TRANSACTION_STATUS.SUBMITTED_TO_ASB, 'CULL/001 berstatus SUBMITTED_TO_ASB (Data Terkonfirmasi)');

// IT-EXEC-SEL-010: Cross-stage execution -> execution stage lain TIDAK dihitung
console.log('\n--- IT-EXEC-SEL-010: Cross-Stage Execution Contamination Prevention ---');
resetStorage();
// Parent Seleksi I tanpa execution Seleksi I, tapi ada execution Seleksi II di storage
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL1-DOC-010',
  docNo: '2026/SEL-I/010',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_I',
  tanggalSeleksi: todayStr,
  batchCode: 'Batch-01',
  sourcePolybagQty: 2000,
  sourceBibitQty: 4000,
  totalDiperiksa: 2000,
  totalLayak: 1900,
  totalAfkir: 100,
  isCompleted: true,
  isFinal: false,
  status: 'COMPLETED',
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
storage.set(SELECTION_STORAGE_KEY, [
  {
    id: 'SEL-TX-STAGE2',
    docNo: '2026/SEL-II/999-01',
    parentSelectionDocumentId: 'SEL1-DOC-010', // mismatch stage!
    selectionDocumentId: 'SEL1-DOC-010',
    parentSelectionDocNo: '2026/SEL-I/010',
    selectionStage: 'SELEKSI_II', // Execution ini ber-stage Seleksi II
    actualPolybagInspectedQty: 2000,
    bibitDipertahankan: 1900,
    bibitReject: 100,
    status: 'COMPLETED'
  }
]);
txs = getMantriTodayTransactions(userMantri, todayStr);
found = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-I/010');
assert(!found, 'Parent Seleksi I TIDAK MENGHITUNG execution Seleksi II (Cross-stage terisolasi)');

// IT-EXEC-SEL-011: Cross-document execution -> execution parent lain TIDAK dihitung
console.log('\n--- IT-EXEC-SEL-011: Cross-Document Contamination Prevention ---');
resetStorage();
// Parent A (0 execution) dan Parent B (1 execution)
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [
  {
    id: 'SEL1-DOC-A',
    docNo: '2026/SEL-I/AAA',
    selectionType: 'PRA_OKULASI',
    selectionStage: 'SELEKSI_I',
    tanggalSeleksi: todayStr,
    sourcePolybagQty: 2000,
    isCompleted: true,
    status: 'COMPLETED',
    submittedByUserId: userMantri.id,
    submittedByName: userMantri.name
  },
  {
    id: 'SEL1-DOC-B',
    docNo: '2026/SEL-I/BBB',
    selectionType: 'PRA_OKULASI',
    selectionStage: 'SELEKSI_I',
    tanggalSeleksi: todayStr,
    sourcePolybagQty: 2000,
    isCompleted: true,
    status: 'COMPLETED',
    submittedByUserId: userMantri.id,
    submittedByName: userMantri.name
  }
]);
storage.set(SELECTION_STORAGE_KEY, [
  {
    id: 'SEL-TX-BBB-1',
    docNo: '2026/SEL-I/BBB-01',
    parentSelectionDocumentId: 'SEL1-DOC-B',
    selectionDocumentId: 'SEL1-DOC-B',
    parentSelectionDocNo: '2026/SEL-I/BBB',
    selectionDocNo: '2026/SEL-I/BBB',
    selectionStage: 'SELEKSI_I',
    actualPolybagInspectedQty: 2000,
    bibitDipertahankan: 1900,
    bibitReject: 100,
    status: 'COMPLETED'
  }
]);
txs = getMantriTodayTransactions(userMantri, todayStr);
const foundA = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-I/AAA');
const foundB = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-I/BBB');
assert(!foundA, 'Parent A (0 execution) TIDAK MUNCUL');
assert(Boolean(foundB), 'Parent B (1 execution) MUNCUL');

// IT-EXEC-SEL-012: Central Hub badge count calculation
console.log('\n--- IT-EXEC-SEL-012: Central Hub Badge Calculation Accuracy ---');
const selModuleTxs = txs.filter(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI);
assert(selModuleTxs.length === 1, 'Badge count Seleksi Pra-Okulasi tepat bernilai 1 (Parent A tidak dihitung)');

// IT-EXEC-SEL-013: No Storage Mutation Guarantee
console.log('\n--- IT-EXEC-SEL-013: No Storage Mutation Guarantee ---');
// Capture snapshot before
const snapBeforePre = JSON.stringify(storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []));
const snapBeforeSel = JSON.stringify(storage.get(SELECTION_STORAGE_KEY, []));
const snapBeforeVer = JSON.stringify(storage.get(VERIFICATION_STORAGE_KEY, []));

// Run getMantriTodayTransactions
getMantriTodayTransactions(userMantri, todayStr);

// Capture snapshot after
const snapAfterPre = JSON.stringify(storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []));
const snapAfterSel = JSON.stringify(storage.get(SELECTION_STORAGE_KEY, []));
const snapAfterVer = JSON.stringify(storage.get(VERIFICATION_STORAGE_KEY, []));

assert(snapBeforePre === snapAfterPre, 'Storage pre_grafting_selection_documents 100% IDENTIK (No mutation)');
assert(snapBeforeSel === snapAfterSel, 'Storage selection_transactions 100% IDENTIK (No mutation)');
assert(snapBeforeVer === snapAfterVer, 'Storage verification_transactions 100% IDENTIK (No mutation)');

console.log('\n======================================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
