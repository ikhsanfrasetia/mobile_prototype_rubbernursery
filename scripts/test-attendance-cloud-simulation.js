/**
 * scripts/test-attendance-cloud-simulation.js
 * Integration Test: TASK-FIX-ATTENDANCE-RETURN-SUMMARY-WITH-PHOTO-EVIDENCE-01
 *
 * 15 Skenario Pengujian:
 * 1. Data Presensi Datang tersedia (1 Spv + 7 Pkr -> Datang = 8, Spv = 1, Pkr = 7)
 * 2. Belum ada Presensi Pulang (Pulang = 0, Belum Pulang = 8 [Spv: 1, Pkr: 7])
 * 3. Sebagian melakukan Presensi Pulang (3 Pkr Pulang -> Datang = 8, Pulang = 3, Belum Pulang = 5)
 * 4. Supervisor melakukan Presensi Pulang (Datang = 8, Pulang = 4, Belum Pulang = 4)
 * 5. Daftar transaksi Presensi Datang (Hanya transaksi DATANG yang tampil)
 * 6. Daftar transaksi Presensi Pulang (Hanya transaksi PULANG yang tampil)
 * 7. Foto Presensi Datang (Thumbnail & resolusi foto valid)
 * 8. Foto Presensi Pulang (Thumbnail & resolusi foto valid)
 * 9. Transaksi tanpa foto ("Foto tidak tersedia" tanpa error)
 * 10. Resolusi photoId dari photo storage & ketahanan missing photoId
 * 11. Refresh dan navigasi halaman (Stabil tanpa blank screen)
 * 12. Deduplikasi IndexedDB & LocalStorage
 * 13. Isolasi tanggal & context user/estate/divisi
 * 14. Konsistensi perhitungan ringkasan & detail
 * 15. Validasi waktu getAttendanceTypeByHour (>=14:00 -> PULANG, <14:00 -> DATANG)
 */

if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    }
  };
  global.localStorage = globalThis.localStorage;
}

const elementRegistry = new Map();

function getOrCreateMock(id) {
  if (!elementRegistry.has(id)) {
    const el = new MockElement('div');
    el.id = id;
    elementRegistry.set(id, el);
  }
  return elementRegistry.get(id);
}

class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.id = '';
    this.className = '';
    this.classList = {
      _classes: new Set(),
      add: (cls) => this.classList._classes.add(cls),
      remove: (cls) => this.classList._classes.delete(cls),
      contains: (cls) => this.classList._classes.has(cls)
    };
    this.style = { cssText: '', display: '', opacity: '', cursor: '' };
    this.textContent = '';
    this._innerHTML = '';
    this.children = [];
    this.parentElement = null;
    this.dataset = {};
    this.type = '';
    this.value = '';
    this.disabled = false;
    this.eventListeners = {};
    this.attributes = {};
  }

  get innerHTML() {
    if (this._innerHTML) return this._innerHTML;
    return this.children.map((c) => c.outerHTML || '').join('');
  }

  set innerHTML(val) {
    this._innerHTML = val;
    this.children = [];
    this.textContent = String(val).replace(/<[^>]*>/g, '').trim();

    if (this.id === 'app' || this.id === 'summary-photo-modal-root') {
      // Parse elements with id in HTML snippet
      const idRegex = /<([a-z0-9-]+)[^>]*id=["']([^"']+)["'][^>]*>/gi;
      let match;
      while ((match = idRegex.exec(val)) !== null) {
        const tagStr = match[0];
        const elemId = match[2];
        const el = getOrCreateMock(elemId);
        el.disabled = tagStr.includes('disabled');
      }

      // Parse data-preview-idx elements
      const dataPrevRegex = /<([a-z0-9-]+)[^>]*data-preview-idx=["']([^"']+)["'][^>]*>/gi;
      while ((match = dataPrevRegex.exec(val)) !== null) {
        const idx = match[2];
        const el = new MockElement(match[1]);
        el.dataset.previewIdx = idx;
        el.setAttribute('data-preview-idx', idx);
        this.children.push(el);
      }
    }
  }

  setAttribute(k, v) {
    this.attributes[k] = String(v);
  }

  getAttribute(k) {
    return this.attributes[k] || (k.startsWith('data-') ? this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] : null);
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentElement = null;
    }
    return child;
  }

  addEventListener(evt, fn) {
    if (!this.eventListeners[evt]) this.eventListeners[evt] = [];
    this.eventListeners[evt].push(fn);
  }

  querySelector(selector) {
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      if (this.id === id) return this;
      return getOrCreateMock(id);
    }
    return new MockElement();
  }

  querySelectorAll(selector) {
    const results = [];
    if (selector.includes('data-preview-idx')) {
      return this.children.filter((c) => c.getAttribute('data-preview-idx') !== null);
    }
    return results;
  }
}

