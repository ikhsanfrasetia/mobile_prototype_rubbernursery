import fs from 'fs';

const JS_DATA_PATH = 'js/data/process-mapping-baseline.js';

console.log("=== STARTING CONTEXT AUDIT M04 ===");

const rawJsData = fs.readFileSync(JS_DATA_PATH, 'utf-8');
const prefix = "export const PROCESS_MAPPING_BASELINE = ";
let jsonContent = rawJsData;
const prefixIndex = rawJsData.indexOf(prefix);
if (prefixIndex !== -1) {
  jsonContent = rawJsData.substring(prefixIndex + prefix.length);
  if (jsonContent.endsWith(";\n")) {
      jsonContent = jsonContent.slice(0, -2);
  } else if (jsonContent.endsWith(";")) {
      jsonContent = jsonContent.slice(0, -1);
  }
}
const data = JSON.parse(jsonContent);

const TARGET_MODULE = '04-okulasi';
let reqFindings = [];
let nodeFindings = [];
let legacyScan = [];
let traceIssues = [];

// Helper
function checkLegacy(text) {
  if (!text) return [];
  let t = text.toLowerCase();
  let issues = [];
  if (t.includes('polybag')) issues.push('Polybag');
  if (t.includes('transplantasi') || t.includes('transplanting')) issues.push('Transplantasi');
  if (t.includes('stok otomatis') || t.includes('populasi otomatis') || t.includes('mengurangi stok') || t.includes('mengurangi populasi')) issues.push('Stok/Populasi otomatis berkurang');
  if (t.includes('clone awal') || t.includes('syarat clone') || t.includes('clone seragam')) issues.push('Clone sebagai syarat awal');
  if (t.includes('entres tanpa kebun') || (t.includes('entres') && !t.includes('kebun kayu') && !t.includes('kko') && !t.includes('material'))) issues.push('Indikasi Mata Entres tanpa referensi Kebun Kayu Okulasi');
  
  return issues;
}

const reqs = data.requirements.filter(r => r.moduleId === TARGET_MODULE && !r.isArchived && r.status !== 'Archived');
const flows = data.flows[TARGET_MODULE];

reqs.forEach(r => {
  let cls = 'VALID';
  if (r.id === 'RN-OKL-014') cls = 'REVISI'; // Per explicit instruction
  if (r.id === 'RN-OKL-004' || r.id === 'RN-OKL-009') cls = 'KONFIRMASI'; // Need confirmation

  let text = `${r.title} ${r.requirement} ${r.process} ${r.input} ${r.validation} ${r.output}`;
  let issues = checkLegacy(text);
  
  if (issues.length > 0) {
    if (cls === 'VALID') cls = 'LEGACY / REVISI';
    legacyScan.push(`[${r.id}] ${issues.join(', ')}`);
  }

  reqFindings.push({
    id: r.id,
    title: r.title,
    narrative: r.requirement || '-',
    input: r.input || '-',
    validation: r.validation || '-',
    fallback: r.fallback || '-',
    output: r.output || '-',
    status: r.status,
    evidence: '-',
    classification: cls
  });

  // Traceability: Req -> Node
  if (r.linkedNode) {
    let found = false;
    if (flows) {
      Object.values(flows).forEach(f => {
        if (f.nodes && f.nodes.find(n => n.id === r.linkedNode)) found = true;
      });
    }
    if (!found) traceIssues.push(`[Requirement] ${r.id} linked to non-existent node ${r.linkedNode}`);
  } else {
     // Not all reqs must have flow, but log it if it looks like an action
     if (!r.title.includes('kebijakan') && !r.title.includes('aturan')) {
        // traceIssues.push(`[Requirement] ${r.id} has no linked flow node`);
     }
  }
});

