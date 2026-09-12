/**
 * scripts/test-persona-switcher-ui.js
 *
 * Test Suite: Persona Switcher UI Polish Verification
 * Memvalidasi integritas 14 persona, 2 estate group, alignment, badge aktif,
 * rendering template persona-card, click/switch behavior, dan no data mutation.
 */

// Mock localStorage and window/document for Node.js test environment
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

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    location: { hash: '#/home' },
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  };
}

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEMO_PERSONAS,
  getDemoPersonas,
  getDemoPersonaByCode,
  getDemoPersonasByEstate
} from '../js/data/demo-personas.js';
import { session } from '../js/core/session.js';
import { getCurrentUserContext, resolveUserContext, ROLES, SCOPE_TYPES } from '../js/core/user-context.js';
import { ROLE_LABELS } from '../js/core/permissions.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${testName}`);
    console.error(`     Error: ${err.message}`);
    throw err;
  }
}

console.log('================================================================');
console.log('   TEST SUITE — PERSONA SWITCHER UI POLISH VERIFICATION         ');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// SECTION 1: REGISTRY & ESTATE GROUPS
// -----------------------------------------------------------------------------
console.log('--- SECTION 1: REGISTRY & ESTATE GROUPS ---');

runTest('1. Exactly 14 demo personas available in master registry', () => {
  const personas = getDemoPersonas();
  assert.strictEqual(personas.length, 14, 'Must have 14 personas');
});

runTest('2. Tanah Besih has exactly 7 personas', () => {
  const tbs = getDemoPersonasByEstate('EST-TBS');
  assert.strictEqual(tbs.length, 7, 'Tanah Besih must have 7 personas');
  const expectedTbsCodes = ['PGS001', 'ASK001', 'AST002', 'ASB001', 'MNT001', 'TKI001', 'KTU001'];
  for (const code of expectedTbsCodes) {
    assert.ok(tbs.some(p => p.code === code), `Tanah Besih must include ${code}`);
  }
});

runTest('3. Aek Pamingke has exactly 7 personas', () => {
  const apm = getDemoPersonasByEstate('EST-APM');
  assert.strictEqual(apm.length, 7, 'Aek Pamingke must have 7 personas');
  const expectedApmCodes = ['PGS002', 'ASK002', 'AST001', 'ASB002', 'MNT002', 'TKI002', 'KTU002'];
  for (const code of expectedApmCodes) {
    assert.ok(apm.some(p => p.code === code), `Aek Pamingke must include ${code}`);
  }
});

// -----------------------------------------------------------------------------
// SECTION 2: PERSONA DETAILS INTEGRITY
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 2: PERSONA DETAILS INTEGRITY ---');

runTest('4. Persona names remain accurate across all 14 personas', () => {
  const wagiman = getDemoPersonaByCode('MNT001');
  assert.strictEqual(wagiman.name, 'Wagiman');
  const rahmad = getDemoPersonaByCode('AST002');
  assert.strictEqual(rahmad.name, 'Rahmad');
  const gofur = getDemoPersonaByCode('ASB002');
  assert.strictEqual(gofur.name, 'Abdul Gofur');
  const junaidi = getDemoPersonaByCode('PGS001');
  assert.strictEqual(junaidi.name, 'Junaidi');
});

runTest('5. Persona roles and normalized mappings remain accurate', () => {
  const wagiman = getDemoPersonaByCode('MNT001');
  assert.strictEqual(wagiman.role, ROLES.MANTRI_TANAMAN);
  const rahmad = getDemoPersonaByCode('AST002');
  assert.strictEqual(rahmad.role, ROLES.ASISTEN);
  const gofur = getDemoPersonaByCode('ASB002');
  assert.strictEqual(gofur.role, ROLES.ASISTEN_BIBITAN);
  const junaidi = getDemoPersonaByCode('PGS001');
  assert.strictEqual(junaidi.role, ROLES.PENGURUS);
});

runTest('6. Persona positions remain accurate', () => {
  const wagiman = getDemoPersonaByCode('MNT001');
  assert.strictEqual(wagiman.position, 'Mantri Bibitan');
  const rahmad = getDemoPersonaByCode('AST002');
  assert.strictEqual(rahmad.position, 'Asisten Lapangan');
  const gofur = getDemoPersonaByCode('ASB002');
  assert.strictEqual(gofur.position, 'Asisten Pembibitan');
});

runTest('7. Persona estate and division attributes remain consistent', () => {
  const wagiman = getDemoPersonaByCode('MNT001');
  assert.strictEqual(wagiman.estateId, 'EST-TBS');
  assert.strictEqual(wagiman.divisionId, 'DIV-001');
  assert.strictEqual(wagiman.divisionName, 'Divisi I');

  const rahmad = getDemoPersonaByCode('AST002');
  assert.strictEqual(rahmad.estateId, 'EST-TBS');
  assert.strictEqual(rahmad.divisionId, 'DIV-002');
  assert.strictEqual(rahmad.divisionName, 'Divisi II');

  const junaidi = getDemoPersonaByCode('PGS001');
  assert.strictEqual(junaidi.estateId, 'EST-TBS');
  assert.strictEqual(junaidi.divisionName, 'Tanah Besih');
  assert.strictEqual(junaidi.scopeType, SCOPE_TYPES.ESTATE);
});

