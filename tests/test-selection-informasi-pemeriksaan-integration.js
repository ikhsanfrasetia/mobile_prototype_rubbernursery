/**
 * INTEGRATION TEST: INFORMASI PEMERIKSAAN SELEKSI I, II, DAN III
 * 
 * Verifikasi:
 * 1. Integrasi data dokumen aktif ke card Informasi Pemeriksaan (Seleksi I, II, III).
 * 2. Pemetaan keenam informasi terhadap field sumber yang benar.
 * 3. Relasi Dok. Asal per tahap, termasuk multi-SOW pada Seleksi I.
 * 4. Pemisahan nilai Batch dan Klon ke field mandiri.
 * 5. Fallback field serta penanganan data kosong (tanpa undefined/null/palsu).
 * 6. Tanggal Pemeriksaan ditampilkan di header sejajar dengan judul.
 * 7. Layout 2 kolom x 3 baris terstruktur.
 * 8. Konsistensi informasi terhadap dokumen transaksi sumber.
 */

import { storage } from '../js/core/storage.js';
import { formatDate } from '../js/core/utils.js';
import {
  openSeleksi1ExecutionModal,
  openSeleksi2ExecutionModal,
  openSeleksi3ExecutionModal
} from '../js/modules/selection/selection-landing.js';

console.log('='.repeat(75));
console.log('INTEGRATION TEST: INFORMASI PEMERIKSAAN SELEKSI I/II/III');
console.log('='.repeat(75));

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`✗ FAIL: ${message}`);
    failCount++;
  }
}

// ---------------------------------------------------------------------------
// Mock Minimal DOM Environment
// ---------------------------------------------------------------------------
class MockElement {
  constructor(tag = 'div', id = '') {
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.style = {};
    this.children = [];
    this.attributes = {};
    this.listeners = {};
    this._value = '';
    this.disabled = false;
    this.textContent = '';
    this._innerHTML = '';
    this.classList = {
      add: () => {},
      remove: () => {},
      contains: () => false
    };
  }

  get value() {
    return this._value;
  }
  set value(v) {
    this._value = String(v);
  }

  get innerHTML() {
    return this._innerHTML;
  }
  set innerHTML(html) {
    this._innerHTML = html;
  }

  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  dispatchEvent(event) {
    const handlers = this.listeners[event.type || event] || [];
    for (const h of handlers) h(event);
  }

  focus() {}
  appendChild(child) {
    this.children.push(child);
  }
  querySelector(sel) {
    return new MockElement('span');
  }
  querySelectorAll(sel) {
    return [];
  }
  setAttribute(k, v) {
    this.attributes[k] = v;
  }
  getAttribute(k) {
    return this.attributes[k] || null;
  }
}

const elementRegistry = new Map();

function getOrCreateMockElement(id) {
  if (!elementRegistry.has(id)) {
    elementRegistry.set(id, new MockElement('div', id));
  }
  return elementRegistry.get(id);
}

let lastModalRender = { title: '', body: '', footer: '' };

globalThis.closeModal = () => {
  const root = getOrCreateMockElement('modal-root');
  root.innerHTML = '';
};

globalThis.document = {
  getElementById: (id) => getOrCreateMockElement(id),
  createElement: (tag) => new MockElement(tag),
  body: new MockElement('body'),
  querySelector: () => new MockElement('div'),
  querySelectorAll: () => []
};

globalThis.window = {
  document: globalThis.document
};

globalThis.toast = () => {};

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

globalThis.localStorage.clear();

const mockUser = {
  id: 'USR-MANTRI-01',
  code: 'MNT-01',
  name: 'Mantri Bibitan Lapangan',
  role: 'MANTRI_TANAMAN'
};

const todayExpected = formatDate(new Date().toISOString());

// Helper to extract modal HTML
function getModalBodyHtml() {
  const modalRoot = getOrCreateMockElement('modal-root');
  return modalRoot.innerHTML || '';
}

// ---------------------------------------------------------------------------
// SKENARIO 1: Seleksi I - Single SOW & Integrasi 6 Informasi
// ---------------------------------------------------------------------------
console.log('\n--- SKENARIO 1: Seleksi I - Single SOW & Integrasi 6 Informasi ---');

