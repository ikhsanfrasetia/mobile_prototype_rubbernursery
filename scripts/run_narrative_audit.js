import fs from 'fs';
import { initProjectDataStore, getCoverageMetrics } from '../js/modules/process-mapping/process-mapping-data.js';

const DATA_PATH = 'js/data/process-mapping-baseline.js';

const rawJsData = fs.readFileSync(DATA_PATH, 'utf-8');
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

initProjectDataStore(true);
let metrics = getCoverageMetrics();

const activeReqs = data.requirements.filter(r => !r.isArchived && !r.isSuperseded && r.status !== 'Archived' && r.status !== 'archived');

let matchCount = 0;
let reviseCount = 0;
let legacyCount = 0;
let conflictCount = 0;
let holdCount = 0;

let findingsList = [];

// Helper to check keywords
function checkKeywords(text, moduleStr) {
    if (!text) return [];
    const t = text.toLowerCase();
    let issues = [];

    // Global / Legacy Roles
    if (/\bktu\b/.test(t)) issues.push({ type: 'REMOVE LEGACY CONTENT', reason: 'KTU role is deprecated.' });
    if (/\btekniker\b/.test(t)) issues.push({ type: 'REMOVE LEGACY CONTENT', reason: 'Tekniker I role is deprecated.' });
    if (/\btransplanting\b/.test(t)) issues.push({ type: 'REMOVE LEGACY CONTENT', reason: 'Transplanting feature is removed.' });
    if (/\bpolybag\b/.test(t)) issues.push({ type: 'REMOVE LEGACY CONTENT', reason: 'Polybag narrative is unsupported.' });

    // M03
    if (moduleStr && moduleStr.includes('Penyemaian')) {
        if (t.includes('umur kecambah')) issues.push({ type: 'REVISE', reason: 'Umur kecambah belum dikunci.' });
        if (t.includes('diameter')) issues.push({ type: 'REVISE', reason: 'Diameter belum dikunci.' });
        if (t.includes('ukuran')) issues.push({ type: 'REVISE', reason: 'Ukuran belum dikunci.' });
    }

    // M04
    if (moduleStr && moduleStr.includes('Okulasi')) {
        if (t.includes('juru okulasi')) issues.push({ type: 'REMOVE LEGACY CONTENT', reason: 'Juru Okulasi unsupported.' });
        if (t.includes('batas okulasi')) issues.push({ type: 'REVISE', reason: 'Batas okulasi harian unsupported.' });
    }

    // M05
    if (moduleStr && moduleStr.includes('Pemeriksaan')) {
        if (t.includes('umur tempelan')) issues.push({ type: 'REVISE', reason: 'Umur tempelan belum dikunci.' });
        if (t.includes('gps')) issues.push({ type: 'REVISE', reason: 'GPS details unsupported.' });
        if (t.includes('approval tambahan')) issues.push({ type: 'REVISE', reason: 'Approval tambahan unsupported.' });
    }

    // M07
    if (moduleStr && moduleStr.includes('Kebun Entres')) {
        if (t.includes('rasio')) issues.push({ type: 'REVISE', reason: 'Rasio perisai/kayu/meter belum dikunci.' });
        if (t.includes('asisten kepala')) issues.push({ type: 'REVISE', reason: 'Approval Asisten Kepala unsupported.' });
    }

    // M11
    if (moduleStr && moduleStr.includes('Pengeluaran')) {
        if (t.includes('polygon') && !t.includes('histori')) issues.push({ type: 'REVISE', reason: 'Polygon must be info only.' });
        if (t.includes('auto deduction')) issues.push({ type: 'BASELINE CONFLICT', reason: 'Auto deduction not allowed.' });
    }

    return issues;
}

activeReqs.forEach(req => {
    // Check RN-OKL-014 specifically
    if (req.id === 'RN-OKL-014') {
        holdCount++;
        findingsList.push({ id: req.id, type: 'HOLD', reason: 'RN-OKL-014 is explicitly on Hold/Revisi per baseline.', evidence: req.requirement, recommended: 'Hold until baseline defined.' });
        return;
    }

    const issues = checkKeywords(req.requirement + " " + req.title, req.module);

    if (issues.length === 0) {
        matchCount++;
    } else {
        let primaryIssue = issues[0];
        if (issues.some(i => i.type === 'BASELINE CONFLICT')) primaryIssue = issues.find(i => i.type === 'BASELINE CONFLICT');
        else if (issues.some(i => i.type === 'REMOVE LEGACY CONTENT')) primaryIssue = issues.find(i => i.type === 'REMOVE LEGACY CONTENT');

        if (primaryIssue.type === 'REVISE') reviseCount++;
        else if (primaryIssue.type === 'REMOVE LEGACY CONTENT') legacyCount++;
        else if (primaryIssue.type === 'BASELINE CONFLICT') conflictCount++;

        findingsList.push({
            id: req.id,
            type: primaryIssue.type,
            reason: primaryIssue.reason,
            evidence: req.requirement || req.title,
            recommended: 'Sesuaikan dengan Master Baseline / Hapus narasi legacy.'
        });
    }
});

let finalVerdict = "CLEAN";
if (reviseCount > 0 || legacyCount > 0 || conflictCount > 0) finalVerdict = "NOT CLEAN";
else if (holdCount > 0) finalVerdict = "CLEAN WITH FINDINGS";

let reportContent = `# FINAL NARRATIVE INTEGRITY AUDIT — 135 ACTIVE REQUIREMENTS

## 1. Executive Summary
Audit integritas narasi telah dilakukan terhadap tepat **${activeReqs.length} Active Requirements**.
Audit ini memverifikasi teks narasi terhadap \`MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md\` untuk mengidentifikasi keberadaan residu *legacy* maupun *unsupported content*.

## 2. Audit Metrics
- **Total Audited**: ${activeReqs.length}
- **MATCH**: ${matchCount}
- **REVISE**: ${reviseCount}
- **REMOVE LEGACY CONTENT**: ${legacyCount}
- **BASELINE CONFLICT**: ${conflictCount}
- **HOLD**: ${holdCount}

## 3. Daftar Lengkap Req ID Bermasalah / Temuan
${findingsList.length > 0 ? findingsList.map(f => `- **[${f.id}] (${f.type})**: ${f.reason}
  - *Evidence Text*: "${f.evidence.replace(/\n/g, ' ')}"
  - *Recommended Action*: ${f.recommended}`).join('\n') : "Tidak ada Requirement bermasalah ditemukan."}

## 4. Final Recommendation
${finalVerdict === "CLEAN" || finalVerdict === "CLEAN WITH FINDINGS" ? 
"Karena tidak ada *Baseline Conflict* atau narasi *Legacy* yang mencemari requirement aktif, arsitektur data bisa dinyatakan valid secara bisnis. Status *Hold* (RN-OKL-014) merupakan by-design untuk tracking Gap Analysis." : 
"Temuan narasi harus segera dikoreksi pada dataset agar benar-benar mencerminkan Single Source of Truth tanpa asumsi fungsional."}

## 5. Final Verdict
**${finalVerdict}**
`;

fs.writeFileSync('FINAL_NARRATIVE_INTEGRITY_AUDIT_135.md', reportContent);
console.log("✅ Written FINAL_NARRATIVE_INTEGRITY_AUDIT_135.md");
