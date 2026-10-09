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
import { todayISO } from './js/core/utils.js';
import { matchActor, getMantriTodayTransactions } from './js/modules/verification/mantri-confirmation-service.js';
import { createDederanInspection, saveDederanTransaction, syncDederanIndukDocuments, DEDERAN_STORAGE_KEYS } from './js/modules/seeding/dederan-manager.js';
import { applyTransactionActor, AUDIT_EVENT_TYPES, getAuthorizedTransactions, canUserAccessTransaction, assertTransactionActorOrThrow } from './js/core/transaction-actor.js';
import { getMataEntresBalances } from './js/core/entres-inventory-service.js';
import { filterSelectionByScope } from './js/modules/selection/selection-manager.js';
import { getEligiblePindahSemaiSources, getAllInspectedDederanSources } from './js/modules/seeding/dederan-pindah-semai-adapter.js';

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
const todayDateIso = todayISO();
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
// 6. KEBUN ENTRES TRANSACTION ISOLATION (MENUNAS & TOPPING)
// ----------------------------------------------------
console.log('\n--- 6. Kebun Entres Transaction Isolation (Menunas & Topping) ---');

// Switch to Wagiman
session.start({ code: 'MNT001' });
const wagimanCtx = getCurrentUserContext();

// Wagiman creates Menunas & Topping
let wagimanMenunas = {
  docNo: '2026/BWGDTL/001',
  type: 'MENUNAS',
  kodePlot: 'Plot IA',
  namaKlon: 'IRCA331',
  tanggal: '2026-10-09',
  jumlahPohonDitunas: 150,
  mantri: wagimanCtx.name,
  actorName: wagimanCtx.name,
  actorCode: wagimanCtx.code,
  status: 'SUBMITTED',
  createdAt: new Date().toISOString()
};
wagimanMenunas = applyTransactionActor(wagimanMenunas, AUDIT_EVENT_TYPES.CREATE, wagimanCtx);

let wagimanTopping = {
  docNo: '2026/BWGDTL/002',
  type: 'TOPPING',
  kodePlot: 'Plot IA',
  namaKlon: 'IRCA331',
  tanggal: '2026-10-09',
  jumlahKayu: 50,
  jumlahPerisai: 400,
  mantri: wagimanCtx.name,
  actorName: wagimanCtx.name,
  actorCode: wagimanCtx.code,
  status: 'SUBMITTED',
  createdAt: new Date().toISOString()
};
wagimanTopping = applyTransactionActor(wagimanTopping, AUDIT_EVENT_TYPES.CREATE, wagimanCtx);

// Save to storage
storage.set('entres_menunas_transactions', [wagimanMenunas]);
storage.set('entres_topping_transactions', [wagimanTopping]);

// Verify Wagiman sees his own transactions
assert(matchActor(wagimanMenunas, wagimanCtx) === true, 'Wagiman can see his own Menunas transaction');
assert(matchActor(wagimanTopping, wagimanCtx) === true, 'Wagiman can see his own Topping transaction');

// Switch session to Supriono (MNT002, EST-APM)
session.switchRole({ code: 'MNT002' });
const suprionoCtx = getCurrentUserContext();

// Verify Supriono CANNOT see Wagiman's transactions (Isolated)
assert(matchActor(wagimanMenunas, suprionoCtx) === false, 'Supriono CANNOT see Wagiman Menunas transaction (ISOLATED)');
assert(matchActor(wagimanTopping, suprionoCtx) === false, 'Supriono CANNOT see Wagiman Topping transaction (ISOLATED)');

// Supriono creates his own Topping
let suprionoTopping = {
  docNo: '2026/BWGDTL/003',
  type: 'TOPPING',
  kodePlot: 'Plot IIA',
  namaKlon: 'PB260',
  tanggal: '2026-10-09',
  jumlahKayu: 80,
  jumlahPerisai: 640,
  mantri: suprionoCtx.name,
  actorName: suprionoCtx.name,
  actorCode: suprionoCtx.code,
  status: 'SUBMITTED',
  createdAt: new Date().toISOString()
};
suprionoTopping = applyTransactionActor(suprionoTopping, AUDIT_EVENT_TYPES.CREATE, suprionoCtx);

const currentToppings = storage.get('entres_topping_transactions', []);
storage.set('entres_topping_transactions', [...currentToppings, suprionoTopping]);

