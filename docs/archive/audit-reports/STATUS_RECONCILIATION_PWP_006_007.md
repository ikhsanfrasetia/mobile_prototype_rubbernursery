# STATUS RECONCILIATION — RN-PWP-006 & RN-PWP-007

## 1. Tabel Rekonsiliasi

| Req ID | Status JSON | Status Master Baseline | Evidence | Keputusan |
| :--- | :--- | :--- | :--- | :--- |
| **RN-PWP-006** | `Deprecated` (isArchived: true) | **KONFIRMASI** | Master Baseline (Bagian 3: M01 - Catatan baseline: "...diperlakukan sebagai KONFIRMASI") | **MISMATCH — NEED REVISION** |
| **RN-PWP-007** | `Deprecated` (isArchived: true) | **KONFIRMASI** | Master Baseline (Bagian 3: M01 - Catatan baseline: "...diperlakukan sebagai KONFIRMASI") | **MISMATCH — NEED REVISION** |

## 2. Kesimpulan Analisis

### A. Apakah kedua requirement memang harus KONFIRMASI?
**YA.** 
Sesuai dengan `MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md` pada bagian M01 Presensi (Baris 73), tertulis sangat eksplisit:
> *"Requirement RN-PWP-006 dan RN-PWP-007 yang sebelumnya muncul dari gap-resolution diperlakukan sebagai KONFIRMASI, bukan requirement terkonfirmasi."*

Status `KONFIRMASI` memiliki definisi mandiri dalam *Master Baseline* sebagai: *"belum boleh dianggap sebagai requirement final"* dan dilarang untuk diaktifkan (`jangan aktifkan`).

### B. Apakah salah satu/keduanya harus tetap Archived?
**YA.**
Karena status `KONFIRMASI` secara tegas diklasifikasikan sebagai *"jangan aktifkan"* dan *"belum disepakati"*, secara teknis sistem (JSON) **wajib** mempertahankan _flag_ `isArchived: true` untuk menahan requirement tersebut agar tidak bocor dan tereksekusi ke dalam operasi *active baseline*.
Bahkan, Master Baseline menegaskan bahwa role KTU (aktor di `RN-PWP-007`) statusnya "KOSONG DULU" tanpa requirement aktif. Jika di-unarchive, `RN-PWP-007` akan menyalahi larangan tersebut.

### C. Apakah ada dasar yang sah untuk melakukan mutation?
**YA, Terdapat Dasar Mutasi yang Sah (Namun Hanya Terbatas pada Atribut Label Status).**
Secara fungsional, posisi *archived* mereka sudah benar dan mutlak tidak boleh di-*unarchive*. Namun, atribut `status` dalam JSON tercatat sebagai `"Deprecated"` yang secara teknis kurang persis dengan tata bahasa yang dikunci *Master Baseline*. 

Dasar mutasinya adalah untuk menyelaraskan nilai string `status` menjadi `"KONFIRMASI"` sesuai mandat dokumen sumber, **sambil tetap mengunci ketat** `isArchived: true` agar wujud fungsionalnya tetap menjadi arsip tak aktif. 

*Catatan: Sesuai mode "AUDIT ONLY", tidak ada perubahan data aktual yang dilakukan pada peninjauan ini.*
