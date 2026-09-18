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
  canPerformMantriDispatchAction, 
  getActionableDispatchCount 
} from '../js/modules/dispatch/dispatch-landing.js';
import { 
  getActionableIncomingCount as getActionableIncomingKspCount 
} from '../js/modules/request/request-kebun-sepupu-landing.js';
import { 
  getActionableIncomingCount as getActionableIncomingSendiriCount,
  canPerformRequesterReceiptAction
} from '../js/modules/request/request-kebun-sendiri-landing.js';
import { 
  getActionableMataEntresCount,
  getActionableMataEntresReceiptCount
} from '../js/modules/request/request-mata-entres-landing.js';
import { 
  getActionableReceiptCount 
} from '../js/modules/receipt/receipt-kebun-sepupu-landing.js';
import { 
  getPendingVerificationCount 
} from '../js/modules/verification/verification-manager.js';
import { 
  getActionableConsolidationCount 
} from '../js/modules/consolidation/consolidation-manager.js';
import { 
  getActionableInspectionCount,
  hasActionableInspection 
} from '../js/modules/inspection/inspection-landing.js';
import { 
  hasActionablePenerimaan 
} from '../js/modules/dashboard/beranda.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('====================================================');
console.log('STARTING INTEGRATION TESTS: RED DOT NOTIFICATION');
console.log('====================================================\n');

// Mock storage reset helper
function resetMockStorage() {
  storage.set('requests_transactions', []);
  storage.set('dispatch_transactions', []);
  storage.set('receipt_ksp_transactions', []);
  storage.set('receipt_transactions', []);
  storage.set('budding_transactions', []);
  storage.set('inspection_transactions', []);
  storage.set('selection_transactions', []);
  storage.set('destruction_transactions', []);
  storage.set('nursery_batches', []);
  storage.set('verification_transactions', []);
}

// -------------------------------------------------------------
// TEST SUITE 1: PENGELUARAN MANTRI BIBITAN (BIBIT & MATA ENTRES)
// -------------------------------------------------------------
console.log('TEST SUITE 1: PENGELUARAN MANTRI BIBITAN');
{
  const mantriUser = {
    userId: 'MTR-01',
    role: 'MANTRI_TANAMAN',
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };

  const mantriOtherDivision = {
    userId: 'MTR-02',
    role: 'MANTRI_TANAMAN',
    estateId: 'EST-TBS',
    divisionId: 'DIV-02'
  };

  const mantriOtherEstate = {
    userId: 'MTR-03',
    role: 'MANTRI_TANAMAN',
    estateId: 'EST-LIP',
    divisionId: 'DIV-01'
  };

  // Case A: Bibit actionable
  const bibitActionable = {
    id: 'REQ-BIBIT-01',
    type: 'KEBUN_SEPUPU',
    targetEstateId: 'EST-TBS',
    targetDivisionId: 'DIV-01',
    status: 'TERVERIFIKASI',
    approvedQty: 500,
    totalIssuedQty: 0
  };

  // Case B: Mata Entres actionable (The primary bug trigger)
  const mataEntresActionable = {
    id: 'REQ-ENTRES-01',
    type: 'MATA_ENTRES',
    sourceEstateId: 'EST-TBS',
    targetEstateId: 'EST-TBS',
    targetNextEstateId: 'EST-TBS',
    targetDivisionId: 'DIV-01',
    sourceDivisionId: 'DIV-01',
    targetNextDivisionId: 'DIV-01',
    status: 'TERVERIFIKASI',
    approval: { approvedBatang: 300 },
    jumlahBatang: 300
  };

  // Case C: Selesai / Completed
  const bibitCompleted = {
    id: 'REQ-BIBIT-02',
    type: 'KEBUN_SEPUPU',
    targetEstateId: 'EST-TBS',
    targetDivisionId: 'DIV-01',
    status: 'SELESAI',
    approvedQty: 500,
    totalIssuedQty: 500
  };

  assert(
    canPerformMantriDispatchAction(bibitActionable, mantriUser) === true,
    'Bibit actionable -> Mantri berhak dispatch (Red Dot ON)'
  );

  assert(
    canPerformMantriDispatchAction(mataEntresActionable, mantriUser) === true,
    'Mata Entres actionable (approvedBatang > 0 & TERVERIFIKASI) -> Mantri berhak dispatch (Red Dot ON)'
  );

  assert(
    canPerformMantriDispatchAction(bibitCompleted, mantriUser) === false,
    'Bibit selesai (status SELESAI) -> Not actionable (Red Dot OFF)'
  );

  assert(
    canPerformMantriDispatchAction(mataEntresActionable, mantriOtherDivision) === false,
    'Mata Entres divisi lain -> Mantri divisi berbeda tidak menerima notif (Red Dot OFF)'
  );

  assert(
    canPerformMantriDispatchAction(mataEntresActionable, mantriOtherEstate) === false,
    'Mata Entres estate lain -> Mantri estate berbeda tidak menerima notif (Red Dot OFF)'
  );

  const reqList = [bibitActionable, mataEntresActionable, bibitCompleted];
  assert(
    getActionableDispatchCount(reqList, mantriUser) === 2,
    'getActionableDispatchCount menghitung 2 dokumen actionable untuk Mantri TBS DIV-01'
  );

  assert(
    getActionableDispatchCount(reqList, mantriOtherDivision) === 0,
    'getActionableDispatchCount menghasilkan 0 untuk Mantri TBS DIV-02'
  );
}

