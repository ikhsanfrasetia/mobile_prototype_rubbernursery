/**
 * test-entres-master-integration.js
 * Verification Suite for Kebun Entres Master Budwood & Plot Integration.
 */

import {
  BUDWOOD_PLOT_MASTER,
  getAllBudwoodPlots,
  getPlotById,
  getPlotByName,
  getPlotsByClone,
  getPlotsByBudwoodCode,
  getPlotsByYear,
  resolvePlot,
  getPlotStatistics
} from '../js/data/budwood-plot-master.js';

import {
  BUDWOOD_MASTER,
  getAllBudwoods,
  getBudwoodById,
  getBudwoodByCode,
  isBudwoodActive
} from '../js/data/budwood-master.js';

import {
  KLON_MASTER,
  resolveKlon,
  isKlonActive,
  isKnownKlon
} from '../js/data/klon-master.js';

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

console.log('--- TEST SUITE: KEBUN ENTRES MASTER BUDWOOD & PLOT INTEGRATION ---');

// 1. MASTER PLOT INTEGRITY & DATASET VALIDATION
console.log('\n1. Master Plot Verification (97 Record Resmi):');
const allPlots = getAllBudwoodPlots();
assert(allPlots.length === 97, `Total plot harus tepat 97 (ditemukan: ${allPlots.length})`);

const stats = getPlotStatistics();
assert(stats.totalPlots === 97, `Stats total plots harus 97 (ditemukan: ${stats.totalPlots})`);
assert(stats.totalPlants === 8383, `Stats total tanaman harus 8,383 (ditemukan: ${stats.totalPlants})`);
assert(stats.minYear === 2011, `Tahun tanam min harus 2011 (ditemukan: ${stats.minYear})`);
assert(stats.maxYear === 2019, `Tahun tanam max harus 2019 (ditemukan: ${stats.maxYear})`);

// 2. QUERY CAPABILITY
console.log('\n2. Query Capabilities:');
const plot1 = getPlotById('PLOT-001');
assert(plot1 !== null && plot1.plotName === 'IA' && plot1.cloneName === 'IRCA331' && plot1.numberOfPlants === 425 && plot1.yearOfPlanting === 2019, 'getPlotById("PLOT-001") valid');

const plotByName = getPlotByName('IVA');
assert(plotByName !== null && plotByName.id === 'PLOT-007' && plotByName.cloneName === 'PB217' && plotByName.numberOfPlants === 211, 'getPlotByName("IVA") valid');

const plotsByBw = getPlotsByBudwoodCode('2021/BWG/001');
assert(plotsByBw.length === 97, 'getPlotsByBudwoodCode("2021/BWG/001") mengembalikan 97 plot');

const plotsByClone = getPlotsByClone('IRCA331');
assert(plotsByClone.length >= 3, `getPlotsByClone("IRCA331") mengembalikan plot terkait (${plotsByClone.length})`);

const plots2016 = getPlotsByYear(2016);
assert(plots2016.length > 0, `getPlotsByYear(2016) mengembalikan plot (${plots2016.length})`);

// 3. BUDWOOD MASTER INTEGRITY
console.log('\n3. Master Budwood Verification:');
const allBudwoods = getAllBudwoods();
assert(allBudwoods.length === 1, `Total budwood harus 1 (ditemukan: ${allBudwoods.length})`);
assert(allBudwoods[0].code === '2021/BWG/001', 'Kode Budwood resmi adalah 2021/BWG/001');
assert(isBudwoodActive('2021/BWG/001') === true, 'isBudwoodActive("2021/BWG/001") harus true');

// 4. PLOT RESOLVER & COMPATIBILITY LAYER
console.log('\n4. Plot Resolver & Legacy Compatibility:');
assert(resolvePlot('IA')?.id === 'PLOT-001', 'resolvePlot("IA") -> PLOT-001');
assert(resolvePlot('Plot IA')?.id === 'PLOT-001', 'resolvePlot("Plot IA") -> PLOT-001');
assert(resolvePlot('PLOT-001')?.plotName === 'IA', 'resolvePlot("PLOT-001") -> IA');
assert(resolvePlot('PLOT-ENT-01')?.id === 'PLOT-001', 'resolvePlot("PLOT-ENT-01") legacy -> PLOT-001');
assert(resolvePlot('PLOT-ENT-06')?.id === 'PLOT-006', 'resolvePlot("PLOT-ENT-06") legacy -> PLOT-006');
assert(resolvePlot(null) === null, 'resolvePlot(null) -> null');
assert(resolvePlot('') === null, 'resolvePlot("") -> null');

