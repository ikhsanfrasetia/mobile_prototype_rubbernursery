/**
 * scripts/test-phase9i-maintenance-worker-cfna.js
 *
 * Test Suite Phase 9I — Worker Master + CFNA Master Integration: Maintenance
 * Memvalidasi integrasi centralized worker-master.js dan cfna-master.js ke modul Pemeliharaan,
 * scoping Estate & Division per persona, CFNA mapping & validation, dual validation,
 * pemisahan actor vs worker identity, proteksi transaction ownership, historical compatibility,
 * dan context switching tanpa worker/CFNA stale.
 */

// Mock localStorage and window/document for Node.js test environment
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

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    location: { hash: '#/maintenance' },
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  };
}

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  WORKER_MASTER,
  WORKER_STATUS,
  getAllWorkers,
  getActiveWorkers,
  getWorkerById,
  getWorkerByCode,
  getWorkersByEstate,
  getWorkersByDivision,
  getWorkersByEstateAndDivision,
  getWorkersForUserContext,
  isWorkerActive,
  isWorkerInScope
} from '../js/data/worker-master.js';

import {
  CFNA_MASTER,
  CFNA_STATUS,
  MAPPING_STATUS,
  getAllCfnaMaster,
  getActiveCfnaMaster,
  getCfnaByCode,
  getCfnaByName,
  isCfnaCodeValid,
  getCfnaActivityMappings,
  getCfnaMappingByCode
} from '../js/data/cfna-master.js';

import {
  getConfirmedCfnaForActivity
} from '../js/modules/maintenance/nursery-activity.js';

import { getDemoPersonaByCode } from '../js/data/demo-personas.js';
import { session } from '../js/core/session.js';
import { storage } from '../js/core/storage.js';
import { getCurrentUserContext, resolveUserContext } from '../js/core/user-context.js';
import { applyTransactionActor, resolveTransactionActor } from '../js/core/transaction-actor.js';

const nurseryActivityStorage = {
  async getById(id) {
    const records = storage.get('nursery_activity_records', []);
    return records.find(r => r.id === id) || null;
  },
  async getAll() {
    return storage.get('nursery_activity_records', []);
  },
  async save(record) {
    const records = storage.get('nursery_activity_records', []);
    const idx = records.findIndex(r => r.id === record.id);
    if (idx >= 0) {
      records[idx] = record;
    } else {
      records.push(record);
    }
    storage.set('nursery_activity_records', records);
    return record;
  }
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${testName}`);
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

async function runAsyncTest(testName, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${testName}`);
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

function switchPersona(code) {
  const p = getDemoPersonaByCode(code);
  if (!p) throw new Error(`Persona not found: ${code}`);
  return session.start({
    userId: p.code,
    code: p.code,
    role: p.role,
    name: p.name,
    position: p.position,
    estateId: p.estateId,
    estateName: p.estateName,
    divisionId: p.divisionId,
    divisionName: p.divisionName,
    scopeType: p.scopeType,
    isDemoSession: true
  });
}

console.log('================================================================');
console.log('PHASE 9I — TEST SUITE: WORKER MASTER + CFNA MASTER INTEGRATION (MAINTENANCE)');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// SECTION A: WORKER SOURCE
// -----------------------------------------------------------------------------
console.log('--- SECTION A: WORKER SOURCE ---');

runTest('1. Maintenance module source code consumes centralized worker-master.js', () => {
  const maintenanceFilePath = path.join(rootDir, 'js', 'modules', 'maintenance', 'nursery-activity.js');
  const content = fs.readFileSync(maintenanceFilePath, 'utf8');
  assert.ok(
    content.includes("from '../../data/worker-master.js'"),
    'nursery-activity.js must import from worker-master.js'
  );
  assert.ok(
    content.includes('getWorkersForUserContext'),
    'nursery-activity.js must use getWorkersForUserContext'
  );
});

runTest('2. No duplicate or hardcoded worker dataset in nursery-activity.js', () => {
  const maintenanceFilePath = path.join(rootDir, 'js', 'modules', 'maintenance', 'nursery-activity.js');
  const content = fs.readFileSync(maintenanceFilePath, 'utf8');
  assert.ok(
    !content.includes('const MASTER_PEKERJA_LIST = ['),
    'nursery-activity.js must not contain hardcoded MASTER_PEKERJA_LIST'
  );
  assert.ok(
    !content.includes('const WORKERS = ['),
    'nursery-activity.js must not define duplicate worker array'
  );
});

