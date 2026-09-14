/**
 * scripts/test-seeding-to-selection-integration.js
 * Comprehensive Integration Test Suite: INTEGRASI HASIL PENYEMAIAN KE SELEKSI
 */

if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    }
  };
}

import { storage } from '../js/core/storage.js';
import {
  integrateSeedingToSelectionPool,
  syncAllSeedingsToSelectionPool,
  approveSelectionRecord,
  filterSelectionByScope,
  SELECTION_STATUS,
  STOCK_MUTATION_STATUS
} from '../js/modules/selection/selection-manager.js';
import { ROLES } from '../js/core/user-context.js';
import { getAvailableQty } from '../js/core/batch-inventory-service.js';

console.log('='.repeat(80));
console.log('   SIGMA RUBBER NURSERY — INTEGRATION TEST: SEEDING TO SELECTION INTEGRATION   ');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// Setup isolated storage fixture
storage.set('selection_pool', []);
storage.set('selection_transactions', []);
storage.set('seeding_transactions', []);
storage.set('nursery_batches', [
  {
    id: 'BATCH-TBS-01',
    batchId: 'BATCH-TBS-01',
    batchCode: 'BTCH-TBS-001',
    batchNo: 'BTCH-TBS-001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    programId: 'PRG-2026-001',
    availableQty: 10000,
    currentQty: 10000,
    status: 'ACTIVE'
  },
  {
    id: 'BATCH-APM-01',
    batchId: 'BATCH-APM-01',
    batchCode: 'BTCH-APM-001',
    batchNo: 'BTCH-APM-001',
    estateId: 'EST-APM',
    divisionId: 'DIV-APM-02',
    programId: 'PRG-2026-002',
    availableQty: 5000,
    currentQty: 5000,
    status: 'ACTIVE'
  }
]);

// -----------------------------------------------------------------------------
// Skenario 1: Penyemaian dengan Rusak saja
// -----------------------------------------------------------------------------
console.log('\n--- SKENARIO 1: Penyemaian dengan Rusak saja ---');
storage.set('selection_pool', []);
const txRusakOnly = {
  id: 'SEED-TX-001',
  docNo: '2026/SOW/001',
  sourceDocNo: '2026/APR/001',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  programId: 'PRG-2026-001',
  program: 'PRG/NUR/01/2026',
  batchId: 'BATCH-TBS-01',
  batchCode: 'BTCH-TBS-001',
  batchNo: 'BTCH-TBS-001',
  bedenganId: 'BED-TBS-001',
  bedengan: 'BED-001',
  klonAwal: 'GT 1',
  totalDisemai: 39000,
  totalPolybag: 19500,
  ditolak: 250,
  alasanDitolak: 'Rusak',
  rusakQty: 250,
  matiQty: 0,
  lainnyaQty: 0
};

const res1 = integrateSeedingToSelectionPool(txRusakOnly);
assert(res1.success === true, 'Integrasi sukses untuk Rusak saja');
assert(res1.createdCount === 1, 'Hanya 1 entry dibuat untuk Rusak');
const pool1 = storage.get('selection_pool', []);
assert(pool1.length === 1, 'Selection pool berisi 1 entry');
assert(pool1[0].category === 'RUSAK', 'Kategori entry adalah RUSAK');
assert(pool1[0].jumlahAfkir === 250, 'Jumlah afkir adalah 250 Pkk');
assert(pool1[0].sourceModule === 'PENYEMAIAN', 'sourceModule adalah PENYEMAIAN');
assert(pool1[0].sourceTransactionType === 'SEEDING', 'sourceTransactionType adalah SEEDING');
assert(pool1[0].sourceDocNo === '2026/SOW/001', 'sourceDocNo mengacu ke 2026/SOW/001');

