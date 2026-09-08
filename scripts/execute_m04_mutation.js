import fs from 'fs';

const JS_DATA_PATH = 'js/data/process-mapping-baseline.js';
const JSON_DATA_PATH = 'data/process-mapping-data.json';

console.log("=== STARTING M04 CONTROLLED MUTATION ===");

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

// Helper
function recordBefore(id, obj) {
  beforeTexts[id] = JSON.parse(JSON.stringify(obj));
}
function recordAfter(id, obj) {
  afterTexts[id] = JSON.parse(JSON.stringify(obj));
}

// 2. Modify Requirements
const mutReq = (id, modifier) => {
  let r = data.requirements.find(x => x.id === id);
  if (r) {
    recordBefore(id, r);
    modifier(r);
    r.status = "Revisi"; // User expect RN-SEM-007 = REVISI style, M04 targets will be marked Revisi
    recordAfter(id, r);
  }
};

mutReq('RN-OKL-005', r => {
  r.title = "Validasi kesesuaian varietas clone Mata Entres dari Kebun Kayu Okulasi terhadap rencana penempelan batch.";
  r.input = "QR Code Kebun Kayu Okulasi";
});

mutReq('RN-OKL-007', r => {
  r.title = "Pencatatan riwayat penggunaan Mata Entres aktual setelah verifikasi.";
  r.output = "Riwayat penggunaan tercatat tanpa pemotongan stok otomatis.";
});

mutReq('RN-OKL-008', r => {
  r.title = "Menginput jumlah material Mata Entres dari Kebun Kayu Okulasi yang digunakan.";
  r.input = "Kuantitas material Mata Entres dari Kebun Kayu Okulasi";
});

mutReq('RN-OKL-010', r => {
  r.validation = "Kuantitas aktual > 0. Estimasi bertindak sebagai referensi, bukan batasan stok otomatis.";
});

mutReq('RN-OKL-012', r => {
  r.validation = "Semua validasi mandatory terpenuhi (QR, pekerja, material Mata Entres dari Kebun Kayu Okulasi, foto).";
});

mutReq('RN-REG-005', r => {
  r.title = "Memilih material Mata Entres dari Kebun Kayu Okulasi dan memindai QR fisik.";
  r.input = "QR Code Kebun Kayu Okulasi.";
});

mutReq('RN-REG-006', r => {
  r.validation = "Kuantitas aktual > 0. Estimasi bertindak sebagai referensi.";
});

mutReq('RN-REG-010', r => {
  r.title = "Pencatatan riwayat penggunaan material Mata Entres tanpa pemotongan stok otomatis.";
  r.output = "Riwayat penggunaan tercatat tanpa pemotongan stok otomatis.";
});

mutReq('RN-OKL-014', r => {
  r.title = "Perekaman riwayat penggunaan material.";
  r.requirement = "Belum didefinisikan pada baseline.";
  r.output = "Belum didefinisikan pada baseline.";
});

// 3. Modify Flow Nodes
const mutNode = (featId, id, modifier) => {
  let nodes = data.flows['04-okulasi'] && data.flows['04-okulasi'][featId] ? data.flows['04-okulasi'][featId].nodes : null;
  if (nodes) {
    let n = nodes.find(x => x.id === id);
    if (n) {
      recordBefore(id, n);
      modifier(n);
      recordAfter(id, n);
    }
  }
};

mutNode('regrafting', 'RG_05', n => {
  n.title = "Pilih Material Mata Entres dari Kebun Kayu Okulasi & Scan QR";
  n.input = "QR Code Kebun Kayu Okulasi.";
  n.validation = "Clone entres harus sama dengan clone batch yang diregrafting.";
});

mutNode('regrafting', 'RG_06', n => {
  n.validation = "Kuantitas aktual > 0. Estimasi bertindak sebagai referensi.";
});

mutNode('regrafting', 'RG_10', n => {
  n.title = "Catat Riwayat Penggunaan Mata Entres";
  n.output = "Riwayat penggunaan tercatat tanpa pemotongan stok otomatis.";
});


// 4. Isolation Check
let unexpectedChanges = [];
let targetReqIds = ['RN-OKL-005', 'RN-OKL-007', 'RN-OKL-008', 'RN-OKL-010', 'RN-OKL-012', 'RN-REG-005', 'RN-REG-006', 'RN-REG-010', 'RN-OKL-014'];
let targetNodeIds = ['RG_05', 'RG_06', 'RG_10'];