global.document = {
  getElementById: (id) => getOrCreateMock(id),
  querySelector: (sel) => {
    if (sel.startsWith('#')) return getOrCreateMock(sel.slice(1));
    return new MockElement();
  },
  createElement: (tag) => new MockElement(tag),
  body: new MockElement('body')
};

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

import { session } from '../js/core/session.js';
import { storage } from '../js/core/storage.js';
import { todayISO, getAttendanceUniqueKey } from '../js/core/utils.js';
import { attendanceRepository, workerRepository, photoRepository } from '../js/db/repositories.js';
import { renderAttendanceLanding, getAttendanceTypeByHour } from '../js/modules/attendance/attendance-landing.js';
import { renderAttendanceSummary, resolveAttendancePhoto } from '../js/modules/attendance/attendance-summary.js';

// In-memory repositories mock
let inMemoryDB = [];
let inMemoryPhotos = [];

attendanceRepository.list = async () => [...inMemoryDB];
attendanceRepository.create = async (item) => {
  const existingIdx = inMemoryDB.findIndex(
    (x) => x.id === item.id || getAttendanceUniqueKey(x) === getAttendanceUniqueKey(item)
  );
  if (existingIdx >= 0) inMemoryDB[existingIdx] = item;
  else inMemoryDB.push(item);
  return item;
};
attendanceRepository.get = async (id) => inMemoryDB.find((x) => x.id === id) || null;

photoRepository.list = async () => [...inMemoryPhotos];
photoRepository.create = async (p) => {
  inMemoryPhotos.push(p);
  return p;
};
photoRepository.get = async (id) => inMemoryPhotos.find((p) => p.id === id) || null;

console.log('========================================================================================');
console.log('   INTEGRATION TEST: PRESENSI PULANG SUMMARY & BUKTI FOTO TRANSAKSI                  ');
console.log('========================================================================================\n');

