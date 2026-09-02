/**
 * modules/review/review-workspace.js — Prototype Review & Catatan Perbaikan Workspace.
 * Mengelola feedback dinamis ke Database Server (REST API /api/notes),
 * notifikasi email otomatis, marker layer responsif, filter, dan CRUD status.
 */

import { getCurrent, navigate } from '../../core/router.js';
import { openModal, closeModal } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { esc, todayISO, uid } from '../../core/utils.js';
import { session } from '../../core/session.js';
import { storage } from '../../core/storage.js';
import {
  attendanceRepository,
  receptionRepository,
  seedingRepository,
  buddingRepository,
  inspectionRepository,
  selectionRepository,
  syncQueueRepository
} from '../../db/repositories.js';
import { resetDatabase } from '../../db/indexeddb.js';

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
let activeWorkspaceTab = 'notes'; // 'notes' | 'flow' | 'transactions'
let activeTxTab = 'reception'; // 'attendance' | 'reception' | 'seeding' | 'budding' | 'inspection' | 'regrafting' | 'selection' | 'syncQueue'
let txSearchQuery = '';
let txStatusFilter = 'ALL';

const TX_MODULES = {
  attendance: {
    id: 'attendance',
    title: 'Presensi',
    subtitle: 'Kehadiran Mandor & Pekerja',
    icon: '👥',
    route: '/attendance',
    storageKey: 'attendance_transactions',
    repo: attendanceRepository,
    qtyField: null,
    unit: 'Orang'
  },
  reception: {
    id: 'reception',
    title: 'Penerimaan',
    subtitle: 'Stok Masuk Benih & Bibit',
    icon: '📦',
    route: '/reception',
    storageKey: 'receipt_transactions',
    repo: receptionRepository,
    qtyField: 'qty',
    unit: 'Pkk'
  },
  seeding: {
    id: 'seeding',
    title: 'Penyemaian',
    subtitle: 'Penanaman & Batching Semai',
    icon: '🌱',
    route: '/seeding',
    storageKey: 'seeding_transactions',
    repo: seedingRepository,
    qtyField: 'totalDisemai',
    unit: 'Pkk'
  },
  budding: {
    id: 'budding',
    title: 'Okulasi Pokok',
    subtitle: 'Grafting Mata Tunas Unggul',
    icon: '🌿',
    route: '/budding',
    storageKey: 'budding_transactions',
    repo: buddingRepository,
    qtyField: 'jumlah',
    unit: 'Pkk'
  },
  inspection: {
    id: 'inspection',
    title: 'Pemeriksaan',
    subtitle: 'Inspeksi & Evaluasi Keberhasilan',
    icon: '🔍',
    route: '/inspection',
    storageKey: 'inspection_transactions',
    repo: inspectionRepository,
    qtyField: 'totalDiperiksa',
    unit: 'Pkk'
  },
  regrafting: {
    id: 'regrafting',
    title: 'Okulasi Janda',
    subtitle: 'Regrafting Okulasi Gagal',
    icon: '🔄',
    route: '/budding/regrafting',
    storageKey: 'regrafting_pool',
    repo: buddingRepository,
    qtyField: 'jumlah',
    unit: 'Pkk'
  },
  selection: {
    id: 'selection',
    title: 'Penyeleksian',
    subtitle: 'Afkir & Pengurangan Fisik Stok',
    icon: '✂️',
    route: '/selection',
    storageKey: 'selection_pool',
    repo: selectionRepository,
    qtyField: 'jumlahAfkir',
    unit: 'Pkk'
  },
  syncQueue: {
    id: 'syncQueue',
    title: 'Sinkronisasi',
    subtitle: 'Antrean Transaksi Offline ERP',
    icon: '⚡',
    route: '/sync',
    storageKey: 'sync_queue',
    repo: syncQueueRepository,
    qtyField: null,
    unit: 'Item'
  }
};

function loadTxList(modId) {
  const cfg = TX_MODULES[modId];
  if (!cfg) return [];
  if (modId === 'regrafting') {
    const regrafts = storage.get('budding_transactions', []).filter((t) => t.type === 'REGRAFTING');
    if (regrafts && regrafts.length > 0) {
      return regrafts.map(item => {
        const kayuVal = parseInt(item.jumlahKayu !== undefined ? item.jumlahKayu : (item.kayu || 0));
        return {
          ...item,
          jumlahKayu: kayuVal,
          jumlah: parseInt(item.jumlah || item.qty || 0),
          jumlahDitolak: parseInt(item.jumlahDitolak || 0)
        };
      });
    }
    const pool = storage.get('regrafting_pool', []);
    if (pool && pool.length > 0) {
      return pool.map(item => {
        const match = regrafts.find(r => r.regraftPoolDocNo === item.docNo || r.batchNo === item.batchNo);
        const kayuVal = match ? parseInt(match.jumlahKayu || match.kayu || 0) : parseInt(item.jumlahKayu || 0);
        return {
          ...item,
          jumlahKayu: kayuVal
        };
      });
    }
    return [];
  }
  if (modId === 'selection') {
    const pool = storage.get('selection_pool', []);
    const txs = storage.get('selection_transactions', []);
    if (txs && txs.length > 0) return txs;
    if (pool && pool.length > 0) return pool;
    return [];
  }
  if (modId === 'budding') {
    const items = storage.get('budding_transactions', []);
    return (items || []).filter(t => t.type !== 'REGRAFTING');
  }
  if (modId === 'seeding') {
    const items = storage.get(cfg.storageKey, []);
    return (items || []).map(item => {
      if (!item.bedengan && Array.isArray(item.rows) && item.rows.length > 0) {
        const rowBeds = Array.from(new Set(item.rows.map(r => r.bedengan).filter(Boolean)));
        item.bedengan = rowBeds.length > 0 ? rowBeds.join(', ') : 'Bedengan 01';
      }
      return item;
    });
  }
  const items = storage.get(cfg.storageKey, []);
  return items || [];
}

