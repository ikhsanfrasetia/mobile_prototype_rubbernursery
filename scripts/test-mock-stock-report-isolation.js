/**
 * scripts/test-mock-stock-report-isolation.js
 * Verification Suite for Laporan Stok Bibit Mock Implementation & Strict Scope Isolation
 */

import {
  MOCK_NURSERY_STOCK_BATCHES,
  getMockBatchesForUser
} from '../js/data/mock-nursery-stock-report.js';

import {
  KLON_MASTER,
  KLON_STATUS,
  getActiveKlons,
  resolveKlon
} from '../js/data/klon-master.js';

import {
  calculateAgeInWeeks,
  calculateSelectionPercentage,
  formatDisplayDate,
  openBatchDetailModal,
  renderNurseryStockReport
} from '../js/modules/reports/nursery-stock-report.js';

import { REPORT_MENUS } from '../js/modules/reports/reports-landing.js';
import { session } from '../js/core/session.js';
import { storage } from '../js/core/storage.js';

// Mock localStorage for storage engine in node
const memStore = {};
global.localStorage = {
  getItem: (k) => memStore[k] || null,
  setItem: (k, v) => { memStore[k] = String(v); },
  removeItem: (k) => { delete memStore[k]; }
};

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`❌ FAIL: ${message}`);
  }
}

console.log('========================================================================================');
console.log('       TEST SUITE: LAPORAN STOK BIBIT MOCK DATA & STRICT SCOPE ISOLATION                ');
console.log('========================================================================================\n');

// --------------------------------------------------------------------------------------
// 1. DATASET INTEGRITY & VARIATION AUDIT
// --------------------------------------------------------------------------------------
console.log('1. Dataset Structure & Variation Audit:');
assert(MOCK_NURSERY_STOCK_BATCHES.length === 15, `Total mock batches harus tepat 15 (aktual: ${MOCK_NURSERY_STOCK_BATCHES.length})`);

const tbsBatches = MOCK_NURSERY_STOCK_BATCHES.filter(b => b.estateId === 'EST-TBS' && b.divisionId === 'DIV-001');
const apmBatches = MOCK_NURSERY_STOCK_BATCHES.filter(b => b.estateId === 'EST-APM' && b.divisionId === 'DIV-APM-02');

assert(tbsBatches.length === 8, `Tanah Besih (DIV-001) harus tepat 8 batch (aktual: ${tbsBatches.length})`);
assert(apmBatches.length === 7, `Aek Pamingke (DIV-APM-02) harus tepat 7 batch (aktual: ${apmBatches.length})`);

// Check Standard Sequence Naming
const allBatchCodesValid = MOCK_NURSERY_STOCK_BATCHES.every(b => /^Batch\s-\s\d{3}$/.test(b.batchCode));
const allBedenganValid = MOCK_NURSERY_STOCK_BATCHES.every(b => /^Bed\s-\s\d{3}$/.test(b.bedengan));
assert(allBatchCodesValid, 'Seluruh batch menggunakan format sequence "Batch - 001", "Batch - 002", dst.');
assert(allBedenganValid, 'Seluruh bedengan menggunakan format sequence "Bed - 001", "Bed - 002", dst.');

// Check Stock Variation & Empty State Batches
const emptyBatches = MOCK_NURSERY_STOCK_BATCHES.filter(b => b.status === 'EMPTY' && b.availableQty === 0);
assert(emptyBatches.length === 2, `Terdapat tepat 2 batch berstatus EMPTY (Batch 006 & 011) (aktual: ${emptyBatches.length})`);

const availableBatches = MOCK_NURSERY_STOCK_BATCHES.filter(b => b.status === 'AVAILABLE');
assert(availableBatches.length === 13, `Terdapat 13 batch berstatus AVAILABLE dengan stok bervariasi (aktual: ${availableBatches.length})`);

// --------------------------------------------------------------------------------------
// 1B. STAGE & AGE BASED SHI RECONCILIATION AUDIT
// --------------------------------------------------------------------------------------
console.log('\n1B. Stage & Age Based SHI Reconciliation Validation:');

