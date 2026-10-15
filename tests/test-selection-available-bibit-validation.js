if (typeof globalThis.localStorage === 'undefined') {
  const values = new Map();
  globalThis.localStorage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key),
    clear: () => values.clear()
  };
}

import assert from 'node:assert/strict';
import {
  getBedenganScopeStatusForSeleksi1,
  getBedenganScopeStatusForSeleksi2,
  getBedenganScopeStatusForSeleksi3,
  validateSeleksi1Execution,
  validateSeleksi2Execution,
  validateSeleksi3Execution
} from '../js/modules/selection/selection-manager.js';

const priorTx = {
  id: 'TX-SEL-PRIOR',
  batchCode: 'BATCH-01',
  bedenganCode: 'BED-001',
  actualPolybagInspectedQty: 3000,
  actualBibitSelectedQty: 250
};

const makeDoc = (stage) => ({
  id: `DOC-${stage}`,
  docNo: `DOC-${stage}`,
  batchCode: 'BATCH-01',
  selectionStage: stage,
  sourcePolybagQty: 6000,
  sourceBibitQty: 12000,
  rows: [{
    bedenganId: 'BED-001',
    bedenganCode: 'BED-001',
    polybag: 6000,
    disemai: 12000,
    sourceBibitQty: 12000
  }]
});

const cases = [
  {
    label: 'Seleksi I',
    stage: 'SELEKSI_1',
    getScope: getBedenganScopeStatusForSeleksi1,
    validate: validateSeleksi1Execution
  },
  {
    label: 'Seleksi II',
    stage: 'SELEKSI_II',
    getScope: getBedenganScopeStatusForSeleksi2,
    validate: validateSeleksi2Execution
  },
  {
    label: 'Seleksi III',
    stage: 'SELEKSI_III',
    getScope: getBedenganScopeStatusForSeleksi3,
    validate: validateSeleksi3Execution
  }
];

for (const { label, stage, getScope, validate } of cases) {
  const doc = makeDoc(stage);
  const firstTransaction = validate({
    bedenganCode: 'BED-001',
    actualPolybagInspectedQty: 1,
    actualBibitSelectedQty: 12000
  }, doc, []);
  assert.equal(firstTransaction.isValid, true, `${label}: transaksi pertama dapat menyeleksi sampai Jumlah Bibit 12.000`);

  const scope = getScope(doc, [priorTx])[0];
  assert.equal(scope.inspectedPolybag, 3000, `${label}: progres polybag tetap dihitung`);
  assert.equal(scope.inspectedBibit, 6000, `${label}: metrik historis inspectedBibit tetap terpisah`);
  assert.equal(scope.rejectedBibit, 250, `${label}: jumlah bibit diseleksi aktual adalah 250`);
  assert.equal(scope.availableBibit, 11750, `${label}: Bibit Tersedia = 12.000 - 250`);
  assert.equal(scope.remainingBibit, 11750, `${label}: sisa bibit tidak diturunkan dari progres polybag`);

  const payload = {
    bedenganCode: 'BED-001',
    actualPolybagInspectedQty: 1,
    actualBibitSelectedQty: 11750
  };
  const atLimit = validate(payload, doc, [priorTx]);
  assert.equal(atLimit.isValid, true, `${label}: input tepat sebesar Bibit Tersedia diterima`);
  assert.equal(atLimit.parsed.actualBibitRetainedQty, 0, `${label}: saldo akhir pada batas menjadi nol`);

  const overLimit = validate({ ...payload, actualBibitSelectedQty: 11751 }, doc, [priorTx]);
  assert.equal(overLimit.isValid, false, `${label}: input satu lebih besar dari Bibit Tersedia ditolak`);
  assert.ok(
    overLimit.errors.some(error => error.includes('Bibit Tersedia (11750)')),
    `${label}: pesan validasi menyebut saldo aktual 11.750`
  );
}

console.log('PASS: Validasi Seleksi I/II/III menggunakan Bibit Tersedia aktual, terpisah dari progres polybag.');
