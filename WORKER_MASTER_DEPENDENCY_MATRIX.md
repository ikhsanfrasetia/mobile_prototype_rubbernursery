# WORKER MASTER DEPENDENCY MATRIX

**Project:** SIGMA Rubber Nursery Mobile Application Prototype  
**Phase:** Phase 9F-A — Worker Master Dependency Audit  
**Date:** September 12, 2026  
**Status:** ✅ **COMPLETE / AUDIT BASELINE**  

---

## 1. Comprehensive Module Dependency Matrix

| Modul | Feature / Form | File Path | Worker Reference | Data Source | Worker Fields Stored / Used | Estate Filter | Division Filter | Role | Transaction Storage Key | Storage Format | Historical Data Classification | Hardcoded Worker Presence | Integration Risk | Readiness Classification | Integration Priority |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Presensi (Attendance)** | Presensi Pekerja Datang & Pulang | `js/modules/attendance/attendance-workers.js` | `workerRepository.list()`, `activeWorkersList`, `absentWorkersList` | IndexedDB `workers` store + Hardcoded fallback | `workerId`, `workerName`, `workerCode`, `position`, `workerRole`, `photoId`, `photo`, `attendanceType`, `supervisorId`, `location`, `latitude`, `longitude`, `capturedAt`, `date`, `time`, `status` | **NO** | **NO** | `MANTRI_TANAMAN` | `attendance_transactions` / `attendance` | Flat record per worker check-in | `WITH_WORKER_SNAPSHOT` | **YES** (7 active + 2 absent fallback array) | **MEDIUM** | `READY_FOR_MASTER` | **Priority 2** |
| **Presensi (Attendance)** | Ringkasan Presensi | `js/modules/attendance/attendance-summary.js` | `wrkAtts`, `workerName`, `workerCode` | `attendanceRepository.list()` | `workerName`, `workerCode`, `time`, `status` (display only) | **NO** | **NO** | `MANTRI_TANAMAN` | `attendance` | Flat record display | `WITH_WORKER_SNAPSHOT` | **NO** | **LOW** | `READY_FOR_MASTER` | **Priority 2** |
| **Okulasi (Budding)** | Rekam Okulasi (Grafting) | `js/modules/budding/budding-form.js` | `MASTER_WORKERS`, `selectedWorkers` | Hardcoded `MASTER_WORKERS` array (12 workers) | `workers: [{ id, name, code, qty }]` | **NO** | **NO** | `MANTRI_TANAMAN` | `budding_transactions` / `buddings` | Embedded worker array in budding doc | `WITH_WORKER_SNAPSHOT` | **YES** (12 workers `W001`-`W012`) | **HIGH** | `NEEDS_REFACTOR` | **Priority 1** |
| **Okulasi (Budding)** | Okulasi Janda (Regrafting) | `js/modules/budding/budding-form.js` | `MASTER_WORKERS`, `selectedWorkers` | Hardcoded `MASTER_WORKERS` array (12 workers) | `workers: [{ id, name, code, qty }]` | **NO** | **NO** | `MANTRI_TANAMAN` | `budding_transactions` / `buddings` | Embedded worker array in regrafting doc | `WITH_WORKER_SNAPSHOT` | **YES** (12 workers `W001`-`W012`) | **HIGH** | `NEEDS_REFACTOR` | **Priority 1** |
| **Pemeliharaan (Maintenance)** | Kegiatan Pemeliharaan Bibitan | `js/modules/maintenance/nursery-activity.js` | None in UI at present (`mandays`/notes only) | N/A (Candidate for Phase 9G+) | N/A | **N/A** | **N/A** | `MANTRI_TANAMAN`, `ASISTEN_BIBITAN` | `nursery_activity_transactions` | N/A | `WITHOUT_WORKER_IDENTITY` | **NO** | **MEDIUM** | `READY_FOR_MASTER` | **Priority 3** |
| **Penerimaan (Reception)** | Penerimaan Benih / Stump | `js/modules/reception/reception-form.js` | None | N/A | N/A | N/A | N/A | `MANTRI_TANAMAN`, `ASISTEN_BIBITAN` | `receipt_transactions` | N/A | `WITHOUT_WORKER_IDENTITY` | **NO** | **LOW** | `NOT_USED` | N/A |
| **Penyemaian (Sowing)** | Transaksi Penyemaian | `js/modules/sowing/sowing-form.js` | None | N/A | N/A | N/A | N/A | `MANTRI_TANAMAN` | `seeding_transactions` | N/A | `WITHOUT_WORKER_IDENTITY` | **NO** | **LOW** | `NOT_USED` | N/A |
| **Pemeriksaan (Inspection)** | Pemeriksaan Hasil Okulasi | `js/modules/inspection/inspection-form.js` | None | N/A | N/A | N/A | N/A | `MANTRI_TANAMAN` | `inspection_transactions` | N/A | `WITHOUT_WORKER_IDENTITY` | **NO** | **LOW** | `NOT_USED` | N/A |
| **Penyeleksian (Selection)** | Seleksi / Afkir Bibit | `js/modules/selection/selection-form.js` | None | N/A | N/A | N/A | N/A | `MANTRI_TANAMAN` | `selection_transactions` | N/A | `WITHOUT_WORKER_IDENTITY` | **NO** | **LOW** | `NOT_USED` | N/A |
| **Kebun Entres (Entres)** | Pengambilan Batang Entres | `js/modules/entres/entres-form.js` | None | N/A | N/A | N/A | N/A | `MANTRI_TANAMAN` | `entres_transactions` | N/A | `WITHOUT_WORKER_IDENTITY` | **NO** | **LOW** | `NOT_USED` | N/A |
| **Permintaan Bibit (Request)** | Permintaan Bibit (SPB) | `js/modules/request/request-form.js` | None | N/A | N/A | N/A | N/A | `ASISTEN`, `ASISTEN_BIBITAN`, `PENGURUS` | `seed_requests` | N/A | `WITHOUT_WORKER_IDENTITY` | **NO** | **LOW** | `NOT_USED` | N/A |
| **Pengiriman (Dispatch)** | Surat Pengantar Bibit / Dispatch | `js/modules/dispatch/dispatch-form.js` | None | N/A | N/A | N/A | N/A | `ASISTEN_BIBITAN`, `MANTRI_TANAMAN` | `dispatch_transactions` | N/A | `WITHOUT_WORKER_IDENTITY` | **NO** | **LOW** | `NOT_USED` | N/A |
| **Review Workspace** | Review & Approval Transaksi | `js/modules/review/review-workspace.js` | Displays transaction payloads | Direct storage / repos | Reads embedded worker data if present | **N/A** | **N/A** | `ASISTEN`, `ASKEP`, `PENGURUS` | Various | Display | `WITH_WORKER_SNAPSHOT` | **NO** | **LOW** | `READY_FOR_MASTER` | **Priority 4** |
| **Katalog Transaksi** | Manajemen Data Transaksi | `js/modules/transactions/transaction-manager.js` | Module config for `attendance` & `buddings` | Storage / Repositories | Metadata display | **N/A** | **N/A** | All roles | All transaction stores | CRUD | `WITH_WORKER_SNAPSHOT` | **NO** | **LOW** | `READY_FOR_MASTER` | **Priority 4** |

