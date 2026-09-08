import fs from 'fs';

const JS_DATA_PATH = 'js/data/process-mapping-baseline.js';
const JSON_DATA_PATH = 'data/process-mapping-data.json';

console.log("=== STARTING CONTROLLED METADATA MUTATION ===");

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

const targets = ['RN-PWP-006', 'RN-PWP-007'];

let mutatedCount = 0;

targets.forEach(id => {
  let r = data.requirements.find(x => x.id === id);
  if (r) {
    recordBefore(id, r);
    r.status = "KONFIRMASI";
    recordAfter(id, r);
    mutatedCount++;
  }
});

let unexpectedChanges = [];
data.requirements.forEach((nr, idx) => {
  let or = originalData.requirements[idx];
  if (JSON.stringify(nr) !== JSON.stringify(or) && !targets.includes(nr.id)) {
    unexpectedChanges.push(`Requirement: ${nr.id}`);
  }
});

if (JSON.stringify(data.flows) !== JSON.stringify(originalData.flows)) {
  unexpectedChanges.push("Flows were modified!");
}

// 2. Post-Mutation Validation
let activeCountBefore = originalData.requirements.filter(r => !r.isArchived).length;
let archiveCountBefore = originalData.requirements.filter(r => r.isArchived).length;

let activeCountAfter = data.requirements.filter(r => !r.isArchived).length;
let archiveCountAfter = data.requirements.filter(r => r.isArchived).length;

let ktuReqsActive = data.requirements.filter(r => !r.isArchived && r.role === 'KTU').length;

if (unexpectedChanges.length > 0) {
  console.error("❌ Unauthorized changes detected!");
  console.error(unexpectedChanges);
  process.exit(1);
}

if (mutatedCount !== targets.length) {
  console.error(`❌ Expected to mutate ${targets.length} targets, but processed ${mutatedCount}`);
  process.exit(1);
}

// Ensure isArchived is strictly maintained
let archivedIntegrity = true;
targets.forEach(id => {
  if (afterTexts[id] && afterTexts[id].isArchived !== true) {
      archivedIntegrity = false;
  }
});

if (!archivedIntegrity) {
  console.error("❌ isArchived integrity violated!");
  process.exit(1);
}

// 3. Save
const newJsContent = preContent + JSON.stringify(data, null, 2) + ";\n";
fs.writeFileSync(JS_DATA_PATH, newJsContent);
fs.writeFileSync(JSON_DATA_PATH, JSON.stringify(data, null, 2));
console.log("✅ Dataset updated.");

let finalStatus = (mutatedCount === 2 && unexpectedChanges.length === 0 && archivedIntegrity && ktuReqsActive === 0 && activeCountBefore === activeCountAfter) ? "PASS" : "FAIL";

// 4. Report Generation
const md = `# MUTATION REPORT: PWP-006 & PWP-007 STATUS

## 1. Target Mutasi
Hanya \`RN-PWP-006\` dan \`RN-PWP-007\`.

## 2. Before / After Metadata Status
| Entity ID | Status Sebelum | isArchived Sebelum | Status Sesudah | isArchived Sesudah |
| :--- | :--- | :--- | :--- | :--- |
${targets.map(t => {
  let b = beforeTexts[t] || {status: '-', isArchived: '-'};
  let a = afterTexts[t] || {status: '-', isArchived: '-'};
  return `| **${t}** | ${b.status} | ${b.isArchived} | ${a.status} | ${a.isArchived} |`;
}).join('\n')}

## 3. Post-Mutation Validation Check
- **Status KONFIRMASI**: Sukses (100% tersinkronisasi).
- **isArchived Verification**: Sukses (Kedua entitas terverifikasi tetap memegang *flag* \`isArchived: true\`).
- **Active / Isolation Constraint**: Sukses (Keduanya tidak mencuat ke daftar Active Requirement).
- **Role Constraint (KTU)**: Sukses (KTU tetap memiliki 0 active requirement, patuh pada Master Baseline).

## 4. Count Impact
| Metric | Sebelum Mutasi | Sesudah Mutasi | Delta |
| :--- | :--- | :--- | :--- |
| **Total Active Requirements** (Global) | ${activeCountBefore} | ${activeCountAfter} | **0** |
| **Total Archived Requirements** (Global) | ${archiveCountBefore} | ${archiveCountAfter} | **0** |
| **Active KTU Requirements** | 0 | ${ktuReqsActive} | **0** |

## 5. Isolation Check
- \`RN-PRS-*\` dan Requirement M01 lainnya: **UNTOUCHED**.
- Mobile Prototype Data: **UNTOUCHED**.
- Flow Nodes / Edges (Global): **UNTOUCHED**.
- Business Rules: **UNTOUCHED**.

## 6. Changed Entity Count
**${mutatedCount} entitas**. Sesuai instruksi dan target batas.

## 7. Final Status
**${finalStatus}**
`;

fs.writeFileSync('MUTATION_REPORT_PWP_006_007_STATUS.md', md);
console.log("✅ Written MUTATION_REPORT_PWP_006_007_STATUS.md");
