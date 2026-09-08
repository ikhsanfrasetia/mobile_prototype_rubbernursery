# AUDIT CONTEXT M05 PEMERIKSAAN

## 1. Scope Audit
- Modul: M05 (Pemeriksaan)
- Data: Requirements (RN-CHK-*), Flow Nodes, Edges, Traceability Mapping.
- Proses: Pemeriksaan Bertahap Grafting & Regrafting.

## 2. Baseline Reference
`MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md`
1. Pemeriksaan bersifat partial/dynamic, jumlah diperiksa ditentukan pada saat transaksi.
2. Hasil pemeriksaan: Berhasil atau Gagal. (Berhasil + Gagal = Jumlah Diperiksa).
3. Gagal tidak otomatis menjadi Reject. Mantri yang menentukan tindak lanjut (Regrafting / Reject).
4. Pemeriksaan tidak mengurangi populasi/stok secara langsung.

## 3. Requirement Inventory
Total Active Requirements M05 (CHK): **17**

## 4. Requirement Findings

### [RN-CHK-001]
- **Title**: Pemeriksaan bersifat dinamis dan dapat dilakukan bertahap.
- **Narrative**: -
- **Input**: Dokumen berkewajiban periksa
- **Validation**: Jumlah periksa <= sisa periksa
- **Fallback**: Sisa tetap muncul di antrean
- **Output**: Hasil berhasil vs gagal
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Verifier**: Asisten Bibitan
- **Classification**: **VALID**

### [RN-CHK-002]
- **Title**: Bibit gagal dapat ditentukan untuk Regrafting ulang atau Reject.
- **Narrative**: -
- **Input**: Kuantitas bibit gagal
- **Validation**: Pilihan Mantri: Regrafting vs Reject
- **Fallback**: Tidak dibatasi 1x regrafting
- **Output**: Tindak lanjut terdaftar
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Verifier**: Asisten Bibitan
- **Classification**: **VALID**

### [RN-CHK-003]
- **Title**: Validasi fisik QR Code Batch yang diperiksa.
- **Narrative**: -
- **Input**: QR Code Batch fisik.
- **Validation**: Batch cocok dengan dokumen okulasi.
- **Fallback**: Pilih manual jika QR rusak.
- **Output**: Batch tervalidasi.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Verifier**: Asisten Bibitan
- **Classification**: **VALID**

### [RN-CHK-004]
- **Title**: Menginput jumlah batang yang diperiksa pada sesi ini (misal 600 dari 1.000).
- **Narrative**: -
- **Input**: Jumlah bibit diperiksa.
- **Validation**: Jumlah diperiksa <= sisa belum periksa.
- **Fallback**: -
- **Output**: Sisa pemeriksaan tetap tersimpan.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Verifier**: Asisten Bibitan
- **Classification**: **VALID**

### [RN-CHK-005]
- **Title**: Mencatat jumlah mata tempelan yang hijau (berhasil) vs hitam/mati (gagal).
- **Narrative**: -
- **Input**: Jumlah berhasil dan jumlah gagal.
- **Validation**: Total Berhasil + Gagal = Jumlah Diperiksa.
- **Fallback**: Hitung ulang jika ada selisih.
- **Output**: Data perolehan berhasil & gagal tersimpan.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Verifier**: Asisten Bibitan
- **Classification**: **VALID**

### [RN-CHK-006]
- **Title**: Mantri menentukan tindak lanjut bibit yang gagal: Regrafting atau Reject.
- **Narrative**: -
- **Input**: Kuantitas bibit gagal dan kondisi visual batang.
- **Validation**: Keputusan ditentukan sepenuhnya oleh Mantri Bibitan.
- **Fallback**: Konsultasi Asisten jika ragu.
- **Output**: Kuota regrafting atau reject tercatat.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Verifier**: Asisten Bibitan
- **Classification**: **VALID**

### [RN-CHK-007]
- **Title**: Foto bukti fisik mata tempelan berhasil dan gagal beserta watermark.
- **Narrative**: -
- **Input**: Foto mata tunas okulasi.
- **Validation**: Foto wajib diunggah.
- **Fallback**: Ambil ulang foto.
- **Output**: Foto audit tersimpan.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Verifier**: Asisten Bibitan
- **Classification**: **VALID**

### [RN-CHK-008]
- **Title**: Mengirim hasil pemeriksaan ke Asisten Bibitan untuk disetujui.
- **Narrative**: -
- **Input**: Data pemeriksaan lengkap.
- **Validation**: Jika disetujui, data masuk server production.
- **Fallback**: Koreksi jika ada selisih hitung.
- **Output**: Status: Terverifikasi.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Verifier**: Asisten Bibitan
- **Classification**: **VALID**

