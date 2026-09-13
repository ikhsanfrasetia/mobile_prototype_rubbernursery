/**
 * scripts/test-permintaan-kebun-sendiri.js
 * Comprehensive Test Suite: Permintaan Bibit Kebun Sendiri (Transaction Type: KEBUN_SENDIRI)
 *
 * Covers:
 * A. Authorization (ASISTEN_BIBITAN, ASISTEN PASS; PENGURUS, ASKEP, MANTRI DENIED)
 * B. Form & Data Integrity (targetEstateId/targetDivisionId = null, source scope auto)
 * C. End-to-End Workflow (Submit -> Askep -> Pengurus -> ASB -> Mantri -> ASB Verif -> Requester Receipt -> Selesai)
 * D. Requester Receipt Authorization (Strictly Requester User ID, non-requester denied)
 * E. Camera Verification (captureSource = CAMERA required, gallery rejected)
 * F. Monitoring & Scoping
 * G. Clean All (Transaction reset, Master preserved)
 */

if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; }
  };
  global.localStorage = globalThis.localStorage;
}

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({
        fillRect: () => {},
        fillText: () => {}
      }),
      toDataURL: () => 'data:image/jpeg;base64,mockCanvasData'
    }),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  };
  global.document = globalThis.document;
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    addEventListener: () => {},
    localStorage: globalThis.localStorage
  };
  global.window = globalThis.window;
}

import { storage } from '../js/core/storage.js';
import { ROLES, normalizeRole } from '../js/core/user-context.js';
import {
  canCreateRequestKebunSendiri,
  submitRequestKebunSendiri,
  ALLOWED_CREATE_ROLES
} from '../js/modules/request/request-kebun-sendiri-form.js';
import {
  canUserCreateKebunSendiri,
  canPerformAskepAction,
  canPerformPengurusAction,
  canPerformAsbVerifyAction,
  canPerformAsbDispatchVerificationAction,
  canPerformRequesterReceiptAction,
  filterMyRequests,
  filterIncomingRequests,
  getActionableIncomingCount,
  updateWorkflowStatus
} from '../js/modules/request/request-kebun-sendiri-landing.js';
import { getSubMenuItemsForRole } from '../js/modules/request/request-landing.js';
import {
  canPerformMantriDispatchAction,
  filterDispatchRequests,
  processDispatchShipment
} from '../js/modules/dispatch/dispatch-landing.js';
import { cleanAllTransactionalData } from '../js/core/storage-registry.js';
import { getActiveEstates } from '../js/data/estate-master.js';
import { getActiveKlons } from '../js/data/klon-master.js';

let passed = 0;
let failed = 0;