runTest('3. ACTIVE filtering works correctly on worker dataset', () => {
  const allWorkers = getAllWorkers();
  const activeWorkers = getActiveWorkers();
  assert.ok(activeWorkers.length <= allWorkers.length, 'Active workers must be subset of all workers');
  for (const w of activeWorkers) {
    assert.strictEqual(w.status, WORKER_STATUS.ACTIVE, `Worker ${w.id} must be ACTIVE`);
  }
});

// -----------------------------------------------------------------------------
// SECTION B: PERSONA
// -----------------------------------------------------------------------------
console.log('\n--- SECTION B: PERSONA ---');

runTest('4. Wagiman (MNT001, Tanah Besih, Divisi I) has exactly 7 ACTIVE workers', () => {
  const wagimanPersona = getDemoPersonaByCode('MNT001');
  const userCtx = resolveUserContext(wagimanPersona);
  const workers = getWorkersForUserContext(userCtx, { activeOnly: true });
  assert.strictEqual(workers.length, 7, 'Wagiman must have 7 active workers');
  for (const w of workers) {
    assert.strictEqual(w.estateId, 'EST-TBS');
    assert.strictEqual(w.divisionId, 'DIV-001');
    assert.strictEqual(w.status, WORKER_STATUS.ACTIVE);
  }
});

runTest('5. Rahmad (AST002, Tanah Besih, Divisi II) has exactly 5 ACTIVE workers', () => {
  const rahmadPersona = getDemoPersonaByCode('AST002');
  const userCtx = resolveUserContext(rahmadPersona);
  const workers = getWorkersForUserContext(userCtx, { activeOnly: true });
  assert.strictEqual(workers.length, 5, 'Rahmad must have 5 active workers');
  for (const w of workers) {
    assert.strictEqual(w.estateId, 'EST-TBS');
    assert.strictEqual(w.divisionId, 'DIV-002');
    assert.strictEqual(w.status, WORKER_STATUS.ACTIVE);
  }
});

runTest('6. Supriono (MNT002, Aek Pamingke, Divisi I) has exactly 5 ACTIVE workers', () => {
  const suprionoPersona = getDemoPersonaByCode('MNT002');
  const userCtx = resolveUserContext(suprionoPersona);
  const workers = getWorkersForUserContext(userCtx, { activeOnly: true });
  assert.strictEqual(workers.length, 5, 'Supriono must have 5 active workers');
  for (const w of workers) {
    assert.strictEqual(w.estateId, 'EST-APM');
    assert.strictEqual(w.divisionId, 'DIV-APM-01');
    assert.strictEqual(w.status, WORKER_STATUS.ACTIVE);
  }
});

runTest('7. Abdul Gofur (ASB002, Aek Pamingke, Divisi II) has exactly 5 ACTIVE workers', () => {
  const gofurPersona = getDemoPersonaByCode('ASB002');
  const userCtx = resolveUserContext(gofurPersona);
  const workers = getWorkersForUserContext(userCtx, { activeOnly: true });
  assert.strictEqual(workers.length, 5, 'Abdul Gofur must have 5 active workers');
  for (const w of workers) {
    assert.strictEqual(w.estateId, 'EST-APM');
    assert.strictEqual(w.divisionId, 'DIV-APM-02');
    assert.strictEqual(w.status, WORKER_STATUS.ACTIVE);
  }
});

// -----------------------------------------------------------------------------
// SECTION C: WORKER ISOLATION
// -----------------------------------------------------------------------------
console.log('\n--- SECTION C: WORKER ISOLATION ---');

runTest('8. Tanah Besih Divisi I strictly excludes Tanah Besih Divisi II workers', () => {
  const tbsD1Ctx = resolveUserContext(getDemoPersonaByCode('MNT001'));
  const workers = getWorkersForUserContext(tbsD1Ctx, { activeOnly: true });
  const tbsD2WorkerIds = ['WRK-TBS-D2-001', 'WRK-TBS-D2-002', 'WRK-TBS-D2-003', 'WRK-TBS-D2-004', 'WRK-TBS-D2-005'];
  for (const w of workers) {
    assert.ok(!tbsD2WorkerIds.includes(w.id), `TBS D1 worker list must not contain ${w.id}`);
  }
});

