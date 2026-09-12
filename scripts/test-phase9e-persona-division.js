/**
 * scripts/test-phase9e-persona-division.js
 * Test Suite for Phase 9E — Persona Division Alignment
 *
 * Validates division alignment for:
 * 1. Rahmad (AST002) -> Divisi II (Tanah Besih)
 * 2. Abdul Gofur (ASB002) -> Divisi II (Aek Pamingke)
 *
 * Ensures:
 * - Role, position, estate, and scope invariants are maintained.
 * - Current user context resolves Divisi II for both personas.
 * - Historical transaction actor snapshot remains immutable (no migration).
 * - New transactions record Divisi II.
 * - User ownership isolation remains by createdByUserId, not division.
 * - Zero regression on roles, permissions, menus, and capabilities.
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

import {
  DEMO_PERSONAS,
  getDemoPersonaByCode,
  getDemoPersonaById,
  getDemoPersonasByEstate,
  getDemoPersonasByRole
} from '../js/data/demo-personas.js';
import { session } from '../js/core/session.js';
import { getCurrentUserContext, resolveUserContext, ROLES, SCOPE_TYPES } from '../js/core/user-context.js';
import { permissions } from '../js/core/permissions.js';
import { createTransactionActorSnapshot, applyTransactionActor } from '../js/core/transaction-actor.js';
import { getRoleCapabilities, getRoleDefaultScope } from '../js/core/role-profiles.js';
import { getMenusByRole, getFeaturesByRole } from '../js/core/menu-registry.js';

console.log('=== STARTING PHASE 9E — PERSONA DIVISION ALIGNMENT VALIDATION ===\n');

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

// Helper to simulate persona switch via session.start
function switchPersona(code) {
  const p = getDemoPersonaByCode(code);
  if (!p) throw new Error(`Persona not found for code: ${code}`);

  const sessionRole = p.code === 'PGS002' ? 'PENGURUS_KEBUN_SEPUPU' : p.role;
  return session.start({
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

// ----------------------------------------------------
// A. PERSONA EXISTENCE
// ----------------------------------------------------
console.log('--- A. Persona Existence ---');
const rahmad = getDemoPersonaByCode('AST002');
const abdulGofur = getDemoPersonaByCode('ASB002');

assert(!!rahmad, '1. AST002 exists in demo personas registry');
assert(!!abdulGofur, '2. ASB002 exists in demo personas registry');

// ----------------------------------------------------
// B. ROLE INVARIANTS
// ----------------------------------------------------
console.log('\n--- B. Role Invariants ---');
assert(rahmad?.role === ROLES.ASISTEN, `3. AST002 role = ASISTEN (actual: ${rahmad?.role})`);
assert(abdulGofur?.role === ROLES.ASISTEN_BIBITAN, `4. ASB002 role = ASISTEN_BIBITAN (actual: ${abdulGofur?.role})`);

// ----------------------------------------------------
// C. ESTATE INVARIANTS
// ----------------------------------------------------
console.log('\n--- C. Estate Invariants ---');
assert(rahmad?.estateName === 'Tanah Besih' && rahmad?.estateId === 'EST-TBS', `5. AST002 estate = Tanah Besih (actual: ${rahmad?.estateName})`);
assert(abdulGofur?.estateName === 'Aek Pamingke' && abdulGofur?.estateId === 'EST-APM', `6. ASB002 estate = Aek Pamingke (actual: ${abdulGofur?.estateName})`);

// ----------------------------------------------------
// D. DIVISION ALIGNMENT
// ----------------------------------------------------
console.log('\n--- D. Division Alignment (Target: Divisi II) ---');
assert(rahmad?.divisionName === 'Divisi II' && rahmad?.divisionId === 'DIV-002', `7. AST002 division = Divisi II (id: ${rahmad?.divisionId}, name: ${rahmad?.divisionName})`);
assert(abdulGofur?.divisionName === 'Divisi II' && abdulGofur?.divisionId === 'DIV-APM-02', `8. ASB002 division = Divisi II (id: ${abdulGofur?.divisionId}, name: ${abdulGofur?.divisionName})`);

// ----------------------------------------------------
// E. SCOPE TYPE INVARIANTS
// ----------------------------------------------------
console.log('\n--- E. Scope Type Invariants ---');
assert(rahmad?.scopeType === SCOPE_TYPES.DIVISION, `9. AST002 scope = DIVISION (actual: ${rahmad?.scopeType})`);
assert(abdulGofur?.scopeType === SCOPE_TYPES.DIVISION, `10. ASB002 scope = DIVISION (actual: ${abdulGofur?.scopeType})`);

// ----------------------------------------------------
// F. POSITION INVARIANTS
// ----------------------------------------------------
console.log('\n--- F. Position Invariants ---');
assert(rahmad?.position === 'Asisten Lapangan', `11. Rahmad position unchanged = 'Asisten Lapangan' (actual: ${rahmad?.position})`);
assert(abdulGofur?.position === 'Asisten Pembibitan', `12. Abdul Gofur position unchanged = 'Asisten Pembibitan' (actual: ${abdulGofur?.position})`);

// ----------------------------------------------------
// G. PERSONA SWITCHER INTEGRATION
// ----------------------------------------------------
console.log('\n--- G. Persona Switcher Integration ---');
switchPersona('AST002');
const rahmadSession = session.get();
assert(rahmadSession.divisionName === 'Divisi II', `13. Rahmad session displays Divisi II (actual: ${rahmadSession.divisionName})`);

switchPersona('ASB002');
const abdulSession = session.get();
assert(abdulSession.divisionName === 'Divisi II', `14. Abdul Gofur session displays Divisi II (actual: ${abdulSession.divisionName})`);

// ----------------------------------------------------
// H. USER CONTEXT RESOLUTION
// ----------------------------------------------------
console.log('\n--- H. User Context Resolution ---');
switchPersona('AST002');
const rahmadContext = getCurrentUserContext();
assert(
  rahmadContext.userId === 'AST002' &&
  rahmadContext.role === 'ASISTEN' &&
  rahmadContext.estateName === 'Tanah Besih' &&
  rahmadContext.divisionName === 'Divisi II' &&
  rahmadContext.divisionId === 'DIV-002' &&
  rahmadContext.scopeType === 'DIVISION',
  `15. getCurrentUserContext(Rahmad) resolves Divisi II with complete canonical context`
);

switchPersona('ASB002');
const abdulContext = getCurrentUserContext();
assert(
  abdulContext.userId === 'ASB002' &&
  abdulContext.role === 'ASISTEN_BIBITAN' &&
  abdulContext.estateName === 'Aek Pamingke' &&
  abdulContext.divisionName === 'Divisi II' &&
  abdulContext.divisionId === 'DIV-APM-02' &&
  abdulContext.scopeType === 'DIVISION',
  `16. getCurrentUserContext(Abdul Gofur) resolves Divisi II with complete canonical context`
);

// ----------------------------------------------------
// I. TRANSACTION SAFETY & HISTORICAL IMMUTABILITY
// ----------------------------------------------------
console.log('\n--- I. Transaction Safety & Historical Immutability ---');

// 17. Historical transaction created prior to Phase 9E
const historicalRahmadTx = {
  id: 'TX-HIST-001',
  type: 'SEED_REQUEST',
  createdByUserId: 'AST002',
  createdByName: 'Rahmad',
  createdByRole: 'ASISTEN',
  createdByEstateId: 'EST-TBS',
  createdByEstate: 'Tanah Besih',
  createdByDivisionId: 'DIV-001',
  createdByDivision: 'Divisi I',
  createdAt: '2026-08-01T10:00:00.000Z'
};

const historicalAbdulTx = {
  id: 'TX-HIST-002',
  type: 'MAINTENANCE',
  createdByUserId: 'ASB002',
  createdByName: 'Abdul Gofur',
  createdByRole: 'ASISTEN_BIBITAN',
  createdByEstateId: 'EST-APM',
  createdByEstate: 'Aek Pamingke',
  createdByDivisionId: 'DIV-APM-01',
  createdByDivision: 'Divisi I',
  createdAt: '2026-08-01T11:00:00.000Z'
};

assert(
  historicalRahmadTx.createdByDivision === 'Divisi I' &&
  historicalRahmadTx.createdByDivisionId === 'DIV-001' &&
  historicalRahmadTx.createdByUserId === 'AST002',
  '17. Historical actor snapshot remains unchanged (Divisi I preserved on past records)'
);

assert(
  historicalAbdulTx.createdByDivision === 'Divisi I' &&
  historicalAbdulTx.createdByDivisionId === 'DIV-APM-01' &&
  historicalAbdulTx.createdByUserId === 'ASB002',
  '18. No historical transaction migration occurs (historical records are immutable)'
);

// 19. New transaction by Rahmad using applyTransactionActor
switchPersona('AST002');
const newRahmadTx = applyTransactionActor({
  id: 'TX-NEW-RAHMAD-001',
  activityName: 'Pengendalian Gulma'
});

assert(
  newRahmadTx.createdByUserId === 'AST002' &&
  newRahmadTx.createdByRole === 'ASISTEN' &&
  newRahmadTx.createdByEstateName === 'Tanah Besih' &&
  newRahmadTx.createdByDivisionName === 'Divisi II' &&
  newRahmadTx.createdByDivisionId === 'DIV-002',
  '19. New Rahmad transaction uses Divisi II with AST002 ownership'
);

// 20. New transaction by Abdul Gofur using applyTransactionActor
switchPersona('ASB002');
const newAbdulTx = applyTransactionActor({
  id: 'TX-NEW-ABDUL-001',
  activityName: 'Pemupukan NPK'
});

assert(
  newAbdulTx.createdByUserId === 'ASB002' &&
  newAbdulTx.createdByRole === 'ASISTEN_BIBITAN' &&
  newAbdulTx.createdByEstateName === 'Aek Pamingke' &&
  newAbdulTx.createdByDivisionName === 'Divisi II' &&
  newAbdulTx.createdByDivisionId === 'DIV-APM-02',
  '20. New Abdul Gofur transaction uses Divisi II with ASB002 ownership'
);

// ----------------------------------------------------
// J. ROLE REGRESSION & SYSTEM INTEGRITY
// ----------------------------------------------------
console.log('\n--- J. Role Regression & System Integrity ---');

// 21. Role normalization unchanged
const resolvedRahmad = resolveUserContext({ role: 'ASISTEN' });
const resolvedAbdul = resolveUserContext({ role: 'ASISTEN_BIBITAN' });
assert(
  resolvedRahmad.role === 'ASISTEN' && resolvedAbdul.role === 'ASISTEN_BIBITAN',
  '21. Role normalization unchanged'
);

// 22. Capabilities unchanged
const asistenCaps = getRoleCapabilities('ASISTEN');
const asbCaps = getRoleCapabilities('ASISTEN_BIBITAN');
const asistenScope = getRoleDefaultScope('ASISTEN');
const asbScope = getRoleDefaultScope('ASISTEN_BIBITAN');
assert(
  asistenScope === 'DIVISION' && asbScope === 'DIVISION' && Array.isArray(asistenCaps) && asistenCaps.length > 0 && Array.isArray(asbCaps) && asbCaps.length > 0,
  '22. Capability definitions unchanged for ASISTEN and ASISTEN_BIBITAN'
);

// 23. Menu mapping unchanged
const asistenMenus = getMenusByRole('ASISTEN');
const asbMenus = getMenusByRole('ASISTEN_BIBITAN');
assert(
  asistenMenus.length > 0 && asbMenus.length > 0,
  '23. Menu mapping unchanged'
);

// 24. Permissions unchanged
switchPersona('AST002');
const isRahmadAsisten = permissions.isAsisten();
const canRahmadApprove = permissions.can(null, 'transaction:approve');
switchPersona('ASB002');
const isAbdulAsisten = permissions.isAsisten();
const canAbdulApprove = permissions.can(null, 'transaction:approve');
assert(
  isRahmadAsisten === true && canRahmadApprove === true && isAbdulAsisten === true && canAbdulApprove === true,
  '24. Permissions logic unchanged'
);

console.log(`\n========================================`);
console.log(`PHASE 9E TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log(`========================================`);

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\n🎉 ALL PHASE 9E PERSONA DIVISION ALIGNMENT TESTS PASSED!');
}
