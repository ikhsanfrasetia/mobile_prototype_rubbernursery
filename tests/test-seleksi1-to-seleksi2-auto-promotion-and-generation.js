import assert from 'node:assert';
import { storage } from '../js/core/storage.js';
import {
  canCreatePreGraftingSelection1Document,
  canPerformPreGraftingSelection1,
  getRelatedCullRecordsForSeeding,
  syncAllApprovedPreGraftingSelectionDocuments,
  createSelection2DocumentFromSelection1,
  canCreateSelection2Document,
  getPreGraftingSelectionDocuments,
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  SELECTION_STORAGE_KEY,
  SELECTION_STATUS,
  SELECTION_STAGES
} from '../js/modules/selection/selection-manager.js';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

console.log('================================================================================');
console.log('TEST SUITE: SELEKSI I -> SELEKSI II PROMOTION & CULL LOOKUP INTEGRATION');
console.log('================================================================================');

function clearStorage() {
  globalThis.localStorage.clear();
}

// TEST 1: getRelatedCullRecordsForSeeding finds CULL with selectionType PRA_OKULASI
{
  clearStorage();
  const sow = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-001',
    totalDisemai: 280,
    totalPolybag: 140,
    ditolak: 10,
    status: 'DISETUJUI',
    verificationStatus: 'TERVERIFIKASI'
  };
  const cull = {
    id: 'CULL-002',
    docNo: '2026/CULL/SEL-I/002',
    selectionNo: '2026/CULL/SEL-I/002',
    sourceDocNo: '2026/SOW/001',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    sourceTransactionType: 'SEEDING',
    selectionType: 'PRA_OKULASI',
    batchCode: 'BTCH-001',
    jumlahAfkir: 10,
    status: 'DISETUJUI'
  };
  storage.set('seeding_transactions', [sow]);
  storage.set(SELECTION_STORAGE_KEY, [cull]);

  const culls = getRelatedCullRecordsForSeeding('2026/SOW/001');
  assert.strictEqual(culls.length, 1, 'CULL 2026/CULL/SEL-I/002 harus ditemukan');
  assert.strictEqual(culls[0].docNo, '2026/CULL/SEL-I/002');
  console.log('✓ PASS 1: getRelatedCullRecordsForSeeding berhasil mengidentifikasi Dokumen CULL Pindah Semai.');
}

// TEST 2: canPerformPreGraftingSelection1 returns eligible when CULL is approved
{
  clearStorage();
  const sow = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-001',
    totalDisemai: 280,
    totalPolybag: 140,
    ditolak: 10,
    status: 'DISETUJUI',
    verificationStatus: 'TERVERIFIKASI'
  };
  const cull = {
    id: 'CULL-002',
    docNo: '2026/CULL/SEL-I/002',
    selectionNo: '2026/CULL/SEL-I/002',
    sourceDocNo: '2026/SOW/001',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    sourceTransactionType: 'SEEDING',
    selectionType: 'PRA_OKULASI',
    batchCode: 'BTCH-001',
    jumlahAfkir: 10,
    status: 'DISETUJUI'
  };
  const parentDoc = {
    id: 'SEL1-DOC-001',
    docNo: '2026/SEL/001',
    selectionStage: 'SELEKSI_I',
    selectionType: 'PRA_OKULASI',
    batchCode: 'BTCH-001',
    sourceDocNo: '2026/SOW/001',
    sourceBibitQty: 280,
    sourcePolybagQty: 140,
    rows: [{ bedenganCode: 'BED-001', polybag: 140, disemai: 280 }]
  };
  storage.set('seeding_transactions', [sow]);
  storage.set(SELECTION_STORAGE_KEY, [cull]);
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [parentDoc]);

  const gate = canPerformPreGraftingSelection1(parentDoc, 'BED-001');
  assert.strictEqual(gate.canPerform, true, 'Gate Seleksi I harus eligible ketika SOW dan CULL telah disetujui ASB');
  assert.strictEqual(gate.pendingCullPool.length, 0, 'Tidak boleh ada pending CULL pool palsu');
  console.log('✓ PASS 2: canPerformPreGraftingSelection1 lolos tanpa peringatan CULL palsu.');
}

