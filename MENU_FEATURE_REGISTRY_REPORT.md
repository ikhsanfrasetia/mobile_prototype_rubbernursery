# MENU & FEATURE REGISTRY REPORT (PHASE 7)
**Project**: SIGMA Rubber Nursery Mobile Application Prototype  
**Phase**: Phase 7 — Menu, Submenu, Feature & Action Registry  
**Principle**: *"DEFINE THE STRUCTURE FIRST, INTEGRATE LATER."*  
**Date**: 2026-09-12  
**Status**: COMPLETE (Additive & Non-breaking)

---

## 1. Registry Architecture

Phase 7 establishes a read-only configuration foundation implementing a strict 5-layer hierarchy:

```
ROLE
  ↓
MENU
  ↓
SUBMENU
  ↓
FEATURE
  ↓
ACTION
```

### Architecture Specifications:
- **Location**: `js/core/menu-registry.js`
- **Design Paradigm**: Read-only declarative configuration objects (`Object.freeze`) with generic O(1) & filtering helper functions.
- **Runtime Decoupling**: Does **NOT** alter existing runtime routing (`router.js`), drawer menu rendering (`drawer.js`), role capability evaluation (`permissions.js`), or transaction workflows.
- **Zero Circular Dependencies**: Leverages `user-context.js` (`ROLES`, `SCOPE_TYPES`, `normalizeRole`) and `role-profiles.js`.

---

## 2. Canonical Role Coverage

The master registry covers all **7 Canonical Roles** without creating synthetic roles or changing canonical definitions:

| No | Canonical Role Key | Role Label | Position | Default Scope | Menu Count | Feature Count |
|:---:|:---|:---|:---|:---:|:---:|:---:|
| 1 | `PENGURUS` | Pengurus | Pengurus Kebun | `ESTATE` | 5 | 5 |
| 2 | `ASKEP` | Askep | Asisten Kepala | `ESTATE` | 4 | 3 |
| 3 | `ASISTEN` | Asisten | Asisten Lapangan | `DIVISION` | 3 | 2 |
| 4 | `ASISTEN_BIBITAN` | Asisten Bibitan | Asisten Pembibitan | `DIVISION` | 9 | 7 |
| 5 | `MANTRI_TANAMAN` | Mantri Bibitan | Mantri Bibitan | `DIVISION` | 11 | 11 |
| 6 | `TEKNIKER_I` | Tekniker I | Tekniker I | `ESTATE` | 1 | 1 |
| 7 | `KTU` | KTU | Kepala Tata Usaha | `ESTATE` | 3 | 3 |

*Note: Legacy role `PENGURUS_KEBUN_SEPUPU` resolves to canonical role `PENGURUS` via `normalizeRole()`.*

---

## 3. Menu Inventory

Total **12 Master Menus** defined in `MENU_REGISTRY`:

