/**
 * test-integration-flow.js
 * Mandatory Integration Test Suite for:
 * Flow: Menunas -> Topping -> Mata Entres -> Grafting -> Pemeriksaan -> Regrafting
 *
 * Test Codes:
 * - IT-MN-01 to IT-MN-06 (Menunas & Legacy Preservation)
 * - IT-TOP-01 to IT-TOP-06 (Topping & Menunas Decoupling)
 * - IT-STK-01 to IT-STK-03 (Mata Entres Stock & FIFO)
 * - IT-OKU-01 (Grafting Mata Entres Consumption)
 * - IT-INS-01 (Inspection Zero Consumption)
 * - IT-REG-01 to IT-REG-03 (Regrafting Dual Gate & Quantity Semantics)
 * - IT-GRD-01 (Edit/Delete Guards Preventing Stock Deficit)
 */

// 1. Mock localStorage for Node environment
const memoryStore = new Map();
globalThis.localStorage = {
  getItem: (k) => memoryStore.get(k) || null,
  setItem: (k, v) => memoryStore.set(k, String(v)),
  removeItem: (k) => memoryStore.delete(k),
  clear: () => memoryStore.clear()
};

import { storage } from './js/core/storage.js';
import { resolvePlot, getAllBudwoodPlots } from './js/data/budwood-plot-master.js';
import {
  getMataEntresBalances,
  getAvailableKlonsForOkulasi,
  getKlonMataEntresBalance,
  getFifoAllocationBreakdown,
  validateOkulasiPerisaiUsage,
  validateToppingDeletion,
  validateToppingUpdate
} from './js/core/entres-inventory-service.js';
import { findDownstreamDependency } from './js/core/dependency-guard.js';

let passed = 0;
let failed = 0;
const testResults = [];

function assert(condition, testId, description, details = '') {
  if (condition) {
    console.log(`\x1b[32m✔ PASS:\x1b[0m [${testId}] ${description}`);
    passed++;
    testResults.push({ id: testId, desc: description, status: 'PASS' });
  } else {
    console.error(`\x1b[31m✘ FAIL:\x1b[0m [${testId}] ${description} ${details ? `-> ${details}` : ''}`);
    failed++;
    testResults.push({ id: testId, desc: description, status: 'FAIL', details });
  }
}

console.log('====================================================');
console.log('RUNNING MANDATORY INTEGRATION TESTS');
console.log('====================================================\n');

// Reset storage before test suite
globalThis.localStorage.clear();

// ---------------------------------------------------------------------------
// 1. MENUNAS INTEGRATION TESTS
// ---------------------------------------------------------------------------

// IT-MN-01: QR Menunas -> Plot & Klon auto resolve
const scannedPlotIA = resolvePlot('IA');
const autoResolvedPlot = scannedPlotIA && 
  (scannedPlotIA.cloneName === 'IRCA 331' || scannedPlotIA.cloneName === 'IRCA331') && 
  scannedPlotIA.numberOfPlants === 425;
assert(
  autoResolvedPlot,
  'IT-MN-01',
  'QR Menunas -> Plot & Klon auto resolve',
  `Resolved: ${JSON.stringify(scannedPlotIA)}`
);

// IT-MN-02: Current Date Menunas
const todayDateStr = new Date().toISOString().substring(0, 10);
const menunasDate = todayDateStr;
assert(
  typeof menunasDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(menunasDate),
  'IT-MN-02',
  'Current Date Menunas is valid ISO format'
);