// -------------------------------------------------------------
// TEST SUITE 2: PERMINTAAN AGGREGATE BERANDA
// -------------------------------------------------------------
console.log('\nTEST SUITE 2: AGGREGATE PERMINTAAN PADA BERANDA');
{
  const pengurusReceiver = {
    userId: 'PGS-01',
    role: 'PENGURUS',
    estateId: 'EST-TBS'
  };

  const askepUser = {
    userId: 'ASK-01',
    role: 'ASKEP',
    estateId: 'EST-TBS'
  };

  const asbUser = {
    userId: 'ASB-01',
    role: 'ASISTEN_BIBITAN',
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };

  const kspReq = {
    id: 'KSP-01',
    type: 'KEBUN_SEPUPU',
    targetEstateId: 'EST-TBS',
    status: 'MENUNGGU_VERIFIKASI_ASISTEN_KEPALA'
  };

  const sendiriReq = {
    id: 'SND-01',
    type: 'KEBUN_SENDIRI',
    requesterEstateId: 'EST-TBS',
    estateId: 'EST-TBS',
    status: 'MENUNGGU_VERIFIKASI_PENGURUS'
  };

  const mataEntresReq = {
    id: 'MTR-01',
    type: 'MATA_ENTRES',
    targetEstateId: 'EST-TBS',
    sourceEstateId: 'EST-LIP',
    status: 'DIAJUKAN'
  };

  assert(
    getActionableMataEntresCount([mataEntresReq], pengurusReceiver) === 1,
    'Permintaan Mata Entres status DIAJUKAN -> Actionable untuk Pengurus Kebun Pengirim (Red Dot ON)'
  );

  assert(
    getActionableIncomingSendiriCount([sendiriReq], pengurusReceiver) === 1,
    'Permintaan Kebun Sendiri status MENUNGGU_VERIFIKASI_PENGURUS -> Actionable untuk Pengurus (Red Dot ON)'
  );

  assert(
    getActionableIncomingKspCount([kspReq], askepUser) === 1,
    'Permintaan Kebun Sepupu status MENUNGGU_VERIFIKASI_ASISTEN_KEPALA -> Actionable untuk Askep (Red Dot ON)'
  );

  // Cross-role verification
  assert(
    getActionableMataEntresCount([mataEntresReq], asbUser) === 0,
    'Permintaan Mata Entres status DIAJUKAN -> Belum actionable untuk ASB (Red Dot OFF)'
  );
}