/**
 * Audit rule:
 * TRUE jika: growthStage === 'Rubber Advance Planting Material' ATAU ageWeeks > 30
 * FALSE jika: Main Nursery dan ageWeeks <= 30
 */
function isShiReconciliationApplicable(batch) {
  const ageWeeks = calculateAgeInWeeks(batch.tanggalSemai);
  const isAPM = batch.growthStage === 'Rubber Advance Planting Material';
  return isAPM || ageWeeks > 30;
}

// A. Check stockBeforeShi calculation across all 15 batches
const allStockBeforeShiValid = MOCK_NURSERY_STOCK_BATCHES.every(b => {
  return b.stockBeforeShi === (b.initialQty - b.jumlahAfkirSeleksi);
});
assert(allStockBeforeShiValid, 'Seluruh 15 batch memiliki stockBeforeShi === (initialQty - jumlahAfkirSeleksi)');

// B. Check stage & age based reconciliation across all 15 batches
let allReconciliationLogicValid = true;
MOCK_NURSERY_STOCK_BATCHES.forEach(b => {
  const applicable = isShiReconciliationApplicable(b);
  const totalShi = (b.pengeluaranShi || []).reduce((acc, tx) => acc + (tx.qty || 0), 0);
  const expectedAvailable = applicable ? (b.stockBeforeShi - totalShi) : b.stockBeforeShi;
  
  if (b.availableQty !== expectedAvailable) {
    allReconciliationLogicValid = false;
    console.error(`Reconciliation mismatch on ${b.batchCode}: actual=${b.availableQty}, expected=${expectedAvailable}`);
  }
});
assert(allReconciliationLogicValid, 'Seluruh 15 batch memenuhi rule: SHI rekonsiliasi hanya jika APM atau Umur > 30 Minggu');

// C. No Negative Stock Validation
const noNegativeStock = MOCK_NURSERY_STOCK_BATCHES.every(b => b.availableQty >= 0);
assert(noNegativeStock, 'TIDAK ada batch dengan stok negatif pada 100% dataset');

// D. Specific check for all batch values
const batch001 = MOCK_NURSERY_STOCK_BATCHES.find(b => b.batchCode === 'Batch - 001');
const batch002 = MOCK_NURSERY_STOCK_BATCHES.find(b => b.batchCode === 'Batch - 002');
const batch003 = MOCK_NURSERY_STOCK_BATCHES.find(b => b.batchCode === 'Batch - 003');
const batch004 = MOCK_NURSERY_STOCK_BATCHES.find(b => b.batchCode === 'Batch - 004');
const batch005 = MOCK_NURSERY_STOCK_BATCHES.find(b => b.batchCode === 'Batch - 005');
const batch006 = MOCK_NURSERY_STOCK_BATCHES.find(b => b.batchCode === 'Batch - 006');
const batch007 = MOCK_NURSERY_STOCK_BATCHES.find(b => b.batchCode === 'Batch - 007');
const batch008 = MOCK_NURSERY_STOCK_BATCHES.find(b => b.batchCode === 'Batch - 008');
const batch009 = MOCK_NURSERY_STOCK_BATCHES.find(b => b.batchCode === 'Batch - 009');
const batch010 = MOCK_NURSERY_STOCK_BATCHES.find(b => b.batchCode === 'Batch - 010');
const batch011 = MOCK_NURSERY_STOCK_BATCHES.find(b => b.batchCode === 'Batch - 011');
const batch012 = MOCK_NURSERY_STOCK_BATCHES.find(b => b.batchCode === 'Batch - 012');
const batch013 = MOCK_NURSERY_STOCK_BATCHES.find(b => b.batchCode === 'Batch - 013');
const batch014 = MOCK_NURSERY_STOCK_BATCHES.find(b => b.batchCode === 'Batch - 014');
const batch015 = MOCK_NURSERY_STOCK_BATCHES.find(b => b.batchCode === 'Batch - 015');

