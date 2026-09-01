/**
 * modules/review/review-workspace.js — Prototype Review & Catatan Perbaikan Workspace.
 * Mengelola feedback dinamis ke Database Server (REST API /api/notes),
 * notifikasi email otomatis, marker layer responsif, filter, dan CRUD status.
 */

import { getCurrent, navigate } from '../../core/router.js';
import { openModal, closeModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { esc } from '../../core/utils.js';
import { session } from '../../core/session.js';

const STORAGE_KEY = 'sigma_feedback_notes';
const API_URL = '/api/notes';

const PROCESS_STEPS = [
  {
    step: 1,
    title: 'Autentikasi, VPN & Sinkronisasi Master Data',
    role: 'MANTRI_TANAMAN',
    roleLabel: 'Semua Role (Wajib VPN)',
    status: 'READY',
    statusLabel: 'Siap Uji (Aktif)',
    route: '/sync',
    desc: 'Pengguna mengaktifkan koneksi VPN (Status: Connected), melakukan login identitas kredensial terdaftar, inisialisasi offline storage, dan sinkronisasi master data terkini (Divisi, Pekerja, SIR, Klon, Gudang).',
    output: 'Status VPN Connected, Master data tersimpan di Database Server, sesi login aktif.',
    icon: '🔐',
    flowChart: {
      summary: 'Alur aktivasi wajib koneksi VPN (Status Connected) untuk seluruh role, otentikasi akun, dan sinkronisasi dataset master dengan Database Server.',
      nodes: [
        { id: '1.1', type: 'start', label: 'Buka App & Splash Screen', actor: 'Semua Role', desc: 'Inisialisasi PWA & pengecekan sesi login lokal' },
        { id: '1.2', type: 'process', label: 'Aktivasi Switch VPN', actor: 'Semua Role', desc: 'Nyalakan toggle VPN hingga berstatus Connected' },
        { id: '1.3', type: 'decision', label: 'Status VPN Connected?', actor: 'Sistem', desc: 'Pemeriksaan status koneksi jaringan aman', branch: '✅ Connected: Buka Form Login | ❌ Disconnected: Login Terkunci' },
        { id: '1.4', type: 'process', label: 'Input Kredensial Akun', actor: 'Semua Role', desc: 'Masukkan Nama Akun / NIK dan Kata Sandi' },
        { id: '1.5', type: 'process', label: 'Tarik & Simpan Master Data', actor: 'Storage Engine', desc: 'Sinkronisasi Divisi, Pekerja, SIR, Klon, & Gudang dari Database Server' },
        { id: '1.6', type: 'end', label: 'Beranda Siap Operasional', actor: 'Semua Role', desc: 'Sesi aktif terverifikasi, hak akses role terbuka' }
      ],
      inputs: ['Koneksi VPN Aktif (Status Connected)', 'Nama Akun / NIK Terdaftar', 'Kata Sandi'],
      outputs: ['Koneksi Jaringan Aman Terverifikasi', 'Sesi Login Aktif (Session Storage)', 'Database Server Terisi Lengkap'],
      sopRules: [
        'VPN wajib diaktifkan (Status: Connected) pada semua role agar dapat melakukan login.',
        'Wajib sync data setiap pagi di kantor/afdeling sebelum masuk areal blind spot.',
        'Gunakan kredensial akun pribadi yang sah.'
      ]
    }
  },
  {
    step: 2,
    title: 'Presensi Harian Supervisor & Pekerja',
    role: 'MANTRI_TANAMAN',
    roleLabel: 'Mantri Tanaman',
    status: 'READY',
    statusLabel: 'Siap Uji (Aktif)',
    route: '/attendance',
    desc: 'Rekam presensi supervisor dengan verifikasi GPS + kamera selfie mandor, serta rekap kehadiran pekerja harian nursery (Hadir/Sakit/Izin/Alpa).',
    output: 'Status kehadiran tervalidasi, izin buka transaksi operasional harian.',
    icon: '👥',
    flowChart: {
      summary: 'Alur pembuktian fisik kehadiran mandor/mantri via geotagging + selfie, dilanjutkan pencatatan daftar hadir tenaga kerja harian.',
      nodes: [
        { id: '2.1', type: 'start', label: 'Buka Menu Presensi', actor: 'Mandor / Mantri', desc: 'Akses modul Presensi di Beranda' },
        { id: '2.2', type: 'process', label: 'Deteksi GPS & Selfie', actor: 'Mandor', desc: 'Ambil koordinat GPS nursery & foto live mandor' },
        { id: '2.3', type: 'decision', label: 'Dalam Radius Nursery?', actor: 'Geolocation', desc: 'Cek radius geofence lokasi kerja', branch: '✅ Sesuai: Terverifikasi | ❌ Luar: Peringatan Jarak' },
        { id: '2.4', type: 'process', label: 'Pilih Divisi & Grup', actor: 'Mandor', desc: 'Filter daftar pekerja harian nursery' },
        { id: '2.5', type: 'process', label: 'Input Status Hadir/Absen', actor: 'Mandor', desc: 'Tandai status (Hadir / Sakit / Izin / Alpa)' },
        { id: '2.6', type: 'end', label: 'Presensi Terkunci & Izin Kerja', actor: 'Sistem', desc: 'Total HK dihitung, kunci akses transaksi harian dibuka' }
      ],
      inputs: ['Koordinat Geolocation (GPS)', 'Foto Selfie Mandor', 'Daftar Roster Pekerja Harian'],
      outputs: ['Log Presensi Mandor Tervalidasi', 'Rekap HK Harian Pekerja'],
      sopRules: ['Presensi supervisor wajib dilakukan sebelum pukul 07:00 WIB di titik nursery resmi.', 'Pekerja alpa tanpa keterangan wajib dilaporkan ke Asisten.']
    }
  },
  {
    step: 3,
    title: 'Penerimaan Benih / Biji Kelatak & Material',
    role: 'MANTRI_TANAMAN',
    roleLabel: 'Mantri Tanaman',
    status: 'READY',
    statusLabel: 'Siap Uji (Aktif)',
    route: '/reception',
    desc: 'Penerimaan fisik benih/biji kelatak karet dari Kebun Sendiri / Pihak Ke-III, scan/input nomor SIR, upload foto bukti fisik, dan sortir afkir biji pecah/busuk.',
    output: 'Dokumen Penerimaan (RCV/SEEDS/...), stok bibit awal tercatat.',
    icon: '📦',
    flowChart: {
      summary: 'Alur penerimaan fisik kiriman benih biji kelatak karet, pemeriksaan surat jalan SIR, pemisahan biji afkir, dokumentasi foto, dan registrasi batch stok.',
      nodes: [
        { id: '3.1', type: 'start', label: 'Logistik Benih Tiba', actor: 'Driver / Vendor', desc: 'Biji kelatak tiba di nursery bersama Surat SIR' },
        { id: '3.2', type: 'process', label: 'Pilih Asal & Nomor SIR', actor: 'Mantri', desc: 'Pilih Kebun Sendiri / Pihak III, no SIR & klon' },
        { id: '3.3', type: 'process', label: 'Sortir & Hitung Fisik', actor: 'Mantri & Pekerja', desc: 'Hitung total biji dan pisahkan biji pecah/busuk' },
        { id: '3.4', type: 'decision', label: 'Standar Kualitas Biji?', actor: 'Mantri', desc: 'Evaluasi kesegaran biji kelatak', branch: '✅ Lolos: Qty Diterima | ❌ Cacat: Catat Afkir & Alasan' },
        { id: '3.5', type: 'process', label: 'Ambil Foto Dokumentasi', actor: 'Mantri', desc: 'Foto sampel benih, karung, dan nota pengantar' },
        { id: '3.6', type: 'end', label: 'Terbit RCV & Batch Stok', actor: 'Sistem', desc: 'Nomor RCV & Batch ID terbit, stok masuk gudang' }
      ],
      inputs: ['Biji Kelatak Karet', 'Dokumen Surat Izin Rilis (SIR)', 'Surat Pengantar / DO Vendor', 'Foto Fisik Lapangan'],
      outputs: ['Dokumen Penerimaan (RCV/SEEDS/...)', 'Nomor Batch Penerimaan', 'Stok Benih Gudang Terupdate'],
      sopRules: ['Sortir biji maksimal dilakukan 1x24 jam setelah tiba untuk menjaga daya kecambah.', 'Kadar afkir > 5% wajib dilaporkan segera kepada Asisten Divisi.']
    }
  },
  {
    step: 4,
    title: 'Penyemaian Benih (Germination Bed)',
    role: 'MANTRI_TANAMAN',
    roleLabel: 'Mantri Tanaman',
    status: 'READY',
    statusLabel: 'Siap Uji (Aktif)',
    route: '/seeding',
    desc: 'Penaburan benih kelatak ke bedengan perkecambahan pasir basah, pelabelan bedengan, pencatatan persentase daya kecambah, bibit disemai, dan afkir penaburan.',
    output: 'Kartu Bedengan Semai, akumulasi bibit tersemai terhadap batch SIR.',
    icon: '🌱',
    flowChart: {
      summary: 'Alur penaburan biji kelatak ke media pasir bedengan semai, pemasangan papan label batch, dan pemantauan perkecambahan harian.',
      nodes: [
        { id: '4.1', type: 'start', label: 'Ambil Benih Batch RCV', actor: 'Mantri', desc: 'Pilih alokasi benih dari stok penerimaan aktif' },
        { id: '4.2', type: 'process', label: 'Pilih Plot Bedengan Pasir', actor: 'Mantri', desc: 'Tentukan plot bedengan perkecambahan steril' },
        { id: '4.3', type: 'process', label: 'Penaburan Biji ke Pasir', actor: 'Pekerja Semai', desc: 'Benih dibenamkan posisi perut bawah kedalaman 1-2 cm' },
        { id: '4.4', type: 'process', label: 'Catat Qty Tebar & Afkir', actor: 'Mantri', desc: 'Rekam jumlah biji disemai dan afkir penaburan' },
        { id: '4.5', type: 'process', label: 'Pasang Label Bedengan', actor: 'Mantri', desc: 'Cantumkan Klon, No SIR, Tgl Tabur, dan Qty' },
        { id: '4.6', type: 'end', label: 'Kartu Bedengan Semai Aktif', actor: 'Sistem', desc: 'Monitoring daya kecambah harian (stadium jarum) dimulai' }
      ],
      inputs: ['Benih Batch RCV Terpilih', 'Nomor Plot Bedengan Pasir', 'Pasir Bersih & Steril'],
      outputs: ['Kartu Bedengan Semai (KBS)', 'Akumulasi Tebar terhadap Stok SIR'],
      sopRules: ['Bedengan disiram 2x sehari (pagi & sore), naungan paranet 50-70%.', 'Biji ditabur rapat teratur dengan jarak 1-2 cm antar biji.']
    }
  },
  {
    step: 5,
    title: 'Pindah Tanam ke Polibag (Main Nursery)',
    role: 'MANTRI_TANAMAN',
    roleLabel: 'Mantri Tanaman',
    status: 'ANALYSIS',
    statusLabel: 'Tahap Analisis',
    route: '/selection',
    desc: 'Pemindahan bibit kecambah sehat (stadium jarum/daun pancing) dari bedengan perkecambahan ke polibag tanah di lapangan pembibitan utama (Main Nursery).',
    output: 'Nomor plot baris, populasi polybag tegak di nursery.',
    icon: '🪴',
    flowChart: {
      summary: 'Alur pencabutan kecambah stadium jarum, penyeleksian bentuk akar tunggang, penanaman ke polybag tanah, dan penataan baris Main Nursery.',
      nodes: [
        { id: '5.1', type: 'start', label: 'Cek Kesiapan Kecambah', actor: 'Mantri', desc: 'Periksa kecambah umur 14-21 hari (stadium jarum/pancing)' },
        { id: '5.2', type: 'process', label: 'Pencabutan & Sortir Akar', actor: 'Mantri & Pekerja', desc: 'Pilih kecambah lurus, akar tunggang tidak bercabang' },
        { id: '5.3', type: 'decision', label: 'Akar Lurus & Sehat?', actor: 'Mantri', desc: 'Cek kelainan akar / kerdil', branch: '✅ Lolos: Siap Tanam | ❌ Bengkok: Afkir / Buang' },
        { id: '5.4', type: 'process', label: 'Transplanting ke Polybag', actor: 'Pekerja', desc: 'Tanam ke polybag 15x35 cm media top soil + pupuk RP dasar' },
        { id: '5.5', type: 'process', label: 'Plotting Baris Main Nursery', actor: 'Mantri', desc: 'Pola ganda 2 baris, catat nomor blok & tgl tanam' },
        { id: '5.6', type: 'end', label: 'Populasi Polybag Terdaftar', actor: 'Sistem', desc: 'Jumlah polybag tegak tercatat, mutasi dari bedengan semai' }
      ],
      inputs: ['Kecambah Stadium Jarum / Pancing', 'Polybag 15x35 cm + Top Soil Gembur', 'Pupuk Dasar Rock Phosphate (RP)'],
      outputs: ['Nomor Blok/Baris Main Nursery', 'Jumlah Polybag Tegak Aktif'],
      sopRules: ['Transplanting wajib selesai sebelum stadium daun melebar agar akar tidak putus.', 'Polybag harus dipadatkan merata dan langsung disiram jenuh.']
    }
  },
  {
    step: 6,
    title: 'Kebun Entres & Okulasi (Budding)',
    role: 'MANTRI_TANAMAN',
    roleLabel: 'Mantri & Tukang Okulasi',
    status: 'ANALYSIS',
    statusLabel: 'Tahap Analisis',
    route: '/budding',
    desc: 'Pengambilan mata kayu entres murni (PB 260, RRIM 600, GT 1) dari Kebun Entres, penempelan mata tunas pada batang bawah, pembukaan perban, dan rekam persentase keberhasilan.',
    output: 'Catatan hasil okulasi (% jadi), mutasi status klon bibitan.',
    icon: '🌿',
    flowChart: {
      summary: 'Alur pemanenan ranting kayu entres murni bersertifikat, pelaksanaan teknik okulasi pada batang bawah, pembukaan perban 21 hari, dan evaluasi persentase mata jadi.',
      nodes: [
        { id: '6.1', type: 'start', label: 'Panen Kayu Entres Murni', actor: 'Mantri Entres', desc: 'Panen ranting entres klon murni (PB 260, RRIM 600, GT 1)' },
        { id: '6.2', type: 'process', label: 'Verifikasi Batang Bawah', actor: 'Tukang Okulasi', desc: 'Batang bawah umur 4-6 bulan, diameter min. 1.0 - 1.5 cm' },
        { id: '6.3', type: 'process', label: 'Sayat Kulit & Tempel Mata', actor: 'Tukang Okulasi', desc: 'Sayat jendela batang bawah, iris perisai mata, dan rekatkan' },
        { id: '6.4', type: 'process', label: 'Balut Pita Plastik Okulasi', actor: 'Tukang Okulasi', desc: 'Lilitkan pita PE kedap air dari arah bawah ke atas' },
        { id: '6.5', type: 'decision', label: 'Buka Perban (Hari ke-21)', actor: 'Mantri', desc: 'Kikis kulit mata tunas', branch: '✅ Hijau: Jadi (Berhasil) | ❌ Coklat: Gagal (Okulasi Ulang)' },
        { id: '6.6', type: 'end', label: 'Rekap Keberhasilan Okulasi', actor: 'Sistem', desc: 'Catatan % jadi per okulator terbit, status klon bibitan terdaftar' }
      ],
      inputs: ['Kayu Entres Klon Murni', 'Batang Bawah Sehat (Rootstock)', 'Pisau Okulasi & Pita Plastik PE'],
      outputs: ['Rekap Hasil Okulasi (% Jadi)', 'Label Klon Terpasang pada Polybag'],
      sopRules: ['Standar keberhasilan okulasi minimal 85-90% per okulator.', 'Kayu entres yang dipanen harus digunakan dalam waktu maksimal 2x24 jam.']
    }
  },
  {
    step: 7,
    title: 'Pemeriksaan Mutu & Penyeleksian (Culling)',
    role: 'ASISTEN',
    roleLabel: 'Mantri & Asisten Lapangan',
    status: 'ANALYSIS',
    statusLabel: 'Tahap Analisis',
    route: '/inspection',
    desc: 'Pemeriksaan standar mutu pertumbuhan, pemenggalan batang atas, penyeleksian bibit kerdil / penyakit jamur akar, dan penandaan afkir sebelum siap tanam.',
    output: 'Berita Acara Seleksi, kuota bibit tersertifikasi siap salur.',
    icon: '🔍',
    flowChart: {
      summary: 'Alur pemenggalan batang bawah (snagging), pemeliharaan payung daun 1-2, inspeksi agronomi berkala, eliminasi bibit cacat/penyakit, dan penerbitan sertifikasi bibit siap salur.',
      nodes: [
        { id: '7.1', type: 'start', label: 'Pemenggalan Batang Atas', actor: 'Pekerja', desc: 'Potong batang bawah 5-10 cm di atas mata tunas okulasi' },
        { id: '7.2', type: 'process', label: 'Pembentukan Payung Daun', actor: 'Mantri', desc: 'Pelihara tunas hingga payung ke-1 & ke-2 matang (daun tua)' },
        { id: '7.3', type: 'process', label: 'Inspeksi Mutu & Kesehatan', actor: 'Asisten & Mantri', desc: 'Cek diameter lilit batang, bebas Jamur Akar Putih (JAP)' },
        { id: '7.4', type: 'decision', label: 'Lolos Standar Mutu?', actor: 'Asisten Lapangan', desc: 'Evaluasi kriteria bibit unggul', branch: '✅ Memenuhi: Lolos Sertifikasi | ❌ Sakit/Kerdil: Musnahkan' },
        { id: '7.5', type: 'process', label: 'Penandaan Cat & Label Mutu', actor: 'Mantri', desc: 'Beri tanda cat putih pada polybag lolos seleksi' },
        { id: '7.6', type: 'end', label: 'Berita Acara Seleksi (BAS)', actor: 'Sistem', desc: 'Berita Acara Seleksi terbit, kuota bibit siap salur terkunci' }
      ],
      inputs: ['Bibit Okulasi Payung 2 Matang', 'Kriteria Standar Mutu Bibit Socfindo', 'Peralatan Culling & Cat Penanda'],
      outputs: ['Berita Acara Seleksi (BAS)', 'Kuota Bibit Tersertifikasi Siap Tanam'],
      sopRules: ['Bibit afkir (culling) wajib dimusnahkan agar tidak tercecer atau tertanam.', 'Bibit siap salur wajib berumur minimal payung 2 dengan daun tua mengeras.']
    }
  },
  {
    step: 8,
    title: 'Rekam Pemeliharaan & Pemakaian Material',
    role: 'MANTRI_TANAMAN',
    roleLabel: 'Mantri Tanaman',
    status: 'ANALYSIS',
    statusLabel: 'Tahap Analisis',
    route: '/nursery-activity',
    desc: 'Pencatatan kegiatan rutin pemeliharaan: penyiraman, pemupukan NPK/Urea berkala, penyiangan gulma, fungisida, dan penggunaan material/bahan kimia.',
    output: 'Kartu kendali pemeliharaan blok bibitan & buku mutasi pupuk/obat.',
    icon: '🛠️',
    flowChart: {
      summary: 'Alur penjadwalan perawatan bibitan, penginputan pemakaian pupuk dan agrochemical, alokasi tenaga kerja harian, dan pemotongan stok gudang material.',
      nodes: [
        { id: '8.1', type: 'start', label: 'Jadwal Pemeliharaan Blok', actor: 'Mantri', desc: 'Tentukan blok target dan jenis perawatan harian' },
        { id: '8.2', type: 'process', label: 'Pilih Jenis Aktivitas', actor: 'Mantri', desc: 'Siram / Pupuk NPK / Semprot Fungisida / Penyiangan' },
        { id: '8.3', type: 'process', label: 'Input Pemakaian Material', actor: 'Mantri', desc: 'Catat kuantiti pupuk/obat yang dipakai (Kg / Liter)' },
        { id: '8.4', type: 'process', label: 'Catat Tenaga Kerja (HK)', actor: 'Mandor', desc: 'Alokasikan nama pekerja harian dan jam kerja' },
        { id: '8.5', type: 'decision', label: 'Dosis Sesuai SOP?', actor: 'Sistem', desc: 'Validasi dosis per polybag', branch: '✅ Sesuai: Lanjut Simpan | ⚠️ Anomali: Konfirmasi Dosis' },
        { id: '8.6', type: 'end', label: 'Kartu Kendali & Mutasi Stok', actor: 'Sistem', desc: 'Log pemeliharaan blok terupdate, stok gudang terpotong' }
      ],
      inputs: ['Blok / Baris Target Nursery', 'Material (Pupuk NPK, Fungisida, Herbisida)', 'Daftar Alokasi HK Pekerja'],
      outputs: ['Kartu Kendali Pemeliharaan Blok', 'Buku Mutasi Pengeluaran Material Gudang'],
      sopRules: ['Pemupukan dilakukan pada tanah lembab berjarak 5-7 cm dari pangkal batang.', 'Penyemprotan fungisida dihentikan jika cuaca hujan lebat.']
    }
  },
  {
    step: 9,
    title: 'Permintaan & Distribusi Bibit ke Kebun',
    role: 'ASISTEN',
    roleLabel: 'Asisten Divisi & Pengurus',
    status: 'ANALYSIS',
    statusLabel: 'Tahap Analisis',
    route: '/request',
    desc: 'Pengajuan alokasi bibit untuk program replanting / sisipan tanaman karet divisi kebun, persetujuan Pengurus, dan pengeluaran fisik bibit polibag dari nursery.',
    output: 'Surat Jalan Pengeluaran Bibit (Delivery Order), pemotongan stok nursery.',
    icon: '📋',
    flowChart: {
      summary: 'Alur penerbitan Surat Permintaan Bibit (SPB), verifikasi persetujuan Pengurus, pemuatan bibit ke armada pengangkut, dan penerbitan Surat Jalan DO ke divisi tujuan.',
      nodes: [
        { id: '9.1', type: 'start', label: 'Pengajuan SPB oleh Asisten', actor: 'Asisten Divisi', desc: 'Input kebutuhan klon, jumlah pokok, & blok tanam kebun' },
        { id: '9.2', type: 'process', label: 'Approval Pengurus / Askep', actor: 'Pengurus / Askep', desc: 'Persetujuan alokasi kuota dan jadwal pengiriman' },
        { id: '9.3', type: 'process', label: 'Verifikasi Kesiapan di Nursery', actor: 'Mantri Nursery', desc: 'Cek stok fisik bibit bersertifikat di blok Main Nursery' },
        { id: '9.4', type: 'process', label: 'Pemuatan ke Truk Pengangkut', actor: 'Pekerja Muat', desc: 'Muat polybag dengan hati-hati ke armada truk (rit)' },
        { id: '9.5', type: 'process', label: 'Penerbitan Surat Jalan (DO)', actor: 'Mantri Nursery', desc: 'Cetak Dokumen Surat Jalan / Delivery Order resmi' },
        { id: '9.6', type: 'end', label: 'Penerimaan Kebun & Potong Stok', actor: 'Sistem', desc: 'Tanda terima lapangan diteken, stok bibit nursery berkurang' }
      ],
      inputs: ['Surat Permintaan Bibit (SPB)', 'Armada Truk Pengangkut', 'Kupon / Jadwal Tanam Divisi'],
      outputs: ['Surat Jalan Pengeluaran Bibit (DO)', 'Berita Acara Serah Terima (BAST)', 'Pemotongan Stok Nursery'],
      sopRules: ['Bibit disiram jenuh beberapa jam sebelum dimuat ke atas truk.', 'Susunan polybag di atas bak truk tidak boleh melebihi 2 tingkat.']
    }
  },
  {
    step: 10,
    title: 'Konsolidasi & Verifikasi Transaksi (Asisten)',
    role: 'ASISTEN',
    roleLabel: 'Asisten & Askep (Rencana Fase Lanjutan)',
    status: 'ANALYSIS',
    statusLabel: 'Tahap Analisis',
    route: '/home',
    desc: 'Layar khusus role Asisten untuk mereviu transaksi terkirim dari Mantri, melakukan koreksi langsung pada field data yang diizinkan, dan persetujuan berjenjang (belum diimplementasikan / masih fokus Role Mantri).',
    output: 'Status transaksi APPROVED, log audit rekonsiliasi data.',
    icon: '⏳',
    flowChart: {
      summary: 'Alur reviu transaksi masuk dari Mantri, koreksi nilai field langsung oleh Asisten tanpa menolak transaksi, dan otorisasi persetujuan berjenjang.',
      nodes: [
        { id: '10.1', type: 'start', label: 'Transaksi Disubmit Mantri', actor: 'Mantri Tanaman', desc: 'Data masuk antrean verifikasi Asisten' },
        { id: '10.2', type: 'process', label: 'Reviu Rincian & Bukti Fisik', actor: 'Asisten', desc: 'Periksa kesesuaian dokumen, kuantiti, dan foto lapangan' },
        { id: '10.3', type: 'decision', label: 'Data Akurat & Sesuai?', actor: 'Asisten', desc: 'Cek konsistensi data', branch: '✅ Sesuai: Langsung Approve | ✏️ Keliru: Koreksi Langsung Field' },
        { id: '10.4', type: 'process', label: 'Koreksi Langsung Nilai Field', actor: 'Asisten', desc: 'Edit angka/field yang keliru dan beri alasan koreksi' },
        { id: '10.5', type: 'process', label: 'Eksekusi Approval', actor: 'Asisten', desc: 'Tekan tombol Approve (Status menjadi APPROVED)' },
        { id: '10.6', type: 'end', label: 'Data Terkunci & Sync Server', actor: 'Sistem', desc: 'Transaksi final tersimpan dengan log audit lengkap' }
      ],
      inputs: ['Transaksi Status SUBMITTED', 'Dokumen Pendukung / Foto Fisik'],
      outputs: ['Transaksi Status APPROVED', 'Log Jejak Audit Koreksi Asisten', 'Data Rekonsiliasi ERP Pusat'],
      sopRules: ['Asisten mengoreksi data secara langsung tanpa proses reject agar alur tidak terhenti.', 'Setiap koreksi wajib menyertakan alasan yang terekam dalam audit trail.']
    }
  }
];

const INITIAL_NOTES = [
  {
    id: 'FB-001',
    number: 1,
    createdAt: '26/08/2026',
    author: 'Budi Santoso',
    creatorRole: 'Customer / User Field',
    email: 'budi.santoso@example.com',
    page: '/login',
    pageTitle: 'Login',
    description: 'Logo PT SOCFINDO dan tombol masuk proporsinya sudah bagus.',
    status: 'Baru',
    marker: { x: 50.0, y: 19.5 }
  },
  {
    id: 'FB-002',
    number: 2,
    createdAt: '26/08/2026',
    author: 'Ahmad Rivai',
    creatorRole: 'Asisten Lapangan',
    email: 'ahmad.rivai@example.com',
    page: '/sync',
    pageTitle: 'Sinkronisasi',
    description: 'Pilihan divisi kerja dan indikator centang sudah rapi.',
    status: 'Dalam Proses',
    marker: { x: 50.0, y: 18.0 }
  },
  {
    id: 'FB-003',
    number: 3,
    createdAt: '26/08/2026',
    author: 'Wagiman',
    creatorRole: 'Mandor Semprot',
    email: 'wagiman@example.com',
    page: '/home',
    pageTitle: 'Beranda',
    description: 'Menu 3x3 Beranda mudah diakses dan teks tidak terpotong.',
    status: 'Selesai',
    marker: { x: 50.0, y: 22.0 }
  }
];

let notes = [];
let activeWorkspaceTab = 'notes'; // 'notes' | 'flow'
let flowRoleFilter = 'ALL';
let expandedFlowSteps = new Set([1]); // Step 1 terbuka secara default untuk preview langsung
let isReviewMode = false;
let isAllMarkersHidden = false;
let selectedNoteId = null;
let searchQuery = '';
let filterStatus = 'ALL';
let filterPage = 'ALL';
let isServerConnected = false;

/** Memuat data catatan dari API Server (dengan fallback LocalStorage) */
async function loadNotes() {
  try {
    const res = await fetch(API_URL, { headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        notes = result.data;
        isServerConnected = true;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
        renderReviewPanel();
        updateMarkers();
        return;
      }
    }
  } catch (err) {
    console.warn('[review] Gagal koneksi ke server API, beralih ke penyimpanan lokal:', err);
    isServerConnected = false;
  }

  // Fallback ke LocalStorage bila server offline
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      notes = JSON.parse(raw);
    } else {
      notes = [...INITIAL_NOTES];
      saveNotesLocally();
    }
  } catch (err) {
    notes = [...INITIAL_NOTES];
  }
  renderReviewPanel();
  updateMarkers();
}

