/**
 * scripts/test-receipt-ksp-askep.js
 * Automated Test Suite: Modul Verifikasi & Routing Asisten Kepala (PENERIMAAN-04)
 * 
 * Verifikasi Skenario:
 * 1. Scope & Isolation: Askep hanya melihat receipt dalam estate-nya.
 * 2. Actionability: Hanya status MENUNGGU_VERIFIKASI_ASISTEN_KEPALA yang actionable bagi Askep.
 * 3. Workflow A: Jalur LAPANGAN -> MENUNGGU_VERIFIKASI_ASISTEN_LAPANGAN, targetNextRole: ASISTEN.
 * 4. Workflow B: Jalur BIBITAN -> MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN, targetNextRole: ASISTEN_BIBITAN.
 * 5. Workflow C: Kembalikan ke Pengurus -> DIKEMBALIKAN_KE_PENGURUS, targetNextRole: PENGURUS + alasan wajib.
 * 6. Validasi Divisi: Divisi harus aktif dan berada di estate tujuan.
 * 7. Audit Trail & Actor Snapshot lengkap (userId, name, role, timestamp, notes).
 * 8. Notification lifecycle: Red dot Askep ON saat pending, OFF setelah aksi selesai.
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

import { storage } from '../js/core/storage.js';
import {
  RECEIPT_KSP_STATUS,
  RECEIPT_KSP_STATUS_LABELS,
  RECEIPT_KSP_STORAGE_KEY
} from '../js/core/receipt-ksp-constants.js';
import {
  createReceiptFromDispatch,
  getReceiptKspTransactions,
  getReceiptKspById
} from '../js/core/receipt-ksp-manager.js';
import {
  canPerformPengurusReceiptAction,
  canPerformAskepReceiptAction,
  getActionableReceiptCount,
  filterReceiptKspRequests,
  filterReceiptKspByStatus,
  processPengurusInitialReceipt,
  processAskepVerification,
  processAskepReturn,
  getFieldDivisionsForEstate
} from '../js/modules/receipt/receipt-kebun-sepupu-landing.js';
import { getNurseryDivisionsByEstate } from '../js/data/estate-master.js';

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
console.log('   SIGMA RUBBER NURSERY — TEST SUITE: MODUL ASISTEN KEPALA (PENERIMAAN-04)              ');
console.log('========================================================================================\n');

// Bersihkan storage sebelum test
if (typeof globalThis.localStorage !== 'undefined' && globalThis.localStorage.clear) {
  globalThis.localStorage.clear();
}

// -------------------------------------------------------------------------------------
// 1. SETUP PERSONAS
// -------------------------------------------------------------------------------------
const askepAPM = {
  id: 'USR-APM-ASK',
  userId: 'ASK-APM',
  name: 'Ir. Ahmad Fauzi',
  role: 'ASKEP',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke'
};

const askepTBS = {
  id: 'USR-TBS-ASK',
  userId: 'ASK-TBS',
  name: 'Ir. Faisal Tanjung',
  role: 'ASKEP',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih'
};

const pengurusAPM = {
  id: 'USR-APM-PGR',
  userId: 'PGR-APM',
  name: 'Ir. Hendra Gunawan',
  role: 'PENGURUS',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke'
};

// -------------------------------------------------------------------------------------
// 2. SEED DATA TRANSAKSI
// -------------------------------------------------------------------------------------
// Dokumen 1: Masuk ke APM (Akan dites jalur LAPANGAN)
const reqAPM1 = {
  id: 'REQ-APM-001',
  docNo: '2026/NIR/001',
  type: 'KEBUN_SEPUPU',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  targetEstateId: 'EST-TBS',
  targetEstateName: 'Tanah Besih',
  approvedClone: 'IRCA 19',
  approvedQty: 4000,
  growthStage: 'Rubber Advance Planting Material'
};

const dspAPM1 = {
  id: 'DSP-001',
  docNo: '2026/NIR/001/PGL/01',
  estateId: 'EST-TBS',
  issuedQty: 4000,
  issuedDate: '2026-09-20',
  vehiclePlate: 'BK 1111 AA',
  details: [{ id: 'DTL-1', batchId: 'BATCH-TBS-01', batchCode: 'B-TBS-01', clone: 'IRCA 19', qty: 4000 }]
};

// Dokumen 2: Masuk ke APM (Akan dites jalur BIBITAN)
const reqAPM2 = {
  id: 'REQ-APM-002',
  docNo: '2026/NIR/002',
  type: 'KEBUN_SEPUPU',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  targetEstateId: 'EST-TBS',
  targetEstateName: 'Tanah Besih',
  approvedClone: 'PB 260',
  approvedQty: 3000,
  growthStage: 'Rubber Main Nursery'
};

const dspAPM2 = {
  id: 'DSP-002',
  docNo: '2026/NIR/002/PGL/01',
  estateId: 'EST-TBS',
  issuedQty: 3000,
  issuedDate: '2026-09-21',
  vehiclePlate: 'BK 2222 BB',
  details: [{ id: 'DTL-2', batchId: 'BATCH-TBS-02', batchCode: 'B-TBS-02', clone: 'PB 260', qty: 3000 }]
};

// Dokumen 3: Masuk ke APM (Akan dites jalur RETURN KE PENGURUS)
const reqAPM3 = {
  id: 'REQ-APM-003',
  docNo: '2026/NIR/003',
  type: 'KEBUN_SEPUPU',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  targetEstateId: 'EST-TBS',
  targetEstateName: 'Tanah Besih',
  approvedClone: 'GT 1',
  approvedQty: 2000,
  growthStage: 'Rubber Advance Planting Material'
};

const dspAPM3 = {
  id: 'DSP-003',
  docNo: '2026/NIR/003/PGL/01',
  estateId: 'EST-TBS',
  issuedQty: 2000,
  issuedDate: '2026-09-22',
  vehiclePlate: 'BK 3333 CC',
  details: [{ id: 'DTL-3', batchId: 'BATCH-TBS-03', batchCode: 'B-TBS-03', clone: 'GT 1', qty: 2000 }]
};

// Dokumen 4: Masuk ke TBS (Milik Estate Lain)
const reqTBS1 = {
  id: 'REQ-TBS-001',
  docNo: '2026/NIR/TBS-001',
  type: 'KEBUN_SEPUPU',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  targetEstateId: 'EST-APM',
  targetEstateName: 'Aek Pamingke',
  approvedClone: 'IRCA 19',
  approvedQty: 5000,
  growthStage: 'Rubber Advance Planting Material'
};

const dspTBS1 = {
  id: 'DSP-004',
  docNo: '2026/NIR/TBS-001/PGL/01',
  estateId: 'EST-APM',
  issuedQty: 5000,
  issuedDate: '2026-09-20',
  vehiclePlate: 'BK 4444 DD',
  details: [{ id: 'DTL-4', batchId: 'BATCH-APM-01', batchCode: 'B-APM-01', clone: 'IRCA 19', qty: 5000 }]
};

// Generate Receipts
const rcp1 = createReceiptFromDispatch(dspAPM1, reqAPM1, { userId: 'MNT-TBS', role: 'MANTRI_TANAMAN' });
const rcp2 = createReceiptFromDispatch(dspAPM2, reqAPM2, { userId: 'MNT-TBS', role: 'MANTRI_TANAMAN' });
const rcp3 = createReceiptFromDispatch(dspAPM3, reqAPM3, { userId: 'MNT-TBS', role: 'MANTRI_TANAMAN' });
const rcp4 = createReceiptFromDispatch(dspTBS1, reqTBS1, { userId: 'MNT-APM', role: 'MANTRI_TANAMAN' });

// =====================================================================================
// TEST SECTION 1: SCOPE & ESTATE ISOLATION
// =====================================================================================
console.log('--- 1. Scope & Estate Isolation ---');

const allReceipts = getReceiptKspTransactions();
assert(allReceipts.length === 4, 'Setup: 4 Dokumen Penerimaan tersimpan di database');

const apmReceipts = filterReceiptKspRequests(allReceipts, askepAPM);
assert(apmReceipts.length === 3, '1a. Askep APM hanya melihat 3 dokumen penerimaan kebun APM');
assert(apmReceipts.every(r => r.targetEstateId === 'EST-APM'), '1b. Seluruh dokumen dalam inbox APM memiliki targetEstateId EST-APM');

const tbsReceipts = filterReceiptKspRequests(allReceipts, askepTBS);
assert(tbsReceipts.length === 1, '1c. Askep TBS hanya melihat 1 dokumen penerimaan kebun TBS');
assert(tbsReceipts[0].id === rcp4.id, '1d. Dokumen inbox TBS tepat rcp4');

// Sebelum Pengurus mencatat penerimaan awal, status masih MENUNGGU_PENERIMAAN_PENGURUS
assert(canPerformAskepReceiptAction(rcp1, askepAPM) === false, '2a. Dokumen status MENUNGGU_PENERIMAAN_PENGURUS belum actionable bagi Askep');

// =====================================================================================
// TEST SECTION 2: TRANSISI PENGURUS -> ASKEP ACTIONABLE
// =====================================================================================
console.log('\n--- 2. Pengurus Handoff to Askep Actionability ---');

// Pengurus mencatat penerimaan awal pada ketiga dokumen APM
processPengurusInitialReceipt(rcp1.id, { receivedDate: '2026-09-22', notes: 'Tiba di APM pos 1' }, pengurusAPM);
processPengurusInitialReceipt(rcp2.id, { receivedDate: '2026-09-22', notes: 'Tiba di APM pos 2' }, pengurusAPM);
processPengurusInitialReceipt(rcp3.id, { receivedDate: '2026-09-23', notes: 'Tiba di APM pos 3' }, pengurusAPM);

const rcp1Updated = getReceiptKspById(rcp1.id);
const rcp2Updated = getReceiptKspById(rcp2.id);
const rcp3Updated = getReceiptKspById(rcp3.id);

assert(rcp1Updated.status === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA, '2b. rcp1 berstatus MENUNGGU_VERIFIKASI_ASISTEN_KEPALA');
assert(canPerformAskepReceiptAction(rcp1Updated, askepAPM) === true, '2c. rcp1 actionable bagi Askep APM');
assert(canPerformAskepReceiptAction(rcp1Updated, askepTBS) === false, '2d. rcp1 DITOLAK actionable bagi Askep TBS (estate isolation)');
assert(canPerformAskepReceiptAction(rcp1Updated, pengurusAPM) === false, '2e. rcp1 tidak lagi actionable bagi Pengurus');

const apmInboxAfterPengurus = filterReceiptKspRequests(getReceiptKspTransactions(), askepAPM);
const askepActionableCount = getActionableReceiptCount(apmInboxAfterPengurus, askepAPM);
assert(askepActionableCount === 3, '2f. getActionableReceiptCount untuk Askep APM bernilai 3 (Red Dot ON)');

// =====================================================================================
// TEST SECTION 3: WORKFLOW A — JALUR LAPANGAN
// =====================================================================================
console.log('\n--- 3. Workflow A: Verifikasi Jalur LAPANGAN ---');

// Dapatkan divisi lapangan valid untuk APM
const apmFieldDivs = getFieldDivisionsForEstate('EST-APM');
assert(apmFieldDivs.length >= 1, '3a. Divisi lapangan APM berhasil dimuat dari Master Blok');
const targetFieldDiv = apmFieldDivs[0];

const resLapangan = processAskepVerification(rcp1.id, {
  jalurPenerimaan: 'LAPANGAN',
  targetDivisionId: targetFieldDiv.divisionId,
  notes: 'Diteruskan ke Asisten Lapangan untuk penanaman blok utama'
}, askepAPM);

assert(resLapangan.jalurPenerimaan === 'LAPANGAN', '3b. jalurPenerimaan tersimpan LAPANGAN');
assert(resLapangan.status === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_LAPANGAN, '3c. status bertransisi ke MENUNGGU_VERIFIKASI_ASISTEN_LAPANGAN');
assert(resLapangan.targetNextRole === 'ASISTEN', '3d. targetNextRole bertransisi ke ASISTEN');
assert(resLapangan.targetNextDivisionId === targetFieldDiv.divisionId, '3e. targetNextDivisionId tersimpan sesuai pilihan Askep');
assert(resLapangan.targetNextEstateId === 'EST-APM', '3f. targetNextEstateId tetap EST-APM');
assert(resLapangan.verifiedByUserId === askepAPM.userId, '3g. verifiedByUserId mencatat actor Askep');
assert(resLapangan.verifiedByName === askepAPM.name, '3h. verifiedByName mencatat nama Askep');
assert(resLapangan.askepVerifiedAt !== null, '3i. askepVerifiedAt timestamp tercatat');

// =====================================================================================
// TEST SECTION 4: WORKFLOW B — JALUR BIBITAN
// =====================================================================================
console.log('\n--- 4. Workflow B: Verifikasi Jalur BIBITAN ---');

const apmNurseryDivs = getNurseryDivisionsByEstate('EST-APM');
assert(apmNurseryDivs.length >= 1, '4a. Divisi pembibitan APM berhasil dimuat');
const targetNurseryDiv = apmNurseryDivs[0];

const resBibitan = processAskepVerification(rcp2.id, {
  jalurPenerimaan: 'BIBITAN',
  targetDivisionId: targetNurseryDiv.divisionId,
  notes: 'Diteruskan ke Asisten Bibitan untuk pemeliharaan nursery polibag besar'
}, askepAPM);

assert(resBibitan.jalurPenerimaan === 'BIBITAN', '4b. jalurPenerimaan tersimpan BIBITAN');
assert(resBibitan.status === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN, '4c. status bertransisi ke MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN');
assert(resBibitan.targetNextRole === 'ASISTEN_BIBITAN', '4d. targetNextRole bertransisi ke ASISTEN_BIBITAN');
assert(resBibitan.targetNextDivisionId === targetNurseryDiv.divisionId, '4e. targetNextDivisionId tersimpan divisi bibitan');
assert(resBibitan.verifiedByUserId === askepAPM.userId, '4f. verifiedByUserId mencatat actor Askep');

// =====================================================================================
// TEST SECTION 5: WORKFLOW C — KEMBALIKAN KE PENGURUS
// =====================================================================================
console.log('\n--- 5. Workflow C: Kembalikan ke Pengurus ---');

const resReturn = processAskepReturn(rcp3.id, {
  returnReason: 'Dokumen surat pengantar tidak sesuai dengan nomor batch fisik di truk'
}, askepAPM);

assert(resReturn.status === RECEIPT_KSP_STATUS.DIKEMBALIKAN_KE_PENGURUS, '5a. status bertransisi ke DIKEMBALIKAN_KE_PENGURUS');
assert(resReturn.targetNextRole === 'PENGURUS', '5b. targetNextRole kembali ke PENGURUS');
assert(resReturn.targetNextEstateId === 'EST-APM', '5c. targetNextEstateId tetap EST-APM');
assert(resReturn.targetNextDivisionId === null, '5d. targetNextDivisionId diset null');
assert(resReturn.returnReason.includes('tidak sesuai'), '5e. returnReason tersimpan aman');
assert(resReturn.returnedAt !== null, '5f. returnedAt timestamp tercatat');

// Dokumen yang dikembalikan kini actionable kembali untuk Pengurus APM
assert(canPerformPengurusReceiptAction(resReturn, pengurusAPM) === true, '5g. Dokumen yang dikembalikan actionable kembali untuk Pengurus APM');
assert(canPerformAskepReceiptAction(resReturn, askepAPM) === false, '5h. Dokumen yang dikembalikan tidak lagi actionable bagi Askep');

// =====================================================================================
// TEST SECTION 6: VALIDATOR & SECURITY CHECKS
// =====================================================================================
console.log('\n--- 6. Validator & Security Checks ---');

// Askep APM mencoba memverifikasi rcp4 milik TBS
let failCrossEstate = false;
try {
  processAskepVerification(rcp4.id, { jalurPenerimaan: 'LAPANGAN', targetDivisionId: 'DIV-APM-01' }, askepAPM);
} catch (e) {
  failCrossEstate = true;
}
assert(failCrossEstate === true, '6a. Verifikasi lintas kebun ditolak');

// Askep APM memilih divisi fiktif
let failFakeDiv = false;
try {
  processAskepVerification(rcp1.id, { jalurPenerimaan: 'LAPANGAN', targetDivisionId: 'DIV-FIKTIF-99' }, askepAPM);
} catch (e) {
  failFakeDiv = true;
}
assert(failFakeDiv === true, '6b. Pemilihan divisi fiktif ditolak');

// Return tanpa alasan
let failEmptyReason = false;
try {
  processAskepReturn(rcp2.id, { returnReason: '' }, askepAPM);
} catch (e) {
  failEmptyReason = true;
}
assert(failEmptyReason === true, '6c. Pengembalian tanpa alasan ditolak');

// =====================================================================================
// TEST SECTION 7: NOTIFICATION LIFECYCLE
// =====================================================================================
console.log('\n--- 7. Notification Lifecycle ---');

const apmInboxFinal = filterReceiptKspRequests(getReceiptKspTransactions(), askepAPM);
const finalActionableCount = getActionableReceiptCount(apmInboxFinal, askepAPM);
assert(finalActionableCount === 0, '7a. getActionableReceiptCount Askep bernilai 0 setelah semua diproses (Red Dot OFF)');

// =====================================================================================
// SUMMARY
// =====================================================================================
console.log('\n----------------------------------------------------------------------------------------');
console.log(`TOTAL ASSERTIONS: ${passed + failed}`);
console.log(`PASSED:           ${passed}`);
console.log(`FAILED:           ${failed}`);
console.log('----------------------------------------------------------------------------------------');

if (failed === 0) {
  console.log('✅ ALL ASKEP RECEIPT WORKFLOW TESTS PASSED!\n');
} else {
  console.error('❌ SOME ASKEP RECEIPT WORKFLOW TESTS FAILED!\n');
  process.exit(1);
}
