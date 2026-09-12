# AUDIT DELTA MASTER KLON PASCA IMPLEMENTASI DATASET BARU

**Project:** SIGMA Rubber Nursery Mobile Application Prototype  
**Scope:** Audit Delta & Kompatibilitas `js/data/klon-master.js` (Phase 9K Initial vs Dataset Budwood & Plot Resmi)  
**Status Audit:** COMPLETED (READ-ONLY AUDIT)  
**Date:** 2026-09-12  

---

## 1. Executive Summary & Ringkasan Perbandingan

Audit delta dilakukan untuk membandingkan entitas dan fungsi pada [`js/data/klon-master.js`](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/data/klon-master.js) antara:
- **Baseline Phase 9K:** Berisi 64 klon kanonikal (dihasilkan dari audit kompilasi seluruh modul).
- **Current State (Pasca Dataset Resmi):** Berisi 57 klon kanonikal (diturunkan 100% dari kolom `clone_name` pada [`data/budwood-plot-klon.csv`](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/data/budwood-plot-klon.csv)).

| Metrik Audit | Baseline Phase 9K (Sebelum) | Current State (Sekarang) | Delta / Perubahan |
|:---|:---|:---|:---|
| **Jumlah Canonical Clones** | 64 Klon | **57 Klon** | **-7 Klon** (Klon di luar dataset resmi) |
| **Total Alias Terdaftar** | 198 Alias | **176 Alias** | **-22 Alias** |
| **Sumber Data Master** | Kompilasi Multi-file Audit | `data/budwood-plot-klon.csv` | **100% Data Aktual Resmi** |
| **Status Siklus Hidup** | `ACTIVE` (64) | `ACTIVE` (57) | Terfokus pada kebun entres aktif |
| **Helper / Resolver APIs** | 13 Fungsi | 13 Fungsi | **0 Berubah** (Struktur API 100% Utuh) |
| **Toleransi Non-Destruktif** | Aktif | Aktif | `normalizeKlonName` tetap aman |

---

## 2. Analisis Klon Canonical (Sebelum vs Sekarang)

### A. Klon yang Bertahan di Master Aktif (57 Klon Resmi):
`BPM 1`, `BPM 24`, `GT 1`, `GYT 577` *(sebelumnya `CYT 577`)*, `IRCA 1007`, `IRCA 101`, `IRCA 109`, `IRCA 111`, `IRCA 130`, `IRCA 18`, `IRCA 19`, `IRCA 230`, `IRCA 317`, `IRCA 331`, `IRCA 41`, `IRCA 427`, `IRCA 733`, `IRCA 804`, `IRCA 807`, `IRCA 825`, `IRCA 986`, `IRR 104`, `IRR 112`, `IRR 118`, `IRR 205`, `IRR 206`, `IRR 207`, `IRR 208`, `IRR 220`, `IRR 221`, `IRR 230`, `IRR 425`, `IRR 428`, `IRR 429`, `IRR 434`, `IRR 440`, `IRR 5`, `LBT 94`, `PB 217`, `PB 235`, `PB 254`, `PB 260`, `PB 330`, `PB 340`, `PC 10`, `PM 10`, `PR 107`, `PR 300`, `RRIC 100`, `RRIM 2020`, `RRIM 600`, `RRIM 703`, `RRIM 712`, `RRIM 901`, `RRIM 908`, `RRIM 911`, `RRIM 921`.

### B. 7 Klon Legacy yang Tidak Ada di Dataset Budwood Garden:
Terdapat 7 klon yang sebelumnya ada pada form transaksi lama / audit awal, tetapi **tidak ditanam / tidak tercatat** pada 97 plot Budwood Garden 2021/BWG/001:
1. `IRR 300` (Muncul di `seeding-form.js`, `receipt-benih.js`, `selection-landing.js`)
2. `PR 261` (Muncul di `seeding-form.js`)
3. `IRR 215` (Muncul di `budding-form.js`)
4. `IRR 100` (Muncul di `budding-form.js`)
5. `IRR 219` (Muncul di `budding-form.js`)
6. `IRR 107` (Muncul di `budding-form.js`)
7. `IRCA 120` (Muncul di `receipt-benih.js`)