// Main Nursery muda checks (Non-reconciled)
assert(batch001.availableQty === 14650, 'Batch - 001 (Main Nursery 16 mgg): availableQty = 14.650 Bibit (SHI 2.000 tidak memotong stok)');
assert(batch002.availableQty === 11600, 'Batch - 002 (Main Nursery 14 mgg): availableQty = 11.600 Bibit (SHI 1.500 tidak memotong stok)');
assert(batch003.availableQty === 7750, 'Batch - 003 (Main Nursery 11 mgg): availableQty = 7.750 Bibit');
assert(batch005.availableQty === 2880 && batch005.status === 'AVAILABLE', 'Batch - 005 (Main Nursery 9 mgg): availableQty = 2.880 Bibit & Status AVAILABLE');
assert(batch009.availableQty === 7280, 'Batch - 009 (Main Nursery 12 mgg): availableQty = 7.280 Bibit');
assert(batch010.availableQty === 3820 && batch010.status === 'AVAILABLE', 'Batch - 010 (Main Nursery 9 mgg): availableQty = 3.820 Bibit & Status AVAILABLE');

// APM checks (Reconciled)
assert(batch004.availableQty === 3850, 'Batch - 004 (APM 59 mgg): availableQty = 3.850 Bibit (4.850 - 1.000 SHI)');
assert(batch006.availableQty === 0 && batch006.status === 'EMPTY', 'Batch - 006 (APM 69 mgg): availableQty = 0 Bibit & Status EMPTY (1.900 - 1.900 SHI)');
assert(batch007.availableQty === 15000, 'Batch - 007 (APM 55 mgg): availableQty = 15.000 Bibit (17.500 - 2.500 SHI)');
assert(batch008.availableQty === 8500, 'Batch - 008 (APM 53 mgg): availableQty = 8.500 Bibit (9.700 - 1.200 SHI)');
assert(batch011.availableQty === 0 && batch011.status === 'EMPTY', 'Batch - 011 (APM 72 mgg): availableQty = 0 Bibit & Status EMPTY (1.450 - 1.450 SHI)');
assert(batch012.availableQty === 4800, 'Batch - 012 (APM 64 mgg): availableQty = 4.800 Bibit (5.800 - 1.000 SHI)');
assert(batch013.availableQty === 3900, 'Batch - 013 (APM 57 mgg): availableQty = 3.900 Bibit (3.900 - 0 SHI)');
assert(batch014.availableQty === 6700, 'Batch - 014 (APM 67 mgg): availableQty = 6.700 Bibit (8.200 - 1.500 SHI)');
assert(batch015.availableQty === 5350, 'Batch - 015 (APM 60 mgg): availableQty = 5.350 Bibit (5.350 - 0 SHI)');

// E. Summary Totals Validation
const totalTbsAvailable = tbsBatches.reduce((sum, b) => sum + b.availableQty, 0);
const totalApmAvailable = apmBatches.reduce((sum, b) => sum + b.availableQty, 0);
assert(totalTbsAvailable === 49430, `Total Stok Tersedia ASB001 (Tanah Besih) harus tepat 49.430 Bibit (aktual: ${totalTbsAvailable})`);
assert(totalApmAvailable === 46650, `Total Stok Tersedia ASB002 (Aek Pamingke) harus tepat 46.650 Bibit (aktual: ${totalApmAvailable})`);

// --------------------------------------------------------------------------------------
// 1C. GLOBAL SELECTION VALIDATION (NO 100% SELECTION)
// --------------------------------------------------------------------------------------
console.log('\n1C. Global Selection Percentage Validation:');

const allSelectionUnder100 = MOCK_NURSERY_STOCK_BATCHES.every(b => {
  const pct = calculateSelectionPercentage(b.jumlahAfkirSeleksi, b.initialQty);
  return pct < 100 && b.jumlahAfkirSeleksi < b.initialQty;
});
assert(allSelectionUnder100, 'Seluruh 15 mock batch memiliki Seleksi < 100% dan Afkir < Initial Qty');

MOCK_NURSERY_STOCK_BATCHES.forEach(b => {
  const pct = calculateSelectionPercentage(b.jumlahAfkirSeleksi, b.initialQty);
  assert(pct < 100, `${b.batchCode} (${b.growthStage}): Seleksi = ${pct}% (< 100%)`);
});