function saveTxList(modId, list) {
  const cfg = TX_MODULES[modId];
  if (!cfg) return;
  storage.set(cfg.storageKey, list);
  if (modId === 'selection') {
    storage.set('selection_pool', list);
    storage.set('selection_transactions', list);
  }
  if (modId === 'regrafting') {
    const allBudding = storage.get('budding_transactions', []);
    const otherBudding = allBudding.filter((t) => t.type !== 'REGRAFTING');
    const updatedBudding = [...otherBudding, ...list.map(item => ({ ...item, type: 'REGRAFTING' }))];
    storage.set('budding_transactions', updatedBudding);
    storage.set('regrafting_pool', list);
  }
  list.forEach((item) => {
    try {
      cfg.repo.create(item);
    } catch (e) {}
  });
}
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
      <button class="workspace-main-tab-btn ${activeWorkspaceTab === 'transactions' ? 'is-active' : ''}" id="tab-main-transactions" type="button">
        <span>📊</span>
        <span>Data Transaksi</span>
        <span class="tab-badge-pulse" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd;">8 Modul (CRUD)</span>
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
  } else if (activeWorkspaceTab === 'flow') {
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
  } else if (activeWorkspaceTab === 'transactions') {
    html += renderTransactionsWorkspaceTab();
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

  container.querySelector('#tab-main-transactions')?.addEventListener('click', () => {
    activeWorkspaceTab = 'transactions';
    renderReviewPanel();
  });

  if (activeWorkspaceTab === 'transactions') {
    attachTransactionsWorkspaceEvents(container);
    return;
  }

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

// ==========================================================================
// WORKSPACE TAB 3: DATA TRANSAKSI (KATALOG & CRUD 8 MODUL)
// ==========================================================================

function renderTransactionsWorkspaceTab() {
  const curMod = TX_MODULES[activeTxTab] || TX_MODULES.reception;
  let rawList = loadTxList(activeTxTab);

  // Search filter
  let filteredList = rawList.filter((item) => {
    if (txSearchQuery) {
      const q = txSearchQuery.toLowerCase().trim();
      const str = JSON.stringify(item).toLowerCase();
      if (!str.includes(q)) return false;
    }
    if (txStatusFilter !== 'ALL') {
      if ((item.status || 'SUBMITTED') !== txStatusFilter) return false;
    }
    return true;
  });

  // Calculate volume
  const totalVolume = curMod.qtyField
    ? filteredList.reduce((sum, it) => sum + (parseInt(it[curMod.qtyField] || it.qty || 0) || 0), 0)
    : 0;

  let html = `
    <div class="review-panel-head" style="margin-bottom: 16px;">
      <div class="review-title-group">
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <h2>Katalog & Manajemen Data Transaksi</h2>
          <span class="server-status-pill online" style="background: #e0f2fe; color: #0369a1; border-color: #bae6fd;">
            📊 8 Modul Pembibitan (CRUD Aktif)
          </span>
        </div>
        <p>Kelola data seluruh transaksi operasional: Presensi, Penerimaan, Penyemaian, Okulasi, Pemeriksaan, Okulasi Janda, Penyeleksian, dan Sinkronisasi.</p>
      </div>
      <div class="review-actions-group">
        <button class="btn-toggle-all-markers" id="btn-tx-reset-all" type="button" title="Kosongkan seluruh data transaksi & afkir di prototype" style="background: #fef2f2; border-color: #fecaca; color: #b91c1c; font-weight: 700;">
          🗑️ Bersihkan Semua Data
        </button>
        <button class="btn-toggle-all-markers" id="btn-tx-open-screen" type="button" title="Buka modul terkait di layar HP" style="background: #f8fafc; border-color: #cbd5e1; color: #334155;">
          📱 Buka Modul di HP
        </button>
        <button class="btn-toggle-all-markers" id="btn-tx-seed-sample" type="button" title="Muat data sampel realistis jika kosong" style="background: #f0fdf4; border-color: #bbf7d0; color: #166534;">
          ⚡ Muat Demo Data
        </button>
        <button class="btn-add-feedback" id="btn-tx-add-new" type="button">
          <span>+</span> Tambah Transaksi
        </button>
      </div>
    </div>

    <!-- 8 MODUL SUB-TABS -->
    <div style="display: flex; gap: 8px; overflow-x: auto; padding-bottom: 14px; border-bottom: 1px solid #e2e8f0; margin-bottom: 16px; scrollbar-width: none;">
      ${Object.values(TX_MODULES)
        .map((m) => {
          const isActive = m.id === activeTxTab;
          const count = loadTxList(m.id).length;
          return `
          <button class="tx-sub-tab-btn" data-mod="${m.id}" type="button" style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 20px; font-size: 0.82rem; font-weight: ${
            isActive ? '700' : '600'
          }; background: ${isActive ? '#116834' : '#f1f5f9'}; color: ${isActive ? '#ffffff' : '#475569'}; border: 1px solid ${
            isActive ? '#116834' : '#cbd5e1'
          }; cursor: pointer; white-space: nowrap; transition: all 0.15s ease;">
            <span>${m.icon}</span>
            <span>${m.title}</span>
            <span style="font-size: 0.72rem; padding: 1px 6px; border-radius: 10px; background: ${
              isActive ? 'rgba(255,255,255,0.25)' : '#e2e8f0'
            }; color: ${isActive ? '#ffffff' : '#334155'}; font-weight: 700;">${count}</span>
          </button>
        `;
        })
        .join('')}
    </div>

    <!-- FILTER BAR & METRICS -->
    <div class="review-filter-bar" style="margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
      <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 260px;">
        <div class="filter-search-wrap" style="flex: 1;">
          <span class="filter-search-icon">🔍</span>
          <input class="filter-search-input" id="tx-search-input" type="text" placeholder="Cari no. dokumen, batch, klon, bedengan..." value="${esc(
            txSearchQuery
          )}" />
        </div>
        <select class="filter-select" id="tx-filter-status" style="min-width: 140px;">
          <option value="ALL" ${txStatusFilter === 'ALL' ? 'selected' : ''}>Semua Status</option>
          <option value="APPROVED" ${txStatusFilter === 'APPROVED' ? 'selected' : ''}>Status: Approved</option>
          <option value="SUBMITTED" ${txStatusFilter === 'SUBMITTED' ? 'selected' : ''}>Status: Submitted</option>
          <option value="COMPLETED" ${txStatusFilter === 'COMPLETED' ? 'selected' : ''}>Status: Completed</option>
          <option value="VERIFIED" ${txStatusFilter === 'VERIFIED' ? 'selected' : ''}>Status: Verified</option>
          <option value="DRAFT" ${txStatusFilter === 'DRAFT' ? 'selected' : ''}>Status: Draft</option>
          <option value="HADIR" ${txStatusFilter === 'HADIR' ? 'selected' : ''}>Status: Hadir</option>
        </select>
        ${
          txSearchQuery
            ? '<button id="btn-tx-reset-search" style="padding: 6px 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.75rem; cursor: pointer;">Reset</button>'
            : ''
        }
      </div>

      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 0.78rem; font-weight: 700; background: #e0f2fe; color: #0369a1; padding: 6px 12px; border-radius: 6px; border: 1px solid #bae6fd;">
          Total: ${filteredList.length} Record
        </span>
        ${
          curMod.qtyField
            ? `
          <span style="font-size: 0.78rem; font-weight: 700; background: #fef3c7; color: #92400e; padding: 6px 12px; border-radius: 6px; border: 1px solid #fde68a;">
            Volume: ${totalVolume.toLocaleString('id-ID')} ${curMod.unit}
          </span>
        `
            : ''
        }
      </div>
    </div>

    <!-- TABLE / CARD LIST -->
    ${
      filteredList.length === 0
        ? `
      <div class="review-empty-state" style="padding: 40px 16px; text-align: center; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 8px;">
        <div style="font-size: 2rem; margin-bottom: 8px;">${curMod.icon}</div>
        <h3 style="margin: 0 0 6px; font-size: 1rem; color: #1e293b;">Belum ada data transaksi pada modul ${curMod.title}</h3>
        <p style="margin: 0 0 16px; font-size: 0.82rem; color: #64748b;">Gunakan tombol di bawah untuk menambah data transaksi baru atau memuat data sampel demo.</p>
        <div style="display: flex; gap: 8px; justify-content: center;">
          <button id="btn-tx-empty-add" class="btn btn-primary" style="font-size: 0.8rem;">+ Tambah Transaksi</button>
          <button id="btn-tx-empty-sample" class="btn btn-ghost" style="font-size: 0.8rem; border: 1px solid #cbd5e1;">Muat Demo Data</button>
        </div>
      </div>
    `
        : `
      <div class="review-table-wrap" style="background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow-x: auto;">
        ${renderDynamicTxTable(activeTxTab, curMod, filteredList)}
      </div>
    `}
  `;

  return html;
}

function getTxStatusBadge(status) {
  status = status || 'SUBMITTED';
  let bg = '#f1f5f9';
  let color = '#475569';
  if (['APPROVED', 'VERIFIED', 'COMPLETED', 'HADIR', 'SYNCED'].includes(status)) {
    bg = '#dcfce7';
    color = '#15803d';
  } else if (['SUBMITTED', 'UNDER_REVIEW', 'PROCESS'].includes(status)) {
    bg = '#eff6ff';
    color = '#1d4ed8';
  } else if (['DRAFT', 'PENDING', 'REGRAFTING', 'PENDING_DECLARATION'].includes(status)) {
    bg = '#fef3c7';
    color = '#b45309';
  } else if (['FAILED', 'AFKIR', 'REJECTED', 'MATI'].includes(status)) {
    bg = '#fee2e2';
    color = '#b91c1c';
  }
  return `<span style="display: inline-block; font-size: 0.7rem; font-weight: 700; background: ${bg}; color: ${color}; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">${esc(status)}</span>`;
}

function getTxCrudButtons(idx) {
  return `
    <div style="position: relative; display: inline-block;">
      <button type="button" class="btn-tx-action-trigger" data-idx="${idx}" title="Menu Aksi" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: #475569; padding: 0; transition: all 0.15s ease;">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="1.3" fill="currentColor"></circle>
          <circle cx="19" cy="12" r="1.3" fill="currentColor"></circle>
          <circle cx="5" cy="12" r="1.3" fill="currentColor"></circle>
        </svg>
      </button>

      <div class="tx-action-dropdown" style="display: none; position: absolute; right: 0; top: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.14); z-index: 100; min-width: 125px; overflow: hidden; text-align: left;">
        <button type="button" class="btn-tx-detail" data-idx="${idx}" style="width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; font-size: 0.76rem; font-weight: 600; color: #334155; display: flex; align-items: center; gap: 8px; cursor: pointer; border-bottom: 1px solid #f1f5f9;">
          <svg viewBox="0 0 24 24" width="13" height="13" stroke="#475569" stroke-width="2.2" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          <span>Detail</span>
        </button>
        <button type="button" class="btn-tx-edit" data-idx="${idx}" style="width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; font-size: 0.76rem; font-weight: 600; color: #1d4ed8; display: flex; align-items: center; gap: 8px; cursor: pointer; border-bottom: 1px solid #f1f5f9;">
          <svg viewBox="0 0 24 24" width="13" height="13" stroke="#1d4ed8" stroke-width="2.2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          <span>Edit</span>
        </button>
        <button type="button" class="btn-tx-del" data-idx="${idx}" style="width: 100%; padding: 8px 12px; text-align: left; background: transparent; border: none; font-size: 0.76rem; font-weight: 600; color: #dc2626; display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <svg viewBox="0 0 24 24" width="13" height="13" stroke="#dc2626" stroke-width="2.2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          <span>Hapus</span>
        </button>
      </div>
    </div>
  `;
}

