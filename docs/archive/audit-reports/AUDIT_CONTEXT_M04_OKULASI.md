# AUDIT CONTEXT M04 OKULASI (GRAFTING)

## 1. Scope Audit
- Modul: M04 (Okulasi)
- Data: Requirements (RN-OKL-*), Flow Nodes, Edges, RTM Mapping.
- Proses: Okulasi (Grafting), Validasi Material Entres, Traceability Batch.

## 2. Baseline Reference
`MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md`
1. Feature naming wajib "Okulasi (Grafting)".
2. Material Okulasi bersumber dari Kebun Kayu Okulasi.
3. Transaksi Okulasi tidak menghilangkan lot awal dalam Batch.
4. Clone belum ada di tahap semai, dibentuk dari proses okulasi ini.
5. Tidak ada asumsi otomatis kurangi populasi stok.

## 3. Requirement Inventory
Total Active Requirements M04: **25**

## 4. Requirement Findings

### [RN-OKL-001]
- **Title**: Mantri Bibitan memilih Batch tanaman bawah (seedling) yang telah memenuhi kriteria diameter siap okulasi.
- **Narrative**: -
- **Input**: Daftar batch aktif
- **Validation**: Batch harus berstatus aktif
- **Fallback**: Pencarian manual nomor petak
- **Output**: Batch terpilih
- **Status**: Confirmed
- **Classification**: **VALID**

### [RN-OKL-002]
- **Title**: Mantri memilih Batch yang akan diproses pada proses Okulasi (Grafting).
- **Narrative**: Mantri memilih Batch yang akan diproses pada proses Okulasi (Grafting).
- **Input**: QR Code Batch fisik
- **Validation**: Batch valid & koordinat sesuai
- **Fallback**: Pilih manual jika QR rusak
- **Output**: Batch terkonfirmasi
- **Status**: Confirmed
- **Classification**: **VALID**

### [RN-OKL-003]
- **Title**: Menampilkan saldo populasi aktif dan batas maksimum okulasi harian pada batch terpilih.
- **Narrative**: -
- **Input**: Data populasi hidup
- **Validation**: Populasi > 0
- **Fallback**: Sinkronisasi ulang
- **Output**: Populasi acuan tampil
- **Status**: Confirmed
- **Classification**: **VALID**

### [RN-OKL-005]
- **Title**: Validasi kesesuaian varietas clone kayu entres terhadap rencana penempelan batch.
- **Narrative**: -
- **Input**: QR Code Plot Entres
- **Validation**: QR cocok dengan master clone
- **Fallback**: Pilih plot manual
- **Output**: Plot entres valid
- **Status**: Confirmed
- **Classification**: **LEGACY / REVISI**

### [RN-OKL-006]
- **Title**: Pilih material Mata Entres dari Kebun Kayu Okulasi yang valid.
- **Narrative**: -
- **Input**: Barcode / identitas material Mata Entres Kebun Kayu Okulasi.
- **Validation**: Estimasi merupakan referensi, bukan stok
- **Fallback**: Penyesuaian manual
- **Output**: Angka estimasi mata entres
- **Status**: Confirmed
- **Classification**: **VALID**

### [RN-OKL-007]
- **Title**: Mata entres aktual menjadi pengurang stok setelah verifikasi.
- **Narrative**: -
- **Input**: Kuantitas mata entres aktual
- **Validation**: Verifikasi Asisten Bibitan disetujui
- **Fallback**: Logging mutasi sistem
- **Output**: Stok mata entres terpotong
- **Status**: Confirmed
- **Classification**: **LEGACY / REVISI**

### [RN-OKL-008]
- **Title**: Menginput jumlah batang/cabang kayu entres yang diambil dari plot.
- **Narrative**: -
- **Input**: Jumlah cabang kayu okulasi (angka integer).
- **Validation**: Kuantitas cabang > 0.
- **Fallback**: Koreksi manual jika terdapat cabang yang patah/rusak.
- **Output**: Nilai jumlah cabang tersimpan.
- **Status**: Confirmed
- **Classification**: **LEGACY / REVISI**

### [RN-OKL-010]
- **Title**: Mencatat kuantitas mata entres aktual yang berhasil ditempelkan.
- **Narrative**: -
- **Input**: Jumlah mata entres yang terpakai riil.
- **Validation**: Mata entres aktual <= stok tersedia pada Plot Entres + Clone.
- **Fallback**: Pemberitahuan peringatan jika melebihi stok terverifikasi.
- **Output**: Data kuantitas mata entres aktual tersimpan.
- **Status**: Confirmed
- **Classification**: **LEGACY / REVISI**

