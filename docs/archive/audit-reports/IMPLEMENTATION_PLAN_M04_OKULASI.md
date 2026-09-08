# IMPLEMENTATION PLAN: M04 OKULASI / REGRAFTING

## 1. Scope
Rencana mutasi ini mencakup penyelarasan 11 entitas target (Requirement & Flow Node) pada modul M04 (Okulasi/Grafting) serta penanganan khusus terhadap requirement `RN-OKL-014`. Rencana ini disusun untuk menghilangkan konflik terminologi material dan konflik logika bisnis terkait otomatisasi pemotongan stok/populasi.

## 2. Baseline Reference
Berdasarkan `MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md`:
1. Naming proses adalah **Okulasi (Grafting)**.
2. Material harus merujuk pada **Mata Entres dari Kebun Kayu Okulasi**.
3. **Tidak ada asumsi otomatis kurangi populasi/stok**. Estimasi bersifat referensi.
4. **Jangan memperluas scope M04** dengan aturan Kebun Kayu Okulasi yang belum ditetapkan (seperti *ledger* stok KKO).

## 3. Mutation Principles
- **Terminology-only**: Merubah istilah usang ("Plot Entres", "kayu entres", "mata tunas") menjadi terminologi resmi ("Mata Entres dari Kebun Kayu Okulasi").
- **Source/Reference missing**: Memastikan konteks *input* atau narasi dengan tegas mengikat material ke "Kebun Kayu Okulasi".
- **Business logic conflict**: Menghapus validasi atau *output* yang secara paksa mengurangi stok material, karena bertentangan dengan prinsip baseline M04.
- **Confirmation Needed**: Entitas yang mengandung logika bisnis yang seluruhnya bertentangan dengan baseline (misal: proses murni untuk memotong stok) akan ditunda mutasinya hingga mendapat ketetapan bisnis.

---

## 4. Entity-by-Entity Analysis & Proposed Before/After

### A. Candidate Mutation List (REVISE)

#### 1. RN-OKL-005
- **Jenis Entitas**: Requirement
- **Status Saat Ini**: Confirmed
- **Jenis Konflik**: Terminology-only & Source Reference
- **Teks Saat Ini**: Title: "Validasi kesesuaian varietas clone kayu entres terhadap rencana penempelan batch.", Input: "QR Code Plot Entres"
- **Rekomendasi**: **REVISE**
- **Target Field Mutation**: `title`, `input`
- **Usulan Nilai Baru**: 
  - `title`: "Validasi kesesuaian varietas clone Mata Entres dari Kebun Kayu Okulasi terhadap rencana penempelan batch."
  - `input`: "QR Code Kebun Kayu Okulasi"
- **Evidence**: Baseline mengharuskan referensi utuh ke "Kebun Kayu Okulasi".

#### 2. RN-OKL-008
- **Jenis Entitas**: Requirement
- **Status Saat Ini**: Confirmed
- **Jenis Konflik**: Terminology-only & Source Reference
- **Teks Saat Ini**: Title: "Menginput jumlah batang/cabang kayu entres yang diambil dari plot.", Input: "Jumlah cabang kayu okulasi"
- **Rekomendasi**: **REVISE**
- **Target Field Mutation**: `title`, `input`
- **Usulan Nilai Baru**: 
  - `title`: "Menginput jumlah material Mata Entres dari Kebun Kayu Okulasi yang digunakan."
  - `input`: "Kuantitas material Mata Entres"
- **Evidence**: Standarisasi istilah material.

#### 3. RN-OKL-010
- **Jenis Entitas**: Requirement
- **Status Saat Ini**: Confirmed
- **Jenis Konflik**: Business Logic
- **Teks Saat Ini**: Validation: "Mata entres aktual <= stok tersedia pada Plot Entres + Clone."
- **Rekomendasi**: **REVISE**
- **Target Field Mutation**: `validation`
- **Usulan Nilai Baru**: 
  - `validation`: "Kuantitas aktual > 0. Estimasi bertindak sebagai referensi, bukan batasan stok kaku."
- **Evidence**: Baseline secara eksplisit menyebut "Estimasi merupakan referensi, bukan stok". Validasi kaku yang mengikat pada stok harus dihapus.

#### 4. RN-OKL-012
- **Jenis Entitas**: Requirement
- **Status Saat Ini**: Confirmed
- **Jenis Konflik**: Terminology-only
- **Teks Saat Ini**: Validation: "Semua validasi mandatory terpenuhi (QR, pekerja, entres, foto)."
- **Rekomendasi**: **REVISE**
- **Target Field Mutation**: `validation`
- **Usulan Nilai Baru**: 
  - `validation`: "Semua validasi mandatory terpenuhi (QR, pekerja, material Mata Entres dari Kebun Kayu Okulasi, foto)."
- **Evidence**: Konsistensi penyebutan syarat mutlak.

#### 5. RN-REG-005
- **Jenis Entitas**: Requirement
- **Status Saat Ini**: Confirmed
- **Jenis Konflik**: Terminology-only & Source Reference
- **Teks Saat Ini**: Title: "Memilih plot kebun entres dan memindai QR fisik plot penyedia mata tunas.", Input: "QR Code Plot Entres."
- **Rekomendasi**: **REVISE**
- **Target Field Mutation**: `title`, `input`
- **Usulan Nilai Baru**: 
  - `title`: "Memilih material Mata Entres dari Kebun Kayu Okulasi dan memindai QR fisik."
  - `input`: "QR Code Kebun Kayu Okulasi."