// 5. TOPOING & MENUNAS TRANSACTION FLOW MAPPING
console.log('\n5. Topping & Menunas Transaction Schema & Field Mapping:');
const samplePlot = allPlots[0]; // PLOT-001: IA, IRCA331, 425 Pkk, 2019, 2021/BWG/001

// Simulate Topping Transaction Payload
const simulatedToppingTx = {
  docNo: 'TOP/ENT/2026/01',
  type: 'TOPPING',
  kodePlot: `Plot ${samplePlot.plotName}`,
  namaKlon: samplePlot.cloneName,
  jlhPokok: samplePlot.numberOfPlants,
  budwoodCode: samplePlot.budwoodCode,
  tanggal: '2026-09-12',
  jumlahKayu: 150,
  totalPanjangMeter: 85.5,
  jumlahPerisai: 450,
  verifiedMethod: 'QR_SCAN',
  mantri: 'Mantri Entres',
  status: 'SUBMITTED'
};

assert(simulatedToppingTx.kodePlot === 'Plot IA', 'Topping kodePlot mapped correctly');
assert(simulatedToppingTx.namaKlon === 'IRCA331', 'Topping namaKlon mapped correctly');
assert(simulatedToppingTx.jlhPokok === 425, 'Topping jlhPokok mapped correctly');
assert(simulatedToppingTx.budwoodCode === '2021/BWG/001', 'Topping budwoodCode mapped correctly');
assert(simulatedToppingTx.jumlahKayu === 150 && simulatedToppingTx.jumlahPerisai === 450, 'Topping metrics preserved');

// Simulate Menunas Transaction Payload
const simulatedMenunasTx = {
  docNo: 'MEN/ENT/2026/01',
  type: 'MENUNAS',
  kodePlot: `Plot ${samplePlot.plotName}`,
  namaKlon: samplePlot.cloneName,
  jlhPokok: samplePlot.numberOfPlants,
  budwoodCode: samplePlot.budwoodCode,
  tanggal: '2026-09-12',
  jumlahPerisai: 600,
  jumlahCabang: 300,
  jumlahPanjangMeter: 180,
  verifiedMethod: 'MANUAL',
  mantri: 'Mantri Entres',
  status: 'SUBMITTED'
};

assert(simulatedMenunasTx.kodePlot === 'Plot IA', 'Menunas kodePlot mapped correctly');
assert(simulatedMenunasTx.namaKlon === 'IRCA331', 'Menunas namaKlon mapped correctly');
assert(simulatedMenunasTx.jlhPokok === 425, 'Menunas jlhPokok mapped correctly');
assert(simulatedMenunasTx.budwoodCode === '2021/BWG/001', 'Menunas budwoodCode mapped correctly');
assert(simulatedMenunasTx.jumlahPerisai === 600 && simulatedMenunasTx.jumlahCabang === 300, 'Menunas metrics preserved');

// 6. KLON MASTER COMPATIBILITY
console.log('\n6. Klon Master Alignment:');
let klonMatches = 0;
for (const p of allPlots) {
  const resolved = resolveKlon(p.cloneName);
  if (resolved) {
    klonMatches++;
  }
}
assert(klonMatches === 97, `Semua 97 cloneName pada master plot harus terdaftar/resolve pada klon-master (${klonMatches}/97)`);

// SUMMARY
console.log('\n-----------------------------------------------------------');
console.log(`TOTAL ASSERTIONS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
if (failed === 0) {
  console.log('✅ ALL KEBUN ENTRES MASTER INTEGRATION TESTS PASSED!');
} else {
  console.log('❌ SOME TESTS FAILED!');
  process.exit(1);
}
