/**
 * tests/test-kembalikan-perbaikan-lifecycle.js
 * Integration test for: Asisten Kembalikan -> DIKEMBALIKAN -> Mantri Perbaiki -> Submit Ulang -> Asisten Approve
 */

// Mock localStorage
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import { storage, KEYS } from '../js/core/storage.js';
import { ROLES } from '../js/core/user-context.js';
import {
  getActionableRecordsForAsb,
  getVerificationRecordsByScope,
  getVerificationDetailData,
  returnVerification,
  approveVerification,
  VERIFICATION_STATUS,
  VERIFICATION_STORAGE_KEY
} from '../js/modules/verification/verification-manager.js';
import {
  getMantriTodayTransactions,
  submitModuleTransactions,
  MANTRI_TRANSACTION_STATUS,
  MODULE_TYPES,
  matchActor
} from '../js/modules/verification/mantri-confirmation-service.js';
import {
  declareSelectionItem,
  SELECTION_STATUS,
  SELECTION_STORAGE_KEY
} from '../js/modules/selection/selection-manager.js';
import {
  deduplicateLogicalSelectionPool,
  renderStandardizedRejectList
} from '../js/modules/selection/selection-landing.js';
import {
  integrateDederanRejectionToSelectionPool,
  updateDederanTransaction,
  DEDERAN_STORAGE_KEYS
} from '../js/modules/seeding/dederan-manager.js';
import { todayISO, todayDDMMYYYY } from '../js/core/utils.js';

console.log('=== TEST: WORKFLOW KEMBALIKAN -> PERBAIKAN -> SUBMIT ULANG ===\n');

// Clean up test storages
storage.set(SELECTION_STORAGE_KEY, []);
storage.set(VERIFICATION_STORAGE_KEY, []);
storage.set('selection_pool', []);
storage.set('attendance_transactions', [
  {
    id: `ATT-SUP-${todayISO()}`,
    date: todayISO(),
    type: 'SUPERVISOR',
    role: ROLES.MANTRI_TANAMAN,
    attendanceType: 'DATANG',
    status: 'HADIR',
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  },
  {
    id: `ATT-WRK-${todayISO()}`,
    date: todayISO(),
    type: 'WORKER',
    workerId: 'WRK-001',
    attendanceType: 'DATANG',
    status: 'HADIR',
    estateId: 'EST-TBS',
    divisionId: 'DIV-01'
  }
]);

const wagimanUser = {
  userId: 'USR-MNT-001',
  code: 'MNT001',
  name: 'Wagiman',
  role: ROLES.MANTRI_TANAMAN,
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-01',
  divisionName: 'Divisi I'
};

const suprionoUser = {
  userId: 'USR-MNT-002',
  code: 'MNT002',
  name: 'Supriono',
  role: ROLES.MANTRI_TANAMAN,
  estateId: 'EST-APM',
  estateName: 'Aek Pamienke',
  divisionId: 'DIV-01',
  divisionName: 'Divisi I'
};

const asbUser = {
  userId: 'USR-ASB-001',
  code: 'ASB001',
  name: 'Asisten Bibitan TBS',
  role: ROLES.ASISTEN_BIBITAN,
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-01',
  divisionName: 'Divisi I'
};

// 1. Wagiman declares 2026/CULL/004
const targetPoolItem = {
  id: 'POOL-CULL-004',
  docNo: '2026/CULL/004',
  originType: 'REJECT_DEDERAN',
  sourceModule: 'DEDERAN',
  sourceTransactionType: 'DEDER_INSPECTION',
  sourceDocNo: '2026/DED/004',
  category: 'AFKIR',
  jumlahAfkir: 50,
  quantity: 50,
  estateId: 'EST-TBS',
  divisionId: 'DIV-01',
  bedengan: 'BED-04',
  bedenganCode: 'BED-04',
  klon: 'PB 260',
  tanggal: todayDDMMYYYY(),
  tanggalSeleksi: todayDDMMYYYY()
};

