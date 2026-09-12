# KLON MASTER DEPENDENCY MATRIX — SIGMA RUBBER NURSERY

**Phase:** Phase 9J — Audit Konsistensi Data Klon Lintas Modul Transaksi  
**Status:** AUDIT ONLY (READ-ONLY)  
**Date:** 2026-09-12  

Matriks ini memetakan seluruh modul, file, field, sumber data, tipe data, dan perlakuan data Klon di seluruh aplikasi SIGMA Rubber Nursery.

---

## Matriks Dependensi Modul

| No | Modul | Route / Konteks | File Source | Nama Field | Sumber Data | Struktur Data | Snapshot? | Validasi | Klasifikasi Risiko |
|:---|:---|:---|:---|:---|:---|:---|:---:|:---|:---|
| 1 | **Penerimaan (SIR Search)** | `/reception/benih/sir` | `js/modules/receipt/receipt-sir.js` | `selectedKlon` (`title`, `sub`, `id`) | Local Array `klonNames` (57 klon condensed) | Object `{ id, title, sub }` | Ya (disimpan ke `storage.selected_klon`) | Seleksi wajib | `FORMAT_INCONSISTENCY` (Condensed format tanpa spasi) |
| 2 | **Penerimaan (Benih Form)** | `/reception/benih` | `js/modules/receipt/receipt-benih.js` | `tableRows[].klon`, `klon` | Hardcoded HTML `<select>` (4 klon) & UI state | String | Ya (disimpan ke `receipt_transactions`) | Required jika input manual | `DUPLICATE_SOURCE` (Hardcoded 4 klon berbeda dari SIR) |
| 3 | **Penerimaan (Landing / List)** | `/reception` | `js/modules/receipt/receipt-landing.js` | `klon` | `receipt_transactions` storage | String | Ya | Fallback `'GT1'` | `SAFE_TO_FIX_LATER` |
| 4 | **Penyemaian (Seeding Form)** | `/seeding/form` | `js/modules/seeding/seeding-form.js` | `klonAwal`, `tableRows[].klon` | Local Array `klonList` (8 klon hyphenated) | String & Array of Row Objects | Ya (disimpan ke `seeding_transactions`) | Required per baris | `FORMAT_INCONSISTENCY` (Format tanda hubung e.g. `GT-01`, `PB-260`) |
| 5 | **Penyemaian (Scan / Summary)** | `/seeding/scan`, `/seeding` | `js/modules/seeding/seeding-scan.js` | `klon`, `klonAwal` | `receipt_transactions` / state | String | Ya | Fallback `'GT-01'` | `SAFE_TO_FIX_LATER` |
| 6 | **Okulasi (Grafting Form)** | `/budding/grafting/form` | `js/modules/budding/budding-form.js` | `klonEntres`, `klonRootstock` | Local Array `KLON_ENTRES_LIST` (19 klon spaced) & batch context | String | Ya (disimpan ke `budding_transactions`) | Required (modal search sheet) | `FORMAT_INCONSISTENCY` (Spaced format e.g. `PB 260`) |
| 7 | **Okulasi Janda (Regrafting)** | `/budding/regrafting` | `js/modules/budding/budding-regrafting.js` | `klonAwal` (gagal), `klonRootstock`, `klonEntres` | `regraft_pool` (dari inspection) & form | String | Ya (disimpan ke `budding_transactions`) | Required | `SAFE_TO_FIX_LATER` |
| 8 | **Pemeriksaan (Inspection Form)** | `/inspection/form` | `js/modules/inspection/inspection-form.js` | `klonEntres`, `klonRootstock` | Inherited dari `selectedBudding` | String | Ya (disimpan ke `inspection_transactions`, `selection_pool`, `regraft_pool`) | Read-only context | `SAFE_TO_FIX_LATER` |
| 9 | **Penyeleksian (Afkir)** | `/selection` | `js/modules/selection/selection-landing.js` | `klon`, `klonRootstock`, `klonEntres` | `selection_pool` (dari receipt reject, budding, inspection) | String | Ya (disimpan ke `selection_transactions`) | Confirmation Dialog | `SAFE_TO_FIX_LATER` |
| 10 | **Kebun Entres (Topping)** | `/entres/topping/form`, `/entres/topping` | `js/modules/entres/topping-form.js`, `topping-scan.js` | `namaKlon`, `kodePlot` | Local Array `PLOT_ENTRES_DATA` (6 plot entres) | String | Ya (disimpan ke `topping_transactions`) | Selected Plot | `FORMAT_INCONSISTENCY` (Field bernama `namaKlon` bukan `klon`) |
| 11 | **Kebun Entres (Menunas)** | `/entres/menunas/form`, `/entres/menunas` | `js/modules/entres/menunas-form.js`, `menunas-scan.js` | `namaKlon`, `kodePlot` | Local Array `PLOT_ENTRES_DATA` (6 plot entres) | String | Ya (disimpan ke `menunas_transactions`) | Selected Plot | `FORMAT_INCONSISTENCY` (Field bernama `namaKlon`) |
| 12 | **Permintaan SPB Kebun Sepupu** | `/request/kebun-sepupu/form` | `js/modules/request/request-kebun-sepupu-form.js` | `klon` | `cloneRepository.list()` / IndexedDB `clones` | String | Ya (disimpan ke `request_transactions`) | Required `<select>` | `DUPLICATE_SOURCE` (Hanya berisi 3 klon dari seed) |
| 13 | **Riwayat & Laporan Stok** | `/history` | `js/modules/history/nursery-history.js` | `klon`, `klonAwal`, `klonEntres`, `klonRootstock`, `klonPopulations` | Agregasi multi-storage (`receipt`, `seeding`, `budding`, `inspection`, `selection`) | String & Array of Pop Objects | Read-Only Calculation | Filter & Calculation | `MIGRATION_RISK` (Bergantung pada parsing string klon) |
| 14 | **Transaction Manager** | `/transactions` | `js/modules/transactions/transaction-manager.js` | `klon`, `klonAwal`, `klonEntres`, `klonRootstock` | Multi-store CRUD | String | Ya | Manual edit string | `SAFE_TO_FIX_LATER` |
| 15 | **Review Workspace** | `/review` (modal review) | `js/modules/review/review-workspace.js` | `klon`, `klonAwal`, `klonEntres`, `klonRootstock` | Multi-store display & feedback | String | Ya | Display & edit input | `SAFE_TO_FIX_LATER` |

---

## Ringkasan Klasifikasi Risiko

1. **`FORMAT_INCONSISTENCY` (Tinggi)**: Terdapat 3 gaya penulisan utama (Condensed `PB260`, Hyphenated `PB-260`, Spaced `PB 260`) yang hidup bersamaan di modul berbeda.
2. **`DUPLICATE_SOURCE` (Tinggi)**: Terdapat 5 sumber data lokal terpisah yang mendefinisikan daftar klon secara independen (`receipt-sir.js`, `receipt-benih.js`, `seeding-form.js`, `budding-form.js`, `master-data.js` / IndexedDB).
3. **`MIGRATION_RISK` (Sedang)**: Agregasi pada `nursery-history.js` dan pencocokan pool mengandalkan perbandingan string klon secara langsung.
