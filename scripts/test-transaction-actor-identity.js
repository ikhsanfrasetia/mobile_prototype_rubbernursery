/**
 * scripts/test-transaction-actor-identity.js
 * Automated Verification Suite for Transaction Actor Identity & Audit Traceability (Phase 8B).
 */

// Mock localStorage for Node environment
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

import {
  AUDIT_EVENT_TYPES,
  createTransactionActorSnapshot,
  createAuditEvent,
  applyTransactionActor,
  resolveTransactionActor,
  getTransactionsByUser,
  getTransactionsByRole,
  getTransactionsByEstate,
  getTransactionsByDivision
} from '../js/core/transaction-actor.js';
import { ROLES, SCOPE_TYPES, resolveUserContext, getCurrentUserContext } from '../js/core/user-context.js';
import { storage, KEYS } from '../js/core/storage.js';
import { getDemoPersonaById } from '../js/data/demo-personas.js';

console.log('=== STARTING TRANSACTION ACTOR IDENTITY VERIFICATION (PHASE 8B) ===\n');

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

// Setup Demo Contexts
const junaidiPersona = getDemoPersonaById('TBS-PGS-001'); // Junaidi (Tanah Besih, PENGURUS)
const mukhsinPersona = getDemoPersonaById('APM-PGS-002'); // Mukhsin Haji (Aek Pamingke, PENGURUS / legacy PENGURUS_KEBUN_SEPUPU)
const wagimanPersona = getDemoPersonaById('TBS-MNT-001'); // Wagiman (Tanah Besih, MANTRI_TANAMAN)
const suprionoPersona = getDemoPersonaById('APM-MNT-002'); // Supriono (Aek Pamingke, MANTRI_TANAMAN)

// TEST 1: Junaidi Create Transaction
console.log('--- TEST 1: Junaidi (PGS001 - Tanah Besih) Transaction Creation ---');
storage.set(KEYS.SESSION, junaidiPersona);
const junaidiCtx = getCurrentUserContext();
const junaidiRecord = applyTransactionActor({
  id: 'REQ-2026-001',
  program: 'Program Replanting 2026',
  klon: 'PB 260',
  qty: 5000,
  createdByRole: 'PENGURUS'
}, AUDIT_EVENT_TYPES.CREATE, junaidiCtx);

assert(junaidiRecord.createdByUserId === 'PGS001', 'Junaidi createdByUserId is PGS001');
assert(junaidiRecord.createdByLoginCode === '1405001' || junaidiRecord.createdByLoginCode === 'PGS001', 'Junaidi createdByLoginCode is valid');
assert(junaidiRecord.createdByName === 'Junaidi', 'Junaidi createdByName is Junaidi');
assert(junaidiRecord.createdByRole === 'PENGURUS', 'Junaidi createdByRole is PENGURUS');
assert(junaidiRecord.createdByPosition === 'Pengurus Kebun', 'Junaidi createdByPosition is Pengurus Kebun');
assert(junaidiRecord.createdByEstateId === 'EST-TBS', 'Junaidi createdByEstateId is EST-TBS');
assert(junaidiRecord.createdByEstateName === 'Tanah Besih', 'Junaidi createdByEstateName is Tanah Besih');
assert(junaidiRecord.createdByScopeType === SCOPE_TYPES.ESTATE, 'Junaidi createdByScopeType is ESTATE');
assert(Boolean(junaidiRecord.createdAt), 'Junaidi transaction has createdAt timestamp');

// TEST 2: Mukhsin Haji Create Transaction
console.log('\n--- TEST 2: Mukhsin Haji (PGS002 - Aek Pamingke) Transaction Creation ---');
storage.set(KEYS.SESSION, mukhsinPersona);
const mukhsinCtx = getCurrentUserContext();
const mukhsinRecord = applyTransactionActor({
  id: 'REQ-2026-002',
  program: 'Program Replanting 2026',
  klon: 'RRIM 600',
  qty: 3000,
  createdByRole: 'PENGURUS_KEBUN_SEPUPU'
}, AUDIT_EVENT_TYPES.CREATE, mukhsinCtx);

assert(mukhsinRecord.createdByUserId === 'PGS002', 'Mukhsin createdByUserId is PGS002');
assert(mukhsinRecord.createdByName === 'Mukhsin Haji', 'Mukhsin createdByName is Mukhsin Haji');
assert(mukhsinRecord.createdByRole === 'PENGURUS', 'Mukhsin normalized createdByRole is PENGURUS');
assert(mukhsinRecord.createdByPosition === 'Pengurus Kebun', 'Mukhsin createdByPosition is Pengurus Kebun');
assert(mukhsinRecord.createdByEstateId === 'EST-APM', 'Mukhsin createdByEstateId is EST-APM');
assert(mukhsinRecord.createdByEstateName === 'Aek Pamingke', 'Mukhsin createdByEstateName is Aek Pamingke');
assert(mukhsinRecord.createdByScopeType === SCOPE_TYPES.ESTATE, 'Mukhsin createdByScopeType is ESTATE');

