import fs from 'fs';
import {
  initProjectDataStore,
  getActiveStore,
  getCoverageMetrics,
  getGapAnalysisReport,
  getAllTraceabilityRecords
} from '../js/modules/process-mapping/process-mapping-data.js';

console.log('=== STARTING 31 GAP EXACT MATCH AUDIT ===\n');

const store = initProjectDataStore(true);
const gapReport = getGapAnalysisReport();
const coverageMetrics = getCoverageMetrics();
const jsonStore = JSON.parse(fs.readFileSync('data/process-mapping-data.json', 'utf8'));
const masterDoc = fs.readFileSync('MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md', 'utf8');

console.log(`Total Gap Records in UI Engine: ${gapReport.gapRecords.length}`);
console.log('Module Summary from UI:');
gapReport.moduleSummary.forEach(ms => {
  console.log(`- [${ms.moduleId}] ${ms.moduleName}: ${ms.totalGaps} gaps`);
});

// Extract exact 31 Gap records
const exact31Gaps = gapReport.gapRecords.map((rec, idx) => {
  const req = rec.requirement;
  const mod = rec.module;
  const feat = rec.feature;
  const reqId = req.id;

  // Check in data/process-mapping-data.json
  const inJson = (jsonStore.requirements || []).find(r => r.id === reqId);
  let jsonMatchStatus = 'MATCH';
  if (!inJson) {
    jsonMatchStatus = 'NOT FOUND';
  } else if (inJson.status !== req.status) {
    jsonMatchStatus = `STATUS MISMATCH (JSON: ${inJson.status} vs Store: ${req.status})`;
  }

  // Check in MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md
  let masterStatus = 'NOT IN MASTER BASELINE';
  const masterHasId = masterDoc.includes(reqId);

  if (masterHasId) {
    if (reqId === 'RN-OKL-014' || reqId === 'RN-REG-010' || reqId === 'RN-MAT-005') {
      masterStatus = 'REVISE';
    } else if (req.isArchived || req.status === 'Deprecated') {
      masterStatus = 'ARCHIVE';
    } else {
      masterStatus = 'KEEP';
    }
  }

  return {
    no: idx + 1,
    id: reqId,
    title: req.title,
    role: req.role || req.roleId,
    module: mod?.name || req.module,
    moduleId: mod?.id || req.moduleId,
    feature: feat?.name || req.feature,
    featureId: feat?.id || req.featureId,
    reqStatus: req.status,
    flowRequired: rec.isFlowRequired ? 'YES' : 'NO',
    flowCovered: rec.isFlowCovered ? 'YES' : 'NO',
    nodeId: rec.linkedNodes && rec.linkedNodes.length > 0 ? rec.linkedNodes.map(n => n.id).join(', ') : '-',
    flowId: `${mod?.id || req.moduleId}/${feat?.id || req.featureId}`,
    businessRule: rec.businessRules && rec.businessRules.length > 0 ? rec.businessRules.map(b => b.id || b.code).join(', ') : (req.businessRule || '-'),
    isArchived: Boolean(req.isArchived),
    sourceObject: 'data/process-mapping-data.json & js/data/process-mapping-baseline.js',
    jsonMatchStatus,
    masterStatus
  };
});

// Check suspected 33 list against exact 31
const suspectedList = [
  'RN-RCV-KSP019',
  'RN-RCV-ME025',
  'RN-OKL-004',
  'RN-OKL-007',
  'RN-OKL-009',
  'RN-OKL-010',
  'RN-OKL-012',
  'RN-OKL-014',
  'RN-CHK-RG036',
  'RN-CHK-RG037',
  'RN-CHK-RG038',
  'RN-CHK-RG039',
  'RN-CHK-RG040',
  'RN-CHK-RG041',
  'RN-CHK-RG042',
  'RN-CHK-RG043',
  'RN-CHK-RG044',
  'RN-ENT-TOP045',
  'RN-ENT-TOP046',
  'RN-ENT-TOP047',
  'RN-ENT-TOP048',
  'RN-ENT-TOP049',
  'RN-ENT-TOP050',
  'RN-ENT-TOP051',
  'RN-MAT-MMG052',
  'RN-MAT-MMG053',
  'RN-MAT-MMG054',
  'RN-MAT-MMG055',
  'RN-MAT-MMG056',
  'RN-MAT-MMG057',
  'RN-MAT-MMG058'
];

console.log(`\nSuspected List length: ${suspectedList.length}`);
const exact31Ids = exact31Gaps.map(g => g.id);

console.log('\nExact 31 IDs:');
console.log(exact31Ids.join(', '));

const suspectedInExact = suspectedList.filter(id => exact31Ids.includes(id));
const suspectedNotInExact = suspectedList.filter(id => !exact31Ids.includes(id));
const exactNotInSuspected = exact31Ids.filter(id => !suspectedList.includes(id));

console.log(`\nSuspected in Exact: ${suspectedInExact.length}/${suspectedList.length}`);
console.log(`Suspected NOT in Exact:`, suspectedNotInExact);
console.log(`Exact NOT in Suspected:`, exactNotInSuspected);

fs.writeFileSync('scripts/exact_31_gap_data.json', JSON.stringify({
  metrics: coverageMetrics,
  exact31Gaps,
  suspectedList,
  suspectedInExact,
  suspectedNotInExact,
  exactNotInSuspected
}, null, 2));

console.log('\nAudit data exported to scripts/exact_31_gap_data.json');
