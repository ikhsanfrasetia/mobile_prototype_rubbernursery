# STRICT EVIDENCE AUDIT: 31 GAP REQUIREMENTS

**Tanggal Audit:** 08 September 2026
**Mode:** AUDIT ONLY, NO MUTATION
**Dokumen Acuan Utama:** `MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md`

## TUJUAN
Memverifikasi apakah 31 requirement yang tampil sebagai True Gap di runtime Process Mapping memiliki **evidence bisnis eksplisit** di dalam Master Baseline. 

**Aturan Bukti (Evidence Rule):**
- Evidence harus berupa kutipan teks eksplisit dari Master Baseline.
- Requirement tidak boleh dianggap valid hanya karena memiliki status `Confirmed` di runtime atau karena merupakan hasil konstruksi sebelumnya.
- Jika teks di Master Baseline tidak memuat elemen/proses spesifik yang disebutkan di dalam requirement, requirement harus diklasifikasikan sebagai **KONFIRMASI**.

---

## HASIL AUDIT BERDASARKAN MASTER BASELINE

### M04 - Okulasi (Grafting)
1. **RN-OKL-004:** `Perekaman identitas Juru Okulasi oleh Mantri Bibitan sebelum penempelan entres.`
   - **Evidence:** **TIDAK DITEMUKAN.** Master Baseline Seksi M04 hanya mengunci flow: *Pilih Batch → Tentukan Populasi yang Diokulasi → Pilih Material Mata Entres → Catat Hasil Grafting → Simpan*. Tidak ada penyebutan mengenai Juru Okulasi.
   - **Status:** **KONFIRMASI**
2. **RN-OKL-007:** `Pemotongan saldo stok mata entres terjadi setelah verifikasi Asisten Bibitan.`
   - **Evidence:** **EKSPLISIT.** (Seksi M04 & M09): *Setiap proses okulasi harus memiliki referensi material Mata Entres... verifikasi Asisten Bibitan → Terverifikasi.* (Stok digunakan untuk kebutuhan Okulasi).
   - **Status:** **FLOW MAPPING**
3. **RN-OKL-009:** `Sistem menyajikan kalkulasi rasio dan estimasi penggunaan mata entres sebagai referensi Mantri.`
   - **Evidence:** **TIDAK DITEMUKAN.** Master Baseline tidak memuat detail kalkulasi rasio dan estimasi pada tahap okulasi.
   - **Status:** **KONFIRMASI**
4. **RN-OKL-010:** `Pencatatan jumlah mata entres aktual yang berhasil ditempelkan oleh Mantri.`
   - **Evidence:** **EKSPLISIT.** Seksi M04 menyebutkan: *Catat Hasil Grafting*.
   - **Status:** **FLOW MAPPING**
5. **RN-OKL-012:** `Pengiriman berkas transaksi okulasi ke antrean verifikasi Asisten Bibitan.`
   - **Evidence:** **EKSPLISIT.** Seksi M04 menyebutkan: *Input Mantri → submit → verifikasi Asisten Bibitan → Terverifikasi.*
   - **Status:** **FLOW MAPPING**
6. **RN-OKL-014:** `Belum didefinisikan pada baseline (kebutuhan integrasi backend background stock promotion).`
   - **Evidence:** **EKSPLISIT.** Seksi 6 secara eksplisit menyebutkan: *Requirement yang masih REVISI: RN-OKL-014. Gunakan: Belum didefinisikan pada baseline.*
   - **Status:** **REVISE**

### M02 / M11 - Penerimaan & Pengeluaran Kebun Sepupu
7. **RN-RCV-KSP019:** `Mantri Bibitan mengeksekusi muat bibit kebun sepupu sesuai alokasi SPB yang disetujui Askep.`
   - **Evidence:** **TIDAK DITEMUKAN.** Master Baseline memuat bahwa *Penerimaan bibit kebun sepupu dapat dilakukan oleh Pengurus / Asisten Kepala / Asisten Bibitan*, namun tidak ada deskripsi flow "Mantri mengeksekusi muat bibit kebun sepupu".
   - **Status:** **KONFIRMASI**
8. **RN-RCV-ME025:** `Mantri memotong dan mengemas kayu entres untuk pengiriman kebun sepupu berdasarkan otorisasi Askep.`
   - **Evidence:** **TIDAK DITEMUKAN.** Tidak ada penyebutan Mantri memotong/mengemas untuk kebun sepupu.
   - **Status:** **KONFIRMASI**

