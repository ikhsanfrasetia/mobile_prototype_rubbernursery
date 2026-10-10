import assert from 'node:assert';
import { storage } from '../js/core/storage.js';
import {
  canCreatePreGraftingSelection1Document,
  canPerformPreGraftingSelection1,
  createSeleksi1ExecutionTransaction,
  isSeedingApprovedByAsb,
  calculateEligibleSeedingTotalsForBedengan,
  createPreGraftingSelectionDocument,
  syncAllSeedingsToPreGraftingSelectionDocuments,
  getPreGraftingSelectionDocuments,
  SELECTION_STATUS,
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  SELECTION_STORAGE_KEY
} from '../js/modules/selection/selection-manager.js';
import { calculateBatchMetrics, openBedenganSourceSelectorModal, renderProgramBatchCompactView } from '../js/modules/selection/selection-landing.js';

// Setup Mock Environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

const mockUser = {
  id: 'USR-ASB-001',
  userId: 'USR-ASB-001',
  name: 'Asisten Bibitan Test',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

function clearStorage() {
  globalThis.localStorage.clear();
}

console.log('================================================================================');
console.log('RUNNING TESTS: SELEKSI PRA-OKULASI ASB GATE & MULTI-BEDENGAN ACCUMULATION');
console.log('================================================================================');

// TEST 1: SOW belum diverifikasi ASB -> GATED / BLOCKED
{
  clearStorage();
  const unapprovedSow = {
    id: 'SOW-UNAPPROVED-01',
    docNo: '2026/SOW/001',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-001',
    totalDisemai: 2000,
    totalPolybag: 1000,
    ditolak: 0,
    status: 'MENUNGGU_VERIFIKASI',
    verificationStatus: 'MENUNGGU_VERIFIKASI'
  };
  storage.set('seeding_transactions', [unapprovedSow]);

  assert.strictEqual(isSeedingApprovedByAsb(unapprovedSow), false, 'SOW yang belum diverifikasi ASB harus bernilai false');
  const gate = canCreatePreGraftingSelection1Document(unapprovedSow);
  assert.strictEqual(gate.canCreate, false, 'SOW belum diverifikasi ASB tidak boleh lanjut ke Seleksi Pra-Okulasi');
  assert.ok(gate.reason.includes('belum diverifikasi dan disetujui Asisten Bibitan'), 'Pesan gate harus jelas menyebutkan belum disetujui ASB');
  console.log('✓ PASS 1: SOW belum diverifikasi ASB berhasil diblokir dari Seleksi Pra-Okulasi.');
}

// TEST 2: SOW disetujui ASB tapi CULL Pindah Semai belum disetujui ASB -> GATED / BLOCKED
{
  clearStorage();
  const approvedSowWithPendingCull = {
    id: 'SOW-PENDING-CULL-06',
    docNo: '2026/SOW/006',
    batchCode: 'BTCH-004',
    bedenganCode: 'BED-001',
    totalDisemai: 1000,
    totalPolybag: 500,
    ditolak: 1000,
    status: 'DISETUJUI',
    verificationStatus: 'TERVERIFIKASI'
  };
  storage.set('seeding_transactions', [approvedSowWithPendingCull]);
  storage.set('selection_pool', [{
    id: 'POOL-CULL-06',
    docNo: '2026/CULL/006',
    sourceDocNo: '2026/SOW/006',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    jumlahAfkir: 1000,
    status: 'PENDING_DECLARATION'
  }]);

  assert.strictEqual(isSeedingApprovedByAsb(approvedSowWithPendingCull), true, 'Status SOW sudah disetujui ASB');
  const gate = canCreatePreGraftingSelection1Document(approvedSowWithPendingCull);
  assert.strictEqual(gate.canCreate, false, 'SOW dengan CULL yang belum disetujui ASB tidak boleh lanjut ke Seleksi Pra-Okulasi');
  assert.ok(gate.reason.includes('belum dideklarasikan') || gate.reason.includes('belum disetujui'), 'Pesan gate harus menyebutkan status CULL');
  console.log('✓ PASS 2: SOW dengan CULL belum disetujui ASB berhasil diblokir.');
}

// TEST 3: SOW disetujui ASB dan CULL disetujui ASB -> ELIGIBLE
{
  clearStorage();
  const fullyApprovedSow = {
    id: 'SOW-APPROVED-01',
    docNo: '2026/SOW/001',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-001',
    totalDisemai: 2000,
    totalPolybag: 1000,
    ditolak: 0,
    status: 'DISETUJUI',
    verificationStatus: 'TERVERIFIKASI'
  };
  storage.set('seeding_transactions', [fullyApprovedSow]);

  const gate = canCreatePreGraftingSelection1Document(fullyApprovedSow);
  assert.strictEqual(gate.canCreate, true, 'SOW yang disetujui ASB tanpa afkir harus eligible');
  console.log('✓ PASS 3: SOW yang diverifikasi ASB berhasil lolos gate Seleksi Pra-Okulasi.');
}

// TEST 4: Akumulasi Multi-SOW pada Bedengan yang sama (BTCH-003: SOW/003 + SOW/004 = 2.000 Bibit)
{
  clearStorage();
  const sow3 = {
    id: 'SOW-003',
    docNo: '2026/SOW/003',
    batchCode: 'BTCH-003',
    bedenganCode: 'BED-001',
    estateId: 'EST-01',
    divisionId: 'DIV-01',
    totalDisemai: 1000,
    totalPolybag: 500,
    ditolak: 0,
    status: 'DISETUJUI',
    verificationStatus: 'TERVERIFIKASI'
  };
  const sow4 = {
    id: 'SOW-004',
    docNo: '2026/SOW/004',
    batchCode: 'BTCH-003',
    bedenganCode: 'BED-001',
    estateId: 'EST-01',
    divisionId: 'DIV-01',
    totalDisemai: 1000,
    totalPolybag: 500,
    ditolak: 0,
    status: 'DISETUJUI',
    verificationStatus: 'TERVERIFIKASI'
  };
  storage.set('seeding_transactions', [sow3, sow4]);

  const bedTotals = calculateEligibleSeedingTotalsForBedengan('BTCH-003', 'BED-001');
  assert.strictEqual(bedTotals.totalDisemai, 2000, 'Total akumulasi bibit BTCH-003 pada BED-001 harus 2.000 bibit');
  assert.strictEqual(bedTotals.totalPolybag, 1000, 'Total akumulasi polybag BTCH-003 pada BED-001 harus 1.000 ply');
  assert.strictEqual(bedTotals.eligibleSowDocs.length, 2, 'Harus mencakup kedua dokumen SOW');

  // Lakukan sinkronisasi ke Seleksi I
  syncAllSeedingsToPreGraftingSelectionDocuments(mockUser);
  const docs = getPreGraftingSelectionDocuments({ selectionStage: 'SELEKSI_1' }, mockUser);
  assert.strictEqual(docs.length, 1, 'Hanya ada 1 dokumen Seleksi I untuk kombinasi BTCH-003 dan BED-001');
  assert.strictEqual(docs[0].sourceBibitQty, 2000, 'sourceBibitQty harus terakumulasi menjadi 2.000 bibit');
  assert.strictEqual(docs[0].sourcePolybagQty, 1000, 'sourcePolybagQty harus terakumulasi menjadi 1.000 ply');
  console.log('✓ PASS 4: Akumulasi multi-SOW pada satu bedengan terverifikasi 2.000 bibit.');
}

// TEST 5: 1 Batch memiliki Banyak Bedengan (Multi-Bedengan: BED-001 & BED-002)
{
  clearStorage();
  const sowA = {
    id: 'SOW-BED-01',
    docNo: '2026/SOW/010',
    batchCode: 'BTCH-MULTI',
    programCode: 'PRG/NUR/2026',
    bedenganCode: 'BED-001',
    estateId: 'EST-01',
    divisionId: 'DIV-01',
    totalDisemai: 2000,
    totalPolybag: 1000,
    ditolak: 0,
    status: 'DISETUJUI',
    verificationStatus: 'TERVERIFIKASI'
  };
  const sowB = {
    id: 'SOW-BED-02',
    docNo: '2026/SOW/011',
    batchCode: 'BTCH-MULTI',
    programCode: 'PRG/NUR/2026',
    bedenganCode: 'BED-002',
    estateId: 'EST-01',
    divisionId: 'DIV-01',
    totalDisemai: 1500,
    totalPolybag: 750,
    ditolak: 0,
    status: 'DISETUJUI',
    verificationStatus: 'TERVERIFIKASI'
  };
  storage.set('seeding_transactions', [sowA, sowB]);

  syncAllSeedingsToPreGraftingSelectionDocuments(mockUser);
  const docs = getPreGraftingSelectionDocuments({ selectionStage: 'SELEKSI_1' }, mockUser);
  assert.strictEqual(docs.length, 2, 'Harus ada 2 dokumen terpisah untuk 2 bedengan di batch BTCH-MULTI');

  // Validasi perhitungan Batch Metrics (calculateBatchMetrics)
  const batchGroup = {
    batchCode: 'BTCH-MULTI',
    docs: docs
  };
  const metrics = calculateBatchMetrics(batchGroup, 'SELEKSI_1');
  assert.strictEqual(metrics.bedenganCount, 2, 'Jumlah bedengan pada batch harus tepat 2');
  assert.strictEqual(metrics.totalSourceBibit, 3500, 'Total bibit level batch harus akumulasi dari BED-001 (2.000) + BED-002 (1.500) = 3.500');
  assert.strictEqual(metrics.totalSourcePolybag, 1750, 'Total polybag level batch harus akumulasi dari BED-001 (1.000) + BED-002 (750) = 1.750');
  console.log('✓ PASS 5: Multi-bedengan pada 1 batch terverifikasi akumulasi SUM (3.500 bibit dari 2 bedengan).');
}

// TEST 6: Batch 4 (BTCH-004) SOW/005 (2.000) + SOW/006 (1.000 disemai + 1.000 afkir) -> Populasi Seleksi Pra-Okulasi = 3.000 Bibit
{
  clearStorage();
  const sow5 = {
    id: 'SOW-005',
    docNo: '2026/SOW/005',
    batchCode: 'BTCH-004',
    bedenganCode: 'BED-001',
    programCode: '2026/TB/RNUR/001',
    estateId: 'EST-01',
    divisionId: 'DIV-01',
    totalDisemai: 2000,
    totalPolybag: 1000,
    ditolak: 0,
    status: 'DISETUJUI',
    verificationStatus: 'TERVERIFIKASI'
  };
  const sow6 = {
    id: 'SOW-006',
    docNo: '2026/SOW/006',
    batchCode: 'BTCH-004',
    bedenganCode: 'BED-001',
    programCode: '2026/TB/RNUR/001',
    estateId: 'EST-01',
    divisionId: 'DIV-01',
    totalDisemai: 1000,
    totalPolybag: 500,
    ditolak: 1000,
    status: 'DISETUJUI',
    verificationStatus: 'TERVERIFIKASI'
  };
  storage.set('seeding_transactions', [sow5, sow6]);
  storage.set('selection_pool', [{
    id: 'POOL-CULL-06',
    docNo: '2026/CULL/006',
    sourceDocNo: '2026/SOW/006',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    jumlahAfkir: 1000,
    status: 'PENDING_DECLARATION'
  }]);

  // Validasi akumulasi pada tingkat bedengan
  const bedTotals = calculateEligibleSeedingTotalsForBedengan('BTCH-004', 'BED-001');
  assert.strictEqual(bedTotals.totalDisemai, 3000, 'Akumulasi bibit disemai untuk BTCH-004 pada BED-001 harus tepat 3.000 bibit');
  assert.strictEqual(bedTotals.totalPolybag, 1500, 'Akumulasi polybag untuk BTCH-004 pada BED-001 harus tepat 1.500 ply');

  // Lakukan sinkronisasi ke Seleksi I
  syncAllSeedingsToPreGraftingSelectionDocuments(mockUser);
  const docs = getPreGraftingSelectionDocuments({ selectionStage: 'SELEKSI_1' }, mockUser);
  const btch4Doc = docs.find(d => (d.batchCode || d.batchNo) === 'BTCH-004');
  assert.ok(btch4Doc, 'Dokumen Seleksi I untuk BTCH-004 harus terbentuk');
  assert.strictEqual(btch4Doc.sourceBibitQty, 3000, 'sourceBibitQty BTCH-004 harus tepat 3.000 bibit');
  assert.strictEqual(btch4Doc.sourcePolybagQty, 1500, 'sourcePolybagQty BTCH-004 harus tepat 1.500 ply');

  // Validasi render metrik Batch-level
  const batchGroup = {
    batchCode: 'BTCH-004',
    docs: [btch4Doc]
  };
  const metrics = calculateBatchMetrics(batchGroup, 'SELEKSI_1');
  assert.strictEqual(metrics.totalSourceBibit, 3000, 'Total bibit level batch pada card BTCH-004 harus tepat 3.000 Bibit');
  assert.strictEqual(metrics.totalSourcePolybag, 1500, 'Total polybag level batch pada card BTCH-004 harus tepat 1.500 Ply');
  console.log('✓ PASS 6: BTCH-004 terverifikasi memiliki populasi tepat 3.000 Bibit (SOW/005: 2.000 + SOW/006: 1.000 disemai).');
}

// TEST 7: canPerformPreGraftingSelection1 BLOCKS Batch saat SOW belum disetujui ASB
{
  clearStorage();
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

  const doc7 = {
    id: 'SEL-DOC-007',
    docNo: '2026/SEL/007',
    selectionDocNo: '2026/SEL/007',
    selectionStage: 'SELEKSI_I',
    sourceDocNo: '2026/SOW/007',
    batchCode: 'BTCH-007',
    bedenganCode: 'BED-001',
    sourceBibitQty: 2000,
    sourcePolybagQty: 1000,
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 1000, disemai: 2000 }]
  };
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [doc7]);

  const gateBatch = canPerformPreGraftingSelection1('BTCH-007');
  assert.strictEqual(gateBatch.canPerform, false, 'Batch dengan SOW belum disetujui ASB harus terkunci');
  assert.strictEqual(gateBatch.unapprovedSows.length, 1, 'Harus mencatat 1 dokumen SOW unapproved');
  assert.strictEqual(gateBatch.unapprovedSows[0].docNo, '2026/SOW/007');

  // Cek gate pada level dokumen/bedengan
  const gateDoc = canPerformPreGraftingSelection1(doc7, 'BED-001');
  assert.strictEqual(gateDoc.canPerform, false, 'Dokumen dengan SOW belum disetujui ASB harus terkunci');

  // Cek execution defense gate: wajib lempar exception
  assert.throws(() => {
    createSeleksi1ExecutionTransaction({
      selectionDocumentId: doc7.id,
      bedenganCode: 'BED-001',
      actualPolybagInspectedQty: 500,
      actualBibitSelectedQty: 10,
      tanggalSeleksi: '10/10/2026'
    }, mockUser);
  }, /Pelaksanaan Seleksi I tidak dapat dilakukan: Dokumen Pindah Semai/);
  console.log('✓ PASS 7: canPerformPreGraftingSelection1 berhasil memblokir Batch dan transaksi eksekusi saat SOW belum disetujui ASB.');
}

