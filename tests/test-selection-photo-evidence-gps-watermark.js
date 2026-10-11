/**
 * TEST SUITE: PHOTO EVIDENCE WITH GPS WATERMARK & MANDATORY VALIDATION
 * Pelaksanaan Seleksi I, Seleksi II, dan Seleksi III
 */

import { storage } from '../js/core/storage.js';
import {
  validateSeleksi1Execution,
  createSeleksi1ExecutionTransaction,
  validateSeleksi2Execution,
  createSeleksi2ExecutionTransaction,
  validateSeleksi3Execution,
  createSeleksi3ExecutionTransaction,
  getPreGraftingSelectionDocuments,
  createPreGraftingSelectionDocument
} from '../js/modules/selection/selection-manager.js';

console.log('='.repeat(70));
console.log('TEST SUITE: SELECTION PHOTO EVIDENCE & GPS WATERMARK VALIDATION');
console.log('='.repeat(70));

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`✗ FAIL: ${message}`);
    failCount++;
  }
}

// Setup Mock Environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

globalThis.localStorage.clear();
const mockUser = {
  id: 'USR-MANTRI-01',
  code: 'MNT-01',
  name: 'Mantri Bibitan Lapangan',
  role: 'MANTRI_TANAMAN'
};

// Seed Attendance
const todayStr = new Date().toISOString().slice(0, 10);
storage.set('attendance_transactions', [
  { type: 'SUPERVISOR', role: 'MANTRI_TANAMAN', attendanceType: 'DATANG', date: todayStr, status: 'PRESENT' },
  { type: 'WORKER', workerId: 'WRK-01', attendanceType: 'DATANG', date: todayStr, status: 'PRESENT' }
]);

// Seed parent selection documents
const sampleParentDocSel1 = {
  id: 'DOC-SEL1-TEST-001',
  docNo: '2026/SEL/001',
  batchCode: 'BTCH-001',
  bedenganCode: 'BED-001',
  selectionStage: 'SELEKSI_1',
  sourcePolybagQty: 1000,
  sourceBibitQty: 2000,
  status: 'DRAFT',
  rows: [
    { bedenganCode: 'BED-001', polybagCount: 1000, bibitCount: 2000, seedingDocNo: '2026/SOW/001' }
  ]
};

const sampleParentDocSel2 = {
  id: 'DOC-SEL2-TEST-001',
  docNo: '2026/SEL-II/001',
  batchCode: 'BTCH-001',
  bedenganCode: 'BED-001',
  selectionStage: 'SELEKSI_2',
  sourcePolybagQty: 1000,
  sourceBibitQty: 1800,
  status: 'DRAFT',
  rows: [
    { bedenganCode: 'BED-001', polybag: 1000, disemai: 1800 }
  ]
};

const sampleParentDocSel3 = {
  id: 'DOC-SEL3-TEST-001',
  docNo: '2026/SEL-III/001',
  batchCode: 'BTCH-001',
  bedenganCode: 'BED-001',
  selectionStage: 'SELEKSI_3',
  sourcePolybagQty: 1000,
  sourceBibitQty: 1700,
  status: 'DRAFT',
  rows: [
    { bedenganCode: 'BED-001', polybag: 1000, disemai: 1700 }
  ]
};

storage.set('pre_grafting_selection_documents', [sampleParentDocSel1, sampleParentDocSel2, sampleParentDocSel3]);

// Sample valid photo
const validPhotoData = {
  id: 'PHOTO-TEST-001',
  dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...',
  capturedAt: '2026-10-11T09:30:00.000Z',
  capturedAtLabel: '11/10/2026 16:30:00 WIB',
  latitude: 3.585210,
  longitude: 98.675630,
  batchCode: 'BTCH-001',
  bedenganCode: 'BED-001',
  source: 'CAMERA'
};

// ============================================================================
// TEST 1: Seleksi I - Simpan tanpa foto ditolak saat requirePhoto = true
// ============================================================================
const valSel1NoPhoto = validateSeleksi1Execution({
  bedenganCode: 'BED-001',
  actualPolybagInspectedQty: 500,
  actualBibitSelectedQty: 50,
  fromUI: true
}, sampleParentDocSel1, [], { requirePhoto: true });

assert(
  !valSel1NoPhoto.isValid && valSel1NoPhoto.errors.some(e => e.includes('Foto bukti pemeriksaan')),
  'Seleksi I: Transaksi tanpa foto bukti ditolak saat requirePhoto aktif'
);

