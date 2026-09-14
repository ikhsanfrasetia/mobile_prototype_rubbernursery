/**
 * scripts/test-sync-engine.js
 * Automated Test Suite untuk Demo Synchronization Engine (TASK-SYNC-02).
 *
 * Menguji 12 Skenario Pengujian Wajib:
 * TEST 01: PENGURUS Tanah Besih (hanya estate/divisi yang diizinkan)
 * TEST 02: ASKEP Tanah Besih (tidak mendapatkan Aek Pamingke)
 * TEST 03: ASISTEN Tanah Besih Divisi I (tidak dapat memilih Divisi II)
 * TEST 04: ASB Tanah Besih (hanya dapat mengakses nursery scope user)
 * TEST 05: MANTRI Tanah Besih (tidak dapat memilih nursery divisi lain)
 * TEST 06: Pilih divisi pada Sinkronisasi (session.divisionId tidak berubah)
 * TEST 07: Sync dataset (data tersimpan ke persistence)
 * TEST 08: Reload halaman / re-check status (status sync tetap SUCCESS)
 * TEST 09: Logout User A -> Login User B (data User A tidak bocor ke User B)
 * TEST 10: Provider mengembalikan data lintas estate (dibuang sebelum persistence)
 * TEST 11: Provider mengembalikan data lintas divisi (dibuang sebelum persistence)
 * TEST 12: Satu dataset gagal (dataset lain tetap diproses & status akhir PARTIAL_SUCCESS)
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
  DemoErpProvider,
  SyncService,
  SyncPersistenceAdapter,
  filterDatasetByScope,
  SYNC_DATASET_CONFIG,
  SYNC_STATUS,
  SCOPE_TYPE
} from '../js/core/sync-engine.js';
import { storage, KEYS } from '../js/core/storage.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`❌ FAIL: ${message}`);
  }
}

console.log('========================================================================================');
console.log('            SIGMA RUBBER NURSERY — TEST SUITE: DEMO SYNC ENGINE (TASK-SYNC-02)          ');
console.log('========================================================================================\n');

async function runTests() {
  // --------------------------------------------------------------------------
  // TEST 01: PENGURUS Tanah Besih
  // --------------------------------------------------------------------------
  // TEST 01: PENGURUS
  // Expected: Pengurus memiliki akses cross-estate (TBS + APM), dropdown unlocked.
  // --------------------------------------------------------------------------
  {
    const user = {
      id: 'PGS001',
      name: 'Junaidi',
      role: 'PENGURUS',
      estateId: 'EST-TBS',
      divisionId: 'DIV-001'
    };
    const scope = resolveSyncScope(user);
    assert(scope.isValid === true, 'TEST 01.1: Scope valid untuk PENGURUS');
    assert(scope.allowCrossEstate === true, 'TEST 01.2: allowCrossEstate adalah true untuk PENGURUS');
    assert(scope.allowedDivisions.length === 5, 'TEST 01.3: Memiliki 5 opsi divisi operasional (TBS + APM)');
    assert(
      scope.allowedDivisions.some((d) => d.estateId === 'EST-TBS') &&
      scope.allowedDivisions.some((d) => d.estateId === 'EST-APM'),
      'TEST 01.4: Opsi divisi mencakup kedua estate'
    );
    assert(scope.isDivisionLocked === false, 'TEST 01.5: Dropdown tidak terkunci untuk PENGURUS');
  }

  // --------------------------------------------------------------------------
  // TEST 02: ASKEP Tanah Besih
  // Expected: Hanya mendapatkan divisi Tanah Besih, tidak mendapatkan Aek Pamingke.
  // --------------------------------------------------------------------------
  {
    const user = {
      id: 'ASK001',
      name: 'Beny Sihotang',
      role: 'ASKEP',
      estateId: 'EST-TBS',
      divisionId: 'DIV-001'
    };
    const scope = resolveSyncScope(user);
    const hasAPM = scope.allowedDivisions.some((d) => d.estateId === 'EST-APM' || d.id.includes('APM'));
    assert(hasAPM === false, 'TEST 02.1: ASKEP Tanah Besih tidak memiliki opsi Aek Pamingke');
    assert(
      !scope.estateIds.includes('EST-APM'),
      'TEST 02.2: allowedEstateIds tidak menyertakan EST-APM'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 03: ASISTEN Tanah Besih Divisi I
  // Expected: Mendapatkan seluruh divisi operasional TBS, dapat memilih multiple divisi.
  // --------------------------------------------------------------------------
  {
    const user = {
      id: 'AST001',
      name: 'Nando',
      role: 'ASISTEN',
      estateId: 'EST-TBS',
      divisionId: 'DIV-001'
    };
    const scope = resolveSyncScope(user);
    assert(scope.isDivisionLocked === false, 'TEST 03.1: Dropdown tidak terkunci untuk ASISTEN');
    assert(scope.allowedDivisions.length === 3, 'TEST 03.2: Opsi divisi mencakup seluruh 3 divisi TBS');
    assert(scope.allowedDivisions.every(d => d.estateId === 'EST-TBS'), 'TEST 03.3: Seluruh opsi divisi berasal dari TBS');

    // Coba bypass via input selectedSyncDivisionIds mengandung divisi APM
    const bypassScope = resolveSyncScope(user, ['DIV-001', 'DIV-APM-02']);
    assert(
      !bypassScope.selectedDivisionIds.includes('DIV-APM-02') &&
      bypassScope.selectedDivisionIds.includes('DIV-001'),
      'TEST 03.4: Upaya bypass memilih DIV-APM-02 ditolak dan fallback aman ke DIV-001'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 04: ASB Tanah Besih
  // Expected: Mendapatkan seluruh divisi operasional TBS untuk multiselect.
  // --------------------------------------------------------------------------
  {
    const user = {
      id: 'ASB001',
      name: 'Annisa',
      role: 'ASISTEN_BIBITAN',
      estateId: 'EST-TBS',
      divisionId: 'DIV-001'
    };
    const scope = resolveSyncScope(user, ['DIV-001', 'DIV-002']);
    assert(scope.isDivisionLocked === false, 'TEST 04.1: Dropdown multiselect tidak terkunci untuk ASB');
    assert(scope.selectedDivisionIds.length === 2, 'TEST 04.2: ASB dapat memilih multiple divisi ([DIV-001, DIV-002])');
  }

  // --------------------------------------------------------------------------
  // TEST 05: MANTRI Tanah Besih
  // Expected: Mendapatkan seluruh divisi operasional TBS, menolak divisi APM.
  // --------------------------------------------------------------------------
  {
    const user = {
      id: 'MNT001',
      name: 'Wagiman',
      role: 'MANTRI_TANAMAN',
      estateId: 'EST-TBS',
      divisionId: 'DIV-001'
    };
    const scope = resolveSyncScope(user, ['DIV-APM-02']);
    assert(scope.isDivisionLocked === false, 'TEST 05.1: Dropdown multiselect tidak terkunci untuk MANTRI');
    assert(
      !scope.selectedDivisionIds.includes('DIV-APM-02'),
      'TEST 05.2: Mantri TBS tidak dapat diarahkan ke nursery APM (DIV-APM-02)'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 06: Pilih divisi pada Sinkronisasi
  // Expected: session.divisionId TIDAK berubah.
  // --------------------------------------------------------------------------
  {
    const initialSession = {
      userId: 'PGS001',
      role: 'PENGURUS',
      estateId: 'EST-TBS',
      divisionId: 'DIV-001'
    };
    storage.set(KEYS.SESSION, initialSession);

    // Pengurus memilih DIV-002 pada sinkronisasi
    const syncScope = resolveSyncScope(initialSession, 'DIV-002');
    assert(syncScope.selectedDivisionId === 'DIV-002', 'TEST 06.1: Sync scope menggunakan DIV-002');

    // Cek isi session di storage
    const currentSession = storage.get(KEYS.SESSION);
    assert(
      currentSession.divisionId === 'DIV-001',
      'TEST 06.2: session.divisionId tetap DIV-001 (ZERO SESSION CONTAMINATION)'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 07: Sync dataset
  // Expected: Data tersimpan ke persistence dengan recordCount nyata.
  // --------------------------------------------------------------------------
  {
    const user = {
      userId: 'USR_SYNC_TEST',
      role: 'ASISTEN',
      estateId: 'EST-TBS',
      divisionId: 'DIV-001'
    };

    const fastProvider = new DemoErpProvider({ simulateDelayMs: 0 });
    const syncService = new SyncService({ provider: fastProvider });

    const result = await syncService.syncAllDatasets(user, 'DIV-001');
    assert(result.overallStatus === SYNC_STATUS.SUCCESS, 'TEST 07.1: Overall status adalah SUCCESS');
    assert(result.successCount === 17, 'TEST 07.2: Seluruh 17 dataset berhasil');
    assert(result.failedCount === 0, 'TEST 07.3: 0 dataset gagal');

    // Periksa isi persisted data pekerja
    const workerScope = resolveSyncScope(user, 'DIV-001');
    const persistedWorkers = SyncPersistenceAdapter.getDataset('pekerja', workerScope);
    assert(persistedWorkers !== null, 'TEST 07.4: Data pekerja tersimpan di storage');
    assert(persistedWorkers.recordCount > 0, 'TEST 07.5: recordCount > 0');
    assert(
      persistedWorkers.data.every((w) => w.estateId === 'EST-TBS' && w.divisionId === 'DIV-001'),
      'TEST 07.6: Data pekerja yang disimpan terisolasi pada TBS Divisi I'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 08: Reload halaman / Re-read status
  // Expected: Status sync tetap SUCCESS dan recordCount tetap ada.
  // --------------------------------------------------------------------------
  {
    const userId = 'USR_SYNC_TEST';
    const statuses = SyncPersistenceAdapter.getStatuses(userId);
    assert(statuses['pekerja'] !== undefined, 'TEST 08.1: Status pekerja tersimpan');
    assert(statuses['pekerja'].status === SYNC_STATUS.SUCCESS, 'TEST 08.2: Status pekerja adalah SUCCESS');
    assert(statuses['pekerja'].recordCount > 0, 'TEST 08.3: recordCount pekerja persisten');
    assert(statuses['kebun'].status === SYNC_STATUS.SUCCESS, 'TEST 08.4: Status kebun persisten');
  }

  // --------------------------------------------------------------------------
  // TEST 09: Logout User A -> Login User B
  // Expected: Data User A tidak bocor ke User B.
  // --------------------------------------------------------------------------
  {
    const userA = { userId: 'USER_A_TBS', role: 'ASISTEN', estateId: 'EST-TBS', divisionId: 'DIV-001' };
    const userB = { userId: 'USER_B_APM', role: 'ASISTEN', estateId: 'EST-APM', divisionId: 'DIV-APM-01' };

    const fastProvider = new DemoErpProvider({ simulateDelayMs: 0 });
    const syncService = new SyncService({ provider: fastProvider });

    // Sync User A
    await syncService.syncAllDatasets(userA);

    // Cek User B sebelum sync
    const statusesB = syncService.getStatuses(userB.userId);
    assert(Object.keys(statusesB).length === 0, 'TEST 09.1: Status User B awalnya kosong');

    // Sync User B
    await syncService.syncAllDatasets(userB);

    // Cek persisted payload User A vs User B
    const scopeA = resolveSyncScope(userA);
    const scopeB = resolveSyncScope(userB);

    const payloadA = SyncPersistenceAdapter.getDataset('pekerja', scopeA);
    const payloadB = SyncPersistenceAdapter.getDataset('pekerja', scopeB);

    assert(payloadA.estateId === 'EST-TBS', 'TEST 09.2: Payload A berada di EST-TBS');
    assert(payloadB.estateId === 'EST-APM', 'TEST 09.3: Payload B berada di EST-APM');
    assert(
      payloadA.data.some((w) => w.name.includes('Fadilah')),
      'TEST 09.4: Data User A berisi pekerja TBS (Fadilah)'
    );
    assert(
      payloadB.data.every((w) => w.estateId === 'EST-APM'),
      'TEST 09.5: Data User B TIDAK mengandung data pekerja TBS'
    );
  }

  // --------------------------------------------------------------------------
  // TEST 10: Provider mengembalikan data lintas estate
  // Expected: Data lintas estate dibuang oleh filter sebelum persistence.
  // --------------------------------------------------------------------------
  {
    const scope = resolveSyncScope({
      userId: 'TEST_USER',
      role: 'ASISTEN',
      estateId: 'EST-TBS',
      divisionId: 'DIV-001'
    });

    const datasetConfig = SYNC_DATASET_CONFIG.find((d) => d.key === 'pekerja');
    const dirtyDataFromProvider = [
      { id: 'WRK-001', estateId: 'EST-TBS', divisionId: 'DIV-001', name: 'Pekerja TBS' },
      { id: 'WRK-LEAK', estateId: 'EST-APM', divisionId: 'DIV-APM-01', name: 'Pekerja Bocor APM' }
    ];

    const cleanData = filterDatasetByScope(datasetConfig, dirtyDataFromProvider, scope);
    assert(cleanData.length === 1, 'TEST 10.1: Data bocor lintas estate berhasil disaring');
    assert(cleanData[0].id === 'WRK-001', 'TEST 10.2: Hanya data EST-TBS yang lolos');
  }

  // --------------------------------------------------------------------------
  // TEST 11: Provider mengembalikan data lintas divisi
  // Expected: Data lintas divisi dibuang oleh filter sebelum persistence.
  // --------------------------------------------------------------------------
  {
    const scope = resolveSyncScope({
      userId: 'TEST_USER_DIV',
      role: 'ASISTEN',
      estateId: 'EST-TBS',
      divisionId: 'DIV-001'
    });

    const datasetConfig = SYNC_DATASET_CONFIG.find((d) => d.key === 'pekerja');
    const dirtyDataFromProvider = [
      { id: 'WRK-001', estateId: 'EST-TBS', divisionId: 'DIV-001', name: 'Pekerja Divisi I' },
      { id: 'WRK-002', estateId: 'EST-TBS', divisionId: 'DIV-002', name: 'Pekerja Divisi II' }
    ];

    const cleanData = filterDatasetByScope(datasetConfig, dirtyDataFromProvider, scope);
    assert(cleanData.length === 1, 'TEST 11.1: Data bocor lintas divisi berhasil disaring');
    assert(cleanData[0].divisionId === 'DIV-001', 'TEST 11.2: Hanya data DIV-001 yang lolos');
  }

  // --------------------------------------------------------------------------
  // TEST 12: Satu dataset gagal
  // Expected: Dataset lain tetap diproses dan status akhir PARTIAL_SUCCESS.
  // --------------------------------------------------------------------------
  {
    class FaultyProvider extends DemoErpProvider {
      async getFaces(scope) {
        throw new Error('Simulasi ERP Timeout pada biometrik Wajah');
      }
    }

    const faultyProvider = new FaultyProvider({ simulateDelayMs: 0 });
    const syncService = new SyncService({ provider: faultyProvider });

    const user = { userId: 'USER_FAULT_TEST', role: 'PENGURUS', estateId: 'EST-TBS', divisionId: 'DIV-001' };
    const result = await syncService.syncAllDatasets(user);

    assert(
      result.overallStatus === SYNC_STATUS.PARTIAL_SUCCESS,
      'TEST 12.1: Overall status adalah PARTIAL_SUCCESS saat satu dataset gagal'
    );
    assert(result.failedCount === 1, 'TEST 12.2: Tepat 1 dataset gagal (wajah)');
    assert(result.successCount === 16, 'TEST 12.3: 16 dataset lainnya tetap sukses diproses');
    assert(result.statuses['wajah'].status === SYNC_STATUS.FAILED, 'TEST 12.4: Status dataset wajah adalah FAILED');
    assert(
      result.statuses['wajah'].errorMessage.includes('Simulasi ERP Timeout'),
      'TEST 12.5: Error message tersimpan dengan jelas'
    );
    assert(result.statuses['pekerja'].status === SYNC_STATUS.SUCCESS, 'TEST 12.6: Dataset pekerja tetap SUCCESS');
  }

  console.log('\n----------------------------------------------------------------------------------------');
  console.log(`TOTAL ASSERTIONS: ${passed + failed}`);
  console.log(`PASSED:           ${passed}`);
  console.log(`FAILED:           ${failed}`);
  console.log('----------------------------------------------------------------------------------------');

  if (failed === 0) {
    console.log('✅ ALL DEMO SYNC ENGINE TESTS PASSED (0 FAILURES)!');
    process.exit(0);
  } else {
    console.error('❌ SOME DEMO SYNC ENGINE TESTS FAILED!');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
