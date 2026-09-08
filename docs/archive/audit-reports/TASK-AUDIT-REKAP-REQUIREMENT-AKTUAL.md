# AUDIT & REKAP REQUIREMENT AKTUAL PROYEK SIGMA RUBBER NURSERY

**Tanggal Audit:** 7 September 2026
**Status Audit:** 100% READ-ONLY / FACTUAL AUDIT (Tanpa Modifikasi Data)

---

## 1. SOURCE OF TRUTH & RUNTIME DATASET ANALYSIS

### 1.1 Identifikasi Seluruh Sumber Requirement
Berdasarkan audit runtime dan static analysis terhadap seluruh codebase, ditemukan **4 file / sumber** yang memuat definisi requirement:

1. **`js/data/process-mapping-baseline.js` (PRIMARY RUNTIME SOURCE OF TRUTH)**
   - Format: ES Module (`export const PROCESS_MAPPING_BASELINE = { ... }`).
   - Peran Runtime: Diimpor langsung oleh `js/modules/process-mapping/process-mapping-data.js` melalui fungsi `fetchOfficialSourceData()` saat inisialisasi store aplikasi (`initProjectDataStore()`).
   - Jumlah Requirement: **179 domain requirement** (172 Active Confirmed + 7 Deprecated).
   - General Requirements: **14 Functional** (`KF-001` s/d `KF-014`) & **10 Non-Functional** (`KNF-001` s/d `KNF-010`).

2. **`data/process-mapping-data.json` (CANONICAL STATIC JSON REPOSITORY)**
   - Format: Pure JSON.
   - Peran: Source of truth statis untuk ekspor, migrasi data, dan interoperabilitas sistem.
   - Keselarasan: **100% identik (0 mismatch)** dengan `js/data/process-mapping-baseline.js`.

3. **`docs/final-release/SIGMA-RUBBER-NURSERY-REQUIREMENT-BASELINE-FINAL.md` (OFFICIAL BASELINE DOCUMENT)**
   - Format: Markdown Dokumentasi Rilis Resmi.
   - Peran: Dokumen referensi formal proyek untuk serah terima stakeholder.
   - Jumlah: Memuat tepat **172 Active Confirmed Requirements**.

4. **`requirement.md` (LEGACY / PRE-CONSOLIDATION DRAFT - UNUSED AT RUNTIME)**
   - Format: Markdown dengan embedded JSON block.
   - Status: **STALE (Dataset historis awal)**. Memuat 165 requirement sebelum rekonsiliasi 172 baseline.
   - Dampak Runtime: **TIDAK TERBACA OLEH RUNTIME APLIKASI** (tidak diimpor atau di-fetch oleh modul mana pun).

## 2. REKAP JUMLAH AKTUAL (FINAL COUNT)

| Metrik Requirement | Jumlah Aktual | Keterangan |
|---|---|---|
| **Total Unique Req ID (Master)** | **179** | Termasuk 172 aktif & 7 deprecated |
| **Active Requirements** | **172** | Seluruhnya berstatus **Confirmed** |
| **Archived / Deprecated Requirements** | **7** | `RN-PRS-004`, `RN-RCV-001`, `RN-OKL-000`, `RN-SEL-002`, `RN-ENT-001`, `RN-EXP-005`, `RN-EXP-006` |
| **General Functional Requirements (KF)** | **14** | `KF-001` s/d `KF-014` |
| **Non-Functional Requirements (KNF)** | **10** | `KNF-001` s/d `KNF-010` |
| **Requirement dengan Linked Flow Node** | **115** | Terpetakan langsung ke diagram alur proses visual |
| **Requirement tanpa Linked Flow Node** | **57** | Requirement audit trail, validasi database, approval multi-role, dan rule governance |
| **Total Active Flow Nodes** | **122** | 122 langkah proses operasional aktif across 11 modul |
| **Duplicate Req ID** | **0** | Tidak ada duplikasi ID pada active dataset |
| **Requirement Conflict antar Source** | **0** | Baseline JS & JSON 100% konsisten |

## 3. BREAKDOWN PER ROLE

| No | Master Role / Actor | Jumlah Requirement Aktif | % dari Total |
|---|---|---|---|
| 1 | **Mantri Bibitan** | **133** | 77.3% |
| 2 | **Asisten Bibitan** | **11** | 6.4% |
| 3 | **Asisten Divisi** | **5** | 2.9% |
| 4 | **Asisten Kepala** | **8** | 4.7% |
| 5 | **Sistem Database** | **2** | 1.2% |
| 6 | **Sistem** | **1** | 0.6% |
| 7 | **Pengurus Kebun Peminta** | **6** | 3.5% |
| 8 | **Tekniker I** | **3** | 1.7% |
| 9 | **KTU** | **3** | 1.7% |
| | **TOTAL** | **172** | **100%** |

## 4. BREAKDOWN PER MODUL & FITUR

### Modul [01] Presensi (`01-presensi`) — Total: 13 Requirement

| No | Fitur | Feature ID | Jumlah Req | Daftar Req ID |
|---|---|---|---|---|
| 1 | **Presensi Supervisor** | `presensi-supervisor` | **6** | `RN-PRS-001`, `RN-PRS-002`, `RN-PRS-003`, `RN-PRS-005`, `RN-PRS-006`, `RN-PRS-007` |
| 2 | **Presensi Pekerja Bibitan** | `presensi-pekerja` | **7** | `RN-PWP-001`, `RN-PWP-002`, `RN-PWP-003`, `RN-PWP-004`, `RN-PWP-005`, `RN-PWP-006`, `RN-PWP-007` |

### Modul [02] Penerimaan (`02-penerimaan`) — Total: 24 Requirement

| No | Fitur | Feature ID | Jumlah Req | Daftar Req ID |
|---|---|---|---|---|
| 1 | **Penerimaan Benih / Biji Kelatak** | `terima-benih` | **6** | `RN-RCV-002`, `RN-RCV-003`, `RN-RCV-004`, `RN-RCV-005`, `RN-RCV-006`, `RN-RCV-028` |
| 2 | **Penerimaan Bibit - Kebun Sendiri** | `terima-kebun-sendiri` | **6** | `RN-RCV-KS01`, `RN-RCV-KS02`, `RN-RCV-KS03`, `RN-RCV-KS04`, `RN-RCV-KS05`, `RN-RCV-KS06` |
| 3 | **Penerimaan Bibit - Kebun Sepupu** | `terima-kebun-sepupu` | **6** | `RN-RCV-KSP016`, `RN-RCV-KSP017`, `RN-RCV-KSP018`, `RN-RCV-KSP019`, `RN-RCV-KSP020`, `RN-RCV-KSP021` |
| 4 | **Penerimaan Mata Entres** | `terima-mata-entres` | **6** | `RN-RCV-ME022`, `RN-RCV-ME023`, `RN-RCV-ME024`, `RN-RCV-ME025`, `RN-RCV-ME026`, `RN-RCV-ME027` |

### Modul [03] Penyemaian (`03-penyemaian`) — Total: 17 Requirement

| No | Fitur | Feature ID | Jumlah Req | Daftar Req ID |
|---|---|---|---|---|
| 1 | **Penyemaian ke Bedengan** | `semai-bedengan` | **8** | `RN-SEM-001`, `RN-SEM-002`, `RN-SEM-003`, `RN-SEM-004`, `RN-SEM-005`, `RN-SEM-006`, `RN-SEM-007`, `RN-SEM-008` |
| 2 | **Transplanting ke Polybag (Batch)** | `transplanting-polybag` | **9** | `RN-SEM-TP028`, `RN-SEM-TP029`, `RN-SEM-TP030`, `RN-SEM-TP031`, `RN-SEM-TP032`, `RN-SEM-TP033`, `RN-SEM-TP034`, `RN-SEM-TP035`, `RN-SEM-TP036` |

### Modul [04] Okulasi (`04-okulasi`) — Total: 28 Requirement

| No | Fitur | Feature ID | Jumlah Req | Daftar Req ID |
|---|---|---|---|---|
| 1 | **Grafting (Okulasi Utama)** | `grafting` | **16** | `RN-OKL-001`, `RN-OKL-002`, `RN-OKL-003`, `RN-OKL-004`, `RN-OKL-005`, `RN-OKL-006`, `RN-OKL-007`, `RN-OKL-008`, `RN-OKL-009`, `RN-OKL-010`, `RN-OKL-011`, `RN-OKL-012`, `RN-OKL-013`, `RN-OKL-014`, `RN-OKL-015`, `RN-OKL-029` |
| 2 | **Okulasi Janda / Regrafting** | `regrafting` | **12** | `RN-REG-000`, `RN-REG-001`, `RN-REG-002`, `RN-REG-003`, `RN-REG-004`, `RN-REG-005`, `RN-REG-006`, `RN-REG-007`, `RN-REG-008`, `RN-REG-009`, `RN-REG-010`, `RN-REG-011` |