// TEST 3: syncAllApprovedPreGraftingSelectionDocuments auto-promotes Seleksi I and creates Seleksi II
{
  clearStorage();
  const sow = {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-001',
    totalDisemai: 280,
    totalPolybag: 140,
    ditolak: 10,
    status: 'DISETUJUI',
    verificationStatus: 'TERVERIFIKASI'
  };
  const parentDoc = {
    id: 'SEL1-DOC-001',
    docNo: '2026/SEL/001',
    selectionStage: 'SELEKSI_I',
    selectionType: 'PRA_OKULASI',
    batchCode: 'BTCH-001',
    sourceDocNo: '2026/SOW/001',
    sourceBibitQty: 280,
    sourcePolybagQty: 140,
    totalLayak: 270,
    activePolybagQty: 135,
    status: 'COMPLETED',
    isCompleted: true,
    isFinal: false,
    rows: [{ bedenganCode: 'BED-001', polybag: 140, disemai: 280 }]
  };
  const exec = {
    id: 'SEL1-TX-006',
    docNo: '2026/SEL-I/006',
    selectionNo: '2026/SEL-I/006',
    parentSelectionDocumentId: 'SEL1-DOC-001',
    parentSelectionDocNo: '2026/SEL/001',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-001',
    transactionType: 'PELAKSANAAN_SELEKSI_I',
    selectionType: 'PRA_OKULASI',
    actualPolybagInspectedQty: 140,
    actualBibitSelectedQty: 10,
    actualBibitRetainedQty: 270,
    actualPolybagActiveQty: 135,
    status: 'DISETUJUI',
    isFinal: true
  };
  storage.set('seeding_transactions', [sow]);
  storage.set(SELECTION_STORAGE_KEY, [exec]);
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [parentDoc]);

  const synced = syncAllApprovedPreGraftingSelectionDocuments({ id: 'ASB-01', name: 'Asisten' });
  assert.strictEqual(synced, 1, 'Harus membuat 1 Dokumen Seleksi II');

  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  assert.strictEqual(allDocs.length, 2, 'Total Dokumen Seleksi Pra-Okulasi harus menjadi 2');

  const sel1 = allDocs.find(d => d.id === 'SEL1-DOC-001');
  assert.strictEqual(sel1.status, SELECTION_STATUS.DISETUJUI, 'Seleksi I harus terpromosi ke DISETUJUI');
  assert.strictEqual(sel1.isFinal, true, 'Seleksi I harus terpromosi ke isFinal = true');

  const sel2 = allDocs.find(d => d.selectionStage === SELECTION_STAGES.SELEKSI_2 || d.selectionStage === 'SELEKSI_II');
  assert.ok(sel2, 'Dokumen Seleksi II harus berhasil dibentuk');
  assert.strictEqual(sel2.sourceSelectionDocumentId, 'SEL1-DOC-001');
  assert.strictEqual(sel2.sourceBibitQty, 270, 'sourceBibitQty Seleksi II harus sesuai hasil Seleksi I (270)');
  assert.strictEqual(sel2.sourcePolybagQty, 135, 'sourcePolybagQty Seleksi II harus sesuai polybag aktif Seleksi I (135)');
  console.log('✓ PASS 3: syncAllApprovedPreGraftingSelectionDocuments otomatis membuat Dokumen Seleksi II.');
}

// TEST 4: Idempotency check on sync
{
  const syncedAgain = syncAllApprovedPreGraftingSelectionDocuments({ id: 'ASB-01', name: 'Asisten' });
  assert.strictEqual(syncedAgain, 0, 'Sync kedua tidak boleh membuat dokumen duplikat');
  const allDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  assert.strictEqual(allDocs.length, 2, 'Total dokumen tetap 2');
  console.log('✓ PASS 4: Sinkronisasi Seleksi II bersifat idempoten tanpa duplikasi.');
}

console.log('================================================================================');
console.log('SEMUA INTEGRATION TEST SELEKSI I -> SELEKSI II BERHASIL LOLOS!');
console.log('================================================================================');