| No | Menu ID | Key | Label | Icon | Role Keys | Order | Status |
|:---:|:---|:---|:---|:---:|:---|:---:|:---:|
| 1 | `MENU-PRESENSI` | `PRESENSI` | Presensi | 👷 | `MANTRI_TANAMAN`, `ASISTEN_BIBITAN` | 1 | `ACTIVE` |
| 2 | `MENU-PENERIMAAN` | `PENERIMAAN` | Penerimaan | 📦 | `PENGURUS`, `MANTRI_TANAMAN`, `ASISTEN_BIBITAN` | 2 | `ACTIVE` |
| 3 | `MENU-PENYEMAIAN` | `PENYEMAIAN` | Penyemaian | 🌱 | `MANTRI_TANAMAN`, `ASISTEN_BIBITAN` | 3 | `ACTIVE` |
| 4 | `MENU-OKULASI` | `OKULASI` | Okulasi | 🌿 | `MANTRI_TANAMAN`, `ASISTEN_BIBITAN` | 4 | `ACTIVE` |
| 5 | `MENU-PEMERIKSAAN` | `PEMERIKSAAN` | Pemeriksaan | 🔍 | `MANTRI_TANAMAN`, `ASISTEN`, `ASISTEN_BIBITAN`, `ASKEP` | 5 | `ACTIVE` |
| 6 | `MENU-PENYELEKSIAN` | `PENYELEKSIAN` | Penyeleksian Bibit | ✅ | `MANTRI_TANAMAN`, `ASISTEN_BIBITAN` | 6 | `ACTIVE` |
| 7 | `MENU-KEBUN-ENTRES` | `KEBUN_ENTRES` | Kebun Entres | 🌳 | `MANTRI_TANAMAN`, `ASISTEN_BIBITAN` | 7 | `ACTIVE` |
| 8 | `MENU-KEGIATAN-BIBITAN` | `KEGIATAN_BIBITAN` | Kegiatan Bibitan | 🛠️ | `MANTRI_TANAMAN`, `ASISTEN_BIBITAN` | 8 | `ACTIVE` |
| 9 | `MENU-PERMINTAAN` | `PERMINTAAN` | Permintaan | 📋 | `PENGURUS`, `ASKEP`, `MANTRI_TANAMAN` | 9 | `ACTIVE` |
| 10 | `MENU-PENGIRIMAN` | `PENGIRIMAN` | Pengiriman | 🚚 | `PENGURUS`, `KTU`, `MANTRI_TANAMAN` | 10 | `ACTIVE` |
| 11 | `MENU-REVIEW-WORKSPACE` | `REVIEW_WORKSPACE` | Review & Otorisasi | 📝 | `PENGURUS`, `ASKEP`, `ASISTEN`, `KTU` | 11 | `ACTIVE` |
| 12 | `MENU-RIWAYAT-DATA` | `RIWAYAT_DATA` | Riwayat Data | 📅 | *All 7 Canonical Roles* | 12 | `ACTIVE` |

---

## 4. Submenu Inventory

Total **17 Master Submenus** defined in `SUBMENU_REGISTRY`:

| Submenu ID | Submenu Key | Parent Menu Key | Submenu Label | Roles | Order | Status |
|:---|:---|:---|:---|:---|:---:|:---:|
| `SUB-PRES-SUPERVISOR` | `PRESENSI_SUPERVISOR` | `PRESENSI` | Presensi Supervisor | `MANTRI_TANAMAN` | 1 | `ACTIVE` |
| `SUB-PRES-WORKERS` | `PRESENSI_PEKERJA` | `PRESENSI` | Presensi Pekerja | `MANTRI_TANAMAN` | 2 | `ACTIVE` |
| `SUB-PRES-SUMMARY` | `PRESENSI_RINGKASAN` | `PRESENSI` | Ringkasan Presensi | `MANTRI_TANAMAN`, `ASISTEN_BIBITAN` | 3 | `ACTIVE` |
| `SUB-RCV-BENIH` | `PENERIMAAN_BENIH` | `PENERIMAAN` | Penerimaan Benih/Kecambah | `MANTRI_TANAMAN`, `ASISTEN_BIBITAN` | 1 | `ACTIVE` |
| `SUB-RCV-ESTATE` | `PENERIMAAN_BIBIT_ESTATE` | `PENERIMAAN` | Penerimaan Bibit Kebun | `PENGURUS` | 2 | `ACTIVE` |
| `SUB-SEED-FORM` | `PENYEMAIAN_INPUT` | `PENYEMAIAN` | Input Penyemaian Kecambah | `MANTRI_TANAMAN`, `ASISTEN_BIBITAN` | 1 | `ACTIVE` |
| `SUB-BUD-GRAFTING` | `OKULASI_GRAFTING` | `OKULASI` | Input Okulasi & Grafting | `MANTRI_TANAMAN`, `ASISTEN_BIBITAN` | 1 | `ACTIVE` |
| `SUB-BUD-REGRAFT` | `OKULASI_REGRAFTING` | `OKULASI` | Okulasi Ulang / Regrafting | `MANTRI_TANAMAN` | 2 | `ACTIVE` |
| `SUB-INSP-FIELD` | `PEMERIKSAAN_LAPANGAN` | `PEMERIKSAAN` | Inspeksi & Pemeriksaan Bibit | `MANTRI_TANAMAN`, `ASISTEN`, `ASISTEN_BIBITAN`, `ASKEP` | 1 | `ACTIVE` |
| `SUB-SEL-CULL` | `PENYELEKSIAN_BIBIT` | `PENYELEKSIAN` | Seleksi Bibit Siap Tanam & Afkir | `MANTRI_TANAMAN`, `ASISTEN_BIBITAN` | 1 | `ACTIVE` |
| `SUB-ENT-MENUNAS` | `ENTRES_MENUNAS` | `KEBUN_ENTRES` | Kegiatan Menunas Entres | `MANTRI_TANAMAN` | 1 | `ACTIVE` |
| `SUB-ENT-TOPPING` | `ENTRES_TOPPING` | `KEBUN_ENTRES` | Topping & Pemanenan Entres | `MANTRI_TANAMAN` | 2 | `ACTIVE` |
| `SUB-ACT-MAINT` | `KEGIATAN_PEMELIHARAAN` | `KEGIATAN_BIBITAN` | Pemeliharaan & Perawatan Bibitan | `MANTRI_TANAMAN`, `ASISTEN_BIBITAN` | 1 | `ACTIVE` |
| `SUB-REQ-ESTATE` | `PERMINTAAN_BIBIT_ESTATE` | `PERMINTAAN` | Permintaan Bibit Kebun Sepupu | `PENGURUS`, `ASKEP` | 1 | `ACTIVE` |
| `SUB-DSP-ESTATE` | `PENGIRIMAN_BIBIT_ESTATE` | `PENGIRIMAN` | Pengiriman & Dispatch Bibit | `PENGURUS`, `KTU` | 1 | `ACTIVE` |
| `SUB-REV-APPROVAL` | `REVIEW_VERIFIKASI` | `REVIEW_WORKSPACE` | Verifikasi & Otorisasi Transaksi | `PENGURUS`, `ASKEP`, `ASISTEN`, `KTU` | 1 | `ACTIVE` |
| `SUB-HIST-LOGS` | `RIWAYAT_LOGS` | `RIWAYAT_DATA` | Log Riwayat Transaksi | *All 7 Roles* | 1 | `ACTIVE` |

---

## 5. Feature Inventory

Total **18 Master Features** defined in `FEATURE_REGISTRY`:

| Feature Key | Submenu Key | Feature Label | Expected Scope | Status | Actions | Source |
|:---|:---|:---|:---:|:---:|:---|:---:|
| `PRESENSI_SUPERVISOR_SUBMIT` | `PRESENSI_SUPERVISOR` | Presensi Mandiri Supervisor | `DIVISION` | `EXISTING` | `VIEW`, `CREATE`, `SUBMIT` | `EXISTING_CODE` |
| `PRESENSI_WORKERS_LOG` | `PRESENSI_PEKERJA` | Presensi Pekerja Harian | `DIVISION` | `EXISTING` | `VIEW`, `CREATE`, `SUBMIT` | `EXISTING_CODE` |
| `PRESENSI_SUMMARY_VIEW` | `PRESENSI_RINGKASAN` | Ringkasan & Validasi Presensi | `DIVISION` | `EXISTING` | `VIEW`, `MONITOR` | `EXISTING_CODE` |
| `PENERIMAAN_BENIH_ENTRY` | `PENERIMAAN_BENIH` | Penerimaan Benih Kecambah | `DIVISION` | `EXISTING` | `VIEW`, `CREATE`, `SUBMIT` | `EXISTING_CODE` |
| `PENERIMAAN_BIBIT_APPROVAL` | `PENERIMAAN_BIBIT_ESTATE` | Monitoring & Otorisasi Penerimaan | `ESTATE` | `EXISTING` | `VIEW`, `REVIEW`, `APPROVE` | `EXISTING_CODE` |
| `PENYEMAIAN_FORM_ENTRY` | `PENYEMAIAN_INPUT` | Input Penanaman Kecambah | `DIVISION` | `EXISTING` | `VIEW`, `CREATE`, `SUBMIT` | `EXISTING_CODE` |
| `OKULASI_GRAFTING_ENTRY` | `OKULASI_GRAFTING` | Input Okulasi & Grafting | `DIVISION` | `EXISTING` | `VIEW`, `CREATE`, `SUBMIT` | `EXISTING_CODE` |
| `OKULASI_REGRAFTING_ENTRY` | `OKULASI_REGRAFTING` | Input Regrafting (Okulasi Ulang) | `DIVISION` | `EXISTING` | `VIEW`, `CREATE`, `SUBMIT` | `EXISTING_CODE` |
| `PEMERIKSAAN_LAPANGAN_ENTRY` | `PEMERIKSAAN_LAPANGAN` | Inspeksi Kondisi Bibitan & Foto | `DIVISION` | `EXISTING` | `VIEW`, `CREATE`, `SUBMIT`, `VERIFY` | `EXISTING_CODE` |
| `PENYELEKSIAN_BIBIT_ENTRY` | `PENYELEKSIAN_BIBIT` | Seleksi Bibit Siap Tanam & Culling | `DIVISION` | `EXISTING` | `VIEW`, `CREATE`, `SUBMIT` | `EXISTING_CODE` |
| `ENTRES_MENUNAS_ENTRY` | `ENTRES_MENUNAS` | Pencatatan Kegiatan Menunas | `DIVISION` | `EXISTING` | `VIEW`, `CREATE`, `SUBMIT` | `EXISTING_CODE` |
| `ENTRES_TOPPING_ENTRY` | `ENTRES_TOPPING` | Pencatatan Topping & Panen Entres | `DIVISION` | `EXISTING` | `VIEW`, `CREATE`, `SUBMIT` | `EXISTING_CODE` |
| `KEGIATAN_MAINTENANCE_LOG` | `KEGIATAN_PEMELIHARAAN` | Konsolidasi & Pemeliharaan Bibitan | `DIVISION` | `EXISTING` | `VIEW`, `CREATE`, `SUBMIT` | `EXISTING_CODE` |
| `PERMINTAAN_BIBIT_LIST` | `PERMINTAAN_BIBIT_ESTATE` | Daftar Permintaan Bibit | `ESTATE` | `EXISTING` | `VIEW`, `MONITOR` | `EXISTING_CODE` |
| `PERMINTAAN_BIBIT_APPROVAL` | `PERMINTAAN_BIBIT_ESTATE` | Otorisasi Permintaan Bibit | `ESTATE` | `EXISTING` | `VIEW`, `REVIEW`, `APPROVE` | `EXISTING_CODE` |
| `PENGIRIMAN_BIBIT_DISPATCH` | `PENGIRIMAN_BIBIT_ESTATE` | Surat Pengantar & Dispatch Bibit | `ESTATE` | `EXISTING` | `VIEW`, `REVIEW`, `APPROVE` | `EXISTING_CODE` |
| `REVIEW_TRANSAKSI_WORKSPACE` | `REVIEW_VERIFIKASI` | Workspace Review & Approval | `ESTATE` | `EXISTING` | `VIEW`, `REVIEW`, `APPROVE`, `VERIFY` | `EXISTING_CODE` |
| `RIWAYAT_TRANSAKSI_VIEW` | `RIWAYAT_LOGS` | Riwayat Transaksi & Audit Log | `ESTATE` | `EXISTING` | `VIEW`, `EXPORT` | `EXISTING_CODE` |

---

## 6. Action Inventory

Canonical Actions defined in `ACTIONS`:
1. `VIEW`: Membaca data / daftar transaksi
2. `CREATE`: Membuat data baru / draft
3. `EDIT`: Mengubah draft transaksi sebelum submit
4. `DELETE`: Menghapus draft transaksi
5. `SUBMIT`: Mengirim draft ke workflow otorisasi
6. `REVIEW`: Memeriksa detail transaksi masuk
7. `APPROVE`: Menyetujui transaksi (otorisasi)
8. `VERIFY`: Memvalidasi kebenaran fisik / lapangan
9. `MONITOR`: Memantau progres operasional secara menyeluruh
10. `EXPORT`: Mengunduh berkas laporan / CSV
11. `PRINT`: Mencetak dokumen resmi / surat pengantar

