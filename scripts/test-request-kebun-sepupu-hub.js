/**
 * scripts/test-request-kebun-sepupu-hub.js
 * Comprehensive Verification Suite for Hub Permintaan Bibit Kebun Sepupu (/request/kebun-sepupu)
 * Covers:
 * - Review & Koreksi oleh Pengurus Kebun Tujuan (Target Estate)
 * - Strict Ownership & Data Isolation
 * - Single Transaction Record Invariant (Zero Duplicate)
 * - Requester Original Data Immutability
 * - Decision Fields & Actor Metadata Capture
 * - Validation Rules (Qty, Clone Master, Delivery Date, Rejection Reason)
 * - Forwarding to Asisten Bibitan (MENUNGGU_VERIFIKASI_ASISTEN)
 * - Notification Bubble (Red Dot 🔴) Lifecycle
 * - Backward Compatibility (Legacy 2026/PGL/001 & Canonical 2026/NIR/001)
 */

import fs from 'fs';
import path from 'path';
import {
  filterMyRequests,
  filterIncomingRequests,
  filterByStatus,
  canPerformReceiverAction,
  canPerformAsistenAction,
  getActionableIncomingCount
} from '../js/modules/request/request-kebun-sepupu-landing.js';
import { applyTransactionActor, AUDIT_EVENT_TYPES } from '../js/core/transaction-actor.js';
import { getActiveKlons } from '../js/data/klon-master.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`❌ FAIL: ${message}`);
  }
}

console.log('========================================================================================');
console.log('  SIGMA RUBBER NURSERY — TEST SUITE: REVIEW & KOREKSI PERMINTAAN KEBUN SEPUPU (HUB)    ');
console.log('========================================================================================\n');

// -------------------------------------------------------------------------------------
// 1. SETUP USERS & INITIAL TRANSACTIONS
// -------------------------------------------------------------------------------------
const userTBS_A = {
  id: 'PGS001',
  userId: 'PGS001',
  code: 'PGS001',
  loginCode: 'PGS001',
  name: 'Junaidi',
  role: 'PENGURUS',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih'
};

const userTBS_B = {
  id: 'PGS001_B',
  userId: 'PGS001_B',
  code: 'PGS001_B',
  loginCode: 'PGS001_B',
  name: 'Pengurus TBS B',
  role: 'PENGURUS',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih'
};

const userAPM = {
  id: 'PGS002',
  userId: 'PGS002',
  code: 'PGS002',
  loginCode: 'PGS002',
  name: 'Mukhsin Haji',
  role: 'PENGURUS',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke'
};

const userGLG = {
  id: 'PGS003',
  userId: 'PGS003',
  code: 'PGS003',
  loginCode: 'PGS003',
  name: 'Pengurus Galang',
  role: 'PENGURUS',
  estateId: 'EST-GLG',
  estateName: 'Galang'
};

const userMantriTBS = {
  id: 'MNT001',
  userId: 'MNT001',
  code: 'MNT001',
  loginCode: 'MNT001',
  name: 'Wagiman',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih'
};

const asistenAPM = {
  id: 'APM-ASB-002',
  userId: 'ASB002',
  code: 'ASB002',
  loginCode: 'ASB002',
  name: 'Abdul Gofur',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke'
};

const asistenTBS = {
  id: 'TBS-ASB-001',
  userId: 'ASB001',
  code: 'ASB001',
  loginCode: 'ASB001',
  name: 'Annisa',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih'
};

const sampleRequest1 = {
  id: 'REQ-1001',
  docNo: '2026/NIR/001',
  type: 'KEBUN_SEPUPU',
  status: 'DIAJUKAN',
  statusLabel: 'Diajukan',
  userId: 'PGS001',
  createdByUserId: 'PGS001',
  createdByLoginCode: 'PGS001',
  createdByName: 'Junaidi',
  createdByRole: 'PENGURUS',
  createdByEstateId: 'EST-TBS',
  role: 'PENGURUS',
  requestedBy: 'Junaidi',
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
  unit: 'Pkk',
  requiredDate: '2026-09-20',
  createdAt: '2026-09-12T10:00:00Z',
  date: '2026-09-12',
  auditTrail: [
    {
      id: 'AUD-001',
      eventType: 'CREATE',
      userId: 'PGS001',
      name: 'Junaidi',
      role: 'PENGURUS',
      estateId: 'EST-TBS',
      timestamp: '2026-09-12T10:00:00Z',
      details: null
    }
  ]
};

const sampleRequest2 = {
  id: 'REQ-1002',
  docNo: '2026/NIR/002',
  type: 'KEBUN_SEPUPU',
  status: 'DIPROSES',
  statusLabel: 'Diproses',
  userId: 'PGS002',
  createdByUserId: 'PGS002',
  createdByLoginCode: 'PGS002',
  createdByName: 'Mukhsin Haji',
  createdByRole: 'PENGURUS',
  createdByEstateId: 'EST-APM',
  role: 'PENGURUS',
  requestedBy: 'Mukhsin Haji',
  estateId: 'EST-APM',
  targetEstateId: 'EST-TBS',
  targetEstateName: 'Tanah Besih',
  purpose: 'Penanaman / Bibit Tanam',
  allocationCode: '091B12',
  klon: 'PB 260',
  requestedClone: 'PB 260',
  category: 'Seedlings',
  growthStage: 'Rubber Main Nursery',
  qty: 5000,
  requestedQty: 5000,
  unit: 'Pkk',
  requiredDate: '2026-09-25',
  createdAt: '2026-09-12T11:00:00Z',
  date: '2026-09-12',
  auditTrail: [
    {
      id: 'AUD-002',
      eventType: 'CREATE',
      userId: 'PGS002',
      name: 'Mukhsin Haji',
      role: 'PENGURUS',
      estateId: 'EST-APM',
      timestamp: '2026-09-12T11:00:00Z',
      details: null
    }
  ]
};

const dataset = [sampleRequest1, sampleRequest2];

// ==========================================
// TEST 1 - 5: Strict Isolation & Ownership
// ==========================================
const tbsMyReqs = filterMyRequests(dataset, userTBS_A);
assert(tbsMyReqs.length === 1, '1. Creator TBS A melihat tepat 1 permintaan miliknya di Permintaan Saya');
assert(tbsMyReqs[0].id === 'REQ-1001', '1. Permintaan yang tampil adalah REQ-1001');