// TEST 8: canPerformPreGraftingSelection1 BLOCKS Batch saat SOW memiliki CULL belum disetujui ASB
{
  clearStorage();
  const approvedSow = {
    id: 'SOW-APP-08',
    docNo: '2026/SOW/008',
    batchCode: 'BTCH-008',
    bedenganCode: 'BED-001',
    totalDisemai: 2000,
    totalPolybag: 1000,
    ditolak: 100,
    status: 'DISETUJUI',
    verificationStatus: 'TERVERIFIKASI'
  };
  storage.set('seeding_transactions', [approvedSow]);
  storage.set('selection_pool', [{
    id: 'POOL-CULL-08',
    docNo: '2026/CULL/008',
    sourceDocNo: '2026/SOW/008',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    jumlahAfkir: 100,
    status: 'PENDING_DECLARATION'
  }]);

  const doc8 = {
    id: 'SEL-DOC-008',
    docNo: '2026/SEL/008',
    selectionDocNo: '2026/SEL/008',
    selectionStage: 'SELEKSI_I',
    sourceDocNo: '2026/SOW/008',
    batchCode: 'BTCH-008',
    bedenganCode: 'BED-001',
    sourceBibitQty: 2000,
    sourcePolybagQty: 1000,
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 1000, disemai: 2000 }]
  };
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [doc8]);

  const gateBatch = canPerformPreGraftingSelection1('BTCH-008');
  assert.strictEqual(gateBatch.canPerform, false, 'Batch dengan CULL belum disetujui ASB harus terkunci');
  assert.ok(gateBatch.pendingCullPool.length > 0 || gateBatch.unapprovedCulls.length > 0, 'Harus mencatat CULL tertahan');

  // Cek execution defense gate: wajib lempar exception
  assert.throws(() => {
    createSeleksi1ExecutionTransaction({
      selectionDocumentId: doc8.id,
      bedenganCode: 'BED-001',
      actualPolybagInspectedQty: 500,
      actualBibitSelectedQty: 10,
      tanggalSeleksi: '10/10/2026'
    }, mockUser);
  }, /Pelaksanaan Seleksi I tidak dapat dilakukan/);
  console.log('✓ PASS 8: canPerformPreGraftingSelection1 berhasil memblokir Batch dan transaksi eksekusi saat CULL belum disetujui ASB.');
}

