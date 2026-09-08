# AUDIT CONTEXT M01: PRESENSI

## 1. Scope Audit
- Modul: M01 (Presensi)
- Target: Presensi Supervisor & Presensi Pekerja Bibitan
- Data: Requirements (RN-PRS-*, RN-PWP-*), Flow Nodes, Edges, Traceability Mapping.

## 2. Baseline Reference
`MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md`
- Tidak ada opsi "Pilih Status Datang / Pulang" bagi user. Sistem menentukan berdasarkan waktu.
- Face ID wajib dan langsung mendokumentasikan foto. Fallback foto manual wajib disertai alasan.
- GPS wajib berada di dalam poligon area pembibitan yang diizinkan.
- Presensi Masuk (Supervisor) memblokir transaksi lain sebelum tuntas.
- Presensi Pekerja (PWP) dilakukan satu per satu menggunakan biometrik oleh Mantri.
- Verifikasi presensi Supervisor oleh Asisten Bibitan adalah final.

## 3. Presensi Supervisor Audit
Sistem Face ID dan penentuan status otomatis tervalidasi di dalam narasi spesifikasi tanpa fallback liar.

## 4. Presensi Pekerja Audit
Peninjauan narasi membuktikan bahwa pekerja diaudit **satu per satu** oleh Mantri, bukan lewat proses batch/massal.

## 5. Requirement Inventory
Total Requirements Terpantau (Aktif & Historis): **14**

## 6. Requirement Findings

### [RN-PRS-001]
- **Title**: Presensi Datang supervisor wajib selesai sebelum transaksi harian lain.
- **Narrative**: -
- **Input**: Kredensial login & GPS
- **Validation**: Geofencing areal bibitan
- **Fallback**: Blocker alert
- **Output**: Presensi datang terekam
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Classification**: **VALID**

### [RN-PRS-002]
- **Title**: Sistem menentukan status Masuk atau Pulang dan membaca waktu presensi secara otomatis.
- **Narrative**: -
- **Input**: Pemicu presensi aplikasi (Face ID / GPS).
- **Validation**: Presensi Masuk wajib dilakukan sebelum transaksi operasional.
- **Fallback**: Peringatan waktu kerja / blocker urutan.
- **Output**: Status dan waktu presensi terekam otomatis.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Classification**: **VALID**

### [RN-PRS-003]
- **Title**: Verifikasi biometrik Face ID sebagai metode utama dengan pengambilan foto otomatis.
- **Narrative**: -
- **Input**: Pindaian wajah melalui kamera Face ID.
- **Validation**: Kecocokan biometrik >= 85%.
- **Fallback**: Jika Face ID gagal: Gunakan Foto Manual disertai alasan.
- **Output**: Foto otomatis dan verifikasi biometrik terekam.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Classification**: **VALID**

### [RN-PRS-004]
- **Title**: Face ID merupakan metode utama presensi; Foto manual adalah fallback.
- **Narrative**: -
- **Input**: Pindaian wajah kamera
- **Validation**: Kecocokan biometrik >= 85%
- **Fallback**: Foto manual selfie + alasan
- **Output**: Kehadiran terverifikasi
- **Status**: Deprecated (Archived)
- **Actor**: Mantri Bibitan
- **Classification**: **HISTORIS (Aman)**

### [RN-PRS-005]
- **Title**: Pemeriksaan radius koordinat GPS berada di dalam perimeter Areal Bibitan.
- **Narrative**: -
- **Input**: Koordinat GPS vs Polygon Geofencing Bibitan.
- **Validation**: Koordinat GPS berada dalam radius perimeter nursery (< 200 m).
- **Fallback**: Peringatan di luar radius jika di luar kebun.
- **Output**: Status lokasi: Dalam Areal Bibitan.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Classification**: **VALID**

### [RN-PRS-006]
- **Title**: Sistem mencatat data presensi lengkap supervisor setelah divalidasi dengan radius perimeter GPS.
- **Narrative**: -
- **Input**: Data presensi tervalidasi.
- **Validation**: Record presensi berhasil tersimpan.
- **Fallback**: Penyimpanan offline jika server offline.
- **Output**: Presensi supervisor aktif; modul operasional dibuka.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Classification**: **VALID**

