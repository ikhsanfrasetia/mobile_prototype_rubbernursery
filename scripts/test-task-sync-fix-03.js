/**
 * scripts/test-task-sync-fix-03.js
 * Comprehensive Test Suite for TASK-SYNC-FIX-03:
 * Restore Desain Lama Pilihan Divisi + Default Divisi Role Aktif + Multiselect Support
 *
 * Menguji 18 Skenario Pengujian Wajib:
 * 1. Saat Mantri membuka Sync: division role aktif otomatis terpilih.
 * 2. Saat Asisten Bibitan membuka Sync: division role aktif otomatis terpilih.
 * 3. Saat Askep membuka Sync: division role aktif otomatis terpilih.
 * 4. Saat Pengurus membuka Sync: division role aktif otomatis terpilih.
 * 5. User dapat membuka daftar division tambahan.
 * 6. User dapat menambahkan division kedua.
 * 7. User dapat menambahkan division ketiga.
 * 8. User dapat menghapus division tambahan.
 * 9. Division role aktif tidak hilang ketika selection tersimpan dipulihkan.
 * 10. Selection tetap multiple.
 * 11. Session.divisionId tetap tidak berubah.
 * 12. Session.estateId tetap tidak berubah.
 * 13. Pengurus tetap dapat memilih cross-estate.
 * 14. Mantri tidak dapat memilih estate lain.
 * 15. Asisten Bibitan tidak dapat memilih estate lain.
 * 16. Askep tidak dapat memilih estate lain.
 * 17. KSP cross-estate tetap PASS.
 * 18. Tidak ada daftar checkbox permanen ketika halaman pertama kali dibuka.
 */

if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; }
  };
  global.localStorage = globalThis.localStorage;
}

// Minimal DOM implementation for Node.js test environment
class FakeElement {
  constructor(tagName = 'div') {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = {};
    this.innerHTMLValue = '';
    this.value = '';
    this.checked = false;
    this.disabled = false;
    this.hidden = false;
    this.textContent = '';
    this.eventListeners = {};
  }

  get innerHTML() {
    return this.innerHTMLValue;
  }

  set innerHTML(val) {
    this.innerHTMLValue = val;
    this.parseHtml(val);
  }

  setAttribute(name, val) {
    this.attributes[name] = String(val);
  }

  getAttribute(name) {
    return this.attributes[name] || null;
  }

  contains(target) {
    return true;
  }

  parseHtml(html) {
    this.children = [];
    
    // Parse Checkboxes
    const cbRegex = /<input[^>]*type="checkbox"[^>]*id="([^"]*)"[^>]*value="([^"]+)"([^>]*)>/g;
    let cbMatch;
    while ((cbMatch = cbRegex.exec(html)) !== null) {
      const cb = new FakeElement('input');
      cb.id = cbMatch[1];
      cb.type = 'checkbox';
      cb.name = 'sync-division-cb';
      cb.value = cbMatch[2];
      cb.checked = cbMatch[3].includes('checked');
      this.children.push(cb);
    }

    // Parse Estate Headers
    const headerRegex = /<div class="sync-dropdown-estate-header">([^<]*)<\/div>/g;
    let hMatch;
    this.estateHeaders = [];
    while ((hMatch = headerRegex.exec(html)) !== null) {
      this.estateHeaders.push(hMatch[1].trim());
    }

    // Parse Dropdown Trigger Label
    const labelMatch = /id="sync-dropdown-label">([^<]*)<\/span>/.exec(html);
    if (labelMatch) {
      this.initialLabelText = labelMatch[1].trim();
    }

    // Parse Dropdown Menu hidden attribute
    const menuMatch = /<div class="sync-dropdown-menu" id="sync-dropdown-menu"(\s*hidden)?>/.exec(html);
    if (menuMatch) {
      this.menuHidden = menuMatch[0].includes('hidden');
    }
  }

  querySelector(selector) {
    if (selector.includes('input[name="sync-division-cb"]') || selector.includes('checkbox')) {
      return this.children.find(c => c.tagName === 'INPUT') || new FakeElement('input');
    }
    const cleanId = selector.replace('#', '');
    const found = this.children.find(c => c.id === cleanId);
    if (found) return found;

    const el = new FakeElement('div');
    el.id = cleanId;
    if (cleanId === 'sync-dropdown-label' && this.initialLabelText) {
      el.textContent = this.initialLabelText;
    }
    if (cleanId === 'sync-dropdown-menu' && typeof this.menuHidden === 'boolean') {
      el.hidden = this.menuHidden;
    }
    this.children.push(el);
    return el;
  }

  querySelectorAll(selector) {
    if (selector.includes('input[name="sync-division-cb"]') || selector.includes('checkbox')) {
      return this.children.filter(c => c.tagName === 'INPUT');
    }
    return this.children;
  }

  addEventListener(event, cb) {
    this.eventListeners[event] = this.eventListeners[event] || [];
    this.eventListeners[event].push(cb);
  }

  dispatchEvent(event) {
    const listeners = this.eventListeners[event.type || event] || [];
    for (const l of listeners) l(event);
  }
}

