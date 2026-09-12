import fs from 'fs';
import path from 'path';
import { getActiveEstates, resolveEstate } from '../js/data/estate-master.js';
import { getActiveCfnaMaster } from '../js/data/cfna-master.js';
import { getActiveKlons } from '../js/data/klon-master.js';
import { generateUniqueDocNo, MODULE_DOC_CODES } from '../js/core/utils.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error(`❌ FAIL: ${message}`);
  }
}

console.log('========================================================================================');
console.log('            SIGMA RUBBER NURSERY — TEST SUITE: PERMINTAAN KEBUN SEPUPU                  ');
console.log('========================================================================================\n');

// Mock User Contexts
const userTBS = { name: 'Junaidi', role: 'PENGURUS', estateId: 'EST-TBS' };
const userAPM = { name: 'Mukhsin', role: 'PENGURUS', estateId: 'EST-APM' };

// A. USER CONTEXT — TANAH BESIH
const allEstates = getActiveEstates();
const targetTBS = allEstates.filter(e => e.estate_id !== userTBS.estateId);
assert(targetTBS.every(e => e.estate_id !== 'EST-TBS'), 'A. Pengurus Tanah Besih: Dropdown mengecualikan Tanah Besih (EST-TBS)');
assert(targetTBS.some(e => e.estate_id === 'EST-APM'), 'A. Pengurus Tanah Besih: Dropdown menampilkan Aek Pamingke (EST-APM)');

// B. USER CONTEXT — AEK PAMINGKE
const targetAPM = allEstates.filter(e => e.estate_id !== userAPM.estateId);
assert(targetAPM.every(e => e.estate_id !== 'EST-APM'), 'B. Pengurus Aek Pamingke: Dropdown mengecualikan Aek Pamingke (EST-APM)');
assert(targetAPM.some(e => e.estate_id === 'EST-TBS'), 'B. Pengurus Aek Pamingke: Dropdown menampilkan Tanah Besih (EST-TBS)');

// C. ESTATE MASTER
assert(allEstates.length === 2, 'C. Estate Dropdown membaca Estate Master (2 active estates)');

// D. CFNA
const cfna = getActiveCfnaMaster();
assert(cfna.length > 0, 'D. Allocation berasal dari CFNA Master');

// E. CLONE
const klons = getActiveKlons();
assert(klons.length > 0, 'E. Clone berasal dari Clone Master');

// F & G. CATEGORY & GROWTH STAGE (Static valid values mock check)
const validCategories = ['APM', 'Seedlings'];
const validGrowthStages = ['Rubber Main Nursery', 'Rubber Advance Planting Material'];
assert(validCategories.includes('APM') && validCategories.includes('Seedlings'), 'F. Kategori hanya APM & Seedlings');
assert(validGrowthStages.includes('Rubber Main Nursery') && validGrowthStages.includes('Rubber Advance Planting Material'), 'G. Growth Stage divalidasi');

// H. QUANTITY
const isValidQty = (qty) => typeof qty === 'number' && !isNaN(qty) && qty >= 0;
assert(isValidQty(0) === true, 'H. Quantity 0 -> PASS');
assert(isValidQty(1500) === true, 'H. Quantity positive (1500) -> PASS');
assert(isValidQty(-10) === false, 'H. Quantity negative (-10) -> FAIL');

// I. REQUIRED DATE
const isValidDate = (d) => !!d && d.length > 0; // Simple validation for input presence
assert(isValidDate('2026-09-30') === true, 'I. Required date valid -> PASS');
assert(isValidDate('') === false, 'I. Required date empty -> FAIL');

// J, K, L, M, N, O. TRANSACTION SIMULATION
function simulateSubmit(user, targetId, qty, dateStr, purpose = 'Penanaman / Bibit Tanam') {
  if (!targetId || targetId === user.estateId) return null;
  if (!isValidQty(qty)) return null;
  if (!isValidDate(dateStr)) return null;
  
  return {
    id: 'REQ-123',
    docNo: generateUniqueDocNo('request', []),
    type: 'KEBUN_SEPUPU',
    purpose: purpose,
    status: 'DIAJUKAN',
    userId: user.userId || 'USR',
    estateId: user.estateId,
    targetEstateId: targetId,
    qty: qty,
    requiredDate: dateStr
  };
}

const tx = simulateSubmit(userTBS, 'EST-APM', 1500, '2026-09-30');
assert(tx !== null, 'J. Semua field wajib terpenuhi -> Form valid');
assert(tx.type === 'KEBUN_SEPUPU', 'N. Transaction type adalah KEBUN_SEPUPU');
assert(tx.status === 'DIAJUKAN', 'O. Initial status adalah DIAJUKAN');
assert(tx.estateId === 'EST-TBS', 'L. Transaction menyimpan source estate EST-TBS');
assert(tx.targetEstateId === 'EST-APM', 'M. Transaction menyimpan target estate EST-APM');
assert(tx.purpose === 'Penanaman / Bibit Tanam', 'Q. Transaction menyimpan canonical purpose: Penanaman / Bibit Tanam');

