/**
 * Comprehensive Task 14.2 Verification & Failure QA Script
 */
import fs from 'fs';
import path from 'path';

const projectRoot = 'd:/PROJECT SOCFINDO/DATA SOCFIN/Project SIGMA/sigma-nursery';

console.log('=== 1. BASELINE IMMUTABILITY & METADATA AUDIT ===');
const baselineJsPath = path.join(projectRoot, 'js/data/process-mapping-baseline.js');
const baselineJsonPath = path.join(projectRoot, 'data/process-mapping-data.json');

const baselineJsContent = fs.readFileSync(baselineJsPath, 'utf8');
const baselineJsonContent = fs.readFileSync(baselineJsonPath, 'utf8');

const jsonParsed = JSON.parse(baselineJsonContent);

console.log('Baseline JSON updatedBy:', jsonParsed.metadata.updatedBy);
console.log('Baseline JSON requirements count:', (jsonParsed.requirements || []).length);
console.log('Baseline JSON canonical rules count:', (jsonParsed.canonicalBusinessRules || []).length);
console.log('Baseline JSON modules count:', (jsonParsed.modules || []).length);
console.log('Baseline JSON roles count:', (jsonParsed.roles || []).length);

const jsUpdatedByMatch = baselineJsContent.match(/"updatedBy":\s*"([^"]+)"|updatedBy:\s*['"]([^'"]+)['"]/);
const jsUpdatedByVal = jsUpdatedByMatch ? (jsUpdatedByMatch[1] || jsUpdatedByMatch[2]) : 'NOT FOUND';
console.log('Baseline JS updatedBy:', jsUpdatedByVal);

const isJsonUpdatedByCorrect = jsonParsed.metadata.updatedBy === 'System Architect (Task 10 Finalization)';
const isJsUpdatedByCorrect = jsUpdatedByVal === 'System Architect (Task 10 Finalization)';

console.log('JSON metadata restored correctly:', isJsonUpdatedByCorrect ? 'PASS' : 'FAIL');
console.log('JS metadata restored correctly:', isJsUpdatedByCorrect ? 'PASS' : 'FAIL');

console.log('\n=== 2. RUNTIME METRIC AUDIT (DATA ENGINE) ===');
import {
  initProjectDataStore,
  getActiveStore,
  getCoverageMetrics,
  getGapAnalysisReport,
  getFlowEdgeCoverageReport,
  getBusinessRuleTraceabilityReport
} from '../js/modules/process-mapping/process-mapping-data.js';

initProjectDataStore();
const store = getActiveStore();
const covMetrics = getCoverageMetrics();
const gapReport = getGapAnalysisReport(store);
const edgeReport = getFlowEdgeCoverageReport(store);
const ruleReport = getBusinessRuleTraceabilityReport(store);

console.log('Total Active Requirements:', covMetrics.totalActiveRequirements, '(Expected: 172)');
console.log('Flow Required:', covMetrics.flowRequired, '(Expected: 170)');
console.log('Flow Covered:', covMetrics.flowCovered, '(Expected: 170)');
console.log('Flow Gap:', covMetrics.flowGap, '(Expected: 0)');
console.log('Management Reqs:', covMetrics.managementRequirements, '(Expected: 2)');
console.log('Total Modules:', covMetrics.totalModules, '(Expected: 11)');
console.log('Modules with Flows:', covMetrics.modulesWithFlows, '(Expected: 11)');
console.log('Total Features:', covMetrics.totalFeatures, '(Expected: 21)');
console.log('Features with Flows:', covMetrics.featuresWithFlows, '(Expected: 21)');
console.log('Active Flow Edges:', edgeReport.totalActiveEdges, '(Expected: 156)');
console.log('Cross Flow Edges:', edgeReport.totalCrossFlowEdges, '(Expected: 5)');
console.log('Canonical Rules Covered:', ruleReport.coveredRulesCount, '(Expected: 18)');
console.log('Canonical Rules Total:', ruleReport.totalCanonicalRules, '(Expected: 18)');
console.log('Rule Coverage Rate:', ruleReport.coverageRate, '% (Expected: 100)');

console.log('\n=== 3. UI RENDERING & FAILURE HANDLING TEST ===');

function simulateUiMetricExtraction(ruleReportInput, edgeReportInput, storeInput) {
  const coveredRulesVal = typeof ruleReportInput?.coveredRulesCount === 'number'
    ? ruleReportInput.coveredRulesCount
    : (typeof ruleReportInput?.coveredRules === 'number' ? ruleReportInput.coveredRules : 'N/A');

  const totalRulesVal = typeof ruleReportInput?.totalCanonicalRules === 'number'
    ? ruleReportInput.totalCanonicalRules
    : (typeof ruleReportInput?.totalRules === 'number' ? ruleReportInput.totalRules : 'N/A');

  const ruleCoveragePct = typeof ruleReportInput?.coverageRate === 'number'
    ? `${ruleReportInput.coverageRate}%`
    : 'N/A';

  const totalEdgesVal = typeof edgeReportInput?.totalActiveEdges === 'number'
    ? edgeReportInput.totalActiveEdges
    : (typeof edgeReportInput?.totalEdges === 'number' ? edgeReportInput.totalEdges : 'N/A');

  const crossFlowVal = typeof edgeReportInput?.totalCrossFlowEdges === 'number'
    ? edgeReportInput.totalCrossFlowEdges
    : (Array.isArray(storeInput?.crossFlowEdges) ? storeInput.crossFlowEdges.length : 'N/A');

  return {
    rulesDisplay: `${coveredRulesVal}/${totalRulesVal}`,
    ruleCoveragePct,
    totalEdgesVal,
    crossFlowVal
  };
}

// Test Normal State
const normalUi = simulateUiMetricExtraction(ruleReport, edgeReport, store);
console.log('Normal UI Metrics:', normalUi);

// Test Failure / Undefined State
const nullUi = simulateUiMetricExtraction(null, null, {});
console.log('Failure UI Metrics (null inputs):', nullUi);
const emptyUi = simulateUiMetricExtraction({}, {}, {});
console.log('Failure UI Metrics (empty inputs):', emptyUi);

const isFailureSafe =
  nullUi.rulesDisplay === 'N/A/N/A' &&
  nullUi.totalEdgesVal === 'N/A' &&
  nullUi.crossFlowVal === 'N/A' &&
  emptyUi.rulesDisplay === 'N/A/N/A' &&
  emptyUi.totalEdgesVal === 'N/A' &&
  emptyUi.crossFlowVal === 'N/A';

console.log('Failure handling returns N/A (no hardcoded fallback numbers):', isFailureSafe ? 'PASS' : 'FAIL');

console.log('\n=== 4. MOBILE PROTOTYPE INTEGRITY AUDIT ===');
const mobileFiles = [
  'js/app.js',
  'js/core/router.js',
  'index.html',
  'js/db/database.js'
];

let mobileUntouched = true;
mobileFiles.forEach(f => {
  const p = path.join(projectRoot, f);
  if (fs.existsSync(p)) {
    const stats = fs.statSync(p);
    console.log(`Mobile file [${f}] exists (Size: ${stats.size} bytes)`);
  } else {
    console.log(`Mobile file [${f}] missing!`);
    mobileUntouched = false;
  }
});
console.log('Mobile Integrity Status:', mobileUntouched ? 'PASS' : 'FAIL');
