# ESTATE_DIVISION_BLOCK_AUDIT.md
**Laporan Audit Master Kebun (Estate), Divisi (Division), dan Blok (Block) — Phase Awal**
*Project SIGMA Rubber Nursery Mobile & Web Application*
*Status: READ-ONLY AUDIT & ARCHITECTURE BLUEPRINT*
*Tanggal: 12 September 2026*

---

## 1. Executive Summary

Audit ini dilakukan sebagai tahap awal sebelum pembangunan **Master Blok** per Kebun dan Divisi pada aplikasi SIGMA Rubber Nursery. Berdasarkan prinsip *"AUDIT BEFORE IMPLEMENTATION"*, investigasi mendalam dilakukan terhadap seluruh basis kode (`js/data/`, `js/db/`, `js/core/`, `js/modules/`, `scripts/`, dan `docs/`) untuk memetakan *Source of Truth*, dependensi struktural, relasi hierarkis, serta pemanfaatan data Kebun, Divisi, dan Blok pada runtime, session user, dan transaksi.

### Temuan Utama:
1. **Kebun / Estate:**
   - Telah didefinisikan pada layer session/persona (`EST-TBS` / Tanah Besih dan `EST-APM` / Aek Pamingke) serta pada IndexedDB demo seed (`EST-001`, `EST-002`, `EST-003`).
   - Melekat erat pada *User Context* (`user.estateId`, `user.estateName`) dan *Transaction Actor Identity* (`actor.estateId`).
2. **Divisi / Division:**
   - Didefinisikan pada `js/data/worker-master.js` dan `js/data/demo-personas.js` dengan pemisahan Divisi I dan Divisi II per Estate (`DIV-001`, `DIV-002` untuk Tanah Besih; `DIV-APM-01`, `DIV-APM-02` untuk Aek Pamingke).
   - Menjadi batas lingkup otorisasi operasional bagi peran lapangan (*Division Scope*: Mantri Bibitan, Asisten Lapangan, Asisten Bibitan).
3. **Blok / Block:**
   - **BELUM memiliki Master Data terpusat.**
   - Data blok saat ini tersebar secara hardcoded lokal pada modul pemeliharaan `js/modules/maintenance/nursery-activity.js` (`MASTER_LOKASI_BLOK` berisi 10 record blok dengan atribut luas HA).
   - Belum ada entitas `blocks` di IndexedDB maupun di `js/data/`.
4. **Rekomendasi Strategis:**
   - Menerapkan arsitektur **Master Blok Terpusat (`js/data/block-master.js`)** yang terhubung secara relasional hierarkis:
     $$\text{Master Kebun (Estate)} \longrightarrow \text{Master Divisi (Division)} \longrightarrow \text{Master Blok (Block)}$$
   - Mengonsolidasikan referensi Kebun dan Divisi ke dalam entitas master resmi tanpa merusak backwards compatibility terhadap session, persona demo, dan audit trail histori transaksi.

---

## 2. Existing Estate Master (Audit Kebun)

### A. Lokasi dan Sumber Data
1. **IndexedDB Schema (`js/db/indexeddb.js`):**
   - Object store: `'estates'` terdaftar dalam `STORES` array (Line 15).
   - KeyPath: `'id'`.
2. **Repository Layer (`js/db/repositories.js`):**
   - `export const estateRepository = createRepository('estates');` (Line 82).
3. **Seed Layer (`js/db/seed.js` & `js/data/demo-data.js`):**
   ```javascript
   export const DEMO_ESTATES = [
     { id: 'EST-001', code: 'EST-001', name: 'Tanah Besih' },
     { id: 'EST-002', code: 'EST-002', name: 'Tanah Besih' },
     { id: 'EST-003', code: 'EST-003', name: 'Aek Pamingke' }
   ];
   ```
4. **Persona & Context Layer (`js/data/demo-personas.js` & `js/core/user-context.js`):**
   - Menggunakan kode kanonikal:
     - `EST-TBS`: Tanah Besih
     - `EST-APM`: Aek Pamingke

