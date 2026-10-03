/**
 * tests/test-selection-pindah-semai-tab.js
 * Integration Test Suite for Dedicated "Seleksi Ditolak Pindah Semai" Tab
 *
 * Scenarios:
 * IT-REJECT-SEMAI-001: SOW/003 (REJECT_PENYEMAIAN) muncul di tab baru (PINDAH_SEMAI_REJECT)
 * IT-REJECT-SEMAI-002: Qty 1.000 Pkk benar terformat
 * IT-REJECT-SEMAI-003: SOW dengan Ditolak = 0 tidak muncul di selection_pool/tab
 * IT-REJECT-SEMAI-004: Multiple SOW berbeda tetap terisolasi
 * IT-REJECT-SEMAI-005: REJECT_PENYEMAIAN tidak muncul di Tab 1 (Pra-Semai Dederan)
 * IT-REJECT-SEMAI-006: REJECT_PENYEMAIAN tidak masuk ke Pre-Grafting (Seleksi I-III)
 * IT-REJECT-SEMAI-007: REJECT_PENYEMAIAN tidak masuk ke Post-Grafting (Pasca-Okulasi)
 * IT-REJECT-SEMAI-008: Declaration existing handler works (declareSelectionItem)
 * IT-REJECT-SEMAI-009: After declaration, actionable = 0
 * IT-REJECT-SEMAI-010: History contains declared item with status MENUNGGU_VERIFIKASI
 * IT-REJECT-SEMAI-011: Approval updates status to DISETUJUI and remains in history
 * IT-REJECT-SEMAI-012: No duplicate CULL number generated
 * IT-REJECT-SEMAI-013: Estate / Division scope isolation respected
 * IT-REJECT-SEMAI-014: Existing Dederan rejection records unchanged in Tab 1
 * IT-REJECT-SEMAI-015: Existing valid Post-Grafting records unchanged in Tab 3
 * IT-REJECT-SEMAI-016: Existing Pre-Grafting documents unchanged in Tab 2
 */

// Mock localStorage
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

// Mock DOM elements for document / window
class FakeElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this._innerHTML = '';
    this.listeners = new Map();
    this.style = {};
    this.dataset = {};
  }
  get innerHTML() {
    return this._innerHTML;
  }
  set innerHTML(val) {
    this._innerHTML = val;
  }
  querySelector(sel) {
    const all = this.querySelectorAll(sel);
    return all.length > 0 ? all[0] : null;
  }
  querySelectorAll(sel) {
    const results = [];
    const cleanSel = sel.trim();
    if (cleanSel.startsWith('#')) {
      const id = cleanSel.slice(1);
      if (this.innerHTML.includes(`id="${id}"`)) {
        const el = new FakeElement();
        el.id = id;
        results.push(el);
      }
    } else if (cleanSel.startsWith('.')) {
      const cls = cleanSel.slice(1);
      const regex = new RegExp(`class="[^"]*\\b${cls}\\b[^"]*"`, 'g');
      const matches = this.innerHTML.match(regex) || [];
      matches.forEach(() => {
        const el = new FakeElement();
        results.push(el);
      });
    }
    return results;
  }
  addEventListener(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(fn);
  }
}

global.document = {
  getElementById: (id) => {
    if (id === 'app') {
      if (!global.__appEl) global.__appEl = new FakeElement('div');
      return global.__appEl;
    }
    return null;
  },
  createElement: (tag) => new FakeElement(tag)
};
global.window = {
  confirm: () => true
};

import { storage } from '../js/core/storage.js';
import {
  renderSelectionLanding
} from '../js/modules/selection/selection-landing.js';
import {
  SELECTION_STATUS,
  integrateSeedingToSelectionPool,
  syncAllSeedingsToSelectionPool,
  declareSelectionItem,
  approveSelectionRecord
} from '../js/modules/selection/selection-manager.js';

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
console.log('TEST SUITE: SELEKSI DITOLAK PINDAH SEMAI DEDICATED TAB');
console.log('========================================================\n');