### Modul [05] Pemeriksaan (`05-pemeriksaan`) — Total: 18 Requirement

| No | Fitur | Feature ID | Jumlah Req | Daftar Req ID |
|---|---|---|---|---|
| 1 | **Pemeriksaan Bertahap Grafting** | `periksa-grafting` | **9** | `RN-CHK-001`, `RN-CHK-002`, `RN-CHK-003`, `RN-CHK-004`, `RN-CHK-005`, `RN-CHK-006`, `RN-CHK-007`, `RN-CHK-008`, `RN-CHK-009` |
| 2 | **Pemeriksaan Regrafting** | `periksa-regrafting` | **9** | `RN-CHK-RG036`, `RN-CHK-RG037`, `RN-CHK-RG038`, `RN-CHK-RG039`, `RN-CHK-RG040`, `RN-CHK-RG041`, `RN-CHK-RG042`, `RN-CHK-RG043`, `RN-CHK-RG044` |

### Modul [06] Penyeleksian (`06-penyeleksian`) — Total: 13 Requirement

| No | Fitur | Feature ID | Jumlah Req | Daftar Req ID |
|---|---|---|---|---|
| 1 | **Seleksi Kualitas Bibit Batch** | `seleksi-batch` | **13** | `RN-SEL-001`, `RN-SEL-003`, `RN-SEL-004`, `RN-SEL-005`, `RN-SEL-006`, `RN-SEL-007`, `RN-SEL-008`, `RN-SEL-009`, `RN-SEL-010`, `RN-SEL-011`, `RN-SEL-012`, `RN-SEL-013`, `RN-SEL-014` |

### Modul [07] Kebun Entres (`07-kebun-entres`) — Total: 14 Requirement

| No | Fitur | Feature ID | Jumlah Req | Daftar Req ID |
|---|---|---|---|---|
| 1 | **Menunas Plot Entres** | `entres-menunas` | **7** | `RN-ENT-002`, `RN-ENT-003`, `RN-ENT-004`, `RN-ENT-005`, `RN-ENT-006`, `RN-ENT-007`, `RN-ENT-008` |
| 2 | **Topping Plot Entres** | `entres-topping` | **7** | `RN-ENT-TOP045`, `RN-ENT-TOP046`, `RN-ENT-TOP047`, `RN-ENT-TOP048`, `RN-ENT-TOP049`, `RN-ENT-TOP050`, `RN-ENT-TOP051` |

### Modul [08] Panen Mata Entres (`08-panen-mata-entres`) — Total: 8 Requirement

| No | Fitur | Feature ID | Jumlah Req | Daftar Req ID |
|---|---|---|---|---|
| 1 | **Panen Mata Entres** | `panen-entres` | **8** | `RN-HAR-001`, `RN-HAR-002`, `RN-HAR-003`, `RN-HAR-004`, `RN-HAR-005`, `RN-HAR-006`, `RN-HAR-007`, `RN-HAR-008` |

### Modul [09] Material & Bahan (`09-material-bahan`) — Total: 16 Requirement

| No | Fitur | Feature ID | Jumlah Req | Daftar Req ID |
|---|---|---|---|---|
| 1 | **Monitoring Mutasi Stok Mata Entres** | `monitoring-stok-entres` | **7** | `RN-MAT-001`, `RN-MAT-002`, `RN-MAT-003`, `RN-MAT-004`, `RN-MAT-005`, `RN-MAT-006`, `RN-MAT-007` |
| 2 | **Matching Material Dokumen Gudang** | `material-gudang-matching` | **7** | `RN-MAT-MMG052`, `RN-MAT-MMG053`, `RN-MAT-MMG054`, `RN-MAT-MMG055`, `RN-MAT-MMG056`, `RN-MAT-MMG057`, `RN-MAT-MMG058` |

### Modul [10] Rekam Pemeliharaan (`10-rekam-pemeliharaan`) — Total: 9 Requirement

| No | Fitur | Feature ID | Jumlah Req | Daftar Req ID |
|---|---|---|---|---|
| 1 | **Rekam Aktivitas Pemeliharaan** | `pemeliharaan-heading` | **8** | `RN-MNT-001`, `RN-MNT-002`, `RN-MNT-003`, `RN-MNT-004`, `RN-MNT-005`, `RN-MNT-006`, `RN-MNT-007`, `RN-MNT-008` |

### Modul [11] Pengeluaran (`11-pengeluaran`) — Total: 12 Requirement

| No | Fitur | Feature ID | Jumlah Req | Daftar Req ID |
|---|---|---|---|---|
| 1 | **Pengeluaran Bibit (SPB Disetujui)** | `pengeluaran-bibit` | **7** | `RN-EXP-001`, `RN-EXP-002`, `RN-EXP-003`, `RN-EXP-004`, `RN-EXP-007`, `RN-EXP-008`, `RN-EXP-009` |
| 2 | **Pengeluaran Mata Entres** | `pengeluaran-mata-entres` | **5** | `RN-EXM-001`, `RN-EXM-002`, `RN-EXM-003`, `RN-EXM-004`, `RN-EXM-005` |

## 5. AUDIT KHUSUS RN-PWP (Presensi Pekerja Bibitan)

Ditemukan tepat **7 Requirement RN-PWP** di dalam dataset resmi (`data/process-mapping-data.json` dan `js/data/process-mapping-baseline.js`):

| Req ID | Versi | Status | Role | Modul | Fitur | Process | Linked Flow Node |
|---|---|---|---|---|---|---|---|
| **RN-PWP-001** | v1 | **Confirmed** | Mantri Bibitan | Presensi | Presensi Pekerja Bibitan | Buka Presensi Pekerja | `PW_START` (START) |
| **RN-PWP-002** | v1 | **Confirmed** | Mantri Bibitan | Presensi | Presensi Pekerja Bibitan | Tentukan Pekerja Hadir | `PW_01` (P-001) |
| **RN-PWP-003** | v1 | **Confirmed** | Mantri Bibitan | Presensi | Presensi Pekerja Bibitan | Tambah Pekerja Baru Jika Belum Ada | `PW_02` (P-002) |
| **RN-PWP-004** | v1 | **Confirmed** | Mantri Bibitan | Presensi | Presensi Pekerja Bibitan | Konfirmasi Daftar & Simpan | `PW_03` (P-003) |
| **RN-PWP-005** | v1 | **Confirmed** | Mantri Bibitan | Presensi | Presensi Pekerja Bibitan | Pool Pekerja Aktif Hari Ini | `PW_END` (END) |
| **RN-PWP-006** | v1 | **Confirmed** | Asisten Bibitan | Presensi | Presensi Pekerja Bibitan | Verifikasi Presensi & HK Pekerja | _None (Role Governed)_ |
| **RN-PWP-007** | v1 | **Confirmed** | KTU | Presensi | Presensi Pekerja Bibitan | Verifikasi Payroll & HK | _None (Role Governed)_ |

> [!NOTE]
> - **RN-PWP-001 s/d RN-PWP-005** dijalankan oleh **Mantri Bibitan** dan terhubung langsung ke node alur visual (`PW_START`, `PW_01`, `PW_02`, `PW_03`, `PW_END`).
> - **RN-PWP-006** adalah requirement verifikasi HK oleh **Asisten Bibitan**.
> - **RN-PWP-007** adalah requirement verifikasi rekapitulasi upah/HK oleh **KTU**.

## 6. DETEKSI DUPLIKASI & KETIDAKKONSISTENAN (CHECKLIST A - K)

| Kode | Pemeriksaan Integritas | Status Temuan | Keterangan Faktual |
|---|---|---|---|
| **A** | Duplicate Req ID | **CLEAR (0 Duplikasi)** | Semua 179 Req ID bersifat unik |
| **B** | Requirement sama di source berbeda | **MATCH (Konsisten)** | `process-mapping-data.json` dan `process-mapping-baseline.js` identik 100% |
| **C** | Req ID di Requirement Master tapi tidak di baseline | **CLEAR (0 Gap)** | Seluruh data Requirement Master dibaca dari baseline |
| **D** | Req ID di baseline tapi tidak di Requirement Master | **CLEAR (0 Gap)** | Semua 172 requirement aktif tampil di Requirement Master |
| **E** | Beda Role/Module/Feature antar source | **CLEAR (0 Perbedaan)** | Tidak ada mismatch antar file aktif |
| **F** | Beda Status antar source | **CLEAR (100% Confirmed)** | Seluruh 172 active requirement berstatus Confirmed |
| **G** | Beda Versi antar source | **CLEAR (Konsisten)** | Versi tersinkronisasi v1 |
| **H** | Req terhubung ke flow node yang tidak ada | **CLEAR (0 Broken Link)** | Seluruh linked node merujuk ke node valid |
| **I** | Flow node memiliki Req ID yang tidak ada di req master | **CLEAR (0 Orphan Node)** | 122 flow nodes merujuk ke valid Active Req IDs |
| **J** | Req muncul di UI tapi tidak ada di source aktif | **CLEAR** | UI render murni dari in-memory activeStore |
| **K** | Req ada di source tapi tidak digunakan runtime | **CLEAR (Terdokumentasi)** | 7 Deprecated Req diberi flag `isArchived: true` untuk riwayat audit |

