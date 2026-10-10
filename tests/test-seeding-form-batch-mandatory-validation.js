import assert from 'node:assert';
import fs from 'node:fs';

console.log('================================================================================');
console.log('RUNNING TESTS: SEEDING FORM BATCH MANDATORY (PILIH BATCH) VALIDATION');
console.log('================================================================================');

const source = fs.readFileSync('js/modules/seeding/seeding-form.js', 'utf-8');

// 1. Invariant: Placeholder "Pilih Batch" option exists in select-batch HTML
assert.ok(source.includes('<option value="" ${(!state.batchId && !state.batchNo) ? \'selected\' : \'\'}>Pilih Batch</option>'),
  'seeding-form.js must have option value="" with text "Pilih Batch"');

// 2. Invariant: Initial defaultBatchId and defaultBatchCode must be null on create (not auto-selecting finalBatchList[0])
assert.ok(!source.includes('defaultBatchId = finalBatchList[0].id;'),
  'seeding-form.js must NOT default to finalBatchList[0].id');

// 3. Invariant: selectBatch change event handles empty / placeholder selection
assert.ok(source.includes('if (!chosenId) {'),
  'seeding-form.js selectBatch change listener must check if chosenId is empty');

// 4. Invariant: Form validation blocks submission when batch is empty
assert.ok(source.includes('!state.tableRows[0]?.batchNo && !state.tableRows[0]?.batchId && !state.batchId && !state.batchNo'),
  'seeding-form.js validateForm must check that batch is selected');

// 5. Invariant: Submit button confirmation blocks saving when batch is empty
assert.ok(source.includes("toast('Silakan pilih No. Batch terlebih dahulu.', 'error');"),
  'seeding-form.js btnKonfirmSimpan must show toast if batch is not selected');

console.log('✓ PASS: All Batch Mandatory Invariants Verified.');
console.log('================================================================================');
