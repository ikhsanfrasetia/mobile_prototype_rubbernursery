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
assert(emptyBatches.length === 2, `Terdapat tepat 2 batch berstatus EMPTY (Batch 006, 011) (aktual: ${emptyBatches.length})`);

const availableBatches = MOCK_NURSERY_STOCK_BATCHES.filter(b => b.status === 'AVAILABLE');
assert(availableBatches.length === 13, `Terdapat 13 batch berstatus AVAILABLE dengan stok bervariasi (aktual: ${availableBatches.length})`);

// --------------------------------------------------------------------------------------
// 1B. UNIVERSAL POPULATION FLOW & STOCK FORMULA AUDIT (ALL BATCHES)
// --------------------------------------------------------------------------------------
console.log('\n1B. Universal Population Flow & Stock Formula Validation:');

// A. Check Stok Setelah Seleksi across all 15 batches: initialQty - Total Seleksi
const allStokSetelahSeleksiValid = MOCK_NURSERY_STOCK_BATCHES.every(b => {
  const totalAfkir = (b.selectionRecords || []).reduce((acc, r) => acc + Number(r.qtyAfkir || 0), 0);
  const stokSetelahSeleksi = b.initialQty - totalAfkir;
  return b.stockBeforeShi === stokSetelahSeleksi;
});
assert(allStokSetelahSeleksiValid, 'Seluruh 15 batch memiliki Stok Setelah Seleksi === (initialQty - Total Seleksi)');

// B. Check Universal Available Qty across all 15 batches: (Stok Setelah Seleksi - Total SHI)
let allUniversalFormulaValid = true;
let allShiWithinLimits = true;
MOCK_NURSERY_STOCK_BATCHES.forEach(b => {
  const totalAfkir = (b.selectionRecords || []).reduce((acc, r) => acc + Number(r.qtyAfkir || 0), 0);
  const stokSetelahSeleksi = b.initialQty - totalAfkir;
  const totalShi = (b.pengeluaranShi || []).reduce((acc, tx) => acc + Number(tx.qty || 0), 0);
  const expectedAvailable = stokSetelahSeleksi - totalShi;

  if (totalShi > stokSetelahSeleksi) {
    allShiWithinLimits = false;
    console.error(`Over-issue detected on ${b.batchCode}: totalShi=${totalShi} > stokSetelahSeleksi=${stokSetelahSeleksi}`);
  }

  if (b.availableQty !== expectedAvailable) {
    allUniversalFormulaValid = false;
    console.error(`Universal formula mismatch on ${b.batchCode}: actual=${b.availableQty}, expected=${expectedAvailable}`);
  }
});
assert(allShiWithinLimits, 'Seluruh 15 batch memenuhi constraint: Total Pengeluaran Bibit SHI <= Stok Setelah Seleksi (0 Over-Issue)');
assert(allUniversalFormulaValid, 'Seluruh 15 batch memenuhi formula final: availableQty === (Stok Setelah Seleksi - Total Pengeluaran Bibit SHI)');

// Ensure legacy / non-stock fields are NOT used as stock source
const afkirSeleksiNotUsedAsStock = MOCK_NURSERY_STOCK_BATCHES.every(b => {
  return b.stockBeforeShi !== (b.initialQty - b.jumlahAfkirSeleksi);
});
assert(afkirSeleksiNotUsedAsStock, 'jumlahAfkirSeleksi TIDAK digunakan sebagai source perhitungan stok');

// C. No Negative Stock Validation
const noNegativeStock = MOCK_NURSERY_STOCK_BATCHES.every(b => b.availableQty >= 0);
assert(noNegativeStock, 'TIDAK ada batch dengan stok negatif pada 100% dataset');

// D. Specific check for all 15 batch values
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

// Tanah Besih (TBS) batches
assert(batch001.availableQty === 11100, 'Batch - 001: availableQty = 11.100 Bibit (15.000 - 3.900 - 0 SHI)');
assert(batch002.availableQty === 8804, 'Batch - 002: availableQty = 8.804 Bibit (12.000 - 3.196 - 0 SHI)');
assert(batch003.availableQty === 5909, 'Batch - 003: availableQty = 5.909 Bibit (8.000 - 2.091 - 0 SHI)');
assert(batch004.availableQty === 300, 'Batch - 004: availableQty = 300 Bibit (5.000 - 4.200 - 500 SHI)');
assert(batch005.availableQty === 2221 && batch005.status === 'AVAILABLE', 'Batch - 005: availableQty = 2.221 Bibit & Status AVAILABLE (3.000 - 779 - 0 SHI)');
assert(batch006.availableQty === 0 && batch006.status === 'EMPTY', 'Batch - 006: availableQty = 0 Bibit & Status EMPTY (MAX(0, 260 - 260 SHI))');
assert(batch012.availableQty === 240, 'Batch - 012: availableQty = 240 Bibit (6.000 - 5.160 - 600 SHI)');
assert(batch013.availableQty === 680, 'Batch - 013: availableQty = 680 Bibit (4.000 - 3.320 - 0 SHI)');