## 7. REQUIREMENT INVENTORY LENGKAP (179 ITEMS)

Berikut adalah seluruh 179 requirement (172 Active Confirmed + 7 Deprecated) sebagaimana tersimpan di source of truth:

| No | Req ID | Ver | Status | Role | Modul | Fitur | Judul Requirement | Linked Flow Node | Rule ID | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **RN-PRS-001** | v1 | **Confirmed** | Mantri Bibitan | Presensi | Presensi Supervisor | Presensi Datang supervisor wajib selesai sebelum transaksi harian lain. | `START` | - | `baseline.js` / `data.json` |
| 2 | **RN-PRS-002** | v1 | **Confirmed** | Mantri Bibitan | Presensi | Presensi Supervisor | Pembacaan waktu otomatis untuk Presensi Datang/Pulang. | `P-001` | - | `baseline.js` / `data.json` |
| 3 | **RN-PRS-003** | v1 | **Confirmed** | Mantri Bibitan | Presensi | Presensi Supervisor | Verifikasi biometrik wajah supervisor sebagai metode utama presensi. | `P-002` | - | `baseline.js` / `data.json` |
| 4 | **RN-PRS-004** | v1 | ~~Deprecated~~ | Mantri Bibitan | Presensi | Presensi Supervisor | Face ID merupakan metode utama presensi; Foto manual adalah fallback. | `FB-001` | - | `baseline.js` / `data.json` |
| 5 | **RN-PRS-005** | v1 | **Confirmed** | Mantri Bibitan | Presensi | Presensi Supervisor | Pemeriksaan radius koordinat GPS berada di dalam perimeter Areal Bibitan. | `P-003` | - | `baseline.js` / `data.json` |
| 6 | **RN-PRS-006** | v1 | **Confirmed** | Mantri Bibitan | Presensi | Presensi Supervisor | Sistem mencatat data presensi lengkap supervisor setelah divalidasi dengan radius perimeter GPS. | `P-004` | - | `baseline.js` / `data.json` |
| 7 | **RN-PRS-007** | v1 | **Confirmed** | Mantri Bibitan | Presensi | Presensi Supervisor | Mantri Bibitan menyelesaikan presensi datang supervisor sebagai prasyarat pembukaan transaksi harian. | `END` | - | `baseline.js` / `data.json` |
| 8 | **RN-PWP-001** | v1 | **Confirmed** | Mantri Bibitan | Presensi | Presensi Pekerja Bibitan | Mantri membuka modul presensi pekerja setelah presensi supervisor selesai. | `START` | - | `baseline.js` / `data.json` |
| 9 | **RN-PWP-002** | v1 | **Confirmed** | Mantri Bibitan | Presensi | Presensi Pekerja Bibitan | Mantri menandai pekerja yang hadir dan membuang pekerja tidak hadir. | `P-001` | - | `baseline.js` / `data.json` |
| 10 | **RN-PWP-003** | v1 | **Confirmed** | Mantri Bibitan | Presensi | Presensi Pekerja Bibitan | Menambahkan pekerja bantuan antar afdeling jika belum ada di daftar reguler. | `P-002` | - | `baseline.js` / `data.json` |
| 11 | **RN-PWP-004** | v1 | **Confirmed** | Mantri Bibitan | Presensi | Presensi Pekerja Bibitan | Mengonfirmasi daftar final kehadiran pekerja beserta timestamp dan kirim verifikasi. | `P-003` | - | `baseline.js` / `data.json` |
| 12 | **RN-PWP-005** | v1 | **Confirmed** | Mantri Bibitan | Presensi | Presensi Pekerja Bibitan | Pekerja siap dialokasikan pada transaksi teknis pembibitan karet. | `END` | - | `baseline.js` / `data.json` |
| 13 | **RN-RCV-001** | v1 | ~~Deprecated~~ | Mantri Bibitan | Penerimaan | Penerimaan Benih / Biji Kelatak | Sumber dokumen resmi pengiriman benih/biji kelatak dari pihak ketiga. | `P-001` | - | `baseline.js` / `data.json` |
| 14 | **RN-RCV-002** | v1 | **Confirmed** | Mantri Bibitan | Penerimaan | Penerimaan Benih / Biji Kelatak | Mantri Bibitan memverifikasi surat jalan/BKB vendor dan mencocokkan kuantitas fisik benih kelatak. | `P-002` | - | `baseline.js` / `data.json` |
| 15 | **RN-RCV-003** | v1 | **Confirmed** | Mantri Bibitan | Penerimaan | Penerimaan Benih / Biji Kelatak | Mantri mencatat jumlah fisik benih kelatak riil yang dibongkar dan diterima. | `P-003` | - | `baseline.js` / `data.json` |
| 16 | **RN-RCV-004** | v1 | **Confirmed** | Mantri Bibitan | Penerimaan | Penerimaan Benih / Biji Kelatak | Foto fisik karung/kotak benih dan surat jalan dengan stempel waktu ISO. | `P-004` | - | `baseline.js` / `data.json` |
| 17 | **RN-RCV-005** | v1 | **Confirmed** | Asisten Bibitan | Penerimaan | Penerimaan Benih / Biji Kelatak | Menyimpan berkas penerimaan dan disetujui Asisten Bibitan; resmi masuk database produksi. | `P-005` | - | `baseline.js` / `data.json` |
| 18 | **RN-RCV-006** | v1 | **Confirmed** | Mantri Bibitan | Penerimaan | Penerimaan Benih / Biji Kelatak | Dokumen penerimaan siap digunakan sebagai sumber alokasi pada modul Penyemaian. | `END` | - | `baseline.js` / `data.json` |
| 19 | **RN-RCV-KS01** | v1 | **Confirmed** | Asisten Divisi | Penerimaan | Penerimaan Bibit - Kebun Sendiri | Asisten Divisi peminta mengajukan SPB bibit karet untuk penanaman di kebun. | `CR-001` | - | `baseline.js` / `data.json` |
| 20 | **RN-RCV-KS02** | v1 | **Confirmed** | Asisten Kepala | Penerimaan | Penerimaan Bibit - Kebun Sendiri | Asisten Kepala meninjau permintaan bibit dan memeriksa ketersediaan stok bibit siap salur. | `CR-002` | - | `baseline.js` / `data.json` |
| 21 | **RN-RCV-KS03** | v1 | **Confirmed** | Asisten Kepala | Penerimaan | Penerimaan Bibit - Kebun Sendiri | Stok cukup: Approve & teruskan ke Asisten Bibitan; Stok tidak cukup: Koreksi/Batalkan. | `CR-003` | - | `baseline.js` / `data.json` |
| 22 | **RN-RCV-KS04** | v1 | **Confirmed** | Mantri Bibitan | Penerimaan | Penerimaan Bibit - Kebun Sendiri | Asisten Bibitan menindaklanjuti; Mantri Bibitan mengeksekusi muat dan pengeluaran bibit. | `CR-004` | - | `baseline.js` / `data.json` |
| 23 | **RN-RCV-KS05** | v1 | **Confirmed** | Asisten Divisi | Penerimaan | Penerimaan Bibit - Kebun Sendiri | Asisten Divisi peminta menerima bibit di lokasi tanam, memeriksa fisik, dan mengonfirmasi penerimaan. | `CR-005` | - | `baseline.js` / `data.json` |
| 24 | **RN-RCV-KS06** | v1 | **Confirmed** | Asisten Divisi | Penerimaan | Penerimaan Bibit - Kebun Sendiri | Seluruh tahapan permohonan hingga penerimaan bibit kebun sendiri selesai terverifikasi. | `END` | - | `baseline.js` / `data.json` |
| 25 | **RN-SEM-001** | v1 | **Confirmed** | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | Satu dokumen penerimaan benih dapat dialokasikan ke beberapa Bedengan. | `START` | - | `baseline.js` / `data.json` |
| 26 | **RN-SEM-002** | v1 | **Confirmed** | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | Memindai QR Code fisik pada plang bedengan perkecambahan pasir. | `P-001` | - | `baseline.js` / `data.json` |
| 27 | **RN-SEM-003** | v1 | **Confirmed** | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | Mantri menginput jumlah butir benih yang disemai dan jumlah benih afkir/rusak. | `P-002` | - | `baseline.js` / `data.json` |
| 28 | **RN-SEM-004** | v1 | **Confirmed** | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | Foto bukti fisik benih reject/rusak dengan watermark timestamp ISO dan GPS. | `P-003` | - | `baseline.js` / `data.json` |
| 29 | **RN-SEM-005** | v1 | **Confirmed** | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | Asisten menyetujui penaburan bedengan; periode perkecambahan berlangsung ±12–15 hari. | `P-004` | - | `baseline.js` / `data.json` |
| 30 | **RN-SEM-006** | v1 | **Confirmed** | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | Transplanting ke polybag menggunakan rasio 1 Polybag = 2 Benih/Bibit. | `P-005` | - | `baseline.js` / `data.json` |
| 31 | **RN-SEM-007** | v1 | **Confirmed** | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | Satu Batch bibitan dapat dikonsolidasi dari beberapa Bedengan. | `P-006` | - | `baseline.js` / `data.json` |
| 32 | **RN-SEM-008** | v1 | **Confirmed** | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | Batch polybag telah terdaftar dan siap dipelihara hingga mencapai ukuran okulasi. | `END` | - | `baseline.js` / `data.json` |
| 33 | **RN-OKL-000** | v1 | ~~Deprecated~~ | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Inisialisasi modul okulasi grafting oleh Mantri Bibitan. | `START` | - | `baseline.js` / `data.json` |
| 34 | **RN-OKL-001** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Mantri Bibitan memilih Batch tanaman bawah (seedling) yang telah memenuhi kriteria diameter siap okulasi. | `P-001` | - | `baseline.js` / `data.json` |
| 35 | **RN-OKL-002** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Validasi QR Code plang Batch polybag wajib dilakukan sebelum penempelan mata entres. | `P-002` | - | `baseline.js` / `data.json` |
| 36 | **RN-OKL-003** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Menampilkan saldo populasi aktif dan batas maksimum okulasi harian pada batch terpilih. | `P-003` | - | `baseline.js` / `data.json` |
| 37 | **RN-OKL-004** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Mantri Bibitan mencatat identitas Juru Okulasi, jumlah okulasi sukses, dan penggunaan entres. | `P-004` | - | `baseline.js` / `data.json` |
| 38 | **RN-OKL-005** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Validasi kesesuaian varietas clone kayu entres terhadap rencana penempelan batch. | `P-005` | - | `baseline.js` / `data.json` |
| 39 | **RN-OKL-006** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Perhitungan otomatis rasio pemakaian mata entres per batang seedling yang diokulasi. | `P-006` | - | `baseline.js` / `data.json` |
| 40 | **RN-OKL-007** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Mata entres aktual menjadi pengurang stok setelah verifikasi. | `P-007` | - | `baseline.js` / `data.json` |
| 41 | **RN-OKL-008** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Menginput jumlah batang/cabang kayu entres yang diambil dari plot. | `P-008` | - | `baseline.js` / `data.json` |
| 42 | **RN-OKL-009** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Sistem menghitung dan menampilkan estimasi perolehan mata entres. | `P-009` | - | `baseline.js` / `data.json` |
| 43 | **RN-OKL-010** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Mencatat kuantitas mata entres aktual yang berhasil ditempelkan. | `P-010` | - | `baseline.js` / `data.json` |
| 44 | **RN-OKL-011** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Pengambilan foto dokumentasi fisik kegiatan okulasi beserta watermark timestamp. | `P-011` | - | `baseline.js` / `data.json` |
| 45 | **RN-OKL-012** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Mengirim berkas transaksi okulasi ke antrean verifikasi Asisten. | `P-012` | - | `baseline.js` / `data.json` |
| 46 | **RN-OKL-013** | v1 | **Confirmed** | Asisten Bibitan | Okulasi | Grafting (Okulasi Utama) | Pemeriksaan lapangan dan persetujuan transaksi oleh Asisten Bibitan. | `P-013` | - | `baseline.js` / `data.json` |
| 47 | **RN-OKL-014** | v1 | **Confirmed** | Sistem Database | Okulasi | Grafting (Okulasi Utama) | Pengurangan stok mata entres terverifikasi pada Plot Entres + Clone. | `P-014` | - | `baseline.js` / `data.json` |
| 48 | **RN-OKL-015** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Transaksi okulasi grafting berhasil diselesaikan dan masuk basis data produksi. | `END` | - | `baseline.js` / `data.json` |
| 49 | **RN-REG-000** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | Inisialisasi transaksi okulasi ulang (regrafting) untuk bibit yang gagal pada pemeriksaan. | `START` | - | `baseline.js` / `data.json` |
| 50 | **RN-REG-001** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | Memilih batch dan dokumen hasil pemeriksaan yang memiliki tindak lanjut regrafting. | `P-001` | - | `baseline.js` / `data.json` |
| 51 | **RN-REG-002** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | Validasi fisik QR Code Batch sebelum melakukan regrafting. | `P-002` | - | `baseline.js` / `data.json` |
| 52 | **RN-REG-003** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | Memeriksa jumlah batang bibit gagal yang berhak menerima penempelan ulang. | `P-003` | - | `baseline.js` / `data.json` |
| 53 | **RN-REG-004** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | Menginput jumlah bibit yang diokulasi ulang dan pekerja pelaksana. | `P-004` | - | `baseline.js` / `data.json` |
| 54 | **RN-REG-005** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | Memilih plot kebun entres dan memindai QR fisik plot penyedia mata tunas. | `P-005` | - | `baseline.js` / `data.json` |
| 55 | **RN-REG-006** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | Mencatat jumlah mata entres aktual yang digunakan untuk regrafting. | `P-006` | - | `baseline.js` / `data.json` |
| 56 | **RN-REG-007** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | Pengambilan foto dokumentasi ikatan regrafting dan watermark timestamp. | `P-007` | - | `baseline.js` / `data.json` |
| 57 | **RN-REG-008** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | Mengirimkan berkas regrafting ke antrean verifikasi Asisten Bibitan. | `P-008` | - | `baseline.js` / `data.json` |
| 58 | **RN-REG-009** | v1 | **Confirmed** | Asisten Bibitan | Okulasi | Okulasi Janda / Regrafting | Pemeriksaan mutu tempelan ulang dan persetujuan oleh Asisten Bibitan. | `P-009` | - | `baseline.js` / `data.json` |
| 59 | **RN-REG-010** | v1 | **Confirmed** | Sistem Database | Okulasi | Okulasi Janda / Regrafting | Pemotongan stok resmi mata entres pada Plot Entres + Clone. | `P-010` | - | `baseline.js` / `data.json` |
| 60 | **RN-REG-011** | v1 | **Confirmed** | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | Regrafting selesai dan siap diperiksa pada jadwal pemeriksaan berikutnya. | `END` | - | `baseline.js` / `data.json` |
| 61 | **RN-CHK-001** | v1 | **Confirmed** | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | Pemeriksaan bersifat dinamis dan dapat dilakukan bertahap. | `START` | - | `baseline.js` / `data.json` |
| 62 | **RN-CHK-002** | v1 | **Confirmed** | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | Bibit gagal dapat ditentukan untuk Regrafting ulang atau Reject. | `P-001` | - | `baseline.js` / `data.json` |
| 63 | **RN-CHK-003** | v1 | **Confirmed** | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | Validasi fisik QR Code Batch yang diperiksa. | `P-002` | - | `baseline.js` / `data.json` |
| 64 | **RN-CHK-004** | v1 | **Confirmed** | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | Menginput jumlah batang yang diperiksa pada sesi ini (misal 600 dari 1.000). | `P-003` | - | `baseline.js` / `data.json` |
| 65 | **RN-CHK-005** | v1 | **Confirmed** | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | Mencatat jumlah mata tempelan yang hijau (berhasil) vs hitam/mati (gagal). | `P-004` | - | `baseline.js` / `data.json` |
| 66 | **RN-CHK-006** | v1 | **Confirmed** | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | Mantri menentukan tindak lanjut bibit yang gagal: Regrafting atau Reject. | `P-005` | - | `baseline.js` / `data.json` |
| 67 | **RN-CHK-007** | v1 | **Confirmed** | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | Foto bukti fisik mata tempelan berhasil dan gagal beserta watermark. | `P-006` | - | `baseline.js` / `data.json` |
| 68 | **RN-CHK-008** | v1 | **Confirmed** | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | Mengirim hasil pemeriksaan ke Asisten Bibitan untuk disetujui. | `P-007` | - | `baseline.js` / `data.json` |
| 69 | **RN-CHK-009** | v1 | **Confirmed** | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | Pemeriksaan tuntas; bibit berhasil lanjut tumbuh, bibit gagal siap diregrafting. | `END` | - | `baseline.js` / `data.json` |
| 70 | **RN-SEL-001** | v1 | **Confirmed** | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | Hasil seleksi Mantri berstatus usulan afkir dan wajib diverifikasi fisik oleh Asisten Bibitan. | `START` | - | `baseline.js` / `data.json` |
| 71 | **RN-SEL-002** | v1 | ~~Deprecated~~ | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | Memilih sumber dokumen transaksi yang mendasari seleksi. | `P-001` | - | `baseline.js` / `data.json` |
| 72 | **RN-SEL-003** | v1 | **Confirmed** | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | Pemindaian QR Code Batch untuk membuka form penilaian kualitas visual bibit. | `P-002` | - | `baseline.js` / `data.json` |
| 73 | **RN-SEL-004** | v1 | **Confirmed** | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | Sistem menyajikan populasi awal, persentase keberhasilan okulasi, dan riwayat seleksi. | `P-003` | - | `baseline.js` / `data.json` |
| 74 | **RN-SEL-005** | v1 | **Confirmed** | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | Mantri menginput jumlah bibit Siap Salur (Grade A), Ditunda (Under-size), dan Afkir (Mati/Cacat). | `P-004` | - | `baseline.js` / `data.json` |
| 75 | **RN-SEL-006** | v1 | **Confirmed** | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | Foto dokumentasi fisik bibit reject/afkir yang dikumpulkan beserta tanda air. | `P-005` | - | `baseline.js` / `data.json` |
| 76 | **RN-SEL-007** | v1 | **Confirmed** | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | Mengirimkan berkas seleksi ke status Menunggu Verifikasi Asisten. | `P-006` | - | `baseline.js` / `data.json` |
| 77 | **RN-SEL-008** | v1 | **Confirmed** | Asisten Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | Asisten Bibitan turun ke lapangan melakukan pemeriksaan fisik batch langsung. | `P-007` | - | `baseline.js` / `data.json` |
| 78 | **RN-SEL-009** | v1 | **Confirmed** | Asisten Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | Memverifikasi apakah kuantitas afkir di sistem sama dengan fisik lapangan. | `P-008` | - | `baseline.js` / `data.json` |
| 79 | **RN-SEL-010** | v1 | **Confirmed** | Asisten Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | Asisten menyetujui transaksi; nilai terverifikasi resmi memotong populasi Batch. | `P-009` | - | `baseline.js` / `data.json` |
| 80 | **RN-SEL-011** | v1 | **Confirmed** | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | Penyeleksian tuntas; populasi batch di database kini mencerminkan bibit hidup riil. | `END` | - | `baseline.js` / `data.json` |
| 81 | **RN-ENT-001** | v1 | ~~Deprecated~~ | Mantri Bibitan | Kebun Entres | Menunas Plot Entres | Aktivitas Menunas & Topping menghitung rasio perisai/cabang dan perisai/meter. | `START` | - | `baseline.js` / `data.json` |
| 82 | **RN-ENT-002** | v1 | **Confirmed** | Mantri Bibitan | Kebun Entres | Menunas Plot Entres | Validasi QR Code plang fisik plot entres yang dirawat. | `P-001` | - | `baseline.js` / `data.json` |
| 83 | **RN-ENT-003** | v1 | **Confirmed** | Mantri Bibitan | Kebun Entres | Menunas Plot Entres | Sistem menyajikan data clone dan jumlah pokok tanaman induk per plot. | `P-002` | - | `baseline.js` / `data.json` |
| 84 | **RN-ENT-004** | v1 | **Confirmed** | Mantri Bibitan | Kebun Entres | Menunas Plot Entres | Mantri menginput Tanggal, Jumlah Perisai/Mata Tunas, Jumlah Cabang, dan Panjang Meter. | `P-003` | - | `baseline.js` / `data.json` |
| 85 | **RN-ENT-005** | v1 | **Confirmed** | Mantri Bibitan | Kebun Entres | Menunas Plot Entres | Sistem menghitung Rata-rata Perisai/Cabang dan Rata-rata Perisai/Meter. | `P-004` | - | `baseline.js` / `data.json` |
| 86 | **RN-ENT-006** | v1 | **Confirmed** | Mantri Bibitan | Kebun Entres | Menunas Plot Entres | Foto dokumentasi plot setelah ditunas beserta timestamp, diteruskan ke Asisten Bibitan. | `P-005` | - | `baseline.js` / `data.json` |
| 87 | **RN-ENT-007** | v1 | **Confirmed** | Mantri Bibitan | Kebun Entres | Menunas Plot Entres | Plot entres terawat optimal dan siap menghasilkan kayu entres berkualitas. | `END` | - | `baseline.js` / `data.json` |
| 88 | **RN-HAR-001** | v1 | **Confirmed** | Mantri Bibitan | Panen Mata Entres | Panen Mata Entres | Panen mata entres menambah saldo stok resmi hanya setelah diverifikasi Asisten. | `START` | - | `baseline.js` / `data.json` |
| 89 | **RN-HAR-002** | v1 | **Confirmed** | Mantri Bibitan | Panen Mata Entres | Panen Mata Entres | Validasi fisik QR Code Plot Entres yang dipanen. | `P-001` | - | `baseline.js` / `data.json` |
| 90 | **RN-HAR-003** | v1 | **Confirmed** | Mantri Bibitan | Panen Mata Entres | Panen Mata Entres | Menginput jumlah cabang entres yang dipotong dan rata-rata mata entres per cabang. | `P-002` | - | `baseline.js` / `data.json` |
| 91 | **RN-HAR-004** | v1 | **Confirmed** | Mantri Bibitan | Panen Mata Entres | Panen Mata Entres | Sistem menghitung nilai estimasi perolehan mata entres. | `P-003` | - | `baseline.js` / `data.json` |
| 92 | **RN-HAR-005** | v1 | **Confirmed** | Mantri Bibitan | Panen Mata Entres | Panen Mata Entres | Mantri mencatat jumlah mata entres riil/aktual yang siap digunakan/disimpan. | `P-004` | - | `baseline.js` / `data.json` |
| 93 | **RN-HAR-006** | v1 | **Confirmed** | Mantri Bibitan | Panen Mata Entres | Panen Mata Entres | Foto ikatan cabang kayu entres yang dipanen beserta watermark timestamp ISO. | `P-005` | - | `baseline.js` / `data.json` |
| 94 | **RN-HAR-007** | v1 | **Confirmed** | Asisten Bibitan | Panen Mata Entres | Panen Mata Entres | Asisten Bibitan memeriksa fisik kayu entres dan menyetujui transaksi; stok resmi bertambah. | `P-006` | - | `baseline.js` / `data.json` |
| 95 | **RN-HAR-008** | v1 | **Confirmed** | Mantri Bibitan | Panen Mata Entres | Panen Mata Entres | Mata entres siap dialokasikan untuk Grafting, Regrafting, atau Permintaan bibitan. | `END` | - | `baseline.js` / `data.json` |
| 96 | **RN-MAT-001** | v1 | **Confirmed** | Mantri Bibitan | Material & Bahan | Monitoring Mutasi Stok Mata Entres | Dokumen gudang material wajib matching 1 Heading Kerja pemeliharaan. | `START` | - | `baseline.js` / `data.json` |
| 97 | **RN-MAT-002** | v1 | **Confirmed** | Mantri Bibitan | Material & Bahan | Monitoring Mutasi Stok Mata Entres | Memilih kombinasi plot entres dan jenis klon untuk ditinjau mutasi stoknya. | `P-001` | - | `baseline.js` / `data.json` |
| 98 | **RN-MAT-003** | v1 | **Confirmed** | Mantri Bibitan | Material & Bahan | Monitoring Mutasi Stok Mata Entres | Audit penambahan (+ Panen Terverifikasi) vs pengurangan (- Okulasi, - Regrafting, - Pengeluaran). | `P-002` | - | `baseline.js` / `data.json` |
| 99 | **RN-MAT-004** | v1 | **Confirmed** | Mantri Bibitan | Material & Bahan | Monitoring Mutasi Stok Mata Entres | Menarik dokumen pengeluaran gudang untuk pupuk, pestisida, dan plastik okulasi. | `P-003` | - | `baseline.js` / `data.json` |
| 100 | **RN-MAT-005** | v1 | **Confirmed** | Sistem | Material & Bahan | Monitoring Mutasi Stok Mata Entres | Sistem memverifikasi kecocokan Heading Kerja dokumen gudang dengan rekam pemeliharaan. | `P-004` | - | `baseline.js` / `data.json` |
| 101 | **RN-MAT-006** | v1 | **Confirmed** | Mantri Bibitan | Material & Bahan | Monitoring Mutasi Stok Mata Entres | Notifikasi Mantri berhasil; dokumen material melekat pada rekam pemeliharaan. | `P-005` | - | `baseline.js` / `data.json` |
| 102 | **RN-MAT-007** | v1 | **Confirmed** | Mantri Bibitan | Material & Bahan | Monitoring Mutasi Stok Mata Entres | Seluruh material dan mutasi stok tercatat rapi dan dapat dipertanggungjawabkan. | `END` | - | `baseline.js` / `data.json` |
| 103 | **RN-MNT-001** | v1 | **Confirmed** | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | Mantri Bibitan membuka form rekam pemeliharaan harian tanaman pembibitan. | `START` | - | `baseline.js` / `data.json` |
| 104 | **RN-MNT-002** | v1 | **Confirmed** | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | Memilih Master Heading Kerja pemeliharaan (Penyiraman, Penyiangan, Pemupukan, Pengendalian HPT). | `P-001` | - | `baseline.js` / `data.json` |
| 105 | **RN-MNT-003** | v1 | **Confirmed** | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | Memilih target blok/bedengan/plot entres dan memindai QR Code lokasi kerja. | `P-002` | - | `baseline.js` / `data.json` |
| 106 | **RN-MNT-004** | v1 | **Confirmed** | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | Merekam daftar pekerja pelaksana, jam kerja, dan output volume fisik yang diselesaikan. | `P-003` | - | `baseline.js` / `data.json` |
| 107 | **RN-MNT-005** | v1 | **Confirmed** | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | Foto dokumentasi pelaksanaan aktivitas di lapangan dengan geotagging koordinat dan timestamp. | `P-004` | - | `baseline.js` / `data.json` |
| 108 | **RN-MNT-006** | v1 | **Confirmed** | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | Mengaitkan nomor BKB pemakaian bahan kimia/pupuk ke dalam laporan heading kerja terkait. | `P-005` | - | `baseline.js` / `data.json` |
| 109 | **RN-MNT-007** | v1 | **Confirmed** | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | Mengirim rekapitulasi pekerjaan harian ke Asisten Bibitan untuk approval pembebanan biaya. | `P-006` | - | `baseline.js` / `data.json` |
| 110 | **RN-MNT-008** | v1 | **Confirmed** | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | Aktivitas pemeliharaan selesai dan tercatat resmi pada riwayat objek tanaman. | `END` | - | `baseline.js` / `data.json` |
| 111 | **RN-EXP-001** | v1 | **Confirmed** | Asisten Divisi | Pengeluaran | Pengeluaran Bibit (SPB Disetujui) | Asisten Divisi mengajukan SPB alokasi bibit kebun sendiri yang telah disetujui Asisten Kepala. | `START` | - | `baseline.js` / `data.json` |
| 112 | **RN-EXP-002** | v1 | **Confirmed** | Mantri Bibitan | Pengeluaran | Pengeluaran Bibit (SPB Disetujui) | Mantri memilih dokumen SPB yang akan dimuat ke armada transportasi. | `P-001` | - | `baseline.js` / `data.json` |
| 113 | **RN-EXP-003** | v1 | **Confirmed** | Mantri Bibitan | Pengeluaran | Pengeluaran Bibit (SPB Disetujui) | Validasi fisik QR Code Batch bibit di petak yang siap salur. | `P-002` | - | `baseline.js` / `data.json` |
| 114 | **RN-EXP-004** | v1 | **Confirmed** | Mantri Bibitan | Pengeluaran | Pengeluaran Bibit (SPB Disetujui) | Mantri Bibitan merekam jumlah batang bibit muat dan memverifikasi nomor polisi armada pengangkut. | `P-003` | - | `baseline.js` / `data.json` |
| 115 | **RN-EXP-005** | v1 | ~~Deprecated~~ | Mantri Bibitan | Pengeluaran | Pengeluaran Bibit (SPB Disetujui) | Foto dokumentasi fisik bibit yang tersusun rapi di atas armada angkut beserta nomor polisi. | `P-004` | - | `baseline.js` / `data.json` |
| 116 | **RN-EXP-006** | v1 | ~~Deprecated~~ | Asisten Bibitan | Pengeluaran | Pengeluaran Bibit (SPB Disetujui) | Asisten Bibitan memeriksa muatan dan menyetujui transaksi; populasi Batch resmi terpotong. | `P-005` | - | `baseline.js` / `data.json` |
| 117 | **RN-EXP-007** | v1 | **Confirmed** | Mantri Bibitan | Pengeluaran | Pengeluaran Bibit (SPB Disetujui) | Armada berangkat menuju divisi tanam; transaksi pengeluaran bibit selesai. | `END` | - | `baseline.js` / `data.json` |
| 118 | **RN-EXM-001** | v1 | **Confirmed** | Mantri Bibitan | Pengeluaran | Pengeluaran Mata Entres | Pengeluaran mata entres berdasarkan dokumen permintaan yang telah disetujui. | `START` | - | `baseline.js` / `data.json` |
| 119 | **RN-EXM-002** | v1 | **Confirmed** | Mantri Bibitan | Pengeluaran | Pengeluaran Mata Entres | Validasi fisik QR Code Plot Entres penyedia clone terkait (Bukan Batch). | `P-001` | - | `baseline.js` / `data.json` |
| 120 | **RN-EXM-003** | v1 | **Confirmed** | Mantri Bibitan | Pengeluaran | Pengeluaran Mata Entres | Menginput jumlah cabang dan kuantitas mata entres aktual yang dipotong untuk dikirim. | `P-002` | - | `baseline.js` / `data.json` |
| 121 | **RN-EXM-004** | v1 | **Confirmed** | Mantri Bibitan | Pengeluaran | Pengeluaran Mata Entres | Foto ikatan cabang kayu entres dan verifikasi persetujuan oleh Asisten Bibitan. | `P-003` | - | `baseline.js` / `data.json` |
| 122 | **RN-EXM-005** | v1 | **Confirmed** | Mantri Bibitan | Pengeluaran | Pengeluaran Mata Entres | Mata entres siap dikirim ke unit peminta; siklus pengeluaran entres tuntas. | `END` | - | `baseline.js` / `data.json` |
| 123 | **RN-RCV-KSP016** | v1 | **Confirmed** | Pengurus Kebun Peminta | Penerimaan | Penerimaan Bibit - Kebun Sepupu | Pengurus Kebun Peminta mengajukan SPB bibit karet untuk penanaman di kebun. | - | - | `baseline.js` / `data.json` |
| 124 | **RN-RCV-KSP017** | v1 | **Confirmed** | Asisten Kepala | Penerimaan | Penerimaan Bibit - Kebun Sepupu | Asisten Kepala meninjau permintaan bibit dan memeriksa ketersediaan stok bibit siap salur. | - | - | `baseline.js` / `data.json` |
| 125 | **RN-RCV-KSP018** | v1 | **Confirmed** | Asisten Kepala | Penerimaan | Penerimaan Bibit - Kebun Sepupu | Stok cukup: Approve & teruskan ke Asisten Bibitan; Stok tidak cukup: Koreksi/Batalkan. | - | - | `baseline.js` / `data.json` |
| 126 | **RN-RCV-KSP019** | v1 | **Confirmed** | Mantri Bibitan | Penerimaan | Penerimaan Bibit - Kebun Sepupu | Mantri Bibitan mengeksekusi muat bibit kebun sepupu sesuai kuota SPB yang diteruskan Asisten. | - | - | `baseline.js` / `data.json` |
| 127 | **RN-RCV-KSP020** | v1 | **Confirmed** | Pengurus Kebun Peminta | Penerimaan | Penerimaan Bibit - Kebun Sepupu | Pengurus Kebun Peminta menerima bibit di lokasi tanam, memeriksa fisik, dan mengonfirmasi penerimaan. | - | - | `baseline.js` / `data.json` |
| 128 | **RN-RCV-KSP021** | v1 | **Confirmed** | Pengurus Kebun Peminta | Penerimaan | Penerimaan Bibit - Kebun Sepupu | Seluruh tahapan permohonan hingga penerimaan bibit kebun sepupu selesai terverifikasi. | - | - | `baseline.js` / `data.json` |
| 129 | **RN-RCV-ME022** | v1 | **Confirmed** | Pengurus Kebun Peminta | Penerimaan | Penerimaan Mata Entres | Pengurus Kebun Peminta mengajukan SPB mata entres karet untuk penanaman di kebun. | - | - | `baseline.js` / `data.json` |
| 130 | **RN-RCV-ME023** | v1 | **Confirmed** | Asisten Kepala | Penerimaan | Penerimaan Mata Entres | Asisten Kepala meninjau permintaan mata entres dan memeriksa ketersediaan stok mata entres siap salur. | - | - | `baseline.js` / `data.json` |
| 131 | **RN-RCV-ME024** | v1 | **Confirmed** | Asisten Kepala | Penerimaan | Penerimaan Mata Entres | Stok cukup: Approve & teruskan ke Asisten Bibitan; Stok tidak cukup: Koreksi/Batalkan. | - | - | `baseline.js` / `data.json` |
| 132 | **RN-RCV-ME025** | v1 | **Confirmed** | Mantri Bibitan | Penerimaan | Penerimaan Mata Entres | Mantri Bibitan memotong dan mengemas mata entres kebun sepupu berdasarkan otorisasi Asisten. | - | - | `baseline.js` / `data.json` |
| 133 | **RN-RCV-ME026** | v1 | **Confirmed** | Pengurus Kebun Peminta | Penerimaan | Penerimaan Mata Entres | Pengurus Kebun Peminta menerima mata entres di lokasi tanam, memeriksa fisik, dan mengonfirmasi penerimaan. | - | - | `baseline.js` / `data.json` |
| 134 | **RN-RCV-ME027** | v1 | **Confirmed** | Pengurus Kebun Peminta | Penerimaan | Penerimaan Mata Entres | Seluruh tahapan permohonan hingga penerimaan mata entres kebun sepupu selesai terverifikasi. | - | - | `baseline.js` / `data.json` |
| 135 | **RN-SEM-TP028** | v1 | **Confirmed** | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | Satu dokumen penerimaan benih dapat dialokasikan ke beberapa polybag. | - | - | `baseline.js` / `data.json` |
| 136 | **RN-SEM-TP029** | v1 | **Confirmed** | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | Memindai QR Code fisik pada plang polybag pembibitan. | - | - | `baseline.js` / `data.json` |
| 137 | **RN-SEM-TP030** | v1 | **Confirmed** | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | Mantri menginput jumlah butir benih yang ditransplanting dan jumlah benih afkir/rusak. | - | - | `baseline.js` / `data.json` |
| 138 | **RN-SEM-TP031** | v1 | **Confirmed** | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | Foto bukti fisik benih reject/rusak dengan watermark timestamp ISO dan GPS. | - | - | `baseline.js` / `data.json` |
| 139 | **RN-SEM-TP032** | v1 | **Confirmed** | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | Asisten menyetujui pemindahan benih kecambah dari bedengan ke polybag. | - | - | `baseline.js` / `data.json` |
| 140 | **RN-SEM-TP033** | v1 | **Confirmed** | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | Transplanting ke polybag menggunakan rasio 1 Polybag = 2 Benih/Bibit. | - | - | `baseline.js` / `data.json` |
| 141 | **RN-SEM-TP034** | v1 | **Confirmed** | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | Satu Batch bibitan dapat dikonsolidasi dari beberapa polybag. | - | - | `baseline.js` / `data.json` |
| 142 | **RN-SEM-TP035** | v1 | **Confirmed** | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | Batch polybag telah terdaftar dan siap dipelihara hingga mencapai ukuran okulasi. | - | - | `baseline.js` / `data.json` |
| 143 | **RN-CHK-RG036** | v1 | **Confirmed** | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | Pemeriksaan bersifat dinamis dan dapat dilakukan bertahap. | - | - | `baseline.js` / `data.json` |
| 144 | **RN-CHK-RG037** | v1 | **Confirmed** | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | Bibit gagal dapat ditentukan untuk Regrafting kembali atau Reject. | - | - | `baseline.js` / `data.json` |
| 145 | **RN-CHK-RG038** | v1 | **Confirmed** | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | Validasi fisik QR Code Batch yang diperiksa. | - | - | `baseline.js` / `data.json` |
| 146 | **RN-CHK-RG039** | v1 | **Confirmed** | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | Menginput jumlah batang yang diperiksa pada sesi ini (misal 600 dari 1.000). | - | - | `baseline.js` / `data.json` |
| 147 | **RN-CHK-RG040** | v1 | **Confirmed** | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | Mencatat jumlah mata tempelan yang hijau (berhasil) vs hitam/mati (gagal). | - | - | `baseline.js` / `data.json` |
| 148 | **RN-CHK-RG041** | v1 | **Confirmed** | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | Mantri menentukan tindak lanjut bibit yang gagal: Regrafting kembali atau Reject. | - | - | `baseline.js` / `data.json` |
| 149 | **RN-CHK-RG042** | v1 | **Confirmed** | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | Foto bukti fisik mata tempelan berhasil dan gagal beserta watermark. | - | - | `baseline.js` / `data.json` |
| 150 | **RN-CHK-RG043** | v1 | **Confirmed** | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | Mengirim hasil pemeriksaan ke Asisten Bibitan untuk disetujui. | - | - | `baseline.js` / `data.json` |
| 151 | **RN-CHK-RG044** | v1 | **Confirmed** | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | Pemeriksaan tuntas; bibit berhasil lanjut tumbuh, bibit gagal siap di-Regrafting kembali atau di-Reject. | - | - | `baseline.js` / `data.json` |
| 152 | **RN-ENT-TOP045** | v1 | **Confirmed** | Mantri Bibitan | Kebun Entres | Topping Plot Entres | Aktivitas topping menghitung rasio Perisai/Kayu dan Perisai/Meter. | - | - | `baseline.js` / `data.json` |
| 153 | **RN-ENT-TOP046** | v1 | **Confirmed** | Mantri Bibitan | Kebun Entres | Topping Plot Entres | Validasi QR Code plang fisik plot entres yang dirawat. | - | - | `baseline.js` / `data.json` |
| 154 | **RN-ENT-TOP047** | v1 | **Confirmed** | Mantri Bibitan | Kebun Entres | Topping Plot Entres | Sistem menyajikan data clone dan jumlah pokok tanaman induk per plot. | - | - | `baseline.js` / `data.json` |
| 155 | **RN-ENT-TOP048** | v1 | **Confirmed** | Mantri Bibitan | Kebun Entres | Topping Plot Entres | Mantri menginput Tanggal, Jumlah Kayu Okulasi, Total Panjang Meter, dan Jumlah Perisai. | - | - | `baseline.js` / `data.json` |
| 156 | **RN-ENT-TOP049** | v1 | **Confirmed** | Mantri Bibitan | Kebun Entres | Topping Plot Entres | Sistem menghitung Rata-rata Perisai/Kayu dan Rata-rata Perisai/Meter. | - | - | `baseline.js` / `data.json` |
| 157 | **RN-ENT-TOP050** | v1 | **Confirmed** | Mantri Bibitan | Kebun Entres | Topping Plot Entres | Foto dokumentasi plot setelah ditopping beserta timestamp, diteruskan ke Asisten Bibitan. | - | - | `baseline.js` / `data.json` |
| 158 | **RN-ENT-TOP051** | v1 | **Confirmed** | Mantri Bibitan | Kebun Entres | Topping Plot Entres | Plot entres terawat optimal dan siap menghasilkan kayu entres berkualitas. | - | - | `baseline.js` / `data.json` |
| 159 | **RN-MAT-MMG052** | v1 | **Confirmed** | Mantri Bibitan | Material & Bahan | Matching Material Dokumen Gudang | Dokumen gudang material wajib matching 1 Heading Kerja pemeliharaan. | - | - | `baseline.js` / `data.json` |
| 160 | **RN-MAT-MMG053** | v1 | **Confirmed** | Mantri Bibitan | Material & Bahan | Matching Material Dokumen Gudang | Memilih rentang waktu dan jenis material gudang untuk ditinjau rekonsiliasinya. | - | - | `baseline.js` / `data.json` |
| 161 | **RN-MAT-MMG054** | v1 | **Confirmed** | Mantri Bibitan | Material & Bahan | Matching Material Dokumen Gudang | Pencocokan nomor BKB material gudang terhadap realisasi aplikasi pemeliharaan berbasis Heading Kerja. | - | - | `baseline.js` / `data.json` |
| 162 | **RN-MAT-MMG055** | v1 | **Confirmed** | Mantri Bibitan | Material & Bahan | Matching Material Dokumen Gudang | Menarik alokasi pupuk, herbisida, fungisida, dan plastik okulasi yang telah dikeluarkan gudang. | - | - | `baseline.js` / `data.json` |
| 163 | **RN-MAT-MMG056** | v1 | **Confirmed** | Mantri Bibitan | Material & Bahan | Matching Material Dokumen Gudang | Validasi rekonsiliasi material memastikan kuantitas pemakaian tidak melebihi alokasi BKB. | - | - | `baseline.js` / `data.json` |
| 164 | **RN-MAT-MMG057** | v1 | **Confirmed** | Mantri Bibitan | Material & Bahan | Matching Material Dokumen Gudang | Notifikasi Mantri berhasil; dokumen material melekat pada rekam pemeliharaan. | - | - | `baseline.js` / `data.json` |
| 165 | **RN-MAT-MMG058** | v1 | **Confirmed** | Mantri Bibitan | Material & Bahan | Matching Material Dokumen Gudang | Seluruh material dan mutasi stok tercatat rapi dan dapat dipertanggungjawabkan. | - | - | `baseline.js` / `data.json` |
| 166 | **RN-PWP-006** | v1 | **Confirmed** | Asisten Bibitan | Presensi | Presensi Pekerja Bibitan | Verifikasi Presensi & HK Harian Tenaga Kerja oleh Asisten Bibitan | - | - | `baseline.js` / `data.json` |
| 167 | **RN-MAT-MMG059** | v1 | **Confirmed** | Asisten Bibitan | Material & Bahan | Material Gudang Matching | Approval Rekonsiliasi Dokumen Gudang Material oleh Asisten Bibitan | - | - | `baseline.js` / `data.json` |
| 168 | **RN-EXP-008** | v1 | **Confirmed** | Asisten Divisi | Pengeluaran | Pengeluaran Bibit SPB Disetujui | Plotting Polygon Lokasi Tanam Bibit & Konfirmasi Terima di Divisi | - | - | `baseline.js` / `data.json` |
| 169 | **RN-SEL-012** | v1 | **Confirmed** | Asisten Kepala | Penyeleksian | Seleksi Batch Polybag | Otorisasi Berita Acara Pemusnahan Bibit Afkir oleh Asisten Kepala | - | - | `baseline.js` / `data.json` |
| 170 | **RN-ENT-008** | v1 | **Confirmed** | Tekniker I | Kebun Entres | Menunas Plot Entres | Audit Kemurnian Clone Tanaman Induk Entres oleh Tekniker I | - | - | `baseline.js` / `data.json` |
| 171 | **RN-OKL-029** | v1 | **Confirmed** | Tekniker I | Okulasi | Okulasi Grafting Utama | Kalibrasi & Uji Petik Standar Juru Okulasi oleh Tekniker I | - | - | `baseline.js` / `data.json` |
| 172 | **RN-RCV-028** | v1 | **Confirmed** | Tekniker I | Penerimaan | Penerimaan Benih Kelapa Sawit | Uji Mutu & Daya Kecambah Benih Kelatak oleh Tekniker I | - | - | `baseline.js` / `data.json` |
| 173 | **RN-EXP-009** | v1 | **Confirmed** | KTU | Pengeluaran | Pengeluaran Bibit SPB Disetujui | Rekonsiliasi Buku Stok Bibitan & SPPB Bulanan oleh KTU | - | - | `baseline.js` / `data.json` |
| 174 | **RN-MAT-MMG060** | v1 | **Confirmed** | KTU | Material & Bahan | Material Gudang Matching | Audit Biaya Material & Bukti Pengeluaran Barang oleh KTU | - | - | `baseline.js` / `data.json` |
| 175 | **RN-PWP-007** | v1 | **Confirmed** | KTU | Presensi | Presensi Pekerja Bibitan | Verifikasi Rekapitulasi HK & Upah Pekerja Bibitan oleh KTU | - | - | `baseline.js` / `data.json` |
| 176 | **RN-MNT-009** | v1 | **Confirmed** | Mantri Bibitan | Rekam Pemeliharaan | Pencatatan Heading Kerja | Pencatatan Audit Trail Koreksi Transaksi Pembibitan | - | - | `baseline.js` / `data.json` |
| 177 | **RN-SEM-TP036** | v1 | **Confirmed** | Asisten Bibitan | Penyemaian | Transplanting Polybag | Transfer Tahap Pertumbuhan Seedling ke Okulasi oleh Asisten Bibitan | - | - | `baseline.js` / `data.json` |
| 178 | **RN-SEL-013** | v1 | **Confirmed** | Asisten Bibitan | Penyeleksian | Seleksi Batch Polybag | Verifikasi Transfer Batch Bibitan oleh Asisten Bibitan | - | - | `baseline.js` / `data.json` |
| 179 | **RN-SEL-014** | v1 | **Confirmed** | Asisten Kepala | Penyeleksian | Seleksi Batch Polybag | Pemeriksaan Berkala Stok Bibit Siap Salur vs RKAP oleh Asisten Kepala | - | - | `baseline.js` / `data.json` |

