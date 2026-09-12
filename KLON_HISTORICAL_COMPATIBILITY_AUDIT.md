# KLON HISTORICAL COMPATIBILITY AUDIT — SIGMA RUBBER NURSERY

**Phase:** Phase 9J — Audit Konsistensi Data Klon Lintas Modul Transaksi  
**Status:** AUDIT ONLY (READ-ONLY)  
**Date:** 2026-09-12  

Dokumen ini memvalidasi dampak data Klon terhadap seluruh transaksi historis yang tersimpan pada `localStorage` dan `IndexedDB`.

---

## 1. Status Penyimpanan Snapshot Historis

| Store Transaksi | Field Klon yang Tersimpan | Ketergantungan ke Master Klon Saat Dibaca | Status Kompatibilitas Historis | Rekomendasi Perlindungan |
|:---|:---|:---:|:---:|:---|
| `receipt_transactions` | `klon`, `tableRows[].klon` | **TIDAK** (membaca string snapshot) | `HISTORICAL_SNAPSHOT_SAFE` | Jangan migrasi atau ubah string transaksi historis. |
| `seeding_transactions` | `klonAwal`, `tableRows[].klon` | **TIDAK** (membaca string snapshot) | `HISTORICAL_SNAPSHOT_SAFE` | Pertahankan fallback `'GT-01'`. |
| `budding_transactions` | `klonRootstock`, `klonEntres`, `klonAwal` | **TIDAK** (membaca string snapshot) | `HISTORICAL_SNAPSHOT_SAFE` | Pertahankan parsing string pada agregasi riwayat. |
| `inspection_transactions`| `klonEntres`, `klonRootstock` | **TIDAK** (membaca string snapshot) | `HISTORICAL_SNAPSHOT_SAFE` | Pertahankan integritas pool generator. |
| `selection_transactions` | `klon`, `selectionPoolDocNo` | **TIDAK** (membaca string snapshot) | `HISTORICAL_SNAPSHOT_SAFE` | Pertahankan fallback `'PB 260'`. |
| `topping_transactions` | `namaKlon`, `kodePlot` | **TIDAK** (membaca string snapshot) | `HISTORICAL_SNAPSHOT_SAFE` | Pertahankan field `namaKlon`. |
| `menunas_transactions` | `namaKlon`, `kodePlot` | **TIDAK** (membaca string snapshot) | `HISTORICAL_SNAPSHOT_SAFE` | Pertahankan field `namaKlon`. |
| `request_transactions` | `klon` | **TIDAK** (membaca string snapshot) | `HISTORICAL_SNAPSHOT_SAFE` | Pertahankan string pesanan SPB. |
| `regraft_pool` (runtime)| `klonAwal`, `klonRootstock` | **TIDAK** (in-memory/storage snapshot) | `HISTORICAL_SNAPSHOT_SAFE` | Pertahankan struktur pool regrafting. |
| `selection_pool` (runtime)| `klon`, `originType` | **TIDAK** (in-memory/storage snapshot) | `HISTORICAL_SNAPSHOT_SAFE` | Pertahankan struktur pool penyeleksian. |

---

## 2. Prinsip Perlindungan Transaksi Historis

1. **NO RUNTIME DESTRUCTION**: Transaksi lama yang menyimpan `'PB260'`, `'PB-260'`, atau `'PB 260'` tidak boleh di-update secara paksa melalui database backfill.
2. **SNAPSHOT-BASED RENDERING**: Komponen UI riwayat (`nursery-history.js`, `review-workspace.js`, `transaction-manager.js`) membaca field string langsung (`tx.klon`, `tx.klonEntres`, `tx.namaKlon`) tanpa melakukan lookup join ke master. Perilaku ini melindungi aplikasi dari missing records jika master data di masa depan diperbarui.
3. **SAFE POOL MATCHING**: Logika pool matching pada penyeleksian (`selection-landing.js`) dan regrafting (`budding-regrafting.js`) menggunakan string equality yang kompatibel dengan data yang di-generate.