function renderDynamicTxTable(modId, curMod, list) {
  let theadHtml = '';
  let tbodyHtml = '';

  if (modId === 'attendance') {
    theadHtml = `
      <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left; color: #475569;">
        <th style="padding: 10px 12px; width: 40px;">#</th>
        <th style="padding: 10px 12px;">NIK & Pekerja</th>
        <th style="padding: 10px 12px;">Jabatan</th>
        <th style="padding: 10px 12px;">Tanggal</th>
        <th style="padding: 10px 12px;">Jam Presensi</th>
        <th style="padding: 10px 12px;">Lokasi Kebun</th>
        <th style="padding: 10px 12px; text-align: center;">Status</th>
        <th style="padding: 10px 12px; text-align: center; width: 60px;">Aksi</th>
      </tr>
    `;
    tbodyHtml = list.map((item, idx) => `
      <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.1s ease;">
        <td style="padding: 10px 12px; color: #94a3b8; font-weight: 600;">${idx + 1}</td>
        <td style="padding: 10px 12px; font-weight: 700; color: #0f172a;">
          ${esc(item.name || 'Pekerja')}
          <div style="font-size: 0.72rem; color: #64748b; font-weight: 400;">NIK: ${esc(item.code || item.nik || '104521')}</div>
        </td>
        <td style="padding: 10px 12px; color: #334155;">${esc(item.position || item.jabatan || 'Pekerja Bibitan')}</td>
        <td style="padding: 10px 12px; color: #334155;">${esc(item.tanggal || item.date || todayISO())}</td>
        <td style="padding: 10px 12px; font-weight: 600; color: #0f172a;">${esc(item.time || '07:15')} WIB</td>
        <td style="padding: 10px 12px; color: #475569;">${esc(item.location || item.kebun || 'Divisi I Kebun Induk')}</td>
        <td style="padding: 10px 12px; text-align: center;">${getTxStatusBadge(item.status || 'HADIR')}</td>
        <td style="padding: 10px 12px; text-align: center;">${getTxCrudButtons(idx)}</td>
      </tr>
    `).join('');
  } else if (modId === 'reception') {
    theadHtml = `
      <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left; color: #475569;">
        <th style="padding: 10px 12px; width: 40px;">#</th>
        <th style="padding: 10px 12px;">No. Dokumen / PO</th>
        <th style="padding: 10px 12px;">Tanggal</th>
        <th style="padding: 10px 12px;">Tahapan Pertumbuhan</th>
        <th style="padding: 10px 12px;">Jenis Klon</th>
        <th style="padding: 10px 12px;">Sumber Asal Bibit</th>
        <th style="padding: 10px 12px; text-align: right;">Jlh Diterima (Pkk)</th>
        <th style="padding: 10px 12px; text-align: center;">Status</th>
        <th style="padding: 10px 12px; text-align: center; width: 60px;">Aksi</th>
      </tr>
    `;
    tbodyHtml = list.map((item, idx) => `
      <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.1s ease;">
        <td style="padding: 10px 12px; color: #94a3b8; font-weight: 600;">${idx + 1}</td>
        <td style="padding: 10px 12px; font-weight: 700; color: #0f172a;">${esc(item.docNo || `RCV-${idx + 1}`)}</td>
        <td style="padding: 10px 12px; color: #334155;">${esc(item.tanggal || item.date || todayISO())}</td>
        <td style="padding: 10px 12px; font-weight: 600; color: #334155;">${esc(item.tahapan || 'Rubber Main Nursery')}</td>
        <td style="padding: 10px 12px; font-weight: 700; color: #0f172a;">${esc(item.klon || 'PB 260')}</td>
        <td style="padding: 10px 12px; color: #475569;">${esc(item.sumber || item.supplier || '-')}</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #116834;">${(parseInt(item.qty || 0)).toLocaleString('id-ID')} Pkk</td>
        <td style="padding: 10px 12px; text-align: center;">${getTxStatusBadge(item.status || 'APPROVED')}</td>
        <td style="padding: 10px 12px; text-align: center;">${getTxCrudButtons(idx)}</td>
      </tr>
    `).join('');
  } else if (modId === 'seeding') {
    theadHtml = `
      <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left; color: #475569;">
        <th style="padding: 10px 12px; width: 40px;">#</th>
        <th style="padding: 10px 12px;">Dokumen Ref & Batch</th>
        <th style="padding: 10px 12px;">Tanggal Semai</th>
        <th style="padding: 10px 12px;">No. Bedengan</th>
        <th style="padding: 10px 12px;">Klon Batang Bawah</th>
        <th style="padding: 10px 12px; text-align: right;">Bibit Disemai (Pkk)</th>
        <th style="padding: 10px 12px; text-align: right;">Jlh Polybag</th>
        <th style="padding: 10px 12px; text-align: right;">Ditolak (Pkk)</th>
        <th style="padding: 10px 12px; text-align: center;">Status</th>
        <th style="padding: 10px 12px; text-align: center; width: 60px;">Aksi</th>
      </tr>
    `;
    tbodyHtml = list.map((item, idx) => {
      let bedDisplay = item.bedengan;
      if (!bedDisplay && Array.isArray(item.rows) && item.rows.length > 0) {
        const beds = Array.from(new Set(item.rows.map(r => r.bedengan).filter(Boolean)));
        bedDisplay = beds.length > 0 ? beds.join(', ') : 'Bedengan 01';
      }
      bedDisplay = bedDisplay || 'Bedengan 01';

      const polybagVal = parseInt(item.totalPolybag || (item.totalDisemai ? Math.ceil(item.totalDisemai / 2) : 0)) || 0;
      const ditolakVal = parseInt(item.ditolak || 0);

      return `
        <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.1s ease;">
          <td style="padding: 10px 12px; color: #94a3b8; font-weight: 600;">${idx + 1}</td>
          <td style="padding: 10px 12px; font-weight: 700; color: #0f172a;">
            ${esc(item.docNo || '-')}
            <div style="font-size: 0.72rem; color: #116834; font-weight: 700;">${esc(item.batchNo || 'Batch-01')}</div>
          </td>
          <td style="padding: 10px 12px; color: #334155;">${esc(item.tanggal || item.date || todayISO())}</td>
          <td style="padding: 10px 12px; font-weight: 700; color: #111827;">${esc(bedDisplay)}</td>
          <td style="padding: 10px 12px; font-weight: 600; color: #334155;">${esc(item.klonAwal || item.klon || 'GT 1')}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #116834;">${(parseInt(item.totalDisemai || item.qty || 0)).toLocaleString('id-ID')} Pkk</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: #475569;">${polybagVal.toLocaleString('id-ID')} Plb</td>
          <td style="padding: 10px 12px; text-align: right; color: ${ditolakVal > 0 ? '#dc2626' : '#64748b'}; font-weight: ${ditolakVal > 0 ? '700' : '500'};">${ditolakVal.toLocaleString('id-ID')} Pkk</td>
          <td style="padding: 10px 12px; text-align: center;">${getTxStatusBadge(item.status || 'SUBMITTED')}</td>
          <td style="padding: 10px 12px; text-align: center;">${getTxCrudButtons(idx)}</td>
        </tr>
      `;
    }).join('');
  } else if (modId === 'budding') {
    theadHtml = `
      <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left; color: #475569;">
        <th style="padding: 10px 12px; width: 40px;">#</th>
        <th style="padding: 10px 12px;">No. Dokumen & Batch</th>
        <th style="padding: 10px 12px;">Tanggal Okulasi</th>
        <th style="padding: 10px 12px;">Bedengan</th>
        <th style="padding: 10px 12px;">Klon Batang Bawah</th>
        <th style="padding: 10px 12px;">Klon Entres</th>
        <th style="padding: 10px 12px; text-align: right;">Kayu Okulasi</th>
        <th style="padding: 10px 12px; text-align: right;">Diokulasi (Pkk)</th>
        <th style="padding: 10px 12px; text-align: right;">Ditolak</th>
        <th style="padding: 10px 12px; text-align: center;">Status</th>
        <th style="padding: 10px 12px; text-align: center; width: 60px;">Aksi</th>
      </tr>
    `;
    tbodyHtml = list.map((item, idx) => `
      <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.1s ease;">
        <td style="padding: 10px 12px; color: #94a3b8; font-weight: 600;">${idx + 1}</td>
        <td style="padding: 10px 12px; font-weight: 700; color: #0f172a;">
          ${esc(item.docNo || 'OKL/2026/01')}
          <div style="font-size: 0.72rem; color: #116834; font-weight: 700;">${esc(item.batchNo || 'Batch-01')}</div>
        </td>
        <td style="padding: 10px 12px; color: #334155;">${esc(item.tanggal || item.date || todayISO())}</td>
        <td style="padding: 10px 12px; font-weight: 700; color: #111827;">${esc(item.bedengan || 'Bedengan 01')}</td>
        <td style="padding: 10px 12px; color: #334155;">${esc(item.klonRootstock || 'GT 1')}</td>
        <td style="padding: 10px 12px; font-weight: 700; color: #116834;">${esc(item.klonEntres || item.klon || 'PB 260')}</td>
        <td style="padding: 10px 12px; text-align: right; color: #475569;">${(parseInt(item.jumlahKayu || 0)).toLocaleString('id-ID')} Btg</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #116834;">${(parseInt(item.jumlah || item.qty || 0)).toLocaleString('id-ID')} Pkk</td>
        <td style="padding: 10px 12px; text-align: right; color: ${parseInt(item.jumlahDitolak || 0) > 0 ? '#dc2626' : '#64748b'}; font-weight: ${parseInt(item.jumlahDitolak || 0) > 0 ? '700' : '500'};">${(parseInt(item.jumlahDitolak || 0)).toLocaleString('id-ID')} Pkk</td>
        <td style="padding: 10px 12px; text-align: center;">${getTxStatusBadge(item.status || 'COMPLETED')}</td>
        <td style="padding: 10px 12px; text-align: center;">${getTxCrudButtons(idx)}</td>
      </tr>
    `).join('');
  } else if (modId === 'inspection') {
    theadHtml = `
      <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left; color: #475569;">
        <th style="padding: 10px 12px; width: 40px;">#</th>
        <th style="padding: 10px 12px;">No. Dokumen & Batch</th>
        <th style="padding: 10px 12px;">Tanggal Periksa</th>
        <th style="padding: 10px 12px;">Ref. Dokumen Okulasi</th>
        <th style="padding: 10px 12px;">Bedengan</th>
        <th style="padding: 10px 12px; text-align: right;">Total Diperiksa</th>
        <th style="padding: 10px 12px; text-align: right;">Hasil Jadi (Sukses)</th>
        <th style="padding: 10px 12px; text-align: right;">Hasil Gagal</th>
        <th style="padding: 10px 12px; text-align: center;">% Jadi</th>
        <th style="padding: 10px 12px; text-align: center;">Status</th>
        <th style="padding: 10px 12px; text-align: center; width: 60px;">Aksi</th>
      </tr>
    `;
    tbodyHtml = list.map((item, idx) => {
      const periksaVal = parseInt(item.totalDiperiksa || 0);
      const jadiVal = parseInt(item.jumlahJadi || 0);
      const gagalVal = parseInt(item.jumlahGagal || (periksaVal - jadiVal)) || 0;
      const persen = item.persenJadi !== undefined ? item.persenJadi : (periksaVal > 0 ? Math.round((jadiVal / periksaVal) * 100) : 0);

      return `
        <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.1s ease;">
          <td style="padding: 10px 12px; color: #94a3b8; font-weight: 600;">${idx + 1}</td>
          <td style="padding: 10px 12px; font-weight: 700; color: #0f172a;">
            ${esc(item.docNo || 'INSP/2026/01')}
            <div style="font-size: 0.72rem; color: #116834; font-weight: 700;">${esc(item.batchNo || 'Batch-01')}</div>
          </td>
          <td style="padding: 10px 12px; color: #334155;">${esc(item.tanggal || item.date || todayISO())}</td>
          <td style="padding: 10px 12px; font-size: 0.72rem; color: #475569;">${esc(item.buddingDocNo || '-')}</td>
          <td style="padding: 10px 12px; font-weight: 700; color: #111827;">${esc(item.bedengan || 'Bedengan 01')}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #0f172a;">${periksaVal.toLocaleString('id-ID')} Pkk</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #15803d;">${jadiVal.toLocaleString('id-ID')} Pkk</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #b91c1c;">${gagalVal.toLocaleString('id-ID')} Pkk</td>
          <td style="padding: 10px 12px; text-align: center;">
            <span style="font-weight: 800; font-size: 0.75rem; color: #116834; padding: 2px 7px; background: #dcfce7; border-radius: 4px; border: 1px solid #bbf7d0;">${persen}%</span>
          </td>
          <td style="padding: 10px 12px; text-align: center;">${getTxStatusBadge(item.status || 'VERIFIED')}</td>
          <td style="padding: 10px 12px; text-align: center;">${getTxCrudButtons(idx)}</td>
        </tr>
      `;
    }).join('');
  } else if (modId === 'regrafting') {
    theadHtml = `
      <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left; color: #475569;">
        <th style="padding: 10px 12px; width: 40px;">#</th>
        <th style="padding: 10px 12px;">No. Dokumen & Batch</th>
        <th style="padding: 10px 12px;">Tanggal</th>
        <th style="padding: 10px 12px;">Bedengan</th>
        <th style="padding: 10px 12px;">Klon Entres</th>
        <th style="padding: 10px 12px; text-align: right;">Kayu Entres</th>
        <th style="padding: 10px 12px; text-align: right;">Jlh Regrafting (Pkk)</th>
        <th style="padding: 10px 12px; text-align: right;">Ditolak</th>
        <th style="padding: 10px 12px; text-align: center;">Status</th>
        <th style="padding: 10px 12px; text-align: center; width: 60px;">Aksi</th>
      </tr>
    `;
    tbodyHtml = list.map((item, idx) => `
      <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.1s ease;">
        <td style="padding: 10px 12px; color: #94a3b8; font-weight: 600;">${idx + 1}</td>
        <td style="padding: 10px 12px; font-weight: 700; color: #0f172a;">
          ${esc(item.docNo || 'REG/2026/01')}
          <div style="font-size: 0.72rem; color: #116834; font-weight: 700;">${esc(item.batchNo || 'Batch-01')}</div>
        </td>
        <td style="padding: 10px 12px; color: #334155;">${esc(item.tanggal || item.date || todayISO())}</td>
        <td style="padding: 10px 12px; font-weight: 700; color: #111827;">${esc(item.bedengan || 'Bedengan 01')}</td>
        <td style="padding: 10px 12px; font-weight: 700; color: #116834;">${esc(item.klonEntres || item.klon || 'PB 260')}</td>
        <td style="padding: 10px 12px; text-align: right; color: #475569;">${(parseInt(item.jumlahKayu || 0)).toLocaleString('id-ID')} Btg</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #116834;">${(parseInt(item.jumlah || item.qty || 0)).toLocaleString('id-ID')} Pkk</td>
        <td style="padding: 10px 12px; text-align: right; color: ${parseInt(item.jumlahDitolak || 0) > 0 ? '#dc2626' : '#64748b'}; font-weight: ${parseInt(item.jumlahDitolak || 0) > 0 ? '700' : '500'};">${(parseInt(item.jumlahDitolak || 0)).toLocaleString('id-ID')} Pkk</td>
        <td style="padding: 10px 12px; text-align: center;">${getTxStatusBadge(item.status || 'SUBMITTED')}</td>
        <td style="padding: 10px 12px; text-align: center;">${getTxCrudButtons(idx)}</td>
      </tr>
    `).join('');
  } else if (modId === 'selection') {
    theadHtml = `
      <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left; color: #475569;">
        <th style="padding: 10px 12px; width: 40px;">#</th>
        <th style="padding: 10px 12px;">No. Dokumen Seleksi</th>
        <th style="padding: 10px 12px;">Tanggal</th>
        <th style="padding: 10px 12px;">Asal Afkir</th>
        <th style="padding: 10px 12px;">Ref Dokumen / Batch</th>
        <th style="padding: 10px 12px;">Bedengan</th>
        <th style="padding: 10px 12px;">Klon</th>
        <th style="padding: 10px 12px; text-align: right;">Jlh Afkir (Pkk)</th>
        <th style="padding: 10px 12px;">Alasan Afkir</th>
        <th style="padding: 10px 12px; text-align: center;">Status</th>
        <th style="padding: 10px 12px; text-align: center; width: 60px;">Aksi</th>
      </tr>
    `;
    tbodyHtml = list.map((item, idx) => `
      <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.1s ease;">
        <td style="padding: 10px 12px; color: #94a3b8; font-weight: 600;">${idx + 1}</td>
        <td style="padding: 10px 12px; font-weight: 700; color: #0f172a;">${esc(item.docNo || 'SEL/2026/01')}</td>
        <td style="padding: 10px 12px; color: #334155;">${esc(item.tanggal || item.date || todayISO())}</td>
        <td style="padding: 10px 12px;">
          <span style="font-size: 0.68rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca;">
            ${esc(item.originType || 'AFKIR')}
          </span>
        </td>
        <td style="padding: 10px 12px; font-size: 0.72rem; color: #475569;">${esc(item.batchNo || item.buddingDocNo || item.inspectionDocNo || '-')}</td>
        <td style="padding: 10px 12px; font-weight: 700; color: #111827;">${esc(item.bedengan || 'Bedengan 01')}</td>
        <td style="padding: 10px 12px; font-weight: 600;">${esc(item.klon || 'GT 1')}</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #b91c1c;">${(parseInt(item.jumlahAfkir || item.jumlah || item.qty || 0)).toLocaleString('id-ID')} Pkk</td>
        <td style="padding: 10px 12px; font-size: 0.75rem; font-weight: 600; color: #7f1d1d;">${esc(item.alasan || 'MATI')}</td>
        <td style="padding: 10px 12px; text-align: center;">${getTxStatusBadge(item.status || 'AFKIR')}</td>
        <td style="padding: 10px 12px; text-align: center;">${getTxCrudButtons(idx)}</td>
      </tr>
    `).join('');
  } else if (modId === 'syncQueue') {
    theadHtml = `
      <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0; text-align: left; color: #475569;">
        <th style="padding: 10px 12px; width: 40px;">#</th>
        <th style="padding: 10px 12px;">Queue ID</th>
        <th style="padding: 10px 12px;">Entitas / Modul</th>
        <th style="padding: 10px 12px;">Operasi</th>
        <th style="padding: 10px 12px;">Ringkasan Data</th>
        <th style="padding: 10px 12px;">Waktu Antre</th>
        <th style="padding: 10px 12px; text-align: center;">Status</th>
        <th style="padding: 10px 12px; text-align: center; width: 60px;">Aksi</th>
      </tr>
    `;
    tbodyHtml = list.map((item, idx) => `
      <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.1s ease;">
        <td style="padding: 10px 12px; color: #94a3b8; font-weight: 600;">${idx + 1}</td>
        <td style="padding: 10px 12px; font-weight: 700; color: #0f172a;">${esc(item.id || item.docNo || `SYNC-${idx + 1}`)}</td>
        <td style="padding: 10px 12px; font-weight: 700; color: #0284c7; text-transform: uppercase;">${esc(item.entity || 'receptions')}</td>
        <td style="padding: 10px 12px;">
          <span style="font-size: 0.70rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #e0f2fe; color: #0369a1;">
            ${esc(item.action || 'CREATE')}
          </span>
        </td>
        <td style="padding: 10px 12px;">
          <div style="font-size: 0.72rem; color: #475569; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${esc(typeof item.payload === 'object' ? JSON.stringify(item.payload) : (item.payload || '-'))}
          </div>
        </td>
        <td style="padding: 10px 12px; color: #334155;">${esc(item.createdAt || item.timestamp || todayISO())}</td>
        <td style="padding: 10px 12px; text-align: center;">${getTxStatusBadge(item.status || 'PENDING')}</td>
        <td style="padding: 10px 12px; text-align: center;">${getTxCrudButtons(idx)}</td>
      </tr>
    `).join('');
  }

  return `
    <table class="review-table" style="width: 100%; border-collapse: collapse; font-size: 0.82rem;">
      <thead>${theadHtml}</thead>
      <tbody>${tbodyHtml}</tbody>
    </table>
  `;
}

