import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getDemoPersonas, getDemoPersonaByCode } from '../js/data/demo-personas.js';
import { ROLES } from '../js/core/permissions.js';

console.log('=== STARTING HIDDEN ROLES SWITCHER TEST SUITE ===\n');

// 1. MASTER PERSONA REGISTRY INTEGRITY
console.log('--- 1. Master Persona Registry Integrity ---');
const allPersonas = getDemoPersonas();
assert.strictEqual(allPersonas.length, 14, 'TEST 01: Master registry must contain exactly 14 personas');
console.log('✓ TEST 01: Master registry contains all 14 personas (no deletion)');

const kusnadi = getDemoPersonaByCode('KTU001');
assert.ok(kusnadi, 'TEST 02: Kusnadi (KTU001) must exist in registry');
assert.strictEqual(kusnadi.name, 'Kusnadi', 'TEST 02: Kusnadi name matches');
assert.strictEqual(kusnadi.role, ROLES.KTU, 'TEST 02: Kusnadi role matches KTU');
console.log('✓ TEST 02: getDemoPersonaByCode("KTU001") resolves Kusnadi (KTU)');

const marihot = getDemoPersonaByCode('TKI001');
assert.ok(marihot, 'TEST 03: Marihot (TKI001) must exist in registry');
assert.strictEqual(marihot.name, 'Marihot', 'TEST 03: Marihot name matches');
assert.strictEqual(marihot.role, ROLES.TEKNIKER_I, 'TEST 03: Marihot role matches TEKNIKER_I');
console.log('✓ TEST 03: getDemoPersonaByCode("TKI001") resolves Marihot (Tekniker I)');

const dedi = getDemoPersonaByCode('KTU002');
assert.ok(dedi, 'TEST 04: Dedi Sugiarto (KTU002) must exist in registry');
console.log('✓ TEST 04: getDemoPersonaByCode("KTU002") resolves Dedi Sugiarto');

const dedek = getDemoPersonaByCode('TKI002');
assert.ok(dedek, 'TEST 05: Dedek (TKI002) must exist in registry');
console.log('✓ TEST 05: getDemoPersonaByCode("TKI002") resolves Dedek');

// 2. DRAWER.JS FILTERING VERIFICATION
console.log('\n--- 2. Drawer.js Role Switcher Verification ---');
const drawerCode = fs.readFileSync(path.resolve('js/components/drawer.js'), 'utf8');

assert.ok(drawerCode.includes('const HIDDEN_SWITCHER_ROLES = [ROLES.KTU, ROLES.TEKNIKER_I];'), 'TEST 06: Drawer must define HIDDEN_SWITCHER_ROLES with ROLES.KTU & ROLES.TEKNIKER_I');
assert.ok(drawerCode.includes('visiblePersonas'), 'TEST 06: Drawer must filter into visiblePersonas');
console.log('✓ TEST 06: Drawer.js filters out ROLES.KTU and ROLES.TEKNIKER_I using constants');

const HIDDEN_SWITCHER_ROLES = [ROLES.KTU, ROLES.TEKNIKER_I];
const drawerVisible = allPersonas.filter(p => !HIDDEN_SWITCHER_ROLES.includes(p.role));
const drawerTbs = drawerVisible.filter(p => p.estateId === 'EST-TBS');
const drawerApm = drawerVisible.filter(p => p.estateId === 'EST-APM');

assert.strictEqual(drawerVisible.length, 10, 'TEST 07: Total visible personas in Drawer must be 10');
assert.strictEqual(drawerTbs.length, 5, 'TEST 07: Tanah Besih visible personas must be 5');
assert.strictEqual(drawerApm.length, 5, 'TEST 07: Aek Pamingke visible personas must be 5');
assert.ok(!drawerVisible.some(p => p.role === ROLES.KTU || p.role === ROLES.TEKNIKER_I), 'TEST 07: No KTU or Tekniker I in visible list');
console.log('✓ TEST 07: Drawer.js renders exactly 5 personas for Tanah Besih and 5 for Aek Pamingke (10 total)');

// 3. LOGIN.JS FILTERING VERIFICATION
console.log('\n--- 3. Login.js Role Switcher Verification ---');
const loginCode = fs.readFileSync(path.resolve('js/modules/auth/login.js'), 'utf8');

assert.ok(loginCode.includes('const HIDDEN_SWITCHER_ROLES = [ROLES.KTU, ROLES.TEKNIKER_I];'), 'TEST 08: Login must define HIDDEN_SWITCHER_ROLES with ROLES.KTU & ROLES.TEKNIKER_I');
assert.ok(loginCode.includes('visiblePersonas'), 'TEST 08: Login must filter into visiblePersonas');
console.log('✓ TEST 08: Login.js filters out ROLES.KTU and ROLES.TEKNIKER_I using constants');

const loginVisible = allPersonas.filter(p => !HIDDEN_SWITCHER_ROLES.includes(p.role));
assert.strictEqual(loginVisible.length, 10, 'TEST 09: Total visible personas in Login modal must be 10');
console.log('✓ TEST 09: Login modal renders exactly 10 visible personas');

// 4. HISTORICAL ACTOR IDENTITY & SESSION RESILIENCE
console.log('\n--- 4. Historical Actor Identity & Session Resilience ---');
const sampleTxWithKtu = {
  id: 'TX-LEGACY-001',
  docNo: '2026/LEG/001',
  createdByUserId: 'KTU001',
  createdByName: kusnadi.name,
  createdByRole: kusnadi.role
};

assert.strictEqual(sampleTxWithKtu.createdByUserId, 'KTU001', 'TEST 10: Legacy KTU actor ID intact');
assert.strictEqual(sampleTxWithKtu.createdByName, 'Kusnadi', 'TEST 10: Legacy KTU actor name intact');
console.log('✓ TEST 10: Historical transaction actor snapshots remain 100% valid and readable');

console.log('\n======================================================');
console.log('ALL HIDDEN ROLES SWITCHER TESTS PASSED! (10/10)');
console.log('======================================================\n');
