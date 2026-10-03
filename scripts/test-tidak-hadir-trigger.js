/**
 * scripts/test-tidak-hadir-trigger.js
 * Integration test suite for:
 * GLOBAL FIX — TIDAK HADIR BERDASARKAN HASIL SIMPAN PRESENSI DATANG
 */

import { getMantriTodayTransactions, submitModuleTransactions, MODULE_TYPES } from '../js/modules/verification/mantri-confirmation-service.js';
import { returnVerification, VERIFICATION_STORAGE_KEY } from '../js/modules/verification/verification-manager.js';
import { storage } from '../js/core/storage.js';
import { todayDDMMYYYY, todayISO } from '../js/core/utils.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName} - ${details}`);
  }
}

console.log('====================================================');
console.log('STARTING TIDAK HADIR TRIGGER INTEGRATION TESTS');
console.log('====================================================\n');

// Mock localStorage for node environment if not present
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

const mantriA = {
  id: 'MNT001',
  userId: 'MNT001',
  code: '1405482',
  name: 'Wagiman',
  role: 'MANTRI_TANAMAN',
  position: 'Mantri Bibitan',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-001',
  divisionName: 'Divisi I'
};

const mantriB = {
  id: 'MNT002',
  userId: 'MNT002',
  code: '1405999',
  name: 'Supriono',
  role: 'MANTRI_TANAMAN',
  position: 'Mantri Bibitan',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  divisionId: 'DIV-APM-02',
  divisionName: 'Divisi II'
};

const today = todayISO();
const todayStr = todayDDMMYYYY();

// ---------------------------------------------------------------------------------
// IT-TH-01: Belum Simpan Presensi Datang
// ---------------------------------------------------------------------------------
console.log('--- TEST 1: IT-TH-01 (Pre-Save: No Presensi Datang Saved) ---');
storage.set('attendance_transactions', []);
storage.set(VERIFICATION_STORAGE_KEY, []);

const txsBeforeSave = getMantriTodayTransactions(mantriA);
const thBeforeSave = txsBeforeSave.filter(t => t.moduleType === MODULE_TYPES.TIDAK_HADIR);

assert(
  thBeforeSave.length === 0,
  'IT-TH-01: Belum Simpan Presensi Datang -> Tidak Hadir TIDAK MUNCUL di Central Hub',
  `Expected 0, got ${thBeforeSave.length}`
);

// ---------------------------------------------------------------------------------
// IT-TH-09: Hardcoded Inactive Workers Do NOT Trigger Automatically
// ---------------------------------------------------------------------------------
console.log('\n--- TEST 2: IT-TH-09 (Inactive Workers in Master Data) ---');
assert(
  !txsBeforeSave.some(t => t.rawRecord?.detailPekerja?.some(w => w.name === 'Supriadi' || w.name === 'Pahrul')),
  'IT-TH-09: Supriadi / Pahrul TIDAK otomatis muncul hanya karena berstatus INACTIVE di master data'
);

// ---------------------------------------------------------------------------------
// IT-TH-02: 5 dari 7 Hadir -> Tepat 2 Worker Aktual yang Tidak Dicentang
// ---------------------------------------------------------------------------------
console.log('\n--- TEST 3: IT-TH-02 (Partial Attendance: 5 Present out of 7 Active Workers) ---');
// Active workers for Wagiman (TBS Divisi I):
// 1. WRK-001: Fadilah Yusuf Purba
// 2. WRK-002: Syafaruddin
// 3. WRK-003: Muhammad Ilham
// 4. WRK-004: Budi Utomo
// 5. WRK-005: Hendra Syahputra
// 6. WRK-006: Agus Setiawan
// 7. WRK-007: Joko Prasetyo

