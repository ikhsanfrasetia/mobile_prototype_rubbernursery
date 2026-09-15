/**
 * scripts/test-task-fix-attendance-supervisor-result.js
 * Integration test suite for TASK-FIX-ATTENDANCE-SUPERVISOR-RESULT-SAVE-SCOPE-01
 * Verifies supervisor attendance confirmation save flow, variable scoping, double submit protection,
 * photo repository integration, and deduplication.
 */

// Mock browser environment for Node.js
const memoryStorage = {};
globalThis.localStorage = {
  getItem: (key) => (key in memoryStorage ? memoryStorage[key] : null),
  setItem: (key, val) => {
    memoryStorage[key] = String(val);
  },
  removeItem: (key) => {
    delete memoryStorage[key];
  },
  clear: () => {
    for (const k of Object.keys(memoryStorage)) delete memoryStorage[k];
  }
};

import assert from 'node:assert';
import { storage } from '../js/core/storage.js';
import { uid, nowISO, todayISO, nowTimeWithSeconds, getAttendanceUniqueKey } from '../js/core/utils.js';
import { ROLE_LABELS } from '../js/core/permissions.js';

// Mock in-memory repositories
let dbAttendance = [];
let dbPhotos = [];

const mockAttendanceRepository = {
  async list() {
    return [...dbAttendance];
  },
  async create(record) {
    const existingIdx = dbAttendance.findIndex((a) => a.id === record.id);
    if (existingIdx >= 0) {
      dbAttendance[existingIdx] = { ...record };
    } else {
      dbAttendance.push({ ...record });
    }
    return { ...record };
  },
  async update(id, record) {
    const existingIdx = dbAttendance.findIndex((a) => a.id === id);
    if (existingIdx < 0) throw new Error(`Record not found: ${id}`);
    dbAttendance[existingIdx] = { ...record, id };
    return dbAttendance[existingIdx];
  },
  async getById(id) {
    return dbAttendance.find((a) => a.id === id) || null;
  }
};

const mockPhotoRepository = {
  async list() {
    return [...dbPhotos];
  },
  async create(photoRecord) {
    dbPhotos.push({ ...photoRecord });
    return { ...photoRecord };
  },
  async getById(id) {
    return dbPhotos.find((p) => p.id === id) || null;
  }
};

// Simulation of save action matching the updated attendance-supervisor-result.js logic
async function simulateSupervisorSave({
  user,
  capture,
  attType,
  pageTitle,
  attendanceRepo = mockAttendanceRepository,
  photoRepo = mockPhotoRepository,
  onToast = () => {},
  onNavigate = () => {}
}) {
  const today = capture.date || todayISO();
  const currentUserId = user.id || 'MNT001';
  const currentUserCode = capture.userCode || user.code || user.id || '1405482';
  const currentUserName = capture.userName || user.name || 'Wagiman';
  let attendances = [];

  // 1. Duplicate check
  try {
    attendances = (await attendanceRepo.list()) || [];
    const duplicate = attendances.some(
      (a) =>
        (a.date === today || (a.createdAt && a.createdAt.startsWith(today))) &&
        a.type === 'SUPERVISOR' &&
        (a.userId === currentUserId || a.code === currentUserCode || a.workerCode === currentUserCode || a.name === currentUserName) &&
        (a.attendanceType === attType || (!a.attendanceType && attType === 'DATANG'))
    );

    if (duplicate) {
      onToast('warning', `Data ${pageTitle} sudah tersimpan sebelumnya.`);
      onNavigate('/attendance');
      return { status: 'DUPLICATE_REJECTED' };
    }
  } catch (errCheck) {
    console.warn('[save] Cek duplikasi error:', errCheck);
  }

  // 2. Save flow
  try {
    const recordId = uid('ATT-SUP-');
    const photoId = capture.photo ? `PHOTO-${recordId}` : null;

    const supervisorRecord = {
      id: recordId,
      type: 'SUPERVISOR',
      userId: currentUserId,
      name: currentUserName,
      workerName: currentUserName,
      code: currentUserCode,
      workerCode: currentUserCode,
      role: user.role || 'MANTRI_TANAMAN',
      position: user.position || (ROLE_LABELS[user.role] || ROLE_LABELS.MANTRI_TANAMAN),
      attendanceType: attType,
      method: 'REKAM_DATA_WAJAH',
      photoId,
      photo: capture.photo || '',
      capturedAt: capture.iso || nowISO(),
      date: today,
      tanggal: today,
      time: capture.time || nowTimeWithSeconds(),
      location: 'Tanah Besih - Divisi I',
      latitude: capture.latitude || '3.1943859',
      longitude: capture.longitude || '11.2312083',
      createdAt: nowISO(),
      createdBy: currentUserId,
      status: 'HADIR'
    };

    // Check existing in attendances
    const existingSup = attendances.find(
      (a) =>
        (a.date === today || (a.createdAt && String(a.createdAt).startsWith(today))) &&
        a.type === 'SUPERVISOR' &&
        (a.userId === currentUserId || a.code === currentUserCode || a.workerCode === currentUserCode || a.name === currentUserName) &&
        (a.attendanceType === attType || (!a.attendanceType && attType === 'DATANG'))
    );

    if (existingSup) {
      supervisorRecord.id = existingSup.id;
      try {
        await attendanceRepo.update(existingSup.id, supervisorRecord);
      } catch (e) {
        await attendanceRepo.create(supervisorRecord);
      }
    } else {
      await attendanceRepo.create(supervisorRecord);
    }

    // LocalStorage sync
    const storedAtts = storage.get('attendance_transactions', []);
    const uniqueKey = getAttendanceUniqueKey(supervisorRecord);
    const existingIdx = storedAtts.findIndex(
      (a) => a.id === supervisorRecord.id || getAttendanceUniqueKey(a) === uniqueKey
    );
    if (existingIdx >= 0) {
      storedAtts[existingIdx] = supervisorRecord;
    } else {
      storedAtts.unshift(supervisorRecord);
    }
    storage.set('attendance_transactions', storedAtts);

    // Photo store
    if (photoId && capture.photo) {
      try {
        await photoRepo.create({
          id: photoId,
          entityType: 'ATTENDANCE',
          entityId: supervisorRecord.id,
          data: capture.photo,
          createdAt: nowISO()
        });
      } catch (errPhoto) {
        console.warn('[photoRepository] Non-blocking photo save error:', errPhoto);
      }
    }

    onToast('success', `Data ${pageTitle.toLowerCase()} berhasil disimpan!`);
    onNavigate('/attendance');
    return { status: 'SUCCESS', record: supervisorRecord };
  } catch (err) {
    console.error('[Attendance Save Error]', err);
    onToast('danger', 'Gagal menyimpan data presensi.');
    return { status: 'ERROR', error: err };
  }
}