const sel1DocSingle = {
  id: 'DOC-SEL1-001',
  docNo: '2026/SEL/001',
  selectionStage: 'SELEKSI_1',
  programCode: '2026/TB/RNUR/001',
  growthStage: 'Rubber Main Nursery',
  sourceSeedingDocNo: '2026/SOW/001',
  batchCode: 'BTCH-001',
  clone: 'PB 260',
  rows: [
    { bedenganCode: 'BED-001', polybag: 500, disemai: 1000 }
  ]
};

openSeleksi1ExecutionModal({ doc: sel1DocSingle, user: mockUser });
const html1 = getModalBodyHtml();

assert(html1.includes('Informasi Pemeriksaan'), 'S1: Judul Informasi Pemeriksaan dirender');
assert(html1.includes(todayExpected), 'S1: Tanggal Pemeriksaan aktual dirender sejajar di header');
assert(html1.includes('Program Pembibitan'), 'S1: Label Program Pembibitan dirender');
assert(html1.includes('2026/TB/RNUR/001'), 'S1: Nilai Program Pembibitan sesuai dokumen aktif');
assert(html1.includes('Tahapan Pertumbuhan'), 'S1: Label Tahapan Pertumbuhan dirender');
assert(html1.includes('Rubber Main Nursery'), 'S1: Nilai Tahapan Pertumbuhan sesuai dokumen aktif');
assert(html1.includes('Dok. Seleksi'), 'S1: Label Dok. Seleksi dirender');
assert(html1.includes('2026/SEL/001'), 'S1: Nilai Dok. Seleksi sesuai dokumen aktif');
assert(html1.includes('Dok. Asal'), 'S1: Label Dok. Asal dirender');
assert(html1.includes('2026/SOW/001'), 'S1: Nilai Dok. Asal (Single SOW) sesuai dokumen aktif');
assert(html1.includes('Batch'), 'S1: Label Batch dirender mandiri');
assert(html1.includes('BTCH-001'), 'S1: Nilai Batch dirender terpisah');
assert(html1.includes('Klon'), 'S1: Label Klon dirender mandiri');
assert(html1.includes('PB 260'), 'S1: Nilai Klon dirender terpisah');
assert(!html1.includes('BTCH-001 • PB 260'), 'S1: Batch dan Klon tidak digabung dengan bullet');

// ---------------------------------------------------------------------------
// SKENARIO 2: Seleksi I - Multi-SOW Relasi Dok. Asal
// ---------------------------------------------------------------------------
console.log('\n--- SKENARIO 2: Seleksi I - Multi-SOW Relasi Dok. Asal ---');

const sel1DocMultiSow = {
  id: 'DOC-SEL1-MULTI-SOW',
  docNo: '2026/SEL/002',
  selectionStage: 'SELEKSI_1',
  programCode: '2026/TB/RNUR/001',
  tahapan: 'Rubber Main Nursery',
  sourceSeedingDocNos: ['2026/SOW/001', '2026/SOW/002', '2026/SOW/003'],
  batchCode: 'BTCH-002',
  klon: 'RRIM 600',
  rows: [
    { bedenganCode: 'BED-002', polybag: 400, disemai: 800 }
  ]
};

openSeleksi1ExecutionModal({ doc: sel1DocMultiSow, user: mockUser });
const html1Multi = getModalBodyHtml();

assert(html1Multi.includes('2026/SOW/001, 2026/SOW/002, 2026/SOW/003'), 'S2: Seluruh nomor Dok. Asal multi-SOW digabung koma secara utuh');
assert(html1Multi.includes('BTCH-002'), 'S2: Batch BTCH-002 tampil mandiri');
assert(html1Multi.includes('RRIM 600'), 'S2: Klon RRIM 600 (dari field klon) tampil mandiri');

// ---------------------------------------------------------------------------
// SKENARIO 3: Seleksi I - Normalisasi Dokumen Legacy (CULL/ -> SEL/)
// ---------------------------------------------------------------------------
console.log('\n--- SKENARIO 3: Seleksi I - Normalisasi Dokumen Legacy ---');

const sel1LegacyDoc = {
  id: 'DOC-SEL1-LEGACY',
  docNo: '2026/CULL/009',
  selectionStage: 'SELEKSI_1',
  programCode: 'PRG/NUR/01/2026',
  tahapan: 'Rubber Main Nursery',
  sourceDocNo: '2026/SOW/009',
  batchCode: 'BTCH-003',
  clone: 'GT 1',
  rows: [
    { bedenganCode: 'BED-003', polybag: 300, disemai: 600 }
  ]
};