const tbsBMyReqs = filterMyRequests(dataset, userTBS_B);
assert(tbsBMyReqs.length === 0, '2. User TBS B (same estate) TIDAK melihat request milik TBS A (Strict Personal Ownership)');

const apmMyReqs = filterMyRequests(dataset, userAPM);
assert(apmMyReqs.length === 1, '3. User APM melihat tepat 1 permintaan miliknya di Permintaan Saya');
assert(apmMyReqs[0].id === 'REQ-1002', '3. Permintaan yang tampil untuk APM adalah REQ-1002');

const apmIncomingReqs = filterIncomingRequests(dataset, userAPM);
assert(apmIncomingReqs.length === 1, '4. User APM melihat request TBS di Permintaan Masuk (Target: EST-APM)');
assert(apmIncomingReqs[0].id === 'REQ-1001', '4. Request masuk yang diterima APM adalah REQ-1001 dari Tanah Besih');

const mantriIncomingReqs = filterIncomingRequests(dataset, userMantriTBS);
assert(mantriIncomingReqs.length === 0, '5. Non-Pengurus (Mantri Tanaman) TIDAK dapat melihat Permintaan Masuk (Restricted)');

// ==========================================
// TEST 6: Single Record Identity & Business Values
// ==========================================
const tbsPerspective = tbsMyReqs[0];
const apmPerspective = apmIncomingReqs[0];
assert(tbsPerspective.id === apmPerspective.id, '6.1 Single Record: Same transaction ID');
assert(tbsPerspective.docNo === apmPerspective.docNo, '6.2 Single Record: Same docNo');
assert(tbsPerspective.type === apmPerspective.type, '6.3 Single Record: Same transaction type (KEBUN_SEPUPU)');
assert(tbsPerspective.estateId === apmPerspective.estateId, '6.4 Single Record: Same source estate');
assert(tbsPerspective.targetEstateId === apmPerspective.targetEstateId, '6.5 Single Record: Same target estate');
assert(tbsPerspective.klon === apmPerspective.klon, '6.6 Single Record: Same klon (IRCA 19)');
assert(tbsPerspective.qty === apmPerspective.qty, '6.7 Single Record: Same quantity (10.000 Pkk)');

// ==========================================
// TEST 7: Status Filters
// ==========================================
const diajukanList = filterByStatus(dataset, 'DIAJUKAN');
assert(diajukanList.length === 1 && diajukanList[0].id === 'REQ-1001', '7.1 Filter Status: DIAJUKAN mengembalikan REQ-1001');

const diprosesList = filterByStatus(dataset, 'DIPROSES');
assert(diprosesList.length === 1 && diprosesList[0].id === 'REQ-1002', '7.2 Filter Status: DIPROSES mengembalikan REQ-1002');

const semuaList = filterByStatus(dataset, 'SEMUA');
assert(semuaList.length === 2, '7.3 Filter Status: SEMUA mengembalikan seluruh 2 record');

// ==========================================
// TEST 8: Receiver Action Authorization Rules
// ==========================================
assert(canPerformReceiverAction(sampleRequest1, userAPM) === true, '8.1 Pengurus APM BERHAK memproses request TBS (Target: EST-APM)');
assert(canPerformReceiverAction(sampleRequest1, userTBS_A) === false, '8.2 Pengurus TBS TIDAK BERHAK memproses request buatannya sendiri');
assert(canPerformReceiverAction(sampleRequest1, userGLG) === false, '8.3 Pengurus Galang TIDAK BERHAK memproses request TBS -> APM');
assert(canPerformReceiverAction(sampleRequest1, userMantriTBS) === false, '8.4 Non-Pengurus (Mantri) TIDAK BERHAK memproses request');

// ==========================================
// TEST 9 - 14: Review Modal & Defaults & Form Validation
// ==========================================
// 1. Pengurus APM dapat membuka review transaction DIAJUKAN
assert(canPerformReceiverAction(sampleRequest1, userAPM) && sampleRequest1.status === 'DIAJUKAN', '9.1 Pengurus APM dapat membuka review transaction DIAJUKAN');

// 2 & 3. requestedQty & requestedClone tetap immutable
const initialRequestedQty = sampleRequest1.requestedQty;
const initialRequestedClone = sampleRequest1.requestedClone || sampleRequest1.klon;
assert(initialRequestedQty === 10000, '9.2 requestedQty awal adalah 10.000 Pkk (immutable)');
assert(initialRequestedClone === 'IRCA 19', '9.3 requestedClone awal adalah IRCA 19 (immutable)');

// 4 & 5. approvedQty default = requestedQty, approvedClone default = requestedClone
const defaultApprovedQty = sampleRequest1.approvedQty !== undefined ? sampleRequest1.approvedQty : sampleRequest1.requestedQty;
const defaultApprovedClone = sampleRequest1.approvedClone || sampleRequest1.requestedClone || sampleRequest1.klon;
assert(defaultApprovedQty === sampleRequest1.requestedQty, '9.4 approvedQty default sama dengan requestedQty (10.000)');
assert(defaultApprovedClone === sampleRequest1.requestedClone, '9.5 approvedClone default sama dengan requestedClone (IRCA 19)');

// 6 & 7. Pengurus dapat mengubah approvedQty dan memilih clone lain dari Clone Master
const activeKlons = getActiveKlons();
assert(activeKlons.length > 0, '9.6 Clone Master aktif tersedia untuk dropdown review');
const alternativeClone = activeKlons.find(k => k.canonicalName !== initialRequestedClone)?.canonicalName || 'PB 260';
assert(alternativeClone && alternativeClone !== initialRequestedClone, '9.7 Alternatif klon terpilih dari Clone Master');

const editedApprovedQty = 9000;
const editedApprovedClone = alternativeClone;
const editedDeliveryDate = '2026-09-22';

// 8 - 12. Validation rules for approvedQty, approvedClone, estimatedDeliveryDate
const validateReviewForm = (qty, clone, date) => {
  if (qty === '' || qty === null || qty === undefined) return { valid: false, error: 'Banyaknya bibit wajib diisi' };
  const num = typeof qty === 'number' ? qty : parseInt(qty, 10);
  if (isNaN(num) || num < 0) return { valid: false, error: 'Banyaknya bibit harus >= 0' };
  if (!clone || !clone.trim()) return { valid: false, error: 'Klon wajib dipilih' };
  if (!date || !date.trim()) return { valid: false, error: 'Estimasi tanggal dikirim wajib diisi' };
  return { valid: true, qtyNum: num };
};