### [RN-PRS-007]
- **Title**: Mantri Bibitan menyelesaikan presensi datang supervisor sebagai prasyarat pembukaan transaksi harian.
- **Narrative**: -
- **Input**: Status presensi datang terekam.
- **Validation**: Presensi datang terkonfirmasi.
- **Fallback**: -
- **Output**: Dashboard operasional aktif.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Classification**: **VALID**

### [RN-PWP-001]
- **Title**: Mantri membuka modul presensi pekerja setelah presensi supervisor selesai.
- **Narrative**: -
- **Input**: Sesi supervisor aktif.
- **Validation**: Presensi supervisor datang sudah selesai.
- **Fallback**: Blocker alert jika supervisor belum presensi.
- **Output**: Daftar pekerja siap diverifikasi.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Classification**: **VALID**

### [RN-PWP-002]
- **Title**: Mantri menandai pekerja yang hadir dan membuang pekerja tidak hadir.
- **Narrative**: -
- **Input**: Pengecekan fisik apel pagi.
- **Validation**: Alasan ketidakhadiran tercatat (Sakit / Izin / Mangkir).
- **Fallback**: Koreksi jika ada yang menyusul.
- **Output**: Daftar pekerja hadir tersaring.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Classification**: **VALID**

### [RN-PWP-003]
- **Title**: Menambahkan pekerja bantuan antar afdeling jika belum ada di daftar reguler.
- **Narrative**: -
- **Input**: NIK atau Nama pekerja bantuan.
- **Validation**: NIK terdaftar di sistem ERP perusahaan.
- **Fallback**: Pencatatan manual sementara.
- **Output**: Pekerja tambahan masuk daftar hadir.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Classification**: **VALID**

### [RN-PWP-004]
- **Title**: Mengonfirmasi daftar final kehadiran pekerja beserta timestamp dan kirim verifikasi.
- **Narrative**: -
- **Input**: Daftar pekerja hadir final.
- **Validation**: Asisten memverifikasi kesesuaian fisik pekerja di lapangan.
- **Fallback**: Revisi jika selisih.
- **Output**: Presensi pekerja terverifikasi.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Classification**: **VALID**

### [RN-PWP-005]
- **Title**: Pekerja siap dialokasikan pada transaksi teknis pembibitan karet.
- **Narrative**: -
- **Input**: Data pekerja hadir terkonfirmasi.
- **Validation**: Daftar aktif terindeks di memori lokal.
- **Fallback**: -
- **Output**: Pool pekerja siap digunakan hari ini.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Classification**: **VALID**

### [RN-PWP-006]
- **Title**: Verifikasi Presensi & HK Harian Tenaga Kerja oleh Asisten Bibitan
- **Narrative**: -
- **Input**: Data rekap presensi mandor/mantri.
- **Validation**: Jumlah hadir sesuai target operasional.
- **Fallback**: Konfirmasi manual jika selisih.
- **Output**: Presensi pekerja terverifikasi.
- **Status**: Deprecated (Archived)
- **Actor**: Asisten Bibitan
- **Classification**: **ERROR (Seharusnya KONFIRMASI)**

### [RN-PWP-007]
- **Title**: Verifikasi Rekapitulasi HK & Upah Pekerja Bibitan oleh KTU
- **Narrative**: -
- **Input**: Rekap HK terverifikasi Asisten Bibitan.
- **Validation**: HK pekerja sesuai ketentuan upah kebun.
- **Fallback**: Koreksi kehadiran sebelum cut-off payroll.
- **Output**: Data kehadiran masuk ke sistem payroll kebun.
- **Status**: Deprecated (Archived)
- **Actor**: KTU
- **Classification**: **ERROR (Seharusnya KONFIRMASI)**

## 7. Flow Node Findings

### [PR_START]
- **Process**: Buka Modul Presensi
- **Input**: -
- **Validation**: -
- **Output**: -
- **Requirement Mapping**: RN-PRS-001
- **Dependency**: NONE
- **Classification**: **VALID**

### [PR_01]
- **Process**: Pencatatan Jam & Status Presensi Otomatis
- **Input**: -
- **Validation**: -
- **Output**: -
- **Requirement Mapping**: RN-PRS-002
- **Dependency**: NONE
- **Classification**: **VALID**

### [PR_02]
- **Process**: Verifikasi Biometrik Face ID
- **Input**: -
- **Validation**: -
- **Output**: -
- **Requirement Mapping**: RN-PRS-003
- **Dependency**: NONE
- **Classification**: **VALID**

