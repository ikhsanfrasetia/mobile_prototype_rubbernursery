# PROJECT STRUCTURE & ARCHITECTURE AUDIT REPORT
**Project:** SIGMA Rubber Nursery Mobile Application Prototype (PWA)  
**Audit Scope:** Full Project Architecture, Directory Structure, Modules, Data Sources, Master Data, Dependencies, and Hardcoded Values  
**Status:** COMPLETED & VERIFIED (READ-ONLY AUDIT)  
**Date:** 2026-09-12  

---

## 1. Executive Summary

Audit menyeluruh telah dilakukan terhadap seluruh codebase **SIGMA Rubber Nursery**. Proyek ini merupakan **Progressive Web App (PWA)** nir-framework (Vanilla JavaScript ES Modules, Semantic HTML5, Vanilla CSS) yang dirancang untuk beroperasi secara offline-first dengan persistensi lokal berbasis `localStorage` dan `IndexedDB`, serta didukung oleh server backend Express.js untuk kebutuhan review/feedback dan mapping proses bisnis.

### Temuan Utama:
1. **Arsitektur Master Data Saat Ini:**
   - **Master Klon:** Tersedia di `js/data/klon-master.js` (Fondasi Phase 9K, 64 klon kanonikal) dan legacy `js/data/master-data.js` (3 klon dummy). Modul-modul transaksi eksisting masih menggunakan array hardcoded lokal masing-masing.
   - **Master Plot Entres:** Masih berupa array hardcoded lokal 6 plot (`PLOT-ENT-01` s/d `PLOT-ENT-06`) yang tersebar di `topping-scan.js`, `menunas-scan.js`, `topping-form.js`, dan `menunas-form.js`.
   - **Master Budwood:** Belum ada entitas terpisah khusus untuk `budwood_code` sebagai master mandiri di luar peruntukan klon entres.
2. **Keterpisahan Data Runtime vs Backend:**
   - Transaksi operasional nursery (Penerimaan, Penyemaian, Okulasi, Kebun Entres, Pemeliharaan, SPB) berjalan 100% pada client-side runtime (`localStorage` via `js/core/storage.js` dan `IndexedDB` via `js/db/indexeddb.js`).
   - Server Express (`server.js`) hanya melayani REST API untuk `/api/notes` (Review/Feedback) dan `/api/process-mapping` (BPD Portal).
3. **Kesiapan Integrasi Dataset Baru:**
   - Dataset baru dengan 5 atribut (`budwood_code`, `plot_name`, `number_of_plants`, `year_of_planting`, `clone_name`) dapat diintegrasikan secara elegan dan terpusat ke dalam arsitektur master modular tanpa merusak struktur histori transaksi eksisting.

---

## 2. Project Architecture

```
                                  +---------------------------------------+
                                  |         User (Mobile / Desktop)       |
                                  +---------------------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |              index.html               |
                                  +---------------------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |        sw.js (Service Worker)         |
                                  |       Cache: sigma-nursery-v159       |
                                  +---------------------------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |          js/app.js (Bootstrap)        |
                                  +---------------------------------------+
                                                      |
                                  +-------------------+-------------------+
                                  |                                       |
                                  v                                       v
               +-------------------------------------+ +-------------------------------------+
               |       js/core/router.js (Hash)      | |      js/db/seed.js (IndexedDB)      |
               +-------------------------------------+ +-------------------------------------+
                                  |
                                  v
+----------------------------------------------------------------------------------------------------+
|                                    BUSINESS MODULES (js/modules/*)                                  |
|  - auth/ (login, splash, sync)             - inspection/ (quality inspection)                      |
|  - dashboard/ (beranda role-scoped)        - selection/ (afkir / culling)                          |
|  - attendance/ (presensi pekerja)          - maintenance/ (pemeliharaan / CFNA)                    |
|  - receipt/ (penerimaan benih & SIR)       - request/ (permintaan bibit SPB)                       |
|  - seeding/ (penyemaian bedengan)          - dispatch/ (pengiriman bibit)                          |
|  - budding/ (okulasi mata entres)          - history/ (nursery-history timeline)                   |
|  - entres/ (topping & menunas plot)        - transactions/ (manager multi-transaksi)               |
|  - profile/ (profil saya persona aktif)    - review/ (review workspace & feedback)                 |
+----------------------------------------------------------------------------------------------------+
                                  |
    +-----------------------------+-----------------------------+
    |                             |                             |
    v                             v                             v
+-----------------------+ +-----------------------+ +-----------------------+
| In-Memory Master Data | |     Local Storage     | |       IndexedDB       |
| - klon-master.js      | |  (js/core/storage.js) | | (js/db/indexeddb.js)  |
| - worker-master.js    | | - form states         | | - master stores       |
| - cfna-master.js      | | - active drafts       | | - offline queue       |
| - master-data.js      | | - transaction records | | - user / role caches  |
+-----------------------+ +-----------------------+ +-----------------------+
```

