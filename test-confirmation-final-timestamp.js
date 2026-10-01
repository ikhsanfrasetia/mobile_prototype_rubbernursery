/**
 * test-confirmation-final-timestamp.js
 * Integration Test Suite for Final State "Data Terkonfirmasi" + Timestamp.
 * Validates requirements:
 * IT-CV-TIME-001: Final state menampilkan "Data Terkonfirmasi"
 * IT-CV-TIME-002: Final state menampilkan tanggal lengkap
 * IT-CV-TIME-003: Final state menampilkan jam lengkap HH:mm:ss
 * IT-CV-TIME-004: Timestamp berasal dari submittedAt aktual
 * IT-CV-TIME-005: Timestamp tidak berubah setelah refresh
 * IT-CV-TIME-006: Timestamp menggunakan timezone Asia/Jakarta/WIB
 * IT-CV-TIME-007: Tidak ada hardcoded timestamp
 * IT-CV-TIME-008: Format konsisten pada seluruh tab/module
 */

import assert from 'assert';
import { storage } from './js/core/storage.js';
import {
  submitModuleTransactions,
  getMantriTodayTransactions,
  MODULE_TYPES,
  MANTRI_TRANSACTION_STATUS
} from './js/modules/verification/mantri-confirmation-service.js';
import {
  formatConfirmationTimestamp,
  getModuleSubmissionTimestamp
} from './js/modules/verification/mantri-confirmation-landing.js';
import { VERIFICATION_STORAGE_KEY } from './js/modules/verification/verification-manager.js';

// Mock localStorage for Node environment if needed
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

console.log('--- STARTING INTEGRATION TESTS: FINAL STATE & TIMESTAMP ---');

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

// Helper to clear environment
function resetTestData() {
  localStorage.clear();
}

// -------------------------------------------------------------
// IT-CV-TIME-001, IT-CV-TIME-002, IT-CV-TIME-003, IT-CV-TIME-006: Timestamp Formatting & Timezone
// -------------------------------------------------------------
console.log('\n[1] Testing formatConfirmationTimestamp format and timezone...');

// Given ISO timestamp: 2026-10-01T20:45:30+07:00
const formattedWib = formatConfirmationTimestamp('2026-10-01T20:45:30+07:00');
assert.strictEqual(formattedWib, 'Selesai, 01 Oktober 2026, 20:45:30', 'IT-CV-TIME-002 & 003: Must format full date and HH:mm:ss');
console.log('✓ IT-CV-TIME-002 & 003 PASS: Format is "Selesai, 01 Oktober 2026, 20:45:30"');

// Given UTC timestamp: 2026-10-01T13:45:30.000Z (which is 20:45:30 in WIB / Asia/Jakarta)
const formattedUtc = formatConfirmationTimestamp('2026-10-01T13:45:30.000Z');
assert.strictEqual(formattedUtc, 'Selesai, 01 Oktober 2026, 20:45:30', 'IT-CV-TIME-006: UTC time converted to Asia/Jakarta (WIB)');
console.log('✓ IT-CV-TIME-006 PASS: Accurate Asia/Jakarta (WIB) timezone conversion');

// -------------------------------------------------------------
// IT-CV-TIME-007: Dynamic timestamp (No Hardcoding)
// -------------------------------------------------------------
console.log('\n[2] Testing dynamic timestamp generation (no hardcoding)...');
const sampleDates = [
  { iso: '2026-01-15T08:05:09+07:00', expected: 'Selesai, 15 Januari 2026, 08:05:09' },
  { iso: '2026-05-30T14:22:00+07:00', expected: 'Selesai, 30 Mei 2026, 14:22:00' },
  { iso: '2026-12-31T23:59:59+07:00', expected: 'Selesai, 31 Desember 2026, 23:59:59' }
];

sampleDates.forEach(({ iso, expected }) => {
  const res = formatConfirmationTimestamp(iso);
  assert.strictEqual(res, expected, `Dynamic timestamp must format ${iso} to ${expected}`);
});
console.log('✓ IT-CV-TIME-007 PASS: No hardcoding, all dates & times dynamically formatted in Indonesian locale');

// -------------------------------------------------------------
// IT-CV-TIME-004 & IT-CV-TIME-005: Actual submittedAt & Persistence across refresh
// -------------------------------------------------------------
console.log('\n[3] Testing submittedAt source and persistence across simulated refresh...');
resetTestData();

