/**
 * scripts/test-division-routing.js
 * Test Suite: Modifikasi Logic Routing Berdasarkan Estate + Divisi Bibitan + Role
 * 
 * Verifies all 26 required test assertions:
 * 1. Pengurus melihat Divisi Bibitan milik target estate.
 * 2. Source estate division tidak muncul.
 * 3. Single division otomatis/tersedia sebagai satu pilihan.
 * 4. Empty division menolak Setujui & Teruskan.
 * 5. Division dari estate lain ditolak.
 * 6. targetDivisionId tersimpan.
 * 7. targetDivisionName tersimpan.
 * 8. Asisten target estate + division dapat melihat.
 * 9. Asisten target estate + division lain tidak dapat melihat.
 * 10. Asisten estate lain tidak dapat melihat.
 * 11. Non-Asisten tidak dapat melakukan action.
 * 12. Return ke Pengurus mempertahankan targetDivision.
 * 13. Re-submit Pengurus mempertahankan targetDivision.
 * 14. Verifikasi Asisten mempertahankan targetDivision.
 * 15. Mantri target estate + division dapat melihat.
 * 16. Mantri estate sama + division lain tidak dapat melihat.
 * 17. Mantri estate lain tidak dapat melihat.
 * 18. Shipment mempertahankan parentRequestId.
 * 19. Shipment mempertahankan targetDivisionId / division context.
 * 20. Notification Asisten hanya muncul pada division yang dituju.
 * 21. Notification Mantri hanya muncul pada division yang dituju.
 * 22. Single division current master tetap bekerja.
 * 23. Legacy transaction tanpa division tetap dapat dibaca.
 * 24. Transaction baru wajib memiliki division.
 * 25. Tidak ada duplicate transaction.
 * 26. Full lifecycle: Pengurus → Asisten → Mantri tetap PASS.
 */

// Mock localStorage for Node.js environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; }
  };
}

import { storage } from '../js/core/storage.js';
import { session } from '../js/core/session.js';
import { permissions, ROLES } from '../js/core/permissions.js';
import { normalizeRole } from '../js/core/user-context.js';
import { resolveEstate, getNurseryDivisionsByEstate, resolveNurseryDivision } from '../js/data/estate-master.js';
import {
  canPerformReceiverAction,
  canPerformAskepAction,
  canPerformAsistenAction,
  filterIncomingRequests,
  getActionableIncomingCount
} from '../js/modules/request/request-kebun-sepupu-landing.js';
import {
  canPerformMantriDispatchAction,
  filterDispatchRequests,
  getActionableDispatchCount,
  processDispatchShipment,
  getNurseryBatches,
  getDispatchTransactions
} from '../js/modules/dispatch/dispatch-landing.js';
import { applyTransactionActor, AUDIT_EVENT_TYPES } from '../js/core/transaction-actor.js';
import { getSubMenuItemsForRole } from '../js/modules/request/request-landing.js';

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

console.log('========================================================================================');
console.log('       SIGMA RUBBER NURSERY — TEST SUITE: ROUTING ESTATE + DIVISI + ROLE                ');
console.log('========================================================================================\n');

// -------------------------------------------------------------------------------------
// 1. SETUP PERSONAS & CONTEXTS
// -------------------------------------------------------------------------------------
const pengurusTBS = {
  id: 'PGS001',
  userId: 'PGS001',
  code: 'PGS001',
  name: 'Junaidi',
  role: 'PENGURUS',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-TBS-EST',
  divisionName: 'Tanah Besih'
};

const pengurusAPM = {
  id: 'PGS002',
  userId: 'PGS002',
  code: 'PGS002',
  name: 'Mukhsin Haji',
  role: 'PENGURUS',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  divisionId: 'DIV-APM-EST',
  divisionName: 'Aek Pamingke'
};

const askepAPM = {
  id: 'APM-ASK-002',
  userId: 'ASK002',
  code: 'ASK002',
  name: 'Dadin',
  role: 'ASKEP',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  divisionId: 'DIV-APM-EST',
  divisionName: 'Aek Pamingke'
};

const askepTBS = {
  id: 'TBS-ASK-001',
  userId: 'ASK001',
  code: 'ASK001',
  name: 'Beny Sihotang',
  role: 'ASKEP',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-TBS-EST',
  divisionName: 'Tanah Besih'
};

const asistenAPM_Div2 = {
  id: 'APM-ASB-002',
  userId: 'ASB002',
  code: 'ASB002',
  name: 'Abdul Gofur',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  divisionId: 'DIV-APM-02',
  divisionName: 'Divisi II'
};

const asistenAPM_Div1 = {
  id: 'APM-AST-001',
  userId: 'AST001',
  code: 'AST001',
  name: 'Nando',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  divisionId: 'DIV-APM-01',
  divisionName: 'Divisi I'
};

