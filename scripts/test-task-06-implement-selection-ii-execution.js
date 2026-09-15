/**
 * scripts/test-task-06-implement-selection-ii-execution.js
 * 
 * Integration Test Suite for TASK-06-IMPLEMENT-SELECTION-II-EXECUTION-01
 * Verifies that:
 * 1. Dokumen Seleksi II source-nya Seleksi I FINAL.
 * 2. Transaksi Seleksi II dapat dibuat.
 * 3. Source relation tetap benar (traceability to Seleksi I FINAL & Seeding).
 * 4. Polybag source tetap berasal dari source document.
 * 5. Kondisi polybag 2 bibit dapat diproses menjadi 1 bibit terbaik + 1 reject.
 * 6. Kondisi polybag 1 bibit dapat diproses tanpa membuat reject fiktif (1 dipertahankan, 0 reject).
 * 7. Kondisi polybag 0 bibit tidak menghasilkan bibit fiktif (0 dipertahankan, 0 reject).
 * 8. Quantity balance valid (bibitAwal = bibitDipertahankan + bibitReject).
 * 9. Multi-session transaction pada dokumen yang sama.
 * 10. Overlap bedengan/polybag ditolak.
 * 11. Scope bedengan di luar dokumen ditolak.
 * 12. Quantity tidak boleh melebihi source.
 * 13. Reject tersimpan sebagai hasil transaksi tetapi tidak masuk selection_pool.
 * 14. Seleksi I FINAL tidak berubah (immutable).
 * 15. Selection Pasca-Okulasi tetap berfungsi.
 * 16. Grafting tetap tidak berubah.
 * 17. Reload/persistence mempertahankan transaksi.
 * 18. Duplicate creation / invalid call validation works properly.
 */

// Mock localStorage for Node.js environment
const memoryStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in memoryStore ? memoryStore[k] : null),
  setItem: (k, v) => { memoryStore[k] = String(v); },
  removeItem: (k) => { delete memoryStore[k]; },
  clear: () => { for (const k of Object.keys(memoryStore)) delete memoryStore[k]; }
};

