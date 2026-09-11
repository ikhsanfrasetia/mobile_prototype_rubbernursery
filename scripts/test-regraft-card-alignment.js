import fs from 'fs';
import path from 'path';

console.log('=== TEST SUITE: AUDIT & VERIFIKASI PENYELARASAN CARD OKULASI JANDA ===\n');

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
const regraftFile = path.resolve('js/modules/budding/budding-regrafting.js');
const utilsFile = path.resolve('js/core/utils.js');
const graftFile = path.resolve('js/modules/budding/budding-grafting.js');

const regraftCode = fs.readFileSync(regraftFile, 'utf8');
const utilsCode = fs.readFileSync(utilsFile, 'utf8');
const graftCode = fs.readFileSync(graftFile, 'utf8');

// Test 1: MODULE_DOC_CODES contains RGRF
assert(utilsCode.includes("regrafting: 'RGRF'") || utilsCode.includes('regrafting: "RGRF"'), "utils.js: MODULE_DOC_CODES has regrafting -> RGRF");
assert(utilsCode.includes("RGRF: 'RGRF'"), "utils.js: MODULE_DOC_CODES has RGRF -> RGRF");

// Test 2: Numbering format in budding-regrafting.js
assert(regraftCode.includes("formatStandardDocNo(2026, 'RGRF', rIdx + 1)"), "budding-regrafting.js: uses formatStandardDocNo(2026, 'RGRF', ...)");
assert(regraftCode.includes(".replace('/OKL/', '/RGRF/').replace('/REG/', '/RGRF/').replace('/OKJ/', '/RGRF/')"), "budding-regrafting.js: sanitizes old doc codes to RGRF");

// Test 3: Collapsed Card Structure
assert(regraftCode.includes('card-regraft-summary-wrapper'), "Card wrapper class present");
assert(regraftCode.includes('Okulasi Janda'), "Badge 'Okulasi Janda' present");
assert(regraftCode.includes('Dok. Alokasi:'), "Dok. Alokasi present in header");
assert(regraftCode.includes('btn-toggle-expand-regraft-summary'), "Lihat Detail button present");
assert(regraftCode.includes('text-expand-regraft-summary'), "Lihat Detail text container present");

// Test 4: Expanded Card & KPI 2x2 Grid
assert(regraftCode.includes('Total Diokulasi Janda'), "KPI 2x2: Total Diokulasi Janda present");
assert(regraftCode.includes('Kayu Okulasi'), "KPI 2x2: Kayu Okulasi present");
assert(regraftCode.includes('Rata-rata Mata Entres / Batang'), "KPI 2x2: Rata-rata Mata Entres present");
assert(regraftCode.includes('Jumlah Mata Entres'), "KPI 2x2: Jumlah Mata Entres present");

// Test 5: Kayu Okulasi only appears once inside card template
const summaryCardMatch = regraftCode.match(/card-regraft-summary-wrapper[\s\S]*?<\/div>\s*`;\s*}\)\.join/);
if (summaryCardMatch) {
  const cardHtml = summaryCardMatch[0];
  const kayuCount = (cardHtml.match(/Kayu Okulasi/g) || []).length;
  assert(kayuCount === 1, `Kayu Okulasi only appears 1 time inside card (actual: ${kayuCount})`);
} else {
  assert(false, "Could not extract card-regraft-summary-wrapper block");
}

// Test 6: Fallback business values
assert(!regraftCode.includes("'Okulasi Ulang'"), "No dummy fallback 'Okulasi Ulang' in code");
assert(regraftCode.includes("const batchNo = rtx.batchNo || '-'"), "Clean fallback '-' for batchNo");
assert(regraftCode.includes("const klonEntres = rtx.klonEntres || rtx.klon || '-'"), "Clean fallback '-' for klonEntres");
assert(regraftCode.includes("const bedengan = rtx.bedengan || '-'"), "Clean fallback '-' for bedengan");
assert(regraftCode.includes("const tanggal = rtx.tanggal || '-'"), "Clean fallback '-' for tanggal");
assert(regraftCode.includes("const klonRootstock = rtx.klonRootstock || '-'"), "Clean fallback '-' for klonRootstock");

// Test 7: Supporting information and workers
assert(regraftCode.includes('Batang Bawah:'), "Batang Bawah in expanded section");
assert(regraftCode.includes('Dokumen Pemeriksaan:'), "Dokumen Pemeriksaan in expanded section");
assert(regraftCode.includes('Penyebab:'), "Penyebab in expanded section");
assert(regraftCode.includes('Bibit Ditolak:'), "Bibit Ditolak in expanded section (conditional)");
assert(regraftCode.includes('Pekerja Okulasi Janda:'), "Pekerja Okulasi Janda list present");

// Test 8: 3-dots Menu items (ONLY Edit and Hapus, NO Rincian)
assert(!regraftCode.includes('menu-action-rincian'), "Menu 3-dots does NOT contain 'Rincian'");
assert(regraftCode.includes('menu-action-edit-regraft'), "Menu 3-dots contains Edit action");
assert(regraftCode.includes('menu-action-delete-regraft'), "Menu 3-dots contains Delete action");

// Test 9: Single-expand behavior
assert(regraftCode.includes('btn-toggle-expand-regraft-summary'), "Toggle button listener configured");
assert(regraftCode.includes("textSpan.textContent = willOpen ? 'Sembunyikan Detail' : 'Lihat Detail'"), "Toggle text updates on expand/collapse");
assert(regraftCode.includes("otherContent.style.display = 'none'"), "Single expand closes other cards");

console.log(`\n========================================`);
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} Passed (${Math.round(passedTests/totalTests*100)}%)`);
console.log(`========================================\n`);

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