// Verify Supriono sees his own transaction
assert(matchActor(suprionoTopping, suprionoCtx) === true, 'Supriono can see his own Topping transaction');

// Switch back to Wagiman and verify Supriono's transaction is invisible to Wagiman
session.switchRole({ code: 'MNT001' });
const wagimanSwitchedBack = getCurrentUserContext();
assert(matchActor(suprionoTopping, wagimanSwitchedBack) === false, 'Wagiman CANNOT see Supriono Topping transaction (ISOLATED)');

// Verify list filtering simulation for Wagiman
const allStoredMenunas = storage.get('entres_menunas_transactions', []);
const allStoredToppings = storage.get('entres_topping_transactions', []);

const wagimanVisibleMenunas = allStoredMenunas.filter(t => matchActor(t, wagimanSwitchedBack));
const wagimanVisibleToppings = allStoredToppings.filter(t => matchActor(t, wagimanSwitchedBack));

assert(wagimanVisibleMenunas.length === 1 && wagimanVisibleMenunas[0].docNo === '2026/BWGDTL/001', 'Wagiman query returns exactly 1 Menunas transaction');
assert(wagimanVisibleToppings.length === 1 && wagimanVisibleToppings[0].docNo === '2026/BWGDTL/002', 'Wagiman query returns exactly 1 Topping transaction (Supriono excluded)');

// Verify list filtering simulation for Supriono
session.switchRole({ code: 'MNT002' });
const suprionoFinalCtx = getCurrentUserContext();
const suprionoVisibleMenunas = allStoredMenunas.filter(t => matchActor(t, suprionoFinalCtx));
const suprionoVisibleToppings = allStoredToppings.filter(t => matchActor(t, suprionoFinalCtx));

assert(suprionoVisibleMenunas.length === 0, 'Supriono query returns 0 Menunas transactions (Wagiman excluded)');
assert(suprionoVisibleToppings.length === 1 && suprionoVisibleToppings[0].docNo === '2026/BWGDTL/003', 'Supriono query returns exactly 1 Topping transaction (Wagiman excluded)');

// ----------------------------------------------------
// 7. KEBUN ENTRES STOCK (MATA ENTRES) ISOLATION
// ----------------------------------------------------
console.log('\n--- 7. Kebun Entres Stock (Mata Entres) Isolation ---');

// Supriono stock balance calculation
const suprionoBalances = getMataEntresBalances({ userContext: suprionoFinalCtx });
assert(suprionoBalances.length === 1, `Supriono sees exactly 1 Klon in stock (found: ${suprionoBalances.length})`);
assert(suprionoBalances[0]?.klonName === 'PB 260' || suprionoBalances[0]?.klonName === 'PB260', 'Supriono stock is PB 260');
assert(suprionoBalances[0]?.saldoMataEntres === 640, `Supriono saldo Mata Entres is 640 (found: ${suprionoBalances[0]?.saldoMataEntres})`);

// Switch back to Wagiman and check stock balance
session.switchRole({ code: 'MNT001' });
const wagimanFinalCtx = getCurrentUserContext();
const wagimanBalances = getMataEntresBalances({ userContext: wagimanFinalCtx });
assert(wagimanBalances.length === 1, `Wagiman sees exactly 1 Klon in stock (found: ${wagimanBalances.length})`);
assert(wagimanBalances[0]?.klonName === 'IRCA 331' || wagimanBalances[0]?.klonName === 'IRCA331', 'Wagiman stock is IRCA 331');
assert(wagimanBalances[0]?.saldoMataEntres === 400, `Wagiman saldo Mata Entres is 400 (found: ${wagimanBalances[0]?.saldoMataEntres})`);

// ----------------------------------------------------
// 8. GLOBAL TRANSACTION ISOLATION ACROSS ALL OPERATIONAL MODULES
// ----------------------------------------------------
console.log('\n--- 8. Global Cross-Module Transaction Isolation ---');

// Setup Mock Data across operational modules for Wagiman (TBS) and Supriono (APM)
session.switchRole({ code: 'MNT001' });
const wagimanUserCtx = getCurrentUserContext();

session.switchRole({ code: 'MNT002' });
const suprionoUserCtx = getCurrentUserContext();

// 1. Penerimaan
const receiptWagiman = applyTransactionActor({
  id: 'RCP-WAG-001',
  docNo: '2026/APR/001',
  estateId: 'EST-TBS',
  jenis: 'Benih / Biji Kelatak',
  qty: 1000
}, AUDIT_EVENT_TYPES.CREATE, wagimanUserCtx);

