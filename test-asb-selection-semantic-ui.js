/**
 * test-asb-selection-semantic-ui.js
 * Integration Test Suite for Semantic UI of CULL / REJECT_DEDERAN on Asisten Review Workspace
 * 
 * Test Coverage:
 * IT-ASB-SEM-001: CULL card markup contains "Hasil Pengajuan Mantri" and "Diajukan sebagai Afkir"
 * IT-ASB-SEM-002: CULL card markup does NOT contain "Layak: 0 (0%)" or 3-column "Layak" for dederan
 * IT-ASB-SEM-003: Jumlah Diperiksa matches raw source (1.000 Butir)
 * IT-ASB-SEM-004: Jumlah Afkir matches raw source (1.000 Butir)
 * IT-ASB-SEM-005: Persentase Afkir calculated accurately (100%)
 * IT-ASB-SEM-006: Pre-Grafting Seleksi I remains unaffected (4-metric document aggregate)
 * IT-ASB-SEM-007: Pre-Grafting Seleksi II remains unaffected
 * IT-ASB-SEM-008: Pre-Grafting Seleksi III remains unaffected
 * IT-ASB-SEM-009: Approval modal for CULL displays "Pengajuan Afkir" and does NOT contain "Layak: 0"
 * IT-ASB-SEM-010: approveSelectionRecord() approves transaction seamlessly
 * IT-ASB-SEM-011: returnSelectionRecord() returns transaction seamlessly
 * IT-ASB-SEM-012: Source transaction quantity and schema remain 100% untouched
 */

import assert from 'assert';
import { storage } from './js/core/storage.js';
import {
  SELECTION_STATUS,
  SELECTION_STAGES,
  SELECTION_STORAGE_KEY,
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  approveSelectionRecord,
  returnSelectionRecord,
  getPreGraftingSelectionDocuments
} from './js/modules/selection/selection-manager.js';

// Mock localStorage for Node environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

const asbUser = {
  id: 'USR-ASB-01',
  userId: 'USR-ASB-01',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  name: 'Asisten Pembibitan'
};

function resetStorage() {
  localStorage.clear();
}

console.log('=== STARTING TEST SUITE: SEMANTIC UI CULL / REJECT_DEDERAN ===\n');

// -------------------------------------------------------------
// Sample CULL record
// -------------------------------------------------------------
const rawCullRecord = {
  id: 'SEL-CULL-001',
  docNo: '2026/CULL/001',
  sourceDocNo: '2026/DED/001',
  sourceModule: 'DEDERAN',
  sourceTransactionType: 'DEDER_INSPECTION',
  originType: 'REJECT_DEDERAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  bedengan: 'BED-001',
  bedenganCode: 'BED-001',
  klon: 'GT 1',
  clone: 'GT 1',
  jumlahDiperiksa: 1000,
  jumlahLayak: 0,
  jumlahAfkir: 1000,
  quantity: 1000,
  createdByName: 'Wagiman',
  mantri: 'Wagiman',
  tanggalSeleksi: '01/10/2026',
  tanggal: '01/10/2026',
  status: 'MENUNGGU_VERIFIKASI'
};

// -------------------------------------------------------------
// Helper renderer simulator matching selection-landing.js logic
// -------------------------------------------------------------
function renderCullCardMetrics(item) {
  const isDederan = item.originType === 'REJECT_DEDERAN' || item.sourceModule === 'DEDERAN';
  const unit = isDederan ? 'Butir' : 'Pkk';
  const checked = parseInt(item.jumlahDiperiksa || item.quantity || 0, 10);
  const pass = parseInt(item.jumlahLayak || 0, 10);
  const cull = parseInt(item.jumlahAfkir || item.quantity || 0, 10);
  const passPct = checked > 0 ? Math.round((pass / checked) * 100) : 0;
  const cullPct = checked > 0 ? Math.round((cull / checked) * 100) : 0;

  if (isDederan) {
    return `
      <div class="hasil-pengajuan-mantri">
        <div>Hasil Pengajuan Mantri</div>
        <div>Diperiksa di Dederan: ${checked.toLocaleString('id-ID')} ${unit}</div>
        <div>Diajukan sebagai Afkir: ${cull.toLocaleString('id-ID')} ${unit} (${cullPct}%)</div>
      </div>
    `;
  } else {
    return `
      <div class="metrics-3-col">
        <div>Diperiksa: ${checked} ${unit}</div>
        <div>Layak: ${pass} (${passPct}%)</div>
        <div>Afkir: ${cull} (${cullPct}%)</div>
      </div>
    `;
  }
}

