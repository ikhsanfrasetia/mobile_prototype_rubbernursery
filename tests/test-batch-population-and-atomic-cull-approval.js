/**
 * tests/test-batch-population-and-atomic-cull-approval.js
 * 
 * INTEGRATION TEST SUITE:
 * BATCH POPULATION SYNC & ATOMIC CULL APPROVAL SETELAH PINDAH SEMAI
 * 
 * Test Cases:
 * IT-BATCH-001: Pindah Semai -> Batch population (SUM totalDisemai benar)
 * IT-BATCH-002: Multiple SOW same Batch -> SUM seluruh SOW
 * IT-BATCH-003: Sync idempotency -> Tidak double-credit saat sync berkali-kali
 * IT-BATCH-004: CULL pending -> Available tidak berkurang
 * IT-BATCH-005: CULL approved -> Available berkurang
 * IT-BATCH-006: Available < CULL -> Approval BLOCKED
 * IT-BATCH-007: Failed approval persistence -> CULL tetap status MENUNGGU_VERIFIKASI
 * IT-BATCH-008: Failed approval UI/history state -> Tetap di Menunggu Pemeriksaan, tidak pindah ke Riwayat
 * IT-BATCH-009: Successful approval -> CULL approved + batch deducted atomically
 * IT-BATCH-010: Revision/redeclaration -> Tidak double deduct
 * IT-BATCH-011: Multiple CULL same batch -> Sequential deduction benar
 * IT-BATCH-012: Cross-batch isolation -> Batch lain tidak terpengaruh
 * IT-BATCH-013: Current scenario: BTCH-001 (1000 SOW) & CULL-004 (1000 afkir) -> approve sukses, remaining 0
 * IT-BATCH-014: No mutation pada failed approval -> BEFORE === AFTER state data
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
  syncBatchPopulationFromSeeding,
  syncAllBatchPopulationsFromSeeding,
  getAvailableQty,
  getBatchInventory,
  resetInventoryToDefault
} from '../js/core/batch-inventory-service.js';
import {
  approveSelectionRecord,
  returnSelectionRecord,
  SELECTION_STORAGE_KEY,
  SELECTION_STATUS,
  canPerformAsistenSelectionAction
} from '../js/modules/selection/selection-manager.js';

console.log('======================================================================');
console.log('INTEGRATION TEST: BATCH POPULATION SYNC & ATOMIC CULL APPROVAL');
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

const mockAsistenUser = {
  id: 'USR-ASB-01',
  userId: 'USR-ASB-01',
  code: 'ASB001',
  name: 'Budi Santoso',
  position: 'Asisten Pembibitan',
  role: 'ASISTEN_BIBITAN'
};

function resetAllStorage() {
  resetInventoryToDefault();
  storage.set('seeding_transactions', []);
  storage.set(SELECTION_STORAGE_KEY, []);
  storage.set('selection_pool', []);
  storage.set('nursery_batches', []);
}

// --- IT-BATCH-001 ---
runTest('IT-BATCH-001', 'Pindah Semai -> Batch population (SUM totalDisemai benar)', () => {
  resetAllStorage();
  const sow1 = {
    id: 'SOW-1',
    docNo: '2026/SOW/001',
    batchCode: 'BTCH-001',
    batchId: 'BTCH-001',
    totalDisemai: 1000,
    totalPolybag: 1000,
    ditolak: 50
  };
  storage.set('seeding_transactions', [sow1]);

  const inv = syncBatchPopulationFromSeeding('BTCH-001');
  assert.ok(inv, 'Inventory state harus terbentuk');
  assert.strictEqual(inv.initialQty, 1000, 'Initial quantity harus 1.000 Pkk');
  assert.strictEqual(inv.availableQty, 1000, 'Available quantity harus 1.000 Pkk');
  assert.strictEqual(getAvailableQty('BTCH-001'), 1000, 'getAvailableQty harus 1.000');
});

// --- IT-BATCH-002 ---
runTest('IT-BATCH-002', 'Multiple SOW same Batch -> SUM seluruh SOW (1000 + 2000 + 500 = 3500 Pkk)', () => {
  resetAllStorage();
  const sowList = [
    { id: 'SOW-1', docNo: '2026/SOW/001', batchCode: 'BTCH-001', totalDisemai: 1000 },
    { id: 'SOW-2', docNo: '2026/SOW/002', batchCode: 'BTCH-001', totalDisemai: 2000 },
    { id: 'SOW-3', docNo: '2026/SOW/003', batchCode: 'BTCH-001', totalDisemai: 500 }
  ];
  storage.set('seeding_transactions', sowList);

  const inv = syncBatchPopulationFromSeeding('BTCH-001');
  assert.strictEqual(inv.initialQty, 3500, 'Initial populasi harus 3.500 Pkk');
  assert.strictEqual(inv.availableQty, 3500, 'Available populasi harus 3.500 Pkk');
  assert.strictEqual(getAvailableQty('BTCH-001'), 3500);
});

// --- IT-BATCH-003 ---
runTest('IT-BATCH-003', 'Sync idempotency -> Dipanggil 10 kali population tetap 3.500 (tidak double-credit)', () => {
  resetAllStorage();
  const sowList = [
    { id: 'SOW-1', docNo: '2026/SOW/001', batchCode: 'BTCH-001', totalDisemai: 1000 },
    { id: 'SOW-2', docNo: '2026/SOW/002', batchCode: 'BTCH-001', totalDisemai: 2500 }
  ];
  storage.set('seeding_transactions', sowList);

  for (let i = 0; i < 10; i++) {
    syncBatchPopulationFromSeeding('BTCH-001');
  }

  const available = getAvailableQty('BTCH-001');
  assert.strictEqual(available, 3500, 'Available harus tetap 3.500 Pkk dan tidak berlipat ganda');
});

// --- IT-BATCH-004 ---
runTest('IT-BATCH-004', 'CULL pending -> Available tidak berkurang', () => {
  resetAllStorage();
  storage.set('seeding_transactions', [{ id: 'SOW-1', docNo: '2026/SOW/001', batchCode: 'BTCH-001', totalDisemai: 1000 }]);
  storage.set(SELECTION_STORAGE_KEY, [
    {
      id: 'CULL-1',
      docNo: '2026/CULL/001',
      batchCode: 'BTCH-001',
      originType: 'REJECT_PENYEMAIAN',
      jumlahAfkir: 300,
      status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
    }
  ]);

  const available = getAvailableQty('BTCH-001');
  assert.strictEqual(available, 1000, 'CULL pending tidak boleh mengurangi available batch');
});

// --- IT-BATCH-005 ---
runTest('IT-BATCH-005', 'CULL approved -> Available berkurang sebesar afkir', () => {
  resetAllStorage();
  storage.set('seeding_transactions', [{ id: 'SOW-1', docNo: '2026/SOW/001', batchCode: 'BTCH-001', totalDisemai: 1000 }]);
  const cullRecord = {
    id: 'CULL-1',
    docNo: '2026/CULL/001',
    batchCode: 'BTCH-001',
    originType: 'REJECT_PENYEMAIAN',
    jumlahAfkir: 300,
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
  };
  storage.set(SELECTION_STORAGE_KEY, [cullRecord]);

  approveSelectionRecord('CULL-1', 'Approved', mockAsistenUser, true);

  const available = getAvailableQty('BTCH-001');
  assert.strictEqual(available, 700, '1.000 - 300 afkir harus menghasilkan available 700 Pkk');
});

// --- IT-BATCH-006 ---
runTest('IT-BATCH-006', 'Available < CULL -> Approval BLOCKED dengan error', () => {
  resetAllStorage();
  // Batch hanya memiliki 500 Pkk
  storage.set('seeding_transactions', [{ id: 'SOW-1', docNo: '2026/SOW/001', batchCode: 'BTCH-001', totalDisemai: 500 }]);
  const cullRecord = {
    id: 'CULL-OVER',
    docNo: '2026/CULL/002',
    batchCode: 'BTCH-001',
    originType: 'REJECT_PENYEMAIAN',
    jumlahAfkir: 1000, // Meminta 1.000 afkir dari 500 tersedia
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
  };
  storage.set(SELECTION_STORAGE_KEY, [cullRecord]);

  assert.throws(() => {
    approveSelectionRecord('CULL-OVER', 'Approved', mockAsistenUser, true);
  }, /tidak mencukupi/i, 'Harus melempar error stok tidak mencukupi');
});

// --- IT-BATCH-007 ---
runTest('IT-BATCH-007', 'Failed approval persistence -> CULL tetap status MENUNGGU_VERIFIKASI', () => {
  resetAllStorage();
  storage.set('seeding_transactions', [{ id: 'SOW-1', docNo: '2026/SOW/001', batchCode: 'BTCH-001', totalDisemai: 200 }]);
  const cullRecord = {
    id: 'CULL-FAIL',
    docNo: '2026/CULL/003',
    batchCode: 'BTCH-001',
    originType: 'REJECT_PENYEMAIAN',
    jumlahAfkir: 500,
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
  };
  storage.set(SELECTION_STORAGE_KEY, [cullRecord]);

  try {
    approveSelectionRecord('CULL-FAIL', 'Notes', mockAsistenUser, true);
  } catch (err) {
    // Expected error
  }

  const txs = storage.get(SELECTION_STORAGE_KEY, []);
  const target = txs.find(t => t.id === 'CULL-FAIL');
  assert.strictEqual(target.status, SELECTION_STATUS.MENUNGGU_VERIFIKASI, 'Status CULL harus tetap MENUNGGU_VERIFIKASI saat approval gagal');
  assert.notStrictEqual(target.status, SELECTION_STATUS.DISETUJUI, 'Status tidak boleh menjadi DISETUJUI');
});

// --- IT-BATCH-008 ---
runTest('IT-BATCH-008', 'Failed approval UI/history state -> Tetap actionable (Menunggu Pemeriksaan)', () => {
  resetAllStorage();
  storage.set('seeding_transactions', [{ id: 'SOW-1', docNo: '2026/SOW/001', batchCode: 'BTCH-001', totalDisemai: 0 }]);
  const cullRecord = {
    id: 'CULL-ZERO',
    docNo: '2026/CULL/004',
    batchCode: 'BTCH-001',
    originType: 'REJECT_PENYEMAIAN',
    jumlahAfkir: 50,
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
  };
  storage.set(SELECTION_STORAGE_KEY, [cullRecord]);

  try {
    approveSelectionRecord('CULL-ZERO', 'Notes', mockAsistenUser, true);
  } catch (err) {
    // Expected
  }

  const txs = storage.get(SELECTION_STORAGE_KEY, []);
  const target = txs[0];
  const isActionable = canPerformAsistenSelectionAction(target, mockAsistenUser);
  assert.strictEqual(isActionable, true, 'Dokumen yang gagal approve harus tetap actionable di tab Menunggu Pemeriksaan');
});

// --- IT-BATCH-009 ---
runTest('IT-BATCH-009', 'Successful approval -> CULL approved + batch deducted atomically', () => {
  resetAllStorage();
  storage.set('seeding_transactions', [{ id: 'SOW-1', docNo: '2026/SOW/001', batchCode: 'BTCH-001', totalDisemai: 1000 }]);
  const cullRecord = {
    id: 'CULL-OK',
    docNo: '2026/CULL/005',
    batchCode: 'BTCH-001',
    originType: 'REJECT_PENYEMAIAN',
    jumlahAfkir: 400,
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
  };
  storage.set(SELECTION_STORAGE_KEY, [cullRecord]);

  const approvedDoc = approveSelectionRecord('CULL-OK', 'Catatan OK', mockAsistenUser, true);

  assert.strictEqual(approvedDoc.status, SELECTION_STATUS.DISETUJUI, 'Status harus DISETUJUI');
  assert.strictEqual(approvedDoc.stockMutationStatus, 'APPLIED', 'Mutasi stok harus APPLIED');
  assert.strictEqual(getAvailableQty('BTCH-001'), 600, 'Stok batch tersisa harus 600 Pkk (1000 - 400)');
});

// --- IT-BATCH-010 ---
runTest('IT-BATCH-010', 'Revision/redeclaration -> Tidak double deduct', () => {
  resetAllStorage();
  storage.set('seeding_transactions', [{ id: 'SOW-1', docNo: '2026/SOW/001', batchCode: 'BTCH-001', totalDisemai: 1000 }]);
  const cullRecord = {
    id: 'CULL-REV',
    docNo: '2026/CULL/006',
    batchCode: 'BTCH-001',
    originType: 'REJECT_PENYEMAIAN',
    jumlahAfkir: 200,
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
  };
  storage.set(SELECTION_STORAGE_KEY, [cullRecord]);

  // 1. Return oleh Asisten
  returnSelectionRecord('CULL-REV', 'Data kurang jelas', mockAsistenUser);
  assert.strictEqual(getAvailableQty('BTCH-001'), 1000, 'Setelah dikembalikan stok tetap 1.000 Pkk');

  // 2. Mantri mendeklarasikan ulang (simulasi edit & resubmit)
  const txs = storage.get(SELECTION_STORAGE_KEY, []);
  txs[0].status = SELECTION_STATUS.MENUNGGU_VERIFIKASI;
  txs[0].jumlahAfkir = 200;
  storage.set(SELECTION_STORAGE_KEY, txs);
  assert.strictEqual(getAvailableQty('BTCH-001'), 1000, 'Saat resubmit stok tetap 1.000 Pkk');

  // 3. Asisten approve hasil revisi
  approveSelectionRecord('CULL-REV', 'Revisi disetujui', mockAsistenUser, true);
  assert.strictEqual(getAvailableQty('BTCH-001'), 800, 'Setelah disetujui stok menjadi 800 Pkk (hanya terpotong 1 kali)');
});

// --- IT-BATCH-011 ---
runTest('IT-BATCH-011', 'Multiple CULL same batch -> Sequential deduction benar (5000 -> 4000 -> 1000 -> Block 2000)', () => {
  resetAllStorage();
  storage.set('seeding_transactions', [{ id: 'SOW-1', docNo: '2026/SOW/001', batchCode: 'BTCH-5K', totalDisemai: 5000 }]);

  const cullA = { id: 'CULL-A', docNo: '2026/CULL/001', batchCode: 'BTCH-5K', originType: 'REJECT_PENYEMAIAN', jumlahAfkir: 1000, status: SELECTION_STATUS.MENUNGGU_VERIFIKASI };
  const cullB = { id: 'CULL-B', docNo: '2026/CULL/002', batchCode: 'BTCH-5K', originType: 'REJECT_PENYEMAIAN', jumlahAfkir: 3000, status: SELECTION_STATUS.MENUNGGU_VERIFIKASI };
  const cullC = { id: 'CULL-C', docNo: '2026/CULL/003', batchCode: 'BTCH-5K', originType: 'REJECT_PENYEMAIAN', jumlahAfkir: 2000, status: SELECTION_STATUS.MENUNGGU_VERIFIKASI };

  storage.set(SELECTION_STORAGE_KEY, [cullA, cullB, cullC]);

  // Approve CULL-A (1000)
  approveSelectionRecord('CULL-A', 'Approve A', mockAsistenUser, true);
  assert.strictEqual(getAvailableQty('BTCH-5K'), 4000, 'Available harus 4.000 setelah CULL-A');

  // CULL-B pending, available tetap 4000
  assert.strictEqual(getAvailableQty('BTCH-5K'), 4000);

  // Approve CULL-B (3000)
  approveSelectionRecord('CULL-B', 'Approve B', mockAsistenUser, true);
  assert.strictEqual(getAvailableQty('BTCH-5K'), 1000, 'Available harus 1.000 setelah CULL-B');

  // Attempt approve CULL-C (2000 > 1000) -> BLOCKED
  assert.throws(() => {
    approveSelectionRecord('CULL-C', 'Approve C', mockAsistenUser, true);
  }, /tidak mencukupi/i);

  assert.strictEqual(getAvailableQty('BTCH-5K'), 1000, 'Available harus tetap 1.000 setelah CULL-C gagal');
});

// --- IT-BATCH-012 ---
runTest('IT-BATCH-012', 'Cross-batch isolation -> Mutasi Batch A tidak mempengaruhi Batch B', () => {
  resetAllStorage();
  storage.set('seeding_transactions', [
    { id: 'SOW-A', docNo: '2026/SOW/001', batchCode: 'BTCH-AAA', totalDisemai: 5000 },
    { id: 'SOW-B', docNo: '2026/SOW/002', batchCode: 'BTCH-BBB', totalDisemai: 3000 }
  ]);

  const cullA = { id: 'CULL-A', docNo: '2026/CULL/001', batchCode: 'BTCH-AAA', originType: 'REJECT_PENYEMAIAN', jumlahAfkir: 1000, status: SELECTION_STATUS.MENUNGGU_VERIFIKASI };
  storage.set(SELECTION_STORAGE_KEY, [cullA]);

  approveSelectionRecord('CULL-A', 'Approve A', mockAsistenUser, true);

  assert.strictEqual(getAvailableQty('BTCH-AAA'), 4000, 'Batch AAA harus menjadi 4.000 Pkk');
  assert.strictEqual(getAvailableQty('BTCH-BBB'), 3000, 'Batch BBB harus tetap 3.000 Pkk');
});

// --- IT-BATCH-013 ---
runTest('IT-BATCH-013', 'Current scenario: BTCH-001 (1000 SOW) & CULL-004 (1000 afkir) -> approve sukses, remaining 0', () => {
  resetAllStorage();
  storage.set('seeding_transactions', [
    {
      id: 'SOW-ACTUAL',
      docNo: '2026/SOW/001',
      batchCode: 'BTCH-001',
      totalDisemai: 1000,
      totalPolybag: 1000,
      ditolak: 100
    }
  ]);

  const cullActual = {
    id: 'CULL-ACTUAL-004',
    docNo: '2026/CULL/004',
    batchCode: 'BTCH-001',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    jumlahDiperiksa: 1000,
    jumlahAfkir: 1000,
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
  };
  storage.set(SELECTION_STORAGE_KEY, [cullActual]);

  // Initial check: Available 1000 Pkk
  assert.strictEqual(getAvailableQty('BTCH-001'), 1000, 'Saldo awal BTCH-001 harus 1.000 Pkk dari SOW');

  // Approve CULL
  const res = approveSelectionRecord('CULL-ACTUAL-004', 'Setujui Afkir Total', mockAsistenUser, true);

  assert.strictEqual(res.status, SELECTION_STATUS.DISETUJUI, 'Status harus DISETUJUI');
  assert.strictEqual(res.stockMutationStatus, 'APPLIED', 'Mutasi stok harus APPLIED');
  assert.strictEqual(getAvailableQty('BTCH-001'), 0, 'Sisa saldo BTCH-001 harus 0 Pkk (habis ter-cull)');
});

// --- IT-BATCH-014 ---
runTest('IT-BATCH-014', 'No mutation pada failed approval -> BEFORE === AFTER state data', () => {
  resetAllStorage();
  storage.set('seeding_transactions', [{ id: 'SOW-1', docNo: '2026/SOW/001', batchCode: 'BTCH-001', totalDisemai: 100 }]);
  const cullRecord = {
    id: 'CULL-ERR',
    docNo: '2026/CULL/999',
    batchCode: 'BTCH-001',
    originType: 'REJECT_PENYEMAIAN',
    jumlahAfkir: 500, // Error: 500 > 100
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
  };
  storage.set(SELECTION_STORAGE_KEY, [cullRecord]);

  const beforeSel = JSON.stringify(storage.get(SELECTION_STORAGE_KEY, []));
  const beforeSeed = JSON.stringify(storage.get('seeding_transactions', []));

  try {
    approveSelectionRecord('CULL-ERR', 'Notes', mockAsistenUser, true);
  } catch (err) {
    // Expected
  }

  const afterSel = JSON.stringify(storage.get(SELECTION_STORAGE_KEY, []));
  const afterSeed = JSON.stringify(storage.get('seeding_transactions', []));

  assert.strictEqual(beforeSel, afterSel, 'selection_transactions tidak boleh berubah saat approval gagal');
  assert.strictEqual(beforeSeed, afterSeed, 'seeding_transactions tidak boleh berubah saat approval gagal');
  assert.strictEqual(getAvailableQty('BTCH-001'), 100, 'Saldo batch tetap 100 Pkk');
});

console.log('======================================================================');
console.log(`TEST SUMMARY: PASS=${passCount}, FAIL=${failCount}, TOTAL=${passCount + failCount}`);
console.log('======================================================================');

if (failCount > 0) {
  process.exit(1);
}