### B. Atribut dan Struktur Field Existing
- `id`: Identifier unik (`EST-TBS`, `EST-APM`, atau `EST-001` legacy).
- `code`: Kode kebun (`TBS`, `APM`, atau `EST-001`).
- `name`: Nama lengkap kebun (`Tanah Besih`, `Aek Pamingke`).
- `status`: Implicit active.

### C. Konsumen Estate
- `js/core/user-context.js`: Penentuan estate aktif user session (`resolveUserContext`).
- `js/core/transaction-actor.js`: Perekaman audit trail identitas kebun pelaku transaksi (`createTransactionActorSnapshot`).
- `js/data/worker-master.js`: Pengelompokan 24 pekerja nursery berdasarkan `estateId` dan `estateName`.
- `js/modules/attendance/attendance-workers.js`: Filter pekerja berdasarkan estate mandor/supervisor.
- `js/modules/request/request-kebun-sepupu-form.js`: SPB pengeluaran bibit antar-kebun.

---

## 3. Existing Division Master (Audit Divisi)

### A. Lokasi dan Sumber Data
1. **IndexedDB Schema (`js/db/indexeddb.js`):**
   - Object store: `'divisions'` terdaftar dalam `STORES` array (Line 14).
   - KeyPath: `'id'`.
2. **Repository Layer (`js/db/repositories.js`):**
   - `export const divisionRepository = createRepository('divisions');` (Line 81).
3. **Seed Layer (`js/data/demo-data.js`):**
   ```javascript
   export const DEMO_DIVISIONS = [
     { id: 'DIV-001', code: 'DIV-001', name: 'Tanah Besih - Divisi I', estateId: 'EST-001' },
     { id: 'DIV-002', code: 'DIV-002', name: 'Tanah Besih - Divisi Kantor', estateId: 'EST-001' },
     { id: 'DIV-003', code: 'DIV-003', name: 'Tanah Besih - Divisi Pabrik', estateId: 'EST-002' },
     { id: 'DIV-APM', code: 'DIV-APM', name: 'Aek Pamingke - All Division', estateId: 'EST-003' }
   ];
   ```
4. **Master Pekerja & Persona Layer (`js/data/worker-master.js` & `js/data/demo-personas.js`):**
   - **Tanah Besih (`EST-TBS`):**
     - `DIV-TBS-EST`: Lingkup seluruh kebun (Estate scope: Pengurus, Askep, Tekniker I, KTU).
     - `DIV-001`: Divisi I (Asisten Pembibitan, Mantri Bibitan, Pekerja Bibitan).
     - `DIV-002`: Divisi II (Asisten Lapangan).
   - **Aek Pamingke (`EST-APM`):**
     - `DIV-APM-EST`: Lingkup seluruh kebun (Estate scope).
     - `DIV-APM-01`: Divisi I (Asisten Lapangan, Mantri Bibitan, Pekerja Bibitan).
     - `DIV-APM-02`: Divisi II (Asisten Pembibitan).

### B. Relasi Divisi $\rightarrow$ Kebun (Estate)
Relasi bersifat **Many-to-One**:
- Setiap divisi menyimpan `estateId` sebagai foreign key penunjuk kebun induknya.

---

## 4. Existing Block Data (Audit Blok)

### A. Status Master Blok
- **Master Block Terpusat:** **BELUM ADA** (`js/data/block-master.js` belum ada).
- **IndexedDB Store:** **TIDAK ADA** store `'blocks'` di `indexeddb.js`.
- **JSON / CSV Dataset Khusus Blok:** Belum tersedia file terpisah.

### B. Data Blok Hardcoded yang Ditemukan
Ditemukan daftar hardcoded 10 blok pada file `js/modules/maintenance/nursery-activity.js` (Lines 64–75):