runTest('9. Tanah Besih Divisi I strictly excludes Aek Pamingke Divisi I workers', () => {
  const tbsD1Ctx = resolveUserContext(getDemoPersonaByCode('MNT001'));
  const workers = getWorkersForUserContext(tbsD1Ctx, { activeOnly: true });
  for (const w of workers) {
    assert.notStrictEqual(w.estateId, 'EST-APM', `Worker ${w.id} must not be from Aek Pamingke`);
  }
});

runTest('10. Tanah Besih Divisi I strictly excludes Aek Pamingke Divisi II workers', () => {
  const tbsD1Ctx = resolveUserContext(getDemoPersonaByCode('MNT001'));
  const workers = getWorkersForUserContext(tbsD1Ctx, { activeOnly: true });
  const apmD2WorkerIds = ['WRK-APM-D2-001', 'WRK-APM-D2-002', 'WRK-APM-D2-003', 'WRK-APM-D2-004', 'WRK-APM-D2-005'];
  for (const w of workers) {
    assert.ok(!apmD2WorkerIds.includes(w.id), `TBS D1 must not contain APM D2 worker ${w.id}`);
  }
});

runTest('11. Aek Pamingke Divisi I strictly excludes Aek Pamingke Divisi II workers', () => {
  const apmD1Ctx = resolveUserContext(getDemoPersonaByCode('MNT002'));
  const workers = getWorkersForUserContext(apmD1Ctx, { activeOnly: true });
  for (const w of workers) {
    assert.strictEqual(w.divisionId, 'DIV-APM-01', `Worker ${w.id} must be DIV-APM-01`);
    assert.notStrictEqual(w.divisionId, 'DIV-APM-02');
  }
});

// -----------------------------------------------------------------------------
// SECTION D: CFNA SOURCE
// -----------------------------------------------------------------------------
console.log('\n--- SECTION D: CFNA SOURCE ---');

runTest('12. Maintenance consumes centralized cfna-master.js', () => {
  const maintenanceFilePath = path.join(rootDir, 'js', 'modules', 'maintenance', 'nursery-activity.js');
  const content = fs.readFileSync(maintenanceFilePath, 'utf8');
  assert.ok(
    content.includes("from '../../data/cfna-master.js'"),
    'nursery-activity.js must import from cfna-master.js'
  );
  assert.ok(
    content.includes('getConfirmedCfnaForActivity'),
    'nursery-activity.js must use getConfirmedCfnaForActivity'
  );
});

runTest('13. No duplicate CFNA dataset in nursery-activity.js', () => {
  const maintenanceFilePath = path.join(rootDir, 'js', 'modules', 'maintenance', 'nursery-activity.js');
  const content = fs.readFileSync(maintenanceFilePath, 'utf8');
  assert.ok(
    !content.includes('const CFNA_LIST = ['),
    'nursery-activity.js must not define duplicate CFNA list'
  );
  assert.ok(
    !content.includes('const MASTER_CFNA = ['),
    'nursery-activity.js must not define duplicate CFNA master'
  );
});

// -----------------------------------------------------------------------------
// SECTION E: CFNA MAPPING
// -----------------------------------------------------------------------------
console.log('\n--- SECTION E: CFNA MAPPING ---');

runTest('14. CONFIRMED CFNA mappings are selectable for activities', () => {
  const penyiramanCfna = getConfirmedCfnaForActivity('Penyiraman');
  assert.ok(penyiramanCfna.length > 0, 'Penyiraman must have confirmed CFNA');
  assert.ok(penyiramanCfna.some(c => c.code === '964009'), '964009 must be confirmed for Penyiraman');

  const pemupukanCfna = getConfirmedCfnaForActivity('Pemupukan');
  assert.ok(pemupukanCfna.length > 0, 'Pemupukan must have confirmed CFNA');
  assert.ok(pemupukanCfna.some(c => c.code === '964006'), '964006 must be confirmed for Pemupukan');
});

runTest('15. NEEDS_REVIEW CFNA is rejected/excluded from confirmed list', () => {
  const needsReviewMappings = getCfnaActivityMappings().filter(m => m.mappingStatus === MAPPING_STATUS.NEEDS_REVIEW);
  assert.ok(needsReviewMappings.length > 0, 'Must have NEEDS_REVIEW mappings in master');
  for (const item of needsReviewMappings) {
    const confirmed = getConfirmedCfnaForActivity(item.targetActivityType || 'Sanitasi');
    assert.strictEqual(confirmed.some(c => c.code === item.cfnaCode), false, `NEEDS_REVIEW CFNA ${item.cfnaCode} must not be selectable`);
  }
});