### [RN-OKL-011]
- **Title**: Pengambilan foto dokumentasi fisik kegiatan okulasi beserta watermark timestamp.
- **Narrative**: -
- **Input**: Foto kamera langsung kegiatan okulasi / ikatan okulasi.
- **Validation**: Foto wajib ada (tidak boleh kosong), timestamp valid hari ini.
- **Fallback**: Ambil ulang jika foto buram / gelap.
- **Output**: Berkas gambar terkompresi dengan metadata audit tersimpan.
- **Status**: Confirmed
- **Classification**: **VALID**

### [RN-OKL-012]
- **Title**: Mengirim berkas transaksi okulasi ke antrean verifikasi Asisten.
- **Narrative**: -
- **Input**: Seluruh formulir data transaksi okulasi lengkap.
- **Validation**: Semua validasi mandatory terpenuhi (QR, pekerja, entres, foto).
- **Fallback**: Tersimpan di offline queue jika jaringan offline.
- **Output**: Nomor transaksi diterbitkan berstatus Menunggu Verifikasi.
- **Status**: Confirmed
- **Classification**: **LEGACY / REVISI**

### [RN-OKL-013]
- **Title**: Pemeriksaan lapangan dan persetujuan transaksi oleh Asisten Bibitan.
- **Narrative**: -
- **Input**: Data transaksi Mantri, foto dokumentasi, dan inspeksi fisik petak.
- **Validation**: Jika ditolak, berkas kembali ke Mantri untuk direvisi.
- **Fallback**: Pemberian catatan perbaikan spesifik oleh Asisten jika ditolak.
- **Output**: Status transaksi berubah menjadi Terverifikasi.
- **Status**: Confirmed
- **Classification**: **VALID**

### [RN-OKL-014]
- **Title**: Pengurangan stok mata entres terverifikasi pada Plot Entres + Clone.
- **Narrative**: Belum didefinisikan pada baseline.
- **Input**: Kuantitas mata entres aktual yang telah diverifikasi Asisten.
- **Validation**: Stok tidak boleh minus.
- **Fallback**: Logging transaksi mutasi sistem.
- **Output**: Saldo stok terpotong, tercatat dalam ledger material.
- **Status**: Revisi
- **Classification**: **REVISI**

### [RN-OKL-015]
- **Title**: Transaksi okulasi grafting berhasil diselesaikan dan masuk basis data produksi.
- **Narrative**: -
- **Input**: Transaksi terverifikasi server production.
- **Validation**: Status transaksi: Terverifikasi Production.
- **Fallback**: Pencetakan laporan ringkasan jika diperlukan.
- **Output**: Data tersinkron penuh ke server production.
- **Status**: Confirmed
- **Classification**: **VALID**

### [RN-REG-000]
- **Title**: Inisialisasi transaksi okulasi ulang (regrafting) untuk bibit yang gagal pada pemeriksaan.
- **Narrative**: -
- **Input**: Dokumen riwayat pemeriksaan yang menetapkan tindak lanjut Regrafting.
- **Validation**: Tersedia bibit gagal dengan tindak lanjut Regrafting pada batch terpilih.
- **Fallback**: Pemberitahuan jika tidak ada bibit yang perlu di-regrafting.
- **Output**: Formulir regrafting aktif.
- **Status**: Confirmed
- **Classification**: **VALID**

### [RN-REG-001]
- **Title**: Memilih batch dan dokumen hasil pemeriksaan yang memiliki tindak lanjut regrafting.
- **Narrative**: -
- **Input**: Daftar dokumen pemeriksaan yang memerlukan regrafting.
- **Validation**: Dokumen pemeriksaan harus berstatus valid dan memiliki sisa kuota regrafting.
- **Fallback**: Pencarian batch manual.
- **Output**: Batch dan kuota bibit siap regrafting terpilih.
- **Status**: Confirmed
- **Classification**: **VALID**

### [RN-REG-002]
- **Title**: Validasi fisik QR Code Batch sebelum melakukan regrafting.
- **Narrative**: -
- **Input**: QR Code Batch fisik.
- **Validation**: Batch harus cocok dengan dokumen sumber pemeriksaan.
- **Fallback**: Pilih manual jika QR rusak.
- **Output**: Batch terverifikasi fisik.
- **Status**: Confirmed
- **Classification**: **VALID**

