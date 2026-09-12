import fs from 'fs';

// Mock localStorage for Node.js environment
const store = new Map();
global.localStorage = {
  getItem: (key) => store.get(key) || null,
  setItem: (key, val) => store.set(key, String(val)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear()
};

import { ROLES, ROLE_LABELS, permissions } from '../js/core/permissions.js';
import { DEMO_USERS } from '../js/data/demo-data.js';
import { session } from '../js/core/session.js';

console.log('============================================================');
console.log('   AUDIT SUITE: ROLE SWITCH & PERMISSIONS USER PENGURUS   ');
console.log('============================================================\n');

let pass = true;
let totalChecks = 0;
let passedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    console.log(`✅ [PASS] ${message}`);
    passedChecks++;
  } else {
    console.error(`❌ [FAIL] ${message}`);
    pass = false;
  }
}

// -----------------------------------------------------------------------------
// 1. Master Permissions & Role Definitions
// -----------------------------------------------------------------------------
console.log('--- 1. MASTER PERMISSIONS & CONSTANTS ---');
assert(ROLES.PENGURUS === 'PENGURUS', 'ROLES.PENGURUS is strictly "PENGURUS"');
assert(ROLE_LABELS.PENGURUS === 'Pengurus', 'ROLE_LABELS.PENGURUS is "Pengurus"');
assert(permissions.hasCapability('PENGURUS', 'transaction:view') === true, 'Pengurus has "transaction:view" capability');
assert(permissions.hasCapability('PENGURUS', 'monitor:process') === true, 'Pengurus has "monitor:process" capability');
assert(permissions.hasCapability('PENGURUS', 'approval:future') === true, 'Pengurus has "approval:future" capability');
assert(permissions.hasCapability('PENGURUS', 'transaction:create') === false, 'Pengurus does not have "transaction:create" (Field Operator capability)');
assert(permissions.isViewer('PENGURUS') === true, 'permissions.isViewer("PENGURUS") returns true');
assert(permissions.isMantri('PENGURUS') === false, 'permissions.isMantri("PENGURUS") returns false');
assert(permissions.isAsisten('PENGURUS') === false, 'permissions.isAsisten("PENGURUS") returns false');
assert(permissions.canAccessHome('PENGURUS') === true, 'permissions.canAccessHome("PENGURUS") returns true');

assert(ROLES.PENGURUS_KEBUN_SEPUPU === 'PENGURUS_KEBUN_SEPUPU', 'ROLES.PENGURUS_KEBUN_SEPUPU is defined');
assert(ROLE_LABELS.PENGURUS_KEBUN_SEPUPU === 'Pengurus Kebun Sepupu', 'ROLE_LABELS.PENGURUS_KEBUN_SEPUPU is "Pengurus Kebun Sepupu"');
assert(permissions.hasCapability('PENGURUS_KEBUN_SEPUPU', 'transaction:view') === true, 'Pengurus Kebun Sepupu has "transaction:view" capability');
assert(permissions.hasCapability('PENGURUS_KEBUN_SEPUPU', 'monitor:process') === true, 'Pengurus Kebun Sepupu has "monitor:process" capability');
assert(permissions.hasCapability('PENGURUS_KEBUN_SEPUPU', 'approval:future') === true, 'Pengurus Kebun Sepupu has "approval:future" capability');
assert(permissions.isViewer('PENGURUS_KEBUN_SEPUPU') === true, 'permissions.isViewer("PENGURUS_KEBUN_SEPUPU") returns true');

// -----------------------------------------------------------------------------
// 2. Demo User Seed Alignment
// -----------------------------------------------------------------------------
console.log('\n--- 2. DEMO USER DATA ALIGNMENT ---');
const pengurusUser = DEMO_USERS.find(u => u.role === 'PENGURUS');
assert(Boolean(pengurusUser), 'Pengurus demo user is defined in DEMO_USERS');
assert(pengurusUser?.id === 'PGS001', 'Pengurus user ID is "PGS001"');
assert(pengurusUser?.name === 'Junaidi', 'Pengurus name is "Junaidi"');
assert(pengurusUser?.position === 'Pengurus Kebun' || pengurusUser?.position === 'Pengurus', `Pengurus position is valid (${pengurusUser?.position})`);
assert(pengurusUser?.active === true, 'Pengurus demo user active flag is true');