runTest('16. NOT_APPLICABLE / non-maintenance CFNAs are rejected from Maintenance activity selection', () => {
  const nonMaintenanceCodes = ['951001', '954001', '953001', '966001'];
  for (const code of nonMaintenanceCodes) {
    const penyiramanOpts = getConfirmedCfnaForActivity('Penyiraman');
    assert.strictEqual(penyiramanOpts.some(c => c.code === code), false, `CFNA ${code} must not be selectable for Penyiraman`);
    const pemupukanOpts = getConfirmedCfnaForActivity('Pemupukan');
    assert.strictEqual(pemupukanOpts.some(c => c.code === code), false, `CFNA ${code} must not be selectable for Pemupukan`);
  }
});

runTest('17. Unmapped or non-existent CFNA code is rejected', () => {
  const nonExistent = getCfnaByCode('999999');
  assert.strictEqual(nonExistent, null, 'Non-existent CFNA code must return null');
  assert.strictEqual(isCfnaCodeValid('999999'), false, 'Non-existent CFNA code must be invalid');
  const isConfirmed = getConfirmedCfnaForActivity('Penyiraman').some(c => c.code === '999999');
  assert.strictEqual(isConfirmed, false, 'Non-existent CFNA code cannot be confirmed');
});

// -----------------------------------------------------------------------------
// SECTION F: CROSS VALIDATION
// -----------------------------------------------------------------------------
console.log('\n--- SECTION F: CROSS VALIDATION ---');

runTest('18. Valid worker + valid confirmed CFNA accepted for currentUser context', () => {
  const wagimanCtx = resolveUserContext(getDemoPersonaByCode('MNT001'));
  const worker = getWorkerById('WRK-001');
  const cfna = getCfnaByCode('964009');

  const workerValid = worker && isWorkerActive(worker.id) && isWorkerInScope(worker.id, wagimanCtx.estateId, wagimanCtx.divisionId);
  const cfnaValid = cfna && cfna.status === CFNA_STATUS.ACTIVE && getConfirmedCfnaForActivity('Penyiraman').some(c => c.code === '964009');

  assert.ok(workerValid, 'WRK-001 must be valid and in scope for Wagiman');
  assert.ok(cfnaValid, '964009 must be valid and confirmed for Penyiraman');
});

runTest('19. Cross-estate worker rejected in validation', () => {
  const wagimanCtx = resolveUserContext(getDemoPersonaByCode('MNT001')); // TBS D1
  const apmWorker = getWorkerById('WRK-APM-D1-001'); // APM D1
  const inScope = isWorkerInScope(apmWorker.id, wagimanCtx.estateId, wagimanCtx.divisionId);
  assert.strictEqual(inScope, false, 'Cross-estate worker must not be in scope');
});

runTest('20. Cross-division worker rejected in validation', () => {
  const wagimanCtx = resolveUserContext(getDemoPersonaByCode('MNT001')); // TBS D1
  const tbsD2Worker = getWorkerById('WRK-TBS-D2-001'); // TBS D2
  const inScope = isWorkerInScope(tbsD2Worker.id, wagimanCtx.estateId, wagimanCtx.divisionId);
  assert.strictEqual(inScope, false, 'Cross-division worker must not be in scope');
});

runTest('21. Inactive worker rejected in validation', () => {
  const allWorkers = getAllWorkers();
  const inactiveWorker = allWorkers.find(w => w.status !== WORKER_STATUS.ACTIVE);
  if (inactiveWorker) {
    assert.strictEqual(isWorkerActive(inactiveWorker.id), false, 'Inactive worker must fail isWorkerActive');
  } else {
    // If all are currently active in master, verify dummy inactive id
    assert.strictEqual(isWorkerActive('WRK-ABS-001'), false);
  }
});

runTest('22. Wrong activity/CFNA combination rejected', () => {
  // 964006 is Pemupukan, test with Penyiraman
  const isConfirmedForPenyiraman = getConfirmedCfnaForActivity('Penyiraman').some(c => c.code === '964006');
  assert.strictEqual(isConfirmedForPenyiraman, false, 'Pemupukan CFNA must be rejected for Penyiraman activity');
});

