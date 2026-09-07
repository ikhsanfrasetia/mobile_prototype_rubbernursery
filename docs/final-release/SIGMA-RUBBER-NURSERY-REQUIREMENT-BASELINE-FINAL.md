# SIGMA RUBBER NURSERY — REQUIREMENT BASELINE FINAL

**Version:** 1.0.0 (Baseline 172 Final Locked)  
**Baseline Date:** 7 September 2026  
**Status:** FINAL / FOR REVIEW  
**Total Active Requirements:** 172  
**Total Master Roles:** 7 Roles  
**Total Operational Modules:** 11 Modules  
**Total Business Features:** 21 Features  

---

## 1. Requirement Summary Breakdown

| Kategori Status | Jumlah Requirement | Deskripsi Kategori |
| :--- | :---: | :--- |
| **Retained (Tetap)** | **130** | Kebutuhan operasional eksisting yang tetap valid tanpa perubahan. |
| **Revised (Revisi)** | **28** | Kebutuhan eksisting dengan penyempurnaan wording & kewenangan peran. |
| **New Accepted (Baru)** | **14** | Kebutuhan baru yang diadopsi resmi (`RN-PWP-006` s/d `RN-SEL-014`). |
| **Deprecated (Arsip)** | **7** | Kebutuhan out-of-scope yang diarsipkan (`isArchived: true`). |
| **Merged (Melebur)** | **3** | Usulan yang dilebur ke requirement induk (`RN-RCV-006`, `RN-SEM-007`, `RN-EXP-002`). |
| **TOTAL ACTIVE** | **172** | **Single Source of Truth Kebutuhan Aktif Sistem SIGMA Rubber Nursery** |

---

## 2. Complete Requirement Register (172 Active Requirements)