// TEST 9: canPerformPreGraftingSelection1 MENGIZINKAN Batch saat SOW & CULL telah disetujui ASB
{
  clearStorage();
  const fullyApprovedSow = {
    id: 'SOW-APP-09',
    docNo: '2026/SOW/009',
    batchCode: 'BTCH-009',
    bedenganCode: 'BED-001',
    totalDisemai: 2000,
    totalPolybag: 1000,
    ditolak: 50,
    status: 'DISETUJUI',
    verificationStatus: 'TERVERIFIKASI'
  };
  storage.set('seeding_transactions', [fullyApprovedSow]);
  storage.set(SELECTION_STORAGE_KEY, [{
    id: 'CULL-009',
    docNo: '2026/CULL/009',
    sourceDocNo: '2026/SOW/009',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    status: SELECTION_STATUS.DISETUJUI
  }]);

  const doc9 = {
    id: 'SEL-DOC-009',
    docNo: '2026/SEL/009',
    selectionDocNo: '2026/SEL/009',
    selectionStage: 'SELEKSI_I',
    sourceDocNo: '2026/SOW/009',
    batchCode: 'BTCH-009',
    bedenganCode: 'BED-001',
    sourceBibitQty: 2000,
    sourcePolybagQty: 1000,
    rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 1000, disemai: 2000 }]
  };
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [doc9]);

  // Seed presensi agar gate presensi terbuka
  const todayStr = new Date().toISOString().slice(0, 10);
  storage.set('attendance_transactions', [
    { type: 'SUPERVISOR', role: 'MANTRI_TANAMAN', attendanceType: 'DATANG', date: todayStr, status: 'PRESENT' },
    { type: 'WORKER', workerId: 'WRK-01', attendanceType: 'DATANG', date: todayStr, status: 'PRESENT' }
  ]);

  const gateBatch = canPerformPreGraftingSelection1('BTCH-009');
  assert.strictEqual(gateBatch.canPerform, true, 'Batch dengan SOW & CULL disetujui ASB harus terbuka');

  const execRes = createSeleksi1ExecutionTransaction({
    selectionDocumentId: doc9.id,
    bedenganCode: 'BED-001',
    actualPolybagInspectedQty: 500,
    actualBibitSelectedQty: 10,
    tanggalSeleksi: '10/10/2026'
  }, mockUser);

  assert.ok(execRes, 'Transaksi eksekusi harus berhasil tersimpan');
  assert.strictEqual(execRes.success, true);
  console.log('✓ PASS 9: canPerformPreGraftingSelection1 dan eksekusi transaksi berhasil lolos setelah SOW & CULL disetujui ASB.');
}

