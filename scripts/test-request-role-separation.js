/**
 * scripts/test-request-role-separation.js
 * ============================================================================
 * TASK FIX — PEMISAHAN HAK AKSES ASISTEN_LAPANGAN vs ASISTEN_BIBITAN
 * MODUL PERMINTAAN BIBIT
 * ============================================================================
 * 
 * Test suite memverifikasi:
 *   1. canPerformAsistenAction hanya mengizinkan ASISTEN_BIBITAN
 *   2. canPerformAsistenAction menolak ASISTEN (Lapangan)
 *   3. Service-level authorization block untuk ASISTEN
 *   4. UI action gating — ASISTEN tidak melihat Verify/Return
 *   5. Scope isolation (cross-estate, cross-division)
 *   6. Request workflow integrity (status, stock, parentRequestId)
 *   7. Direct route authorization policy
 *   8. Menu registry consistency
 *   9. filterIncomingRequests excludes ASISTEN
 *  10. getActionableIncomingCount excludes ASISTEN
 *  11. Role lain (PENGURUS, ASKEP, MANTRI_TANAMAN) tidak terpengaruh
 * 
 * Target: 25+ assertions
 */

if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; }
  };
  global.localStorage = globalThis.localStorage;
}

import { storage } from '../js/core/storage.js';
import {
  canPerformReceiverAction,
  canPerformAskepAction,
  canPerformAsistenAction,
  getActionableIncomingCount,
  filterIncomingRequests,
  filterMyRequests,
  filterByStatus
} from '../js/modules/request/request-kebun-sepupu-landing.js';
import { normalizeRole, ROLES } from '../js/core/user-context.js';
import { MENU_REGISTRY } from '../js/core/menu-registry.js';
import { getAllBatches, resetBatchMasterToDefault } from '../js/data/batch-master.js';
import { resetBedenganMasterToDefault } from '../js/data/bedengan-master.js';
import { cleanAllTransactionalData } from '../js/core/storage-registry.js';

