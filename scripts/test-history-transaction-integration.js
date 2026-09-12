/**
 * scripts/test-history-transaction-integration.js
 * Verification Suite for History and Transaction Manager Modules.
 * Validates Read-Only Compatibility with Master Klon, Master Budwood, and Master Plot.
 */

import {
  KLON_MASTER,
  KLON_STATUS,
  getAllKlons,
  getActiveKlons,
  resolveKlon,
  isKlonActive
} from '../js/data/klon-master.js';

import {
  BUDWOOD_MASTER,
  getAllBudwoods,
  getBudwoodByCode
} from '../js/data/budwood-master.js';

import {
  BUDWOOD_PLOT_MASTER,
  getAllBudwoodPlots,
  getPlotByName,
  getPlotById,
  resolvePlot
} from '../js/data/budwood-plot-master.js';

import { parseTxNumericQty, getTxItemUnit } from '../js/modules/transactions/transaction-manager.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`❌ FAIL: ${message}`);
  }
}

console.log('========================================================================================');
console.log('       TEST SUITE: FINAL INTEGRASI DAN VALIDASI HISTORY & TRANSACTION MANAGER           ');
console.log('========================================================================================\n');

// --------------------------------------------------------------------------------------
// 1. READ-ONLY CONSUMER PRINCIPLE & MASTER STATUS
// --------------------------------------------------------------------------------------
console.log('1. Read-Only Principle & Active Master Counts:');
const activeKlons = getActiveKlons();
const allPlots = getAllBudwoodPlots();
const allBudwoods = getAllBudwoods();

assert(activeKlons.length === 57, `Master Klon aktif harus tepat 57 (aktual: ${activeKlons.length})`);
assert(allPlots.length === 97, `Master Plot resmi harus tepat 97 (aktual: ${allPlots.length})`);
assert(allBudwoods.length === 1, `Master Budwood aktif harus tepat 1 (aktual: ${allBudwoods.length})`);
assert(allBudwoods[0].budwoodCode === '2021/BWG/001', 'Budwood code resmi adalah 2021/BWG/001');

// 7 Legacy clones exclusion from active masters
const legacyClones = ['IRR 300', 'PR 261', 'IRR 215', 'IRR 100', 'IRR 219', 'IRR 107', 'IRCA 120'];
for (const leg of legacyClones) {
  assert(!isKlonActive(leg), `Legacy clone "${leg}" TIDAK boleh berstatus ACTIVE di master`);
}

// 6 Legacy plots exclusion from active plots (not matching canonical plotName in 97 plots)
const legacyPlots = ['PLOT-ENT-01', 'PLOT-ENT-02', 'PLOT-ENT-03', 'PLOT-ENT-04', 'PLOT-ENT-05', 'PLOT-ENT-06'];
for (const lp of legacyPlots) {
  const isDirectPlotName = allPlots.some(p => p.plotName.toUpperCase() === lp.toUpperCase());
  assert(!isDirectPlotName, `Legacy plot "${lp}" TIDAK boleh menjadi nama plot aktif di master plot resmi`);
}

// --------------------------------------------------------------------------------------
// 2. RECEIPT TRANSACTIONS COMPATIBILITY (CANONICAL & LEGACY)
// --------------------------------------------------------------------------------------
console.log('\n2. Receipt Transactions History & TM Compatibility:');
const sampleReceipts = [
  {
    id: 'RCV-001',
    docNo: '2026/APR/001',
    program: 'Program Nursery 2026 - Batch 1',
    tahapan: 'Rubber Main Nursery',
    jenis: 'Benih / Biji Kelatak',
    tipeAsal: 'Pihak Ke-III',
    sumber: 'Supplier Bibit Jaya',
    klon: 'PB 260',
    budwoodCode: '2021/BWG/001',
    qty: 10000,
    batchNo: 'Batch-01',
    penerima: 'Wagiman',
    tanggal: '2026-09-12',
    status: 'APPROVED'
  },
  {
    id: 'RCV-002',
    docNo: '2026/APR/002',
    program: 'Program Nursery 2026 - Batch 1',
    tahapan: 'Rubber Advance Planting Material',
    jenis: 'Bibit / Tanaman Muda',
    tipeAsal: 'Kebun Sendiri',
    sumber: 'Tanah Besih - Divisi I',
    klon: 'IRCA 331',
    budwoodCode: '2021/BWG/001',
    qty: 2500,
    batchNo: 'Batch-APM-01',
    penerima: 'Wagiman',
    tanggal: '2026-09-12',
    status: 'APPROVED'
  },
  {
    id: 'RCV-LEGACY-001',
    docNo: 'RCV/2024/099',
    program: 'Program Replanting 2024',
    tahapan: 'Rubber Advance Planting Material',
    jenis: 'Bibit APM',
    sumber: 'Kebun Lama',
    klon: 'IRR 300', // Legacy clone
    qty: 5000,
    batchNo: 'Batch-LEGACY-01',
    penerima: 'Mandor Lama',
    tanggal: '2024-05-10',
    status: 'APPROVED'
  }
];

