// Mock global localStorage for Node environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

import { DEMO_PERSONAS, getDemoPersonas, getDemoPersonaByCode } from './js/data/demo-personas.js';
import { session } from './js/core/session.js';
import { getCurrentUserContext, resolveUserContext, ROLES } from './js/core/user-context.js';
import { storage } from './js/core/storage.js';
import { matchActor, getMantriTodayTransactions } from './js/modules/verification/mantri-confirmation-service.js';
import { createDederanInspection, saveDederanTransaction, syncDederanIndukDocuments, DEDERAN_STORAGE_KEYS } from './js/modules/seeding/dederan-manager.js';

let passedCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('=== TEST SUITE: SINGLE SOURCE OF TRUTH ACTIVE USER & PERSONA SWITCHER ===\n');

// ----------------------------------------------------
// 1. MASTER PERSONA REGISTRY INTEGRITY
// ----------------------------------------------------
console.log('--- 1. Master Persona Registry Integrity ---');
const allPersonas = getDemoPersonas();
assert(allPersonas.length === 14, `Master persona registry has exactly 14 personas (found: ${allPersonas.length})`);

const irwanInRegistry = allPersonas.find(p => p.name === 'Irwan Syah Putra' || p.code === '1405482');
assert(!irwanInRegistry, 'Irwan Syah Putra & legacy code 1405482 are NOT in Master Persona Registry');

const wagiman = getDemoPersonaByCode('MNT001');
assert(wagiman && wagiman.name === 'Wagiman' && wagiman.estateId === 'EST-TBS', 'Wagiman is registered as MNT001 in EST-TBS');

const supriono = getDemoPersonaByCode('MNT002');
assert(supriono && supriono.name === 'Supriono' && supriono.estateId === 'EST-APM', 'Supriono is registered as MNT002 in EST-APM');

// ----------------------------------------------------
// 2. HIDDEN ROLE ENFORCEMENT
// ----------------------------------------------------
console.log('\n--- 2. Hidden Role Enforcement ---');
const HIDDEN_SWITCHER_ROLES = [ROLES.KTU, ROLES.TEKNIKER_I];
const visiblePersonas = getDemoPersonas().filter(p => !HIDDEN_SWITCHER_ROLES.includes(p.role));
assert(visiblePersonas.length === 10, `Visible switcher personas count is exactly 10 (found: ${visiblePersonas.length})`);
assert(!visiblePersonas.some(p => p.role === ROLES.KTU || p.role === ROLES.TEKNIKER_I), 'KTU and TEKNIKER_I are excluded from switcher UI');

// ----------------------------------------------------
// 3. SESSION ENFORCEMENT & RESOLUTION
// ----------------------------------------------------
console.log('\n--- 3. Session Enforcement & Resolution ---');
// Start session as Wagiman
session.start({ code: 'MNT001' });
const activeWagimanCtx = getCurrentUserContext();
assert(activeWagimanCtx.name === 'Wagiman', `Active user name is Wagiman (found: ${activeWagimanCtx.name})`);
assert(activeWagimanCtx.code === 'MNT001', `Active user code is MNT001 (found: ${activeWagimanCtx.code})`);
assert(activeWagimanCtx.estateId === 'EST-TBS', `Active user estate is EST-TBS (found: ${activeWagimanCtx.estateId})`);

// Switch session to Supriono
session.switchRole({ code: 'MNT002' });
const activeSuprionoCtx = getCurrentUserContext();
assert(activeSuprionoCtx.name === 'Supriono', `Active user switched to Supriono (found: ${activeSuprionoCtx.name})`);
assert(activeSuprionoCtx.code === 'MNT002', `Active user code is MNT002 (found: ${activeSuprionoCtx.code})`);
assert(activeSuprionoCtx.estateId === 'EST-APM', `Active user estate is EST-APM (found: ${activeSuprionoCtx.estateId})`);

// Attempt arbitrary identity payload (Irwan Syah Putra / 1405482)
session.start({ name: 'Irwan Syah Putra', code: '1405482' });
const rejectedIrwanCtx = getCurrentUserContext();
assert(rejectedIrwanCtx.name !== 'Irwan Syah Putra', `Arbitrary name Irwan Syah Putra is REJECTED by session.start (actual name: ${rejectedIrwanCtx.name})`);
assert(rejectedIrwanCtx.code !== '1405482', `Arbitrary code 1405482 is REJECTED by session.start (actual code: ${rejectedIrwanCtx.code})`);
assert(rejectedIrwanCtx.code === 'MNT001' && rejectedIrwanCtx.name === 'Wagiman', 'Arbitrary payload safely falls back to canonical registered Wagiman');


