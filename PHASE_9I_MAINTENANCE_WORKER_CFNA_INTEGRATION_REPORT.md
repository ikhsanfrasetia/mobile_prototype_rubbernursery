# PHASE 9I — INTEGRASI MASTER PEKERJA + CFNA KE MODUL PEMELIHARAAN REPORT

**Proyek:** SIGMA Rubber Nursery Mobile Application Prototype  
**Fase:** Phase 9I — Worker Master & CFNA Master Integration: Maintenance  
**Status:** **PASS / APPROVED & VERIFIED (0 Failures, 0 Regressions)**  
**Tanggal:** 2026-09-12  
**Baseline Test:** 766 / 766 Assertions Passing (20 Suites Total)

---

## 1. Objective

Mengintegrasikan dua Master Data terpusat:
1. **Master Data Pekerja** (`js/data/worker-master.js`)
2. **Master Data CFNA** (`js/data/cfna-master.js`)

ke dalam modul transaksi Pemeliharaan / Rekam Aktivitas Bibitan (`js/modules/maintenance/nursery-activity.js`), dengan mempertahankan seluruh guardrails:
- Worker scoping berbasis Estate + Division dari user aktif (`getCurrentUserContext()`);
- Filter pekerja berstatus `ACTIVE` saja;
- CFNA scoping berbasis aktivitas terkonfirmasi (`CONFIRMED`);
- Pemisahan tegas antara Transaction Actor (`createdByUserId`) dan Worker (`workerId`);
- Transaction Ownership & Data Isolation (Phase 9D);
- Stamping Actor Snapshot & Audit Trail (Phase 8B);
- Kompatibilitas transaksi historis (tanpa migrasi / destruksi skema).

---

## 2. Existing Maintenance Architecture

Sebelum integrasi Phase 9I:
- `nursery-activity.js` memiliki array lokal `MASTER_PEKERJA_LIST` berisikan 7 pekerja statis.
- Pemilihan CFNA sudah mengonsumsi master CFNA (Phase 9C), namun daftar pekerja pada form masih terpisah dari master pekerja terpusat.
- Transaksi disimpan ke `storage` key `'nursery_activity_records'` dengan stamping identitas aktor melalui `applyTransactionActor(...)`.

Arsitektur yang diperbarui pada Phase 9I:
- Seluruh worker selectable pada form pemeliharaan diambil secara dinamis dari `getWorkersForUserContext(getCurrentUserContext(), { activeOnly: true })`.
- Validasi ganda (Dual Validation) dijalankan sebelum persistensi: Worker wajib valid, aktif, dan in-scope; CFNA wajib valid, aktif, dan status mapping terkonfirmasi (`CONFIRMED`).

---

## 3. Worker Source

- **Single Source of Truth:** `js/data/worker-master.js` (`WORKER_MASTER`, 24 record terverifikasi).
- **APIs Digunakan:**
  - `getWorkersForUserContext(userContext, { activeOnly: true })`
  - `getWorkerById(workerId)`
  - `isWorkerActive(workerId)`
  - `isWorkerInScope(workerId, estateId, divisionId)`
- **Dilarang:** Membuat array worker lokal baru atau menduplikasi list pekerja di modul.

---

## 4. CFNA Source

- **Single Source of Truth:** `js/data/cfna-master.js` (`CFNA_MASTER`, 46 record alokasi biaya).
- **APIs Digunakan:**
  - `getConfirmedCfnaForActivity(activity)`
  - `getCfnaByCode(code)`
  - `isCfnaCodeValid(code)`
  - `getCfnaActivityMappings()`
- **Dilarang:** Membuat array CFNA lokal baru atau hardcoded option list di luar master.

---

## 5. Worker Scoping

Worker ditampilkan secara ketat berdasarkan Estate dan Divisi user aktif:

| Persona | User ID | Role | Estate | Divisi | Active Workers |
|---|---|---|---|---|:---:|
| **Wagiman** | `MNT001` | `MANTRI_TANAMAN` | Tanah Besih (`EST-TBS`) | Divisi I (`DIV-001`) | **7** |
| **Rahmad** | `AST002` | `ASISTEN` | Tanah Besih (`EST-TBS`) | Divisi II (`DIV-002`) | **5** |
| **Supriono** | `MNT002` | `MANTRI_TANAMAN` | Aek Pamingke (`EST-APM`) | Divisi I (`DIV-APM-01`) | **5** |
| **Abdul Gofur** | `ASB002` | `ASISTEN_BIBITAN` | Aek Pamingke (`EST-APM`) | Divisi II (`DIV-APM-02`) | **5** |

---

## 6. CFNA Scoping

CFNA di-filter secara kontekstual mengikuti aktivitas yang dipilih:

| Aktivitas | Target Type | Canonical CFNA Code | Canonical CFNA Name | Status Mapping |
|---|---|---|---|:---:|
| **Penyiraman** | `PENYIRAMAN` | `964009` | Penyiraman (Manual) | `CONFIRMED` ✅ |
| **Pemupukan** | `PEMUPUKAN` | `964006` | Pemupukan | `CONFIRMED` ✅ |
| **Seleksi Bibit** | `SELEKSI_BIBIT` | `964008` | Seleksi Bibit | `CONFIRMED` ✅ |
| **Pengendalian Gulma** | `PENGENDALIAN_GULMA` | `964005` | Pengendalian Gulma (Manual) | `CONFIRMED` ✅ |
| **Pengendalian Hama Penyakit** | `PENGENDALIAN_HAMA_PENYAKIT` | `964007` | Pengendalian Hama Penyakit | `CONFIRMED` ✅ |
| **Topping / Okulasi** | `-` | `-` | Tidak Ada (Empty) | `UNMAPPED` ⛔ |
| **Pembebanan Sepupu** | `PERMINTAAN_KEBUN_SEPUPU` | `966001` | Pembebanan ke Kebun Sepupu | `NEEDS_REVIEW` ⛔ |

---

## 7. Cross Validation

Sebelum transaksi disimpan (`CREATE` / `SUBMIT`), validasi ketat diterapkan:
1. **Worker Validation:**
   - Worker ID harus ditemukan di `worker-master.js`.
   - Worker status harus `ACTIVE`.
   - Worker Estate & Division harus cocok dengan User Context (`isWorkerInScope`).
2. **CFNA Validation:**
   - CFNA Code harus valid di `cfna-master.js`.
   - CFNA status harus `ACTIVE`.
   - CFNA harus terdaftar sebagai `CONFIRMED` untuk aktivitas yang bersangkutan.
   - Nama alokasi wajib diambil langsung dari canonical master (client name ditimpa).
3. **Invalid Scenarios Rejection:**
   - WRK-TBS-D2-001 dipilih oleh Wagiman (TBS D1) ➔ **REJECT / NOT IN SCOPE**.
   - 964006 (Pemupukan) dipilih pada aktivitas Penyiraman ➔ **REJECT / UNCONFIRMED**.
   - CFNA berstatus `NEEDS_REVIEW` / `NOT_APPLICABLE` ➔ **REJECT / EXCLUDED**.

---

## 8. Transaction Structure