// Assume Wagiman records attendance for 5 workers (WRK-001 through WRK-005)
const fivePresent = [
  { id: 'ATT-1', type: 'WORKER', attendanceType: 'DATANG', workerId: 'WRK-001', code: '1405739', name: 'Fadilah Yusuf Purba', createdByUserId: 'MNT001', date: today, estateId: 'EST-TBS', divisionId: 'DIV-001' },
  { id: 'ATT-2', type: 'WORKER', attendanceType: 'DATANG', workerId: 'WRK-002', code: '1405740', name: 'Syafaruddin', createdByUserId: 'MNT001', date: today, estateId: 'EST-TBS', divisionId: 'DIV-001' },
  { id: 'ATT-3', type: 'WORKER', attendanceType: 'DATANG', workerId: 'WRK-003', code: '1405741', name: 'Muhammad Ilham', createdByUserId: 'MNT001', date: today, estateId: 'EST-TBS', divisionId: 'DIV-001' },
  { id: 'ATT-4', type: 'WORKER', attendanceType: 'DATANG', workerId: 'WRK-004', code: '1405742', name: 'Budi Utomo', createdByUserId: 'MNT001', date: today, estateId: 'EST-TBS', divisionId: 'DIV-001' },
  { id: 'ATT-5', type: 'WORKER', attendanceType: 'DATANG', workerId: 'WRK-005', code: '1405743', name: 'Hendra Syahputra', createdByUserId: 'MNT001', date: today, estateId: 'EST-TBS', divisionId: 'DIV-001' }
];

storage.set('attendance_transactions', fivePresent);
const txsPartial = getMantriTodayTransactions(mantriA);
const thPartial = txsPartial.filter(t => t.moduleType === MODULE_TYPES.TIDAK_HADIR);

assert(thPartial.length === 1, 'IT-TH-02: Tidak Hadir transaction group created');
const absentList = thPartial[0]?.rawRecord?.detailPekerja || [];
assert(absentList.length === 2, 'IT-TH-02: Exactly 2 workers are absent', `Got ${absentList.length}`);
const absentNames = absentList.map(w => w.name);
assert(
  absentNames.includes('Andi Wijaya') && absentNames.includes('Joko Prasetyo'),
  'IT-TH-02: Absent workers match exactly the unchecked active workers (Andi Wijaya & Joko Prasetyo)'
);

// ---------------------------------------------------------------------------------
// IT-TH-04: Refresh Setelah Save Tetap Konsisten
// ---------------------------------------------------------------------------------
console.log('\n--- TEST 4: IT-TH-04 (Persistence & Idempotency on Refresh) ---');
const txsReRead = getMantriTodayTransactions(mantriA);
const thReRead = txsReRead.filter(t => t.moduleType === MODULE_TYPES.TIDAK_HADIR);
assert(thReRead.length === 1 && thReRead[0].rawRecord.detailPekerja.length === 2, 'IT-TH-04: Refresh preserves exactly the same calculated absent workers');

// ---------------------------------------------------------------------------------
// IT-TH-08: Render Berulang Tidak Membuat Duplicate di verification_transactions
// ---------------------------------------------------------------------------------
console.log('\n--- TEST 5: IT-TH-08 (No Duplicate Side Effects on Evaluation) ---');
const verifsCountBefore = storage.get(VERIFICATION_STORAGE_KEY, []).length;
getMantriTodayTransactions(mantriA);
getMantriTodayTransactions(mantriA);
const verifsCountAfter = storage.get(VERIFICATION_STORAGE_KEY, []).length;
assert(verifsCountBefore === verifsCountAfter, 'IT-TH-08: Evaluating transactions does NOT perform rogue verification pushes');

// ---------------------------------------------------------------------------------
// IT-TH-03: 7 dari 7 Hadir -> Tidak Hadir TIDAK MUNCUL
// ---------------------------------------------------------------------------------
console.log('\n--- TEST 6: IT-TH-03 (100% Attendance: 7 out of 7 Present) ---');
const allSevenPresent = [
  ...fivePresent,
  { id: 'ATT-6', type: 'WORKER', attendanceType: 'DATANG', workerId: 'WRK-006', code: '1405811', name: 'Agus Setiawan', createdByUserId: 'MNT001', date: today, estateId: 'EST-TBS', divisionId: 'DIV-001' },
  { id: 'ATT-7', type: 'WORKER', attendanceType: 'DATANG', workerId: 'WRK-007', code: '1405812', name: 'Joko Prasetyo', createdByUserId: 'MNT001', date: today, estateId: 'EST-TBS', divisionId: 'DIV-001' }
];
storage.set('attendance_transactions', allSevenPresent);