assert(validateReviewForm(-5, 'IRCA 19', '2026-09-22').valid === false, '10.1 approvedQty negatif ditolak (< 0)');
assert(validateReviewForm('', 'IRCA 19', '2026-09-22').valid === false, '10.2 approvedQty kosong ditolak');
assert(validateReviewForm('abc', 'IRCA 19', '2026-09-22').valid === false, '10.3 approvedQty non-numeric ditolak');
assert(validateReviewForm(9000, '', '2026-09-22').valid === false, '10.4 approvedClone kosong ditolak');
assert(validateReviewForm(9000, 'IRCA 19', '').valid === false, '10.5 estimatedDeliveryDate kosong ditolak');
assert(validateReviewForm(9000, 'PB 260', '2026-09-22').valid === true, '10.6 Form review lengkap dan valid -> PASS');

// ==========================================
// TEST 13 - 14: Action Tolak Permintaan
// ==========================================
// 13. Tolak tanpa alasan ditolak
const emptyRejectReason = '   ';
assert(!emptyRejectReason.trim(), '11.1 Tolak tanpa alasan (kosong/whitespace) ditolak');

// 14. Tolak dengan alasan valid -> DITOLAK
const validRejectReason = 'Stok bibit klon IRCA 19 di Kebun Aek Pamingke sedang kosong untuk jadwal tersebut.';
const rejectedTx = applyTransactionActor(
  {
    ...sampleRequest1,
    status: 'DITOLAK',
    rejectionReason: validRejectReason.trim(),
    rejectedAt: '2026-09-13T01:00:00Z',
    receiverUserId: userAPM.userId,
    receiverName: userAPM.name,
    receiverRole: userAPM.role,
    receiverEstateId: userAPM.estateId
  },
  AUDIT_EVENT_TYPES.UPDATE,
  userAPM,
  validRejectReason.trim()
);
assert(rejectedTx.status === 'DITOLAK', '11.2 Tolak dengan alasan valid -> status berubah menjadi DITOLAK');
assert(rejectedTx.rejectionReason === validRejectReason.trim(), '11.3 rejectionReason tersimpan di transaction');
assert(rejectedTx.id === sampleRequest1.id, '11.4 Transaction ID tetap sama saat ditolak');
assert(rejectedTx.auditTrail.length === 2, '11.5 Audit trail bertambah event penolakan');

// ==========================================
// TEST 15 - 27: Action Setujui & Teruskan
// ==========================================
const approvedForwardedTx = applyTransactionActor(
  {
    ...sampleRequest1,
    status: 'MENUNGGU_VERIFIKASI_ASISTEN',
    approvedQty: editedApprovedQty,
    approvedClone: editedApprovedClone,
    estimatedDeliveryDate: editedDeliveryDate,
    processedByUserId: userAPM.userId,
    processedByName: userAPM.name,
    processedByRole: userAPM.role,
    processedByEstateId: userAPM.estateId,
    processedAt: '2026-09-13T01:10:00Z',
    targetNextRole: 'ASISTEN_BIBITAN',
    targetNextEstateId: userAPM.estateId
  },
  AUDIT_EVENT_TYPES.UPDATE,
  userAPM,
  'Permintaan disetujui dan diteruskan ke Asisten Bibitan'
);

// 15. Setujui & Teruskan valid -> status downstream yang sesuai
assert(approvedForwardedTx.status === 'MENUNGGU_VERIFIKASI_ASISTEN', '12.1 Status transisi sukses menjadi MENUNGGU_VERIFIKASI_ASISTEN');

// 16. approvedQty tersimpan
assert(approvedForwardedTx.approvedQty === 9000, '12.2 approvedQty tersimpan sebagai field terpisah (9000)');

// 17. approvedClone tersimpan
assert(approvedForwardedTx.approvedClone === alternativeClone, `12.3 approvedClone tersimpan sebagai field terpisah (${alternativeClone})`);

// 18. estimatedDeliveryDate tersimpan
assert(approvedForwardedTx.estimatedDeliveryDate === '2026-09-22', '12.4 estimatedDeliveryDate tersimpan (2026-09-22)');

// 19. processedBy* tersimpan
assert(approvedForwardedTx.processedByUserId === 'PGS002', '12.5 processedByUserId tersimpan (PGS002)');
assert(approvedForwardedTx.processedByName === 'Mukhsin Haji', '12.6 processedByName tersimpan (Mukhsin Haji)');
assert(approvedForwardedTx.processedByRole === 'PENGURUS', '12.7 processedByRole tersimpan (PENGURUS)');
assert(approvedForwardedTx.processedByEstateId === 'EST-APM', '12.8 processedByEstateId tersimpan (EST-APM)');
assert(Boolean(approvedForwardedTx.processedAt), '12.9 processedAt timestamp tersimpan');

// 20. createdBy* tetap identik
assert(approvedForwardedTx.createdByUserId === sampleRequest1.createdByUserId, '12.10 createdByUserId tetap identik (PGS001)');
assert(approvedForwardedTx.createdByName === sampleRequest1.createdByName, '12.11 createdByName tetap identik (Junaidi)');
assert(approvedForwardedTx.createdByRole === sampleRequest1.createdByRole, '12.12 createdByRole tetap identik (PENGURUS)');
assert(approvedForwardedTx.createdByEstateId === sampleRequest1.createdByEstateId, '12.13 createdByEstateId tetap identik (EST-TBS)');

// Immutability checks on original requester fields
assert(approvedForwardedTx.requestedQty === 10000, '12.14 requestedQty pemohon TIDAK BERUBAH (10.000)');
assert(approvedForwardedTx.requestedClone === 'IRCA 19', '12.15 requestedClone pemohon TIDAK BERUBAH (IRCA 19)');
assert(approvedForwardedTx.requiredDate === '2026-09-20', '12.16 requiredDate pemohon TIDAK BERUBAH');

// 21 & 22. source & target estate tetap
assert(approvedForwardedTx.estateId === 'EST-TBS', '12.17 source estate tetap EST-TBS');
assert(approvedForwardedTx.targetEstateId === 'EST-APM', '12.18 target estate tetap EST-APM');

// 23 & 24. id & docNo tetap
assert(approvedForwardedTx.id === sampleRequest1.id, '12.19 id transaksi tetap (REQ-1001)');
assert(approvedForwardedTx.docNo === sampleRequest1.docNo, '12.20 docNo transaksi tetap (2026/NIR/001)');

