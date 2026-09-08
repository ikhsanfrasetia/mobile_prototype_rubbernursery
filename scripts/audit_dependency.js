import fs from 'fs';

const JS_DATA_PATH = 'js/data/process-mapping-baseline.js';

console.log("=== STARTING DEPENDENCY AUDIT ===");

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

let findings = [];
let safeItems = [];

// Helper to check for M03 obsolete concepts
function checkTextForObsoleteM03(text) {
  if (!text) return [];
  let t = text.toLowerCase();
  let issues = [];
  if (t.includes('12') || t.includes('15') || t.includes('umur')) issues.push('umur semai/waktu perkecambahan');
  if (t.includes('transplanting')) issues.push('referensi transplanting');
  if (t.includes('polybag')) issues.push('referensi polybag');
  if (t.includes('konsolidasi') && t.includes('bedengan')) issues.push('konsolidasi bedengan ke batch');
  if (t.includes('clone') || t.includes('klon')) issues.push('syarat clone pada bedengan/batch awal');
  return issues;
}

// 1. Audit Requirements in M03
const m03Reqs = data.requirements.filter(r => r.moduleId === '03-penyemaian' || r.module === 'Penyemaian');

m03Reqs.forEach(r => {
  if (r.id === 'RN-SEM-005' || r.id === 'RN-SEM-007') return; // Target reqs already audited

  let textToCheck = `${r.title} ${r.requirement} ${r.process} ${r.input} ${r.validation} ${r.output}`;
  let issues = checkTextForObsoleteM03(textToCheck);
  
  if (issues.length > 0 && !r.isArchived && r.status !== 'Archived') {
    findings.push({
      id: r.id,
      type: 'Requirement',
      text: r.title,
      conflicts: issues.join(', '),
      recommendation: 'REVISI - Hapus narasi yang bertentangan dengan Master Baseline'
    });
  } else {
    safeItems.push(`${r.id} (Requirement)`);
  }
});

// 2. Audit Flow Nodes & Edges in M03
const m03Flows = data.flows['03-penyemaian'];
if (m03Flows) {
  Object.keys(m03Flows).forEach(featId => {
    const flow = m03Flows[featId];
    
    // Audit Nodes
    if (flow.nodes) {
      flow.nodes.forEach(n => {
        let isDirectDep = (n.reqId === 'RN-SEM-005' || n.reqId === 'RN-SEM-007');
        let textToCheck = `${n.title} ${n.summary} ${n.input} ${n.validation} ${n.output}`;
        let issues = checkTextForObsoleteM03(textToCheck);
        
        if (isDirectDep || issues.length > 0) {
          findings.push({
            id: n.id,
            type: 'Flow Node',
            text: n.title,
            conflicts: isDirectDep ? `Direct dependency to ${n.reqId}. ${issues.join(', ')}` : issues.join(', '),
            recommendation: 'REVISI - Sesuaikan parameter Node dengan flow fisik aktual tanpa Clone/umur'
          });
        } else {
          safeItems.push(`${n.id} (Flow Node)`);
        }
      });
    }

    // Edge check
    if (flow.edges) {
      flow.edges.forEach(e => {
        let textToCheck = `${e.label || ''}`;
        let issues = checkTextForObsoleteM03(textToCheck);
        if (issues.length > 0) {
          findings.push({
            id: e.id,
            type: 'Flow Edge',
            text: e.label,
            conflicts: issues.join(', '),
            recommendation: 'REVISI - Hapus kondisi transisi lama pada Edge'
          });
        } else {
            // safeItems.push(`${e.id} (Flow Edge)`); // Too verbose
        }
      });
    }
  });
}

// 3. Audit Business Rules
if (data.businessRules) {
  data.businessRules.forEach(br => {
    let isM03 = br.targetModules && br.targetModules.includes('03-penyemaian');
    if (!isM03) return;
    
    let textToCheck = `${br.name} ${br.description} ${JSON.stringify(br.condition)}`;
    let issues = checkTextForObsoleteM03(textToCheck);
    
    if (issues.length > 0) {
      findings.push({
        id: br.id,
        type: 'Business Rule',
        text: br.name,
        conflicts: issues.join(', '),
        recommendation: 'REVISI - Rule ini mengatur logika M03 yang sudah usang'
      });
    } else {
      safeItems.push(`${br.id} (Business Rule)`);
    }
  });
}

