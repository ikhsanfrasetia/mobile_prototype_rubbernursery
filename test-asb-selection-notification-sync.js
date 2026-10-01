/**
 * test-asb-selection-notification-sync.js
 * Integration Test Suite for Asisten Bibitan Selection Notification Dot vs Waiting List Synchronization
 * 
 * Test Cases:
 * IT-ASB-SEL-NOTIF-001: MENUNGGU_VERIFIKASI -> Dot ON
 * IT-ASB-SEL-NOTIF-002: MENUNGGU_VERIFIKASI -> tampil di Waiting List
 * IT-ASB-SEL-NOTIF-003: Post-Grafting pending -> Dot ON + tampil
 * IT-ASB-SEL-NOTIF-004: DISETUJUI -> Dot OFF + tidak di Waiting
 * IT-ASB-SEL-NOTIF-005: DIKEMBALIKAN -> Riwayat + tidak memicu Dot
 * IT-ASB-SEL-NOTIF-006: Estate berbeda -> tidak muncul
 * IT-ASB-SEL-NOTIF-007: Division berbeda -> tidak muncul
 * IT-ASB-SEL-NOTIF-008: Role berbeda -> tidak muncul
 * IT-ASB-SEL-NOTIF-009: Notification count === Waiting List count
 * IT-ASB-SEL-NOTIF-010: Refresh tetap konsisten
 */

import assert from 'assert';
import { storage } from './js/core/storage.js';
import {
  SELECTION_STATUS,
  SELECTION_STAGES,
  SELECTION_TYPES,
  SELECTION_STORAGE_KEY,
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  getActionableSelectionCount,
  hasActionableSelection,
  canPerformAsistenSelectionAction,
  filterSelectionByScope,
  getPreGraftingSelectionDocuments
} from './js/modules/selection/selection-manager.js';

// Mock localStorage for Node environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

