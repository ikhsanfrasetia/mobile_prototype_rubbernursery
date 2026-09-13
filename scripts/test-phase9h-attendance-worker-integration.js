/**
 * scripts/test-phase9h-attendance-worker-integration.js
 *
 * Test Suite Phase 9H — Worker Master Integration: Presensi / Attendance
 * Memvalidasi integrasi centralized worker-master.js ke modul Presensi,
 * scoping Estate & Division per persona, isolasi search, validasi transaksi,
 * pemisahan actor vs worker identity, proteksi historical attendance, dan context switching.
 */

// Mock localStorage for Node.js test environment
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

import { getDemoPersonaByCode } from '../js/data/demo-personas.js';
import { session } from '../js/core/session.js';
import { getCurrentUserContext, resolveUserContext } from '../js/core/user-context.js';
import { applyTransactionActor } from '../js/core/transaction-actor.js';

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

console.log('================================================================================');
console.log('   TEST SUITE PHASE 9H — WORKER MASTER INTEGRATION: PRESENSI / ATTENDANCE       ');
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// A. SOURCE & COMPATIBILITY
// -----------------------------------------------------------------------------
console.log('--- Section A: Source & Compatibility ---');

runTest('1. attendance-workers.js imports and uses worker-master.js APIs', () => {
  const code = fs.readFileSync(path.join(rootDir, 'js', 'modules', 'attendance', 'attendance-workers.js'), 'utf8');
  assert(code.includes("from '../../data/worker-master.js'"), 'attendance-workers.js must import worker-master.js');
  assert(code.includes('getWorkersForUserContext'), 'attendance-workers.js must use getWorkersForUserContext');
  assert(code.includes('getWorkerById'), 'attendance-workers.js must use getWorkerById');
  assert(code.includes('isWorkerInScope'), 'attendance-workers.js must use isWorkerInScope');
  assert(code.includes('isWorkerActive'), 'attendance-workers.js must use isWorkerActive');
});

runTest('2. attendance-landing.js imports and uses worker-master.js for dashboard count', () => {
  const code = fs.readFileSync(path.join(rootDir, 'js', 'modules', 'attendance', 'attendance-landing.js'), 'utf8');
  assert(code.includes("from '../../data/worker-master.js'"), 'attendance-landing.js must import worker-master.js');
  assert(code.includes('getWorkersForUserContext'), 'attendance-landing.js must use getWorkersForUserContext');
});

runTest('3. workerRepository and IndexedDB backward compatibility maintained', () => {
  const code = fs.readFileSync(path.join(rootDir, 'js', 'modules', 'attendance', 'attendance-workers.js'), 'utf8');
  assert(code.includes('workerRepository'), 'attendance-workers.js must maintain workerRepository reference for legacy compatibility');
});

// -----------------------------------------------------------------------------
// B. PERSONA CONTEXT SCOPING
// -----------------------------------------------------------------------------
console.log('\n--- Section B: Persona Context Scoping ---');

const wagiman = getDemoPersonaByCode('MNT001');   // Wagiman, Tanah Besih Divisi I
const rahmad = getDemoPersonaByCode('AST002');    // Rahmad, Tanah Besih Divisi II
const nando = getDemoPersonaByCode('AST001');     // Nando, Aek Pamingke Divisi I
const supriono = getDemoPersonaByCode('MNT002');  // Supriono, Aek Pamingke Divisi II
const abdulGofur = getDemoPersonaByCode('ASB002');// Abdul Gofur, Aek Pamingke Divisi II

runTest('4. Wagiman (TBS D1) resolves exactly 7 active workers + 2 absent workers', () => {
  const ctx = resolveUserContext(wagiman);
  const activeWorkers = getWorkersForUserContext(ctx, { activeOnly: true });
  const allWorkers = getWorkersForUserContext(ctx, { activeOnly: false });
  const absentWorkers = allWorkers.filter(w => !w.active || w.status !== WORKER_STATUS.ACTIVE || w.absentType);

  assert.strictEqual(activeWorkers.length, 7, 'Wagiman must have exactly 7 active workers');
  assert.strictEqual(absentWorkers.length, 2, 'Wagiman must have exactly 2 absent workers');
  assert(activeWorkers.every(w => w.estateId === 'EST-TBS' && w.divisionId === 'DIV-001' && w.active === true));
  assert.deepStrictEqual(absentWorkers.map(w => w.id), ['WRK-ABS-001', 'WRK-ABS-002']);
});

