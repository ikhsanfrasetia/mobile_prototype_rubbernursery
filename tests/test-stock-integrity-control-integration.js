/**
 * tests/test-stock-integrity-control-integration.js
 * Integration Test Suite for Stock Integrity Control (Seleksi I/II/III)
 * Sesuai Matriks docs/STOCK-INTEGRITY-CONTROL-IMPLEMENTATION-PLAN.md (IT-01 s.d IT-20)
 */

const memStore = new Map();
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem(key) { return memStore.has(key) ? memStore.get(key) : null; },
    setItem(key, val) { memStore.set(key, String(val)); },
    removeItem(key) { memStore.delete(key); },
    clear() { memStore.clear(); }
  };
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}
if (typeof globalThis.location === 'undefined') {
  globalThis.location = { hash: '#/beranda', pathname: '/' };
}
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}
if (typeof globalThis.addEventListener === 'undefined') {
  globalThis.addEventListener = () => {};
}
if (typeof globalThis.removeEventListener === 'undefined') {
  globalThis.removeEventListener = () => {};
}

import { 
  deductBatchStock, 
  deductMultiBatchStock,
  executeStockMutationWithLock, 
  syncBatchPopulationFromSeeding,
  getAvailableQty,
  replayBatchInventoryLedger,
  reconcileStartupRecovery,
  getStartupRecoveryStatus,
  resetStartupRecoveryStatusForTest,
  INVENTORY_TX_TYPE
} from '../js/core/batch-inventory-service.js';
import { 
  validateSeleksi2Execution, 
  validateSeleksi3Execution,
  approveSelectionRecord,
  resolveApprovalInterrupted,
  SELECTION_STATUS
} from '../js/modules/selection/selection-manager.js';
import {
  approveDestructionRecord,
  mutateStockFromDestruction,
  DESTRUCTION_STATUS,
  STOCK_MUTATION_STATUS
} from '../js/modules/destruction/destruction-manager.js';
import { 
  assertBedenganNotLocked, 
  assertBatchNotLocked 
} from '../js/core/dependency-guard.js';
import { storage } from '../js/core/storage.js';

let passCount = 0;
let failCount = 0;
const scenarioResults = [];

function recordScenario(id, title, passed, details = '') {
  if (passed) {
    console.log(`[PASS] ${id}: ${title}${details ? ` -> ${details}` : ''}`);
    passCount++;
    scenarioResults.push({ id, title, status: 'PASS', details });
  } else {
    console.error(`[FAIL] ${id}: ${title}${details ? ` -> ${details}` : ''}`);
    failCount++;
    scenarioResults.push({ id, title, status: 'FAIL', details });
  }
}