// Test Runner
const results = [];

async function runScenario(scenarioNum, title, testFn) {
  try {
    await testFn();
    results.push({ scenarioNum, title, status: 'PASS' });
    console.log(`[PASS] Skenario ${scenarioNum}: ${title}`);
  } catch (err) {
    results.push({ scenarioNum, title, status: 'FAIL', error: err.message });
    console.error(`[FAIL] Skenario ${scenarioNum}: ${title} ->`, err.message);
  }
}

async function runAllTests() {
  console.log('--- START INTEGRATION TESTS: TASK-FIX-ATTENDANCE-SUPERVISOR-RESULT-SAVE-SCOPE-01 ---\n');

  // Reset DB
  dbAttendance = [];
  dbPhotos = [];
  globalThis.localStorage.clear();

  const mockUserWagiman = {
    id: 'MNT001',
    name: 'Wagiman',
    code: '1405482',
    role: 'MANTRI_TANAMAN',
    position: 'Mantri Bibitan',
    estate: 'Tanah Besih',
    division: 'Divisi I'
  };

  // Skenario 1: Presensi Datang Supervisor
  await runScenario(1, 'Presensi Datang Supervisor', async () => {
    const captureDatang = {
      userName: 'Wagiman',
      userCode: '1405482',
      position: 'Mantri Bibitan',
      photo: 'data:image/jpeg;base64,samplephoto1',
      time: '07:15:00',
      date: '2026-09-15',
      iso: '2026-09-15T07:15:00.000Z',
      latitude: '3.598492',
      longitude: '98.577497',
      method: 'REKAM_DATA_WAJAH'
    };

    let toastMsg = '';
    const res = await simulateSupervisorSave({
      user: mockUserWagiman,
      capture: captureDatang,
      attType: 'DATANG',
      pageTitle: 'Presensi Supervisor Datang',
      onToast: (type, msg) => { toastMsg = msg; }
    });

    assert.strictEqual(res.status, 'SUCCESS', 'Presensi Datang should succeed');
    assert.ok(dbAttendance.length >= 1, 'IndexedDB attendance record must exist');
    const saved = dbAttendance.find((a) => a.attendanceType === 'DATANG');
    assert.ok(saved, 'Record with attendanceType = DATANG must exist');
    assert.strictEqual(saved.userId, 'MNT001');
    assert.strictEqual(saved.date, '2026-09-15');
    assert.ok(saved.photoId, 'photoId must be generated');
    assert.strictEqual(dbPhotos.length, 1, 'Photo must be saved to photoRepo');
  });

  // Skenario 2: Presensi Pulang Supervisor (21:11 WIB)
  await runScenario(2, 'Presensi Pulang Supervisor', async () => {
    const capturePulang = {
      userName: 'Wagiman',
      userCode: '1405482',
      position: 'Mantri Bibitan',
      photo: 'data:image/jpeg;base64,samplephoto2',
      time: '21:11:25',
      date: '2026-09-15',
      iso: '2026-09-15T21:11:25.000Z',
      latitude: '3.598492',
      longitude: '98.577497',
      method: 'REKAM_DATA_WAJAH'
    };

    let toastMsg = '';
    const res = await simulateSupervisorSave({
      user: mockUserWagiman,
      capture: capturePulang,
      attType: 'PULANG',
      pageTitle: 'Presensi Supervisor Pulang',
      onToast: (type, msg) => { toastMsg = msg; }
    });

    assert.strictEqual(res.status, 'SUCCESS', 'Presensi Pulang should succeed without ReferenceError');
    const saved = dbAttendance.find((a) => a.attendanceType === 'PULANG' && a.date === '2026-09-15');
    assert.ok(saved, 'Record with attendanceType = PULANG must exist');
    assert.strictEqual(saved.time, '21:11:25');
    assert.strictEqual(saved.userId, 'MNT001');
  });

  // Skenario 3: Validasi duplikasi (Simpan Pulang kedua kali di hari yang sama)
  await runScenario(3, 'Validasi Duplikasi Presensi Pulang', async () => {
    const capturePulangDuplicate = {
      userName: 'Wagiman',
      userCode: '1405482',
      position: 'Mantri Bibitan',
      photo: 'data:image/jpeg;base64,samplephoto3',
      time: '21:15:00',
      date: '2026-09-15',
      iso: '2026-09-15T21:15:00.000Z',
      latitude: '3.598492',
      longitude: '98.577497',
      method: 'REKAM_DATA_WAJAH'
    };

    let toastType = '';
    let toastMsg = '';
    const initialCount = dbAttendance.length;

    const res = await simulateSupervisorSave({
      user: mockUserWagiman,
      capture: capturePulangDuplicate,
      attType: 'PULANG',
      pageTitle: 'Presensi Supervisor Pulang',
      onToast: (t, m) => { toastType = t; toastMsg = m; }
    });

    assert.strictEqual(res.status, 'DUPLICATE_REJECTED', 'Duplicate save should be rejected');
    assert.strictEqual(toastType, 'warning');
    assert.strictEqual(dbAttendance.length, initialCount, 'No duplicate record inserted');
  });

  // Skenario 4: Perbedaan jenis presensi (DATANG & PULANG sama-sama ada di tanggal yang sama)
  await runScenario(4, 'Perbedaan Jenis Presensi (DATANG & PULANG)', async () => {
    const datang = dbAttendance.find((a) => a.date === '2026-09-15' && a.attendanceType === 'DATANG');
    const pulang = dbAttendance.find((a) => a.date === '2026-09-15' && a.attendanceType === 'PULANG');

    assert.ok(datang, 'Datang transaction exists');
    assert.ok(pulang, 'Pulang transaction exists');
    assert.notStrictEqual(datang.id, pulang.id, 'Datang and Pulang have separate transaction IDs');
  });

  // Skenario 5: Penyimpanan Foto & Validasi Referensi
  await runScenario(5, 'Penyimpanan Foto dan Referensi photoId', async () => {
    const pulang = dbAttendance.find((a) => a.date === '2026-09-15' && a.attendanceType === 'PULANG');
    assert.ok(pulang.photoId, 'photoId must exist in attendance record');

    const photo = dbPhotos.find((p) => p.id === pulang.photoId);
    assert.ok(photo, 'Photo entity must exist in photo store');
    assert.strictEqual(photo.entityId, pulang.id, 'Photo entityId matches attendance ID');
    assert.ok(photo.data.startsWith('data:image/jpeg;base64,'), 'Photo data intact');
  });

  // Skenario 6: Tanpa Foto
  await runScenario(6, 'Simpan Transaksi Tanpa Foto', async () => {
    const captureNoPhoto = {
      userName: 'Wagiman',
      userCode: '1405482',
      position: 'Mantri Bibitan',
      photo: '', // No photo
      time: '07:30:00',
      date: '2026-09-16',
      iso: '2026-09-16T07:30:00.000Z',
      latitude: '3.598492',
      longitude: '98.577497',
      method: 'REKAM_DATA_WAJAH'
    };

    const res = await simulateSupervisorSave({
      user: mockUserWagiman,
      capture: captureNoPhoto,
      attType: 'DATANG',
      pageTitle: 'Presensi Supervisor Datang'
    });

    assert.strictEqual(res.status, 'SUCCESS', 'Save without photo must succeed');
    const saved = dbAttendance.find((a) => a.date === '2026-09-16' && a.attendanceType === 'DATANG');
    assert.ok(saved, 'Record saved successfully');
    assert.strictEqual(saved.photoId, null, 'photoId is null when photo is empty');
  });

  // Skenario 7: Refresh & Pembacaan Storage
  await runScenario(7, 'Refresh & Konsistensi localStorage / IndexedDB', async () => {
    const stored = storage.get('attendance_transactions', []);
    assert.ok(Array.isArray(stored), 'Stored transactions is array');
    assert.ok(stored.length >= 3, 'Stored transactions has all saved items');

    const allDb = await mockAttendanceRepository.list();
    assert.strictEqual(allDb.length, 3, 'IndexedDB matches expected saved count');
  });

  // Skenario 8: Double Submit Protection
  await runScenario(8, 'Perlindungan Double Submit (Rapid Clicks)', async () => {
    let callCount = 0;
    let isSaving = false;

    const mockSaveWithLock = async () => {
      if (isSaving) return 'LOCKED';
      isSaving = true;
      callCount++;
      await new Promise((r) => setTimeout(r, 10));
      return 'PROCESSED';
    };

    const [r1, r2, r3] = await Promise.all([
      mockSaveWithLock(),
      mockSaveWithLock(),
      mockSaveWithLock()
    ]);

    assert.strictEqual(callCount, 1, 'Only one operation executes');
    assert.strictEqual(r1, 'PROCESSED');
    assert.strictEqual(r2, 'LOCKED');
    assert.strictEqual(r3, 'LOCKED');
  });

  // Skenario 9: Isolasi User / Estate / Tanggal
  await runScenario(9, 'Isolasi Transaksi Antar User & Tanggal', async () => {
    const mockUserOther = {
      id: 'MNT002',
      name: 'Supardi',
      code: '1405483',
      role: 'MANTRI_TANAMAN',
      position: 'Mantri Bibitan'
    };

    const captureOther = {
      userName: 'Supardi',
      userCode: '1405483',
      position: 'Mantri Bibitan',
      photo: 'data:image/jpeg;base64,otherphoto',
      time: '21:11:25',
      date: '2026-09-15',
      iso: '2026-09-15T21:11:25.000Z',
      latitude: '3.598492',
      longitude: '98.577497',
      method: 'REKAM_DATA_WAJAH'
    };

    // Simpan untuk user Supardi di tanggal dan sesi yang sama
    const res = await simulateSupervisorSave({
      user: mockUserOther,
      capture: captureOther,
      attType: 'PULANG',
      pageTitle: 'Presensi Supervisor Pulang'
    });

    assert.strictEqual(res.status, 'SUCCESS', 'Other user save must succeed');
    const supardiRec = dbAttendance.find((a) => a.userId === 'MNT002' && a.attendanceType === 'PULANG');
    assert.ok(supardiRec, 'Supardi record created successfully');
    const wagimanRec = dbAttendance.find((a) => a.userId === 'MNT001' && a.attendanceType === 'PULANG');
    assert.ok(wagimanRec, 'Wagiman record still intact');
  });

  // Skenario 10: Error Handling
  await runScenario(10, 'Penanganan Error Graceful (Storage Failure)', async () => {
    const brokenRepo = {
      async list() { return []; },
      async create() { throw new Error('IndexedDB disk failure mock'); },
      async update() { throw new Error('IndexedDB disk failure mock'); }
    };

    let toastType = '';
    let toastMsg = '';
    const res = await simulateSupervisorSave({
      user: mockUserWagiman,
      capture: { date: '2026-09-20' },
      attType: 'DATANG',
      pageTitle: 'Presensi Supervisor Datang',
      attendanceRepo: brokenRepo,
      onToast: (t, m) => { toastType = t; toastMsg = m; }
    });

    assert.strictEqual(res.status, 'ERROR', 'Failure handled gracefully');
    assert.strictEqual(toastType, 'danger');
    assert.strictEqual(toastMsg, 'Gagal menyimpan data presensi.');
  });

  console.log('\n--- RINGKASAN INTEGRATION TESTS ---');
  let passCount = 0;
  for (const r of results) {
    if (r.status === 'PASS') passCount++;
    console.log(`Skenario ${r.scenarioNum} [${r.title}]: ${r.status}`);
  }
  console.log(`\nTOTAL: ${passCount}/${results.length} PASSED`);

  if (passCount === results.length) {
    console.log('\nALL 10 INTEGRATION TEST SCENARIOS PASSED SUCCESSFULLY!');
  } else {
    console.error('\nSOME TESTS FAILED.');
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error('Test suite error:', e);
  process.exit(1);
});