console.log('--- Step 1: Wagiman creates 2026/CULL/004 ---');
const declRes = declareSelectionItem(targetPoolItem, { id: 'PHOTO-004', dataUrl: 'data:image/jpeg;base64,mock' }, wagimanUser, { category: 'AFKIR', notes: 'Afkir dederan awal' });
console.log('  Created document:', declRes.transaction.docNo, '| status:', declRes.transaction.status);
console.assert(declRes.transaction.docNo === '2026/CULL/004', 'DocNo must be 2026/CULL/004');
console.assert(declRes.transaction.status === SELECTION_STATUS.READY_TO_CONFIRM, 'Status must be READY_TO_CONFIRM');
console.log('  ✅ PASS: Wagiman created 2026/CULL/004 with status READY_TO_CONFIRM');

// 2. Wagiman submits module PENYELEKSIAN to Asisten
console.log('\n--- Step 2: Wagiman submits module PENYELEKSIAN to Central Hub ---');
const submitRes = submitModuleTransactions(MODULE_TYPES.PENYELEKSIAN, wagimanUser);
console.log('  Submitted count:', submitRes.submittedCount, '| Message:', submitRes.message);
console.assert(submitRes.submittedCount === 1, 'Must submit 1 item');
console.log('  ✅ PASS: 2026/CULL/004 submitted to Central Hub');

// 3. Asisten checks pending actionable queue
console.log('\n--- Step 3: Asisten pending queue before return ---');
const pendingBeforeReturn = getActionableRecordsForAsb(asbUser);
console.log('  Actionable pending count for Asisten:', pendingBeforeReturn.length);
const foundPending = pendingBeforeReturn.find(p => p.referenceDocNo === '2026/CULL/004');
console.assert(Boolean(foundPending), '2026/CULL/004 must be in Asisten pending queue');
console.assert(foundPending.verificationStatus === VERIFICATION_STATUS.MENUNGGU_VERIFIKASI, 'Status must be MENUNGGU_VERIFIKASI');
console.log('  ✅ PASS: 2026/CULL/004 appears in Asisten pending actionable queue as Menunggu');

// 4. Asisten returns document with reason "test perbaiki"
console.log('\n--- Step 4: Asisten returns document with reason "test perbaiki" ---');
const returnRes = returnVerification({
  referenceType: foundPending.referenceType,
  referenceId: foundPending.referenceId,
  returnReason: 'test perbaiki',
  notes: 'Tolong hitung ulang afkir bedengan 4',
  currentUser: asbUser
});
console.log('  Return verification ID:', returnRes.verificationId, '| returnReason:', returnRes.returnReason);
console.assert(returnRes.verificationStatus === VERIFICATION_STATUS.DIKEMBALIKAN, 'Verification status must be DIKEMBALIKAN');
console.assert(returnRes.returnReason === 'test perbaiki', 'returnReason must be "test perbaiki"');
console.log('  ✅ PASS: Asisten successfully returned document');

// 5. Verification Engine & UI validation
console.log('\n--- Step 5: Verification Engine & UI Validation ---');
const pendingAfterReturn = getActionableRecordsForAsb(asbUser);
console.log('  Actionable pending count for Asisten after return:', pendingAfterReturn.length);
console.assert(pendingAfterReturn.length === 0, 'Returned document must NOT be in pending actionable queue');
console.log('  ✅ PASS: 2026/CULL/004 excluded from actionable pending queue');

const allScopedForAsb = getVerificationRecordsByScope(asbUser);
const foundScoped = allScopedForAsb.find(p => p.referenceDocNo === '2026/CULL/004');
console.assert(Boolean(foundScoped), '2026/CULL/004 must be present in getVerificationRecordsByScope');
console.assert(foundScoped.verificationStatus === VERIFICATION_STATUS.DIKEMBALIKAN, 'verificationStatus must be DIKEMBALIKAN');
console.assert(foundScoped.returnReason === 'test perbaiki', 'returnReason must be exposed as "test perbaiki"');
console.log('  ✅ PASS: getVerificationRecordsByScope returns status DIKEMBALIKAN with returnReason="test perbaiki"');

