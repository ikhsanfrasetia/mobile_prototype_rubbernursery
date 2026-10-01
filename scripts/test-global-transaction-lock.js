/**
 * scripts/test-global-transaction-lock.js
 * Integration test suite for Global Transaction Lock across all 9 GAP modules.
 * Verifies canonical predicate, mutation guards, record-level isolation, and resubmission cycles.
 */

import { isTransactionLockedForMantri } from '../js/modules/verification/mantri-confirmation-service.js';
import { updateDederanInspection, deleteDederanInspection, DEDERAN_STORAGE_KEYS } from '../js/modules/seeding/dederan-manager.js';
import { deleteMaintenanceRecord } from '../js/modules/maintenance/nursery-activity.js';
import { storage } from '../js/core/storage.js';

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
console.log('STARTING GLOBAL TRANSACTION LOCK INTEGRATION TESTS');
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

// ---------------------------------------------------------------------------------
// 1. CANONICAL PREDICATE TESTS (IT-GL-15 to IT-GL-20)
// ---------------------------------------------------------------------------------
console.log('--- 1. Canonical Predicate Matrix Tests ---');

// IT-GL-15
const t15 = { status: 'READY_TO_CONFIRM', verificationStatus: 'TERVERIFIKASI' };
assert(isTransactionLockedForMantri(t15) === true, 'IT-GL-15: status=READY_TO_CONFIRM, verificationStatus=TERVERIFIKASI -> LOCKED');

// IT-GL-16
const t16 = { status: 'READY_TO_CONFIRM', submissionStatus: 'SUBMITTED_TO_ASB' };
assert(isTransactionLockedForMantri(t16) === true, 'IT-GL-16: status=READY_TO_CONFIRM, submissionStatus=SUBMITTED_TO_ASB -> LOCKED');

// IT-GL-17
const t17 = { status: 'DRAFT', isFinal: true };
assert(isTransactionLockedForMantri(t17) === true, 'IT-GL-17: status=DRAFT, isFinal=true -> LOCKED');

// IT-GL-18
const t18 = { status: 'DIKEMBALIKAN', verificationStatus: 'DIKEMBALIKAN' };
assert(isTransactionLockedForMantri(t18) === false, 'IT-GL-18: status=DIKEMBALIKAN, verificationStatus=DIKEMBALIKAN -> EDITABLE');

// IT-GL-19: Record-level isolation (Returned doc does not unlock other docs)
const apr001 = { docNo: '2026/APR/001', status: 'SUBMITTED_TO_ASB', verificationStatus: 'MENUNGGU_VERIFIKASI' };
const apr002 = { docNo: '2026/APR/002', status: 'DIKEMBALIKAN', verificationStatus: 'DIKEMBALIKAN' };
const apr003 = { docNo: '2026/APR/003', status: 'DRAFT' };
assert(
  isTransactionLockedForMantri(apr001) === true &&
  isTransactionLockedForMantri(apr002) === false &&
  isTransactionLockedForMantri(apr003) === false,
  'IT-GL-19: APR-001 (SUBMITTED -> LOCKED), APR-002 (RETURNED -> EDITABLE), APR-003 (DRAFT -> EDITABLE) — isolated per record'
);

// IT-GL-20: Resubmit returned doc -> LOCKED again
const apr002_resubmitted = {
  docNo: '2026/APR/002',
  status: 'DIKEMBALIKAN',
  submissionStatus: 'SUBMITTED_TO_ASB'
};
assert(isTransactionLockedForMantri(apr002_resubmitted) === true, 'IT-GL-20: Resubmitting returned transaction -> LOCKED again');