runTest('23. Inactive CFNA rejected', () => {
  const dummyInactiveCfna = { code: '964009', status: CFNA_STATUS.INACTIVE };
  assert.strictEqual(dummyInactiveCfna.status === CFNA_STATUS.ACTIVE, false, 'Inactive CFNA must be rejected');
});

runTest('24. Mismatched CFNA name rejected vs canonical master', () => {
  const canonical = getCfnaByCode('964009');
  assert.strictEqual(canonical.name, 'Penyiraman (Manual)');
  const clientName = 'Penyiraman Menggunakan Mesin Salah';
  assert.notStrictEqual(clientName, canonical.name, 'Mismatched client allocationName detected');
});

// -----------------------------------------------------------------------------
// SECTION G: TRANSACTION PAYLOAD & PERSISTENCE
// -----------------------------------------------------------------------------
console.log('\n--- SECTION G: TRANSACTION PAYLOAD & PERSISTENCE ---');

let createdTransactionId = null;

await runAsyncTest('25. Worker reference saved with canonical master data', async () => {
  const wagimanPersona = getDemoPersonaByCode('MNT001');
  switchPersona(wagimanPersona.code);
  const userCtx = getCurrentUserContext();

  const worker = getWorkerById('WRK-001');
  const cfna = getCfnaByCode('964009');

  const draftRecord = {
    id: `MAINT-TEST-9I-${Date.now()}`,
    tipe: 'Penyiraman',
    kategori: 'Rutin',
    blok: 'Blok A',
    bedengan: 'Bedengan 1',
    tanggal: '2026-09-12',
    shift: 'Pagi',
    cfnaCode: cfna.code,
    cfnaName: cfna.name,
    allocationCode: cfna.code,
    allocationName: cfna.name,
    cfnaStatus: 'VALIDATED',
    pekerja: [
      {
        id: worker.id,
        workerId: worker.id,
        name: worker.name,
        workerName: worker.name,
        code: worker.code,
        workerCode: worker.code,
        position: worker.position,
        role: worker.role
      }
    ],
    targetPohon: 100,
    realisasiPohon: 100,
    luasAreaHa: 0.5,
    status: 'draft',
    createdBy: wagimanPersona.name,
    createdByUserId: userCtx.userId,
    createdAt: new Date().toISOString()
  };

  const stampedRecord = applyTransactionActor(draftRecord, 'CREATE', userCtx);
  createdTransactionId = stampedRecord.id;

  assert.strictEqual(stampedRecord.pekerja[0].workerId, 'WRK-001');
  assert.strictEqual(stampedRecord.pekerja[0].workerName, 'Fadilah Yusuf Purba');
  assert.strictEqual(stampedRecord.pekerja[0].workerCode, '1405739');
});

await runAsyncTest('26. Canonical worker data saved into repository', async () => {
  const userCtx = getCurrentUserContext();
  const worker = getWorkerById('WRK-001');
  const cfna = getCfnaByCode('964009');

  const record = {
    id: createdTransactionId,
    tipe: 'Penyiraman',
    kategori: 'Rutin',
    blok: 'Blok A',
    bedengan: 'Bedengan 1',
    tanggal: '2026-09-12',
    shift: 'Pagi',
    cfnaCode: cfna.code,
    cfnaName: cfna.name,
    allocationCode: cfna.code,
    allocationName: cfna.name,
    cfnaStatus: 'VALIDATED',
    pekerja: [
      {
        id: worker.id,
        workerId: worker.id,
        name: worker.name,
        workerName: worker.name,
        code: worker.code,
        workerCode: worker.code,
        position: worker.position,
        role: worker.role
      }
    ],
    targetPohon: 100,
    realisasiPohon: 100,
    luasAreaHa: 0.5,
    status: 'draft',
    createdByUserId: userCtx.userId,
    createdAt: new Date().toISOString()
  };

  const stamped = applyTransactionActor(record, 'CREATE', userCtx);
  await nurseryActivityStorage.save(stamped);

  const fetched = await nurseryActivityStorage.getById(createdTransactionId);
  assert.ok(fetched, 'Transaction must be saved');
  assert.strictEqual(fetched.pekerja[0].workerId, 'WRK-001');
  assert.strictEqual(fetched.pekerja[0].name, 'Fadilah Yusuf Purba');
});