function attachTransactionsWorkspaceEvents(container) {
  // Sub-tabs switching
  container.querySelectorAll('.tx-sub-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTxTab = btn.dataset.mod;
      txSearchQuery = '';
      renderReviewPanel();
    });
  });

  // Search input
  const searchInput = container.querySelector('#tx-search-input');
  searchInput?.addEventListener('input', (e) => {
    txSearchQuery = e.target.value;
    clearTimeout(window._txSearchTimeout);
    window._txSearchTimeout = setTimeout(() => {
      renderReviewPanel();
    }, 250);
  });

  // Reset search
  container.querySelector('#btn-tx-reset-search')?.addEventListener('click', () => {
    txSearchQuery = '';
    renderReviewPanel();
  });

  // Status Filter
  const statusSelect = container.querySelector('#tx-filter-status');
  statusSelect?.addEventListener('change', (e) => {
    txStatusFilter = e.target.value;
    renderReviewPanel();
  });

  // Buka Layar Modul di HP
  container.querySelector('#btn-tx-open-screen')?.addEventListener('click', () => {
    const curMod = TX_MODULES[activeTxTab];
    if (curMod?.route) {
      navigate(curMod.route);
      toast(`Menampilkan layar ${curMod.title} di frame HP`, 'info');
    }
  });

  // Reset / Bersihkan Seluruh Data Transaksi
  container.querySelector('#btn-tx-reset-all')?.addEventListener('click', () => {
    openModal({
      title: 'Kosongkan Seluruh Data Transaksi & Afkir',
      body: `
        <div style="text-align: center; padding: 10px 0;">
          <div style="font-size: 2.5rem; margin-bottom: 8px;">⚠️</div>
          <h3 style="font-size: 1rem; font-weight: 800; color: #991b1b; margin: 0 0 8px;">Hapus Bersih Semua Data Transaksi?</h3>
          <p style="font-size: 0.82rem; color: #334155; line-height: 1.5; margin: 0 0 12px;">
            Tindakan ini akan <strong>menghapus seluruh data operasional</strong> di prototype, termasuk:
            <br>&bull; Penerimaan Benih & Bibit APM
            <br>&bull; Batching & Bedengan Penyemaian
            <br>&bull; Okulasi & Okulasi Janda (Regrafting)
            <br>&bull; Pemeriksaan Okulasi (Hasil Sukses vs Gagal)
            <br>&bull; <strong>Daftar Bibit Afkir / Penyeleksian (Selection Pool)</strong>
            <br>&bull; Presensi & Antrean Sinkronisasi
          </p>
          <div style="background: #fef2f2; border: 1px dashed #f87171; border-radius: 6px; padding: 8px; font-size: 0.75rem; color: #b91c1c;">
            Seluruh layar prototype di frame HP akan otomatis kembali bersih (0 data).
          </div>
        </div>
      `,
      footer: `
        <button class="btn btn-ghost" data-reset-cancel>Batal</button>
        <button class="btn btn-danger" id="btn-confirm-reset-all">Ya, Kosongkan Bersih</button>
      `
    });

    const root = document.getElementById('modal-root');
    root.querySelector('[data-reset-cancel]')?.addEventListener('click', closeModal);
    root.querySelector('#btn-confirm-reset-all')?.addEventListener('click', async () => {
      // 1. Kosongkan semua storage transaksi & pool
      storage.set('selection_pool', []);
      storage.set('selection_transactions', []);
      storage.set('regrafting_pool', []);
      storage.set('budding_transactions', []);
      storage.set('inspection_transactions', []);
      storage.set('receipt_transactions', []);
      storage.set('seeding_transactions', []);
      storage.set('attendance_transactions', []);
      storage.set('sync_queue', []);

      // 2. Kosongkan draft form cache
      storage.set('receipt_photos', []);
      storage.set('benih_table_rows', []);
      storage.remove('editing_transaction_index');
      storage.remove('viewing_transaction_index');
      storage.remove('seeding_source_index');
      storage.remove('editing_seeding_index');
      storage.remove('selected_sir');
      storage.remove('selected_klon');
      storage.remove('benih_jenis');
      storage.remove('benih_tahapan');
      storage.remove('benih_program_id');
      storage.remove('benih_program_code');
      storage.remove('benih_source_id');
      storage.remove('benih_source_name');
      storage.remove('benih_batch_code');
      storage.remove('transaction_originType');

      // 3. Kosongkan IndexedDB khusus tabel transaksi (User, Role, dan Master Data tetap aman terjaga!)
      try {
        const txStores = [
          'attendance', 'receptions', 'seedings', 'transplantations',
          'buddings', 'inspections', 'regraftings', 'selections',
          'batchTransfers', 'stageTransfers', 'entresActivities',
          'nurseryActivities', 'requests', 'syncQueue', 'auditLogs', 'photos'
        ];
        const db = await (await import('../../db/indexeddb.js')).getDB();
        const tx = db.transaction(txStores, 'readwrite');
        for (const s of txStores) {
          tx.objectStore(s).clear();
        }
      } catch (err) {
        console.warn('[review] clear tx stores error:', err);
      }

      // Pastikan master data & akun role login selalu lengkap tersedia
      try {
        const { seedDatabase } = await import('../../db/seed.js');
        await seedDatabase();
      } catch (err) {
        console.warn('[review] seedDatabase error:', err);
      }

      closeModal();
      toast('Seluruh data transaksi dan bibit afkir telah dibersihkan!', 'success');
      renderReviewPanel();

      // Refresh frame HP jika sedang di halaman yang relevan
      const cur = getCurrent();
      if (cur?.route) {
        navigate(cur.route);
      }
    });
  });

  // Muat Demo Data
  const seedDemo = async () => {
    await injectTxDemoSample(activeTxTab);
    toast(`Data sampel ${TX_MODULES[activeTxTab]?.title} berhasil dimuat!`, 'success');
    renderReviewPanel();
  };
  container.querySelector('#btn-tx-seed-sample')?.addEventListener('click', seedDemo);
  container.querySelector('#btn-tx-empty-sample')?.addEventListener('click', seedDemo);

  // Tambah Transaksi
  const openAdd = () => openTxFormModal(null, activeTxTab);
  container.querySelector('#btn-tx-add-new')?.addEventListener('click', openAdd);
  container.querySelector('#btn-tx-empty-add')?.addEventListener('click', openAdd);

  // Menu Aksi 3-dots Trigger & Dropdown
  container.querySelectorAll('.btn-tx-action-trigger').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const parent = btn.closest('div');
      const menu = parent?.querySelector('.tx-action-dropdown');

      container.querySelectorAll('.tx-action-dropdown').forEach((m) => {
        if (m !== menu) m.style.display = 'none';
      });

      if (menu) {
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
      }
    });
  });

  // Tutup dropdown jika klik di luar
  document.addEventListener('click', () => {
    document.querySelectorAll('.tx-action-dropdown').forEach((m) => {
      m.style.display = 'none';
    });
  });

  // Edit Transaksi
  container.querySelectorAll('.btn-tx-edit').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      container.querySelectorAll('.tx-action-dropdown').forEach((m) => (m.style.display = 'none'));
      const idx = parseInt(btn.dataset.idx, 10);
      const list = loadTxList(activeTxTab);
      if (list[idx]) {
        openTxFormModal(list[idx], activeTxTab, idx);
      }
    });
  });

  // Hapus Transaksi
  container.querySelectorAll('.btn-tx-del').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      container.querySelectorAll('.tx-action-dropdown').forEach((m) => (m.style.display = 'none'));
      const idx = parseInt(btn.dataset.idx, 10);
      const list = loadTxList(activeTxTab);
      if (list[idx]) {
        openTxDeleteConfirm(list[idx], activeTxTab, idx);
      }
    });
  });

  // Detail Transaksi
  container.querySelectorAll('.btn-tx-detail').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      container.querySelectorAll('.tx-action-dropdown').forEach((m) => (m.style.display = 'none'));
      const idx = parseInt(btn.dataset.idx, 10);
      const list = loadTxList(activeTxTab);
      if (list[idx]) {
        openTxDetailModal(list[idx], activeTxTab, idx);
      }
    });
  });
}