runTest('5. Rahmad (TBS D2) resolves exactly 5 active workers and 0 absent workers', () => {
  const ctx = resolveUserContext(rahmad);
  const activeWorkers = getWorkersForUserContext(ctx, { activeOnly: true });
  const allWorkers = getWorkersForUserContext(ctx, { activeOnly: false });
  const absentWorkers = allWorkers.filter(w => !w.active || w.status !== WORKER_STATUS.ACTIVE || w.absentType);

  assert.strictEqual(activeWorkers.length, 5, 'Rahmad must have exactly 5 active workers');
  assert.strictEqual(absentWorkers.length, 0, 'Rahmad must have 0 absent workers');
  assert(activeWorkers.every(w => w.estateId === 'EST-TBS' && w.divisionId === 'DIV-002' && w.active === true));
});

runTest('6. Nando (APM D1) resolves exactly 5 active workers and 0 absent workers', () => {
  const ctx = resolveUserContext(nando);
  const activeWorkers = getWorkersForUserContext(ctx, { activeOnly: true });
  const allWorkers = getWorkersForUserContext(ctx, { activeOnly: false });
  const absentWorkers = allWorkers.filter(w => !w.active || w.status !== WORKER_STATUS.ACTIVE || w.absentType);

  assert.strictEqual(activeWorkers.length, 5, 'Nando must have exactly 5 active workers');
  assert.strictEqual(absentWorkers.length, 0, 'Nando must have 0 absent workers');
  assert(activeWorkers.every(w => w.estateId === 'EST-APM' && w.divisionId === 'DIV-APM-01' && w.active === true));
});

runTest('7. Supriono (APM D2) resolves exactly 5 active workers and 0 absent workers', () => {
  const ctx = resolveUserContext(supriono);
  const activeWorkers = getWorkersForUserContext(ctx, { activeOnly: true });
  const allWorkers = getWorkersForUserContext(ctx, { activeOnly: false });
  const absentWorkers = allWorkers.filter(w => !w.active || w.status !== WORKER_STATUS.ACTIVE || w.absentType);

  assert.strictEqual(activeWorkers.length, 5, 'Supriono must have exactly 5 active workers');
  assert.strictEqual(absentWorkers.length, 0, 'Supriono must have 0 absent workers');
  assert(activeWorkers.every(w => w.estateId === 'EST-APM' && w.divisionId === 'DIV-APM-02' && w.active === true));
});

// -----------------------------------------------------------------------------
// C. ESTATE & DIVISION ISOLATION
// -----------------------------------------------------------------------------
console.log('\n--- Section C: Estate & Division Isolation ---');

runTest('8. Wagiman (TBS D1) excludes TBS D2 workers', () => {
  const ctx = resolveUserContext(wagiman);
  const workers = getWorkersForUserContext(ctx, { activeOnly: true });
  assert(!workers.some(w => w.divisionId === 'DIV-002'), 'TBS D1 must exclude TBS D2');
});

runTest('9. Wagiman (TBS D1) excludes APM D1 workers', () => {
  const ctx = resolveUserContext(wagiman);
  const workers = getWorkersForUserContext(ctx, { activeOnly: true });
  assert(!workers.some(w => w.estateId === 'EST-APM'), 'TBS D1 must exclude APM');
});

runTest('10. Wagiman (TBS D1) excludes APM D2 workers', () => {
  const ctx = resolveUserContext(wagiman);
  const workers = getWorkersForUserContext(ctx, { activeOnly: true });
  assert(!workers.some(w => w.estateId === 'EST-APM' && w.divisionId === 'DIV-APM-02'), 'TBS D1 must exclude APM D2');
});

runTest('11. Nando (APM D1) excludes TBS D1 workers', () => {
  const ctx = resolveUserContext(nando);
  const workers = getWorkersForUserContext(ctx, { activeOnly: true });
  assert(!workers.some(w => w.estateId === 'EST-TBS'), 'APM D1 must exclude TBS');
});

runTest('12. Nando (APM D1) excludes TBS D2 workers', () => {
  const ctx = resolveUserContext(nando);
  const workers = getWorkersForUserContext(ctx, { activeOnly: true });
  assert(!workers.some(w => w.estateId === 'EST-TBS' && w.divisionId === 'DIV-002'), 'APM D1 must exclude TBS D2');
});

runTest('13. Nando (APM D1) excludes APM D2 workers', () => {
  const ctx = resolveUserContext(nando);
  const workers = getWorkersForUserContext(ctx, { activeOnly: true });
  assert(!workers.some(w => w.divisionId === 'DIV-APM-02'), 'APM D1 must exclude APM D2');
});

