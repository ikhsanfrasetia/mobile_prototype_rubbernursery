/**
 * scripts/run-uat-phase9d.js
 * 
 * Formal UAT Execution Runner for Phase 9D — Verifikasi Isolasi Transaksi Mantri Bibitan.
 * Menjalankan dan memvalidasi TEST 1 sampai TEST 16 secara runut dan menyeluruh.
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

import { session } from '../js/core/session.js';
import { storage, KEYS } from '../js/core/storage.js';
import { getCurrentUserContext, resolveUserContext, ROLES, SCOPE_TYPES } from '../js/core/user-context.js';
import { getDemoPersonaById } from '../js/data/demo-personas.js';
import { getCfnaByCode } from '../js/data/cfna-master.js';
import { applyTransactionActor, resolveTransactionActor, AUDIT_EVENT_TYPES } from '../js/core/transaction-actor.js';
import {
  MASTER_AKTIVITAS,
  getConfirmedCfnaForActivity,
  isTransactionOwnedByUser,
  isTransactionVisibleToUser,
  getVisibleMaintenanceRecords,
  filterMaintenanceRecordsByQuery,
  getMaintenanceRecordById,
  deleteMaintenanceRecord
} from '../js/modules/maintenance/nursery-activity.js';

console.log('======================================================================');
console.log('📋 UAT PHASE 9D — VERIFIKASI ISOLASI TRANSAKSI MANTRI BIBITAN');
console.log('======================================================================\n');

const uatResults = [];
function recordUat(testName, expected, actual, status) {
  uatResults.push({ testName, expected, actual, status });
  console.log(`[${status}] ${testName} -> Expected: "${expected}" | Actual: "${actual}"`);
}

// ==========================================
// TEST 1 — BERSIHKAN KONDISI AWAL
// ==========================================
console.log('--- TEST 1: Bersihkan Kondisi Awal ---');
session.start({
  userId: 'TBS-MNT-001',
  code: 'MNT001',
  role: 'MANTRI_TANAMAN',
  name: 'Wagiman',
  position: 'Mantri Bibitan',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-001',
  divisionName: 'Tanah Besih - Divisi I',
  scopeType: 'DIVISION'
});

// Clear only test transactions from storage
storage.set('nursery_activity_records', []);
const initialRecordsWagiman = getVisibleMaintenanceRecords(storage.get('nursery_activity_records', []));
recordUat('Test 1: Initial State Wagiman', '0 test transactions', `${initialRecordsWagiman.length} records`, initialRecordsWagiman.length === 0 ? 'PASS' : 'FAIL');

// ==========================================
// TEST 2 — WAGIMAN MEMBUAT TRANSAKSI
// ==========================================
console.log('\n--- TEST 2: Wagiman Membuat Transaksi ---');
const wagimanContext = getCurrentUserContext();
const penyiramanAct = MASTER_AKTIVITAS.find(a => a.nama === 'Penyiraman');
const confirmedCfna = getConfirmedCfnaForActivity(penyiramanAct);

const testDate = new Date().toISOString();
let wagimanRecord = {
  id: 'ACT-WAGIMAN-001-ID',
  docNo: 'TEST-WAGIMAN-001',
  aktivitas: penyiramanAct,
  program: 'PRG/NUR/01/2026',
  lokasiBlok: { blok: 'Block 031/04', luas: 39.68 },
  pekerja: [{ id: 'PK-01', name: 'Fadilah Yusuf Purba', code: '1405739', role: 'Pekerja Bibitan' }],
  allocationCode: confirmedCfna[0].code,
  allocationName: confirmedCfna[0].name,
  createdAt: testDate
};
wagimanRecord = applyTransactionActor(wagimanRecord, AUDIT_EVENT_TYPES.CREATE, wagimanContext);

const allRecordsAfterT2 = storage.get('nursery_activity_records', []);
allRecordsAfterT2.push(wagimanRecord);
storage.set('nursery_activity_records', allRecordsAfterT2);

recordUat(
  'Test 2: Wagiman create',
  'Transaction tersimpan (TEST-WAGIMAN-001, CFNA 964009)',
  `Stored docNo=${wagimanRecord.docNo}, CFNA=${wagimanRecord.allocationCode}`,
  wagimanRecord.docNo === 'TEST-WAGIMAN-001' && wagimanRecord.allocationCode === '964009' ? 'PASS' : 'FAIL'
);

// ==========================================
// TEST 3 — VERIFIKASI DATA WAGIMAN
// ==========================================
console.log('\n--- TEST 3: Verifikasi Data Wagiman ---');
const wagimanLanding = getVisibleMaintenanceRecords(storage.get('nursery_activity_records', []));
const wagimanDetail = getMaintenanceRecordById('TEST-WAGIMAN-001');

const test3Pass = (
  wagimanLanding.length === 1 &&
  wagimanLanding[0].docNo === 'TEST-WAGIMAN-001' &&
  wagimanDetail !== null &&
  wagimanDetail.createdByName === 'Wagiman' &&
  wagimanDetail.createdByRole === 'MANTRI_TANAMAN' &&
  wagimanDetail.createdByEstateName === 'Tanah Besih' &&
  wagimanDetail.allocationName === 'Penyiraman (Manual)'
);

recordUat(
  'Test 3: Wagiman landing & detail',
  'Hanya data Wagiman, Count 1, Detail lengkap & CFNA valid',
  `Count=${wagimanLanding.length}, Creator=${wagimanDetail?.createdByName}, Role=${wagimanDetail?.createdByRole}`,
  test3Pass ? 'PASS' : 'FAIL'
);

// ==========================================
// TEST 4 & 5 — LOGOUT / SWITCH KE SUPRIONO & ISOLASI LANDING
// ==========================================
console.log('\n--- TEST 4 & 5: Switch ke Supriono & Isolasi Landing ---');
session.start({
  userId: 'APM-MNT-002',
  code: 'MNT002',
  role: 'MANTRI_TANAMAN',
  name: 'Supriono',
  position: 'Mantri Bibitan',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  divisionId: 'DIV-APM-01',
  divisionName: 'Divisi I',
  scopeType: 'DIVISION'
});

const suprionoContext = getCurrentUserContext();
const suprionoLanding = getVisibleMaintenanceRecords(storage.get('nursery_activity_records', []));
const suprionoSearchWagiman = filterMaintenanceRecordsByQuery(storage.get('nursery_activity_records', []), 'TEST-WAGIMAN-001');

const test5Pass = (
  suprionoLanding.length === 0 &&
  suprionoSearchWagiman.length === 0
);

recordUat(
  'Test 5: Supriono landing isolation',
  'Data Wagiman TIDAK MUNCUL (Count=0, Search=0)',
  `Landing Count=${suprionoLanding.length}, Search Count=${suprionoSearchWagiman.length}`,
  test5Pass ? 'PASS' : 'FAIL'
);

// ==========================================
// TEST 6 — DETAIL ACCESS CROSS-USER
// ==========================================
console.log('\n--- TEST 6: Detail Access Cross-User ---');
const suprionoAccessWagimanDetail = getMaintenanceRecordById('TEST-WAGIMAN-001');
recordUat(
  'Test 6: Supriono detail Wagiman',
  'Ditolak (null / not found)',
  `Result: ${suprionoAccessWagimanDetail === null ? 'null (Access Denied / Not Found)' : 'ACCESSIBLE'}`,
  suprionoAccessWagimanDetail === null ? 'PASS' : 'FAIL'
);

// ==========================================
// TEST 7 — DELETE SECURITY CROSS-USER
// ==========================================
console.log('\n--- TEST 7: Delete Security Cross-User ---');
const suprionoDeleteWagiman = deleteMaintenanceRecord('TEST-WAGIMAN-001');
const storageCheckT7 = storage.get('nursery_activity_records', []);
const wagimanTxStillExists = storageCheckT7.some(r => r.docNo === 'TEST-WAGIMAN-001');

const test7Pass = (suprionoDeleteWagiman === false && wagimanTxStillExists === true);
recordUat(
  'Test 7: Supriono delete Wagiman',
  'Delete ditolak (false), Transaksi Wagiman tetap ada',
  `Delete Return=${suprionoDeleteWagiman}, Tx Exists in Storage=${wagimanTxStillExists}`,
  test7Pass ? 'PASS' : 'FAIL'
);

// ==========================================
// TEST 8 & 9 — SUPRIONO MEMBUAT TRANSAKSI & VERIFIKASI SUPRIONO
// ==========================================
console.log('\n--- TEST 8 & 9: Supriono Create & Verifikasi ---');
let suprionoRecord = {
  id: 'ACT-SUPRIONO-001-ID',
  docNo: 'TEST-SUPRIONO-001',
  aktivitas: penyiramanAct,
  program: 'PRG/NUR/02/2027',
  lokasiBlok: { blok: 'Block 036G/19', luas: 0.45 },
  pekerja: [],
  allocationCode: confirmedCfna[0].code,
  allocationName: confirmedCfna[0].name,
  createdAt: new Date().toISOString()
};
suprionoRecord = applyTransactionActor(suprionoRecord, AUDIT_EVENT_TYPES.CREATE, suprionoContext);

const allRecordsAfterT8 = storage.get('nursery_activity_records', []);
allRecordsAfterT8.push(suprionoRecord);
storage.set('nursery_activity_records', allRecordsAfterT8);

const suprionoLandingT9 = getVisibleMaintenanceRecords(storage.get('nursery_activity_records', []));
const suprionoDetailT9 = getMaintenanceRecordById('TEST-SUPRIONO-001');

const test9Pass = (
  suprionoLandingT9.length === 1 &&
  suprionoLandingT9[0].docNo === 'TEST-SUPRIONO-001' &&
  suprionoDetailT9 !== null &&
  suprionoDetailT9.createdByName === 'Supriono' &&
  suprionoDetailT9.createdByEstateName === 'Aek Pamingke'
);

recordUat(
  'Test 9: Supriono create & landing',
  'TEST-SUPRIONO-001 tampil, Wagiman tidak tampil, Count=1',
  `Count=${suprionoLandingT9.length}, Visible Doc=${suprionoLandingT9[0]?.docNo}, Creator=${suprionoDetailT9?.createdByName}`,
  test9Pass ? 'PASS' : 'FAIL'
);

// ==========================================
// TEST 10 — KEMBALI KE WAGIMAN
// ==========================================
console.log('\n--- TEST 10: Switch Kembali ke Wagiman ---');
session.start({
  userId: 'TBS-MNT-001',
  code: 'MNT001',
  role: 'MANTRI_TANAMAN',
  name: 'Wagiman',
  position: 'Mantri Bibitan',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-001',
  divisionName: 'Tanah Besih - Divisi I',
  scopeType: 'DIVISION'
});

const wagimanLandingT10 = getVisibleMaintenanceRecords(storage.get('nursery_activity_records', []));
const wagimanSearchSupriono = filterMaintenanceRecordsByQuery(storage.get('nursery_activity_records', []), 'TEST-SUPRIONO-001');

const test10Pass = (
  wagimanLandingT10.length === 1 &&
  wagimanLandingT10[0].docNo === 'TEST-WAGIMAN-001' &&
  wagimanSearchSupriono.length === 0
);

recordUat(
  'Test 10: Wagiman landing setelahnya',
  'TEST-WAGIMAN-001 tampil, TEST-SUPRIONO-001 tidak muncul',
  `Count=${wagimanLandingT10.length}, Visible Doc=${wagimanLandingT10[0]?.docNo}, Cross Search Count=${wagimanSearchSupriono.length}`,
  test10Pass ? 'PASS' : 'FAIL'
);

// ==========================================
// TEST 11 — SEARCH ISOLATION
// ==========================================
console.log('\n--- TEST 11: Search Isolation ---');
const allRecsT11 = storage.get('nursery_activity_records', []);

// Search as Wagiman
const searchWagimanOwn = filterMaintenanceRecordsByQuery(allRecsT11, 'TEST-WAGIMAN-001', wagimanContext);
const searchWagimanCross = filterMaintenanceRecordsByQuery(allRecsT11, 'TEST-SUPRIONO-001', wagimanContext);

// Search as Supriono
const searchSuprionoOwn = filterMaintenanceRecordsByQuery(allRecsT11, 'TEST-SUPRIONO-001', suprionoContext);
const searchSuprionoCross = filterMaintenanceRecordsByQuery(allRecsT11, 'TEST-WAGIMAN-001', suprionoContext);

const test11Pass = (
  searchWagimanOwn.length === 1 &&
  searchWagimanCross.length === 0 &&
  searchSuprionoOwn.length === 1 &&
  searchSuprionoCross.length === 0
);

recordUat(
  'Test 11: Search isolation',
  'Own search: 1 result, Cross search: 0 result',
  `Wagiman Search (Own=${searchWagimanOwn.length}, Cross=${searchWagimanCross.length}) | Supriono Search (Own=${searchSuprionoOwn.length}, Cross=${searchSuprionoCross.length})`,
  test11Pass ? 'PASS' : 'FAIL'
);

// ==========================================
// TEST 12 — COUNT / SUMMARY ISOLATION
// ==========================================
console.log('\n--- TEST 12: Count / Summary Isolation ---');
const countWagiman = getVisibleMaintenanceRecords(allRecsT11, wagimanContext).length;
const countSupriono = getVisibleMaintenanceRecords(allRecsT11, suprionoContext).length;
const totalInStorage = allRecsT11.length;

const test12Pass = (countWagiman === 1 && countSupriono === 1 && totalInStorage === 2);
recordUat(
  'Test 12: Count isolation',
  'Wagiman=1, Supriono=1 (Total Storage=2, Tidak tercampur)',
  `Wagiman Count=${countWagiman}, Supriono Count=${countSupriono}, Storage Total=${totalInStorage}`,
  test12Pass ? 'PASS' : 'FAIL'
);

// ==========================================
// TEST 13 — ACTOR SNAPSHOT
// ==========================================
console.log('\n--- TEST 13: Actor Snapshot ---');
const recW = allRecsT11.find(r => r.docNo === 'TEST-WAGIMAN-001');
const recS = allRecsT11.find(r => r.docNo === 'TEST-SUPRIONO-001');

const test13Pass = (
  recW && recS &&
  (recW.createdByUserId === 'TBS-MNT-001' || recW.createdByUserId === 'MNT001') &&
  (recS.createdByUserId === 'APM-MNT-002' || recS.createdByUserId === 'MNT002') &&
  recW.createdByUserId !== recS.createdByUserId
);

recordUat(
  'Test 13: Actor snapshot',
  'MNT001 vs MNT002 berbeda, Role sama MANTRI_TANAMAN',
  `Wagiman Owner=${recW?.createdByUserId}, Supriono Owner=${recS?.createdByUserId}`,
  test13Pass ? 'PASS' : 'FAIL'
);

// ==========================================
// TEST 14 — ESTATE ISOLATION
// ==========================================
console.log('\n--- TEST 14: Estate Isolation ---');
const test14Pass = (
  recW.createdByEstateId === 'EST-TBS' &&
  recS.createdByEstateId === 'EST-APM' &&
  recW.createdByEstateName === 'Tanah Besih' &&
  recS.createdByEstateName === 'Aek Pamingke'
);

recordUat(
  'Test 14: Estate isolation',
  'Tanah Besih (EST-TBS) vs Aek Pamingke (EST-APM) terisolasi',
  `Wagiman Estate=${recW.createdByEstateName}, Supriono Estate=${recS.createdByEstateName}`,
  test14Pass ? 'PASS' : 'FAIL'
);

// ==========================================
// TEST 15 — REFRESH / RELOAD SIMULATION
// ==========================================
console.log('\n--- TEST 15: Refresh / Reload Simulation ---');
// Simulating browser reload by re-reading fresh from storage after session start
session.start({
  userId: 'TBS-MNT-001',
  code: 'MNT001',
  role: 'MANTRI_TANAMAN',
  name: 'Wagiman',
  position: 'Mantri Bibitan',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-001',
  divisionName: 'Tanah Besih - Divisi I',
  scopeType: 'DIVISION'
});
const refreshedWagiman = getVisibleMaintenanceRecords(storage.get('nursery_activity_records', []));

session.start({
  userId: 'APM-MNT-002',
  code: 'MNT002',
  role: 'MANTRI_TANAMAN',
  name: 'Supriono',
  position: 'Mantri Bibitan',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  divisionId: 'DIV-APM-01',
  divisionName: 'Divisi I',
  scopeType: 'DIVISION'
});
const refreshedSupriono = getVisibleMaintenanceRecords(storage.get('nursery_activity_records', []));

const test15Pass = (
  refreshedWagiman.length === 1 && refreshedWagiman[0].docNo === 'TEST-WAGIMAN-001' &&
  refreshedSupriono.length === 1 && refreshedSupriono[0].docNo === 'TEST-SUPRIONO-001'
);

recordUat(
  'Test 15: Refresh isolation',
  'Tetap terisolasi setelah reload session',
  `Post-reload Wagiman Count=${refreshedWagiman.length}, Post-reload Supriono Count=${refreshedSupriono.length}`,
  test15Pass ? 'PASS' : 'FAIL'
);

// ==========================================
// TEST 16 — FINAL STORAGE CHECK
// ==========================================
console.log('\n--- TEST 16: Final Storage Invariant Check ---');
const finalStorage = storage.get('nursery_activity_records', []);
const finalW = finalStorage.find(r => r.docNo === 'TEST-WAGIMAN-001');
const finalS = finalStorage.find(r => r.docNo === 'TEST-SUPRIONO-001');

const test16Pass = (
  finalW.createdByUserId === recW.createdByUserId &&
  finalS.createdByUserId === recS.createdByUserId &&
  finalW.createdAt === testDate
);

recordUat(
  'Test 16: Storage isolation',
  'Owner immutable, tidak bermutasi karena login user lain',
  `Final W Owner=${finalW?.createdByUserId}, Final S Owner=${finalS?.createdByUserId}`,
  test16Pass ? 'PASS' : 'FAIL'
);

// Summary
console.log('\n======================================================================');
const allPassed = uatResults.every(r => r.status === 'PASS');
console.log(`TOTAL UAT TESTS: ${uatResults.length}`);
console.log(`PASSED: ${uatResults.filter(r => r.status === 'PASS').length}`);
console.log(`FAILED: ${uatResults.filter(r => r.status === 'FAIL').length}`);
console.log(`FINAL STATUS: ${allPassed ? 'ALL UAT TESTS PASSED ✅' : 'UAT FAILED ❌'}`);
console.log('======================================================================\n');

if (!allPassed) process.exit(1);