---

## 3. Directory Structure Audit

| Direktori / File | Fungsi & Peran | Jenis File Utama | Runtime/Prod? | Klasifikasi Konten |
|:---|:---|:---|:---|:---|
| `assets/` | Menyimpan asset statis gambar avatar pekerja dan ikon PWA | `.jpg`, `.png`, `.svg` | **Ya** (Runtime) | Static Asset |
| `css/` | Lembar gaya UI murni tanpa framework (`app.css`, `components.css`, `pages.css`, `review.css`) | `.css` | **Ya** (Runtime) | Active Source (Styling) |
| `data/` | Database backend JSON untuk catatan perbaikan & mapping proses bisnis (`notes.json`, `process-mapping-data.json`, `backups/`) | `.json` | **Ya** (Backend Server) | Data Store |
| `docs/` | Dokumentasi arsitektur, arsip lama (`archive/legacy/`), dan UI mockup referensi | `.md`, `.json`, `.png` | Tidak | Documentation & Reference |
| `js/` | Seluruh source code JavaScript aplikasi PWA (Core, Components, Data, DB, Modules) | `.js` | **Ya** (Runtime) | Active Source (Frontend) |
| `node_modules/`| Dependensi Node.js server (`express`, `cors`, `dotenv`, `nodemailer`, `lucide`) | Package dependencies | **Ya** (Server Only) | Utility / Vendor |
| `portal_patch/`| File patch tambahan untuk portal | `.js`, `.css` | Tidak (Staging/Utility) | Temporary Artifact |
| `scratch/` | Script analisis dan data pengujian sementara | `.json`, `.js` | Tidak | Temporary Artifact |
| `scripts/` | Seluruh unit test suites dan master regression runner (24 test suites) | `.js` | Pengujian / CI | Verification & Testing |
| `server/` | Modul backend database JSON dan mailer (`db.js`, `mailer.js`, `process-mapping-db.js`) | `.js` | **Ya** (Backend Server) | Active Source (Backend) |
| `tools/` | Script utilitas pembangunan dan pemeliharaan | `.js` | Tidak | Utility |
| `index.html` | Entry point tunggal HTML dokumen aplikasi | `.html` | **Ya** (Production) | Entry Point |
| `sw.js` | Service Worker untuk caching PWA offline-first (`sigma-nursery-v159`) | `.js` | **Ya** (Production) | Core Infrastructure |
| `server.js` | Entry point backend Express.js server | `.js` | **Ya** (Backend Server) | Entry Point (Server) |
| `package.json` | Konfigurasi manifest Node.js, dependensi, dan scripts | `.json` | **Ya** | Configuration |
| `ecosystem.config.cjs` | Konfigurasi process manager PM2 | `.cjs` | **Ya** (Deployment) | Configuration |

---

## 4. Application Entry Flow

```
1. USER BROWSER ACCESS
   URL: http://localhost:3000/ atau PWA standalone icon

2. SERVICE WORKER (sw.js)
   Intercept network request.
   Caching strategy: Network-first untuk dynamic scripts, Cache-first untuk core assets.
   Core assets mencakup: CSS, JS core, Data master, dan Web manifest.

3. HTML ENTRY POINT (index.html)
   Memuat:
   - Metadata PWA (<meta name="viewport">, <link rel="manifest">)
   - Stylesheets: css/app.css, css/components.css, css/pages.css, css/review.css
   - Container root: <div id="app"></div>
   - Script bootstrap: <script type="module" src="./js/app.js"></script>

4. BOOTSTRAP INITIALIZATION (js/app.js)
   - window.addEventListener('DOMContentLoaded')
   - Step A: seedDatabase() -> Mengisi IndexedDB dengan master statis jika belum terisi.
   - Step B: initRouter() -> Membaca window.location.hash, mencocokkan route aktif.
   - Step C: initReviewWorkspace() -> Mengaktifkan panel feedback review perbaikan.
   - Step D: initExportScreenToolbar() -> Mengaktifkan toolbar ekspor layar.

5. ROUTING & RENDERING (js/core/router.js)
   - Mengarahkan default '/' ke '/login'.
   - Mengambil session pengguna aktif dari js/core/session.js.
   - Memanggil fungsi render modul terkait (mis. renderBuddingForm(), renderToppingScan()).
   - Modul menghasilkan HTML string dan memasukkannya ke document.getElementById('app').

6. DATA FETCHING & INTERACTION
   - Form membaca master reference (Klon, Pekerja, CFNA, Plot).
   - User mengisi form transaksi.
   - Data disimpan ke Local Storage (js/core/storage.js) dan/atau IndexedDB (js/db/repositories.js).
   - Notifikasi sukses via js/components/toast.js, lalu navigasi kembali ke Landing / Timeline.
```

