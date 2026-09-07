// scratch/audit_task12_e2e.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, '../data/process-mapping-data.json');
const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

console.log('=== PRE-CONDITION AUDIT ===');
const activeReqs = rawData.requirements.filter(r => !r.isArchived);
const archivedReqs = rawData.requirements.filter(r => r.isArchived);

console.log('Active Reqs:', activeReqs.length);
console.log('Archived Reqs:', archivedReqs.length);
console.log('Total Reqs:', rawData.requirements.length);

const nonFlowReqIds = new Set(['RN-MAT-005', 'RN-MAT-MMG060']);
const calcFlowReqs = activeReqs.filter(r => !nonFlowReqIds.has(r.id));
console.log('Flow Required Count:', calcFlowReqs.length);

// Nodes & Edges
let allNodes = [];
let allEdges = [];
Object.entries(rawData.flows || {}).forEach(([k, flow]) => {
  if (flow.nodes) allNodes = allNodes.concat(flow.nodes);
  if (flow.edges) allEdges = allEdges.concat(flow.edges);
});

console.log('Total Active Nodes:', allNodes.length);
console.log('Total Active Edges:', allEdges.length);
console.log('Total Cross Flow Edges:', (rawData.crossFlowEdges || []).length);
console.log('Total Business Rules:', (rawData.businessRules || []).length);

// 10 Sample Tracing
console.log('\n=== 10 SAMPLE END-TO-END TRACING ===');
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

const sampleResults = [];
samples.forEach((reqId, idx) => {
  const req = activeReqs.find(r => r.id === reqId);
  if (!req) {
    sampleResults.push({ sample: idx + 1, reqId, status: 'NOT FOUND' });
    return;
  }

  // Find node
  const matchedNodes = allNodes.filter(n => (n.requirementIds || []).includes(reqId) || n.id === req.flowNodeId);
  // Find flow
  const matchedFlowKey = Object.keys(rawData.flows || {}).find(k => {
    const f = rawData.flows[k];
    return (f.nodes || []).some(n => (n.requirementIds || []).includes(reqId) || n.id === req.flowNodeId);
  });
  // Find edges related to matched nodes
  const nodeIds = matchedNodes.map(n => n.id);
  const matchedEdges = allEdges.filter(e => nodeIds.includes(e.source) || nodeIds.includes(e.target));
  // Find rules
  const matchedRules = (rawData.businessRules || []).filter(br => 
    (br.requirementIds || []).includes(reqId) || (req.businessRuleIds || []).includes(br.id)
  );

  sampleResults.push({
    sample: idx + 1,
    reqId,
    title: req.title,
    actor: req.actor,
    module: req.module,
    feature: req.feature,
    flow: matchedFlowKey || req.flow,
    nodes: nodeIds,
    edgesCount: matchedEdges.length,
    rules: matchedRules.map(r => r.id),
    status: (matchedNodes.length > 0 && matchedRules.length > 0) ? 'PASS' : 'INCOMPLETE'
  });
});

console.log(JSON.stringify(sampleResults, null, 2));