```javascript
export const MASTER_LOKASI_BLOK = [
  { blok: 'Block 031/04', luas: 39.68 },
  { blok: 'Block 036G/19', luas: 0.45 },
  { blok: 'Block 033/07', luas: 8.8 },
  { blok: 'Block 026/20', luas: 2.35 },
  { blok: 'Block 008/01', luas: 29 },
  { blok: 'Block 016D/13', luas: 1.94 },
  { blok: 'Block 036N/19', luas: 0.45 },
  { blok: 'Block 036U/19', luas: 0.23 },
  { blok: 'Block 013/14', luas: 38.05 },
  { blok: 'Block 016C/13', luas: 1.94 }
];
```

### C. Karakteristik Data Blok Existing:
1. **Struktur:** Array of Object `{ blok: string, luas: number }`.
2. **Ketiadaan FK:** Belum memiliki referensi `divisionId` maupun `estateId`.
3. **Format Penamaan:** Menggunakan format `'Block [Nomor]/[TahunTanam]'` (contoh: `Block 031/04` $\rightarrow$ Blok 031 Tahun Tanam 2004).
4. **Pemanfaatan:** Digunakan pada dropdown form pemeliharaan nursery activity, menghitung volume dosis bahan dan luas perlakuan.

---

## 5. IndexedDB & Storage Analysis

### A. Daftar Object Store Relevan di `js/db/indexeddb.js`:
| Store Name | Kategori | KeyPath | Repository | Deskripsi |
| :--- | :--- | :--- | :--- | :--- |
| `estates` | Master | `id` | `estateRepository` | Menyimpan data master kebun hasil seed |
| `divisions` | Master | `id` | `divisionRepository` | Menyimpan data master divisi hasil seed |
| `beds` | Master | `id` | `bedRepository` | Menyimpan data bedengan (Bedengan 001..003) |
| `nurseryActivities` | Transaksi | `id` | `nurseryActivityRepository` | Menyimpan transaksi pemeliharaan (dengan objek `lokasiBlok`) |
| `requests` | Transaksi | `id` | `requestRepository` | Menyimpan permohonan bibit SPB (dengan `divisionName`) |

### B. Dual-Layer Storage Pattern:
Aplikasi menggunakan pola sinkronisasi ganda:
1. **IndexedDB:** Media persistensi offline-first utama melalui repository.
2. **LocalStorage (`sigma_nursery_*`):** Backup cepat untuk konsumsi synchronous oleh Transaction Manager dan History feed.

---

## 6. User / Persona / Actor Scoping Relation

Hierarki hubungan identitas user dan ruang lingkup operasional:

$$\text{User / Persona} \longrightarrow \text{Role} \longrightarrow \text{Scope Type} \longrightarrow \begin{cases} \text{Estate Scope (Seluruh Kebun)} \\ \text{Division Scope (Divisi Tertentu)} \end{cases}$$

### A. Pemetaan Scope Per Role:
| Role | Label Jabatan | Scope Type | Ruang Lingkup Otorisasi |
| :--- | :--- | :--- | :--- |
| `PENGURUS` | Pengurus Kebun | `ESTATE` | Lintas seluruh divisi dalam kebunnya |
| `ASKEP` | Asisten Kepala | `ESTATE` | Lintas seluruh divisi dalam kebunnya |
| `TEKNIKER_I` | Tekniker I | `ESTATE` | Monitoring teknis seluruh kebun |
| `KTU` | Kepala Tata Usaha | `ESTATE` | Monitoring administrasi seluruh kebun |
| `PENGURUS_KEBUN_SEPUPU` | Pengurus Kebun Sepupu | `ESTATE` | Kebun sepupu pemohon bibit (e.g. Aek Pamingke) |
| `ASISTEN_BIBITAN` | Asisten Pembibitan | `DIVISION` | Divisi penugasan (Divisi I) |
| `ASISTEN` | Asisten Lapangan | `DIVISION` | Divisi penugasan (Divisi I / Divisi II) |
| `MANTRI_TANAMAN` | Mantri Bibitan | `DIVISION` | Divisi penugasan (Divisi I) |

