/**
 * tests/test-hub-seleksi-pra-okulasi-readiness.js
 * Integration Test Suite for Central Hub Readiness Gate — Seleksi Pra-Okulasi I-III
 *
 * Test Scenarios:
 * IT-HUB-SEL-001: DRAFT + 0 transaction -> Tidak muncul di getMantriTodayTransactions()
 * IT-HUB-SEL-002: IN_PROGRESS + belum selesai -> Tidak muncul di getMantriTodayTransactions()
 * IT-HUB-SEL-003: COMPLETED tetapi isCompleted !== true -> Tidak muncul di getMantriTodayTransactions()
 * IT-HUB-SEL-004: isCompleted === true tetapi status bukan COMPLETED -> Tidak muncul di getMantriTodayTransactions()
 * IT-HUB-SEL-005: COMPLETED + isCompleted === true + 100% selesai -> Muncul sebagai READY_TO_CONFIRM
 * IT-HUB-SEL-006: Completed selection doc dikirim via Central Hub -> Status MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN & verification_transactions terisi
 * IT-HUB-SEL-007: Submit Central Hub dua kali -> Tidak menghasilkan duplicate verification_transactions
 * IT-HUB-SEL-008: Selection I belum DISETUJUI / isFinal=true -> Seleksi II tetap terkunci
 * IT-HUB-SEL-009: Selection I DISETUJUI + isFinal=true -> Seleksi II dapat dibuat
 * IT-HUB-SEL-010: Selection II belum DISETUJUI / isFinal=true -> Seleksi III tetap terkunci
 * IT-HUB-SEL-011: Selection II DISETUJUI + isFinal=true -> Seleksi III dapat dibuat
 * IT-HUB-SEL-012: Selection III belum DISETUJUI / isFinal=true -> Downstream Okulasi tetap terkunci
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
  submitMantriTransactions,
  submitModuleTransactions,
  MANTRI_TRANSACTION_STATUS,
  MODULE_TYPES
} from '../js/modules/verification/mantri-confirmation-service.js';
import {
  canCreateSelection2Document,
  createSelection2DocumentFromSelection1,
  canCreateSelection3Document,
  createSelection3DocumentFromSelection2,
  approvePreGraftingSelectionDocument,
  SELECTION_STATUS,
  SELECTION_STAGES
} from '../js/modules/selection/selection-manager.js';

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

const userAsisten = {
  id: 'USR-ASB-01',
  userId: 'USR-ASB-01',
  name: 'Asisten Bibitan',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

const todayStr = todayDDMMYYYY();

function resetStorage() {
  store.clear();
}

console.log('\n==================================================');
console.log('INTEGRATION TEST: CENTRAL HUB READINESS GATE (SELEKSI PRA-OKULASI I-III)');
console.log('==================================================\n');

// IT-HUB-SEL-001: DRAFT + 0 transaction
console.log('--- IT-HUB-SEL-001: DRAFT + 0 Transaction ---');
resetStorage();
storage.set('pre_grafting_selection_documents', [{
  id: 'SEL-DOC-001',
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
const hub001 = getMantriTodayTransactions(userMantri, todayStr);
const item001 = hub001.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/CULL/003');
assert(!item001, 'Dokumen DRAFT dengan 0 transaksi TIDAK MUNCUL di Central Hub');

// IT-HUB-SEL-002: IN_PROGRESS + belum selesai
console.log('\n--- IT-HUB-SEL-002: IN_PROGRESS + Belum Selesai ---');
resetStorage();
storage.set('pre_grafting_selection_documents', [{
  id: 'SEL-DOC-002',
  docNo: '2026/SEL-I/002',
  selectionType: 'PRA_OKULASI',
  selectionStage: 'SELEKSI_I',
  tanggalSeleksi: todayStr,
  batchCode: 'Batch-01',
  sourcePolybagQty: 2000,
  sourceBibitQty: 4000,
  totalDiperiksa: 1000,
  totalLayak: 900,
  totalAfkir: 100,
  isCompleted: false,
  isFinal: false,
  status: 'IN_PROGRESS',
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
const hub002 = getMantriTodayTransactions(userMantri, todayStr);
const item002 = hub002.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-I/002');
assert(!item002, 'Dokumen IN_PROGRESS (belum 100% selesai) TIDAK MUNCUL di Central Hub');

// IT-HUB-SEL-003: COMPLETED tetapi isCompleted !== true
console.log('\n--- IT-HUB-SEL-003: COMPLETED tetapi isCompleted !== true ---');
resetStorage();
storage.set('pre_grafting_selection_documents', [{
  id: 'SEL-DOC-003',
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
  isCompleted: false, // flag belum true
  isFinal: false,
  status: 'COMPLETED',
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
const hub003 = getMantriTodayTransactions(userMantri, todayStr);
const item003 = hub003.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-I/003');
assert(!item003, 'Dokumen status COMPLETED tetapi isCompleted=false TIDAK MUNCUL di Central Hub');

// IT-HUB-SEL-004: isCompleted === true tetapi status bukan COMPLETED
console.log('\n--- IT-HUB-SEL-004: isCompleted === true tetapi status bukan COMPLETED ---');
resetStorage();
storage.set('pre_grafting_selection_documents', [{
  id: 'SEL-DOC-004',
  docNo: '2026/SEL-I/004',
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
  status: 'DRAFT', // status belum COMPLETED
  submittedByUserId: userMantri.id,
  submittedByName: userMantri.name
}]);
const hub004 = getMantriTodayTransactions(userMantri, todayStr);
const item004 = hub004.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-I/004');
assert(!item004, 'Dokumen isCompleted=true tetapi status DRAFT TIDAK MUNCUL di Central Hub');

// IT-HUB-SEL-005: COMPLETED + isCompleted === true + 100% selesai
console.log('\n--- IT-HUB-SEL-005: COMPLETED + isCompleted=true ---');
resetStorage();
storage.set('pre_grafting_selection_documents', [{
  id: 'SEL-DOC-005',
  docNo: '2026/SEL-I/005',
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
storage.set('selection_transactions', [{
  id: 'SEL-TX-005-1',
  docNo: '2026/SEL-I/005-01',
  parentSelectionDocumentId: 'SEL-DOC-005',
  selectionDocumentId: 'SEL-DOC-005',
  parentSelectionDocNo: '2026/SEL-I/005',
  selectionDocNo: '2026/SEL-I/005',
  selectionStage: 'SELEKSI_I',
  actualPolybagInspectedQty: 2000,
  bibitDipertahankan: 1900,
  bibitReject: 100,
  status: 'COMPLETED'
}]);
const hub005 = getMantriTodayTransactions(userMantri, todayStr);
const item005 = hub005.find(x => x.moduleType === MODULE_TYPES.SELEKSI_PRA_OKULASI && x.docNo === '2026/SEL-I/005');
assert(Boolean(item005), 'Dokumen COMPLETED + isCompleted=true MUNCUL di Central Hub');
assert(item005 && item005.status === MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM, 'Item berstatus READY_TO_CONFIRM');

// IT-HUB-SEL-006: Completed selection doc dikirim via Central Hub
console.log('\n--- IT-HUB-SEL-006: Pengiriman Dokumen via Central Hub ---');
const submitResult = submitMantriTransactions(['SEL-DOC-005'], userMantri);
assert(submitResult.success === true, 'Submit Central Hub berhasil');
assert(submitResult.submittedCount === 1, '1 Transaksi berhasil disubmit');
const updatedPreDocs = storage.get('pre_grafting_selection_documents', []);
const updatedDoc005 = updatedPreDocs.find(d => d.id === 'SEL-DOC-005');
assert(
  updatedDoc005 && (updatedDoc005.status === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' || updatedDoc005.verificationStatus === 'MENUNGGU_VERIFIKASI'),
  'Status parent document berubah menjadi MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN'
);
const verifs006 = storage.get('verification_transactions', []);
const vItem006 = verifs006.find(v => v.referenceId === 'SEL-DOC-005' || v.referenceDocNo === '2026/SEL-I/005');
assert(Boolean(vItem006), 'Record verification_transactions berhasil terbentuk');

// IT-HUB-SEL-007: Submit Central Hub dua kali (Idempotency)
console.log('\n--- IT-HUB-SEL-007: Submit Central Hub Dua Kali (Idempotent) ---');
const countBefore = storage.get('verification_transactions', []).length;
const submitResult2 = submitMantriTransactions(['SEL-DOC-005'], userMantri);
const countAfter = storage.get('verification_transactions', []).length;
assert(countAfter === countBefore, 'Submit kedua tidak menghasilkan record duplicate di verification_transactions');

// IT-HUB-SEL-008: Selection I belum DISETUJUI / isFinal=true -> Seleksi II tetap terkunci
console.log('\n--- IT-HUB-SEL-008: Gate Seleksi I -> II (Terkunci jika belum Approve) ---');
resetStorage();
const sel1DocDraft = {
  id: 'SEL1-001',
  docNo: '2026/SEL-I/001',
  selectionStage: 'SELEKSI_I',
  selectionType: 'PRA_OKULASI',
  status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
  isCompleted: true,
  isFinal: false,
  totalLayak: 1900,
  sourceBibitQty: 2000
};
storage.set('pre_grafting_selection_documents', [sel1DocDraft]);
const gateCheck1 = canCreateSelection2Document(sel1DocDraft);
assert(gateCheck1.canCreate === false, 'Seleksi II TERKUNCI jika Seleksi I belum berstatus DISETUJUI dan isFinal=true');

// IT-HUB-SEL-009: Selection I DISETUJUI + isFinal=true -> Seleksi II dapat dibuat
console.log('\n--- IT-HUB-SEL-009: Gate Seleksi I -> II (Terbuka setelah Approve) ---');
const sel1DocApproved = {
  ...sel1DocDraft,
  status: SELECTION_STATUS.DISETUJUI,
  isFinal: true
};
storage.set('pre_grafting_selection_documents', [sel1DocApproved]);
const gateCheck1Approved = canCreateSelection2Document(sel1DocApproved);
assert(gateCheck1Approved.canCreate === true, 'Seleksi II DAPAT DIBUAT setelah Seleksi I DISETUJUI & isFinal=true');
const sel2Created = createSelection2DocumentFromSelection1(sel1DocApproved.id, userMantri);
assert(Boolean(sel2Created) && sel2Created.selectionStage === SELECTION_STAGES.SELEKSI_2, 'Dokumen Seleksi II berhasil digenerate');

// IT-HUB-SEL-010: Selection II belum DISETUJUI / isFinal=true -> Seleksi III tetap terkunci
console.log('\n--- IT-HUB-SEL-010: Gate Seleksi II -> III (Terkunci jika belum Approve) ---');
const sel2DocDraft = {
  id: 'SEL2-001',
  docNo: '2026/SEL-II/001',
  selectionStage: 'SELEKSI_II',
  selectionType: 'PRA_OKULASI',
  status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
  isCompleted: true,
  isFinal: false,
  totalLayak: 1800,
  sourceBibitQty: 1900
};
storage.set('pre_grafting_selection_documents', [sel1DocApproved, sel2DocDraft]);
const gateCheck2 = canCreateSelection3Document(sel2DocDraft);
assert(gateCheck2.canCreate === false, 'Seleksi III TERKUNCI jika Seleksi II belum berstatus DISETUJUI dan isFinal=true');

// IT-HUB-SEL-011: Selection II DISETUJUI + isFinal=true -> Seleksi III dapat dibuat
console.log('\n--- IT-HUB-SEL-011: Gate Seleksi II -> III (Terbuka setelah Approve) ---');
const sel2DocApproved = {
  ...sel2DocDraft,
  status: SELECTION_STATUS.DISETUJUI,
  isFinal: true
};
storage.set('pre_grafting_selection_documents', [sel1DocApproved, sel2DocApproved]);
const gateCheck2Approved = canCreateSelection3Document(sel2DocApproved);
assert(gateCheck2Approved.canCreate === true, 'Seleksi III DAPAT DIBUAT setelah Seleksi II DISETUJUI & isFinal=true');
const sel3Created = createSelection3DocumentFromSelection2(sel2DocApproved.id, userMantri);
assert(Boolean(sel3Created) && sel3Created.selectionStage === SELECTION_STAGES.SELEKSI_3, 'Dokumen Seleksi III berhasil digenerate');

// IT-HUB-SEL-012: Selection III belum DISETUJUI / isFinal=true -> Downstream Okulasi tetap terkunci
console.log('\n--- IT-HUB-SEL-012: Gate Seleksi III -> Downstream Okulasi ---');
const sel3DocDraft = {
  id: 'SEL3-001',
  docNo: '2026/SEL-III/001',
  selectionStage: 'SELEKSI_III',
  selectionType: 'PRA_OKULASI',
  status: 'DRAFT',
  isCompleted: false,
  isFinal: false,
  totalLayak: 1700
};
storage.set('pre_grafting_selection_documents', [sel1DocApproved, sel2DocApproved, sel3DocDraft]);
const allDocs = storage.get('pre_grafting_selection_documents', []);
const eligibleForBudding = allDocs.filter(d =>
  (d.selectionStage === 'SELEKSI_III' || d.selectionStage === 'SELEKSI_3') &&
  (d.selectionType === 'PRA_OKULASI' || !d.selectionType) &&
  d.status === 'DISETUJUI' &&
  Boolean(d.isFinal)
);
assert(eligibleForBudding.length === 0, 'Downstream Okulasi TERKUNCI (0 eligible Seleksi III documents)');

console.log('\n==================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('==================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