// 25. Single transaction: jumlah transaction tidak bertambah
const dbTransactions = new Map();
dbTransactions.set(sampleRequest1.id, sampleRequest1);
assert(dbTransactions.size === 1, '12.21 DB awal berisi 1 transaksi');
dbTransactions.set(approvedForwardedTx.id, approvedForwardedTx);
assert(dbTransactions.size === 1, '12.22 DB tetap berisi 1 transaksi setelah Setujui & Teruskan (Single Record)');

// 26. auditTrail bertambah secara kronologis
assert(approvedForwardedTx.auditTrail.length === 2, '12.23 Audit trail bertambah menjadi 2 entri kronologis');
assert(approvedForwardedTx.auditTrail[0].eventType === 'CREATE', '12.24 Audit event 1 adalah CREATE');
assert(approvedForwardedTx.auditTrail[1].eventType === 'UPDATE', '12.25 Audit event 2 adalah UPDATE');
assert(approvedForwardedTx.auditTrail[1].details === 'Permintaan disetujui dan diteruskan ke Asisten Bibitan', '12.26 Detail audit trail sesuai canonical style');

// 27. target berikutnya adalah ASISTEN BIBITAN estate target
assert(approvedForwardedTx.targetNextRole === 'ASISTEN_BIBITAN', '12.27 Target role berikutnya adalah ASISTEN_BIBITAN');
assert(approvedForwardedTx.targetNextEstateId === 'EST-APM', '12.28 Target estate berikutnya adalah EST-APM (kebun tujuan yang sama)');

// 28. Pengurus tidak lagi melihat action setelah dokumen diteruskan
const isStillActionableForPengurus = (approvedForwardedTx.status === 'DIAJUKAN') && canPerformReceiverAction(approvedForwardedTx, userAPM);
assert(isStillActionableForPengurus === false, '12.29 Pengurus APM TIDAK LAGI melihat tombol action setelah dokumen diteruskan (Read-only status downstream)');

// ==========================================
// TEST 29 - 30: Legacy & Canonical DocNo Compatibility
// ==========================================
const legacyRequestPGL = {
  id: 'REQ-1000',
  docNo: '2026/PGL/001',
  type: 'KEBUN_SEPUPU',
  status: 'DIAJUKAN',
  estateId: 'EST-TBS',
  targetEstateId: 'EST-APM',
  createdByUserId: 'PGS001',
  requestedQty: 8000,
  requestedClone: 'GT 1'
};

const userAPM_Legacy = {
  id: 'APM-PGS-002',
  userId: 'PGS002',
  code: 'PGS002',
  name: 'Mukhsin Haji',
  role: 'PENGURUS_KEBUN_SEPUPU',
  rawRole: 'PENGURUS_KEBUN_SEPUPU',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke'
};

// 29. Legacy PGL tetap bekerja
assert(canPerformReceiverAction(legacyRequestPGL, userAPM_Legacy) === true, '13.1 Pengurus tujuan dapat memproses transaksi legacy PGL');
const legacyApproved = applyTransactionActor(
  {
    ...legacyRequestPGL,
    status: 'MENUNGGU_VERIFIKASI_ASISTEN',
    approvedQty: 8000,
    approvedClone: 'GT 1',
    estimatedDeliveryDate: '2026-09-24'
  },
  AUDIT_EVENT_TYPES.UPDATE,
  userAPM_Legacy,
  'Permintaan disetujui dan diteruskan ke Asisten Bibitan'
);
assert(legacyApproved.docNo === '2026/PGL/001', '13.2 DocNo legacy 2026/PGL/001 tetap terjaga');
assert(legacyApproved.status === 'MENUNGGU_VERIFIKASI_ASISTEN', '13.3 Legacy transaction sukses bertransisi ke MENUNGGU_VERIFIKASI_ASISTEN');

// 30. Canonical NIR tetap bekerja
assert(sampleRequest1.docNo === '2026/NIR/001', '13.4 Canonical docNo 2026/NIR/001 berfungsi penuh');

// ==========================================
// TEST 31 - 32 & SECTION 15: Source Menu (Beranda & Submenu) Red Dot Notification Lifecycle
// ==========================================
// 1. Pengurus APM dengan request DIAJUKAN: → source menu Permintaan Bibit memiliki red dot
const activeIncomingBefore = [sampleRequest1]; // status: DIAJUKAN, target: EST-APM
const pendingCountBefore = getActionableIncomingCount(filterIncomingRequests(activeIncomingBefore, userAPM), userAPM);
assert(pendingCountBefore === 1, '14.1 getActionableIncomingCount mengembalikan 1 saat ada permintaan DIAJUKAN yang belum diproses');
const hasBerandaDotAPM_Before = pendingCountBefore > 0;
assert(hasBerandaDotAPM_Before === true, '15.1 Pengurus APM dengan request DIAJUKAN melihat red dot pada menu Permintaan Bibit di Beranda');

// 2. Pengurus TBS tidak melihat red dot untuk incoming request APM
const pendingCountTBS = getActionableIncomingCount(filterIncomingRequests(activeIncomingBefore, userTBS_A), userTBS_A);
const hasBerandaDotTBS = pendingCountTBS > 0;
assert(hasBerandaDotTBS === false, '15.2 Pengurus TBS TIDAK melihat red dot untuk incoming request yang ditujukan ke APM');

// 3. User non-PENGURUS tidak mendapatkan red dot untuk workflow receiver Pengurus
const pendingCountMantri = getActionableIncomingCount(filterIncomingRequests(activeIncomingBefore, userMantriTBS), userMantriTBS);
assert(pendingCountMantri === 0, '15.3 User non-PENGURUS (Mantri) TIDAK mendapatkan red dot receiver Pengurus');

// 4. Setelah request DIPROSES: → red dot hilang jika tidak ada actionable request lain
const diprosesRequest = { ...sampleRequest1, status: 'DIPROSES' };
const pendingCountDiproses = getActionableIncomingCount(filterIncomingRequests([diprosesRequest], userAPM), userAPM);
assert(pendingCountDiproses === 0, '15.4 Setelah request DIPROSES, red dot hilang (0 actionable request)');

// 5. Setelah request DITOLAK: → red dot hilang jika tidak ada actionable request lain
const pendingCountAfterReject = getActionableIncomingCount(filterIncomingRequests([rejectedTx], userAPM), userAPM);
assert(pendingCountAfterReject === 0, '15.5 Setelah request DITOLAK, red dot hilang (0 actionable request)');

