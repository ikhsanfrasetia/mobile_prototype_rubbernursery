/**
 * tests/test-pindah-semai-tx-card-ditolak.js
 * Integration Test for Jumlah Ditolak/Seleksi on Pindah Semai Transaction Cards
 */

// Mock localStorage
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import { storage } from '../js/core/storage.js';
import { renderPindahSemaiTabContent } from '../js/modules/seeding/seeding-landing.js';
import { getEligiblePindahSemaiSources } from '../js/modules/seeding/dederan-pindah-semai-adapter.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('========================================================');
console.log('TEST SUITE: PINDAH SEMAI TRANSACTION CARD DITOLAK DISPLAY');
console.log('========================================================\n');

// Mock helper
function setupMockSources() {
  localStorage.clear();
  storage.set('dederan_transactions', [
    {
      id: 'DED-TX-001',
      docNo: '2026/DED/001',
      parentDederIndukDocNo: '2026/DDR/001',
      bedenganId: 'BED-001',
      bedenganCode: 'B-01',
      klon: 'GT 1',
      jumlahDeder: 9000,
      tanggalDeder: '2026-03-01'
    }
  ]);
  storage.set('dederan_inspections', [
    {
      id: 'DED-INS-001',
      docNo: '2026/INS/001',
      dederanTxDocNo: '2026/DED/001',
      dederanTxId: 'DED-TX-001',
      jumlahDiperiksa: 9000,
      jumlahBerhasil: 9000,
      jumlahTidakBerhasil: 0,
      status: 'DISETUJUI',
      isFinal: true
    }
  ]);
  storage.set('selection_transactions', []);
}

// IT-PINDAH-SEMAI-UI-001: ditolak > 0 -> baris ditampilkan
console.log('--- Test 1: IT-PINDAH-SEMAI-UI-001 (ditolak > 0 -> Baris Ditampilkan) ---');
setupMockSources();
const seedingTx1 = [
  {
    docNo: '2026/SOW/001',
    sourceDocNo: '2026/DED/001',
    klon: 'GT 1',
    bedengan: 'Bedengan 001',
    batchCode: 'B-001',
    date: '2026-03-05',
    totalDisemai: 8900,
    totalPolybag: 4450,
    ditolak: 100,
    alasanDitolak: 'Rusak'
  }
];
storage.set('seeding_transactions', seedingTx1);
let sources = getEligiblePindahSemaiSources();
let html1 = renderPindahSemaiTabContent(sources, seedingTx1);

assert(html1.includes('Jumlah Ditolak/Seleksi'), 'HTML contains "Jumlah Ditolak/Seleksi" label');
assert(html1.includes('100 Pkk'), 'HTML contains "100 Pkk" value');
assert(html1.includes('8.900 Pkk'), 'HTML contains "8.900 Pkk" for Bibit Disemai');
assert(html1.includes('4.450 Ply'), 'HTML contains "4.450 Ply" for Polybag Terisi');

// IT-PINDAH-SEMAI-UI-002: ditolak = 0 -> baris tidak ditampilkan
console.log('\n--- Test 2: IT-PINDAH-SEMAI-UI-002 (ditolak = 0 -> Baris TIDAK Ditampilkan) ---');
setupMockSources();
const seedingTx2 = [
  {
    docNo: '2026/SOW/002',
    sourceDocNo: '2026/DED/001',
    klon: 'GT 1',
    bedengan: 'Bedengan 001',
    batchCode: 'B-001',
    date: '2026-03-05',
    totalDisemai: 9000,
    totalPolybag: 4500,
    ditolak: 0
  }
];
storage.set('seeding_transactions', seedingTx2);
sources = getEligiblePindahSemaiSources();
let html2 = renderPindahSemaiTabContent(sources, seedingTx2);

assert(!html2.includes('Jumlah Ditolak/Seleksi'), 'HTML DOES NOT contain "Jumlah Ditolak/Seleksi" when ditolak = 0');
assert(html2.includes('9.000 Pkk'), 'HTML contains "9.000 Pkk"');

// IT-PINDAH-SEMAI-UI-003: ditolak null/undefined/empty -> baris tidak ditampilkan
console.log('\n--- Test 3: IT-PINDAH-SEMAI-UI-003 (ditolak null/undefined/empty -> Baris TIDAK Ditampilkan) ---');
setupMockSources();
const seedingTx3 = [
  {
    docNo: '2026/SOW/003',
    sourceDocNo: '2026/DED/001',
    totalDisemai: 5000,
    totalPolybag: 2500,
    ditolak: null
  },
  {
    docNo: '2026/SOW/004',
    sourceDocNo: '2026/DED/001',
    totalDisemai: 3000,
    totalPolybag: 1500,
    ditolak: ''
  },
  {
    docNo: '2026/SOW/005',
    sourceDocNo: '2026/DED/001',
    totalDisemai: 1000,
    totalPolybag: 500
    // ditolak is undefined
  }
];
storage.set('seeding_transactions', seedingTx3);
sources = getEligiblePindahSemaiSources();
let html3 = renderPindahSemaiTabContent(sources, seedingTx3);