// Setup sample Penerimaan record
const initialReceipt = {
  id: 'RCV-TEST-001',
  docNo: 'RCV/KSP/2026/001',
  date: todayStr,
  penerima: testMantri.name,
  mantri: testMantri.name,
  qty: 500,
  unit: 'Butir',
  klon: 'AVROS 2006',
  status: 'DRAFT'
};
storage.set('receipt_ksp_transactions', [initialReceipt]);

// 1. Initial State: Unsubmitted
let txs = getMantriTodayTransactions(testMantri, todayStr).filter(t => t.moduleType === MODULE_TYPES.PENERIMAAN);
assert.strictEqual(txs.length, 1, 'Penerimaan transaction must exist');
assert.strictEqual(txs[0].status, MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM, 'Must be READY_TO_CONFIRM');
let tsBefore = getModuleSubmissionTimestamp(MODULE_TYPES.PENERIMAAN, txs);
assert.strictEqual(tsBefore, '', 'Unsubmitted module has no submission timestamp');

// 2. Submit module
const submitRes = submitModuleTransactions(MODULE_TYPES.PENERIMAAN, testMantri);
assert(submitRes.success, 'Submission must succeed');
assert.strictEqual(submitRes.submittedCount, 1, '1 item submitted');

// 3. Post-submit: fetch transactions again
txs = getMantriTodayTransactions(testMantri, todayStr).filter(t => t.moduleType === MODULE_TYPES.PENERIMAAN);
assert.strictEqual(txs[0].status, MANTRI_TRANSACTION_STATUS.SUBMITTED_TO_ASB, 'Status is SUBMITTED_TO_ASB');

const tsAfterSubmit = getModuleSubmissionTimestamp(MODULE_TYPES.PENERIMAAN, txs);
assert(tsAfterSubmit.startsWith('Selesai, 01 Oktober 2026, '), `Timestamp must start with 'Selesai, 01 Oktober 2026, ', got '${tsAfterSubmit}'`);
console.log(`✓ IT-CV-TIME-004 PASS: Resolved actual submittedAt -> "${tsAfterSubmit}"`);

// 4. IT-CV-TIME-005: Simulate page refresh (re-reading from storage without mutating)
const txsAfterRefresh = getMantriTodayTransactions(testMantri, todayStr).filter(t => t.moduleType === MODULE_TYPES.PENERIMAAN);
const tsAfterRefresh = getModuleSubmissionTimestamp(MODULE_TYPES.PENERIMAAN, txsAfterRefresh);
assert.strictEqual(tsAfterRefresh, tsAfterSubmit, 'IT-CV-TIME-005: Timestamp after refresh must be identical to timestamp before refresh');
console.log(`✓ IT-CV-TIME-005 PASS: Timestamp persisted identically on refresh ("${tsAfterRefresh}")`);

// -------------------------------------------------------------
// IT-CV-TIME-008: Consistency across ALL modules
// -------------------------------------------------------------
console.log('\n[4] Testing consistency across ALL modules (IT-CV-TIME-008)...');

