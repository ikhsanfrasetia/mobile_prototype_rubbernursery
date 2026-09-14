/**
 * scripts/test-sync-ui-dom.js
 * Test UI DOM rendering of /sync compact multiselect dropdown for both Aek Pamingke and Tanah Besih personas.
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

// Minimal DOM implementation for Node.js
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
    if (selector.includes('input[name="sync-division-cb"]') || selector === 'input[type="checkbox"]') {
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
import { getDemoPersonas } from '../js/data/demo-personas.js';
import { SyncPersistenceAdapter } from '../js/core/sync-engine.js';

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
console.log('       UI DOM VERIFICATION: /sync COMPACT MULTISELECT DROPDOWN (TASK-SYNC-FIX-03)      ');
console.log('========================================================================================\n');

async function testUi() {
  const personas = getDemoPersonas();

  // 1. PENGURUS Aek Pamingke (Mukhsin Haji) - Cross Estate Multiselect
  console.log('--- 1. UI: PENGURUS Aek Pamingke (Mukhsin Haji) ---');
  {
    const persona = personas.find(p => p.code === 'PGS002');
    session.start(persona);
    SyncPersistenceAdapter.clearSelection(persona.userId || persona.id);

    const appEl = new FakeElement('div');
    fakeDoc.getElementById = () => appEl;

    await renderSync();
    const checkboxes = appEl.querySelectorAll('input[name="sync-division-cb"]');
    const cbValues = checkboxes.map(c => c.value);

    assert(cbValues.length === 5, `Pengurus melihat seluruh 5 divisi (aktual: ${cbValues.length})`);
    assert(cbValues.includes('DIV-001') && cbValues.includes('DIV-002') && cbValues.includes('DIV-003'), 'Mengandung seluruh divisi Tanah Besih');
    assert(cbValues.includes('DIV-APM-01') && cbValues.includes('DIV-APM-02'), 'Mengandung seluruh divisi Aek Pamingke');
    assert(!cbValues.includes('DIV-APM'), 'Tidak mengandung aggregate DIV-APM');
    assert(appEl.estateHeaders.length === 2, 'Terdapat grouping untuk 2 Estate (Tanah Besih & Aek Pamingke)');
    console.log('   Estate group headers:', appEl.estateHeaders);
  }

  // 2. MANTRI TANAMAN Tanah Besih (Wagiman) - Multi Division in Estate
  console.log('\n--- 2. UI: MANTRI TANAMAN Tanah Besih (Wagiman) ---');
  {
    const persona = personas.find(p => p.code === 'MNT001');
    session.start(persona);
    SyncPersistenceAdapter.clearSelection(persona.userId || persona.id);

    const appEl = new FakeElement('div');
    fakeDoc.getElementById = () => appEl;

    await renderSync();
    const checkboxes = appEl.querySelectorAll('input[name="sync-division-cb"]');
    const cbValues = checkboxes.map(c => c.value);

    assert(cbValues.length === 3, 'Mantri TBS melihat seluruh 3 divisi operasional TBS');
    assert(cbValues.includes('DIV-001') && cbValues.includes('DIV-002') && cbValues.includes('DIV-003'), 'Opsi: DIV-001, DIV-002, DIV-003');
    assert(!cbValues.some(v => v.includes('APM')), 'Tidak ada opsi Aek Pamingke untuk Mantri TBS');
  }

  // 3. ASISTEN BIBITAN Aek Pamingke (Abdul Gofur) - Multi Division in Estate
  console.log('\n--- 3. UI: ASISTEN BIBITAN Aek Pamingke (Abdul Gofur) ---');
  {
    const persona = personas.find(p => p.code === 'ASB002');
    session.start(persona);
    SyncPersistenceAdapter.clearSelection(persona.userId || persona.id);

    const appEl = new FakeElement('div');
    fakeDoc.getElementById = () => appEl;

    await renderSync();
    const checkboxes = appEl.querySelectorAll('input[name="sync-division-cb"]');
    const cbValues = checkboxes.map(c => c.value);

    assert(cbValues.length === 2, 'ASB APM melihat seluruh 2 divisi operasional APM');
    assert(cbValues.includes('DIV-APM-01') && cbValues.includes('DIV-APM-02'), 'Opsi: DIV-APM-01 & DIV-APM-02');
    assert(!cbValues.some(v => v.includes('DIV-00')), 'Tidak ada divisi TBS untuk ASB APM');
  }

  // 4. ASKEP Tanah Besih (Beny Sihotang) - Multi Division in Estate
  console.log('\n--- 4. UI: ASKEP Tanah Besih (Beny Sihotang) ---');
  {
    const persona = personas.find(p => p.code === 'ASK001');
    session.start(persona);
    SyncPersistenceAdapter.clearSelection(persona.userId || persona.id);

    const appEl = new FakeElement('div');
    fakeDoc.getElementById = () => appEl;

    await renderSync();
    const checkboxes = appEl.querySelectorAll('input[name="sync-division-cb"]');
    const cbValues = checkboxes.map(c => c.value);

    assert(cbValues.length === 3, 'Askep TBS melihat 3 divisi operasional TBS');
    assert(!cbValues.some(v => v.includes('APM')), 'Bersih dari divisi APM');
  }

  // 5. Compact Dropdown State & Label Format
  console.log('\n--- 5. UI: Compact Dropdown State & Label Format ---');
  {
    const persona = personas.find(p => p.code === 'MNT001');
    session.start(persona);
    SyncPersistenceAdapter.clearSelection(persona.userId || persona.id);

    const appEl = new FakeElement('div');
    fakeDoc.getElementById = () => appEl;

    await renderSync();
    assert(appEl.menuHidden === true, 'Dropdown menu tertutup (hidden = true) secara default');
    assert(appEl.initialLabelText === 'Tanah Besih - Divisi I', 'Label default menampilkan divisi role aktif');
  }

  // 6. Session divisionId Immutability in UI
  console.log('\n--- 6. Session divisionId Immutability in UI ---');
  {
    const persona = personas.find(p => p.code === 'PGS002');
    session.start({
      ...persona,
      divisionId: 'DIV-APM-EST',
      estateId: 'EST-APM'
    });

    const appEl = new FakeElement('div');
    fakeDoc.getElementById = () => appEl;

    await renderSync();
    const currentSession = session.get();
    assert(currentSession.divisionId === 'DIV-APM-EST', 'session.divisionId TETAP DIV-APM-EST');
    assert(currentSession.estateId === 'EST-APM', 'session.estateId TETAP EST-APM');
  }

  console.log('\n========================================================================================');
  console.log(`TOTAL UI PASSED: ${passed} | TOTAL UI FAILED: ${failed}`);
  console.log('========================================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

testUi();
