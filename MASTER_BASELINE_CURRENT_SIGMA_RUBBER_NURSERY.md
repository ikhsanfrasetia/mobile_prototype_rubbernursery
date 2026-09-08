# MASTER BASELINE CURRENT
## SIGMA Rubber Nursery — Business Process & Requirement

**Status:** LOCKED — Kondisi Kerja Saat Ini  
**Tanggal konsolidasi:** 08 September 2026  
**Tujuan:** Menjadi acuan tunggal untuk review lanjutan dan implementasi portal requirement.  
**Prinsip:** Tidak menambah requirement, rule, aktor, atau langkah proses yang belum diputuskan.

---

## 1. STRUKTUR MASTER

Format yang dikunci:

**Role → Modul → Fitur → Requirement → Flow → Business Rule**

Status isi:
- **VALID** = sudah disepakati/dipertahankan.
- **REVISI** = requirement/wording perlu mengikuti keputusan terbaru.
- **KONFIRMASI** = belum boleh dianggap sebagai requirement final.
- **HISTORIS** = hanya referensi, bukan baseline aktif.
- **OPEN POINT** = belum didefinisikan.

---

## 2. ROLE MASTER TERKINI

| Role | Status Requirement |
|---|---|
| Mantri Bibitan | AKTIF |
| Asisten Bibitan | AKTIF |
| Asisten Divisi | AKTIF |
| Asisten Kepala | AKTIF |
| Pengurus Kebun Peminta | AKTIF — requirement existing dipertahankan |
| Tekniker I | KOSONG DULU |
| KTU | KOSONG DULU |

### Aturan penting
**Tekniker I dan KTU tetap ada sebagai role master, tetapi tidak memiliki requirement, flow, narrative, atau business rule khusus sampai ada evidence/stakeholder confirmation.**

Requirement hasil konstruksi/rekomendasi sebelumnya untuk Tekniker I dan KTU tidak dimasukkan ke baseline aktif.

---

## 3. MODUL MASTER

Jumlah modul yang tetap digunakan: **11 modul**.

### M01 — Presensi

**Fitur:**
- Presensi Supervisor
- Presensi Pekerja Bibitan

**Keputusan terkunci:**
- Tidak ada langkah user memilih status Datang/Pulang.
- Sistem menentukan status berdasarkan waktu/status presensi.
- Face ID menjadi metode utama.
- Saat Face ID digunakan, sistem mengambil foto secara otomatis.
- Foto manual hanya sebagai fallback ketika Face ID gagal dan harus disertai alasan.
- GPS wajib dan harus berada di area nursery/kebun yang diperbolehkan.
- Presensi Masuk wajib dilakukan sebelum transaksi operasional.
- Presensi Pulang tidak menjadi pengunci transaksi setelahnya.
- Presensi Pulang dapat dilakukan mulai 14:00; hari Jumat mulai 12:00.
- Data presensi menyimpan waktu aktual, GPS, metode, dan foto.
- Verifikasi Data dilakukan satu per satu, status menjadi `Terkonfirmasi`, dan transaksi terkunci setelah dikirim.
- Pengiriman ulang memperbarui waktu kirim terakhir.
- Asisten Bibitan memverifikasi Presensi Supervisor tanpa melakukan koreksi/action tambahan.
- Presensi pekerja dilakukan satu per satu oleh Mantri setelah presensi Mantri.
- Presensi pekerja manual tetap membutuhkan alasan.
- Presensi manual pekerja diverifikasi oleh Asisten Bibitan.

**Catatan baseline:**
- Requirement `RN-PWP-006` dan `RN-PWP-007` yang sebelumnya muncul dari gap-resolution diperlakukan sebagai KONFIRMASI, bukan requirement terkonfirmasi.
- `RN-PRS-004` adalah deprecated/historis; jangan diaktifkan kembali.

---

### M02 — Penerimaan

