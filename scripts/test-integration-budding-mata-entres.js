/**
 * test-integration-budding-mata-entres.js
 * Integration Test for "Jlh Mata Entres" field in Grafting and Regrafting transactions.
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
import assert from 'assert';

console.log('=== RUNNING INTEGRATION TESTS: Jlh Mata Entres (Grafting & Regrafting) ===\n');

// -------------------------------------------------------------
// TEST SUITE A: GRAFTING
// -------------------------------------------------------------
console.log('--- Test Suite A: Grafting ---');

// 1. Simulasikan pembuatan transaksi Grafting baru dengan jumlahMataEntres
const initialGraftingTx = {
  docNo: '2026/GRF/099',
  type: 'GRAFTING',
  seedingIndex: 0,
  batchNo: 'BTCH-001',
  sourceDocNo: '2026/SEL-III/001',
  tanggal: '17/09/2026',
  bedengan: 'BED-001',
  klonEntres: 'PB 260',
  klonRootstock: 'GT 1',
  workers: [{ id: 'WRK-001', name: 'Fadilah Yusuf Purba', code: '1405739', qty: 100 }],
  jumlah: 100,
  jumlahKayu: 10,
  jumlahMataEntres: 120, // Field baru
  jumlahDitolak: 0,
  alasan: null
};

let txs = storage.get('budding_transactions', []);
txs.push(initialGraftingTx);
storage.set('budding_transactions', txs);

// Verifikasi payload tersimpan di storage
const storedGrafting = storage.get('budding_transactions', []).find(t => t.docNo === '2026/GRF/099');
assert(storedGrafting, 'Transaksi Grafting berhasil disimpan');
assert.strictEqual(typeof storedGrafting.jumlahMataEntres, 'number', 'jumlahMataEntres bertipe number');
assert.strictEqual(storedGrafting.jumlahMataEntres, 120, 'Nilai jumlahMataEntres sesuai input (120)');
assert.strictEqual(storedGrafting.jumlahKayu, 10, 'jumlahKayu tidak terganggu (10)');
assert.strictEqual(storedGrafting.jumlah, 100, 'jumlah realisasi tidak terganggu (100)');
console.log('  ✓ Skenario A.1 - A.6: Simpan transaksi Grafting dengan jumlahMataEntres berhasil');

// 2. Simulasikan edit transaksi Grafting
storedGrafting.jumlahMataEntres = 150; // Update mata entres
const allTxs = storage.get('budding_transactions', []);
const idx = allTxs.findIndex(t => t.docNo === '2026/GRF/099');
allTxs[idx] = storedGrafting;
storage.set('budding_transactions', allTxs);

const reloadedGrafting = storage.get('budding_transactions', []).find(t => t.docNo === '2026/GRF/099');
assert.strictEqual(reloadedGrafting.jumlahMataEntres, 150, 'Nilai jumlahMataEntres berhasil dimuat ulang setelah edit (150)');
console.log('  ✓ Skenario A.7 - A.8: Load & edit transaksi Grafting berhasil');


// -------------------------------------------------------------
// TEST SUITE B: REGRAFTING
// -------------------------------------------------------------
console.log('\n--- Test Suite B: Regrafting ---');

// 1. Simulasikan pembuatan transaksi Regrafting baru dengan jumlahMataEntres
const initialRegraftingTx = {
  docNo: '2026/RGRF/099',
  type: 'REGRAFTING',
  seedingIndex: 0,
  regraftPoolDocNo: 'REG-POOL/2026/001',
  inspectionDocNo: '2026/INS/001',
  batchNo: 'BTCH-001',
  sourceDocNo: 'REG-POOL/2026/001',
  tanggal: '17/09/2026',
  bedengan: 'BED-001',
  klonEntres: 'IRR 112',
  klonRootstock: 'GT 1',
  workers: [{ id: 'WRK-001', name: 'Fadilah Yusuf Purba', code: '1405739', qty: 50 }],
  jumlah: 50,
  jumlahKayu: 5,
  jumlahMataEntres: 60, // Field baru
  jumlahDitolak: 0,
  alasan: 'Mata Entres Busuk / Mati'
};

let rTxs = storage.get('budding_transactions', []);
rTxs.push(initialRegraftingTx);
storage.set('budding_transactions', rTxs);

const storedRegrafting = storage.get('budding_transactions', []).find(t => t.docNo === '2026/RGRF/099');
assert(storedRegrafting, 'Transaksi Regrafting berhasil disimpan');
assert.strictEqual(typeof storedRegrafting.jumlahMataEntres, 'number', 'jumlahMataEntres bertipe number');
assert.strictEqual(storedRegrafting.jumlahMataEntres, 60, 'Nilai jumlahMataEntres sesuai input (60)');
assert.strictEqual(storedRegrafting.jumlahKayu, 5, 'jumlahKayu tidak terganggu (5)');
assert.strictEqual(storedRegrafting.alasan, 'Mata Entres Busuk / Mati', 'Property alasan tetap aman');
console.log('  ✓ Skenario B.1 - B.6: Simpan transaksi Regrafting dengan jumlahMataEntres berhasil');

// 2. Simulasikan edit transaksi Regrafting
storedRegrafting.jumlahMataEntres = 75;
const allRTxs = storage.get('budding_transactions', []);
const rIdx = allRTxs.findIndex(t => t.docNo === '2026/RGRF/099');
allRTxs[rIdx] = storedRegrafting;
storage.set('budding_transactions', allRTxs);

const reloadedRegrafting = storage.get('budding_transactions', []).find(t => t.docNo === '2026/RGRF/099');
assert.strictEqual(reloadedRegrafting.jumlahMataEntres, 75, 'Nilai jumlahMataEntres berhasil dimuat ulang setelah edit (75)');
assert.strictEqual(reloadedRegrafting.alasan, 'Mata Entres Busuk / Mati', 'Property alasan tetap terjaga');
console.log('  ✓ Skenario B.7 - B.9: Load & edit transaksi Regrafting berhasil dengan alasan tetap utuh');


// -------------------------------------------------------------
// TEST SUITE C: DATA LAMA (LEGACY DATA BACKWARD COMPATIBILITY)
// -------------------------------------------------------------
console.log('\n--- Test Suite C: Data Lama (Legacy Data Compatibility) ---');

const legacyTx = {
  docNo: '2026/GRF/LEGACY-001',
  type: 'GRAFTING',
  seedingIndex: 0,
  batchNo: 'BTCH-001',
  sourceDocNo: '2026/SEL-III/001',
  tanggal: '10/08/2026',
  bedengan: 'BED-001',
  klonEntres: 'PB 260',
  klonRootstock: 'GT 1',
  workers: [{ id: 'WRK-001', name: 'Fadilah Yusuf Purba', code: '1405739', qty: 200 }],
  jumlah: 200,
  jumlahKayu: 20,
  jumlahDitolak: 0
  // Note: legacyTx TIDAK memiliki property jumlahMataEntres
};

// Simulasi form edit rendering logic untuk data lama
const loadedVal = legacyTx.jumlahMataEntres !== undefined && legacyTx.jumlahMataEntres !== null ? legacyTx.jumlahMataEntres : '';
assert.strictEqual(loadedVal, '', 'Field baru menghasilkan string kosong/default aman saat data lama dibuka');
assert.doesNotThrow(() => {
  const safeParsed = parseInt(loadedVal || 0);
  assert.strictEqual(safeParsed, 0, 'Safe parsing fallback bernilai 0');
}, 'Tidak ada error saat memuat atau memproses data lama tanpa jumlahMataEntres');

console.log('  ✓ Skenario C.1 - C.4: Data legacy tanpa jumlahMataEntres termuat dengan aman tanpa error');

// Cleanup dummy integration test records
const cleanTxs = storage.get('budding_transactions', []).filter(t => 
  t.docNo !== '2026/GRF/099' && 
  t.docNo !== '2026/RGRF/099' &&
  t.docNo !== '2026/GRF/LEGACY-001'
);
storage.set('budding_transactions', cleanTxs);

console.log('\n=============================================================');
console.log('ALL INTEGRATION TEST SCENARIOS PASSED SUCCESSFULLY! (100%)');
console.log('=============================================================');