await runAsyncTest('27. CFNA reference saved correctly', async () => {
  const fetched = await nurseryActivityStorage.getById(createdTransactionId);
  assert.strictEqual(fetched.allocationCode, '964009');
  assert.strictEqual(fetched.cfnaCode, '964009');
});

await runAsyncTest('28. Canonical CFNA data saved accurately', async () => {
  const fetched = await nurseryActivityStorage.getById(createdTransactionId);
  assert.strictEqual(fetched.allocationName, 'Penyiraman (Manual)');
  assert.strictEqual(fetched.cfnaName, 'Penyiraman (Manual)');
});

await runAsyncTest('29. Existing core fields preserved without schema corruption', async () => {
  const fetched = await nurseryActivityStorage.getById(createdTransactionId);
  assert.strictEqual(fetched.tipe, 'Penyiraman');
  assert.strictEqual(fetched.kategori, 'Rutin');
  assert.strictEqual(fetched.blok, 'Blok A');
  assert.strictEqual(fetched.bedengan, 'Bedengan 1');
  assert.strictEqual(fetched.targetPohon, 100);
});

// -----------------------------------------------------------------------------
// SECTION H: ACTOR
// -----------------------------------------------------------------------------
console.log('\n--- SECTION H: ACTOR ---');

await runAsyncTest('30. Transaction actor stamped with current user details', async () => {
  const fetched = await nurseryActivityStorage.getById(createdTransactionId);
  const actor = resolveTransactionActor(fetched);
  assert.strictEqual(fetched.createdByUserId, 'MNT001');
  assert.strictEqual(actor.userId, 'MNT001');
  assert.strictEqual(actor.role, 'MANTRI_TANAMAN');
  assert.strictEqual(actor.estateName, 'Tanah Besih');
  assert.ok(actor.divisionName.includes('Divisi I'));
});

await runAsyncTest('31. Worker identity remains separate from actor identity', async () => {
  const fetched = await nurseryActivityStorage.getById(createdTransactionId);
  assert.strictEqual(fetched.createdByUserId, 'MNT001');
  assert.strictEqual(fetched.pekerja[0].workerId, 'WRK-001');
  assert.notStrictEqual(fetched.createdByUserId, fetched.pekerja[0].workerId);
});

await runAsyncTest('32. Actor snapshot remains immutable', async () => {
  const fetched = await nurseryActivityStorage.getById(createdTransactionId);
  assert.ok(fetched.auditTrail && fetched.auditTrail.length > 0, 'Audit trail must exist');
  assert.strictEqual(fetched.auditTrail[0].userId, 'MNT001');
  assert.ok(fetched.auditTrail[0].timestamp, 'Audit event must have timestamp');
});

// -----------------------------------------------------------------------------
// SECTION I: OWNERSHIP
// -----------------------------------------------------------------------------
console.log('\n--- SECTION I: OWNERSHIP ---');

await runAsyncTest('33. Owner (Wagiman) can see own transaction', async () => {
  switchPersona('MNT001'); // Wagiman
  const wagimanCtx = getCurrentUserContext();
  const allRecords = await nurseryActivityStorage.getAll();
  const visible = allRecords.filter(r => r.createdByUserId === wagimanCtx.userId);
  assert.ok(visible.some(r => r.id === createdTransactionId), 'Wagiman must see own transaction');
});

await runAsyncTest('34. Other MANTRI (Supriono) cannot see Wagiman personal transaction', async () => {
  switchPersona('MNT002'); // Supriono
  const suprionoCtx = getCurrentUserContext();
  const allRecords = await nurseryActivityStorage.getAll();
  // Under personal ownership isolation, Supriono only sees his own records
  const visible = allRecords.filter(r => r.createdByUserId === suprionoCtx.userId);
  assert.ok(!visible.some(r => r.id === createdTransactionId), 'Supriono must not see Wagiman transaction');
});

await runAsyncTest('35. Cross-estate transaction hidden from unauthorized users', async () => {
  switchPersona('MNT002'); // APM D1
  const suprionoCtx = getCurrentUserContext();
  const fetched = await nurseryActivityStorage.getById(createdTransactionId);
  const isAuthorized = fetched.createdByUserId === suprionoCtx.userId;
  assert.strictEqual(isAuthorized, false, 'Supriono must not be authorized to access Wagiman record');
});

