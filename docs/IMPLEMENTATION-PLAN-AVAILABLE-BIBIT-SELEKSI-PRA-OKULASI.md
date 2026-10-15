# Rencana Implementasi Validasi Bibit Diseleksi — Pemeriksaan Seleksi Pra-Okulasi

> **Status:** Diimplementasikan setelah persetujuan pengguna  
> **Ruang lingkup:** Pemeriksaan Seleksi I, Seleksi II, dan Seleksi III  
> **Tanggal:** 15 Oktober 2026

## 1. Tujuan

Memperbaiki batas validasi **Bibit Diseleksi** agar mengikuti jumlah bibit aktual yang tersedia untuk diperiksa. Rasio polybag terhadap bibit, termasuk asumsi 1 polybag = 2 bibit, tidak boleh menentukan batas jumlah bibit yang dapat diseleksi.

Aturan yang dituju:

1. Jika belum ada transaksi pemeriksaan sebelumnya dalam scope yang sama, `Bibit Diseleksi` tidak boleh melebihi `Jumlah Bibit` pada dokumen/scope tersebut.
2. Jika sudah ada transaksi sebelumnya, `Bibit Diseleksi` pada transaksi baru tidak boleh melebihi `Bibit Tersedia` setelah transaksi sebelumnya.
3. `Jumlah Polybag Diperiksa` tetap divalidasi terhadap sisa polybag untuk progres pemeriksaan fisik, tetapi tidak dipakai untuk menghitung batas bibit.
4. Validasi yang sama harus berlaku pada UI saat mengetik, saat submit, dan di fungsi validasi/manajer sebelum transaksi disimpan.

## 2. Temuan audit awal

- Di [selection-manager.js](../js/modules/selection/selection-manager.js), `getBedenganScopeStatusForSeleksi1`, `getBedenganScopeStatusForSeleksi2`, dan `getBedenganScopeStatusForSeleksi3` menghitung `inspectedBibit` secara proporsional dari polybag yang diperiksa dibanding polybag awal. Nilai ini dapat mengurangi kuota bibit walaupun belum ada bibit yang diseleksi/afkir sebanyak itu.
- Fungsi validasi ketiga tahap menggunakan nilai `inspectedBibit` sebagai jumlah bibit yang sudah terpakai untuk menentukan `availableBibit`.
- Di [selection-landing.js](../js/modules/selection/selection-landing.js), ketiga form juga menghitung batas input dari `currentSourceBibit - existingBibitSelected`; `existingBibitSelected` berasal dari `matchedBed.inspectedBibit`.
- Akibatnya, progres polybag dapat membuat form menyimpulkan Bibit Tersedia lebih kecil daripada saldo bibit aktual. Contoh kasus: populasi 12.000, transaksi sebelumnya menyeleksi 250, sehingga bibit tersedia 11.750; angka pemeriksaan polybag tidak boleh mengganti perhitungan saldo tersebut.

## 3. Definisi saldo dan aturan sumber kebenaran

Untuk setiap tahap, dokumen induk, dan bedengan:

```text
Saldo awal = jumlah bibit pada dokumen/scope
Bibit tersedia saat ini = saldo awal - total Bibit Diseleksi pada transaksi sebelumnya yang sah
Batas transaksi baru = Bibit tersedia saat ini
```

Jika transaksi terakhir menyimpan nilai saldo `Bibit Tersedia`/bibit dipertahankan secara eksplisit, nilai tersebut dapat dipakai sebagai saldo berjalan setelah diverifikasi terhadap saldo awal dan total transaksi sebelumnya. Untuk transaksi lama yang tidak menyimpan saldo itu, hitung mundur dari saldo awal dikurangi jumlah bibit yang diseleksi pada transaksi terdahulu. Saldo tidak boleh diturunkan dari polybag diperiksa.

Transaksi harus diisolasi berdasarkan dokumen induk, tahap seleksi, batch, dan bedengan, mengikuti relasi transaksi yang sudah dipakai modul. Transaksi CULL/deklarasi afkir yang bukan pemeriksaan fisik tidak dihitung sebagai transaksi pemeriksaan kecuali saat ini memang sudah termasuk dalam sumber saldo tahap terkait.

## 4. Rencana perubahan

### A. Lapisan perhitungan scope