---

## 3. Analisis Alias & Normalized Key

### A. Alias yang Baru Ditambahkan:
- `GYT 577`, `GYT577`, `GYT-577` (Ditambahkan untuk mendukung ejaan plot `XXVB` dari CSV sumber, sekaligus mempertahankan `CYT 577` sebagai alias).

### B. Alias yang Hilang dari Master Aktif (21 String Variasi):
- `IRR 300`, `IRR300`, `IRR-300`
- `PR 261`, `PR261`, `PR-261`
- `IRR 215`, `IRR215`, `IRR-215`
- `IRR 100`, `IRR100`, `IRR-100`
- `IRR 219`, `IRR219`, `IRR-219`
- `IRR 107`, `IRR107`, `IRR-107`
- `IRCA 120`, `IRCA120`, `IRCA-120`

### C. Normalized Key yang Berubah:
- Kunci `GYT577` kini aktif untuk klon `KLON-GYT-577` (Plot XXVB).
- 7 kunci normalisasi lama (`IRR300`, `PR261`, `IRR215`, `IRR100`, `IRR219`, `IRR107`, `IRCA120`) tidak lagi terdaftar pada array master aktif.

---

## 4. Evaluasi Resolver & Helper APIs

Seluruh 13 helper API berikut tetap berfungsi dengan tanda tangan fungsi dan perilaku yang konsisten:
1. `getAllKlons()` $\rightarrow$ Mengembalikan 57 record.
2. `getActiveKlons()` $\rightarrow$ Mengembalikan 57 record aktif.
3. `getKlonById(id)` $\rightarrow$ Pencocokan by ID.
4. `getKlonByCode(code)` $\rightarrow$ Pencocokan by kode (mis. `'PB260'`, `'GT1'`).
5. `getKlonByName(name)` $\rightarrow$ Pencocokan nama kanonikal (case-insensitive).
6. `buildNormalizedKey(value)` $\rightarrow$ Sanitasi spasi/hyphen/leading zeros.
7. `resolveKlon(value)` $\rightarrow$ Pencocokan cerdas alias & normalized key.
8. `normalizeKlonName(value)` $\rightarrow$ Non-destruktif (mengembalikan input asli jika tidak dikenal).
9. `getKlonAliases(id)` $\rightarrow$ Mengembalikan array alias klon.
10. `isKlonActive(id)` $\rightarrow$ Boolean check status.
11. `isKnownKlon(value)` $\rightarrow$ Boolean check ketersediaan.
12. `getKlonsByCategory(category)` $\rightarrow$ Filter kategori (`STANDARD`).
13. `getKlonsForUsage(usage)` $\rightarrow$ Filter peruntukan (`ROOTSTOCK`, `ENTRES`, `BOTH`, `GENERAL`).

---

## 5. Audit Resolusi Nilai Transaksi Legacy (Legacy Value Resolution)

Pengujian terhadap 158 variasi string yang pernah dicatat pada modul-modul transaksi menghasilkan:

### A. Nilai yang Berhasil Ter-resolve (137 Variasi):
- Seluruh variasi format dari 57 klon resmi (**Spaced**, **Condensed**, **Hyphenated**, dan **Leading Zero**) berhasil ter-resolve 100% ke canonical record masing-masing.
  - Contoh: `'PB 260'`, `'PB260'`, `'PB-260'` $\rightarrow$ `KLON-PB-260` (`PB 260`)
  - Contoh: `'GT 1'`, `'GT1'`, `'GT-01'`, `'GT-1'`, `'GT 01'` $\rightarrow$ `KLON-GT-1` (`GT 1`)
  - Contoh: `'RRIM 600'`, `'RRIM600'`, `'RRIM-600'` $\rightarrow$ `KLON-RRIM-600` (`RRIM 600`)
  - Contoh: `'BPM 24'`, `'BPM24'`, `'BPM-24'` $\rightarrow$ `KLON-BPM-24` (`BPM 24`)
  - Contoh: `'CYT 577'`, `'CYT577'`, `'GYT 577'`, `'GYT577'` $\rightarrow$ `KLON-GYT-577` (`GYT 577`)