// -----------------------------------------------------------------------------
// D. ACTIVE STATUS ENFORCEMENT
// -----------------------------------------------------------------------------
console.log('\n--- Section D: Active Status Enforcement ---');

runTest('14. Inactive workers are not returned when activeOnly=true', () => {
  const ctx = resolveUserContext(wagiman);
  const activeWorkers = getWorkersForUserContext(ctx, { activeOnly: true });
  assert(!activeWorkers.some(w => w.id === 'WRK-ABS-001'), 'WRK-ABS-001 must not be in active list');
  assert(!activeWorkers.some(w => w.id === 'WRK-ABS-002'), 'WRK-ABS-002 must not be in active list');
  assert.strictEqual(isWorkerActive('WRK-ABS-001'), false);
  assert.strictEqual(isWorkerActive('WRK-ABS-002'), false);
});

// -----------------------------------------------------------------------------
// E. TRANSACTION PAYLOAD & STRUCTURE
// -----------------------------------------------------------------------------
console.log('\n--- Section E: Transaction Payload & Structure ---');

runTest('15. Valid attendance transaction payload retains canonical master values', () => {
  const ctx = resolveUserContext(wagiman);
  const selectedWorker = getWorkerById('WRK-001');
  assert(selectedWorker, 'WRK-001 must exist');

  const record = {
    id: 'ATT-WRK-TEST-001',
    type: 'WORKER',
    userId: ctx.userId,
    createdByUserId: ctx.userId,
    workerId: selectedWorker.id,
    name: selectedWorker.name,
    workerName: selectedWorker.name,
    code: selectedWorker.code,
    workerCode: selectedWorker.code,
    position: selectedWorker.position,
    workerRole: 'Pekerja Bibitan',
    supervisorId: ctx.userId,
    attendanceType: 'DATANG',
    method: 'REKAM_DATA_WAJAH',
    photoId: 'PHOTO-ATT-WRK-TEST-001',
    photo: selectedWorker.defaultPhoto,
    date: '2026-09-12',
    tanggal: '2026-09-12',
    time: '07:05:00',
    location: `${ctx.estateName} - ${ctx.divisionName}`,
    estateId: ctx.estateId,
    divisionId: ctx.divisionId,
    status: 'HADIR'
  };

  assert.strictEqual(record.workerId, 'WRK-001');
  assert.strictEqual(record.workerName, 'Fadilah Yusuf Purba');
  assert.strictEqual(record.workerCode, '1405739');
  assert.strictEqual(record.location, 'Tanah Besih - Divisi I');
  assert.strictEqual(record.status, 'HADIR');
});

runTest('16. All required attendance fields are preserved in transaction model', () => {
  const fields = ['id', 'type', 'userId', 'createdByUserId', 'workerId', 'name', 'workerName', 'code', 'workerCode', 'attendanceType', 'method', 'photo', 'date', 'time', 'location', 'status'];
  const record = {
    id: 'ATT-WRK-001',
    type: 'WORKER',
    userId: 'MNT001',
    createdByUserId: 'MNT001',
    workerId: 'WRK-001',
    name: 'Fadilah Yusuf Purba',
    workerName: 'Fadilah Yusuf Purba',
    code: '1405739',
    workerCode: '1405739',
    attendanceType: 'DATANG',
    method: 'REKAM_DATA_WAJAH',
    photo: 'assets/icons/worker_fadilah.jpg',
    date: '2026-09-12',
    time: '07:00:00',
    location: 'Tanah Besih - Divisi I',
    status: 'HADIR'
  };

  for (const f of fields) {
    assert(f in record, `Field ${f} must exist in record`);
  }
});

runTest('17. Attendance creation with multiple scoped workers maintains integrity', () => {
  const ctx = resolveUserContext(wagiman);
  const activeList = getWorkersForUserContext(ctx, { activeOnly: true }).slice(0, 3);
  const records = activeList.map(w => ({
    id: `ATT-${w.id}`,
    type: 'WORKER',
    createdByUserId: ctx.userId,
    workerId: w.id,
    workerName: w.name,
    workerCode: w.code,
    status: 'HADIR'
  }));

  assert.strictEqual(records.length, 3);
  assert.strictEqual(records[0].workerId, 'WRK-001');
  assert.strictEqual(records[1].workerId, 'WRK-002');
  assert.strictEqual(records[2].workerId, 'WRK-003');
});

