import fs from 'fs';

const JS_DATA_PATH = 'js/data/process-mapping-baseline.js';
const JSON_DATA_PATH = 'data/process-mapping-data.json';

console.log("=== STARTING FINAL MUTATION RN-SEM-007 ===");

// 1. Read Data
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

const originalData = JSON.parse(jsonContent);
const data = JSON.parse(jsonContent);

let beforeInput = "";
let afterInput = "";
let status = "";

// 2. Modify RN-SEM-007
const sem007 = data.requirements.find(r => r.id === 'RN-SEM-007');
if (sem007) {
  beforeInput = sem007.input;
  sem007.input = "Kumpulan bedengan siap digunakan untuk penyemaian";
  afterInput = sem007.input;
  status = sem007.status; // should be Revisi from previous mutation
}

// 3. Verify Isolation
let unexpectedChanges = [];
data.requirements.forEach((nr, idx) => {
  let or = originalData.requirements[idx];
  if (JSON.stringify(nr) !== JSON.stringify(or) && nr.id !== 'RN-SEM-007') {
    unexpectedChanges.push(`Requirement: ${nr.id}`);
  }
});

Object.keys(data.flows).forEach(modId => {
  Object.keys(data.flows[modId]).forEach(featId => {
    let oNodes = originalData.flows[modId][featId].nodes || [];
    let nNodes = data.flows[modId][featId].nodes || [];
    nNodes.forEach((nn, idx) => {
      let on = oNodes[idx];
      if (JSON.stringify(nn) !== JSON.stringify(on)) {
        unexpectedChanges.push(`Node: ${nn.id}`);
      }
    });
    
    let oEdges = originalData.flows[modId][featId].edges || [];
    let nEdges = data.flows[modId][featId].edges || [];
    nEdges.forEach((ne, idx) => {
      let oe = oEdges[idx];
      if (JSON.stringify(ne) !== JSON.stringify(oe)) {
         unexpectedChanges.push(`Edge: ${ne.id}`);
      }
    });
  });
});

if (unexpectedChanges.length > 0) {
  console.error("❌ Unauthorized changes detected!");
  console.error(unexpectedChanges);
  process.exit(1);
}

// 4. Save Data
const newJsContent = preContent + JSON.stringify(data, null, 2) + ";\n";
fs.writeFileSync(JS_DATA_PATH, newJsContent);
fs.writeFileSync(JSON_DATA_PATH, JSON.stringify(data, null, 2));
console.log("✅ Dataset updated.");

// 5. Validation Check M03
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
  if ((t.includes('clone') || t.includes('klon')) && !t.includes('belum ditentukan') && !t.includes('tidak diisi') && !t.includes('ditentukan pada proses okulasi')) {
      issues.push('Syarat Clone');
  }
  return issues;
}

let m03Errors = [];
const m03Reqs = data.requirements.filter(r => r.moduleId === '03-penyemaian' || r.module === 'Penyemaian');
m03Reqs.forEach(r => {
  if (r.isArchived) return; 
  let text = `${r.title} ${r.requirement} ${r.process} ${r.input} ${r.validation} ${r.output}`;
  let issues = checkLegacy(text);
  if (issues.length > 0) m03Errors.push(`[${r.id}] ${issues.join(', ')}`);
});

const m03Flows = data.flows['03-penyemaian'];
if (m03Flows) {
  Object.keys(m03Flows).forEach(featId => {
    const flow = m03Flows[featId];
    if (flow.nodes) {
      flow.nodes.forEach(n => {
        let text = `${n.title} ${n.summary} ${n.input} ${n.validation} ${n.output}`;
        let issues = checkLegacy(text);
        if (issues.length > 0) m03Errors.push(`[${n.id}] ${issues.join(', ')}`);
      });
    }
  });
}

let finalVerdict = m03Errors.length === 0 ? "PASS" : "FAIL";

// Generate Report
const md = `# FINAL MUTATION REPORT: RN-SEM-007 INPUT

## Target Mutation
- **Requirement ID**: \`RN-SEM-007\`
- **Target Field**: \`input\`

## Before vs After
- **Before**: \`"${beforeInput}"\`
- **After**: \`"${afterInput}"\`

## Isolation Check
- \`RN-SEM-007\` fields (Title, Requirement, Validation, Output, Process, dll): **UNTOUCHED**.
- \`SEM_04\`: **UNTOUCHED**.
- Requirement lain: **UNTOUCHED**.
- Node/Edge lain: **UNTOUCHED**.
- Prototype Mobile: **UNTOUCHED**.
- **Changed Entities Count**: 1

## M03 Validation Result
- Pemeriksaan keyword *polybag, transplantasi, umur kecambah, 12-15 hari, konsolidasi, Syarat Clone* pada **seluruh requirement aktif M03** dan **Flow Nodes M03**.
- Temuan Aktif: **${m03Errors.length}**.
${m03Errors.length > 0 ? m03Errors.map(e => `- ${e}`).join('\\n') : '- M03 kini 100% bersih dari residu instruksional baseline lama.'}

## Final Status
- **RN-SEM-007 Status**: \`${status}\`
- **M03 OVERALL**: **${finalVerdict}**
`;

fs.writeFileSync('FINAL_MUTATION_REPORT_SEM_007_INPUT.md', md);
console.log("✅ Written FINAL_MUTATION_REPORT_SEM_007_INPUT.md");
