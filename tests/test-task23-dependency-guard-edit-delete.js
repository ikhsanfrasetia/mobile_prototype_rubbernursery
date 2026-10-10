/**
 * tests/test-task23-dependency-guard-edit-delete.js
 * Comprehensive Test Suite for Task 23: Dependency Guard for Edit & Delete Operations.
 */

import { storage } from '../js/core/storage.js';
import { findDownstreamDependency, guardDependency, validateSourceEditability } from '../js/core/dependency-guard.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('====================================================');
console.log('STARTING TESTS: TASK 23 DEPENDENCY GUARD EDIT & DELETE');
console.log('====================================================\n');

// 1. In-memory Mock Storage Setup
const mockDb = {};
storage.get = (key, fallback = null) => {
  return mockDb[key] !== undefined ? JSON.parse(JSON.stringify(mockDb[key])) : fallback;
};
storage.set = (key, val) => {
  mockDb[key] = JSON.parse(JSON.stringify(val));
};

// Reset mock DB
function resetDb() {
  for (const k in mockDb) delete mockDb[k];
  mockDb['receipt_transactions'] = [];
  mockDb['dederan_transactions'] = [];
  mockDb['dederan_induk_documents'] = [];
  mockDb['dederan_inspection_transactions'] = [];
  mockDb['seeding_transactions'] = [];
  mockDb['pre_grafting_selection_documents'] = [];
  mockDb['selection_transactions'] = [];
  mockDb['budding_transactions'] = [];
  mockDb['inspection_transactions'] = [];
  mockDb['selection_pool'] = [];
}

// ==========================================
// TEST 1: Sumber Tanpa Dependency
// ==========================================
console.log('--- TEST 1: Sumber Tanpa Dependency ---');
resetDb();

const standaloneReceipt = {
  id: 'RCP-001',
  docNo: '2026/APR/001',
  diterima: 1000
};
mockDb['receipt_transactions'].push(standaloneReceipt);

const dep1 = findDownstreamDependency(standaloneReceipt);
assert(dep1 === null, 'No downstream dependency found for standalone receipt');
assert(guardDependency(standaloneReceipt, 'Penerimaan', 'Dihapus') === false, 'guardDependency returns false (not blocked) for standalone receipt');

// ==========================================
// TEST 2: Dependency Aktif Memblokir Delete
// ==========================================
console.log('--- TEST 2: Dependency Aktif Memblokir Delete ---');
resetDb();

// 2A: Receipt has active Dederan child
mockDb['receipt_transactions'] = [
  { id: 'RCP-001', docNo: '2026/APR/001', totalDiterima: 500 }
];
mockDb['dederan_transactions'] = [
  { id: 'DED-TX-001', docNo: '2026/DED/001', sourceReceiptDocNo: '2026/APR/001', jumlahDeder: 200, status: 'READY_TO_CONFIRM' }
];

const depReceipt = findDownstreamDependency('2026/APR/001');
assert(depReceipt !== null, 'Downstream Dederan detected for Receipt');
assert(depReceipt.docNo === '2026/DED/001', 'Identifies correct child Dederan docNo');
assert(depReceipt.moduleName.includes('Dederan'), 'Identifies Dederan module name');
assert(guardDependency('2026/APR/001', 'Penerimaan', 'Dihapus') === true, 'Delete blocked for Receipt with active Dederan child');

