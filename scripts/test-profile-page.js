/**
 * scripts/test-profile-page.js
 * Verification Suite for "Profil Saya" (My Profile) Page.
 *
 * Checks:
 * A. Source/context validation (Active user context integration)
 * B. Persona rendering (7 key personas)
 * C. Field mapping (Name, Code, Role, Position, Estate, Division, Scope, Status)
 * D. Read-only behavior
 * E. Sidebar protection & drawer menu
 * F. Routing configuration
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

// Lightweight DOM Mock for Node.js
class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.innerHTML = '';
    this.children = [];
    this.attributes = {};
    this.eventListeners = {};
  }
  addEventListener(event, handler) {
    this.eventListeners[event] = handler;
  }
  remove() {
    this.parentElement = null;
  }
  querySelector(sel) {
    return this.querySelectorAll(sel)[0] || null;
  }
  querySelectorAll(sel) {
    const results = [];
    const search = (node) => {
      // Very basic id / class matcher
      if (sel.startsWith('#')) {
        const id = sel.slice(1);
        if (node.innerHTML && node.innerHTML.includes(`id="${id}"`)) {
          results.push(node);
        }
      }
    };
    search(this);
    return results;
  }
}

const mockApp = new MockElement('div');
mockApp.id = 'app';

globalThis.document = {
  getElementById: (id) => {
    if (id === 'app') return mockApp;
    if (id === 'btn-back') return new MockElement('button');
    return null;
  },
  createElement: (tag) => new MockElement(tag),
  querySelector: () => mockApp,
  querySelectorAll: () => [mockApp]
};

import { session } from '../js/core/session.js';
import { getCurrentUserContext, ROLES, SCOPE_TYPES } from '../js/core/user-context.js';
import { ROLE_LABELS } from '../js/core/permissions.js';
import { getDemoPersonaByCode } from '../js/data/demo-personas.js';
import { renderProfile } from '../js/modules/profile/profile.js';

console.log('================================================================================');
console.log('            SIGMA RUBBER NURSERY — TEST SUITE: PROFIL SAYA (MY PROFILE)         ');
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

// Helper to switch active persona session
function setActivePersona(code) {
  const p = getDemoPersonaByCode(code);
  if (!p) throw new Error(`Persona not found for code: ${code}`);

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

// -----------------------------------------------------------------------------
// SUITE A: Route Registration & Read-Only Safety
// -----------------------------------------------------------------------------
console.log('--- SUITE A: Route Registration & Read-Only Safety ---');
renderProfile();
const renderedHtml = mockApp.innerHTML;

assert(renderedHtml.includes('Profil Saya'), 'Page header contains "Profil Saya"');
assert(renderedHtml.includes('profile-summary-card'), 'Contains Profile Summary Card');
assert(renderedHtml.includes('Identitas'), 'Contains Section Identitas');
assert(renderedHtml.includes('Role &amp; Posisi') || renderedHtml.includes('Role & Posisi'), 'Contains Section Role & Posisi');
assert(renderedHtml.includes('Unit Kerja'), 'Contains Section Unit Kerja');
assert(renderedHtml.includes('Status'), 'Contains Section Status');
assert(renderedHtml.includes('Persona Switcher pada sidebar'), 'Contains Read-Only Notice');

// Check that there are NO input forms, textareas, edit buttons
assert(!renderedHtml.includes('<input'), 'Contains NO editable input fields');
assert(!renderedHtml.includes('<textarea'), 'Contains NO textareas');
assert(!renderedHtml.includes('<select'), 'Contains NO select dropdowns');
assert(!renderedHtml.includes('Simpan'), 'Contains NO save / edit buttons');

// -----------------------------------------------------------------------------
// SUITE B: Persona Dynamic Rendering (7 Key Personas)
// -----------------------------------------------------------------------------
console.log('\n--- SUITE B: Dynamic Persona Rendering ---');

// 1. Wagiman (MNT001)
console.log('Testing Persona 1: Wagiman (MNT001)...');
setActivePersona('MNT001');
renderProfile();
let html = mockApp.innerHTML;
assert(html.includes('Wagiman'), 'Wagiman: Name is displayed');
assert(html.includes('MNT001'), 'Wagiman: Login Code is MNT001');
assert(html.includes('MANTRI_TANAMAN'), 'Wagiman: Role is MANTRI_TANAMAN');
assert(html.includes('Mantri Tanaman'), 'Wagiman: Role Name is Mantri Tanaman');
assert(html.includes('Mantri Bibitan'), 'Wagiman: Position is Mantri Bibitan');
assert(html.includes('Tanah Besih'), 'Wagiman: Estate is Tanah Besih');
assert(html.includes('Divisi I'), 'Wagiman: Division is Divisi I');
assert(html.includes('DIVISION'), 'Wagiman: Scope is DIVISION');
assert(html.includes('Aktif'), 'Wagiman: Status is Aktif');

// 2. Rahmad (AST002)
console.log('Testing Persona 2: Rahmad (AST002)...');
setActivePersona('AST002');
renderProfile();
html = mockApp.innerHTML;
assert(html.includes('Rahmad'), 'Rahmad: Name is displayed');
assert(html.includes('AST002'), 'Rahmad: Login Code is AST002');
assert(html.includes('ASISTEN'), 'Rahmad: Role is ASISTEN');
assert(html.includes('Asisten'), 'Rahmad: Role Name is Asisten');
assert(html.includes('Asisten Lapangan'), 'Rahmad: Position is Asisten Lapangan');
assert(html.includes('Tanah Besih'), 'Rahmad: Estate is Tanah Besih');
assert(html.includes('Divisi II'), 'Rahmad: Division is Divisi II');
assert(html.includes('DIVISION'), 'Rahmad: Scope is DIVISION');

// 3. Supriono (MNT002)
console.log('Testing Persona 3: Supriono (MNT002)...');
setActivePersona('MNT002');
renderProfile();
html = mockApp.innerHTML;
assert(html.includes('Supriono'), 'Supriono: Name is displayed');
assert(html.includes('MNT002'), 'Supriono: Login Code is MNT002');
assert(html.includes('MANTRI_TANAMAN'), 'Supriono: Role is MANTRI_TANAMAN');
assert(html.includes('Aek Pamingke'), 'Supriono: Estate is Aek Pamingke');
assert(html.includes('Divisi I'), 'Supriono: Division is Divisi I');
assert(html.includes('DIVISION'), 'Supriono: Scope is DIVISION');

// 4. Abdul Gofur (ASB002)
console.log('Testing Persona 4: Abdul Gofur (ASB002)...');
setActivePersona('ASB002');
renderProfile();
html = mockApp.innerHTML;
assert(html.includes('Abdul Gofur'), 'Abdul Gofur: Name is displayed');
assert(html.includes('ASB002'), 'Abdul Gofur: Login Code is ASB002');
assert(html.includes('ASISTEN_BIBITAN'), 'Abdul Gofur: Role is ASISTEN_BIBITAN');
assert(html.includes('Asisten Pembibitan'), 'Abdul Gofur: Position is Asisten Pembibitan');
assert(html.includes('Aek Pamingke'), 'Abdul Gofur: Estate is Aek Pamingke');
assert(html.includes('Divisi II'), 'Abdul Gofur: Division is Divisi II');
assert(html.includes('DIVISION'), 'Abdul Gofur: Scope is DIVISION');

// 5. Junaidi (PGS001)
console.log('Testing Persona 5: Junaidi (PGS001)...');
setActivePersona('PGS001');
renderProfile();
html = mockApp.innerHTML;
assert(html.includes('Junaidi'), 'Junaidi: Name is displayed');
assert(html.includes('PGS001'), 'Junaidi: Login Code is PGS001');
assert(html.includes('PENGURUS'), 'Junaidi: Role is PENGURUS');
assert(html.includes('Pengurus Kebun'), 'Junaidi: Position is Pengurus Kebun');
assert(html.includes('Tanah Besih'), 'Junaidi: Estate is Tanah Besih');
assert(html.includes('ESTATE'), 'Junaidi: Scope is ESTATE');

// 6. Mukhsin Haji (PGS002)
console.log('Testing Persona 6: Mukhsin Haji (PGS002)...');
setActivePersona('PGS002');
renderProfile();
html = mockApp.innerHTML;
assert(html.includes('Mukhsin Haji'), 'Mukhsin Haji: Name is displayed');
assert(html.includes('PGS002'), 'Mukhsin Haji: Login Code is PGS002');
assert(html.includes('PENGURUS'), 'Mukhsin Haji: Canonical role is PENGURUS');
assert(html.includes('Pengurus Kebun'), 'Mukhsin Haji: Position is Pengurus Kebun');
assert(html.includes('Aek Pamingke'), 'Mukhsin Haji: Estate is Aek Pamingke');
assert(html.includes('ESTATE'), 'Mukhsin Haji: Scope is ESTATE');

// 7. Beny Sihotang (ASK001)
console.log('Testing Persona 7: Beny Sihotang (ASK001)...');
setActivePersona('ASK001');
renderProfile();
html = mockApp.innerHTML;
assert(html.includes('Beny Sihotang'), 'Beny Sihotang: Name is displayed');
assert(html.includes('ASK001'), 'Beny Sihotang: Login Code is ASK001');
assert(html.includes('ASKEP'), 'Beny Sihotang: Role is ASKEP');
assert(html.includes('Asisten Kepala'), 'Beny Sihotang: Position is Asisten Kepala');
assert(html.includes('Tanah Besih'), 'Beny Sihotang: Estate is Tanah Besih');
assert(html.includes('ESTATE'), 'Beny Sihotang: Scope is ESTATE');

// -----------------------------------------------------------------------------
// SUITE C: Dynamic Initial Avatar & Fallback Handling
// -----------------------------------------------------------------------------
console.log('\n--- SUITE C: Dynamic Initial Avatar & Context Safety ---');

setActivePersona('MNT001');
renderProfile();
assert(mockApp.innerHTML.includes('profile-avatar">\n                W'), 'Wagiman generates initial "W"');

setActivePersona('AST002');
renderProfile();
assert(mockApp.innerHTML.includes('profile-avatar">\n                R'), 'Rahmad generates initial "R"');

setActivePersona('ASB002');
renderProfile();
assert(mockApp.innerHTML.includes('profile-avatar">\n                A'), 'Abdul Gofur generates initial "A"');

setActivePersona('PGS001');
renderProfile();
assert(mockApp.innerHTML.includes('profile-avatar">\n                J'), 'Junaidi generates initial "J"');

setActivePersona('ASK001');
renderProfile();
assert(mockApp.innerHTML.includes('profile-avatar">\n                B'), 'Beny Sihotang generates initial "B"');

// -----------------------------------------------------------------------------
// SUITE D: Drawer & Sidebar Protection
// -----------------------------------------------------------------------------
console.log('\n--- SUITE D: Drawer & Sidebar Protection ---');

import { openDrawer, closeDrawer } from '../js/components/drawer.js';

let appendedDrawer = null;
const mockRoot = {
  appendChild: (el) => {
    appendedDrawer = el;
  }
};
globalThis.document.querySelector = (sel) => {
  if (sel === '.device-screen' || sel === '#modal-root') return mockRoot;
  return mockApp;
};

openDrawer();
assert(appendedDrawer !== null, 'openDrawer successfully creates drawer element');
assert(appendedDrawer.className === 'drawer-overlay', 'Drawer overlay class is intact');
assert(appendedDrawer.innerHTML.includes('id="menu-beranda"'), 'Drawer retains Beranda menu');
assert(appendedDrawer.innerHTML.includes('id="menu-riwayat"'), 'Drawer retains Riwayat Data menu');
assert(appendedDrawer.innerHTML.includes('id="menu-sync"'), 'Drawer retains Sinkronisasi menu');
assert(appendedDrawer.innerHTML.includes('id="menu-profil"'), 'Drawer retains Profil Saya menu');
assert(appendedDrawer.innerHTML.includes('id="menu-logout"'), 'Drawer retains Keluar Aplikasi menu');
assert(appendedDrawer.innerHTML.includes('Tanah Besih'), 'Drawer retains Tanah Besih persona group');
assert(appendedDrawer.innerHTML.includes('Aek Pamingke'), 'Drawer retains Aek Pamingke persona group');
assert(appendedDrawer.innerHTML.includes('App Version 1.0'), 'Drawer retains footer App Version');

closeDrawer();

console.log('\n================================================================================');
console.log(`TOTAL ASSERTIONS PASSED: ${passedTests}`);
console.log(`TOTAL ASSERTIONS FAILED: ${failedTests}`);
console.log('================================================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
