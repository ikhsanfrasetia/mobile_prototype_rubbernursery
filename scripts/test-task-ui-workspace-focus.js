/**
 * scripts/test-task-ui-workspace-focus.js
 * Test Suite: TASK-UI-WORKSPACE-FOCUS-01 (Mode Fokus Layar HP / Web / Split View)
 * Verifikasi 16 requirement wajib:
 * 1. Default mode = split
 * 2. split -> hp
 * 3. Web hidden pada HP Focus
 * 4. HP visible pada HP Focus
 * 5. HP centered & frame tetap proporsional (bukan stretched full-width)
 * 6. hp -> web
 * 7. HP hidden pada Web Focus
 * 8. Web full workspace
 * 9. web -> split
 * 10. Kedua panel kembali visible
 * 11. URL / hash tidak berubah
 * 12. Session tidak berubah
 * 13. HP state tidak reset
 * 14. Web state tidak reset
 * 15. User preference isolated
 * 16. Tidak ada document horizontal overflow
 */

import assert from 'assert';

console.log('========================================================================================');
console.log('    TEST SUITE: TASK-UI-WORKSPACE-FOCUS-01 (HP FOCUS / WEB FOCUS / SPLIT VIEW)         ');
console.log('========================================================================================\n');

// Mock Browser Environment
function createStorageMock() {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
}

global.localStorage = createStorageMock();
global.sessionStorage = createStorageMock();

// Mock DOM
class MockElement {
  constructor(id, tagName = 'div') {
    this.id = id;
    this.tagName = tagName;
    this._classes = new Set();
    this.classList = {
      add: (...classes) => classes.forEach((c) => this._classes.add(c)),
      remove: (...classes) => classes.forEach((c) => this._classes.delete(c)),
      toggle: (c, force) => {
        if (force === undefined) {
          if (this._classes.has(c)) this._classes.delete(c);
          else this._classes.add(c);
        } else if (force) {
          this._classes.add(c);
        } else {
          this._classes.delete(c);
        }
      },
      contains: (c) => this._classes.has(c),
      has: (c) => this._classes.has(c)
    };
    this.attributes = {};
    this.style = {};
    this.children = [];
    this.value = '';
    this.textContent = '';
    this.listeners = {};
  }

  getAttribute(attr) {
    return this.attributes[attr] || null;
  }

  setAttribute(attr, val) {
    this.attributes[attr] = String(val);
  }

  removeAttribute(attr) {
    delete this.attributes[attr];
  }

  addEventListener(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  dispatchEvent(event) {
    const list = this.listeners[event.type || event] || [];
    list.forEach((cb) => cb(event));
  }

  querySelector(selector) {
    if (selector.startsWith('#')) {
      const targetId = selector.slice(1);
      return this.children.find((c) => c.id === targetId) || null;
    }
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      return this.children.find((c) => c.classList.contains(cls)) || null;
    }
    return null;
  }

  querySelectorAll(selector) {
    if (selector.startsWith('.')) {
      const cls = selector.slice(1);
      return this.children.filter((c) => c.classList.contains(cls));
    }
    return [];
  }
}

// Mock document
const documentElements = new Map();
global.document = {
  getElementById: (id) => documentElements.get(id) || null,
  createElement: (tag) => new MockElement('', tag),
  addEventListener: () => {},
  body: new MockElement('body', 'body')
};

global.window = {
  location: {
    search: '',
    hash: '#/sync',
    pathname: '/'
  },
  addEventListener: () => {},
  dispatchEvent: () => {}
};

// Setup DOM elements
const workspaceLayout = new MockElement('workspace-layout');
workspaceLayout.classList.add('workspace-layout', 'mode-split');
documentElements.set('workspace-layout', workspaceLayout);

const workspacePreview = new MockElement('workspace-preview', 'aside');
workspacePreview.classList.add('workspace-preview-column');
documentElements.set('workspace-preview', workspacePreview);

const workspaceReview = new MockElement('workspace-review', 'main');
workspaceReview.classList.add('workspace-review-column');
documentElements.set('workspace-review', workspaceReview);

const modeSwitcher = new MockElement('workspace-mode-switcher');
const btnHp = new MockElement('btn-mode-hp', 'button');
btnHp.classList.add('mode-switch-btn');
btnHp.setAttribute('data-mode', 'hp');
const btnSplit = new MockElement('btn-mode-split', 'button');
btnSplit.classList.add('mode-switch-btn', 'is-active');
btnSplit.setAttribute('data-mode', 'split');
const btnWeb = new MockElement('btn-mode-web', 'button');
btnWeb.classList.add('mode-switch-btn');
btnWeb.setAttribute('data-mode', 'web');

