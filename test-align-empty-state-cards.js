/**
 * test-align-empty-state-cards.js
 * Integration & UI-Oriented Test Suite for ALIGN-EMPTY-STATE-CARDS-NURSERY
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
const listeners = new Map();
function createMockElement(id = '') {
  const el = {
    id,
    innerHTML: '',
    value: '',
    style: {},
    classList: { add() {}, remove() {}, contains() { return false; } },
    addEventListener(evt, handler) {
      if (!listeners.has(id)) listeners.set(id, {});
      listeners.get(id)[evt] = handler;
    },
    querySelector(sel) {
      const cleanId = sel.replace(/^#/, '');
      return mockDocument.getElementById(cleanId);
    },
    querySelectorAll(sel) {
      return [];
    }
  };
  return el;
}

const mockDocument = {
  elements: {},
  getElementById(id) {
    if (!this.elements[id]) {
      this.elements[id] = createMockElement(id);
    }
    return this.elements[id];
  },
  querySelector(sel) {
    const cleanId = sel.replace(/^#/, '');
    return this.getElementById(cleanId);
  },
  querySelectorAll(sel) {
    return [];
  },
  addEventListener(evt, fn) {},
  removeEventListener(evt, fn) {}
};
global.document = mockDocument;
global.window = {};

import { storage } from './js/core/storage.js';
import { renderEmptyStateCard, STANDARD_DOCUMENT_ICON } from './js/components/empty-state.js';
import { renderBuddingGrafting } from './js/modules/budding/budding-grafting.js';
import { renderBuddingRegrafting } from './js/modules/budding/budding-regrafting.js';
import { renderSeedingLanding } from './js/modules/seeding/seeding-landing.js';

console.log('============================================================');
console.log('TEST SUITE: ALIGN-EMPTY-STATE-CARDS-NURSERY');
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
    console.error(err);
  }
}

// TEST 01: Okulasi empty state
runTest('TEST 01: Okulasi empty state structure matches standard design system', () => {
  storageMap.clear();
  storage.set('pre_grafting_selection_documents', []);
  storage.set('budding_transactions', []);

  renderBuddingGrafting();
  const appHtml = mockDocument.getElementById('app').innerHTML;

  assert(appHtml.includes('Belum Ada Bibit Siap Diokulasi'), 'Must contain Okulasi empty state title');
  assert(appHtml.includes('Seleksi III belum final'), 'Must contain Okulasi context explanation');
  assert(appHtml.includes('background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 32px 20px;'), 'Must have standard card styling');
  assert(appHtml.includes('width: 44px; height: 44px; border-radius: 50%; background: #F1F5F9;'), 'Must have circular icon container');
});

// TEST 02: Regrafting empty state
runTest('TEST 02: Regrafting empty state structure matches standard design system', () => {
  storageMap.clear();
  storage.set('regrafting_pool', []);
  storage.set('budding_transactions', []);

  renderBuddingRegrafting();
  const appHtml = mockDocument.getElementById('app').innerHTML;

  assert(appHtml.includes('Belum Ada Bibit Siap Regrafting'), 'Must contain Regrafting empty state title');
  assert(appHtml.includes('Pemeriksaan Okulasi'), 'Must retain Pemeriksaan Okulasi context');
  assert(appHtml.includes('Perlu Okulasi Janda'), 'Must retain Perlu Okulasi Janda context');
  assert(appHtml.includes('background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 32px 20px;'), 'Must have standard card styling');
  assert(appHtml.includes('width: 44px; height: 44px; border-radius: 50%; background: #F1F5F9;'), 'Must have circular icon container');
});

// TEST 03: Germinasi
runTest('TEST 03: Germinasi empty state matches reference design without regression', () => {
  storageMap.clear();
  storage.set('dederan_induk_documents', []);
  storage.set('dederan_transactions', []);

  renderSeedingLanding();
  const appHtml = mockDocument.getElementById('app').innerHTML;

  assert(appHtml.includes('Belum Ada Penerimaan Benih'), 'Must contain Germinasi empty state title');
  assert(appHtml.includes('Penerimaan Benih / Biji Kelatak'), 'Must contain instruction context');
  assert(appHtml.includes('background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 32px 20px;'), 'Must have standard card styling');
  assert(appHtml.includes('width: 44px; height: 44px; border-radius: 50%; background: #F1F5F9;'), 'Must have circular icon container');
});

// TEST 04: Pindah Semai
runTest('TEST 04: Pindah Semai empty state matches standard design system', () => {
  storageMap.clear();
  storage.set('dederan_transactions', []);
  storage.set('dederan_inspections', []);
  storage.set('seeding_transactions', []);

  // Switch to Pindah Semai Tab
  const pindahTabBtn = listeners.get('tab-btn-pindah-semai');
  if (pindahTabBtn && pindahTabBtn.click) {
    pindahTabBtn.click();
  } else {
    renderSeedingLanding();
    listeners.get('tab-btn-pindah-semai')?.click?.();
  }

  const appHtml = mockDocument.getElementById('app').innerHTML;

  assert(appHtml.includes('Belum Ada Sumber Siap Pindah Semai'), 'Must contain Pindah Semai empty state title');
  assert(appHtml.includes('Belum Ada Transaksi Pindah Semai'), 'Must contain Pindah Semai transaction empty state title');
  assert(appHtml.includes('background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 32px 20px;'), 'Must have standard card styling');
  assert(appHtml.includes('width: 44px; height: 44px; border-radius: 50%; background: #F1F5F9;'), 'Must have circular icon container');
});

// TEST 05: Title hierarchy
runTest('TEST 05: Title font styling and hierarchy is consistent', () => {
  const cardHtml = renderEmptyStateCard({ title: 'Contoh Judul', description: 'Contoh Deskripsi' });
  assert(cardHtml.includes('font-size: 0.92rem; font-weight: 700; color: #0F172A; margin: 0 0 4px 0;'), 'Title must have standard size, weight, color and margin');
});

// TEST 06: Description hierarchy
runTest('TEST 06: Description font styling and hierarchy is consistent', () => {
  const cardHtml = renderEmptyStateCard({ title: 'Contoh Judul', description: 'Contoh Deskripsi' });
  assert(cardHtml.includes('font-size: 0.78rem; color: #64748B; margin: 0 auto; line-height: 1.5; max-width: 290px;'), 'Description must have standard typography, color, line-height and max-width');
});

// TEST 07: Icon container
runTest('TEST 07: Icon container circular background and sizing is consistent', () => {
  assert(STANDARD_DOCUMENT_ICON.includes('width: 44px; height: 44px; border-radius: 50%; background: #F1F5F9;'), 'Icon container must have circular background styling');
  assert(STANDARD_DOCUMENT_ICON.includes('color: #64748B;'), 'Icon must have standard muted slate color');
  assert(STANDARD_DOCUMENT_ICON.includes('aria-hidden="true"'), 'Icon must have accessibility attribute');
});

// TEST 08: No business logic regression
runTest('TEST 08: Business logic and data rendering remains intact when data is present', () => {
  storageMap.clear();
  
  // Seed Seleksi III final doc for Okulasi
  const s3Docs = [{
    id: 's3-001',
    docNo: '2026/S3/001',
    batchNo: 'BATCH-2026-001',
    selectionStage: 'SELEKSI_III',
    selectionType: 'PRA_OKULASI',
    status: 'DISETUJUI',
    isFinal: true,
    klon: 'GT 1',
    totalLayak: 500,
    bedenganCode: 'BED-001'
  }];
  storage.set('pre_grafting_selection_documents', s3Docs);
  storage.set('budding_transactions', []);

  renderBuddingGrafting();
  const appHtml = mockDocument.getElementById('app').innerHTML;

  assert(!appHtml.includes('Belum Ada Bibit Siap Diokulasi'), 'Should NOT render empty state when data is present');
  assert(appHtml.includes('BATCH-2026-001'), 'Must render batch item correctly');
  assert(appHtml.includes('500 Pkk'), 'Must render quantity correctly');
});

console.log('============================================================');
console.log(`TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
console.log('============================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}