| No | ID Requirement | Judul Kebutuhan Bisnis | Peran Pelaksana | Modul | Fitur | Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| 1 | `RN-PRS-001` | Presensi Datang supervisor wajib selesai sebelum transaksi harian lain. | Mantri Bibitan | Presensi | Presensi Supervisor | Confirmed |
| 2 | `RN-PRS-002` | Pembacaan waktu otomatis untuk Presensi Datang/Pulang. | Mantri Bibitan | Presensi | Presensi Supervisor | Confirmed |
| 3 | `RN-PRS-003` | Verifikasi biometrik wajah supervisor sebagai metode utama presensi. | Mantri Bibitan | Presensi | Presensi Supervisor | Confirmed |
| 4 | `RN-PRS-005` | Pemeriksaan radius koordinat GPS berada di dalam perimeter Areal Bibitan. | Mantri Bibitan | Presensi | Presensi Supervisor | Confirmed |
| 5 | `RN-PRS-006` | Sistem mencatat data presensi lengkap supervisor setelah divalidasi dengan radius perimeter GPS. | Mantri Bibitan | Presensi | Presensi Supervisor | Confirmed |
| 6 | `RN-PRS-007` | Mantri Bibitan menyelesaikan presensi datang supervisor sebagai prasyarat pembukaan transaksi harian. | Mantri Bibitan | Presensi | Presensi Supervisor | Confirmed |
| 7 | `RN-PWP-001` | Mantri membuka modul presensi pekerja setelah presensi supervisor selesai. | Mantri Bibitan | Presensi | Presensi Pekerja Bibitan | Confirmed |
| 8 | `RN-PWP-002` | Mantri menandai pekerja yang hadir dan membuang pekerja tidak hadir. | Mantri Bibitan | Presensi | Presensi Pekerja Bibitan | Confirmed |
| 9 | `RN-PWP-003` | Menambahkan pekerja bantuan antar afdeling jika belum ada di daftar reguler. | Mantri Bibitan | Presensi | Presensi Pekerja Bibitan | Confirmed |
| 10 | `RN-PWP-004` | Mengonfirmasi daftar final kehadiran pekerja beserta timestamp dan kirim verifikasi. | Mantri Bibitan | Presensi | Presensi Pekerja Bibitan | Confirmed |
| 11 | `RN-PWP-005` | Pekerja siap dialokasikan pada transaksi teknis pembibitan karet. | Mantri Bibitan | Presensi | Presensi Pekerja Bibitan | Confirmed |
| 12 | `RN-RCV-002` | Mantri Bibitan memverifikasi surat jalan/BKB vendor dan mencocokkan kuantitas fisik benih kelatak. | Mantri Bibitan | Penerimaan | Penerimaan Benih / Biji Kelatak | Confirmed |
| 13 | `RN-RCV-003` | Mantri mencatat jumlah fisik benih kelatak riil yang dibongkar dan diterima. | Mantri Bibitan | Penerimaan | Penerimaan Benih / Biji Kelatak | Confirmed |
| 14 | `RN-RCV-004` | Foto fisik karung/kotak benih dan surat jalan dengan stempel waktu ISO. | Mantri Bibitan | Penerimaan | Penerimaan Benih / Biji Kelatak | Confirmed |
| 15 | `RN-RCV-005` | Menyimpan berkas penerimaan dan disetujui Asisten Bibitan; resmi masuk database produksi. | Asisten Bibitan | Penerimaan | Penerimaan Benih / Biji Kelatak | Confirmed |
| 16 | `RN-RCV-006` | Dokumen penerimaan siap digunakan sebagai sumber alokasi pada modul Penyemaian. | Mantri Bibitan | Penerimaan | Penerimaan Benih / Biji Kelatak | Confirmed |
| 17 | `RN-RCV-KS01` | Asisten Divisi peminta mengajukan SPB bibit karet untuk penanaman di kebun. | Asisten Divisi | Penerimaan | Penerimaan Bibit - Kebun Sendiri | Confirmed |
| 18 | `RN-RCV-KS02` | Asisten Kepala meninjau permintaan bibit dan memeriksa ketersediaan stok bibit siap salur. | Asisten Kepala | Penerimaan | Penerimaan Bibit - Kebun Sendiri | Confirmed |
| 19 | `RN-RCV-KS03` | Stok cukup: Approve & teruskan ke Asisten Bibitan; Stok tidak cukup: Koreksi/Batalkan. | Asisten Kepala | Penerimaan | Penerimaan Bibit - Kebun Sendiri | Confirmed |
| 20 | `RN-RCV-KS04` | Asisten Bibitan menindaklanjuti; Mantri Bibitan mengeksekusi muat dan pengeluaran bibit. | Mantri Bibitan | Penerimaan | Penerimaan Bibit - Kebun Sendiri | Confirmed |
| 21 | `RN-RCV-KS05` | Asisten Divisi peminta menerima bibit di lokasi tanam, memeriksa fisik, dan mengonfirmasi penerimaan. | Asisten Divisi | Penerimaan | Penerimaan Bibit - Kebun Sendiri | Confirmed |
| 22 | `RN-RCV-KS06` | Seluruh tahapan permohonan hingga penerimaan bibit kebun sendiri selesai terverifikasi. | Asisten Divisi | Penerimaan | Penerimaan Bibit - Kebun Sendiri | Confirmed |
| 23 | `RN-SEM-001` | Satu dokumen penerimaan benih dapat dialokasikan ke beberapa Bedengan. | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | Confirmed |
| 24 | `RN-SEM-002` | Memindai QR Code fisik pada plang bedengan perkecambahan pasir. | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | Confirmed |
| 25 | `RN-SEM-003` | Mantri menginput jumlah butir benih yang disemai dan jumlah benih afkir/rusak. | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | Confirmed |
| 26 | `RN-SEM-004` | Foto bukti fisik benih reject/rusak dengan watermark timestamp ISO dan GPS. | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | Confirmed |
| 27 | `RN-SEM-005` | Asisten menyetujui penaburan bedengan; periode perkecambahan berlangsung ±12–15 hari. | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | Confirmed |
| 28 | `RN-SEM-006` | Transplanting ke polybag menggunakan rasio 1 Polybag = 2 Benih/Bibit. | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | Confirmed |
| 29 | `RN-SEM-007` | Satu Batch bibitan dapat dikonsolidasi dari beberapa Bedengan. | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | Confirmed |
| 30 | `RN-SEM-008` | Batch polybag telah terdaftar dan siap dipelihara hingga mencapai ukuran okulasi. | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | Confirmed |
| 31 | `RN-OKL-001` | Mantri Bibitan memilih Batch tanaman bawah (seedling) yang telah memenuhi kriteria diameter siap okulasi. | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Confirmed |
| 32 | `RN-OKL-002` | Validasi QR Code plang Batch polybag wajib dilakukan sebelum penempelan mata entres. | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Confirmed |
| 33 | `RN-OKL-003` | Menampilkan saldo populasi aktif dan batas maksimum okulasi harian pada batch terpilih. | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Confirmed |
| 34 | `RN-OKL-004` | Mantri Bibitan mencatat identitas Juru Okulasi, jumlah okulasi sukses, dan penggunaan entres. | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Confirmed |
| 35 | `RN-OKL-005` | Validasi kesesuaian varietas clone kayu entres terhadap rencana penempelan batch. | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Confirmed |
| 36 | `RN-OKL-006` | Perhitungan otomatis rasio pemakaian mata entres per batang seedling yang diokulasi. | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Confirmed |
| 37 | `RN-OKL-007` | Mata entres aktual menjadi pengurang stok setelah verifikasi. | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Confirmed |
| 38 | `RN-OKL-008` | Menginput jumlah batang/cabang kayu entres yang diambil dari plot. | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Confirmed |
| 39 | `RN-OKL-009` | Sistem menghitung dan menampilkan estimasi perolehan mata entres. | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Confirmed |
| 40 | `RN-OKL-010` | Mencatat kuantitas mata entres aktual yang berhasil ditempelkan. | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Confirmed |
| 41 | `RN-OKL-011` | Pengambilan foto dokumentasi fisik kegiatan okulasi beserta watermark timestamp. | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Confirmed |
| 42 | `RN-OKL-012` | Mengirim berkas transaksi okulasi ke antrean verifikasi Asisten. | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Confirmed |
| 43 | `RN-OKL-013` | Pemeriksaan lapangan dan persetujuan transaksi oleh Asisten Bibitan. | Asisten Bibitan | Okulasi | Grafting (Okulasi Utama) | Confirmed |
| 44 | `RN-OKL-014` | Pengurangan stok mata entres terverifikasi pada Plot Entres + Clone. | Sistem Database | Okulasi | Grafting (Okulasi Utama) | Confirmed |
| 45 | `RN-OKL-015` | Transaksi okulasi grafting berhasil diselesaikan dan masuk basis data produksi. | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | Confirmed |
| 46 | `RN-REG-000` | Inisialisasi transaksi okulasi ulang (regrafting) untuk bibit yang gagal pada pemeriksaan. | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | Confirmed |
| 47 | `RN-REG-001` | Memilih batch dan dokumen hasil pemeriksaan yang memiliki tindak lanjut regrafting. | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | Confirmed |
| 48 | `RN-REG-002` | Validasi fisik QR Code Batch sebelum melakukan regrafting. | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | Confirmed |
| 49 | `RN-REG-003` | Memeriksa jumlah batang bibit gagal yang berhak menerima penempelan ulang. | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | Confirmed |
| 50 | `RN-REG-004` | Menginput jumlah bibit yang diokulasi ulang dan pekerja pelaksana. | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | Confirmed |
| 51 | `RN-REG-005` | Memilih plot kebun entres dan memindai QR fisik plot penyedia mata tunas. | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | Confirmed |
| 52 | `RN-REG-006` | Mencatat jumlah mata entres aktual yang digunakan untuk regrafting. | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | Confirmed |
| 53 | `RN-REG-007` | Pengambilan foto dokumentasi ikatan regrafting dan watermark timestamp. | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | Confirmed |
| 54 | `RN-REG-008` | Mengirimkan berkas regrafting ke antrean verifikasi Asisten Bibitan. | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | Confirmed |
| 55 | `RN-REG-009` | Pemeriksaan mutu tempelan ulang dan persetujuan oleh Asisten Bibitan. | Asisten Bibitan | Okulasi | Okulasi Janda / Regrafting | Confirmed |
| 56 | `RN-REG-010` | Pemotongan stok resmi mata entres pada Plot Entres + Clone. | Sistem Database | Okulasi | Okulasi Janda / Regrafting | Confirmed |
| 57 | `RN-REG-011` | Regrafting selesai dan siap diperiksa pada jadwal pemeriksaan berikutnya. | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | Confirmed |
| 58 | `RN-CHK-001` | Pemeriksaan bersifat dinamis dan dapat dilakukan bertahap. | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | Confirmed |
| 59 | `RN-CHK-002` | Bibit gagal dapat ditentukan untuk Regrafting ulang atau Reject. | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | Confirmed |
| 60 | `RN-CHK-003` | Validasi fisik QR Code Batch yang diperiksa. | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | Confirmed |
| 61 | `RN-CHK-004` | Menginput jumlah batang yang diperiksa pada sesi ini (misal 600 dari 1.000). | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | Confirmed |
| 62 | `RN-CHK-005` | Mencatat jumlah mata tempelan yang hijau (berhasil) vs hitam/mati (gagal). | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | Confirmed |
| 63 | `RN-CHK-006` | Mantri menentukan tindak lanjut bibit yang gagal: Regrafting atau Reject. | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | Confirmed |
| 64 | `RN-CHK-007` | Foto bukti fisik mata tempelan berhasil dan gagal beserta watermark. | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | Confirmed |
| 65 | `RN-CHK-008` | Mengirim hasil pemeriksaan ke Asisten Bibitan untuk disetujui. | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | Confirmed |
| 66 | `RN-CHK-009` | Pemeriksaan tuntas; bibit berhasil lanjut tumbuh, bibit gagal siap diregrafting. | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | Confirmed |
| 67 | `RN-SEL-001` | Hasil seleksi Mantri berstatus usulan afkir dan wajib diverifikasi fisik oleh Asisten Bibitan. | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | Confirmed |
| 68 | `RN-SEL-003` | Pemindaian QR Code Batch untuk membuka form penilaian kualitas visual bibit. | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | Confirmed |
| 69 | `RN-SEL-004` | Sistem menyajikan populasi awal, persentase keberhasilan okulasi, dan riwayat seleksi. | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | Confirmed |
| 70 | `RN-SEL-005` | Mantri menginput jumlah bibit Siap Salur (Grade A), Ditunda (Under-size), dan Afkir (Mati/Cacat). | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | Confirmed |
| 71 | `RN-SEL-006` | Foto dokumentasi fisik bibit reject/afkir yang dikumpulkan beserta tanda air. | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | Confirmed |
| 72 | `RN-SEL-007` | Mengirimkan berkas seleksi ke status Menunggu Verifikasi Asisten. | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | Confirmed |
| 73 | `RN-SEL-008` | Asisten Bibitan turun ke lapangan melakukan pemeriksaan fisik batch langsung. | Asisten Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | Confirmed |
| 74 | `RN-SEL-009` | Memverifikasi apakah kuantitas afkir di sistem sama dengan fisik lapangan. | Asisten Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | Confirmed |
| 75 | `RN-SEL-010` | Asisten menyetujui transaksi; nilai terverifikasi resmi memotong populasi Batch. | Asisten Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | Confirmed |
| 76 | `RN-SEL-011` | Penyeleksian tuntas; populasi batch di database kini mencerminkan bibit hidup riil. | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | Confirmed |
| 77 | `RN-ENT-002` | Validasi QR Code plang fisik plot entres yang dirawat. | Mantri Bibitan | Kebun Entres | Menunas Plot Entres | Confirmed |
| 78 | `RN-ENT-003` | Sistem menyajikan data clone dan jumlah pokok tanaman induk per plot. | Mantri Bibitan | Kebun Entres | Menunas Plot Entres | Confirmed |
| 79 | `RN-ENT-004` | Mantri menginput Tanggal, Jumlah Perisai/Mata Tunas, Jumlah Cabang, dan Panjang Meter. | Mantri Bibitan | Kebun Entres | Menunas Plot Entres | Confirmed |
| 80 | `RN-ENT-005` | Sistem menghitung Rata-rata Perisai/Cabang dan Rata-rata Perisai/Meter. | Mantri Bibitan | Kebun Entres | Menunas Plot Entres | Confirmed |
| 81 | `RN-ENT-006` | Foto dokumentasi plot setelah ditunas beserta timestamp, diteruskan ke Asisten Bibitan. | Mantri Bibitan | Kebun Entres | Menunas Plot Entres | Confirmed |
| 82 | `RN-ENT-007` | Plot entres terawat optimal dan siap menghasilkan kayu entres berkualitas. | Mantri Bibitan | Kebun Entres | Menunas Plot Entres | Confirmed |
| 83 | `RN-HAR-001` | Panen mata entres menambah saldo stok resmi hanya setelah diverifikasi Asisten. | Mantri Bibitan | Panen Mata Entres | Panen Mata Entres | Confirmed |
| 84 | `RN-HAR-002` | Validasi fisik QR Code Plot Entres yang dipanen. | Mantri Bibitan | Panen Mata Entres | Panen Mata Entres | Confirmed |
| 85 | `RN-HAR-003` | Menginput jumlah cabang entres yang dipotong dan rata-rata mata entres per cabang. | Mantri Bibitan | Panen Mata Entres | Panen Mata Entres | Confirmed |
| 86 | `RN-HAR-004` | Sistem menghitung nilai estimasi perolehan mata entres. | Mantri Bibitan | Panen Mata Entres | Panen Mata Entres | Confirmed |
| 87 | `RN-HAR-005` | Mantri mencatat jumlah mata entres riil/aktual yang siap digunakan/disimpan. | Mantri Bibitan | Panen Mata Entres | Panen Mata Entres | Confirmed |
| 88 | `RN-HAR-006` | Foto ikatan cabang kayu entres yang dipanen beserta watermark timestamp ISO. | Mantri Bibitan | Panen Mata Entres | Panen Mata Entres | Confirmed |
| 89 | `RN-HAR-007` | Asisten Bibitan memeriksa fisik kayu entres dan menyetujui transaksi; stok resmi bertambah. | Asisten Bibitan | Panen Mata Entres | Panen Mata Entres | Confirmed |
| 90 | `RN-HAR-008` | Mata entres siap dialokasikan untuk Grafting, Regrafting, atau Permintaan bibitan. | Mantri Bibitan | Panen Mata Entres | Panen Mata Entres | Confirmed |
| 91 | `RN-MAT-001` | Dokumen gudang material wajib matching 1 Heading Kerja pemeliharaan. | Mantri Bibitan | Material & Bahan | Monitoring Mutasi Stok Mata Entres | Confirmed |
| 92 | `RN-MAT-002` | Memilih kombinasi plot entres dan jenis klon untuk ditinjau mutasi stoknya. | Mantri Bibitan | Material & Bahan | Monitoring Mutasi Stok Mata Entres | Confirmed |
| 93 | `RN-MAT-003` | Audit penambahan (+ Panen Terverifikasi) vs pengurangan (- Okulasi, - Regrafting, - Pengeluaran). | Mantri Bibitan | Material & Bahan | Monitoring Mutasi Stok Mata Entres | Confirmed |
| 94 | `RN-MAT-004` | Menarik dokumen pengeluaran gudang untuk pupuk, pestisida, dan plastik okulasi. | Mantri Bibitan | Material & Bahan | Monitoring Mutasi Stok Mata Entres | Confirmed |
| 95 | `RN-MAT-005` | Sistem memverifikasi kecocokan Heading Kerja dokumen gudang dengan rekam pemeliharaan. | Sistem | Material & Bahan | Monitoring Mutasi Stok Mata Entres | Confirmed |
| 96 | `RN-MAT-006` | Notifikasi Mantri berhasil; dokumen material melekat pada rekam pemeliharaan. | Mantri Bibitan | Material & Bahan | Monitoring Mutasi Stok Mata Entres | Confirmed |
| 97 | `RN-MAT-007` | Seluruh material dan mutasi stok tercatat rapi dan dapat dipertanggungjawabkan. | Mantri Bibitan | Material & Bahan | Monitoring Mutasi Stok Mata Entres | Confirmed |
| 98 | `RN-MNT-001` | Mantri Bibitan membuka form rekam pemeliharaan harian tanaman pembibitan. | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | Confirmed |
| 99 | `RN-MNT-002` | Memilih Master Heading Kerja pemeliharaan (Penyiraman, Penyiangan, Pemupukan, Pengendalian HPT). | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | Confirmed |
| 100 | `RN-MNT-003` | Memilih target blok/bedengan/plot entres dan memindai QR Code lokasi kerja. | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | Confirmed |
| 101 | `RN-MNT-004` | Merekam daftar pekerja pelaksana, jam kerja, dan output volume fisik yang diselesaikan. | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | Confirmed |
| 102 | `RN-MNT-005` | Foto dokumentasi pelaksanaan aktivitas di lapangan dengan geotagging koordinat dan timestamp. | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | Confirmed |
| 103 | `RN-MNT-006` | Mengaitkan nomor BKB pemakaian bahan kimia/pupuk ke dalam laporan heading kerja terkait. | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | Confirmed |
| 104 | `RN-MNT-007` | Mengirim rekapitulasi pekerjaan harian ke Asisten Bibitan untuk approval pembebanan biaya. | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | Confirmed |
| 105 | `RN-MNT-008` | Aktivitas pemeliharaan selesai dan tercatat resmi pada riwayat objek tanaman. | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | Confirmed |
| 106 | `RN-EXP-001` | Asisten Divisi mengajukan SPB alokasi bibit kebun sendiri yang telah disetujui Asisten Kepala. | Asisten Divisi | Pengeluaran | Pengeluaran Bibit (SPB Disetujui) | Confirmed |
| 107 | `RN-EXP-002` | Mantri memilih dokumen SPB yang akan dimuat ke armada transportasi. | Mantri Bibitan | Pengeluaran | Pengeluaran Bibit (SPB Disetujui) | Confirmed |
| 108 | `RN-EXP-003` | Validasi fisik QR Code Batch bibit di petak yang siap salur. | Mantri Bibitan | Pengeluaran | Pengeluaran Bibit (SPB Disetujui) | Confirmed |
| 109 | `RN-EXP-004` | Mantri Bibitan merekam jumlah batang bibit muat dan memverifikasi nomor polisi armada pengangkut. | Mantri Bibitan | Pengeluaran | Pengeluaran Bibit (SPB Disetujui) | Confirmed |
| 110 | `RN-EXP-007` | Armada berangkat menuju divisi tanam; transaksi pengeluaran bibit selesai. | Mantri Bibitan | Pengeluaran | Pengeluaran Bibit (SPB Disetujui) | Confirmed |
| 111 | `RN-EXM-001` | Pengeluaran mata entres berdasarkan dokumen permintaan yang telah disetujui. | Mantri Bibitan | Pengeluaran | Pengeluaran Mata Entres | Confirmed |
| 112 | `RN-EXM-002` | Validasi fisik QR Code Plot Entres penyedia clone terkait (Bukan Batch). | Mantri Bibitan | Pengeluaran | Pengeluaran Mata Entres | Confirmed |
| 113 | `RN-EXM-003` | Menginput jumlah cabang dan kuantitas mata entres aktual yang dipotong untuk dikirim. | Mantri Bibitan | Pengeluaran | Pengeluaran Mata Entres | Confirmed |
| 114 | `RN-EXM-004` | Foto ikatan cabang kayu entres dan verifikasi persetujuan oleh Asisten Bibitan. | Mantri Bibitan | Pengeluaran | Pengeluaran Mata Entres | Confirmed |
| 115 | `RN-EXM-005` | Mata entres siap dikirim ke unit peminta; siklus pengeluaran entres tuntas. | Mantri Bibitan | Pengeluaran | Pengeluaran Mata Entres | Confirmed |
| 116 | `RN-RCV-KSP016` | Pengurus Kebun Peminta mengajukan SPB bibit karet untuk penanaman di kebun. | Pengurus Kebun Peminta | Penerimaan | Penerimaan Bibit - Kebun Sepupu | Confirmed |
| 117 | `RN-RCV-KSP017` | Asisten Kepala meninjau permintaan bibit dan memeriksa ketersediaan stok bibit siap salur. | Asisten Kepala | Penerimaan | Penerimaan Bibit - Kebun Sepupu | Confirmed |
| 118 | `RN-RCV-KSP018` | Stok cukup: Approve & teruskan ke Asisten Bibitan; Stok tidak cukup: Koreksi/Batalkan. | Asisten Kepala | Penerimaan | Penerimaan Bibit - Kebun Sepupu | Confirmed |
| 119 | `RN-RCV-KSP019` | Mantri Bibitan mengeksekusi muat bibit kebun sepupu sesuai kuota SPB yang diteruskan Asisten. | Mantri Bibitan | Penerimaan | Penerimaan Bibit - Kebun Sepupu | Confirmed |
| 120 | `RN-RCV-KSP020` | Pengurus Kebun Peminta menerima bibit di lokasi tanam, memeriksa fisik, dan mengonfirmasi penerimaan. | Pengurus Kebun Peminta | Penerimaan | Penerimaan Bibit - Kebun Sepupu | Confirmed |
| 121 | `RN-RCV-KSP021` | Seluruh tahapan permohonan hingga penerimaan bibit kebun sepupu selesai terverifikasi. | Pengurus Kebun Peminta | Penerimaan | Penerimaan Bibit - Kebun Sepupu | Confirmed |
| 122 | `RN-RCV-ME022` | Pengurus Kebun Peminta mengajukan SPB mata entres karet untuk penanaman di kebun. | Pengurus Kebun Peminta | Penerimaan | Penerimaan Mata Entres | Confirmed |
| 123 | `RN-RCV-ME023` | Asisten Kepala meninjau permintaan mata entres dan memeriksa ketersediaan stok mata entres siap salur. | Asisten Kepala | Penerimaan | Penerimaan Mata Entres | Confirmed |
| 124 | `RN-RCV-ME024` | Stok cukup: Approve & teruskan ke Asisten Bibitan; Stok tidak cukup: Koreksi/Batalkan. | Asisten Kepala | Penerimaan | Penerimaan Mata Entres | Confirmed |
| 125 | `RN-RCV-ME025` | Mantri Bibitan memotong dan mengemas mata entres kebun sepupu berdasarkan otorisasi Asisten. | Mantri Bibitan | Penerimaan | Penerimaan Mata Entres | Confirmed |
| 126 | `RN-RCV-ME026` | Pengurus Kebun Peminta menerima mata entres di lokasi tanam, memeriksa fisik, dan mengonfirmasi penerimaan. | Pengurus Kebun Peminta | Penerimaan | Penerimaan Mata Entres | Confirmed |
| 127 | `RN-RCV-ME027` | Seluruh tahapan permohonan hingga penerimaan mata entres kebun sepupu selesai terverifikasi. | Pengurus Kebun Peminta | Penerimaan | Penerimaan Mata Entres | Confirmed |
| 128 | `RN-SEM-TP028` | Satu dokumen penerimaan benih dapat dialokasikan ke beberapa polybag. | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | Confirmed |
| 129 | `RN-SEM-TP029` | Memindai QR Code fisik pada plang polybag pembibitan. | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | Confirmed |
| 130 | `RN-SEM-TP030` | Mantri menginput jumlah butir benih yang ditransplanting dan jumlah benih afkir/rusak. | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | Confirmed |
| 131 | `RN-SEM-TP031` | Foto bukti fisik benih reject/rusak dengan watermark timestamp ISO dan GPS. | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | Confirmed |
| 132 | `RN-SEM-TP032` | Asisten menyetujui pemindahan benih kecambah dari bedengan ke polybag. | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | Confirmed |
| 133 | `RN-SEM-TP033` | Transplanting ke polybag menggunakan rasio 1 Polybag = 2 Benih/Bibit. | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | Confirmed |
| 134 | `RN-SEM-TP034` | Satu Batch bibitan dapat dikonsolidasi dari beberapa polybag. | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | Confirmed |
| 135 | `RN-SEM-TP035` | Batch polybag telah terdaftar dan siap dipelihara hingga mencapai ukuran okulasi. | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | Confirmed |
| 136 | `RN-CHK-RG036` | Pemeriksaan bersifat dinamis dan dapat dilakukan bertahap. | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | Confirmed |
| 137 | `RN-CHK-RG037` | Bibit gagal dapat ditentukan untuk Regrafting kembali atau Reject. | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | Confirmed |
| 138 | `RN-CHK-RG038` | Validasi fisik QR Code Batch yang diperiksa. | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | Confirmed |
| 139 | `RN-CHK-RG039` | Menginput jumlah batang yang diperiksa pada sesi ini (misal 600 dari 1.000). | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | Confirmed |
| 140 | `RN-CHK-RG040` | Mencatat jumlah mata tempelan yang hijau (berhasil) vs hitam/mati (gagal). | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | Confirmed |
| 141 | `RN-CHK-RG041` | Mantri menentukan tindak lanjut bibit yang gagal: Regrafting kembali atau Reject. | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | Confirmed |
| 142 | `RN-CHK-RG042` | Foto bukti fisik mata tempelan berhasil dan gagal beserta watermark. | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | Confirmed |
| 143 | `RN-CHK-RG043` | Mengirim hasil pemeriksaan ke Asisten Bibitan untuk disetujui. | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | Confirmed |
| 144 | `RN-CHK-RG044` | Pemeriksaan tuntas; bibit berhasil lanjut tumbuh, bibit gagal siap di-Regrafting kembali atau di-Reject. | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | Confirmed |
| 145 | `RN-ENT-TOP045` | Aktivitas topping menghitung rasio Perisai/Kayu dan Perisai/Meter. | Mantri Bibitan | Kebun Entres | Topping Plot Entres | Confirmed |
| 146 | `RN-ENT-TOP046` | Validasi QR Code plang fisik plot entres yang dirawat. | Mantri Bibitan | Kebun Entres | Topping Plot Entres | Confirmed |
| 147 | `RN-ENT-TOP047` | Sistem menyajikan data clone dan jumlah pokok tanaman induk per plot. | Mantri Bibitan | Kebun Entres | Topping Plot Entres | Confirmed |
| 148 | `RN-ENT-TOP048` | Mantri menginput Tanggal, Jumlah Kayu Okulasi, Total Panjang Meter, dan Jumlah Perisai. | Mantri Bibitan | Kebun Entres | Topping Plot Entres | Confirmed |
| 149 | `RN-ENT-TOP049` | Sistem menghitung Rata-rata Perisai/Kayu dan Rata-rata Perisai/Meter. | Mantri Bibitan | Kebun Entres | Topping Plot Entres | Confirmed |
| 150 | `RN-ENT-TOP050` | Foto dokumentasi plot setelah ditopping beserta timestamp, diteruskan ke Asisten Bibitan. | Mantri Bibitan | Kebun Entres | Topping Plot Entres | Confirmed |
| 151 | `RN-ENT-TOP051` | Plot entres terawat optimal dan siap menghasilkan kayu entres berkualitas. | Mantri Bibitan | Kebun Entres | Topping Plot Entres | Confirmed |
| 152 | `RN-MAT-MMG052` | Dokumen gudang material wajib matching 1 Heading Kerja pemeliharaan. | Mantri Bibitan | Material & Bahan | Matching Material Dokumen Gudang | Confirmed |
| 153 | `RN-MAT-MMG053` | Memilih rentang waktu dan jenis material gudang untuk ditinjau rekonsiliasinya. | Mantri Bibitan | Material & Bahan | Matching Material Dokumen Gudang | Confirmed |
| 154 | `RN-MAT-MMG054` | Pencocokan nomor BKB material gudang terhadap realisasi aplikasi pemeliharaan berbasis Heading Kerja. | Mantri Bibitan | Material & Bahan | Matching Material Dokumen Gudang | Confirmed |
| 155 | `RN-MAT-MMG055` | Menarik alokasi pupuk, herbisida, fungisida, dan plastik okulasi yang telah dikeluarkan gudang. | Mantri Bibitan | Material & Bahan | Matching Material Dokumen Gudang | Confirmed |
| 156 | `RN-MAT-MMG056` | Validasi rekonsiliasi material memastikan kuantitas pemakaian tidak melebihi alokasi BKB. | Mantri Bibitan | Material & Bahan | Matching Material Dokumen Gudang | Confirmed |
| 157 | `RN-MAT-MMG057` | Notifikasi Mantri berhasil; dokumen material melekat pada rekam pemeliharaan. | Mantri Bibitan | Material & Bahan | Matching Material Dokumen Gudang | Confirmed |
| 158 | `RN-MAT-MMG058` | Seluruh material dan mutasi stok tercatat rapi dan dapat dipertanggungjawabkan. | Mantri Bibitan | Material & Bahan | Matching Material Dokumen Gudang | Confirmed |
| 159 | `RN-PWP-006` | Verifikasi Presensi & HK Harian Tenaga Kerja oleh Asisten Bibitan | Asisten Bibitan | Presensi | Presensi Pekerja Bibitan | Confirmed |
| 160 | `RN-MAT-MMG059` | Approval Rekonsiliasi Dokumen Gudang Material oleh Asisten Bibitan | Asisten Bibitan | Material & Bahan | Material Gudang Matching | Confirmed |
| 161 | `RN-EXP-008` | Plotting Polygon Lokasi Tanam Bibit & Konfirmasi Terima di Divisi | Asisten Divisi | Pengeluaran | Pengeluaran Bibit SPB Disetujui | Confirmed |
| 162 | `RN-SEL-012` | Otorisasi Berita Acara Pemusnahan Bibit Afkir oleh Asisten Kepala | Asisten Kepala | Penyeleksian | Seleksi Batch Polybag | Confirmed |
| 163 | `RN-ENT-008` | Audit Kemurnian Clone Tanaman Induk Entres oleh Tekniker I | Tekniker I | Kebun Entres | Menunas Plot Entres | Confirmed |
| 164 | `RN-OKL-029` | Kalibrasi & Uji Petik Standar Juru Okulasi oleh Tekniker I | Tekniker I | Okulasi | Okulasi Grafting Utama | Confirmed |
| 165 | `RN-RCV-028` | Uji Mutu & Daya Kecambah Benih Kelatak oleh Tekniker I | Tekniker I | Penerimaan | Penerimaan Benih Kelapa Sawit | Confirmed |
| 166 | `RN-EXP-009` | Rekonsiliasi Buku Stok Bibitan & SPPB Bulanan oleh KTU | KTU | Pengeluaran | Pengeluaran Bibit SPB Disetujui | Confirmed |
| 167 | `RN-MAT-MMG060` | Audit Biaya Material & Bukti Pengeluaran Barang oleh KTU | KTU | Material & Bahan | Material Gudang Matching | Confirmed |
| 168 | `RN-PWP-007` | Verifikasi Rekapitulasi HK & Upah Pekerja Bibitan oleh KTU | KTU | Presensi | Presensi Pekerja Bibitan | Confirmed |
| 169 | `RN-MNT-009` | Pencatatan Audit Trail Koreksi Transaksi Pembibitan | Mantri Bibitan | Rekam Pemeliharaan | Pencatatan Heading Kerja | Confirmed |
| 170 | `RN-SEM-TP036` | Transfer Tahap Pertumbuhan Seedling ke Okulasi oleh Asisten Bibitan | Asisten Bibitan | Penyemaian | Transplanting Polybag | Confirmed |
| 171 | `RN-SEL-013` | Verifikasi Transfer Batch Bibitan oleh Asisten Bibitan | Asisten Bibitan | Penyeleksian | Seleksi Batch Polybag | Confirmed |
| 172 | `RN-SEL-014` | Pemeriksaan Berkala Stok Bibit Siap Salur vs RKAP oleh Asisten Kepala | Asisten Kepala | Penyeleksian | Seleksi Batch Polybag | Confirmed |
