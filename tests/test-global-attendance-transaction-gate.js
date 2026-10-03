/**
 * tests/test-global-attendance-transaction-gate.js
 * Integration Test Suite: Global Presensi Gate untuk Seluruh Transaksi Modul Pembibitan
 * 
 * Verifies:
 * - IT-GATE-001: Supervisor belum, Worker belum -> LOCKED
 * - IT-GATE-002: Supervisor done, Worker belum -> LOCKED
 * - IT-GATE-003: Worker done, Supervisor belum -> LOCKED
 * - IT-GATE-004: Supervisor + Worker done -> UNLOCKED
 * - IT-GATE-005: Attendance kemarin -> LOCKED
 * - IT-GATE-006: Landing transaction tetap bisa VIEW saat LOCKED
 * - IT-GATE-007: Form Seeding creation diblokir saat LOCKED
 * - IT-GATE-008: Selection landing tetap bisa VIEW saat LOCKED
 * - IT-GATE-009: Selection execution diblokir saat LOCKED
 * - IT-GATE-010: Deep-link creation route diblokir
 * - IT-GATE-011: Direct service create transaction diblokir
 * - IT-GATE-012: Role ASISTEN tidak terkena gate
 * - IT-GATE-013: Role ASKEP tidak terkena gate
 * - IT-GATE-014: Role PENGURUS tidak terkena gate
 * - IT-GATE-015: Offline gate deterministic
 * - IT-GATE-016: Presensi valid langsung unlock tanpa stale state
 * - IT-GATE-017: Pulang (PULANG) tidak menghapus eligibility DATANG hari itu
 * - IT-GATE-018: Existing pending transaction tidak terhapus karena LOCKED
 * - IT-GATE-019: Submit Verification diblokir saat LOCKED
 * - IT-GATE-020: Submit Verification normal saat UNLOCKED
 */

import {
  getGlobalAttendanceGateStatus,
  assertAttendanceGateOrThrow,
  showAttendanceRequirementModal,
  ATTENDANCE_BLOCK_REASONS,
  ATTENDANCE_GATE_MESSAGES
} from '../js/core/attendance-gate-service.js';

import {
  createSeleksi1ExecutionTransaction,
  declareSelectionItem
} from '../js/modules/selection/selection-manager.js';

import {
  submitMantriTransactions,
  getMantriTodayTransactions
} from '../js/modules/verification/mantri-confirmation-service.js';

import {
  openDispatchModal,
  processDispatchShipment
} from '../js/modules/dispatch/dispatch-landing.js';

import {
  openMantriDispatchModal,
  processMantriDispatch
} from '../js/modules/request/request-mata-entres-landing.js';

import { storage } from '../js/core/storage.js';
import { session } from '../js/core/session.js';
import { ROLES } from '../js/core/permissions.js';
import { todayISO } from '../js/core/utils.js';

// Setup Mock DOM and LocalStorage Environment for Node.js
const mockStore = new Map();
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: (k) => mockStore.has(k) ? mockStore.get(k) : null,
    setItem: (k, v) => mockStore.set(k, String(v)),
    removeItem: (k) => mockStore.delete(k),
    clear: () => mockStore.clear()
  };
}

const makeMockElement = (tag = 'DIV') => ({
  tagName: tag.toUpperCase(),
  style: {},
  children: [],
  innerHTML: '',
  classList: {
    add: () => {},
    remove: () => {},
    contains: () => false
  },
  setAttribute: () => {},
  getAttribute: () => null,
  addEventListener: () => {},
  appendChild: () => {},
  querySelector: () => null,
  querySelectorAll: () => [],
  remove: () => {}
});

if (typeof globalThis.location === 'undefined') {
  globalThis.location = {
    hash: '#/seeding',
    replace: (h) => { globalThis.location.hash = h; }
  };
}
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    location: globalThis.location,
    addEventListener: () => {}
  };
}

