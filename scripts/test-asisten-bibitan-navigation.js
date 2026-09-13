/**
 * scripts/test-asisten-bibitan-navigation.js
 * Verification Test Suite for ASISTEN_BIBITAN Navigation & Menu Alignment (TASK ASB-01)
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
  ASISTEN_BIBITAN_MAIN_MENUS,
  ASISTEN_BIBITAN_DATA_MASTER_MENUS,
  MENU_REGISTRY,
  SUBMENU_REGISTRY,
  getMenusByRole
} from '../js/core/menu-registry.js';
import { ROLES, normalizeRole } from '../js/core/user-context.js';
import { permissions } from '../js/core/permissions.js';
import { session } from '../js/core/session.js';

let passedAssertions = 0;
let failedAssertions = 0;

function assert(condition, message) {
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedAssertions++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('========================================================================================');
console.log('   TEST SUITE: ASISTEN_BIBITAN BERANDA & SIDEBAR NAVIGATION (TASK ASB-01)               ');
console.log('========================================================================================\n');

// 1. 7 Menu Utama Canonical
console.log('--- TEST 1: 7 Menu Utama Canonical ASISTEN_BIBITAN ---');
assert(Array.isArray(ASISTEN_BIBITAN_MAIN_MENUS), 'ASISTEN_BIBITAN_MAIN_MENUS terdefinisi sebagai Array');
assert(ASISTEN_BIBITAN_MAIN_MENUS.length === 7, `Tepat 7 menu utama canonical ASB (actual: ${ASISTEN_BIBITAN_MAIN_MENUS.length})`);

const expectedLabels = [
  'Penerimaan Bibit',
  'Permintaan Bibit',
  'Pengeluaran Bibit',
  'Pemeriksaan Hasil Seleksi',
  'Pemusnahan Bibit',
  'Konsolidasi Data',
  'Verifikasi Data'
];

expectedLabels.forEach((lbl, idx) => {
  const item = ASISTEN_BIBITAN_MAIN_MENUS[idx];
  assert(item && item.label === lbl, `Menu #${idx + 1} label adalah '${lbl}' (actual: '${item?.label}')`);
  assert(item && Boolean(item.route), `Menu #${idx + 1} memiliki route canonical ('${item?.route}')`);
});

// 2. Data Master Group (Sidebar only)
console.log('\n--- TEST 2: Data Master Group (Sidebar Only) ---');
assert(Array.isArray(ASISTEN_BIBITAN_DATA_MASTER_MENUS), 'ASISTEN_BIBITAN_DATA_MASTER_MENUS terdefinisi sebagai Array');
assert(ASISTEN_BIBITAN_DATA_MASTER_MENUS.length === 2, `Data Master memiliki 2 submenu (actual: ${ASISTEN_BIBITAN_DATA_MASTER_MENUS.length})`);

const hasMasterBedengan = ASISTEN_BIBITAN_DATA_MASTER_MENUS.some(m => m.label === 'Master Bedengan' && m.route === '/master/bedengan');
const hasMasterBatch = ASISTEN_BIBITAN_DATA_MASTER_MENUS.some(m => m.label === 'Master Batch' && m.route === '/master/batch');
assert(hasMasterBedengan, 'Master Bedengan tersedia di Data Master dengan route /master/bedengan');
assert(hasMasterBatch, 'Master Batch tersedia di Data Master dengan route /master/batch');

// 3. Master Bedengan & Master Batch TIDAK muncul di Beranda Main Cards
console.log('\n--- TEST 3: Master Bedengan & Batch Tidak Muncul Sebagai Card Utama Beranda ---');
const masterInBeranda = ASISTEN_BIBITAN_MAIN_MENUS.some(m => m.label.includes('Master') || m.id.includes('master'));
assert(!masterInBeranda, 'Master Bedengan & Batch TIDAK muncul sebagai card utama Beranda');

// 4. Program Pembibitan BUKAN menu & BUKAN card
console.log('\n--- TEST 4: Program Pembibitan Tidak Muncul Sebagai Menu / Card ---');
const programInMain = ASISTEN_BIBITAN_MAIN_MENUS.some(m => m.label.toLowerCase().includes('program') || m.id.includes('program'));
const programInMaster = ASISTEN_BIBITAN_DATA_MASTER_MENUS.some(m => m.label.toLowerCase().includes('program') || m.id.includes('program'));
assert(!programInMain, 'Program Pembibitan tidak muncul di menu utama');
assert(!programInMaster, 'Program Pembibitan tidak muncul di Data Master');

// 5. Label Beranda vs Sidebar Alignment
console.log('\n--- TEST 5: Label & Route Consistency (Beranda = Sidebar) ---');
ASISTEN_BIBITAN_MAIN_MENUS.forEach(m => {
  const strippedTitle = m.title.replace(/<br\s*[\/]?>/gi, ' ');
  assert(strippedTitle === m.label, `Label Beranda ('${strippedTitle}') konsisten 100% dengan Sidebar label ('${m.label}')`);
});

// 6. Submenu Alignment
console.log('\n--- TEST 6: Submenu Alignment (Pertahankan yang Relevan, Hide yang Non-Parent) ---');
const asbSubmenus = SUBMENU_REGISTRY.filter(s => s.roleKeys.includes(ROLES.ASISTEN_BIBITAN));
const allowedParentMenuKeys = new Set(['PENERIMAAN', 'PERMINTAAN', 'PENGIRIMAN', 'PENYELEKSIAN', 'REVIEW_WORKSPACE', 'RIWAYAT_DATA']);

asbSubmenus.forEach(s => {
  assert(allowedParentMenuKeys.has(s.menuKey), `Submenu '${s.label}' [${s.key}] berada di bawah menu canonical ASB '${s.menuKey}'`);
});

const presensiSubForASB = SUBMENU_REGISTRY.some(s => s.menuKey === 'PRESENSI' && s.roleKeys.includes(ROLES.ASISTEN_BIBITAN));
const penyemaianSubForASB = SUBMENU_REGISTRY.some(s => s.menuKey === 'PENYEMAIAN' && s.roleKeys.includes(ROLES.ASISTEN_BIBITAN));
const okulasiSubForASB = SUBMENU_REGISTRY.some(s => s.menuKey === 'OKULASI' && s.roleKeys.includes(ROLES.ASISTEN_BIBITAN));
assert(!presensiSubForASB, 'Submenu Presensi hidden/exclude untuk ASISTEN_BIBITAN');
assert(!penyemaianSubForASB, 'Submenu Penyemaian hidden/exclude untuk ASISTEN_BIBITAN');
assert(!okulasiSubForASB, 'Submenu Okulasi hidden/exclude untuk ASISTEN_BIBITAN');

// 7. Role Isolation (Role lain tidak rusak)
console.log('\n--- TEST 7: Role Isolation ---');
const mantriMenus = getMenusByRole(ROLES.MANTRI_TANAMAN);
const pengurusMenus = getMenusByRole(ROLES.PENGURUS);
const askepMenus = getMenusByRole(ROLES.ASKEP);
const asistenLapMenus = getMenusByRole(ROLES.ASISTEN);

assert(mantriMenus.length >= 7, `Menu Mantri Tanaman tetap utuh (${mantriMenus.length} menus)`);
assert(pengurusMenus.length >= 4, `Menu Pengurus tetap utuh (${pengurusMenus.length} menus)`);
assert(askepMenus.length >= 3, `Menu Askep tetap utuh (${askepMenus.length} menus)`);
assert(asistenLapMenus.length >= 3, `Menu Asisten Lapangan tetap utuh (${asistenLapMenus.length} menus)`);

// 8. Permissions & Route Access
console.log('\n--- TEST 8: Route Access Permissions for ASISTEN_BIBITAN ---');
session.start({
  userId: 'USR-ASB-01',
  role: ROLES.ASISTEN_BIBITAN,
  estateId: 'EST01',
  divisionId: 'DIV01'
});

const allASBRoutes = [
  ...ASISTEN_BIBITAN_MAIN_MENUS.map(m => m.route),
  ...ASISTEN_BIBITAN_DATA_MASTER_MENUS.map(m => m.route)
];

allASBRoutes.forEach(route => {
  const canAccess = permissions.canAccessRoute(route);
  assert(canAccess === true, `ASISTEN_BIBITAN dapat mengakses route '${route}'`);
});

// -------------------------------------------------------------------------
// REKAP HASIL
// -------------------------------------------------------------------------
console.log('\n========================================================================================');
console.log(`   TOTAL ASSERTIONS: ${passedAssertions + failedAssertions} | PASS: ${passedAssertions} | FAIL: ${failedAssertions}`);
console.log('========================================================================================\n');

if (failedAssertions > 0) {
  process.exit(1);
} else {
  console.log('🎉 SEMUA TEST ASB-01 NAVIGATION BERHASIL 100% TANPA KESALAHAN!\n');
}