const asbUser = {
  id: 'USR-ASB-01',
  userId: 'USR-ASB-01',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

const otherEstateAsb = {
  id: 'USR-ASB-02',
  userId: 'USR-ASB-02',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-OTHER',
  divisionId: 'DIV-001'
};

const otherDivAsb = {
  id: 'USR-ASB-03',
  userId: 'USR-ASB-03',
  role: 'ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-999'
};

const mantriUser = {
  id: 'USR-MTR-01',
  userId: 'USR-MTR-01',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

function resetStorage() {
  localStorage.clear();
}

/**
 * Helper to compute waiting list & history partitions exactly as in selection-landing.js
 */
function getWorkspacePartitions(currentUser) {
  const allPreDocs = getPreGraftingSelectionDocuments({}, currentUser);
  const pendingPreDocs = allPreDocs.filter(d => canPerformAsistenSelectionAction(d, currentUser));
  const historyPreDocs = allPreDocs.filter(d => {
    const s = (d.status || '').toUpperCase();
    return s === SELECTION_STATUS.DISETUJUI || s === SELECTION_STATUS.DIKEMBALIKAN || s === 'TERVERIFIKASI' || s === 'VERIFIED';
  });

  const allRecords = storage.get(SELECTION_STORAGE_KEY, []);
  const postGraftingRecords = allRecords.filter(r => !r.selectionDocumentId && !r.parentSelectionDocumentId && r.selectionType !== SELECTION_TYPES.PRA_OKULASI && r.selectionStage !== SELECTION_STAGES.SELEKSI_1);
  const scopedPostRecords = filterSelectionByScope(postGraftingRecords, currentUser);

  const pendingPostRecords = scopedPostRecords.filter(r => canPerformAsistenSelectionAction(r, currentUser));
  const historyPostRecords = scopedPostRecords.filter(r => {
    const s = (r.status || '').toUpperCase();
    return s === SELECTION_STATUS.DISETUJUI || s === SELECTION_STATUS.DIKEMBALIKAN || s === 'DECLARED_CULLED' || s === 'TERVERIFIKASI' || s === 'VERIFIED';
  });

  const totalPendingCount = pendingPreDocs.length + pendingPostRecords.length;
  const totalHistoryCount = historyPreDocs.length + historyPostRecords.length;

  return {
    pendingPreDocs,
    historyPreDocs,
    pendingPostRecords,
    historyPostRecords,
    totalPendingCount,
    totalHistoryCount
  };
}

console.log('=== STARTING TEST SUITE: ASISTEN BIBITAN SELECTION NOTIFICATION SYNC ===\n');

// -------------------------------------------------------------
// IT-ASB-SEL-NOTIF-001: MENUNGGU_VERIFIKASI -> Dot ON
// -------------------------------------------------------------
resetStorage();
const preDoc1 = {
  id: 'PRE-DOC-001',
  docNo: '2026/SEL1/TBS/001',
  selectionStage: 'SELEKSI_1',
  status: 'MENUNGGU_VERIFIKASI',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001',
  isCompleted: true
};
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [preDoc1]);

const count001 = getActionableSelectionCount(null, asbUser);
const hasDot001 = hasActionableSelection(asbUser);
assert.strictEqual(count001, 1, 'IT-ASB-SEL-NOTIF-001: actionable count must be 1 for MENUNGGU_VERIFIKASI');
assert.strictEqual(hasDot001, true, 'IT-ASB-SEL-NOTIF-001: dot must be ON (true) for MENUNGGU_VERIFIKASI');
console.log('✓ PASS: IT-ASB-SEL-NOTIF-001 (MENUNGGU_VERIFIKASI -> Dot ON)');

// -------------------------------------------------------------
// IT-ASB-SEL-NOTIF-002: MENUNGGU_VERIFIKASI -> tampil di Waiting List
// -------------------------------------------------------------
const ws002 = getWorkspacePartitions(asbUser);
assert.strictEqual(ws002.totalPendingCount, 1, 'IT-ASB-SEL-NOTIF-002: totalPendingCount must be 1');
assert.strictEqual(ws002.pendingPreDocs.length, 1, 'IT-ASB-SEL-NOTIF-002: pendingPreDocs must have 1 document');
assert.strictEqual(ws002.pendingPreDocs[0].id, 'PRE-DOC-001', 'IT-ASB-SEL-NOTIF-002: pendingPreDocs must contain PRE-DOC-001');
console.log('✓ PASS: IT-ASB-SEL-NOTIF-002 (MENUNGGU_VERIFIKASI -> tampil di Waiting List)');

// -------------------------------------------------------------
// IT-ASB-SEL-NOTIF-003: Post-Grafting pending -> Dot ON + tampil
// -------------------------------------------------------------
resetStorage();
const postRec1 = {
  id: 'SEL-POST-001',
  docNo: '2026/SELPOS/TBS/001',
  selectionStage: SELECTION_STAGES.PASCA_OKULASI,
  selectionType: 'PASCA_OKULASI',
  status: 'MENUNGGU_VERIFIKASI',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};
storage.set(SELECTION_STORAGE_KEY, [postRec1]);

const count003 = getActionableSelectionCount(null, asbUser);
const hasDot003 = hasActionableSelection(asbUser);
const ws003 = getWorkspacePartitions(asbUser);
assert.strictEqual(count003, 1, 'IT-ASB-SEL-NOTIF-003: post-grafting count must be 1');
assert.strictEqual(hasDot003, true, 'IT-ASB-SEL-NOTIF-003: post-grafting dot must be ON');
assert.strictEqual(ws003.totalPendingCount, 1, 'IT-ASB-SEL-NOTIF-003: totalPendingCount must be 1');
assert.strictEqual(ws003.pendingPostRecords.length, 1, 'IT-ASB-SEL-NOTIF-003: pendingPostRecords must have 1 record');
assert.strictEqual(ws003.pendingPostRecords[0].id, 'SEL-POST-001', 'IT-ASB-SEL-NOTIF-003: record id match');
console.log('✓ PASS: IT-ASB-SEL-NOTIF-003 (Post-Grafting pending -> Dot ON + tampil)');

// -------------------------------------------------------------
// IT-ASB-SEL-NOTIF-004: DISETUJUI -> Dot OFF + tidak di Waiting (masuk Riwayat)
// -------------------------------------------------------------
resetStorage();
const preDocApproved = {
  id: 'PRE-DOC-APP',
  docNo: '2026/SEL1/TBS/002',
  selectionStage: 'SELEKSI_1',
  status: SELECTION_STATUS.DISETUJUI,
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};
const postRecApproved = {
  id: 'SEL-POST-APP',
  docNo: '2026/SELPOS/TBS/002',
  selectionStage: SELECTION_STAGES.PASCA_OKULASI,
  selectionType: 'PASCA_OKULASI',
  status: SELECTION_STATUS.DISETUJUI,
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [preDocApproved]);
storage.set(SELECTION_STORAGE_KEY, [postRecApproved]);

const count004 = getActionableSelectionCount(null, asbUser);
const hasDot004 = hasActionableSelection(asbUser);
const ws004 = getWorkspacePartitions(asbUser);
assert.strictEqual(count004, 0, 'IT-ASB-SEL-NOTIF-004: actionable count must be 0 for DISETUJUI');
assert.strictEqual(hasDot004, false, 'IT-ASB-SEL-NOTIF-004: dot must be OFF for DISETUJUI');
assert.strictEqual(ws004.totalPendingCount, 0, 'IT-ASB-SEL-NOTIF-004: totalPendingCount must be 0');
assert.strictEqual(ws004.totalHistoryCount, 2, 'IT-ASB-SEL-NOTIF-004: totalHistoryCount must be 2');
console.log('✓ PASS: IT-ASB-SEL-NOTIF-004 (DISETUJUI -> Dot OFF + tidak di Waiting)');

// -------------------------------------------------------------
// IT-ASB-SEL-NOTIF-005: DIKEMBALIKAN -> Riwayat + tidak memicu Dot
// -------------------------------------------------------------
resetStorage();
const preDocReturned = {
  id: 'PRE-DOC-RET',
  docNo: '2026/SEL1/TBS/003',
  selectionStage: 'SELEKSI_1',
  status: SELECTION_STATUS.DIKEMBALIKAN,
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [preDocReturned]);

const count005 = getActionableSelectionCount(null, asbUser);
const hasDot005 = hasActionableSelection(asbUser);
const ws005 = getWorkspacePartitions(asbUser);
assert.strictEqual(count005, 0, 'IT-ASB-SEL-NOTIF-005: actionable count must be 0 for DIKEMBALIKAN');
assert.strictEqual(hasDot005, false, 'IT-ASB-SEL-NOTIF-005: dot must be OFF for DIKEMBALIKAN');
assert.strictEqual(ws005.totalPendingCount, 0, 'IT-ASB-SEL-NOTIF-005: totalPendingCount must be 0');
assert.strictEqual(ws005.totalHistoryCount, 1, 'IT-ASB-SEL-NOTIF-005: totalHistoryCount must be 1');
assert.strictEqual(ws005.historyPreDocs[0].id, 'PRE-DOC-RET', 'IT-ASB-SEL-NOTIF-005: historyPreDocs matches');
console.log('✓ PASS: IT-ASB-SEL-NOTIF-005 (DIKEMBALIKAN -> Riwayat + tidak memicu Dot)');

// -------------------------------------------------------------
// IT-ASB-SEL-NOTIF-006: Estate berbeda -> tidak muncul
// -------------------------------------------------------------
resetStorage();
const preDocEstate = {
  id: 'PRE-DOC-EST',
  docNo: '2026/SEL1/TBS/004',
  selectionStage: 'SELEKSI_1',
  status: 'MENUNGGU_VERIFIKASI',
  estateId: 'EST-OTHER',
  divisionId: 'DIV-001'
};
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [preDocEstate]);