1. Revisi perhitungan status scope Seleksi I, II, dan III agar menyediakan nilai saldo bibit tersedia berdasarkan total `actualBibitSelectedQty` (dengan fallback field legacy yang memang setara).
2. Pertahankan `inspectedPolybag`, `remainingPolybag`, dan status selesai pemeriksaan sebagai metrik terpisah.
3. Jangan gunakan `inspectedBibit` hasil rasio polybag sebagai pengurang saldo untuk validasi Bibit Diseleksi. Bila properti lama masih dibutuhkan untuk tampilan/progres historis, pisahkan maknanya dan jangan jadikan sumber kuota.
4. Tentukan kebijakan untuk saldo tersimpan dari transaksi terakhir: validasi kewajaran terhadap saldo awal dan histori; jika tidak konsisten, gunakan perhitungan dari transaksi sebelumnya dan tampilkan/rekam anomali sesuai pola error yang tersedia.

### B. Validasi manajer saat submit

1. Ubah validasi `validateSeleksi1Execution`, `validateSeleksi2Execution`, dan `validateSeleksi3Execution` agar membandingkan input Bibit Diseleksi dengan saldo bibit tersedia di scope terpilih.
2. Pastikan validator menerima histori transaksi aktual untuk scope yang sama dan mengecualikan transaksi yang tidak relevan/terhapus sesuai perilaku modul saat ini.
3. Pertahankan pemeriksaan angka bulat, nilai non-negatif, bedengan valid, alasan afkir, bukti foto, dan aturan polybag yang sudah ada.
4. Gunakan pesan yang menyebut batas aktual, misalnya `Jumlah bibit diseleksi (...) melebihi Bibit Tersedia (...)`.

### C. Form Seleksi I, II, dan III

1. Gunakan saldo `Bibit Tersedia` dari status scope sebagai sumber referensi form.
2. Perbarui validasi inline, kalkulator saldo setelah input, ringkasan transaksi, dan pemeriksaan ulang saat tombol Simpan ditekan.
3. Perbarui teks referensi agar pengguna dapat membedakan `Populasi/Jumlah Bibit` dengan `Bibit Tersedia` setelah transaksi sebelumnya.
4. Pastikan pergantian bedengan memuat ulang saldo scope yang sesuai dan tidak membawa nilai transaksi bedengan sebelumnya.

### D. Konsistensi histori dan tampilan

1. Periksa perhitungan `actualBibitRetainedQty`/saldo akhir yang disimpan saat transaksi agar konsisten dengan rumus saldo tersedia.
2. Pastikan tampilan ringkasan dan daftar transaksi menunjukkan jumlah bibit diseleksi aktual, tanpa mengubah data historis polybag.
3. Tidak melakukan migrasi destruktif atau menghapus/mengubah transaksi lama.

## 5. File kandidat

| File | Cakupan |
|---|---|
| `js/modules/selection/selection-manager.js` | Perhitungan saldo per scope dan validasi submit Seleksi I/II/III; peninjauan nilai saldo akhir yang disimpan. |
| `js/modules/selection/selection-landing.js` | Batas input langsung, pesan error, kalkulator, ringkasan, dan referensi saldo untuk ketiga form. |
| `tests/test-selection-available-bibit-validation.js` (baru atau suite seleksi terkait) | Skenario regresi formula saldo berdasarkan bibit aktual, terpisah dari progres polybag. |

Tidak ada perubahan kode dalam tahap penyusunan rencana ini.

## 6. Skenario verifikasi yang direncanakan

1. Transaksi pertama: populasi 12.000, belum ada transaksi sebelumnya; batas Bibit Diseleksi = 12.000.
2. Transaksi berikutnya setelah seleksi 250: Bibit Tersedia = 11.750; input 11.750 diterima dan 11.751 ditolak.
3. Progress polybag berubah tetapi transaksi bibit sebelumnya tetap 250; kuota bibit tetap 11.750, tidak berubah berdasarkan rasio polybag.
4. Kasus 3.000 polybag dari total 6.000 polybag dan 12.000 bibit; form tidak menyimpulkan bahwa hanya 6.000 bibit tersedia jika transaksi sebelumnya hanya menyeleksi 250.
5. Multi transaksi berurutan: saldo turun berdasarkan akumulasi bibit yang diseleksi, tanpa double count transaksi terakhir.
6. Isolasi bedengan dan dokumen: transaksi pada bedengan/dokumen lain tidak mengurangi saldo scope ini.
7. Legacy transaction: fallback ke field afkir lama yang setara menghasilkan saldo yang sama.
8. Ketiga tahap (I/II/III): aturan yang sama berlaku di inline validation, submit UI, dan validasi manajer.
9. Jumlah bibit nol, negatif, pecahan, kosong, serta input melebihi saldo tetap ditangani dengan pesan validasi yang benar.
10. Kalkulator saldo setelah input dan saldo tersimpan cocok dengan saldo sebelum dikurangi input dan setelah dikurangi input.

