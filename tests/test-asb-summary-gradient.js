/**
 * tests/test-asb-summary-gradient.js
 * Integration Test Suite for Asisten Bibitan Summary Card Progress Bar Gradation
 */

import {
  getProgressColor,
  renderVerifikasiSummaryCardHtml,
  renderPemeriksaanSummaryCardHtml,
  getVerifikasiSummary,
  getPemeriksaanSummary
} from '../js/modules/verification/asb-summary-cards.js';

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
console.log('TEST SUITE: ASB SUMMARY CARD PROGRESS BAR GRADATION');
console.log('========================================================\n');

// IT-SUMMARY-GRADIENT-001: 0% menghasilkan warna merah (hsl(0, 80%, 45%))
console.log('--- Test 1: IT-SUMMARY-GRADIENT-001 (0% -> Merah) ---');
const color0 = getProgressColor(0);
assert(color0 === 'hsl(0, 80%, 45%)', `0% produces red HSL: ${color0}`);

// IT-SUMMARY-GRADIENT-002: 25% menghasilkan warna orange (hsl(30, 80%, 45%))
console.log('\n--- Test 2: IT-SUMMARY-GRADIENT-002 (25% -> Orange) ---');
const color25 = getProgressColor(25);
assert(color25 === 'hsl(30, 80%, 45%)', `25% produces orange HSL: ${color25}`);

// IT-SUMMARY-GRADIENT-003: 50% menghasilkan warna kuning (hsl(60, 80%, 45%))
console.log('\n--- Test 3: IT-SUMMARY-GRADIENT-003 (50% -> Kuning) ---');
const color50 = getProgressColor(50);
assert(color50 === 'hsl(60, 80%, 45%)', `50% produces yellow HSL: ${color50}`);

// IT-SUMMARY-GRADIENT-004: 75% menghasilkan warna hijau (hsl(90, 80%, 45%))
console.log('\n--- Test 4: IT-SUMMARY-GRADIENT-004 (75% -> Hijau) ---');
const color75 = getProgressColor(75);
assert(color75 === 'hsl(90, 80%, 45%)', `75% produces green HSL: ${color75}`);

// IT-SUMMARY-GRADIENT-005: 99% menghasilkan warna hijau mendekati completion (hsl(119, 80%, 45%))
console.log('\n--- Test 5: IT-SUMMARY-GRADIENT-005 (99% -> Hijau mendekati completion) ---');
const color99 = getProgressColor(99);
assert(color99 === 'hsl(119, 80%, 45%)', `99% produces near-completion green HSL: ${color99}`);

// IT-SUMMARY-GRADIENT-006: 100% menghasilkan warna hijau penuh (#116834)
console.log('\n--- Test 6: IT-SUMMARY-GRADIENT-006 (100% -> Hijau Penuh #116834) ---');
const color100 = getProgressColor(100);
assert(color100 === '#116834', `100% produces exact solid green: ${color100}`);

// IT-SUMMARY-GRADIENT-007: Boundary clamping (<0 dan >100)
console.log('\n--- Test 7: IT-SUMMARY-GRADIENT-007 (Boundary Clamping) ---');
const colorNeg = getProgressColor(-15);
const colorOver = getProgressColor(150);
assert(colorNeg === 'hsl(0, 80%, 45%)', `Negative percentage clamped to 0% (${colorNeg})`);
assert(colorOver === '#116834', `>100 percentage clamped to 100% (${colorOver})`);

// Boundary intermediate checks: 1%, 24%, 49%, 74%
const color1 = getProgressColor(1);
const color24 = getProgressColor(24);
const color49 = getProgressColor(49);
const color74 = getProgressColor(74);
assert(color1 === 'hsl(1, 80%, 45%)', `1% produces hsl(1, 80%, 45%)`);
assert(color24 === 'hsl(29, 80%, 45%)', `24% produces hsl(29, 80%, 45%)`);
assert(color49 === 'hsl(59, 80%, 45%)', `49% produces hsl(59, 80%, 45%)`);
assert(color74 === 'hsl(89, 80%, 45%)', `74% produces hsl(89, 80%, 45%)`);

// IT-SUMMARY-GRADIENT-008: Verifikasi dan Pemeriksaan shared behavior
console.log('\n--- Test 8: IT-SUMMARY-GRADIENT-008 (Shared Renderer Integration) ---');
const dummyCtx = { estate: 'ESTATE_A', afdeling: 'AFD_1', role: 'ASISTEN_BIBITAN' };
const verifHtml = renderVerifikasiSummaryCardHtml(dummyCtx);
const inspHtml = renderPemeriksaanSummaryCardHtml(dummyCtx);

assert(typeof verifHtml === 'string' && verifHtml.includes('asb-summary-card'), 'Verifikasi HTML rendered correctly');
assert(typeof inspHtml === 'string' && inspHtml.includes('asb-summary-card'), 'Pemeriksaan HTML rendered correctly');
assert(verifHtml.includes('Pencapaian hari ini'), 'Verifikasi contains footer text');
assert(inspHtml.includes('Pencapaian hari ini'), 'Pemeriksaan contains footer text');

// IT-SUMMARY-GRADIENT-009: Formula percentage existing tetap identik
console.log('\n--- Test 9: IT-SUMMARY-GRADIENT-009 (Formula Percentage) ---');
const verifSummary = getVerifikasiSummary(dummyCtx);
const inspSummary = getPemeriksaanSummary(dummyCtx);
assert('percentage' in verifSummary && typeof verifSummary.percentage === 'number', 'Verifikasi summary has valid percentage');
assert('percentage' in inspSummary && typeof inspSummary.percentage === 'number', 'Pemeriksaan summary has valid percentage');

// IT-SUMMARY-GRADIENT-010: Card Layout and Elements Integrity
console.log('\n--- Test 10: IT-SUMMARY-GRADIENT-010 (Card Layout Integrity) ---');
assert(verifHtml.includes('Verifikasi Diperlukan') && verifHtml.includes('Verifikasi<br>Masuk') && verifHtml.includes('Verifikasi<br>Diproses'), 'Verifikasi structure complete');
assert(inspHtml.includes('Pemeriksaan Diperlukan') && inspHtml.includes('Pemeriksaan<br>Masuk') && inspHtml.includes('Pemeriksaan<br>Diproses'), 'Pemeriksaan structure complete');

console.log('\n========================================================');
console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
console.log('========================================================');

if (failed > 0) {
  process.exit(1);
}