// ============================================================================
// TEST 2: Seleksi I - Simpan dengan foto valid berhasil lolos
// ============================================================================
const valSel1WithPhoto = validateSeleksi1Execution({
  bedenganCode: 'BED-001',
  actualPolybagInspectedQty: 500,
  actualBibitSelectedQty: 50,
  photo: validPhotoData,
  fromUI: true
}, sampleParentDocSel1, [], { requirePhoto: true });

assert(
  valSel1WithPhoto.isValid,
  'Seleksi I: Transaksi dengan foto bukti valid berhasil lolos validasi'
);

// ============================================================================
// TEST 3: Seleksi I - Foto non-dataURL / invalid format ditolak
// ============================================================================
const valSel1InvalidPhoto = validateSeleksi1Execution({
  bedenganCode: 'BED-001',
  actualPolybagInspectedQty: 500,
  actualBibitSelectedQty: 50,
  photo: { dataUrl: 'invalid_image_format' },
  fromUI: true
}, sampleParentDocSel1, [], { requirePhoto: true });

assert(
  !valSel1InvalidPhoto.isValid && valSel1InvalidPhoto.errors.some(e => e.includes('Foto bukti pemeriksaan')),
  'Seleksi I: Format foto bukan data URL image ditolak'
);

// ============================================================================
// TEST 4: Seleksi II - Simpan tanpa foto ditolak
// ============================================================================
const valSel2NoPhoto = validateSeleksi2Execution({
  bedenganCode: 'BED-001',
  actualPolybagInspectedQty: 400,
  actualBibitSelectedQty: 30,
  fromUI: true
}, sampleParentDocSel2, [], { requirePhoto: true });

assert(
  !valSel2NoPhoto.isValid && valSel2NoPhoto.errors.some(e => e.includes('Foto bukti pemeriksaan')),
  'Seleksi II: Transaksi tanpa foto bukti ditolak'
);

// ============================================================================
// TEST 5: Seleksi II - Simpan dengan foto valid berhasil
// ============================================================================
const valSel2WithPhoto = validateSeleksi2Execution({
  bedenganCode: 'BED-001',
  actualPolybagInspectedQty: 400,
  actualBibitSelectedQty: 30,
  photo: validPhotoData,
  fromUI: true
}, sampleParentDocSel2, [], { requirePhoto: true });

assert(
  valSel2WithPhoto.isValid,
  'Seleksi II: Transaksi dengan foto bukti valid berhasil lolos validasi'
);

// ============================================================================
// TEST 6: Seleksi III - Simpan tanpa foto ditolak
// ============================================================================
const valSel3NoPhoto = validateSeleksi3Execution({
  bedenganCode: 'BED-001',
  actualPolybagInspectedQty: 300,
  actualBibitSelectedQty: 20,
  fromUI: true
}, sampleParentDocSel3, [], { requirePhoto: true });

assert(
  !valSel3NoPhoto.isValid && valSel3NoPhoto.errors.some(e => e.includes('Foto bukti pemeriksaan')),
  'Seleksi III: Transaksi tanpa foto bukti ditolak'
);

// ============================================================================
// TEST 7: Seleksi III - Simpan dengan foto valid berhasil
// ============================================================================
const valSel3WithPhoto = validateSeleksi3Execution({
  bedenganCode: 'BED-001',
  actualPolybagInspectedQty: 300,
  actualBibitSelectedQty: 20,
  photo: validPhotoData,
  fromUI: true
}, sampleParentDocSel3, [], { requirePhoto: true });

assert(
  valSel3WithPhoto.isValid,
  'Seleksi III: Transaksi dengan foto bukti valid berhasil lolos validasi'
);

// ============================================================================
// TEST 8: createSeleksi2ExecutionTransaction menyimpan payload foto lengkap
// ============================================================================
const txSel2 = createSeleksi2ExecutionTransaction({
  selectionDocumentId: sampleParentDocSel2.id,
  selectionDocNo: sampleParentDocSel2.docNo,
  bedenganCode: 'BED-001',
  actualPolybagInspectedQty: 400,
  actualBibitSelectedQty: 30,
  actualBibitRetainedQty: 1770,
  tanggalSeleksi: '11/10/2026',
  photo: validPhotoData,
  requirePhoto: true
}, mockUser);

