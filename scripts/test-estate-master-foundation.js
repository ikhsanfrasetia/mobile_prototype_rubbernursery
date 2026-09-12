/**
 * scripts/test-estate-master-foundation.js
 * Verification Suite for Centralized Master Estate Foundation.
 */

import {
  ESTATE_MASTER,
  ESTATE_STATUS,
  getAllEstates,
  getActiveEstates,
  getEstateById,
  getEstateByCode,
  resolveEstate,
  isEstateActive
} from '../js/data/estate-master.js';

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
console.log('                 SIGMA RUBBER NURSERY — TEST SUITE: MASTER ESTATE FOUNDATION            ');
console.log('========================================================================================\n');

// 1. Array & Objects
assert(Array.isArray(ESTATE_MASTER), '1. ESTATE_MASTER adalah Array');
assert(Object.isFrozen(ESTATE_MASTER), '2. ESTATE_MASTER di-freeze (immutable read-only)');
assert(ESTATE_MASTER.length === 2, '3. ESTATE_MASTER berisi tepat 2 entitas');

// 2. getAllEstates
const allEstates = getAllEstates();
assert(allEstates.length === 2, '4. getAllEstates() mengembalikan 2 record');

// 3. Exact Estates Verification
const tbs = ESTATE_MASTER.find(e => e.estate_id === 'EST-TBS');
const apm = ESTATE_MASTER.find(e => e.estate_id === 'EST-APM');
assert(tbs !== undefined && tbs.estate_code === 'EST-TBS' && tbs.estate_name === 'Tanah Besih', '5. EST-TBS exists (Tanah Besih)');
assert(apm !== undefined && apm.estate_code === 'EST-APM' && apm.estate_name === 'Aek Pamingke', '6. EST-APM exists (Aek Pamingke)');

// 4. Uniqueness
const ids = new Set(ESTATE_MASTER.map(e => e.estate_id));
const codes = new Set(ESTATE_MASTER.map(e => e.estate_code));
assert(ids.size === ESTATE_MASTER.length, '7. estate_id unique');
assert(codes.size === ESTATE_MASTER.length, '8. estate_code unique');

// 5. getActiveEstates
const activeEstates = getActiveEstates();
assert(activeEstates.every(e => e.status === ESTATE_STATUS.ACTIVE), '9. getActiveEstates() hanya me-return record ACTIVE');
assert(activeEstates.length === 2, '10. Terdapat 2 estate aktif saat ini');

// 6. getEstateById
assert(getEstateById('EST-TBS')?.estate_name === 'Tanah Besih', '11. getEstateById("EST-TBS") -> Tanah Besih');
assert(getEstateById('EST-APM')?.estate_name === 'Aek Pamingke', '12. getEstateById("EST-APM") -> Aek Pamingke');

// 7. getEstateByCode
assert(getEstateByCode('EST-TBS')?.estate_name === 'Tanah Besih', '13. getEstateByCode("EST-TBS") -> Tanah Besih');
assert(getEstateByCode('EST-APM')?.estate_name === 'Aek Pamingke', '14. getEstateByCode("EST-APM") -> Aek Pamingke');

// 8. resolveEstate
assert(resolveEstate('EST-TBS')?.estate_name === 'Tanah Besih', '15. resolveEstate("EST-TBS") -> Tanah Besih');
assert(resolveEstate('Tanah Besih')?.estate_id === 'EST-TBS', '16. resolveEstate("Tanah Besih") -> EST-TBS');
assert(resolveEstate('EST-APM')?.estate_name === 'Aek Pamingke', '17. resolveEstate("EST-APM") -> Aek Pamingke');
assert(resolveEstate('Aek Pamingke')?.estate_id === 'EST-APM', '18. resolveEstate("Aek Pamingke") -> EST-APM');

// 9. isEstateActive
assert(isEstateActive('EST-TBS') === true, '20. isEstateActive("EST-TBS") -> true');
assert(isEstateActive('EST-APM') === true, '21. isEstateActive("EST-APM") -> true');

// 10. Invalid estate
assert(resolveEstate('INVALID') === null, '22. resolveEstate("INVALID") -> null');
assert(getEstateById('INVALID') === null, '23. getEstateById("INVALID") -> null');
assert(getEstateByCode('INVALID') === null, '24. getEstateByCode("INVALID") -> null');
assert(isEstateActive('INVALID') === false, '25. isEstateActive("INVALID") -> false');

console.log('\n----------------------------------------------------------------------------------------');
console.log(`TOTAL ASSERTIONS: ${passed + failed}`);
console.log(`PASSED:           ${passed}`);
console.log(`FAILED:           ${failed}`);
console.log('----------------------------------------------------------------------------------------');

if (failed === 0) {
  console.log('✅ ALL MASTER ESTATE FOUNDATION TESTS PASSED (0 FAILURES)!');
  process.exit(0);
} else {
  console.error('❌ SOME MASTER ESTATE FOUNDATION TESTS FAILED!');
  process.exit(1);
}
