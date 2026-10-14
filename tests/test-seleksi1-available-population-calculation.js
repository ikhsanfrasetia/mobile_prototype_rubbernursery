// Setup Mock LocalStorage for node environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

import assert from 'node:assert/strict';
import { storage } from '../js/core/storage.js';
import {
  createSeleksi1ExecutionTransaction,
  validateSeleksi1Execution,
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  SELECTION_STORAGE_KEY
} from '../js/modules/selection/selection-manager.js';
import { renderGlobalChildTransactionsSection } from '../js/modules/selection/selection-landing.js';

console.log('================================================================================');
console.log('INTEGRATION TEST: SELEKSI I AVAILABLE POPULATION CALCULATION (12.075 - 242 = 11.833)');
console.log('================================================================================\n');

// Mock User
const mockMantriUser = {
  id: 'MNT001',
  role: 'MANTRI_TANAMAN',
  name: 'Mantri Bibitan',
  estateId: 'EST-001',
  divisionId: 'DIV-001'
};

// Reset test data
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
storage.set(SELECTION_STORAGE_KEY, []);
const todayStr = new Date().toISOString().split('T')[0];
const effectiveDate = new Date().toLocaleDateString('en-CA');
const attDates = Array.from(new Set([todayStr, effectiveDate, '2026-10-12', '2026-10-13']));
storage.set('attendance_transactions', attDates.flatMap(d => [
  { type: 'SUPERVISOR', role: 'MANTRI_TANAMAN', attendanceType: 'DATANG', date: d, status: 'PRESENT' },
  { type: 'WORKER', workerId: 'WRK-01', attendanceType: 'DATANG', date: d, status: 'PRESENT' }
]));
storage.set('seeding_transactions', [{
  id: 'SOW-001',
  docNo: '2026/SOW/001',
  batchCode: 'BTCH-001',
  batchId: 'BTCH-001',
  status: 'DISETUJUI',
  verificationStatus: 'TERVERIFIKASI',
  totalDisemai: 12075,
  totalPolybag: 6038,
  rows: [{ bedenganId: 'BED-001', bedenganCode: 'BED-001', polybag: 6038, disemai: 12075 }]
}]);

// 1. Setup Dokumen Induk Seleksi I dengan Total Populasi 12.075 Pkk
const parentDoc = {
  id: 'DOC-SEL1-001',
  docNo: '2026/SEL/001',
  selectionDocNo: '2026/SEL/001',
  batchId: 'BTCH-001',
  batchCode: 'BTCH-001',
  batchNo: 'BTCH-001',
  bedenganId: 'BED-001',
  bedenganCode: 'BED-001',
  sourcePolybagQty: 6038,
  sourceBibitQty: 12075,
  batchTotalBibit: 12075,
  currentBibitQty: 12075,
  currentPolybagQty: 6038,
  sourceDocNo: '2026/SOW/001',
  programCode: '2026/TB/RNUR/001',
  programName: 'Program Nursery 2026',
  clone: 'GT 1',
  klon: 'GT 1',
  status: 'DRAFT',
  stage: 'SELEKSI_1',
  rows: [{
    bedenganId: 'BED-001',
    bedenganCode: 'BED-001',
    polybag: 6038,
    disemai: 12075,
    initialPolybag: 6038,
    initialBibit: 12075
  }]
};
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [parentDoc]);

// -----------------------------------------------------------------------------
// TEST 1: Validasi kalkulasi Populasi Tersedia (12.075 - 242 = 11.833)
// -----------------------------------------------------------------------------
console.log('--- TEST 1: Populasi awal 12.075 dan afkir 242 menghasilkan populasi tersedia 11.833 ---');
const payloadTx1 = {
  selectionDocumentId: parentDoc.id,
  selectionDocNo: parentDoc.docNo,
  bedenganCode: 'BED-001',
  bedenganId: 'BED-001',
  actualPolybagInspectedQty: 2500, // 2.500 Polybag diperiksa
  actualBibitSelectedQty: 242,     // 242 Bibit diseleksi (afkir)
  alasan: 'Kerdil',
  photo: { dataUrl: 'data:image/jpeg;base64,mockphoto1', capturedAt: new Date().toISOString() }
};

const valRes1 = validateSeleksi1Execution(payloadTx1, parentDoc, []);
assert.strictEqual(valRes1.isValid, true, 'Validasi transaksi 1 harus lolos');
assert.strictEqual(valRes1.parsed.actualPolybagInspectedQty, 2500, 'Polybag diperiksa harus 2.500 Ply');
assert.notStrictEqual(valRes1.parsed.bibitAwal, 5000, 'Polybag 2.500 TIDAK dikonversi menjadi 5.000 bibit pada Seleksi I');
assert.strictEqual(valRes1.parsed.bibitAwal, 12075, 'Populasi awal bedengan adalah 12.075 bibit');
assert.strictEqual(valRes1.parsed.actualBibitSelectedQty, 242, 'Bibit diseleksi harus 242');
assert.strictEqual(valRes1.parsed.actualBibitRetainedQty, 11833, 'Populasi tersedia WAJIB 11.833 (12.075 - 242)');
assert.strictEqual(valRes1.parsed.totalLayak, 11833, 'totalLayak harus 11.833');
assert.strictEqual(valRes1.parsed.jumlahLayak, 11833, 'jumlahLayak harus 11.833');
console.log('  [PASS] TEST 1: 12.075 - 242 = 11.833 Pkk diverifikasi pada layer validasi tanpa konversi * 2.');