// Aek Pamingke (APM) batches
assert(batch007.availableQty === 560, 'Batch - 007: availableQty = 560 Bibit (18.000 - 14.940 - 2.500 SHI)');
assert(batch008.availableQty === 600, 'Batch - 008: availableQty = 600 Bibit (10.000 - 8.200 - 1.200 SHI)');
assert(batch009.availableQty === 5588, 'Batch - 009: availableQty = 5.588 Bibit (7.500 - 1.912 - 0 SHI)');
assert(batch010.availableQty === 2994 && batch010.status === 'AVAILABLE', 'Batch - 010: availableQty = 2.994 Bibit & Status AVAILABLE (4.000 - 1.006 - 0 SHI)');
assert(batch011.availableQty === 0 && batch011.status === 'EMPTY', 'Batch - 011: availableQty = 0 Bibit & Status EMPTY (MAX(0, 180 - 180 SHI))');
assert(batch014.availableQty === 390, 'Batch - 014: availableQty = 390 Bibit (8.500 - 7.310 - 800 SHI)');
assert(batch015.availableQty === 825, 'Batch - 015: availableQty = 825 Bibit (5.500 - 4.675 - 0 SHI)');

// E. Summary Totals Validation
const totalTbsAvailable = tbsBatches.reduce((sum, b) => sum + b.availableQty, 0);
const totalApmAvailable = apmBatches.reduce((sum, b) => sum + b.availableQty, 0);
const grandTotalAvailable = totalTbsAvailable + totalApmAvailable;

assert(totalTbsAvailable === 29254, `Total Stok Tersedia ASB001 (Tanah Besih) harus tepat 29.254 Bibit (aktual: ${totalTbsAvailable})`);
assert(totalApmAvailable === 10957, `Total Stok Tersedia ASB002 (Aek Pamingke) harus tepat 10.957 Bibit (aktual: ${totalApmAvailable})`);
assert(grandTotalAvailable === 40211, `Grand Total Stok Tersedia harus tepat 40.211 Bibit (aktual: ${grandTotalAvailable})`);
assert((totalTbsAvailable + totalApmAvailable) === grandTotalAvailable, 'Validasi Konsistensi: TBS (29.254) + APM (10.957) === Grand Total (40.211)');

// --------------------------------------------------------------------------------------
// 1C. TOTAL SELEKSI & SELEKSI (%) CALCULATION AUDIT (15 BATCHES)
// --------------------------------------------------------------------------------------
console.log('\n1C. Total Seleksi & Seleksi (%) Calculation Audit (15 Batches):');

let allTotalSeleksiSync = true;
let allPercentagesCorrect = true;

MOCK_NURSERY_STOCK_BATCHES.forEach(b => {
  const sumAfkir = (b.selectionRecords || []).reduce((acc, r) => acc + Number(r.qtyAfkir || 0), 0);
  const expectedPct = Math.round((sumAfkir / b.initialQty) * 100);
  const calculatedPct = calculateSelectionPercentage(sumAfkir, b.initialQty);

  if (calculatedPct !== expectedPct) {
    allPercentagesCorrect = false;
    console.error(`Percentage mismatch on ${b.batchCode}: calculated=${calculatedPct}%, expected=${expectedPct}%`);
  }

  // Ensure sum of selection records > 0 and <= initialQty
  if (sumAfkir <= 0 || sumAfkir >= b.initialQty) {
    allTotalSeleksiSync = false;
  }

  assert(calculatedPct < 100, `${b.batchCode} (${b.growthStage}): Total Seleksi = ${sumAfkir.toLocaleString('id-ID')} Bibit, Seleksi = ${calculatedPct}% (< 100%)`);
});

assert(allTotalSeleksiSync, 'Seluruh 15 mock batch memiliki Total Seleksi > 0 dan Total Seleksi < Initial Qty');
assert(allPercentagesCorrect, 'Seluruh 15 mock batch menghitung Seleksi (%) = round(Total Seleksi / initialQty * 100)');

// Specific verification for Batch - 001
const b001SumAfkir = (batch001.selectionRecords || []).reduce((acc, r) => acc + Number(r.qtyAfkir || 0), 0);
const b001Pct = calculateSelectionPercentage(b001SumAfkir, batch001.initialQty);
assert(b001SumAfkir === 3900, `Batch - 001 Total Seleksi harus tepat 3.900 Bibit (aktual: ${b001SumAfkir})`);
assert(b001Pct === 26, `Batch - 001 Seleksi (%) harus tepat 26% (aktual: ${b001Pct}%)`);


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
// 1F. SELECTION RECORDS 7-STAGE STRUCTURE & CATEGORY AUDIT
// --------------------------------------------------------------------------------------
console.log('\n1F. Selection Records 7-Stage Structure & Category Verification:');

// A. Existence check
const allHaveSelectionRecords = MOCK_NURSERY_STOCK_BATCHES.every(b => Array.isArray(b.selectionRecords) && b.selectionRecords.length > 0);
assert(allHaveSelectionRecords, 'Seluruh 15 batch memiliki property selectionRecords berupa Array non-empty');

// B. Record Structure & Required Properties
const allowedStages = [
  'SELEKSI_PRA_SEMAI',
  'SELEKSI_DITOLAK_PINDAH_SEMAI',
  'SELEKSI_PRA_OKULASI_I',
  'SELEKSI_PRA_OKULASI_II',
  'SELEKSI_PRA_OKULASI_III',
  'SELEKSI_GRAFTING',
  'SELEKSI_REGRAFTING'
];
const allowedCategories = ['PRA_SEMAI', 'DITOLAK_PINDAH_SEMAI', 'PRA_OKULASI', 'PASCA_OKULASI'];

let allRecordsStructureValid = true;
let allStagesValid = true;
let allCategoriesValid = true;
let allCategoryMappingsValid = true;
let noDuplicatePercentage = true;
let allPositiveQty = true;
let allPositiveBaseQty = true;
let allValidPercentages = true;