/** Menyimpan catatan lokal sebagai cache */
function saveNotesLocally() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch (err) {
    console.warn('[review] failed to save notes locally:', err);
  }
}

/** Inisialisasi Review Workspace */
export function initReviewWorkspace() {
  loadNotes();
  setupMarkerLayer();
  setupMobileWorkspaceSwitcher();

  // Dengarkan perubahan hash route agar marker dan filter tersinkron
  window.addEventListener('hashchange', () => {
    updateMarkers();
  });
}

/** Setup switcher tab navigasi pada layar mobile (< 768px) */
function setupMobileWorkspaceSwitcher() {
  const layout = document.getElementById('workspace-layout');
  if (!layout) return;

  layout.classList.add('is-mobile-preview');

  if (document.getElementById('mobile-workspace-nav')) return;

  const nav = document.createElement('div');
  nav.className = 'mobile-workspace-nav';
  nav.id = 'mobile-workspace-nav';
  nav.innerHTML = `
    <button class="mobile-tab-btn is-active" id="tab-mobile-preview" type="button">
      📱 Prototype Aplikasi
    </button>
    <button class="mobile-tab-btn" id="tab-mobile-review" type="button">
      📝 Catatan Review <span class="mobile-tab-badge" id="mobile-tab-badge">${notes.length}</span>
    </button>
  `;

  layout.parentNode.insertBefore(nav, layout);

  const tabPreview = nav.querySelector('#tab-mobile-preview');
  const tabReview = nav.querySelector('#tab-mobile-review');

  tabPreview.addEventListener('click', () => {
    tabPreview.classList.add('is-active');
    tabReview.classList.remove('is-active');
    layout.classList.remove('is-mobile-review');
    layout.classList.add('is-mobile-preview');
  });

  tabReview.addEventListener('click', () => {
    tabReview.classList.add('is-active');
    tabPreview.classList.remove('is-active');
    layout.classList.remove('is-mobile-preview');
    layout.classList.add('is-mobile-review');
  });
}