### [RN-REG-003]
- **Title**: Memeriksa jumlah batang bibit gagal yang berhak menerima penempelan ulang.
- **Narrative**: -
- **Input**: Nilai bibit gagal dari dokumen pemeriksaan.
- **Validation**: Jumlah regrafting <= jumlah bibit gagal pada dokumen sumber.
- **Fallback**: Peringatan validasi jika melebihi kuota.
- **Output**: Batas maksimum regrafting divalidasi.
- **Status**: Confirmed
- **Classification**: **VALID**

### [RN-REG-004]
- **Title**: Menginput jumlah bibit yang diokulasi ulang dan pekerja pelaksana.
- **Narrative**: -
- **Input**: Jumlah batang di-regrafting dan nama pekerja.
- **Validation**: Pekerja hadir pada presensi hari ini.
- **Fallback**: Daftar pekerja cadangan.
- **Output**: Rincian regrafting per pekerja tersimpan.
- **Status**: Confirmed
- **Classification**: **VALID**

### [RN-REG-005]
- **Title**: Memilih plot kebun entres dan memindai QR fisik plot penyedia mata tunas.
- **Narrative**: -
- **Input**: QR Code Plot Entres.
- **Validation**: Clone entres harus sama dengan clone batch yang diregrafting.
- **Fallback**: Pilih plot manual dengan persetujuan.
- **Output**: Plot entres terverifikasi.
- **Status**: Confirmed
- **Classification**: **LEGACY / REVISI**

### [RN-REG-006]
- **Title**: Mencatat jumlah mata entres aktual yang digunakan untuk regrafting.
- **Narrative**: -
- **Input**: Jumlah mata tunas terpakai.
- **Validation**: Nilai aktual <= saldo stok Plot Entres + Clone.
- **Fallback**: Peringatan stok tidak cukup.
- **Output**: Nilai mata entres aktual tersimpan di form.
- **Status**: Confirmed
- **Classification**: **LEGACY / REVISI**

### [RN-REG-007]
- **Title**: Pengambilan foto dokumentasi ikatan regrafting dan watermark timestamp.
- **Narrative**: -
- **Input**: Foto kamera batang regrafting.
- **Validation**: Foto wajib terunggah.
- **Fallback**: Ambil ulang jika hasil foto buram.
- **Output**: Foto bukti audit tersimpan.
- **Status**: Confirmed
- **Classification**: **VALID**

### [RN-REG-008]
- **Title**: Mengirimkan berkas regrafting ke antrean verifikasi Asisten Bibitan.
- **Narrative**: -
- **Input**: Seluruh formulir data regrafting.
- **Validation**: Data lengkap dan valid.
- **Fallback**: Tersimpan lokal di offline sync queue jika jaringan offline.
- **Output**: Transaksi terkirim berstatus Menunggu Verifikasi.
- **Status**: Confirmed
- **Classification**: **VALID**

### [RN-REG-009]
- **Title**: Pemeriksaan mutu tempelan ulang dan persetujuan oleh Asisten Bibitan.
- **Narrative**: -
- **Input**: Data transaksi regrafting dan inspeksi fisik.
- **Validation**: Jika disetujui, transaksi berstatus Terverifikasi.
- **Fallback**: Pengembalian berkas dengan catatan perbaikan.
- **Output**: Transaksi regrafting sah.
- **Status**: Confirmed
- **Classification**: **VALID**

### [RN-REG-010]
- **Title**: Pemotongan stok resmi mata entres pada Plot Entres + Clone.
- **Narrative**: -
- **Input**: Data kuantitas mata entres aktual yang telah diverifikasi.
- **Validation**: Stok tersedia cukup.
- **Fallback**: Audit log mutasi.
- **Output**: Saldo mata entres terpotong.
- **Status**: Confirmed
- **Classification**: **LEGACY / REVISI**

### [RN-REG-011]
- **Title**: Regrafting selesai dan siap diperiksa pada jadwal pemeriksaan berikutnya.
- **Narrative**: -
- **Input**: Transaksi terverifikasi production.
- **Validation**: Tercatat dalam jadwal pemeriksaan.
- **Fallback**: -
- **Output**: Data tersinkron penuh ke server production.
- **Status**: Confirmed
- **Classification**: **VALID**

## 5. Flow Node Findings

### [N_START]
- **Req Mapping**: RN-OKL-001
- **Process**: Pilih Batch Bibitan
- **Input**: -
- **Validation**: -
- **Output**: -
- **Dependency**: NONE
- **Classification**: **VALID**

