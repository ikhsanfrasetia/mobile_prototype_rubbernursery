/**
 * scripts/run-all-tests-phase9h.js
 * Master Regression & Verification Test Runner for Phase 9H
 */

import { execSync } from 'child_process';

const suites = [
  { name: 'Phase 9H:  Worker Master Integration: Presensi (New)', file: 'scripts/test-phase9h-attendance-worker-integration.js' },
  { name: 'Phase 9G:  Worker Master Integration: Budding', file: 'scripts/test-phase9g-budding-worker-integration.js' },
  { name: 'Phase 9F-B: Master Data Pekerja Foundation', file: 'scripts/test-phase9fb-worker-master.js' },
  { name: 'Phase 9F-A: Worker Master Dependency Audit', file: 'scripts/test-phase9fa-worker-audit.js' },
  { name: 'Phase 9E:   Persona Division Alignment', file: 'scripts/test-phase9e-persona-division.js' },
  { name: 'Phase 9D:   UAT Mantri Transaction Isolation', file: 'scripts/run-uat-phase9d.js' },
  { name: 'Phase 9D:   Transaction Data Isolation & Actor Ownership', file: 'scripts/test-phase9d-transaction-isolation.js' },
  { name: 'Phase 9C:   CFNA Maintenance Module Integration', file: 'scripts/test-phase9c-cfna-maintenance.js' },
  { name: 'Phase 9B:   Master Data CFNA Foundation', file: 'scripts/test-phase9b-cfna-master.js' },
  { name: 'Phase 9A:   Gap Resolution & SPB Integration', file: 'scripts/test-phase9a-request-integration.js' },
  { name: 'Phase 8A:   Role Menu Mapping & Validation', file: 'scripts/test-role-menu-mapping.js' },
  { name: 'Phase 8B:   Transaction Actor Identity Traceability', file: 'scripts/test-transaction-actor-identity.js' },
  { name: 'Phase 7:    Menu & Feature Registry', file: 'scripts/test-menu-feature-registry.js' },
  { name: 'Phase 6:    Role Profile & Capability Registry', file: 'scripts/test-role-profiles.js' },
  { name: 'Phase 5:    Role Normalization Compatibility', file: 'scripts/test-role-normalization.js' },
  { name: 'Phase 4:    Persona Switcher & Session Layer', file: 'scripts/test-persona-switcher.js' },
  { name: 'Phase 3:    Demo User & Persona Registry', file: 'scripts/test-persona-registry.js' },
  { name: 'Acceptance Suite: Task 11 Feature Acceptance', file: 'scripts/test-task11-acceptance.js' },
  { name: 'Phase 2:    User Context Compatibility Layer', file: 'scripts/test-user-context-compatibility.js' }
];

console.log('========================================================================================');
console.log('                 SIGMA RUBBER NURSERY — MASTER REGRESSION RUNNER (PHASE 9H)             ');
console.log('========================================================================================\n');

let totalPassed = 0;
let totalFailed = 0;
const results = [];

for (const suite of suites) {
  try {
    const output = execSync(`node ${suite.file}`, { encoding: 'utf-8' });
    const countMatch = output.match(/(?:(\d+)\s+(?:PASSED|passed|assertions passed)|Passed:\s*(\d+))/i);
    let count = 0;
    if (countMatch) {
      count = parseInt(countMatch[1] || countMatch[2], 10);
    } else {
      const individualPass = (output.match(/✅/g) || []).length;
      count = individualPass;
    }

    totalPassed += count;
    results.push({ name: suite.name, count, status: 'PASS', error: null });
    console.log(`✅ [PASS] ${suite.name} — ${count} assertions`);
  } catch (err) {
    totalFailed++;
    results.push({ name: suite.name, count: 0, status: 'FAIL', error: err.message });
    console.error(`❌ [FAIL] ${suite.name}`);
    console.error(err.stdout || err.message);
  }
}

console.log('\n========================================================================================');
console.log('                                  REGRESSION SUMMARY TABLE                              ');
console.log('========================================================================================');
results.forEach((r, idx) => {
  const num = String(idx + 1).padEnd(3, ' ');
  const name = r.name.padEnd(65, ' ');
  const count = String(r.count + ' assertions').padStart(15, ' ');
  const status = r.status === 'PASS' ? 'PASS ✅' : 'FAIL ❌';
  console.log(`${num} ${name} ${count}   ${status}`);
});
console.log('----------------------------------------------------------------------------------------');
console.log(`GRAND TOTAL ASSERTIONS PASSED: ${totalPassed}`);
console.log(`TOTAL SUITES FAILED:           ${totalFailed}`);
console.log('========================================================================================\n');

if (totalFailed > 0) {
  process.exit(1);
}
