import fs from 'fs';

const JS_DATA_PATH = 'js/data/process-mapping-baseline.js';

console.log("=== STARTING CONTEXT AUDIT M01 ===");

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

let reqFindings = [];
let nodeFindings = [];
let legacyScan = [];
let traceIssues = [];

function checkLegacy(text) {
  if (!text) return [];
  let t = text.toLowerCase();
  let issues = [];
  
  // Checking formulas that differ or wrong logic
  if (t.includes('formula') && !t.includes('total block area') && !t.includes('non-effective area')) {
      if (t.includes('luas') && t.includes('sph')) {
        // Might be using another formula wording
        issues.push('Potensi beda wording Formula');
      }
  }

  if (t.includes('otomatis disetujui') || t.includes('sistem memutuskan') || t.includes('otomatis memutuskan')) issues.push('Keputusan otomatis sistem');
  if (t.includes('1 blok') || t.includes('satu blok tujuan') || t.includes('hanya satu blok')) issues.push('1 Program melayani 1 Blok (1-to-1 strict)');
  if (t.includes('input manual stok') || t.includes('input stok manual')) issues.push('Input stok manual');
  
  return issues;
}

const m01Reqs = data.requirements.filter(r => r.id.startsWith('RN-KBT-') || r.moduleId === '01-kebutuhan' || r.id.startsWith('RN-PRG-'));

// Searching flows for M01
let m01Flows = {};
Object.keys(data.flows).forEach(k => {
   if (k.toLowerCase().includes('01') || k.toLowerCase().includes('kebutuhan') || k.toLowerCase().includes('program')) {
      m01Flows[k] = data.flows[k];
   }
});

m01Reqs.forEach(r => {
  if (r.isArchived) return;

  let cls = 'VALID';
  let text = `${r.title} ${r.requirement} ${r.process} ${r.input} ${r.validation} ${r.output}`;
  let issues = checkLegacy(text);
  
  // Specific baseline checks
  if (text.includes('1 blok') || text.toLowerCase().includes('satu blok')) {
     issues.push('Batasan 1 Blok Terdeteksi');
  }

  if (issues.length > 0) {
    cls = 'REVISI / LEGACY';
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
    actor: r.role || '-',
    classification: cls
  });

  // Traceability: Req -> Node
  if (r.linkedNode) {
    let found = false;
    Object.keys(m01Flows).forEach(modKey => {
      Object.values(m01Flows[modKey]).forEach(f => {
         if (f.nodes && f.nodes.find(n => n.id === r.linkedNode)) found = true;
      });
    });
    if (!found) {
       Object.values(data.flows).forEach(mod => {
         Object.values(mod).forEach(f => {
            if (f.nodes && f.nodes.find(n => n.id === r.linkedNode)) found = true;
         });
       });
       if (!found) traceIssues.push(`[Requirement] ${r.id} linked to missing node ${r.linkedNode}`);
    }
  }
});

Object.keys(m01Flows).forEach(modKey => {
  Object.keys(m01Flows[modKey]).forEach(featId => {
    let f = m01Flows[modKey][featId];
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

        // Traceability Node -> Req
        if (n.reqId && n.reqId !== 'NONE') {
          if (!m01Reqs.find(r => r.id === n.reqId)) {
            traceIssues.push(`[Node] ${n.id} linked to missing or archived req ${n.reqId}`);
          }
        } else {
          traceIssues.push(`[Node] ${n.id} is an ORPHAN (no reqId)`);
        }
      });
    }
  });
});

let verdict = "PASS";
if (legacyScan.length > 0 || traceIssues.length > 0) {
  verdict = "FAIL";
} else if (reqFindings.find(r => r.classification === 'KONFIRMASI' || r.classification.includes('REVISI'))) {
  verdict = "PASS WITH FINDINGS";
}

const md = `# AUDIT CONTEXT M01: PROGRAM & KEBUTUHAN BIBIT

## 1. Scope Audit
- Modul: M01 (Kebutuhan Bibit & Program Nursery)
- Data: Requirements (RN-KBT-*, dll), Flow Nodes, Edges, Traceability Mapping.
- Proses: Penyusunan Kebutuhan Bibit berdasarkan Program Replanting dan alokasi ke Program Nursery.

## 2. Baseline Reference
\`MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md\`
1. **Struktur Bisnis**: Program Replanting -> Kebutuhan Bibit -> Program Nursery.
2. **Konteks Mandatory**: Program, Estate, Divisi, Blok, Clone, Luas Tanam, Luas Non Efektif, SPH, Kebutuhan Bibit, Periode Kebutuhan.
3. **Formula Mandatory**: \`(Total Block Area - Total Non-effective Area) × SPH\`.
4. **Keputusan Sistem**: Sistem memberi referensi perbandingan (Kebutuhan vs Stok); pengguna menentukan keputusan akhir.
5. **Program Nursery**: Melayani multi-blok, terikat Clone, dan direalisasikan lewat potong saldo Batch.

## 3. Requirement Inventory
Total Active Requirements M01: **${reqFindings.length}**

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
- **Actor**: ${r.actor}
- **Classification**: **${r.classification}**`).join('\n')}

## 5. Flow Node Findings
${nodeFindings.map(n => `
### [${n.id}]
- **Process**: ${n.process}
- **Input**: ${n.input}
- **Validation**: ${n.validation}
- **Output**: ${n.output}
- **Requirement Mapping**: ${n.reqId}
- **Dependency**: ${n.dependency}
- **Classification**: **${n.classification}**`).join('\n')}

## 6. Legacy/Conflict Scan
${legacyScan.length > 0 ? legacyScan.map(l => `- **${l}**`).join('\n') : '- Bersih (0 temuan konflik logika/legacy).'}

## 7. Traceability Audit
${traceIssues.length > 0 ? traceIssues.map(t => `- ${t}`).join('\n') : '- Seluruh mapping requirement dan node M01 terpaut sempurna.'}

## 8. Evidence Classification
- **Rumus Kebutuhan**: \`(Total Block Area - Total Non-effective Area) × SPH\` (atau terjemahannya)
- **Keputusan**: Terletak di tangan User (Sistem memberi warning saldo, bukan blokir sepihak).

## 9. Findings Summary
- Konflik Logika (Otomatisasi/Batasan Blok): **${legacyScan.length} Temuan**.
- Kerapuhan RTM Traceability: **${traceIssues.length} Temuan**.

## 10. Recommended Mutation Scope
${legacyScan.length > 0 ? '- Mutasi terhadap field yang menyalahi formula atau batas blok. Koreksi node yang salah terkait. Hapus aturan otomatisasi.' : '- Tidak ada mutasi yang mendesak, M01 sudah sesuai baseline.'}

## 11. Manual Confirmation Required
${legacyScan.length > 0 ? 'Beberapa finding terdeteksi. Silakan periksa bagian Legacy Scan.' : 'Tidak ada.'}

## 12. Final Audit Status
**${verdict}**
`;

fs.writeFileSync('AUDIT_CONTEXT_M01.md', md);
console.log("✅ Written AUDIT_CONTEXT_M01.md");