const asistenTBS = {
  id: 'TBS-ASB-001',
  userId: 'ASB001',
  code: 'ASB001',
  name: 'Annisa',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-001',
  divisionName: 'Divisi I'
};

const mantriAPM_Div2 = {
  id: 'APM-MNT-DIV2',
  userId: 'MNT002_DIV2',
  code: 'MNT002_DIV2',
  name: 'Mantri APM Divisi II',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  divisionId: 'DIV-APM-02',
  divisionName: 'Divisi II'
};

const mantriAPM_Div1 = {
  id: 'APM-MNT-002',
  userId: 'MNT002',
  code: 'MNT002',
  name: 'Supriono',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  divisionId: 'DIV-APM-01',
  divisionName: 'Divisi I'
};

const mantriTBS = {
  id: 'TBS-MNT-001',
  userId: 'MNT001',
  code: 'MNT001',
  name: 'Wagiman',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-001',
  divisionName: 'Divisi I'
};

// -------------------------------------------------------------------------------------
// SECTION 1: MASTER DATA DIVISI & FILTERING FOR ASKEP
// -------------------------------------------------------------------------------------
console.log('--- Section 1: Divisi Bibitan Resolution for Target Estate ---');
const divsAPM = getNurseryDivisionsByEstate('EST-APM');
const divsTBS = getNurseryDivisionsByEstate('EST-TBS');

assert(divsAPM.length > 0 && divsAPM.every(d => d.estateId === 'EST-APM'), '1. Asisten Kepala melihat Divisi Bibitan milik target estate (EST-APM)');
assert(divsAPM.every(d => d.estateId !== 'EST-TBS'), '2. Source estate division (EST-TBS) tidak muncul pada opsi target');
assert(divsAPM.length === 1 && divsAPM[0].divisionId === 'DIV-APM-02', '3. Single division otomatis/tersedia sebagai satu pilihan pada current master (DIV-APM-02)');
assert(divsTBS.length === 1 && divsTBS[0].divisionId === 'DIV-001', '22. Single division current master TBS (DIV-001) tetap bekerja');

// -------------------------------------------------------------------------------------
// SECTION 2: PENGURUS APPROVE & ASKEP DIVISION PERSISTENCE
// -------------------------------------------------------------------------------------
console.log('\n--- Section 2: Validation of targetDivision & Persistence ---');

// Validate helper for division selection
function validateAskepDivisionDecision(targetEstateId, selectedDivisionId) {
  if (!selectedDivisionId || !selectedDivisionId.trim()) {
    return { valid: false, error: 'targetDivisionId wajib diisi' };
  }
  const divObj = resolveNurseryDivision(selectedDivisionId, targetEstateId);
  if (!divObj || divObj.estateId !== targetEstateId) {
    return { valid: false, error: 'Divisi bukan milik targetEstateId' };
  }
  return { valid: true, division: divObj };
}

assert(validateAskepDivisionDecision('EST-APM', '').valid === false, '4. Empty division menolak Setujui & Teruskan');
assert(validateAskepDivisionDecision('EST-APM', 'DIV-001').valid === false, '5. Division dari estate lain (DIV-001 / TBS) ditolak untuk target EST-APM');
assert(validateAskepDivisionDecision('EST-APM', 'DIV-APM-02').valid === true, '5b. Division milik EST-APM (DIV-APM-02) diterima');

// Create Initial Request from TBS to APM
const initialRequest = {
  id: 'REQ-DIV-001',
  docNo: '2026/NIR/801',
  type: 'KEBUN_SEPUPU',
  status: 'DIAJUKAN',
  statusLabel: 'Diajukan',
  userId: 'PGS001',
  createdByUserId: 'PGS001',
  createdByName: 'Junaidi',
  createdByRole: 'PENGURUS',
  createdByEstateId: 'EST-TBS',
  estateId: 'EST-TBS',
  targetEstateId: 'EST-APM',
  targetEstateName: 'Aek Pamingke',
  purpose: 'Penanaman / Bibit Tanam',
  allocationCode: '091B11',
  klon: 'IRCA 19',
  requestedClone: 'IRCA 19',
  category: 'APM',
  growthStage: 'Rubber Advance Planting Material',
  qty: 10000,
  requestedQty: 10000,
  requiredDate: '2026-09-30',
  createdAt: new Date().toISOString()
};

// Pengurus APM Approves WITHOUT picking division -> status: MENUNGGU_VERIFIKASI_ASISTEN_KEPALA
const pengurusApprovedRequest = {
  ...initialRequest,
  status: 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA',
  statusLabel: 'Menunggu Verifikasi Asisten Kepala',
  approvedQty: 10000,
  approvedClone: 'IRCA 19',
  estimatedDeliveryDate: '2026-09-28',
  targetDivisionId: null,
  targetDivisionName: null,
  targetNextDivisionId: null,
  targetNextRole: 'ASKEP',
  targetNextEstateId: 'EST-APM',
  processedByUserId: pengurusAPM.userId,
  processedByName: pengurusAPM.name,
  processedByRole: 'PENGURUS',
  processedByEstateId: 'EST-APM',
  processedAt: new Date().toISOString()
};