### B. Status Blok dalam Otorisasi:
- **Blok saat ini TIDAK digunakan untuk pembatasan hak akses (permission / role scoping).**
- Otorisasi berhenti pada level **Divisi**.
- Blok berfungsi murni sebagai **lokasi fisik / target objek operasional** (misal: blok pemeliharaan, blok tanam tujuan pengeluaran bibit).

---

## 7. Dependensi Transaksi (Data Flow Mapping)

| Modul Transaksi | Input Lapangan | Sumber Master | Penyimpanan Storage | Snapshot Audit Actor |
| :--- | :--- | :--- | :--- | :--- |
| **Penerimaan (Receipt)** | Sumber/Tipe Asal, Klon, SIR, Qty | `klon-master.js` | `receipt_transactions` & `receptions` | `estateId`, `divisionId`, `name` |
| **Penyemaian (Seeding)** | Batch, Bedengan, Klon Rootstock, Qty | `klon-master.js` | `seeding_transactions` & `seedings` | `estateId`, `divisionId`, `name` |
| **Okulasi (Budding)** | Batch, Bedengan, Klon Entres/Rootstock | `klon-master.js`, `budwood-master.js` | `budding_transactions` & `buddings` | `estateId`, `divisionId`, `name` |
| **Pemeriksaan (Inspection)** | Ref Dokumen, Batch, Jumlah Jadi/Gagal | `klon-master.js` | `inspection_transactions` & `inspections` | `estateId`, `divisionId`, `name` |
| **Seleksi / Afkir (Selection)** | Batch, Bedengan, Klon, Qty Afkir | `klon-master.js` | `selection_transactions` & `selections` | `estateId`, `divisionId`, `name` |
| **Kebun Entres (Topping/Menunas)** | Plot, Klon, Budwood, Jumlah Pokok | `budwood-plot-master.js`, `budwood-master.js` | `entres_transactions` & `entresActivities` | `estateId`, `divisionId`, `name` |
| **Pemeliharaan (Nursery Activity)** | **Lokasi Blok**, Jenis Kegiatan, Bahan, Dosis, HK | `cfna-master.js`, `worker-master.js`, **`MASTER_LOKASI_BLOK`** | `nursery_activity_records` & `nurseryActivities` | `estateId`, `divisionId`, `name`, **`lokasiBlok`** |
| **Permintaan Bibit (SPB)** | Rencana Tanam, Klon, Qty, Divisi Tujuan | `klon-master.js`, `userContext` | `requests_transactions` & `requests` | `estateId`, `divisionName`, `name` |
| **Presensi (Attendance)** | Daftar Hadir Pekerja, Mandor | `worker-master.js` | `attendance_transactions` & `attendance` | `estateId`, `divisionId`, `name` |

---

## 8. Inventarisasi Data Hardcode (Hardcoded Data Inventory)

```
INVENTARIS STRUKTUR DATA:
├── A. MASTER DATA TERPUSAT (OFFICIAL SINGLE SOURCE OF TRUTH)
│   ├── klon-master.js (57 klon unik aktif)
│   ├── budwood-master.js (1 budwood code 2021/BWG/001)
│   ├── budwood-plot-master.js (97 master plot resmi)
│   ├── worker-master.js (24 master pekerja resmi)
│   └── cfna-master.js (46 kode alokasi biaya CFNA)
│
├── B. CONFIGURATION & REGISTRY (READ-ONLY)
│   ├── demo-personas.js (14 persona 2 Estate × 7 Roles)
│   ├── role-profiles.js (Profil kapabilitas & scope role)
│   └── menu-registry.js (Navigasi menu per role)
│
├── C. HARDCODED LOCAL DROPDOWN (CANDIDATE FOR MIGRATION TO MASTER)
│   └── MASTER_LOKASI_BLOK pada nursery-activity.js (10 blok hardcoded lokal)
│
├── D. DEMO SEED FIXTURES (LEGACY INITIAL DATA)
│   ├── DEMO_ESTATES pada demo-data.js (EST-001 s/d EST-003)
│   └── DEMO_DIVISIONS pada demo-data.js (DIV-001 s/d DIV-003, DIV-APM)
│
└── E. TRANSACTION SNAPSHOTS (IMMUTABLE HISTORICAL DATA)
    └── Field estateId, divisionId, divisionName, lokasiBlok pada record tersimpan
```

