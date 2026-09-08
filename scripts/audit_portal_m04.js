import fs from 'fs';
import puppeteer from 'puppeteer';

const JS_DATA_PATH = 'js/data/process-mapping-baseline.js';

console.log("=== STARTING PORTAL OUTPUT AUDIT M04 ===");

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
const sourceData = JSON.parse(jsonContent);

(async () => {
  console.log("Launching puppeteer...");
  let browser;
  try {
     browser = await puppeteer.launch({ headless: 'new' });
  } catch (e) {
     console.error("Puppeteer launch failed:", e);
     process.exit(1);
  }
  
  const page = await browser.newPage();
  
  console.log("Navigating to portal...");
  await page.goto('http://localhost:3000/process-mapping.html', { waitUntil: 'networkidle2' });
  await page.waitForTimeout(3000); 

  console.log("Extracting UI data...");
  const uiData = await page.evaluate(() => {
    let renderedText = document.body.innerText;
    return {
      fullText: renderedText
    };
  });
  
  await browser.close();
  
  console.log("Comparing with source data...");
  let matrix = [];
  let findings = [];
  let mismatchCount = 0;
  
  const targets = [
    'RN-OKL-005', 'RN-OKL-007', 'RN-OKL-008', 'RN-OKL-010', 'RN-OKL-012', 
    'RN-REG-005', 'RN-REG-006', 'RN-REG-010', 'RN-OKL-014', 'RN-OKL-004', 'RN-OKL-009'
  ];
  
  targets.forEach(id => {
    let srcReq = sourceData.requirements.find(r => r.id === id);
    if (!srcReq) return;
    
    let renderStr = uiData.fullText;
    
    const checkField = (field, srcVal) => {
       if (!srcVal) return;
       // Fuzzy match due to UI formatting (newlines, etc.)
       // Instead of strict exact match which might fail due to whitespace, we check substring presence
       let cleanSrc = srcVal.replace(/\\s+/g, ' ').trim();
       let cleanRender = renderStr.replace(/\\s+/g, ' ');
       
       let isRendered = cleanRender.includes(cleanSrc);
       matrix.push({
         id, field, srcVal: cleanSrc, rendered: isRendered ? 'MATCH' : 'MISMATCH / NOT RENDERED'
       });
       if (!isRendered) {
         mismatchCount++;
         findings.push(`[${id}] ${field} UI mismatch. Src: "${cleanSrc}"`);
       }
    };
    
    checkField('title', srcReq.title);
    checkField('input', srcReq.input);
    checkField('validation', srcReq.validation);
    checkField('output', srcReq.output);
  });
  
  let legacyKeywords = ['Plot Entres', 'kayu entres', 'potong stok otomatis', 'kurangi stok otomatis', 'ledger stok'];
  let legacyFindings = [];
  let cleanRenderForLegacy = uiData.fullText.replace(/\\s+/g, ' ');
  legacyKeywords.forEach(kw => {
     if (cleanRenderForLegacy.includes(kw)) {
        legacyFindings.push(kw);
     }
  });
  
  let finalVerdict = (mismatchCount === 0 && legacyFindings.length === 0) ? "PASS" : "FAIL";

  const md = `# PORTAL OUTPUT AUDIT M04

## 1. Scope
Audit rendering Portal Process Mapping untuk modul M04 (Okulasi/Grafting), mencocokkan tampilan UI aktif dengan data sumber pasca-mutasi.

## 2. Source Reference
1. \`MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md\`
2. \`MUTATION_REPORT_M04_OKULASI.md\`

## 3. Module Verification
- **Module Name**: M04 Okulasi (Grafting)
- **Status**: ${uiData.fullText.includes("Okulasi (Grafting)") ? "MATCH" : "MISMATCH"}

## 4. Legacy UI Scan
Pencarian teks \`Plot Entres\`, \`kayu entres\`, \`ledger stok\`, dsb pada DOM render aktif:
${legacyFindings.length === 0 ? '- **CLEAN**: Tidak ditemukan teks legacy pada UI.' : '- **FOUND**: ' + legacyFindings.join(', ')}

## 5. Source vs Portal Matrix
| Field | ID | Source Value | Result |
|-------|----|--------------|--------|
${matrix.map(m => `| ${m.field} | ${m.id} | ${m.srcVal} | ${m.rendered} |`).join('\n')}

## 6. Findings
${findings.length === 0 ? 'Semua field RENDERED MATCH dengan Source.' : findings.join('\n')}

## 7. Final Status
**${finalVerdict}**
`;

  fs.writeFileSync('PORTAL_OUTPUT_AUDIT_M04.md', md);
  console.log("✅ Written PORTAL_OUTPUT_AUDIT_M04.md");

})();