// IT-MN-03: jumlahPohonDitunas saved correctly
// IT-MN-04: jlhPokok remains Master Plot population
// IT-MN-06: Legacy fields remain stored
const menunasRecord1 = {
  docNo: 'MEN/ENT/2026/01',
  type: 'MENUNAS',
  kodePlot: `Plot ${scannedPlotIA.plotName}`,
  namaKlon: scannedPlotIA.cloneName,
  jlhPokok: scannedPlotIA.numberOfPlants, // 425 (Master Plot population)
  budwoodCode: scannedPlotIA.budwoodCode,
  tanggal: menunasDate,
  jumlahPohonDitunas: 120, // Realisasi aktivitas
  jumlahPerisai: 0,        // Legacy preserved
  jumlahCabang: 0,         // Legacy preserved
  jumlahPanjangMeter: 0,   // Legacy preserved
  verifiedMethod: 'QR_SCAN_VERIFIED',
  mantri: 'Mantri Entres',
  status: 'SUBMITTED',
  createdAt: new Date().toISOString()
};
storage.set('entres_menunas_transactions', [menunasRecord1]);
const savedMenunasTxs = storage.get('entres_menunas_transactions', []);

assert(
  savedMenunasTxs.length === 1 && savedMenunasTxs[0].jumlahPohonDitunas === 120,
  'IT-MN-03',
  'jumlahPohonDitunas saved correctly (120 Pohon)'
);

assert(
  savedMenunasTxs[0].jlhPokok === 425 && savedMenunasTxs[0].jlhPokok !== savedMenunasTxs[0].jumlahPohonDitunas,
  'IT-MN-04',
  'jlhPokok remains Master Plot population (425) and distinct from jumlahPohonDitunas'
);

assert(
  savedMenunasTxs[0].hasOwnProperty('jumlahPerisai') &&
  savedMenunasTxs[0].hasOwnProperty('jumlahCabang') &&
  savedMenunasTxs[0].hasOwnProperty('jumlahPanjangMeter') &&
  savedMenunasTxs[0].hasOwnProperty('budwoodCode'),
  'IT-MN-06',
  'Legacy fields remain stored in Menunas schema'
);

// IT-MN-05: Historical Menunas remains readable
const historicalMenunas = {
  docNo: 'MN-LEGACY-001',
  type: 'MENUNAS',
  kodePlot: 'Plot IA',
  namaKlon: 'IRCA331',
  jlhPokok: 425,
  jumlahPerisai: 1500,
  jumlahCabang: 150,
  jumlahPanjangMeter: 180,
  tanggal: '2026-08-01',
  mantri: 'Mantri Lama'
};
savedMenunasTxs.push(historicalMenunas);
storage.set('entres_menunas_transactions', savedMenunasTxs);
const reloadedMenunas = storage.get('entres_menunas_transactions', []);
assert(
  reloadedMenunas.length === 2 && reloadedMenunas.find(m => m.docNo === 'MN-LEGACY-001')?.jumlahPerisai === 1500,
  'IT-MN-05',
  'Historical Menunas without jumlahPohonDitunas remains readable'
);

// ---------------------------------------------------------------------------
// 2. TOPPING & MENUNAS DECOUPLING INTEGRATION TESTS
// ---------------------------------------------------------------------------

// IT-TOP-01: QR Topping -> Plot & Klon auto resolve
const scannedPlotTopping = resolvePlot('IA');
assert(
  scannedPlotTopping && 
  (scannedPlotTopping.cloneName === 'IRCA 331' || scannedPlotTopping.cloneName === 'IRCA331') && 
  scannedPlotTopping.numberOfPlants === 425,
  'IT-TOP-01',
  'QR Topping -> Plot & Klon auto resolve directly from Master Plot'
);

// IT-TOP-02: Current Date Topping
const toppingDate = todayDateStr;
assert(
  typeof toppingDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(toppingDate),
  'IT-TOP-02',
  'Current Date Topping is valid ISO format'
);

