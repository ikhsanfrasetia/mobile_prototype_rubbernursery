/**
 * js/data/info-center-baseline.js
 * Bundled offline fallback dataset untuk Pusat Informasi Aplikasi.
 * Terfokus eksklusif pada 5 Peran Operasional Pembibitan Resmi.
 * Terisolasi 100% dan bebas dependensi luar.
 */

export const INFO_CENTER_BASELINE = Object.freeze({
  "metadata": {
    "title": "Pusat Informasi & Alur Proses Aplikasi SIGMA Rubber Nursery",
    "version": "2.0.0-PROVEN",
    "lastUpdated": "2026-10-17",
    "auditedAgainst": "Commit baseline main (actual code verification)",
    "description": "Dokumentasi mandiri independen berfokus pada 5 peran operasional pembibitan: Mantri Bibitan, Asisten Bibitan, Asisten Divisi, Asisten Kepala, dan Pengurus Kebun.",
    "totalRoles": 5,
    "totalModules": 16
  },
  "roles": [
    {
      "id": "mantri-tanaman",
      "code": "MANTRI_TANAMAN",
      "name": "Mantri Bibitan",
      "position": "Mantri Bibitan",
      "category": "OPERATIONAL",
      "scopeType": "DIVISION",
      "desc": "Pelaksana operasional harian di lapangan pembibitan: pencatatan presensi pekerja, penerimaan benih kelatak, penyemaian dederan dan polybag, pelaksanaan okulasi, penyeleksian bibit, pemeliharaan kebun entres, dan perekaman aktivitas harian.",
      "sourceRef": "js/core/permissions.js#ROLES.MANTRI_TANAMAN",
      "verificationStatus": "CONFIRMED_ACTUAL",
      "capabilities": [
        "transaction:create",
        "transaction:edit-before-submit",
        "transaction:delete-before-submit",
        "transaction:review-own",
        "transaction:submit"
      ],
      "navigationContext": {
        "beranda": "Grid 9 Menu Operasional + 2 Tombol Aksi Bawah",
        "drawer": "Beranda, Riwayat Data, Simulasi Waktu, Sinkronisasi, Profil, Keluar",
        "bottomNav": "Tidak Ada"
      },
      "primaryModules": [
        "01-presensi",
        "02-penerimaan",
        "03-penyemaian",
        "04-okulasi",
        "05-pemeriksaan",
        "06-penyeleksian",
        "08-kebun-entres",
        "09-material",
        "10-pemeliharaan"
      ],
      "accessibleModules": [
        "01-presensi",
        "02-penerimaan",
        "03-penyemaian",
        "04-okulasi",
        "05-pemeriksaan",
        "06-penyeleksian",
        "07-pemusnahan",
        "08-kebun-entres",
        "09-material",
        "10-pemeliharaan",
        "11-permintaan",
        "12-pengeluaran",
        "13-verifikasi",
        "16-riwayat"
      ]
    },
    {
      "id": "asisten-bibitan",
      "code": "ASISTEN_BIBITAN",
      "name": "Asisten Bibitan",
      "position": "Asisten Pembibitan",
      "category": "SUPERVISORY",
      "scopeType": "DIVISION",
      "desc": "Penanggung jawab teknis operasional pembibitan: verifikasi gate transaksi harian Mantri, manajemen master bedengan dan master batch, penerbitan SPB dan pengeluaran bibit, serta monitoring kesehatan bibit dan laporan stok nursery.",
      "sourceRef": "js/core/permissions.js#ROLES.ASISTEN_BIBITAN",
      "verificationStatus": "CONFIRMED_ACTUAL",
      "capabilities": [
        "transaction:view-submitted",
        "transaction:open-detail",
        "transaction:correct-allowed-fields",
        "transaction:approve",
        "monitor:process"
      ],
      "navigationContext": {
        "beranda": "3 Menu Cards (Penerimaan, Permintaan, Pengeluaran)",
        "drawer": "Beranda, Group DATA MASTER (Master Bedengan, Master Batch), Sinkronisasi, Profil, Keluar",
        "bottomNav": "4 Tab Permanen (Beranda, Pemeriksaan, Verifikasi, Laporan)"
      },
      "primaryModules": [
        "12-pengeluaran",
        "13-verifikasi",
        "14-master",
        "15-laporan"
      ],
      "accessibleModules": [
        "01-presensi",
        "02-penerimaan",
        "03-penyemaian",
        "04-okulasi",
        "05-pemeriksaan",
        "06-penyeleksian",
        "07-pemusnahan",
        "08-kebun-entres",
        "11-permintaan",
        "12-pengeluaran",
        "13-verifikasi",
        "14-master",
        "15-laporan",
        "16-riwayat"
      ]
    },
    {
      "id": "asisten",
      "code": "ASISTEN",
      "name": "Asisten Divisi",
      "position": "Asisten Lapangan",
      "category": "OPERATIONAL",
      "scopeType": "DIVISION",
      "desc": "Pemohon bibit untuk kebutuhan penanaman di divisi/afdeling kebun: pengajuan permintaan bibit kebun sendiri, konfirmasi penerimaan bibit di titik dropping afdeling, dan monitoring alokasi bibitan.",
      "sourceRef": "js/core/permissions.js#ROLES.ASISTEN",
      "verificationStatus": "CONFIRMED_ACTUAL",
      "capabilities": [
        "transaction:view-submitted",
        "transaction:open-detail",
        "transaction:correct-allowed-fields",
        "transaction:approve",
        "monitor:process"
      ],
      "navigationContext": {
        "beranda": "2 Menu Cards (Penerimaan, Permintaan Kebun Sendiri)",
        "drawer": "Beranda, Riwayat Data, Sinkronisasi, Profil, Keluar",
        "bottomNav": "Tidak Ada"
      },
      "primaryModules": [
        "11-permintaan"
      ],
      "accessibleModules": [
        "02-penerimaan",
        "11-permintaan",
        "16-riwayat"
      ]
    },
    {
      "id": "askep",
      "code": "ASKEP",
      "name": "Asisten Kepala",
      "position": "Asisten Kepala",
      "category": "MANAGERIAL",
      "scopeType": "ESTATE",
      "desc": "Koordinator teknis dan operasional kebun tingkat estate: verifikasi dan disposisi alur penerimaan bibit kebun sepupu, pengawasan mutu bibitan, dan supervisi penyeleksian bibit sebelum disalurkan ke lapangan.",
      "sourceRef": "js/core/permissions.js#ROLES.ASKEP",
      "verificationStatus": "CONFIRMED_ACTUAL",
      "capabilities": [
        "transaction:view",
        "monitor:process",
        "approval:future"
      ],
      "navigationContext": {
        "beranda": "3 Menu Cards (Penerimaan, Permintaan, Pengeluaran)",
        "drawer": "Beranda, Riwayat Data, Sinkronisasi, Profil, Keluar",
        "bottomNav": "Tidak Ada"
      },
      "primaryModules": [
        "05-pemeriksaan",
        "11-permintaan"
      ],
      "accessibleModules": [
        "02-penerimaan",
        "05-pemeriksaan",
        "06-penyeleksian",
        "07-pemusnahan",
        "11-permintaan",
        "12-pengeluaran",
        "15-laporan",
        "16-riwayat"
      ]
    },
    {
      "id": "pengurus",
      "code": "PENGURUS",
      "name": "Pengurus Kebun",
      "position": "Pengurus Kebun",
      "category": "EXECUTIVE",
      "scopeType": "ESTATE",
      "desc": "Pimpinan tertinggi unit kebun (estate): otorisasi persetujuan permintaan bibit antar-kebun sepupu (inter-estate), otorisasi pengeluaran bibit resmi (SPB), dan konfirmasi penerimaan bibit resmi di kebun peminta.",
      "sourceRef": "js/core/permissions.js#ROLES.PENGURUS",
      "verificationStatus": "CONFIRMED_ACTUAL",
      "capabilities": [
        "transaction:view",
        "monitor:process",
        "approval:future"
      ],
      "navigationContext": {
        "beranda": "3 Menu Cards (Penerimaan, Permintaan, Pengeluaran) + Lonceng Notifikasi Interaktif",
        "drawer": "Beranda, Riwayat Data, Sinkronisasi, Profil, Keluar",
        "bottomNav": "Tidak Ada"
      },
      "primaryModules": [
        "02-penerimaan",
        "11-permintaan",
        "12-pengeluaran"
      ],
      "accessibleModules": [
        "02-penerimaan",
        "11-permintaan",
        "12-pengeluaran",
        "15-laporan",
        "16-riwayat"
      ]
    }
  ],
  "modules": [
    {
      "id": "01-presensi",
      "order": "01",
      "name": "Presensi Harian",
      "subtitle": "Presensi Mandiri Supervisor & Pekerja Nursery",
      "desc": "Pencatatan presensi kehadiran supervisor nursery melalui verifikasi biometrik wajah (Face ID) dengan fallback foto manual dan validasi koordinat GPS radius nursery, serta presensi harian pekerja borongan pembibitan.",
      "status": "Confirmed",
      "primaryRole": "Mantri Bibitan",
      "relatedRole": "Asisten Bibitan",
      "sourceRef": "js/modules/attendance/attendance-landing.js",
      "verificationStatus": "CONFIRMED_ACTUAL",
      "features": [
        {
          "id": "presensi-supervisor",
          "moduleId": "01-presensi",
          "name": "Presensi Supervisor",
          "desc": "Presensi mandiri supervisor nursery dengan verifikasi biometrik wajah otomatis, fallback foto manual, dan deteksi radius lokasi nursery (<200m).",
          "prototypeRoute": "/attendance/supervisor",
          "navigationSurface": "BERANDA_GRID",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "EXPLICIT_FLOW",
          "flowStatusLabel": "Alur Terdefinisi Penuh",
          "sourceRef": "js/modules/attendance/attendance-supervisor.js"
        },
        {
          "id": "presensi-pekerja",
          "moduleId": "01-presensi",
          "name": "Presensi Pekerja Bibitan",
          "desc": "Pencatatan dan konfirmasi daftar pekerja harian pembibitan yang aktif bekerja sebelum transaksi operasional dimulai.",
          "prototypeRoute": "/attendance/workers",
          "navigationSurface": "BERANDA_GRID",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "SEQUENTIAL_BASELINE",
          "flowStatusLabel": "Urutan Sekuensial",
          "sourceRef": "js/modules/attendance/attendance-workers.js"
        },
        {
          "id": "presensi-summary",
          "moduleId": "01-presensi",
          "name": "Ringkasan Presensi",
          "desc": "Tampilan rekapitulasi kehadiran supervisor dan jumlah pekerja nursery yang tercatat hadir hari ini.",
          "prototypeRoute": "/attendance/summary",
          "navigationSurface": "SUBMENU",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "SEQUENTIAL_BASELINE",
          "flowStatusLabel": "Urutan Sekuensial",
          "sourceRef": "js/modules/attendance/attendance-summary.js"
        }
      ]
    },
    {
      "id": "02-penerimaan",
      "order": "02",
      "name": "Penerimaan Material & Bibit",
      "subtitle": "Penerimaan Benih Kelatak, Bibit Kebun, dan Entres",
      "desc": "Pencatatan dan verifikasi dokumen penerimaan material pembibitan, meliputi penerimaan benih/biji kelatak bersertifikat (SIR), penerimaan bibit dari kebun sendiri, dan penerimaan kiriman bibit dari kebun sepupu.",
      "status": "Confirmed",
      "primaryRole": "Mantri Bibitan",
      "relatedRole": "Asisten Bibitan, Pengurus Kebun",
      "sourceRef": "js/modules/receipt/receipt-landing.js",
      "verificationStatus": "CONFIRMED_ACTUAL",
      "features": [
        {
          "id": "penerimaan-benih",
          "moduleId": "02-penerimaan",
          "name": "Penerimaan Benih / Biji Kelatak",
          "desc": "Pencatatan penerimaan biji kelatak karet bersertifikat dari balai benih/supplier dengan verifikasi Surat Izin Rilis (SIR), tonase, dan dokumentasi foto kemasan.",
          "prototypeRoute": "/reception/benih",
          "navigationSurface": "BERANDA_GRID",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "EXPLICIT_FLOW",
          "flowStatusLabel": "Alur Terdefinisi Penuh",
          "sourceRef": "js/modules/receipt/receipt-benih.js"
        },
        {
          "id": "penerimaan-kebun-sendiri",
          "moduleId": "02-penerimaan",
          "name": "Penerimaan Bibit - Kebun Sendiri",
          "desc": "Penerimaan mutasi bibit antar-afdeling internal kebun sendiri yang telah disetujui.",
          "prototypeRoute": "/reception",
          "navigationSurface": "BERANDA_GRID",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "SEQUENTIAL_BASELINE",
          "flowStatusLabel": "Urutan Sekuensial",
          "sourceRef": "js/modules/receipt/receipt-landing.js"
        },
        {
          "id": "penerimaan-kebun-sepupu",
          "moduleId": "02-penerimaan",
          "name": "Penerimaan Bibit - Kebun Sepupu",
          "desc": "Layar penerimaan multi-tahap bibit dari kebun sepupu: konfirmasi kedatangan oleh Pengurus, disposisi penanganan oleh Askep, dan verifikasi fisik kelayakan bibit oleh Asisten Lapangan.",
          "prototypeRoute": "/reception/kebun-sepupu",
          "navigationSurface": "BERANDA_GRID",
          "implementationStatus": "Tersedia & Fungsional (3.812 Baris Kode)",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "EXPLICIT_FLOW",
          "flowStatusLabel": "Alur Terdefinisi Penuh",
          "sourceRef": "js/modules/receipt/receipt-kebun-sepupu-landing.js"
        },
        {
          "id": "penerimaan-summary",
          "moduleId": "02-penerimaan",
          "name": "Ringkasan Penerimaan",
          "desc": "Rekapitulasi berkas penerimaan benih dan bibit beserta status audit trail.",
          "prototypeRoute": "/reception/summary",
          "navigationSurface": "SUBMENU",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "SEQUENTIAL_BASELINE",
          "flowStatusLabel": "Urutan Sekuensial",
          "sourceRef": "js/modules/receipt/receipt-summary.js"
        }
      ]
    },
    {
      "id": "03-penyemaian",
      "order": "03",
      "name": "Penyemaian & Pembibitan Awal",
      "subtitle": "Dederan Biji Kelatak & Pindah Semai Polybag",
      "desc": "Proses penyemaian biji kelatak ke bedengan dederan (germination bed), pemantauan perkecambahan, serta pemindahan kecambah yang bertunas sehat (pindah semai) ke polybag bedengan utama.",
      "status": "Confirmed",
      "primaryRole": "Mantri Bibitan",
      "relatedRole": "Asisten Bibitan",
      "sourceRef": "js/modules/seeding/seeding-landing.js",
      "verificationStatus": "CONFIRMED_ACTUAL",
      "features": [
        {
          "id": "dederan-benih",
          "moduleId": "03-penyemaian",
          "name": "Penyemaian ke Bedengan Dederan",
          "desc": "Pencatatan penaburan biji kelatak ke bedengan dederan, penentuan nomor batch dederan, kapasitas, dan tanggal deder.",
          "prototypeRoute": "/seeding/dederan/form",
          "navigationSurface": "SUBMENU",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "EXPLICIT_FLOW",
          "flowStatusLabel": "Alur Terdefinisi Penuh",
          "sourceRef": "js/modules/seeding/dederan-form.js"
        },
        {
          "id": "pindah-semai",
          "moduleId": "03-penyemaian",
          "name": "Pindah Semai ke Bedengan Polybag",
          "desc": "Pemindahan kecambah kelatak yang bertunas normal dari bedengan dederan ke bedengan polybag utama nursery.",
          "prototypeRoute": "/seeding/form",
          "navigationSurface": "BERANDA_GRID",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "EXPLICIT_FLOW",
          "flowStatusLabel": "Alur Terdefinisi Penuh",
          "sourceRef": "js/modules/seeding/seeding-form.js"
        },
        {
          "id": "dederan-inspeksi",
          "moduleId": "03-penyemaian",
          "name": "Inspeksi Bedengan Dederan",
          "desc": "Pemeriksaan daya kecambah pada bedengan dederan dan pencatatan biji busuk/tidak bertunas.",
          "prototypeRoute": "/seeding/dederan/inspection",
          "navigationSurface": "SUBMENU",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "SEQUENTIAL_BASELINE",
          "flowStatusLabel": "Urutan Sekuensial",
          "sourceRef": "js/modules/seeding/dederan-inspection-form.js"
        }
      ]
    },
    {
      "id": "04-okulasi",
      "order": "04",
      "name": "Okulasi & Regrafting",
      "subtitle": "Grafting Bibit Batang Bawah & Okulasi Ulang",
      "desc": "Pelaksanaan okulasi mata entres klon unggul ke batang bawah yang telah memenuhi syarat umur dan diameter stem, serta okulasi janda (regrafting) untuk bibit yang okulasi pertamanya tidak menempel.",
      "status": "Confirmed",
      "primaryRole": "Mantri Bibitan",
      "relatedRole": "Asisten Bibitan",
      "sourceRef": "js/modules/budding/budding-landing.js",
      "verificationStatus": "CONFIRMED_ACTUAL",
      "features": [
        {
          "id": "okulasi-grafting",
          "moduleId": "04-okulasi",
          "name": "Okulasi (Grafting)",
          "desc": "Pencatatan transaksi penempelan mata entres ke batang bawah pada bedengan tertentu, mencatat nama pengokulasi, klon entres, dan jumlah bibit.",
          "prototypeRoute": "/budding/grafting",
          "navigationSurface": "BERANDA_GRID",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "EXPLICIT_FLOW",
          "flowStatusLabel": "Alur Terdefinisi Penuh",
          "sourceRef": "js/modules/budding/budding-grafting.js"
        },
        {
          "id": "okulasi-regrafting",
          "moduleId": "04-okulasi",
          "name": "Okulasi Janda / Regrafting",
          "desc": "Penempelan ulang mata entres pada sisi berlawanan untuk batang bawah yang hasil okulasi pertamanya mati setelah evaluasi 21 hari.",
          "prototypeRoute": "/budding/regrafting",
          "navigationSurface": "SUBMENU",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "SEQUENTIAL_BASELINE",
          "flowStatusLabel": "Urutan Sekuensial",
          "sourceRef": "js/modules/budding/budding-regrafting.js"
        }
      ]
    },
    {
      "id": "05-pemeriksaan",
      "order": "05",
      "name": "Pemeriksaan & Evaluasi Okulasi",
      "subtitle": "Pemeriksaan Bertahap: Buka Ikatan, Potong, Tarik",
      "desc": "Pemeriksaan berkala keberhasilan okulasi (buka tali ikatan pada hari ke-21, potong pucuk/heading back, dan tarik okulasi) serta evaluasi visual pertumbuhan tunas entres.",
      "status": "Confirmed",
      "primaryRole": "Mantri Bibitan",
      "relatedRole": "Asisten Bibitan, Askep",
      "sourceRef": "js/modules/inspection/inspection-landing.js",
      "verificationStatus": "CONFIRMED_ACTUAL",
      "features": [
        {
          "id": "pemeriksaan-pra-okulasi",
          "moduleId": "05-pemeriksaan",
          "name": "Pemeriksaan Bertahap Okulasi",
          "desc": "Pencatatan pemeriksaan keberhasilan okulasi di bedengan: cek mata entres hijau/segar, buka plastik ikatan, potong batang bawah, dan tarik tunas.",
          "prototypeRoute": "/inspection/form",
          "navigationSurface": "BERANDA_GRID",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "EXPLICIT_FLOW",
          "flowStatusLabel": "Alur Terdefinisi Penuh",
          "sourceRef": "js/modules/inspection/inspection-form.js"
        },
        {
          "id": "pemeriksaan-asb-summary",
          "moduleId": "05-pemeriksaan",
          "name": "Dashboard Pemeriksaan Asisten Bibitan",
          "desc": "Ringkasan hasil inspeksi bedengan dan persentase keberhasilan grafting/regrafting untuk evaluasi Asisten Bibitan.",
          "prototypeRoute": "/inspection",
          "navigationSurface": "BOTTOM_NAV",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "SEQUENTIAL_BASELINE",
          "flowStatusLabel": "Urutan Sekuensial",
          "sourceRef": "js/modules/inspection/inspection-landing.js"
        }
      ]
    },
    {
      "id": "06-penyeleksian",
      "order": "06",
      "name": "Penyeleksian Bibit",
      "subtitle": "Seleksi Mutu Bibitan Tahap 1, 2, 3 & Siap Tanam",
      "desc": "Sortir dan penyeleksian mutu bibitan secara bertahap untuk memisahkan bibit prima (eligible okulasi / siap salur) dari bibit afkir (abnormal, kerdil, terserang penyakit).",
      "status": "Confirmed",
      "primaryRole": "Mantri Bibitan",
      "relatedRole": "Asisten Bibitan",
      "sourceRef": "js/modules/selection/selection-landing.js",
      "verificationStatus": "CONFIRMED_ACTUAL",
      "features": [
        {
          "id": "seleksi-batch",
          "moduleId": "06-penyeleksian",
          "name": "Seleksi Mutu Batch Bibitan",
          "desc": "Pencatatan seleksi berkala (Tahap I, II, III Pra-Okulasi) pada populasi batch bibit. Dokumen Seleksi III Final menjadi prasyarat mutlak untuk membuka form Okulasi.",
          "prototypeRoute": "/selection",
          "navigationSurface": "BERANDA_GRID",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "EXPLICIT_FLOW",
          "flowStatusLabel": "Alur Terdefinisi Penuh",
          "sourceRef": "js/modules/selection/selection-landing.js"
        }
      ]
    },
    {
      "id": "07-pemusnahan",
      "order": "07",
      "name": "Pemusnahan Bibit (Culling)",
      "subtitle": "Pemusnahan & Pengurangan Stok Bibit Afkir",
      "desc": "Pencatatan pemusnahan bibit afkir hasil penyeleksian (culling) yang tidak layak tanam dan pemotongan stok pada master bedengan.",
      "status": "Confirmed",
      "primaryRole": "Asisten Bibitan",
      "relatedRole": "Mantri Bibitan, Pengurus",
      "sourceRef": "js/modules/destruction/destruction-landing.js",
      "verificationStatus": "CONFIRMED_ACTUAL",
      "features": [
        {
          "id": "pemusnahan-bibit",
          "moduleId": "07-pemusnahan",
          "name": "Pemusnahan Bibit Afkir",
          "desc": "Pembuatan berita acara pemusnahan bibit abnormal/afkir dengan dokumentasi foto dan persetujuan pengurus.",
          "prototypeRoute": "/destruction",
          "navigationSurface": "DRAWER",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "SEQUENTIAL_BASELINE",
          "flowStatusLabel": "Urutan Sekuensial",
          "sourceRef": "js/modules/destruction/destruction-landing.js"
        }
      ]
    },
    {
      "id": "08-kebun-entres",
      "order": "08",
      "name": "Kebun Entres & Panen Mata",
      "subtitle": "Pemeliharaan Plot Entres & Pemanenan Mata Okulasi",
      "desc": "Manajemen dan perawatan plot kebun kayu entres klon murni: kegiatan menunas (pruning tunas liar), topping tajuk pohon entres, serta pemanenan tangkai dan mata entres untuk persediaan okulasi.",
      "status": "Confirmed",
      "primaryRole": "Mantri Bibitan",
      "relatedRole": "Asisten Bibitan",
      "sourceRef": "js/modules/entres/entres-landing.js",
      "verificationStatus": "CONFIRMED_ACTUAL",
      "features": [
        {
          "id": "entres-menunas",
          "moduleId": "08-kebun-entres",
          "name": "Menunas Plot Entres",
          "desc": "Pencatatan pekerjaan sanitasi penunasan tunas liar pada pohon entres per blok/klon.",
          "prototypeRoute": "/entres/menunas",
          "navigationSurface": "BERANDA_GRID",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "EXPLICIT_FLOW",
          "flowStatusLabel": "Alur Terdefinisi Penuh",
          "sourceRef": "js/modules/entres/menunas-scan.js"
        },
        {
          "id": "entres-topping",
          "moduleId": "08-kebun-entres",
          "name": "Topping Plot Entres",
          "desc": "Pencatatan pemangkasan tajuk (topping) pohon entres untuk merangsang pertumbuhan tunas okulasi baru.",
          "prototypeRoute": "/entres/topping",
          "navigationSurface": "SUBMENU",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "EXPLICIT_FLOW",
          "flowStatusLabel": "Alur Terdefinisi Penuh",
          "sourceRef": "js/modules/entres/topping-scan.js"
        },
        {
          "id": "entres-stok",
          "moduleId": "08-kebun-entres",
          "name": "Stok & Mutasi Mata Entres",
          "desc": "Monitoring stok batang dan mata entres yang siap dipanen dan digunakan untuk pembibitan.",
          "prototypeRoute": "/entres/stock",
          "navigationSurface": "SUBMENU",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "SEQUENTIAL_BASELINE",
          "flowStatusLabel": "Urutan Sekuensial",
          "sourceRef": "js/modules/entres/entres-stock-landing.js"
        }
      ]
    },
    {
      "id": "09-material",
      "order": "09",
      "name": "Material & Bahan Penolong",
      "subtitle": "Simulasi Gudang, Pemakaian Polybag & Pupuk",
      "desc": "Pencatatan kebutuhan dan mutasi pemakaian bahan operasional nursery (tanah, polybag, plastik okulasi, pupuk, dan pestisida) dengan validasi stok gudang.",
      "status": "Confirmed",
      "primaryRole": "Mantri Bibitan",
      "relatedRole": "Asisten Bibitan",
      "sourceRef": "js/modules/master/material-master.js",
      "verificationStatus": "CONFIRMED_ACTUAL",
      "features": [
        {
          "id": "material-master",
          "moduleId": "09-material",
          "name": "Material Master & Simulasi Issue Gudang",
          "desc": "Pencocokan pemakaian material operasional terhadap bon pengeluaran barang gudang.",
          "prototypeRoute": "/material",
          "navigationSurface": "BERANDA_GRID",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "SEQUENTIAL_BASELINE",
          "flowStatusLabel": "Urutan Sekuensial",
          "sourceRef": "js/modules/master/material-master.js"
        }
      ]
    },
    {
      "id": "10-pemeliharaan",
      "order": "10",
      "name": "Pemeliharaan & Mandoran",
      "subtitle": "Aktivitas Perawatan Bibitan & Rekap Potong Jam",
      "desc": "Pencatatan aktivitas pemeliharaan nursery (penyiraman, pemupukan, semprot hama) dan konsolidasi borongan jam kerja mandoran beserta potong jam harian.",
      "status": "Confirmed",
      "primaryRole": "Mantri Bibitan",
      "relatedRole": "Asisten Bibitan",
      "sourceRef": "js/modules/maintenance/nursery-activity.js",
      "verificationStatus": "CONFIRMED_ACTUAL",
      "features": [
        {
          "id": "pemeliharaan-kegiatan",
          "moduleId": "10-pemeliharaan",
          "name": "Rekam Aktivitas Pemeliharaan",
          "desc": "Pencatatan jenis pekerjaan perawatan bibitan, bedengan target, volume kerja, dan mandoran yang bertugas.",
          "prototypeRoute": "/nursery-activity/form",
          "navigationSurface": "BERANDA_GRID",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "EXPLICIT_FLOW",
          "flowStatusLabel": "Alur Terdefinisi Penuh",
          "sourceRef": "js/modules/maintenance/nursery-activity.js"
        },
        {
          "id": "mandoran-konsolidasi",
          "moduleId": "10-pemeliharaan",
          "name": "Konsolidasi Mandoran & Potong Jam",
          "desc": "Rekapitulasi jam kerja efektif kelompok mandoran pembibitan dan penyesuaian potong jam kerja.",
          "prototypeRoute": "/nursery-activity/consolidation",
          "navigationSurface": "BERANDA_BOTTOM_BTN",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "EXPLICIT_FLOW",
          "flowStatusLabel": "Alur Terdefinisi Penuh",
          "sourceRef": "js/modules/maintenance/mandoran-consolidation.js"
        }
      ]
    },
    {
      "id": "11-permintaan",
      "order": "11",
      "name": "Permintaan Bibit & Entres",
      "subtitle": "Permintaan Kebun Sendiri, Kebun Sepupu, & Mata Entres",
      "desc": "Modul pemicu utama (trigger) siklus penyaluran bibit: pengajuan permintaan bibit untuk divisi internal, permintaan antar-kebun sepupu (inter-estate), dan permohonan alokasi mata entres.",
      "status": "Confirmed",
      "primaryRole": "Asisten Divisi",
      "relatedRole": "Pengurus Kebun, Asisten Bibitan, Askep",
      "sourceRef": "js/modules/request/request-landing.js",
      "verificationStatus": "CONFIRMED_ACTUAL",
      "features": [
        {
          "id": "permintaan-kebun-sendiri",
          "moduleId": "11-permintaan",
          "name": "Permintaan Bibit - Kebun Sendiri",
          "desc": "Pengajuan permintaan alokasi bibit oleh Asisten Divisi/Afdeling untuk rencana tanam internal kebun.",
          "prototypeRoute": "/request/kebun-sendiri",
          "navigationSurface": "BERANDA_GRID",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "EXPLICIT_FLOW",
          "flowStatusLabel": "Alur Terdefinisi Penuh",
          "sourceRef": "js/modules/request/request-kebun-sendiri-landing.js"
        },
        {
          "id": "permintaan-kebun-sepupu",
          "moduleId": "11-permintaan",
          "name": "Permintaan Bibit - Kebun Sepupu",
          "desc": "Alur permohonan bibit antar-estate kebun: persetujuan Pengurus Kebun Peminta, verifikasi stok oleh Asisten Bibitan, dan otorisasi Pengurus Kebun Induk.",
          "prototypeRoute": "/request/kebun-sepupu",
          "navigationSurface": "BERANDA_GRID",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "EXPLICIT_FLOW",
          "flowStatusLabel": "Alur Terdefinisi Penuh",
          "sourceRef": "js/modules/request/request-kebun-sepupu-landing.js"
        },
        {
          "id": "permintaan-mata-entres",
          "moduleId": "11-permintaan",
          "name": "Permintaan Mata Entres",
          "desc": "Permohonan alokasi tangkai/mata entres klon tertentu dari kebun entres pusat.",
          "prototypeRoute": "/request/mata-entres",
          "navigationSurface": "BERANDA_GRID",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "EXPLICIT_FLOW",
          "flowStatusLabel": "Alur Terdefinisi Penuh",
          "sourceRef": "js/modules/request/request-mata-entres-landing.js"
        }
      ]
    },
    {
      "id": "12-pengeluaran",
      "order": "12",
      "name": "Pengeluaran & Dispatch Bibit",
      "subtitle": "Penerbitan Surat Pengeluaran Bibit (SPB) & Pengiriman",
      "desc": "Proses pemotongan stok bibit di bedengan nursery, validasi barcode batch, penerbitan Surat Pengeluaran Bibit (SPB), dan pencatatan nomor kendaraan pengangkut.",
      "status": "Confirmed",
      "primaryRole": "Asisten Bibitan",
      "relatedRole": "Pengurus Kebun",
      "sourceRef": "js/modules/dispatch/dispatch-landing.js",
      "verificationStatus": "CONFIRMED_ACTUAL",
      "features": [
        {
          "id": "pengeluaran-bibit",
          "moduleId": "12-pengeluaran",
          "name": "Pengeluaran Bibit (SPB)",
          "desc": "Eksekusi pengeluaran bibit berdasarkan permintaan yang telah disetujui, validasi muat kendaraan, dan cetak SPB resmi.",
          "prototypeRoute": "/dispatch",
          "navigationSurface": "BERANDA_GRID",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "EXPLICIT_FLOW",
          "flowStatusLabel": "Alur Terdefinisi Penuh",
          "sourceRef": "js/modules/dispatch/dispatch-landing.js"
        },
        {
          "id": "pengeluaran-report",
          "moduleId": "12-pengeluaran",
          "name": "Laporan Pengeluaran Bibit",
          "desc": "Rekapitulasi berkas SPB dan mutasi fisik bibit yang telah diberangkatkan dari nursery.",
          "prototypeRoute": "/dispatch/report",
          "navigationSurface": "SUBMENU",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "SEQUENTIAL_BASELINE",
          "flowStatusLabel": "Urutan Sekuensial",
          "sourceRef": "js/modules/dispatch/dispatch-report.js"
        }
      ]
    },
    {
      "id": "13-verifikasi",
      "order": "13",
      "name": "Verifikasi & Otorisasi Transaksi",
      "subtitle": "Konfirmasi Harian Mantri & Gate Asisten Bibitan",
      "desc": "Sistem pengawasan dan kontrol mutu harian: konfirmasi paket transaksi oleh Mantri, verifikasi gate oleh Asisten Bibitan, serta deteksi transaksi kedaluwarsa (overdue > 2x24 jam).",
      "status": "Confirmed",
      "primaryRole": "Asisten Bibitan",
      "relatedRole": "Mantri Bibitan, Askep",
      "sourceRef": "js/modules/verification/verification-landing.js",
      "verificationStatus": "CONFIRMED_ACTUAL",
      "features": [
        {
          "id": "konfirmasi-mantri",
          "moduleId": "13-verifikasi",
          "name": "Konfirmasi Transaksi Harian Mantri",
          "desc": "Pemeriksaan dan pengajuan bundle transaksi operasional harian yang dibuat Mantri sebelum diserahkan ke Asisten Bibitan.",
          "prototypeRoute": "/mantri-confirmation",
          "navigationSurface": "BERANDA_BOTTOM_BTN",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "EXPLICIT_FLOW",
          "flowStatusLabel": "Alur Terdefinisi Penuh",
          "sourceRef": "js/modules/verification/mantri-confirmation-landing.js"
        },
        {
          "id": "verifikasi-asb-gate",
          "moduleId": "13-verifikasi",
          "name": "Verifikasi Gate Asisten Bibitan",
          "desc": "Evaluasi, persetujuan resmi (approval), atau pengembalian revisi atas seluruh transaksi pembibitan oleh Asisten Bibitan.",
          "prototypeRoute": "/verification",
          "navigationSurface": "BOTTOM_NAV",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "EXPLICIT_FLOW",
          "flowStatusLabel": "Alur Terdefinisi Penuh",
          "sourceRef": "js/modules/verification/verification-landing.js"
        },
        {
          "id": "verifikasi-overdue",
          "moduleId": "13-verifikasi",
          "name": "Monitoring Transaksi Overdue",
          "desc": "Pemantauan dokumen transaksi yang belum diverifikasi melewati batas waktu 2x24 jam.",
          "prototypeRoute": "/mantri-confirmation/overdue",
          "navigationSurface": "SUBMENU",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "SEQUENTIAL_BASELINE",
          "flowStatusLabel": "Urutan Sekuensial",
          "sourceRef": "js/modules/verification/mantri-overdue-landing.js"
        }
      ]
    },
    {
      "id": "14-master",
      "order": "14",
      "name": "Data Master Pembibitan",
      "subtitle": "Master Bedengan & Master Batch Nursery",
      "desc": "Manajemen data referensi fisik nursery: registrasi bedengan, kapasitas maksimal, status blok tanah, serta registrasi batch bibit karet dan klon.",
      "status": "Confirmed",
      "primaryRole": "Asisten Bibitan",
      "relatedRole": "Mantri Bibitan",
      "sourceRef": "js/core/menu-registry.js#ASISTEN_BIBITAN_DATA_MASTER_MENUS",
      "verificationStatus": "CONFIRMED_ACTUAL",
      "features": [
        {
          "id": "master-bedengan",
          "moduleId": "14-master",
          "name": "Master Bedengan",
          "desc": "Pengelolaan daftar bedengan aktif, blok lokasi, tipe bedengan (dederan / polybag), dan kapasitas tampung.",
          "prototypeRoute": "/master/bedengan",
          "navigationSurface": "DRAWER",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "SEQUENTIAL_BASELINE",
          "flowStatusLabel": "Urutan Sekuensial",
          "sourceRef": "js/modules/master/master-bedengan.js"
        },
        {
          "id": "master-batch",
          "moduleId": "14-master",
          "name": "Master Batch Bibit",
          "desc": "Registrasi kode batch bibitan, tahun tanam, sumber klon benih, dan silsilah mutasi.",
          "prototypeRoute": "/master/batch",
          "navigationSurface": "DRAWER",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "SEQUENTIAL_BASELINE",
          "flowStatusLabel": "Urutan Sekuensial",
          "sourceRef": "js/modules/master/master-batch.js"
        }
      ]
    },
    {
      "id": "15-laporan",
      "order": "15",
      "name": "Laporan & Monitoring",
      "subtitle": "Laporan Stok Nursery & Dokumen Dikembalikan",
      "desc": "Penyajian laporan konsolidasi posisi stok bibit per bedengan/klon dan rekap dokumen transaksi yang mendapat catatan revisi dari pimpinan.",
      "status": "Confirmed",
      "primaryRole": "Asisten Bibitan",
      "relatedRole": "Askep, Pengurus Kebun",
      "sourceRef": "js/modules/reports/reports-landing.js",
      "verificationStatus": "CONFIRMED_ACTUAL",
      "features": [
        {
          "id": "laporan-stok",
          "moduleId": "15-laporan",
          "name": "Laporan Stok Bibit Nursery",
          "desc": "Penyajian rekapitulasi jumlah bibit hidup, persentase keberhasilan okulasi, dan bibit siap salur per kelompok bedengan.",
          "prototypeRoute": "/reports/stock",
          "navigationSurface": "BOTTOM_NAV",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "SEQUENTIAL_BASELINE",
          "flowStatusLabel": "Urutan Sekuensial",
          "sourceRef": "js/modules/reports/nursery-stock-report.js"
        },
        {
          "id": "laporan-dokumen-kembali",
          "moduleId": "15-laporan",
          "name": "Laporan Dokumen Dikembalikan (Revisi)",
          "desc": "Daftar berkas transaksi yang dikembalikan oleh Asisten Bibitan atau Pengurus untuk diperbaiki oleh Mantri.",
          "prototypeRoute": "/reports/returned-docs",
          "navigationSurface": "SUBMENU",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "SEQUENTIAL_BASELINE",
          "flowStatusLabel": "Urutan Sekuensial",
          "sourceRef": "js/modules/reports/returned-documents-report.js"
        }
      ]
    },
    {
      "id": "16-riwayat",
      "order": "16",
      "name": "Riwayat Data & Transaksi",
      "subtitle": "Audit Trail & Sinkronisasi Offline",
      "desc": "Pencatatan rekam jejak (audit log) perubahan data transaksi per pengguna serta pengelolaan antrean sinkronisasi lokal (IndexedDB) ke server.",
      "status": "Confirmed",
      "primaryRole": "5 Peran Operasional",
      "relatedRole": "Mantri, Asisten, Askep, Pengurus",
      "sourceRef": "js/modules/history/nursery-history.js",
      "verificationStatus": "CONFIRMED_ACTUAL",
      "features": [
        {
          "id": "riwayat-transaksi",
          "moduleId": "16-riwayat",
          "name": "Log Riwayat Transaksi",
          "desc": "Audit trail kronologis per transaksi: pencatat, waktu, status, dan riwayat revisi.",
          "prototypeRoute": "/history",
          "navigationSurface": "DRAWER",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "SEQUENTIAL_BASELINE",
          "flowStatusLabel": "Urutan Sekuensial",
          "sourceRef": "js/modules/history/nursery-history.js"
        },
        {
          "id": "transaction-manager",
          "moduleId": "16-riwayat",
          "name": "Transaction Manager",
          "desc": "Manajemen transaksi lokal dan sinkronisasi data antar-perangkat.",
          "prototypeRoute": "/transactions",
          "navigationSurface": "SUBMENU",
          "implementationStatus": "Tersedia & Fungsional",
          "qaStatus": "Tervalidasi di Layar HP",
          "flowStatus": "SEQUENTIAL_BASELINE",
          "flowStatusLabel": "Urutan Sekuensial",
          "sourceRef": "js/modules/transactions/transaction-manager.js"
        }
      ]
    }
  ],
  "flows": {
    "11-permintaan": {
      "permintaan-kebun-sepupu": {
        "title": "Flow Proses - Permintaan Bibit Antar-Kebun Sepupu (E2E)",
        "verificationStatus": "CONFIRMED_EXPLICIT",
        "sourceRef": "js/modules/request/request-kebun-sepupu-landing.js",
        "nodes": [
          {
            "id": "REQ_START",
            "code": "START",
            "title": "Pengajuan Permintaan Bibit",
            "type": "start",
            "role": "Asisten Divisi / Peminta",
            "route": "/request/kebun-sepupu/form",
            "sourceRef": "js/modules/request/request-kebun-sepupu-form.js"
          },
          {
            "id": "REQ_SUBMIT",
            "code": "P-001",
            "title": "Formulir Permintaan Disimpan (Status: DIAJUKAN)",
            "type": "process",
            "role": "Asisten Divisi / Peminta",
            "route": "/request/kebun-sepupu",
            "sourceRef": "js/modules/request/request-kebun-sepupu-landing.js:320"
          },
          {
            "id": "REQ_APPROVE_PENGURUS_PEMINTA",
            "code": "P-002",
            "title": "Persetujuan Pengurus Kebun Peminta (Status: MENUNGGU_VERIFIKASI_ASISTEN_BIBITAN)",
            "type": "process",
            "role": "Pengurus Kebun Sepupu",
            "route": "/request/kebun-sepupu",
            "sourceRef": "js/modules/request/request-kebun-sepupu-landing.js:1440"
          },
          {
            "id": "REQ_VERIFY_ASB",
            "code": "P-003",
            "title": "Verifikasi Kesiapan Stok & Batch Bedengan oleh Asisten Bibitan (Status: TERVERIFIKASI)",
            "type": "process",
            "role": "Asisten Bibitan",
            "route": "/request/kebun-sepupu",
            "sourceRef": "js/modules/request/request-kebun-sepupu-landing.js:1890"
          },
          {
            "id": "REQ_AUTHORIZE_PENGURUS_INDUK",
            "code": "P-004",
            "title": "Otorisasi Pengeluaran oleh Pengurus Kebun Induk (Status: DISETUJUI)",
            "type": "process",
            "role": "Pengurus Kebun",
            "route": "/request/kebun-sepupu",
            "sourceRef": "js/modules/request/request-kebun-sepupu-landing.js:2100"
          },
          {
            "id": "REQ_DISPATCH",
            "code": "P-005",
            "title": "Penerbitan SPB & Muat Bibit ke Kendaraan (Status: DIKELUARKAN)",
            "type": "process",
            "role": "Asisten Bibitan",
            "route": "/dispatch",
            "sourceRef": "js/modules/dispatch/dispatch-landing.js"
          },
          {
            "id": "REQ_RECEIVE",
            "code": "P-006",
            "title": "Konfirmasi Penerimaan Fisik di Kebun Tujuan (Status: SELESAI)",
            "type": "process",
            "role": "Pengurus Kebun Sepupu",
            "route": "/reception/kebun-sepupu",
            "sourceRef": "js/modules/receipt/receipt-kebun-sepupu-landing.js:680"
          },
          {
            "id": "REQ_END",
            "code": "END",
            "title": "Proses Selesai - Stok Berpindah Resmi",
            "type": "end",
            "role": "Sistem",
            "route": "/history",
            "sourceRef": "js/modules/history/nursery-history.js"
          }
        ],
        "edges": [
          {
            "id": "E_REQ_1",
            "from": "REQ_START",
            "to": "REQ_SUBMIT",
            "label": "Submit Dokumen",
            "sourceRef": "js/modules/request/request-kebun-sepupu-landing.js"
          },
          {
            "id": "E_REQ_2",
            "from": "REQ_SUBMIT",
            "to": "REQ_APPROVE_PENGURUS_PEMINTA",
            "label": "Notif Lonceng Pengurus",
            "sourceRef": "js/modules/request/request-kebun-sepupu-landing.js"
          },
          {
            "id": "E_REQ_3",
            "from": "REQ_APPROVE_PENGURUS_PEMINTA",
            "to": "REQ_VERIFY_ASB",
            "label": "Disposisi ke Nursery",
            "sourceRef": "js/modules/request/request-kebun-sepupu-landing.js"
          },
          {
            "id": "E_REQ_4",
            "from": "REQ_VERIFY_ASB",
            "to": "REQ_AUTHORIZE_PENGURUS_INDUK",
            "label": "Verifikasi Alokasi Batch",
            "sourceRef": "js/modules/request/request-kebun-sepupu-landing.js"
          },
          {
            "id": "E_REQ_5",
            "from": "REQ_AUTHORIZE_PENGURUS_INDUK",
            "to": "REQ_DISPATCH",
            "label": "Otorisasi Terbit",
            "sourceRef": "js/modules/dispatch/dispatch-landing.js"
          },
          {
            "id": "E_REQ_6",
            "from": "REQ_DISPATCH",
            "to": "REQ_RECEIVE",
            "label": "SPB & Angkut Truk",
            "sourceRef": "js/modules/receipt/receipt-kebun-sepupu-landing.js"
          },
          {
            "id": "E_REQ_7",
            "from": "REQ_RECEIVE",
            "to": "REQ_END",
            "label": "Verifikasi Fisik Cocok",
            "sourceRef": "js/modules/receipt/receipt-kebun-sepupu-landing.js"
          }
        ]
      }
    },
    "01-presensi": {
      "presensi-supervisor": {
        "title": "Flow Proses - Presensi Mandiri Supervisor",
        "verificationStatus": "CONFIRMED_EXPLICIT",
        "sourceRef": "js/modules/attendance/attendance-supervisor.js",
        "nodes": [
          {
            "id": "PRS_START",
            "code": "START",
            "title": "Buka Halaman Presensi",
            "type": "start",
            "role": "Mantri Bibitan",
            "route": "/attendance/supervisor",
            "sourceRef": "js/modules/attendance/attendance-supervisor.js"
          },
          {
            "id": "PRS_CAMERA",
            "code": "P-001",
            "title": "Verifikasi Wajah Biometrik (Face ID)",
            "type": "process",
            "role": "Mantri Bibitan",
            "route": "/attendance/supervisor",
            "sourceRef": "js/modules/attendance/attendance-supervisor.js"
          },
          {
            "id": "PRS_GPS",
            "code": "P-002",
            "title": "Validasi Radius GPS Nursery (<200m)",
            "type": "process",
            "role": "Mantri Bibitan",
            "route": "/attendance/supervisor",
            "sourceRef": "js/modules/attendance/attendance-supervisor.js"
          },
          {
            "id": "PRS_RESULT",
            "code": "P-003",
            "title": "Presensi Sukses & Catat Jam Masuk",
            "type": "process",
            "role": "Mantri Bibitan",
            "route": "/attendance/supervisor/result",
            "sourceRef": "js/modules/attendance/attendance-supervisor-result.js"
          },
          {
            "id": "PRS_END",
            "code": "END",
            "title": "Hak Input Transaksi Harian Aktif",
            "type": "end",
            "role": "Mantri Bibitan",
            "route": "/home",
            "sourceRef": "js/modules/dashboard/beranda.js"
          }
        ],
        "edges": [
          {
            "id": "E_PRS_1",
            "from": "PRS_START",
            "to": "PRS_CAMERA",
            "label": "Aktifkan Kamera",
            "sourceRef": "js/modules/attendance/attendance-supervisor.js"
          },
          {
            "id": "E_PRS_2",
            "from": "PRS_CAMERA",
            "to": "PRS_GPS",
            "label": "Wajah Terdeteksi",
            "sourceRef": "js/modules/attendance/attendance-supervisor.js"
          },
          {
            "id": "E_PRS_3",
            "from": "PRS_GPS",
            "to": "PRS_RESULT",
            "label": "Dalam Radius",
            "sourceRef": "js/modules/attendance/attendance-supervisor.js"
          },
          {
            "id": "E_PRS_4",
            "from": "PRS_RESULT",
            "to": "PRS_END",
            "label": "Lanjut ke Beranda",
            "sourceRef": "js/modules/attendance/attendance-supervisor-result.js"
          }
        ]
      }
    },
    "03-penyemaian": {
      "pindah-semai": {
        "title": "Flow Proses - Pindah Semai Dederan ke Polybag",
        "verificationStatus": "CONFIRMED_EXPLICIT",
        "sourceRef": "js/modules/seeding/seeding-form.js",
        "nodes": [
          {
            "id": "SEM_START",
            "code": "START",
            "title": "Pilih Bedengan Dederan Asal",
            "type": "start",
            "role": "Mantri Bibitan",
            "route": "/seeding/form",
            "sourceRef": "js/modules/seeding/seeding-form.js"
          },
          {
            "id": "SEM_SELECT",
            "code": "P-001",
            "title": "Seleksi Kecambah Normal (Akar & Plumula Sehat)",
            "type": "process",
            "role": "Mantri Bibitan",
            "route": "/seeding/form",
            "sourceRef": "js/modules/seeding/seeding-form.js"
          },
          {
            "id": "SEM_BEDENGAN",
            "code": "P-002",
            "title": "Alokasi ke Bedengan Polybag Tujuan",
            "type": "process",
            "role": "Mantri Bibitan",
            "route": "/seeding/form",
            "sourceRef": "js/modules/seeding/seeding-form.js"
          },
          {
            "id": "SEM_SUBMIT",
            "code": "P-003",
            "title": "Simpan Transaksi Pindah Semai",
            "type": "process",
            "role": "Mantri Bibitan",
            "route": "/seeding/form",
            "sourceRef": "js/modules/seeding/seeding-form.js"
          },
          {
            "id": "SEM_END",
            "code": "END",
            "title": "Populasi Bedengan Polybag Bertambah",
            "type": "end",
            "role": "Mantri Bibitan",
            "route": "/home",
            "sourceRef": "js/modules/seeding/seeding-form.js"
          }
        ],
        "edges": [
          {
            "id": "E_SEM_1",
            "from": "SEM_START",
            "to": "SEM_SELECT",
            "label": "Hitung Kecambah Eligible",
            "sourceRef": "js/modules/seeding/seeding-form.js"
          },
          {
            "id": "E_SEM_2",
            "from": "SEM_SELECT",
            "to": "SEM_BEDENGAN",
            "label": "Scan Barcode Bedengan",
            "sourceRef": "js/modules/seeding/seeding-form.js"
          },
          {
            "id": "E_SEM_3",
            "from": "SEM_BEDENGAN",
            "to": "SEM_SUBMIT",
            "label": "Input Jumlah Tanam",
            "sourceRef": "js/modules/seeding/seeding-form.js"
          },
          {
            "id": "E_SEM_4",
            "from": "SEM_SUBMIT",
            "to": "SEM_END",
            "label": "Update Stok Bedengan",
            "sourceRef": "js/modules/seeding/seeding-form.js"
          }
        ]
      }
    },
    "04-okulasi": {
      "okulasi-grafting": {
        "title": "Flow Proses - Okulasi (Grafting)",
        "verificationStatus": "CONFIRMED_EXPLICIT",
        "sourceRef": "js/modules/budding/budding-grafting.js",
        "nodes": [
          {
            "id": "BUD_START",
            "code": "START",
            "title": "Cek Prasyarat Seleksi III Final DISETUJUI",
            "type": "start",
            "role": "Mantri Bibitan",
            "route": "/budding/grafting",
            "sourceRef": "js/modules/budding/budding-grafting.js"
          },
          {
            "id": "BUD_ENTRES",
            "code": "P-001",
            "title": "Pilih Klon Mata Entres Tersedia",
            "type": "process",
            "role": "Mantri Bibitan",
            "route": "/budding/grafting",
            "sourceRef": "js/modules/budding/budding-grafting.js"
          },
          {
            "id": "BUD_OPERATOR",
            "code": "P-002",
            "title": "Input Pengokulasi & Jumlah Bibit Diokulasi",
            "type": "process",
            "role": "Mantri Bibitan",
            "route": "/budding/grafting/form",
            "sourceRef": "js/modules/budding/budding-form.js"
          },
          {
            "id": "BUD_SAVE",
            "code": "P-003",
            "title": "Simpan Transaksi Okulasi & Ikat Plastik",
            "type": "process",
            "role": "Mantri Bibitan",
            "route": "/budding/grafting",
            "sourceRef": "js/modules/budding/budding-grafting.js"
          },
          {
            "id": "BUD_END",
            "code": "END",
            "title": "Timer 21 Hari Pemeriksaan Buka Ikatan Dimulai",
            "type": "end",
            "role": "Mantri Bibitan",
            "route": "/inspection",
            "sourceRef": "js/modules/inspection/inspection-landing.js"
          }
        ],
        "edges": [
          {
            "id": "E_BUD_1",
            "from": "BUD_START",
            "to": "BUD_ENTRES",
            "label": "Batch Lulus Seleksi",
            "sourceRef": "js/modules/budding/budding-grafting.js"
          },
          {
            "id": "E_BUD_2",
            "from": "BUD_ENTRES",
            "to": "BUD_OPERATOR",
            "label": "Klon Sesuai Rencana",
            "sourceRef": "js/modules/budding/budding-grafting.js"
          },
          {
            "id": "E_BUD_3",
            "from": "BUD_OPERATOR",
            "to": "BUD_SAVE",
            "label": "Validasi Jumlah Stem",
            "sourceRef": "js/modules/budding/budding-form.js"
          },
          {
            "id": "E_BUD_4",
            "from": "BUD_SAVE",
            "to": "BUD_END",
            "label": "Status: MENUNGGU_PEMERIKSAAN",
            "sourceRef": "js/modules/budding/budding-grafting.js"
          }
        ]
      }
    },
    "13-verifikasi": {
      "verifikasi-asb-gate": {
        "title": "Flow Proses - Verifikasi & Otorisasi Transaksi Harian",
        "verificationStatus": "CONFIRMED_EXPLICIT",
        "sourceRef": "js/modules/verification/verification-landing.js",
        "nodes": [
          {
            "id": "VER_START",
            "code": "START",
            "title": "Mantri Mengajukan Bundle Transaksi Harian",
            "type": "start",
            "role": "Mantri Bibitan",
            "route": "/mantri-confirmation",
            "sourceRef": "js/modules/verification/mantri-confirmation-landing.js"
          },
          {
            "id": "VER_GATE",
            "code": "P-001",
            "title": "Asisten Bibitan Membuka Gate Validasi",
            "type": "process",
            "role": "Asisten Bibitan",
            "route": "/verification",
            "sourceRef": "js/modules/verification/verification-landing.js"
          },
          {
            "id": "VER_DECISION",
            "code": "P-002",
            "title": "Evaluasi: Setuju atau Kembalikan dengan Catatan",
            "type": "process",
            "role": "Asisten Bibitan",
            "route": "/verification",
            "sourceRef": "js/modules/verification/verification-landing.js"
          },
          {
            "id": "VER_APPROVED",
            "code": "P-003",
            "title": "Transaksi APPROVED: Mutasi Stok Resmi Dikunci",
            "type": "process",
            "role": "Asisten Bibitan",
            "route": "/verification",
            "sourceRef": "js/modules/verification/verification-manager.js"
          },
          {
            "id": "VER_END",
            "code": "END",
            "title": "Selesai - Masuk ke Laporan Stok Nursery",
            "type": "end",
            "role": "Asisten Bibitan",
            "route": "/reports/stock",
            "sourceRef": "js/modules/reports/nursery-stock-report.js"
          }
        ],
        "edges": [
          {
            "id": "E_VER_1",
            "from": "VER_START",
            "to": "VER_GATE",
            "label": "Submit Konfirmasi",
            "sourceRef": "js/modules/verification/mantri-confirmation-landing.js"
          },
          {
            "id": "E_VER_2",
            "from": "VER_GATE",
            "to": "VER_DECISION",
            "label": "Pemeriksaan Nilai Transaksi",
            "sourceRef": "js/modules/verification/verification-landing.js"
          },
          {
            "id": "E_VER_3",
            "from": "VER_DECISION",
            "to": "VER_APPROVED",
            "label": "Klik 'Setujui Transaksi'",
            "sourceRef": "js/modules/verification/verification-manager.js"
          },
          {
            "id": "E_VER_4",
            "from": "VER_APPROVED",
            "to": "VER_END",
            "label": "Lock Mutasi Batch",
            "sourceRef": "js/modules/verification/verification-manager.js"
          }
        ]
      }
    }
  },
  "businessRules": [
    {
      "id": "BR-01",
      "code": "SELECTION-GATE-GRAFTING",
      "title": "Prasyarat Seleksi III Final untuk Okulasi",
      "category": "KONTROL MUTU",
      "desc": "Transaksi Okulasi (Grafting) hanya dapat dibuka jika batch bibit telah memiliki Dokumen Seleksi III Pra-Okulasi berstatus DISETUJUI dan bertanda FINAL.",
      "sourceRef": "js/modules/dashboard/beranda.js:823-835",
      "verificationStatus": "CONFIRMED_CODE"
    },
    {
      "id": "BR-02",
      "code": "STRICT-ESTATE-ISOLATION",
      "title": "Isolasi Data Berdasarkan Estate Pengguna",
      "category": "KEAMANAN & AKSES",
      "desc": "Pengguna dengan lingkup ESTATE (Pengurus, Askep) hanya dapat melihat dan menyetujui transaksi dokumen yang terkait langsung dengan kode estate miliknya.",
      "sourceRef": "js/core/transaction-actor.js:14-60",
      "verificationStatus": "CONFIRMED_CODE"
    },
    {
      "id": "BR-03",
      "code": "VERIFICATION-WINDOW-48H",
      "title": "Batas Waktu Verifikasi Transaksi Harian (2x24 Jam)",
      "category": "COMPLIANCE",
      "desc": "Transaksi harian yang diajukan oleh Mantri Bibitan wajib diverifikasi oleh Asisten Bibitan dalam batas waktu maksimal 48 jam sebelum masuk kategori OVERDUE.",
      "sourceRef": "js/modules/verification/mantri-overdue-landing.js",
      "verificationStatus": "CONFIRMED_CODE"
    },
    {
      "id": "BR-04",
      "code": "INTER-ESTATE-MULTI-TIER-APPROVAL",
      "title": "Persetujuan Bertingkat Permintaan Bibit Kebun Sepupu",
      "category": "OTORISASI",
      "desc": "Permintaan bibit antar-kebun sepupu wajib disetujui berturut-turut oleh Pengurus Kebun Peminta, diverifikasi ketersediaannya oleh Asisten Bibitan Kebun Induk, dan diotorisasi oleh Pengurus Kebun Induk sebelum SPB dapat diterbitkan.",
      "sourceRef": "js/modules/request/request-kebun-sepupu-landing.js",
      "verificationStatus": "CONFIRMED_CODE"
    },
    {
      "id": "BR-05",
      "code": "GPS-RADIUS-ATTENDANCE",
      "title": "Validasi Geofence Presensi Supervisor (<200 Meter)",
      "category": "OPERASIONAL",
      "desc": "Presensi mandiri supervisor nursery hanya diterima jika koordinat GPS perangkat berada dalam radius toleransi maksimal 200 meter dari titik pusat pembibitan.",
      "sourceRef": "js/modules/attendance/attendance-supervisor.js",
      "verificationStatus": "CONFIRMED_CODE"
    }
  ],
  "requirements": [
    {
      "id": "KF-PRS-001",
      "moduleId": "01-presensi",
      "featureId": "presensi-supervisor",
      "title": "Verifikasi Biometrik Wajah dan Lokasi Presensi Supervisor",
      "role": "Mantri Bibitan",
      "type": "KF",
      "status": "Confirmed",
      "input": "Foto kamera depan perangkat, koordinat latitude/longitude GPS",
      "validation": "Deteksi wajah valid, radius lokasi <= 200m dari koordinat nursery",
      "output": "Catatan presensi supervisor berstatus HADIR dengan timestamp akurat",
      "sourceRef": "js/modules/attendance/attendance-supervisor.js",
      "verificationStatus": "CONFIRMED_CODE"
    },
    {
      "id": "KF-RCV-001",
      "moduleId": "02-penerimaan",
      "featureId": "penerimaan-kebun-sepupu",
      "title": "Penerimaan dan Konfirmasi Kedatangan Bibit Kebun Sepupu",
      "role": "Pengurus Kebun",
      "type": "KF",
      "status": "Confirmed",
      "input": "Nomor SPB pengirim, jumlah bibit diterima, foto kondisi fisik",
      "validation": "Kesesuaian nomor SPB pengirim dengan data dispatch kebun asal",
      "output": "Dokumen penerimaan terkonfirmasi, status berubah menjadi SELESAI",
      "sourceRef": "js/modules/receipt/receipt-kebun-sepupu-landing.js",
      "verificationStatus": "CONFIRMED_CODE"
    },
    {
      "id": "KF-REQ-001",
      "moduleId": "11-permintaan",
      "featureId": "permintaan-kebun-sepupu",
      "title": "Pengajuan dan Disposisi Permintaan Bibit Antar-Kebun",
      "role": "Asisten Divisi / Pengurus",
      "type": "KF",
      "status": "Confirmed",
      "input": "Estate pemohon, kebun tujuan, klon diminta, jumlah bibit, jadwal tanam",
      "validation": "Klon terdaftar pada master batch dan volume tidak melebihi alokasi",
      "output": "Nomor dokumen permintaan resmi (NIR) berstatus DIAJUKAN",
      "sourceRef": "js/modules/request/request-kebun-sepupu-landing.js",
      "verificationStatus": "CONFIRMED_CODE"
    },
    {
      "id": "KF-VER-001",
      "moduleId": "13-verifikasi",
      "featureId": "verifikasi-asb-gate",
      "title": "Gate Otorisasi dan Persetujuan Transaksi Harian Asisten Bibitan",
      "role": "Asisten Bibitan",
      "type": "KF",
      "status": "Confirmed",
      "input": "Bundle transaksi harian Mantri yang diajukan",
      "validation": "Tidak ada data minus, batch terdaftar, dan pekerjaan tuntas",
      "output": "Status transaksi berubah menjadi APPROVED / DIKEMBALIKAN",
      "sourceRef": "js/modules/verification/verification-landing.js",
      "verificationStatus": "CONFIRMED_CODE"
    }
  ],
  "nonFunctionalRequirements": [
    {
      "id": "KNF-OFFLINE-01",
      "title": "Dukungan Penuh Operasional Offline-First",
      "category": "RELIABILITY",
      "acceptance": "Aplikasi tetap dapat digunakan mencatat presensi dan transaksi pembibitan di tengah kebun tanpa koneksi internet dengan penyimpanan lokal IndexedDB.",
      "sourceRef": "js/app.js:88-95",
      "verificationStatus": "CONFIRMED_CODE"
    },
    {
      "id": "KNF-RESPONSIVE-02",
      "title": "Desain Antarmuka Khusus Layar Ponsel Lapangan",
      "category": "USABILITY",
      "acceptance": "Viewport dioptimalkan untuk perangkat mobile layar sentuh dengan navigasi ibu jari satu tangan dan kontras tinggi untuk pemakaian di bawah sinar matahari.",
      "sourceRef": "css/mobile-shell.css",
      "verificationStatus": "CONFIRMED_CODE"
    },
    {
      "id": "KNF-AUDIT-03",
      "title": "Audit Trail Lengkap dan Immutability",
      "category": "SECURITY",
      "acceptance": "Setiap transaksi mencatat id pengguna, peran, stempel waktu, dan riwayat revisi yang tidak dapat dihapus sembarangan.",
      "sourceRef": "js/modules/history/nursery-history.js",
      "verificationStatus": "CONFIRMED_CODE"
    }
  ]
});
