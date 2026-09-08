# AUDIT DEPENDENCY RN-SEM-005 & RN-SEM-007

## 1. Scope Audit
- Requirement: `RN-SEM-005` & `RN-SEM-007`
- Dependency langsung (Linked Nodes/Edges/Rules)
- Dependency tidak langsung (Narasi serumpun M03 Penyemaian)
- Memverifikasi keberadaan konsep kadaluarsa: *Umur kecambah*, *Transplanting*, *Polybag*, *Konsolidasi Bedengan*, dan syarat *Clone* pada tahapan penyemaian awal.

## 2. Baseline yang Digunakan
`MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md`
- Tidak ada target hari/umur kecambah spesifik (syarat kelayakan berdasarkan kondisi fisik aktual).
- Tidak ada validasi Clone (karena biji rootstock tidak memiliki Clone pada awal semai).
- Satu Bedengan menampung beberapa Batch.
- Tidak ada transplanting ke polybag.

## 3. Dependency RN-SEM-005
(Hasil pemindaian terhadap relasi langsung ID RN-SEM-005 pada RTM/Node Flow).
- **SEM_03** (Flow Node): Terhubung langsung sebagai node RN-SEM-005.

## 4. Dependency RN-SEM-007
(Hasil pemindaian terhadap relasi langsung ID RN-SEM-007 pada RTM/Node Flow).
- **SEM_04** (Flow Node): Terhubung langsung sebagai node RN-SEM-007.

## 5. Temuan Konflik / Indirect Dependencies
Ditemukan data yang mengandung narasi/kondisi teknis usang (Indirect Dependencies):

### [SEM_03] - Flow Node
- **Teks yang Ditemukan**: "Verifikasi Penaburan Bedengan oleh Asisten"
- **Konflik Baseline**: Direct dependency to RN-SEM-005. 
- **Rekomendasi Tindakan**: REVISI - Sesuaikan parameter Node dengan flow fisik aktual tanpa Clone/umur

### [SEM_04] - Flow Node
- **Teks yang Ditemukan**: "Konsolidasi Batch Bibitan Tanpa Clone"
- **Konflik Baseline**: Direct dependency to RN-SEM-007. syarat clone pada bedengan/batch awal
- **Rekomendasi Tindakan**: REVISI - Sesuaikan parameter Node dengan flow fisik aktual tanpa Clone/umur

## 6. Matriks Tindakan
- **VALID**: 0 Item (Seluruh temuan yang dicatat menyalahi Master Baseline).
- **REVISI**: 2 Item (Data/Node yang memuat konsep usang dan perlu penyesuaian parameter).
- **LEGACY CONTENT**: 0 Item (Terminologi usang terangkum ke dalam instruksi Revisi Node).
- **KONFIRMASI**: 0 Item.

## 7. Kesimpulan
Selain keberadaan RN-SEM-005 dan RN-SEM-007 itu sendiri, **terdapat Node Flow dan properti turunan (indirect dependency) di modul M03 yang perlu direvisi secara teknis**. Node-node tersebut masih menggunakan asumsi bahwa validasi "12-15 hari", "Clone seragam", dan "transplanting ke polybag" masih berlaku, sehingga *Business Logic* dalam flow M03 saat ini **TIDAK SEJALAN** dengan Master Baseline aktif.

## 8. Daftar Data yang Aman untuk Tidak Diubah
Sebagian besar *requirement* dan *flow node* M03 lainnya sudah aman:
- RN-SEM-001 (Requirement)
- RN-SEM-002 (Requirement)
- RN-SEM-003 (Requirement)
- RN-SEM-004 (Requirement)
- RN-SEM-006 (Requirement)
- RN-SEM-008 (Requirement)
- RN-SEM-TP028 (Requirement)
- RN-SEM-TP029 (Requirement)
- RN-SEM-TP030 (Requirement)
- RN-SEM-TP031 (Requirement)
- ...(dan 10 item lainnya yang lolos seleksi).
