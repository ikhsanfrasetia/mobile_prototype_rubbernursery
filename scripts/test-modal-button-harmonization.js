import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== STARTING MODAL BUTTON HARMONIZATION TEST SUITE ===\n');

const kspPath = path.resolve('js/modules/request/request-kebun-sepupu-landing.js');
const mePath = path.resolve('js/modules/request/request-mata-entres-landing.js');

const kspCode = fs.readFileSync(kspPath, 'utf8');
const meCode = fs.readFileSync(mePath, 'utf8');

// --- 1. REVIEW MODAL KEBUN SEPUPU ---
console.log('--- Checking Review Modal Kebun Sepupu ---');

// Test 1: Footer 1 baris dengan flex-end
assert.ok(kspCode.includes('justify-content: flex-end'), 'TEST 01 FAILED: Review Modal KSP must use justify-content: flex-end');
console.log('✓ TEST 01: Review Modal KSP footer uses single row flex-end');

// Test 2: Contains #btn-review-reject and #btn-review-approve-forward
assert.ok(kspCode.includes('id="btn-review-reject"'), 'TEST 02 FAILED: Review Modal KSP must contain #btn-review-reject');
assert.ok(kspCode.includes('id="btn-review-approve-forward"'), 'TEST 02 FAILED: Review Modal KSP must contain #btn-review-approve-forward');
console.log('✓ TEST 02: Review Modal KSP contains #btn-review-reject and #btn-review-approve-forward');

// Test 3: Does NOT contain #btn-review-cancel
assert.ok(!kspCode.includes('id="btn-review-cancel"'), 'TEST 03 FAILED: Review Modal KSP must not contain #btn-review-cancel');
console.log('✓ TEST 03: Review Modal KSP does not contain redundant #btn-review-cancel');

// --- 2. DETAIL MODAL KEBUN SEPUPU ---
console.log('\n--- Checking Detail Modal Kebun Sepupu ---');

// Test 4: Detail footer contains #btn-close-detail
assert.ok(kspCode.includes('id="btn-close-detail"'), 'TEST 04 FAILED: Detail Modal KSP must contain #btn-close-detail');
console.log('✓ TEST 04: Detail Modal KSP contains #btn-close-detail [Tutup]');

// Test 5: Detail footer does NOT contain workflow action buttons
assert.ok(!kspCode.includes('id="btn-modal-process"'), 'TEST 05 FAILED: Detail Modal KSP must not contain #btn-modal-process');
assert.ok(!kspCode.includes('id="btn-modal-reject"'), 'TEST 05 FAILED: Detail Modal KSP must not contain #btn-modal-reject');
assert.ok(!kspCode.includes('id="btn-modal-askep-process"'), 'TEST 05 FAILED: Detail Modal KSP must not contain #btn-modal-askep-process');
assert.ok(!kspCode.includes('id="btn-modal-verify"'), 'TEST 05 FAILED: Detail Modal KSP must not contain #btn-modal-verify');
console.log('✓ TEST 05: Detail Modal KSP does not expose workflow action buttons in Detail');

// --- 3. MATA ENTRES UNTOUCHED AS MASTER ---
console.log('\n--- Checking Mata Entres Master Pattern ---');

// Test 6: Mata Entres Review has #btn-reject-request and #btn-approve-request
assert.ok(meCode.includes('id="btn-reject-request"'), 'TEST 06 FAILED: Mata Entres Review must retain #btn-reject-request');
assert.ok(meCode.includes('id="btn-approve-request"'), 'TEST 06 FAILED: Mata Entres Review must retain #btn-approve-request');
console.log('✓ TEST 06: Mata Entres Review modal retains master button IDs');

// Test 7: Mata Entres Detail has #btn-close-detail
assert.ok(meCode.includes('id="btn-close-detail"'), 'TEST 07 FAILED: Mata Entres Detail must retain #btn-close-detail');
console.log('✓ TEST 07: Mata Entres Detail modal retains [Tutup]');

// --- 4. BUSINESS INTEGRITY ---
console.log('\n--- Checking Business Logic Integrity ---');

// Test 8: openReviewModal function exported and intact
assert.ok(kspCode.includes('export function openReviewModal('), 'TEST 08 FAILED: openReviewModal must remain exported');
console.log('✓ TEST 08: openReviewModal function is preserved');

// Test 9: handleRejectRequestModal function exported and intact
assert.ok(kspCode.includes('export function handleRejectRequestModal('), 'TEST 09 FAILED: handleRejectRequestModal must remain exported');
console.log('✓ TEST 09: handleRejectRequestModal function is preserved');

// Test 10: updateRequestTransaction / storage mutation intact
assert.ok(kspCode.includes('updateRequestTransaction('), 'TEST 10 FAILED: updateRequestTransaction must remain intact');
console.log('✓ TEST 10: updateRequestTransaction storage logic is preserved');

console.log('\n======================================================');
console.log('ALL MODAL BUTTON HARMONIZATION TESTS PASSED! (10/10)');
console.log('======================================================\n');