const pksUser = DEMO_USERS.find(u => u.role === 'PENGURUS_KEBUN_SEPUPU');
assert(Boolean(pksUser), 'Pengurus Kebun Sepupu demo user is defined in DEMO_USERS');
assert(pksUser?.id === 'PKS001', 'Pengurus Kebun Sepupu user ID is "PKS001"');
assert(pksUser?.name === 'Mukhsin Haji', 'Pengurus Kebun Sepupu name is "Mukhsin Haji"');
assert(pksUser?.position === 'Pengurus Kebun Sepupu', 'Pengurus Kebun Sepupu position is "Pengurus Kebun Sepupu"');
assert(pksUser?.divisionId === 'DIV-APM', 'Pengurus Kebun Sepupu divisionId is "DIV-APM"');
assert(pksUser?.divisionName === 'Aek Pamingke - All Division', 'Pengurus Kebun Sepupu divisionName is "Aek Pamingke - All Division"');
assert(pksUser?.active === true, 'Pengurus Kebun Sepupu active flag is true');

// -----------------------------------------------------------------------------
// 3. Login Page Code Audit (login.js)
// -----------------------------------------------------------------------------
console.log('\n--- 3. LOGIN PAGE ROLE SWITCHER AUDIT ---');
const loginCode = fs.readFileSync('./js/modules/auth/login.js', 'utf8');
assert(loginCode.includes("'PENGURUS'"), 'login.js ROLE_ORDER includes PENGURUS');
assert(loginCode.includes("'PENGURUS_KEBUN_SEPUPU'"), 'login.js ROLE_ORDER includes PENGURUS_KEBUN_SEPUPU');
assert(loginCode.includes('role-switch-trigger'), 'login.js contains #role-switch-trigger button');
assert(loginCode.includes('openRolePicker'), 'login.js defines openRolePicker function');
assert(loginCode.includes('startSession(user, { demo: true });'), 'openRolePicker initializes session with demo flag');
assert(loginCode.includes("navigate('/splash', { replace: true });"), 'Successful role switch redirects to /splash');
assert(loginCode.includes('VPN wajib diaktifkan'), 'Role switcher enforces VPN verification');

// -----------------------------------------------------------------------------
// 4. Sidebar Drawer Code Audit (drawer.js)
// -----------------------------------------------------------------------------
console.log('\n--- 4. SIDEBAR DRAWER ROLE SWITCHER AUDIT ---');
const drawerCode = fs.readFileSync('./js/components/drawer.js', 'utf8');
assert(drawerCode.includes('drawer-demo-switch'), 'drawer.js contains drawer-demo-switch section');
assert(drawerCode.includes('drawer-demo-pills'), 'drawer.js contains drawer-demo-pills container');
assert(drawerCode.includes('PENGURUS_KEBUN_SEPUPU'), 'drawer.js DEMO_ROLES includes PENGURUS_KEBUN_SEPUPU');
assert(drawerCode.includes('ROLE_LABELS[targetRole]'), 'drawer.js uses single source of truth ROLE_LABELS for toast & pills');
assert(drawerCode.includes("navigate('/splash', { replace: true });"), 'Drawer role switch navigates to /splash');

// -----------------------------------------------------------------------------
// 5. Dashboard Beranda Code Audit (beranda.js)
// -----------------------------------------------------------------------------
console.log('\n--- 5. BERANDA DASHBOARD DISPATCH AUDIT ---');
const berandaCode = fs.readFileSync('./js/modules/dashboard/beranda.js', 'utf8');
assert(berandaCode.includes('ROLES.PENGURUS_KEBUN_SEPUPU'), 'beranda.js checks ROLES.PENGURUS_KEBUN_SEPUPU');
assert(berandaCode.includes('renderBerandaPengurus()'), 'beranda.js calls renderBerandaPengurus()');
assert(berandaCode.includes('PENGURUS_MENU_ITEMS'), 'beranda.js defines PENGURUS_MENU_ITEMS array');

// Validate PENGURUS_MENU_ITEMS contents
const hasPenerimaan = berandaCode.includes("id: 'penerimaan'") && berandaCode.includes("route: '/reception'");
const hasPermintaan = berandaCode.includes("id: 'permintaan-bibit'") && berandaCode.includes("route: '/request'");
const hasPengeluaran = berandaCode.includes("id: 'pengeluaran-bibit'") && berandaCode.includes("route: '/dispatch'");
assert(hasPenerimaan, 'PENGURUS_MENU_ITEMS contains Penerimaan (/reception)');
assert(hasPermintaan, 'PENGURUS_MENU_ITEMS contains Permintaan Bibit (/request)');
assert(hasPengeluaran, 'PENGURUS_MENU_ITEMS contains Pengeluaran Bibit (/dispatch)');

// Check absence of Mantri action buttons in renderBerandaPengurus
const berandaPengurusFunc = berandaCode.split('function renderBerandaPengurus()')[1]?.split('function renderRoleDevelopmentHome')[0] || '';
assert(!berandaPengurusFunc.includes('btn-konsolidasi'), 'renderBerandaPengurus has NO btn-konsolidasi');
assert(!berandaPengurusFunc.includes('btn-verifikasi'), 'renderBerandaPengurus has NO btn-verifikasi');
assert(berandaPengurusFunc.includes('beranda-drawer-btn'), 'renderBerandaPengurus includes hamburger drawer trigger');

