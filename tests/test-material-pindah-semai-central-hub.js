/**
 * tests/test-material-pindah-semai-central-hub.js
 * Integration Test Suite: Integrasi Pencatatan Material & Bahan Pindah Semai (SOW) ke Central Hub Verifikasi Mantri & ASB
 *
 * Test Scenarios:
 * IT-MATERIAL-HUB-001: SOW baru dengan issueDocNo valid & totalPolybag > 0 muncul di Central Hub Material (READY_TO_CONFIRM).
 * IT-MATERIAL-HUB-002: Metadata Issue, SOW, Batch, Bedengan, dan Quantity terisi lengkap dan akurat.
 * IT-MATERIAL-HUB-003: Mantri Konfirmasi membuat 1 verification_transaction dengan status SUBMITTED_TO_ASB.
 * IT-MATERIAL-HUB-004: Reload/Re-query: record tetap ditemukan dan tidak duplicate.
 * IT-MATERIAL-HUB-005: Repeat confirm diblokir karena status sudah submitted/locked.
 * IT-MATERIAL-HUB-006: Multiple SOW (3 SOW) menggunakan 1 Dokumen Issue yang sama menghasilkan 3 item verifikasi independen.
 * IT-MATERIAL-HUB-007: Kalkulasi saldo Issue: 9000 - 3000 - 3000 - 2950 = 50 LBR (tidak double-count).
 * IT-MATERIAL-HUB-008: ASB Review Queue & Detail Data: Card Material muncul dengan rincian lengkap.
 * IT-MATERIAL-HUB-009: ASB Approve: Status menjadi DISETUJUI / TERVERIFIKASI di Central Hub.
 * IT-MATERIAL-HUB-010: ASB Revision: Status menjadi DIKEMBALIKAN / REVISION dan kembali ke workflow Mantri.
 * IT-MATERIAL-HUB-011: Central Hub Badge count: terhitung akurat saat pending dan berkurang saat confirmed.
 * IT-MATERIAL-HUB-012: Batch population tidak berubah akibat verifikasi material.
 * IT-MATERIAL-HUB-013: Cross-SOW isolation: kuantitas SOW-001 tidak tertukar dengan SOW-002.
 * IT-MATERIAL-HUB-014: Cross-batch isolation: Batch B-001 / BDG-001 terisolasi dari Batch B-002 / BDG-003.
 * IT-MATERIAL-HUB-015: Duplicate protection: 1 SOW = 1 active verification transaction.
 * IT-MATERIAL-HUB-016: Read-only query safety: getMantriTodayTransactions() tidak memutasi storage.
 */

// In-memory localStorage mock for isolated node execution
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import { storage } from '../js/core/storage.js';
import { todayDDMMYYYY } from '../js/core/utils.js';
import {
  getMantriTodayTransactions,
  submitMantriTransactions,
  submitModuleTransactions,
  MANTRI_TRANSACTION_STATUS,
  MODULE_TYPES
} from '../js/modules/verification/mantri-confirmation-service.js';
import {
  VERIFICATION_STORAGE_KEY,
  VERIFICATION_STATUS,
  getActionableRecordsForAsb,
  findSourceRecord,
  getVerificationDetailData,
  approveVerification,
  returnVerification
} from '../js/modules/verification/verification-manager.js';
import {
  calculateRemainingIssueBalance,
  calculateIssueItemUsedQuantity,
  initMaterialMasterStorage
} from '../js/data/material-master.js';

let totalPassed = 0;
let totalFailed = 0;
const results = [];

function assert(testId, description, condition, detail = '') {
  if (condition) {
    totalPassed++;
    results.push({ id: testId, description, status: 'PASS', detail });
    console.log(`  [PASS] ${testId}: ${description}`);
  } else {
    totalFailed++;
    results.push({ id: testId, description, status: 'FAIL', detail });
    console.error(`  [FAIL] ${testId}: ${description} — Detail: ${detail}`);
  }
}

