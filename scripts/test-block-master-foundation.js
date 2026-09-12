/**
 * scripts/test-block-master-foundation.js
 * Verification Suite for Centralized Master Block Foundation.
 * Validates CSV dataset, JavaScript module, clone relations, and spatial invariants.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  BLOCK_MASTER,
  BLOCK_STATUS,
  getAllBlocks,
  getActiveBlocks,
  getBlockById,
  getBlockByCode,
  getBlocksByEstate,
  getBlocksByDivision,
  getBlocksByClone,
  resolveBlock,
  isBlockActive,
  getBlockStatistics
} from '../js/data/block-master.js';

import {
  KLON_MASTER,
  KLON_STATUS,
  getAllKlons,
  getActiveKlons,
  resolveKlon,
  isKlonActive
} from '../js/data/klon-master.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

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
console.log('                 SIGMA RUBBER NURSERY — TEST SUITE: MASTER BLOCK FOUNDATION             ');
console.log('========================================================================================\n');

// --------------------------------------------------------------------------------------
// 1. CSV FILE EXISTENCE & HEADER STRUCTURE
// --------------------------------------------------------------------------------------
console.log('--- 1. CSV File Existence & Header Validation ---');
const csvPath = path.join(ROOT_DIR, 'data', 'block-master.csv');
assert(fs.existsSync(csvPath), '1. File data/block-master.csv tersedia secara fisik');

const csvRaw = fs.readFileSync(csvPath, 'utf8');
const csvLines = csvRaw.trim().split('\n').filter(Boolean);
const expectedHeader = 'EstateCode,EstateName,DivisionCode,DivisionName,BlockCode,BlockName,MaturedArea,ImmatureArea,MaturityAge,FirstHarvestingDate,PlantingYear,PlantAge,CloneName';
const actualHeader = csvLines[0].trim();

assert(actualHeader === expectedHeader, '2. Header CSV sesuai persis dengan 13 kolom yang disyaratkan');
assert(csvLines.length === 41, `3. Total baris CSV tepat 41 (1 header + 40 record data, aktual: ${csvLines.length})`);

// --------------------------------------------------------------------------------------
// 2. CSV PARSING & CELL INTEGRITY
// --------------------------------------------------------------------------------------
console.log('\n--- 2. Record Parsing & Completeness ---');
const parsedRecords = [];
let zeroEmptyFields = true;

for (let i = 1; i < csvLines.length; i++) {
  const line = csvLines[i].trim();
  const cols = line.split(',');
  if (cols.length !== 13) {
    zeroEmptyFields = false;
  }
  for (const c of cols) {
    if (c === null || c === undefined || c.trim() === '') {
      zeroEmptyFields = false;
    }
  }

  parsedRecords.push({
    rowIndex: i,
    estateCode: cols[0],
    estateName: cols[1],
    divisionCode: cols[2],
    divisionName: cols[3],
    blockCode: cols[4],
    blockName: cols[5],
    maturedArea: parseFloat(cols[6]),
    immatureArea: parseFloat(cols[7]),
    maturityAge: parseInt(cols[8], 10),
    firstHarvestingDate: cols[9],
    plantingYear: parseInt(cols[10], 10),
    plantAge: parseInt(cols[11], 10),
    cloneName: cols[12]
  });
}

assert(parsedRecords.length === 40, '4. Total record CSV terurai tepat 40 blok');
assert(zeroEmptyFields, '5. Tidak ada nilai null, undefined, atau string kosong pada seluruh sel CSV');

// --------------------------------------------------------------------------------------
// 3. DIVISION & ESTATE DISTRIBUTION (4 DIVISI × 10 BLOK)
// --------------------------------------------------------------------------------------
console.log('\n--- 3. Division & Estate Distribution Invariants ---');
const validEstates = ['EST-TBS', 'EST-APM'];
const validDivisions = ['DIV-001', 'DIV-002', 'DIV-APM-01', 'DIV-APM-02'];

const divCounts = {};
const estateCounts = {};
const seenBlockCodesPerDiv = new Set();
let duplicatesFound = false;
let allEstatesValid = true;
let allDivisionsValid = true;

for (const r of parsedRecords) {
  if (!validEstates.includes(r.estateCode)) allEstatesValid = false;
  if (!validDivisions.includes(r.divisionCode)) allDivisionsValid = false;

  divCounts[r.divisionCode] = (divCounts[r.divisionCode] || 0) + 1;
  estateCounts[r.estateCode] = (estateCounts[r.estateCode] || 0) + 1;

  const scopedKey = `${r.divisionCode}__${r.blockCode}`;
  if (seenBlockCodesPerDiv.has(scopedKey)) {
    duplicatesFound = true;
  }
  seenBlockCodesPerDiv.add(scopedKey);
}

assert(allEstatesValid, '6. Semua EstateCode valid (hanya EST-TBS dan EST-APM)');
assert(allDivisionsValid, '7. Semua DivisionCode valid (DIV-001, DIV-002, DIV-APM-01, DIV-APM-02)');
assert(Object.keys(divCounts).length === 4, '8. Total divisi tepat 4 divisi');
assert(divCounts['DIV-001'] === 10, '9. DIV-001 (Tanah Besih Divisi I) memiliki tepat 10 blok');
assert(divCounts['DIV-002'] === 10, '10. DIV-002 (Tanah Besih Divisi II) memiliki tepat 10 blok');
assert(divCounts['DIV-APM-01'] === 10, '11. DIV-APM-01 (Aek Pamingke Divisi I) memiliki tepat 10 blok');
assert(divCounts['DIV-APM-02'] === 10, '12. DIV-APM-02 (Aek Pamingke Divisi II) memiliki tepat 10 blok');
assert(estateCounts['EST-TBS'] === 20, '13. Kebun Tanah Besih memiliki total 20 blok');
assert(estateCounts['EST-APM'] === 20, '14. Kebun Aek Pamingke memiliki total 20 blok');
assert(!duplicatesFound, '15. Tidak ada BlockCode duplikat dalam divisi yang sama');

// --------------------------------------------------------------------------------------
// 4. BLOCK CODE FORMAT, PLANTING YEAR & AGE RULES
// --------------------------------------------------------------------------------------
console.log('\n--- 4. Block Code, Planting Year & Age Consistency ---');
let allBlockCodesValidFormat = true;
let allPlantingYearsMatchCode = true;
let allPlantAgesConsistent = true;

for (const r of parsedRecords) {
  // Format check: NNN/YY
  const codeMatch = r.blockCode.match(/^(\d{3})\/(\d{2})$/);
  if (!codeMatch) {
    allBlockCodesValidFormat = false;
  } else {
    const yy = parseInt(codeMatch[2], 10);
    const pYearYY = r.plantingYear % 100;
    if (yy !== pYearYY) {
      allPlantingYearsMatchCode = false;
    }
  }

  // PlantAge = 2026 - PlantingYear
  if (r.plantAge !== (2026 - r.plantingYear)) {
    allPlantAgesConsistent = false;
  }
}

assert(allBlockCodesValidFormat, '16. Seluruh BlockCode memenuhi format standar NNN/YY (3 digit nomor / 2 digit tahun)');
assert(allPlantingYearsMatchCode, '17. PlantingYear konsisten dengan dua digit tahun pada suffix BlockCode');
assert(allPlantAgesConsistent, '18. PlantAge = 2026 - PlantingYear terpenuhi pada seluruh 40 blok');

// --------------------------------------------------------------------------------------
// 5. AREA FORMULA: MaturedArea + ImmatureArea = 40.00 HA
// --------------------------------------------------------------------------------------
console.log('\n--- 5. Area Formula Validation (Matured + Immature = 40 HA) ---');
let allAreasSumTo40 = true;
let allAreasNonNegative = true;

for (const r of parsedRecords) {
  const sum = Math.round((r.maturedArea + r.immatureArea) * 100) / 100;
  if (sum !== 40) {
    allAreasSumTo40 = false;
  }
  if (r.maturedArea < 0 || r.immatureArea < 0) {
    allAreasNonNegative = false;
  }
}

assert(allAreasSumTo40, '19. MaturedArea + ImmatureArea = 40.00 HA terpenuhi pada seluruh 40 record');
assert(allAreasNonNegative, '20. Seluruh nilai luas area bernilai non-negatif');

// --------------------------------------------------------------------------------------
// 6. CLONE VALIDATION AGAINST 57 ACTIVE OFFICIAL CLONES
// --------------------------------------------------------------------------------------
console.log('\n--- 6. Clone Validation Against Active Master Klon ---');
let allClonesAreActive = true;
const legacyClonesBlocked = ['IRR 300', 'PR 261', 'IRR 215', 'IRR 100', 'IRR 219', 'IRR 107', 'IRCA 120'];
let zeroLegacyClonesUsed = true;

for (const r of parsedRecords) {
  const resolved = resolveKlon(r.cloneName);
  if (!resolved || resolved.status !== KLON_STATUS.ACTIVE) {
    allClonesAreActive = false;
  }
  if (legacyClonesBlocked.includes(r.cloneName.toUpperCase())) {
    zeroLegacyClonesUsed = false;
  }
}

assert(allClonesAreActive, '21. Semua CloneName pada 40 blok terdaftar aktif pada Master Klon resmi (57 klon)');
assert(zeroLegacyClonesUsed, '22. Tidak ada satupun dari 7 klon legacy yang digunakan pada Master Block');

// --------------------------------------------------------------------------------------
// 7. JAVASCRIPT MASTER MODULE & QUERY API VALIDATION
// --------------------------------------------------------------------------------------
console.log('\n--- 7. JavaScript Module API & Immutability ---');
assert(Array.isArray(BLOCK_MASTER), '23. BLOCK_MASTER adalah Array');
assert(Object.isFrozen(BLOCK_MASTER), '24. BLOCK_MASTER di-freeze (immutable read-only)');
assert(BLOCK_MASTER.length === 40, '25. BLOCK_MASTER berisi tepat 40 entitas');

// Test getAllBlocks()
const allBlocks = getAllBlocks();
assert(allBlocks.length === 40, '26. getAllBlocks() mengembalikan 40 record');
assert(allBlocks !== BLOCK_MASTER, '27. getAllBlocks() mengembalikan array baru (melindungi internal reference)');

// Test getActiveBlocks()
const activeBlocks = getActiveBlocks();
assert(activeBlocks.length === 40, '28. getActiveBlocks() mengembalikan 40 blok berstatus ACTIVE');

// Test getBlockById()
const blk1 = getBlockById('BLK-001');
assert(blk1 !== null && blk1.blockCode === '001/91', '29. getBlockById("BLK-001") mengembalikan blok 001/91');
assert(getBlockById('NON-EXISTENT') === null, '30. getBlockById mengembalikan null untuk ID tidak dikenal');

// Test getBlockByCode()
const blkByCode = getBlockByCode('001/91');
assert(blkByCode !== null && blkByCode.id === 'BLK-001', '31. getBlockByCode("001/91") mengembalikan record yang benar');
assert(getBlockByCode('999/99') === null, '32. getBlockByCode mengembalikan null untuk kode tidak dikenal');

// Test getBlocksByEstate()
const tbsBlocks = getBlocksByEstate('EST-TBS');
const apmBlocks = getBlocksByEstate('EST-APM');
assert(tbsBlocks.length === 20, '33. getBlocksByEstate("EST-TBS") mengembalikan 20 blok');
assert(apmBlocks.length === 20, '34. getBlocksByEstate("EST-APM") mengembalikan 20 blok');

// Test getBlocksByDivision()
const div1Blocks = getBlocksByDivision('DIV-001');
const div2Blocks = getBlocksByDivision('DIV-002');
const divApm1Blocks = getBlocksByDivision('DIV-APM-01');
const divApm2Blocks = getBlocksByDivision('DIV-APM-02');
assert(div1Blocks.length === 10, '35. getBlocksByDivision("DIV-001") mengembalikan 10 blok');
assert(div2Blocks.length === 10, '36. getBlocksByDivision("DIV-002") mengembalikan 10 blok');
assert(divApm1Blocks.length === 10, '37. getBlocksByDivision("DIV-APM-01") mengembalikan 10 blok');
assert(divApm2Blocks.length === 10, '38. getBlocksByDivision("DIV-APM-02") mengembalikan 10 blok');

// Test getBlocksByClone()
const pb260Blocks = getBlocksByClone('PB 260');
assert(pb260Blocks.length >= 1, '39. getBlocksByClone("PB 260") mengembalikan blok yang menanam PB 260');

// Test resolveBlock()
const resolvedExact = resolveBlock('001/91');
const resolvedByName = resolveBlock('Block 001/91');
const resolvedStripped = resolveBlock('Block 002/87');
const resolvedId = resolveBlock('BLK-003');
assert(resolvedExact !== null && resolvedExact.id === 'BLK-001', '40. resolveBlock("001/91") berhasil');
assert(resolvedByName !== null && resolvedByName.id === 'BLK-001', '41. resolveBlock("Block 001/91") berhasil');
assert(resolvedStripped !== null && resolvedStripped.id === 'BLK-002', '42. resolveBlock("Block 002/87") berhasil');
assert(resolvedId !== null && resolvedId.id === 'BLK-003', '43. resolveBlock("BLK-003") berhasil');

// Test isBlockActive()
assert(isBlockActive('BLK-001') === true, '44. isBlockActive("BLK-001") bernilai true');
assert(isBlockActive('NON-EXISTENT') === false, '45. isBlockActive("NON-EXISTENT") bernilai false');

// Test getBlockStatistics()
const stats = getBlockStatistics();
assert(stats.totalBlocks === 40, '46. getBlockStatistics() totalBlocks = 40');
assert(stats.totalArea === 1600, `47. getBlockStatistics() totalArea = 1600.00 HA (40 blok × 40 HA, aktual: ${stats.totalArea})`);
assert(stats.totalEstates === 2, '48. getBlockStatistics() totalEstates = 2');
assert(stats.totalDivisions === 4, '49. getBlockStatistics() totalDivisions = 4');

// --------------------------------------------------------------------------------------
// SUMMARY
// --------------------------------------------------------------------------------------
console.log('\n----------------------------------------------------------------------------------------');
console.log(`TOTAL ASSERTIONS: ${passed + failed}`);
console.log(`PASSED:           ${passed}`);
console.log(`FAILED:           ${failed}`);
console.log('----------------------------------------------------------------------------------------');

if (failed === 0) {
  console.log('✅ ALL MASTER BLOCK FOUNDATION TESTS PASSED (0 FAILURES)!');
} else {
  console.error('❌ SOME MASTER BLOCK FOUNDATION TESTS FAILED!');
  process.exit(1);
}
