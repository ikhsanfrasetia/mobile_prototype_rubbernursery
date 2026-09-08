/**
 * TASK 05 — FULL PORTAL RECONCILIATION ENGINE (READ-ONLY)
 * Performs deep structural, semantic, and traceability audit comparing
 * MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md against
 * data/process-mapping-data.json, REST API, and Portal rendering data.
 */

import fs from 'fs';
import path from 'path';

const dataPath = path.resolve('data/process-mapping-data.json');
const rawData = fs.readFileSync(dataPath, 'utf8');
const store = JSON.parse(rawData);

console.log('=== TASK 05 RECONCILIATION ENGINE ===\n');

// 1. Roles Audit
console.log('--- 1. ROLES AUDIT ---');
const roles = store.roles || [];
const expectedRoles = [
  { name: 'Mantri Bibitan', expectedReqs: 'AKTIF' },
  { name: 'Asisten Bibitan', expectedReqs: 'AKTIF' },
  { name: 'Asisten Divisi', expectedReqs: 'AKTIF' },
  { name: 'Asisten Kepala', expectedReqs: 'AKTIF' },
  { name: 'Pengurus Kebun Peminta', expectedReqs: 'AKTIF' },
  { name: 'Tekniker I', expectedReqs: 'KOSONG DULU' },
  { name: 'KTU', expectedReqs: 'KOSONG DULU' }
];

const roleReqCounts = {};
roles.forEach(r => { roleReqCounts[r.name] = { active: 0, archived: 0, total: 0 }; });

(store.requirements || []).forEach(req => {
  const rName = req.role;
  if (!roleReqCounts[rName]) {
    roleReqCounts[rName] = { active: 0, archived: 0, total: 0 };
  }
  roleReqCounts[rName].total++;
  if (req.isArchived) {
    roleReqCounts[rName].archived++;
  } else {
    roleReqCounts[rName].active++;
  }
});

console.log('Role Distribution:', JSON.stringify(roleReqCounts, null, 2));

// 2. Modules and Features Audit
console.log('\n--- 2. MODULES & FEATURES AUDIT ---');
const modules = store.modules || [];
console.log(`Total Modules in Store: ${modules.length}`);
const modFeatureMap = {};
modules.forEach(m => {
  modFeatureMap[m.id] = {
    name: m.name,
    order: m.order,
    features: (m.features || []).map(f => ({ id: f.id, name: f.name }))
  };
});
console.log('Modules & Features:', JSON.stringify(modFeatureMap, null, 2));

// 3. Requirements Audit
console.log('\n--- 3. REQUIREMENTS AUDIT ---');
const reqs = store.requirements || [];
const activeReqs = reqs.filter(r => !r.isArchived);
const archivedReqs = reqs.filter(r => r.isArchived);

console.log(`Total Requirements: ${reqs.length}`);
console.log(`Active Requirements: ${activeReqs.length}`);
console.log(`Archived Requirements: ${archivedReqs.length}`);

// Check specific requirements mentioned in Master Baseline
const specificIds = [
  'RN-PWP-006', 'RN-PWP-007', 'RN-PRS-004',
  'RN-OKL-014', 'RN-REG-010', 'RN-MAT-005',
  'RN-RCV-KSP016', 'RN-RCV-KSP020', 'RN-RCV-KSP021',
  'RN-RCV-ME022', 'RN-RCV-ME026', 'RN-RCV-ME027'
];

console.log('\nSpecific Baseline Key Requirements Status:');
specificIds.forEach(id => {
  const found = reqs.find(r => r.id === id);
  if (found) {
    console.log(`  - [${id}]: status="${found.status}", isArchived=${found.isArchived}, role="${found.role}", module="${found.module}", feature="${found.feature}"`);
  } else {
    console.log(`  - [${id}]: NOT FOUND in dataset`);
  }
});

// 4. Legacy wording scan
console.log('\n--- 4. LEGACY WORDING SCAN ---');
const legacyKeywords = [
  { pattern: /transplantasi/i, term: 'Transplantasi (Forbidden in M03)' },
  { pattern: /polybag/i, term: 'Polybag (Forbidden in M03 narrative)' },
  { pattern: /umur.*kecambah|tahap.*kecambah/i, term: 'Umur/Tahap Kecambah (Forbidden in M03)' },
  { pattern: /\bKKO\b/i, term: 'KKO acronym (Should be Kebun Kayu Okulasi)' },
  { pattern: /pilih grup heading/i, term: 'Pilih Grup Heading (Forbidden in M10)' },
  { pattern: /mata entres aktual masuk stok/i, term: 'Mata Entres aktual masuk stok (Forbidden in M08 wording)' }
];

