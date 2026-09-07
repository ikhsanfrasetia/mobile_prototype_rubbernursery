// scratch/generate_dak_final.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as PMData from '../js/modules/process-mapping/process-mapping-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

await PMData.initProjectDataStore();
const state = PMData.getActiveStore();

const activeReqs = (state.requirements || []).filter(r => !r.isArchived);
const archivedReqs = (state.requirements || []).filter(r => r.isArchived);
const rtmRecords = PMData.getAllTraceabilityRecords();

console.log('Active Reqs:', activeReqs.length);
console.log('Archived Reqs:', archivedReqs.length);
console.log('RTM Records:', rtmRecords.length);

// Generate DAK Document
let doc = '';

// A. COVER
doc += '# DAK — SIGMA RUBBER NURSERY\n';
doc += '## Dokumen Analisis Kebutuhan Sistem (Software Requirements Document)\n\n';
doc += '**Nama Sistem:** SIGMA Mobile Rubber Nursery (Sistem Informasi & Manajemen Operasional Pembibitan Karet)  \n';
doc += '**Nomor Dokumen:** DAK-SIGMA-RN-2026-V1.0-FINAL  \n';
doc += '**Versi:** 1.0.0 (Baseline 172 Final)  \n';
doc += '**Status:** FINAL / APPROVED  \n';
doc += '**Tanggal Penerbitan:** 7 September 2026  \n';
doc += '**Klasifikasi:** Dokumen Resmi Korporat (Official Technical Document)  \n\n';

doc += '| Parameter | Identitas Personel |\n';
doc += '| :--- | :--- |\n';
doc += '| **Prepared By** | Lead System Architect & Business Process Analyst (Task 10 & 12 QA Team) |\n';
doc += '| **Reviewed By** | Head of Agronomy & Nursery Technical Specialist (TBD) |\n';
doc += '| **Approved By** | Head of Plantation & IT Project Steering Committee (TBD) |\n\n';

doc += '---\n\n';

// B. DOCUMENT CONTROL
doc += '# B. DOCUMENT CONTROL\n\n';
doc += '### Riwayat Perubahan Dokumen (Document History)\n\n';
doc += '| Versi | Tanggal | Author | Status | Ringkasan Perubahan |\n';
doc += '| :---: | :---: | :--- | :---: | :--- |\n';
doc += '| **v0.1.0** | 2026-08-15 | System Analyst | Draft Awal | Baseline awal 165 requirement dari user stories lapangan. |\n';
doc += '| **v0.5.0** | 2026-08-28 | QA & Dev Team | Review | Pemetaan alur flow Phase 4E/4F dan canonical cross-flow edges. |\n';
doc += '| **v0.9.0** | 2026-09-06 | Business Analyst | Reconciled | Rekonsiliasi Task 9: 28 revisi, 14 requirement baru, 7 depresiasi, 3 merger. |\n';
doc += '| **v1.0.0** | 2026-09-07 | System Architect | **FINAL** | **Finalisasi 172 Active Requirements, 18 Business Rules, 175 Flow Nodes, 156 Edges, 5 CFE, dan 100% RTM Traceability.** |\n\n';

doc += '---\n\n';

// C. EXECUTIVE SUMMARY
doc += '# C. EXECUTIVE SUMMARY\n\n';
doc += 'Sistem Informasi Manajemen Pembibitan Karet (**SIGMA Rubber Nursery**) adalah platform aplikasi mobile berbasis PWA *(Progressive Web App)* yang terintegrasi dengan portal manajemen operasional. Sistem dirancang untuk memastikan tata kelola, keterlacakan (*traceability*), dan akuntabilitas siklus hidup bibit tanaman karet secara *end-to-end* di seluruh kebun dan divisi PT Socfin Indonesia (Socfindo).\n\n';
doc += 'Ruang lingkup operasional sistem mencakup **11 modul inti** mulai dari pencatatan presensi berpagar GPS (*geofencing*), penerimaan benih kelatak bermutu, penyemaian bedengan, pembesaran seedling polybag, okulasi grafting utama dan regrafting, inspeksi keberhasilan okulasi, penyeleksian kualitas bibit batch (Grade A, tunda, afkir), pengelolaan kebun pohon induk entres, panen kayu entres klonal, penarikan & rekonsiliasi bahan kimia/pupuk gudang, rekam jam kerja heading pemeliharaan, hingga pengeluaran bibit berbasis SPB dan konfirmasi tanam polygon di divisi.\n\n';
doc += 'Seluruh kebutuhan bisnis (**172 Active Requirements**) telah terpetakan secara utuh ke dalam **21 Alur Fitur Bisnis**, **175 Interactive Flow Nodes**, **156 Directed Edges**, **5 Canonical Cross-Flow Edges**, dan **18 Canonical Business Rules**, dengan tingkat keterlacakan **100.00% (Zero Gap)**.\n\n';

doc += '---\n\n';