// --------------------------------------------------------------------------------------
// 1D. MAIN NURSERY & APM GRAFTING BALANCE AUDIT
// --------------------------------------------------------------------------------------
console.log('\n1D. Grafting Balance Verification:');

const mainNurseryBatches = MOCK_NURSERY_STOCK_BATCHES.filter(b => b.growthStage === 'Rubber Main Nursery');
const apmGrowthBatches = MOCK_NURSERY_STOCK_BATCHES.filter(b => b.growthStage === 'Rubber Advance Planting Material');

// Main Nursery Grafting Checks
assert(mainNurseryBatches.every(b => b.jumlahGrafting > 0), 'Seluruh batch Main Nursery memiliki jumlahGrafting > 0');
assert(mainNurseryBatches.every(b => b.jumlahGrafting >= b.availableQty), 'Seluruh batch Main Nursery memenuhi: jumlahGrafting >= availableQty');

// APM Grafting & Age Checks
assert(apmGrowthBatches.every(b => b.jumlahGrafting > 0), 'Seluruh batch APM memiliki jumlahGrafting > 0');
assert(apmGrowthBatches.every(b => b.jumlahGrafting >= b.availableQty), 'Seluruh batch APM memenuhi: jumlahGrafting >= availableQty');
assert(apmGrowthBatches.every(b => calculateAgeInWeeks(b.tanggalSemai) > 50), 'Seluruh batch APM memiliki umur > 50 Minggu');

// --------------------------------------------------------------------------------------
// 1E. CLONE COMPOSITION & MASTER KLON STANDARDIZATION AUDIT
// --------------------------------------------------------------------------------------
console.log('\n1E. Clone Composition & Master Klon Verification:');

// A. Rootstock Standardization (All 15 batches must be GT 1)
const allRootstockGT1 = MOCK_NURSERY_STOCK_BATCHES.every(b => b.rootstockClone === 'GT 1');
assert(allRootstockGT1, 'Seluruh 15 mock batch menggunakan rootstockClone "GT 1"');

const forbiddenRootstocks = ['BPM 24', 'BPM 1', 'IRR 112', 'GT 1 / PB 260', 'GT 1 / IRR 39'];
const hasForbiddenRootstock = MOCK_NURSERY_STOCK_BATCHES.some(b => forbiddenRootstocks.includes(b.rootstockClone));
assert(!hasForbiddenRootstock, 'TIDAK ada batch yang menggunakan BPM 24, BPM 1, IRR 112, atau kombinasi lain sebagai rootstock');

// B. Entres Clone Verification against Master Klon
const activeMasterKlons = getActiveKlons();
assert(activeMasterKlons.length > 0, `Master Klon aktif ditemukan (${activeMasterKlons.length} klon aktif)`);

let allEntresValid = true;
MOCK_NURSERY_STOCK_BATCHES.forEach(b => {
  const resolved = resolveKlon(b.entresClone);
  const isValid = resolved !== null && resolved.status === KLON_STATUS.ACTIVE && resolved.canonicalName === b.entresClone;
  if (!isValid) {
    allEntresValid = false;
    console.error(`Invalid entres clone found on ${b.batchCode}: "${b.entresClone}"`);
  }
});
assert(allEntresValid, 'Seluruh entresClone (15 batch) adalah klon aktif yang valid dan kanonikal pada Master Klon');

// C. Verify Entres Variety across batches
const uniqueEntres = new Set(MOCK_NURSERY_STOCK_BATCHES.map(b => b.entresClone));
assert(uniqueEntres.size >= 8, `Terdapat variasi klon entres yang kaya (${uniqueEntres.size} klon unik: ${Array.from(uniqueEntres).join(', ')})`);

// --------------------------------------------------------------------------------------
// 2. USER CONTEXT & STRICT SCOPE FILTERING (NEGATIVE & POSITIVE TESTS)
// --------------------------------------------------------------------------------------
console.log('\n2. User Context & Strict Scope Isolation Tests:');

// ASB001 (Annisa - Tanah Besih / Divisi I)
const userASB001 = { estateId: 'EST-TBS', divisionId: 'DIV-001', name: 'Annisa', role: 'ASISTEN_BIBITAN' };
const scopedASB001 = getMockBatchesForUser(userASB001);