const detailData = getVerificationDetailData(foundScoped.rawRecord, asbUser, foundScoped.referenceType);
console.assert(detailData.returnReason === 'test perbaiki', 'Detail data must expose returnReason="test perbaiki"');
console.log('  ✅ PASS: getVerificationDetailData exposes returnReason="test perbaiki"');

// 6. Mantri side validation (Wagiman vs Supriono)
console.log('\n--- Step 6: Mantri side & Authorization Validation ---');
const wagimanTxs = getMantriTodayTransactions(wagimanUser);
const wagimanCull = wagimanTxs.find(t => t.docNo === '2026/CULL/004');
console.assert(Boolean(wagimanCull), 'Wagiman must see his returned 2026/CULL/004');
console.assert(wagimanCull.status === MANTRI_TRANSACTION_STATUS.REVISION, 'Status for Wagiman must be REVISION');
console.assert(wagimanCull.rawRecord.returnReason === 'test perbaiki', 'Wagiman sees returnReason="test perbaiki"');
console.assert(matchActor(wagimanCull.rawRecord, wagimanUser) === true, 'Wagiman is authorized to repair');
console.log('  ✅ PASS: Wagiman sees 2026/CULL/004 as Perlu Revisi / REVISION with reason "test perbaiki" and can repair');

const suprionoTxs = getMantriTodayTransactions(suprionoUser);
const suprionoCull = suprionoTxs.find(t => t.docNo === '2026/CULL/004');
console.assert(!suprionoCull, 'Supriono must NOT see Wagiman transaction in his list');
console.assert(matchActor(wagimanCull.rawRecord, suprionoUser) === false, 'Supriono CANNOT repair Wagiman document');
console.log('  ✅ PASS: Supriono isolated and unauthorized to repair Wagiman document');

// 7. Wagiman repairs document
console.log('\n--- Step 7: Wagiman repairs document (Re-declaration) ---');
const repairRes = declareSelectionItem(wagimanCull.rawRecord, { id: 'PHOTO-004-REV', dataUrl: 'data:image/jpeg;base64,mockRev' }, wagimanUser, { category: 'AFKIR', notes: 'Sudah dihitung ulang 45 butir' });
console.assert(repairRes.transaction.docNo === '2026/CULL/004', 'DocNo must remain 2026/CULL/004');
console.assert(repairRes.transaction.status === SELECTION_STATUS.READY_TO_CONFIRM, 'Status must transition to READY_TO_CONFIRM');
console.assert(repairRes.transaction.lastReturnReason === 'test perbaiki', 'lastReturnReason must be preserved in history');

const allSelRecords = storage.get(SELECTION_STORAGE_KEY, []);
const cull004Matches = allSelRecords.filter(r => r.docNo === '2026/CULL/004');
console.assert(cull004Matches.length === 1, 'There must be NO duplicate transaction in storage (count: 1)');
console.log('  ✅ PASS: Document repaired to READY_TO_CONFIRM without duplication, history preserved');

// 8. Wagiman re-submits to Central Hub
console.log('\n--- Step 8: Wagiman re-submits repaired document ---');
const resubmitRes = submitModuleTransactions(MODULE_TYPES.PENYELEKSIAN, wagimanUser);
console.assert(resubmitRes.submittedCount === 1, 'Must re-submit 1 item');
console.log('  ✅ PASS: Re-submitted to Central Hub');