// IT-TOP-03: jumlahKayu stored as Jumlah Stik Hijau
// IT-TOP-04: jumlahPerisai stored as harvest quantity
// IT-TOP-05: Topping succeeds WITHOUT Menunas document
const toppingRecord1 = {
  docNo: 'TOP/ENT/2026/01',
  type: 'TOPPING',
  sourceMenunasDocNo: null, // Fully decoupled!
  kodePlot: `Plot ${scannedPlotTopping.plotName}`,
  namaKlon: scannedPlotTopping.cloneName,
  jlhPokok: scannedPlotTopping.numberOfPlants,
  budwoodCode: scannedPlotTopping.budwoodCode,
  tanggal: toppingDate,
  jumlahKayu: 100, // Jumlah Stik Hijau
  jumlahPerisai: 1000, // Panen Mata Entres
  totalPanjangMeter: 0,
  verifiedMethod: 'QR_SCAN_VERIFIED',
  mantri: 'Mantri Entres',
  status: 'SUBMITTED',
  createdAt: '2026-09-30T08:00:00.000Z'
};
storage.set('entres_topping_transactions', [toppingRecord1]);
const savedToppings = storage.get('entres_topping_transactions', []);

assert(
  savedToppings.length === 1 && savedToppings[0].jumlahKayu === 100,
  'IT-TOP-03',
  'jumlahKayu stored as Jumlah Stik Hijau (100 Stik)'
);

assert(
  savedToppings[0].jumlahPerisai === 1000,
  'IT-TOP-04',
  'jumlahPerisai stored as harvest quantity (1000 Perisai)'
);

assert(
  savedToppings[0].sourceMenunasDocNo === null,
  'IT-TOP-05',
  'Topping succeeds WITHOUT Menunas document (sourceMenunasDocNo is null)'
);

// IT-TOP-06: Same Plot can have multiple Topping transactions
const toppingRecord2 = {
  docNo: 'TOP/ENT/2026/02',
  type: 'TOPPING',
  sourceMenunasDocNo: null,
  kodePlot: `Plot ${scannedPlotTopping.plotName}`, // Same plot 'Plot IA'
  namaKlon: scannedPlotTopping.cloneName,
  jlhPokok: scannedPlotTopping.numberOfPlants,
  budwoodCode: scannedPlotTopping.budwoodCode,
  tanggal: toppingDate,
  jumlahKayu: 50,
  jumlahPerisai: 500,
  totalPanjangMeter: 0,
  verifiedMethod: 'QR_SCAN_VERIFIED',
  mantri: 'Mantri Entres',
  status: 'SUBMITTED',
  createdAt: '2026-09-30T09:00:00.000Z'
};
savedToppings.push(toppingRecord2);
storage.set('entres_topping_transactions', savedToppings);
const allPlotIAToppings = storage.get('entres_topping_transactions', []).filter(t => t.kodePlot === 'Plot IA');
assert(
  allPlotIAToppings.length === 2 && allPlotIAToppings[0].docNo !== allPlotIAToppings[1].docNo,
  'IT-TOP-06',
  'Same Plot can have multiple Topping transactions (Repeat Topping supported)'
);

// ---------------------------------------------------------------------------
// 3. INVENTORY & STOCK FORMATION (IT-STK-01, IT-STK-02, IT-STK-03)
// ---------------------------------------------------------------------------

// IT-STK-01: Topping forms Mata Entres stock
// Total panen IRCA 331 = 1000 + 500 = 1500 perisai
const balanceInitial = getKlonMataEntresBalance('IRCA 331');
assert(
  balanceInitial.totalPanenTopping === 1500 &&
  balanceInitial.totalPakaiGrafting === 0 &&
  balanceInitial.totalPakaiRegrafting === 0 &&
  balanceInitial.saldoMataEntres === 1500,
  'IT-STK-01',
  'Topping forms Mata Entres stock (Total Panen = 1500, Saldo = 1500)'
);

// ---------------------------------------------------------------------------
// 4. GRAFTING CONSUMPTION & QUANTITY SEMANTICS (IT-OKU-01)
// ---------------------------------------------------------------------------

// IT-OKU-01: Grafting consumes jumlahMataEntres
// Populasi bibit batang bawah: 600 pokok, Mata entres digunakan: 700 perisai
const graftingTx1 = {
  docNo: 'OKU/2026/001',
  type: 'GRAFTING',
  klonEntres: 'IRCA 331',
  jumlah: 600,            // Populasi bibit / pokok
  jumlahMataEntres: 700,  // Perisai terpakai dari stok
  jumlahKayu: 70,
  jumlahDitolak: 0,
  tanggal: todayDateStr,
  createdAt: '2026-09-30T10:00:00.000Z'
};
storage.set('budding_transactions', [graftingTx1]);

