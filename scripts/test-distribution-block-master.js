/**
 * scripts/test-distribution-block-master.js
 * Test Suite: Master Block Integration in Permintaan Bibit Kebun Sendiri (distributionItems)
 *
 * Covers:
 * A. Master Block canonical data contract (BLOCK_MASTER, active blocks)
 * B. Strict Division/Estate Scoping for Requesters (No cross-division leakage)
 * C. Kebun Sendiri Form Submission & multi-row distributionItems persistence
 * D. Duplicate Klon + Block validation
 * E. Total Qty aggregation and backward compatibility fields (klon, qty, requestedQty)
 * F. Full Workflow transitions persistence (Askep -> Pengurus -> ASB -> Dispatch -> ASB Verif -> Receipt -> Selesai)
 * G. Target Estate/Division strictly null isolation
 */

if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; }
  };
  global.localStorage = globalThis.localStorage;
}

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({
        fillRect: () => {},
        fillText: () => {}
      }),
      toDataURL: () => 'data:image/jpeg;base64,mockCanvasData'
    }),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  };
  global.document = globalThis.document;
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    addEventListener: () => {},
    localStorage: globalThis.localStorage
  };
  global.window = globalThis.window;
}

import { storage } from '../js/core/storage.js';
import { ROLES } from '../js/core/user-context.js';
import {
  canCreateRequestKebunSendiri,
  submitRequestKebunSendiri,
  getScopedBlocksForRequester
} from '../js/modules/request/request-kebun-sendiri-form.js';
import {
  updateWorkflowStatus
} from '../js/modules/request/request-kebun-sendiri-landing.js';
import {
  BLOCK_MASTER,
  BLOCK_STATUS,
  getBlocksByDivision,
  getBlocksByEstate,
  getBlockById,
  getBlockByCode,
  resolveBlock
} from '../js/data/block-master.js';
import { cleanAllTransactionalData } from '../js/core/storage-registry.js';

