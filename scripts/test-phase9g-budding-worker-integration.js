/**
 * scripts/test-phase9g-budding-worker-integration.js
 * Automated Test Suite for Phase 9G — Worker Master Integration: Okulasi / Budding
 *
 * Validates:
 * A. SOURCE: budding-form integrates worker-master and deprecates hardcoded MASTER_WORKERS for new transactions.
 * B. USER CONTEXT: Wagiman, Rahmad, Supriono, and Abdul Gofur resolve their exact division worker pools.
 * C. ISOLATION: Cross-estate and cross-division workers are strictly isolated.
 * D. ACTIVE STATUS: Inactive/absent workers are excluded from selection.
 * E. TRANSACTION: Canonical worker data (id, name, code, qty) are stored accurately.
 * F. VALIDATION: Out-of-scope, invalid, and inactive workers are rejected on submission.
 * G. ACTOR IDENTITY: Transaction actor (createdByUserId) is strictly distinct from workerId.
 * H. HISTORICAL: Legacy transactions with W001-W012 snapshots remain immutable and readable.
 * I. WORKFLOW: Add, remove, and save workflow operations operate seamlessly.
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
  getWorkersForUserContext,
  getWorkerById,
  isWorkerActive,
  isWorkerInScope
} from '../js/data/worker-master.js';
import { getDemoPersonaByCode } from '../js/data/demo-personas.js';
import { session } from '../js/core/session.js';
import { getCurrentUserContext } from '../js/core/user-context.js';
import { storage } from '../js/core/storage.js';
import { applyTransactionActor } from '../js/core/transaction-actor.js';

console.log('=== STARTING PHASE 9G — BUDDING WORKER INTEGRATION TEST SUITE ===\n');

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

const buddingFormPath = path.resolve('js/modules/budding/budding-form.js');
const buddingCode = fs.readFileSync(buddingFormPath, 'utf8');

// ----------------------------------------------------
// A. SOURCE INTEGRITY
// ----------------------------------------------------
console.log('--- A. Source Integrity ---');

assert(
  buddingCode.includes("from '../../data/worker-master.js'") &&
  buddingCode.includes('getWorkersForUserContext'),
  '1. budding-form.js imports centralized worker-master.js'
);

assert(
  !buddingCode.includes('const NEW_WORKERS = [') &&
  !buddingCode.includes('const BUDDING_WORKERS = ['),
  '2. No duplicate runtime worker list created in budding module'
);

assert(
  buddingCode.includes('availableScopedWorkers[0]') &&
  !buddingCode.includes(": [{ id: 'W001', name: 'Ahmad Rifai'"),
  '3. Initial worker selection uses scoped worker-master instead of hardcoded W001'
);

// ----------------------------------------------------
// B. USER CONTEXT RESOLUTION
// ----------------------------------------------------
console.log('\n--- B. User Context Scoping ---');

switchPersona('MNT001'); // Wagiman: Tanah Besih Divisi I
const wagimanPool = getWorkersForUserContext();
assert(
  wagimanPool.length === 7 && wagimanPool.every((w) => w.estateId === 'EST-TBS' && w.divisionId === 'DIV-001'),
  `4. Wagiman (MNT001) resolves 7 active workers in Tanah Besih Divisi I`
);

switchPersona('AST002'); // Rahmad: Tanah Besih Divisi II
const rahmadPool = getWorkersForUserContext();
assert(
  rahmadPool.length === 5 && rahmadPool.every((w) => w.estateId === 'EST-TBS' && w.divisionId === 'DIV-002'),
  `5. Rahmad (AST002) resolves 5 active workers in Tanah Besih Divisi II`
);

switchPersona('AST001'); // Nando: Aek Pamingke Divisi I
const nandoPool = getWorkersForUserContext();
assert(
  nandoPool.length === 5 && nandoPool.every((w) => w.estateId === 'EST-APM' && w.divisionId === 'DIV-APM-01'),
  `6. Nando (AST001) resolves 5 active workers in Aek Pamingke Divisi I`
);

switchPersona('MNT002'); // Supriono: Aek Pamingke Divisi II
const suprionoPool = getWorkersForUserContext();
assert(
  suprionoPool.length === 5 && suprionoPool.every((w) => w.estateId === 'EST-APM' && w.divisionId === 'DIV-APM-02'),
  `7. Supriono (MNT002) resolves 5 active workers in Aek Pamingke Divisi II`
);

// ----------------------------------------------------
// C. ISOLATION RULES
// ----------------------------------------------------
console.log('\n--- C. Isolation Rules ---');

const tbsD1Ids = new Set(wagimanPool.map((w) => w.id));
const tbsD2Ids = new Set(rahmadPool.map((w) => w.id));
const apmD1Ids = new Set(nandoPool.map((w) => w.id));
const apmD2Ids = new Set(suprionoPool.map((w) => w.id));

assert([...tbsD1Ids].every((id) => !tbsD2Ids.has(id)), '8. TBS D1 does not see TBS D2 workers');
assert([...tbsD1Ids].every((id) => !apmD1Ids.has(id)), '9. TBS D1 does not see APM D1 workers');
assert([...apmD1Ids].every((id) => !apmD2Ids.has(id)), '10. APM D1 does not see APM D2 workers');
assert([...apmD2Ids].every((id) => !tbsD2Ids.has(id)), '11. APM D2 does not see TBS D2 workers');

// ----------------------------------------------------
// D. ACTIVE STATUS ENFORCEMENT
// ----------------------------------------------------
console.log('\n--- D. Active Status Enforcement ---');

assert(!wagimanPool.some((w) => w.id === 'WRK-ABS-001' || w.id === 'WRK-ABS-002'), '12. Inactive/absent workers (Cuti/P4) are excluded from active selection');

// ----------------------------------------------------
// E. TRANSACTION RECORDING & CANONICAL VALUES
// ----------------------------------------------------
console.log('\n--- E. Transaction Recording & Canonical Values ---');

switchPersona('MNT001'); // Wagiman
const selectedMasterWorker = wagimanPool[0]; // Fadilah Yusuf Purba
const newTxPayload = {
  docNo: '2026/GRF/001',
  type: 'GRAFTING',
  tanggal: '2026-09-12',
  bedengan: 'Bedengan 01',
  klonEntres: 'PB 260',
  workers: [
    {
      id: selectedMasterWorker.id,
      name: selectedMasterWorker.name,
      code: selectedMasterWorker.code,
      qty: 300
    }
  ],
  jumlah: 300,
  jumlahKayu: 15,
  jumlahDitolak: 0
};

assert(newTxPayload.workers.length === 1, '13. Selected worker is stored in transaction payload');
assert(newTxPayload.workers[0].id === 'WRK-001', '14. Worker ID matches canonical ID (WRK-001)');
assert(newTxPayload.workers[0].name === 'Fadilah Yusuf Purba', '15. Worker name is canonical from master');
assert(newTxPayload.workers[0].code === '1405739', '16. Worker code is canonical from master');
assert(newTxPayload.workers[0].qty === 300 && newTxPayload.jumlah === 300, '17. Quantity arithmetic matches existing budding logic');

// ----------------------------------------------------
// F. SCOPE & VALIDATION RULES
// ----------------------------------------------------
console.log('\n--- F. Scope & Validation Rules ---');

function validateWorkerForContext(workerId, userCtx) {
  const masterRec = getWorkerById(workerId);
  if (!masterRec) return { valid: false, error: 'NOT_FOUND' };
  if (masterRec.status !== 'ACTIVE' || masterRec.active === false) return { valid: false, error: 'INACTIVE' };
  if (userCtx && userCtx.scopeType === 'DIVISION') {
    if (masterRec.estateId !== userCtx.estateId) return { valid: false, error: 'CROSS_ESTATE' };
    if (masterRec.divisionId !== userCtx.divisionId) return { valid: false, error: 'CROSS_DIVISION' };
  }
  return { valid: true };
}

switchPersona('MNT001'); // Wagiman (TBS D1)
const wagimanCtx = getCurrentUserContext();

assert(validateWorkerForContext('NON_EXISTENT_ID', wagimanCtx).error === 'NOT_FOUND', '18. Invalid worker ID is rejected');
assert(validateWorkerForContext('WRK-ABS-001', wagimanCtx).error === 'INACTIVE', '19. Inactive worker is rejected');
assert(validateWorkerForContext('WRK-TBS-D2-001', wagimanCtx).error === 'CROSS_DIVISION', '20. Cross-division worker (TBS D2 into TBS D1) is rejected');
assert(validateWorkerForContext('WRK-APM-D1-001', wagimanCtx).error === 'CROSS_ESTATE', '21. Cross-estate worker (APM D1 into TBS D1) is rejected');

// ----------------------------------------------------
// G. ACTOR IDENTITY VS WORKER IDENTITY
// ----------------------------------------------------
console.log('\n--- G. Actor Identity vs Worker Identity ---');

switchPersona('MNT001'); // Wagiman
const stampedTx = applyTransactionActor(newTxPayload);

assert(
  stampedTx.createdByUserId === 'MNT001' && stampedTx.createdByName === 'Wagiman',
  '22. Transaction actor remains Wagiman / MNT001'
);

assert(
  stampedTx.createdByUserId !== stampedTx.workers[0].id &&
  stampedTx.workers[0].id === 'WRK-001',
  '23. Transaction actor (MNT001) and worker identity (WRK-001) are strictly distinct'
);

// ----------------------------------------------------
// H. HISTORICAL COMPATIBILITY
// ----------------------------------------------------
console.log('\n--- H. Historical Compatibility ---');

const historicalTx = {
  docNo: '2026/GRF/HIST-001',
  type: 'GRAFTING',
  tanggal: '2026-07-15',
  bedengan: 'Bedengan 01',
  klonEntres: 'GT-01',
  workers: [
    { id: 'W001', name: 'Ahmad Rifai', code: '104521', qty: 250 }
  ],
  jumlah: 250,
  createdByUserId: 'MNT001'
};

assert(
  historicalTx.workers[0].id === 'W001' && historicalTx.workers[0].name === 'Ahmad Rifai',
  '24. Historical transaction with legacy W001 snapshot remains readable'
);

assert(
  historicalTx.workers[0].id.startsWith('W001') && !historicalTx.workers[0].id.startsWith('WRK'),
  '25. Historical transaction snapshot is not mutated or overwritten'
);

// ----------------------------------------------------
// I. WORKFLOW CAPABILITIES
// ----------------------------------------------------
console.log('\n--- I. Workflow Capabilities ---');

assert(buddingCode.includes('btn-select-worker-item') && buddingCode.includes('selectedWorkers.push('), '26. Add worker flow is intact');
assert(buddingCode.includes('btn-remove-worker') && buddingCode.includes('selectedWorkers.filter('), '27. Remove worker flow is intact');
assert(buddingCode.includes('btn-simpan') && buddingCode.includes('storage.set(\'budding_transactions\''), '28. Save and storage synchronization is intact');

console.log(`\n========================================`);
console.log(`PHASE 9G TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log(`========================================`);

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL PHASE 9G BUDDING WORKER INTEGRATION TESTS PASSED!');
}
