# ROLE MENU FEATURE MATRIX (PHASE 8A)
**Project**: SIGMA Rubber Nursery Mobile Application Prototype  
**Phase**: Phase 8A — Role → Menu → Submenu → Feature → Action Mapping  
**Principle**: *"MAP FIRST, INTEGRATE LATER."*  
**Date**: 2026-09-12  
**Status**: COMPLETE (Definitive Baseline)

---

## Master Role → Menu → Submenu → Feature → Action Mapping Table

| No | Canonical Role | Menu Key | Submenu Key | Feature Key | Actions | Scope | Transactional | Actor Required | Status | Source |
|:---:|:---|:---|:---|:---|:---|:---:|:---:|:---:|:---:|:---|
| 1 | `PENGURUS` | `PENERIMAAN` | `PENERIMAAN_BIBIT_ESTATE` | `PENERIMAAN_BIBIT_APPROVAL` | `VIEW`, `REVIEW`, `APPROVE` | `ESTATE` | `true` | `true` | `EXISTING` | `EXISTING_CODE` (`js/modules/review/review-workspace.js`) |
| 2 | `PENGURUS` | `PERMINTAAN` | `PERMINTAAN_BIBIT_ESTATE` | `PERMINTAAN_BIBIT_LIST` | `VIEW`, `MONITOR` | `ESTATE` | `false` | `false` | `EXISTING` | `EXISTING_CODE` (`js/modules/request/request-landing.js`) |
| 3 | `PENGURUS` | `PERMINTAAN` | `PERMINTAAN_BIBIT_ESTATE` | `PERMINTAAN_BIBIT_APPROVAL` | `VIEW`, `REVIEW`, `APPROVE` | `ESTATE` | `true` | `true` | `EXISTING` | `EXISTING_CODE` (`js/modules/request/request-kebun-sepupu-form.js`) |
| 4 | `PENGURUS` | `PENGIRIMAN` | `PENGIRIMAN_BIBIT_ESTATE` | `PENGIRIMAN_BIBIT_DISPATCH` | `VIEW`, `REVIEW`, `APPROVE` | `ESTATE` | `true` | `true` | `EXISTING` | `EXISTING_CODE` (`js/modules/transactions/transaction-manager.js`) |
| 5 | `PENGURUS` | `REVIEW_WORKSPACE` | `REVIEW_VERIFIKASI` | `REVIEW_TRANSAKSI_WORKSPACE` | `VIEW`, `REVIEW`, `APPROVE`, `VERIFY` | `ESTATE` | `true` | `true` | `EXISTING` | `EXISTING_CODE` (`js/modules/review/review-workspace.js`) |
| 6 | `PENGURUS` | `RIWAYAT_DATA` | `RIWAYAT_LOGS` | `RIWAYAT_TRANSAKSI_VIEW` | `VIEW`, `EXPORT` | `ESTATE` | `false` | `false` | `EXISTING` | `EXISTING_CODE` (`js/modules/transactions/transaction-manager.js`) |
| 7 | `MANTRI_TANAMAN` | `PRESENSI` | `PRESENSI_SUPERVISOR` | `PRESENSI_SUPERVISOR_SUBMIT` | `VIEW`, `CREATE`, `SUBMIT` | `DIVISION` | `true` | `true` | `EXISTING` | `EXISTING_CODE` (`js/modules/attendance/attendance-supervisor-result.js`) |
| 8 | `MANTRI_TANAMAN` | `PRESENSI` | `PRESENSI_PEKERJA` | `PRESENSI_WORKERS_LOG` | `VIEW`, `CREATE`, `SUBMIT` | `DIVISION` | `true` | `true` | `EXISTING` | `EXISTING_CODE` (`js/modules/attendance/attendance-workers.js`) |
| 9 | `MANTRI_TANAMAN` | `PRESENSI` | `PRESENSI_RINGKASAN` | `PRESENSI_SUMMARY_VIEW` | `VIEW`, `MONITOR` | `DIVISION` | `false` | `false` | `EXISTING` | `EXISTING_CODE` (`js/modules/attendance/attendance-summary.js`) |
| 10 | `MANTRI_TANAMAN` | `PENERIMAAN` | `PENERIMAAN_BENIH` | `PENERIMAAN_BENIH_ENTRY` | `VIEW`, `CREATE`, `SUBMIT` | `DIVISION` | `true` | `true` | `EXISTING` | `EXISTING_CODE` (`js/modules/transactions/transaction-manager.js`) |
| 11 | `MANTRI_TANAMAN` | `PENYEMAIAN` | `PENYEMAIAN_INPUT` | `PENYEMAIAN_FORM_ENTRY` | `VIEW`, `CREATE`, `SUBMIT` | `DIVISION` | `true` | `true` | `EXISTING` | `EXISTING_CODE` (`js/modules/seeding/seeding-form.js`) |
| 12 | `MANTRI_TANAMAN` | `OKULASI` | `OKULASI_GRAFTING` | `OKULASI_GRAFTING_ENTRY` | `VIEW`, `CREATE`, `SUBMIT` | `DIVISION` | `true` | `true` | `EXISTING` | `EXISTING_CODE` (`js/modules/budding/budding-form.js`) |
| 13 | `MANTRI_TANAMAN` | `OKULASI` | `OKULASI_REGRAFTING` | `OKULASI_REGRAFTING_ENTRY` | `VIEW`, `CREATE`, `SUBMIT` | `DIVISION` | `true` | `true` | `EXISTING` | `EXISTING_CODE` (`js/modules/transactions/transaction-manager.js`) |
| 14 | `MANTRI_TANAMAN` | `PEMERIKSAAN` | `PEMERIKSAAN_LAPANGAN` | `PEMERIKSAAN_LAPANGAN_ENTRY` | `VIEW`, `CREATE`, `SUBMIT`, `VERIFY` | `DIVISION` | `true` | `true` | `EXISTING` | `EXISTING_CODE` (`js/modules/transactions/transaction-manager.js`) |
| 15 | `MANTRI_TANAMAN` | `PENYELEKSIAN` | `PENYELEKSIAN_BIBIT` | `PENYELEKSIAN_BIBIT_ENTRY` | `VIEW`, `CREATE`, `SUBMIT` | `DIVISION` | `true` | `true` | `EXISTING` | `EXISTING_CODE` (`js/modules/transactions/transaction-manager.js`) |
| 16 | `MANTRI_TANAMAN` | `KEBUN_ENTRES` | `ENTRES_MENUNAS` | `ENTRES_MENUNAS_ENTRY` | `VIEW`, `CREATE`, `SUBMIT` | `DIVISION` | `true` | `true` | `EXISTING` | `EXISTING_CODE` (`js/modules/entres/menunas-form.js`) |
| 17 | `MANTRI_TANAMAN` | `KEBUN_ENTRES` | `ENTRES_TOPPING` | `ENTRES_TOPPING_ENTRY` | `VIEW`, `CREATE`, `SUBMIT` | `DIVISION` | `true` | `true` | `EXISTING` | `EXISTING_CODE` (`js/modules/entres/topping-form.js`) |
| 18 | `MANTRI_TANAMAN` | `KEGIATAN_BIBITAN` | `KEGIATAN_PEMELIHARAAN` | `KEGIATAN_MAINTENANCE_LOG` | `VIEW`, `CREATE`, `SUBMIT` | `DIVISION` | `true` | `true` | `EXISTING` | `EXISTING_CODE` (`js/modules/maintenance/nursery-activity.js`) |
| 19 | `MANTRI_TANAMAN` | `PERMINTAAN` | `PERMINTAAN_BIBIT_ESTATE` | `PERMINTAAN_BIBIT_LIST` | `VIEW`, `MONITOR` | `DIVISION` | `false` | `false` | `EXISTING` | `EXISTING_CODE` (`js/modules/request/request-landing.js`) |
| 20 | `MANTRI_TANAMAN` | `PENGIRIMAN` | `PENGIRIMAN_BIBIT_ESTATE` | `PENGIRIMAN_BIBIT_DISPATCH` | `VIEW`, `REVIEW`, `APPROVE` | `DIVISION` | `true` | `true` | `EXISTING` | `EXISTING_CODE` (`js/modules/transactions/transaction-manager.js`) |
| 21 | `MANTRI_TANAMAN` | `RIWAYAT_DATA` | `RIWAYAT_LOGS` | `RIWAYAT_TRANSAKSI_VIEW` | `VIEW`, `EXPORT` | `DIVISION` | `false` | `false` | `EXISTING` | `EXISTING_CODE` (`js/modules/transactions/transaction-manager.js`) |
| 22 | `ASKEP` | `PEMERIKSAAN` | `PEMERIKSAAN_LAPANGAN` | `PEMERIKSAAN_LAPANGAN_ENTRY` | `VIEW`, `VERIFY` | `ESTATE` | `true` | `true` | `EXISTING` | `ROLE_PROFILE` & `EXISTING_CODE` (`review-workspace.js`) |
| 23 | `ASKEP` | `PERMINTAAN` | `PERMINTAAN_BIBIT_ESTATE` | `PERMINTAAN_BIBIT_LIST` | `VIEW`, `MONITOR` | `ESTATE` | `false` | `false` | `EXISTING` | `ROLE_PROFILE` & `EXISTING_CODE` (`request-landing.js`) |
| 24 | `ASKEP` | `REVIEW_WORKSPACE` | `REVIEW_VERIFIKASI` | `REVIEW_TRANSAKSI_WORKSPACE` | `VIEW`, `REVIEW`, `APPROVE`, `VERIFY` | `ESTATE` | `true` | `true` | `EXISTING` | `ROLE_PROFILE` & `EXISTING_CODE` (`review-workspace.js`) |
| 25 | `ASKEP` | `RIWAYAT_DATA` | `RIWAYAT_LOGS` | `RIWAYAT_TRANSAKSI_VIEW` | `VIEW`, `EXPORT` | `ESTATE` | `false` | `false` | `EXISTING` | `ROLE_PROFILE` & `EXISTING_CODE` (`transaction-manager.js`) |
| 26 | `ASISTEN` | `PEMERIKSAAN` | `PEMERIKSAAN_LAPANGAN` | `PEMERIKSAAN_LAPANGAN_ENTRY` | `VIEW`, `VERIFY` | `DIVISION` | `true` | `true` | `EXISTING` | `ROLE_PROFILE` & `EXISTING_CODE` (`review-workspace.js`) |
| 27 | `ASISTEN` | `REVIEW_WORKSPACE` | `REVIEW_VERIFIKASI` | `REVIEW_TRANSAKSI_WORKSPACE` | `VIEW`, `REVIEW`, `APPROVE`, `VERIFY` | `DIVISION` | `true` | `true` | `EXISTING` | `ROLE_PROFILE` & `EXISTING_CODE` (`review-workspace.js`) |
| 28 | `ASISTEN` | `RIWAYAT_DATA` | `RIWAYAT_LOGS` | `RIWAYAT_TRANSAKSI_VIEW` | `VIEW`, `EXPORT` | `DIVISION` | `false` | `false` | `EXISTING` | `ROLE_PROFILE` & `EXISTING_CODE` (`transaction-manager.js`) |
| 29 | `ASISTEN_BIBITAN` | `PRESENSI` | `PRESENSI_RINGKASAN` | `PRESENSI_SUMMARY_VIEW` | `VIEW`, `MONITOR` | `DIVISION` | `false` | `false` | `EXISTING` | `ROLE_PROFILE` & `EXISTING_CODE` (`attendance-summary.js`) |
| 30 | `ASISTEN_BIBITAN` | `PENERIMAAN` | `PENERIMAAN_BENIH` | `PENERIMAAN_BENIH_ENTRY` | `VIEW`, `CREATE`, `SUBMIT` | `DIVISION` | `true` | `true` | `EXISTING` | `ROLE_PROFILE` & `EXISTING_CODE` (`transaction-manager.js`) |
| 31 | `ASISTEN_BIBITAN` | `PENYEMAIAN` | `PENYEMAIAN_INPUT` | `PENYEMAIAN_FORM_ENTRY` | `VIEW`, `CREATE`, `SUBMIT` | `DIVISION` | `true` | `true` | `EXISTING` | `ROLE_PROFILE` & `EXISTING_CODE` (`seeding-form.js`) |
| 32 | `ASISTEN_BIBITAN` | `OKULASI` | `OKULASI_GRAFTING` | `OKULASI_GRAFTING_ENTRY` | `VIEW`, `CREATE`, `SUBMIT` | `DIVISION` | `true` | `true` | `EXISTING` | `ROLE_PROFILE` & `EXISTING_CODE` (`budding-form.js`) |
| 33 | `ASISTEN_BIBITAN` | `PEMERIKSAAN` | `PEMERIKSAAN_LAPANGAN` | `PEMERIKSAAN_LAPANGAN_ENTRY` | `VIEW`, `CREATE`, `SUBMIT`, `VERIFY` | `DIVISION` | `true` | `true` | `EXISTING` | `ROLE_PROFILE` & `EXISTING_CODE` (`transaction-manager.js`) |
| 34 | `ASISTEN_BIBITAN` | `PENYELEKSIAN` | `PENYELEKSIAN_BIBIT` | `PENYELEKSIAN_BIBIT_ENTRY` | `VIEW`, `CREATE`, `SUBMIT` | `DIVISION` | `true` | `true` | `EXISTING` | `ROLE_PROFILE` & `EXISTING_CODE` (`transaction-manager.js`) |
| 35 | `ASISTEN_BIBITAN` | `KEGIATAN_BIBITAN` | `KEGIATAN_PEMELIHARAAN` | `KEGIATAN_MAINTENANCE_LOG` | `VIEW`, `CREATE`, `SUBMIT` | `DIVISION` | `true` | `true` | `EXISTING` | `ROLE_PROFILE` & `EXISTING_CODE` (`nursery-activity.js`) |
| 36 | `ASISTEN_BIBITAN` | `RIWAYAT_DATA` | `RIWAYAT_LOGS` | `RIWAYAT_TRANSAKSI_VIEW` | `VIEW`, `EXPORT` | `DIVISION` | `false` | `false` | `EXISTING` | `ROLE_PROFILE` & `EXISTING_CODE` (`transaction-manager.js`) |
| 37 | `TEKNIKER_I` | `RIWAYAT_DATA` | `RIWAYAT_LOGS` | `RIWAYAT_TRANSAKSI_VIEW` | `VIEW`, `EXPORT` | `ESTATE` | `false` | `false` | `EXISTING` | `ROLE_PROFILE` & `EXISTING_CODE` (`transaction-manager.js`) |
| 38 | `KTU` | `PENGIRIMAN` | `PENGIRIMAN_BIBIT_ESTATE` | `PENGIRIMAN_BIBIT_DISPATCH` | `VIEW`, `REVIEW`, `APPROVE` | `ESTATE` | `true` | `true` | `EXISTING` | `ROLE_PROFILE` & `EXISTING_CODE` (`transaction-manager.js`) |
| 39 | `KTU` | `REVIEW_WORKSPACE` | `REVIEW_VERIFIKASI` | `REVIEW_TRANSAKSI_WORKSPACE` | `VIEW`, `REVIEW`, `APPROVE` | `ESTATE` | `true` | `true` | `EXISTING` | `ROLE_PROFILE` & `EXISTING_CODE` (`review-workspace.js`) |
| 40 | `KTU` | `RIWAYAT_DATA` | `RIWAYAT_LOGS` | `RIWAYAT_TRANSAKSI_VIEW` | `VIEW`, `EXPORT` | `ESTATE` | `false` | `false` | `EXISTING` | `ROLE_PROFILE` & `EXISTING_CODE` (`transaction-manager.js`) |

---
**END OF MATRIX**
