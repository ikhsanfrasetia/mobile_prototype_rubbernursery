/**
 * test-rename-display-label-dederan-to-germinasi.js
 * Automated Test Suite for RENAME-DISPLAY-LABEL-DEDERAN-BENIH-TO-GERMINASI
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup Mock Environment for Node.js
const storageMap = new Map();
globalThis.localStorage = {
  getItem: (k) => storageMap.has(k) ? storageMap.get(k) : null,
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear()
};

// Setup lightweight DOM Mock
const mockDocument = {
  elements: {},
  getElementById(id) {
    if (!this.elements[id]) {
      this.elements[id] = {
        id,
        innerHTML: '',
        querySelector: (sel) => null,
        querySelectorAll: (sel) => [],
        addEventListener: () => {}
      };
    }
    return this.elements[id];
  }
};
global.document = mockDocument;
global.window = {};

import { storage } from './js/core/storage.js';
import { renderSeedingLanding } from './js/modules/seeding/seeding-landing.js';
import { DEDERAN_STORAGE_KEYS } from './js/modules/seeding/dederan-manager.js';
import { generateUniqueDocNo } from './js/core/utils.js';

console.log('============================================================');
console.log('TEST: RENAME-DISPLAY-LABEL-DEDERAN-BENIH-TO-GERMINASI');
console.log('============================================================');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${testName}`);
    console.error(`       Error: ${err.message}`);
  }
}

// Reset environment
storage.set('dederan_induk_documents', []);
storage.set('dederan_transactions', []);
storage.set('seeding_transactions', []);
const appEl = document.getElementById('app');

// TEST 01: renderSeedingLanding() -> label "Germinasi" ditemukan pada tab
runTest('TEST 01: renderSeedingLanding() contains label "Germinasi" on tab', () => {
  renderSeedingLanding();
  assert(appEl.innerHTML.includes('<span>Germinasi</span>'), 'HTML must contain <span>Germinasi</span>');
  assert(appEl.innerHTML.includes('id="tab-btn-dederan"'), 'Tab button id must remain tab-btn-dederan');
});

// TEST 02: label "Dederan Benih" tidak lagi menjadi label tab
runTest('TEST 02: label "Dederan Benih" no longer used as tab label', () => {
  renderSeedingLanding();
  assert(!appEl.innerHTML.includes('<span>Dederan Benih</span>'), 'HTML must NOT contain <span>Dederan Benih</span>');
});

// TEST 03: Route /seeding tetap terdaftar dan mengarah ke renderSeedingLanding
runTest('TEST 03: Route /seeding is registered and functional in app.js', () => {
  const appJs = fs.readFileSync(path.join(__dirname, 'js', 'app.js'), 'utf8');
  assert(appJs.includes("registerRoute('/seeding', renderSeedingLanding)"), 'Route /seeding must map to renderSeedingLanding');
});

// TEST 04: Dederan storage keys tetap digunakan
runTest('TEST 04: Dederan storage keys are strictly preserved', () => {
  assert.strictEqual(DEDERAN_STORAGE_KEYS.INDUK, 'dederan_induk_documents');
  assert.strictEqual(DEDERAN_STORAGE_KEYS.TRANSACTIONS, 'dederan_transactions');
  assert.strictEqual(DEDERAN_STORAGE_KEYS.INSPECTIONS, 'dederan_inspections');
});

// TEST 05: Document prefix tetap DDR / DED / DED-INS
runTest('TEST 05: Document prefixes DDR, DED, DED-INS are strictly preserved', () => {
  const ddrDoc = generateUniqueDocNo('dederanInduk', [], 2026);
  const dedDoc = generateUniqueDocNo('dederan', [], 2026);
  const dedInsDoc = generateUniqueDocNo('dederanInspection', [], 2026);

  assert(ddrDoc.startsWith('2026/DDR/'), `Expected 2026/DDR/... but got ${ddrDoc}`);
  assert(dedDoc.startsWith('2026/DED/'), `Expected 2026/DED/... but got ${dedDoc}`);
  assert(dedInsDoc.startsWith('2026/DED-INS/'), `Expected 2026/DED-INS/... but got ${dedInsDoc}`);
});

// TEST 06: Technical identifier REJECT_DEDERAN & sourceModule DEDERAN tetap sama
runTest('TEST 06: Technical identifiers REJECT_DEDERAN & sourceModule DEDERAN are strictly preserved', () => {
  const selManagerJs = fs.readFileSync(path.join(__dirname, 'js', 'modules', 'selection', 'selection-manager.js'), 'utf8');
  const dederManagerJs = fs.readFileSync(path.join(__dirname, 'js', 'modules', 'seeding', 'dederan-manager.js'), 'utf8');
  const adapterJs = fs.readFileSync(path.join(__dirname, 'js', 'modules', 'seeding', 'dederan-pindah-semai-adapter.js'), 'utf8');

  assert(selManagerJs.includes("'REJECT_DEDERAN'"), 'selection-manager.js must retain REJECT_DEDERAN');
  assert(dederManagerJs.includes("originType: 'REJECT_DEDERAN'"), 'dederan-manager.js must retain REJECT_DEDERAN');
  assert(dederManagerJs.includes("sourceModule: 'DEDERAN'"), 'dederan-manager.js must retain sourceModule DEDERAN');
  assert(adapterJs.includes("sourceType: 'DEDER_INSPECTION'"), 'adapter must retain DEDER_INSPECTION');
});

console.log('============================================================');
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${totalTests - passedTests}`);
console.log(`OVERALL RESULT: ${passedTests === totalTests ? 'PASS' : 'FAIL'}`);
console.log('============================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