assert(
  txSel2.success &&
  txSel2.transaction.photo !== null &&
  txSel2.transaction.photo.latitude === 3.585210 &&
  txSel2.transaction.photo.longitude === 98.675630 &&
  txSel2.transaction.photo.bedenganCode === 'BED-001' &&
  txSel2.transaction.photo.source === 'CAMERA' &&
  txSel2.transaction.hasPhotoEvidence === true &&
  txSel2.transaction.photoEvidence === validPhotoData.dataUrl,
  'Seleksi II: Transaksi tersimpan lengkap dengan metadata GPS (lat, long), batch, bedengan, dan photoEvidence'
);

// ============================================================================
// TEST 9: createSeleksi3ExecutionTransaction menyimpan payload foto lengkap
// ============================================================================
const txSel3 = createSeleksi3ExecutionTransaction({
  selectionDocumentId: sampleParentDocSel3.id,
  selectionDocNo: sampleParentDocSel3.docNo,
  bedenganCode: 'BED-001',
  actualPolybagInspectedQty: 300,
  actualBibitSelectedQty: 20,
  actualBibitRetainedQty: 1680,
  tanggalSeleksi: '11/10/2026',
  photo: validPhotoData,
  requirePhoto: true
}, mockUser);

assert(
  txSel3.success &&
  txSel3.transaction.photo !== null &&
  txSel3.transaction.photo.latitude === 3.585210 &&
  txSel3.transaction.photo.longitude === 98.675630 &&
  txSel3.transaction.photo.bedenganCode === 'BED-001' &&
  txSel3.transaction.photo.source === 'CAMERA' &&
  txSel3.transaction.hasPhotoEvidence === true &&
  txSel3.transaction.photoEvidence === validPhotoData.dataUrl,
  'Seleksi III: Transaksi tersimpan lengkap dengan metadata GPS (lat, long), batch, bedengan, dan photoEvidence'
);

// ============================================================================
// TEST 10: Tepat satu foto per transaksi (single record photo per tx)
// ============================================================================
assert(
  Array.isArray(txSel2.transaction.photos) && txSel2.transaction.photos.length === 1 &&
  Array.isArray(txSel3.transaction.photos) && txSel3.transaction.photos.length === 1,
  'Tepat satu foto tersimpan per transaksi bedengan (photos.length === 1)'
);

// ============================================================================
// TEST 11: createSeleksi1ExecutionTransaction menyimpan payload foto lengkap
// ============================================================================
// Seed approved SOW so gate allows Seleksi 1
storage.set('seeding_transactions', [{
  id: 'SOW-APP-001',
  docNo: '2026/SOW/001',
  batchCode: 'BTCH-001',
  bedenganCode: 'BED-001',
  status: 'APPROVED',
  verificationStatus: 'TERVERIFIKASI'
}]);
storage.set('cull_transactions', [{
  id: 'CULL-APP-001',
  sourceSeedingDocNo: '2026/SOW/001',
  status: 'APPROVED',
  verificationStatus: 'TERVERIFIKASI'
}]);

const txSel1 = createSeleksi1ExecutionTransaction({
  selectionDocumentId: sampleParentDocSel1.id,
  selectionDocNo: sampleParentDocSel1.docNo,
  bedenganId: 'BED-001',
  bedenganCode: 'BED-001',
  sourceSeedingDocNo: '2026/SOW/001',
  actualPolybagInspectedQty: 500,
  actualBibitSelectedQty: 50,
  actualBibitRetainedQty: 1950,
  tanggalSeleksi: '11/10/2026',
  photo: validPhotoData,
  requirePhoto: true
}, mockUser);

assert(
  txSel1.success &&
  txSel1.transaction.photo !== null &&
  txSel1.transaction.photo.latitude === 3.585210 &&
  txSel1.transaction.photo.longitude === 98.675630 &&
  txSel1.transaction.photo.bedenganCode === 'BED-001' &&
  txSel1.transaction.photo.source === 'CAMERA' &&
  txSel1.transaction.hasPhotoEvidence === true &&
  txSel1.transaction.photoEvidence === validPhotoData.dataUrl,
  'Seleksi I: Transaksi tersimpan lengkap dengan metadata GPS (lat, long), batch, bedengan, dan photoEvidence'
);

console.log('='.repeat(70));
console.log(`TOTAL PASS: ${passCount} | TOTAL FAIL: ${failCount}`);
console.log('='.repeat(70));

if (failCount > 0) {
  process.exit(1);
}