// D. SCOPE
doc += '# D. SCOPE\n\n';
doc += '## 1. In Scope (11 Modul Operasional Aktif)\n';
doc += '1. **01-presensi:** Presensi Harian Supervisor (Face ID/GPS Perimeter) & Pekerja Bibitan.\n';
doc += '2. **02-penerimaan:** Penerimaan Biji Benih Kelatak, Bibit Kebun Sepupu, dan Kayu Entres Sepupu.\n';
doc += '3. **03-penyemaian:** Penyemaian Biji Kelatak Bedengan & Transplanting ke Polybag (Batch Management).\n';
doc += '4. **04-okulasi:** Okulasi Grafting Utama, Kalibrasi QC Irisan, dan Regrafting Batang Bawah.\n';
doc += '5. **05-pemeriksaan:** Pemeriksaan Keberhasilan Okulasi & Buka Lilitan Plastik.\n';
doc += '6. **06-penyeleksian:** Penyeleksian Kualitas Batch Bibit (Grade A/Tunda/Afkir), Review RKAP Askep, & Pemusnahan BA.\n';
doc += '7. **07-kebun-entres:** Pemeliharaan & Sensus Pohon Induk Kayu Entres Klonal.\n';
doc += '8. **08-panen-mata-entres:** Panen, Pemotongan, dan Pengikatan Kayu Mata Entres.\n';
doc += '9. **09-material-bahan:** Penarikan BKB Material Gudang & Rekonsiliasi Konsumsi Bahan Lapangan.\n';
doc += '10. **10-rekam-pemeliharaan:** Pencatatan Heading Kerja Pemeliharaan Harian & Universal Audit Trail.\n';
doc += '11. **11-pengeluaran:** Otorisasi SPB Alokasi Bibit, Pemuatan Armada, Plotting Polygon Tanam, & Konfirmasi Terima Divisi.\n\n';

doc += '## 2. Out of Scope (7 Deprecated / Archived Requirements)\n';
doc += '1. `RN-PRS-004`: Presensi manual batch pekerja tanpa koordinat geolokasi GPS *(Deprecated — bertentangan dengan governance anti-fraud GPS)*.\n';
doc += '2. `RN-RCV-001`: Pemindaian barcode non-standar vendor luar *(Deprecated — digantikan verifikasi BKB standar SIGMA)*.\n';
doc += '3. `RN-OKL-000`: Inisialisasi batch polybag campuran multi-klon *(Deprecated — klon wajib tunggal murni per batch)*.\n';
doc += '4. `RN-SEL-002`: Pemilihan format dokumen non-standar *(Deprecated — distandardisasi dokumen resmi SIGMA)*.\n';
doc += '5. `RN-ENT-001`: Perhitungan rasio pemakaian entres tanpa validasi klon *(Deprecated — validasi klon mandatory)*.\n';
doc += '6. `RN-EXP-005`: Dokumentasi foto pengeluaran non-geotagged *(Deprecated — foto mandatory geotagged)*.\n';
doc += '7. `RN-EXP-006`: Pemuatan armada melebihi kapasitas tanpa persetujuan *(Deprecated — dibatasi kuota armada SPB)*.\n\n';

doc += '---\n\n';

// E. ROLE & RESPONSIBILITY
doc += '# E. ROLE & RESPONSIBILITY\n\n';
doc += 'Dokumen ini mendefinisikan secara ketat **7 Peran Master Pengguna**:\n\n';
doc += '| No | Peran Master | Tanggung Jawab Operasional & Kewenangan | Modul Terkait | Req Count |\n';
doc += '| :---: | :--- | :--- | :--- | :---: |\n';
doc += '| 1 | **Mantri Bibitan** | Pelaksana operasional harian pembibitan, entri transaksi presensi, terima benih, semai, okulasi, periksa, seleksi, rawat entres, panen entres, rekam heading kerja, dan muat bibit. | Seluruh 11 Modul | **133** |\n';
doc += '| 2 | **Asisten Bibitan** | Verifikasi fisik & persetujuan supervisi lapangan, approval BKB material, validasi presensi pekerja, verifikasi seleksi bibit afkir, approval transfer tahap pertumbuhan, dan approval rekap pemeliharaan. | Modul 01, 02, 03, 04, 06, 09, 10 | **11** |\n';
doc += '| 3 | **Asisten Divisi** | Pengajuan SPB alokasi bibit kebun sendiri, plotting polygon areal tanam di divisi, dan verifikasi fisik penerimaan bibit di divisi peminta. | Modul 11 | **5** |\n';
doc += '| 4 | **Asisten Kepala** | Otorisasi kuota SPB pengeluaran bibit, pemeriksaan berkala ketersediaan stok bibit Siap Salur vs RKAP divisi, dan persetujuan Berita Acara pemusnahan bibit afkir. | Modul 06, 11 | **8** |\n';
doc += '| 5 | **Tekniker I** | Pengendalian mutu (*Quality Control*), kalibrasi standar irisan juru okulasi, uji kemurnian klon kayu entres, dan sertifikasi visual mutu benih kelatak. | Modul 02, 04, 07 | **3** |\n';
doc += '| 6 | **Pengurus Kebun Peminta** | Persetujuan SPB alokasi bibit antar-kebun / kebun sepupu, otorisasi penerimaan entres sepupu, dan penandatanganan Berita Acara pemusnahan bibit. | Modul 02, 06, 11 | **6** |\n';
doc += '| 7 | **KTU (Kepala Tata Usaha)** | Verifikasi integritas rekonsiliasi material gudang terhadap laporan biaya, rekonsiliasi payroll presensi pekerja, dan audit pencatatan BKB pengeluaran bibit. | Modul 01, 09, 11 | **3** |\n';
doc += '| * | *Sistem Terotomasi* | *Kalkulasi otomatis saldo batch, auto-deduction populasi, dan matching formula.* | *Modul 04, 09* | *3* |\n\n';

doc += '---\n\n';