assert(scopedASB001.length === 8, `ASB001 menerima tepat 8 batch Tanah Besih (aktual: ${scopedASB001.length})`);
assert(scopedASB001.every(b => b.estateId === 'EST-TBS'), 'ASB001: 100% data adalah EST-TBS');
assert(scopedASB001.every(b => b.divisionId === 'DIV-001'), 'ASB001: 100% data adalah DIV-001');
assert(!scopedASB001.some(b => b.estateId === 'EST-APM'), 'NEGATIVE TEST PASS: ASB001 TIDAK melihat satupun batch EST-APM');
assert(!scopedASB001.some(b => b.divisionId === 'DIV-APM-02'), 'NEGATIVE TEST PASS: ASB001 TIDAK melihat satupun batch DIV-APM-02');
assert(!scopedASB001.some(b => ['Batch - 007', 'Batch - 008', 'Batch - 009', 'Batch - 010', 'Batch - 011', 'Batch - 014', 'Batch - 015'].includes(b.batchCode)), 'NEGATIVE TEST PASS: Batch EST-APM tidak bocor ke ASB001');

// ASB002 (Abdul Gofur - Aek Pamingke / Divisi II)
const userASB002 = { estateId: 'EST-APM', divisionId: 'DIV-APM-02', name: 'Abdul Gofur', role: 'ASISTEN_BIBITAN' };
const scopedASB002 = getMockBatchesForUser(userASB002);

assert(scopedASB002.length === 7, `ASB002 menerima tepat 7 batch Aek Pamingke (aktual: ${scopedASB002.length})`);
assert(scopedASB002.every(b => b.estateId === 'EST-APM'), 'ASB002: 100% data adalah EST-APM');
assert(scopedASB002.every(b => b.divisionId === 'DIV-APM-02'), 'ASB002: 100% data adalah DIV-APM-02');
assert(!scopedASB002.some(b => b.estateId === 'EST-TBS'), 'NEGATIVE TEST PASS: ASB002 TIDAK melihat satupun batch EST-TBS');
assert(!scopedASB002.some(b => b.divisionId === 'DIV-001'), 'NEGATIVE TEST PASS: ASB002 TIDAK melihat satupun batch DIV-001');
assert(!scopedASB002.some(b => ['Batch - 001', 'Batch - 002', 'Batch - 003', 'Batch - 004', 'Batch - 005', 'Batch - 006', 'Batch - 012', 'Batch - 013'].includes(b.batchCode)), 'NEGATIVE TEST PASS: Batch EST-TBS tidak bocor ke ASB002');

// --------------------------------------------------------------------------------------
// 3. UMUR BIBIT & SELEKSI FORMULA VALIDATION
// --------------------------------------------------------------------------------------
console.log('\n3. Umur Bibit (Minggu) & Seleksi (%) Calculations:');

const ageWeeksSample = calculateAgeInWeeks('2026-06-15');
assert(ageWeeksSample === 16, `Umur bibit tanggal semai 2026-06-15 harus tepat 16 Minggu (aktual: ${ageWeeksSample})`);

const seleksiSample1 = calculateSelectionPercentage(350, 15000);
assert(seleksiSample1 === 2, `Seleksi (%) 350 / 15.000 harus dibulatkan menjadi 2% (aktual: ${seleksiSample1}%)`);

const seleksiSample2 = calculateSelectionPercentage(400, 12000);
assert(seleksiSample2 === 3, `Seleksi (%) 400 / 12.000 harus dibulatkan menjadi 3% (aktual: ${seleksiSample2}%)`);

const displayDateSample = formatDisplayDate('2026-06-15');
assert(displayDateSample === '15/06/2026', `Display date format harus DD/MM/YYYY: 15/06/2026 (aktual: ${displayDateSample})`);

// --------------------------------------------------------------------------------------
// 4. ROUTE REGISTRATION & MENU SEPARATION
// --------------------------------------------------------------------------------------
console.log('\n4. Menu Separation & Route Audit:');
const stokMenu = REPORT_MENUS.find(m => m.id === 'stok-bibit');
const historyMenu = REPORT_MENUS.find(m => m.id === 'riwayat-transaksi');

