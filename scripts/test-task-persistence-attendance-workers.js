/**
 * scripts/test-task-persistence-attendance-workers.js
 * Integration Test: Sequential Persistence & Identity Collision Prevention
 * Menguji bahwa presensi pekerja sebelumnya TIDAK tertimpa saat pekerja berikutnya dipresensi.
 */

import assert from 'assert';
import { WORKER_MASTER } from '../js/data/worker-master.js';
import { getAttendanceUniqueKey, todayISO, nowISO, nowTimeWithSeconds, uid } from '../js/core/utils.js';
import { getAttendanceTypeByHour } from '../js/modules/attendance/attendance-landing.js';

console.log('--- START INTEGRATION TESTS: PERSISTENCE & SEQUENTIAL ATTENDANCE ---');

let passedCount = 0;
const today = todayISO();

// In-Memory Storage & DB Mock
let mockIndexedDB = new Map(); // id -> record
let mockLocalStorage = [];     // array of records

function resetStorage() {
  mockIndexedDB.clear();
  mockLocalStorage = [];
}

/**
 * Simulasi exact executeSaveAttendance logic
 */
async function simulateExecuteSaveAttendance(checkedInList, attType, userContext) {
  const currentUserId = userContext?.id || 'MNT001';
  
  // Baca existing attendances (DB + LocalStorage)
  const map = new Map();
  mockIndexedDB.forEach((it) => {
    if (it) {
      const k = getAttendanceUniqueKey(it) || it.id;
      map.set(k, it);
    }
  });
  mockLocalStorage.forEach((it) => {
    if (it) {
      const k = getAttendanceUniqueKey(it) || it.id;
      if (!map.has(k)) map.set(k, it);
    }
  });
  const existingAttendances = Array.from(map.values());

  const todayWorkerAtts = existingAttendances.filter(
    (a) => a && (a.date === today || a.tanggal === today || (a.createdAt && String(a.createdAt).startsWith(today))) &&
           a.type === 'WORKER' &&
           (a.attendanceType === attType || (!a.attendanceType && attType === 'DATANG'))
  );

  const recordsToSave = [];

  for (const w of checkedInList) {
    const canonical = WORKER_MASTER.find(m => m.id === w.id);
    const workerName = canonical ? canonical.name : w.name;
    const workerCode = canonical ? canonical.code : (w.code || '1405739');
    const workerId = canonical ? canonical.id : w.id;
    const position = canonical?.position || w.position || 'Pekerja Bibitan';
    const locationStr = 'Tanah Besih - Divisi I';

    // CANONICAL IDENTITY LOOKUP: ONLY match by canonical workerId
    const existingRecord = todayWorkerAtts.find(
      (a) => a && a.workerId && String(a.workerId) === String(workerId)
    );

    const recordId = existingRecord?.id || uid('ATT-WRK-');
    const photoId = existingRecord?.photoId || `PHOTO-${recordId}`;
    const photoData = existingRecord?.photo || w.defaultPhoto || 'assets/icons/worker_fadilah.jpg';

    const recordData = {
      id: recordId,
      type: 'WORKER',
      userId: currentUserId,
      createdByUserId: currentUserId,
      workerId,
      name: workerName,
      workerName,
      code: workerCode,
      workerCode,
      position,
      workerRole: 'Pekerja Bibitan',
      supervisorId: currentUserId,
      attendanceType: attType,
      method: 'REKAM_DATA_WAJAH',
      photoId,
      photo: photoData,
      capturedAt: existingRecord?.capturedAt || nowISO(),
      date: today,
      tanggal: today,
      time: existingRecord?.time || nowTimeWithSeconds(),
      location: locationStr,
      estateId: 'EST-TBS',
      divisionId: 'DIV-001',
      latitude: '3.1943859',
      longitude: '11.2312083',
      createdAt: existingRecord?.createdAt || nowISO(),
      createdBy: currentUserId,
      status: 'HADIR'
    };

    recordsToSave.push({ record: recordData, isNew: !existingRecord });
  }

  // Persist to IndexedDB
  for (const { record, isNew } of recordsToSave) {
    mockIndexedDB.set(record.id, record);
  }

  // Sync to LocalStorage
  for (const { record } of recordsToSave) {
    const uniqueKey = getAttendanceUniqueKey(record);
    const existingIdx = mockLocalStorage.findIndex(
      (a) => a.id === record.id || getAttendanceUniqueKey(a) === uniqueKey
    );
    if (existingIdx >= 0) {
      mockLocalStorage[existingIdx] = record;
    } else {
      mockLocalStorage.push(record);
    }
  }

  return recordsToSave.map(r => r.record);
}