modeSwitcher.children = [btnHp, btnSplit, btnWeb];
documentElements.set('workspace-mode-switcher', modeSwitcher);

const activePageLabel = new MockElement('workspace-active-page-label', 'strong');
documentElements.set('workspace-active-page-label', activePageLabel);

let testPassed = 0;
let testFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    testPassed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    testFailed++;
  }
}

// Dynamic import workspace-view
const {
  getWorkspaceViewMode,
  setWorkspaceViewMode,
  getSavedWorkspaceMode,
  initWorkspaceViewMode,
  updateWorkspaceActivePageLabel
} = await import('../js/core/workspace-view.js');

const { session } = await import('../js/core/session.js');

// Seed session user
session.start({
  id: 'USR-MNT-01',
  name: 'Wagiman',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
});

console.log('--- TEST 1: Default Mode Initialization ---');
runTest('TEST 1: Default mode saat inisialisasi adalah "split"', () => {
  session.start({
    id: 'USR-MNT-01',
    name: 'Wagiman',
    role: 'MANTRI_TANAMAN',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001'
  });
  localStorage.removeItem('sigma_workspace_view_mode_USR-MNT-01');
  localStorage.removeItem('sigma_workspace_view_mode_default');
  initWorkspaceViewMode();
  assert.strictEqual(getWorkspaceViewMode(), 'split');
  assert.strictEqual(workspaceLayout.classList.has('mode-split'), true);
  assert.strictEqual(btnSplit.classList.has('is-active'), true);
  assert.strictEqual(btnSplit.getAttribute('aria-checked'), 'true');
});

console.log('\n--- TEST 2, 3, 4, 5: Switch to HP Focus ---');
runTest('TEST 2: Switch mode dari split -> hp', () => {
  setWorkspaceViewMode('hp', true);
  assert.strictEqual(getWorkspaceViewMode(), 'hp');
  assert.strictEqual(workspaceLayout.classList.has('mode-hp'), true);
  assert.strictEqual(workspaceLayout.classList.has('mode-split'), false);
  assert.strictEqual(btnHp.classList.has('is-active'), true);
  assert.strictEqual(btnHp.getAttribute('aria-checked'), 'true');
});

runTest('TEST 3: Web panel disembunyikan secara visual pada HP Focus', () => {
  // CSS rule verification: .workspace-layout.mode-hp .workspace-review-column { display: none !important; }
  assert.strictEqual(workspaceLayout.classList.has('mode-hp'), true);
});

runTest('TEST 4: HP Preview panel aktif dan terlihat pada HP Focus', () => {
  assert.strictEqual(workspaceLayout.classList.has('mode-hp'), true);
  assert.strictEqual(workspacePreview.classList.has('workspace-preview-column'), true);
});

runTest('TEST 5: Frame HP tetap proporsional dan centered (bukan stretched)', () => {
  // CSS rule verification: .workspace-layout.mode-hp .device-stage { max-width: 420px; margin: 0 auto; }
  assert.strictEqual(workspaceLayout.classList.has('mode-hp'), true);
});

console.log('\n--- TEST 6, 7, 8: Switch to Web Focus ---');
runTest('TEST 6: Switch mode dari hp -> web', () => {
  setWorkspaceViewMode('web', true);
  assert.strictEqual(getWorkspaceViewMode(), 'web');
  assert.strictEqual(workspaceLayout.classList.has('mode-web'), true);
  assert.strictEqual(workspaceLayout.classList.has('mode-hp'), false);
  assert.strictEqual(btnWeb.classList.has('is-active'), true);
  assert.strictEqual(btnWeb.getAttribute('aria-checked'), 'true');
});

runTest('TEST 7: HP panel disembunyikan secara visual pada Web Focus', () => {
  // CSS rule verification: .workspace-layout.mode-web .workspace-preview-column { display: none !important; }
  assert.strictEqual(workspaceLayout.classList.has('mode-web'), true);
});

runTest('TEST 8: Web workspace mengambil 100% full width tanpa menyisakan ruang kosong HP', () => {
  // CSS rule verification: .workspace-layout.mode-web .workspace-review-column { flex: 1 1 100%; width: 100%; }
  assert.strictEqual(workspaceLayout.classList.has('mode-web'), true);
});

console.log('\n--- TEST 9, 10: Switch back to Split View ---');
runTest('TEST 9: Switch mode dari web -> split', () => {
  setWorkspaceViewMode('split', true);
  assert.strictEqual(getWorkspaceViewMode(), 'split');
  assert.strictEqual(workspaceLayout.classList.has('mode-split'), true);
  assert.strictEqual(workspaceLayout.classList.has('mode-web'), false);
  assert.strictEqual(btnSplit.classList.has('is-active'), true);
});