const receiptSupriono = applyTransactionActor({
  id: 'RCP-SUP-001',
  docNo: '2026/APR/002',
  estateId: 'EST-APM',
  jenis: 'Benih / Biji Kelatak',
  qty: 2000
}, AUDIT_EVENT_TYPES.CREATE, suprionoUserCtx);

const allReceipts = [receiptWagiman, receiptSupriono];
assert(getAuthorizedTransactions(allReceipts, wagimanUserCtx).length === 1 && getAuthorizedTransactions(allReceipts, wagimanUserCtx)[0].id === 'RCP-WAG-001', 'Penerimaan: Wagiman only sees his own receipt');
assert(getAuthorizedTransactions(allReceipts, suprionoUserCtx).length === 1 && getAuthorizedTransactions(allReceipts, suprionoUserCtx)[0].id === 'RCP-SUP-001', 'Penerimaan: Supriono only sees his own receipt');

// 2. Penyemaian & Dederan
const seedingWagiman = applyTransactionActor({
  id: 'SOW-WAG-001',
  docNo: '2026/SOW/001',
  estateId: 'EST-TBS',
  totalDisemai: 800
}, AUDIT_EVENT_TYPES.CREATE, wagimanUserCtx);

const seedingSupriono = applyTransactionActor({
  id: 'SOW-SUP-001',
  docNo: '2026/SOW/002',
  estateId: 'EST-APM',
  totalDisemai: 1500
}, AUDIT_EVENT_TYPES.CREATE, suprionoUserCtx);

const allSeedings = [seedingWagiman, seedingSupriono];
assert(getAuthorizedTransactions(allSeedings, wagimanUserCtx).length === 1 && getAuthorizedTransactions(allSeedings, wagimanUserCtx)[0].id === 'SOW-WAG-001', 'Penyemaian: Wagiman only sees his own seeding');
assert(getAuthorizedTransactions(allSeedings, suprionoUserCtx).length === 1 && getAuthorizedTransactions(allSeedings, suprionoUserCtx)[0].id === 'SOW-SUP-001', 'Penyemaian: Supriono only sees his own seeding');

// 2b. Dederan Adapter (Pindah Semai Sources)
storage.set(DEDERAN_STORAGE_KEYS.TRANSACTIONS, [
  { id: 'DED-WAG-001', docNo: '2026/DED/001', jumlahDeder: 1000, recordedBy: 'Wagiman', actorName: 'Wagiman', createdByUserId: 'MNT001', estateId: 'EST-TBS' },
  { id: 'DED-SUP-001', docNo: '2026/DED/002', jumlahDeder: 1000, recordedBy: 'Supriono', actorName: 'Supriono', createdByUserId: 'MNT002', estateId: 'EST-APM' }
]);
storage.set(DEDERAN_STORAGE_KEYS.INSPECTIONS, [
  { id: 'INS-DED-1', dederanTxDocNo: '2026/DED/001', jumlahDiperiksa: 1000, jumlahBerhasil: 950, jumlahTidakBerhasil: 50, status: 'DISETUJUI', isFinal: true },
  { id: 'INS-DED-2', dederanTxDocNo: '2026/DED/002', jumlahDiperiksa: 1000, jumlahBerhasil: 950, jumlahTidakBerhasil: 50, status: 'DISETUJUI', isFinal: true }
]);
storage.set('selection_transactions', [
  { sourceDocNo: '2026/DED/001', originType: 'REJECT_DEDERAN', status: 'DISETUJUI', verificationStatus: 'TERVERIFIKASI' },
  { sourceDocNo: '2026/DED/002', originType: 'REJECT_DEDERAN', status: 'DISETUJUI', verificationStatus: 'TERVERIFIKASI' }
]);
const wagimanEligibleSources = getEligiblePindahSemaiSources(wagimanUserCtx);
const suprionoEligibleSources = getEligiblePindahSemaiSources(suprionoUserCtx);
assert(wagimanEligibleSources.length === 1 && wagimanEligibleSources[0].docNo === '2026/DED/001', 'Pindah Semai Adapter: Wagiman only gets his own eligible Dederan source');
assert(suprionoEligibleSources.length === 1 && suprionoEligibleSources[0].docNo === '2026/DED/002', 'Pindah Semai Adapter: Supriono only gets his own eligible Dederan source');

