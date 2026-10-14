/**
 * tests/test-global-cull-standardization-integration.js
 * 
 * INTEGRATION TEST SUITE:
 * GLOBAL CULL STANDARDIZATION & RECOVERY SAFETY
 * Format: YYYY/CULL/XXX/NNN
 * Codes: SEL-I, SEL-II, SEL-III, SEL-OKL, PS, DDR
 * 
 * Covers all 16 required safety & business integration scenarios.
 */

// Setup Mock LocalStorage before imports
const memoryStore = new Map();
globalThis.localStorage = {
  getItem: (k) => memoryStore.get(k) || null,
  setItem: (k, v) => memoryStore.set(k, String(v)),
  removeItem: (k) => memoryStore.delete(k),
  clear: () => memoryStore.clear()
};

// Mock Web Locks API in Node.js
if (!globalThis.navigator) globalThis.navigator = {};
if (!globalThis.navigator.locks) {
  globalThis.navigator.locks = {
    request: async (name, optionsOrCb, cb) => {
      const callback = typeof optionsOrCb === 'function' ? optionsOrCb : cb;
      return await callback({ name });
    }
  };
}

import assert from 'node:assert';
import { storage } from '../js/core/storage.js';
import {
  formatStandardDocNo,
  formatCullDocNo,
  parseCullDocNo,
  isCullDocNo,
  resolveCullSourceCode,
  CULL_SOURCE_CODES,
  todayISO
} from '../js/core/utils.js';
import {
  allocateCullDocNo,
  declareSelectionItem,
  createSelectionRecord,
  approveSelectionRecord,
  findExistingSelectionTransaction,
  reconcileSelectionPoolWithTransactions,
  integrateSeedingToSelectionPool,
  canPerformAsistenSelectionAction,
  createSeleksi1ExecutionTransaction,
  mutateStockFromSelection,
  SELECTION_STORAGE_KEY,
  SELECTION_STATUS,
  STOCK_MUTATION_STATUS
} from '../js/modules/selection/selection-manager.js';
import {
  integrateDederanRejectionToSelectionPool
} from '../js/modules/seeding/dederan-manager.js';
import {
  initBatchInventory,
  getAvailableQty as getInventoryAvailableQty,
  getBatchInventory
} from '../js/core/batch-inventory-service.js';

console.log('================================================================================');
console.log('INTEGRATION TEST: GLOBAL CULL STANDARDIZATION & RECOVERY SUITE (16 SCENARIOS)');
console.log('================================================================================\n');

let passCount = 0;
let failCount = 0;