---

## 5. Module Map (js/modules/*)

| Modul | File Utama | Domain Bisnis | Sumber Data Utama | Ketergantungan Master |
|:---|:---|:---|:---|:---|
| **Auth** | `login.js`, `splash.js`, `sync.js` | Autentikasi & Persona Session | `demo-personas.js`, `user-context.js` | User, Role, Persona Switcher |
| **Dashboard** | `beranda.js` | Beranda Role & Navigasi Operasional | `user-context.js`, `menu-registry.js`, `storage.js` | Role Capabilities & Recent Txs |
| **Profile** | `profile.js` | Tampilan Identitas Persona Aktif | `user-context.js`, `role-profiles.js` | Current Persona Context |
| **Attendance** | `attendance-landing.js`, `attendance-workers.js`, `attendance-supervisor.js` | Presensi Mandor & Pekerja | `worker-master.js`, `storage.js` | Worker Master (Phase 9H) |
| **Receipt** | `receipt-landing.js`, `receipt-benih.js`, `receipt-sir.js`, `receipt-camera.js` | Penerimaan Benih SIR & Polong | `storage.js`, Hardcoded arrays | Hardcoded 57 SIR clones & 4 seed clones |
| **Seeding** | `seeding-landing.js`, `seeding-scan.js`, `seeding-form.js` | Penyemaian Kecambah ke Bedengan | `storage.js`, Hardcoded array | Hardcoded 8 clones (`klonList`) |
| **Budding** | `budding-landing.js`, `budding-grafting.js`, `budding-scan.js`, `budding-form.js`, `budding-regrafting.js` | Okulasi Batang Bawah & Mata Entres | `storage.js`, `worker-master.js`, Hardcoded array | Hardcoded 19 entres clones (`KLON_ENTRES_LIST`) |
| **Entres** | `entres-landing.js`, `topping-scan.js`, `topping-form.js`, `menunas-scan.js`, `menunas-form.js` | Kebun Entres (Topping & Menunas) | `storage.js`, Hardcoded array | Hardcoded 6 plots (`MASTER_PLOTS_ENTRES`) |
| **Inspection** | `inspection-landing.js`, `inspection-scan.js`, `inspection-form.js` | Pemeriksaan Mutu / Keberhasilan | `storage.js` | Snapshot Klon dari Batch Okulasi |
| **Selection** | `selection-landing.js` | Seleksi & Pengafkiran Bibit | `storage.js` | Snapshot Klon dari Batch Seeding |
| **Maintenance**| `nursery-activity.js` | Pemeliharaan Lapangan & CFNA | `worker-master.js`, `cfna-master.js`, `storage.js` | Worker Master & CFNA (Phase 9I) |
| **Request** | `request-landing.js`, `request-kebun-sepupu-form.js` | Permintaan Bibit SPB Kebun Sepupu | `storage.js`, Hardcoded dropdown | Hardcoded 3 clones (`PB 260`, `RRIM 600`, `GT 1`) |
| **Dispatch** | `dispatch-landing.js`, `dispatch-report.js` | Pengeluaran & Surat Pengantar Bibit | `storage.js` | SPB Requests |
| **History** | `nursery-history.js` | Riwayat Transaksi & Timeline Komprehensif | `storage.js` (semua store transaksi) | Read-only Snapshots (`klon`, `klonEntres`, `kodePlot`) |
| **Transactions**| `transaction-manager.js` | Ringkasan Status & Manajemen Transaksi | `storage.js` (agregasi lintas form) | Read-only Snapshots |
| **Review** | `review-workspace.js` | Catatan Koreksi & Feedback Asisten/Pengurus | REST API `/api/notes`, `server.js` | Notes DB |

---

## 6. Data Source Map