const txsAllPresent = getMantriTodayTransactions(mantriA);
const thAllPresent = txsAllPresent.filter(t => t.moduleType === MODULE_TYPES.TIDAK_HADIR);
assert(thAllPresent.length === 0, 'IT-TH-03: 7 dari 7 hadir -> Tidak Hadir TIDAK MUNCUL (0 workers absent)');

// ---------------------------------------------------------------------------------
// IT-TH-05: Mantri Scope Isolation (Mantri A vs Mantri B)
// ---------------------------------------------------------------------------------
console.log('\n--- TEST 7: IT-TH-05 (Cross-Mantri Scope Isolation) ---');
// Re-set Mantri A to have partial attendance (5 present)
storage.set('attendance_transactions', fivePresent);

// Mantri B has not recorded attendance yet
const txsMantriB = getMantriTodayTransactions(mantriB);
const thMantriB = txsMantriB.filter(t => t.moduleType === MODULE_TYPES.TIDAK_HADIR);
assert(thMantriB.length === 0, 'IT-TH-05: Mantri A saved attendance does NOT trigger Tidak Hadir in Mantri B Central Hub');

// ---------------------------------------------------------------------------------
// IT-TH-06: Presensi Kemarin Tidak Memicu Tidak Hadir Hari Ini
// ---------------------------------------------------------------------------------
console.log('\n--- TEST 8: IT-TH-06 (Date Scope Isolation) ---');
const yesterdayAtts = [
  { id: 'ATT-YEST', type: 'WORKER', attendanceType: 'DATANG', workerId: 'WRK-001', createdByUserId: 'MNT001', date: '2026-09-01', estateId: 'EST-TBS', divisionId: 'DIV-001' }
];
storage.set('attendance_transactions', yesterdayAtts);
const txsYesterdayOnly = getMantriTodayTransactions(mantriA);
const thYesterdayOnly = txsYesterdayOnly.filter(t => t.moduleType === MODULE_TYPES.TIDAK_HADIR);
assert(thYesterdayOnly.length === 0, 'IT-TH-06: Attendance from past dates does NOT trigger Tidak Hadir for today');

// ---------------------------------------------------------------------------------
// IT-TH-07: Submit Tidak Hadir ke Asisten Bibitan
// ---------------------------------------------------------------------------------
console.log('\n--- TEST 9: IT-TH-07 (Submit Tidak Hadir to Asisten) ---');
storage.set('attendance_transactions', fivePresent);
storage.set(VERIFICATION_STORAGE_KEY, []);

const submitResult = submitModuleTransactions(MODULE_TYPES.TIDAK_HADIR, mantriA);
assert(submitResult.success === true && submitResult.submittedCount === 1, 'IT-TH-07: submitModuleTransactions for TIDAK_HADIR succeeds');

const verifsAfterSubmit = storage.get(VERIFICATION_STORAGE_KEY, []);
const vRecord = verifsAfterSubmit.find(v => v.referenceType === MODULE_TYPES.TIDAK_HADIR);
assert(
  vRecord && vRecord.verificationStatus === 'MENUNGGU_VERIFIKASI',
  'IT-TH-07: verification_transactions created with status MENUNGGU_VERIFIKASI'
);

// ---------------------------------------------------------------------------------
// IT-TH-10: Returned Restriction on Tidak Hadir
// ---------------------------------------------------------------------------------
console.log('\n--- TEST 10: IT-TH-10 (Return Restriction on TIDAK_HADIR) ---');
let returnBlocked = false;
try {
  returnVerification({
    referenceType: 'TIDAK_HADIR',
    referenceId: vRecord.referenceId,
    returnReason: 'Koreksi absensi',
    currentUser: { id: 'ASB001', role: 'ASISTEN_BIBITAN', estateId: 'EST-TBS', divisionId: 'DIV-001' }
  });
} catch (e) {
  returnBlocked = e.message.includes('tidak dapat dikembalikan');
}
assert(returnBlocked === true, 'IT-TH-10: Asisten returning TIDAK_HADIR is rejected as per existing business rule');

console.log('\n====================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('====================================================');

if (totalTests === passedTests) {
  console.log('ALL TIDAK HADIR TRIGGER INTEGRATION TESTS PASSED (100%)');
} else {
  process.exit(1);
}