### [RN-CHK-009]
- **Title**: Pemeriksaan tuntas; bibit berhasil lanjut tumbuh, bibit gagal siap diregrafting.
- **Narrative**: -
- **Input**: Status verified.
- **Validation**: -
- **Fallback**: -
- **Output**: Data siap untuk siklus selanjutnya.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Verifier**: Asisten Bibitan
- **Classification**: **VALID**

### [RN-CHK-RG036]
- **Title**: Pemeriksaan bersifat dinamis dan dapat dilakukan bertahap.
- **Narrative**: -
- **Input**: Dokumen berkewajiban periksa
- **Validation**: Jumlah periksa <= sisa periksa
- **Fallback**: Sisa tetap muncul di antrean
- **Output**: Hasil berhasil vs gagal
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Verifier**: Asisten Bibitan
- **Classification**: **KONFIRMASI**

### [RN-CHK-RG037]
- **Title**: Bibit gagal dapat ditentukan untuk Regrafting kembali atau Reject.
- **Narrative**: -
- **Input**: Kuantitas bibit gagal
- **Validation**: Pilihan Mantri: Regrafting vs Reject
- **Fallback**: Tidak dibatasi 1x regrafting
- **Output**: Tindak lanjut terdaftar
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Verifier**: Asisten Bibitan
- **Classification**: **KONFIRMASI**

### [RN-CHK-RG038]
- **Title**: Validasi fisik QR Code Batch yang diperiksa.
- **Narrative**: -
- **Input**: QR Code Batch fisik.
- **Validation**: Batch cocok dengan dokumen okulasi.
- **Fallback**: Pilih manual jika QR rusak.
- **Output**: Batch tervalidasi.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Verifier**: Asisten Bibitan
- **Classification**: **KONFIRMASI**

### [RN-CHK-RG039]
- **Title**: Menginput jumlah batang yang diperiksa pada sesi ini (misal 600 dari 1.000).
- **Narrative**: -
- **Input**: Jumlah bibit diperiksa.
- **Validation**: Jumlah diperiksa <= sisa belum periksa.
- **Fallback**: -
- **Output**: Sisa pemeriksaan tetap tersimpan.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Verifier**: Asisten Bibitan
- **Classification**: **KONFIRMASI**

### [RN-CHK-RG040]
- **Title**: Mencatat jumlah mata tempelan yang hijau (berhasil) vs hitam/mati (gagal).
- **Narrative**: -
- **Input**: Jumlah berhasil dan jumlah gagal.
- **Validation**: Total Berhasil + Gagal = Jumlah Diperiksa.
- **Fallback**: Hitung ulang jika ada selisih.
- **Output**: Data perolehan berhasil & gagal tersimpan.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Verifier**: Asisten Bibitan
- **Classification**: **KONFIRMASI**

### [RN-CHK-RG041]
- **Title**: Mantri menentukan tindak lanjut bibit yang gagal: Regrafting kembali atau Reject.
- **Narrative**: -
- **Input**: Kuantitas bibit gagal dan kondisi visual batang.
- **Validation**: Keputusan ditentukan sepenuhnya oleh Mantri Bibitan.
- **Fallback**: Konsultasi Asisten jika ragu.
- **Output**: Kuota regrafting atau reject tercatat.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Verifier**: Asisten Bibitan
- **Classification**: **KONFIRMASI**

### [RN-CHK-RG043]
- **Title**: Mengirim hasil pemeriksaan ke Asisten Bibitan untuk disetujui.
- **Narrative**: -
- **Input**: Data pemeriksaan lengkap.
- **Validation**: Jika disetujui, data masuk server production.
- **Fallback**: Koreksi jika ada selisih hitung.
- **Output**: Status: Terverifikasi.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Verifier**: Asisten Bibitan
- **Classification**: **KONFIRMASI**

### [RN-CHK-RG044]
- **Title**: Pemeriksaan tuntas; bibit berhasil lanjut tumbuh, bibit gagal siap di-Regrafting kembali atau di-Reject.
- **Narrative**: -
- **Input**: Status verified.
- **Validation**: -
- **Fallback**: -
- **Output**: Data siap untuk siklus selanjutnya.
- **Status**: Confirmed
- **Actor**: Mantri Bibitan
- **Verifier**: Asisten Bibitan
- **Classification**: **KONFIRMASI**

## 5. Flow Node Findings

### [CHK_START]
- **Process**: Buka Pemeriksaan
- **Input**: Sesi Mantri Bibitan aktif
- **Validation**: Mantri telah presensi datang.
- **Output**: Daftar dokumen kewajiban pemeriksaan tampil.
- **Requirement Mapping**: RN-CHK-001
- **Dependency**: NONE
- **Classification**: **VALID**

### [CHK_01]
- **Process**: Pilih Dokumen Okulasi
- **Input**: Daftar dokumen okulasi aktif.
- **Validation**: Dokumen memiliki sisa bibit yang belum diperiksa.
- **Output**: Dokumen dan batch terpilih.
- **Requirement Mapping**: RN-CHK-002
- **Dependency**: NONE
- **Classification**: **VALID**

