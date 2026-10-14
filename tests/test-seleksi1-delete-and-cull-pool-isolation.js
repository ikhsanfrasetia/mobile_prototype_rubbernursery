import assert from 'node:assert';
import { storage } from '../js/core/storage.js';
import {
  findExistingSelectionTransaction,
  integrateSeedingToSelectionPool,
  canCreatePreGraftingSelection1Document,
  canPerformPreGraftingSelection1,
  createSeleksi1ExecutionTransaction,
  deleteSeleksi1ExecutionTransaction,
  approvePreGraftingSelectionDocument,
  getBedenganScopeStatusForSeleksi1,
  SELECTION_STATUS,
  SELECTION_STAGES,
  SELECTION_TYPES,
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  SELECTION_STORAGE_KEY
} from '../js/modules/selection/selection-manager.js';

// Setup Mock LocalStorage
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

const mockAsisten = {
  id: 'USR-ASB-01',
  userId: 'USR-ASB-01',
  code: 'ASB01',
  name: 'Asisten Bibitan Test',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

const mockMantri = {
  id: 'USR-MTR-01',
  userId: 'USR-MTR-01',
  code: 'MTR01',
  name: 'Mantri Bibitan Test',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

import { getEffectiveDate } from '../js/core/simulation-clock-service.js';

function seedAttendance() {
  const d1 = new Date().toISOString().slice(0, 10);
  const d2 = getEffectiveDate();
  const dates = Array.from(new Set([d1, d2]));
  const att = [];
  dates.forEach(d => {
    att.push({ type: 'SUPERVISOR', role: 'MANTRI_TANAMAN', attendanceType: 'DATANG', date: d, status: 'PRESENT' });
    att.push({ type: 'WORKER', workerId: 'WRK-01', attendanceType: 'DATANG', date: d, status: 'PRESENT' });
  });
  storage.set('attendance_transactions', att);
}

function clearAllStorage() {
  globalThis.localStorage.clear();
  seedAttendance();
}

console.log('================================================================================');
console.log('INTEGRATION TEST: SELEKSI I CULL ISOLATION, APPROVAL PRESERVATION & RE-EXECUTION');
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: Transaksi PELAKSANAAN_SELEKSI_I tidak dikenali sebagai transaksi CULL
// -----------------------------------------------------------------------------
{
  clearAllStorage();
  console.log('--- TEST 1: PELAKSANAAN_SELEKSI_I tidak dikenali sebagai transaksi CULL ---');

  const poolItem = {
    id: 'POOL-CULL-001',
    docNo: '2026/CULL/001',
    sourceDocNo: '2026/SOW/001',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    jumlahAfkir: 50,
    category: 'AFKIR',
    status: 'PENDING_DECLARATION'
  };
  storage.set('selection_pool', [poolItem]);

  // Transaksi pelaksanaan Seleksi I dengan sourceDocNo SOW yang sama
  const execTx = {
    id: 'SEL-TX-001',
    docNo: '2026/SEL-I/001',
    transactionType: 'PELAKSANAAN_SELEKSI_I',
    selectionType: SELECTION_TYPES.PRA_OKULASI,
    selectionStage: SELECTION_STAGES.SELEKSI_1,
    selectionDocumentId: 'SEL-DOC-001',
    parentSelectionDocumentId: 'SEL-DOC-001',
    sourceDocNo: '2026/SOW/001',
    sourceModule: 'PENYEMAIAN',
    status: 'RECORDED'
  };
  storage.set(SELECTION_STORAGE_KEY, [execTx]);

  const match = findExistingSelectionTransaction(poolItem);
  assert.strictEqual(match, null, 'findExistingSelectionTransaction HARUS return null, bukan transaksi PELAKSANAAN_SELEKSI_I');
  console.log('  [PASS] Transaksi PELAKSANAAN_SELEKSI_I berhasil diisolasi dan TIDAK dianggap sebagai CULL.');
}

// -----------------------------------------------------------------------------
// TEST 2: Membuat transaksi Seleksi I tidak menyembunyikan deklarasi afkir Pindah Semai
// -----------------------------------------------------------------------------
{
  clearAllStorage();
  console.log('\n--- TEST 2: Membuat transaksi Seleksi I tidak menyembunyikan deklarasi afkir Pindah Semai ---');

  const seedingWithReject = {
    id: 'SOW-002',
    docNo: '2026/SOW/002',
    batchCode: 'BTCH-002',
    bedenganCode: 'BED-001',
    totalDisemai: 2000,
    totalPolybag: 1000,
    rusakQty: 100,
    ditolak: 100,
    status: 'DISETUJUI',
    verificationStatus: 'TERVERIFIKASI'
  };
  storage.set('seeding_transactions', [seedingWithReject]);

  // Integrasikan ke selection_pool
  integrateSeedingToSelectionPool(seedingWithReject);
  const poolBefore = storage.get('selection_pool', []);
  assert.strictEqual(poolBefore.length, 1, 'Pool item terbentuk untuk bibit afkir');
  assert.strictEqual(poolBefore[0].status, 'PENDING_DECLARATION', 'Status awal afkir adalah PENDING_DECLARATION');

  // Buat transaksi Seleksi I
  const execTx = {
    id: 'SEL-TX-002',
    docNo: '2026/SEL-I/002',
    transactionType: 'PELAKSANAAN_SELEKSI_I',
    selectionType: SELECTION_TYPES.PRA_OKULASI,
    selectionStage: SELECTION_STAGES.SELEKSI_1,
    selectionDocumentId: 'SEL-DOC-002',
    parentSelectionDocumentId: 'SEL-DOC-002',
    sourceDocNo: '2026/SOW/002',
    sourceModule: 'PENYEMAIAN',
    status: 'RECORDED'
  };
  storage.set(SELECTION_STORAGE_KEY, [execTx]);

  // Cek resolver untuk pool item
  const existingForPool = findExistingSelectionTransaction(poolBefore[0]);
  assert.strictEqual(existingForPool, null, 'Keberadaan transaksi Seleksi I tidak boleh membuat pool item dianggap memiliki transaksi CULL');

  // Integrasi ulang seeding (idempotency check)
  integrateSeedingToSelectionPool(seedingWithReject);
  const poolAfter = storage.get('selection_pool', []);
  assert.strictEqual(poolAfter.length, 1, 'Pool item tidak duplikat dan tidak terpengaruh Seleksi I');
  console.log('  [PASS] Pembuatan transaksi Seleksi I tidak menyembunyikan atau mengubah status deklarasi afkir Pindah Semai.');
}

// -----------------------------------------------------------------------------
// TEST 3: Menghapus transaksi Seleksi I tidak mengubah status deklarasi CULL
// -----------------------------------------------------------------------------
{
  clearAllStorage();
  console.log('\n--- TEST 3: Menghapus transaksi Seleksi I tidak mengubah status deklarasi CULL ---');

  const cullTx = {
    id: 'CULL-TX-003',
    docNo: '2026/CULL/003',
    selectionNo: '2026/CULL/003',
    selectionPoolDocNo: '2026/CULL/003',
    sourceDocNo: '2026/SOW/003',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    status: SELECTION_STATUS.DISETUJUI,
    verificationStatus: 'TERVERIFIKASI',
    jumlahAfkir: 50
  };

  const poolItem3 = {
    id: 'POOL-003',
    docNo: '2026/CULL/003',
    sourceDocNo: '2026/SOW/003',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    selectionTransactionId: 'CULL-TX-003',
    status: SELECTION_STATUS.DISETUJUI
  };

  const parentDoc3 = {
    id: 'SEL-DOC-003',
    docNo: '2026/SEL/003',
    selectionStage: 'SELEKSI_I',
    sourceDocNo: '2026/SOW/003',
    batchCode: 'BTCH-003',
    bedenganCode: 'BED-001',
    sourcePolybagQty: 1000,
    sourceBibitQty: 2000,
    status: SELECTION_STATUS.DISETUJUI,
    isFinal: true
  };

  const execTx3 = {
    id: 'SEL-TX-003',
    docNo: '2026/SEL-I/003',
    transactionType: 'PELAKSANAAN_SELEKSI_I',
    selectionType: SELECTION_TYPES.PRA_OKULASI,
    selectionStage: SELECTION_STAGES.SELEKSI_1,
    selectionDocumentId: 'SEL-DOC-003',
    parentSelectionDocumentId: 'SEL-DOC-003',
    sourceDocNo: '2026/SOW/003',
    sourceModule: 'PENYEMAIAN',
    status: 'RECORDED',
    stockMutationStatus: 'NOT_REQUIRED'
  };

  storage.set('selection_pool', [poolItem3]);
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [parentDoc3]);
  storage.set(SELECTION_STORAGE_KEY, [cullTx, execTx3]);

  // Hapus transaksi pelaksanaan Seleksi I
  const delRes = deleteSeleksi1ExecutionTransaction('SEL-TX-003', mockMantri);
  assert.strictEqual(delRes.success, true, 'Penghapusan eksekusi berhasil');

  // Verifikasi CULL transaction dan selection_pool
  const allTxs = storage.get(SELECTION_STORAGE_KEY, []);
  const remainingCull = allTxs.find(tx => tx.id === 'CULL-TX-003');
  assert.ok(remainingCull, 'Transaksi CULL harus tetap ada');
  assert.strictEqual(remainingCull.status, SELECTION_STATUS.DISETUJUI, 'Status transaksi CULL tetap DISETUJUI');

  const poolCheck = storage.get('selection_pool', []);
  assert.strictEqual(poolCheck[0].status, SELECTION_STATUS.DISETUJUI, 'Status deklarasi afkir pada pool tetap DISETUJUI');
  console.log('  [PASS] Menghapus transaksi Seleksi I tidak mengubah status CULL atau deklarasi afkir.');
}

// -----------------------------------------------------------------------------
// TEST 4: Menghapus transaksi pelaksanaan terakhir mempertahankan approval dokumen induk
// -----------------------------------------------------------------------------
{
  clearAllStorage();
  console.log('\n--- TEST 4: Menghapus transaksi pelaksanaan terakhir mempertahankan approval dokumen induk ---');

  const approvedParent = {
    id: 'SEL-DOC-004',
    docNo: '2026/SEL/004',
    selectionDocNo: '2026/SEL/004',
    selectionStage: 'SELEKSI_I',
    sourceDocNo: '2026/SOW/004',
    batchCode: 'BTCH-004',
    bedenganCode: 'BED-001',
    sourcePolybagQty: 1000,
    sourceBibitQty: 2000,
    status: SELECTION_STATUS.DISETUJUI,
    isFinal: true,
    verificationStatus: 'TERVERIFIKASI',
    verifiedByUserId: mockAsisten.userId,
    verifiedByName: mockAsisten.name,
    verifiedAt: '2026-10-10T08:00:00.000Z'
  };

  const execTx4 = {
    id: 'SEL-TX-004',
    docNo: '2026/SEL-I/004',
    transactionType: 'PELAKSANAAN_SELEKSI_I',
    selectionType: SELECTION_TYPES.PRA_OKULASI,
    selectionStage: SELECTION_STAGES.SELEKSI_1,
    selectionDocumentId: 'SEL-DOC-004',
    parentSelectionDocumentId: 'SEL-DOC-004',
    bedenganCode: 'BED-001',
    actualPolybagInspectedQty: 1000,
    actualBibitSelectedQty: 50,
    actualBibitRetainedQty: 1950,
    sourceDocNo: '2026/SOW/004',
    sourceModule: 'PENYEMAIAN',
    status: 'RECORDED',
    stockMutationStatus: 'NOT_REQUIRED'
  };

  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [approvedParent]);
  storage.set(SELECTION_STORAGE_KEY, [execTx4]);

  // Hapus satu-satunya transaksi pelaksanaan
  const delRes = deleteSeleksi1ExecutionTransaction('SEL-TX-004', mockMantri);
  assert.strictEqual(delRes.success, true);

  const updatedDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  const parentAfter = updatedDocs.find(d => d.id === 'SEL-DOC-004');

  assert.ok(parentAfter, 'Dokumen induk harus tetap ada');
  assert.strictEqual(parentAfter.executionCount, 0, 'Jumlah eksekusi menjadi 0');
  assert.strictEqual(parentAfter.status, SELECTION_STATUS.DISETUJUI, 'Status approval dokumen induk HARUS TETAP DISETUJUI (bukan DRAFT)');
  assert.strictEqual(parentAfter.isFinal, true, 'isFinal HARUS TETAP true');
  assert.strictEqual(parentAfter.verificationStatus, 'TERVERIFIKASI', 'verificationStatus HARUS TETAP TERVERIFIKASI');
  assert.strictEqual(parentAfter.verifiedByUserId, mockAsisten.userId, 'verifiedByUserId historis tidak boleh hilang');

  // Verifikasi audit event tercatat pada parent auditTrail
  assert.ok(Array.isArray(parentAfter.auditTrail) && parentAfter.auditTrail.length > 0, 'Audit trail harus tercatat');
  const lastAudit = parentAfter.auditTrail[parentAfter.auditTrail.length - 1];
  assert.strictEqual(lastAudit.eventType, 'DELETE', 'Audit event type harus DELETE');
  console.log('  [PASS] Menghapus transaksi pelaksanaan terakhir mempertahankan status DISETUJUI & isFinal: true.');
}

