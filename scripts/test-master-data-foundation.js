/**
 * scripts/test-master-data-foundation.js
 * Verification Suite for Master Data Klon, Budwood, and Plot Foundation
 *
 * Validates:
 * 1. CSV Source of Truth (data/budwood-plot-klon.csv) integrity (97 rows, 57 clones, 1 budwood, 8383 plants)
 * 2. Master Budwood (js/data/budwood-master.js) structure & query APIs
 * 3. Master Plot (js/data/budwood-plot-master.js) structure, 97 records & query APIs
 * 4. Master Klon (js/data/klon-master.js) structure, 57 records & query APIs
 * 5. Cross-entity relational consistency (Plot -> Budwood, Plot -> Clone)
 * 6. Non-destructive resolution & legacy compatibility
 */

import fs from 'fs';
import path from 'path';
import {
  BUDWOOD_MASTER,
  BUDWOOD_STATUS,
  getAllBudwoods,
  getBudwoodByCode,
  getBudwoodById,
  isBudwoodActive
} from '../js/data/budwood-master.js';
import {
  BUDWOOD_PLOT_MASTER,
  PLOT_STATUS,
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
  KLON_MASTER,
  KLON_STATUS,
  KLON_USAGE,
  getAllKlons,
  getActiveKlons,
  getKlonById,
  getKlonByCode,
  getKlonByName,
  resolveKlon,
  normalizeKlonName,
  getKlonAliases,
  isKlonActive,
  isKnownKlon,
  getKlonsByCategory,
  getKlonsForUsage
} from '../js/data/klon-master.js';