| Tipe Penyimpanan | Lokasi / File Pengelola | Key / Store yang Digunakan | Modul Pengguna |
|:---|:---|:---|:---|
| **Local Storage** | `js/core/storage.js` | `benih_table_rows`, `seeding_transactions`, `budding_transactions`, `entres_topping_transactions`, `entres_menunas_transactions`, `inspection_transactions`, `selection_transactions`, `nursery_activity_transactions`, `requests`, `selected_topping_plot`, `selected_menunas_plot`, `selected_sir`, `selected_klon` | Seluruh form transaksi dan riwayat operasional |
| **IndexedDB** | `js/db/indexeddb.js`, `js/db/repositories.js` | Database `sigma-nursery-db` (Stores: `users`, `roles`, `divisions`, `estates`, `clones`, `workers`, `beds`, `reasons`, `attendance`, `receptions`, `seedings`, `buddings`, `entresActivities`, dll.) | Seed master, repository abstraksi |
| **In-Memory JS Masters**| `js/data/klon-master.js`, `js/data/worker-master.js`, `js/data/cfna-master.js`, `js/data/master-data.js` | `KLON_MASTER`, `WORKER_MASTER`, `CFNA_MASTER`, `CLONES`, `DEMO_PERSONAS` | Master lookup, dropdown generator, query filters |
| **JSON Backend** | `data/notes.json`, `data/process-mapping-data.json` | `/api/notes`, `/api/process-mapping` | `review-workspace.js`, server REST API |

---

## 7. Master Data Map