## 7. Risiko dan keputusan implementasi

- **Makna `Bibit Tersedia`:** beberapa layar mungkin memakai istilah yang sama untuk saldo tahap atau saldo batch. Implementasi harus memastikan sumbernya adalah dokumen tahap dan bedengan yang sedang diperiksa.
- **Transaksi legacy:** nama field historis dapat berbeda. Fallback hanya boleh mencakup field yang terbukti mewakili jumlah bibit afkir aktual; field polybag/progres tidak boleh dipakai sebagai pengganti.
- **Saldo transaksi terakhir:** bila histori tidak urut atau nilai saldo tersimpan bertentangan dengan akumulasi transaksi, aturan fallback perlu konsisten dan tidak boleh diam-diam meningkatkan saldo.
- **Status approve/return/delete:** saldo perlu mengikuti definisi transaksi sah yang sedang berlaku, termasuk perlakuan transaksi dikembalikan atau dihapus. Perilaku saat ini harus dipertahankan kecuali ada aturan bisnis terpisah.
- **Lingkup pembatasan repository:** dokumen `STOCK-INTEGRITY-CONTROL-IMPLEMENTATION-PLAN.md` memuat pembatasan eksekusi untuk pekerjaan stok yang lebih luas. Rencana ini tidak mengubah aturan stok batch atau approval; jika implementasi nantinya bersinggungan dengan pembatasan repository tersebut, keputusan scope perlu diselaraskan sebelum coding.

## 8. Kriteria selesai

- Batas Bibit Diseleksi di Seleksi I/II/III hanya berasal dari jumlah bibit awal dan saldo setelah transaksi bibit sebelumnya.
- Rasio polybag tidak mengurangi kuota Bibit Tersedia.
- UI dan validator manajer menyetujui/menolak kuantitas yang sama.
- Histori transaksi dan data polybag tetap utuh.
- Skenario verifikasi pada Bagian 6 lulus saat implementasi disetujui dan dikerjakan.

## 9. Catatan implementasi

Pengguna menyetujui implementasi pada 15 Oktober 2026. Perubahan menerapkan rumus saldo awal dikurangi jumlah bibit diseleksi terdahulu pada tiga fungsi status scope, tiga validator manajer, dan tiga form. `remainingBibit`/`availableBibit` kini mencerminkan jumlah bibit aktual; `inspectedBibit` tetap tersedia sebagai metrik historis terpisah dari polybag.

Skenario regresi ditambahkan pada `tests/test-selection-available-bibit-validation.js`: untuk tiap tahap, 12.000 bibit awal dengan 3.000 polybag diperiksa dan 250 bibit diseleksi menghasilkan saldo 11.750; batas diterima dan satu angka di atasnya ditolak.

## 10. Hasil verifikasi

- `node tests/test-selection-available-bibit-validation.js` — lulus untuk Seleksi I/II/III, termasuk batas 11.750 dan penolakan 11.751 ketika populasi awal 12.000, 3.000 polybag diperiksa, dan afkir sebelumnya 250.
- `node tests/test-selection-continuous-entry-and-calculator.js` — lulus, 61 skenario.
- `node tests/test-seleksi1-available-population-calculation.js` — lulus seluruh skenario.
- `node tests/test-batch-centric-seleksi-downstream.js` — 6 lulus, 9 gagal karena fixture SOW ditolak oleh prasyarat konfirmasi/verifikasi approval sebelum menguji perhitungan saldo; kegagalan berada di luar skenario validasi saldo pada perubahan ini.
- `git diff --check` — tidak melaporkan whitespace pada hunks baru; memberi peringatan whitespace pada file lain/hunks lama yang sudah berubah di working tree.