// Additional Authoritative States Matrix
assert(isTransactionLockedForMantri({ status: 'MENUNGGU_VERIFIKASI' }) === true, 'Predicate: MENUNGGU_VERIFIKASI -> LOCKED');
assert(isTransactionLockedForMantri({ status: 'PENDING_ASB' }) === true, 'Predicate: PENDING_ASB -> LOCKED');
assert(isTransactionLockedForMantri({ status: 'DIAJUKAN' }) === true, 'Predicate: DIAJUKAN -> LOCKED');
assert(isTransactionLockedForMantri({ status: 'DIAJUKAN_PEMERIKSAAN' }) === true, 'Predicate: DIAJUKAN_PEMERIKSAAN -> LOCKED');
assert(isTransactionLockedForMantri({ status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' }) === true, 'Predicate: MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN -> LOCKED');
assert(isTransactionLockedForMantri({ status: 'DISETUJUI' }) === true, 'Predicate: DISETUJUI -> LOCKED');
assert(isTransactionLockedForMantri({ status: 'VERIFIED' }) === true, 'Predicate: VERIFIED -> LOCKED');
assert(isTransactionLockedForMantri({ status: 'APPROVED' }) === true, 'Predicate: APPROVED -> LOCKED');
assert(isTransactionLockedForMantri({ status: 'DRAFT', verificationStatus: null, submissionStatus: null }) === false, 'Predicate: Pure DRAFT -> EDITABLE');

console.log('\n--- 2. GAP Module Tests (IT-GL-01 to IT-GL-14 + Okulasi Inspection + Maintenance) ---');

// IT-GL-01 & IT-GL-02: Modul 1 - Penerimaan
const rec1_submitted = { docNo: '2026/APR/001', status: 'MENUNGGU_VERIFIKASI' };
const rec1_returned = { docNo: '2026/APR/001', status: 'DIKEMBALIKAN' };
assert(isTransactionLockedForMantri(rec1_submitted) === true, 'IT-GL-01: Penerimaan 2026/APR/001 submitted -> LOCKED');
assert(isTransactionLockedForMantri(rec1_returned) === false, 'IT-GL-02: Penerimaan 2026/APR/001 returned -> EDITABLE');

// IT-GL-03 & IT-GL-04: Modul 2 - Pemeriksaan Dederan (Service Guard Validation)
storage.set(DEDERAN_STORAGE_KEYS.TRANSACTIONS, [
  { id: 'DED-001', docNo: '2026/DED/001', parentDederIndukDocNo: 'IND-01', jumlahDeder: 1000 }
]);
storage.set(DEDERAN_STORAGE_KEYS.INSPECTIONS, [
  { id: 'DED-INS-001', docNo: '2026/DED-INS/001', dederanTxDocNo: '2026/DED/001', bedengan: 'BED-01', status: 'MENUNGGU_VERIFIKASI', jumlahDiperiksa: 100, jumlahBerhasil: 90, jumlahTidakBerhasil: 10 },
  { id: 'DED-INS-002', docNo: '2026/DED-INS/002', dederanTxDocNo: '2026/DED/001', bedengan: 'BED-02', status: 'DIKEMBALIKAN', jumlahDiperiksa: 100, jumlahBerhasil: 80, jumlahTidakBerhasil: 20 },
  { id: 'DED-INS-003', docNo: '2026/DED-INS/003', dederanTxDocNo: '2026/DED/001', bedengan: 'BED-03', status: 'DRAFT', jumlahDiperiksa: 100, jumlahBerhasil: 70, jumlahTidakBerhasil: 30 }
]);

const delResultLocked = deleteDederanInspection('2026/DED-INS/001');
assert(delResultLocked.success === false && delResultLocked.error.includes('tidak dapat dihapus'), 'IT-GL-03: Service Guard deleteDederanInspection on locked record DED-INS-001 is rejected');

let updateBlocked = false;
try {
  updateDederanInspection('2026/DED-INS/001', { jumlahDiperiksa: 100, jumlahBerhasil: 95 });
} catch (e) {
  updateBlocked = e.message.includes('tidak dapat diubah');
}
assert(updateBlocked === true, 'IT-GL-03: Service Guard updateDederanInspection on locked record DED-INS-001 is rejected');

let updateSucceeded = false;
try {
  const res = updateDederanInspection('2026/DED-INS/002', { jumlahDiperiksa: 100, jumlahBerhasil: 85 });
  if (res && res.inspection) updateSucceeded = true;
} catch (e) {
  console.error(e);
}
assert(updateSucceeded === true, 'IT-GL-04: Service Guard updateDederanInspection on returned record DED-INS-002 succeeds');

const delResultEditable = deleteDederanInspection('2026/DED-INS/003');
assert(delResultEditable.success === true, 'IT-GL-04: Service Guard deleteDederanInspection on draft record DED-INS-003 succeeds');

// IT-GL-05 & IT-GL-06: Modul 3 - Penyemaian (Pindah Semai)
const semai_locked = { docNo: '2026/TRS-SM/001', status: 'SUBMITTED_TO_ASB' };
const semai_returned = { docNo: '2026/TRS-SM/001', status: 'DIKEMBALIKAN' };
assert(isTransactionLockedForMantri(semai_locked) === true, 'IT-GL-05: Penyemaian (Pindah Semai) submitted -> LOCKED');
assert(isTransactionLockedForMantri(semai_returned) === false, 'IT-GL-06: Penyemaian (Pindah Semai) returned -> EDITABLE');

// IT-GL-07 & IT-GL-08: Modul 4 - Menunas
const tunas_locked = { docNo: '2026/TNS/001', verificationStatus: 'MENUNGGU_VERIFIKASI' };
const tunas_returned = { docNo: '2026/TNS/001', verificationStatus: 'DIKEMBALIKAN' };
assert(isTransactionLockedForMantri(tunas_locked) === true, 'IT-GL-07: Menunas submitted -> LOCKED');
assert(isTransactionLockedForMantri(tunas_returned) === false, 'IT-GL-08: Menunas returned -> EDITABLE');

// IT-GL-09 & IT-GL-10: Modul 5 - Topping
const top_locked = { docNo: '2026/TOP/001', submissionStatus: 'SUBMITTED_TO_ASB' };
const top_returned = { docNo: '2026/TOP/001', status: 'DIKEMBALIKAN' };
assert(isTransactionLockedForMantri(top_locked) === true, 'IT-GL-09: Topping submitted -> LOCKED');
assert(isTransactionLockedForMantri(top_returned) === false, 'IT-GL-10: Topping returned -> EDITABLE');

// IT-GL-11 & IT-GL-12: Modul 6 - Okulasi Grafting
const graft_locked = { docNo: '2026/GRF/001', status: 'DIAJUKAN' };
const graft_returned = { docNo: '2026/GRF/001', status: 'DIKEMBALIKAN' };
assert(isTransactionLockedForMantri(graft_locked) === true, 'IT-GL-11: Okulasi Grafting submitted -> LOCKED');
assert(isTransactionLockedForMantri(graft_returned) === false, 'IT-GL-12: Okulasi Grafting returned -> EDITABLE');

// IT-GL-13 & IT-GL-14: Modul 7 - Okulasi Regrafting
const regraft_locked = { docNo: '2026/RGRF/001', status: 'MENUNGGU_VERIFIKASI' };
const regraft_returned = { docNo: '2026/RGRF/001', status: 'DIKEMBALIKAN' };
assert(isTransactionLockedForMantri(regraft_locked) === true, 'IT-GL-13: Okulasi Regrafting submitted -> LOCKED');
assert(isTransactionLockedForMantri(regraft_returned) === false, 'IT-GL-14: Okulasi Regrafting returned -> EDITABLE');

// Modul 8 - Pemeriksaan Okulasi
const ok_insp_locked = { docNo: '2026/OKL-INS/001', verificationStatus: 'TERVERIFIKASI' };
const ok_insp_returned = { docNo: '2026/OKL-INS/001', status: 'DIKEMBALIKAN' };
assert(isTransactionLockedForMantri(ok_insp_locked) === true, 'Modul 8: Pemeriksaan Okulasi verified -> LOCKED');
assert(isTransactionLockedForMantri(ok_insp_returned) === false, 'Modul 8: Pemeriksaan Okulasi returned -> EDITABLE');

// Modul 9 - Pemeliharaan (Service Guard Validation)
storage.set('nursery_activity_records', [
  { id: 'ACT-001', docNo: '2026/ACT/001', status: 'MENUNGGU_VERIFIKASI', createdByUserId: 'usr-mantri-1' },
  { id: 'ACT-002', docNo: '2026/ACT/002', status: 'DRAFT', createdByUserId: 'usr-mantri-1' }
]);
const userCtx = { id: 'usr-mantri-1', role: 'MANTRI_TANAMAN' };

const delMaintLocked = deleteMaintenanceRecord('ACT-001', userCtx);
assert(delMaintLocked === false, 'Modul 9: Service Guard deleteMaintenanceRecord on locked record ACT-001 is blocked');

const delMaintDraft = deleteMaintenanceRecord('ACT-002', userCtx);
assert(delMaintDraft === true, 'Modul 9: Service Guard deleteMaintenanceRecord on draft record ACT-002 succeeds');

// ---------------------------------------------------------------------------------
// Full Resubmit Lifecycle Cycle
// ---------------------------------------------------------------------------------
console.log('\n--- 3. Full Cycle: Draft -> Submit -> Return -> Edit -> Resubmit -> Lock ---');
let item = { docNo: '2026/APR/999', status: 'DRAFT' };
assert(isTransactionLockedForMantri(item) === false, 'Cycle Step 1: Initial Draft is EDITABLE');

item.status = 'READY_TO_CONFIRM';
item.submissionStatus = 'SUBMITTED_TO_ASB';
assert(isTransactionLockedForMantri(item) === true, 'Cycle Step 2: Submitted to ASB is LOCKED');

item.verificationStatus = 'DIKEMBALIKAN';
item.status = 'DIKEMBALIKAN';
item.submissionStatus = null;
assert(isTransactionLockedForMantri(item) === false, 'Cycle Step 3: Returned by Asisten is EDITABLE');

item.submissionStatus = 'SUBMITTED_TO_ASB';
assert(isTransactionLockedForMantri(item) === true, 'Cycle Step 4: Resubmitted to ASB is LOCKED again');

item.verificationStatus = 'TERVERIFIKASI';
item.status = 'DISETUJUI';
assert(isTransactionLockedForMantri(item) === true, 'Cycle Step 5: Approved by Asisten is PERMANENTLY LOCKED');

console.log('\n====================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
console.log('====================================================');

if (totalTests === passedTests) {
  console.log('ALL INTEGRATION TESTS PASSED SUCCESSFULLY (100%)');
} else {
  process.exit(1);
}
