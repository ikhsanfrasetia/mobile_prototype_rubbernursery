/**
 * scripts/test-receipt-ksp-pengurus.js
 * Automated Test Suite: Modul Penerimaan Bibit Pengurus Pemohon (PENERIMAAN-03)
 * 
 * Verifikasi 14 Requirement Kunci:
 * 1. Pengurus hanya melihat receipt dalam scope (Estate isolation).
 * 2. Receipt dengan status benar tampil (MENUNGGU_PENERIMAAN_PENGURUS).
 * 3. Receipt dengan status lain tidak actionable.
 * 4. Pengurus dapat membuka detail penerimaan (read-only).
 * 5. Pengurus dapat mencatat penerimaan awal (tanggal tiba & catatan).
 * 6. Setelah submit status menjadi MENUNGGU_VERIFIKASI_ASISTEN_KEPALA.
 * 7. targetNextRole = ASKEP.
 * 8. Audit actor tercatat (userId, name, role).
 * 9. Timestamp tercatat (initialReceivedDate, receivedAt).
 * 10. Dispatch tetap SELESAI (tidak berubah).
 * 11. shippedQty tidak berubah.
 * 12. Source batch tidak berubah.
 * 13. Notification Pengurus hilang setelah submit (actionable count = 0).
 * 14. Non-Pengurus tidak dapat mengeksekusi catat penerimaan awal.
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
  getActionableReceiptCount,
  filterReceiptKspRequests,
  filterReceiptKspByStatus,
  processPengurusInitialReceipt
} from '../js/modules/receipt/receipt-kebun-sepupu-landing.js';

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
console.log('   SIGMA RUBBER NURSERY — TEST SUITE: MODUL PENERIMAAN PENGURUS (PENERIMAAN-03)         ');
console.log('========================================================================================\n');

// Bersihkan storage sebelum test
if (typeof globalThis.localStorage !== 'undefined' && globalThis.localStorage.clear) {
  globalThis.localStorage.clear();
}

// -------------------------------------------------------------------------------------
// 1. SETUP PERSONAS / ACTORS
// -------------------------------------------------------------------------------------
const pengurusAPM = {
  id: 'USR-APM-PGR',
  userId: 'PGR-APM',
  name: 'Ir. Hendra Gunawan',
  role: 'PENGURUS',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  divisionId: 'DIV-APM-01'
};

const pengurusTBS = {
  id: 'USR-TBS-PGR',
  userId: 'PGR-TBS',
  name: 'Ir. Budi Santoso',
  role: 'PENGURUS',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-TBS-01'
};

const asistenAPM = {
  id: 'USR-APM-AST',
  userId: 'AST-APM',
  name: 'Abdul Gofur',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  divisionId: 'DIV-APM-02'
};

// -------------------------------------------------------------------------------------
// 2. SEED DISPATCH & RECEIPT DATA
// -------------------------------------------------------------------------------------
// Request 1: Kebun APM minta ke TBS (Target Pemohon = APM, Sumber = TBS)
const parentRequestAPM = {
  id: 'REQ-APM-001',
  docNo: '2026/NIR/001',
  type: 'KEBUN_SEPUPU',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  targetEstateId: 'EST-TBS',
  targetEstateName: 'Tanah Besih',
  approvedClone: 'IRCA 19',
  approvedQty: 5000,
  growthStage: 'Rubber Advance Planting Material',
  status: 'MENUNGGU_PENERIMAAN_PENGURUS'
};

// Dispatch 1 untuk Request 1
const dispatchRecordAPM = {
  id: 'DSP-TBS-001',
  docNo: '2026/NIR/001/PGL/01',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  issuedQty: 5000,
  issuedDate: '2026-09-18',
  vehiclePlate: 'BK 1234 XY',
  status: 'SELESAI',
  details: [
    {
      id: 'DTL-01',
      batchId: 'BATCH-TBS-01',
      batchCode: 'B-TBS-01',
      clone: 'IRCA 19',
      qty: 5000
    }
  ]
};

// Request 2: Kebun TBS minta ke APM (Target Pemohon = TBS, Sumber = APM)
const parentRequestTBS = {
  id: 'REQ-TBS-001',
  docNo: '2026/NIR/002',
  type: 'KEBUN_SEPUPU',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  targetEstateId: 'EST-APM',
  targetEstateName: 'Aek Pamingke',
  approvedClone: 'PB 260',
  approvedQty: 3000,
  growthStage: 'Rubber Main Nursery',
  status: 'MENUNGGU_PENERIMAAN_PENGURUS'
};

const dispatchRecordTBS = {
  id: 'DSP-APM-001',
  docNo: '2026/NIR/002/PGL/01',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  issuedQty: 3000,
  issuedDate: '2026-09-19',
  vehiclePlate: 'BK 5678 ZZ',
  status: 'SELESAI',
  details: [
    {
      id: 'DTL-02',
      batchId: 'BATCH-APM-04',
      batchCode: 'B-APM-04',
      clone: 'PB 260',
      qty: 3000
    }
  ]
};

// Buat receipt dari dispatch
const rcpAPM = createReceiptFromDispatch(dispatchRecordAPM, parentRequestAPM, {
  userId: 'MNT-TBS',
  name: 'Wagiman',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS'
});

const rcpTBS = createReceiptFromDispatch(dispatchRecordTBS, parentRequestTBS, {
  userId: 'MNT-APM',
  name: 'Supriono',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-APM'
});

// =====================================================================================
// TEST 1 - 3: SCOPE, ESTATE ISOLATION & ACTIONABILITY
// =====================================================================================
console.log('--- 1. Estate Isolation & Pengurus Actionability ---');

const allReceipts = getReceiptKspTransactions();
assert(allReceipts.length === 2, 'Setup: 2 Dokumen Penerimaan berhasil di-generate');

// Pengurus APM melihat inbox APM
const apmInbox = filterReceiptKspRequests(allReceipts, pengurusAPM);
assert(apmInbox.length === 1, '1a. Pengurus APM hanya melihat 1 receipt (milik APM)');
assert(apmInbox[0].id === rcpAPM.id, '1b. Dokumen yang terlihat adalah rcpAPM');
assert(apmInbox[0].targetEstateId === 'EST-APM', '1c. Target estate penerima sesuai scope APM');

// Pengurus TBS melihat inbox TBS
const tbsInbox = filterReceiptKspRequests(allReceipts, pengurusTBS);
assert(tbsInbox.length === 1, '1d. Pengurus TBS hanya melihat 1 receipt (milik TBS)');
assert(tbsInbox[0].id === rcpTBS.id, '1e. Dokumen yang terlihat adalah rcpTBS');

// Actionability
assert(canPerformPengurusReceiptAction(rcpAPM, pengurusAPM) === true, '2a. Pengurus APM berhak memproses rcpAPM (status MENUNGGU_PENERIMAAN_PENGURUS)');
assert(canPerformPengurusReceiptAction(rcpTBS, pengurusAPM) === false, '2b. Pengurus APM DITOLAK memproses rcpTBS milik estate lain');
assert(canPerformPengurusReceiptAction(rcpAPM, pengurusTBS) === false, '2c. Pengurus TBS DITOLAK memproses rcpAPM');
assert(canPerformPengurusReceiptAction(rcpAPM, asistenAPM) === false, '3a. Role non-Pengurus (Asisten) DITOLAK melakukan action Pengurus');

// Actionable Count & Notification Dot
const apmActionableCount = getActionableReceiptCount(apmInbox, pengurusAPM);
assert(apmActionableCount === 1, '3b. getActionableReceiptCount untuk Pengurus APM bernilai 1');

// Status dengan state lain tidak actionable bagi Pengurus
const nonActionableReceipt = {
  ...rcpAPM,
  status: RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA,
  targetNextRole: 'ASKEP'
};
assert(canPerformPengurusReceiptAction(nonActionableReceipt, pengurusAPM) === false, '3c. Receipt berstatus MENUNGGU_VERIFIKASI_ASISTEN_KEPALA tidak actionable bagi Pengurus');

// =====================================================================================
// TEST 4: FILTER STATUS TABS
// =====================================================================================
console.log('\n--- 2. Filter Status Tabs ---');

const tabSemua = filterReceiptKspByStatus(apmInbox, 'SEMUA');
assert(tabSemua.length === 1, '4a. Tab SEMUA menampilkan 1 item');

const tabMenunggu = filterReceiptKspByStatus(apmInbox, 'MENUNGGU_PENERIMAAN');
assert(tabMenunggu.length === 1, '4b. Tab MENUNGGU_PENERIMAAN menampilkan 1 item');

const tabDiproses = filterReceiptKspByStatus(apmInbox, 'DIPROSES');
assert(tabDiproses.length === 0, '4c. Tab DIPROSES kosong saat awal');

const tabSelesai = filterReceiptKspByStatus(apmInbox, 'SELESAI');
assert(tabSelesai.length === 0, '4d. Tab SELESAI kosong saat awal');

// =====================================================================================
// TEST 5 - 9: EKSEKUSI CATAT PENERIMAAN AWAL OLEH PENGURUS
// =====================================================================================
console.log('\n--- 3. Eksekusi Catat Penerimaan Awal ---');

// Form data input oleh Pengurus APM
const initialFormValues = {
  receivedDate: '2026-09-20',
  notes: 'Bibit tiba lengkap di pos penerimaan utama kebun Aek Pamingke'
};

const updatedReceipt = processPengurusInitialReceipt(rcpAPM.id, initialFormValues, pengurusAPM);

assert(updatedReceipt !== null, '5a. processPengurusInitialReceipt berhasil dijalankan');
assert(updatedReceipt.status === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA, '6. Status receipt bertransisi menjadi MENUNGGU_VERIFIKASI_ASISTEN_KEPALA');
assert(updatedReceipt.targetNextRole === 'ASKEP', '7a. targetNextRole bertransisi menjadi ASKEP');
assert(updatedReceipt.targetNextEstateId === 'EST-APM', '7b. targetNextEstateId tetap estate pemohon (EST-APM)');
assert(updatedReceipt.targetNextDivisionId === null, '7c. targetNextDivisionId diset null');

// Audit & Actor Check
assert(updatedReceipt.approvedByUserId === pengurusAPM.userId, '8a. approvedByUserId tercatat PGR-APM');
assert(updatedReceipt.approvedByName === pengurusAPM.name, '8b. approvedByName tercatat Ir. Hendra Gunawan');
assert(updatedReceipt.approvedByRole === 'PENGURUS', '8c. approvedByRole tercatat PENGURUS');
assert(Array.isArray(updatedReceipt.auditTrail) && updatedReceipt.auditTrail.length >= 2, '8d. Audit trail terakumulasi');

// Timestamps & Notes
assert(updatedReceipt.initialReceivedDate === '2026-09-20', '9a. initialReceivedDate tercatat 2026-09-20');
assert(updatedReceipt.pengurusNotes === initialFormValues.notes, '9b. Catatan pengurus tersimpan');
assert(updatedReceipt.receivedAt !== null, '9c. receivedAt timestamp otomatis tercatat');

// =====================================================================================
// TEST 10 - 12: DATA IMMUTABILITY & DISPATCH INTEGRITY
// =====================================================================================
console.log('\n--- 4. Data Immutability & Dispatch Integrity ---');

assert(dispatchRecordAPM.status === 'SELESAI', '10. Dispatch record tetap berstatus SELESAI');
assert(updatedReceipt.totalShippedQty === 5000, '11. totalShippedQty tidak berubah (5.000 Pkk)');
assert(updatedReceipt.details[0].sourceBatchCode === 'B-TBS-01', '12a. sourceBatchCode tidak berubah (B-TBS-01)');
assert(updatedReceipt.details[0].qtyShipped === 5000, '12b. qtyShipped detail tidak berubah');
assert(updatedReceipt.vehiclePlate === 'BK 1234 XY', '12c. vehiclePlate tidak berubah');

// =====================================================================================
// TEST 13 - 14: NOTIFICATION LIFECYCLE & SECURITY VALIDATION
// =====================================================================================
console.log('\n--- 5. Notification Lifecycle & Security ---');

const apmInboxAfter = filterReceiptKspRequests(getReceiptKspTransactions(), pengurusAPM);
const actionableAfter = getActionableReceiptCount(apmInboxAfter, pengurusAPM);
assert(actionableAfter === 0, '13. getActionableReceiptCount Pengurus bernilai 0 setelah submit (Red Dot hilang)');

// Non-Pengurus coba execute
let failedAsisten = false;
try {
  processPengurusInitialReceipt(rcpTBS.id, initialFormValues, asistenAPM);
} catch (e) {
  failedAsisten = true;
}
assert(failedAsisten === true, '14a. Eksekusi oleh Asisten ditolak dengan error otorisasi');

// Cross-estate execute
let failedCrossEstate = false;
try {
  processPengurusInitialReceipt(rcpTBS.id, initialFormValues, pengurusAPM);
} catch (e) {
  failedCrossEstate = true;
}
assert(failedCrossEstate === true, '14b. Eksekusi lintas kebun ditolak dengan error otorisasi');

// Validasi Form input kosong
let failedEmptyDate = false;
try {
  processPengurusInitialReceipt(rcpTBS.id, { receivedDate: '' }, pengurusTBS);
} catch (e) {
  failedEmptyDate = true;
}
assert(failedEmptyDate === true, '14c. Tanggal penerimaan kosong ditolak');

// =====================================================================================
// SUMMARY
// =====================================================================================
console.log('\n----------------------------------------------------------------------------------------');
console.log(`TOTAL ASSERTIONS: ${passed + failed}`);
console.log(`PASSED:           ${passed}`);
console.log(`FAILED:           ${failed}`);
console.log('----------------------------------------------------------------------------------------');

if (failed === 0) {
  console.log('✅ ALL PENGURUS RECEIPT WORKFLOW TESTS PASSED!\n');
} else {
  console.error('❌ SOME PENGURUS RECEIPT WORKFLOW TESTS FAILED!\n');
  process.exit(1);
}