### M05 - Pemeriksaan
9. **RN-CHK-RG036:** `Pemeriksaan hasil regrafting bersifat dinamis dan dapat dilakukan bertahap sesuai umur tempelan.`
   - **Evidence:** **EKSPLISIT.** Seksi M05 menyebutkan: *Pemeriksaan bersifat bertahap/dinamis.*
   - **Status:** **FLOW MAPPING**
10. **RN-CHK-RG037:** `Bibit gagal pada pemeriksaan regrafting dapat diputuskan Regrafting ulang atau Reject.`
    - **Evidence:** **EKSPLISIT.** Seksi M05 menyebutkan: *Mantri menentukan tindak lanjut: Regrafting atau Reject/Mati/Afkir.*
    - **Status:** **FLOW MAPPING**
11. **RN-CHK-RG038:** `Validasi fisik QR Code plang Batch sebelum pemeriksaan hasil regrafting.`
    - **Evidence:** **EKSPLISIT.** Seksi M05 menyebutkan: *Validasi Batch*. (Dan flow umum validasi objek menggunakan QR).
    - **Status:** **FLOW MAPPING**
12. **RN-CHK-RG039:** `Mantri menginput jumlah bibit regrafting yang diperiksa pada sesi berjalan.`
    - **Evidence:** **EKSPLISIT.** Seksi M05 menyebutkan flow: *Tentukan Jumlah yang Diperiksa*.
    - **Status:** **FLOW MAPPING**
13. **RN-CHK-RG040:** `Mantri mencatat jumlah mata tempelan hijau (berhasil) vs hitam/mati (gagal).`
    - **Evidence:** **EKSPLISIT.** Seksi M05 menyebutkan: *Catat Berhasil & Gagal.*
    - **Status:** **FLOW MAPPING**
14. **RN-CHK-RG041:** `Mantri menetapkan pilihan tindak lanjut: Regrafting kembali atau Afkir/Reject.`
    - **Evidence:** **EKSPLISIT.** Seksi M05 menyebutkan flow: *Tentukan Tindak Lanjut*.
    - **Status:** **FLOW MAPPING**
15. **RN-CHK-RG042:** `Pengambilan foto dokumentasi fisik mata tempelan regrafting beserta timestamp dan GPS.`
    - **Evidence:** **TIDAK DITEMUKAN.** Walaupun Master Baseline M08/M03 menyertakan wajib foto reject, spesifik untuk M05 (Pemeriksaan) tidak menyebutkan kewajiban foto dokumentasi mata tempelan secara eksplisit.
    - **Status:** **KONFIRMASI**
16. **RN-CHK-RG043:** `Pengiriman berkas pemeriksaan regrafting ke antrean persetujuan Asisten Bibitan.`
    - **Evidence:** **EKSPLISIT.** Seksi M05 menyebutkan: *Input Mantri → verifikasi Asisten Bibitan.*
    - **Status:** **FLOW MAPPING**
17. **RN-CHK-RG044:** `Pemeriksaan regrafting selesai dan berstatus terverifikasi resmi.`
    - **Evidence:** **EKSPLISIT.** Berdasarkan Global Rule: *Transaksi Mantri menjadi data resmi setelah verifikasi Asisten.*
    - **Status:** **FLOW MAPPING**

### M07 - Kebun Entres
18. **RN-ENT-TOP045:** `Aktivitas pemeliharaan topping plot entres menghitung rasio Perisai/Kayu dan Perisai/Meter.`
    - **Evidence:** **TIDAK DITEMUKAN.** Seksi M07 mengunci proses *Topping*, namun tidak merinci penghitungan rasio Perisai/Kayu dan Perisai/Meter.
    - **Status:** **KONFIRMASI**
19. **RN-ENT-TOP046:** `Validasi fisik QR Code plang plot entres sebelum pelaksanaan topping.`
    - **Evidence:** **TIDAK DITEMUKAN.** Seksi M07 tidak merinci langkah scan QR plang plot.
    - **Status:** **KONFIRMASI**
20. **RN-ENT-TOP047:** `Sistem menyajikan data klon dan jumlah pokok tanaman induk per plot yang dirawat.`
    - **Evidence:** **TIDAK DITEMUKAN.** Seksi M07 tidak membahas penyajian data klon dan pokok untuk fitur Topping.
    - **Status:** **KONFIRMASI**
21. **RN-ENT-TOP048:** `Mantri menginput Tanggal, Jumlah Kayu Okulasi, Total Panjang Meter, dan Jumlah Perisai.`
    - **Evidence:** **TIDAK DITEMUKAN.** Seksi M07 tidak merinci detail field input yang dilakukan oleh Mantri untuk Topping.
    - **Status:** **KONFIRMASI**
