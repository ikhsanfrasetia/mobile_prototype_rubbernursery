/**
 * scripts/test-asb-header-cleanup.js
 * Test Suite for ASISTEN_BIBITAN Header Cleanup Verification
 * 
 * Target: 20+ assertions covering:
 * 1. Header ASB tidak menampilkan Estate badge
 * 2. Header ASB tidak menampilkan Division badge
 * 3. Header ASB tetap memiliki back button
 * 4. Header ASB tetap memiliki page title
 * 5. Penerimaan Bibit tidak menampilkan badge scope
 * 6. Permintaan Bibit tidak menampilkan badge scope
 * 7. Pengeluaran Bibit tidak menampilkan badge scope
 * 8. Pemeriksaan Seleksi tidak menampilkan badge scope
 * 9. Pemusnahan Bibit tidak menampilkan badge scope
 * 10. Konsolidasi Data tidak menampilkan badge scope
 * 11. Verifikasi Data tidak menampilkan badge scope
 * 12. Master Bedengan tidak menampilkan badge scope
 * 13. Master Batch tidak menampilkan badge scope
 * 14. Scope authorization tetap berjalan
 * 15. Header Role lain tidak berubah
 */

if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    }
  };
  global.localStorage = globalThis.localStorage;
}

const elementRegistry = new Map();

function getOrCreateMock(id) {
  if (!elementRegistry.has(id)) {
    const el = new MockElement('div');
    el.id = id;
    elementRegistry.set(id, el);
  }
  return elementRegistry.get(id);
}

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.id = '';
    this.style = {};
    this.textContent = '';
    this._innerHTML = '';
    this.children = [];
    this.parentElement = null;
    this.dataset = {};
    this.type = '';
    this.value = '';
    this.eventListeners = {};
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(val) {
    this._innerHTML = val;
  }

  addEventListener(evt, cb) {
    if (!this.eventListeners[evt]) this.eventListeners[evt] = [];
    this.eventListeners[evt].push(cb);
  }

  querySelector(selector) {
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      return getOrCreateMock(id);
    }
    return new MockElement('div');
  }

  querySelectorAll(selector) {
    return [];
  }
}

global.document = {
  getElementById: (id) => getOrCreateMock(id),
  querySelector: (selector) => {
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      return getOrCreateMock(id);
    }
    return new MockElement('div');
  },
  querySelectorAll: () => []
};

global.window = {
  addEventListener: () => {}
};

import { session } from '../js/core/session.js';
import { storage } from '../js/core/storage.js';
import { renderReceiptKebunSepupuLanding } from '../js/modules/receipt/receipt-kebun-sepupu-landing.js';
import { renderRequestLanding } from '../js/modules/request/request-landing.js';
import { renderRequestKebunSepupuLanding } from '../js/modules/request/request-kebun-sepupu-landing.js';
import { renderDispatchLanding } from '../js/modules/dispatch/dispatch-landing.js';
import { renderSelectionLanding } from '../js/modules/selection/selection-landing.js';
import { renderDestructionLanding } from '../js/modules/destruction/destruction-landing.js';
import { renderConsolidationLanding } from '../js/modules/consolidation/consolidation-landing.js';
import { renderVerificationLanding } from '../js/modules/verification/verification-landing.js';
import { renderMasterBedengan } from '../js/modules/master/master-bedengan.js';
import { renderMasterBatch } from '../js/modules/master/master-batch.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('========================================================================================');
console.log('   TEST SUITE: BERSIHKAN HEADER MODUL ASISTEN_BIBITAN (UI CLEANUP AUDIT)                ');
console.log('========================================================================================\n');

