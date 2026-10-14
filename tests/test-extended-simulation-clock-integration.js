/**
 * tests/test-extended-simulation-clock-integration.js
 * Integration Test Suite for Extended Mantri Bibitan Time Simulator across Nursery Modules
 *
 * Verifikasi:
 * 1. Simulasi waktu existing tetap berfungsi pada Presensi.
 * 2. Modul operasional yang diintegrasikan menggunakan tanggal simulasi.
 * 3. Pengaturan tetap tersimpan setelah reload (localStorage persistence).
 * 4. Transaksi baru mengikuti tanggal simulasi saat dibuat (Dederan, Seleksi, CULL, Okulasi, Seeding).
 * 5. Transaksi historis tetap menggunakan tanggal aslinya.
 * 6. Filter tanggal dapat menemukan transaksi pada tanggal simulasi.
 * 7. Mematikan simulasi mengembalikan perilaku waktu perangkat.
 * 8. Timestamp aktual foto/GPS tidak tertimpa.
 * 9. Tidak ada duplikasi transaksi atau perubahan stok yang tidak sah.
 */

import assert from 'assert';
import { 
  getSimulationState, 
  setSimulationState, 
  clearSimulationState, 
  isSimulationActive, 
  getEffectiveDate, 
  getEffectiveHour, 
  getEffectiveTimeWithSeconds, 
  getEffectiveTodayDDMMYYYY,
  SIMULATION_CLOCK_STORAGE_KEY 
} from '../js/core/simulation-clock-service.js';
import { todayISO, todayDDMMYYYY, formatDate } from '../js/core/utils.js';
import { session } from '../js/core/session.js';
import { storage } from '../js/core/storage.js';
import { ROLES } from '../js/core/permissions.js';
import { getGlobalAttendanceGateStatus } from '../js/core/attendance-gate-service.js';
import { getAttendanceTypeByHour } from '../js/modules/attendance/attendance-landing.js';
import { 
  saveDederanTransaction, 
  saveDederanInspection, 
  DEDERAN_STORAGE_KEYS 
} from '../js/modules/seeding/dederan-manager.js';
import { 
  declareSelectionItem, 
  createPreGraftingSelectionDocument,
  createSeleksi1ExecutionTransaction,
  SELECTION_STORAGE_KEY,
  PRE_GRAFTING_SELECTION_DOC_STORAGE_KEY
} from '../js/modules/selection/selection-manager.js';

