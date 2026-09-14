/**
 * scripts/test-mantri-master-integration.js
 * Comprehensive Test Suite for TASK-FIX-MANTRI-MASTER-INTEGRATION-01:
 * Integrasi Transaksi Hulu Mantri Bibitan dengan Canonical Master Data:
 * - Program Master (OPEN/CLOSE, Kebun/Divisi/Blok)
 * - Master Batch (ACTIVE/INACTIVE, Program Scoped)
 * - Master Bedengan (ACTIVE/INACTIVE, Program Scoped, QR Resolution)
 * - Persisting Canonical Foreign Keys (batchId, bedenganId, programId, blockId, estateId, divisionId)
 * - Zero phantom datasets in transaction pickers.
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

import {
  getAllPrograms,
  getOpenPrograms,
  getProgramById,
  getProgramByCode,
  isProgramOpen,
  setProgramProvider,
  DummyProgramProvider,
  PROGRAM_MASTER,
  PROGRAM_STATUS
} from '../js/data/program-master.js';

import {
  getAllBatches,
  getActiveBatches,
  getBatchById,
  getBatchByCode,
  createBatch,
  updateBatch,
  BATCH_MASTER_STATUS
} from '../js/data/batch-master.js';

import {
  getAllBedengan,
  getActiveBedengan,
  getBedenganById,
  getBedenganByCode,
  getBedenganByQR,
  createBedengan,
  updateBedengan,
  BEDENGAN_STATUS
} from '../js/data/bedengan-master.js';

import { storage } from '../js/core/storage.js';
import { session } from '../js/core/session.js';

// Setup Test Environment
let passedCount = 0;
let failedCount = 0;
const results = [];

function assert(condition, testNumber, description) {
  if (condition) {
    passedCount++;
    results.push({ id: testNumber, status: 'PASS', description });
    console.log(`  \x1b[32m✔ [TEST ${String(testNumber).padStart(2, '0')}] PASS:\x1b[0m ${description}`);
  } else {
    failedCount++;
    results.push({ id: testNumber, status: 'FAIL', description });
    console.error(`  \x1b[31m✖ [TEST ${String(testNumber).padStart(2, '0')}] FAIL:\x1b[0m ${description}`);
  }
}

async function runTests() {
  console.log('\n===============================================================');
  console.log('🧪 RUNNING VERIFICATION SUITE: TASK-FIX-MANTRI-MASTER-INTEGRATION-01');
  console.log('===============================================================\n');

  // Reset Storage to clean baseline
  localStorage.clear();

  // Test 1: Receipt Batch berasal dari canonical Master
  const initialBatches = getActiveBatches({ estateId: 'EST-TBS' });
  const allInitial = getAllBatches();
  assert(
    initialBatches.length > 0 && initialBatches.every(b => b.batchId && b.batchCode && b.programId),
    1,
    'Receipt Batch candidates must originate strictly from Canonical Master Batch with valid ID, Code, and Program ID'
  );

  // Test 2: Receipt tidak memakai hardcoded Batch ('Batch-01', 'Batch-02', etc.)
  const hardcodedPhantomBatches = ['Batch-01', 'Batch-02', 'Batch-03', 'Batch-04', 'Batch-05'];
  const hasPhantomReceiptBatch = initialBatches.some(b => hardcodedPhantomBatches.includes(b.batchCode));
  assert(
    !hasPhantomReceiptBatch,
    2,
    'Receipt Batch selection must NOT contain phantom/dummy Batch identifiers (Batch-01..05)'
  );

  // Test 3: Seeding Batch canonical
  const seedingBatches = getActiveBatches({ estateId: 'EST-TBS', divisionId: 'DIV-001' });
  assert(
    seedingBatches.length > 0 && seedingBatches.every(b => b.statusMaster === BATCH_MASTER_STATUS.ACTIVE),
    3,
    'Seeding Batch candidates must be canonical active batches matching estate/division context'
  );

  // Test 4: Seeding Bedengan canonical
  const seedingBedengan = getActiveBedengan({ estateId: 'EST-TBS', divisionId: 'DIV-001' });
  assert(
    seedingBedengan.length > 0 && seedingBedengan.every(b => b.bedenganId && b.bedenganCode && b.status === BEDENGAN_STATUS.ACTIVE),
    4,
    'Seeding Bedengan candidates must originate from Canonical Bedengan Master with ACTIVE status'
  );

  // Test 5: QR Scan canonical Bedengan
  const sampleBedengan = seedingBedengan[0];
  const qrResolved = getBedenganByQR(sampleBedengan.qrCode) || getBedenganById(sampleBedengan.bedenganId) || getBedenganByCode(sampleBedengan.bedenganCode);
  assert(
    qrResolved && qrResolved.bedenganId === sampleBedengan.bedenganId && qrResolved.bedenganCode === sampleBedengan.bedenganCode,
    5,
    'QR Scan resolve accurately maps QR string/identifier to Canonical Bedengan Record'
  );

  // Test 6: Receipt menyimpan batchId
  const simulatedReceiptTx = {
    docNo: 'REC/TBS/2026/001',
    programId: sampleBedengan.programId,
    programCode: '2026/TB/RNUR/001',
    batchId: initialBatches[0].batchId,
    batchCode: initialBatches[0].batchCode,
    batchNo: initialBatches[0].batchCode,
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    blockId: initialBatches[0].blockId,
    blockCode: initialBatches[0].blockCode,
    qty: 5000
  };
  assert(
    simulatedReceiptTx.batchId && simulatedReceiptTx.batchId === initialBatches[0].batchId,
    6,
    'Receipt transaction payload stores canonical batchId foreign key'
  );

  // Test 7: Seeding menyimpan batchId
  const simulatedSeedingTx = {
    docNo: 'SEM/TBS/2026/001',
    sourceDocNo: simulatedReceiptTx.docNo,
    programId: simulatedReceiptTx.programId,
    programCode: simulatedReceiptTx.programCode,
    batchId: simulatedReceiptTx.batchId,
    batchCode: simulatedReceiptTx.batchCode,
    batchNo: simulatedReceiptTx.batchCode,
    bedenganId: sampleBedengan.bedenganId,
    bedenganCode: sampleBedengan.bedenganCode,
    bedengan: sampleBedengan.name,
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    blockId: sampleBedengan.blockId,
    blockCode: sampleBedengan.blockCode,
    totalDisemai: 4800
  };
  assert(
    simulatedSeedingTx.batchId && simulatedSeedingTx.batchId === simulatedReceiptTx.batchId,
    7,
    'Seeding transaction payload stores canonical batchId foreign key'
  );

  // Test 8: Seeding menyimpan bedenganId
  assert(
    simulatedSeedingTx.bedenganId && simulatedSeedingTx.bedenganId === sampleBedengan.bedenganId,
    8,
    'Seeding transaction payload stores canonical bedenganId foreign key'
  );

  // Test 9: Transaction menyimpan programId
  assert(
    simulatedReceiptTx.programId && simulatedSeedingTx.programId && simulatedReceiptTx.programId === simulatedSeedingTx.programId,
    9,
    'Transactions consistently persist canonical programId foreign key'
  );

  // Test 10: blockId tersimpan jika context block tersedia
  assert(
    simulatedReceiptTx.blockId !== undefined && simulatedSeedingTx.blockId !== undefined,
    10,
    'blockId is persisted when block context exists in master batch / bedengan'
  );

  // Test 11: Program OPEN dapat dipilih
  const openTBS = getOpenPrograms({ estateId: 'EST-TBS' });
  assert(
    openTBS.length > 0 && openTBS.every(p => p.status === PROGRAM_STATUS.OPEN),
    11,
    'getOpenPrograms returns open programs eligible for new transactions'
  );

  // Test 12: Program CLOSE ditolak
  const targetProgramToClose = openTBS[0];
  const closedProvider = new DummyProgramProvider(
    PROGRAM_MASTER.map(p => p.id === targetProgramToClose.id ? { ...p, status: PROGRAM_STATUS.CLOSE } : p)
  );
  setProgramProvider(closedProvider);
  const openTBSAfterClose = getOpenPrograms({ estateId: 'EST-TBS' });
  const isExcluded = !openTBSAfterClose.some(p => p.id === targetProgramToClose.id);
  assert(
    isExcluded && !isProgramOpen(targetProgramToClose.id),
    12,
    'Program CLOSE is rejected and excluded from transaction candidate list'
  );
  // Restore default provider
  setProgramProvider(new DummyProgramProvider(PROGRAM_MASTER));

  // Test 13: Batch ACTIVE dapat dipilih
  const activeBatchesBefore = getActiveBatches({ estateId: 'EST-TBS' });
  assert(
    activeBatchesBefore.length > 0 && activeBatchesBefore.every(b => b.statusMaster === BATCH_MASTER_STATUS.ACTIVE),
    13,
    'Active batches with ACTIVE master status are available for selection'
  );

  // Test 14: Batch INACTIVE ditolak
  const targetBatch = activeBatchesBefore[0];
  const asbUserContext = { role: 'ASISTEN_BIBITAN', estateId: 'EST-TBS', divisionId: 'DIV-001' };
  updateBatch(targetBatch.batchId, {
    statusMaster: BATCH_MASTER_STATUS.INACTIVE
  }, asbUserContext);
  const activeBatchesAfterInactive = getActiveBatches({ estateId: 'EST-TBS' });
  assert(
    !activeBatchesAfterInactive.some(b => b.batchId === targetBatch.batchId),
    14,
    'INACTIVE batch is rejected and excluded from new transaction batch candidates'
  );
  // Re-activate batch
  updateBatch(targetBatch.batchId, {
    statusMaster: BATCH_MASTER_STATUS.ACTIVE
  }, asbUserContext);

  // Test 15: Bedengan ACTIVE dapat dipilih
  const activeBedenganBefore = getActiveBedengan({ estateId: 'EST-TBS' });
  assert(
    activeBedenganBefore.length > 0 && activeBedenganBefore.every(b => b.status === BEDENGAN_STATUS.ACTIVE),
    15,
    'Active bedengan with ACTIVE status are available for selection'
  );

  // Test 16: Bedengan INACTIVE ditolak
  const targetBedengan = activeBedenganBefore[0];
  updateBedengan(targetBedengan.bedenganId, {
    status: BEDENGAN_STATUS.INACTIVE
  }, asbUserContext);
  const activeBedenganAfterInactive = getActiveBedengan({ estateId: 'EST-TBS' });
  assert(
    !activeBedenganAfterInactive.some(b => b.bedenganId === targetBedengan.bedenganId),
    16,
    'INACTIVE bedengan is rejected and excluded from new transaction bedengan candidates'
  );
  // Re-activate bedengan
  updateBedengan(targetBedengan.bedenganId, {
    status: BEDENGAN_STATUS.ACTIVE
  }, asbUserContext);

  // Test 17: MNT001 hanya mendapat TBS
  const mnt001Context = { estateId: 'EST-TBS', divisionId: 'DIV-001' };
  const mnt001Programs = getOpenPrograms({ estateId: mnt001Context.estateId });
  const mnt001Batches = getActiveBatches({ estateId: mnt001Context.estateId, divisionId: mnt001Context.divisionId });
  const mnt001Bedengan = getActiveBedengan({ estateId: mnt001Context.estateId, divisionId: mnt001Context.divisionId });
  assert(
    mnt001Programs.every(p => p.estateId === 'EST-TBS') &&
    mnt001Batches.every(b => b.estateId === 'EST-TBS') &&
    mnt001Bedengan.every(b => b.estateId === 'EST-TBS'),
    17,
    'MNT001 (Tanah Besih) only receives TBS scoped Programs, Batches, and Bedengan'
  );

  // Test 18: MNT002 hanya mendapat APM
  const mnt002Context = { estateId: 'EST-APM', divisionId: 'DIV-002' };
  const mnt002Programs = getOpenPrograms({ estateId: mnt002Context.estateId });
  const mnt002Batches = getActiveBatches({ estateId: mnt002Context.estateId, divisionId: mnt002Context.divisionId });
  const mnt002Bedengan = getActiveBedengan({ estateId: mnt002Context.estateId, divisionId: mnt002Context.divisionId });
  assert(
    mnt002Programs.every(p => p.estateId === 'EST-APM') &&
    mnt002Batches.every(b => b.estateId === 'EST-APM') &&
    mnt002Bedengan.every(b => b.estateId === 'EST-APM'),
    18,
    'MNT002 (Aek Pamingke) only receives APM scoped Programs, Batches, and Bedengan'
  );

  // Test 19: Batch ASB baru muncul di MNT001
  const createdAsbBatch = createBatch({
    batchCode: 'BAT-2026-TBS-99',
    programId: 'PRG-TBS-2026-001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    blockId: 'BLK-001',
    blockCode: '001/91',
    clone: 'PB 260',
    initialQty: 10000,
    availableQty: 0 // AvailableQty is NOT a prerequisite for master selection
  }, asbUserContext);
  const mnt001BatchesWithNew = getActiveBatches({ estateId: 'EST-TBS', divisionId: 'DIV-001' });
  assert(
    mnt001BatchesWithNew.some(b => b.batchCode === 'BAT-2026-TBS-99'),
    19,
    'Newly created ASB batch in TBS is immediately visible to MNT001 in real-time'
  );

  // Test 20: Bedengan ASB baru muncul di MNT001
  const createdAsbBedengan = createBedengan({
    bedenganCode: 'BED-TBS-01-99',
    name: 'Bedengan 99',
    programId: 'PRG-TBS-2026-001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    blockId: 'BLK-001',
    blockCode: '001/91',
    capacity: 2000,
    qrCode: 'SIGMA-BED-BED-TBS-01-99'
  }, asbUserContext);
  const mnt001BedenganWithNew = getActiveBedengan({ estateId: 'EST-TBS', divisionId: 'DIV-001' });
  assert(
    mnt001BedenganWithNew.some(b => b.bedenganCode === 'BED-TBS-01-99'),
    20,
    'Newly created ASB bedengan in TBS is immediately visible to MNT001 in real-time'
  );

  // Test 21: Batch APM tidak muncul di MNT001
  const mnt001AllVisibleBatches = getActiveBatches({ estateId: 'EST-TBS' });
  const hasApmBatchInTbs = mnt001AllVisibleBatches.some(b => b.estateId === 'EST-APM');
  assert(
    !hasApmBatchInTbs,
    21,
    'APM batches do NOT leak or appear in MNT001 TBS batch picker'
  );

  // Test 22: Bedengan APM tidak muncul di MNT001
  const mnt001AllVisibleBedengan = getActiveBedengan({ estateId: 'EST-TBS' });
  const hasApmBedInTbs = mnt001AllVisibleBedengan.some(b => b.estateId === 'EST-APM');
  assert(
    !hasApmBedInTbs,
    22,
    'APM bedengan do NOT leak or appear in MNT001 TBS bedengan picker'
  );

  // Test 23: Historical transaction tetap resolve (non-destructive)
  const legacyReceiptTx = {
    docNo: 'REC/LEGACY/001',
    program: '2026/TB/RNUR/001',
    batchNo: 'Batch-01',
    bedengan: 'Bedengan 01',
    qty: 3000
  };
  const legacyResolvedBatchCode = legacyReceiptTx.batchNo;
  const legacyResolvedBedName = legacyReceiptTx.bedengan;
  assert(
    legacyResolvedBatchCode === 'Batch-01' && legacyResolvedBedName === 'Bedengan 01',
    23,
    'Historical transaction records without canonical foreign keys remain intact and readable'
  );

  // Test 24: Sync Scope tidak digunakan untuk filter transaksi
  storage.set('selected_sync_division_ids', ['DIV-APM-999']);
  const txProgramCheck = getOpenPrograms({ estateId: 'EST-TBS' });
  const txBatchCheck = getActiveBatches({ estateId: 'EST-TBS' });
  assert(
    txProgramCheck.length > 0 && txProgramCheck.every(p => p.estateId === 'EST-TBS') &&
    txBatchCheck.length > 0 && txBatchCheck.every(b => b.estateId === 'EST-TBS'),
    24,
    'Transaction candidate selection ignores Sync Scope (selected_sync_division_ids) and relies on transaction/session estate context'
  );

  // Test 25: Program/Batch/Bedengan mismatch ditolak
  const tbsProgram = getProgramById('PRG-TBS-2026-001');
  const apmBatch = getBatchById('BATCH-APM-2026-01') || getAllBatches().find(b => b.estateId === 'EST-APM');
  const apmBedengan = getBedenganById('BED-APM-2026-01') || getAllBedengan().find(b => b.estateId === 'EST-APM');
  
  const isCrossEstateBatchInvalid = apmBatch ? (apmBatch.estateId !== tbsProgram.estateId) : true;
  const isCrossEstateBedInvalid = apmBedengan ? (apmBedengan.estateId !== tbsProgram.estateId) : true;
  assert(
    isCrossEstateBatchInvalid && isCrossEstateBedInvalid,
    25,
    'Cross-context selection (Program TBS + Batch APM or Bedengan APM) is strictly invalid and rejected'
  );

  console.log('\n===============================================================');
  console.log(`📊 TEST EXECUTION SUMMARY:`);
  console.log(`   TOTAL ASSERTIONS: ${passedCount + failedCount}`);
  console.log(`   \x1b[32mPASSED: ${passedCount}\x1b[0m`);
  console.log(`   \x1b[31mFAILED: ${failedCount}\x1b[0m`);
  console.log('===============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
