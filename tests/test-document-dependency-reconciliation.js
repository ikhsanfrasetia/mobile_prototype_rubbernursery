/**
 * tests/test-document-dependency-reconciliation.js
 * Comprehensive Isolated Test Suite for Nursery Document Dependency & Lifecycle Reconciliation.
 */

import { storage } from '../js/core/storage.js';
import { validateSourceEditability, guardDependency } from '../js/core/dependency-guard.js';
import { integrateDederanRejectionToSelectionPool } from '../js/modules/seeding/dederan-manager.js';
import { validateSelectionTransactionAgainstSource } from '../js/modules/selection/selection-manager.js';
import { approveVerification, evaluateRecordConsistency, getActionableRecordsForAsb, VERIFICATION_STATUS } from '../js/modules/verification/verification-manager.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('====================================================');
console.log('STARTING TESTS: NURSERY DOCUMENT DEPENDENCY RECONCILIATION');
console.log('====================================================\n');

// 1. In-memory Mock Storage Setup
const mockDb = {};
storage.get = (key, fallback = null) => {
  return mockDb[key] !== undefined ? JSON.parse(JSON.stringify(mockDb[key])) : fallback;
};
storage.set = (key, val) => {
  mockDb[key] = JSON.parse(JSON.stringify(val));
};