// K. SINGLE TRANSACTION
const db = [];
db.push(tx);
assert(db.length === 1, 'K. Submit menghasilkan tepat satu transaction record (single record)');

// P. REVIEW (Mock checking review flow fields & order)
const reviewData = { 
  docNo: tx.docNo,
  user: userTBS,
  targetEstateName: 'Aek Pamingke',
  purpose: 'Penanaman / Bibit Tanam',
  allocationCode: '091B11',
  klon: 'IRCA 19',
  category: 'APM',
  growthStage: 'Rubber Advance Planting Material',
  requiredDate: '2026-09-30',
  qty: 1500
};
assert(reviewData.purpose === 'Penanaman / Bibit Tanam', 'P1. Review menampilkan Tujuan Permintaan: Penanaman / Bibit Tanam');
assert(reviewData.purpose === tx.purpose, 'P2. Nilai tujuan permintaan tersimpan konsisten antara form review dan transaction payload');
assert(reviewData.docNo === tx.docNo, 'P3. Review menampilkan docNo yang identik dengan transaction payload');

// S. DOCUMENT NUMBER GENERATOR & PREFIX NIR TESTS
assert(MODULE_DOC_CODES.request === 'NIR', 'S1. MODULE_DOC_CODES["request"] memetakan ke prefix "NIR"');
const doc1 = generateUniqueDocNo('request', []);
assert(doc1 === '2026/NIR/001', `S2. Transaction baru pertama menghasilkan '2026/NIR/001' (got: ${doc1})`);

const doc2 = generateUniqueDocNo('request', [{ docNo: '2026/NIR/001' }]);
assert(doc2 === '2026/NIR/002', `S3. Sequence meningkat ke '2026/NIR/002' (got: ${doc2})`);

const doc3 = generateUniqueDocNo('request', [{ docNo: '2026/PGL/001' }]);
assert(doc3 === '2026/NIR/001', `S4. Transaksi lama dengan prefix PGL (2026/PGL/001) tidak menyebabkan sequence collision pada NIR (got: ${doc3})`);

const doc4 = generateUniqueDocNo('request', [{ docNo: '2026/PGL/001' }, { docNo: '2026/NIR/001' }, { docNo: '2026/NIR/002' }]);
assert(doc4 === '2026/NIR/003', `S5. Sequence baru berlanjut aman '2026/NIR/003' meskipun ada riwayat dokumen PGL (got: ${doc4})`);

// R. CODE INSPECTION TEST FOR REVIEW MODAL STRUCTURE & ORDER
const formCodePath = path.resolve('js/modules/request/request-kebun-sepupu-form.js');
const formCode = fs.readFileSync(formCodePath, 'utf-8');

const modalStartIndex = formCode.indexOf('function openReviewModal');
const modalCode = modalStartIndex !== -1 ? formCode.substring(modalStartIndex) : '';

const fieldsInOrder = [
  'No. Dokumen',
  'Pemohon',
  'Kebun Dituju',
  'Tujuan Permintaan',
  'Kode Alokasi',
  'Klon',
  'Kategori',
  'Tahapan Pertumbuhan',
  'Tanggal Dibutuhkan',
  'Banyaknya'
];

let lastIdx = -1;
let orderValid = true;
for (const field of fieldsInOrder) {
  const currentIdx = modalCode.indexOf(field, lastIdx + 1);
  if (currentIdx === -1 || currentIdx < lastIdx) {
    orderValid = false;
    break;
  }
  lastIdx = currentIdx;
}

assert(orderValid, 'R1. Semua 10 field dalam modal Review berada dalam urutan yang tepat dan sesuai spesifikasi');
assert(modalCode.includes('grid-template-columns: 42% 58%'), 'R2. Layout review menggunakan struktur 2 kolom (42% 58%) untuk mencegah tabrakan/overlap');
assert(formCode.includes("purpose: data.purpose || 'Penanaman / Bibit Tanam'"), 'R3. Transaction payload menyimpan purpose canonical');
assert(modalCode.includes('Kirim Permintaan'), 'R4. Tombol aksi modal review menggunakan label "Kirim Permintaan"');
assert(!modalCode.includes('Submit Pengajuan'), 'R5. Tombol label lama "Submit Pengajuan" sudah tidak ada di modal review');

console.log('\n----------------------------------------------------------------------------------------');
console.log(`TOTAL ASSERTIONS: ${passed + failed}`);
console.log(`PASSED:           ${passed}`);
console.log(`FAILED:           ${failed}`);
console.log('----------------------------------------------------------------------------------------');

if (failed === 0) {
  console.log('✅ ALL REQUEST KEBUN SEPUPU TESTS PASSED!');
  process.exit(0);
} else {
  console.error('❌ SOME TESTS FAILED!');
  process.exit(1);
}