**Keputusan terkunci:**
- Pemeriksaan meliputi dokumen, jumlah aktual, kondisi fisik, dan QR/data Batch sesuai kebutuhan proses.
- Selisih quantity boleh diterima dan dicatat sebagai quantity aktual.
- Bibit tetap dapat dikirim/diterima meskipun kondisi fisik tidak sempurna; kondisi yang tidak layak dipisahkan sebagai Reject sesuai proses.
- Satu request dapat memiliki beberapa shipment.
- Satu request dapat memiliki beberapa Batch.
- Penerima kebun sendiri adalah Asisten Divisi.
- Penerima kebun sepupu adalah Pengurus.
- Status request: `Disetujui` sampai seluruh kebutuhan terpenuhi, lalu `Terpenuhi`.
- `Terpenuhi` hanya setelah total quantity tercapai dan seluruh shipment terverifikasi.
- Penerimaan pemeriksaan oleh Mantri menunggu verifikasi Asisten Bibitan.
- Asisten dapat mengoreksi quantity dengan menyimpan nilai asli, nilai koreksi, alasan, waktu, dan pelaku koreksi.
- Setelah verifikasi status menjadi `Terverifikasi`.
- Penerimaan bibit kebun sepupu dapat dilakukan oleh Pengurus / Asisten Kepala / Asisten Bibitan dan langsung berakhir pada `Terverifikasi` sesuai alur yang telah disepakati.
- Polygon Peta Penerimaan hanya untuk histori/informasi fisik area.
- Polygon tidak melakukan overlap validation dan tidak otomatis menghitung/mengurangi area/populasi.
- Polygon dapat direvisi oleh Asisten dengan alasan.

---

### M03 — Penyemaian

**Keputusan terbaru yang WAJIB menggantikan narasi lama:**
- **Umur/tahap kecambah dihapus dari narasi kelayakan.**
- **Seluruh proses “Transplantasi ke Polybag” dihapus dari baseline narasi saat ini.**

**Keputusan terkunci:**
- Mantri memeriksa kelayakan benih/kecambah sebelum dialokasikan.
- Bedengan bersifat dinamis.
- Satu Bedengan dapat berisi beberapa Batch.
- Asisten menyiapkan master Bedengan dan Batch untuk kebutuhan QR.
- Batch dibuat tanpa Clone; Clone ditentukan pada proses Grafting.
- Kesiapan lebih menekankan kondisi fisik; sistem hanya memberi informasi/rekomendasi.
- Status okulasi mengikuti:
  `Perlu Diokulasi → Sebagian Diokulasi → Selesai Diokulasi`.
- Satu dokumen penerimaan tetap menyimpan saldo yang belum dialokasikan.
- Setiap alokasi penyemaian merupakan transaksi terpisah.
- `Seeded + Reject <= Allocation`.
- Reject harus memiliki foto dan timestamp.
- Transaksi penyemaian menunggu verifikasi Asisten.
- Nilai reject dibawa sebagai data untuk proses Penyeleksian.
- Penyeleksian menggunakan prinsip:
  `Populasi Awal - Reject/Mati/Afkir = Layak`.

**Larangan:** Jangan menghidupkan kembali narasi Transplantasi/Polybag dari dokumen historis.

---

### M04 — Okulasi (Grafting)

**Nama fitur dikunci:** **Okulasi (Grafting)**

**Wording tujuan dikunci:**
> Melakukan okulasi pada bibit dalam Batch menggunakan material Mata Entres dari Kebun Kayu Okulasi.

**Istilah:**
- Gunakan **Kebun Kayu Okulasi**.
- Hindari penggunaan `KKO` sebagai istilah utama di narasi bisnis.

**Flow kerja yang digunakan saat ini:**
`Pilih Batch → Tentukan Populasi yang Diokulasi → Pilih Material Mata Entres → Catat Hasil Grafting → Simpan`

**Keputusan terkunci:**
- Grafting boleh parsial.
- Satu Batch dapat memiliki beberapa transaksi/lot.
- Regrafting menggunakan Batch yang sama tetapi merupakan transaksi/lot tersendiri.
- Dalam satu Batch dapat terdapat `Sudah Grafting + Sedang Regrafting + Belum Grafting`.
- Status `Sedang Regrafting` dimulai saat transaksi dibuat.
- Setelah selesai → `Siap Pemeriksaan`.
- Setiap proses okulasi harus memiliki referensi material Mata Entres dari Kebun Kayu Okulasi.
- Input Mantri → submit → verifikasi Asisten Bibitan → `Terverifikasi`.