// TEST 10: SOW tanpa afkir (afkir = 0) tetapi berstatus COMPLETED / MENUNGGU_VERIFIKASI -> GATED / BLOCKED
{
  clearStorage();
  const completedSowNoAfkir = {
    id: 'SOW-COMPLETED-10',
    docNo: '2026/SOW/010',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-001',
    totalDisemai: 2000,
    totalPolybag: 1000,
    ditolak: 0,
    status: 'COMPLETED' // Status baru selesai input mandor, belum diverifikasi ASB
  };
  storage.set('seeding_transactions', [completedSowNoAfkir]);

  assert.strictEqual(isSeedingApprovedByAsb(completedSowNoAfkir), false, 'SOW berstatus COMPLETED belum disetujui ASB');
  const gateBatch = canPerformPreGraftingSelection1('BTCH-001');
  assert.strictEqual(gateBatch.canPerform, false, 'Batch dengan SOW COMPLETED harus terblokir (Menunggu Persetujuan ASB)');
  assert.ok(gateBatch.reason.includes('belum diverifikasi dan disetujui Asisten Bibitan'), 'Pesan gate harus menyebutkan belum disetujui ASB');
  console.log('✓ PASS 10: SOW tanpa afkir yang belum disetujui ASB (COMPLETED) berhasil diblokir dari Seleksi Pra-Okulasi.');
}