function updateMobileTabBadge() {
  const badge = document.getElementById('mobile-tab-badge');
  if (badge) {
    badge.textContent = notes.length;
  }
}

/** Setup layer marker di atas layar prototype */
function setupMarkerLayer() {
  const markerLayer = document.getElementById('marker-layer');
  if (!markerLayer) return;

  // Tangkap klik pada prototype untuk menaruh marker saat Review Mode aktif
  markerLayer.addEventListener('click', (e) => {
    if (!isReviewMode) return;

    const rect = markerLayer.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Hitung koordinat persentase relatif (0% - 100%) terhadap frame prototype
    const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    openAddFeedbackModal({ x: parseFloat(xPct.toFixed(1)), y: parseFloat(yPct.toFixed(1)) });
  });
}

/** Render marker pins pada layar prototype */
export function updateMarkers() {
  const markerLayer = document.getElementById('marker-layer');
  if (!markerLayer) return;

  const currentRoute = (getCurrent().route || '/login').split('?')[0];

  markerLayer.innerHTML = '';
  markerLayer.classList.toggle('is-review-mode', isReviewMode);

  if (isReviewMode) {
    const banner = document.createElement('div');
    banner.className = 'marker-pin-banner';
    banner.innerHTML = '📍 Klik pada layar untuk menaruh pin catatan';
    markerLayer.appendChild(banner);
  }

  // Jika semua marker disembunyikan, hentikan rendering pin
  if (isAllMarkersHidden) return;

  // Tampilkan marker yang sesuai halaman aktif (atau semua marker) dan tidak di-hide
  const visibleNotes = notes.filter(
    (n) => (!n.page || n.page === currentRoute || filterPage === n.page) && !n.hidden
  );

  visibleNotes.forEach((n) => {
    if (!n.marker || typeof n.marker.x !== 'number') return;

    const pin = document.createElement('div');
    const statusClass = n.status === 'Dalam Proses' ? 'status-proses' : n.status === 'Selesai' ? 'status-selesai' : 'status-baru';
    const isSelected = selectedNoteId === n.id;

    pin.className = `marker-pin ${statusClass} ${isSelected ? 'is-selected' : ''}`;
    pin.style.left = `${n.marker.x}%`;
    pin.style.top = `${n.marker.y}%`;
    pin.title = `#${String(n.number).padStart(2, '0')} - ${n.author}: ${n.description}`;

    pin.innerHTML = `
      <div class="marker-badge">#${n.number}</div>
      ${isSelected ? '<div class="marker-ripple"></div>' : ''}
    `;

    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      selectNote(n.id, true);
    });

    markerLayer.appendChild(pin);
  });
}

