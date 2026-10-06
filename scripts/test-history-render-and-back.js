/**
 * scripts/test-history-render-and-back.js
 * Verification Suite for /history Render and Role-Based Back Navigation.
 */

import { session } from '../js/core/session.js';
import { storage } from '../js/core/storage.js';
import { ROLES } from '../js/core/permissions.js';
import { renderNurseryHistory } from '../js/modules/history/nursery-history.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`❌ FAIL: ${message}`);
  }
}

console.log('========================================================================================');
console.log('       TEST SUITE: VERIFIKASI /HISTORY RENDER & ROLE-BASED BACK NAVIGATION              ');
console.log('========================================================================================\n');

// Mock localStorage for storage engine
const memStore = {};
global.localStorage = {
  getItem: (k) => memStore[k] || null,
  setItem: (k, v) => { memStore[k] = String(v); },
  removeItem: (k) => { delete memStore[k]; }
};

// Seed storage with realistic sample transactions
storage.set('receipt_transactions', [
  {
    id: 'RCV-001',
    docNo: '2026/APR/001',
    program: 'Program Nursery 2026 - Batch 1',
    tahapan: 'Rubber Main Nursery',
    jenis: 'Benih / Biji Kelatak',
    klon: 'PB 260',
    qty: 5000,
    batchNo: 'Batch-01',
    penerima: 'Wagiman',
    tanggal: '2026-09-12'
  }
]);
storage.set('seeding_transactions', [
  {
    docNo: '2026/SOW/001',
    program: 'Program Nursery 2026 - Batch 1',
    tahapan: 'Rubber Main Nursery',
    totalDisemai: 4800,
    ditolak: 200,
    batchNo: 'Batch-01',
    klonAwal: 'GT-01',
    bedengan: 'Bedengan 01',
    tanggal: '2026-09-15'
  }
]);
storage.set('budding_transactions', [
  {
    docNo: '2026/GRF/001',
    program: 'Program Nursery 2026 - Batch 1',
    tahapan: 'Rubber Main Nursery',
    type: 'GRAFTING',
    jumlah: 4500,
    batchNo: 'Batch-01',
    klonEntres: 'PB 260',
    klonRootstock: 'GT-01',
    bedengan: 'Bedengan 01',
    tanggal: '2026-09-20'
  }
]);
storage.set('inspection_transactions', [
  {
    docNo: '2026/INS/001',
    program: 'Program Nursery 2026 - Batch 1',
    tahapan: 'Rubber Main Nursery',
    totalDiperiksa: 4500,
    jumlahJadi: 4000,
    jumlahGagal: 500,
    batchNo: 'Batch-01',
    klonEntres: 'PB 260',
    bedengan: 'Bedengan 01',
    tanggal: '2026-09-28'
  }
]);
storage.set('selection_transactions', [
  {
    docNo: '2026/CULL/001',
    program: 'Program Nursery 2026 - Batch 1',
    tahapan: 'Rubber Main Nursery',
    jumlahAfkir: 300,
    batchNo: 'Batch-01',
    klon: 'PB 260',
    bedengan: 'Bedengan 01',
    tanggal: '2026-10-01'
  }
]);