// -----------------------------------------------------------------------------
// 6. Session Lifecycle Simulation
// -----------------------------------------------------------------------------
console.log('\n--- 6. RUNTIME SESSION LIFECYCLE SIMULATION ---');
session.start({
  userId: pksUser.id,
  code: pksUser.code,
  role: pksUser.role,
  name: pksUser.name,
  position: pksUser.position,
  divisionId: pksUser.divisionId,
  divisionName: pksUser.divisionName,
  isDemoSession: true
});

assert(session.isAuthenticated() === true, 'session.isAuthenticated() is true after start');
assert(session.getRole() === 'PENGURUS_KEBUN_SEPUPU', 'session.getRole() returns "PENGURUS_KEBUN_SEPUPU"');
assert(session.get()?.isDemoSession === true, 'session.get().isDemoSession is true');

const currentSession = session.get();
assert(currentSession.name === 'Mukhsin Haji', 'session.name is "Mukhsin Haji"');
assert(currentSession.position === 'Pengurus Kebun Sepupu', 'session.position is "Pengurus Kebun Sepupu"');
assert(currentSession.divisionName === 'Aek Pamingke - All Division', 'session.divisionName is "Aek Pamingke - All Division"');

// Test role switching back to Junaidi (Pengurus)
session.switchRole({
  userId: pengurusUser.id,
  code: pengurusUser.code,
  role: pengurusUser.role,
  name: pengurusUser.name,
  position: pengurusUser.position,
  divisionId: pengurusUser.divisionId,
  divisionName: 'Tanah Besih - Divisi I'
});
assert(session.getRole() === 'PENGURUS', 'session successfully switched to PENGURUS');
assert(session.get().name === 'Junaidi', 'session name is Junaidi');

// Test role switching back to Junaidi (Pengurus)
session.switchRole({
  userId: pengurusUser.id,
  code: pengurusUser.code,
  role: pengurusUser.role,
  name: pengurusUser.name,
  position: pengurusUser.position,
  divisionId: pengurusUser.divisionId,
  divisionName: 'Tanah Besih - Divisi I'
});
assert(session.getRole() === 'PENGURUS', 'session successfully switched to PENGURUS');
assert(session.get().name === 'Junaidi', 'session name is Junaidi');

// -----------------------------------------------------------------------------
// 7. Route Permission Checks for Pengurus Session
// -----------------------------------------------------------------------------
console.log('\n--- 7. ROUTE PERMISSIONS CHECK ---');
assert(permissions.canAccessRoute('/home') === true, 'Pengurus can access /home');
assert(permissions.canAccessRoute('/splash') === true, 'Pengurus can access /splash');
assert(permissions.canAccessRoute('/sync') === true, 'Pengurus can access /sync');
assert(permissions.canAccessRoute('/reception') === true, 'Pengurus can access /reception');
assert(permissions.canAccessRoute('/request') === true, 'Pengurus can access /request');
assert(permissions.canAccessRoute('/dispatch') === true, 'Pengurus can access /dispatch');

// -----------------------------------------------------------------------------
// 8. Process Mapping Baseline Audit for Pengurus
// -----------------------------------------------------------------------------
console.log('\n--- 8. PROCESS MAPPING BASELINE REQUIREMENTS AUDIT ---');
const rawBaseline = fs.readFileSync('./data/process-mapping-data.json', 'utf8');
const baselineData = JSON.parse(rawBaseline);

const pengurusReqs = (baselineData.requirements || []).filter(
  r => (!r.isArchived && !r.isSuperseded) && (r.role === 'Pengurus' || r.role === 'Pengurus Kebun Peminta' || r.roleId === 'pengurus')
);
console.log(`- Found ${pengurusReqs.length} active requirements for Pengurus`);
assert(pengurusReqs.length === 6, `Pengurus has exactly 6 active requirements in baseline (found ${pengurusReqs.length})`);
pengurusReqs.forEach((r, i) => {
  console.log(`  ${i+1}. [${r.id}] ${r.title || r.name} (Module: ${r.moduleId || r.module})`);
});

// -----------------------------------------------------------------------------
// Final Summary
// -----------------------------------------------------------------------------
console.log('\n============================================================');
console.log(`AUDIT RESULTS: ${passedChecks}/${totalChecks} CHECKS PASSED (${((passedChecks/totalChecks)*100).toFixed(1)}%)`);
console.log(`STATUS: ${pass ? 'ALL TESTS PASSED ✅' : 'FAILURES DETECTED ❌'}`);
console.log('============================================================\n');

if (!pass) process.exit(1);