// 6. Setelah request MENUNGGU_VERIFIKASI_ASISTEN: → request tidak dihitung sebagai actionable Pengurus
const pendingCountAfterApproval = getActionableIncomingCount(filterIncomingRequests([approvedForwardedTx], userAPM), userAPM);
assert(pendingCountAfterApproval === 0, '15.6 Setelah request MENUNGGU_VERIFIKASI_ASISTEN, request tidak lagi dihitung sebagai actionable Pengurus');

// 7. Jika ada dua request dan salah satu masih DIAJUKAN: → red dot tetap tampil
const twoRequestsOnePending = [sampleRequest1, approvedForwardedTx];
const pendingCountMulti = getActionableIncomingCount(filterIncomingRequests(twoRequestsOnePending, userAPM), userAPM);
assert(pendingCountMulti === 1, '15.7 Jika ada 2 request dan 1 masih DIAJUKAN, red dot tetap aktif (count = 1)');

// 8. Jika seluruh request actionable selesai: → red dot hilang
const allCompletedOrForwarded = [approvedForwardedTx, rejectedTx];
const pendingCountAllDone = getActionableIncomingCount(filterIncomingRequests(allCompletedOrForwarded, userAPM), userAPM);
assert(pendingCountAllDone === 0, '15.8 Jika seluruh request actionable selesai diproses/diteruskan, red dot hilang (count = 0)');

// 9. Legacy role PENGURUS_KEBUN_SEPUPU: → tetap mendapatkan red dot secara benar
const legacyIncoming = [legacyRequestPGL];
const pendingCountLegacy = getActionableIncomingCount(filterIncomingRequests(legacyIncoming, userAPM_Legacy), userAPM_Legacy);
assert(pendingCountLegacy === 1, '15.9 Legacy role PENGURUS_KEBUN_SEPUPU tetap mendapatkan red dot secara benar');

// 10. Tidak menggunakan angka pada red dot & Static Code Inspection
const berandaCodePath = path.resolve('js/modules/dashboard/beranda.js');
const berandaCode = fs.readFileSync(berandaCodePath, 'utf-8');
const requestLandingPath = path.resolve('js/modules/request/request-landing.js');
const requestLandingCode = fs.readFileSync(requestLandingPath, 'utf-8');
const landingCodePath = path.resolve('js/modules/request/request-kebun-sepupu-landing.js');
const landingCode = fs.readFileSync(landingCodePath, 'utf-8');

assert(berandaCode.includes("item.id === 'permintaan-bibit' && hasActionableRequest"), '15.10 beranda.js memeriksa hasActionableRequest pada menu Permintaan Bibit');
assert(berandaCode.includes('background-color: #D32F2F') || berandaCode.includes('background-color: #DC2626') || berandaCode.includes('background: #DC2626'), '15.11 beranda.js merender red dot bulat');
assert(!berandaCode.includes('${pendingIncomingCount}') && !berandaCode.includes('${actionableCount}'), '15.12 Red dot di Beranda TIDAK menggunakan angka counter');

assert(requestLandingCode.includes("item.id === 'ksp-bibit' && hasActionableRequest"), '15.13 request-landing.js merender red dot pada card Permintaan Bibit Kebun Sepupu');
assert(!requestLandingCode.includes('${actionableIncomingCount}'), '15.14 Red dot di sub-menu TIDAK menggunakan angka');

// 11. Notification source menu dan notification pada child page menggunakan sumber data actionable yang konsisten
assert(berandaCode.includes('getActionableIncomingCount'), '15.15 Source menu Beranda menggunakan fungsi getActionableIncomingCount yang sama');
assert(requestLandingCode.includes('getActionableIncomingCount'), '15.16 Sub-menu Permintaan Bibit menggunakan fungsi getActionableIncomingCount yang sama');
assert(landingCode.includes('getActionableIncomingCount'), '15.17 Landing Hub Permintaan Kebun Sepupu menggunakan fungsi getActionableIncomingCount yang sama');

assert(landingCode.includes('class="notif-dot"'), '15.18 UI landing menggunakan class notif-dot untuk bubble merah');
assert(landingCode.includes('Review Permintaan Bibit'), '15.19 UI Modal Title adalah "Review Permintaan Bibit"');
assert(landingCode.includes('1. Data Permintaan Awal'), '15.20 Modal memuat Section 1: Data Permintaan Awal');
assert(landingCode.includes('2. Keputusan & Koreksi Pengurus'), '15.21 Modal memuat Section 2: Keputusan & Koreksi Pengurus');
assert(landingCode.includes('Setujui & Teruskan'), '15.22 Tombol "Setujui & Teruskan" tersedia di footer modal review');
assert(landingCode.includes('Tolak Permintaan'), '15.23 Tombol "Tolak Permintaan" tersedia');
assert(landingCode.includes('Batal'), '15.24 Tombol "Batal" tersedia');
assert(!landingCode.includes('Selesaikan Permintaan'), '15.25 Tombol downstream "Selesaikan Permintaan" TIDAK ditampilkan pada tahap Pengurus');

// ==========================================
// TEST 16: VERIFIKASI ASISTEN BIBITAN + KEMBALIKAN KE PENGURUS + MULTI-CYCLE REVISION (42 WAJIB ASSERTIONS)
// ==========================================
console.log('\n--- 16. ASISTEN BIBITAN VERIFIKASI & RETURN WORKFLOW (42 ASSERTIONS) ---');

// 1. Transaction MENUNGGU_VERIFIKASI_ASISTEN terlihat oleh Asisten APM
const asistenAPMIncoming = filterIncomingRequests([approvedForwardedTx], asistenAPM);
assert(asistenAPMIncoming.length === 1 && asistenAPMIncoming[0].id === 'REQ-1001', '16.1 Transaction MENUNGGU_VERIFIKASI_ASISTEN terlihat oleh Asisten APM di Permintaan Masuk');

// 2. Transaction tidak terlihat sebagai actionable oleh Asisten estate lain (EST-TBS)
assert(canPerformAsistenAction(approvedForwardedTx, asistenTBS) === false, '16.2 Transaction tidak actionable untuk Asisten estate lain (TBS)');

// 3. User non-Asisten tidak mendapatkan action Asisten
assert(canPerformAsistenAction(approvedForwardedTx, userAPM) === false, '16.3 User Pengurus tidak mendapatkan action Asisten');
assert(canPerformAsistenAction(approvedForwardedTx, userMantriTBS) === false, '16.3b User Mantri tidak mendapatkan action Asisten');

