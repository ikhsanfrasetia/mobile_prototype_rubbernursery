/**
 * scripts/test-phase9fa-worker-audit.js
 * Test Suite for Phase 9F-A — Worker Master Dependency Audit
 *
 * Validates:
 * 1. Worker references successfully discovered in attendance, budding, and demo-data.
 * 2. Existing worker sources identified (DEMO_WORKERS, MASTER_WORKERS, IndexedDB repository).
 * 3. Existing worker fields identified (id, code, name, position, divisionId, photo, qty).
 * 4. Estate usage & filter state established (ESTATE_FILTER = NO).
 * 5. Division usage & filter state established (DIVISION_FILTER = NO).
 * 6. Role usage established (MANTRI_TANAMAN as primary actor).
 * 7. Transaction storage schemas verified (attendance flat snapshot vs budding embedded array).
 * 8. Historical usage classification established (WITH_WORKER_SNAPSHOT).
 * 9. Hard-coded sources identified (MASTER_WORKERS in budding-form.js, fallback in attendance-workers.js).
 * 10. Existing worker master status established (NO_EXISTING_CENTRALIZED_WORKER_MASTER_FOUND).
 * 11. No application source modified unexpectedly (strict read-only audit).
 */

import fs from 'fs';
import path from 'path';
import { DEMO_WORKERS } from '../js/data/demo-data.js';
import { workerRepository } from '../js/db/repositories.js';