// -----------------------------------------------------------------------------
// Skenario 2: Penyemaian dengan Mati saja
// -----------------------------------------------------------------------------
console.log('\n--- SKENARIO 2: Penyemaian dengan Mati saja ---');
storage.set('selection_pool', []);
const txMatiOnly = {
  id: 'SEED-TX-002',
  docNo: '2026/SOW/002',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  batchId: 'BATCH-TBS-01',
  batchCode: 'BTCH-TBS-001',
  totalDisemai: 15000,
  ditolak: 100,
  alasanDitolak: 'Mati',
  rusakQty: 0,
  matiQty: 100,
  lainnyaQty: 0
};

const res2 = integrateSeedingToSelectionPool(txMatiOnly);
assert(res2.createdCount === 1, 'Hanya 1 entry dibuat untuk Mati');
const pool2 = storage.get('selection_pool', []);
assert(pool2[0].category === 'MATI', 'Kategori entry adalah MATI');
assert(pool2[0].jumlahAfkir === 100, 'Jumlah afkir adalah 100 Pkk');

// -----------------------------------------------------------------------------
// Skenario 3: Penyemaian dengan Lainnya saja
// -----------------------------------------------------------------------------
console.log('\n--- SKENARIO 3: Penyemaian dengan Lainnya saja ---');
storage.set('selection_pool', []);
const txLainnyaOnly = {
  id: 'SEED-TX-003',
  docNo: '2026/SOW/003',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  batchId: 'BATCH-TBS-01',
  batchCode: 'BTCH-TBS-001',
  totalDisemai: 20000,
  ditolak: 50,
  alasanDitolak: 'Lainnya',
  rusakQty: 0,
  matiQty: 0,
  lainnyaQty: 50
};

const res3 = integrateSeedingToSelectionPool(txLainnyaOnly);
assert(res3.createdCount === 1, 'Hanya 1 entry dibuat untuk Lainnya');
const pool3 = storage.get('selection_pool', []);
assert(pool3[0].category === 'LAINNYA', 'Kategori entry adalah LAINNYA');
assert(pool3[0].jumlahAfkir === 50, 'Jumlah afkir adalah 50 Pkk');

// -----------------------------------------------------------------------------
// Skenario 4: Penyemaian dengan Rusak, Mati, dan Lainnya sekaligus
// -----------------------------------------------------------------------------
console.log('\n--- SKENARIO 4: Penyemaian dengan Rusak, Mati, dan Lainnya sekaligus ---');
storage.set('selection_pool', []);
const txMultiCategory = {
  id: 'SEED-TX-004',
  docNo: '2026/SOW/004',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  programId: 'PRG-2026-001',
  batchId: 'BATCH-TBS-01',
  batchCode: 'BTCH-TBS-001',
  bedenganId: 'BED-TBS-001',
  bedengan: 'BED-001',
  totalDisemai: 50000,
  totalPolybag: 25000,
  rusakQty: 150,
  matiQty: 80,
  lainnyaQty: 20
};

const res4 = integrateSeedingToSelectionPool(txMultiCategory);
assert(res4.createdCount === 3, 'Dihasilkan 3 entry terpisah (1 per kategori non-zero)');
const pool4 = storage.get('selection_pool', []);
assert(pool4.length === 3, 'Selection pool memiliki 3 entri');
const cats = pool4.map(p => p.category);
assert(cats.includes('RUSAK') && cats.includes('MATI') && cats.includes('LAINNYA'), 'Kategori RUSAK, MATI, LAINNYA lengkap');
assert(pool4.find(p => p.category === 'RUSAK').jumlahAfkir === 150, 'Rusak = 150');
assert(pool4.find(p => p.category === 'MATI').jumlahAfkir === 80, 'Mati = 80');
assert(pool4.find(p => p.category === 'LAINNYA').jumlahAfkir === 20, 'Lainnya = 20');

// -----------------------------------------------------------------------------
// Skenario 5: Penyemaian dengan semua nilai 0
// -----------------------------------------------------------------------------
console.log('\n--- SKENARIO 5: Penyemaian dengan semua nilai 0 ---');
storage.set('selection_pool', []);
const txZeroReject = {
  id: 'SEED-TX-005',
  docNo: '2026/SOW/005',
  totalDisemai: 20000,
  ditolak: 0,
  alasanDitolak: 'Tidak Ada',
  rusakQty: 0,
  matiQty: 0,
  lainnyaQty: 0
};