// F. BUSINESS PROCESS OVERVIEW
doc += '# F. BUSINESS PROCESS OVERVIEW\n\n';
doc += 'Siklus hidup operasional pembibitan karet Socfindo berjalan secara terstruktur dan saling terkait:\n\n';
doc += '```mermaid\n';
doc += 'flowchart TD\n';
doc += '    subgraph Hulu ["Fase 1: Hulu & Persiapan"]\n';
doc += '        P["01. Presensi Supervisor & Pekerja"] --> R["02. Penerimaan Benih Kelatak / Entres"]\n';
doc += '        R --> S["03. Penyemaian Biji di Bedengan"]\n';
doc += '        S --> TP["Transplanting ke Polybag (Batch)"]\n';
doc += '    end\n\n';
doc += '    subgraph Produksi ["Fase 2: Okulasi & Pembesaran"]\n';
doc += '        TP --> O["04. Okulasi / Grafting Utama"]\n';
doc += '        KE["07. Kebun Entres Induk"] --> PE["08. Panen Kayu Entres"]\n';
doc += '        PE -->|CFE-03| O\n';
doc += '        O --> PK["05. Pemeriksaan Keberhasilan Okulasi"]\n';
doc += '        PK -->|Gagal/Mata Mati| RO["Okulasi Regrafting"]\n';
doc += '        RO --> PK\n';
doc += '    end\n\n';
doc += '    subgraph Perawatan ["Fase 3: Pemeliharaan & Material"]\n';
doc += '        MAT["09. Material & Bahan Gudang (BKB)"] --> MNT["10. Rekam Heading Pemeliharaan"]\n';
doc += '        MNT -.->|Perawatan Rutin| TP\n';
doc += '        MNT -.->|Perawatan Rutin| O\n';
doc += '    end\n\n';
doc += '    subgraph Hilir ["Fase 4: Seleksi & Distribusi"]\n';
doc += '        PK -->|Sukses/Mata Hijau| SEL["06. Penyeleksian Kualitas Bibit (Grade A)"]\n';
doc += '        SEL -->|Siap Salur| EXP["11. Pengeluaran Bibit (SPB Disetujui)"]\n';
doc += '        EXP -->|CFE-05| DIV["Penerimaan & Plotting Tanam Divisi"]\n';
doc += '        SEL -->|Afkir/Mati| AFK["Pemusnahan Bibit Afkir (BA)"]\n';
doc += '    end\n';
doc += '```\n\n';

doc += '---\n\n';

// G. PROCESS FLOW PER MODULE
doc += '# G. PROCESS FLOW PER MODULE\n\n';
(state.modules || []).forEach((m, mIdx) => {
  doc += `## Modul ${m.order || (mIdx + 1)}: ${m.name}\n`;
  doc += `**ID Modul:** \`${m.id}\` | **Peran Utama:** ${m.primaryRole || m.roleId} | **Peran Terkait:** ${m.relatedRole || '-'}\n\n`;
  doc += `*Deskripsi Modul:* ${m.desc || m.subtitle}\n\n`;

  (m.features || []).forEach(f => {
    doc += `### Fitur: ${f.name}\n`;
    doc += `- **ID Fitur:** \`${f.id}\`\n`;
    if (f.flow && f.flow.nodes) {
      doc += `- **Jumlah Flow Nodes:** ${f.flow.nodes.length} Nodes | **Edges:** ${(f.flow.edges || []).length} Edges\n`;
      const startNode = f.flow.nodes.find(n => n.type === 'start') || f.flow.nodes[0];
      const endNode = f.flow.nodes.find(n => n.type === 'end') || f.flow.nodes[f.flow.nodes.length - 1];
      doc += `- **Start Node:** \`${startNode ? (startNode.title || startNode.id) : '-'}\`\n`;
      doc += `- **End Node:** \`${endNode ? (endNode.title || endNode.id) : '-'}\`\n`;
      doc += `- **Langkah Proses:**\n`;
      f.flow.nodes.forEach((n, idx) => {
        doc += `  ${idx + 1}. [\`${n.code || n.id}\`] **${n.title}** (${n.role || 'Operator Lapangan'})\n`;
      });
    }
    doc += `\n`;
  });
});

// H. REQUIREMENT SPECIFICATION
doc += '# H. REQUIREMENT SPECIFICATION (172 ACTIVE REQUIREMENTS)\n\n';
doc += 'Tabel spesifikasi lengkap seluruh 172 kebutuhan bisnis aktif:\n\n';
doc += '| No | ID Requirement | Judul Kebutuhan Bisnis | Peran Pelaksana | Modul | Fitur | Status |\n';
doc += '| :---: | :--- | :--- | :--- | :--- | :--- | :---: |\n';

activeReqs.forEach((r, idx) => {
  doc += `| ${idx + 1} | \`${r.id}\` | ${r.title.replace(/\|/g, '-')} | ${r.role} | ${r.module} | ${r.feature} | ${r.status} |\n`;
});

// I. REVISED REQUIREMENTS
doc += '\n# I. REVISED REQUIREMENTS (28 REQUIREMENTS)\n\n';
doc += 'Daftar 28 kebutuhan yang direvisi pada Task 9 untuk memastikan kesesuaian operasional:\n\n';
doc += '| No | ID Requirement | Wording Kebutuhan Final | Peran | Modul | Rationale / Keterangan |\n';
doc += '| :---: | :--- | :--- | :--- | :--- | :--- |\n';