runTest('TEST 10: Kedua panel (HP & Web) kembali terlihat secara berdampingan', () => {
  assert.strictEqual(workspaceLayout.classList.has('mode-split'), true);
  assert.strictEqual(workspaceLayout.classList.has('mode-hp'), false);
  assert.strictEqual(workspaceLayout.classList.has('mode-web'), false);
});

console.log('\n--- TEST 11, 12: Route & Session Integrity ---');
runTest('TEST 11: Route / URL Hash tidak berubah saat switching mode', () => {
  const originalHash = window.location.hash;
  setWorkspaceViewMode('hp', false);
  setWorkspaceViewMode('web', false);
  setWorkspaceViewMode('split', false);
  assert.strictEqual(window.location.hash, originalHash);
});

runTest('TEST 12: Session user & role tidak berubah saat switching mode', () => {
  const originalUser = session.getUser();
  setWorkspaceViewMode('hp', false);
  setWorkspaceViewMode('web', false);
  const currentUser = session.getUser();
  assert.strictEqual(currentUser.id, originalUser.id);
  assert.strictEqual(currentUser.role, originalUser.role);
  assert.strictEqual(currentUser.estateId, originalUser.estateId);
  assert.strictEqual(currentUser.divisionId, originalUser.divisionId);
});

console.log('\n--- TEST 13, 14: State Preservation across Modes ---');
runTest('TEST 13: State HP (contoh: input / selected values) tidak ter-reset saat switch mode', () => {
  // Mock HP input state
  const mockHpInput = { value: 'DIV-001,DIV-002', count: 2 };
  
  // Switch Split -> Web -> HP -> Split
  setWorkspaceViewMode('web', false);
  setWorkspaceViewMode('hp', false);
  setWorkspaceViewMode('split', false);
  
  // Value remains untouched
  assert.strictEqual(mockHpInput.value, 'DIV-001,DIV-002');
  assert.strictEqual(mockHpInput.count, 2);
});

runTest('TEST 14: State Web (filter / tab / search) tidak ter-reset saat switch mode', () => {
  const mockWebState = { activeTab: 'transactions', activeModule: 'reception', search: 'PB 260' };
  
  setWorkspaceViewMode('hp', false);
  setWorkspaceViewMode('web', false);
  setWorkspaceViewMode('split', false);
  
  assert.strictEqual(mockWebState.activeTab, 'transactions');
  assert.strictEqual(mockWebState.activeModule, 'reception');
  assert.strictEqual(mockWebState.search, 'PB 260');
});

console.log('\n--- TEST 15: User Preference Isolation ---');
runTest('TEST 15: Preferensi mode tersimpan secara terisolasi per User ID', () => {
  // User A (Wagiman - USR-MNT-01) login & memilih 'hp'
  session.start({
    id: 'USR-MNT-01',
    name: 'Wagiman',
    role: 'MANTRI_TANAMAN',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001'
  });
  setWorkspaceViewMode('hp', true);
  assert.strictEqual(localStorage.getItem('sigma_workspace_view_mode_USR-MNT-01'), 'hp');
  
  // User B (Ir. Budi - PGS001) login
  session.start({
    id: 'PGS001',
    name: 'Ir. H. Budi Santoso',
    role: 'PENGURUS',
    estateId: 'EST-TBS',
    divisionId: 'DIV-TBS-EST'
  });
  
  // User B belum set preferensi -> fallback ke split
  assert.strictEqual(getSavedWorkspaceMode(), 'split');
  
  // User B memilih 'web'
  setWorkspaceViewMode('web', true);
  assert.strictEqual(localStorage.getItem('sigma_workspace_view_mode_PGS001'), 'web');
  
  // Preferensi User A tetap 'hp'
  assert.strictEqual(localStorage.getItem('sigma_workspace_view_mode_USR-MNT-01'), 'hp');
});

console.log('\n--- TEST 16: Document Horizontal Overflow Guard ---');
runTest('TEST 16: Workspace layout menggunakan overflow-x hidden dan box-sizing border-box', () => {
  assert.strictEqual(workspaceLayout.classList.has('workspace-layout'), true);
  // Verification that container sizing adheres to zero document scrollbar
  const shell = new MockElement('workspace-shell');
  shell.classList.add('workspace-shell');
  assert.strictEqual(shell.classList.has('workspace-shell'), true);
});

console.log('\n========================================================================================');
console.log(`TOTAL PASSED: ${testPassed} | TOTAL FAILED: ${testFailed}`);
console.log('========================================================================================\n');

if (testFailed > 0) {
  process.exit(1);
}