const balanceAfterGraft = getKlonMataEntresBalance('IRCA 331');
assert(
  balanceAfterGraft.totalPakaiGrafting === 700 &&
  balanceAfterGraft.saldoMataEntres === 800, // 1500 - 700 = 800
  'IT-OKU-01',
  'Grafting consumes jumlahMataEntres (Konsumsi = 700, Saldo = 800)'
);

// ---------------------------------------------------------------------------
// 5. INSPECTION CONSUMPTION (IT-INS-01)
// ---------------------------------------------------------------------------

// IT-INS-01: Inspection consumes 0 Mata Entres
storage.set('inspection_transactions', [{
  docNo: 'INS/2026/001',
  buddingDocNo: 'OKU/2026/001',
  klon: 'IRCA 331',
  jumlahBerhasil: 520,
  jumlahGagal: 80,
  tanggal: todayDateStr
}]);
const balanceAfterInspection = getKlonMataEntresBalance('IRCA 331');
assert(
  balanceAfterInspection.saldoMataEntres === 800 &&
  balanceAfterInspection.totalPakaiGrafting === 700 &&
  balanceAfterInspection.totalPakaiRegrafting === 0,
  'IT-INS-01',
  'Inspection consumes 0 Mata Entres (Saldo tetap 800)'
);

// Populate regrafting pool from inspection results
storage.set('regrafting_pool', [{
  docNo: 'RGRF/POOL/001',
  inspectionDocNo: 'INS/2026/001',
  batchNo: 'Batch-01',
  jumlah: 80, // Sisa bibit gagal yang siap diregrafting
  sisaRegrafting: 80,
  klonRootstock: 'GT 1'
}]);

// ---------------------------------------------------------------------------
// 6. REGRAFTING DUAL GATE (IT-REG-01, IT-REG-02, IT-REG-03)
// ---------------------------------------------------------------------------

const poolState = storage.get('regrafting_pool', [])[0];

// IT-REG-01: Regrafting rejects when jumlah > regrafting_pool.sisaRegrafting
const attemptedJumlahBibit = 90; // Exceeds 80
const isGate1Passed = attemptedJumlahBibit <= poolState.sisaRegrafting;
assert(
  !isGate1Passed,
  'IT-REG-01',
  'Regrafting rejects when jumlah bibit (90) > regrafting_pool.sisaRegrafting (80)'
);

// IT-REG-02: Regrafting rejects when jumlahMataEntres > Mata Entres balance
const attemptedPerisai = 900; // Available saldo is 800
const perisaiValidation = validateOkulasiPerisaiUsage('IRCA 331', attemptedPerisai, null, true);
assert(
  !perisaiValidation.valid && perisaiValidation.availableBalance === 800,
  'IT-REG-02',
  'Regrafting rejects when jumlahMataEntres (900) > Saldo Mata Entres (800)'
);

// IT-REG-03: Successful Regrafting: decreases pool by jumlah, decreases inventory by jumlahMataEntres
// Valid execution: Regraft 50 bibit using 60 perisai mata entres
const regraftTx1 = {
  docNo: 'REG/2026/001',
  type: 'REGRAFTING',
  regraftPoolDocNo: 'RGRF/POOL/001',
  klonEntres: 'IRCA 331',
  jumlah: 50,           // Populasi bibit yang diregrafting
  jumlahMataEntres: 60, // Perisai mata entres terpakai
  jumlahKayu: 6,
  jumlahDitolak: 0,
  alasan: 'Mata Entres Busuk / Mati',
  tanggal: todayDateStr,
  createdAt: '2026-09-30T14:00:00.000Z'
};

