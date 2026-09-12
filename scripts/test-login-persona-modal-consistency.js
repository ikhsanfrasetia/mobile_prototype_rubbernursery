/**
 * scripts/test-login-persona-modal-consistency.js
 * Automated Verification Suite for Login Role Demo Modal & Sidebar Persona Consistency.
 */

// Mock localStorage for Node.js test environment
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
}

// Lightweight DOM Mock
class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.innerHTML = '';
    this.children = [];
    this.attributes = {};
    this.eventListeners = {};
    this.elementsMap = {};
    this.value = '';
    this.checked = false;
  }
  addEventListener(event, handler) {
    this.eventListeners[event] = handler;
  }
  querySelector(sel) {
    if (sel.includes(':checked')) {
      const match = this.innerHTML.match(/value="([^"]+)"[^>]*checked/);
      if (match) {
        return { value: match[1] };
      }
      return null;
    }
    if (!this.elementsMap[sel]) {
      this.elementsMap[sel] = new MockElement('div');
    }
    return this.elementsMap[sel];
  }
  querySelectorAll() {
    return [];
  }
  classList = {
    add: () => {},
    remove: () => {},
    toggle: () => {},
    contains: () => false
  };
  setAttribute() {}
  removeAttribute() {}
  remove() {}
}

const mockApp = new MockElement('div');
mockApp.id = 'app';

let modalRootContent = {
  title: '',
  body: '',
  footer: ''
};

const mockModalRoot = new MockElement('div');
mockModalRoot.id = 'modal-root';

globalThis.document = {
  getElementById: (id) => {
    if (id === 'app') return mockApp;
    if (id === 'modal-root') return mockModalRoot;
    return new MockElement('div');
  },
  createElement: (tag) => new MockElement(tag),
  querySelector: () => mockApp,
  querySelectorAll: () => [mockApp]
};

import { session } from '../js/core/session.js';
import { storage } from '../js/core/storage.js';
import { getCurrentUserContext, ROLES, SCOPE_TYPES } from '../js/core/user-context.js';
import { ROLE_LABELS } from '../js/core/permissions.js';
import { DEMO_USERS } from '../js/data/demo-data.js';
import { userRepository } from '../js/db/repositories.js';
import {
  DEMO_PERSONAS,
  getDemoPersonas,
  getDemoPersonaByCode,
  getDemoPersonasByEstate
} from '../js/data/demo-personas.js';

// Mock userRepository.list for node test environment
userRepository.list = async () => DEMO_USERS;

import { renderLogin } from '../js/modules/auth/login.js';
import { openDrawer } from '../js/components/drawer.js';