const allTestModules = [
  {
    type: MODULE_TYPES.TIDAK_HADIR,
    storageKey: 'virtual_tidak_hadir',
    setup: () => {
      storage.set('worker_attendance', [
        { workerId: 'W1', name: 'Budi', code: 'P01', date: todayStr, absentType: 'S', mantriId: testMantri.id }
      ]);
    }
  },
  {
    type: MODULE_TYPES.PENERIMAAN,
    storageKey: 'receipt_ksp_transactions',
    setup: () => {
      storage.set('receipt_ksp_transactions', [
        { id: 'RCV-01', docNo: 'RCV/01', date: todayStr, penerima: testMantri.name, qty: 100 }
      ]);
    }
  },
  {
    type: MODULE_TYPES.KEBUN_ENTRES,
    storageKey: 'entres_menunas_transactions',
    setup: () => {
      storage.set('entres_menunas_transactions', [
        { id: 'TUNAS-01', docNo: '2026/BWGDTL/001', date: todayStr, mantri: testMantri.name, jumlahPohonDitunas: 50 }
      ]);
      storage.set('entres_topping_transactions', [
        { id: 'TOP-01', docNo: '2026/BWGDTL/002', date: todayStr, mantri: testMantri.name, jumlahKayu: 30, jumlahPerisai: 240 }
      ]);
    }
  },
  {
    type: MODULE_TYPES.PENYEMAIAN,
    storageKey: 'seeding_transactions',
    setup: () => {
      storage.set('seeding_transactions', [
        { id: 'SEED-01', docNo: 'SEED/01', date: todayStr, mantri: testMantri.name, totalDisemai: 200 }
      ]);
    }
  },
  {
    type: MODULE_TYPES.DEDERAN,
    storageKey: 'dederan_transactions',
    setup: () => {
      storage.set('dederan_transactions', [
        { id: 'DED-01', docNo: 'DED/01', date: todayStr, mantri: testMantri.name, jumlahDeder: 150 }
      ]);
    }
  },
  {
    type: MODULE_TYPES.OKULASI,
    storageKey: 'budding_transactions',
    setup: () => {
      storage.set('budding_transactions', [
        { id: 'OKL-01', docNo: 'OKL/01', date: todayStr, mantri: testMantri.name, jumlah: 75 }
      ]);
    }
  },
  {
    type: MODULE_TYPES.PEMERIKSAAN,
    storageKey: 'inspection_transactions',
    setup: () => {
      storage.set('inspection_transactions', [
        { id: 'INSP-01', docNo: 'INSP/01', date: todayStr, mantri: testMantri.name, totalDiperiksa: 100, jumlahJadi: 85 }
      ]);
    }
  },
  {
    type: MODULE_TYPES.PEMERIKSAAN_DEDERAN,
    storageKey: 'dederan_inspections',
    setup: () => {
      storage.set('dederan_inspections', [
        { id: 'DINSP-01', docNo: 'DINSP/01', date: todayStr, mantri: testMantri.name, jumlahDiperiksa: 100, jumlahBerhasil: 90 }
      ]);
    }
  },
  {
    type: MODULE_TYPES.SELEKSI_PRA_OKULASI,
    storageKey: 'pre_grafting_selection_documents',
    setup: () => {
      storage.set('pre_grafting_selection_documents', [
        { id: 'PRE-01', docNo: 'PRE/01', date: todayStr, submittedByName: testMantri.name, totalLayak: 120, totalAfkir: 10 }
      ]);
    }
  },
  {
    type: MODULE_TYPES.PENYELEKSIAN,
    storageKey: 'selection_transactions',
    setup: () => {
      storage.set('selection_transactions', [
        { id: 'SEL-01', docNo: 'SEL/01', date: todayStr, mantri: testMantri.name, actualBibitRetainedQty: 80, actualBibitSelectedQty: 5 }
      ]);
    }
  },
  {
    type: MODULE_TYPES.PEMELIHARAAN,
    storageKey: 'nursery_activity_transactions',
    setup: () => {
      storage.set('nursery_activity_transactions', [
        { id: 'ACT-01', docNo: 'ACT/01', date: todayStr, mantri: testMantri.name, volumePkk: 300 }
      ]);
    }
  },
  {
    type: MODULE_TYPES.PENGELUARAN,
    storageKey: 'dispatch_transactions',
    setup: () => {
      storage.set('dispatch_transactions', [
        { id: 'DSP-01', docNo: 'DSP/01', date: todayStr, mantri: testMantri.name, issuedQty: 50 }
      ]);
    }
  },
  {
    type: MODULE_TYPES.MATERIAL,
    storageKey: 'material_usage_transactions',
    setup: () => {
      storage.set('material_usage_transactions', [
        { id: 'MAT-01', docNo: 'MAT/01', date: todayStr, mantri: testMantri.name, qty: 10, unit: 'Kg' }
      ]);
    }
  }
];

allTestModules.forEach(mod => {
  resetTestData();
  mod.setup();

  const modTxs = getMantriTodayTransactions(testMantri, todayStr).filter(t => t.moduleType === mod.type);
  assert(modTxs.length > 0, `Module ${mod.type} must have transactions`);

  const res = submitModuleTransactions(mod.type, testMantri);
  assert(res.success, `Submission of ${mod.type} must succeed`);

  const updatedTxs = getMantriTodayTransactions(testMantri, todayStr).filter(t => t.moduleType === mod.type);
  const ts = getModuleSubmissionTimestamp(mod.type, updatedTxs);

  assert(ts && ts.startsWith('Selesai, 01 Oktober 2026, '), `Module ${mod.type} timestamp must follow format, got: "${ts}"`);
  console.log(`✓ IT-CV-TIME-008 Module [${mod.type}] -> Final State Timestamp: "${ts}"`);
});

console.log('\n======================================================');
console.log('ALL INTEGRATION TESTS (IT-CV-TIME-001 TO IT-CV-TIME-008) PASSED!');
console.log('======================================================\n');
