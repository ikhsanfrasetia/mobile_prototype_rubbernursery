// scratch/audit_task12_runtime.js
import * as PMData from '../js/modules/process-mapping/process-mapping-data.js';

await PMData.initProjectDataStore();

const rtm = PMData.getAllTraceabilityRecords();
console.log('Total Active RTM Rows:', rtm.length);

const samples = [
  'RN-PRS-001', // Presensi Retained
  'RN-PRS-006', // Presensi Revised
  'RN-RCV-002', // Penerimaan Revised
  'RN-RCV-006', // Penerimaan Merged (P-012)
  'RN-SEM-TP036', // Penyemaian New (P-014)
  'RN-OKL-001', // Okulasi Revised
  'RN-OKL-029', // Okulasi New (P-006)
  'RN-SEL-014', // Seleksi New (P-016)
  'RN-MNT-009', // Pemeliharaan New (P-011)
  'RN-EXP-008'  // Pengeluaran New (P-003)
];

const sampleResults = samples.map((reqId, idx) => {
  const row = rtm.find(r => r.requirement && r.requirement.id === reqId);
  if (!row) return { sample: idx + 1, reqId, status: 'NOT FOUND' };
  
  const nodeCodes = (row.nodes || []).map(n => n.code || n.id);
  const ruleIds = (row.businessRules || []).map(b => b.id);
  
  return {
    sample: idx + 1,
    reqId: row.requirement.id,
    title: row.requirement.title,
    actor: row.requirement.role,
    module: row.module?.name || row.requirement.module,
    feature: row.feature?.name || row.requirement.feature,
    flowNodes: nodeCodes,
    businessRules: ruleIds,
    classification: row.classification,
    criteria: row.criteria,
    status: (row.nodes.length > 0 && row.businessRules.length > 0 && !row.isGap) ? 'PASS' : 'FAIL'
  };
});

console.log('10 Sample Tracing Results:');
console.log(JSON.stringify(sampleResults, null, 2));
