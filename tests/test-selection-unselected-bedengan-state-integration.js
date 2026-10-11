/**
 * INTEGRATION TEST: RESET STATE BEDENGAN DAN KALKULATOR SELEKSI I/II/III
 * 
 * Verifikasi 8 Skenario:
 * 1. Modal dibuka ketika batch memiliki satu bedengan (tidak auto-selected).
 * 2. Modal dibuka ketika batch memiliki beberapa bedengan (tidak auto-selected).
 * 3. Kondisi awal tanpa pilihan bedengan (Sisa polybag: —, Populasi: —, petunjuk kalkulator & ringkasan, input disabled).
 * 4. Memilih bedengan dan memuat data yang benar (sinkron dropdown, referensi, kalkulator, ringkasan, input enabled).
 * 5. Mengganti bedengan setelah nilai dan input terisi (reset nilai, foto, dan kalkulasi sesuai bedengan baru tanpa residu).
 * 6. Mengosongkan pilihan (reset seluruh state ke kondisi awal).
 * 7. Bedengan dengan sisa nol agar tidak tertukar dengan state belum dipilih (0 Ply vs —).
 * 8. Konsistensi dropdown, referensi, kalkulator, ringkasan, dan input di Seleksi I, II, dan III.
 */

import { storage } from '../js/core/storage.js';
import {
  handleBatchRowClick,
  openSeleksi1ExecutionModal,
  openSeleksi2ExecutionModal,
  openSeleksi3ExecutionModal
} from '../js/modules/selection/selection-landing.js';
import {
  canPerformPreGraftingSelection1,
  getBedenganScopeStatusForSeleksi1
} from '../js/modules/selection/selection-manager.js';