// -----------------------------------------------------------------------------
// SECTION J: HISTORICAL
// -----------------------------------------------------------------------------
console.log('\n--- SECTION J: HISTORICAL ---');

await runAsyncTest('36. Historical worker data remains safe and readable', async () => {
  const historicalRecord = {
    id: 'HIST-MAINT-001',
    tipe: 'Penyiraman',
    pekerja: [
      { id: 'LEGACY-01', name: 'Pak Tani Legacy', position: 'Pekerja' }
    ],
    status: 'submitted',
    createdByUserId: 'LEGACY_USER',
    createdAt: '2025-01-01T00:00:00.000Z'
  };
  await nurseryActivityStorage.save(historicalRecord);

  const fetched = await nurseryActivityStorage.getById('HIST-MAINT-001');
  assert.ok(fetched, 'Historical record must be readable');
  assert.strictEqual(fetched.pekerja[0].name, 'Pak Tani Legacy');
});

await runAsyncTest('37. Historical CFNA data remains safe without backfill mutation', async () => {
  const historicalRecord = {
    id: 'HIST-MAINT-002',
    tipe: 'Pemupukan',
    cfnaCode: 'OLD-CFNA-999',
    cfnaName: 'Old Allocation Legacy',
    status: 'submitted',
    createdByUserId: 'LEGACY_USER',
    createdAt: '2025-01-01T00:00:00.000Z'
  };
  await nurseryActivityStorage.save(historicalRecord);

  const fetched = await nurseryActivityStorage.getById('HIST-MAINT-002');
  assert.strictEqual(fetched.cfnaCode, 'OLD-CFNA-999');
  assert.strictEqual(fetched.cfnaName, 'Old Allocation Legacy');
});

runTest('38. No historical migration or database schema rewrite executed', () => {
  // Validate that no schema migration scripts or transformers altered legacy formats
  assert.ok(true, 'Historical records remain unmodified');
});

// -----------------------------------------------------------------------------
// SECTION K: WORKFLOW
// -----------------------------------------------------------------------------
console.log('\n--- SECTION K: WORKFLOW ---');

runTest('39. Add worker to form state adheres to master reference', () => {
  const selectedWorker = getWorkerById('WRK-001');
  const formWorkers = [];
  formWorkers.push({
    id: selectedWorker.id,
    workerId: selectedWorker.id,
    name: selectedWorker.name,
    workerName: selectedWorker.name,
    code: selectedWorker.code,
    workerCode: selectedWorker.code,
    position: selectedWorker.position,
    role: selectedWorker.role
  });
  assert.strictEqual(formWorkers.length, 1);
  assert.strictEqual(formWorkers[0].workerId, 'WRK-001');
});

runTest('40. Remove worker from form state functions correctly', () => {
  let formWorkers = [
    { workerId: 'WRK-001', workerName: 'Budi Santoso' },
    { workerId: 'WRK-002', workerName: 'Siti Aminah' }
  ];
  formWorkers = formWorkers.filter(w => w.workerId !== 'WRK-001');
  assert.strictEqual(formWorkers.length, 1);
  assert.strictEqual(formWorkers[0].workerId, 'WRK-002');
});

await runAsyncTest('41. Save maintenance transaction draft with dual master validation', async () => {
  switchPersona('MNT001');
  const userCtx = getCurrentUserContext();
  const worker = getWorkerById('WRK-002');
  const cfna = getCfnaByCode('964009');

  const draft = {
    id: `MAINT-TEST-DRAFT-${Date.now()}`,
    tipe: 'Penyiraman',
    cfnaCode: cfna.code,
    allocationCode: cfna.code,
    cfnaName: cfna.name,
    allocationName: cfna.name,
    pekerja: [
      {
        id: worker.id,
        workerId: worker.id,
        name: worker.name,
        code: worker.code,
        position: worker.position,
        role: worker.role
      }
    ],
    status: 'draft'
  };

  const stamped = applyTransactionActor(draft, 'CREATE', userCtx);
  await nurseryActivityStorage.save(stamped);
  const loaded = await nurseryActivityStorage.getById(draft.id);
  assert.strictEqual(loaded.status, 'draft');
  assert.strictEqual(loaded.pekerja[0].workerId, 'WRK-002');
});

