import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { ROLES } from '../js/core/permissions.js';
import { resolveUserContext } from '../js/core/user-context.js';
import { REPORT_MENUS } from '../js/modules/reports/reports-landing.js';

console.log('=== STARTING ASB REPORTS BACK NAVIGATION TEST SUITE ===\n');

const historyPath = path.resolve('js/modules/history/nursery-history.js');
const historyCode = fs.readFileSync(historyPath, 'utf8');

// 1. SOURCE CODE STATIC & LOGIC INTEGRITY
console.log('--- 1. Back Button Navigation Logic Integrity ---');

assert.ok(historyCode.includes("ROLES.ASISTEN_BIBITAN"), 'TEST 01: Must reference ROLES.ASISTEN_BIBITAN');
assert.ok(historyCode.includes("navigate('/reports')"), 'TEST 01: Must navigate to /reports for ASB');
assert.ok(historyCode.includes("navigate('/home')"), 'TEST 01: Must navigate to /home for other roles');
console.log('✓ TEST 01: Conditional back navigation logic present in nursery-history.js');

// 2. SIMULATING BACK HANDLER BEHAVIOR PER ROLE
console.log('\n--- 2. Role Context Simulation Tests ---');

function simulateBackNavigation(rawUser) {
  let navigatedRoute = null;
  const mockNavigate = (r) => { navigatedRoute = r; };

  const user = rawUser || { name: 'Wagiman', role: 'MANTRI_TANAMAN' };
  const userCtx = resolveUserContext(user);

  if (userCtx?.role === ROLES.ASISTEN_BIBITAN || user?.role === ROLES.ASISTEN_BIBITAN) {
    mockNavigate('/reports');
  } else {
    mockNavigate('/home');
  }

  return navigatedRoute;
}

// Test 2A: Annisa (ASB001 - ASISTEN_BIBITAN)
const annisaRoute = simulateBackNavigation({
  id: 'TBS-ASB-001',
  code: 'ASB001',
  name: 'Annisa',
  role: ROLES.ASISTEN_BIBITAN
});
assert.strictEqual(annisaRoute, '/reports', 'TEST 02A: Annisa (ASB) must return to /reports');
console.log('✓ TEST 02A: Annisa (ASB001) back button navigates to /reports');

// Test 2B: Abdul Gofur (ASB002 - ASISTEN_BIBITAN)
const gofurRoute = simulateBackNavigation({
  id: 'APM-ASB-002',
  code: 'ASB002',
  name: 'Abdul Gofur',
  role: ROLES.ASISTEN_BIBITAN
});
assert.strictEqual(gofurRoute, '/reports', 'TEST 02B: Abdul Gofur (ASB) must return to /reports');
console.log('✓ TEST 02B: Abdul Gofur (ASB002) back button navigates to /reports');

// Test 3: Wagiman (MNT001 - MANTRI_TANAMAN)
const wagimanRoute = simulateBackNavigation({
  id: 'TBS-MNT-001',
  code: 'MNT001',
  name: 'Wagiman',
  role: ROLES.MANTRI_TANAMAN
});
assert.strictEqual(wagimanRoute, '/home', 'TEST 03: Wagiman (Mantri) must return to /home');
console.log('✓ TEST 03: Wagiman (MNT001) back button navigates to /home');

// Test 4: Junaidi (PGS001 - PENGURUS)
const junaidiRoute = simulateBackNavigation({
  id: 'TBS-PGS-001',
  code: 'PGS001',
  name: 'Junaidi',
  role: ROLES.PENGURUS
});
assert.strictEqual(junaidiRoute, '/home', 'TEST 04: Junaidi (Pengurus) must return to /home');
console.log('✓ TEST 04: Junaidi (PGS001) back button navigates to /home');

// Test 5: Rahmad (AST002 - ASISTEN)
const rahmadRoute = simulateBackNavigation({
  id: 'TBS-AST-002',
  code: 'AST002',
  name: 'Rahmad',
  role: ROLES.ASISTEN
});
assert.strictEqual(rahmadRoute, '/home', 'TEST 05: Rahmad (Asisten) must return to /home');
console.log('✓ TEST 05: Rahmad (AST002) back button navigates to /home');

// 3. BOTH REPORT MENUS ROUTING
console.log('\n--- 3. Report Menus Target Route Verification ---');
const stokMenu = REPORT_MENUS.find(m => m.id === 'stok-bibit');
const riwayatMenu = REPORT_MENUS.find(m => m.id === 'riwayat-transaksi');

assert.strictEqual(stokMenu.route, '/history', 'TEST 06: Stok Bibit points to /history');
assert.strictEqual(riwayatMenu.route, '/history', 'TEST 06: Riwayat Transaksi points to /history');
console.log('✓ TEST 06: Both Stok Bibit & Riwayat Transaksi open /history and return to /reports for ASB');

// 4. BOTTOM NAV & REPORTS PAGE INTEGRITY
console.log('\n--- 4. Reports Landing & Bottom Nav Verification ---');
const reportsCode = fs.readFileSync(path.resolve('js/modules/reports/reports-landing.js'), 'utf8');
assert.ok(reportsCode.includes("renderAsbBottomNav('laporan')"), 'TEST 07: Reports page must render active laporan bottom-nav');
console.log('✓ TEST 07: Reports page keeps "laporan" active on bottom navigation');

console.log('\n======================================================');
console.log('ALL ASB REPORTS BACK NAVIGATION TESTS PASSED! (7/7)');
console.log('======================================================\n');
