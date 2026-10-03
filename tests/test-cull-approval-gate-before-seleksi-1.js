/**
 * tests/test-cull-approval-gate-before-seleksi-1.js
 * 
 * INTEGRATION TEST SUITE:
 * CULL APPROVAL GATE SEBELUM SELEKSI PRA-OKULASI I
 * 
 * Test Cases:
 * IT-CULL-GATE-001: SOW tanpa CULL (afkir = 0) -> ALLOW
 * IT-CULL-GATE-002: SOW memiliki afkir tetapi belum ada deklarasi CULL -> BLOCK
 * IT-CULL-GATE-003: SOW dengan CULL berstatus MENUNGGU_VERIFIKASI -> BLOCK
 * IT-CULL-GATE-004: SOW dengan CULL berstatus SUBMITTED_TO_ASB / PENDING_ASB -> BLOCK
 * IT-CULL-GATE-005: SOW dengan CULL berstatus DIKEMBALIKAN / REVISION -> BLOCK
 * IT-CULL-GATE-006: SOW dengan CULL berstatus DISETUJUI -> ALLOW
 * IT-CULL-GATE-007: SOW dengan CULL berstatus VERIFIED -> ALLOW
 * IT-CULL-GATE-008: Multiple CULL (1 DISETUJUI, 1 MENUNGGU_VERIFIKASI) -> BLOCK
 * IT-CULL-GATE-009: Multiple CULL (1 DISETUJUI, 1 VERIFIED) -> ALLOW
 * IT-CULL-GATE-010: CULL return -> redeclaration (REVISION -> BLOCK, RE-SUBMIT -> BLOCK, ASB APPROVE -> ALLOW)
 * IT-CULL-GATE-011: Cross-document isolation (SOW-A pending -> BLOCK, SOW-B approved -> ALLOW)
 * IT-CULL-GATE-012: Existing Seleksi I document created sebelum gate (CULL pending) -> createSeleksi1ExecutionTransaction BLOCKED
 * IT-CULL-GATE-013: Existing Seleksi I document created sebelum gate (CULL approved) -> createSeleksi1ExecutionTransaction ALLOW
 * IT-CULL-GATE-014: Population integrity (sourceBibitQty = SOW.totalDisemai tidak bermutasi)
 * IT-CULL-GATE-015: No storage mutation guarantee during gate check (BEFORE === AFTER)
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
  canCreatePreGraftingSelection1Document,
  createPreGraftingSelectionDocument,
  syncAllSeedingsToPreGraftingSelectionDocuments,
  createSeleksi1ExecutionTransaction,
  getPreGraftingSelectionDocumentById,
  SELECTION_STATUS,
  SELECTION_STORAGE_KEY,
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY
} from '../js/modules/selection/selection-manager.js';

console.log('======================================================================');
console.log('INTEGRATION TEST: CULL APPROVAL GATE SEBELUM SELEKSI PRA-OKULASI I');
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

// Initial snapshot helper
function clearAllStorage() {
  storage.set('seeding_transactions', []);
  storage.set('selection_pool', []);
  storage.set(SELECTION_STORAGE_KEY, []);
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  storage.set('verification_transactions', []);
}

const mockUser = {
  id: 'USR-MANTRI-01',
  userId: 'USR-MANTRI-01',
  code: 'MNTR-01',
  name: 'Budi Mantri',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

// --- IT-CULL-GATE-001 ---
runTest('IT-CULL-GATE-001', 'SOW tanpa CULL (afkir = 0) -> ALLOW', () => {
  clearAllStorage();
  const sowTx = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    date: '2026-10-02',
    totalDisemai: 1000,
    totalPolybag: 500,
    rusak: 0,
    mati: 0,
    lainnya: 0,
    ditolak: 0,
    batchId: 'BATCH-001',
    batchCode: 'B-001'
  };
  storage.set('seeding_transactions', [sowTx]);

  const gate = canCreatePreGraftingSelection1Document(sowTx);
  assert.strictEqual(gate.canCreate, true, 'SOW tanpa afkir harus eligible (canCreate === true)');

  // Boleh membuat Dokumen Seleksi I
  const doc = createPreGraftingSelectionDocument(sowTx, mockUser);
  assert.ok(doc, 'Dokumen Seleksi I harus berhasil dibuat');
  assert.strictEqual(doc.sourceDocNo, '2026/SOW/001');
  assert.strictEqual(doc.sourceBibitQty, 1000);
});

// --- IT-CULL-GATE-002 ---
runTest('IT-CULL-GATE-002', 'SOW memiliki afkir tetapi belum ada deklarasi CULL -> BLOCK', () => {
  clearAllStorage();
  const sowTx = {
    id: 'SOW-002',
    docNo: '2026/SOW/002',
    date: '2026-10-02',
    totalDisemai: 1000,
    totalPolybag: 500,
    rusakQty: 50,
    batchId: 'BATCH-001',
    batchCode: 'B-001'
  };
  storage.set('seeding_transactions', [sowTx]);
  // Simulasikan masuk pool (PENDING_DECLARATION)
  storage.set('selection_pool', [{
    id: 'POOL-002',
    docNo: '2026/CULL/002',
    sourceDocNo: '2026/SOW/002',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    jumlahAfkir: 50,
    status: 'PENDING_DECLARATION'
  }]);

  const gate = canCreatePreGraftingSelection1Document(sowTx);
  assert.strictEqual(gate.canCreate, false, 'SOW dengan afkir belum dideklarasikan harus BLOCKED');

  // Creation harus melempar error jika dipaksa
  assert.throws(() => {
    createPreGraftingSelectionDocument(sowTx, mockUser);
  }, /Gagal membuat Dokumen Seleksi I/);
});

// --- IT-CULL-GATE-003 ---
runTest('IT-CULL-GATE-003', 'SOW dengan CULL berstatus MENUNGGU_VERIFIKASI -> BLOCK', () => {
  clearAllStorage();
  const sowTx = {
    id: 'SOW-003',
    docNo: '2026/SOW/003',
    totalDisemai: 1000,
    totalPolybag: 500,
    ditolak: 30,
    batchCode: 'B-001'
  };
  storage.set('seeding_transactions', [sowTx]);
  storage.set(SELECTION_STORAGE_KEY, [{
    id: 'CULL-003',
    docNo: '2026/CULL/003',
    sourceDocNo: '2026/SOW/003',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    jumlahAfkir: 30,
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
  }]);

  const gate = canCreatePreGraftingSelection1Document(sowTx);
  assert.strictEqual(gate.canCreate, false, 'CULL MENUNGGU_VERIFIKASI harus BLOCKED');
});

// --- IT-CULL-GATE-004 ---
runTest('IT-CULL-GATE-004', 'SOW dengan CULL berstatus SUBMITTED_TO_ASB / PENDING_ASB -> BLOCK', () => {
  clearAllStorage();
  const sowTx = {
    id: 'SOW-004',
    docNo: '2026/SOW/004',
    totalDisemai: 1000,
    totalPolybag: 500,
    ditolak: 20
  };
  storage.set('seeding_transactions', [sowTx]);
  storage.set(SELECTION_STORAGE_KEY, [{
    id: 'CULL-004',
    docNo: '2026/CULL/004',
    sourceDocNo: '2026/SOW/004',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    status: 'SUBMITTED_TO_ASB'
  }]);

  const gate = canCreatePreGraftingSelection1Document(sowTx);
  assert.strictEqual(gate.canCreate, false, 'CULL SUBMITTED_TO_ASB harus BLOCKED');
});

// --- IT-CULL-GATE-005 ---
runTest('IT-CULL-GATE-005', 'SOW dengan CULL berstatus DIKEMBALIKAN / REVISION -> BLOCK', () => {
  clearAllStorage();
  const sowTx = {
    id: 'SOW-005',
    docNo: '2026/SOW/005',
    totalDisemai: 1000,
    totalPolybag: 500,
    ditolak: 20
  };
  storage.set('seeding_transactions', [sowTx]);
  storage.set(SELECTION_STORAGE_KEY, [{
    id: 'CULL-005',
    docNo: '2026/CULL/005',
    sourceDocNo: '2026/SOW/005',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    status: SELECTION_STATUS.DIKEMBALIKAN
  }]);

  const gate = canCreatePreGraftingSelection1Document(sowTx);
  assert.strictEqual(gate.canCreate, false, 'CULL DIKEMBALIKAN harus BLOCKED');
});

// --- IT-CULL-GATE-006 ---
runTest('IT-CULL-GATE-006', 'SOW dengan CULL berstatus DISETUJUI -> ALLOW', () => {
  clearAllStorage();
  const sowTx = {
    id: 'SOW-006',
    docNo: '2026/SOW/006',
    totalDisemai: 1000,
    totalPolybag: 500,
    ditolak: 40,
    batchCode: 'B-001'
  };
  storage.set('seeding_transactions', [sowTx]);
  storage.set(SELECTION_STORAGE_KEY, [{
    id: 'CULL-006',
    docNo: '2026/CULL/006',
    sourceDocNo: '2026/SOW/006',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    jumlahAfkir: 40,
    status: SELECTION_STATUS.DISETUJUI
  }]);

  const gate = canCreatePreGraftingSelection1Document(sowTx);
  assert.strictEqual(gate.canCreate, true, 'CULL DISETUJUI harus ALLOW');

  const doc = createPreGraftingSelectionDocument(sowTx, mockUser);
  assert.ok(doc, 'Dokumen Seleksi I harus berhasil dibuat setelah CULL DISETUJUI');
});

// --- IT-CULL-GATE-007 ---
runTest('IT-CULL-GATE-007', 'SOW dengan CULL berstatus VERIFIED -> ALLOW', () => {
  clearAllStorage();
  const sowTx = {
    id: 'SOW-007',
    docNo: '2026/SOW/007',
    totalDisemai: 1000,
    totalPolybag: 500,
    ditolak: 40
  };
  storage.set('seeding_transactions', [sowTx]);
  storage.set(SELECTION_STORAGE_KEY, [{
    id: 'CULL-007',
    docNo: '2026/CULL/007',
    sourceDocNo: '2026/SOW/007',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    status: 'VERIFIED'
  }]);

  const gate = canCreatePreGraftingSelection1Document(sowTx);
  assert.strictEqual(gate.canCreate, true, 'CULL VERIFIED harus ALLOW');
});

// --- IT-CULL-GATE-008 ---
runTest('IT-CULL-GATE-008', 'Multiple CULL: CULL-A = DISETUJUI, CULL-B = MENUNGGU_VERIFIKASI -> BLOCK', () => {
  clearAllStorage();
  const sowTx = {
    id: 'SOW-008',
    docNo: '2026/SOW/008',
    totalDisemai: 2000,
    totalPolybag: 1000,
    rusak: 50,
    mati: 30
  };
  storage.set('seeding_transactions', [sowTx]);
  storage.set(SELECTION_STORAGE_KEY, [
    {
      id: 'CULL-008A',
      docNo: '2026/CULL/008A',
      sourceDocNo: '2026/SOW/008',
      originType: 'REJECT_PENYEMAIAN',
      sourceModule: 'PENYEMAIAN',
      status: SELECTION_STATUS.DISETUJUI
    },
    {
      id: 'CULL-008B',
      docNo: '2026/CULL/008B',
      sourceDocNo: '2026/SOW/008',
      originType: 'REJECT_PENYEMAIAN',
      sourceModule: 'PENYEMAIAN',
      status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
    }
  ]);

  const gate = canCreatePreGraftingSelection1Document(sowTx);
  assert.strictEqual(gate.canCreate, false, 'Multiple CULL dengan 1 pending harus BLOCKED');
});

// --- IT-CULL-GATE-009 ---
runTest('IT-CULL-GATE-009', 'Multiple CULL: CULL-A = DISETUJUI, CULL-B = VERIFIED -> ALLOW', () => {
  clearAllStorage();
  const sowTx = {
    id: 'SOW-009',
    docNo: '2026/SOW/009',
    totalDisemai: 2000,
    totalPolybag: 1000,
    rusak: 50,
    mati: 30
  };
  storage.set('seeding_transactions', [sowTx]);
  storage.set(SELECTION_STORAGE_KEY, [
    {
      id: 'CULL-009A',
      docNo: '2026/CULL/009A',
      sourceDocNo: '2026/SOW/009',
      originType: 'REJECT_PENYEMAIAN',
      sourceModule: 'PENYEMAIAN',
      status: SELECTION_STATUS.DISETUJUI
    },
    {
      id: 'CULL-009B',
      docNo: '2026/CULL/009B',
      sourceDocNo: '2026/SOW/009',
      originType: 'REJECT_PENYEMAIAN',
      sourceModule: 'PENYEMAIAN',
      status: 'VERIFIED'
    }
  ]);

  const gate = canCreatePreGraftingSelection1Document(sowTx);
  assert.strictEqual(gate.canCreate, true, 'Multiple CULL seluruhnya approved harus ALLOW');
});

// --- IT-CULL-GATE-010 ---
runTest('IT-CULL-GATE-010', 'CULL return -> redeclaration (REVISION -> BLOCK, RE-SUBMIT -> BLOCK, ASB APPROVE -> ALLOW)', () => {
  clearAllStorage();
  const sowTx = {
    id: 'SOW-010',
    docNo: '2026/SOW/010',
    totalDisemai: 1000,
    totalPolybag: 500,
    ditolak: 50
  };
  storage.set('seeding_transactions', [sowTx]);

  // Phase 1: REVISION / DIKEMBALIKAN
  storage.set(SELECTION_STORAGE_KEY, [{
    id: 'CULL-010',
    docNo: '2026/CULL/010',
    sourceDocNo: '2026/SOW/010',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    status: SELECTION_STATUS.DIKEMBALIKAN
  }]);
  let gate1 = canCreatePreGraftingSelection1Document(sowTx);
  assert.strictEqual(gate1.canCreate, false, 'Phase 1: DIKEMBALIKAN harus BLOCKED');

  // Phase 2: Mantri Deklarasi Ulang (re-submit -> MENUNGGU_VERIFIKASI)
  storage.set(SELECTION_STORAGE_KEY, [{
    id: 'CULL-010',
    docNo: '2026/CULL/010',
    sourceDocNo: '2026/SOW/010',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
  }]);
  let gate2 = canCreatePreGraftingSelection1Document(sowTx);
  assert.strictEqual(gate2.canCreate, false, 'Phase 2: Re-submitted harus tetap BLOCKED');

  // Phase 3: Asisten Bibitan menyetujui (DISETUJUI)
  storage.set(SELECTION_STORAGE_KEY, [{
    id: 'CULL-010',
    docNo: '2026/CULL/010',
    sourceDocNo: '2026/SOW/010',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    status: SELECTION_STATUS.DISETUJUI
  }]);
  let gate3 = canCreatePreGraftingSelection1Document(sowTx);
  assert.strictEqual(gate3.canCreate, true, 'Phase 3: Setelah DISETUJUI harus ALLOW');
});

// --- IT-CULL-GATE-011 ---
runTest('IT-CULL-GATE-011', 'Cross-document isolation (SOW-A pending -> BLOCK, SOW-B approved -> ALLOW)', () => {
  clearAllStorage();
  const sowA = {
    id: 'SOW-A',
    docNo: '2026/SOW/A',
    totalDisemai: 1000,
    totalPolybag: 500,
    ditolak: 50
  };
  const sowB = {
    id: 'SOW-B',
    docNo: '2026/SOW/B',
    totalDisemai: 1500,
    totalPolybag: 750,
    ditolak: 30
  };
  storage.set('seeding_transactions', [sowA, sowB]);
  storage.set(SELECTION_STORAGE_KEY, [
    {
      id: 'CULL-A',
      docNo: '2026/CULL/A',
      sourceDocNo: '2026/SOW/A',
      originType: 'REJECT_PENYEMAIAN',
      sourceModule: 'PENYEMAIAN',
      status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
    },
    {
      id: 'CULL-B',
      docNo: '2026/CULL/B',
      sourceDocNo: '2026/SOW/B',
      originType: 'REJECT_PENYEMAIAN',
      sourceModule: 'PENYEMAIAN',
      status: SELECTION_STATUS.DISETUJUI
    }
  ]);

  const gateA = canCreatePreGraftingSelection1Document(sowA);
  const gateB = canCreatePreGraftingSelection1Document(sowB);

  assert.strictEqual(gateA.canCreate, false, 'SOW-A dengan CULL pending harus BLOCKED');
  assert.strictEqual(gateB.canCreate, true, 'SOW-B dengan CULL approved harus ALLOW');

  // Test sync function only creates Seleksi I for SOW-B
  const created = syncAllSeedingsToPreGraftingSelectionDocuments(mockUser);
  assert.strictEqual(created, 1, 'Sync hanya membuat 1 dokumen Seleksi I untuk SOW-B');

  const preDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  assert.strictEqual(preDocs.length, 1);
  assert.strictEqual(preDocs[0].sourceDocNo, '2026/SOW/B');
});

// --- IT-CULL-GATE-012 ---
runTest('IT-CULL-GATE-012', 'Existing Seleksi I document created sebelum gate (CULL pending) -> execution BLOCKED', () => {
  clearAllStorage();
  const sowTx = {
    id: 'SOW-012',
    docNo: '2026/SOW/012',
    totalDisemai: 1000,
    totalPolybag: 500,
    ditolak: 50,
    batchCode: 'B-012'
  };
  storage.set('seeding_transactions', [sowTx]);

  // Simulasikan Dokumen Seleksi I sudah ada di storage dari sebelum gate aktif
  const existingDoc = {
    id: 'SEL-DOC-012',
    docNo: '2026/SEL/012',
    selectionDocNo: '2026/SEL/012',
    selectionStage: 'SELEKSI_I',
    sourceDocNo: '2026/SOW/012',
    seedingDocNo: '2026/SOW/012',
    sourceBibitQty: 1000,
    sourcePolybagQty: 500,
    batchCode: 'B-012',
    status: 'DRAFT'
  };
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [existingDoc]);

  // Tapi CULL-nya masih MENUNGGU_VERIFIKASI
  storage.set(SELECTION_STORAGE_KEY, [{
    id: 'CULL-012',
    docNo: '2026/CULL/012',
    sourceDocNo: '2026/SOW/012',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI
  }]);

  // Eksekusi transaksi Seleksi I harus dicegah oleh Execution Defense Gate
  assert.throws(() => {
    createSeleksi1ExecutionTransaction({
      selectionDocumentId: 'SEL-DOC-012',
      actualPolybagInspectedQty: 100,
      actualBibitSelectedQty: 200,
      bibitAfkir: 5,
      tanggalSeleksi: '2026-10-03'
    }, mockUser);
  }, /Pelaksanaan Seleksi I tidak dapat dilakukan/);

  // Pastikan tidak ada transaksi eksekusi yang tersimpan
  const txs = storage.get(SELECTION_STORAGE_KEY, []).filter(t => t.transactionType === 'PELAKSANAAN_SELEKSI_I');
  assert.strictEqual(txs.length, 0, 'Tidak boleh ada execution transaction yang tercipta');
});

// --- IT-CULL-GATE-013 ---
runTest('IT-CULL-GATE-013', 'Existing Seleksi I document created sebelum gate (CULL approved) -> execution ALLOW', () => {
  clearAllStorage();
  const sowTx = {
    id: 'SOW-013',
    docNo: '2026/SOW/013',
    totalDisemai: 1000,
    totalPolybag: 500,
    ditolak: 50,
    batchCode: 'B-013'
  };
  storage.set('seeding_transactions', [sowTx]);

  const existingDoc = {
    id: 'SEL-DOC-013',
    docNo: '2026/SEL/013',
    selectionDocNo: '2026/SEL/013',
    selectionStage: 'SELEKSI_I',
    sourceDocNo: '2026/SOW/013',
    seedingDocNo: '2026/SOW/013',
    sourceBibitQty: 1000,
    sourcePolybagQty: 500,
    batchCode: 'B-013',
    status: 'DRAFT',
    rows: [{ bedenganId: 'BDG-01', bedenganCode: 'BDG-01', disemai: 1000, polybag: 500 }]
  };
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [existingDoc]);

  // CULL sudah DISETUJUI
  storage.set(SELECTION_STORAGE_KEY, [{
    id: 'CULL-013',
    docNo: '2026/CULL/013',
    sourceDocNo: '2026/SOW/013',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    status: SELECTION_STATUS.DISETUJUI
  }]);

  // Eksekusi harus berhasil
  const execResult = createSeleksi1ExecutionTransaction({
    selectionDocumentId: 'SEL-DOC-013',
    actualPolybagInspectedQty: 100,
    actualBibitSelectedQty: 200,
    bibitAfkir: 5,
    tanggalSeleksi: '2026-10-03',
    bedenganId: 'BDG-01'
  }, mockUser);

  assert.ok(execResult, 'Execution result harus ada');
  assert.strictEqual(execResult.success, true, 'Execution harus berhasil (success === true)');
  assert.strictEqual(execResult.transaction.transactionType, 'PELAKSANAAN_SELEKSI_I');
});

// --- IT-CULL-GATE-014 ---
runTest('IT-CULL-GATE-014', 'Population integrity (sourceBibitQty = SOW.totalDisemai tidak bermutasi)', () => {
  clearAllStorage();
  const sowTx = {
    id: 'SOW-014',
    docNo: '2026/SOW/014',
    totalDisemai: 9000,
    totalPolybag: 4500,
    ditolak: 300,
    batchCode: 'B-014'
  };
  storage.set('seeding_transactions', [sowTx]);
  storage.set(SELECTION_STORAGE_KEY, [{
    id: 'CULL-014',
    docNo: '2026/CULL/014',
    sourceDocNo: '2026/SOW/014',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    status: SELECTION_STATUS.DISETUJUI
  }]);

  const doc = createPreGraftingSelectionDocument(sowTx, mockUser);
  assert.strictEqual(doc.sourceBibitQty, 9000, 'sourceBibitQty harus tetap sama dengan totalDisemai (9000)');
  assert.strictEqual(doc.sourcePolybagQty, 4500, 'sourcePolybagQty harus tetap sama dengan totalPolybag (4500)');
});

// --- IT-CULL-GATE-015 ---
runTest('IT-CULL-GATE-015', 'No storage mutation guarantee during gate check (BEFORE === AFTER)', () => {
  clearAllStorage();
  const sowTx = {
    id: 'SOW-015',
    docNo: '2026/SOW/015',
    totalDisemai: 1000,
    totalPolybag: 500,
    ditolak: 50
  };
  storage.set('seeding_transactions', [sowTx]);

  const beforeSeedings = JSON.stringify(storage.get('seeding_transactions', []));
  const beforePool = JSON.stringify(storage.get('selection_pool', []));
  const beforeSelTxs = JSON.stringify(storage.get(SELECTION_STORAGE_KEY, []));
  const beforePreDocs = JSON.stringify(storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []));

  // Run gate check
  canCreatePreGraftingSelection1Document(sowTx);

  const afterSeedings = JSON.stringify(storage.get('seeding_transactions', []));
  const afterPool = JSON.stringify(storage.get('selection_pool', []));
  const afterSelTxs = JSON.stringify(storage.get(SELECTION_STORAGE_KEY, []));
  const afterPreDocs = JSON.stringify(storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []));

  assert.strictEqual(beforeSeedings, afterSeedings, 'seeding_transactions tidak boleh bermutasi saat evaluasi gate');
  assert.strictEqual(beforePool, afterPool, 'selection_pool tidak boleh bermutasi saat evaluasi gate');
  assert.strictEqual(beforeSelTxs, afterSelTxs, 'selection_transactions tidak boleh bermutasi saat evaluasi gate');
  assert.strictEqual(beforePreDocs, afterPreDocs, 'pre_grafting_selection_documents tidak boleh bermutasi saat evaluasi gate');
});

console.log('======================================================================');
console.log(`TEST SUMMARY: PASS=${passCount}, FAIL=${failCount}, TOTAL=${passCount + failCount}`);
console.log('======================================================================');

if (failCount > 0) {
  process.exit(1);
}