---

## 9. Current Source of Truth

1. **Kebun / Estate:**
   - *Current Active Source:* `js/data/demo-personas.js` dan `js/core/user-context.js` (`EST-TBS` / Tanah Besih, `EST-APM` / Aek Pamingke).
   - *Database Seed Source:* `js/data/demo-data.js` (`EST-001`, `EST-002`, `EST-003`).
2. **Divisi / Division:**
   - *Current Active Source:* `js/data/worker-master.js` dan `js/data/demo-personas.js` (`DIV-001`, `DIV-002`, `DIV-APM-01`, `DIV-APM-02`).
   - *Database Seed Source:* `js/data/demo-data.js`.
3. **Blok / Block:**
   - *Current Active Source:* Lokal `MASTER_LOKASI_BLOK` pada `js/modules/maintenance/nursery-activity.js`.
   - *Master Status:* Belum ada master terpusat.

---

## 10. Rekomendasi Arsitektur Master Blok, Divisi, dan Kebun

Direkomendasikan membangun Master Blok terpusat yang terintegrasi secara relasional hierarkis dengan Master Divisi dan Master Kebun:

```
┌────────────────────────────────────────────────────────┐
│                   MASTER KEBUN (ESTATE)                │
│  - id: 'EST-TBS', 'EST-APM'                            │
│  - code: 'TBS', 'APM'                                  │
│  - name: 'Tanah Besih', 'Aek Pamingke'                 │
└───────────────────────────┬────────────────────────────┘
                            │ (1 : N)
                            ▼
┌────────────────────────────────────────────────────────┐
│                 MASTER DIVISI (DIVISION)               │
│  - id: 'DIV-001', 'DIV-002', 'DIV-APM-01', 'DIV-APM-02'│
│  - estateId: 'EST-TBS' (FK)                            │
│  - code: 'DIV-I', 'DIV-II'                             │
│  - name: 'Divisi I', 'Divisi II'                       │
└───────────────────────────┬────────────────────────────┘
                            │ (1 : N)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   MASTER BLOK (BLOCK)                  │
│  - id: 'BLK-TBS-01-03104' (PK)                         │
│  - divisionId: 'DIV-001' (FK)                          │
│  - estateId: 'EST-TBS' (FK)                            │
│  - blockCode: '031/04'                                 │
│  - blockName: 'Block 031/04'                           │
│  - luasHa: 39.68                                       │
│  - tahunTanam: 2004                                    │
│  - status: 'ACTIVE'                                    │
└────────────────────────────────────────────────────────┘
```

### Spesifikasi Skema Master Blok (`js/data/block-master.js`):
```javascript
export const BLOCK_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  REPLANTING: 'REPLANTING'
});

export const BLOCK_MASTER = Object.freeze([
  {
    id: 'BLK-001',
    blockCode: '031/04',
    blockName: 'Block 031/04',
    estateId: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionId: 'DIV-001',
    divisionName: 'Divisi I',
    luasHa: 39.68,
    tahunTanam: 2004,
    status: BLOCK_STATUS.ACTIVE
  },
  // ... 10+ Blok resmi terpetakan per divisi & estate
]);
```

### Candidate Helper APIs pada `block-master.js`:
- `getAllBlocks()` $\rightarrow$ Seluruh data blok.
- `getActiveBlocks()` $\rightarrow$ Blok dengan status `ACTIVE`.
- `getBlocksByDivision(divisionId)` $\rightarrow$ Filter blok per divisi.
- `getBlocksByEstate(estateId)` $\rightarrow$ Filter blok per kebun.
- `getBlockById(id)` $\rightarrow$ Lookup by ID.
- `getBlockByCode(code)` $\rightarrow$ Lookup by block code.
- `resolveBlock(query)` $\rightarrow$ Smart fallback resolver (mencocokkan string input/legacy).

