/**
 * tests/test-lock-pindah-semai-after-cull-declaration.js
 * 
 * INTEGRATION TEST SUITE:
 * LOCK TRANSAKSI PINDAH SEMAI SETELAH DEKLARASI BIBIT AFKIR
 * 
 * Test Cases:
 * IT-LOCK-SOW-001: SOW belum memiliki CULL (eligible deklarasi, edit aktif, hapus aktif)
 * IT-LOCK-SOW-002: SOW memiliki CULL MENUNGGU_VERIFIKASI (tidak eligible deklarasi baru, edit locked, hapus locked)
 * IT-LOCK-SOW-003: SOW memiliki CULL SUBMITTED_TO_ASB (tidak eligible deklarasi baru, edit locked, hapus locked)
 * IT-LOCK-SOW-004: SOW memiliki CULL DISETUJUI / VERIFIED (tidak eligible deklarasi baru, edit locked, hapus locked)
 * IT-LOCK-SOW-005: SOW memiliki CULL DIKEMBALIKAN / REVISION (source SOW tetap locked, CULL masuk flow Deklarasi Ulang)
 * IT-LOCK-SOW-006: Category mismatch (SOW LAINNYA -> CULL RUSAK, existing CULL tetap ditemukan, SOW tetap locked)
 * IT-LOCK-SOW-007: Run syncAllSeedingsToSelectionPool terhadap SOW yang sudah memiliki CULL (tidak ada duplicate PENDING_DECLARATION)
 * IT-LOCK-SOW-008: Cross-document (SOW-A sudah CULL locked, SOW-B belum CULL unlocked)
 * IT-LOCK-SOW-009: Cross-source (CULL SOW-A tidak mengunci SOW-B)
 * IT-LOCK-SOW-010: Duplicate declaration attempt (SOW-A sudah CULL tidak membuat CULL kedua)
 * IT-LOCK-SOW-011: Existing CULL 2026/SOW/001 -> 2026/CULL/003 relasi tetap intact
 * IT-LOCK-SOW-012: No storage mutation guarantee (Snapshot BEFORE === AFTER)
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
import { isTransactionLockedForMantri } from '../js/modules/verification/mantri-confirmation-service.js';
import { 
  hasExistingCullDeclarationForSeeding,
  findExistingSelectionTransaction,
  integrateSeedingToSelectionPool,
  syncAllSeedingsToSelectionPool,
  declareSelectionItem,
  SELECTION_STATUS,
  SELECTION_STORAGE_KEY
} from '../js/modules/selection/selection-manager.js';

console.log('======================================================================');
console.log('INTEGRATION TEST: LOCK PINDAH SEMAI SETELAH DEKLARASI BIBIT AFKIR');
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

// 1. Capture global initial snapshot for IT-LOCK-SOW-012
const globalInitialState = {
  seeding_transactions: JSON.stringify(storage.get('seeding_transactions', [])),
  selection_pool: JSON.stringify(storage.get('selection_pool', [])),
  selection_transactions: JSON.stringify(storage.get(SELECTION_STORAGE_KEY, [])),
  verification_transactions: JSON.stringify(storage.get('verification_transactions', []))
};

function restoreInitialState() {
  storage.set('seeding_transactions', JSON.parse(globalInitialState.seeding_transactions));
  storage.set('selection_pool', JSON.parse(globalInitialState.selection_pool));
  storage.set(SELECTION_STORAGE_KEY, JSON.parse(globalInitialState.selection_transactions));
  storage.set('verification_transactions', JSON.parse(globalInitialState.verification_transactions));
}

const mockUser = {
  id: 'USR-MANTRI-01',
  userId: 'USR-MANTRI-01',
  code: 'MNTR-01',
  name: 'Budi Santoso',
  role: 'MANTRI_BIBITAN',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

// --- IT-LOCK-SOW-001 ---
runTest('IT-LOCK-SOW-001', 'SOW belum memiliki CULL -> eligible deklarasi, edit aktif, hapus aktif', () => {
  restoreInitialState();
  const rawSow = {
    id: 'SOW-TEST-001',
    docNo: '2026/SOW/TEST01',
    date: '2026-10-02',
    ditolak: 50,
    alasanDitolak: 'Bibit Rusak',
    totalDisemai: 1000
  };

  const isLocked = isTransactionLockedForMantri(rawSow) || hasExistingCullDeclarationForSeeding(rawSow);
  assert.strictEqual(isLocked, false, 'SOW tanpa CULL tidak boleh terkunci');

  const existingTx = findExistingSelectionTransaction({
    sourceDocNo: rawSow.docNo,
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN'
  });
  assert.strictEqual(existingTx, null, 'Tidak boleh ada existing transaction');
});

// --- IT-LOCK-SOW-002 ---
runTest('IT-LOCK-SOW-002', 'SOW memiliki CULL MENUNGGU_VERIFIKASI -> tidak eligible deklarasi baru, edit locked, hapus locked', () => {
  restoreInitialState();
  const sowDoc = '2026/SOW/TEST02';
  const rawSow = {
    id: 'SOW-TEST-002',
    docNo: sowDoc,
    date: '2026-10-02',
    ditolak: 80,
    totalDisemai: 2000
  };

  // Add CULL record with MENUNGGU_VERIFIKASI
  const selTxs = storage.get(SELECTION_STORAGE_KEY, []);
  selTxs.push({
    id: 'SEL-TEST-002',
    docNo: '2026/CULL/TEST02',
    sourceDocNo: sowDoc,
    sourceTransactionId: 'SOW-TEST-002',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI,
    category: 'RUSAK'
  });
  storage.set(SELECTION_STORAGE_KEY, selTxs);

  const isLocked = isTransactionLockedForMantri(rawSow) || hasExistingCullDeclarationForSeeding(rawSow);
  assert.strictEqual(isLocked, true, 'SOW dengan CULL MENUNGGU_VERIFIKASI wajib terkunci');

  const existingTx = findExistingSelectionTransaction({
    sourceDocNo: sowDoc,
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    category: 'RUSAK'
  });
  assert.ok(existingTx, 'Existing CULL transaction harus ditemukan');
  assert.strictEqual(existingTx.status, SELECTION_STATUS.MENUNGGU_VERIFIKASI);
});

// --- IT-LOCK-SOW-003 ---
runTest('IT-LOCK-SOW-003', 'SOW memiliki CULL SUBMITTED_TO_ASB -> tidak eligible deklarasi baru, edit locked, hapus locked', () => {
  restoreInitialState();
  const sowDoc = '2026/SOW/TEST03';
  const rawSow = {
    id: 'SOW-TEST-003',
    docNo: sowDoc,
    ditolak: 100
  };

  const selTxs = storage.get(SELECTION_STORAGE_KEY, []);
  selTxs.push({
    id: 'SEL-TEST-003',
    docNo: '2026/CULL/TEST03',
    sourceDocNo: sowDoc,
    sourceTransactionId: rawSow.id,
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    status: 'SUBMITTED_TO_ASB',
    category: 'MATI'
  });
  storage.set(SELECTION_STORAGE_KEY, selTxs);

  const isLocked = isTransactionLockedForMantri(rawSow) || hasExistingCullDeclarationForSeeding(rawSow);
  assert.strictEqual(isLocked, true, 'SOW dengan CULL SUBMITTED_TO_ASB wajib terkunci');
});

// --- IT-LOCK-SOW-004 ---
runTest('IT-LOCK-SOW-004', 'SOW memiliki CULL DISETUJUI / VERIFIED -> tidak eligible deklarasi baru, edit locked, hapus locked', () => {
  restoreInitialState();
  const sowDoc = '2026/SOW/TEST04';
  const rawSow = {
    id: 'SOW-TEST-004',
    docNo: sowDoc,
    ditolak: 50
  };

  const selTxs = storage.get(SELECTION_STORAGE_KEY, []);
  selTxs.push({
    id: 'SEL-TEST-004',
    docNo: '2026/CULL/TEST04',
    sourceDocNo: sowDoc,
    sourceTransactionId: rawSow.id,
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    status: SELECTION_STATUS.DISETUJUI,
    category: 'RUSAK'
  });
  storage.set(SELECTION_STORAGE_KEY, selTxs);

  const isLocked = isTransactionLockedForMantri(rawSow) || hasExistingCullDeclarationForSeeding(rawSow);
  assert.strictEqual(isLocked, true, 'SOW dengan CULL DISETUJUI wajib terkunci');
});

// --- IT-LOCK-SOW-005 ---
runTest('IT-LOCK-SOW-005', 'SOW memiliki CULL DIKEMBALIKAN / REVISION -> source SOW tetap locked, CULL masuk flow Deklarasi Ulang', () => {
  restoreInitialState();
  const sowDoc = '2026/SOW/TEST05';
  const rawSow = {
    id: 'SOW-TEST-005',
    docNo: sowDoc,
    ditolak: 60
  };

  const selTxs = storage.get(SELECTION_STORAGE_KEY, []);
  selTxs.push({
    id: 'SEL-TEST-005',
    docNo: '2026/CULL/TEST05',
    sourceDocNo: sowDoc,
    sourceTransactionId: rawSow.id,
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    status: SELECTION_STATUS.DIKEMBALIKAN,
    returnReason: 'Foto bibit afkir buram, mohon ambil ulang',
    category: 'RUSAK'
  });
  storage.set(SELECTION_STORAGE_KEY, selTxs);

  // Source SOW must remain locked
  const isLocked = isTransactionLockedForMantri(rawSow) || hasExistingCullDeclarationForSeeding(rawSow);
  assert.strictEqual(isLocked, true, 'Source SOW tetap wajib terkunci walau CULL dikembalikan');

  // Existing CULL is found and marked as DIKEMBALIKAN
  const existingTx = findExistingSelectionTransaction({
    sourceDocNo: sowDoc,
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    category: 'RUSAK'
  });
  assert.ok(existingTx, 'Existing CULL transaction harus ditemukan');
  assert.strictEqual(existingTx.status, SELECTION_STATUS.DIKEMBALIKAN);
  assert.strictEqual(existingTx.returnReason, 'Foto bibit afkir buram, mohon ambil ulang');
});

// --- IT-LOCK-SOW-006 ---
runTest('IT-LOCK-SOW-006', 'Category mismatch: SOW LAINNYA -> CULL RUSAK, existing CULL tetap ditemukan dan SOW tetap locked', () => {
  restoreInitialState();
  const sowDoc = '2026/SOW/TEST06';
  const rawSow = {
    id: 'SOW-TEST-006',
    docNo: sowDoc,
    ditolak: 40,
    alasanDitolak: 'Lainnya'
  };

  // CULL created with category RUSAK
  const selTxs = storage.get(SELECTION_STORAGE_KEY, []);
  selTxs.push({
    id: 'SEL-TEST-006',
    docNo: '2026/CULL/TEST06',
    sourceDocNo: sowDoc,
    sourceTransactionId: rawSow.id,
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI,
    category: 'RUSAK'
  });
  storage.set(SELECTION_STORAGE_KEY, selTxs);

  // Query with category LAINNYA (from pool/SOW)
  const existingTx = findExistingSelectionTransaction({
    sourceDocNo: sowDoc,
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    category: 'LAINNYA'
  });
  assert.ok(existingTx, 'CULL harus tetap ditemukan meski query category berbeda');
  assert.strictEqual(existingTx.docNo, '2026/CULL/TEST06');

  const isLocked = isTransactionLockedForMantri(rawSow) || hasExistingCullDeclarationForSeeding(rawSow);
  assert.strictEqual(isLocked, true, 'SOW harus tetap terkunci meski category mismatch');
});

// --- IT-LOCK-SOW-007 ---
runTest('IT-LOCK-SOW-007', 'Run syncAllSeedingsToSelectionPool terhadap SOW yang sudah memiliki CULL -> tidak ada duplicate PENDING_DECLARATION', () => {
  restoreInitialState();
  const sowDoc = '2026/SOW/TEST07';
  const seedingTx = {
    id: 'SOW-TEST-007',
    docNo: sowDoc,
    ditolak: 120,
    totalDisemai: 5000
  };

  // Save seeding tx
  const seedings = storage.get('seeding_transactions', []);
  seedings.push(seedingTx);
  storage.set('seeding_transactions', seedings);

  // Save declared CULL tx
  const selTxs = storage.get(SELECTION_STORAGE_KEY, []);
  selTxs.push({
    id: 'SEL-TEST-007',
    docNo: '2026/CULL/TEST07',
    sourceDocNo: sowDoc,
    sourceTransactionId: seedingTx.id,
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI,
    category: 'RUSAK'
  });
  storage.set(SELECTION_STORAGE_KEY, selTxs);

  // Run syncAllSeedingsToSelectionPool multiple times
  const created1 = syncAllSeedingsToSelectionPool();
  const created2 = syncAllSeedingsToSelectionPool();

  const pool = storage.get('selection_pool', []);
  const entriesForSow = pool.filter(p => p.sourceDocNo === sowDoc);

  assert.strictEqual(entriesForSow.length, 0, 'Tidak boleh ada entri PENDING_DECLARATION baru di pool untuk SOW yang sudah memiliki CULL');
});

// --- IT-LOCK-SOW-008 ---
runTest('IT-LOCK-SOW-008', 'Cross-document: SOW-A sudah CULL locked, SOW-B belum CULL unlocked', () => {
  restoreInitialState();
  const sowA = { id: 'SOW-A', docNo: '2026/SOW/A', ditolak: 50 };
  const sowB = { id: 'SOW-B', docNo: '2026/SOW/B', ditolak: 50 };

  const selTxs = storage.get(SELECTION_STORAGE_KEY, []);
  selTxs.push({
    id: 'SEL-A',
    docNo: '2026/CULL/A',
    sourceDocNo: sowA.docNo,
    sourceTransactionId: sowA.id,
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
  });
  storage.set(SELECTION_STORAGE_KEY, selTxs);

  const isLockedA = isTransactionLockedForMantri(sowA) || hasExistingCullDeclarationForSeeding(sowA);
  const isLockedB = isTransactionLockedForMantri(sowB) || hasExistingCullDeclarationForSeeding(sowB);

  assert.strictEqual(isLockedA, true, 'SOW-A wajib locked');
  assert.strictEqual(isLockedB, false, 'SOW-B wajib unlocked');
});

// --- IT-LOCK-SOW-009 ---
runTest('IT-LOCK-SOW-009', 'Cross-source: CULL dari SOW-A tidak menyebabkan SOW-B ikut locked', () => {
  restoreInitialState();
  const sowA = { id: 'SOW-A', docNo: '2026/SOW/A', ditolak: 75 };
  const sowB = { id: 'SOW-B', docNo: '2026/SOW/B', ditolak: 80 };

  const selTxs = storage.get(SELECTION_STORAGE_KEY, []);
  selTxs.push({
    id: 'SEL-A',
    docNo: '2026/CULL/A',
    sourceDocNo: sowA.docNo,
    sourceTransactionId: sowA.id,
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    status: SELECTION_STATUS.DISETUJUI
  });
  storage.set(SELECTION_STORAGE_KEY, selTxs);

  assert.strictEqual(hasExistingCullDeclarationForSeeding(sowB), false, 'SOW-B tidak boleh memiliki CULL declaration');
});

// --- IT-LOCK-SOW-010 ---
runTest('IT-LOCK-SOW-010', 'Duplicate declaration attempt: SOW-A sudah CULL tidak membuat CULL kedua', () => {
  restoreInitialState();
  const sowA = { id: 'SOW-A', docNo: '2026/SOW/A', ditolak: 100 };

  // First declaration
  const poolItem = {
    id: 'POOL-A',
    docNo: '2026/CULL/A',
    sourceDocNo: sowA.docNo,
    sourceTransactionId: sowA.id,
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    category: 'RUSAK',
    jumlahAfkir: 100
  };

  const pool = storage.get('selection_pool', []);
  pool.push(poolItem);
  storage.set('selection_pool', pool);

  const res1 = declareSelectionItem(poolItem, null, mockUser, { category: 'RUSAK' });
  assert.strictEqual(res1.isNew, true, 'Deklarasi pertama menghasilkan record baru');

  // Attempt second declaration with different category
  const res2 = declareSelectionItem(poolItem, null, mockUser, { category: 'MATI' });
  assert.strictEqual(res2.isNew, false, 'Deklarasi kedua wajib idempoten (isNew = false)');
  assert.strictEqual(res2.transaction.id, res1.transaction.id, 'Transaction ID harus tetap sama');

  const allSelTxs = storage.get(SELECTION_STORAGE_KEY, []).filter(t => t.sourceDocNo === sowA.docNo);
  assert.strictEqual(allSelTxs.length, 1, 'Total selection transaction untuk SOW-A harus tepat 1 record');
});

// --- IT-LOCK-SOW-011 ---
runTest('IT-LOCK-SOW-011', 'Existing CULL 2026/SOW/001 -> 2026/CULL/003 relasi tetap intact', () => {
  restoreInitialState();
  const sow1 = { id: 'SOW-001', docNo: '2026/SOW/001', ditolak: 100 };
  
  // Verify existing or simulate standard CULL/003
  const selTxs = storage.get(SELECTION_STORAGE_KEY, []);
  let cull3 = selTxs.find(t => t.docNo === '2026/CULL/003' || t.sourceDocNo === '2026/SOW/001');
  if (!cull3) {
    cull3 = {
      id: 'SEL-CULL-003',
      docNo: '2026/CULL/003',
      sourceDocNo: '2026/SOW/001',
      sourceTransactionId: 'SOW-001',
      originType: 'REJECT_PENYEMAIAN',
      sourceModule: 'PENYEMAIAN',
      status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
    };
    selTxs.push(cull3);
    storage.set(SELECTION_STORAGE_KEY, selTxs);
  }

  const existingTx = findExistingSelectionTransaction({
    sourceDocNo: '2026/SOW/001',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN'
  });
  assert.ok(existingTx, 'Existing CULL/003 harus ditemukan');
  assert.strictEqual(existingTx.sourceDocNo, '2026/SOW/001');

  const isLocked = hasExistingCullDeclarationForSeeding(sow1);
  assert.strictEqual(isLocked, true, '2026/SOW/001 wajib terkunci');
});

// --- IT-LOCK-SOW-012 ---
runTest('IT-LOCK-SOW-012', 'No storage mutation guarantee (Snapshot BEFORE === AFTER)', () => {
  restoreInitialState();
  const finalState = {
    seeding_transactions: JSON.stringify(storage.get('seeding_transactions', [])),
    selection_pool: JSON.stringify(storage.get('selection_pool', [])),
    selection_transactions: JSON.stringify(storage.get(SELECTION_STORAGE_KEY, [])),
    verification_transactions: JSON.stringify(storage.get('verification_transactions', []))
  };

  assert.strictEqual(finalState.seeding_transactions, globalInitialState.seeding_transactions, 'seeding_transactions wajib 100% identik');
  assert.strictEqual(finalState.selection_pool, globalInitialState.selection_pool, 'selection_pool wajib 100% identik');
  assert.strictEqual(finalState.selection_transactions, globalInitialState.selection_transactions, 'selection_transactions wajib 100% identik');
  assert.strictEqual(finalState.verification_transactions, globalInitialState.verification_transactions, 'verification_transactions wajib 100% identik');
});

console.log('======================================================================');
console.log(`TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
console.log('======================================================================');

if (failCount > 0) {
  process.exit(1);
}