// -----------------------------------------------------------------------------
// TEST 5: Bedengan yang memenuhi prasyarat dapat dipilih dan transaksi dapat dibuat ulang
// -----------------------------------------------------------------------------
{
  clearAllStorage();
  console.log('\n--- TEST 5: Bedengan yang memenuhi prasyarat dapat dipilih dan transaksi dapat dibuat ulang ---');

  const sow5 = {
    id: 'SOW-005',
    docNo: '2026/SOW/005',
    batchCode: 'BTCH-005',
    bedenganCode: 'BED-001',
    totalDisemai: 2000,
    totalPolybag: 1000,
    ditolak: 0,
    status: 'DISETUJUI',
    verificationStatus: 'TERVERIFIKASI'
  };
  storage.set('seeding_transactions', [sow5]);

  const parentDoc5 = {
    id: 'SEL-DOC-005',
    docNo: '2026/SEL/005',
    selectionDocNo: '2026/SEL/005',
    selectionStage: 'SELEKSI_I',
    sourceDocNo: '2026/SOW/005',
    batchCode: 'BTCH-005',
    bedenganCode: 'BED-001',
    sourcePolybagQty: 1000,
    sourceBibitQty: 2000,
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 1000, disemai: 2000 }],
    status: SELECTION_STATUS.DISETUJUI,
    isFinal: true,
    verificationStatus: 'TERVERIFIKASI'
  };
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [parentDoc5]);

  // 1. Buat transaksi pelaksanaan Seleksi I awal
  const exec1 = createSeleksi1ExecutionTransaction({
    selectionDocumentId: 'SEL-DOC-005',
    bedenganCode: 'BED-001',
    actualPolybagInspectedQty: 1000,
    actualBibitSelectedQty: 40,
    tanggalSeleksi: '12/10/2026'
  }, mockMantri);
  assert.strictEqual(exec1.success, true, 'Eksekusi pertama berhasil');

  // Scope bedengan setelah eksekusi penuh -> sisa 0
  let scopeAfterExec = getBedenganScopeStatusForSeleksi1(parentDoc5);
  assert.strictEqual(scopeAfterExec[0].remainingPolybag, 0, 'Sisa polybag 0 setelah selesai diperiksa');

  // 2. Hapus transaksi pelaksanaan
  const delRes = deleteSeleksi1ExecutionTransaction(exec1.transaction.id, mockMantri);
  assert.strictEqual(delRes.success, true, 'Penghapusan eksekusi berhasil');

  // 3. Verifikasi gerbang canPerformPreGraftingSelection1 tetap terbuka (Eligible)
  const gateCheck = canPerformPreGraftingSelection1(parentDoc5, 'BED-001');
  assert.strictEqual(gateCheck.canPerform, true, 'canPerformPreGraftingSelection1 HARUS true setelah penghapusan');

  // 4. Verifikasi scope bedengan kembali pulih (remainingPolybag = 1.000)
  const freshParent = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [])[0];
  let scopeAfterDel = getBedenganScopeStatusForSeleksi1(freshParent);
  assert.strictEqual(scopeAfterDel[0].remainingPolybag, 1000, 'Sisa polybag harus pulih menjadi 1.000');

  // 5. Buat ulang transaksi pelaksanaan Seleksi I
  const exec2 = createSeleksi1ExecutionTransaction({
    selectionDocumentId: 'SEL-DOC-005',
    bedenganCode: 'BED-001',
    actualPolybagInspectedQty: 1000,
    actualBibitSelectedQty: 25,
    tanggalSeleksi: '12/10/2026'
  }, mockMantri);
  assert.strictEqual(exec2.success, true, 'Transaksi Seleksi I berhasil dibuat ulang tanpa terkunci!');
  console.log('  [PASS] Bedengan dapat dipilih kembali dan transaksi berhasil dibuat ulang setelah delete.');
}

