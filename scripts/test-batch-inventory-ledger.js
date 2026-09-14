/**
 * scripts/test-batch-inventory-ledger.js
 * Integration Test Suite for:
 * TASK-REFACTOR-BATCH-INVENTORY-LEDGER-01
 * Pemisahan Inventory Ledger dari Master Batch
 * 
 * Skenario Pengujian:
 * SCENARIO 1 — RECEIPT (qtyIn = 100 -> saldo = 100)
 * SCENARIO 2 — DISPATCH (qtyOut = 30 -> saldo = 70)
 * SCENARIO 3 — SELECTION (qtyOut = 10 -> saldo = 60)
 * SCENARIO 4 — DESTRUCTION (qtyOut = 5 -> saldo = 55)
 * SCENARIO 5 — HISTORY (Semua mutasi tercatat berurutan: Receipt -> Dispatch -> Selection -> Destruction)
 * SCENARIO 6 — MASTER BATCH (UI & Master Batch List tetap pure master / tidak menampilkan stok)
 * SCENARIO 7 — MANTRI TRANSACTION (Mantri resolve batch & saldo diperoleh dari Inventory Service)
 * SCENARIO 8 — CROSS ESTATE (Batch TBS tidak dapat digunakan pada scope APM)
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
  global.localStorage = globalThis.localStorage;
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    location: { hash: '' }
  };
}

import { storage } from '../js/core/storage.js';
import {
  getBatchInventory,
  getAvailableQty,
  initBatchInventory,
  addBatchStockFromReceipt,
  deductBatchStock,
  deductMultiBatchStock,
  getBatchStockHistory,
  getAllInventoryStates,
  getAllJournalEntries,
  resetInventoryToDefault,
  INVENTORY_TX_TYPE,
  INVENTORY_STATUS,
  STORAGE_KEY_INVENTORY_STATES,
  STORAGE_KEY_INVENTORY_JOURNAL
} from '../js/core/batch-inventory-service.js';

import {
  createBatch,
  getBatchById,
  getBatchByCode,
  getAllBatches,
  getActiveBatches,
  getAvailableBatchStock,
  resetBatchMasterToDefault
} from '../js/data/batch-master.js';

import {
  getNurseryBatches,
  deductBatchStock as deductDispatchStock,
  deductMultiBatchStock as deductMultiDispatchStock
} from '../js/modules/dispatch/dispatch-landing.js';

import {
  mutateStockFromSelection,
  SELECTION_STATUS,
  STOCK_MUTATION_STATUS
} from '../js/modules/selection/selection-manager.js';

import {
  mutateStockFromDestruction,
  DESTRUCTION_STATUS
} from '../js/modules/destruction/destruction-manager.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('INTEGRATION TEST SUITE: TASK-REFACTOR-BATCH-INVENTORY-LEDGER-01');
  console.log('PEMISAHAN INVENTORY LEDGER DARI MASTER BATCH');
  console.log('================================================================\n');

  // Setup Clean Baseline
  storage.set('nursery_batches', []);
  storage.set('selection_transactions', []);
  storage.set('destruction_transactions', []);
  storage.set('dispatch_transactions', []);
  resetInventoryToDefault();
  resetBatchMasterToDefault();

  const userAsb = {
    userId: 'USR-ASB-TBS-01',
    name: 'Asisten Bibitan TBS',
    role: 'ASISTEN_BIBITAN',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001'
  };

  const userMantri = {
    userId: 'USR-MTR-TBS-01',
    name: 'Mantri Bibitan TBS',
    role: 'MANTRI_BIBITAN',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001'
  };

  // ============================================================================
  // PREPARATION: Buat Master Batch di Master Data (Pure Reference)
  // ============================================================================
  console.log('--- PREPARATION: Create Master Batch in Reference Layer ---');
  const createdBatch = createBatch({
    batchCode: 'BTCH-001',
    name: 'Batch-001',
    programId: 'PRG-2026-001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    clone: 'PB 260',
    klon: 'PB 260',
    category: 'Polibag Besar',
    growthStage: 'Rubber Advance Planting Material'
  }, userAsb);

  assert(createdBatch && createdBatch.id, 'Master Batch berhasil dibuat via createBatch()');
  const batchId = createdBatch.id;
  const batchCode = createdBatch.batchCode || createdBatch.kode;
  console.log(`  Created Master Batch: id=${batchId}, code=${batchCode}\n`);

  // Saldo awal harus 0 sebelum ada transaksi penerimaan/receipt
  assert(getAvailableQty(batchId) === 0, 'Saldo awal batch pada inventory service adalah 0');
  assert(getAvailableBatchStock(batchId) === 0, 'getAvailableBatchStock() dari batch-master mengembalikan 0');

  // ============================================================================
  // SCENARIO 1 — RECEIPT (Penerimaan Stok Masuk)
  // ============================================================================
  console.log('--- SCENARIO 1: RECEIPT (Transaksi Penerimaan Stok Masuk 100) ---');
  const receiptMeta = {
    id: 'RCP-2026-001',
    receiptDocNo: 'RCP-2026-001',
    docNo: 'RCP-2026-001'
  };

  const receiptResult = addBatchStockFromReceipt(
    batchId,
    100,
    receiptMeta,
    userAsb,
    'Penerimaan bibit dari Kebun Sepupu KSP'
  );

  assert(receiptResult !== null, 'addBatchStockFromReceipt() berhasil dieksekusi');
  assert(receiptResult.availableQty === 100, 'Inventory Service mencatat availableQty = 100');
  assert(receiptResult.receivedQty === 100, 'Inventory Service mencatat receivedQty = 100');
  assert(receiptResult.status === INVENTORY_STATUS.AVAILABLE, 'Status inventory batch menjadi AVAILABLE');

  // Verify Single Source of Truth
  const currentStockAfterReceipt = getAvailableQty(batchId);
  assert(currentStockAfterReceipt === 100, 'getAvailableQty(batchId) mengembalikan saldo 100');
  assert(getAvailableBatchStock(batchId) === 100, 'getAvailableBatchStock(batchId) membaca saldo 100 via Inventory Service');

  // Verify Master Batch can be resolved by transaction engine
  const resolvedMaster = getBatchById(batchId);
  assert(resolvedMaster && resolvedMaster.id === batchId, 'Batch dapat dibaca/di-resolve oleh transaction engine');
  console.log('  Scenario 1 Result: PASS (Saldo = 100)\n');

  // ============================================================================
  // SCENARIO 2 — DISPATCH (Pengeluaran Bibit)
  // ============================================================================
  console.log('--- SCENARIO 2: DISPATCH (Pengeluaran Stok 30) ---');
  const dispatchSuccess = deductDispatchStock(batchCode, 30);
  assert(dispatchSuccess === true, 'deductDispatchStock(batchCode, 30) berhasil');

  const stockAfterDispatch = getAvailableQty(batchId);
  assert(stockAfterDispatch === 70, 'Saldo setelah Dispatch 30 adalah 70');
  assert(getAvailableBatchStock(batchId) === 70, 'getAvailableBatchStock(batchId) konsisten = 70');
  console.log('  Scenario 2 Result: PASS (Saldo = 70)\n');

  // ============================================================================
  // SCENARIO 3 — SELECTION (Seleksi Bibit Afkir)
  // ============================================================================
  console.log('--- SCENARIO 3: SELECTION (Pengurangan Stok Seleksi Afkir 10) ---');
  const selectionTx = {
    id: 'SEL-2026-001',
    docNo: 'SEL-2026-001',
    batchId: batchId,
    batchCode: batchCode,
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    programId: 'PRG-2026-001',
    jumlahAfkir: 10,
    status: SELECTION_STATUS.DISETUJUI,
    stockMutationStatus: STOCK_MUTATION_STATUS.PENDING,
    createdAt: new Date().toISOString()
  };
  storage.set('selection_transactions', [selectionTx]);

  const selectionResult = mutateStockFromSelection('SEL-2026-001', userAsb);
  assert(selectionResult && selectionResult.success === true, 'mutateStockFromSelection() berhasil diproses');
  assert(selectionResult.status === STOCK_MUTATION_STATUS.APPLIED, 'stockMutationStatus menjadi APPLIED');

  const stockAfterSelection = getAvailableQty(batchId);
  assert(stockAfterSelection === 60, 'Saldo setelah Seleksi 10 adalah 60');
  assert(getAvailableBatchStock(batchId) === 60, 'getAvailableBatchStock(batchId) konsisten = 60');
  console.log('  Scenario 3 Result: PASS (Saldo = 60)\n');

  // ============================================================================
  // SCENARIO 4 — DESTRUCTION (Pemusnahan Bibit)
  // ============================================================================
  console.log('--- SCENARIO 4: DESTRUCTION (Pengurangan Stok Pemusnahan 5) ---');
  const destructionTx = {
    id: 'DES-2026-001',
    docNo: 'DES-2026-001',
    batchId: batchId,
    batchCode: batchCode,
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    programId: 'PRG-2026-001',
    destructionQty: 5,
    status: DESTRUCTION_STATUS.DISETUJUI,
    stockMutationStatus: STOCK_MUTATION_STATUS.PENDING,
    createdAt: new Date().toISOString()
  };
  storage.set('destruction_transactions', [destructionTx]);

  const destructionResult = mutateStockFromDestruction('DES-2026-001', userAsb);
  assert(destructionResult && destructionResult.success === true, 'mutateStockFromDestruction() berhasil diproses');
  assert(destructionResult.status === STOCK_MUTATION_STATUS.APPLIED, 'stockMutationStatus destruction menjadi APPLIED');

  const stockAfterDestruction = getAvailableQty(batchId);
  assert(stockAfterDestruction === 55, 'Saldo setelah Destruction 5 adalah 55');
  assert(getAvailableBatchStock(batchId) === 55, 'getAvailableBatchStock(batchId) konsisten = 55');
  console.log('  Scenario 4 Result: PASS (Saldo = 55)\n');

  // ============================================================================
  // SCENARIO 5 — HISTORY (Jurnal Mutasi Berurutan)
  // ============================================================================
  console.log('--- SCENARIO 5: HISTORY (Verifikasi Urutan Histori & Jurnal Mutasi) ---');
  const history = getBatchStockHistory(batchId);
  assert(Array.isArray(history), 'getBatchStockHistory() mengembalikan array');
  assert(history.length === 4, `Histori mencatat 4 mutasi secara berurutan (actual: ${history.length})`);

  assert(history[0].txType === INVENTORY_TX_TYPE.RECEIPT && history[0].qtyIn === 100 && history[0].balance === 100,
    'Jurnal 1: RECEIPT (qtyIn=100, balance=100)');
  assert(history[1].txType === INVENTORY_TX_TYPE.DISPATCH && history[1].qtyOut === 30 && history[1].balance === 70,
    'Jurnal 2: DISPATCH (qtyOut=30, balance=70)');
  assert(history[2].txType === INVENTORY_TX_TYPE.SELECTION && history[2].qtyOut === 10 && history[2].balance === 60,
    'Jurnal 3: SELECTION (qtyOut=10, balance=60)');
  assert(history[3].txType === INVENTORY_TX_TYPE.DESTRUCTION && history[3].qtyOut === 5 && history[3].balance === 55,
    'Jurnal 4: DESTRUCTION (qtyOut=5, balance=55)');

  console.log('  Scenario 5 Result: PASS (Semua mutasi tercatat berurutan: RECEIPT -> DISPATCH -> SELECTION -> DESTRUCTION)\n');

  // ============================================================================
  // SCENARIO 6 — MASTER BATCH (Pure Reference UI & No Stock in Master View)
  // ============================================================================
  console.log('--- SCENARIO 6: MASTER BATCH (UI & Master Batch List Normal & Pure Reference) ---');
  const masterList = getAllBatches();
  assert(masterList.length === 1, 'Master Batch list mengembalikan 1 record');
  const bView = masterList[0];
  assert(bView.id === batchId, 'Batch ditemukan dengan ID yang sesuai');
  assert(bView.batchCode === batchCode || bView.kode === batchCode, 'Kode batch sesuai');
  assert(bView.statusMaster === 'ACTIVE', 'statusMaster batch adalah ACTIVE');
  console.log('  Scenario 6 Result: PASS (Master Batch berjalan normal sebagai pure reference)\n');

  // ============================================================================
  // SCENARIO 7 — MANTRI TRANSACTION (Mantri resolve batch & saldo dari Inventory Service)
  // ============================================================================
  console.log('--- SCENARIO 7: MANTRI TRANSACTION (Mantri Query Batches & Saldo) ---');
  const mantriBatches = getNurseryBatches('EST-TBS', 'PB 260', 'Rubber Advance Planting Material', 'DIV-001', 'PRG-2026-001');
  assert(mantriBatches.length === 1, 'Mantri berhasil menemukan batch berdasarkan scope & filter');
  assert(mantriBatches[0].id === batchId, 'Batch id sesuai');
  assert(mantriBatches[0].availableQty === 55, 'Saldo batch pada query Mantri diperoleh dari Inventory Service (= 55)');
  console.log('  Scenario 7 Result: PASS (Mantri memperoleh saldo 55 dari Inventory Service)\n');

  // ============================================================================
  // SCENARIO 8 — CROSS ESTATE ISOLATION
  // ============================================================================
  console.log('--- SCENARIO 8: CROSS ESTATE ISOLATION (Batch TBS tidak dapat digunakan di scope APM) ---');
  const apmBatches = getNurseryBatches('EST-APM', null, null, null, null);
  assert(apmBatches.length === 0, 'Batch TBS tidak muncul pada query nursery scope APM');

  // Mencoba seleksi cross-estate (APM transaction against TBS batch)
  const crossEstateSelection = {
    id: 'SEL-CROSS-001',
    docNo: 'SEL-CROSS-001',
    batchId: batchId,
    batchCode: batchCode,
    estateId: 'EST-APM', // Inconsistent with batch estate EST-TBS
    divisionId: 'DIV-003',
    programId: 'PRG-2026-001',
    jumlahAfkir: 5,
    status: SELECTION_STATUS.DISETUJUI,
    stockMutationStatus: STOCK_MUTATION_STATUS.PENDING
  };
  storage.set('selection_transactions', [crossEstateSelection]);

  let crossEstateBlocked = false;
  try {
    mutateStockFromSelection('SEL-CROSS-001', { userId: 'USR-ASB-APM', estateId: 'EST-APM' });
  } catch (err) {
    crossEstateBlocked = true;
  }
  assert(crossEstateBlocked === true, 'Transaksi cross-estate berhasil diblokir dengan error integritas');
  assert(getAvailableQty(batchId) === 55, 'Saldo batch TBS tetap aman (= 55)');
  console.log('  Scenario 8 Result: PASS (Cross-estate isolation tetap bekerja kokoh)\n');

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('================================================================');
  console.log(`ALL INTEGRATION TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log('================================================================\n');
}

runTestSuite().catch(err => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