/** Highlight dan buka detail feedback */
function selectNote(noteId, openDetail = false) {
  selectedNoteId = noteId;
  updateMarkers();
  renderReviewPanel();

  const note = notes.find((n) => n.id === noteId);
  if (note && openDetail) {
    openFeedbackDetailModal(note);
  }
}

/** Render Panel Review (Desktop Table & Mobile Cards) */
export function renderReviewPanel() {
  updateMobileTabBadge();
  const container = document.getElementById('review-panel-container');
  if (!container) return;

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    const matchSearch =
      !searchQuery ||
      n.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.creatorRole && n.creatorRole.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (n.email && n.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      String(n.number).includes(searchQuery);

    const matchStatus = filterStatus === 'ALL' || n.status === filterStatus;
    const matchPage = filterPage === 'ALL' || n.page === filterPage;

    return matchSearch && matchStatus && matchPage;
  });

  const countBaru = notes.filter((n) => n.status === 'Baru').length;
  const countProses = notes.filter((n) => n.status === 'Dalam Proses').length;
  const countSelesai = notes.filter((n) => n.status === 'Selesai').length;

  // Filter process steps
  const filteredSteps = PROCESS_STEPS.filter((step) => {
    if (flowRoleFilter === 'ALL') return true;
    if (flowRoleFilter === 'MANTRI_TANAMAN') return step.role === 'MANTRI_TANAMAN' || step.roleLabel.includes('Mantri');
    if (flowRoleFilter === 'ASISTEN') return step.role === 'ASISTEN' || step.roleLabel.includes('Asisten');
    if (flowRoleFilter === 'READY') return step.status === 'READY';
    if (flowRoleFilter === 'ANALYSIS') return step.status === 'ANALYSIS';
    return true;
  });

  const countReadySteps = PROCESS_STEPS.filter((s) => s.status === 'READY').length;
  const countAnalysisSteps = PROCESS_STEPS.filter((s) => s.status === 'ANALYSIS').length;

  // Render Tabs Navigation Bar
  let html = `
    <div class="workspace-main-tabs">
      <button class="workspace-main-tab-btn ${activeWorkspaceTab === 'notes' ? 'is-active' : ''}" id="tab-main-notes" type="button">
        <span>📝</span>
        <span>Catatan Perbaikan</span>
        <span class="tab-badge">${notes.length}</span>
      </button>
      <button class="workspace-main-tab-btn ${activeWorkspaceTab === 'flow' ? 'is-active' : ''}" id="tab-main-flow" type="button">
        <span>🔄</span>
        <span>Flow Proses</span>
        <span class="tab-badge-pulse">${PROCESS_STEPS.length} Tahapan</span>
      </button>
    </div>
  `;

  if (activeWorkspaceTab === 'notes') {
    // TAB 1: CATATAN PERBAIKAN
    html += `
      <div class="review-panel-head">
        <div class="review-title-group">
          <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
            <h2>Catatan Perbaikan</h2>
            <span class="server-status-pill ${isServerConnected ? 'online' : 'offline'}" title="${isServerConnected ? 'Tersambung ke Server Database & Email' : 'Berjalan dalam mode offline lokal'}">
              ${isServerConnected ? '🟢 Database Server Online' : '🟡 Mode Offline (Lokal)'}
            </span>
          </div>
          <p>Prototype Review & Quality Assurance Panel &bull; Otomatis Notifikasi Email</p>
        </div>
        <div class="review-actions-group">
          <button class="btn-toggle-all-markers ${isAllMarkersHidden ? 'is-hidden-mode' : ''}" id="btn-toggle-all-markers" type="button" title="Sembunyikan / Tampilkan Semua Pin Marker">
            ${isAllMarkersHidden ? '🙈 Semua Pin: Tersembunyi' : '👁️ Semua Pin: Tampil'}
          </button>
          <button class="btn-toggle-review-mode ${isReviewMode ? 'is-active' : ''}" id="btn-toggle-review" type="button">
            ${isReviewMode ? '🔴 Matikan Mode Pin' : '📍 Mode Pin Marker'}
          </button>
          <button class="btn-add-feedback" id="btn-add-feedback" type="button">
            <span>+</span> Tambah Catatan
          </button>
        </div>
      </div>

      <div class="review-filter-bar">
        <div class="filter-search-wrap">
          <span class="filter-search-icon">🔍</span>
          <input class="filter-search-input" id="review-search" type="text" placeholder="Cari catatan, pembuat, email..." value="${esc(searchQuery)}" />
        </div>
        <select class="filter-select" id="review-filter-status">
          <option value="ALL" ${filterStatus === 'ALL' ? 'selected' : ''}>Semua Status</option>
          <option value="Baru" ${filterStatus === 'Baru' ? 'selected' : ''}>Status: Baru</option>
          <option value="Dalam Proses" ${filterStatus === 'Dalam Proses' ? 'selected' : ''}>Status: Dalam Proses</option>
          <option value="Selesai" ${filterStatus === 'Selesai' ? 'selected' : ''}>Status: Selesai</option>
        </select>
        <select class="filter-select" id="review-filter-page">
          <option value="ALL" ${filterPage === 'ALL' ? 'selected' : ''}>Semua Halaman</option>
          <option value="/login" ${filterPage === '/login' ? 'selected' : ''}>Halaman: Login</option>
          <option value="/splash" ${filterPage === '/splash' ? 'selected' : ''}>Halaman: Splash</option>
          <option value="/sync" ${filterPage === '/sync' ? 'selected' : ''}>Halaman: Sinkronisasi</option>
          <option value="/home" ${filterPage === '/home' ? 'selected' : ''}>Halaman: Beranda</option>
          <option value="/attendance" ${filterPage === '/attendance' ? 'selected' : ''}>Halaman: Absensi</option>
          <option value="/reception" ${filterPage === '/reception' ? 'selected' : ''}>Halaman: Penerimaan Benih</option>
          <option value="/seeding" ${filterPage === '/seeding' ? 'selected' : ''}>Halaman: Penanaman</option>
        </select>
      </div>

      <div class="review-stats-summary" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <span>Total: <strong>${notes.length} Catatan</strong></span>
          <span class="stat-pill baru">Baru: ${countBaru}</span>
          <span class="stat-pill proses">Proses: ${countProses}</span>
          <span class="stat-pill selesai">Selesai: ${countSelesai}</span>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn-refresh-notes" id="btn-refresh-notes" type="button" title="Muat ulang data dari database server" style="background:#f1f5f9; border:1px solid #cbd5e1; padding:4px 10px; border-radius:6px; font-size:0.8rem; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
            🔄 Refresh Data
          </button>
          <button class="btn-test-email-trigger" id="btn-test-email-trigger" type="button" title="Kirim email uji coba ke admin" style="background:#f0fdf4; border:1px solid #86efac; color:#15803d; padding:4px 10px; border-radius:6px; font-size:0.8rem; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
            ✉️ Tes Email
          </button>
        </div>
      </div>

      <!-- Desktop & Tablet Table -->
      <div class="review-table-container">
        <table class="review-table">
          <thead>
            <tr>
              <th class="col-no">No</th>
              <th class="col-date">Tanggal</th>
              <th class="col-author">Pembuat</th>
              <th class="col-page">Halaman</th>
              <th class="col-desc">Deskripsi Catatan</th>
              <th class="col-status">Status</th>
              <th class="col-role">Dibuat Oleh</th>
              <th class="col-marker">Marker</th>
              <th class="col-actions">Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${
              filteredNotes.length === 0
                ? '<tr><td colspan="9" class="review-empty-state">Tidak ada catatan perbaikan yang cocok dengan filter.</td></tr>'
                : filteredNotes
                    .map(
                      (n) => `
              <tr class="${selectedNoteId === n.id ? 'is-selected' : ''}" data-id="${n.id}">
                <td class="col-no">#${String(n.number).padStart(2, '0')}</td>
                <td class="col-date">${esc(n.createdAt)}</td>
                <td class="col-author">
                  <div style="font-weight:700; color:#0f172a; margin-bottom:2px;">${esc(n.author)}</div>
                  ${n.email ? `<div style="font-size:0.75rem; color:#64748b; word-break:break-all;">✉️ ${esc(n.email)}</div>` : ''}
                </td>
                <td class="col-page">
                  <span class="badge" style="background:#f1f5f9; border:1px solid #e2e8f0; color:#334155; font-size:0.75rem; padding:3px 8px; border-radius:4px; font-weight:600; white-space:nowrap;">
                    ${esc(n.pageTitle || n.page || '-')}
                  </span>
                </td>
                <td class="col-desc">${esc(n.description)}</td>
                <td class="col-status">
                  <span class="table-status-badge ${
                    n.status === 'Dalam Proses' ? 'status-proses' : n.status === 'Selesai' ? 'status-selesai' : 'status-baru'
                  }">${esc(n.status)}</span>
                </td>
                <td class="col-role">${esc(n.creatorRole || 'Customer')}</td>
                <td class="col-marker">
                  <button class="btn-table-action btn-toggle-marker-visibility ${n.hidden ? 'is-hidden' : ''}" data-id="${n.id}" type="button" title="${n.hidden ? 'Tampilkan Pin Marker di Layar' : 'Sembunyikan Pin Marker dari Layar'}">
                    ${n.hidden ? '🙈 Sembunyi' : '👁️ Tampil'}
                  </button>
                </td>
                <td class="col-actions">
                  <div class="table-action-btns">
                    <button class="btn-table-action btn-view-pin" data-id="${n.id}" type="button" title="Lihat Pin">📍 Pin</button>
                    <button class="btn-table-action btn-edit-status" data-id="${n.id}" type="button" title="Ubah Status">✏️ Status</button>
                    <button class="btn-table-action delete btn-delete-note" data-id="${n.id}" type="button" title="Hapus">🗑️</button>
                  </div>
                </td>
              </tr>
            `
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>

      <!-- Mobile Card List (< 768px) -->
      <div class="review-mobile-list">
        ${
          filteredNotes.length === 0
            ? '<div class="review-empty-state">Tidak ada catatan perbaikan.</div>'
            : filteredNotes
                .map(
                  (n) => `
          <div class="feedback-card-item ${selectedNoteId === n.id ? 'is-selected' : ''}" data-id="${n.id}">
            <div class="feedback-card-head">
              <span class="feedback-card-no">#${String(n.number).padStart(2, '0')}</span>
              <span class="table-status-badge ${
                n.status === 'Dalam Proses' ? 'status-proses' : n.status === 'Selesai' ? 'status-selesai' : 'status-baru'
              }">${esc(n.status)}</span>
            </div>
            <div class="feedback-card-date">📅 ${esc(n.createdAt)} &bull; ${esc(n.pageTitle || n.page || '-')}</div>
            <div class="feedback-card-author">👤 ${esc(n.author)} ${n.email ? `<span style="font-size:0.75rem; color:#64748b;">(${esc(n.email)})</span>` : ''}</div>
            <div class="feedback-card-desc">${esc(n.description)}</div>
            <div class="feedback-card-footer">
              <span>Dibuat Oleh: <strong>${esc(n.creatorRole || 'Customer')}</strong></span>
              <div style="display:flex; align-items:center; gap:6px;">
                <button class="btn-table-action btn-toggle-marker-visibility ${n.hidden ? 'is-hidden' : ''}" data-id="${n.id}" type="button" title="${n.hidden ? 'Tampilkan Pin Marker' : 'Sembunyikan Pin Marker'}">
                  ${n.hidden ? '🙈 Sembunyi' : '👁️ Tampil'}
                </button>
                <button class="btn-table-action btn-edit-status" data-id="${n.id}" type="button">Status</button>
              </div>
            </div>
          </div>
        `
                )
                .join('')
        }
      </div>
    `;
  } else {
    // TAB 2: FLOW PROSES (WORKFLOW PIPELINE)
    html += `
      <div class="flow-process-container">
        <div class="flow-process-header">
          <div class="flow-process-title-group">
            <h2>Alur Proses Bisnis Pembibitan Karet (SIGMA Rubber Nursery)</h2>
            <p>Pemetaan tahapan kerja dari penerimaan benih, Aktifitas Bibitan, Permintaan dan Pengeluaran Bibit.</p>
          </div>
          <div class="flow-process-stats">
            <span class="flow-stat-badge active">${countReadySteps} Modul Siap Uji</span>
            <span class="flow-stat-badge analysis">${countAnalysisSteps} Tahap Analisis</span>
          </div>
        </div>

        <!-- Filter Peran / Kategori Flow & Global Flowchart Toggle -->
        <div class="flow-role-filter-group">
          <div class="flow-filters-left">
            <span class="filter-label">Filter:</span>
            <button class="flow-role-pill ${flowRoleFilter === 'ALL' ? 'is-active' : ''}" data-flow-filter="ALL" type="button">Semua Tahapan (${PROCESS_STEPS.length})</button>
            <button class="flow-role-pill ${flowRoleFilter === 'MANTRI_TANAMAN' ? 'is-active' : ''}" data-flow-filter="MANTRI_TANAMAN" type="button">Role Mantri</button>
            <button class="flow-role-pill ${flowRoleFilter === 'ASISTEN' ? 'is-active' : ''}" data-flow-filter="ASISTEN" type="button">Role Asisten</button>
            <button class="flow-role-pill ${flowRoleFilter === 'READY' ? 'is-active' : ''}" data-flow-filter="READY" type="button">Siap Uji (${countReadySteps})</button>
            <button class="flow-role-pill ${flowRoleFilter === 'ANALYSIS' ? 'is-active' : ''}" data-flow-filter="ANALYSIS" type="button">Analisis (${countAnalysisSteps})</button>
          </div>
          <div class="flow-filters-right">
            <button id="btn-expand-all-flow" class="btn-flow-control" type="button">Buka Semua Detail</button>
            <button id="btn-collapse-all-flow" class="btn-flow-control" type="button">Tutup Semua</button>
          </div>
        </div>

        <!-- Timeline Steps -->
        <div class="flow-timeline">
          ${
            filteredSteps.length === 0
              ? '<div class="review-empty-state">Tidak ada tahapan alur yang sesuai dengan filter.</div>'
              : filteredSteps
                  .map((step) => {
                    const isExpanded = expandedFlowSteps.has(step.step);
                    const fc = step.flowChart;
                    return `
            <div class="flow-step-card ${step.status === 'READY' ? 'is-active-module' : 'is-analysis-module'}" data-step="${step.step}">
              <div class="flow-step-header-row">
                <div class="flow-step-number-badge">
                  <span>${String(step.step).padStart(2, '0')}</span>
                </div>
                <div class="flow-step-main-meta">
                  <div class="flow-step-top-line">
                    <h3 class="flow-step-title">${step.title}</h3>
                    <span class="flow-step-status-tag ${step.status === 'READY' ? 'ready' : 'analysis'}">${step.statusLabel}</span>
                    <span class="flow-step-role-tag">${step.roleLabel}</span>
                  </div>
                  <div class="flow-step-desc">${step.desc}</div>
                  <div class="flow-step-meta-info">
                    <span class="meta-item"><strong>Output:</strong> ${step.output}</span>
                    <span class="meta-item"><strong>Rute:</strong> <code>#${step.route}</code></span>
                  </div>
                </div>
                <div class="flow-step-actions-cell">
                  <button class="btn-flow-navigate" data-route="${step.route}" type="button" title="Buka modul di layar mobile">
                    Buka Layar
                  </button>
                  <button class="btn-flow-note" data-route="${step.route}" data-title="${step.title}" type="button" title="Beri catatan perbaikan">
                    Catatan
                  </button>
                </div>
              </div>

              <!-- Flowchart Toggle Button -->
              <div class="flow-step-toggle-row">
                <button class="btn-toggle-flowchart ${isExpanded ? 'is-expanded' : ''}" data-step="${step.step}" type="button">
                  <span class="toggle-icon">${isExpanded ? '▲' : '▼'}</span>
                  <span>${isExpanded ? 'Sembunyikan Alur Proses Sistem' : 'Alur Proses Sistem'}</span>
                </button>
              </div>

              <!-- Flowchart Stepper Box -->
              ${
                isExpanded && fc
                  ? `
                <div class="flow-step-flowchart-box">
                  <div class="flowchart-header">
                    <span class="flowchart-heading">Alur Proses Aplikasi</span>
                    <span class="flowchart-badge-count">${fc.nodes.length} Tahapan</span>
                  </div>

                  <div class="flowchart-summary-text">
                    <strong>Ringkasan Alur:</strong> ${esc(fc.summary)}
                  </div>

                  <!-- Stepper Sequence List -->
                  <div class="flowchart-stepper-container">
                    ${fc.nodes
                      .map(
                        (node, nIdx) => `
                      <div class="flow-stepper-item">
                        <div class="stepper-indicator-col">
                          <div class="stepper-dot">${String(nIdx + 1).padStart(2, '0')}</div>
                          ${nIdx < fc.nodes.length - 1 ? '<div class="stepper-line"></div>' : ''}
                        </div>
                        <div class="stepper-content-col">
                          <div class="stepper-head">
                            <span class="stepper-node-title">${esc(node.label)}</span>
                            <span class="stepper-type-pill ${node.type}">${
                              node.type === 'start'
                                ? 'Inisialisasi'
                                : node.type === 'process'
                                ? 'Operasional'
                                : node.type === 'decision'
                                ? 'Verifikasi Mutu'
                                : 'Output Sistem'
                            }</span>
                            <span class="stepper-actor-tag">Role: ${esc(node.actor)}</span>
                          </div>
                          <div class="stepper-desc">${esc(node.desc)}</div>
                          ${node.branch ? `<div class="stepper-branch-alert"><strong>Verifikasi:</strong> ${esc(node.branch)}</div>` : ''}
                        </div>
                      </div>
                    `
                      )
                      .join('')}
                  </div>

                  <!-- 3-Column Meta Details -->
                  <div class="flowchart-meta-grid">
                    <div class="flowchart-meta-box">
                      <div class="flowchart-meta-box-title">Prasyarat & Input Data</div>
                      <ul class="flowchart-meta-box-list">
                        ${fc.inputs.map((inp) => `<li>${esc(inp)}</li>`).join('')}
                      </ul>
                    </div>
                    <div class="flowchart-meta-box">
                      <div class="flowchart-meta-box-title">Output & Dokumen Sistem</div>
                      <ul class="flowchart-meta-box-list">
                        ${fc.outputs.map((out) => `<li>${esc(out)}</li>`).join('')}
                      </ul>
                    </div>
                    <div class="flowchart-meta-box">
                      <div class="flowchart-meta-box-title">Ketentuan SOP Kebun</div>
                      <ul class="flowchart-meta-box-list">
                        ${fc.sopRules.map((rule) => `<li>${esc(rule)}</li>`).join('')}
                      </ul>
                    </div>
                  </div>
                </div>
              `
                  : ''
              }
            </div>
          `;
                  })
                  .join('')
          }
        </div>
      </div>
    `;
  }

  container.innerHTML = html;

  // ---------- ATTACH EVENT LISTENERS ----------

  // Main Tabs switching
  container.querySelector('#tab-main-notes')?.addEventListener('click', () => {
    activeWorkspaceTab = 'notes';
    renderReviewPanel();
  });

  container.querySelector('#tab-main-flow')?.addEventListener('click', () => {
    activeWorkspaceTab = 'flow';
    renderReviewPanel();
  });

  if (activeWorkspaceTab === 'flow') {
    // Flow Role Filter Pills
    container.querySelectorAll('.flow-role-pill[data-flow-filter]').forEach((pill) => {
      pill.addEventListener('click', () => {
        flowRoleFilter = pill.dataset.flowFilter;
        renderReviewPanel();
      });
    });

    // Expand All / Collapse All Flowcharts
    container.querySelector('#btn-expand-all-flow')?.addEventListener('click', () => {
      PROCESS_STEPS.forEach((s) => expandedFlowSteps.add(s.step));
      renderReviewPanel();
    });

    container.querySelector('#btn-collapse-all-flow')?.addEventListener('click', () => {
      expandedFlowSteps.clear();
      renderReviewPanel();
    });

    // Individual Flowchart Toggle Buttons
    container.querySelectorAll('.btn-toggle-flowchart').forEach((btn) => {
      btn.addEventListener('click', () => {
        const stepNum = parseInt(btn.dataset.step, 10);
        if (expandedFlowSteps.has(stepNum)) {
          expandedFlowSteps.delete(stepNum);
        } else {
          expandedFlowSteps.add(stepNum);
        }
        renderReviewPanel();
      });
    });

    // Flow Navigate Button (Langsung Buka Halaman di Frame HP)
    container.querySelectorAll('.btn-flow-navigate').forEach((btn) => {
      btn.addEventListener('click', () => {
        const route = btn.dataset.route;
        if (route) {
          navigate(route);
          toast(`Menampilkan layar prototype: ${route}`, 'info');

          // Bila di layar mobile (< 768px), otomatis switch ke tab preview HP
          const layout = document.getElementById('workspace-layout');
          const tabPreview = document.getElementById('tab-mobile-preview');
          const tabReview = document.getElementById('tab-mobile-review');
          if (layout && layout.classList.contains('is-mobile-review')) {
            layout.classList.remove('is-mobile-review');
            layout.classList.add('is-mobile-preview');
            tabPreview?.classList.add('is-active');
            tabReview?.classList.remove('is-active');
          }
        }
      });
    });

    // Flow Note Button (Navigasi ke halaman + buka mode tambah catatan)
    container.querySelectorAll('.btn-flow-note').forEach((btn) => {
      btn.addEventListener('click', () => {
        const route = btn.dataset.route;
        if (route) {
          navigate(route);
          activeWorkspaceTab = 'notes';
          isReviewMode = true;
          renderReviewPanel();
          updateMarkers();
          toast('Mode Pin Marker aktif! Klik pada layar HP untuk menaruh pin catatan.', 'info');
        }
      });
    });
    return;
  }

  // Event Listeners khusus Tab Catatan Perbaikan
  const btnToggleAll = container.querySelector('#btn-toggle-all-markers');
  btnToggleAll?.addEventListener('click', () => {
    isAllMarkersHidden = !isAllMarkersHidden;
    toast(isAllMarkersHidden ? 'Semua pin marker disembunyikan' : 'Semua pin marker ditampilkan', 'info');
    updateMarkers();
    renderReviewPanel();
  });

  const btnToggle = container.querySelector('#btn-toggle-review');
  btnToggle?.addEventListener('click', () => {
    isReviewMode = !isReviewMode;
    toast(isReviewMode ? 'Mode Pin Aktif: Klik pada layar prototype untuk menaruh catatan' : 'Mode Pin Nonaktif', 'info');
    updateMarkers();
    renderReviewPanel();
  });

  const btnAdd = container.querySelector('#btn-add-feedback');
  btnAdd?.addEventListener('click', () => {
    openAddFeedbackModal();
  });

  const btnRefresh = container.querySelector('#btn-refresh-notes');
  btnRefresh?.addEventListener('click', async () => {
    toast('Memperbarui data dari server...', 'info');
    await loadNotes();
    toast('Data catatan berhasil diperbarui!', 'success');
  });

  const btnTestEmail = container.querySelector('#btn-test-email-trigger');
  btnTestEmail?.addEventListener('click', async () => {
    try {
      toast('Mengirimkan email uji coba...', 'info');
      const res = await fetch('/api/notes/test-email', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (data.result?.simulated) {
          toast('Email simulasi berhasil diproses di server (Cek log server)', 'info');
        } else {
          toast(`Email uji coba berhasil dikirim ke: ${data.result?.recipient || 'Admin'}`, 'success');
        }
      } else {
        toast('Gagal mengirim email: ' + (data.error || 'Server error'), 'danger');
      }
    } catch (e) {
      toast('Server tidak merespons pengujian email', 'danger');
    }
  });

  const searchInput = container.querySelector('#review-search');
  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderReviewPanel();
  });

  const statusSelect = container.querySelector('#review-filter-status');
  statusSelect?.addEventListener('change', (e) => {
    filterStatus = e.target.value;
    renderReviewPanel();
    updateMarkers();
  });

  const pageSelect = container.querySelector('#review-filter-page');
  pageSelect?.addEventListener('change', (e) => {
    filterPage = e.target.value;
    renderReviewPanel();
    updateMarkers();
  });

  // Table row clicks
  container.querySelectorAll('.review-table tbody tr').forEach((tr) => {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('.btn-table-action')) return;
      const id = tr.dataset.id;
      if (id) selectNote(id, true);
    });
  });

  // Mobile card clicks
  container.querySelectorAll('.feedback-card-item').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-table-action')) return;
      const id = card.dataset.id;
      if (id) selectNote(id, true);
    });
  });

  // Toggle single marker visibility
  container.querySelectorAll('.btn-toggle-marker-visibility').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const note = notes.find((n) => n.id === id);
      if (!note) return;
      
      note.hidden = !note.hidden;
      saveNotesLocally();
      updateMarkers();
      renderReviewPanel();

      // Sync ke backend bila online
      try {
        await fetch(`${API_URL}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hidden: note.hidden })
        });
      } catch (err) {
        // Safe offline ignore
      }
      toast(`Pin #${note.number} ${note.hidden ? 'disembunyikan' : 'ditampilkan'} di layar`, 'info');
    });
  });

  // Pin button
  container.querySelectorAll('.btn-view-pin').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      selectNote(id, false);
      toast(`Pin #${notes.find((n) => n.id === id)?.number} ditandai pada layar`, 'info');
    });
  });

  // Status button
  container.querySelectorAll('.btn-edit-status').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const note = notes.find((n) => n.id === id);
      if (note) openChangeStatusModal(note);
    });
  });

  // Delete button
  container.querySelectorAll('.btn-delete-note').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const note = notes.find((n) => n.id === id);
      if (!note) return;

      openModal({
        title: `Hapus Catatan #${String(note.number).padStart(2, '0')}`,
        body: `<p>Apakah Anda yakin ingin menghapus catatan perbaikan dari <strong>${esc(note.author)}</strong>?</p>`,
        footer: `
          <button class="btn btn-ghost" data-del-cancel>Batal</button>
          <button class="btn btn-danger" data-del-confirm>Hapus Catatan</button>
        `
      });

      const root = document.getElementById('modal-root');
      root.querySelector('[data-del-cancel]')?.addEventListener('click', closeModal);
      root.querySelector('[data-del-confirm]')?.addEventListener('click', async () => {
        // Hapus dari server
        try {
          await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        } catch (err) {
          console.warn('[review] failed to delete on server, falling back to local deletion');
        }

        notes = notes.filter((n) => n.id !== id);
        saveNotesLocally();
        closeModal();
        toast('Catatan berhasil dihapus', 'info');
        renderReviewPanel();
        updateMarkers();
      });
    });
  });
}

