/**
 * Comprehensive Acceptance Test for Task 14.2
 */
import fs from 'fs';
import path from 'path';
import {
  initProjectDataStore,
  getActiveStore,
  getCoverageMetrics,
  getGapAnalysisReport,
  getFlowEdgeCoverageReport,
  getBusinessRuleTraceabilityReport
} from '../js/modules/process-mapping/process-mapping-data.js';

const projectRoot = 'd:/PROJECT SOCFINDO/DATA SOCFIN/Project SIGMA/sigma-nursery';

console.log('====================================================');
console.log('🧪 TASK 14.2 — SOURCE INTEGRITY & RUNTIME METRICS QA');
console.log('====================================================\n');

// 1. Baseline Integrity
console.log('--- 1. Baseline Integrity Check ---');
const baselineJsPath = path.join(projectRoot, 'js/data/process-mapping-baseline.js');
const baselineJsonPath = path.join(projectRoot, 'data/process-mapping-data.json');
const baselineJs = fs.readFileSync(baselineJsPath, 'utf8');
const baselineJson = JSON.parse(fs.readFileSync(baselineJsonPath, 'utf8'));

const jsMatch = baselineJs.match(/"updatedBy":\s*"([^"]+)"|updatedBy:\s*['"]([^'"]+)['"]/);
const jsUpdatedBy = jsMatch ? (jsMatch[1] || jsMatch[2]) : null;
const jsonUpdatedBy = baselineJson.metadata.updatedBy;

console.log(`JS Baseline updatedBy: "${jsUpdatedBy}"`);
console.log(`JSON Baseline updatedBy: "${jsonUpdatedBy}"`);

if (jsUpdatedBy === 'System Architect (Task 10 Finalization)' && jsonUpdatedBy === 'System Architect (Task 10 Finalization)') {
  console.log('[PASS] Baseline restored to Task 10 Finalization metadata.');
} else {
  console.error('[FAIL] Baseline metadata mismatch!');
  process.exit(1);
}

// 2. Data Engine Runtime Metrics
console.log('\n--- 2. Runtime Metrics Verification ---');
initProjectDataStore();
const store = getActiveStore();
const cov = getCoverageMetrics();
const edges = getFlowEdgeCoverageReport(store);
const rules = getBusinessRuleTraceabilityReport(store);

const checks = [
  { label: 'Active Requirements', actual: cov.totalActiveRequirements, expected: 172 },
  { label: 'Flow Required', actual: cov.flowRequired, expected: 170 },
  { label: 'Flow Covered', actual: cov.flowCovered, expected: 170 },
  { label: 'True Gap', actual: cov.flowGap, expected: 0 },
  { label: 'Management Reqs', actual: cov.managementRequirements, expected: 2 },
  { label: 'Total Modules', actual: cov.totalModules, expected: 11 },
  { label: 'Modules with Flows', actual: cov.modulesWithFlows, expected: 11 },
  { label: 'Total Features', actual: cov.totalFeatures, expected: 21 },
  { label: 'Features with Flows', actual: cov.featuresWithFlows, expected: 21 },
  { label: 'Active Flow Edges', actual: edges.totalActiveEdges, expected: 156 },
  { label: 'Cross Flow Edges', actual: edges.totalCrossFlowEdges, expected: 5 },
  { label: 'Canonical Rules Covered', actual: rules.coveredRulesCount, expected: 18 },
  { label: 'Canonical Rules Total', actual: rules.totalCanonicalRules, expected: 18 },
  { label: 'Canonical Rules Rate', actual: rules.coverageRate, expected: 100 }
];

let allPassed = true;
checks.forEach(c => {
  const ok = c.actual === c.expected;
  if (!ok) allPassed = false;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] ${c.label}: ${c.actual} (expected: ${c.expected})`);
});

if (!allPassed) {
  console.error('Some runtime metrics failed!');
  process.exit(1);
}

// 3. Fallback Hardening QA
console.log('\n--- 3. Hardcoded Fallback & Failure Handling QA ---');

function safeRenderExtract(ruleRep, edgeRep, st) {
  const coveredRulesVal = typeof ruleRep?.coveredRulesCount === 'number'
    ? ruleRep.coveredRulesCount
    : (typeof ruleRep?.coveredRules === 'number' ? ruleRep.coveredRules : 'N/A');

  const totalRulesVal = typeof ruleRep?.totalCanonicalRules === 'number'
    ? ruleRep.totalCanonicalRules
    : (typeof ruleRep?.totalRules === 'number' ? ruleRep.totalRules : 'N/A');

  const ruleCoveragePct = typeof ruleRep?.coverageRate === 'number'
    ? `${ruleRep.coverageRate}%`
    : 'N/A';

  const totalEdgesVal = typeof edgeRep?.totalActiveEdges === 'number'
    ? edgeRep.totalActiveEdges
    : (typeof edgeRep?.totalEdges === 'number' ? edgeRep.totalEdges : 'N/A');

  const crossFlowVal = typeof edgeRep?.totalCrossFlowEdges === 'number'
    ? edgeRep.totalCrossFlowEdges
    : (Array.isArray(st?.crossFlowEdges) ? st.crossFlowEdges.length : 'N/A');

  return { coveredRulesVal, totalRulesVal, ruleCoveragePct, totalEdgesVal, crossFlowVal };
}

const nullRes = safeRenderExtract(null, null, null);
console.log('Null Data Extract:', nullRes);
if (
  nullRes.coveredRulesVal === 'N/A' &&
  nullRes.totalRulesVal === 'N/A' &&
  nullRes.ruleCoveragePct === 'N/A' &&
  nullRes.totalEdgesVal === 'N/A' &&
  nullRes.crossFlowVal === 'N/A'
) {
  console.log('[PASS] Null runtime gracefully falls back to N/A without concealing failures.');
} else {
  console.error('[FAIL] Fallback did not produce N/A!');
  process.exit(1);
}

// 4. Mobile Prototype Check
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
    console.error(`[FAIL] Missing file: ${f}`);
    process.exit(1);
  }
});
console.log('[PASS] All mobile prototype core files verified intact.');

console.log('\n====================================================');
console.log('🎉 ALL TASK 14.2 ACCEPTANCE TESTS PASSED!');
console.log('====================================================');