---

## 2. Master Readiness Classification Summary

| Readiness Status | Modules | Description |
|---|---|---|
| `READY_FOR_MASTER` | **Presensi (Attendance)**, **Pemeliharaan (Maintenance)**, **Review / Transaction Catalog** | Data structures and repositories (`workerRepository`) are positioned to seamlessly ingest a unified Master Data source once available. |
| `NEEDS_REFACTOR` | **Okulasi (Budding - Grafting & Regrafting)** | Current form uses isolated hardcoded array (`MASTER_WORKERS` `W001`-`W012`). Requires refactoring to consume `workerMaster` / `workerRepository` with proper estate/division scoping during Phase 9G. |
| `NOT_USED` | **Penerimaan, Penyemaian, Pemeriksaan, Penyeleksian, Kebun Entres, Permintaan, Pengiriman** | Currently operating on batch, bedengan, clone, or document levels without individual worker assignments. |
| `NEEDS_REQUIREMENT` | *None* | Business rules and scope mappings for workers are well understood. |
| `LEGACY_ONLY` | *None* | No deprecated standalone worker stores requiring legacy sunsetting. |

---

## 3. Integration Priority Ranking

1. **Priority 1: Okulasi (Budding - Grafting & Regrafting)**
   - *Rationale:* Critical operational flow. Currently suffers from hardcoded worker definitions (`W001`-`W012`) with no estate or division filtering, causing data isolation risks across estates.
2. **Priority 2: Presensi (Attendance)**
   - *Rationale:* High transaction frequency. Currently uses `workerRepository` / `DEMO_WORKERS`, but is limited exclusively to Tanah Besih Divisi I (`DIV-001`). Requires 4-division coverage (Tanah Besih Div I & II, Aek Pamingke Div I & II).
3. **Priority 3: Pemeliharaan (Maintenance / CFNA)**
   - *Rationale:* High business value for future worker allocation / mandays tracking alongside CFNA activities.
4. **Priority 4: Review Workspace & Transaction History**
   - *Rationale:* Passive display verification of worker snapshots in review and detail modals.