/** Modal Tambah Catatan */
function openAddFeedbackModal(markerCoords = null) {
  const currentRoute = (getCurrent().route || '/login').split('?')[0];
  const user = session.get() || {};
  const defaultAuthor = user.name && user.name !== 'Mantri Tanaman' ? user.name : 'Pengunjung / User';
  const defaultRole = user.role ? (user.role === 'MANTRI_TANAMAN' ? 'Mandor Semprot' : user.role) : 'Customer / User Field';

  const defaultCoords = markerCoords || { x: 50.0, y: 40.0 };

  openModal({
    title: 'Tambah Catatan Perbaikan',
    body: `
      <div class="feedback-form-row">
        <label class="feedback-form-label">Nama Pembuat <span style="color:#ef4444;">*</span></label>
        <input class="feedback-form-input" id="input-fb-author" type="text" placeholder="Masukkan nama Anda" value="${esc(defaultAuthor)}" />
      </div>
      <div class="feedback-form-row">
        <label class="feedback-form-label">Email Anda <span style="font-size:0.75rem; color:#64748b;">(opsional, untuk notifikasi balasan)</span></label>
        <input class="feedback-form-input" id="input-fb-email" type="email" placeholder="nama@email.com" />
      </div>
      <div class="feedback-form-row">
        <label class="feedback-form-label">Peran / Kategori</label>
        <input class="feedback-form-input" id="input-fb-role" type="text" placeholder="Contoh: Customer, Asisten, QA" value="${esc(defaultRole)}" />
      </div>
      <div class="feedback-form-row">
        <label class="feedback-form-label">Halaman Terkait</label>
        <select class="feedback-form-select" id="input-fb-page">
          <option value="/login" ${currentRoute === '/login' ? 'selected' : ''}>Login</option>
          <option value="/splash" ${currentRoute === '/splash' ? 'selected' : ''}>Splash</option>
          <option value="/sync" ${currentRoute === '/sync' ? 'selected' : ''}>Sinkronisasi</option>
          <option value="/home" ${currentRoute === '/home' ? 'selected' : ''}>Beranda</option>
          <option value="/attendance" ${currentRoute.startsWith('/attendance') ? 'selected' : ''}>Absensi</option>
          <option value="/reception" ${currentRoute.startsWith('/reception') ? 'selected' : ''}>Penerimaan Benih</option>
          <option value="/seeding" ${currentRoute.startsWith('/seeding') ? 'selected' : ''}>Penanaman</option>
        </select>
      </div>
      <div class="feedback-form-row">
        <label class="feedback-form-label">Deskripsi Catatan / Perbaikan <span style="color:#ef4444;">*</span></label>
        <textarea class="feedback-form-textarea" id="input-fb-desc" placeholder="Tuliskan catatan perbaikan atau feedback secara detail..."></textarea>
      </div>
      <div class="feedback-form-row">
        <label class="feedback-form-label">Koordinat Pin Marker</label>
        <div class="feedback-marker-coords">
          Posisi relatif: X: <strong>${defaultCoords.x}%</strong>, Y: <strong>${defaultCoords.y}%</strong>
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" data-fb-cancel>Batal</button>
      <button class="btn btn-primary" data-fb-save id="btn-save-note-modal">Simpan & Kirim Notifikasi</button>
    `
  });

  const root = document.getElementById('modal-root');
  root.querySelector('[data-fb-cancel]')?.addEventListener('click', closeModal);

  root.querySelector('#btn-save-note-modal')?.addEventListener('click', async () => {
    const author = root.querySelector('#input-fb-author')?.value.trim() || 'Reviewer';
    const email = root.querySelector('#input-fb-email')?.value.trim() || '';
    const role = root.querySelector('#input-fb-role')?.value.trim() || 'Customer';
    const page = root.querySelector('#input-fb-page')?.value || currentRoute;
    const desc = root.querySelector('#input-fb-desc')?.value.trim();

    if (!desc) {
      toast('Deskripsi catatan wajib diisi', 'danger');
      root.querySelector('#input-fb-desc')?.focus();
      return;
    }

    const saveBtn = root.querySelector('#btn-save-note-modal');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Menyimpan...';
    }

    const pageTitleMap = {
      '/login': 'Login',
      '/splash': 'Splash',
      '/sync': 'Sinkronisasi',
      '/home': 'Beranda',
      '/attendance': 'Absensi',
      '/reception': 'Penerimaan Benih',
      '/seeding': 'Penanaman'
    };
    const pageTitle = pageTitleMap[page] || 'Aplikasi';

    const payload = {
      author,
      email,
      creatorRole: role,
      page,
      pageTitle,
      description: desc,
      status: 'Baru',
      marker: defaultCoords
    };

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        if (result.success && result.data) {
          notes.unshift(result.data);
          saveNotesLocally();
          closeModal();
          isReviewMode = false;
          
          if (result.emailStatus?.sent) {
            toast('Catatan disimpan ke Database & notifikasi email terkirim!', 'success');
          } else {
            toast('Catatan berhasil disimpan ke Database Server!', 'success');
          }

          renderReviewPanel();
          updateMarkers();
          return;
        }
      }
    } catch (err) {
      console.warn('[review] API POST gagal, menyimpan secara lokal:', err);
    }

    // Fallback Offline
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const fallbackNote = {
      id: `FB-${Date.now()}`,
      number: notes.length + 1,
      createdAt: dateStr,
      author,
      email,
      creatorRole: role,
      page,
      pageTitle,
      description: desc,
      status: 'Baru',
      marker: defaultCoords
    };

    notes.unshift(fallbackNote);
    saveNotesLocally();
    closeModal();
    isReviewMode = false;
    toast('Catatan tersimpan (mode offline).', 'success');
    renderReviewPanel();
    updateMarkers();
  });
}

