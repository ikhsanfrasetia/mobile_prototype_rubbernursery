# ROLE MENU & FEATURE GAP ANALYSIS (PHASE 8A)
**Project**: SIGMA Rubber Nursery Mobile Application Prototype  
**Phase**: Phase 8A — Role → Menu → Submenu → Feature → Action Mapping  
**Principle**: *"MAP FIRST, INTEGRATE LATER."*  
**Date**: 2026-09-12  
**Status**: COMPLETE (Detailed Gap Analysis)

---

## 1. Executive Summary Gap Analysis

Audit baseline mapping Phase 8A memvalidasi keterhubungan seluruh modul terhadap kebutuhan operasional nyata. Analisis ini mendokumentasikan temuan gap arsitektural, implementasi, kapabilitas, dan pelacakan identitas aktor tanpa melakukan modifikasi langsung pada kode sumber.

---

## 2. Identified Gap Inventory

### GAP 1: Alokasi Kode Kegiatan Bibitan (CFNA) pada Modul Pemeliharaan
- **Role**: `MANTRI_TANAMAN`, `ASISTEN_BIBITAN`
- **Menu**: `KEGIATAN_BIBITAN` (`MENU-KEGIATAN-BIBITAN`)
- **Feature**: `KEGIATAN_MAINTENANCE_LOG` / `ALOKASI_KEGIATAN_BIBITAN`
- **Type**: `REQUIREMENT_GAP` / `FEATURE_GAP`
- **Evidence**: Di codebase saat ini (`js/modules/maintenance/nursery-activity.js`), pencatatan aktivitas pemeliharaan sudah berjalan (`EXISTING`), namun penandaan kode alokasi akun biaya standar CFNA *(Cost Field Nursery Allocation)* belum tersemat sebagai dropdown master terpisah di form input.
- **Risk**: `LOW` — Transaksi pemeliharaan tetap tersimpan dan terlacak dengan aman di IndexedDB, namun pengelompokan biaya agronomi belum terautomatisasi penuh.
- **Recommendation**: Jadwalkan penambahan sub-fitur `ALOKASI_KEGIATAN_BIBITAN` berstatus `PLANNED` pada Phase 9 dengan mengambil referensi master DAK CFNA.

---

### GAP 2: Form Input Edit Draft Transaksi Permintaan Bibit (SPB)
- **Role**: `PENGURUS`, `ASKEP`
- **Menu**: `PERMINTAAN` (`MENU-PERMINTAAN`)
- **Feature**: `PERMINTAAN_BIBIT_EDIT_DRAFT`
- **Type**: `IMPLEMENTATION_GAP`
- **Evidence**: Modul `request-kebun-sepupu-form.js` telah mendukung pembuatan baru (`CREATE`) dan pengajuan (`SUBMIT`), serta approval di review workspace (`APPROVE`). Namun fitur ubah draft SPB sebelum disubmit saat ini masih dilakukan melalui modal konfirmasi in-memory.
- **Risk**: `LOW` — Pengguna dapat membatalkan dan mengisi ulang form sebelum submit final.
- **Recommendation**: Definisikan fitur `PERMINTAAN_BIBIT_EDIT` sebagai `PLANNED` untuk disempurnakan pada fase penyempurnaan transaksi permintaan.

---

### GAP 3: Modul Form Input Khusus Tekniker I (Workshop & Engineering)
- **Role**: `TEKNIKER_I`
- **Menu**: `RIWAYAT_DATA` / `PEMELIHARAAN_TEKNIS`
- **Feature**: `TEKNIKAL_MAINTENANCE_LOG`
- **Type**: `MENU_GAP` / `FEATURE_GAP`
- **Evidence**: Di prototype saat ini, role `TEKNIKER_I` memiliki akses monitoring proses dan riwayat data log transaksi kebun (`RIWAYAT_DATA`). Form input teknis khusus workshop/mesin siram belum memiliki modul fisik di `js/modules/`.
- **Risk**: `VERY LOW` — Sesuai baseline spesifikasi, Tekniker I berperan utama dalam monitoring teknis kesiapan bibitan.
- **Recommendation**: Pertahankan status saat ini sebagai `EXISTING` untuk monitoring riwayat, dan jadwalkan form teknikal mandiri sebagai `PLANNED`.

---

### GAP 4: Otorisasi Keuangan / BA Administrasi KTU
- **Role**: `KTU`
- **Menu**: `REVIEW_WORKSPACE`, `PENGIRIMAN`
- **Feature**: `BERITA_ACARA_ADMIN_VIEW`
- **Type**: `FEATURE_GAP`
- **Evidence**: KTU saat ini terhubung ke approval berkas surat pengantar dispatch (`PENGIRIMAN_BIBIT_DISPATCH`) dan review workspace. Berita Acara pemusnahan bibit afkir di tingkat KTU belum memiliki modul terpisah.
- **Risk**: `LOW` — Dokumen afkir tetap tercatat di modul penyeleksian bibit.
- **Recommendation**: Catat sebagai `PLANNED` requirement untuk modul tata usaha lanjutan.

---

### GAP 5: Action Granularity pada Modul Riwayat Data
- **Role**: *Semua 7 Canonical Role*
- **Menu**: `RIWAYAT_DATA`
- **Feature**: `RIWAYAT_TRANSAKSI_VIEW`
- **Type**: `ACTION_GAP`
- **Evidence**: Aksi pada `RIWAYAT_DATA` mencakup `VIEW` dan `EXPORT`. Aksi `PRINT` dokumen fisik masih mengandalkan native browser print dialog tanpa custom template PDF terpisah.
- **Risk**: `ZERO` — Seluruh data transaksi tetap dapat dilihat dan diunduh.
- **Recommendation**: Daftarkan aksi `PRINT` sebagai future enhancement pada fase reporting.

---

## 3. Matriks Rekapitulasi Gap

| Kategori Gap | Jumlah Temuan | Level Dampak | Rekomendasi Fase Implementasi |
|:---|:---:|:---:|:---|
| `MENU_GAP` | 1 | Low | Phase 9+ (Future UI Expansion) |
| `SUBMENU_GAP` | 0 | None | Sesuai Hierarki |
| `FEATURE_GAP` | 3 | Low | Phase 9 (Planned Roadmap) |
| `ACTION_GAP` | 1 | Very Low | Reporting Polish |
| `CAPABILITY_GAP` | 0 | None | 100% Selaras dengan `ROLE_PROFILES` |
| `SCOPE_GAP` | 0 | None | 100% Selaras (`ESTATE` vs `DIVISION`) |
| `IMPLEMENTATION_GAP` | 1 | Low | Refinement Transaksi Permintaan |
| `REQUIREMENT_GAP` | 1 | Low | CFNA Master Data Integration |
| `TRACEABILITY_GAP` | 0 | None | 100% Selesai di Phase 8B |

---
**END OF GAP ANALYSIS**