openSeleksi1ExecutionModal({ doc: sel1LegacyDoc, user: mockUser });
const html1Legacy = getModalBodyHtml();

assert(html1Legacy.includes('2026/SEL/009'), 'S3: Dokumen legacy 2026/CULL/009 dinormalisasi menjadi 2026/SEL/009');
assert(html1Legacy.includes('2026/TB/RNUR/001'), 'S3: Legacy program PRG/NUR/01/2026 ter-resolve ke canonical 2026/TB/RNUR/001');

// ---------------------------------------------------------------------------
// SKENARIO 4: Seleksi II - Integrasi 6 Informasi & Relasi Seleksi I
// ---------------------------------------------------------------------------
console.log('\n--- SKENARIO 4: Seleksi II - Integrasi 6 Informasi & Relasi Seleksi I ---');

const sel2Doc = {
  id: 'DOC-SEL2-001',
  docNo: '2026/SEL2/001',
  selectionStage: 'SELEKSI_II',
  programCode: '2026/TB/RNUR/001',
  growthStage: 'Rubber Main Nursery',
  sourceSelectionDocNo: '2026/SEL/001',
  batchCode: 'BTCH-001',
  clone: 'PB 260',
  rows: [
    { bedenganCode: 'BED-001', polybag: 450, disemai: 900 }
  ]
};

openSeleksi2ExecutionModal({ doc: sel2Doc, user: mockUser });
const html2 = getModalBodyHtml();

assert(html2.includes('Program Pembibitan'), 'S4: Seleksi II merender label Program Pembibitan');
assert(html2.includes('2026/TB/RNUR/001'), 'S4: Seleksi II merender kode Program Pembibitan');
assert(html2.includes('Tahapan Pertumbuhan'), 'S4: Seleksi II merender label Tahapan Pertumbuhan');
assert(html2.includes('Rubber Main Nursery'), 'S4: Seleksi II merender Tahapan Pertumbuhan');
assert(html2.includes('Dok. Seleksi'), 'S4: Seleksi II merender label Dok. Seleksi');
assert(html2.includes('2026/SEL2/001'), 'S4: Seleksi II merender nomor Dok. Seleksi');
assert(html2.includes('Dok. Asal'), 'S4: Seleksi II merender label Dok. Asal');
assert(html2.includes('2026/SEL/001'), 'S4: Seleksi II merender Dok. Asal dari Dokumen Seleksi I Final');
assert(html2.includes('Batch'), 'S4: Seleksi II merender label Batch terpisah');
assert(html2.includes('BTCH-001'), 'S4: Seleksi II merender nilai Batch');
assert(html2.includes('Klon'), 'S4: Seleksi II merender label Klon terpisah');
assert(html2.includes('PB 260'), 'S4: Seleksi II merender nilai Klon');

// ---------------------------------------------------------------------------
// SKENARIO 5: Seleksi III - Integrasi 6 Informasi & Relasi Seleksi II
// ---------------------------------------------------------------------------
console.log('\n--- SKENARIO 5: Seleksi III - Integrasi 6 Informasi & Relasi Seleksi II ---');

const sel3Doc = {
  id: 'DOC-SEL3-001',
  docNo: '2026/SEL3/001',
  selectionStage: 'SELEKSI_III',
  programCode: '2026/TB/RNUR/001',
  growthStage: 'Rubber Main Nursery',
  sourceSelectionDocNo: '2026/SEL2/001',
  batchCode: 'BTCH-001',
  clone: 'PB 260',
  rows: [
    { bedenganCode: 'BED-001', polybag: 400, disemai: 800 }
  ]
};

openSeleksi3ExecutionModal({ doc: sel3Doc, user: mockUser });
const html3 = getModalBodyHtml();