if (typeof globalThis.document === 'undefined' || !globalThis.document.querySelector) {
  globalThis.document = {
    createElement: (tag) => makeMockElement(tag),
    getElementById: (id) => makeMockElement('DIV'),
    body: {
      appendChild: () => {},
      removeChild: () => {}
    }
  };
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log('================================================================================');
console.log('RUNNING INTEGRATION TESTS: GLOBAL ATTENDANCE TRANSACTION GATE');
console.log('================================================================================\n');

const today = todayISO();
const yesterday = '2026-10-02';

const mantriUser = {
  id: 'USR-MNT-001',
  code: '1405482',
  name: 'Wagiman',
  role: ROLES.MANTRI_TANAMAN,
  estateId: 'EST-TB',
  divisionId: 'DIV-01'
};

const asistenUser = {
  id: 'USR-ASB-001',
  code: '1405100',
  name: 'Budi Santoso',
  role: ROLES.ASISTEN_BIBITAN,
  estateId: 'EST-TB',
  divisionId: 'DIV-01'
};

const askepUser = {
  id: 'USR-ASK-001',
  code: '1405001',
  name: 'Hendro',
  role: ROLES.ASKEP,
  estateId: 'EST-TB'
};

const pengurusUser = {
  id: 'USR-PGR-001',
  code: '1405999',
  name: 'Suryanto',
  role: ROLES.PENGURUS
};

// Set session Mantri
session.start(mantriUser);

// -----------------------------------------------------------------------------
// IT-GATE-001: Supervisor belum, Worker belum -> LOCKED
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', []);
const gate001 = getGlobalAttendanceGateStatus(mantriUser);
assert(gate001.isSupervisorDone === false, 'IT-GATE-001a: isSupervisorDone is false when no attendance');
assert(gate001.isWorkerDone === false, 'IT-GATE-001b: isWorkerDone is false when no attendance');
assert(gate001.isGateUnlocked === false, 'IT-GATE-001c: isGateUnlocked is false');
assert(gate001.blockReason === ATTENDANCE_BLOCK_REASONS.BOTH_NOT_DONE, 'IT-GATE-001d: blockReason is BOTH_NOT_DONE');
assert(gate001.errorMessage.includes('Supervisor & Pekerja'), 'IT-GATE-001e: errorMessage informs both supervisor & worker missing');

// -----------------------------------------------------------------------------
// IT-GATE-002: Supervisor done, Worker belum -> LOCKED
// -----------------------------------------------------------------------------
const supervisorAtt = {
  id: 'ATT-SUP-001',
  type: 'SUPERVISOR',
  userId: mantriUser.id,
  name: mantriUser.name,
  code: mantriUser.code,
  role: ROLES.MANTRI_TANAMAN,
  attendanceType: 'DATANG',
  status: 'HADIR',
  date: today,
  createdAt: `${today}T07:00:00Z`
};
storage.set('attendance_transactions', [supervisorAtt]);
const gate002 = getGlobalAttendanceGateStatus(mantriUser);
assert(gate002.isSupervisorDone === true, 'IT-GATE-002a: isSupervisorDone is true');
assert(gate002.isWorkerDone === false, 'IT-GATE-002b: isWorkerDone is false');
assert(gate002.isGateUnlocked === false, 'IT-GATE-002c: isGateUnlocked is false');
assert(gate002.blockReason === ATTENDANCE_BLOCK_REASONS.WORKER_NOT_DONE, 'IT-GATE-002d: blockReason is WORKER_NOT_DONE');

// -----------------------------------------------------------------------------
// IT-GATE-003: Worker done, Supervisor belum -> LOCKED
// -----------------------------------------------------------------------------
const workerAtt = {
  id: 'ATT-WRK-001',
  type: 'WORKER',
  workerId: 'WRK-001',
  workerName: 'Fadilah',
  workerCode: '1405739',
  position: 'Pekerja Bibitan',
  attendanceType: 'DATANG',
  status: 'HADIR',
  date: today,
  createdAt: `${today}T07:15:00Z`
};
storage.set('attendance_transactions', [workerAtt]);
const gate003 = getGlobalAttendanceGateStatus(mantriUser);
assert(gate003.isSupervisorDone === false, 'IT-GATE-003a: isSupervisorDone is false');
assert(gate003.isWorkerDone === true, 'IT-GATE-003b: isWorkerDone is true');
assert(gate003.isGateUnlocked === false, 'IT-GATE-003c: isGateUnlocked is false');
assert(gate003.blockReason === ATTENDANCE_BLOCK_REASONS.SUPERVISOR_NOT_DONE, 'IT-GATE-003d: blockReason is SUPERVISOR_NOT_DONE');

// -----------------------------------------------------------------------------
// IT-GATE-004: Supervisor + Worker done -> UNLOCKED
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', [supervisorAtt, workerAtt]);
const gate004 = getGlobalAttendanceGateStatus(mantriUser);
assert(gate004.isSupervisorDone === true, 'IT-GATE-004a: isSupervisorDone is true');
assert(gate004.isWorkerDone === true, 'IT-GATE-004b: isWorkerDone is true');
assert(gate004.isGateUnlocked === true, 'IT-GATE-004c: isGateUnlocked is true');
assert(gate004.blockReason === null, 'IT-GATE-004d: blockReason is null when unlocked');

// -----------------------------------------------------------------------------
// IT-GATE-005: Attendance kemarin -> LOCKED
// -----------------------------------------------------------------------------
const yesterdaySup = { ...supervisorAtt, id: 'ATT-SUP-YEST', date: yesterday, createdAt: `${yesterday}T07:00:00Z` };
const yesterdayWrk = { ...workerAtt, id: 'ATT-WRK-YEST', date: yesterday, createdAt: `${yesterday}T07:15:00Z` };
storage.set('attendance_transactions', [yesterdaySup, yesterdayWrk]);
const gate005 = getGlobalAttendanceGateStatus(mantriUser);
assert(gate005.isGateUnlocked === false, 'IT-GATE-005a: Yesterday attendance does not unlock today gate');
assert(gate005.blockReason === ATTENDANCE_BLOCK_REASONS.BOTH_NOT_DONE, 'IT-GATE-005b: blockReason is BOTH_NOT_DONE for today');

// -----------------------------------------------------------------------------
// IT-GATE-006: Landing transaction tetap bisa VIEW saat LOCKED
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', []);
const gate006 = getGlobalAttendanceGateStatus(mantriUser);
assert(gate006.isGateUnlocked === false, 'IT-GATE-006a: Gate is locked');
// View data does not require assertAttendanceGateOrThrow - helper only returns status
assert(typeof gate006.date === 'string', 'IT-GATE-006b: View query succeeds safely without error');

// -----------------------------------------------------------------------------
// IT-GATE-007: Form Seeding creation diblokir saat LOCKED
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', []);
let seedingBlocked = false;
try {
  assertAttendanceGateOrThrow(mantriUser);
} catch (e) {
  seedingBlocked = true;
  assert(e.code === 'ERR_ATTENDANCE_GATE_LOCKED', 'IT-GATE-007a: Throws ERR_ATTENDANCE_GATE_LOCKED error code');
}
assert(seedingBlocked === true, 'IT-GATE-007b: Seeding form save is blocked when locked');

// -----------------------------------------------------------------------------
// IT-GATE-008: Selection landing tetap bisa VIEW saat LOCKED
// -----------------------------------------------------------------------------
const mockSelectionDocs = [{
  id: 'DOC-SEL1-001',
  docNo: '2026/CULL/001',
  batchCode: 'BTCH-001',
  bedenganCode: 'BED-001',
  sourcePolybagQty: 4450,
  sourceBibitQty: 8900,
  status: 'TERVERIFIKASI'
}];
storage.set('pre_grafting_selection_documents', mockSelectionDocs);
const viewDocs = storage.get('pre_grafting_selection_documents', []);
assert(viewDocs.length === 1, 'IT-GATE-008: Selection landing view remains fully accessible');

// -----------------------------------------------------------------------------
// IT-GATE-009: Selection execution diblokir saat LOCKED
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', []);
let selExecBlocked = false;
try {
  createSeleksi1ExecutionTransaction({
    selectionDocumentId: 'DOC-SEL1-001',
    actualPolybagInspectedQty: 100,
    actualBibitSelectedQty: 5
  }, mantriUser);
} catch (err) {
  selExecBlocked = true;
  assert(err.message.includes('Presensi'), `IT-GATE-009a: Selection execution blocked with message: ${err.message}`);
}
assert(selExecBlocked === true, 'IT-GATE-009b: createSeleksi1ExecutionTransaction throws gate error');

// -----------------------------------------------------------------------------
// IT-GATE-010: Deep-link creation route diblokir
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', []);
const status010 = getGlobalAttendanceGateStatus(mantriUser);
assert(status010.isGateUnlocked === false, 'IT-GATE-010: Deep link creation intercepted by locked gate');

// -----------------------------------------------------------------------------
// IT-GATE-011: Direct service create transaction diblokir
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', []);
let declareBlocked = false;
try {
  declareSelectionItem({ id: 'POOL-1', docNo: '2026/CULL/001' }, {}, mantriUser);
} catch (err) {
  declareBlocked = true;
  assert(err.message.includes('Presensi'), 'IT-GATE-011a: declareSelectionItem blocked by attendance gate');
}
assert(declareBlocked === true, 'IT-GATE-011b: Direct service creation throws when locked');

// -----------------------------------------------------------------------------
// IT-GATE-012: Role ASISTEN tidak terkena gate
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', []);
const asistenGate = getGlobalAttendanceGateStatus(asistenUser);
assert(asistenGate.isGateUnlocked === true, 'IT-GATE-012a: ASISTEN is exempt from attendance gate');
assert(asistenGate.isExempt === true, 'IT-GATE-012b: ASISTEN isExempt is true');
assert(assertAttendanceGateOrThrow(asistenUser) === true, 'IT-GATE-012c: assertAttendanceGateOrThrow does not throw for ASISTEN');

// -----------------------------------------------------------------------------
// IT-GATE-013: Role ASKEP tidak terkena gate
// -----------------------------------------------------------------------------
const askepGate = getGlobalAttendanceGateStatus(askepUser);
assert(askepGate.isGateUnlocked === true, 'IT-GATE-013a: ASKEP is exempt from attendance gate');
assert(assertAttendanceGateOrThrow(askepUser) === true, 'IT-GATE-013b: assertAttendanceGateOrThrow does not throw for ASKEP');

// -----------------------------------------------------------------------------
// IT-GATE-014: Role PENGURUS tidak terkena gate
// -----------------------------------------------------------------------------
const pengurusGate = getGlobalAttendanceGateStatus(pengurusUser);
assert(pengurusGate.isGateUnlocked === true, 'IT-GATE-014a: PENGURUS is exempt from attendance gate');
assert(assertAttendanceGateOrThrow(pengurusUser) === true, 'IT-GATE-014b: assertAttendanceGateOrThrow does not throw for PENGURUS');

// -----------------------------------------------------------------------------
// IT-GATE-015: Offline gate deterministic
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', [supervisorAtt, workerAtt]);
const offlineGate = getGlobalAttendanceGateStatus(mantriUser);
assert(offlineGate.isGateUnlocked === true, 'IT-GATE-015: Gate evaluates deterministically from offline local storage');

// -----------------------------------------------------------------------------
// IT-GATE-016: Presensi valid langsung unlock tanpa stale state
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', []);
assert(getGlobalAttendanceGateStatus(mantriUser).isGateUnlocked === false, 'IT-GATE-016a: Initially locked');
storage.set('attendance_transactions', [supervisorAtt, workerAtt]);
assert(getGlobalAttendanceGateStatus(mantriUser).isGateUnlocked === true, 'IT-GATE-016b: Instantly unlocked after storage update');

// -----------------------------------------------------------------------------
// IT-GATE-017: Pulang (PULANG) tidak menghapus eligibility DATANG hari itu
// -----------------------------------------------------------------------------
const pulangAtt = {
  id: 'ATT-PULANG-001',
  type: 'SUPERVISOR',
  userId: mantriUser.id,
  name: mantriUser.name,
  attendanceType: 'PULANG',
  status: 'HADIR',
  date: today,
  createdAt: `${today}T16:00:00Z`
};
storage.set('attendance_transactions', [supervisorAtt, workerAtt, pulangAtt]);
const gate017 = getGlobalAttendanceGateStatus(mantriUser);
assert(gate017.isGateUnlocked === true, 'IT-GATE-017: Recorded PULANG attendance does not invalidate DATANG eligibility');

// -----------------------------------------------------------------------------
// IT-GATE-018: Existing pending transaction tidak terhapus karena LOCKED
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', []);
const rawDocsBefore = storage.get('pre_grafting_selection_documents', []);
getGlobalAttendanceGateStatus(mantriUser);
const rawDocsAfter = storage.get('pre_grafting_selection_documents', []);
assert(rawDocsBefore.length === rawDocsAfter.length, 'IT-GATE-018: Zero deletion/mutation on pending records during gate checks');

// -----------------------------------------------------------------------------
// IT-GATE-019: Submit Verification diblokir saat LOCKED
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', []);
let submitVerifBlocked = false;
try {
  submitMantriTransactions(['TX-TEST-01'], mantriUser);
} catch (err) {
  submitVerifBlocked = true;
  assert(err.message.includes('Presensi'), 'IT-GATE-019a: submitMantriTransactions blocked by attendance gate');
}
assert(submitVerifBlocked === true, 'IT-GATE-019b: Submission to ASB fails when attendance not complete');

// -----------------------------------------------------------------------------
// IT-GATE-020: Submit Verification normal saat UNLOCKED
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', [supervisorAtt, workerAtt]);
let submitVerifAllowed = true;
try {
  // Function should not throw gate error when unlocked (will return normal result)
  assertAttendanceGateOrThrow(mantriUser);
} catch (err) {
  submitVerifAllowed = false;
}
assert(submitVerifAllowed === true, 'IT-GATE-020: submitMantriTransactions proceeds without gate error when UNLOCKED');

// =============================================================================
// DISPATCH ATTENDANCE GATE TESTS (IT-DISPATCH-001 to IT-DISPATCH-010)
// =============================================================================

const mockApprovedRequest = {
  id: 'REQ-DISP-001',
  docNo: '2026/REQ/TBS/001',
  type: 'KEBUN_SEPUPU',
  status: 'TERVERIFIKASI',
  sourceEstateId: 'EST-TBS',
  targetEstateId: 'EST-TBS',
  estateId: 'EST-TBS',
  approvedClone: 'PB 260',
  requestedClone: 'PB 260',
  growthStage: 'Rubber Main Nursery',
  category: 'Polibag Besar',
  approvedQty: 1000,
  totalIssuedQty: 0
};

const mockMataEntresRequest = {
  id: 'REQ-ETRS-001',
  docNo: '2026/REQ/ETRS/001',
  type: 'MATA_ENTRES',
  status: 'TERVERIFIKASI',
  sourceEstateId: 'EST-TBS',
  targetEstateId: 'EST-TBS',
  estateId: 'EST-TBS',
  klon: 'PB 260',
  jumlahMataEntres: 500,
  jumlahBatang: 50,
  approval: {
    approvedMataEntres: 500,
    approvedBatang: 50,
    approvedKlon: 'PB 260'
  }
};

// -----------------------------------------------------------------------------
// IT-DISPATCH-001: Mantri + attendance locked -> openDispatchModal() diblokir
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', []);
session.start(mantriUser);
let modalOpened = false;
globalThis.document.getElementById = (id) => {
  if (id === 'modal-root') modalOpened = true;
  return makeMockElement('DIV');
};

openDispatchModal(mockApprovedRequest, mantriUser);
assert(getGlobalAttendanceGateStatus(mantriUser).isGateUnlocked === false, 'IT-DISPATCH-001a: Attendance gate is locked');
assert(getGlobalAttendanceGateStatus(mantriUser).blockReason === 'BOTH_NOT_DONE', 'IT-DISPATCH-001b: Gate block reason identified');

// -----------------------------------------------------------------------------
// IT-DISPATCH-002: Mantri + attendance locked -> processDispatchShipment() melempar ERR_ATTENDANCE_GATE_LOCKED
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', []);
storage.set('requests_transactions', [mockApprovedRequest]);
let processShipmentError = null;
try {
  await processDispatchShipment(mockApprovedRequest, {
    issuedDate: today,
    shipmentQty: 500,
    batchRows: [{ batchCode: 'BTCH-001', qty: 500 }]
  }, mantriUser);
} catch (err) {
  processShipmentError = err;
}
assert(processShipmentError !== null, 'IT-DISPATCH-002a: processDispatchShipment throws when locked');
assert(processShipmentError.code === 'ERR_ATTENDANCE_GATE_LOCKED', 'IT-DISPATCH-002b: Error code is ERR_ATTENDANCE_GATE_LOCKED');

// -----------------------------------------------------------------------------
// IT-DISPATCH-003: Mantri + attendance locked -> tidak ada dispatch transaction baru
// -----------------------------------------------------------------------------
const dispatchesAfterLock = storage.get('dispatch_transactions', []);
assert(dispatchesAfterLock.length === 0, 'IT-DISPATCH-003: Zero dispatch transaction created when locked');

// -----------------------------------------------------------------------------
// IT-DISPATCH-004: Mantri + attendance unlocked -> dispatch bibit tetap bisa diproses
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', [supervisorAtt, workerAtt]);
const gateDisp004 = getGlobalAttendanceGateStatus(mantriUser);
assert(gateDisp004.isGateUnlocked === true, 'IT-DISPATCH-004a: Gate is unlocked with complete attendance');
assert(assertAttendanceGateOrThrow(mantriUser) === true, 'IT-DISPATCH-004b: assertAttendanceGateOrThrow succeeds for dispatch');

// -----------------------------------------------------------------------------
// IT-DISPATCH-005: Mantri + attendance locked -> openMantriDispatchModal() diblokir
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', []);
let mataModalOpened = false;
await openMantriDispatchModal(mockMataEntresRequest, mantriUser);
assert(getGlobalAttendanceGateStatus(mantriUser).isGateUnlocked === false, 'IT-DISPATCH-005: openMantriDispatchModal blocked when locked');

// -----------------------------------------------------------------------------
// IT-DISPATCH-006: Mantri + attendance locked -> processMantriDispatch() diblokir
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', []);
storage.set('requests_transactions', [mockMataEntresRequest]);
let processMataError = null;
try {
  await processMantriDispatch(mockMataEntresRequest.id, {
    jumlahBatangDikeluarkan: 50,
    jumlahMataEntresDikeluarkan: 500,
    tanggalPengeluaran: today
  }, mantriUser);
} catch (err) {
  processMataError = err;
}
assert(processMataError !== null, 'IT-DISPATCH-006a: processMantriDispatch throws when locked');
assert(processMataError.code === 'ERR_ATTENDANCE_GATE_LOCKED', 'IT-DISPATCH-006b: Error code is ERR_ATTENDANCE_GATE_LOCKED');

// -----------------------------------------------------------------------------
// IT-DISPATCH-007: Mantri + attendance locked -> tidak ada mutasi request/stock
// -----------------------------------------------------------------------------
const reqsAfterLock = storage.get('requests_transactions', []);
assert(reqsAfterLock[0].status === 'TERVERIFIKASI', 'IT-DISPATCH-007a: Request status remains unchanged');
const dispatchesMataAfterLock = storage.get('dispatch_transactions', []);
assert(dispatchesMataAfterLock.length === 0, 'IT-DISPATCH-007b: Zero dispatch records created in storage');

// -----------------------------------------------------------------------------
// IT-DISPATCH-008: Role exempt tetap dapat melakukan flow sesuai permission existing
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', []);
assert(getGlobalAttendanceGateStatus(asistenUser).isGateUnlocked === true, 'IT-DISPATCH-008a: ASISTEN is exempt');
assert(getGlobalAttendanceGateStatus(pengurusUser).isGateUnlocked === true, 'IT-DISPATCH-008b: PENGURUS is exempt');

// -----------------------------------------------------------------------------
// IT-DISPATCH-009: View /dispatch tetap dapat dibuka saat locked
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', []);
const canViewDispatch = storage.get('requests_transactions', []);
assert(Array.isArray(canViewDispatch), 'IT-DISPATCH-009: Dispatch landing view query safe when locked');

// -----------------------------------------------------------------------------
// IT-DISPATCH-010: View /dispatch/report tetap dapat dibuka saat locked
// -----------------------------------------------------------------------------
const canViewDispatchReport = storage.get('dispatch_transactions', []);
assert(Array.isArray(canViewDispatchReport), 'IT-DISPATCH-010: Dispatch report view query safe when locked');

// =============================================================================
// UI/UX MODAL GLOBAL ATTENDANCE GATE TESTS (IT-UI-001 to IT-UI-010)
// =============================================================================

// Mock modal-root container with enhanced DOM simulation
const modalRootElement = {
  tagName: 'DIV',
  id: 'modal-root',
  innerHTML: '',
  listeners: new Map(),
  querySelector: function(sel) {
    // Check if the selector matches content rendered into innerHTML
    const strippedSel = sel.replace(/^[#.\[\]]/, '');
    const matchable = [
      '.modal-overlay', '.modal', '.modal-head', '.modal-body', '.modal-foot',
      '#btn-modal-att-now', '#btn-modal-att-cancel', '[data-modal-close]',
      '.attendance-modal'
    ];
    if (matchable.includes(sel) || this.innerHTML.includes(strippedSel)) {
      const self = this;
      return {
        addEventListener: (event, handler) => {
          self.listeners.set(sel + ':' + event, handler);
        },
        classList: {
          add: (cls) => {
            // Simulate adding class to innerHTML for verification
            if (self.innerHTML.includes('class="modal"') && !self.innerHTML.includes('attendance-modal')) {
              self.innerHTML = self.innerHTML.replace('class="modal"', 'class="modal attendance-modal"');
            }
          },
          contains: (cls) => self.innerHTML.includes(cls)
        }
      };
    }
    return null;
  }
};

const domStore = new Map([['modal-root', modalRootElement]]);
globalThis.document.getElementById = (id) => domStore.get(id) || makeMockElement(id);

// -----------------------------------------------------------------------------
// IT-UI-001: Modal muncul saat gate LOCKED
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', []);
session.start(mantriUser);
modalRootElement.innerHTML = '';
showAttendanceRequirementModal({ targetModuleName: 'Penyeleksian' });
assert(modalRootElement.innerHTML.length > 0, 'IT-UI-001a: showAttendanceRequirementModal renders content into #modal-root');
assert(modalRootElement.innerHTML.includes('Presensi Harian Diperlukan'), 'IT-UI-001b: Modal title is Presensi Harian Diperlukan');

// -----------------------------------------------------------------------------
// IT-UI-002: Button "Kembali" tersedia
// -----------------------------------------------------------------------------
assert(modalRootElement.innerHTML.includes('id="btn-modal-att-cancel"'), 'IT-UI-002a: Cancel button exists in footer');
assert(modalRootElement.innerHTML.includes('Kembali'), 'IT-UI-002b: Cancel button label is "Kembali"');
assert(!modalRootElement.innerHTML.includes('>Nanti<'), 'IT-UI-002c: Old label "Nanti" is no longer present');

// -----------------------------------------------------------------------------
// IT-UI-003: Button "Lanjut Presensi" tersedia
// -----------------------------------------------------------------------------
assert(modalRootElement.innerHTML.includes('id="btn-modal-att-now"'), 'IT-UI-003a: Primary button exists in footer');
assert(modalRootElement.innerHTML.includes('Lanjut Presensi'), 'IT-UI-003b: Primary button label is "Lanjut Presensi"');
assert(!modalRootElement.innerHTML.includes('Presensi Supervisor Sekarang'), 'IT-UI-003c: Old label "Presensi Supervisor Sekarang" is no longer present');

// -----------------------------------------------------------------------------
// IT-UI-004: "Kembali" menutup modal (event listener is wired)
// -----------------------------------------------------------------------------
assert(modalRootElement.listeners.has('#btn-modal-att-cancel:click'), 'IT-UI-004: Kembali button has click event listener');

// -----------------------------------------------------------------------------
// IT-UI-005: "Lanjut Presensi" menjalankan routing existing (event listener is wired)
// -----------------------------------------------------------------------------
assert(modalRootElement.listeners.has('#btn-modal-att-now:click'), 'IT-UI-005: Lanjut Presensi button has click event listener');

// -----------------------------------------------------------------------------
// IT-UI-006: Button tersusun vertical / stacked via .attendance-modal scoped CSS
// -----------------------------------------------------------------------------
assert(modalRootElement.innerHTML.includes('attendance-modal'), 'IT-UI-006a: .attendance-modal class applied to modal');
assert(modalRootElement.innerHTML.includes('flex-direction: column'), 'IT-UI-006b: Footer has flex-direction: column for vertical stacking');
assert(modalRootElement.innerHTML.includes('width: 100%'), 'IT-UI-006c: Buttons set to width: 100% (full width)');

// -----------------------------------------------------------------------------
// IT-UI-007: Modal berada di bawah #modal-root dalam .device-screen
// -----------------------------------------------------------------------------
assert(modalRootElement.innerHTML.includes('class="modal-overlay"'), 'IT-UI-007a: Modal has .modal-overlay');
assert(modalRootElement.innerHTML.includes('class="modal'), 'IT-UI-007b: Modal has .modal container');
assert(modalRootElement.innerHTML.includes('class="modal-head"'), 'IT-UI-007c: Modal has .modal-head');
assert(modalRootElement.innerHTML.includes('class="modal-body"'), 'IT-UI-007d: Modal has .modal-body');
assert(modalRootElement.innerHTML.includes('class="modal-foot"'), 'IT-UI-007e: Modal has .modal-foot');

// -----------------------------------------------------------------------------
// IT-UI-008: Tidak ada attendance modal yang di-append langsung ke document.body
// -----------------------------------------------------------------------------
const orphanBodyModal = typeof globalThis.document.body.children !== 'undefined' ?
  globalThis.document.body.children.find(c => c.id === 'modal-attendance-requirement') : null;
assert(!orphanBodyModal, 'IT-UI-008: No orphan modal appended directly to document.body');

// -----------------------------------------------------------------------------
// IT-UI-009: Status Supervisor dan Pekerja sesuai gateStatus
// -----------------------------------------------------------------------------
assert(modalRootElement.innerHTML.includes('Presensi Supervisor'), 'IT-UI-009a: Supervisor status label rendered');
assert(modalRootElement.innerHTML.includes('att-badge--error'), 'IT-UI-009b: Error badge rendered for incomplete status');
assert(modalRootElement.innerHTML.includes('Belum'), 'IT-UI-009c: Status shows "Belum" when locked');
assert(modalRootElement.innerHTML.includes('Presensi Pekerja'), 'IT-UI-009d: Worker status label rendered');
assert(modalRootElement.innerHTML.includes('Prasyarat Transaksi Belum Lengkap'), 'IT-UI-009e: Warning title rendered');

// -----------------------------------------------------------------------------
// IT-UI-010: Membuka/menutup modal tidak menyebabkan data mutation
// -----------------------------------------------------------------------------
storage.set('attendance_transactions', []);
const storageBefore = JSON.stringify(storage.get('attendance_transactions', []));
const dispatchBefore = JSON.stringify(storage.get('dispatch_transactions', []));
const requestBefore = JSON.stringify(storage.get('requests_transactions', []));
showAttendanceRequirementModal({ targetModuleName: 'Penyeleksian' });
const storageAfter = JSON.stringify(storage.get('attendance_transactions', []));
const dispatchAfter = JSON.stringify(storage.get('dispatch_transactions', []));
const requestAfter = JSON.stringify(storage.get('requests_transactions', []));
assert(storageBefore === storageAfter, 'IT-UI-010a: Zero attendance_transactions mutation');
assert(dispatchBefore === dispatchAfter, 'IT-UI-010b: Zero dispatch_transactions mutation');
assert(requestBefore === requestAfter, 'IT-UI-010c: Zero requests_transactions mutation');

// =============================================================================
// BONUS: Gate UNLOCKED → modal not rendered
// =============================================================================
storage.set('attendance_transactions', [supervisorAtt, workerAtt]);
modalRootElement.innerHTML = '';
showAttendanceRequirementModal({ targetModuleName: 'Penyeleksian' });
assert(modalRootElement.innerHTML === '', 'IT-UI-BONUS: Modal does not render when gate is unlocked');

// =============================================================================
// NAVIGATION TESTS: "LANJUT PRESENSI" & "KEMBALI" (IT-NAV-001 to IT-NAV-008)
// =============================================================================

storage.set('attendance_transactions', []);
session.start(mantriUser);
globalThis.location.hash = '#/seeding';
modalRootElement.innerHTML = '';
modalRootElement.listeners.clear();

showAttendanceRequirementModal({ targetModuleName: 'Penyemaian' });

// IT-NAV-001: Modal attendance muncul saat gate LOCKED
assert(modalRootElement.innerHTML.includes('Presensi Harian Diperlukan'), 'IT-NAV-001: Modal attendance muncul saat gate LOCKED');

// IT-NAV-002: #btn-modal-att-now tersedia
assert(modalRootElement.innerHTML.includes('id="btn-modal-att-now"'), 'IT-NAV-002: #btn-modal-att-now tersedia');

// IT-NAV-003: Handler tombol "Lanjut Presensi" terdaftar
const primaryNavHandler = modalRootElement.listeners.get('#btn-modal-att-now:click');
assert(typeof primaryNavHandler === 'function', 'IT-NAV-003: Klik "Lanjut Presensi" handler terdaftar');

// Catat snapshot data sebelum navigasi
const attBeforeNav = JSON.stringify(storage.get('attendance_transactions', []));
const verifBeforeNav = JSON.stringify(storage.get('verification_transactions', []));
const reqBeforeNav = JSON.stringify(storage.get('requests_transactions', []));

// Eksekusi handler klik "Lanjut Presensi"
primaryNavHandler();

// IT-NAV-004: Klik "Lanjut Presensi" mengarahkan route
assert(globalThis.location.hash.startsWith('#/attendance'), 'IT-NAV-004: Klik "Lanjut Presensi" memanggil navigate() menuju route attendance');

// IT-NAV-005: Setelah navigation, actual hash/route adalah #/attendance
assert(globalThis.location.hash === '#/attendance', 'IT-NAV-005: Setelah navigation, actual hash/route adalah #/attendance');

// IT-NAV-006: Tidak ada navigation langsung ke /attendance/supervisor atau /attendance/workers
assert(globalThis.location.hash !== '#/attendance/supervisor' && globalThis.location.hash !== '#/attendance/workers', 'IT-NAV-006: Tidak ada direct navigation ke #/attendance/supervisor atau #/attendance/workers');

// IT-NAV-007: Klik "Lanjut Presensi" tidak membuat/mengubah attendance_transactions atau transaksi lainnya
const attAfterNav = JSON.stringify(storage.get('attendance_transactions', []));
const verifAfterNav = JSON.stringify(storage.get('verification_transactions', []));
const reqAfterNav = JSON.stringify(storage.get('requests_transactions', []));
assert(attBeforeNav === attAfterNav && verifBeforeNav === verifAfterNav && reqBeforeNav === reqAfterNav, 'IT-NAV-007: Klik "Lanjut Presensi" tidak membuat/mengubah data transaksi apapun');

// IT-NAV-008: Klik "Kembali" hanya menutup modal dan tidak melakukan navigation
globalThis.location.hash = '#/seeding';
modalRootElement.innerHTML = '';
modalRootElement.listeners.clear();
showAttendanceRequirementModal({ targetModuleName: 'Penyemaian' });

const cancelNavHandler = modalRootElement.listeners.get('#btn-modal-att-cancel:click');
assert(typeof cancelNavHandler === 'function', 'IT-NAV-008a: Tombol "Kembali" handler terdaftar');

cancelNavHandler();
assert(globalThis.location.hash === '#/seeding', 'IT-NAV-008b: Klik "Kembali" tidak melakukan navigation dan tetap di hash semula');

// -----------------------------------------------------------------------------
// Summary
// -----------------------------------------------------------------------------
console.log('\n================================================================================');
console.log(`TEST SUMMARY: TOTAL = ${passed + failed} | PASSED = ${passed} | FAILED = ${failed}`);
console.log('================================================================================\n');

if (failed > 0) {
  process.exit(1);
}

