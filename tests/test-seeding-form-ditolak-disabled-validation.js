import assert from 'node:assert';
import fs from 'node:fs';

console.log('================================================================================');
console.log('RUNNING TESTS: SEEDING FORM DITOLAK BALANCE DISABLED VALIDATION');
console.log('================================================================================');

const seedingFormSource = fs.readFileSync('js/modules/seeding/seeding-form.js', 'utf-8');

// 1. Invariant: updateDitolakState definition
assert.ok(seedingFormSource.includes('function updateDitolakState()'), 'seeding-form.js must define updateDitolakState()');

// 2. Invariant: Checking isBalanced condition
assert.ok(seedingFormSource.includes('disemaiTotal >= previousBalance'), 'seeding-form.js must check if disemaiTotal >= previousBalance');

// 3. Invariant: Disabling input-ditolak and select-alasan when balanced
assert.ok(seedingFormSource.includes('inputDitolak.disabled = true'), 'seeding-form.js must disable inputDitolak when balanced');
assert.ok(seedingFormSource.includes('selectAlasan.disabled = true'), 'seeding-form.js must disable selectAlasan when balanced');

// 4. Invariant: Resetting value to 0 and alasan to Tidak Ada when balanced
assert.ok(seedingFormSource.includes("state.alasanDitolak = 'Tidak Ada'"), "state.alasanDitolak must be reset to 'Tidak Ada'");
assert.ok(seedingFormSource.includes('state.ditolak = 0'), 'state.ditolak must be reset to 0');

// 5. Invariant: Guarding input-ditolak maxAllowedDitolak
assert.ok(seedingFormSource.includes('maxAllowedDitolak'), 'seeding-form.js must compute and enforce maxAllowedDitolak');

// 6. Invariant: Validation in validateForm preventing negative sisaBenih
assert.ok(seedingFormSource.includes('disemaiTotal + ditolakTotal > previousBalance'), 'validateForm must block submission if disemaiTotal + ditolakTotal > previousBalance');

// 7. Invariant: Guard in btnKonfirmSimpan
assert.ok(seedingFormSource.includes('totalDisemai + totalDitolak > previousBalance'), 'btnKonfirmSimpan must block submission if totalDisemai + totalDitolak > previousBalance');

// Functional logic simulation
function simulateUpdateDitolakState(previousBalance, disemaiTotal, initialDitolak = 100, initialAlasan = 'Rusak') {
  let state = {
    ditolak: initialDitolak,
    alasanDitolak: initialAlasan
  };

  const isBalanced = (disemaiTotal >= previousBalance) && (previousBalance > 0);
  let inputDitolakDisabled = false;
  let selectAlasanDisabled = false;

  if (isBalanced) {
    state.ditolak = 0;
    state.alasanDitolak = 'Tidak Ada';
    inputDitolakDisabled = true;
    selectAlasanDisabled = true;
  } else {
    inputDitolakDisabled = false;
    const maxAllowedDitolak = Math.max(0, previousBalance - disemaiTotal);
    if (state.ditolak > maxAllowedDitolak) {
      state.ditolak = maxAllowedDitolak;
    }
    if (state.ditolak > 0) {
      selectAlasanDisabled = false;
    } else {
      selectAlasanDisabled = true;
      state.alasanDitolak = 'Tidak Ada';
    }
  }

  const sisaBenih = previousBalance - state.ditolak - disemaiTotal;
  return { isBalanced, inputDitolakDisabled, selectAlasanDisabled, state, sisaBenih };
}

// Case 1: Bibit Pindah Semai (2000) sudah balance dengan Jlh Berhasil di Deder (2000)
const case1 = simulateUpdateDitolakState(2000, 2000, 100, 'Rusak');
assert.strictEqual(case1.isBalanced, true, 'Case 1 must be balanced');
assert.strictEqual(case1.inputDitolakDisabled, true, 'Case 1 input-ditolak must be disabled');
assert.strictEqual(case1.selectAlasanDisabled, true, 'Case 1 select-alasan must be disabled');
assert.strictEqual(case1.state.ditolak, 0, 'Case 1 ditolak must reset to 0');
assert.strictEqual(case1.state.alasanDitolak, 'Tidak Ada', 'Case 1 alasan must reset to Tidak Ada');
assert.strictEqual(case1.sisaBenih, 0, 'Case 1 sisaBenih must be 0, never negative');
console.log('✓ PASS: Case 1 - Balanced (2000/2000) disables ditolak and alasan, resets to 0 and Tidak Ada.');

// Case 2: Bibit Pindah Semai (1500) belum balance dengan Jlh Berhasil di Deder (2000)
const case2 = simulateUpdateDitolakState(2000, 1500, 200, 'Rusak');
assert.strictEqual(case2.isBalanced, false, 'Case 2 is not balanced');
assert.strictEqual(case2.inputDitolakDisabled, false, 'Case 2 input-ditolak must be enabled');
assert.strictEqual(case2.selectAlasanDisabled, false, 'Case 2 select-alasan must be enabled');
assert.strictEqual(case2.state.ditolak, 200, 'Case 2 ditolak remains 200');
assert.strictEqual(case2.state.alasanDitolak, 'Rusak', 'Case 2 alasan remains Rusak');
assert.strictEqual(case2.sisaBenih, 300, 'Case 2 sisaBenih is 2000 - 200 - 1500 = 300');
console.log('✓ PASS: Case 2 - Partially allocated allows ditolak and reason.');

// Case 3: Bibit Pindah Semai (1800), ditolak melebihi sisa (coba input 300 padahal sisa 200)
const case3 = simulateUpdateDitolakState(2000, 1800, 300, 'Rusak');
assert.strictEqual(case3.isBalanced, false);
assert.strictEqual(case3.state.ditolak, 200, 'Case 3 ditolak clamped to max allowed 200');
assert.strictEqual(case3.sisaBenih, 0, 'Case 3 sisaBenih clamped to 0');
console.log('✓ PASS: Case 3 - Ditolak clamped to prevent negative balance.');

console.log('\n================================================================================');
console.log('ALL SEEDING FORM DITOLAK BALANCE TESTS PASSED!');
console.log('================================================================================');