// Setup mock browser globals in Node if needed
if (typeof global.localStorage === 'undefined') {
  const memStore = new Map();
  global.localStorage = {
    getItem: (k) => memStore.get(k) || null,
    setItem: (k, v) => memStore.set(k, String(v)),
    removeItem: (k) => memStore.delete(k),
    clear: () => memStore.clear()
  };
}

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`✅ PASS: ${name}`);
  } catch (err) {
    results.push({ name, passed: false, error: err.message });
    console.error(`❌ FAIL: ${name} -> ${err.message}`);
  }
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('INTEGRATION TEST: EXTENDED MANTRI BIBITAN TIME SIMULATOR');
  console.log('================================================================\n');

  // Clear environment
  clearSimulationState();
  if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
    localStorage.clear();
  }

  const mantriUser = {
    userId: 'MNT001',
    code: '1405482',
    role: ROLES.MANTRI_TANAMAN,
    name: 'Wagiman',
    position: 'Mantri Bibitan',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001'
  };

  session.start(mantriUser);

  // 1. Verifikasi: Simulasi waktu existing tetap berfungsi pada Presensi
  test('1. Simulasi waktu existing tetap berfungsi pada Presensi', () => {
    setSimulationState({ enabled: true, simulatedDate: '2026-11-15', simulatedTime: '07:30' });
    assert.strictEqual(isSimulationActive(), true, 'Simulasi harus aktif');
    assert.strictEqual(getEffectiveHour(), 7, 'Jam efektif harus 7');
    assert.strictEqual(getAttendanceTypeByHour(), 'DATANG', 'Slot presensi jam 07:30 harus DATANG');

    const gate = getGlobalAttendanceGateStatus(mantriUser);
    assert.strictEqual(gate.date, '2026-11-15', 'Attendance gate targetDate harus mengikuti tanggal simulasi');
    assert.strictEqual(gate.isGateUnlocked, false, 'Gate harus locked sebelum ada presensi 2026-11-15');

    // Catat presensi supervisor pada tanggal simulasi
    const attendances = [{
      id: 'ATT-001',
      date: '2026-11-15',
      tanggal: '2026-11-15',
      type: 'SUPERVISOR',
      session: 'DATANG',
      status: 'HADIR',
      estateId: 'EST-TBS',
      divisionId: 'DIV-001',
      userId: 'MNT001'
    }, {
      id: 'ATT-002',
      date: '2026-11-15',
      tanggal: '2026-11-15',
      type: 'WORKER',
      session: 'DATANG',
      status: 'HADIR',
      estateId: 'EST-TBS',
      divisionId: 'DIV-001',
      userId: 'W001'
    }];
    storage.set('attendance_transactions', attendances);

    const unlockedGate = getGlobalAttendanceGateStatus(mantriUser);
    assert.strictEqual(unlockedGate.isGateUnlocked, true, 'Gate harus unlocked setelah presensi pada tanggal simulasi');
  });

  // 2. Verifikasi: Modul operasional menggunakan tanggal simulasi
  test('2. Modul operasional yang diintegrasikan membaca tanggal simulasi bersama', () => {
    assert.strictEqual(getEffectiveDate(), '2026-11-15', 'getEffectiveDate harus 2026-11-15');
    assert.strictEqual(getEffectiveTodayDDMMYYYY(), '15/11/2026', 'getEffectiveTodayDDMMYYYY harus 15/11/2026');
    assert.strictEqual(todayISO(), '2026-11-15', 'todayISO() harus menghasilkan tanggal simulasi');
    assert.strictEqual(todayDDMMYYYY(), '15/11/2026', 'todayDDMMYYYY() harus menghasilkan tanggal simulasi');
  });

  // 3. Verifikasi: Pengaturan tetap tersimpan setelah reload
  test('3. Pengaturan tetap tersimpan setelah reload (localStorage persistence)', () => {
    const raw = localStorage.getItem(SIMULATION_CLOCK_STORAGE_KEY);
    assert.ok(raw, 'Raw localStorage harus ada');
    const parsed = JSON.parse(raw);
    assert.strictEqual(parsed.enabled, true);
    assert.strictEqual(parsed.simulatedDate, '2026-11-15');
    assert.strictEqual(parsed.simulatedTime, '07:30');

    // Simulasi fresh read
    const state = getSimulationState();
    assert.strictEqual(state.enabled, true);
    assert.strictEqual(state.simulatedDate, '2026-11-15');
    assert.strictEqual(state.simulatedTime, '07:30');
  });

  // 4. Verifikasi: Transaksi baru mengikuti tanggal simulasi saat dibuat
  test('4. Transaksi baru mengikuti tanggal simulasi saat dibuat', () => {
    // A. Dederan Transaksi Baru
    const parentInduk = {
      id: 'DED-IND-001',
      docNo: '2026/DED/001',
      sourceReceiptDocNo: '2026/RCV/001',
      estateId: 'EST-TBS',
      divisionId: 'DIV-001',
      programId: 'PRG-01',
      programCode: 'PRG-01',
      klon: 'GT 1',
      totalNilaiButirPenerimaan: 10000,
      totalDidederSDHI: 0,
      sisaBelumDeder: 10000,
      status: 'Belum Dideder'
    };
    storage.set(DEDERAN_STORAGE_KEYS.INDUK, [parentInduk]);

    const dedTx = saveDederanTransaction({
      parentDederIndukDocNo: '2026/DED/001',
      bedenganId: 'BED-001',
      bedenganCode: 'BED-001',
      jumlahDeder: 5000,
      createdBy: 'Wagiman'
    });
    assert.strictEqual(dedTx.tanggalDeder, '15/11/2026', 'Tanggal dederan baru harus 15/11/2026');

    // B. Dederan Pemeriksaan Baru
    const inspRes = saveDederanInspection({
      dederanTxDocNo: dedTx.docNo,
      jumlahDiperiksa: 5000,
      jumlahBerhasil: 4800,
      inspectorName: 'Wagiman'
    });
    assert.strictEqual(inspRes.inspection.tanggalPemeriksaan, '15/11/2026', 'Tanggal pemeriksaan dederan baru harus 15/11/2026');

    // C. Dokumen Seleksi I dan Pelaksanaan Seleksi I Baru
    const seedingTx = {
      id: 'SOW-001',
      docNo: '2026/SOW/001',
      date: '15/11/2026',
      tanggal: '15/11/2026',
      batchId: 'BTCH-001',
      batchCode: 'BTCH-001',
      bedenganId: 'BED-001',
      bedenganCode: 'BED-001',
      estateId: 'EST-TBS',
      divisionId: 'DIV-001',
      polybag: 2500,
      disemai: 5000,
      status: 'DISETUJUI',
      verificationStatus: 'TERVERIFIKASI'
    };
    storage.set('seeding_transactions', [seedingTx]);
    const selDoc = createPreGraftingSelectionDocument(seedingTx, mantriUser, { docNo: '2026/SEL/001' });
    assert.ok(selDoc, 'Dokumen seleksi pra-okulasi harus terbuat');

    const sel1Res = createSeleksi1ExecutionTransaction({
      selectionDocumentId: selDoc.id,
      actualPolybagInspectedQty: 2500,
      actualBibitSelectedQty: 200,
      cullCategory: 'AFKIR'
    }, mantriUser);
    const sel1Tx = sel1Res.transaction;
    assert.strictEqual(sel1Tx.tanggalSeleksi, '15/11/2026', 'Tanggal transaksi Seleksi I baru harus 15/11/2026');

    // D. Deklarasi CULL Baru
    const poolItem = {
      id: 'POOL-001',
      originType: 'REJECT_PENYEMAIAN',
      sourceModule: 'PENYEMAIAN',
      sourceTransactionType: 'SEEDING',
      sourceDocNo: '2026/SOW/001',
      quantity: 50,
      batchId: 'BTCH-001',
      bedenganCode: 'BED-001',
      estateId: 'EST-TBS',
      divisionId: 'DIV-001'
    };
    const cullRes = declareSelectionItem(poolItem, null, mantriUser);
    const cullTx = cullRes.transaction;
    assert.strictEqual(cullTx.tanggalSeleksi, '15/11/2026', 'Tanggal deklarasi CULL baru harus 15/11/2026');
  });

  // 5. Verifikasi: Transaksi historis tetap menggunakan tanggal aslinya
  test('5. Transaksi historis tetap mempertahankan tanggal aslinya', () => {
    const historicalTx = {
      id: 'HIST-TX-001',
      docNo: '2026/SOW/HIST',
      date: '01/03/2026',
      tanggal: '01/03/2026',
      polybag: 1000,
      disemai: 2000
    };
    storage.set('seeding_transactions', [historicalTx]);

    const txs = storage.get('seeding_transactions', []);
    const found = txs.find(t => t.id === 'HIST-TX-001');
    assert.strictEqual(found.tanggal, '01/03/2026', 'Tanggal transaksi historis tidak boleh berubah');
    assert.strictEqual(found.date, '01/03/2026', 'Date transaksi historis tidak boleh berubah');
  });

  // 6. Verifikasi: Filter tanggal dapat menemukan transaksi pada tanggal simulasi
  test('6. Filter tanggal dapat menemukan transaksi pada tanggal simulasi', () => {
    const allDederTxs = storage.get(DEDERAN_STORAGE_KEYS.TRANSACTIONS, []);
    const targetSimDate = '15/11/2026';

    const matchesSimDate = allDederTxs.filter(t => t.tanggalDeder === targetSimDate);
    assert.strictEqual(matchesSimDate.length >= 1, true, 'Filter harus menemukan transaksi dederan pada tanggal simulasi');

    const matchesOtherDate = allDederTxs.filter(t => t.tanggalDeder === '01/01/2026');
    assert.strictEqual(matchesOtherDate.length, 0, 'Filter tanggal berbeda tidak boleh mencocokkan transaksi simulasi');
  });

  // 7. Verifikasi: Mematikan simulasi mengembalikan perilaku waktu perangkat
  test('7. Mematikan simulasi mengembalikan perilaku waktu perangkat', () => {
    setSimulationState({ enabled: false });
    assert.strictEqual(isSimulationActive(), false, 'Simulasi harus non-aktif');

    const actualDateObj = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const expectedActualDate = `${actualDateObj.getFullYear()}-${pad(actualDateObj.getMonth() + 1)}-${pad(actualDateObj.getDate())}`;
    const expectedActualDDMM = `${pad(actualDateObj.getDate())}/${pad(actualDateObj.getMonth() + 1)}/${actualDateObj.getFullYear()}`;

    assert.strictEqual(todayISO(), expectedActualDate, 'todayISO harus kembali ke waktu sistem aktual');
    assert.strictEqual(todayDDMMYYYY(), expectedActualDDMM, 'todayDDMMYYYY harus kembali ke waktu sistem aktual');
    assert.strictEqual(getEffectiveDate(), expectedActualDate, 'getEffectiveDate harus kembali ke tanggal sistem');
    assert.strictEqual(getEffectiveTodayDDMMYYYY(), expectedActualDDMM, 'getEffectiveTodayDDMMYYYY harus kembali ke tanggal sistem');
  });

  // 8. Verifikasi: Timestamp aktual foto/GPS tidak tertimpa
  test('8. Timestamp aktual foto dan GPS tidak tertimpa', () => {
    // Nyalakan kembali simulasi
    setSimulationState({ enabled: true, simulatedDate: '2026-12-01', simulatedTime: '10:00' });

    // Seed presensi untuk tanggal simulasi baru 2026-12-01 agar Attendance Gate terbuka
    const atts = storage.get('attendance_transactions', []) || [];
    atts.push({
      id: 'ATT-DEC-001',
      date: '2026-12-01',
      tanggal: '2026-12-01',
      type: 'SUPERVISOR',
      session: 'DATANG',
      status: 'HADIR',
      estateId: 'EST-TBS',
      divisionId: 'DIV-001',
      userId: 'MNT001'
    }, {
      id: 'ATT-DEC-002',
      date: '2026-12-01',
      tanggal: '2026-12-01',
      type: 'WORKER',
      session: 'DATANG',
      status: 'HADIR',
      estateId: 'EST-TBS',
      divisionId: 'DIV-001',
      userId: 'W001'
    });
    storage.set('attendance_transactions', atts);

    const actualCaptureTimestamp = new Date().toISOString();
    const photoMetadata = {
      id: 'PHOTO-TEST-001',
      dataUrl: 'data:image/jpeg;base64,mockphotodata',
      capturedAt: actualCaptureTimestamp,
      capturedAtLabel: 'Foto Terverifikasi',
      latitude: 3.5952,
      longitude: 98.6722
    };

    const poolItem = {
      id: 'POOL-PHOTO-001',
      originType: 'REJECT_DEDERAN',
      sourceModule: 'DEDERAN',
      sourceTransactionType: 'DEDER_INSPECTION',
      sourceDocNo: '2026/DED/INS/001',
      quantity: 15,
      estateId: 'EST-TBS',
      divisionId: 'DIV-001'
    };

    const cullRes = declareSelectionItem(poolItem, photoMetadata, mantriUser);
    const cullTx = cullRes.transaction;

    assert.strictEqual(cullTx.tanggalSeleksi, '01/12/2026', 'Tanggal operasional seleksi harus mengikuti tanggal simulasi');
    assert.strictEqual(cullTx.photoCapturedAt, actualCaptureTimestamp, 'photoCapturedAt harus mempertahankan timestamp aktual hardware');
    assert.strictEqual(cullTx.latitude, 3.5952, 'Latitude GPS aktual tidak boleh tertimpa');
    assert.strictEqual(cullTx.longitude, 98.6722, 'Longitude GPS aktual tidak boleh tertimpa');
  });

  // 9. Verifikasi: Tidak ada duplikasi transaksi atau perubahan stok tidak sah
  test('9. Tidak ada duplikasi transaksi atau perubahan stok tidak sah', () => {
    const allSelTxsBefore = storage.get(SELECTION_STORAGE_KEY, []);
    const countBefore = allSelTxsBefore.length;

    // Panggil declareSelectionItem kembali dengan pool item yang sama
    const poolItem = {
      id: 'POOL-PHOTO-001',
      originType: 'REJECT_DEDERAN',
      sourceModule: 'DEDERAN',
      sourceTransactionType: 'DEDER_INSPECTION',
      sourceDocNo: '2026/DED/INS/001',
      quantity: 15,
      estateId: 'EST-TBS',
      divisionId: 'DIV-001'
    };

    const reDeclaredRes = declareSelectionItem(poolItem, null, mantriUser);
    const reDeclared = reDeclaredRes.transaction;
    const allSelTxsAfter = storage.get(SELECTION_STORAGE_KEY, []);
    assert.strictEqual(allSelTxsAfter.length, countBefore, 'Tidak boleh ada duplikasi baris transaksi untuk item seleksi yang sama');
    assert.strictEqual(reDeclared.tanggalSeleksi, '01/12/2026', 'Tanggal transaksi tetap konsisten');
  });

  // Clean up
  clearSimulationState();

  console.log('\n================================================================');
  const allPassed = results.every(r => r.passed);
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${results.filter(r => r.passed).length} | FAILED: ${results.filter(r => !r.passed).length}`);
  console.log('================================================================');

  if (!allPassed) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