// -----------------------------------------------------------------------------
// TEST 2: Transaksi tersimpan mempertahankan populasi awal dokumen induk
// -----------------------------------------------------------------------------
console.log('\n--- TEST 2: Jumlah polybag sesi tidak menggantikan populasi awal dokumen induk ---');
const res1 = createSeleksi1ExecutionTransaction(payloadTx1, mockMantriUser, { requirePhoto: false });
const tx1 = res1.transaction;
assert.strictEqual(tx1.actualPolybagInspectedQty, 2500, 'Polybag diperiksa = 2.500');
assert.strictEqual(tx1.bibitAwal, 12075, 'Populasi awal bedengan = 12.075');
assert.notStrictEqual(tx1.bibitAwal, 5000, 'Polybag 2.500 TIDAK dikonversi menjadi 5.000 bibit');
assert.strictEqual(tx1.actualBibitSelectedQty, 242, 'Afkir = 242');
assert.strictEqual(tx1.actualBibitRetainedQty, 11833, 'Populasi tersedia tersimpan = 11.833');
assert.strictEqual(tx1.sourceBibitQty, 12075, 'Populasi awal dokumen induk tetap 12.075');
console.log('  [PASS] TEST 2: Record transaksi menyimpan Populasi Tersedia 11.833 tanpa merusak basis induk.');

// -----------------------------------------------------------------------------
// TEST 3: Multi transaksi pada dokumen induk sama: pengurangan kumulatif tanpa double deduction
// -----------------------------------------------------------------------------
console.log('\n--- TEST 3: Beberapa transaksi seleksi pada dokumen induk yang sama tidak menyebabkan afkir dihitung ganda ---');
const payloadTx2 = {
  selectionDocumentId: parentDoc.id,
  selectionDocNo: parentDoc.docNo,
  bedenganCode: 'BED-001',
  bedenganId: 'BED-001',
  actualPolybagInspectedQty: 1000, // 1.000 Polybag diperiksa
  actualBibitSelectedQty: 150,     // 150 Bibit afkir tambahan
  alasan: 'Mati',
  photo: { dataUrl: 'data:image/jpeg;base64,mockphoto2', capturedAt: new Date().toISOString() }
};

const res2 = createSeleksi1ExecutionTransaction(payloadTx2, mockMantriUser, { requirePhoto: false });
const tx2 = res2.transaction;
// Kumulatif afkir = 242 + 150 = 392.
// Populasi tersedia setelah Tx 2 = 12.075 - 392 = 11.683 Pkk.
assert.strictEqual(tx2.actualPolybagInspectedQty, 1000, 'Polybag Tx2 = 1.000');
assert.strictEqual(tx2.bibitAwal, 12075, 'Populasi awal tetap 12.075');
assert.strictEqual(tx2.actualBibitSelectedQty, 150, 'Afkir Tx2 = 150');
assert.strictEqual(tx2.actualBibitRetainedQty, 11683, 'Populasi tersedia Tx2 = 11.683 (12.075 - 392)');
console.log('  [PASS] TEST 3: Kumulatif afkir (242 + 150 = 392) menghasilkan populasi tersedia 11.683 tanpa duplikasi.');

// -----------------------------------------------------------------------------
// TEST 4: Data historis dan transaksi existing tidak dimutasi tanpa prosedur
// -----------------------------------------------------------------------------
console.log('\n--- TEST 4: Data historis dan transaksi existing tidak dimutasi otomatis ---');
const storedTxs = storage.get(SELECTION_STORAGE_KEY, []);
const foundTx1 = storedTxs.find(t => t.id === tx1.id);
assert.strictEqual(foundTx1.actualBibitRetainedQty, 11833, 'Tx 1 tetap 11.833');
assert.strictEqual(foundTx1.actualBibitSelectedQty, 242, 'Tx 1 afkir tetap 242');

const legacyCorruptTx = {
  id: 'TX-LEGACY-HISTORICAL',
  docNo: '2026/SEL-I/099',
  parentSelectionDocumentId: parentDoc.id,
  actualPolybagInspectedQty: 2500,
  bibitAwal: 5000,
  actualBibitRetainedQty: 4758, // data historis legacy
  actualBibitSelectedQty: 242
};
// Merender HTML transaksi legacy tidak memutasi nilainya
const legacyHtml = renderGlobalChildTransactionsSection([legacyCorruptTx], [parentDoc], 'SELEKSI_1');
assert.ok(legacyHtml.includes('4.758'), 'Record legacy menampilkan nilai tersimpannya 4.758 tanpa auto-mutasi');
assert.strictEqual(legacyCorruptTx.actualBibitRetainedQty, 4758, 'Field legacy tidak termutasi');
console.log('  [PASS] TEST 4: Zero unwanted mutation pada data transaksi historis.');