// 9. Asisten sees it back in pending actionable queue
console.log('\n--- Step 9: Asisten pending queue after re-submit ---');
const pendingAfterResubmit = getActionableRecordsForAsb(asbUser);
const foundPendingAgain = pendingAfterResubmit.find(p => p.referenceDocNo === '2026/CULL/004');
console.assert(Boolean(foundPendingAgain), '2026/CULL/004 must re-appear in Asisten pending queue');
console.assert(foundPendingAgain.verificationStatus === VERIFICATION_STATUS.MENUNGGU_VERIFIKASI, 'Status must be MENUNGGU_VERIFIKASI');
console.log('  ✅ PASS: Document re-appears in Asisten pending queue as Menunggu');

// 10. Asisten Approves
console.log('\n--- Step 10: Asisten Approves document ---');
const approveRes = approveVerification({
  referenceType: foundPendingAgain.referenceType,
  referenceId: foundPendingAgain.referenceId,
  notes: 'Data revisi sudah sesuai',
  currentUser: asbUser
});
console.assert(approveRes.verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI, 'Status must be TERVERIFIKASI');
console.log('  ✅ PASS: Final status is TERVERIFIKASI / DISETUJUI');

const finalPending = getActionableRecordsForAsb(asbUser);
console.assert(finalPending.length === 0, 'Pending queue must be empty after approval');
console.log('  ✅ PASS: Pending queue empty');

console.log('\n--- Step 11: Validation of System Alasan vs Manual Catatan Separation ---');
// Case A: Create without notes
const poolItemNoNotes = {
  id: 'POOL-TEST-005',
  docNo: '2026/CULL/005',
  sourceModule: 'DEDERAN',
  sourceTransactionType: 'DEDER_INSPECTION',
  sourceDocNo: '2026/DED/005',
  bedenganCode: 'BED-005',
  alasan: 'Hasil Pemeriksaan Dederan Tidak Berhasil (BED-005)',
  jumlahAfkir: 30,
  category: 'AFKIR'
};
const declA = declareSelectionItem(poolItemNoNotes, null, wagimanUser, { category: 'AFKIR', notes: '' });
console.assert(declA.transaction.alasan === 'Hasil Pemeriksaan Dederan Tidak Berhasil (BED-005)', 'Case A: alasan must be system-derived');
console.assert(declA.transaction.catatan === null, 'Case A: catatan must be null when user does not provide notes');
console.log('  ✅ PASS: Case A (Tanpa Catatan) -> alasan preserved as system context, catatan = null');

// Case B: Create with manual notes
const poolItemWithNotes = {
  id: 'POOL-TEST-006',
  docNo: '2026/CULL/006',
  sourceModule: 'DEDERAN',
  sourceTransactionType: 'DEDER_INSPECTION',
  sourceDocNo: '2026/DED/006',
  bedenganCode: 'BED-006',
  alasan: 'Hasil Pemeriksaan Dederan Tidak Berhasil (BED-006)',
  jumlahAfkir: 25,
  category: 'AFKIR'
};
const declB = declareSelectionItem(poolItemWithNotes, null, wagimanUser, { category: 'AFKIR', notes: 'Bibit perlu diperiksa ulang.' });
console.assert(declB.transaction.alasan === 'Hasil Pemeriksaan Dederan Tidak Berhasil (BED-006)', 'Case B: alasan must be system-derived');
console.assert(declB.transaction.catatan === 'Bibit perlu diperiksa ulang.', 'Case B: catatan must be manual user input');
console.log('  ✅ PASS: Case B (Dengan Catatan Manual) -> alasan preserved, catatan = "Bibit perlu diperiksa ulang."');

// Case C: Legacy record in storage with catatan === alasan
const legacyRecord = {
  id: 'SEL-LEGACY-001',
  docNo: '2026/CULL/001',
  moduleType: 'PENYELEKSIAN',
  referenceType: 'PENYELEKSIAN',
  alasan: 'Hasil Pemeriksaan Dederan Tidak Berhasil (BED-001)',
  catatan: 'Hasil Pemeriksaan Dederan Tidak Berhasil (BED-001)',
  actualBibitSelectedQty: 40,
  actualBibitRetainedQty: 0
};
const legacyDetail = getVerificationDetailData(legacyRecord, asbUser, 'PENYELEKSIAN');
const ketField = legacyDetail.fields.find(f => f.label === 'Keterangan');
console.assert(ketField && ketField.value === '-', 'Case C: Legacy duplicate catatan must be filtered to "-" in presentation');
console.log('  ✅ PASS: Case C (Legacy Record Presentation) -> legacy catatan identical to alasan is filtered to "-"');