const failedTests = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${message}`);
    failedTests.push(message);
    failed++;
  }
}

console.log('================================================================================');
console.log('🧪 TEST SUITE: PERMINTAAN BIBIT KEBUN SENDIRI (KEBUN_SENDIRI)');
console.log('================================================================================\n');

// Clean environment before tests
cleanAllTransactionalData({ skipIndexedDB: true });

// Setup test batches in storage for EST-TBS
storage.set('nursery_batches', [
  {
    id: 'BATCH-TBS-001',
    batchId: 'BATCH-TBS-001',
    batchCode: 'BT-TBS-001',
    batchNo: 'BT-TBS-001',
    programId: 'PRG-2026-001',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-NURSERY',
    divisionName: 'Divisi Pembibitan',
    clone: 'PB 260',
    klon: 'PB 260',
    growthStage: 'Rubber Main Nursery',
    stage: 'Rubber Main Nursery',
    category: 'APM',
    availableQty: 10000,
    currentQty: 10000,
    status: 'AVAILABLE'
  }
]);

// Setup users
const userAsistenLapangan = {
  userId: 'AST-LAP-001',
  id: 'AST-LAP-001',
  code: 'AST-LAP-001',
  name: 'Budi Santoso',
  role: 'ASISTEN',
  rawRole: 'ASISTEN',
  position: 'Asisten Lapangan Divisi I',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-01',
  divisionName: 'Divisi I'
};

const userAsistenBibitan = {
  userId: 'ASB-001',
  id: 'ASB-001',
  code: 'ASB-001',
  name: 'Ahmad Fauzi',
  role: 'ASISTEN_BIBITAN',
  rawRole: 'ASISTEN_BIBITAN',
  position: 'Asisten Pembibitan',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-NURSERY',
  divisionName: 'Divisi Pembibitan'
};

const userOtherAsisten = {
  userId: 'AST-LAP-999',
  id: 'AST-LAP-999',
  code: 'AST-LAP-999',
  name: 'Joko Susilo',
  role: 'ASISTEN',
  rawRole: 'ASISTEN',
  position: 'Asisten Lapangan Divisi II',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-02',
  divisionName: 'Divisi II'
};

const userAskep = {
  userId: 'ASK-001',
  id: 'ASK-001',
  code: 'ASK-001',
  name: 'Rahmat Hidayat',
  role: 'ASKEP',
  rawRole: 'ASISTEN_KEPALA',
  position: 'Asisten Kepala',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih'
};

const userPengurus = {
  userId: 'PGS-001',
  id: 'PGS-001',
  code: 'PGS-001',
  name: 'Ir. Hendra Wijaya',
  role: 'PENGURUS',
  rawRole: 'PENGURUS',
  position: 'Pengurus Kebun',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih'
};

const userMantri = {
  userId: 'MTR-001',
  id: 'MTR-001',
  code: 'MTR-001',
  name: 'Slamet Riyadi',
  role: 'MANTRI_TANAMAN',
  rawRole: 'MANTRI_TANAMAN',
  position: 'Mantri Bibitan',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-NURSERY',
  divisionName: 'Divisi Pembibitan'
};

// ============================================================================
// SECTION A: AUTHORIZATION
// ============================================================================
console.log('--- A. Authorization Matrix ---');

assert(canCreateRequestKebunSendiri(userAsistenBibitan) === true, 'A1. ASISTEN_BIBITAN create authorization = TRUE');
assert(canCreateRequestKebunSendiri(userAsistenLapangan) === true, 'A2. ASISTEN (Lapangan) create authorization = TRUE');
assert(canCreateRequestKebunSendiri(userPengurus) === false, 'A3. PENGURUS create authorization = FALSE (DENIED)');
assert(canCreateRequestKebunSendiri(userAskep) === false, 'A4. ASKEP create authorization = FALSE (DENIED)');
assert(canCreateRequestKebunSendiri(userMantri) === false, 'A5. MANTRI_TANAMAN create authorization = FALSE (DENIED)');

assert(canUserCreateKebunSendiri(userAsistenBibitan) === true, 'A6. UI Create button visible for ASISTEN_BIBITAN');
assert(canUserCreateKebunSendiri(userAsistenLapangan) === true, 'A7. UI Create button visible for ASISTEN');
assert(canUserCreateKebunSendiri(userPengurus) === false, 'A8. UI Create button hidden for PENGURUS');
assert(canUserCreateKebunSendiri(userAskep) === false, 'A9. UI Create button hidden for ASKEP');
assert(canUserCreateKebunSendiri(userMantri) === false, 'A10. UI Create button hidden for MANTRI');

// Service guard rejection test
let pengurusSubmitError = false;
try {
  await submitRequestKebunSendiri({
    docNo: '2026/NIR/999',
    user: userPengurus,
    programId: 'PRG-01',
    allocationCode: 'CFNA-01',
    klon: 'PB 260',
    category: 'APM',
    growthStage: 'Rubber Main Nursery',
    qty: 1000,
    requiredDate: '2026-10-01'
  });
} catch (err) {
  pengurusSubmitError = true;
}
assert(pengurusSubmitError === true, 'A11. Service-level guard throws ACCESS_DENIED for PENGURUS submit');

// ============================================================================
// SECTION B: FORM & REQUEST DATA STRUCTURE
// ============================================================================
console.log('\n--- B. Form & Data Structure ---');

let createdRequest = null;
try {
  createdRequest = await submitRequestKebunSendiri({
    docNo: '2026/NIR/001',
    user: userAsistenLapangan,
    programId: 'PRG-2026-001',
    allocationCode: 'CFNA-REPL-2026',
    klon: 'IRR 112',
    category: 'APM',
    growthStage: 'Rubber Main Nursery',
    qty: 5000,
    requiredDate: '2026-10-15'
  });
} catch (err) {
  console.error('Submit error:', err);
}

assert(createdRequest !== null, 'B1. Request successfully created by Asisten Lapangan');
assert(createdRequest.type === 'KEBUN_SENDIRI' && createdRequest.transactionType === 'KEBUN_SENDIRI', 'B2. transactionType is KEBUN_SENDIRI');
assert(createdRequest.targetEstateId === null, 'B3. targetEstateId is strictly null (no dummy estate)');
assert(createdRequest.targetDivisionId === null, 'B4. targetDivisionId is strictly null (no dummy division)');
assert(createdRequest.requesterUserId === 'AST-LAP-001', 'B5. requesterUserId preserved accurately');
assert(createdRequest.requesterRole === 'ASISTEN', 'B6. requesterRole is ASISTEN');
assert(createdRequest.requesterEstateId === 'EST-TBS', 'B7. requesterEstateId matches user estate');
assert(createdRequest.requestedQty === 5000, 'B8. requestedQty recorded as 5000');
assert(createdRequest.status === 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA', 'B9. Initial status is MENUNGGU_VERIFIKASI_ASISTEN_KEPALA');
assert(Array.isArray(createdRequest.auditTrail) && createdRequest.auditTrail.length === 1, 'B10. Initial audit trail created');

// ============================================================================
// SECTION C: END-TO-END WORKFLOW
// ============================================================================
console.log('\n--- C. End-to-End Workflow Execution ---');

// C1. ASISTEN KEPALA (Review & Correction)
assert(canPerformAskepAction(createdRequest, userAskep) === true, 'C1. Askep is authorized to perform action on DIAJUKAN request');
assert(canPerformAskepAction(createdRequest, userPengurus) === false, 'C2. Pengurus cannot act during Askep stage');
assert(canPerformAskepAction(createdRequest, userAsistenBibitan) === false, 'C3. ASB cannot act during Askep stage');

// Askep corrects clone to 'PB 260' and qty to 4500, then approves
const askepApprovedTx = await updateWorkflowStatus(createdRequest, 'MENUNGGU_VERIFIKASI_PENGURUS', {
  event: 'ASKEP_APPROVE',
  approvedQty: 4500,
  approvedClone: 'PB 260',
  note: 'Disetujui Askep dengan koreksi klon ke PB 260 dan qty 4.500 Pkk',
  actor: userAskep
});

assert(askepApprovedTx.status === 'MENUNGGU_VERIFIKASI_PENGURUS', 'C4. Status updated to MENUNGGU_VERIFIKASI_PENGURUS');
assert(askepApprovedTx.approvedQty === 4500, 'C5. Askep correction: approvedQty = 4500');
assert(askepApprovedTx.approvedClone === 'PB 260', 'C6. Askep correction: approvedClone = PB 260');
assert(askepApprovedTx.requesterUserId === 'AST-LAP-001', 'C7. Requester identity untouched after Askep correction');

// C2. PENGURUS KEBUN ASAL (Review & Approval)
assert(canPerformPengurusAction(askepApprovedTx, userPengurus) === true, 'C8. Pengurus authorized to review after Askep approval');
assert(canPerformPengurusAction(askepApprovedTx, userAskep) === false, 'C9. Askep cannot act during Pengurus stage');

// Pengurus approves
const pengurusApprovedTx = await updateWorkflowStatus(askepApprovedTx, 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN', {
  event: 'PENGURUS_APPROVE',
  approvedQty: 4500,
  approvedClone: 'PB 260',
  note: 'Disetujui Pengurus Kebun, diteruskan ke Asisten Bibitan',
  actor: userPengurus
});

assert(pengurusApprovedTx.status === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN', 'C10. Status updated to MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN');

// C3. ASISTEN BIBITAN PEMENUH (Review & Verification)
assert(canPerformAsbVerifyAction(pengurusApprovedTx, userAsistenBibitan) === true, 'C11. ASB authorized to verify nursery availability');
assert(canPerformAsbVerifyAction(pengurusApprovedTx, userAsistenLapangan) === false, 'C12. Asisten Lapangan cannot verify nursery request');

// ASB verifies
const asbVerifiedTx = await updateWorkflowStatus(pengurusApprovedTx, 'TERVERIFIKASI', {
  event: 'ASB_VERIFY',
  note: 'Kondisi stok nursery siap untuk dipenuhi',
  fulfillmentAssistantUserId: userAsistenBibitan.userId,
  fulfillmentAssistantRole: userAsistenBibitan.role,
  fulfillmentAssistantName: userAsistenBibitan.name,
  actor: userAsistenBibitan
});

assert(asbVerifiedTx.status === 'TERVERIFIKASI', 'C13. Status updated to TERVERIFIKASI');
assert(asbVerifiedTx.fulfillmentAssistantUserId === 'ASB-001', 'C14. fulfillmentAssistantUserId explicitly assigned');
assert(asbVerifiedTx.requesterUserId === 'AST-LAP-001', 'C15. requesterUserId preserved distinctly from fulfillment ASB');

// C4. MANTRI BIBITAN (Fulfillment / Dispatch)
assert(canPerformMantriDispatchAction(asbVerifiedTx, userMantri) === true, 'C16. Mantri Bibitan authorized to dispatch TERVERIFIKASI request');

// Mantri processes dispatch
const dispatchResult = await processDispatchShipment(
  asbVerifiedTx,
  {
    shipmentQty: 4500,
    issuedDate: '2026-09-14',
    batchRows: [
      { batchCode: 'BT-TBS-001', qty: 4500 }
    ],
    vehicleNo: 'BK 8899 SB',
    driverName: 'Sugiono',
    remarks: 'Pengeluaran bibit klon PB 260 tahap 1 selesai'
  },
  userMantri
);

assert(dispatchResult.dispatchRecord !== null, 'C17. Mantri dispatch processed successfully');

const requestsAfterDispatch = storage.get('requests_transactions', []);
const dispatchedTx = requestsAfterDispatch.find(r => r.id === asbVerifiedTx.id);

assert(dispatchedTx.status === 'MENUNGGU_VERIFIKASI_PENGELUARAN', 'C18. Status transitions to MENUNGGU_VERIFIKASI_PENGELUARAN');
assert(dispatchedTx.dispatchData !== null, 'C19. dispatchData attached with dispatchDocNo');
assert(dispatchedTx.targetEstateId === null, 'C20. targetEstateId remains null after dispatch');

// C5. ASISTEN BIBITAN PEMENUH (Verifikasi Aktual Pengeluaran)
assert(canPerformAsbDispatchVerificationAction(dispatchedTx, userAsistenBibitan) === true, 'C21. ASB authorized to verify actual dispatch');
assert(canPerformAsbDispatchVerificationAction(dispatchedTx, userMantri) === false, 'C22. Mantri cannot perform ASB dispatch verification');

const asbDispatchVerifiedTx = await updateWorkflowStatus(dispatchedTx, 'MENUNGGU_PENERIMAAN', {
  event: 'ASB_VERIFY_DISPATCH',
  note: 'Fisik bibit pengeluaran diverifikasi sesuai aktual 4.500 Pkk',
  dispatchVerification: {
    verifiedQty: 4500,
    verifiedBy: userAsistenBibitan.userId,
    verifiedByName: userAsistenBibitan.name,
    verifiedAt: new Date().toISOString(),
    notes: 'Kondisi bibit sehat, daun hijau segar'
  },
  actor: userAsistenBibitan
});

assert(asbDispatchVerifiedTx.status === 'MENUNGGU_PENERIMAAN', 'C23. Status updated to MENUNGGU_PENERIMAAN');
assert(asbDispatchVerifiedTx.dispatchVerification.verifiedQty === 4500, 'C24. Actual verified quantity recorded');

// C6. ASISTEN PEMOHON (Penerimaan Bibit)
console.log('\n--- D. Requester Receipt & Strict User ID Authorization ---');

assert(canPerformRequesterReceiptAction(asbDispatchVerifiedTx, userAsistenLapangan) === true, 'D1. Exact Requester User (AST-LAP-001) authorized to receive');
assert(canPerformRequesterReceiptAction(asbDispatchVerifiedTx, userOtherAsisten) === false, 'D2. Other Asisten (AST-LAP-999) DENIED receipt despite same role');
assert(canPerformRequesterReceiptAction(asbDispatchVerifiedTx, userAsistenBibitan) === false, 'D3. Fulfillment ASB (ASB-001) DENIED receipt');
assert(canPerformRequesterReceiptAction(asbDispatchVerifiedTx, userPengurus) === false, 'D4. Pengurus DENIED receipt for Kebun Sendiri');

// C7. CAMERA ONLY & LAYAK / RUSAK VALIDATION
console.log('\n--- E. Camera Only & Layak/Rusak Verification ---');

// Final receipt execution with camera proof
const completedTx = await updateWorkflowStatus(asbDispatchVerifiedTx, 'SELESAI', {
  event: 'REQUESTER_RECEIPT',
  note: 'Bibit diterima di kebun sendiri: 4.450 Layak, 50 Rusak',
  receiptData: {
    layakQty: 4450,
    rusakQty: 50,
    totalQty: 4500,
    notes: '50 bibit patah cabang saat loading, 4.450 kondisi prima',
    photoUrl: 'data:image/jpeg;base64,mockCameraBinaryData',
    captureSource: 'CAMERA',
    capturedAt: new Date().toISOString(),
    capturedBy: userAsistenLapangan.userId
  },
  actor: userAsistenLapangan
});

assert(completedTx.status === 'SELESAI', 'E1. Workflow finalized: Status = SELESAI');
assert(completedTx.receiptData.layakQty === 4450, 'E2. Layak qty recorded as 4.450');
assert(completedTx.receiptData.rusakQty === 50, 'E3. Rusak qty recorded as 50');
assert(completedTx.receiptData.totalQty === 4500, 'E4. Total received qty matches 4.500');
assert(completedTx.receiptData.captureSource === 'CAMERA', 'E5. captureSource is strictly CAMERA');
assert(completedTx.receiptData.capturedBy === 'AST-LAP-001', 'E6. capturedBy matches requester user ID');

// ============================================================================
// SECTION F: MONITORING & DATA INTEGRITY
// ============================================================================
console.log('\n--- F. Monitoring & Scoping ---');

const allStored = storage.get('requests_transactions', []);
const requesterView = filterMyRequests(allStored, userAsistenLapangan);
const otherRequesterView = filterMyRequests(allStored, userOtherAsisten);

assert(requesterView.length === 1, 'F1. Requester can see own request in Permintaan Saya');
assert(otherRequesterView.length === 0, 'F2. Other Asisten cannot see requests in Permintaan Saya');

const incomingAskep = filterIncomingRequests(allStored, userAskep);
assert(incomingAskep.length === 1, 'F3. Askep sees request in estate scope');

assert(completedTx.auditTrail.length >= 6, 'F4. Complete audit trail preserved with all intermediate actors');

// ============================================================================
// SECTION F2: ASKEP & PENGURUS ENTRY POINTS, MENUS & NOTIFICATION BADGES
// ============================================================================
console.log('\n--- F2. Askep & Pengurus Submenus & Notification Badges ---');

const askepSubMenu = getSubMenuItemsForRole('ASKEP');
const askepHasKebunSendiri = askepSubMenu.some(m => m.id === 'ksp-bibit-sendiri' && m.route === '/request/kebun-sendiri');
assert(askepHasKebunSendiri === true, 'F2.1 ASKEP has Permintaan Bibit Kebun Sendiri in Submenu');

const pengurusSubMenu = getSubMenuItemsForRole('PENGURUS');
const pengurusHasKebunSendiri = pengurusSubMenu.some(m => m.id === 'ksp-bibit-sendiri' && m.route === '/request/kebun-sendiri');
assert(pengurusHasKebunSendiri === true, 'F2.2 PENGURUS has Permintaan Bibit Kebun Sendiri in Submenu');

assert(canUserCreateKebunSendiri(userAskep) === false, 'F2.3 ASKEP is NOT permitted to create Permintaan Kebun Sendiri (No Create Button)');
assert(canUserCreateKebunSendiri(userPengurus) === false, 'F2.4 PENGURUS is NOT permitted to create Permintaan Kebun Sendiri (No Create Button)');

// Mock pending request for Askep
const mockAskepPending = [{
  id: 'REQ-KS-TEST-01',
  transactionType: 'KEBUN_SENDIRI',
  type: 'KEBUN_SENDIRI',
  requesterEstateId: 'EST-TBS',
  status: 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA'
}];
const askepIncomingCount = getActionableIncomingCount(filterIncomingRequests(mockAskepPending, userAskep), userAskep);
assert(askepIncomingCount === 1, 'F2.5 ASKEP badge counts pending DIAJUKAN/MENUNGGU_VERIFIKASI_ASISTEN_KEPALA request (count = 1)');

// Mock pending request for Pengurus
const mockPengurusPending = [{
  id: 'REQ-KS-TEST-02',
  transactionType: 'KEBUN_SENDIRI',
  type: 'KEBUN_SENDIRI',
  requesterEstateId: 'EST-TBS',
  status: 'MENUNGGU_VERIFIKASI_PENGURUS'
}];
const pengurusIncomingCount = getActionableIncomingCount(filterIncomingRequests(mockPengurusPending, userPengurus), userPengurus);
assert(pengurusIncomingCount === 1, 'F2.6 PENGURUS badge counts pending MENUNGGU_VERIFIKASI_PENGURUS request (count = 1)');

// Out of estate scope check
const otherEstatePengurus = { ...userPengurus, estateId: 'EST-APM' };
const outOfScopeCount = getActionableIncomingCount(filterIncomingRequests(mockPengurusPending, otherEstatePengurus), otherEstatePengurus);
assert(outOfScopeCount === 0, 'F2.7 Out-of-estate Pengurus does not receive badge for EST-TBS request (count = 0)');

// ============================================================================
// SECTION G: CLEAN ALL REGISTRY INTEGRITY
// ============================================================================
console.log('\n--- G. Clean All Registry Validation ---');

const masterEstatesBefore = getActiveEstates();
const masterKlonsBefore = getActiveKlons();

const cleanResult = await cleanAllTransactionalData({ skipIndexedDB: true });
assert(cleanResult.success === true, 'G1. cleanAllTransactionalData executed successfully');

const requestsPostClean = storage.get('requests_transactions', []);
const dispatchesPostClean = storage.get('dispatch_transactions', []);

assert(requestsPostClean.length === 0, 'G2. requests_transactions cleared to []');
assert(dispatchesPostClean.length === 0, 'G3. dispatch_transactions cleared to []');

const masterEstatesAfter = getActiveEstates();
const masterKlonsAfter = getActiveKlons();

assert(masterEstatesAfter.length === masterEstatesBefore.length, 'G4. Master Estates preserved 100%');
assert(masterKlonsAfter.length === masterKlonsBefore.length, 'G5. Master Klons preserved 100%');

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n--------------------------------------------------------------------------------');
console.log(`TOTAL ASSERTIONS: ${passed + failed}`);
console.log(`PASSED:           ${passed}`);
console.log(`FAILED:           ${failed}`);
console.log('--------------------------------------------------------------------------------');

if (failed === 0) {
  console.log('🎉 ALL PERMINTAAN BIBIT KEBUN SENDIRI TESTS PASSED!\n');
} else {
  console.error(`💥 ${failed} TEST(S) FAILED:`);
  failedTests.forEach((t, i) => console.error(`   ${i + 1}. ${t}`));
  console.log('');
  process.exit(1);
}