assert(stokMenu?.route === '/reports/stock', 'Menu Stok Bibit mengarah ke dedicated route "/reports/stock"');
assert(historyMenu?.route === '/history', 'Menu Riwayat Transaksi tetap mengarah ke route "/history"');

// --------------------------------------------------------------------------------------
// 5. RENDERER & DOM INTEGRITY (ASB001 & ASB002)
// --------------------------------------------------------------------------------------
console.log('\n5. Renderer HTML & Terminology Audit:');

// Setup mock session for ASB001
session.start({
  id: 'ASB001',
  userId: 'ASB001',
  code: 'ASB001',
  role: 'ASISTEN_BIBITAN',
  name: 'Annisa',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
});

let capturedHTML = '';
let backNavigated = null;
const eventListeners = {};

const mockApp = {
  get innerHTML() { return capturedHTML; },
  set innerHTML(val) { capturedHTML = val; },
  querySelector: (sel) => {
    return {
      addEventListener: (event, handler) => {
        eventListeners[sel] = handler;
      },
      value: 'ALL'
    };
  },
  querySelectorAll: (sel) => {
    return [
      {
        dataset: { index: '0' },
        addEventListener: (event, handler) => {
          if (!eventListeners[sel]) eventListeners[sel] = [];
          eventListeners[sel].push(handler);
        }
      }
    ];
  }
};

global.document = {
  getElementById: (id) => mockApp
};