**Belum final:**
- Detail technical actor/stock timing pada `RN-OKL-014` / `RN-REG-010`.
- Jangan mengisi detail yang belum disepakati.

---

### M05 — Pemeriksaan

**Fitur:**
- Pemeriksaan Bertahap Grafting
- Pemeriksaan Regrafting

**Flow dikunci:**
`Pilih Dokumen Okulasi → Validasi Batch → Tentukan Jumlah yang Diperiksa → Catat Berhasil & Gagal → Tentukan Tindak Lanjut → Simpan`

**Keputusan:**
- Pemeriksaan bersifat bertahap/dinamis.
- Hasil: Berhasil dan Gagal.
- `Berhasil + Gagal = Jumlah Diperiksa`.
- Bibit gagal tidak otomatis menjadi Reject.
- Mantri menentukan tindak lanjut: Regrafting atau Reject/Mati/Afkir.
- Pemeriksaan tidak langsung mengurangi stock/populasi.
- Input Mantri → verifikasi Asisten Bibitan.

**Catatan:** requirement tambahan hasil gap resolution terkait Pemeriksaan Regrafting belum dinaikkan menjadi baseline final.

---

### M06 — Penyeleksian

**Keputusan terkunci:**
- Tujuan utama: pencatatan kondisi fisik dan perubahan populasi.
- Hasil: `Layak` dan `Reject/Mati/Afkir`.
- Seleksi dilakukan per Batch.
- Transaksi boleh parsial/dinamis.
- `Reject/Mati/Afkir` mengurangi populasi.
- `Layak` merupakan status hasil seleksi, bukan pengurangan populasi.
- Data Reason dipakai untuk histori hasil seleksi.
- Jangan menambahkan role tambahan dari requirement KONFIRMASI yang belum disetujui.

---

### M07 — Kebun Entres

**Status:** FINAL LOCKED

**Fitur utama:**
- Menunas
- Topping

**Keputusan:**
- Menunas dan Topping menjadi proses utama dalam scope Kebun Entres.
- Keduanya menghasilkan material yang digunakan pada proses Panen Mata Entres/Okulasi sesuai flow yang telah dikunci.
- Jangan menambahkan approval Asisten Kepala yang sebelumnya muncul sebagai requirement KONFIRMASI.

---

### M08 — Panen Mata Entres

**Status:** FINAL LOCKED

**Wording dikunci:**
> Panen Mata Entres menghasilkan Mata Entres aktual yang siap digunakan untuk proses Okulasi (Grafting) dan Okulasi Janda (Regrafting).

**Flow dikunci:**
`Scan QR Plot Entres → Validasi Plot → Tampilkan Clone → Input Jumlah Cabang Entres → Input Rata-rata Mata Entres/Cabang → Sistem Menghitung Estimasi → Input/Konfirmasi Mata Entres Aktual → Foto Timestamp → Simpan → Verifikasi Asisten Bibitan`

**Catatan:**
- Narasi proses tidak memakai kalimat “Mata Entres aktual masuk stok” sebagai penjelasan utama.
- Informasi stock flow ditempatkan pada modul Material & Bahan.

---

### M09 — Material & Bahan

**Status:** FINAL LOCKED

**Wording stock dikunci:**
> Stok dapat bertambah dari hasil Panen Mata Entres yang sudah terverifikasi. Stok digunakan untuk kebutuhan Okulasi (Grafting), Regrafting, permintaan, dan pengeluaran.

**Keputusan:**
- Material usage terhubung dengan Dokumen Gudang jika material digunakan.
- Pencocokan berdasarkan Heading Kerja.
- `1 Dokumen Gudang = 1 Heading Kerja`.
- Dokumen gudang yang tidak sesuai Heading Kerja tidak dapat digunakan.

**Catatan:**
- Requirement hasil gap-resolution terkait approval/audit Tekniker/role lain tetap KONFIRMASI dan tidak menjadi baseline aktif.

---

### M10 — Rekam Pemeliharaan

**Status:** FINAL LOCKED

**Flow dikunci persis:**
`Pilih Heading Kerja → Pilih Objek/Lokasi → Pilih Pekerja → Input Output → Simpan`

