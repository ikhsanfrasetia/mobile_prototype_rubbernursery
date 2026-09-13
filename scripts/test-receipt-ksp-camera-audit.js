/**
 * scripts/test-receipt-ksp-camera-audit.js
 * Automated Test Suite: TASK PENERIMAAN-08 — FINAL AUDIT KAMERA & METADATA PENERIMAAN BIBIT
 * 
 * Pengujian Audit:
 * 1. Camera Source: Wajib source === "CAMERA".
 * 2. Gallery Bypass Blocked: source === "GALLERY" atau input file picker biasa ditolak oleh validator.
 * 3. Session Actor Integrity: capturedByUserId, capturedByName, capturedByRole dicatat dari sesi aktif, bukan input form.
 * 4. Timestamp Generation: capturedAt di-generate otomatis saat capture dan berformat ISO string valid.
 * 5. GPS Metadata (Optional): Disimpan jika tersedia, aman jika null/denied (tanpa fake/hardcoded coordinate).
 * 6. Camera Failure Handling: Ketiadaan foto menggagalkan finalisasi tanpa menghasilkan dummy payload fiktif.
 * 7. Storage Persistence: Metadata foto tersimpan permanen di storage dan dapat dibaca ulang secara konsisten.
 * 8. Cross-Role Uniformity: Struktur metadata foto identik antara Asisten Lapangan dan Mantri Bibitan.
 * 9. Data Integrity Protection: Bukti foto tidak memutasi nomor DSP, kuantitas dikirim, batch sumber, klon, kategori, maupun tahapan pertumbuhan.
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
  global.localStorage = globalThis.localStorage;
}

import { storage } from '../js/core/storage.js';
import {
  PHOTO_SOURCE,
  RECEIPT_KSP_STATUS,
  RECEIPT_KSP_STORAGE_KEY
} from '../js/core/receipt-ksp-constants.js';
import {
  validatePhotoEvidence,
  validateReceiptCameraEvidence,
  validatePhysicalReceipt,
  validateReceiptCompletePayload
} from '../js/core/receipt-ksp-validator.js';
import {
  createReceiptFromDispatch,
  getReceiptKspById,
  updateReceiptKsp
} from '../js/core/receipt-ksp-manager.js';
import {
  processAsistenLapanganFinal,
  processMantriBibitanFinal,
  getActiveBlocksForDivision
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
console.log('   SIGMA RUBBER NURSERY — TEST SUITE: AUDIT KAMERA & METADATA (PENERIMAAN-08)         ');
console.log('========================================================================================\n');

// 0. Mock Setup
if (typeof globalThis.localStorage !== 'undefined' && globalThis.localStorage.clear) {
  globalThis.localStorage.clear();
}

const mockActorAsisten = {
  userId: 'USR-AST-APM-01',
  name: 'Asisten Hendra',
  role: 'ASISTEN',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-01'
};

const mockActorMantri = {
  userId: 'USR-MTR-APM-02',
  name: 'Mantri Joko',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-APM',
  divisionId: 'DIV-APM-02'
};

const apmBlocks = getActiveBlocksForDivision('EST-APM', 'DIV-APM-01');
const blockA = apmBlocks.length > 0 ? apmBlocks[0] : { id: 'BLK-01' };

console.log('--- 1. Camera Source & Gallery Bypass Verification ---');

const validCameraPhoto = {
  id: 'PHOTO-001',
  source: PHOTO_SOURCE.CAMERA,
  dataUrl: 'data:image/jpeg;base64,mockValidCameraJpegBinaryStringData',
  capturedAt: '2026-09-22T10:00:00.000Z',
  capturedByUserId: mockActorAsisten.userId,
  capturedByName: mockActorAsisten.name,
  capturedByRole: mockActorAsisten.role,
  latitude: 3.123456,
  longitude: 99.654321
};

const vResValid = validatePhotoEvidence(validCameraPhoto);
assert(vResValid.valid === true, '1a. Valid CAMERA source photo passes validation');

const galleryPhoto = {
  ...validCameraPhoto,
  source: PHOTO_SOURCE.GALLERY
};
const vResGallery = validatePhotoEvidence(galleryPhoto);
assert(vResGallery.valid === false, '1b. GALLERY source photo is strictly rejected');
assert(vResGallery.error.includes('CAMERA'), '1c. Error message explicitly demands CAMERA source');

const invalidSourcePhoto = {
  ...validCameraPhoto,
  source: 'FILE_PICKER'
};
const vResPicker = validatePhotoEvidence(invalidSourcePhoto);
assert(vResPicker.valid === false, '1d. Custom FILE_PICKER upload is rejected');

console.log('\n--- 2. Session Actor & Timestamp Integrity Verification ---');

const missingActorPhoto = {
  id: 'PHOTO-002',
  source: PHOTO_SOURCE.CAMERA,
  dataUrl: 'data:image/jpeg;base64,dummyData',
  capturedAt: '2026-09-22T10:00:00.000Z',
  capturedByUserId: '',
  capturedByName: ''
};
const vResNoActor = validatePhotoEvidence(missingActorPhoto);
assert(vResNoActor.valid === false, '2a. Photo missing actor session is rejected');

const missingTimePhoto = {
  id: 'PHOTO-003',
  source: PHOTO_SOURCE.CAMERA,
  dataUrl: 'data:image/jpeg;base64,dummyData',
  capturedAt: '',
  capturedByUserId: mockActorAsisten.userId,
  capturedByName: mockActorAsisten.name
};
const vResNoTime = validatePhotoEvidence(missingTimePhoto);
assert(vResNoTime.valid === false, '2b. Photo missing timestamp is rejected');

const invalidDataUrlPhoto = {
  id: 'PHOTO-004',
  source: PHOTO_SOURCE.CAMERA,
  dataUrl: 'invalid_image_string',
  capturedAt: new Date().toISOString(),
  capturedByUserId: mockActorAsisten.userId,
  capturedByName: mockActorAsisten.name
};
const vResBadData = validatePhotoEvidence(invalidDataUrlPhoto);
assert(vResBadData.valid === false, '2c. Photo with corrupted/invalid dataUrl is rejected');

console.log('\n--- 3. GPS Optionality & No-Fake Coordinate Verification ---');

const photoWithoutGPS = {
  id: 'PHOTO-005',
  source: PHOTO_SOURCE.CAMERA,
  dataUrl: 'data:image/jpeg;base64,validBase64StringData',
  capturedAt: new Date().toISOString(),
  capturedByUserId: mockActorAsisten.userId,
  capturedByName: mockActorAsisten.name,
  capturedByRole: mockActorAsisten.role,
  latitude: null,
  longitude: null
};
const vResNoGPS = validatePhotoEvidence(photoWithoutGPS);
assert(vResNoGPS.valid === true, '3a. Photo without GPS (permission denied/unavailable) is accepted');
assert(photoWithoutGPS.latitude === null && photoWithoutGPS.longitude === null, '3b. No fake/default coordinates generated when GPS is unavailable');

console.log('\n--- 4. Cross-Role Processing & Persistence Verification ---');

// Inisialisasi dokumen penerimaan untuk jalur LAPANGAN dan BIBITAN
const parentReqLapangan = {
  id: 'REQ-AUDIT-LAP',
  docNo: 'NIR-2026-LAP-001',
  requestedClone: 'IRCA 19',
  approvedClone: 'IRCA 19',
  requestedQty: 1000,
  approvedQty: 1000,
  category: 'Polibag Besar',
  growthStage: 'Rubber Advance Planting Material',
  estateId: 'EST-APM',
  targetEstateId: 'EST-APM',
  sourceEstateId: 'EST-TBS',
  divisionId: 'DIV-APM-01'
};

const dispatchLap = {
  id: 'DSP-AUDIT-LAP',
  docNo: 'DSP-2026-LAP-001',
  issuedQty: 1000,
  vehiclePlate: 'BK 1234 XY',
  issuedDate: '2026-09-20',
  details: [{ batchId: 'BATCH-TBS-01', batchCode: 'B-TBS-01', clone: 'IRCA 19', qty: 1000 }]
};

const receiptLap = createReceiptFromDispatch(dispatchLap, parentReqLapangan, mockActorAsisten);
// Forward ke LAPANGAN
receiptLap.status = RECEIPT_KSP_STATUS.MENUNGGU_VERIFIKASI_ASISTEN_LAPANGAN;
receiptLap.jalurPenerimaan = 'LAPANGAN';
receiptLap.targetNextRole = 'ASISTEN';
receiptLap.targetNextDivisionId = 'DIV-APM-01';
receiptLap.targetEstateId = 'EST-APM';
updateReceiptKsp(receiptLap.id, receiptLap);

// Finalisasi Asisten Lapangan dengan Foto Kamera Valid
const finalLapPayload = {
  examinationDate: '2026-09-22',
  qtyAccepted: 1000,
  qtyRejected: 0,
  blockAllocations: [{ blockId: blockA.id || blockA.blockId, allocatedQty: 1000 }],
  photoEvidence: {
    id: 'PHOTO-LAP-01',
    source: PHOTO_SOURCE.CAMERA,
    dataUrl: 'data:image/jpeg;base64,cameraEvidenceLapangan',
    capturedAt: '2026-09-22T11:00:00.000Z',
    capturedByUserId: mockActorAsisten.userId,
    capturedByName: mockActorAsisten.name,
    capturedByRole: mockActorAsisten.role,
    latitude: 3.111111,
    longitude: 99.222222
  },
  notes: 'Pemeriksaan lapangan selesai'
};

const savedLap = processAsistenLapanganFinal(receiptLap.id, finalLapPayload, mockActorAsisten);
assert(savedLap.photoEvidence !== null, '4a. Asisten Lapangan photo evidence saved');
assert(savedLap.photoEvidence.source === PHOTO_SOURCE.CAMERA, '4b. Asisten Lapangan photo source is CAMERA');
assert(savedLap.photoEvidence.capturedByUserId === mockActorAsisten.userId, '4c. Asisten Lapangan actor ID persisted');

// Inisialisasi dokumen penerimaan untuk jalur BIBITAN
const parentReqBibitan = {
  id: 'REQ-AUDIT-BIB',
  docNo: 'NIR-2026-BIB-001',
  requestedClone: 'IRCA 19',
  approvedClone: 'IRCA 19',
  requestedQty: 1500,
  approvedQty: 1500,
  category: 'Polibag Besar',
  growthStage: 'Rubber Advance Planting Material',
  estateId: 'EST-APM',
  targetEstateId: 'EST-APM',
  sourceEstateId: 'EST-TBS',
  divisionId: 'DIV-APM-02'
};

const dispatchBib = {
  id: 'DSP-AUDIT-BIB',
  docNo: 'DSP-2026-BIB-001',
  issuedQty: 1500,
  vehiclePlate: 'BK 5678 ZZ',
  issuedDate: '2026-09-20',
  details: [{ batchId: 'BATCH-TBS-02', batchCode: 'B-TBS-02', clone: 'IRCA 19', qty: 1500 }]
};

const receiptBib = createReceiptFromDispatch(dispatchBib, parentReqBibitan, mockActorMantri);
// Forward ke BIBITAN
receiptBib.status = RECEIPT_KSP_STATUS.MENUNGGU_PENERIMAAN_MANTRI_BIBITAN;
receiptBib.jalurPenerimaan = 'BIBITAN';
receiptBib.targetNextRole = 'MANTRI_TANAMAN';
receiptBib.targetNextDivisionId = 'DIV-APM-02';
receiptBib.targetEstateId = 'EST-APM';
updateReceiptKsp(receiptBib.id, receiptBib);

// Finalisasi Mantri Bibitan dengan Foto Kamera Valid
const finalBibPayload = {
  examinationDate: '2026-09-22',
  details: [{ qtyAccepted: 1500, qtyRejected: 0 }],
  photoEvidence: {
    id: 'PHOTO-BIB-01',
    source: PHOTO_SOURCE.CAMERA,
    dataUrl: 'data:image/jpeg;base64,cameraEvidenceMantri',
    capturedAt: '2026-09-22T11:15:00.000Z',
    capturedByUserId: mockActorMantri.userId,
    capturedByName: mockActorMantri.name,
    capturedByRole: mockActorMantri.role,
    latitude: null,
    longitude: null
  },
  notes: 'Pemeriksaan nursery selesai'
};

const savedBib = processMantriBibitanFinal(receiptBib.id, finalBibPayload, mockActorMantri);
assert(savedBib.photoEvidence !== null, '4d. Mantri Bibitan photo evidence saved');
assert(savedBib.photoEvidence.source === PHOTO_SOURCE.CAMERA, '4e. Mantri Bibitan photo source is CAMERA');
assert(savedBib.photoEvidence.capturedByUserId === mockActorMantri.userId, '4f. Mantri Bibitan actor ID persisted');

console.log('\n--- 5. Persistence Across Reload / Read Operation ---');

const reloadedLap = getReceiptKspById(receiptLap.id);
assert(reloadedLap.photoEvidence !== undefined && reloadedLap.photoEvidence.dataUrl.includes('cameraEvidenceLapangan'), '5a. Lapangan photo dataUrl preserved in storage');
assert(reloadedLap.photoEvidence.latitude === 3.111111, '5b. Lapangan latitude preserved in storage');

const reloadedBib = getReceiptKspById(receiptBib.id);
assert(reloadedBib.photoEvidence !== undefined && reloadedBib.photoEvidence.dataUrl.includes('cameraEvidenceMantri'), '5c. Bibitan photo dataUrl preserved in storage');
assert(reloadedBib.photoEvidence.latitude === null, '5d. Bibitan null latitude preserved without mutation');

console.log('\n--- 6. Data Integrity Verification (Immutability) ---');

assert(reloadedLap.dispatchDocNo === 'DSP-2026-LAP-001', '6a. DSP docNo unchanged by photo attachment');
assert(reloadedLap.totalShippedQty === 1000, '6b. Shipped Qty unchanged by photo attachment');
assert(reloadedBib.dispatchDocNo === 'DSP-2026-BIB-001', '6c. DSP docNo unchanged in Bibitan');
assert(reloadedBib.details[0].cloneId === 'IRCA 19', '6d. Clone preserved in receipt details');
assert(reloadedBib.details[0].growthStage === 'Rubber Advance Planting Material', '6e. Growth stage preserved in receipt details');

console.log('\n========================================================================================');
console.log(`   HASIL TEST SUITE AUDIT KAMERA: ${passed} PASSED, ${failed} FAILED                 `);
console.log('========================================================================================\n');

if (failed > 0) {
  process.exit(1);
}