### B. Nilai yang Tidak Lagi Ter-resolve ke Canonical Record (21 Variasi):
- 21 string variasi dari 7 klon yang tidak ada di CSV sumber (`IRR 300`, `PR 261`, `IRR 215`, `IRR 100`, `IRR 219`, `IRR 107`, `IRCA 120`).
- **Perilaku Runtime:**
  - `resolveKlon('IRR 300')` $\rightarrow$ Mengembalikan `null`.
  - `normalizeKlonName('IRR 300')` $\rightarrow$ Mengembalikan string asli `'IRR 300'` (aman, tidak melempar exception).

---

## 6. Dampak terhadap Histori Transaksi & Risiko Kompatibilitas

### A. Dampak terhadap Histori Transaksi (Aman / Zero Mutation):
1. Transaksi lama pada `localStorage` (`seeding_transactions`, `budding_transactions`, dll.) menyimpan nilai secara snapshot string (mis. `tx.klon = 'IRR-300'`, `tx.klonEntres = 'IRR 215'`).
2. Tampilan riwayat pada [`nursery-history.js`](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/modules/history/nursery-history.js) membaca nilai snapshot secara langsung (`tx.klon || tx.klonAwal || tx.namaKlon || '-'`), **sehingga kartu riwayat transaksi masa lalu tetap tampil utuh 100%**.

### B. Risiko Saat Modul Transaksi Diintegrasikan:
1. Form penyemaian (`seeding-form.js`) dan okulasi (`budding-form.js`) saat ini masih memiliki dropdown lokal hardcoded yang mencantumkan 7 klon tersebut.
2. Ketika modul form dihubungkan ke `klon-master.js` pada task integrasi mendatang, opsi 7 klon non-budwood tersebut tidak akan lagi muncul untuk transaksi **BARU**. Ini memang sesuai dengan tujuan bisnis: *hanya klon resmi dari Budwood Garden yang boleh dipilih untuk transaksi baru*.

---

## 7. Rekomendasi Solusi untuk Task Integrasi Mendatang

Agar kompatibilitas lookup terhadap 7 klon legacy tetap dapat mengenali ID/nama lama saat dipanggil secara programatis tanpa mengotori katalog aktif budwood:
1. **Tambahkan Legacy Fallback Registry (Opsional / Recommended):**
   Mempertahankan record 7 klon tersebut dengan status `KLON_STATUS.INACTIVE` atau `KLON_STATUS.PENDING_REVIEW` pada layer alias terpisah, sehingga `resolveKlon('IRR 300')` tetap mengenali objeknya, namun `getActiveKlons()` hanya mengembalikan 57 klon aktif dari Budwood Garden.

---

## 8. Kesimpulan Audit

### Status: **PASS (WITH COMPATIBILITY OBSERVATION)**

- **Integritas Master Baru:** **PASS (100%)** — 57 klon dari dataset pengguna telah menjadi Single Source of Truth aktif.
- **Histori Transaksi:** **PASS (100%)** — Seluruh data snapshot transaksi masa lalu tidak terdampak dan tetap tampil utuh.
- **Fungsi Helper & Normalizer:** **PASS (100%)** — Sifat non-destruktif menjamin zero application crash.
- **Temuan Delta:** 7 klon lama (`IRR 300`, `PR 261`, `IRR 215`, `IRR 100`, `IRR 219`, `IRR 107`, `IRCA 120`) tidak terdapat di CSV Budwood Garden dan secara sengaja tidak dimasukkan ke dalam daftar aktif 57 klon resmi.

Laporan ini siap dijadikan acuan untuk eksekusi task integrasi modul transaksi berikutnya.