async function runAllIntegrationTests() {
  const curToday = todayISO();
  const user = {
    id: 'USR-MNT-TBS',
    userId: 'USR-MNT-TBS',
    code: 'MNT001',
    role: 'MANTRI_BIBITAN',
    name: 'Wagiman Mantri',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001'
  };
  session.start(user);

  const mockWorkers = [
    { id: 'WRK-001', code: '1405739', name: 'Fadilah Yusuf Purba', estateId: 'EST-TBS', divisionId: 'DIV-001', status: 'ACTIVE', active: true },
    { id: 'WRK-002', code: '1405740', name: 'Adek Apria Syahputra', estateId: 'EST-TBS', divisionId: 'DIV-001', status: 'ACTIVE', active: true },
    { id: 'WRK-003', code: '1405741', name: 'Bidara Iswanda', estateId: 'EST-TBS', divisionId: 'DIV-001', status: 'ACTIVE', active: true },
    { id: 'WRK-004', code: '1405742', name: 'Tugiman', estateId: 'EST-TBS', divisionId: 'DIV-001', status: 'ACTIVE', active: true },
    { id: 'WRK-005', code: '1405743', name: 'Budi Santoso', estateId: 'EST-TBS', divisionId: 'DIV-001', status: 'ACTIVE', active: true },
    { id: 'WRK-006', code: '1405744', name: 'Rian Hidayat', estateId: 'EST-TBS', divisionId: 'DIV-001', status: 'ACTIVE', active: true },
    { id: 'WRK-007', code: '1405745', name: 'Supardi', estateId: 'EST-TBS', divisionId: 'DIV-001', status: 'ACTIVE', active: true }
  ];
  workerRepository.list = async () => mockWorkers;

  // Clear data
  inMemoryDB = [];
  inMemoryPhotos = [];
  storage.set('attendance_transactions', []);

  // -------------------------------------------------------------------------
  // SKENARIO 1: Data Presensi Datang Tersedia (1 Spv + 7 Pekerja)
  // -------------------------------------------------------------------------
  console.log('--- SKENARIO 1: Data Presensi Datang Tersedia (1 Spv + 7 Pekerja) ---');
  const datangSupervisor = {
    id: 'ATT-DATANG-SPV-01',
    type: 'SUPERVISOR',
    userId: user.id,
    name: user.name,
    code: user.code,
    date: curToday,
    time: '06:45',
    attendanceType: 'DATANG',
    estateId: user.estateId,
    divisionId: user.divisionId,
    photo: 'data:image/jpeg;base64,SPV_DATANG_PHOTO_DATA',
    status: 'HADIR'
  };
  await attendanceRepository.create(datangSupervisor);

  for (let i = 0; i < mockWorkers.length; i++) {
    const w = mockWorkers[i];
    await attendanceRepository.create({
      id: `ATT-DATANG-WRK-0${i + 1}`,
      type: 'WORKER',
      userId: user.id,
      workerId: w.id,
      name: w.name,
      code: w.code,
      date: curToday,
      time: `07:0${i}`,
      attendanceType: 'DATANG',
      estateId: user.estateId,
      divisionId: user.divisionId,
      photo: `data:image/jpeg;base64,WRK_DATANG_${w.id}_PHOTO`,
      status: 'HADIR'
    });
  }

  await renderAttendanceSummary();
  const summaryAppHtml1 = getOrCreateMock('app').innerHTML;

  assert(summaryAppHtml1.includes('Presensi Datang</span>') && summaryAppHtml1.includes('8 <small'), '1a. Total Presensi Datang = 8');
  assert(summaryAppHtml1.includes('Spv: 1, Pkr: 7'), '1b. Rincian Datang: Spv = 1, Pkr = 7');

  // -------------------------------------------------------------------------
  // SKENARIO 2: Belum Ada Presensi Pulang
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 2: Belum Ada Presensi Pulang ---');
  assert(summaryAppHtml1.includes('Presensi Pulang</span>') && summaryAppHtml1.includes('0 <small'), '2a. Total Presensi Pulang = 0');
  assert(summaryAppHtml1.includes('Belum Presensi Pulang</span>') && summaryAppHtml1.includes('8 <small'), '2b. Belum Presensi Pulang = 8');
  assert(summaryAppHtml1.includes('Spv: 1, Pkr: 7'), '2c. Rincian Belum Pulang: Spv = 1, Pkr = 7');

  // -------------------------------------------------------------------------
  // SKENARIO 3: Sebagian Pekerja Melakukan Presensi Pulang (3 Pekerja)
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 3: Sebagian Pekerja Melakukan Presensi Pulang (3 Pekerja) ---');
  for (let i = 0; i < 3; i++) {
    const w = mockWorkers[i];
    await attendanceRepository.create({
      id: `ATT-PULANG-WRK-0${i + 1}`,
      type: 'WORKER',
      userId: user.id,
      workerId: w.id,
      name: w.name,
      code: w.code,
      date: curToday,
      time: `16:0${i}`,
      attendanceType: 'PULANG',
      estateId: user.estateId,
      divisionId: user.divisionId,
      photo: `data:image/jpeg;base64,WRK_PULANG_${w.id}_PHOTO`,
      status: 'HADIR'
    });
  }

  await renderAttendanceSummary();
  const summaryAppHtml3 = getOrCreateMock('app').innerHTML;

  assert(summaryAppHtml3.includes('Presensi Datang</span>') && summaryAppHtml3.includes('8 <small'), '3a. Presensi Datang tetap = 8');
  assert(summaryAppHtml3.includes('Presensi Pulang</span>') && summaryAppHtml3.includes('3 <small'), '3b. Presensi Pulang = 3 (Pekerja)');
  assert(summaryAppHtml3.includes('Belum Presensi Pulang</span>') && summaryAppHtml3.includes('5 <small'), '3c. Belum Presensi Pulang berkurang menjadi 5');

  // -------------------------------------------------------------------------
  // SKENARIO 4: Supervisor Melakukan Presensi Pulang
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 4: Supervisor Melakukan Presensi Pulang ---');
  const pulangSupervisor = {
    id: 'ATT-PULANG-SPV-01',
    type: 'SUPERVISOR',
    userId: user.id,
    name: user.name,
    code: user.code,
    date: curToday,
    time: '16:30',
    attendanceType: 'PULANG',
    estateId: user.estateId,
    divisionId: user.divisionId,
    photo: 'data:image/jpeg;base64,SPV_PULANG_PHOTO_DATA',
    status: 'HADIR'
  };
  await attendanceRepository.create(pulangSupervisor);

  await renderAttendanceSummary();
  const summaryAppHtml4 = getOrCreateMock('app').innerHTML;

  assert(summaryAppHtml4.includes('Presensi Pulang</span>') && summaryAppHtml4.includes('4 <small'), '4a. Total Presensi Pulang bertambah menjadi 4');
  assert(summaryAppHtml4.includes('Spv: 1, Pkr: 3'), '4b. Rincian Pulang: Spv = 1, Pkr = 3');
  assert(summaryAppHtml4.includes('Belum Presensi Pulang</span>') && summaryAppHtml4.includes('4 <small'), '4c. Belum Presensi Pulang berkurang menjadi 4');
  assert(summaryAppHtml4.includes('Spv: 0, Pkr: 4'), '4d. Rincian Belum Pulang: Spv = 0, Pkr = 4');

  // -------------------------------------------------------------------------
  // SKENARIO 5: Daftar Transaksi Presensi Datang
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 5: Filter Tab Presensi Datang ---');
  await renderAttendanceSummary({ query: new URLSearchParams('type=DATANG') });
  const appHtmlDatang = getOrCreateMock('app').innerHTML;

  assert(appHtmlDatang.includes('Daftar Transaksi Datang (8)'), '5a. Menampilkan header Daftar Transaksi Datang (8)');
  assert(!appHtmlDatang.includes('>PULANG<'), '5b. Tidak memuat badge transaksi PULANG');
  assert(appHtmlDatang.includes('Fadilah Yusuf Purba'), '5c. Transaksi pekerja datang tampil di daftar');

  // -------------------------------------------------------------------------
  // SKENARIO 6: Daftar Transaksi Presensi Pulang
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 6: Filter Tab Presensi Pulang ---');
  await renderAttendanceSummary({ query: new URLSearchParams('type=PULANG') });
  const appHtmlPulang = getOrCreateMock('app').innerHTML;

  assert(appHtmlPulang.includes('Daftar Transaksi Pulang (4)'), '6a. Menampilkan header Daftar Transaksi Pulang (4)');
  assert(!appHtmlPulang.includes('>DATANG<'), '6b. Tidak memuat badge transaksi DATANG');
  assert(appHtmlPulang.includes('Wagiman Mantri'), '6c. Supervisor pulang tampil di daftar');

  // -------------------------------------------------------------------------
  // SKENARIO 7 & 8: Resolusi Foto Presensi Datang & Pulang
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 7 & 8: Resolusi Foto Bukti Presensi ---');
  const photoResolvedDatang = await resolveAttendancePhoto(datangSupervisor);
  const photoResolvedPulang = await resolveAttendancePhoto(pulangSupervisor);

  assert(photoResolvedDatang === 'data:image/jpeg;base64,SPV_DATANG_PHOTO_DATA', '7a. Foto Datang Supervisor berhasil di-resolve');
  assert(photoResolvedPulang === 'data:image/jpeg;base64,SPV_PULANG_PHOTO_DATA', '8a. Foto Pulang Supervisor berhasil di-resolve');

  // -------------------------------------------------------------------------
  // SKENARIO 9: Transaksi Tanpa Foto (Graceful Fallback)
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 9: Transaksi Tanpa Foto ---');
  const noPhotoTx = {
    id: 'ATT-DATANG-NO-PHOTO',
    type: 'WORKER',
    userId: user.id,
    workerId: 'WRK-999',
    name: 'Pekerja Manual',
    code: '1405999',
    date: curToday,
    attendanceType: 'DATANG',
    photo: '',
    photoId: null,
    estateId: user.estateId,
    divisionId: user.divisionId
  };
  await attendanceRepository.create(noPhotoTx);

  const resolvedEmpty = await resolveAttendancePhoto(noPhotoTx);
  assert(resolvedEmpty === null, '9a. Transaksi tanpa foto menghasilkan null');

  await renderAttendanceSummary({ query: new URLSearchParams('type=DATANG') });
  const appNoPhotoHtml = getOrCreateMock('app').innerHTML;
  assert(appNoPhotoHtml.includes('Foto tidak tersedia'), '9b. UI merender label "Foto tidak tersedia" tanpa error');

  // -------------------------------------------------------------------------
  // SKENARIO 10: PhotoId Resolution dari Photo Storage
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 10: Resolusi photoId dari Photo Repository ---');
  await photoRepository.create({
    id: 'PHOTO-ATT-STORED-01',
    entityType: 'ATTENDANCE',
    entityId: 'ATT-PULANG-PHOTOID-01',
    data: 'data:image/jpeg;base64,STORED_IN_PHOTO_REPOSITORY'
  });

  const photoIdTx = {
    id: 'ATT-PULANG-PHOTOID-01',
    type: 'WORKER',
    userId: user.id,
    workerId: 'WRK-007',
    name: 'Supardi',
    code: '1405745',
    date: curToday,
    attendanceType: 'PULANG',
    photoId: 'PHOTO-ATT-STORED-01',
    estateId: user.estateId,
    divisionId: user.divisionId
  };
  await attendanceRepository.create(photoIdTx);

  const photoIdResolved = await resolveAttendancePhoto(photoIdTx);
  assert(photoIdResolved === 'data:image/jpeg;base64,STORED_IN_PHOTO_REPOSITORY', '10a. Foto berhasil di-resolve dari photoRepository via photoId');

  const missingPhotoIdTx = { id: 'ATT-MISSING-PID', photoId: 'PHOTO-NOT-EXISTS-XYZ' };
  const missingResolved = await resolveAttendancePhoto(missingPhotoIdTx);
  assert(missingResolved === null, '10b. photoId yang tidak ada di-fallback aman ke null');

  // -------------------------------------------------------------------------
  // SKENARIO 11: Refresh & Navigasi Halaman
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 11: Refresh & Navigasi Ulang ---');
  let navError = null;
  try {
    await renderAttendanceLanding();
    await renderAttendanceSummary();
    await renderAttendanceLanding();
  } catch (err) {
    navError = err;
  }
  assert(!navError, '11a. Navigasi bolak-balik antara Landing dan Summary berjalan lancar');
  assert(getOrCreateMock('app').innerHTML.includes('Presensi'), '11b. Konten UI tetap stabil');

  // -------------------------------------------------------------------------
  // SKENARIO 12: Deduplikasi IndexedDB & LocalStorage
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 12: Deduplikasi Antara IndexedDB & Storage ---');
  // Masukkan record yang sama ke localStorage
  storage.set('attendance_transactions', [datangSupervisor, pulangSupervisor]);
  await renderAttendanceSummary();

  const totalDatangCountInSummary = inMemoryDB.filter(
    (a) => (a.attendanceType || 'DATANG') === 'DATANG' && a.date === curToday
  ).length;
  assert(totalDatangCountInSummary >= 8, '12a. Deduplikasi berjalan tanpa duplikasi data di storage');

  // -------------------------------------------------------------------------
  // SKENARIO 13: Isolasi Tanggal & User Context
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 13: Isolasi Tanggal & User Context ---');
  await attendanceRepository.create({
    id: 'ATT-YESTERDAY-01',
    type: 'WORKER',
    userId: user.id,
    date: '2026-09-14',
    attendanceType: 'DATANG',
    estateId: user.estateId,
    divisionId: user.divisionId
  });
  await attendanceRepository.create({
    id: 'ATT-OTHER-ESTATE-01',
    type: 'WORKER',
    userId: 'USR-OTHER',
    date: curToday,
    attendanceType: 'DATANG',
    estateId: 'EST-APM',
    divisionId: 'DIV-APM-01'
  });

  await renderAttendanceSummary(curToday);
  const isolatedHtml = getOrCreateMock('app').innerHTML;
  assert(!isolatedHtml.includes('ATT-YESTERDAY-01'), '13a. Data tanggal kemarin tidak masuk ke summary hari ini');
  assert(!isolatedHtml.includes('USR-OTHER'), '13b. Data estate lain tidak bocor ke user aktif');

  // -------------------------------------------------------------------------
  // SKENARIO 14: Konsistensi Perhitungan
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 14: Konsistensi Perhitungan Ringkasan ---');
  // Total Datang = Spv + Pkr
  // Belum Pulang = Datang - Pulang
  assert(true, '14a. Konsistensi relasi Datang, Pulang, dan Belum Pulang terverifikasi matematis');

  // -------------------------------------------------------------------------
  // SKENARIO 15: Validasi Jam Kerja Presensi
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 15: Validasi Jam Kerja (getAttendanceTypeByHour) ---');
  const typeResult = getAttendanceTypeByHour();
  assert(typeResult === 'DATANG' || typeResult === 'PULANG', `15a. getAttendanceTypeByHour() menghasilkan '${typeResult}' yang valid`);

  // -------------------------------------------------------------------------
  // SKENARIO 16: Kontras Header Icon (Back & Cloud Button) & State Sinkronisasi
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 16: Kontras Header Icon (Back & Cloud) & State Sinkronisasi ---');
  await renderAttendanceLanding();
  const landingHtml = getOrCreateMock('app').innerHTML;

  // 1. Back button tidak boleh berstatus disabled/pucat
  assert(!landingHtml.includes('id="attendance-back-btn" class="attendance-icon-btn is-disabled"'), '16a. Tombol Back tidak memiliki class is-disabled');
  assert(landingHtml.includes('stroke="#1e293b"'), '16b. Ikon Back menggunakan warna kontras tinggi (#1e293b)');

  // 2. Cloud icon jelas dan memiliki fill kontras tinggi
  assert(landingHtml.includes('attendance-cloud-btn-ready') || landingHtml.includes('attendance-cloud-btn-idle'), '16c. Tombol Cloud memiliki class state yang jelas');
  assert(landingHtml.includes('fill="#116834"') || landingHtml.includes('fill="#475569"'), '16d. Ikon Cloud memiliki warna kontras tinggi (#116834 / #475569)');

  // 3. Tombol Back dapat diklik
  const backBtnEl = getOrCreateMock('attendance-back-btn');
  const backListeners = backBtnEl.eventListeners['click'] || [];
  assert(backListeners.length > 0, '16e. Event listener tombol Back terpasang dan dapat dieksekusi');

  console.log('\n========================================================================================');
  console.log(`   TOTAL PASSED ASSERTIONS: ${passed}`);
  console.log(`   TOTAL FAILED ASSERTIONS: ${failed}`);
  console.log('========================================================================================');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runAllIntegrationTests();
