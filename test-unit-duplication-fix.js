/**
 * test-unit-duplication-fix.js
 * Integration Test Suite for Unit Duplication Fix on Penerimaan & Shared Renderers.
 * 
 * Test Coverage:
 * IT-UNIT-001: Penerimaan qty "20000 BUTIR" -> display "20000 BUTIR"
 * IT-UNIT-002: Penerimaan qty 20000 + unit Butir -> display formatted with single unit
 * IT-UNIT-003: Tidak ada duplicate unit pada mainQty, summary, dan fields
 * IT-UNIT-004: summary menggunakan satu unit
 * IT-UNIT-005: display.mainQty menggunakan satu unit
 * IT-UNIT-006: display.fields Jumlah Diterima menggunakan satu unit
 * IT-UNIT-007: Raw transaction tidak berubah
 * IT-UNIT-008: Menunas tetap menampilkan satu unit
 * IT-UNIT-009: Topping tetap menampilkan satu unit
 * IT-UNIT-010: Pemeriksaan Dederan tetap menampilkan quantity dengan benar
 */

import assert from 'assert';
import { storage } from './js/core/storage.js';
import {
  getMantriTodayTransactions,
  MODULE_TYPES
} from './js/modules/verification/mantri-confirmation-service.js';

// Mock localStorage for Node environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