console.log('================================================================================');
console.log('    SIGMA RUBBER NURSERY — MASTER DATA FOUNDATION VERIFICATION SUITE           ');
console.log('================================================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

const ROOT_DIR = process.cwd();

// -----------------------------------------------------------------------------
// SUITE A: CSV Source of Truth Verification
// -----------------------------------------------------------------------------
console.log('--- SUITE A: CSV Source of Truth Verification ---');

const csvPath = path.join(ROOT_DIR, 'data', 'budwood-plot-klon.csv');
assert(fs.existsSync(csvPath), 'Source CSV exists at data/budwood-plot-klon.csv');

const csvContent = fs.readFileSync(csvPath, 'utf-8').trim();
const csvLines = csvContent.split(/\r?\n/);
assert(csvLines[0] === 'budwood_code,plot_name,number_of_plants,year_of_planting,clone_name', 'CSV Header matches official format');

const dataRows = csvLines.slice(1).map((line) => line.split(','));
assert(dataRows.length === 97, `CSV contains exactly 97 data rows (actual: ${dataRows.length})`);

const csvClones = new Set(dataRows.map((r) => r[4]));
const csvBudwoods = new Set(dataRows.map((r) => r[0]));
const csvPlots = new Set(dataRows.map((r) => r[1]));
const csvTotalPlants = dataRows.reduce((sum, r) => sum + parseInt(r[2], 10), 0);

assert(csvClones.size === 57, `CSV contains exactly 57 unique clones (actual: ${csvClones.size})`);
assert(csvBudwoods.size === 1 && csvBudwoods.has('2021/BWG/001'), 'CSV contains exactly 1 unique budwood_code (2021/BWG/001)');
assert(csvPlots.size === 97, 'All 97 plot_name values are distinct in CSV');
assert(csvTotalPlants === 8383, `CSV total number_of_plants equals 8,383 (actual: ${csvTotalPlants})`);

// Null / empty validation on CSV
let hasNullOrEmpty = false;
dataRows.forEach((r, idx) => {
  if (!r[0] || !r[1] || !r[2] || !r[3] || !r[4] || isNaN(parseInt(r[2], 10)) || isNaN(parseInt(r[3], 10))) {
    hasNullOrEmpty = true;
  }
});
assert(!hasNullOrEmpty, 'CSV has 0 null, 0 empty, and all numeric fields are valid');

// -----------------------------------------------------------------------------
// SUITE B: Master Budwood Verification (js/data/budwood-master.js)
// -----------------------------------------------------------------------------
console.log('\n--- SUITE B: Master Budwood Verification ---');

assert(Array.isArray(BUDWOOD_MASTER), 'BUDWOOD_MASTER is an array');
assert(Object.isFrozen(BUDWOOD_MASTER), 'BUDWOOD_MASTER is frozen');
assert(BUDWOOD_MASTER.length === 1, 'BUDWOOD_MASTER contains exactly 1 record');
assert(BUDWOOD_MASTER[0].budwoodCode === '2021/BWG/001', 'BUDWOOD_MASTER[0].budwoodCode === 2021/BWG/001');
assert(BUDWOOD_MASTER[0].status === BUDWOOD_STATUS.ACTIVE, 'Budwood status is ACTIVE');

// APIs
const allBw = getAllBudwoods();
assert(allBw.length === 1 && allBw !== BUDWOOD_MASTER, 'getAllBudwoods() returns safe copy');
assert(getBudwoodByCode('2021/BWG/001') !== null, 'getBudwoodByCode("2021/BWG/001") returns valid record');
assert(getBudwoodById('BW-001') !== null, 'getBudwoodById("BW-001") returns valid record');
assert(isBudwoodActive('2021/BWG/001') === true, 'isBudwoodActive returns true');
assert(getBudwoodByCode('UNKNOWN') === null, 'getBudwoodByCode returns null for unknown code');

// -----------------------------------------------------------------------------
// SUITE C: Master Plot Verification (js/data/budwood-plot-master.js)
// -----------------------------------------------------------------------------
console.log('\n--- SUITE C: Master Plot Verification ---');

assert(Array.isArray(BUDWOOD_PLOT_MASTER), 'BUDWOOD_PLOT_MASTER is an array');
assert(Object.isFrozen(BUDWOOD_PLOT_MASTER), 'BUDWOOD_PLOT_MASTER is frozen');
assert(BUDWOOD_PLOT_MASTER.length === 97, `BUDWOOD_PLOT_MASTER contains all 97 records (actual: ${BUDWOOD_PLOT_MASTER.length})`);

// Verify exact 1-to-1 match with CSV
let allPlotsMatchCsv = true;
BUDWOOD_PLOT_MASTER.forEach((p, idx) => {
  const csvRow = dataRows[idx];
  if (
    p.budwoodCode !== csvRow[0] ||
    p.plotName !== csvRow[1] ||
    p.numberOfPlants !== parseInt(csvRow[2], 10) ||
    p.yearOfPlanting !== parseInt(csvRow[3], 10) ||
    p.cloneName !== csvRow[4]
  ) {
    allPlotsMatchCsv = false;
  }
});
assert(allPlotsMatchCsv, 'All 97 master plot records match CSV row-by-row with 100% precision');

// Plot APIs
const stats = getPlotStatistics();
assert(stats.totalPlots === 97, 'Plot statistics totalPlots === 97');
assert(stats.totalPlants === 8383, 'Plot statistics totalPlants === 8383');
assert(stats.minYear === 2011 && stats.maxYear === 2019, `Plot statistics year range: ${stats.minYear} - ${stats.maxYear}`);

assert(getPlotById('PLOT-001') !== null && getPlotById('PLOT-001').plotName === 'IA', 'getPlotById("PLOT-001") returns plot IA');
assert(getPlotByName('IA') !== null && getPlotByName('IA').numberOfPlants === 425, 'getPlotByName("IA") returns 425 plants');
assert(getPlotByName('XXXXXXXVIIIB') !== null && getPlotByName('XXXXXXXVIIIB').cloneName === 'GT1', 'getPlotByName("XXXXXXXVIIIB") returns GT1');
assert(getPlotsByClone('PB260').length === 4, 'getPlotsByClone("PB260") returns 4 plots (VIA, VIIB, XVIIIA, XXXIXB)');
assert(getPlotsByBudwoodCode('2021/BWG/001').length === 97, 'getPlotsByBudwoodCode("2021/BWG/001") returns 97 plots');
assert(getPlotsByYear(2016).length > 0, 'getPlotsByYear(2016) returns valid list');

// Plot Resolver (Smart lookup)
assert(resolvePlot('IA') !== null && resolvePlot('IA').id === 'PLOT-001', 'resolvePlot("IA") resolves to PLOT-001');
assert(resolvePlot('PLOT-001') !== null && resolvePlot('PLOT-001').plotName === 'IA', 'resolvePlot("PLOT-001") resolves to IA');
assert(resolvePlot('PLOT-ENT-01') !== null && resolvePlot('PLOT-ENT-01').plotName === 'IA', 'resolvePlot handles legacy "PLOT-ENT-01" fallback');
assert(resolvePlot('UNKNOWN_PLOT') === null, 'resolvePlot returns null for unknown plot');

// -----------------------------------------------------------------------------
// SUITE D: Master Klon Verification (js/data/klon-master.js)
// -----------------------------------------------------------------------------
console.log('\n--- SUITE D: Master Klon Verification ---');

assert(Array.isArray(KLON_MASTER), 'KLON_MASTER is an array');
assert(Object.isFrozen(KLON_MASTER), 'KLON_MASTER is frozen');
assert(KLON_MASTER.length === 57, `KLON_MASTER contains exactly 57 unique clones from CSV (actual: ${KLON_MASTER.length})`);

// Ensure every clone from CSV exists in KLON_MASTER
let allCsvClonesInMaster = true;
csvClones.forEach((cName) => {
  const found = KLON_MASTER.find((k) => k.code === cName || k.normalizedKey === cName.toUpperCase().replace(/[\s\-_]/g, ''));
  if (!found) {
    allCsvClonesInMaster = false;
  }
});
assert(allCsvClonesInMaster, 'All 57 clone_name entries from CSV exist in KLON_MASTER');

// Klon APIs
const allKlons = getAllKlons();
assert(allKlons.length === 57, 'getAllKlons() returns 57 clones');
assert(getActiveKlons().length === 57, 'getActiveKlons() returns 57 active clones');

assert(getKlonByCode('PB260') !== null && getKlonByCode('PB260').canonicalName === 'PB 260', 'getKlonByCode("PB260") returns PB 260');
assert(getKlonByCode('GT1') !== null && getKlonByCode('GT1').canonicalName === 'GT 1', 'getKlonByCode("GT1") returns GT 1');
assert(getKlonByCode('GYT577') !== null && getKlonByCode('GYT577').canonicalName === 'GYT 577', 'getKlonByCode("GYT577") returns GYT 577');
assert(getKlonById('KLON-PB-260') !== null, 'getKlonById("KLON-PB-260") returns valid record');
assert(getKlonByName('PB 260') !== null, 'getKlonByName("PB 260") returns valid record');
assert(isKlonActive('KLON-PB-260') === true, 'isKlonActive returns true');

// Normalization & Resolution
assert(normalizeKlonName('PB260') === 'PB 260', 'normalizeKlonName("PB260") returns "PB 260"');
assert(normalizeKlonName('GT-01') === 'GT 1', 'normalizeKlonName("GT-01") returns "GT 1"');
assert(normalizeKlonName('IRCA19') === 'IRCA 19', 'normalizeKlonName("IRCA19") returns "IRCA 19"');
assert(normalizeKlonName('Unknown-Raw') === 'Unknown-Raw', 'normalizeKlonName is non-destructive for unknown clone');

// -----------------------------------------------------------------------------
// SUITE E: Relational Consistency Verification
// -----------------------------------------------------------------------------
console.log('\n--- SUITE E: Relational Consistency Verification ---');

let allPlotBudwoodsValid = true;
let allPlotClonesValid = true;

BUDWOOD_PLOT_MASTER.forEach((p) => {
  const bw = getBudwoodByCode(p.budwoodCode);
  if (!bw) allPlotBudwoodsValid = false;

  const klon = resolveKlon(p.cloneName);
  if (!klon) allPlotClonesValid = false;
});

assert(allPlotBudwoodsValid, 'All 97 plot records reference a valid Budwood in BUDWOOD_MASTER');
assert(allPlotClonesValid, 'All 97 plot records reference a valid Clone in KLON_MASTER');

// -----------------------------------------------------------------------------
// SUITE F: Service Worker Registration & Cache
// -----------------------------------------------------------------------------
console.log('\n--- SUITE F: Service Worker Registration & Cache ---');

const swContent = fs.readFileSync(path.join(ROOT_DIR, 'sw.js'), 'utf-8');
assert(swContent.includes('sigma-nursery-v160'), 'sw.js cache version bumped to sigma-nursery-v160');
assert(swContent.includes('./js/data/budwood-master.js'), 'sw.js includes ./js/data/budwood-master.js in CORE_ASSETS');
assert(swContent.includes('./js/data/budwood-plot-master.js'), 'sw.js includes ./js/data/budwood-plot-master.js in CORE_ASSETS');
assert(swContent.includes('./js/data/klon-master.js'), 'sw.js includes ./js/data/klon-master.js in CORE_ASSETS');

console.log('\n================================================================================');
console.log(`TEST SUMMARY: ${passedTests} passed, ${failedTests} failed`);
console.log('================================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
