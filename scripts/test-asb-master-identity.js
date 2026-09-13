import { createBedengan, getBedenganById, getAllBedengan, resetBedenganMasterToDefault, updateBedengan, getNextBedenganCandidate, BEDENGAN_STATUS } from '../js/data/bedengan-master.js';
import { createBatch, getBatchById, getAllBatches, resetBatchMasterToDefault, updateBatch, getNextBatchCandidate, BATCH_STATUS } from '../js/data/batch-master.js';

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

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    failed++;
    console.error(`[FAIL] ${message}`);
    throw new Error(message);
  } else {
    passed++;
    console.log(`[PASS] ${message}`);
  }
}

function test(name, fn) {
  console.log(`\nRunning Test: ${name}`);
  try {
    fn();
  } catch (err) {
    console.error(`Test ${name} failed:`, err);
  }
}

// Helper contexts
const asbTbsContext = { id: 'USR-ASB-TBS', name: 'Asisten TBS', role: 'ASISTEN_BIBITAN', estateId: 'EST-TBS', divisionId: 'DIV-001' };
const asbApmContext = { id: 'USR-ASB-APM', name: 'Asisten APM', role: 'ASISTEN_BIBITAN', estateId: 'EST-APM', divisionId: 'DIV-APM-02' };

test('Bedengan - Program-First Scoped Sequence Generation', () => {
  resetBedenganMasterToDefault();

  // 1. Program A on APM (PRG-2026-003, EST-APM, DIV-APM-02)
  // Default data has 2 bedengans (BED-APM-001, BED-APM-002) in PRG-2026-003
  const candApmProg3 = getNextBedenganCandidate('PRG-2026-003', 'EST-APM', 'DIV-APM-02');
  assert(candApmProg3 !== null, 'Candidate for APM Program 3 generated');
  assert(candApmProg3.bedenganCode === 'BED-APM-D2-003', `APM Program 3 code must be BED-APM-D2-003, got ${candApmProg3.bedenganCode}`);
  assert(candApmProg3.name === 'Bedengan 003', `APM Program 3 name must be Bedengan 003, got ${candApmProg3.name}`);
  assert(candApmProg3.qrCode === 'SIGMA-BED-APM-D2-003', `APM Program 3 QR must be SIGMA-BED-APM-D2-003, got ${candApmProg3.qrCode}`);

  // 2. Program B on APM (PRG-2026-001 on EST-APM, DIV-APM-02) -> Brand new scope sequence
  const candApmProg1 = getNextBedenganCandidate('PRG-2026-001', 'EST-APM', 'DIV-APM-02');
  assert(candApmProg1 !== null, 'Candidate for APM Program 1 generated');
  assert(candApmProg1.bedenganCode === 'BED-APM-D2-001', `New program on APM starts sequence at 001: BED-APM-D2-001, got ${candApmProg1.bedenganCode}`);
  assert(candApmProg1.name === 'Bedengan 001', `Name must be Bedengan 001, got ${candApmProg1.name}`);

  // 3. Create Bedengan and verify sequence increments
  const payload1 = {
    programId: 'PRG-2026-001',
    estateId: 'EST-APM',
    divisionId: 'DIV-APM-02',
    bedenganCode: candApmProg1.bedenganCode,
    name: candApmProg1.name,
    capacity: 1000,
    qrCode: candApmProg1.qrCode,
    status: BEDENGAN_STATUS.AVAILABLE
  };
  const created1 = createBedengan(payload1, asbApmContext);
  assert(created1.bedenganCode === 'BED-APM-D2-001', 'Created bedengan code verified');

  // Next candidate should now be 002
  const candApmProg1Next = getNextBedenganCandidate('PRG-2026-001', 'EST-APM', 'DIV-APM-02');
  assert(candApmProg1Next.bedenganCode === 'BED-APM-D2-002', `Next sequence must be BED-APM-D2-002, got ${candApmProg1Next.bedenganCode}`);

  // 4. Inactive records count towards sequence uniqueness
  updateBedengan(created1.bedenganId, { status: BEDENGAN_STATUS.INACTIVE }, asbApmContext);
  const candAfterInactive = getNextBedenganCandidate('PRG-2026-001', 'EST-APM', 'DIV-APM-02');
  assert(candAfterInactive.bedenganCode === 'BED-APM-D2-002', 'Inactive record prevents sequence reuse');
});