**Keputusan:**
- Tidak ada langkah “Pilih Grup Heading”.
- Satu alokasi dapat memiliki banyak pekerja.
- Setiap alokasi memiliki target output.
- Rumus jam kerja:
  `Output Pekerja ÷ Target Output Alokasi × 7 Jam Kerja`.
- Jam kerja normal 7 jam; Jumat 5 jam.
- Kekurangan output hanya menghasilkan rekomendasi, bukan blocking.
- Mantri mengambil keputusan atas rekomendasi.
- Asisten dapat mengubah keputusan dengan menyimpan nilai awal, perubahan, alasan, waktu, dan pelaku.
- Setelah verifikasi Asisten → `Terverifikasi`.

---

### M11 — Pengeluaran

**Status:** FINAL LOCKED

**Keputusan:**
- Sumber pengeluaran hanya request yang telah disetujui Asisten Kepala.
- Satu request dapat mempunyai beberapa shipment.
- Satu shipment dapat memiliki beberapa Batch.
- Quantity setiap detail tidak boleh melebihi saldo Batch dan total tidak boleh melebihi sisa request.
- Saldo/populasi berkurang setelah penerima melakukan konfirmasi.
- Status shipment Mantri: `Menunggu Konfirmasi Penerima`.
- Penerima mencatat quantity aktual, foto, dan timestamp.
- Selisih dapat dikoreksi Asisten dengan menyimpan nilai awal + nilai koreksi + alasan.
- Setelah verifikasi → `Terverifikasi` dan stok/request diperbarui.
- Pengurus pada sisi penerimaan kebun peminta melakukan konfirmasi dengan foto + timestamp tanpa verifikasi Asisten tambahan.
- Asisten Kepala dapat membuat request untuk kebutuhan sendiri/kebun sepupu dan menangani approval sesuai kewenangan yang telah disepakati.
- Request Asisten Divisi mengacu pada rencana tanam, Clone, quantity, dan tanggal kebutuhan.
- Polygon Peta Pengeluaran merupakan histori/informasi lokasi fisik release.
- Polygon **tidak** otomatis mengurangi area/populasi.
- Release parsial dapat menghasilkan beberapa polygon histori.
- Polygon diverifikasi bersama shipment; mismatch menyebabkan pemetaan ulang oleh Mantri.
- Setelah verifikasi, Asisten dapat merevisi polygon dengan alasan.

---

## 4. PENGURUS — REQUIREMENT EXISTING YANG DIPERTAHANKAN

Requirement existing yang telah diverifikasi tetap dipertahankan:

| ID | Requirement |
|---|---|
| RN-RCV-KSP016 | Pengurus mengajukan SPB bibit kebun sepupu / pengajuan resmi alokasi bibit cross-estate. |
| RN-RCV-KSP020 | Pengurus menerima bibit di lokasi tanam, memeriksa fisik, dan mengonfirmasi penerimaan. |
| RN-RCV-KSP021 | Seluruh proses penerimaan bibit kebun sepupu selesai terverifikasi. |
| RN-RCV-ME022 | Pengurus mengajukan permintaan Mata Entres untuk kebun peminta. |
| RN-RCV-ME026 | Pengurus menerima Mata Entres, memeriksa fisik, dan mengonfirmasi penerimaan. |
| RN-RCV-ME027 | Seluruh proses penerimaan Mata Entres selesai. |

**Catatan:** Detail proses Pengurus lainnya tidak ditambahkan tanpa evidence.

---

## 5. GLOBAL BUSINESS RULE

### Verifikasi
- Transaksi Mantri menjadi data resmi setelah verifikasi Asisten.
- Setelah terverifikasi, transaksi normal terkunci.
- Perubahan setelah verifikasi tidak boleh dilakukan secara diam-diam.

### Koreksi
Koreksi oleh Asisten menyimpan:
- nilai asli,
- nilai koreksi,
- alasan,
- pelaku koreksi,
- waktu koreksi.

### Perhitungan sistem
Perhitungan otomatis dipisahkan dari requirement actor/user.
Jangan menulis perhitungan sistem seolah-olah user melakukan input manual.