// -------------------------------------------------------------
// TEST SUITE 3: HUB PENERIMAAN SUB-CARDS
// -------------------------------------------------------------
console.log('\nTEST SUITE 3: HUB PENERIMAAN SUB-CARDS');
{
  const pengurusUser = {
    userId: 'PGS-01',
    role: 'PENGURUS',
    estateId: 'EST-TBS'
  };

  const receiptBibitActionable = {
    id: 'RCP-BIBIT-01',
    targetEstateId: 'EST-TBS',
    status: 'MENUNGGU_PENERIMAAN_PENGURUS'
  };

  const receiptBibitCompleted = {
    id: 'RCP-BIBIT-02',
    targetEstateId: 'EST-TBS',
    status: 'SELESAI'
  };

  const receiptMataEntresActionable = {
    id: 'REQ-ETRS-RCP',
    type: 'MATA_ENTRES',
    sourceEstateId: 'EST-TBS', // Kebun Peminta
    targetEstateId: 'EST-LIP', // Kebun Pengirim
    status: 'DIKELUARKAN' // Menunggu Penerimaan Pengurus Peminta
  };

  assert(
    getActionableReceiptCount([receiptBibitActionable], pengurusUser) === 1,
    'Penerimaan Bibit actionable -> Sub-card Bibit Red Dot ON'
  );

  assert(
    getActionableReceiptCount([receiptBibitCompleted], pengurusUser) === 0,
    'Penerimaan Bibit selesai -> Sub-card Bibit Red Dot OFF'
  );

  assert(
    getActionableMataEntresReceiptCount([receiptMataEntresActionable], pengurusUser) === 1,
    'Penerimaan Mata Entres status DIKELUARKAN -> Sub-card Mata Entres Red Dot ON'
  );

  const pengurusOtherEstate = { userId: 'PGS-02', role: 'PENGURUS', estateId: 'EST-LIP' };
  assert(
    getActionableReceiptCount([receiptBibitActionable], pengurusOtherEstate) === 0,
    'Penerimaan Bibit estate lain -> Sub-card Bibit Red Dot OFF (Isolation)'
  );
}

// -------------------------------------------------------------
// TEST SUITE 4: VERIFIKASI DATA (ASISTEN BIBITAN)
// -------------------------------------------------------------
console.log('\nTEST SUITE 4: VERIFIKASI DATA');
{
  resetMockStorage();
  const asbUser = {
    userId: 'ASB-01',
    role: 'ASISTEN_BIBITAN',
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };

  // Seed sample requests in storage
  storage.set('requests_transactions', [
    {
      id: 'REQ-VERIF-01',
      docNo: 'REQ-01',
      estateId: 'EST-TBS',
      divisionId: 'DIV-01',
      status: 'SUBMITTED'
    }
  ]);

  const verifCount = getPendingVerificationCount(asbUser);
  assert(
    verifCount > 0,
    'Data transaksi unverified dalam scope ASB -> Pending Verification Count > 0 (Red Dot ON)'
  );

  // Set as verified
  storage.set('verification_transactions', [
    {
      referenceType: 'REQUEST',
      referenceId: 'REQ-VERIF-01',
      verificationStatus: 'TERVERIFIKASI',
      createdAt: new Date().toISOString()
    }
  ]);

  const verifCountAfter = getPendingVerificationCount(asbUser);
  assert(
    verifCountAfter === 0,
    'Setelah seluruh transaksi terverifikasi -> Pending Verification Count = 0 (Red Dot OFF)'
  );
}

