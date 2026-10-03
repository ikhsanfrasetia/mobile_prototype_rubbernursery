/**
 * tests/test-asb-review-cull-pindah-semai-format.js
 * 
 * INTEGRATION TEST SUITE:
 * PENYERAGAMAN FORMAT HASIL PENGAJUAN MANTRI CULL PINDAH SEMAI
 * PADA PEMERIKSAAN HASIL SELEKSI ASISTEN BIBITAN
 * 
 * Test Cases:
 * IT-ASB-DISPLAY-001: REJECT_PENYEMAIAN renders single reject declaration header and labels:
 *                     'HASIL PENGAJUAN MANTRI', 'Diperiksa di Pindah Semai', 'Diajukan sebagai Afkir'
 * IT-ASB-DISPLAY-002: Pindah Semai checked=100, cull=100 -> '100 Pkk', '100 Pkk (100%)'
 * IT-ASB-DISPLAY-003: Dederan renders 'Diperiksa di Dederan' with unit 'Butir'
 * IT-ASB-DISPLAY-004: Pasca-Okulasi retains 3-column format: 'Diperiksa | Layak | Afkir'
 * IT-ASB-DISPLAY-005: Regrafting retains 3-column format: 'Diperiksa | Layak | Afkir'
 * IT-ASB-DISPLAY-006: Cross-domain isolation: Pindah Semai & Dederan (single reject), Pasca-Okulasi (3-column), no collision
 * IT-ASB-DISPLAY-007: Percentage calculation: 100/100 -> 100%
 * IT-ASB-DISPLAY-008: Zero checked protection: checked=0 -> 0%, no NaN, no Infinity
 * IT-ASB-DISPLAY-009: No storage mutation guarantee (BEFORE === AFTER)
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
  renderAsistenSelectionReview,
  SELECTION_STORAGE_KEY,
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  SELECTION_STATUS
} from '../js/modules/selection/selection-landing.js';

console.log('======================================================================');
console.log('INTEGRATION TEST: FORMAT HASIL PENGAJUAN MANTRI CULL PINDAH SEMAI');
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

const mockAsistenUser = {
  id: 'USR-ASB-01',
  name: 'Budi Santoso',
  position: 'Asisten Pembibitan',
  role: 'ASISTEN_BIBITAN'
};

function createMockApp() {
  return {
    _html: '',
    get innerHTML() { return this._html; },
    set innerHTML(val) { this._html = val; },
    querySelectorAll: () => [],
    querySelector: () => null
  };
}

// Reset storage before each test setup
function resetStorage() {
  storage.set('seeding_transactions', []);
  storage.set(SELECTION_STORAGE_KEY, []);
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  storage.set('batch_master', []);
}

// --- IT-ASB-DISPLAY-001 ---
runTest('IT-ASB-DISPLAY-001', 'REJECT_PENYEMAIAN renders HASIL PENGAJUAN MANTRI, Diperiksa di Pindah Semai, Diajukan sebagai Afkir', () => {
  resetStorage();
  const cullRecord = {
    id: 'CULL-SOW-001',
    docNo: '2026/CULL/003',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    sourceTransactionType: 'SEEDING',
    sourceDocNo: '2026/SOW/001',
    bedengan: 'BTCH-001',
    clone: 'PB 260',
    quantity: 100,
    jumlahDiperiksa: 100,
    jumlahAfkir: 100,
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
  };
  storage.set(SELECTION_STORAGE_KEY, [cullRecord]);

  const app = createMockApp();
  renderAsistenSelectionReview(app, mockAsistenUser);

  const html = app.innerHTML;
  assert.ok(html.includes('Hasil Pengajuan Mantri'), 'Harus terdapat label "Hasil Pengajuan Mantri"');
  assert.ok(html.includes('Diperiksa di Pindah Semai'), 'Harus terdapat label "Diperiksa di Pindah Semai"');
  assert.ok(html.includes('Diajukan sebagai Afkir'), 'Harus terdapat label "Diajukan sebagai Afkir"');
  assert.ok(!html.includes('Diperiksa di Dederan'), 'Tidak boleh memuat label Dederan');
});

// --- IT-ASB-DISPLAY-002 ---
runTest('IT-ASB-DISPLAY-002', 'Pindah Semai (checked=100, cull=100) -> 100 Pkk & 100 Pkk (100%)', () => {
  resetStorage();
  const cullRecord = {
    id: 'CULL-SOW-002',
    docNo: '2026/CULL/003',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    sourceDocNo: '2026/SOW/001',
    bedengan: 'BTCH-001',
    jumlahDiperiksa: 100,
    jumlahAfkir: 100,
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
  };
  storage.set(SELECTION_STORAGE_KEY, [cullRecord]);

  const app = createMockApp();
  renderAsistenSelectionReview(app, mockAsistenUser);

  const html = app.innerHTML;
  assert.ok(html.includes('100 Pkk'), 'Harus memformat jumlah dengan unit "100 Pkk"');
  assert.ok(html.includes('(100%)'), 'Harus menampilkan persentase "(100%)"');
});

// --- IT-ASB-DISPLAY-003 ---
runTest('IT-ASB-DISPLAY-003', 'Dederan renders Diperiksa di Dederan with unit Butir', () => {
  resetStorage();
  const cullDederan = {
    id: 'CULL-DED-001',
    docNo: '2026/CULL/001',
    originType: 'REJECT_DEDERAN',
    sourceModule: 'DEDERAN',
    sourceDocNo: '2026/DED/001',
    bedengan: 'DED-01',
    clone: 'GT 1',
    quantity: 1000,
    jumlahDiperiksa: 1000,
    jumlahAfkir: 50,
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
  };
  storage.set(SELECTION_STORAGE_KEY, [cullDederan]);

  const app = createMockApp();
  renderAsistenSelectionReview(app, mockAsistenUser);

  const html = app.innerHTML;
  assert.ok(html.includes('Diperiksa di Dederan'), 'Dederan harus memuat "Diperiksa di Dederan"');
  assert.ok(html.includes('1.000 Butir') || html.includes('1000 Butir'), 'Dederan harus menggunakan unit Butir untuk Diperiksa');
  assert.ok(html.includes('50 Butir'), 'Dederan harus menggunakan unit Butir untuk Afkir');
  assert.ok(html.includes('(5%)'), 'Harus menghitung 50/1000 = 5%');
  assert.ok(!html.includes('Diperiksa di Pindah Semai'), 'Dederan tidak boleh menampilkan Pindah Semai');
});

// --- IT-ASB-DISPLAY-004 ---
runTest('IT-ASB-DISPLAY-004', 'Pasca-Okulasi retains 3-column format (Diperiksa | Layak | Afkir)', () => {
  resetStorage();
  const okRecord = {
    id: 'CULL-OKU-001',
    docNo: '2026/CULL/005',
    originType: 'REJECT_OKULASI',
    sourceModule: 'BUDDING',
    sourceDocNo: '2026/BUD/001',
    batchCode: 'BATCH-OK-01',
    clone: 'PB 260',
    bedengan: 'BED-01',
    jumlahDiperiksa: 500,
    jumlahLayak: 450,
    jumlahAfkir: 50,
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
  };
  storage.set(SELECTION_STORAGE_KEY, [okRecord]);

  const app = createMockApp();
  renderAsistenSelectionReview(app, mockAsistenUser);

  const html = app.innerHTML;
  assert.ok(html.includes('Diperiksa'), 'Pasca-Okulasi harus memiliki kolom Diperiksa');
  assert.ok(html.includes('Layak'), 'Pasca-Okulasi harus memiliki kolom Layak');
  assert.ok(html.includes('Afkir'), 'Pasca-Okulasi harus memiliki kolom Afkir');
  assert.ok(html.includes('450'), 'Pasca-Okulasi harus menampilkan jumlah layak 450');
  assert.ok(html.includes('90%'), 'Pasca-Okulasi harus menampilkan persentase layak 90%');
  assert.ok(html.includes('10%'), 'Pasca-Okulasi harus menampilkan persentase afkir 10%');
  assert.ok(!html.includes('Diperiksa di Pindah Semai'), 'Pasca-Okulasi tidak boleh memuat single reject layout Pindah Semai');
  assert.ok(!html.includes('Diperiksa di Dederan'), 'Pasca-Okulasi tidak boleh memuat single reject layout Dederan');
});

// --- IT-ASB-DISPLAY-005 ---
runTest('IT-ASB-DISPLAY-005', 'Regrafting retains existing Pasca-Okulasi 3-column format', () => {
  resetStorage();
  const reRecord = {
    id: 'CULL-REBUD-001',
    docNo: '2026/CULL/006',
    originType: 'REJECT_REGRAFTING',
    sourceModule: 'BUDDING',
    sourceDocNo: '2026/REBUD/001',
    batchCode: 'BATCH-REBUD-01',
    clone: 'PB 260',
    bedengan: 'BED-02',
    jumlahDiperiksa: 200,
    jumlahLayak: 180,
    jumlahAfkir: 20,
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
  };
  storage.set(SELECTION_STORAGE_KEY, [reRecord]);

  const app = createMockApp();
  renderAsistenSelectionReview(app, mockAsistenUser);

  const html = app.innerHTML;
  assert.ok(html.includes('Diperiksa'), 'Regrafting harus memiliki kolom Diperiksa');
  assert.ok(html.includes('Layak'), 'Regrafting harus memiliki kolom Layak');
  assert.ok(html.includes('Afkir'), 'Regrafting harus memiliki kolom Afkir');
  assert.ok(html.includes('180'), 'Regrafting harus menampilkan jumlah layak 180');
  assert.ok(!html.includes('Diperiksa di Pindah Semai'), 'Regrafting tidak boleh menggunakan format single reject');
});

// --- IT-ASB-DISPLAY-006 ---
runTest('IT-ASB-DISPLAY-006', 'Cross-domain isolation: Pindah Semai, Dederan, and Pasca-Okulasi rendered correctly together', () => {
  resetStorage();
  const records = [
    {
      id: 'CULL-1',
      docNo: '2026/CULL/001',
      originType: 'REJECT_DEDERAN',
      sourceModule: 'DEDERAN',
      jumlahDiperiksa: 1000,
      jumlahAfkir: 1000,
      status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
    },
    {
      id: 'CULL-2',
      docNo: '2026/CULL/002',
      originType: 'REJECT_PENYEMAIAN',
      sourceModule: 'PENYEMAIAN',
      jumlahDiperiksa: 100,
      jumlahAfkir: 100,
      status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
    },
    {
      id: 'CULL-3',
      docNo: '2026/CULL/003',
      originType: 'REJECT_OKULASI',
      sourceModule: 'BUDDING',
      jumlahDiperiksa: 500,
      jumlahLayak: 400,
      jumlahAfkir: 100,
      status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
    }
  ];
  storage.set(SELECTION_STORAGE_KEY, records);

  const app = createMockApp();
  renderAsistenSelectionReview(app, mockAsistenUser);

  const html = app.innerHTML;
  assert.ok(html.includes('Diperiksa di Dederan'), 'Harus ada Dederan section');
  assert.ok(html.includes('Diperiksa di Pindah Semai'), 'Harus ada Pindah Semai section');
  assert.ok(html.includes('Layak'), 'Harus ada 3-column Pasca-Okulasi section');
});

// --- IT-ASB-DISPLAY-007 ---
runTest('IT-ASB-DISPLAY-007', 'Percentage calculation: 100 / 100 -> 100%, 25 / 100 -> 25%', () => {
  resetStorage();
  const cullRecord = {
    id: 'CULL-SOW-007',
    docNo: '2026/CULL/007',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    jumlahDiperiksa: 100,
    jumlahAfkir: 25,
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
  };
  storage.set(SELECTION_STORAGE_KEY, [cullRecord]);

  const app = createMockApp();
  renderAsistenSelectionReview(app, mockAsistenUser);

  const html = app.innerHTML;
  assert.ok(html.includes('(25%)'), '25 / 100 harus menghasilkan 25%');
});

// --- IT-ASB-DISPLAY-008 ---
runTest('IT-ASB-DISPLAY-008', 'Zero checked protection: checked = 0 -> 0%, no NaN, no Infinity', () => {
  resetStorage();
  const zeroRecord = {
    id: 'CULL-SOW-008',
    docNo: '2026/CULL/008',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    jumlahDiperiksa: 0,
    jumlahAfkir: 0,
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
  };
  storage.set(SELECTION_STORAGE_KEY, [zeroRecord]);

  const app = createMockApp();
  renderAsistenSelectionReview(app, mockAsistenUser);

  const html = app.innerHTML;
  assert.ok(html.includes('(0%)'), 'checked=0 harus menampilkan 0%');
  assert.ok(!html.includes('NaN'), 'Tidak boleh menghasilkan NaN');
  assert.ok(!html.includes('Infinity'), 'Tidak boleh menghasilkan Infinity');
});

// --- IT-ASB-DISPLAY-009 ---
runTest('IT-ASB-DISPLAY-009', 'No storage mutation guarantee (BEFORE === AFTER)', () => {
  resetStorage();
  const initSeedings = [{ id: 'SOW-1', docNo: '2026/SOW/001', totalDisemai: 1000 }];
  const initSelections = [
    {
      id: 'CULL-SOW-1',
      docNo: '2026/CULL/003',
      originType: 'REJECT_PENYEMAIAN',
      sourceModule: 'PENYEMAIAN',
      jumlahDiperiksa: 100,
      jumlahAfkir: 100,
      status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
    }
  ];
  storage.set('seeding_transactions', initSeedings);
  storage.set(SELECTION_STORAGE_KEY, initSelections);

  const beforeSeedings = JSON.stringify(storage.get('seeding_transactions', []));
  const beforeSelections = JSON.stringify(storage.get(SELECTION_STORAGE_KEY, []));

  const app = createMockApp();
  renderAsistenSelectionReview(app, mockAsistenUser);

  const afterSeedings = JSON.stringify(storage.get('seeding_transactions', []));
  const afterSelections = JSON.stringify(storage.get(SELECTION_STORAGE_KEY, []));

  assert.strictEqual(beforeSeedings, afterSeedings, 'seeding_transactions tidak boleh bermutasi');
  assert.strictEqual(beforeSelections, afterSelections, 'selection_transactions tidak boleh bermutasi');
});

console.log('======================================================================');
console.log(`TEST SUMMARY: PASS=${passCount}, FAIL=${failCount}, TOTAL=${passCount + failCount}`);
console.log('======================================================================');

if (failCount > 0) {
  process.exit(1);
}