async function runTests() {
  const app = document.getElementById('app');

  const asbUser = {
    id: 'USR-ASB-TBS',
    name: 'Budi Santoso',
    role: 'ASISTEN_BIBITAN',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Tanah Besih - Divisi I'
  };

  session.start(asbUser);

  // 1. Penerimaan Bibit
  console.log('--- TEST 1: Penerimaan Bibit Header ---');
  await renderReceiptKebunSepupuLanding();
  const receiptHtml = app.innerHTML;
  assert(receiptHtml.includes('Penerimaan Bibit'), '1.1 Penerimaan Bibit memiliki judul');
  assert(receiptHtml.includes('id="btn-back-ksp"') || receiptHtml.includes('btn-back'), '1.2 Penerimaan Bibit memiliki tombol kembali (back)');
  assert(!receiptHtml.includes('Kebun Sepupu • Tanah Besih'), '1.3 Penerimaan Bibit TIDAK menampilkan info scope kebun/divisi pada header ASB');

  // 2. Permintaan Bibit
  console.log('\n--- TEST 2: Permintaan Bibit Header ---');
  await renderRequestLanding();
  const reqLandingHtml = app.innerHTML;
  assert(reqLandingHtml.includes('Permintaan Bibit'), '2.1 Permintaan Bibit memiliki judul');
  assert(reqLandingHtml.includes('id="btn-back"'), '2.2 Permintaan Bibit memiliki tombol kembali');
  assert(!reqLandingHtml.includes('Tanah Besih') && !reqLandingHtml.includes('DIV-001'), '2.3 Permintaan Bibit landing tidak menampilkan badge scope');

  await renderRequestKebunSepupuLanding();
  const reqKspHtml = app.innerHTML;
  assert(reqKspHtml.includes('Permintaan Bibit Kebun Sepupu'), '2.4 Permintaan Bibit KSP memiliki judul');
  assert(reqKspHtml.includes('id="btn-back"'), '2.5 Permintaan Bibit KSP memiliki tombol kembali');

  // 3. Pengeluaran Bibit
  console.log('\n--- TEST 3: Pengeluaran Bibit Header ---');
  await renderDispatchLanding();
  const dispatchHtml = app.innerHTML;
  assert(dispatchHtml.includes('Pengeluaran Bibit'), '3.1 Pengeluaran Bibit memiliki judul');
  assert(dispatchHtml.includes('id="btn-back"'), '3.2 Pengeluaran Bibit memiliki tombol kembali');
  assert(!dispatchHtml.includes('Tanah Besih') && !dispatchHtml.includes('DIV-001'), '3.3 Pengeluaran Bibit header tidak memuat badge scope');

  // 4. Pemeriksaan Hasil Seleksi
  console.log('\n--- TEST 4: Pemeriksaan Hasil Seleksi Header ---');
  await renderSelectionLanding();
  const selHtml = app.innerHTML;
  assert(selHtml.includes('Pemeriksaan Hasil Seleksi'), '4.1 Pemeriksaan Hasil Seleksi memiliki judul');
  assert(selHtml.includes('id="btn-back"'), '4.2 Pemeriksaan Hasil Seleksi memiliki tombol kembali');
  assert(!selHtml.includes('background: #E8F3EC') && !selHtml.includes('Tanah Besih'), '4.3 Pemeriksaan Hasil Seleksi TIDAK memuat badge [Tanah Besih] di header');

  // 5. Pemusnahan Bibit
  console.log('\n--- TEST 5: Pemusnahan Bibit Header ---');
  await renderDestructionLanding();
  const destHtml = app.innerHTML;
  assert(destHtml.includes('Pemusnahan Bibit'), '5.1 Pemusnahan Bibit memiliki judul');
  assert(destHtml.includes('id="btn-back"'), '5.2 Pemusnahan Bibit memiliki tombol kembali');
  assert(!destHtml.includes('background: #E8F3EC') && !destHtml.includes('Tanah Besih'), '5.3 Pemusnahan Bibit TIDAK memuat badge [Tanah Besih] di header');

  // 6. Konsolidasi Data
  console.log('\n--- TEST 6: Konsolidasi Data Header ---');
  await renderConsolidationLanding();
  const consolHtml = app.innerHTML;
  assert(consolHtml.includes('Konsolidasi Data Pembibitan'), '6.1 Konsolidasi Data memiliki judul');
  assert(consolHtml.includes('id="btn-back"'), '6.2 Konsolidasi Data memiliki tombol kembali');
  assert(!consolHtml.includes('background: #E8F3EC') && !consolHtml.includes('Tanah Besih'), '6.3 Konsolidasi Data TIDAK memuat badge [Tanah Besih] di header');

  // 7. Verifikasi Data
  console.log('\n--- TEST 7: Verifikasi Data Header ---');
  const mainContent = document.getElementById('main-content');
  await renderVerificationLanding();
  const verifHtml = mainContent.innerHTML || app.innerHTML;
  assert(verifHtml.includes('Verifikasi Data Transaksi'), '7.1 Verifikasi Data memiliki judul');
  assert(!verifHtml.includes('<strong>Kebun:</strong>') && !verifHtml.includes('<strong>Divisi:</strong>'), '7.2 Verifikasi Data TIDAK memuat info scope Kebun & Divisi di header');

  // 8. Master Bedengan
  console.log('\n--- TEST 8: Master Bedengan Header ---');
  await renderMasterBedengan();
  const bedHtml = app.innerHTML;
  const bedHeader = bedHtml.match(/<header[\s\S]*?<\/header>/i)?.[0] || '';
  assert(bedHeader.includes('Master Bedengan'), '8.1 Master Bedengan memiliki judul');
  assert(bedHeader.includes('id="btn-back-home"'), '8.2 Master Bedengan memiliki tombol kembali');
  assert(!bedHeader.includes('background: #E8F3EC') && !bedHeader.includes('Tanah Besih') && !bedHeader.includes('divisi aktif'), '8.3 Master Bedengan TIDAK memuat badge / info scope di header');

  // 9. Master Batch
  console.log('\n--- TEST 9: Master Batch Header ---');
  await renderMasterBatch();
  const batchHtml = app.innerHTML;
  const batchHeader = batchHtml.match(/<header[\s\S]*?<\/header>/i)?.[0] || '';
  assert(batchHeader.includes('Master Batch'), '9.1 Master Batch memiliki judul');
  assert(batchHeader.includes('id="btn-back-home"'), '9.2 Master Batch memiliki tombol kembali');
  assert(!batchHeader.includes('background: #E8F3EC') && !batchHeader.includes('Tanah Besih') && !batchHeader.includes('divisi aktif'), '9.3 Master Batch TIDAK memuat badge / info scope di header');

  // 10. Scope Authorization & Non-ASB preservation
  console.log('\n--- TEST 10: Scope Authorization & Non-ASB Preservation ---');
  assert(session.get().estateId === 'EST-TBS', '10.1 currentUser.estateId tetap terjaga untuk scoping authorization');
  assert(session.get().divisionId === 'DIV-001', '10.2 currentUser.divisionId tetap terjaga untuk scoping authorization');

  const pengurusUser = {
    id: 'USR-PENGURUS-TBS',
    name: 'Pengurus TBS',
    role: 'PENGURUS',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Tanah Besih - Divisi I'
  };
  session.start(pengurusUser);
  await renderReceiptKebunSepupuLanding();
  const pengurusReceiptHtml = app.innerHTML;
  assert(pengurusReceiptHtml.includes('Kebun Sepupu • Tanah Besih'), '10.3 Role non-ASB (Pengurus) tetap mempertahankan header context');

  console.log('\n========================================================================================');
  console.log(`   TOTAL PASSED ASSERTIONS: ${passed}`);
  console.log(`   TOTAL FAILED ASSERTIONS: ${failed}`);
  console.log('========================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
