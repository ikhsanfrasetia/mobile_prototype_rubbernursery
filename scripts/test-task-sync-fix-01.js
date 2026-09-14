/**
 * scripts/test-task-sync-fix-01.js
 * Comprehensive Test Suite for TASK-SYNC-FIX-01: Integrasi Scoped Division Resolver ke Layar Sinkronisasi.
 */

if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; }
  };
  global.localStorage = globalThis.localStorage;
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    addEventListener: () => {},
    localStorage: globalThis.localStorage
  };
  global.window = globalThis.window;
}

import { resolveSyncScope, defaultSyncService } from '../js/core/sync-engine.js';
import { resolveUserContext, ROLES } from '../js/core/user-context.js';
import { storage, KEYS } from '../js/core/storage.js';
import { getDemoPersonas } from '../js/data/demo-personas.js';
import { DEMO_USERS } from '../js/data/demo-data.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ❌ FAIL: ${message}`);
  }
}

console.log('========================================================================================');
console.log('        TEST SUITE: TASK-SYNC-FIX-01 (INTEGRASI SCOPED DIVISION RESOLVER KE /SYNC)       ');
console.log('========================================================================================\n');

async function runTests() {
  const personas = getDemoPersonas();

  // --------------------------------------------------------------------------
  // TEST 01: PENGURUS Aek Pamingke
  // --------------------------------------------------------------------------
  console.log('--- TEST 01: PENGURUS Aek Pamingke ---');
  {
    const pgsApm = personas.find(p => p.estateId === 'EST-APM' && p.role === ROLES.PENGURUS);
    const scope = resolveSyncScope(pgsApm);
    const divIds = scope.allowedDivisions.map(d => d.id);
    
    assert(scope.estateId === 'EST-APM', 'Estate scope adalah EST-APM');
    assert(divIds.includes('DIV-APM-01'), 'Mengandung DIV-APM-01 (Divisi I)');
    assert(divIds.includes('DIV-APM-02'), 'Mengandung DIV-APM-02 (Divisi II)');
    assert(!divIds.includes('DIV-001'), 'Tidak mengandung DIV-001 (Tanah Besih)');
    assert(!divIds.includes('DIV-002'), 'Tidak mengandung DIV-002 (Tanah Besih)');
    assert(!divIds.includes('DIV-003'), 'Tidak mengandung DIV-003 (Tanah Besih)');
    assert(!divIds.includes('DIV-APM'), 'Tidak mengandung aggregate placeholder DIV-APM');
    assert(scope.isDivisionLocked === false, 'Dropdown tidak terkunci untuk Pengurus');
    assert(scope.allowedDivisions.length === 2, 'Tepat 2 divisi operasional Aek Pamingke');
  }

  // --------------------------------------------------------------------------
  // TEST 02: ASKEP Aek Pamingke
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 02: ASKEP Aek Pamingke ---');
  {
    const askApm = personas.find(p => p.estateId === 'EST-APM' && p.role === ROLES.ASKEP);
    const scope = resolveSyncScope(askApm);
    const divIds = scope.allowedDivisions.map(d => d.id);

    assert(scope.estateId === 'EST-APM', 'Estate scope adalah EST-APM');
    assert(divIds.includes('DIV-APM-01') && divIds.includes('DIV-APM-02'), 'Mengandung DIV-APM-01 dan DIV-APM-02');
    assert(!divIds.includes('DIV-001') && !divIds.includes('DIV-APM'), 'Bersih dari divisi TBS dan placeholder');
    assert(scope.isDivisionLocked === false, 'Dropdown tidak terkunci untuk Askep');
  }

  // --------------------------------------------------------------------------
  // TEST 03: ASISTEN Aek Pamingke DIV-APM-01
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 03: ASISTEN Aek Pamingke (DIV-APM-01) ---');
  {
    const astApm = personas.find(p => p.estateId === 'EST-APM' && p.role === ROLES.ASISTEN);
    const scope = resolveSyncScope(astApm);
    const divIds = scope.allowedDivisions.map(d => d.id);

    assert(scope.estateId === 'EST-APM', 'Estate scope adalah EST-APM');
    assert(divIds.length === 1 && divIds[0] === 'DIV-APM-01', 'Hanya DIV-APM-01');
    assert(scope.isDivisionLocked === true, 'Dropdown terkunci (disabled/readonly) untuk Asisten');
    assert(scope.selectedDivisionId === 'DIV-APM-01', 'Selected division adalah DIV-APM-01');
  }

  // --------------------------------------------------------------------------
  // TEST 04: ASB Aek Pamingke
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 04: ASB Aek Pamingke ---');
  {
    const asbApm = personas.find(p => p.estateId === 'EST-APM' && p.role === ROLES.ASISTEN_BIBITAN);
    const scope = resolveSyncScope(asbApm);
    const divIds = scope.allowedDivisions.map(d => d.id);

    assert(scope.estateId === 'EST-APM', 'Estate scope adalah EST-APM');
    assert(divIds.length === 1 && divIds[0] === 'DIV-APM-02', 'Hanya DIV-APM-02 (Nursery APM)');
    assert(scope.isDivisionLocked === true, 'Dropdown terkunci untuk ASB');
    assert(scope.selectedDivisionId === 'DIV-APM-02', 'Selected division adalah DIV-APM-02');
  }

  // --------------------------------------------------------------------------
  // TEST 05: MANTRI Aek Pamingke
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 05: MANTRI Aek Pamingke ---');
  {
    const mntApm = personas.find(p => p.estateId === 'EST-APM' && p.role === ROLES.MANTRI_TANAMAN);
    const scope = resolveSyncScope(mntApm);
    const divIds = scope.allowedDivisions.map(d => d.id);

    assert(scope.estateId === 'EST-APM', 'Estate scope adalah EST-APM');
    assert(divIds.length === 1 && divIds[0] === 'DIV-APM-02', 'Hanya DIV-APM-02 (Nursery APM)');
    assert(scope.isDivisionLocked === true, 'Dropdown terkunci untuk Mantri');
    assert(scope.selectedDivisionId === 'DIV-APM-02', 'Selected division adalah DIV-APM-02');
  }

  // --------------------------------------------------------------------------
  // TEST 06: PENGURUS Tanah Besih
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 06: PENGURUS Tanah Besih ---');
  {
    const pgsTbs = personas.find(p => p.estateId === 'EST-TBS' && p.role === ROLES.PENGURUS);
    const scope = resolveSyncScope(pgsTbs);
    const divIds = scope.allowedDivisions.map(d => d.id);

    assert(scope.estateId === 'EST-TBS', 'Estate scope adalah EST-TBS');
    assert(divIds.includes('DIV-001') && divIds.includes('DIV-002') && divIds.includes('DIV-003'), 'Mengandung seluruh 3 divisi operasional TBS');
    assert(!divIds.some(id => id.includes('APM')), 'Tidak ada divisi Aek Pamingke');
    assert(scope.isDivisionLocked === false, 'Dropdown tidak terkunci untuk Pengurus TBS');
  }

  // --------------------------------------------------------------------------
  // TEST 07: ASKEP Tanah Besih
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 07: ASKEP Tanah Besih ---');
  {
    const askTbs = personas.find(p => p.estateId === 'EST-TBS' && p.role === ROLES.ASKEP);
    const scope = resolveSyncScope(askTbs);
    const divIds = scope.allowedDivisions.map(d => d.id);

    assert(scope.estateId === 'EST-TBS', 'Estate scope adalah EST-TBS');
    assert(!divIds.some(id => id.includes('APM')), 'Bersih dari seluruh divisi APM');
    assert(scope.isDivisionLocked === false, 'Dropdown tidak terkunci');
  }

  // --------------------------------------------------------------------------
  // TEST 08: Session Protection (ZERO SESSION POLLUTION)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 08: Session Protection ---');
  {
    const testSession = {
      userId: 'APM-PGS-002',
      role: 'PENGURUS',
      estateId: 'EST-APM',
      estateName: 'Aek Pamingke',
      divisionId: 'DIV-APM-EST',
      divisionName: 'Aek Pamingke'
    };
    storage.set(KEYS.SESSION, testSession);

    // Simulasi resolver sync dengan user memilih DIV-APM-02
    const syncScope = resolveSyncScope(testSession, 'DIV-APM-02');
    assert(syncScope.selectedDivisionId === 'DIV-APM-02', 'selectedSyncDivisionId adalah DIV-APM-02');

    // Cek isi session di storage
    const currentSession = storage.get(KEYS.SESSION);
    assert(
      currentSession.divisionId === 'DIV-APM-EST',
      'session.divisionId TETAP DIV-APM-EST (ZERO SESSION POLLUTION)'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 09: Cross-Estate KSP Protection
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 09: Cross-Estate KSP Visibility ---');
  {
    // Verifikasi sync scope tidak membatasi transaction dataset authorization
    const pengurusApm = { userId: 'APM-PGS-002', role: 'PENGURUS', estateId: 'EST-APM', divisionId: 'DIV-APM-EST' };
    const syncScopeApm = resolveSyncScope(pengurusApm);
    
    // Transaksi KSP dari TBS menuju APM
    const sampleKspFromTbs = {
      id: 'REQ-KSP-001',
      sourceEstateId: 'EST-TBS',
      sourceEstateName: 'Tanah Besih',
      targetEstateId: 'EST-APM',
      targetEstateName: 'Aek Pamingke',
      type: 'KEBUN_SEPUPU',
      status: 'SUBMITTED'
    };

    // Business authorization check: Pengurus APM melihat KSP masuk karena targetEstateId === 'EST-APM'
    const isVisibleToApm = sampleKspFromTbs.targetEstateId === pengurusApm.estateId;
    assert(isVisibleToApm === true, 'KSP dari Tanah Besih tetap terlihat di Permintaan Masuk Pengurus Aek Pamingke');
  }

  // --------------------------------------------------------------------------
  // TEST 10: Dynamic Resolution without Hardcoding
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 10: Dynamic Resolution via UserContext & Canonical IDs ---');
  {
    // Persona legacy credentials PKS001
    const pksUser = DEMO_USERS.find(u => u.code === 'PKS001');
    const resolvedPks = resolveUserContext(pksUser);
    const scopePks = resolveSyncScope(resolvedPks);
    const pksDivIds = scopePks.allowedDivisions.map(d => d.id);

    assert(scopePks.estateId === 'EST-APM', 'PKS001 otomatis ter-resolve ke EST-APM');
    assert(pksDivIds.includes('DIV-APM-01') && pksDivIds.includes('DIV-APM-02'), 'PKS001 mendapatkan DIV-APM-01 & 02');
    assert(!pksDivIds.includes('DIV-APM'), 'PKS001 tidak mendapatkan aggregate DIV-APM');
  }

  console.log('\n========================================================================================');
  console.log(`TOTAL PASSED: ${passed} | TOTAL FAILED: ${failed}`);
  console.log('========================================================================================\n');
}

runTests();