---

## 7. Existing vs Planned Status

- **EXISTING Features**: 18 features (100% dipetakan dari codebase aktif).
- **PLANNED Status Readiness**: Role-role manajerial (`ASKEP`, `ASISTEN`, `KTU`, `TEKNIKER_I`) memiliki mapping menu/fitur berstatus `ACTIVE`/`EXISTING` untuk modul monitoring dan review yang sudah ada di codebase, dan siap menerima penambahan `PLANNED` features pada fase berikutnya tanpa risiko runtime regression.

---

## 8. Scope Mapping

- **ESTATE Scope**: 6 Features (`PENERIMAAN_BIBIT_APPROVAL`, `PERMINTAAN_BIBIT_LIST`, `PERMINTAAN_BIBIT_APPROVAL`, `PENGIRIMAN_BIBIT_DISPATCH`, `REVIEW_TRANSAKSI_WORKSPACE`, `RIWAYAT_TRANSAKSI_VIEW`).
- **DIVISION Scope**: 12 Features (Presensi, Penyemaian, Okulasi, Penyeleksian, Kebun Entres, Kegiatan Pemeliharaan).

---

## 9. Requirement Traceability

Setiap node feature terhubung dengan `requirementSource`:
- `EXISTING_CODE`: 18 Features
- Standar extensible source: `ROLE_PROFILE`, `PROJECT_REQUIREMENT`, `FUTURE`, `DOCUMENTED`.

---

## 10. PENGURUS Existing Mapping

PENGURUS (`PGS001` & `PGS002`) dipetakan ke 5 menu operasional kebun:
1. `PENERIMAAN` (Monitoring & Approval penerimaan bibit)
2. `PERMINTAAN` (Permintaan bibit kebun sepupu)
3. `PENGIRIMAN` (Surat pengantar & otorisasi pengiriman)
4. `REVIEW_WORKSPACE` (Workspace approval transaksi)
5. `RIWAYAT_DATA` (Audit log transaksi kebun)

---

## 11. MANTRI_TANAMAN Existing Mapping

MANTRI_TANAMAN (`MNT001` & `MNT002`) dipetakan ke 11 modul operasional lapangan:
1. `PRESENSI` (Supervisor, Pekerja, Ringkasan)
2. `PENERIMAAN` (Benih & Kecambah)
3. `PENYEMAIAN` (Input Penanaman Kecambah)
4. `OKULASI` (Okulasi & Regrafting)
5. `PEMERIKSAAN` (Inspeksi & Foto Lapangan)
6. `PENYELEKSIAN` (Seleksi Bibit & Culling)
7. `KEBUN_ENTRES` (Menunas & Topping)
8. `KEGIATAN_BIBITAN` (Pemeliharaan Tanaman)
9. `PERMINTAAN` (Monitoring Permintaan Bibit)
10. `PENGIRIMAN` (Pencatatan Surat Pengantar)
11. `RIWAYAT_DATA` (Riwayat Transaksi Pribadi)

---

## 12. Legacy Role Compatibility

Legacy role `ROLES.PENGURUS_KEBUN_SEPUPU` diproses melalui `normalizeRole()`.
- Pemanggilan `getMenusByRole(ROLES.PENGURUS_KEBUN_SEPUPU)` mengembalikan menu identik dengan `ROLES.PENGURUS`.
- Pemanggilan `getFeaturesByRole(ROLES.PENGURUS_KEBUN_SEPUPU)` mengembalikan feature set yang sama persis.
- Zero runtime regression pada sesi Mukhsin Haji (`PGS002`).

---

## 13. Files Created
1. `js/core/menu-registry.js` (Master registry menu, submenu, feature, action, generic query helpers).
2. `scripts/test-menu-feature-registry.js` (13 automated test suites for Phase 7).
3. `MENU_FEATURE_REGISTRY_REPORT.md` (Master audit and architecture report).

---

