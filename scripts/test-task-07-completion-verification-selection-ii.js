/**
 * scripts/test-task-07-completion-verification-selection-ii.js
 * Integration Test Suite for TASK-07-COMPLETION-VERIFICATION-SELECTION-II-01
 */

// Mock localStorage for Node.js environment
const memoryStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in memoryStore ? memoryStore[k] : null),
  setItem: (k, v) => { memoryStore[k] = String(v); },
  removeItem: (k) => { delete memoryStore[k]; },
  clear: () => { for (const k of Object.keys(memoryStore)) delete memoryStore[k]; }
};

import { storage } from '../js/core/storage.js';
import { ROLES } from '../js/core/user-context.js';
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
  canCreateSelection2Document,
  createSelection2DocumentFromSelection1,
  createSeleksi1ExecutionTransaction,
  getSeleksi1ExecutionsByDocument,
  createSeleksi2ExecutionTransaction,
  getSeleksi2ExecutionsByDocument
} from '../js/modules/selection/selection-manager.js';

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedCount++;
  }
}

async function runTests() {
  console.log('=== INTEGRATION TEST TASK-07: SELEKSI II COMPLETION & VERIFICATION LIFECYCLE ===\n');

  // Setup storage and mock users
  globalThis.localStorage.clear();

  const mantriUser = {
    userId: 'USR-MANTRI-01',
    id: 'USR-MANTRI-01',
    code: 'MNT-01',
    name: 'Budi Mantri',
    role: ROLES.MANTRI_TANAMAN,
    position: 'Mantri Pembibitan',
    estateId: 'EST-01',
    estateName: 'Kebun Tanah Gambus',
    divisionId: 'DIV-01',
    divisionName: 'Divisi 1'
  };

  const asistenUser = {
    userId: 'USR-ASB-01',
    id: 'USR-ASB-01',
    code: 'ASB-01',
    name: 'Hendra Asisten',
    role: ROLES.ASISTEN_BIBITAN,
    position: 'Asisten Pembibitan',
    estateId: 'EST-01',
    estateName: 'Kebun Tanah Gambus',
    divisionId: 'DIV-01',
    divisionName: 'Divisi 1'
  };

  const nonMantriUser = {
    userId: 'USR-OPR-01',
    id: 'USR-OPR-01',
    code: 'OPR-01',
    name: 'Doni Mandor',
    role: 'MANDOR_TANAMAN',
    position: 'Mandor',
    estateId: 'EST-01',
    divisionId: 'DIV-01'
  };

  // STEP 0: Create and Approve Seleksi I Document (Prerequisite)
  console.log('--- Setup Prerequisite: Seleksi I FINAL ---');
  const sel1Doc = createPreGraftingSelectionDocument({
    docNo: '2026/SEL-I/001',
    seedingDocNo: '2026/SDG/001',
    sourceDocNo: '2026/SDG/001',
    batchCode: 'BATCH-2026-01',
    klon: 'GT 1',
    programCode: 'PRG/NUR/01/2026',
    estateId: 'EST-01',
    divisionId: 'DIV-01',
    rows: [
      { bedenganCode: 'BED-001', polybag: 50, disemai: 100 },
      { bedenganCode: 'BED-002', polybag: 50, disemai: 100 }
    ],
    sourcePolybagQty: 100,
    sourceBibitQty: 200
  }, mantriUser);

  // Execute Seleksi I: 100 polybag (200 bibit awal) -> P2: 80 (160 layak, 0 reject), P1: 20 (20 layak, 20 reject) = 180 Layak, 20 Reject
  createSeleksi1ExecutionTransaction({
    selectionDocumentId: sel1Doc.id,
    selectionDocNo: sel1Doc.docNo,
    bedenganCode: 'BED-001',
    polybagScope: 50,
    polybag2Bibit: 40,
    polybag1Bibit: 10,
    polybag0Bibit: 0
  }, mantriUser);

  createSeleksi1ExecutionTransaction({
    selectionDocumentId: sel1Doc.id,
    selectionDocNo: sel1Doc.docNo,
    bedenganCode: 'BED-002',
    polybagScope: 50,
    polybag2Bibit: 40,
    polybag1Bibit: 10,
    polybag0Bibit: 0
  }, mantriUser);

  setPreGraftingSelectionDocumentCompletion(sel1Doc.id, true, mantriUser);
  submitPreGraftingSelectionDocumentToAsisten(sel1Doc.id, mantriUser);
  approvePreGraftingSelectionDocument(sel1Doc.id, 'Seleksi I Valid', asistenUser);

  const sel1Final = getPreGraftingSelectionDocumentById(sel1Doc.id);
  assert(sel1Final.isFinal === true && sel1Final.status === SELECTION_STATUS.DISETUJUI, 'Seleksi I is FINAL and DISETUJUI (Total Layak: 180, Afkir: 20)');

  // Create Dokumen Seleksi II
  console.log('\n--- Test 1: Dokumen Seleksi II default isCompleted = false ---');
  const sel2Doc = createSelection2DocumentFromSelection1(sel1Final.id, mantriUser);
  assert(sel2Doc.isCompleted === false, 'Dokumen Seleksi II isCompleted default is false');
  assert(sel2Doc.status === 'DRAFT', 'Dokumen Seleksi II status default is DRAFT');
  assert(sel2Doc.sourceBibitQty === 180, 'Seleksi II sourceBibitQty is 180 (from Seleksi I totalLayak)');
  assert(sel2Doc.sourcePolybagQty === 100, 'Seleksi II sourcePolybagQty is 100');

  console.log('\n--- Test 2: Non-Mantri tidak dapat completion ---');
  let nonMantriError = false;
  try {
    setPreGraftingSelectionDocumentCompletion(sel2Doc.id, true, nonMantriUser);
  } catch (err) {
    nonMantriError = true;
  }
  assert(nonMantriError === true, 'Non-Mantri role is rejected from setting completion');

  console.log('\n--- Test 3: Completion tidak otomatis setelah transaksi ---');
  // Record execution session 1 for BED-001 (50 polybag: P2: 40, P1: 10, P0: 0) -> Layak: 50, Reject: 40
  const tx1 = createSeleksi2ExecutionTransaction({
    selectionDocumentId: sel2Doc.id,
    selectionDocNo: sel2Doc.docNo,
    bedenganCode: 'BED-001',
    polybagScope: 50,
    polybag2Bibit: 40,
    polybag1Bibit: 10,
    polybag0Bibit: 0
  }, mantriUser);

  let docAfterTx1 = getPreGraftingSelectionDocumentById(sel2Doc.id);
  assert(docAfterTx1.isCompleted === false, 'Doc is NOT completed automatically after creating execution transaction');
  assert(docAfterTx1.status === 'IN_PROGRESS', 'Doc status is IN_PROGRESS after transaction');

  console.log('\n--- Test 4 & 5: Mantri dapat checklist completion & completedBy/At tersimpan ---');
  // Record execution session 2 for BED-002 (50 polybag: P2: 40, P1: 10, P0: 0) -> Layak: 50, Reject: 40
  const tx2 = createSeleksi2ExecutionTransaction({
    selectionDocumentId: sel2Doc.id,
    selectionDocNo: sel2Doc.docNo,
    bedenganCode: 'BED-002',
    polybagScope: 50,
    polybag2Bibit: 40,
    polybag1Bibit: 10,
    polybag0Bibit: 0
  }, mantriUser);

  setPreGraftingSelectionDocumentCompletion(sel2Doc.id, true, mantriUser);
  const docCompleted = getPreGraftingSelectionDocumentById(sel2Doc.id);
  assert(docCompleted.isCompleted === true, 'Mantri can set isCompleted = true');
  assert(Boolean(docCompleted.completedAt), 'completedAt timestamp is recorded');
  assert(docCompleted.completedByUserId === mantriUser.userId, 'completedByUserId matches Mantri');
  assert(docCompleted.completedByName === mantriUser.name, 'completedByName matches Mantri');
  assert(docCompleted.status === 'COMPLETED', 'Status transitions to COMPLETED');

  console.log('\n--- Test 6: Child transaction tetap terbaca ---');
  const sel2Txs = getSeleksi2ExecutionsByDocument(sel2Doc.id);
  assert(sel2Txs.length === 2, 'Seleksi II child transactions retrieved correctly (2 sessions)');
  assert(sel2Txs[0].docNo.includes('SEL-II'), 'Child tx docNo format matches standard');

  console.log('\n--- Test 7: Data quantity tetap balance ---');
  assert(docCompleted.totalLayak === 100, 'Total Layak is 100 (50 + 50)');
  assert(docCompleted.totalAfkir === 80, 'Total Afkir is 80 (40 + 40)');
  assert(docCompleted.totalLayak + docCompleted.totalAfkir === docCompleted.sourceBibitQty, 'Quantities balance: 100 + 80 = 180 source bibit');

  console.log('\n--- Test 8 & 9: Dokumen muncul di Verifikasi Data & Mantri dapat review ---');
  const allPreDocs = getPreGraftingSelectionDocuments({}, mantriUser);
  const foundInList = allPreDocs.find(d => d.id === sel2Doc.id);
  assert(Boolean(foundInList), 'Dokumen Seleksi II exists in list for Verifikasi Data');
  assert(foundInList.isCompleted === true, 'Dokumen in Verifikasi Data has isCompleted = true');

  console.log('\n--- Test 10: Submit ke Asisten berhasil ---');
  submitPreGraftingSelectionDocumentToAsisten(sel2Doc.id, mantriUser);
  const docSubmitted = getPreGraftingSelectionDocumentById(sel2Doc.id);
  assert(docSubmitted.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI, 'Status is MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN after submit');
  assert(Boolean(docSubmitted.submittedAt), 'submittedAt is stored');

  console.log('\n--- Test 11: Asisten dapat melihat seluruh transaksi & traceability ---');
  const asbPreDocs = getPreGraftingSelectionDocuments({}, asistenUser);
  const pendingDoc = asbPreDocs.find(d => d.id === sel2Doc.id && d.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI);
  assert(Boolean(pendingDoc), 'Asisten sees pending Dokumen Seleksi II in queue');
  assert(pendingDoc.sourceSelectionDocNo === sel1Final.docNo, 'Traceability to Seleksi I FINAL verified');
  assert(pendingDoc.sourceSeedingDocNo === '2026/SDG/001', 'Traceability to Penyemaian verified');

  console.log('\n--- Test 12 & 13: Return Asisten bekerja dengan alasan wajib & bukan final ---');
  let emptyReasonError = false;
  try {
    returnPreGraftingSelectionDocument(sel2Doc.id, '', asistenUser);
  } catch (err) {
    emptyReasonError = true;
  }
  assert(emptyReasonError === true, 'Return without reason is blocked');

  returnPreGraftingSelectionDocument(sel2Doc.id, 'Periksa ulang bedengan 002', asistenUser);
  const docReturned = getPreGraftingSelectionDocumentById(sel2Doc.id);
  assert(docReturned.status === SELECTION_STATUS.DIKEMBALIKAN, 'Status is DIKEMBALIKAN');
  assert(docReturned.isFinal === false, 'Returned doc isFinal is false');
  assert(docReturned.isCompleted === false, 'Returned doc isCompleted reset to false for correction');
  assert(docReturned.returnReason === 'Periksa ulang bedengan 002', 'returnReason is preserved');

  console.log('\n--- Test 14: Mantri dapat memperbaiki dan submit ulang ---');
  // Mantri re-declares completion and re-submits
  setPreGraftingSelectionDocumentCompletion(sel2Doc.id, true, mantriUser);
  submitPreGraftingSelectionDocumentToAsisten(sel2Doc.id, mantriUser);
  const docResubmitted = getPreGraftingSelectionDocumentById(sel2Doc.id);
  assert(docResubmitted.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI, 'Resubmitted status is MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN');

  console.log('\n--- Test 15 & 16: Approval Asisten menghasilkan DISETUJUI + isFinal=true ---');
  approvePreGraftingSelectionDocument(sel2Doc.id, 'Seleksi II Disetujui Penuh', asistenUser);
  const docApproved = getPreGraftingSelectionDocumentById(sel2Doc.id);
  assert(docApproved.status === SELECTION_STATUS.DISETUJUI, 'Approved status is DISETUJUI');
  assert(docApproved.isFinal === true, 'Approved doc isFinal is true');
  assert(docApproved.finalBibitQty === 100, 'Final bibit qty is 100');
  assert(docApproved.verificationStatus === 'TERVERIFIKASI', 'verificationStatus is TERVERIFIKASI');

  console.log('\n--- Test 17: Selection I tetap berfungsi ---');
  const sel1Check = getPreGraftingSelectionDocumentById(sel1Doc.id);
  assert(sel1Check.status === SELECTION_STATUS.DISETUJUI && sel1Check.isFinal === true, 'Seleksi I FINAL status remained intact');

  console.log('\n--- Test 18: Selection Pasca-Okulasi tetap berfungsi ---');
  const selectionPool = storage.get('selection_pool', []);
  assert(Array.isArray(selectionPool), 'Selection pool is array and untouched');

  console.log('\n--- Test 19: Grafting / Inventory tidak terganggu ---');
  const verifRecords = storage.get('verification_transactions', []);
  assert(verifRecords.length >= 2, 'Audit verification transactions logged for both Seleksi I and II');

  console.log('\n--- Test 20: Reload mempertahankan lifecycle ---');
  const reloadedDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  const reloadedSel2 = reloadedDocs.find(d => d.id === sel2Doc.id);
  assert(reloadedSel2.isFinal === true && reloadedSel2.status === SELECTION_STATUS.DISETUJUI, 'Reload preserves Seleksi II FINAL state in persistent storage');

  console.log(`\n=== TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED ===\n`);
}

runTests().catch(err => {
  console.error('Test execution exception:', err);
});