function runScenario(id, title, fn) {
  try {
    console.log(`--- [${id}] ${title} ---`);
    fn();
    console.log(`  [PASS] ${id}: ${title}\n`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${id}: ${title}`);
    console.error(`         ${err.message}\n`);
    failCount++;
  }
}

async function runScenarioAsync(id, title, fn) {
  try {
    console.log(`--- [${id}] ${title} ---`);
    await fn();
    console.log(`  [PASS] ${id}: ${title}\n`);
    passCount++;
  } catch (err) {
    console.error(`  [FAIL] ${id}: ${title}`);
    console.error(`         ${err.message}\n`);
    failCount++;
  }
}

function seedAttendance() {
  const todayStr = todayISO();
  storage.set('attendance_transactions', [
    { type: 'SUPERVISOR', role: 'MANTRI_TANAMAN', attendanceType: 'DATANG', date: todayStr, status: 'PRESENT' },
    { type: 'WORKER', workerId: 'WRK-01', attendanceType: 'DATANG', date: todayStr, status: 'PRESENT' }
  ]);
}

function seedBatchInventory(batchId, qty = 1000) {
  storage.set('batch_inventory_states', [{ batchId, batchCode: batchId, availableQty: qty, status: 'AVAILABLE' }]);
  storage.set('batch_inventory_journal', [
    { id: `JRN-${batchId}-1`, batchId, batchCode: batchId, batchSeq: 1, txType: 'INITIAL', qtyIn: qty, qtyOut: 0, balance: qty }
  ]);
}

function resetEnvironment() {
  storage.set('cull_document_sequences', {});
  storage.set(SELECTION_STORAGE_KEY, []);
  storage.set('selection_pool', []);
  storage.set('selection_photos', []);
  storage.set('selection_approval_decisions', []);
  storage.set('selection_mutation_intents', []);
  storage.set('batch_inventory_states', []);
  storage.set('batch_inventory_journal', []);
  storage.set('seeding_transactions', []);
  storage.set('pre_grafting_selection_documents', []);
  seedAttendance();
}

const mockMantri = {
  id: 'USR-MNT-01',
  userId: 'USR-MNT-01',
  code: 'MNT01',
  name: 'Mantri Ahmad',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

const mockAsisten = {
  id: 'USR-ASB-01',
  userId: 'USR-ASB-01',
  code: 'ASB01',
  name: 'Asisten Budi',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

// SCENARIO 1: Setiap enam kode menghasilkan format CULL empat segmen yang benar
runScenario('IT-CULL-01', 'Setiap enam kode menghasilkan format CULL empat segmen yang benar', () => {
  resetEnvironment();
  const codes = ['SEL-I', 'SEL-II', 'SEL-III', 'SEL-OKL', 'PS', 'DDR'];
  const expected = [
    '2026/CULL/SEL-I/001',
    '2026/CULL/SEL-II/001',
    '2026/CULL/SEL-III/001',
    '2026/CULL/SEL-OKL/001',
    '2026/CULL/PS/001',
    '2026/CULL/DDR/001'
  ];

  codes.forEach((code, idx) => {
    const formatted = formatCullDocNo(2026, code, 1);
    assert.strictEqual(formatted, expected[idx], `Format mismatch for ${code}`);
    const parsed = parseCullDocNo(formatted);
    assert.ok(parsed, `Parser failed for ${formatted}`);
    assert.strictEqual(parsed.year, 2026);
    assert.strictEqual(parsed.subCode, code);
    assert.strictEqual(parsed.sequence, 1);
    assert.strictEqual(parsed.isStandard, true);
    assert.strictEqual(parsed.isLegacy, false);
  });
});

// SCENARIO 2: Sequence terpisah untuk setiap kode dan tahun
runScenario('IT-CULL-02', 'Sequence terpisah untuk setiap kode dan tahun', () => {
  resetEnvironment();
  const ps1 = allocateCullDocNo('PS', 2026);
  const ps2 = allocateCullDocNo('PS', 2026);
  const ddr1 = allocateCullDocNo('DDR', 2026);
  const sel1 = allocateCullDocNo('SEL-I', 2026);
  const ps2027 = allocateCullDocNo('PS', 2027);

  assert.strictEqual(ps1, '2026/CULL/PS/001');
  assert.strictEqual(ps2, '2026/CULL/PS/002');
  assert.strictEqual(ddr1, '2026/CULL/DDR/001', 'DDR sequence harus mulai dari 001');
  assert.strictEqual(sel1, '2026/CULL/SEL-I/001', 'SEL-I sequence harus mulai dari 001');
  assert.strictEqual(ps2027, '2027/CULL/PS/001', 'Tahun 2027 harus mulai sequence terpisah dari 001');
});

// SCENARIO 3: Sequence monotonik dan tidak menggunakan ulang nomor yang sudah dialokasikan
runScenario('IT-CULL-03', 'Sequence monotonik dan tidak menggunakan ulang nomor yang sudah dialokasikan', () => {
  resetEnvironment();
  const n1 = allocateCullDocNo('PS', 2026);
  const n2 = allocateCullDocNo('PS', 2026);
  const n3 = allocateCullDocNo('PS', 2026);

  assert.strictEqual(n1, '2026/CULL/PS/001');
  assert.strictEqual(n2, '2026/CULL/PS/002');
  assert.strictEqual(n3, '2026/CULL/PS/003');

  const seqs = storage.get('cull_document_sequences', {});
  assert.strictEqual(seqs['2026/PS'], 3);
});

// SCENARIO 4: Kandidat baru di selection_pool tidak menerima nomor resmi prematur
runScenario('IT-CULL-04', 'Kandidat baru di selection_pool tidak menerima nomor resmi prematur', () => {
  resetEnvironment();
  const seedingTx = {
    id: 'SOW-TEST-001',
    docNo: '2026/SOW/001',
    batchId: 'BATCH-001',
    batchCode: 'B-001',
    jumlahBibit: 1000,
    ditolak: 50,
    alasanDitolak: 'Mati saat pindah semai'
  };

  integrateSeedingToSelectionPool(seedingTx);
  const pool = storage.get('selection_pool', []);
  assert.strictEqual(pool.length, 1);
  assert.strictEqual(pool[0].docNo, null, 'Kandidat pool baru harus memiliki docNo null (belum resmi)');
  assert.ok(pool[0].id.startsWith('SEL-POOL-SEED-'));
});

// SCENARIO 5: Nomor dialokasikan saat deklarasi valid disimpan
runScenario('IT-CULL-05', 'Nomor dialokasikan saat deklarasi valid disimpan', () => {
  resetEnvironment();
  const candidate = {
    id: 'SEL-POOL-SEED-01',
    docNo: null,
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    sourceTransactionType: 'SEEDING',
    sourceDocNo: '2026/SOW/001',
    batchId: 'BATCH-001',
    batchCode: 'B-001',
    jumlahAfkir: 50,
    quantity: 50
  };
  storage.set('selection_pool', [candidate]);

  const result = declareSelectionItem(candidate, null, mockMantri, { category: 'AFKIR' });
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.isNew, true);
  assert.strictEqual(result.transaction.docNo, '2026/CULL/PS/001', 'Harus dialokasikan nomor CULL resmi format 4 segmen');
  assert.strictEqual(result.transaction.selectionNo, '2026/CULL/PS/001');

  // Verify pool is updated with the allocated official docNo
  const updatedPool = storage.get('selection_pool', []);
  assert.strictEqual(updatedPool[0].docNo, '2026/CULL/PS/001');
});

// SCENARIO 6: Interupsi setelah alokasi sequence tidak menyebabkan nomor digunakan kembali (gap allowed)
runScenario('IT-CULL-06', 'Interupsi setelah alokasi sequence tidak menyebabkan nomor digunakan kembali (gap allowed)', () => {
  resetEnvironment();
  // Simulasikan browser mengalokasikan sequence '2026/CULL/PS/001' lalu terhenti (crash) sebelum simpan transaksi
  const burnedNo = allocateCullDocNo('PS', 2026);
  assert.strictEqual(burnedNo, '2026/CULL/PS/001');

  // Pada pemanggilan berikutnya (recovery / reload)
  const candidate = {
    id: 'SEL-POOL-RETRY-01',
    docNo: null,
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    sourceTransactionType: 'SEEDING',
    sourceDocNo: '2026/SOW/002',
    jumlahAfkir: 30
  };
  const result = declareSelectionItem(candidate, null, mockMantri);
  assert.strictEqual(result.transaction.docNo, '2026/CULL/PS/002', 'Nomor 001 yang terinterupsi tidak boleh digunakan ulang');
});

// SCENARIO 7: Interupsi setelah transaksi tersimpan tidak menyebabkan deklarasi ganda
runScenario('IT-CULL-07', 'Interupsi setelah transaksi tersimpan tidak menyebabkan deklarasi ganda', () => {
  resetEnvironment();
  const poolCandidate = {
    id: 'POOL-ITEM-07',
    docNo: null,
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    sourceTransactionType: 'SEEDING',
    sourceDocNo: '2026/SOW/007',
    jumlahAfkir: 40
  };
  storage.set('selection_pool', [poolCandidate]);

  // Transaksi sudah tersimpan di selection_transactions
  const existingTx = {
    id: 'SEL-TX-07',
    docNo: '2026/CULL/PS/001',
    sourceDocNo: '2026/SOW/007',
    sourceModule: 'PENYEMAIAN',
    originType: 'REJECT_PENYEMAIAN',
    status: SELECTION_STATUS.READY_TO_CONFIRM,
    jumlahAfkir: 40
  };
  storage.set(SELECTION_STORAGE_KEY, [existingTx]);

  // Deklarasi ulang / refresh tidak membuat transaksi baru atau membakar sequence baru
  const result = declareSelectionItem(poolCandidate, null, mockMantri);
  assert.strictEqual(result.isNew, false, 'Tidak boleh membuat transaksi baru');
  assert.strictEqual(result.transaction.docNo, '2026/CULL/PS/001', 'Harus menggunakan docNo existing');
  
  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  assert.strictEqual(allTxs.length, 1, 'Jumlah transaksi harus tetap 1');
});

// SCENARIO 8: Recovery mempertahankan keterkaitan deklarasi, foto, kandidat pool, dan dokumen sumber
runScenario('IT-CULL-08', 'Recovery mempertahankan keterkaitan deklarasi, foto, kandidat pool, dan dokumen sumber', () => {
  resetEnvironment();
  const poolCandidate = {
    id: 'POOL-REC-08',
    docNo: null,
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    sourceDocNo: '2026/SOW/008',
    status: 'PENDING_DECLARATION'
  };
  storage.set('selection_pool', [poolCandidate]);

  const savedTx = {
    id: 'SEL-TX-REC-08',
    docNo: '2026/CULL/PS/005',
    sourceDocNo: '2026/SOW/008',
    sourceModule: 'PENYEMAIAN',
    originType: 'REJECT_PENYEMAIAN',
    status: SELECTION_STATUS.READY_TO_CONFIRM
  };
  storage.set(SELECTION_STORAGE_KEY, [savedTx]);

  // Jalankan reconciler recovery
  reconcileSelectionPoolWithTransactions();

  const recoveredPool = storage.get('selection_pool', []);
  assert.strictEqual(recoveredPool[0].docNo, '2026/CULL/PS/005');
  assert.strictEqual(recoveredPool[0].selectionTransactionId, 'SEL-TX-REC-08');
  assert.strictEqual(recoveredPool[0].status, SELECTION_STATUS.READY_TO_CONFIRM);
});

// SCENARIO 9: Deklarasi Mantri tidak mengubah stok
runScenario('IT-CULL-09', 'Deklarasi Mantri tidak mengubah stok', () => {
  resetEnvironment();
  seedBatchInventory('BATCH-STK-09', 1000);
  const initialAvailable = getInventoryAvailableQty('BATCH-STK-09');
  assert.strictEqual(initialAvailable, 1000);

  const candidate = {
    id: 'POOL-STK-09',
    docNo: null,
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    sourceTransactionType: 'SEEDING',
    sourceDocNo: '2026/SOW/009',
    batchId: 'BATCH-STK-09',
    batchCode: 'BATCH-STK-09',
    jumlahAfkir: 50
  };

  const decl = declareSelectionItem(candidate, null, mockMantri);
  assert.strictEqual(decl.success, true);

  // Verifikasi saldo inventaris tetap 1000 Pkk
  const afterDeclAvailable = getInventoryAvailableQty('BATCH-STK-09');
  assert.strictEqual(afterDeclAvailable, 1000, 'Deklarasi Mantri dilarang memotong stok!');
});

// SCENARIO 10: Approval Asisten yang valid menjadi syarat mutasi stok
await runScenarioAsync('IT-CULL-10', 'Approval Asisten yang valid menjadi syarat mutasi stok', async () => {
  resetEnvironment();
  seedBatchInventory('BATCH-STK-10', 1000);

  const cullTx = {
    id: 'SEL-TX-10',
    docNo: '2026/CULL/PS/001',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    sourceDocNo: '2026/SOW/010',
    batchId: 'BATCH-STK-10',
    batchCode: 'BATCH-STK-10',
    jumlahAfkir: 75,
    quantity: 75,
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI,
    submissionStatus: 'SUBMITTED_TO_ASB',
    stockMutationStatus: STOCK_MUTATION_STATUS.PENDING
  };
  storage.set(SELECTION_STORAGE_KEY, [cullTx]);

  // Non-asisten cannot approve
  await assert.rejects(async () => {
    await approveSelectionRecord(cullTx.id, 'Approval note', mockMantri, true);
  }, /Hanya Asisten Bibitan/);

  // Asisten approves with autoMutateStock = true
  await approveSelectionRecord(cullTx.id, 'Disetujui Asisten', mockAsisten, true);

  const afterApprovalAvailable = getInventoryAvailableQty('BATCH-STK-10');
  assert.strictEqual(afterApprovalAvailable, 925, 'Stok harus berkurang 75 Pkk setelah approval Asisten');
});

// SCENARIO 11: Tidak terjadi mutasi stok ganda akibat retry atau recovery
await runScenarioAsync('IT-CULL-11', 'Tidak terjadi mutasi stok ganda akibat retry atau recovery', async () => {
  resetEnvironment();
  seedBatchInventory('BATCH-STK-11', 1000);

  const cullTx = {
    id: 'SEL-TX-11',
    docNo: '2026/CULL/PS/001',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    sourceDocNo: '2026/SOW/011',
    batchId: 'BATCH-STK-11',
    batchCode: 'BATCH-STK-11',
    jumlahAfkir: 50,
    quantity: 50,
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI,
    submissionStatus: 'SUBMITTED_TO_ASB',
    stockMutationStatus: STOCK_MUTATION_STATUS.PENDING
  };
  storage.set(SELECTION_STORAGE_KEY, [cullTx]);

  await approveSelectionRecord(cullTx.id, 'Approve 1', mockAsisten, true);
  const bal1 = getInventoryAvailableQty('BATCH-STK-11');
  assert.strictEqual(bal1, 950);

  // Re-run / retry approval on the same approved document must be rejected by authorization guard
  await assert.rejects(async () => {
    await approveSelectionRecord(cullTx.id, 'Approve retry', mockAsisten, true);
  }, /tidak memiliki otorisasi/);

  // Calling mutateStockFromSelection directly on already applied document returns ALREADY_APPLIED
  const retryMutation = mutateStockFromSelection(cullTx.id, mockAsisten);
  assert.strictEqual(retryMutation.status, STOCK_MUTATION_STATUS.ALREADY_APPLIED);

  const bal2 = getInventoryAvailableQty('BATCH-STK-11');
  assert.strictEqual(bal2, 950, 'Saldo harus tetap 950, tidak boleh terjadi double deduction');
});

// SCENARIO 12: Dokumen lama tiga segmen dan dokumen baru empat segmen dapat dibaca dan direview
runScenario('IT-CULL-12', 'Dokumen lama tiga segmen dan dokumen baru empat segmen dapat dibaca dan direview', () => {
  resetEnvironment();
  const legacyDoc = '2026/CULL/003';
  const newDoc = '2026/CULL/PS/001';

  const pLegacy = parseCullDocNo(legacyDoc);
  const pNew = parseCullDocNo(newDoc);

  assert.ok(pLegacy);
  assert.strictEqual(pLegacy.year, 2026);
  assert.strictEqual(pLegacy.subCode, null);
  assert.strictEqual(pLegacy.sequence, 3);
  assert.strictEqual(pLegacy.isLegacy, true);

  assert.ok(pNew);
  assert.strictEqual(pNew.year, 2026);
  assert.strictEqual(pNew.subCode, 'PS');
  assert.strictEqual(pNew.sequence, 1);
  assert.strictEqual(pNew.isStandard, true);

  // Both should be recognized as CULL documents
  assert.strictEqual(isCullDocNo(legacyDoc), true);
  assert.strictEqual(isCullDocNo(newDoc), true);
});

// SCENARIO 13: Dokumen eksekusi Seleksi I/II/III tetap terisolasi dari deklarasi CULL
runScenario('IT-CULL-13', 'Dokumen eksekusi Seleksi I/II/III tetap terisolasi dari deklarasi CULL', () => {
  resetEnvironment();
  const execTx = {
    id: 'SEL-TX-002',
    docNo: '2026/SEL-I/002',
    transactionType: 'PELAKSANAAN_SELEKSI_I',
    selectionType: 'PRA_OKULASI',
    selectionStage: 'SELEKSI_1',
    selectionDocumentId: 'SEL-DOC-002',
    batchCode: 'BTCH-002',
    bedenganCode: 'BED-001',
    stockMutationStatus: 'NOT_REQUIRED'
  };
  storage.set(SELECTION_STORAGE_KEY, [execTx]);

  assert.strictEqual(execTx.transactionType, 'PELAKSANAAN_SELEKSI_I');
  assert.strictEqual(execTx.docNo, '2026/SEL-I/002', 'Dokumen eksekusi harus 2026/SEL-I/002, bukan CULL');
  assert.strictEqual(execTx.stockMutationStatus, 'NOT_REQUIRED');

  // Verify it is NOT considered a CULL document
  assert.strictEqual(isCullDocNo(execTx.docNo), false);
  const matched = findExistingSelectionTransaction({
    originType: 'REJECT_PENYEMAIAN',
    sourceDocNo: '2026/SOW/002',
    sourceModule: 'PENYEMAIAN'
  });
  assert.strictEqual(matched, null, 'Transaksi eksekusi tidak boleh cocok sebagai transaksi CULL');
});

// SCENARIO 14: Dederan mempertahankan aturan NOT_REQUIRED jika sesuai proses existing
await runScenarioAsync('IT-CULL-14', 'Dederan mempertahankan aturan NOT_REQUIRED jika sesuai proses existing', async () => {
  resetEnvironment();
  const dederanCullTx = {
    id: 'CULL-DED-14',
    docNo: '2026/CULL/DDR/001',
    originType: 'REJECT_DEDERAN',
    sourceModule: 'DEDERAN',
    sourceDocNo: '2026/DED/001',
    jumlahAfkir: 100,
    quantity: 100,
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI,
    submissionStatus: 'SUBMITTED_TO_ASB',
    stockMutationStatus: STOCK_MUTATION_STATUS.PENDING
  };
  storage.set(SELECTION_STORAGE_KEY, [dederanCullTx]);

  const appResult = await approveSelectionRecord(dederanCullTx.id, 'Approve Dederan Cull', mockAsisten, true);
  assert.strictEqual(appResult.stockMutationStatus, STOCK_MUTATION_STATUS.NOT_REQUIRED, 'Dederan harus tetap NOT_REQUIRED');
  assert.strictEqual(appResult.status, SELECTION_STATUS.DISETUJUI);

  // Batch journal should not have any entries
  const journals = storage.get('batch_inventory_journal', []);
  assert.strictEqual(journals.length, 0);
});

// SCENARIO 15: Kegagalan penyimpanan tidak menghasilkan status sukses palsu
runScenario('IT-CULL-15', 'Kegagalan penyimpanan tidak menghasilkan status sukses palsu', () => {
  resetEnvironment();
  // Null item must throw
  assert.throws(() => {
    declareSelectionItem(null, null, mockMantri);
  }, /tidak valid/);

  // Unauthorized actor must throw
  storage.set('attendance_transactions', []);
  const candidate = { id: 'P-15', originType: 'REJECT_PENYEMAIAN', jumlahAfkir: 10 };
  assert.throws(() => {
    declareSelectionItem(candidate, null, mockMantri);
  }, /Presensi/);

  const txs = storage.get(SELECTION_STORAGE_KEY, []);
  assert.strictEqual(txs.length, 0, 'Tidak boleh ada transaksi tersimpan saat validasi gagal');
});

// SCENARIO 16: Pencarian, filter, dan review tidak salah mengidentifikasi dokumen berdasarkan regex lama
runScenario('IT-CULL-16', 'Pencarian, filter, dan review tidak salah mengidentifikasi dokumen berdasarkan regex lama', () => {
  resetEnvironment();
  const docs = [
    '2026/CULL/001',
    '2026/CULL/SEL-I/001',
    '2026/CULL/SEL-II/002',
    '2026/CULL/SEL-III/003',
    '2026/CULL/SEL-OKL/004',
    '2026/CULL/PS/005',
    '2026/CULL/DDR/006',
    '2026/SEL-I/001',
    '2026/SOW/001'
  ];

  const cullDocs = docs.filter(d => isCullDocNo(d));
  assert.strictEqual(cullDocs.length, 7, 'Harus mendeteksi tepat 7 dokumen CULL (1 legacy + 6 standard)');
  assert.ok(!cullDocs.includes('2026/SEL-I/001'), 'Dokumen eksekusi SEL-I bukan CULL');
  assert.ok(!cullDocs.includes('2026/SOW/001'), 'Dokumen SOW bukan CULL');

  // Test resolution of subCodes
  assert.strictEqual(resolveCullSourceCode('SELEKSI_1'), 'SEL-I');
  assert.strictEqual(resolveCullSourceCode('SELEKSI_2'), 'SEL-II');
  assert.strictEqual(resolveCullSourceCode('SELEKSI_3'), 'SEL-III');
  assert.strictEqual(resolveCullSourceCode('REJECT_OKULASI'), 'SEL-OKL');
  assert.strictEqual(resolveCullSourceCode('REJECT_PENYEMAIAN'), 'PS');
  assert.strictEqual(resolveCullSourceCode('REJECT_DEDERAN'), 'DDR');
});

console.log('================================================================================');
console.log(`TOTAL SCENARIOS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
console.log('================================================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