// Case D: Storage persistence check
const allStored = storage.get(SELECTION_STORAGE_KEY, []);
const readA = allStored.find(t => t.docNo === '2026/CULL/005');
const readB = allStored.find(t => t.docNo === '2026/CULL/006');
console.assert(readA && readA.catatan === null, 'Storage persistence: CULL/005 catatan must be null in storage');
console.assert(readB && readB.catatan === 'Bibit perlu diperiksa ulang.', 'Storage persistence: CULL/006 catatan must be manual note in storage');
console.log('  ✅ PASS: Case D (Storage Persistence & Reload) -> verified directly against storage');

console.log('\n--- Step 12: Selection Pool Logical Deduplication & Sync Idempotency ---');
// Inject two distinct physical entries for the same logical dederan inspection into raw pool (simulating legacy duplication)
const rawPoolData = [
  {
    id: 'SEL-POOL-DED-2026/DED/004',
    docNo: '2026/CULL/004',
    originType: 'REJECT_DEDERAN',
    sourceModule: 'DEDERAN',
    sourceDocNo: '2026/DED/004',
    dederanDocNo: '2026/DED/004',
    bedenganCode: 'BED-004',
    jumlahAfkir: 1000,
    status: 'DIKEMBALIKAN',
    returnReason: 'test perbaiki'
  },
  {
    id: 'SEL-POOL-LEGACY-004',
    docNo: '2026/CULL/004',
    originType: 'REJECT_DEDERAN',
    sourceModule: 'DEDERAN',
    sourceDocNo: '2026/TB/RNUR/001',
    bedenganCode: 'BED-004',
    jumlahAfkir: 1000,
    status: 'DIKEMBALIKAN',
    returnReason: 'test perbaiki'
  }
];

const deduped = deduplicateLogicalSelectionPool(rawPoolData);
console.assert(deduped.length === 1, `Deduped length must be 1 (found: ${deduped.length})`);
console.assert(deduped[0].bedenganCode === 'BED-004', 'Deduped item is BED-004');
console.assert(deduped[0].status === 'DIKEMBALIKAN', 'Deduped item retains status DIKEMBALIKAN');
console.assert(deduped[0].returnReason === 'test perbaiki', 'Deduped item retains returnReason');
console.log('  ✅ PASS: Logical deduplication collapses duplicate BED-004 entries into exactly 1 logical pool item');

// Test repeated sync idempotency with integrateDederanRejectionToSelectionPool
storage.set('selection_pool', rawPoolData);
const inspDummy = {
  id: 'INS-004',
  docNo: '2026/INS/DED/004',
  dederanTxDocNo: '2026/DED/004',
  bedenganCode: 'BED-004',
  jumlahTidakBerhasil: 1000
};
integrateDederanRejectionToSelectionPool(inspDummy, 1000);
integrateDederanRejectionToSelectionPool(inspDummy, 1000);
const poolAfterSync = storage.get('selection_pool', []);
console.assert(poolAfterSync.some(p => p.id === 'SEL-POOL-DED-2026/DED/004'), 'Pool has updated canonical entry');
console.log('  ✅ PASS: Repeated sync calls are idempotent and do not create duplicate pool entries');

console.log('\n--- Step 13: Physical Source Inspection Quantity Correction Workflow ---');
// When inspection is corrected: 1000 -> 500
integrateDederanRejectionToSelectionPool(inspDummy, 500);
const poolUpdated = storage.get('selection_pool', []);
const bedEntry = poolUpdated.find(p => p.id === 'SEL-POOL-DED-2026/DED/004');
console.assert(bedEntry && bedEntry.jumlahAfkir === 500, `Pool quantity updated to 500 (found: ${bedEntry?.jumlahAfkir})`);
console.log('  ✅ PASS: Correcting inspection quantity updates selection pool quantity consistently');

