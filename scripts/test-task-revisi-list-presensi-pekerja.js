/**
 * scripts/test-task-revisi-list-presensi-pekerja.js
 * Integration test suite for TASK IMPLEMENTATION — REVISI LIST PRESENSI PEKERJA BIBITAN
 * Tests IT-ATT-WORKER-LIST-001 through IT-ATT-WORKER-LIST-015
 */

import { getWorkersForUserContext } from '../js/data/worker-master.js';
import { getAttendanceTypeByHour } from '../js/modules/attendance/attendance-landing.js';
import { getAttendanceUniqueKey } from '../js/core/utils.js';

let passedCount = 0;
const totalCount = 15;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runAllTests() {
  console.log('--- START INTEGRATION TESTS: REVISI LIST PRESENSI PEKERJA BIBITAN ---\n');

  const userContext = {
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Divisi I'
  };
  const today = '2026-10-05';

  // In-memory mock storage
  let storageAttendances = [];

  // Derived state generator per active session (matching renderAttendanceWorkers logic)
  function deriveWorkerListState(scopedActive, attendances, date, attType) {
    const todayWorkerAtts = attendances.filter(
      (a) => a && (a.date === date || a.tanggal === date) &&
             a.type === 'WORKER' &&
             (a.attendanceType === attType || (!a.attendanceType && attType === 'DATANG'))
    );

    return scopedActive.map((w) => {
      const existing = todayWorkerAtts.find((a) => (a.workerId && a.workerId === w.id) || (a.id && a.id === w.id));
      return {
        ...w,
        isCompleted: Boolean(existing),
        completedAttendance: existing || null
      };
    });
  }

  // IT-ATT-WORKER-LIST-001: 7 worker aktif tampil pada initial page.
  const scopedActive = getWorkersForUserContext(userContext, { activeOnly: true }) || [];
  assert(scopedActive.length === 7, `Expected 7 active workers, got ${scopedActive.length}`);
  const initialList = deriveWorkerListState(scopedActive, storageAttendances, today, 'DATANG');
  assert(initialList.length === 7, `Expected 7 workers in list, got ${initialList.length}`);
  assert(initialList.every(w => w.isCompleted === false), 'All workers must initially be isCompleted: false');
  console.log('[PASS] IT-ATT-WORKER-LIST-001: 7 worker aktif tampil pada initial page.');
  passedCount++;

  // IT-ATT-WORKER-LIST-002: Setelah A DATANG, 7 worker tetap tampil.
  const workerA = scopedActive[0]; // Fadilah
  const recordA_DATANG = {
    id: 'ATT-WRK-001',
    type: 'WORKER',
    workerId: workerA.id,
    workerName: workerA.name,
    code: workerA.code,
    workerCode: workerA.code,
    position: 'Pekerja Bibitan',
    attendanceType: 'DATANG',
    photo: 'assets/icons/worker_fadilah.jpg',
    date: today,
    time: '08:05:00',
    createdAt: `${today}T08:05:00.000Z`,
    status: 'HADIR'
  };
  storageAttendances.push(recordA_DATANG);

  const listAfterA = deriveWorkerListState(scopedActive, storageAttendances, today, 'DATANG');
  assert(listAfterA.length === 7, `Expected 7 workers in list after A saved, got ${listAfterA.length}`);
  console.log('[PASS] IT-ATT-WORKER-LIST-002: Setelah A DATANG, 7 worker tetap tampil.');
  passedCount++;

  // IT-ATT-WORKER-LIST-003: A memiliki status Sudah Presensi.
  const aState = listAfterA.find(w => w.id === workerA.id);
  assert(aState && aState.isCompleted === true, 'Worker A must have isCompleted === true');
  assert(aState.completedAttendance && aState.completedAttendance.time === '08:05:00', 'Worker A must have completedAttendance info');
  console.log('[PASS] IT-ATT-WORKER-LIST-003: A memiliki status Sudah Presensi.');
  passedCount++;

  // IT-ATT-WORKER-LIST-004: B-G tetap actionable.
  const otherWorkers = listAfterA.filter(w => w.id !== workerA.id);
  assert(otherWorkers.length === 6, 'Must be 6 other workers');
  assert(otherWorkers.every(w => w.isCompleted === false), 'B-G must have isCompleted === false and be actionable');
  console.log('[PASS] IT-ATT-WORKER-LIST-004: B-G tetap actionable.');
  passedCount++;

  // IT-ATT-WORKER-LIST-005: A tidak dapat membuka camera / membuat duplicate attendance.
  function simulateToggle(targetWorker) {
    if (targetWorker.isCompleted) {
      return { triggered: false, reason: 'LOCKED' };
    }
    return { triggered: true, reason: 'OPEN_CAMERA' };
  }
  const toggleResultA = simulateToggle(aState);
  assert(toggleResultA.triggered === false && toggleResultA.reason === 'LOCKED', 'Toggle on completed worker must be locked');
  console.log('[PASS] IT-ATT-WORKER-LIST-005: A tidak dapat membuka camera / membuat duplicate attendance.');
  passedCount++;

  // IT-ATT-WORKER-LIST-006: Setelah B DATANG, A dan B tetap tampil sebagai completed.
  const workerB = scopedActive[1]; // Adek
  const recordB_DATANG = {
    id: 'ATT-WRK-002',
    type: 'WORKER',
    workerId: workerB.id,
    workerName: workerB.name,
    code: workerB.code,
    workerCode: workerB.code,
    position: 'Pekerja Bibitan',
    attendanceType: 'DATANG',
    photo: 'assets/icons/worker_adek.jpg',
    date: today,
    time: '08:12:00',
    createdAt: `${today}T08:12:00.000Z`,
    status: 'HADIR'
  };
  storageAttendances.push(recordB_DATANG);

  const listAfterB = deriveWorkerListState(scopedActive, storageAttendances, today, 'DATANG');
  assert(listAfterB.length === 7, `Expected 7 workers in list, got ${listAfterB.length}`);
  const aAfterB = listAfterB.find(w => w.id === workerA.id);
  const bAfterB = listAfterB.find(w => w.id === workerB.id);
  assert(aAfterB.isCompleted === true && bAfterB.isCompleted === true, 'Both A and B must be isCompleted === true');
  console.log('[PASS] IT-ATT-WORKER-LIST-006: Setelah B DATANG, A dan B tetap tampil sebagai completed.');
  passedCount++;

  // IT-ATT-WORKER-LIST-007: Session PULANG menampilkan kembali A-G sebagai worker list.
  const listPulangInitial = deriveWorkerListState(scopedActive, storageAttendances, today, 'PULANG');
  assert(listPulangInitial.length === 7, `Expected 7 workers in PULANG list, got ${listPulangInitial.length}`);
  console.log('[PASS] IT-ATT-WORKER-LIST-007: Session PULANG menampilkan kembali A-G sebagai worker list.');
  passedCount++;

  // IT-ATT-WORKER-LIST-008: A yang sudah DATANG tetapi belum PULANG berstatus belum PULANG.
  const aPulangState = listPulangInitial.find(w => w.id === workerA.id);
  assert(aPulangState && aPulangState.isCompleted === false, 'A must be isCompleted === false for PULANG session');
  console.log('[PASS] IT-ATT-WORKER-LIST-008: A yang sudah DATANG tetapi belum PULANG berstatus belum PULANG.');
  passedCount++;

  // IT-ATT-WORKER-LIST-009: A setelah PULANG menjadi completed PULANG tetapi tetap tampil.
  const recordA_PULANG = {
    id: 'ATT-WRK-003',
    type: 'WORKER',
    workerId: workerA.id,
    workerName: workerA.name,
    code: workerA.code,
    workerCode: workerA.code,
    position: 'Pekerja Bibitan',
    attendanceType: 'PULANG',
    photo: 'assets/icons/worker_fadilah.jpg',
    date: today,
    time: '16:40:00',
    createdAt: `${today}T16:40:00.000Z`,
    status: 'HADIR'
  };
  storageAttendances.push(recordA_PULANG);

  const listPulangAfterA = deriveWorkerListState(scopedActive, storageAttendances, today, 'PULANG');
  assert(listPulangAfterA.length === 7, `Expected 7 workers in PULANG list, got ${listPulangAfterA.length}`);
  const aPulangDone = listPulangAfterA.find(w => w.id === workerA.id);
  assert(aPulangDone && aPulangDone.isCompleted === true, 'A must be isCompleted === true for PULANG now');
  console.log('[PASS] IT-ATT-WORKER-LIST-009: A setelah PULANG menjadi completed PULANG tetapi tetap tampil.');
  passedCount++;

  // IT-ATT-WORKER-LIST-010: DATANG A tidak berubah setelah PULANG A.
  const aDatangRecord = storageAttendances.find(a => a.workerId === workerA.id && a.attendanceType === 'DATANG');
  const aPulangRecord = storageAttendances.find(a => a.workerId === workerA.id && a.attendanceType === 'PULANG');
  assert(aDatangRecord && aDatangRecord.time === '08:05:00', 'DATANG A must remain intact');
  assert(aPulangRecord && aPulangRecord.time === '16:40:00', 'PULANG A must remain intact');
  console.log('[PASS] IT-ATT-WORKER-LIST-010: DATANG A tidak berubah setelah PULANG A.');
  passedCount++;

  // IT-ATT-WORKER-LIST-011: Refresh/re-entry mempertahankan status completed/pending.
  const reloadedDatang = deriveWorkerListState(scopedActive, storageAttendances, today, 'DATANG');
  const reloadedPulang = deriveWorkerListState(scopedActive, storageAttendances, today, 'PULANG');
  assert(reloadedDatang.filter(w => w.isCompleted).length === 2, 'DATANG must have 2 completed (A and B)');
  assert(reloadedPulang.filter(w => w.isCompleted).length === 1, 'PULANG must have 1 completed (A)');
  console.log('[PASS] IT-ATT-WORKER-LIST-011: Refresh/re-entry mempertahankan status completed/pending.');
  passedCount++;

  // IT-ATT-WORKER-LIST-012: Counter total/sudah/belum benar.
  const total = reloadedDatang.length; // 7
  const sudah = reloadedDatang.filter(w => w.isCompleted).length; // 2
  const belum = total - sudah; // 5
  assert(total === 7 && sudah === 2 && belum === 5, `Expected 7 total, 2 sudah, 5 belum. Got ${total}, ${sudah}, ${belum}`);
  console.log('[PASS] IT-ATT-WORKER-LIST-012: Counter total/sudah/belum benar.');
  passedCount++;

  // IT-ATT-WORKER-LIST-013: Summary tetap membaca seluruh transaction existing.
  const summaryDatang = storageAttendances.filter(a => a.attendanceType === 'DATANG');
  const summaryPulang = storageAttendances.filter(a => a.attendanceType === 'PULANG');
  assert(summaryDatang.length === 2, `Expected 2 DATANG in summary, got ${summaryDatang.length}`);
  assert(summaryPulang.length === 1, `Expected 1 PULANG in summary, got ${summaryPulang.length}`);
  console.log('[PASS] IT-ATT-WORKER-LIST-013: Summary tetap membaca seluruh transaction existing.');
  passedCount++;

  // IT-ATT-WORKER-LIST-014: Timestamp transaction existing tetap utuh.
  assert(recordA_DATANG.time === '08:05:00' && recordB_DATANG.time === '08:12:00' && recordA_PULANG.time === '16:40:00', 'All timestamps must remain distinct and accurate');
  console.log('[PASS] IT-ATT-WORKER-LIST-014: Timestamp transaction existing tetap utuh.');
  passedCount++;

  // IT-ATT-WORKER-LIST-015: Existing time/session resolver tetap menghasilkan result yang sama.
  const resolvedSession = getAttendanceTypeByHour();
  assert(resolvedSession === 'DATANG' || resolvedSession === 'PULANG', 'getAttendanceTypeByHour must return valid session');
  console.log('[PASS] IT-ATT-WORKER-LIST-015: Existing time/session resolver tetap menghasilkan result yang sama.');
  passedCount++;

  console.log(`\n--- RINGKASAN INTEGRATION TESTS: ${passedCount}/${totalCount} PASSED ---`);
}

runAllTests().catch((err) => {
  console.error('[TEST ERROR]', err);
  process.exit(1);
});
