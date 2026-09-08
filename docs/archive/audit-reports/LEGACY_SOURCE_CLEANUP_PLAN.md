# RENCANA PEMBERSIHAN SUMBER LEGACY & PENEGAKAN SINGLE SOURCE OF TRUTH
## SIGMA RUBBER NURSERY

**Status Dokumen:** PROPOSED CLEANUP PLAN (NO MODIFICATION / AUDIT ONLY)  
**Tanggal:** 2026-09-08  
**Master Baseline Terkunci:** [`MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md`](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md)

---

## 1. Active Runtime Sources (SINGLE SOURCE OF TRUTH)

File-file berikut adalah **Satu-Satunya Sumber Kebenaran (Single Source of Truth)** yang aktif digunakan oleh runtime dan aplikasi. File-file ini **TIDAK BOLEH DIHAPUS ATAU DIUBAH TANPA KONSULTASI**:

| Path | Kategori | Penggunaan Runtime | Pengimpor / Referensi | Tingkat Risiko |
|---|---|:---:|---|:---:|
| [`MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md`](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md) | **A. SOURCE OF TRUTH REQUIREMENT** | Acuan Utama Requirement | Acuan Master Project & AI Agent | **KRITIS** |
| [`data/process-mapping-data.json`](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/data/process-mapping-data.json) | **A. SOURCE OF TRUTH RUNTIME DATA** | Runtime Dataset JSON | `process-mapping-data.js`, unit tests | **KRITIS** |
| [`js/data/process-mapping-baseline.js`](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/data/process-mapping-baseline.js) | **A. SOURCE OF TRUTH BASELINE ES MODULE** | Runtime Baseline Engine | `process-mapping-data.js`, `process-mapping-ui.js` | **KRITIS** |

---

## 2. Legacy Machine-Readable Files

File-file data/ekspor mesin masa lalu yang berpotensi terbaca oleh AI Agent atau tools sebagai requirement aktif. File-file ini **TIDAK DIGUNAKAN DI RUNTIME** dan direkomendasikan untuk **dipindahkan ke `docs/archive/legacy/`** atau dihapus:

| No | Path File | Ukuran | Status Runtime | Keterangan & Alasan Pembersihan | Risiko Jika Dipindah/Hapus |
|:---:|---|:---:|:---:|---|:---:|
| 1 | `requirement.md` | 599.9 KB | Tidak Digunakan | Snapshot ekspor mentah historis (memuat versi draft lama, unconfirmed gap items, dan alur transplantasi) | **Sangat Rendah** |
| 2 | `data_old.json` | 392.6 KB | Tidak Digunakan | Cadangan JSON lama sebelum finalisasi Task 10 | **Sangat Rendah** |
| 3 | `task15_2_search_results.json` | 55.2 KB | Tidak Digunakan | Hasil dump pencarian sementara Task 15.2 | **Nol** |
| 4 | `portal_patch/backup-task10/process-mapping-data.json` | 292.1 KB | Tidak Digunakan | Snapshot JSON cadangan di folder patch | **Sangat Rendah** |
| 5 | `portal_patch/backup-task10/process-mapping-baseline.js` | 292.6 KB | Tidak Digunakan | Snapshot ES module cadangan di folder patch | **Sangat Rendah** |
| 6 | `scratch/reconciliation_full.json` | ~400 KB | Tidak Digunakan | Scratch data rekonsiliasi | **Nol** |
| 7 | `scratch/req_inventory_dump.json` | ~350 KB | Tidak Digunakan | Scratch inventory dump | **Nol** |
| 8 | `scratch/audit_detailed_output.json` | ~300 KB | Tidak Digunakan | Scratch audit log | **Nol** |
| 9 | `scratch/audit_results_15_7a.json` | ~250 KB | Tidak Digunakan | Scratch audit log Task 15.7A | **Nol** |
| 10 | `scratch/evaluation_15_7b.json` | ~250 KB | Tidak Digunakan | Scratch audit log Task 15.7B | **Nol** |
| 11 | `scratch/evidence_check_15_8a.json` | ~150 KB | Tidak Digunakan | Scratch audit log Task 15.8A | **Nol** |
| 12 | `scratch/consolidated_data_preview.json` | ~270 KB | Tidak Digunakan | Scratch preview konsolidasi | **Nol** |
| 13 | `scratch/full_audit_structure.json` | ~200 KB | Tidak Digunakan | Scratch full audit structure | **Nol** |
| 14 | `scratch/final_master_audit_results.json` | ~280 KB | Tidak Digunakan | Scratch hasil audit final | **Nol** |
| 15 | `scratch/file_cleanup_audit.json` | ~50 KB | Tidak Digunakan | Scratch file audit list | **Nol** |