// ----------------------------------------------------
// 4. TRANSACTION ACTOR SNAPSHOT & ISOLATION
// ----------------------------------------------------
console.log('\n--- 4. Transaction Actor Snapshot & Isolation ---');

// Mock a parent receipt & deder induk for dederan transactions
storage.set('receipt_transactions', [
  {
    docNo: 'RCP-20261008-001',
    jenis: 'Benih / Biji Kelatak',
    tanggal: '08/10/2026',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    qty: 5000,
    klon: 'GT 1'
  }
]);

// Satisfy attendance gate for Wagiman (supervisor + worker presensi datang)
const todayDateIso = '2026-10-08';
storage.set('attendance_transactions', [
  {
    date: todayDateIso,
    userId: 'MNT001',
    code: 'MNT001',
    name: 'Wagiman',
    type: 'SUPERVISOR',
    role: 'MANTRI_TANAMAN',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    attendanceType: 'DATANG',
    time: '07:00:00',
    status: 'PRESENT'
  },
  {
    date: todayDateIso,
    supervisorId: 'MNT001',
    workerId: 'W001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    attendanceType: 'DATANG',
    type: 'WORKER',
    status: 'PRESENT'
  }
]);

// Switch session back to Wagiman
session.start({ code: 'MNT001' });
const wagimanUser = getCurrentUserContext();

// Sync induk docs from receipt
const indukDocs = syncDederanIndukDocuments();
const parentDocNo = indukDocs[0]?.docNo;

// Create Dederan Transaction as Wagiman
const dederTxWagiman = saveDederanTransaction({
  parentDederIndukDocNo: parentDocNo,
  bedenganCode: 'BDG-TEST-WAGIMAN',
  jumlahDeder: 1000,
  tanggalDeder: '08/10/2026'
});
assert(dederTxWagiman.recordedBy === 'Wagiman', `Dederan transaction recordedBy is Wagiman (found: ${dederTxWagiman.recordedBy})`);
assert(dederTxWagiman.actorName === 'Wagiman', `Dederan transaction actorName is Wagiman (found: ${dederTxWagiman.actorName})`);

// Create Dederan Inspection as Wagiman
const inspResultWagiman = createDederanInspection({
  dederanTxDocNo: dederTxWagiman.docNo,
  jumlahDiperiksa: 500,
  jumlahBerhasil: 450,
  tanggalPemeriksaan: '08/10/2026'
});
const inspWagiman = inspResultWagiman.inspection;
assert(inspWagiman.inspectorName === 'Wagiman', `Inspection inspectorName is Wagiman (found: ${inspWagiman.inspectorName})`);
assert(inspWagiman.inspectorCode === 'MNT001', `Inspection inspectorCode is MNT001 (found: ${inspWagiman.inspectorCode})`);

// Verify GAP-1 actor matching
assert(matchActor(inspWagiman, wagimanUser) === true, 'matchActor for Wagiman inspecting Wagiman tx is TRUE');
assert(matchActor(inspWagiman, activeSuprionoCtx) === false, 'matchActor for Supriono inspecting Wagiman tx is FALSE (Isolated)');

// Switch session to Supriono and verify isolation
session.start({ code: 'MNT002' });
const suprionoUser = getCurrentUserContext();
assert(matchActor(inspWagiman, suprionoUser) === false, 'matchActor under active Supriono session is FALSE for Wagiman tx');

// ----------------------------------------------------
// 5. HISTORICAL IRWAN TRANSACTION PROTECTION
// ----------------------------------------------------
console.log('\n--- 5. Historical Irwan Transaction Protection ---');
const historicalIrwanTx = {
  id: 'DED-INS-HISTORICAL-IRWAN',
  docNo: 'DINSP-20261008-001',
  inspectorName: 'Irwan Syah Putra',
  tanggalPemeriksaan: '08/10/2026',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

assert(historicalIrwanTx.inspectorName === 'Irwan Syah Putra', 'Historical transaction owner is intact as Irwan Syah Putra');
assert(matchActor(historicalIrwanTx, wagimanUser) === false, 'matchActor under Wagiman session rejects historical Irwan tx (GAP-1 strictly enforced)');
assert(matchActor(historicalIrwanTx, suprionoUser) === false, 'matchActor under Supriono session rejects historical Irwan tx');

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log(`\n========================================`);
console.log(`TEST RESULT: ${passedCount} / ${totalCount} PASSED`);
console.log(`========================================`);

if (passedCount === totalCount) {
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
} else {
  console.error('💥 SOME TESTS FAILED!');
  process.exit(1);
}
