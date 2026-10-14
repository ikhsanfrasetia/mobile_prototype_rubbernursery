import assert from 'node:assert';
import { storage } from '../js/core/storage.js';
import { ROLES } from '../js/core/user-context.js';
import { todayISO, todayDDMMYYYY } from '../js/core/utils.js';
import {
  returnVerification,
  approveVerification,
  getVerificationRecordsByScope,
  VERIFICATION_STORAGE_KEY,
  VERIFICATION_STATUS
} from '../js/modules/verification/verification-manager.js';
import {
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  SELECTION_STORAGE_KEY,
  SELECTION_STATUS,
  SELECTION_STAGES,
  getPreGraftingSelectionDocuments,
  syncAllApprovedPreGraftingSelectionDocuments
} from '../js/modules/selection/selection-manager.js';
import {
  submitMantriTransactions,
  getMantriTodayTransactions,
  MODULE_TYPES,
  MANTRI_TRANSACTION_STATUS
} from '../js/modules/verification/mantri-confirmation-service.js';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

console.log('================================================================================');
console.log('TEST SUITE: RETURN -> KOREKSI -> CENTRAL HUB -> ASB RE-APPROVAL -> STAGE II & III');
console.log('================================================================================');

function clearStorage() {
  globalThis.localStorage.clear();
  storage.set('attendance_transactions', [
    {
      id: `ATT-SUP-${todayISO()}`,
      date: todayISO(),
      type: 'SUPERVISOR',
      role: ROLES.MANTRI_TANAMAN,
      attendanceType: 'DATANG',
      status: 'HADIR',
      estateId: 'EST-TBS',
      divisionId: 'DIV-001'
    },
    {
      id: `ATT-WRK-${todayISO()}`,
      date: todayISO(),
      type: 'WORKER',
      workerId: 'WRK-001',
      attendanceType: 'DATANG',
      status: 'HADIR',
      estateId: 'EST-TBS',
      divisionId: 'DIV-001'
    }
  ]);
}

const mockAsb = {
  id: 'ASB_01',
  userId: 'ASB_01',
  name: 'Budi Santoso (ASB)',
  role: ROLES.ASISTEN_BIBITAN,
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-001',
  divisionName: 'Divisi 1'
};

const mockMantri = {
  id: 'MTR_01',
  userId: 'MTR_01',
  name: 'Wagiman (Mantri)',
  role: ROLES.MANTRI_TANAMAN,
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-001',
  divisionName: 'Divisi 1'
};

const todayStr = todayDDMMYYYY();

// ============================================================================
// TEST 1: Eliminasi Dokumen Ganda di ASB untuk 2026/SEL/003 dan 2026/SEL/004
// ============================================================================
{
  clearStorage();
  
  // Dokumen Induk Seleksi I di pre_grafting_selection_documents
  const preDoc003 = {
    id: 'DOC-SEL-003',
    docNo: '2026/SEL/003',
    selectionStage: 'SELEKSI_I',
    batchCode: 'BTCH-2026-003',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
    sourcePolybagQty: 500,
    sourceBibitQty: 1000,
    totalLayak: 900,
    totalAfkir: 100,
    rows: [{ bedenganCode: 'BED-003', polybagCount: 500 }]
  };

  // Legacy Cull record dengan docNo yang sama di selection_transactions
  const cull003 = {
    id: 'TX-CULL-003',
    docNo: '2026/SEL/003',
    selectionNo: '2026/SEL/003',
    transactionType: 'SELECTION',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    status: 'MENUNGGU_VERIFIKASI',
    quantity: 100,
    jumlahAfkir: 100
  };

  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [preDoc003]);
  storage.set(SELECTION_STORAGE_KEY, [cull003]);

  // Record verifikasi di verification_transactions dengan composite keys berbeda
  storage.set(VERIFICATION_STORAGE_KEY, [
    {
      verificationId: 'VRF-001',
      referenceType: 'SELECTION',
      referenceId: 'TX-CULL-003',
      referenceDocNo: '2026/SEL/003',
      verificationStatus: VERIFICATION_STATUS.MENUNGGU_VERIFIKASI,
      createdAt: new Date(Date.now() - 10000).toISOString()
    },
    {
      verificationId: 'VRF-002',
      referenceType: 'SELEKSI_PRA_OKULASI',
      referenceId: 'DOC-SEL-003',
      referenceDocNo: '2026/SEL/003',
      verificationStatus: VERIFICATION_STATUS.MENUNGGU_VERIFIKASI,
      createdAt: new Date().toISOString()
    }
  ]);

  const asbRecords = getVerificationRecordsByScope(mockAsb);
  const matchingCards = asbRecords.filter(r => r.referenceDocNo === '2026/SEL/003');

  assert.strictEqual(matchingCards.length, 1, 'KARTU GANDA HARUS DIELIMINASI: Hanya ada 1 kartu untuk 2026/SEL/003 di ASB');
  assert.strictEqual(matchingCards[0].referenceType, 'SELEKSI_PRA_OKULASI', 'Tipe canonical harus SELEKSI_PRA_OKULASI');
  console.log('✓ PASS 1: Eliminasi dokumen ganda (2026/SEL/003) di ASB berhasil 100%.');
}

