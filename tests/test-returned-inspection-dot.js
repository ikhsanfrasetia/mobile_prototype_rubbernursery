// Mock localStorage before imports
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear()
};

import { storage } from '../js/core/storage.js';
import { 
  hasActionableInspection, 
  hasReturnedInspection, 
  getReturnedInspectionCount 
} from '../js/modules/inspection/inspection-landing.js';
import { DEDERAN_STORAGE_KEYS } from '../js/modules/seeding/dederan-manager.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

console.log('====================================================');
console.log('TESTING RETURNED INSPECTION NOTIFICATION (RED DOT)');
console.log('====================================================\n');

const mantriUser = {
  userId: 'MTR-01',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-001'
};

const otherDivisionMantri = {
  userId: 'MTR-02',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-TBS',
  divisionId: 'DIV-002'
};

// 1. Initial State: No inspection transactions -> Red Dot OFF
storage.set(DEDERAN_STORAGE_KEYS.INSPECTIONS, []);
storage.set('inspection_transactions', []);
storage.set('budding_transactions', []);

assert(hasReturnedInspection(mantriUser) === false, 'Initial state: No returned inspection -> hasReturnedInspection = false');
assert(hasActionableInspection(mantriUser) === false, 'Initial state: hasActionableInspection = false');

// 2. Returned Dederan Inspection exists for Mantri scope
storage.set(DEDERAN_STORAGE_KEYS.INSPECTIONS, [
  {
    id: 'DED-INS-008',
    docNo: '2026/DED-INS/008',
    status: 'DIKEMBALIKAN',
    returnReason: 'periksa ulang nilai riject',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001'
  }
]);

assert(getReturnedInspectionCount(mantriUser) === 1, 'Mantri scope: getReturnedInspectionCount = 1');
assert(hasReturnedInspection(mantriUser) === true, 'Mantri scope: hasReturnedInspection = true (Red Dot ON)');
assert(hasActionableInspection(mantriUser) === true, 'Mantri scope: hasActionableInspection = true (Red Dot ON)');

// 3. Isolation: Other division mantri should NOT see red dot
assert(hasReturnedInspection(otherDivisionMantri) === false, 'Other division: hasReturnedInspection = false (Division Isolation)');
assert(hasActionableInspection(otherDivisionMantri) === false, 'Other division: hasActionableInspection = false');

// 4. Returned Okulasi Inspection exists
storage.set(DEDERAN_STORAGE_KEYS.INSPECTIONS, []);
storage.set('inspection_transactions', [
  {
    id: 'INS-OKL-001',
    docNo: '2026/INS/001',
    status: 'DIKEMBALIKAN',
    returnReason: 'jumlah gagal tidak sesuai',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001'
  }
]);

assert(hasReturnedInspection(mantriUser) === true, 'Okulasi returned: hasReturnedInspection = true (Red Dot ON)');
assert(hasActionableInspection(mantriUser) === true, 'Okulasi returned: hasActionableInspection = true (Red Dot ON)');

// 5. Approved inspection should NOT trigger red dot
storage.set('inspection_transactions', [
  {
    id: 'INS-OKL-001',
    docNo: '2026/INS/001',
    status: 'APPROVED',
    estateId: 'EST-TBS',
    divisionId: 'DIV-001'
  }
]);

assert(hasReturnedInspection(mantriUser) === false, 'Approved status: hasReturnedInspection = false (Red Dot OFF)');

console.log(`\nResults: ${passed}/${total} assertions passed.`);