test('Batch - Program-First Scoped Sequence Generation', () => {
  resetBatchMasterToDefault();
  resetBedenganMasterToDefault();

  // 1. Program PRG-2026-003 on EST-APM, DIV-APM-02
  // Default data has B-001 to B-007 on PRG-2026-003
  const candApmProg3 = getNextBatchCandidate('PRG-2026-003', 'EST-APM', 'DIV-APM-02');
  assert(candApmProg3 !== null, 'Candidate for APM Program 3 batch generated');
  assert(candApmProg3.batchCode === 'B-APM-02-008', `APM Program 3 batch code must be B-APM-02-008, got ${candApmProg3.batchCode}`);
  assert(candApmProg3.name === 'Batch 008', `Batch name must be Batch 008, got ${candApmProg3.name}`);
  assert(candApmProg3.qrCode === 'SIGMA-BATCH-APM-02-008', `Batch QR must be SIGMA-BATCH-APM-02-008, got ${candApmProg3.qrCode}`);

  // 2. Program PRG-2026-001 on EST-APM, DIV-APM-02 -> Brand new scope sequence
  const candApmProg1 = getNextBatchCandidate('PRG-2026-001', 'EST-APM', 'DIV-APM-02');
  assert(candApmProg1 !== null, 'Candidate for APM Program 1 batch generated');
  assert(candApmProg1.batchCode === 'B-APM-02-001', `New program on APM starts batch at 001: B-APM-02-001, got ${candApmProg1.batchCode}`);
  assert(candApmProg1.name === 'Batch 001', `Batch name must be Batch 001, got ${candApmProg1.name}`);

  // 3. Create batch and verify sequence increments
  const payload = {
    batchId: candApmProg1.batchId,
    batchCode: candApmProg1.batchCode,
    name: candApmProg1.name,
    qrCode: candApmProg1.qrCode,
    programId: 'PRG-2026-001',
    estateId: 'EST-APM',
    divisionId: 'DIV-APM-02',
    clone: 'IRCA 19',
    growthStage: 'Rubber Advance Planting Material',
    category: 'Polibag Besar',
    initialQty: 1000,
    availableQty: 1000,
    bedenganIds: [],
    status: BATCH_STATUS.AVAILABLE
  };
  const created = createBatch(payload, asbApmContext);
  assert(created.batchCode === 'B-APM-02-001', 'Created batch code verified');

  const candApmProg1Next = getNextBatchCandidate('PRG-2026-001', 'EST-APM', 'DIV-APM-02');
  assert(candApmProg1Next.batchCode === 'B-APM-02-002', `Next batch sequence must be B-APM-02-002, got ${candApmProg1Next.batchCode}`);

  // 4. Inactive records count towards sequence uniqueness
  updateBatch(created.id, { status: BATCH_STATUS.INACTIVE }, asbApmContext);
  const candAfterInactive = getNextBatchCandidate('PRG-2026-001', 'EST-APM', 'DIV-APM-02');
  assert(candAfterInactive.batchCode === 'B-APM-02-002', 'Inactive batch record prevents sequence reuse');
});

test('Master Identity - Scope & Role Checks', () => {
  try {
    createBedengan({
      programId: 'PRG-2026-001',
      estateId: 'EST-TBS',
      divisionId: 'DIV-001',
      bedenganCode: 'BED-NEW-99',
      name: 'Name',
      capacity: 1000,
      qrCode: 'QR-NEW'
    }, asbApmContext);
    assert(false, 'Should throw scope error for cross-estate');
  } catch (err) {
    assert(err.message.includes('Akses ditolak'), 'Throws scope error correctly');
  }

  try {
    createBatch({
      batchCode: 'B-NEW-99',
      programId: 'PRG-2026-001',
      estateId: 'EST-TBS',
      divisionId: 'DIV-001',
      clone: 'IRCA 19',
      initialQty: 100
    }, asbApmContext);
    assert(false, 'Should throw scope error for cross-estate batch');
  } catch(err) {
    assert(err.message.includes('Akses ditolak'), 'Throws scope error for batch');
  }
});

console.log(`\n============================`);
console.log(`Total Passed: ${passed} | Failed: ${failed}`);
console.log(`============================\n`);
if (failed > 0) process.exit(1);