const mockMantriUser = {
  id: 'USR-MTR-001',
  userId: 'USR-MTR-001',
  name: 'Budi Santoso',
  role: 'MANTRI',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

const mockAsbUser = {
  id: 'USR-ASB-001',
  userId: 'USR-ASB-001',
  name: 'Ahmad Dahlan',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

function resetAllStorage() {
  global.localStorage.clear();
  initMaterialMasterStorage(true);
  storage.set('seeding_transactions', []);
  storage.set('material_usage_transactions', []);
  storage.set('materials_transactions', []);
  storage.set(VERIFICATION_STORAGE_KEY, []);
}

console.log('\n================================================================================');
console.log('RUNNING INTEGRATION TESTS: MATERIAL PINDAH SEMAI CENTRAL HUB & ASB VERIFICATION');
console.log('================================================================================\n');

const today = todayDDMMYYYY();

// --------------------------------------------------------------------------------
// IT-MATERIAL-HUB-001: SOW baru dengan issueDocNo valid & totalPolybag > 0
// --------------------------------------------------------------------------------
resetAllStorage();

const sowTx1 = {
  id: 'SOW-TX-001',
  docNo: '2026/SOW/001',
  tanggal: today,
  date: today,
  issueDocNo: 'ISSUE/2026/01/008',
  issueItemId: 'DETAIL-005',
  itemCode: '7065168',
  itemName: 'POLYBAG 25X50CMX0,20MM',
  uom: 'LBR',
  totalPolybag: 3000,
  totalDisemai: 3000,
  batchId: 'BTCH-001',
  batchCode: 'B-001',
  bedenganId: 'BED-001',
  bedenganCode: 'BDG-001',
  mantri: 'Budi Santoso',
  mantriId: 'USR-MTR-001',
  createdByUserId: 'USR-MTR-001',
  createdByName: 'Budi Santoso',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

storage.set('seeding_transactions', [sowTx1]);

const hubItems1 = getMantriTodayTransactions(mockMantriUser);
const matItem1 = hubItems1.find(it => it.moduleType === MODULE_TYPES.MATERIAL && it.docNo === '2026/SOW/001');

assert(
  'IT-MATERIAL-HUB-001',
  'SOW dengan pemakaian material muncul di Central Hub Material (READY_TO_CONFIRM)',
  matItem1 !== undefined && matItem1.status === MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM,
  `matItem1 exists: ${Boolean(matItem1)}, status: ${matItem1?.status}`
);

// --------------------------------------------------------------------------------
// IT-MATERIAL-HUB-002: Metadata Issue, SOW, Batch, Bedengan, dan Quantity
// --------------------------------------------------------------------------------
const metaMatch = matItem1 &&
  matItem1.referenceDocNo === '2026/SOW/001' &&
  matItem1.issueDocNo === 'ISSUE/2026/01/008' &&
  matItem1.quantityUsed === 3000 &&
  matItem1.uom === 'LBR' &&
  matItem1.batchCode === 'B-001' &&
  matItem1.bedenganCode === 'BDG-001' &&
  matItem1.sourceTransactionType === 'PINDAH_SEMAI_MATERIAL';

assert(
  'IT-MATERIAL-HUB-002',
  'Metadata material usage terisi lengkap dan akurat',
  Boolean(metaMatch),
  `issueDocNo: ${matItem1?.issueDocNo}, qty: ${matItem1?.quantityUsed}, batch: ${matItem1?.batchCode}, bdg: ${matItem1?.bedenganCode}`
);

// --------------------------------------------------------------------------------
// IT-MATERIAL-HUB-003: Mantri Konfirmasi membuat verification_transaction
// --------------------------------------------------------------------------------
const submitRes = submitMantriTransactions(['2026/SOW/001'], mockMantriUser, MODULE_TYPES.MATERIAL);
const allVerifs = storage.get(VERIFICATION_STORAGE_KEY, []);
const vTx1 = allVerifs.find(v => v.referenceDocNo === '2026/SOW/001' && (v.referenceType === 'MATERIAL' || v.moduleType === 'MATERIAL'));

assert(
  'IT-MATERIAL-HUB-003',
  'Mantri Confirm membuat 1 verification_transaction berstatus SUBMITTED_TO_ASB',
  submitRes.success &&
  submitRes.submittedCount === 1 &&
  vTx1 !== undefined &&
  vTx1.verificationStatus === VERIFICATION_STATUS.MENUNGGU_VERIFIKASI &&
  vTx1.sourceTransactionType === 'PINDAH_SEMAI_MATERIAL',
  `submittedCount: ${submitRes.submittedCount}, vTx1 status: ${vTx1?.verificationStatus}`
);

// --------------------------------------------------------------------------------
// IT-MATERIAL-HUB-004: Reload / Re-query Central Hub
// --------------------------------------------------------------------------------
const hubItemsAfterSubmit = getMantriTodayTransactions(mockMantriUser);
const matItemAfterSubmit = hubItemsAfterSubmit.find(it => it.moduleType === MODULE_TYPES.MATERIAL && it.docNo === '2026/SOW/001');

assert(
  'IT-MATERIAL-HUB-004',
  'Setelah reload, item berstatus SUBMITTED_TO_ASB dan tidak duplicate',
  matItemAfterSubmit !== undefined &&
  matItemAfterSubmit.status === MANTRI_TRANSACTION_STATUS.SUBMITTED_TO_ASB &&
  hubItemsAfterSubmit.filter(it => it.moduleType === MODULE_TYPES.MATERIAL && it.docNo === '2026/SOW/001').length === 1,
  `status: ${matItemAfterSubmit?.status}, count: ${hubItemsAfterSubmit.filter(it => it.docNo === '2026/SOW/001').length}`
);

// --------------------------------------------------------------------------------
// IT-MATERIAL-HUB-005: Repeat confirm diblokir karena sudah submitted/locked
// --------------------------------------------------------------------------------
const repeatSubmitRes = submitMantriTransactions(['2026/SOW/001'], mockMantriUser, MODULE_TYPES.MATERIAL);
assert(
  'IT-MATERIAL-HUB-005',
  'Repeat confirm diblokir (submittedCount = 0)',
  repeatSubmitRes.submittedCount === 0,
  `repeat submittedCount: ${repeatSubmitRes.submittedCount}`
);

// --------------------------------------------------------------------------------
// IT-MATERIAL-HUB-006: Multiple SOW (3 SOW) menggunakan 1 Dokumen Issue yang sama
// --------------------------------------------------------------------------------
resetAllStorage();

const sow1 = { ...sowTx1, id: 'SOW-001', docNo: '2026/SOW/001', totalPolybag: 3000, totalDisemai: 3000, batchCode: 'B-001', bedenganCode: 'BDG-001' };
const sow2 = { ...sowTx1, id: 'SOW-002', docNo: '2026/SOW/002', totalPolybag: 3000, totalDisemai: 3000, batchCode: 'B-001', bedenganCode: 'BDG-002' };
const sow3 = { ...sowTx1, id: 'SOW-003', docNo: '2026/SOW/003', totalPolybag: 2950, totalDisemai: 2950, batchCode: 'B-002', bedenganCode: 'BDG-003' };

storage.set('seeding_transactions', [sow1, sow2, sow3]);

const hubMulti = getMantriTodayTransactions(mockMantriUser);
const matMulti = hubMulti.filter(it => it.moduleType === MODULE_TYPES.MATERIAL);

assert(
  'IT-MATERIAL-HUB-006',
  '3 Dokumen SOW menghasilkan 3 item Material Usage independen di Central Hub',
  matMulti.length === 3 &&
  matMulti.some(m => m.docNo === '2026/SOW/001' && m.quantityUsed === 3000) &&
  matMulti.some(m => m.docNo === '2026/SOW/002' && m.quantityUsed === 3000) &&
  matMulti.some(m => m.docNo === '2026/SOW/003' && m.quantityUsed === 2950),
  `Total Material items found: ${matMulti.length}`
);

// --------------------------------------------------------------------------------
// IT-MATERIAL-HUB-007: Kalkulasi saldo Issue: 9000 - 3000 - 3000 - 2950 = 50 LBR
// --------------------------------------------------------------------------------
const balanceCheck = calculateRemainingIssueBalance('ISSUE/2026/01/008', 'DETAIL-005', '7065168');

assert(
  'IT-MATERIAL-HUB-007',
  'Kalkulasi Saldo Issue akurat: Total Digunakan = 8.950, Sisa = 50 LBR, Status = PARTIALLY_USED',
  balanceCheck.usedQuantity === 8950 &&
  balanceCheck.remainingQuantity === 50 &&
  balanceCheck.status === 'PARTIALLY_USED',
  `usedQty: ${balanceCheck.usedQuantity}, remQty: ${balanceCheck.remainingQuantity}, status: ${balanceCheck.status}`
);

// --------------------------------------------------------------------------------
// IT-MATERIAL-HUB-008: ASB Review Queue & Detail Data
// --------------------------------------------------------------------------------
// Submit all 3 SOWs to ASB for Material
submitMantriTransactions(['2026/SOW/001', '2026/SOW/002', '2026/SOW/003'], mockMantriUser, MODULE_TYPES.MATERIAL);

const asbRecords = getActionableRecordsForAsb(mockAsbUser);
const asbMatRecords = asbRecords.filter(r => r.referenceType === 'MATERIAL');

const sourceRecord = findSourceRecord('MATERIAL', '2026/SOW/001', mockAsbUser);
const detailData = getVerificationDetailData(sourceRecord, mockAsbUser, 'MATERIAL');

assert(
  'IT-MATERIAL-HUB-008',
  'ASB Review Workspace memuat antrean Material dan detail card merender data akurat',
  asbMatRecords.length === 3 &&
  sourceRecord !== null &&
  detailData.fields.some(f => f.label === 'Nama Material' && f.value === 'POLYBAG 25X50CMX0,20MM') &&
  detailData.fields.some(f => f.label === 'Dokumen SOW' && f.value === '2026/SOW/001') &&
  detailData.fields.some(f => f.label === 'Jumlah Digunakan' && f.value.includes('3.000')),
  `asbMatRecords: ${asbMatRecords.length}, sourceRecord: ${Boolean(sourceRecord)}`
);

// --------------------------------------------------------------------------------
// IT-MATERIAL-HUB-009: ASB Approve -> DISETUJUI
// --------------------------------------------------------------------------------
// ASB approves SOW-001 Material
approveVerification({
  referenceType: 'MATERIAL',
  referenceId: '2026/SOW/001',
  notes: 'Disetujui lengkap',
  currentUser: mockAsbUser
});

const hubAfterApprove = getMantriTodayTransactions(mockMantriUser);
const itemAfterApprove = hubAfterApprove.find(it => it.moduleType === MODULE_TYPES.MATERIAL && it.docNo === '2026/SOW/001');

assert(
  'IT-MATERIAL-HUB-009',
  'ASB Approve mengubah status menjadi VERIFIED / DISETUJUI di Mantri Central Hub',
  itemAfterApprove !== undefined && itemAfterApprove.status === MANTRI_TRANSACTION_STATUS.VERIFIED,
  `Status after approval: ${itemAfterApprove?.status}`
);

// --------------------------------------------------------------------------------
// IT-MATERIAL-HUB-010: ASB Revision -> DIKEMBALIKAN / REVISION
// --------------------------------------------------------------------------------
// ASB requests revision on SOW-002 Material
returnVerification({
  referenceType: 'MATERIAL',
  referenceId: '2026/SOW/002',
  returnReason: 'Kuantitas fisik belum sesuai',
  notes: 'Mohon dicek ulang',
  currentUser: mockAsbUser
});

const hubAfterRevise = getMantriTodayTransactions(mockMantriUser);
const itemAfterRevise = hubAfterRevise.find(it => it.moduleType === MODULE_TYPES.MATERIAL && it.docNo === '2026/SOW/002');

assert(
  'IT-MATERIAL-HUB-010',
  'ASB Revision mengembalikan item ke status REVISION pada Central Hub Mantri',
  itemAfterRevise !== undefined && itemAfterRevise.status === MANTRI_TRANSACTION_STATUS.REVISION,
  `Status after revision: ${itemAfterRevise?.status}`
);

// --------------------------------------------------------------------------------
// IT-MATERIAL-HUB-011: Central Hub Badge count
// --------------------------------------------------------------------------------
// In current state:
// SOW-001 is VERIFIED (not pending)
// SOW-002 is REVISION (actionable for re-confirm)
// SOW-003 is SUBMITTED_TO_ASB (locked)
const currentHub = getMantriTodayTransactions(mockMantriUser);
const pendingForConfirmation = currentHub.filter(
  it => it.moduleType === MODULE_TYPES.MATERIAL &&
  (it.status === MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM || it.status === MANTRI_TRANSACTION_STATUS.REVISION)
);

assert(
  'IT-MATERIAL-HUB-011',
  'Badge Central Hub menghitung hanya transaksi eligible (READY_TO_CONFIRM / REVISION)',
  pendingForConfirmation.length === 1 && pendingForConfirmation[0].docNo === '2026/SOW/002',
  `Eligible pending count: ${pendingForConfirmation.length}`
);

// --------------------------------------------------------------------------------
// IT-MATERIAL-HUB-012: Batch Population tidak berubah
// --------------------------------------------------------------------------------
// Seedings totalDisemai is 3000, 3000, 2950. Material verification does not touch population.
const totalDisemaiSum = storage.get('seeding_transactions', []).reduce((acc, s) => acc + s.totalDisemai, 0);

assert(
  'IT-MATERIAL-HUB-012',
  'Batch Population bibit tidak termutasi oleh verifikasi Material',
  totalDisemaiSum === 8950,
  `Total Disemai Population: ${totalDisemaiSum}`
);

// --------------------------------------------------------------------------------
// IT-MATERIAL-HUB-013: Cross-SOW Isolation
// --------------------------------------------------------------------------------
const s1 = matMulti.find(m => m.docNo === '2026/SOW/001');
const s2 = matMulti.find(m => m.docNo === '2026/SOW/002');
const s3 = matMulti.find(m => m.docNo === '2026/SOW/003');

assert(
  'IT-MATERIAL-HUB-013',
  'Cross-SOW isolation: Kuantitas masing-masing SOW terisolasi dan tidak saling menimpa',
  s1.quantityUsed === 3000 && s2.quantityUsed === 3000 && s3.quantityUsed === 2950,
  `SOW-001: ${s1.quantityUsed}, SOW-002: ${s2.quantityUsed}, SOW-003: ${s3.quantityUsed}`
);

// --------------------------------------------------------------------------------
// IT-MATERIAL-HUB-014: Cross-Batch Isolation
// --------------------------------------------------------------------------------
assert(
  'IT-MATERIAL-HUB-014',
  'Cross-Batch isolation: SOW-001 (B-001/BDG-001) terisolasi dari SOW-003 (B-002/BDG-003)',
  s1.batchCode === 'B-001' && s1.bedenganCode === 'BDG-001' &&
  s3.batchCode === 'B-002' && s3.bedenganCode === 'BDG-003',
  `S1: ${s1.batchCode}/${s1.bedenganCode}, S3: ${s3.batchCode}/${s3.bedenganCode}`
);

// --------------------------------------------------------------------------------
// IT-MATERIAL-HUB-015: Duplicate Protection
// --------------------------------------------------------------------------------
const finalVerifs = storage.get(VERIFICATION_STORAGE_KEY, []);
const sow1Verifs = finalVerifs.filter(v => v.referenceDocNo === '2026/SOW/001' && (v.referenceType === 'MATERIAL' || v.moduleType === 'MATERIAL'));

assert(
  'IT-MATERIAL-HUB-015',
  'Duplicate protection: Tepat 1 record verification transaction per SOW usage',
  sow1Verifs.length === 1,
  `SOW-001 verif count: ${sow1Verifs.length}`
);

// --------------------------------------------------------------------------------
// IT-MATERIAL-HUB-016: Read-Only Query Safety (No Storage Mutation)
// --------------------------------------------------------------------------------
const storageSnapBefore = JSON.stringify(Array.from(store.entries()));
getMantriTodayTransactions(mockMantriUser);
getMantriTodayTransactions(mockMantriUser);
const storageSnapAfter = JSON.stringify(Array.from(store.entries()));

assert(
  'IT-MATERIAL-HUB-016',
  'Query read-only getMantriTodayTransactions() 100% bebas dari efek samping mutasi storage',
  storageSnapBefore === storageSnapAfter,
  `Snapshot match: ${storageSnapBefore === storageSnapAfter}`
);

// --------------------------------------------------------------------------------
// IT-MATERIAL-HUB-017: Warehouse Master Stocks (STK-*) Exclusion
// --------------------------------------------------------------------------------
storage.set('materials_transactions', [
  { id: 'STK-001', code: 'STK-001', materialName: 'Pupuk NPK', currentStock: 5000, receiptDate: today, createdAt: new Date().toISOString() },
  { id: 'STK-002', code: 'STK-002', materialName: 'Polybag 15x20', currentStock: 3000, receiptDate: today, createdAt: new Date().toISOString() },
  { id: 'STK-003', code: 'STK-003', materialName: 'Fungisida', currentStock: 2000, receiptDate: today, createdAt: new Date().toISOString() },
  { id: 'STK-004', code: 'STK-004', materialName: 'Insektisida', currentStock: 8000, receiptDate: today, createdAt: new Date().toISOString() }
]);

const txsWithMasterStock = getMantriTodayTransactions(mockMantriUser);
const foundStkItems = txsWithMasterStock.filter(t => (t.id && t.id.startsWith('STK-')) || (t.docNo && t.docNo.startsWith('STK-')) || (t.docNo && t.docNo.startsWith('MAT-STK-')));

assert(
  'IT-MATERIAL-HUB-017',
  'Warehouse Master Stocks (STK-001 s.d. STK-004) 100% dieksklusi dari Central Hub',
  foundStkItems.length === 0,
  `Found STK count: ${foundStkItems.length}`
);

// --------------------------------------------------------------------------------
// IT-MATERIAL-HUB-018: Canonical Fields Completeness for Restructured UI
// --------------------------------------------------------------------------------
const sowSample = hubItems1.find(it => it.moduleType === MODULE_TYPES.MATERIAL);
const hasAllUiFields = Boolean(
  sowSample &&
  sowSample.itemName &&
  sowSample.issueDocNo &&
  sowSample.quantityUsed !== undefined &&
  sowSample.uom &&
  (sowSample.referenceDocNo || sowSample.docNo) &&
  sowSample.batchCode &&
  sowSample.bedenganCode &&
  sowSample.date
);

assert(
  'IT-MATERIAL-HUB-018',
  'Seluruh field canonical UI Material (itemName, issueDocNo, qty, uom, referenceDocNo, batch, bedengan, date) tersedia lengkap',
  hasAllUiFields,
  `Fields check: ${JSON.stringify({
    itemName: sowSample?.itemName,
    issueDocNo: sowSample?.issueDocNo,
    qty: sowSample?.quantityUsed,
    uom: sowSample?.uom,
    ref: sowSample?.referenceDocNo,
    batch: sowSample?.batchCode,
    bdg: sowSample?.bedenganCode,
    date: sowSample?.date
  })}`
);

console.log('\n================================================================================');
console.log(`TEST SUMMARY: TOTAL = ${totalPassed + totalFailed} | PASSED = ${totalPassed} | FAILED = ${totalFailed}`);
console.log('================================================================================\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