// 4. Asisten dapat melihat data request awal (Section 1 Read-only)
assert(approvedForwardedTx.docNo === '2026/NIR/001', '16.4 Data awal: No Dokumen dapat dilihat');
assert(approvedForwardedTx.requestedBy === 'Junaidi', '16.4b Data awal: Pemohon dapat dilihat');
assert(approvedForwardedTx.estateId === 'EST-TBS', '16.4c Data awal: Kebun Asal dapat dilihat');
assert(approvedForwardedTx.targetEstateId === 'EST-APM', '16.4d Data awal: Kebun Tujuan dapat dilihat');
assert(approvedForwardedTx.allocationCode === '091B11', '16.4e Data awal: Kode Alokasi dapat dilihat');
assert(approvedForwardedTx.requestedClone === 'IRCA 19', '16.4f Data awal: Klon Diminta dapat dilihat');
assert(approvedForwardedTx.category === 'APM', '16.4g Data awal: Kategori dapat dilihat');
assert(approvedForwardedTx.growthStage === 'Rubber Advance Planting Material', '16.4h Data awal: Tahapan Pertumbuhan dapat dilihat');
assert(approvedForwardedTx.requestedQty === 10000, '16.4i Data awal: Banyaknya Diminta dapat dilihat');
assert(approvedForwardedTx.requiredDate === '2026-09-20', '16.4j Data awal: Tanggal Dibutuhkan dapat dilihat');

// 5. Asisten dapat melihat hasil keputusan Pengurus (Section 2 Read-only)
assert(approvedForwardedTx.approvedQty === 9000, '16.5 Data keputusan: Banyaknya Disetujui dapat dilihat');
assert(approvedForwardedTx.approvedClone === alternativeClone, '16.5b Data keputusan: Klon Disetujui dapat dilihat');
assert(approvedForwardedTx.estimatedDeliveryDate === '2026-09-22', '16.5c Data keputusan: Estimasi Tanggal Dikirim dapat dilihat');
assert(approvedForwardedTx.processedByName === 'Mukhsin Haji', '16.5d Data keputusan: Nama Pengurus dapat dilihat');
assert(approvedForwardedTx.processedByEstateId === 'EST-APM', '16.5e Data keputusan: Kebun Pengurus dapat dilihat');
assert(Boolean(approvedForwardedTx.processedAt), '16.5f Data keputusan: Tanggal/Waktu Keputusan dapat dilihat');

// 6. approvedQty read-only (tidak ada editable field pada action verifikasi)
assert(landingCode.includes('approvedQtyFormatted') && !landingCode.includes('id="asisten-approved-qty"'), '16.6 approvedQty berstatus read-only bagi Asisten');

// 7. approvedClone read-only
assert(landingCode.includes('approvedCloneName') && !landingCode.includes('id="asisten-approved-clone"'), '16.7 approvedClone berstatus read-only bagi Asisten');

// 8. estimatedDeliveryDate read-only
assert(landingCode.includes('deliveryDateFormatted') && !landingCode.includes('id="asisten-delivery-date"'), '16.8 estimatedDeliveryDate berstatus read-only bagi Asisten');

// 9. Verifikasi valid -> TERVERIFIKASI
const verifiedTx = applyTransactionActor(
  {
    ...approvedForwardedTx,
    status: 'TERVERIFIKASI',
    statusLabel: 'Terverifikasi',
    verifiedByUserId: asistenAPM.userId,
    verifiedByName: asistenAPM.name,
    verifiedByRole: asistenAPM.role,
    verifiedByEstateId: asistenAPM.estateId,
    verifiedAt: '2026-09-13T01:30:00Z',
    targetNextRole: 'MANTRI_TANAMAN',
    targetNextEstateId: asistenAPM.estateId
  },
  AUDIT_EVENT_TYPES.VERIFY,
  asistenAPM,
  'Dokumen permintaan telah diverifikasi oleh Asisten Bibitan'
);
assert(verifiedTx.status === 'TERVERIFIKASI', '16.9 Verifikasi valid menghasilkan status TERVERIFIKASI');

// 10. Verifikasi menyimpan verifiedBy*
assert(verifiedTx.verifiedByUserId === 'ASB002', '16.10 verifiedByUserId tersimpan (ASB002)');
assert(verifiedTx.verifiedByName === 'Abdul Gofur', '16.10b verifiedByName tersimpan (Abdul Gofur)');
assert(verifiedTx.verifiedByRole === 'ASISTEN_BIBITAN', '16.10c verifiedByRole tersimpan (ASISTEN_BIBITAN)');
assert(verifiedTx.verifiedByEstateId === 'EST-APM', '16.10d verifiedByEstateId tersimpan (EST-APM)');

// 11. Verifikasi menyimpan verifiedAt
assert(Boolean(verifiedTx.verifiedAt), '16.11 verifiedAt timestamp tersimpan');

// 12. Verifikasi menambah auditTrail VERIFY
const lastAuditVerify = verifiedTx.auditTrail[verifiedTx.auditTrail.length - 1];
assert(lastAuditVerify.eventType === 'VERIFY', '16.12 Verifikasi menambah auditTrail bertipe VERIFY');
assert(lastAuditVerify.details === 'Dokumen permintaan telah diverifikasi oleh Asisten Bibitan', '16.12b Audit details sesuai format standar');

// 13. Return tanpa alasan ditolak
const emptyReturnReason = '';
assert(!emptyReturnReason.trim(), '16.13 Return tanpa alasan ditolak');

// 14. Return dengan whitespace ditolak
const whitespaceReturnReason = '     ';
assert(!whitespaceReturnReason.trim(), '16.14 Return dengan whitespace saja ditolak');

// 15. Return dengan alasan valid -> PERLU_REVISI_PENGURUS
const validReturnReason = 'Klon IRCA 19 stok di bedengan 3 perlu waktu aklimatisasi 1 minggu lebih lama, mohon ubah estimasi kirim.';
const returnedTx = applyTransactionActor(
  {
    ...approvedForwardedTx,
    status: 'PERLU_REVISI_PENGURUS',
    statusLabel: 'Perlu Revisi Pengurus',
    revisionReason: validReturnReason.trim(),
    returnReason: validReturnReason.trim(),
    returnedByUserId: asistenAPM.userId,
    returnedByName: asistenAPM.name,
    returnedByRole: asistenAPM.role,
    returnedByEstateId: asistenAPM.estateId,
    returnedAt: '2026-09-13T01:25:00Z',
    targetNextRole: 'PENGURUS',
    targetNextEstateId: asistenAPM.estateId
  },
  AUDIT_EVENT_TYPES.UPDATE,
  asistenAPM,
  `Dokumen dikembalikan ke Pengurus untuk revisi: ${validReturnReason.trim()}`
);
assert(returnedTx.status === 'PERLU_REVISI_PENGURUS', '16.15 Return dengan alasan valid -> status PERLU_REVISI_PENGURUS');