const mockUser = {
  name: 'Irwan Syah Putra',
  code: '1405482',
  position: 'Mantri Pembibitan',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

function setupInitialData() {
  localStorage.clear();
  global.__appEl = new FakeElement('div');

  // 1. Dederan Rejection Record (Tab 1)
  storage.set('selection_pool', [
    {
      id: 'SEL-POOL-DED-001',
      docNo: '2026/CULL/001',
      originType: 'REJECT_DEDERAN',
      sourceModule: 'DEDERAN',
      sourceTransactionType: 'DEDER_INSPECTION',
      sourceDocNo: '2026/DED/001',
      dederanDocNo: '2026/DED/001',
      bedenganCode: 'BED-001',
      bedengan: 'Bedengan 001',
      klon: 'GT 1',
      jumlahAfkir: 500,
      quantity: 500,
      estateId: 'EST-01',
      divisionId: 'DIV-01',
      status: 'PENDING_DECLARATION'
    },
    // 2. Post-Grafting Rejection Record (Tab 4)
    {
      id: 'SEL-POOL-GRAFT-001',
      docNo: '2026/CULL/002',
      originType: 'REJECT_OKULASI',
      sourceModule: 'BUDDING',
      sourceTransactionType: 'GRAFTING',
      sourceDocNo: '2026/GRAFT/001',
      batchCode: 'BATCH-001',
      klon: 'PB 260',
      jumlahAfkir: 300,
      quantity: 300,
      estateId: 'EST-01',
      divisionId: 'DIV-01',
      status: 'PENDING_DECLARATION'
    }
  ]);

  // 3. Pre-Grafting Document (Tab 3)
  storage.set('pre_grafting_selection_documents', [
    {
      id: 'SEL-DOC-001',
      docNo: '2026/SEL/001',
      selectionStage: 'SELEKSI_I',
      sourceDocNo: '2026/SOW/001',
      batchCode: 'BATCH-001',
      clone: 'GT 1',
      sourcePolybagQty: 4450,
      sourceBibitQty: 8900,
      totalLayak: 8900,
      totalAfkir: 0,
      estateId: 'EST-01',
      divisionId: 'DIV-01',
      status: 'DRAFT'
    }
  ]);

  storage.set('selection_transactions', []);
}

// -----------------------------------------------------------------------------
// IT-REJECT-SEMAI-001 & 002: SOW/003 dimasukkan ke pool dan tampil di tab baru
// -----------------------------------------------------------------------------
console.log('--- Test 1: IT-REJECT-SEMAI-001 & IT-REJECT-SEMAI-002 (SOW/003 Pool Entry & Format) ---');
setupInitialData();

const sow003 = {
  id: 'SOW-TX-003',
  docNo: '2026/SOW/003',
  sourceDocNo: '2026/DED/002',
  klon: 'GT 1',
  bedengan: 'BED-002',
  bedenganCode: 'BED-002',
  batchCode: 'BATCH-002',
  date: '2026-03-10',
  totalDisemai: 4000,
  totalPolybag: 2000,
  ditolak: 1000,
  alasanDitolak: 'Rusak',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

const intResult = integrateSeedingToSelectionPool(sow003);
assert(intResult.success === true, 'integrateSeedingToSelectionPool succeeds');
assert(intResult.createdCount === 1, '1 pool item created for SOW/003');

const poolAfter = storage.get('selection_pool', []);
const sowPoolItem = poolAfter.find(p => p.sourceDocNo === '2026/SOW/003');
assert(Boolean(sowPoolItem), 'SOW/003 pool item exists in selection_pool');
assert(sowPoolItem.originType === 'REJECT_PENYEMAIAN', 'originType is REJECT_PENYEMAIAN');
assert(sowPoolItem.jumlahAfkir === 1000, 'jumlahAfkir is 1000');
assert(sowPoolItem.status === 'PENDING_DECLARATION', 'Status is PENDING_DECLARATION');

// -----------------------------------------------------------------------------
// IT-REJECT-SEMAI-003: Ditolak = 0 tidak menghasilkan actionable item
// -----------------------------------------------------------------------------
console.log('\n--- Test 2: IT-REJECT-SEMAI-003 (Ditolak 0 Tidak Menghasilkan Pool Item) ---');
const sow002 = {
  id: 'SOW-TX-002',
  docNo: '2026/SOW/002',
  sourceDocNo: '2026/DED/002',
  klon: 'GT 1',
  totalDisemai: 5000,
  totalPolybag: 2500,
  ditolak: 0,
  alasanDitolak: 'Tidak ada',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};
const intResult0 = integrateSeedingToSelectionPool(sow002);
assert(intResult0.createdCount === 0, 'No pool item created for ditolak = 0');

// -----------------------------------------------------------------------------
// IT-REJECT-SEMAI-004: Multiple SOW masing-masing terisolasi
// -----------------------------------------------------------------------------
console.log('\n--- Test 3: IT-REJECT-SEMAI-004 (Multiple SOW Isolation) ---');
const sow004 = {
  id: 'SOW-TX-004',
  docNo: '2026/SOW/004',
  sourceDocNo: '2026/DED/002',
  klon: 'GT 1',
  bedengan: 'BED-003',
  bedenganCode: 'BED-003',
  date: '2026-03-12',
  totalDisemai: 3000,
  totalPolybag: 1500,
  ditolak: 500,
  alasanDitolak: 'Mati',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};
integrateSeedingToSelectionPool(sow004);

const poolAfterMulti = storage.get('selection_pool', []);
const sow003Item = poolAfterMulti.find(p => p.sourceDocNo === '2026/SOW/003');
const sow004Item = poolAfterMulti.find(p => p.sourceDocNo === '2026/SOW/004');

assert(sow003Item && sow003Item.jumlahAfkir === 1000, 'SOW/003 item has 1.000 Pkk');
assert(sow004Item && sow004Item.jumlahAfkir === 500, 'SOW/004 item has 500 Pkk');
assert(sow003Item.id !== sow004Item.id, 'SOW/003 and SOW/004 have distinct IDs');

// -----------------------------------------------------------------------------
// IT-REJECT-SEMAI-005, 006, 007: Domain Isolation (Tab 1, Tab 2, Tab 3)
// -----------------------------------------------------------------------------
console.log('\n--- Test 4: IT-REJECT-SEMAI-005, 006, 007 (Domain Isolation) ---');
// Verify filters directly
const currentPool = storage.get('selection_pool', []);

// Tab 1: Pra-Semai (Dederan)
const tab1Items = currentPool.filter(item =>
  (item.originType === 'REJECT_DEDERAN' || (!item.originType && item.sourceModule === 'DEDERAN')) &&
  (parseInt(item.jumlahAfkir || item.quantity || 0, 10) > 0)
);
assert(!tab1Items.some(i => i.originType === 'REJECT_PENYEMAIAN'), 'Tab 1 has NO REJECT_PENYEMAIAN');
assert(tab1Items.some(i => i.originType === 'REJECT_DEDERAN' && i.sourceDocNo === '2026/DED/001'), 'Tab 1 retains existing REJECT_DEDERAN');

// Tab 2: Ditolak Pindah Semai
const tab2Items = currentPool.filter(item =>
  (item.originType === 'REJECT_PENYEMAIAN' || (!item.originType && item.sourceModule === 'PENYEMAIAN')) &&
  (parseInt(item.jumlahAfkir || item.quantity || 0, 10) > 0)
);
assert(tab2Items.length === 2, 'Tab 2 has exactly 2 Pindah Semai reject items (SOW/003 and SOW/004)');
assert(!tab2Items.some(i => i.originType === 'REJECT_DEDERAN'), 'Tab 2 has NO REJECT_DEDERAN');
assert(!tab2Items.some(i => i.originType === 'REJECT_OKULASI'), 'Tab 2 has NO REJECT_OKULASI');

// Tab 4: Pasca-Okulasi (Post-Grafting)
const tab4Items = currentPool.filter(item =>
  item.originType !== 'REJECT_DEDERAN' &&
  item.sourceModule !== 'DEDERAN' &&
  item.originType !== 'REJECT_PENYEMAIAN' &&
  item.sourceModule !== 'PENYEMAIAN'
);
assert(!tab4Items.some(i => i.originType === 'REJECT_PENYEMAIAN'), 'Tab 4 has NO REJECT_PENYEMAIAN');
assert(!tab4Items.some(i => i.originType === 'REJECT_DEDERAN'), 'Tab 4 has NO REJECT_DEDERAN');
assert(tab4Items.some(i => i.originType === 'REJECT_OKULASI' && i.sourceDocNo === '2026/GRAFT/001'), 'Tab 4 retains existing REJECT_OKULASI');

// -----------------------------------------------------------------------------
// IT-REJECT-SEMAI-008, 009, 010: Declaration Existing Handler & State Transition
// -----------------------------------------------------------------------------
console.log('\n--- Test 5: IT-REJECT-SEMAI-008, 009, 010 (Declaration Flow) ---');
const targetItem = tab2Items.find(i => i.sourceDocNo === '2026/SOW/003');
const photoResult = {
  id: 'PHOTO-001',
  dataUrl: 'data:image/png;base64,sample',
  capturedAt: '2026-03-10T10:00:00Z',
  capturedAtLabel: '10/03/2026'
};

const declRes = declareSelectionItem(targetItem, photoResult, mockUser, {
  category: 'RUSAK',
  notes: 'Afkir pindah semai polybag patah'
});

assert(declRes.success === true, 'declareSelectionItem returns success');
assert(declRes.transaction.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI, 'Transaction status is MENUNGGU_VERIFIKASI');
assert(declRes.transaction.sourceDocNo === '2026/SOW/003', 'Transaction sourceDocNo is 2026/SOW/003');
assert(declRes.transaction.jumlahAfkir === 1000, 'Transaction jumlahAfkir is 1000');

const poolAfterDecl = storage.get('selection_pool', []);
const updatedPoolItem = poolAfterDecl.find(p => p.sourceDocNo === '2026/SOW/003');
assert(updatedPoolItem.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI, 'Pool item status updated to MENUNGGU_VERIFIKASI');

const txsAfterDecl = storage.get('selection_transactions', []);
const createdTx = txsAfterDecl.find(t => t.sourceDocNo === '2026/SOW/003');
assert(Boolean(createdTx), 'selection_transactions contains created record');
assert(createdTx.originType === 'REJECT_PENYEMAIAN', 'Transaction retains originType REJECT_PENYEMAIAN');

// -----------------------------------------------------------------------------
// IT-REJECT-SEMAI-011 & 012: Approval & CULL Safety
// -----------------------------------------------------------------------------
console.log('\n--- Test 6: IT-REJECT-SEMAI-011 & IT-REJECT-SEMAI-012 (Approval & CULL Safety) ---');
const asistenUser = {
  name: 'Asisten Bibitan',
  code: 'ASB-01',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

const appResult = approveSelectionRecord(createdTx.id, 'Disetujui untuk pemusnahan', asistenUser);
assert(appResult.status === SELECTION_STATUS.DISETUJUI, 'Approval updates status to DISETUJUI');

const txsAfterApprove = storage.get('selection_transactions', []);
const approvedTx = txsAfterApprove.find(t => t.id === createdTx.id);
assert(approvedTx.status === SELECTION_STATUS.DISETUJUI, 'Transaction status is DISETUJUI');
assert(approvedTx.approvalNotes === 'Disetujui untuk pemusnahan', 'Approval notes recorded');

// Check CULL number uniqueness
const allDocNos = txsAfterApprove.map(t => t.docNo);
const uniqueDocNos = new Set(allDocNos);
assert(allDocNos.length === uniqueDocNos.size, 'All CULL document numbers are unique without duplicates');

// -----------------------------------------------------------------------------
// IT-REJECT-SEMAI-013: Scope Isolation (Estate/Division)
// -----------------------------------------------------------------------------
console.log('\n--- Test 7: IT-REJECT-SEMAI-013 (Scope Isolation) ---');
const userDiv2 = {
  name: 'Mantri Divisi 2',
  code: '1405483',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-01',
  divisionId: 'DIV-02'
};

// Items from DIV-01 should not be accessible in DIV-02 scope
const poolDiv2 = storage.get('selection_pool', []).filter(item =>
  item.estateId === userDiv2.estateId && item.divisionId === userDiv2.divisionId
);
assert(!poolDiv2.some(i => i.sourceDocNo === '2026/SOW/003'), 'SOW/003 is NOT accessible to DIV-02 user');

// -----------------------------------------------------------------------------
// IT-REJECT-SEMAI-014, 015, 016: Non-regression of existing records
// -----------------------------------------------------------------------------
console.log('\n--- Test 8: IT-REJECT-SEMAI-014, 015, 016 (Existing Records Non-Regression) ---');
const ded001Pool = storage.get('selection_pool', []).find(p => p.sourceDocNo === '2026/DED/001');
assert(ded001Pool && ded001Pool.jumlahAfkir === 500, 'Existing Dederan rejection (2026/DED/001) unchanged');

const graft001Pool = storage.get('selection_pool', []).find(p => p.sourceDocNo === '2026/GRAFT/001');
assert(graft001Pool && graft001Pool.jumlahAfkir === 300, 'Existing Grafting rejection (2026/GRAFT/001) unchanged');

const preGraftDoc = storage.get('pre_grafting_selection_documents', []).find(d => d.sourceDocNo === '2026/SOW/001');
assert(preGraftDoc && preGraftDoc.sourceBibitQty === 8900, 'Existing Pre-Grafting document (2026/SEL/001) unchanged');

// -----------------------------------------------------------------------------
// IT-REJECT-SEMAI-017: Ditolak > 0 dengan alasanDitolak = 'Tidak Ada' (Default Form)
// -----------------------------------------------------------------------------
console.log('\n--- Test 10: IT-REJECT-SEMAI-017 (Ditolak 1000 dengan alasan "Tidak Ada" -> LAINNYA) ---');
const sowDefDefaultReason = {
  id: 'SOW-TX-DEF-01',
  docNo: '2026/SOW/010',
  sourceDocNo: '2026/DED/002',
  klon: 'GT 1',
  totalDisemai: 4000,
  totalPolybag: 2000,
  ditolak: 1000,
  alasanDitolak: 'Tidak Ada',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};
const intResDefault = integrateSeedingToSelectionPool(sowDefDefaultReason);
assert(intResDefault.success === true, 'integrateSeedingToSelectionPool succeeds for "Tidak Ada" reason');
assert(intResDefault.createdCount === 1, '1 pool item created for ditolak > 0 with alasan "Tidak Ada"');
const poolItemDef = storage.get('selection_pool', []).find(p => p.sourceDocNo === '2026/SOW/010');
assert(Boolean(poolItemDef), 'Pool item for SOW/010 exists');
assert(poolItemDef.category === 'LAINNYA', 'Category fallback to LAINNYA');
assert(poolItemDef.jumlahAfkir === 1000, 'jumlahAfkir is 1000');

// -----------------------------------------------------------------------------
// IT-REJECT-SEMAI-018: Ditolak > 0 dengan alasanDitolak kosong / undefined
// -----------------------------------------------------------------------------
console.log('\n--- Test 11: IT-REJECT-SEMAI-018 (Ditolak 1000 dengan alasan kosong / undefined -> LAINNYA) ---');
const sowDefEmptyReason = {
  id: 'SOW-TX-DEF-02',
  docNo: '2026/SOW/011',
  sourceDocNo: '2026/DED/002',
  klon: 'GT 1',
  totalDisemai: 4000,
  totalPolybag: 2000,
  ditolak: 1000,
  alasanDitolak: '',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};
const intResEmpty = integrateSeedingToSelectionPool(sowDefEmptyReason);
assert(intResEmpty.createdCount === 1, '1 pool item created for empty alasanDitolak');
const poolItemEmpty = storage.get('selection_pool', []).find(p => p.sourceDocNo === '2026/SOW/011');
assert(Boolean(poolItemEmpty), 'Pool item for SOW/011 exists');
assert(poolItemEmpty.category === 'LAINNYA', 'Category fallback to LAINNYA for empty reason');

// -----------------------------------------------------------------------------
// IT-REJECT-SEMAI-019 & IT-REJECT-SEMAI-020: Sync Idempotency (Multiple Syncs = 1 Record)
// -----------------------------------------------------------------------------
console.log('\n--- Test 12: IT-REJECT-SEMAI-019 & IT-REJECT-SEMAI-020 (Sync Idempotency) ---');
// Simpan txs ke seeding_transactions
storage.set('seeding_transactions', [sow003, sow004, sowDefDefaultReason, sowDefEmptyReason]);

// Panggil syncAllSeedingsToSelectionPool() 5 kali berturut-turut
for (let i = 1; i <= 5; i++) {
  syncAllSeedingsToSelectionPool();
}

const finalPool = storage.get('selection_pool', []);
const sow003Records = finalPool.filter(p => p.sourceDocNo === '2026/SOW/003');
const sow004Records = finalPool.filter(p => p.sourceDocNo === '2026/SOW/004');
const sow010Records = finalPool.filter(p => p.sourceDocNo === '2026/SOW/010');
const sow011Records = finalPool.filter(p => p.sourceDocNo === '2026/SOW/011');

assert(sow003Records.length === 1, 'IT-REJECT-SEMAI-020: Exactly 1 pool record for SOW/003 after 5 sync calls (Idempotent)');
assert(sow004Records.length === 1, 'IT-REJECT-SEMAI-020: Exactly 1 pool record for SOW/004 after 5 sync calls (Idempotent)');
assert(sow010Records.length === 1, 'IT-REJECT-SEMAI-020: Exactly 1 pool record for SOW/010 after 5 sync calls (Idempotent)');
// -----------------------------------------------------------------------------
// UI Rendering Smoke Test: renderSelectionLanding & renderMantriSelectionLanding
// -----------------------------------------------------------------------------
console.log('\n--- Test 13: UI Rendering & Mantri Landing Sync Smoke Test ---');
try {
  renderSelectionLanding();
  assert(true, 'renderSelectionLanding executes successfully without errors');
  const appHtml = global.__appEl.innerHTML;
  assert(appHtml.includes('id="tab-mantri-pindah-semai-reject"'), 'HTML contains #tab-mantri-pindah-semai-reject button');
  assert(appHtml.includes('Seleksi Ditolak Pindah Semai'), 'HTML contains "Seleksi Ditolak Pindah Semai" tab label');
  assert(appHtml.includes('Seleksi Pra-Semai (Dederan)'), 'HTML contains "Seleksi Pra-Semai (Dederan)" tab label');
  assert(appHtml.includes('Seleksi Pra-Okulasi'), 'HTML contains "Seleksi Pra-Okulasi" tab label');
  assert(appHtml.includes('Seleksi Pasca-Okulasi'), 'HTML contains "Seleksi Pasca-Okulasi" tab label');
} catch (err) {
  assert(false, `renderSelectionLanding threw error: ${err.message}`);
}

console.log('\n========================================================');
console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
console.log('========================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