### [CHK_02]
- **Process**: Scan QR Batch
- **Input**: QR Code Batch fisik.
- **Validation**: Batch cocok dengan dokumen okulasi.
- **Output**: Batch tervalidasi.
- **Requirement Mapping**: RN-CHK-003
- **Dependency**: NONE
- **Classification**: **VALID**

### [CHK_03]
- **Process**: Input Bibit Diperiksa Bertahap
- **Input**: Jumlah bibit diperiksa.
- **Validation**: Jumlah diperiksa <= sisa belum periksa.
- **Output**: Sisa pemeriksaan tetap tersimpan.
- **Requirement Mapping**: RN-CHK-004
- **Dependency**: NONE
- **Classification**: **VALID**

### [CHK_04]
- **Process**: Input Berhasil & Gagal
- **Input**: Jumlah berhasil dan jumlah gagal.
- **Validation**: Total Berhasil + Gagal = Jumlah Diperiksa.
- **Output**: Data perolehan berhasil & gagal tersimpan.
- **Requirement Mapping**: RN-CHK-005
- **Dependency**: NONE
- **Classification**: **VALID**

### [CHK_05]
- **Process**: Tindak Lanjut Bibit Gagal
- **Input**: Kuantitas bibit gagal dan kondisi visual batang.
- **Validation**: Keputusan ditentukan sepenuhnya oleh Mantri Bibitan.
- **Output**: Kuota regrafting atau reject tercatat.
- **Requirement Mapping**: RN-CHK-006
- **Dependency**: NONE
- **Classification**: **VALID**

### [CHK_06]
- **Process**: Dokumentasi Foto + Timestamp
- **Input**: Foto mata tunas okulasi.
- **Validation**: Foto wajib diunggah.
- **Output**: Foto audit tersimpan.
- **Requirement Mapping**: RN-CHK-007
- **Dependency**: NONE
- **Classification**: **VALID**

### [CHK_07]
- **Process**: Submit & Verifikasi Asisten
- **Input**: Data pemeriksaan lengkap.
- **Validation**: Jika disetujui, data masuk server production.
- **Output**: Status: Terverifikasi.
- **Requirement Mapping**: RN-CHK-008
- **Dependency**: NONE
- **Classification**: **VALID**

### [CHK_END]
- **Process**: Selesai Pemeriksaan
- **Input**: Status verified.
- **Validation**: -
- **Output**: Data siap untuk siklus selanjutnya.
- **Requirement Mapping**: RN-CHK-009
- **Dependency**: NONE
- **Classification**: **VALID**

## 6. Legacy/Conflict Scan
- Bersih (0 temuan konflik logika stok otomatis/populasi).

## 7. Traceability Audit
- Seluruh mapping requirement dan node terpaut sempurna.

## 8. Evidence Classification
- **Validasi Flow Inti**: Pemeriksaan parsial diakomodasi.
- **Keputusan Tindak Lanjut**: Sepenuhnya diatur oleh Mantri, sistem tidak memotong stok secara membabi-buta.

## 9. Requirement Gap-Resolution Review
Kelompok `RN-CHK-RG036` s.d. `RN-CHK-RG044` teridentifikasi sebagai *gap-resolution legacy* untuk fitur *Pemeriksaan Regrafting*.
Berdasarkan baseline saat ini, persyaratan tersebut belum disahkan penuh dan secara langsung duplikatif dengan siklus pemeriksaan utama (RN-CHK-001 s.d. 009), sehingga secara hierarki diubah klasifikasinya menjadi **KONFIRMASI**.

## 10. Findings Summary
- Konflik Logika (Otomatisasi Stok/Mati): **0 Temuan**.
- Kerapuhan RTM Traceability: **0 Temuan**.
- Gap-Resolution Unconfirmed: **9 Requirements**.

## 11. Recommended Mutation Scope
- **Review Ulang Duplikasi**: Pastikan bisnis benar-benar membutuhkan blok `RN-CHK-RG*` secara terpisah, atau cukup digabung/diakomodasi dalam *flow* pemeriksaan utama.
- **Isolasi Logika**: Entitas yang mengandung teks terlarang (jika ada) harus direvisi tanpa merusak sisa *node*.

## 12. Manual Confirmation Required
Daftar entitas yang menunggu keputusan bisnis final sebelum mutasi diperkenankan:
- RN-CHK-RG036
- RN-CHK-RG037
- RN-CHK-RG038
- RN-CHK-RG039
- RN-CHK-RG040
- RN-CHK-RG041
- RN-CHK-RG042
- RN-CHK-RG043
- RN-CHK-RG044

## 13. Final Audit Status
**PASS WITH FINDINGS**