// -----------------------------------------------------------------------------
// TEST 6: Dependensi upstream yang benar-benar belum valid tetap memblokir transaksi
// -----------------------------------------------------------------------------
{
  clearAllStorage();
  console.log('\n--- TEST 6: Dependensi upstream yang belum valid tetap memblokir transaksi ---');

  // SOW dengan CULL yang belum dideklarasikan
  const sowUnapprovedCull = {
    id: 'SOW-006',
    docNo: '2026/SOW/006',
    batchCode: 'BTCH-006',
    bedenganCode: 'BED-001',
    totalDisemai: 1000,
    totalPolybag: 500,
    ditolak: 500,
    status: 'DISETUJUI',
    verificationStatus: 'TERVERIFIKASI'
  };
  storage.set('seeding_transactions', [sowUnapprovedCull]);
  storage.set('selection_pool', [{
    id: 'POOL-006',
    docNo: '2026/CULL/006',
    sourceDocNo: '2026/SOW/006',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    jumlahAfkir: 500,
    status: 'PENDING_DECLARATION'
  }]);

  const parentDoc6 = {
    id: 'SEL-DOC-006',
    docNo: '2026/SEL/006',
    selectionStage: 'SELEKSI_I',
    sourceDocNo: '2026/SOW/006',
    batchCode: 'BTCH-006',
    bedenganCode: 'BED-001',
    sourcePolybagQty: 500,
    sourceBibitQty: 1000
  };
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [parentDoc6]);

  const gate = canPerformPreGraftingSelection1('BTCH-006');
  assert.strictEqual(gate.canPerform, false, 'Batch HARUS terkunci karena CULL belum disetujui');
  assert.ok(gate.reason.includes('belum selesai dideklarasikan') || gate.reason.includes('belum disetujui'), 'Alasan blokir harus akurat');

  assert.throws(() => {
    createSeleksi1ExecutionTransaction({
      selectionDocumentId: 'SEL-DOC-006',
      bedenganCode: 'BED-001',
      actualPolybagInspectedQty: 500,
      actualBibitSelectedQty: 10
    }, mockMantri);
  }, /Pelaksanaan Seleksi I tidak dapat dilakukan/, 'Harus melempar exception saat upstream CULL belum valid');
  console.log('  [PASS] Dependensi upstream yang belum valid (CULL pending) tetap memblokir transaksi.');
}

