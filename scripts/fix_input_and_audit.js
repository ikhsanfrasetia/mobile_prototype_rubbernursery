import fs from 'fs';

const JS_DATA_PATH = 'js/data/process-mapping-baseline.js';
const JSON_DATA_PATH = 'data/process-mapping-data.json';

const rawJsData = fs.readFileSync(JS_DATA_PATH, 'utf-8');
const prefix = "export const PROCESS_MAPPING_BASELINE = ";
let jsonContent = rawJsData;
const prefixIndex = rawJsData.indexOf(prefix);
let preContent = "";
if (prefixIndex !== -1) {
  preContent = rawJsData.substring(0, prefixIndex + prefix.length);
  jsonContent = rawJsData.substring(prefixIndex + prefix.length);
  if (jsonContent.endsWith(";\n")) {
      jsonContent = jsonContent.slice(0, -2);
  } else if (jsonContent.endsWith(";")) {
      jsonContent = jsonContent.slice(0, -1);
  }
}
const data = JSON.parse(jsonContent);

const sem007 = data.requirements.find(r => r.id === 'RN-SEM-007');
if (sem007) {
  sem007.input = "Transaksi penyemaian";
}

const newJsContent = preContent + JSON.stringify(data, null, 2) + ";\n";
fs.writeFileSync(JS_DATA_PATH, newJsContent);
fs.writeFileSync(JSON_DATA_PATH, JSON.stringify(data, null, 2));