### [N_P001]
- **Req Mapping**: RN-OKL-002
- **Process**: Tentukan Populasi yang Diokulasi
- **Input**: -
- **Validation**: -
- **Output**: -
- **Dependency**: NONE
- **Classification**: **VALID**

### [N_P002]
- **Req Mapping**: RN-OKL-003
- **Process**: Scan QR Batch & Validasi Fisik
- **Input**: -
- **Validation**: -
- **Output**: -
- **Dependency**: NONE
- **Classification**: **VALID**

### [N_P003]
- **Req Mapping**: RN-OKL-006
- **Process**: Pilih Material Mata Entres dari Kebun Kayu Okulasi
- **Input**: -
- **Validation**: -
- **Output**: -
- **Dependency**: NONE
- **Classification**: **VALID**

### [N_P004]
- **Req Mapping**: RN-OKL-005
- **Process**: Catat Hasil Grafting & Pekerja Pelaksana
- **Input**: -
- **Validation**: -
- **Output**: -
- **Dependency**: NONE
- **Classification**: **VALID**

### [N_P005]
- **Req Mapping**: RN-OKL-008
- **Process**: Dokumentasi Foto Ikatan Okulasi & Timestamp
- **Input**: -
- **Validation**: -
- **Output**: -
- **Dependency**: NONE
- **Classification**: **VALID**

### [N_P006]
- **Req Mapping**: RN-OKL-011
- **Process**: Kirim Pengajuan Okulasi ke Asisten Bibitan
- **Input**: -
- **Validation**: -
- **Output**: -
- **Dependency**: NONE
- **Classification**: **VALID**

### [N_P007]
- **Req Mapping**: RN-OKL-013
- **Process**: Pemeriksaan Lapangan & Verifikasi Asisten Bibitan
- **Input**: -
- **Validation**: -
- **Output**: -
- **Dependency**: NONE
- **Classification**: **VALID**

### [N_END]
- **Req Mapping**: RN-OKL-015
- **Process**: Okulasi Selesai Terverifikasi (Siap Pemeriksaan)
- **Input**: -
- **Validation**: -
- **Output**: -
- **Dependency**: NONE
- **Classification**: **VALID**

### [RG_START]
- **Req Mapping**: RN-REG-000
- **Process**: Mulai Regrafting
- **Input**: Dokumen riwayat pemeriksaan yang menetapkan tindak lanjut Regrafting.
- **Validation**: Tersedia bibit gagal dengan tindak lanjut Regrafting pada batch terpilih.
- **Output**: Formulir regrafting aktif.
- **Dependency**: NONE
- **Classification**: **VALID**

### [RG_01]
- **Req Mapping**: RN-REG-001
- **Process**: Pilih Batch & Sumber Pemeriksaan
- **Input**: Daftar dokumen pemeriksaan yang memerlukan regrafting.
- **Validation**: Dokumen pemeriksaan harus berstatus valid dan memiliki sisa kuota regrafting.
- **Output**: Batch dan kuota bibit siap regrafting terpilih.
- **Dependency**: NONE
- **Classification**: **VALID**

### [RG_02]
- **Req Mapping**: RN-REG-002
- **Process**: Scan QR Batch
- **Input**: QR Code Batch fisik.
- **Validation**: Batch harus cocok dengan dokumen sumber pemeriksaan.
- **Output**: Batch terverifikasi fisik.
- **Dependency**: NONE
- **Classification**: **VALID**

### [RG_03]
- **Req Mapping**: RN-REG-003
- **Process**: Validasi Data Bibit Gagal
- **Input**: Nilai bibit gagal dari dokumen pemeriksaan.
- **Validation**: Jumlah regrafting <= jumlah bibit gagal pada dokumen sumber.
- **Output**: Batas maksimum regrafting divalidasi.
- **Dependency**: NONE
- **Classification**: **VALID**

### [RG_04]
- **Req Mapping**: RN-REG-004
- **Process**: Input Kuantitas Regrafting
- **Input**: Jumlah batang di-regrafting dan nama pekerja.
- **Validation**: Pekerja hadir pada presensi hari ini.
- **Output**: Rincian regrafting per pekerja tersimpan.
- **Dependency**: NONE
- **Classification**: **VALID**

### [RG_05]
- **Req Mapping**: RN-REG-005
- **Process**: Pilih Plot Entres & Scan QR
- **Input**: QR Code Plot Entres.
- **Validation**: Clone entres harus sama dengan clone batch yang diregrafting.
- **Output**: Plot entres terverifikasi.
- **Dependency**: NONE
- **Classification**: **REVISI**

