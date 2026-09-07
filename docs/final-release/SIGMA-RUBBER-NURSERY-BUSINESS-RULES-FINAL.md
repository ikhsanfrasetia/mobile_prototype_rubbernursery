# SIGMA RUBBER NURSERY — CANONICAL BUSINESS RULES FINAL

**Version:** 1.0.0  
**Baseline Date:** 7 September 2026  
**Status:** FINAL / FOR REVIEW  
**Total Canonical Rules:** 18 Rules  
**Coverage Rate:** 100.00% (172 / 172 Active Requirements Covered)  

---

## Daftar 18 Aturan Bisnis Kanonikal

| Rule ID | Nama Aturan Bisnis | Kategori | Enforcement & Deskripsi Tata Kelola |
| :--- | :--- | :---: | :--- |
| `BR-GLB-001` | **Mandatory Foto Dokumentasi + Timestamp** | Global | Setiap transaksi operasional Mantri Bibitan wajib menyertakan foto fisik dokumentasi dengan watermark timestamp ISO dan geolokasi GPS yang valid. |
| `BR-GLB-002` | **Kewajiban Verifikasi Asisten Bibitan** | Global | Semua transaksi yang diinput oleh Mantri Bibitan berstatus Menunggu Verifikasi dan belum memengaruhi saldo produksi sampai disetujui oleh Asisten Bibitan. |
| `BR-GLB-003` | **Promosi ke Server Production** | Global | Hanya transaksi yang telah diverifikasi dan disetujui oleh Asisten Bibitan yang akan dikirim ke basis data Server Production. |
| `BR-PRS-001` | **Presensi Datang Sebagai Syarat Transaksi** | Presensi | Presensi Datang supervisor wajib diselesaikan terlebih dahulu di pagi hari sebelum sistem mengizinkan transaksi operasional harian lainnya. |
| `BR-PRS-003` | **Prioritas Biometrik Face ID** | Presensi | Face ID adalah metode biometrik utama untuk presensi supervisor. Foto manual hanya diizinkan sebagai fallback jika verifikasi Face ID mengalami kegagalan teknis. |
| `BR-OKL-001` | **Presensi Sebelum Okulasi** | Okulasi | Transaksi okulasi hanya dapat dibuka jika Mantri telah menyelesaikan presensi harian dan pekerja yang dialokasikan terdaftar hadir. |
| `BR-OKL-002` | **Validasi QR Code Objek Fisik** | Okulasi | Batch bibit wajib divalidasi menggunakan QR Code sebelum penginputan hasil kerja okulasi dilakukan. Pemilihan manual hanya jalur fallback. |
| `BR-OKL-005` | **Identitas Stok Mata Entres** | Okulasi | Stok mata entres dikelola berdasarkan kombinasi Plot Entres + Clone, bukan berdasarkan Batch. |
| `BR-OKL-006` | **Status Estimasi vs Stok Aktual** | Okulasi | Kalkulasi Jumlah Cabang x Rata-rata Mata Entres adalah estimasi referensi semata. Hanya mata entres aktual yang diverifikasi yang menjadi pengurang saldo stok. |
| `BR-OKL-007` | **Pengurangan Stok Pasca Verifikasi** | Okulasi | Pengurangan saldo stok mata entres terjadi secara otomatis hanya setelah berkas transaksi okulasi disetujui (diverifikasi) oleh Asisten Bibitan. |
| `BR-OKL-008` | **Regrafting Berulang Tanpa Batas Tunggal** | Okulasi | Proses regrafting pada bibit gagal tidak dibatasi hanya satu kali. Bibit yang gagal pada pemeriksaan regrafting dapat diregrafting kembali atau diputuskan reject oleh Mantri. |
| `BR-SEM-001` | **Alokasi Multi-Bedengan per Dokumen** | Penyemaian | Satu dokumen penerimaan benih dapat dialokasikan ke beberapa bedengan perkecambahan (contoh: 10.000 benih dibagi ke Bedengan 001, 002, dan 003). |
| `BR-SEM-006` | **Standar 1 Polybag = 2 Benih/Bibit** | Penyemaian | Kecambah yang ditransplanting dari bedengan ke kantong polybag wajib ditanami 2 kecambah per polybag untuk seleksi vigor selanjutnya. |
| `BR-SEM-007` | **Konsolidasi Multi-Bedengan ke 1 Batch** | Penyemaian | Satu Batch bibit siap okulasi dapat dibentuk dari gabungan beberapa bedengan semaian dengan clone yang sama. |
| `BR-SEL-001` | **Verifikasi Fisik Sebelum Pengurangan Populasi Batch** | Penyeleksian | Deklarasi bibit reject/mati pada modul penyeleksian oleh Mantri tidak langsung mengurangi populasi Batch sampai Asisten Bibitan melakukan pemeriksaan fisik langsung dan menyetujuinya. |
| `BR-MAT-001` | **Integritas 1 Dokumen Gudang = 1 Heading Kerja** | Material | Satu dokumen pengeluaran gudang hanya dapat dilekatkan pada satu aktivitas pemeliharaan dengan heading kerja yang sama (matching). |
| `BR-AUD-001` | **Audit Trail Koreksi Transaksi** | Governance | Setiap koreksi terhadap transaksi yang telah berstatus Confirmed wajib mencatat log audit trail yang berisi originalValue, correctedValue, reason, correctedBy, dan correctedAt secara immutable. |
| `BR-QAL-001` | **Quality Control & Agronomy Standard Tekniker** | Quality Control | Verifikasi agronomi teknis (uji mutu kecambah benih, kalibrasi pisau/ikatan juru okulasi, dan sertifikasi kemurnian clone kebun entres) wajib memenuhi batas toleransi standar mutu Socfindo sebelum batch disetujui. |