const res5 = integrateSeedingToSelectionPool(txZeroReject);
assert(res5.createdCount === 0, 'Tidak ada entry dibuat jika ditolak = 0');
const pool5 = storage.get('selection_pool', []);
assert(pool5.length === 0, 'Selection pool tetap kosong');

// -----------------------------------------------------------------------------
// Skenario 6: Penyemaian dengan nilai negatif atau tidak valid
// -----------------------------------------------------------------------------
console.log('\n--- SKENARIO 6: Penyemaian dengan nilai negatif atau tidak valid ---');
let errorCaught = false;
try {
  integrateSeedingToSelectionPool({
    id: 'SEED-TX-006',
    docNo: '2026/SOW/006',
    rusakQty: -50
  });
} catch (err) {
  errorCaught = true;
  assert(err.message.includes('tidak boleh negatif'), `Error negatif berhasil ditangkap: "${err.message}"`);
}
assert(errorCaught === true, 'Eksekusi melempar error saat nilai negatif');

let invalidStringCaught = false;
try {
  integrateSeedingToSelectionPool({
    id: 'SEED-TX-007',
    docNo: '2026/SOW/007',
    rusakQty: 'bukan_angka'
  });
} catch (err) {
  invalidStringCaught = true;
  assert(err.message.includes('tidak valid'), `Error NaN berhasil ditangkap: "${err.message}"`);
}
assert(invalidStringCaught === true, 'Eksekusi melempar error saat nilai non-numeric');

// -----------------------------------------------------------------------------
// Skenario 7: Eksekusi integrasi dua kali untuk memastikan tidak duplikat (Idempotency)
// -----------------------------------------------------------------------------
console.log('\n--- SKENARIO 7: Idempotency & Mencegah Duplikasi ---');
storage.set('selection_pool', []);
const txIdempotent = {
  id: 'SEED-TX-008',
  docNo: '2026/SOW/008',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  rusakQty: 300,
  matiQty: 100
};

const run1 = integrateSeedingToSelectionPool(txIdempotent);
assert(run1.createdCount === 2, 'Run 1 membuat 2 entri (Rusak 300, Mati 100)');
const countAfterRun1 = storage.get('selection_pool', []).length;

const run2 = integrateSeedingToSelectionPool(txIdempotent);
assert(run2.createdCount === 0, 'Run 2 tidak membuat entri duplikat (createdCount: 0)');
const countAfterRun2 = storage.get('selection_pool', []).length;
assert(countAfterRun1 === countAfterRun2 && countAfterRun2 === 2, 'Jumlah entri di pool tetap 2 (tidak bertambah)');

// -----------------------------------------------------------------------------
// Skenario 8: Verifikasi referensi transaksi asal
// -----------------------------------------------------------------------------
console.log('\n--- SKENARIO 8: Verifikasi Referensi Transaksi Asal ---');
const pool8 = storage.get('selection_pool', []);
const entry8 = pool8[0];
assert(entry8.sourceModule === 'PENYEMAIAN', 'sourceModule tercatat PENYEMAIAN');
assert(entry8.sourceTransactionType === 'SEEDING', 'sourceTransactionType tercatat SEEDING');
assert(entry8.sourceTransactionId === 'SEED-TX-008', 'sourceTransactionId sesuai ID asal');
assert(entry8.sourceDocNo === '2026/SOW/008', 'sourceDocNo sesuai docNo asal');

// -----------------------------------------------------------------------------
// Skenario 9: Verifikasi scope Estate dan Division
// -----------------------------------------------------------------------------
console.log('\n--- SKENARIO 9: Verifikasi Scope Estate & Division ---');
storage.set('selection_pool', []);
integrateSeedingToSelectionPool({
  id: 'SEED-TBS-001',
  docNo: '2026/SOW/TBS/001',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  rusakQty: 100
});
integrateSeedingToSelectionPool({
  id: 'SEED-APM-001',
  docNo: '2026/SOW/APM/001',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  rusakQty: 200
});