// Helper to simulate rendering and test back navigation
function testRenderForPersona(persona, expectedBackTarget) {
  session.start({
    id: persona.id,
    userId: persona.id,
    code: persona.id,
    role: persona.role,
    name: persona.name,
    position: persona.position,
    divisionId: 'DIV-001'
  });

  let capturedHTML = '';
  const eventListeners = {};

  const mockApp = {
    get innerHTML() { return capturedHTML; },
    set innerHTML(val) { capturedHTML = val; },
    querySelector: (sel) => {
      return {
        addEventListener: (event, handler) => {
          eventListeners[sel] = handler;
        },
        dataset: {},
        style: {},
        value: 'ALL'
      };
    },
    querySelectorAll: (sel) => {
      return [
        {
          addEventListener: (event, handler) => {
            if (!eventListeners[sel]) eventListeners[sel] = [];
            eventListeners[sel].push(handler);
          },
          dataset: { cat: 'ALL', id: 'RCV-0' },
          querySelector: () => ({ textContent: '', style: {} })
        }
      ];
    }
  };

  global.document = {
    getElementById: (id) => mockApp
  };

  let navigatedTo = null;
  global.location = {
    _hash: '#/history',
    get hash() { return this._hash; },
    set hash(val) {
      this._hash = val;
      navigatedTo = val.replace(/^#/, '');
    },
    replace: (target) => {
      this._hash = target;
      navigatedTo = target.replace(/^#/, '');
    }
  };

  // Run renderer
  let renderError = null;
  try {
    renderNurseryHistory();
  } catch (err) {
    renderError = err;
  }

  assert(renderError === null, `${persona.name} (${persona.role}) renderNurseryHistory() executes with 0 runtime errors`);
  assert(capturedHTML.length > 5000, `${persona.name} HTML generated successfully (length: ${capturedHTML.length})`);
  assert(capturedHTML.includes('Laporan & Riwayat Pembibitan'), `${persona.name} HTML contains main header "Laporan & Riwayat Pembibitan"`);
  assert(capturedHTML.includes('id="btn-back"'), `${persona.name} HTML contains Back Button #btn-back`);
  assert(capturedHTML.includes('Stok Awal Penerimaan'), `${persona.name} HTML contains Stock Metric Banner`);
  assert(capturedHTML.includes('card-history-entry'), `${persona.name} HTML contains history cards`);
  assert(capturedHTML.includes('2026/APR/001'), `${persona.name} HTML contains transaction doc 2026/APR/001`);

  // Test Back button listener
  assert(typeof eventListeners['#btn-back'] === 'function', `${persona.name} #btn-back click listener is registered`);
  if (typeof eventListeners['#btn-back'] === 'function') {
    eventListeners['#btn-back']();
    assert(navigatedTo === expectedBackTarget, `${persona.name} Back button routes correctly to "${expectedBackTarget}" (actual: "${navigatedTo}")`);
  }
}

// --------------------------------------------------------------------------------------
// 1. ASB001 — Annisa (ASISTEN_BIBITAN)
// --------------------------------------------------------------------------------------
console.log('1. Testing ASB001 (Annisa - ASISTEN_BIBITAN):');
testRenderForPersona(
  { id: 'ASB001', name: 'Annisa', role: ROLES.ASISTEN_BIBITAN, position: 'Asisten Pembibitan' },
  '/reports'
);

// --------------------------------------------------------------------------------------
// 2. ASB002 — Abdul Gofur (ASISTEN_BIBITAN)
// --------------------------------------------------------------------------------------
console.log('\n2. Testing ASB002 (Abdul Gofur - ASISTEN_BIBITAN):');
testRenderForPersona(
  { id: 'ASB002', name: 'Abdul Gofur', role: ROLES.ASISTEN_BIBITAN, position: 'Asisten Pembibitan' },
  '/reports'
);

// --------------------------------------------------------------------------------------
// 3. MNT001 — Wagiman (MANTRI_TANAMAN)
// --------------------------------------------------------------------------------------
console.log('\n3. Testing MNT001 (Wagiman - MANTRI_TANAMAN):');
testRenderForPersona(
  { id: 'MNT001', name: 'Wagiman', role: ROLES.MANTRI_TANAMAN, position: 'Mantri Bibitan' },
  '/home'
);

// --------------------------------------------------------------------------------------
// 4. Empty Storage Handling
// --------------------------------------------------------------------------------------
console.log('\n4. Testing Empty Storage Graceful Degradation:');
storage.set('receipt_transactions', []);
storage.set('seeding_transactions', []);
storage.set('budding_transactions', []);
storage.set('inspection_transactions', []);
storage.set('selection_transactions', []);

let emptyStorageHTML = '';
const mockEmptyApp = {
  get innerHTML() { return emptyStorageHTML; },
  set innerHTML(val) { emptyStorageHTML = val; },
  querySelector: () => ({ addEventListener: () => {}, dataset: {}, style: {}, value: '' }),
  querySelectorAll: () => []
};
global.document.getElementById = () => mockEmptyApp;

try {
  renderNurseryHistory();
  assert(emptyStorageHTML.includes('Tidak Ada Transaksi'), 'Empty state card rendered when transaction storage is empty');
  assert(emptyStorageHTML.includes('0 Pkk'), 'Summary cards show 0 Pkk gracefully');
} catch (e) {
  assert(false, `Empty storage render failed: ${e.message}`);
}

console.log('\n========================================================================================');
console.log(`TOTAL RESULTS: ${passed} PASSED / ${failed} FAILED`);
console.log('========================================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