// -----------------------------------------------------------------------------
// TEST 7: Status IN_PROGRESS atau COMPLETED tidak dapat digunakan melewati approval yang tidak sah
// -----------------------------------------------------------------------------
{
  clearAllStorage();
  console.log('\n--- TEST 7: Status IN_PROGRESS / COMPLETED tidak dapat membypass approval tidak sah ---');

  // SOW belum disetujui ASB
  const unapprovedSow = {
    id: 'SOW-UNAPPROVED-07',
    docNo: '2026/SOW/007',
    batchCode: 'BTCH-007',
    bedenganCode: 'BED-001',
    totalDisemai: 2000,
    totalPolybag: 1000,
    ditolak: 0,
    status: 'MENUNGGU_VERIFIKASI',
    verificationStatus: 'MENUNGGU_VERIFIKASI'
  };
  storage.set('seeding_transactions', [unapprovedSow]);

  // Dokumen Seleksi I sengaja memiliki status 'IN_PROGRESS' atau 'COMPLETED'
  const fakeDoc = {
    id: 'SEL-DOC-007',
    docNo: '2026/SEL/007',
    selectionStage: 'SELEKSI_I',
    sourceDocNo: '2026/SOW/007',
    batchCode: 'BTCH-007',
    bedenganCode: 'BED-001',
    sourcePolybagQty: 1000,
    sourceBibitQty: 2000,
    status: 'IN_PROGRESS' // status buatan / manipulasi
  };
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [fakeDoc]);

  const gate = canPerformPreGraftingSelection1(fakeDoc, 'BED-001');
  assert.strictEqual(gate.canPerform, false, 'Status IN_PROGRESS tidak boleh membypass approval SOW yang belum sah');

  fakeDoc.status = 'COMPLETED';
  const gateCompleted = canPerformPreGraftingSelection1(fakeDoc, 'BED-001');
  assert.strictEqual(gateCompleted.canPerform, false, 'Status COMPLETED tidak boleh membypass approval SOW yang belum sah');

  console.log('  [PASS] Status IN_PROGRESS / COMPLETED tidak dapat disalahgunakan membypass verifikasi ASB.');
}

