/**
 * scripts/test-master-context-relation.js
 * Integration Test Suite for:
 * TASK-REFACTOR-MASTER-CONTEXT-RELATION-01
 * Pemisahan Context Program / Kebun / Divisi / Blok dari Master Bedengan & Master Batch
 * 
 * Skenario:
 * SCENARIO 1: ASB membuat Bedengan -> Master identity tersimpan -> Context tersimpan -> context dapat di-resolve berdasarkan bedenganId.
 * SCENARIO 2: ASB membuat Batch -> Master identity tersimpan -> Context tersimpan -> context dapat di-resolve berdasarkan batchId.
 * SCENARIO 3: Mantri TBS membuka transaction picker -> resolver mengambil context -> hanya data TBS muncul.
 * SCENARIO 4: Mantri APM membuka transaction picker -> hanya data APM muncul.
 * SCENARIO 5: Transaction menyimpan batchId & bedenganId -> context dapat di-resolve kembali.
 * SCENARIO 6: Program context tetap konsisten & immutable -> Batch/Bedengan tidak dapat dipindahkan ke Program lain.
 * SCENARIO 7: Reload / login ulang -> Master identity tetap ada & Context relation tetap ada.
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
  getBedenganContext,
  getBatchContext,
  setBedenganContext,
  setBatchContext,
  getBedengansByContext,
  getBatchesByContext,
  validateCrossEstateContext,
  resetContextRelationsToDefault,
  STORAGE_KEY_BEDENGAN_CONTEXT,
  STORAGE_KEY_BATCH_CONTEXT
} from '../js/core/master-context-service.js';

import {
  createBedengan,
  updateBedengan,
  getAllBedengan,
  getActiveBedengan,
  getBedenganById,
  resetBedenganMasterToDefault
} from '../js/data/bedengan-master.js';

import {
  createBatch,
  updateBatch,
  getAllBatches,
  getActiveBatches,
  getBatchById,
  resetBatchMasterToDefault
} from '../js/data/batch-master.js';

import {
  getNurseryBatches
} from '../js/modules/dispatch/dispatch-landing.js';

import {
  getBatchInventory,
  getAvailableQty,
  addBatchStockFromReceipt,
  resetInventoryToDefault
} from '../js/core/batch-inventory-service.js';

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
  console.log('INTEGRATION TEST SUITE: TASK-REFACTOR-MASTER-CONTEXT-RELATION-01');
  console.log('PEMISAHAN CONTEXT PROGRAM/KEBUN/DIVISI/BLOK DARI MASTER DATA');
  console.log('================================================================\n');

  // Baseline Reset
  storage.set('bedengan_master', []);
  storage.set('nursery_batches', []);
  resetContextRelationsToDefault();
  resetInventoryToDefault();
  resetBedenganMasterToDefault();
  resetBatchMasterToDefault();

  const userAsbTBS = {
    userId: 'USR-ASB-TBS',
    name: 'Asisten Bibitan TBS',
    role: 'ASISTEN_BIBITAN',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001'
  };

  const userAsbAPM = {
    userId: 'USR-ASB-APM',
    name: 'Asisten Bibitan APM',
    role: 'ASISTEN_BIBITAN',
    estateId: 'EST-APM',
    divisionId: 'DIV-APM-02'
  };

  const userMantriTBS = {
    userId: 'USR-MTR-TBS',
    name: 'Mantri Bibitan TBS',
    role: 'MANTRI_BIBITAN',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001'
  };

  const userMantriAPM = {
    userId: 'USR-MTR-APM',
    name: 'Mantri Bibitan APM',
    role: 'MANTRI_BIBITAN',
    estateId: 'EST-APM',
    divisionId: 'DIV-APM-02'
  };

  // ============================================================================
  // SCENARIO 1: ASB MEMBUAT BEDENGAN
  // ============================================================================
  console.log('--- SCENARIO 1: ASB MEMBUAT BEDENGAN & CONTEXT SEPARATION ---');
  const bedTBS = createBedengan({
    bedenganCode: 'BED-001',
    name: 'Bedengan-001',
    qrCode: 'SIGMA-BED-001',
    capacity: 1000,
    programId: 'PRG-TBS-2026-001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    blockId: 'BLK-001',
    blockCode: '001/91'
  }, userAsbTBS);

  assert(bedTBS && bedTBS.bedenganId, 'Master Bedengan berhasil dibuat');
  assert(bedTBS.bedenganCode === 'BED-001', 'Kode Master Bedengan tersimpan');

  // Verify Context Relation Layer
  const bedCtx = getBedenganContext(bedTBS.bedenganId);
  assert(bedCtx !== null, 'Context relation Bedengan berhasil di-resolve dari Context Service');
  assert(bedCtx.estateId === 'EST-TBS', 'Context estateId = EST-TBS terdaftar di Relation Service');
  assert(bedCtx.divisionId === 'DIV-001', 'Context divisionId = DIV-001 terdaftar di Relation Service');
  assert(bedCtx.programId === 'PRG-TBS-2026-001', 'Context programId = PRG-TBS-2026-001 terdaftar di Relation Service');
  assert(bedCtx.blockId === 'BLK-001', 'Context blockId = BLK-001 terdaftar di Relation Service');
  console.log('  Scenario 1 Result: PASS\n');

  // ============================================================================
  // SCENARIO 2: ASB MEMBUAT BATCH
  // ============================================================================
  console.log('--- SCENARIO 2: ASB MEMBUAT BATCH & CONTEXT SEPARATION ---');
  const batchTBS = createBatch({
    batchCode: 'BTCH-001',
    name: 'Batch-001',
    qrCode: 'SIGMA-BTCH-001',
    clone: 'PB 260',
    klon: 'PB 260',
    category: 'Polibag Besar',
    growthStage: 'Rubber Advance Planting Material',
    bedenganIds: [bedTBS.bedenganId],
    programId: 'PRG-TBS-2026-001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    blockId: 'BLK-001',
    blockCode: '001/91'
  }, userAsbTBS);

  assert(batchTBS && batchTBS.id, 'Master Batch berhasil dibuat');
  assert(batchTBS.batchCode === 'BTCH-001', 'Kode Master Batch tersimpan');

  // Verify Context Relation Layer
  const bCtx = getBatchContext(batchTBS.id);
  assert(bCtx !== null, 'Context relation Batch berhasil di-resolve dari Context Service');
  assert(bCtx.estateId === 'EST-TBS', 'Context estateId = EST-TBS terdaftar di Relation Service');
  assert(bCtx.divisionId === 'DIV-001', 'Context divisionId = DIV-001 terdaftar di Relation Service');
  assert(bCtx.programId === 'PRG-TBS-2026-001', 'Context programId = PRG-TBS-2026-001 terdaftar di Relation Service');
  assert(bCtx.blockId === 'BLK-001', 'Context blockId = BLK-001 terdaftar di Relation Service');

  // Berikan stok via Inventory Service
  addBatchStockFromReceipt(batchTBS.id, 100, 'RCP-2026-001', userAsbTBS);
  assert(getAvailableQty(batchTBS.id) === 100, 'Stok batch 100 dikelola oleh Inventory Service');
  console.log('  Scenario 2 Result: PASS\n');

  // Also create APM Bedengan and Batch
  const bedAPM = createBedengan({
    bedenganCode: 'BED-002',
    name: 'Bedengan-002',
    qrCode: 'SIGMA-BED-002',
    capacity: 1200,
    programId: 'PRG-APM-2026-001',
    estateId: 'EST-APM',
    divisionId: 'DIV-APM-02',
    blockCode: '007/03'
  }, userAsbAPM);

  const batchAPM = createBatch({
    batchCode: 'BTCH-002',
    name: 'Batch-002',
    qrCode: 'SIGMA-BTCH-002',
    clone: 'IRCA 19',
    klon: 'IRCA 19',
    category: 'Polibag Besar',
    growthStage: 'Rubber Advance Planting Material',
    bedenganIds: [bedAPM.bedenganId],
    programId: 'PRG-APM-2026-001',
    estateId: 'EST-APM',
    divisionId: 'DIV-APM-02',
    blockCode: '007/03'
  }, userAsbAPM);
  addBatchStockFromReceipt(batchAPM.id, 80, 'RCP-APM-2026-001', userAsbAPM);

  // ============================================================================
  // SCENARIO 3: MANTRI TBS MEMBUKA TRANSACTION PICKER
  // ============================================================================
  console.log('--- SCENARIO 3: MANTRI TBS TRANSACTION PICKER & SCOPE RESOLUTION ---');
  // Mantri TBS queries available batches via relation context
  const tbsNurseryBatches = getNurseryBatches('EST-TBS', null, null, 'DIV-001', 'PRG-TBS-2026-001');
  assert(tbsNurseryBatches.length === 1, 'Mantri TBS hanya menemukan 1 batch');
  assert(tbsNurseryBatches[0].id === batchTBS.id, 'Batch yang muncul adalah batch milik EST-TBS');

  // Mantri TBS queries bedengan list via context relation
  const tbsBedengans = getAllBedengan({ estateId: 'EST-TBS', divisionId: 'DIV-001' });
  assert(tbsBedengans.length === 1 && tbsBedengans[0].bedenganId === bedTBS.bedenganId, 'Hanya Bedengan TBS yang muncul untuk picker TBS');
  console.log('  Scenario 3 Result: PASS\n');

  // ============================================================================
  // SCENARIO 4: MANTRI APM MEMBUKA TRANSACTION PICKER
  // ============================================================================
  console.log('--- SCENARIO 4: MANTRI APM TRANSACTION PICKER & SCOPE RESOLUTION ---');
  // Mantri APM queries available batches via relation context
  const apmNurseryBatches = getNurseryBatches('EST-APM', null, null, 'DIV-APM-02', 'PRG-APM-2026-001');
  assert(apmNurseryBatches.length === 1, 'Mantri APM hanya menemukan 1 batch');
  assert(apmNurseryBatches[0].id === batchAPM.id, 'Batch yang muncul adalah batch milik EST-APM');

  // Mantri APM queries bedengan list via context relation
  const apmBedengans = getAllBedengan({ estateId: 'EST-APM', divisionId: 'DIV-APM-02' });
  assert(apmBedengans.length === 1 && apmBedengans[0].bedenganId === bedAPM.bedenganId, 'Hanya Bedengan APM yang muncul untuk picker APM');
  console.log('  Scenario 4 Result: PASS\n');

  // ============================================================================
  // SCENARIO 5: TRANSACTION RESOLUTION BERDASARKAN BATCHID & BEDENGANID
  // ============================================================================
  console.log('--- SCENARIO 5: TRANSACTION RESOLVES CONTEXT FROM IDS ---');
  const dummyTransaction = {
    txId: 'TX-SELECTION-001',
    batchId: batchTBS.id,
    bedenganId: bedTBS.bedenganId
  };

  // Resolve Batch Context from Relation Service
  const resolvedBatchContext = getBatchContext(dummyTransaction.batchId);
  assert(resolvedBatchContext !== null, 'Transaction berhasil me-resolve Batch Context');
  assert(resolvedBatchContext.programId === 'PRG-TBS-2026-001', 'Resolved Program ID sesuai');
  assert(resolvedBatchContext.estateId === 'EST-TBS', 'Resolved Estate ID sesuai');
  assert(resolvedBatchContext.divisionId === 'DIV-001', 'Resolved Division ID sesuai');
  assert(resolvedBatchContext.blockId === 'BLK-001', 'Resolved Block ID sesuai');

  // Resolve Bedengan Context from Relation Service
  const resolvedBedenganContext = getBedenganContext(dummyTransaction.bedenganId);
  assert(resolvedBedenganContext !== null, 'Transaction berhasil me-resolve Bedengan Context');
  assert(resolvedBedenganContext.programId === 'PRG-TBS-2026-001', 'Resolved Bedengan Program ID sesuai');
  assert(resolvedBedenganContext.estateId === 'EST-TBS', 'Resolved Bedengan Estate ID sesuai');
  assert(resolvedBedenganContext.divisionId === 'DIV-001', 'Resolved Bedengan Division ID sesuai');
  console.log('  Scenario 5 Result: PASS\n');

  // ============================================================================
  // SCENARIO 6: PROGRAM CONTEXT IMMUTABILITY
  // ============================================================================
  console.log('--- SCENARIO 6: PROGRAM CONTEXT IMMUTABILITY ENFORCEMENT ---');
  let moveProgramBlocked = false;
  try {
    // Mencoba memindahkan batch TBS ke program APM
    setBatchContext(batchTBS.id, {
      programId: 'PRG-APM-2026-002',
      estateId: 'EST-TBS',
      divisionId: 'DIV-001'
    });
  } catch (err) {
    moveProgramBlocked = true;
  }
  assert(moveProgramBlocked === true, 'Perpindahan program batch berhasil diblokir oleh Context Service');

  let moveEstateBlocked = false;
  try {
    // Mencoba memindahkan bedengan TBS ke estate APM
    setBedenganContext(bedTBS.bedenganId, {
      programId: 'PRG-TBS-2026-001',
      estateId: 'EST-APM',
      divisionId: 'DIV-003'
    });
  } catch (err) {
    moveEstateBlocked = true;
  }
  assert(moveEstateBlocked === true, 'Perpindahan estate bedengan berhasil diblokir oleh Context Service');
  console.log('  Scenario 6 Result: PASS\n');

  // ============================================================================
  // SCENARIO 7: RELOAD & PERSISTENCE OF MASTER IDENTITY AND CONTEXT
  // ============================================================================
  console.log('--- SCENARIO 7: RELOAD / LOGIN ULANG PERSISTENCE ---');
  // Re-read storage simulating app reload
  const reloadedBedengans = getAllBedengan();
  const reloadedBatches = getAllBatches();

  assert(reloadedBedengans.length === 2, '2 record Master Bedengan tetap persisten setelah reload');
  assert(reloadedBatches.length === 2, '2 record Master Batch tetap persisten setelah reload');

  const reloadedCtxBed = getBedenganContext(bedTBS.bedenganId);
  const reloadedCtxBatch = getBatchContext(batchTBS.id);

  assert(reloadedCtxBed && reloadedCtxBed.estateId === 'EST-TBS', 'Context relation Bedengan persisten setelah reload');
  assert(reloadedCtxBatch && reloadedCtxBatch.estateId === 'EST-TBS', 'Context relation Batch persisten setelah reload');
  console.log('  Scenario 7 Result: PASS\n');

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