### Alert / rekomendasi
Sistem memberikan informasi, rekomendasi, atau alert.
Keputusan operasional tetap berada pada user yang berwenang.

### Traceability
Setiap item BPD/requirement harus dapat ditelusuri minimal ke Req ID, Node ID, atau Rule ID.

---

## 6. STATUS DATA YANG TIDAK BOLEH DIANGGAP FINAL

### KONFIRMASI — jangan aktifkan
Requirement yang muncul dari gap-resolution / konstruksi rekonsiliasi multi-role, termasuk yang sebelumnya diasosiasikan dengan:
- KTU,
- Tekniker I,
- approval tambahan Asisten Kepala,
- approval tambahan Pengurus,
- approval/audit role tambahan.

### HISTORIS
Dokumen lama yang masih memuat:
- Transplantasi ke Polybag,
- narasi umur/tahap kecambah,
- role KTU/Tekniker dengan requirement usulan,
- angka baseline lama yang sudah berubah.

### REVISI
Item yang sebelumnya ditandai perlu penyelarasan, khususnya:
- RN-OKL-014
- RN-REG-010
- RN-MAT-005

Detail final tidak boleh diisi dengan asumsi.

---

## 7. DAFTAR LARANGAN IMPLEMENTASI

Agent **tidak boleh**:
1. Membuat requirement baru hanya karena suatu role terlihat “belum punya pekerjaan”.
2. Mengaktifkan kembali requirement Tekniker I atau KTU.
3. Menghidupkan kembali Transplantasi.
4. Menghidupkan kembali narasi umur/tahap kecambah sebagai syarat.
5. Menambah langkah proses yang tidak ada dalam keputusan baseline.
6. Mengubah business rule hanya untuk membuat flow terlihat lengkap.
7. Menggunakan wording AI/formal berlebihan.
8. Menjadikan requirement KONFIRMASI/HISTORIS sebagai VALID.
9. Menghapus role master KTU atau Tekniker I.
10. Mengubah Mobile Prototype / source mobile yang sudah dikunci.

---

## 8. GAYA NARASI

Narasi requirement/BPD harus:
- singkat,
- natural,
- bahasa operasional lapangan,
- menjelaskan tindakan yang benar-benar dilakukan,
- tidak memaksa semua field masuk ke satu kalimat,
- tidak menambahkan asumsi teknis,
- tidak terdengar seperti teks AI/template.

Contoh gaya:
> Mantri memilih Batch yang akan diokulasi, menentukan jumlah bibit yang dikerjakan, kemudian memilih Mata Entres dari Kebun Kayu Okulasi. Hasil okulasi disimpan untuk kemudian diverifikasi oleh Asisten Bibitan.

Bukan:
> Sistem secara komprehensif mengorkestrasi proses end-to-end dengan validasi multi-layer berdasarkan best practice operasional.

---

## 9. SUMBER PRIORITAS

Urutan sumber yang digunakan saat terjadi perbedaan:
1. **Keputusan Requirement terbaru yang sudah dikunci bersama.**
2. Final Requirement Baseline yang telah dikonfirmasi.
3. Flow Nodes/Edges yang sudah disetujui.
4. Canonical Business Rules.
5. RTM.
6. DAK Final.
7. Data Dictionary.
8. Dokumen historis hanya sebagai referensi.

**Dokumen historis tidak boleh mengalahkan keputusan terbaru.**

---

## 10. KONDISI TERKUNCI PER 08-09-2026

**Baseline kerja saat ini: TERKUNCI.**

Kunci utama:
- 7 role master tetap ada.
- 2 role (**KTU, Tekniker I**) sengaja kosong.
- 11 modul tetap digunakan.
- Modul 3 sudah dibersihkan dari Transplantasi dan umur/tahap kecambah.
- Modul 4, 7, 8, 9, 10, 11 telah memiliki wording/flow yang dikunci.
- Requirement Pengurus existing dipertahankan.
- Requirement KONFIRMASI/HISTORIS tidak boleh dipromosikan menjadi baseline.
- Semua informasi yang belum didefinisikan tetap ditulis sebagai:
  **“Belum didefinisikan pada baseline.”** atau `-`.

**STATUS: LOCKED — READY FOR MASTER BASELINE IMPLEMENTATION**