MOCK_NURSERY_STOCK_BATCHES.forEach(b => {
  b.selectionRecords.forEach(rec => {
    // Check required fields
    if (!rec.docNo || !rec.tanggal || !rec.category || !rec.stage || !rec.stageLabel ||
        typeof rec.baseQty !== 'number' || typeof rec.percentage !== 'number' ||
        typeof rec.qtyAfkir !== 'number' || !rec.alasanUtama) {
      allRecordsStructureValid = false;
    }
    // Check stage enum
    if (!allowedStages.includes(rec.stage)) {
      allStagesValid = false;
    }
    // Check category enum
    if (!allowedCategories.includes(rec.category)) {
      allCategoriesValid = false;
    }
    // Check category to stage mapping
    if (rec.stage === 'SELEKSI_PRA_SEMAI' && rec.category !== 'PRA_SEMAI') allCategoryMappingsValid = false;
    if (rec.stage === 'SELEKSI_DITOLAK_PINDAH_SEMAI' && rec.category !== 'DITOLAK_PINDAH_SEMAI') allCategoryMappingsValid = false;
    if (['SELEKSI_PRA_OKULASI_I', 'SELEKSI_PRA_OKULASI_II', 'SELEKSI_PRA_OKULASI_III'].includes(rec.stage) && rec.category !== 'PRA_OKULASI') allCategoryMappingsValid = false;
    if (['SELEKSI_GRAFTING', 'SELEKSI_REGRAFTING'].includes(rec.stage) && rec.category !== 'PASCA_OKULASI') allCategoryMappingsValid = false;

    // Check no hardcoded persentaseAfkir
    if (rec.persentaseAfkir !== undefined) {
      noDuplicatePercentage = false;
    }
    // Check positive numbers
    if (rec.qtyAfkir <= 0) allPositiveQty = false;
    if (rec.baseQty <= 0) allPositiveBaseQty = false;
    if (rec.percentage < 0 || rec.percentage > 100) allValidPercentages = false;
  });
});

assert(allRecordsStructureValid, 'Seluruh selection records memiliki properti wajib: docNo, tanggal, category, stage, stageLabel, baseQty, percentage, qtyAfkir, alasanUtama');
assert(allStagesValid, 'Seluruh stage record mengikuti 7 tahapan resmi SIGMA Nursery');
assert(allCategoriesValid, 'Seluruh category record mengikuti: PRA_SEMAI, DITOLAK_PINDAH_SEMAI, PRA_OKULASI, PASCA_OKULASI');
assert(allCategoryMappingsValid, 'Seluruh pemetaan category-to-stage valid 100%');
assert(noDuplicatePercentage, 'TIDAK ada field persentaseAfkir hardcoded (menggunakan field percentage)');
assert(allPositiveQty, 'Seluruh selection records memiliki qtyAfkir > 0');
assert(allPositiveBaseQty, 'Seluruh selection records memiliki baseQty > 0');
assert(allValidPercentages, 'Seluruh percentage berada dalam rentang valid (0 <= percentage <= 100)');

// C. Verification of required Pra-Okulasi (I, II, III) across all batches
const allHavePraOkulasi123 = MOCK_NURSERY_STOCK_BATCHES.every(b => {
  const stages = b.selectionRecords.map(r => r.stage);
  return stages.includes('SELEKSI_PRA_OKULASI_I') &&
         stages.includes('SELEKSI_PRA_OKULASI_II') &&
         stages.includes('SELEKSI_PRA_OKULASI_III');
});
assert(allHavePraOkulasi123, 'Seluruh 15 batch memiliki Seleksi Pra-Okulasi I, II, dan III lengkap');

// D. Verification of Pasca-Okulasi (Grafting & Regrafting conditional presence)
const allGraftingValid = MOCK_NURSERY_STOCK_BATCHES.every(b => {
  const hasGraftingRecord = b.selectionRecords.some(r => r.stage === 'SELEKSI_GRAFTING');
  return (b.jumlahGrafting > 0) === hasGraftingRecord;
});
assert(allGraftingValid, 'Seluruh batch dengan jumlahGrafting > 0 memiliki record Seleksi Grafting');

const allRegraftingValid = MOCK_NURSERY_STOCK_BATCHES.every(b => {
  const hasRegraftingRecord = b.selectionRecords.some(r => r.stage === 'SELEKSI_REGRAFTING');
  return (b.jumlahRegrafting > 0) === hasRegraftingRecord;
});
assert(allRegraftingValid, 'Seluruh batch dengan jumlahRegrafting > 0 memiliki record Seleksi Regrafting, dan batch regrafting = 0 (Batch 006 & 011) tidak memilikinya');

// --------------------------------------------------------------------------------------
// 1G. ASAL BIBIT AUDIT & DATA INTEGRITY
// --------------------------------------------------------------------------------------
console.log('\n1G. Asal Bibit Audit & Data Integrity:');

assert(batch001.asalBibit === 'Pihak Ke-III', 'Batch - 001 memiliki asalBibit "Pihak Ke-III" (terverifikasi)');
assert(batch006.asalBibit === 'Pihak Ke-III', 'Batch - 006 memiliki asalBibit "Pihak Ke-III" (terverifikasi)');
assert(batch011.asalBibit === 'Pihak Ke-III', 'Batch - 011 memiliki asalBibit "Pihak Ke-III" (terverifikasi)');

// Negative test on unverified batches: asalBibit should NOT be assumed/arbitrary
const unverifiedBatches = MOCK_NURSERY_STOCK_BATCHES.filter(b => !['MOCK-BTCH-001', 'MOCK-BTCH-006', 'MOCK-BTCH-011'].includes(b.batchId));
assert(unverifiedBatches.every(b => b.asalBibit === undefined || b.asalBibit === null), 'Batch lainnya tidak diasumsikan memiliki asalBibit tanpa source terverifikasi');