---

## 8. GENERAL SYSTEM REQUIREMENTS (FUNCTIONAL & NON-FUNCTIONAL)

### 8.1 Functional Requirements (14 Item)

| ID | Kategori | Judul / Spesifikasi Kebutuhan Fungsional |
|---|---|---|
| **KF-001** | Authentication & Session | Sistem harus menyediakan autentikasi dan pengelolaan sesi pengguna berdasarkan role dan kewenangan. |
| **KF-002** | Role & Access | Sistem harus menyediakan akses fitur dan transaksi sesuai hak akses masing-masing pengguna. |
| **KF-003** | Operational Transaction | Sistem harus mencatat seluruh transaksi operasional pembibitan karet secara terstruktur dan real-time. |
| **KF-004** | QR Identification | Sistem harus mendukung identifikasi dan validasi fisik petak, bedengan, dan batch bibitan melalui QR Code. |
| **KF-005** | Documentation | Sistem harus memfasilitasi dokumentasi foto lapangan dan pencatatan timestamp pada setiap tahapan kegiatan. |
| **KF-006** | Validation & Verification | Sistem harus menerapkan validasi ambang batas dan verifikasi multi-level sebelum transaksi disahkan. |
| **KF-007** | Approval | Sistem harus menyediakan alur persetujuan (approval/rejection) berjenjang dari verifikator (Asisten/Pimpinan). |
| **KF-008** | Offline Operation | Sistem harus dapat beroperasi secara offline di area lapangan tanpa koneksi internet dengan penyimpanan lokal aman. |
| **KF-009** | Synchronization | Sistem harus melakukan sinkronisasi otomatis dan rekonsiliasi data lokal ke server pusat saat koneksi tersedia. |
| **KF-010** | Stock / Population | Sistem harus mengkalkulasi mutasi stok material, entres, dan populasi bibit hidup secara otomatis dan akurat. |
| **KF-011** | Notification | Sistem harus memberikan notifikasi dan peringatan dini atas anomali proses atau penolakan verifikasi. |
| **KF-012** | Reporting | Sistem harus menghasilkan rekapitulasi data dan laporan performa proses bisnis pembibitan sesuai format standar. |
| **KF-013** | Audit Trail | Sistem harus mencatat jejak audit (audit trail) yang tidak dapat dimanipulasi untuk setiap perubahan data. |
| **KF-014** | Integration | Sistem harus mendukung integrasi data dengan database ledger dan sistem ERP korporasi SOCFIN. |