/** Modal Detail Feedback */
function openFeedbackDetailModal(note) {
  openModal({
    title: `Detail Catatan #${String(note.number).padStart(2, '0')}`,
    body: `
      <div style="display:flex; flex-direction:column; gap:12px; font-size:0.92rem;">
        <div><strong>Halaman:</strong> ${esc(note.pageTitle || note.page)}</div>
        <div><strong>Tanggal:</strong> ${esc(note.createdAt)}</div>
        <div><strong>Pembuat:</strong> ${esc(note.author)} (${esc(note.creatorRole || 'Customer')})</div>
        ${note.email ? `<div><strong>Email:</strong> <a href="mailto:${esc(note.email)}" style="color:#116834;">${esc(note.email)}</a></div>` : ''}
        <div><strong>Status:</strong> <span class="table-status-badge ${
          note.status === 'Dalam Proses' ? 'status-proses' : note.status === 'Selesai' ? 'status-selesai' : 'status-baru'
        }">${esc(note.status)}</span></div>
        <div><strong>Deskripsi:</strong></div>
        <div style="background:#f8fafc; padding:12px; border-radius:6px; border:1px solid #e2e8f0; line-height:1.45; word-break:break-word;">
          ${esc(note.description)}
        </div>
        <div style="font-size:0.8rem; color:#64748b;">
          📍 Lokasi Pin Marker: (${note.marker?.x}%, ${note.marker?.y}%)
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" data-detail-close>Tutup</button>
      <button class="btn btn-outline" data-detail-edit-status>Ubah Status</button>
    `
  });

  const root = document.getElementById('modal-root');
  root.querySelector('[data-detail-close]')?.addEventListener('click', closeModal);
  root.querySelector('[data-detail-edit-status]')?.addEventListener('click', () => {
    closeModal();
    openChangeStatusModal(note);
  });
}