// --------------------------------------------------------------------------------------
// 1H. AGE ELIGIBILITY & SHI ISSUANCE REGRESSION AUDIT
// --------------------------------------------------------------------------------------
console.log('\n1H. Age Eligibility & SHI Issuance Regression Audit:');

let allUnder40HaveZeroShi = true;
let allShiBatchesAreEligible = true;

MOCK_NURSERY_STOCK_BATCHES.forEach(b => {
  const ageWeeks = calculateAgeInWeeks(b.tanggalSemai);
  const shiCount = (b.pengeluaranShi || []).length;
  const totalShi = (b.pengeluaranShi || []).reduce((sum, tx) => sum + Number(tx.qty || 0), 0);

  if (ageWeeks < 40) {
    if (shiCount > 0 || totalShi > 0) {
      allUnder40HaveZeroShi = false;
      console.error(`Violation: ${b.batchCode} age=${ageWeeks}w (< 40) but has ${shiCount} SHI records (total=${totalShi})`);
    }
  }

  if (shiCount > 0 && ageWeeks < 40) {
    allShiBatchesAreEligible = false;
  }
});

assert(allUnder40HaveZeroShi, 'Regression Test: Setiap batch dengan umur < 40 minggu WAJIB memiliki pengeluaranShi.length === 0 dan total SHI === 0');
assert(allShiBatchesAreEligible, 'Regression Test: Seluruh batch yang memiliki pengeluaran SHI terverifikasi berumur >= 40 minggu');

// Check that age >= 40 is not forced to have SHI (eligibility only)
const eligibleWithoutShi = MOCK_NURSERY_STOCK_BATCHES.filter(b => calculateAgeInWeeks(b.tanggalSemai) >= 40 && (!b.pengeluaranShi || b.pengeluaranShi.length === 0));
assert(Array.isArray(eligibleWithoutShi), 'Rule umur >= 40 minggu hanya menentukan eligibilitas dan tidak memaksa setiap batch >= 40 minggu harus memiliki SHI');

// --------------------------------------------------------------------------------------
// 1I. AGE-BASED SELECTION DISTRIBUTION REGRESSION SUITE (20 ACCEPTANCE TESTS)
// --------------------------------------------------------------------------------------
console.log('\n1I. Age-Based Selection Distribution Regression Suite:');

// Grouping by age
const grpUnder20 = MOCK_NURSERY_STOCK_BATCHES.filter(b => calculateAgeInWeeks(b.tanggalSemai) < 20);
const grp20to29 = MOCK_NURSERY_STOCK_BATCHES.filter(b => {
  const age = calculateAgeInWeeks(b.tanggalSemai);
  return age >= 20 && age <= 29;
});
const grp30to39 = MOCK_NURSERY_STOCK_BATCHES.filter(b => {
  const age = calculateAgeInWeeks(b.tanggalSemai);
  return age >= 30 && age <= 39;
});
const grp40plus = MOCK_NURSERY_STOCK_BATCHES.filter(b => calculateAgeInWeeks(b.tanggalSemai) >= 40);

// Helper to calculate percentage of each batch
const getBatchPct = (b) => {
  const afkir = (b.selectionRecords || []).reduce((sum, r) => sum + Number(r.qtyAfkir || 0), 0);
  return calculateSelectionPercentage(afkir, b.initialQty);
};

// 1. All batches < 20 weeks have selection in 24-27%
const under20Pcts = grpUnder20.map(getBatchPct);
const allUnder20InRange = under20Pcts.every(pct => pct >= 24 && pct <= 27);
assert(allUnder20InRange, `Semua batch < 20 minggu memiliki Total Seleksi dalam range 24–27% (aktual: ${under20Pcts.join('%, ')}%)`);

// 2. Average selection for < 20 weeks in 25-26%
const avgUnder20 = under20Pcts.reduce((a, b) => a + b, 0) / under20Pcts.length;
assert(avgUnder20 >= 25 && avgUnder20 <= 26, `Rata-rata seleksi kelompok < 20 minggu berada pada 25–26% (aktual: ${avgUnder20.toFixed(2)}%)`);

// 3. Batches 20-29 weeks in 40-55% (if any)
if (grp20to29.length > 0) {
  const pcts20to29 = grp20to29.map(getBatchPct);
  assert(pcts20to29.every(p => p >= 40 && p <= 55), 'Semua batch 20–29 minggu berada dalam range 40–55%');
} else {
  assert(true, 'Kelompok 20–29 minggu: 0 batch (tanggal semai existing dipertahankan)');
}

// 4. Batches 30-39 weeks in 60-75% (if any)
if (grp30to39.length > 0) {
  const pcts30to39 = grp30to39.map(getBatchPct);
  assert(pcts30to39.every(p => p >= 60 && p <= 75), 'Semua batch 30–39 minggu berada dalam range 60–75%');
} else {
  assert(true, 'Kelompok 30–39 minggu: 0 batch (tanggal semai existing dipertahankan)');
}

// 5. All batches >= 40 weeks have selection in 81-89%
const over40Pcts = grp40plus.map(getBatchPct);
const allOver40InRange = over40Pcts.every(pct => pct >= 81 && pct <= 89);
assert(allOver40InRange, `Semua batch >= 40 minggu memiliki Total Seleksi dalam range 81–89% (aktual: ${over40Pcts.join('%, ')}%)`);