// -------------------------------------------------------------
// TEST SUITE 5: KONSOLIDASI DATA (ASISTEN BIBITAN)
// -------------------------------------------------------------
console.log('\nTEST SUITE 5: KONSOLIDASI DATA');
{
  resetMockStorage();
  const asbUser = {
    userId: 'ASB-01',
    role: 'ASISTEN_BIBITAN',
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };

  // Clean state
  assert(
    getActionableConsolidationCount(asbUser) === 0,
    'Tanpa anomali konsolidasi -> getActionableConsolidationCount = 0 (Red Dot OFF)'
  );

  // Inject orphan dispatch (error consistency)
  storage.set('dispatch_transactions', [
    {
      id: 'DSP-ANOMALY-01',
      docNo: 'DSP-999',
      parentRequestId: 'NON-EXISTENT-REQ-999',
      estateId: 'EST-TBS',
      divisionId: 'DIV-01'
    }
  ]);

  assert(
    getActionableConsolidationCount(asbUser) > 0,
    'Anomali konsolidasi (orphan dispatch) -> getActionableConsolidationCount > 0 (Red Dot ON)'
  );
}

// -------------------------------------------------------------
// TEST SUITE 6: PEMERIKSAAN OKULASI (ASISTEN & MANTRI)
// -------------------------------------------------------------
console.log('\nTEST SUITE 6: PEMERIKSAAN OKULASI');
{
  resetMockStorage();
  const asistenUser = {
    userId: 'AST-01',
    role: 'ASISTEN',
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };

  const asistenOtherDiv = {
    userId: 'AST-02',
    role: 'ASISTEN',
    estateId: 'EST-TBS',
    divisionId: 'DIV-02'
  };

  // Budding doc with pending inspection (1000 grafted, 0 inspected)
  storage.set('budding_transactions', [
    {
      id: 'BUD-01',
      docNo: '2026/OKL/001',
      jumlah: 1000,
      type: 'GRAFTING',
      estateId: 'EST-TBS',
      divisionId: 'DIV-01'
    }
  ]);
  storage.set('inspection_transactions', []);

  assert(
    hasActionableInspection(asistenUser) === true,
    'Batch okulasi belum diperiksa (1000 Pkk) -> hasActionableInspection = true (Red Dot ON)'
  );

  assert(
    hasActionableInspection(asistenOtherDiv) === false,
    'Batch okulasi divisi lain -> hasActionableInspection = false (Red Dot OFF, Division Scope)'
  );

  // Inspect all 1000
  storage.set('inspection_transactions', [
    {
      id: 'INS-01',
      buddingDocNo: '2026/OKL/001',
      totalDiperiksa: 1000,
      jumlahJadi: 900,
      jumlahGagal: 100
    }
  ]);

  assert(
    hasActionableInspection(asistenUser) === false,
    'Seluruh batch telah selesai diperiksa -> hasActionableInspection = false (Red Dot OFF)'
  );
}

// -------------------------------------------------------------
// TEST SUITE 7: PERMINTAAN KEBUN SENDIRI INTERNAL TABS
// -------------------------------------------------------------
console.log('\nTEST SUITE 7: PERMINTAAN KEBUN SENDIRI INTERNAL TABS');
{
  const asistenRequester = {
    userId: 'AST-01',
    id: 'AST-01',
    role: 'ASISTEN',
    estateId: 'EST-TBS'
  };

  const reqWaitingReceipt = {
    id: 'SND-RCP-01',
    type: 'KEBUN_SENDIRI',
    requesterUserId: 'AST-01',
    status: 'MENUNGGU_PENERIMAAN'
  };

  const reqOtherUserWaitingReceipt = {
    id: 'SND-RCP-02',
    type: 'KEBUN_SENDIRI',
    requesterUserId: 'AST-99',
    status: 'MENUNGGU_PENERIMAAN'
  };

  assert(
    canPerformRequesterReceiptAction(reqWaitingReceipt, asistenRequester) === true,
    'Permintaan Saya berstatus MENUNGGU_PENERIMAAN -> Actionable bagi Requester (Tab Red Dot ON)'
  );

  assert(
    canPerformRequesterReceiptAction(reqOtherUserWaitingReceipt, asistenRequester) === false,
    'Permintaan user lain berstatus MENUNGGU_PENERIMAAN -> Bukan milik user (Tab Red Dot OFF)'
  );
}

