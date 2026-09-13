/**
 * scripts/test-asb-selection-review.js
 * Verification Test Suite for Pemeriksaan Hasil Seleksi Asisten Bibitan (TASK ASB-09)
 * 
 * Target: 30+ assertions covering:
 * 1. selection record creation
 * 2. batch reference validation
 * 3. bedengan reference validation
 * 4. program reference
 * 5. estate reference
 * 6. division reference
 * 7. selection quantity validation
 * 8. layak validation
 * 9. afkir validation
 * 10. scope ASB isolation
 * 11. actionable status determination
 * 12. ASB approval execution
 * 13. ASB return execution
 * 14. return reason validation
 * 15. approval audit metadata
 * 16. return audit metadata
 * 17. history listing
 * 18. notification / actionable count
 * 19. ZERO stock mutation during review
 * 20. availableQty unchanged
 * 21. currentQty unchanged
 * 22. Clean All data compatibility
 * 23. legacy compatibility
 * 24. duplicate submission handling
 * 25. batch traceability
 * 26. bedengan traceability
 */

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
  global.localStorage = globalThis.localStorage;
}

import { storage } from '../js/core/storage.js';
import {
  SELECTION_STATUS,
  SELECTION_STORAGE_KEY,
  filterSelectionByScope,
  getActionableSelectionCount,
  canPerformAsistenSelectionAction,
  approveSelectionRecord,
  returnSelectionRecord,
  createSelectionRecord,
  validateSelectionData
} from '../js/modules/selection/selection-manager.js';
import { getAllBatches, resetBatchMasterToDefault } from '../js/data/batch-master.js';
import { resetBedenganMasterToDefault } from '../js/data/bedengan-master.js';
import { cleanAllTransactionalData } from '../js/core/storage-registry.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('================================================================================');
console.log('   TASK ASB-09: FINALISASI MODUL PEMERIKSAAN HASIL SELEKSI ASISTEN BIBITAN      ');
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// RESET ENVIRONMENT
// -----------------------------------------------------------------------------
resetBedenganMasterToDefault();
resetBatchMasterToDefault();
storage.set('selection_transactions', []);
storage.set('selection_pool', []);

const userAsbAPM = {
  userId: 'USR-ASB-APM',
  name: 'Asisten Bibitan APM',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02'
};