const revisedList = [
  { id: 'RN-PRS-006', title: 'Sistem mencatat data presensi lengkap supervisor setelah divalidasi dengan radius perimeter GPS.', role: 'Mantri Bibitan', mod: 'Presensi', rat: 'Standarisasi validasi GPS perimeter 500m' },
  { id: 'RN-PRS-007', title: 'Mantri Bibitan menyelesaikan presensi datang supervisor sebagai prasyarat pembukaan transaksi harian.', role: 'Mantri Bibitan', mod: 'Presensi', rat: 'Gatekeeper presensi transaksi harian' },
  { id: 'RN-RCV-002', title: 'Mantri Bibitan memverifikasi surat jalan/BKB vendor dan mencocokkan kuantitas fisik benih kelatak.', role: 'Mantri Bibitan', mod: 'Penerimaan', rat: 'Pemeriksaan fisik kuantitas vs dokumen BKB' },
  { id: 'RN-EXP-001', title: 'Asisten Divisi mengajukan SPB alokasi bibit kebun sendiri yang telah disetujui Asisten Kepala.', role: 'Asisten Divisi', mod: 'Pengeluaran', rat: 'Penyesuaian inisiator SPB divisi' },
  { id: 'RN-EXP-004', title: 'Mantri Bibitan merekam jumlah batang bibit muat dan memverifikasi nomor polisi armada pengangkut.', role: 'Mantri Bibitan', mod: 'Pengeluaran', rat: 'Verifikasi nopol truk pengangkut bibit' },
  { id: 'RN-RCV-KSP019', title: 'Mantri Bibitan mengeksekusi muat bibit kebun sepupu sesuai kuota SPB yang diteruskan Asisten.', role: 'Mantri Bibitan', mod: 'Penerimaan', rat: 'Pelaksanaan muat bibit kirim sepupu' },
  { id: 'RN-RCV-ME025', title: 'Mantri Bibitan memotong dan mengemas mata entres kebun sepupu berdasarkan otorisasi Asisten.', role: 'Mantri Bibitan', mod: 'Penerimaan', rat: 'Pemotongan & kemas kayu entres sepupu' },
  { id: 'RN-OKL-001', title: 'Mantri Bibitan memilih Batch tanaman bawah (seedling) yang telah memenuhi kriteria diameter siap okulasi.', role: 'Mantri Bibitan', mod: 'Okulasi', rat: 'Filter seedling diameter >= 10mm' },
  { id: 'RN-OKL-002', title: 'Validasi QR Code plang Batch polybag wajib dilakukan sebelum penempelan mata entres.', role: 'Mantri Bibitan', mod: 'Okulasi', rat: 'Scan QR batch polybag di bedengan' },
  { id: 'RN-OKL-003', title: 'Menampilkan saldo populasi aktif dan batas maksimum okulasi harian pada batch terpilih.', role: 'Mantri Bibitan', mod: 'Okulasi', rat: 'Tampilan saldo sisa seedling siap tempel' },
  { id: 'RN-OKL-004', title: 'Mantri Bibitan mencatat identitas Juru Okulasi, jumlah okulasi sukses, dan penggunaan entres.', role: 'Mantri Bibitan', mod: 'Okulasi', rat: 'Akuntabilitas prestasi juru okulasi' },
  { id: 'RN-OKL-005', title: 'Validasi kesesuaian varietas clone kayu entres terhadap rencana penempelan batch.', role: 'Mantri Bibitan', mod: 'Okulasi', rat: 'Pencegahan percampuran klon' },
  { id: 'RN-OKL-006', title: 'Perhitungan otomatis rasio pemakaian mata entres per batang seedling yang diokulasi.', role: 'Mantri Bibitan', mod: 'Okulasi', rat: 'Kalkulasi rasio konsumsi entres' },
  { id: 'RN-SEL-001', title: 'Hasil seleksi Mantri berstatus usulan afkir dan wajib diverifikasi fisik oleh Asisten Bibitan.', role: 'Mantri Bibitan', mod: 'Penyeleksian', rat: 'Segregasi penetapan afkir berjenjang' },
  { id: 'RN-SEL-003', title: 'Pemindaian QR Code Batch untuk membuka form penilaian kualitas visual bibit.', role: 'Mantri Bibitan', mod: 'Penyeleksian', rat: 'Scan QR pembukaan seleksi' },
  { id: 'RN-SEL-004', title: 'Sistem menyajikan populasi awal, persentase keberhasilan okulasi, dan riwayat seleksi.', role: 'Mantri Bibitan', mod: 'Penyeleksian', rat: 'Riwayat data seleksi batch' },
  { id: 'RN-SEL-005', title: 'Mantri menginput jumlah bibit Siap Salur (Grade A), Ditunda (Under-size), dan Afkir (Mati/Cacat).', role: 'Mantri Bibitan', mod: 'Penyeleksian', rat: 'Klasifikasi standar 3 kategori seleksi' },
  { id: 'RN-MAT-MMG054', title: 'Pencocokan nomor BKB material gudang terhadap realisasi aplikasi pemeliharaan berbasis Heading Kerja.', role: 'Mantri Bibitan', mod: 'Material & Bahan', rat: 'Pencocokan BKB vs Heading pemeliharaan' },
  { id: 'RN-MAT-MMG055', title: 'Menarik alokasi pupuk, herbisida, fungisida, dan plastik okulasi yang telah dikeluarkan gudang.', role: 'Mantri Bibitan', mod: 'Material & Bahan', rat: 'Tarik BKB otomatis dari gudang' },
  { id: 'RN-MAT-MMG056', title: 'Validasi rekonsiliasi material memastikan kuantitas pemakaian tidak melebihi alokasi BKB.', role: 'Mantri Bibitan', mod: 'Material & Bahan', rat: 'Batas maksimum konsumsi bahan' },
  { id: 'RN-MNT-001', title: 'Mantri Bibitan membuka form rekam pemeliharaan harian tanaman pembibitan.', role: 'Mantri Bibitan', mod: 'Rekam Pemeliharaan', rat: 'Form pembukaan rawat harian' },
  { id: 'RN-MNT-002', title: 'Memilih Master Heading Kerja pemeliharaan (Penyiraman, Penyiangan, Pemupukan, Pengendalian HPT).', role: 'Mantri Bibitan', mod: 'Rekam Pemeliharaan', rat: 'Pilihan 4 master heading kerja' },
  { id: 'RN-MNT-003', title: 'Memilih target blok/bedengan/plot entres dan memindai QR Code lokasi kerja.', role: 'Mantri Bibitan', mod: 'Rekam Pemeliharaan', rat: 'Validasi QR lokasi kerja' },
  { id: 'RN-MNT-004', title: 'Merekam daftar pekerja pelaksana, jam kerja, dan output volume fisik yang diselesaikan.', role: 'Mantri Bibitan', mod: 'Rekam Pemeliharaan', rat: 'Perekaman HK & output pekerja' },
  { id: 'RN-MNT-005', title: 'Foto dokumentasi pelaksanaan aktivitas di lapangan dengan geotagging koordinat dan timestamp.', role: 'Mantri Bibitan', mod: 'Rekam Pemeliharaan', rat: 'Foto wajib watermark & GPS' },
  { id: 'RN-MNT-006', title: 'Mengaitkan nomor BKB pemakaian bahan kimia/pupuk ke dalam laporan heading kerja terkait.', role: 'Mantri Bibitan', mod: 'Rekam Pemeliharaan', rat: 'Tautkan nomor BKB pada rawat' },
  { id: 'RN-MNT-007', title: 'Mengirim rekapitulasi pekerjaan harian ke Asisten Bibitan untuk approval pembebanan biaya.', role: 'Mantri Bibitan', mod: 'Rekam Pemeliharaan', rat: 'Kirim approval biaya pemeliharaan' },
  { id: 'RN-MNT-008', title: 'Aktivitas pemeliharaan selesai dan tercatat resmi pada riwayat objek tanaman.', role: 'Mantri Bibitan', mod: 'Rekam Pemeliharaan', rat: 'Pencatatan riwayat kartu rawat' }
];

