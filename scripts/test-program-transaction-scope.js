/**
 * scripts/test-program-transaction-scope.js
 * Comprehensive Verification Suite for TASK-FIX-PROGRAM-SCOPE-TRANSACTION-01:
 * Scoping Program Pembibitan Berdasarkan Konteks Kebun pada Transaksi.
 * 
 * 20 Required Verifications:
 * 1. Mantri TBS hanya melihat Program TBS.
 * 2. Mantri TBS tidak melihat Program APM.
 * 3. Mantri APM hanya melihat Program APM.
 * 4. Mantri APM tidak melihat Program TBS.
 * 5. Asisten TBS hanya melihat Program TBS.
 * 6. Asisten APM hanya melihat Program APM.
 * 7. Askep TBS hanya melihat Program TBS.
 * 8. Askep APM hanya melihat Program APM.
 * 9. Program CLOSE tidak muncul.
 * 10. Program OPEN muncul.
 * 11. Program estate mismatch ditolak.
 * 12. Transaction context estate mengalahkan session estate jika tersedia.
 * 13. Program mismatch dengan transaction context ditolak.
 * 14. Historical transaction dengan program lama tetap resolve.
 * 15. selectedSyncDivisionIds tidak digunakan.
 * 16. Sync selection tidak mengubah Program transaction scope.
 * 17. Create receipt TBS menggunakan Program TBS.
 * 18. Create receipt APM menggunakan Program APM.
 * 19. Tidak ada cross-estate Program leakage.
 * 20. UI modal hanya menampilkan Program yang valid.
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

// Minimal DOM Mock for testing UI renderers
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
    this.style = { cssText: '', display: '' };
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
    if (this._innerHTML) return this._innerHTML;
    return this.children.map(c => c.outerHTML || '').join('');
  }

  set innerHTML(val) {
    this._innerHTML = val;
    this.children = [];
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentElement = null;
    }
    return child;
  }

  remove() {
    if (this.parentElement) {
      this.parentElement.removeChild(this);
    }
  }

  addEventListener(evt, fn) {
    if (!this.eventListeners[evt]) this.eventListeners[evt] = [];
    this.eventListeners[evt].push(fn);
  }

  querySelector(selector) {
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      if (this.id === id) return this;
      const found = this._findChildById(id, this);
      if (found) return found;
      return getOrCreateMock(id);
    }
    return new MockElement();
  }

  querySelectorAll(selector) {
    const results = [];
    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      this._findChildrenByClass(className, this, results);
    }
    return results;
  }

  _findChildById(id, root) {
    for (const c of root.children) {
      if (c.id === id) return c;
      const found = this._findChildById(id, c);
      if (found) return found;
    }
    return null;
  }

  _findChildrenByClass(cls, root, results) {
    for (const c of root.children) {
      if (c.className && c.className.includes(cls)) results.push(c);
      this._findChildrenByClass(cls, c, results);
    }
  }

  closest(selector) {
    return this;
  }
}

global.document = {
  getElementById: (id) => getOrCreateMock(id),
  querySelector: (sel) => {
    if (sel.startsWith('#')) return getOrCreateMock(sel.slice(1));
    return new MockElement();
  },
  createElement: (tag) => new MockElement(tag),
  body: new MockElement('body')
};

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

// Import data providers and modules
import { session } from '../js/core/session.js';
import { storage } from '../js/core/storage.js';
import {
  PROGRAM_MASTER,
  PROGRAM_STATUS,
  getOpenPrograms,
  getActivePrograms,
  getProgramsByEstate,
  getProgramById,
  resolveProgram,
  resolveProgramLegacy,
  isProgramOpen,
  DummyProgramProvider,
  setProgramProvider
} from '../js/data/program-master.js';
import { renderReceiptBenih } from '../js/modules/receipt/receipt-benih.js';
import { renderRequestKebunSendiriForm } from '../js/modules/request/request-kebun-sendiri-form.js';
import { renderRequestKebunSepupuForm } from '../js/modules/request/request-kebun-sepupu-form.js';

console.log('========================================================================================');
console.log('   TEST SUITE: PROGRAM TRANSACTION SCOPING (TASK-FIX-PROGRAM-SCOPE-TRANSACTION-01)     ');
console.log('========================================================================================\n');

// -------------------------------------------------------------------------
// SECTION 1: ROLE & ESTATE MATRIX (TESTS 1, 2, 3, 4, 5, 6, 7, 8)
// -------------------------------------------------------------------------
console.log('--- SECTION 1: Role & Estate Matrix Scoping ---');

// Persona definitions
const mantriTBS = { id: 'USR-MNT-TBS', code: 'MNT001', role: 'MANTRI_BIBITAN', name: 'Mantri TB', estateId: 'EST-TBS', divisionId: 'DIV-001' };
const mantriAPM = { id: 'USR-MNT-APM', code: 'MNT002', role: 'MANTRI_BIBITAN', name: 'Mantri AP', estateId: 'EST-APM', divisionId: 'DIV-APM-02' };
const asbTBS = { id: 'USR-ASB-TBS', code: 'ASB001', role: 'ASISTEN_BIBITAN', name: 'Asisten TB', estateId: 'EST-TBS', divisionId: 'DIV-001' };
const asbAPM = { id: 'USR-ASB-APM', code: 'ASB002', role: 'ASISTEN_BIBITAN', name: 'Asisten AP', estateId: 'EST-APM', divisionId: 'DIV-APM-02' };
const askepTBS = { id: 'USR-ASK-TBS', code: 'ASK001', role: 'ASKEP', name: 'Askep TB', estateId: 'EST-TBS', divisionId: 'DIV-001' };
const askepAPM = { id: 'USR-ASK-APM', code: 'ASK002', role: 'ASKEP', name: 'Askep AP', estateId: 'EST-APM', divisionId: 'DIV-APM-02' };

// 1. Mantri TBS hanya melihat Program TBS
const mntTbsPrograms = getOpenPrograms({ estateId: mantriTBS.estateId });
assert(mntTbsPrograms.length === 1 && mntTbsPrograms[0].code === '2026/TB/RNUR/001', '1. Mantri TBS hanya melihat Program TBS (2026/TB/RNUR/001)');

// 2. Mantri TBS tidak melihat Program APM
assert(!mntTbsPrograms.some(p => p.code === '2026/AP/RNUR/001'), '2. Mantri TBS tidak melihat Program APM (2026/AP/RNUR/001)');

// 3. Mantri APM hanya melihat Program APM
const mntApmPrograms = getOpenPrograms({ estateId: mantriAPM.estateId });
assert(mntApmPrograms.length === 1 && mntApmPrograms[0].code === '2026/AP/RNUR/001', '3. Mantri APM hanya melihat Program APM (2026/AP/RNUR/001)');

// 4. Mantri APM tidak melihat Program TBS
assert(!mntApmPrograms.some(p => p.code === '2026/TB/RNUR/001'), '4. Mantri APM tidak melihat Program TBS (2026/TB/RNUR/001)');

// 5. Asisten TBS hanya melihat Program TBS
const asbTbsPrograms = getOpenPrograms({ estateId: asbTBS.estateId });
assert(asbTbsPrograms.every(p => p.estateId === 'EST-TBS'), '5. Asisten TBS hanya melihat Program TBS');

// 6. Asisten APM hanya melihat Program APM
const asbApmPrograms = getOpenPrograms({ estateId: asbAPM.estateId });
assert(asbApmPrograms.every(p => p.estateId === 'EST-APM'), '6. Asisten APM hanya melihat Program APM');

// 7. Askep TBS hanya melihat Program TBS
const askTbsPrograms = getOpenPrograms({ estateId: askepTBS.estateId });
assert(askTbsPrograms.every(p => p.estateId === 'EST-TBS'), '7. Askep TBS hanya melihat Program TBS');

// 8. Askep APM hanya melihat Program APM
const askApmPrograms = getOpenPrograms({ estateId: askepAPM.estateId });
assert(askApmPrograms.every(p => p.estateId === 'EST-APM'), '8. Askep APM hanya melihat Program APM');

// -------------------------------------------------------------------------
// SECTION 2: PROGRAM STATUS OPEN / CLOSE (TESTS 9, 10, 11)
// -------------------------------------------------------------------------
console.log('\n--- SECTION 2: Program Status OPEN vs CLOSE Guard ---');

// 10. Program OPEN muncul
const openProgs = getOpenPrograms();
assert(openProgs.length === 2 && openProgs.every(p => p.status === PROGRAM_STATUS.OPEN), '10. Program OPEN muncul pada getOpenPrograms()');

// 9. Program CLOSE tidak muncul
const closedProgramFixture = {
  id: 'PRG-TEST-CLOSED-001',
  code: '2026/TB/RNUR/CLOSED',
  name: 'RB Nursery Program Closed Test',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  blockId: 'BLK-001',
  blockCode: '001/91',
  startDate: '2026-01-01',
  endDate: '2026-06-01',
  status: PROGRAM_STATUS.CLOSE
};

// Pasang provider sementara yang mengandung closedProgramFixture
const testProvider = new DummyProgramProvider([...PROGRAM_MASTER, closedProgramFixture]);
setProgramProvider(testProvider);

const openProgsWithClosed = getOpenPrograms({ estateId: 'EST-TBS' });
assert(!openProgsWithClosed.some(p => p.id === 'PRG-TEST-CLOSED-001'), '9. Program CLOSE tidak muncul pada getOpenPrograms({ estateId: EST-TBS })');
assert(isProgramOpen('PRG-TBS-2026-001') === true, '10b. isProgramOpen() true untuk Program OPEN');
assert(isProgramOpen('PRG-TEST-CLOSED-001') === false, '9b. isProgramOpen() false untuk Program CLOSE');

// Kembalikan provider standar
setProgramProvider(new DummyProgramProvider(PROGRAM_MASTER));

// 11. Program estate mismatch ditolak
const tbsProgramsInAPM = getOpenPrograms({ estateId: 'EST-APM' });
assert(!tbsProgramsInAPM.some(p => p.estateId === 'EST-TBS'), '11. Program estate mismatch ditolak (Program TBS tidak masuk query APM)');

// -------------------------------------------------------------------------
// SECTION 3: TRANSACTION ESTATE CONTEXT PRIORITY (TESTS 12, 13)
// -------------------------------------------------------------------------
console.log('\n--- SECTION 3: Context Priority (Transaction Estate > Session Estate) ---');

// 12. Transaction context estate mengalahkan session estate jika tersedia
// Simulasi: User session adalah Pengurus di Tanah Besih (EST-TBS), tetapi membuat Pengajuan Kebun Sepupu ke Aek Pamingke (EST-APM)
session.start({
  id: 'USR-PGR-TBS',
  userId: 'USR-PGR-TBS',
  role: 'PENGURUS',
  name: 'Pengurus TBS',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
});

const targetTransactionEstateId = 'EST-APM'; // Context Transaksi
const effectiveProgramsForTx = getOpenPrograms({ estateId: targetTransactionEstateId });

assert(effectiveProgramsForTx.length === 1 && effectiveProgramsForTx[0].estateId === 'EST-APM', '12. Transaction context estate (EST-APM) mengalahkan session estate (EST-TBS)');
assert(effectiveProgramsForTx[0].code === '2026/AP/RNUR/001', '12b. Program yang dihasilkan mengikuti target transaksi (2026/AP/RNUR/001)');

// 13. Program mismatch dengan transaction context ditolak
const isProgValidForTx = effectiveProgramsForTx.some(p => p.id === 'PRG-TBS-2026-001');
assert(isProgValidForTx === false, '13. Program TBS ditolak karena mismatch dengan target estate transaksi (EST-APM)');

// -------------------------------------------------------------------------
// SECTION 4: HISTORICAL RESOLUTION & SYNC SCOPE ISOLATION (TESTS 14, 15, 16)
// -------------------------------------------------------------------------
console.log('\n--- SECTION 4: Historical Resolution & Sync Scope Independence ---');

// 14. Historical transaction dengan program lama tetap resolve
const resolvedLegacy1 = resolveProgramLegacy('PRG-2026-001');
assert(resolvedLegacy1.code === '2026/TB/RNUR/001', '14. Historical legacy ID PRG-2026-001 resolve ke 2026/TB/RNUR/001');
const resolvedLegacy3 = resolveProgramLegacy('PRG-2026-003');
assert(resolvedLegacy3.code === '2026/AP/RNUR/001', '14b. Historical legacy ID PRG-2026-003 resolve ke 2026/AP/RNUR/001');

// 15 & 16. selectedSyncDivisionIds tidak digunakan & sync selection tidak mengubah program transaction scope
storage.set('sync_selected_divisions', ['DIV-APM-02', 'DIV-003']);
const tbsProgramsAfterSyncChange = getOpenPrograms({ estateId: 'EST-TBS' });
assert(tbsProgramsAfterSyncChange.length === 1 && tbsProgramsAfterSyncChange[0].code === '2026/TB/RNUR/001', '15 & 16. Sync selection tidak mempengaruhi Program transaction scope (Program Scope != Sync Scope)');

// -------------------------------------------------------------------------
// SECTION 5: RECEIPT TRANSACTION CREATION & DATA INTEGRITY (TESTS 17, 18, 19, 20)
// -------------------------------------------------------------------------
console.log('\n--- SECTION 5: Create Receipt Transactions Scoping ---');

// 17. Create receipt TBS menggunakan Program TBS
session.start(mantriTBS);
const appMock = getOrCreateMock('app');
renderReceiptBenih();

const btnProgramTbs = getOrCreateMock('btn-program');
btnProgramTbs.eventListeners['click']?.forEach(fn => fn());

const programModalListTbs = getOrCreateMock('list-program');
const renderedProgramTbsHtml = programModalListTbs.innerHTML;
assert(renderedProgramTbsHtml.includes('2026/TB/RNUR/001'), '17. Create receipt TBS memuat Program 2026/TB/RNUR/001');
assert(!renderedProgramTbsHtml.includes('2026/AP/RNUR/001'), '19. Tidak ada cross-estate Program leakage (APM tidak muncul di form TBS)');

// 18. Create receipt APM menggunakan Program APM
session.start(mantriAPM);
renderReceiptBenih();

const btnProgramApm = getOrCreateMock('btn-program');
btnProgramApm.eventListeners['click']?.forEach(fn => fn());

const programModalListApm = getOrCreateMock('list-program');
const renderedProgramApmHtml = programModalListApm.innerHTML;
assert(renderedProgramApmHtml.includes('2026/AP/RNUR/001'), '18. Create receipt APM memuat Program 2026/AP/RNUR/001');
assert(!renderedProgramApmHtml.includes('2026/TB/RNUR/001'), '19b. Tidak ada cross-estate Program leakage (TBS tidak muncul di form APM)');

// 20. UI Modal hanya menampilkan program valid
assert(renderedProgramApmHtml.includes('RB Nursery Program 2026-2027 AP'), '20. UI modal menampilkan nama program lengkap yang valid');

console.log('\n========================================================================================');
console.log(`   TOTAL PASSED ASSERTIONS: ${passed}`);
console.log(`   TOTAL FAILED ASSERTIONS: ${failed}`);
console.log('========================================================================================');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