const userAsbTBS = {
  userId: 'USR-ASB-TBS',
  name: 'Asisten Bibitan TBS',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

const userMantriAPM = {
  userId: 'USR-MNT-APM',
  name: 'Mantri Bibitan APM',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02'
};

const userPengurusAPM = {
  userId: 'USR-PGS-APM',
  name: 'Pengurus APM',
  role: 'PENGURUS',
  estateId: 'EST-APM'
};

console.log('--- 1. SELECTION DATA & VALIDATION TESTS ---');

// 7. selection quantity validation
const valZeroChecked = validateSelectionData({
  jumlahDiperiksa: 0,
  jumlahLayak: 0,
  jumlahAfkir: 0,
  batchId: 'BATCH-APM-001'
});
assert(valZeroChecked.isValid === false, 'Test 7: Rejects zero total checked seedlings');

// 8 & 9. Layak and Afkir validations
const valMismatch = validateSelectionData({
  jumlahDiperiksa: 1000,
  jumlahLayak: 800,
  jumlahAfkir: 100, // Sum = 900 !== 1000
  batchId: 'BATCH-APM-001'
});
assert(valMismatch.isValid === false, 'Test 8: Rejects mismatch between total checked and sum of layak + afkir');

const valValid = validateSelectionData({
  jumlahDiperiksa: 1000,
  jumlahLayak: 950,
  jumlahAfkir: 50,
  batchId: 'BATCH-APM-001'
});
assert(valValid.isValid === true && valValid.pass === 950 && valValid.cull === 50, 'Test 9: Accepts valid checked, layak, and afkir counts');

console.log('\n--- 2. SELECTION SUBMISSION & METADATA REFERENCES ---');

// 1. Selection record creation
const sel1 = createSelectionRecord({
  batchId: 'BATCH-APM-001',
  batchCode: 'B-001',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  divisionId: 'DIV-APM-02',
  divisionName: 'Divisi II',
  programId: 'PRG-2026-003',
  programName: 'Program Peremajaan APM 2026',
  clone: 'IRCA 19',
  growthStage: 'Rubber Advance Planting Material',
  category: 'Polibag Besar',
  bedenganIds: ['BED-APM-D2-001'],
  jumlahDiperiksa: 5000,
  jumlahLayak: 4750,
  jumlahAfkir: 250,
  tanggalSeleksi: '2026-09-13',
  catatan: 'Seleksi tahap pertama bibit siap salur'
}, userMantriAPM);

assert(sel1 && sel1.id && sel1.docNo, 'Test 1: Selection submission record successfully created');

// 2. Batch reference
assert(sel1.batchId === 'BATCH-APM-001' && sel1.batchCode === 'B-001', 'Test 2: Canonical batch reference preserved');

// 3. Bedengan reference
assert(Array.isArray(sel1.bedenganIds) && sel1.bedenganIds.includes('BED-APM-D2-001'), 'Test 3: Canonical bedenganIds array preserved');

// 4. Program reference
assert(sel1.programId === 'PRG-2026-003', 'Test 4: Program reference preserved');

// 5. Estate reference
assert(sel1.estateId === 'EST-APM', 'Test 5: Estate reference accurately stored');

// 6. Division reference
assert(sel1.divisionId === 'DIV-APM-02', 'Test 6: Division reference accurately stored');

// 11. Initial status
assert(sel1.status === SELECTION_STATUS.MENUNGGU_VERIFIKASI, 'Test 11: Initial status is MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN');

console.log('\n--- 3. SCOPE ISOLATION & ACTIONABLE NOTIFICATIONS ---');

// 10. Scope ASB isolation
assert(canPerformAsistenSelectionAction(sel1, userAsbAPM) === true, 'Test 10a: Authorized for ASB in same estate & division');
assert(canPerformAsistenSelectionAction(sel1, userAsbTBS) === false, 'Test 10b: Unauthorized for ASB from different estate');
assert(canPerformAsistenSelectionAction(sel1, userMantriAPM) === false, 'Test 10c: Mantri cannot perform ASB review action');
assert(canPerformAsistenSelectionAction(sel1, userPengurusAPM) === false, 'Test 10d: Pengurus cannot perform ASB review action');

// 18. Notification / Actionable count
const actCountAPM = getActionableSelectionCount(null, userAsbAPM);
const actCountTBS = getActionableSelectionCount(null, userAsbTBS);
assert(actCountAPM === 1, 'Test 18a: Actionable selection count for ASB APM is 1 (triggers red dot)');
assert(actCountTBS === 0, 'Test 18b: Actionable selection count for ASB TBS is 0 (no red dot)');

console.log('\n--- 4. ASISTEN BIBITAN APPROVAL WORKFLOW & AUDIT ---');

// Check batch stock BEFORE review
const batchesBefore = getAllBatches();
const bApmBefore = batchesBefore.find(b => b.id === 'BATCH-APM-001');
const initAvailable = bApmBefore.availableQty;
const initCurrent = bApmBefore.currentQty;

// 12. ASB Approval
const approvedRecord = approveSelectionRecord(sel1.id, 'Hasil seleksi valid sesuai standar agronomi', userAsbAPM);

assert(approvedRecord.status === SELECTION_STATUS.DISETUJUI, 'Test 12: Record status transitions to DISETUJUI');

// 15. Approval audit
assert(approvedRecord.verifiedByUserId === userAsbAPM.userId, 'Test 15a: Approver userId logged in audit trail');
assert(approvedRecord.verifiedByName === userAsbAPM.name, 'Test 15b: Approver name logged');
assert(approvedRecord.verifiedByRole === 'ASISTEN_BIBITAN', 'Test 15c: Approver role logged');
assert(approvedRecord.approvalNotes.includes('sesuai standar'), 'Test 15d: Approval notes accurately saved');

// 19, 20, 21. ZERO STOCK MUTATION (Task Constraint)
const batchesAfterApprove = getAllBatches();
const bApmAfterApprove = batchesAfterApprove.find(b => b.id === 'BATCH-APM-001');
assert(bApmAfterApprove.availableQty === initAvailable, 'Test 19: ZERO stock mutation - availableQty strictly unchanged');
assert(bApmAfterApprove.currentQty === initCurrent, 'Test 20: ZERO stock mutation - currentQty strictly unchanged');
assert(bApmAfterApprove.status === 'AVAILABLE', 'Test 21: Batch status unaffected by selection review');

console.log('\n--- 5. ASISTEN BIBITAN RETURN (REJECT) WORKFLOW & AUDIT ---');

// Create second submission for return test
const sel2 = createSelectionRecord({
  batchId: 'BATCH-APM-001',
  batchCode: 'B-001',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  jumlahDiperiksa: 2000,
  jumlahLayak: 1500,
  jumlahAfkir: 500,
  tanggalSeleksi: '2026-09-13',
  catatan: 'Seleksi bedengan 2'
}, userMantriAPM);

// 14. Return reason validation
let returnFailed = false;
try {
  returnSelectionRecord(sel2.id, '', userAsbAPM);
} catch (e) {
  returnFailed = true;
}
assert(returnFailed === true, 'Test 14: Return rejected if mandatory reason is empty');

// 13. ASB Return execution
const returnedRecord = returnSelectionRecord(sel2.id, 'Jumlah afkir melebihi toleransi, mohon verifikasi ulang di bedengan', userAsbAPM);

assert(returnedRecord.status === SELECTION_STATUS.DIKEMBALIKAN, 'Test 13: Record status transitions to DIKEMBALIKAN');

// 16. Return audit
assert(returnedRecord.returnedByUserId === userAsbAPM.userId, 'Test 16a: Return actor userId logged');
assert(returnedRecord.returnReason.includes('Jumlah afkir melebihi toleransi'), 'Test 16b: Return reason recorded');

// Re-check stock safety after return
const batchesAfterReturn = getAllBatches();
const bApmAfterReturn = batchesAfterReturn.find(b => b.id === 'BATCH-APM-001');
assert(bApmAfterReturn.availableQty === initAvailable, 'Test 20b: Stock remains completely untouched after return action');

console.log('\n--- 6. HISTORY, TRACEABILITY & CLEAN ALL ---');

// 17. History filtering
const allUpdated = storage.get(SELECTION_STORAGE_KEY, []);
const apmHistory = allUpdated.filter(r => r.estateId === 'EST-APM' && (r.status === SELECTION_STATUS.DISETUJUI || r.status === SELECTION_STATUS.DIKEMBALIKAN));
assert(apmHistory.length === 2, 'Test 17: Both approved and returned records visible in historical list');

// 25. Batch traceability
assert(apmHistory.every(r => r.batchId && r.batchCode), 'Test 25: All historical records trace back to source batch');

// 26. Bedengan traceability
assert(apmHistory[0].bedenganIds.length > 0, 'Test 26: Historical record traces back to source bedengan');

// 23. Legacy compatibility
const legacyCount = getActionableSelectionCount([], userAsbAPM);
assert(legacyCount === 0, 'Test 23: Legacy compatibility for empty list handled gracefully');

// 22. Clean All test
cleanAllTransactionalData();

const selectionsAfterClean = storage.get(SELECTION_STORAGE_KEY, []);
const batchesAfterClean = storage.get('nursery_batches', []);

assert(selectionsAfterClean.length === 0, 'Test 22a: Clean All purges selection_transactions');
assert(batchesAfterClean.length > 0, 'Test 22b: Clean All preserves canonical master batches');
assert(batchesAfterClean.find(b => b.id === 'BATCH-APM-001')?.availableQty === 5000, 'Test 22c: Master batch stock intact');

console.log('\n================================================================================');
console.log(`TOTAL ASSERTIONS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('================================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
