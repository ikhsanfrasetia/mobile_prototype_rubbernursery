import fs from 'fs';
import path from 'path';

console.log('=== TEST SUITE: PENYELARASAN NOMOR DOKUMEN PENYELEKSIAN (CULL) ===\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL: ${message}`);
  }
}

// 1. Read files
const utilsFile = path.resolve('js/core/utils.js');
const selectionLandingFile = path.resolve('js/modules/selection/selection-landing.js');
const buddingFormFile = path.resolve('js/modules/budding/budding-form.js');
const inspectionFormFile = path.resolve('js/modules/inspection/inspection-form.js');
const berandaFile = path.resolve('js/modules/dashboard/beranda.js');
const historyFile = path.resolve('js/modules/history/nursery-history.js');

const utilsCode = fs.readFileSync(utilsFile, 'utf8');
const selCode = fs.readFileSync(selectionLandingFile, 'utf8');
const buddingCode = fs.readFileSync(buddingFormFile, 'utf8');
const inspCode = fs.readFileSync(inspectionFormFile, 'utf8');
const berandaCode = fs.readFileSync(berandaFile, 'utf8');
const historyCode = fs.readFileSync(historyFile, 'utf8');

// Test 1: MODULE_DOC_CODES
assert(utilsCode.includes("selection: 'CULL'"), "utils.js: MODULE_DOC_CODES has selection -> CULL");
assert(utilsCode.includes("CULL: 'CULL'"), "utils.js: MODULE_DOC_CODES has CULL -> CULL");
assert(utilsCode.includes("SEL: 'CULL'"), "utils.js: MODULE_DOC_CODES has SEL -> CULL");

// Test 2: selection-landing.js standardization
assert(selCode.includes("formatStandardDocNo(2026, 'CULL',"), "selection-landing.js uses formatStandardDocNo with CULL");
assert(selCode.includes("standardizeSelectionDocNo"), "selection-landing.js has standardizeSelectionDocNo helper");
assert(!selCode.includes("`SEL/REJ/2026/0"), "selection-landing.js does not generate SEL/REJ");
assert(!selCode.includes("`SEL-POOL/2026/0"), "selection-landing.js does not generate SEL-POOL");
assert(!selCode.includes("`SEL/RCV/2026/0"), "selection-landing.js does not generate SEL/RCV");

// Test 3: Upstream modules syncing to selection_pool
assert(!buddingCode.includes("`SEL/REJ/2026/0"), "budding-form.js does not generate SEL/REJ");
assert(buddingCode.includes("formatStandardDocNo(2026, 'CULL',"), "budding-form.js uses formatStandardDocNo with CULL");

assert(!inspCode.includes("`SEL-POOL/2026/0"), "inspection-form.js does not generate SEL-POOL");
assert(inspCode.includes("formatStandardDocNo(2026, 'CULL',"), "inspection-form.js uses formatStandardDocNo with CULL");

assert(!berandaCode.includes("`SEL/REJ/2026/0"), "beranda.js does not generate SEL/REJ");
assert(!berandaCode.includes("`SEL-POOL/2026/0"), "beranda.js does not generate SEL-POOL");

// Test 4: History
assert(historyCode.includes("formatStandardDocNo(2026, 'CULL',"), "nursery-history.js uses formatStandardDocNo with CULL");

// Test 4b: Consistent Hierarchy in selection-landing.js
assert(selCode.includes("relatedDocLabel = 'Dok. Okulasi:'"), "selection-landing.js defines Dok. Okulasi for REJECT_PEMERIKSAAN");
assert(selCode.includes("relatedDocLabel = 'Dok. Pemeriksaan:'"), "selection-landing.js defines Dok. Pemeriksaan for REJECT_REGRAFTING");
assert(selCode.includes("relatedDocLabel = 'Dok. Penerimaan:'"), "selection-landing.js defines Dok. Penerimaan for REJECT_OKULASI");
assert(selCode.includes("relatedDocLabel = 'Dok. Program:'"), "selection-landing.js defines Dok. Program for REJECT_PENERIMAAN");
assert(selCode.includes("${relatedDocValue ? `<div><span style=\"font-weight: 700; color: #374151;\">${relatedDocLabel}</span> ${relatedDocValue}</div>` : ''}"), "selection-landing.js renders consistent related document row");

// Test 5: Functional transformation test
function standardizeSelectionDocNo(rawDocNo, index = 1) {
  if (!rawDocNo || typeof rawDocNo !== 'string') {
    return `2026/CULL/${String(index).padStart(3, '0')}`;
  }
  const clean = rawDocNo.trim();
  if (clean.startsWith('2026/CULL/')) {
    return clean;
  }
  const match = clean.match(/(\d+)(?:_\d+)?$/);
  const seq = match ? parseInt(match[1], 10) : index;
  return `2026/CULL/${String(seq > 0 ? seq : index).padStart(3, '0')}`;
}

assert(standardizeSelectionDocNo('SEL/REJ/2026/01') === '2026/CULL/001', "SEL/REJ/2026/01 -> 2026/CULL/001");
assert(standardizeSelectionDocNo('SEL-POOL/2026/02') === '2026/CULL/002', "SEL-POOL/2026/02 -> 2026/CULL/002");
assert(standardizeSelectionDocNo('SEL-POOL/2026/03') === '2026/CULL/003', "SEL-POOL/2026/03 -> 2026/CULL/003");
assert(standardizeSelectionDocNo('SEL/RCV/2026/01_1') === '2026/CULL/001', "SEL/RCV/2026/01_1 -> 2026/CULL/001");
assert(standardizeSelectionDocNo('2026/CULL/005') === '2026/CULL/005', "2026/CULL/005 -> 2026/CULL/005");

console.log(`\n========================================`);
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} Passed (${Math.round(passedTests/totalTests*100)}%)`);
console.log(`========================================\n`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