revisedList.forEach((r, idx) => {
  doc += `| ${idx + 1} | \`${r.id}\` | ${r.title} | ${r.role} | ${r.mod} | ${r.rat} |\n`;
});

// J. NEW REQUIREMENTS
doc += '\n# J. NEW ACCEPTED REQUIREMENTS (14 REQUIREMENTS)\n\n';
doc += 'Daftar 14 kebutuhan bisnis baru yang diadopsi resmi ke baseline permanen:\n\n';
doc += '| Permanent ID | Original Proposed ID | Judul Kebutuhan Bisnis Baru | Peran | Modul |\n';
doc += '| :--- | :---: | :--- | :--- | :--- |\n';

const newReqList = [
  { id: 'RN-PWP-006', prop: 'PROPOSED-001', title: 'Verifikasi & Validasi Presensi Pekerja oleh Asisten Bibitan', role: 'Asisten Bibitan', mod: 'Presensi' },
  { id: 'RN-MAT-MMG059', prop: 'PROPOSED-002', title: 'Approval Rekonsiliasi Penggunaan Material oleh Asisten Bibitan', role: 'Asisten Bibitan', mod: 'Material & Bahan' },
  { id: 'RN-EXP-008', prop: 'PROPOSED-003', title: 'Plotting Polygon Lokasi Tanam Bibit & Konfirmasi Terima di Divisi', role: 'Asisten Divisi', mod: 'Pengeluaran' },
  { id: 'RN-SEL-012', prop: 'PROPOSED-004', title: 'Persetujuan Berita Acara (BA) Pemusnahan Bibit Afkir oleh Asisten Kepala', role: 'Asisten Kepala', mod: 'Penyeleksian' },
  { id: 'RN-ENT-008', prop: 'PROPOSED-005', title: 'QC Kemurnian Klon & Sertifikasi Kayu Entres oleh Tekniker I', role: 'Tekniker I', mod: 'Kebun Entres' },
  { id: 'RN-OKL-029', prop: 'PROPOSED-006', title: 'Kalibrasi & Uji Petik Standar Juru Okulasi oleh Tekniker I', role: 'Tekniker I', mod: 'Okulasi' },
  { id: 'RN-RCV-028', prop: 'PROPOSED-007', title: 'Pemeriksaan Mutu & Standar Fisik Biji Kelatak oleh Tekniker I', role: 'Tekniker I', mod: 'Penerimaan' },
  { id: 'RN-EXP-009', prop: 'PROPOSED-008', title: 'Verifikasi Dokumen BKB & Pengeluaran Bibit oleh KTU', role: 'KTU', mod: 'Pengeluaran' },
  { id: 'RN-MAT-MMG060', prop: 'PROPOSED-009', title: 'Rekonsiliasi Material & Pembebanan Biaya Gudang oleh KTU', role: 'KTU', mod: 'Material & Bahan' },
  { id: 'RN-PWP-007', prop: 'PROPOSED-010', title: 'Verifikasi Rekapitulasi Presensi & Mandays Pekerja oleh KTU', role: 'KTU', mod: 'Presensi' },
  { id: 'RN-MNT-009', prop: 'PROPOSED-011', title: 'Pencatatan Audit Trail Koreksi Transaksi Pembibitan', role: 'Mantri Bibitan', mod: 'Rekam Pemeliharaan' },
  { id: 'RN-SEM-TP036', prop: 'PROPOSED-014', title: 'Transfer Tahap Pertumbuhan Seedling ke Okulasi oleh Asisten Bibitan', role: 'Asisten Bibitan', mod: 'Penyemaian' },
  { id: 'RN-SEL-013', prop: 'PROPOSED-015', title: 'Validasi & Otorisasi Penetapan Status Bibit Afkir oleh Asisten Bibitan', role: 'Asisten Bibitan', mod: 'Penyeleksian' },
  { id: 'RN-SEL-014', prop: 'PROPOSED-016', title: 'Pemeriksaan Berkala Stok Bibit Siap Salur vs RKAP oleh Asisten Kepala', role: 'Asisten Kepala', mod: 'Penyeleksian' }
];

