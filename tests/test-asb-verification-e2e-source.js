/**
 * tests/test-asb-verification-e2e-source.js
 * Integration Test: Source Data Accuracy & Canonical Detail Mapping in Asisten Bibitan Verification
 * 
 * Target: IT-VERIF-001 s.d. IT-VERIF-020 PASS
 */

import assert from 'assert';

// Mock localStorage
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import { storage } from '../js/core/storage.js';
import {
  VERIFICATION_STORAGE_KEY,
  VERIFICATION_STATUS,
  CANONICAL_STORAGE_MAP,
  findSourceRecord,
  resolveTidakHadirDeterministic,
  getVerificationDetailData,
  getActionableRecordsForAsb,
  getVerifiedTransactionsByScope,
  get10ModulesSummary,
  approveVerification,
  returnVerification
} from '../js/modules/verification/verification-manager.js';

console.log('====================================================');
console.log('STARTING INTEGRATION TESTS: ASB VERIFICATION E2E SOURCE');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}:`, err.message);
    throw err;
  }
}

// User Context
const asbUser = {
  id: 'USR-ASB-01',
  userId: 'USR-ASB-01',
  role: 'ASISTEN_BIBITAN',
  name: 'Asisten Bibitan TBS',
  estateId: 'EST-TBS',
  divisionId: 'DIV-01'
};

const otherAsbUser = {
  id: 'USR-ASB-02',
  userId: 'USR-ASB-02',
  role: 'ASISTEN_BIBITAN',
  name: 'Asisten Bibitan APM',
  estateId: 'EST-APM',
  divisionId: 'DIV-01'
};

// Reset store before each phase
function resetStore() {
  store.clear();
}

// -------------------------------------------------------------
// IT-VERIF-001: TIDAK_HADIR deterministic reconstruction
// -------------------------------------------------------------
it('IT-VERIF-001: TIDAK_HADIR deterministic reconstruction from attendance_transactions', () => {
  resetStore();
  // Seed attendance transactions: 1 worker present
  storage.set('attendance_transactions', [
    {
      id: 'ATT-001',
      type: 'WORKER',
      attendanceType: 'DATANG',
      date: '02/10/2026',
      workerId: 'W-01',
      workerCode: 'PKR-01',
      estateId: 'EST-TBS',
      divisionId: 'DIV-01',
      createdByUserId: 'USR-MANTRI-01',
      createdByName: 'Wagiman'
    }
  ]);

  const resolved = resolveTidakHadirDeterministic('ABSEN-02102026', asbUser);
  assert.ok(resolved, 'Resolved record must exist');
  assert.strictEqual(resolved.id, 'ABSEN-02102026');
  assert.strictEqual(resolved._isDeterministic, true);
  assert.strictEqual(resolved.date, '02/10/2026');
});

// -------------------------------------------------------------
// IT-VERIF-002: TIDAK_HADIR legacy read-only fallback
// -------------------------------------------------------------
it('IT-VERIF-002: TIDAK_HADIR legacy read-only fallback when no attendance_transactions exist', () => {
  resetStore();
  storage.set('virtual_tidak_hadir', [
    {
      id: 'ABSEN-01102026',
      docNo: 'ABSEN-01102026',
      date: '01/10/2026',
      totalAbsent: 2,
      estateId: 'EST-TBS',
      divisionId: 'DIV-01'
    }
  ]);

  const resolved = resolveTidakHadirDeterministic('ABSEN-01102026', asbUser);
  assert.ok(resolved, 'Should resolve from virtual_tidak_hadir legacy');
  assert.strictEqual(resolved.id, 'ABSEN-01102026');
  assert.strictEqual(resolved.totalAbsent, 2);
  // Ensure virtual_tidak_hadir is not modified
  assert.strictEqual(storage.get('virtual_tidak_hadir', []).length, 1);
});

// -------------------------------------------------------------
// IT-VERIF-003: TIDAK_HADIR returnVerification forbidden
// -------------------------------------------------------------
it('IT-VERIF-003: TIDAK_HADIR returnVerification is blocked with clear error', () => {
  resetStore();
  storage.set('virtual_tidak_hadir', [
    {
      id: 'ABSEN-01102026',
      docNo: 'ABSEN-01102026',
      date: '01/10/2026',
      estateId: 'EST-TBS',
      divisionId: 'DIV-01'
    }
  ]);

  assert.throws(() => {
    returnVerification({
      referenceType: 'TIDAK_HADIR',
      referenceId: 'ABSEN-01102026',
      returnReason: 'Revisi data',
      currentUser: asbUser
    });
  }, /tidak dapat dikembalikan/i);
});

// -------------------------------------------------------------
// IT-VERIF-004: PENERIMAAN / RECEIPT canonical lookup & normalized data
// -------------------------------------------------------------
it('IT-VERIF-004: PENERIMAAN / RECEIPT canonical lookup & normalized data', () => {
  resetStore();
  const sourceItem = {
    id: 'RCV-001',
    docNo: 'RCV-TBS-20261002-001',
    qty: 15000,
    satuan: 'Butir',
    klon: 'PB 260',
    tipeAsal: 'Kebun Induk',
    sumber: 'Kebun Induk Aek Nabara',
    sir: 'SIR-2026-99',
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };
  storage.set('receipt_ksp_transactions', [sourceItem]);

  const found = findSourceRecord('PENERIMAAN', 'RCV-TBS-20261002-001', asbUser);
  assert.ok(found);
  assert.strictEqual(found.id, 'RCV-001');

  const norm = getVerificationDetailData(found, asbUser, 'PENERIMAAN');
  assert.strictEqual(norm.title, 'Penerimaan Benih');
  assert.ok(norm.mainQty.includes('15.000 Butir'));
  assert.strictEqual(norm.fields.find(f => f.label === 'Klon')?.value, 'PB 260');
  assert.strictEqual(norm.fields.find(f => f.label === 'No. SIR')?.value, 'SIR-2026-99');
});

// -------------------------------------------------------------
// IT-VERIF-005: PENYEMAIAN / SEEDING canonical lookup & normalized data
// -------------------------------------------------------------
it('IT-VERIF-005: PENYEMAIAN / SEEDING canonical lookup & normalized data', () => {
  resetStore();
  const sourceItem = {
    id: 'SEED-001',
    docNo: 'SEED-TBS-20261002-001',
    program: 'Program Tanam 2026',
    batchNo: 'BATCH-2026-01',
    bedengan: 'BDG-01',
    klonAwal: 'PB 260',
    totalDisemai: 5400,
    totalPolybag: 5400,
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };
  storage.set('seeding_transactions', [sourceItem]);

  const found = findSourceRecord('PENYEMAIAN', 'SEED-TBS-20261002-001', asbUser);
  assert.ok(found);
  const norm = getVerificationDetailData(found, asbUser, 'PENYEMAIAN');
  assert.strictEqual(norm.title, 'Penyemaian Benih');
  assert.ok(norm.mainQty.includes('5.400 Bibit'));
  assert.strictEqual(norm.fields.find(f => f.label === 'Bedengan')?.value, 'BDG-01');
});

// -------------------------------------------------------------
// IT-VERIF-006: DEDERAN canonical lookup & normalized data
// -------------------------------------------------------------
it('IT-VERIF-006: DEDERAN canonical lookup & normalized data', () => {
  resetStore();
  const sourceItem = {
    id: 'DED-001',
    docNo: 'DED-TBS-20261002-001',
    bedenganCode: 'BDG-DED-05',
    klon: 'RRIC 100',
    jumlahDeder: 3200,
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };
  storage.set('dederan_transactions', [sourceItem]);

  const found = findSourceRecord('DEDERAN', 'DED-TBS-20261002-001', asbUser);
  assert.ok(found);
  const norm = getVerificationDetailData(found, asbUser, 'DEDERAN');
  assert.strictEqual(norm.title, 'Germinasi / Dederan');
  assert.ok(norm.mainQty.includes('3.200 Butir Deder'));
});

// -------------------------------------------------------------
// IT-VERIF-007: OKULASI / BUDDING canonical lookup & normalized data
// -------------------------------------------------------------
it('IT-VERIF-007: OKULASI / BUDDING canonical lookup & normalized data', () => {
  resetStore();
  const sourceItem = {
    id: 'OKL-001',
    docNo: 'OKL-TBS-20261002-001',
    type: 'GRAFTING',
    bedengan: 'BDG-08',
    klonEntres: 'IRR 118',
    klonRootstock: 'GT 1',
    jumlah: 450,
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };
  storage.set('budding_transactions', [sourceItem]);

  const found = findSourceRecord('OKULASI', 'OKL-TBS-20261002-001', asbUser);
  assert.ok(found);
  const norm = getVerificationDetailData(found, asbUser, 'OKULASI');
  assert.strictEqual(norm.title, 'Okulasi Bibitan');
  assert.strictEqual(norm.mainQty, '450 Pkk');
  assert.strictEqual(norm.fields.find(f => f.label === 'Klon Entres')?.value, 'IRR 118');
});

// -------------------------------------------------------------
// IT-VERIF-008: PEMERIKSAAN / INSPECTION canonical lookup & normalized data
// -------------------------------------------------------------
it('IT-VERIF-008: PEMERIKSAAN / INSPECTION canonical lookup & normalized data', () => {
  resetStore();
  const sourceItem = {
    id: 'INSP-001',
    docNo: 'INSP-TBS-20261002-001',
    bedengan: 'BDG-08',
    klonEntres: 'IRR 118',
    totalDiperiksa: 450,
    jumlahJadi: 405,
    jumlahGagal: 45,
    persenJadi: 90,
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };
  storage.set('inspection_transactions', [sourceItem]);

  const found = findSourceRecord('PEMERIKSAAN', 'INSP-TBS-20261002-001', asbUser);
  assert.ok(found);
  const norm = getVerificationDetailData(found, asbUser, 'PEMERIKSAAN');
  assert.strictEqual(norm.title, 'Pemeriksaan Okulasi');
  assert.strictEqual(norm.fields.find(f => f.label === 'Jumlah Berhasil')?.value, '405 Pkk');
  assert.strictEqual(norm.fields.find(f => f.label === 'Persentase Jadi')?.value, '90%');
});

// -------------------------------------------------------------
// IT-VERIF-009: PEMERIKSAAN_DEDERAN canonical lookup & normalized data
// -------------------------------------------------------------
it('IT-VERIF-009: PEMERIKSAAN_DEDERAN canonical lookup & normalized data', () => {
  resetStore();
  const sourceItem = {
    id: 'DINSP-001',
    docNo: 'DINSP-TBS-20261002-001',
    bedenganCode: 'BDG-DED-05',
    klon: 'RRIC 100',
    jumlahDiperiksa: 3200,
    jumlahBerhasil: 3000,
    jumlahTidakBerhasil: 200,
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };
  storage.set('dederan_inspections', [sourceItem]);

  const found = findSourceRecord('PEMERIKSAAN_DEDERAN', 'DINSP-TBS-20261002-001', asbUser);
  assert.ok(found);
  const norm = getVerificationDetailData(found, asbUser, 'PEMERIKSAAN_DEDERAN');
  assert.strictEqual(norm.title, 'Pemeriksaan Dederan');
  assert.strictEqual(norm.fields.find(f => f.label === 'Jumlah Berhasil')?.value, '3.000 Butir');
});

// -------------------------------------------------------------
// IT-VERIF-010: SELEKSI_PRA_OKULASI canonical lookup & normalized data
// -------------------------------------------------------------
it('IT-VERIF-010: SELEKSI_PRA_OKULASI canonical lookup & normalized data', () => {
  resetStore();
  const sourceItem = {
    id: 'PRE-001',
    docNo: 'PRE-TBS-20261002-001',
    selectionStage: 'Seleksi I',
    batchCode: 'BATCH-2026-01',
    bedengan: 'BDG-01',
    totalDiperiksa: 5000,
    totalLayak: 4800,
    totalAfkir: 200,
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };
  storage.set('pre_grafting_selection_documents', [sourceItem]);

  const found = findSourceRecord('SELEKSI_PRA_OKULASI', 'PRE-TBS-20261002-001', asbUser);
  assert.ok(found);
  const norm = getVerificationDetailData(found, asbUser, 'SELEKSI_PRA_OKULASI');
  assert.strictEqual(norm.title, 'Seleksi Pra-Okulasi (Seleksi I)');
  assert.strictEqual(norm.fields.find(f => f.label === 'Bibit Layak')?.value, '4.800 Pkk');
});

// -------------------------------------------------------------
// IT-VERIF-011: PENYELEKSIAN / SELECTION canonical lookup & normalized data
// -------------------------------------------------------------
it('IT-VERIF-011: PENYELEKSIAN / SELECTION canonical lookup & normalized data', () => {
  resetStore();
  const sourceItem = {
    id: 'SEL-001',
    docNo: 'SEL-TBS-20261002-001',
    stage: 'Seleksi Pasca Okulasi',
    reason: 'Mati Mata',
    bedengan: 'BDG-03',
    actualBibitSelectedQty: 120,
    actualBibitRetainedQty: 1880,
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };
  storage.set('selection_transactions', [sourceItem]);

  const found = findSourceRecord('PENYELEKSIAN', 'SEL-TBS-20261002-001', asbUser);
  assert.ok(found);
  const norm = getVerificationDetailData(found, asbUser, 'PENYELEKSIAN');
  assert.strictEqual(norm.title, 'Penyeleksian Bibit');
  assert.strictEqual(norm.fields.find(f => f.label === 'Bibit Afkir (Selected)')?.value, '120 Pkk');
  assert.strictEqual(norm.fields.find(f => f.label === 'Bibit Dipertahankan (Retained)')?.value, '1.880 Pkk');
});

// -------------------------------------------------------------
// IT-VERIF-012: TOPPING / KEBUN_ENTRES canonical lookup & normalized data
// -------------------------------------------------------------
it('IT-VERIF-012: TOPPING / KEBUN_ENTRES canonical lookup & normalized data', () => {
  resetStore();
  const sourceItem = {
    id: 'TOP-001',
    docNo: 'TOP-TBS-20261002-001',
    kodePlot: 'PLOT-A1',
    namaKlon: 'PB 260',
    budwoodCode: 'ENT-TBS-01',
    jumlahKayu: 75,
    jumlahPerisai: 600,
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };
  storage.set('entres_topping_transactions', [sourceItem]);

  const found = findSourceRecord('TOPPING', 'TOP-TBS-20261002-001', asbUser);
  assert.ok(found);
  const norm = getVerificationDetailData(found, asbUser, 'TOPPING');
  assert.strictEqual(norm.title, 'Entres Topping');
  assert.strictEqual(norm.fields.find(f => f.label === 'Jumlah Kayu')?.value, '75 Btg');
  assert.strictEqual(norm.fields.find(f => f.label === 'Panen Perisai (Mata Entres)')?.value, '600 Perisai');
});

// -------------------------------------------------------------
// IT-VERIF-013: MENUNAS / KEBUN_ENTRES canonical lookup & normalized data
// -------------------------------------------------------------
it('IT-VERIF-013: MENUNAS / KEBUN_ENTRES canonical lookup & normalized data', () => {
  resetStore();
  const sourceItem = {
    id: 'TUNAS-001',
    docNo: 'TUNAS-TBS-20261002-001',
    kodePlot: 'PLOT-B2',
    namaKlon: 'IRR 118',
    budwoodCode: 'ENT-TBS-02',
    jumlahPohonDitunas: 150,
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };
  storage.set('entres_menunas_transactions', [sourceItem]);

  const found = findSourceRecord('MENUNAS', 'TUNAS-TBS-20261002-001', asbUser);
  assert.ok(found);
  const norm = getVerificationDetailData(found, asbUser, 'MENUNAS');
  assert.strictEqual(norm.title, 'Entres Menunas');
  assert.strictEqual(norm.fields.find(f => f.label === 'Realisasi Ditunas')?.value, '150 Pkk');
});

// -------------------------------------------------------------
// IT-VERIF-014: MATERIAL canonical lookup & normalized data
// -------------------------------------------------------------
it('IT-VERIF-014: MATERIAL canonical lookup & normalized data', () => {
  resetStore();
  const sourceItem = {
    id: 'MAT-001',
    docNo: 'MAT-TBS-20261002-001',
    materialName: 'Pupuk NPK 15-15-15',
    category: 'Pupuk',
    qty: 50,
    unit: 'Kg',
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };
  storage.set('material_usage_transactions', [sourceItem]);

  const found = findSourceRecord('MATERIAL', 'MAT-TBS-20261002-001', asbUser);
  assert.ok(found);
  const norm = getVerificationDetailData(found, asbUser, 'MATERIAL');
  assert.strictEqual(norm.title, 'Material & Bahan');
  assert.strictEqual(norm.fields.find(f => f.label === 'Jumlah Digunakan')?.value, '50 Kg');
});

// -------------------------------------------------------------
// IT-VERIF-015: SIMULASI_GUDANG canonical lookup & normalized data
// -------------------------------------------------------------
it('IT-VERIF-015: SIMULASI_GUDANG canonical lookup & normalized data', () => {
  resetStore();
  const sourceItem = {
    id: 'WHS-001',
    docNo: 'WHS-TBS-20261002-001',
    issueDocNo: 'ISS-2026-009',
    itemName: 'Plastik Sungkup Okulasi',
    qty: 20,
    unit: 'Roll',
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };
  storage.set('warehouse_issue_simulations', [sourceItem]);

  const found = findSourceRecord('SIMULASI_GUDANG', 'WHS-TBS-20261002-001', asbUser);
  assert.ok(found);
  const norm = getVerificationDetailData(found, asbUser, 'SIMULASI_GUDANG');
  assert.strictEqual(norm.title, 'Simulasi Issue Gudang');
  assert.strictEqual(norm.fields.find(f => f.label === 'Jumlah Issue')?.value, '20 Roll');
});

// -------------------------------------------------------------
// IT-VERIF-016: PEMELIHARAAN / REKAM_PEMELIHARAAN canonical lookup & normalized data
// -------------------------------------------------------------
it('IT-VERIF-016: PEMELIHARAAN / REKAM_PEMELIHARAAN canonical lookup & normalized data', () => {
  resetStore();
  const sourceItem = {
    id: 'ACT-001',
    docNo: 'ACT-TBS-20261002-001',
    activityType: 'Penyiraman & Penyiangan',
    bedengan: 'BDG-01 s/d BDG-10',
    volumePkk: 10000,
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };
  storage.set('nursery_activity_transactions', [sourceItem]);

  const found = findSourceRecord('PEMELIHARAAN', 'ACT-TBS-20261002-001', asbUser);
  assert.ok(found);
  const norm = getVerificationDetailData(found, asbUser, 'PEMELIHARAAN');
  assert.strictEqual(norm.title, 'Rekam Pemeliharaan');
  assert.strictEqual(norm.fields.find(f => f.label === 'Volume Realisasi')?.value, '10.000 Pkk');
});

// -------------------------------------------------------------
// IT-VERIF-017: PENGELUARAN / DISPATCH canonical lookup & normalized data
// -------------------------------------------------------------
it('IT-VERIF-017: PENGELUARAN / DISPATCH canonical lookup & normalized data', () => {
  resetStore();
  const sourceItem = {
    id: 'DSP-001',
    docNo: 'DSP-TBS-20261002-001',
    clone: 'PB 260',
    targetDivisionName: 'Divisi II Kebun Matapao',
    issuedQty: 1200,
    vehiclePlate: 'BK 8899 XY',
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };
  storage.set('dispatch_transactions', [sourceItem]);

  const found = findSourceRecord('PENGELUARAN', 'DSP-TBS-20261002-001', asbUser);
  assert.ok(found);
  const norm = getVerificationDetailData(found, asbUser, 'PENGELUARAN');
  assert.strictEqual(norm.title, 'Pengeluaran Bibit');
  assert.strictEqual(norm.fields.find(f => f.label === 'Jumlah Pengeluaran')?.value, '1.200 Pkk');
});

// -------------------------------------------------------------
// IT-VERIF-018: DESTRUCTION canonical lookup & normalized data
// -------------------------------------------------------------
it('IT-VERIF-018: DESTRUCTION canonical lookup & normalized data', () => {
  resetStore();
  const sourceItem = {
    id: 'DST-001',
    docNo: 'DST-TBS-20261002-001',
    batchId: 'BATCH-2026-01',
    reason: 'Serangan Jamur Batang',
    qty: 350,
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };
  storage.set('destruction_transactions', [sourceItem]);

  const found = findSourceRecord('DESTRUCTION', 'DST-TBS-20261002-001', asbUser);
  assert.ok(found);
  const norm = getVerificationDetailData(found, asbUser, 'DESTRUCTION');
  assert.strictEqual(norm.title, 'Pemusnahan Bibit');
  assert.strictEqual(norm.fields.find(f => f.label === 'Jumlah Dimusnahkan')?.value, '350 Pkk');
});

// -------------------------------------------------------------
// IT-VERIF-019: Actual Source Value Consistency (Source == Normalized == List == Detail) & Zero Hardcode
// -------------------------------------------------------------
it('IT-VERIF-019: Actual Source Value Consistency (Source == Normalized == List == Detail) & Zero Hardcode', () => {
  resetStore();
  // Topping transaction with arbitrary numbers that would fail if hardcoded (e.g. not 500 or 120)
  const toppingSource = {
    id: 'TOP-TEST-99',
    docNo: 'TOP-DOC-99',
    kodePlot: 'PLOT-Z9',
    namaKlon: 'GT 1',
    budwoodCode: 'ENT-Z',
    jumlahKayu: 88, // NOT 500
    jumlahPerisai: 777, // NOT 120
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };
  storage.set('entres_topping_transactions', [toppingSource]);

  // Okulasi transaction with arbitrary numbers (not 300 or 250)
  const okulasiSource = {
    id: 'OKL-TEST-99',
    docNo: 'OKL-DOC-99',
    type: 'GRAFTING',
    bedengan: 'BDG-99',
    klonEntres: 'IRR 118',
    klonRootstock: 'GT 1',
    jumlah: 133, // NOT 300 or 250
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };
  storage.set('budding_transactions', [okulasiSource]);

  // Add to verification_transactions
  storage.set('verification_transactions', [
    {
      referenceType: 'TOPPING',
      referenceId: 'TOP-TEST-99',
      referenceDocNo: 'TOP-DOC-99',
      estateId: 'EST-TBS',
      divisionId: 'DIV-01',
      verificationStatus: VERIFICATION_STATUS.MENUNGGU_VERIFIKASI,
      createdAt: '2026-10-02T10:00:00Z'
    },
    {
      referenceType: 'OKULASI',
      referenceId: 'OKL-TEST-99',
      referenceDocNo: 'OKL-DOC-99',
      estateId: 'EST-TBS',
      divisionId: 'DIV-01',
      verificationStatus: VERIFICATION_STATUS.MENUNGGU_VERIFIKASI,
      createdAt: '2026-10-02T10:00:00Z'
    }
  ]);

  const actionableList = getActionableRecordsForAsb(asbUser);
  assert.strictEqual(actionableList.length, 2);

  const toppingActionable = actionableList.find(a => a.referenceType === 'TOPPING');
  assert.ok(toppingActionable);
  assert.strictEqual(toppingActionable.normalizedData.fields.find(f => f.label === 'Jumlah Kayu')?.value, '88 Btg');
  assert.strictEqual(toppingActionable.normalizedData.fields.find(f => f.label === 'Panen Perisai (Mata Entres)')?.value, '777 Perisai');
  assert.ok(toppingActionable.summary.includes('88 Btg · 777 Perisai'));

  const okulasiActionable = actionableList.find(a => a.referenceType === 'OKULASI');
  assert.ok(okulasiActionable);
  assert.strictEqual(okulasiActionable.normalizedData.fields.find(f => f.label === 'Total Okulasi')?.value, '133 Pkk');
  assert.ok(okulasiActionable.summary.includes('133 Pkk'));
});

// -------------------------------------------------------------
// IT-VERIF-020: Approval, Return, and Scope Isolation
// -------------------------------------------------------------
it('IT-VERIF-020: Approval, Return, and Scope Isolation in Verification Workflow', () => {
  resetStore();
  const sourceItemTBS = {
    id: 'SEED-TBS-01',
    docNo: 'SEED-TBS-01',
    totalDisemai: 1000,
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  };
  const sourceItemAPM = {
    id: 'SEED-APM-01',
    docNo: 'SEED-APM-01',
    totalDisemai: 2000,
    estateId: 'EST-APM',
    divisionId: 'DIV-01'
  };
  storage.set('seeding_transactions', [sourceItemTBS, sourceItemAPM]);

  storage.set('verification_transactions', [
    {
      referenceType: 'PENYEMAIAN',
      referenceId: 'SEED-TBS-01',
      referenceDocNo: 'SEED-TBS-01',
      estateId: 'EST-TBS',
      divisionId: 'DIV-01',
      verificationStatus: VERIFICATION_STATUS.MENUNGGU_VERIFIKASI,
      createdAt: '2026-10-02T10:00:00Z'
    },
    {
      referenceType: 'PENYEMAIAN',
      referenceId: 'SEED-APM-01',
      referenceDocNo: 'SEED-APM-01',
      estateId: 'EST-APM',
      divisionId: 'DIV-01',
      verificationStatus: VERIFICATION_STATUS.MENUNGGU_VERIFIKASI,
      createdAt: '2026-10-02T10:00:00Z'
    }
  ]);

  // Scope test: asbUser (EST-TBS) should only see SEED-TBS-01
  const tbsList = getActionableRecordsForAsb(asbUser);
  assert.strictEqual(tbsList.length, 1);
  assert.strictEqual(tbsList[0].referenceId, 'SEED-TBS-01');

  // asbUser should NOT be able to approve SEED-APM-01
  assert.throws(() => {
    approveVerification({
      referenceType: 'PENYEMAIAN',
      referenceId: 'SEED-APM-01',
      currentUser: asbUser
    });
  }, /di luar lingkup estate/i);

  // asbUser approves SEED-TBS-01 successfully
  const approved = approveVerification({
    referenceType: 'PENYEMAIAN',
    referenceId: 'SEED-TBS-01',
    currentUser: asbUser
  });
  assert.ok(approved);
  assert.strictEqual(approved.verificationStatus, VERIFICATION_STATUS.TERVERIFIKASI);

  // Verified list for asbUser now contains SEED-TBS-01 with normalizedData attached
  const verifiedList = getVerifiedTransactionsByScope(asbUser);
  assert.strictEqual(verifiedList.length, 1);
  assert.strictEqual(verifiedList[0].referenceId, 'SEED-TBS-01');
  assert.ok(verifiedList[0].normalizedData);
  assert.ok(verifiedList[0].normalizedData.mainQty.includes('1.000 Bibit'));

  // Pending count for asbUser is now 0
  const remainingPending = getActionableRecordsForAsb(asbUser);
  assert.strictEqual(remainingPending.length, 0);
});

console.log('\n====================================================');
console.log(`INTEGRATION TESTS SUMMARY: ${passedTests}/${totalTests} PASSED`);
console.log('====================================================\n');