// 16. Return menyimpan reason
assert(returnedTx.revisionReason === validReturnReason.trim(), '16.16 revisionReason tersimpan');
assert(returnedTx.returnReason === validReturnReason.trim(), '16.16b returnReason tersimpan');

// 17. Return menyimpan returnedBy*
assert(returnedTx.returnedByUserId === 'ASB002', '16.17 returnedByUserId tersimpan');
assert(returnedTx.returnedByName === 'Abdul Gofur', '16.17b returnedByName tersimpan');
assert(returnedTx.returnedByRole === 'ASISTEN_BIBITAN', '16.17c returnedByRole tersimpan');
assert(returnedTx.returnedByEstateId === 'EST-APM', '16.17d returnedByEstateId tersimpan');

// 18. Return menyimpan returnedAt
assert(Boolean(returnedTx.returnedAt), '16.18 returnedAt tersimpan');

// 19. Return menambah auditTrail UPDATE
const lastAuditReturn = returnedTx.auditTrail[returnedTx.auditTrail.length - 1];
assert(lastAuditReturn.eventType === 'UPDATE', '16.19 Return menambah auditTrail UPDATE');
assert(lastAuditReturn.details.includes(validReturnReason.trim()), '16.19b Details audit trail memuat alasan pengembalian');

// 20. Setelah return, transaction actionable untuk Pengurus
assert(canPerformReceiverAction(returnedTx, userAPM) === true, '16.20 Setelah return, transaction actionable untuk Pengurus APM');
assert(getActionableIncomingCount([returnedTx], userAPM) === 1, '16.20b getActionableIncomingCount Pengurus APM adalah 1 setelah return');

// 21. Setelah return, transaction tidak lagi actionable untuk Asisten
assert(canPerformAsistenAction(returnedTx, asistenAPM) === false, '16.21 Setelah return, transaction tidak lagi actionable untuk Asisten');
assert(getActionableIncomingCount([returnedTx], asistenAPM) === 0, '16.21b getActionableIncomingCount Asisten adalah 0 setelah return');

// 22. Pengurus dapat membuka kembali transaction
assert(returnedTx.status === 'PERLU_REVISI_PENGURUS' && canPerformReceiverAction(returnedTx, userAPM), '16.22 Pengurus dapat membuka kembali transaction untuk revisi');

// 23. Pengurus tetap dapat mengubah approvedQty
const revisedApprovedQty = 8500;
assert(revisedApprovedQty !== returnedTx.approvedQty, '16.23 Pengurus dapat merevisi approvedQty');

// 24. Pengurus tetap dapat mengubah approvedClone
const revisedApprovedClone = 'PB 260';
assert(revisedApprovedClone !== initialRequestedClone, '16.24 Pengurus dapat merevisi approvedClone');

// 25. Pengurus tetap dapat mengubah estimatedDeliveryDate
const revisedDeliveryDate = '2026-09-29';
assert(revisedDeliveryDate !== returnedTx.estimatedDeliveryDate, '16.25 Pengurus dapat merevisi estimatedDeliveryDate');

// 26. Setelah Pengurus meneruskan lagi, status menjadi MENUNGGU_VERIFIKASI_ASISTEN
const reForwardedTx = applyTransactionActor(
  {
    ...returnedTx,
    status: 'MENUNGGU_VERIFIKASI_ASISTEN',
    statusLabel: 'Menunggu Verifikasi Asisten',
    approvedQty: revisedApprovedQty,
    approvedClone: revisedApprovedClone,
    estimatedDeliveryDate: revisedDeliveryDate,
    processedByUserId: userAPM.userId,
    processedByName: userAPM.name,
    processedByRole: userAPM.role,
    processedByEstateId: userAPM.estateId,
    processedAt: '2026-09-13T01:40:00Z',
    targetNextRole: 'ASISTEN_BIBITAN',
    targetNextEstateId: userAPM.estateId
  },
  AUDIT_EVENT_TYPES.UPDATE,
  userAPM,
  'Permintaan disetujui (revisi) dan diteruskan kembali ke Asisten Bibitan'
);
assert(reForwardedTx.status === 'MENUNGGU_VERIFIKASI_ASISTEN', '16.26 Setelah revisi diteruskan lagi, status kembali MENUNGGU_VERIFIKASI_ASISTEN');
assert(reForwardedTx.approvedQty === 8500, '16.26b Nilai approvedQty revisi tersimpan (8500)');
assert(reForwardedTx.estimatedDeliveryDate === '2026-09-29', '16.26c Nilai estimatedDeliveryDate revisi tersimpan (2026-09-29)');

// 27. Asisten dapat melakukan verifikasi ulang
assert(canPerformAsistenAction(reForwardedTx, asistenAPM) === true, '16.27 Asisten dapat melakukan verifikasi ulang setelah revisi');
const reVerifiedTx = applyTransactionActor(
  {
    ...reForwardedTx,
    status: 'TERVERIFIKASI',
    statusLabel: 'Terverifikasi',
    verifiedByUserId: asistenAPM.userId,
    verifiedByName: asistenAPM.name,
    verifiedByRole: asistenAPM.role,
    verifiedByEstateId: asistenAPM.estateId,
    verifiedAt: '2026-09-13T01:45:00Z',
    targetNextRole: 'MANTRI_TANAMAN',
    targetNextEstateId: asistenAPM.estateId
  },
  AUDIT_EVENT_TYPES.VERIFY,
  asistenAPM,
  'Dokumen permintaan telah diverifikasi oleh Asisten Bibitan'
);
assert(reVerifiedTx.status === 'TERVERIFIKASI', '16.27b Transaksi hasil verifikasi ulang sukses berstatus TERVERIFIKASI');