#### 6. RN-REG-006
- **Jenis Entitas**: Requirement
- **Status Saat Ini**: Confirmed
- **Jenis Konflik**: Business Logic
- **Teks Saat Ini**: Validation: "Nilai aktual <= saldo stok Plot Entres + Clone."
- **Rekomendasi**: **REVISE**
- **Target Field Mutation**: `validation`
- **Usulan Nilai Baru**: 
  - `validation`: "Kuantitas aktual > 0. Estimasi bertindak sebagai referensi."

#### 7. Flow Nodes: RG_05 & RG_06
- **Jenis Entitas**: Flow Node
- **Status Saat Ini**: Active
- **Jenis Konflik**: Terminology & Business Logic (turunan dari RN-REG-005 & 006)
- **Rekomendasi**: **REVISE**
- **Target Field Mutation**: `title`, `input`, `validation`
- **Usulan Nilai Baru**: Menyelaraskan Title, Input, dan Validation persis sesuai dengan usulan mutasi pada RN-REG-005 dan RN-REG-006 di atas.

---

### B. Confirmation List (Membutuhkan Arahan Bisnis)

Entitas berikut memiliki fungsi utama memotong stok/populasi. Baseline melarang keras otomatisasi pemotongan stok pada proses ini.

#### 1. RN-OKL-007
- **Teks Saat Ini**: Title: "Mata entres aktual menjadi pengurang stok setelah verifikasi.", Output: "Stok mata entres terpotong"
- **Konflik**: Business Logic. 
- **Rekomendasi**: **KONFIRMASI**. Apakah requirement ini harus dihapus/diarsipkan, atau diubah narasinya menjadi sekadar pencatatan histori penggunaan material tanpa implikasi stok?

#### 2. RN-REG-010 & Node RG_10
- **Teks Saat Ini**: "Pemotongan stok resmi mata entres pada Plot Entres + Clone."
- **Konflik**: Business Logic.
- **Rekomendasi**: **KONFIRMASI**. Alasan sama dengan RN-OKL-007.

---

### C. Khusus: RN-OKL-014
- **Status Saat Ini**: REVISI (Sudah dilabeli secara eksplisit berdasarkan temuan terdahulu).
- **Jenis Konflik**: Business Logic ekstrim (Ekspansi Scope).
- **Teks Saat Ini**: Title: "Pengurangan stok mata entres terverifikasi pada Plot Entres + Clone.", Output: "Saldo stok terpotong, tercatat dalam ledger material."
- **Analisis Field**:
  - `title`, `requirement`, dan `output` berasumsi bahwa M04 mengelola tata buku (*ledger*) stok material ("Saldo stok terpotong, tercatat dalam ledger material"). Ini melanggar aturan mutlak: "jangan memperluas scope M04 dengan aturan Kebun Kayu Okulasi".
- **Rekomendasi**: Karena statusnya sudah REVISI, kami mengusulkan **REVISE** dengan memutar narasinya dari "pengurangan stok di ledger" menjadi "Perekaman riwayat penggunaan material" murni tanpa ada sentuhan/operasi pada saldo stok. 
- Namun hal ini berkaitan dengan RN-OKL-007, sehingga **belum dapat ditentukan** parameter mutasi spesifiknya sebelum mendapat kepastian dari bisnis mengenai nasib *rule* pemotongan stok secara umum.

---

### D. No-Change List (Confirmation Only)
- **RN-OKL-004** = KONFIRMASI (Tidak menjadi target mutasi otomatis).
- **RN-OKL-009** = KONFIRMASI (Tidak menjadi target mutasi otomatis).

---

## 5. Proposed Before/After
*(Rincian usulan telah dirangkum di Bagian 4.A di atas).*

## 6. Dependency Impact
- Mengubah atribut text pada `RN-OKL-005` dkk dan relasi *node* mereka (`RG_05` dkk) **tidak memutus rantai keterhubungan ID** di dalam RTM (*Requirements Traceability Matrix*). 
- Tidak ada edge yang terputus, tidak ada urutan fitur yang berubah.

## 7. Rollback Boundary
Sistem akan menyimpan cadangan (`backup`) dari `js/data/process-mapping-baseline.js` dan `data/process-mapping-data.json` persis sebelum *script* Controlled Mutation dijalankan, sehingga pemulihan instan dapat dilakukan jika terjadi insiden kegagalan skrip.

## 8. Recommended Execution Order
1. Mohon Anda memvalidasi rumusan nilai pengganti (Usulan Nilai Baru) untuk kandidat REVISE di atas.
2. Tentukan putusan eksekusi untuk kelompok KONFIRMASI (RN-OKL-007, RN-REG-010) dan RN-OKL-014.
3. Setelah disetujui, saya akan merancang skrip *Controlled Mutation* yang mencakup seluruh poin keputusan.

## 9. Final Recommendation
Diharapkan Anda **memeriksa bagian 4.B dan 4.C terlebih dahulu** dan memberikan keputusan bisnis definitif, mengingat penyelesaian 11 entitas tersebut tidak bisa berdiri sendiri tanpa penyelesaian pada bagian pemotongan stok.