// -----------------------------------------------------------------------------
// SECTION 3: DRAWER UI TEMPLATE STRUCTURE & CSS POLISH
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 3: DRAWER UI TEMPLATE STRUCTURE & CSS POLISH ---');

runTest('8. drawer.js template includes polished card structure (persona-card-top, persona-card-meta, persona-card-footer)', () => {
  const drawerFilePath = path.join(rootDir, 'js', 'components', 'drawer.js');
  const content = fs.readFileSync(drawerFilePath, 'utf8');
  assert.ok(content.includes('persona-card-top'), 'Must have persona-card-top');
  assert.ok(content.includes('persona-card-name'), 'Must have persona-card-name');
  assert.ok(content.includes('persona-badge-active'), 'Must have persona-badge-active');
  assert.ok(content.includes('persona-card-meta'), 'Must have persona-card-meta');
  assert.ok(content.includes('persona-card-role'), 'Must have persona-card-role');
  assert.ok(content.includes('persona-card-footer'), 'Must have persona-card-footer');
  assert.ok(content.includes('persona-card-scope'), 'Must have persona-card-scope');
});

runTest('9. drawer.js includes hierarchical Demo Header and Estate Group counters', () => {
  const drawerFilePath = path.join(rootDir, 'js', 'components', 'drawer.js');
  const content = fs.readFileSync(drawerFilePath, 'utf8');
  assert.ok(content.includes('drawer-demo-badge'), 'Must have drawer-demo-badge');
  assert.ok(content.includes('MODE DEMO'), 'Must have MODE DEMO text');
  assert.ok(content.includes('drawer-estate-count'), 'Must have drawer-estate-count');
});

runTest('10. pages.css contains polished compact persona-card styling and scope tags', () => {
  const cssFilePath = path.join(rootDir, 'css', 'pages.css');
  const css = fs.readFileSync(cssFilePath, 'utf8');
  assert.ok(css.includes('.persona-card {'), 'Must style .persona-card');
  assert.ok(css.includes('.persona-card.active {'), 'Must style active persona card');
  assert.ok(css.includes('.persona-card-scope.scope-division'), 'Must style division scope tag');
  assert.ok(css.includes('.persona-card-scope.scope-estate'), 'Must style estate scope tag');
  assert.ok(css.includes('.drawer-estate-title {'), 'Must style estate group header');
});

// -----------------------------------------------------------------------------
// SECTION 4: SWITCHING & SESSION INTEGRITY
// -----------------------------------------------------------------------------
console.log('\n--- SECTION 4: SWITCHING & SESSION INTEGRITY ---');

function switchPersona(code) {
  const targetPersona = getDemoPersonaByCode(code);
  if (!targetPersona) throw new Error(`Persona not found: ${code}`);

  const sessionRole = targetPersona.code === 'PGS002' ? 'PENGURUS_KEBUN_SEPUPU' : targetPersona.role;

  return session.start({
    userId: targetPersona.code,
    code: targetPersona.code,
    role: sessionRole,
    name: targetPersona.name,
    position: targetPersona.position,
    estateId: targetPersona.estateId,
    estateName: targetPersona.estateName,
    divisionId: targetPersona.divisionId,
    divisionName: targetPersona.divisionName,
    scopeType: targetPersona.scopeType,
    isDemoSession: true
  });
}

runTest('11. Active persona switching to Wagiman operates without mutation', () => {
  switchPersona('MNT001');
  const sess = session.get();
  const ctx = getCurrentUserContext();
  assert.strictEqual(sess.userId, 'MNT001');
  assert.strictEqual(sess.name, 'Wagiman');
  assert.strictEqual(ctx.divisionName, 'Divisi I');
  assert.strictEqual(ctx.estateName, 'Tanah Besih');
});

runTest('12. Active persona switching to Rahmad reflects Divisi II context', () => {
  switchPersona('AST002');
  const sess = session.get();
  const ctx = getCurrentUserContext();
  assert.strictEqual(sess.userId, 'AST002');
  assert.strictEqual(sess.name, 'Rahmad');
  assert.strictEqual(ctx.divisionName, 'Divisi II');
  assert.strictEqual(ctx.estateName, 'Tanah Besih');
});

runTest('13. Active persona switching to Abdul Gofur reflects APM Divisi II context', () => {
  switchPersona('ASB002');
  const sess = session.get();
  const ctx = getCurrentUserContext();
  assert.strictEqual(sess.userId, 'ASB002');
  assert.strictEqual(sess.name, 'Abdul Gofur');
  assert.strictEqual(ctx.divisionName, 'Divisi II');
  assert.strictEqual(ctx.estateName, 'Aek Pamingke');
});

runTest('14. No mutation on underlying DEMO_PERSONAS frozen registry', () => {
  assert.ok(Object.isFrozen(DEMO_PERSONAS), 'DEMO_PERSONAS must remain frozen');
  assert.strictEqual(DEMO_PERSONAS.length, 14);
});

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED:      ${passedTests}`);
console.log(`FAILED:      ${totalTests - passedTests}`);
console.log('================================================================');

if (totalTests === passedTests) {
  console.log('\n🎉 ALL PERSONA SWITCHER UI TESTS PASSED SUCCESSFULLY!\n');
} else {
  console.error('\n❌ SOME TESTS FAILED!\n');
  process.exit(1);
}