// 2B: Dederan has active Pindah Semai child
mockDb['seeding_transactions'] = [
  { id: 'SOW-TX-001', docNo: '2026/SOW/001', dederanTxDocNo: '2026/DED/001', jumlahBibitDipindahkan: 180, status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' }
];

const depDeder = findDownstreamDependency({ id: 'DED-TX-001', docNo: '2026/DED/001' });
assert(depDeder !== null, 'Downstream Pindah Semai detected for Dederan');
assert(depDeder.docNo === '2026/SOW/001', 'Identifies correct Pindah Semai docNo');
assert(guardDependency({ id: 'DED-TX-001', docNo: '2026/DED/001' }, 'Dederan', 'Dihapus') === true, 'Delete blocked for Dederan with active Pindah Semai');

// 2C: Seleksi III has active Budding Grafting child
mockDb['pre_grafting_selection_documents'] = [
  { id: 'SEL3-001', docNo: '2026/SEL-III/001', selectionStage: 'SELEKSI_III', isFinal: true, status: 'DISETUJUI' }
];
mockDb['budding_transactions'] = [
  { id: 'GRF-001', docNo: '2026/GRF/001', type: 'GRAFTING', sourceSelection3DocNo: '2026/SEL-III/001', jumlah: 150, status: 'DISETUJUI' }
];

const depSel3 = findDownstreamDependency('2026/SEL-III/001');
assert(depSel3 !== null, 'Downstream Okulasi Grafting detected for Seleksi III');
assert(depSel3.docNo === '2026/GRF/001', 'Identifies correct Grafting docNo');
assert(depSel3.moduleName.includes('Grafting'), 'Identifies Okulasi Grafting module');
assert(guardDependency('2026/SEL-III/001', 'Seleksi III', 'Dihapus') === true, 'Delete blocked for Seleksi III with active Grafting');

// 2D: Budding has active Inspection child
mockDb['inspection_transactions'] = [
  { id: 'INS-001', docNo: '2026/INS/001', buddingDocNo: '2026/GRF/001', jumlahDiperiksa: 150, status: 'READY_TO_CONFIRM' }
];

const depGraft = findDownstreamDependency({ id: 'GRF-001', docNo: '2026/GRF/001' });
assert(depGraft !== null, 'Downstream Inspection detected for Grafting');
assert(depGraft.docNo === '2026/INS/001', 'Identifies correct Inspection docNo');
assert(guardDependency({ id: 'GRF-001', docNo: '2026/GRF/001' }, 'Okulasi (Grafting)', 'Dihapus') === true, 'Delete blocked for Grafting with active Inspection');

// ==========================================
// TEST 3: Dependency Berstatus Pembatalan Valid Tidak Memblokir
// ==========================================
console.log('--- TEST 3: Dependency Berstatus Pembatalan Valid Tidak Memblokir ---');
resetDb();

// 3A: Receipt has only BATAL / CANCELLED Dederan
mockDb['receipt_transactions'] = [
  { id: 'RCP-002', docNo: '2026/APR/002', totalDiterima: 500 }
];
mockDb['dederan_transactions'] = [
  { id: 'DED-TX-BATAL', docNo: '2026/DED/BATAL', sourceReceiptDocNo: '2026/APR/002', jumlahDeder: 200, status: 'BATAL' },
  { id: 'DED-TX-VOID', docNo: '2026/DED/VOID', sourceReceiptDocNo: '2026/APR/002', jumlahDeder: 100, verificationStatus: 'CANCELLED' }
];

const depReceiptCancelled = findDownstreamDependency('2026/APR/002');
assert(depReceiptCancelled === null, 'Cancelled downstream Dederan does NOT block Receipt');
assert(guardDependency('2026/APR/002', 'Penerimaan', 'Dihapus') === false, 'Receipt deletion allowed when downstream txs are cancelled');

// 3B: Budding has only BATAL Inspection
mockDb['budding_transactions'] = [
  { id: 'GRF-002', docNo: '2026/GRF/002', type: 'GRAFTING', jumlah: 200, status: 'DISETUJUI' }
];
mockDb['inspection_transactions'] = [
  { id: 'INS-BATAL', docNo: '2026/INS/BATAL', buddingDocNo: '2026/GRF/002', jumlahDiperiksa: 200, status: 'BATAL' }
];

const depGraftCancelled = findDownstreamDependency('2026/GRF/002');
assert(depGraftCancelled === null, 'Cancelled downstream Inspection does NOT block Budding');
assert(guardDependency('2026/GRF/002', 'Okulasi (Grafting)', 'Dihapus') === false, 'Budding deletion allowed when downstream inspection is cancelled');

// ==========================================
// TEST 4: Edit Kuantitas yang Tidak Mencukupi Downstream Diblokir
// ==========================================
console.log('--- TEST 4: Edit Kuantitas yang Tidak Mencukupi Downstream Diblokir ---');
resetDb();

// Dederan with approved Pindah Semai (100) & Seleksi Pra-Semai (30) -> total committed = 130
mockDb['seeding_transactions'] = [
  { id: 'SOW-01', docNo: '2026/SOW/01', dederanTxDocNo: '2026/DED/001', jumlahBibitDipindahkan: 100, status: 'DISETUJUI' }
];
mockDb['selection_transactions'] = [
  { id: 'SEL-01', docNo: '2026/SEL/01', dederanTxDocNo: '2026/DED/001', stage: 'SELEKSI_PRA_SEMAI', jumlahAfkirTotal: 30, status: 'DISETUJUI' }
];

// Reducing Dederan below 130 (e.g. 120) must be blocked
const illegalEdit = validateSourceEditability('DEDERAN', '2026/DED/001', { jumlahDeder: 120 });
assert(illegalEdit.allowed === false, 'Quantity reduction below committed downstream physical consumption is blocked');
assert(illegalEdit.reason.includes('130'), 'Reason specifies minimum required consumption');
assert(Boolean(illegalEdit.blockingDocNo), 'Identifies blocking downstream document number');

// Reducing Budding below approved Inspection
mockDb['inspection_transactions'] = [
  { id: 'INS-01', docNo: '2026/INS/01', buddingDocNo: '2026/GRF/001', jumlahDiperiksa: 150, status: 'DISETUJUI' }
];
const illegalBuddingEdit = validateSourceEditability('BUDDING', '2026/GRF/001', { jumlahOkulasi: 100 });
assert(illegalBuddingEdit.allowed === false, 'Quantity reduction of Budding below approved inspection is blocked');
assert(illegalBuddingEdit.blockingDocNo === '2026/INS/01', 'Identifies blocking inspection document number');

// ==========================================
// TEST 5: Edit Kuantitas yang Masih Mencukupi Diizinkan
// ==========================================
console.log('--- TEST 5: Edit Kuantitas yang Masih Mencukupi Diizinkan ---');

// Reducing Dederan above 130 (e.g. 140) is allowed
const legalEdit = validateSourceEditability('DEDERAN', '2026/DED/001', { jumlahDeder: 140 });
assert(legalEdit.allowed === true, 'Quantity reduction above committed downstream is allowed');

// Metadata-only edit (no quantity change) is always allowed
const metaEdit = validateSourceEditability('DEDERAN', '2026/DED/001', { catatan: 'Update catatan bedengan' });
assert(metaEdit.allowed === true, 'Metadata-only edit is allowed');
assert(metaEdit.isMetadataOnly === true, 'Recognized as metadata-only edit');

// ==========================================
// TEST 6: Fail-safe Handling & Edge Cases
// ==========================================
console.log('--- TEST 6: Fail-safe Handling & Edge Cases ---');

assert(findDownstreamDependency(null) === null, 'Handles null safely');
assert(findDownstreamDependency(undefined) === null, 'Handles undefined safely');
assert(findDownstreamDependency('') === null, 'Handles empty string safely');
assert(findDownstreamDependency({}) === null, 'Handles empty object safely');
assert(guardDependency(null, 'Modul', 'Dihapus') === false, 'guardDependency handles null safely');
assert(validateSourceEditability('UNKNOWN', null, null).allowed === true, 'validateSourceEditability handles unknown doc types safely');

// ==========================================
// TEST 7: Zero Mutation pada Operasi yang Ditolak
// ==========================================
console.log('--- TEST 7: Zero Mutation pada Operasi yang Ditolak ---');
resetDb();

mockDb['receipt_transactions'] = [
  { id: 'RCP-PROTECTED', docNo: '2026/APR/999', totalDiterima: 1000 }
];
mockDb['dederan_transactions'] = [
  { id: 'DED-CHILD', docNo: '2026/DED/999', sourceReceiptDocNo: '2026/APR/999', jumlahDeder: 500, status: 'READY_TO_CONFIRM' }
];

const stateBefore = JSON.stringify(mockDb);

// Guard blocks deletion
const isBlocked = guardDependency('2026/APR/999', 'Penerimaan', 'Dihapus');
assert(isBlocked === true, 'Operation is strictly blocked');

const stateAfter = JSON.stringify(mockDb);
assert(stateBefore === stateAfter, 'Zero Data Mutation: Storage remains completely identical after blocked operation');

// ==========================================
// TEST 8: Downstream Reference Details di Peringatan
// ==========================================
console.log('--- TEST 8: Downstream Reference Details di Peringatan ---');
resetDb();

mockDb['budding_transactions'] = [
  { id: 'GRF-REF', docNo: '2026/GRF/REF-01', type: 'GRAFTING', status: 'DISETUJUI' }
];
mockDb['inspection_transactions'] = [
  { id: 'INS-REF', docNo: '2026/INS/REF-01', buddingDocNo: '2026/GRF/REF-01', status: 'READY_TO_CONFIRM' }
];

const detail = findDownstreamDependency('2026/GRF/REF-01');
assert(detail !== null, 'Dependency details found');
assert(detail.docNo === '2026/INS/REF-01', 'Detail contains downstream docNo');
assert(detail.moduleName === 'Pemeriksaan Okulasi', 'Detail contains correct moduleName');
assert(detail.status === 'READY_TO_CONFIRM', 'Detail contains downstream status');
assert(detail.url === '/inspection', 'Detail contains direct navigation url');

console.log('\n====================================================');
console.log(`TEST SUITE FINISHED: ${passed} / ${total} ASSERTIONS PASSED`);
console.log('====================================================');