```
+----------------------------------------------------------------------------------------------------+
|                                      CENTRALIZED MASTER REGISTRIES                                 |
+----------------------------------------------------------------------------------------------------+
| 1. WORKER MASTER (js/data/worker-master.js) — Status: ACTIVE (Phase 9F-B/9G/9H/9I)                 |
|    - 24 Pekerja terverifikasi, terisolasi per Estate (Tanah Besih / Aek Pamingke) & Divisi.        |
|                                                                                                    |
| 2. CFNA MASTER (js/data/cfna-master.js) — Status: ACTIVE (Phase 9B/9C/9I)                          |
|    - 46 Kodifikasi Cost Field Nursery Allocation untuk aktivitas pemeliharaan.                     |
|                                                                                                    |
| 3. KLON MASTER (js/data/klon-master.js) — Status: FOUNDATION BUILT (Phase 9K)                      |
|    - 64 Klon karet unggul kanonikal, normalized keys, 198 alias terdaftar, status & usage enum.    |
|                                                                                                    |
| 4. LEGACY STATIC MASTER (js/data/master-data.js) — Status: RETIRED FROM NEW TRANSACTION            |
|    - 3 Klon lama (PB 260, RRIM 600, GT 1), Roles, Growth Stages, Beds, Reasons.                    |
|                                                                                                    |
| 5. ENTRES PLOT MASTER (TERSEBAR / HARDCODED DI MODULES) — Status: CANDIDATE FOR REPLACEMENT        |
|    - 6 Plot di topping-scan.js & menunas-scan.js (PLOT-ENT-01 s/d PLOT-ENT-06).                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 8. Clone Master Dependency Matrix

| Modul & File | Referensi Klon Saat Ini | Field Klon yang Digunakan | Tipe Penggunaan |
|:---|:---|:---|:---|
| `js/modules/receipt/receipt-sir.js` | Array lokal `klonNames` (57 klon) | `name`, `sub`, `title` | Pilihan Dokumen SIR (Penerimaan) |
| `js/modules/receipt/receipt-benih.js` | Dropdown HTML hardcoded (4 klon) | `option value` (`PB260`, `GT1`, `IRR300`, `IRCA120`) | Input baris tabel penerimaan benih |
| `js/modules/seeding/seeding-form.js` | Array lokal `klonList` (8 klon) | `item value` (`GT-01`, `PB-260`, dll.) | Dropdown pemilihan klon semai |
| `js/modules/seeding/seeding-scan.js` | `sourceTx.klon` | `klon` | Verifikasi QR kecambah |
| `js/modules/budding/budding-form.js` | Array lokal `KLON_ENTRES_LIST` (19 klon) | `klonEntres`, `klonRootstock` (dari batch) | Dropdown mata entres & summary |
| `js/modules/budding/budding-scan.js` | `selectedBatch.klonAwal` | `klonAwal` | Scan identifikasi batang bawah |
| `js/modules/budding/budding-regrafting.js` | Snapshot transaksi okulasi | `rtx.klonEntres`, `rtx.klonRootstock` | Okulasi ulang (regrafting) |
| `js/modules/entres/topping-scan.js` | `MASTER_PLOTS_ENTRES[].namaKlon` | `namaKlon` | Display klon pada plot entres |
| `js/modules/entres/menunas-scan.js` | `MASTER_PLOTS_ENTRES[].namaKlon` | `namaKlon` | Display klon pada plot entres |
| `js/modules/entres/topping-form.js` | `selectedPlot.namaKlon` | `namaKlon` | Header info transaksi topping |
| `js/modules/entres/menunas-form.js` | `selectedPlot.namaKlon` | `namaKlon` | Header info transaksi menunas |
| `js/modules/request/request-kebun-sepupu-form.js` | Dropdown HTML hardcoded (3 klon) | `option value` (`PB 260`, `RRIM 600`, `GT 1`) | Dropdown SPB Permintaan Bibit |
| `js/modules/history/nursery-history.js` | Snapshot transaksi | `tx.klon`, `tx.klonEntres`, `tx.namaKlon` | Label kartu riwayat transaksi |
| `js/modules/transactions/transaction-manager.js`| Snapshot transaksi | `item.klon`, `item.klonEntres` | Agregasi dashboard transaksi |

---

## 9. Budwood / Entres Dependency Matrix

| Modul & File | Referensi Entres/Budwood Saat Ini | Field yang Digunakan | Keterangan |
|:---|:---|:---|:---|
| `js/modules/budding/budding-form.js` | `KLON_ENTRES_LIST` | `klonEntres`, `mataEntres` | Pilihan mata okulasi entres |
| `js/modules/entres/entres-landing.js` | Transaksi Kebun Entres | `activityType` (Topping / Menunas) | Landing modul kebun entres |
| `js/modules/entres/topping-scan.js` | Scan QR Plot Entres | `kodePlot`, `namaKlon` | Pemilihan plot untuk pengambilan kayu entres |
| `js/modules/entres/topping-form.js` | Form Topping | `jumlahKayu`, `totalPanjangMeter`, `jumlahPerisai` | Input hasil panen mata entres/kayu okulasi |
| `js/modules/entres/menunas-scan.js` | Scan QR Plot Entres | `kodePlot`, `namaKlon` | Pemilihan plot untuk penunasan |
| `js/modules/entres/menunas-form.js` | Form Menunas | `tunasDibuang`, `kondisi` | Input pemeliharaan mata entres |
| `js/modules/history/nursery-history.js` | Riwayat Entres | `tx.jumlahKayu`, `tx.jumlahPerisai`, `tx.namaKlon` | Tampilan riwayat panen kayu entres |

---

## 10. Plot Dependency Matrix

| Modul & File | Referensi Plot Saat Ini | Field Plot yang Digunakan | Lokasi / Kode Hardcoded |
|:---|:---|:---|:---|
| `js/modules/entres/topping-scan.js` | `MASTER_PLOTS_ENTRES` | `kodePlot`, `namaKlon`, `jlhPokok`, `lokasi`, `tahunTanam` | Baris 15–22 (`PLOT-ENT-01` s/d `PLOT-ENT-06`) |
| `js/modules/entres/menunas-scan.js` | `MASTER_PLOTS_ENTRES` | `kodePlot`, `namaKlon`, `jlhPokok`, `lokasi`, `tahunTanam` | Baris 15–22 (`PLOT-ENT-01` s/d `PLOT-ENT-06`) |
| `js/modules/entres/topping-form.js` | `storage.get('selected_topping_plot')` | `kodePlot`, `namaKlon`, `jlhPokok`, `lokasi` | Baris 36–41 (Fallback `PLOT-ENT-01`) |
| `js/modules/entres/menunas-form.js` | `storage.get('selected_menunas_plot')` | `kodePlot`, `namaKlon`, `jlhPokok`, `lokasi` | Baris 36–41 (Fallback `PLOT-ENT-01`) |
| `js/modules/history/nursery-history.js` | Snapshot transaksi entres | `tx.kodePlot`, `tx.namaKlon`, `tx.jlhPokok` | Timeline riwayat kebun entres |

---

## 11. Hardcoded Data Inventory

### Kategori A: Data Konfigurasi UI & Opsi Statis (Valid Tetap Ada)
- Tahapan Pertumbuhan: `['Rootstock Mother Nursery', 'RAPM', 'Rubber Main Nursery']` (`receipt-benih.js`)
- Tipe Asal Benih: `['Kebun Sendiri', 'Pihak Ke-III', 'Kebun Sepupu']` (`receipt-benih.js`)
- Jenis Alasan Afkir: `['Mati', 'Kerdil', 'Serangan Jamur', 'Bengkok']` (`selection-landing.js`)

### Kategori B: Data Master Hardcoded (Wajib Digantikan ke Master Terpusat)
1. **Daftar Plot Kebun Entres (6 Plot):**
   - File: `js/modules/entres/topping-scan.js` (L15-22) & `js/modules/entres/menunas-scan.js` (L15-22)
   ```javascript
   export const MASTER_PLOTS_ENTRES = [
     { kodePlot: 'PLOT-ENT-01', namaKlon: 'PB 260', jlhPokok: 200, lokasi: 'Kebun Entres Blok A1', tahunTanam: 2022 },
     { kodePlot: 'PLOT-ENT-02', namaKlon: 'IRCA 19', jlhPokok: 150, lokasi: 'Kebun Entres Blok A2', tahunTanam: 2022 },
     { kodePlot: 'PLOT-ENT-03', namaKlon: 'IRR 112', jlhPokok: 250, lokasi: 'Kebun Entres Blok B1', tahunTanam: 2023 },
     { kodePlot: 'PLOT-ENT-04', namaKlon: 'RRIM 911', jlhPokok: 180, lokasi: 'Kebun Entres Blok B2', tahunTanam: 2023 },
     { kodePlot: 'PLOT-ENT-05', namaKlon: 'PB 330', jlhPokok: 220, lokasi: 'Kebun Entres Blok C1', tahunTanam: 2024 },
     { kodePlot: 'PLOT-ENT-06', namaKlon: 'IRR 104', jlhPokok: 190, lokasi: 'Kebun Entres Blok C2', tahunTanam: 2024 }
   ];
   ```
2. **Daftar Klon Penerimaan SIR (57 Klon):**
   - File: `js/modules/receipt/receipt-sir.js` (L122-130) -> `const klonNames = ["BPM1", "BPM24", ...]`
3. **Daftar Klon Penyemaian (8 Klon):**
   - File: `js/modules/seeding/seeding-form.js` (L48) -> `const klonList = ['GT-01', 'PB-235', 'PB-260', 'PB-330', 'RRIM-600', 'IRR-300', 'BPM-24', 'PR-261']`
4. **Daftar Klon Okulasi Entres (19 Klon):**
   - File: `js/modules/budding/budding-form.js` (L23-43) -> `const KLON_ENTRES_LIST = ['IRR 215', 'RRIM 911', ...]`
5. **Daftar Klon SPB Permintaan (3 Klon):**
   - File: `js/modules/request/request-kebun-sepupu-form.js` (L123-128) -> `<option value="PB 260">...`

---

## 12. Transaction Dependency Map

```
1. PENERIMAAN BENIH / SIR (receipt-benih.js, receipt-sir.js)
   Input (Dokumen SIR / Vendor) -> Master Klon -> storage: selected_sir, selected_klon, benih_table_rows
   -> Output Transaksi: Batch Benih (menyimpan field `klon`)

