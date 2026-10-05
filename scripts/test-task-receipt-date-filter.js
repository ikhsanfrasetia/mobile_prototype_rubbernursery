/**
 * scripts/test-task-receipt-date-filter.js
 * Integration test for Date Filtering on Receipt Landing page
 */

const memoryStore = new Map();
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem(k) { return memoryStore.has(k) ? memoryStore.get(k) : null; },
    setItem(k, v) { memoryStore.set(k, String(v)); },
    removeItem(k) { memoryStore.delete(k); },
    clear() { memoryStore.clear(); }
  };
}

// Mock DOM environment if running in Node
if (typeof document === 'undefined') {
  globalThis.document = {
    getElementById: (id) => {
      if (id === 'app') {
        if (!globalThis._appMock) {
          globalThis._appMock = {
            innerHTML: '',
            querySelector: (sel) => globalThis._mockQuerySelector(globalThis._appMock, sel),
            querySelectorAll: (sel) => globalThis._mockQuerySelectorAll(globalThis._appMock, sel),
            addEventListener: () => {}
          };
        }
        return globalThis._appMock;
      }
      return null;
    },
    addEventListener: () => {}
  };
}

globalThis._mockQuerySelector = (container, sel) => {
  const el = {
    id: sel.replace('#', '').replace('.', ''),
    style: {},
    dataset: { index: '0', doc: 'DOC-01', reason: '' },
    value: '',
    innerHTML: '',
    addEventListener: (evt, cb) => {
      el._handlers = el._handlers || {};
      el._handlers[evt] = cb;
    },
    click: () => {
      if (el._handlers && el._handlers['click']) {
        el._handlers['click']({ currentTarget: el, stopPropagation: () => {} });
      }
    }
  };
  return el;
};

globalThis._mockQuerySelectorAll = (container, sel) => {
  return [globalThis._mockQuerySelector(container, sel)];
};

import { storage } from '../js/core/storage.js';
import { session } from '../js/core/session.js';
import { todayDDMMYYYY, todayISO } from '../js/core/utils.js';
import { 
  renderReceiptLanding, 
  setSelectedReceiptDate, 
  getSelectedReceiptDate 
} from '../js/modules/receipt/receipt-landing.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== TEST: RECEIPT LANDING DATE FILTERING ===\n');

// Setup mock session
session.start({
  id: 'MNT001',
  name: 'Wagiman',
  role: 'MANTRI_TANAMAN',
  position: 'Mantri Bibitan',
  divisionId: 'DIV-001'
});

const todayStr = todayDDMMYYYY();
const yesterdayStr = '04/10/2026';

// Seed mock transactions: 1 today, 2 yesterday
const mockTxs = [
  {
    docNo: '2026/APR/001',
    tanggal: yesterdayStr,
    jenis: 'Benih / Biji Kelatak',
    program: 'PRG/NUR/TB/01/2026',
    qty: 500
  },
  {
    docNo: '2026/APR/002',
    tanggal: todayStr,
    jenis: 'Benih / Biji Kelatak',
    program: 'PRG/NUR/TB/01/2026',
    qty: 1200
  },
  {
    docNo: '2026/APR/003',
    tanggal: yesterdayStr,
    jenis: 'Benih / Biji Kelatak',
    program: 'PRG/NUR/TB/01/2026',
    qty: 800
  }
];

storage.set('receipt_transactions', mockTxs);

// TEST 1: Default selected date is Today
setSelectedReceiptDate(todayStr);
assert(getSelectedReceiptDate() === todayStr, 'Test 1: Default selected date is today');

// Render landing page
renderReceiptLanding();
const app = document.getElementById('app');

// Verify today's filtered data count (should be 1 out of 3)
assert(app.innerHTML.includes('Ringkasan Penerimaan (1)'), 'Test 2: Only 1 transaction for today is displayed on default view');
assert(app.innerHTML.includes('2026/APR/002'), 'Test 3: Today doc 2026/APR/002 is present in HTML');
assert(!app.innerHTML.includes('2026/APR/001'), 'Test 4: Yesterday doc 2026/APR/001 is filtered out on today view');

// TEST 2: Filter by Yesterday / Specific Date (04/10/2026)
setSelectedReceiptDate(yesterdayStr);
renderReceiptLanding();

assert(getSelectedReceiptDate() === yesterdayStr, 'Test 5: Selected date switched to 04/10/2026');
assert(app.innerHTML.includes('Ringkasan Penerimaan (2)'), 'Test 6: 2 transactions for 04/10/2026 are displayed');
assert(app.innerHTML.includes('2026/APR/001'), 'Test 7: 2026/APR/001 is present');
assert(app.innerHTML.includes('2026/APR/003'), 'Test 8: 2026/APR/003 is present');
assert(!app.innerHTML.includes('2026/APR/002'), 'Test 9: Today doc 2026/APR/002 is filtered out on yesterday view');
assert(app.innerHTML.includes('Menampilkan Data:') && app.innerHTML.includes('04/10/2026'), 'Test 10: Filter banner indicates custom date is active');

// TEST 3: Filter by a date with no records (Empty State)
setSelectedReceiptDate('01/01/2025');
renderReceiptLanding();

assert(app.innerHTML.includes('Ringkasan Penerimaan (0)'), 'Test 11: Summary header shows 0 items for empty date');
assert(app.innerHTML.includes('Tidak Ada Data Penerimaan'), 'Test 12: Empty state card is rendered');
assert(app.innerHTML.includes('Kembali ke Hari Ini'), 'Test 13: Reset button is provided in empty state');

// TEST 4: Reset back to today
setSelectedReceiptDate(todayStr);
renderReceiptLanding();
assert(app.innerHTML.includes('Ringkasan Penerimaan (1)'), 'Test 14: Reset to today restores today transaction count');

console.log(`\n================================`);
console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log(`================================`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