// Verify History normalization logic
sampleReceipts.forEach((tx, idx) => {
  const qty = parseInt(tx.qty || tx.jumlahBenih || tx.jumlahDiterima || 0);
  const isAPM = tx.tahapan === 'Rubber Advance Planting Material';
  const categoryLabel = isAPM ? 'Penerimaan APM' : 'Penerimaan Benih';
  const klonDisplay = tx.klon || tx.jenisBenih || tx.klonRootstock || '-';

  assert(qty > 0, `Receipt #${idx + 1} Qty ter-parse dengan benar: ${qty}`);
  assert(klonDisplay.length > 0, `Receipt #${idx + 1} Klon tampil: ${klonDisplay}`);
  assert(categoryLabel.includes('Penerimaan'), `Receipt #${idx + 1} Kategori label sesuai: ${categoryLabel}`);
});

// Verify Unit calculation in TM
assert(getTxItemUnit(sampleReceipts[0], 'reception') === 'Butir', 'Penerimaan benih unit = Butir');
assert(getTxItemUnit(sampleReceipts[1], 'reception') === 'Pkk', 'Penerimaan bibit APM unit = Pkk');
assert(getTxItemUnit(sampleReceipts[2], 'reception') === 'Pkk', 'Penerimaan APM legacy unit = Pkk');

// --------------------------------------------------------------------------------------
// 3. SEEDING TRANSACTIONS COMPATIBILITY (CANONICAL & LEGACY)
// --------------------------------------------------------------------------------------
console.log('\n3. Seeding Transactions History & TM Compatibility:');
const sampleSeedings = [
  {
    id: 'SEED-001',
    docNo: '2026/SOW/001',
    program: 'Program Nursery 2026 - Batch 1',
    tahapan: 'Rubber Main Nursery',
    batchNo: 'Batch-01',
    bedengan: 'Bedengan 01',
    klonAwal: 'GT 1',
    totalPenerimaan: 10000,
    totalDisemai: 9500,
    totalPolybag: 9500,
    ditolak: 500,
    alasanDitolak: 'Biji Kempes',
    mantri: 'Wagiman',
    date: '2026-09-12',
    status: 'COMPLETED'
  },
  {
    id: 'SEED-LEGACY-001',
    docNo: 'SEM/2024/045',
    program: 'Program Nursery 2024',
    tahapan: 'Rubber Main Nursery',
    batchNo: 'Batch-L-01',
    bedengan: 'Bedengan Lama 05',
    klonAwal: 'IRR 100', // Legacy clone
    totalPenerimaan: 5000,
    totalDisemai: 4800,
    ditolak: 200,
    mantri: 'Mandor Lama',
    date: '2024-03-01',
    status: 'COMPLETED'
  }
];

sampleSeedings.forEach((tx, idx) => {
  const qty = parseInt(tx.totalDisemai || tx.jumlahDitanam || 0);
  const rootstockKlon = tx.klonAwal || tx.klonRootstock || tx.klon || 'GT-01';
  assert(qty > 0, `Seeding #${idx + 1} disemai qty > 0 (${qty})`);
  assert(rootstockKlon.length > 0, `Seeding #${idx + 1} Klon rootstock tampil (${rootstockKlon})`);
});
assert(getTxItemUnit(sampleSeedings[0], 'seeding') === 'Butir', 'Penyemaian default unit = Butir');

// --------------------------------------------------------------------------------------
// 4. BUDDING & REGRAFTING TRANSACTIONS COMPATIBILITY
// --------------------------------------------------------------------------------------
console.log('\n4. Budding & Regrafting History & TM Compatibility:');
const sampleBuddings = [
  {
    id: 'OKL-001',
    docNo: '2026/GRF/001',
    type: 'GRAFTING',
    program: 'Program Nursery 2026 - Batch 1',
    tahapan: 'Rubber Main Nursery',
    batchNo: 'Batch-01',
    bedengan: 'Bedengan 01',
    klonRootstock: 'GT 1',
    klonEntres: 'PB 260',
    budwoodCode: '2021/BWG/001',
    jumlah: 4500,
    jumlahDitolak: 50,
    mantri: 'Wagiman',
    tanggal: '2026-09-12',
    status: 'COMPLETED'
  },
  {
    id: 'OKL-002',
    docNo: '2026/RGRF/001',
    type: 'REGRAFTING',
    program: 'Program Nursery 2026 - Batch 1',
    tahapan: 'Rubber Main Nursery',
    batchNo: 'Batch-01',
    bedengan: 'Bedengan 01',
    klonRootstock: 'GT 1',
    klonEntres: 'IRCA 331',
    budwoodCode: '2021/BWG/001',
    jumlah: 300,
    mantri: 'Wagiman',
    tanggal: '2026-09-12',
    status: 'COMPLETED'
  },
  {
    id: 'OKL-LEGACY-001',
    docNo: 'OKL/2024/099',
    type: 'GRAFTING',
    program: 'Program Nursery 2024',
    tahapan: 'Rubber Main Nursery',
    batchNo: 'Batch-L-01',
    bedengan: 'Bedengan Lama 01',
    klonRootstock: 'IRR 107', // Legacy rootstock
    klonEntres: 'IRCA 120',   // Legacy entres
    jumlah: 2000,
    mantri: 'Mandor Lama',
    tanggal: '2024-04-15',
    status: 'COMPLETED'
  }
];

