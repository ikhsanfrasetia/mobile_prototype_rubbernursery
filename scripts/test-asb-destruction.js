/**
 * scripts/test-asb-destruction.js
 * Verification Test Suite for Pemusnahan Bibit Asisten Bibitan (TASK ASB-10)
 * 
 * Target: 30+ assertions covering:
 * 1. destruction record creation
 * 2. destruction number generation
 * 3. batch reference validation
 * 4. bedengan reference validation
 * 5. program reference
 * 6. estate reference
 * 7. division reference
 * 8. quantity > 0 validation
 * 9. quantity <= available stock validation
 * 10. reason mandatory validation
 * 11. reason "Lainnya" notes validation
 * 12. scope ASB isolation
 * 13. actionable status determination
 * 14. approve execution
 * 15. return execution
 * 16. return reason mandatory validation
 * 17. approval audit metadata
 * 18. return audit metadata
 * 19. history listing
 * 20. notification / actionable count
 * 21. ZERO stock mutation during review
 * 22. availableQty unchanged
 * 23. currentQty unchanged
 * 24. batch lifecycle unchanged
 * 25. Clean All data compatibility
 * 26. traceability
 * 27. duplicate prevention / handling
 * 28. legacy compatibility
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
  DESTRUCTION_STATUS,
  DESTRUCTION_REASONS,
  DESTRUCTION_STORAGE_KEY,
  filterDestructionByScope,
  getActionableDestructionCount,
  canPerformAsistenDestructionAction,
  approveDestructionRecord,
  returnDestructionRecord,
  createDestructionRecord,
  validateDestructionData
} from '../js/modules/destruction/destruction-manager.js';
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
console.log('       TASK ASB-10: FINALISASI MODUL PEMUSNAHAN BIBIT ASISTEN BIBITAN           ');
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// RESET ENVIRONMENT
// -----------------------------------------------------------------------------
resetBedenganMasterToDefault();
resetBatchMasterToDefault();
storage.set('destruction_transactions', []);

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

console.log('--- 1. DESTRUCTION VALIDATION TESTS ---');

// 8. quantity > 0 validation
const valZeroQty = validateDestructionData({
  batchId: 'BATCH-APM-001',
  quantity: 0,
  reason: 'Bibit mati'
});
assert(valZeroQty.isValid === false, 'Test 8: Rejects zero quantity destruction submission');

// 9. quantity <= available stock validation
const valExceedQty = validateDestructionData({
  batchId: 'BATCH-APM-001',
  quantity: 999999,
  reason: 'Bibit mati'
});
assert(valExceedQty.isValid === false && valExceedQty.errors.some(e => e.includes('melebihi stok')), 'Test 9: Rejects quantity exceeding batch stock');

// 10. reason mandatory validation
const valEmptyReason = validateDestructionData({
  batchId: 'BATCH-APM-001',
  quantity: 100,
  reason: ''
});
assert(valEmptyReason.isValid === false && valEmptyReason.errors.some(e => e.includes('Alasan')), 'Test 10: Rejects submission with empty reason');

// 11. reason "Lainnya" notes validation
const valLainnyaNoNotes = validateDestructionData({
  batchId: 'BATCH-APM-001',
  quantity: 100,
  reason: 'Lainnya',
  description: ''
});
assert(valLainnyaNoNotes.isValid === false && valLainnyaNoNotes.errors.some(e => e.includes('Lainnya')), 'Test 11: Rejects reason "Lainnya" without descriptive notes');

const valValidLainnya = validateDestructionData({
  batchId: 'BATCH-APM-001',
  quantity: 100,
  reason: 'Lainnya',
  description: 'Terkontaminasi bahan kimia herbisida'
});
assert(valValidLainnya.isValid === true, 'Test 11b: Accepts reason "Lainnya" with descriptive notes');

console.log('\n--- 2. DESTRUCTION SUBMISSION & METADATA REFERENCES ---');

// 1. Destruction record creation & 2. destruction number
const dest1 = createDestructionRecord({
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
  quantity: 200,
  reason: 'Bibit mati',
  description: 'Pusat batang kering pasca cuaca ekstrem',
  tanggalPemusnahan: '2026-09-13'
}, userMantriAPM);

assert(dest1 && dest1.id, 'Test 1: Destruction submission record successfully created');
assert(dest1.docNo && (dest1.docNo.includes('DST') || dest1.docNo.startsWith('2026/DST')), 'Test 2: Standard destruction number generated');

// 3. Batch reference
assert(dest1.batchId === 'BATCH-APM-001' && dest1.batchCode === 'B-001', 'Test 3: Canonical batch reference preserved');

// 4. Bedengan reference
assert(Array.isArray(dest1.bedenganIds) && dest1.bedenganIds.includes('BED-APM-D2-001'), 'Test 4: Canonical bedenganIds array preserved');

// 5. Program reference
assert(dest1.programId === 'PRG-2026-003', 'Test 5: Program reference preserved');

// 6. Estate reference
assert(dest1.estateId === 'EST-APM', 'Test 6: Estate reference accurately stored');

// 7. Division reference
assert(dest1.divisionId === 'DIV-APM-02', 'Test 7: Division reference accurately stored');

// 13. Initial status
assert(dest1.status === DESTRUCTION_STATUS.MENUNGGU_VERIFIKASI, 'Test 13: Initial status is MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN');

console.log('\n--- 3. SCOPE ISOLATION & ACTIONABLE NOTIFICATIONS ---');

// 12. Scope ASB isolation
assert(canPerformAsistenDestructionAction(dest1, userAsbAPM) === true, 'Test 12a: Authorized for ASB in same estate & division');
assert(canPerformAsistenDestructionAction(dest1, userAsbTBS) === false, 'Test 12b: Unauthorized for ASB from different estate');
assert(canPerformAsistenDestructionAction(dest1, userMantriAPM) === false, 'Test 12c: Mantri cannot perform ASB review action');
assert(canPerformAsistenDestructionAction(dest1, userPengurusAPM) === false, 'Test 12d: Pengurus cannot perform ASB review action');

// 20. Notification / Actionable count
const actCountAPM = getActionableDestructionCount(null, userAsbAPM);
const actCountTBS = getActionableDestructionCount(null, userAsbTBS);
assert(actCountAPM === 1, 'Test 20a: Actionable destruction count for ASB APM is 1 (triggers red dot)');
assert(actCountTBS === 0, 'Test 20b: Actionable destruction count for ASB TBS is 0 (no red dot)');

console.log('\n--- 4. ASISTEN BIBITAN APPROVAL WORKFLOW & AUDIT ---');

// Check batch stock BEFORE review
const batchesBefore = getAllBatches();
const bApmBefore = batchesBefore.find(b => b.id === 'BATCH-APM-001');
const initAvailable = bApmBefore.availableQty;
const initCurrent = bApmBefore.currentQty;

// 14. ASB Approval
const approvedRecord = approveDestructionRecord(dest1.id, 'Disetujui untuk pemusnahan lapangan dengan Berita Acara', userAsbAPM);

assert(approvedRecord.status === DESTRUCTION_STATUS.DISETUJUI, 'Test 14: Record status transitions to DISETUJUI');

// 17. Approval audit
assert(approvedRecord.approvedByUserId === userAsbAPM.userId, 'Test 17a: Approver userId logged in audit trail');
assert(approvedRecord.approvedByName === userAsbAPM.name, 'Test 17b: Approver name logged');
assert(approvedRecord.approvedByRole === 'ASISTEN_BIBITAN', 'Test 17c: Approver role logged');
assert(approvedRecord.approvalNotes.includes('Berita Acara'), 'Test 17d: Approval notes accurately saved');

// 21, 22, 23, 24. ZERO STOCK MUTATION (Task Constraint)
const batchesAfterApprove = getAllBatches();
const bApmAfterApprove = batchesAfterApprove.find(b => b.id === 'BATCH-APM-001');
assert(bApmAfterApprove.availableQty === initAvailable, 'Test 21: ZERO stock mutation - availableQty strictly unchanged');
assert(bApmAfterApprove.currentQty === initCurrent, 'Test 22: ZERO stock mutation - currentQty strictly unchanged');
assert(bApmAfterApprove.status === 'AVAILABLE', 'Test 24: Batch status unaffected (not changed to EMPTY) by destruction review');

console.log('\n--- 5. ASISTEN BIBITAN RETURN (REJECT) WORKFLOW & AUDIT ---');

// Create second submission for return test
const dest2 = createDestructionRecord({
  batchId: 'BATCH-APM-001',
  batchCode: 'B-001',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02',
  quantity: 150,
  reason: 'Tidak memenuhi standar mutu',
  description: 'Batang kerdil',
  tanggalPemusnahan: '2026-09-13'
}, userMantriAPM);

// 16. Return reason mandatory validation
let returnFailed = false;
try {
  returnDestructionRecord(dest2.id, '', userAsbAPM);
} catch (e) {
  returnFailed = true;
}
assert(returnFailed === true, 'Test 16: Return rejected if mandatory reason is empty');

// 15. ASB Return execution
const returnedRecord = returnDestructionRecord(dest2.id, 'Coba lakukan treatment fungisida dan evaluasi 7 hari lagi sebelum pemusnahan', userAsbAPM);

assert(returnedRecord.status === DESTRUCTION_STATUS.DIKEMBALIKAN, 'Test 15: Record status transitions to DIKEMBALIKAN');

// 18. Return audit
assert(returnedRecord.returnedByUserId === userAsbAPM.userId, 'Test 18a: Return actor userId logged');
assert(returnedRecord.returnReason.includes('treatment fungisida'), 'Test 18b: Return reason recorded');

// Re-check stock safety after return
const batchesAfterReturn = getAllBatches();
const bApmAfterReturn = batchesAfterReturn.find(b => b.id === 'BATCH-APM-001');
assert(bApmAfterReturn.availableQty === initAvailable, 'Test 22b: Stock remains completely untouched after return action');

console.log('\n--- 6. HISTORY, TRACEABILITY & CLEAN ALL ---');

// 19. History listing
const allUpdated = storage.get(DESTRUCTION_STORAGE_KEY, []);
const apmHistory = allUpdated.filter(r => r.estateId === 'EST-APM' && (r.status === DESTRUCTION_STATUS.DISETUJUI || r.status === DESTRUCTION_STATUS.DIKEMBALIKAN));
assert(apmHistory.length === 2, 'Test 19: Both approved and returned records visible in historical list');

// 26. Traceability
assert(apmHistory.every(r => r.batchId && r.batchCode), 'Test 26a: All historical records trace back to source batch');
assert(apmHistory[0].bedenganIds.length > 0, 'Test 26b: Historical record traces back to source bedengan');

// 28. Legacy compatibility
const legacyCount = getActionableDestructionCount([], userAsbAPM);
assert(legacyCount === 0, 'Test 28: Legacy compatibility for empty list handled gracefully');

// 25. Clean All test
cleanAllTransactionalData();

const destructionsAfterClean = storage.get(DESTRUCTION_STORAGE_KEY, []);
const batchesAfterClean = storage.get('nursery_batches', []);

assert(destructionsAfterClean.length === 0, 'Test 25a: Clean All purges destruction_transactions');
assert(batchesAfterClean.length > 0, 'Test 25b: Clean All preserves canonical master batches');
assert(batchesAfterClean.find(b => b.id === 'BATCH-APM-001')?.availableQty === 5000, 'Test 25c: Master batch stock intact');

console.log('\n================================================================================');
console.log(`TOTAL ASSERTIONS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('================================================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