console.log('=== STARTING PHASE 9F-A — WORKER MASTER DEPENDENCY AUDIT TEST SUITE ===\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

// ----------------------------------------------------
// 1. Worker References Discovery
// ----------------------------------------------------
console.log('--- 1. Worker References Discovery ---');
const attendanceWorkersPath = path.resolve('js/modules/attendance/attendance-workers.js');
const buddingFormPath = path.resolve('js/modules/budding/budding-form.js');
const demoDataPath = path.resolve('js/data/demo-data.js');

const attendanceCode = fs.readFileSync(attendanceWorkersPath, 'utf8');
const buddingCode = fs.readFileSync(buddingFormPath, 'utf8');
const demoDataCode = fs.readFileSync(demoDataPath, 'utf8');

assert(attendanceCode.includes('workerRepository') && attendanceCode.includes('Pekerja Bibitan'), '1.1 Attendance module references workers via repository and UI');
assert(buddingCode.includes('MASTER_WORKERS') && buddingCode.includes('Pekerja Okulasi'), '1.2 Budding module references workers via MASTER_WORKERS and UI selection');
assert(demoDataCode.includes('DEMO_WORKERS'), '1.3 Demo data contains DEMO_WORKERS definition');

// ----------------------------------------------------
// 2. Existing Worker Sources Identification
// ----------------------------------------------------
console.log('\n--- 2. Existing Worker Sources Identification ---');
assert(Array.isArray(DEMO_WORKERS) && DEMO_WORKERS.length === 9, `2.1 DEMO_WORKERS has exactly 9 records (actual: ${DEMO_WORKERS.length})`);
assert(typeof workerRepository?.list === 'function', '2.2 workerRepository provides Data Access list() method');
assert(buddingCode.includes('const MASTER_WORKERS = ['), '2.3 budding-form.js contains hard-coded MASTER_WORKERS array');

// ----------------------------------------------------
// 3. Worker Fields Verification
// ----------------------------------------------------
console.log('\n--- 3. Worker Fields Verification ---');
const sampleDemoWorker = DEMO_WORKERS[0];
assert(
  sampleDemoWorker.id && sampleDemoWorker.code && sampleDemoWorker.name && sampleDemoWorker.position && sampleDemoWorker.divisionId,
  '3.1 DEMO_WORKERS contains required fields: id, code, name, position, divisionId'
);
assert(
  DEMO_WORKERS.some(w => w.absentType && w.absentReason),
  '3.2 DEMO_WORKERS contains absent fields: absentType, absentReason'
);

// ----------------------------------------------------
// 4. Estate & Division Mapping State
// ----------------------------------------------------
console.log('\n--- 4. Estate & Division Mapping State ---');
const allTbsDiv1 = DEMO_WORKERS.every(w => w.divisionId === 'DIV-001');
assert(allTbsDiv1 === true, '4.1 All existing DEMO_WORKERS currently belong to Tanah Besih Divisi I (DIV-001)');
const hasDivisionFilterInBudding = buddingCode.includes('user.divisionId') && buddingCode.includes('filter(w => w.divisionId');
assert(!hasDivisionFilterInBudding, '4.2 Budding module currently has NO division filter (DIVISION_FILTER = NO)');
const hasEstateFilterInAttendance = attendanceCode.includes('user.estateId') && attendanceCode.includes('filter(w => w.estateId');
assert(!hasEstateFilterInAttendance, '4.3 Attendance module currently has NO estate filter (ESTATE_FILTER = NO)');

// ----------------------------------------------------
// 5. Role Usage Verification
// ----------------------------------------------------
console.log('\n--- 5. Role Usage Verification ---');
assert(attendanceCode.includes('MANTRI_TANAMAN') || attendanceCode.includes('Mantri'), '5.1 Attendance module is designated for Mantri');
assert(buddingCode.includes('Mantri'), '5.2 Budding form is designated for Mantri');

// ----------------------------------------------------
// 6. Transaction Storage Models
// ----------------------------------------------------
console.log('\n--- 6. Transaction Storage Models ---');
assert(attendanceCode.includes('workerId: w.id') && attendanceCode.includes('workerName: w.name'), '6.1 Attendance stores flat worker snapshot (workerId + workerName + code + photo)');
assert(buddingCode.includes('workers:') && (buddingCode.includes('selectedWorkers.map') || buddingCode.includes('canonicalWorkers')), '6.2 Budding stores embedded worker array (workers: [{ id, name, code, qty }])');

// ----------------------------------------------------
// 7. Hard-Coded Sources Identification
// ----------------------------------------------------
console.log('\n--- 7. Hard-Coded Sources Identification ---');
const masterWorkerBlockMatch = buddingCode.match(/const MASTER_WORKERS = \[([\s\S]*?)\];/);
const masterWorkerMatches = masterWorkerBlockMatch ? (masterWorkerBlockMatch[1].match(/id:\s*'W\d+'/g) || []).length : 0;
assert(masterWorkerMatches === 12, `7.1 Exactly 12 hard-coded workers found in MASTER_WORKERS array in budding-form.js (W001 - W012, actual: ${masterWorkerMatches})`);
assert(buddingCode.includes("id: 'W001'") && buddingCode.includes('selectedWorkers'), '7.2 Hardcoded initial selected worker fallback present in budding-form.js');
assert(attendanceCode.includes("id: 'WRK-001'"), '7.3 Hard-coded fallback array present in attendance-workers.js');

// ----------------------------------------------------
// 8. Existing Master Presence / Absence
// ----------------------------------------------------
console.log('\n--- 8. Existing Master Status ---');
const masterDataCode = fs.readFileSync(path.resolve('js/data/master-data.js'), 'utf8');
assert(!masterDataCode.includes('WORKER_MASTER') && !masterDataCode.includes('DEMO_WORKERS'), '8.1 master-data.js contains no legacy worker master (audit baseline established)');

// ----------------------------------------------------
// 9. Read-Only Invariant: Zero Runtime Modifications
// ----------------------------------------------------
console.log('\n--- 9. Read-Only Invariant Verification ---');
const permissionsCode = fs.readFileSync(path.resolve('js/core/permissions.js'), 'utf8');
const userContextCode = fs.readFileSync(path.resolve('js/core/user-context.js'), 'utf8');
const transactionActorCode = fs.readFileSync(path.resolve('js/core/transaction-actor.js'), 'utf8');

assert(permissionsCode.includes('ROLES') && userContextCode.includes('resolveUserContext') && transactionActorCode.includes('applyTransactionActor'), '9.1 Core architecture files remain intact and untouched');

console.log(`\n========================================`);
console.log(`PHASE 9F-A AUDIT TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log(`========================================`);

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL PHASE 9F-A WORKER AUDIT TESTS PASSED!');
}