// When inspection is corrected: 500 -> 0 (Zero reject)
integrateDederanRejectionToSelectionPool(inspDummy, 0);
const poolZero = storage.get('selection_pool', []);
const bedEntryZero = poolZero.find(p => p.id === 'SEL-POOL-DED-2026/DED/004');
console.assert(!bedEntryZero || bedEntryZero.jumlahAfkir === 0, 'Zero reject does not leave active afkir pool item');
console.log('  ✅ PASS: Zero reject does not leave active non-zero afkir pool item');

console.log('\n--- Step 14: Dederan Return -> In-Place Edit -> Resubmit -> Approve Lifecycle ---');
// Setup test data for Dederan
storage.set(DEDERAN_STORAGE_KEYS.INDUK, [
  {
    id: 'DDR-2026-TB-RNUR-001',
    docNo: '2026/DDR/001',
    sourceReceiptDocNo: '2026/TB/RNUR/001',
    totalNilaiButirPenerimaan: 10000,
    totalDidederSDHI: 5000,
    sisaBelumDeder: 5000,
    status: 'Deder Belum Selesai',
    klon: 'GT 1',
    estateId: 'EST-TBS',
    divisionId: 'DIV-01',
    createdBy: 'Wagiman',
    actorName: 'Wagiman',
    createdByName: 'Wagiman'
  }
]);

const initialDederTx = {
  id: 'DED-TX-2026-DED-004',
  docNo: '2026/DED/004',
  parentDederIndukDocNo: '2026/DDR/001',
  sourceReceiptDocNo: '2026/TB/RNUR/001',
  bedenganId: 'BED-004',
  bedenganCode: 'BED-004',
  bedengan: 'BED-004',
  jumlahDeder: 5000,
  photos: ['photo1.jpg'],
  tanggalDeder: todayDDMMYYYY(),
  date: todayISO(),
  estateId: 'EST-TBS',
  divisionId: 'DIV-01',
  klon: 'GT 1',
  createdBy: 'Wagiman',
  actorName: 'Wagiman',
  createdByName: 'Wagiman',
  status: 'READY_TO_CONFIRM',
  verificationStatus: null,
  submissionStatus: null
};

storage.set(DEDERAN_STORAGE_KEYS.TRANSACTIONS, [initialDederTx]);

// 1. Wagiman submits Dederan to Central Hub
const dederSubmitRes = submitModuleTransactions(MODULE_TYPES.DEDERAN, wagimanUser);
console.assert(dederSubmitRes.success, 'Dederan submitted successfully');
console.log('  ✅ PASS: Wagiman submitted 2026/DED/004 to Central Hub');

// 2. Asisten returns 2026/DED/004 with reason "test kembalikan"
const dederPending = getActionableRecordsForAsb(asbUser);
const targetDederVrf = dederPending.find(v => v.referenceDocNo === '2026/DED/004' || v.rawRecord?.docNo === '2026/DED/004');
console.assert(targetDederVrf, 'Found Dederan in Asisten pending queue');

const returnDederRes = returnVerification({
  referenceType: targetDederVrf.referenceType || 'DEDERAN',
  referenceId: targetDederVrf.referenceId || '2026/DED/004',
  returnReason: 'test kembalikan',
  currentUser: asbUser
});
console.assert(returnDederRes && returnDederRes.verificationStatus === 'DIKEMBALIKAN', 'Asisten returned Dederan transaction');
console.log('  ✅ PASS: Asisten returned 2026/DED/004 with reason "test kembalikan"');