console.log('================================================================================');
console.log('    SIGMA RUBBER NURSERY — TEST SUITE: LOGIN MODAL & PERSONA CONSISTENCY        ');
console.log('================================================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

// -----------------------------------------------------------------------------
// SUITE A: Master Persona Registry Verification
// -----------------------------------------------------------------------------
console.log('--- SUITE A: Persona Registry Verification ---');
const allPersonas = getDemoPersonas();
assert(allPersonas.length === 14, `Total personas in registry is 14 (found: ${allPersonas.length})`);

const tbsPersonas = getDemoPersonasByEstate('EST-TBS');
assert(tbsPersonas.length === 7, `Tanah Besih count is 7 (found: ${tbsPersonas.length})`);

const apmPersonas = getDemoPersonasByEstate('EST-APM');
assert(apmPersonas.length === 7, `Aek Pamingke count is 7 (found: ${apmPersonas.length})`);

// Unique user ID check
const codes = new Set(allPersonas.map((p) => p.code));
assert(codes.size === 14, `All 14 personas have unique login codes/IDs (unique: ${codes.size})`);

// Check Mukhsin Haji canonical role
const mukhsin = getDemoPersonaByCode('PGS002');
assert(mukhsin !== null, 'Mukhsin Haji (PGS002) exists in registry');
assert(mukhsin.role === ROLES.PENGURUS, 'Mukhsin canonical role is PENGURUS');
assert(ROLE_LABELS[mukhsin.role] === 'Pengurus', 'Mukhsin role label displays as "Pengurus"');

// Check Division and Estate alignments
const wagiman = getDemoPersonaByCode('MNT001');
assert(wagiman.estateName === 'Tanah Besih' && wagiman.divisionName === 'Divisi I', 'Wagiman is Tanah Besih Divisi I');
assert(wagiman.scopeType === SCOPE_TYPES.DIVISION, 'Wagiman scope is DIVISION');

const rahmad = getDemoPersonaByCode('AST002');
assert(rahmad.estateName === 'Tanah Besih' && rahmad.divisionName === 'Divisi II', 'Rahmad is Tanah Besih Divisi II');
assert(rahmad.scopeType === SCOPE_TYPES.DIVISION, 'Rahmad scope is DIVISION');

const supriono = getDemoPersonaByCode('MNT002');
assert(supriono.estateName === 'Aek Pamingke' && supriono.divisionName === 'Divisi I', 'Supriono is Aek Pamingke Divisi I');
assert(supriono.scopeType === SCOPE_TYPES.DIVISION, 'Supriono scope is DIVISION');

const abdulGofur = getDemoPersonaByCode('ASB002');
assert(abdulGofur.estateName === 'Aek Pamingke' && abdulGofur.divisionName === 'Divisi II', 'Abdul Gofur is Aek Pamingke Divisi II');
assert(abdulGofur.scopeType === SCOPE_TYPES.DIVISION, 'Abdul Gofur scope is DIVISION');

const junaidi = getDemoPersonaByCode('PGS001');
assert(junaidi.estateName === 'Tanah Besih' && junaidi.scopeType === SCOPE_TYPES.ESTATE, 'Junaidi is Tanah Besih Scope ESTATE');

const beny = getDemoPersonaByCode('ASK001');
assert(beny.estateName === 'Tanah Besih' && beny.scopeType === SCOPE_TYPES.ESTATE, 'Beny Sihotang is Tanah Besih Scope ESTATE');

// -----------------------------------------------------------------------------
// SUITE B: Login Modal Rendering & Persona Structure
// -----------------------------------------------------------------------------
console.log('\n--- SUITE B: Login Modal Rendering & Persona Structure ---');

// Set active session as Wagiman first
session.start({
  userId: 'MNT001',
  code: 'MNT001',
  role: 'MANTRI_TANAMAN',
  name: 'Wagiman',
  position: 'Mantri Bibitan',
  estateId: 'EST-TBS',
  estateName: 'Tanah Besih',
  divisionId: 'DIV-001',
  divisionName: 'Divisi I',
  scopeType: 'DIVISION'
});

// Render Login
await renderLogin();

// Trigger the role switch modal via click event
const roleSwitchBtn = mockApp.querySelector('#role-switch-trigger');
assert(mockApp.innerHTML.includes('role-switch-trigger'), 'Login page contains role switch trigger button');

// Trigger modal opening
if (roleSwitchBtn && roleSwitchBtn.eventListeners && roleSwitchBtn.eventListeners['click']) {
  roleSwitchBtn.eventListeners['click']();
}

const modalHtml = mockModalRoot.innerHTML;

assert(modalHtml.includes('Pilih Role Demo'), 'Modal title is "Pilih Role Demo"');
assert(modalHtml.includes('Mode demo — pilih persona'), 'Modal description mentions persona');
assert(modalHtml.includes('Tanah Besih'), 'Modal contains Tanah Besih group');
assert(modalHtml.includes('Aek Pamingke'), 'Modal contains Aek Pamingke group');
assert(modalHtml.includes('7 PERSONA'), 'Modal displays 7 PERSONA badge');

// Verify all 14 personas are in the modal HTML
for (const p of allPersonas) {
  assert(modalHtml.includes(`value="${p.code}"`), `Modal includes radio for ${p.name} (${p.code})`);
  assert(modalHtml.includes(p.name), `Modal renders name: ${p.name}`);
}

// Ensure no Pengurus Kebun Sepupu in canonical persona labels
const canonicalRoleLabels = allPersonas.map((p) => ROLE_LABELS[p.role]);
assert(!canonicalRoleLabels.includes('Pengurus Kebun Sepupu'), 'Pengurus Kebun Sepupu is NOT present as a canonical role label in persona list');

// -----------------------------------------------------------------------------
// SUITE C: Persona Selection & Session Integration (Simulated)
// -----------------------------------------------------------------------------
console.log('\n--- SUITE C: Persona Selection & Session Integration ---');

// Helper to simulate selection of a demo persona from the modal
function simulateModalLogin(code) {
  const p = getDemoPersonaByCode(code);
  if (!p) throw new Error(`Persona not found: ${code}`);

  const sessionRole = p.code === 'PGS002' ? 'PENGURUS_KEBUN_SEPUPU' : p.role;
  session.start({
    userId: p.code,
    code: p.code,
    role: sessionRole,
    name: p.name,
    position: p.position,
    estateId: p.estateId,
    estateName: p.estateName,
    divisionId: p.divisionId,
    divisionName: p.divisionName,
    scopeType: p.scopeType,
    isDemoSession: true
  });
}

// Test 1: Wagiman Login
simulateModalLogin('MNT001');
let ctx = getCurrentUserContext();
assert(ctx.code === 'MNT001', 'Wagiman Login: code is MNT001');
assert(ctx.name === 'Wagiman', 'Wagiman Login: name is Wagiman');
assert(ctx.role === 'MANTRI_TANAMAN', 'Wagiman Login: role is MANTRI_TANAMAN');
assert(ctx.position === 'Mantri Bibitan', 'Wagiman Login: position is Mantri Bibitan');
assert(ctx.estateName === 'Tanah Besih', 'Wagiman Login: estate is Tanah Besih');
assert(ctx.divisionName === 'Divisi I', 'Wagiman Login: division is Divisi I');
assert(ctx.scopeType === 'DIVISION', 'Wagiman Login: scope is DIVISION');

// Test 2: Rahmad Login
simulateModalLogin('AST002');
ctx = getCurrentUserContext();
assert(ctx.code === 'AST002', 'Rahmad Login: code is AST002');
assert(ctx.name === 'Rahmad', 'Rahmad Login: name is Rahmad');
assert(ctx.role === 'ASISTEN', 'Rahmad Login: role is ASISTEN');
assert(ctx.position === 'Asisten Lapangan', 'Rahmad Login: position is Asisten Lapangan');
assert(ctx.estateName === 'Tanah Besih', 'Rahmad Login: estate is Tanah Besih');
assert(ctx.divisionName === 'Divisi II', 'Rahmad Login: division is Divisi II');
assert(ctx.scopeType === 'DIVISION', 'Rahmad Login: scope is DIVISION');

// Test 3: Supriono Login
simulateModalLogin('MNT002');
ctx = getCurrentUserContext();
assert(ctx.code === 'MNT002', 'Supriono Login: code is MNT002');
assert(ctx.name === 'Supriono', 'Supriono Login: name is Supriono');
assert(ctx.role === 'MANTRI_TANAMAN', 'Supriono Login: role is MANTRI_TANAMAN');
assert(ctx.estateName === 'Aek Pamingke', 'Supriono Login: estate is Aek Pamingke');
assert(ctx.divisionName === 'Divisi I', 'Supriono Login: division is Divisi I');

// Test 4: Abdul Gofur Login
simulateModalLogin('ASB002');
ctx = getCurrentUserContext();
assert(ctx.code === 'ASB002', 'Abdul Gofur Login: code is ASB002');
assert(ctx.name === 'Abdul Gofur', 'Abdul Gofur Login: name is Abdul Gofur');
assert(ctx.role === 'ASISTEN_BIBITAN', 'Abdul Gofur Login: role is ASISTEN_BIBITAN');
assert(ctx.estateName === 'Aek Pamingke', 'Abdul Gofur Login: estate is Aek Pamingke');
assert(ctx.divisionName === 'Divisi II', 'Abdul Gofur Login: division is Divisi II');

// Test 5: Mukhsin Haji Login
simulateModalLogin('PGS002');
ctx = getCurrentUserContext();
assert(ctx.code === 'PGS002', 'Mukhsin Login: code is PGS002');
assert(ctx.name === 'Mukhsin Haji', 'Mukhsin Login: name is Mukhsin Haji');
assert(ctx.role === 'PENGURUS', 'Mukhsin Login: canonical role is PENGURUS');
assert(ctx.rawRole === 'PENGURUS_KEBUN_SEPUPU', 'Mukhsin Login: legacy rawRole is PENGURUS_KEBUN_SEPUPU');
assert(ctx.estateName === 'Aek Pamingke', 'Mukhsin Login: estate is Aek Pamingke');
assert(ctx.scopeType === 'ESTATE', 'Mukhsin Login: scope is ESTATE');

// Test 6: Junaidi Login
simulateModalLogin('PGS001');
ctx = getCurrentUserContext();
assert(ctx.code === 'PGS001', 'Junaidi Login: code is PGS001');
assert(ctx.name === 'Junaidi', 'Junaidi Login: name is Junaidi');
assert(ctx.role === 'PENGURUS', 'Junaidi Login: role is PENGURUS');
assert(ctx.estateName === 'Tanah Besih', 'Junaidi Login: estate is Tanah Besih');
assert(ctx.scopeType === 'ESTATE', 'Junaidi Login: scope is ESTATE');

// Test 7: Beny Sihotang Login
simulateModalLogin('ASK001');
ctx = getCurrentUserContext();
assert(ctx.code === 'ASK001', 'Beny Sihotang Login: code is ASK001');
assert(ctx.name === 'Beny Sihotang', 'Beny Sihotang Login: name is Beny Sihotang');
assert(ctx.role === 'ASKEP', 'Beny Sihotang Login: role is ASKEP');
assert(ctx.estateName === 'Tanah Besih', 'Beny Sihotang Login: estate is Tanah Besih');
assert(ctx.scopeType === 'ESTATE', 'Beny Sihotang Login: scope is ESTATE');

console.log('\n================================================================================');
console.log(`TOTAL ASSERTIONS PASSED: ${passedTests}`);
console.log(`TOTAL ASSERTIONS FAILED: ${failedTests}`);
console.log('================================================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