/** Modal Ganti Status Feedback */
function openChangeStatusModal(note) {
  openModal({
    title: `Ubah Status Catatan #${String(note.number).padStart(2, '0')}`,
    body: `
      <div class="feedback-form-row">
        <label class="feedback-form-label">Pilih Status Baru</label>
        <select class="feedback-form-select" id="select-change-status">
          <option value="Baru" ${note.status === 'Baru' ? 'selected' : ''}>Baru</option>
          <option value="Dalam Proses" ${note.status === 'Dalam Proses' ? 'selected' : ''}>Dalam Proses</option>
          <option value="Selesai" ${note.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
        </select>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" data-status-cancel>Batal</button>
      <button class="btn btn-primary" data-status-save>Perbarui Status</button>
    `
  });

  const root = document.getElementById('modal-root');
  root.querySelector('[data-status-cancel]')?.addEventListener('click', closeModal);

  root.querySelector('[data-status-save]')?.addEventListener('click', async () => {
    const newStatus = root.querySelector('#select-change-status')?.value;
    if (newStatus) {
      const saveBtn = root.querySelector('[data-status-save]');
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Menyimpan...';
      }

      note.status = newStatus;
      saveNotesLocally();
      closeModal();
      
      let emailNotified = false;
      // Update di server
      try {
        const res = await fetch(`${API_URL}/${note.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.emailStatus?.sent) {
            emailNotified = true;
          }
        }
      } catch (err) {
        console.warn('[review] failed to update status on server:', err);
      }

      if (emailNotified) {
        toast(`Status #${note.number} diubah ke ${newStatus} & email notifikasi terkirim!`, 'success');
      } else {
        toast(`Status catatan #${note.number} diperbarui menjadi ${newStatus}`, 'success');
      }

      renderReviewPanel();
      updateMarkers();
    }
  });
}