// 3. Okulasi (Grafting & Regrafting)
const buddingWagiman = applyTransactionActor({
  id: 'BUD-WAG-001',
  docNo: '2026/OKL/001',
  type: 'GRAFTING',
  estateId: 'EST-TBS',
  jumlah: 500
}, AUDIT_EVENT_TYPES.CREATE, wagimanUserCtx);

const buddingSupriono = applyTransactionActor({
  id: 'BUD-SUP-001',
  docNo: '2026/OKL/002',
  type: 'GRAFTING',
  estateId: 'EST-APM',
  jumlah: 600
}, AUDIT_EVENT_TYPES.CREATE, suprionoUserCtx);

const allBuddings = [buddingWagiman, buddingSupriono];
assert(getAuthorizedTransactions(allBuddings, wagimanUserCtx).length === 1 && getAuthorizedTransactions(allBuddings, wagimanUserCtx)[0].id === 'BUD-WAG-001', 'Okulasi: Wagiman only sees his own budding');
assert(getAuthorizedTransactions(allBuddings, suprionoUserCtx).length === 1 && getAuthorizedTransactions(allBuddings, suprionoUserCtx)[0].id === 'BUD-SUP-001', 'Okulasi: Supriono only sees his own budding');

// 4. Pemeriksaan Okulasi
const inspectionWagiman = applyTransactionActor({
  id: 'INS-WAG-001',
  docNo: '2026/INS/001',
  estateId: 'EST-TBS',
  jumlahJadi: 450,
  jumlahGagal: 50
}, AUDIT_EVENT_TYPES.CREATE, wagimanUserCtx);

const inspectionSupriono = applyTransactionActor({
  id: 'INS-SUP-001',
  docNo: '2026/INS/002',
  estateId: 'EST-APM',
  jumlahJadi: 550,
  jumlahGagal: 50
}, AUDIT_EVENT_TYPES.CREATE, suprionoUserCtx);

const allInspections = [inspectionWagiman, inspectionSupriono];
assert(getAuthorizedTransactions(allInspections, wagimanUserCtx).length === 1 && getAuthorizedTransactions(allInspections, wagimanUserCtx)[0].id === 'INS-WAG-001', 'Pemeriksaan: Wagiman only sees his own inspection');
assert(getAuthorizedTransactions(allInspections, suprionoUserCtx).length === 1 && getAuthorizedTransactions(allInspections, suprionoUserCtx)[0].id === 'INS-SUP-001', 'Pemeriksaan: Supriono only sees his own inspection');

// 5. Seleksi
const selWagiman = applyTransactionActor({
  id: 'SEL-WAG-001',
  docNo: '2026/CULL/001',
  estateId: 'EST-TBS',
  jumlahAfkir: 30
}, AUDIT_EVENT_TYPES.CREATE, wagimanUserCtx);

const selSupriono = applyTransactionActor({
  id: 'SEL-SUP-001',
  docNo: '2026/CULL/002',
  estateId: 'EST-APM',
  jumlahAfkir: 40
}, AUDIT_EVENT_TYPES.CREATE, suprionoUserCtx);

const allSelections = [selWagiman, selSupriono];
assert(filterSelectionByScope(allSelections, wagimanUserCtx).length === 1 && filterSelectionByScope(allSelections, wagimanUserCtx)[0].id === 'SEL-WAG-001', 'Seleksi: Wagiman only sees his own selection');
assert(filterSelectionByScope(allSelections, suprionoUserCtx).length === 1 && filterSelectionByScope(allSelections, suprionoUserCtx)[0].id === 'SEL-SUP-001', 'Seleksi: Supriono only sees his own selection');

// ----------------------------------------------------
// 9. SAME-ESTATE PERSONA ISOLATION (CASE GLOBAL-03)
// ----------------------------------------------------
console.log('\n--- 9. Same-Estate Persona Cross-Isolation ---');