2. PENYEMAIAN (seeding-form.js)
   Input (Scan Batch Benih) -> Master Klon (Rootstock) -> storage: seeding_transactions
   -> Output Transaksi: Batch Semai Bedengan (menyimpan field `klon` / `klonAwal`)

3. OKULASI / BUDDING (budding-form.js)
   Input (Scan Bedengan Semai) -> Master Rootstock (`klonAwal`) + Master Entres (`klonEntres`) + Master Pekerja
   -> storage: budding_transactions -> Output: Batch Okulasi (menyimpan `klonRootstock` & `klonEntres`)

4. KEBUN ENTRES — TOPPING (topping-form.js)
   Input (Scan QR Plot) -> Master Plot Entres (`kodePlot`, `namaKlon`, `jlhPokok`, `tahunTanam`)
   -> storage: entres_topping_transactions -> Output: Produksi Kayu Entres & Perisai

5. KEBUN ENTRES — MENUNAS (menunas-form.js)
   Input (Scan QR Plot) -> Master Plot Entres (`kodePlot`, `namaKlon`, `jlhPokok`)
   -> storage: entres_menunas_transactions -> Output: Catatan Penunasan Plot

6. PERMINTAAN BIBIT SPB (request-kebun-sepupu-form.js)
   Input (Form Permintaan) -> Master Klon -> storage: requests
   -> Output: Dokumen SPB Permintaan Bibit Antar-Kebun

7. RIWAYAT & MANAGER (nursery-history.js, transaction-manager.js)
   Membaca seluruh snapshot array di storage -> Menampilkan timeline & agregasi statistik