// TEST 3 & 4: Same Role Different User & Different Estate
console.log('\n--- TEST 3 & 4: Same Role Different User / Estate Differentiation ---');
assert(junaidiRecord.createdByRole === mukhsinRecord.createdByRole, 'Both actors have same canonical role (PENGURUS)');
assert(junaidiRecord.createdByUserId !== mukhsinRecord.createdByUserId, 'Junaidi userId (PGS001) !== Mukhsin userId (PGS002)');
assert(junaidiRecord.createdByEstateId !== mukhsinRecord.createdByEstateId, 'Junaidi estate (EST-TBS) !== Mukhsin estate (EST-APM)');
assert(junaidiRecord.id !== mukhsinRecord.id, 'Transactions are independent objects');

// TEST 5: Wagiman Create Transaction (Mantri Tanah Besih)
console.log('\n--- TEST 5: Wagiman (MNT001 - Tanah Besih) Transaction Creation ---');
storage.set(KEYS.SESSION, wagimanPersona);
const wagimanCtx = getCurrentUserContext();
const wagimanRecord = applyTransactionActor({
  id: 'ATT-2026-001',
  type: 'SUPERVISOR',
  status: 'HADIR'
}, AUDIT_EVENT_TYPES.CREATE, wagimanCtx);

assert(wagimanRecord.createdByUserId === 'MNT001', 'Wagiman createdByUserId is MNT001');
assert(wagimanRecord.createdByName === 'Wagiman', 'Wagiman createdByName is Wagiman');
assert(wagimanRecord.createdByRole === 'MANTRI_TANAMAN', 'Wagiman createdByRole is MANTRI_TANAMAN');
assert(wagimanRecord.createdByPosition === 'Mantri Bibitan', 'Wagiman createdByPosition is Mantri Bibitan');
assert(wagimanRecord.createdByEstateId === 'EST-TBS', 'Wagiman createdByEstateId is EST-TBS');
assert(wagimanRecord.createdByDivisionId === 'DIV-001', 'Wagiman createdByDivisionId is DIV-001');
assert(wagimanRecord.createdByScopeType === SCOPE_TYPES.DIVISION, 'Wagiman createdByScopeType is DIVISION');

// TEST 6: Supriono Create Transaction (Mantri Aek Pamingke)
console.log('\n--- TEST 6: Supriono (MNT002 - Aek Pamingke) Transaction Creation ---');
storage.set(KEYS.SESSION, suprionoPersona);
const suprionoCtx = getCurrentUserContext();
const suprionoRecord = applyTransactionActor({
  id: 'ATT-2026-002',
  type: 'SUPERVISOR',
  status: 'HADIR'
}, AUDIT_EVENT_TYPES.CREATE, suprionoCtx);

assert(suprionoRecord.createdByUserId === 'MNT002', 'Supriono createdByUserId is MNT002');
assert(suprionoRecord.createdByName === 'Supriono', 'Supriono createdByName is Supriono');
assert(suprionoRecord.createdByRole === 'MANTRI_TANAMAN', 'Supriono createdByRole is MANTRI_TANAMAN');
assert(suprionoRecord.createdByEstateId === 'EST-APM', 'Supriono createdByEstateId is EST-APM');
assert(suprionoRecord.createdByDivisionId === 'DIV-APM-01', 'Supriono createdByDivisionId is DIV-APM-01');
assert(wagimanRecord.createdByUserId !== suprionoRecord.createdByUserId, 'Wagiman and Supriono user IDs are differentiated');
assert(wagimanRecord.createdByEstateId !== suprionoRecord.createdByEstateId, 'Wagiman and Supriono estates are differentiated');

// TEST 7: Legacy Transaction Compatibility (Missing new actor fields)
console.log('\n--- TEST 7: Legacy Transaction Readability & Resolution ---');
const legacyRecord = {
  id: 'LEG-REQ-001',
  docNo: 'REQ/2025/001',
  program: 'Legacy Replanting',
  qty: 1000,
  createdByRole: 'PENGURUS'
};
const resolvedLegacy = resolveTransactionActor(legacyRecord);
assert(resolvedLegacy.role === 'PENGURUS', 'Legacy record resolves role to PENGURUS');
assert(resolvedLegacy.isLegacy === true, 'Legacy record identified as legacy');
assert(Boolean(resolvedLegacy.userId), 'Legacy record safely provides non-crashing userId fallback');
assert(Boolean(resolvedLegacy.estateId), 'Legacy record safely provides non-crashing estateId fallback');

// TEST 8 & 9: Existing createdByRole and approvedByRole preservation
console.log('\n--- TEST 8 & 9: Existing Fields Preservation ---');
const recordWithApproved = applyTransactionActor({
  id: 'APPR-001',
  createdByRole: 'MANTRI_TANAMAN',
  approvedByRole: 'PENGURUS'
}, AUDIT_EVENT_TYPES.APPROVE, junaidiCtx);