const userAsb = {
  userId: 'USR-ASB-01',
  name: 'Budi Santoso',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

const userMantri = {
  userId: 'USR-MNT-01',
  name: 'Wagiman',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

// ==========================================
// TEST 1: Idempotent Sync on AVAILABLE Selection Pool
// ==========================================
console.log('--- TEST 1: Selection Pool AVAILABLE Idempotency ---');
mockDb['selection_pool'] = [];

const inspectionTx1 = {
  id: 'DED-INS-001',
  docNo: '2026/INS/DED/001',
  dederanTxDocNo: '2026/DED/001',
  bedenganCode: 'BDG-01',
  estateId: 'EST-01',
  divisionId: 'DIV-01',
  jumlahDiperiksa: 500,
  jumlahBerhasil: 450,
  jumlahTidakBerhasil: 50
};

// Initial sync -> 50
integrateDederanRejectionToSelectionPool(inspectionTx1, 50);
let pool = storage.get('selection_pool', []);
assert(pool.length === 1, 'Pool contains exactly 1 item after first sync');
assert(pool[0].jumlahAfkir === 50 && pool[0].quantity === 50, 'Pool item quantity is 50');

// Repeated sync with same payload -> Still 1 item with 50 (Idempotent)
integrateDederanRejectionToSelectionPool(inspectionTx1, 50);
pool = storage.get('selection_pool', []);
assert(pool.length === 1, 'Pool still contains exactly 1 item after second identical sync (No duplicates)');
assert(pool[0].jumlahAfkir === 50, 'Pool quantity remains 50');

// Revised sync (correction from 50 to 20) -> In-place update to 20
integrateDederanRejectionToSelectionPool(inspectionTx1, 20);
pool = storage.get('selection_pool', []);
assert(pool.length === 1, 'Pool still has exactly 1 item after correction to 20');
assert(pool[0].jumlahAfkir === 20 && pool[0].quantity === 20, 'Pool quantity updated in-place to 20');

// Revised sync to 0 -> Cleanly removed or zeroed out
integrateDederanRejectionToSelectionPool(inspectionTx1, 0);
pool = storage.get('selection_pool', []);
assert(pool.length === 0 || pool[0].quantity === 0, 'Pool item cleaned up when quantity revised to 0');


// ==========================================
// TEST 2: Preservation of CLAIMED Selection Items
// ==========================================
console.log('\n--- TEST 2: CLAIMED Selection Items Preservation ---');
mockDb['selection_pool'] = [
  {
    id: 'SEL-POOL-DED-2026/DED/001',
    docNo: '2026/CULL/001',
    originType: 'REJECT_DEDERAN',
    sourceModule: 'DEDERAN',
    sourceDocNo: '2026/INS/DED/001',
    dederanDocNo: '2026/DED/001',
    jumlahAfkir: 50,
    quantity: 50,
    status: 'CLAIMED',
    selectionTransactionId: 'TX-SEL-001'
  }
];

// Inspection corrected to 0 while pool is CLAIMED -> Must NOT be deleted from pool
integrateDederanRejectionToSelectionPool(inspectionTx1, 0);
pool = storage.get('selection_pool', []);
assert(pool.length === 1, 'CLAIMED pool item is NOT deleted when quantity revised to 0');
assert(pool[0].selectionTransactionId === 'TX-SEL-001', 'Transaction claim link is preserved');


// ==========================================
// TEST 3: Stale Selection Transaction Validation & Approval Prevention
// ==========================================
console.log('\n--- TEST 3: Stale Selection Transaction Validation & Zero Stock Mutation ---');
mockDb['dederan_inspections'] = [
  {
    id: 'DED-INS-001',
    docNo: '2026/INS/DED/001',
    dederanTxDocNo: '2026/DED/001',
    jumlahDiperiksa: 500,
    jumlahBerhasil: 480,
    jumlahTidakBerhasil: 20 // Source was corrected from 50 to 20
  }
];

const staleSelectionTx = {
  id: 'SEL-TX-001',
  docNo: '2026/SEL/001',
  selectionStage: 'SELEKSI_PRA_SEMAI',
  sourceModule: 'DEDERAN',
  sourceDocNo: '2026/INS/DED/001',
  dederanTxDocNo: '2026/DED/001',
  estateId: 'EST-01',
  divisionId: 'DIV-01',
  jumlahAfkirTotal: 50, // Stale! Claims 50 while source only has 20
  status: 'DIAJUKAN',
  stockMutated: false
};
mockDb['selection_transactions'] = [staleSelectionTx];
mockDb['verification_transactions'] = [
  {
    referenceType: 'SELECTION',
    referenceId: 'SEL-TX-001',
    referenceDocNo: '2026/SEL/001',
    estateId: 'EST-01',
    divisionId: 'DIV-01',
    verificationStatus: 'MENUNGGU_VERIFIKASI'
  }
];

// Validation helper check
const validationResult = validateSelectionTransactionAgainstSource(staleSelectionTx);
assert(validationResult.isValid === false, 'Stale selection transaction detected as invalid');
assert(validationResult.declaredQuantity === 50 && validationResult.latestSourceQuantity === 20, 'Identifies declared 50 > latest source 20');

// Consistency evaluation check
const evalConsistency = evaluateRecordConsistency('SELECTION', staleSelectionTx);
assert(evalConsistency.canApprove === false, 'Consistency Gate blocks approval of stale selection transaction');
assert(evalConsistency.errors.some(e => e.type === 'STALE_SOURCE_QUANTITY'), 'Error STALE_SOURCE_QUANTITY is present');

// Stock safety check: Attempting approval must fail and NOT mutate stock
let approvalThrew = false;
try {
  approveVerification({
    referenceType: 'SELECTION',
    referenceId: 'SEL-TX-001',
    notes: 'Approval attempt on stale doc',
    currentUser: userAsb
  });
} catch (err) {
  approvalThrew = true;
  assert(err.message.includes('Verifikasi diblokir oleh Konsistensi Gate'), 'Approval throws Consistency Gate error');
}
assert(approvalThrew === true, 'approveVerification was strictly halted');

// Verify stock integrity: selection transaction was NOT marked DISETUJUI, stockMutated remains false
const verifySelTx = storage.get('selection_transactions', [])[0];
assert(verifySelTx.status !== 'DISETUJUI', 'Stale transaction status was not changed to DISETUJUI');
assert(verifySelTx.stockMutated === false, 'Zero stock mutation confirmed: stockMutated remains false');


// ==========================================
// TEST 4: Normal Valid Transaction Approval Flow
// ==========================================
console.log('\n--- TEST 4: Normal Valid Transaction Approval Flow ---');
const validSelectionTx = {
  id: 'SEL-TX-002',
  docNo: '2026/SEL/002',
  selectionStage: 'SELEKSI_PRA_SEMAI',
  sourceModule: 'DEDERAN',
  sourceDocNo: '2026/INS/DED/001',
  dederanTxDocNo: '2026/DED/001',
  estateId: 'EST-01',
  divisionId: 'DIV-01',
  jumlahAfkirTotal: 20, // Valid matches 20!
  status: 'DIAJUKAN',
  stockMutated: false,
  _storeKey: 'selection_transactions'
};
mockDb['selection_transactions'] = [validSelectionTx];
mockDb['verification_transactions'] = [
  {
    referenceType: 'SELECTION',
    referenceId: 'SEL-TX-002',
    referenceDocNo: '2026/SEL/002',
    estateId: 'EST-01',
    divisionId: 'DIV-01',
    verificationStatus: 'MENUNGGU_VERIFIKASI'
  }
];

const validEval = evaluateRecordConsistency('SELECTION', validSelectionTx);
assert(validEval.canApprove === true, 'Valid transaction passes Consistency Gate');

const approvedAudit = approveVerification({
  referenceType: 'SELECTION',
  referenceId: 'SEL-TX-002',
  notes: 'Approved successfully',
  currentUser: userAsb
});
assert(approvedAudit.verificationStatus === VERIFICATION_STATUS.TERVERIFIKASI, 'Audit record created with TERVERIFIKASI status');
const postApprovedTx = storage.get('selection_transactions', [])[0];
assert(postApprovedTx.status === 'DISETUJUI', 'Transaction status updated to DISETUJUI on valid approval');


// ==========================================
// TEST 5: Source Editability Guard (Metadata vs Quantity)
// ==========================================
console.log('\n--- TEST 5: Source Editability Guard ---');
mockDb['seeding_transactions'] = [
  {
    id: 'SOW-001',
    docNo: '2026/SOW/001',
    dederanTxDocNo: '2026/DED/001',
    jumlahBibitDipindahkan: 300,
    status: 'DISETUJUI'
  }
];

// Metadata update only (notes/operator) on Dederan 2026/DED/001 -> ALWAYS ALLOWED
const metaEdit = validateSourceEditability('DEDERAN', '2026/DED/001', {
  catatan: 'Koreksi keterangan bedengan basah'
});
assert(metaEdit.allowed === true, 'Metadata-only correction is not blocked');

// Quantity update >= 300 (e.g. 400) -> ALLOWED (400 >= 300 approved downstream)
const safeQtyEdit = validateSourceEditability('DEDERAN', '2026/DED/001', {
  jumlahDeder: 400
});
assert(safeQtyEdit.allowed === true, 'Quantity reduction above approved downstream is allowed');

// Quantity update < 300 (e.g. 250) -> BLOCKED (250 < 300 approved downstream)
const illegalQtyEdit = validateSourceEditability('DEDERAN', '2026/DED/001', {
  jumlahDeder: 250
});
assert(illegalQtyEdit.allowed === false, 'Quantity reduction below approved downstream is strictly blocked');
assert(illegalQtyEdit.blockingDocNo === '2026/SOW/001', 'Identifies 2026/SOW/001 as the blocking document');


// ==========================================
// TEST 6: RECEIPT Source Editability Guard
// ==========================================
console.log('\n--- TEST 6: RECEIPT Source Editability Guard ---');
mockDb['dederan_induk_documents'] = [
  {
    id: 'DED-IND-001',
    docNo: '2026/IND/DED/001',
    sourceReceiptDocNo: '2026/APR/001',
    totalDiterima: 1000,
    totalDidederSDHI: 600
  }
];

// Receipt reduction above 600 (e.g. 700) -> ALLOWED
const receiptSafeEdit = validateSourceEditability('RECEIPT', '2026/APR/001', {
  diterima: 700
});
assert(receiptSafeEdit.allowed === true, 'Receipt reduction above committed Deder is allowed');

// Receipt reduction below 600 (e.g. 500) -> BLOCKED
const receiptIllegalEdit = validateSourceEditability('RECEIPT', '2026/APR/001', {
  diterima: 500
});
assert(receiptIllegalEdit.allowed === false, 'Receipt reduction below committed Deder is strictly blocked');
assert(receiptIllegalEdit.blockingDocNo === '2026/IND/DED/001', 'Identifies 2026/IND/DED/001 as blocking document');


// ==========================================
// TEST 7: SEEDING Source Editability Guard
// ==========================================
console.log('\n--- TEST 7: SEEDING Source Editability Guard ---');
mockDb['pre_grafting_selection_documents'] = [
  {
    id: 'SEL-001',
    docNo: '2026/SEL/001',
    sourceSeedingDocNo: '2026/SOW/001',
    jumlahAfkirTotal: 150,
    status: 'DISETUJUI'
  }
];

// Seeding reduction above 150 (e.g. 200) -> ALLOWED
const seedingSafeEdit = validateSourceEditability('SEEDING', '2026/SOW/001', {
  jumlahBibitDipindahkan: 200
});
assert(seedingSafeEdit.allowed === true, 'Seeding reduction above approved downstream selection is allowed');

// Seeding reduction below 150 (e.g. 100) -> BLOCKED
const seedingIllegalEdit = validateSourceEditability('SEEDING', '2026/SOW/001', {
  jumlahBibitDipindahkan: 100
});
assert(seedingIllegalEdit.allowed === false, 'Seeding reduction below approved downstream selection is strictly blocked');
assert(seedingIllegalEdit.blockingDocNo === '2026/SEL/001', 'Identifies 2026/SEL/001 as blocking document');


// ==========================================
// TEST 8: BUDDING Source Editability Guard
// ==========================================
console.log('\n--- TEST 8: BUDDING Source Editability Guard ---');
mockDb['inspection_transactions'] = [
  {
    id: 'INS-OKU-001',
    docNo: '2026/INS/OKU/001',
    buddingDocNo: '2026/GRF/001',
    jumlahDiperiksa: 400,
    status: 'DISETUJUI'
  }
];

// Budding reduction above 400 (e.g. 450) -> ALLOWED
const buddingSafeEdit = validateSourceEditability('BUDDING', '2026/GRF/001', {
  jumlahOkulasi: 450
});
assert(buddingSafeEdit.allowed === true, 'Budding reduction above approved inspection is allowed');

// Budding reduction below 400 (e.g. 350) -> BLOCKED
const buddingIllegalEdit = validateSourceEditability('BUDDING', '2026/GRF/001', {
  jumlahOkulasi: 350
});
assert(buddingIllegalEdit.allowed === false, 'Budding reduction below approved inspection is strictly blocked');
assert(buddingIllegalEdit.blockingDocNo === '2026/INS/OKU/001', 'Identifies 2026/INS/OKU/001 as blocking document');


// ==========================================
// TEST 9: OKULASI_JANDA Regrafting Pool Consistency Gate
// ==========================================
console.log('\n--- TEST 9: OKULASI_JANDA Regrafting Pool Consistency Gate ---');
mockDb['regrafting_pool'] = [
  {
    id: 'RGF-POOL-001',
    docNo: '2026/RGF-POOL/001',
    inspectionDocNo: '2026/INS/OKU/001',
    batchNo: 'B-001',
    availableQty: 50,
    quantity: 50
  }
];

const staleRegraftingTx = {
  id: 'RGRF-001',
  docNo: '2026/RGRF/001',
  type: 'REGRAFTING',
  isRegrafting: true,
  sourceInspectionDocNo: '2026/INS/OKU/001',
  batchNo: 'B-001',
  jumlahOkulasi: 80, // Over-quota: 80 > 50!
  status: 'MENUNGGU_VERIFIKASI_MANTRI',
  stockMutated: false,
  _storeKey: 'budding_transactions'
};

const regraftEval = evaluateRecordConsistency('BUDDING', staleRegraftingTx);
assert(regraftEval.canApprove === false, 'Consistency Gate blocks over-quota Regrafting transaction');
assert(regraftEval.errors.some(e => e.type === 'STALE_POOL_QUANTITY'), 'Error STALE_POOL_QUANTITY is present for over-quota Regrafting');


// ==========================================
// SUMMARY
// ==========================================
console.log('\n====================================================');
console.log(`TEST SUITE FINISHED: ${passed} / ${total} ASSERTIONS PASSED`);
console.log('====================================================\n');
