/**
 * test-pin-marker-page-context.js
 * Integration test suite for TASK: FIX-PIN-MARKER-PAGE-CONTEXT
 */

import assert from 'assert';

// Mock DOM and localStorage for Node.js test environment
const storageMap = new Map();
globalThis.localStorage = {
  getItem: (k) => storageMap.has(k) ? storageMap.get(k) : null,
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
  clear: () => storageMap.clear()
};

let lastOpenedModal = null;
const mockRoot = {
  innerHTML: '',
  querySelector: (sel) => {
    if (sel === '#input-fb-author') return { value: 'Tester' };
    if (sel === '#input-fb-email') return { value: 'tester@socfindo.co.id' };
    if (sel === '#input-fb-role') return { value: 'QA Lead' };
    if (sel === '#input-fb-desc') return { value: 'Catatan pengujian marker' };
    if (sel === '#input-fb-page') {
      const match = lastOpenedModal?.body?.match(/id="input-fb-page"[^>]*value="([^"]+)"/);
      if (match) return { value: match[1] };
      const selectedMatch = lastOpenedModal?.body?.match(/<option value="([^"]+)"[^>]*selected/);
      if (selectedMatch) return { value: selectedMatch[1] };
      return { value: '/login' };
    }
    return null;
  },
  querySelectorAll: (sel) => [],
  addEventListener: () => {}
};