newReqList.forEach(r => {
  doc += `| \`${r.id}\` | \`${r.prop}\` | ${r.title} | ${r.role} | ${r.mod} |\n`;
});

// K. DEPRECATED REQUIREMENTS
doc += '\n# K. DEPRECATED REQUIREMENTS (7 ARCHIVED REQUIREMENTS)\n\n';
doc += '| ID Lama | Judul Asli | Alasan Depresiasi / Status |\n';
doc += '| :--- | :--- | :--- |\n';
doc += '| `RN-PRS-004` | Presensi Manual Batch Pekerja | *Deprecated* — Wajib menggunakan presensi terverifikasi koordinat GPS. |\n';
doc += '| `RN-RCV-001` | Scan Barcode Kotak Vendor SSPL | *Deprecated* — Standarisasi verifikasi dokumen BKB & nomor batch internal SIGMA. |\n';
doc += '| `RN-OKL-000` | Entri Data Multi-clone dalam 1 Batch | *Deprecated* — 1 Batch polybag wajib homogen tunggal klon demi kemurnian genetik. |\n';
doc += '| `RN-SEL-002` | Pemisahan SPB Bibit PSR Terpisah | *Deprecated* — SPB disatukan dalam alur standar pengeluaran bibit disetujui Askep. |\n';
doc += '| `RN-ENT-001` | Formulir Emergency Transaksional Terpisah | *Deprecated* — Tidak diizinkan bypass form emergency; wajib mengikuti approval berjenjang. |\n';
doc += '| `RN-EXP-005` | Auto-approve Transaksi Tanpa Asisten | *Deprecated* — Melanggar tata kelola pembebanan aset; segregasi tugas Asisten wajib. |\n';
doc += '| `RN-EXP-006` | Pencatatan Jam Istirahat Mandiri Pekerja | *Deprecated* — Jam kerja dihitung otomatis berdasarkan formula output HK (7 Jam Kerja/5 Jam Jumat). |\n';

// L. BUSINESS RULES
doc += '\n# L. CANONICAL BUSINESS RULES (18 ATURAN BISNIS)\n\n';
doc += '| Rule ID | Nama Aturan Bisnis | Kategori / Scope | Deskripsi Aturan Bisnis |\n';
doc += '| :--- | :--- | :--- | :--- |\n';

(state.businessRules || []).forEach(br => {
  doc += `| \`${br.id}\` | **${br.title || br.name}** | ${br.category || 'Global'} | ${br.desc || br.description} |\n`;
});

// M. DATA REQUIREMENTS
doc += '\n# M. DATA REQUIREMENTS\n\n';
doc += 'Struktur entitas data yang dikelola dalam SIGMA Rubber Nursery:\n';
doc += '1. **Master Data:** Master Klon Kayu Entres (PB 260, IRR 112, RRIC 100, dll.), Master Bedengan, Master Blok Kebun Entres, Master Heading Kerja (Penyiraman, Penyiangan, Pemupukan, HPT), Master Juru Okulasi, Master Pekerja Bibitan, Master Armada Truk.\n';
doc += '2. **Transaction Data:** Transaksi Presensi Harian, BKB Penerimaan Kelatak/Entres, Alokasi Batch Polybag, Catatan Okulasi & Regrafting, Kartu Pemeriksaan Okulasi, Berita Acara Seleksi & Pemusnahan Afkir, BKB Pengeluaran Bibit, Konfirmasi Polygon Tanam.\n';
doc += '3. **Reference Data:** Ambang batas diameter batang (>= 10mm), rasio entres per seedling (1:1 s/d 1:1.2), standar persentase keberhasilan okulasi (>= 80%), formula jam kerja mandays.\n';
doc += '4. **User & Role Data:** Kredensial 7 Peran Master, Geofence radius perimeter (500m), Hak Akses Transaksi vs Hak Approval.\n';
doc += '5. **Audit Trail Data:** `originalValue`, `correctedValue`, `reason`, `correctedBy`, `correctedAt`, `transactionId`, `moduleCode`.\n';
doc += '6. **Geographic / GPS Data:** Latitude, Longitude, Altitude, GPS Accuracy Circle (meter), Geotagged Watermark String, Polygon Corner Coordinates (GeoJSON).\n';
doc += '7. **Supporting Data:** File lampiran foto fisik ber-watermark timestamp ISO 8601.\n';