const userTBS = { userId: 'USR-MNT-TBS', estateId: 'EST-TBS', divisionId: 'DIV-001', role: ROLES.MANTRI_BIBITAN };
const userAPM = { userId: 'USR-MNT-APM', estateId: 'EST-APM', divisionId: 'DIV-APM-02', role: ROLES.MANTRI_BIBITAN };

const poolAll = storage.get('selection_pool', []);
const scopedTBS = filterSelectionByScope(poolAll, userTBS);
const scopedAPM = filterSelectionByScope(poolAll, userAPM);

assert(scopedTBS.length === 1 && scopedTBS[0].estateId === 'EST-TBS', 'User TBS hanya melihat pool TBS');
assert(scopedAPM.length === 1 && scopedAPM[0].estateId === 'EST-APM', 'User APM hanya melihat pool APM');

// -----------------------------------------------------------------------------
// Skenario 10: Verifikasi bahwa Bibit Disemai tidak masuk Selection Pool
// -----------------------------------------------------------------------------
console.log('\n--- SKENARIO 10: Bibit Disemai TIDAK Masuk Selection Pool ---');
storage.set('selection_pool', []);
const txDisemaiOnly = {
  id: 'SEED-DISEMAI-ONLY',
  docNo: '2026/SOW/DISEMAI',
  totalDisemai: 40000,
  totalPolybag: 20000,
  ditolak: 0,
  rusakQty: 0,
  matiQty: 0,
  lainnyaQty: 0
};
integrateSeedingToSelectionPool(txDisemaiOnly);
const pool10 = storage.get('selection_pool', []);
assert(pool10.length === 0, 'Bibit disemai 40.000 Pkk tidak pernah masuk ke selection_pool');

// -----------------------------------------------------------------------------
// Skenario 11: Verifikasi bahwa Persetujuan Seleksi tetap menjadi tahap Mutasi Stok
// -----------------------------------------------------------------------------
console.log('\n--- SKENARIO 11: Mutasi Stok Hanya Saat Persetujuan ASB ---');
const asbTBS = { userId: 'USR-ASB-TBS', name: 'Asisten TBS', estateId: 'EST-TBS', divisionId: 'DIV-001', role: ROLES.ASISTEN_BIBITAN };
const initialBatchStock = getAvailableQty('BTCH-TBS-001');

// Memasukkan ke pool TIDAK mengurangi stok batch
storage.set('selection_pool', []);
integrateSeedingToSelectionPool({
  id: 'SEED-MUTASI-TEST',
  docNo: '2026/SOW/MUTASI',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  batchId: 'BATCH-TBS-01',
  batchCode: 'BTCH-TBS-001',
  rusakQty: 50
});
const stockAfterPool = getAvailableQty('BTCH-TBS-001');
assert(stockAfterPool === initialBatchStock, `Stok awal (${initialBatchStock}) TIDAK berkurang saat masuk selection_pool`);

// Simulasikan transaksi seleksi yang diajukan dari pool
storage.set('selection_transactions', [
  {
    id: 'SEL-MUTASI-01',
    docNo: '2026/CULL/MUTASI/01',
    batchId: 'BATCH-TBS-01',
    batchCode: 'BTCH-TBS-001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    jumlahDiperiksa: 50,
    jumlahLayak: 0,
    jumlahAfkir: 50,
    status: SELECTION_STATUS.MENUNGGU_VERIFIKASI,
    stockMutationStatus: STOCK_MUTATION_STATUS.PENDING
  }
]);

// Asisten menyetujui hasil seleksi -> stok termutasi secara atomik
approveSelectionRecord('SEL-MUTASI-01', 'Disetujui', asbTBS, true);
const stockAfterApproval = getAvailableQty('BTCH-TBS-001');
assert(stockAfterApproval === initialBatchStock - 50, `Stok berkurang (${initialBatchStock} -> ${stockAfterApproval}) HANYA setelah persetujuan ASB`);

console.log('\n' + '='.repeat(80));
console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
console.log('='.repeat(80) + '\n');

if (failed > 0) process.exit(1);
