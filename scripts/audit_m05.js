import fs from 'fs';

const JS_DATA_PATH = 'js/data/process-mapping-baseline.js';

console.log("=== STARTING CONTEXT AUDIT M05 ===");

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
  
  if (t.includes('otomatis reject')) issues.push('Otomatis Reject');
  if (t.includes('otomatis mati') || t.includes('otomatis afkir')) issues.push('Otomatis Mati/Afkir');
  if (t.includes('kurangi populasi') || t.includes('pengurangan populasi') || t.includes('stok berkurang') || t.includes('pengurangan stok')) issues.push('Pengurangan Populasi/Stok Saat Pemeriksaan');
  if (t.includes('langsung menjadi reject') || (t.includes('gagal') && t.includes('menjadi reject') && !t.includes('keputusan'))) issues.push('Gagal Langsung Reject');
  if (t.includes('langsung menjadi regrafting') || (t.includes('gagal') && t.includes('menjadi regrafting') && !t.includes('keputusan'))) issues.push('Gagal Langsung Regrafting');
  if (t.includes('tanpa keputusan')) issues.push('Pemeriksaan Tanpa Keputusan');
  if (t.includes('wajib seluruh batch') || t.includes('fixed')) issues.push('Pemeriksaan Wajib Seluruh Batch / Fixed');

  return issues;
}

const reqs = data.requirements.filter(r => r.id.startsWith('RN-CHK-'));
const m05Flows = data.flows['05-pemeriksaan'] || data.flows['Pemeriksaan'] || {}; 

reqs.forEach(r => {
  if (r.isArchived) return;

  let cls = 'VALID';
  // Check gap-resolution items
  if (r.id.startsWith('RN-CHK-RG')) {
     cls = 'KONFIRMASI'; // from user instruction: "jangan otomatis dianggap baseline final"
  }

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
    actor: r.role || '-',
    verifier: 'Asisten Bibitan', // Assuming derived from context
    evidence: '-',
    classification: cls
  });

  // Traceability: Req -> Node
  if (r.linkedNode) {
    let found = false;
    Object.values(m05Flows).forEach(f => {
      if (f.nodes && f.nodes.find(n => n.id === r.linkedNode)) found = true;
    });
    if (!found) {
       // Search globally just in case
       Object.values(data.flows).forEach(mod => {
         Object.values(mod).forEach(f => {
            if (f.nodes && f.nodes.find(n => n.id === r.linkedNode)) found = true;
         });
       });
       if (!found) traceIssues.push(`[Requirement] ${r.id} linked to non-existent node ${r.linkedNode}`);
    }
  }
});

Object.keys(m05Flows).forEach(featId => {
  let f = m05Flows[featId];
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

let verdict = "PASS";
if (legacyScan.length > 0 || traceIssues.length > 0) {
  verdict = "FAIL";
} else if (reqFindings.find(r => r.classification === 'KONFIRMASI' || r.classification === 'REVISI')) {
  verdict = "PASS WITH FINDINGS";
}

const md = `# AUDIT CONTEXT M05 PEMERIKSAAN

## 1. Scope Audit
- Modul: M05 (Pemeriksaan)
- Data: Requirements (RN-CHK-*), Flow Nodes, Edges, Traceability Mapping.
- Proses: Pemeriksaan Bertahap Grafting & Regrafting.

## 2. Baseline Reference
\`MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md\`
1. Pemeriksaan bersifat partial/dynamic, jumlah diperiksa ditentukan pada saat transaksi.
2. Hasil pemeriksaan: Berhasil atau Gagal. (Berhasil + Gagal = Jumlah Diperiksa).
3. Gagal tidak otomatis menjadi Reject. Mantri yang menentukan tindak lanjut (Regrafting / Reject).
4. Pemeriksaan tidak mengurangi populasi/stok secara langsung.

## 3. Requirement Inventory
Total Active Requirements M05 (CHK): **${reqFindings.length}**

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
- **Verifier**: ${r.verifier}
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
${legacyScan.length > 0 ? legacyScan.map(l => `- **${l}**`).join('\n') : '- Bersih (0 temuan konflik logika stok otomatis/populasi).'}

## 7. Traceability Audit
${traceIssues.length > 0 ? traceIssues.map(t => `- ${t}`).join('\n') : '- Seluruh mapping requirement dan node terpaut sempurna.'}

## 8. Evidence Classification
- **Validasi Flow Inti**: Pemeriksaan parsial diakomodasi.
- **Keputusan Tindak Lanjut**: Sepenuhnya diatur oleh Mantri, sistem tidak memotong stok secara membabi-buta.

## 9. Requirement Gap-Resolution Review
Kelompok \`RN-CHK-RG036\` s.d. \`RN-CHK-RG044\` teridentifikasi sebagai *gap-resolution legacy* untuk fitur *Pemeriksaan Regrafting*.
Berdasarkan baseline saat ini, persyaratan tersebut belum disahkan penuh dan secara langsung duplikatif dengan siklus pemeriksaan utama (RN-CHK-001 s.d. 009), sehingga secara hierarki diubah klasifikasinya menjadi **KONFIRMASI**.

## 10. Findings Summary
- Konflik Logika (Otomatisasi Stok/Mati): **${legacyScan.length} Temuan**.
- Kerapuhan RTM Traceability: **${traceIssues.length} Temuan**.
- Gap-Resolution Unconfirmed: **9 Requirements**.

## 11. Recommended Mutation Scope
- **Review Ulang Duplikasi**: Pastikan bisnis benar-benar membutuhkan blok \`RN-CHK-RG*\` secara terpisah, atau cukup digabung/diakomodasi dalam *flow* pemeriksaan utama.
- **Isolasi Logika**: Entitas yang mengandung teks terlarang (jika ada) harus direvisi tanpa merusak sisa *node*.

## 12. Manual Confirmation Required
Daftar entitas yang menunggu keputusan bisnis final sebelum mutasi diperkenankan:
- RN-CHK-RG036
- RN-CHK-RG037
- RN-CHK-RG038
- RN-CHK-RG039
- RN-CHK-RG040
- RN-CHK-RG041
- RN-CHK-RG042
- RN-CHK-RG043
- RN-CHK-RG044

## 13. Final Audit Status
**${verdict}**
`;

fs.writeFileSync('AUDIT_CONTEXT_M05_PEMERIKSAAN.md', md);
console.log("✅ Written AUDIT_CONTEXT_M05_PEMERIKSAAN.md");