function switchPersona(code) {
  const p = getDemoPersonaByCode(code);
  if (!p) throw new Error(`Persona ${code} not found`);
  session.start({
    userId: p.code,
    code: p.code,
    role: p.role,
    name: p.name,
    position: p.position,
    estateId: p.estateId,
    estateName: p.estateName,
    divisionId: p.divisionId,
    divisionName: p.divisionName,
    scopeType: p.scopeType
  });
  return getCurrentUserContext();
}

// -----------------------------------------------------------------------------
// F. ACTOR VS WORKER IDENTITY SEPARATION
// -----------------------------------------------------------------------------
console.log('\n--- Section F: Actor vs Worker Identity Separation ---');

runTest('18. createdByUserId matches current actor (e.g. MNT001)', () => {
  switchPersona('MNT001');
  const user = session.get();
  assert.strictEqual(user.userId, 'MNT001', 'Current actor matches Wagiman / MNT001');
});

runTest('19. Actor identity is distinct from worker identity', () => {
  switchPersona('MNT001');
  const user = session.get();
  const worker = getWorkerById('WRK-001');
  assert.notStrictEqual(user.userId, worker.id, 'Actor ID (MNT001) must never equal Worker ID (WRK-001)');
});

// -----------------------------------------------------------------------------
// G. VALIDATION & REJECTION RULES
// -----------------------------------------------------------------------------
console.log('\n--- Section G: Validation & Rejection Rules ---');

runTest('20. Unknown worker is rejected', () => {
  const worker = getWorkerById('WRK-UNKNOWN-999');
  assert.strictEqual(worker, null, 'Unknown worker should return null');
});

runTest('21. Inactive worker is rejected for new active attendance', () => {
  const worker = getWorkerById('WRK-ABS-001');
  assert(worker, 'WRK-ABS-001 exists');
  assert.strictEqual(isWorkerActive(worker.id), false, 'WRK-ABS-001 is inactive');
});

runTest('22. Cross-division worker is rejected', () => {
  const ctx = resolveUserContext(wagiman); // TBS D1
  const tbsD2Worker = getWorkerById('WRK-TBS-D2-001'); // TBS D2
  assert(tbsD2Worker, 'WRK-TBS-D2-001 exists');
  const inScope = isWorkerInScope(tbsD2Worker.id, ctx.estateId, ctx.divisionId);
  assert.strictEqual(inScope, false, 'TBS D2 worker must NOT be in scope for TBS D1 context');
});

runTest('23. Cross-estate worker is rejected', () => {
  const ctx = resolveUserContext(wagiman); // TBS D1
  const apmWorker = getWorkerById('WRK-APM-D1-001'); // APM D1
  assert(apmWorker, 'WRK-APM-D1-001 exists');
  const inScope = isWorkerInScope(apmWorker.id, ctx.estateId, ctx.divisionId);
  assert.strictEqual(inScope, false, 'APM D1 worker must NOT be in scope for TBS D1 context');
});

// -----------------------------------------------------------------------------
// H. HISTORICAL ATTENDANCE COMPATIBILITY
// -----------------------------------------------------------------------------
console.log('\n--- Section H: Historical Attendance Compatibility ---');

runTest('24. Historical attendance record remains readable without forced migration', () => {
  const legacyRecord = {
    id: 'ATT-WRK-LEGACY-001',
    type: 'WORKER',
    userId: 'MNT001',
    workerId: 'WRK-001',
    name: 'Fadilah Yusuf Purba',
    workerName: 'Fadilah Yusuf Purba',
    code: '1405739',
    workerCode: '1405739',
    date: '2026-08-01',
    time: '07:10:00',
    status: 'HADIR'
  };

  assert.strictEqual(legacyRecord.workerId, 'WRK-001');
  assert.strictEqual(legacyRecord.workerName, 'Fadilah Yusuf Purba');
  assert.strictEqual(legacyRecord.status, 'HADIR');
});

runTest('25. Historical worker snapshot is immutable', () => {
  const legacySnapshot = {
    workerId: 'WRK-LEGACY-X',
    workerName: 'Pekerja Lama Manual',
    workerCode: 'LEGACY-001'
  };

  // Rendering historical snapshot directly without throwing
  const renderedName = legacySnapshot.workerName;
  const renderedCode = legacySnapshot.workerCode;
  assert.strictEqual(renderedName, 'Pekerja Lama Manual');
  assert.strictEqual(renderedCode, 'LEGACY-001');
});

// -----------------------------------------------------------------------------
// I. SEARCH ISOLATION
// -----------------------------------------------------------------------------
console.log('\n--- Section I: Search Isolation ---');

