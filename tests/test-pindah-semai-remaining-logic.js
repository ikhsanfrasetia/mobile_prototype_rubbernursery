/**
 * tests/test-pindah-semai-remaining-logic.js
 * Integration Test Suite for Pindah Semai Remaining Calculation & Document Status
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
import {
  getEligiblePindahSemaiSources,
  getAllInspectedDederanSources
} from '../js/modules/seeding/dederan-pindah-semai-adapter.js';

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
console.log('TEST SUITE: PINDAH SEMAI REMAINING LOGIC & DOCUMENT STATUS');
console.log('========================================================\n');

// SETUP MOCK ENVIRONMENT
function setupMockData({
  dederDocNo = '2026/DED/001',
  totalBerhasil = 9000,
  seedingRecords = [],
  includeOtherDeder = false
}) {
  localStorage.clear();

  // 1. Dederan Transaction
  const dederTxs = [
    {
      id: 'DED-TX-001',
      docNo: dederDocNo,
      parentDederIndukDocNo: '2026/DDR/001',
      bedenganId: 'BED-001',
      bedenganCode: 'B-01',
      klon: 'GT 1',
      jumlahDeder: totalBerhasil,
      tanggalDeder: '2026-03-01'
    }
  ];

  if (includeOtherDeder) {
    dederTxs.push({
      id: 'DED-TX-002',
      docNo: '2026/DED/002',
      parentDederIndukDocNo: '2026/DDR/002',
      bedenganId: 'BED-002',
      bedenganCode: 'B-02',
      klon: 'GT 1',
      jumlahDeder: 5000,
      tanggalDeder: '2026-03-02'
    });
  }
  storage.set('dederan_transactions', dederTxs);

  // 2. Dederan Inspection (100% inspected, totalBerhasil)
  const inspections = [
    {
      id: 'DED-INS-001',
      docNo: '2026/INS/001',
      dederanTxDocNo: dederDocNo,
      dederanTxId: 'DED-TX-001',
      jumlahDiperiksa: totalBerhasil,
      jumlahBerhasil: totalBerhasil,
      jumlahTidakBerhasil: 0,
      status: 'DISETUJUI',
      isFinal: true
    }
  ];

  if (includeOtherDeder) {
    inspections.push({
      id: 'DED-INS-002',
      docNo: '2026/INS/002',
      dederanTxDocNo: '2026/DED/002',
      dederanTxId: 'DED-TX-002',
      jumlahDiperiksa: 5000,
      jumlahBerhasil: 5000,
      jumlahTidakBerhasil: 0,
      status: 'DISETUJUI',
      isFinal: true
    });
  }
  storage.set('dederan_inspections', inspections);

  // 3. Selection Transactions (No reject = DIRECT_ELIGIBLE)
  storage.set('selection_transactions', []);

  // 4. Seeding Transactions (Pindah Semai records)
  storage.set('seeding_transactions', seedingRecords);
}

// IT-PINDAH-SEMAI-001: 9.000 berhasil / 8.900 pindah / 100 ditolak -> remaining 0
console.log('--- Test 1: IT-PINDAH-SEMAI-001 (9000 - 8900 - 100 = 0) ---');
setupMockData({
  totalBerhasil: 9000,
  seedingRecords: [
    {
      docNo: '2026/SOW/001',
      dederanTxDocNo: '2026/DED/001',
      sourceDederDocNo: '2026/DED/001',
      totalDisemai: 8900,
      ditolak: 100,
      alasanDitolak: 'Rusak'
    }
  ]
});
let sources = getEligiblePindahSemaiSources();
let src1 = sources.find(s => s.docNo === '2026/DED/001');
assert(src1 && src1.remainingQty === 0, `Remaining Qty is 0 (actual: ${src1?.remainingQty})`);
assert(src1 && src1.processedDisemaiQty === 8900, `Processed Disemai is 8.900 (actual: ${src1?.processedDisemaiQty})`);
assert(src1 && src1.processedDitolakQty === 100, `Processed Ditolak is 100 (actual: ${src1?.processedDitolakQty})`);
assert(src1 && src1.totalConsumedQty === 9000, `Total Consumed is 9.000 (actual: ${src1?.totalConsumedQty})`);

// IT-PINDAH-SEMAI-002: remaining 0 -> isCompleted true
console.log('\n--- Test 2: IT-PINDAH-SEMAI-002 (remaining 0 -> isCompleted true) ---');
assert(src1 && src1.isFullyProcessed === true, `isFullyProcessed is true when remaining == 0`);

// IT-PINDAH-SEMAI-003: remaining 0 -> Tombol Proses Pindah Semai tidak tersedia (Simulasi Landing)
console.log('\n--- Test 3: IT-PINDAH-SEMAI-003 (UI Completed State) ---');
const isCompleted = src1.remainingQty === 0;
const buttonRendered = !isCompleted;
assert(isCompleted === true && buttonRendered === false, `Action button 'Proses Pindah Semai' suppressed when completed`);

// IT-PINDAH-SEMAI-004: 9.000 / 8.500 / 100 -> remaining 400
console.log('\n--- Test 4: IT-PINDAH-SEMAI-004 (9000 - 8500 - 100 = 400) ---');
setupMockData({
  totalBerhasil: 9000,
  seedingRecords: [
    {
      docNo: '2026/SOW/001',
      dederanTxDocNo: '2026/DED/001',
      sourceDederDocNo: '2026/DED/001',
      totalDisemai: 8500,
      ditolak: 100,
      alasanDitolak: 'Rusak'
    }
  ]
});
sources = getEligiblePindahSemaiSources();
let src4 = sources.find(s => s.docNo === '2026/DED/001');
assert(src4 && src4.remainingQty === 400, `Remaining Qty is 400 (actual: ${src4?.remainingQty})`);
assert(src4 && src4.isFullyProcessed === false, `isFullyProcessed is false when remaining > 0`);

// IT-PINDAH-SEMAI-005: 9.000 / 9.000 / 0 -> remaining 0
console.log('\n--- Test 5: IT-PINDAH-SEMAI-005 (9000 - 9000 - 0 = 0) ---');
setupMockData({
  totalBerhasil: 9000,
  seedingRecords: [
    {
      docNo: '2026/SOW/001',
      dederanTxDocNo: '2026/DED/001',
      sourceDederDocNo: '2026/DED/001',
      totalDisemai: 9000,
      ditolak: 0
    }
  ]
});
sources = getEligiblePindahSemaiSources();
let src5 = sources.find(s => s.docNo === '2026/DED/001');
assert(src5 && src5.remainingQty === 0, `Remaining Qty is 0 (actual: ${src5?.remainingQty})`);

// IT-PINDAH-SEMAI-006: 9.000 / 8.900 / 0 -> remaining 100
console.log('\n--- Test 6: IT-PINDAH-SEMAI-006 (9000 - 8900 - 0 = 100) ---');
setupMockData({
  totalBerhasil: 9000,
  seedingRecords: [
    {
      docNo: '2026/SOW/001',
      dederanTxDocNo: '2026/DED/001',
      sourceDederDocNo: '2026/DED/001',
      totalDisemai: 8900,
      ditolak: 0
    }
  ]
});
sources = getEligiblePindahSemaiSources();
let src6 = sources.find(s => s.docNo === '2026/DED/001');
assert(src6 && src6.remainingQty === 100, `Remaining Qty is 100 (actual: ${src6?.remainingQty})`);

// IT-PINDAH-SEMAI-007: Transaksi DED lain tidak ikut terhitung
console.log('\n--- Test 7: IT-PINDAH-SEMAI-007 (Data Isolation Between DED Documents) ---');
setupMockData({
  dederDocNo: '2026/DED/001',
  totalBerhasil: 9000,
  includeOtherDeder: true,
  seedingRecords: [
    {
      docNo: '2026/SOW/001',
      dederanTxDocNo: '2026/DED/001',
      sourceDederDocNo: '2026/DED/001',
      totalDisemai: 8900,
      ditolak: 100
    },
    {
      docNo: '2026/SOW/002',
      dederanTxDocNo: '2026/DED/002',
      sourceDederDocNo: '2026/DED/002',
      totalDisemai: 3000,
      ditolak: 50
    }
  ]
});
sources = getEligiblePindahSemaiSources();
let ded1 = sources.find(s => s.docNo === '2026/DED/001');
let ded2 = sources.find(s => s.docNo === '2026/DED/002');
assert(ded1 && ded1.remainingQty === 0, `DED/001 remaining is 0 (actual: ${ded1?.remainingQty})`);
assert(ded2 && ded2.remainingQty === 1950, `DED/002 remaining is 1950 (5000 - 3000 - 50, actual: ${ded2?.remainingQty})`);

// IT-PINDAH-SEMAI-008: Multiple transaksi pada DED yang sama terakumulasi benar
console.log('\n--- Test 8: IT-PINDAH-SEMAI-008 (Multiple Seeding Transactions per DED) ---');
setupMockData({
  totalBerhasil: 9000,
  seedingRecords: [
    {
      docNo: '2026/SOW/001',
      dederanTxDocNo: '2026/DED/001',
      sourceDederDocNo: '2026/DED/001',
      totalDisemai: 4000,
      ditolak: 50
    },
    {
      docNo: '2026/SOW/002',
      dederanTxDocNo: '2026/DED/001',
      sourceDederDocNo: '2026/DED/001',
      totalDisemai: 4900,
      ditolak: 50
    }
  ]
});
sources = getEligiblePindahSemaiSources();
let src8 = sources.find(s => s.docNo === '2026/DED/001');
assert(src8 && src8.processedDisemaiQty === 8900, `Multi-tx processedDisemai is 8.900 (actual: ${src8?.processedDisemaiQty})`);
assert(src8 && src8.processedDitolakQty === 100, `Multi-tx processedDitolak is 100 (actual: ${src8?.processedDitolakQty})`);
assert(src8 && src8.totalConsumedQty === 9000, `Multi-tx totalConsumed is 9.000 (actual: ${src8?.totalConsumedQty})`);
assert(src8 && src8.remainingQty === 0, `Multi-tx remaining is 0 (actual: ${src8?.remainingQty})`);

// IT-PINDAH-SEMAI-009: Over-allocation tidak menghasilkan remaining negatif
console.log('\n--- Test 9: IT-PINDAH-SEMAI-009 (Over-allocation Clamping) ---');
setupMockData({
  totalBerhasil: 9000,
  seedingRecords: [
    {
      docNo: '2026/SOW/001',
      dederanTxDocNo: '2026/DED/001',
      sourceDederDocNo: '2026/DED/001',
      totalDisemai: 9000,
      ditolak: 100
    }
  ]
});
sources = getEligiblePindahSemaiSources();
let src9 = sources.find(s => s.docNo === '2026/DED/001');
assert(src9 && src9.remainingQty === 0, `Over-allocation remaining clamped to 0 (actual: ${src9?.remainingQty})`);

// IT-PINDAH-SEMAI-010: Adapter, Landing, Status, Button Visibility dan Form menghasilkan remaining yang konsisten
console.log('\n--- Test 10: IT-PINDAH-SEMAI-010 (Adapter vs Form Consistency Comparison) ---');
setupMockData({
  totalBerhasil: 9000,
  seedingRecords: [
    {
      docNo: '2026/SOW/001',
      dederanTxDocNo: '2026/DED/001',
      sourceDederDocNo: '2026/DED/001',
      sourceDocNo: '2026/DED/001',
      sourceIndex: 'DED_2026/DED/001',
      totalDisemai: 8900,
      ditolak: 100
    }
  ]
});
sources = getEligiblePindahSemaiSources();
let adapterSource = sources.find(s => s.docNo === '2026/DED/001');
let adapterRemaining = adapterSource.remainingQty;

// Simulasi Form calculation (seeding-form.js lines 140-156)
const sourceTx = adapterSource;
const seedingTxs = storage.get('seeding_transactions', []);
const totalPenerimaan = parseInt(sourceTx.totalBerhasil !== undefined ? sourceTx.totalBerhasil : (sourceTx.qty || 0), 10);
let accumulatedDisemai = 0;
let accumulatedDitolak = 0;
seedingTxs.forEach((s) => {
  if (
    s.sourceIndex == sourceTx.sourceIndex ||
    s.sourceDederTxId == sourceTx.sourceIndex ||
    s.sourceDocNo === sourceTx.docNo ||
    (s.dederanTxDocNo && sourceTx.dederanTxDocNo && s.dederanTxDocNo === sourceTx.dederanTxDocNo)
  ) {
    accumulatedDisemai += parseInt(s.totalDisemai || 0, 10);
    accumulatedDitolak += parseInt(s.ditolak || 0, 10);
  }
});
const formPreviousBalance = Math.max(0, totalPenerimaan - accumulatedDisemai - accumulatedDitolak);

console.log(`  Basis Evaluasi:`);
console.log(`  - Adapter totalBerhasil: ${adapterSource.totalBerhasil}`);
console.log(`  - Form totalPenerimaan: ${totalPenerimaan}`);
console.log(`  - Adapter remaining: ${adapterRemaining}`);
console.log(`  - Form previousBalance: ${formPreviousBalance}`);

assert(adapterSource.totalBerhasil === totalPenerimaan, `Basis populasi identik: Adapter (${adapterSource.totalBerhasil}) == Form (${totalPenerimaan})`);
assert(adapterRemaining === formPreviousBalance, `Remaining identik: Adapter (${adapterRemaining}) == Form (${formPreviousBalance})`);

console.log('\n========================================================');
console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
console.log('========================================================');

if (failed > 0) {
  process.exit(1);
}