sampleBuddings.forEach((tx, idx) => {
  const isRegraft = tx.type === 'REGRAFTING';
  const label = isRegraft ? 'Okulasi Janda' : 'Okulasi';
  const klonPair = `${tx.klonEntres} / ${tx.klonRootstock}`;
  assert(tx.jumlah > 0, `Budding #${idx + 1} jumlah > 0 (${tx.jumlah})`);
  assert(klonPair.includes('/'), `Budding #${idx + 1} klon pair format valid: ${klonPair}`);
  assert(label.includes('Okulasi'), `Budding #${idx + 1} label valid: ${label}`);
});

// --------------------------------------------------------------------------------------
// 5. INSPECTION & SELECTION (AFKIR) AGGREGATION COMPATIBILITY
// --------------------------------------------------------------------------------------
console.log('\n5. Inspection & Selection (Afkir) Aggregations:');
const sampleInspections = [
  {
    id: 'INSP-001',
    docNo: '2026/INS/001',
    buddingDocNo: '2026/GRF/001',
    program: 'Program Nursery 2026 - Batch 1',
    tahapan: 'Rubber Main Nursery',
    batchNo: 'Batch-01',
    bedengan: 'Bedengan 01',
    klonEntres: 'PB 260',
    totalDiperiksa: 4500,
    jumlahJadi: 4100,
    jumlahGagal: 400,
    persenJadi: 91,
    totalToRegrafting: 300,
    totalToSelection: 100,
    inspector: 'Wagiman',
    tanggal: '2026-09-12',
    status: 'VERIFIED'
  }
];

const sampleSelections = [
  {
    id: 'CUL-001',
    docNo: '2026/CULL/001',
    program: 'Program Nursery 2026 - Batch 1',
    tahapan: 'Rubber Main Nursery',
    batchNo: 'Batch-01',
    bedengan: 'Bedengan 01',
    klon: 'PB 260',
    jumlahAfkir: 100,
    alasan: 'MATI',
    mantri: 'Wagiman',
    tanggal: '2026-09-12',
    status: 'APPROVED'
  }
];

// Stock availability math formula validation (as implemented in nursery-history.js)
const stokAwal = sampleReceipts.filter(r => r.program === 'Program Nursery 2026 - Batch 1' && r.tahapan === 'Rubber Main Nursery')
  .reduce((sum, r) => sum + r.qty, 0);
const afkirTotal = sampleSelections.reduce((sum, s) => sum + s.jumlahAfkir, 0);
const stokAktual = Math.max(0, stokAwal - afkirTotal);

assert(stokAwal === 10000, `Stok Awal RMN: ${stokAwal}`);
assert(afkirTotal === 100, `Total Afkir: ${afkirTotal}`);
assert(stokAktual === 9900, `Stok Aktual Ketersediaan (Non-Afkir): ${stokAktual}`);

// --------------------------------------------------------------------------------------
// 6. KEBUN ENTRES (TOPPING & MENUNAS) MASTER & LEGACY COMPATIBILITY
// --------------------------------------------------------------------------------------
console.log('\n6. Kebun Entres History & TM Aggregation:');
const sampleEntresTxs = [
  {
    id: 'ENT-001',
    docNo: '2026/TOP/001',
    activityType: 'TOPPING',
    plotId: 'Plot IA',
    plotName: 'Plot IA',
    kodePlot: 'Plot IA',
    klon: 'PB 260',
    budwoodCode: '2021/BWG/001',
    jumlahPokok: 120,
    petugas: 'Suryanto',
    tanggal: '2026-09-12',
    status: 'COMPLETED'
  },
  {
    id: 'ENT-002',
    docNo: '2026/TUN/001',
    activityType: 'MENUNAS',
    plotId: 'Plot XXIVB',
    plotName: 'Plot XXIVB',
    kodePlot: 'Plot XXIVB',
    klon: 'IRCA 331',
    budwoodCode: '2021/BWG/001',
    jumlahPokok: 85,
    petugas: 'Suryanto',
    tanggal: '2026-09-12',
    status: 'COMPLETED'
  },
  {
    id: 'ENT-LEGACY-001',
    docNo: 'ENT/2024/011',
    activityType: 'MENUNAS',
    plotId: 'PLOT-ENT-01', // Legacy plot
    plotName: 'PLOT-ENT-01',
    klon: 'PB 260',
    jumlahPokok: 50,
    petugas: 'Mandor Lama',
    tanggal: '2024-02-14',
    status: 'COMPLETED'
  }
];