function openTxFormModal(item, modId, editIndex = null) {
  const isEdit = item !== null && editIndex !== null;
  const cfg = TX_MODULES[modId];
  const docNo = item ? item.docNo || item.nomorDokumen || item.id || '' : generateNewDocNo(modId);
  const tanggal = item ? item.tanggal || item.date || todayISO() : todayISO();
  const status = item ? item.status || 'SUBMITTED' : 'SUBMITTED';
  const notes = item ? item.notes || item.catatan || '' : '';

  openModal({
    title: isEdit ? `Edit Transaksi: ${cfg.title}` : `Tambah Transaksi: ${cfg.title}`,
    body: `
      <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.85rem;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Nomor Dokumen / ID Transaksi <span style="color:#ef4444;">*</span></label>
          <input class="feedback-form-input" id="tx-input-docNo" type="text" value="${esc(docNo)}" required />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Tanggal Transaksi</label>
            <input class="feedback-form-input" id="tx-input-date" type="text" value="${esc(tanggal)}" placeholder="YYYY-MM-DD" />
          </div>
          <div>
            <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Status Transaksi</label>
            <select class="feedback-form-select" id="tx-input-status">
              <option value="SUBMITTED" ${status === 'SUBMITTED' ? 'selected' : ''}>SUBMITTED</option>
              <option value="APPROVED" ${status === 'APPROVED' ? 'selected' : ''}>APPROVED</option>
              <option value="VERIFIED" ${status === 'VERIFIED' ? 'selected' : ''}>VERIFIED</option>
              <option value="COMPLETED" ${status === 'COMPLETED' ? 'selected' : ''}>COMPLETED</option>
              <option value="DRAFT" ${status === 'DRAFT' ? 'selected' : ''}>DRAFT</option>
              <option value="HADIR" ${status === 'HADIR' ? 'selected' : ''}>HADIR</option>
            </select>
          </div>
        </div>

        ${renderTxModuleFields(modId, item)}

        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Catatan Operasional</label>
          <textarea class="feedback-form-textarea" id="tx-input-notes" placeholder="Catatan opsional...">${esc(notes)}</textarea>
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" data-tx-cancel>Batal</button>
      <button class="btn btn-primary" id="btn-tx-save-modal">${isEdit ? 'Perbarui Transaksi' : 'Simpan Transaksi'}</button>
    `
  });

  const root = document.getElementById('modal-root');
  root.querySelector('[data-tx-cancel]')?.addEventListener('click', closeModal);
  root.querySelector('#btn-tx-save-modal')?.addEventListener('click', () => {
    const docNoVal = root.querySelector('#tx-input-docNo')?.value.trim();
    if (!docNoVal) {
      toast('Nomor dokumen wajib diisi!', 'danger');
      return;
    }

    const payload = extractTxFormPayload(modId, root);
    payload.docNo = docNoVal;
    payload.tanggal = root.querySelector('#tx-input-date')?.value || todayISO();
    payload.status = root.querySelector('#tx-input-status')?.value || 'SUBMITTED';
    payload.notes = root.querySelector('#tx-input-notes')?.value || '';

    const list = loadTxList(modId);
    if (isEdit) {
      list[editIndex] = { ...item, ...payload, updatedAt: new Date().toISOString() };
    } else {
      payload.id = uid(`${modId.toUpperCase().slice(0, 3)}-`);
      payload.createdAt = new Date().toISOString();
      list.unshift(payload);
    }

    saveTxList(modId, list);
    closeModal();
    toast(isEdit ? 'Data transaksi berhasil diperbarui!' : 'Transaksi baru berhasil ditambahkan!', 'success');
    renderReviewPanel();
  });
}

