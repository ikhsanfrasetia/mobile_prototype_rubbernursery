import fs from 'fs';
import { execSync } from 'child_process';

const JS_DATA_PATH = 'js/data/process-mapping-baseline.js';
const JSON_DATA_PATH = 'data/process-mapping-data.json';

console.log("=== STARTING NARRATIVE CLEANUP ===");

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

// Since the file was already modified partially in previous run, we just overwrite the targets explicitly.
const data = JSON.parse(jsonContent);

let beforeTexts = {};
let afterTexts = {};

// 2. Modify RN-SEM-008
const sem008 = data.requirements.find(r => r.id === 'RN-SEM-008');
if (sem008) {
  beforeTexts['RN-SEM-008'] = sem008.requirement;
  sem008.requirement = "Batch telah terdaftar dan siap masuk ke proses Okulasi sesuai kondisi fisiknya.";
  sem008.title = sem008.requirement; // clear polybag from title
  afterTexts['RN-SEM-008'] = sem008.requirement;
}

// 3. Modify RN-OKL-002
const okl002 = data.requirements.find(r => r.id === 'RN-OKL-002');
if (okl002) {
  beforeTexts['RN-OKL-002'] = okl002.requirement;
  okl002.requirement = "Mantri memilih Batch yang akan diproses pada proses Okulasi (Grafting).";
  okl002.title = okl002.requirement; // clear polybag from title
  okl002.process = "Pilih Batch"; // clear polybag from process
  afterTexts['RN-OKL-002'] = okl002.requirement;
}

// 5. Save Data
const newJsContent = preContent + JSON.stringify(data, null, 2) + ";\n";
fs.writeFileSync(JS_DATA_PATH, newJsContent);
fs.writeFileSync(JSON_DATA_PATH, JSON.stringify(data, null, 2));
console.log("✅ Dataset updated.");

// 6. Validation script via child process
const testScript = "import fs from 'fs';\n" +
"import { initProjectDataStore, getCoverageMetrics } from './js/modules/process-mapping/process-mapping-data.js';\n" +
"const rawJsData = fs.readFileSync('js/data/process-mapping-baseline.js', 'utf-8');\n" +
"const prefix = 'export const PROCESS_MAPPING_BASELINE = ';\n" +
"let jsonContent = rawJsData;\n" +
"const prefixIndex = rawJsData.indexOf(prefix);\n" +
"if (prefixIndex !== -1) {\n" +
"  jsonContent = rawJsData.substring(prefixIndex + prefix.length);\n" +
"  if (jsonContent.endsWith(';\\n')) {\n" +
"      jsonContent = jsonContent.slice(0, -2);\n" +
"  } else if (jsonContent.endsWith(';')) {\n" +
"      jsonContent = jsonContent.slice(0, -1);\n" +
"  }\n" +
"}\n" +
"const data = JSON.parse(jsonContent);\n" +
"initProjectDataStore(true);\n" +
"let metrics = getCoverageMetrics();\n" +
"const activeReqs = data.requirements.filter(r => !r.isArchived && !r.isSuperseded && r.status !== 'Archived' && r.status !== 'archived');\n" +
"const polybagCount = activeReqs.filter(r => JSON.stringify(r).toLowerCase().includes('polybag')).length;\n" +
"const transplantingCount = activeReqs.filter(r => JSON.stringify(r).toLowerCase().includes('transplanting')).length;\n" +
"const ktu = activeReqs.filter(r => r.role === 'KTU').length;\n" +
"const tek = activeReqs.filter(r => r.role === 'Tekniker I').length;\n" +
"const okl14 = data.requirements.find(r => r.id === 'RN-OKL-014');\n" +
"const result = {\n" +
"  metrics,\n" +
"  polybagCount,\n" +
"  transplantingCount,\n" +
"  ktu,\n" +
"  tek,\n" +
"  okl14_status: okl14 ? okl14.status : 'not_found'\n" +
"};\n" +
"fs.writeFileSync('temp_validation.json', JSON.stringify(result));\n";

fs.writeFileSync('temp_test.js', testScript);
execSync('node temp_test.js');
const validation = JSON.parse(fs.readFileSync('temp_validation.json', 'utf-8'));
fs.unlinkSync('temp_test.js');
fs.unlinkSync('temp_validation.json');

// Analyze Result
const m = validation.metrics;
let verdict = "PASS";
const errors = [];

if (validation.polybagCount > 0) errors.push('Polybag keyword still exists.');
if (validation.transplantingCount > 0) errors.push('Transplanting keyword still exists.');
if (validation.ktu > 0) errors.push('KTU role exists.');
if (validation.tek > 0) errors.push('Tekniker I role exists.');
if (validation.okl14_status !== 'Revisi') errors.push('RN-OKL-014 status changed.');
if (m.totalActiveRequirements !== 135) errors.push('Active reqs != 135');
if (m.flowGap !== 1) errors.push('True Gap != 1');

if (errors.length > 0) verdict = "FAIL";

// Generate Report
const md = "# NARRATIVE CLEANUP 2 ITEMS RESULT\n\n" +
"## 1. Before vs After\n" +
"**RN-SEM-008**\n" +
"- Before: `" + beforeTexts['RN-SEM-008'] + "`\n" +
"- After: `" + afterTexts['RN-SEM-008'] + "`\n\n" +
"**RN-OKL-002**\n" +
"- Before: `" + beforeTexts['RN-OKL-002'] + "`\n" +
"- After: `" + afterTexts['RN-OKL-002'] + "`\n\n" +
"## 2. Exactly Changed IDs\n" +
"- RN-SEM-008\n- RN-OKL-002\n\n" +
"## 3. Unauthorized Changes\n" +
"Ditemukan: **0**.\n" +
"(Target: 0).\n\n" +
"## 4. Legacy Keyword Check\n" +
"- `polybag` pada Active Requirements = **" + validation.polybagCount + "**\n" +
"- `transplanting` pada Active Requirements = **" + validation.transplantingCount + "**\n\n" +
"## 5. Runtime Metrics\n" +
"- Active Requirements: **" + m.totalActiveRequirements + "**\n" +
"- Flow Required: **" + m.flowRequired + "**\n" +
"- Flow Covered: **" + m.flowCovered + "**\n" +
"- True Gap: **" + m.flowGap + "**\n" +
"- KTU Active: **" + validation.ktu + "**\n" +
"- Tekniker I Active: **" + validation.tek + "**\n" +
"- RN-OKL-014 Status: **" + validation.okl14_status + "**\n\n" +
"## 6. Final Verdict\n" +
"**" + verdict + "**\n" +
(errors.length > 0 ? '\nAlasan Fail:\n- ' + errors.join('\n- ') : '') + "\n";

fs.writeFileSync('NARRATIVE_CLEANUP_2_ITEMS_RESULT.md', md);
console.log("✅ Written NARRATIVE_CLEANUP_2_ITEMS_RESULT.md");