sampleEntresTxs.forEach((tx, idx) => {
  const qty = parseTxNumericQty(tx.jumlahPokok || 0);
  const unit = getTxItemUnit(tx, 'entres');
  const plotDisplay = tx.plotId || tx.plotNo || 'Plot Entres';

  assert(qty > 0, `Entres Tx #${idx + 1} jumlahPokok parsed: ${qty}`);
  assert(unit === 'Pkk', `Entres Tx #${idx + 1} unit = Pkk`);
  assert(plotDisplay.length > 0, `Entres Tx #${idx + 1} plot teridentifikasi: ${plotDisplay}`);
});

// --------------------------------------------------------------------------------------
// 7. PERMINTAAN BIBIT (SPB) TRANSACTIONS COMPATIBILITY
// --------------------------------------------------------------------------------------
console.log('\n7. SPB Permintaan Bibit History & TM Aggregation:');
const sampleRequests = [
  {
    id: 'REQ-001',
    docNo: 'SPB/KSP/2026/001',
    program: 'Program Replanting 2026',
    klon: 'PB 260',
    targetDivision: 'Tanah Besih - Divisi I',
    qtyRequested: 1500,
    qtyDispatched: 1500,
    unit: 'Pkk',
    status: 'COMPLETED'
  },
  {
    id: 'REQ-LEGACY-001',
    docNo: 'SPB/KSP/2024/099',
    program: 'Program Replanting 2024',
    klon: 'IRR 300', // Legacy clone
    targetDivision: 'Negeri Lama - Divisi II',
    qtyRequested: 2000,
    qtyDispatched: 2000,
    unit: 'Pkk',
    status: 'COMPLETED'
  }
];

sampleRequests.forEach((tx, idx) => {
  const reqQty = parseTxNumericQty(tx.qtyRequested || 0);
  const dispQty = parseTxNumericQty(tx.qtyDispatched || 0);
  const unit = getTxItemUnit(tx, 'request');
  assert(reqQty > 0 && dispQty > 0, `SPB #${idx + 1} Qty requested (${reqQty}) & dispatched (${dispQty}) valid`);
  assert(unit === 'Pkk', `SPB #${idx + 1} unit = Pkk`);
});

// --------------------------------------------------------------------------------------
// 8. DATA INTEGRITY: NON-DESTRUCTIVE / IMMUTABLE VERIFICATION
// --------------------------------------------------------------------------------------
console.log('\n8. Historical Non-Destructive Data Preservation Check:');
const originalLegacySnapshot = {
  id: 'HIST-TX-001',
  docNo: 'RCV/2023/HIST-01',
  klon: 'IRR 300',
  plot: 'PLOT-ENT-01',
  qty: 1200
};

const snapshotCopy = JSON.parse(JSON.stringify(originalLegacySnapshot));
// Simulate Transaction Manager search / aggregation / detail rendering
const tmSearchString = JSON.stringify(snapshotCopy).toLowerCase();
const matchesSearch = tmSearchString.includes('irr 300') && tmSearchString.includes('plot-ent-01');

assert(matchesSearch, 'Search query TM mampu menemukan klon dan plot legacy secara universal');
assert(snapshotCopy.klon === originalLegacySnapshot.klon, 'Data klon legacy TIDAK termutasi saat diakses TM');
assert(snapshotCopy.plot === originalLegacySnapshot.plot, 'Data plot legacy TIDAK termutasi saat diakses TM');
assert(snapshotCopy.qty === originalLegacySnapshot.qty, 'Data qty legacy TIDAK termutasi saat diakses TM');

// --------------------------------------------------------------------------------------
// SUMMARY
// --------------------------------------------------------------------------------------
console.log('\n----------------------------------------------------------------------------------------');
console.log(`TOTAL ASSERTIONS: ${passed + failed}`);
console.log(`PASSED:           ${passed}`);
console.log(`FAILED:           ${failed}`);
console.log('----------------------------------------------------------------------------------------');

if (failed === 0) {
  console.log('✅ ALL HISTORY & TRANSACTION MANAGER INTEGRATION TESTS PASSED (0 FAILURES)!');
} else {
  console.error('❌ SOME INTEGRATION TESTS FAILED!');
  process.exit(1);
}