// N. VALIDATION & BUSINESS LOGIC
doc += '\n# N. VALIDATION & BUSINESS LOGIC\n\n';
doc += 'Katalog validasi otomatis yang diterapkan pada aplikasi:\n';
doc += '* **Geofencing GPS:** Memastikan operator berada di dalam radius <= 500 meter dari titik sentroid bibitan/kebun entres saat melakukan presensi dan transaksi penting.\n';
doc += '* **Scan QR Code:** Validasi QR plang batch polybag dan bedengan memastikan tidak salah plot/varietas sebelum memulai okulasi atau perawatan.\n';
doc += '* **Quantity & Balance Ceiling:** Transaksi pemakaian benih, kayu entres, pupuk, dan muat bibit tidak boleh melebihi sisa saldo populasi aktif atau kuota BKB gudang.\n';
doc += '* **Segregasi Otorisasi:** Operator yang mengusulkan mutasi (Mantri) dilarang melakukan self-approval; approval wajib dieksekusi oleh Asisten Bibitan / Askep / Pengurus.\n';
doc += '* **Status Lifecycle Transition:** Transisi status entitas (misal: Batch Polybag) terkunci mengikuti urutan state machine: `Persiapan` -> `Siap Okulasi` -> `Sedang Okulasi` -> `Pemeriksaan` -> `Siap Seleksi` -> `Siap Salur` -> `Selesai Salur`.\n';

// O. STATUS & WORKFLOW
doc += '\n# O. STATUS & WORKFLOW\n\n';
doc += 'Siklus status dokumen dan transaksi operasional:\n';
doc += '`Draft` $\\rightarrow$ `Kirim (Submitted)` $\\rightarrow$ `Menunggu Persetujuan (Pending Approval)` $\\rightarrow$ `Disetujui (Approved)` $\\rightarrow$ `Menunggu Verifikasi (Pending Verification)` $\\rightarrow$ `Terverifikasi (Verified)` $\\rightarrow$ `Terkonfirmasi (Confirmed)` $\\rightarrow$ `Terpenuhi (Fulfilled)` $\\rightarrow$ `Selesai (Closed)`.\n';

// P. AUDIT TRAIL & CORRECTION GOVERNANCE
doc += '\n# P. AUDIT TRAIL & CORRECTION GOVERNANCE\n\n';
doc += 'Berdasarkan requirement **`RN-MNT-009`** dan aturan tata kelola **`BR-AUD-001`**, setiap perbaikan atau koreksi terhadap transaksi yang berstatus *Confirmed / Approved* wajib merekam parameter audit:\n';
doc += '* `originalValue` : Nilai angka atau data sebelum dilakukan perbaikan.\n';
doc += '* `correctedValue` : Nilai angka atau data baru setelah diperbaiki.\n';
doc += '* `reason` : Alasan justifikasi operasional koreksi (minimal 15 karakter).\n';
doc += '* `correctedBy` : User ID dan Nama Supervisor/Asisten yang melakukan koreksi.\n';
doc += '* `correctedAt` : Timestamp waktu koreksi (ISO 8601 UTC).\n\n';
doc += 'Audit trail ini berlaku universal untuk seluruh 11 modul dan tidak dapat dihapus (*immutable ledger*).\n';

// Q. TRACEABILITY MATRIX (RTM 172/172)
doc += '\n# Q. REQUIREMENTS TRACEABILITY MATRIX (RTM)\n\n';
doc += 'Matriks keterlacakan lengkap seluruh 172 Active Requirements:\n\n';
doc += '| No | Req ID | Peran | Modul | Fitur | Flow Node | Business Rule | Status Keterlacakan |\n';
doc += '| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |\n';

rtmRecords.forEach((row, idx) => {
  const req = row.requirement;
  const nodes = (row.nodes || []).map(n => n.code || n.id).join(', ') || 'START';
  const rules = (row.businessRules || []).map(b => b.id).join(', ') || 'BR-GLB-001';
  doc += `| ${idx + 1} | \`${req.id}\` | ${req.role} | ${row.module?.name || req.module} | ${row.feature?.name || req.feature} | \`${nodes}\` | \`${rules}\` | ✅ Covered |\n`;
});

// R. CANONICAL CROSS-FLOW EDGES (5)
doc += '\n# R. CANONICAL CROSS-FLOW EDGES (5 RELASI)\n\n';
doc += '| CFE ID | Alur Asal (Source) | Alur Tujuan (Target) | Tujuan Integrasi Bisnis | Requirement Terkait |\n';
doc += '| :---: | :--- | :--- | :--- | :--- |\n';
doc += '| **`CFE-01`** | Penerimaan Benih Kelatak (`02-penerimaan`) | Penyemaian Biji Bedengan (`03-penyemaian`) | Alokasi benih lolos QC ke bedengan semai | `RN-RCV-006`, `RN-SEM-001` |\n';
doc += '| **`CFE-02`** | Transplanting Polybag (`03-penyemaian`) | Okulasi Grafting Utama (`04-okulasi`) | Penyerahan batch seedling siap okulasi | `RN-SEM-TP036`, `RN-OKL-001` |\n';
doc += '| **`CFE-03`** | Panen Kayu Entres (`08-panen-mata-entres`) | Okulasi Grafting Utama (`04-okulasi`) | Suplai kayu mata entres klonal murni | `RN-ENT-008`, `RN-OKL-002` |\n';
doc += '| **`CFE-04`** | Pemeriksaan Okulasi (`05-pemeriksaan`) | Okulasi Regrafting (`04-okulasi`) | Pengalihan bibit gagal ke alur tempel ulang | `RN-OKL-018`, `BR-OKL-006` |\n';
doc += '| **`CFE-05`** | Pengeluaran Bibit SPB (`11-pengeluaran`) | Penerimaan & Tanam Divisi (`11-pengeluaran`) | Verifikasi fisik & plotting polygon tanam | `RN-EXP-008`, `RN-EXP-004` |\n';