// ============================================================================
// TEST 2: Workflow ASB Kembalikan -> Mantri Koreksi -> Konfirmasi Verifikasi -> ASB Muncul Menunggu
// ============================================================================
{
  clearStorage();

  const doc004 = {
    id: 'DOC-SEL-004',
    docNo: '2026/SEL/004',
    selectionStage: 'SELEKSI_I',
    batchCode: 'BTCH-2026-004',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    tanggalSeleksi: todayStr,
    status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
    sourcePolybagQty: 500,
    sourceBibitQty: 1000,
    totalLayak: 900,
    totalAfkir: 100,
    isCompleted: true,
    submittedByUserId: mockMantri.id,
    submittedByName: mockMantri.name,
    rows: [{ bedenganCode: 'BED-004', polybagCount: 500 }]
  };
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [doc004]);

  const childTx = {
    id: 'TX-SEL-004-1',
    docNo: '2026/SEL-I/004',
    selectionDocumentId: 'DOC-SEL-004',
    parentSelectionDocumentId: 'DOC-SEL-004',
    selectionDocNo: '2026/SEL/004',
    transactionType: 'PELAKSANAAN_SELEKSI_I',
    selectionStage: 'SELEKSI_I',
    selectionType: 'PRA_OKULASI',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    status: 'SUBMITTED_TO_ASB',
    polybagScope: 500,
    actualPolybagInspectedQty: 500,
    actualBibitSelectedQty: 100,
    actualBibitRetainedQty: 900,
    tanggalSeleksi: todayStr
  };
  storage.set(SELECTION_STORAGE_KEY, [childTx]);

  storage.set(VERIFICATION_STORAGE_KEY, [
    {
      verificationId: 'VRF-004',
      referenceType: 'SELEKSI_PRA_OKULASI',
      referenceId: 'DOC-SEL-004',
      referenceDocNo: '2026/SEL/004',
      verificationStatus: VERIFICATION_STATUS.MENUNGGU_VERIFIKASI,
      createdAt: new Date().toISOString()
    }
  ]);

  // A. ASB Mengembalikan Dokumen
  returnVerification({
    referenceType: 'SELEKSI_PRA_OKULASI',
    referenceId: 'DOC-SEL-004',
    returnReason: 'Periksa ulang bedengan BED-004',
    currentUser: mockAsb
  });

  let preDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  let returnedDoc = preDocs.find(d => d.id === 'DOC-SEL-004');
  assert.strictEqual(returnedDoc.status, 'DIKEMBALIKAN', 'Status Dokumen Induk harus DIKEMBALIKAN');
  assert.strictEqual(returnedDoc.returnReason, 'Periksa ulang bedengan BED-004', 'Alasan pengembalian tersimpan');

  // ASB melihat status DIKEMBALIKAN pada history/tab
  let asbScope = getVerificationRecordsByScope(mockAsb);
  let asbCardReturned = asbScope.find(r => r.referenceDocNo === '2026/SEL/004');
  assert.strictEqual(asbCardReturned.verificationStatus, VERIFICATION_STATUS.DIKEMBALIKAN);

  // B. Mantri Melihat Transaksi Perlu Koreksi
  // Mantri mengoreksi hasil inspeksi:
  returnedDoc.totalAfkir = 80;
  returnedDoc.totalLayak = 920;
  returnedDoc.status = 'COMPLETED';
  returnedDoc.isCompleted = true;
  returnedDoc.isCorrected = true;
  returnedDoc.verificationStatus = null;
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [returnedDoc]);

  // Update child transaction juga
  childTx.actualBibitSelectedQty = 80;
  childTx.actualBibitRetainedQty = 920;
  childTx.status = 'COMPLETED';
  storage.set(SELECTION_STORAGE_KEY, [childTx]);

  // C. Mantri Mengirim melalui "Konfirmasi untuk Verifikasi" (Central Hub)
  const submitRes = submitMantriTransactions(['DOC-SEL-004'], mockMantri);
  assert.strictEqual(submitRes.submittedCount, 1, '1 dokumen Seleksi I harus berhasil disubmit ke ASB');

  // D. Validasi di ASB: Dokumen MUNCUL KEMBALI sebagai MENUNGGU (bukan Dikembalikan)
  let asbScopeAfterSubmit = getVerificationRecordsByScope(mockAsb);
  let resubmittedCard = asbScopeAfterSubmit.find(r => r.referenceDocNo === '2026/SEL/004');
  assert.ok(resubmittedCard, 'Kartu 2026/SEL/004 harus ada di ASB');
  assert.strictEqual(resubmittedCard.verificationStatus, VERIFICATION_STATUS.MENUNGGU_VERIFIKASI, 'Status harus kembali MENUNGGU_VERIFIKASI untuk verifikasi ulang');
  assert.strictEqual(resubmittedCard.returnReason, null, 'returnReason harus di-reset');

  console.log('✓ PASS 2: Siklus Kembalikan -> Koreksi -> Konfirmasi Verifikasi -> ASB Menunggu Verifikasi Ulang sukses 100%.');
}

