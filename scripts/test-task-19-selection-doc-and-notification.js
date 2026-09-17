/**
 * scripts/test-task-19-selection-doc-and-notification.js
 * Integration test for TASK-19:
 * 1. Multi-seeding transaction from 1 receipt document generation (SOW-001 and SOW-002)
 * 2. Selection document lineage and deduplication
 * 3. Beranda Penyeleksian notification dot lifecycle, state transitions, role governance, and cross-estate scoping
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
import {
  createPreGraftingSelectionDocument,
  getPreGraftingSelectionDocumentById,
  syncAllSeedingsToPreGraftingSelectionDocuments,
  hasActionableSelection,
  getActionableSelectionCount,
  createSeleksi1ExecutionTransaction,
  createSeleksi2ExecutionTransaction,
  createSeleksi3ExecutionTransaction,
  setPreGraftingSelectionDocumentCompletion,
  submitPreGraftingSelectionDocumentToAsisten,
  approvePreGraftingSelectionDocument,
  createSelection2DocumentFromSelection1,
  createSelection3DocumentFromSelection2
} from '../js/modules/selection/selection-manager.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`  [FAIL] ${message}`);
    throw new Error(message);
  }
  console.log(`  [PASS] ${message}`);
}

console.log('================================================================');
console.log('   INTEGRATION TEST: TASK-19 SELECTION DOCUMENT & NOTIFICATION  ');
console.log('================================================================\n');

// Clear all relevant storage keys
storage.set('receipt_transactions', []);
storage.set('seeding_transactions', []);
storage.set('pre_grafting_selection_documents', []);
storage.set('selection_transactions', []);
storage.set('selection_pool', []);
storage.set('budding_transactions', []);
storage.set('inspection_transactions', []);

const mockMantriTBS = {
  userId: 'USR-MNT-01',
  code: '1405482',
  name: 'Irwan Syah Putra',
  position: 'Mantri Pembibitan',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  estateName: 'Kebun Tanah Besih',
  divisionId: 'DIV-001',
  divisionName: 'Divisi I'
};

const mockMantriAPM = {
  userId: 'USR-MNT-02',
  code: '1405483',
  name: 'Budi Santoso',
  position: 'Mantri Pembibitan',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-APM',
  estateName: 'Kebun Aek Pamienke',
  divisionId: 'DIV-APM-02',
  divisionName: 'Divisi II'
};

const mockAsistenTBS = {
  userId: 'USR-ASB-01',
  code: 'ASB-001',
  name: 'Hendra Wijaya',
  position: 'Asisten Pembibitan',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  estateName: 'Kebun Tanah Besih',
  divisionId: 'DIV-001',
  divisionName: 'Divisi I'
};

// -----------------------------------------------------------------
// SCENARIO 1: 1 Receipt + 2 Seeding Transactions -> 2 Selection Docs
// -----------------------------------------------------------------
console.log('--- TEST 1: Generation of 2 Selection Docs from 1 Receipt (2 Seeding Txs) ---');

const receiptDoc = {
  docNo: '2026/APR/001',
  nomorDokumen: '2026/APR/001',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  klon: 'GT 1',
  totalBibitDiterima: 10000
};
storage.set('receipt_transactions', [receiptDoc]);

const seedingTx1 = {
  id: 'SOW-TX-001',
  docNo: '2026/SOW/001',
  sourceDocNo: '2026/APR/001', // Receipt Doc
  sourceIndex: 0,
  programId: 'PRG-2026-001',
  programCode: 'PRG/NUR/01/2026',
  batchId: 'BATCH-001',
  batchCode: 'BTCH-001',
  batchNo: 'BTCH-001',
  bedenganId: 'BED-001',
  bedenganCode: 'BED-001',
  bedengan: 'BED-001',
  estateId: 'EST-TBS',
  estateName: 'Kebun Tanah Besih',
  divisionId: 'DIV-001',
  divisionName: 'Divisi I',
  klonAwal: 'GT 1',
  totalDisemai: 5000,
  totalPolybag: 2500,
  ditolak: 0,
  rows: [
    { bedenganId: 'BED-001', bedenganCode: 'BED-001', bedengan: 'BED-001', polybag: 2500, disemai: 5000 }
  ]
};

const seedingTx2 = {
  id: 'SOW-TX-002',
  docNo: '2026/SOW/002',
  sourceDocNo: '2026/APR/001', // Receipt Doc (SAME RECEIPT!)
  sourceIndex: 0,
  programId: 'PRG-2026-001',
  programCode: 'PRG/NUR/01/2026',
  batchId: 'BATCH-002',
  batchCode: 'BTCH-002',
  batchNo: 'BTCH-002',
  bedenganId: 'BED-002',
  bedenganCode: 'BED-002',
  bedengan: 'BED-002',
  estateId: 'EST-TBS',
  estateName: 'Kebun Tanah Besih',
  divisionId: 'DIV-001',
  divisionName: 'Divisi I',
  klonAwal: 'GT 1',
  totalDisemai: 5000,
  totalPolybag: 2500,
  ditolak: 0,
  rows: [
    { bedenganId: 'BED-002', bedenganCode: 'BED-002', bedengan: 'BED-002', polybag: 2500, disemai: 5000 }
  ]
};

storage.set('seeding_transactions', [seedingTx1, seedingTx2]);

// Run sync
const createdCount = syncAllSeedingsToPreGraftingSelectionDocuments(mockMantriTBS);
assert(createdCount === 2, `Berhasil membentuk 2 Dokumen Seleksi I baru dari 2 transaksi penyemaian (createdCount: ${createdCount})`);

const allSelDocs = storage.get('pre_grafting_selection_documents', []);
assert(allSelDocs.length === 2, `Total Dokumen Seleksi Pra-Okulasi di storage = 2 (aktual: ${allSelDocs.length})`);

const selDoc1 = allSelDocs.find(d => d.sourceDocNo === '2026/SOW/001' || d.sourceSeedingDocNo === '2026/SOW/001');
const selDoc2 = allSelDocs.find(d => d.sourceDocNo === '2026/SOW/002' || d.sourceSeedingDocNo === '2026/SOW/002');

assert(Boolean(selDoc1), 'Dokumen Seleksi untuk SOW-001 berhasil ditemukan');
assert(Boolean(selDoc2), 'Dokumen Seleksi untuk SOW-002 berhasil ditemukan');

// -----------------------------------------------------------------
// SCENARIO 2: Lineage Verification
// -----------------------------------------------------------------
console.log('--- TEST 2: Lineage Verification (Selection -> Seeding -> Batch -> Bedengan -> Receipt) ---');
assert(selDoc1.sourceDocNo === '2026/SOW/001', `Lineage Doc 1: sourceDocNo adalah SOW-001 (${selDoc1.sourceDocNo})`);
assert(selDoc1.batchCode === 'BTCH-001', `Lineage Doc 1: batchCode adalah BTCH-001 (${selDoc1.batchCode})`);
assert(selDoc1.bedengan === 'BED-001' || selDoc1.bedenganCode === 'BED-001', `Lineage Doc 1: bedengan adalah BED-001 (${selDoc1.bedengan})`);
assert(selDoc1.receiptDocNo === '2026/APR/001' || selDoc1.sourceReceiptDocNo === '2026/APR/001', `Lineage Doc 1: receiptDocNo adalah 2026/APR/001 (${selDoc1.receiptDocNo})`);

assert(selDoc2.sourceDocNo === '2026/SOW/002', `Lineage Doc 2: sourceDocNo adalah SOW-002 (${selDoc2.sourceDocNo})`);
assert(selDoc2.batchCode === 'BTCH-002', `Lineage Doc 2: batchCode adalah BTCH-002 (${selDoc2.batchCode})`);
assert(selDoc2.bedengan === 'BED-002' || selDoc2.bedenganCode === 'BED-002', `Lineage Doc 2: bedengan adalah BED-002 (${selDoc2.bedengan})`);
assert(selDoc2.receiptDocNo === '2026/APR/001' || selDoc2.sourceReceiptDocNo === '2026/APR/001', `Lineage Doc 2: receiptDocNo adalah 2026/APR/001 (${selDoc2.receiptDocNo})`);

// Idempotency: Re-syncing should not create duplicates
const resyncCount = syncAllSeedingsToPreGraftingSelectionDocuments(mockMantriTBS);
assert(resyncCount === 0, `Idempotent re-sync tidak membuat duplikat (createdCount: ${resyncCount})`);
assert(storage.get('pre_grafting_selection_documents', []).length === 2, 'Storage tetap 2 dokumen setelah re-sync');

// -----------------------------------------------------------------
// SCENARIO 3: Notification Dot on Beranda - DRAFT State
// -----------------------------------------------------------------
console.log('--- TEST 3: Mantri Beranda Notification Dot for DRAFT Selection Docs ---');
assert(hasActionableSelection(mockMantriTBS) === true, 'Mantri TBS Beranda Notification = ON (ada Dokumen Seleksi I DRAFT)');
assert(hasActionableSelection(mockAsistenTBS) === false, 'Asisten TBS Beranda Notification = OFF (belum ada pengajuan verifikasi)');
assert(hasActionableSelection(mockMantriAPM) === false, 'Mantri APM Beranda Notification = OFF (isolasi scope Estate/Divisi)');

// -----------------------------------------------------------------
// SCENARIO 4: Notification Dot during partial execution
// -----------------------------------------------------------------
console.log('--- TEST 4: Mantri Beranda Notification Dot during Execution ---');
createSeleksi1ExecutionTransaction({
  selectionDocumentId: selDoc1.id,
  bedenganId: 'BED-001',
  polybagScope: 1000,
  polybag2Bibit: 900,
  polybag1Bibit: 100,
  polybag0Bibit: 0,
  bibitDipertahankan: 1900,
  bibitReject: 100
}, mockMantriTBS);

assert(hasActionableSelection(mockMantriTBS) === true, 'Mantri TBS Beranda Notification = ON saat pelaksanaan seleksi sedang berjalan');

// -----------------------------------------------------------------
// SCENARIO 5: Complete and Submit to Asisten
// -----------------------------------------------------------------
console.log('--- TEST 5: State Transitions (Completed -> Submitted -> Approved) ---');
setPreGraftingSelectionDocumentCompletion(selDoc1.id, true, mockMantriTBS);
submitPreGraftingSelectionDocumentToAsisten(selDoc1.id, mockMantriTBS);

// Now selDoc1 is submitted (MENUNGGU_VERIFIKASI), but selDoc2 is still DRAFT!
assert(hasActionableSelection(mockMantriTBS) === true, 'Mantri TBS masih ON karena selDoc2 masih DRAFT');
assert(hasActionableSelection(mockAsistenTBS) === true, 'Asisten TBS = ON karena selDoc1 menunggu verifikasi');

// Complete & submit selDoc2 as well
createSeleksi1ExecutionTransaction({
  selectionDocumentId: selDoc2.id,
  bedenganId: 'BED-002',
  polybagScope: 1000,
  polybag2Bibit: 900,
  polybag1Bibit: 100,
  polybag0Bibit: 0,
  bibitDipertahankan: 1900,
  bibitReject: 100
}, mockMantriTBS);

setPreGraftingSelectionDocumentCompletion(selDoc2.id, true, mockMantriTBS);
submitPreGraftingSelectionDocumentToAsisten(selDoc2.id, mockMantriTBS);

assert(hasActionableSelection(mockMantriTBS) === false, 'Mantri TBS = OFF setelah SEMUA dokumen diajukan ke Asisten');
assert(hasActionableSelection(mockAsistenTBS) === true, 'Asisten TBS = ON untuk memverifikasi dokumen');

// -----------------------------------------------------------------
// SCENARIO 6: Asisten Approval -> Mantri needs to create Seleksi II
// -----------------------------------------------------------------
console.log('--- TEST 6: Asisten Approves -> Mantri Action to Create Seleksi II ---');
approvePreGraftingSelectionDocument(selDoc1.id, 'Disetujui', mockAsistenTBS);
approvePreGraftingSelectionDocument(selDoc2.id, 'Disetujui', mockAsistenTBS);

assert(hasActionableSelection(mockAsistenTBS) === false, 'Asisten TBS = OFF setelah semua dokumen disetujui');
assert(hasActionableSelection(mockMantriTBS) === true, 'Mantri TBS = ON (karena Seleksi I FINAL memerlukan pembuatan Dokumen Seleksi II)');

// Create Seleksi II for selDoc1 and selDoc2
const sel2Doc1 = createSelection2DocumentFromSelection1(selDoc1.id, mockMantriTBS);
const sel2Doc2 = createSelection2DocumentFromSelection1(selDoc2.id, mockMantriTBS);

assert(Boolean(sel2Doc1), 'Dokumen Seleksi II untuk Doc 1 berhasil dibuat');
assert(Boolean(sel2Doc2), 'Dokumen Seleksi II untuk Doc 2 berhasil dibuat');
assert(sel2Doc1.sourceSeedingDocNo === '2026/SOW/001', `Lineage Seleksi II Doc 1 preserves seeding source: ${sel2Doc1.sourceSeedingDocNo}`);
assert(sel2Doc2.sourceSeedingDocNo === '2026/SOW/002', `Lineage Seleksi II Doc 2 preserves seeding source: ${sel2Doc2.sourceSeedingDocNo}`);

// Record executions for Seleksi II
createSeleksi2ExecutionTransaction({
  selectionDocumentId: sel2Doc1.id,
  bedenganId: 'BED-001',
  polybagScope: 1000,
  polybag2Bibit: 900,
  polybag1Bibit: 100,
  polybag0Bibit: 0
}, mockMantriTBS);

createSeleksi2ExecutionTransaction({
  selectionDocumentId: sel2Doc2.id,
  bedenganId: 'BED-002',
  polybagScope: 1000,
  polybag2Bibit: 900,
  polybag1Bibit: 100,
  polybag0Bibit: 0
}, mockMantriTBS);

// Complete and submit Seleksi II
setPreGraftingSelectionDocumentCompletion(sel2Doc1.id, true, mockMantriTBS);
submitPreGraftingSelectionDocumentToAsisten(sel2Doc1.id, mockMantriTBS);
setPreGraftingSelectionDocumentCompletion(sel2Doc2.id, true, mockMantriTBS);
submitPreGraftingSelectionDocumentToAsisten(sel2Doc2.id, mockMantriTBS);

assert(hasActionableSelection(mockMantriTBS) === false, 'Mantri TBS = OFF saat Seleksi II sudah diajukan');
assert(hasActionableSelection(mockAsistenTBS) === true, 'Asisten TBS = ON saat Seleksi II menunggu verifikasi');

approvePreGraftingSelectionDocument(sel2Doc1.id, 'Disetujui', mockAsistenTBS);
approvePreGraftingSelectionDocument(sel2Doc2.id, 'Disetujui', mockAsistenTBS);

// Create Seleksi III for both
const sel3Doc1 = createSelection3DocumentFromSelection2(sel2Doc1.id, mockMantriTBS);
const sel3Doc2 = createSelection3DocumentFromSelection2(sel2Doc2.id, mockMantriTBS);

assert(sel3Doc1.sourceSeedingDocNo === '2026/SOW/001', `Lineage Seleksi III Doc 1 preserves seeding source: ${sel3Doc1.sourceSeedingDocNo}`);
assert(sel3Doc2.sourceSeedingDocNo === '2026/SOW/002', `Lineage Seleksi III Doc 2 preserves seeding source: ${sel3Doc2.sourceSeedingDocNo}`);

// Record executions for Seleksi III
createSeleksi3ExecutionTransaction({
  selectionDocumentId: sel3Doc1.id,
  bedenganId: 'BED-001',
  polybagScope: 1000,
  jumlahDiperiksa: 1000,
  jumlahLayak: 950,
  jumlahAfkir: 50
}, mockMantriTBS);

createSeleksi3ExecutionTransaction({
  selectionDocumentId: sel3Doc2.id,
  bedenganId: 'BED-002',
  polybagScope: 1000,
  jumlahDiperiksa: 1000,
  jumlahLayak: 950,
  jumlahAfkir: 50
}, mockMantriTBS);

setPreGraftingSelectionDocumentCompletion(sel3Doc1.id, true, mockMantriTBS);
submitPreGraftingSelectionDocumentToAsisten(sel3Doc1.id, mockMantriTBS);
setPreGraftingSelectionDocumentCompletion(sel3Doc2.id, true, mockMantriTBS);
submitPreGraftingSelectionDocumentToAsisten(sel3Doc2.id, mockMantriTBS);

approvePreGraftingSelectionDocument(sel3Doc1.id, 'Disetujui', mockAsistenTBS);
approvePreGraftingSelectionDocument(sel3Doc2.id, 'Disetujui', mockAsistenTBS);

// -----------------------------------------------------------------
// SCENARIO 7: When all Seleksi are final -> Penyeleksian Badge OFF
// -----------------------------------------------------------------
console.log('--- TEST 7: When All Seleksi are FINAL -> Badge Penyeleksian = OFF ---');
assert(hasActionableSelection(mockMantriTBS) === false, 'Mantri TBS = OFF (Semua tahap Seleksi I, II, III FINAL)');
assert(hasActionableSelection(mockAsistenTBS) === false, 'Asisten TBS = OFF');

// -----------------------------------------------------------------
// SCENARIO 8: Cross-Estate / Scope Isolation
// -----------------------------------------------------------------
console.log('--- TEST 8: Cross-Estate Isolation ---');
assert(hasActionableSelection(mockMantriAPM) === false, 'Mantri APM tetap OFF');

console.log('\n================================================================');
console.log('   ALL INTEGRATION ASSERTIONS PASSED SUCCESSFULLY (TASK-19)     ');
console.log('================================================================\n');