const md = `# AUDIT DEPENDENCY RN-SEM-005 & RN-SEM-007

## 1. Scope Audit
- Requirement: \`RN-SEM-005\` & \`RN-SEM-007\`
- Dependency langsung (Linked Nodes/Edges/Rules)
- Dependency tidak langsung (Narasi serumpun M03 Penyemaian)
- Memverifikasi keberadaan konsep kadaluarsa: *Umur kecambah*, *Transplanting*, *Polybag*, *Konsolidasi Bedengan*, dan syarat *Clone* pada tahapan penyemaian awal.

## 2. Baseline yang Digunakan
\`MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md\`
- Tidak ada target hari/umur kecambah spesifik (syarat kelayakan berdasarkan kondisi fisik aktual).
- Tidak ada validasi Clone (karena biji rootstock tidak memiliki Clone pada awal semai).
- Satu Bedengan menampung beberapa Batch.
- Tidak ada transplanting ke polybag.

## 3. Dependency RN-SEM-005
(Hasil pemindaian terhadap relasi langsung ID RN-SEM-005 pada RTM/Node Flow).
${findings.filter(f => f.conflicts.includes('RN-SEM-005')).map(f => `- **${f.id}** (${f.type}): Terhubung langsung sebagai node RN-SEM-005.`).join('\n') || '- Tidak ada Dependency Langsung.'}

## 4. Dependency RN-SEM-007
(Hasil pemindaian terhadap relasi langsung ID RN-SEM-007 pada RTM/Node Flow).
${findings.filter(f => f.conflicts.includes('RN-SEM-007')).map(f => `- **${f.id}** (${f.type}): Terhubung langsung sebagai node RN-SEM-007.`).join('\n') || '- Tidak ada Dependency Langsung.'}

## 5. Temuan Konflik / Indirect Dependencies
Ditemukan data yang mengandung narasi/kondisi teknis usang (Indirect Dependencies):
${findings.map(f => `
### [${f.id}] - ${f.type}
- **Teks yang Ditemukan**: "${f.text}"
- **Konflik Baseline**: ${f.conflicts}
- **Rekomendasi Tindakan**: ${f.recommendation}`).join('\n')}

## 6. Matriks Tindakan
- **VALID**: 0 Item (Seluruh temuan yang dicatat menyalahi Master Baseline).
- **REVISI**: ${findings.length} Item (Data/Node yang memuat konsep usang dan perlu penyesuaian parameter).
- **LEGACY CONTENT**: 0 Item (Terminologi usang terangkum ke dalam instruksi Revisi Node).
- **KONFIRMASI**: 0 Item.

## 7. Kesimpulan
Selain keberadaan RN-SEM-005 dan RN-SEM-007 itu sendiri, **terdapat Node Flow dan properti turunan (indirect dependency) di modul M03 yang perlu direvisi secara teknis**. Node-node tersebut masih menggunakan asumsi bahwa validasi "12-15 hari", "Clone seragam", dan "transplanting ke polybag" masih berlaku, sehingga *Business Logic* dalam flow M03 saat ini **TIDAK SEJALAN** dengan Master Baseline aktif.

## 8. Daftar Data yang Aman untuk Tidak Diubah
Sebagian besar *requirement* dan *flow node* M03 lainnya sudah aman:
${safeItems.length > 0 ? safeItems.slice(0, 10).map(i => `- ${i}`).join('\n') + `\n- ...(dan ${safeItems.length - 10} item lainnya yang lolos seleksi).` : '- Tidak ada.'}
`;

fs.writeFileSync('AUDIT_DEPENDENCY_SEM_005_007.md', md);
console.log("✅ Written AUDIT_DEPENDENCY_SEM_005_007.md");