// TEST 11: Validasi UI rendering renderProgramBatchCompactView (Label "Menunggu Persetujuan", Tanpa icon gembok 🔒)
{
  clearStorage();
  const unapprovedSow = {
    id: 'SOW-11',
    docNo: '2026/SOW/011',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-001',
    totalDisemai: 2000,
    totalPolybag: 1000,
    ditolak: 0,
    status: 'MENUNGGU_VERIFIKASI'
  };
  storage.set('seeding_transactions', [unapprovedSow]);

  const doc11 = {
    id: 'DOC-11',
    docNo: '2026/SEL/011',
    selectionStage: 'SELEKSI_I',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-001',
    sourceBibitQty: 2000,
    sourcePolybagQty: 1000
  };
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [doc11]);

  const progGroups = [{
    programCode: '2026/TB/RNUR/001',
    batches: [{
      batchCode: 'BTCH-001',
      docs: [doc11]
    }]
  }];

  const html = renderProgramBatchCompactView({
    programGroups: progGroups,
    stage: 'SELEKSI_1'
  });

  assert.ok(html.includes('Menunggu Persetujuan'), 'Badge harus memuat teks "Menunggu Persetujuan"');
  assert.ok(!html.includes('🔒 Terkunci'), 'Badge TIDAK boleh memuat teks "🔒 Terkunci"');
  assert.ok(!html.includes('🔒'), 'TIDAK boleh ada emoji gembok 🔒 tambahan pada tampilan');
  assert.ok(html.includes('Menunggu Persetujuan ASB (Pindah Semai / Afkir)'), 'Progress text harus menampilkan keterangan menunggu persetujuan ASB');
  console.log('✓ PASS 11: UI renderProgramBatchCompactView menampilkan label "Menunggu Persetujuan" bersih tanpa icon tambahan.');
}

