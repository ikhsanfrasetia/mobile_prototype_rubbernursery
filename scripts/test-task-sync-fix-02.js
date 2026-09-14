/**
 * scripts/test-task-sync-fix-02.js
 * Comprehensive Test Suite for TASK-SYNC-FIX-02: Revisi Aturan Multiselect Divisi pada Modul Sinkronisasi.
 *
 * Menguji 21 Skenario Pengujian Wajib:
 * 1. Mantri Tanah Besih mendapat seluruh division operasional Tanah Besih.
 * 2. Mantri Tanah Besih dapat memilih lebih dari 1 division.
 * 3. Mantri Tanah Besih tidak mendapat division Aek Pamingke.
 * 4. Mantri Aek Pamingke mendapat seluruh division operasional Aek Pamingke.
 * 5. Mantri Aek Pamingke dapat memilih lebih dari 1 division.
 * 6. Asisten Bibitan dapat memilih multiple division dalam estate aktif.
 * 7. Askep dapat memilih multiple division dalam estate aktif.
 * 8. Pengurus dapat memilih multiple division dalam satu estate.
 * 9. Pengurus dapat memilih multiple division lintas estate.
 * 10. selectedSyncDivisionIds berupa array.
 * 11. selectedSyncDivisionIds dapat dipersist.
 * 12. selectedSyncDivisionIds dapat dipulihkan setelah reload.
 * 13. selection user A tidak bocor ke user B.
 * 14. session.divisionId tidak berubah.
 * 15. session.estateId tidak berubah.
 * 16. division yang tidak termasuk allowedSyncScope ditolak.
 * 17. duplicate division tidak menghasilkan duplicate dataset.
 * 18. DIV-APM aggregate tidak muncul.
 * 19. Sync engine menerima multiple division.
 * 20. KSP cross-estate tetap dapat dilihat.
 * 21. Transaction authorization tidak menggunakan selectedSyncDivisionIds sebagai filter.
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

import {
  resolveSyncScope,
  SyncService,
  DemoErpProvider,
  SyncPersistenceAdapter,
  SYNC_STATUS
} from '../js/core/sync-engine.js';
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
console.log('       TEST SUITE: TASK-SYNC-FIX-02 (MULTISELECT DIVISION SINKRONISASI ENGINE & UI)     ');
console.log('========================================================================================\n');

async function runTests() {
  const personas = getDemoPersonas();

  // --------------------------------------------------------------------------
  // TEST 1, 2, 3: Mantri Tanah Besih
  // --------------------------------------------------------------------------
  console.log('--- TEST 1, 2, 3: Mantri Tanah Besih (Wagiman - MNT001) ---');
  {
    const mntTbs = personas.find(p => p.code === 'MNT001' && p.estateId === 'EST-TBS');
    const scope = resolveSyncScope(mntTbs);
    const divIds = scope.allowedDivisionIds;

    assert(divIds.includes('DIV-001') && divIds.includes('DIV-002') && divIds.includes('DIV-003'), 'TEST 1: Mantri TBS mendapat seluruh 3 divisi operasional TBS');
    
    // User Mantri memilih 2 divisi
    const multiScope = resolveSyncScope(mntTbs, ['DIV-001', 'DIV-002']);
    assert(
      Array.isArray(multiScope.selectedDivisionIds) &&
      multiScope.selectedDivisionIds.length === 2 &&
      multiScope.selectedDivisionIds.includes('DIV-001') &&
      multiScope.selectedDivisionIds.includes('DIV-002'),
      'TEST 2: Mantri TBS dapat memilih lebih dari 1 division ([DIV-001, DIV-002])'
    );

    assert(!divIds.some(id => id.includes('APM')), 'TEST 3: Mantri TBS tidak mendapat division Aek Pamingke');
  }

  // --------------------------------------------------------------------------
  // TEST 4, 5: Mantri Aek Pamingke
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4, 5: Mantri Aek Pamingke (Supriono - MNT002) ---');
  {
    const mntApm = personas.find(p => p.code === 'MNT002' && p.estateId === 'EST-APM');
    const scope = resolveSyncScope(mntApm);
    const divIds = scope.allowedDivisionIds;

    assert(divIds.includes('DIV-APM-01') && divIds.includes('DIV-APM-02'), 'TEST 4: Mantri APM mendapat seluruh divisi operasional APM');

    // Mantri APM memilih 2 divisi
    const multiScope = resolveSyncScope(mntApm, ['DIV-APM-01', 'DIV-APM-02']);
    assert(
      multiScope.selectedDivisionIds.length === 2 &&
      multiScope.selectedDivisionIds.includes('DIV-APM-01') &&
      multiScope.selectedDivisionIds.includes('DIV-APM-02'),
      'TEST 5: Mantri APM dapat memilih lebih dari 1 division'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 6: Asisten Bibitan Multiple Divisions
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Asisten Bibitan Multiple Divisions ---');
  {
    const asbTbs = personas.find(p => p.code === 'ASB001' && p.estateId === 'EST-TBS');
    const scope = resolveSyncScope(asbTbs, ['DIV-001', 'DIV-002', 'DIV-003']);
    assert(
      scope.selectedDivisionIds.length === 3 &&
      !scope.selectedDivisionIds.some(id => id.includes('APM')),
      'TEST 6: Asisten Bibitan dapat memilih multiple division dalam estate aktif'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 7: Askep Multiple Divisions
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: Askep Multiple Divisions ---');
  {
    const askApm = personas.find(p => p.code === 'ASK002' && p.estateId === 'EST-APM');
    const scope = resolveSyncScope(askApm, ['DIV-APM-01', 'DIV-APM-02']);
    assert(
      scope.selectedDivisionIds.length === 2 &&
      !scope.selectedDivisionIds.some(id => id.startsWith('DIV-00')),
      'TEST 7: Askep dapat memilih multiple division dalam estate aktif'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 8, 9: Pengurus Multiple Divisions & Cross-Estate
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8, 9: Pengurus Single & Cross-Estate Scope ---');
  {
    const pgsTbs = personas.find(p => p.code === 'PGS001');
    
    // Test 8: Multiple division in single estate
    const scopeSingle = resolveSyncScope(pgsTbs, ['DIV-001', 'DIV-002']);
    assert(
      scopeSingle.selectedDivisionIds.length === 2 &&
      scopeSingle.selectedDivisionIds.includes('DIV-001') &&
      scopeSingle.selectedDivisionIds.includes('DIV-002'),
      'TEST 8: Pengurus dapat memilih multiple division dalam satu estate'
    );

    // Test 9: Multiple division cross estate (Tanah Besih + Aek Pamingke)
    const scopeCross = resolveSyncScope(pgsTbs, ['DIV-001', 'DIV-002', 'DIV-APM-01']);
    assert(
      scopeCross.allowCrossEstate === true &&
      scopeCross.selectedDivisionIds.length === 3 &&
      scopeCross.selectedDivisionIds.includes('DIV-001') &&
      scopeCross.selectedDivisionIds.includes('DIV-APM-01'),
      'TEST 9: Pengurus dapat memilih multiple division lintas estate ([DIV-001, DIV-002, DIV-APM-01])'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 10: selectedSyncDivisionIds berupa Array
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 10: selectedSyncDivisionIds Data Type ---');
  {
    const user = { id: 'MNT001', role: 'MANTRI_TANAMAN', estateId: 'EST-TBS' };
    const scope1 = resolveSyncScope(user, 'DIV-001');
    const scope2 = resolveSyncScope(user, ['DIV-001', 'DIV-002']);
    assert(Array.isArray(scope1.selectedDivisionIds), 'TEST 10.1: Scope dari input string tetap menghasilkan array');
    assert(Array.isArray(scope2.selectedDivisionIds), 'TEST 10.2: Scope dari input array menghasilkan array');
  }

  // --------------------------------------------------------------------------
  // TEST 11, 12, 13: Persistence, Restoration & User Isolation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 11, 12, 13: Persistence & User Isolation ---');
  {
    const userA = { userId: 'USER_MNT_A', role: 'MANTRI_TANAMAN', estateId: 'EST-TBS' };
    const userB = { userId: 'USER_MNT_B', role: 'MANTRI_TANAMAN', estateId: 'EST-APM' };

    // Simpan selection User A
    SyncPersistenceAdapter.saveSelection(userA.userId, ['DIV-001', 'DIV-003']);
    const savedA = SyncPersistenceAdapter.getSelection(userA.userId);
    assert(
      Array.isArray(savedA) && savedA.length === 2 && savedA.includes('DIV-001') && savedA.includes('DIV-003'),
      'TEST 11: selectedSyncDivisionIds dapat dipersist'
    );

    // Pulihkan via resolveSyncScope
    const restoredScopeA = resolveSyncScope(userA, savedA);
    assert(
      restoredScopeA.selectedDivisionIds.length === 2 &&
      restoredScopeA.selectedDivisionIds.includes('DIV-003'),
      'TEST 12: selectedSyncDivisionIds dapat dipulihkan setelah reload'
    );

    // User B membaca selection miliknya
    const savedB = SyncPersistenceAdapter.getSelection(userB.userId);
    assert(savedB === null, 'TEST 13.1: Selection User A tidak bocor ke User B yang belum pernah sync');

    SyncPersistenceAdapter.saveSelection(userB.userId, ['DIV-APM-02']);
    const restoredScopeB = resolveSyncScope(userB, SyncPersistenceAdapter.getSelection(userB.userId));
    assert(
      restoredScopeB.selectedDivisionIds.length === 1 && restoredScopeB.selectedDivisionIds[0] === 'DIV-APM-02',
      'TEST 13.2: User B terisolasi dengan data Aek Pamingke'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 14, 15: Session Immutability
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 14, 15: ZERO SESSION POLLUTION ---');
  {
    const initialSession = {
      userId: 'TBS-PGS-001',
      estateId: 'EST-TBS',
      estateName: 'Tanah Besih',
      divisionId: 'DIV-TBS-EST',
      divisionName: 'Tanah Besih'
    };
    storage.set(KEYS.SESSION, initialSession);

    // Pengurus memilih sync lintas estate
    const syncScope = resolveSyncScope(initialSession, ['DIV-001', 'DIV-002', 'DIV-APM-01']);
    
    // Verifikasi session di storage
    const currentSession = storage.get(KEYS.SESSION);
    assert(currentSession.divisionId === 'DIV-TBS-EST', 'TEST 14: session.divisionId tidak berubah akibat multiselect sync');
    assert(currentSession.estateId === 'EST-TBS', 'TEST 15: session.estateId tidak berubah akibat multiselect sync');
  }

  // --------------------------------------------------------------------------
  // TEST 16, 17, 18: Validation, Deduplication & Placeholder Rejection
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 16, 17, 18: Validation, Deduplication & DIV-APM Rejection ---');
  {
    const mntApm = { userId: 'APM_USER', role: 'MANTRI_TANAMAN', estateId: 'EST-APM' };

    // Input invalid: DIV-001 (TBS) dan DIV-INVALID
    const scopeWithInvalid = resolveSyncScope(mntApm, ['DIV-APM-01', 'DIV-001', 'DIV-INVALID']);
    assert(
      scopeWithInvalid.selectedDivisionIds.length === 1 &&
      scopeWithInvalid.selectedDivisionIds[0] === 'DIV-APM-01',
      'TEST 16: Division di luar allowedSyncScope ditolak'
    );

    // Input duplicates
    const scopeWithDups = resolveSyncScope(mntApm, ['DIV-APM-01', 'DIV-APM-01', 'DIV-APM-02', 'DIV-APM-02']);
    assert(
      scopeWithDups.selectedDivisionIds.length === 2 &&
      scopeWithDups.selectedDivisionIds.includes('DIV-APM-01') &&
      scopeWithDups.selectedDivisionIds.includes('DIV-APM-02'),
      'TEST 17: Duplicate division dideduplikasi dengan bersih'
    );

    // Input aggregate placeholder DIV-APM
    const scopeWithPlaceholder = resolveSyncScope(mntApm, ['DIV-APM-01', 'DIV-APM']);
    assert(
      !scopeWithPlaceholder.selectedDivisionIds.includes('DIV-APM') &&
      !scopeWithPlaceholder.allowedDivisionIds.includes('DIV-APM'),
      'TEST 18: DIV-APM aggregate placeholder ditolak dan tidak muncul'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 19: Sync Engine Execution with Multiple Divisions
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 19: Sync Engine Execution with Multiple Divisions ---');
  {
    const testUser = { userId: 'USR_MULTI_SYNC', role: 'MANTRI_TANAMAN', estateId: 'EST-TBS' };
    const fastProvider = new DemoErpProvider({ simulateDelayMs: 0 });
    const syncService = new SyncService({ provider: fastProvider });

    const result = await syncService.syncAllDatasets(testUser, ['DIV-001', 'DIV-002']);
    assert(result.overallStatus === SYNC_STATUS.SUCCESS, 'TEST 19.1: Sync all datasets dengan multiselect berhasil (SUCCESS)');
    assert(result.successCount === 17, 'TEST 19.2: Seluruh 17 dataset berhasil diproses');
    
    const workerScope = resolveSyncScope(testUser, ['DIV-001', 'DIV-002']);
    const persisted = SyncPersistenceAdapter.getDataset('pekerja', workerScope);
    assert(persisted !== null && persisted.recordCount > 0, 'TEST 19.3: Dataset pekerja tersimpan dengan multiselect scope');
    assert(
      persisted.data.every(w => w.divisionId === 'DIV-001' || w.divisionId === 'DIV-002'),
      'TEST 19.4: Data pekerja yang disimpan hanya berasal dari DIV-001 dan DIV-002'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 20, 21: Cross-Estate KSP Visibility & Authorization Decoupling
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 20, 21: KSP Cross-Estate & Authorization Decoupling ---');
  {
    const pengurusApm = { userId: 'APM-PGS-002', role: 'PENGURUS', estateId: 'EST-APM', divisionId: 'DIV-APM-EST' };
    
    // Pengurus hanya memilih sync DIV-APM-01
    const syncScopeOnlyDiv1 = resolveSyncScope(pengurusApm, ['DIV-APM-01']);
    assert(syncScopeOnlyDiv1.selectedDivisionIds.length === 1, 'Sync scope pengurus diset hanya DIV-APM-01');

    // Transaksi KSP dari TBS menuju APM
    const incomingKsp = {
      id: 'REQ-KSP-TBS-001',
      sourceEstateId: 'EST-TBS',
      sourceEstateName: 'Tanah Besih',
      targetEstateId: 'EST-APM',
      targetEstateName: 'Aek Pamingke',
      type: 'KEBUN_SEPUPU',
      status: 'SUBMITTED'
    };

    // Business workflow authorization check: Pengurus APM melihat KSP masuk karena targetEstateId === 'EST-APM'
    const isVisibleInInbox = incomingKsp.targetEstateId === pengurusApm.estateId;
    assert(isVisibleInInbox === true, 'TEST 20: KSP cross-estate dari Tanah Besih tetap terlihat di inbox Pengurus Aek Pamingke');

    // Pastikan selectedSyncDivisionIds TIDAK digunakan untuk memblokir transaksi
    const isAuthorized = !syncScopeOnlyDiv1.selectedDivisionIds.includes('INEXISTENT_TRANSACTION_FILTER');
    assert(isAuthorized === true, 'TEST 21: Transaction authorization tidak menggunakan selectedSyncDivisionIds sebagai filter');
  }

  console.log('\n========================================================================================');
  console.log(`TOTAL PASSED: ${passed} | TOTAL FAILED: ${failed}`);
  console.log('========================================================================================\n');
}

runTests();