let passed = 0;
let failed = 0;
const failedTests = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${message}`);
    failedTests.push(message);
    failed++;
  }
}

console.log('================================================================================');
console.log('🧪 TEST SUITE: MASTER BLOCK INTEGRATION & DISTRIBUTION ITEMS (KEBUN_SENDIRI)');
console.log('================================================================================\n');

// Reset storage
cleanAllTransactionalData({ skipIndexedDB: true });

// -----------------------------------------------------------------------------
// SECTION A: MASTER BLOCK CANONICAL DATA CONTRACT
// -----------------------------------------------------------------------------
console.log('📋 SECTION A: MASTER BLOCK CANONICAL CONTRACT');

assert(Array.isArray(BLOCK_MASTER) && BLOCK_MASTER.length === 40, 'BLOCK_MASTER contains exactly 40 canonical records');

const blk001 = getBlockById('BLK-001');
assert(blk001 !== null && blk001.blockCode === '001/91' && blk001.divisionCode === 'DIV-001', 'getBlockById("BLK-001") returns canonical record');

const blkByCode = getBlockByCode('001/91');
assert(blkByCode !== null && blkByCode.id === 'BLK-001', 'getBlockByCode("001/91") returns canonical record');

const resolved = resolveBlock('Block 001/91');
assert(resolved !== null && resolved.id === 'BLK-001', 'resolveBlock("Block 001/91") resolves accurately');

// -----------------------------------------------------------------------------
// SECTION B: STRICT SCOPING ENFORCEMENT
// -----------------------------------------------------------------------------
console.log('\n📋 SECTION B: STRICT SCOPING ENFORCEMENT');

const userDiv1 = { role: 'ASISTEN', name: 'Asisten Divisi 1', estateId: 'EST-TBS', divisionId: 'DIV-001' };
const blocksDiv1 = getScopedBlocksForRequester(userDiv1);
assert(blocksDiv1.length === 10, 'Division 1 requester receives exactly 10 blocks');
assert(blocksDiv1.every(b => b.divisionCode === 'DIV-001'), 'All blocks for Division 1 requester strictly belong to DIV-001');

const userDiv2 = { role: 'ASISTEN', name: 'Asisten Divisi 2', estateId: 'EST-TBS', divisionId: 'DIV-002' };
const blocksDiv2 = getScopedBlocksForRequester(userDiv2);
assert(blocksDiv2.length === 10, 'Division 2 requester receives exactly 10 blocks');
assert(blocksDiv2.every(b => b.divisionCode === 'DIV-002'), 'All blocks for Division 2 requester strictly belong to DIV-002');
assert(!blocksDiv1.some(b1 => blocksDiv2.some(b2 => b1.id === b2.id)), 'No overlap/leakage between Division 1 and Division 2 blocks');

// Scope for Asisten Bibitan (Nursery pusat - no division assigned)
const userAsb = { role: 'ASISTEN_BIBITAN', name: 'Asisten Bibitan TBS', estateId: 'EST-TBS' };
const blocksAsb = getScopedBlocksForRequester(userAsb);
assert(blocksAsb.length === 20, 'Asisten Bibitan with estate-wide scope receives all 20 blocks of EST-TBS');

// -----------------------------------------------------------------------------
// SECTION C: KEBUN SENDIRI SUBMISSION WITH MULTI-ROW DISTRIBUTION ITEMS
// -----------------------------------------------------------------------------
console.log('\n📋 SECTION C: SUBMISSION WITH MULTI-ROW DISTRIBUTION ITEMS');

const submitPayload = {
  docNo: 'REQ-KSB-2026-001',
  user: userDiv1,
  programId: 'PRG-2026-001',
  programName: 'Program Nursery 2026 - Batch 1',
  allocationCode: 'CFNA-001',
  category: 'Seedlings',
  growthStage: 'Rubber Main Nursery',
  requiredDate: '2026-10-15',
  distributionItems: [
    { cloneId: 'IRCA 19', blockId: 'BLK-001', blockCode: '001/91', blockName: 'Block 001/91', qty: 2000 },
    { cloneId: 'IRCA 19', blockId: 'BLK-002', blockCode: '002/87', blockName: 'Block 002/87', qty: 1500 },
    { cloneId: 'PB 260', blockId: 'BLK-003', blockCode: '003/92', blockName: 'Block 003/92', qty: 1000 }
  ]
};

let createdRecord = null;
try {
  createdRecord = await submitRequestKebunSendiri(submitPayload);
  assert(createdRecord !== null, 'submitRequestKebunSendiri successfully created record');
} catch (err) {
  assert(false, `submitRequestKebunSendiri threw error: ${err.message}`);
}

if (createdRecord) {
  assert(Array.isArray(createdRecord.distributionItems), 'createdRecord.distributionItems is an array');
  assert(createdRecord.distributionItems.length === 3, 'createdRecord.distributionItems contains 3 rows');
  assert(createdRecord.distributionItems[0].blockId === 'BLK-001' && createdRecord.distributionItems[0].qty === 2000, 'Row 0: BLK-001 qty 2000');
  assert(createdRecord.distributionItems[1].blockId === 'BLK-002' && createdRecord.distributionItems[1].qty === 1500, 'Row 1: BLK-002 qty 1500');
  assert(createdRecord.distributionItems[2].blockId === 'BLK-003' && createdRecord.distributionItems[2].qty === 1000, 'Row 2: BLK-003 qty 1000');

  // Total qty calculation
  assert(createdRecord.qty === 4500, 'createdRecord.qty is SUM(2000 + 1500 + 1000) = 4500');
  assert(createdRecord.requestedQty === 4500, 'createdRecord.requestedQty = 4500');
  assert(createdRecord.approvedQty === 4500, 'createdRecord.approvedQty = 4500');
  assert(createdRecord.klon === 'IRCA 19', 'createdRecord.klon has primary clone');

  // Isolation check
  assert(createdRecord.targetEstateId === null, 'createdRecord.targetEstateId is strictly null');
  assert(createdRecord.targetDivisionId === null, 'createdRecord.targetDivisionId is strictly null');
}

// -----------------------------------------------------------------------------
// SECTION D: EMPTY DISTRIBUTION ITEMS VALIDATION
// -----------------------------------------------------------------------------
console.log('\n📋 SECTION D: EMPTY DISTRIBUTION ITEMS VALIDATION');

let emptySubmitFailed = false;
try {
  await submitRequestKebunSendiri({
    ...submitPayload,
    docNo: 'REQ-KSB-EMPTY',
    distributionItems: []
  });
} catch (err) {
  emptySubmitFailed = true;
}
assert(emptySubmitFailed, 'Submission with empty distributionItems is rejected with error');

// -----------------------------------------------------------------------------
// SECTION E: WORKFLOW TRANSITIONS PRESERVE DISTRIBUTION ITEMS
// -----------------------------------------------------------------------------
console.log('\n📋 SECTION E: WORKFLOW TRANSITIONS PRESERVE DISTRIBUTION ITEMS');

let tx = { ...createdRecord };

// 1. Askep Review
const userAskep = { role: 'ASKEP', name: 'Askep TBS', estateId: 'EST-TBS' };
tx = await updateWorkflowStatus(tx, 'MENUNGGU_VERIFIKASI_PENGURUS', {
  event: 'ASKEP_REVIEW',
  actor: userAskep,
  note: 'Disetujui Askep'
});
assert(tx.status === 'MENUNGGU_VERIFIKASI_PENGURUS', 'Workflow advanced to MENUNGGU_VERIFIKASI_PENGURUS');
assert(Array.isArray(tx.distributionItems) && tx.distributionItems.length === 3, 'distributionItems preserved after Askep review');
assert(tx.distributionItems[0].blockId === 'BLK-001', 'Row 0 blockId intact after Askep review');

// 2. Pengurus Approval
const userPengurus = { role: 'PENGURUS', name: 'Pengurus TBS', estateId: 'EST-TBS' };
tx = await updateWorkflowStatus(tx, 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN', {
  event: 'PENGURUS_APPROVAL',
  actor: userPengurus,
  note: 'Disetujui Pengurus'
});
assert(tx.status === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN', 'Workflow advanced to MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN');
assert(Array.isArray(tx.distributionItems) && tx.distributionItems.length === 3, 'distributionItems preserved after Pengurus approval');

// 3. ASB Verification
tx = await updateWorkflowStatus(tx, 'TERVERIFIKASI', {
  event: 'ASB_VERIFICATION',
  actor: userAsb,
  fulfillmentAssistantUserId: 'AST_ASB_01',
  fulfillmentAssistantName: 'Asisten Bibitan TBS',
  note: 'Stok bibit nursery tersedia dan siap dikeluarkan'
});
assert(tx.status === 'TERVERIFIKASI', 'Workflow advanced to TERVERIFIKASI');
assert(Array.isArray(tx.distributionItems) && tx.distributionItems.length === 3, 'distributionItems preserved after ASB verification');

// 4. Mantri Dispatch
const userMantri = { role: 'MANTRI_BIBITAN', name: 'Mantri Bibitan', estateId: 'EST-TBS' };
tx = await updateWorkflowStatus(tx, 'MENUNGGU_VERIFIKASI_PENGELUARAN', {
  event: 'MANTRI_DISPATCH',
  actor: userMantri,
  dispatchData: {
    dispatchDocNo: 'DSP-2026-001',
    issuedQty: 4500
  },
  note: 'Bibit telah dimuat ke armada'
});
assert(tx.status === 'MENUNGGU_VERIFIKASI_PENGELUARAN', 'Workflow advanced to MENUNGGU_VERIFIKASI_PENGELUARAN');
assert(Array.isArray(tx.distributionItems) && tx.distributionItems.length === 3, 'distributionItems preserved after Mantri dispatch');

// 5. ASB Dispatch Verification
tx = await updateWorkflowStatus(tx, 'MENUNGGU_PENERIMAAN', {
  event: 'ASB_DISPATCH_VERIFICATION',
  actor: userAsb,
  dispatchVerification: {
    verifiedQty: 4500,
    verifiedBy: 'AST_ASB_01'
  },
  note: 'Fisik pengeluaran diverifikasi ASB'
});
assert(tx.status === 'MENUNGGU_PENERIMAAN', 'Workflow advanced to MENUNGGU_PENERIMAAN');
assert(Array.isArray(tx.distributionItems) && tx.distributionItems.length === 3, 'distributionItems preserved after ASB dispatch verification');

// 6. Requester Receipt
tx = await updateWorkflowStatus(tx, 'SELESAI', {
  event: 'REQUESTER_RECEIPT',
  actor: userDiv1,
  receiptData: {
    layakQty: 4450,
    rusakQty: 50,
    totalQty: 4500,
    photoUrl: 'data:image/jpeg;base64,mockReceiptPhoto',
    captureSource: 'CAMERA'
  },
  note: 'Bibit diterima di Divisi 1'
});
assert(tx.status === 'SELESAI', 'Workflow completed with status SELESAI');
assert(Array.isArray(tx.distributionItems) && tx.distributionItems.length === 3, 'distributionItems preserved in final SELESAI transaction');
assert(tx.distributionItems[1].blockCode === '002/87' && tx.distributionItems[1].qty === 1500, 'Row 1 BLK-002 (002/87) qty 1500 fully intact');

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================================');
console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
console.log('================================================================================');

if (failed > 0) {
  console.error('\n❌ FAILED TESTS:');
  failedTests.forEach(t => console.error(`  - ${t}`));
  process.exit(1);
} else {
  console.log('\n🎉 ALL MASTER BLOCK DISTRIBUTION INTEGRATION TESTS PASSED PERFECTLY!\n');
  process.exit(0);
}