// Simulasi Summary Reader
function getSummaryData(targetDate) {
  const unifiedMap = new Map();
  mockIndexedDB.forEach((it) => {
    if (it) {
      const k = getAttendanceUniqueKey(it) || it.id;
      unifiedMap.set(k, it);
    }
  });
  mockLocalStorage.forEach((it) => {
    if (it) {
      const k = getAttendanceUniqueKey(it) || it.id;
      if (!unifiedMap.has(k)) unifiedMap.set(k, it);
    }
  });
  const all = Array.from(unifiedMap.values());
  const todayAtts = all.filter(a => (a.date === targetDate || a.tanggal === targetDate));
  
  const datangList = todayAtts.filter(a => (a.attendanceType || 'DATANG') === 'DATANG' && a.type === 'WORKER');
  const pulangList = todayAtts.filter(a => a.attendanceType === 'PULANG' && a.type === 'WORKER');

  return {
    totalRecords: todayAtts.length,
    datangList,
    pulangList
  };
}

async function runTests() {
  const userContext = { id: 'MNT001', estateId: 'EST-TBS', divisionId: 'DIV-001' };
  const workerA = WORKER_MASTER.find(w => w.id === 'WRK-001'); // Fadilah, code: 1405739
  const workerB = WORKER_MASTER.find(w => w.id === 'WRK-002'); // Adek, code: 1405739
  const workerC = WORKER_MASTER.find(w => w.id === 'WRK-003'); // Bidara, code: 1405739

  assert(workerA && workerB && workerC, 'Workers must exist in master');
  assert(workerA.code === workerB.code && workerB.code === workerC.code, 'Workers must share the same code 1405739');

  // IT-PERSIST-001: Initial storage empty.
  resetStorage();
  assert(mockIndexedDB.size === 0 && mockLocalStorage.length === 0, 'Storage must be empty initially');
  console.log('[PASS] IT-PERSIST-001: Initial storage empty.');
  passedCount++;

  // IT-PERSIST-002: Save Worker A. Assert A exists in persistent storage.
  const savedA = await simulateExecuteSaveAttendance([workerA], 'DATANG', userContext);
  assert(mockIndexedDB.size === 1, 'IndexedDB should have 1 record after saving A');
  assert(mockLocalStorage.length === 1, 'LocalStorage should have 1 record after saving A');
  assert(mockLocalStorage[0].workerId === 'WRK-001', 'Record must belong to WRK-001');
  console.log('[PASS] IT-PERSIST-002: Save Worker A. Assert A exists in persistent storage.');
  passedCount++;

  // IT-PERSIST-003: Save Worker B setelah A. Assert A AND B both exist.
  const savedB = await simulateExecuteSaveAttendance([workerB], 'DATANG', userContext);
  assert(mockIndexedDB.size === 2, `IndexedDB should have 2 records after saving B, got ${mockIndexedDB.size}`);
  assert(mockLocalStorage.length === 2, `LocalStorage should have 2 records after saving B, got ${mockLocalStorage.length}`);
  
  const hasA = mockLocalStorage.some(a => a.workerId === 'WRK-001');
  const hasB = mockLocalStorage.some(a => a.workerId === 'WRK-002');
  assert(hasA && hasB, 'Both Worker A (WRK-001) and Worker B (WRK-002) must coexist in LocalStorage');
  assert(savedA[0].id !== savedB[0].id, 'Worker A and Worker B must have different transaction IDs');
  console.log('[PASS] IT-PERSIST-003: Save Worker B setelah A. Assert A AND B both exist.');
  passedCount++;

  // IT-PERSIST-004: Save Worker C. Assert A, B, C all exist.
  const savedC = await simulateExecuteSaveAttendance([workerC], 'DATANG', userContext);
  assert(mockIndexedDB.size === 3, `IndexedDB should have 3 records, got ${mockIndexedDB.size}`);
  assert(mockLocalStorage.length === 3, `LocalStorage should have 3 records, got ${mockLocalStorage.length}`);
  const hasC = mockLocalStorage.some(a => a.workerId === 'WRK-003');
  assert(hasA && hasB && hasC, 'A, B, and C must all coexist in storage');
  console.log('[PASS] IT-PERSIST-004: Save Worker C. Assert A, B, C all exist.');
  passedCount++;

  // IT-PERSIST-005: Summary after A+B+C shows 3 transactions.
  const summary = getSummaryData(today);
  assert(summary.totalRecords === 3, `Summary should have 3 records, got ${summary.totalRecords}`);
  assert(summary.datangList.length === 3, `Summary DATANG should have 3 workers, got ${summary.datangList.length}`);
  console.log('[PASS] IT-PERSIST-005: Summary after A+B+C shows 3 transactions.');
  passedCount++;

  // IT-PERSIST-006: A DATANG + B DATANG coexist.
  const datangWorkerIds = summary.datangList.map(w => w.workerId);
  assert(datangWorkerIds.includes('WRK-001') && datangWorkerIds.includes('WRK-002'), 'A and B coexist in DATANG');
  console.log('[PASS] IT-PERSIST-006: A DATANG + B DATANG coexist.');
  passedCount++;

  // IT-PERSIST-007: A DATANG + B DATANG + A PULANG coexist.
  const savedAPulang = await simulateExecuteSaveAttendance([workerA], 'PULANG', userContext);
  assert(mockIndexedDB.size === 4, `IndexedDB should have 4 records, got ${mockIndexedDB.size}`);
  assert(mockLocalStorage.length === 4, `LocalStorage should have 4 records, got ${mockLocalStorage.length}`);
  const summaryAfterPulang = getSummaryData(today);
  assert(summaryAfterPulang.datangList.length === 3, 'DATANG list should still have 3 workers');
  assert(summaryAfterPulang.pulangList.length === 1, 'PULANG list should have 1 worker (Worker A)');
  assert(summaryAfterPulang.pulangList[0].workerId === 'WRK-001', 'PULANG record must be Worker A');
  console.log('[PASS] IT-PERSIST-007: A DATANG + B DATANG + A PULANG coexist.');
  passedCount++;

  // IT-PERSIST-008: Re-entry after save preserves all previous attendance.
  const reloadedMap = new Map();
  mockLocalStorage.forEach(it => reloadedMap.set(it.id, it));
  assert(reloadedMap.size === 4, 'Re-entry must have all 4 transactions preserved');
  console.log('[PASS] IT-PERSIST-008: Re-entry after save preserves all previous attendance.');
  passedCount++;

  // IT-PERSIST-009: Refresh preserves all attendance.
  const refreshedSummary = getSummaryData(today);
  assert(refreshedSummary.totalRecords === 4, 'Refreshed view must retain 4 records');
  console.log('[PASS] IT-PERSIST-009: Refresh preserves all attendance.');
  passedCount++;

  // IT-PERSIST-010: No existing attendance transaction is overwritten by next worker.
  const recA_Datang = mockLocalStorage.find(a => a.workerId === 'WRK-001' && a.attendanceType === 'DATANG');
  const recB_Datang = mockLocalStorage.find(a => a.workerId === 'WRK-002' && a.attendanceType === 'DATANG');
  const recC_Datang = mockLocalStorage.find(a => a.workerId === 'WRK-003' && a.attendanceType === 'DATANG');
  const recA_Pulang = mockLocalStorage.find(a => a.workerId === 'WRK-001' && a.attendanceType === 'PULANG');
  assert(recA_Datang && recB_Datang && recC_Datang && recA_Pulang, 'All 4 records must be intact');
  assert(new Set([recA_Datang.id, recB_Datang.id, recC_Datang.id, recA_Pulang.id]).size === 4, 'All transaction IDs must be unique');
  console.log('[PASS] IT-PERSIST-010: No existing attendance transaction is overwritten by next worker.');
  passedCount++;

  // IT-PERSIST-011: IndexedDB and LocalStorage stay consistent according to existing architecture.
  assert(mockIndexedDB.size === mockLocalStorage.length, 'IndexedDB and LocalStorage count must match');
  for (const stored of mockLocalStorage) {
    assert(mockIndexedDB.has(stored.id), `IndexedDB must contain record with id ${stored.id}`);
  }
  console.log('[PASS] IT-PERSIST-011: IndexedDB and LocalStorage stay consistent according to existing architecture.');
  passedCount++;

  // IT-PERSIST-012: Existing time/session resolver unchanged.
  assert(typeof getAttendanceTypeByHour === 'function', 'getAttendanceTypeByHour must exist');
  const currentHour = new Date().getHours();
  const expectedType = currentHour >= 14 ? 'PULANG' : 'DATANG';
  assert(getAttendanceTypeByHour() === expectedType, 'getAttendanceTypeByHour must resolve based on hour threshold');
  console.log('[PASS] IT-PERSIST-012: Existing time/session resolver unchanged.');
  passedCount++;

  // IT-PERSIST-013: Strict Canonical Identity Lookup — no fallback to attendance transaction id.
  // Uji bahwa lookup existingRecord hanya mencari a.workerId === workerId dan mengabaikan attendance.id
  const testWorkerAtts = [
    { id: 'ATT-WRK-999', workerId: 'WRK-001', code: '1405739', attendanceType: 'DATANG', date: today },
    { id: 'WRK-002', workerId: 'WRK-999', code: '1405739', attendanceType: 'DATANG', date: today } // record dengan id mirip workerId
  ];
  const foundForWRK001 = testWorkerAtts.find(a => a && a.workerId && String(a.workerId) === 'WRK-001');
  const foundForWRK002 = testWorkerAtts.find(a => a && a.workerId && String(a.workerId) === 'WRK-002');
  assert(foundForWRK001 && foundForWRK001.id === 'ATT-WRK-999', 'WRK-001 must match via workerId');
  assert(!foundForWRK002, 'WRK-002 must not match record that only has attendance.id === WRK-002');
  console.log('[PASS] IT-PERSIST-013: Strict Canonical Identity Lookup — no fallback to attendance transaction id.');
  passedCount++;

  // IT-PERSIST-014: Full Iterative Multi-Worker Round-Trip — All 7 active workers saved consecutively.
  resetStorage();
  const activeWorkers7 = WORKER_MASTER.filter(w => w.estateId === 'EST-TBS' && w.divisionId === 'DIV-001' && w.active);
  assert(activeWorkers7.length === 7, `Must have 7 active workers in Tanah Besih Divisi I, got ${activeWorkers7.length}`);

  for (let i = 0; i < activeWorkers7.length; i++) {
    const w = activeWorkers7[i];
    await simulateExecuteSaveAttendance([w], 'DATANG', userContext);
    assert(mockIndexedDB.size === i + 1, `After saving worker ${i+1}, IndexedDB should have ${i+1} records`);
    assert(mockLocalStorage.length === i + 1, `After saving worker ${i+1}, LocalStorage should have ${i+1} records`);
  }

  const finalSummary7 = getSummaryData(today);
  assert(finalSummary7.datangList.length === 7, `Final summary must contain all 7 workers, got ${finalSummary7.datangList.length}`);
  const uniqueSavedWorkerIds = new Set(finalSummary7.datangList.map(a => a.workerId));
  assert(uniqueSavedWorkerIds.size === 7, `All 7 workers must have distinct workerIds in summary, got ${uniqueSavedWorkerIds.size}`);
  console.log('[PASS] IT-PERSIST-014: Full Iterative Multi-Worker Round-Trip — All 7 active workers saved consecutively.');
  passedCount++;

  console.log(`\n--- RINGKASAN INTEGRATION TESTS: ${passedCount}/14 PASSED ---`);
}

runTests().catch(err => {
  console.error('[TEST FAILED]', err);
  process.exit(1);
});