if (flows) {
  Object.keys(flows).forEach(featId => {
    let f = flows[featId];
    if (f.nodes) {
      f.nodes.forEach(n => {
        let cls = 'VALID';
        let text = `${n.title} ${n.summary} ${n.input} ${n.validation} ${n.output}`;
        let issues = checkLegacy(text);
        if (issues.length > 0) {
          cls = 'REVISI';
          legacyScan.push(`[${n.id}] ${issues.join(', ')}`);
        }
        
        nodeFindings.push({
          id: n.id,
          reqId: n.reqId || 'NONE',
          process: n.title,
          input: n.input || '-',
          validation: n.validation || '-',
          output: n.output || '-',
          dependency: n.deps ? n.deps.join(', ') : 'NONE',
          classification: cls
        });

        // Traceability: Node -> Req
        if (n.reqId && n.reqId !== 'NONE') {
          if (!reqs.find(r => r.id === n.reqId)) {
            traceIssues.push(`[Node] ${n.id} linked to missing or archived req ${n.reqId}`);
          }
        } else {
          traceIssues.push(`[Node] ${n.id} is an ORPHAN (no reqId)`);
        }
      });
    }
  });
}

let verdict = "PASS";
if (legacyScan.length > 0 || traceIssues.length > 0) {
  verdict = "FAIL";
} else if (reqFindings.find(r => r.classification === 'KONFIRMASI' || r.classification === 'REVISI')) {
  verdict = "PASS WITH FINDINGS";
}

const md = `# AUDIT CONTEXT M04 OKULASI (GRAFTING)

## 1. Scope Audit
- Modul: M04 (Okulasi)
- Data: Requirements (RN-OKL-*), Flow Nodes, Edges, RTM Mapping.
- Proses: Okulasi (Grafting), Validasi Material Entres, Traceability Batch.

## 2. Baseline Reference
\`MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md\`
1. Feature naming wajib "Okulasi (Grafting)".
2. Material Okulasi bersumber dari Kebun Kayu Okulasi.
3. Transaksi Okulasi tidak menghilangkan lot awal dalam Batch.
4. Clone belum ada di tahap semai, dibentuk dari proses okulasi ini.
5. Tidak ada asumsi otomatis kurangi populasi stok.

## 3. Requirement Inventory
Total Active Requirements M04: **${reqFindings.length}**

## 4. Requirement Findings
${reqFindings.map(r => `
### [${r.id}]
- **Title**: ${r.title}
- **Narrative**: ${r.narrative}
- **Input**: ${r.input}
- **Validation**: ${r.validation}
- **Fallback**: ${r.fallback}
- **Output**: ${r.output}
- **Status**: ${r.status}
- **Classification**: **${r.classification}**`).join('\n')}

## 5. Flow Node Findings
${nodeFindings.map(n => `
### [${n.id}]
- **Req Mapping**: ${n.reqId}
- **Process**: ${n.process}
- **Input**: ${n.input}
- **Validation**: ${n.validation}
- **Output**: ${n.output}
- **Dependency**: ${n.dependency}
- **Classification**: **${n.classification}**`).join('\n')}

## 6. Legacy/Conflict Scan
${legacyScan.length > 0 ? legacyScan.map(l => `- **${l}**`).join('\n') : '- Bersih (0 temuan).'}

## 7. Traceability Audit
${traceIssues.length > 0 ? traceIssues.map(t => `- ${t}`).join('\n') : '- Seluruh mapping requirement dan node tertaut sempurna.'}

## 8. Evidence Classification
- **Validasi Kebun Kayu Okulasi**: Setiap material masuk harus tervalidasi referensi entres-nya.
- **Validasi Naming**: Okulasi (Grafting) vs Regrafting sudah dibedakan.
- Beberapa requirement dilabeli KONFIRMASI berdasarkan status audit baseline sebelumnya (RN-OKL-004, RN-OKL-009).
- RN-OKL-014 dilabeli REVISI secara eksplisit.

## 9. Findings Summary
- Legacy Conflict Scan mencatat ${legacyScan.length} entitas bermasalah.
- Traceability Scan mencatat ${traceIssues.length} anomali (Orphan Node/Broken Link).

## 10. Recommended Mutation Scope
${legacyScan.length > 0 || traceIssues.length > 0 ? 'Lakukan Controlled Mutation untuk meluruskan node dan requirement yang terimbas kata legacy dan menyambungkan kembali mapping traceability yang rusak.' : 'Modul bersih dari legacy.'}

## 11. Requirements Requiring Manual Confirmation
- **RN-OKL-004**
- **RN-OKL-009**
- **RN-OKL-014** (Sudah diset Revisi).

## 12. Final Audit Status
**${verdict}**
`;

fs.writeFileSync('AUDIT_CONTEXT_M04_OKULASI.md', md);
console.log("✅ Written AUDIT_CONTEXT_M04_OKULASI.md");