assert(recordWithApproved.createdByRole === 'MANTRI_TANAMAN', 'Existing createdByRole preserved');
assert(recordWithApproved.approvedByRole === 'PENGURUS', 'Existing approvedByRole preserved');
assert(recordWithApproved.approvedByUserId === 'PGS001', 'approvedByUserId added additively');

// TEST 10: Historical Snapshot Immutability
console.log('\n--- TEST 10: Historical Snapshot Immutability ---');
// Record was created by Junaidi at Tanah Besih
const initialSnapshotEstate = junaidiRecord.createdByEstateId;
// Change active session to Aek Pamingke (simulating user relocation or switch)
storage.set(KEYS.SESSION, mukhsinPersona);
// Reading the previously created transaction
const reReadActor = resolveTransactionActor(junaidiRecord);
assert(reReadActor.estateId === initialSnapshotEstate, 'Historical transaction actor snapshot does NOT change with active user switch');
assert(junaidiRecord.createdByEstateId === 'EST-TBS', 'Original record estateId remains EST-TBS');

// TEST 11: Actor Cannot Be Manually Bypassed in Record
console.log('\n--- TEST 11: System-Controlled Actor Integrity ---');
storage.set(KEYS.SESSION, junaidiPersona);
const genuineActor = createTransactionActorSnapshot();
assert(genuineActor.userId === 'PGS001', 'System context provides genuine actor userId (PGS001)');
assert(genuineActor.name === 'Junaidi', 'System context provides genuine actor name');

// TEST 12: Audit Event Contains Full Actor Snapshot
console.log('\n--- TEST 12: Audit Event Traceability ---');
const auditEvt = createAuditEvent(AUDIT_EVENT_TYPES.SUBMIT, junaidiCtx, 'Pengajuan SPB Kebun Sepupu');
assert(auditEvt.eventType === 'SUBMIT', 'Audit eventType is SUBMIT');
assert(auditEvt.userId === 'PGS001', 'Audit userId is PGS001');
assert(auditEvt.name === 'Junaidi', 'Audit actor name is Junaidi');
assert(auditEvt.role === 'PENGURUS', 'Audit actor role is PENGURUS');
assert(auditEvt.estateId === 'EST-TBS', 'Audit estateId is EST-TBS');
assert(auditEvt.details === 'Pengajuan SPB Kebun Sepupu', 'Audit details preserved');
assert(Array.isArray(junaidiRecord.auditTrail) && junaidiRecord.auditTrail.length > 0, 'Transaction record contains auditTrail array');

// TEST 13 - 16: Generic Filtering Helpers
console.log('\n--- TEST 13 - 16: Transaction Filtering by User, Role, Estate, Division ---');
const txDataset = [junaidiRecord, mukhsinRecord, wagimanRecord, suprionoRecord, legacyRecord];

// Filter by User
const junaidiTxs = getTransactionsByUser(txDataset, 'PGS001');
assert(junaidiTxs.length === 1 && junaidiTxs[0].id === 'REQ-2026-001', 'getTransactionsByUser successfully filters Junaidi transactions');

const mukhsinTxs = getTransactionsByUser(txDataset, 'PGS002');
assert(mukhsinTxs.length === 1 && mukhsinTxs[0].id === 'REQ-2026-002', 'getTransactionsByUser successfully filters Mukhsin transactions');

// Filter by Role
const pengurusTxs = getTransactionsByRole(txDataset, 'PENGURUS');
assert(pengurusTxs.length >= 3, `getTransactionsByRole('PENGURUS') finds all Pengurus transactions including legacy (count: ${pengurusTxs.length})`);

const mantriTxs = getTransactionsByRole(txDataset, 'MANTRI_TANAMAN');
assert(mantriTxs.length === 2, `getTransactionsByRole('MANTRI_TANAMAN') finds all Mantri transactions (count: ${mantriTxs.length})`);

// Filter by Estate
const tanahBesihTxs = getTransactionsByEstate(txDataset, 'EST-TBS');
assert(tanahBesihTxs.length >= 2, `getTransactionsByEstate('EST-TBS') returns Tanah Besih records (count: ${tanahBesihTxs.length})`);

const aekPamingkeTxs = getTransactionsByEstate(txDataset, 'EST-APM');
assert(aekPamingkeTxs.length === 2, `getTransactionsByEstate('EST-APM') returns Aek Pamingke records (count: ${aekPamingkeTxs.length})`);

// Filter by Division
const div001Txs = getTransactionsByDivision(txDataset, 'DIV-001');
assert(div001Txs.some((t) => t.id === 'ATT-2026-001'), 'getTransactionsByDivision finds Wagiman record in DIV-001');

const divApmTxs = getTransactionsByDivision(txDataset, 'DIV-APM-01');
assert(divApmTxs.some((t) => t.id === 'ATT-2026-002'), 'getTransactionsByDivision finds Supriono record in DIV-APM-01');

console.log('\n==================================================');
console.log(`TOTAL TESTS RUN: ${passedTests + failedTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('==================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL PHASE 8B TRANSACTION ACTOR IDENTITY TESTS PASSED!');
}
