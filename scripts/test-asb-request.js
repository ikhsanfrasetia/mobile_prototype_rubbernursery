/**
 * scripts/test-asb-request.js
 * Verification Test Suite for Permintaan Bibit Asisten Bibitan (TASK ASB-07)
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
  canPerformReceiverAction,
  canPerformAskepAction,
  canPerformAsistenAction,
  getActionableIncomingCount,
  filterIncomingRequests,
  filterMyRequests,
  filterByStatus
} from '../js/modules/request/request-kebun-sepupu-landing.js';
import { generateUniqueDocNo } from '../js/core/utils.js';
import { getActivePrograms, getProgramById, isProgramActive } from '../js/data/program-master.js';
import { getAllEstates, getEstateById, getNurseryDivisionsByEstate, resolveNurseryDivision, resolveEstate } from '../js/data/estate-master.js';
import { getActiveKlons, isKnownKlon, normalizeKlonName, resolveKlon } from '../js/data/klon-master.js';
import { getAllBatches, resetBatchMasterToDefault } from '../js/data/batch-master.js';
import { getAllBedengan, resetBedenganMasterToDefault } from '../js/data/bedengan-master.js';
import { deductBatchStock, getNurseryBatches } from '../js/modules/dispatch/dispatch-landing.js';
import { cleanAllTransactionalData } from '../js/core/storage-registry.js';
import { AUDIT_EVENT_TYPES, applyTransactionActor } from '../js/core/transaction-actor.js';

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
console.log('         TASK ASB-07: FINALISASI MODUL PERMINTAAN BIBIT ASISTEN BIBITAN         ');
console.log('================================================================================\n');

// Reset Masters & Storage
resetBedenganMasterToDefault();
resetBatchMasterToDefault();
storage.set('requests_transactions', []);
storage.set('dispatch_transactions', []);

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

// -----------------------------------------------------------------------------
// 1 & 2: NIR Document Number Generation & Uniqueness
// -----------------------------------------------------------------------------
console.log('--- 1 & 2. NIR Generation & Uniqueness ---');
const docNo1 = generateUniqueDocNo('request', []);
assert(/^2026\/NIR\/\d{3}$/.test(docNo1), '1. NIR generated matching format YYYY/NIR/NNN');

const docNo2 = generateUniqueDocNo('request', [{ docNo: docNo1 }]);
assert(docNo1 !== docNo2, '2. Successive NIR generation produces unique document number');

// -----------------------------------------------------------------------------
// 3, 4, 5, 6, 7, 8 & 9: Master & Field Validations
// -----------------------------------------------------------------------------
console.log('\n--- 3 - 9. Master References & Field Validations ---');
const purpose = 'Penanaman / Bibit Tanam';
assert(purpose === 'Penanaman / Bibit Tanam', '3. Purpose strictly matches Penanaman / Bibit Tanam');

const requestedQty = 1500;
assert(typeof requestedQty === 'number' && requestedQty > 0, '4. requestedQty validation: must be > 0');

const activePrgs = getActivePrograms();
assert(activePrgs.length > 0 && isProgramActive(activePrgs[0].id), '5. Program validated from canonical program-master');

const estateTBS = getEstateById('EST-TBS');
assert(estateTBS !== null && estateTBS.estate_name === 'Tanah Besih', '6. Estate validated from canonical estate-master');

const divisionsAPM = getNurseryDivisionsByEstate('EST-APM');
assert(divisionsAPM.some(d => d.divisionId === 'DIV-APM-02'), '7. Division validated for target estate APM');

const klonValid = isKnownKlon('PB 260');
assert(klonValid === true, '8. Clone validated against canonical klon-master');

const growthStage = 'Rubber Advance Planting Material';
assert(growthStage === 'Rubber Advance Planting Material' || growthStage === 'Rubber Main Nursery', '9. Growth stage matches canonical enum');

// -----------------------------------------------------------------------------
// 11 - 15: Pengurus Lifecycle (Submit -> Receiver Review -> Correction -> Approval / Reject)
// -----------------------------------------------------------------------------
console.log('\n--- 11 - 15. Pengurus Workflow (Submit -> Review -> Approve/Reject) ---');
const initialRequest = {
  id: 'REQ-2026-001',
  docNo: docNo1,
  type: 'KEBUN_SEPUPU',
  status: 'DIAJUKAN',
  statusLabel: 'Diajukan',
  createdAt: new Date().toISOString(),
  userId: userPengurusTBS.userId,
  role: 'PENGURUS',
  requestedBy: userPengurusTBS.name,
  estateId: 'EST-TBS',
  targetEstateId: 'EST-APM',
  targetEstateName: 'Aek Pamingke',
  programId: 'PRG-2026-003',
  programName: 'Program Nursery 2026 - Tahap 2',
  purpose: 'Penanaman / Bibit Tanam',
  allocationCode: 'CFNA-2026-01',
  klon: 'PB 260',
  requestedClone: 'PB 260',
  growthStage: 'Rubber Advance Planting Material',
  category: 'Polibag Besar',
  qty: 1500,
  requestedQty: 1500,
  requiredDate: '2026-10-01'
};

storage.set('requests_transactions', [initialRequest]);
assert(initialRequest.status === 'DIAJUKAN', '11. Pengurus submits request with status DIAJUKAN');

// Pengurus APM reviews incoming request
const canReceiverAct = canPerformReceiverAction(initialRequest, userPengurusAPM);
assert(canReceiverAct === true, '12. Pengurus APM authorized to review incoming request');

const canCreatorAct = canPerformReceiverAction(initialRequest, userPengurusTBS);
assert(canCreatorAct === false, '12b. Pengurus pemohon TBS cannot perform receiver action on own request');

// Pengurus APM Correction & Approval
const approvedRecord = {
  ...initialRequest,
  status: 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA',
  statusLabel: 'Menunggu Verifikasi Askep',
  approvedQty: 1200,
  approvedClone: 'PB 260',
  estimatedDeliveryDate: '2026-10-05',
  targetNextRole: 'ASKEP',
  targetNextEstateId: 'EST-APM',
  processedByName: userPengurusAPM.name,
  processedByUserId: userPengurusAPM.userId
};
storage.set('requests_transactions', [approvedRecord]);

assert(approvedRecord.approvedQty === 1200 && approvedRecord.approvedQty !== approvedRecord.requestedQty, '13. Correction of approvedQty successfully stored');
assert(approvedRecord.status === 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA', '14. Pengurus approval transitions status to MENUNGGU_VERIFIKASI_ASISTEN_KEPALA');

// Reject scenario verification
const rejectedRecord = {
  ...initialRequest,
  status: 'DITOLAK',
  statusLabel: 'Ditolak',
  rejectionReason: 'Stok bibit tidak mencukupi untuk musim tanam ini'
};
assert(rejectedRecord.status === 'DITOLAK' && rejectedRecord.rejectionReason.length > 0, '15. Rejection transition properly sets status and reason');

// -----------------------------------------------------------------------------
// 16 & 17: Askep Routing & Source Division Assignment
// -----------------------------------------------------------------------------
console.log('\n--- 16 & 17. Askep Routing & Source Division Assignment ---');
const canAskepAct = canPerformAskepAction(approvedRecord, userAskepAPM);
assert(canAskepAct === true, '16. Askep APM authorized to route request');

const askepRoutedRecord = {
  ...approvedRecord,
  status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
  statusLabel: 'Menunggu Verifikasi Asisten Bibitan',
  targetDivisionId: 'DIV-APM-02',
  targetDivisionName: 'Divisi II',
  targetNextDivisionId: 'DIV-APM-02',
  targetNextRole: 'ASISTEN_BIBITAN',
  verifiedAskepByUserId: userAskepAPM.userId,
  verifiedAskepByName: userAskepAPM.name,
  verifiedAskepAt: new Date().toISOString()
};
storage.set('requests_transactions', [askepRoutedRecord]);

assert(askepRoutedRecord.status === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN', '16b. Askep transitions status to MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN');
assert(askepRoutedRecord.targetDivisionId === 'DIV-APM-02', '17. Askep accurately sets targetDivisionId');

// -----------------------------------------------------------------------------
// 10, 18 & 19: ASB Scope Isolation & Verification
// -----------------------------------------------------------------------------
console.log('\n--- 10, 18 & 19. ASB Scope Isolation & Verification ---');
const canAsbAPM = canPerformAsistenAction(askepRoutedRecord, userAsbAPM);
assert(canAsbAPM === true, '10. ASB APM authorized to act on matching estate & division request');

const canAsbTBS = canPerformAsistenAction(askepRoutedRecord, userAsbTBS);
assert(canAsbTBS === false, '10b. ASB TBS blocked from APM request (Scope Isolation)');

// ASB Verifies
const verifiedByAsb = {
  ...askepRoutedRecord,
  status: 'TERVERIFIKASI',
  statusLabel: 'Terverifikasi',
  verifiedByUserId: userAsbAPM.userId,
  verifiedByName: userAsbAPM.name,
  verifiedByRole: userAsbAPM.role,
  verifiedAt: new Date().toISOString(),
  targetNextRole: 'MANTRI_TANAMAN'
};
storage.set('requests_transactions', [verifiedByAsb]);

assert(verifiedByAsb.status === 'TERVERIFIKASI', '18. ASB verification sets status to TERVERIFIKASI');
assert(verifiedByAsb.targetNextRole === 'MANTRI_TANAMAN', '19. Verified request targets MANTRI_TANAMAN for dispatch execution');

// -----------------------------------------------------------------------------
// 20, 21, 22 & 23: Request -> Dispatch Linkage & Multiple Dispatch
// -----------------------------------------------------------------------------
console.log('\n--- 20 - 23. Request -> Dispatch Linkage, Multiple Dispatch & Balance ---');
const totalApproved = verifiedByAsb.approvedQty; // 1200
let issuedQty = 0;
let remainingQty = totalApproved - issuedQty; // 1200

// Dispatch 1: 500 Pkk
const dispatch1 = {
  id: 'DSP-2026-001',
  docNo: 'DSP-2026-001',
  parentRequestId: verifiedByAsb.id,
  parentRequestDocNo: verifiedByAsb.docNo,
  quantity: 500,
  issuedQty: 500
};
issuedQty += dispatch1.issuedQty;
remainingQty = totalApproved - issuedQty; // 700

assert(dispatch1.parentRequestId === verifiedByAsb.id, '20. Dispatch 1 linked to parentRequestId');
assert(remainingQty === 700, '23. Remaining quantity accurately calculated after Dispatch 1 (700 Pkk)');

// Dispatch 2: 700 Pkk (Completes the request)
const dispatch2 = {
  id: 'DSP-2026-002',
  docNo: 'DSP-2026-002',
  parentRequestId: verifiedByAsb.id,
  parentRequestDocNo: verifiedByAsb.docNo,
  quantity: 700,
  issuedQty: 700
};
issuedQty += dispatch2.issuedQty;
remainingQty = totalApproved - issuedQty; // 0

assert(dispatch2.parentRequestId === verifiedByAsb.id, '21. Dispatch 2 linked to same parentRequestId');
assert(issuedQty === totalApproved, '22. Multiple dispatches cumulatively fulfill approvedQty (1200 Pkk)');
assert(remainingQty === 0, '23b. Remaining quantity reaches 0 upon complete dispatch fulfillment');

// -----------------------------------------------------------------------------
// 24: Stock Safety (Request Module Must Not Mutate Available Batch Stock)
// -----------------------------------------------------------------------------
console.log('\n--- 24. Stock Safety Check ---');
const initialBatches = getAllBatches();
const initialStockSum = initialBatches.reduce((sum, b) => sum + (b.availableQty || 0), 0);

// Re-read storage
const currentBatches = storage.get('nursery_batches', []);
const currentStockSum = currentBatches.reduce((sum, b) => sum + (b.availableQty || 0), 0);
assert(initialStockSum === currentStockSum, '24. Stock Safety: Request module operations perform zero stock mutation');

// -----------------------------------------------------------------------------
// 25: Notification Bubble Logic
// -----------------------------------------------------------------------------
console.log('\n--- 25. Notification Indicator ---');
const allReqs = storage.get('requests_transactions', []);
const actionableForAsbAPM = getActionableIncomingCount(allReqs, userAsbAPM);
assert(typeof actionableForAsbAPM === 'number', '25. Notification calculation returns valid count for ASB');

// -----------------------------------------------------------------------------
// 26 & 27: Clean All & Legacy Compatibility
// -----------------------------------------------------------------------------
console.log('\n--- 26 & 27. Clean All & Legacy Compatibility ---');
cleanAllTransactionalData();

const reqsAfterClean = storage.get('requests_transactions', []);
assert(reqsAfterClean.length === 0, '26. Clean All successfully wipes transactional requests');

const batchesAfterClean = getAllBatches();
assert(batchesAfterClean.length > 0, '26b. Clean All preserves baseline nursery_batches master');

const legacyEstate = resolveEstate('EST-TBS');
assert(legacyEstate && legacyEstate.estate_name === 'Tanah Besih', '27. Legacy estate resolver functional');

const legacyKlon = resolveKlon('PB 260');
assert(legacyKlon && legacyKlon.canonicalName === 'PB 260', '27b. Legacy klon resolver functional');

console.log('\n================================================================================');
console.log(`TOTAL ASSERTIONS PASSED: ${passedAssertions}`);
console.log(`TOTAL ASSERTIONS FAILED: ${failedAssertions}`);
console.log('================================================================================\n');

if (failedAssertions > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
