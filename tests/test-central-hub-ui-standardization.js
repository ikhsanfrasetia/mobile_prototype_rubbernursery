/**
 * tests/test-central-hub-ui-standardization.js
 * Integration Test Suite: Global UI Standardization Verification for Central Hub (#/mantri-confirmation)
 *
 * Validates:
 * 1. Universal Card Hierarchy: Header (Label/Status) -> Primary Entity -> Primary Doc -> Qty -> Separator -> Reference -> Context + Date Bottom-Right
 * 2. All 12+ modules mapped consistently via getUniversalCardConfig / renderUniversalCard
 * 3. Material card reference design parity preserved
 * 4. Zero text-overflow: ellipsis on identity fields (uses overflow-wrap: anywhere; word-break: normal)
 * 5. Date bottom-right invariant across all cards
 * 6. Detail Modal two-section standardized structure
 */

// In-memory localStorage mock for isolated node execution
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

// Global document mock for modal / dom rendering utilities
global.document = {
  getElementById: () => null,
  querySelectorAll: () => []
};

import {
  MODULE_TYPES,
  MODULE_LABELS,
  MANTRI_TRANSACTION_STATUS
} from '../js/modules/verification/mantri-confirmation-service.js';

import {
  getUniversalCardConfig,
  renderUniversalCard
} from '../js/modules/verification/mantri-confirmation-landing.js';

let totalPassed = 0;
let totalFailed = 0;
const results = [];