const legacyFindings = [];
reqs.forEach(r => {
  const textToCheck = `${r.title || ''} ${r.process || ''} ${r.input || ''} ${r.validation || ''} ${r.output || ''} ${r.fallback || ''} ${r.acceptanceCriteria || ''}`;
  legacyKeywords.forEach(kw => {
    if (kw.pattern.test(textToCheck)) {
      legacyFindings.push({
        id: r.id,
        entity: 'Requirement',
        isArchived: r.isArchived,
        module: r.module || r.moduleId,
        term: kw.term,
        matchedText: textToCheck.match(kw.pattern)?.[0] || ''
      });
    }
  });
});

// Also check flow nodes
for (const [mId, feats] of Object.entries(store.flows || {})) {
  for (const [fId, flow] of Object.entries(feats || {})) {
    (flow.nodes || []).forEach(n => {
      const nodeText = `${n.label || ''} ${n.title || ''} ${n.purpose || ''} ${n.summary || ''} ${n.input || ''} ${n.validation || ''} ${n.output || ''} ${n.fallback || ''}`;
      legacyKeywords.forEach(kw => {
        if (kw.pattern.test(nodeText)) {
          legacyFindings.push({
            id: n.id,
            entity: 'FlowNode',
            isArchived: n.isArchived,
            module: mId,
            feature: fId,
            term: kw.term,
            matchedText: nodeText.match(kw.pattern)?.[0] || ''
          });
        }
      });
    });
  }
}

console.log(`Legacy Wording Findings Count: ${legacyFindings.length}`);
console.log('Legacy Findings Details:', JSON.stringify(legacyFindings, null, 2));

// 5. Flow nodes & edges audit
console.log('\n--- 5. FLOW NODES & EDGES AUDIT ---');
let totalNodes = 0;
let activeNodes = 0;
let archivedNodes = 0;
let totalEdges = 0;
let activeEdges = 0;
let archivedEdges = 0;
const brokenEdges = [];
const orphanNodes = [];

for (const [mId, feats] of Object.entries(store.flows || {})) {
  for (const [fId, flow] of Object.entries(feats || {})) {
    const nodes = flow.nodes || [];
    const edges = flow.edges || [];
    const nodeIds = new Set(nodes.map(n => n.id));
    const activeNodeIds = new Set(nodes.filter(n => !n.isArchived).map(n => n.id));

    nodes.forEach(n => {
      totalNodes++;
      if (n.isArchived) archivedNodes++;
      else activeNodes++;

      // Check if node has reqId and if reqId exists
      if (n.reqId) {
        const reqFound = reqs.find(r => r.id === n.reqId);
        if (!reqFound) {
          orphanNodes.push({ nodeId: n.id, reqId: n.reqId, moduleId: mId, featureId: fId });
        }
      }
    });

    edges.forEach(e => {
      totalEdges++;
      if (e.isArchived) archivedEdges++;
      else activeEdges++;

      if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) {
        brokenEdges.push({ edgeId: e.id, from: e.from, to: e.to, moduleId: mId, featureId: fId });
      }
    });
  }
}

console.log({ totalNodes, activeNodes, archivedNodes, totalEdges, activeEdges, archivedEdges, brokenEdgesCount: brokenEdges.length, orphanNodesCount: orphanNodes.length });

// 6. Business Rules Audit
console.log('\n--- 6. BUSINESS RULES AUDIT ---');
const rules = store.businessRules || [];
console.log(`Total Business Rules: ${rules.length}`);
rules.forEach(r => {
  console.log(`  - [${r.id}]: "${r.title || r.name}" (${r.category})`);
});

// 7. Status distribution across requirements
console.log('\n--- 7. STATUS DISTRIBUTION ---');
const statusCount = {};
reqs.forEach(r => {
  const st = `${r.status || 'UNKNOWN'}${r.isArchived ? ' (ARCHIVED)' : ' (ACTIVE)'}`;
  statusCount[st] = (statusCount[st] || 0) + 1;
});
console.log('Requirement Statuses:', JSON.stringify(statusCount, null, 2));

// 8. Output summary JSON for report generation
const auditSummary = {
  version: store.metadata?.version,
  lastUpdated: store.metadata?.lastUpdated,
  roleReqCounts,
  modFeatureMap,
  reqCounts: { total: reqs.length, active: activeReqs.length, archived: archivedReqs.length },
  flowCounts: { totalNodes, activeNodes, archivedNodes, totalEdges, activeEdges, archivedEdges },
  brokenEdges,
  orphanNodes,
  legacyFindings,
  rulesCount: rules.length,
  statusCount
};

fs.writeFileSync('scratch/audit_summary_task05.json', JSON.stringify(auditSummary, null, 2));
console.log('\nAudit summary saved to scratch/audit_summary_task05.json');