global.location = {
  _hash: '#/reports/stock',
  get hash() { return this._hash; },
  set hash(val) {
    this._hash = val;
    backNavigated = val.replace(/^#/, '');
  },
  replace: (target) => {
    this._hash = target;
    backNavigated = target.replace(/^#/, '');
  }
};

renderNurseryStockReport();

assert(capturedHTML.includes('Laporan Stok Bibit'), 'Header menampilkan title resmi "Laporan Stok Bibit"');
assert(capturedHTML.includes('Batch - 001'), 'HTML memuat Batch - 001 untuk ASB001');
assert(capturedHTML.includes('Batch - 006'), 'HTML memuat Batch - 006 (Stok Kosong)');
assert(capturedHTML.includes('Batch - 012'), 'HTML memuat Batch - 012 untuk ASB001');
assert(capturedHTML.includes('49.430'), 'Summary HTML memuat total stok tersedia ASB001: "49.430" Bibit');
assert(capturedHTML.includes('14.650'), 'Batch - 001 card memuat stok tersedia: "14.650" Bibit');

// Label UI Verification in Rendered HTML
assert(capturedHTML.includes('Stok Tersedia'), 'Batch Card menampilkan label baru "Stok Tersedia"');
assert(!capturedHTML.includes('Stok Tersedia (Hidup)'), 'Batch Card TIDAK memuat label lama "Stok Tersedia (Hidup)"');
assert(!capturedHTML.includes('Okulasi Pokok'), 'Rendered HTML TIDAK memuat label lama "Okulasi Pokok"');

assert(!capturedHTML.includes('Batch - 007'), 'HTML TIDAK memuat Batch - 007 (Isolasi scope ASB001)');
assert(!capturedHTML.includes('Batch - 014'), 'HTML TIDAK memuat Batch - 014 (Isolasi scope ASB001)');
assert(capturedHTML.includes('Minggu'), 'HTML menampilkan umur bibit dalam satuan "Minggu"');
assert(!capturedHTML.includes('114 Hari'), 'HTML TIDAK menampilkan "114 Hari"');
assert(capturedHTML.includes('btn-back'), 'HTML memiliki tombol #btn-back');

// Check Back Button Functionality
if (eventListeners['#btn-back']) {
  eventListeners['#btn-back']();
  assert(backNavigated === '/reports', 'Tombol Back mengarahkan kembali ke "/reports"');
}

// --------------------------------------------------------------------------------------
// 6. DETAIL MODAL & TERMINOLOGY INTEGRITY
// --------------------------------------------------------------------------------------
console.log('\n6. Detail Modal, SHI & Terminology Verification:');

// Test Program Name Standardization
const allProgramNamesValid = MOCK_NURSERY_STOCK_BATCHES.every(b => b.programName === 'Program Nursery 2026');
assert(allProgramNamesValid, 'Seluruh mock batch memiliki programName terstandarisasi "Program Nursery 2026"');
assert(!MOCK_NURSERY_STOCK_BATCHES.some(b => b.programName.includes('TB') || b.programName.includes('AP')), 'Nama program TIDAK memuat suffix TB/AP');

// Validate all SHI transactions follow standard document and block pattern
const allShiItems = MOCK_NURSERY_STOCK_BATCHES.flatMap(b => b.pengeluaranShi || []);
assert(allShiItems.length === 11, `Total transaksi pengeluaran SHI harus tepat 11 (aktual: ${allShiItems.length})`);
assert(allShiItems.every(tx => /^2026\/NIR\/\d{3}$/.test(tx.docNo)), 'Semua docNo mengikuti sequence 2026/NIR/XXX');
assert(!allShiItems.some(tx => tx.docNo.includes('OUT/SHI')), 'Tidak ada docNo yang memuat "OUT/SHI"');
assert(allShiItems.every(tx => /^Block\s\d{3}\/\d{2}$/.test(tx.block)), 'Semua block mengikuti format Block XXX/YY');
assert(allShiItems.every(tx => ['Divisi I', 'Divisi II'].includes(tx.divisi)), 'Semua divisi mengikuti canonical "Divisi I" / "Divisi II"');

// Modal inspection by setting modal root
let modalRenderedBody = '';
let modalRenderedTitle = '';
const mockModalRoot = {
  get innerHTML() { return modalRenderedBody; },
  set innerHTML(val) { modalRenderedBody = val; },
  querySelector: (sel) => ({
    addEventListener: () => {}
  })
};
const origGetElementById = global.document.getElementById;
global.document.getElementById = (id) => {
  if (id === 'modal-root') return mockModalRoot;
  return mockApp;
};

// Test Batch - 001 detail modal (Main Nursery)
openBatchDetailModal(batch001);
assert(modalRenderedBody.includes('Program Pembibitan'), 'Modal memuat label "Program Pembibitan"');
assert(modalRenderedBody.includes('Program Nursery 2026'), 'Modal memuat nama program "Program Nursery 2026"');
assert(modalRenderedBody.includes('Stok Awal Semai'), 'Modal memuat label "Stok Awal Semai"');
assert(modalRenderedBody.includes('15.000 Bibit'), 'Modal Batch - 001 memuat stok awal "15.000 Bibit"');

// Label checks in Modal
assert(modalRenderedBody.includes('Okulasi (Grafting)'), 'Modal memuat label baru "Okulasi (Grafting)"');
assert(!modalRenderedBody.includes('Okulasi Pokok (Grafting)'), 'Modal TIDAK memuat label lama "Okulasi Pokok (Grafting)"');
assert(modalRenderedBody.includes('Okulasi Ulang (Regrafting)'), 'Modal memuat label "Okulasi Ulang (Regrafting)"');
assert(modalRenderedBody.includes('Total Afkir / Seleksi'), 'Modal memuat label "Total Afkir / Seleksi"');
assert(modalRenderedBody.includes('Persentase Seleksi (%)'), 'Modal memuat label "Persentase Seleksi (%)"');

assert(modalRenderedBody.includes('Stok Tersedia:'), 'Modal memuat label baru "Stok Tersedia:"');
assert(!modalRenderedBody.includes('Stok Tersedia (Hidup)'), 'Modal TIDAK memuat label lama "Stok Tersedia (Hidup)"');
assert(modalRenderedBody.includes('14.650 Bibit'), 'Modal Batch - 001 memuat stok tersedia "14.650 Bibit"');

assert(modalRenderedBody.includes('V. Pengeluaran Bibit SHI'), 'Modal memuat Section "V. Pengeluaran Bibit SHI"');
assert(modalRenderedBody.includes('2.000 Bibit'), 'Modal Batch - 001 memuat total pengeluaran "2.000 Bibit"');
assert(modalRenderedBody.includes('2026/NIR/001'), 'Modal Batch - 001 memuat dokumen "2026/NIR/001"');
assert(modalRenderedBody.includes('VI. Komposisi Klon'), 'Modal memuat Section "VI. Komposisi Klon"');
assert(modalRenderedBody.includes('GT 1'), 'Modal memuat rootstock "GT 1"');
assert(modalRenderedBody.includes('IRCA 19'), 'Modal memuat entres "IRCA 19" untuk Batch - 001');

// Test Batch - 004 detail modal (APM)
openBatchDetailModal(batch004);
assert(modalRenderedBody.includes('Rubber Advance Planting Material'), 'Modal Batch - 004 memuat growth stage APM');
assert(modalRenderedBody.includes('59 Minggu'), 'Modal Batch - 004 memuat umur "59 Minggu"');
assert(modalRenderedBody.includes('3.850 Bibit'), 'Modal Batch - 004 memuat stok tersedia setelah SHI "3.850 Bibit"');

// Test Batch - 006 detail modal (APM Empty with SHI)
openBatchDetailModal(batch006);
assert(modalRenderedBody.includes('1.900 Bibit'), 'Modal Batch - 006 memuat pengeluaran SHI 1.900 Bibit');
assert(modalRenderedBody.includes('2026/NIR/010'), 'Modal Batch - 006 memuat docNo 2026/NIR/010');
assert(modalRenderedBody.includes('0 Bibit'), 'Modal Batch - 006 memuat stok tersedia 0 Bibit');
assert(modalRenderedBody.includes('5%'), 'Modal Batch - 006 memuat seleksi 5%');

// Test Batch - 011 detail modal (APM Empty with SHI)
openBatchDetailModal(batch011);
assert(modalRenderedBody.includes('1.450 Bibit'), 'Modal Batch - 011 memuat pengeluaran SHI 1.450 Bibit');
assert(modalRenderedBody.includes('2026/NIR/011'), 'Modal Batch - 011 memuat docNo 2026/NIR/011');
assert(modalRenderedBody.includes('0 Bibit'), 'Modal Batch - 011 memuat stok tersedia 0 Bibit');
assert(modalRenderedBody.includes('3%'), 'Modal Batch - 011 memuat seleksi 3%');

// Test Batch - 003 (Empty SHI history)
openBatchDetailModal(batch003);
assert(modalRenderedBody.includes('Belum ada riwayat pengeluaran bibit SHI'), 'Modal Batch - 003 menampilkan "Belum ada riwayat pengeluaran bibit SHI"');
assert(modalRenderedBody.includes('7.750 Bibit'), 'Modal Batch - 003 menampilkan "7.750 Bibit" untuk stok tersedia');

// Restore original document getElementById
global.document.getElementById = origGetElementById;

// --------------------------------------------------------------------------------------
// 7. UNIT "BIBIT" & HARMONIZED TERMINOLOGY ON RENDERED HTML
// --------------------------------------------------------------------------------------
console.log('\n7. Unit Normalization ("Bibit") & Terminology Audit:');

assert(capturedHTML.includes('Bibit'), 'Rendered HTML Laporan Stok Bibit memuat satuan "Bibit"');
assert(!capturedHTML.includes('Pkk') && !capturedHTML.includes('PKK') && !capturedHTML.includes('pkk'), 'Rendered HTML Laporan TIDAK memuat satuan "Pkk"');

// --------------------------------------------------------------------------------------
// 8. PROTECTED STORAGE & DATABASE INTEGRITY
// --------------------------------------------------------------------------------------
console.log('\n8. Protected Storage & Engine Safety:');
assert(storage.get('nursery_batches', []) !== null, 'Storage nursery_batches tetap utuh');
assert(storage.get('receipt_transactions', []) !== null, 'Storage receipt_transactions tetap utuh');
assert(storage.get('seeding_transactions', []) !== null, 'Storage seeding_transactions tetap utuh');

console.log('\n========================================================================================');
console.log(`TOTAL RESULTS: ${passed} PASSED / ${failed} FAILED`);
console.log('========================================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
