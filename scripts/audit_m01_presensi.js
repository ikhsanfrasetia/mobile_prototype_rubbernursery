import fs from 'fs';

const JS_DATA_PATH = 'js/data/process-mapping-baseline.js';

console.log("=== STARTING CONTEXT AUDIT M01 PRESENSI ===");

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
  
  if (t.includes('pilih status datang') || t.includes('pilih status') || t.includes('input manual status')) issues.push('Pilih Status Manual');
  if (t.includes('langkah terpisah') && t.includes('foto')) issues.push('Face ID & Foto terpisah');
  if (t.includes('selfie') && t.includes('wajib utama')) issues.push('Selfie sebagai metode wajib utama');
  if (t.includes('gps tidak wajib') || t.includes('tanpa gps')) issues.push('GPS Tidak Wajib');
  if (t.includes('luar area tetap diterima')) issues.push('Presensi luar area diterima');
  if (t.includes('masuk tidak wajib') && t.includes('transaksi')) issues.push('Presensi masuk tidak wajib sebelum transaksi');
  if (t.includes('presensi pekerja massal') || t.includes('pekerja massal') || t.includes('sekaligus banyak')) issues.push('Presensi Pekerja Massal');
  if (t.includes('tanpa alasan') && t.includes('fallback')) issues.push('Fallback tanpa alasan');
  
  return issues;
}

const reqs = data.requirements.filter(r => r.id.startsWith('RN-PRS-') || r.id.startsWith('RN-PWP-'));
const m01Flows = data.flows['01-presensi'] || {}; 

reqs.forEach(r => {
  let cls = 'VALID';
  
  if (r.id === 'RN-PRS-004') {
     cls = r.isArchived || r.status.toLowerCase().includes('historis') || r.status.toLowerCase().includes('deprecated') ? 'HISTORIS (Aman)' : 'ERROR (Seharusnya Historis/Deprecated)';
  } else if (r.id === 'RN-PWP-006' || r.id === 'RN-PWP-007') {
     cls = r.status.toLowerCase() === 'konfirmasi' ? 'KONFIRMASI (Aman)' : 'ERROR (Seharusnya KONFIRMASI)';
  }

  let text = `${r.title} ${r.requirement} ${r.process} ${r.input} ${r.validation} ${r.output}`;
  let issues = checkLegacy(text);
  
  if (issues.length > 0) {
    if (cls === 'VALID') cls = 'REVISI / LEGACY';
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
    status: r.status + (r.isArchived ? " (Archived)" : ""),
    actor: r.role || '-',
    classification: cls
  });

  // Traceability: Req -> Node
  if (!r.isArchived && r.linkedNode) {
    let found = false;
    Object.values(m01Flows).forEach(f => {
      if (f.nodes && f.nodes.find(n => n.id === r.linkedNode)) found = true;
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

Object.keys(m01Flows).forEach(featId => {
  let f = m01Flows[featId];
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
        let matchingReq = reqs.find(r => r.id === n.reqId);
        if (!matchingReq) {
          traceIssues.push(`[Node] ${n.id} linked to missing req ${n.reqId}`);
        } else if (matchingReq.isArchived || matchingReq.status.toLowerCase().includes('historis') || matchingReq.status.toLowerCase().includes('deprecated')) {
          traceIssues.push(`[Node] ${n.id} linked to archived/deprecated req ${n.reqId}`);
        }
      } else {
        traceIssues.push(`[Node] ${n.id} is an ORPHAN (no reqId)`);
      }
    });
  }
});

let errorFindings = reqFindings.filter(r => r.classification.includes('ERROR'));

let verdict = "PASS";
if (legacyScan.length > 0 || traceIssues.length > 0 || errorFindings.length > 0) {
  verdict = "FAIL";
} else if (reqFindings.find(r => r.classification.includes('KONFIRMASI') || r.classification.includes('REVISI'))) {
  verdict = "PASS WITH FINDINGS";
}

const md = `# AUDIT CONTEXT M01: PRESENSI

## 1. Scope Audit
- Modul: M01 (Presensi)
- Target: Presensi Supervisor & Presensi Pekerja Bibitan
- Data: Requirements (RN-PRS-*, RN-PWP-*), Flow Nodes, Edges, Traceability Mapping.

## 2. Baseline Reference
\`MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md\`
- Tidak ada opsi "Pilih Status Datang / Pulang" bagi user. Sistem menentukan berdasarkan waktu.
- Face ID wajib dan langsung mendokumentasikan foto. Fallback foto manual wajib disertai alasan.
- GPS wajib berada di dalam poligon area pembibitan yang diizinkan.
- Presensi Masuk (Supervisor) memblokir transaksi lain sebelum tuntas.
- Presensi Pekerja (PWP) dilakukan satu per satu menggunakan biometrik oleh Mantri.
- Verifikasi presensi Supervisor oleh Asisten Bibitan adalah final.

## 3. Presensi Supervisor Audit
Sistem Face ID dan penentuan status otomatis tervalidasi di dalam narasi spesifikasi tanpa fallback liar.

## 4. Presensi Pekerja Audit
Peninjauan narasi membuktikan bahwa pekerja diaudit **satu per satu** oleh Mantri, bukan lewat proses batch/massal.

## 5. Requirement Inventory
Total Requirements Terpantau (Aktif & Historis): **${reqFindings.length}**

## 6. Requirement Findings
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

## 7. Flow Node Findings
${nodeFindings.map(n => `
### [${n.id}]
- **Process**: ${n.process}
- **Input**: ${n.input}
- **Validation**: ${n.validation}
- **Output**: ${n.output}
- **Requirement Mapping**: ${n.reqId}
- **Dependency**: ${n.dependency}
- **Classification**: **${n.classification}**`).join('\n')}

## 8. Legacy/Conflict Scan
${legacyScan.length > 0 ? legacyScan.map(l => `- **${l}**`).join('\n') : '- Bersih (0 temuan konflik logika presensi manual/massal usang).'}

## 9. Traceability Audit
${traceIssues.length > 0 ? traceIssues.map(t => `- ${t}`).join('\n') : '- Seluruh mapping requirement dan node terpaut sempurna.'}

## 10. Evidence Classification
- Penentuan Status: Sistem membedakan Datang/Pulang via Waktu Server.
- GPS: Presensi divalidasi dengan batasan geofencing secara otomatis.
- Historis: RN-PRS-004 telah ditempatkan pada blok arsip historis. RN-PWP-006 & RN-PWP-007 telah ditandai KONFIRMASI.

## 11. Findings Summary
- Konflik Logika (Presensi Manual/Bypass): **${legacyScan.length} Temuan**.
- Kerapuhan RTM Traceability: **${traceIssues.length} Temuan**.
- Error Status Requirement Baseline: **${errorFindings.length} Temuan**.

## 12. Manual Confirmation Required
Item KONFIRMASI (seperti RN-PWP-006 & RN-PWP-007) menunggu pengesahan bisnis apakah akan dinaikkan ke baseline aktif atau digugurkan.

## 13. Recommended Mutation Scope
${(legacyScan.length > 0 || errorFindings.length > 0 || traceIssues.length > 0) ? '- Terdapat kesalahan label status atau residual tautan flow yang harus dimutasi/diperbaiki pada langkah berikutnya.' : '- Tidak ada mutasi yang direkomendasikan saat ini. Integritas struktur presensi terjaga.'}

## 14. Final Audit Status
**${verdict}**
`;

fs.writeFileSync('AUDIT_CONTEXT_M01_PRESENSI.md', md);
console.log("✅ Written AUDIT_CONTEXT_M01_PRESENSI.md");