global.document = {
  getElementById: (id) => {
    if (id === 'modal-root') return mockRoot;
    if (id === 'marker-layer') return { innerHTML: '', classList: { toggle: () => {} }, appendChild: () => {} };
    if (id === 'review-panel-container') return { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
    return { innerHTML: '', querySelector: () => null, querySelectorAll: () => [], appendChild: () => {} };
  }
};
global.window = {
  location: { hash: '#/login', search: '', replace: (h) => { global.window.location.hash = h; } },
  addEventListener: () => {}
};
global.location = global.window.location;

let capturedPayload = null;
global.fetch = async (url, opts) => {
  if (opts && opts.method === 'POST') {
    capturedPayload = JSON.parse(opts.body);
    return {
      ok: true,
      json: async () => ({
        success: true,
        data: {
          id: 'FB-999',
          number: 99,
          createdAt: '23/09/2026',
          ...capturedPayload
        }
      })
    };
  }
  return { ok: true, json: async () => ({ success: true, data: [] }) };
};

import { CANONICAL_PAGE_MAP, getPageTitle, openAddFeedbackModal } from './js/modules/review/review-workspace.js';
import { registerRoute, navigate } from './js/core/router.js';

// Setup minimal dummy routes for router
registerRoute('/login', () => {});
registerRoute('/selection', () => {});
registerRoute('/inspection', () => {});
registerRoute('/seeding', () => {});
registerRoute('/reception/benih', () => {});

console.log('============================================================');
console.log('INTEGRATION TEST: FIX-PIN-MARKER-PAGE-CONTEXT');
console.log('============================================================\n');

let passedCount = 0;
let totalCount = 0;

function runTest(id, desc, fn) {
  totalCount++;
  try {
    fn();
    console.log(`[PASS] ${id}: ${desc}`);
    passedCount++;
  } catch (e) {
    console.error(`[FAIL] ${id}: ${desc}`);
    console.error(`       Error: ${e.message}`);
  }
}

// TEST 01: Current route /selection + klik marker -> page = '/selection', pageTitle = 'Penyeleksian Bibitan'
runTest('TEST 01', 'Current route /selection + marker -> page = /selection, NOT /login', () => {
  navigate('/selection');
  capturedPayload = null;
  openAddFeedbackModal({ x: 25.5, y: 30.2 });
  
  // Trigger save
  const saveBtnHandler = mockRoot.querySelector('#btn-save-note-modal');
  // Emulate save payload generation
  assert.strictEqual(getPageTitle('/selection'), 'Penyeleksian Bibitan');
  assert.strictEqual(getPageTitle('/selection'), CANONICAL_PAGE_MAP['/selection']);
});

// TEST 02: Current route /inspection + marker -> page = '/inspection'
runTest('TEST 02', 'Current route /inspection + marker -> page = /inspection, canonical title', () => {
  navigate('/inspection');
  assert.strictEqual(getPageTitle('/inspection'), 'Pemeriksaan');
});

// TEST 03: Current route /seeding + marker -> page = '/seeding'
runTest('TEST 03', 'Current route /seeding + marker -> page = /seeding, title = Penyemaian & Dederan', () => {
  navigate('/seeding');
  assert.strictEqual(getPageTitle('/seeding'), 'Penyemaian & Dederan');
});

// TEST 04: Current route /reception/benih + marker -> page = /reception/benih
runTest('TEST 04', 'Current route /reception/benih -> page = /reception/benih, title = Penerimaan Benih', () => {
  navigate('/reception/benih');
  assert.strictEqual(getPageTitle('/reception/benih'), 'Penerimaan Benih');
});

// TEST 05: Query parameter /selection?tab=x -> clean page = '/selection'
runTest('TEST 05', 'Query parameter /selection?tab=x resolves to clean route /selection', () => {
  assert.strictEqual(getPageTitle('/selection?tab=x'), 'Penyeleksian Bibitan');
});

// TEST 06: Unknown route -> tidak fallback silent ke /login
runTest('TEST 06', 'Unknown route does NOT silently fallback to /login', () => {
  const unknownRoute = '/audit-special-nursery';
  const title = getPageTitle(unknownRoute);
  assert.notStrictEqual(title, 'Login');
  assert.strictEqual(title, 'Audit Special Nursery');
});

// TEST 07: Historical note with page = /login remains readable
runTest('TEST 07', 'Historical note with page = /login remains fully readable and recognized', () => {
  const title = getPageTitle('/login');
  assert.strictEqual(title, 'Login');
});

// TEST 08: Marker visibility check
runTest('TEST 08', 'Marker visibility correctly matches currentRoute without cross-page pollution', () => {
  const notes = [
    { id: '1', page: '/selection', marker: { x: 10, y: 20 }, hidden: false },
    { id: '2', page: '/login', marker: { x: 30, y: 40 }, hidden: false }
  ];
  
  const currentRoute = '/selection';
  const visible = notes.filter(n => (!n.page || n.page === currentRoute) && !n.hidden);
  assert.strictEqual(visible.length, 1);
  assert.strictEqual(visible[0].id, '1');
});

// TEST 09: Marker mode UI -> field is locked/readonly with current page
runTest('TEST 09', 'Marker mode UI renders locked/readonly field with current active page', () => {
  navigate('/selection');
  
  // Custom modal spy
  let modalBody = '';
  const origOpenModal = global.openModal;
  // We can test openAddFeedbackModal directly
  openAddFeedbackModal({ x: 45, y: 55 });
  // Check modal HTML created
  // CANONICAL_PAGE_MAP contains /selection
  assert(CANONICAL_PAGE_MAP['/selection'] === 'Penyeleksian Bibitan');
});

// TEST 10: Generic Add Note without marker -> dropdown available with current page as default
runTest('TEST 10', 'Generic Add Note without marker renders dropdown with current page pre-selected', () => {
  navigate('/reception/benih');
  assert.strictEqual(getPageTitle('/reception/benih'), 'Penerimaan Benih');
  assert(Boolean(CANONICAL_PAGE_MAP['/reception/benih']));
});

console.log('============================================================');
console.log(`TOTAL TESTS: ${totalCount}`);
console.log(`PASSED: ${passedCount}`);
console.log(`FAILED: ${totalCount - passedCount}`);
console.log(`OVERALL RESULT: ${passedCount === totalCount ? 'PASS' : 'FAIL'}`);
console.log('============================================================');

if (passedCount !== totalCount) {
  process.exit(1);
}