// -----------------------------------------------------------------------------
// TEST 5: Deklarasi Mantri tidak memotong stok sebelum approval ASB
// -----------------------------------------------------------------------------
console.log('\n--- TEST 5: Deklarasi Mantri tidak memotong stok sebelum approval yang valid ---');
assert.strictEqual(tx1.stockMutationStatus, 'NOT_REQUIRED', 'Seleksi 1 eksekusi stockMutationStatus = NOT_REQUIRED');
assert.strictEqual(tx2.stockMutationStatus, 'NOT_REQUIRED', 'Seleksi 1 eksekusi stockMutationStatus = NOT_REQUIRED');
const journals = storage.get('batch_inventory_journal', []);
assert.strictEqual(journals.length, 0, 'Zero journal mutation dari transaksi eksekusi Seleksi I');
console.log('  [PASS] TEST 5: Integritas stok terjaga: transaksi Seleksi I tidak memotong stok tanpa approval ASB.');

// -----------------------------------------------------------------------------
// TEST 6: Ringkasan UI menampilkan metrik dan satuan yang benar
// -----------------------------------------------------------------------------
console.log('\n--- TEST 6: Ringkasan UI menampilkan metrik dan satuan yang benar ---');
const renderedHtml = renderGlobalChildTransactionsSection([tx1], [parentDoc], 'SELEKSI_1');

// Label wajib
assert.ok(renderedHtml.includes('Bibit Diperiksa'), 'UI memuat label "Bibit Diperiksa"');
assert.ok(renderedHtml.includes('Bibit Tersedia'), 'UI memuat label "Bibit Tersedia"');
assert.ok(renderedHtml.includes('Diseleksi'), 'UI memuat label "Diseleksi"');

// Header
assert.ok(renderedHtml.includes('2.500 Polybag'), 'UI memuat ringkasan 2.500 Polybag');
assert.ok(!renderedHtml.includes('(5.000 Bibit)'), 'UI TIDAK memuat konversi 5.000 Bibit pada Seleksi I');

// 3 Kolom
assert.ok(renderedHtml.includes('12.075'), 'Kolom Bibit Diperiksa memuat populasi awal 12.075');
assert.ok(renderedHtml.includes('11.833'), 'Kolom Bibit Tersedia WAJIB memuat 11.833');
assert.ok(renderedHtml.includes('242'), 'Kolom Diseleksi memuat 242');

console.log('  [PASS] TEST 6: UI menampilkan Populasi Awal (12.075), Bibit Tersedia (11.833), Diseleksi (242) tanpa konversi * 2.');

// -----------------------------------------------------------------------------
// TEST 7: Idempotensi penyimpanan transaksi Seleksi I (retry & double submit prevention)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 7: Idempotensi penyimpanan transaksi Seleksi I ---');
const initialTxCount = storage.get(SELECTION_STORAGE_KEY, []).length;
const retryPayload = {
  ...payloadTx1,
  id: tx1.id // submission ulang dengan id yang sama
};
const retryRes = createSeleksi1ExecutionTransaction(retryPayload, mockMantriUser, { requirePhoto: false });
assert.strictEqual(retryRes.isDuplicate, true, 'Sistem mendeteksi transaksi duplikat berdasarkan ID');
assert.strictEqual(retryRes.transaction.id, tx1.id, 'Mengembalikan transaksi existing');
assert.strictEqual(storage.get(SELECTION_STORAGE_KEY, []).length, initialTxCount, 'Jumlah transaksi di storage tidak bertambah');

// Uji coba dengan clientRequestId stabil
const clientReqPayload = {
  ...payloadTx1,
  id: null,
  actualPolybagInspectedQty: 30, // Dalam batas sisa scope bedengan BED-001 (tersisa 38)
  actualBibitSelectedQty: 5,
  clientRequestId: 'REQ-MOCK-IDEMPOTENT-001'
};
const firstSubmitRes = createSeleksi1ExecutionTransaction(clientReqPayload, mockMantriUser, { requirePhoto: false });
assert.strictEqual(firstSubmitRes.success, true, 'Submit pertama berhasil');
const afterFirstCount = storage.get(SELECTION_STORAGE_KEY, []).length;

const secondSubmitRes = createSeleksi1ExecutionTransaction(clientReqPayload, mockMantriUser, { requirePhoto: false });
assert.strictEqual(secondSubmitRes.isDuplicate, true, 'Submit kedua dengan clientRequestId sama dikenali sebagai duplikat');
assert.strictEqual(secondSubmitRes.transaction.id, firstSubmitRes.transaction.id, 'Mengembalikan record yang sama');
assert.strictEqual(storage.get(SELECTION_STORAGE_KEY, []).length, afterFirstCount, 'Zero duplicate record dibuat');
console.log('  [PASS] TEST 7: Idempotensi transaksi Seleksi I terverifikasi penuh (by id & by clientRequestId).');

console.log('\n================================================================================');
console.log('SEMUA 6 SKENARIO INTEGRATION TEST POPULASI TERSEDIA SELEKSI I BERHASIL (100% PASS)');
console.log('================================================================================');
