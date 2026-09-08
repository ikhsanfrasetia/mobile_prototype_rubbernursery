import fs from 'fs';
import {
  initProjectDataStore,
  getActiveStore,
  getCoverageMetrics,
  getGapAnalysisReport,
  getAllTraceabilityRecords,
  getNodeTrace
} from '../js/modules/process-mapping/process-mapping-data.js';

console.log('=== STARTING GAP ANALYSIS AUDIT ===\n');

const store = initProjectDataStore(true);
const coverageMetrics = getCoverageMetrics();
const gapReport = getGapAnalysisReport();
const allTraces = getAllTraceabilityRecords();

console.log('Coverage Metrics:');
console.log(JSON.stringify(coverageMetrics, null, 2));

console.log('\nGap Report Summary:');
console.log(`- Total Gaps: ${gapReport.totalGaps}`);
console.log(`- Total Module Records: ${gapReport.moduleSummary.length}`);

// Group by module
const gapsByModule = {};
(store.modules || []).forEach(m => {
  gapsByModule[m.id] = {
    moduleId: m.id,
    moduleName: m.name,
    moduleOrder: m.order,
    totalGaps: 0,
    gaps: []
  };
});

const detailedGaps = [];
gapReport.gapRecords.forEach(rec => {
  const modId = rec.module?.id || rec.requirement?.moduleId || 'other';
  if (!gapsByModule[modId]) {
    gapsByModule[modId] = {
      moduleId: modId,
      moduleName: rec.module?.name || rec.requirement?.module || 'Lainnya',
      totalGaps: 0,
      gaps: []
    };
  }

  const gapItem = {
    id: rec.requirement?.id,
    title: rec.requirement?.title,
    role: rec.requirement?.role,
    module: rec.module?.name || rec.requirement?.module,
    moduleId: modId,
    feature: rec.feature?.name || rec.requirement?.feature,
    featureId: rec.feature?.id || rec.requirement?.featureId,
    reqStatus: rec.requirement?.status,
    flowStatus: 'Uncovered (No dedicated visual step node)',
    businessRule: rec.businessRules && rec.businessRules.length > 0 ? rec.businessRules.map(b => b.id || b.code).join(', ') : '-',
    nodeId: '-',
    reason: 'Requirement fungsional validasi/input spesifik yang dijalankan dalam alur form transaksi, belum memiliki visual step node tersendiri pada diagram alur.'
  };

  gapsByModule[modId].totalGaps++;
  gapsByModule[modId].gaps.push(gapItem);
  detailedGaps.push(gapItem);
});

// Legacy Contamination Search
const legacyContamination = [];
const allReqs = store.requirements || [];
const activeReqs = allReqs.filter(r => !r.isArchived && !r.isSuperseded);

activeReqs.forEach(r => {
  if (r.featureId === 'transplanting-polybag' || r.id.startsWith('RN-SEM-TP') || r.id === 'RN-SEM-006') {
    legacyContamination.push({ type: 'TRANSPLANTING_REQ', reqId: r.id, feature: r.featureId });
  }
  if (r.role === 'KTU' || r.roleId === 'ktu') {
    legacyContamination.push({ type: 'KTU_REQ', reqId: r.id });
  }
  if (r.role === 'Tekniker I' || r.roleId === 'tekniker-1') {
    legacyContamination.push({ type: 'TEKNIKER_REQ', reqId: r.id });
  }
});

for (const [modId, feats] of Object.entries(store.flows || {})) {
  if (feats['transplanting-polybag']) {
    legacyContamination.push({ type: 'TRANSPLANTING_FLOW', moduleId: modId, featureId: 'transplanting-polybag' });
  }
  for (const [featId, flow] of Object.entries(feats || {})) {
    (flow.nodes || []).forEach(n => {
      if (n.role === 'KTU' || n.role === 'Tekniker I') {
        legacyContamination.push({ type: 'FORBIDDEN_ROLE_NODE', featId, nodeId: n.id, role: n.role });
      }
    });
  }
}

console.log(`- Legacy Contaminations Found: ${legacyContamination.length}`);

const output = {
  coverageMetrics,
  gapReport: {
    totalGaps: gapReport.totalGaps,
    moduleSummary: gapReport.moduleSummary
  },
  detailedGaps,
  gapsByModule,
  legacyContamination,
  crossFlowEdges: (store.crossFlowEdges || []).length,
  businessRulesLinked: `${coverageMetrics.requirementsWithBusinessRules}/${coverageMetrics.totalActiveRequirements}`
};

fs.writeFileSync('scripts/gap_analysis_data.json', JSON.stringify(output, null, 2));
console.log('✅ Exported gap analysis data to scripts/gap_analysis_data.json');
