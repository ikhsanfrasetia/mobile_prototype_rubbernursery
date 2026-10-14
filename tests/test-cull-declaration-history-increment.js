import assert from 'node:assert';
import { storage } from '../js/core/storage.js';
import { isCullDocNo, parseCullDocNo, formatCullDocNo } from '../js/core/utils.js';
import {
  findExistingSelectionTransaction,
  declareSelectionItem,
  SELECTION_STATUS,
  SELECTION_STAGES,
  SELECTION_TYPES,
  SELECTION_STORAGE_KEY
} from '../js/modules/selection/selection-manager.js';
import {
  renderStandardizedRejectList
} from '../js/modules/selection/selection-landing.js';

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

const mockMantri = {
  id: 'USR-MTR-01',
  userId: 'USR-MTR-01',
  code: 'MTR01',
  name: 'Mantri Bibitan Test',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

const mockAsisten = {
  id: 'USR-ASB-01',
  userId: 'USR-ASB-01',
  code: 'ASB01',
  name: 'Asisten Bibitan Test',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

function seedAttendance() {
  const todayStr = new Date().toISOString().slice(0, 10);
  storage.set('attendance_transactions', [
    { type: 'SUPERVISOR', role: 'MANTRI_TANAMAN', attendanceType: 'DATANG', date: todayStr, status: 'PRESENT' },
    { type: 'WORKER', workerId: 'WRK-01', attendanceType: 'DATANG', date: todayStr, status: 'PRESENT' }
  ]);
}

function clearAllStorage() {
  globalThis.localStorage.clear();
  seedAttendance();
}

console.log('================================================================================');
console.log('INTEGRATION TEST: CULL DECLARATION HISTORY INCREMENT & ISOLATION (10 SCENARIOS)');
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: CULL 2026/CULL/SEL-I/002 dikenali sebagai deklarasi, bukan transaksi eksekusi
// -----------------------------------------------------------------------------
{
  clearAllStorage();
  console.log('--- TEST 1: CULL 2026/CULL/SEL-I/002 dikenali sebagai deklarasi CULL ---');

  const cullDoc = '2026/CULL/SEL-I/002';
  assert.strictEqual(isCullDocNo(cullDoc), true, 'Harus dikenali sebagai nomor dokumen CULL resmi');

  const cullTx = {
    id: 'SEL-TX-CULL-002',
    docNo: cullDoc,
    selectionNo: cullDoc,
    selectionPoolDocNo: cullDoc,
    selectionType: SELECTION_TYPES.PRA_OKULASI,
    selectionStage: SELECTION_STAGES.SELEKSI_1,
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    sourceDocNo: '2026/SOW/002',
    batchCode: 'BTCH-003',
    bedenganCode: 'BED-004',
    jumlahAfkir: 200,
    status: SELECTION_STATUS.READY_TO_CONFIRM
  };
  storage.set(SELECTION_STORAGE_KEY, [cullTx]);

  const poolItem = {
    id: 'POOL-ITEM-002',
    docNo: cullDoc,
    selectionTransactionId: cullTx.id,
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    sourceDocNo: '2026/SOW/002',
    batchCode: 'BTCH-003',
    bedenganCode: 'BED-004',
    jumlahAfkir: 200,
    status: SELECTION_STATUS.READY_TO_CONFIRM
  };

  const matched = findExistingSelectionTransaction(poolItem);
  assert.ok(matched, 'CULL 2026/CULL/SEL-I/002 HARUS ditemukan dan dicocokkan sebagai deklarasi');
  assert.strictEqual(matched.docNo, cullDoc);
  console.log('  [PASS] TEST 1: CULL 2026/CULL/SEL-I/002 berhasil dikenali sebagai deklarasi.');
}

// -----------------------------------------------------------------------------
// TEST 2 & 3: Deklarasi SEL-I valid muncul di Riwayat Deklarasi & Header (0) -> (1)
// -----------------------------------------------------------------------------
{
  clearAllStorage();
  console.log('\n--- TEST 2 & 3: Deklarasi SEL-I valid muncul di riwayat dan header berubah (0) -> (1) ---');

  const cullTx = {
    id: 'SEL-TX-CULL-002',
    docNo: '2026/CULL/SEL-I/002',
    selectionNo: '2026/CULL/SEL-I/002',
    selectionType: SELECTION_TYPES.PRA_OKULASI,
    selectionStage: SELECTION_STAGES.SELEKSI_1,
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    sourceDocNo: '2026/SOW/002',
    batchCode: 'BTCH-003',
    bedenganCode: 'BED-004',
    jumlahAfkir: 200,
    tanggal: '12/10/2026',
    status: SELECTION_STATUS.READY_TO_CONFIRM
  };

  // Sebelum deklarasi: 0 riwayat
  const htmlEmpty = renderStandardizedRejectList([], [], 'Empty', 'Desc', 'Daftar Afkir', '12/10/2026', []);
  assert.ok(htmlEmpty.includes('Riwayat Deklarasi (0)'), 'Header riwayat awal harus (0)');
  assert.ok(htmlEmpty.includes('Belum ada riwayat deklarasi'), 'Empty state riwayat harus muncul');

  // Setelah deklarasi: 1 riwayat
  const htmlWithCull = renderStandardizedRejectList([], [cullTx], 'Empty', 'Desc', 'Daftar Afkir', '12/10/2026', [cullTx]);
  assert.ok(htmlWithCull.includes('Riwayat Deklarasi (1)'), 'Header riwayat harus berubah menjadi (1)');
  assert.ok(htmlWithCull.includes('2026/CULL/SEL-I/002'), 'Nomor dokumen CULL SEL-I harus muncul pada HTML riwayat');
  assert.ok(htmlWithCull.includes('200'), 'Jumlah afkir 200 harus ditampilkan');
  assert.ok(htmlWithCull.includes('BED-004'), 'Bedengan BED-004 harus ditampilkan');
  console.log('  [PASS] TEST 2 & 3: Deklarasi SEL-I muncul di riwayat dan header menunjukkan (1).');
}

// -----------------------------------------------------------------------------
// TEST 4: Item pool yang telah dideklarasikan tidak lagi muncul sebagai pending
// -----------------------------------------------------------------------------
{
  clearAllStorage();
  console.log('\n--- TEST 4: Item pool yang telah dideklarasikan tidak lagi muncul sebagai pending ---');

  const declaredPoolItem = {
    id: 'POOL-ITEM-002',
    docNo: '2026/CULL/SEL-I/002',
    status: 'READY_TO_CONFIRM', // atau SELECTION_STATUS.READY_TO_CONFIRM
    batchCode: 'BTCH-003',
    bedenganCode: 'BED-004',
    jumlahAfkir: 200
  };

  const otherPendingItem = {
    id: 'POOL-ITEM-001',
    docNo: null,
    status: 'PENDING_DECLARATION',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-001',
    jumlahAfkir: 242
  };

  const cullTx = {
    id: 'SEL-TX-CULL-002',
    docNo: '2026/CULL/SEL-I/002',
    batchCode: 'BTCH-003',
    bedenganCode: 'BED-004',
    jumlahAfkir: 200,
    status: SELECTION_STATUS.READY_TO_CONFIRM
  };

  const html = renderStandardizedRejectList([declaredPoolItem, otherPendingItem], [cullTx], 'Empty', 'Desc', 'Daftar Afkir', '12/10/2026', [cullTx]);

  // Section pending title harus (1) karena hanya POOL-ITEM-001 yang pending
  assert.ok(html.includes('Daftar Afkir (1)'), 'Daftar pending hanya boleh memuat 1 item yang belum dideklarasikan');
  assert.ok(html.includes('BED-001'), 'BED-001 yang belum dideklarasikan harus tetap muncul di pending list');
  // Riwayat memuat item yang sudah dideklarasikan
  assert.ok(html.includes('Riwayat Deklarasi (1)'), 'Riwayat memuat 1 deklarasi yang telah disimpan');
  console.log('  [PASS] TEST 4: Item pool yang telah dideklarasikan tidak muncul di pending list.');
}

// -----------------------------------------------------------------------------
// TEST 5: Transaksi eksekusi Seleksi I tanpa CULL tetap diklasifikasikan sebagai eksekusi
// -----------------------------------------------------------------------------
{
  clearAllStorage();
  console.log('\n--- TEST 5: Transaksi eksekusi Seleksi I tanpa CULL tetap diklasifikasikan sebagai eksekusi ---');

  const execTx = {
    id: 'SEL-TX-EXEC-001',
    docNo: '2026/SEL-I/001',
    transactionType: 'PELAKSANAAN_SELEKSI_I',
    selectionType: SELECTION_TYPES.PRA_OKULASI,
    selectionStage: SELECTION_STAGES.SELEKSI_1,
    selectionDocumentId: 'SEL-DOC-001',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-001',
    status: 'RECORDED'
  };
  storage.set(SELECTION_STORAGE_KEY, [execTx]);

  assert.strictEqual(isCullDocNo(execTx.docNo), false, '2026/SEL-I/001 bukan dokumen CULL');

  const dummyPoolItem = {
    id: 'POOL-ITEM-NEW',
    originType: 'REJECT_PENYEMAIAN',
    sourceModule: 'PENYEMAIAN',
    sourceDocNo: '2026/SOW/001',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-001'
  };

  const matched = findExistingSelectionTransaction(dummyPoolItem);
  assert.strictEqual(matched, null, 'Transaksi eksekusi tidak boleh cocok sebagai transaksi CULL');
  console.log('  [PASS] TEST 5: Transaksi eksekusi terisolasi dan tidak disalahartikan sebagai CULL.');
}

// -----------------------------------------------------------------------------
// TEST 6: CULL SEL-II dan SEL-III tidak salah diklasifikasikan sebagai transaksi eksekusi
// -----------------------------------------------------------------------------
{
  clearAllStorage();
  console.log('\n--- TEST 6: CULL SEL-II dan SEL-III tidak salah diklasifikasikan sebagai eksekusi ---');

  const cullSel2 = {
    id: 'SEL-TX-CULL-II-001',
    docNo: '2026/CULL/SEL-II/001',
    selectionType: SELECTION_TYPES.PRA_OKULASI,
    selectionStage: SELECTION_STAGES.SELEKSI_2,
    batchCode: 'BTCH-002',
    bedenganCode: 'BED-002',
    jumlahAfkir: 50,
    status: SELECTION_STATUS.READY_TO_CONFIRM
  };

  const cullSel3 = {
    id: 'SEL-TX-CULL-III-001',
    docNo: '2026/CULL/SEL-III/001',
    selectionType: SELECTION_TYPES.PRA_OKULASI,
    selectionStage: SELECTION_STAGES.SELEKSI_3,
    batchCode: 'BTCH-003',
    bedenganCode: 'BED-003',
    jumlahAfkir: 30,
    status: SELECTION_STATUS.READY_TO_CONFIRM
  };

  storage.set(SELECTION_STORAGE_KEY, [cullSel2, cullSel3]);

  assert.strictEqual(isCullDocNo(cullSel2.docNo), true);
  assert.strictEqual(isCullDocNo(cullSel3.docNo), true);

  const match2 = findExistingSelectionTransaction({
    id: 'POOL-SEL2',
    docNo: '2026/CULL/SEL-II/001',
    batchCode: 'BTCH-002',
    bedenganCode: 'BED-002'
  });
  assert.ok(match2, 'CULL SEL-II harus dikenali');
  assert.strictEqual(match2.docNo, '2026/CULL/SEL-II/001');

  const match3 = findExistingSelectionTransaction({
    id: 'POOL-SEL3',
    docNo: '2026/CULL/SEL-III/001',
    batchCode: 'BTCH-003',
    bedenganCode: 'BED-003'
  });
  assert.ok(match3, 'CULL SEL-III harus dikenali');
  assert.strictEqual(match3.docNo, '2026/CULL/SEL-III/001');
  console.log('  [PASS] TEST 6: CULL SEL-II dan SEL-III berhasil dikenali sebagai deklarasi.');
}

// -----------------------------------------------------------------------------
// TEST 7: CULL Pindah Semai, Dederan, dan Pasca-Okulasi tetap terkelompok
// -----------------------------------------------------------------------------
{
  clearAllStorage();
  console.log('\n--- TEST 7: CULL Pindah Semai, Dederan, dan Pasca-Okulasi tetap terkelompok ---');

  const ddrCull = { docNo: '2026/CULL/DDR/001', originType: 'REJECT_DEDERAN', sourceModule: 'DEDERAN' };
  const psCull = { docNo: '2026/CULL/PS/001', originType: 'REJECT_PENYEMAIAN', sourceModule: 'PENYEMAIAN' };
  const oklCull = { docNo: '2026/CULL/SEL-OKL/001', originType: 'REJECT_OKULASI', sourceModule: 'BUDDING' };

  assert.strictEqual(parseCullDocNo(ddrCull.docNo).subCode, 'DDR');
  assert.strictEqual(parseCullDocNo(psCull.docNo).subCode, 'PS');
  assert.strictEqual(parseCullDocNo(oklCull.docNo).subCode, 'SEL-OKL');
  console.log('  [PASS] TEST 7: Subcode CULL terpisah dan terkelompok dengan benar.');
}

// -----------------------------------------------------------------------------
// TEST 8: Record CULL dengan bedengan berbeda tidak tertukar
// -----------------------------------------------------------------------------
{
  clearAllStorage();
  console.log('\n--- TEST 8: Record CULL dengan bedengan berbeda tidak tertukar ---');

  const cullBed1 = {
    id: 'SEL-TX-BED-001',
    docNo: '2026/CULL/SEL-I/001',
    sourceDocNo: '2026/SOW/001',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-001',
    jumlahAfkir: 242,
    status: SELECTION_STATUS.READY_TO_CONFIRM
  };

  storage.set(SELECTION_STORAGE_KEY, [cullBed1]);

  // Pool item dari bedengan BED-004 pada dokumen induk SOW yang sama
  const poolBed4 = {
    id: 'POOL-BED-004',
    sourceDocNo: '2026/SOW/001',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-004',
    jumlahAfkir: 200,
    status: 'PENDING_DECLARATION'
  };

  const matched = findExistingSelectionTransaction(poolBed4);
  assert.strictEqual(matched, null, 'CULL BED-001 TIDAK BOLEH tertaut ke kandidat pool BED-004');
  console.log('  [PASS] TEST 8: Isolasi identitas fisik bedengan mencegah penautan keliru.');
}

// -----------------------------------------------------------------------------
// TEST 9: Deklarasi lama format 3 segmen tetap terbaca
// -----------------------------------------------------------------------------
{
  clearAllStorage();
  console.log('\n--- TEST 9: Deklarasi lama format 3 segmen tetap terbaca ---');

  const legacyCullDoc = '2026/CULL/001';
  assert.strictEqual(isCullDocNo(legacyCullDoc), true);

  const legacyTx = {
    id: 'TX-LEGACY-001',
    docNo: legacyCullDoc,
    sourceDocNo: '2026/SOW/001',
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-001',
    jumlahAfkir: 100,
    status: SELECTION_STATUS.READY_TO_CONFIRM
  };
  storage.set(SELECTION_STORAGE_KEY, [legacyTx]);

  const poolItem = {
    id: 'POOL-LEGACY',
    docNo: legacyCullDoc,
    batchCode: 'BTCH-001',
    bedenganCode: 'BED-001'
  };

  const matched = findExistingSelectionTransaction(poolItem);
  assert.ok(matched, 'Dokumen legacy 2026/CULL/001 harus dapat dicocokkan');
  assert.strictEqual(matched.docNo, legacyCullDoc);
  console.log('  [PASS] TEST 9: Dokumen lama format 3 segmen tetap didukung.');
}

// -----------------------------------------------------------------------------
// TEST 10: Tidak ada mutasi stok atau perubahan approval akibat proses rendering
// -----------------------------------------------------------------------------
{
  clearAllStorage();
  console.log('\n--- TEST 10: Tidak ada mutasi stok atau perubahan approval akibat rendering ---');

  const cullTx = {
    id: 'SEL-TX-CULL-002',
    docNo: '2026/CULL/SEL-I/002',
    batchCode: 'BTCH-003',
    bedenganCode: 'BED-004',
    jumlahAfkir: 200,
    status: SELECTION_STATUS.READY_TO_CONFIRM,
    stockMutationStatus: 'PENDING'
  };
  storage.set(SELECTION_STORAGE_KEY, [cullTx]);
  storage.set('batch_inventory_journal', []);

  const snapshotTxsBefore = JSON.stringify(storage.get(SELECTION_STORAGE_KEY, []));
  const snapshotJournalBefore = JSON.stringify(storage.get('batch_inventory_journal', []));

  // Jalankan render berkali-kali
  renderStandardizedRejectList([], [cullTx], 'Empty', 'Desc', 'Daftar Afkir', '12/10/2026', [cullTx]);
  renderStandardizedRejectList([], [cullTx], 'Empty', 'Desc', 'Daftar Afkir', '12/10/2026', [cullTx]);

  const snapshotTxsAfter = JSON.stringify(storage.get(SELECTION_STORAGE_KEY, []));
  const snapshotJournalAfter = JSON.stringify(storage.get('batch_inventory_journal', []));

  assert.strictEqual(snapshotTxsBefore, snapshotTxsAfter, 'Transaksi seleksi tidak boleh termutasi saat render');
  assert.strictEqual(snapshotJournalBefore, snapshotJournalAfter, 'Jurnal inventori tidak boleh termutasi saat render');
  console.log('  [PASS] TEST 10: Rendering sepenuhnya bebas efek samping mutasi atau approval.');
}

console.log('\n================================================================================');
console.log('TOTAL SCENARIOS: 10 | ALL PASSED (10/10) ✓');
console.log('================================================================================');