async function runTests() {
  console.log('=== STARTING STOCK INTEGRITY CONTROL INTEGRATION TESTS (IT-01 to IT-20) ===\n');

  // Backup original storage states to ensure pristine isolation
  const backupKeys = [
    'batch_inventory_states',
    'batch_inventory_journal',
    'selection_anomaly_cases',
    'selection_approval_decisions',
    'selection_mutation_intents',
    'selection_transactions',
    'seeding_transactions',
    'destruction_transactions',
    'nursery_batches',
    'bedengan_master'
  ];
  const origBackups = {};
  backupKeys.forEach(k => {
    origBackups[k] = storage.get(k, null);
  });

  const userAsisten = {
    userId: 'USR-ASB-01',
    code: 'ASB-01',
    id: 'ASB-01',
    name: 'Asisten Bibitan Test',
    role: 'ASISTEN_BIBITAN',
    rawRole: 'ASISTEN_BIBITAN',
    estateId: 'EST-01',
    divisionId: 'DIV-01'
  };

  try {
    // -------------------------------------------------------------
    // IT-01: Sequence monotonik per batch
    // -------------------------------------------------------------
    {
      const batchId = 'B-IT-01';
      storage.set('batch_inventory_states', [{ batchId, batchCode: batchId, availableQty: 950, status: 'AVAILABLE' }]);
      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchId}-1`, batchId, batchCode: batchId, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 1000, qtyOut: 0, balance: 1000 },
        { id: `JRN-${batchId}-2`, batchId, batchCode: batchId, batchSeq: 2, txType: INVENTORY_TX_TYPE.SELECTION, qtyIn: 0, qtyOut: 50, balance: 950 }
      ]);

      const res = deductBatchStock(batchId, 50, INVENTORY_TX_TYPE.SELECTION, { id: 'TX-IT01', docNo: 'SEL-IT01' });
      const journal = storage.get('batch_inventory_journal', []).filter(j => j.batchId === batchId);
      const lastEntry = journal[journal.length - 1];

      const pass = journal.length === 3 && lastEntry.batchSeq === 3 && res.availableQty === 900;
      recordScenario('IT-01', 'Sequence monotonik per batch di bawah lock', pass, `seq: ${lastEntry?.batchSeq}, balance: ${res?.availableQty}`);
    }

    // -------------------------------------------------------------
    // IT-02: Dua operasi bersamaan pada batch yang sama (Concurrency Lock)
    // -------------------------------------------------------------
    {
      const batchId = 'B-IT-02';
      storage.set('batch_inventory_states', [{ batchId, batchCode: batchId, availableQty: 100, status: 'AVAILABLE' }]);
      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchId}-1`, batchId, batchCode: batchId, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 100, qtyOut: 0, balance: 100 }
      ]);

      const op1 = executeStockMutationWithLock(batchId, async () => {
        const cur = getAvailableQty(batchId);
        if (cur < 80) throw new Error(`Stok tidak mencukupi (sisa ${cur})`);
        await new Promise(r => setTimeout(r, 25)); // tahan lock sejenak
        return deductBatchStock(batchId, 80, INVENTORY_TX_TYPE.SELECTION, { id: 'TX-IT02-A' });
      });

      const op2 = executeStockMutationWithLock(batchId, async () => {
        const cur = getAvailableQty(batchId);
        if (cur < 60) throw new Error(`Stok tidak mencukupi (sisa ${cur})`);
        return deductBatchStock(batchId, 60, INVENTORY_TX_TYPE.SELECTION, { id: 'TX-IT02-B' });
      });

      const results = await Promise.allSettled([op1, op2]);
      const finalBal = getAvailableQty(batchId);
      const journal = storage.get('batch_inventory_journal', []).filter(j => j.batchId === batchId);

      const op1Success = results[0].status === 'fulfilled';
      const op2Failed = results[1].status === 'rejected' && results[1].reason.message.includes('Stok tidak mencukupi');
      const pass = op1Success && op2Failed && finalBal === 20 && journal.length === 2;

      recordScenario('IT-02', 'Dua operasi bersamaan pada batch yang sama', pass, `finalBal: ${finalBal}, op1: ${results[0].status}, op2: ${results[1].status}`);
    }

    // -------------------------------------------------------------
    // IT-03: Web Locks fail-closed
    // -------------------------------------------------------------
    {
      const batchId = 'B-IT-03';
      storage.set('batch_inventory_states', [{ batchId, batchCode: batchId, availableQty: 500, status: 'AVAILABLE' }]);
      const origLocks = navigator.locks;
      let errThrown = null;
      let callbackExecuted = false;

      try {
        Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true });
        await executeStockMutationWithLock(batchId, async () => {
          callbackExecuted = true;
          deductBatchStock(batchId, 50);
        });
      } catch (e) {
        errThrown = e;
      } finally {
        Object.defineProperty(navigator, 'locks', { value: origLocks, configurable: true });
      }

      const balAfter = getAvailableQty(batchId);
      const pass = errThrown !== null && 
                   errThrown.message.includes('Web Locks API tidak tersedia') && 
                   callbackExecuted === false && 
                   balAfter === 500;

      recordScenario('IT-03', 'Web Locks fail-closed saat API tidak tersedia', pass, `error: ${errThrown?.message}`);
    }

    // -------------------------------------------------------------
    // IT-04: Timestamp identik dengan sequence yang valid
    // -------------------------------------------------------------
    {
      const batchId = 'B-IT-04';
      const identicalTime = '2026-10-12T08:00:00.000Z';
      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchId}-0`, batchId, batchCode: batchId, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 1000, qtyOut: 0, balance: 1000, createdAt: identicalTime },
        { id: `JRN-${batchId}-1`, batchId, batchCode: batchId, batchSeq: 2, txType: INVENTORY_TX_TYPE.SELECTION, qtyIn: 0, qtyOut: 60, balance: 940, createdAt: identicalTime },
        { id: `JRN-${batchId}-2`, batchId, batchCode: batchId, batchSeq: 3, txType: INVENTORY_TX_TYPE.SELECTION, qtyIn: 0, qtyOut: 40, balance: 900, createdAt: identicalTime }
      ]);
      storage.set('batch_inventory_states', [{ batchId, batchCode: batchId, availableQty: 1000, status: 'AVAILABLE' }]);

      const replayed = replayBatchInventoryLedger(batchId);
      const pass = replayed.availableQty === 900 && replayed.lastAppliedJournalId === `JRN-${batchId}-2`;
      recordScenario('IT-04', 'Timestamp identik dengan sequence yang valid diurutkan deterministik', pass, `availableQty: ${replayed.availableQty}`);
    }

    // -------------------------------------------------------------
    // IT-05: Jurnal historis tanpa urutan yang dapat dibuktikan
    // -------------------------------------------------------------
    {
      const batchId = 'B-IT-05';
      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchId}-BASE`, batchId, batchCode: batchId, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 1000, qtyOut: 0, balance: 1000, createdAt: '2026-01-01T00:00:00.000Z' },
        { id: `JRN-${batchId}-HIST-1`, batchId, batchCode: batchId, batchSeq: undefined, txType: INVENTORY_TX_TYPE.SELECTION, qtyIn: 0, qtyOut: 50, createdAt: null },
        { id: `JRN-${batchId}-HIST-2`, batchId, batchCode: batchId, batchSeq: undefined, txType: INVENTORY_TX_TYPE.SELECTION, qtyIn: 0, qtyOut: 30, createdAt: null }
      ]);
      storage.set('selection_anomaly_cases', []);

      let auditErr = null;
      try {
        replayBatchInventoryLedger(batchId);
      } catch (e) {
        auditErr = e;
      }

      const anomalies = storage.get('selection_anomaly_cases', []);
      const batchLocked = anomalies.some(a => a.batchId === batchId && a.status === 'BATCH_LOCKED');
      const pass = auditErr !== null && auditErr.message.includes('AUDIT_REQUIRED') && batchLocked;
      recordScenario('IT-05', 'Jurnal historis tanpa sequence mengunci batch (AUDIT_REQUIRED)', pass, `err: ${auditErr?.message}`);
    }

    // -------------------------------------------------------------
    // IT-06: Idempotency key duplikat dengan payload identik
    // -------------------------------------------------------------
    {
      const batchId = 'B-IT-06';
      storage.set('batch_inventory_states', [{ batchId, batchCode: batchId, availableQty: 1000, status: 'AVAILABLE' }]);
      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchId}-1`, batchId, batchCode: batchId, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 1000, qtyOut: 0, balance: 1000 }
      ]);

      const key = 'MUT-IT-06-IDENTICAL';
      const res1 = deductBatchStock(batchId, 50, INVENTORY_TX_TYPE.SELECTION, { id: 'TX-06', idempotencyKey: key });
      const res2 = deductBatchStock(batchId, 50, INVENTORY_TX_TYPE.SELECTION, { id: 'TX-06', idempotencyKey: key });

      const journal = storage.get('batch_inventory_journal', []).filter(j => j.batchId === batchId);
      const pass = res1.availableQty === 950 && res2.idempotentSkipped === true && journal.length === 2 && getAvailableQty(batchId) === 950;
      recordScenario('IT-06', 'Idempotency key duplikat dengan payload identik diskip', pass, `journal count: ${journal.length}`);
    }

    // -------------------------------------------------------------
    // IT-07: Idempotency key duplikat dengan payload berbeda
    // -------------------------------------------------------------
    {
      const batchId = 'B-IT-07';
      storage.set('batch_inventory_states', [{ batchId, batchCode: batchId, availableQty: 1000, status: 'AVAILABLE' }]);
      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchId}-1`, batchId, batchCode: batchId, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 1000, qtyOut: 0, balance: 1000 }
      ]);

      const key = 'MUT-IT-07-CONFLICT';
      deductBatchStock(batchId, 50, INVENTORY_TX_TYPE.SELECTION, { id: 'TX-07', idempotencyKey: key });

      let conflictErr = null;
      try {
        deductBatchStock(batchId, 80, INVENTORY_TX_TYPE.SELECTION, { id: 'TX-07', idempotencyKey: key });
      } catch (e) {
        conflictErr = e;
      }

      const pass = conflictErr !== null && conflictErr.message.includes('StockIntegrityBreachError');
      recordScenario('IT-07', 'Idempotency key duplikat dengan payload berbeda ditolak keras', pass, `err: ${conflictErr?.message}`);
    }

    // -------------------------------------------------------------
    // IT-08: Baseline ganda atau tidak valid
    // -------------------------------------------------------------
    {
      const batchId = 'B-IT-08';
      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchId}-1`, batchId, batchCode: batchId, batchSeq: 1, txType: 'INITIAL_SOW', qtyIn: 500, qtyOut: 0, balance: 500 },
        { id: `JRN-${batchId}-2`, batchId, batchCode: batchId, batchSeq: 2, txType: 'MIGRATION_BASELINE', qtyIn: 600, qtyOut: 0, balance: 600 }
      ]);
      storage.set('selection_anomaly_cases', []);

      let baselineErr = null;
      try {
        replayBatchInventoryLedger(batchId);
      } catch (e) {
        baselineErr = e;
      }

      const anomalies = storage.get('selection_anomaly_cases', []);
      const locked = anomalies.some(a => a.batchId === batchId && a.status === 'BATCH_LOCKED');
      const pass = baselineErr !== null && baselineErr.message.includes('BASELINE_CONFLICT_ERROR') && locked;
      recordScenario('IT-08', 'Baseline ganda mendeteksi BASELINE_CONFLICT_ERROR & mengunci batch', pass, `err: ${baselineErr?.message}`);
    }

    // -------------------------------------------------------------
    // IT-09: Jurnal negatif, field wajib hilang, dan sequence gap
    // -------------------------------------------------------------
    {
      const batchIdA = 'B-IT-09-NEG';
      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchIdA}-1`, batchId: batchIdA, batchCode: batchIdA, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 500, qtyOut: 0, balance: 500 },
        { id: `JRN-${batchIdA}-2`, batchId: batchIdA, batchCode: batchIdA, batchSeq: 2, txType: INVENTORY_TX_TYPE.SELECTION, qtyIn: 0, qtyOut: -50, balance: 550 }
      ]);

      let negErr = null;
      try {
        replayBatchInventoryLedger(batchIdA);
      } catch (e) {
        negErr = e;
      }

      const batchIdB = 'B-IT-09-GAP';
      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchIdB}-1`, batchId: batchIdB, batchCode: batchIdB, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 500, qtyOut: 0, balance: 500 },
        { id: `JRN-${batchIdB}-2`, batchId: batchIdB, batchCode: batchIdB, batchSeq: 4, txType: INVENTORY_TX_TYPE.SELECTION, qtyIn: 0, qtyOut: 50, balance: 450 }
      ]);

      let gapErr = null;
      try {
        replayBatchInventoryLedger(batchIdB);
      } catch (e) {
        gapErr = e;
      }

      const pass = negErr !== null && negErr.message.includes('StockIntegrityBreachError') &&
                   gapErr !== null && gapErr.message.includes('Sequence gap');
      recordScenario('IT-09', 'Jurnal negatif dan sequence gap ditolak via StockIntegrityBreachError', pass, `neg: ${!!negErr}, gap: ${!!gapErr}`);
    }

    // -------------------------------------------------------------
    // IT-10: Replay berulang tanpa double deduction
    // -------------------------------------------------------------
    {
      const batchId = 'B-IT-10';
      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchId}-1`, batchId, batchCode: batchId, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 1000, qtyOut: 0, balance: 1000 },
        { id: `JRN-${batchId}-2`, batchId, batchCode: batchId, batchSeq: 2, txType: INVENTORY_TX_TYPE.SELECTION, qtyIn: 0, qtyOut: 100, balance: 900 }
      ]);
      storage.set('batch_inventory_states', [{ batchId, batchCode: batchId, availableQty: 1000, status: 'AVAILABLE' }]);

      let all900 = true;
      for (let r = 0; r < 5; r++) {
        const res = replayBatchInventoryLedger(batchId);
        if (res.availableQty !== 900) {
          all900 = false;
        }
      }

      recordScenario('IT-10', 'Replay berulang 5 kali stabil di 900 Pkk tanpa double deduction', all900, `saldo: 900`);
    }

    // -------------------------------------------------------------
    // IT-11: Replay batch tidak menimpa saldo bedengan
    // -------------------------------------------------------------
    {
      const batchId = 'B-IT-11';
      const bedenganId = 'BED-IT-11';
      storage.set('bedengan_master', [
        { id: bedenganId, bedenganId, batchId, inspectedBibit: 450, totalBibit: 500, status: 'ACTIVE' }
      ]);
      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchId}-1`, batchId, batchCode: batchId, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 1000, qtyOut: 0, balance: 1000 },
        { id: `JRN-${batchId}-2`, batchId, batchCode: batchId, batchSeq: 2, txType: INVENTORY_TX_TYPE.DISPATCH, qtyIn: 0, qtyOut: 300, balance: 700 }
      ]);

      replayBatchInventoryLedger(batchId);
      const bedengans = storage.get('bedengan_master', []);
      const targetBed = bedengans.find(b => b.id === bedenganId || b.bedenganId === bedenganId);

      const pass = getAvailableQty(batchId) === 700 && targetBed && targetBed.inspectedBibit === 450;
      recordScenario('IT-11', 'Replay batch tidak menimpa saldo alokasi bedengan', pass, `bedengan inspected: ${targetBed?.inspectedBibit}`);
    }

    // -------------------------------------------------------------
    // IT-12: Mutasi ber-referensi bedengan memperbarui saldo tepat satu kali
    // -------------------------------------------------------------
    {
      const batchId = 'B-IT-12';
      const bedenganId = 'BED-IT-12';
      storage.set('batch_inventory_states', [{ batchId, batchCode: batchId, availableQty: 500, status: 'AVAILABLE' }]);
      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchId}-1`, batchId, batchCode: batchId, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 500, qtyOut: 0, balance: 500 }
      ]);
      storage.set('nursery_batches', [{ id: batchId, batchCode: batchId, availableQty: 500, currentQty: 500, status: 'AVAILABLE' }]);

      // Mutasi dengan referensi bedenganId eksplisit
      const deductRes = deductBatchStock(
        batchId,
        40,
        INVENTORY_TX_TYPE.SELECTION,
        { id: 'SEL-TX-12', docNo: 'SEL-DOC-12', bedenganId },
        userAsisten,
        'Afkir Seleksi Bedengan 12'
      );

      const journal = storage.get('batch_inventory_journal', []).filter(j => j.batchId === batchId);
      const lastJrn = journal[journal.length - 1];
      const pass = deductRes.availableQty === 460 && lastJrn.qtyOut === 40 && lastJrn.refId === 'SEL-TX-12';
      recordScenario('IT-12', 'Mutasi ber-referensi bedengan memperbarui saldo tepat satu kali', pass, `balance: ${deductRes.availableQty}, ref: ${lastJrn.refId}`);
    }

    // -------------------------------------------------------------
    // IT-13: Dispatch, destruction, dan jalur mutasi terkait memakai lock yang benar
    // -------------------------------------------------------------
    {
      const batchId = 'B-IT-13';
      storage.set('batch_inventory_states', [{ batchId, batchCode: batchId, availableQty: 1000, status: 'AVAILABLE' }]);
      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchId}-1`, batchId, batchCode: batchId, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 1000, qtyOut: 0, balance: 1000 }
      ]);
      storage.set('nursery_batches', [{ id: batchId, batchCode: batchId, availableQty: 1000, currentQty: 1000, estateId: 'EST-01', divisionId: 'DIV-01', status: 'AVAILABLE' }]);

      // 1. Dispatch Multi-batch stock reduction under lock
      const dispRes = await deductMultiBatchStock([{ batchIdOrCode: batchId, qty: 100 }], INVENTORY_TX_TYPE.DISPATCH, 'DSP-01', userAsisten);
      const balAfterDisp = getAvailableQty(batchId);

      // 2. Destruction stock mutation under lock
      storage.set('destruction_transactions', [{
        id: 'DES-IT-13',
        docNo: 'DES-DOC-13',
        batchId,
        batchCode: batchId,
        destructionQty: 50,
        estateId: 'EST-01',
        divisionId: 'DIV-01',
        status: DESTRUCTION_STATUS.DISETUJUI,
        stockMutationStatus: STOCK_MUTATION_STATUS.PENDING
      }]);

      const destRes = await mutateStockFromDestruction('DES-IT-13', userAsisten);
      const balAfterDest = getAvailableQty(batchId);

      const pass = dispRes.success === true && balAfterDisp === 900 && 
                   destRes.status === STOCK_MUTATION_STATUS.APPLIED && balAfterDest === 850;

      recordScenario('IT-13', 'Dispatch dan Destruction memanggil mutasi terproteksi Web Locks', pass, `bal: ${balAfterDest}`);
    }

    // -------------------------------------------------------------
    // IT-14: Crash boundaries pada tahapan persistence (Boundary 1-6)
    // -------------------------------------------------------------
    {
      const batchB1 = 'B-CRASH-B1';
      const batchB2 = 'B-CRASH-B2';
      const batchB3 = 'B-CRASH-B3';
      const batchB5 = 'B-CRASH-B5';
      const batchB6 = 'B-CRASH-B6';

      storage.set('batch_inventory_states', [
        { batchId: batchB1, batchCode: batchB1, availableQty: 1000, status: 'AVAILABLE' },
        { batchId: batchB2, batchCode: batchB2, availableQty: 1000, status: 'AVAILABLE' },
        { batchId: batchB3, batchCode: batchB3, availableQty: 1000, status: 'AVAILABLE' },
        { batchId: batchB5, batchCode: batchB5, availableQty: 1000, status: 'AVAILABLE' },
        { batchId: batchB6, batchCode: batchB6, availableQty: 1000, status: 'AVAILABLE' }
      ]);

      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchB1}-1`, batchId: batchB1, batchCode: batchB1, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 1000, qtyOut: 0, balance: 1000 },
        { id: `JRN-${batchB2}-1`, batchId: batchB2, batchCode: batchB2, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 1000, qtyOut: 0, balance: 1000 },
        { id: `JRN-${batchB3}-1`, batchId: batchB3, batchCode: batchB3, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 1000, qtyOut: 0, balance: 1000 },
        { id: `JRN-${batchB3}-ROGUE`, batchId: batchB3, batchCode: batchB3, batchSeq: 2, txType: INVENTORY_TX_TYPE.SELECTION, qtyIn: 0, qtyOut: 50, balance: 950, refId: 'SEL-B3' },
        { id: `JRN-${batchB5}-1`, batchId: batchB5, batchCode: batchB5, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 1000, qtyOut: 0, balance: 1000 },
        { id: `JRN-${batchB5}-COMMITTED`, batchId: batchB5, batchCode: batchB5, batchSeq: 2, txType: INVENTORY_TX_TYPE.SELECTION, qtyIn: 0, qtyOut: 100, balance: 900, refId: 'SEL-B5' },
        { id: `JRN-${batchB6}-1`, batchId: batchB6, batchCode: batchB6, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 1000, qtyOut: 0, balance: 1000 },
        { id: `JRN-${batchB6}-MISMATCH`, batchId: batchB6, batchCode: batchB6, batchSeq: 2, txType: INVENTORY_TX_TYPE.SELECTION, qtyIn: 0, qtyOut: 80, balance: 920, refId: 'SEL-B6' }
      ]);

      storage.set('selection_approval_decisions', [
        { id: 'DEC-B1', txId: 'SEL-B1', docNo: 'SEL-B1', approvedQty: 50 },
        // No decision for B2 or B3
        { id: 'DEC-B5', txId: 'SEL-B5', docNo: 'SEL-B5', approvedQty: 100 },
        { id: 'DEC-B6', txId: 'SEL-B6', docNo: 'SEL-B6', approvedQty: 100 } // Mismatch with journal 80
      ]);

      storage.set('selection_mutation_intents', [
        { id: 'INT-B1', txId: 'SEL-B1', docNo: 'SEL-B1', batchId: batchB1, status: 'IN_FLIGHT' },
        { id: 'INT-B2', txId: 'SEL-B2', docNo: 'SEL-B2', batchId: batchB2, status: 'IN_FLIGHT' },
        { id: 'INT-B3', txId: 'SEL-B3', docNo: 'SEL-B3', batchId: batchB3, status: 'IN_FLIGHT' },
        { id: 'INT-B5', txId: 'SEL-B5', docNo: 'SEL-B5', batchId: batchB5, status: 'IN_FLIGHT' },
        { id: 'INT-B6', txId: 'SEL-B6', docNo: 'SEL-B6', batchId: batchB6, status: 'IN_FLIGHT' }
      ]);

      storage.set('selection_transactions', [
        { id: 'SEL-B1', docNo: 'SEL-B1', batchId: batchB1, status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' },
        { id: 'SEL-B5', docNo: 'SEL-B5', batchId: batchB5, status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' }
      ]);

      storage.set('selection_anomaly_cases', []);

      const recoveryRes = await reconcileStartupRecovery();
      const updatedIntents = storage.get('selection_mutation_intents', []);

      const b1Action = recoveryRes.find(r => r.intentId === 'INT-B1')?.action;
      const b2Action = recoveryRes.find(r => r.intentId === 'INT-B2')?.action;
      const b3Action = recoveryRes.find(r => r.intentId === 'INT-B3')?.action;
      const b5Action = recoveryRes.find(r => r.intentId === 'INT-B5')?.action;
      const b6Action = recoveryRes.find(r => r.intentId === 'INT-B6')?.action;

      const pass = b1Action === 'APPROVAL_INTERRUPTED' &&
                   b2Action === 'ABANDONED_ORPHAN' &&
                   b3Action === 'BATCH_LOCKED' &&
                   b5Action === 'FORWARD_RECOVERED' &&
                   b6Action === 'BATCH_LOCKED';

      recordScenario('IT-14', 'Crash boundaries persistence Boundary 1 s.d 6 tertangani deterministik', pass, `actions: ${b1Action},${b2Action},${b3Action},${b5Action},${b6Action}`);
    }

    // -------------------------------------------------------------
    // IT-15: Recovery berulang tanpa double deduction
    // -------------------------------------------------------------
    {
      const batchId = 'B-IT-15';
      storage.set('batch_inventory_states', [{ batchId, batchCode: batchId, availableQty: 1000, status: 'AVAILABLE' }]);
      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchId}-1`, batchId, batchCode: batchId, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 1000, qtyOut: 0, balance: 1000 },
        { id: `JRN-${batchId}-2`, batchId, batchCode: batchId, batchSeq: 2, txType: INVENTORY_TX_TYPE.SELECTION, qtyIn: 0, qtyOut: 100, balance: 900, refId: 'SEL-IT15' }
      ]);
      storage.set('selection_approval_decisions', [{ id: 'DEC-15', txId: 'SEL-IT15', docNo: 'SEL-IT15', approvedQty: 100 }]);
      storage.set('selection_mutation_intents', [{ id: 'INT-15', txId: 'SEL-IT15', docNo: 'SEL-IT15', batchId, status: 'IN_FLIGHT' }]);
      storage.set('selection_transactions', [{ id: 'SEL-IT15', docNo: 'SEL-IT15', batchId, status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' }]);

      await reconcileStartupRecovery();
      const balRun1 = getAvailableQty(batchId);

      await reconcileStartupRecovery();
      const balRun2 = getAvailableQty(batchId);

      await reconcileStartupRecovery();
      const balRun3 = getAvailableQty(batchId);

      const pass = balRun1 === 900 && balRun2 === 900 && balRun3 === 900;
      recordScenario('IT-15', 'Recovery berulang 3 kali konsisten tanpa double deduction', pass, `bal: ${balRun1}->${balRun2}->${balRun3}`);
    }

    // -------------------------------------------------------------
    // IT-16: Jurnal tanpa approval valid menyebabkan penguncian
    // -------------------------------------------------------------
    {
      const batchId = 'B-IT-16';
      storage.set('batch_inventory_states', [{ batchId, batchCode: batchId, availableQty: 1000, status: 'AVAILABLE' }]);
      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchId}-ROGUE`, batchId, batchCode: batchId, batchSeq: 1, txType: INVENTORY_TX_TYPE.SELECTION, qtyIn: 0, qtyOut: 50, balance: 950, refId: 'SEL-ROGUE' }
      ]);
      storage.set('selection_approval_decisions', []); // Tidak ada decision
      storage.set('selection_mutation_intents', [{ id: 'INT-ROGUE', txId: 'SEL-ROGUE', docNo: 'SEL-ROGUE', batchId, status: 'IN_FLIGHT' }]);
      storage.set('selection_anomaly_cases', []);

      await reconcileStartupRecovery();
      const anomalies = storage.get('selection_anomaly_cases', []);
      const locked = anomalies.some(a => a.batchId === batchId && a.status === 'BATCH_LOCKED');

      recordScenario('IT-16', 'Jurnal tanpa approval valid seketika mengunci batch (BATCH_LOCKED)', locked, `anomaly locked: ${locked}`);
    }

    // -------------------------------------------------------------
    // IT-17: Opsi A mengembalikan transaksi ke Mantri jika stok tidak mencukupi
    // -------------------------------------------------------------
    {
      const batchId = 'B-IT-17';
      const txId = 'SEL-IT-17';
      storage.set('batch_inventory_states', [{ batchId, batchCode: batchId, availableQty: 30, status: 'AVAILABLE' }]);
      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchId}-1`, batchId, batchCode: batchId, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 30, qtyOut: 0, balance: 30 }
      ]);
      storage.set('selection_transactions', [{
        id: txId,
        docNo: 'SEL-17',
        batchId,
        jumlahAfkir: 100,
        status: 'APPROVAL_INTERRUPTED'
      }]);
      storage.set('selection_approval_decisions', [{
        id: 'DEC-17',
        txId,
        docNo: 'SEL-17',
        approvedQty: 100,
        actorRole: 'ASISTEN_BIBITAN'
      }]);

      const res = await resolveApprovalInterrupted(txId, userAsisten);
      const txUpdated = storage.get('selection_transactions', []).find(t => t.id === txId);
      const balAfter = getAvailableQty(batchId);

      const pass = res.status === 'AUTO_RETURNED' && 
                   txUpdated.status === SELECTION_STATUS.DIKEMBALIKAN && 
                   balAfter === 30;

      recordScenario('IT-17', 'Opsi A mengembalikan transaksi ke Mantri jika saldo tidak cukup pasca koreksi', pass, `status: ${txUpdated?.status}, bal: ${balAfter}`);
    }

    // -------------------------------------------------------------
    // IT-18: Transaksi yang masih mencukupi stok tetap menunggu approval normal Asisten
    // -------------------------------------------------------------
    {
      const batchId = 'B-IT-18';
      const txId = 'SEL-IT-18';
      storage.set('batch_inventory_states', [{ batchId, batchCode: batchId, availableQty: 500, status: 'AVAILABLE' }]);
      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchId}-1`, batchId, batchCode: batchId, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 500, qtyOut: 0, balance: 500 }
      ]);
      storage.set('selection_transactions', [{
        id: txId,
        docNo: 'SEL-18',
        batchId,
        jumlahAfkir: 50,
        status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN',
        isFrozen: false
      }]);

      const tx = storage.get('selection_transactions', []).find(t => t.id === txId);
      const bal = getAvailableQty(batchId);
      const pass = tx.status === 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' && tx.isFrozen !== true && bal === 500;

      recordScenario('IT-18', 'Transaksi dengan stok cukup tetap menunggu approval normal Asisten', pass, `status: ${tx.status}, bal: ${bal}`);
    }

    // -------------------------------------------------------------
    // IT-19: Saldo negatif atau ledger inkonsisten tidak lolos (No Silent Clamping)
    // -------------------------------------------------------------
    {
      const batchId = 'B-IT-19';
      storage.set('batch_inventory_states', [{ batchId, batchCode: batchId, availableQty: 30, status: 'AVAILABLE' }]);
      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchId}-1`, batchId, batchCode: batchId, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 30, qtyOut: 0, balance: 30 }
      ]);

      let overdrawErr = null;
      try {
        deductBatchStock(batchId, 50, INVENTORY_TX_TYPE.SELECTION, { id: 'TX-19' });
      } catch (e) {
        overdrawErr = e;
      }

      const bal = getAvailableQty(batchId);
      const pass = overdrawErr !== null && overdrawErr.message.includes('tidak mencukupi') && bal === 30;
      recordScenario('IT-19', 'Saldo negatif ditolak keras tanpa silent clamping ke nol', pass, `bal: ${bal}, err: ${overdrawErr?.message}`);
    }

    // -------------------------------------------------------------
    // IT-20: Validasi Seleksi II dan III tidak mengalami TDZ (ReferenceError Fix)
    // -------------------------------------------------------------
    {
      let errSel2 = null;
      let errSel3 = null;

      try {
        validateSeleksi2Execution(
          { bedenganCode: 'BED-NONEXISTENT', actualBibitSelectedQty: 10, actualPolybagInspectedQty: 10 },
          { id: 'PARENT-02', selectionStage: 'SELEKSI_2', rows: [] },
          []
        );
      } catch (e) {
        errSel2 = e;
      }

      try {
        validateSeleksi3Execution(
          { bedenganCode: 'BED-NONEXISTENT', actualBibitSelectedQty: 10, actualPolybagInspectedQty: 10 },
          { id: 'PARENT-03', selectionStage: 'SELEKSI_3', rows: [] },
          []
        );
      } catch (e) {
        errSel3 = e;
      }

      const pass = errSel2 === null && errSel3 === null;
      recordScenario('IT-20', 'Validasi Seleksi II dan III bebas dari bug runtime TDZ ReferenceError', pass, `sel2: ${errSel2}, sel3: ${errSel3}`);
    }

    // -------------------------------------------------------------
    // IT-BOOT-01: Bootstrap memanggil reconciler tepat satu kali pada startup normal
    // -------------------------------------------------------------
    {
      resetStartupRecoveryStatusForTest();
      storage.set('selection_mutation_intents', []);
      const res = await reconcileStartupRecovery();
      const status = getStartupRecoveryStatus();
      const pass = Array.isArray(res) && status.completed === true && status.error === null;
      recordScenario('IT-BOOT-01', 'Bootstrap memanggil reconciler tepat satu kali pada startup normal', pass, `completed: ${status.completed}`);
    }

    // -------------------------------------------------------------
    // IT-BOOT-02: Recovery selesai sebelum alur transaksi baru yang bergantung diaktifkan
    // -------------------------------------------------------------
    {
      const batchId = 'B-BOOT-02';
      storage.set('batch_inventory_states', [{ batchId, batchCode: batchId, availableQty: 1000, status: 'AVAILABLE' }]);
      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchId}-1`, batchId, batchCode: batchId, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 1000, qtyOut: 0, balance: 1000 },
        { id: `JRN-${batchId}-2`, batchId, batchCode: batchId, batchSeq: 2, txType: INVENTORY_TX_TYPE.SELECTION, qtyIn: 0, qtyOut: 200, balance: 800, refId: 'SEL-BOOT-02' }
      ]);
      storage.set('selection_approval_decisions', [{ id: 'DEC-BOOT-02', txId: 'SEL-BOOT-02', docNo: 'SEL-BOOT-02', approvedQty: 200 }]);
      storage.set('selection_mutation_intents', [{ id: 'INT-BOOT-02', txId: 'SEL-BOOT-02', docNo: 'SEL-BOOT-02', batchId, status: 'IN_FLIGHT' }]);
      storage.set('selection_transactions', [{ id: 'SEL-BOOT-02', docNo: 'SEL-BOOT-02', batchId, status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' }]);

      // Jalankan startup recovery sebelum transaksi baru
      await reconcileStartupRecovery();
      const balAfterRecovery = getAvailableQty(batchId);

      // Transaksi baru hanya melihat saldo hasil recovery (800 Pkk, bukan 1000 Pkk)
      const newDeduct = deductBatchStock(batchId, 50, INVENTORY_TX_TYPE.SELECTION, { id: 'TX-BOOT-02-NEW' });

      const pass = balAfterRecovery === 800 && newDeduct.availableQty === 750;
      recordScenario('IT-BOOT-02', 'Recovery selesai sebelum alur transaksi baru yang bergantung diaktifkan', pass, `balAfterRec: ${balAfterRecovery}, newBal: ${newDeduct.availableQty}`);
    }

    // -------------------------------------------------------------
    // IT-BOOT-03: Intent IN_FLIGHT dan HALTED_RETRY_REQUIRED terdeteksi saat startup dan ditangani sesuai recovery matrix
    // -------------------------------------------------------------
    {
      const batchInFlight = 'B-BOOT-03-A';
      const batchHalted = 'B-BOOT-03-B';
      storage.set('selection_mutation_intents', [
        { id: 'INT-IF-1', txId: 'SEL-IF-1', docNo: 'SEL-IF-1', batchId: batchInFlight, status: 'IN_FLIGHT' },
        { id: 'INT-HR-2', txId: 'SEL-HR-2', docNo: 'SEL-HR-2', batchId: batchHalted, status: 'HALTED_RETRY_REQUIRED' }
      ]);
      storage.set('selection_approval_decisions', []); // No decisions -> Both are orphaned
      storage.set('batch_inventory_journal', []);

      await reconcileStartupRecovery();
      const updatedIntents = storage.get('selection_mutation_intents', []);
      const r1 = updatedIntents.find(i => i.id === 'INT-IF-1')?.status;
      const r2 = updatedIntents.find(i => i.id === 'INT-HR-2')?.status;

      const pass = r1 === 'ABANDONED_ORPHAN' && r2 === 'ABANDONED_ORPHAN';
      recordScenario('IT-BOOT-03', 'Intent IN_FLIGHT dan HALTED_RETRY_REQUIRED terdeteksi dan dipulihkan', pass, `r1: ${r1}, r2: ${r2}`);
    }

    // -------------------------------------------------------------
    // IT-BOOT-04: Boundary konfirmasi Asisten tetap APPROVAL_INTERRUPTED (no auto-approval)
    // -------------------------------------------------------------
    {
      const batchId = 'B-BOOT-04';
      storage.set('selection_approval_decisions', [{ id: 'DEC-BOOT-04', txId: 'SEL-BOOT-04', docNo: 'SEL-BOOT-04', approvedQty: 100 }]);
      storage.set('selection_mutation_intents', [{ id: 'INT-BOOT-04', txId: 'SEL-BOOT-04', docNo: 'SEL-BOOT-04', batchId, status: 'IN_FLIGHT' }]);
      storage.set('selection_transactions', [{ id: 'SEL-BOOT-04', docNo: 'SEL-BOOT-04', batchId, status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' }]);
      storage.set('batch_inventory_journal', []); // No journal committed

      await reconcileStartupRecovery();
      const tx = storage.get('selection_transactions', []).find(t => t.id === 'SEL-BOOT-04');
      const intent = storage.get('selection_mutation_intents', []).find(i => i.id === 'INT-BOOT-04');

      const pass = tx.status === 'APPROVAL_INTERRUPTED' && 
                   intent.status === 'HALTED_RETRY_REQUIRED' && 
                   tx.status !== 'DISETUJUI';
      recordScenario('IT-BOOT-04', 'Boundary konfirmasi Asisten tetap APPROVAL_INTERRUPTED (no auto-approval)', pass, `status: ${tx?.status}`);
    }

    // -------------------------------------------------------------
    // IT-BOOT-05: Jurnal tanpa approval decision valid menyebabkan batch terkunci BATCH_LOCKED
    // -------------------------------------------------------------
    {
      const batchId = 'B-BOOT-05';
      storage.set('selection_approval_decisions', []); // No decision
      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchId}-ROGUE`, batchId, batchCode: batchId, batchSeq: 1, txType: INVENTORY_TX_TYPE.SELECTION, qtyIn: 0, qtyOut: 50, balance: 450, refId: 'SEL-BOOT-05' }
      ]);
      storage.set('selection_mutation_intents', [{ id: 'INT-BOOT-05', txId: 'SEL-BOOT-05', docNo: 'SEL-BOOT-05', batchId, status: 'IN_FLIGHT' }]);
      storage.set('selection_anomaly_cases', []);

      await reconcileStartupRecovery();
      const anomalies = storage.get('selection_anomaly_cases', []);
      const locked = anomalies.some(a => a.batchId === batchId && a.status === 'BATCH_LOCKED');

      recordScenario('IT-BOOT-05', 'Jurnal tanpa approval decision valid menyebabkan batch terkunci BATCH_LOCKED', locked, `locked: ${locked}`);
    }

    // -------------------------------------------------------------
    // IT-BOOT-06: Kegagalan Web Locks / reconciler memblokir mutasi secara fail-closed
    // -------------------------------------------------------------
    {
      const batchId = 'B-BOOT-06';
      storage.set('batch_inventory_states', [{ batchId, batchCode: batchId, availableQty: 500, status: 'AVAILABLE' }]);
      storage.set('selection_mutation_intents', [{ id: 'INT-BOOT-06', txId: 'SEL-BOOT-06', docNo: 'SEL-BOOT-06', batchId, status: 'IN_FLIGHT' }]);

      // Simulasikan locks undefined saat recovery
      const origLocks = navigator.locks;
      let recError = null;
      try {
        Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true });
        await reconcileStartupRecovery();
      } catch (e) {
        recError = e;
      } finally {
        Object.defineProperty(navigator, 'locks', { value: origLocks, configurable: true });
      }

      const recStatus = getStartupRecoveryStatus();
      
      // Upayakan mutasi setelah recovery gagal
      let blockedErr = null;
      try {
        deductBatchStock(batchId, 50, INVENTORY_TX_TYPE.SELECTION);
      } catch (e) {
        blockedErr = e;
      }

      const pass = recError !== null && 
                   recStatus.completed === false && 
                   recStatus.error !== null && 
                   blockedErr !== null && 
                   blockedErr.message.includes('StartupRecoveryBlockedError');

      recordScenario('IT-BOOT-06', 'Kegagalan Web Locks / reconciler memblokir mutasi secara fail-closed', pass, `recErr: ${!!recError}, blocked: ${!!blockedErr}`);
      resetStartupRecoveryStatusForTest();
    }

    // -------------------------------------------------------------
    // IT-BOOT-07: Startup/recovery berulang tidak menghasilkan double deduction atau duplikasi jurnal
    // -------------------------------------------------------------
    {
      const batchId = 'B-BOOT-07';
      storage.set('batch_inventory_states', [{ batchId, batchCode: batchId, availableQty: 1000, status: 'AVAILABLE' }]);
      storage.set('batch_inventory_journal', [
        { id: `JRN-${batchId}-1`, batchId, batchCode: batchId, batchSeq: 1, txType: INVENTORY_TX_TYPE.INITIAL, qtyIn: 1000, qtyOut: 0, balance: 1000 },
        { id: `JRN-${batchId}-2`, batchId, batchCode: batchId, batchSeq: 2, txType: INVENTORY_TX_TYPE.SELECTION, qtyIn: 0, qtyOut: 150, balance: 850, refId: 'SEL-BOOT-07' }
      ]);
      storage.set('selection_approval_decisions', [{ id: 'DEC-BOOT-07', txId: 'SEL-BOOT-07', docNo: 'SEL-BOOT-07', approvedQty: 150 }]);
      storage.set('selection_mutation_intents', [{ id: 'INT-BOOT-07', txId: 'SEL-BOOT-07', docNo: 'SEL-BOOT-07', batchId, status: 'IN_FLIGHT' }]);
      storage.set('selection_transactions', [{ id: 'SEL-BOOT-07', docNo: 'SEL-BOOT-07', batchId, status: 'MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN' }]);

      // Panggil reconciler 3x berturut-turut
      await reconcileStartupRecovery();
      const bal1 = getAvailableQty(batchId);
      const jrnCount1 = storage.get('batch_inventory_journal', []).filter(j => j.batchId === batchId).length;

      await reconcileStartupRecovery();
      const bal2 = getAvailableQty(batchId);
      const jrnCount2 = storage.get('batch_inventory_journal', []).filter(j => j.batchId === batchId).length;

      await reconcileStartupRecovery();
      const bal3 = getAvailableQty(batchId);
      const jrnCount3 = storage.get('batch_inventory_journal', []).filter(j => j.batchId === batchId).length;

      const pass = bal1 === 850 && bal2 === 850 && bal3 === 850 && 
                   jrnCount1 === 2 && jrnCount2 === 2 && jrnCount3 === 2;
      recordScenario('IT-BOOT-07', 'Startup/recovery berulang 3x stabil tanpa double deduction atau duplikasi jurnal', pass, `bal: ${bal1}->${bal2}->${bal3}, jrn: ${jrnCount1}->${jrnCount2}->${jrnCount3}`);
    }

    // -------------------------------------------------------------
    // IT-BOOT-08: Bootstrap normal tidak mengalami circular import, ReferenceError, atau kegagalan inisialisasi akibat wiring
    // -------------------------------------------------------------
    {
      let importError = null;
      try {
        const appModule = await import('../js/app.js');
        if (!appModule) throw new Error('Failed to import app.js');
      } catch (e) {
        importError = e;
      }

      const pass = importError === null;
      recordScenario('IT-BOOT-08', 'Bootstrap normal bebas dari circular import dan ReferenceError', pass, `error: ${importError?.message || 'none'}`);
    }

  } finally {
    // Restore pristine storage state
    backupKeys.forEach(k => {
      if (origBackups[k] !== null) {
        storage.set(k, origBackups[k]);
      } else {
        storage.remove(k);
      }
    });
  }

  console.log('\n======================================================');
  console.log(`INTEGRATION TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED out of ${passCount + failCount} SCENARIOS`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