Struktur record transaksi pemeliharaan menyimpan referensi lengkap dan kompatibel:
```json
{
  "id": "ACT-1773489000000",
  "docNo": "ACT/NUR/2026/01",
  "tipe": "Penyiraman",
  "kategori": "Rutin",
  "blok": "Block 031/04",
  "bedengan": "Bedengan 1",
  "tanggal": "2026-09-12",
  "shift": "Pagi",
  "cfnaCode": "964009",
  "allocationCode": "964009",
  "cfnaName": "Penyiraman (Manual)",
  "allocationName": "Penyiraman (Manual)",
  "cfnaStatus": "VALIDATED",
  "pekerja": [
    {
      "id": "WRK-001",
      "workerId": "WRK-001",
      "name": "Fadilah Yusuf Purba",
      "workerName": "Fadilah Yusuf Purba",
      "code": "1405739",
      "workerCode": "1405739",
      "position": "Pekerja Bibitan",
      "role": "Pekerja Bibitan"
    }
  ],
  "targetPohon": 100,
  "realisasiPohon": 100,
  "luasAreaHa": 0.5,
  "status": "submitted",
  "createdByUserId": "MNT001",
  "createdByLoginCode": "MNT001",
  "createdByName": "Wagiman",
  "createdByRole": "MANTRI_TANAMAN",
  "createdByEstateId": "EST-TBS",
  "createdByEstateName": "Tanah Besih",
  "createdByDivisionId": "DIV-001",
  "createdByDivisionName": "Divisi I",
  "createdAt": "2026-09-12T10:50:00.000Z",
  "auditTrail": [...]
}
```

---

## 9. Actor Identity

- **Actor Definition:** Pengguna yang sedang login dan melakukan aksi pada sistem (`session` / `userContext`).
- **Pemisahan dari Worker:**
  - `createdByUserId`: `MNT001` (Wagiman - Actor pembuat transaksi)
  - `workerId`: `WRK-001` (Fadilah Yusuf Purba - Pekerja pelaksana di lapangan)
- Dilarang keras menggunakan `workerId` sebagai `createdByUserId` atau sebaliknya.

---

## 10. Ownership

- Mengikuti aturan Phase 9D:
  - Transaksi Mantri Tanaman bersifat *personal-owned* (`currentUser.userId === record.createdByUserId`).
  - Wagiman (`MNT001`) hanya dapat melihat, mengedit, dan menghapus transaksi miliknya.
  - Supriono (`MNT002`) tidak dapat melihat transaksi Wagiman meskipun memiliki role yang sama (`MANTRI_TANAMAN`).

---

## 11. Historical Compatibility

- Transaksi lama (legacy records) tanpa field worker baru atau CFNA baru tetap dapat dibuka dan dirender tanpa migrasi skema.
- Helper rendering detail form dan kartu list mendukung fallback: `${w.code || w.workerCode || ''} - ${w.name || w.workerName || ''}`.
- Tidak ada penghapusan atau mutasi data historis.

---

## 12. Context Switching

- Saat berganti persona (misal dari Wagiman ke Supriono lalu ke Abdul Gofur):
  - Form Pemeliharaan memanggil `getWorkersForUserContext()` berdasarkan user context aktif.
  - State pilihan pekerja di-reset untuk menghindari worker stale dari sesi persona sebelumnya.
  - Transaksi yang dimuat pada list transaksi langsung difilter ulang berdasarkan context kepemilikan.

---

## 13. Search Isolation

- Fitur pencarian pekerja beroperasi hanya pada dataset ter-scope:
  - Wagiman (`EST-TBS`, `DIV-001`): Cari `"Darman"` ➔ **0 hasil** (Darman di Divisi II).
  - Rahmad (`EST-TBS`, `DIV-002`): Cari `"Darman"` ➔ **1 hasil**.
  - Supriono (`EST-APM`, `DIV-APM-01`): Cari `"Herman"` ➔ **1 hasil**.
  - Wagiman (`EST-TBS`, `DIV-001`): Cari `"Herman"` ➔ **0 hasil**.

---

## 14. Manual UAT Matrix