---

## 3. Historical Documents

Dokumen-dokumen spesifikasi, arsitektur, dan laporan historis yang bernilai dokumenter tetapi **tidak boleh dibaca sebagai baseline aktif**. Disarankan tetap disimpan di dalam folder **`docs/archive/`** dengan penanda *HISTORICAL — NOT ACTIVE BASELINE*:

| No | Path File | Kategori | Keterangan |
|:---:|---|---|---|
| 1 | `SIGMA_Nursery_AI_Agent_SPEC.md` | **D. HISTORICAL DOCUMENT** | Spesifikasi awal sistem agen AI |
| 2 | `SIGMA-RUBBER-NURSERY-STAKEHOLDER-REVIEW-BRIEF.md` | **D. HISTORICAL DOCUMENT** | Briefing tinjauan stakeholder |
| 3 | `SIGMA-RUBBER-NURSERY-STAKEHOLDER-SIGNOFF.md` | **D. HISTORICAL DOCUMENT** | Draft lembar persetujuan stakeholder |
| 4 | `docs/final-release/SIGMA-RUBBER-NURSERY-REQUIREMENT-BASELINE-FINAL.md` | **D. HISTORICAL DOCUMENT** | Snapshot requirement rilis sebelumnya |
| 5 | `docs/final-release/SIGMA-RUBBER-NURSERY-RTM-FINAL.md` | **D. HISTORICAL DOCUMENT** | Snapshot RTM rilis sebelumnya |
| 6 | `docs/final-release/SIGMA-RUBBER-NURSERY-PROCESS-FLOW-FINAL.md` | **D. HISTORICAL DOCUMENT** | Snapshot flow alur rilis sebelumnya |
| 7 | `docs/final-release/SIGMA-RUBBER-NURSERY-BUSINESS-RULES-FINAL.md` | **D. HISTORICAL DOCUMENT** | Snapshot aturan bisnis rilis sebelumnya |
| 8 | `docs/final-release/SIGMA-RUBBER-NURSERY-CHANGE-HISTORY-FINAL.md` | **D. HISTORICAL DOCUMENT** | Catatan riwayat perubahan rilis |
| 9 | `docs/final-release/SIGMA-RUBBER-NURSERY-FINAL-PACKAGE-INDEX.md` | **D. HISTORICAL DOCUMENT** | Indeks paket dokumen |
| 10 | `docs/final-release/SIGMA-RUBBER-NURSERY-FINAL-RELEASE-CHECKLIST.md` | **D. HISTORICAL DOCUMENT** | Checklist rilis |
| 11 | `docs/FINAL-BUSINESS-REQUIREMENT-RECONCILIATION.md` | **E. AUDIT / REPORT** | Laporan rekonsiliasi requirement |
| 12 | `docs/TASK-AUDIT-REKAP-REQUIREMENT-AKTUAL.md` | **E. AUDIT / REPORT** | Rekap audit requirement |
| 13 | `docs/TASK-BUSINESS-REQUIREMENT-RECONCILIATION.md` | **E. AUDIT / REPORT** | Dokumen rekonsiliasi bisnis |
| 14 | `TASK-10-FLOW-TRACEABILITY-FINAL.md` s/d `TASK-15.9.1-*.md` (25 Files) | **E. AUDIT / REPORT** | Riwayat log audit pengerjaan Task 10 – Task 15 |
| 15 | `AUDIT_FINAL_MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md` | **E. AUDIT / REPORT** | Laporan audit final Master Baseline Current |

