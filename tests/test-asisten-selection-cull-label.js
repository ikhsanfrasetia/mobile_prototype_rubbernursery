/**
 * tests/test-asisten-selection-cull-label.js
 * 
 * INTEGRATION TEST SUITE:
 * PERBAIKAN LABEL CULL PINDAH SEMAI PADA PEMERIKSAAN ASISTEN BIBITAN
 * 
 * Test Cases:
 * IT-ASB-LABEL-001: CULL Pindah Semai (originType: 'REJECT_PENYEMAIAN') -> 'SELEKSI PINDAH SEMAI'
 * IT-ASB-LABEL-002: CULL Dederan (originType: 'REJECT_DEDERAN') -> 'PASCA-SEMAI (DEDERAN)'
 * IT-ASB-LABEL-003: CULL Okulasi (originType: 'REJECT_OKULASI') -> 'PASCA-OKULASI'
 * IT-ASB-LABEL-004: CULL Regrafting (originType: 'REJECT_REGRAFTING') -> 'PASCA-OKULASI'
 * IT-ASB-LABEL-005: CULL Pindah Semai Full Metadata (originType: REJECT_PENYEMAIAN, sourceModule: PENYEMAIAN, sourceTransactionType: SEEDING) -> 'SELEKSI PINDAH SEMAI'
 * IT-ASB-LABEL-006: Seleksi I (selectionStage: 'SELEKSI_I') -> 'Seleksi I (Pra-Okulasi)'
 * IT-ASB-LABEL-007: Seleksi II (selectionStage: 'SELEKSI_II') -> 'Seleksi II (Pra-Okulasi)'
 * IT-ASB-LABEL-008: Seleksi III (selectionStage: 'SELEKSI_III') -> 'Seleksi III (Pra-Okulasi)'
 * IT-ASB-LABEL-009: Cross-type isolation (Pindah Semai vs Okulasi CULL) -> Tidak tertukar
 * IT-ASB-LABEL-010: Dederan isolation (Dederan CULL tetap 'PASCA-SEMAI (DEDERAN)')
 * IT-ASB-LABEL-011: No storage mutation guarantee (BEFORE === AFTER)
 * IT-ASB-LABEL-012: Priority of identifier (originType: 'REJECT_PENYEMAIAN' mengalahkan selectionType: 'PASCA_OKULASI')
 */

// Mock in-memory localStorage for isolated test execution
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import assert from 'assert';
import { storage } from '../js/core/storage.js';
import {
  getSelectionStageLabel,
  SELECTION_STORAGE_KEY,
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY
} from '../js/modules/selection/selection-manager.js';

console.log('======================================================================');
console.log('INTEGRATION TEST: LABEL CULL PINDAH SEMAI PEMERIKSAAN ASISTEN BIBITAN');
console.log('======================================================================\n');

let passCount = 0;
let failCount = 0;