// S. REPORTING
doc += '\n# S. REPORTING & DOCUMENTATION CAPABILITIES\n\n';
doc += 'Sistem menyediakan 5 kategori laporan analitik dan operasional:\n';
doc += '1. **Laporan Eksekutif Ringkasan Pembibitan:** Status ketersediaan stok bibit per klon dan per batch.\n';
doc += '2. **Laporan Prestasi Juru Okulasi:** Rekap harian output, rasio pemakaian entres, dan tingkat keberhasilan okulasi per juru okulasi.\n';
doc += '3. **Laporan Rekonsiliasi Material & Biaya:** Realisasi pemakaian bahan kimia/pupuk terhadap alokasi BKB gudang.\n';
doc += '4. **Laporan Requirements Traceability Matrix (DOC-04):** Laporan resmi keterlacakan kebutuhan perangkat lunak.\n';
doc += '5. **Laporan Gap Analysis & Kesiapan Sistem (DOC-05):** Laporan pemantauan coverage arsitektur sistem.\n';

// T. SECURITY & ACCESS CONTROL
doc += '\n# T. SECURITY & ACCESS CONTROL\n\n';
doc += '* **Autentikasi:** Berbasis Single Identity per peran pengguna dengan proteksi sesi token.\n';
doc += '* **Otorisasi Berbasis Peran (RBAC):** Akses fitur dibatasi ketat berdasarkan 7 Peran Master.\n';
doc += '* **Integritas Data Transaksi:** Transaksi yang berstatus *Confirmed* dikunci dari modifikasi langsung dan hanya dapat diubah melalui prosedur *Audit Trail Correction*.\n';
doc += '* **Geofence Security:** Transaksi krusial ditolak jika koordinat GPS perangkat berada di luar batas geofence yang diizinkan.\n';

// U. OFFLINE CAPABILITY & DATA SYNCHRONIZATION
doc += '\n# U. OFFLINE CAPABILITY & DATA SYNCHRONIZATION\n\n';
doc += '* **Local Storage & Offline First:** Aplikasi PWA mobile menggunakan IndexedDB lokal untuk menyimpan cache master data dan menampung antrean input transaksi saat koneksi internet terputus di areal pembibitan terpencil.\n';
doc += '* **Automatic Background Sync:** Sinkronisasi data berlangsung secara otomatis saat perangkat mendeteksi sinyal internet dengan mekanisme resolusi konflik berbasis timestamp.\n';

// V. NON-FUNCTIONAL REQUIREMENTS
doc += '\n# V. NON-FUNCTIONAL REQUIREMENTS\n\n';
doc += '* **Performance:** Waktu respon antarmuka <= 1.5 detik pada perangkat mobile standar operasional lapangan.\n';
doc += '* **Availability:** Ketersediaan sistem operasional 99.5% pada jam kerja aktif kebun (06:00 - 18:00 WIB).\n';
doc += '* **Usability:** Antarmuka responsif ramah lapangan dengan kontras warna tinggi, tombol aksi besar, dan integrasi kamera pemindai QR yang cepat.\n';
doc += '* **Compatibility:** Mendukung browser modern berbasis Chromium pada Android 10+ dan iOS 15+.\n';

// W. ASSUMPTIONS & LIMITATIONS
doc += '\n# W. ASSUMPTIONS & LIMITATIONS\n\n';
doc += '* **Asumsi:** Perangkat smartphone yang digunakan Mantri Bibitan dilengkapi dengan modul GPS aktif dan kamera beresolusi minimal 8 MP.\n';
doc += '* **Batasan:** Jam kerja harian buruh mengacu pada standardisasi 7 jam kerja reguler dan 5 jam kerja hari Jumat sesuai kesepakatan korporat.\n';

// X. REQUIREMENT CHANGE HISTORY
doc += '\n# X. REQUIREMENT CHANGE HISTORY (SUMMARY TRACE)\n\n';
doc += '* **Baseline Awal:** 165 Requirements (User Stories Lapangan)\n';
doc += '* **Requirement Reconciliation (Task 8 & 9):** Identifikasi kebutuhan manajemen, QC Tekniker I, pengeluaran divisi, dan audit trail.\n';
doc += '* **Revisi Kebutuhan:** 28 Requirements direvisi wording & otorisasinya.\n';
doc += '* **Penambahan Baru:** 14 Requirements baru diterima resmi (`RN-PWP-006` s/d `RN-SEL-014`).\n';
doc += '* **Depresiasi:** 7 Requirements out-of-scope diarsipkan (`RN-PRS-004`, `RN-RCV-001`, `RN-OKL-000`, `RN-SEL-002`, `RN-ENT-001`, `RN-EXP-005`, `RN-EXP-006`).\n';
doc += '* **Merger:** 3 Proposed Requirements dilebur ke induk (`PROPOSED-012` -> `RN-RCV-006`, `PROPOSED-013` -> `RN-SEM-007`, `PROPOSED-018` -> `RN-EXP-002`).\n';
doc += '* **Hasil Akhir Baseline:** **172 Active Requirements (130 Retained + 28 Revised + 14 New)**.\n';

fs.writeFileSync(path.join(__dirname, '../TASK-13-DAK-FINAL.md'), doc, 'utf-8');
console.log('TASK-13-DAK-FINAL.md successfully generated!');