---

## 11. Recommended Implementation Points (Fase Eksekusi Mendatang)

Rekomendasi implementasi bertahap tanpa risiko:

1. **Fase 1: Pembuatan Foundation Master Blok (`js/data/block-master.js`)**
   - Buat file master independen deklaratif yang memetakan seluruh blok ke Divisi dan Kebun resmi.
   - Buat unit test foundation (`scripts/test-block-master-foundation.js`).
2. **Fase 2: Registrasi IndexedDB & Service Worker Cache**
   - Tambahkan store `'blocks'` di `js/db/indexeddb.js` dan repository di `js/db/repositories.js` (jika dibutuhkan persistensi offline lanjutan).
   - Daftarkan `js/data/block-master.js` ke `CORE_ASSETS` di `sw.js`.
3. **Fase 3: Integrasi Modul Pemeliharaan (`nursery-activity.js`)**
   - Gantikan `MASTER_LOKASI_BLOK` lokal dengan pemanggilan `getActiveBlocks()` / `getBlocksByDivision()`.
   - Pastikan auto-fill `luasHa` tetap berfungsi saat dropdown blok dipilih.
4. **Fase 4: Integrasi Modul Pengeluaran / SPB (`request-kebun-sepupu-form.js`)**
   - Jika form SPB membutuhkan target blok tanam kebun, sediakan dropdown blok yang terfilter berdasarkan divisi tujuan.
5. **Fase 5: Validasi & Regresi Penuh**
   - Pastikan seluruh 31 test suites existing tetap 100% PASS (0 failure).

---

## 12. Analisis Risiko & Strategi Mitigasi

| Potensi Risiko | Tingkat Dampak | Strategi Mitigasi |
| :--- | :---: | :--- |
| **1. Konflik Format ID Kebun (`EST-001` vs `EST-TBS`)** | Sedang | Buat *Alias Resolver* di helper master yang mengenali kedua format ID secara transparan. |
| **2. Perubahan Data Transaksi Pemeliharaan Lama** | Tinggi | Seluruh histori lama yang menyimpan objek `{ blok: 'Block 031/04', luas: 39.68 }` dibaca murni as-is tanpa migrasi paksa. |
| **3. Terganggunya Scoping User / Role** | Tinggi | Blok tidak diikutsertakan dalam logic otorisasi role (`user-context.js` tetap berbasis Estate/Division). |
| **4. Blok Tidak Ditemukan pada Transaksi Offline** | Rendah | Daftarkan `block-master.js` ke cache Service Worker agar selalu tersedia offline. |

---

## 13. File yang Berpotensi Terdampak pada Fase Implementasi Berikutnya

*(Catatan: File-file ini HANYA akan dimodifikasi pada fase implementasi mendatang, BUKAN pada task audit ini).*

1. `js/data/block-master.js` *(File Baru Mendatang)*
2. `js/modules/maintenance/nursery-activity.js` *(Integrasi dropdown blok)*
3. `js/db/indexeddb.js` & `js/db/repositories.js` *(Penambahan store & repo)*
4. `sw.js` *(Pembaruan manifest cache PWA)*
5. `scripts/run-all-tests-phase9k.js` *(Pendaftaran test suite master blok baru)*

---

## 14. Kesimpulan Audit

Audit struktur Kebun, Divisi, dan Blok telah selesai. Pondasi **Master Kebun** (`EST-TBS`, `EST-APM`) dan **Master Divisi** (`DIV-001`, `DIV-002`, `DIV-APM-01`, `DIV-APM-02`) sudah sangat solid dan teruji pada User Context dan Transaction Actor Identity. 

Pembangunan **Master Blok (`block-master.js`)** dapat segera dilaksanakan pada fase berikutnya dengan mengadopsi pola arsitektur deklaratif terpusat yang menghubungkan setiap blok ke Divisi dan Kebun induknya secara aman (*Add, Do Not Break*).