assert(!html3.includes('Jumlah Ditolak/Seleksi'), 'HTML DOES NOT contain "Jumlah Ditolak/Seleksi" for null/empty/undefined ditolak');

// IT-PINDAH-SEMAI-UI-004: Multi-transaksi -> masing-masing card menampilkan nilai Ditolak miliknya
console.log('\n--- Test 4: IT-PINDAH-SEMAI-UI-004 (Multi-transaksi Individual Ditolak Display) ---');
setupMockSources();
const seedingTx4 = [
  {
    docNo: '2026/SOW/001',
    sourceDocNo: '2026/DED/001',
    totalDisemai: 4000,
    totalPolybag: 2000,
    ditolak: 100
  },
  {
    docNo: '2026/SOW/002',
    sourceDocNo: '2026/DED/001',
    totalDisemai: 4850,
    totalPolybag: 2425,
    ditolak: 50
  }
];
storage.set('seeding_transactions', seedingTx4);
sources = getEligiblePindahSemaiSources();
let html4 = renderPindahSemaiTabContent(sources, seedingTx4);

assert(html4.includes('100 Pkk') && html4.includes('50 Pkk'), 'HTML contains both 100 Pkk and 50 Pkk for respective cards');
assert(!html4.includes('150 Pkk'), 'HTML DOES NOT aggregate to 150 Pkk on single card');

// IT-PINDAH-SEMAI-UI-005: Nilai Ditolak tidak mengubah remainingQty
console.log('\n--- Test 5: IT-PINDAH-SEMAI-UI-005 (remainingQty in Adapter Intact) ---');
let dedSource = sources.find(s => s.docNo === '2026/DED/001');
// 9000 - (4000 + 100) - (4850 + 50) = 9000 - 4100 - 4900 = 0
assert(dedSource && dedSource.remainingQty === 0, `remainingQty in Adapter is 0 (actual: ${dedSource?.remainingQty})`);

// IT-PINDAH-SEMAI-UI-006: Field existing tetap identik
console.log('\n--- Test 6: IT-PINDAH-SEMAI-UI-006 (Existing Fields Integrity) ---');
assert(html1.includes('Sumber Dederan') && html1.includes('2026/DED/001'), 'Contains Sumber Dederan');
assert(html1.includes('Klon') && html1.includes('GT 1'), 'Contains Klon');
assert(html1.includes('Bedengan Semai'), 'Contains Bedengan Semai');
assert(html1.includes('Kode Batch'), 'Contains Kode Batch');
assert(html1.includes('Tanggal Transaksi'), 'Contains Tanggal Transaksi');

// IT-PINDAH-SEMAI-UI-007: Formula remaining/status Pindah Semai tetap berfungsi
console.log('\n--- Test 7: IT-PINDAH-SEMAI-UI-007 (Remaining & Status Functionality) ---');
assert(dedSource.isFullyProcessed === true, 'isFullyProcessed is true');
assert(html1.includes('Seluruh Bibit Telah Selesai Pindah Semai'), 'Completed banner rendered when remaining == 0');

// IT-PINDAH-SEMAI-UI-008: Boundary/compatibility test (stx.ditolak = 0 vs stx.jumlahDitolak = 50)
console.log('\n--- Test 8: IT-PINDAH-SEMAI-UI-008 (Canonical Field Precedence stx.ditolak = 0 over legacy stx.jumlahDitolak = 50) ---');
setupMockSources();
const seedingTx8 = [
  {
    docNo: '2026/SOW/008',
    sourceDocNo: '2026/DED/001',
    totalDisemai: 9000,
    totalPolybag: 4500,
    ditolak: 0,
    jumlahDitolak: 50 // Legacy field should NOT override canonical 0
  }
];
storage.set('seeding_transactions', seedingTx8);
sources = getEligiblePindahSemaiSources();
let html8 = renderPindahSemaiTabContent(sources, seedingTx8);

assert(!html8.includes('Jumlah Ditolak/Seleksi'), 'HTML DOES NOT render Ditolak when canonical ditolak === 0 (legacy 50 ignored)');
assert(!html8.includes('50 Pkk'), 'HTML DOES NOT contain legacy "50 Pkk"');

console.log('\n========================================================');
console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
console.log('========================================================');

if (failed > 0) {
  process.exit(1);
}