## 14. Files Modified
1. `sw.js` (Menambahkan `./js/core/menu-registry.js` ke `CORE_ASSETS` dan memperbarui `CACHE_NAME` ke `sigma-nursery-v147`).

---

## 15. Files Protected (Zero modifications)
- `js/core/permissions.js`
- `js/core/session.js`
- `js/core/user-context.js`
- `js/core/role-profiles.js`
- `js/core/router.js`
- `js/components/drawer.js`
- `js/modules/auth/login.js`
- `js/modules/dashboard/beranda.js`
- `js/modules/request/request-landing.js`
- Seluruh modul transaksi (`js/modules/transactions/`, `js/modules/attendance/`, `js/modules/entres/`, dll).

---

## 16. Test Results (Phase 7 Suite)

```
=== STARTING MENU & FEATURE REGISTRY VERIFICATION (PHASE 7) ===
TOTAL TESTS RUN: 52
PASSED: 52
FAILED: 0
Status: ALL PASS ✅
```

---

## 17. Regression Results

| Test Suite | Script | Tests Run | Passed | Failed | Status |
|---|---|:---:|:---:|:---:|:---:|
| Phase 2 Suite | `scripts/test-user-context-compatibility.js` | 42 | 42 | 0 | **PASS** |
| Phase 3 Suite | `scripts/test-persona-registry.js` | 111 | 111 | 0 | **PASS** |
| Phase 3 Acceptance | `scripts/test-task11-acceptance.js` | 20 | 20 | 0 | **PASS** |
| Phase 4 Suite | `scripts/test-persona-switcher.js` | 39 | 39 | 0 | **PASS** |
| Phase 5 Suite | `scripts/test-role-normalization.js` | 27 | 27 | 0 | **PASS** |
| Phase 6 Suite | `scripts/test-role-profiles.js` | 45 | 45 | 0 | **PASS** |
| Phase 7 Suite | `scripts/test-menu-feature-registry.js` | 52 | 52 | 0 | **PASS** |
| **TOTAL** | | **336** | **336** | **0** | **100% PASS** |

---

## 18. Safety Invariants

- [x] **INVARIANT 1**: `ROLES` existing tetap.
- [x] **INVARIANT 2**: `CAPABILITIES` existing tetap.
- [x] **INVARIANT 3**: `ROLE_PROFILES` existing tetap.
- [x] **INVARIANT 4**: `DEMO_PERSONAS` tetap (14 personas across 2 estates).
- [x] **INVARIANT 5**: Persona Switcher UI tetap stabil.
- [x] **INVARIANT 6**: `PENGURUS` existing baseline tetap.
- [x] **INVARIANT 7**: `MANTRI_TANAMAN` existing baseline tetap.
- [x] **INVARIANT 8**: `PENGURUS_KEBUN_SEPUPU` legacy compatibility tetap.
- [x] **INVARIANT 9**: Tidak ada menu existing berubah di runtime.
- [x] **INVARIANT 10**: Tidak ada route existing berubah.
- [x] **INVARIANT 11**: Tidak ada permission runtime berubah (`permissions.js` unedited).
- [x] **INVARIANT 12**: Tidak ada workflow transaksi berubah.
- [x] **INVARIANT 13**: Breaking Change = 0.

---

## 19. Known Limitations

1. **Read-Only Master Configuration**: File `menu-registry.js` adalah master registry deklaratif. Integrasi dinamis ke UI Drawer atau Sidebar belum dilakukan pada fase ini sesuai prinsip *"DEFINE THE STRUCTURE FIRST, INTEGRATE LATER"*.
2. **Planned Features**: Penambahan submenu atau action baru untuk role yang belum memiliki modul UI fisik (misal input data khusus Askep/KTU) tetap berstatus `PLANNED` hingga modul UI dibangun.

---

## 20. Readiness for Phase 8

Registry telah siap 100% dan tervalidasi secara komprehensif. Basis konfigurasi ini siap menjadi acuan saat melakukan migrasi dynamic navigation bar, dynamic drawer, atau capability mapping pada fase selanjutnya.

---
**END OF REPORT**
