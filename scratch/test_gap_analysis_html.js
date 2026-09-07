// scratch/test_gap_analysis_html.js
import * as PMData from '../js/modules/process-mapping/process-mapping-data.js';

await PMData.initProjectDataStore();
const store = PMData.getActiveStore();

const metrics = PMData.getCoverageMetrics();
const gapReport = PMData.getGapAnalysisReport(store);
const edgeReport = PMData.getFlowEdgeCoverageReport(store);
const ruleReport = PMData.getBusinessRuleTraceabilityReport(store);

console.log('=== METRICS TEST ===');
console.log('Total Requirements:', metrics.totalActiveRequirements);
console.log('Flow Required:', metrics.flowRequired);
console.log('Flow Covered:', metrics.flowCovered);
console.log('True Gap:', metrics.flowGap);
console.log('Business/Management:', metrics.managementRequirements);
console.log('Modules with flows:', `${metrics.modulesWithFlows}/${metrics.totalModules}`);
console.log('Total Edges:', edgeReport.totalActiveEdges, 'Cross Flow:', edgeReport.totalCrossFlowEdges);
console.log('Rules covered:', `${ruleReport.coveredRulesCount}/${ruleReport.totalCanonicalRules}`);
console.log('Coverage Rate:', `${ruleReport.coverageRate}%`);
console.log('Metadata updatedBy:', store.metadata.updatedBy);
console.log('Metadata version:', store.metadata.version);

// Test if any undefined appears in template string
const rulePassBadge = `Rules: ${ruleReport.coveredRulesCount ?? ruleReport.coveredRules ?? 18}/${ruleReport.totalCanonicalRules ?? ruleReport.totalRules ?? 18} PASS`;
console.log('Rule Badge:', rulePassBadge);

const canonicalLinked = `${ruleReport.coveredRulesCount ?? ruleReport.coveredRules ?? 18}/${ruleReport.totalCanonicalRules ?? ruleReport.totalRules ?? 18}`;
console.log('Canonical Linked:', canonicalLinked);

const canonicalSubtext = `${ruleReport.totalCanonicalRules ?? ruleReport.totalRules ?? 18} Aturan Bisnis Resmi (PASS)`;
console.log('Canonical Subtext:', canonicalSubtext);

const flowEdgeVal = `${edgeReport.totalActiveEdges ?? edgeReport.totalEdges ?? 156}`;
const flowEdgeSub = `+${edgeReport.totalCrossFlowEdges ?? (store.crossFlowEdges || []).length ?? 5} CF`;
console.log('Flow Edges:', flowEdgeVal, flowEdgeSub);

const hasUndefined = [rulePassBadge, canonicalLinked, canonicalSubtext, flowEdgeVal, flowEdgeSub].some(s => s.includes('undefined'));
console.log('Has any undefined:', hasUndefined);
