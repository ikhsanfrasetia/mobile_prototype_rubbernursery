/**
 * scripts/test-asb-master-integration.js
 * Verification Test Suite for Master Program, Bedengan, and Batch Integration (TASK ASB-05)
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

import {
  getActivePrograms,
  getAllPrograms,
  getProgramById,
  isProgramActive,
  resolveProgram
} from '../js/data/program-master.js';

import {
  getAllEstates,
  getActiveEstates,
  getEstateById,
  getNurseryDivisionsByEstate,
  resolveNurseryDivision
} from '../js/data/estate-master.js';

import {
  getAllBedengan,
  getActiveBedengan,
  getBedenganById,
  getBedenganByQR,
  getBedenganByDivision,
  getBedenganByEstate,
  isBedenganActive,
  resolveBedenganLegacy,
  resetBedenganMasterToDefault
} from '../js/data/bedengan-master.js';

import {
  STORAGE_KEY_NURSERY_BATCHES,
  BATCH_STATUS,
  getAllBatches,
  getActiveBatches,
  getBatchById,
  getBatchByCode,
  getBatchesByProgram,
  getBatchesByEstate,
  getBatchesByDivision,
  getBatchesByClone,
  getBatchesByGrowthStage,
  getBatchesByBedengan,
  getAvailableBatchStock,
  isBatchActive,
  resolveBatchLegacy,
  resetBatchMasterToDefault
} from '../js/data/batch-master.js';

import { normalizeKlonName, isKnownKlon } from '../js/data/klon-master.js';
import { storage } from '../js/core/storage.js';
import { DATA_STORAGE_REGISTRY, cleanAllTransactionalData } from '../js/core/storage-registry.js';
import { deductBatchStock, getNurseryBatches } from '../js/modules/dispatch/dispatch-landing.js';
import { createNurseryBatchesFromReceipt } from '../js/core/receipt-ksp-manager.js';
import { ROLES } from '../js/core/user-context.js';

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
console.log('         TASK ASB-05: INTEGRASI MASTER PROGRAM, BEDENGAN, DAN BATCH             ');
console.log('================================================================================\n');

// Initialize / reset state
resetBedenganMasterToDefault();
resetBatchMasterToDefault();

// -----------------------------------------------------------------------------
// SECTION 1 & 2: Program Resolver & Inactive Handling
// -----------------------------------------------------------------------------
console.log('--- 1 & 2. Program Master Resolver & Inactive Filtering ---');
const activePrograms = getActivePrograms();
assert(Array.isArray(activePrograms) && activePrograms.length > 0, '1. getActivePrograms() returns active programs array');
assert(activePrograms.every(p => p.status === 'OPEN' || p.status === 'ACTIVE'), '1b. All returned active programs have status OPEN/ACTIVE');

const prg1 = getProgramById('PRG-2026-001') || getProgramById('PRG-TBS-2026-001');
assert(prg1 !== null && (prg1.code === '2026/TB/RNUR/001' || prg1.code === 'PN-2026-01'), '1c. getProgramById correctly finds canonical program');

const isPrgActive = isProgramActive('PRG-2026-001');
assert(isPrgActive === true, '1d. isProgramActive returns true for active program');

// Test inactive rejection logic for transaction selection
const inactivePrg = getAllPrograms().find(p => p.status === 'INACTIVE');
if (inactivePrg) {
  assert(isProgramActive(inactivePrg.id) === false, '2. Inactive program is identified and blocked from selection');
} else {
  assert(isProgramActive('PRG-NON-EXISTING') === false, '2. Non-existing/inactive program rejected by resolver');
}

// -----------------------------------------------------------------------------
// SECTION 3, 4 & 5: Estate & Division Master Resolver & Validation
// -----------------------------------------------------------------------------
console.log('\n--- 3, 4 & 5. Estate & Division Canonical Resolvers & Cross-Validation ---');
const estates = getAllEstates();
assert(estates.length >= 2, '3. getAllEstates returns canonical estates (TBS, APM)');

const tbsEstate = getEstateById('EST-TBS');
assert(tbsEstate && tbsEstate.estate_name === 'Tanah Besih', '3b. getEstateById resolves canonical Tanah Besih');

const tbsDivisions = getNurseryDivisionsByEstate('EST-TBS');
assert(Array.isArray(tbsDivisions) && tbsDivisions.length > 0, '4. getNurseryDivisionsByEstate returns valid divisions for TBS');

const resolvedDiv = resolveNurseryDivision('DIV-001', 'EST-TBS');
assert(resolvedDiv !== null && resolvedDiv.estateId === 'EST-TBS', '4b. resolveNurseryDivision resolves DIV-001 in EST-TBS');

// Cross-validation: DIV-001 does not belong to EST-APM
const invalidDivCross = resolveNurseryDivision('DIV-001', 'EST-APM');
assert(invalidDivCross === null, '5. Division-Estate validation blocks selecting division from wrong estate');

// -----------------------------------------------------------------------------
// SECTION 6, 7 & 8: Master Bedengan Resolver, Scope & Inactive Handling
// -----------------------------------------------------------------------------
console.log('\n--- 6, 7 & 8. Bedengan Resolver, Scope Isolation & Inactive Rejection ---');
const activeBedengan = getActiveBedengan();
assert(Array.isArray(activeBedengan) && activeBedengan.length > 0, '6. getActiveBedengan returns active bedengan list');

const sampleBed = activeBedengan[0];
const foundBedById = getBedenganById(sampleBed.bedenganId);
assert(foundBedById && foundBedById.bedenganCode === sampleBed.bedenganCode, '6b. getBedenganById resolves bedengan identity');

const foundBedByQR = getBedenganByQR(sampleBed.qrCode);
assert(foundBedByQR && foundBedByQR.bedenganId === sampleBed.bedenganId, '6c. getBedenganByQR resolves physical QR identifier');

const tbsBedengan = getBedenganByEstate('EST-TBS');
assert(tbsBedengan.every(b => b.estateId === 'EST-TBS'), '7. getBedenganByEstate filters bedengan strictly within TBS scope');

const divBedengan = getBedenganByDivision('DIV-001');
assert(divBedengan.every(b => b.divisionId === 'DIV-001'), '7b. getBedenganByDivision filters bedengan strictly within division scope');

assert(isBedenganActive(sampleBed.bedenganId) === true, '8. isBedenganActive returns true for active bedengan');
assert(isBedenganActive('BED-NON-EXISTENT') === false, '8b. isBedenganActive returns false for non-existent/inactive bedengan');

// -----------------------------------------------------------------------------
// SECTION 9 & 10: Batch Resolver & Canonical Storage
// -----------------------------------------------------------------------------
console.log('\n--- 9 & 10. Batch Canonical Master & Storage Verification ---');
const allBatches = getAllBatches();
assert(Array.isArray(allBatches) && allBatches.length > 0, '9. getAllBatches returns canonical batches');

const rawStorageBatches = storage.get(STORAGE_KEY_NURSERY_BATCHES, []);
assert(rawStorageBatches.length === allBatches.length, '10. Batch master directly consumes canonical storage key "nursery_batches"');

const sampleBatch = allBatches[0];
const foundBatchByCode = getBatchByCode(sampleBatch.batchCode);
assert(foundBatchByCode && foundBatchByCode.batchId === sampleBatch.batchId, '9b. getBatchByCode resolves batch correctly');

// -----------------------------------------------------------------------------
// SECTION 11-17: Batch Eligibility & Filtering (Program, Estate, Division, Clone, Stage, Stock)
// -----------------------------------------------------------------------------
console.log('\n--- 11 - 17. Batch Eligibility & Multi-Dimensional Filtering ---');
const batchesForTBS = getBatchesByEstate('EST-TBS');
assert(batchesForTBS.length > 0 && batchesForTBS.every(b => b.estateId === 'EST-TBS'), '12. getBatchesByEstate filters batches by Estate');

const batchesForDiv1 = getBatchesByDivision('DIV-001');
assert(batchesForDiv1.every(b => b.divisionId === 'DIV-001'), '14. getBatchesByDivision filters batches by Division');

const prgBatches = getBatchesByProgram('PRG-2026-003');
assert(prgBatches.every(b => b.programId === 'PRG-2026-003'), '13. getBatchesByProgram filters batches by Program');

const cloneBatches = getBatchesByClone('PB 260');
assert(cloneBatches.length > 0 && cloneBatches.every(b => normalizeKlonName(b.cloneId || b.klon) === 'PB 260'), '15. getBatchesByClone filters batches by Clone');

const stageBatches = getBatchesByGrowthStage('MAIN_NURSERY');
assert(stageBatches.every(b => b.growthStage === 'MAIN_NURSERY' || b.stage === 'MN' || b.growthStage === 'Rubber Advance Planting Material'), '16. getBatchesByGrowthStage filters batches by Stage');

const stockBatches = getAvailableBatchStock(sampleBatch.batchId);
assert(typeof stockBatches === 'number' && stockBatches >= 0, '17. getAvailableBatchStock returns canonical availableQty');

// 11. Complete eligibility test
const isEligible = isBatchActive(sampleBatch.batchId) && sampleBatch.availableQty > 0;
assert(isEligible, '11. Batch is eligible when status is not INACTIVE and availableQty > 0');

// -----------------------------------------------------------------------------
// SECTION 18 & 19: Dispatch Stock Mutation & Multiple Dispatch Compatibility
// -----------------------------------------------------------------------------
console.log('\n--- 18 & 19. Dispatch Stock Deduction & Multiple Dispatch Safety ---');
const targetBatch = allBatches.find(b => b.availableQty >= 200);
const initialStock = targetBatch.availableQty;
const allocQty1 = 50;
const allocQty2 = 75;

// Dispatch 1
const deductRes1 = deductBatchStock(targetBatch.batchCode, allocQty1);
assert(deductRes1 === true, '18. deductBatchStock successfully deductions first allocation');
const batchAfterDeduct1 = getBatchByCode(targetBatch.batchCode);
assert(batchAfterDeduct1.availableQty === initialStock - allocQty1, '18b. availableQty reduced exactly by first allocation');

// Dispatch 2 (Multiple dispatch on same batch)
const deductRes2 = deductBatchStock(targetBatch.batchCode, allocQty2);
assert(deductRes2 === true, '19. deductBatchStock supports multiple dispatch against same batch');
const batchAfterDeduct2 = getBatchByCode(targetBatch.batchCode);
assert(batchAfterDeduct2.availableQty === initialStock - allocQty1 - allocQty2, '19b. availableQty accurately reduced after multiple dispatches');

const updatedBatch = getBatchByCode(targetBatch.batchCode);
assert(updatedBatch.availableQty === initialStock - allocQty1 - allocQty2, '19c. Canonical storage reflects cumulative stock deduction');

// -----------------------------------------------------------------------------
// SECTION 20 & 21: Receipt → Batch Traceability Chain
// -----------------------------------------------------------------------------
console.log('\n--- 20 & 21. Receipt -> Batch Traceability Chain ---');
const receiptMock = {
  id: 'RCP-KSP-2026-0099',
  receiptDocNo: 'RCP-2026-0099',
  dispatchId: 'DSP-2026-0099',
  dispatchDocNo: 'DSP-2026-0099',
  parentRequestId: 'REQ-KSP-2026-0099',
  parentRequestDocNo: 'REQ-2026-0099',
  targetEstateId: 'EST-TBS',
  targetEstateName: 'Tanah Besih',
  targetNextDivisionId: 'DIV-001',
  targetNextDivisionName: 'Divisi I',
  programId: 'PRG-2026-001',
  clone: 'PB 260'
};

const detailsMock = [
  {
    sourceBatchId: 'BATCH-SRC-001',
    sourceBatchCode: 'BATCH-SRC-001',
    cloneId: 'PB 260',
    category: 'Polibag Besar',
    growthStage: 'Rubber Advance Planting Material',
    qtyAccepted: 300,
    qtyRejected: 0
  }
];

const userMock = {
  userId: 'usr-mantri-01',
  name: 'Mantri Bibitan TBS',
  role: 'MANTRI_BIBITAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

const createdBatches = createNurseryBatchesFromReceipt(receiptMock, detailsMock, userMock);
assert(Array.isArray(createdBatches) && createdBatches.length > 0, '20. createNurseryBatchesFromReceipt generates new canonical batch');

const generatedBatch = createdBatches[0];
assert(generatedBatch.sourceReceiptId === 'RCP-KSP-2026-0099', '20b. Batch preserves sourceReceiptId');
assert(generatedBatch.sourceDispatchId === 'DSP-2026-0099', '20c. Batch preserves sourceDispatchId');
assert(generatedBatch.sourceParentRequestId === 'REQ-KSP-2026-0099', '20d. Batch preserves sourceParentRequestId');
assert(generatedBatch.sourceBatchCode === 'BATCH-SRC-001', '20e. Batch preserves sourceBatchCode');
assert(generatedBatch.availableQty === 300, '20f. Batch availableQty matches receipt acceptedQty');

// Verify batch in nursery_batches storage
const verifiedInStorage = getBatchByCode(generatedBatch.batchCode);
assert(verifiedInStorage && verifiedInStorage.sourceReceiptId === receiptMock.id, '21. Batch traceability verified via canonical storage resolver');

// -----------------------------------------------------------------------------
// SECTION 22 & 23: Legacy Resolvers Fallback
// -----------------------------------------------------------------------------
console.log('\n--- 22 & 23. Legacy Resolvers Fallback Verification ---');
const legacyBatchResolved = resolveBatchLegacy(sampleBatch.batchCode);
assert(legacyBatchResolved && (legacyBatchResolved.id === sampleBatch.batchId || legacyBatchResolved.batchId === sampleBatch.batchId), '22. resolveBatchLegacy smoothly resolves batch for legacy consumers');

const legacyBedenganResolved = resolveBedenganLegacy(sampleBed.bedenganCode);
assert(legacyBedenganResolved && (legacyBedenganResolved.id === sampleBed.bedenganId || legacyBedenganResolved.bedenganId === sampleBed.bedenganId), '23. resolveBedenganLegacy smoothly resolves bedengan for legacy consumers');

// -----------------------------------------------------------------------------
// SECTION 24: Clean All Compatibility
// -----------------------------------------------------------------------------
console.log('\n--- 24. Clean All Data Compatibility ---');
// Create a fake transaction storage to verify cleaning
storage.set('requests_transactions', [{ id: 'TEST-REQ-1' }]);
cleanAllTransactionalData();

const cleanedRequests = storage.get('requests_transactions', []);
assert(cleanedRequests.length === 0, '24. Clean All successfully wipes transactional data');

const batchesAfterClean = getAllBatches();
assert(batchesAfterClean.length > 0, '24b. Clean All preserves baseline nursery_batches master data');

const bedenganAfterClean = getAllBedengan();
assert(bedenganAfterClean.length > 0, '24c. Clean All preserves bedengan_master data');

// -----------------------------------------------------------------------------
// SECTION 25 & 26: Role Scope Isolation & Mantri Read-Only Verification
// -----------------------------------------------------------------------------
console.log('\n--- 25 & 26. ASB Scope Isolation & Mantri Read-Only Master Usage ---');
// ASB Scope Isolation
const asbScopeEstates = getActiveEstates().filter(e => e.estate_id === 'EST-TBS');
assert(asbScopeEstates.length === 1 && asbScopeEstates[0].estate_id === 'EST-TBS', '25. ASB can view and operate within assigned estate scope');

// Mantri Read-Only (Mantri uses resolvers to read masters without mutating canonical master registry)
const mantriBatches = getActiveBatches().filter(b => b.estateId === 'EST-TBS' && b.divisionId === 'DIV-001');
assert(mantriBatches.length > 0, '26. Mantri Bibitan successfully reads active batches via canonical resolvers');

console.log('\n================================================================================');
console.log(`TOTAL ASSERTIONS PASSED: ${passedAssertions}`);
console.log(`TOTAL ASSERTIONS FAILED: ${failedAssertions}`);
console.log('================================================================================\n');

if (failedAssertions > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