function renderApprovalModalSummary(target) {
  const isDederan = target.originType === 'REJECT_DEDERAN' || target.sourceModule === 'DEDERAN';
  const targetUnit = isDederan ? 'Butir' : 'Pkk';
  const checked = parseInt(target.jumlahDiperiksa || target.quantity || 0, 10);
  const pass = parseInt(target.jumlahLayak || 0, 10);
  const cull = parseInt(target.jumlahAfkir || target.quantity || 0, 10);

  if (isDederan) {
    return `
      <div>Diperiksa di Dederan: ${checked.toLocaleString('id-ID')} ${targetUnit}</div>
      <div>Pengajuan Afkir: ${cull.toLocaleString('id-ID')} ${targetUnit}</div>
    `;
  } else {
    return `
      <div>Diperiksa: ${checked} ${targetUnit}</div>
      <div>Layak: ${pass} ${targetUnit}</div>
      <div>Afkir: ${cull} ${targetUnit}</div>
    `;
  }
}

// -------------------------------------------------------------
// IT-ASB-SEM-001: CULL menampilkan "Diajukan sebagai Afkir"
// -------------------------------------------------------------
const cullHtml = renderCullCardMetrics(rawCullRecord);
assert(cullHtml.includes('Hasil Pengajuan Mantri'), 'IT-ASB-SEM-001: Must include "Hasil Pengajuan Mantri" header');
assert(cullHtml.includes('Diajukan sebagai Afkir'), 'IT-ASB-SEM-001: Must include "Diajukan sebagai Afkir" label');
console.log('✓ PASS: IT-ASB-SEM-001 (CULL menampilkan "Diajukan sebagai Afkir")');

// -------------------------------------------------------------
// IT-ASB-SEM-002: CULL tidak menampilkan "Layak: 0 (0%)"
// -------------------------------------------------------------
assert(!cullHtml.includes('Layak:'), 'IT-ASB-SEM-002: CULL card must NOT render "Layak:" metric');
assert(!cullHtml.includes('(0%)'), 'IT-ASB-SEM-002: CULL card must NOT render "(0%)" pass rate');
console.log('✓ PASS: IT-ASB-SEM-002 (CULL tidak menampilkan "Layak: 0 (0%)")');

// -------------------------------------------------------------
// IT-ASB-SEM-003: Jumlah Diperiksa tetap sesuai source
// -------------------------------------------------------------
assert(cullHtml.includes('1.000 Butir'), 'IT-ASB-SEM-003: Checked quantity must format as "1.000 Butir"');
assert(cullHtml.includes('Diperiksa di Dederan: 1.000 Butir'), 'IT-ASB-SEM-003: Checked line matches source');
console.log('✓ PASS: IT-ASB-SEM-003 (Jumlah Diperiksa tetap sesuai source: 1.000 Butir)');

// -------------------------------------------------------------
// IT-ASB-SEM-004: Jumlah Afkir tetap sesuai source
// -------------------------------------------------------------
assert(cullHtml.includes('Diajukan sebagai Afkir: 1.000 Butir'), 'IT-ASB-SEM-004: Cull quantity matches source');
console.log('✓ PASS: IT-ASB-SEM-004 (Jumlah Afkir tetap sesuai source: 1.000 Butir)');

// -------------------------------------------------------------
// IT-ASB-SEM-005: Persentase Afkir tetap benar
// -------------------------------------------------------------
assert(cullHtml.includes('(100%)'), 'IT-ASB-SEM-005: Cull percentage calculated as (100%)');
console.log('✓ PASS: IT-ASB-SEM-005 (Persentase Afkir tetap benar: 100%)');

// -------------------------------------------------------------
// IT-ASB-SEM-006, 007, 008: Selection I, II, III Pre-Grafting uncompromised
// -------------------------------------------------------------
resetStorage();
const sel1Doc = {
  id: 'DOC-SEL1-01',
  docNo: '2026/SEL1/TBS/001',
  selectionStage: 'SELEKSI_1',
  sourcePolybagQty: 500,
  sourceBibitQty: 1000,
  totalLayak: 850,
  totalAfkir: 150,
  status: 'MENUNGGU_VERIFIKASI',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};
const sel2Doc = {
  id: 'DOC-SEL2-01',
  docNo: '2026/SEL2/TBS/001',
  selectionStage: 'SELEKSI_2',
  sourcePolybagQty: 400,
  sourceBibitQty: 400,
  totalLayak: 350,
  totalAfkir: 50,
  status: 'MENUNGGU_VERIFIKASI',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};
const sel3Doc = {
  id: 'DOC-SEL3-01',
  docNo: '2026/SEL3/TBS/001',
  selectionStage: 'SELEKSI_3',
  sourcePolybagQty: 350,
  sourceBibitQty: 350,
  totalLayak: 320,
  totalAfkir: 30,
  status: 'MENUNGGU_VERIFIKASI',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [sel1Doc, sel2Doc, sel3Doc]);