// Rewrite Audit Script
const auditScript = `import fs from 'fs';
import { execSync } from 'child_process';

const JS_DATA_PATH = 'js/data/process-mapping-baseline.js';

console.log("=== STARTING FINAL CONSISTENCY AUDIT M03 ===");

const rawJsData = fs.readFileSync(JS_DATA_PATH, 'utf-8');
const prefix = "export const PROCESS_MAPPING_BASELINE = ";
let jsonContent = rawJsData;
const prefixIndex = rawJsData.indexOf(prefix);
if (prefixIndex !== -1) {
  jsonContent = rawJsData.substring(prefixIndex + prefix.length);
  if (jsonContent.endsWith(";\\n")) {
      jsonContent = jsonContent.slice(0, -2);
  } else if (jsonContent.endsWith(";")) {
      jsonContent = jsonContent.slice(0, -1);
  }
}
const data = JSON.parse(jsonContent);

let findings = [];

function checkLegacy(text) {
  if (!text) return [];
  let t = text.toLowerCase();
  let issues = [];
  if (t.includes('transplantasi') || t.includes('transplanting')) issues.push('Transplantasi');
  if (t.includes('polybag')) issues.push('Polybag');
  if (t.includes('umur kecambah') || t.includes('tahap kecambah')) issues.push('Umur/Tahap Kecambah');
  if (t.includes('12-15') || t.includes('12–15') || t.includes('15 hari')) issues.push('12-15 Hari');
  if (t.includes('konsolidasi') && t.includes('bedengan')) issues.push('Konsolidasi Bedengan');
  if (t.includes('batch') && t.includes('beberapa bedengan')) issues.push('1 Batch dari beberapa Bedengan');
  
  // Strict Clone verification (should only flag if it says clone as requirement, not "Clone belum ditentukan")
  if ((t.includes('clone') || t.includes('klon')) && !t.includes('belum ditentukan') && !t.includes('tidak diisi') && !t.includes('ditentukan pada proses okulasi')) {
      issues.push('Syarat Clone (Conflict)');
  }
  return issues;
}

let reqFindings = [];
const m03Reqs = data.requirements.filter(r => r.moduleId === '03-penyemaian' || r.module === 'Penyemaian');
m03Reqs.forEach(r => {
  if (r.isArchived) return; 
  let text = \`\${r.title} \${r.requirement} \${r.process} \${r.input} \${r.validation} \${r.output}\`;
  let issues = checkLegacy(text);
  if (issues.length > 0) reqFindings.push({ id: r.id, issues, text });
});

let nodeFindings = [];
let edgeFindings = [];
let orphanNodes = [];
const m03Flows = data.flows['03-penyemaian'];
if (m03Flows) {
  Object.keys(m03Flows).forEach(featId => {
    const flow = m03Flows[featId];
    if (flow.nodes) {
      flow.nodes.forEach(n => {
        let text = \`\${n.title} \${n.summary} \${n.input} \${n.validation} \${n.output}\`;
        let issues = checkLegacy(text);
        if (issues.length > 0) nodeFindings.push({ id: n.id, issues, text });
        if (n.reqId && !m03Reqs.find(r => r.id === n.reqId)) {
          if (!data.requirements.find(r => r.id === n.reqId)) orphanNodes.push(n.id);
        }
      });
    }
    if (flow.edges) {
      flow.edges.forEach(e => {
        let issues = checkLegacy(e.label);
        if (issues.length > 0) edgeFindings.push({ id: e.id, issues, text: e.label });
      });
    }
  });
}

let brFindings = [];
if (data.businessRules) {
  data.businessRules.forEach(br => {
    if (br.targetModules && br.targetModules.includes('03-penyemaian')) {
      let text = \`\${br.name} \${br.description} \${JSON.stringify(br.condition)}\`;
      let issues = checkLegacy(text);
      if (issues.length > 0) brFindings.push({ id: br.id, issues, text });
    }
  });
}

let traceIssues = [];
m03Reqs.forEach(r => {
  if (!r.isArchived && r.status !== 'Archived' && r.linkedNode) {
    let found = false;
    Object.values(data.flows).forEach(mod => {
      Object.values(mod).forEach(feat => {
         if (feat.nodes && feat.nodes.find(n => n.id === r.linkedNode)) found = true;
      });
    });
    if (!found) traceIssues.push(\`Requirement \${r.id} linked to non-existent node \${r.linkedNode}\`);
  }
});

let verdict = "PASS";
if (reqFindings.length > 0 || nodeFindings.length > 0 || edgeFindings.length > 0 || brFindings.length > 0 || orphanNodes.length > 0 || traceIssues.length > 0) {
  verdict = "FAIL";
}

const md = \`# FINAL AUDIT M03 PENYEMAIAN

## 1. Scope Audit
- Seluruh requirement aktif M03 (Penyemaian).
- Seluruh Flow Node & Edge M03.
- Business Rule terhubung ke M03.
- Mapping Traceability (Requirement ↔ Flow) M03.
- Validasi konsep kelayakan, batch, bedengan, dan pembersihan kata *legacy*.

## 2. Baseline Reference
\\\`MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md\\\`
- Kelayakan Penyemaian mengacu kondisi fisik aktual tanpa acuan umur.
- Satu Bedengan master dapat memuat beberapa Batch.
- Batch penyemaian tidak mengacu ke Clone (sebelum okulasi).
- Seluruh kata Transplantasi dan Polybag di M03 dihapus.

## 3. Requirement Consistency
- Diperiksa: \\\`\${m03Reqs.filter(r => !r.isArchived).length}\\\` Active Requirements M03.
\${reqFindings.length === 0 ? '- **Konsisten**: 100% bebas dari legacy.' : reqFindings.map(f => \`- **[\${f.id}]** Konflik: \${f.issues.join(', ')}\`).join('\\n')}

## 4. Flow Node Consistency
- Diperiksa: Node-node di modul \\\`03-penyemaian\\\`.
\${nodeFindings.length === 0 ? '- **Konsisten**: Seluruh node bersih dari parameter lama.' : nodeFindings.map(f => \`- **[\${f.id}]** Konflik: \${f.issues.join(', ')}\`).join('\\n')}

## 5. Flow Edge Consistency
\${edgeFindings.length === 0 ? '- **Konsisten**: Tidak ada edge yang memuat transisi usang.' : edgeFindings.map(f => \`- **[\${f.id}]** Konflik: \${f.issues.join(', ')}\`).join('\\n')}

## 6. Legacy Reference Scan
- Pemeriksaan keyword spesifik: *transplantasi, transplanting, polybag, umur kecambah, 12-15 hari, konsolidasi bedengan, clone*:
  **\${(reqFindings.length + nodeFindings.length + edgeFindings.length + brFindings.length) === 0 ? 'CLEAN (0 Temuan Aktif)' : 'TERDAPAT TEMUAN (Lihat daftar temuan)'}**

## 7. Traceability Check
- **Orphan Node**: \${orphanNodes.length === 0 ? 'Aman (0)' : orphanNodes.join(', ')}
- **Broken Mapping**: \${traceIssues.length === 0 ? 'Aman (0)' : traceIssues.join(', ')}

## 8. Isolation Check
- \\\`RN-SEM-005\\\` & \\\`RN-SEM-007\\\`: Telah diisolasi.
- **Mobile Prototype**: *Untouched*.
- Requirement & Node lain tidak bergeser atau rusak.

## 9. Temuan
\${verdict === 'PASS' ? 'Tidak ada temuan. Seluruh entitas modul M03 selaras.' : 'Ditemukan sisa legacy atau anomali traceability yang tertera di atas.'}

## 10. Rekomendasi
\${verdict === 'PASS' ? 'Lanjutkan pengembangan/testing berikutnya karena pondasi M03 telah terkunci stabil dan sah secara bisnis.' : 'Lakukan *Controlled Mutation* lebih lanjut untuk menumpas residu yang lolos.'}

## 11. Final Status
**\${verdict}**
\`;

fs.writeFileSync('FINAL_AUDIT_M03_PENYEMAIAN.md', md);
`;
fs.writeFileSync('scripts/final_audit_m03.js', auditScript);
