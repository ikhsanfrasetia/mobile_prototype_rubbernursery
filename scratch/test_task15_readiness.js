/**
 * Acceptance Verification for Task 15 — Stakeholder Review Readiness
 */
import fs from 'fs';
import path from 'path';

const projectRoot = 'd:/PROJECT SOCFINDO/DATA SOCFIN/Project SIGMA/sigma-nursery';

console.log('================================================================');
console.log('🧪 RUNNING TASK 15 — STAKEHOLDER REVIEW READINESS VERIFICATION');
console.log('================================================================\n');

// 1. Verify Documents Existence
console.log('--- 1. Document Existence & Integrity Check ---');
const requiredFiles = [
  'TASK-15-STAKEHOLDER-REVIEW-READINESS.md',
  'SIGMA-RUBBER-NURSERY-STAKEHOLDER-REVIEW-BRIEF.md',
  'SIGMA-RUBBER-NURSERY-STAKEHOLDER-SIGNOFF.md',
  'docs/final-release/SIGMA-RUBBER-NURSERY-STAKEHOLDER-SIGNOFF.md',
  'docs/final-release/SIGMA-RUBBER-NURSERY-STAKEHOLDER-REVIEW-BRIEF.md',
  'docs/final-release/SIGMA-RUBBER-NURSERY-REQUIREMENT-BASELINE-FINAL.md',
  'docs/final-release/SIGMA-RUBBER-NURSERY-PROCESS-FLOW-FINAL.md',
  'docs/final-release/SIGMA-RUBBER-NURSERY-BUSINESS-RULES-FINAL.md',
  'docs/final-release/SIGMA-RUBBER-NURSERY-RTM-FINAL.md',
  'docs/final-release/SIGMA-RUBBER-NURSERY-CHANGE-HISTORY-FINAL.md',
  'docs/final-release/SIGMA-RUBBER-NURSERY-FINAL-ISSUE-REGISTER.md',
  'TASK-13-DAK-FINAL.md'
];

let allFilesExist = true;
requiredFiles.forEach(rf => {
  const p = path.join(projectRoot, rf);
  const exists = fs.existsSync(p);
  if (!exists) allFilesExist = false;
  console.log(`[${exists ? 'PASS' : 'FAIL'}] Document: ${rf}`);
});

if (!allFilesExist) {
  console.error('Some required documents are missing!');
  process.exit(1);
}

// 2. Sign-off content verification (TBD names, PENDING status, no fabricated names)
console.log('\n--- 2. Sign-off Form Governance Check ---');
const signoffContent = fs.readFileSync(path.join(projectRoot, 'SIGMA-RUBBER-NURSERY-STAKEHOLDER-SIGNOFF.md'), 'utf8');

const checksSignoff = [
  { label: 'Business Owner TBD', passed: signoffContent.includes('**Business Owner** | TBD') },
  { label: 'User Representative TBD', passed: signoffContent.includes('**User Representative** | TBD') },
  { label: 'Project Manager TBD', passed: signoffContent.includes('**Project Manager** | TBD') },
  { label: 'Business Analyst TBD', passed: signoffContent.includes('**Business Analyst** | TBD') },
  { label: 'Technical Representative TBD', passed: signoffContent.includes('**Technical Representative** | TBD') },
  { label: 'Status PENDING', passed: signoffContent.includes('PENDING') },
  { label: 'Option APPROVED', passed: signoffContent.includes('APPROVED') },
  { label: 'Option APPROVED WITH NOTES', passed: signoffContent.includes('APPROVED WITH NOTES') },
  { label: 'Option REJECTED', passed: signoffContent.includes('REJECTED') }
];

checksSignoff.forEach(c => {
  console.log(`[${c.passed ? 'PASS' : 'FAIL'}] ${c.label}`);
  if (!c.passed) process.exit(1);
});

// 3. Baseline & Runtime Engine Verification
console.log('\n--- 3. Baseline & Runtime Engine Verification ---');
import {
  initProjectDataStore,
  getActiveStore,
  getCoverageMetrics,
  getFlowEdgeCoverageReport,
  getBusinessRuleTraceabilityReport
} from '../js/modules/process-mapping/process-mapping-data.js';

initProjectDataStore();
const store = getActiveStore();
const cov = getCoverageMetrics();
const edges = getFlowEdgeCoverageReport(store);
const rules = getBusinessRuleTraceabilityReport(store);

const runtimeChecks = [
  { label: 'Requirements Count', actual: cov.totalActiveRequirements, expected: 172 },
  { label: 'Flow Required', actual: cov.flowRequired, expected: 170 },
  { label: 'Flow Covered', actual: cov.flowCovered, expected: 170 },
  { label: 'True Gap', actual: cov.flowGap, expected: 0 },
  { label: 'Management Reqs', actual: cov.managementRequirements, expected: 2 },
  { label: 'Modules Count', actual: cov.totalModules, expected: 11 },
  { label: 'Features Count', actual: cov.totalFeatures, expected: 21 },
  { label: 'Active Edges', actual: edges.totalActiveEdges, expected: 156 },
  { label: 'Cross Flow Edges', actual: edges.totalCrossFlowEdges, expected: 5 },
  { label: 'Canonical Rules Covered', actual: rules.coveredRulesCount, expected: 18 },
  { label: 'Canonical Rules Total', actual: rules.totalCanonicalRules, expected: 18 }
];

runtimeChecks.forEach(c => {
  const ok = c.actual === c.expected;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${c.label}: ${c.actual} (expected: ${c.expected})`);
  if (!ok) process.exit(1);
});

// 4. Mobile Prototype Integrity Check
console.log('\n--- 4. Mobile Prototype Integrity Check ---');
const mobileFiles = [
  'js/app.js',
  'js/core/router.js',
  'js/db/indexeddb.js',
  'js/db/repositories.js',
  'js/db/seed.js',
  'index.html'
];
mobileFiles.forEach(f => {
  const p = path.join(projectRoot, f);
  if (!fs.existsSync(p)) {
    console.error(`[FAIL] Missing mobile file: ${f}`);
    process.exit(1);
  }
});
console.log('[PASS] All mobile files intact.');

console.log('\n================================================================');
console.log('🎉 TASK 15 READINESS VERIFICATION COMPLETED SUCCESSFULLY!');
console.log('================================================================');