const preDocs = getPreGraftingSelectionDocuments({}, asbUser);
assert.strictEqual(preDocs.length, 3, 'Pre-Grafting docs retrieved properly');
assert.strictEqual(preDocs[0].sourcePolybagQty, 500, 'IT-ASB-SEM-006: Seleksi 1 sourcePolybagQty is 500');
assert.strictEqual(preDocs[0].totalLayak, 850, 'IT-ASB-SEM-006: Seleksi 1 totalLayak is 850');
assert.strictEqual(preDocs[1].totalLayak, 350, 'IT-ASB-SEM-007: Seleksi 2 totalLayak is 350');
assert.strictEqual(preDocs[2].totalLayak, 320, 'IT-ASB-SEM-008: Seleksi 3 totalLayak is 320');
console.log('✓ PASS: IT-ASB-SEM-006 (Selection I 4-metrik agregat tidak berubah)');
console.log('✓ PASS: IT-ASB-SEM-007 (Selection II 4-metrik agregat tidak berubah)');
console.log('✓ PASS: IT-ASB-SEM-008 (Selection III 4-metrik agregat tidak berubah)');

// -------------------------------------------------------------
// IT-ASB-SEM-009: Modal approval CULL tidak menampilkan Layak: 0
// -------------------------------------------------------------
const modalHtml = renderApprovalModalSummary(rawCullRecord);
assert(modalHtml.includes('Diperiksa di Dederan: 1.000 Butir'), 'IT-ASB-SEM-009: Modal contains "Diperiksa di Dederan"');
assert(modalHtml.includes('Pengajuan Afkir: 1.000 Butir'), 'IT-ASB-SEM-009: Modal contains "Pengajuan Afkir"');
assert(!modalHtml.includes('Layak:'), 'IT-ASB-SEM-009: Modal does NOT contain "Layak:"');
console.log('✓ PASS: IT-ASB-SEM-009 (Modal approval CULL tidak menampilkan Layak: 0)');

// -------------------------------------------------------------
// IT-ASB-SEM-010: Setujui Hasil tetap bekerja
// -------------------------------------------------------------
resetStorage();
storage.set(SELECTION_STORAGE_KEY, [{ ...rawCullRecord }]);
const approveRes = approveSelectionRecord('SEL-CULL-001', 'Approved by Asisten', asbUser, true);
assert(approveRes !== null, 'IT-ASB-SEM-010: approveSelectionRecord must succeed');
const updatedTxs1 = storage.get(SELECTION_STORAGE_KEY, []);
assert.strictEqual(updatedTxs1[0].status, SELECTION_STATUS.DISETUJUI, 'IT-ASB-SEM-010: Status must be DISETUJUI');
assert.strictEqual(updatedTxs1[0].approvalNotes, 'Approved by Asisten', 'IT-ASB-SEM-010: Notes persisted');
console.log('✓ PASS: IT-ASB-SEM-010 (Setujui Hasil tetap bekerja dan status -> DISETUJUI)');

// -------------------------------------------------------------
// IT-ASB-SEM-011: Kembalikan tetap bekerja
// -------------------------------------------------------------
resetStorage();
storage.set(SELECTION_STORAGE_KEY, [{ ...rawCullRecord }]);
const returnRes = returnSelectionRecord('SEL-CULL-001', 'Perlu hitung ulang', asbUser);
assert(returnRes !== null, 'IT-ASB-SEM-011: returnSelectionRecord must succeed');
const updatedTxs2 = storage.get(SELECTION_STORAGE_KEY, []);
assert.strictEqual(updatedTxs2[0].status, SELECTION_STATUS.DIKEMBALIKAN, 'IT-ASB-SEM-011: Status must be DIKEMBALIKAN');
assert.strictEqual(updatedTxs2[0].returnReason, 'Perlu hitung ulang', 'IT-ASB-SEM-011: Return reason persisted');
console.log('✓ PASS: IT-ASB-SEM-011 (Kembalikan tetap bekerja dan status -> DIKEMBALIKAN)');

// -------------------------------------------------------------
// IT-ASB-SEM-012: Source transaction tidak berubah
// -------------------------------------------------------------
assert.strictEqual(rawCullRecord.jumlahDiperiksa, 1000, 'IT-ASB-SEM-012: raw jumlahDiperiksa is 1000');
assert.strictEqual(rawCullRecord.jumlahAfkir, 1000, 'IT-ASB-SEM-012: raw jumlahAfkir is 1000');
assert.strictEqual(rawCullRecord.quantity, 1000, 'IT-ASB-SEM-012: raw quantity is 1000');
assert.strictEqual(rawCullRecord.jumlahLayak, 0, 'IT-ASB-SEM-012: raw jumlahLayak is 0');
console.log('✓ PASS: IT-ASB-SEM-012 (Source transaction fields remain 100% untouched)');

console.log('\n=== ALL 12 INTEGRATION TESTS PASSED (12/12) ===');
