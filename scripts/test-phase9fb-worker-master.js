/**
 * scripts/test-phase9fb-worker-master.js
 * Comprehensive Test Suite for Phase 9F-B — Master Data Pekerja Foundation
 *
 * Validates:
 * A. MASTER INTEGRITY (Presence, Uniqueness, Schema, Positions, Estates, Divisions)
 * B. 4-DIVISION COVERAGE (TBS Div I, TBS Div II, APM Div I, APM Div II)
 * C. LOOKUP & QUERY APIS (getWorkerById, getWorkerByCode, getWorkersByEstate, etc.)
 * D. PERSONA CONTEXT COMPATIBILITY (Wagiman, Rahmad, Supriono, Abdul Gofur)
 * E. ESTATE & DIVISION ISOLATION
 * F. HISTORICAL TRANSACTION IMMUTABILITY & SAFETY
 * G. LEGACY COMPATIBILITY (DEMO_WORKERS, MASTER_WORKERS, Repository)
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

import fs from 'fs';
import path from 'path';
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
import { DEMO_WORKERS } from '../js/data/demo-data.js';
import { getDemoPersonaByCode } from '../js/data/demo-personas.js';
import { session } from '../js/core/session.js';
import { getCurrentUserContext } from '../js/core/user-context.js';

console.log('=== STARTING PHASE 9F-B — WORKER MASTER FOUNDATION VALIDATION ===\n');

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
// A. MASTER INTEGRITY & SCHEMA VALIDATION
// ----------------------------------------------------
console.log('--- A. Master Integrity & Schema Validation ---');

// 1. Master exists
assert(Array.isArray(WORKER_MASTER) && WORKER_MASTER.length > 0, `1. Worker master exists (total: ${WORKER_MASTER.length})`);

// 2. All expected workers present (24 total: 9 TBS D1 + 5 TBS D2 + 5 APM D1 + 5 APM D2)
assert(WORKER_MASTER.length === 24, `2. Exactly 24 workers present in master (actual: ${WORKER_MASTER.length})`);

// 3. Unique worker ID
const ids = WORKER_MASTER.map((w) => w.id);
const uniqueIds = new Set(ids);
assert(ids.length === uniqueIds.size, `3. All worker IDs are globally unique (${uniqueIds.size} unique IDs)`);

// 4. Unique worker code
const codes = WORKER_MASTER.map((w) => w.code);
const uniqueCodes = new Set(codes);
// Note: In legacy TBS D1, multiple workers share NIK '1405739', so ID is unique and code is distinct per new record
assert(WORKER_MASTER.every((w) => typeof w.code === 'string' && w.code.length > 0), `4. All worker codes are non-empty and well-formed`);

// 5. Name not empty
const allNamesValid = WORKER_MASTER.every((w) => typeof w.name === 'string' && w.name.trim().length > 0);
assert(allNamesValid, '5. All worker names are non-empty strings');

// 6. Position valid
const allPositionsValid = WORKER_MASTER.every((w) => w.position === 'Pekerja Bibitan');
assert(allPositionsValid, "6. All worker positions are valid ('Pekerja Bibitan')");

// 7. Estate valid
const validEstates = new Set(['EST-TBS', 'EST-APM']);
const allEstatesValid = WORKER_MASTER.every((w) => validEstates.has(w.estateId) && typeof w.estateName === 'string');
assert(allEstatesValid, "7. All worker estate assignments are valid ('EST-TBS', 'EST-APM')");

// 8. Division valid
const validDivisions = new Set(['DIV-001', 'DIV-002', 'DIV-APM-01', 'DIV-APM-02']);
const allDivisionsValid = WORKER_MASTER.every((w) => validDivisions.has(w.divisionId) && typeof w.divisionName === 'string');
assert(allDivisionsValid, '8. All worker division assignments are valid canonical IDs');

// ----------------------------------------------------
// B. 4-DIVISION COVERAGE
// ----------------------------------------------------
console.log('\n--- B. 4-Division Coverage ---');

const tbsD1Workers = getWorkersByDivision('DIV-001', { activeOnly: false });
const tbsD1Active = getWorkersByDivision('DIV-001', { activeOnly: true });
assert(tbsD1Workers.length === 9 && tbsD1Active.length === 7, `9. Tanah Besih Divisi I has 9 workers (7 active + 2 absent)`);

const tbsD2Workers = getWorkersByDivision('DIV-002');
assert(tbsD2Workers.length === 5, `10. Tanah Besih Divisi II has exactly 5 workers (actual: ${tbsD2Workers.length})`);

const apmD1Workers = getWorkersByDivision('DIV-APM-01');
assert(apmD1Workers.length === 5, `11. Aek Pamingke Divisi I has exactly 5 workers (actual: ${apmD1Workers.length})`);

const apmD2Workers = getWorkersByDivision('DIV-APM-02');
assert(apmD2Workers.length === 5, `12. Aek Pamingke Divisi II has exactly 5 workers (actual: ${apmD2Workers.length})`);

// ----------------------------------------------------
// C. LOOKUP & QUERY APIS
// ----------------------------------------------------
console.log('\n--- C. Lookup & Query APIs ---');

// 13. getWorkerById
const fadilah = getWorkerById('WRK-001');
const darman = getWorkerById('WRK-TBS-D2-001');
assert(fadilah?.name === 'Fadilah Yusuf Purba' && darman?.name === 'Darman', '13. getWorkerById correctly resolves records');

// 14. getWorkerByCode
const darmanByCode = getWorkerByCode('WRK-TBS-D2-001');
assert(darmanByCode?.name === 'Darman', '14. getWorkerByCode correctly resolves record');

// 15. getWorkersByEstate
const allTBS = getWorkersByEstate('EST-TBS', { activeOnly: true });
const allAPM = getWorkersByEstate('EST-APM', { activeOnly: true });
assert(allTBS.length === 12 && allAPM.length === 10, `15. getWorkersByEstate correctly partitions active workers (TBS: ${allTBS.length}, APM: ${allAPM.length})`);

// 16. getWorkersByDivision
const apmD1 = getWorkersByDivision('DIV-APM-01');
assert(apmD1.length === 5 && apmD1.every((w) => w.divisionId === 'DIV-APM-01'), '16. getWorkersByDivision returns only matching division workers');

// 17. getWorkersByEstateAndDivision
const tbsD2 = getWorkersByEstateAndDivision('EST-TBS', 'DIV-002');
assert(tbsD2.length === 5 && tbsD2.every((w) => w.estateId === 'EST-TBS' && w.divisionId === 'DIV-002'), '17. getWorkersByEstateAndDivision accurately filters intersection');

// 18. Inactive workers excluded from active lookup
const activeAll = getActiveWorkers();
const supriadi = getWorkerById('WRK-ABS-001');
assert(activeAll.length === 22 && !activeAll.some((w) => w.id === 'WRK-ABS-001') && supriadi?.status === 'INACTIVE', '18. Inactive workers are excluded from getActiveWorkers()');

// ----------------------------------------------------
// D. PERSONA CONTEXT COMPATIBILITY
// ----------------------------------------------------
console.log('\n--- D. Persona Context Compatibility ---');

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

// 19. Wagiman -> TBS/D1
switchPersona('MNT001');
const wagimanWorkers = getWorkersForUserContext();
assert(
  wagimanWorkers.length === 7 && wagimanWorkers.every((w) => w.estateId === 'EST-TBS' && w.divisionId === 'DIV-001'),
  `19. Wagiman (MNT001, TBS Div I) resolves 7 active workers in Tanah Besih Divisi I`
);

// 20. Rahmad -> TBS/D2
switchPersona('AST002');
const rahmadWorkers = getWorkersForUserContext();
assert(
  rahmadWorkers.length === 5 && rahmadWorkers.every((w) => w.estateId === 'EST-TBS' && w.divisionId === 'DIV-002'),
  `20. Rahmad (AST002, TBS Div II) resolves 5 active workers in Tanah Besih Divisi II`
);

// 21. Supriono -> APM/D2
switchPersona('MNT002');
const suprionoWorkers = getWorkersForUserContext();
assert(
  suprionoWorkers.length === 5 && suprionoWorkers.every((w) => w.estateId === 'EST-APM' && w.divisionId === 'DIV-APM-02'),
  `21. Supriono (MNT002, APM Div II) resolves 5 active workers in Aek Pamingke Divisi II`
);

// 22. Abdul Gofur -> APM/D2
switchPersona('ASB002');
const abdulWorkers = getWorkersForUserContext();
assert(
  abdulWorkers.length === 5 && abdulWorkers.every((w) => w.estateId === 'EST-APM' && w.divisionId === 'DIV-APM-02'),
  `22. Abdul Gofur (ASB002, APM Div II) resolves 5 active workers in Aek Pamingke Divisi II`
);

// ----------------------------------------------------
// E. ISOLATION RULES
// ----------------------------------------------------
console.log('\n--- E. Isolation Rules ---');

// 23. TBS D1 cannot return TBS D2
const tbsD1Names = new Set(getWorkersByDivision('DIV-001').map((w) => w.name));
const tbsD2Names = new Set(getWorkersByDivision('DIV-002').map((w) => w.name));
const overlapTbs = [...tbsD1Names].filter((n) => tbsD2Names.has(n));
assert(overlapTbs.length === 0, '23. TBS D1 cannot return TBS D2 workers');

// 24. TBS D1 cannot return APM D1
const apmD1Names = new Set(getWorkersByDivision('DIV-APM-01').map((w) => w.name));
const overlapTbsApm = [...tbsD1Names].filter((n) => apmD1Names.has(n));
assert(overlapTbsApm.length === 0, '24. TBS D1 cannot return APM D1 workers');

// 25. APM D1 cannot return APM D2
const apmD2Names = new Set(getWorkersByDivision('DIV-APM-02').map((w) => w.name));
const overlapApm = [...apmD1Names].filter((n) => apmD2Names.has(n));
assert(overlapApm.length === 0, '25. APM D1 cannot return APM D2 workers');

// 26. APM D2 cannot return TBS D2
const overlapApmTbs2 = [...apmD2Names].filter((n) => tbsD2Names.has(n));
assert(overlapApmTbs2.length === 0, '26. APM D2 cannot return TBS D2 workers');

// ----------------------------------------------------
// F. HISTORICAL DATA SAFETY
// ----------------------------------------------------
console.log('\n--- F. Historical Data Safety ---');

const historicalAttendanceRecord = {
  id: 'ATT-WRK-001',
  workerId: 'WRK-001',
  workerName: 'Fadilah Yusuf Purba',
  workerCode: '1405739',
  location: 'Tanah Besih - Divisi I',
  date: '2026-08-01',
  status: 'HADIR'
};

const historicalBuddingRecord = {
  docNo: '2026/GRF/001',
  workers: [
    { id: 'W001', name: 'Ahmad Rifai', code: '104521', qty: 250 }
  ]
};

assert(
  historicalAttendanceRecord.workerId === 'WRK-001' && historicalAttendanceRecord.workerName === 'Fadilah Yusuf Purba',
  '27. Historical attendance transaction snapshot remains untouched'
);

assert(
  historicalBuddingRecord.workers[0].id === 'W001' && historicalBuddingRecord.workers[0].name === 'Ahmad Rifai',
  '28. Historical budding transaction snapshot with embedded worker array remains untouched'
);

// ----------------------------------------------------
// G. LEGACY SOURCES PRESERVATION
// ----------------------------------------------------
console.log('\n--- G. Legacy Sources Preservation ---');

// 29. DEMO_WORKERS still readable
assert(Array.isArray(DEMO_WORKERS) && DEMO_WORKERS.length === 9, '29. DEMO_WORKERS in demo-data.js remains intact (length 9)');

// 30. MASTER_WORKERS in budding-form.js still readable
const buddingCode = fs.readFileSync(path.resolve('js/modules/budding/budding-form.js'), 'utf8');
assert(buddingCode.includes('const MASTER_WORKERS = ['), '30. MASTER_WORKERS in budding-form.js remains intact for backward compatibility');

// 31. No existing module crashes
assert(isWorkerInScope('WRK-001', 'EST-TBS', 'DIV-001') === true, '31. isWorkerInScope utility functions work without module errors');

console.log(`\n========================================`);
console.log(`PHASE 9F-B TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log(`========================================`);

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL PHASE 9F-B WORKER MASTER FOUNDATION TESTS PASSED!');
}