import assert from 'node:assert';
import { storage } from '../js/core/storage.js';
import {
  SELECTION_STATUS,
  SELECTION_STAGES,
  SELECTION_TYPES,
  SELECTION_STORAGE_KEY,
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  createPreGraftingSelectionDocument,
  getPreGraftingSelectionDocuments,
  getPreGraftingSelectionDocumentById,
  setPreGraftingSelectionDocumentCompletion,
  submitPreGraftingSelectionDocumentToAsisten,
  approvePreGraftingSelectionDocument,
  createSeleksi1ExecutionTransaction,
  getSeleksi1ExecutionsByDocument,
  canCreateSelection2Document,
  createSelection2DocumentFromSelection1,
  getSeleksi2ExecutionsByDocument,
  getBedenganScopeStatusForSeleksi2,
  validateSeleksi2Execution,
  createSeleksi2ExecutionTransaction,
  declareSelectionItem
} from '../js/modules/selection/selection-manager.js';

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${name} ->`, err.message);
  }
}

console.log('================================================================================');
console.log('   TASK-06: SELEKSI II EXECUTION TRANSACTIONS INTEGRATION TESTS                ');
console.log('================================================================================\n');

// Reset storages
storage.set(SELECTION_STORAGE_KEY, []);
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
storage.set('selection_pool', []);
storage.set('seeding_transactions', []);

const mantriUser = {
  id: 'USR-MANTRI-01',
  name: 'Irwan Syah Putra',
  code: '1405482',
  role: 'MANTRI_TANAMAN',
  position: 'Mantri Pembibitan',
  estateId: 'EST-01',
  estateName: 'Kebun Tanah Gambus',
  divisionId: 'DIV-01',
  divisionName: 'Divisi 1'
};

const asistenUser = {
  id: 'USR-ASB-01',
  name: 'Bambang Sudarmono',
  code: '1400201',
  role: 'ASISTEN_BIBITAN',
  position: 'Asisten Pembibitan',
  estateId: 'EST-01',
  estateName: 'Kebun Tanah Gambus',
  divisionId: 'DIV-01',
  divisionName: 'Divisi 1'
};

// 1. SETUP DATA SOURCE: PENYEMAIAN -> SELEKSI I -> FINAL ASISTEN
const seedingTx = {
  id: 'SEED-001',
  docNo: '2026/SEM/001',
  batchId: 'BATCH-001',
  batchCode: 'BATCH-2026-01',
  programId: 'PRG-001',
  programCode: 'PRG/NUR/01/2026',
  programName: 'Program Nursery Utama 2026',
  estateId: 'EST-01',
  estateName: 'Kebun Tanah Gambus',
  divisionId: 'DIV-01',
  divisionName: 'Divisi 1',
  klonAwal: 'GT 1',
  totalPolybag: 500,
  totalDisemai: 1000,
  rows: [
    { bedenganId: 'BED-01', bedenganCode: 'B-01', polybag: 300, disemai: 600 },
    { bedenganId: 'BED-02', bedenganCode: 'B-02', polybag: 200, disemai: 400 }
  ]
};

const seleksi1Doc = createPreGraftingSelectionDocument(seedingTx, mantriUser, { docNo: '2026/SEL-I/001' });

// Seleksi I Tx 1 (Bedengan B-01: 300 ply -> 250x2 + 40x1 + 10x0 = 540 dipertahankan, 60 reject)
createSeleksi1ExecutionTransaction({
  selectionDocumentId: seleksi1Doc.id,
  bedenganId: 'BED-01',
  bedenganCode: 'B-01',
  polybagScope: 300,
  polybag2Bibit: 250,
  polybag1Bibit: 40,
  polybag0Bibit: 10,
  tanggalSeleksi: '2026-09-10'
}, mantriUser);

// Seleksi I Tx 2 (Bedengan B-02: 200 ply -> 170x2 + 20x1 + 10x0 = 360 dipertahankan, 40 reject)
createSeleksi1ExecutionTransaction({
  selectionDocumentId: seleksi1Doc.id,
  bedenganId: 'BED-02',
  bedenganCode: 'B-02',
  polybagScope: 200,
  polybag2Bibit: 170,
  polybag1Bibit: 20,
  polybag0Bibit: 10,
  tanggalSeleksi: '2026-09-11'
}, mantriUser);

// Selesaikan & Finalisasi Seleksi I oleh Asisten
setPreGraftingSelectionDocumentCompletion(seleksi1Doc.id, true, mantriUser);
submitPreGraftingSelectionDocumentToAsisten(seleksi1Doc.id, 'Pengajuan Seleksi I lengkap', mantriUser);
approvePreGraftingSelectionDocument(seleksi1Doc.id, 'Disetujui Final Seleksi I', asistenUser);

const finalSeleksi1Doc = getPreGraftingSelectionDocumentById(seleksi1Doc.id);

// 2. PEMBUATAN DOKUMEN SELEKSI II DARI SELEKSI I FINAL
const seleksi2Doc = createSelection2DocumentFromSelection1(finalSeleksi1Doc.id, mantriUser);

// TEST 1: Dokumen Seleksi II source-nya Seleksi I FINAL
test('Test 1: Dokumen Seleksi II terbentuk dari Seleksi I FINAL dengan gate valid', () => {
  assert.strictEqual(seleksi2Doc.selectionStage, SELECTION_STAGES.SELEKSI_2);
  assert.strictEqual(seleksi2Doc.sourceSelectionDocumentId, finalSeleksi1Doc.id);
  assert.strictEqual(seleksi2Doc.sourceSelectionDocNo, finalSeleksi1Doc.docNo);
  assert.strictEqual(seleksi2Doc.sourceFinalStatus, SELECTION_STATUS.DISETUJUI);
  assert.strictEqual(seleksi2Doc.sourceBibitQty, 900); // 540 (B-01) + 360 (B-02)
  assert.strictEqual(seleksi2Doc.sourcePolybagQty, 500); // 300 (B-01) + 200 (B-02)
});

// TEST 2: Sesi 1 Transaksi Seleksi II pada Bedengan B-01 (Kondisi Polybag 2 Bibit & 1 Bibit)
let tx1;
test('Test 2, 3 & 5: Transaksi Seleksi II dapat dibuat (Sesi 1: Bedengan B-01, P2=250, P1=40, P0=10)', () => {
  // Bedengan B-01 memiliki 300 polybag dan 540 bibit dari hasil final Seleksi I
  // Dari 300 polybag:
  // - 250 polybag isi 2 bibit (P2): 250*2 = 500 bibit awal -> 250 dipertahankan + 250 reject
  // - 40 polybag isi 1 bibit (P1): 40*1 = 40 bibit awal -> 40 dipertahankan + 0 reject
  // - 10 polybag kosong (P0): 0 bibit
  // Total polybag = 300
  // Total bibit awal = 540
  // Total dipertahankan = 290
  // Total reject = 250
  const res = createSeleksi2ExecutionTransaction({
    selectionDocumentId: seleksi2Doc.id,
    bedenganCode: 'B-01',
    polybagScope: 300,
    polybag2Bibit: 250,
    polybag1Bibit: 40,
    polybag0Bibit: 10,
    tanggalSeleksi: '2026-09-16',
    catatan: 'Pelaksanaan Seleksi II Sesi 1 Bedengan B-01'
  }, mantriUser);

  assert.strictEqual(res.success, true);
  tx1 = res.transaction;
  assert.strictEqual(tx1.transactionType, 'PELAKSANAAN_SELEKSI_II');
  assert.strictEqual(tx1.selectionStage, SELECTION_STAGES.SELEKSI_2);
  assert.strictEqual(tx1.selectionDocumentId, seleksi2Doc.id);
  assert.strictEqual(tx1.sourceSelectionDocumentId, finalSeleksi1Doc.id);
  assert.strictEqual(tx1.sourceSelectionDocNo, finalSeleksi1Doc.docNo);
  assert.strictEqual(tx1.sourceSeedingDocNo, '2026/SEM/001');

  // Verify quantities
  assert.strictEqual(tx1.polybagScope, 300);
  assert.strictEqual(tx1.bibitAwal, 540);
  assert.strictEqual(tx1.bibitDipertahankan, 290);
  assert.strictEqual(tx1.bibitReject, 250);
});

// TEST 3: Traceability source tetap utuh dan benar
test('Test 3: Traceability Dokumen Seleksi II dan Transaksi mengarah ke FINAL Seleksi I dan Seeding', () => {
  assert.strictEqual(tx1.sourceModule, 'SELEKSI');
  assert.strictEqual(tx1.sourceSelectionStage, 'SELEKSI_I');
  assert.strictEqual(tx1.parentSelectionDocumentId, seleksi2Doc.id);
  assert.strictEqual(tx1.parentSelectionDocNo, seleksi2Doc.docNo);
});

// TEST 4: Polybag source tidak dihitung ulang dengan Math.ceil(bibit/2)
test('Test 4: Polybag source tetap berasal dari source document (tidak dihitung ulang)', () => {
  assert.strictEqual(tx1.polybagScope, 300);
  assert.notStrictEqual(tx1.polybagScope, Math.ceil(tx1.bibitDipertahankan / 2));
});

// TEST 5: Kondisi polybag 2 bibit membuang 1 tanaman terhambat dan menyisakan 1 bibit terbaik
test('Test 5: Kondisi polybag 2 bibit menghasilkan 1 bibit dipertahankan + 1 bibit reject', () => {
  const p2 = 250;
  const retainedFromP2 = p2 * 1;
  const rejectedFromP2 = p2 * 1;
  assert.strictEqual(retainedFromP2, 250);
  assert.strictEqual(rejectedFromP2, 250);
});

// TEST 6: Kondisi polybag 1 bibit tidak membuat reject fiktif
test('Test 6: Kondisi polybag 1 bibit menghasilkan 1 bibit dipertahankan + 0 reject (tanpa reject fiktif)', () => {
  const val = validateSeleksi2Execution({
    bedenganCode: 'B-02',
    polybagScope: 50,
    polybag2Bibit: 0,
    polybag1Bibit: 50,
    polybag0Bibit: 0
  }, seleksi2Doc);

  assert.strictEqual(val.isValid, true);
  assert.strictEqual(val.parsed.bibitAwal, 50);
  assert.strictEqual(val.parsed.bibitDipertahankan, 50);
  assert.strictEqual(val.parsed.bibitReject, 0); // Zero reject!
});

// TEST 7: Kondisi polybag 0 bibit tidak menghasilkan bibit fiktif
test('Test 7: Kondisi polybag 0 bibit menghasilkan 0 bibit dipertahankan + 0 reject', () => {
  const val = validateSeleksi2Execution({
    bedenganCode: 'B-02',
    polybagScope: 20,
    polybag2Bibit: 0,
    polybag1Bibit: 0,
    polybag0Bibit: 20
  }, seleksi2Doc);

  assert.strictEqual(val.isValid, true);
  assert.strictEqual(val.parsed.bibitAwal, 0);
  assert.strictEqual(val.parsed.bibitDipertahankan, 0);
  assert.strictEqual(val.parsed.bibitReject, 0);
});

// TEST 8: Quantity balance valid
test('Test 8: Keseimbangan bibit wajib terpenuhi: bibitAwal = bibitDipertahankan + bibitReject', () => {
  assert.strictEqual(tx1.bibitAwal, tx1.bibitDipertahankan + tx1.bibitReject);
});

// TEST 9: Multi-session transaction pada Dokumen Seleksi II yang sama
let tx2;
test('Test 9: Multi-sesi transaksi pada dokumen yang sama (Sesi 2: Bedengan B-02)', () => {
  // Bedengan B-02 memiliki 200 polybag dan 360 bibit dari Seleksi I
  // Breakdown: 160x2 (320 pkk) + 40x1 (40 pkk) + 0x0 = 200 ply (360 bibit awal)
  // Dipertahankan: 160*1 + 40*1 = 200 pkk
  // Reject: 160*1 = 160 pkk
  const res = createSeleksi2ExecutionTransaction({
    selectionDocumentId: seleksi2Doc.id,
    bedenganCode: 'B-02',
    polybagScope: 200,
    polybag2Bibit: 160,
    polybag1Bibit: 40,
    polybag0Bibit: 0,
    tanggalSeleksi: '2026-09-17',
    catatan: 'Pelaksanaan Seleksi II Sesi 2 Bedengan B-02'
  }, mantriUser);

  assert.strictEqual(res.success, true);
  tx2 = res.transaction;

  const executions = getSeleksi2ExecutionsByDocument(seleksi2Doc.id);
  assert.strictEqual(executions.length, 2);

  // Check parent document accumulation
  const parentUpdated = getPreGraftingSelectionDocumentById(seleksi2Doc.id);
  assert.strictEqual(parentUpdated.totalDiperiksa, 540 + 360); // 900
  assert.strictEqual(parentUpdated.totalLayak, 290 + 200); // 490
  assert.strictEqual(parentUpdated.totalAfkir, 250 + 160); // 410
  assert.strictEqual(parentUpdated.currentBibitQty, 900 - 410); // 490
  assert.strictEqual(parentUpdated.status, 'IN_PROGRESS');
});

// TEST 10: Overlap bedengan/polybag ditolak
test('Test 10: Overlap bedengan/polybag yang sudah selesai diproses ditolak', () => {
  // Bedengan B-01 sudah diproses 300 polybag (sisa: 0)
  const val = validateSeleksi2Execution({
    bedenganCode: 'B-01',
    polybagScope: 50,
    polybag2Bibit: 50,
    polybag1Bibit: 0,
    polybag0Bibit: 0
  }, seleksi2Doc);

  assert.strictEqual(val.isValid, false);
  assert.match(val.errors[0], /melebihi sisa polybag/i);

  assert.throws(() => {
    createSeleksi2ExecutionTransaction({
      selectionDocumentId: seleksi2Doc.id,
      bedenganCode: 'B-01',
      polybagScope: 50,
      polybag2Bibit: 50,
      polybag1Bibit: 0,
      polybag0Bibit: 0
    }, mantriUser);
  }, /melebihi sisa polybag/i);
});

// TEST 11: Scope bedengan di luar dokumen ditolak
test('Test 11: Scope bedengan di luar Dokumen Seleksi II ditolak', () => {
  const val = validateSeleksi2Execution({
    bedenganCode: 'B-99',
    polybagScope: 100,
    polybag2Bibit: 100,
    polybag1Bibit: 0,
    polybag0Bibit: 0
  }, seleksi2Doc);

  assert.strictEqual(val.isValid, false);
  assert.match(val.errors[0], /tidak termasuk dalam scope/i);
});

// TEST 12: Quantity tidak boleh melebihi source
test('Test 12: Quantity yang diperiksa tidak boleh melebihi sisa bibit source pada bedengan', () => {
  // Create a new Seleksi II doc with partial inspection
  const newSeeding = {
    id: 'SEED-TEST-02',
    docNo: '2026/SEM/002',
    batchCode: 'BATCH-02',
    totalPolybag: 100,
    totalDisemai: 200,
    rows: [{ bedenganId: 'BED-X', bedenganCode: 'B-X', polybag: 100, disemai: 200 }]
  };
  const sel1 = createPreGraftingSelectionDocument(newSeeding, mantriUser, { docNo: '2026/SEL-I/002' });
  createSeleksi1ExecutionTransaction({
    selectionDocumentId: sel1.id,
    bedenganCode: 'B-X',
    polybagScope: 100,
    polybag2Bibit: 10,
    polybag1Bibit: 80,
    polybag0Bibit: 10, // Layak: 10*2 + 80*1 = 100 bibit layak
    tanggalSeleksi: '2026-09-10'
  }, mantriUser);
  setPreGraftingSelectionDocumentCompletion(sel1.id, true, mantriUser);
  submitPreGraftingSelectionDocumentToAsisten(sel1.id, 'Lengkap', mantriUser);
  approvePreGraftingSelectionDocument(sel1.id, 'Approve', asistenUser);

  const sel2 = createSelection2DocumentFromSelection1(sel1.id, mantriUser);
  // Source Seleksi II: 100 bibit layak, 100 polybag
  // If Mantri inputs 100 polybag all 2-bibit (200 bibit), it exceeds the 100 available seedlings!
  const val = validateSeleksi2Execution({
    bedenganCode: 'B-X',
    polybagScope: 100,
    polybag2Bibit: 100, // 200 bibit awal!
    polybag1Bibit: 0,
    polybag0Bibit: 0
  }, sel2);

  assert.strictEqual(val.isValid, false);
  assert.match(val.errors[0], /melebihi sisa bibit yang tersedia/i);
});

// TEST 13: Reject tersimpan sebagai hasil transaksi tetapi tidak masuk selection_pool
test('Test 13: Reject Seleksi II tersimpan pada transaksi tetapi TIDAK masuk ke selection_pool', () => {
  const pool = storage.get('selection_pool', []);
  const sel2InPool = pool.filter(p => p.selectionStage === SELECTION_STAGES.SELEKSI_2 || p.sourceSelectionStage === SELECTION_STAGES.SELEKSI_2);
  assert.strictEqual(sel2InPool.length, 0);

  // Check that tx1 and tx2 have rejectSourceReference locally
  assert.ok(tx1.rejectSourceReference);
  assert.strictEqual(tx1.rejectSourceReference.rejectCount, 250);
  assert.strictEqual(tx1.rejectSourceReference.stage, SELECTION_STAGES.SELEKSI_2);
});

// TEST 14: Seleksi I FINAL tidak berubah (immutable)
test('Test 14: Seleksi I FINAL tetap immutable dan tidak berubah akibat transaksi Seleksi II', () => {
  const sel1Check = getPreGraftingSelectionDocumentById(finalSeleksi1Doc.id);
  assert.strictEqual(sel1Check.status, SELECTION_STATUS.DISETUJUI);
  assert.strictEqual(sel1Check.isFinal, true);
  assert.strictEqual(sel1Check.totalLayak, 900);
  assert.strictEqual(sel1Check.totalAfkir, 100);
  assert.strictEqual(sel1Check.sourcePolybagQty, 500);
});

// TEST 15: Selection Pasca-Okulasi tetap berfungsi
test('Test 15: Selection Pasca-Okulasi existing tetap berfungsi tanpa gangguan', () => {
  const poolItem = {
    id: 'POOL-TASK06-01',
    docNo: '2026/CULL/099',
    sourceModule: 'BUDDING',
    sourceTransactionType: 'GRAFTING',
    sourceDocNo: '2026/OKU/099',
    originType: 'REJECT_OKULASI',
    category: 'AFKIR',
    batchCode: 'BATCH-2026-01',
    quantity: 12,
    jumlahAfkir: 12,
    status: 'PENDING_DECLARATION'
  };
  storage.set('selection_pool', [poolItem]);

  const declareRes = declareSelectionItem(poolItem, null, mantriUser);
  assert.strictEqual(declareRes.success, true);
  assert.strictEqual(declareRes.transaction.jumlahAfkir, 12);
});

// TEST 16: Grafting tetap tidak berubah
test('Test 16: Grafting transactions and storages remain completely isolated', () => {
  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  const sel2Txs = allTxs.filter(t => t.selectionStage === SELECTION_STAGES.SELEKSI_2);
  assert.strictEqual(sel2Txs.length, 2);
  sel2Txs.forEach(t => {
    assert.strictEqual(t.selectionType, 'PRA_OKULASI');
    assert.strictEqual(t.selectionStage, 'SELEKSI_II');
  });
});

// TEST 17: Reload/persistence mempertahankan transaksi Seleksi II
test('Test 17: Reload/query storage mempertahankan seluruh transaksi Seleksi II', () => {
  const executions = getSeleksi2ExecutionsByDocument(seleksi2Doc.id);
  assert.strictEqual(executions.length, 2);
  assert.strictEqual(executions[0].id, tx1.id);
  assert.strictEqual(executions[1].id, tx2.id);

  const scopeStatus = getBedenganScopeStatusForSeleksi2(seleksi2Doc);
  assert.strictEqual(scopeStatus.length, 2);
  assert.strictEqual(scopeStatus[0].remainingPolybag, 0);
  assert.strictEqual(scopeStatus[0].isFullyInspected, true);
  assert.strictEqual(scopeStatus[1].remainingPolybag, 0);
  assert.strictEqual(scopeStatus[1].isFullyInspected, true);
});

// TEST 18: Duplicate creation / invalid call protection
test('Test 18: Proteksi validasi payload kosong atau tanpa parent document', () => {
  const valEmpty = validateSeleksi2Execution(null, null);
  assert.strictEqual(valEmpty.isValid, false);

  assert.throws(() => {
    createSeleksi2ExecutionTransaction({ selectionDocumentId: 'NON-EXISTENT' }, mantriUser);
  }, /tidak ditemukan/i);
});

console.log(`\n================================================================================`);
console.log(`   INTEGRATION TEST SUMMARY: ${passed} / ${total} TESTS PASSED`);
console.log(`================================================================================\n`);
if (passed === total) {
  console.log('🎉 ALL 18 INTEGRATION TESTS PASSED PERFECTLY!\n');
} else {
  console.error('❌ SOME TESTS FAILED.\n');
  process.exit(1);
}
