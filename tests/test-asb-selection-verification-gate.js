/**
 * tests/test-asb-selection-verification-gate.js
 * Integration test for ASB Verification Gate based on Selection Inspection completion.
 */

// Mock localStorage
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import { storage } from '../js/core/storage.js';
import { ROLES } from '../js/core/user-context.js';
import {
  checkAsbSelectionGate,
  canSubmitFinalVerificationToServer,
  approveVerification
} from '../js/modules/verification/verification-manager.js';
import {
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY,
  SELECTION_STORAGE_KEY
} from '../js/modules/selection/selection-manager.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('====================================================');
console.log('STARTING TESTS: ASB SELECTION VERIFICATION GATE');
console.log('====================================================');

const asbUser = {
  id: 'ASB_01',
  userId: 'ASB_01',
  name: 'Budi Santoso',
  role: ROLES.ASISTEN_BIBITAN,
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-001',
  divisionName: 'Tanah Besih - Divisi I'
};

const mantriUser = {
  id: 'MTR_01',
  userId: 'MTR_01',
  name: 'Wagiman',
  role: ROLES.MANTRI_TANAMAN,
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-001',
  divisionName: 'Tanah Besih - Divisi I'
};

// 1. Setup: ASB with 1 pending pre-grafting selection document
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [
  {
    id: 'DOC-SEL-001',
    docNo: '2026/SEL/001',
    programCode: 'PRG-01',
    selectionStage: 'SELEKSI_I',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Tanah Besih - Divisi I',
    status: 'MENUNGGU_ASISTEN',
    totalBibit: 1000,
    afkirCount: 50,
    rows: []
  }
]);
storage.set(SELECTION_STORAGE_KEY, []);

// Test 1: Gate detects pending selection document
const gate1 = checkAsbSelectionGate(asbUser);
assert(gate1.isGated === true, 'Gate is active when ASB has pending selection document');
assert(gate1.pendingSelectionCount === 1, 'Gate reports exact pending count (1)');

// Test 2: Verification final submit is blocked
const canSubmit1 = canSubmitFinalVerificationToServer(asbUser);
assert(canSubmit1 === false, 'canSubmitFinalVerificationToServer returns false when gated');

// Test 3: approveVerification throws when gated
try {
  approveVerification({
    referenceType: 'RECEIPT',
    referenceId: 'REC-001',
    currentUser: asbUser
  });
  assert(false, 'approveVerification should throw error when ASB is gated');
} catch (err) {
  assert(err.message.includes('Verifikasi diblokir: Harap selesaikan'), 'approveVerification throws gate requirement error');
}

// Test 4: Non-ASB user is not blocked
const gateMantri = checkAsbSelectionGate(mantriUser);
assert(gateMantri.isGated === false, 'Non-ASB user is not blocked by ASB selection gate');

// Test 5: Multiple pending items (pre-grafting + post-grafting)
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [
  {
    id: 'DOC-SEL-001',
    docNo: '2026/SEL/001',
    programCode: 'PRG-01',
    selectionStage: 'SELEKSI_I',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Tanah Besih - Divisi I',
    status: 'DIAJUKAN',
    totalBibit: 1000,
    afkirCount: 50,
    rows: []
  },
  {
    id: 'DOC-SEL-002',
    docNo: '2026/SEL/002',
    programCode: 'PRG-01',
    selectionStage: 'SELEKSI_II',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Tanah Besih - Divisi I',
    status: 'DIAJUKAN',
    totalBibit: 950,
    afkirCount: 20,
    rows: []
  }
]);

const gateMulti = checkAsbSelectionGate(asbUser);
assert(gateMulti.isGated === true, 'Gate is active with multiple pending documents');
assert(gateMulti.pendingSelectionCount === 2, 'Gate reports count of 2 pending documents');

// Test 6: Approving all selection documents resolves the gate
storage.set(PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY, [
  {
    id: 'DOC-SEL-001',
    docNo: '2026/SEL/001',
    programCode: 'PRG-01',
    selectionStage: 'SELEKSI_I',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Tanah Besih - Divisi I',
    status: 'DISETUJUI',
    totalBibit: 1000,
    afkirCount: 50,
    rows: []
  },
  {
    id: 'DOC-SEL-002',
    docNo: '2026/SEL/002',
    programCode: 'PRG-01',
    selectionStage: 'SELEKSI_II',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Tanah Besih - Divisi I',
    status: 'DISETUJUI',
    totalBibit: 950,
    afkirCount: 20,
    rows: []
  }
]);

const gate2 = checkAsbSelectionGate(asbUser);
assert(gate2.isGated === false, 'Gate unlocks when all selection documents are DISETUJUI');
assert(gate2.pendingSelectionCount === 0, 'Pending selection count is 0');

console.log('====================================================');
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
}