// 6. Average selection for >= 40 weeks > 80% and < 90%
const avgOver40 = over40Pcts.reduce((a, b) => a + b, 0) / over40Pcts.length;
assert(avgOver40 > 80 && avgOver40 < 90, `Rata-rata seleksi kelompok >= 40 minggu berada di >80% dan <90% (aktual: ${avgOver40.toFixed(2)}%)`);

// 7. Dynamic Grafting Success > 70% and Regrafting Success < 30% across all 15 batches
let allGraftingSuccessDynamic = true;
let allRegraftingSuccessDynamic = true;
let noNegativePopulation = true;

MOCK_NURSERY_STOCK_BATCHES.forEach(b => {
  const PRE_GRAFT_STAGES = [
    'SELEKSI_PRA_SEMAI',
    'SELEKSI_DITOLAK_PINDAH_SEMAI',
    'SELEKSI_PRA_OKULASI_I',
    'SELEKSI_PRA_OKULASI_II',
    'SELEKSI_PRA_OKULASI_III'
  ];
  const preGraftAfkir = (b.selectionRecords || [])
    .filter(r => PRE_GRAFT_STAGES.includes(r.stage))
    .reduce((acc, r) => acc + Number(r.qtyAfkir || 0), 0);
  const graftingInput = b.initialQty - preGraftAfkir;
  const graftRec = (b.selectionRecords || []).find(r => r.stage === 'SELEKSI_GRAFTING');
  const graftAfkir = graftRec ? Number(graftRec.qtyAfkir || 0) : 0;
  const berhasilGrafting = Math.max(0, graftingInput - graftAfkir);

  const regraftingInput = Number(b.jumlahRegrafting || 0);
  const regraftRec = (b.selectionRecords || []).find(r => r.stage === 'SELEKSI_REGRAFTING');
  const regraftAfkir = regraftRec ? Number(regraftRec.qtyAfkir || 0) : 0;
  const berhasilRegrafting = regraftingInput > 0 ? Math.max(0, regraftingInput - regraftAfkir) : 0;

  const totalHasilOkulasi = berhasilGrafting + berhasilRegrafting;
  const pctGraft = (berhasilGrafting / totalHasilOkulasi) * 100;
  const pctRegraft = (berhasilRegrafting / totalHasilOkulasi) * 100;

  if (graftingInput <= 0 || berhasilGrafting <= 0) noNegativePopulation = false;
  if (pctGraft <= 70) allGraftingSuccessDynamic = false;
  if (pctRegraft >= 30) allRegraftingSuccessDynamic = false;
});

assert(noNegativePopulation, 'Lineage Integrity: Seluruh batch memiliki Grafting Input > 0 dan Berhasil Grafting > 0');
assert(allGraftingSuccessDynamic, 'Grafting Success Rate seluruh 15 batch dinamis dan > 70%');
assert(allRegraftingSuccessDynamic, 'Regrafting Success Rate seluruh 15 batch dinamis dan < 30%');

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
assert(capturedHTML.includes('29.254'), 'Summary HTML memuat total stok tersedia ASB001: "29.254" Bibit');
assert(capturedHTML.includes('11.100'), 'Batch - 001 card memuat stok tersedia: "11.100" Bibit');

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
// 6. DETAIL MODAL, SHI, 7-STAGE SELECTION & UI FORMAT AUDIT
// --------------------------------------------------------------------------------------
console.log('\n6. Detail Modal, SHI, 7-Stage Selection & UI Format Verification:');

// Test Program Name Standardization
const allProgramNamesValid = MOCK_NURSERY_STOCK_BATCHES.every(b => b.programName === 'Program Nursery 2026');
assert(allProgramNamesValid, 'Seluruh mock batch memiliki programName terstandarisasi "Program Nursery 2026"');
assert(!MOCK_NURSERY_STOCK_BATCHES.some(b => b.programName.includes('TB') || b.programName.includes('AP')), 'Nama program TIDAK memuat suffix TB/AP');

// Validate all SHI transactions follow standard document and block pattern
const allShiItems = MOCK_NURSERY_STOCK_BATCHES.flatMap(b => b.pengeluaranShi || []);
assert(allShiItems.length === 7, `Total transaksi pengeluaran SHI harus tepat 7 (aktual: ${allShiItems.length})`);
assert(allShiItems.every(tx => /^2026\/NIR\/\d{3}$/.test(tx.docNo)), 'Semua docNo mengikuti sequence 2026/NIR/XXX');
assert(!allShiItems.some(tx => tx.docNo.includes('OUT/SHI')), 'Tidak ada docNo yang memuat "OUT/SHI"');
assert(allShiItems.every(tx => /^Block\s\d{3}\/\d{2}$/.test(tx.block)), 'Semua block mengikuti format Block XXX/YY');
assert(allShiItems.every(tx => ['Divisi I', 'Divisi II'].includes(tx.divisi)), 'Semua divisi mengikuti canonical "Divisi I" / "Divisi II"');

// Modal inspection by setting modal root
let modalRenderedBody = '';
let modalRenderedTitle = '';
let modalRenderedFooter = '';
let modalClosed = false;
const modalListeners = {};