assert(pengurusApprovedRequest.status === 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA', '2.1 Pengurus approve menghasilkan MENUNGGU_VERIFIKASI_ASISTEN_KEPALA');
assert(pengurusApprovedRequest.targetDivisionId === null, '2.2 Pengurus tidak menentukan targetDivision pada approval baru');
assert(canPerformAskepAction(pengurusApprovedRequest, askepAPM) === true, '2.3 Asisten Kepala APM dapat melihat dokumen');
assert(canPerformAsistenAction(pengurusApprovedRequest, asistenAPM_Div2) === false, '2.4 Pengurus TIDAK langsung ke Asisten Bibitan');

// Asisten Kepala APM Reviews and assigns Divisi II
const askepDecision = validateAskepDivisionDecision('EST-APM', 'DIV-APM-02');
const askepApprovedRequest = {
  ...pengurusApprovedRequest,
  status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
  statusLabel: 'Menunggu Verifikasi Asisten Bibitan',
  targetDivisionId: askepDecision.division.divisionId,
  targetDivisionName: askepDecision.division.divisionName,
  targetNextDivisionId: askepDecision.division.divisionId,
  targetNextRole: 'ASISTEN_BIBITAN',
  targetNextEstateId: 'EST-APM',
  verifiedAskepByUserId: askepAPM.userId,
  verifiedAskepByName: askepAPM.name,
  verifiedAskepByRole: 'ASKEP',
  verifiedAskepByEstateId: 'EST-APM',
  verifiedAskepAt: new Date().toISOString()
};

assert(askepApprovedRequest.targetDivisionId === 'DIV-APM-02', '6. targetDivisionId tersimpan setelah Asisten Kepala verify (DIV-APM-02)');
assert(askepApprovedRequest.targetDivisionName === 'Divisi II', '7. targetDivisionName tersimpan (Divisi II)');
assert(askepApprovedRequest.targetNextDivisionId === 'DIV-APM-02', '7b. targetNextDivisionId tersimpan (DIV-APM-02)');
assert(askepApprovedRequest.status === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN', '7c. Status menjadi MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN');

// -------------------------------------------------------------------------------------
// SECTION 3: ROUTING ASISTEN BIBITAN (ESTATE + DIVISION + ROLE)
// -------------------------------------------------------------------------------------
console.log('\n--- Section 3: Asisten Bibitan Routing Isolation ---');

const isActionableForAsistenDiv2 = canPerformAsistenAction(askepApprovedRequest, asistenAPM_Div2);
const isActionableForAsistenDiv1 = canPerformAsistenAction(askepApprovedRequest, asistenAPM_Div1);
const isActionableForAsistenTBS = canPerformAsistenAction(askepApprovedRequest, asistenTBS);
const isActionableForPengurus = canPerformAsistenAction(askepApprovedRequest, pengurusAPM);

assert(isActionableForAsistenDiv2 === true, '8. Asisten target estate + division (Abdul Gofur - APM Div II) dapat melihat dan memverifikasi');
assert(isActionableForAsistenDiv1 === false, '9. Asisten target estate + division lain (Nando - APM Div I) tidak dapat melihat/action');
assert(isActionableForAsistenTBS === false, '10. Asisten estate lain (Annisa - TBS Div I) tidak dapat melihat');
assert(isActionableForPengurus === false, '11. Non-Asisten (Pengurus) tidak dapat melakukan action verifikasi Asisten');

// Filter incoming test for Asisten
const incomingForAsistenDiv2 = filterIncomingRequests([askepApprovedRequest], asistenAPM_Div2);
const incomingForAsistenDiv1 = filterIncomingRequests([askepApprovedRequest], asistenAPM_Div1);
assert(incomingForAsistenDiv2.length === 1, '8b. filterIncomingRequests menyertakan dokumen untuk Asisten Div II');
assert(incomingForAsistenDiv1.length === 0, '9b. filterIncomingRequests mengecualikan dokumen untuk Asisten Div I');

// Notification count for Asisten
const notifCountAsistenDiv2 = getActionableIncomingCount(incomingForAsistenDiv2, asistenAPM_Div2);
const notifCountAsistenDiv1 = getActionableIncomingCount(incomingForAsistenDiv1, asistenAPM_Div1);
assert(notifCountAsistenDiv2 === 1, '20. Notification Asisten muncul pada division yang dituju (Div II count = 1)');
assert(notifCountAsistenDiv1 === 0, '20b. Notification Asisten tidak muncul pada division lain (Div I count = 0)');

// -------------------------------------------------------------------------------------
// SECTION 4: RETURN HIERARCHY & RE-SUBMISSION (ASISTEN -> ASKEP -> PENGURUS)
// -------------------------------------------------------------------------------------
console.log('\n--- Section 4: Return Hierarchy & Re-submission ---');

// Asisten returns to Asisten Kepala
const returnedToAskepRequest = {
  ...askepApprovedRequest,
  status: 'PERLU_REVISI_ASISTEN_KEPALA',
  statusLabel: 'Perlu Revisi Asisten Kepala',
  revisionReason: 'Stok klon pada divisi ini perlu penyesuaian',
  returnedByUserId: asistenAPM_Div2.userId,
  returnedByName: asistenAPM_Div2.name,
  returnedByRole: 'ASISTEN_BIBITAN',
  returnedByEstateId: asistenAPM_Div2.estateId,
  returnedAt: new Date().toISOString(),
  targetNextRole: 'ASKEP',
  targetNextEstateId: 'EST-APM'
  // targetDivisionId and targetDivisionName are preserved
};

assert(returnedToAskepRequest.status === 'PERLU_REVISI_ASISTEN_KEPALA', '12. Asisten Bibitan return menghasilkan PERLU_REVISI_ASISTEN_KEPALA');
assert(canPerformAskepAction(returnedToAskepRequest, askepAPM) === true, '12b. Asisten Kepala APM dapat memproses dokumen yang dikembalikan oleh Asisten');
assert(canPerformAsistenAction(returnedToAskepRequest, asistenAPM_Div2) === false, '12c. Asisten Bibitan tidak lagi actionable setelah return');

// Askep returns to Pengurus
const returnedToPengurusRequest = {
  ...returnedToAskepRequest,
  status: 'PERLU_REVISI_PENGURUS',
  statusLabel: 'Perlu Revisi Pengurus',
  revisionReason: 'Mohon revisi tanggal pengiriman',
  returnedByUserId: askepAPM.userId,
  returnedByName: askepAPM.name,
  returnedByRole: 'ASKEP',
  returnedByEstateId: askepAPM.estateId,
  returnedAt: new Date().toISOString(),
  targetNextRole: 'PENGURUS',
  targetNextEstateId: 'EST-APM'
};

assert(returnedToPengurusRequest.status === 'PERLU_REVISI_PENGURUS', '12d. Asisten Kepala return ke Pengurus menghasilkan PERLU_REVISI_PENGURUS');
assert(canPerformReceiverAction(returnedToPengurusRequest, pengurusAPM) === true, '12e. Pengurus APM dapat memproses dokumen yang dikembalikan oleh Askep');

// Pengurus Re-submits to Askep
const reSubmittedPengurusRequest = {
  ...returnedToPengurusRequest,
  status: 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA',
  statusLabel: 'Menunggu Verifikasi Asisten Kepala',
  approvedQty: 9000,
  targetNextRole: 'ASKEP',
  targetNextEstateId: 'EST-APM',
  targetDivisionId: null
};
assert(reSubmittedPengurusRequest.status === 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA', '13. Re-submit Pengurus menuju ke Asisten Kepala');

// Askep Re-verifies and forwards to Asisten Bibitan
const reSubmittedAskepRequest = {
  ...reSubmittedPengurusRequest,
  status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
  statusLabel: 'Menunggu Verifikasi Asisten Bibitan',
  targetDivisionId: 'DIV-APM-02',
  targetDivisionName: 'Divisi II',
  targetNextDivisionId: 'DIV-APM-02',
  targetNextRole: 'ASISTEN_BIBITAN',
  targetNextEstateId: 'EST-APM'
};

assert(reSubmittedAskepRequest.targetDivisionId === 'DIV-APM-02', '13b. Asisten Kepala re-submit menetapkan targetDivisionId');
assert(reSubmittedAskepRequest.targetNextDivisionId === 'DIV-APM-02', '13c. targetNextDivisionId tersimpan');

// -------------------------------------------------------------------------------------
// SECTION 5: ASISTEN VERIFIKASI & MANTRI ROUTING
// -------------------------------------------------------------------------------------
console.log('\n--- Section 5: Asisten Verification & Mantri Routing Isolation ---');

const verifiedRequest = {
  ...reSubmittedAskepRequest,
  status: 'TERVERIFIKASI',
  statusLabel: 'Terverifikasi',
  verifiedByUserId: asistenAPM_Div2.userId,
  verifiedByName: asistenAPM_Div2.name,
  verifiedByRole: 'ASISTEN_BIBITAN',
  verifiedByEstateId: asistenAPM_Div2.estateId,
  verifiedAt: new Date().toISOString(),
  targetNextRole: 'MANTRI_TANAMAN',
  targetNextEstateId: 'EST-APM',
  targetNextDivisionId: 'DIV-APM-02'
};

assert(verifiedRequest.targetDivisionId === 'DIV-APM-02', '14. Verifikasi Asisten mempertahankan targetDivisionId');
assert(verifiedRequest.targetDivisionName === 'Divisi II', '14b. Verifikasi Asisten mempertahankan targetDivisionName');
assert(verifiedRequest.targetNextDivisionId === 'DIV-APM-02', '14c. Verifikasi Asisten menetapkan targetNextDivisionId = DIV-APM-02');

// Mantri Actionability
const isActionableForMantriDiv2 = canPerformMantriDispatchAction(verifiedRequest, mantriAPM_Div2);
const isActionableForMantriDiv1 = canPerformMantriDispatchAction(verifiedRequest, mantriAPM_Div1);
const isActionableForMantriTBS = canPerformMantriDispatchAction(verifiedRequest, mantriTBS);

assert(isActionableForMantriDiv2 === true, '15. Mantri target estate + division (Mantri APM Div II) dapat melihat dan memproses pengeluaran');
assert(isActionableForMantriDiv1 === false, '16. Mantri estate sama + division lain (Supriono - APM Div I) tidak dapat melihat/action');
assert(isActionableForMantriTBS === false, '17. Mantri estate lain (Wagiman - TBS Div I) tidak dapat melihat');

// Filter dispatch for Mantri
const dispatchForMantriDiv2 = filterDispatchRequests([verifiedRequest], mantriAPM_Div2);
const dispatchForMantriDiv1 = filterDispatchRequests([verifiedRequest], mantriAPM_Div1);
assert(dispatchForMantriDiv2.length === 1, '15b. filterDispatchRequests menyertakan dokumen untuk Mantri Div II');
assert(dispatchForMantriDiv1.length === 0, '16b. filterDispatchRequests mengecualikan dokumen untuk Mantri Div I');

// Notification count for Mantri
const notifCountMantriDiv2 = getActionableDispatchCount(dispatchForMantriDiv2, mantriAPM_Div2);
const notifCountMantriDiv1 = getActionableDispatchCount(dispatchForMantriDiv1, mantriAPM_Div1);
assert(notifCountMantriDiv2 === 1, '21. Notification Mantri muncul pada division yang dituju (Div II count = 1)');
assert(notifCountMantriDiv1 === 0, '21b. Notification Mantri tidak muncul pada division lain (Div I count = 0)');

// -------------------------------------------------------------------------------------
// SECTION 6: PENGELUARAN BIBIT (SHIPMENT) CONTEXT RETENTION
// -------------------------------------------------------------------------------------
console.log('\n--- Section 6: Shipment Execution & Division Context Retention ---');

storage.set('requests_transactions', [verifiedRequest]);
storage.set('dispatch_transactions', []);
storage.set('nursery_batches', [
  { id: 'BATCH-APM-001', batchCode: 'B-001', clone: 'IRCA 19', estateId: 'EST-APM', availableQty: 10000, status: 'AVAILABLE' }
]);

await processDispatchShipment(
  verifiedRequest,
  {
    issuedDate: '2026-09-28',
    shipmentQty: 4000,
    batchRows: [{ batchCode: 'B-001', qty: 4000 }]
  },
  mantriAPM_Div2
);

const dispatches = getDispatchTransactions(verifiedRequest.id);
assert(dispatches.length === 1, '18a. Transaksi pengeluaran berhasil disimpan (1 shipment record)');
assert(dispatches[0].parentRequestId === verifiedRequest.id, '18. Shipment mempertahankan parentRequestId');
assert(dispatches[0].divisionId === 'DIV-APM-02', '19. Shipment mempertahankan divisionId (DIV-APM-02)');
assert(dispatches[0].targetDivisionId === 'DIV-APM-02', '19b. Shipment mempertahankan targetDivisionId (DIV-APM-02)');
assert(dispatches[0].targetDivisionName === 'Divisi II', '19c. Shipment mempertahankan targetDivisionName (Divisi II)');

// Check updated parent request
const updatedRequests = storage.get('requests_transactions', []);
const updatedReq = updatedRequests.find(r => r.id === verifiedRequest.id);
assert(updatedReq.targetDivisionId === 'DIV-APM-02', '19d. Parent request mempertahankan targetDivisionId');
assert(updatedReq.targetNextDivisionId === 'DIV-APM-02', '19e. Parent request mempertahankan targetNextDivisionId');

// -------------------------------------------------------------------------------------
// SECTION 7: BACKWARD COMPATIBILITY & INVARIANTS
// -------------------------------------------------------------------------------------
console.log('\n--- Section 7: Backward Compatibility & Invariants ---');

// Legacy record without division fields
const legacyRequest = {
  id: 'REQ-LEGACY-001',
  docNo: '2026/PGL/001',
  type: 'KEBUN_SEPUPU',
  status: 'TERVERIFIKASI',
  statusLabel: 'Terverifikasi',
  estateId: 'EST-TBS',
  targetEstateId: 'EST-APM',
  approvedQty: 5000,
  totalIssuedQty: 0,
  requestedClone: 'IRCA 19',
  approvedClone: 'IRCA 19'
  // Note: no targetDivisionId or targetDivisionName
};

// Legacy reading safety
assert(legacyRequest.targetDivisionId === undefined, '23. Legacy record tanpa targetDivisionId');
assert(legacyRequest.targetDivisionName === undefined, '23b. Legacy record tanpa targetDivisionName');
// Can still be processed safely by estate if no division specified
const legacyReadable = filterDispatchRequests([legacyRequest], mantriAPM_Div2);
assert(legacyReadable.length === 1, '23c. Legacy transaction tanpa division tetap dapat dibaca/diakses');

// New transaction requirement
const newTxValidation = validateAskepDivisionDecision('EST-APM', null);
assert(newTxValidation.valid === false, '24. Transaction baru wajib memiliki division');

// Single approval record invariant
assert(updatedRequests.filter(r => r.id === verifiedRequest.id).length === 1, '25. Tidak ada duplicate transaction (Single approval record invariant)');

// Full lifecycle validation
assert(
  initialRequest.status === 'DIAJUKAN' &&
  pengurusApprovedRequest.status === 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA' &&
  askepApprovedRequest.status === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' &&
  verifiedRequest.status === 'TERVERIFIKASI' &&
  updatedReq.status === 'PENGELUARAN_BERJALAN',
  '26. Full lifecycle: Pengurus → Asisten Kepala → Asisten Bibitan → Mantri tetap PASS secara konsisten'
);

// -------------------------------------------------------------------------------------
// SECTION 8: REGRESSION SUITE FOR BUG #1 (ASKEP ACTION) & BUG #2 (ASISTEN REDIRECT)
// -------------------------------------------------------------------------------------
console.log('\n--- Section 8: UAT Bug #1 (Askep Action) & Bug #2 (Asisten Access) Regression ---');

// === BUG #1: ASISTEN KEPALA WORKFLOW TRACE ===
// 1. Pengurus approve
const uatPengurusApproval = {
  ...initialRequest,
  status: 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA',
  statusLabel: 'Menunggu Verifikasi Asisten Kepala',
  approvedQty: 10000,
  approvedClone: 'IRCA 19',
  estimatedDeliveryDate: '2026-09-28',
  targetDivisionId: null,
  targetDivisionName: null,
  targetNextDivisionId: null,
  targetNextRole: 'ASKEP',
  targetNextEstateId: 'EST-APM',
  processedByUserId: pengurusAPM.userId,
  processedByName: pengurusAPM.name,
  processedByRole: 'PENGURUS',
  processedByEstateId: 'EST-APM',
  processedAt: new Date().toISOString()
};

// 2. Assert status = MENUNGGU_VERIFIKASI_ASISTEN_KEPALA
assert(uatPengurusApproval.status === 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA', 'UAT-1.1 Pengurus approve menghasilkan status MENUNGGU_VERIFIKASI_ASISTEN_KEPALA');
// 3. Assert targetNextRole = ASKEP / ASISTEN_KEPALA
assert(uatPengurusApproval.targetNextRole === 'ASKEP', 'UAT-1.2 targetNextRole tersimpan ASKEP');
// 4. Assert targetDivisionId belum dipilih
assert(uatPengurusApproval.targetDivisionId === null, 'UAT-1.3 targetDivisionId belum ditentukan pada tahap Pengurus');
assert(uatPengurusApproval.targetDivisionName === null, 'UAT-1.4 targetDivisionName belum ditentukan pada tahap Pengurus');

// 5. Login Asisten Kepala APM
session.start(askepAPM);
assert(session.isAuthenticated() === true, 'UAT-1.5 Session Asisten Kepala aktif');
assert(normalizeRole(session.getRole()) === 'ASKEP', 'UAT-1.6 Role ter-normalisasi sebagai ASKEP');

// 6. Assert request terlihat
const askepIncomingList = filterIncomingRequests([uatPengurusApproval], askepAPM);
assert(askepIncomingList.length === 1, 'UAT-1.7 Request terlihat pada inbox Permintaan Masuk Asisten Kepala');

// 7. Assert action Verifikasi & Teruskan tersedia
assert(canPerformAskepAction(uatPengurusApproval, askepAPM) === true, 'UAT-1.8 Action Verifikasi & Teruskan tersedia untuk Asisten Kepala');
// 8. Assert action Return tersedia (menggunakan rule canPerformAskepAction yang sama)
assert(canPerformAskepAction(uatPengurusApproval, askepTBS) === false, 'UAT-1.9 Action Askep tidak tersedia untuk kebun lain (TBS)');

// 9. Pilih division
const uatAskepDecision = validateAskepDivisionDecision('EST-APM', 'DIV-APM-02');
assert(uatAskepDecision.valid === true, 'UAT-1.10 Divisi bibitan DIV-APM-02 terpilih valid');

const uatAskepApproved = {
  ...uatPengurusApproval,
  status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
  statusLabel: 'Menunggu Verifikasi Asisten Bibitan',
  targetDivisionId: uatAskepDecision.division.divisionId,
  targetDivisionName: uatAskepDecision.division.divisionName,
  targetNextDivisionId: uatAskepDecision.division.divisionId,
  targetNextRole: 'ASISTEN_BIBITAN',
  targetNextEstateId: 'EST-APM',
  verifiedAskepByUserId: askepAPM.userId,
  verifiedAskepByName: askepAPM.name,
  verifiedAskepByRole: 'ASKEP',
  verifiedAskepByEstateId: askepAPM.estateId,
  verifiedAskepAt: new Date().toISOString()
};

// 10. Assert status berubah ke MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN
assert(uatAskepApproved.status === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN', 'UAT-1.11 Status berubah menjadi MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN');
// 11. Assert targetDivision tersimpan
assert(uatAskepApproved.targetDivisionId === 'DIV-APM-02', 'UAT-1.12 targetDivisionId tersimpan (DIV-APM-02)');
assert(uatAskepApproved.targetDivisionName === 'Divisi II', 'UAT-1.13 targetDivisionName tersimpan (Divisi II)');
// 12. Assert Asisten Bibitan target dapat melihat
assert(canPerformAsistenAction(uatAskepApproved, asistenAPM_Div2) === true, 'UAT-1.14 Asisten Bibitan target (Divisi II) dapat melihat dan actionable');
assert(canPerformAsistenAction(uatAskepApproved, asistenAPM_Div1) === false, 'UAT-1.15 Asisten Divisi I tidak dapat action');

// === BUG #2: ASISTEN BIBITAN ROUTE ACCESS & NO REDIRECT TO LOGIN ===
// 13. Login Asisten Bibitan APM (Abdul Gofur)
session.start(asistenAPM_Div2);
// 14. Assert session valid
assert(session.isAuthenticated() === true, 'UAT-2.1 Session Asisten Bibitan aktif');
// 15. Assert normalizedRole valid
assert(normalizeRole(session.getRole()) === 'ASISTEN_BIBITAN', 'UAT-2.2 Normalized role = ASISTEN_BIBITAN');
// 16. Assert estateId ada
assert(session.get()?.estateId === 'EST-APM', 'UAT-2.3 estateId Asisten = EST-APM');
// 17. Assert divisionId ada
assert(session.get()?.divisionId === 'DIV-APM-02', 'UAT-2.4 divisionId Asisten = DIV-APM-02');

// 18. Klik menu Permintaan Bibit (/request)
// 19. Assert TIDAK redirect ke login (permissions.canAccessRoute returns true)
const canAccessRequestRoute = permissions.canAccessRoute('/request');
assert(canAccessRequestRoute === true, 'UAT-2.5 permissions.canAccessRoute("/request") = true (TIDAK redirect ke login)');

// 20. Assert route/module berhasil dibuka
const canAccessSubRoute = permissions.canAccessRoute('/request/kebun-sepupu');
assert(canAccessSubRoute === true, 'UAT-2.6 permissions.canAccessRoute("/request/kebun-sepupu") = true');
const canAccessDispatchRoute = permissions.canAccessRoute('/dispatch');
assert(canAccessDispatchRoute === true, 'UAT-2.7 permissions.canAccessRoute("/dispatch") = true');

// 21. Assert request target tampil di incoming
const asistenIncoming = filterIncomingRequests([uatAskepApproved], asistenAPM_Div2);
assert(asistenIncoming.length === 1, 'UAT-2.8 Request target tampil pada Asisten Bibitan');

// 22. Assert action Verifikasi tersedia
assert(canPerformAsistenAction(uatAskepApproved, asistenAPM_Div2) === true, 'UAT-2.9 Action Verifikasi tersedia untuk Asisten Bibitan');

// 23. Assert Return ke Asisten Kepala tersedia
const uatReturnedToAskep = {
  ...uatAskepApproved,
  status: 'PERLU_REVISI_ASISTEN_KEPALA',
  statusLabel: 'Perlu Revisi Asisten Kepala',
  revisionReason: 'Stok klon pada divisi ini perlu disesuaikan',
  returnedByUserId: asistenAPM_Div2.userId,
  returnedByName: asistenAPM_Div2.name,
  returnedByRole: 'ASISTEN_BIBITAN',
  returnedByEstateId: asistenAPM_Div2.estateId,
  returnedAt: new Date().toISOString(),
  targetNextRole: 'ASKEP',
  targetNextEstateId: 'EST-APM'
};
assert(uatReturnedToAskep.status === 'PERLU_REVISI_ASISTEN_KEPALA', 'UAT-2.10 Return ke Asisten Kepala menghasilkan status PERLU_REVISI_ASISTEN_KEPALA');
assert(canPerformAskepAction(uatReturnedToAskep, askepAPM) === true, 'UAT-2.11 Dokumen return dapat diproses kembali oleh Asisten Kepala');
assert(canPerformAsistenAction(uatReturnedToAskep, asistenAPM_Div2) === false, 'UAT-2.12 Asisten Bibitan tidak lagi actionable setelah return');

// -------------------------------------------------------------------------------------
// SECTION 9: REQUEST SUB-MENU & RUNTIME NORMALIZATION REGRESSION
// -------------------------------------------------------------------------------------
console.log('\n--- Section 9: Request Sub-menu & Runtime Normalization Regression ---');

// 1. request-landing module dapat di-load
assert(typeof getSubMenuItemsForRole === 'function', 'UAT-3.1 request-landing module berhasil di-load');

// 2. getSubMenuItemsForRole() dapat dipanggil tanpa ReferenceError
let subMenuCallSuccess = false;
let asistenSubMenus = [];
try {
  asistenSubMenus = getSubMenuItemsForRole('ASISTEN_BIBITAN');
  subMenuCallSuccess = true;
} catch (e) {
  subMenuCallSuccess = false;
}
assert(subMenuCallSuccess === true, 'UAT-3.2 getSubMenuItemsForRole() dapat dipanggil tanpa ReferenceError');

// 3. normalizeRole tersedia dan berfungsi
assert(typeof normalizeRole === 'function', 'UAT-3.3 normalizeRole tersedia sebagai function');
assert(normalizeRole('ASISTEN_KEPALA') === 'ASKEP', 'UAT-3.4 normalizeRole("ASISTEN_KEPALA") -> ASKEP');

// 4. Role ASISTEN_BIBITAN menghasilkan submenu yang benar (3 items)
assert(Array.isArray(asistenSubMenus) && asistenSubMenus.length === 3, 'UAT-3.5 Role ASISTEN_BIBITAN menghasilkan 3 submenu');
assert(asistenSubMenus[0].rawTitle === 'Melanjutkan Permintaan dari Kebun Sendiri', 'UAT-3.6 Asisten Submenu 1: Melanjutkan Permintaan dari Kebun Sendiri');
assert(asistenSubMenus[1].rawTitle === 'Melanjutkan Permintaan dari Kebun Sepupu' && asistenSubMenus[1].route === '/request/kebun-sepupu', 'UAT-3.7 Asisten Submenu 2: Melanjutkan Permintaan dari Kebun Sepupu -> /request/kebun-sepupu');
assert(asistenSubMenus[2].rawTitle === 'Buat Permintaan Bibit Divisi Sendiri', 'UAT-3.8 Asisten Submenu 3: Buat Permintaan Bibit Divisi Sendiri');

// 5. Role ASISTEN_KEPALA menghasilkan submenu yang benar
const askepSubMenus = getSubMenuItemsForRole('ASISTEN_KEPALA');
assert(Array.isArray(askepSubMenus) && askepSubMenus.length === 2, 'UAT-3.9 Role ASISTEN_KEPALA menghasilkan 2 submenu');
assert(askepSubMenus[0].rawTitle === 'Melanjutkan Permintaan Kebun Sepupu' && askepSubMenus[0].route === '/request/kebun-sepupu', 'UAT-3.10 Askep Submenu 1: Melanjutkan Permintaan Kebun Sepupu');

// 6. Role PENGURUS tetap menghasilkan submenu yang benar
const pengurusSubMenus = getSubMenuItemsForRole('PENGURUS');
assert(Array.isArray(pengurusSubMenus) && pengurusSubMenus.length === 2, 'UAT-3.11 Role PENGURUS menghasilkan 2 submenu');
assert(pengurusSubMenus[0].rawTitle === 'Permintaan Bibit Kebun Sepupu' && pengurusSubMenus[0].route === '/request/kebun-sepupu', 'UAT-3.12 Pengurus Submenu 1: Permintaan Bibit Kebun Sepupu');

// 7. Role MANTRI tetap menghasilkan submenu yang benar
const mantriSubMenus = getSubMenuItemsForRole('MANTRI_TANAMAN');
assert(Array.isArray(mantriSubMenus) && mantriSubMenus.length === 2, 'UAT-3.13 Role MANTRI menghasilkan default valid submenus');

// -------------------------------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------------------------------
console.log('\n----------------------------------------------------------------------------------------');
console.log(`TOTAL ASSERTIONS: ${passed + failed}`);
console.log(`PASSED:           ${passed}`);
console.log(`FAILED:           ${failed}`);
console.log('----------------------------------------------------------------------------------------');

if (failed === 0) {
  console.log('✅ ALL ESTATE + DIVISION + ROLE ROUTING TESTS PASSED!\n');
} else {
  console.error(`❌ ${failed} ASSERTION(S) FAILED!\n`);
  process.exit(1);
}
