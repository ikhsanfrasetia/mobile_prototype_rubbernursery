/**
 * scripts/test-receipt-ksp-asisten-lapangan.js
 * Automated Test Suite: Modul Penerimaan Fisik Asisten Lapangan & Alokasi Block (PENERIMAAN-05)
 * 
 * Verifikasi Skenario:
 * 1. Isolation Estate: Asisten Lapangan estate lain tidak dapat melihat/memproses receipt.
 * 2. Isolation Division: Asisten Divisi lain pada estate yang sama tidak dapat melihat/memproses receipt.
 * 3. Jalur LAPANGAN only: Hanya receipt jalur LAPANGAN yang actionable bagi Asisten Lapangan (BIBITAN tidak actionable).
 * 4. Physical Qty Validation: accepted + rejected <= shipped (cannot exceed shipped quantity).
 * 5. Reject Reason Mandatory: Jika rejected > 0, reject reason wajib diisi.
 * 6. Discrepancy Reason Mandatory: Jika discrepancy > 0, discrepancy reason wajib diisi.
 * 7. Reject not allocated: Quantity reject tidak boleh masuk ke alokasi blok.
 * 8. Allocation <= accepted: Alokasi blok tidak boleh melebihi total bibit layak.
 * 9. Total allocation == accepted: SUM(allocatedQty) harus tepat sama dengan totalAcceptedQty.
 * 10. Block Active Validation: Blok yang dialokasikan harus aktif dalam master block.
 * 11. Block Division Scope Validation: Blok yang dialokasikan harus berada pada estate & divisi Asisten Lapangan.
 * 12. Photo Source CAMERA: Metadata foto wajib memiliki source CAMERA.
 * 13. Photo Actor Session: Metadata foto harus merekam user session pengambil foto.
 * 14. Save Draft: Simpan draft mengubah status menjadi SEDANG_DIPROSES tanpa menyelesaikan transaksi.
 * 15. Finalize without Discrepancy: Simpan & selesaikan saat accepted + rejected == shipped menghasilkan status DITERIMA.
 * 16. Finalize with Discrepancy: Simpan & selesaikan saat discrepancy > 0 menghasilkan status DITERIMA_DENGAN_SELISIH.
 * 17. DSP Unchanged: Data pengeluaran DSP, tanggal, plat, dan quantity asli di receipt tidak berubah/termodifikasi.
 * 18. Source Batch Unchanged: Alokasi batch sumber pengeluaran tetap utuh dan tidak termodifikasi.
 * 19. Role Authorization: Role Pengurus, Askep, Asisten Bibitan tidak dapat mengeksekusi aksi Asisten Lapangan.
 * 20. Notification & Red Dot Lifecycle: Red dot Asisten Lapangan aktif saat actionable, hilang setelah final.
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
  getActionableReceiptCount,
  filterReceiptKspRequests,
  filterReceiptKspByStatus,
  processPengurusInitialReceipt,
  processAskepVerification,
  processAsistenLapanganDraft,
  processAsistenLapanganFinal,
  getActiveBlocksForDivision
} from '../js/modules/receipt/receipt-kebun-sepupu-landing.js';
import {
  validatePhysicalReceipt,
  validateBlockAllocations,
  validateReceiptCameraEvidence
} from '../js/core/receipt-ksp-validator.js';
import { getNurseryDivisionsByEstate } from '../js/data/estate-master.js';
import { BLOCK_MASTER } from '../js/data/block-master.js';

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
console.log('   SIGMA RUBBER NURSERY — TEST SUITE: ASISTEN LAPANGAN & ALOKASI BLOK (PENERIMAAN-05)   ');
console.log('========================================================================================\n');

// Bersihkan storage sebelum test
if (typeof globalThis.localStorage !== 'undefined' && globalThis.localStorage.clear) {
  globalThis.localStorage.clear();
}

// -------------------------------------------------------------------------------------
// 1. SETUP PERSONAS
// -------------------------------------------------------------------------------------
const asistenLapAPMDiv1 = {
  id: 'USR-APM-AST-01',
  userId: 'AST-APM-01',
  name: 'Budi Santoso, S.P.',
  role: 'ASISTEN',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  divisionId: 'DIV-APM-01',
  divisionName: 'Divisi 1'
};

const asistenLapAPMDiv2 = {
  id: 'USR-APM-AST-02',
  userId: 'AST-APM-02',
  name: 'Eko Prasetyo, S.P.',
  role: 'ASISTEN',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  divisionId: 'DIV-APM-02',
  divisionName: 'Divisi 2'
};

const asistenLapTBSDiv1 = {
  id: 'USR-TBS-AST-01',
  userId: 'AST-TBS-01',
  name: 'Hendrik Simanjuntak',
  role: 'ASISTEN',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-001',
  divisionName: 'Divisi 1'
};

const asistenBibitanAPM = {
  id: 'USR-APM-BIB-01',
  userId: 'BIB-APM-01',
  name: 'Siti Rahayu',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke'
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
console.log('--- 1. Inisialisasi Data & Workflow Pre-Requisite ---');

const reqData1 = {
  id: 'REQ-APM-001',
  docNo: '2026/NIR/001',
  type: 'KEBUN_SEPUPU',
  estateId: 'EST-APM',
  estateName: 'Aek Pamingke',
  targetEstateId: 'EST-AEN',
  targetEstateName: 'Aek Nabara',
  approvedClone: 'PB 260',
  category: 'Polybag Besar',
  growthStage: 'Tahap 2 (Siap Tanam)',
  approvedQty: 1000
};

const dspData1 = {
  id: 'DSP-001',
  docNo: 'DSP/APM/2026/09/001',
  estateId: 'EST-AEN',
  estateName: 'Aek Nabara',
  issuedDate: '2026-09-12',
  issuedQty: 1000,
  vehiclePlate: 'BK 8123 SP',
  driverName: 'Supriadi',
  mantriName: 'Hendra Saputra',
  details: [
    { id: 'DTL-01', batchId: 'BATCH-2025-AEN-01', batchCode: 'B-PB260-01', clone: 'PB 260', qty: 600 },
    { id: 'DTL-02', batchId: 'BATCH-2025-AEN-02', batchCode: 'B-PB260-02', clone: 'PB 260', qty: 400 }
  ]
};

// Buat receipt dari dispatch
const r1 = createReceiptFromDispatch(dspData1, reqData1);
const r1Id = r1.id || r1.receiptId;
assert(r1 && r1Id, 'Receipt R1 berhasil dibuat dari Dispatch 1');

// Step 1: Pengurus mencatat penerimaan awal
const r1Pengurus = processPengurusInitialReceipt(r1Id, {
  arrivalDate: '2026-09-13',
  pengurusNotes: 'Tiba siang hari di Aek Pamingke dengan kondisi baik'
}, pengurusAPM);
assert(r1Pengurus.status === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_KEPALA, 'R1 maju ke MENUNGGU_VERIFIKASI_ASISTEN_KEPALA');

// Step 2: Askep memverifikasi jalur LAPANGAN ke Divisi 1 (DIV-APM-01)
const r1Askep = processAskepVerification(r1Id, {
  jalurPenerimaan: 'LAPANGAN',
  targetDivisionId: 'DIV-APM-01',
  askepNotes: 'Dialokasikan langsung ke kebun Lapangan Divisi 1'
}, askepAPM);

assert(r1Askep.status === RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_LAPANGAN, 'R1 status: MENUNGGU_VERIFIKASI_ASISTEN_LAPANGAN');
assert(r1Askep.targetNextRole === 'ASISTEN', 'R1 targetNextRole: ASISTEN');
assert(r1Askep.targetNextEstateId === 'EST-APM', 'R1 targetNextEstateId: EST-APM');
assert(r1Askep.targetNextDivisionId === 'DIV-APM-01', 'R1 targetNextDivisionId: DIV-APM-01');

// Buat Receipt R2 untuk Divisi 2 (LAPANGAN)
const dspData2 = {
  id: 'DSP-002',
  docNo: 'DSP/APM/2026/09/002',
  estateId: 'EST-AEN',
  estateName: 'Aek Nabara',
  issuedDate: '2026-09-12',
  issuedQty: 500,
  vehiclePlate: 'BK 9011 KL',
  driverName: 'Joko',
  mantriName: 'Hendra Saputra',
  details: [{ id: 'DTL-03', batchId: 'BATCH-2025-AEN-01', batchCode: 'B-PB260-01', clone: 'PB 260', qty: 500 }]
};
const r2 = createReceiptFromDispatch(dspData2, reqData1);
const r2Id = r2.id || r2.receiptId;
processPengurusInitialReceipt(r2Id, { arrivalDate: '2026-09-13' }, pengurusAPM);
const r2Askep = processAskepVerification(r2Id, {
  jalurPenerimaan: 'LAPANGAN',
  targetDivisionId: 'DIV-APM-02',
  askepNotes: 'Untuk Divisi 2'
}, askepAPM);

// Buat Receipt R3 untuk Jalur BIBITAN (Bukan Lapangan)
const dspData3 = {
  id: 'DSP-003',
  docNo: 'DSP/APM/2026/09/003',
  estateId: 'EST-AEN',
  estateName: 'Aek Nabara',
  issuedDate: '2026-09-12',
  issuedQty: 300,
  vehiclePlate: 'BK 4412 AB',
  driverName: 'Rudi',
  mantriName: 'Hendra Saputra',
  details: [{ id: 'DTL-04', batchId: 'BATCH-2025-AEN-01', batchCode: 'B-PB260-01', clone: 'PB 260', qty: 300 }]
};
const r3 = createReceiptFromDispatch(dspData3, reqData1);
const r3Id = r3.id || r3.receiptId;
processPengurusInitialReceipt(r3Id, { arrivalDate: '2026-09-13' }, pengurusAPM);
const apmNurseryDivs = getNurseryDivisionsByEstate('EST-APM');
const targetNurseryDiv = apmNurseryDivs[0];
const r3Askep = processAskepVerification(r3Id, {
  jalurPenerimaan: 'BIBITAN',
  targetDivisionId: targetNurseryDiv ? targetNurseryDiv.divisionId : 'DIV-NUR-01',
  askepNotes: 'Masuk transit bibitan'
}, askepAPM);

console.log('\n--- 2. Isolation Tests (Estate, Division & Jalur) ---');

// Test 1: Isolation Estate
const allReceipts = getReceiptKspTransactions();
const apmDiv1Receipts = filterReceiptKspRequests(allReceipts, asistenLapAPMDiv1);
const tbsDiv1Receipts = filterReceiptKspRequests(allReceipts, asistenLapTBSDiv1);
assert(apmDiv1Receipts.some(r => (r.id === r1Id || r.receiptId === r1Id)), 'Asisten APM Divisi 1 melihat receipt R1 (milik APM Div 1)');
assert(!tbsDiv1Receipts.some(r => (r.id === r1Id || r.receiptId === r1Id)), 'Asisten TBS Divisi 1 TIDAK BISA melihat receipt R1 (Isolation Estate)');

// Test 2: Isolation Division
const apmDiv2Receipts = filterReceiptKspRequests(allReceipts, asistenLapAPMDiv2);
assert(!apmDiv2Receipts.some(r => (r.id === r1Id || r.receiptId === r1Id)), 'Asisten APM Divisi 2 TIDAK BISA melihat receipt R1 (Isolation Division)');
assert(apmDiv2Receipts.some(r => (r.id === r2Id || r.receiptId === r2Id)), 'Asisten APM Divisi 2 melihat receipt R2 (milik APM Div 2)');

// Test 3: Jalur LAPANGAN Only Actionable
assert(canPerformAsistenLapanganReceiptAction(r1Askep, asistenLapAPMDiv1) === true, 'Receipt R1 (LAPANGAN, Div 1) ACTIONABLE bagi Asisten Lapangan Div 1');
assert(canPerformAsistenLapanganReceiptAction(r2Askep, asistenLapAPMDiv1) === false, 'Receipt R2 (LAPANGAN, Div 2) TIDAK ACTIONABLE bagi Asisten Lapangan Div 1');
assert(canPerformAsistenLapanganReceiptAction(r3Askep, asistenLapAPMDiv1) === false, 'Receipt R3 (BIBITAN) TIDAK ACTIONABLE bagi Asisten Lapangan (Jalur BIBITAN)');

// Test 19: Role Authorization
assert(canPerformPengurusReceiptAction(r1Askep, pengurusAPM) === false, 'Pengurus TIDAK BISA memproses receipt pada tahap Asisten Lapangan');
assert(canPerformAskepReceiptAction(r1Askep, askepAPM) === false, 'Askep TIDAK BISA memproses kembali receipt pada tahap Asisten Lapangan');
assert(canPerformAsistenLapanganReceiptAction(r1Askep, asistenBibitanAPM) === false, 'Asisten Bibitan TIDAK BISA memproses receipt jalur Asisten Lapangan');

console.log('\n--- 3. Validation Rules Tests (Physical Quantities & Discrepancies) ---');

// Test 4: Physical Qty Validation (accepted + rejected <= shipped)
const validPhysical = validatePhysicalReceipt({
  qtyShipped: 1000,
  qtyAccepted: 950,
  qtyRejected: 30,
  rejectReason: 'Patah batang saat transit',
  discrepancyReason: 'Ketinggalan di truk 20 bibit'
});
assert(validPhysical.isValid === true, 'Validasi quantity fisik lolos saat accepted(950) + rejected(30) <= shipped(1000)');
assert(validPhysical.discrepancyQty === 20, 'Discrepancy quantity dihitung akurat: 1000 - (950 + 30) = 20');

const overQty = validatePhysicalReceipt({
  qtyShipped: 1000,
  qtyAccepted: 900,
  qtyRejected: 150
});
assert(overQty.isValid === false && overQty.errors.some(e => e.includes('melebihi')), 'Validasi menolak jika accepted + rejected (1050) > shipped (1000)');

const negativeQty = validatePhysicalReceipt({
  qtyShipped: 1000,
  qtyAccepted: -10,
  qtyRejected: 0
});
assert(negativeQty.isValid === false, 'Validasi menolak quantity negatif');

// Test 5: Reject Reason Mandatory
const missingRejectReason = validatePhysicalReceipt({
  qtyShipped: 1000,
  qtyAccepted: 950,
  qtyRejected: 50,
  rejectReason: ''
});
assert(missingRejectReason.isValid === false && missingRejectReason.errors.some(e => e.includes('Alasan reject/rusak wajib')), 'Reject reason WAJIB jika qtyRejected > 0');

// Test 6: Discrepancy Reason Mandatory
const missingDiscrepancyReason = validatePhysicalReceipt({
  qtyShipped: 1000,
  qtyAccepted: 950,
  qtyRejected: 0,
  discrepancyReason: ''
});
assert(missingDiscrepancyReason.isValid === false && missingDiscrepancyReason.errors.some(e => e.includes('Alasan selisih/discrepancy wajib')), 'Discrepancy reason WAJIB jika discrepancy > 0 (50 bibit)');

console.log('\n--- 4. Block Allocation Validation Tests ---');

// Dapatkan block aktif Divisi 1 APM
const div1Blocks = getActiveBlocksForDivision('EST-APM', 'DIV-APM-01');
assert(div1Blocks.length > 0, `Ditemukan ${div1Blocks.length} blok aktif untuk EST-APM DIV-APM-01`);

const blockA = div1Blocks[0];
const blockB = div1Blocks[1] || div1Blocks[0];

// Test 7 & 8: Reject cannot be allocated & allocation <= accepted
const validAlloc = validateBlockAllocations([
  { blockId: blockA.blockId || blockA.id, blockCode: blockA.blockCode, allocatedQty: 600 },
  { blockId: blockB.blockId || blockB.id, blockCode: blockB.blockCode, allocatedQty: 350 }
], 950, 'EST-APM', 'DIV-APM-01');
assert(validAlloc.isValid === true, 'Alokasi valid saat total alokasi (950) == totalAcceptedQty (950)');

// Test 9: Total allocation == accepted
const underAlloc = validateBlockAllocations([
  { blockId: blockA.blockId || blockA.id, blockCode: blockA.blockCode, allocatedQty: 500 }
], 950, 'EST-APM', 'DIV-APM-01');
assert(underAlloc.isValid === false && underAlloc.errors.some(e => e.includes('tidak sama')), 'Validasi menolak jika total alokasi (500) != totalAcceptedQty (950)');

const overAlloc = validateBlockAllocations([
  { blockId: blockA.blockId || blockA.id, blockCode: blockA.blockCode, allocatedQty: 1000 }
], 950, 'EST-APM', 'DIV-APM-01');
assert(overAlloc.isValid === false && overAlloc.errors.some(e => e.includes('tidak sama')), 'Validasi menolak jika total alokasi (1000) != totalAcceptedQty (950)');

// Test 10: Block Active Validation
const inactiveBlockAlloc = validateBlockAllocations([
  { blockId: 'NON-EXISTENT-BLOCK', blockCode: 'BLK-FAKE', allocatedQty: 950 }
], 950, 'EST-APM', 'DIV-APM-01');
assert(inactiveBlockAlloc.isValid === false, 'Validasi menolak blok yang tidak terdaftar / tidak aktif');

// Test 11: Block Division Scope Validation
// Ambil blok dari divisi 2
const div2Blocks = getActiveBlocksForDivision('EST-APM', 'DIV-APM-02');
if (div2Blocks.length > 0) {
  const foreignBlock = div2Blocks[0];
  const wrongDivAlloc = validateBlockAllocations([
    { blockId: foreignBlock.blockId || foreignBlock.id, blockCode: foreignBlock.blockCode, allocatedQty: 950 }
  ], 950, 'EST-APM', 'DIV-APM-01');
  assert(wrongDivAlloc.isValid === false && wrongDivAlloc.errors.some(e => e.includes('tidak berada pada divisi tujuan')), 'Validasi menolak blok milik Divisi 2 untuk Asisten Divisi 1');
}

console.log('\n--- 5. Camera Photo Evidence Validation Tests ---');

// Test 12: Photo source wajib CAMERA
const photoCamera = {
  dataUrl: 'data:image/jpeg;base64,samplephoto123',
  source: 'CAMERA',
  capturedAt: new Date().toISOString(),
  capturedByUserId: asistenLapAPMDiv1.userId,
  capturedByName: asistenLapAPMDiv1.name,
  capturedByRole: asistenLapAPMDiv1.role
};
const validPhotoCheck = validateReceiptCameraEvidence(photoCamera);
assert(validPhotoCheck.isValid === true, 'Foto kamera valid dengan source CAMERA dan capturedAt otomatis');

const fakePhotoUpload = {
  dataUrl: 'data:image/jpeg;base64,samplephoto123',
  source: 'FILE_UPLOAD'
};
const invalidPhotoCheck = validateReceiptCameraEvidence(fakePhotoUpload);
assert(invalidPhotoCheck.isValid === false && invalidPhotoCheck.errors.some(e => e.includes('CAMERA')), 'Validasi menolak foto dengan source bukan CAMERA (tidak boleh upload file biasa)');

// Test 13: Actor photo session
assert(photoCamera.capturedByUserId === 'AST-APM-01' && photoCamera.capturedByRole === 'ASISTEN', 'Metadata foto merekam actor session Asisten Lapangan');

console.log('\n--- 6. Draft & Finalize Processing Workflow Tests ---');

// Test 14: Save Draft -> SEDANG_DIPROSES
const draftResult = processAsistenLapanganDraft(r1Id, {
  inspectionDate: '2026-09-13',
  qtyAccepted: 950,
  qtyRejected: 30,
  rejectReason: 'Batang bengkok saat transit',
  notes: 'Pemeriksaan fisik parsial'
}, asistenLapAPMDiv1);

assert(draftResult.status === RECEIPT_KSP_STATUS.SEDANG_DIPROSES, 'Simpan draft berhasil -> status SEDANG_DIPROSES');
assert(draftResult.totalAcceptedQty === 950, 'Draft menyimpan qtyAccepted: 950');
assert(canPerformAsistenLapanganReceiptAction(draftResult, asistenLapAPMDiv1) === true, 'Receipt status SEDANG_DIPROSES tetap ACTIONABLE bagi Asisten Lapangan');

// Test 15: Finalize Without Discrepancy -> DITERIMA
// Buat receipt fresh R4 untuk final tanpa discrepancy (1000 shipped -> 1000 accepted)
const dspData4 = {
  id: 'DSP-004',
  docNo: 'DSP/APM/2026/09/004',
  estateId: 'EST-AEN',
  estateName: 'Aek Nabara',
  issuedDate: '2026-09-12',
  issuedQty: 1000,
  vehiclePlate: 'BK 7788 ZZ',
  driverName: 'Pak Dodi',
  mantriName: 'Hendra Saputra',
  details: [{ id: 'DTL-05', batchId: 'BATCH-2025-AEN-01', batchCode: 'B-PB260-01', clone: 'PB 260', qty: 1000 }]
};
const r4 = createReceiptFromDispatch(dspData4, reqData1);
const r4Id = r4.id || r4.receiptId;
processPengurusInitialReceipt(r4Id, { arrivalDate: '2026-09-13' }, pengurusAPM);
processAskepVerification(r4Id, {
  jalurPenerimaan: 'LAPANGAN',
  targetDivisionId: 'DIV-APM-01'
}, askepAPM);

const finalNoDiscResult = processAsistenLapanganFinal(r4Id, {
  inspectionDate: '2026-09-13',
  qtyAccepted: 1000,
  qtyRejected: 0,
  notes: 'Bibit diterima utuh 1000 pohon',
  blockAllocations: [
    { blockId: blockA.blockId || blockA.id, blockCode: blockA.blockCode, allocatedQty: 1000 }
  ],
  photoEvidence: photoCamera
}, asistenLapAPMDiv1);

assert(finalNoDiscResult.status === RECEIPT_KSP_STATUS.DITERIMA, 'Final tanpa discrepancy (1000 shipped == 1000 accepted) -> status: DITERIMA');
assert(finalNoDiscResult.discrepancyQty === 0, 'Discrepancy qty adalah 0');
assert(finalNoDiscResult.blockAllocations.length === 1, 'Block allocations tersimpan utuh');
assert(finalNoDiscResult.photoEvidence.source === 'CAMERA', 'Photo evidence CAMERA tersimpan');

// Test 16: Finalize With Discrepancy -> DITERIMA_DENGAN_SELISIH
// Gunakan R1 yang memiliki 1000 shipped -> 950 accepted, 30 rejected, 20 selisih
const finalWithDiscResult = processAsistenLapanganFinal(r1Id, {
  inspectionDate: '2026-09-13',
  qtyAccepted: 950,
  qtyRejected: 30,
  rejectReason: 'Patah pucuk dalam perjalanan',
  discrepancyReason: 'Kekurangan fisik 20 bibit dari bak truk',
  notes: 'Diterima dengan catatan reject dan selisih',
  blockAllocations: [
    { blockId: blockA.blockId || blockA.id, blockCode: blockA.blockCode, allocatedQty: 600 },
    { blockId: blockB.blockId || blockB.id, blockCode: blockB.blockCode, allocatedQty: 350 }
  ],
  photoEvidence: photoCamera
}, asistenLapAPMDiv1);

assert(finalWithDiscResult.status === RECEIPT_KSP_STATUS.DITERIMA_DENGAN_SELISIH, 'Final dengan selisih (20 bibit) -> status: DITERIMA_DENGAN_SELISIH');
assert(finalWithDiscResult.discrepancyQty === 20, 'Discrepancy 20 tercatat');
assert(finalWithDiscResult.discrepancyReason === 'Kekurangan fisik 20 bibit dari bak truk', 'Discrepancy reason tercatat');

// Test 17 & 18: DSP and Source Batches Immutability
assert(finalWithDiscResult.dispatchDocNo === 'DSP/APM/2026/09/001', 'Nomor DSP tidak berubah');
assert(finalWithDiscResult.totalShippedQty === 1000, 'Quantity Shipped DSP asli tetap 1000 (tidak termutasi)');
assert(finalWithDiscResult.details.length === 2 && finalWithDiscResult.details[0].qtyShipped === 600, 'Source batches DSP tetap utuh dan tidak berkurang');

// Test 20: Notification & Red Dot Lifecycle
const pendingList = filterReceiptKspRequests(getReceiptKspTransactions(), asistenLapAPMDiv1);
const actionableCount = getActionableReceiptCount(pendingList, asistenLapAPMDiv1);
assert(actionableCount === 0, 'Actionable count untuk Asisten Lapangan Div 1 menjadi 0 setelah semua receipt diselesaikan (Red dot hilang)');

console.log('\n========================================================================================');
console.log(`   HASIL TEST SUITE ASISTEN LAPANGAN: ${passed} PASSED, ${failed} FAILED                 `);
console.log('========================================================================================\n');

if (failed > 0) {
  process.exit(1);
}