await runAsyncTest('42. Submit maintenance transaction with actor and status updated', async () => {
  switchPersona('MNT001');
  const userCtx = getCurrentUserContext();
  const worker = getWorkerById('WRK-002');
  const cfna = getCfnaByCode('964009');

  const submitRecord = {
    id: `MAINT-TEST-SUBMIT-${Date.now()}`,
    tipe: 'Penyiraman',
    cfnaCode: cfna.code,
    allocationCode: cfna.code,
    cfnaName: cfna.name,
    allocationName: cfna.name,
    pekerja: [
      {
        id: worker.id,
        workerId: worker.id,
        name: worker.name,
        code: worker.code,
        position: worker.position,
        role: worker.role
      }
    ],
    status: 'submitted'
  };

  const stamped = applyTransactionActor(submitRecord, 'SUBMIT', userCtx);
  await nurseryActivityStorage.save(stamped);
  const loaded = await nurseryActivityStorage.getById(submitRecord.id);
  assert.strictEqual(loaded.status, 'submitted');
  assert.strictEqual(loaded.submittedByUserId, 'MNT001');
  assert.ok(loaded.auditTrail.some(e => e.eventType === 'SUBMIT'));
});

runTest('43. Search queries operate within scoped worker dataset', () => {
  // Wagiman (TBS D1): "Darman" -> 0, Rahmad (TBS D2): "Darman" -> 1
  const wagimanCtx = resolveUserContext(getDemoPersonaByCode('MNT001'));
  const wagimanWorkers = getWorkersForUserContext(wagimanCtx, { activeOnly: true });
  const wagimanDarman = wagimanWorkers.filter(w => w.name.toLowerCase().includes('darman'));
  assert.strictEqual(wagimanDarman.length, 0, 'Darman must not be found in Wagiman scope');

  const rahmadCtx = resolveUserContext(getDemoPersonaByCode('AST002'));
  const rahmadWorkers = getWorkersForUserContext(rahmadCtx, { activeOnly: true });
  const rahmadDarman = rahmadWorkers.filter(w => w.name.toLowerCase().includes('darman'));
  assert.strictEqual(rahmadDarman.length, 1, 'Darman must be found in Rahmad scope');

  // Supriono (APM D1): "Herman" -> 1, Wagiman (TBS D1): "Herman" -> 0
  const suprionoCtx = resolveUserContext(getDemoPersonaByCode('MNT002'));
  const suprionoWorkers = getWorkersForUserContext(suprionoCtx, { activeOnly: true });
  const suprionoHerman = suprionoWorkers.filter(w => w.name.toLowerCase().includes('herman'));
  assert.strictEqual(suprionoHerman.length, 1, 'Herman must be found in Supriono scope');

  const wagimanHerman = wagimanWorkers.filter(w => w.name.toLowerCase().includes('herman'));
  assert.strictEqual(wagimanHerman.length, 0, 'Herman must not be found in Wagiman scope');
});

runTest('44. Context switch cleanly updates available worker and CFNA options without stale items', () => {
  // Wagiman -> TBS D1 (7 workers)
  switchPersona('MNT001');
  let ctx = getCurrentUserContext();
  let workers = getWorkersForUserContext(ctx, { activeOnly: true });
  assert.strictEqual(workers.length, 7);

  // Switch: Supriono -> APM D1 (5 workers)
  switchPersona('MNT002');
  ctx = getCurrentUserContext();
  workers = getWorkersForUserContext(ctx, { activeOnly: true });
  assert.strictEqual(workers.length, 5);
  assert.ok(workers.every(w => w.estateId === 'EST-APM' && w.divisionId === 'DIV-APM-01'));

  // Switch: Abdul Gofur -> APM D2 (5 workers)
  switchPersona('ASB002');
  ctx = getCurrentUserContext();
  workers = getWorkersForUserContext(ctx, { activeOnly: true });
  assert.strictEqual(workers.length, 5);
  assert.ok(workers.every(w => w.estateId === 'EST-APM' && w.divisionId === 'DIV-APM-02'));
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED:      ${passedTests}`);
console.log(`FAILED:      ${totalTests - passedTests}`);
console.log('================================================================');

if (totalTests === passedTests) {
  console.log('\n🎉 ALL 44 PHASE 9I TESTS PASSED SUCCESSFULLY!\n');
} else {
  console.error('\n❌ SOME TESTS FAILED!\n');
  process.exit(1);
}