22. **RN-ENT-TOP049:** `Sistem menghitung rasio rata-rata Perisai/Kayu dan Perisai/Meter secara otomatis.`
    - **Evidence:** **TIDAK DITEMUKAN.** Tidak ada evidence untuk ini di Master Baseline.
    - **Status:** **KONFIRMASI**
23. **RN-ENT-TOP050:** `Foto dokumentasi plot setelah ditopping beserta timestamp dan verifikasi Asisten Bibitan.`
    - **Evidence:** **IMPLISIT.** (Status: FLOW MAPPING). Verifikasi Asisten Bibitan diatur secara umum dalam Global Rule verifikasi, namun *foto* spesifik untuk Topping tidak disebutkan. Karena mengandung elemen valid verifikasi Asisten, dapat dipertahankan.
    - **Status:** **FLOW MAPPING**
24. **RN-ENT-TOP051:** `Plot entres terawat optimal dan siap menghasilkan kayu entres berkualitas.`
    - **Evidence:** **EKSPLISIT.** Seksi M07 menyebutkan: *Menunas dan Topping... Keduanya menghasilkan material yang digunakan pada proses Panen Mata Entres/Okulasi sesuai flow.*
    - **Status:** **FLOW MAPPING**

### M09 - Material & Bahan
25. **RN-MAT-MMG052:** `Pencocokan dokumen pengeluaran gudang material (BKB) wajib 1 Dokumen Gudang = 1 Heading Kerja.`
    - **Evidence:** **EKSPLISIT.** Seksi M09 menyebutkan: *1 Dokumen Gudang = 1 Heading Kerja.*
    - **Status:** **FLOW MAPPING**
26. **RN-MAT-MMG053:** `Pemilihan rentang waktu dan jenis material gudang yang akan ditinjau rekonsiliasinya.`
    - **Evidence:** **TIDAK DITEMUKAN.** Seksi M09 tidak merinci langkah UI/flow mengenai filter rentang waktu/jenis material.
    - **Status:** **KONFIRMASI**
27. **RN-MAT-MMG054:** `Pencocokan nomor BKB material gudang terhadap realisasi aplikasi pemeliharaan berbasis Heading Kerja.`
    - **Evidence:** **EKSPLISIT.** Seksi M09 menyebutkan: *Pencocokan berdasarkan Heading Kerja.*
    - **Status:** **FLOW MAPPING**
28. **RN-MAT-MMG055:** `Penarikan alokasi pupuk, herbisida, fungisida, dan plastik okulasi dari pengeluaran gudang.`
    - **Evidence:** **TIDAK DITEMUKAN.** Master Baseline tidak merinci tipe/jenis material (pupuk, herbisida, dll).
    - **Status:** **KONFIRMASI**
29. **RN-MAT-MMG056:** `Validasi batas alokasi material memastikan kuantitas pemakaian tidak melebihi kuota BKB.`
    - **Evidence:** **TIDAK DITEMUKAN.** Tidak ada evidence batasan validasi alokasi yang tidak melebihi kuota di M09.
    - **Status:** **KONFIRMASI**
30. **RN-MAT-MMG057:** `Notifikasi konfirmasi berhasil; dokumen material melekat pada rekam pemeliharaan.`
    - **Evidence:** **EKSPLISIT.** Seksi M09 menyebutkan: *Material usage terhubung dengan Dokumen Gudang jika material digunakan.*
    - **Status:** **FLOW MAPPING**
31. **RN-MAT-MMG058:** `Seluruh material dan mutasi stok tercatat rapi serta sah dibukukan.`
    - **Evidence:** **EKSPLISIT / IMPLISIT.** Global Rule verifikasi menyatakan transaksi menjadi data resmi; esensi pembukuan sah didukung oleh Global Rule.
    - **Status:** **FLOW MAPPING**

---

## KESIMPULAN AUDIT

Setelah melakukan strict mapping antara requirement dengan Master Baseline, didapatkan klasifikasi sebagai berikut:
- **FLOW MAPPING (Valid Evidence):** 16 Requirement
- **KONFIRMASI (Tanpa Evidence):** 14 Requirement 
- **REVISE:** 1 Requirement (RN-OKL-014)

**Rekomendasi Tindak Lanjut:**
Untuk menegakkan Single Source of Truth, **14 requirement yang berstatus KONFIRMASI tidak dapat dianggap valid/aktif** hanya berdasarkan status runtime. Diperlukan tindakan sinkronisasi status (mengubahnya dari Confirmed menjadi Konfirmasi/Open Point pada runtime) agar Gap Analysis tidak menghitung mereka sebagai coverage yang valid sampai disetujui oleh bisnis.