| Skenario | Persona | Tindakan | Hasil Aktual | Status |
|---|---|---|---|:---:|
| **UAT 1** | Wagiman (`MNT001`) | Buka form Pemeliharaan, pilih WRK-001, Aktivitas Penyiraman, CFNA 964009, Simpan. | Berhasil disimpan dengan actor MNT001, worker WRK-001, CFNA 964009. | **PASS** ✅ |
| **UAT 2** | Rahmad (`AST002`) | Buka form Pemeliharaan. Verifikasi 5 worker TBS D2. Cari Darman vs Fadilah. | Darman muncul, Fadilah tidak muncul. | **PASS** ✅ |
| **UAT 3** | Supriono (`MNT002`) | Buka form Pemeliharaan & Transaksi. Cek worker APM D1 & transaksi Wagiman. | 5 worker APM D1 tersedia. Transaksi Wagiman tidak terlihat. | **PASS** ✅ |
| **UAT 4** | Abdul Gofur (`ASB002`) | Buka form Pemeliharaan. Cek 5 worker APM D2. | 5 worker APM D2 tersedia, worker APM D1 tidak muncul. | **PASS** ✅ |
| **UAT 5** | Negatif CFNA | Coba pilih CFNA 964006 (Pemupukan) pada Aktivitas Penyiraman. | Ditolak oleh validasi terkonfirmasi. | **PASS** ✅ |
| **UAT 6** | Negatif Worker | Wagiman mencoba submit worker TBS D2. | Ditolak oleh validasi scope Estate/Divisi. | **PASS** ✅ |
| **UAT 7** | Switch Context | Wagiman ➔ Supriono ➔ Abdul Gofur. | List worker berganti TBS D1 ➔ APM D1 ➔ APM D2 tanpa stale worker. | **PASS** ✅ |

---

## 15. Automated Tests

Suite pengujian khusus dibuat di `scripts/test-phase9i-maintenance-worker-cfna.js` (44 assertions):
- **Section A (1-3):** Worker Source & ACTIVE Filtering
- **Section B (4-7):** Persona Counts (Wagiman: 7, Rahmad: 5, Supriono: 5, Abdul Gofur: 5)
- **Section C (8-11):** Worker Scope Isolation
- **Section D (12-13):** CFNA Source Integration
- **Section E (14-17):** CFNA Mapping & Status Validation
- **Section F (18-24):** Cross Validation Rules
- **Section G (25-29):** Transaction Payload & Canonical Fields
- **Section H (30-32):** Actor Identity & Immutability
- **Section I (33-35):** Ownership & Visibility Isolation
- **Section J (36-38):** Historical Compatibility & No Migration
- **Section K (39-44):** Form Workflow, Search Isolation & Context Switching

---

## 16. Regression Summary

Dijalankan melalui master runner `scripts/run-all-tests-phase9i.js`:

| No | Test Suite | File | Assertions | Status |
|:---:|---|---|:---:|:---:|
| 1 | **Phase 9I: Worker Master + CFNA Integration: Maintenance** | `scripts/test-phase9i-maintenance-worker-cfna.js` | 44 | **PASS ✅** |
| 2 | Phase 9H: Worker Master Integration: Presensi | `scripts/test-phase9h-attendance-worker-integration.js` | 32 | **PASS ✅** |
| 3 | Phase 9G: Worker Master Integration: Budding | `scripts/test-phase9g-budding-worker-integration.js` | 28 | **PASS ✅** |
| 4 | Phase 9F-B: Master Data Pekerja Foundation | `scripts/test-phase9fb-worker-master.js` | 31 | **PASS ✅** |
| 5 | Phase 9F-A: Worker Master Dependency Audit | `scripts/test-phase9fa-worker-audit.js` | 20 | **PASS ✅** |
| 6 | Phase 9E: Persona Division Alignment | `scripts/test-phase9e-persona-division.js` | 24 | **PASS ✅** |
| 7 | Phase 9D: UAT Mantri Transaction Isolation | `scripts/run-uat-phase9d.js` | 14 | **PASS ✅** |
| 8 | Phase 9D: Transaction Data Isolation & Actor Ownership | `scripts/test-phase9d-transaction-isolation.js` | 37 | **PASS ✅** |
| 9 | Phase 9C: CFNA Maintenance Module Integration | `scripts/test-phase9c-cfna-maintenance.js` | 35 | **PASS ✅** |
| 10 | Phase 9B: Master Data CFNA Foundation | `scripts/test-phase9b-cfna-master.js` | 22 | **PASS ✅** |
| 11 | Phase 9A: Gap Resolution & SPB Integration | `scripts/test-phase9a-request-integration.js` | 32 | **PASS ✅** |
| 12 | Phase 8A: Role Menu Mapping & Validation | `scripts/test-role-menu-mapping.js` | 51 | **PASS ✅** |
| 13 | Phase 8B: Transaction Actor Identity Traceability | `scripts/test-transaction-actor-identity.js` | 60 | **PASS ✅** |
| 14 | Phase 7: Menu & Feature Registry | `scripts/test-menu-feature-registry.js` | 52 | **PASS ✅** |
| 15 | Phase 6: Role Profile & Capability Registry | `scripts/test-role-profiles.js` | 45 | **PASS ✅** |
| 16 | Phase 5: Role Normalization Compatibility | `scripts/test-role-normalization.js` | 27 | **PASS ✅** |
| 17 | Phase 4: Persona Switcher & Session Layer | `scripts/test-persona-switcher.js` | 39 | **PASS ✅** |
| 18 | Phase 3: Demo User & Persona Registry | `scripts/test-persona-registry.js` | 111 | **PASS ✅** |
| 19 | Acceptance Suite: Task 11 Feature Acceptance | `scripts/test-task11-acceptance.js` | 20 | **PASS ✅** |
| 20 | Phase 2: User Context Compatibility Layer | `scripts/test-user-context-compatibility.js` | 42 | **PASS ✅** |
| **TOTAL** | **20 Suites** | | **766** | **100% PASS** |

---

## 17. Files Modified

1. `js/modules/maintenance/nursery-activity.js`:
   - Import helper master pekerja (`getWorkersForUserContext`, `getWorkerById`, `isWorkerInScope`, `isWorkerActive`).
   - Hapus hardcoded `MASTER_PEKERJA_LIST`.
   - Render form pekerja dinamis berbasis scoped `activeWorkers`.
   - Validasi ganda (Dual Validation) sebelum simpan transaksi.
   - Dukungan fleksibel pada detail render list transaksi.
2. `sw.js`:
   - Cache version dinaikkan ke `sigma-nursery-v156`.

---

## 18. Files Created

1. `scripts/test-phase9i-maintenance-worker-cfna.js` (Test suite 44 assertions).
2. `scripts/run-all-tests-phase9i.js` (Master regression runner 20 suites).
3. `PHASE_9I_MAINTENANCE_WORKER_CFNA_INTEGRATION_REPORT.md` (Dokumen laporan resmi).

---

## 19. Breaking Changes

- **0 Breaking Changes.** Seluruh antarmuka publik, format transaksi eksisting, dan repository layer tetap 100% kompatibel.

---

## 20. Known Limitations

- Transaksi legacy yang disimpan sebelum Phase 8B tidak memiliki field `createdByUserId` eksplisit dan diperlakukan sebagai legacy read-only.

---

## 21. Deferred Integration

- Integrasi modul transaksional berikutnya yang siap diintegrasikan:
  - Modul Seleksi Bibit / Culling
  - Modul Kebun Entres
  - Modul Pengiriman / Distribusi Bibit

---

## 22. Final Status

```
========================================================================================
WORKER MASTER INTEGRATION STATUS:
  ✅ Okulasi / Budding    (Phase 9G) — INTEGRATED & VERIFIED
  ✅ Presensi / Attendance (Phase 9H) — INTEGRATED & VERIFIED
  ✅ Pemeliharaan / CFNA  (Phase 9I) — INTEGRATED & VERIFIED

FINAL STATUS:
  PHASE 9I — PASS / READY FOR NEXT TASK
========================================================================================
```