// -------------------------------------------------------------
// TEST SUITE 8 & 9: FALSE POSITIVE & MAIN FALSE NEGATIVE REGRESSION
// -------------------------------------------------------------
console.log('\nTEST SUITE 8 & 9: FALSE POSITIVE & REGRESSION VALIDATION');
{
  const mantriUser = {
    userId: 'MTR-01',
    role: 'MANTRI_TANAMAN',
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };

  // Regression scenario: Mata Entres approvedBatang + sourceDivisionId
  const verifiedMataEntres = {
    id: '2026/REQ/ETRS/001',
    type: 'MATA_ENTRES',
    sourceEstateId: 'EST-TBS',
    targetEstateId: 'EST-TBS',
    targetNextEstateId: 'EST-TBS',
    sourceDivisionId: 'DIV-01',
    targetDivisionId: 'DIV-01',
    status: 'TERVERIFIKASI',
    approval: {
      approvedBatang: 400
    },
    jumlahBatang: 400
  };

  assert(
    canPerformMantriDispatchAction(verifiedMataEntres, mantriUser) === true,
    'REGRESSION CHECK: Mantri Bibitan detects verified Mata Entres request without approvedQty field -> Red Dot ON'
  );

  // False positive check: completed transaction
  const finishedMataEntres = {
    ...verifiedMataEntres,
    status: 'DIKELUARKAN',
    pengeluaran: {
      jumlahBatangDikeluarkan: 400
    }
  };

  assert(
    canPerformMantriDispatchAction(finishedMataEntres, mantriUser) === false,
    'FALSE POSITIVE CHECK: Completed Mata Entres -> Not actionable (Red Dot OFF)'
  );
}