const count006 = getActionableSelectionCount(null, asbUser);
const hasDot006 = hasActionableSelection(asbUser);
const ws006 = getWorkspacePartitions(asbUser);
assert.strictEqual(count006, 0, 'IT-ASB-SEL-NOTIF-006: count must be 0 for different estate');
assert.strictEqual(hasDot006, false, 'IT-ASB-SEL-NOTIF-006: dot must be OFF for different estate');
assert.strictEqual(ws006.totalPendingCount, 0, 'IT-ASB-SEL-NOTIF-006: pending count must be 0 for different estate');
console.log('✓ PASS: IT-ASB-SEL-NOTIF-006 (Estate berbeda -> tidak muncul)');

// -------------------------------------------------------------
// IT-ASB-SEL-NOTIF-007: Division berbeda -> tidak muncul
// -------------------------------------------------------------
resetStorage();
const preDocDiv = {
  id: 'PRE-DOC-DIV',
  docNo: '2026/SEL1/TBS/005',
  selectionStage: 'SELEKSI_1',
  status: 'MENUNGGU_VERIFIKASI',
  estateId: 'EST-TBS',
  divisionId: 'DIV-999'
};
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [preDocDiv]);

const count007 = getActionableSelectionCount(null, asbUser);
const hasDot007 = hasActionableSelection(asbUser);
const ws007 = getWorkspacePartitions(asbUser);
assert.strictEqual(count007, 0, 'IT-ASB-SEL-NOTIF-007: count must be 0 for different division');
assert.strictEqual(hasDot007, false, 'IT-ASB-SEL-NOTIF-007: dot must be OFF for different division');
assert.strictEqual(ws007.totalPendingCount, 0, 'IT-ASB-SEL-NOTIF-007: pending count must be 0 for different division');
console.log('✓ PASS: IT-ASB-SEL-NOTIF-007 (Division berbeda -> tidak muncul)');