### [RG_06]
- **Req Mapping**: RN-REG-006
- **Process**: Input Mata Entres Aktual
- **Input**: Jumlah mata tunas terpakai.
- **Validation**: Nilai aktual <= saldo stok Plot Entres + Clone.
- **Output**: Nilai mata entres aktual tersimpan di form.
- **Dependency**: NONE
- **Classification**: **REVISI**

### [RG_07]
- **Req Mapping**: RN-REG-007
- **Process**: Dokumentasi Foto + Timestamp
- **Input**: Foto kamera batang regrafting.
- **Validation**: Foto wajib terunggah.
- **Output**: Foto bukti audit tersimpan.
- **Dependency**: NONE
- **Classification**: **VALID**

### [RG_08]
- **Req Mapping**: RN-REG-008
- **Process**: Submit Transaksi
- **Input**: Seluruh formulir data regrafting.
- **Validation**: Data lengkap dan valid.
- **Output**: Transaksi terkirim berstatus Menunggu Verifikasi.
- **Dependency**: NONE
- **Classification**: **VALID**

### [RG_09]
- **Req Mapping**: RN-REG-009
- **Process**: Verifikasi Asisten Bibitan
- **Input**: Data transaksi regrafting dan inspeksi fisik.
- **Validation**: Jika disetujui, transaksi berstatus Terverifikasi.
- **Output**: Transaksi regrafting sah.
- **Dependency**: NONE
- **Classification**: **VALID**

### [RG_10]
- **Req Mapping**: RN-REG-010
- **Process**: Potong Stok Mata Entres
- **Input**: Data kuantitas mata entres aktual yang telah diverifikasi.
- **Validation**: Stok tersedia cukup.
- **Output**: Saldo mata entres terpotong.
- **Dependency**: NONE
- **Classification**: **REVISI**

### [RG_END]
- **Req Mapping**: RN-REG-011
- **Process**: Selesai Regrafting
- **Input**: Transaksi terverifikasi production.
- **Validation**: Tercatat dalam jadwal pemeriksaan.
- **Output**: Data tersinkron penuh ke server production.
- **Dependency**: NONE
- **Classification**: **VALID**

## 6. Legacy/Conflict Scan
- **[RN-OKL-005] Indikasi Mata Entres tanpa referensi Kebun Kayu Okulasi**
- **[RN-OKL-007] Indikasi Mata Entres tanpa referensi Kebun Kayu Okulasi**
- **[RN-OKL-008] Indikasi Mata Entres tanpa referensi Kebun Kayu Okulasi**
- **[RN-OKL-010] Indikasi Mata Entres tanpa referensi Kebun Kayu Okulasi**
- **[RN-OKL-012] Indikasi Mata Entres tanpa referensi Kebun Kayu Okulasi**
- **[RN-REG-005] Indikasi Mata Entres tanpa referensi Kebun Kayu Okulasi**
- **[RN-REG-006] Indikasi Mata Entres tanpa referensi Kebun Kayu Okulasi**
- **[RN-REG-010] Indikasi Mata Entres tanpa referensi Kebun Kayu Okulasi**
- **[RG_05] Indikasi Mata Entres tanpa referensi Kebun Kayu Okulasi**
- **[RG_06] Indikasi Mata Entres tanpa referensi Kebun Kayu Okulasi**
- **[RG_10] Indikasi Mata Entres tanpa referensi Kebun Kayu Okulasi**

## 7. Traceability Audit
- Seluruh mapping requirement dan node tertaut sempurna.

## 8. Evidence Classification
- **Validasi Kebun Kayu Okulasi**: Setiap material masuk harus tervalidasi referensi entres-nya.
- **Validasi Naming**: Okulasi (Grafting) vs Regrafting sudah dibedakan.
- Beberapa requirement dilabeli KONFIRMASI berdasarkan status audit baseline sebelumnya (RN-OKL-004, RN-OKL-009).
- RN-OKL-014 dilabeli REVISI secara eksplisit.

## 9. Findings Summary
- Legacy Conflict Scan mencatat 11 entitas bermasalah.
- Traceability Scan mencatat 0 anomali (Orphan Node/Broken Link).

## 10. Recommended Mutation Scope
Lakukan Controlled Mutation untuk meluruskan node dan requirement yang terimbas kata legacy dan menyambungkan kembali mapping traceability yang rusak.

## 11. Requirements Requiring Manual Confirmation
- **RN-OKL-004**
- **RN-OKL-009**
- **RN-OKL-014** (Sudah diset Revisi).

## 12. Final Audit Status
**FAIL**