---

## 4. Files Safe to Remove (Rekomendasi Penghapusan / Cleanup)

File-file berikut adalah artefak sementara, script uji coba ad-hoc lama, atau file backup redundan yang **aman untuk dihapus secara permanen** karena tidak memiliki ketergantungan runtime:

| No | Path File / Folder | Alasan Aman Dihapus |
|:---:|---|---|
| 1 | `data_old.json` | File cadangan usang yang sudah digantikan oleh `data/process-mapping-data.json` |
| 2 | `task15_2_search_results.json` | Artefak pencarian sementara |
| 3 | `portal_patch/backup-task10/` (Folder & 5 files) | Backup kode lama sebelum merger Task 10 |
| 4 | `portal_patch/backup-before-merge/` (Folder & 3 files) | Backup kode lama sebelum merger Phase 4 |
| 5 | `scratch/*.js`, `scratch/*.cjs`, `scratch/*.json` | 30+ file script sementara dari eksekusi audit/pengujian ad-hoc |
| 6 | `test-*.js` di root (13 test scripts ad-hoc lama yang menguji snapshot lama) | Telah digantikan oleh harness resmi terpusat di `scripts/validate-master-baseline.js` |

---

## 5. Files Must Keep as Archive (Arsip Permanen Terisolasi)

File-file yang **wajib dipertahankan sebagai arsip** agar jejak riwayat proyek tetap utuh, namun dipindahkan ke lokasi terisolasi (`docs/archive/`):

1. **`docs/archive/legacy/`**
   - `requirement.md` (Diberi label penanda *HISTORICAL SNAPSHOT*)
2. **`docs/archive/audit-reports/`**
   - Seluruh 25 file `TASK-*.md` di root directory
   - `docs/FINAL-BUSINESS-REQUIREMENT-RECONCILIATION.md`
   - `docs/TASK-AUDIT-REKAP-REQUIREMENT-AKTUAL.md`
   - `docs/TASK-BUSINESS-REQUIREMENT-RECONCILIATION.md`
   - `AUDIT_FINAL_MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md`
3. **`docs/archive/releases/`**
   - Seluruh file dalam `docs/final-release/`

---

## 6. Runtime Dependencies Analysis

Hasil audit ketergantungan runtime (`index.html`, `server.js`, `js/app.js`, `js/modules/process-mapping/*`):
- **Tidak ada satu pun file runtime yang mengimpor `requirement.md`**.
- **Tidak ada satu pun file runtime yang mengimpor `data_old.json`**.
- **Tidak ada satu pun file runtime yang mengimpor `portal_patch/backup-*/**`.
- **Tidak ada mekanisme auto-glob yang membaca `docs/` sebagai live requirement**.
- Runtime hanya mengimpor `js/data/process-mapping-baseline.js` dan membaca `data/process-mapping-data.json`.

---

## 7. Risk Assessment

| Tindakan Pembersihan | Risiko Operasional | Risiko Fungsional UI/Mobile | Mitigasi |
|---|:---:|:---:|---|
| Memindahkan `requirement.md` ke `docs/archive/legacy/` | **NOL** | **NOL** | Runtime murni membaca `process-mapping-baseline.js` |
| Menghapus `data_old.json` | **NOL** | **NOL** | `data/process-mapping-data.json` aktif dan lengkap |
| Menghapus `portal_patch/backup-*/` | **NOL** | **NOL** | Kode aktif berada di `js/modules/process-mapping/` |
| Mengarsipkan file `TASK-*.md` ke `docs/archive/audit-reports/` | **NOL** | **NOL** | Root directory menjadi bersih dan rapi |
| Membersihkan `scratch/` | **NOL** | **NOL** | Hanya berisi script ad-hoc temporary |

---

## 8. Status & Next Steps

> [!IMPORTANT]
> **AUDIT SELESAI — TIDAK ADA FILE YANG DIHAPUS PADA TAHAP INI.**  
> Pelaksanaan pemindahan/penghapusan file menunggu persetujuan eksplisit dari stakeholder.
