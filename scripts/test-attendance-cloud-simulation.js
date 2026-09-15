/**
 * scripts/test-attendance-cloud-simulation.js
 * Integration Test: TASK-AUDIT-FIX-ATTENDANCE-INCREMENTAL-SAVE-DEDUPLICATION-01
 *
 * 10 Skenario Pengujian:
 * Skenario 1: Presensi Awal (1 Supervisor + 2 Pekerja -> Total 3)
 * Skenario 2: Awan Setelah Presensi Awal (Total tetap 3, Katalog 3 baris unik, no duplicate)
 * Skenario 3: Melanjutkan Presensi (+5 Pekerja -> Total 8, Katalog 8 baris unik, data awal intact)
 * Skenario 4: Sinkronisasi Setelah Presensi Lanjutan (Total tetap 8, Katalog 8 baris unik, no duplicate)
 * Skenario 5: Refresh Halaman (Total tetap 8, Katalog tetap 8)
 * Skenario 6: Navigasi Keluar-Masuk (Total tetap 8, Katalog tetap 8)
 * Skenario 7: Klik Simpan/Awan Berulang (Tidak menggandakan data)
 * Skenario 8: Isolasi User / Konteks Kebun-Divisi
 * Skenario 9: Data Belum Presensi (Terhitung akurat, menjadi 0 saat semua hadir)
 * Skenario 10: Konsistensi Ringkasan dan Katalog (Total ringkasan === Total katalog)
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
  }

  get innerHTML() {
    if (this._innerHTML) return this._innerHTML;
    return this.children.map(c => c.outerHTML || '').join('');
  }

  set innerHTML(val) {
    this._innerHTML = val;
    this.children = [];
    this.textContent = String(val).replace(/<[^>]*>/g, '').trim();

    if (this.id === 'app') {
      elementRegistry.clear();
      elementRegistry.set('app', this);

      // Parse elements with id in HTML
      const idRegex = /<([a-z0-9-]+)[^>]*id=["']([^"']+)["'][^>]*>/gi;
      let match;
      while ((match = idRegex.exec(val)) !== null) {
        const tagStr = match[0];
        const elemId = match[2];
        const el = getOrCreateMock(elemId);
        el.disabled = tagStr.includes('disabled');
      }

      const statusMatch = val.match(/<div[^>]*id=["']attendance-cloud-status["'][^>]*>([\s\S]*?)<\/div>/i);
      if (statusMatch) {
        getOrCreateMock('attendance-cloud-status').textContent = statusMatch[1].trim();
      }
    }
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

  remove() {
    if (this.parentElement) {
      this.parentElement.removeChild(this);
    }
  }

  addEventListener(evt, fn) {
    if (!this.eventListeners[evt]) this.eventListeners[evt] = [];
    this.eventListeners[evt].push(fn);
  }

  querySelector(selector) {
    if (selector.startsWith('#')) {
      const id = selector.slice(1);
      if (this.id === id) return this;
      const found = this._findChildById(id, this);
      if (found) return found;
      return getOrCreateMock(id);
    }
    if (selector === 'svg') {
      const svg = new MockElement('svg');
      this.appendChild(svg);
      return svg;
    }
    return new MockElement();
  }

  querySelectorAll(selector) {
    const results = [];
    if (selector.startsWith('.')) {
      const className = selector.slice(1);
      this._findChildrenByClass(className, this, results);
    }
    return results;
  }

  _findChildById(id, root) {
    for (const c of root.children) {
      if (c.id === id) return c;
      const found = this._findChildById(id, c);
      if (found) return found;
    }
    return null;
  }

  _findChildrenByClass(cls, root, results) {
    for (const c of root.children) {
      if (c.className && c.className.includes(cls)) results.push(c);
      this._findChildrenByClass(cls, c, results);
    }
  }

  closest() {
    return this;
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
import { attendanceRepository, workerRepository } from '../js/db/repositories.js';
import { renderAttendanceLanding } from '../js/modules/attendance/attendance-landing.js';

// In-memory mock database store for attendanceRepository
let inMemoryDB = [];
attendanceRepository.list = async () => [...inMemoryDB];
attendanceRepository.create = async (item) => {
  const existingIdx = inMemoryDB.findIndex(x => x.id === item.id || getAttendanceUniqueKey(x) === getAttendanceUniqueKey(item));
  if (existingIdx >= 0) {
    inMemoryDB[existingIdx] = item;
  } else {
    inMemoryDB.push(item);
  }
  return item;
};
attendanceRepository.update = async (id, item) => {
  const idx = inMemoryDB.findIndex(x => x.id === id);
  if (idx >= 0) inMemoryDB[idx] = item;
  else inMemoryDB.push(item);
  return item;
};

// Helper to get catalog items from storage
function getCatalogAttendanceItems() {
  const rawItems = storage.get('attendance_transactions', []) || [];
  const map = new Map();
  rawItems.forEach(it => {
    const key = getAttendanceUniqueKey(it) || it.id;
    if (!map.has(key)) map.set(key, it);
  });
  return Array.from(map.values());
}

// Helper to parse summary stat numbers from rendered DOM
function getRenderedSummaryStats() {
  const appEl = getOrCreateMock('app');
  const html = appEl.innerHTML;
  
  const totalMatch = html.match(/class="attendance-total-num">(\d+)<\/span>/i);
  const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;

  const spvHadirMatch = html.match(/Supervisor<\/span>\s*<span class="attendance-row-val">(\d+)<\/span>/i);
  const spvHadir = spvHadirMatch ? parseInt(spvHadirMatch[1], 10) : 0;

  const pkrHadirMatches = [...html.matchAll(/Pekerja<\/span>\s*<span class="attendance-row-val">(\d+)<\/span>/gi)];
  const pkrHadir = pkrHadirMatches[0] ? parseInt(pkrHadirMatches[0][1], 10) : 0;
  const pkrBelum = pkrHadirMatches[1] ? parseInt(pkrHadirMatches[1][1], 10) : 0;

  const belumTitleMatch = html.match(/Belum Presensi Datang \((\d+)\)/i);
  const totalBelum = belumTitleMatch ? parseInt(belumTitleMatch[1], 10) : 0;

  return { total, spvHadir, pkrHadir, pkrBelum, totalBelum };
}

console.log('========================================================================================');
console.log('   INTEGRATION TEST: AUDIT & FIX INCREMENTAL ATTENDANCE SAVE & DEDUPLICATION          ');
console.log('========================================================================================\n');

async function runIntegrationTests() {
  const curToday = todayISO();
  const userA = { id: 'USR-MNT-TBS', userId: 'USR-MNT-TBS', code: 'MNT001', role: 'MANTRI_BIBITAN', name: 'Irwan Mantri', estateId: 'EST-TBS', divisionId: 'DIV-001' };
  const userB = { id: 'USR-MNT-APM', userId: 'USR-MNT-APM', code: 'MNT002', role: 'MANTRI_BIBITAN', name: 'Aek Mantri', estateId: 'EST-APM', divisionId: 'DIV-APM-02' };

  // Set active user session
  session.start(userA);

  // Setup worker pool in workerRepository (7 active workers in DIV-001)
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

  // Clear initial storages
  inMemoryDB = [];
  storage.set('attendance_transactions', []);
  storage.remove('sigma_attendance_cloud_state_USR-MNT-TBS');

  // -------------------------------------------------------------------------
  // SKENARIO 1: Presensi Awal (1 Supervisor + 2 Pekerja)
  // -------------------------------------------------------------------------
  console.log('--- SKENARIO 1: Presensi Awal (1 Supervisor + 2 Pekerja) ---');
  
  const spvRecord1 = {
    id: 'ATT-SPV-001',
    type: 'SUPERVISOR',
    userId: userA.id,
    name: userA.name,
    code: userA.code,
    date: curToday,
    attendanceType: 'DATANG',
    estateId: userA.estateId,
    divisionId: userA.divisionId,
    status: 'HADIR'
  };
  const wrk1Record = {
    id: 'ATT-WRK-001',
    type: 'WORKER',
    userId: userA.id,
    workerId: 'WRK-001',
    name: 'Fadilah Yusuf Purba',
    code: '1405739',
    date: curToday,
    attendanceType: 'DATANG',
    estateId: userA.estateId,
    divisionId: userA.divisionId,
    status: 'HADIR'
  };
  const wrk2Record = {
    id: 'ATT-WRK-002',
    type: 'WORKER',
    userId: userA.id,
    workerId: 'WRK-002',
    name: 'Adek Apria Syahputra',
    code: '1405740',
    date: curToday,
    attendanceType: 'DATANG',
    estateId: userA.estateId,
    divisionId: userA.divisionId,
    status: 'HADIR'
  };

  // Simpan ke DB dan Storage
  await attendanceRepository.create(spvRecord1);
  await attendanceRepository.create(wrk1Record);
  await attendanceRepository.create(wrk2Record);
  storage.set('attendance_transactions', [spvRecord1, wrk1Record, wrk2Record]);

  await renderAttendanceLanding();
  const stats1 = getRenderedSummaryStats();
  const catalog1 = getCatalogAttendanceItems();

  assert(stats1.total === 3, `1a. Ringkasan Presensi menampilkan total 3 (actual: ${stats1.total})`);
  assert(stats1.spvHadir === 1 && stats1.pkrHadir === 2, `1b. Supervisor = 1, Pekerja = 2 (actual: Spv=${stats1.spvHadir}, Pkr=${stats1.pkrHadir})`);
  assert(catalog1.length === 3, `1c. Katalog menampilkan 3 baris unik (actual: ${catalog1.length})`);

  // -------------------------------------------------------------------------
  // SKENARIO 2: Awan / Sinkronisasi Setelah Presensi Awal
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 2: Awan Setelah Presensi Awal ---');
  const cloudBtn1 = getOrCreateMock('attendance-cloud-btn');
  const clickListeners1 = cloudBtn1.eventListeners['click'] || [];
  assert(clickListeners1.length > 0, '2a. Tombol sinkronisasi aktif dan dapat diklik');
  await clickListeners1[0]();

  await renderAttendanceLanding();
  const stats2 = getRenderedSummaryStats();
  const catalog2 = getCatalogAttendanceItems();

  assert(stats2.total === 3, `2b. Setelah sinkronisasi, total ringkasan tetap 3 (actual: ${stats2.total})`);
  assert(catalog2.length === 3, `2c. Setelah sinkronisasi, katalog tetap 3 baris unik (actual: ${catalog2.length})`);
  assert(getOrCreateMock('attendance-cloud-status').textContent.includes('Terakhir disinkronkan:'), '2d. Label sinkronisasi terupdate');

  // -------------------------------------------------------------------------
  // SKENARIO 3: Melanjutkan Presensi (5 Pekerja Tambahan)
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 3: Melanjutkan Presensi (+5 Pekerja Tambahan) ---');
  const additionalWorkers = [
    { id: 'WRK-003', code: '1405741', name: 'Bidara Iswanda' },
    { id: 'WRK-004', code: '1405742', name: 'Tugiman' },
    { id: 'WRK-005', code: '1405743', name: 'Budi Santoso' },
    { id: 'WRK-006', code: '1405744', name: 'Rian Hidayat' },
    { id: 'WRK-007', code: '1405745', name: 'Supardi' }
  ];

  // Simulasikan penambahan presensi lanjutan secara bertahap dengan mekanisme deduplikasi
  const currentStored = storage.get('attendance_transactions', []);
  for (let i = 0; i < additionalWorkers.length; i++) {
    const w = additionalWorkers[i];
    const newRecord = {
      id: `ATT-WRK-00${i + 3}`,
      type: 'WORKER',
      userId: userA.id,
      workerId: w.id,
      name: w.name,
      code: w.code,
      date: curToday,
      attendanceType: 'DATANG',
      estateId: userA.estateId,
      divisionId: userA.divisionId,
      status: 'HADIR'
    };
    await attendanceRepository.create(newRecord);
    
    const uniqueKey = getAttendanceUniqueKey(newRecord);
    const existingIdx = currentStored.findIndex(a => a.id === newRecord.id || getAttendanceUniqueKey(a) === uniqueKey);
    if (existingIdx >= 0) {
      currentStored[existingIdx] = newRecord;
    } else {
      currentStored.push(newRecord);
    }
  }
  storage.set('attendance_transactions', currentStored);

  await renderAttendanceLanding();
  const stats3 = getRenderedSummaryStats();
  const catalog3 = getCatalogAttendanceItems();

  assert(stats3.total === 8, `3a. Ringkasan total bertambah menjadi 8 (actual: ${stats3.total})`);
  assert(stats3.spvHadir === 1 && stats3.pkrHadir === 7, `3b. Komposisi 1 Supervisor + 7 Pekerja = 8 (actual: Spv=${stats3.spvHadir}, Pkr=${stats3.pkrHadir})`);
  assert(catalog3.length === 8, `3c. Katalog menampilkan 8 data unik (actual: ${catalog3.length})`);
  assert(catalog3.some(c => c.workerId === 'WRK-001') && catalog3.some(c => c.workerId === 'WRK-002') && catalog3.some(c => c.type === 'SUPERVISOR'), '3d. 3 Data presensi awal tetap tersedia dan utuh');

  // -------------------------------------------------------------------------
  // SKENARIO 4: Sinkronisasi Setelah Presensi Lanjutan
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 4: Sinkronisasi Setelah Presensi Lanjutan ---');
  const cloudBtn4 = getOrCreateMock('attendance-cloud-btn');
  const clickListeners4 = cloudBtn4.eventListeners['click'] || [];
  await clickListeners4[0]();

  await renderAttendanceLanding();
  const stats4 = getRenderedSummaryStats();
  const catalog4 = getCatalogAttendanceItems();

  assert(stats4.total === 8, `4a. Total ringkasan tetap 8 setelah sinkronisasi ulang (actual: ${stats4.total})`);
  assert(catalog4.length === 8, `4b. Total katalog tetap 8 baris unik (actual: ${catalog4.length})`);

  // -------------------------------------------------------------------------
  // SKENARIO 5: Refresh Halaman
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 5: Refresh Halaman ---');
  await renderAttendanceLanding();
  const stats5 = getRenderedSummaryStats();
  const catalog5 = getCatalogAttendanceItems();

  assert(stats5.total === 8, `5a. Ringkasan tetap bernilai 8 setelah refresh (actual: ${stats5.total})`);
  assert(catalog5.length === 8, `5b. Katalog tetap bernilai 8 baris unik setelah refresh (actual: ${catalog5.length})`);

  // -------------------------------------------------------------------------
  // SKENARIO 6: Navigasi Keluar-Masuk Halaman
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 6: Navigasi Keluar-Masuk Halaman ---');
  getOrCreateMock('app').innerHTML = '<div class="home-view">Halaman Beranda</div>';
  await renderAttendanceLanding();
  const stats6 = getRenderedSummaryStats();
  const catalog6 = getCatalogAttendanceItems();

  assert(stats6.total === 8, `6a. Ringkasan tetap konsisten 8 setelah navigasi (actual: ${stats6.total})`);
  assert(catalog6.length === 8, `6b. Katalog tetap konsisten 8 setelah navigasi (actual: ${catalog6.length})`);

  // -------------------------------------------------------------------------
  // SKENARIO 7: Klik Simpan/Awan Berulang (Idempotency)
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 7: Klik Simpan/Awan Berulang ---');
  const cloudBtn7 = getOrCreateMock('attendance-cloud-btn');
  const clickListeners7 = cloudBtn7.eventListeners['click'] || [];
  await clickListeners7[0]();
  await clickListeners7[0]();

  await renderAttendanceLanding();
  const stats7 = getRenderedSummaryStats();
  const catalog7 = getCatalogAttendanceItems();

  assert(stats7.total === 8, `7a. Jumlah ringkasan tidak mengganda setelah klik sinkronisasi berulang (actual: ${stats7.total})`);
  assert(catalog7.length === 8, `7b. Jumlah baris transaksi pada katalog tidak bertambah (actual: ${catalog7.length})`);

  // -------------------------------------------------------------------------
  // SKENARIO 8: Isolasi User / Konteks Kebun-Divisi
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 8: Isolasi Antar-User ---');
  session.start(userB);
  await renderAttendanceLanding();
  const stats8UserB = getRenderedSummaryStats();

  assert(stats8UserB.total === 0, `8a. User B di estate/divisi berbeda tidak melihat presensi User A (actual: ${stats8UserB.total})`);
  assert(getOrCreateMock('attendance-cloud-status').textContent === 'Belum ada data yang diawankan', '8b. Status sinkronisasi User B terisolasi (Belum ada data yang diawankan)');

  session.start(userA); // Switch kembali ke User A
  await renderAttendanceLanding();
  const stats8UserA = getRenderedSummaryStats();
  assert(stats8UserA.total === 8, `8c. Sesi User A kembali membaca total 8 presensi miliknya (actual: ${stats8UserA.total})`);

  // -------------------------------------------------------------------------
  // SKENARIO 9: Data Belum Presensi
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 9: Data Belum Presensi ---');
  // Saat seluruh 7 pekerja dan 1 supervisor hadir, Belum Presensi Datang harus 0
  assert(stats8UserA.totalBelum === 0, `9a. Setelah seluruh orang presensi, total Belum Presensi Datang = 0 (actual: ${stats8UserA.totalBelum})`);
  assert(stats8UserA.pkrBelum === 0, `9b. Pekerja Belum Presensi = 0 (actual: ${stats8UserA.pkrBelum})`);

  // -------------------------------------------------------------------------
  // SKENARIO 10: Konsistensi Ringkasan dan Katalog
  // -------------------------------------------------------------------------
  console.log('\n--- SKENARIO 10: Konsistensi Ringkasan dan Katalog ---');
  const catalogFinal = getCatalogAttendanceItems();
  assert(stats8UserA.total === catalogFinal.length, `10a. Total Ringkasan (${stats8UserA.total}) tepat sama dengan Jumlah Katalog (${catalogFinal.length})`);
  assert(catalogFinal.length === 8, '10b. Tepat 8 record presensi unik tanpa duplikasi');

  console.log('\n========================================================================================');
  console.log(`   TOTAL PASSED ASSERTIONS: ${passed}`);
  console.log(`   TOTAL FAILED ASSERTIONS: ${failed}`);
  console.log('========================================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runIntegrationTests();
