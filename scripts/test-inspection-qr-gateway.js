/**
 * Automated Verification Script for Inspection QR Gateway flow
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('=== TEST SUITE: INSPECTION QR BATCH GATEWAY ===');

// Test 1: Verify inspection-scan.js exists and exports renderInspectionScan
const scanFile = readFileSync(resolve('js/modules/inspection/inspection-scan.js'), 'utf-8');
if (!scanFile.includes('export function renderInspectionScan()')) {
  throw new Error('renderInspectionScan export missing!');
}
console.log('✅ TEST 1: inspection-scan.js created with renderInspectionScan export');

// Test 2: Verify app.js registers /inspection/scan
const appFile = readFileSync(resolve('js/app.js'), 'utf-8');
if (!appFile.includes("registerRoute('/inspection/scan', renderInspectionScan)")) {
  throw new Error('/inspection/scan route registration missing in app.js!');
}
console.log('✅ TEST 2: /inspection/scan registered in app.js');

// Test 3: Verify inspection-landing.js navigates to /inspection/scan
const landingFile = readFileSync(resolve('js/modules/inspection/inspection-landing.js'), 'utf-8');
if (!landingFile.includes("navigate('/inspection/scan')")) {
  throw new Error('inspection-landing.js does not navigate to /inspection/scan!');
}
if (!landingFile.includes("storage.remove('inspection_qr_verified')")) {
  throw new Error('inspection-landing.js does not reset inspection_qr_verified!');
}
console.log('✅ TEST 3: inspection-landing.js routes to /inspection/scan and resets state');

// Test 4: Verify inspection-scan.js contains fallback logic, manual picker, and validation
if (!scanFile.includes('btn-retry-scan') || !scanFile.includes('btn-open-manual-picker')) {
  throw new Error('Retry scan or manual picker buttons missing in inspection-scan.js!');
}
if (scanFile.includes('Lanjutkan Tanpa Scan QR')) {
  throw new Error('FORBIDDEN "Lanjutkan Tanpa Scan QR" found in inspection-scan.js!');
}
if (!scanFile.includes('targetBatchNo.trim().toUpperCase()')) {
  throw new Error('Validation against targetBatchNo missing in inspection-scan.js!');
}
console.log('✅ TEST 4: inspection-scan.js enforces target batch validation with NO bypass option');

// Test 5: Verify inspection-form.js cleans up state upon save and back
const formFile = readFileSync(resolve('js/modules/inspection/inspection-form.js'), 'utf-8');
if (!formFile.includes("storage.remove('inspection_qr_verified')")) {
  throw new Error('inspection-form.js does not clean up inspection_qr_verified!');
}
console.log('✅ TEST 5: inspection-form.js cleans up verification session upon save and back');

console.log('=== ALL TESTS PASSED SUCCESSFULLY ===');