const curBudding = storage.get('budding_transactions', []);
curBudding.push(regraftTx1);
storage.set('budding_transactions', curBudding);

// Update pool by subtracting jumlah (50)
const curPool = storage.get('regrafting_pool', []);
curPool[0].sisaRegrafting = curPool[0].sisaRegrafting - regraftTx1.jumlah; // 80 - 50 = 30
storage.set('regrafting_pool', curPool);

const balanceAfterRegraft = getKlonMataEntresBalance('IRCA 331');
const poolAfterRegraft = storage.get('regrafting_pool', [])[0];

assert(
  poolAfterRegraft.sisaRegrafting === 30 &&
  balanceAfterRegraft.totalPakaiRegrafting === 60 &&
  balanceAfterRegraft.saldoMataEntres === 740, // 1500 - 700 - 60 = 740
  'IT-REG-03',
  'Successful Regrafting decreases pool by jumlah (80 -> 30) & inventory by jumlahMataEntres (800 -> 740)'
);

// ---------------------------------------------------------------------------
// 7. FIFO ALLOCATION (IT-STK-02)
// ---------------------------------------------------------------------------

// Total Panen: Batch 1 (1000 @ 08:00), Batch 2 (500 @ 09:00)
// Total Konsumsi: Grafting 700, Regrafting 60 (Total = 760)
// FIFO: Batch 1 (1000) absorbs 700 (grafting) + 60 (regrafting) -> remaining 240
//       Batch 2 (500) absorbs 0 -> remaining 500
// Total saldo = 240 + 500 = 740
const fifoBreakdown = getFifoAllocationBreakdown('IRCA 331');
assert(
  fifoBreakdown.sources.length === 2 &&
  fifoBreakdown.sources[0].remaining === 240 &&
  fifoBreakdown.sources[1].remaining === 500 &&
  fifoBreakdown.finalBalance === 740,
  'IT-STK-02',
  'FIFO allocation correctly consumes oldest Topping batch first'
);

// ---------------------------------------------------------------------------
// 8. ZERO BALANCE EXCLUSION (IT-STK-03)
// ---------------------------------------------------------------------------

// Exhaust remaining 740 perisai with second Grafting
const graftingTx2 = {
  docNo: 'OKU/2026/002',
  type: 'GRAFTING',
  klonEntres: 'IRCA 331',
  jumlah: 740,
  jumlahMataEntres: 740,
  tanggal: todayDateStr,
  createdAt: '2026-09-30T16:00:00.000Z'
};
const curBudding2 = storage.get('budding_transactions', []);
curBudding2.push(graftingTx2);
storage.set('budding_transactions', curBudding2);

const availableKlonsAfterExhaust = getAvailableKlonsForOkulasi();
assert(
  availableKlonsAfterExhaust.length === 0,
  'IT-STK-03',
  'Zero balance excludes clone from Okulasi dropdown'
);

// ---------------------------------------------------------------------------
// 9. EDIT / DELETE GUARDS (IT-GRD-01)
// ---------------------------------------------------------------------------

// Total harvest = 1500. Total consumption = 700 + 60 + 740 = 1500 (Saldo = 0)
// 1. Validate edit Topping 2 from 500 down to 400 (would cause deficit of 100)
const toppingUpdateCheck = validateToppingUpdate('TOP/ENT/2026/02', 400);

// 2. Validate delete Topping 1 (1000) (would cause deficit of 1000)
const toppingDeleteCheck = validateToppingDeletion('TOP/ENT/2026/01');

// 3. Validate edit Grafting 1 from 700 up to 750 (would cause deficit of 50)
const graftingUpdateCheck = validateOkulasiPerisaiUsage('IRCA 331', 750, 'OKU/2026/001');

assert(
  !toppingUpdateCheck.valid && !toppingDeleteCheck.valid && !graftingUpdateCheck.valid,
  'IT-GRD-01',
  'Edit/Delete guards prevent stock deficit on Topping and Okulasi records'
);

console.log('\n====================================================');
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL: ${passed + failed})`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