// -------------------------------------------------------------
// TEST SUITE 10: AGGREGATE RED DOT BERANDA – MENU PENERIMAAN (ROLE MANTRI BIBITAN PEMOHON)
// -------------------------------------------------------------
console.log('\nTEST SUITE 10: AGGREGATE RED DOT BERANDA – MENU PENERIMAAN');
{
  const mantriPemohon = {
    userId: 'MTR-PEMOHON-01',
    role: 'MANTRI_TANAMAN',
    estateId: 'EST-APM',
    divisionId: 'DIV-02'
  };

  const mantriOtherDivision = {
    userId: 'MTR-PEMOHON-02',
    role: 'MANTRI_TANAMAN',
    estateId: 'EST-APM',
    divisionId: 'DIV-01'
  };

  const mantriOtherEstate = {
    userId: 'MTR-OTHER-01',
    role: 'MANTRI_TANAMAN',
    estateId: 'EST-KPR',
    divisionId: 'DIV-02'
  };

  const mantriPengirim = {
    userId: 'MTR-PENGIRIM-01',
    role: 'MANTRI_TANAMAN',
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };

  const asbPemohon = {
    userId: 'ASB-PEMOHON-01',
    role: 'ASISTEN_BIBITAN',
    estateId: 'EST-APM',
    divisionId: 'DIV-02'
  };

  const askepPemohon = {
    userId: 'ASK-PEMOHON-01',
    role: 'ASKEP',
    estateId: 'EST-APM'
  };

  const pengurusPemohon = {
    userId: 'PGS-PEMOHON-01',
    role: 'PENGURUS',
    estateId: 'EST-APM'
  };

  const mataEntresActionableMantri = {
    id: 'REQ-ETRS-PEMOHON-01',
    type: 'MATA_ENTRES',
    sourceEstateId: 'EST-APM', // Kebun Pemohon
    targetEstateId: 'EST-TBS', // Kebun Pengirim
    targetNextDivisionId: 'DIV-02', // Divisi Pemohon
    jumlahBatangDikeluarkan: 400,
    status: 'MENUNGGU_PENERIMAAN_MANTRI_BIBITAN'
  };

  const mataEntresCompleted = {
    ...mataEntresActionableMantri,
    id: 'REQ-ETRS-DONE-01',
    status: 'DITERIMA'
  };

  // TEST 1: getActionableMataEntresReceiptCount() > 0
  const actionableCount = getActionableMataEntresReceiptCount([mataEntresActionableMantri], mantriPemohon);
  assert(
    actionableCount > 0,
    'TEST 1: getActionableMataEntresReceiptCount() > 0 untuk Mantri Bibitan Pemohon'
  );

  // TEST 2: Red Dot parent "Penerimaan" di Beranda = TRUE
  const hasParentRedDot = hasActionablePenerimaan([], [mataEntresActionableMantri], mantriPemohon);
  assert(
    hasParentRedDot === true,
    'TEST 2: Red Dot parent "Penerimaan" di Beranda = TRUE'
  );

  // TEST 3: Submenu "Daftar Penerimaan Mata Entres" Red Dot = TRUE
  const hasSubmenuRedDot = actionableCount > 0;
  assert(
    hasSubmenuRedDot === true,
    'TEST 3: Submenu "Daftar Penerimaan Mata Entres" Red Dot = TRUE'
  );

  // TEST 4: Parent dan Child harus konsisten (BOTH TRUE)
  assert(
    hasParentRedDot === true && hasSubmenuRedDot === true,
    'TEST 4: Parent (Penerimaan) dan Child (Daftar Penerimaan Mata Entres) konsisten menyala (RED)'
  );

  // TEST 5: Tidak ada actionable MATA_ENTRES -> Parent Penerimaan = NO RED DOT
  assert(
    hasActionablePenerimaan([], [], mantriPemohon) === false,
    'TEST 5: Tidak ada actionable MATA_ENTRES -> Penerimaan = NO RED DOT'
  );

  // TEST 6: Transaksi MATA_ENTRES di luar estate/division scope Mantri Bibitan Pemohon
  assert(
    hasActionablePenerimaan([], [mataEntresActionableMantri], mantriOtherEstate) === false,
    'TEST 6.1: Transaksi MATA_ENTRES di luar estate scope -> Penerimaan = NO RED DOT'
  );
  assert(
    hasActionablePenerimaan([], [mataEntresActionableMantri], mantriOtherDivision) === false,
    'TEST 6.2: Transaksi MATA_ENTRES di luar division scope -> Penerimaan = NO RED DOT'
  );

  // TEST 7: Transaksi sudah completed/finalized/read-only
  assert(
    hasActionablePenerimaan([], [mataEntresCompleted], mantriPemohon) === false,
    'TEST 7: Transaksi sudah completed/finalized -> Penerimaan = NO RED DOT'
  );

  // TEST 8: Domain Bibit & Role Isolation (Tidak menyebabkan role lain / domain lain mendapat Red Dot secara salah)
  assert(
    hasActionablePenerimaan([], [mataEntresActionableMantri], mantriPengirim) === false,
    'TEST 8.1: Mantri Bibitan Pengirim TIDAK mendapat Red Dot Penerimaan untuk tahap Mantri Pemohon'
  );
  assert(
    hasActionablePenerimaan([], [mataEntresActionableMantri], asbPemohon) === false,
    'TEST 8.2: Asisten Bibitan Pemohon TIDAK mendapat Red Dot Penerimaan untuk tahap Mantri Pemohon'
  );
  assert(
    hasActionablePenerimaan([], [mataEntresActionableMantri], askepPemohon) === false,
    'TEST 8.3: Askep Pemohon TIDAK mendapat Red Dot Penerimaan untuk tahap Mantri Pemohon'
  );
  assert(
    hasActionablePenerimaan([], [mataEntresActionableMantri], pengurusPemohon) === false,
    'TEST 8.4: Pengurus Pemohon TIDAK mendapat Red Dot Penerimaan untuk tahap Mantri Pemohon'
  );
}

console.log('\n====================================================');
console.log(`TOTAL TESTS : ${totalTests}`);
console.log(`PASSED      : ${passedTests}`);
console.log(`FAILED      : ${failedTests}`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\nALL INTEGRATION TESTS PASSED SUCCESSFULLY! ✓\n');
  process.exit(0);
}