function openTxDeleteConfirm(item, modId, index) {
  const docTitle = item.docNo || item.name || item.id || `Item #${index + 1}`;
  const cfg = TX_MODULES[modId];

  openModal({
    title: `Hapus Transaksi ${cfg.title}`,
    body: `
      <div style="text-align: center; padding: 10px 0;">
        <div style="font-size: 2.5rem; margin-bottom: 8px;">⚠️</div>
        <p style="font-size: 0.95rem; color: #1e293b; margin: 0 0 8px;">
          Yakin ingin menghapus data <strong>${esc(docTitle)}</strong>?
        </p>
        <p style="font-size: 0.8rem; color: #64748b; margin: 0;">
          Transaksi akan dihapus dari modul ${cfg.title} dan perubahan akan langsung merefleksikan saldo ketersediaan.
        </p>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" data-tx-del-cancel>Batal</button>
      <button class="btn btn-danger" id="btn-tx-del-confirm">Ya, Hapus Data</button>
    `
  });

  const root = document.getElementById('modal-root');
  root.querySelector('[data-tx-del-cancel]')?.addEventListener('click', closeModal);
  root.querySelector('#btn-tx-del-confirm')?.addEventListener('click', () => {
    const list = loadTxList(modId);
    list.splice(index, 1);
    saveTxList(modId, list);
    if (modId === 'selection') {
      let pool = storage.get('selection_pool', []);
      let culled = storage.get('selection_transactions', []);
      pool = pool.filter((p) => p.docNo !== item.docNo && p.id !== item.id);
      culled = culled.filter((c) => c.docNo !== item.docNo && c.selectionPoolDocNo !== item.docNo && c.id !== item.id);
      storage.set('selection_pool', pool);
      storage.set('selection_transactions', culled);
    }
    if (item.id) {
      try {
        cfg.repo.remove(item.id);
      } catch (e) {}
    }
    closeModal();
    toast('Data transaksi berhasil dihapus!', 'info');
    renderReviewPanel();
    const cur = getCurrent();
    if (cur?.route) navigate(cur.route);
  });
}

