// Mock localStorage before imports
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import { storage } from '../js/core/storage.js';
import { 
  updateDederanInspection, 
  getBedenganInspectionSummary, 
  DEDERAN_STORAGE_KEYS 
} from '../js/modules/seeding/dederan-manager.js';
import { 
  getMantriTodayTransactions, 
  submitModuleTransactions,
  MANTRI_TRANSACTION_STATUS 
} from '../js/modules/verification/mantri-confirmation-service.js';
import { getAuthorizedTransactions } from '../js/core/transaction-actor.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

console.log('====================================================');
console.log('TESTING INSPECTION CORRECTION (EDIT / REVISION) FLOW');
console.log('====================================================\n');

const mantriUser = {
  id: 'MTR-01',
  userId: 'MTR-01',
  code: 'MNT01',
  name: 'Wagiman',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

// 1. Setup Bedengan Dederan Induk & Transaksi
storage.set(DEDERAN_STORAGE_KEYS.INDUK, [
  {
    id: 'DDR-001',
    docNo: '2026/DDR/001',
    klon: 'GT 1',
    totalNilaiButirPenerimaan: 5000,
    totalDidederSDHI: 5000,
    sisaBelumDeder: 0,
    estateId: 'EST-TBS',
    divisionId: 'DIV-001'
  }
]);

storage.set(DEDERAN_STORAGE_KEYS.TRANSACTIONS, [
  {
    id: 'DED-004',
    docNo: '2026/DED/004',
    parentDederIndukDocNo: '2026/DDR/001',
    bedenganCode: 'BED-004',
    jumlahDeder: 2000,
    tanggalDeder: '10/10/2026',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    createdByUserId: 'MTR-01'
  }
]);

// 2. Setup Returned Inspection Transaction 2026/DED-INS/008
storage.set(DEDERAN_STORAGE_KEYS.INSPECTIONS, [
  {
    id: 'DED-INS-008',
    docNo: '2026/DED-INS/008',
    dederanTxDocNo: '2026/DED/004',
    bedenganCode: 'BED-004',
    tanggalPemeriksaan: '10/10/2026',
    jumlahDiperiksa: 2000,
    jumlahBerhasil: 0,
    jumlahTidakBerhasil: 2000,
    status: 'DIKEMBALIKAN',
    verificationStatus: 'DIKEMBALIKAN',
    returnReason: 'periksa ulang nilai riject',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    createdByUserId: 'MTR-01',
    inspectorName: 'Wagiman'
  }
]);

storage.set('verification_transactions', [
  {
    verificationId: 'VRF-001',
    referenceType: 'PEMERIKSAAN_DEDERAN',
    referenceId: '2026/DED-INS/008',
    referenceDocNo: '2026/DED-INS/008',
    verificationStatus: 'DIKEMBALIKAN',
    returnReason: 'periksa ulang nilai riject'
  }
]);

// Cek kondisi awal sebelum koreksi
const dederTx = storage.get(DEDERAN_STORAGE_KEYS.TRANSACTIONS, [])[0];
const initialSummary = getBedenganInspectionSummary(dederTx);
assert(initialSummary.totalBerhasil === 0, 'Kondisi Awal: Bedengan Berhasil = 0');
assert(initialSummary.totalTidakBerhasil === 2000, 'Kondisi Awal: Bedengan Tidak Berhasil = 2000');

// 3. Mantri Melakukan Koreksi: Diperiksa = 2000, Berhasil = 1000
const correctionPayload = {
  jumlahDiperiksa: 2000,
  jumlahBerhasil: 1000,
  inspectorName: 'Wagiman',
  photos: []
};

const updateResult = updateDederanInspection('2026/DED-INS/008', correctionPayload);
assert(updateResult.inspection.jumlahBerhasil === 1000, 'Update Result: jumlahBerhasil = 1000');
assert(updateResult.inspection.jumlahTidakBerhasil === 1000, 'Update Result: jumlahTidakBerhasil = 1000');
assert(updateResult.inspection.status === 'MENUNGGU_VERIFIKASI_MANTRI', 'Update Result: status reset to MENUNGGU_VERIFIKASI_MANTRI');
assert(updateResult.inspection.verificationStatus === 'MENUNGGU_VERIFIKASI_MANTRI', 'Update Result: verificationStatus reset to MENUNGGU_VERIFIKASI_MANTRI');
assert(updateResult.inspection.isCorrected === true, 'Update Result: isCorrected is true');
assert(updateResult.inspection.returnReason === null, 'Update Result: active returnReason cleared');
assert(updateResult.inspection.lastReturnReason === 'periksa ulang nilai riject', 'Update Result: lastReturnReason preserved as audit history');

// 4. Verifikasi Ringkasan Bedengan Dederan Terupdate
const updatedSummary = getBedenganInspectionSummary(dederTx);
assert(updatedSummary.totalBerhasil === 1000, 'Setelah Koreksi: Bedengan totalBerhasil = 1000');
assert(updatedSummary.totalTidakBerhasil === 1000, 'Setelah Koreksi: Bedengan totalTidakBerhasil = 1000');

// 5. Verifikasi Filter Pemeriksaan Landing
const allInspections = storage.get(DEDERAN_STORAGE_KEYS.INSPECTIONS, []);
const authorizedInspections = getAuthorizedTransactions(allInspections, mantriUser);

const isDederInspectionReturned = (insp) => {
  if (insp.isCorrected || insp.status === 'MENUNGGU_VERIFIKASI_MANTRI' || insp.status === 'PENDING_SUBMISSION' || insp.status === 'APPROVED' || insp.status === 'DISETUJUI') {
    return false;
  }
  return insp.status === 'DIKEMBALIKAN' || insp.verificationStatus === 'DIKEMBALIKAN' || insp.status === 'REVISION';
};

const returnedList = authorizedInspections.filter(i => isDederInspectionReturned(i));
const normalList = authorizedInspections.filter(i => !isDederInspectionReturned(i));

assert(returnedList.length === 0, 'Landing Page: Dokumen 2026/DED-INS/008 TIDAK lagi muncul di Transaksi Perlu Perbaikan');
assert(normalList.length === 1, 'Landing Page: Dokumen 2026/DED-INS/008 MUNCUL di Ringkasan Data Pemeriksaan Dederan (Rincian Transaksi)');
assert(normalList[0].jumlahBerhasil === 1000, 'Landing Page: Rincian Transaksi menampilkan Berhasil = 1.000');
assert(normalList[0].jumlahTidakBerhasil === 1000, 'Landing Page: Rincian Transaksi menampilkan Tidak Berhasil = 1.000');

// 6. Verifikasi Alur Konfirmasi Mantri (Tinjau Data Hari Ini)
const mantriTodayTxs = getMantriTodayTransactions(mantriUser);
const foundInToday = mantriTodayTxs.find(tx => tx.docNo === '2026/DED-INS/008');

assert(foundInToday !== undefined, 'Tinjau Data Hari Ini: Dokumen terkoreksi ditemukan dalam antrean Mantri');
assert(foundInToday.status === MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM, 'Tinjau Data Hari Ini: Status dokumen adalah READY_TO_CONFIRM (Siap Kirim)');
assert(foundInToday.summary.includes('1.000 Berhasil'), 'Tinjau Data Hari Ini: Summary menampilkan 1.000 Berhasil');

// Mock attendance transactions for gate
storage.set('attendance_transactions', [
  {
    id: 'ATT-SUP-01',
    type: 'SUPERVISOR',
    attendanceType: 'DATANG',
    date: '2026-10-10',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    userId: 'MTR-01'
  },
  {
    id: 'ATT-WRK-01',
    type: 'WORKER',
    attendanceType: 'DATANG',
    date: '2026-10-10',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    workerId: 'WRK-01'
  }
]);

// 7. Verifikasi Pengiriman ke Asisten Bibitan
const submitRes = submitModuleTransactions('PEMERIKSAAN_DEDERAN', mantriUser);
assert(submitRes.success === true, 'Kirim ke Asisten: Submission berhasil');

const afterSubmitInspections = storage.get(DEDERAN_STORAGE_KEYS.INSPECTIONS, []);
const afterSubmitDoc = afterSubmitInspections.find(i => i.docNo === '2026/DED-INS/008');
assert(afterSubmitDoc.submissionStatus === 'SUBMITTED_TO_ASB', 'Kirim ke Asisten: submissionStatus = SUBMITTED_TO_ASB');
assert(afterSubmitDoc.status === 'MENUNGGU_VERIFIKASI', 'Kirim ke Asisten: status = MENUNGGU_VERIFIKASI');

console.log(`\nResults: ${passed}/${total} assertions passed.`);
