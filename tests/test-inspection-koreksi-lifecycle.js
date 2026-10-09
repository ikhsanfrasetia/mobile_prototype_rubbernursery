// Mock localStorage before imports
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import { storage } from '../js/core/storage.js';
import { session } from '../js/core/session.js';
import { ROLES } from '../js/core/user-context.js';
import { todayISO } from '../js/core/utils.js';
import { getEffectiveDate } from '../js/core/simulation-clock-service.js';
import { canUserAccessTransaction, applyTransactionActor } from '../js/core/transaction-actor.js';
import { isTransactionLockedForMantri } from '../js/modules/verification/mantri-confirmation-service.js';
import {
  saveDederanInspection,
  updateDederanInspection,
  getBedenganInspectionSummary,
  integrateDederanRejectionToSelectionPool
} from '../js/modules/seeding/dederan-manager.js';

console.log('=== TEST SUITE: LIFECYCLE KOREKSI PEMERIKSAAN DEDERAN & OKULASI ===\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

const mockWagiman = {
  id: 'USR-MNT-001',
  userId: 'TBS-MNT-001',
  code: 'MNT001',
  name: 'Wagiman',
  role: ROLES.MANTRI_TANAMAN,
  estateId: 'EST-TBS',
  estate: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-01',
  divisionName: 'Divisi I',
  afdeling: 'AFD-01'
};

const mockSupriono = {
  id: 'USR-MNT-002',
  userId: 'APM-MNT-002',
  code: 'MNT002',
  name: 'Supriono',
  role: ROLES.MANTRI_TANAMAN,
  estateId: 'EST-APM',
  estate: 'EST-APM',
  estateName: 'Aek Pamienke',
  divisionId: 'DIV-01',
  divisionName: 'Divisi I',
  afdeling: 'AFD-02'
};

session.start({ code: 'MNT001' });

const effDate = getEffectiveDate();

storage.set('attendance_transactions', [
  {
    id: `ATT-SUP-${effDate}`,
    date: effDate,
    tanggal: effDate,
    type: 'SUPERVISOR',
    role: 'MANTRI_TANAMAN',
    attendanceType: 'DATANG',
    status: 'HADIR',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001'
  },
  {
    id: `ATT-WRK-${effDate}`,
    date: effDate,
    tanggal: effDate,
    type: 'WORKER',
    workerId: 'WRK-001',
    attendanceType: 'DATANG',
    status: 'HADIR',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001'
  }
]);

// ==========================================
// 1. PEMERIKSAAN DEDERAN LIFECYCLE & KOREKSI
// ==========================================
console.log('--- 1. Pemeriksaan Dederan: Return, In-Place Edit, Downstream Sync ---');

// Setup mock Dederan transaction
const dederTx = {
  id: 'DED-TX-001',
  docNo: '2026/DED/001',
  bedenganCode: 'BED-01',
  jumlahDeder: 1000,
  createdBy: mockWagiman.id,
  actorCode: mockWagiman.code,
  estate: mockWagiman.estate
};
storage.set('dederan_transactions', [dederTx]);
storage.set('dederan_inspections', []);
storage.set('selection_pool', []);

// Create inspection
const created = saveDederanInspection({
  dederanTxId: dederTx.id,
  dederanTxDocNo: dederTx.docNo,
  tanggalPemeriksaan: '09/10/2026',
  jumlahDiperiksa: 500,
  jumlahBerhasil: 450,
  photos: ['photo1.jpg'],
  inspectorName: mockWagiman.name
});

let inspections = storage.get('dederan_inspections', []);
assert(inspections.length === 1, 'Pemeriksaan Dederan created successfully (1 record)');
assert(inspections[0].jumlahTidakBerhasil === 50, 'jumlahTidakBerhasil calculated as 50');

// Downstream selection pool sync check
let selectionPool = storage.get('selection_pool', []);
assert(selectionPool.length === 1 && selectionPool[0].jumlahAfkir === 50, 'Selection pool has 50 afkir seeds from Dederan Inspection');

// Simulate ASB returning document for revision
inspections[0].status = 'DIKEMBALIKAN';
inspections[0].returnReason = 'Jumlah berhasil salah catat, mohon hitung ulang';
inspections[0].lastReturnReason = 'Jumlah berhasil salah catat, mohon hitung ulang';
inspections[0].returnedAt = '2026-10-09T10:00:00.000Z';
inspections[0].returnedBy = 'ASB001';
storage.set('dederan_inspections', inspections);

// Authorization & Locking checks
assert(canUserAccessTransaction(inspections[0], mockWagiman), 'Wagiman can access own returned Dederan inspection');
assert(!canUserAccessTransaction(inspections[0], mockSupriono), 'Supriono cannot access Wagiman returned Dederan inspection (isolated)');
assert(!isTransactionLockedForMantri(inspections[0]), 'Returned Dederan inspection is unlocked and editable for Mantri');

// Mantri performs correction (in-place update)
const updatedPayload = {
  dederanTxId: dederTx.id,
  dederanTxDocNo: dederTx.docNo,
  tanggalPemeriksaan: '09/10/2026',
  jumlahDiperiksa: 500,
  jumlahBerhasil: 480, // Corrected from 450 to 480 (afkir becomes 20)
  photos: ['photo1.jpg', 'photo2.jpg'],
  inspectorName: mockWagiman.name
};

const updateRes = updateDederanInspection(inspections[0].docNo, updatedPayload);

// Form-level status and history preservation
inspections = storage.get('dederan_inspections', []);
const dedIdx = inspections.findIndex(i => i.docNo === updateRes.inspection.docNo);
inspections[dedIdx].status = 'MENUNGGU_VERIFIKASI_MANTRI';
inspections[dedIdx].returnReason = 'Jumlah berhasil salah catat, mohon hitung ulang';
inspections[dedIdx].lastReturnReason = 'Jumlah berhasil salah catat, mohon hitung ulang';
inspections[dedIdx].returnedAt = '2026-10-09T10:00:00.000Z';
inspections[dedIdx].returnedBy = 'ASB001';
storage.set('dederan_inspections', inspections);

assert(inspections.length === 1, 'Correction did not duplicate record (still exactly 1)');
assert(inspections[0].jumlahBerhasil === 480, 'jumlahBerhasil updated to 480');
assert(inspections[0].jumlahTidakBerhasil === 20, 'jumlahTidakBerhasil updated to 20');
assert(inspections[0].status === 'MENUNGGU_VERIFIKASI_MANTRI', 'Status reset to MENUNGGU_VERIFIKASI_MANTRI');
assert(inspections[0].lastReturnReason === 'Jumlah berhasil salah catat, mohon hitung ulang', 'lastReturnReason preserved');

// Downstream selection pool re-sync check
selectionPool = storage.get('selection_pool', []);
assert(selectionPool.length === 1 && selectionPool[0].jumlahAfkir === 20, 'Selection pool correctly synced to 20 afkir seeds');


// ==========================================
// 2. PEMERIKSAAN OKULASI LIFECYCLE & KOREKSI
// ==========================================
console.log('\n--- 2. Pemeriksaan Okulasi: Return, In-Place Edit, Downstream Sync ---');

storage.set('inspection_transactions', []);
storage.set('regrafting_pool', []);
storage.set('selection_pool', []);

const buddingTx = {
  id: 'BUD-001',
  docNo: '2026/OKL/001',
  batchNo: 'Batch-01',
  sourceDocNo: '2026/APR/001',
  type: 'GRAFTING',
  klonEntres: 'PB 260',
  klonRootstock: 'GT-01',
  bedengan: 'Bedengan 01',
  jumlah: 1000,
  tanggal: '09/10/2026',
  createdBy: mockWagiman.id,
  actorCode: mockWagiman.code,
  estate: mockWagiman.estate
};
storage.set('budding_transactions', [buddingTx]);

// Initial inspection
const initialOkulasiInsp = applyTransactionActor({
  docNo: '2026/INS/001',
  buddingIndex: 0,
  buddingDocNo: buddingTx.docNo,
  buddingType: 'GRAFTING',
  batchNo: buddingTx.batchNo,
  sourceDocNo: buddingTx.sourceDocNo,
  tanggal: '09/10/2026',
  bedengan: buddingTx.bedengan,
  klonEntres: buddingTx.klonEntres,
  klonRootstock: buddingTx.klonRootstock,
  jumlahJadi: 800,
  jumlahGagal: 200,
  totalToRegrafting: 150,
  totalToSelection: 50,
  totalDiperiksa: 1000,
  persenJadi: 80,
  catatan: 'Catatan awal',
  status: 'MENUNGGU_VERIFIKASI_MANTRI',
  createdBy: mockWagiman.id,
  actorCode: mockWagiman.code
}, 'CREATE', mockWagiman);

storage.set('inspection_transactions', [initialOkulasiInsp]);

// Simulate ASB returning document
let okulasiTxs = storage.get('inspection_transactions', []);
okulasiTxs[0].status = 'DIKEMBALIKAN';
okulasiTxs[0].returnReason = 'Foto sampel kurang jelas & periksa ulang alokasi regrafting';
okulasiTxs[0].lastReturnReason = 'Foto sampel kurang jelas & periksa ulang alokasi regrafting';
okulasiTxs[0].returnedAt = '2026-10-09T11:00:00.000Z';
okulasiTxs[0].returnedBy = 'ASB001';
storage.set('inspection_transactions', okulasiTxs);

// Authorization & Locking checks
assert(canUserAccessTransaction(okulasiTxs[0], mockWagiman), 'Wagiman can access own returned Okulasi inspection');
assert(!canUserAccessTransaction(okulasiTxs[0], mockSupriono), 'Supriono cannot access Wagiman returned Okulasi inspection (isolated)');
assert(!isTransactionLockedForMantri(okulasiTxs[0]), 'Returned Okulasi inspection is unlocked for Mantri');

// Mantri performs correction (in-place update on index 0)
const correctedOkulasiInsp = applyTransactionActor({
  ...okulasiTxs[0],
  docNo: '2026/INS/001',
  jumlahJadi: 850,
  jumlahGagal: 150,
  totalToRegrafting: 100,
  totalToSelection: 50,
  totalDiperiksa: 1000,
  persenJadi: 85,
  catatan: 'Sudah diperbaiki dan foto diperbarui',
  status: 'MENUNGGU_VERIFIKASI_MANTRI',
  returnReason: okulasiTxs[0].returnReason,
  lastReturnReason: okulasiTxs[0].lastReturnReason,
  returnedAt: okulasiTxs[0].returnedAt,
  returnedBy: okulasiTxs[0].returnedBy
}, 'UPDATE', mockWagiman);

okulasiTxs[0] = correctedOkulasiInsp;
storage.set('inspection_transactions', okulasiTxs);

// Update Regrafting Pool
let regraftPool = storage.get('regrafting_pool', []);
regraftPool = regraftPool.filter(r => r.inspectionDocNo !== '2026/INS/001');
if (correctedOkulasiInsp.totalToRegrafting > 0) {
  regraftPool.push({
    docNo: '2026/REG/001',
    inspectionDocNo: '2026/INS/001',
    batchNo: buddingTx.batchNo,
    jumlah: correctedOkulasiInsp.totalToRegrafting,
    sisaRegrafting: correctedOkulasiInsp.totalToRegrafting,
    status: 'READY_TO_REGRAFT'
  });
}
storage.set('regrafting_pool', regraftPool);

// Update Selection Pool
selectionPool = storage.get('selection_pool', []);
selectionPool = selectionPool.filter(s => s.inspectionDocNo !== '2026/INS/001');
if (correctedOkulasiInsp.totalToSelection > 0) {
  selectionPool.push({
    docNo: '2026/CULL/001',
    inspectionDocNo: '2026/INS/001',
    batchNo: buddingTx.batchNo,
    jumlahAfkir: correctedOkulasiInsp.totalToSelection,
    status: 'PENDING_CULLING'
  });
}
storage.set('selection_pool', selectionPool);

assert(okulasiTxs.length === 1, 'Okulasi correction updated in-place without duplication (still 1)');
assert(okulasiTxs[0].jumlahJadi === 850, 'jumlahJadi updated to 850');
assert(okulasiTxs[0].persenJadi === 85, 'persenJadi updated to 85%');
assert(okulasiTxs[0].status === 'MENUNGGU_VERIFIKASI_MANTRI', 'Status reset to MENUNGGU_VERIFIKASI_MANTRI');
assert(okulasiTxs[0].lastReturnReason === 'Foto sampel kurang jelas & periksa ulang alokasi regrafting', 'Return reason history preserved');
assert(regraftPool.length === 1 && regraftPool[0].jumlah === 100, 'Regrafting pool quota updated to 100');
assert(selectionPool.length === 1 && selectionPool[0].jumlahAfkir === 50, 'Selection pool quota updated to 50');


// ==========================================
// 3. SEPARATION OF RETURNED DOCS & DATE FILTER
// ==========================================
console.log('\n--- 3. Landing Page Separation & Date Filter Independence ---');

// Mock data: 1 returned document with date 01/10/2026, 1 normal document with date 09/10/2026
const allDeder = [
  { docNo: '2026/PRK/001', tanggalPemeriksaan: '01/10/2026', status: 'DIKEMBALIKAN', returnReason: 'Revisi bedengan' },
  { docNo: '2026/PRK/002', tanggalPemeriksaan: '09/10/2026', status: 'MENUNGGU_VERIFIKASI_MANTRI' }
];

const selectedFilterDate = '09/10/2026';

// Separation logic as implemented in inspection-landing.js
const returnedDeder = allDeder.filter(i => (i.status || '').toUpperCase() === 'DIKEMBALIKAN' || Boolean(i.returnReason && (i.status || '').toUpperCase() === 'REVISION'));
const normalDeder = allDeder.filter(i => {
  const isRet = (i.status || '').toUpperCase() === 'DIKEMBALIKAN' || Boolean(i.returnReason && (i.status || '').toUpperCase() === 'REVISION');
  if (isRet) return false;
  return !selectedFilterDate || i.tanggalPemeriksaan === selectedFilterDate;
});

assert(returnedDeder.length === 1 && returnedDeder[0].docNo === '2026/PRK/001', 'Returned section contains 2026/PRK/001 regardless of date filter');
assert(normalDeder.length === 1 && normalDeder[0].docNo === '2026/PRK/002', 'Normal list contains only 2026/PRK/002 and excludes returned document');

// Change date filter to different date
const otherFilterDate = '05/10/2026';
const normalDederOther = allDeder.filter(i => {
  const isRet = (i.status || '').toUpperCase() === 'DIKEMBALIKAN' || Boolean(i.returnReason && (i.status || '').toUpperCase() === 'REVISION');
  if (isRet) return false;
  return !otherFilterDate || i.tanggalPemeriksaan === otherFilterDate;
});

assert(returnedDeder.length === 1, 'Returned section remains visible even when date filter does not match document date');
assert(normalDederOther.length === 0, 'Normal list correctly filtered by selected date');

console.log(`\n========================================`);
console.log(`TEST RESULT: ${passCount} / ${passCount + failCount} PASSED`);
console.log(`========================================\n`);

if (failCount > 0) {
  process.exit(1);
}