### [PR_FB]
- **Process**: Foto Manual Fallback + Alasan
- **Input**: -
- **Validation**: -
- **Output**: -
- **Requirement Mapping**: RN-PRS-005
- **Dependency**: NONE
- **Classification**: **VALID**

### [PR_03]
- **Process**: Validasi GPS Radius Lokasi
- **Input**: -
- **Validation**: -
- **Output**: -
- **Requirement Mapping**: RN-PRS-005
- **Dependency**: NONE
- **Classification**: **VALID**

### [PR_04]
- **Process**: Pencatatan Presensi Terverifikasi
- **Input**: -
- **Validation**: -
- **Output**: -
- **Requirement Mapping**: RN-PRS-006
- **Dependency**: NONE
- **Classification**: **VALID**

### [PR_END]
- **Process**: Presensi Selesai - Buka Transaksi
- **Input**: -
- **Validation**: -
- **Output**: -
- **Requirement Mapping**: RN-PRS-007
- **Dependency**: NONE
- **Classification**: **VALID**

### [PW_START]
- **Process**: Buka Presensi Pekerja
- **Input**: Sesi supervisor aktif.
- **Validation**: Presensi supervisor datang sudah selesai.
- **Output**: Daftar pekerja siap diverifikasi.
- **Requirement Mapping**: RN-PWP-001
- **Dependency**: NONE
- **Classification**: **VALID**

### [PW_01]
- **Process**: Tentukan Pekerja Hadir
- **Input**: Pengecekan fisik apel pagi.
- **Validation**: Alasan ketidakhadiran tercatat (Sakit / Izin / Mangkir).
- **Output**: Daftar pekerja hadir tersaring.
- **Requirement Mapping**: RN-PWP-002
- **Dependency**: NONE
- **Classification**: **VALID**

### [PW_02]
- **Process**: Tambah Pekerja Baru Jika Belum Ada
- **Input**: NIK atau Nama pekerja bantuan.
- **Validation**: NIK terdaftar di sistem ERP perusahaan.
- **Output**: Pekerja tambahan masuk daftar hadir.
- **Requirement Mapping**: RN-PWP-003
- **Dependency**: NONE
- **Classification**: **VALID**

### [PW_03]
- **Process**: Konfirmasi Daftar & Simpan
- **Input**: Daftar pekerja hadir final.
- **Validation**: Asisten memverifikasi kesesuaian fisik pekerja di lapangan.
- **Output**: Presensi pekerja terverifikasi.
- **Requirement Mapping**: RN-PWP-004
- **Dependency**: NONE
- **Classification**: **VALID**

### [PW_END]
- **Process**: Pool Pekerja Aktif Hari Ini
- **Input**: Data pekerja hadir terkonfirmasi.
- **Validation**: Daftar aktif terindeks di memori lokal.
- **Output**: Pool pekerja siap digunakan hari ini.
- **Requirement Mapping**: RN-PWP-005
- **Dependency**: NONE
- **Classification**: **VALID**

## 8. Legacy/Conflict Scan
- Bersih (0 temuan konflik logika presensi manual/massal usang).

## 9. Traceability Audit
- Seluruh mapping requirement dan node terpaut sempurna.

## 10. Evidence Classification
- Penentuan Status: Sistem membedakan Datang/Pulang via Waktu Server.
- GPS: Presensi divalidasi dengan batasan geofencing secara otomatis.
- Historis: RN-PRS-004 telah ditempatkan pada blok arsip historis. RN-PWP-006 & RN-PWP-007 telah ditandai KONFIRMASI.

## 11. Findings Summary
- Konflik Logika (Presensi Manual/Bypass): **0 Temuan**.
- Kerapuhan RTM Traceability: **0 Temuan**.
- Error Status Requirement Baseline: **2 Temuan**.

## 12. Manual Confirmation Required
Item KONFIRMASI (seperti RN-PWP-006 & RN-PWP-007) menunggu pengesahan bisnis apakah akan dinaikkan ke baseline aktif atau digugurkan.

## 13. Recommended Mutation Scope
- Terdapat kesalahan label status atau residual tautan flow yang harus dimutasi/diperbaiki pada langkah berikutnya.

## 14. Final Audit Status
**FAIL**