// -------------------------------------------------------------
// IT-ASB-SEL-NOTIF-008: Role berbeda -> tidak muncul untuk Asisten Bibitan action
// -------------------------------------------------------------
resetStorage();
const preDocRole = {
  id: 'PRE-DOC-ROLE',
  docNo: '2026/SEL1/TBS/006',
  selectionStage: 'SELEKSI_1',
  status: 'MENUNGGU_VERIFIKASI',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [preDocRole]);

const canMantri = canPerformAsistenSelectionAction(preDocRole, mantriUser);
assert.strictEqual(canMantri, false, 'IT-ASB-SEL-NOTIF-008: Mantri cannot perform asisten selection action');
const wsMantri = getWorkspacePartitions(mantriUser);
assert.strictEqual(wsMantri.totalPendingCount, 0, 'IT-ASB-SEL-NOTIF-008: Mantri pending review count is 0');
console.log('✓ PASS: IT-ASB-SEL-NOTIF-008 (Role berbeda -> tidak muncul)');

// -------------------------------------------------------------
// IT-ASB-SEL-NOTIF-009: Notification count === Waiting List count
// -------------------------------------------------------------
resetStorage();
const preDocA = {
  id: 'PRE-DOC-A',
  docNo: '2026/SEL1/TBS/007',
  selectionStage: 'SELEKSI_1',
  status: 'MENUNGGU_VERIFIKASI',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};
const preDocB = {
  id: 'PRE-DOC-B',
  docNo: '2026/SEL2/TBS/008',
  selectionStage: 'SELEKSI_2',
  status: 'DIAJUKAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};
const postRecA = {
  id: 'SEL-POST-A',
  docNo: '2026/SELPOS/TBS/009',
  selectionStage: SELECTION_STAGES.PASCA_OKULASI,
  selectionType: 'PASCA_OKULASI',
  status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};
const postRecB = {
  id: 'SEL-POST-B',
  docNo: '2026/SELPOS/TBS/010',
  selectionStage: SELECTION_STAGES.PASCA_OKULASI,
  selectionType: 'PASCA_OKULASI',
  status: 'PENDING_DECLARATION',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [preDocA, preDocB]);
storage.set(SELECTION_STORAGE_KEY, [postRecA, postRecB]);

const notifCount009 = getActionableSelectionCount(null, asbUser);
const ws009 = getWorkspacePartitions(asbUser);
assert.strictEqual(notifCount009, 4, 'IT-ASB-SEL-NOTIF-009: notification count must be 4');
assert.strictEqual(ws009.totalPendingCount, 4, 'IT-ASB-SEL-NOTIF-009: workspace totalPendingCount must be 4');
assert.strictEqual(notifCount009, ws009.totalPendingCount, 'IT-ASB-SEL-NOTIF-009: Notification count MUST equal Waiting List count');
console.log('✓ PASS: IT-ASB-SEL-NOTIF-009 (Notification count === Waiting List count = 4)');

// -------------------------------------------------------------
// IT-ASB-SEL-NOTIF-010: Refresh / re-evaluate tetap konsisten
// -------------------------------------------------------------
// Simulate 5 consecutive reads/refreshes
for (let i = 1; i <= 5; i++) {
  const c = getActionableSelectionCount(null, asbUser);
  const w = getWorkspacePartitions(asbUser);
  assert.strictEqual(c, w.totalPendingCount, `IT-ASB-SEL-NOTIF-010: Iteration ${i} count sync mismatch`);
  assert.strictEqual(c, 4, `IT-ASB-SEL-NOTIF-010: Iteration ${i} count value mismatch`);
}
console.log('✓ PASS: IT-ASB-SEL-NOTIF-010 (Refresh / re-evaluate tetap konsisten across 5 cycles)');

console.log('\n=== ALL 10 INTEGRATION TESTS PASSED (10/10) ===');
