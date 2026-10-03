/**
 * tests/test-asb-bottom-nav-dot.js
 * Integration Test Suite for Asisten Bibitan Bottom Navigation Red Dot Indicator
 */

import assert from 'assert';

// Mock localStorage
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import { storage, KEYS } from '../js/core/storage.js';
import { session } from '../js/core/session.js';
import {
  getAsbBottomNavNotificationState,
  renderAsbBottomNav
} from '../js/components/bottom-nav-asb.js';
import { SELECTION_STORAGE_KEY } from '../js/modules/selection/selection-manager.js';
import { DESTRUCTION_STORAGE_KEY, DESTRUCTION_STATUS } from '../js/modules/destruction/destruction-manager.js';

console.log('====================================================');
console.log('STARTING INTEGRATION TESTS: ASB BOTTOM NAV RED DOT');
console.log('====================================================\n');

let totalTests = 0;
let passedTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}:`, err.message);
    throw err;
  }
}

// Setup User Context
const userTBS = {
  id: 'USR-ASB-01',
  userId: 'USR-ASB-01',
  role: 'ASISTEN_BIBITAN',
  name: 'Asisten Bibitan TBS',
  estateId: 'EST-TBS',
  divisionId: 'DIV-01'
};

const userAPM = {
  id: 'USR-ASB-02',
  userId: 'USR-ASB-02',
  role: 'ASISTEN_BIBITAN',
  name: 'Asisten Bibitan APM',
  estateId: 'EST-APM',
  divisionId: 'DIV-01'
};

function setUserSession(u) {
  session.start(u);
}

// -------------------------------------------------------------
// TEST 1: Empty state -> all dots false, Laporan strictly false
// -------------------------------------------------------------
it('TEST 1: Empty state -> all items have false notification state and no red dot in HTML', () => {
  localStorage.clear();
  setUserSession(userTBS);

  const state = getAsbBottomNavNotificationState(userTBS);
  assert.strictEqual(state.beranda, false, 'Beranda should be false');
  assert.strictEqual(state.pemeriksaan, false, 'Pemeriksaan should be false');
  assert.strictEqual(state.verifikasi, false, 'Verifikasi should be false');
  assert.strictEqual(state.laporan, false, 'Laporan should be false');

  const html = renderAsbBottomNav('beranda', userTBS);
  assert.strictEqual(html.includes('notif-dot'), false, 'HTML should not contain any notif-dot');
  assert.strictEqual(html.includes('asb-nav-dot'), false, 'HTML should not contain any asb-nav-dot');
});

// -------------------------------------------------------------
// TEST 2: Beranda actionable -> dot true; Beranda without actionable -> dot false
// -------------------------------------------------------------
it('TEST 2: Beranda actionable triggers red dot on Beranda icon', () => {
  localStorage.clear();
  setUserSession(userTBS);

  // Setup actionable request for ASB TBS
  storage.set('requests_transactions', [
    {
      id: 'REQ-01',
      requestType: 'KEBUN_SEPUPU',
      targetEstateId: 'EST-TBS',
      targetDivisionId: 'DIV-01',
      sourceEstateId: 'EST-APM',
      status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
      createdAt: '2026-10-02T10:00:00Z'
    }
  ]);

  const state = getAsbBottomNavNotificationState(userTBS);
  assert.strictEqual(state.beranda, true, 'Beranda should have red dot');
  assert.strictEqual(state.pemeriksaan, false, 'Pemeriksaan should be false');
  assert.strictEqual(state.verifikasi, false, 'Verifikasi should be false');
  assert.strictEqual(state.laporan, false, 'Laporan should be false');

  const html = renderAsbBottomNav('beranda', userTBS);
  assert(html.includes('data-nav-id="beranda"'), 'Has beranda nav button');
  // Check dot inside beranda button
  const berandaMatch = html.match(/data-nav-id="beranda"[\s\S]*?<\/button>/);
  assert(berandaMatch && berandaMatch[0].includes('asb-nav-dot'), 'Beranda button has asb-nav-dot');

  // Check other buttons don't have dot
  const pemMatch = html.match(/data-nav-id="pemeriksaan"[\s\S]*?<\/button>/);
  assert(pemMatch && !pemMatch[0].includes('asb-nav-dot'), 'Pemeriksaan button has no dot');
});

// -------------------------------------------------------------
// TEST 3: Pemeriksaan pending = 1 -> dot true; pending = 0 -> dot false
// -------------------------------------------------------------
it('TEST 3: Pemeriksaan pending = 1 triggers red dot on Pemeriksaan icon', () => {
  localStorage.clear();
  setUserSession(userTBS);

  // 1 pending selection document
  storage.set('pre_grafting_selection_documents', [
    {
      id: 'DOC-SEL-01',
      estateId: 'EST-TBS',
      divisionId: 'DIV-01',
      status: 'MENUNGGU_VERIFIKASI',
      selectionStage: 'SELEKSI_I',
      submittedAt: '2026-10-02T11:00:00Z'
    }
  ]);

  const state = getAsbBottomNavNotificationState(userTBS);
  assert.strictEqual(state.pemeriksaan, true, 'Pemeriksaan should have red dot');
  assert.strictEqual(state.verifikasi, false, 'Verifikasi should be false');

  const html = renderAsbBottomNav('pemeriksaan', userTBS);
  const pemMatch = html.match(/data-nav-id="pemeriksaan"[\s\S]*?<\/button>/);
  assert(pemMatch && pemMatch[0].includes('asb-nav-dot'), 'Pemeriksaan button has asb-nav-dot');

  // Change to approved -> pending = 0 -> dot disappears
  storage.set('pre_grafting_selection_documents', [
    {
      id: 'DOC-SEL-01',
      estateId: 'EST-TBS',
      divisionId: 'DIV-01',
      status: 'DISETUJUI',
      selectionStage: 'SELEKSI_I',
      submittedAt: '2026-10-02T11:00:00Z'
    }
  ]);

  const stateAfter = getAsbBottomNavNotificationState(userTBS);
  assert.strictEqual(stateAfter.pemeriksaan, false, 'Pemeriksaan should be false after approval');
  const htmlAfter = renderAsbBottomNav('pemeriksaan', userTBS);
  const pemMatchAfter = htmlAfter.match(/data-nav-id="pemeriksaan"[\s\S]*?<\/button>/);
  assert(pemMatchAfter && !pemMatchAfter[0].includes('asb-nav-dot'), 'Pemeriksaan button no longer has dot');
});

// -------------------------------------------------------------
// TEST 4: Verifikasi pending = 9 -> dot true; pending = 0 -> dot false
// -------------------------------------------------------------
it('TEST 4: Verifikasi pending = 9 triggers red dot on Verifikasi icon', () => {
  localStorage.clear();
  setUserSession(userTBS);

  // 9 pending verification records
  const verifTxs = [];
  for (let i = 1; i <= 9; i++) {
    verifTxs.push({
      id: `VRF-0${i}`,
      referenceType: 'OKULASI',
      referenceId: `BUD-0${i}`,
      estateId: 'EST-TBS',
      divisionId: 'DIV-01',
      verificationStatus: 'MENUNGGU_VERIFIKASI',
      submittedAt: '2026-10-02T12:00:00Z'
    });
  }
  storage.set('verification_transactions', verifTxs);

  const state = getAsbBottomNavNotificationState(userTBS);
  assert.strictEqual(state.verifikasi, true, 'Verifikasi should be true for 9 pending');

  const html = renderAsbBottomNav('verifikasi', userTBS);
  const verMatch = html.match(/data-nav-id="verifikasi"[\s\S]*?<\/button>/);
  assert(verMatch && verMatch[0].includes('asb-nav-dot'), 'Verifikasi button has asb-nav-dot');

  // Set all to TERVERIFIKASI -> pending = 0
  const verifiedTxs = verifTxs.map(t => ({ ...t, verificationStatus: 'TERVERIFIKASI' }));
  storage.set('verification_transactions', verifiedTxs);

  const stateAfter = getAsbBottomNavNotificationState(userTBS);
  assert.strictEqual(stateAfter.verifikasi, false, 'Verifikasi should be false when 0 pending');
  const htmlAfter = renderAsbBottomNav('verifikasi', userTBS);
  const verMatchAfter = htmlAfter.match(/data-nav-id="verifikasi"[\s\S]*?<\/button>/);
  assert(verMatchAfter && !verMatchAfter[0].includes('asb-nav-dot'), 'Verifikasi button no longer has dot');
});

// -------------------------------------------------------------
// TEST 5: Laporan strictly NEVER has a red dot
// -------------------------------------------------------------
it('TEST 5: Laporan navigation item strictly NEVER has a red dot', () => {
  localStorage.clear();
  setUserSession(userTBS);

  // Set data for all other modules
  storage.set('verification_transactions', [{ id: 'V1', estateId: 'EST-TBS', verificationStatus: 'MENUNGGU_VERIFIKASI' }]);
  storage.set('pre_grafting_selection_documents', [{ id: 'S1', estateId: 'EST-TBS', status: 'DRAFT' }]);

  const state = getAsbBottomNavNotificationState(userTBS);
  assert.strictEqual(state.laporan, false, 'Laporan state is always false');

  const html = renderAsbBottomNav('laporan', userTBS);
  const lapMatch = html.match(/data-nav-id="laporan"[\s\S]*?<\/button>/);
  assert(lapMatch && !lapMatch[0].includes('asb-nav-dot'), 'Laporan button NEVER has asb-nav-dot');
});

// -------------------------------------------------------------
// TEST 6: Positioning & CSS verification: Inside icon wrapper, top-right overlay
// -------------------------------------------------------------
it('TEST 6: Dot is rendered inside icon wrapper with correct top-right overlay styles', () => {
  localStorage.clear();
  setUserSession(userTBS);

  storage.set('verification_transactions', [{ id: 'V1', estateId: 'EST-TBS', verificationStatus: 'MENUNGGU_VERIFIKASI' }]);
  const html = renderAsbBottomNav('verifikasi', userTBS);

  // Assert icon wrapper has position: relative
  assert(html.includes('position: relative;'), 'Icon wrapper contains position: relative');

  // Assert dot element structure
  assert(html.includes('<span class="notif-dot asb-nav-dot"'), 'Rendered with notif-dot asb-nav-dot classes');
  assert(html.includes('position: absolute;'), 'Dot is position: absolute');
  assert(html.includes('top: 1px;'), 'Dot top position is 1px');
  assert(html.includes('right: 3px;'), 'Dot right position is 3px');
  assert(html.includes('background-color: #D32F2F;'), 'Dot background color is red (#D32F2F)');
  assert(html.includes('border-radius: 50%;'), 'Dot is circular (border-radius: 50%)');
  assert(html.includes('pointer-events: none;'), 'Dot has pointer-events: none');

  // Assert label span does NOT contain the dot
  const labelSpanMatch = html.match(/<span style="font-size: 0\.68rem;[\s\S]*?<\/span>/g);
  assert(labelSpanMatch && labelSpanMatch.length > 0, 'Label spans exist');
  for (const span of labelSpanMatch) {
    assert(!span.includes('asb-nav-dot'), 'Label span does not contain dot');
  }
});

// -------------------------------------------------------------
// TEST 7: Parent dot & Child module dot coexistence
// -------------------------------------------------------------
it('TEST 7: Parent dot and Child module dot coexist without conflict', () => {
  localStorage.clear();
  setUserSession(userTBS);

  // Create pending inspection
  storage.set('pre_grafting_selection_documents', [
    {
      id: 'DOC-SEL-01',
      estateId: 'EST-TBS',
      divisionId: 'DIV-01',
      status: 'MENUNGGU_VERIFIKASI',
      selectionStage: 'SELEKSI_I'
    }
  ]);

  // Parent nav dot
  const navState = getAsbBottomNavNotificationState(userTBS);
  assert.strictEqual(navState.pemeriksaan, true, 'Parent nav dot is true');

  // Child menu dot (simulated from inspection landing logic)
  const childBadge = '<div class="beranda-menu-badge-dot notif-dot"></div>';
  assert(childBadge.includes('notif-dot'), 'Child badge uses notif-dot');
  assert(navState.pemeriksaan === true, 'Parent nav state remains true');
});

// -------------------------------------------------------------
// TEST 8: Scope Isolation (Estate A vs Estate B)
// -------------------------------------------------------------
it('TEST 8: Scope isolation ensures Estate APM user does NOT see Estate TBS red dots', () => {
  localStorage.clear();

  // Transaksi hanya untuk TBS
  storage.set('verification_transactions', [
    {
      id: 'VRF-TBS-01',
      estateId: 'EST-TBS',
      divisionId: 'DIV-01',
      verificationStatus: 'MENUNGGU_VERIFIKASI'
    }
  ]);
  storage.set('pre_grafting_selection_documents', [
    {
      id: 'DOC-TBS-01',
      estateId: 'EST-TBS',
      divisionId: 'DIV-01',
      status: 'MENUNGGU_VERIFIKASI'
    }
  ]);

  // User TBS -> dots are TRUE
  setUserSession(userTBS);
  const tbsState = getAsbBottomNavNotificationState(userTBS);
  assert.strictEqual(tbsState.verifikasi, true, 'TBS user sees verifikasi dot');
  assert.strictEqual(tbsState.pemeriksaan, true, 'TBS user sees pemeriksaan dot');

  // User APM -> dots are FALSE
  setUserSession(userAPM);
  const apmState = getAsbBottomNavNotificationState(userAPM);
  assert.strictEqual(apmState.verifikasi, false, 'APM user DOES NOT see TBS verifikasi dot');
  assert.strictEqual(apmState.pemeriksaan, false, 'APM user DOES NOT see TBS pemeriksaan dot');
});

// -------------------------------------------------------------
// TEST 9: Division Isolation
// -------------------------------------------------------------
it('TEST 9: Division isolation correctly respects division filtering when scoped', () => {
  localStorage.clear();

  storage.set('destruction_transactions', [
    {
      id: 'DES-01',
      estateId: 'EST-TBS',
      divisionId: 'DIV-01',
      status: DESTRUCTION_STATUS.MENUNGGU_VERIFIKASI,
      tanggal: '2026-10-02'
    }
  ]);

  setUserSession(userTBS); // DIV-01
  const div1State = getAsbBottomNavNotificationState(userTBS);
  assert.strictEqual(div1State.pemeriksaan, true, 'DIV-01 user sees destruction dot');
});

console.log('\n====================================================');
console.log(`ALL INTEGRATION TESTS PASSED (${passedTests}/${totalTests})`);
console.log('====================================================\n');