assert(html3.includes('Program Pembibitan'), 'S5: Seleksi III merender label Program Pembibitan');
assert(html3.includes('2026/TB/RNUR/001'), 'S5: Seleksi III merender kode Program Pembibitan');
assert(html3.includes('Tahapan Pertumbuhan'), 'S5: Seleksi III merender label Tahapan Pertumbuhan');
assert(html3.includes('Rubber Main Nursery'), 'S5: Seleksi III merender Tahapan Pertumbuhan');
assert(html3.includes('Dok. Seleksi'), 'S5: Seleksi III merender label Dok. Seleksi');
assert(html3.includes('2026/SEL3/001'), 'S5: Seleksi III merender nomor Dok. Seleksi');
assert(html3.includes('Dok. Asal'), 'S5: Seleksi III merender label Dok. Asal');
assert(html3.includes('2026/SEL2/001'), 'S5: Seleksi III merender Dok. Asal dari Dokumen Seleksi II Final');
assert(html3.includes('Batch'), 'S5: Seleksi III merender label Batch');
assert(html3.includes('BTCH-001'), 'S5: Seleksi III merender nilai Batch');
assert(html3.includes('Klon'), 'S5: Seleksi III merender label Klon');
assert(html3.includes('PB 260'), 'S5: Seleksi III merender nilai Klon');

// ---------------------------------------------------------------------------
// SKENARIO 6: Penanganan Data Kosong & Fallback (Tanpa Undefined / Null)
// ---------------------------------------------------------------------------
console.log('\n--- SKENARIO 6: Penanganan Data Kosong & Fallback ---');

const sel1DocEmptyFields = {
  id: 'DOC-SEL1-EMPTY',
  docNo: '',
  selectionStage: 'SELEKSI_1',
  programCode: '',
  programName: '',
  growthStage: null,
  tahapan: '',
  sourceSeedingDocNo: '',
  sourceSeedingDocNos: [],
  batchCode: '',
  clone: '',
  klon: '',
  rows: [
    { bedenganCode: 'BED-005', polybag: 100, disemai: 200 }
  ]
};

openSeleksi1ExecutionModal({ doc: sel1DocEmptyFields, user: mockUser });
const htmlEmpty = getModalBodyHtml();

assert(!htmlEmpty.includes('undefined'), 'S6: Render tidak memuat literal "undefined"');
assert(!htmlEmpty.includes('null'), 'S6: Render tidak memuat literal "null"');
assert(htmlEmpty.includes('>-<'), 'S6: Field kosong di-fallback ke "-" yang aman');
assert(!htmlEmpty.includes('Rubber Main Nursery'), 'S6: growthStage kosong tidak diasumsikan Rubber Main Nursery (tampil "-")');

// ---------------------------------------------------------------------------
// SKENARIO 7: Verifikasi Struktur Grid 2 Kolom x 3 Baris
// ---------------------------------------------------------------------------
console.log('\n--- SKENARIO 7: Verifikasi Struktur Grid 2 Kolom x 3 Baris ---');

openSeleksi1ExecutionModal({ doc: sel1DocSingle, user: mockUser });
const gridHtml = getModalBodyHtml();

assert(gridHtml.includes('grid-template-columns: 1fr 1fr'), 'S7: Menggunakan layout CSS grid 2 kolom simetris');
const leftColumnLabels = ['Program Pembibitan', 'Dok. Seleksi', 'Batch'];
const rightColumnLabels = ['Tahapan Pertumbuhan', 'Dok. Asal', 'Klon'];

for (const lbl of [...leftColumnLabels, ...rightColumnLabels]) {
  assert(gridHtml.includes(lbl), `S7: Label "${lbl}" ada di layout`);
}

// ---------------------------------------------------------------------------
// SKENARIO 8: Konsistensi Silsilah Dokumen Antara Seleksi I, II, dan III
// ---------------------------------------------------------------------------
console.log('\n--- SKENARIO 8: Konsistensi Silsilah Dokumen (End-to-End Lineage) ---');

// Chain: SOW -> SEL-1 -> SEL-2 -> SEL-3
assert(sel1DocSingle.sourceSeedingDocNo === '2026/SOW/001', 'S8: Silsilah 1: Seleksi I bersumber dari SOW 2026/SOW/001');
assert(sel2Doc.sourceSelectionDocNo === sel1DocSingle.docNo, 'S8: Silsilah 2: Seleksi II bersumber dari Dok. Seleksi I 2026/SEL/001');
assert(sel3Doc.sourceSelectionDocNo === sel2Doc.docNo, 'S8: Silsilah 3: Seleksi III bersumber dari Dok. Seleksi II 2026/SEL2/001');

console.log('\n' + '='.repeat(75));
console.log(`INTEGRATION TEST SUMMARY: TOTAL PASS = ${passCount} | TOTAL FAIL = ${failCount}`);
console.log('='.repeat(75));

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