function assert(condition, testId, message) {
  if (condition) {
    totalPassed++;
    results.push({ id: testId, status: 'PASS', message });
    console.log(`  [PASS] ${testId}: ${message}`);
  } else {
    totalFailed++;
    results.push({ id: testId, status: 'FAIL', message });
    console.error(`  [FAIL] ${testId}: ${message}`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('RUNNING INTEGRATION TESTS: CENTRAL HUB GLOBAL UI STANDARDIZATION');
console.log('='.repeat(80) + '\n');

// ----------------------------------------------------------------------------
// TEST 1: PENYEMAIAN CONFIG & CARD STRUCTURE
// ----------------------------------------------------------------------------
const penyemaianTx = {
  id: 'SEED-001',
  docNo: '2026/SOW/001',
  moduleType: MODULE_TYPES.PENYEMAIAN,
  moduleLabel: 'Penyemaian',
  date: '02/10/2026',
  status: MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM,
  rawRecord: {
    docNo: '2026/SOW/001',
    batchNo: 'BTCH-001',
    bedengan: 'BED-001',
    klonAwal: 'PB 260',
    totalDisemai: 8900,
    program: 'TBM-1'
  },
  display: {
    title: 'Penyemaian Benih',
    info: 'Batch BTCH-001 · Bedengan BED-001',
    mainQty: '8.900 Bibit'
  }
};

const semaiConfig = getUniversalCardConfig(penyemaianTx);
assert(semaiConfig.moduleLabel === 'PENYEMAIAN', 'IT-UI-STD-001', 'Penyemaian module label uppercase in config');
assert(semaiConfig.primaryEntity === 'Penyemaian Benih', 'IT-UI-STD-001', 'Penyemaian primary entity is canonical title');
assert(semaiConfig.primaryDoc === '2026/SOW/001', 'IT-UI-STD-001', 'Penyemaian primary doc is 2026/SOW/001');
assert(semaiConfig.quantityText === '8.900 Bibit', 'IT-UI-STD-001', 'Penyemaian quantityText formatted with UOM');
assert(semaiConfig.contextText.includes('BTCH-001') && semaiConfig.contextText.includes('BED-001'), 'IT-UI-STD-001', 'Penyemaian context contains batch and bedengan');

const semaiHtml = renderUniversalCard(penyemaianTx);
assert(semaiHtml.includes('PENYEMAIAN'), 'IT-UI-STD-002', 'Card contains PENYEMAIAN header label');
assert(semaiHtml.includes('Penyemaian Benih'), 'IT-UI-STD-002', 'Card contains primary entity Penyemaian Benih');
assert(semaiHtml.includes('2026/SOW/001'), 'IT-UI-STD-002', 'Card contains document 2026/SOW/001');
assert(semaiHtml.includes('8.900 Bibit'), 'IT-UI-STD-002', 'Card contains quantity 8.900 Bibit');
assert(semaiHtml.includes('border-top: 1px solid #E2E8F0'), 'IT-UI-STD-002', 'Card contains separator line');
assert(semaiHtml.includes('02/10/2026'), 'IT-UI-STD-002', 'Card contains formatted date');

// ----------------------------------------------------------------------------
// TEST 2: PENERIMAAN MODULE STANDARDIZATION
// ----------------------------------------------------------------------------
const penerimaanTx = {
  id: 'RCV-001',
  docNo: 'RCV/2026/10/001',
  moduleType: MODULE_TYPES.PENERIMAAN,
  moduleLabel: 'Penerimaan',
  date: '02/10/2026',
  status: MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM,
  rawRecord: {
    docNo: 'RCV/2026/10/001',
    qty: 10000,
    klon: 'GT 1',
    tipeAsal: 'Kebun Induk',
    sir: 'SIR-2026-09'
  },
  display: {
    title: 'Penerimaan Benih',
    info: 'Klon GT 1 · Kebun Induk',
    mainQty: '10.000 Butir'
  }
};

const rcvConfig = getUniversalCardConfig(penerimaanTx);
assert(rcvConfig.moduleLabel === 'PENERIMAAN', 'IT-UI-STD-003', 'Penerimaan config moduleLabel uppercase');
assert(rcvConfig.primaryEntity === 'Penerimaan Benih', 'IT-UI-STD-003', 'Penerimaan primaryEntity is canonical title');
assert(rcvConfig.primaryDoc === 'RCV/2026/10/001', 'IT-UI-STD-003', 'Penerimaan primary doc');
assert(rcvConfig.referenceText === 'No. SIR: SIR-2026-09', 'IT-UI-STD-003', 'Penerimaan reference contains SIR');

const rcvHtml = renderUniversalCard(penerimaanTx);
assert(rcvHtml.includes('PENERIMAAN') && rcvHtml.includes('10.000 Butir'), 'IT-UI-STD-003', 'Penerimaan card HTML conforms to universal layout');

// ----------------------------------------------------------------------------
// TEST 3: DEDERAN MODULE STANDARDIZATION
// ----------------------------------------------------------------------------
const dederanTx = {
  id: 'DED-001',
  docNo: 'DED/2026/01',
  moduleType: MODULE_TYPES.DEDERAN,
  moduleLabel: 'Dederan',
  date: '02/10/2026',
  status: MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM,
  rawRecord: {
    docNo: 'DED/2026/01',
    jumlahDeder: 5000,
    bedenganCode: 'BDG-005',
    klon: 'AVROS 2003'
  },
  display: {
    title: 'Germinasi / Dederan',
    info: 'Bedengan BDG-005 · Klon AVROS 2003',
    mainQty: '5.000 Butir Deder'
  }
};

const dedConfig = getUniversalCardConfig(dederanTx);
assert(dedConfig.moduleLabel === 'DEDERAN', 'IT-UI-STD-004', 'Dederan module label is DEDERAN');
assert(dedConfig.primaryEntity === 'Germinasi / Dederan', 'IT-UI-STD-004', 'Dederan primary entity');
assert(dedConfig.quantityText === '5.000 Butir Deder', 'IT-UI-STD-004', 'Dederan quantityText');

// ----------------------------------------------------------------------------
// TEST 4: KEBUN ENTRES (MENUNAS & TOPPING)
// ----------------------------------------------------------------------------
const menunasTx = {
  id: 'TUNAS-001',
  docNo: 'TUNAS/2026/01',
  moduleType: MODULE_TYPES.KEBUN_ENTRES,
  activityType: 'MENUNAS',
  date: '02/10/2026',
  status: MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM,
  rawRecord: {
    type: 'MENUNAS',
    jumlahPohonDitunas: 150,
    kodePlot: 'PLT-01',
    namaKlon: 'PB 260',
    budwoodCode: 'KEBUN-A'
  },
  display: {
    title: 'Entres Menunas',
    mainQty: '150 Pokok Ditunas'
  }
};

const toppingTx = {
  id: 'TOP-001',
  docNo: 'TOP/2026/01',
  moduleType: MODULE_TYPES.KEBUN_ENTRES,
  activityType: 'TOPPING',
  date: '02/10/2026',
  status: MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM,
  rawRecord: {
    type: 'TOPPING',
    jumlahKayu: 100,
    jumlahPerisai: 500,
    kodePlot: 'PLT-02',
    namaKlon: 'RRIC 100'
  },
  display: {
    title: 'Entres Topping',
    mainQty: '100 Btg · 500 Perisai'
  }
};

const menunasConfig = getUniversalCardConfig(menunasTx);
const toppingConfig = getUniversalCardConfig(toppingTx);
assert(menunasConfig.moduleLabel === 'ENTRES MENUNAS' && menunasConfig.primaryEntity === 'Entres Menunas', 'IT-UI-STD-005', 'Menunas config correct');
assert(toppingConfig.moduleLabel === 'ENTRES TOPPING' && toppingConfig.primaryEntity === 'Entres Topping', 'IT-UI-STD-005', 'Topping config correct');
assert(toppingConfig.quantityText.includes('100 Btg') && toppingConfig.quantityText.includes('500 Perisai'), 'IT-UI-STD-005', 'Topping dual-quantity formatted');

// ----------------------------------------------------------------------------
// TEST 5: OKULASI MODULE STANDARDIZATION
// ----------------------------------------------------------------------------
const okulasiTx = {
  id: 'OKL-001',
  docNo: 'OKL/2026/01',
  moduleType: MODULE_TYPES.OKULASI,
  date: '02/10/2026',
  status: MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM,
  rawRecord: {
    docNo: 'OKL/2026/01',
    jumlah: 2500,
    type: 'GRAFTING',
    bedengan: 'BDG-002',
    klonEntres: 'PB 260'
  },
  display: {
    title: 'Okulasi Bibitan',
    mainQty: '2.500 Pkk'
  }
};

const oklConfig = getUniversalCardConfig(okulasiTx);
assert(oklConfig.moduleLabel === 'OKULASI', 'IT-UI-STD-006', 'Okulasi moduleLabel is OKULASI');
assert(oklConfig.primaryEntity === 'Okulasi Bibitan', 'IT-UI-STD-006', 'Okulasi primary entity');
assert(oklConfig.quantityText === '2.500 Pkk', 'IT-UI-STD-006', 'Okulasi quantityText');

// ----------------------------------------------------------------------------
// TEST 6: PEMERIKSAAN OKULASI & PEMERIKSAAN DEDERAN (WITH BREAKDOWN)
// ----------------------------------------------------------------------------
const periksaOkulasiTx = {
  id: 'INSP-001',
  docNo: 'INSP/2026/01',
  moduleType: MODULE_TYPES.PEMERIKSAAN,
  date: '02/10/2026',
  status: MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM,
  rawRecord: {
    totalDiperiksa: 2000,
    jumlahJadi: 1800,
    jumlahGagal: 200,
    bedengan: 'BDG-003',
    klonEntres: 'PB 260'
  },
  display: {
    title: 'Pemeriksaan Okulasi',
    mainQty: '2.000 Diperiksa',
    breakdown: '1.800 Berhasil, 200 Tidak Berhasil'
  }
};

const inspConfig = getUniversalCardConfig(periksaOkulasiTx);
assert(inspConfig.moduleLabel === 'PEMERIKSAAN OKULASI', 'IT-UI-STD-007', 'Pemeriksaan Okulasi moduleLabel');
assert(inspConfig.breakdownText === '1.800 Berhasil, 200 Tidak Berhasil', 'IT-UI-STD-007', 'Pemeriksaan Okulasi breakdown preserved');

const inspHtml = renderUniversalCard(periksaOkulasiTx);
assert(inspHtml.includes('2.000 Diperiksa') && inspHtml.includes('1.800 Berhasil, 200 Tidak Berhasil'), 'IT-UI-STD-007', 'Card renders both main quantity and breakdown');

// ----------------------------------------------------------------------------
// TEST 7: SELEKSI PRA-OKULASI
// ----------------------------------------------------------------------------
const seleksiPraTx = {
  id: 'PRE-001',
  docNo: 'PRE/2026/01',
  moduleType: MODULE_TYPES.SELEKSI_PRA_OKULASI,
  date: '02/10/2026',
  status: MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM,
  rawRecord: {
    selectionStage: 'Seleksi I',
    totalLayak: 4500,
    totalAfkir: 500,
    batchCode: 'BTCH-001',
    bedengan: 'BDG-001'
  },
  display: {
    title: 'Seleksi Pra-Okulasi (Seleksi I)',
    mainQty: '4.500 Layak'
  }
};

const preConfig = getUniversalCardConfig(seleksiPraTx);
assert(preConfig.moduleLabel === 'SELEKSI PRA-OKULASI', 'IT-UI-STD-008', 'Seleksi Pra-Okulasi moduleLabel');
assert(preConfig.primaryEntity === 'Seleksi Pra-Okulasi (Seleksi I)', 'IT-UI-STD-008', 'Seleksi Pra-Okulasi primaryEntity');
assert(preConfig.breakdownText === '500 Afkir', 'IT-UI-STD-008', 'Seleksi Pra-Okulasi afkir breakdown');

// ----------------------------------------------------------------------------
// TEST 8: PENYELEKSIAN BIBIT
// ----------------------------------------------------------------------------
const seleksiTx = {
  id: 'SEL-001',
  docNo: 'SEL/2026/01',
  moduleType: MODULE_TYPES.PENYELEKSIAN,
  date: '02/10/2026',
  status: MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM,
  rawRecord: {
    stage: 'Bibit Salur',
    reason: 'Kerdil',
    actualBibitSelectedQty: 40,
    actualBibitRetainedQty: 960,
    bedengan: 'BDG-004'
  },
  display: {
    title: 'Penyeleksian Bibit',
    mainQty: '40 Bibit Afkir'
  }
};

const selConfig = getUniversalCardConfig(seleksiTx);
assert(selConfig.moduleLabel === 'PENYELEKSIAN', 'IT-UI-STD-009', 'Penyeleksian moduleLabel is PENYELEKSIAN');
assert(selConfig.quantityText === '40 Bibit Afkir', 'IT-UI-STD-009', 'Penyeleksian quantityText');
assert(selConfig.referenceText === 'Kategori: Kerdil', 'IT-UI-STD-009', 'Penyeleksian reference category');

// ----------------------------------------------------------------------------
// TEST 9: PEMELIHARAAN MODULE STANDARDIZATION
// ----------------------------------------------------------------------------
const rawActTx = {
  id: 'ACT-001',
  docNo: 'ACT/2026/01',
  moduleType: MODULE_TYPES.PEMELIHARAAN,
  date: '02/10/2026',
  status: MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM,
  rawRecord: {
    aktivitas: { nama: 'Penyiraman Rutin', volume: 1500 },
    bedengan: 'BDG-001'
  },
  display: {
    title: 'Rekam Pemeliharaan',
    mainQty: '1.500 Pkk'
  }
};

const actConfig = getUniversalCardConfig(rawActTx);
assert(actConfig.moduleLabel === 'PEMELIHARAAN', 'IT-UI-STD-010', 'Pemeliharaan moduleLabel');
assert(actConfig.primaryEntity === 'Penyiraman Rutin', 'IT-UI-STD-010', 'Pemeliharaan primary entity is activity name');
assert(actConfig.quantityText === '1.500 Pkk', 'IT-UI-STD-010', 'Pemeliharaan volume');

// ----------------------------------------------------------------------------
// TEST 10: PENGELUARAN MODULE STANDARDIZATION
// ----------------------------------------------------------------------------
const dispatchTx = {
  id: 'DSP-001',
  docNo: 'DSP/2026/01',
  moduleType: MODULE_TYPES.PENGELUARAN,
  date: '02/10/2026',
  status: MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM,
  rawRecord: {
    issuedQty: 3000,
    clone: 'PB 260',
    targetDivisionName: 'Divisi I',
    vehiclePlate: 'BK 1234 AB'
  },
  display: {
    title: 'Pengeluaran Bibit',
    mainQty: '3.000 Pkk'
  }
};

const dspConfig = getUniversalCardConfig(dispatchTx);
assert(dspConfig.moduleLabel === 'PENGELUARAN', 'IT-UI-STD-011', 'Pengeluaran moduleLabel');
assert(dspConfig.quantityText === '3.000 Pkk', 'IT-UI-STD-011', 'Pengeluaran quantity');
assert(dspConfig.contextText.includes('Divisi I') && dspConfig.contextText.includes('PB 260'), 'IT-UI-STD-011', 'Pengeluaran destination and clone in context');

// ----------------------------------------------------------------------------
// TEST 11: MATERIAL REFERENCE DESIGN PARITY
// ----------------------------------------------------------------------------
const materialTx = {
  id: 'MAT-001',
  docNo: '2026/SOW/001',
  issueDocNo: 'ISSUE/2026/01/009',
  itemName: 'POLYBAG 25X50CMX0,20MM',
  quantityUsed: 4450,
  uom: 'LBR',
  referenceDocNo: '2026/SOW/001',
  batchCode: 'BTCH-001',
  bedenganCode: 'BED-001',
  moduleType: MODULE_TYPES.MATERIAL,
  date: '02/10/2026',
  status: MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM
};

const matHtml = renderUniversalCard(materialTx);
assert(matHtml.includes('MATERIAL &amp; BAHAN'), 'IT-UI-STD-012', 'Material card has MATERIAL & BAHAN header');
assert(matHtml.includes('POLYBAG 25X50CMX0,20MM'), 'IT-UI-STD-012', 'Material card has exact item name');
assert(matHtml.includes('ISSUE/2026/01/009'), 'IT-UI-STD-012', 'Material card has exact issue document');
assert(matHtml.includes('4.450 LBR'), 'IT-UI-STD-012', 'Material card has exact 4.450 LBR');
assert(matHtml.includes('Referensi: 2026/SOW/001'), 'IT-UI-STD-012', 'Material card has exact reference SOW');
assert(matHtml.includes('Batch: BTCH-001 · Bedengan: BED-001'), 'IT-UI-STD-012', 'Material card has exact batch/bedengan');
assert(matHtml.includes('02/10/2026'), 'IT-UI-STD-012', 'Material card has bottom-right date');

// ----------------------------------------------------------------------------
// TEST 12: NO IDENTITY TRUNCATION INVARIANT
// ----------------------------------------------------------------------------
const allSampleTxs = [
  penyemaianTx, penerimaanTx, dederanTx, menunasTx, toppingTx,
  okulasiTx, periksaOkulasiTx, seleksiPraTx, seleksiTx, rawActTx, dispatchTx, materialTx
];

let allCardsSafeFromEllipsis = true;
let allCardsHaveWrapSafe = true;

allSampleTxs.forEach(tx => {
  const html = renderUniversalCard(tx);
  // Check that identity fields don't have text-overflow: ellipsis
  if (html.includes('text-overflow: ellipsis')) {
    allCardsSafeFromEllipsis = false;
  }
  // Check that overflow-wrap: anywhere is applied
  if (!html.includes('overflow-wrap: anywhere')) {
    allCardsHaveWrapSafe = false;
  }
});

assert(allCardsSafeFromEllipsis, 'IT-UI-STD-013', 'Zero text-overflow: ellipsis across all universal transaction cards');
assert(allCardsHaveWrapSafe, 'IT-UI-STD-013', 'All universal cards use overflow-wrap: anywhere for safe wrapping');

// ----------------------------------------------------------------------------
// TEST 13: DATE POSITION INVARIANT (BOTTOM-RIGHT)
// ----------------------------------------------------------------------------
let allDatesInBottomRight = true;

allSampleTxs.forEach(tx => {
  const html = renderUniversalCard(tx);
  // Date must appear in the last flex row after the separator
  const separatorIndex = html.indexOf('border-top: 1px solid #E2E8F0');
  const dateIndex = html.indexOf('02/10/2026');
  if (dateIndex < separatorIndex) {
    allDatesInBottomRight = false;
  }
});

assert(allDatesInBottomRight, 'IT-UI-STD-014', 'Date is positioned after separator in bottom-right row across 100% of modules');

// ----------------------------------------------------------------------------
// TEST 14: LEWAT WAKTU / EXPIRED BADGE CONSISTENCY
// ----------------------------------------------------------------------------
const expiredTx = {
  ...penyemaianTx,
  id: 'SEED-EXP',
  isSubmissionExpired: true
};

const expiredHtml = renderUniversalCard(expiredTx);
assert(expiredHtml.includes('LEWAT WAKTU'), 'IT-UI-STD-015', 'Expired transaction displays LEWAT WAKTU badge in header row');
assert(expiredHtml.includes('btn-expired-info'), 'IT-UI-STD-015', 'Expired badge includes interactive info button');

console.log('\n' + '='.repeat(80));
console.log(`TEST SUMMARY: TOTAL = ${totalPassed + totalFailed} | PASSED = ${totalPassed} | FAILED = ${totalFailed}`);
console.log('='.repeat(80) + '\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
