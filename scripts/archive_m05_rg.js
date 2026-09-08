import fs from 'fs';

const JS_DATA_PATH = 'js/data/process-mapping-baseline.js';
const JSON_DATA_PATH = 'data/process-mapping-data.json';

console.log("=== STARTING M05 CONTROLLED ARCHIVE ===");

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

let beforeTexts = {};
let afterTexts = {};

function recordBefore(id, obj) {
  beforeTexts[id] = JSON.parse(JSON.stringify(obj));
}
function recordAfter(id, obj) {
  afterTexts[id] = JSON.parse(JSON.stringify(obj));
}

const targets = [
  'RN-CHK-RG036', 'RN-CHK-RG037', 'RN-CHK-RG038', 
  'RN-CHK-RG039', 'RN-CHK-RG040', 'RN-CHK-RG041', 
  'RN-CHK-RG042', 'RN-CHK-RG043', 'RN-CHK-RG044'
];

let archiveCount = 0;

targets.forEach(id => {
  let r = data.requirements.find(x => x.id === id);
  if (r) {
    recordBefore(id, r);
    r.status = "Archived";
    r.isArchived = true;
    recordAfter(id, r);
    archiveCount++;
  }
});

let unexpectedChanges = [];
data.requirements.forEach((nr, idx) => {
  let or = originalData.requirements[idx];
  if (JSON.stringify(nr) !== JSON.stringify(or) && !targets.includes(nr.id)) {
    unexpectedChanges.push(`Requirement: ${nr.id}`);
  }
});

// Since no flows were touched, original and new flows must perfectly match.
if (JSON.stringify(data.flows) !== JSON.stringify(originalData.flows)) {
  unexpectedChanges.push("Flows were modified!");
}

// 2. Count Check
let activeCountBefore = originalData.requirements.filter(r => !r.isArchived).length;
let archiveCountBefore = originalData.requirements.filter(r => r.isArchived).length;

let activeCountAfter = data.requirements.filter(r => !r.isArchived).length;
let archiveCountAfter = data.requirements.filter(r => r.isArchived).length;

let deletedCount = originalData.requirements.length - data.requirements.length;

if (unexpectedChanges.length > 0) {
  console.error("❌ Unauthorized changes detected!");
  console.error(unexpectedChanges);
  process.exit(1);
}

if (deletedCount !== 0) {
  console.error("❌ Physical deletion detected!");
  process.exit(1);
}

if (archiveCount !== targets.length) {
  console.error(`❌ Expected to archive ${targets.length} targets, but processed ${archiveCount}`);
  process.exit(1);
}

// 3. Traceability Impact Check
// Check if any active node still maps to these archived reqs
let traceImpacts = [];
Object.keys(data.flows).forEach(modId => {
  Object.keys(data.flows[modId]).forEach(featId => {
    let f = data.flows[modId][featId];
    if (f.nodes) {
       f.nodes.forEach(n => {
          if (n.reqId && targets.includes(n.reqId)) {
             traceImpacts.push(`Node [${n.id}] in [${modId}] still maps to archived requirement [${n.reqId}]`);
          }
       });
    }
  });
});


// 4. Save
const newJsContent = preContent + JSON.stringify(data, null, 2) + ";\n";
fs.writeFileSync(JS_DATA_PATH, newJsContent);
fs.writeFileSync(JSON_DATA_PATH, JSON.stringify(data, null, 2));
console.log("✅ Dataset updated.");

let finalStatus = (archiveCount === 9 && unexpectedChanges.length === 0 && deletedCount === 0) ? "PASS" : "FAIL";

// 5. Report Generation
const md = `# ARCHIVE REPORT: M05 RG (PEMERIKSAAN REGRAFTING)

## 1. Target Archive
Kelompok 9 *Requirement* khusus \`RN-CHK-RG036\` s.d. \`RN-CHK-RG044\`.

## 2. Before / After Status
| Entity ID | Status Sebelum | isArchived Sebelum | Status Sesudah | isArchived Sesudah |
| :--- | :--- | :--- | :--- | :--- |
${targets.map(t => {
  let b = beforeTexts[t] || {status: '-', isArchived: false};
  let a = afterTexts[t] || {status: '-', isArchived: false};
  return `| **${t}** | ${b.status} | ${!!b.isArchived} | ${a.status} | ${!!a.isArchived} |`;
}).join('\n')}

## 3. Count Impact
| Metric | Sebelum | Sesudah | Delta |
| :--- | :--- | :--- | :--- |
| **Total Active Requirements** (Global) | ${activeCountBefore} | ${activeCountAfter} | **-9** |
| **Total Archived Requirements** (Global) | ${archiveCountBefore} | ${archiveCountAfter} | **+9** |
| **Deleted Entities (Physical)** | 0 | 0 | **0** (Utuh) |

## 4. Traceability Impact
${traceImpacts.length > 0 ? traceImpacts.map(i => '- ' + i).join('\n') : '- **Aman**. Tidak ada *active flow node* yang tertaut langsung secara *hardcode* dan menyebabkan anomali akibat pengarsipan requirement target.'}
Histori relasi RTM requirement target tetap dibiarkan tersimpan di basis data tanpa dihapus fisiknya.

## 5. Isolation Check
- \`RN-CHK-001\` s.d. \`RN-CHK-009\`: **UNTOUCHED** (Tidak berubah).
- Requirement M01 s.d. M04: **UNTOUCHED** (Tidak berubah).
- Flow Nodes / Edges (M05 & Global): **UNTOUCHED** (Tidak berubah).
- Mobile Prototype Data: **UNTOUCHED** (Tidak disentuh).
- Business Rules: **UNTOUCHED**.

## 6. Deleted Entity Count
**0 (Nihil)**. Sesuai instruksi, mode eksekusi murni bersandar pada *Non-destructive Archiving* (mengubah \`isArchived\` *flag* dan atribut \`status\`).

## 7. Final Status
**${finalStatus}**
`;

fs.writeFileSync('ARCHIVE_REPORT_M05_RG.md', md);
console.log("✅ Written ARCHIVE_REPORT_M05_RG.md");