### 8.2 Non-Functional Requirements (10 Item)

| ID | Kategori | Judul / Spesifikasi Kebutuhan Non-Fungsional |
|---|---|---|
| **KNF-001** | Usability | Sistem harus memiliki antarmuka yang sederhana, konsisten, dan mudah digunakan oleh personel operasional lapangan. |
| **KNF-002** | Performance | Waktu respon aplikasi untuk transaksi input dan pemindaian QR Code tidak boleh melebihi 2 detik. |
| **KNF-003** | Offline & Connectivity | Sistem harus mempertahankan ketersediaan fungsi esensial 100% saat tidak terdapat koneksi jaringan di kebun. |
| **KNF-004** | Data Integrity | Sistem harus menjaga integritas dan konsistensi data selama proses input, penyimpanan, sinkronisasi, dan integrasi. |
| **KNF-005** | Security | Seluruh data kredensial dan transmisi komunikasi data harus dienkripsi dengan standar keamanan industri. |
| **KNF-006** | Reliability | Sistem harus memiliki keandalan tinggi (high availability) dengan mekanisme toleransi kesalahan dan auto-recovery. |
| **KNF-007** | Scalability | Arsitektur data harus mampu menangani pertumbuhan volume transaksi dan populasi bibitan tahunan tanpa degradasi performa. |
| **KNF-008** | Maintainability | Kode dan struktur modul harus modular, terdokumentasi, dan mudah dipelihara atau dikembangkan di masa depan. |
| **KNF-009** | Auditability | Seluruh perubahan status, revisi data, dan aksi pengguna harus dapat dilacak dan diaudit secara independen. |
| **KNF-010** | Compatibility | Aplikasi harus kompatibel dengan perangkat mobile Android lapangan standar dan browser modern. |

---

## 9. VALIDASI AKHIR

- [x] Tidak ada file data yang diubah atau dihapus.
- [x] Tidak ada penambahan requirement baru.
- [x] Tidak ada perubahan status atau versi requirement.
- [x] Audit dilakukan secara read-only sesuai instruksi.