function openTxDetailModal(item, modId, index) {
  const cfg = TX_MODULES[modId];
  openModal({
    title: `Detail Transaksi: ${cfg.title}`,
    body: `
      <div style="max-height: 60vh; overflow-y: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem;">
          ${Object.entries(item)
            .map(([k, v]) => {
              if (k === 'rawState' || k === 'photos' || k === 'photo') return '';
              const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
              return `
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 38%; vertical-align: top;">${esc(k)}</td>
                <td style="padding: 6px 0; color: #0f172a; word-break: break-word;">${esc(val)}</td>
              </tr>
            `;
            })
            .join('')}
        </table>
      </div>
    `,
    footer: `
      <button class="btn btn-primary" data-detail-close>Tutup</button>
    `
  });

  const root = document.getElementById('modal-root');
  root.querySelector('[data-detail-close]')?.addEventListener('click', closeModal);
}

function renderTxModuleFields(modId, item) {
  if (modId === 'attendance') {
    return `
      <div>
        <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Nama Mandor / Pekerja <span style="color:#ef4444;">*</span></label>
        <input class="feedback-form-input" id="tx-input-name" type="text" value="${esc(item?.name || 'Fadilah Yusuf Purba')}" />
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Jabatan</label>
          <input class="feedback-form-input" id="tx-input-position" type="text" value="${esc(item?.position || 'Pekerja Bibitan')}" />
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Jam Presensi</label>
          <input class="feedback-form-input" id="tx-input-time" type="text" value="${esc(item?.time || '07:15')}" />
        </div>
      </div>
    `;
  }
  if (modId === 'reception') {
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Tahapan Pertumbuhan</label>
          <select class="feedback-form-select" id="tx-input-tahapan">
            <option value="Rubber Main Nursery" ${item?.tahapan !== 'Rubber Advance Planting Material' ? 'selected' : ''}>Rubber Main Nursery (RMN)</option>
            <option value="Rubber Advance Planting Material" ${item?.tahapan === 'Rubber Advance Planting Material' ? 'selected' : ''}>Rubber Advance Planting Material (APM)</option>
          </select>
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Jenis Klon</label>
          <input class="feedback-form-input" id="tx-input-klon" type="text" value="${esc(item?.klon || 'PB 260')}" />
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Sumber Asal Bibit</label>
          <input class="feedback-form-input" id="tx-input-sumber" type="text" value="${esc(item?.sumber || 'Supplier Bibit Jaya')}" />
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Jumlah Diterima (Pkk) <span style="color:#ef4444;">*</span></label>
          <input class="feedback-form-input" id="tx-input-qty" type="number" value="${esc(item?.qty || 5000)}" />
        </div>
      </div>
    `;
  }
  if (modId === 'seeding') {
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Nomor Batch</label>
          <input class="feedback-form-input" id="tx-input-batchNo" type="text" value="${esc(item?.batchNo || 'Batch-01')}" />
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Nomor Bedengan</label>
          <input class="feedback-form-input" id="tx-input-bedengan" type="text" value="${esc(item?.bedengan || (item?.rows && item.rows[0]?.bedengan) || 'Bedengan 01')}" />
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Klon Rootstock</label>
          <input class="feedback-form-input" id="tx-input-klonAwal" type="text" value="${esc(item?.klonAwal || item?.klon || 'GT 1')}" />
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Jumlah Disemai (Pkk)</label>
          <input class="feedback-form-input" id="tx-input-totalDisemai" type="number" value="${esc(item?.totalDisemai || item?.qty || 3000)}" />
        </div>
      </div>
    `;
  }
  if (modId === 'budding' || modId === 'regrafting') {
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Nomor Batch</label>
          <input class="feedback-form-input" id="tx-input-batchNo" type="text" value="${esc(item?.batchNo || 'Batch-01')}" />
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Nomor Bedengan</label>
          <input class="feedback-form-input" id="tx-input-bedengan" type="text" value="${esc(item?.bedengan || 'Bedengan 01')}" />
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Klon Entres (Mata)</label>
          <input class="feedback-form-input" id="tx-input-klonEntres" type="text" value="${esc(item?.klonEntres || 'PB 260')}" />
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Klon Rootstock (Bawah)</label>
          <input class="feedback-form-input" id="tx-input-klonRootstock" type="text" value="${esc(item?.klonRootstock || 'GT 1')}" />
        </div>
      </div>
      <div>
        <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Jumlah Diokulasi (Pkk)</label>
        <input class="feedback-form-input" id="tx-input-jumlah" type="number" value="${esc(item?.jumlah || 1500)}" />
      </div>
    `;
  }
  if (modId === 'inspection') {
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Ref. Dokumen Okulasi</label>
          <input class="feedback-form-input" id="tx-input-buddingDocNo" type="text" value="${esc(item?.buddingDocNo || 'OKL/2026/01')}" />
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Nomor Batch</label>
          <input class="feedback-form-input" id="tx-input-batchNo" type="text" value="${esc(item?.batchNo || 'Batch-01')}" />
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Total Diperiksa (Pkk)</label>
          <input class="feedback-form-input" id="tx-input-totalDiperiksa" type="number" value="${esc(item?.totalDiperiksa || 1500)}" />
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Hasil Jadi (Sukses)</label>
          <input class="feedback-form-input" id="tx-input-jumlahJadi" type="number" value="${esc(item?.jumlahJadi || 1350)}" />
        </div>
      </div>
    `;
  }
  if (modId === 'selection') {
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Nomor Batch</label>
          <input class="feedback-form-input" id="tx-input-batchNo" type="text" value="${esc(item?.batchNo || 'Batch-01')}" />
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Alasan Pengafkiran</label>
          <select class="feedback-form-select" id="tx-input-alasan">
            <option value="MATI" ${item?.alasan === 'MATI' ? 'selected' : ''}>MATI (Kering / Busuk)</option>
            <option value="ABNORMAL" ${item?.alasan === 'ABNORMAL' ? 'selected' : ''}>ABNORMAL (Kerdil / Rusak)</option>
            <option value="RUSAK" ${item?.alasan === 'RUSAK' ? 'selected' : ''}>RUSAK (Hama / Penyakit)</option>
          </select>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Klon</label>
          <input class="feedback-form-input" id="tx-input-klon" type="text" value="${esc(item?.klon || 'PB 260')}" />
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Jumlah Diafkir (Pkk)</label>
          <input class="feedback-form-input" id="tx-input-jumlahAfkir" type="number" value="${esc(item?.jumlahAfkir || 50)}" />
        </div>
      </div>
    `;
  }
  if (modId === 'syncQueue') {
    return `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Modul Entitas</label>
          <select class="feedback-form-select" id="tx-input-entity">
            <option value="receptions">receptions (Penerimaan)</option>
            <option value="seedings">seedings (Penyemaian)</option>
            <option value="buddings">buddings (Okulasi)</option>
            <option value="inspections">inspections (Pemeriksaan)</option>
            <option value="attendance">attendance (Presensi)</option>
          </select>
        </div>
        <div>
          <label style="display: block; font-weight: 600; color: #334155; margin-bottom: 4px;">Aksi Operasi</label>
          <select class="feedback-form-select" id="tx-input-action">
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>
      </div>
    `;
  }
  return '';
}

function extractTxFormPayload(modId, root) {
  const p = {};
  if (modId === 'attendance') {
    p.name = root.querySelector('#tx-input-name')?.value || '';
    p.position = root.querySelector('#tx-input-position')?.value || '';
    p.time = root.querySelector('#tx-input-time')?.value || '';
    p.type = 'WORKER';
  } else if (modId === 'reception') {
    p.tahapan = root.querySelector('#tx-input-tahapan')?.value || 'Rubber Main Nursery';
    p.klon = root.querySelector('#tx-input-klon')?.value || 'PB 260';
    p.sumber = root.querySelector('#tx-input-sumber')?.value || '';
    p.qty = parseInt(root.querySelector('#tx-input-qty')?.value || 0) || 0;
  } else if (modId === 'seeding') {
    p.batchNo = root.querySelector('#tx-input-batchNo')?.value || 'Batch-01';
    p.bedengan = root.querySelector('#tx-input-bedengan')?.value || 'Bedengan 01';
    p.klonAwal = root.querySelector('#tx-input-klonAwal')?.value || 'GT 1';
    p.totalDisemai = parseInt(root.querySelector('#tx-input-totalDisemai')?.value || 0) || 0;
  } else if (modId === 'budding' || modId === 'regrafting') {
    p.batchNo = root.querySelector('#tx-input-batchNo')?.value || 'Batch-01';
    p.bedengan = root.querySelector('#tx-input-bedengan')?.value || 'Bedengan 01';
    p.klonEntres = root.querySelector('#tx-input-klonEntres')?.value || 'PB 260';
    p.klonRootstock = root.querySelector('#tx-input-klonRootstock')?.value || 'GT 1';
    p.jumlah = parseInt(root.querySelector('#tx-input-jumlah')?.value || 0) || 0;
    if (modId === 'regrafting') p.type = 'REGRAFTING';
  } else if (modId === 'inspection') {
    p.buddingDocNo = root.querySelector('#tx-input-buddingDocNo')?.value || '';
    p.batchNo = root.querySelector('#tx-input-batchNo')?.value || 'Batch-01';
    p.totalDiperiksa = parseInt(root.querySelector('#tx-input-totalDiperiksa')?.value || 0) || 0;
    p.jumlahJadi = parseInt(root.querySelector('#tx-input-jumlahJadi')?.value || 0) || 0;
    p.jumlahGagal = Math.max(0, p.totalDiperiksa - p.jumlahJadi);
    p.persenJadi = p.totalDiperiksa > 0 ? Math.round((p.jumlahJadi / p.totalDiperiksa) * 100) : 0;
  } else if (modId === 'selection') {
    p.batchNo = root.querySelector('#tx-input-batchNo')?.value || 'Batch-01';
    p.alasan = root.querySelector('#tx-input-alasan')?.value || 'MATI';
    p.klon = root.querySelector('#tx-input-klon')?.value || 'PB 260';
    p.jumlahAfkir = parseInt(root.querySelector('#tx-input-jumlahAfkir')?.value || 0) || 0;
  } else if (modId === 'syncQueue') {
    p.entity = root.querySelector('#tx-input-entity')?.value || 'receptions';
    p.action = root.querySelector('#tx-input-action')?.value || 'CREATE';
  }
  return p;
}

function generateNewDocNo(modId) {
  const num = Math.floor(Math.random() * 899 + 100);
  switch (modId) {
    case 'reception':
      return `RCV/2026/${num}`;
    case 'seeding':
      return `SEED/2026/${num}`;
    case 'budding':
      return `OKL/2026/${num}`;
    case 'inspection':
      return `INSP/2026/${num}`;
    case 'regrafting':
      return `OKL/REG/2026/${num}`;
    case 'selection':
      return `DEC-CUL/2026/${num}`;
    case 'attendance':
      return `ATT-${num}`;
    case 'syncQueue':
      return `SYNC-${num}`;
    default:
      return `DOC/2026/${num}`;
  }
}

async function injectTxDemoSample(modId) {
  const today = todayISO();
  const samples = {
    reception: [
      {
        id: 'RCV-001',
        docNo: 'RCV/2026/01',
        program: 'Program Nursery 2026 - Batch 1',
        tahapan: 'Rubber Main Nursery',
        jenis: 'Benih / Biji Kelatak',
        sumber: 'Supplier Bibit Jaya',
        klon: 'PB 260',
        qty: 10000,
        batchNo: 'Batch-01',
        tanggal: today,
        status: 'APPROVED'
      },
      {
        id: 'RCV-002',
        docNo: 'RCV/2026/02',
        program: 'Program Nursery 2026 - Batch 1',
        tahapan: 'Rubber Advance Planting Material',
        jenis: 'Bibit / Tanaman Muda',
        sumber: 'Divisi I Kebun Induk',
        klon: 'RRIM 600',
        qty: 2500,
        batchNo: 'Batch-APM-01',
        tanggal: today,
        status: 'APPROVED'
      }
    ],
    seeding: [
      {
        id: 'SEED-001',
        docNo: 'SEED/2026/01',
        program: 'Program Nursery 2026 - Batch 1',
        tahapan: 'Rubber Main Nursery',
        batchNo: 'Batch-01',
        bedengan: 'Bedengan 01',
        klonAwal: 'GT 1',
        totalDisemai: 9500,
        tanggal: today,
        status: 'COMPLETED'
      }
    ],
    budding: [
      {
        id: 'OKL-001',
        docNo: 'OKL/2026/01',
        program: 'Program Nursery 2026 - Batch 1',
        tahapan: 'Rubber Main Nursery',
        batchNo: 'Batch-01',
        bedengan: 'Bedengan 01',
        klonRootstock: 'GT 1',
        klonEntres: 'PB 260',
        jumlah: 4500,
        tanggal: today,
        status: 'COMPLETED'
      }
    ],
    inspection: [
      {
        id: 'INSP-001',
        docNo: 'INSP/2026/01',
        buddingDocNo: 'OKL/2026/01',
        batchNo: 'Batch-01',
        bedengan: 'Bedengan 01',
        totalDiperiksa: 4500,
        jumlahJadi: 4100,
        jumlahGagal: 400,
        persenJadi: 91,
        tanggal: today,
        status: 'VERIFIED'
      }
    ],
    regrafting: [
      {
        id: 'REG-001',
        docNo: 'OKL/REG/2026/01',
        type: 'REGRAFTING',
        batchNo: 'Batch-01',
        bedengan: 'Bedengan 01',
        klonRootstock: 'GT 1',
        klonEntres: 'PB 260',
        jumlah: 300,
        tanggal: today,
        status: 'SUBMITTED'
      }
    ],
    selection: [
      {
        id: 'CUL-001',
        docNo: 'DEC-CUL/2026/01',
        batchNo: 'Batch-01',
        bedengan: 'Bedengan 01',
        klon: 'PB 260',
        jumlahAfkir: 100,
        alasan: 'MATI',
        tanggal: today,
        status: 'APPROVED'
      }
    ],
    attendance: [
      {
        id: 'ATT-001',
        name: 'Wagiman',
        position: 'Mandor Semprot',
        type: 'SUPERVISOR',
        time: '06:55',
        status: 'HADIR',
        date: today
      },
      {
        id: 'ATT-002',
        name: 'Fadilah Yusuf Purba',
        position: 'Pekerja Bibitan',
        type: 'WORKER',
        time: '07:05',
        status: 'HADIR',
        date: today
      }
    ],
    syncQueue: [
      {
        id: 'SYNC-001',
        entity: 'receptions',
        recordId: 'RCV/2026/01',
        action: 'CREATE',
        status: 'SYNCED',
        createdAt: today
      }
    ]
  };

  const list = samples[modId] || [];
  if (list.length > 0) {
    saveTxList(modId, list);
  }
}