// TEST 12: Seluruh Batch (BTCH-001, BTCH-002, BTCH-003, BTCH-004) tidak dapat dilanjutkan untuk transaksi pada Seleksi I
// jika dokumen referensi SOW belum dikonfirmasi oleh mantri dan belum disetujui oleh asisten bibitan
{
  clearStorage();

  // 4 Batch dengan SOW baru input / belum dikonfirmasi / belum diverifikasi ASB
  const unapprovedSows = [
    { id: 'SOW-01', docNo: '2026/SOW/001', batchCode: 'BTCH-001', bedenganCode: 'BED-001', totalDisemai: 2000, totalPolybag: 1000, ditolak: 0, status: 'COMPLETED' },
    { id: 'SOW-02', docNo: '2026/SOW/002', batchCode: 'BTCH-002', bedenganCode: 'BED-002', totalDisemai: 2000, totalPolybag: 1000, ditolak: 0 },
    { id: 'SOW-03', docNo: '2026/SOW/003', batchCode: 'BTCH-003', bedenganCode: 'BED-003', totalDisemai: 2000, totalPolybag: 1000, ditolak: 0, status: 'MENUNGGU_VERIFIKASI_MANTRI' },
    { id: 'SOW-04', docNo: '2026/SOW/004', batchCode: 'BTCH-004', bedenganCode: 'BED-004', totalDisemai: 2000, totalPolybag: 1000, ditolak: 100, status: 'MENUNGGU_VERIFIKASI' }
  ];
  storage.set('seeding_transactions', unapprovedSows);

  // Dokumen Seleksi I kontainer
  const preDocs = unapprovedSows.map((s, idx) => ({
    id: `SEL-DOC-0${idx + 1}`,
    docNo: `2026/SEL/00${idx + 1}`,
    selectionDocNo: `2026/SEL/00${idx + 1}`,
    selectionStage: 'SELEKSI_I',
    sourceDocNo: s.docNo,
    seedingDocNo: s.docNo,
    batchCode: s.batchCode,
    bedenganCode: s.bedenganCode,
    sourceBibitQty: 2000,
    sourcePolybagQty: 1000,
    rows: [{ bedenganId: s.bedenganCode, bedenganCode: s.bedenganCode, polybag: 1000, disemai: 2000 }]
  }));
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, preDocs);

  // Validasi seluruh batch: WAJIB canPerform === false
  ['BTCH-001', 'BTCH-002', 'BTCH-003', 'BTCH-004'].forEach(bCode => {
    const gate = canPerformPreGraftingSelection1(bCode);
    assert.strictEqual(gate.canPerform, false, `Batch ${bCode} harus terkunci karena dokumen SOW belum disetujui ASB`);
    assert.ok(gate.unapprovedSows.length > 0, `Batch ${bCode} harus mendeteksi unapproved SOW`);
  });

  // Validasi seluruh level dokumen / bedengan: WAJIB canPerform === false
  preDocs.forEach(d => {
    const gateDoc = canPerformPreGraftingSelection1(d, d.bedenganCode);
    assert.strictEqual(gateDoc.canPerform, false, `Dokumen ${d.docNo} pada bedengan ${d.bedenganCode} harus terkunci`);
    
    // Eksekusi transaksi wajib diblokir oleh defense gate
    assert.throws(() => {
      createSeleksi1ExecutionTransaction({
        selectionDocumentId: d.id,
        bedenganCode: d.bedenganCode,
        actualPolybagInspectedQty: 500,
        actualBibitSelectedQty: 10,
        tanggalSeleksi: '10/10/2026'
      }, mockUser);
    }, /Pelaksanaan Seleksi I tidak dapat dilakukan/);
  });

  // Validasi rendering compact view: seluruh batch berlabel "Menunggu Persetujuan"
  const progGroups = [{
    programCode: 'PRG/NUR/2026',
    batches: preDocs.map(d => ({
      batchCode: d.batchCode,
      docs: [d]
    }))
  }];
  const html = renderProgramBatchCompactView({ programGroups: progGroups, stage: 'SELEKSI_1' });
  const matches = (html.match(/Menunggu Persetujuan/g) || []).length;
  // Minimal 4 badge pada 4 batch + 4 keterangan
  assert.ok(matches >= 8, `Harus menampilkan status Menunggu Persetujuan untuk seluruh 4 batch, ditemukan: ${matches}`);

  console.log('✓ PASS 12: Seluruh 4 batch (BTCH-001 s/d BTCH-004) berhasil diverifikasi terkunci dan transaksi Seleksi I diblokir saat SOW belum disetujui ASB.');
}

console.log('================================================================================');
console.log('SEMUA INTEGRATION TEST ASB GATE & MULTI-BEDENGAN BERHASIL LOLOS!');
console.log('================================================================================');