function runTest(testId, description, fn) {
  try {
    console.log(`--- ${testId}: ${description} ---`);
    fn();
    console.log(`  [PASS] ${description}\n`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${description}`);
    console.error(`         ${err.message}\n`);
    failCount++;
  }
}

// --- IT-ASB-LABEL-001 ---
runTest('IT-ASB-LABEL-001', 'CULL Pindah Semai (originType: REJECT_PENYEMAIAN) -> SELEKSI PINDAH SEMAI', () => {
  const item = {
    docNo: '2026/CULL/003',
    originType: 'REJECT_PENYEMAIAN',
    sourceDocNo: '2026/SOW/001'
  };
  const label = getSelectionStageLabel(item);
  assert.strictEqual(label, 'SELEKSI PINDAH SEMAI', 'CULL Pindah Semai harus berlabel SELEKSI PINDAH SEMAI');
});

// --- IT-ASB-LABEL-002 ---
runTest('IT-ASB-LABEL-002', 'CULL Dederan (originType: REJECT_DEDERAN) -> PASCA-SEMAI (DEDERAN)', () => {
  const item = {
    docNo: '2026/CULL/001',
    originType: 'REJECT_DEDERAN',
    sourceDocNo: '2026/DED/001'
  };
  const label = getSelectionStageLabel(item);
  assert.strictEqual(label, 'PASCA-SEMAI (DEDERAN)', 'CULL Dederan harus berlabel PASCA-SEMAI (DEDERAN)');
});

// --- IT-ASB-LABEL-003 ---
runTest('IT-ASB-LABEL-003', 'CULL Okulasi (originType: REJECT_OKULASI) -> PASCA-OKULASI', () => {
  const item = {
    docNo: '2026/CULL/005',
    originType: 'REJECT_OKULASI',
    sourceDocNo: '2026/BUD/001'
  };
  const label = getSelectionStageLabel(item);
  assert.strictEqual(label, 'PASCA-OKULASI', 'CULL Okulasi harus berlabel PASCA-OKULASI');
});

// --- IT-ASB-LABEL-004 ---
runTest('IT-ASB-LABEL-004', 'CULL Regrafting (originType: REJECT_REGRAFTING) -> PASCA-OKULASI', () => {
  const item = {
    docNo: '2026/CULL/006',
    originType: 'REJECT_REGRAFTING',
    sourceDocNo: '2026/REBUD/001'
  };
  const label = getSelectionStageLabel(item);
  assert.strictEqual(label, 'PASCA-OKULASI', 'CULL Regrafting harus berlabel PASCA-OKULASI');
});

// --- IT-ASB-LABEL-005 ---
runTest('IT-ASB-LABEL-005', 'CULL Pindah Semai Full Metadata (originType: REJECT_PENYEMAIAN, sourceModule: PENYEMAIAN, sourceTransactionType: SEEDING) -> SELEKSI PINDAH SEMAI', () => {
  const item = {
    docNo: '2026/CULL/003',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    sourceTransactionType: 'SEEDING',
    sourceDocNo: '2026/SOW/001',
    jumlahAfkir: 100
  };
  const label = getSelectionStageLabel(item);
  assert.strictEqual(label, 'SELEKSI PINDAH SEMAI');
});

// --- IT-ASB-LABEL-006 ---
runTest('IT-ASB-LABEL-006', 'Seleksi I (selectionStage: SELEKSI_I) -> Seleksi I (Pra-Okulasi)', () => {
  const item = {
    docNo: '2026/SEL/001',
    selectionStage: 'SELEKSI_I',
    sourceDocNo: '2026/SOW/001'
  };
  const label = getSelectionStageLabel(item);
  assert.strictEqual(label, 'Seleksi I (Pra-Okulasi)');
});

// --- IT-ASB-LABEL-007 ---
runTest('IT-ASB-LABEL-007', 'Seleksi II (selectionStage: SELEKSI_II) -> Seleksi II (Pra-Okulasi)', () => {
  const item = {
    docNo: '2026/SEL-II/001',
    selectionStage: 'SELEKSI_II',
    sourceDocNo: '2026/SEL/001'
  };
  const label = getSelectionStageLabel(item);
  assert.strictEqual(label, 'Seleksi II (Pra-Okulasi)');
});

// --- IT-ASB-LABEL-008 ---
runTest('IT-ASB-LABEL-008', 'Seleksi III (selectionStage: SELEKSI_III) -> Seleksi III (Pra-Okulasi)', () => {
  const item = {
    docNo: '2026/SEL-III/001',
    selectionStage: 'SELEKSI_III',
    sourceDocNo: '2026/SEL-II/001'
  };
  const label = getSelectionStageLabel(item);
  assert.strictEqual(label, 'Seleksi III (Pra-Okulasi)');
});

// --- IT-ASB-LABEL-009 ---
runTest('IT-ASB-LABEL-009', 'Cross-type isolation (Pindah Semai vs Okulasi CULL) -> Tidak tertukar', () => {
  const itemSemai = {
    docNo: '2026/CULL/001',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN'
  };
  const itemOkulasi = {
    docNo: '2026/CULL/002',
    originType: 'REJECT_OKULASI',
    sourceModule: 'BUDDING'
  };

  const labelSemai = getSelectionStageLabel(itemSemai);
  const labelOkulasi = getSelectionStageLabel(itemOkulasi);

  assert.strictEqual(labelSemai, 'SELEKSI PINDAH SEMAI');
  assert.strictEqual(labelOkulasi, 'PASCA-OKULASI');
  assert.notStrictEqual(labelSemai, labelOkulasi, 'Label Pindah Semai dan Okulasi tidak boleh sama');
});

// --- IT-ASB-LABEL-010 ---
runTest('IT-ASB-LABEL-010', 'Dederan isolation (Dederan CULL tetap PASCA-SEMAI (DEDERAN))', () => {
  const itemDederan = {
    docNo: '2026/CULL/001',
    originType: 'REJECT_DEDERAN',
    sourceModule: 'DEDERAN'
  };
  const label = getSelectionStageLabel(itemDederan);
  assert.strictEqual(label, 'PASCA-SEMAI (DEDERAN)');
  assert.notStrictEqual(label, 'SELEKSI PINDAH SEMAI', 'Dederan tidak boleh menjadi SELEKSI PINDAH SEMAI');
});

// --- IT-ASB-LABEL-011 ---
runTest('IT-ASB-LABEL-011', 'No storage mutation guarantee (BEFORE === AFTER)', () => {
  storage.set('seeding_transactions', [{ id: 'SOW-1', docNo: '2026/SOW/001' }]);
  storage.set(SELECTION_STORAGE_KEY, [{ id: 'CULL-1', docNo: '2026/CULL/001', originType: 'REJECT_PENYEMAIAN' }]);
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [{ id: 'SEL-1', docNo: '2026/SEL/001' }]);

  const beforeSeedings = JSON.stringify(storage.get('seeding_transactions', []));
  const beforeSelTxs = JSON.stringify(storage.get(SELECTION_STORAGE_KEY, []));
  const beforePreDocs = JSON.stringify(storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []));

  // Resolve labels for various records
  getSelectionStageLabel({ originType: 'REJECT_PENYEMAIAN' });
  getSelectionStageLabel({ originType: 'REJECT_DEDERAN' });
  getSelectionStageLabel({ selectionStage: 'SELEKSI_I' });

  const afterSeedings = JSON.stringify(storage.get('seeding_transactions', []));
  const afterSelTxs = JSON.stringify(storage.get(SELECTION_STORAGE_KEY, []));
  const afterPreDocs = JSON.stringify(storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []));

  assert.strictEqual(beforeSeedings, afterSeedings, 'seeding_transactions tidak bermutasi');
  assert.strictEqual(beforeSelTxs, afterSelTxs, 'selection_transactions tidak bermutasi');
  assert.strictEqual(beforePreDocs, afterPreDocs, 'pre_grafting_selection_documents tidak bermutasi');
});

// --- IT-ASB-LABEL-012 ---
runTest('IT-ASB-LABEL-012', 'Priority of identifier: originType REJECT_PENYEMAIAN mengalahkan selectionType PASCA_OKULASI', () => {
  const itemWithFallbackConflict = {
    docNo: '2026/CULL/003',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    selectionType: 'PASCA_OKULASI',
    selectionStage: 'SELEKSI_PASCA_OKULASI'
  };
  const label = getSelectionStageLabel(itemWithFallbackConflict);
  assert.strictEqual(label, 'SELEKSI PINDAH SEMAI', 'originType REJECT_PENYEMAIAN wajib mengalahkan fallback PASCA_OKULASI');
});

console.log('======================================================================');
console.log(`TEST SUMMARY: PASS=${passCount}, FAIL=${failCount}, TOTAL=${passCount + failCount}`);
console.log('======================================================================');

if (failCount > 0) {
  process.exit(1);
}
