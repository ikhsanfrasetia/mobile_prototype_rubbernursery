# ROLE ESTATE COVERAGE MATRIX (PHASE 8A)
**Project**: SIGMA Rubber Nursery Mobile Application Prototype  
**Phase**: Phase 8A — Role → Menu → Submenu → Feature → Action Mapping  
**Principle**: *"MAP FIRST, INTEGRATE LATER."*  
**Date**: 2026-09-12  
**Status**: COMPLETE (Definitive Baseline)

---

## Role × Estate Coverage Matrix

Mapping menu bersifat **reusable antar estate**. Estate ditentukan secara dinamis melalui user context sesi aktif (`userContext.estateId`), bukan melalui duplikasi definisi menu.

| No | Canonical Role | Tanah Besih (`EST-TBS`) | Aek Pamingke (`EST-APM`) | Default Scope | Persona Aktif TBS | Persona Aktif APM | Notes |
|:---:|:---|:---:|:---:|:---:|:---|:---|:---|
| 1 | `PENGURUS` | `AVAILABLE` | `AVAILABLE` | `ESTATE` | Junaidi (`PGS001`) | Mukhsin Haji (`PGS002`) | Beroperasi penuh di kedua unit kebun untuk otorisasi SPB, penerimaan, dispatch, dan review. |
| 2 | `ASKEP` | `AVAILABLE` | `AVAILABLE` | `ESTATE` | Beny Sihotang (`ASK001`) | Dadin (`ASK002`) | Pengawasan operasional estate, monitoring permintaan bibit, dan review verifikasi. |
| 3 | `ASISTEN` | `AVAILABLE` | `AVAILABLE` | `DIVISION` | Rahmad (`AST002`) | Nando (`AST001`) | Verifikasi inspeksi lapangan dan review transaksi afdeling/divisi. |
| 4 | `ASISTEN_BIBITAN` | `AVAILABLE` | `AVAILABLE` | `DIVISION` | Annisa (`ASB001`) | Abdul Gofur (`ASB002`) | Pengawasan teknis penuh operasional pembibitan (penyemaian, okulasi, seleksi). |
| 5 | `MANTRI_TANAMAN` | `AVAILABLE` | `AVAILABLE` | `DIVISION` | Wagiman (`MNT001`) | Supriono (`MNT002`) | Pelaksana transaksi harian pembibitan (presensi, okulasi, entres, pemeliharaan). |
| 6 | `TEKNIKER_I` | `AVAILABLE` | `AVAILABLE` | `ESTATE` | Marihot (`TKI001`) | Dedek (`TKI002`) | Monitoring teknis fasilitas pembibitan dan audit log riwayat data. |
| 7 | `KTU` | `AVAILABLE` | `AVAILABLE` | `ESTATE` | Kusnadi (`KTU001`) | Dedi Sugiarto (`KTU002`) | Tata usaha, administrasi berkas dispatch pengiriman, dan review log transaksi. |

---

## Ringkasan Cakupan Estate
- **Tanah Besih (`EST-TBS`)**: 7/7 Canonical Roles `AVAILABLE` (100% Persona Coverage).
- **Aek Pamingke (`EST-APM`)**: 7/7 Canonical Roles `AVAILABLE` (100% Persona Coverage).
- **Multi-Estate Independence**: Seluruh key menu, submenu, dan feature **bebas dari hardcoded estate ID**, menjamin portabilitas arsitektur untuk penambahan unit kebun di masa depan.

---
**END OF ESTATE COVERAGE MATRIX**
