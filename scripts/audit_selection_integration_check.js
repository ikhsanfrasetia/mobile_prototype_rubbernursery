/**
 * scripts/audit_selection_integration_check.js
 * Non-destructive audit check for TASK-AUDIT-SELECTION-LOGIC-INTEGRATION-01.
 * Tests isolated fixtures and checks logic/scope isolation without touching production data.
 */

import {
  SELECTION_STATUS,
  STOCK_MUTATION_STATUS,
  SELECTION_STORAGE_KEY,
  filterSelectionByScope,
  getActionableSelectionCount,
  canPerformAsistenSelectionAction,
  validateSelectionData
} from '../js/modules/selection/selection-manager.js';

import { ROLES } from '../js/core/user-context.js';
import { getBatchById, getBatchByCode } from '../js/data/batch-master.js';
import { getBedenganById } from '../js/data/bedengan-master.js';
import { getProgramById } from '../js/data/program-master.js';

console.log('=== AUDIT CHECK: SELECTION MODULE LOGIC & INTEGRATION ===\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

// 1. Check Persona Scope Filtering (MNT001 TBS vs MNT002 APM)
const userMNT001 = { userId: 'USR-MNT-001', name: 'Wagiman', role: ROLES.MANTRI_BIBITAN, estateId: 'EST-TBS', divisionId: 'DIV-001' };
const userMNT002 = { userId: 'USR-MNT-002', name: 'Sutrisno', role: ROLES.MANTRI_BIBITAN, estateId: 'EST-APM', divisionId: 'DIV-APM-02' };
const userASB_TBS = { userId: 'USR-ASB-TBS', name: 'Asisten TBS', role: ROLES.ASISTEN_BIBITAN, estateId: 'EST-TBS', divisionId: 'DIV-001' };
const userASB_APM = { userId: 'USR-ASB-APM', name: 'Asisten APM', role: ROLES.ASISTEN_BIBITAN, estateId: 'EST-APM', divisionId: 'DIV-APM-02' };

const sampleRecords = [
  { id: 'SEL-01', estateId: 'EST-TBS', divisionId: 'DIV-001', batchCode: 'BTCH-TBS-01', jumlahDiperiksa: 100, jumlahLayak: 90, jumlahAfkir: 10, status: SELECTION_STATUS.MENUNGGU_VERIFIKASI },
  { id: 'SEL-02', estateId: 'EST-APM', divisionId: 'DIV-APM-02', batchCode: 'BTCH-APM-01', jumlahDiperiksa: 200, jumlahLayak: 180, jumlahAfkir: 20, status: SELECTION_STATUS.MENUNGGU_VERIFIKASI }
];

const scopedMNT001 = filterSelectionByScope(sampleRecords, userMNT001);
assert(scopedMNT001.length === 1 && scopedMNT001[0].estateId === 'EST-TBS', 'MNT001 only sees EST-TBS records');

const scopedMNT002 = filterSelectionByScope(sampleRecords, userMNT002);
assert(scopedMNT002.length === 1 && scopedMNT002[0].estateId === 'EST-APM', 'MNT002 only sees EST-APM records');

const asbCanActionTBS = canPerformAsistenSelectionAction(sampleRecords[0], userASB_TBS);
const asbCanActionAPMOnTBS = canPerformAsistenSelectionAction(sampleRecords[0], userASB_APM);
assert(asbCanActionTBS === true, 'ASB TBS can action TBS record');
assert(asbCanActionAPMOnTBS === false, 'ASB APM CANNOT action TBS record (Cross-estate blocked)');

// 2. Validation Logic Check
const validPayload = { batchId: 'BATCH-001', batchCode: 'BTCH-001', jumlahDiperiksa: 500, jumlahLayak: 450, jumlahAfkir: 50 };
const val1 = validateSelectionData(validPayload);
assert(val1.isValid === true, 'Valid payload passes validation');

const invalidSumPayload = { batchId: 'BATCH-001', batchCode: 'BTCH-001', jumlahDiperiksa: 500, jumlahLayak: 400, jumlahAfkir: 50 };
const val2 = validateSelectionData(invalidSumPayload);
assert(val2.isValid === false && val2.errors.length > 0, 'Layak + Afkir != Diperiksa fails validation');

const negativePayload = { batchId: 'BATCH-001', batchCode: 'BTCH-001', jumlahDiperiksa: 500, jumlahLayak: 550, jumlahAfkir: -50 };
const val3 = validateSelectionData(negativePayload);
assert(val3.isValid === false, 'Negative afkir quantity fails validation');

console.log(`\n========================================`);
console.log(`AUDIT CHECK SUMMARY: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);
