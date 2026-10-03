/**
 * tests/test-hub-seleksi-pra-okulasi-universal-execution-gate.js
 * Integration Test Suite for Universal Execution Gate — Seleksi Pra-Okulasi I-III
 *
 * Test Scenarios:
 * IT-UNIV-SEL-001: READY_TO_CONFIRM + 0 execution -> NOT VISIBLE
 * IT-UNIV-SEL-002: READY_TO_CONFIRM + >=1 valid execution -> READY_TO_CONFIRM
 * IT-UNIV-SEL-003: SUBMITTED_TO_ASB + 0 execution -> NOT VISIBLE
 * IT-UNIV-SEL-004: SUBMITTED_TO_ASB + >=1 valid execution -> SUBMITTED_TO_ASB
 * IT-UNIV-SEL-005: REVISION + 0 execution -> NOT VISIBLE
 * IT-UNIV-SEL-006: REVISION + >=1 valid execution -> REVISION
 * IT-UNIV-SEL-007: VERIFIED + 0 execution -> NOT VISIBLE
 * IT-UNIV-SEL-008: VERIFIED + >=1 valid execution -> VERIFIED
 * IT-UNIV-SEL-009: Selection I + 0 execution, storage has Selection II execution -> NOT VISIBLE
 * IT-UNIV-SEL-010: Selection II + 0 execution, storage has Selection I/III execution -> NOT VISIBLE
 * IT-UNIV-SEL-011: Selection III + 0 execution, storage has Selection I/II execution -> NOT VISIBLE
 * IT-UNIV-SEL-012: Parent A + 0 execution, Parent B + >=1 execution -> Parent A NOT VISIBLE, Parent B VISIBLE
 * IT-UNIV-SEL-013: CULL/001 existing + valid execution -> SUBMITTED_TO_ASB / Data Terkonfirmasi
 * IT-UNIV-SEL-014: Central Hub badge -> Parent tanpa execution TIDAK dihitung
 * IT-UNIV-SEL-015: No mutation -> Storage 100% identik sebelum dan sesudah getMantriTodayTransactions
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
console.log('INTEGRATION TEST: UNIVERSAL EXECUTION GATE (SELEKSI PRA-OKULASI I-III)');
console.log('======================================================================\n');

// IT-UNIV-SEL-001: READY_TO_CONFIRM + 0 execution -> NOT VISIBLE
console.log('--- IT-UNIV-SEL-001: READY_TO_CONFIRM + 0 Execution ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL1-DOC-001',
  docNo: '2026/SEL-I/001',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_I',
  tanggalSeleksi: todayStr,
  status: 'COMPLETED',
  isCompleted: true,
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
storage.set(SELECTION_STORAGE_KEY, []); // 0 execution
let txs = getMantriTodayTransactions(userMantri, todayStr);
let found001 = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-I/001');
assert(!found001, 'READY_TO_CONFIRM + 0 execution TIDAK MUNCUL di Central Hub');

// IT-UNIV-SEL-002: READY_TO_CONFIRM + >=1 valid execution -> READY_TO_CONFIRM
console.log('\n--- IT-UNIV-SEL-002: READY_TO_CONFIRM + >=1 Valid Execution ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL1-DOC-002',
  docNo: '2026/SEL-I/002',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_I',
  tanggalSeleksi: todayStr,
  status: 'COMPLETED',
  isCompleted: true,
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
storage.set(SELECTION_STORAGE_KEY, [{
  id: 'TX-002',
  docNo: '2026/SEL-I/002-01',
  parentSelectionDocumentId: 'SEL1-DOC-002',
  selectionDocumentId: 'SEL1-DOC-002',
  parentSelectionDocNo: '2026/SEL-I/002',
  selectionDocNo: '2026/SEL-I/002',
  selectionStage: 'SELEKSI_I',
  actualPolybagInspectedQty: 2000,
  status: 'COMPLETED'
}]);
txs = getMantriTodayTransactions(userMantri, todayStr);
let found002 = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-I/002');
assert(Boolean(found002) && found002.status === MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM, 'READY_TO_CONFIRM + >=1 execution MUNCUL sebagai READY_TO_CONFIRM');

// IT-UNIV-SEL-003: SUBMITTED_TO_ASB + 0 execution -> NOT VISIBLE
console.log('\n--- IT-UNIV-SEL-003: SUBMITTED_TO_ASB + 0 Execution ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL1-DOC-003',
  docNo: '2026/SEL-I/003',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_I',
  tanggalSeleksi: todayStr,
  status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
  isCompleted: true,
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
storage.set(SELECTION_STORAGE_KEY, []); // 0 execution
storage.set(VERIFICATION_STORAGE_KEY, [{
  verificationId: 'VRF-003',
  referenceId: 'SEL1-DOC-003',
  referenceDocNo: '2026/SEL-I/003',
  referenceType: 'SELEKSI_PRA_OKULASI',
  verificationStatus: 'MENUNGGU_VERIFIKASI',
  submittedAt: new Date().toISOString()
}]);
txs = getMantriTodayTransactions(userMantri, todayStr);
let found003 = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-I/003');
assert(!found003, 'SUBMITTED_TO_ASB + 0 execution TIDAK MUNCUL di Central Hub');

// IT-UNIV-SEL-004: SUBMITTED_TO_ASB + >=1 valid execution -> SUBMITTED_TO_ASB
console.log('\n--- IT-UNIV-SEL-004: SUBMITTED_TO_ASB + >=1 Valid Execution ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL1-DOC-004',
  docNo: '2026/SEL-I/004',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_I',
  tanggalSeleksi: todayStr,
  status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
  isCompleted: true,
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
storage.set(SELECTION_STORAGE_KEY, [{
  id: 'TX-004',
  docNo: '2026/SEL-I/004-01',
  parentSelectionDocumentId: 'SEL1-DOC-004',
  selectionDocumentId: 'SEL1-DOC-004',
  parentSelectionDocNo: '2026/SEL-I/004',
  selectionDocNo: '2026/SEL-I/004',
  selectionStage: 'SELEKSI_I',
  actualPolybagInspectedQty: 2000,
  status: 'MENUNGGU_VERIFIKASI'
}]);
storage.set(VERIFICATION_STORAGE_KEY, [{
  verificationId: 'VRF-004',
  referenceId: 'SEL1-DOC-004',
  referenceDocNo: '2026/SEL-I/004',
  referenceType: 'SELEKSI_PRA_OKULASI',
  verificationStatus: 'MENUNGGU_VERIFIKASI',
  submittedAt: new Date().toISOString()
}]);
txs = getMantriTodayTransactions(userMantri, todayStr);
let found004 = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-I/004');
assert(Boolean(found004) && found004.status === MANTRI_TRANSACTION_STATUS.SUBMITTED_TO_ASB, 'SUBMITTED_TO_ASB + >=1 execution MUNCUL sebagai SUBMITTED_TO_ASB');

// IT-UNIV-SEL-005: REVISION + 0 execution -> NOT VISIBLE
console.log('\n--- IT-UNIV-SEL-005: REVISION + 0 Execution ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL1-DOC-005',
  docNo: '2026/SEL-I/005',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_I',
  tanggalSeleksi: todayStr,
  status: 'DIKEMBALIKAN',
  isCompleted: true,
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
storage.set(SELECTION_STORAGE_KEY, []); // 0 execution
storage.set(VERIFICATION_STORAGE_KEY, [{
  verificationId: 'VRF-005',
  referenceId: 'SEL1-DOC-005',
  referenceDocNo: '2026/SEL-I/005',
  referenceType: 'SELEKSI_PRA_OKULASI',
  verificationStatus: 'DIKEMBALIKAN',
  submittedAt: new Date().toISOString()
}]);
txs = getMantriTodayTransactions(userMantri, todayStr);
let found005 = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-I/005');
assert(!found005, 'REVISION + 0 execution TIDAK MUNCUL di Central Hub');

// IT-UNIV-SEL-006: REVISION + >=1 valid execution -> REVISION
console.log('\n--- IT-UNIV-SEL-006: REVISION + >=1 Valid Execution ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL1-DOC-006',
  docNo: '2026/SEL-I/006',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_I',
  tanggalSeleksi: todayStr,
  status: 'DIKEMBALIKAN',
  isCompleted: true,
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
storage.set(SELECTION_STORAGE_KEY, [{
  id: 'TX-006',
  docNo: '2026/SEL-I/006-01',
  parentSelectionDocumentId: 'SEL1-DOC-006',
  selectionDocumentId: 'SEL1-DOC-006',
  parentSelectionDocNo: '2026/SEL-I/006',
  selectionDocNo: '2026/SEL-I/006',
  selectionStage: 'SELEKSI_I',
  actualPolybagInspectedQty: 2000,
  status: 'DIKEMBALIKAN'
}]);
storage.set(VERIFICATION_STORAGE_KEY, [{
  verificationId: 'VRF-006',
  referenceId: 'SEL1-DOC-006',
  referenceDocNo: '2026/SEL-I/006',
  referenceType: 'SELEKSI_PRA_OKULASI',
  verificationStatus: 'DIKEMBALIKAN',
  submittedAt: new Date().toISOString()
}]);
txs = getMantriTodayTransactions(userMantri, todayStr);
let found006 = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-I/006');
assert(Boolean(found006) && found006.status === MANTRI_TRANSACTION_STATUS.REVISION, 'REVISION + >=1 execution MUNCUL sebagai REVISION');

// IT-UNIV-SEL-007: VERIFIED + 0 execution -> NOT VISIBLE
console.log('\n--- IT-UNIV-SEL-007: VERIFIED + 0 Execution ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL1-DOC-007',
  docNo: '2026/SEL-I/007',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_I',
  tanggalSeleksi: todayStr,
  status: 'DISETUJUI',
  isCompleted: true,
  isFinal: true,
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
storage.set(SELECTION_STORAGE_KEY, []); // 0 execution
storage.set(VERIFICATION_STORAGE_KEY, [{
  verificationId: 'VRF-007',
  referenceId: 'SEL1-DOC-007',
  referenceDocNo: '2026/SEL-I/007',
  referenceType: 'SELEKSI_PRA_OKULASI',
  verificationStatus: 'TERVERIFIKASI',
  submittedAt: new Date().toISOString()
}]);
txs = getMantriTodayTransactions(userMantri, todayStr);
let found007 = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-I/007');
assert(!found007, 'VERIFIED + 0 execution TIDAK MUNCUL di Central Hub');

// IT-UNIV-SEL-008: VERIFIED + >=1 valid execution -> VERIFIED
console.log('\n--- IT-UNIV-SEL-008: VERIFIED + >=1 Valid Execution ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL1-DOC-008',
  docNo: '2026/SEL-I/008',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_I',
  tanggalSeleksi: todayStr,
  status: 'DISETUJUI',
  isCompleted: true,
  isFinal: true,
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
storage.set(SELECTION_STORAGE_KEY, [{
  id: 'TX-008',
  docNo: '2026/SEL-I/008-01',
  parentSelectionDocumentId: 'SEL1-DOC-008',
  selectionDocumentId: 'SEL1-DOC-008',
  parentSelectionDocNo: '2026/SEL-I/008',
  selectionDocNo: '2026/SEL-I/008',
  selectionStage: 'SELEKSI_I',
  actualPolybagInspectedQty: 2000,
  status: 'DISETUJUI'
}]);
storage.set(VERIFICATION_STORAGE_KEY, [{
  verificationId: 'VRF-008',
  referenceId: 'SEL1-DOC-008',
  referenceDocNo: '2026/SEL-I/008',
  referenceType: 'SELEKSI_PRA_OKULASI',
  verificationStatus: 'TERVERIFIKASI',
  submittedAt: new Date().toISOString()
}]);
txs = getMantriTodayTransactions(userMantri, todayStr);
let found008 = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-I/008');
assert(Boolean(found008) && found008.status === MANTRI_TRANSACTION_STATUS.VERIFIED, 'VERIFIED + >=1 execution MUNCUL sebagai VERIFIED');

// IT-UNIV-SEL-009: Selection I + 0 execution, storage has Selection II execution -> NOT VISIBLE
console.log('\n--- IT-UNIV-SEL-009: Selection I Cross-Stage Contamination Blocked ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL1-DOC-009',
  docNo: '2026/SEL-I/009',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_I',
  tanggalSeleksi: todayStr,
  status: 'COMPLETED',
  isCompleted: true,
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
storage.set(SELECTION_STORAGE_KEY, [{
  id: 'TX-STAGE2',
  docNo: '2026/SEL-II/999-01',
  parentSelectionDocumentId: 'SEL1-DOC-009',
  selectionDocumentId: 'SEL1-DOC-009',
  parentSelectionDocNo: '2026/SEL-I/009',
  selectionDocNo: '2026/SEL-I/009',
  selectionStage: 'SELEKSI_II', // Execution ini ber-stage Seleksi II
  actualPolybagInspectedQty: 2000,
  status: 'COMPLETED'
}]);
txs = getMantriTodayTransactions(userMantri, todayStr);
let found009 = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-I/009');
assert(!found009, 'Selection I (0 execution miliknya, ada execution Seleksi II) TIDAK MUNCUL');

// IT-UNIV-SEL-010: Selection II + 0 execution, storage has Selection I/III execution -> NOT VISIBLE
console.log('\n--- IT-UNIV-SEL-010: Selection II Cross-Stage Contamination Blocked ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL2-DOC-010',
  docNo: '2026/SEL-II/010',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_II',
  tanggalSeleksi: todayStr,
  status: 'COMPLETED',
  isCompleted: true,
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
storage.set(SELECTION_STORAGE_KEY, [{
  id: 'TX-STAGE1',
  docNo: '2026/SEL-I/999-01',
  parentSelectionDocumentId: 'SEL2-DOC-010',
  selectionDocumentId: 'SEL2-DOC-010',
  parentSelectionDocNo: '2026/SEL-II/010',
  selectionDocNo: '2026/SEL-II/010',
  selectionStage: 'SELEKSI_I', // Execution ini ber-stage Seleksi I
  actualPolybagInspectedQty: 2000,
  status: 'COMPLETED'
}]);
txs = getMantriTodayTransactions(userMantri, todayStr);
let found010 = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-II/010');
assert(!found010, 'Selection II (0 execution miliknya, ada execution Seleksi I) TIDAK MUNCUL');

// IT-UNIV-SEL-011: Selection III + 0 execution, storage has Selection I/II execution -> NOT VISIBLE
console.log('\n--- IT-UNIV-SEL-011: Selection III Cross-Stage Contamination Blocked ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL3-DOC-011',
  docNo: '2026/SEL-III/011',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_III',
  tanggalSeleksi: todayStr,
  status: 'COMPLETED',
  isCompleted: true,
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
storage.set(SELECTION_STORAGE_KEY, [{
  id: 'TX-STAGE2-B',
  docNo: '2026/SEL-II/888-01',
  parentSelectionDocumentId: 'SEL3-DOC-011',
  selectionDocumentId: 'SEL3-DOC-011',
  parentSelectionDocNo: '2026/SEL-III/011',
  selectionDocNo: '2026/SEL-III/011',
  selectionStage: 'SELEKSI_II', // Execution ini ber-stage Seleksi II
  actualPolybagInspectedQty: 2000,
  status: 'COMPLETED'
}]);
txs = getMantriTodayTransactions(userMantri, todayStr);
let found011 = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-III/011');
assert(!found011, 'Selection III (0 execution miliknya, ada execution Seleksi II) TIDAK MUNCUL');

// IT-UNIV-SEL-012: Parent A + 0 execution, Parent B + >=1 execution -> Parent A NOT VISIBLE, Parent B VISIBLE
console.log('\n--- IT-UNIV-SEL-012: Cross-Document Contamination Blocked ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [
  {
    id: 'SEL1-DOC-A',
    docNo: '2026/SEL-I/AAA',
    selectionType: 'PRA_OKULASI',
    selectionStage: 'SELEKSI_I',
    tanggalSeleksi: todayStr,
    status: 'COMPLETED',
    isCompleted: true,
    submittedByUserId: userMantri.id,
    submittedByName: userMantri.name
  },
  {
    id: 'SEL1-DOC-B',
    docNo: '2026/SEL-I/BBB',
    selectionType: 'PRA_OKULASI',
    selectionStage: 'SELEKSI_I',
    tanggalSeleksi: todayStr,
    status: 'COMPLETED',
    isCompleted: true,
    submittedByUserId: userMantri.id,
    submittedByName: userMantri.name
  }
]);
storage.set(SELECTION_STORAGE_KEY, [{
  id: 'TX-BBB-1',
  docNo: '2026/SEL-I/BBB-01',
  parentSelectionDocumentId: 'SEL1-DOC-B',
  selectionDocumentId: 'SEL1-DOC-B',
  parentSelectionDocNo: '2026/SEL-I/BBB',
  selectionDocNo: '2026/SEL-I/BBB',
  selectionStage: 'SELEKSI_I',
  actualPolybagInspectedQty: 2000,
  status: 'COMPLETED'
}]);
txs = getMantriTodayTransactions(userMantri, todayStr);
const foundA = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-I/AAA');
const foundB = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-I/BBB');
assert(!foundA, 'Parent A (0 execution) TIDAK MUNCUL');
assert(Boolean(foundB), 'Parent B (>=1 execution) MUNCUL');

// IT-UNIV-SEL-013: CULL/001 existing + valid execution -> SUBMITTED_TO_ASB / Data Terkonfirmasi
console.log('\n--- IT-UNIV-SEL-013: Existing CULL/001 with Valid Execution ---');
resetStorage();
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{
  id: 'SEL-DOC-2026-001',
  docNo: '2026/CULL/001',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_I',
  tanggalSeleksi: todayStr,
  status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
  isCompleted: true,
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
    status: 'MENUNGGU_VERIFIKASI'
  },
  {
    id: 'SEL-TX-001-B',
    docNo: '2026/CULL/001-02',
    parentSelectionDocumentId: 'SEL-DOC-2026-001',
    parentSelectionDocNo: '2026/CULL/001',
    selectionStage: 'SELEKSI_I',
    actualPolybagInspectedQty: 1000,
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
let foundCull001 = txs.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/CULL/001');
assert(Boolean(foundCull001), 'Existing CULL/001 MUNCUL di Central Hub');
assert(foundCull001 && foundCull001.status === MANTRI_TRANSACTION_STATUS.SUBMITTED_TO_ASB, 'CULL/001 berstatus SUBMITTED_TO_ASB (Data Terkonfirmasi)');

// IT-UNIV-SEL-014: Central Hub badge calculation accuracy
console.log('\n--- IT-UNIV-SEL-014: Central Hub Badge Calculation Accuracy ---');
const selModuleTxs = txs.filter(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI);
assert(selModuleTxs.length === 1, 'Badge count Seleksi Pra-Okulasi tepat bernilai 1 (Parent tanpa execution tidak dihitung)');

// IT-UNIV-SEL-015: No Storage Mutation Guarantee
console.log('\n--- IT-UNIV-SEL-015: No Storage Mutation Guarantee ---');
const snapBeforePre = JSON.stringify(storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []));
const snapBeforeSel = JSON.stringify(storage.get(SELECTION_STORAGE_KEY, []));
const snapBeforeVer = JSON.stringify(storage.get(VERIFICATION_STORAGE_KEY, []));

// Evaluate getMantriTodayTransactions
getMantriTodayTransactions(userMantri, todayStr);

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
