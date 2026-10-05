/**
 * scripts/test-task-mantri-overdue-filter-and-submission.js
 * Integration Test: Overdue Transactions (Data Lewat Waktu) View, Date Filter, and Single-Date Submission
 */

const memoryStore = new Map();
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem(k) { return memoryStore.has(k) ? memoryStore.get(k) : null; },
    setItem(k, v) { memoryStore.set(k, String(v)); },
    removeItem(k) { memoryStore.delete(k); },
    clear() { memoryStore.clear(); }
  };
}

import assert from 'assert';
import { storage } from '../js/core/storage.js';
import {
  MANTRI_TRANSACTION_STATUS,
  MODULE_TYPES,
  getMantriTodayTransactions,
  submitOverdueTransactionsByDate,
  normalizeDateStr
} from '../js/modules/verification/mantri-confirmation-service.js';

console.log('--- START INTEGRATION TESTS: MANTRI OVERDUE TRANSACTIONS FILTER & SUBMISSION ---');

let passedCount = 0;
const testUser = {
  id: 'USR-MNT-TBS',
  userId: 'USR-MNT-TBS',
  name: 'Wagiman',
  code: '1405482',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

// Setup dummy attendance for gate
storage.set('attendance_transactions', [
  {
    id: 'ATT-SUP-TODAY',
    type: 'SUPERVISOR',
    userId: testUser.id,
    attendanceType: 'DATANG',
    date: '2026-10-05',
    status: 'HADIR',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001'
  },
  {
    id: 'ATT-WRK-TODAY',
    type: 'WORKER',
    workerId: 'WRK-001',
    attendanceType: 'DATANG',
    date: '2026-10-05',
    status: 'HADIR',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001'
  }
]);

// Setup mock overdue transactions for 04/10/2026 and 03/10/2026
storage.set('selection_transactions', [
  {
    id: 'SEL-001',
    docNo: '2026/CULL/001',
    date: '04/10/2026',
    tanggal: '04/10/2026',
    stage: 'SELEKSI_I',
    actualBibitSelectedQty: 1000,
    actualBibitRetainedQty: 5000,
    bedengan: 'BED-002',
    mantri: 'Wagiman',
    actorName: 'Wagiman',
    status: 'READY_TO_CONFIRM',
    createdAt: '2026-10-04T08:30:00.000Z'
  },
  {
    id: 'SEL-002',
    docNo: '2026/CULL/002',
    date: '04/10/2026',
    tanggal: '04/10/2026',
    stage: 'SELEKSI_I',
    actualBibitSelectedQty: 100,
    actualBibitRetainedQty: 4900,
    bedengan: 'BED-001',
    mantri: 'Wagiman',
    actorName: 'Wagiman',
    status: 'READY_TO_CONFIRM',
    createdAt: '2026-10-04T09:00:00.000Z'
  },
  {
    id: 'SEL-003',
    docNo: '2026/CULL/003',
    date: '03/10/2026',
    tanggal: '03/10/2026',
    stage: 'SELEKSI_I',
    actualBibitSelectedQty: 250,
    actualBibitRetainedQty: 4750,
    bedengan: 'BED-003',
    mantri: 'Wagiman',
    actorName: 'Wagiman',
    status: 'READY_TO_CONFIRM',
    createdAt: '2026-10-03T08:00:00.000Z'
  }
]);

storage.set('verification_transactions', []);

async function runTests() {
  const currentTime = new Date('2026-10-05T22:30:00.000Z');

  // IT-OVD-001: Data retriever retrieves all overdue transactions
  const allTxs = getMantriTodayTransactions(testUser, null, currentTime);
  const overdueTxs = allTxs.filter(tx => 
    (tx.status === MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM || tx.status === MANTRI_TRANSACTION_STATUS.REVISION) &&
    tx.isSubmissionExpired
  );
  assert(overdueTxs.length >= 3, `Expected at least 3 overdue transactions, got ${overdueTxs.length}`);
  console.log('[PASS] IT-OVD-001: Data retriever retrieves all overdue transactions.');
  passedCount++;

  // IT-OVD-002: Unique dates extraction includes '04/10/2026' and '03/10/2026'
  const uniqueDates = Array.from(new Set(overdueTxs.map(t => normalizeDateStr(t.date))));
  assert(uniqueDates.includes('04/10/2026'), 'Must include 04/10/2026');
  assert(uniqueDates.includes('03/10/2026'), 'Must include 03/10/2026');
  console.log('[PASS] IT-OVD-002: Unique dates extraction correctly identifies overdue dates.');
  passedCount++;

  // IT-OVD-003: Date filter 'ALL' returns all overdue transactions
  const filterAll = overdueTxs;
  assert(filterAll.length === 3, `Expected 3 transactions in ALL mode, got ${filterAll.length}`);
  console.log('[PASS] IT-OVD-003: Date filter ALL returns all overdue transactions.');
  passedCount++;

  // IT-OVD-004: Date filter '04/10/2026' returns only 2 transactions from 04/10/2026
  const filter04 = overdueTxs.filter(tx => normalizeDateStr(tx.date) === '04/10/2026');
  assert(filter04.length === 2, `Expected 2 transactions for 04/10/2026, got ${filter04.length}`);
  assert(filter04.every(t => normalizeDateStr(t.date) === '04/10/2026'), 'All items must be 04/10/2026');
  console.log('[PASS] IT-OVD-004: Date filter 04/10/2026 returns only transactions from 04/10/2026.');
  passedCount++;

  // IT-OVD-005: Date filter '03/10/2026' returns only 1 transaction from 03/10/2026
  const filter03 = overdueTxs.filter(tx => normalizeDateStr(tx.date) === '03/10/2026');
  assert(filter03.length === 1, `Expected 1 transaction for 03/10/2026, got ${filter03.length}`);
  assert(filter03[0].docNo === '2026/CULL/003', 'Must be CULL/003');
  console.log('[PASS] IT-OVD-005: Date filter 03/10/2026 returns only transaction from 03/10/2026.');
  passedCount++;

  // IT-OVD-006: Submission with 'ALL' is blocked
  const submitAllAttempt = submitOverdueTransactionsByDate('ALL', testUser, currentTime);
  assert(submitAllAttempt.success === false, 'Submitting with ALL date must be blocked');
  console.log('[PASS] IT-OVD-006: Submission with ALL is blocked.');
  passedCount++;

  // IT-OVD-007: Submission for specific date '04/10/2026' submits only transactions from 04/10/2026
  const submit04Result = submitOverdueTransactionsByDate('04/10/2026', testUser, currentTime);
  assert(submit04Result.success === true, 'Submission of 04/10/2026 must succeed');
  assert(submit04Result.submittedCount === 2, `Expected 2 items submitted for 04/10/2026, got ${submit04Result.submittedCount}`);
  console.log('[PASS] IT-OVD-007: Submission for specific date 04/10/2026 submits only transactions from 04/10/2026.');
  passedCount++;

  // IT-OVD-008: Submitted raw records on 04/10/2026 have status MENUNGGU_VERIFIKASI & isOverdueSubmission
  const rawCulls = storage.get('selection_transactions', []);
  const cull1 = rawCulls.find(c => c.docNo === '2026/CULL/001');
  const cull2 = rawCulls.find(c => c.docNo === '2026/CULL/002');
  const cull3 = rawCulls.find(c => c.docNo === '2026/CULL/003');
  assert(cull1 && cull1.status === 'MENUNGGU_VERIFIKASI' && cull1.isOverdueSubmission === true, 'SEL-001 must be submitted');
  assert(cull2 && cull2.status === 'MENUNGGU_VERIFIKASI' && cull2.isOverdueSubmission === true, 'SEL-002 must be submitted');
  assert(cull3 && cull3.status === 'READY_TO_CONFIRM', 'SEL-003 from 03/10/2026 must remain unsubmitted');
  console.log('[PASS] IT-OVD-008: Raw records on 04/10/2026 are updated with isOverdueSubmission flag, unselected dates untouched.');
  passedCount++;

  // IT-OVD-009: Verification transactions log contains 2 records for 04/10/2026 with isOverdueSubmission
  const verifs = storage.get('verification_transactions', []);
  assert(verifs.length === 2, `Expected 2 verification transactions, got ${verifs.length}`);
  assert(verifs.every(v => v.isOverdueSubmission === true), 'All verifications must be flagged as isOverdueSubmission');
  console.log('[PASS] IT-OVD-009: Verification transactions log created with overdue audit flag.');
  passedCount++;

  // IT-OVD-010: Remaining overdue list now only contains 03/10/2026
  const allTxsAfter = getMantriTodayTransactions(testUser, null, currentTime);
  const overdueTxsAfter = allTxsAfter.filter(tx => 
    (tx.status === MANTRI_TRANSACTION_STATUS.READY_TO_CONFIRM || tx.status === MANTRI_TRANSACTION_STATUS.REVISION) &&
    tx.isSubmissionExpired
  );
  assert(overdueTxsAfter.length === 1, `Expected 1 remaining overdue transaction, got ${overdueTxsAfter.length}`);
  assert(overdueTxsAfter[0].docNo === '2026/CULL/003', 'Remaining must be CUL-003');
  console.log('[PASS] IT-OVD-010: Remaining overdue list dynamically updates after submission.');
  passedCount++;

  console.log(`\n--- RINGKASAN INTEGRATION TESTS: ${passedCount}/10 PASSED ---`);
}

runTests().catch(err => {
  console.error('[TEST ERROR]', err);
  process.exit(1);
});
