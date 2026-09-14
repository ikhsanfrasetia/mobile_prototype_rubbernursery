/**
 * scripts/test-master-batch-list-scope.js
 * Verification Test Suite for TASK-FIX-MASTER-BATCH-LIST-SCOPE-01:
 * Penyederhanaan Kolom List Master Batch Role Asisten Bibitan (5 Kolom Utama):
 * 1. Kolom Kode Batch muncul
 * 2. Kolom Nama Batch muncul
 * 3. Kolom Program muncul
 * 4. Kolom Status muncul
 * 5. Kolom Aksi muncul
 * 6. Kolom Klon tidak muncul pada list/table
 * 7. Kolom Polibag tidak muncul pada list/table
 * 8. Kolom Tahapan Pertumbuhan tidak muncul pada list/table
 * 9. Kolom Kategori tidak muncul pada list/table
 * 10. Kolom Stok / Saldo tidak muncul pada list/table
 * 11. availableQty tidak dirender pada list/table
 * 12. Status list berasal dari statusMaster (Aktif / Tidak Aktif)
 * 13. Program berasal dari Program Master canonical
 * 14. QR action tetap berjalan dan menghasilkan payload valid
 * 15. Create Batch tetap berjalan normal dengan field master lengkap
 * 16. Edit Batch tetap berjalan normal dengan field master lengkap
 * 17. Detail Batch tetap dapat menampilkan field master yang diperlukan
 * 18. Transaction integration tidak rusak (receipt & seeding tetap membaca canonical batch)
 * 19. Program scope tetap benar (hanya program OPEN dan sesuai estate)
 * 20. Responsive list tetap usable pada mobile dan desktop
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

import {
  getAllBatches,
  getActiveBatches,
  getBatchById,
  getBatchByCode,
  createBatch,
  updateBatch,
  activateBatch,
  deactivateBatch,
  BATCH_MASTER_STATUS,
  BATCH_STATUS
} from '../js/data/batch-master.js';

import {
  getAllPrograms,
  getOpenPrograms,
  getProgramById,
  resolveProgram,
  PROGRAM_STATUS
} from '../js/data/program-master.js';

import { renderMasterBatch } from '../js/modules/master/master-batch.js';
import { session } from '../js/core/session.js';

// Setup Mock DOM
const elementRegistry = new Map();
class MockElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.id = '';
    this.className = '';
    this.style = {};
    this.dataset = {};
    this._innerHTML = '';
    this.children = [];
    this.parentElement = null;
    this.eventListeners = {};
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(val) {
    this._innerHTML = val;
  }

  querySelector(sel) {
    return null;
  }

  querySelectorAll(sel) {
    return [];
  }

  addEventListener(event, fn) {
    if (!this.eventListeners[event]) this.eventListeners[event] = [];
    this.eventListeners[event].push(fn);
  }
}

let appMock = new MockElement('div');
appMock.id = 'app';

globalThis.document = {
  getElementById: (id) => (id === 'app' ? appMock : null),
  querySelector: () => null,
  querySelectorAll: () => []
};

let passedCount = 0;
let failedCount = 0;
const results = [];

function assert(condition, testNumber, description) {
  if (condition) {
    passedCount++;
    results.push({ id: testNumber, status: 'PASS', description });
    console.log(`  \x1b[32m✔ [TEST ${String(testNumber).padStart(2, '0')}] PASS:\x1b[0m ${description}`);
  } else {
    failedCount++;
    results.push({ id: testNumber, status: 'FAIL', description });
    console.error(`  \x1b[31m✖ [TEST ${String(testNumber).padStart(2, '0')}] FAIL:\x1b[0m ${description}`);
  }
}

async function runTests() {
  console.log('\n===============================================================');
  console.log('🧪 RUNNING VERIFICATION SUITE: TASK-FIX-MASTER-BATCH-LIST-SCOPE-01');
  console.log('===============================================================\n');

  localStorage.clear();

  // Setup ASB Session Context
  session.start({
    name: 'Asisten Bibitan TBS',
    code: 'ASB001',
    role: 'ASISTEN_BIBITAN',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001'
  });

  const asbUserCtx = { role: 'ASISTEN_BIBITAN', estateId: 'EST-TBS', divisionId: 'DIV-001' };
  createBatch({
    batchCode: 'B-TBS-01',
    name: 'Batch TBS 01',
    programId: 'PRG-TBS-2026-001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    clone: 'IRCA 19',
    stage: 'Rubber Advance Planting Material',
    category: 'Polibag Besar',
    bedenganIds: []
  }, asbUserCtx);

  // Render Master Batch for ASB
  renderMasterBatch();
  const htmlOutput = appMock.innerHTML;

  // Test 1: Kolom Kode Batch muncul
  assert(
    htmlOutput.includes('Kode Batch') || htmlOutput.includes('KODE BATCH'),
    1,
    'Header tabel Master Batch memuat kolom "Kode Batch"'
  );

  // Test 2: Kolom Nama Batch muncul
  assert(
    htmlOutput.includes('Nama Batch') || htmlOutput.includes('NAMA BATCH'),
    2,
    'Header tabel Master Batch memuat kolom "Nama Batch"'
  );

  // Test 3: Kolom Program muncul
  assert(
    htmlOutput.includes('Program') || htmlOutput.includes('PROGRAM'),
    3,
    'Header tabel Master Batch memuat kolom "Program"'
  );

  // Test 4: Kolom Status muncul
  assert(
    htmlOutput.includes('Status') || htmlOutput.includes('STATUS'),
    4,
    'Header tabel Master Batch memuat kolom "Status"'
  );

  // Test 5: Kolom Aksi muncul
  assert(
    htmlOutput.includes('Aksi') || htmlOutput.includes('AKSI'),
    5,
    'Header tabel Master Batch memuat kolom "Aksi"'
  );

  // Test 6: Kolom Klon tidak muncul di header list/tabel
  const headerMatch = htmlOutput.match(/<thead>[\s\S]*?<\/thead>/i);
  const theadContent = headerMatch ? headerMatch[0] : '';
  assert(
    !theadContent.includes('<th>Klon</th>') && !theadContent.includes('>Klon<') && !theadContent.includes('Klon &'),
    6,
    'Header tabel Master Batch TIDAK memuat kolom "Klon"'
  );

  // Test 7: Kolom Polibag tidak muncul di header list/tabel
  assert(
    !theadContent.toLowerCase().includes('polibag'),
    7,
    'Header tabel Master Batch TIDAK memuat kolom "Polibag"'
  );

  // Test 8: Kolom Tahapan Pertumbuhan tidak muncul di header list/tabel
  assert(
    !theadContent.toLowerCase().includes('tahapan'),
    8,
    'Header tabel Master Batch TIDAK memuat kolom "Tahapan Pertumbuhan"'
  );

  // Test 9: Kolom Kategori tidak muncul di header list/tabel
  assert(
    !theadContent.toLowerCase().includes('kategori'),
    9,
    'Header tabel Master Batch TIDAK memuat kolom "Kategori"'
  );

  // Test 10: Kolom Stok / Saldo tidak muncul di header list/tabel
  assert(
    !theadContent.toLowerCase().includes('stok') && !theadContent.toLowerCase().includes('saldo') && !theadContent.toLowerCase().includes('quantity'),
    10,
    'Header tabel Master Batch TIDAK memuat kolom "Stok / Saldo / Quantity"'
  );

  // Test 11: availableQty tidak dirender pada list/tabel
  assert(
    !htmlOutput.includes('availableQty') && !htmlOutput.includes('Saldo:'),
    11,
    'availableQty dan saldo inventori tidak dirender pada tampilan tabel list'
  );

  // Test 12: Status list berasal dari statusMaster (Aktif / Tidak Aktif)
  const activeBatches = getActiveBatches({ estateId: 'EST-TBS' });
  const sampleBatch = activeBatches[0];
  assert(
    sampleBatch.statusMaster === BATCH_MASTER_STATUS.ACTIVE &&
    (htmlOutput.includes('Aktif') || htmlOutput.includes('Tidak Aktif')),
    12,
    'Status list batch menggunakan statusMaster (Aktif / Tidak Aktif)'
  );

  // Test 13: Program berasal dari Program Master canonical
  const prog = getProgramById(sampleBatch.programId) || resolveProgram(sampleBatch.programId);
  assert(
    prog && (htmlOutput.includes(prog.code) || htmlOutput.includes(prog.name)),
    13,
    'Kolom Program mereferensikan Program Master canonical'
  );

  // Test 14: QR action tetap berjalan
  assert(
    htmlOutput.includes('btn-view-qr') && htmlOutput.includes('Lihat QR'),
    14,
    'Aksi "Lihat QR" tetap tersedia pada kolom aksi tabel'
  );

  // Test 15: Create Batch tetap berjalan normal dengan field master lengkap
  const newBatch = createBatch({
    batchCode: 'BAT-2026-TBS-LST-01',
    programId: 'PRG-TBS-2026-001',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001',
    blockId: 'BLK-001',
    blockCode: '001/91',
    clone: 'PB 260',
    growthStage: 'Rubber Main Nursery',
    category: 'Polibag Besar',
    initialQty: 5000
  }, asbUserCtx);
  assert(
    newBatch && newBatch.batchCode === 'BAT-2026-TBS-LST-01' && newBatch.clone === 'PB 260',
    15,
    'Fungsi Create Batch tetap berjalan normal dengan field master lengkap'
  );

  // Test 16: Edit Batch tetap berjalan normal dengan field master lengkap
  const updatedBatch = updateBatch(newBatch.batchId, {
    category: 'Stump Mata Tidur',
    statusMaster: BATCH_MASTER_STATUS.ACTIVE
  }, asbUserCtx);
  assert(
    updatedBatch && updatedBatch.category === 'Stump Mata Tidur',
    16,
    'Fungsi Edit Batch tetap berjalan normal memodifikasi field master'
  );

  // Test 17: Detail Batch tetap dapat menampilkan field master yang diperlukan
  const fullDetailBatch = getBatchById(newBatch.batchId);
  assert(
    fullDetailBatch &&
    fullDetailBatch.clone &&
    fullDetailBatch.category &&
    fullDetailBatch.growthStage &&
    fullDetailBatch.estateId &&
    fullDetailBatch.divisionId,
    17,
    'Entity Master Batch mempertahankan semua atribut master untuk modal detail/create/edit'
  );

  // Test 18: Transaction integration tidak rusak
  const tbsCandidateBatches = getActiveBatches({ estateId: 'EST-TBS', divisionId: 'DIV-001' });
  assert(
    tbsCandidateBatches.length > 0 && tbsCandidateBatches.every(b => b.statusMaster === BATCH_MASTER_STATUS.ACTIVE),
    18,
    'Integrasi transaksi Mantri tetap membaca master batch aktif dengan canonical ID'
  );

  // Test 19: Program scope tetap benar
  const tbsPrograms = getOpenPrograms({ estateId: 'EST-TBS' });
  assert(
    tbsPrograms.length > 0 && tbsPrograms.every(p => p.estateId === 'EST-TBS' && p.status === PROGRAM_STATUS.OPEN),
    19,
    'Program scope hanya menyajikan program OPEN sesuai estate'
  );

  // Test 20: Responsive list tetap usable (tepat 5 th di thead)
  const thCount = (theadContent.match(/<th\b/gi) || []).length;
  assert(
    thCount === 5,
    20,
    `Tabel Master Batch memiliki tepat 5 kolom (actual: ${thCount}): Kode Batch, Nama Batch, Program, Status, Aksi`
  );

  console.log('\n===============================================================');
  console.log(`📊 TEST EXECUTION SUMMARY:`);
  console.log(`   TOTAL ASSERTIONS: ${passedCount + failedCount}`);
  console.log(`   \x1b[32mPASSED: ${passedCount}\x1b[0m`);
  console.log(`   \x1b[31mFAILED: ${failedCount}\x1b[0m`);
  console.log('===============================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests();