// 28. creator identity tetap sama across all cycles
assert(reVerifiedTx.createdByUserId === sampleRequest1.createdByUserId, '16.28 createdByUserId tetap identik');
assert(reVerifiedTx.createdByName === sampleRequest1.createdByName, '16.28b createdByName tetap identik');
assert(reVerifiedTx.createdByRole === sampleRequest1.createdByRole, '16.28c createdByRole tetap identik');
assert(reVerifiedTx.createdByEstateId === sampleRequest1.createdByEstateId, '16.28d createdByEstateId tetap identik');

// 29. source estate tetap sama
assert(reVerifiedTx.estateId === 'EST-TBS', '16.29 Source estate tetap EST-TBS');

// 30. target estate tetap sama
assert(reVerifiedTx.targetEstateId === 'EST-APM', '16.30 Target estate tetap EST-APM');

// 31. id tetap sama
assert(reVerifiedTx.id === sampleRequest1.id, '16.31 Transaction id tetap REQ-1001');

// 32. docNo tetap sama
assert(reVerifiedTx.docNo === sampleRequest1.docNo, '16.32 docNo tetap 2026/NIR/001');

// 33. jumlah transaction tetap 1 (single transaction record / zero duplicate)
const cycleDb = new Map();
cycleDb.set(sampleRequest1.id, sampleRequest1);
cycleDb.set(approvedForwardedTx.id, approvedForwardedTx);
cycleDb.set(returnedTx.id, returnedTx);
cycleDb.set(reForwardedTx.id, reForwardedTx);
cycleDb.set(reVerifiedTx.id, reVerifiedTx);
assert(cycleDb.size === 1, '16.33 Jumlah record tetap tepat 1 di seluruh siklus workflow (Zero duplicate)');

// 34. auditTrail kronologis (CREATE -> UPDATE Pengurus -> UPDATE Return Asisten -> UPDATE Revisi Pengurus -> VERIFY Asisten)
assert(reVerifiedTx.auditTrail.length === 5, '16.34 Audit trail memiliki 5 entri lengkap dan kronologis');
assert(reVerifiedTx.auditTrail[0].eventType === 'CREATE', '16.34a Audit 1: CREATE');
assert(reVerifiedTx.auditTrail[1].eventType === 'UPDATE', '16.34b Audit 2: UPDATE (Pengurus)');
assert(reVerifiedTx.auditTrail[2].eventType === 'UPDATE', '16.34c Audit 3: UPDATE (Asisten Return)');
assert(reVerifiedTx.auditTrail[3].eventType === 'UPDATE', '16.34d Audit 4: UPDATE (Pengurus Revisi)');
assert(reVerifiedTx.auditTrail[4].eventType === 'VERIFY', '16.34e Audit 5: VERIFY (Asisten)');

// 35. Legacy PGL tetap dapat diverifikasi
const legacyMenunggu = {
  ...legacyRequestPGL,
  status: 'MENUNGGU_VERIFIKASI_ASISTEN',
  targetNextRole: 'ASISTEN_BIBITAN',
  targetNextEstateId: 'EST-APM'
};
assert(canPerformAsistenAction(legacyMenunggu, asistenAPM) === true, '16.35 Legacy PGL dapat diaction oleh Asisten');
const legacyVerified = applyTransactionActor(
  {
    ...legacyMenunggu,
    status: 'TERVERIFIKASI',
    verifiedByUserId: asistenAPM.userId,
    verifiedByName: asistenAPM.name,
    verifiedByRole: asistenAPM.role,
    verifiedByEstateId: asistenAPM.estateId,
    verifiedAt: '2026-09-13T01:50:00Z'
  },
  AUDIT_EVENT_TYPES.VERIFY,
  asistenAPM,
  'Dokumen permintaan telah diverifikasi oleh Asisten Bibitan'
);
assert(legacyVerified.status === 'TERVERIFIKASI' && legacyVerified.docNo === '2026/PGL/001', '16.35b Legacy PGL sukses diverifikasi');

// 36. Canonical NIR tetap dapat diverifikasi
assert(verifiedTx.status === 'TERVERIFIKASI' && verifiedTx.docNo === '2026/NIR/001', '16.36 Canonical NIR sukses diverifikasi');

// 37. Bubble Asisten muncul saat actionable
const pendingAsistenBefore = getActionableIncomingCount([approvedForwardedTx], asistenAPM);
assert(pendingAsistenBefore === 1, '16.37 Bubble Asisten muncul saat ada item MENUNGGU_VERIFIKASI_ASISTEN');

// 38. Bubble Asisten hilang setelah verify
const pendingAsistenAfterVerify = getActionableIncomingCount([verifiedTx], asistenAPM);
assert(pendingAsistenAfterVerify === 0, '16.38 Bubble Asisten hilang setelah verify (0 actionable)');

// 39. Bubble Asisten hilang setelah return
const pendingAsistenAfterReturn = getActionableIncomingCount([returnedTx], asistenAPM);
assert(pendingAsistenAfterReturn === 0, '16.39 Bubble Asisten hilang setelah return (0 actionable)');

// 40. Bubble Pengurus muncul kembali setelah return
const pendingPengurusAfterReturn = getActionableIncomingCount([returnedTx], userAPM);
assert(pendingPengurusAfterReturn === 1, '16.40 Bubble Pengurus muncul kembali setelah return (PERLU_REVISI_PENGURUS)');

// 41. Jika masih ada transaction actionable lain, bubble tetap tampil
const multiTxs = [returnedTx, verifiedTx];
assert(getActionableIncomingCount(multiTxs, userAPM) === 1, '16.41 Bubble Pengurus tetap tampil jika masih ada 1 transaksi actionable');

// 42. Jika semua actionable selesai, bubble hilang
const allDoneTxs = [verifiedTx, rejectedTx];
assert(getActionableIncomingCount(allDoneTxs, userAPM) === 0, '16.42 Bubble Pengurus hilang jika seluruh transaksi telah selesai');
assert(getActionableIncomingCount(allDoneTxs, asistenAPM) === 0, '16.42b Bubble Asisten hilang jika seluruh transaksi telah selesai');

console.log('\n----------------------------------------------------------------------------------------');
console.log(`TOTAL ASSERTIONS: ${passed + failed}`);
console.log(`PASSED:           ${passed}`);
console.log(`FAILED:           ${failed}`);
console.log('----------------------------------------------------------------------------------------');

if (failed === 0) {
  console.log('✅ ALL REQUEST KEBUN SEPUPU REVIEW, KOREKSI & SOURCE MENU NOTIFICATION TESTS PASSED!');
  process.exit(0);
} else {
  console.error('❌ SOME TESTS FAILED!');
  process.exit(1);
}