// -----------------------------------------------------------------------------
// TEST 8: Penghapusan tidak menimbulkan mutasi stok ganda atau perubahan jurnal
// -----------------------------------------------------------------------------
{
  clearAllStorage();
  console.log('\n--- TEST 8: Penghapusan tidak menimbulkan mutasi stok ganda atau perubahan jurnal ---');

  // Rekam saldo inventaris awal
  const initialInvTxs = storage.get('batch_inventory_transactions', []);
  const initialStockAdj = storage.get('stock_adjustment_transactions', []);

  const approvedDoc8 = {
    id: 'SEL-DOC-008',
    docNo: '2026/SEL/008',
    selectionStage: 'SELEKSI_I',
    sourceDocNo: '2026/SOW/008',
    batchCode: 'BTCH-008',
    bedenganCode: 'BED-001',
    sourcePolybagQty: 1000,
    sourceBibitQty: 2000,
    status: SELECTION_STATUS.DISETUJUI,
    isFinal: true
  };
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [approvedDoc8]);

  const execTx8 = {
    id: 'SEL-TX-008',
    docNo: '2026/SEL-I/008',
    transactionType: 'PELAKSANAAN_SELEKSI_I',
    selectionType: SELECTION_TYPES.PRA_OKULASI,
    selectionStage: SELECTION_STAGES.SELEKSI_1,
    selectionDocumentId: 'SEL-DOC-008',
    parentSelectionDocumentId: 'SEL-DOC-008',
    bedenganCode: 'BED-001',
    actualPolybagInspectedQty: 1000,
    actualBibitSelectedQty: 50,
    status: 'RECORDED',
    stockMutationStatus: 'NOT_REQUIRED'
  };
  storage.set(SELECTION_STORAGE_KEY, [execTx8]);

  // Hapus transaksi
  deleteSeleksi1ExecutionTransaction('SEL-TX-008', mockMantri);

  // Verifikasi tidak ada perubahan pada log inventory / mutasi stok
  const finalInvTxs = storage.get('batch_inventory_transactions', []);
  const finalStockAdj = storage.get('stock_adjustment_transactions', []);

  assert.strictEqual(finalInvTxs.length, initialInvTxs.length, 'Tidak boleh ada penambahan record batch_inventory_transactions');
  assert.strictEqual(finalStockAdj.length, initialStockAdj.length, 'Tidak boleh ada record stock_adjustment_transactions');
  console.log('  [PASS] Stock Integrity terjaga penuh: stockMutationStatus "NOT_REQUIRED" & zero journal mutation.');
}

console.log('\n================================================================================');
console.log('SEMUA 8 INTEGRATION TEST SELEKSI I CULL ISOLATION & DELETE BERHASIL LOLOS (100%)');
console.log('================================================================================\n');