console.log('='.repeat(75));
console.log('INTEGRATION TEST: RESET STATE BEDENGAN & KALKULATOR SELEKSI I/II/III');
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
    this._textContent = '';
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

  get textContent() {
    return this._textContent;
  }
  set textContent(v) {
    this._textContent = String(v);
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
    const eventType = typeof event === 'string' ? event : (event.type || 'click');
    const handlers = this.listeners[eventType] || [];
    for (const h of handlers) h(typeof event === 'string' ? { type: event } : event);
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

let lastOpenedModal = null;

globalThis.openModal = (opts) => {
  lastOpenedModal = opts;
  const root = getOrCreateMockElement('modal-root');
  root.innerHTML = opts.body || '';
};

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

// Seed ASB-approved sowing transactions so canPerformPreGraftingSelection1 passes
storage.set('seeding_transactions', [
  {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchCode: 'BATCH-SINGLE-01',
    batchNo: 'BATCH-SINGLE-01',
    status: 'DISETUJUI',
    verificationStatus: 'DISETUJUI',
    totalDisemai: 2000,
    polybagCount: 1000,
    rows: [
      { bedenganCode: 'BED-001', batchCode: 'BATCH-SINGLE-01', disemai: 1000, polybag: 500 }
    ]
  }
]);

const mockUser = {
  id: 'USR-ASISTEN-01',
  code: 'AST-01',
  name: 'Asisten Afdeling Pembibitan',
  role: 'ASISTEN_AFDELING'
};

// ---------------------------------------------------------------------------
// Mock Data Helpers
// ---------------------------------------------------------------------------
function createMockDoc(stage, batchCode, bedList) {
  const totalPoly = bedList.reduce((s, b) => s + b.poly, 0);
  const totalBibit = bedList.reduce((s, b) => s + b.bibit, 0);
  return {
    id: `DOC-${stage}-${batchCode}`,
    docNo: `2026/${stage}/001`,
    selectionStage: stage,
    stage: stage,
    programCode: 'PRG-TB-2026',
    growthStage: 'Pre-Nursery',
    batchCode: batchCode,
    batchNo: batchCode,
    clone: 'PB 260',
    sourceSowDocNo: '2026/SOW/001',
    sourceDocNo: stage === 'SELEKSI_2' ? '2026/SEL-I/001' : (stage === 'SELEKSI_3' ? '2026/SEL-II/001' : '2026/SOW/001'),
    sourceSelectionDocNo: stage === 'SELEKSI_2' ? '2026/SEL-I/001' : (stage === 'SELEKSI_3' ? '2026/SEL-II/001' : null),
    sourcePolybagQty: totalPoly,
    sourceBibitQty: totalBibit,
    rows: bedList.map(b => ({
      bedenganCode: b.code,
      bedenganId: b.code,
      polybag: b.poly,
      disemai: b.bibit,
      initialPolybag: b.poly,
      remainingPolybag: b.remPoly !== undefined ? b.remPoly : b.poly,
      initialBibit: b.bibit,
      remainingBibit: b.remBibit !== undefined ? b.remBibit : b.bibit,
      inspectedPolybag: b.inspectedPoly || 0,
      inspectedBibit: b.inspectedBibit || 0
    }))
  };
}

console.log('\n--- SKENARIO 1: Modal Dibuka Ketika Batch Memiliki Satu Bedengan ---');
{
  elementRegistry.clear();
  const docSingleBed = createMockDoc('SELEKSI_1', 'BATCH-SINGLE-01', [
    { code: 'BED-001', poly: 500, bibit: 1000, remPoly: 500, remBibit: 1000 }
  ]);

  // Seed into pre_grafting_selection_documents for handleBatchRowClick lookup
  storage.set('pre_grafting_selection_documents', [docSingleBed]);

  // Invoking handleBatchRowClick for Seleksi 1 with single bedengan
  handleBatchRowClick({
    stage: 'SELEKSI_1',
    batchCode: 'BATCH-SINGLE-01',
    programCode: 'PRG-TB-2026',
    batchDocs: [docSingleBed],
    user: mockUser
  });

  const selBed = getOrCreateMockElement('modal-sel1-bedengan');
  assert(selBed.value === '', 'Skenario 1: Dropdown bedengan tidak memilih otomatis (value kosong / unselected)');
  
  const refPoly = getOrCreateMockElement('modal-sel1-ref-polybag');
  assert(refPoly.textContent.trim() === '—', 'Skenario 1: Sisa polybag menampilkan placeholder "—"');
  
  const refBibit = getOrCreateMockElement('modal-sel1-ref-bibit');
  assert(refBibit.textContent.trim() === '—', 'Skenario 1: Populasi bibit menampilkan placeholder "—"');
}

console.log('\n--- SKENARIO 2: Modal Dibuka Ketika Batch Memiliki Beberapa Bedengan ---');
{
  elementRegistry.clear();
  const docMultiBed = createMockDoc('SELEKSI_2', 'BATCH-MULTI-02', [
    { code: 'BED-001', poly: 300, bibit: 300, remPoly: 300, remBibit: 300 },
    { code: 'BED-002', poly: 400, bibit: 400, remPoly: 400, remBibit: 400 }
  ]);

  // Open modal directly without initialBedCode
  openSeleksi2ExecutionModal({ doc: docMultiBed, bedenganCode: null, user: mockUser });

  const selBed = getOrCreateMockElement('modal-sel2-bedengan');
  assert(selBed.value === '', 'Skenario 2: Modal Seleksi II dibuka dengan dropdown unselected');
  assert(selBed.innerHTML.includes('-- Pilih Bedengan Pemeriksaan --'), 'Skenario 2: Dropdown memuat opsi placeholder default');
  assert(selBed.innerHTML.includes('BED-001') && selBed.innerHTML.includes('BED-002'), 'Skenario 2: Dropdown memuat semua opsi bedengan dalam scope');
}

console.log('\n--- SKENARIO 3: Kondisi Awal Tanpa Pilihan Bedengan ---');
{
  elementRegistry.clear();
  const doc = createMockDoc('SELEKSI_1', 'BATCH-TEST-03', [
    { code: 'BED-001', poly: 500, bibit: 1000 }
  ]);
  openSeleksi1ExecutionModal({ doc, bedenganCode: null, user: mockUser });

  const refPoly = getOrCreateMockElement('modal-sel1-ref-polybag');
  const refBibit = getOrCreateMockElement('modal-sel1-ref-bibit');
  const calcInstruction = getOrCreateMockElement('modal-sel1-calc-instruction');
  const calcRemPoly = getOrCreateMockElement('modal-sel1-calc-rem-poly');
  const calcRemPolyUnit = getOrCreateMockElement('modal-sel1-calc-rem-poly-unit');
  const sumInstruction = getOrCreateMockElement('modal-sel1-summary-instruction');
  const sumRatio = getOrCreateMockElement('sum-sel1-poly-ratio');
  const sumBar = getOrCreateMockElement('sum-sel1-poly-progress-bar');
  const sumPct = getOrCreateMockElement('sum-sel1-poly-pct');
  const inputPoly = getOrCreateMockElement('modal-sel1-polybag-inspected');
  const inputBibit = getOrCreateMockElement('modal-sel1-bibit-selected');
  const inputAlasan = getOrCreateMockElement('modal-sel1-alasan');
  const saveBtn = getOrCreateMockElement('btn-modal-save-sel1');

  assert(refPoly.textContent.trim() === '—', 'Skenario 3: Sisa polybag adalah "—"');
  assert(refBibit.textContent.trim() === '—', 'Skenario 3: Populasi bibit adalah "—"');
  assert(calcInstruction.textContent.includes('Pilih bedengan pemeriksaan terlebih dahulu'), 'Skenario 3: Petunjuk kalkulator tampil');
  assert(calcRemPoly.textContent.trim() === '—', 'Skenario 3: Angka kalkulator sisa polybag menggunakan "—"');
  assert(calcRemPolyUnit.style.display === 'none', 'Skenario 3: Satuan kalkulator (Ply) tersembunyi');
  assert(sumInstruction.textContent.includes('Pilih bedengan pemeriksaan'), 'Skenario 3: Petunjuk ringkasan tampil');
  assert(sumRatio.textContent.trim() === '—', 'Skenario 3: Ringkasan rasio polybag adalah "—"');
  assert(sumBar.style.width === '0%', 'Skenario 3: Progress bar ringkasan bernilai 0%');
  assert(sumPct.textContent.trim() === '—', 'Skenario 3: Persentase progress adalah "—" (tidak misleading)');
  assert(inputPoly.disabled === true, 'Skenario 3: Input polybag diperiksa disabled');
  assert(inputBibit.disabled === true, 'Skenario 3: Input bibit afkir disabled');
  assert(inputAlasan.disabled === true, 'Skenario 3: Input alasan afkir disabled');
  assert(saveBtn.disabled === true, 'Skenario 3: Tombol simpan disabled');
}

console.log('\n--- SKENARIO 4: Memilih Bedengan dan Memuat Data yang Benar ---');
{
  elementRegistry.clear();
  const doc = createMockDoc('SELEKSI_1', 'BATCH-TEST-04', [
    { code: 'BED-001', poly: 500, bibit: 1000 }
  ]);
  openSeleksi1ExecutionModal({ doc, bedenganCode: null, user: mockUser });

  const selBed = getOrCreateMockElement('modal-sel1-bedengan');
  selBed.value = 'BED-001';
  selBed.dispatchEvent('change');

  const refPoly = getOrCreateMockElement('modal-sel1-ref-polybag');
  const refBibit = getOrCreateMockElement('modal-sel1-ref-bibit');
  const calcRemPoly = getOrCreateMockElement('modal-sel1-calc-rem-poly');
  const calcRemPolyUnit = getOrCreateMockElement('modal-sel1-calc-rem-poly-unit');
  const sumRatio = getOrCreateMockElement('sum-sel1-poly-ratio');
  const inputPoly = getOrCreateMockElement('modal-sel1-polybag-inspected');
  const inputBibit = getOrCreateMockElement('modal-sel1-bibit-selected');

  assert(selBed.value === 'BED-001', 'Skenario 4: Nilai dropdown tersinkron dengan state bedengan terpilih');
  assert(refPoly.textContent.includes('500 Ply'), 'Skenario 4: Referensi sisa polybag dimuat dengan benar (500 Ply)');
  assert(refBibit.textContent.includes('1.000 Pkk') || refBibit.textContent.includes('1000 Pkk'), 'Skenario 4: Referensi populasi bibit dimuat dengan benar (1.000 Pkk)');
  assert(calcRemPolyUnit.style.display === 'inline', 'Skenario 4: Satuan kalkulator ditampilkan (inline)');
  assert(calcRemPoly.textContent.includes('500'), 'Skenario 4: Kalkulator menghitung sisa polybag aktual (500)');
  assert(sumRatio.textContent.includes('500 Ply'), 'Skenario 4: Ringkasan menampilkan denominator total bedengan terpilih (500 Ply)');
  assert(inputPoly.disabled === false, 'Skenario 4: Input polybag menjadi aktif');
  assert(inputBibit.disabled === false, 'Skenario 4: Input bibit afkir menjadi aktif');

  // Test real-time calculation
  inputPoly.value = '100';
  inputPoly.dispatchEvent('input');
  assert(calcRemPoly.textContent.includes('400'), 'Skenario 4: Perkiraan hasil sisa polybag terupdate real-time (500 - 100 = 400)');
}

console.log('\n--- SKENARIO 5: Mengganti Bedengan Setelah Nilai dan Input Terisi ---');
{
  elementRegistry.clear();
  const doc = createMockDoc('SELEKSI_2', 'BATCH-TEST-05', [
    { code: 'BED-001', poly: 300, bibit: 300 },
    { code: 'BED-002', poly: 700, bibit: 700 }
  ]);
  openSeleksi2ExecutionModal({ doc, bedenganCode: null, user: mockUser });

  const selBed = getOrCreateMockElement('modal-sel2-bedengan');
  const inputPoly = getOrCreateMockElement('modal-sel2-polybag-inspected');
  const inputBibit = getOrCreateMockElement('modal-sel2-bibit-selected');
  const selAlasan = getOrCreateMockElement('modal-sel2-alasan');

  // Pilih Bed-001 dan isi data
  selBed.value = 'BED-001';
  selBed.dispatchEvent('change');
  inputPoly.value = '50';
  inputBibit.value = '5';
  inputBibit.dispatchEvent('input');
  selAlasan.value = 'Kerdil';
  selAlasan.dispatchEvent('change');

  // Ganti pilihan ke Bed-002
  selBed.value = 'BED-002';
  selBed.dispatchEvent('change');

  const refPoly = getOrCreateMockElement('modal-sel2-ref-polybag');
  const calcRemPoly = getOrCreateMockElement('modal-sel2-calc-rem-poly');
  const sumRatio = getOrCreateMockElement('sum-sel2-poly-ratio');

  assert(inputPoly.value === '', 'Skenario 5: Input polybag dikosongkan saat berganti bedengan');
  assert(inputBibit.value === '', 'Skenario 5: Input bibit afkir dikosongkan saat berganti bedengan');
  assert(selAlasan.value === '', 'Skenario 5: Input alasan dikosongkan saat berganti bedengan');
  assert(selAlasan.disabled === true, 'Skenario 5: Input alasan kembali disabled karena belum ada bibit afkir');
  assert(refPoly.textContent.includes('700 Ply'), 'Skenario 5: Referensi memuat data Bedengan B (700 Ply)');
  assert(calcRemPoly.textContent.includes('700'), 'Skenario 5: Kalkulator menampilkan sisa Bedengan B tanpa residu Bedengan A');
  assert(sumRatio.textContent.includes('700 Ply'), 'Skenario 5: Ringkasan mengacu pada kapasitas Bedengan B (700 Ply)');
}

console.log('\n--- SKENARIO 6: Mengosongkan Pilihan (Reset Total ke State Awal) ---');
{
  elementRegistry.clear();
  const doc = createMockDoc('SELEKSI_3', 'BATCH-TEST-06', [
    { code: 'BED-001', poly: 400, bibit: 400 }
  ]);
  openSeleksi3ExecutionModal({ doc, bedenganCode: null, user: mockUser });

  const selBed = getOrCreateMockElement('modal-sel3-bedengan');
  const inputPoly = getOrCreateMockElement('modal-sel3-polybag-inspected');
  const refPoly = getOrCreateMockElement('modal-sel3-ref-polybag');
  const refBibit = getOrCreateMockElement('modal-sel3-ref-bibit');
  const calcRemPoly = getOrCreateMockElement('modal-sel3-calc-rem-poly');
  const calcUnit = getOrCreateMockElement('modal-sel3-calc-rem-poly-unit');
  const sumRatio = getOrCreateMockElement('sum-sel3-poly-ratio');
  const saveBtn = getOrCreateMockElement('btn-modal-save-sel3');

  // Pilih bedengan
  selBed.value = 'BED-001';
  selBed.dispatchEvent('change');
  inputPoly.value = '100';
  inputPoly.dispatchEvent('input');

  // Kosongkan pilihan (value = "")
  selBed.value = '';
  selBed.dispatchEvent('change');

  assert(refPoly.textContent.trim() === '—', 'Skenario 6: Referensi polybag kembali menjadi "—" saat pilihan dikosongkan');
  assert(refBibit.textContent.trim() === '—', 'Skenario 6: Referensi bibit kembali menjadi "—" saat pilihan dikosongkan');
  assert(calcRemPoly.textContent.trim() === '—', 'Skenario 6: Kalkulator kembali menjadi "—"');
  assert(calcUnit.style.display === 'none', 'Skenario 6: Satuan kalkulator disembunyikan kembali');
  assert(sumRatio.textContent.trim() === '—', 'Skenario 6: Ringkasan rasio kembali menjadi "—"');
  assert(inputPoly.disabled === true, 'Skenario 6: Input polybag kembali disabled');
  assert(inputPoly.value === '', 'Skenario 6: Input polybag dikosongkan');
  assert(saveBtn.disabled === true, 'Skenario 6: Tombol simpan kembali disabled');
}

console.log('\n--- SKENARIO 7: Bedengan dengan Sisa Nol (Bukan State Belum Dipilih) ---');
{
  elementRegistry.clear();
  const doc = createMockDoc('SELEKSI_1', 'BATCH-TEST-07', [
    { code: 'BED-HABIS', poly: 200, bibit: 400, remPoly: 0, remBibit: 0, inspectedPoly: 200, inspectedBibit: 0 },
    { code: 'BED-AKTIF', poly: 300, bibit: 600, remPoly: 300, remBibit: 600 }
  ]);
  // Mock execution tx for BED-HABIS so remainingPolybag becomes 0
  storage.set('selection_transactions', [
    {
      id: 'TX-SEL1-HABIS',
      stage: 'SELEKSI_I',
      selectionStage: 'SELEKSI_1',
      parentSelectionDocumentId: doc.id,
      selectionDocumentId: doc.id,
      batchCode: 'BATCH-TEST-07',
      bedenganCode: 'BED-HABIS',
      actualPolybagInspectedQty: 200,
      actualBibitSelectedQty: 0
    }
  ]);

  openSeleksi1ExecutionModal({ doc, bedenganCode: null, user: mockUser });

  const selBed = getOrCreateMockElement('modal-sel1-bedengan');
  const refPoly = getOrCreateMockElement('modal-sel1-ref-polybag');

  // State awal: Belum dipilih
  assert(refPoly.textContent.trim() === '—', 'Skenario 7: State belum dipilih menampilkan placeholder "—" (bukan "0")');

  // Pilih bedengan dengan sisa 0
  selBed.value = 'BED-HABIS';
  selBed.dispatchEvent('change');

  assert(refPoly.textContent.trim() === '0 Ply', 'Skenario 7: Bedengan valid dengan sisa 0 menampilkan "0 Ply" (tidak tertukar dengan "—")');
}

console.log('\n--- SKENARIO 8: Konsistensi Dropdown, Referensi, Kalkulator, Ringkasan, Input di Seleksi I, II, dan III ---');
{
  const stages = [
    { name: 'Seleksi I', fn: openSeleksi1ExecutionModal, prefix: 'sel1', code: 'SELEKSI_1' },
    { name: 'Seleksi II', fn: openSeleksi2ExecutionModal, prefix: 'sel2', code: 'SELEKSI_2' },
    { name: 'Seleksi III', fn: openSeleksi3ExecutionModal, prefix: 'sel3', code: 'SELEKSI_3' }
  ];

  for (const st of stages) {
    elementRegistry.clear();
    const doc = createMockDoc(st.code, `BATCH-${st.prefix}`, [
      { code: 'BED-001', poly: 300, bibit: 600 }
    ]);
    st.fn({ doc, bedenganCode: null, user: mockUser });

    const selBed = getOrCreateMockElement(`modal-${st.prefix}-bedengan`);
    const refPoly = getOrCreateMockElement(`modal-${st.prefix}-ref-polybag`);
    const refBibit = getOrCreateMockElement(`modal-${st.prefix}-ref-bibit`);
    const calcPoly = getOrCreateMockElement(`modal-${st.prefix}-calc-rem-poly`);
    const calcUnit = getOrCreateMockElement(`modal-${st.prefix}-calc-rem-poly-unit`);
    const sumRatio = getOrCreateMockElement(`sum-${st.prefix}-poly-ratio`);
    const inputPoly = getOrCreateMockElement(`modal-${st.prefix}-polybag-inspected`);

    const unselectedConsistent = (
      selBed.value === '' &&
      refPoly.textContent.trim() === '—' &&
      refBibit.textContent.trim() === '—' &&
      calcPoly.textContent.trim() === '—' &&
      calcUnit.style.display === 'none' &&
      sumRatio.textContent.trim() === '—' &&
      inputPoly.disabled === true
    );
    assert(unselectedConsistent, `Skenario 8 [${st.name}]: State awal sebelum bedengan dipilih sepenuhnya konsisten (placeholder "—", units hidden, inputs disabled)`);

    // Sekarang pilih bedengan
    selBed.value = 'BED-001';
    selBed.dispatchEvent('change');

    const selectedConsistent = (
      selBed.value === 'BED-001' &&
      refPoly.textContent.includes('300 Ply') &&
      calcUnit.style.display === 'inline' &&
      inputPoly.disabled === false
    );
    assert(selectedConsistent, `Skenario 8 [${st.name}]: State setelah bedengan dipilih sepenuhnya konsisten (dropdown synced, units shown, inputs enabled)`);
  }
}

console.log('='.repeat(75));
console.log(`TOTAL PASS: ${passCount}`);
console.log(`TOTAL FAIL: ${failCount}`);
console.log('='.repeat(75));

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