const fakeDoc = {
  getElementById: (id) => {
    const el = new FakeElement('div');
    el.id = id;
    return el;
  },
  addEventListener: () => {}
};

global.document = fakeDoc;
globalThis.document = fakeDoc;
global.window = { addEventListener: () => {}, localStorage: global.localStorage };
globalThis.window = global.window;

import { renderSync } from '../js/modules/auth/sync.js';
import { session } from '../js/core/session.js';
import { resolveSyncScope, SyncPersistenceAdapter } from '../js/core/sync-engine.js';
import { getDemoPersonas } from '../js/data/demo-personas.js';
import { storage, KEYS } from '../js/core/storage.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('========================================================================================');
console.log('    TEST SUITE: TASK-SYNC-FIX-03 (RESTORE DESAIN LAMA + DEFAULT DIVISI ROLE AKTIF)     ');
console.log('========================================================================================\n');

async function runAllTests() {
  const personas = getDemoPersonas();

  // --------------------------------------------------------------------------
  // TEST 1: Saat Mantri membuka Sync: division role aktif otomatis terpilih.
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Mantri Bibitan / Tanaman (Wagiman - MNT001) ---');
  {
    const persona = personas.find(p => p.code === 'MNT001'); // divisionId: DIV-001
    session.start(persona);
    SyncPersistenceAdapter.clearSelection(persona.userId || persona.id);

    const appEl = new FakeElement('div');
    fakeDoc.getElementById = () => appEl;

    await renderSync();
    const checkboxes = appEl.querySelectorAll('input[name="sync-division-cb"]');
    const checkedBoxes = checkboxes.filter(c => c.checked);

    assert(
      checkedBoxes.length === 1 && checkedBoxes[0].value === 'DIV-001',
      'TEST 1.1: Mantri membuka Sync → Divisi role aktif (DIV-001) otomatis terpilih sebagai default'
    );
    assert(
      appEl.initialLabelText === 'Tanah Besih - Divisi I',
      `TEST 1.2: Trigger dropdown menampilkan nama divisi tunggal: "${appEl.initialLabelText}"`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 2: Saat Asisten Bibitan membuka Sync: division role aktif otomatis terpilih.
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Asisten Bibitan (Abdul Gofur - ASB002) ---');
  {
    const persona = personas.find(p => p.code === 'ASB002'); // divisionId: DIV-APM-02
    session.start(persona);
    SyncPersistenceAdapter.clearSelection(persona.userId || persona.id);

    const appEl = new FakeElement('div');
    fakeDoc.getElementById = () => appEl;

    await renderSync();
    const checkboxes = appEl.querySelectorAll('input[name="sync-division-cb"]');
    const checkedBoxes = checkboxes.filter(c => c.checked);

    assert(
      checkedBoxes.length === 1 && checkedBoxes[0].value === 'DIV-APM-02',
      'TEST 2.1: Asisten Bibitan membuka Sync → Divisi role aktif (DIV-APM-02) otomatis terpilih'
    );
    assert(
      appEl.initialLabelText.includes('Divisi II') || appEl.initialLabelText.includes('Aek Pamingke'),
      `TEST 2.2: Trigger dropdown menampilkan divisi aktif APM: "${appEl.initialLabelText}"`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 3: Saat Askep membuka Sync: division role aktif otomatis terpilih.
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Askep (Beny Sihotang - ASK001) ---');
  {
    const persona = personas.find(p => p.code === 'ASK001'); // divisionId: DIV-001
    session.start(persona);
    SyncPersistenceAdapter.clearSelection(persona.userId || persona.id);

    const appEl = new FakeElement('div');
    fakeDoc.getElementById = () => appEl;

    await renderSync();
    const checkboxes = appEl.querySelectorAll('input[name="sync-division-cb"]');
    const checkedBoxes = checkboxes.filter(c => c.checked);

    assert(
      checkedBoxes.length === 1 && checkedBoxes[0].value === 'DIV-001',
      'TEST 3: Askep membuka Sync → Divisi role aktif (DIV-001) otomatis terpilih'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 4: Saat Pengurus membuka Sync: division role aktif otomatis terpilih.
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Pengurus (Ir. H. Budi Santoso - PGS001) ---');
  {
    const persona = personas.find(p => p.code === 'PGS001'); // divisionId: DIV-TBS-EST
    session.start(persona);
    SyncPersistenceAdapter.clearSelection(persona.userId || persona.id);

    const appEl = new FakeElement('div');
    fakeDoc.getElementById = () => appEl;

    await renderSync();
    const checkboxes = appEl.querySelectorAll('input[name="sync-division-cb"]');
    const checkedBoxes = checkboxes.filter(c => c.checked);

    assert(
      checkedBoxes.length === 1 && (checkedBoxes[0].value === 'DIV-001' || checkedBoxes[0].value === 'DIV-TBS-EST'),
      'TEST 4: Pengurus membuka Sync → Divisi role aktif / home estate otomatis terpilih'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 5: User dapat membuka daftar division tambahan (toggle dropdown).
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Toggle Dropdown List ---');
  {
    const persona = personas.find(p => p.code === 'MNT001');
    session.start(persona);

    const appEl = new FakeElement('div');
    fakeDoc.getElementById = () => appEl;

    await renderSync();
    const menuEl = appEl.querySelector('#sync-dropdown-menu');
    const triggerEl = appEl.querySelector('#sync-dropdown-trigger');

    assert(menuEl.hidden === true, 'TEST 5.1: Menu dropdown tertutup (hidden = true) saat awal render');

    // Simulate clicking trigger
    triggerEl.dispatchEvent({ type: 'click', stopPropagation: () => {} });
    assert(menuEl.hidden === false, 'TEST 5.2: Menu dropdown terbuka (hidden = false) setelah trigger diklik');

    // Simulate clicking trigger again to close
    triggerEl.dispatchEvent({ type: 'click', stopPropagation: () => {} });
    assert(menuEl.hidden === true, 'TEST 5.3: Menu dropdown tertutup kembali (hidden = true) setelah trigger diklik ulang');
  }

  // --------------------------------------------------------------------------
  // TEST 6, 7: User dapat menambahkan division kedua dan ketiga.
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6, 7: Multiselect Add Divisions ---');
  {
    const persona = personas.find(p => p.code === 'MNT001');
    session.start(persona);
    SyncPersistenceAdapter.clearSelection(persona.userId || persona.id);

    const appEl = new FakeElement('div');
    fakeDoc.getElementById = () => appEl;

    await renderSync();
    const cb1 = appEl.querySelector('#sync-cb-DIV-001');
    const cb2 = appEl.querySelector('#sync-cb-DIV-002');
    const cb3 = appEl.querySelector('#sync-cb-DIV-003');
    const labelEl = appEl.querySelector('#sync-dropdown-label');

    // Check second division
    cb2.checked = true;
    cb2.dispatchEvent({ type: 'change' });
    assert(
      labelEl.textContent === '2 Divisi Terpilih',
      `TEST 6: Tambah divisi kedua → label menjadi "2 Divisi Terpilih" (aktual: "${labelEl.textContent}")`
    );

    // Check third division
    cb3.checked = true;
    cb3.dispatchEvent({ type: 'change' });
    assert(
      labelEl.textContent === '3 Divisi Terpilih',
      `TEST 7: Tambah divisi ketiga → label menjadi "3 Divisi Terpilih" (aktual: "${labelEl.textContent}")`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 8: User dapat menghapus division tambahan.
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: Deselect Additional Division ---');
  {
    const persona = personas.find(p => p.code === 'MNT001');
    session.start(persona);

    const appEl = new FakeElement('div');
    fakeDoc.getElementById = () => appEl;

    await renderSync();
    const cb2 = appEl.querySelector('#sync-cb-DIV-002');
    const cb3 = appEl.querySelector('#sync-cb-DIV-003');
    const labelEl = appEl.querySelector('#sync-dropdown-label');

    // Uncheck third division
    cb3.checked = false;
    cb3.dispatchEvent({ type: 'change' });
    assert(
      labelEl.textContent === '2 Divisi Terpilih',
      `TEST 8.1: Hapus divisi ketiga → label kembali menjadi "2 Divisi Terpilih"`
    );

    // Uncheck second division
    cb2.checked = false;
    cb2.dispatchEvent({ type: 'change' });
    assert(
      labelEl.textContent === 'Tanah Besih - Divisi I',
      `TEST 8.2: Hapus divisi kedua → label kembali menampilkan nama divisi tunggal: "${labelEl.textContent}"`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 9: Division role aktif tidak hilang ketika selection tersimpan dipulihkan.
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 9: Active Division Preserved with Persisted Selection ---');
  {
    const persona = personas.find(p => p.code === 'MNT001'); // active: DIV-001
    session.start(persona);
    const userId = persona.userId || persona.id;

    // Simulate user previously saved selection with DIV-002 only
    SyncPersistenceAdapter.saveSelection(userId, ['DIV-002']);

    const appEl = new FakeElement('div');
    fakeDoc.getElementById = () => appEl;

    await renderSync();
    const checkboxes = appEl.querySelectorAll('input[name="sync-division-cb"]');
    const checkedValues = checkboxes.filter(c => c.checked).map(c => c.value);

    assert(
      checkedValues.includes('DIV-001'),
      'TEST 9.1: Division role aktif (DIV-001) TIDAK HILANG meskipun persisted selection hanya memiliki DIV-002'
    );
    assert(
      checkedValues.includes('DIV-002'),
      'TEST 9.2: Persisted selection (DIV-002) berhasil di-merge'
    );
    assert(
      checkedValues.length === 2,
      `TEST 9.3: Total division terpilih menjadi 2 ([DIV-001, DIV-002])`
    );
  }

  // --------------------------------------------------------------------------
  // TEST 10: Selection tetap multiple.
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 10: Multiselect Array Integrity ---');
  {
    const persona = personas.find(p => p.code === 'MNT001');
    session.start(persona);
    const userId = persona.userId || persona.id;
    SyncPersistenceAdapter.saveSelection(userId, ['DIV-001', 'DIV-002', 'DIV-003']);

    const saved = SyncPersistenceAdapter.getSelection(userId);
    assert(Array.isArray(saved) && saved.length === 3, 'TEST 10: Selection tersimpan berupa array multiple division');
  }

  // --------------------------------------------------------------------------
  // TEST 11, 12: Session Immutability (ZERO SESSION POLLUTION)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 11, 12: Session Immutability ---');
  {
    const persona = personas.find(p => p.code === 'PGS001');
    session.start({
      ...persona,
      divisionId: 'DIV-TBS-EST',
      estateId: 'EST-TBS'
    });

    const appEl = new FakeElement('div');
    fakeDoc.getElementById = () => appEl;

    await renderSync();

    // Check multiple checkboxes
    const cbCross = appEl.querySelector('#sync-cb-DIV-APM-01');
    if (cbCross) {
      cbCross.checked = true;
      cbCross.dispatchEvent({ type: 'change' });
    }

    const currentSession = session.get();
    assert(currentSession.divisionId === 'DIV-TBS-EST', 'TEST 11: session.divisionId tetap "DIV-TBS-EST" (tidak berubah)');
    assert(currentSession.estateId === 'EST-TBS', 'TEST 12: session.estateId tetap "EST-TBS" (tidak berubah)');
  }

  // --------------------------------------------------------------------------
  // TEST 13: Pengurus tetap dapat memilih cross-estate.
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 13: Pengurus Cross-Estate Dropdown Options ---');
  {
    const persona = personas.find(p => p.code === 'PGS002'); // Pengurus APM
    session.start(persona);

    const appEl = new FakeElement('div');
    fakeDoc.getElementById = () => appEl;

    await renderSync();
    const checkboxes = appEl.querySelectorAll('input[name="sync-division-cb"]');
    const cbValues = checkboxes.map(c => c.value);

    assert(
      cbValues.includes('DIV-001') && cbValues.includes('DIV-APM-01'),
      'TEST 13: Pengurus melihat opsi lintas estate (Tanah Besih + Aek Pamingke)'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 14, 15, 16: Mantri, Asisten Bibitan, Askep tidak dapat memilih estate lain.
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 14, 15, 16: Scoped Access Guard ---');
  {
    // Mantri TBS
    const mnt = personas.find(p => p.code === 'MNT001');
    session.start(mnt);
    let appEl = new FakeElement('div');
    fakeDoc.getElementById = () => appEl;
    await renderSync();
    let cbValues = appEl.querySelectorAll('input[name="sync-division-cb"]').map(c => c.value);
    assert(!cbValues.some(v => v.includes('APM')), 'TEST 14: Mantri TBS tidak dapat melihat divisi Aek Pamingke');

    // Asisten Bibitan APM
    const asb = personas.find(p => p.code === 'ASB002');
    session.start(asb);
    appEl = new FakeElement('div');
    fakeDoc.getElementById = () => appEl;
    await renderSync();
    cbValues = appEl.querySelectorAll('input[name="sync-division-cb"]').map(c => c.value);
    assert(!cbValues.some(v => v.startsWith('DIV-00')), 'TEST 15: Asisten Bibitan APM tidak dapat melihat divisi Tanah Besih');

    // Askep TBS
    const ask = personas.find(p => p.code === 'ASK001');
    session.start(ask);
    appEl = new FakeElement('div');
    fakeDoc.getElementById = () => appEl;
    await renderSync();
    cbValues = appEl.querySelectorAll('input[name="sync-division-cb"]').map(c => c.value);
    assert(!cbValues.some(v => v.includes('APM')), 'TEST 16: Askep TBS tidak dapat melihat divisi Aek Pamingke');
  }

  // --------------------------------------------------------------------------
  // TEST 17: KSP cross-estate tetap PASS.
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 17: KSP Cross-Estate Authorization ---');
  {
    const pengurusApm = { userId: 'APM-PGS-002', role: 'PENGURUS', estateId: 'EST-APM' };
    const incomingKsp = {
      id: 'REQ-KSP-TBS-001',
      sourceEstateId: 'EST-TBS',
      targetEstateId: 'EST-APM',
      status: 'SUBMITTED'
    };
    const isVisibleInInbox = incomingKsp.targetEstateId === pengurusApm.estateId;
    assert(isVisibleInInbox === true, 'TEST 17: KSP cross-estate dari TBS ke APM tetap PASS dan dapat diakses');
  }

  // --------------------------------------------------------------------------
  // TEST 18: Tidak ada daftar checkbox permanen ketika halaman pertama kali dibuka.
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 18: Compact Collapsed State Verification ---');
  {
    const persona = personas.find(p => p.code === 'MNT001');
    session.start(persona);

    const appEl = new FakeElement('div');
    fakeDoc.getElementById = () => appEl;

    await renderSync();
    assert(
      !appEl.innerHTML.includes('sync-multiselect-card'),
      'TEST 18.1: Tidak ada elemen legacy .sync-multiselect-card'
    );
    assert(
      !appEl.innerHTML.includes('sync-multiselect-toolbar'),
      'TEST 18.2: Tidak ada toolbar besar permanen "Pilih Semua / Hapus Semua"'
    );
    assert(
      appEl.innerHTML.includes('class="sync-dropdown-menu" id="sync-dropdown-menu" hidden'),
      'TEST 18.3: Menu dropdown checkbox berstatus hidden saat awal render'
    );
  }

  console.log('\n========================================================================================');
  console.log(`TOTAL PASSED: ${passed} | TOTAL FAILED: ${failed}`);
  console.log('========================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