// Mock a second Mantri in the SAME estate (EST-TBS)
const mantriA_TBS = {
  id: 'TBS-MNT-A',
  userId: 'MNTA',
  code: 'MNTA',
  name: 'Mantri A Tanah Besih',
  role: ROLES.MANTRI_TANAMAN,
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

const mantriB_TBS = {
  id: 'TBS-MNT-B',
  userId: 'MNTB',
  code: 'MNTB',
  name: 'Mantri B Tanah Besih',
  role: ROLES.MANTRI_TANAMAN,
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

const txA_SameEstate = applyTransactionActor({
  id: 'TX-SAME-EST-A',
  docNo: '2026/APR/101',
  estateId: 'EST-TBS'
}, AUDIT_EVENT_TYPES.CREATE, mantriA_TBS);

const txB_SameEstate = applyTransactionActor({
  id: 'TX-SAME-EST-B',
  docNo: '2026/APR/102',
  estateId: 'EST-TBS'
}, AUDIT_EVENT_TYPES.CREATE, mantriB_TBS);

const sameEstateTxs = [txA_SameEstate, txB_SameEstate];
const mantriA_Visible = getAuthorizedTransactions(sameEstateTxs, mantriA_TBS);
const mantriB_Visible = getAuthorizedTransactions(sameEstateTxs, mantriB_TBS);

assert(mantriA_Visible.length === 1 && mantriA_Visible[0].id === 'TX-SAME-EST-A', 'Same Estate: Mantri A only sees Tx A (Tx B isolated)');
assert(mantriB_Visible.length === 1 && mantriB_Visible[0].id === 'TX-SAME-EST-B', 'Same Estate: Mantri B only sees Tx B (Tx A isolated)');
assert(canUserAccessTransaction(txA_SameEstate, mantriB_TBS, 'READ') === false, 'Same Estate: Cross-reading rejected');
assert(canUserAccessTransaction(txA_SameEstate, mantriB_TBS, 'UPDATE') === false, 'Same Estate: Cross-updating rejected');

// ----------------------------------------------------
// 10. MANAGERIAL ESTATE-WIDE SCOPE VISIBILITY (CASE GLOBAL-04)
// ----------------------------------------------------
console.log('\n--- 10. Managerial Role Estate-Wide Scoping ---');
const pengurusTBS = {
  id: 'TBS-PGS-001',
  userId: 'PGS001',
  code: 'PGS001',
  name: 'Junaidi',
  role: ROLES.PENGURUS,
  estateId: 'EST-TBS'
};

const asistenBibitanTBS = {
  id: 'TBS-ASB-001',
  userId: 'ASB001',
  code: 'ASB001',
  name: 'Asisten Bibitan TBS',
  role: ROLES.ASISTEN_BIBITAN,
  estateId: 'EST-TBS'
};

// Both Pengurus and Asisten Bibitan in TBS should see ALL transactions created within EST-TBS
const pengurusVisible = getAuthorizedTransactions(sameEstateTxs, pengurusTBS);
assert(pengurusVisible.length === 2, `Pengurus TBS sees all 2 transactions in EST-TBS (found: ${pengurusVisible.length})`);

const asbVisible = getAuthorizedTransactions(sameEstateTxs, asistenBibitanTBS);
assert(asbVisible.length === 2, `Asisten Bibitan TBS sees all 2 transactions in EST-TBS (found: ${asbVisible.length})`);

// But Pengurus TBS should NOT see transactions from EST-APM
const apmTx = applyTransactionActor({ id: 'TX-APM-001', docNo: '2026/APR/201', estateId: 'EST-APM' }, AUDIT_EVENT_TYPES.CREATE, suprionoUser);
assert(canUserAccessTransaction(apmTx, pengurusTBS, 'READ') === false, 'Pengurus TBS CANNOT see EST-APM transaction (Estate boundary enforced)');

// ----------------------------------------------------
// 11. ACTION MUTATION AUTHORIZATION (CASE GLOBAL-06, 07, 08)
// ----------------------------------------------------
console.log('\n--- 11. Action Mutation Authorization Guards ---');

assert(canUserAccessTransaction(txA_SameEstate, mantriA_TBS, 'UPDATE') === true, 'Mantri A can update own transaction');
assert(canUserAccessTransaction(txA_SameEstate, mantriB_TBS, 'UPDATE') === false, 'Mantri B CANNOT update Mantri A transaction');
assert(canUserAccessTransaction(txA_SameEstate, mantriB_TBS, 'DELETE') === false, 'Mantri B CANNOT delete Mantri A transaction');

let mutationBlocked = false;
try {
  assertTransactionActorOrThrow(txA_SameEstate, mantriB_TBS, 'Edit');
} catch (e) {
  mutationBlocked = true;
}
assert(mutationBlocked === true, 'assertTransactionActorOrThrow throws error when Mantri B attempts editing Mantri A transaction');

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