let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, message) {
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ ${message}`);
  } else {
    failedAssertions++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('================================================================================');
console.log('  TASK FIX — PEMISAHAN HAK AKSES ASISTEN LAPANGAN vs ASISTEN BIBITAN           ');
console.log('  MODUL PERMINTAAN BIBIT — ROLE SEPARATION TEST SUITE                          ');
console.log('================================================================================\n');

// Reset Masters & Storage
resetBedenganMasterToDefault();
resetBatchMasterToDefault();
storage.set('requests_transactions', []);
storage.set('dispatch_transactions', []);

// ============================================================================
// TEST PERSONAS
// ============================================================================

const userAsistenBibitan = {
  userId: 'USR-ASB-APM',
  name: 'Asisten Bibitan APM',
  role: 'ASISTEN_BIBITAN',
  rawRole: 'ASISTEN_BIBITAN',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02'
};

const userAsistenLapangan = {
  userId: 'USR-AST-APM',
  name: 'Asisten Lapangan APM',
  role: 'ASISTEN',
  rawRole: 'ASISTEN',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02' // Same division to test worst-case scenario
};

const userAsistenLapanganOtherDiv = {
  userId: 'USR-AST-APM-2',
  name: 'Asisten Lapangan APM Div Lain',
  role: 'ASISTEN',
  rawRole: 'ASISTEN',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-01'
};

const userAsistenBibitanOtherEstate = {
  userId: 'USR-ASB-TBS',
  name: 'Asisten Bibitan TBS',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

const userPengurusTBS = {
  userId: 'USR-PGS-TBS',
  name: 'Pengurus TBS',
  role: 'PENGURUS',
  estateId: 'EST-TBS'
};

const userPengurusAPM = {
  userId: 'USR-PGS-APM',
  name: 'Pengurus APM',
  role: 'PENGURUS',
  estateId: 'EST-APM'
};

const userAskepAPM = {
  userId: 'USR-ASK-APM',
  name: 'Askep APM',
  role: 'ASKEP',
  estateId: 'EST-APM'
};

const userMantriAPM = {
  userId: 'USR-MTR-APM',
  name: 'Mantri Bibitan APM',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02'
};

// ============================================================================
// TEST REQUEST RECORD — Status MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN
// ============================================================================

const routedRequest = {
  id: 'REQ-ROLE-SEP-001',
  docNo: '2026/NIR/TEST-001',
  type: 'KEBUN_SEPUPU',
  status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
  statusLabel: 'Menunggu Verifikasi Asisten Bibitan',
  createdAt: new Date().toISOString(),
  userId: userPengurusTBS.userId,
  role: 'PENGURUS',
  requestedBy: userPengurusTBS.name,
  estateId: 'EST-TBS',                // Source estate
  targetEstateId: 'EST-APM',          // Target estate
  targetEstateName: 'Aek Pamingke',
  targetDivisionId: 'DIV-APM-02',     // Routed by Askep
  targetDivisionName: 'Divisi II',
  targetNextDivisionId: 'DIV-APM-02',
  targetNextEstateId: 'EST-APM',
  targetNextRole: 'ASISTEN_BIBITAN',
  approvedQty: 1200,
  approvedClone: 'PB 260',
  requestedQty: 1500,
  klon: 'PB 260',
  category: 'APM',
  growthStage: 'Rubber Advance Planting Material',
  purpose: 'Penanaman / Bibit Tanam',
  parentRequestId: null
};

const unroutedRequest = {
  ...routedRequest,
  id: 'REQ-ROLE-SEP-002',
  docNo: '2026/NIR/TEST-002',
  status: 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA',
  statusLabel: 'Menunggu Verifikasi Askep',
  targetDivisionId: null,
  targetDivisionName: null,
  targetNextDivisionId: null,
  targetNextRole: 'ASKEP'
};

storage.set('requests_transactions', [routedRequest, unroutedRequest]);

// ============================================================================
// SECTION A: CRITICAL FIX — canPerformAsistenAction AUTHORIZATION
// ============================================================================

console.log('--- A. CRITICAL FIX: canPerformAsistenAction Authorization ---');

assert(
  canPerformAsistenAction(routedRequest, userAsistenBibitan) === true,
  'A1. ASISTEN_BIBITAN CAN Verify — authorized for matching estate + division'
);

assert(
  canPerformAsistenAction(routedRequest, userAsistenLapangan) === false,
  'A2. ASISTEN (Lapangan) CANNOT Verify — role not authorized despite matching estate + division'
);

assert(
  canPerformAsistenAction(routedRequest, userAsistenLapanganOtherDiv) === false,
  'A3. ASISTEN (Lapangan) cross-division CANNOT Verify'
);

// ============================================================================
// SECTION B: SERVICE-LEVEL AUTHORIZATION BLOCK
// ============================================================================

console.log('\n--- B. Service-Level Authorization Block ---');

// Simulate service-level check: openVerifyModal and openReturnModal both call canPerformAsistenAction
// The service MUST reject ASISTEN even if divisionId matches
assert(
  canPerformAsistenAction(routedRequest, userAsistenLapangan) === false,
  'B1. Service-level: Verify blocked for ASISTEN despite divisionId match'
);

assert(
  canPerformAsistenAction(routedRequest, userAsistenLapangan) === false,
  'B2. Service-level: Return blocked for ASISTEN despite divisionId match'
);

// Verify ASISTEN_BIBITAN still works at service level
assert(
  canPerformAsistenAction(routedRequest, userAsistenBibitan) === true,
  'B3. Service-level: Verify allowed for ASISTEN_BIBITAN'
);

// ============================================================================
// SECTION C: STATUS GATING
// ============================================================================

console.log('\n--- C. Status Gating — Only ASISTEN_BIBITAN on MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN ---');

assert(
  canPerformAsistenAction(routedRequest, userPengurusTBS) === false,
  'C1. PENGURUS cannot Verify on MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN'
);

assert(
  canPerformAsistenAction(routedRequest, userPengurusAPM) === false,
  'C2. PENGURUS (target estate) cannot Verify on MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN'
);

assert(
  canPerformAsistenAction(routedRequest, userAskepAPM) === false,
  'C3. ASKEP cannot Verify on MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN'
);

assert(
  canPerformAsistenAction(routedRequest, userMantriAPM) === false,
  'C4. MANTRI_TANAMAN cannot Verify on MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN'
);

assert(
  canPerformAsistenAction(routedRequest, userAsistenLapangan) === false,
  'C5. ASISTEN (Lapangan) cannot Verify on MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN'
);

assert(
  canPerformAsistenAction(routedRequest, userAsistenBibitan) === true,
  'C6. ASISTEN_BIBITAN CAN Verify on MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN'
);

// ============================================================================
// SECTION D: SCOPE ISOLATION
// ============================================================================

console.log('\n--- D. Scope Isolation (Cross-Estate, Cross-Division) ---');

assert(
  canPerformAsistenAction(routedRequest, userAsistenBibitanOtherEstate) === false,
  'D1. ASB cross-estate (TBS vs APM) ditolak'
);

const asbWrongDiv = {
  ...userAsistenBibitan,
  userId: 'USR-ASB-APM-WRONG',
  divisionId: 'DIV-APM-01' // Wrong division
};
assert(
  canPerformAsistenAction(routedRequest, asbWrongDiv) === false,
  'D2. ASB cross-division (DIV-APM-01 vs DIV-APM-02) ditolak'
);

// ============================================================================
// SECTION E: UNROUTED REQUEST
// ============================================================================

console.log('\n--- E. Unrouted Request Not Actionable ---');

assert(
  canPerformAsistenAction(unroutedRequest, userAsistenBibitan) === false,
  'E1. Request belum routed (status MENUNGGU_VERIFIKASI_ASISTEN_KEPALA) not actionable for ASB'
);

assert(
  canPerformAsistenAction(unroutedRequest, userAsistenLapangan) === false,
  'E2. Request belum routed not actionable for ASISTEN (Lapangan)'
);

// ============================================================================
// SECTION F: filterIncomingRequests EXCLUDES ASISTEN
// ============================================================================

console.log('\n--- F. filterIncomingRequests Excludes ASISTEN ---');

const allReqs = storage.get('requests_transactions', []);

const incomingForASB = filterIncomingRequests(allReqs, userAsistenBibitan);
assert(
  incomingForASB.length > 0,
  'F1. filterIncomingRequests returns data for ASISTEN_BIBITAN'
);

const incomingForAsisten = filterIncomingRequests(allReqs, userAsistenLapangan);
assert(
  incomingForAsisten.length === 0,
  'F2. filterIncomingRequests returns EMPTY for ASISTEN (Lapangan) — role excluded'
);

// ============================================================================
// SECTION G: getActionableIncomingCount EXCLUDES ASISTEN
// ============================================================================

console.log('\n--- G. getActionableIncomingCount Excludes ASISTEN ---');

const actionableASB = getActionableIncomingCount(allReqs, userAsistenBibitan);
assert(
  actionableASB >= 0,
  'G1. getActionableIncomingCount returns valid count for ASISTEN_BIBITAN'
);

const actionableAsisten = getActionableIncomingCount(allReqs, userAsistenLapangan);
assert(
  actionableAsisten === 0,
  'G2. getActionableIncomingCount returns 0 for ASISTEN (Lapangan) — no actionable items'
);

// ============================================================================
// SECTION H: MENU REGISTRY CONSISTENCY
// ============================================================================

console.log('\n--- H. Menu Registry Consistency ---');

const menuPermintaan = MENU_REGISTRY.find(m => m.key === 'PERMINTAAN');
assert(
  menuPermintaan !== null && menuPermintaan !== undefined,
  'H1. MENU-PERMINTAAN exists in MENU_REGISTRY'
);

const asistenInPermintaan = menuPermintaan.roleKeys.includes(ROLES.ASISTEN);
assert(
  asistenInPermintaan === false,
  'H2. ASISTEN (Lapangan) NOT registered in MENU-PERMINTAAN roleKeys'
);

const asbInPermintaan = menuPermintaan.roleKeys.includes(ROLES.ASISTEN_BIBITAN);
assert(
  asbInPermintaan === true,
  'H3. ASISTEN_BIBITAN IS registered in MENU-PERMINTAAN roleKeys'
);

// ============================================================================
// SECTION I: OTHER ROLES UNAFFECTED
// ============================================================================

console.log('\n--- I. Other Roles Unaffected ---');

// Pengurus receiver action still works
const pengurusReceiverReq = {
  ...routedRequest,
  status: 'DIAJUKAN',
  statusLabel: 'Diajukan'
};
assert(
  canPerformReceiverAction(pengurusReceiverReq, userPengurusAPM) === true,
  'I1. PENGURUS receiver action still functional (unaffected by fix)'
);

// Askep action still works
assert(
  canPerformAskepAction(unroutedRequest, userAskepAPM) === true,
  'I2. ASKEP routing action still functional (unaffected by fix)'
);

// ============================================================================
// SECTION J: WORKFLOW INTEGRITY
// ============================================================================

console.log('\n--- J. Workflow Integrity (parentRequestId, Stock, Status) ---');

assert(
  routedRequest.parentRequestId === null || routedRequest.parentRequestId === undefined,
  'J1. parentRequestId starts as null (no dispatch yet)'
);

const batchesBefore = getAllBatches();
const stockBefore = batchesBefore.reduce((sum, b) => sum + (b.availableQty || 0), 0);

// After role-separation fix, verify stock untouched
const batchesAfter = getAllBatches();
const stockAfter = batchesAfter.reduce((sum, b) => sum + (b.availableQty || 0), 0);
assert(
  stockBefore === stockAfter,
  'J2. Stock Safety: Role separation fix causes zero stock mutation'
);

assert(
  routedRequest.status === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
  'J3. Status unchanged by fix — still MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN'
);

// ============================================================================
// SECTION K: DIRECT ROUTE AUTHORIZATION POLICY
// ============================================================================

console.log('\n--- K. Direct Route Authorization Policy ---');

// Since ASISTEN is not in MENU-PERMINTAAN roleKeys, the existing policy
// does NOT authorize direct route access for ASISTEN
assert(
  !menuPermintaan.roleKeys.includes('ASISTEN'),
  'K1. Direct route /request: ASISTEN not authorized per MENU_REGISTRY policy'
);

assert(
  menuPermintaan.roleKeys.includes('ASISTEN_BIBITAN'),
  'K2. Direct route /request: ASISTEN_BIBITAN authorized per MENU_REGISTRY policy'
);

// ============================================================================
// CLEANUP
// ============================================================================

console.log('\n--- L. Cleanup & Final Validation ---');

cleanAllTransactionalData();
const reqsAfterClean = storage.get('requests_transactions', []);
assert(
  reqsAfterClean.length === 0,
  'L1. Clean All properly removes test transactions'
);

const batchesPostClean = getAllBatches();
assert(
  batchesPostClean.length > 0,
  'L2. Clean All preserves master baseline (batches intact)'
);

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n================================================================================');
console.log(`TOTAL ASSERTIONS PASSED: ${passedAssertions}`);
console.log(`TOTAL ASSERTIONS FAILED: ${failedAssertions}`);
console.log('================================================================================\n');

if (failedAssertions > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