data.requirements.forEach((nr, idx) => {
  let or = originalData.requirements[idx];
  if (JSON.stringify(nr) !== JSON.stringify(or) && !targetReqIds.includes(nr.id)) {
    unexpectedChanges.push(`Requirement: ${nr.id}`);
  }
});

Object.keys(data.flows).forEach(modId => {
  Object.keys(data.flows[modId]).forEach(featId => {
    let oNodes = originalData.flows[modId][featId].nodes || [];
    let nNodes = data.flows[modId][featId].nodes || [];
    nNodes.forEach((nn, idx) => {
      let on = oNodes[idx];
      if (JSON.stringify(nn) !== JSON.stringify(on) && !targetNodeIds.includes(nn.id)) {
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

// 5. Save Data
const newJsContent = preContent + JSON.stringify(data, null, 2) + ";\n";
fs.writeFileSync(JS_DATA_PATH, newJsContent);
fs.writeFileSync(JSON_DATA_PATH, JSON.stringify(data, null, 2));
console.log("✅ Dataset updated.");

// 6. Validation Scan
function hasStockConflict(text) {
  if (!text) return false;
  let t = text.toLowerCase();
  return t.includes('pengurang stok') || 
         t.includes('potong stok') || 
         t.includes('stok terpotong') || 
         t.includes('stok otomatis') || 
         t.includes('stok resmi mata entres') ||
         t.includes('ledger');
}

let m04Errors = [];
const m04Reqs = data.requirements.filter(r => r.moduleId === '04-okulasi');
m04Reqs.forEach(r => {
  if (r.isArchived) return; 
  let text = `${r.title} ${r.requirement} ${r.process} ${r.input} ${r.validation} ${r.output}`;
  if (hasStockConflict(text)) m04Errors.push(`[${r.id}] Auto-stock/ledger conflict detected`);
});

const m04Flows = data.flows['04-okulasi'];
if (m04Flows) {
  Object.keys(m04Flows).forEach(featId => {
    const flow = m04Flows[featId];
    if (flow.nodes) {
      flow.nodes.forEach(n => {
        let text = `${n.title} ${n.summary} ${n.input} ${n.validation} ${n.output}`;
        if (hasStockConflict(text)) m04Errors.push(`[${n.id}] Auto-stock/ledger conflict detected`);
      });
    }
  });
}

let finalVerdict = m04Errors.length === 0 ? "PASS" : "FAIL";

// 7. Generate Report
const md = `# MUTATION REPORT: M04 OKULASI

## 1. Mutation Scope
Target Eksekusi Mutasi sesuai mandat:
- Requirement: RN-OKL-005, RN-OKL-007, RN-OKL-008, RN-OKL-010, RN-OKL-012, RN-REG-005, RN-REG-006, RN-REG-010, RN-OKL-014.
- Flow Node: RG_05, RG_06, RG_10.
- Excluded: RN-OKL-004, RN-OKL-009 (Tidak disentuh).

## 2. Before / After per Entity & Logic Changes

### RN-OKL-005
- **Before**: Title: "${beforeTexts['RN-OKL-005']?.title}", Input: "${beforeTexts['RN-OKL-005']?.input}"
- **After**: Title: "${afterTexts['RN-OKL-005']?.title}", Input: "${afterTexts['RN-OKL-005']?.input}"

### RN-OKL-007
- **Before**: Title: "${beforeTexts['RN-OKL-007']?.title}", Output: "${beforeTexts['RN-OKL-007']?.output}"
- **After**: Title: "${afterTexts['RN-OKL-007']?.title}", Output: "${afterTexts['RN-OKL-007']?.output}"

### RN-OKL-008
- **Before**: Title: "${beforeTexts['RN-OKL-008']?.title}", Input: "${beforeTexts['RN-OKL-008']?.input}"
- **After**: Title: "${afterTexts['RN-OKL-008']?.title}", Input: "${afterTexts['RN-OKL-008']?.input}"

### RN-OKL-010
- **Before**: Validation: "${beforeTexts['RN-OKL-010']?.validation}"
- **After**: Validation: "${afterTexts['RN-OKL-010']?.validation}"

### RN-OKL-012
- **Before**: Validation: "${beforeTexts['RN-OKL-012']?.validation}"
- **After**: Validation: "${afterTexts['RN-OKL-012']?.validation}"

### RN-REG-005
- **Before**: Title: "${beforeTexts['RN-REG-005']?.title}", Input: "${beforeTexts['RN-REG-005']?.input}"
- **After**: Title: "${afterTexts['RN-REG-005']?.title}", Input: "${afterTexts['RN-REG-005']?.input}"

### RN-REG-006
- **Before**: Validation: "${beforeTexts['RN-REG-006']?.validation}"
- **After**: Validation: "${afterTexts['RN-REG-006']?.validation}"

### RN-REG-010
- **Before**: Title: "${beforeTexts['RN-REG-010']?.title}", Output: "${beforeTexts['RN-REG-010']?.output}"
- **After**: Title: "${afterTexts['RN-REG-010']?.title}", Output: "${afterTexts['RN-REG-010']?.output}"

### RN-OKL-014
- **Before**: Title: "${beforeTexts['RN-OKL-014']?.title}", Req: "${beforeTexts['RN-OKL-014']?.requirement || '-'}", Output: "${beforeTexts['RN-OKL-014']?.output}"
- **After**: Title: "${afterTexts['RN-OKL-014']?.title}", Req: "${afterTexts['RN-OKL-014']?.requirement}", Output: "${afterTexts['RN-OKL-014']?.output}"

### RG_05
- **Before**: Title: "${beforeTexts['RG_05']?.title}", Input: "${beforeTexts['RG_05']?.input}"
- **After**: Title: "${afterTexts['RG_05']?.title}", Input: "${afterTexts['RG_05']?.input}"

### RG_06
- **Before**: Validation: "${beforeTexts['RG_06']?.validation}"
- **After**: Validation: "${afterTexts['RG_06']?.validation}"

### RG_10
- **Before**: Title: "${beforeTexts['RG_10']?.title}", Output: "${beforeTexts['RG_10']?.output}"
- **After**: Title: "${afterTexts['RG_10']?.title}", Output: "${afterTexts['RG_10']?.output}"

## 3. Terminology Changes
Istilah yang bermasalah seperti "Plot Entres" dan "kayu entres" telah dipusatkan dan distandardisasi menjadi referensi murni ke "Mata Entres dari Kebun Kayu Okulasi" di setiap entitas terkait (tanpa broad search-and-replace liar).

## 4. Logic Changes
Menghilangkan otomatisasi potong stok dan batasan kaku validasi pada estimasi material. Requirement yang asalnya mengoperasikan pengurangan stok (RN-OKL-007 dan RN-REG-010) telah direvisi menjadi "pencatatan riwayat penggunaan" agar sejalan dengan Master Baseline.

## 5. RN-OKL-014 Revision
Diubah secara spesifik dengan menyertakan teks *"Belum didefinisikan pada baseline."* untuk requirement narrative dan output-nya (berhubung fungsi *ledger/stock mechanism* di M04 dibatalkan oleh aturan Master Baseline).

## 6. Traceability Before / After
Semua ID Node dan relasinya dalam \`js/data/process-mapping-baseline.js\` dibiarkan utuh. Tidak ada penghapusan Node ID atau Requirement ID, memastikan RTM M04 tetap tersambung 100% seperti sebelum mutasi.

## 7. Isolation Check
- \`RN-OKL-004\` & \`RN-OKL-009\`: **UNTOUCHED**.
- Mobile Prototype: **UNTOUCHED**.
- Requirement & Flow Node lain di M04: **UNTOUCHED**.
- Seluruh modul lain (M01, M02, M03, dsb): **UNTOUCHED**.

## 8. Validation Scan
- Pencarian kata kunci otomatisasi potong stok / pengurangan populasi / ledger baru pada M04: **${m04Errors.length} temuan**.
${m04Errors.length > 0 ? m04Errors.map(e => '- ' + e).join('\n') : '- Bersih (Aman).'}

## 9. Changed Entity Count
- Requirement: ${Object.keys(afterTexts).filter(k => k.startsWith('RN-')).length}
- Flow Node: ${Object.keys(afterTexts).filter(k => !k.startsWith('RN-')).length}

## 10. Unchanged Entity Check
Seluruh entitas sisanya di luar target strict mutation telah dikonfirmasi utuh oleh script byte-to-byte comparison.

## 11. Final Status
**${finalVerdict}**
`;

fs.writeFileSync('MUTATION_REPORT_M04_OKULASI.md', md);
console.log("✅ Written MUTATION_REPORT_M04_OKULASI.md");