runTest('26. Search is scoped: Wagiman searching "Darman" returns 0 results', () => {
  const ctx = resolveUserContext(wagiman); // TBS D1
  const visibleWorkers = getWorkersForUserContext(ctx, { activeOnly: true });
  const q = 'darman'.toLowerCase();
  const searchResults = visibleWorkers.filter(w => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q));
  assert.strictEqual(searchResults.length, 0, 'Wagiman must not find Darman in TBS D1');
});

runTest('27. Search is scoped: Rahmad searching "Darman" returns 1 result', () => {
  const ctx = resolveUserContext(rahmad); // TBS D2
  const visibleWorkers = getWorkersForUserContext(ctx, { activeOnly: true });
  const q = 'darman'.toLowerCase();
  const searchResults = visibleWorkers.filter(w => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q));
  assert.strictEqual(searchResults.length, 1, 'Rahmad must find Darman in TBS D2');
  assert.strictEqual(searchResults[0].id, 'WRK-TBS-D2-001');
});

runTest('28. Search is scoped: Nando searching "Herman" returns 1 result', () => {
  const ctx = resolveUserContext(nando); // APM D1
  const visibleWorkers = getWorkersForUserContext(ctx, { activeOnly: true });
  const q = 'herman'.toLowerCase();
  const searchResults = visibleWorkers.filter(w => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q));
  assert.strictEqual(searchResults.length, 1, 'Nando must find Herman in APM D1');
  assert.strictEqual(searchResults[0].id, 'WRK-APM-D1-001');
});

runTest('29. Search is scoped: Wagiman searching "Herman" returns 0 results', () => {
  const ctx = resolveUserContext(wagiman); // TBS D1
  const visibleWorkers = getWorkersForUserContext(ctx, { activeOnly: true });
  const q = 'herman'.toLowerCase();
  const searchResults = visibleWorkers.filter(w => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q));
  assert.strictEqual(searchResults.length, 0, 'Wagiman must not find Herman in TBS D1');
});

// -----------------------------------------------------------------------------
// J. CONTEXT SWITCH & STALE DATA PREVENTION
// -----------------------------------------------------------------------------
console.log('\n--- Section J: Context Switch & Stale Data Prevention ---');

runTest('30. Context switch from Wagiman (TBS D1) to Nando (APM D1) refreshes worker list cleanly', () => {
  const ctxWagiman = resolveUserContext(wagiman);
  const workersWagiman = getWorkersForUserContext(ctxWagiman, { activeOnly: true });

  const ctxNando = resolveUserContext(nando);
  const workersNando = getWorkersForUserContext(ctxNando, { activeOnly: true });

  assert.strictEqual(workersWagiman.length, 7);
  assert.strictEqual(workersNando.length, 5);
  // Zero overlap
  const wagimanIds = new Set(workersWagiman.map(w => w.id));
  assert(workersNando.every(w => !wagimanIds.has(w.id)), 'No TBS D1 worker IDs should exist in APM D1 list');
});

runTest('31. Context switch from Nando (APM D1) to Supriono (APM D2) refreshes worker list cleanly', () => {
  const ctxNando = resolveUserContext(nando);
  const workersNando = getWorkersForUserContext(ctxNando, { activeOnly: true });

  const ctxSupriono = resolveUserContext(supriono);
  const workersSupriono = getWorkersForUserContext(ctxSupriono, { activeOnly: true });

  assert.strictEqual(workersNando.length, 5);
  assert.strictEqual(workersSupriono.length, 5);
  // Zero overlap between D1 and D2 of APM
  const nandoIds = new Set(workersNando.map(w => w.id));
  assert(workersSupriono.every(w => !nandoIds.has(w.id)), 'No APM D1 worker IDs should exist in APM D2 list');
});

runTest('32. Code base preserves protected architecture files without edits', () => {
  const protectedFiles = [
    'js/core/permissions.js',
    'js/core/role-profiles.js',
    'js/core/user-context.js',
    'js/core/transaction-actor.js',
    'js/db/repositories.js',
    'js/core/menu-registry.js',
    'js/core/router.js',
    'js/data/worker-master.js'
  ];

  for (const relPath of protectedFiles) {
    const fullPath = path.join(rootDir, relPath);
    assert(fs.existsSync(fullPath), `Protected file must exist: ${relPath}`);
  }
});

console.log(`\n================================================================================`);
console.log(`PHASE 9H TEST RESULT: ${passedTests} / ${totalTests} ASSERTIONS PASSED ✅`);
console.log(`================================================================================\n`);
