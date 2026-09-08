import fs from 'fs';

const rawData = JSON.parse(fs.readFileSync('scripts/exact_31_gap_data.json', 'utf8'));
const { exact31Gaps } = rawData;

const classificationResults = [
  {
    id: 'RN-OKL-004',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Perekaman identitas Juru Okulasi oleh Mantri Bibitan sebelum penempelan entres.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M04 Okulasi): Flow mencakup penentuan juru okulasi & presensi sebelum transaksi.',
    notes: 'Requirement confirmed dan operasional, hanya belum memiliki step node visual mandiri pada diagram grafting.'
  },
  {
    id: 'RN-OKL-007',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Pemotongan saldo stok mata entres terjadi setelah verifikasi Asisten Bibitan.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M04 Okulasi & BR-OKL-007): Stok berkurang otomatis pasca-verifikasi Asisten.',
    notes: 'Requirement confirmed dan baku, perlu dipetakan ke node step pasca verifikasi Asisten.'
  },
  {
    id: 'RN-OKL-009',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Sistem menyajikan kalkulasi rasio dan estimasi penggunaan mata entres sebagai referensi Mantri.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M04 Okulasi): Perhitungan otomatis estimasi entres.',
    notes: 'Requirement confirmed, dijalankan otomatis di background form aplikasi mobile.'
  },
  {
    id: 'RN-OKL-010',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Pencatatan jumlah mata entres aktual yang berhasil ditempelkan oleh Mantri.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M04 Okulasi): Flow Catat Hasil Grafting -> Simpan.',
    notes: 'Requirement confirmed sebagai input utama hasil kerja penempelan okulasi.'
  },
  {
    id: 'RN-OKL-012',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Pengiriman berkas transaksi okulasi ke antrean verifikasi Asisten Bibitan.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M04 Okulasi & BR-GLB-002): Wajib verifikasi Asisten Bibitan.',
    notes: 'Requirement confirmed untuk transisi status Menunggu Verifikasi.'
  },
  {
    id: 'RN-OKL-014',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Revisi',
    decision: 'Belum didefinisikan pada baseline (kebutuhan integrasi backend background stock promotion).',
    classification: 'REVISE',
    evidence: 'MASTER_BASELINE_CURRENT Section 7: "Requirement yang masih REVISI: RN-OKL-014. Gunakan: Belum didefinisikan pada baseline."',
    notes: 'WAJIB REVISE: Status bisnis adalah REVISI. Menunggu spesifikasi teknis sinkronisasi server resmi.'
  },
  {
    id: 'RN-RCV-KSP019',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Mantri Bibitan mengeksekusi muat bibit kebun sepupu sesuai alokasi SPB yang disetujui Askep.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 6 (Pengurus) & M02 Penerimaan: Muat bibit ke armada cross-estate.',
    notes: 'Requirement confirmed dan valid, perlu node step visual pada alur terima-kebun-sepupu.'
  },
  {
    id: 'RN-RCV-ME025',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Mantri memotong dan mengemas kayu entres untuk pengiriman kebun sepupu berdasarkan otorisasi Askep.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 6 (Pengurus) & M02 Penerimaan: Eksekusi panen/kemas entres cross-estate.',
    notes: 'Requirement confirmed dan valid, perlu node step visual pada alur terima-mata-entres.'
  },
  {
    id: 'RN-CHK-RG036',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Pemeriksaan hasil regrafting bersifat dinamis dan dapat dilakukan bertahap sesuai umur tempelan.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M05 Pemeriksaan): Pemeriksaan dinamis bertahap.',
    notes: 'Requirement confirmed pada modul 05, bagian dari alur periksa-regrafting.'
  },
  {
    id: 'RN-CHK-RG037',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Bibit gagal pada pemeriksaan regrafting dapat diputuskan Regrafting ulang atau Reject.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M05 Pemeriksaan & BR-OKL-008): Gagal tidak otomatis reject; Mantri menentukan tindak lanjut.',
    notes: 'Requirement confirmed, aturan keputusan tindak lanjut regrafting.'
  },
  {
    id: 'RN-CHK-RG038',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Validasi fisik QR Code plang Batch sebelum pemeriksaan hasil regrafting.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M05 Pemeriksaan): Validasi Batch via QR Code.',
    notes: 'Requirement confirmed, langkah awal validasi objek fisik bedengan/batch.'
  },
  {
    id: 'RN-CHK-RG039',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Mantri menginput jumlah bibit regrafting yang diperiksa pada sesi berjalan.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M05 Pemeriksaan): Tentukan Jumlah yang Diperiksa.',
    notes: 'Requirement confirmed, input sampel sesi berjalan.'
  },
  {
    id: 'RN-CHK-RG040',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Mantri mencatat jumlah mata tempelan hijau (berhasil) vs hitam/mati (gagal).',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M05 Pemeriksaan): Catat Berhasil & Gagal (Berhasil + Gagal = Jumlah Diperiksa).',
    notes: 'Requirement confirmed, input variabel kunci mutu hasil regrafting.'
  },
  {
    id: 'RN-CHK-RG041',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Mantri menetapkan pilihan tindak lanjut: Regrafting kembali atau Afkir/Reject.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M05 Pemeriksaan): Tentukan Tindak Lanjut.',
    notes: 'Requirement confirmed, penetapan status tindak lanjut non-blocking.'
  },
  {
    id: 'RN-CHK-RG042',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Pengambilan foto dokumentasi fisik mata tempelan regrafting beserta timestamp dan GPS.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 8 (Global Rule BR-GLB-001): Mandatory Foto + Timestamp ISO.',
    notes: 'Requirement confirmed, bukti otentik lapangan.'
  },
  {
    id: 'RN-CHK-RG043',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Pengiriman berkas pemeriksaan regrafting ke antrean persetujuan Asisten Bibitan.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M05 Pemeriksaan): Verifikasi Asisten Bibitan.',
    notes: 'Requirement confirmed, kewajiban approval Asisten Bibitan.'
  },
  {
    id: 'RN-CHK-RG044',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Pemeriksaan regrafting selesai dan berstatus terverifikasi resmi.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M05 Pemeriksaan): Simpan & status terverifikasi.',
    notes: 'Requirement confirmed, terminal akhir alur periksa-regrafting.'
  },
  {
    id: 'RN-ENT-TOP045',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Aktivitas pemeliharaan topping plot entres menghitung rasio Perisai/Kayu dan Perisai/Meter.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M07 Kebun Entres): Fitur Topping FINAL confirmed.',
    notes: 'Requirement confirmed, inisialisasi form topping kebun entres.'
  },
  {
    id: 'RN-ENT-TOP046',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Validasi fisik QR Code plang plot entres sebelum pelaksanaan topping.',
    classification: 'MASTER_BASELINE_CURRENT Section 4 (M07 Kebun Entres): Scan QR plot entres.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M07 Kebun Entres & BR-OKL-002): Scan QR Plot Entres.',
    notes: 'Requirement confirmed, validasi plot kebun kayu okulasi.'
  },
  {
    id: 'RN-ENT-TOP047',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Sistem menyajikan data klon dan jumlah pokok tanaman induk per plot yang dirawat.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M07 Kebun Entres): Tampilkan clone & pokok.',
    notes: 'Requirement confirmed, penyajian data master tanaman induk.'
  },
  {
    id: 'RN-ENT-TOP048',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Mantri menginput Tanggal, Jumlah Kayu Okulasi, Total Panjang Meter, dan Jumlah Perisai.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M07 Kebun Entres): Input variabel topping.',
    notes: 'Requirement confirmed, input parameter fisik cabang/kayu.'
  },
  {
    id: 'RN-ENT-TOP049',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Sistem menghitung rasio rata-rata Perisai/Kayu dan Perisai/Meter secara otomatis.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M07 Kebun Entres): Kalkulasi rasio otomatis.',
    notes: 'Requirement confirmed, auto-kalkulasi background aplikasi.'
  },
  {
    id: 'RN-ENT-TOP050',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Foto dokumentasi plot setelah ditopping beserta timestamp dan verifikasi Asisten Bibitan.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M07 Kebun Entres): Verifikasi Asisten Bibitan (tanpa Askep approval).',
    notes: 'Requirement confirmed, verifikasi level Asisten Bibitan.'
  },
  {
    id: 'RN-ENT-TOP051',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Plot entres terawat optimal dan siap menghasilkan kayu entres berkualitas.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M07 Kebun Entres): Status pemeliharaan tuntas.',
    notes: 'Requirement confirmed, terminal akhir alur entres-topping.'
  },
  {
    id: 'RN-MAT-MMG052',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Pencocokan dokumen pengeluaran gudang material (BKB) wajib 1 Dokumen Gudang = 1 Heading Kerja.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M09 Material & Bahan): Integritas matching 1 BKB = 1 Heading.',
    notes: 'Requirement confirmed, prinsip baku matching gudang.'
  },
  {
    id: 'RN-MAT-MMG053',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Pemilihan rentang waktu dan jenis material gudang yang akan ditinjau rekonsiliasinya.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M09 Material & Bahan): Filter parameter matching BKB.',
    notes: 'Requirement confirmed, filter antrean dokumen gudang.'
  },
  {
    id: 'RN-MAT-MMG054',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Pencocokan nomor BKB material gudang terhadap realisasi aplikasi pemeliharaan berbasis Heading Kerja.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M09 Material & Bahan): Pencocokan dokumen gudang.',
    notes: 'Requirement confirmed, rekonsiliasi pemakaian fisik vs dokumen.'
  },
  {
    id: 'RN-MAT-MMG055',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Penarikan alokasi pupuk, herbisida, fungisida, dan plastik okulasi dari pengeluaran gudang.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M09 Material & Bahan): Alokasi material gudang.',
    notes: 'Requirement confirmed, query data stok gudang kebun.'
  },
  {
    id: 'RN-MAT-MMG056',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Validasi batas alokasi material memastikan kuantitas pemakaian tidak melebihi kuota BKB.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M09 Material & Bahan): Validasi kuota BKB non-exceeding.',
    notes: 'Requirement confirmed, validasi batas maksimum.'
  },
  {
    id: 'RN-MAT-MMG057',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Notifikasi konfirmasi berhasil; dokumen material melekat pada rekam pemeliharaan.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M09 Material & Bahan): Konfirmasi matching material.',
    notes: 'Requirement confirmed, feedback sukses pencatatan.'
  },
  {
    id: 'RN-MAT-MMG058',
    runtimeStatus: 'Confirmed',
    baselineStatus: 'Active',
    decision: 'Seluruh material dan mutasi stok tercatat rapi serta sah dibukukan.',
    classification: 'FLOW MAPPING',
    evidence: 'MASTER_BASELINE_CURRENT Section 4 (M09 Material & Bahan): Status akhir matching sah.',
    notes: 'Requirement confirmed, terminal akhir alur matching BKB.'
  }
];

// Summary counts
const summaryCounts = {
  KEEP: 0,
  REVISE: 0,
  ARCHIVE: 0,
  KONFIRMASI: 0,
  'FLOW MAPPING': 0
};

classificationResults.forEach(r => {
  if (summaryCounts[r.classification] !== undefined) {
    summaryCounts[r.classification]++;
  }
});

console.log('Classification Summary:');
console.log(JSON.stringify(summaryCounts, null, 2));

fs.writeFileSync('scripts/classification_31_gap_results.json', JSON.stringify({ summary: summaryCounts, items: classificationResults }, null, 2));
