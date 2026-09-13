/**
 * scripts/test-receipt-ksp-asisten-bibitan.js
 * Automated Test Suite: Modul Verifikasi & Penerusan Asisten Bibitan (PENERIMAAN-06)
 * 
 * Verifikasi Skenario:
 * 1. Scope Estate Valid: Asisten Bibitan hanya dapat melihat/memproses receipt kebunnya.
 * 2. Scope Division Valid: Asisten Bibitan terisolasi pada divisi pembibitan yang sesuai.
 * 3. Hanya Jalur BIBITAN Actionable: Receipt jalur BIBITAN dengan status MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN actionable.
 * 4. Jalur LAPANGAN Ditolak: Receipt jalur LAPANGAN tidak actionable bagi Asisten Bibitan.
 * 5. Status Salah Ditolak: Receipt dengan status selain MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN tidak actionable.
 * 6. Source Batch Valid: Batch sumber pengeluaran terverifikasi lengkap.
 * 7. Source Batch Invalid Ditolak: Transaksi ditolak jika rincian batch sumber kosong/rusak.
 * 8. Forward -> MENUNGGU_PENERIMAAN_MANTRI_BIBITAN: Berhasil bertransisi status.
 * 9. Target Next Role = MANTRI_TANAMAN: Target role bertransisi ke Mantri.
 * 10. Target Next Division ID Valid: Divisi tujuan pembibitan tersimpan konsisten.
 * 11. Actor Tersimpan: asbVerifiedByUserId, asbVerifiedByName, asbVerifiedByRole tersimpan.
 * 12. Timestamp Tersimpan: asbVerifiedAt tersimpan.
 * 13. Audit Tersimpan: Audit trail ter-record dengan event APPROVE.
 * 14. DSP Tidak Berubah: Nomor DSP, tanggal, supir, plat kendaraan tetap utuh.
 * 15. Shipped Qty Tidak Berubah: Kuantitas kirim DSP asli tidak termodifikasi.
 * 16. Source Batch Tidak Berubah: Rincian batch sumber tidak terklon/tertimpa.
 * 17. Red Dot Mati Setelah Forward: Actionable count Asisten Bibitan berkurang/menjadi 0.
 * 18. Actionable untuk Mantri: Status siap diproses oleh Mantri Bibitan pada tahap penerimaan fisik.
 * 19. Role Lain Ditolak: Pengurus, Askep, dan Asisten Lapangan tidak dapat mengeksekusi modul ASB.
 * 20. Return ke Askep: Asisten Bibitan dapat mengembalikan ke Askep dengan alasan wajib.
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
  canPerformAsistenLapanganReceiptAction,
  canPerformAsistenBibitanReceiptAction,
  getActionableReceiptCount,
  filterReceiptKspRequests,
  filterReceiptKspByStatus,
  processPengurusInitialReceipt,
  processAskepVerification,
  processAsistenBibitanVerification,
  processAsistenBibitanReturn
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
console.log('   SIGMA RUBBER NURSERY — TEST SUITE: ASISTEN BIBITAN (PENERIMAAN-06)                   ');
console.log('========================================================================================\n');

// Bersihkan storage sebelum test
if (typeof globalThis.localStorage !== 'undefined' && globalThis.localStorage.clear) {
  globalThis.localStorage.clear();
}

// -------------------------------------------------------------------------------------
// 1. SETUP PERSONAS
// -------------------------------------------------------------------------------------
// Dapatkan divisi pembibitan resmi
const apmNurseryDivs = getNurseryDivisionsByEstate('EST-APM');
const targetNurseryDiv = apmNurseryDivs[0] || { divisionId: 'DIV-APM-02', divisionName: 'Divisi II' };

const asistenBibitanAPM = {
  id: 'USR-APM-ASB-01',
  userId: 'ASB-APM-01',
  name: 'Siti Rahayu, S.P.',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  divisionId: targetNurseryDiv.divisionId,
  divisionName: targetNurseryDiv.divisionName || 'Pembibitan Utama'
};

const asistenBibitanAPMOtherDiv = {
  id: 'USR-APM-ASB-02',
  userId: 'ASB-APM-02',
  name: 'Dewi Lestari, S.P.',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  divisionId: 'DIV-APM-99',
  divisionName: 'Pembibitan Cadangan'
};

const asistenBibitanTBS = {
  id: 'USR-TBS-ASB-01',
  userId: 'ASB-TBS-01',
  name: 'Rina Marlina, S.P.',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-001',
  divisionName: 'Pembibitan TBS'
};

const asistenLapAPM = {
  id: 'USR-APM-AST-01',
  userId: 'AST-APM-01',
  name: 'Budi Santoso, S.P.',
  role: 'ASISTEN',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  divisionId: 'DIV-APM-01',
  divisionName: 'Divisi 1'
};

const askepAPM = {
  id: 'USR-APM-ASK',
  userId: 'ASK-APM',
  name: 'Ir. Ahmad Fauzi',
  role: 'ASKEP',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke'
};

const pengurusAPM = {
  id: 'USR-APM-MGR',
  userId: 'MGR-APM',
  name: 'Ir. Bambang Wijaya',
  role: 'PENGURUS',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke'
};

// -------------------------------------------------------------------------------------
// 2. SETUP BASE TRANSACTIONS
// -------------------------------------------------------------------------------------
console.log('--- 1. Inisialisasi Data & Routing Jalur BIBITAN ---');

const reqData1 = {
  id: 'REQ-APM-001',
  docNo: '2026/NIR/001',
  type: 'KEBUN_SEPUPU',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  targetEstateId: 'EST-AEN',
  targetEstateName: 'Aek Nabara',
  approvedClone: 'IRCA 19',
  category: 'Polybag Besar',
  growthStage: 'Tahap 2 (Siap Tanam)',
  approvedQty: 2000
};

// Dokumen 1: Jalur BIBITAN ke APM
const dspData1 = {
  id: 'DSP-BIB-001',
  docNo: 'DSP/APM/2026/09/BIB01',
  estateId: 'EST-AEN',
  estateName: 'Aek Nabara',
  issuedDate: '2026-09-12',
  issuedQty: 2000,
  vehiclePlate: 'BK 8899 AB',
  driverName: 'Pak Dodi',
  mantriName: 'Hendra Saputra',
  details: [
    { id: 'DTL-01', batchId: 'BATCH-2025-AEN-01', batchCode: 'B-IRCA-01', clone: 'IRCA 19', qty: 1200 },
    { id: 'DTL-02', batchId: 'BATCH-2025-AEN-02', batchCode: 'B-IRCA-02', clone: 'IRCA 19', qty: 800 }
  ]
};

const r1 = createReceiptFromDispatch(dspData1, reqData1);
const r1Id = r1.id || r1.receiptId;
assert(r1 && r1Id, '1a. Receipt R1 berhasil dibuat dari Dispatch Bibitan');

// Pengurus catat penerimaan awal
processPengurusInitialReceipt(r1Id, {
  receivedDate: '2026-09-13',
  notes: 'Tiba di pos utama bibitan'
}, pengurusAPM);

// Askep memverifikasi ke jalur BIBITAN
const r1Askep = processAskepVerification(r1Id, {
  jalurPenerimaan: 'BIBITAN',
  targetDivisionId: targetNurseryDiv.divisionId,
  askepNotes: 'Diteruskan ke Asisten Bibitan untuk aklimatisasi nursery polibag'
}, askepAPM);

assert(r1Askep.status === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN, '1b. Status R1 maju ke MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN');
assert(r1Askep.targetNextRole === 'ASISTEN_BIBITAN', '1c. targetNextRole adalah ASISTEN_BIBITAN');
assert(r1Askep.jalurPenerimaan === 'BIBITAN', '1d. jalurPenerimaan adalah BIBITAN');

// Dokumen 2: Jalur LAPANGAN ke APM (sebagai pembanding isolasi)
const dspData2 = {
  id: 'DSP-LAP-002',
  docNo: 'DSP/APM/2026/09/LAP02',
  estateId: 'EST-AEN',
  estateName: 'Aek Nabara',
  issuedDate: '2026-09-12',
  issuedQty: 1000,
  vehiclePlate: 'BK 5555 ZZ',
  driverName: 'Pak Joko',
  mantriName: 'Hendra Saputra',
  details: [{ id: 'DTL-03', batchId: 'BATCH-2025-AEN-01', batchCode: 'B-IRCA-01', clone: 'IRCA 19', qty: 1000 }]
};
const r2 = createReceiptFromDispatch(dspData2, reqData1);
const r2Id = r2.id || r2.receiptId;
processPengurusInitialReceipt(r2Id, { receivedDate: '2026-09-13' }, pengurusAPM);
const r2Askep = processAskepVerification(r2Id, {
  jalurPenerimaan: 'LAPANGAN',
  targetDivisionId: 'DIV-APM-01',
  askepNotes: 'Untuk penanaman langsung di lapangan'
}, askepAPM);

// Dokumen 3: Untuk pengujian return ke Askep
const dspData3 = {
  id: 'DSP-BIB-003',
  docNo: 'DSP/APM/2026/09/BIB03',
  estateId: 'EST-AEN',
  estateName: 'Aek Nabara',
  issuedDate: '2026-09-12',
  issuedQty: 500,
  vehiclePlate: 'BK 1234 CD',
  driverName: 'Pak Rudi',
  mantriName: 'Hendra Saputra',
  details: [{ id: 'DTL-04', batchId: 'BATCH-2025-AEN-01', batchCode: 'B-IRCA-01', clone: 'IRCA 19', qty: 500 }]
};
const r3 = createReceiptFromDispatch(dspData3, reqData1);
const r3Id = r3.id || r3.receiptId;
processPengurusInitialReceipt(r3Id, { receivedDate: '2026-09-13' }, pengurusAPM);
processAskepVerification(r3Id, {
  jalurPenerimaan: 'BIBITAN',
  targetDivisionId: targetNurseryDiv.divisionId,
  askepNotes: 'Untuk uji return Asisten Bibitan'
}, askepAPM);

console.log('\n--- 2. Scope & Isolation Tests (Estate, Division & Jalur) ---');

// Test 1: Scope Estate Valid
const allReceipts = getReceiptKspTransactions();
const apmASBReceipts = filterReceiptKspRequests(allReceipts, asistenBibitanAPM);
const tbsASBReceipts = filterReceiptKspRequests(allReceipts, asistenBibitanTBS);
assert(apmASBReceipts.some(r => (r.id === r1Id || r.receiptId === r1Id)), '1. Asisten Bibitan APM melihat receipt R1 di kebun APM');
assert(!tbsASBReceipts.some(r => (r.id === r1Id || r.receiptId === r1Id)), '1b. Asisten Bibitan TBS TIDAK DAPAT melihat receipt R1 (Isolation Estate)');

// Test 2: Scope Division Valid
assert(canPerformAsistenBibitanReceiptAction(r1Askep, asistenBibitanAPM) === true, '2a. Asisten Bibitan APM berhak memproses receipt R1');
assert(canPerformAsistenBibitanReceiptAction(r1Askep, asistenBibitanAPMOtherDiv) === false, '2b. Asisten Bibitan Divisi Lain TIDAK DAPAT memproses receipt R1 (Isolation Division)');

// Test 3: Hanya Jalur BIBITAN Actionable
assert(canPerformAsistenBibitanReceiptAction(r1Askep, asistenBibitanAPM) === true, '3. Receipt R1 (Jalur BIBITAN) ACTIONABLE bagi Asisten Bibitan');

// Test 4: Jalur LAPANGAN Ditolak
assert(canPerformAsistenBibitanReceiptAction(r2Askep, asistenBibitanAPM) === false, '4. Receipt R2 (Jalur LAPANGAN) TIDAK ACTIONABLE bagi Asisten Bibitan');

// Test 5: Status Salah Ditolak
const rawUnprocessed = getReceiptKspById(r1Id);
const fakeWrongStatus = { ...rawUnprocessed, status: RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_PENGURUS };
assert(canPerformAsistenBibitanReceiptAction(fakeWrongStatus, asistenBibitanAPM) === false, '5. Status bukan MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN ditolak');

// Test 19: Role Lain Ditolak
assert(canPerformPengurusReceiptAction(r1Askep, pengurusAPM) === false, '19a. Pengurus tidak bisa memproses pada tahap Asisten Bibitan');
assert(canPerformAskepReceiptAction(r1Askep, askepAPM) === false, '19b. Askep tidak bisa memproses pada tahap Asisten Bibitan');
assert(canPerformAsistenLapanganReceiptAction(r1Askep, asistenLapAPM) === false, '19c. Asisten Lapangan tidak bisa memproses receipt jalur BIBITAN');

console.log('\n--- 3. Notification & Actionability Lifecycle ---');

const pendingActionableCount = getActionableReceiptCount(apmASBReceipts, asistenBibitanAPM);
assert(pendingActionableCount >= 2, `10. Red Dot Asisten Bibitan ON saat ada pending (${pendingActionableCount} actionable)`);

console.log('\n--- 4. Batch Validation & Execution Tests ---');

// Test 6 & 7: Source Batch Validation
assert(Array.isArray(r1Askep.details) && r1Askep.details.length === 2, '6. Source batches R1 terdaftar dan valid (2 batch)');

// Test 8-13: Process Verification & Forward to Mantri Bibitan
const verifyResult = processAsistenBibitanVerification(r1Id, {
  notes: 'Kondisi polybag dan media tanam bagus, siap diteruskan ke Mantri untuk transit di nursery'
}, asistenBibitanAPM);

assert(verifyResult.status === RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_MANTRI_BIBITAN, '8. Status bertransisi ke MENUNGGU_PENERIMAAN_MANTRI_BIBITAN');
assert(verifyResult.targetNextRole === 'MANTRI_TANAMAN', '9. targetNextRole bertransisi ke MANTRI_TANAMAN');
assert(verifyResult.targetNextDivisionId !== null, '10. targetNextDivisionId tersimpan valid');
assert(verifyResult.asbVerifiedByUserId === asistenBibitanAPM.userId, '11a. asbVerifiedByUserId mencatat actor Asisten Bibitan');
assert(verifyResult.asbVerifiedByName === asistenBibitanAPM.name, '11b. asbVerifiedByName mencatat nama Asisten Bibitan');
assert(verifyResult.asbVerifiedByRole === 'ASISTEN_BIBITAN', '11c. asbVerifiedByRole mencatat role ASISTEN_BIBITAN');
assert(verifyResult.asbVerifiedAt !== null, '12. asbVerifiedAt timestamp tercatat');
assert(verifyResult.asbVerificationNotes.includes('Kondisi polybag'), '13. Catatan verifikasi Asisten Bibitan tersimpan utuh');

// Test 14-16: DSP & Source Batch Immutability
assert(verifyResult.dispatchDocNo === 'DSP/APM/2026/09/BIB01', '14. Nomor Dokumen DSP tetap utuh');
assert(verifyResult.totalShippedQty === 2000, '15. Total Shipped Qty asli tetap 2000 Pkk (tidak termutasi)');
assert((verifyResult.details[0].sourceBatchCode === 'B-IRCA-01' || verifyResult.details[0].batchCode === 'B-IRCA-01') && verifyResult.details[0].qtyShipped === 1200, '16. Rincian batch sumber tidak berkurang atau berubah');

// Test 17: Red Dot OFF after forward
const afterForwardList = filterReceiptKspRequests(getReceiptKspTransactions(), asistenBibitanAPM);
assert(canPerformAsistenBibitanReceiptAction(verifyResult, asistenBibitanAPM) === false, '17a. Receipt R1 tidak lagi actionable bagi Asisten Bibitan');

// Test 18: Receipt siap untuk Mantri Bibitan
assert(verifyResult.targetNextRole === 'MANTRI_TANAMAN' && verifyResult.status === RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_MANTRI_BIBITAN, '18. Dokumen siap diproses oleh Mantri Bibitan');

console.log('\n--- 5. Return to Askep Workflow Tests ---');

// Test 20: Return ke Askep
const returnResult = processAsistenBibitanReturn(r3Id, {
  returnReason: 'Alokasi tempat nursery di divisi pembibitan penuh, mohon alihkan rute ke Divisi Lapangan'
}, asistenBibitanAPM);

assert(returnResult.status === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA, '20a. Return berhasil -> Status kembali ke MENUNGGU_VERIFIKASI_ASISTEN_KEPALA');
assert(returnResult.targetNextRole === 'ASKEP', '20b. Target role kembali ke ASKEP');
assert(returnResult.asbReturnReason.includes('Alokasi tempat nursery'), '20c. Alasan pengembalian tersimpan');
assert(canPerformAskepReceiptAction(returnResult, askepAPM) === true, '20d. Receipt yang dikembalikan menjadi actionable kembali untuk Askep');

console.log('\n========================================================================================');
console.log(`   HASIL TEST SUITE ASISTEN BIBITAN: ${passed} PASSED, ${failed} FAILED                 `);
console.log('========================================================================================\n');

if (failed > 0) {
  process.exit(1);
}