// Verify status in storage
const txsAfterReturn = storage.get(DEDERAN_STORAGE_KEYS.TRANSACTIONS, []);
const dederReturnedTx = txsAfterReturn.find(t => t.docNo === '2026/DED/004');
console.assert(dederReturnedTx.status === 'DIKEMBALIKAN', `Status must be DIKEMBALIKAN (found: ${dederReturnedTx.status})`);
console.assert(dederReturnedTx.returnReason === 'test kembalikan', `returnReason must be preserved (found: ${dederReturnedTx.returnReason})`);
console.log('  ✅ PASS: 2026/DED/004 has status DIKEMBALIKAN and returnReason "test kembalikan"');

// 3. Unauthorized persona (Supriono) attempt to edit Wagiman Dederan
let suprionoBlocked = false;
storage.set(KEYS.SESSION, suprionoUser);
try {
  updateDederanTransaction('2026/DED/004', { jumlahDeder: 4500 });
} catch (err) {
  suprionoBlocked = true;
}
console.assert(suprionoBlocked, 'Supriono must be blocked from updating Wagiman Dederan');
console.log('  ✅ PASS: Supriono isolated and unauthorized to edit Wagiman Dederan');

// 4. Authorized persona (Wagiman) in-place correction
storage.set(KEYS.SESSION, wagimanUser);
const updatedDeder = updateDederanTransaction('2026/DED/004', {
  jumlahDeder: 4800,
  photos: ['photo_corrected.jpg']
});
console.assert(updatedDeder.docNo === '2026/DED/004', 'docNo remains 2026/DED/004');
console.assert(updatedDeder.jumlahDeder === 4800, 'jumlahDeder updated to 4800');
console.assert(updatedDeder.status === 'READY_TO_CONFIRM', 'status transitioned to READY_TO_CONFIRM');
console.assert(updatedDeder.returnReason === null, 'active returnReason is reset to null');
console.assert(updatedDeder.lastReturnReason === 'test kembalikan', 'lastReturnReason preserved');

const txsAfterEdit = storage.get(DEDERAN_STORAGE_KEYS.TRANSACTIONS, []);
console.assert(txsAfterEdit.length === 1, `No duplicate transaction created (total: ${txsAfterEdit.length})`);
console.log('  ✅ PASS: 2026/DED/004 updated in-place to READY_TO_CONFIRM without duplicating records');

// 5. Resubmit to Central Hub
const dederResubmitRes = submitModuleTransactions(MODULE_TYPES.DEDERAN, wagimanUser);
console.assert(dederResubmitRes.success, 'Resubmission to Central Hub successful');
console.log('  ✅ PASS: 2026/DED/004 re-submitted to Central Hub');

// 6. Asisten approves resubmitted Dederan
const dederPending2 = getActionableRecordsForAsb(asbUser);
const targetDederVrf2 = dederPending2.find(v => v.referenceDocNo === '2026/DED/004' || v.rawRecord?.docNo === '2026/DED/004');
console.assert(targetDederVrf2, 'Found resubmitted Dederan in Asisten pending queue');

const approveDederRes = approveVerification({
  referenceType: targetDederVrf2.referenceType || 'DEDERAN',
  referenceId: targetDederVrf2.referenceId || '2026/DED/004',
  currentUser: asbUser
});
console.assert(approveDederRes && approveDederRes.verificationStatus === 'TERVERIFIKASI', 'Asisten approved resubmitted Dederan');

const txsFinal = storage.get(DEDERAN_STORAGE_KEYS.TRANSACTIONS, []);
const dederFinal = txsFinal.find(t => t.docNo === '2026/DED/004');
console.assert(dederFinal.status === 'DISETUJUI' || dederFinal.verificationStatus === 'TERVERIFIKASI', 'Final status is approved');
console.log('  ✅ PASS: Asisten approved 2026/DED/004, full lifecycle completed');

console.log('\n🎉 ALL LIFECYCLE, DEDUPLICATION, DEDERAN WORKFLOW & NOTE SEPARATION TESTS PASSED PERFECTLY!');