// ============================================================================
// TEST 3: ASB Menyetujui Ulang -> Buka Akses Seleksi II -> Buka Akses Seleksi III
// ============================================================================
{
  clearStorage();

  const docSeleksi1 = {
    id: 'DOC-SEL-001',
    docNo: '2026/SEL/001',
    selectionStage: 'SELEKSI_I',
    batchCode: 'BTCH-2026-001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    tanggalSeleksi: todayStr,
    status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
    sourcePolybagQty: 500,
    sourceBibitQty: 1000,
    totalLayak: 950,
    totalAfkir: 50,
    finalBibitQty: 950,
    isCompleted: true,
    submittedByUserId: mockMantri.id,
    submittedByName: mockMantri.name,
    rows: [{ bedenganCode: 'BED-001', polybagCount: 500 }]
  };
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [docSeleksi1]);

  const childTx1 = {
    id: 'TX-SEL-001-1',
    docNo: '2026/SEL-I/001',
    selectionDocumentId: 'DOC-SEL-001',
    parentSelectionDocumentId: 'DOC-SEL-001',
    selectionDocNo: '2026/SEL/001',
    transactionType: 'PELAKSANAAN_SELEKSI_I',
    selectionStage: 'SELEKSI_I',
    selectionType: 'PRA_OKULASI',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    status: 'SUBMITTED_TO_ASB',
    polybagScope: 500,
    actualPolybagInspectedQty: 500,
    actualBibitSelectedQty: 50,
    actualBibitRetainedQty: 950,
    tanggalSeleksi: todayStr
  };
  storage.set(SELECTION_STORAGE_KEY, [childTx1]);

  storage.set(VERIFICATION_STORAGE_KEY, [
    {
      verificationId: 'VRF-001',
      referenceType: 'SELEKSI_PRA_OKULASI',
      referenceId: 'DOC-SEL-001',
      referenceDocNo: '2026/SEL/001',
      verificationStatus: VERIFICATION_STATUS.MENUNGGU_VERIFIKASI,
      createdAt: new Date().toISOString()
    }
  ]);

  // A. ASB Approve Seleksi I
  approveVerification({
    referenceType: 'SELEKSI_PRA_OKULASI',
    referenceId: 'DOC-SEL-001',
    notes: 'Hasil seleksi I valid dan disetujui.',
    currentUser: mockAsb
  });

  let allPreDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  let approvedSel1 = allPreDocs.find(d => d.id === 'DOC-SEL-001');
  assert.strictEqual(approvedSel1.status, 'DISETUJUI', 'Seleksi I harus DISETUJUI');
  assert.strictEqual(approvedSel1.isFinal, true, 'Seleksi I harus isFinal = true');

  // Dokumen Seleksi II harus otomatis terbuat!
  let sel2Doc = allPreDocs.find(d => d.selectionStage === 'SELEKSI_II' || d.selectionStage === 'SELEKSI_2');
  assert.ok(sel2Doc, 'Dokumen Seleksi II harus otomatis dibentuk setelah Seleksi I disetujui');
  assert.strictEqual(sel2Doc.sourceSelectionDocNo, '2026/SEL/001', 'Traceability Seleksi II ke Seleksi I');
  assert.strictEqual(sel2Doc.sourceBibitQty, 950, 'Bibit awal Seleksi II harus sama dengan Layak Seleksi I (950)');

  // B. Seleksi II Execution oleh Mantri
  sel2Doc.totalLayak = 920;
  sel2Doc.totalAfkir = 30;
  sel2Doc.finalBibitQty = 920;
  sel2Doc.status = 'COMPLETED';
  sel2Doc.isCompleted = true;
  sel2Doc.tanggalSeleksi = todayStr;
  sel2Doc.submittedByUserId = mockMantri.id;
  sel2Doc.submittedByName = mockMantri.name;
  allPreDocs = allPreDocs.map(d => d.id === sel2Doc.id ? sel2Doc : d);
  storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, allPreDocs);

  // Tambahkan child execution transaction untuk Seleksi II
  const childTx2 = {
    id: 'TX-SEL-002-1',
    docNo: '2026/SEL-II/001-TX',
    selectionDocumentId: sel2Doc.id,
    parentSelectionDocumentId: sel2Doc.id,
    selectionDocNo: sel2Doc.docNo,
    transactionType: 'PELAKSANAAN_SELEKSI_II',
    selectionStage: 'SELEKSI_II',
    selectionType: 'PRA_OKULASI',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    status: 'COMPLETED',
    polybagScope: 500,
    actualPolybagInspectedQty: 500,
    actualBibitSelectedQty: 30,
    actualBibitRetainedQty: 920,
    tanggalSeleksi: todayStr
  };
  const currentSelTxs = storage.get(SELECTION_STORAGE_KEY, []);
  currentSelTxs.push(childTx2);
  storage.set(SELECTION_STORAGE_KEY, currentSelTxs);

  // Mantri submit Seleksi II
  const submitRes2 = submitMantriTransactions([sel2Doc.id], mockMantri);
  assert.strictEqual(submitRes2.submittedCount, 1, '1 dokumen Seleksi II harus berhasil disubmit ke ASB');

  // C. ASB Approve Seleksi II
  approveVerification({
    referenceType: 'SELEKSI_PRA_OKULASI',
    referenceId: sel2Doc.id,
    notes: 'Hasil seleksi II valid dan disetujui.',
    currentUser: mockAsb
  });

  allPreDocs = storage.get(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, []);
  let approvedSel2 = allPreDocs.find(d => d.id === sel2Doc.id);
  assert.strictEqual(approvedSel2.status, 'DISETUJUI', 'Seleksi II harus DISETUJUI');
  assert.strictEqual(approvedSel2.isFinal, true, 'Seleksi II harus isFinal = true');

  // Dokumen Seleksi III harus otomatis terbuat!
  let sel3Doc = allPreDocs.find(d => d.selectionStage === 'SELEKSI_III' || d.selectionStage === 'SELEKSI_3');
  assert.ok(sel3Doc, 'Dokumen Seleksi III harus otomatis dibentuk setelah Seleksi II disetujui');
  assert.strictEqual(sel3Doc.sourceSelectionDocNo, sel2Doc.docNo, 'Traceability Seleksi III ke Seleksi II');
  assert.strictEqual(sel3Doc.sourceBibitQty, 920, 'Bibit awal Seleksi III harus sama dengan Layak Seleksi II (920)');

  console.log('✓ PASS 3: Alur persetujuan Seleksi I -> Generate Seleksi II -> Persetujuan Seleksi II -> Generate Seleksi III terverifikasi sukses 100%.');
}

console.log('================================================================================');
console.log('SEMUA TEST LENGKAP: 3/3 BERHASIL LOLOS TANPA KESALAHAN!');
console.log('================================================================================');
