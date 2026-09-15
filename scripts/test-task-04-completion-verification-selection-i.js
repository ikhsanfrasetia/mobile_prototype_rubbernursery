/**
 * scripts/test-task-04-completion-verification-selection-i.js
 * 
 * Integration Test Suite for TASK-04-COMPLETION-VERIFICATION-SELECTION-I-01
 * Verifies that:
 * 1. Dokumen Seleksi I default belum selesai (isCompleted = false).
 * 2. Mantri dapat melihat/mengubah checkbox completion.
 * 3. Non-Mantri tidak dapat mengubah completion.
 * 4. Completion dapat disimpan manual oleh Mantri setelah ada transaksi valid.
 * 5. Completion tidak terjadi otomatis setelah transaksi Seleksi I dibuat.
 * 6. completedBy dan completedAt tersimpan dengan benar.
 * 7. Dokumen completed siap direview di Verifikasi Data.
 * 8. Seluruh child transaction Seleksi I dapat ditampilkan.
 * 9. Data source Penyemaian tetap benar.
 * 10. Mantri dapat melakukan review sebelum submit ke Asisten.
 * 11. Submit mengirim Dokumen Seleksi I ke review Asisten (status: MENUNGGU_VERIFIKASI).
 * 12. Asisten dapat melihat seluruh transaksi dan agregat dokumen.
 * 13. Approval Asisten menghasilkan status final (DISETUJUI, isFinal = true).
 * 14. Return Asisten tidak membuat dokumen menjadi final (DIKEMBALIKAN, isFinal = false, isCompleted = false).
 * 15. Dokumen yang belum disetujui Asisten tidak dapat dianggap final.
 * 16. Completion tidak otomatis membuka Seleksi II.
 * 17. Selection Pasca-Okulasi existing tetap bekerja.
 * 18. Reload/persistence tetap mempertahankan state.
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
  validatePreGraftingSelectionCompletion,
  createSeleksi1ExecutionTransaction,
  getSeleksi1ExecutionsByDocument,
  declareSelectionItem,
  integrateSeedingToSelectionPool,
  canPerformAsistenSelectionAction
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
console.log('   TASK-04: SELEKSI I COMPLETION & VERIFICATION INTEGRATION TESTS               ');
console.log('================================================================================\n');

// Reset storages
storage.set(SELECTION_STORAGE_KEY, []);
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
storage.set('selection_pool', []);
storage.set('seeding_transactions', []);
storage.set('verification_transactions', []);
storage.set('budding_transactions', []);

const mockMantri = {
  userId: 'USR-MNT-001',
  code: '1405482',
  name: 'Wagiman',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-01',
  divisionName: 'Divisi I'
};

const mockAsisten = {
  userId: 'USR-ASB-001',
  code: 'ASB-01',
  name: 'Ir. Hendra',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-01',
  divisionName: 'Divisi I'
};

const mockNonMantri = {
  userId: 'USR-KRK-001',
  code: 'KRK-01',
  name: 'Joko',
  role: 'KERANI_TANAMAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-01'
};

// 1. Setup Seeding Source Transaction
const seedingTx = {
  id: 'SEED-2026-001',
  docNo: '2026/SOW/001',
  programId: 'PRG-2026-001',
  programCode: 'PRG/NUR/01/2026',
  programName: 'Program Nursery 2026',
  batchId: 'BATCH-2026-001',
  batchCode: 'Batch-01',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-01',
  divisionName: 'Divisi I',
  clone: 'IRCA 19',
  klon: 'IRCA 19',
  polybagQuantity: 500,
  seedsQuantity: 1000,
  bedenganBreakdown: [
    { bedenganCode: 'BED-001', polybagQuantity: 300, seedsQuantity: 600 },
    { bedenganCode: 'BED-002', polybagQuantity: 200, seedsQuantity: 400 }
  ]
};

let preDoc = null;

// TEST 1: Default Dokumen Seleksi I belum selesai
test('1. Dokumen Seleksi I default isCompleted = false', () => {
  preDoc = createPreGraftingSelectionDocument(seedingTx, mockMantri);
  assert.strictEqual(preDoc.isCompleted, false, 'Default isCompleted should be false');
  assert.strictEqual(preDoc.isFinal, false, 'Default isFinal should be false');
  assert.strictEqual(preDoc.status, 'DRAFT');
});

// TEST 2: Completion cannot be checked when 0 child transactions exist
test('2. Completion tidak bisa dicentang jika belum ada transaksi pelaksanaan', () => {
  assert.throws(() => {
    setPreGraftingSelectionDocumentCompletion(preDoc.id, true, mockMantri);
  }, /belum memiliki transaksi pelaksanaan/i);
  
  const fetched = getPreGraftingSelectionDocumentById(preDoc.id);
  assert.strictEqual(fetched.isCompleted, false);
});

// TEST 3: Non-Mantri cannot change completion
test('3. Non-Mantri tidak dapat mengubah status completion', () => {
  assert.throws(() => {
    setPreGraftingSelectionDocumentCompletion(preDoc.id, true, mockNonMantri);
  }, /Hanya Mantri Bibitan/i);
});

// TEST 4: Create Seleksi I transactions without auto-completion
test('4. Transaksi Seleksi I dapat dibuat dan TIDAK otomatis menyelesaikan dokumen', () => {
  // Session 1: BED-001 (300 polybag)
  const tx1 = createSeleksi1ExecutionTransaction({
    selectionDocumentId: preDoc.id,
    selectionDocNo: preDoc.docNo,
    bedenganCode: 'BED-001',
    polybagScope: 300,
    polybag2Bibit: 280,
    polybag1Bibit: 15,
    polybag0Bibit: 5,
    tanggalSeleksi: '16/09/2026',
    catatan: 'Seleksi I BED-001'
  }, mockMantri);

  assert.strictEqual(tx1.transaction.bibitDipertahankan, 575); // (280*2)+(15*1)
  assert.strictEqual(tx1.transaction.bibitReject, 25); // (15*1)+(5*2)

  // Verify parent doc is NOT auto-completed
  const docAfterTx1 = getPreGraftingSelectionDocumentById(preDoc.id);
  assert.strictEqual(docAfterTx1.isCompleted, false, 'Parent must NOT auto-complete after transaction creation');
  assert.strictEqual(docAfterTx1.status, 'IN_PROGRESS');

  // Session 2: BED-002 (200 polybag)
  const tx2 = createSeleksi1ExecutionTransaction({
    selectionDocumentId: preDoc.id,
    selectionDocNo: preDoc.docNo,
    bedenganCode: 'BED-002',
    polybagScope: 200,
    polybag2Bibit: 190,
    polybag1Bibit: 8,
    polybag0Bibit: 2,
    tanggalSeleksi: '16/09/2026',
    catatan: 'Seleksi I BED-002'
  }, mockMantri);

  assert.strictEqual(tx2.transaction.bibitDipertahankan, 388); // (190*2)+(8*1)
  assert.strictEqual(tx2.transaction.bibitReject, 12); // (8*1)+(2*2)

  // Verify parent doc is still NOT auto-completed even when all bedengan processed
  const docAfterTx2 = getPreGraftingSelectionDocumentById(preDoc.id);
  assert.strictEqual(docAfterTx2.isCompleted, false, 'Parent must NOT auto-complete even if all bedengan processed');
});

// TEST 5: Manual Completion by Mantri
test('5. Mantri dapat menyimpan manual completion dengan audit actor & timestamp', () => {
  const completedDoc = setPreGraftingSelectionDocumentCompletion(preDoc.id, true, mockMantri);
  assert.strictEqual(completedDoc.isCompleted, true);
  assert.ok(completedDoc.completedByUserId);
  assert.strictEqual(completedDoc.completedByName, mockMantri.name);
  assert.ok(completedDoc.completedAt, 'completedAt must be set');
  assert.strictEqual(completedDoc.status, 'COMPLETED');
  assert.strictEqual(completedDoc.isFinal, false, 'isCompleted = true is NOT final');
});

// TEST 6: Completion can be toggled back to false
test('6. Completion dapat dibatalkan kembali (isCompleted = false) oleh Mantri', () => {
  const uncompletedDoc = setPreGraftingSelectionDocumentCompletion(preDoc.id, false, mockMantri);
  assert.strictEqual(uncompletedDoc.isCompleted, false);
  assert.strictEqual(uncompletedDoc.completedAt, null);
  assert.strictEqual(uncompletedDoc.completedByUserId, null);
  assert.strictEqual(uncompletedDoc.status, 'IN_PROGRESS');

  // Re-complete for workflow progression
  setPreGraftingSelectionDocumentCompletion(preDoc.id, true, mockMantri);
});

// TEST 7: Integrity validation on completion
test('7. Validasi integritas data memastikan balancing kuantitas dan relasi', () => {
  const validation = validatePreGraftingSelectionCompletion(preDoc.id);
  assert.strictEqual(validation.isValid, true);
  assert.strictEqual(validation.errors.length, 0);
  assert.strictEqual(validation.childTransactions.length, 2);
});

// TEST 8: Child transactions query and aggregate calculations
test('8. Seluruh child transaction Seleksi I dapat ditampilkan dan dihitung', () => {
  const childTxs = getSeleksi1ExecutionsByDocument(preDoc.id);
  assert.strictEqual(childTxs.length, 2);
  
  const totalDipertahankan = childTxs.reduce((sum, tx) => sum + (tx.bibitDipertahankan || 0), 0);
  const totalReject = childTxs.reduce((sum, tx) => sum + (tx.bibitReject || 0), 0);
  
  assert.strictEqual(totalDipertahankan, 575 + 388); // 963
  assert.strictEqual(totalReject, 25 + 12); // 37
  assert.strictEqual(totalDipertahankan + totalReject, 1000); // Equal to source bibit
});

// TEST 9: Source seeding metadata preserved
test('9. Data source Penyemaian tetap akurat dan tidak termutasi', () => {
  const currentDoc = getPreGraftingSelectionDocumentById(preDoc.id);
  assert.strictEqual(currentDoc.sourceDocNo, '2026/SOW/001');
  assert.strictEqual(currentDoc.sourcePolybagQty, 500);
  assert.strictEqual(currentDoc.sourceBibitQty, 1000);
  assert.strictEqual(currentDoc.totalLayak, 963);
  assert.strictEqual(currentDoc.totalAfkir, 37);
});

// TEST 10: Submission by Mantri to Asisten Bibitan
test('10. Mantri dapat mengajukan Dokumen Seleksi I ke Asisten Bibitan (status: MENUNGGU_VERIFIKASI)', () => {
  const submittedDoc = submitPreGraftingSelectionDocumentToAsisten(preDoc.id, mockMantri);
  assert.strictEqual(submittedDoc.status, SELECTION_STATUS.MENUNGGU_VERIFIKASI);
  assert.ok(submittedDoc.submittedByUserId);
  assert.strictEqual(submittedDoc.submittedByName, mockMantri.name);
  assert.ok(submittedDoc.submittedAt);
  assert.strictEqual(submittedDoc.isFinal, false, 'Submitted doc is not yet final');

  // Verify child transactions also updated
  const childTxs = getSeleksi1ExecutionsByDocument(preDoc.id);
  childTxs.forEach(tx => {
    assert.strictEqual(tx.status, SELECTION_STATUS.MENUNGGU_VERIFIKASI);
  });
});

// TEST 11: Asisten can review submitted document
test('11. Asisten Bibitan dapat melihat dokumen yang menunggu verifikasi', () => {
  const canAct = canPerformAsistenSelectionAction(getPreGraftingSelectionDocumentById(preDoc.id), mockAsisten);
  assert.strictEqual(canAct, true, 'Asisten should have permission to review in-scope document');
});

// TEST 12: Return flow by Asisten
test('12. Asisten Bibitan dapat mengembalikan dokumen ke Mantri (status: DIKEMBALIKAN, isFinal = false, isCompleted = false)', () => {
  const returnedDoc = returnPreGraftingSelectionDocument(preDoc.id, 'Perlu cek ulang bedengan 2', mockAsisten);
  assert.strictEqual(returnedDoc.status, SELECTION_STATUS.DIKEMBALIKAN);
  assert.strictEqual(returnedDoc.isFinal, false);
  assert.strictEqual(returnedDoc.isCompleted, false, 'Return resets isCompleted to false for Mantri revision');
  assert.strictEqual(returnedDoc.returnReason, 'Perlu cek ulang bedengan 2');
  assert.strictEqual(returnedDoc.returnedByName, mockAsisten.name);

  // Child transactions also marked DIKEMBALIKAN
  const childTxs = getSeleksi1ExecutionsByDocument(preDoc.id);
  childTxs.forEach(tx => {
    assert.strictEqual(tx.status, SELECTION_STATUS.DIKEMBALIKAN);
  });
});

// TEST 13: Mantri re-completes and re-submits after return
test('13. Mantri dapat mendeklarasikan ulang completion dan mengirim ulang ke Asisten', () => {
  setPreGraftingSelectionDocumentCompletion(preDoc.id, true, mockMantri);
  const reSubmitted = submitPreGraftingSelectionDocumentToAsisten(preDoc.id, mockMantri);
  assert.strictEqual(reSubmitted.status, SELECTION_STATUS.MENUNGGU_VERIFIKASI);
});

// TEST 14: Asisten Approval establishes FINAL status
test('14. Approval Asisten Bibitan menetapkan status FINAL (DISETUJUI, isFinal = true)', () => {
  const approvedDoc = approvePreGraftingSelectionDocument(preDoc.id, 'Hasil seleksi I diverifikasi lengkap', mockAsisten);
  assert.strictEqual(approvedDoc.status, SELECTION_STATUS.DISETUJUI);
  assert.strictEqual(approvedDoc.isFinal, true, 'isFinal MUST be true upon Asisten approval');
  assert.strictEqual(approvedDoc.verifiedByName, mockAsisten.name);
  assert.ok(approvedDoc.verifiedAt);
  assert.strictEqual(approvedDoc.approvalNotes, 'Hasil seleksi I diverifikasi lengkap');

  // Check child transactions status
  const childTxs = getSeleksi1ExecutionsByDocument(preDoc.id);
  childTxs.forEach(tx => {
    assert.strictEqual(tx.status, SELECTION_STATUS.DISETUJUI);
    assert.strictEqual(tx.verifiedByName, mockAsisten.name);
  });

  // Check audit trail in verification_transactions
  const verifs = storage.get('verification_transactions', []);
  const verifRecord = verifs.filter(v => v.referenceId === preDoc.id).pop();
  assert.ok(verifRecord, 'Verification transaction audit record must exist');
  assert.strictEqual(verifRecord.verificationStatus, 'TERVERIFIKASI');
});

// TEST 15: Non-approved doc cannot be final
test('15. Dokumen yang belum disetujui Asisten tidak dapat dianggap final', () => {
  // Create second doc
  const seedingTx2 = {
    id: 'SEED-2026-002',
    docNo: '2026/SOW/002',
    programId: 'PRG-2026-001',
    batchId: 'BATCH-2026-002',
    batchCode: 'Batch-02',
    estateId: 'EST-TBS',
    divisionId: 'DIV-01',
    clone: 'PB 260',
    polybagQuantity: 100,
    seedsQuantity: 200,
    bedenganBreakdown: [{ bedenganCode: 'BED-003', polybagQuantity: 100, seedsQuantity: 200 }]
  };
  const doc2 = createPreGraftingSelectionDocument(seedingTx2, mockMantri);
  createSeleksi1ExecutionTransaction({
    selectionDocumentId: doc2.id,
    selectionDocNo: doc2.docNo,
    bedenganCode: 'BED-003',
    polybagScope: 100,
    polybag2Bibit: 95,
    polybag1Bibit: 5,
    polybag0Bibit: 0,
    tanggalSeleksi: '16/09/2026'
  }, mockMantri);

  setPreGraftingSelectionDocumentCompletion(doc2.id, true, mockMantri);
  const fetchedDoc2 = getPreGraftingSelectionDocumentById(doc2.id);
  assert.strictEqual(fetchedDoc2.isCompleted, true);
  assert.strictEqual(fetchedDoc2.isFinal, false, 'Completed doc without Asisten approval is NOT final');
});

// TEST 16: Completion does NOT open Seleksi II
test('16. Completion Seleksi I tidak otomatis membuka / membuat Dokumen Seleksi II', () => {
  const allDocs = getPreGraftingSelectionDocuments({}, mockMantri);
  const seleksi2Docs = allDocs.filter(d => d.stage === 'SELEKSI_2' || d.selectionStage === 'SELEKSI_2');
  assert.strictEqual(seleksi2Docs.length, 0, 'No Seleksi II document should be created');
});

// TEST 17: Post-Grafting Selection compatibility
test('17. Selection Pasca-Okulasi existing tetap berfungsi tanpa gangguan', () => {
  const poolItem = {
    id: 'CUL-PST-001',
    docNo: '2026/CULL/001',
    batchId: 'BATCH-2026-001',
    batchCode: 'Batch-01',
    bedengan: 'BED-001',
    jumlahAfkir: 10,
    sourceTransactionType: 'BUDDING',
    sourceModule: 'OKULASI',
    sourceDocNo: '2026/OKU/001',
    status: 'PENDING_DECLARATION'
  };
  storage.set('selection_pool', [poolItem]);

  const declared = declareSelectionItem(poolItem, { photoUrl: 'data:image/jpeg;base64,123' }, mockMantri);
  assert.ok(declared.transaction);
  assert.strictEqual(declared.transaction.jumlahAfkir, 10);
  assert.strictEqual(declared.transaction.selectionType, SELECTION_TYPES.PASCA_OKULASI);
});

// TEST 18: Reload & persistence integrity
test('18. Reload / storage persistence mempertahankan status final dan audit trail', () => {
  const persistedDoc = getPreGraftingSelectionDocumentById(preDoc.id);
  assert.strictEqual(persistedDoc.isFinal, true);
  assert.strictEqual(persistedDoc.status, SELECTION_STATUS.DISETUJUI);
  assert.strictEqual(persistedDoc.totalLayak, 963);
  assert.strictEqual(persistedDoc.totalAfkir, 37);

  const executions = getSeleksi1ExecutionsByDocument(preDoc.id);
  assert.strictEqual(executions.length, 2);
});

console.log('\n--------------------------------------------------------------------------------');
console.log(`TEST RESULTS: ${passed} / ${total} passed`);
console.log('--------------------------------------------------------------------------------\n');

if (passed === total) {
  console.log('🎉 ALL TASK-04 INTEGRATION TESTS PASSED PERFECTLY!\n');
  process.exit(0);
} else {
  console.error('💥 SOME TESTS FAILED!\n');
  process.exit(1);
}