const testMantri = {
  id: 'USR-MANTRI-TEST',
  userId: 'USR-MANTRI-TEST',
  code: '1405482',
  name: 'Irwan Syah Putra',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

const todayStr = '01/10/2026';

function resetStorage() {
  localStorage.clear();
}

console.log('--- STARTING INTEGRATION TESTS: UNIT DUPLICATION FIX ---\n');

// -------------------------------------------------------------
// IT-UNIT-001, IT-UNIT-003, IT-UNIT-004, IT-UNIT-005, IT-UNIT-006, IT-UNIT-007
// Penerimaan with string qty including unit ("20000 BUTIR")
// -------------------------------------------------------------
resetStorage();
const rawTxSir = {
  id: 'RCV-SIR-01',
  docNo: 'RCV/KSP/2026/001',
  date: todayStr,
  penerima: testMantri.name,
  qty: '20000 BUTIR',
  satuan: 'Butir',
  klon: 'AVROS 2006',
  tipeAsal: 'Kebun Induk',
  sir: 'ISSUE/2026/01/348',
  status: 'DRAFT'
};
storage.set('receipt_ksp_transactions', [rawTxSir]);

const txsSir = getMantriTodayTransactions(testMantri, todayStr).filter(t => t.moduleType === MODULE_TYPES.PENERIMAAN);
assert.strictEqual(txsSir.length, 1, '1 Penerimaan transaction must be returned');
const pTxSir = txsSir[0];

// IT-UNIT-001: mainQty tampil "20000 BUTIR"
assert.strictEqual(pTxSir.display.mainQty, '20000 BUTIR', 'IT-UNIT-001: display.mainQty must be "20000 BUTIR"');
console.log('✓ IT-UNIT-001 PASS: Penerimaan qty "20000 BUTIR" -> display.mainQty = "20000 BUTIR"');

// IT-UNIT-003: Tidak ada duplikasi "BUTIR Butir"
assert(!pTxSir.display.mainQty.includes('BUTIR Butir'), 'IT-UNIT-003: No duplicate "BUTIR Butir" in mainQty');
assert(!pTxSir.summary.includes('BUTIR Butir'), 'IT-UNIT-003: No duplicate "BUTIR Butir" in summary');
console.log('✓ IT-UNIT-003 PASS: Tidak ada duplikasi "BUTIR Butir"');

// IT-UNIT-004: summary menggunakan satu unit
assert.strictEqual(pTxSir.summary, '20000 BUTIR (Klon: AVROS 2006)', 'IT-UNIT-004: summary must be "20000 BUTIR (Klon: AVROS 2006)"');
console.log('✓ IT-UNIT-004 PASS: summary = "20000 BUTIR (Klon: AVROS 2006)"');

// IT-UNIT-005: display.mainQty menggunakan satu unit
assert.strictEqual(pTxSir.display.mainQty, '20000 BUTIR', 'IT-UNIT-005: display.mainQty must be "20000 BUTIR"');
console.log('✓ IT-UNIT-005 PASS: display.mainQty = "20000 BUTIR"');

// IT-UNIT-006: display.fields Jumlah Diterima menggunakan satu unit
const jmlField = pTxSir.display.fields.find(f => f.label === 'Jumlah Diterima');
assert(jmlField, 'Field "Jumlah Diterima" must exist');
assert.strictEqual(jmlField.value, '20000 BUTIR', 'IT-UNIT-006: Field Jumlah Diterima must be "20000 BUTIR"');
console.log('✓ IT-UNIT-006 PASS: display.fields[Jumlah Diterima] = "20000 BUTIR"');

// IT-UNIT-007: Raw source transaction tidak berubah
assert.strictEqual(pTxSir.rawRecord.qty, '20000 BUTIR', 'IT-UNIT-007: rawRecord.qty must remain "20000 BUTIR"');
assert.strictEqual(pTxSir.rawRecord.satuan, 'Butir', 'IT-UNIT-007: rawRecord.satuan must remain "Butir"');
console.log('✓ IT-UNIT-007 PASS: Raw transaction schema & values preserved intact');

// -------------------------------------------------------------
// IT-UNIT-002: Numeric Qty (20000 as number or "20000" as string)
// -------------------------------------------------------------
resetStorage();
const rawTxNumeric = {
  id: 'RCV-NUM-01',
  docNo: 'RCV/KSP/2026/002',
  date: todayStr,
  penerima: testMantri.name,
  qty: 20000,
  satuan: 'Butir',
  klon: 'PB 260',
  status: 'DRAFT'
};
storage.set('receipt_ksp_transactions', [rawTxNumeric]);

const txsNum = getMantriTodayTransactions(testMantri, todayStr).filter(t => t.moduleType === MODULE_TYPES.PENERIMAAN);
const pTxNum = txsNum[0];
assert.strictEqual(pTxNum.display.mainQty, '20.000 Butir', 'IT-UNIT-002: Numeric qty 20000 formatted with single unit "20.000 Butir"');
assert(!pTxNum.display.mainQty.includes('Butir Butir'), 'IT-UNIT-002: No duplicate unit');
console.log('✓ IT-UNIT-002 PASS: Numeric qty 20000 -> display.mainQty = "20.000 Butir"');

// -------------------------------------------------------------
// IT-UNIT-008: Regression Check - Menunas
// -------------------------------------------------------------
resetStorage();
storage.set('entres_menunas_transactions', [
  { id: 'TUNAS-01', docNo: '2026/BWGDTL/001', date: todayStr, mantri: testMantri.name, jumlahPohonDitunas: 120, kodePlot: 'PL-01', namaKlon: 'GT1' }
]);
const menunasTxs = getMantriTodayTransactions(testMantri, todayStr).filter(t => t.moduleType === MODULE_TYPES.KEBUN_ENTRES && t.activityType === 'MENUNAS');
assert.strictEqual(menunasTxs[0].display.mainQty, '120 Pokok Ditunas', 'IT-UNIT-008: Menunas mainQty is "120 Pokok Ditunas"');
assert(!menunasTxs[0].display.mainQty.includes('Ditunas Ditunas'), 'IT-UNIT-008: No duplicate unit in Menunas');
console.log('✓ IT-UNIT-008 PASS: Menunas display.mainQty = "120 Pokok Ditunas"');

// -------------------------------------------------------------
// IT-UNIT-009: Regression Check - Topping
// -------------------------------------------------------------
storage.set('entres_topping_transactions', [
  { id: 'TOP-01', docNo: '2026/BWGDTL/002', date: todayStr, mantri: testMantri.name, jumlahKayu: 100, jumlahPerisai: 800, kodePlot: 'PL-01', namaKlon: 'GT1' }
]);
const toppingTxs = getMantriTodayTransactions(testMantri, todayStr).filter(t => t.moduleType === MODULE_TYPES.KEBUN_ENTRES && t.activityType === 'TOPPING');
assert.strictEqual(toppingTxs[0].display.mainQty, '100 Btg · 800 Perisai', 'IT-UNIT-009: Topping mainQty is "100 Btg · 800 Perisai"');
assert(!toppingTxs[0].display.mainQty.includes('Btg Btg'), 'IT-UNIT-009: No duplicate unit in Topping');
console.log('✓ IT-UNIT-009 PASS: Topping display.mainQty = "100 Btg · 800 Perisai"');

// -------------------------------------------------------------
// IT-UNIT-010: Regression Check - Pemeriksaan Dederan
// -------------------------------------------------------------
storage.set('dederan_inspections', [
  { id: 'DINSP-01', docNo: 'DINSP/01', date: todayStr, mantri: testMantri.name, jumlahDiperiksa: 500, jumlahBerhasil: 450, jumlahTidakBerhasil: 50, bedenganCode: 'BED-01' }
]);
const dederTxs = getMantriTodayTransactions(testMantri, todayStr).filter(t => t.moduleType === MODULE_TYPES.PEMERIKSAAN_DEDERAN);
assert.strictEqual(dederTxs[0].display.mainQty, '500 Diperiksa', 'IT-UNIT-010: Pemeriksaan Dederan mainQty is "500 Diperiksa"');
assert.strictEqual(dederTxs[0].display.breakdown, '450 Berhasil, 50 Tidak Berhasil', 'IT-UNIT-010: Breakdown is correct');
console.log('✓ IT-UNIT-010 PASS: Pemeriksaan Dederan mainQty = "500 Diperiksa" (450 Berhasil, 50 Tidak Berhasil)');

console.log('\n======================================================');
console.log('ALL 10 INTEGRATION TESTS (IT-UNIT-001 TO IT-UNIT-010) PASSED!');
console.log('======================================================\n');
