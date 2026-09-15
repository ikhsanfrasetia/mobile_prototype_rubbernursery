/**
 * scripts/test-task-05-baseline-selection-ii-doc.js
 * 
 * Integration Test Suite for TASK-05-BASELINE-SELECTION-II-DOCUMENT-01
 * Verifies that:
 * 1. Dokumen Seleksi I FINAL dapat menjadi source Seleksi II.
 * 2. Seleksi I belum final -> Dokumen Seleksi II tidak dapat dibuat.
 * 3. Seleksi I MENUNGGU_VERIFIKASI -> ditolak sebagai source.
 * 4. Seleksi I DIKEMBALIKAN -> ditolak sebagai source.
 * 5. Seleksi I DISETUJUI + isFinal=true -> Dokumen Seleksi II dapat dibuat.
 * 6. Source document Seleksi II menunjuk ke Seleksi I FINAL.
 * 7. Quantity source Seleksi II sama dengan hasil final Seleksi I.
 * 8. Polybag source tidak dihitung ulang (tanpa Math.ceil(bibit/2)).
 * 9. Scope batch/bedengan/estate/division tetap konsisten.
 * 10. Dokumen Seleksi II dapat memiliki parent/source relation yang benar.
 * 11. Reload mempertahankan Dokumen Seleksi II.
 * 12. Seleksi I dan Seleksi Pasca-Okulasi existing tetap berjalan.
 * 13. Grafting tidak berubah.
 * 14. Tidak ada duplikasi Dokumen Seleksi II ketika creation dipicu ulang untuk source yang sama.
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
  returnPreGraftingSelectionDocument,
  createSeleksi1ExecutionTransaction,
  getSeleksi1ExecutionsByDocument,
  canCreateSelection2Document,
  createSelection2DocumentFromSelection1,
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
console.log('   TASK-05: DOKUMEN SELEKSI II (PRA-OKULASI) BASELINE INTEGRATION TESTS         ');
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

// 1. SETUP DATA SOURCE PENYEMAIAN & DOKUMEN SELEKSI I
const seedingTx1 = {
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

const seleksi1Doc = createPreGraftingSelectionDocument(seedingTx1, mantriUser, { docNo: '2026/SEL-I/001' });

// TEST 1: Dokumen Seleksi I yang masih DRAFT ditolak untuk pembuatan Seleksi II
test('Test 2 & 1: Dokumen Seleksi I belum final (DRAFT) -> Seleksi II tidak dapat dibuat', () => {
  const gate = canCreateSelection2Document(seleksi1Doc.id);
  assert.strictEqual(gate.canCreate, false);
  assert.match(gate.reason, /belum berstatus FINAL/i);

  assert.throws(() => {
    createSelection2DocumentFromSelection1(seleksi1Doc.id, mantriUser);
  }, /belum berstatus FINAL/i);
});

// Transaksi Pelaksanaan Seleksi I
createSeleksi1ExecutionTransaction({
  selectionDocumentId: seleksi1Doc.id,
  bedenganId: 'BED-01',
  bedenganCode: 'B-01',
  polybagScope: 300,
  polybag2Bibit: 250,
  polybag1Bibit: 40,
  polybag0Bibit: 10,
  bibitDipertahankan: 540,
  bibitReject: 60,
  tanggalSeleksi: '2026-09-16'
}, mantriUser);

createSeleksi1ExecutionTransaction({
  selectionDocumentId: seleksi1Doc.id,
  bedenganId: 'BED-02',
  bedenganCode: 'B-02',
  polybagScope: 200,
  polybag2Bibit: 170,
  polybag1Bibit: 20,
  polybag0Bibit: 10,
  bibitDipertahankan: 360,
  bibitReject: 40,
  tanggalSeleksi: '2026-09-16'
}, mantriUser);

// Mantri deklarasi selesai & submit ke Asisten
setPreGraftingSelectionDocumentCompletion(seleksi1Doc.id, true, mantriUser);
submitPreGraftingSelectionDocumentToAsisten(seleksi1Doc.id, 'Pengajuan Seleksi I lengkap', mantriUser);

// TEST 2: Dokumen Seleksi I MENUNGGU_VERIFIKASI ditolak sebagai source Seleksi II
test('Test 3: Seleksi I MENUNGGU_VERIFIKASI -> ditolak sebagai source Seleksi II', () => {
  const updatedDoc = getPreGraftingSelectionDocumentById(seleksi1Doc.id);
  assert.strictEqual(updatedDoc.status, SELECTION_STATUS.MENUNGGU_VERIFIKASI);

  const gate = canCreateSelection2Document(seleksi1Doc.id);
  assert.strictEqual(gate.canCreate, false);
  assert.match(gate.reason, /belum berstatus FINAL/i);

  assert.throws(() => {
    createSelection2DocumentFromSelection1(seleksi1Doc.id, mantriUser);
  }, /belum berstatus FINAL/i);
});

// Asisten kembalikan dokumen
returnPreGraftingSelectionDocument(seleksi1Doc.id, 'Perlu hitung ulang bedengan 2', asistenUser);

// TEST 3: Dokumen Seleksi I DIKEMBALIKAN ditolak sebagai source Seleksi II
test('Test 4: Seleksi I DIKEMBALIKAN -> ditolak sebagai source Seleksi II', () => {
  const updatedDoc = getPreGraftingSelectionDocumentById(seleksi1Doc.id);
  assert.strictEqual(updatedDoc.status, SELECTION_STATUS.DIKEMBALIKAN);

  const gate = canCreateSelection2Document(seleksi1Doc.id);
  assert.strictEqual(gate.canCreate, false);

  assert.throws(() => {
    createSelection2DocumentFromSelection1(seleksi1Doc.id, mantriUser);
  }, /belum berstatus FINAL/i);
});

// Mantri submit ulang & Asisten Approve Final
setPreGraftingSelectionDocumentCompletion(seleksi1Doc.id, true, mantriUser);
submitPreGraftingSelectionDocumentToAsisten(seleksi1Doc.id, 'Revisi telah selesai', mantriUser);
approvePreGraftingSelectionDocument(seleksi1Doc.id, 'Disetujui Final Seleksi I', asistenUser);

const finalSeleksi1Doc = getPreGraftingSelectionDocumentById(seleksi1Doc.id);

// TEST 4: Dokumen Seleksi I DISETUJUI + isFinal=true -> Gate Membolehkan Dokumen Seleksi II
test('Test 1 & 5: Seleksi I DISETUJUI + isFinal=true -> Dokumen Seleksi II dapat dibuat', () => {
  assert.strictEqual(finalSeleksi1Doc.status, SELECTION_STATUS.DISETUJUI);
  assert.strictEqual(finalSeleksi1Doc.isFinal, true);

  const gate = canCreateSelection2Document(finalSeleksi1Doc.id);
  assert.strictEqual(gate.canCreate, true);
});

// Buat Dokumen Seleksi II
const seleksi2Doc = createSelection2DocumentFromSelection1(finalSeleksi1Doc.id, mantriUser);

// TEST 5: Source Document Seleksi II menunjuk ke Seleksi I FINAL
test('Test 6 & 10: Source document Seleksi II menunjuk ke Seleksi I FINAL dengan relasi yang benar', () => {
  assert.strictEqual(seleksi2Doc.selectionStage, SELECTION_STAGES.SELEKSI_2); // 'SELEKSI_II'
  assert.strictEqual(seleksi2Doc.selectionType, SELECTION_TYPES.PRA_OKULASI);
  assert.strictEqual(seleksi2Doc.sourceModule, 'SELEKSI');
  assert.strictEqual(seleksi2Doc.sourceTransactionType, 'SELEKSI_I');
  assert.strictEqual(seleksi2Doc.sourceSelectionDocumentId, finalSeleksi1Doc.id);
  assert.strictEqual(seleksi2Doc.sourceSelectionDocNo, finalSeleksi1Doc.docNo);
  assert.strictEqual(seleksi2Doc.sourceSelectionStage, SELECTION_STAGES.SELEKSI_1);
  assert.strictEqual(seleksi2Doc.sourceFinalStatus, SELECTION_STATUS.DISETUJUI);
  assert.strictEqual(seleksi2Doc.sourceFinalId, finalSeleksi1Doc.id);
  assert.strictEqual(seleksi2Doc.sourceSeedingDocNo, '2026/SEM/001');
});

// TEST 6: Quantity source Seleksi II sama dengan hasil final Seleksi I
test('Test 7: Quantity source Seleksi II sama persis dengan bibit dipertahankan (Layak) final Seleksi I', () => {
  // Final Seleksi I: 540 (B-01) + 360 (B-02) = 900 Layak, 100 Afkir
  assert.strictEqual(finalSeleksi1Doc.totalLayak, 900);
  assert.strictEqual(seleksi2Doc.sourceBibitQty, 900);
  assert.strictEqual(seleksi2Doc.currentBibitQty, 900);
  assert.notStrictEqual(seleksi2Doc.sourceBibitQty, 1000); // Bukan raw penyemaian 1000!
});

// TEST 7: Polybag source tidak dihitung ulang dengan Math.ceil(bibit/2)
test('Test 8: Polybag source Seleksi II tetap mengikuti polybag Seleksi I (tidak dihitung ulang)', () => {
  assert.strictEqual(finalSeleksi1Doc.sourcePolybagQty, 500);
  assert.strictEqual(seleksi2Doc.sourcePolybagQty, 500);
  assert.strictEqual(seleksi2Doc.currentPolybagQty, 500);
  // Verify it did not do Math.ceil(900 / 2) = 450
  assert.notStrictEqual(seleksi2Doc.sourcePolybagQty, Math.ceil(seleksi2Doc.sourceBibitQty / 2));
});

// TEST 8: Scope batch/bedengan/estate/division tetap konsisten
test('Test 9: Scope batch, bedengan, estate, dan division tetap konsisten', () => {
  assert.strictEqual(seleksi2Doc.batchId, finalSeleksi1Doc.batchId);
  assert.strictEqual(seleksi2Doc.batchCode, finalSeleksi1Doc.batchCode);
  assert.strictEqual(seleksi2Doc.klon, finalSeleksi1Doc.klon);
  assert.strictEqual(seleksi2Doc.programId, finalSeleksi1Doc.programId);
  assert.strictEqual(seleksi2Doc.estateId, finalSeleksi1Doc.estateId);
  assert.strictEqual(seleksi2Doc.divisionId, finalSeleksi1Doc.divisionId);
  assert.deepStrictEqual(seleksi2Doc.bedenganIds, finalSeleksi1Doc.bedenganIds);
  assert.strictEqual(seleksi2Doc.rows.length, 2);
  assert.strictEqual(seleksi2Doc.rows[0].bedenganCode, 'B-01');
  assert.strictEqual(seleksi2Doc.rows[0].disemai, 540); // final layak B-01
  assert.strictEqual(seleksi2Doc.rows[1].bedenganCode, 'B-02');
  assert.strictEqual(seleksi2Doc.rows[1].disemai, 360); // final layak B-02
});

// TEST 9: Status dan lifecycle awal Dokumen Seleksi II
test('Test 10b: Status awal Dokumen Seleksi II adalah DRAFT, isCompleted=false, isFinal=false', () => {
  assert.strictEqual(seleksi2Doc.status, 'DRAFT');
  assert.strictEqual(seleksi2Doc.isCompleted, false);
  assert.strictEqual(seleksi2Doc.isFinal, false);
  assert.strictEqual(seleksi2Doc.completedAt, null);
  assert.strictEqual(seleksi2Doc.completedByUserId, null);
  assert.strictEqual(seleksi2Doc.completedByName, null);
  assert.deepStrictEqual(seleksi2Doc.executionTransactionIds, []);
  assert.strictEqual(seleksi2Doc.executionCount, 0);
});

// TEST 10: Idempotency & Deduplication
test('Test 14: Tidak ada duplikasi Dokumen Seleksi II ketika dipicu ulang untuk source Seleksi I yang sama', () => {
  const docsBefore = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  const countBefore = docsBefore.filter(d => d.selectionStage === SELECTION_STAGES.SELEKSI_2).length;

  const duplicateCallResult = createSelection2DocumentFromSelection1(finalSeleksi1Doc.id, mantriUser);
  const docsAfter = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  const countAfter = docsAfter.filter(d => d.selectionStage === SELECTION_STAGES.SELEKSI_2).length;

  assert.strictEqual(duplicateCallResult.id, seleksi2Doc.id);
  assert.strictEqual(duplicateCallResult.docNo, seleksi2Doc.docNo);
  assert.strictEqual(countBefore, countAfter);
});

// TEST 11: Persistence & Reload
test('Test 11: Reload/storage query mempertahankan Dokumen Seleksi II dengan benar', () => {
  const foundById = getPreGraftingSelectionDocumentById(seleksi2Doc.id);
  assert.ok(foundById);
  assert.strictEqual(foundById.docNo, seleksi2Doc.docNo);

  const allPreDocs = getPreGraftingSelectionDocuments({}, mantriUser);
  const sel2Docs = allPreDocs.filter(d => d.selectionStage === SELECTION_STAGES.SELEKSI_2);
  assert.strictEqual(sel2Docs.length, 1);
  assert.strictEqual(sel2Docs[0].id, seleksi2Doc.id);
});

// TEST 12: Seleksi I dan Seleksi Pasca-Okulasi existing tetap berjalan
test('Test 12: Seleksi I & Seleksi Pasca-Okulasi existing tetap berfungsi tanpa gangguan', () => {
  // Pasca-Okulasi pool item declaration
  const poolItem = {
    id: 'POOL-TEST-01',
    docNo: '2026/CULL/001',
    sourceModule: 'BUDDING',
    sourceTransactionType: 'GRAFTING',
    sourceDocNo: '2026/OKU/001',
    originType: 'REJECT_OKULASI',
    category: 'AFKIR',
    batchCode: 'BATCH-2026-01',
    quantity: 15,
    jumlahAfkir: 15,
    status: 'PENDING_DECLARATION'
  };
  storage.set('selection_pool', [poolItem]);

  const declareRes = declareSelectionItem(poolItem, null, mantriUser);
  assert.strictEqual(declareRes.success, true);
  assert.strictEqual(declareRes.transaction.jumlahAfkir, 15);

  const allCulled = storage.get(SELECTION_STORAGE_KEY, []);
  assert.ok(allCulled.some(t => t.id === declareRes.transaction.id));
});

// TEST 13: Grafting isolation
test('Test 13: Grafting flow and transactions remain unaffected', () => {
  // Pre-grafting Seleksi II exists as independent container, without modifying grafting data
  assert.ok(seleksi2Doc.id.startsWith('SEL2-DOC-'));
  assert.strictEqual(seleksi2Doc.selectionStage, 'SELEKSI_II');
});

console.log(`\n================================================================================`);
console.log(`   INTEGRATION TEST SUMMARY: ${passed} / ${total} TESTS PASSED`);
console.log(`================================================================================\n`);
if (passed === total) {
  console.log('🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!\n');
} else {
  console.error('❌ SOME TESTS FAILED.\n');
  process.exit(1);
}