```

---

## 13. Historical Data & Compatibility Analysis

1. **Format Penyimpanan Transaksi Historis:**
   - Seluruh transaksi historis di `localStorage` menyimpan data dalam bentuk **snapshot denormalized** (menyimpan string langsung seperti `'PB 260'`, `'GT-01'`, `'PLOT-ENT-01'`).
   - Transaksi historis **TIDAK** melakukan foreign-key join dinamis yang akan menyebabkan error `NullPointerException` jika ID lama diubah.
2. **Kebutuhan Kompatibilitas:**
   - Transaksi historis **TIDAK BOLEH dimutasi atau di-backfill**.
   - Untuk membaca riwayat lama secara mulus, master baru cukup menyediakan lookup/alias resolver (mis. `resolveKlon('GT-01')` $\rightarrow$ `GT 1`, `resolvePlot('PLOT-ENT-01')` $\rightarrow$ Plot Record).
   - Tampilan riwayat (`nursery-history.js`) menggunakan fallback: `tx.klon || tx.klonAwal || tx.namaKlon || '-'`, sehingga data lama dijamin tetap tampil 100% utuh.

---

## 14. Backend / API Map (server.js)

| Route / Endpoint | Method | Fungsi | Storage Backend | Digunakan Frontend? |
|:---|:---|:---|:---|:---|
| `/api/notes` | `GET` | Ambil semua catatan review & stats | `data/notes.json` via `server/db.js` | Ya (`review-workspace.js`) |
| `/api/notes/:id` | `GET` | Ambil detail 1 catatan review | `data/notes.json` | Ya |
| `/api/notes` | `POST` | Buat catatan review baru & kirim email | `data/notes.json` & `server/mailer.js` | Ya |
| `/api/notes/:id` | `PATCH` | Update status catatan (Baru/Proses/Selesai) | `data/notes.json` | Ya |
| `/api/notes/:id` | `DELETE`| Hapus catatan | `data/notes.json` | Ya |
| `/api/process-mapping/*` | `GET/POST`| CRUD flow BPD, nodes, requirements, rules | `data/process-mapping-data.json` | Ya (Portal Mapping) |
| `/*` (Static Files) | `GET` | Serve index.html, JS, CSS, PWA Assets | File system root | Ya (Browser / PWA) |

> **Catatan Backend:** Server Express **tidak menyediakan** dan **tidak mengelola** endpoint CRUD untuk master klon, budwood, plot, ataupun transaksi nursery. Seluruh transaksi nursery beroperasi secara client-side offline-first.

---

## 15. Existing Documentation Map

| Dokumen | Isi & Keputusan Arsitektur Sebelumnya |
|:---|:---|
| `PHASE_9J_CLONE_DATA_AUDIT_REPORT.md` | Audit menyeluruh data klon lintas 11 modul dan inventarisasi format (spaced vs condensed vs hyphenated). |
| `KLON_MASTER_DEPENDENCY_MATRIX.md` | Matriks ketergantungan modul transaksi terhadap 5 sumber data klon lokal. |
| `KLON_VALUE_INVENTORY.md` | Daftar 57+ variasi penamaan klon asli yang ditemukan di kode. |
| `KLON_SCHEMA_COMPARISON.md` | Pemetaan variasi nama field (`klon`, `klonAwal`, `klonEntres`, `klonRootstock`, `namaKlon`). |
| `KLON_HISTORICAL_COMPATIBILITY_AUDIT.md` | Prinsip zero mutation dan backward compatibility data transaksi historis. |
| `KLON_NORMALIZATION_RECOMMENDATION.md` | Rekomendasi pembentukan master terpusat, alias mapping, dan pembagian bertahap. |
| `PHASE_9K_CLONE_MASTER_FOUNDATION_REPORT.md` | Laporan pembentukan fondasi master terpusat `js/data/klon-master.js` (64 klon). |
| `PHASE_9FB_WORKER_MASTER_FOUNDATION_REPORT.md`| Laporan pembentukan master pekerja terpusat `worker-master.js` (24 pekerja). |
| `PHASE_9B_CFNA_MASTER_REPORT.md` | Laporan pembentukan master CFNA terpusat `cfna-master.js` (46 CFNA). |

---

## 16. Current Source of Truth Analysis

| Entitas Data | Sumber Aktual Saat Ini | Status Keterpusatan | Risiko / Keterangan |
|:---|:---|:---|:---|
| **Pekerja (Worker)** | `js/data/worker-master.js` | **Terpusat (SSOT)** | Sudah terintegrasi ke Budding, Presensi, dan Maintenance. |
| **CFNA (Biaya)** | `js/data/cfna-master.js` | **Terpusat (SSOT)** | Sudah terintegrasi ke Maintenance. |
| **Klon (Clone)** | `js/data/klon-master.js` vs Array Lokal | **Sebagian Terpusat** | Master terpusat `klon-master.js` sudah siap (Phase 9K), tetapi form transaksi masih menggunakan array hardcoded lokal. |
| **Kebun Entres (Plot)**| Array lokal di scan modules | **Terfragmentasi / Hardcoded** | 6 plot hardcoded di `topping-scan.js` dan `menunas-scan.js`. |
| **Budwood** | Belum ada master khusus | **Belum Tersedia** | Menggunakan nama klon entres secara umum. |

---

## 17. Risk & Technical Debt Analysis

1. **Fragmentasi Dropdown Klon:**
   Modul SIR memiliki 57 klon, Penyemaian 8 klon, Okulasi 19 klon, SPB 3 klon. Perbedaan ini menyebabkan inkonsistensi pilihan antar tahap bibitan.
2. **Hardcoded Plot Entres:**
   Enam plot (`PLOT-ENT-01` s/d `PLOT-ENT-06`) tertulis langsung di file UI `topping-scan.js` dan `menunas-scan.js`. Jika data kebun bertambah atau berubah, developer harus mengubah source code file UI.
3. **Data Snapshots Histori:**
   Karena riwayat transaksi menyimpan snapshot string, pergantian master tidak akan merusak riwayat masa lalu, asalkan field lama tetap dipetakan dengan fallback yang aman.

---

## 18. Recommended Safe Integration Point

Berdasarkan hasil audit, arsitektur integrasi data baru yang paling aman, konsisten, dan modular adalah:

1. **Bentuk Master Data Baru yang Terpusat & Terstruktur:**
   - **`Master Klon`:** Diturunkan dari `clone_name` unik pada dataset baru (dilengkapi alias & normalized key).
   - **`Master Budwood`:** Diturunkan dari `budwood_code` unik pada dataset baru.
   - **`Master Plot Klon/Budwood`:** Setiap baris dataset sumber merepresentasikan 1 entitas plot (`budwood_code`, `plot_name`, `number_of_plants`, `year_of_planting`, `clone_name`).
2. **Gantikan Sumber Data pada Modul:**
   - Modul Kebun Entres (`topping-scan.js`, `menunas-scan.js`, `topping-form.js`, `menunas-form.js`) diarahkan membaca master plot terpusat (menghapus array 6 plot hardcoded).
   - Modul Okulasi (`budding-form.js`), Penyemaian (`seeding-form.js`), dan Penerimaan (`receipt-sir.js`, `receipt-benih.js`) diarahkan membaca master klon/budwood terpusat.
3. **Pelihara Backward Compatibility:**
   - Fungsi helper `resolveKlon()` dan `resolvePlot()` memastikan pembacaan transaksi historis tetap 100% aman.

---

## 19. Files Potentially Affected by New Budwood & Plot Dataset

### A. File Master Data yang Akan Diganti / Diperbarui:
1. `js/data/klon-master.js` (Menjadi Single Source of Truth untuk Klon, Budwood, dan Plot)
2. `js/data/master-data.js` (Menonaktifkan array `CLONES` lama)

### B. File Modul Transaksi yang Akan Mengonsumsi Master Baru:
1. `js/modules/entres/topping-scan.js` (Menghapus `MASTER_PLOTS_ENTRES` lokal, membaca master plot baru)
2. `js/modules/entres/menunas-scan.js` (Menghapus `MASTER_PLOTS_ENTRES` lokal, membaca master plot baru)
3. `js/modules/entres/topping-form.js` (Sinkronisasi detail plot & budwood baru)
4. `js/modules/entres/menunas-form.js` (Sinkronisasi detail plot & budwood baru)
5. `js/modules/budding/budding-form.js` (Mengonsumsi katalog klon entres/budwood dari master baru)
6. `js/modules/seeding/seeding-form.js` (Mengonsumsi katalog klon rootstock dari master baru)
7. `js/modules/receipt/receipt-benih.js` (Mengonsumsi katalog klon penerimaan dari master baru)
8. `js/modules/receipt/receipt-sir.js` (Mengonsumsi katalog klon SIR dari master baru)
9. `js/modules/request/request-kebun-sepupu-form.js` (Mengonsumsi katalog klon SPB dari master baru)

### C. File Pendukung & Caching:
1. `sw.js` (Memastikan asset master terdaftar di `CORE_ASSETS` dan versi cache dinaikkan)

---

## 20. Kesimpulan Audit

Audit arsitektur dan struktur proyek telah **SELESAI 100%**. Seluruh ketergantungan, modul, alur entry point, penyimpanan data lokal, dan titik-titik data hardcoded telah terpetakan secara presisi dan terdokumentasi dalam laporan ini.

**Tidak ada kode sumber, data master, atau file transaksi yang diubah selama pelaksanaan audit ini.**
Laporan ini siap dijadikan acuan resmi untuk perumusan task implementasi berikutnya.