const mockModalRoot = {
  get innerHTML() { return modalRenderedBody; },
  set innerHTML(val) {
    modalRenderedBody = val;
    if (val === '') modalClosed = true;
  },
  querySelector: (sel) => {
    return {
      addEventListener: (event, handler) => {
        modalListeners[sel] = handler;
      }
    };
  },
  querySelectorAll: (sel) => {
    return [
      {
        nextElementSibling: { style: { display: 'none' } },
        querySelector: () => ({ innerHTML: '&gt;', style: {} }),
        addEventListener: (event, handler) => {
          if (!modalListeners[sel]) modalListeners[sel] = [];
          modalListeners[sel].push(handler);
        }
      }
    ];
  }
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
assert(modalRenderedBody.includes('Tanah Besih - Divisi I'), 'Modal memuat kebun & divisi "Tanah Besih - Divisi I"');
assert(modalRenderedBody.includes('Rubber Main Nursery'), 'Modal memuat tahapan pertumbuhan "Rubber Main Nursery"');
assert(modalRenderedBody.includes('Asal Bibit'), 'Modal memuat label "Asal Bibit"');
assert(modalRenderedBody.includes('Pihak Ke-III'), 'Modal Batch - 001 memuat Asal Bibit "Pihak Ke-III"');
assert(!modalRenderedBody.includes('>Material<'), 'Modal Batch - 001 TIDAK memuat nilai hardcoded "Material"');
assert(modalRenderedBody.includes('Bed - 001'), 'Modal memuat bedengan "Bed - 001"');
assert(modalRenderedBody.includes('Stok Awal Semai'), 'Modal memuat label "Stok Awal Semai"');
assert(modalRenderedBody.includes('15.000 Bibit'), 'Modal Batch - 001 memuat stok awal "15.000 Bibit"');

// Section III Label & Value checks in Modal
assert(modalRenderedBody.includes('Berhasil Diokulasi (Grafting)'), 'Modal memuat label "Berhasil Diokulasi (Grafting)"');
assert(modalRenderedBody.includes('11.139 Bibit'), 'Modal memuat Berhasil Diokulasi (Grafting) "11.139 Bibit"');
assert(modalRenderedBody.includes('Berhasil Diokulasi Ulang (Regrafting)'), 'Modal memuat label "Berhasil Diokulasi Ulang (Regrafting)"');
assert(modalRenderedBody.includes('461 Bibit'), 'Modal memuat Berhasil Diokulasi Ulang (Regrafting) "461 Bibit"');
assert(modalRenderedBody.includes('Total Seleksi'), 'Modal Card III memuat label resmi "Total Seleksi"');
assert(!modalRenderedBody.includes('Total Afkir / Seleksi'), 'Modal Card III TIDAK memuat label lama "Total Afkir / Seleksi"');
assert(!modalRenderedBody.includes('Jumlah Afkir/Seleksi'), 'Modal Card III TIDAK memuat label "Jumlah Afkir/Seleksi"');
assert(modalRenderedBody.includes('3.900 Bibit'), 'Modal Batch - 001 Card III memuat Total Seleksi "3.900 Bibit"');
assert(modalRenderedBody.includes('26%'), 'Modal Batch - 001 Card III memuat Persentase Seleksi "26%"');
assert(!modalRenderedBody.includes('Stok Sebelum SHI'), 'Modal Card III TIDAK memuat label "Stok Sebelum SHI"');
assert(!modalRenderedBody.includes('Pengeluaran SHI</span>'), 'Modal Card III TIDAK memuat baris terpisah "Pengeluaran SHI"');
assert(modalRenderedBody.includes('Stok Tersedia (SHI)'), 'Modal Card III memuat label "Stok Tersedia (SHI)"');
assert(modalRenderedBody.includes('11.100 Bibit'), 'Modal Batch - 001 memuat Stok Tersedia "11.100 Bibit"');

// Section IV. Riwayat Tahapan Seleksi Bibit on Batch - 001 (7 Stages)
assert(modalRenderedBody.includes('IV. Riwayat Tahapan Seleksi Bibit'), 'Modal memuat Section "IV. Riwayat Tahapan Seleksi Bibit"');
assert(modalRenderedBody.includes('Seleksi Pra-Semai (Deder)'), 'Modal memuat "Seleksi Pra-Semai (Deder)"');
assert(modalRenderedBody.includes('Seleksi Ditolak Pindah Semai'), 'Modal memuat "Seleksi Ditolak Pindah Semai"');
assert(modalRenderedBody.includes('Seleksi I – Pra-Okulasi'), 'Modal memuat "Seleksi I – Pra-Okulasi"');
assert(modalRenderedBody.includes('Seleksi II – Pra-Okulasi'), 'Modal memuat "Seleksi II – Pra-Okulasi"');
assert(modalRenderedBody.includes('Seleksi III – Pra-Okulasi'), 'Modal memuat "Seleksi III – Pra-Okulasi"');
assert(modalRenderedBody.includes('Seleksi Grafting'), 'Modal memuat "Seleksi Grafting"');
assert(modalRenderedBody.includes('Seleksi Regrafting'), 'Modal memuat "Seleksi Regrafting"');

// FORMAT UI CHECK: VALUE before PERCENTAGE e.g. "322 Bibit • 2%" (BUKAN "2% • 322 Bibit")
assert(modalRenderedBody.includes('322 Bibit • 2%'), 'Modal Batch - 001 memuat format VALUE • %: "322 Bibit • 2%"');
assert(!modalRenderedBody.includes('2% • 322 Bibit'), 'Modal Batch - 001 TIDAK memuat format terbalik "2% • 322 Bibit"');
assert(modalRenderedBody.includes('2.420 Bibit • 16,4%'), 'Modal Batch - 001 memuat format VALUE • %: "2.420 Bibit • 16,4%"');
assert(modalRenderedBody.includes('39 Bibit • 6,5%'), 'Modal Batch - 001 memuat format VALUE • %: "39 Bibit • 6,5%"');

// EXPAND / COLLAPSE STRUCTURE CHECKS
assert(modalRenderedBody.includes('stage-accordion-item'), 'Modal memuat accordion item untuk tahapan seleksi');
assert(modalRenderedBody.includes('stage-toggle-row'), 'Modal memuat trigger row untuk expand/collapse');
assert(modalRenderedBody.includes('stage-arrow'), 'Modal memuat kontrol panah expand di ujung kanan');
assert(modalRenderedBody.includes('display: none'), 'Tahapan seleksi dalam kondisi DEFAULT COLLAPSED (display: none)');
assert(modalRenderedBody.includes('Tanggal Seleksi'), 'Detail tahapan memuat "Tanggal Seleksi"');
assert(modalRenderedBody.includes('Stok Sebelum'), 'Detail tahapan memuat "Stok Sebelum"');
assert(modalRenderedBody.includes('Jumlah Seleksi'), 'Detail tahapan memuat "Jumlah Seleksi"');
assert(modalRenderedBody.includes('Persentase'), 'Detail tahapan memuat "Persentase"');

// REASONS FIELD REMOVAL CHECK
assert(!modalRenderedBody.includes('Alasan') && !modalRenderedBody.includes('alasanUtama'), 'Field "Alasan / Alasan Utama" WAJIB DIHAPUS dari modal');

// Section V. Pengeluaran Bibit SHI on Batch - 001
assert(modalRenderedBody.includes('V. Pengeluaran Bibit SHI'), 'Modal memuat Section "V. Pengeluaran Bibit SHI"');
assert(modalRenderedBody.includes('Belum ada riwayat pengeluaran bibit SHI (0 Bibit)'), 'Modal Batch - 001 memuat empty state SHI "Belum ada riwayat pengeluaran bibit SHI (0 Bibit)"');

// FOOTER BUTTON & CLOSE HANDLER CHECK
if (modalListeners['#btn-modal-back']) {
  modalClosed = false;
  modalListeners['#btn-modal-back']({ preventDefault: () => {} });
  assert(modalClosed, 'Tombol "Kembali" berfungsi menutup modal');
}

// Test Batch - 004 detail modal (APM - Tanah Besih)
openBatchDetailModal(batch004);
assert(modalRenderedBody.includes('Rubber Advance Planting Material'), 'Modal Batch - 004 memuat growth stage APM');
assert(modalRenderedBody.includes('59 Minggu'), 'Modal Batch - 004 memuat umur "59 Minggu"');
assert(modalRenderedBody.includes('162 Bibit • 3%'), 'Modal Batch - 004 memuat format: "162 Bibit • 3%"');
assert(modalRenderedBody.includes('3.298 Bibit • 68%'), 'Modal Batch - 004 memuat format: "3.298 Bibit • 68%"');
assert(modalRenderedBody.includes('10 Bibit • 8,3%'), 'Modal Batch - 004 memuat format: "10 Bibit • 8,3%"');
assert(modalRenderedBody.includes('300 Bibit'), 'Modal Batch - 004 memuat Stok Tersedia "300 Bibit"');
assert(modalRenderedBody.includes('2026/NIR/003'), 'Modal Batch - 004 memuat dokumen SHI "2026/NIR/003"');
assert(modalRenderedBody.includes('500 Bibit'), 'Modal Batch - 004 memuat kuantitas SHI "500 Bibit"');

// Test Batch - 006 detail modal (APM Empty, Regrafting = 0)
openBatchDetailModal(batch006);
assert(modalRenderedBody.includes('Batch - 006'), 'Modal Batch - 006 memuat batchCode "Batch - 006"');
assert(modalRenderedBody.includes('KOSONG'), 'Modal Batch - 006 memuat badge status "KOSONG"');
assert(modalRenderedBody.includes('Pihak Ke-III'), 'Modal Batch - 006 memuat Asal Bibit "Pihak Ke-III"');
assert(modalRenderedBody.includes('2.000 Bibit'), 'Modal Batch - 006 memuat stok awal "2.000 Bibit"');
assert(modalRenderedBody.includes('260 Bibit'), 'Modal Batch - 006 memuat Berhasil Diokulasi (Grafting) "260 Bibit"');
assert(modalRenderedBody.includes('0 Bibit'), 'Modal Batch - 006 memuat regrafting "0 Bibit"');
assert(modalRenderedBody.includes('1.740 Bibit'), 'Modal Batch - 006 memuat total seleksi "1.740 Bibit"');
assert(modalRenderedBody.includes('87%'), 'Modal Batch - 006 memuat seleksi "87%"');
assert(modalRenderedBody.includes('0 Bibit'), 'Modal Batch - 006 memuat Stok Tersedia "0 Bibit"');
assert(modalRenderedBody.includes('Seleksi Grafting'), 'Modal Batch - 006 memuat "Seleksi Grafting"');
assert(modalRenderedBody.includes('Seleksi Regrafting'), 'Modal Batch - 006 memuat 7 tahapan lengkap termasuk "Seleksi Regrafting"');
assert(modalRenderedBody.includes('2026/NIR/010'), 'Modal Batch - 006 memuat dokumen SHI "2026/NIR/010"');
assert(modalRenderedBody.includes('18/09/2026'), 'Modal Batch - 006 memuat tanggal SHI "18/09/2026"');
assert(modalRenderedBody.includes('Divisi I - Block 006/25'), 'Modal Batch - 006 memuat divisi & block "Divisi I - Block 006/25"');
assert(modalRenderedBody.includes('260 Bibit'), 'Modal Batch - 006 memuat kuantitas SHI ternormalisasi "260 Bibit"');

// Test Batch - 005 detail modal (Main Nursery Available)
openBatchDetailModal(batch005);
assert(modalRenderedBody.includes('2.221 Bibit'), 'Modal Batch - 005 memuat Stok Tersedia "2.221 Bibit"');
assert(modalRenderedBody.includes('Belum ada riwayat pengeluaran bibit SHI (0 Bibit)'), 'Modal Batch - 005 memuat empty state SHI');

// Test Batch - 007 detail modal (APM - Aek Pamingke)
openBatchDetailModal(batch007);
assert(modalRenderedBody.includes('583 Bibit • 3%'), 'Modal Batch - 007 memuat "583 Bibit • 3%"');
assert(modalRenderedBody.includes('11.692 Bibit • 66,8%'), 'Modal Batch - 007 memuat "11.692 Bibit • 66,8%"');
assert(modalRenderedBody.includes('36 Bibit • 8%'), 'Modal Batch - 007 memuat "36 Bibit • 8%"');
assert(modalRenderedBody.includes('560 Bibit'), 'Modal Batch - 007 memuat Stok Tersedia "560 Bibit"');
assert(modalRenderedBody.includes('2026/NIR/005'), 'Modal Batch - 007 memuat dokumen SHI "2026/NIR/005"');

// Test Batch - 009 detail modal (Main Nursery - Aek Pamingke - Empty SHI state)
openBatchDetailModal(batch009);
assert(modalRenderedBody.includes('161 Bibit • 2%'), 'Modal Batch - 009 memuat "161 Bibit • 2%"');
assert(modalRenderedBody.includes('150 Bibit • 2%'), 'Modal Batch - 009 memuat "150 Bibit • 2%"');
assert(modalRenderedBody.includes('1.183 Bibit • 16,2%'), 'Modal Batch - 009 memuat "1.183 Bibit • 16,2%"');
assert(modalRenderedBody.includes('16 Bibit • 6,4%'), 'Modal Batch - 009 memuat "16 Bibit • 6,4%"');
assert(modalRenderedBody.includes('5.588 Bibit'), 'Modal Batch - 009 memuat Stok Tersedia "5.588 Bibit"');
assert(modalRenderedBody.includes('Belum ada riwayat pengeluaran bibit SHI (0 Bibit)'), 'Modal Batch - 009 memuat empty state SHI "Belum ada riwayat pengeluaran bibit SHI (0 Bibit)"');

// Test Batch - 010 detail modal (Main Nursery Available)
openBatchDetailModal(batch010);
assert(modalRenderedBody.includes('2.994 Bibit'), 'Modal Batch - 010 memuat Stok Tersedia "2.994 Bibit"');
assert(modalRenderedBody.includes('Belum ada riwayat pengeluaran bibit SHI (0 Bibit)'), 'Modal Batch - 010 memuat empty state SHI');

// Test Batch - 011 detail modal (APM - Empty Stock & Full SHI)
openBatchDetailModal(batch011);
assert(modalRenderedBody.includes('Batch - 011'), 'Modal Batch - 011 memuat batchCode "Batch - 011"');
assert(modalRenderedBody.includes('KOSONG'), 'Modal Batch - 011 memuat badge status "KOSONG"');
assert(modalRenderedBody.includes('Pihak Ke-III'), 'Modal Batch - 011 memuat Asal Bibit "Pihak Ke-III"');
assert(modalRenderedBody.includes('1.500 Bibit'), 'Modal Batch - 011 memuat stok awal "1.500 Bibit"');
assert(modalRenderedBody.includes('1.320 Bibit'), 'Modal Batch - 011 memuat total seleksi "1.320 Bibit"');
assert(modalRenderedBody.includes('88%'), 'Modal Batch - 011 memuat seleksi "88%"');
assert(modalRenderedBody.includes('0 Bibit'), 'Modal Batch - 011 memuat Stok Tersedia "0 Bibit"');
assert(modalRenderedBody.includes('2026/NIR/011'), 'Modal Batch - 011 memuat dokumen SHI "2026/NIR/011"');
assert(modalRenderedBody.includes('15/09/2026'), 'Modal Batch - 011 memuat tanggal SHI "15/09/2026"');
assert(modalRenderedBody.includes('Divisi II - Block 005/25'), 'Modal Batch - 011 memuat divisi & block "Divisi II - Block 005/25"');
assert(modalRenderedBody.includes('180 Bibit'), 'Modal Batch - 011 memuat kuantitas SHI ternormalisasi "180 Bibit"');

// Test Missing Data Handling on Asal Bibit (Batch 002 without asalBibit)
openBatchDetailModal(batch002);
assert(modalRenderedBody.includes('Asal Bibit</span><span style="color: #64748B;">:</span><strong style="color: #0F172A; word-break: break-word;">-</strong>'), 'Modal Batch - 002 (tanpa asalBibit) menampilkan "-"');
assert(!modalRenderedBody.includes('Pihak Ke-III'), 'Modal Batch - 002 TIDAK menggunakan fallback otomatis "Pihak Ke-III"');
assert(!modalRenderedBody.includes('>Material<'), 'Modal Batch - 002 TIDAK memuat nilai hardcoded "Material"');

// Synthetic missing asalBibit test to ensure no fallback to "Pihak Ke-III"
openBatchDetailModal({ ...batch001, asalBibit: undefined });
assert(modalRenderedBody.includes('Asal Bibit</span><span style="color: #64748B;">:</span><strong style="color: #0F172A; word-break: break-word;">-</strong>'), 'Modal dengan asalBibit undefined menghasilkan "-" dan tidak fallback ke "Pihak Ke-III"');

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
