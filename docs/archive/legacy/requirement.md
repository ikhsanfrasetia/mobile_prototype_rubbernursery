# REQUIREMENT MASTER EXPORT

Source:
- Active Runtime Store
- Official Baseline Reference

Export Date:
2026-09-06 09:53:50 UTC

Total:
- Roles: 7
- Modules: 11
- Features: 21
- Requirements: 165
- Flow Nodes: 122
- Flow Edges: 0
- Business Rules: 16

## 1. Role Scope Summary

| Role ID | Role Name | Status | Requirements | Modules |
|:---|:---|:---:|:---:|:---:|
| mantri-bibitan | Mantri Bibitan | CONFIRMED | 165 | 11 |
| asisten-bibitan | Asisten Bibitan | IN_PROGRESS | 8 | 5 |
| asisten-divisi | Asisten Divisi | IN_PROGRESS | 3 | 1 |
| asisten-kepala | Asisten Kepala | IN_PROGRESS | 6 | 1 |
| tekniker-1 | Tekniker I | IN_PROGRESS | 0 | 0 |
| pengurus | Pengurus | IN_PROGRESS | 6 | 1 |
| ktu | KTU | IN_PROGRESS | 0 | 0 |

## 2. Module & Feature Summary

| Order | Module ID | Module Name | Features Count | Requirements Count | Primary Role |
|:---:|:---|:---|:---:|:---:|:---|
| 01 | 01-presensi | Presensi | 2 | 12 | Mantri Bibitan |
| 02 | 02-penerimaan | Penerimaan | 4 | 24 | Mantri Bibitan |
| 03 | 03-penyemaian | Penyemaian | 2 | 16 | Mantri Bibitan |
| 04 | 04-okulasi | Okulasi | 2 | 28 | Mantri Bibitan |
| 05 | 05-pemeriksaan | Pemeriksaan | 2 | 18 | Mantri Bibitan |
| 06 | 06-penyeleksian | Penyeleksian | 1 | 11 | Mantri Bibitan |
| 07 | 07-kebun-entres | Kebun Entres | 2 | 14 | Mantri Bibitan |
| 08 | 08-panen-mata-entres | Panen Mata Entres | 1 | 8 | Mantri Bibitan |
| 09 | 09-material-bahan | Material & Bahan | 2 | 14 | Mantri Bibitan |
| 10 | 10-rekam-pemeliharaan | Rekam Pemeliharaan | 1 | 8 | Mantri Bibitan |
| 11 | 11-pengeluaran | Pengeluaran | 2 | 12 | Mantri Bibitan |

## 3. Business Rules Summary

| Rule ID | Title | Description |
|:---|:---|:---|
| BR-GLB-001 | **Mandatory Foto Dokumentasi + Timestamp** | Setiap transaksi operasional Mantri Bibitan wajib menyertakan foto fisik dokumentasi dengan watermark timestamp ISO dan geolokasi GPS yang valid. |
| BR-GLB-002 | **Kewajiban Verifikasi Asisten Bibitan** | Semua transaksi yang diinput oleh Mantri Bibitan berstatus Menunggu Verifikasi dan belum memengaruhi saldo produksi sampai disetujui oleh Asisten Bibitan. |
| BR-GLB-003 | **Promosi ke Server Production** | Hanya transaksi yang telah diverifikasi dan disetujui oleh Asisten Bibitan yang akan dikirim ke basis data Server Production. |
| BR-PRS-001 | **Presensi Datang Sebagai Syarat Transaksi** | Presensi Datang supervisor wajib diselesaikan terlebih dahulu di pagi hari sebelum sistem mengizinkan transaksi operasional harian lainnya. |
| BR-PRS-003 | **Prioritas Biometrik Face ID** | Face ID adalah metode biometrik utama untuk presensi supervisor. Foto manual hanya diizinkan sebagai fallback jika verifikasi Face ID mengalami kegagalan teknis. |
| BR-OKL-001 | **Presensi Sebelum Okulasi** | Transaksi okulasi hanya dapat dibuka jika Mantri telah menyelesaikan presensi harian dan pekerja yang dialokasikan terdaftar hadir. |
| BR-OKL-002 | **Validasi QR Code Objek Fisik** | Batch bibit wajib divalidasi menggunakan QR Code sebelum penginputan hasil kerja okulasi dilakukan. Pemilihan manual hanya jalur fallback. |
| BR-OKL-005 | **Identitas Stok Mata Entres** | Stok mata entres dikelola berdasarkan kombinasi Plot Entres + Clone, bukan berdasarkan Batch. |
| BR-OKL-006 | **Status Estimasi vs Stok Aktual** | Kalkulasi Jumlah Cabang x Rata-rata Mata Entres adalah estimasi referensi semata. Hanya mata entres aktual yang diverifikasi yang menjadi pengurang saldo stok. |
| BR-OKL-007 | **Pengurangan Stok Pasca Verifikasi** | Pengurangan saldo stok mata entres terjadi secara otomatis hanya setelah berkas transaksi okulasi disetujui (diverifikasi) oleh Asisten Bibitan. |
| BR-OKL-008 | **Regrafting Berulang Tanpa Batas Tunggal** | Proses regrafting pada bibit gagal tidak dibatasi hanya satu kali. Bibit yang gagal pada pemeriksaan regrafting dapat diregrafting kembali atau diputuskan reject oleh Mantri. |
| BR-SEM-001 | **Alokasi Multi-Bedengan per Dokumen** | Satu dokumen penerimaan benih dapat dialokasikan ke beberapa bedengan perkecambahan (contoh: 10.000 benih dibagi ke Bedengan 001, 002, dan 003). |
| BR-SEM-006 | **Standar 1 Polybag = 2 Benih/Bibit** | Kecambah yang ditransplanting dari bedengan ke kantong polybag wajib ditanami 2 kecambah per polybag untuk seleksi vigor selanjutnya. |
| BR-SEM-007 | **Konsolidasi Multi-Bedengan ke 1 Batch** | Satu Batch bibit siap okulasi dapat dibentuk dari gabungan beberapa bedengan semaian dengan clone yang sama. |
| BR-SEL-001 | **Verifikasi Fisik Sebelum Pengurangan Populasi Batch** | Deklarasi bibit reject/mati pada modul penyeleksian oleh Mantri tidak langsung mengurangi populasi Batch sampai Asisten Bibitan melakukan pemeriksaan fisik langsung dan menyetujuinya. |
| BR-MAT-001 | **Integritas 1 Dokumen Gudang = 1 Heading Kerja** | Satu dokumen pengeluaran gudang hanya dapat dilekatkan pada satu aktivitas pemeliharaan dengan heading kerja yang sama (matching). |

## 4. Master Data JSON Payload

```json
{
  "metadata": {
    "version": "0.2.0",
    "lastUpdated": "2026-09-05",
    "updatedBy": "Business Analyst"
  },
  "roles": [
    {
      "id": "mantri-bibitan",
      "name": "Mantri Bibitan",
      "status": "CONFIRMED",
      "description": null
    },
    {
      "id": "asisten-bibitan",
      "name": "Asisten Bibitan",
      "status": "IN_PROGRESS",
      "description": null
    },
    {
      "id": "asisten-divisi",
      "name": "Asisten Divisi",
      "status": "IN_PROGRESS",
      "description": null
    },
    {
      "id": "asisten-kepala",
      "name": "Asisten Kepala",
      "status": "IN_PROGRESS",
      "description": null
    },
    {
      "id": "tekniker-1",
      "name": "Tekniker I",
      "status": "IN_PROGRESS",
      "description": null
    },
    {
      "id": "pengurus",
      "name": "Pengurus",
      "status": "IN_PROGRESS",
      "description": null
    },
    {
      "id": "ktu",
      "name": "KTU",
      "status": "IN_PROGRESS",
      "description": null
    }
  ],
  "modules": [
    {
      "id": "01-presensi",
      "order": "01",
      "name": "Presensi",
      "subtitle": "Presensi Harian Supervisor & Pekerja",
      "desc": "Pencatatan kehadiran harian Supervisor melalui Face ID (dengan fallback foto manual) dan verifikasi daftar kehadiran pekerja bibitan sebelum transaksi harian dimulai.",
      "primaryRole": "Mantri Bibitan",
      "relatedRole": "Asisten Bibitan",
      "status": "Confirmed",
      "features": [
        {
          "id": "presensi-supervisor",
          "name": "Presensi Supervisor",
          "desc": null
        },
        {
          "id": "presensi-pekerja",
          "name": "Presensi Pekerja Bibitan",
          "desc": null
        }
      ]
    },
    {
      "id": "02-penerimaan",
      "order": "02",
      "name": "Penerimaan",
      "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
      "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
      "primaryRole": "Mantri Bibitan",
      "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
      "status": "Confirmed",
      "features": [
        {
          "id": "terima-benih",
          "name": "Penerimaan Benih / Biji Kelatak",
          "desc": null
        },
        {
          "id": "terima-kebun-sendiri",
          "name": "Penerimaan Bibit - Kebun Sendiri",
          "desc": null
        },
        {
          "id": "terima-kebun-sepupu",
          "name": "Penerimaan Bibit - Kebun Sepupu",
          "desc": null
        },
        {
          "id": "terima-mata-entres",
          "name": "Penerimaan Mata Entres",
          "desc": null
        }
      ]
    },
    {
      "id": "03-penyemaian",
      "order": "03",
      "name": "Penyemaian",
      "subtitle": "Penyemaian Bedengan & Transplanting Polybag",
      "desc": "Proses penaburan benih ke Bedengan berdasarkan dokumen penerimaan benih, pemeliharaan ±12–15 hari, hingga transplanting 2 benih/bibit per polybag dan konsolidasi Batch.",
      "primaryRole": "Mantri Bibitan",
      "relatedRole": "Asisten Bibitan (Verifikasi)",
      "status": "Confirmed",
      "features": [
        {
          "id": "semai-bedengan",
          "name": "Penyemaian ke Bedengan",
          "desc": null
        },
        {
          "id": "transplanting-polybag",
          "name": "Transplanting ke Polybag (Batch)",
          "desc": null
        }
      ]
    },
    {
      "id": "04-okulasi",
      "order": "04",
      "name": "Okulasi",
      "subtitle": "Grafting & Regrafting",
      "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
      "primaryRole": "Mantri Bibitan",
      "relatedRole": "Asisten Bibitan (Verifikasi)",
      "status": "Confirmed",
      "features": [
        {
          "id": "grafting",
          "name": "Grafting (Okulasi Utama)",
          "desc": null
        },
        {
          "id": "regrafting",
          "name": "Okulasi Janda / Regrafting",
          "desc": null
        }
      ]
    },
    {
      "id": "05-pemeriksaan",
      "order": "05",
      "name": "Pemeriksaan",
      "subtitle": "Pemeriksaan Hasil Okulasi (Grafting & Regrafting)",
      "desc": "Pemeriksaan berkala hasil okulasi secara dinamis dan bertahap. Bibit yang gagal dapat ditentukan untuk Regrafting berulang kali atau dinyatakan Reject oleh Mantri Bibitan.",
      "primaryRole": "Mantri Bibitan",
      "relatedRole": "Asisten Bibitan (Verifikasi)",
      "status": "Confirmed",
      "features": [
        {
          "id": "periksa-grafting",
          "name": "Pemeriksaan Bertahap Grafting",
          "desc": null
        },
        {
          "id": "periksa-regrafting",
          "name": "Pemeriksaan Regrafting",
          "desc": null
        }
      ]
    },
    {
      "id": "06-penyeleksian",
      "order": "06",
      "name": "Penyeleksian",
      "subtitle": "Seleksi Kualitas & Verifikasi Fisik Batch",
      "desc": "Penyeleksian bibit afkir/mati secara dinamis berulang. Hasil deklarasi Mantri tidak langsung mengurangi populasi Batch sampai Asisten Bibitan melakukan verifikasi fisik.",
      "primaryRole": "Mantri Bibitan",
      "relatedRole": "Asisten Bibitan (Pemeriksaan Fisik & Verifikasi)",
      "status": "Confirmed",
      "features": [
        {
          "id": "seleksi-batch",
          "name": "Seleksi Kualitas Bibit Batch",
          "desc": null
        }
      ]
    },
    {
      "id": "07-kebun-entres",
      "order": "07",
      "name": "Kebun Entres",
      "subtitle": "Pemeliharaan Kebun Entres (Menunas & Topping)",
      "desc": "Pemeliharaan pokok induk entres pada Plot Entres melalui aktivitas Menunas dan Topping dengan perhitungan rasio perisai/cabang dan perisai/meter.",
      "primaryRole": "Mantri Bibitan",
      "relatedRole": "Asisten Bibitan (Verifikasi)",
      "status": "Confirmed",
      "features": [
        {
          "id": "entres-menunas",
          "name": "Menunas Plot Entres",
          "desc": null
        },
        {
          "id": "entres-topping",
          "name": "Topping Plot Entres",
          "desc": null
        }
      ]
    },
    {
      "id": "08-panen-mata-entres",
      "order": "08",
      "name": "Panen Mata Entres",
      "subtitle": "Pemanenan Cabang & Registrasi Stok Mata Entres",
      "desc": "Pemanenan cabang entres per Plot Entres + Clone. Perhitungan estimasi vs input mata entres aktual, yang akan menambah stok resmi setelah diverifikasi Asisten Bibitan.",
      "primaryRole": "Mantri Bibitan",
      "relatedRole": "Asisten Bibitan (Verifikasi)",
      "status": "Confirmed",
      "features": [
        {
          "id": "panen-entres",
          "name": "Panen Mata Entres",
          "desc": null
        }
      ]
    },
    {
      "id": "09-material-bahan",
      "order": "09",
      "name": "Material & Bahan",
      "subtitle": "Monitoring Stok Mata Entres & Dokumen Gudang",
      "desc": "Pengawasan saldo mutasi stok mata entres (+ panen terverifikasi, - okulasi/pengeluaran) serta pelekatan dokumen pengeluaran gudang material matching 1 Heading Kerja.",
      "primaryRole": "Mantri Bibitan",
      "relatedRole": "Asisten Bibitan (Verifikasi), Petugas Gudang",
      "status": "Confirmed",
      "features": [
        {
          "id": "monitoring-stok-entres",
          "name": "Monitoring Mutasi Stok Mata Entres",
          "desc": null
        },
        {
          "id": "material-gudang-matching",
          "name": "Matching Material Dokumen Gudang",
          "desc": null
        }
      ]
    },
    {
      "id": "10-rekam-pemeliharaan",
      "order": "10",
      "name": "Rekam Pemeliharaan",
      "subtitle": "Pencatatan Aktivitas Berbasis Heading Kerja",
      "desc": "Pencatatan aktivitas perawatan dinamis berbasis Grup Heading dan Heading Kerja terhadap objek Batch, Bedengan, Plot Entres, atau Blok dengan auto-match Dokumen Gudang.",
      "primaryRole": "Mantri Bibitan",
      "relatedRole": "Asisten Bibitan (Verifikasi)",
      "status": "Confirmed",
      "features": [
        {
          "id": "pemeliharaan-heading",
          "name": "Rekam Aktivitas Pemeliharaan",
          "desc": null
        }
      ]
    },
    {
      "id": "11-pengeluaran",
      "order": "11",
      "name": "Pengeluaran",
      "subtitle": "Distribusi Bibit & Mata Entres Berbasis Permintaan",
      "desc": "Pengeluaran bibit (ke kebun sendiri/komersil) dan mata entres berdasarkan dokumen permintaan (SPB/DO) yang telah disetujui, tervalidasi QR, foto, dan verifikasi Asisten.",
      "primaryRole": "Mantri Bibitan",
      "relatedRole": "Asisten Bibitan, Asisten Divisi Peminta, Pengurus",
      "status": "Confirmed",
      "features": [
        {
          "id": "pengeluaran-bibit",
          "name": "Pengeluaran Bibit (SPB Disetujui)",
          "desc": null
        },
        {
          "id": "pengeluaran-mata-entres",
          "name": "Pengeluaran Mata Entres",
          "desc": null
        }
      ]
    }
  ],
  "features": [
    {
      "id": "presensi-supervisor",
      "name": "Presensi Supervisor",
      "moduleId": "01-presensi",
      "moduleName": "Presensi",
      "desc": null
    },
    {
      "id": "presensi-pekerja",
      "name": "Presensi Pekerja Bibitan",
      "moduleId": "01-presensi",
      "moduleName": "Presensi",
      "desc": null
    },
    {
      "id": "terima-benih",
      "name": "Penerimaan Benih / Biji Kelatak",
      "moduleId": "02-penerimaan",
      "moduleName": "Penerimaan",
      "desc": null
    },
    {
      "id": "terima-kebun-sendiri",
      "name": "Penerimaan Bibit - Kebun Sendiri",
      "moduleId": "02-penerimaan",
      "moduleName": "Penerimaan",
      "desc": null
    },
    {
      "id": "terima-kebun-sepupu",
      "name": "Penerimaan Bibit - Kebun Sepupu",
      "moduleId": "02-penerimaan",
      "moduleName": "Penerimaan",
      "desc": null
    },
    {
      "id": "terima-mata-entres",
      "name": "Penerimaan Mata Entres",
      "moduleId": "02-penerimaan",
      "moduleName": "Penerimaan",
      "desc": null
    },
    {
      "id": "semai-bedengan",
      "name": "Penyemaian ke Bedengan",
      "moduleId": "03-penyemaian",
      "moduleName": "Penyemaian",
      "desc": null
    },
    {
      "id": "transplanting-polybag",
      "name": "Transplanting ke Polybag (Batch)",
      "moduleId": "03-penyemaian",
      "moduleName": "Penyemaian",
      "desc": null
    },
    {
      "id": "grafting",
      "name": "Grafting (Okulasi Utama)",
      "moduleId": "04-okulasi",
      "moduleName": "Okulasi",
      "desc": null
    },
    {
      "id": "regrafting",
      "name": "Okulasi Janda / Regrafting",
      "moduleId": "04-okulasi",
      "moduleName": "Okulasi",
      "desc": null
    },
    {
      "id": "periksa-grafting",
      "name": "Pemeriksaan Bertahap Grafting",
      "moduleId": "05-pemeriksaan",
      "moduleName": "Pemeriksaan",
      "desc": null
    },
    {
      "id": "periksa-regrafting",
      "name": "Pemeriksaan Regrafting",
      "moduleId": "05-pemeriksaan",
      "moduleName": "Pemeriksaan",
      "desc": null
    },
    {
      "id": "seleksi-batch",
      "name": "Seleksi Kualitas Bibit Batch",
      "moduleId": "06-penyeleksian",
      "moduleName": "Penyeleksian",
      "desc": null
    },
    {
      "id": "entres-menunas",
      "name": "Menunas Plot Entres",
      "moduleId": "07-kebun-entres",
      "moduleName": "Kebun Entres",
      "desc": null
    },
    {
      "id": "entres-topping",
      "name": "Topping Plot Entres",
      "moduleId": "07-kebun-entres",
      "moduleName": "Kebun Entres",
      "desc": null
    },
    {
      "id": "panen-entres",
      "name": "Panen Mata Entres",
      "moduleId": "08-panen-mata-entres",
      "moduleName": "Panen Mata Entres",
      "desc": null
    },
    {
      "id": "monitoring-stok-entres",
      "name": "Monitoring Mutasi Stok Mata Entres",
      "moduleId": "09-material-bahan",
      "moduleName": "Material & Bahan",
      "desc": null
    },
    {
      "id": "material-gudang-matching",
      "name": "Matching Material Dokumen Gudang",
      "moduleId": "09-material-bahan",
      "moduleName": "Material & Bahan",
      "desc": null
    },
    {
      "id": "pemeliharaan-heading",
      "name": "Rekam Aktivitas Pemeliharaan",
      "moduleId": "10-rekam-pemeliharaan",
      "moduleName": "Rekam Pemeliharaan",
      "desc": null
    },
    {
      "id": "pengeluaran-bibit",
      "name": "Pengeluaran Bibit (SPB Disetujui)",
      "moduleId": "11-pengeluaran",
      "moduleName": "Pengeluaran",
      "desc": null
    },
    {
      "id": "pengeluaran-mata-entres",
      "name": "Pengeluaran Mata Entres",
      "moduleId": "11-pengeluaran",
      "moduleName": "Pengeluaran",
      "desc": null
    }
  ],
  "requirements": [
    {
      "id": "RN-PRS-001",
      "reqId": "RN-PRS-001",
      "title": "Presensi Datang supervisor wajib selesai sebelum transaksi harian lain.",
      "role": "Mantri Bibitan",
      "module": "Presensi",
      "moduleId": "01-presensi",
      "feature": "Presensi Supervisor",
      "featureId": "presensi-supervisor",
      "process": "Login Berhasil",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Kredensial login & GPS",
      "validation": "Geofencing areal bibitan",
      "fallback": "Blocker alert",
      "output": "Presensi datang terekam",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-PRS-002",
      "reqId": "RN-PRS-002",
      "title": "Pembacaan waktu otomatis untuk Presensi Datang/Pulang.",
      "role": "Mantri Bibitan",
      "module": "Presensi",
      "moduleId": "01-presensi",
      "feature": "Presensi Supervisor",
      "featureId": "presensi-supervisor",
      "process": "Pilih Status Datang / Pulang",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Pilihan jenis presensi (Datang / Pulang).",
      "validation": "Presensi datang wajib sebelum transaksi operasional.",
      "fallback": "Peringatan blocker urutan.",
      "output": "Jenis presensi terkonfirmasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-PRS-003",
      "reqId": "RN-PRS-003",
      "title": "Verifikasi biometrik wajah supervisor sebagai metode utama presensi.",
      "role": "Mantri Bibitan",
      "module": "Presensi",
      "moduleId": "01-presensi",
      "feature": "Presensi Supervisor",
      "featureId": "presensi-supervisor",
      "process": "Face ID & Biometrik",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Pindaian wajah melalui kamera.",
      "validation": "Kecocokan biometrik >= 85%.",
      "fallback": "Jika Face ID gagal: Beralih ke Foto Manual sebagai fallback.",
      "output": "Verifikasi biometrik terkonfirmasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-PRS-004",
      "reqId": "RN-PRS-004",
      "title": "Face ID merupakan metode utama presensi; Foto manual adalah fallback.",
      "role": "Mantri Bibitan",
      "module": "Presensi",
      "moduleId": "01-presensi",
      "feature": "Presensi Supervisor",
      "featureId": "presensi-supervisor",
      "process": "Foto Manual + Alasan",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Pindaian wajah kamera",
      "validation": "Kecocokan biometrik >= 85%",
      "fallback": "Foto manual selfie + alasan",
      "output": "Kehadiran terverifikasi",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-PRS-005",
      "reqId": "RN-PRS-005",
      "title": "Pemeriksaan radius koordinat GPS berada di dalam perimeter Areal Bibitan.",
      "role": "Mantri Bibitan",
      "module": "Presensi",
      "moduleId": "01-presensi",
      "feature": "Presensi Supervisor",
      "featureId": "presensi-supervisor",
      "process": "Validasi Geofencing & GPS",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Koordinat GPS vs Polygon Geofencing Bibitan.",
      "validation": "Koordinat berada di dalam radius toleransi geofencing (< 200m).",
      "fallback": "Peringatan di luar radius jika di luar kebun.",
      "output": "Status lokasi: Dalam Areal Bibitan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-PRS-006",
      "reqId": "RN-PRS-006",
      "title": "Menyimpan rekaman presensi lengkap: Tanggal, Nama, Timestamp, GPS, Foto.",
      "role": "Mantri Bibitan",
      "module": "Presensi",
      "moduleId": "01-presensi",
      "feature": "Presensi Supervisor",
      "featureId": "presensi-supervisor",
      "process": "Simpan Presensi Supervisor",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Data presensi tervalidasi.",
      "validation": "Record presensi berhasil tersimpan.",
      "fallback": "Penyimpanan offline jika server offline.",
      "output": "Presensi supervisor aktif; modul operasional dibuka.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-PRS-007",
      "reqId": "RN-PRS-007",
      "title": "Presensi supervisor berhasil dan operasional pembibitan siap dilanjutkan.",
      "role": "Mantri Bibitan",
      "module": "Presensi",
      "moduleId": "01-presensi",
      "feature": "Presensi Supervisor",
      "featureId": "presensi-supervisor",
      "process": "Selesai Presensi Supervisor",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Status presensi datang terekam.",
      "validation": "Presensi datang terkonfirmasi.",
      "fallback": "-",
      "output": "Dashboard operasional aktif.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-PWP-001",
      "reqId": "RN-PWP-001",
      "title": "Mantri membuka modul presensi pekerja setelah presensi supervisor selesai.",
      "role": "Mantri Bibitan",
      "module": "Presensi",
      "moduleId": "01-presensi",
      "feature": "Presensi Pekerja Bibitan",
      "featureId": "presensi-pekerja",
      "process": "Buka Presensi Pekerja",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Sesi supervisor aktif.",
      "validation": "Presensi supervisor datang sudah selesai.",
      "fallback": "Blocker alert jika supervisor belum presensi.",
      "output": "Daftar pekerja siap diverifikasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-PWP-002",
      "reqId": "RN-PWP-002",
      "title": "Mantri menandai pekerja yang hadir dan membuang pekerja tidak hadir.",
      "role": "Mantri Bibitan",
      "module": "Presensi",
      "moduleId": "01-presensi",
      "feature": "Presensi Pekerja Bibitan",
      "featureId": "presensi-pekerja",
      "process": "Tentukan Pekerja Hadir",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Pengecekan fisik apel pagi.",
      "validation": "Alasan ketidakhadiran tercatat (Sakit / Izin / Mangkir).",
      "fallback": "Koreksi jika ada yang menyusul.",
      "output": "Daftar pekerja hadir tersaring.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-PWP-003",
      "reqId": "RN-PWP-003",
      "title": "Menambahkan pekerja bantuan antar afdeling jika belum ada di daftar reguler.",
      "role": "Mantri Bibitan",
      "module": "Presensi",
      "moduleId": "01-presensi",
      "feature": "Presensi Pekerja Bibitan",
      "featureId": "presensi-pekerja",
      "process": "Tambah Pekerja Baru Jika Belum Ada",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "NIK atau Nama pekerja bantuan.",
      "validation": "NIK terdaftar di sistem ERP perusahaan.",
      "fallback": "Pencatatan manual sementara.",
      "output": "Pekerja tambahan masuk daftar hadir.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-PWP-004",
      "reqId": "RN-PWP-004",
      "title": "Mengonfirmasi daftar final kehadiran pekerja beserta timestamp dan kirim verifikasi.",
      "role": "Mantri Bibitan",
      "module": "Presensi",
      "moduleId": "01-presensi",
      "feature": "Presensi Pekerja Bibitan",
      "featureId": "presensi-pekerja",
      "process": "Konfirmasi Daftar & Simpan",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Daftar pekerja hadir final.",
      "validation": "Asisten memverifikasi kesesuaian fisik pekerja di lapangan.",
      "fallback": "Revisi jika selisih.",
      "output": "Presensi pekerja terverifikasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-PWP-005",
      "reqId": "RN-PWP-005",
      "title": "Pekerja siap dialokasikan pada transaksi teknis pembibitan karet.",
      "role": "Mantri Bibitan",
      "module": "Presensi",
      "moduleId": "01-presensi",
      "feature": "Presensi Pekerja Bibitan",
      "featureId": "presensi-pekerja",
      "process": "Pool Pekerja Aktif Hari Ini",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Data pekerja hadir terkonfirmasi.",
      "validation": "Daftar aktif terindeks di memori lokal.",
      "fallback": "-",
      "output": "Pool pekerja siap digunakan hari ini.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-001",
      "reqId": "RN-RCV-001",
      "title": "Sumber dokumen resmi pengiriman benih/biji kelatak dari pihak ketiga.",
      "role": "Mantri Bibitan",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Benih / Biji Kelatak",
      "featureId": "terima-benih",
      "process": "Dokumen Pengeluaran Gudang Supplier",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Nomor Surat Jalan / Dokumen Pengeluaran Gudang Supplier.",
      "validation": "Dokumen terdaftar di sistem logistik.",
      "fallback": "Pencatatan nomor dokumen manual dengan foto fisik surat jalan.",
      "output": "Nomor dokumen teridentifikasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-002",
      "reqId": "RN-RCV-002",
      "title": "Sistem menarik metadata dokumen dan menampilkan kuantitas surat jalan.",
      "role": "Mantri Bibitan",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Benih / Biji Kelatak",
      "featureId": "terima-benih",
      "process": "Tarik & Tampilkan Dokumen",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Nomor dokumen pengeluaran gudang.",
      "validation": "Data dokumen tersedia.",
      "fallback": "Input manual jika offline.",
      "output": "Rincian dokumen terbuka di form penerimaan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-003",
      "reqId": "RN-RCV-003",
      "title": "Mantri mencatat jumlah fisik benih kelatak riil yang dibongkar dan diterima.",
      "role": "Mantri Bibitan",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Benih / Biji Kelatak",
      "featureId": "terima-benih",
      "process": "Catat Kuantitas Aktual Diterima",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Perhitungan fisik kotak/karung benih.",
      "validation": "Tidak ada seleksi benih di Modul Penerimaan (seleksi dilakukan di Penyemaian).",
      "fallback": "Catatan selisih jika ada perbedaan dengan surat jalan.",
      "output": "Kuantitas aktual tercatat.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-004",
      "reqId": "RN-RCV-004",
      "title": "Foto fisik karung/kotak benih dan surat jalan dengan stempel waktu ISO.",
      "role": "Mantri Bibitan",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Benih / Biji Kelatak",
      "featureId": "terima-benih",
      "process": "Dokumentasi Foto Fisik + Timestamp",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Foto kamera fisik benih dan surat jalan asli.",
      "validation": "Foto wajib diunggah.",
      "fallback": "Ambil ulang foto.",
      "output": "Foto audit tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-005",
      "reqId": "RN-RCV-005",
      "title": "Menyimpan berkas penerimaan dan disetujui Asisten Bibitan; resmi masuk database produksi.",
      "role": "Asisten Bibitan",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Benih / Biji Kelatak",
      "featureId": "terima-benih",
      "process": "Simpan & Verifikasi Asisten",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Formulir penerimaan dan persetujuan Asisten.",
      "validation": "Jika disetujui, dokumen penerimaan terverifikasi dan siap disemai.",
      "fallback": "Pengembalian dokumen ke Mantri jika tidak cocok.",
      "output": "Dokumen penerimaan terverifikasi di database produksi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-006",
      "reqId": "RN-RCV-006",
      "title": "Dokumen penerimaan siap digunakan sebagai sumber alokasi pada modul Penyemaian.",
      "role": "Mantri Bibitan",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Benih / Biji Kelatak",
      "featureId": "terima-benih",
      "process": "Tersimpan di Production - Siap Disemai",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Dokumen penerimaan terverifikasi.",
      "validation": "Dokumen berstatus APPROVED.",
      "fallback": "-",
      "output": "Dokumen penerimaan aktif di sistem.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-KS01",
      "reqId": "RN-RCV-KS01",
      "title": "Asisten Divisi peminta mengajukan SPB bibit karet untuk penanaman di kebun.",
      "role": "Asisten Divisi",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Bibit - Kebun Sendiri",
      "featureId": "terima-kebun-sendiri",
      "process": "Asisten Divisi Buat Permintaan Bibit",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Rencana tanam, klon yang diminta, dan jumlah bibit.",
      "validation": "Kebutuhan bibit sesuai luas areal tanam.",
      "fallback": "Revisi permohonan.",
      "output": "Dokumen Permintaan Bibit diajukan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-KS02",
      "reqId": "RN-RCV-KS02",
      "title": "Asisten Kepala meninjau permintaan bibit dan memeriksa ketersediaan stok bibit siap salur.",
      "role": "Asisten Kepala",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Bibit - Kebun Sendiri",
      "featureId": "terima-kebun-sendiri",
      "process": "Asisten Kepala Review & Cek Stok",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Dokumen permintaan bibit vs saldo bibit siap salur.",
      "validation": "Klon dan umur bibit memenuhi syarat tanam.",
      "fallback": "Negosiasi jumlah atau jadwal kirim.",
      "output": "Keputusan ketersediaan stok.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-KS03",
      "reqId": "RN-RCV-KS03",
      "title": "Stok cukup: Approve & teruskan ke Asisten Bibitan; Stok tidak cukup: Koreksi/Batalkan.",
      "role": "Asisten Kepala",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Bibit - Kebun Sendiri",
      "featureId": "terima-kebun-sendiri",
      "process": "Keputusan Stok Cukup?",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Hasil audit ketersediaan batch.",
      "validation": "Stok bibit siap salur >= kuantitas diminta.",
      "fallback": "Jalur alternatif koreksi kuantitas.",
      "output": "Arah alur proses ditentukan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-KS04",
      "reqId": "RN-RCV-KS04",
      "title": "Asisten Bibitan menindaklanjuti; Mantri Bibitan mengeksekusi muat dan pengeluaran bibit.",
      "role": "Mantri Bibitan",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Bibit - Kebun Sendiri",
      "featureId": "terima-kebun-sendiri",
      "process": "Mantri Bibitan Pengeluaran Bibit",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Dokumen SPB, armada angkut, dan fisik batch bibit.",
      "validation": "Jumlah bibit sesuai dokumen SPB.",
      "fallback": "Scan manual jika QR rusak.",
      "output": "Surat jalan pengiriman bibit terbit.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-KS05",
      "reqId": "RN-RCV-KS05",
      "title": "Asisten Divisi peminta menerima bibit di lokasi tanam, memeriksa fisik, dan mengonfirmasi penerimaan.",
      "role": "Asisten Divisi",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Bibit - Kebun Sendiri",
      "featureId": "terima-kebun-sendiri",
      "process": "Asisten Divisi Verifikasi Penerimaan",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Fisik bibit tiba di divisi dan surat jalan kirim.",
      "validation": "Bibit diterima dalam kondisi hidup dan segar.",
      "fallback": "Pencatatan bibit rusak di perjalanan.",
      "output": "Transaksi penerimaan selesai dan tercatat di buku kebun divisi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-KS06",
      "reqId": "RN-RCV-KS06",
      "title": "Seluruh tahapan permohonan hingga penerimaan bibit kebun sendiri selesai terverifikasi.",
      "role": "Asisten Divisi",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Bibit - Kebun Sendiri",
      "featureId": "terima-kebun-sendiri",
      "process": "Penerimaan Bibit Tuntas",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Verifikasi sukses.",
      "validation": "-",
      "fallback": "-",
      "output": "Data mutasi produksi tersinkron penuh.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEM-001",
      "reqId": "RN-SEM-001",
      "title": "Satu dokumen penerimaan benih dapat dialokasikan ke beberapa Bedengan.",
      "role": "Mantri Bibitan",
      "module": "Penyemaian",
      "moduleId": "03-penyemaian",
      "feature": "Penyemaian ke Bedengan",
      "featureId": "semai-bedengan",
      "process": "Pilih Dokumen Penerimaan Benih",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Dokumen penerimaan benih",
      "validation": "Sisa saldo benih > 0",
      "fallback": "Alokasi bertahap",
      "output": "Penyemaian multi-bedengan",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEM-002",
      "reqId": "RN-SEM-002",
      "title": "Memindai QR Code fisik pada plang bedengan perkecambahan pasir.",
      "role": "Mantri Bibitan",
      "module": "Penyemaian",
      "moduleId": "03-penyemaian",
      "feature": "Penyemaian ke Bedengan",
      "featureId": "semai-bedengan",
      "process": "Scan QR Bedengan",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "QR Code fisik pada plang nomor bedengan.",
      "validation": "Bedengan terdaftar di master areal bibitan dan berstatus siap tabur.",
      "fallback": "Jika QR rusak: Pilih Bedengan secara manual dari daftar.",
      "output": "Identitas bedengan tervalidasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEM-003",
      "reqId": "RN-SEM-003",
      "title": "Mantri menginput jumlah butir benih yang disemai dan jumlah benih afkir/rusak.",
      "role": "Mantri Bibitan",
      "module": "Penyemaian",
      "moduleId": "03-penyemaian",
      "feature": "Penyemaian ke Bedengan",
      "featureId": "semai-bedengan",
      "process": "Input Jumlah Disemai & Reject",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Jumlah disemai (butir) dan jumlah reject (butir).",
      "validation": "Jumlah disemai + reject <= sisa benih pada dokumen penerimaan.",
      "fallback": "Koreksi kuantitas sebelum disimpan.",
      "output": "Kuantitas semai dan reject tercatat.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEM-004",
      "reqId": "RN-SEM-004",
      "title": "Foto bukti fisik benih reject/rusak dengan watermark timestamp ISO dan GPS.",
      "role": "Mantri Bibitan",
      "module": "Penyemaian",
      "moduleId": "03-penyemaian",
      "feature": "Penyemaian ke Bedengan",
      "featureId": "semai-bedengan",
      "process": "Foto Benih Tidak Layak + Timestamp",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Foto benih reject di atas nampan/karung.",
      "validation": "Jika reject > 0, foto benih reject wajib diunggah.",
      "fallback": "Ambil ulang foto.",
      "output": "Foto bukti reject tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEM-005",
      "reqId": "RN-SEM-005",
      "title": "Asisten menyetujui penaburan bedengan; periode perkecambahan berlangsung ±12–15 hari.",
      "role": "Mantri Bibitan",
      "module": "Penyemaian",
      "moduleId": "03-penyemaian",
      "feature": "Penyemaian ke Bedengan",
      "featureId": "semai-bedengan",
      "process": "Verifikasi Asisten & ±12–15 Hari Semai",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Jadwal hari setelah semai (HSS).",
      "validation": "Umur semai mencapai ±12–15 hari.",
      "fallback": "Pemeriksaan manual jika perkecambahan lambat.",
      "output": "Kecambah siap transplanting ke polybag.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEM-006",
      "reqId": "RN-SEM-006",
      "title": "Transplanting ke polybag menggunakan rasio 1 Polybag = 2 Benih/Bibit.",
      "role": "Mantri Bibitan",
      "module": "Penyemaian",
      "moduleId": "03-penyemaian",
      "feature": "Penyemaian ke Bedengan",
      "featureId": "semai-bedengan",
      "process": "Transplanting ke Polybag (1 Polybag = 2 Benih)",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Kecambah fase jarum",
      "validation": "Tepat 2 kecambah per polybag",
      "fallback": "Penyulaman manual",
      "output": "Polybag terisi 2 bibit",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEM-007",
      "reqId": "RN-SEM-007",
      "title": "Satu Batch bibitan dapat dikonsolidasi dari beberapa Bedengan.",
      "role": "Mantri Bibitan",
      "module": "Penyemaian",
      "moduleId": "03-penyemaian",
      "feature": "Penyemaian ke Bedengan",
      "featureId": "semai-bedengan",
      "process": "Konsolidasi Multi-Bedengan ke Batch",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Kumpulan bedengan siap polybag",
      "validation": "Clone dan petak seragam",
      "fallback": "Pemisahan batch",
      "output": "Batch resmi terbentuk",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEM-008",
      "reqId": "RN-SEM-008",
      "title": "Batch polybag telah terdaftar dan siap dipelihara hingga mencapai ukuran okulasi.",
      "role": "Mantri Bibitan",
      "module": "Penyemaian",
      "moduleId": "03-penyemaian",
      "feature": "Penyemaian ke Bedengan",
      "featureId": "semai-bedengan",
      "process": "Batch Siap Masuk Siklus Okulasi",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Batch terverifikasi Asisten Bibitan.",
      "validation": "Status Batch: Aktif Siap Okulasi.",
      "fallback": "-",
      "output": "Batch siap diokulasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-OKL-000",
      "reqId": "RN-OKL-000",
      "title": "Inisialisasi modul okulasi grafting oleh Mantri Bibitan.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Grafting (Okulasi Utama)",
      "featureId": "grafting",
      "process": "Mulai",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Sesi login aktif Mantri Bibitan",
      "validation": "Mantri telah menyelesaikan Presensi Datang.",
      "fallback": "Presensi mandatory blocker jika belum hadir.",
      "output": "Halaman pemilihan batch terbuka.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-OKL-001",
      "reqId": "RN-OKL-001",
      "title": "Sistem menampilkan daftar Batch yang dapat diproses.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Grafting (Okulasi Utama)",
      "featureId": "grafting",
      "process": "Pilih Batch",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Daftar batch aktif",
      "validation": "Batch harus berstatus aktif",
      "fallback": "Pencarian manual nomor petak",
      "output": "Batch terpilih",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-OKL-002",
      "reqId": "RN-OKL-002",
      "title": "Sistem wajib memvalidasi Batch menggunakan QR Code.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Grafting (Okulasi Utama)",
      "featureId": "grafting",
      "process": "Scan QR Batch",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "QR Code Batch fisik",
      "validation": "Batch valid & koordinat sesuai",
      "fallback": "Pilih manual jika QR rusak",
      "output": "Batch terkonfirmasi",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-OKL-003",
      "reqId": "RN-OKL-003",
      "title": "Sistem menampilkan populasi setelah Batch divalidasi.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Grafting (Okulasi Utama)",
      "featureId": "grafting",
      "process": "Validasi Batch",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Data populasi hidup",
      "validation": "Populasi > 0",
      "fallback": "Sinkronisasi ulang",
      "output": "Populasi acuan tampil",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-OKL-004",
      "reqId": "RN-OKL-004",
      "title": "Mantri mencatat pekerja yang melakukan okulasi.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Grafting (Okulasi Utama)",
      "featureId": "grafting",
      "process": "Tampilkan Populasi",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Daftar pekerja presensi",
      "validation": "Pekerja harus berstatus hadir",
      "fallback": "Pencarian manual",
      "output": "Alokasi pekerja tersimpan",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-OKL-005",
      "reqId": "RN-OKL-005",
      "title": "Sistem memvalidasi Plot Entres yang dipilih.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Grafting (Okulasi Utama)",
      "featureId": "grafting",
      "process": "Tentukan Pekerja",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "QR Code Plot Entres",
      "validation": "QR cocok dengan master clone",
      "fallback": "Pilih plot manual",
      "output": "Plot entres valid",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-OKL-006",
      "reqId": "RN-OKL-006",
      "title": "Sistem menghitung estimasi mata entres berdasarkan cabang.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Grafting (Okulasi Utama)",
      "featureId": "grafting",
      "process": "Pilih Plot Entres",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Jumlah cabang x rata-rata mata/cabang",
      "validation": "Estimasi merupakan referensi, bukan stok",
      "fallback": "Penyesuaian manual",
      "output": "Angka estimasi mata entres",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-OKL-007",
      "reqId": "RN-OKL-007",
      "title": "Mata entres aktual menjadi pengurang stok setelah verifikasi.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Grafting (Okulasi Utama)",
      "featureId": "grafting",
      "process": "Scan QR Plot Entres",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Kuantitas mata entres aktual",
      "validation": "Verifikasi Asisten Bibitan disetujui",
      "fallback": "Logging mutasi sistem",
      "output": "Stok mata entres terpotong",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-OKL-008",
      "reqId": "RN-OKL-008",
      "title": "Menginput jumlah batang/cabang kayu entres yang diambil dari plot.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Grafting (Okulasi Utama)",
      "featureId": "grafting",
      "process": "Input Cabang Entres",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Jumlah cabang kayu okulasi (angka integer).",
      "validation": "Kuantitas cabang > 0.",
      "fallback": "Koreksi manual jika terdapat cabang yang patah/rusak.",
      "output": "Nilai jumlah cabang tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-OKL-009",
      "reqId": "RN-OKL-009",
      "title": "Sistem menghitung dan menampilkan estimasi perolehan mata entres.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Grafting (Okulasi Utama)",
      "featureId": "grafting",
      "process": "Tampilkan Estimasi",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Jumlah cabang x rata-rata mata entres per cabang plot.",
      "validation": "Estimasi merupakan referensi, BUKAN stok aktual.",
      "fallback": "Nilai estimasi dapat disesuaikan faktor perisai tunas.",
      "output": "Tampilan estimasi mata entres terlihat di antarmuka.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-OKL-010",
      "reqId": "RN-OKL-010",
      "title": "Mencatat kuantitas mata entres aktual yang berhasil ditempelkan.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Grafting (Okulasi Utama)",
      "featureId": "grafting",
      "process": "Input Mata Entres Aktual",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Jumlah mata entres yang terpakai riil.",
      "validation": "Mata entres aktual <= stok tersedia pada Plot Entres + Clone.",
      "fallback": "Pemberitahuan peringatan jika melebihi stok terverifikasi.",
      "output": "Data kuantitas mata entres aktual tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-OKL-011",
      "reqId": "RN-OKL-011",
      "title": "Pengambilan foto dokumentasi fisik kegiatan okulasi beserta watermark timestamp.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Grafting (Okulasi Utama)",
      "featureId": "grafting",
      "process": "Dokumentasi Foto + Timestamp",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Foto kamera langsung kegiatan okulasi / ikatan okulasi.",
      "validation": "Foto wajib ada (tidak boleh kosong), timestamp valid hari ini.",
      "fallback": "Ambil ulang jika foto buram / gelap.",
      "output": "Berkas gambar terkompresi dengan metadata audit tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-OKL-012",
      "reqId": "RN-OKL-012",
      "title": "Mengirim berkas transaksi okulasi ke antrean verifikasi Asisten.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Grafting (Okulasi Utama)",
      "featureId": "grafting",
      "process": "Submit Transaksi",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Seluruh formulir data transaksi okulasi lengkap.",
      "validation": "Semua validasi mandatory terpenuhi (QR, pekerja, entres, foto).",
      "fallback": "Tersimpan di offline queue jika jaringan offline.",
      "output": "Nomor transaksi diterbitkan berstatus Menunggu Verifikasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-OKL-013",
      "reqId": "RN-OKL-013",
      "title": "Pemeriksaan lapangan dan persetujuan transaksi oleh Asisten Bibitan.",
      "role": "Asisten Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Grafting (Okulasi Utama)",
      "featureId": "grafting",
      "process": "Verifikasi Asisten Bibitan",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Data transaksi Mantri, foto dokumentasi, dan inspeksi fisik petak.",
      "validation": "Jika ditolak, berkas kembali ke Mantri untuk direvisi.",
      "fallback": "Pemberian catatan perbaikan spesifik oleh Asisten jika ditolak.",
      "output": "Status transaksi berubah menjadi Terverifikasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-OKL-014",
      "reqId": "RN-OKL-014",
      "title": "Pengurangan stok mata entres terverifikasi pada Plot Entres + Clone.",
      "role": "Sistem Database",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Grafting (Okulasi Utama)",
      "featureId": "grafting",
      "process": "Update Stok Mata Entres",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Kuantitas mata entres aktual yang telah diverifikasi Asisten.",
      "validation": "Stok tidak boleh minus.",
      "fallback": "Logging transaksi mutasi sistem.",
      "output": "Saldo stok terpotong, tercatat dalam ledger material.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-OKL-015",
      "reqId": "RN-OKL-015",
      "title": "Transaksi okulasi grafting berhasil diselesaikan dan masuk basis data produksi.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Grafting (Okulasi Utama)",
      "featureId": "grafting",
      "process": "Selesai",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Transaksi terverifikasi server production.",
      "validation": "Status transaksi: Terverifikasi Production.",
      "fallback": "Pencetakan laporan ringkasan jika diperlukan.",
      "output": "Data tersinkron penuh ke server production.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-REG-000",
      "reqId": "RN-REG-000",
      "title": "Inisialisasi transaksi okulasi ulang (regrafting) untuk bibit yang gagal pada pemeriksaan.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Okulasi Janda / Regrafting",
      "featureId": "regrafting",
      "process": "Mulai Regrafting",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Dokumen riwayat pemeriksaan yang menetapkan tindak lanjut Regrafting.",
      "validation": "Tersedia bibit gagal dengan tindak lanjut Regrafting pada batch terpilih.",
      "fallback": "Pemberitahuan jika tidak ada bibit yang perlu di-regrafting.",
      "output": "Formulir regrafting aktif.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-REG-001",
      "reqId": "RN-REG-001",
      "title": "Memilih batch dan dokumen hasil pemeriksaan yang memiliki tindak lanjut regrafting.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Okulasi Janda / Regrafting",
      "featureId": "regrafting",
      "process": "Pilih Batch & Sumber Pemeriksaan",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Daftar dokumen pemeriksaan yang memerlukan regrafting.",
      "validation": "Dokumen pemeriksaan harus berstatus valid dan memiliki sisa kuota regrafting.",
      "fallback": "Pencarian batch manual.",
      "output": "Batch dan kuota bibit siap regrafting terpilih.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-REG-002",
      "reqId": "RN-REG-002",
      "title": "Validasi fisik QR Code Batch sebelum melakukan regrafting.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Okulasi Janda / Regrafting",
      "featureId": "regrafting",
      "process": "Scan QR Batch",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "QR Code Batch fisik.",
      "validation": "Batch harus cocok dengan dokumen sumber pemeriksaan.",
      "fallback": "Pilih manual jika QR rusak.",
      "output": "Batch terverifikasi fisik.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-REG-003",
      "reqId": "RN-REG-003",
      "title": "Memeriksa jumlah batang bibit gagal yang berhak menerima penempelan ulang.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Okulasi Janda / Regrafting",
      "featureId": "regrafting",
      "process": "Validasi Data Bibit Gagal",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Nilai bibit gagal dari dokumen pemeriksaan.",
      "validation": "Jumlah regrafting <= jumlah bibit gagal pada dokumen sumber.",
      "fallback": "Peringatan validasi jika melebihi kuota.",
      "output": "Batas maksimum regrafting divalidasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-REG-004",
      "reqId": "RN-REG-004",
      "title": "Menginput jumlah bibit yang diokulasi ulang dan pekerja pelaksana.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Okulasi Janda / Regrafting",
      "featureId": "regrafting",
      "process": "Input Kuantitas Regrafting",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Jumlah batang di-regrafting dan nama pekerja.",
      "validation": "Pekerja hadir pada presensi hari ini.",
      "fallback": "Daftar pekerja cadangan.",
      "output": "Rincian regrafting per pekerja tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-REG-005",
      "reqId": "RN-REG-005",
      "title": "Memilih plot kebun entres dan memindai QR fisik plot penyedia mata tunas.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Okulasi Janda / Regrafting",
      "featureId": "regrafting",
      "process": "Pilih Plot Entres & Scan QR",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "QR Code Plot Entres.",
      "validation": "Clone entres harus sama dengan clone batch yang diregrafting.",
      "fallback": "Pilih plot manual dengan persetujuan.",
      "output": "Plot entres terverifikasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-REG-006",
      "reqId": "RN-REG-006",
      "title": "Mencatat jumlah mata entres aktual yang digunakan untuk regrafting.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Okulasi Janda / Regrafting",
      "featureId": "regrafting",
      "process": "Input Mata Entres Aktual",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Jumlah mata tunas terpakai.",
      "validation": "Nilai aktual <= saldo stok Plot Entres + Clone.",
      "fallback": "Peringatan stok tidak cukup.",
      "output": "Nilai mata entres aktual tersimpan di form.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-REG-007",
      "reqId": "RN-REG-007",
      "title": "Pengambilan foto dokumentasi ikatan regrafting dan watermark timestamp.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Okulasi Janda / Regrafting",
      "featureId": "regrafting",
      "process": "Dokumentasi Foto + Timestamp",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Foto kamera batang regrafting.",
      "validation": "Foto wajib terunggah.",
      "fallback": "Ambil ulang jika hasil foto buram.",
      "output": "Foto bukti audit tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-REG-008",
      "reqId": "RN-REG-008",
      "title": "Mengirimkan berkas regrafting ke antrean verifikasi Asisten Bibitan.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Okulasi Janda / Regrafting",
      "featureId": "regrafting",
      "process": "Submit Transaksi",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Seluruh formulir data regrafting.",
      "validation": "Data lengkap dan valid.",
      "fallback": "Tersimpan lokal di offline sync queue jika jaringan offline.",
      "output": "Transaksi terkirim berstatus Menunggu Verifikasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-REG-009",
      "reqId": "RN-REG-009",
      "title": "Pemeriksaan mutu tempelan ulang dan persetujuan oleh Asisten Bibitan.",
      "role": "Asisten Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Okulasi Janda / Regrafting",
      "featureId": "regrafting",
      "process": "Verifikasi Asisten Bibitan",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Data transaksi regrafting dan inspeksi fisik.",
      "validation": "Jika disetujui, transaksi berstatus Terverifikasi.",
      "fallback": "Pengembalian berkas dengan catatan perbaikan.",
      "output": "Transaksi regrafting sah.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-REG-010",
      "reqId": "RN-REG-010",
      "title": "Pemotongan stok resmi mata entres pada Plot Entres + Clone.",
      "role": "Sistem Database",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Okulasi Janda / Regrafting",
      "featureId": "regrafting",
      "process": "Potong Stok Mata Entres",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Data kuantitas mata entres aktual yang telah diverifikasi.",
      "validation": "Stok tersedia cukup.",
      "fallback": "Audit log mutasi.",
      "output": "Saldo mata entres terpotong.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-REG-011",
      "reqId": "RN-REG-011",
      "title": "Regrafting selesai dan siap diperiksa pada jadwal pemeriksaan berikutnya.",
      "role": "Mantri Bibitan",
      "module": "Okulasi",
      "moduleId": "04-okulasi",
      "feature": "Okulasi Janda / Regrafting",
      "featureId": "regrafting",
      "process": "Selesai Regrafting",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Transaksi terverifikasi production.",
      "validation": "Tercatat dalam jadwal pemeriksaan.",
      "fallback": "-",
      "output": "Data tersinkron penuh ke server production.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-CHK-001",
      "reqId": "RN-CHK-001",
      "title": "Pemeriksaan bersifat dinamis dan dapat dilakukan bertahap.",
      "role": "Mantri Bibitan",
      "module": "Pemeriksaan",
      "moduleId": "05-pemeriksaan",
      "feature": "Pemeriksaan Bertahap Grafting",
      "featureId": "periksa-grafting",
      "process": "Buka Pemeriksaan",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Dokumen berkewajiban periksa",
      "validation": "Jumlah periksa <= sisa periksa",
      "fallback": "Sisa tetap muncul di antrean",
      "output": "Hasil berhasil vs gagal",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-CHK-002",
      "reqId": "RN-CHK-002",
      "title": "Bibit gagal dapat ditentukan untuk Regrafting ulang atau Reject.",
      "role": "Mantri Bibitan",
      "module": "Pemeriksaan",
      "moduleId": "05-pemeriksaan",
      "feature": "Pemeriksaan Bertahap Grafting",
      "featureId": "periksa-grafting",
      "process": "Pilih Dokumen Okulasi",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Kuantitas bibit gagal",
      "validation": "Pilihan Mantri: Regrafting vs Reject",
      "fallback": "Tidak dibatasi 1x regrafting",
      "output": "Tindak lanjut terdaftar",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-CHK-003",
      "reqId": "RN-CHK-003",
      "title": "Validasi fisik QR Code Batch yang diperiksa.",
      "role": "Mantri Bibitan",
      "module": "Pemeriksaan",
      "moduleId": "05-pemeriksaan",
      "feature": "Pemeriksaan Bertahap Grafting",
      "featureId": "periksa-grafting",
      "process": "Scan QR Batch",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "QR Code Batch fisik.",
      "validation": "Batch cocok dengan dokumen okulasi.",
      "fallback": "Pilih manual jika QR rusak.",
      "output": "Batch tervalidasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-CHK-004",
      "reqId": "RN-CHK-004",
      "title": "Menginput jumlah batang yang diperiksa pada sesi ini (misal 600 dari 1.000).",
      "role": "Mantri Bibitan",
      "module": "Pemeriksaan",
      "moduleId": "05-pemeriksaan",
      "feature": "Pemeriksaan Bertahap Grafting",
      "featureId": "periksa-grafting",
      "process": "Input Bibit Diperiksa Bertahap",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Jumlah bibit diperiksa.",
      "validation": "Jumlah diperiksa <= sisa belum periksa.",
      "fallback": "-",
      "output": "Sisa pemeriksaan tetap tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-CHK-005",
      "reqId": "RN-CHK-005",
      "title": "Mencatat jumlah mata tempelan yang hijau (berhasil) vs hitam/mati (gagal).",
      "role": "Mantri Bibitan",
      "module": "Pemeriksaan",
      "moduleId": "05-pemeriksaan",
      "feature": "Pemeriksaan Bertahap Grafting",
      "featureId": "periksa-grafting",
      "process": "Input Berhasil & Gagal",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Jumlah berhasil dan jumlah gagal.",
      "validation": "Total Berhasil + Gagal = Jumlah Diperiksa.",
      "fallback": "Hitung ulang jika ada selisih.",
      "output": "Data perolehan berhasil & gagal tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-CHK-006",
      "reqId": "RN-CHK-006",
      "title": "Mantri menentukan tindak lanjut bibit yang gagal: Regrafting atau Reject.",
      "role": "Mantri Bibitan",
      "module": "Pemeriksaan",
      "moduleId": "05-pemeriksaan",
      "feature": "Pemeriksaan Bertahap Grafting",
      "featureId": "periksa-grafting",
      "process": "Tindak Lanjut Bibit Gagal",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Kuantitas bibit gagal dan kondisi visual batang.",
      "validation": "Keputusan ditentukan sepenuhnya oleh Mantri Bibitan.",
      "fallback": "Konsultasi Asisten jika ragu.",
      "output": "Kuota regrafting atau reject tercatat.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-CHK-007",
      "reqId": "RN-CHK-007",
      "title": "Foto bukti fisik mata tempelan berhasil dan gagal beserta watermark.",
      "role": "Mantri Bibitan",
      "module": "Pemeriksaan",
      "moduleId": "05-pemeriksaan",
      "feature": "Pemeriksaan Bertahap Grafting",
      "featureId": "periksa-grafting",
      "process": "Dokumentasi Foto + Timestamp",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Foto mata tunas okulasi.",
      "validation": "Foto wajib diunggah.",
      "fallback": "Ambil ulang foto.",
      "output": "Foto audit tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-CHK-008",
      "reqId": "RN-CHK-008",
      "title": "Mengirim hasil pemeriksaan ke Asisten Bibitan untuk disetujui.",
      "role": "Mantri Bibitan",
      "module": "Pemeriksaan",
      "moduleId": "05-pemeriksaan",
      "feature": "Pemeriksaan Bertahap Grafting",
      "featureId": "periksa-grafting",
      "process": "Submit & Verifikasi Asisten",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Data pemeriksaan lengkap.",
      "validation": "Jika disetujui, data masuk server production.",
      "fallback": "Koreksi jika ada selisih hitung.",
      "output": "Status: Terverifikasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-CHK-009",
      "reqId": "RN-CHK-009",
      "title": "Pemeriksaan tuntas; bibit berhasil lanjut tumbuh, bibit gagal siap diregrafting.",
      "role": "Mantri Bibitan",
      "module": "Pemeriksaan",
      "moduleId": "05-pemeriksaan",
      "feature": "Pemeriksaan Bertahap Grafting",
      "featureId": "periksa-grafting",
      "process": "Selesai Pemeriksaan",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Status verified.",
      "validation": "-",
      "fallback": "-",
      "output": "Data siap untuk siklus selanjutnya.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEL-001",
      "reqId": "RN-SEL-001",
      "title": "Penyeleksian afkir Mantri tidak langsung mengurangi populasi Batch sebelum verifikasi fisik Asisten.",
      "role": "Mantri Bibitan",
      "module": "Penyeleksian",
      "moduleId": "06-penyeleksian",
      "feature": "Seleksi Kualitas Bibit Batch",
      "featureId": "seleksi-batch",
      "process": "Buka Penyeleksian Kualitas",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Deklarasi seleksi Mantri",
      "validation": "Asisten bandingkan fisik vs transaksi",
      "fallback": "Revisi jika selisih fisik",
      "output": "Pengurangan populasi batch resmi",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEL-002",
      "reqId": "RN-SEL-002",
      "title": "Memilih sumber dokumen transaksi yang mendasari seleksi.",
      "role": "Mantri Bibitan",
      "module": "Penyeleksian",
      "moduleId": "06-penyeleksian",
      "feature": "Seleksi Kualitas Bibit Batch",
      "featureId": "seleksi-batch",
      "process": "Pilih Dokumen Sumber",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Riwayat transaksi batch.",
      "validation": "Dokumen sumber valid.",
      "fallback": "Pencarian manual.",
      "output": "Dokumen sumber terpilih.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEL-003",
      "reqId": "RN-SEL-003",
      "title": "Validasi fisik QR Code Batch yang akan diseleksi.",
      "role": "Mantri Bibitan",
      "module": "Penyeleksian",
      "moduleId": "06-penyeleksian",
      "feature": "Seleksi Kualitas Bibit Batch",
      "featureId": "seleksi-batch",
      "process": "Scan QR Batch",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "QR Code Batch fisik.",
      "validation": "QR Batch cocok dengan data dokumen.",
      "fallback": "Pilih manual jika QR rusak.",
      "output": "Batch terverifikasi fisik.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEL-004",
      "reqId": "RN-SEL-004",
      "title": "Menampilkan populasi hidup acuan batch yang aktif.",
      "role": "Mantri Bibitan",
      "module": "Penyeleksian",
      "moduleId": "06-penyeleksian",
      "feature": "Seleksi Kualitas Bibit Batch",
      "featureId": "seleksi-batch",
      "process": "Tampilkan Populasi Acuan",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Data populasi hidup terakhir.",
      "validation": "Populasi hidup > 0.",
      "fallback": "-",
      "output": "Populasi acuan tampil.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEL-005",
      "reqId": "RN-SEL-005",
      "title": "Mantri menginput nilai seleksi berdasarkan Reject / Mati yang ditemukan.",
      "role": "Mantri Bibitan",
      "module": "Penyeleksian",
      "moduleId": "06-penyeleksian",
      "feature": "Seleksi Kualitas Bibit Batch",
      "featureId": "seleksi-batch",
      "process": "Deklarasi Nilai Seleksi",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Jumlah bibit reject/mati.",
      "validation": "Jumlah afkir <= populasi acuan.",
      "fallback": "Koreksi input.",
      "output": "Nilai seleksi Mantri tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEL-006",
      "reqId": "RN-SEL-006",
      "title": "Foto dokumentasi fisik bibit reject/afkir yang dikumpulkan beserta tanda air.",
      "role": "Mantri Bibitan",
      "module": "Penyeleksian",
      "moduleId": "06-penyeleksian",
      "feature": "Seleksi Kualitas Bibit Batch",
      "featureId": "seleksi-batch",
      "process": "Foto Dokumentasi + Timestamp",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Foto fisik bibit reject di barisan petak.",
      "validation": "Foto wajib diunggah.",
      "fallback": "Ambil ulang jika buram.",
      "output": "Foto audit tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEL-007",
      "reqId": "RN-SEL-007",
      "title": "Mengirimkan berkas seleksi ke status Menunggu Verifikasi Asisten.",
      "role": "Mantri Bibitan",
      "module": "Penyeleksian",
      "moduleId": "06-penyeleksian",
      "feature": "Seleksi Kualitas Bibit Batch",
      "featureId": "seleksi-batch",
      "process": "Submit Menunggu Verifikasi",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Form seleksi lengkap.",
      "validation": "Data lengkap.",
      "fallback": "Simpan offline.",
      "output": "Status: Menunggu Verifikasi Asisten.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEL-008",
      "reqId": "RN-SEL-008",
      "title": "Asisten Bibitan turun ke lapangan melakukan pemeriksaan fisik batch langsung.",
      "role": "Asisten Bibitan",
      "module": "Penyeleksian",
      "moduleId": "06-penyeleksian",
      "feature": "Seleksi Kualitas Bibit Batch",
      "featureId": "seleksi-batch",
      "process": "Asisten Pemeriksaan Fisik Batch",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Fisik bibit di petak dan deklarasi seleksi Mantri.",
      "validation": "Kesesuaian fisik dengan berkas.",
      "fallback": "Hitung ulang bersama.",
      "output": "Hasil verifikasi lapangan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEL-009",
      "reqId": "RN-SEL-009",
      "title": "Memverifikasi apakah kuantitas afkir di sistem sama dengan fisik lapangan.",
      "role": "Asisten Bibitan",
      "module": "Penyeleksian",
      "moduleId": "06-penyeleksian",
      "feature": "Seleksi Kualitas Bibit Batch",
      "featureId": "seleksi-batch",
      "process": "Bandingkan Transaksi vs Fisik",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Angka deklarasi vs angka fisik riil.",
      "validation": "Kesesuaian toleransi selisih.",
      "fallback": "Koreksi angka seleksi.",
      "output": "Angka seleksi disepakati.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEL-010",
      "reqId": "RN-SEL-010",
      "title": "Asisten menyetujui transaksi; nilai terverifikasi resmi memotong populasi Batch.",
      "role": "Asisten Bibitan",
      "module": "Penyeleksian",
      "moduleId": "06-penyeleksian",
      "feature": "Seleksi Kualitas Bibit Batch",
      "featureId": "seleksi-batch",
      "process": "Verifikasi & Kurangi Batch",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Persetujuan Asisten Bibitan.",
      "validation": "Tanda tangan digital Asisten.",
      "fallback": "-",
      "output": "Populasi Batch terpotong resmi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEL-011",
      "reqId": "RN-SEL-011",
      "title": "Penyeleksian tuntas; populasi batch di database kini mencerminkan bibit hidup riil.",
      "role": "Mantri Bibitan",
      "module": "Penyeleksian",
      "moduleId": "06-penyeleksian",
      "feature": "Seleksi Kualitas Bibit Batch",
      "featureId": "seleksi-batch",
      "process": "Populasi Batch Sah",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Status verified.",
      "validation": "-",
      "fallback": "-",
      "output": "Populasi batch terbarui.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-ENT-001",
      "reqId": "RN-ENT-001",
      "title": "Aktivitas Menunas & Topping menghitung rasio perisai/cabang dan perisai/meter.",
      "role": "Mantri Bibitan",
      "module": "Kebun Entres",
      "moduleId": "07-kebun-entres",
      "feature": "Menunas Plot Entres",
      "featureId": "entres-menunas",
      "process": "Buka Menunas Entres",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Perisai, cabang, panjang meter",
      "validation": "Perhitungan matematis otomatis",
      "fallback": "Koreksi input",
      "output": "Rasio kualitas entres",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-ENT-002",
      "reqId": "RN-ENT-002",
      "title": "Validasi QR Code plang fisik plot entres yang dirawat.",
      "role": "Mantri Bibitan",
      "module": "Kebun Entres",
      "moduleId": "07-kebun-entres",
      "feature": "Menunas Plot Entres",
      "featureId": "entres-menunas",
      "process": "Scan QR Plot Entres",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "QR Code Plot Entres.",
      "validation": "QR plot entres valid.",
      "fallback": "Pilih manual plot jika QR rusak.",
      "output": "Identitas plot terverifikasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-ENT-003",
      "reqId": "RN-ENT-003",
      "title": "Sistem menyajikan data clone dan jumlah pokok tanaman induk per plot.",
      "role": "Mantri Bibitan",
      "module": "Kebun Entres",
      "moduleId": "07-kebun-entres",
      "feature": "Menunas Plot Entres",
      "featureId": "entres-menunas",
      "process": "Tampilkan Clone & Pokok",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Master data plot entres.",
      "validation": "Populasi pokok terdefinisi.",
      "fallback": "-",
      "output": "Data clone & pokok tampil.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-ENT-004",
      "reqId": "RN-ENT-004",
      "title": "Mantri menginput Tanggal, Jumlah Perisai/Mata Tunas, Jumlah Cabang, dan Panjang Meter.",
      "role": "Mantri Bibitan",
      "module": "Kebun Entres",
      "moduleId": "07-kebun-entres",
      "feature": "Menunas Plot Entres",
      "featureId": "entres-menunas",
      "process": "Input Variabel Menunas",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Tanggal, Perisai, Cabang, Panjang Meter.",
      "validation": "Seluruh angka > 0.",
      "fallback": "Koreksi input.",
      "output": "Data variabel tersimpan di form.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-ENT-005",
      "reqId": "RN-ENT-005",
      "title": "Sistem menghitung Rata-rata Perisai/Cabang dan Rata-rata Perisai/Meter.",
      "role": "Mantri Bibitan",
      "module": "Kebun Entres",
      "moduleId": "07-kebun-entres",
      "feature": "Menunas Plot Entres",
      "featureId": "entres-menunas",
      "process": "Hitung Rata-rata Otomatis",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Perisai / Cabang dan Perisai / Panjang Meter.",
      "validation": "Perhitungan matematis otomatis valid.",
      "fallback": "-",
      "output": "Indeks rata-rata tampil di layar.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-ENT-006",
      "reqId": "RN-ENT-006",
      "title": "Foto dokumentasi plot setelah ditunas beserta timestamp, diteruskan ke Asisten Bibitan.",
      "role": "Mantri Bibitan",
      "module": "Kebun Entres",
      "moduleId": "07-kebun-entres",
      "feature": "Menunas Plot Entres",
      "featureId": "entres-menunas",
      "process": "Foto + Timestamp & Verifikasi",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Foto pokok entres bersih tunas air.",
      "validation": "Foto wajib diunggah.",
      "fallback": "Ambil ulang jika buram.",
      "output": "Status: Terverifikasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-ENT-007",
      "reqId": "RN-ENT-007",
      "title": "Plot entres terawat optimal dan siap menghasilkan kayu entres berkualitas.",
      "role": "Mantri Bibitan",
      "module": "Kebun Entres",
      "moduleId": "07-kebun-entres",
      "feature": "Menunas Plot Entres",
      "featureId": "entres-menunas",
      "process": "Menunas Selesai",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Approval sukses.",
      "validation": "-",
      "fallback": "-",
      "output": "Plot siap panen entres berikutnya.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-HAR-001",
      "reqId": "RN-HAR-001",
      "title": "Panen mata entres menambah saldo stok resmi hanya setelah diverifikasi Asisten.",
      "role": "Mantri Bibitan",
      "module": "Panen Mata Entres",
      "moduleId": "08-panen-mata-entres",
      "feature": "Panen Mata Entres",
      "featureId": "panen-entres",
      "process": "Buka Panen Mata Entres",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Mata entres aktual panen",
      "validation": "Verifikasi Asisten Bibitan",
      "fallback": "Revisi jumlah panen",
      "output": "+ Stok Mata Entres",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-HAR-002",
      "reqId": "RN-HAR-002",
      "title": "Validasi fisik QR Code Plot Entres yang dipanen.",
      "role": "Mantri Bibitan",
      "module": "Panen Mata Entres",
      "moduleId": "08-panen-mata-entres",
      "feature": "Panen Mata Entres",
      "featureId": "panen-entres",
      "process": "Scan QR Plot Entres",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "QR Code Plot Entres.",
      "validation": "QR cocok dengan master clone.",
      "fallback": "Pilih manual jika QR rusak.",
      "output": "Plot entres dan clone terkonfirmasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-HAR-003",
      "reqId": "RN-HAR-003",
      "title": "Menginput jumlah cabang entres yang dipotong dan rata-rata mata entres per cabang.",
      "role": "Mantri Bibitan",
      "module": "Panen Mata Entres",
      "moduleId": "08-panen-mata-entres",
      "feature": "Panen Mata Entres",
      "featureId": "panen-entres",
      "process": "Input Cabang & Rata-rata Mata",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Jumlah Cabang dan Rata-rata Mata/Cabang.",
      "validation": "Cabang > 0 dan Rata-rata > 0.",
      "fallback": "Koreksi input.",
      "output": "Variabel perhitungan tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-HAR-004",
      "reqId": "RN-HAR-004",
      "title": "Sistem menghitung nilai estimasi perolehan mata entres.",
      "role": "Mantri Bibitan",
      "module": "Panen Mata Entres",
      "moduleId": "08-panen-mata-entres",
      "feature": "Panen Mata Entres",
      "featureId": "panen-entres",
      "process": "Hitung Estimasi Mata Entres",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Cabang x Rata-rata.",
      "validation": "Estimasi BUKAN stok resmi.",
      "fallback": "-",
      "output": "Estimasi ditampilkan di antarmuka.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-HAR-005",
      "reqId": "RN-HAR-005",
      "title": "Mantri mencatat jumlah mata entres riil/aktual yang siap digunakan/disimpan.",
      "role": "Mantri Bibitan",
      "module": "Panen Mata Entres",
      "moduleId": "08-panen-mata-entres",
      "feature": "Panen Mata Entres",
      "featureId": "panen-entres",
      "process": "Input Mata Entres Aktual",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Jumlah mata tunas layak pakai.",
      "validation": "Aktual >= 0.",
      "fallback": "Koreksi kuantitas sebelum submit.",
      "output": "Nilai aktual tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-HAR-006",
      "reqId": "RN-HAR-006",
      "title": "Foto ikatan cabang kayu entres yang dipanen beserta watermark timestamp ISO.",
      "role": "Mantri Bibitan",
      "module": "Panen Mata Entres",
      "moduleId": "08-panen-mata-entres",
      "feature": "Panen Mata Entres",
      "featureId": "panen-entres",
      "process": "Dokumentasi Foto + Timestamp",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Foto ikatan kayu entres berlabel clone.",
      "validation": "Foto wajib ada.",
      "fallback": "Ambil ulang jika gelap.",
      "output": "Foto audit tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-HAR-007",
      "reqId": "RN-HAR-007",
      "title": "Asisten Bibitan memeriksa fisik kayu entres dan menyetujui transaksi; stok resmi bertambah.",
      "role": "Asisten Bibitan",
      "module": "Panen Mata Entres",
      "moduleId": "08-panen-mata-entres",
      "feature": "Panen Mata Entres",
      "featureId": "panen-entres",
      "process": "Verifikasi Asisten & Tambah Stok",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Data panen dan persetujuan Asisten.",
      "validation": "Verifikasi Asisten disetujui.",
      "fallback": "Pengembalian dokumen jika tidak sesuai.",
      "output": "Saldo stok mata entres resmi bertambah (+ STOCK).",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-HAR-008",
      "reqId": "RN-HAR-008",
      "title": "Mata entres siap dialokasikan untuk Grafting, Regrafting, atau Permintaan bibitan.",
      "role": "Mantri Bibitan",
      "module": "Panen Mata Entres",
      "moduleId": "08-panen-mata-entres",
      "feature": "Panen Mata Entres",
      "featureId": "panen-entres",
      "process": "Stok Mata Entres Tersedia",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Stok bertambah di server production.",
      "validation": "-",
      "fallback": "-",
      "output": "Saldo entres siap dipakai.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MAT-001",
      "reqId": "RN-MAT-001",
      "title": "Dokumen gudang material wajib matching 1 Heading Kerja pemeliharaan.",
      "role": "Mantri Bibitan",
      "module": "Material & Bahan",
      "moduleId": "09-material-bahan",
      "feature": "Monitoring Mutasi Stok Mata Entres",
      "featureId": "monitoring-stok-entres",
      "process": "Buka Monitoring Material",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Dokumen pengeluaran gudang",
      "validation": "1 Dokumen Gudang = 1 Heading Kerja",
      "fallback": "Dokumen tidak dapat digunakan jika beda heading",
      "output": "Material melekat ke rekam pemeliharaan",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MAT-002",
      "reqId": "RN-MAT-002",
      "title": "Memilih kombinasi plot entres dan jenis klon untuk ditinjau mutasi stoknya.",
      "role": "Mantri Bibitan",
      "module": "Material & Bahan",
      "moduleId": "09-material-bahan",
      "feature": "Monitoring Mutasi Stok Mata Entres",
      "featureId": "monitoring-stok-entres",
      "process": "Pilih Plot Entres + Clone",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Daftar plot entres + clone.",
      "validation": "Plot entres terdaftar.",
      "fallback": "-",
      "output": "Buku mutasi klon terpilih.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MAT-003",
      "reqId": "RN-MAT-003",
      "title": "Audit penambahan (+ Panen Terverifikasi) vs pengurangan (- Okulasi, - Regrafting, - Pengeluaran).",
      "role": "Mantri Bibitan",
      "module": "Material & Bahan",
      "moduleId": "09-material-bahan",
      "feature": "Monitoring Mutasi Stok Mata Entres",
      "featureId": "monitoring-stok-entres",
      "process": "Audit Mutasi Masuk & Keluar",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Log mutasi sistem.",
      "validation": "Tidak boleh ada pengurangan stok manual tanpa transaksi.",
      "fallback": "Investigasi jika selisih.",
      "output": "Rincian audit mutasi ditampilkan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MAT-004",
      "reqId": "RN-MAT-004",
      "title": "Menarik dokumen pengeluaran gudang untuk pupuk, pestisida, dan plastik okulasi.",
      "role": "Mantri Bibitan",
      "module": "Material & Bahan",
      "moduleId": "09-material-bahan",
      "feature": "Monitoring Mutasi Stok Mata Entres",
      "featureId": "monitoring-stok-entres",
      "process": "Tarik Dokumen Gudang Material",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Nomor dokumen pengeluaran gudang.",
      "validation": "Dokumen gudang berstatus APPROVED.",
      "fallback": "-",
      "output": "Dokumen material siap dicocokkan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MAT-005",
      "reqId": "RN-MAT-005",
      "title": "Sistem memverifikasi kecocokan Heading Kerja dokumen gudang dengan rekam pemeliharaan.",
      "role": "Sistem",
      "module": "Material & Bahan",
      "moduleId": "09-material-bahan",
      "feature": "Monitoring Mutasi Stok Mata Entres",
      "featureId": "monitoring-stok-entres",
      "process": "Matching Heading Kerja?",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Heading dokumen gudang vs Heading aktivitas pemeliharaan.",
      "validation": "Heading harus persis sama.",
      "fallback": "Jika tidak matching: Dokumen ditolak sistem.",
      "output": "Status kecocokan heading.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MAT-006",
      "reqId": "RN-MAT-006",
      "title": "Notifikasi Mantri berhasil; dokumen material melekat pada rekam pemeliharaan.",
      "role": "Mantri Bibitan",
      "module": "Material & Bahan",
      "moduleId": "09-material-bahan",
      "feature": "Monitoring Mutasi Stok Mata Entres",
      "featureId": "monitoring-stok-entres",
      "process": "Lekatkan Dokumen & Verifikasi",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Dokumen matching.",
      "validation": "Asisten Bibitan memverifikasi pemakaian material.",
      "fallback": "-",
      "output": "Material resmi terpakai.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MAT-007",
      "reqId": "RN-MAT-007",
      "title": "Seluruh material dan mutasi stok tercatat rapi dan dapat dipertanggungjawabkan.",
      "role": "Mantri Bibitan",
      "module": "Material & Bahan",
      "moduleId": "09-material-bahan",
      "feature": "Monitoring Mutasi Stok Mata Entres",
      "featureId": "monitoring-stok-entres",
      "process": "Material & Saldo Sah",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Data tersinkron.",
      "validation": "-",
      "fallback": "-",
      "output": "Ledger material sah.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MNT-001",
      "reqId": "RN-MNT-001",
      "title": "Membuka pencatatan aktivitas pemeliharaan tanaman karet di pembibitan.",
      "role": "Mantri Bibitan",
      "module": "Rekam Pemeliharaan",
      "moduleId": "10-rekam-pemeliharaan",
      "feature": "Rekam Aktivitas Pemeliharaan",
      "featureId": "pemeliharaan-heading",
      "process": "Buka Rekam Pemeliharaan",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Sesi aktif Mantri.",
      "validation": "Presensi harian selesai.",
      "fallback": "-",
      "output": "Form pemeliharaan terbuka.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MNT-002",
      "reqId": "RN-MNT-002",
      "title": "Memilih Grup Heading Pembibitan dan Heading Kerja spesifik.",
      "role": "Mantri Bibitan",
      "module": "Rekam Pemeliharaan",
      "moduleId": "10-rekam-pemeliharaan",
      "feature": "Rekam Aktivitas Pemeliharaan",
      "featureId": "pemeliharaan-heading",
      "process": "Pilih Grup & Heading Kerja",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Master data heading kerja nursery.",
      "validation": "Heading kerja aktif.",
      "fallback": "-",
      "output": "Heading kerja dan UOM terpasang.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MNT-003",
      "reqId": "RN-MNT-003",
      "title": "Memilih objek kerja (Batch / Bedengan / Plot Entres / Blok) dan memindai QR Code jika wajib.",
      "role": "Mantri Bibitan",
      "module": "Rekam Pemeliharaan",
      "moduleId": "10-rekam-pemeliharaan",
      "feature": "Rekam Aktivitas Pemeliharaan",
      "featureId": "pemeliharaan-heading",
      "process": "Pilih Objek & Scan QR",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "QR Code objek sasaran.",
      "validation": "Objek aktif dan sesuai areal kerja.",
      "fallback": "Pilih manual dengan alasan.",
      "output": "Objek pemeliharaan terverifikasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MNT-004",
      "reqId": "RN-MNT-004",
      "title": "Mencatat pekerja pelaksana dan total kuantitas hasil kerja sesuai satuan UOM.",
      "role": "Mantri Bibitan",
      "module": "Rekam Pemeliharaan",
      "moduleId": "10-rekam-pemeliharaan",
      "feature": "Rekam Aktivitas Pemeliharaan",
      "featureId": "pemeliharaan-heading",
      "process": "Input Pekerja & Jumlah Output",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Daftar pekerja hadir dan kuantitas output.",
      "validation": "Pekerja hadir pada presensi hari ini.",
      "fallback": "Pencarian pekerja manual.",
      "output": "Hasil kerja per pekerja tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MNT-005",
      "reqId": "RN-MNT-005",
      "title": "Foto dokumentasi fisik saat pelaksanaan aktivitas di barisan tanaman.",
      "role": "Mantri Bibitan",
      "module": "Rekam Pemeliharaan",
      "moduleId": "10-rekam-pemeliharaan",
      "feature": "Rekam Aktivitas Pemeliharaan",
      "featureId": "pemeliharaan-heading",
      "process": "Foto Dokumentasi + Timestamp",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Foto kamera lapangan.",
      "validation": "Foto wajib diunggah.",
      "fallback": "Ambil ulang foto.",
      "output": "Foto audit tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MNT-006",
      "reqId": "RN-MNT-006",
      "title": "Sistem memeriksa dokumen gudang yang matching heading; lekatkan jika tersedia.",
      "role": "Mantri Bibitan",
      "module": "Rekam Pemeliharaan",
      "moduleId": "10-rekam-pemeliharaan",
      "feature": "Rekam Aktivitas Pemeliharaan",
      "featureId": "pemeliharaan-heading",
      "process": "Cek & Lekatkan Material Gudang",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Dokumen gudang ber-heading sama.",
      "validation": "1 Dokumen Gudang = 1 Heading Kerja.",
      "fallback": "Lanjut tanpa dokumen jika pekerjaan tanpa bahan.",
      "output": "Material terikat pada aktivitas.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MNT-007",
      "reqId": "RN-MNT-007",
      "title": "Mengirimkan berkas aktivitas pemeliharaan ke Asisten Bibitan untuk disetujui.",
      "role": "Mantri Bibitan",
      "module": "Rekam Pemeliharaan",
      "moduleId": "10-rekam-pemeliharaan",
      "feature": "Rekam Aktivitas Pemeliharaan",
      "featureId": "pemeliharaan-heading",
      "process": "Submit & Verifikasi Asisten",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Berkas lengkap.",
      "validation": "Jika disetujui, data masuk server production.",
      "fallback": "Revisi jika hasil kerja kurang rapi.",
      "output": "Status: Terverifikasi Production.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MNT-008",
      "reqId": "RN-MNT-008",
      "title": "Aktivitas pemeliharaan selesai dan tercatat resmi pada riwayat objek tanaman.",
      "role": "Mantri Bibitan",
      "module": "Rekam Pemeliharaan",
      "moduleId": "10-rekam-pemeliharaan",
      "feature": "Rekam Aktivitas Pemeliharaan",
      "featureId": "pemeliharaan-heading",
      "process": "Pemeliharaan Selesai",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Sinkronisasi berhasil.",
      "validation": "-",
      "fallback": "-",
      "output": "Riwayat pemeliharaan tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-EXP-001",
      "reqId": "RN-EXP-001",
      "title": "Pengeluaran bibit dan mata entres berbasis dokumen permintaan (SPB/DO) yang telah disetujui.",
      "role": "Mantri Bibitan",
      "module": "Pengeluaran",
      "moduleId": "11-pengeluaran",
      "feature": "Pengeluaran Bibit (SPB Disetujui)",
      "featureId": "pengeluaran-bibit",
      "process": "Buka Pengeluaran Bibit",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Dokumen SPB approved",
      "validation": "Scan QR Batch fisik & foto muatan",
      "fallback": "Pilih manual jika QR rusak",
      "output": "Pengeluaran bibit terlaksana",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-EXP-002",
      "reqId": "RN-EXP-002",
      "title": "Mantri memilih dokumen SPB yang akan dimuat ke armada transportasi.",
      "role": "Mantri Bibitan",
      "module": "Pengeluaran",
      "moduleId": "11-pengeluaran",
      "feature": "Pengeluaran Bibit (SPB Disetujui)",
      "featureId": "pengeluaran-bibit",
      "process": "Pilih Dokumen Permintaan",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Daftar dokumen SPB approved.",
      "validation": "Dokumen berstatus APPROVED dan memiliki sisa alokasi.",
      "fallback": "-",
      "output": "Dokumen SPB dan kuota tampil.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-EXP-003",
      "reqId": "RN-EXP-003",
      "title": "Validasi fisik QR Code Batch bibit di petak yang siap salur.",
      "role": "Mantri Bibitan",
      "module": "Pengeluaran",
      "moduleId": "11-pengeluaran",
      "feature": "Pengeluaran Bibit (SPB Disetujui)",
      "featureId": "pengeluaran-bibit",
      "process": "Scan QR Batch Bibit",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "QR Code Batch fisik.",
      "validation": "Batch berstatus Siap Salur dan klon cocok dengan SPB.",
      "fallback": "Pilih manual jika QR rusak.",
      "output": "Batch terkonfirmasi sah.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-EXP-004",
      "reqId": "RN-EXP-004",
      "title": "Mencatat jumlah batang bibit aktual yang dinaikkan ke bak truk/armada angkut.",
      "role": "Mantri Bibitan",
      "module": "Pengeluaran",
      "moduleId": "11-pengeluaran",
      "feature": "Pengeluaran Bibit (SPB Disetujui)",
      "featureId": "pengeluaran-bibit",
      "process": "Input Kuantitas Aktual Dimuat",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Jumlah batang bibit naik truk.",
      "validation": "Aktual <= sisa kuota SPB dan <= populasi hidup Batch.",
      "fallback": "Koreksi hitung.",
      "output": "Kuantitas aktual muat tercatat.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-EXP-005",
      "reqId": "RN-EXP-005",
      "title": "Foto dokumentasi fisik bibit yang tersusun rapi di atas armada angkut beserta nomor polisi.",
      "role": "Mantri Bibitan",
      "module": "Pengeluaran",
      "moduleId": "11-pengeluaran",
      "feature": "Pengeluaran Bibit (SPB Disetujui)",
      "featureId": "pengeluaran-bibit",
      "process": "Foto Muatan Armada + Timestamp",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Foto truk bermuatan bibit.",
      "validation": "Foto wajib diunggah.",
      "fallback": "Ambil ulang jika buram.",
      "output": "Foto bukti muat tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-EXP-006",
      "reqId": "RN-EXP-006",
      "title": "Asisten Bibitan memeriksa muatan dan menyetujui transaksi; populasi Batch resmi terpotong.",
      "role": "Asisten Bibitan",
      "module": "Pengeluaran",
      "moduleId": "11-pengeluaran",
      "feature": "Pengeluaran Bibit (SPB Disetujui)",
      "featureId": "pengeluaran-bibit",
      "process": "Verifikasi Asisten & Kurangi Populasi",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Data muat dan foto armada.",
      "validation": "Verifikasi Asisten sah.",
      "fallback": "Turunkan muatan jika ada ketidaksesuaian.",
      "output": "Populasi Batch resmi berkurang; Surat Jalan terbit.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-EXP-007",
      "reqId": "RN-EXP-007",
      "title": "Armada berangkat menuju divisi tanam; transaksi pengeluaran bibit selesai.",
      "role": "Mantri Bibitan",
      "module": "Pengeluaran",
      "moduleId": "11-pengeluaran",
      "feature": "Pengeluaran Bibit (SPB Disetujui)",
      "featureId": "pengeluaran-bibit",
      "process": "Bibit Diberangkatkan ke Kebun",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Surat jalan aktif.",
      "validation": "-",
      "fallback": "-",
      "output": "Transaksi Completed.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-EXM-001",
      "reqId": "RN-EXM-001",
      "title": "Pengeluaran mata entres berdasarkan dokumen permintaan yang telah disetujui.",
      "role": "Mantri Bibitan",
      "module": "Pengeluaran",
      "moduleId": "11-pengeluaran",
      "feature": "Pengeluaran Mata Entres",
      "featureId": "pengeluaran-mata-entres",
      "process": "Buka Pengeluaran Mata Entres",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Dokumen permintaan approved.",
      "validation": "Mantri tidak memilih clone baru (clone melekat pada dokumen).",
      "fallback": "-",
      "output": "Dokumen dan clone teridentifikasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-EXM-002",
      "reqId": "RN-EXM-002",
      "title": "Validasi fisik QR Code Plot Entres penyedia clone terkait (Bukan Batch).",
      "role": "Mantri Bibitan",
      "module": "Pengeluaran",
      "moduleId": "11-pengeluaran",
      "feature": "Pengeluaran Mata Entres",
      "featureId": "pengeluaran-mata-entres",
      "process": "Scan QR Plot Entres",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "QR Code Plot Entres.",
      "validation": "Clone plot cocok dengan clone dokumen permintaan.",
      "fallback": "Pilih manual jika QR rusak.",
      "output": "Plot entres terverifikasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-EXM-003",
      "reqId": "RN-EXM-003",
      "title": "Menginput jumlah cabang dan kuantitas mata entres aktual yang dipotong untuk dikirim.",
      "role": "Mantri Bibitan",
      "module": "Pengeluaran",
      "moduleId": "11-pengeluaran",
      "feature": "Pengeluaran Mata Entres",
      "featureId": "pengeluaran-mata-entres",
      "process": "Input Cabang & Catat Mata Aktual",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Jumlah cabang dan mata tunas aktual.",
      "validation": "Mata entres aktual <= saldo stok Plot Entres + Clone.",
      "fallback": "Peringatan saldo kurang.",
      "output": "Kuantitas pengeluaran tercatat.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-EXM-004",
      "reqId": "RN-EXM-004",
      "title": "Foto ikatan cabang kayu entres dan verifikasi persetujuan oleh Asisten Bibitan.",
      "role": "Mantri Bibitan",
      "module": "Pengeluaran",
      "moduleId": "11-pengeluaran",
      "feature": "Pengeluaran Mata Entres",
      "featureId": "pengeluaran-mata-entres",
      "process": "Foto + Timestamp & Verifikasi",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Foto paket kayu entres.",
      "validation": "Verifikasi Asisten sah.",
      "fallback": "Revisi berkas.",
      "output": "Stok mata entres resmi berkurang (- STOCK).",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-EXM-005",
      "reqId": "RN-EXM-005",
      "title": "Mata entres siap dikirim ke unit peminta; siklus pengeluaran entres tuntas.",
      "role": "Mantri Bibitan",
      "module": "Pengeluaran",
      "moduleId": "11-pengeluaran",
      "feature": "Pengeluaran Mata Entres",
      "featureId": "pengeluaran-mata-entres",
      "process": "Mata Entres Terkirim",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Status disetujui.",
      "validation": "-",
      "fallback": "-",
      "output": "Surat jalan kirim terbit.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-KSP016",
      "reqId": "RN-RCV-KSP016",
      "title": "Pengurus Kebun Peminta mengajukan SPB bibit karet untuk penanaman di kebun.",
      "role": "Pengurus Kebun Peminta",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Bibit - Kebun Sepupu",
      "featureId": "terima-kebun-sepupu",
      "process": "Asisten Divisi Buat Permintaan Bibit",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Rencana tanam, klon yang diminta, dan jumlah bibit.",
      "validation": "Kebutuhan bibit sesuai luas areal tanam.",
      "fallback": "Revisi permohonan.",
      "output": "Dokumen Permintaan Bibit diajukan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-KSP017",
      "reqId": "RN-RCV-KSP017",
      "title": "Asisten Kepala meninjau permintaan bibit dan memeriksa ketersediaan stok bibit siap salur.",
      "role": "Asisten Kepala",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Bibit - Kebun Sepupu",
      "featureId": "terima-kebun-sepupu",
      "process": "Asisten Kepala Review & Cek Stok",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Dokumen permintaan bibit vs saldo bibit siap salur.",
      "validation": "Klon dan umur bibit memenuhi syarat tanam.",
      "fallback": "Negosiasi jumlah atau jadwal kirim.",
      "output": "Keputusan ketersediaan stok.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-KSP018",
      "reqId": "RN-RCV-KSP018",
      "title": "Stok cukup: Approve & teruskan ke Asisten Bibitan; Stok tidak cukup: Koreksi/Batalkan.",
      "role": "Asisten Kepala",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Bibit - Kebun Sepupu",
      "featureId": "terima-kebun-sepupu",
      "process": "Keputusan Stok Cukup?",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Hasil audit ketersediaan batch.",
      "validation": "Stok bibit siap salur >= kuantitas diminta.",
      "fallback": "Jalur alternatif koreksi kuantitas.",
      "output": "Arah alur proses ditentukan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-KSP019",
      "reqId": "RN-RCV-KSP019",
      "title": "Asisten Bibitan menindaklanjuti; Mantri Bibitan mengeksekusi muat dan pengeluaran bibit.",
      "role": "Mantri Bibitan",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Bibit - Kebun Sepupu",
      "featureId": "terima-kebun-sepupu",
      "process": "Mantri Bibitan Pengeluaran Bibit",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Dokumen SPB, armada angkut, dan fisik batch bibit.",
      "validation": "Jumlah bibit sesuai dokumen SPB.",
      "fallback": "Scan manual jika QR rusak.",
      "output": "Surat jalan pengiriman bibit terbit.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-KSP020",
      "reqId": "RN-RCV-KSP020",
      "title": "Pengurus Kebun Peminta menerima bibit di lokasi tanam, memeriksa fisik, dan mengonfirmasi penerimaan.",
      "role": "Pengurus Kebun Peminta",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Bibit - Kebun Sepupu",
      "featureId": "terima-kebun-sepupu",
      "process": "Asisten Divisi Verifikasi Penerimaan",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Fisik bibit tiba di divisi dan surat jalan kirim.",
      "validation": "Bibit diterima dalam kondisi hidup dan segar.",
      "fallback": "Pencatatan bibit rusak di perjalanan.",
      "output": "Transaksi penerimaan selesai dan tercatat di buku kebun divisi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-KSP021",
      "reqId": "RN-RCV-KSP021",
      "title": "Seluruh tahapan permohonan hingga penerimaan bibit kebun sepupu selesai terverifikasi.",
      "role": "Pengurus Kebun Peminta",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Bibit - Kebun Sepupu",
      "featureId": "terima-kebun-sepupu",
      "process": "Penerimaan Bibit Tuntas",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Verifikasi sukses.",
      "validation": "-",
      "fallback": "-",
      "output": "Data mutasi produksi tersinkron penuh.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-ME022",
      "reqId": "RN-RCV-ME022",
      "title": "Pengurus Kebun Peminta mengajukan SPB mata entres karet untuk penanaman di kebun.",
      "role": "Pengurus Kebun Peminta",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Mata Entres",
      "featureId": "terima-mata-entres",
      "process": "Asisten Divisi Buat Permintaan Bibit",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Rencana tanam, klon yang diminta, dan jumlah bibit.",
      "validation": "Kebutuhan bibit sesuai luas areal tanam.",
      "fallback": "Revisi permohonan.",
      "output": "Dokumen Permintaan Bibit diajukan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-ME023",
      "reqId": "RN-RCV-ME023",
      "title": "Asisten Kepala meninjau permintaan mata entres dan memeriksa ketersediaan stok mata entres siap salur.",
      "role": "Asisten Kepala",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Mata Entres",
      "featureId": "terima-mata-entres",
      "process": "Asisten Kepala Review & Cek Stok",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Dokumen permintaan bibit vs saldo bibit siap salur.",
      "validation": "Klon dan umur bibit memenuhi syarat tanam.",
      "fallback": "Negosiasi jumlah atau jadwal kirim.",
      "output": "Keputusan ketersediaan stok.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-ME024",
      "reqId": "RN-RCV-ME024",
      "title": "Stok cukup: Approve & teruskan ke Asisten Bibitan; Stok tidak cukup: Koreksi/Batalkan.",
      "role": "Asisten Kepala",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Mata Entres",
      "featureId": "terima-mata-entres",
      "process": "Keputusan Stok Cukup?",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Hasil audit ketersediaan batch.",
      "validation": "Stok bibit siap salur >= kuantitas diminta.",
      "fallback": "Jalur alternatif koreksi kuantitas.",
      "output": "Arah alur proses ditentukan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-ME025",
      "reqId": "RN-RCV-ME025",
      "title": "Asisten Bibitan menindaklanjuti; Mantri Bibitan mengeksekusi muat dan pengeluaran mata entres.",
      "role": "Mantri Bibitan",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Mata Entres",
      "featureId": "terima-mata-entres",
      "process": "Mantri Bibitan Pengeluaran Bibit",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Dokumen SPB, armada angkut, dan fisik batch bibit.",
      "validation": "Jumlah bibit sesuai dokumen SPB.",
      "fallback": "Scan manual jika QR rusak.",
      "output": "Surat jalan pengiriman bibit terbit.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-ME026",
      "reqId": "RN-RCV-ME026",
      "title": "Pengurus Kebun Peminta menerima mata entres di lokasi tanam, memeriksa fisik, dan mengonfirmasi penerimaan.",
      "role": "Pengurus Kebun Peminta",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Mata Entres",
      "featureId": "terima-mata-entres",
      "process": "Asisten Divisi Verifikasi Penerimaan",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Fisik bibit tiba di divisi dan surat jalan kirim.",
      "validation": "Bibit diterima dalam kondisi hidup dan segar.",
      "fallback": "Pencatatan bibit rusak di perjalanan.",
      "output": "Transaksi penerimaan selesai dan tercatat di buku kebun divisi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-RCV-ME027",
      "reqId": "RN-RCV-ME027",
      "title": "Seluruh tahapan permohonan hingga penerimaan mata entres kebun sepupu selesai terverifikasi.",
      "role": "Pengurus Kebun Peminta",
      "module": "Penerimaan",
      "moduleId": "02-penerimaan",
      "feature": "Penerimaan Mata Entres",
      "featureId": "terima-mata-entres",
      "process": "Penerimaan Bibit Tuntas",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Verifikasi sukses.",
      "validation": "-",
      "fallback": "-",
      "output": "Data mutasi produksi tersinkron penuh.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEM-TP028",
      "reqId": "RN-SEM-TP028",
      "title": "Satu dokumen penerimaan benih dapat dialokasikan ke beberapa polybag.",
      "role": "Mantri Bibitan",
      "module": "Penyemaian",
      "moduleId": "03-penyemaian",
      "feature": "Transplanting ke Polybag (Batch)",
      "featureId": "transplanting-polybag",
      "process": "Pilih Dokumen Penerimaan Benih",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Dokumen penerimaan benih",
      "validation": "Sisa saldo benih > 0",
      "fallback": "Alokasi bertahap",
      "output": "Penyemaian multi-bedengan",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEM-TP029",
      "reqId": "RN-SEM-TP029",
      "title": "Memindai QR Code fisik pada plang polybag pembibitan.",
      "role": "Mantri Bibitan",
      "module": "Penyemaian",
      "moduleId": "03-penyemaian",
      "feature": "Transplanting ke Polybag (Batch)",
      "featureId": "transplanting-polybag",
      "process": "Scan QR Bedengan",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "QR Code fisik pada plang nomor bedengan.",
      "validation": "Bedengan terdaftar di master areal bibitan dan berstatus siap tabur.",
      "fallback": "Jika QR rusak: Pilih Bedengan secara manual dari daftar.",
      "output": "Identitas bedengan tervalidasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEM-TP030",
      "reqId": "RN-SEM-TP030",
      "title": "Mantri menginput jumlah butir benih yang ditransplanting dan jumlah benih afkir/rusak.",
      "role": "Mantri Bibitan",
      "module": "Penyemaian",
      "moduleId": "03-penyemaian",
      "feature": "Transplanting ke Polybag (Batch)",
      "featureId": "transplanting-polybag",
      "process": "Input Jumlah Disemai & Reject",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Jumlah disemai (butir) dan jumlah reject (butir).",
      "validation": "Jumlah disemai + reject <= sisa benih pada dokumen penerimaan.",
      "fallback": "Koreksi kuantitas sebelum disimpan.",
      "output": "Kuantitas semai dan reject tercatat.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEM-TP031",
      "reqId": "RN-SEM-TP031",
      "title": "Foto bukti fisik benih reject/rusak dengan watermark timestamp ISO dan GPS.",
      "role": "Mantri Bibitan",
      "module": "Penyemaian",
      "moduleId": "03-penyemaian",
      "feature": "Transplanting ke Polybag (Batch)",
      "featureId": "transplanting-polybag",
      "process": "Foto Benih Tidak Layak + Timestamp",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Foto benih reject di atas nampan/karung.",
      "validation": "Jika reject > 0, foto benih reject wajib diunggah.",
      "fallback": "Ambil ulang foto.",
      "output": "Foto bukti reject tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEM-TP032",
      "reqId": "RN-SEM-TP032",
      "title": "Asisten menyetujui pemindahan benih kecambah dari bedengan ke polybag.",
      "role": "Mantri Bibitan",
      "module": "Penyemaian",
      "moduleId": "03-penyemaian",
      "feature": "Transplanting ke Polybag (Batch)",
      "featureId": "transplanting-polybag",
      "process": "Verifikasi Asisten & ±12–15 Hari Semai",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Jadwal hari setelah semai (HSS).",
      "validation": "Umur semai mencapai ±12–15 hari.",
      "fallback": "Pemeriksaan manual jika perkecambahan lambat.",
      "output": "Kecambah siap transplanting ke polybag.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEM-TP033",
      "reqId": "RN-SEM-TP033",
      "title": "Transplanting ke polybag menggunakan rasio 1 Polybag = 2 Benih/Bibit.",
      "role": "Mantri Bibitan",
      "module": "Penyemaian",
      "moduleId": "03-penyemaian",
      "feature": "Transplanting ke Polybag (Batch)",
      "featureId": "transplanting-polybag",
      "process": "Transplanting ke Polybag (1 Polybag = 2 Benih)",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Kecambah fase jarum",
      "validation": "Tepat 2 kecambah per polybag",
      "fallback": "Penyulaman manual",
      "output": "Polybag terisi 2 bibit",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEM-TP034",
      "reqId": "RN-SEM-TP034",
      "title": "Satu Batch bibitan dapat dikonsolidasi dari beberapa polybag.",
      "role": "Mantri Bibitan",
      "module": "Penyemaian",
      "moduleId": "03-penyemaian",
      "feature": "Transplanting ke Polybag (Batch)",
      "featureId": "transplanting-polybag",
      "process": "Konsolidasi Multi-Bedengan ke Batch",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Kumpulan bedengan siap polybag",
      "validation": "Clone dan petak seragam",
      "fallback": "Pemisahan batch",
      "output": "Batch resmi terbentuk",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-SEM-TP035",
      "reqId": "RN-SEM-TP035",
      "title": "Batch polybag telah terdaftar dan siap dipelihara hingga mencapai ukuran okulasi.",
      "role": "Mantri Bibitan",
      "module": "Penyemaian",
      "moduleId": "03-penyemaian",
      "feature": "Transplanting ke Polybag (Batch)",
      "featureId": "transplanting-polybag",
      "process": "Batch Siap Masuk Siklus Okulasi",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Batch terverifikasi Asisten Bibitan.",
      "validation": "Status Batch: Aktif Siap Okulasi.",
      "fallback": "-",
      "output": "Batch siap diokulasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-CHK-RG036",
      "reqId": "RN-CHK-RG036",
      "title": "Pemeriksaan bersifat dinamis dan dapat dilakukan bertahap.",
      "role": "Mantri Bibitan",
      "module": "Pemeriksaan",
      "moduleId": "05-pemeriksaan",
      "feature": "Pemeriksaan Regrafting",
      "featureId": "periksa-regrafting",
      "process": "Buka Pemeriksaan",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Dokumen berkewajiban periksa",
      "validation": "Jumlah periksa <= sisa periksa",
      "fallback": "Sisa tetap muncul di antrean",
      "output": "Hasil berhasil vs gagal",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-CHK-RG037",
      "reqId": "RN-CHK-RG037",
      "title": "Bibit gagal dapat ditentukan untuk Regrafting kembali atau Reject.",
      "role": "Mantri Bibitan",
      "module": "Pemeriksaan",
      "moduleId": "05-pemeriksaan",
      "feature": "Pemeriksaan Regrafting",
      "featureId": "periksa-regrafting",
      "process": "Pilih Dokumen Okulasi",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Kuantitas bibit gagal",
      "validation": "Pilihan Mantri: Regrafting vs Reject",
      "fallback": "Tidak dibatasi 1x regrafting",
      "output": "Tindak lanjut terdaftar",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-CHK-RG038",
      "reqId": "RN-CHK-RG038",
      "title": "Validasi fisik QR Code Batch yang diperiksa.",
      "role": "Mantri Bibitan",
      "module": "Pemeriksaan",
      "moduleId": "05-pemeriksaan",
      "feature": "Pemeriksaan Regrafting",
      "featureId": "periksa-regrafting",
      "process": "Scan QR Batch",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "QR Code Batch fisik.",
      "validation": "Batch cocok dengan dokumen okulasi.",
      "fallback": "Pilih manual jika QR rusak.",
      "output": "Batch tervalidasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-CHK-RG039",
      "reqId": "RN-CHK-RG039",
      "title": "Menginput jumlah batang yang diperiksa pada sesi ini (misal 600 dari 1.000).",
      "role": "Mantri Bibitan",
      "module": "Pemeriksaan",
      "moduleId": "05-pemeriksaan",
      "feature": "Pemeriksaan Regrafting",
      "featureId": "periksa-regrafting",
      "process": "Input Bibit Diperiksa Bertahap",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Jumlah bibit diperiksa.",
      "validation": "Jumlah diperiksa <= sisa belum periksa.",
      "fallback": "-",
      "output": "Sisa pemeriksaan tetap tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-CHK-RG040",
      "reqId": "RN-CHK-RG040",
      "title": "Mencatat jumlah mata tempelan yang hijau (berhasil) vs hitam/mati (gagal).",
      "role": "Mantri Bibitan",
      "module": "Pemeriksaan",
      "moduleId": "05-pemeriksaan",
      "feature": "Pemeriksaan Regrafting",
      "featureId": "periksa-regrafting",
      "process": "Input Berhasil & Gagal",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Jumlah berhasil dan jumlah gagal.",
      "validation": "Total Berhasil + Gagal = Jumlah Diperiksa.",
      "fallback": "Hitung ulang jika ada selisih.",
      "output": "Data perolehan berhasil & gagal tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-CHK-RG041",
      "reqId": "RN-CHK-RG041",
      "title": "Mantri menentukan tindak lanjut bibit yang gagal: Regrafting kembali atau Reject.",
      "role": "Mantri Bibitan",
      "module": "Pemeriksaan",
      "moduleId": "05-pemeriksaan",
      "feature": "Pemeriksaan Regrafting",
      "featureId": "periksa-regrafting",
      "process": "Tindak Lanjut Bibit Gagal",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Kuantitas bibit gagal dan kondisi visual batang.",
      "validation": "Keputusan ditentukan sepenuhnya oleh Mantri Bibitan.",
      "fallback": "Konsultasi Asisten jika ragu.",
      "output": "Kuota regrafting atau reject tercatat.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-CHK-RG042",
      "reqId": "RN-CHK-RG042",
      "title": "Foto bukti fisik mata tempelan berhasil dan gagal beserta watermark.",
      "role": "Mantri Bibitan",
      "module": "Pemeriksaan",
      "moduleId": "05-pemeriksaan",
      "feature": "Pemeriksaan Regrafting",
      "featureId": "periksa-regrafting",
      "process": "Dokumentasi Foto + Timestamp",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Foto mata tunas okulasi.",
      "validation": "Foto wajib diunggah.",
      "fallback": "Ambil ulang foto.",
      "output": "Foto audit tersimpan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-CHK-RG043",
      "reqId": "RN-CHK-RG043",
      "title": "Mengirim hasil pemeriksaan ke Asisten Bibitan untuk disetujui.",
      "role": "Mantri Bibitan",
      "module": "Pemeriksaan",
      "moduleId": "05-pemeriksaan",
      "feature": "Pemeriksaan Regrafting",
      "featureId": "periksa-regrafting",
      "process": "Submit & Verifikasi Asisten",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Data pemeriksaan lengkap.",
      "validation": "Jika disetujui, data masuk server production.",
      "fallback": "Koreksi jika ada selisih hitung.",
      "output": "Status: Terverifikasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-CHK-RG044",
      "reqId": "RN-CHK-RG044",
      "title": "Pemeriksaan tuntas; bibit berhasil lanjut tumbuh, bibit gagal siap di-Regrafting kembali atau di-Reject.",
      "role": "Mantri Bibitan",
      "module": "Pemeriksaan",
      "moduleId": "05-pemeriksaan",
      "feature": "Pemeriksaan Regrafting",
      "featureId": "periksa-regrafting",
      "process": "Selesai Pemeriksaan",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Status verified.",
      "validation": "-",
      "fallback": "-",
      "output": "Data siap untuk siklus selanjutnya.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-ENT-TOP045",
      "reqId": "RN-ENT-TOP045",
      "title": "Aktivitas topping menghitung rasio Perisai/Kayu dan Perisai/Meter.",
      "role": "Mantri Bibitan",
      "module": "Kebun Entres",
      "moduleId": "07-kebun-entres",
      "feature": "Topping Plot Entres",
      "featureId": "entres-topping",
      "process": "Buka Menunas Entres",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Perisai, cabang, panjang meter",
      "validation": "Perhitungan matematis otomatis",
      "fallback": "Koreksi input",
      "output": "Rasio kualitas entres",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-ENT-TOP046",
      "reqId": "RN-ENT-TOP046",
      "title": "Validasi QR Code plang fisik plot entres yang dirawat.",
      "role": "Mantri Bibitan",
      "module": "Kebun Entres",
      "moduleId": "07-kebun-entres",
      "feature": "Topping Plot Entres",
      "featureId": "entres-topping",
      "process": "Scan QR Plot Entres",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "QR Code Plot Entres.",
      "validation": "QR plot entres valid.",
      "fallback": "Pilih manual plot jika QR rusak.",
      "output": "Identitas plot terverifikasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-ENT-TOP047",
      "reqId": "RN-ENT-TOP047",
      "title": "Sistem menyajikan data clone dan jumlah pokok tanaman induk per plot.",
      "role": "Mantri Bibitan",
      "module": "Kebun Entres",
      "moduleId": "07-kebun-entres",
      "feature": "Topping Plot Entres",
      "featureId": "entres-topping",
      "process": "Tampilkan Clone & Pokok",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Master data plot entres.",
      "validation": "Populasi pokok terdefinisi.",
      "fallback": "-",
      "output": "Data clone & pokok tampil.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-ENT-TOP048",
      "reqId": "RN-ENT-TOP048",
      "title": "Mantri menginput Tanggal, Jumlah Kayu Okulasi, Total Panjang Meter, dan Jumlah Perisai.",
      "role": "Mantri Bibitan",
      "module": "Kebun Entres",
      "moduleId": "07-kebun-entres",
      "feature": "Topping Plot Entres",
      "featureId": "entres-topping",
      "process": "Input Variabel Menunas",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Tanggal, Perisai, Cabang, Panjang Meter.",
      "validation": "Seluruh angka > 0.",
      "fallback": "Koreksi input.",
      "output": "Data variabel tersimpan di form.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-ENT-TOP049",
      "reqId": "RN-ENT-TOP049",
      "title": "Sistem menghitung Rata-rata Perisai/Kayu dan Rata-rata Perisai/Meter.",
      "role": "Mantri Bibitan",
      "module": "Kebun Entres",
      "moduleId": "07-kebun-entres",
      "feature": "Topping Plot Entres",
      "featureId": "entres-topping",
      "process": "Hitung Rata-rata Otomatis",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Perisai / Cabang dan Perisai / Panjang Meter.",
      "validation": "Perhitungan matematis otomatis valid.",
      "fallback": "-",
      "output": "Indeks rata-rata tampil di layar.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-ENT-TOP050",
      "reqId": "RN-ENT-TOP050",
      "title": "Foto dokumentasi plot setelah ditopping beserta timestamp, diteruskan ke Asisten Bibitan.",
      "role": "Mantri Bibitan",
      "module": "Kebun Entres",
      "moduleId": "07-kebun-entres",
      "feature": "Topping Plot Entres",
      "featureId": "entres-topping",
      "process": "Foto + Timestamp & Verifikasi",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Foto pokok entres bersih tunas air.",
      "validation": "Foto wajib diunggah.",
      "fallback": "Ambil ulang jika buram.",
      "output": "Status: Terverifikasi.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-ENT-TOP051",
      "reqId": "RN-ENT-TOP051",
      "title": "Plot entres terawat optimal dan siap menghasilkan kayu entres berkualitas.",
      "role": "Mantri Bibitan",
      "module": "Kebun Entres",
      "moduleId": "07-kebun-entres",
      "feature": "Topping Plot Entres",
      "featureId": "entres-topping",
      "process": "Menunas Selesai",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Approval sukses.",
      "validation": "-",
      "fallback": "-",
      "output": "Plot siap panen entres berikutnya.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MAT-MMG052",
      "reqId": "RN-MAT-MMG052",
      "title": "Dokumen gudang material wajib matching 1 Heading Kerja pemeliharaan.",
      "role": "Mantri Bibitan",
      "module": "Material & Bahan",
      "moduleId": "09-material-bahan",
      "feature": "Matching Material Dokumen Gudang",
      "featureId": "material-gudang-matching",
      "process": "Buka Monitoring Material",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Dokumen pengeluaran gudang",
      "validation": "1 Dokumen Gudang = 1 Heading Kerja",
      "fallback": "Dokumen tidak dapat digunakan jika beda heading",
      "output": "Material melekat ke rekam pemeliharaan",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MAT-MMG053",
      "reqId": "RN-MAT-MMG053",
      "title": "Memilih rentang waktu dan jenis material gudang untuk ditinjau rekonsiliasinya.",
      "role": "Mantri Bibitan",
      "module": "Material & Bahan",
      "moduleId": "09-material-bahan",
      "feature": "Matching Material Dokumen Gudang",
      "featureId": "material-gudang-matching",
      "process": "Pilih Plot Entres + Clone",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Daftar plot entres + clone.",
      "validation": "Plot entres terdaftar.",
      "fallback": "-",
      "output": "Buku mutasi klon terpilih.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MAT-MMG054",
      "reqId": "RN-MAT-MMG054",
      "title": "Validasi/pencocokan dokumen pengeluaran gudang (BKB/SPB sesuai dokumen yang berlaku) terhadap realisasi pemeliharaan berdasarkan Heading Kerja.",
      "role": "Mantri Bibitan",
      "module": "Material & Bahan",
      "moduleId": "09-material-bahan",
      "feature": "Matching Material Dokumen Gudang",
      "featureId": "material-gudang-matching",
      "process": "Audit Mutasi Masuk & Keluar",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Log mutasi sistem.",
      "validation": "Tidak boleh ada pengurangan stok manual tanpa transaksi.",
      "fallback": "Investigasi jika selisih.",
      "output": "Rincian audit mutasi ditampilkan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MAT-MMG055",
      "reqId": "RN-MAT-MMG055",
      "title": "Menarik dokumen pengeluaran gudang untuk pupuk, pestisida, dan plastik okulasi.",
      "role": "Mantri Bibitan",
      "module": "Material & Bahan",
      "moduleId": "09-material-bahan",
      "feature": "Matching Material Dokumen Gudang",
      "featureId": "material-gudang-matching",
      "process": "Tarik Dokumen Gudang Material",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Nomor dokumen pengeluaran gudang.",
      "validation": "Dokumen gudang berstatus APPROVED.",
      "fallback": "-",
      "output": "Dokumen material siap dicocokkan.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MAT-MMG056",
      "reqId": "RN-MAT-MMG056",
      "title": "Sistem memverifikasi kecocokan Heading Kerja dokumen gudang dengan rekam pemeliharaan.",
      "role": "Sistem",
      "module": "Material & Bahan",
      "moduleId": "09-material-bahan",
      "feature": "Matching Material Dokumen Gudang",
      "featureId": "material-gudang-matching",
      "process": "Matching Heading Kerja?",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Heading dokumen gudang vs Heading aktivitas pemeliharaan.",
      "validation": "Heading harus persis sama.",
      "fallback": "Jika tidak matching: Dokumen ditolak sistem.",
      "output": "Status kecocokan heading.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MAT-MMG057",
      "reqId": "RN-MAT-MMG057",
      "title": "Notifikasi Mantri berhasil; dokumen material melekat pada rekam pemeliharaan.",
      "role": "Mantri Bibitan",
      "module": "Material & Bahan",
      "moduleId": "09-material-bahan",
      "feature": "Matching Material Dokumen Gudang",
      "featureId": "material-gudang-matching",
      "process": "Lekatkan Dokumen & Verifikasi",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Dokumen matching.",
      "validation": "Asisten Bibitan memverifikasi pemakaian material.",
      "fallback": "-",
      "output": "Material resmi terpakai.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    },
    {
      "id": "RN-MAT-MMG058",
      "reqId": "RN-MAT-MMG058",
      "title": "Seluruh material dan mutasi stok tercatat rapi dan dapat dipertanggungjawabkan.",
      "role": "Mantri Bibitan",
      "module": "Material & Bahan",
      "moduleId": "09-material-bahan",
      "feature": "Matching Material Dokumen Gudang",
      "featureId": "material-gudang-matching",
      "process": "Material & Saldo Sah",
      "criteria": null,
      "acceptanceCriteria": null,
      "status": "Confirmed",
      "lifecycle": "Confirmed",
      "state": "Confirmed",
      "type": "Functional",
      "input": "Data tersinkron.",
      "validation": "-",
      "fallback": "-",
      "output": "Ledger material sah.",
      "ruleIds": [],
      "businessRuleId": null,
      "businessRule": null,
      "linkedNodeIds": [],
      "linkedFlowNodes": [],
      "flowScope": "Operational Flow",
      "revisionOf": null,
      "version": 1,
      "isArchived": false,
      "isSuperseded": false
    }
  ],
  "flows": {
    "01-presensi": {
      "presensi-supervisor": {
        "title": "Flow Proses - Presensi Supervisor",
        "nodes": [
          {
            "id": "PR_START",
            "code": "START",
            "type": "start",
            "title": "Login Berhasil",
            "summary": "Supervisor berhasil login akun terdaftar dan terkoneksi VPN.",
            "reqId": "RN-PRS-001",
            "role": "Mantri Bibitan",
            "module": "Presensi",
            "feature": "Presensi Supervisor",
            "processType": "Autentikasi",
            "purpose": "Memulai sesi kerja harian supervisor bibitan.",
            "input": "Kredensial pengguna valid.",
            "process": "Sistem memverifikasi akun dan membuka sesi.",
            "validation": "Koneksi VPN aktif (status Connected).",
            "fallback": "Mode darurat jika server pusat offline.",
            "output": "Sesi aktif supervisor.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-PRS-001: Presensi Datang wajib selesai sebelum transaksi harian lain.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PR_01",
            "code": "P-001",
            "type": "process",
            "title": "Pilih Status Datang / Pulang",
            "summary": "Pembacaan waktu otomatis untuk Presensi Datang/Pulang.",
            "reqId": "RN-PRS-002",
            "role": "Mantri Bibitan",
            "module": "Presensi",
            "feature": "Presensi Supervisor",
            "processType": "Pilihan Status",
            "purpose": "Menandai waktu mulai dan selesai jam kerja operasional.",
            "input": "Pilihan jenis presensi (Datang / Pulang).",
            "process": "Sistem mencatat waktu jam lokal perangkat.",
            "validation": "Presensi datang wajib sebelum transaksi operasional.",
            "fallback": "Peringatan blocker urutan.",
            "output": "Jenis presensi terkonfirmasi.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-PRS-001: Presensi Datang prerequisite.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PR_02",
            "code": "P-002",
            "type": "decision",
            "title": "Face ID & Biometrik",
            "summary": "Verifikasi biometrik wajah supervisor sebagai metode utama presensi.",
            "reqId": "RN-PRS-003",
            "role": "Mantri Bibitan",
            "module": "Presensi",
            "feature": "Presensi Supervisor",
            "processType": "Biometrik Face ID",
            "purpose": "Memastikan integritas kehadiran supervisor secara akurat.",
            "input": "Pindaian wajah melalui kamera.",
            "process": "Pencocokan biometrik wajah dengan template master.",
            "validation": "Kecocokan biometrik >= 85%.",
            "fallback": "Jika Face ID gagal: Beralih ke Foto Manual sebagai fallback.",
            "output": "Verifikasi biometrik terkonfirmasi.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-PRS-003: Face ID = metode utama. Foto Manual hanya fallback.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PR_FB",
            "code": "FB-001",
            "type": "process",
            "title": "Foto Manual + Alasan",
            "summary": "Pengambilan foto selfie langsung sebagai jalur fallback jika Face ID gagal.",
            "reqId": "RN-PRS-004",
            "role": "Mantri Bibitan",
            "module": "Presensi",
            "feature": "Presensi Supervisor",
            "processType": "Fallback Manual",
            "purpose": "Menjamin kontinuitas presensi saat kegagalan teknologi Face ID.",
            "input": "Foto kamera langsung dan catatan alasan kegagalan Face ID.",
            "process": "Aplikasi merekam foto fisik bersama watermark koordinat GPS dan timestamp.",
            "validation": "Foto memuat wajah jelas supervisor dan alasan wajib diisi.",
            "fallback": "Ambil ulang foto.",
            "output": "Foto bukti fallback tersimpan.",
            "relatedRole": "Asisten Bibitan (Verifikasi Manual)",
            "businessRule": "BR-PRS-003: Foto manual bukan pilihan utama, wajib alasan.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PR_03",
            "code": "P-003",
            "type": "process",
            "title": "Validasi Geofencing & GPS",
            "summary": "Pemeriksaan radius koordinat GPS berada di dalam perimeter Areal Bibitan.",
            "reqId": "RN-PRS-005",
            "role": "Mantri Bibitan",
            "module": "Presensi",
            "feature": "Presensi Supervisor",
            "processType": "Validasi Geospasial",
            "purpose": "Memastikan presensi dilakukan secara sah di lokasi pembibitan.",
            "input": "Koordinat GPS vs Polygon Geofencing Bibitan.",
            "process": "Sistem menghitung jarak lokasi terhadap batas bibitan.",
            "validation": "Koordinat berada di dalam radius toleransi geofencing (< 200m).",
            "fallback": "Peringatan di luar radius jika di luar kebun.",
            "output": "Status lokasi: Dalam Areal Bibitan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-PRS-004: Geofencing wajib di Areal Bibitan yang sah.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PR_04",
            "code": "P-004",
            "type": "process",
            "title": "Simpan Presensi Supervisor",
            "summary": "Menyimpan rekaman presensi lengkap: Tanggal, Nama, Timestamp, GPS, Foto.",
            "reqId": "RN-PRS-006",
            "role": "Mantri Bibitan",
            "module": "Presensi",
            "feature": "Presensi Supervisor",
            "processType": "Penyimpanan Data",
            "purpose": "Mengunci record presensi dan membuka hak akses transaksi harian.",
            "input": "Data presensi tervalidasi.",
            "process": "Menulis record ke database lokal dan memicu sinkronisasi.",
            "validation": "Record presensi berhasil tersimpan.",
            "fallback": "Penyimpanan offline jika server offline.",
            "output": "Presensi supervisor aktif; modul operasional dibuka.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-PRS-001: Akses transaksi harian terbuka setelah presensi datang.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PR_END",
            "code": "END",
            "type": "end",
            "title": "Selesai Presensi Supervisor",
            "summary": "Presensi supervisor berhasil dan operasional pembibitan siap dilanjutkan.",
            "reqId": "RN-PRS-007",
            "role": "Mantri Bibitan",
            "module": "Presensi",
            "feature": "Presensi Supervisor",
            "processType": "Penyelesaian",
            "purpose": "Menandai pembukaan seluruh alur kerja operasional harian.",
            "input": "Status presensi datang terekam.",
            "process": "Sistem menghilangkan pembatas transaksi harian.",
            "validation": "Presensi datang terkonfirmasi.",
            "fallback": "-",
            "output": "Dashboard operasional aktif.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-PRS-001: Sukses.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          }
        ],
        "edges": []
      },
      "presensi-pekerja": {
        "title": "Flow Proses - Presensi Pekerja Bibitan",
        "nodes": [
          {
            "id": "PW_START",
            "code": "START",
            "type": "start",
            "title": "Buka Presensi Pekerja",
            "summary": "Mantri membuka modul presensi pekerja setelah presensi supervisor selesai.",
            "reqId": "RN-PWP-001",
            "role": "Mantri Bibitan",
            "module": "Presensi",
            "feature": "Presensi Pekerja Bibitan",
            "processType": "Inisialisasi",
            "purpose": "Memulai verifikasi kehadiran regu kerja pembibitan.",
            "input": "Sesi supervisor aktif.",
            "process": "Sistem memuat daftar master pekerja terdaftar di afdeling/kebun.",
            "validation": "Presensi supervisor datang sudah selesai.",
            "fallback": "Blocker alert jika supervisor belum presensi.",
            "output": "Daftar pekerja siap diverifikasi.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-PRS-005: Presensi pekerja dilakukan oleh Mantri Bibitan.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PW_01",
            "code": "P-001",
            "type": "process",
            "title": "Tentukan Pekerja Hadir",
            "summary": "Mantri menandai pekerja yang hadir dan membuang pekerja tidak hadir.",
            "reqId": "RN-PWP-002",
            "role": "Mantri Bibitan",
            "module": "Presensi",
            "feature": "Presensi Pekerja Bibitan",
            "processType": "Filtrasi Kehadiran",
            "purpose": "Memverifikasi kehadiran fisik tenaga kerja di lapangan.",
            "input": "Pengecekan fisik apel pagi.",
            "process": "Mantri mencentang pekerja hadir, membuang yang tidak hadir.",
            "validation": "Alasan ketidakhadiran tercatat (Sakit / Izin / Mangkir).",
            "fallback": "Koreksi jika ada yang menyusul.",
            "output": "Daftar pekerja hadir tersaring.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-PRS-006: Hanya pekerja hadir yang dapat dialokasikan tugas.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PW_02",
            "code": "P-002",
            "type": "process",
            "title": "Tambah Pekerja Baru Jika Belum Ada",
            "summary": "Menambahkan pekerja bantuan antar afdeling jika belum ada di daftar reguler.",
            "reqId": "RN-PWP-003",
            "role": "Mantri Bibitan",
            "module": "Presensi",
            "feature": "Presensi Pekerja Bibitan",
            "processType": "Penambahan Data",
            "purpose": "Mengakomodasi tenaga bantuan/lemburan antar afdeling.",
            "input": "NIK atau Nama pekerja bantuan.",
            "process": "Mantri mencari NIK pada master data kebun.",
            "validation": "NIK terdaftar di sistem ERP perusahaan.",
            "fallback": "Pencatatan manual sementara.",
            "output": "Pekerja tambahan masuk daftar hadir.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-PRS-007: Pekerja bantuan harus memiliki NIK sah.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PW_03",
            "code": "P-003",
            "type": "process",
            "title": "Konfirmasi Daftar & Simpan",
            "summary": "Mengonfirmasi daftar final kehadiran pekerja beserta timestamp dan kirim verifikasi.",
            "reqId": "RN-PWP-004",
            "role": "Mantri Bibitan",
            "module": "Presensi",
            "feature": "Presensi Pekerja Bibitan",
            "processType": "Konfirmasi & Approval",
            "purpose": "Mengesahkan kehadiran pekerja sebagai dasar premi/upah.",
            "input": "Daftar pekerja hadir final.",
            "process": "Mantri menandatangani digital; Asisten Bibitan memverifikasi fisik.",
            "validation": "Asisten memverifikasi kesesuaian fisik pekerja di lapangan.",
            "fallback": "Revisi jika selisih.",
            "output": "Presensi pekerja terverifikasi.",
            "relatedRole": "Asisten Bibitan (Verifikasi)",
            "businessRule": "BR-GLB-002: Verifikasi Asisten Bibitan diperlukan.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PW_END",
            "code": "END",
            "type": "end",
            "title": "Pool Pekerja Aktif Hari Ini",
            "summary": "Pekerja siap dialokasikan pada transaksi teknis pembibitan karet.",
            "reqId": "RN-PWP-005",
            "role": "Mantri Bibitan",
            "module": "Presensi",
            "feature": "Presensi Pekerja Bibitan",
            "processType": "Selesai",
            "purpose": "Menyediakan pool pekerja aktif untuk transaksi okulasi, pemeliharaan, dan seleksi.",
            "input": "Data pekerja hadir terkonfirmasi.",
            "process": "Data pekerja tersedia otomatis pada dropdown modul-modul lain.",
            "validation": "Daftar aktif terindeks di memori lokal.",
            "fallback": "-",
            "output": "Pool pekerja siap digunakan hari ini.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-PRS-006: Sukses.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          }
        ],
        "edges": []
      }
    },
    "02-penerimaan": {
      "terima-benih": {
        "title": "Flow Proses - Penerimaan Benih / Biji Kelatak (Pihak Ke-3)",
        "nodes": [
          {
            "id": "TB_01",
            "code": "P-001",
            "type": "start",
            "title": "Dokumen Pengeluaran Gudang Supplier",
            "summary": "Sumber dokumen resmi pengiriman benih/biji kelatak dari pihak ketiga.",
            "reqId": "RN-RCV-001",
            "role": "Mantri Bibitan",
            "module": "Penerimaan",
            "feature": "Penerimaan Benih / Biji Kelatak",
            "processType": "Referensi Dokumen",
            "purpose": "Menjadi dasar acuan penerimaan benih secara legal dan terlacak.",
            "input": "Nomor Surat Jalan / Dokumen Pengeluaran Gudang Supplier.",
            "process": "Sistem memvalidasi nomor dokumen terhadap order logistik.",
            "validation": "Dokumen terdaftar di sistem logistik.",
            "fallback": "Pencatatan nomor dokumen manual dengan foto fisik surat jalan.",
            "output": "Nomor dokumen teridentifikasi.",
            "relatedRole": "Asisten Bibitan, Bagian Gudang",
            "businessRule": "BR-RCV-001: Penerimaan benih pihak ke-3 wajib mengacu dokumen pengeluaran gudang.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "TB_02",
            "code": "P-002",
            "type": "process",
            "title": "Tarik & Tampilkan Dokumen",
            "summary": "Sistem menarik metadata dokumen dan menampilkan kuantitas surat jalan.",
            "reqId": "RN-RCV-002",
            "role": "Mantri Bibitan",
            "module": "Penerimaan",
            "feature": "Penerimaan Benih / Biji Kelatak",
            "processType": "Pengambilan Data",
            "purpose": "Menampilkan rincian pesanan benih, jenis klon, dan tanggal pengiriman.",
            "input": "Nomor dokumen pengeluaran gudang.",
            "process": "Sistem melakukan query ke master logistik dan menampilkan rincian barang.",
            "validation": "Data dokumen tersedia.",
            "fallback": "Input manual jika offline.",
            "output": "Rincian dokumen terbuka di form penerimaan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-RCV-001: Data acuan dokumen wajib terisi.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "TB_03",
            "code": "P-003",
            "type": "process",
            "title": "Catat Kuantitas Aktual Diterima",
            "summary": "Mantri mencatat jumlah fisik benih kelatak riil yang dibongkar dan diterima.",
            "reqId": "RN-RCV-003",
            "role": "Mantri Bibitan",
            "module": "Penerimaan",
            "feature": "Penerimaan Benih / Biji Kelatak",
            "processType": "Pencatatan Fisik",
            "purpose": "Mendokumentasikan kuantitas riil yang masuk ke pembibitan karet.",
            "input": "Perhitungan fisik kotak/karung benih.",
            "process": "Mantri menginput jumlah butir benih yang diterima.",
            "validation": "Tidak ada seleksi benih di Modul Penerimaan (seleksi dilakukan di Penyemaian).",
            "fallback": "Catatan selisih jika ada perbedaan dengan surat jalan.",
            "output": "Kuantitas aktual tercatat.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-RCV-003: Tidak ada proses seleksi pada modul penerimaan benih.",
            "stockImpact": "+ BENIH DITERIMA (Menunggu Verifikasi)",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "TB_04",
            "code": "P-004",
            "type": "process",
            "title": "Dokumentasi Foto Fisik + Timestamp",
            "summary": "Foto fisik karung/kotak benih dan surat jalan dengan stempel waktu ISO.",
            "reqId": "RN-RCV-004",
            "role": "Mantri Bibitan",
            "module": "Penerimaan",
            "feature": "Penerimaan Benih / Biji Kelatak",
            "processType": "Dokumentasi & Audit",
            "purpose": "Menyediakan bukti visual pembongkaran muatan benih.",
            "input": "Foto kamera fisik benih dan surat jalan asli.",
            "process": "Aplikasi merekam foto beserta timestamp ISO dan koordinat geolokasi.",
            "validation": "Foto wajib diunggah.",
            "fallback": "Ambil ulang foto.",
            "output": "Foto audit tersimpan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-GLB-001: Foto + Timestamp wajib.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "TB_05",
            "code": "P-005",
            "type": "process",
            "title": "Simpan & Verifikasi Asisten",
            "summary": "Menyimpan berkas penerimaan dan disetujui Asisten Bibitan; resmi masuk database produksi.",
            "reqId": "RN-RCV-005",
            "role": "Asisten Bibitan",
            "module": "Penerimaan",
            "feature": "Penerimaan Benih / Biji Kelatak",
            "processType": "Approval & Selesai",
            "purpose": "Mengesahkan penerimaan benih secara legal.",
            "input": "Formulir penerimaan dan persetujuan Asisten.",
            "process": "Asisten menyetujui; sistem mengaktifkan dokumen sebagai sumber semai.",
            "validation": "Jika disetujui, dokumen penerimaan terverifikasi dan siap disemai.",
            "fallback": "Pengembalian dokumen ke Mantri jika tidak cocok.",
            "output": "Dokumen penerimaan terverifikasi di database produksi.",
            "relatedRole": "Mantri Bibitan",
            "businessRule": "BR-GLB-003: Setelah diverifikasi, data menjadi dokumen sumber aktif untuk Penyemaian.",
            "stockImpact": "+ BENIH SAH (Tersedia untuk Disemai)",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "TB_END",
            "code": "END",
            "type": "end",
            "title": "Tersimpan di Production - Siap Disemai",
            "summary": "Dokumen penerimaan siap digunakan sebagai sumber alokasi pada modul Penyemaian.",
            "reqId": "RN-RCV-006",
            "role": "Mantri Bibitan",
            "module": "Penerimaan",
            "feature": "Penerimaan Benih / Biji Kelatak",
            "processType": "Penyelesaian",
            "purpose": "Menjadi dokumen sumber resmi (1 dokumen dapat disemai ke beberapa Bedengan).",
            "input": "Dokumen penerimaan terverifikasi.",
            "process": "Sistem mengaktifkan dokumen ini pada pemilihan sumber di Modul Penyemaian.",
            "validation": "Dokumen berstatus APPROVED.",
            "fallback": "-",
            "output": "Dokumen penerimaan aktif di sistem.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-SEM-001: 1 dokumen penerimaan dapat dialokasikan ke beberapa Bedengan.",
            "stockImpact": "DOKUMEN PENERIMAAN AKTIF",
            "populationImpact": "SIAP DISEMAI",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          }
        ],
        "edges": []
      },
      "terima-kebun-sendiri": {
        "title": "Flow Proses - Penerimaan Bibit (Kebun Sendiri - Cross-Role)",
        "nodes": [
          {
            "id": "KS_01",
            "code": "CR-001",
            "type": "start",
            "title": "Asisten Divisi Buat Permintaan Bibit",
            "summary": "Asisten Divisi peminta mengajukan SPB bibit karet untuk penanaman di kebun.",
            "reqId": "RN-RCV-KS01",
            "role": "Asisten Divisi",
            "module": "Penerimaan",
            "feature": "Penerimaan Bibit - Kebun Sendiri",
            "processType": "Permintaan Bibit",
            "purpose": "Memulai permohonan alokasi bibit dari pembibitan sentral ke divisi tanam.",
            "input": "Rencana tanam, klon yang diminta, dan jumlah bibit.",
            "process": "Asisten Divisi mengisi formulir permintaan bibit resmi.",
            "validation": "Kebutuhan bibit sesuai luas areal tanam.",
            "fallback": "Revisi permohonan.",
            "output": "Dokumen Permintaan Bibit diajukan.",
            "relatedRole": "Asisten Kepala, Asisten Bibitan",
            "businessRule": "BR-RCV-004: Alur cross-role wajib review Asisten Kepala.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "KS_02",
            "code": "CR-002",
            "type": "process",
            "title": "Asisten Kepala Review & Cek Stok",
            "summary": "Asisten Kepala meninjau permintaan bibit dan memeriksa ketersediaan stok bibit siap salur.",
            "reqId": "RN-RCV-KS02",
            "role": "Asisten Kepala",
            "module": "Penerimaan",
            "feature": "Penerimaan Bibit - Kebun Sendiri",
            "processType": "Review & Cek Saldo",
            "purpose": "Memastikan prioritas alokasi bibit dan kecukupan stok di nursery.",
            "input": "Dokumen permintaan bibit vs saldo bibit siap salur.",
            "process": "Pemeriksaan saldo batch bibit pada sistem.",
            "validation": "Klon dan umur bibit memenuhi syarat tanam.",
            "fallback": "Negosiasi jumlah atau jadwal kirim.",
            "output": "Keputusan ketersediaan stok.",
            "relatedRole": "Asisten Divisi, Asisten Bibitan",
            "businessRule": "BR-RCV-004: Asisten Kepala memiliki wewenang koreksi/pembatalan.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "KS_DEC",
            "code": "CR-003",
            "type": "decision",
            "title": "Keputusan Stok Cukup?",
            "summary": "Stok cukup: Approve & teruskan ke Asisten Bibitan; Stok tidak cukup: Koreksi/Batalkan.",
            "reqId": "RN-RCV-KS03",
            "role": "Asisten Kepala",
            "module": "Penerimaan",
            "feature": "Penerimaan Bibit - Kebun Sendiri",
            "processType": "Decision Point",
            "purpose": "Mengarahkan jalur proses berdasarkan ketersediaan bibit.",
            "input": "Hasil audit ketersediaan batch.",
            "process": "Jika stok cukup -> Setujui; Jika tidak cukup -> Koreksi jumlah atau batalkan.",
            "validation": "Stok bibit siap salur >= kuantitas diminta.",
            "fallback": "Jalur alternatif koreksi kuantitas.",
            "output": "Arah alur proses ditentukan.",
            "relatedRole": "Asisten Divisi, Asisten Bibitan",
            "businessRule": "BR-RCV-004: Keputusan approval mengunci kuota alokasi.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "KS_03",
            "code": "CR-004",
            "type": "process",
            "title": "Mantri Bibitan Pengeluaran Bibit",
            "summary": "Asisten Bibitan menindaklanjuti; Mantri Bibitan mengeksekusi muat dan pengeluaran bibit.",
            "reqId": "RN-RCV-KS04",
            "role": "Mantri Bibitan",
            "module": "Pengeluaran",
            "feature": "Penerimaan Bibit - Kebun Sendiri",
            "processType": "Eksekusi Muat & Kirim",
            "purpose": "Memuat bibit ke armada angkut dan mencatat pengeluaran riil.",
            "input": "Dokumen SPB, armada angkut, dan fisik batch bibit.",
            "process": "Mantri scan QR Batch, menghitung bibit naik truk, dan mengambil foto timestamp.",
            "validation": "Jumlah bibit sesuai dokumen SPB.",
            "fallback": "Scan manual jika QR rusak.",
            "output": "Surat jalan pengiriman bibit terbit.",
            "relatedRole": "Asisten Bibitan, Asisten Divisi Peminta",
            "businessRule": "BR-EXP-001: Pengeluaran bibit wajib divalidasi QR Batch dan foto dokumentasi.",
            "stockImpact": "- BIBIT PADA BATCH (Setelah Verifikasi)",
            "populationImpact": "- POPULASI BATCH",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "KS_04",
            "code": "CR-005",
            "type": "process",
            "title": "Asisten Divisi Verifikasi Penerimaan",
            "summary": "Asisten Divisi peminta menerima bibit di lokasi tanam, memeriksa fisik, dan mengonfirmasi penerimaan.",
            "reqId": "RN-RCV-KS05",
            "role": "Asisten Divisi",
            "module": "Penerimaan",
            "feature": "Penerimaan Bibit - Kebun Sendiri",
            "processType": "Konfirmasi Penerimaan",
            "purpose": "Menutup rantai pasok distribusi bibit kebun sendiri secara resmi.",
            "input": "Fisik bibit tiba di divisi dan surat jalan kirim.",
            "process": "Asisten Divisi memverifikasi jumlah layak dan menekan tombol Konfirmasi Penerimaan.",
            "validation": "Bibit diterima dalam kondisi hidup dan segar.",
            "fallback": "Pencatatan bibit rusak di perjalanan.",
            "output": "Transaksi penerimaan selesai dan tercatat di buku kebun divisi.",
            "relatedRole": "Mantri Bibitan, Asisten Bibitan",
            "businessRule": "BR-RCV-004: Verifikasi penerimaan Asisten Divisi menutup siklus distribusi bibit.",
            "stockImpact": "BIBIT RESMI DITERIMA DI DIVISI",
            "populationImpact": "MUTASI BATCH SELESAI",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "KS_END",
            "code": "END",
            "type": "end",
            "title": "Penerimaan Bibit Tuntas",
            "summary": "Seluruh tahapan permohonan hingga penerimaan bibit kebun sendiri selesai terverifikasi.",
            "reqId": "RN-RCV-KS06",
            "role": "Asisten Divisi",
            "module": "Penerimaan",
            "feature": "Penerimaan Bibit - Kebun Sendiri",
            "processType": "Penyelesaian",
            "purpose": "Selesai.",
            "input": "Verifikasi sukses.",
            "process": "Status transaksi: Completed.",
            "validation": "-",
            "fallback": "-",
            "output": "Data mutasi produksi tersinkron penuh.",
            "relatedRole": "Semua Role Terkait",
            "businessRule": "BR-RCV-004: Siklus selesai.",
            "stockImpact": "SELESAI",
            "populationImpact": "TERVERIFIKASI",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          }
        ],
        "edges": []
      }
    },
    "03-penyemaian": {
      "semai-bedengan": {
        "title": "Flow Proses - Penyemaian Bedengan & Transplanting Polybag",
        "nodes": [
          {
            "id": "SM_START",
            "code": "START",
            "type": "start",
            "title": "Pilih Dokumen Penerimaan Benih",
            "summary": "Memilih dokumen penerimaan benih/biji kelatak terverifikasi sebagai sumber semai.",
            "reqId": "RN-SEM-001",
            "role": "Mantri Bibitan",
            "module": "Penyemaian",
            "feature": "Penyemaian ke Bedengan",
            "processType": "Seleksi Dokumen Sumber",
            "purpose": "Menghubungkan asal-usul benih yang disemai dengan surat penerimaan resmi.",
            "input": "Daftar dokumen penerimaan benih yang masih memiliki sisa saldo benih.",
            "process": "Mantri memilih nomor dokumen penerimaan yang akan ditabur.",
            "validation": "Dokumen penerimaan berstatus terverifikasi dan sisa benih > 0.",
            "fallback": "Satu dokumen dapat dialokasikan ke beberapa Bedengan secara bertahap.",
            "output": "Dokumen terpilih dan saldo sisa benih ditampilkan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-SEM-001: 1 receipt document dapat digunakan untuk beberapa Bedengan.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "SM_01",
            "code": "P-001",
            "type": "process",
            "title": "Scan QR Bedengan",
            "summary": "Memindai QR Code fisik pada plang bedengan perkecambahan pasir.",
            "reqId": "RN-SEM-002",
            "role": "Mantri Bibitan",
            "module": "Penyemaian",
            "feature": "Penyemaian ke Bedengan",
            "processType": "Validasi Fisik",
            "purpose": "Memastikan lokasi bedengan yang diinput sesuai dengan fisik bedengan di lapangan.",
            "input": "QR Code fisik pada plang nomor bedengan.",
            "process": "Kamera memindai QR Code bedengan dan mencocokkan nomor registrasi.",
            "validation": "Bedengan terdaftar di master areal bibitan dan berstatus siap tabur.",
            "fallback": "Jika QR rusak: Pilih Bedengan secara manual dari daftar.",
            "output": "Identitas bedengan tervalidasi.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-SEM-002: QR Bedengan wajib dipindai. Manual hanya fallback jika QR rusak.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "SM_02",
            "code": "P-002",
            "type": "process",
            "title": "Input Jumlah Disemai & Reject",
            "summary": "Mantri menginput jumlah butir benih yang disemai dan jumlah benih afkir/rusak.",
            "reqId": "RN-SEM-003",
            "role": "Mantri Bibitan",
            "module": "Penyemaian",
            "feature": "Penyemaian ke Bedengan",
            "processType": "Pencatatan Fisik",
            "purpose": "Mencatat populasi awal semaian per bedengan dan rendemen benih.",
            "input": "Jumlah disemai (butir) dan jumlah reject (butir).",
            "process": "Mantri memasukkan angka kuantitas benih ditabur dan dieliminasi.",
            "validation": "Jumlah disemai + reject <= sisa benih pada dokumen penerimaan.",
            "fallback": "Koreksi kuantitas sebelum disimpan.",
            "output": "Kuantitas semai dan reject tercatat.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-SEM-003: Total disemai + reject tidak boleh melebihi kuota dokumen penerimaan.",
            "stockImpact": "- SALDO BENIH PENERIMAAN",
            "populationImpact": "+ POPULASI BEDENGAN",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "SM_03",
            "code": "P-003",
            "type": "process",
            "title": "Foto Benih Tidak Layak + Timestamp",
            "summary": "Foto bukti fisik benih reject/rusak dengan watermark timestamp ISO dan GPS.",
            "reqId": "RN-SEM-004",
            "role": "Mantri Bibitan",
            "module": "Penyemaian",
            "feature": "Penyemaian ke Bedengan",
            "processType": "Bukti & Audit",
            "purpose": "Menyediakan bukti fisik afkir benih untuk verifikasi Asisten.",
            "input": "Foto benih reject di atas nampan/karung.",
            "process": "Kamera aplikasi menangkap foto benih reject dengan stempel timestamp dan GPS.",
            "validation": "Jika reject > 0, foto benih reject wajib diunggah.",
            "fallback": "Ambil ulang foto.",
            "output": "Foto bukti reject tersimpan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-GLB-001: Foto + Timestamp wajib.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "SM_04",
            "code": "P-004",
            "type": "process",
            "title": "Verifikasi Asisten & ±12–15 Hari Semai",
            "summary": "Asisten menyetujui penaburan bedengan; periode perkecambahan berlangsung ±12–15 hari.",
            "reqId": "RN-SEM-005",
            "role": "Mantri Bibitan",
            "module": "Penyemaian",
            "feature": "Penyemaian ke Bedengan",
            "processType": "Siklus Agronomi",
            "purpose": "Memastikan benih berkecambah hingga fase jarum yang siap transplanting.",
            "input": "Jadwal hari setelah semai (HSS).",
            "process": "Sistem menghitung umur kecambah dan notifikasi siap transplanting pada hari ke-12 s.d. 15.",
            "validation": "Umur semai mencapai ±12–15 hari.",
            "fallback": "Pemeriksaan manual jika perkecambahan lambat.",
            "output": "Kecambah siap transplanting ke polybag.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-SEM-005: Siklus penyemaian ke polybag berlangsung ±12–15 hari.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "POPULASI BEDENGAN AKTIF",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "SM_05",
            "code": "P-005",
            "type": "process",
            "title": "Transplanting ke Polybag (1 Polybag = 2 Benih)",
            "summary": "Pemindahan kecambah ke polybag dengan rasio tepat 1 Polybag = 2 Benih/Bibit.",
            "reqId": "RN-SEM-006",
            "role": "Mantri Bibitan",
            "module": "Penyemaian",
            "feature": "Penyemaian ke Bedengan",
            "processType": "Transplanting",
            "purpose": "Menanam bibit ke media polybag dengan cadangan 2 bibit per polybag.",
            "input": "Kecambah fase jarum dan polybag siap tanam.",
            "process": "Pekerja menanam tepat 2 kecambah per polybag.",
            "validation": "Rasio 2 benih per polybag.",
            "fallback": "Penyulaman jika polybag hanya berisi 1 kecambah.",
            "output": "Polybag tertanam di petak pembibitan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-SEM-006: 1 Polybag = 2 Benih/Bibit.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "TRANSPLANTING BERJALAN",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "SM_06",
            "code": "P-006",
            "type": "process",
            "title": "Konsolidasi Multi-Bedengan ke Batch",
            "summary": "Penggabungan beberapa bedengan hasil transplanting menjadi 1 Batch operasional resmi.",
            "reqId": "RN-SEM-007",
            "role": "Mantri Bibitan",
            "module": "Penyemaian",
            "feature": "Penyemaian ke Bedengan",
            "processType": "Konsolidasi Entitas",
            "purpose": "Membentuk entitas Batch yang menjadi objek dasar okulasi.",
            "input": "Hasil transplanting dari 1 atau beberapa Bedengan.",
            "process": "Sistem mengelompokkan bedengan dan menerbitkan Kode Batch baru beserta QR Code.",
            "validation": "1 Batch dapat terdiri dari beberapa Bedengan dengan klon/sumber seragam.",
            "fallback": "Pemisahan batch jika lokasi blok berbeda.",
            "output": "Entitas Batch resmi terdaftar dengan plang QR fisik.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-SEM-007: 1 Batch dapat terdiri dari beberapa Bedengan.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "BATCH POPULATION TERBENTUK",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "SM_END",
            "code": "END",
            "type": "end",
            "title": "Batch Siap Masuk Siklus Okulasi",
            "summary": "Batch polybag telah terdaftar dan siap dipelihara hingga mencapai ukuran okulasi.",
            "reqId": "RN-SEM-008",
            "role": "Mantri Bibitan",
            "module": "Penyemaian",
            "feature": "Penyemaian ke Bedengan",
            "processType": "Penyelesaian",
            "purpose": "Batch masuk siklus pemeliharaan batang bawah menuju modul Okulasi.",
            "input": "Batch terverifikasi Asisten Bibitan.",
            "process": "Batch aktif tampil di Modul Okulasi.",
            "validation": "Status Batch: Aktif Siap Okulasi.",
            "fallback": "-",
            "output": "Batch siap diokulasi.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-SEM-007: Siklus penyemaian selesai.",
            "stockImpact": "BATCH AKTIF",
            "populationImpact": "POPULASI BATCH RESMI",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          }
        ],
        "edges": []
      }
    },
    "04-okulasi": {
      "grafting": {
        "title": "Flow Proses - Grafting (Okulasi Utama)",
        "nodes": [
          {
            "id": "N_START",
            "code": "START",
            "type": "start",
            "title": "Mulai",
            "summary": "Inisialisasi modul okulasi grafting oleh Mantri Bibitan.",
            "reqId": "RN-OKL-000",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Grafting & Regrafting",
            "processType": "Inisialisasi",
            "purpose": "Memulai sesi pencatatan okulasi bibit karet pada batch aktif.",
            "input": "Sesi login aktif Mantri Bibitan",
            "process": "Membuka modul okulasi dan memilih transaksi grafting.",
            "validation": "Mantri telah menyelesaikan Presensi Datang.",
            "fallback": "Presensi mandatory blocker jika belum hadir.",
            "output": "Halaman pemilihan batch terbuka.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-001: Presensi wajib selesai sebelum transaksi operasional.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "N_P001",
            "code": "P-001",
            "type": "process",
            "title": "Pilih Batch",
            "summary": "Memilih batch bibit yang siap memasuki umur okulasi.",
            "reqId": "RN-OKL-001",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Grafting & Regrafting",
            "processType": "Seleksi Data",
            "purpose": "Menentukan batch tanaman bawah (rootstock) yang akan diokulasi.",
            "input": "Daftar batch polybag aktif di areal pembibitan.",
            "process": "Sistem menyajikan daftar batch yang berstatus siap okulasi.",
            "validation": "Batch harus berstatus aktif dan belum mencapai batas maksimal okulasi.",
            "fallback": "Pencarian manual berdasarkan nomor petak / blok.",
            "output": "Batch terpilih siap untuk verifikasi QR Code.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-002: Batch harus tervalidasi sebelum transaksi dilakukan.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "N_P002",
            "code": "P-002",
            "type": "process",
            "title": "Scan QR Batch",
            "summary": "Memvalidasi Batch menggunakan QR Code sebelum transaksi dapat dilanjutkan.",
            "reqId": "RN-OKL-002",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Grafting & Regrafting",
            "processType": "Transaksi & Validasi Fisik",
            "purpose": "Memastikan Batch yang dipilih sesuai dengan objek fisik yang diproses.",
            "input": "QR Code Batch fisik pada plang petak bibitan.",
            "process": "Sistem membaca QR Code kamera dan mencocokkannya dengan data Batch yang dipilih.",
            "validation": "Batch harus valid, aktif, dan koordinat sesuai batas kebun.",
            "fallback": "Jika QR Code rusak atau gagal scan, Mantri dapat memilih Batch secara manual dengan konfirmasi.",
            "output": "Data Batch terkonfirmasi valid dan form transaksi dibuka.",
            "relatedRole": "Asisten Bibitan (Verifikasi Fisik)",
            "businessRule": "BR-OKL-002: Batch wajib tervalidasi menggunakan QR Code fisik sebelum penginputan.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "N_P003",
            "code": "P-003",
            "type": "process",
            "title": "Validasi Batch",
            "summary": "Pemeriksaan status operasional, umur batang bawah, dan clone batch.",
            "reqId": "RN-OKL-003",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Grafting & Regrafting",
            "processType": "Sistem Verifikasi",
            "purpose": "Menjamin umur bibit memenuhi standar teknis okulasi karet.",
            "input": "Objek data Batch hasil scan QR.",
            "process": "Sistem memverifikasi integritas record batch dan riwayat penyemaian.",
            "validation": "Status batch valid, data populasi tanaman aktif tersedia.",
            "fallback": "Pemberitahuan error jika batch terkunci oleh transaksi lain.",
            "output": "Batch siap diinput data pekerja dan rincian okulasi.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-002: Validasi objek fisik batch.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "N_P004",
            "code": "P-004",
            "type": "process",
            "title": "Tampilkan Populasi",
            "summary": "Menampilkan populasi acuan bibit dalam batch yang tersedia.",
            "reqId": "RN-OKL-004",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Grafting & Regrafting",
            "processType": "Tampilan Data",
            "purpose": "Memberikan acuan kuantitas maksimum bibit yang dapat diokulasi.",
            "input": "Data populasi hidup terakhir dari batch terverifikasi.",
            "process": "Sistem menghitung sisa bibit hidup dan kuota okulasi hari ini.",
            "validation": "Populasi hidup > 0.",
            "fallback": "Sinkronisasi ulang jika data lokal out-of-date.",
            "output": "Informasi populasi acuan tampil pada formulir.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-003: Jumlah bibit diokulasi tidak boleh melebihi populasi aktif.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO DIRECT POPULATION REDUCTION",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "N_P005",
            "code": "P-005",
            "type": "process",
            "title": "Tentukan Pekerja",
            "summary": "Mencatat pekerja okulasi dan alokasi jumlah bibit per pekerja.",
            "reqId": "RN-OKL-005",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Grafting & Regrafting",
            "processType": "Alokasi Kerja",
            "purpose": "Merekam akuntabilitas hasil kerja okulator per individu.",
            "input": "Daftar pekerja hadir dari modul Presensi.",
            "process": "Mantri memilih pekerja terdaftar dan menginput kuantitas batang yang dikerjakan masing-masing.",
            "validation": "Pekerja harus berstatus hadir pada presensi hari yang sama.",
            "fallback": "Pencarian pekerja manual jika belum masuk daftar hadir utama.",
            "output": "Rincian alokasi pekerja dan kuantitas bibit tersimpan di form.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-004: Pekerja wajib terverifikasi dalam presensi harian.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "N_P006",
            "code": "P-006",
            "type": "process",
            "title": "Pilih Plot Entres",
            "summary": "Menentukan plot kebun entres dan clone mata entres yang digunakan.",
            "reqId": "RN-OKL-006",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Grafting & Regrafting",
            "processType": "Seleksi Sumber Material",
            "purpose": "Menjamin ketertelusuran (traceability) clone mata tunas okulasi.",
            "input": "Daftar Plot Entres aktif beserta clone tanaman.",
            "process": "Mantri memilih plot kebun entres sesuai rekomendasi agronomi.",
            "validation": "Plot entres harus memiliki stok mata tunas aktif.",
            "fallback": "Pencarian berdasarkan kode blok kebun entres.",
            "output": "Plot entres terpilih siap scan validasi fisik.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-005: Stok mata entres menggunakan kombinasi Plot Entres + Clone.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "N_P007",
            "code": "P-007",
            "type": "process",
            "title": "Scan QR Plot Entres",
            "summary": "Memvalidasi plang QR fisik plot entres asal pengambilan kayu entres.",
            "reqId": "RN-OKL-007",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Grafting & Regrafting",
            "processType": "Validasi Fisik",
            "purpose": "Menghindari kontaminasi clone atau kesalahan pengambilan entres.",
            "input": "QR Code fisik pada plang plot entres.",
            "process": "Kamera memindai QR Code plot dan mencocokkan identitas clone.",
            "validation": "QR plot entres cocok dengan data master clone.",
            "fallback": "Pilih plot manual dengan menyertakan alasan fallback.",
            "output": "Plot entres terverifikasi valid.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-005: QR Code plot entres wajib divalidasi.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "N_P008",
            "code": "P-008",
            "type": "process",
            "title": "Input Cabang Entres",
            "summary": "Menginput jumlah batang/cabang kayu entres yang diambil dari plot.",
            "reqId": "RN-OKL-008",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Grafting & Regrafting",
            "processType": "Pencatatan Fisik",
            "purpose": "Menjadi variabel dasar kalkulasi estimasi ketersediaan mata entres.",
            "input": "Jumlah cabang kayu okulasi (angka integer).",
            "process": "Mantri memasukkan kuantitas cabang yang dipotong dari plot.",
            "validation": "Kuantitas cabang > 0.",
            "fallback": "Koreksi manual jika terdapat cabang yang patah/rusak.",
            "output": "Nilai jumlah cabang tersimpan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-006: Estimasi = Jumlah Cabang x Rata-rata Mata Entres per Cabang.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "N_P009",
            "code": "P-009",
            "type": "process",
            "title": "Tampilkan Estimasi",
            "summary": "Sistem menghitung dan menampilkan estimasi perolehan mata entres.",
            "reqId": "RN-OKL-009",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Grafting & Regrafting",
            "processType": "Kalkulasi Otomatis",
            "purpose": "Memberikan perkiraan perolehan tunas mata okulasi.",
            "input": "Jumlah cabang x rata-rata mata entres per cabang plot.",
            "process": "Sistem melakukan perkalian matematis dan menampilkan hasil estimasi.",
            "validation": "Estimasi merupakan referensi, BUKAN stok aktual.",
            "fallback": "Nilai estimasi dapat disesuaikan faktor perisai tunas.",
            "output": "Tampilan estimasi mata entres terlihat di antarmuka.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-006: Estimasi bukan stok resmi. Hanya mata entres aktual yang memotong stok.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "N_P010",
            "code": "P-010",
            "type": "process",
            "title": "Input Mata Entres Aktual",
            "summary": "Mencatat kuantitas mata entres aktual yang berhasil ditempelkan.",
            "reqId": "RN-OKL-010",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Grafting & Regrafting",
            "processType": "Pencatatan Aktual",
            "purpose": "Menentukan kuantitas pasti pemotongan stok mata entres setelah verifikasi.",
            "input": "Jumlah mata entres yang terpakai riil.",
            "process": "Mantri menginput atau mengonfirmasi mata entres riil yang digunakan.",
            "validation": "Mata entres aktual <= stok tersedia pada Plot Entres + Clone.",
            "fallback": "Pemberitahuan peringatan jika melebihi stok terverifikasi.",
            "output": "Data kuantitas mata entres aktual tersimpan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-007: Mata entres aktual menjadi dasar pengurang stok setelah verifikasi.",
            "stockImpact": "- MATA ENTRES (Pending Verifikasi)",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "N_P011",
            "code": "P-011",
            "type": "process",
            "title": "Dokumentasi Foto + Timestamp",
            "summary": "Pengambilan foto dokumentasi fisik kegiatan okulasi beserta watermark timestamp.",
            "reqId": "RN-OKL-011",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Grafting & Regrafting",
            "processType": "Audit Trail",
            "purpose": "Menyediakan bukti visual fisik untuk verifikasi Asisten Bibitan.",
            "input": "Foto kamera langsung kegiatan okulasi / ikatan okulasi.",
            "process": "Aplikasi menangkap foto, menyematkan timestamp ISO dan koordinat GPS.",
            "validation": "Foto wajib ada (tidak boleh kosong), timestamp valid hari ini.",
            "fallback": "Ambil ulang jika foto buram / gelap.",
            "output": "Berkas gambar terkompresi dengan metadata audit tersimpan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-GLB-001: Setiap transaksi Mantri wajib menyertakan Foto + Timestamp.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "N_P012",
            "code": "P-012",
            "type": "process",
            "title": "Submit Transaksi",
            "summary": "Mengirim berkas transaksi okulasi ke antrean verifikasi Asisten.",
            "reqId": "RN-OKL-012",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Grafting & Regrafting",
            "processType": "Pengiriman Data",
            "purpose": "Mendaftarkan transaksi ke sistem antrean verifikasi.",
            "input": "Seluruh formulir data transaksi okulasi lengkap.",
            "process": "Sistem memvalidasi kelengkapan kolom, mengunci data lokal, dan memicu sync queue.",
            "validation": "Semua validasi mandatory terpenuhi (QR, pekerja, entres, foto).",
            "fallback": "Tersimpan di offline queue jika jaringan offline.",
            "output": "Nomor transaksi diterbitkan berstatus Menunggu Verifikasi.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-GLB-002: Semua transaksi Mantri memerlukan verifikasi Asisten Bibitan.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "N_P013",
            "code": "P-013",
            "type": "process",
            "title": "Verifikasi Asisten Bibitan",
            "summary": "Pemeriksaan lapangan dan persetujuan transaksi oleh Asisten Bibitan.",
            "reqId": "RN-OKL-013",
            "role": "Asisten Bibitan",
            "module": "Okulasi",
            "feature": "Grafting & Regrafting",
            "processType": "Otorisasi & Approval",
            "purpose": "Memastikan kebenaran agronomi, kesesuaian fisik, dan mutu tempelan okulasi.",
            "input": "Data transaksi Mantri, foto dokumentasi, dan inspeksi fisik petak.",
            "process": "Asisten memeriksa rincian transaksi; memutuskan Terima (Verifikasi) atau Tolak (Koreksi).",
            "validation": "Jika ditolak, berkas kembali ke Mantri untuk direvisi.",
            "fallback": "Pemberian catatan perbaikan spesifik oleh Asisten jika ditolak.",
            "output": "Status transaksi berubah menjadi Terverifikasi.",
            "relatedRole": "Mantri Bibitan (Revisi jika ditolak)",
            "businessRule": "BR-GLB-003: Setelah diverifikasi Asisten, data diteruskan ke Server Production.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "N_P014",
            "code": "P-014",
            "type": "process",
            "title": "Update Stok Mata Entres",
            "summary": "Pengurangan stok mata entres terverifikasi pada Plot Entres + Clone.",
            "reqId": "RN-OKL-014",
            "role": "Sistem Database",
            "module": "Okulasi",
            "feature": "Grafting & Regrafting",
            "processType": "Mutasi Saldo",
            "purpose": "Memperbarui saldo riil stok mata entres secara terpusat.",
            "input": "Kuantitas mata entres aktual yang telah diverifikasi Asisten.",
            "process": "Sistem mengeksekusi mutasi minus stok pada saldo Plot Entres + Clone terkait.",
            "validation": "Stok tidak boleh minus.",
            "fallback": "Logging transaksi mutasi sistem.",
            "output": "Saldo stok terpotong, tercatat dalam ledger material.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-007: Pengurangan stok hanya terjadi setelah verifikasi Asisten disetujui.",
            "stockImpact": "- MATA ENTRES (Resmi Terpotong)",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "N_END",
            "code": "END",
            "type": "end",
            "title": "Selesai",
            "summary": "Transaksi okulasi grafting berhasil diselesaikan dan masuk basis data produksi.",
            "reqId": "RN-OKL-015",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Grafting & Regrafting",
            "processType": "Penyelesaian",
            "purpose": "Menutup siklus pencatatan satu sesi okulasi batch.",
            "input": "Transaksi terverifikasi server production.",
            "process": "Menampilkan pesan sukses dan memperbarui ringkasan kerja harian Mantri.",
            "validation": "Status transaksi: Terverifikasi Production.",
            "fallback": "Pencetakan laporan ringkasan jika diperlukan.",
            "output": "Data tersinkron penuh ke server production.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-GLB-003: Sinkronisasi server production sukses.",
            "stockImpact": "STOK UPDATED",
            "populationImpact": "BATCH AKTIF",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          }
        ],
        "edges": []
      },
      "regrafting": {
        "title": "Flow Proses - Okulasi Janda (Regrafting)",
        "nodes": [
          {
            "id": "RG_START",
            "code": "START",
            "type": "start",
            "title": "Mulai Regrafting",
            "summary": "Inisialisasi transaksi okulasi ulang (regrafting) untuk bibit yang gagal pada pemeriksaan.",
            "reqId": "RN-REG-000",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Okulasi Janda / Regrafting",
            "processType": "Inisialisasi",
            "purpose": "Memulai perbaikan okulasi bibit yang gagal pada tahap pemeriksaan sebelumnya.",
            "input": "Dokumen riwayat pemeriksaan yang menetapkan tindak lanjut Regrafting.",
            "process": "Membuka formulir okulasi janda / regrafting.",
            "validation": "Tersedia bibit gagal dengan tindak lanjut Regrafting pada batch terpilih.",
            "fallback": "Pemberitahuan jika tidak ada bibit yang perlu di-regrafting.",
            "output": "Formulir regrafting aktif.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-008: Regrafting dapat dilakukan berulang kali tanpa batasan hanya satu kali.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "RG_01",
            "code": "P-001",
            "type": "process",
            "title": "Pilih Batch & Sumber Pemeriksaan",
            "summary": "Memilih batch dan dokumen hasil pemeriksaan yang memiliki tindak lanjut regrafting.",
            "reqId": "RN-REG-001",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Okulasi Janda / Regrafting",
            "processType": "Seleksi Dokumen",
            "purpose": "Menghubungkan regrafting ke riwayat pemeriksaan sebelumnya secara dinamis.",
            "input": "Daftar dokumen pemeriksaan yang memerlukan regrafting.",
            "process": "Mantri memilih dokumen pemeriksaan asal dan batch terkait.",
            "validation": "Dokumen pemeriksaan harus berstatus valid dan memiliki sisa kuota regrafting.",
            "fallback": "Pencarian batch manual.",
            "output": "Batch dan kuota bibit siap regrafting terpilih.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-008: Sifat dinamis, sistem mencari dokumen berkewajiban pemeriksaan.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "RG_02",
            "code": "P-002",
            "type": "process",
            "title": "Scan QR Batch",
            "summary": "Validasi fisik QR Code Batch sebelum melakukan regrafting.",
            "reqId": "RN-REG-002",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Okulasi Janda / Regrafting",
            "processType": "Validasi Fisik",
            "purpose": "Memastikan lokasi fisik batch benar sebelum batang ditempel ulang.",
            "input": "QR Code Batch fisik.",
            "process": "Kamera memindai QR Code dan mencocokkan identitas batch.",
            "validation": "Batch harus cocok dengan dokumen sumber pemeriksaan.",
            "fallback": "Pilih manual jika QR rusak.",
            "output": "Batch terverifikasi fisik.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-002: Batch wajib tervalidasi menggunakan QR Code.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "RG_03",
            "code": "P-003",
            "type": "process",
            "title": "Validasi Data Bibit Gagal",
            "summary": "Memeriksa jumlah batang bibit gagal yang berhak menerima penempelan ulang.",
            "reqId": "RN-REG-003",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Okulasi Janda / Regrafting",
            "processType": "Validasi Kuantitas",
            "purpose": "Mencegah input regrafting melebihi jumlah bibit yang gagal pada pemeriksaan.",
            "input": "Nilai bibit gagal dari dokumen pemeriksaan.",
            "process": "Sistem menampilkan kuota maksimum regrafting yang diperbolehkan.",
            "validation": "Jumlah regrafting <= jumlah bibit gagal pada dokumen sumber.",
            "fallback": "Peringatan validasi jika melebihi kuota.",
            "output": "Batas maksimum regrafting divalidasi.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-008: Batas regrafting mengacu pada dokumen pemeriksaan sumber.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "RG_04",
            "code": "P-004",
            "type": "process",
            "title": "Input Kuantitas Regrafting",
            "summary": "Menginput jumlah bibit yang diokulasi ulang dan pekerja pelaksana.",
            "reqId": "RN-REG-004",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Okulasi Janda / Regrafting",
            "processType": "Input Transaksi",
            "purpose": "Mencatat pelaksanaan penempelan ulang per pekerja.",
            "input": "Jumlah batang di-regrafting dan nama pekerja.",
            "process": "Mantri memasukkan kuantitas dan memilih pekerja hadir.",
            "validation": "Pekerja hadir pada presensi hari ini.",
            "fallback": "Daftar pekerja cadangan.",
            "output": "Rincian regrafting per pekerja tersimpan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-004: Pekerja harus terdaftar pada presensi harian.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "RG_05",
            "code": "P-005",
            "type": "process",
            "title": "Pilih Plot Entres & Scan QR",
            "summary": "Memilih plot kebun entres dan memindai QR fisik plot penyedia mata tunas.",
            "reqId": "RN-REG-005",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Okulasi Janda / Regrafting",
            "processType": "Validasi Material",
            "purpose": "Menjamin keaslian clone mata tunas untuk regrafting.",
            "input": "QR Code Plot Entres.",
            "process": "Scan QR Code plot entres dan mencocokkan clone.",
            "validation": "Clone entres harus sama dengan clone batch yang diregrafting.",
            "fallback": "Pilih plot manual dengan persetujuan.",
            "output": "Plot entres terverifikasi.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-005: Stok mata entres menggunakan Plot Entres + Clone.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "RG_06",
            "code": "P-006",
            "type": "process",
            "title": "Input Mata Entres Aktual",
            "summary": "Mencatat jumlah mata entres aktual yang digunakan untuk regrafting.",
            "reqId": "RN-REG-006",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Okulasi Janda / Regrafting",
            "processType": "Pencatatan Aktual",
            "purpose": "Menjadi dasar pengurangan stok mata entres setelah diverifikasi.",
            "input": "Jumlah mata tunas terpakai.",
            "process": "Mantri menginput nilai mata entres riil.",
            "validation": "Nilai aktual <= saldo stok Plot Entres + Clone.",
            "fallback": "Peringatan stok tidak cukup.",
            "output": "Nilai mata entres aktual tersimpan di form.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-007: Mata entres aktual menjadi dasar pengurang stok setelah verifikasi.",
            "stockImpact": "- MATA ENTRES (Pending Verifikasi)",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "RG_07",
            "code": "P-007",
            "type": "process",
            "title": "Dokumentasi Foto + Timestamp",
            "summary": "Pengambilan foto dokumentasi ikatan regrafting dan watermark timestamp.",
            "reqId": "RN-REG-007",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Okulasi Janda / Regrafting",
            "processType": "Dokumentasi & Bukti",
            "purpose": "Menyediakan bukti fisik regrafting untuk proses verifikasi Asisten.",
            "input": "Foto kamera batang regrafting.",
            "process": "Aplikasi merekam foto, koordinat GPS, dan timestamp ISO.",
            "validation": "Foto wajib terunggah.",
            "fallback": "Ambil ulang jika hasil foto buram.",
            "output": "Foto bukti audit tersimpan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-GLB-001: Foto dokumentasi + timestamp wajib disertakan pada seluruh transaksi Mantri.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "RG_08",
            "code": "P-008",
            "type": "process",
            "title": "Submit Transaksi",
            "summary": "Mengirimkan berkas regrafting ke antrean verifikasi Asisten Bibitan.",
            "reqId": "RN-REG-008",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Okulasi Janda / Regrafting",
            "processType": "Pengiriman",
            "purpose": "Mendaftarkan transaksi ke sistem.",
            "input": "Seluruh formulir data regrafting.",
            "process": "Sistem memvalidasi kelengkapan berkas dan menerbitkan tiket verifikasi.",
            "validation": "Data lengkap dan valid.",
            "fallback": "Tersimpan lokal di offline sync queue jika jaringan offline.",
            "output": "Transaksi terkirim berstatus Menunggu Verifikasi.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-GLB-002: Verifikasi Asisten Bibitan wajib sebelum data masuk server production.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "RG_09",
            "code": "P-009",
            "type": "process",
            "title": "Verifikasi Asisten Bibitan",
            "summary": "Pemeriksaan mutu tempelan ulang dan persetujuan oleh Asisten Bibitan.",
            "reqId": "RN-REG-009",
            "role": "Asisten Bibitan",
            "module": "Okulasi",
            "feature": "Okulasi Janda / Regrafting",
            "processType": "Approval & Verifikasi",
            "purpose": "Memastikan standar teknis regrafting terpenuhi di lapangan.",
            "input": "Data transaksi regrafting dan inspeksi fisik.",
            "process": "Asisten menyetujui transaksi atau mengembalikan ke Mantri jika tidak sesuai.",
            "validation": "Jika disetujui, transaksi berstatus Terverifikasi.",
            "fallback": "Pengembalian berkas dengan catatan perbaikan.",
            "output": "Transaksi regrafting sah.",
            "relatedRole": "Mantri Bibitan",
            "businessRule": "BR-GLB-003: Setelah disetujui, data dikirim ke Server Production.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "RG_10",
            "code": "P-010",
            "type": "process",
            "title": "Potong Stok Mata Entres",
            "summary": "Pemotongan stok resmi mata entres pada Plot Entres + Clone.",
            "reqId": "RN-REG-010",
            "role": "Sistem Database",
            "module": "Okulasi",
            "feature": "Okulasi Janda / Regrafting",
            "processType": "Mutasi Stok",
            "purpose": "Memperbarui saldo inventori mata entres.",
            "input": "Data kuantitas mata entres aktual yang telah diverifikasi.",
            "process": "Sistem mengeksekusi mutasi minus stok pada Plot Entres + Clone.",
            "validation": "Stok tersedia cukup.",
            "fallback": "Audit log mutasi.",
            "output": "Saldo mata entres terpotong.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-007: Pengurangan stok mata entres hanya terjadi setelah verifikasi disetujui.",
            "stockImpact": "- MATA ENTRES",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "RG_END",
            "code": "END",
            "type": "end",
            "title": "Selesai Regrafting",
            "summary": "Regrafting selesai dan siap diperiksa pada jadwal pemeriksaan berikutnya.",
            "reqId": "RN-REG-011",
            "role": "Mantri Bibitan",
            "module": "Okulasi",
            "feature": "Okulasi Janda / Regrafting",
            "processType": "Penyelesaian",
            "purpose": "Bibit yang diregrafting kembali masuk antrean kewajiban pemeriksaan bertahap.",
            "input": "Transaksi terverifikasi production.",
            "process": "Sistem mengaktifkan kewajiban pemeriksaan bertahap untuk bibit regrafting ini.",
            "validation": "Tercatat dalam jadwal pemeriksaan.",
            "fallback": "-",
            "output": "Data tersinkron penuh ke server production.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-008: Regrafting dapat berlanjut ke Pemeriksaan -> Berhasil / Gagal (Regrafting ulang / Reject).",
            "stockImpact": "STOK UPDATED",
            "populationImpact": "BATCH DIPERBARUI",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          }
        ],
        "edges": []
      }
    },
    "05-pemeriksaan": {
      "periksa-grafting": {
        "title": "Flow Proses - Pemeriksaan Bertahap Grafting",
        "nodes": [
          {
            "id": "CHK_START",
            "code": "START",
            "type": "start",
            "title": "Buka Pemeriksaan",
            "summary": "Membuka modul pemeriksaan hasil okulasi grafting.",
            "reqId": "RN-CHK-001",
            "role": "Mantri Bibitan",
            "module": "Pemeriksaan",
            "feature": "Pemeriksaan Bertahap Grafting",
            "processType": "Inisialisasi",
            "purpose": "Menilai keberhasilan penempelan mata entres secara dinamis.",
            "input": "Sesi Mantri Bibitan aktif",
            "process": "Sistem memuat dokumen okulasi yang memiliki kewajiban pemeriksaan.",
            "validation": "Mantri telah presensi datang.",
            "fallback": "-",
            "output": "Daftar dokumen kewajiban pemeriksaan tampil.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-008: Pemeriksaan bersifat dinamis dan dapat bertahap.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO DIRECT POPULATION REDUCTION",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "CHK_01",
            "code": "P-001",
            "type": "process",
            "title": "Pilih Dokumen Okulasi",
            "summary": "Memilih dokumen grafting/regrafting yang jatuh tempo pemeriksaan.",
            "reqId": "RN-CHK-002",
            "role": "Mantri Bibitan",
            "module": "Pemeriksaan",
            "feature": "Pemeriksaan Bertahap Grafting",
            "processType": "Seleksi Dokumen",
            "purpose": "Menghubungkan pemeriksaan ke riwayat penempelan okulasi.",
            "input": "Daftar dokumen okulasi aktif.",
            "process": "Mantri memilih dokumen acuan pemeriksaan.",
            "validation": "Dokumen memiliki sisa bibit yang belum diperiksa.",
            "fallback": "Pencarian batch manual.",
            "output": "Dokumen dan batch terpilih.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-008: Identifikasi tanggal, batch, dan transaksi sumber.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "CHK_02",
            "code": "P-002",
            "type": "process",
            "title": "Scan QR Batch",
            "summary": "Validasi fisik QR Code Batch yang diperiksa.",
            "reqId": "RN-CHK-003",
            "role": "Mantri Bibitan",
            "module": "Pemeriksaan",
            "feature": "Pemeriksaan Bertahap Grafting",
            "processType": "Validasi Fisik",
            "purpose": "Memastikan fisik batch sesuai data.",
            "input": "QR Code Batch fisik.",
            "process": "Kamera memindai QR Code batch di petak.",
            "validation": "Batch cocok dengan dokumen okulasi.",
            "fallback": "Pilih manual jika QR rusak.",
            "output": "Batch tervalidasi.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-002: Batch wajib divalidasi QR Code.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "CHK_03",
            "code": "P-003",
            "type": "process",
            "title": "Input Bibit Diperiksa Bertahap",
            "summary": "Menginput jumlah batang yang diperiksa pada sesi ini (misal 600 dari 1.000).",
            "reqId": "RN-CHK-004",
            "role": "Mantri Bibitan",
            "module": "Pemeriksaan",
            "feature": "Pemeriksaan Bertahap Grafting",
            "processType": "Pencatatan Fisik",
            "purpose": "Mendukung pemeriksaan bertahap tanpa menutup dokumen sumber.",
            "input": "Jumlah bibit diperiksa.",
            "process": "Mantri menginput kuantitas diperiksa hari ini; sistem menghitung sisa.",
            "validation": "Jumlah diperiksa <= sisa belum periksa.",
            "fallback": "-",
            "output": "Sisa pemeriksaan tetap tersimpan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-008: Dokumen tetap muncul hingga seluruh bibit diperiksa.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "CHK_04",
            "code": "P-004",
            "type": "process",
            "title": "Input Berhasil & Gagal",
            "summary": "Mencatat jumlah mata tempelan yang hijau (berhasil) vs hitam/mati (gagal).",
            "reqId": "RN-CHK-005",
            "role": "Mantri Bibitan",
            "module": "Pemeriksaan",
            "feature": "Pemeriksaan Bertahap Grafting",
            "processType": "Evaluasi Mutu",
            "purpose": "Mengukur rendemen keberhasilan okulasi per batch dan per okulator.",
            "input": "Jumlah berhasil dan jumlah gagal.",
            "process": "Mantri memasukkan angka hasil pemeriksaan.",
            "validation": "Total Berhasil + Gagal = Jumlah Diperiksa.",
            "fallback": "Hitung ulang jika ada selisih.",
            "output": "Data perolehan berhasil & gagal tersimpan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-008: Rendemen okulasi tercatat otomatis.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "CHK_05",
            "code": "P-005",
            "type": "decision",
            "title": "Tindak Lanjut Bibit Gagal",
            "summary": "Mantri menentukan tindak lanjut bibit yang gagal: Regrafting atau Reject.",
            "reqId": "RN-CHK-006",
            "role": "Mantri Bibitan",
            "module": "Pemeriksaan",
            "feature": "Pemeriksaan Bertahap Grafting",
            "processType": "Pengambilan Keputusan",
            "purpose": "Menentukan apakah batang masih layak diokulasi ulang atau diafkir.",
            "input": "Kuantitas bibit gagal dan kondisi visual batang.",
            "process": "Mantri memilih alokasi kuantitas untuk Regrafting atau Reject.",
            "validation": "Keputusan ditentukan sepenuhnya oleh Mantri Bibitan.",
            "fallback": "Konsultasi Asisten jika ragu.",
            "output": "Kuota regrafting atau reject tercatat.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-008: Gagal tidak otomatis reject final; Mantri berhak menentukan regrafting.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "CHK_06",
            "code": "P-006",
            "type": "process",
            "title": "Dokumentasi Foto + Timestamp",
            "summary": "Foto bukti fisik mata tempelan berhasil dan gagal beserta watermark.",
            "reqId": "RN-CHK-007",
            "role": "Mantri Bibitan",
            "module": "Pemeriksaan",
            "feature": "Pemeriksaan Bertahap Grafting",
            "processType": "Audit Trail",
            "purpose": "Bukti visual kondisi tempelan untuk verifikasi Asisten.",
            "input": "Foto mata tunas okulasi.",
            "process": "Kamera merekam foto dengan timestamp dan GPS.",
            "validation": "Foto wajib diunggah.",
            "fallback": "Ambil ulang foto.",
            "output": "Foto audit tersimpan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-GLB-001: Foto + Timestamp wajib pada transaksi Mantri.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "CHK_07",
            "code": "P-007",
            "type": "process",
            "title": "Submit & Verifikasi Asisten",
            "summary": "Mengirim hasil pemeriksaan ke Asisten Bibitan untuk disetujui.",
            "reqId": "RN-CHK-008",
            "role": "Mantri Bibitan",
            "module": "Pemeriksaan",
            "feature": "Pemeriksaan Bertahap Grafting",
            "processType": "Otorisasi",
            "purpose": "Mengesahkan angka keberhasilan dan kuota regrafting.",
            "input": "Data pemeriksaan lengkap.",
            "process": "Asisten Bibitan memeriksa fisik tempelan di lapangan dan menyetujui.",
            "validation": "Jika disetujui, data masuk server production.",
            "fallback": "Koreksi jika ada selisih hitung.",
            "output": "Status: Terverifikasi.",
            "relatedRole": "Asisten Bibitan (Verifikasi)",
            "businessRule": "BR-GLB-002: Verifikasi Asisten Bibitan wajib sebelum ke Server Production.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO DIRECT POPULATION REDUCTION",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "CHK_END",
            "code": "END",
            "type": "end",
            "title": "Selesai Pemeriksaan",
            "summary": "Pemeriksaan tuntas; bibit berhasil lanjut tumbuh, bibit gagal siap diregrafting.",
            "reqId": "RN-CHK-009",
            "role": "Mantri Bibitan",
            "module": "Pemeriksaan",
            "feature": "Pemeriksaan Bertahap Grafting",
            "processType": "Penyelesaian",
            "purpose": "Menutup sesi pemeriksaan bertahap.",
            "input": "Status verified.",
            "process": "Membuka antrean pada modul Regrafting jika ada bibit gagal.",
            "validation": "-",
            "fallback": "-",
            "output": "Data siap untuk siklus selanjutnya.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-008: Siklus pemeriksaan tuntas.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "TERVERIFIKASI",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          }
        ],
        "edges": []
      }
    },
    "06-penyeleksian": {
      "seleksi-batch": {
        "title": "Flow Proses - Seleksi Kualitas Bibit Batch",
        "nodes": [
          {
            "id": "SEL_START",
            "code": "START",
            "type": "start",
            "title": "Buka Penyeleksian Kualitas",
            "summary": "Memulai penyeleksian kualitas bibit afkir/mati secara dinamis berulang.",
            "reqId": "RN-SEL-001",
            "role": "Mantri Bibitan",
            "module": "Penyeleksian",
            "feature": "Seleksi Kualitas Bibit Batch",
            "processType": "Inisialisasi",
            "purpose": "Mendata bibit mati/afkir yang perlu dikeluarkan dari populasi batch.",
            "input": "Sesi aktif Mantri Bibitan",
            "process": "Membuka modul penyeleksian dinamis.",
            "validation": "Presensi datang selesai.",
            "fallback": "-",
            "output": "Form penyeleksian terbuka.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-SEL-001: Bersifat dinamis dan dapat dilakukan berulang kali.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO DIRECT POPULATION REDUCTION",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "SEL_01",
            "code": "P-001",
            "type": "process",
            "title": "Pilih Dokumen Sumber",
            "summary": "Memilih sumber dokumen transaksi yang mendasari seleksi.",
            "reqId": "RN-SEL-002",
            "role": "Mantri Bibitan",
            "module": "Penyeleksian",
            "feature": "Seleksi Kualitas Bibit Batch",
            "processType": "Ketertelusuran",
            "purpose": "Menelusuri riwayat batch: Source Document + Batch + Tanggal Transaksi.",
            "input": "Riwayat transaksi batch.",
            "process": "Mantri memilih dokumen sumber transaksi terkait.",
            "validation": "Dokumen sumber valid.",
            "fallback": "Pencarian manual.",
            "output": "Dokumen sumber terpilih.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-SEL-001: Penelusuran data: Source Document + Batch + Tanggal.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "SEL_02",
            "code": "P-002",
            "type": "process",
            "title": "Scan QR Batch",
            "summary": "Validasi fisik QR Code Batch yang akan diseleksi.",
            "reqId": "RN-SEL-003",
            "role": "Mantri Bibitan",
            "module": "Penyeleksian",
            "feature": "Seleksi Kualitas Bibit Batch",
            "processType": "Validasi Fisik",
            "purpose": "Memastikan lokasi petak fisik batch yang diseleksi.",
            "input": "QR Code Batch fisik.",
            "process": "Kamera memindai QR plang batch.",
            "validation": "QR Batch cocok dengan data dokumen.",
            "fallback": "Pilih manual jika QR rusak.",
            "output": "Batch terverifikasi fisik.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-002: Batch wajib divalidasi QR Code.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "SEL_03",
            "code": "P-003",
            "type": "process",
            "title": "Tampilkan Populasi Acuan",
            "summary": "Menampilkan populasi hidup acuan batch yang aktif.",
            "reqId": "RN-SEL-004",
            "role": "Mantri Bibitan",
            "module": "Penyeleksian",
            "feature": "Seleksi Kualitas Bibit Batch",
            "processType": "Tampilan Acuan",
            "purpose": "Memberikan dasar perhitungan batas pengurangan populasi.",
            "input": "Data populasi hidup terakhir.",
            "process": "Sistem menampilkan angka populasi acuan.",
            "validation": "Populasi hidup > 0.",
            "fallback": "-",
            "output": "Populasi acuan tampil.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-SEL-001: Populasi acuan berasal dari verifikasi terakhir.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "SEL_04",
            "code": "P-004",
            "type": "process",
            "title": "Deklarasi Nilai Seleksi",
            "summary": "Mantri menginput nilai seleksi berdasarkan Reject / Mati yang ditemukan.",
            "reqId": "RN-SEL-005",
            "role": "Mantri Bibitan",
            "module": "Penyeleksian",
            "feature": "Seleksi Kualitas Bibit Batch",
            "processType": "Deklarasi Mantri",
            "purpose": "Mencatat temuan fisik bibit afkir di lapangan.",
            "input": "Jumlah bibit reject/mati.",
            "process": "Mantri menginput jumlah afkir dan kategori penyebab cacat.",
            "validation": "Jumlah afkir <= populasi acuan.",
            "fallback": "Koreksi input.",
            "output": "Nilai seleksi Mantri tersimpan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-SEL-001: Reject/Mati BELUM langsung mengurangi populasi Batch.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "BELUM MENGURANGI POPULASI BATCH",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "SEL_05",
            "code": "P-005",
            "type": "process",
            "title": "Foto Dokumentasi + Timestamp",
            "summary": "Foto dokumentasi fisik bibit reject/afkir yang dikumpulkan beserta tanda air.",
            "reqId": "RN-SEL-006",
            "role": "Mantri Bibitan",
            "module": "Penyeleksian",
            "feature": "Seleksi Kualitas Bibit Batch",
            "processType": "Audit Trail",
            "purpose": "Bukti otentik tumpukan bibit afkir untuk pemeriksaan Asisten.",
            "input": "Foto fisik bibit reject di barisan petak.",
            "process": "Kamera merekam foto dengan timestamp dan koordinat.",
            "validation": "Foto wajib diunggah.",
            "fallback": "Ambil ulang jika buram.",
            "output": "Foto audit tersimpan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-GLB-001: Foto + Timestamp wajib.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "SEL_06",
            "code": "P-006",
            "type": "process",
            "title": "Submit Menunggu Verifikasi",
            "summary": "Mengirimkan berkas seleksi ke status Menunggu Verifikasi Asisten.",
            "reqId": "RN-SEL-007",
            "role": "Mantri Bibitan",
            "module": "Penyeleksian",
            "feature": "Seleksi Kualitas Bibit Batch",
            "processType": "Pengajuan",
            "purpose": "Mendaftarkan usulan pengurangan populasi batch.",
            "input": "Form seleksi lengkap.",
            "process": "Sistem mengunci berkas dan memberi notifikasi ke Asisten Bibitan.",
            "validation": "Data lengkap.",
            "fallback": "Simpan offline.",
            "output": "Status: Menunggu Verifikasi Asisten.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-GLB-002: Verifikasi Asisten Bibitan wajib.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "POPULASI BATCH TETAP",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "SEL_07",
            "code": "P-007",
            "type": "process",
            "title": "Asisten Pemeriksaan Fisik Batch",
            "summary": "Asisten Bibitan turun ke lapangan melakukan pemeriksaan fisik batch langsung.",
            "reqId": "RN-SEL-008",
            "role": "Asisten Bibitan",
            "module": "Penyeleksian",
            "feature": "Seleksi Kualitas Bibit Batch",
            "processType": "Inspeksi Lapangan",
            "purpose": "Memastikan bibit yang diafkir benar-benar tidak layak tumbuh.",
            "input": "Fisik bibit di petak dan deklarasi seleksi Mantri.",
            "process": "Asisten menghitung fisik bibit afkir dan membandingkannya.",
            "validation": "Kesesuaian fisik dengan berkas.",
            "fallback": "Hitung ulang bersama.",
            "output": "Hasil verifikasi lapangan.",
            "relatedRole": "Mantri Bibitan",
            "businessRule": "BR-SEL-001: Asisten membandingkan Transaksi vs Fisik.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "SEL_08",
            "code": "P-008",
            "type": "process",
            "title": "Bandingkan Transaksi vs Fisik",
            "summary": "Memverifikasi apakah kuantitas afkir di sistem sama dengan fisik lapangan.",
            "reqId": "RN-SEL-009",
            "role": "Asisten Bibitan",
            "module": "Penyeleksian",
            "feature": "Seleksi Kualitas Bibit Batch",
            "processType": "Rekonsiliasi",
            "purpose": "Menghindari manipulasi atau selisih data populasi tanaman.",
            "input": "Angka deklarasi vs angka fisik riil.",
            "process": "Asisten mencocokkan data; jika sesuai -> setujui, jika beda -> koreksi.",
            "validation": "Kesesuaian toleransi selisih.",
            "fallback": "Koreksi angka seleksi.",
            "output": "Angka seleksi disepakati.",
            "relatedRole": "Mantri Bibitan",
            "businessRule": "BR-SEL-001: Verifikasi fisik mutlak.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "SEL_09",
            "code": "P-009",
            "type": "process",
            "title": "Verifikasi & Kurangi Batch",
            "summary": "Asisten menyetujui transaksi; nilai terverifikasi resmi memotong populasi Batch.",
            "reqId": "RN-SEL-010",
            "role": "Asisten Bibitan",
            "module": "Penyeleksian",
            "feature": "Seleksi Kualitas Bibit Batch",
            "processType": "Approval & Eksekusi",
            "purpose": "Memperbarui populasi resmi batch pada basis data produksi.",
            "input": "Persetujuan Asisten Bibitan.",
            "process": "Sistem mengurangi populasi hidup Batch sesuai angka terverifikasi.",
            "validation": "Tanda tangan digital Asisten.",
            "fallback": "-",
            "output": "Populasi Batch terpotong resmi.",
            "relatedRole": "Mantri Bibitan",
            "businessRule": "BR-SEL-001: Nilai terverifikasi menjadi dasar pengurangan populasi Batch.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "- POPULASI BATCH (Resmi Terpotong)",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "SEL_END",
            "code": "END",
            "type": "end",
            "title": "Populasi Batch Sah",
            "summary": "Penyeleksian tuntas; populasi batch di database kini mencerminkan bibit hidup riil.",
            "reqId": "RN-SEL-011",
            "role": "Mantri Bibitan",
            "module": "Penyeleksian",
            "feature": "Seleksi Kualitas Bibit Batch",
            "processType": "Penyelesaian",
            "purpose": "Menutup transaksi penyeleksian.",
            "input": "Status verified.",
            "process": "Sinkronisasi ke server production selesai.",
            "validation": "-",
            "fallback": "-",
            "output": "Populasi batch terbarui.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-SEL-001: Sukses.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "POPULASI BATCH TERVERIFIKASI",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          }
        ],
        "edges": []
      }
    },
    "07-kebun-entres": {
      "entres-menunas": {
        "title": "Flow Proses - Menunas Plot Entres",
        "nodes": [
          {
            "id": "MN_START",
            "code": "START",
            "type": "start",
            "title": "Buka Menunas Entres",
            "summary": "Inisialisasi aktivitas pembersihan tunas liar pada pokok kebun entres.",
            "reqId": "RN-ENT-001",
            "role": "Mantri Bibitan",
            "module": "Kebun Entres",
            "feature": "Menunas Plot Entres",
            "processType": "Inisialisasi",
            "purpose": "Memulai pencatatan pemeliharaan kebun entres.",
            "input": "Sesi aktif Mantri.",
            "process": "Membuka form aktivitas menunas.",
            "validation": "Presensi selesai.",
            "fallback": "-",
            "output": "Form menunas terbuka.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-ENT-001: Menunas Plot Entres.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "MN_01",
            "code": "P-001",
            "type": "process",
            "title": "Scan QR Plot Entres",
            "summary": "Validasi QR Code plang fisik plot entres yang dirawat.",
            "reqId": "RN-ENT-002",
            "role": "Mantri Bibitan",
            "module": "Kebun Entres",
            "feature": "Menunas Plot Entres",
            "processType": "Validasi Objek",
            "purpose": "Menjamin akurasi lokasi plot dan klon entres.",
            "input": "QR Code Plot Entres.",
            "process": "Kamera memindai QR fisik plot kebun entres.",
            "validation": "QR plot entres valid.",
            "fallback": "Pilih manual plot jika QR rusak.",
            "output": "Identitas plot terverifikasi.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-005: Objek = Plot Entres.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "MN_02",
            "code": "P-002",
            "type": "process",
            "title": "Tampilkan Clone & Pokok",
            "summary": "Sistem menyajikan data clone dan jumlah pokok tanaman induk per plot.",
            "reqId": "RN-ENT-003",
            "role": "Mantri Bibitan",
            "module": "Kebun Entres",
            "feature": "Menunas Plot Entres",
            "processType": "Tampilan Acuan",
            "purpose": "Memberikan acuan populasi pokok induk yang harus ditunas.",
            "input": "Master data plot entres.",
            "process": "Menampilkan nama clone dan jumlah pokok terdaftar.",
            "validation": "Populasi pokok terdefinisi.",
            "fallback": "-",
            "output": "Data clone & pokok tampil.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-ENT-001: Data clone melekat pada plot.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "MN_03",
            "code": "P-003",
            "type": "process",
            "title": "Input Variabel Menunas",
            "summary": "Mantri menginput Tanggal, Jumlah Perisai/Mata Tunas, Jumlah Cabang, dan Panjang Meter.",
            "reqId": "RN-ENT-004",
            "role": "Mantri Bibitan",
            "module": "Kebun Entres",
            "feature": "Menunas Plot Entres",
            "processType": "Input Pengukuran",
            "purpose": "Mencatat parameter pertumbuhan cabang entres.",
            "input": "Tanggal, Perisai, Cabang, Panjang Meter.",
            "process": "Mantri menginput hasil pengukuran fisik di lapangan.",
            "validation": "Seluruh angka > 0.",
            "fallback": "Koreksi input.",
            "output": "Data variabel tersimpan di form.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-ENT-001: Variabel: Perisai, Cabang, Panjang Meter.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "MN_04",
            "code": "P-004",
            "type": "process",
            "title": "Hitung Rata-rata Otomatis",
            "summary": "Sistem menghitung Rata-rata Perisai/Cabang dan Rata-rata Perisai/Meter.",
            "reqId": "RN-ENT-005",
            "role": "Mantri Bibitan",
            "module": "Kebun Entres",
            "feature": "Menunas Plot Entres",
            "processType": "Kalkulasi Otomatis",
            "purpose": "Menghitung indeks produktivitas tunas entres.",
            "input": "Perisai / Cabang dan Perisai / Panjang Meter.",
            "process": "Sistem mengeksekusi rumus dan menampilkan hasil rata-rata.",
            "validation": "Perhitungan matematis otomatis valid.",
            "fallback": "-",
            "output": "Indeks rata-rata tampil di layar.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-ENT-001: Hitung Rata-rata Perisai/Cabang dan Perisai/Meter.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "MN_05",
            "code": "P-005",
            "type": "process",
            "title": "Foto + Timestamp & Verifikasi",
            "summary": "Foto dokumentasi plot setelah ditunas beserta timestamp, diteruskan ke Asisten Bibitan.",
            "reqId": "RN-ENT-006",
            "role": "Mantri Bibitan",
            "module": "Kebun Entres",
            "feature": "Menunas Plot Entres",
            "processType": "Dokumentasi & Approval",
            "purpose": "Mengesahkan pemeliharaan kebun entres.",
            "input": "Foto pokok entres bersih tunas air.",
            "process": "Aplikasi merekam foto; Asisten Bibitan memverifikasi.",
            "validation": "Foto wajib diunggah.",
            "fallback": "Ambil ulang jika buram.",
            "output": "Status: Terverifikasi.",
            "relatedRole": "Asisten Bibitan (Verifikasi)",
            "businessRule": "BR-GLB-001: Foto + Timestamp; BR-GLB-002: Verifikasi Asisten.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "MN_END",
            "code": "END",
            "type": "end",
            "title": "Menunas Selesai",
            "summary": "Plot entres terawat optimal dan siap menghasilkan kayu entres berkualitas.",
            "reqId": "RN-ENT-007",
            "role": "Mantri Bibitan",
            "module": "Kebun Entres",
            "feature": "Menunas Plot Entres",
            "processType": "Penyelesaian",
            "purpose": "Menutup sesi menunas.",
            "input": "Approval sukses.",
            "process": "Data tersinkron ke server production.",
            "validation": "-",
            "fallback": "-",
            "output": "Plot siap panen entres berikutnya.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-ENT-001: Sukses.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "TERVERIFIKASI",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          }
        ],
        "edges": []
      }
    },
    "08-panen-mata-entres": {
      "panen-entres": {
        "title": "Flow Proses - Panen Mata Entres",
        "nodes": [
          {
            "id": "PN_START",
            "code": "START",
            "type": "start",
            "title": "Buka Panen Mata Entres",
            "summary": "Inisialisasi pemanenan cabang kayu okulasi dari kebun entres.",
            "reqId": "RN-HAR-001",
            "role": "Mantri Bibitan",
            "module": "Panen Mata Entres",
            "feature": "Panen Mata Entres",
            "processType": "Inisialisasi",
            "purpose": "Memulai proses penambahan stok mata entres pembibitan.",
            "input": "Sesi aktif Mantri Bibitan.",
            "process": "Membuka modul panen mata entres.",
            "validation": "Presensi datang selesai.",
            "fallback": "-",
            "output": "Form panen aktif.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-HAR-001: Objek panen = Plot Entres + Clone.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PN_01",
            "code": "P-001",
            "type": "process",
            "title": "Scan QR Plot Entres",
            "summary": "Validasi fisik QR Code Plot Entres yang dipanen.",
            "reqId": "RN-HAR-002",
            "role": "Mantri Bibitan",
            "module": "Panen Mata Entres",
            "feature": "Panen Mata Entres",
            "processType": "Validasi Fisik",
            "purpose": "Memastikan clone mata entres yang dipanen sesuai dokumen.",
            "input": "QR Code Plot Entres.",
            "process": "Kamera memindai QR fisik plot.",
            "validation": "QR cocok dengan master clone.",
            "fallback": "Pilih manual jika QR rusak.",
            "output": "Plot entres dan clone terkonfirmasi.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-HAR-001: QR Plot Entres wajib.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PN_02",
            "code": "P-002",
            "type": "process",
            "title": "Input Cabang & Rata-rata Mata",
            "summary": "Menginput jumlah cabang entres yang dipotong dan rata-rata mata entres per cabang.",
            "reqId": "RN-HAR-003",
            "role": "Mantri Bibitan",
            "module": "Panen Mata Entres",
            "feature": "Panen Mata Entres",
            "processType": "Input Kuantitas",
            "purpose": "Menjadi variabel kalkulasi estimasi ketersediaan mata tunas.",
            "input": "Jumlah Cabang dan Rata-rata Mata/Cabang.",
            "process": "Mantri memasukkan angka hasil pemotongan cabang.",
            "validation": "Cabang > 0 dan Rata-rata > 0.",
            "fallback": "Koreksi input.",
            "output": "Variabel perhitungan tersimpan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-006: Rumus: Cabang x Rata-rata Mata/Cabang = Estimasi Mata Entres.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PN_03",
            "code": "P-003",
            "type": "process",
            "title": "Hitung Estimasi Mata Entres",
            "summary": "Sistem menghitung nilai estimasi perolehan mata entres.",
            "reqId": "RN-HAR-004",
            "role": "Mantri Bibitan",
            "module": "Panen Mata Entres",
            "feature": "Panen Mata Entres",
            "processType": "Kalkulasi Sistem",
            "purpose": "Memberikan acuan batas wajar perolehan mata entres.",
            "input": "Cabang x Rata-rata.",
            "process": "Sistem menampilkan angka estimasi matematis.",
            "validation": "Estimasi BUKAN stok resmi.",
            "fallback": "-",
            "output": "Estimasi ditampilkan di antarmuka.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-006: Estimasi bukan stok resmi.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PN_04",
            "code": "P-004",
            "type": "process",
            "title": "Input Mata Entres Aktual",
            "summary": "Mantri mencatat jumlah mata entres riil/aktual yang siap digunakan/disimpan.",
            "reqId": "RN-HAR-005",
            "role": "Mantri Bibitan",
            "module": "Panen Mata Entres",
            "feature": "Panen Mata Entres",
            "processType": "Pencatatan Aktual",
            "purpose": "Menentukan kuantitas pasti penambahan stok resmi.",
            "input": "Jumlah mata tunas layak pakai.",
            "process": "Mantri menginput atau mengonfirmasi mata entres aktual.",
            "validation": "Aktual >= 0.",
            "fallback": "Koreksi kuantitas sebelum submit.",
            "output": "Nilai aktual tersimpan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-HAR-001: Hanya mata entres aktual yang diverifikasi yang masuk stok.",
            "stockImpact": "+ MATA ENTRES (Pending Verifikasi)",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PN_05",
            "code": "P-005",
            "type": "process",
            "title": "Dokumentasi Foto + Timestamp",
            "summary": "Foto ikatan cabang kayu entres yang dipanen beserta watermark timestamp ISO.",
            "reqId": "RN-HAR-006",
            "role": "Mantri Bibitan",
            "module": "Panen Mata Entres",
            "feature": "Panen Mata Entres",
            "processType": "Audit Trail",
            "purpose": "Bukti fisik hasil panen untuk verifikasi Asisten.",
            "input": "Foto ikatan kayu entres berlabel clone.",
            "process": "Kamera merekam foto dengan timestamp dan GPS.",
            "validation": "Foto wajib ada.",
            "fallback": "Ambil ulang jika gelap.",
            "output": "Foto audit tersimpan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-GLB-001: Foto + Timestamp wajib.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PN_06",
            "code": "P-006",
            "type": "process",
            "title": "Verifikasi Asisten & Tambah Stok",
            "summary": "Asisten Bibitan memeriksa fisik kayu entres dan menyetujui transaksi; stok resmi bertambah.",
            "reqId": "RN-HAR-007",
            "role": "Asisten Bibitan",
            "module": "Panen Mata Entres",
            "feature": "Panen Mata Entres",
            "processType": "Approval & Mutasi Stok",
            "purpose": "Mengesahkan mutasi penambahan stok mata entres di ledger.",
            "input": "Data panen dan persetujuan Asisten.",
            "process": "Sistem menambahkan saldo stok mata entres pada Plot Entres + Clone terkait.",
            "validation": "Verifikasi Asisten disetujui.",
            "fallback": "Pengembalian dokumen jika tidak sesuai.",
            "output": "Saldo stok mata entres resmi bertambah (+ STOCK).",
            "relatedRole": "Mantri Bibitan",
            "businessRule": "BR-HAR-001: Panen mata entres terverifikasi menambah stok resmi.",
            "stockImpact": "+ MATA ENTRES (Resmi Masuk Stok)",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PN_END",
            "code": "END",
            "type": "end",
            "title": "Stok Mata Entres Tersedia",
            "summary": "Mata entres siap dialokasikan untuk Grafting, Regrafting, atau Permintaan bibitan.",
            "reqId": "RN-HAR-008",
            "role": "Mantri Bibitan",
            "module": "Panen Mata Entres",
            "feature": "Panen Mata Entres",
            "processType": "Penyelesaian",
            "purpose": "Menutup sesi panen mata entres.",
            "input": "Stok bertambah di server production.",
            "process": "Data mutasi tersinkronisasi penuh.",
            "validation": "-",
            "fallback": "-",
            "output": "Saldo entres siap dipakai.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-HAR-001: Siklus panen selesai.",
            "stockImpact": "STOK BERTAMBAH (+)",
            "populationImpact": "TERVERIFIKASI",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          }
        ],
        "edges": []
      }
    },
    "09-material-bahan": {
      "monitoring-stok-entres": {
        "title": "Flow Proses - Monitoring Stok & Dokumen Gudang",
        "nodes": [
          {
            "id": "MB_START",
            "code": "START",
            "type": "start",
            "title": "Buka Monitoring Material",
            "summary": "Pengawasan saldo mutasi stok mata entres dan dokumen gudang material.",
            "reqId": "RN-MAT-001",
            "role": "Mantri Bibitan",
            "module": "Material & Bahan",
            "feature": "Monitoring Mutasi Stok Mata Entres",
            "processType": "Inisialisasi",
            "purpose": "Memantau ketersediaan material pendukung pembibitan karet.",
            "input": "Sesi aktif Mantri.",
            "process": "Sistem memuat buku besar stok mata entres dan daftar dokumen gudang.",
            "validation": "Koneksi data aktif.",
            "fallback": "Tampilkan cache offline.",
            "output": "Dasbor saldo material terbuka.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-MAT-001: 1 Dokumen Gudang = 1 Heading Kerja.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "MB_01",
            "code": "P-001",
            "type": "process",
            "title": "Pilih Plot Entres + Clone",
            "summary": "Memilih kombinasi plot entres dan jenis klon untuk ditinjau mutasi stoknya.",
            "reqId": "RN-MAT-002",
            "role": "Mantri Bibitan",
            "module": "Material & Bahan",
            "feature": "Monitoring Mutasi Stok Mata Entres",
            "processType": "Seleksi Kategori",
            "purpose": "Meninjau mutasi mata entres secara spesifik per klon.",
            "input": "Daftar plot entres + clone.",
            "process": "Mantri memilih plot entres sasaran.",
            "validation": "Plot entres terdaftar.",
            "fallback": "-",
            "output": "Buku mutasi klon terpilih.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-005: Stok menggunakan Plot Entres + Clone.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "MB_02",
            "code": "P-002",
            "type": "process",
            "title": "Audit Mutasi Masuk & Keluar",
            "summary": "Audit penambahan (+ Panen Terverifikasi) vs pengurangan (- Okulasi, - Regrafting, - Pengeluaran).",
            "reqId": "RN-MAT-003",
            "role": "Mantri Bibitan",
            "module": "Material & Bahan",
            "feature": "Monitoring Mutasi Stok Mata Entres",
            "processType": "Pemeriksaan Mutasi",
            "purpose": "Memastikan tidak ada selisih tanpa bukti transaksi yang sah.",
            "input": "Log mutasi sistem.",
            "process": "Sistem merekap mutasi masuk dan keluar secara kronologis.",
            "validation": "Tidak boleh ada pengurangan stok manual tanpa transaksi.",
            "fallback": "Investigasi jika selisih.",
            "output": "Rincian audit mutasi ditampilkan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-MAT-002: Tidak boleh ada pengurangan stok manual.",
            "stockImpact": "AUDIT SALDO MUTASI",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "MB_03",
            "code": "P-003",
            "type": "process",
            "title": "Tarik Dokumen Gudang Material",
            "summary": "Menarik dokumen pengeluaran gudang untuk pupuk, pestisida, dan plastik okulasi.",
            "reqId": "RN-MAT-004",
            "role": "Mantri Bibitan",
            "module": "Material & Bahan",
            "feature": "Matching Material Dokumen Gudang",
            "processType": "Integrasi Gudang",
            "purpose": "Menghubungkan pengeluaran material fisik gudang ke aktivitas operasional.",
            "input": "Nomor dokumen pengeluaran gudang.",
            "process": "Sistem memuat daftar material dan kuantitas dari gudang.",
            "validation": "Dokumen gudang berstatus APPROVED.",
            "fallback": "-",
            "output": "Dokumen material siap dicocokkan.",
            "relatedRole": "Petugas Gudang, Asisten Bibitan",
            "businessRule": "BR-MAT-001: 1 Dokumen Gudang = 1 Heading Kerja.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "MB_04",
            "code": "P-004",
            "type": "decision",
            "title": "Matching Heading Kerja?",
            "summary": "Sistem memverifikasi kecocokan Heading Kerja dokumen gudang dengan rekam pemeliharaan.",
            "reqId": "RN-MAT-005",
            "role": "Sistem",
            "module": "Material & Bahan",
            "feature": "Matching Material Dokumen Gudang",
            "processType": "Validasi Integritas",
            "purpose": "Mencegah pemakaian dokumen material pada jenis pekerjaan yang salah.",
            "input": "Heading dokumen gudang vs Heading aktivitas pemeliharaan.",
            "process": "Pencocokan kode heading kerja.",
            "validation": "Heading harus persis sama.",
            "fallback": "Jika tidak matching: Dokumen ditolak sistem.",
            "output": "Status kecocokan heading.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-MAT-001: Dokumen tidak dapat digunakan jika heading tidak matching.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "MB_05",
            "code": "P-005",
            "type": "process",
            "title": "Lekatkan Dokumen & Verifikasi",
            "summary": "Notifikasi Mantri berhasil; dokumen material melekat pada rekam pemeliharaan.",
            "reqId": "RN-MAT-006",
            "role": "Mantri Bibitan",
            "module": "Material & Bahan",
            "feature": "Matching Material Dokumen Gudang",
            "processType": "Pelekatan Berkas",
            "purpose": "Mengikat pertanggungjawaban material ke aktivitas lapangan.",
            "input": "Dokumen matching.",
            "process": "Mantri menyimpan pelekatan berkas dan diverifikasi Asisten Bibitan.",
            "validation": "Asisten Bibitan memverifikasi pemakaian material.",
            "fallback": "-",
            "output": "Material resmi terpakai.",
            "relatedRole": "Asisten Bibitan (Verifikasi)",
            "businessRule": "BR-GLB-002: Verifikasi Asisten Bibitan wajib.",
            "stockImpact": "MATERIAL TERTUTUP",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "MB_END",
            "code": "END",
            "type": "end",
            "title": "Material & Saldo Sah",
            "summary": "Seluruh material dan mutasi stok tercatat rapi dan dapat dipertanggungjawabkan.",
            "reqId": "RN-MAT-007",
            "role": "Mantri Bibitan",
            "module": "Material & Bahan",
            "feature": "Monitoring Mutasi Stok Mata Entres",
            "processType": "Penyelesaian",
            "purpose": "Selesai.",
            "input": "Data tersinkron.",
            "process": "Update saldo ledger produksi.",
            "validation": "-",
            "fallback": "-",
            "output": "Ledger material sah.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-MAT-001: Selesai.",
            "stockImpact": "TERVERIFIKASI",
            "populationImpact": "TERVERIFIKASI",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          }
        ],
        "edges": []
      }
    },
    "10-rekam-pemeliharaan": {
      "pemeliharaan-heading": {
        "title": "Flow Proses - Rekam Pemeliharaan Berbasis Heading Kerja",
        "nodes": [
          {
            "id": "PM_START",
            "code": "START",
            "type": "start",
            "title": "Buka Rekam Pemeliharaan",
            "summary": "Membuka pencatatan aktivitas pemeliharaan tanaman karet di pembibitan.",
            "reqId": "RN-MNT-001",
            "role": "Mantri Bibitan",
            "module": "Rekam Pemeliharaan",
            "feature": "Rekam Aktivitas Pemeliharaan",
            "processType": "Inisialisasi",
            "purpose": "Mencatat kegiatan agronomi (pemupukan, penyemprotan, penyiangan).",
            "input": "Sesi aktif Mantri.",
            "process": "Membuka formulir pemeliharaan dinamis.",
            "validation": "Presensi harian selesai.",
            "fallback": "-",
            "output": "Form pemeliharaan terbuka.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-MNT-001: Berbasis Grup Heading dan Heading Kerja.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PM_01",
            "code": "P-001",
            "type": "process",
            "title": "Pilih Grup & Heading Kerja",
            "summary": "Memilih Grup Heading Pembibitan dan Heading Kerja spesifik.",
            "reqId": "RN-MNT-002",
            "role": "Mantri Bibitan",
            "module": "Rekam Pemeliharaan",
            "feature": "Rekam Aktivitas Pemeliharaan",
            "processType": "Klasifikasi Pekerjaan",
            "purpose": "Menentukan standar operasional dan UOM pekerjaan.",
            "input": "Master data heading kerja nursery.",
            "process": "Mantri memilih grup dan sub-heading kerja.",
            "validation": "Heading kerja aktif.",
            "fallback": "-",
            "output": "Heading kerja dan UOM terpasang.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-MNT-001: UOM mengikuti Heading Kerja.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PM_02",
            "code": "P-002",
            "type": "process",
            "title": "Pilih Objek & Scan QR",
            "summary": "Memilih objek kerja (Batch / Bedengan / Plot Entres / Blok) dan memindai QR Code jika wajib.",
            "reqId": "RN-MNT-003",
            "role": "Mantri Bibitan",
            "module": "Rekam Pemeliharaan",
            "feature": "Rekam Aktivitas Pemeliharaan",
            "processType": "Validasi Objek",
            "purpose": "Menautkan aktivitas fisik ke lokasi/objek tanaman riil.",
            "input": "QR Code objek sasaran.",
            "process": "Mantri memindai plang QR objek atau memilih manual jika QR rusak.",
            "validation": "Objek aktif dan sesuai areal kerja.",
            "fallback": "Pilih manual dengan alasan.",
            "output": "Objek pemeliharaan terverifikasi.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-002: QR Code objek wajib divalidasi.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PM_03",
            "code": "P-003",
            "type": "process",
            "title": "Input Pekerja & Jumlah Output",
            "summary": "Mencatat pekerja pelaksana dan total kuantitas hasil kerja sesuai satuan UOM.",
            "reqId": "RN-MNT-004",
            "role": "Mantri Bibitan",
            "module": "Rekam Pemeliharaan",
            "feature": "Rekam Aktivitas Pemeliharaan",
            "processType": "Pencatatan Hasil Kerja",
            "purpose": "Mendata prestasi kerja harian regu bibitan.",
            "input": "Daftar pekerja hadir dan kuantitas output.",
            "process": "Mantri memasukkan angka capaian kerja pekerja.",
            "validation": "Pekerja hadir pada presensi hari ini.",
            "fallback": "Pencarian pekerja manual.",
            "output": "Hasil kerja per pekerja tersimpan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-PRS-006: Hanya pekerja hadir yang dapat dialokasikan.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PM_04",
            "code": "P-004",
            "type": "process",
            "title": "Foto Dokumentasi + Timestamp",
            "summary": "Foto dokumentasi fisik saat pelaksanaan aktivitas di barisan tanaman.",
            "reqId": "RN-MNT-005",
            "role": "Mantri Bibitan",
            "module": "Rekam Pemeliharaan",
            "feature": "Rekam Aktivitas Pemeliharaan",
            "processType": "Audit Trail",
            "purpose": "Bukti visual kepatuhan SOP pemeliharaan.",
            "input": "Foto kamera lapangan.",
            "process": "Aplikasi merekam foto beserta timestamp ISO dan GPS.",
            "validation": "Foto wajib diunggah.",
            "fallback": "Ambil ulang foto.",
            "output": "Foto audit tersimpan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-GLB-001: Foto + Timestamp wajib.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PM_05",
            "code": "P-005",
            "type": "process",
            "title": "Cek & Lekatkan Material Gudang",
            "summary": "Sistem memeriksa dokumen gudang yang matching heading; lekatkan jika tersedia.",
            "reqId": "RN-MNT-006",
            "role": "Mantri Bibitan",
            "module": "Rekam Pemeliharaan",
            "feature": "Rekam Aktivitas Pemeliharaan",
            "processType": "Korelasi Material",
            "purpose": "Mengintegrasikan pemakaian pupuk/pestisida dengan jam kerja regu.",
            "input": "Dokumen gudang ber-heading sama.",
            "process": "Sistem mencocokkan dokumen gudang; Mantri mengonfirmasi pelekatan.",
            "validation": "1 Dokumen Gudang = 1 Heading Kerja.",
            "fallback": "Lanjut tanpa dokumen jika pekerjaan tanpa bahan.",
            "output": "Material terikat pada aktivitas.",
            "relatedRole": "Petugas Gudang, Asisten Bibitan",
            "businessRule": "BR-MAT-001: Matching Heading Dokumen Gudang.",
            "stockImpact": "MATERIAL TERLEKATKAN",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PM_06",
            "code": "P-006",
            "type": "process",
            "title": "Submit & Verifikasi Asisten",
            "summary": "Mengirimkan berkas aktivitas pemeliharaan ke Asisten Bibitan untuk disetujui.",
            "reqId": "RN-MNT-007",
            "role": "Mantri Bibitan",
            "module": "Rekam Pemeliharaan",
            "feature": "Rekam Aktivitas Pemeliharaan",
            "processType": "Approval & Selesai",
            "purpose": "Mengesahkan pembayaran hasil kerja dan pemakaian bahan.",
            "input": "Berkas lengkap.",
            "process": "Asisten Bibitan memeriksa fisik lapangan dan menyetujui.",
            "validation": "Jika disetujui, data masuk server production.",
            "fallback": "Revisi jika hasil kerja kurang rapi.",
            "output": "Status: Terverifikasi Production.",
            "relatedRole": "Asisten Bibitan (Verifikasi)",
            "businessRule": "BR-GLB-002: Verifikasi Asisten Bibitan wajib.",
            "stockImpact": "PENGGUNAAN MATERIAL SAH",
            "populationImpact": "PEMELIHARAAN SAH",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "PM_END",
            "code": "END",
            "type": "end",
            "title": "Pemeliharaan Selesai",
            "summary": "Aktivitas pemeliharaan selesai dan tercatat resmi pada riwayat objek tanaman.",
            "reqId": "RN-MNT-008",
            "role": "Mantri Bibitan",
            "module": "Rekam Pemeliharaan",
            "feature": "Rekam Aktivitas Pemeliharaan",
            "processType": "Penyelesaian",
            "purpose": "Menutup sesi rekam pemeliharaan.",
            "input": "Sinkronisasi berhasil.",
            "process": "Riwayat terdaftar di buku petak.",
            "validation": "-",
            "fallback": "-",
            "output": "Riwayat pemeliharaan tersimpan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-MNT-001: Sukses.",
            "stockImpact": "SELESAI",
            "populationImpact": "TERCATAT",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          }
        ],
        "edges": []
      }
    },
    "11-pengeluaran": {
      "pengeluaran-bibit": {
        "title": "Flow Proses - Pengeluaran Bibit (SPB Disetujui)",
        "nodes": [
          {
            "id": "EXB_START",
            "code": "START",
            "type": "start",
            "title": "Buka Pengeluaran Bibit",
            "summary": "Inisialisasi pengeluaran bibit karet siap tanam berdasarkan SPB yang disetujui.",
            "reqId": "RN-EXP-001",
            "role": "Mantri Bibitan",
            "module": "Pengeluaran",
            "feature": "Pengeluaran Bibit (SPB Disetujui)",
            "processType": "Inisialisasi",
            "purpose": "Menyalurkan bibit karet ke divisi penanaman atau komersil.",
            "input": "Sesi aktif Mantri.",
            "process": "Sistem memuat daftar dokumen permintaan bibit yang telah disetujui Asisten Kepala.",
            "validation": "Presensi harian selesai.",
            "fallback": "-",
            "output": "Daftar SPB disetujui tampil.",
            "relatedRole": "Asisten Bibitan, Asisten Kepala",
            "businessRule": "BR-EXP-001: Pengeluaran berbasis permintaan yang telah disetujui.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "EXB_01",
            "code": "P-001",
            "type": "process",
            "title": "Pilih Dokumen Permintaan",
            "summary": "Mantri memilih dokumen SPB yang akan dimuat ke armada transportasi.",
            "reqId": "RN-EXP-002",
            "role": "Mantri Bibitan",
            "module": "Pengeluaran",
            "feature": "Pengeluaran Bibit (SPB Disetujui)",
            "processType": "Seleksi Dokumen",
            "purpose": "Menetapkan batas kuantitas dan klon bibit yang dikeluarkan.",
            "input": "Daftar dokumen SPB approved.",
            "process": "Mantri memilih nomor dokumen permohonan bibit.",
            "validation": "Dokumen berstatus APPROVED dan memiliki sisa alokasi.",
            "fallback": "-",
            "output": "Dokumen SPB dan kuota tampil.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-EXP-001: Kuantitas muat tidak boleh melebihi SPB.",
            "stockImpact": "KUOTA TERKUNCI",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "EXB_02",
            "code": "P-002",
            "type": "process",
            "title": "Scan QR Batch Bibit",
            "summary": "Validasi fisik QR Code Batch bibit di petak yang siap salur.",
            "reqId": "RN-EXP-003",
            "role": "Mantri Bibitan",
            "module": "Pengeluaran",
            "feature": "Pengeluaran Bibit (SPB Disetujui)",
            "processType": "Validasi Objek",
            "purpose": "Memastikan umur, klon, dan kondisi bibit sesuai pesanan.",
            "input": "QR Code Batch fisik.",
            "process": "Kamera memindai QR Code plang batch.",
            "validation": "Batch berstatus Siap Salur dan klon cocok dengan SPB.",
            "fallback": "Pilih manual jika QR rusak.",
            "output": "Batch terkonfirmasi sah.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-OKL-002: Batch wajib divalidasi QR Code.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "EXB_03",
            "code": "P-003",
            "type": "process",
            "title": "Input Kuantitas Aktual Dimuat",
            "summary": "Mencatat jumlah batang bibit aktual yang dinaikkan ke bak truk/armada angkut.",
            "reqId": "RN-EXP-004",
            "role": "Mantri Bibitan",
            "module": "Pengeluaran",
            "feature": "Pengeluaran Bibit (SPB Disetujui)",
            "processType": "Pencatatan Muat",
            "purpose": "Mendokumentasikan kuantitas riil yang meninggalkan nursery.",
            "input": "Jumlah batang bibit naik truk.",
            "process": "Mantri menghitung dan menginput kuantitas aktual muat.",
            "validation": "Aktual <= sisa kuota SPB dan <= populasi hidup Batch.",
            "fallback": "Koreksi hitung.",
            "output": "Kuantitas aktual muat tercatat.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-EXP-001: Aktual menjadi dasar pemotongan populasi batch.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "- POPULASI BATCH (Pending Verifikasi)",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "EXB_04",
            "code": "P-004",
            "type": "process",
            "title": "Foto Muatan Armada + Timestamp",
            "summary": "Foto dokumentasi fisik bibit yang tersusun rapi di atas armada angkut beserta nomor polisi.",
            "reqId": "RN-EXP-005",
            "role": "Mantri Bibitan",
            "module": "Pengeluaran",
            "feature": "Pengeluaran Bibit (SPB Disetujui)",
            "processType": "Audit Trail & Dispatch",
            "purpose": "Bukti fisik serah terima bibit ke supir/armada angkut.",
            "input": "Foto truk bermuatan bibit.",
            "process": "Kamera merekam foto dengan timestamp dan GPS.",
            "validation": "Foto wajib diunggah.",
            "fallback": "Ambil ulang jika buram.",
            "output": "Foto bukti muat tersimpan.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-GLB-001: Foto + Timestamp wajib.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "EXB_05",
            "code": "P-005",
            "type": "process",
            "title": "Verifikasi Asisten & Kurangi Populasi",
            "summary": "Asisten Bibitan memeriksa muatan dan menyetujui transaksi; populasi Batch resmi terpotong.",
            "reqId": "RN-EXP-006",
            "role": "Asisten Bibitan",
            "module": "Pengeluaran",
            "feature": "Pengeluaran Bibit (SPB Disetujui)",
            "processType": "Approval & Mutasi",
            "purpose": "Menerbitkan Surat Pengantar Pengeluaran Bibit (Surat Jalan resmi).",
            "input": "Data muat dan foto armada.",
            "process": "Asisten menyetujui pengeluaran; sistem memotong populasi Batch di basis data.",
            "validation": "Verifikasi Asisten sah.",
            "fallback": "Turunkan muatan jika ada ketidaksesuaian.",
            "output": "Populasi Batch resmi berkurang; Surat Jalan terbit.",
            "relatedRole": "Mantri Bibitan, Supir Armada",
            "businessRule": "BR-EXP-001: Verifikasi Asisten memotong populasi Batch secara sah.",
            "stockImpact": "- BIBIT PADA BATCH",
            "populationImpact": "- POPULASI BATCH (Resmi Terpotong)",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "EXB_END",
            "code": "END",
            "type": "end",
            "title": "Bibit Diberangkatkan ke Kebun",
            "summary": "Armada berangkat menuju divisi tanam; transaksi pengeluaran bibit selesai.",
            "reqId": "RN-EXP-007",
            "role": "Mantri Bibitan",
            "module": "Pengeluaran",
            "feature": "Pengeluaran Bibit (SPB Disetujui)",
            "processType": "Penyelesaian",
            "purpose": "Selesai proses pengeluaran bibit.",
            "input": "Surat jalan aktif.",
            "process": "Menunggu verifikasi penerimaan di divisi tujuan.",
            "validation": "-",
            "fallback": "-",
            "output": "Transaksi Completed.",
            "relatedRole": "Asisten Divisi Peminta",
            "businessRule": "BR-RCV-004: Menutup alur penyaluran bibit kebun.",
            "stockImpact": "TERDISTRIBUSI",
            "populationImpact": "BATCH DIPERBARUI",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          }
        ],
        "edges": []
      },
      "pengeluaran-mata-entres": {
        "title": "Flow Proses - Pengeluaran Mata Entres",
        "nodes": [
          {
            "id": "EXM_START",
            "code": "START",
            "type": "start",
            "title": "Buka Pengeluaran Mata Entres",
            "summary": "Pengeluaran mata entres berdasarkan dokumen permintaan yang telah disetujui.",
            "reqId": "RN-EXM-001",
            "role": "Mantri Bibitan",
            "module": "Pengeluaran",
            "feature": "Pengeluaran Mata Entres",
            "processType": "Inisialisasi",
            "purpose": "Menyalurkan kayu/mata entres ke kebun sendiri atau komersil.",
            "input": "Dokumen permintaan approved.",
            "process": "Sistem memuat data clone yang sudah melekat pada permintaan.",
            "validation": "Mantri tidak memilih clone baru (clone melekat pada dokumen).",
            "fallback": "-",
            "output": "Dokumen dan clone teridentifikasi.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-EXM-001: Clone sudah melekat pada dokumen permintaan.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "EXM_01",
            "code": "P-001",
            "type": "process",
            "title": "Scan QR Plot Entres",
            "summary": "Validasi fisik QR Code Plot Entres penyedia clone terkait (Bukan Batch).",
            "reqId": "RN-EXM-002",
            "role": "Mantri Bibitan",
            "module": "Pengeluaran",
            "feature": "Pengeluaran Mata Entres",
            "processType": "Validasi Objek",
            "purpose": "Objek = Plot Entres + Clone.",
            "input": "QR Code Plot Entres.",
            "process": "Kamera memindai QR fisik plot.",
            "validation": "Clone plot cocok dengan clone dokumen permintaan.",
            "fallback": "Pilih manual jika QR rusak.",
            "output": "Plot entres terverifikasi.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-EXM-001: Tidak menggunakan Batch; objek = Plot Entres + Clone.",
            "stockImpact": "NO STOCK CHANGE",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "EXM_02",
            "code": "P-002",
            "type": "process",
            "title": "Input Cabang & Catat Mata Aktual",
            "summary": "Menginput jumlah cabang dan kuantitas mata entres aktual yang dipotong untuk dikirim.",
            "reqId": "RN-EXM-003",
            "role": "Mantri Bibitan",
            "module": "Pengeluaran",
            "feature": "Pengeluaran Mata Entres",
            "processType": "Pencatatan Aktual",
            "purpose": "Mendokumentasikan kuantitas riil pengeluaran tunas entres.",
            "input": "Jumlah cabang dan mata tunas aktual.",
            "process": "Mantri menginput angka riil yang dikeluarkan.",
            "validation": "Mata entres aktual <= saldo stok Plot Entres + Clone.",
            "fallback": "Peringatan saldo kurang.",
            "output": "Kuantitas pengeluaran tercatat.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-EXM-002: Mata entres aktual memotong stok setelah verifikasi.",
            "stockImpact": "- MATA ENTRES (Pending Verifikasi)",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "EXM_03",
            "code": "P-003",
            "type": "process",
            "title": "Foto + Timestamp & Verifikasi",
            "summary": "Foto ikatan cabang kayu entres dan verifikasi persetujuan oleh Asisten Bibitan.",
            "reqId": "RN-EXM-004",
            "role": "Mantri Bibitan",
            "module": "Pengeluaran",
            "feature": "Pengeluaran Mata Entres",
            "processType": "Audit & Mutasi Stok",
            "purpose": "Mengesahkan pemotongan stok resmi mata entres.",
            "input": "Foto paket kayu entres.",
            "process": "Asisten Bibitan menyetujui pengeluaran; sistem memotong saldo stok.",
            "validation": "Verifikasi Asisten sah.",
            "fallback": "Revisi berkas.",
            "output": "Stok mata entres resmi berkurang (- STOCK).",
            "relatedRole": "Asisten Bibitan (Verifikasi)",
            "businessRule": "BR-EXM-002: Stok mata entres berkurang setelah verifikasi.",
            "stockImpact": "- MATA ENTRES (Resmi Terpotong)",
            "populationImpact": "NO POPULATION CHANGE",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          },
          {
            "id": "EXM_END",
            "code": "END",
            "type": "end",
            "title": "Mata Entres Terkirim",
            "summary": "Mata entres siap dikirim ke unit peminta; siklus pengeluaran entres tuntas.",
            "reqId": "RN-EXM-005",
            "role": "Mantri Bibitan",
            "module": "Pengeluaran",
            "feature": "Pengeluaran Mata Entres",
            "processType": "Penyelesaian",
            "purpose": "Selesai.",
            "input": "Status disetujui.",
            "process": "Data mutasi produksi tersinkron.",
            "validation": "-",
            "fallback": "-",
            "output": "Surat jalan kirim terbit.",
            "relatedRole": "Asisten Bibitan",
            "businessRule": "BR-EXM-002: Selesai.",
            "stockImpact": "TERDISTRIBUSI",
            "populationImpact": "TERVERIFIKASI",
            "version": 1,
            "status": "Confirmed",
            "isArchived": false,
            "revisionOf": null
          }
        ],
        "edges": []
      }
    }
  },
  "subFlows": [
    {
      "moduleId": "01-presensi",
      "moduleName": "Presensi",
      "featureId": "presensi-supervisor",
      "title": "Flow Proses - Presensi Supervisor",
      "nodeCount": 7,
      "edgeCount": 0
    },
    {
      "moduleId": "01-presensi",
      "moduleName": "Presensi",
      "featureId": "presensi-pekerja",
      "title": "Flow Proses - Presensi Pekerja Bibitan",
      "nodeCount": 5,
      "edgeCount": 0
    },
    {
      "moduleId": "02-penerimaan",
      "moduleName": "Penerimaan",
      "featureId": "terima-benih",
      "title": "Flow Proses - Penerimaan Benih / Biji Kelatak (Pihak Ke-3)",
      "nodeCount": 6,
      "edgeCount": 0
    },
    {
      "moduleId": "02-penerimaan",
      "moduleName": "Penerimaan",
      "featureId": "terima-kebun-sendiri",
      "title": "Flow Proses - Penerimaan Bibit (Kebun Sendiri - Cross-Role)",
      "nodeCount": 6,
      "edgeCount": 0
    },
    {
      "moduleId": "03-penyemaian",
      "moduleName": "Penyemaian",
      "featureId": "semai-bedengan",
      "title": "Flow Proses - Penyemaian Bedengan & Transplanting Polybag",
      "nodeCount": 8,
      "edgeCount": 0
    },
    {
      "moduleId": "04-okulasi",
      "moduleName": "Okulasi",
      "featureId": "grafting",
      "title": "Flow Proses - Grafting (Okulasi Utama)",
      "nodeCount": 16,
      "edgeCount": 0
    },
    {
      "moduleId": "04-okulasi",
      "moduleName": "Okulasi",
      "featureId": "regrafting",
      "title": "Flow Proses - Okulasi Janda (Regrafting)",
      "nodeCount": 12,
      "edgeCount": 0
    },
    {
      "moduleId": "05-pemeriksaan",
      "moduleName": "Pemeriksaan",
      "featureId": "periksa-grafting",
      "title": "Flow Proses - Pemeriksaan Bertahap Grafting",
      "nodeCount": 9,
      "edgeCount": 0
    },
    {
      "moduleId": "06-penyeleksian",
      "moduleName": "Penyeleksian",
      "featureId": "seleksi-batch",
      "title": "Flow Proses - Seleksi Kualitas Bibit Batch",
      "nodeCount": 11,
      "edgeCount": 0
    },
    {
      "moduleId": "07-kebun-entres",
      "moduleName": "Kebun Entres",
      "featureId": "entres-menunas",
      "title": "Flow Proses - Menunas Plot Entres",
      "nodeCount": 7,
      "edgeCount": 0
    },
    {
      "moduleId": "08-panen-mata-entres",
      "moduleName": "Panen Mata Entres",
      "featureId": "panen-entres",
      "title": "Flow Proses - Panen Mata Entres",
      "nodeCount": 8,
      "edgeCount": 0
    },
    {
      "moduleId": "09-material-bahan",
      "moduleName": "Material & Bahan",
      "featureId": "monitoring-stok-entres",
      "title": "Flow Proses - Monitoring Stok & Dokumen Gudang",
      "nodeCount": 7,
      "edgeCount": 0
    },
    {
      "moduleId": "10-rekam-pemeliharaan",
      "moduleName": "Rekam Pemeliharaan",
      "featureId": "pemeliharaan-heading",
      "title": "Flow Proses - Rekam Pemeliharaan Berbasis Heading Kerja",
      "nodeCount": 8,
      "edgeCount": 0
    },
    {
      "moduleId": "11-pengeluaran",
      "moduleName": "Pengeluaran",
      "featureId": "pengeluaran-bibit",
      "title": "Flow Proses - Pengeluaran Bibit (SPB Disetujui)",
      "nodeCount": 7,
      "edgeCount": 0
    },
    {
      "moduleId": "11-pengeluaran",
      "moduleName": "Pengeluaran",
      "featureId": "pengeluaran-mata-entres",
      "title": "Flow Proses - Pengeluaran Mata Entres",
      "nodeCount": 5,
      "edgeCount": 0
    }
  ],
  "flowNodes": [
    {
      "moduleId": "01-presensi",
      "featureId": "presensi-supervisor",
      "nodeId": "PR_START",
      "id": "PR_START",
      "code": "START",
      "nodeType": "start",
      "type": "start",
      "label": "Login Berhasil",
      "title": "Login Berhasil",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-PRS-001: Presensi Datang wajib selesai sebelum transaksi harian lain."
      ],
      "isArchived": false
    },
    {
      "moduleId": "01-presensi",
      "featureId": "presensi-supervisor",
      "nodeId": "PR_01",
      "id": "PR_01",
      "code": "P-001",
      "nodeType": "process",
      "type": "process",
      "label": "Pilih Status Datang / Pulang",
      "title": "Pilih Status Datang / Pulang",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-PRS-001: Presensi Datang prerequisite."
      ],
      "isArchived": false
    },
    {
      "moduleId": "01-presensi",
      "featureId": "presensi-supervisor",
      "nodeId": "PR_02",
      "id": "PR_02",
      "code": "P-002",
      "nodeType": "decision",
      "type": "decision",
      "label": "Face ID & Biometrik",
      "title": "Face ID & Biometrik",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-PRS-003: Face ID = metode utama. Foto Manual hanya fallback."
      ],
      "isArchived": false
    },
    {
      "moduleId": "01-presensi",
      "featureId": "presensi-supervisor",
      "nodeId": "PR_FB",
      "id": "PR_FB",
      "code": "FB-001",
      "nodeType": "process",
      "type": "process",
      "label": "Foto Manual + Alasan",
      "title": "Foto Manual + Alasan",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-PRS-003: Foto manual bukan pilihan utama, wajib alasan."
      ],
      "isArchived": false
    },
    {
      "moduleId": "01-presensi",
      "featureId": "presensi-supervisor",
      "nodeId": "PR_03",
      "id": "PR_03",
      "code": "P-003",
      "nodeType": "process",
      "type": "process",
      "label": "Validasi Geofencing & GPS",
      "title": "Validasi Geofencing & GPS",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-PRS-004: Geofencing wajib di Areal Bibitan yang sah."
      ],
      "isArchived": false
    },
    {
      "moduleId": "01-presensi",
      "featureId": "presensi-supervisor",
      "nodeId": "PR_04",
      "id": "PR_04",
      "code": "P-004",
      "nodeType": "process",
      "type": "process",
      "label": "Simpan Presensi Supervisor",
      "title": "Simpan Presensi Supervisor",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-PRS-001: Akses transaksi harian terbuka setelah presensi datang."
      ],
      "isArchived": false
    },
    {
      "moduleId": "01-presensi",
      "featureId": "presensi-supervisor",
      "nodeId": "PR_END",
      "id": "PR_END",
      "code": "END",
      "nodeType": "end",
      "type": "end",
      "label": "Selesai Presensi Supervisor",
      "title": "Selesai Presensi Supervisor",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-PRS-001: Sukses."
      ],
      "isArchived": false
    },
    {
      "moduleId": "01-presensi",
      "featureId": "presensi-pekerja",
      "nodeId": "PW_START",
      "id": "PW_START",
      "code": "START",
      "nodeType": "start",
      "type": "start",
      "label": "Buka Presensi Pekerja",
      "title": "Buka Presensi Pekerja",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-PRS-005: Presensi pekerja dilakukan oleh Mantri Bibitan."
      ],
      "isArchived": false
    },
    {
      "moduleId": "01-presensi",
      "featureId": "presensi-pekerja",
      "nodeId": "PW_01",
      "id": "PW_01",
      "code": "P-001",
      "nodeType": "process",
      "type": "process",
      "label": "Tentukan Pekerja Hadir",
      "title": "Tentukan Pekerja Hadir",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-PRS-006: Hanya pekerja hadir yang dapat dialokasikan tugas."
      ],
      "isArchived": false
    },
    {
      "moduleId": "01-presensi",
      "featureId": "presensi-pekerja",
      "nodeId": "PW_02",
      "id": "PW_02",
      "code": "P-002",
      "nodeType": "process",
      "type": "process",
      "label": "Tambah Pekerja Baru Jika Belum Ada",
      "title": "Tambah Pekerja Baru Jika Belum Ada",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-PRS-007: Pekerja bantuan harus memiliki NIK sah."
      ],
      "isArchived": false
    },
    {
      "moduleId": "01-presensi",
      "featureId": "presensi-pekerja",
      "nodeId": "PW_03",
      "id": "PW_03",
      "code": "P-003",
      "nodeType": "process",
      "type": "process",
      "label": "Konfirmasi Daftar & Simpan",
      "title": "Konfirmasi Daftar & Simpan",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-GLB-002: Verifikasi Asisten Bibitan diperlukan."
      ],
      "isArchived": false
    },
    {
      "moduleId": "01-presensi",
      "featureId": "presensi-pekerja",
      "nodeId": "PW_END",
      "id": "PW_END",
      "code": "END",
      "nodeType": "end",
      "type": "end",
      "label": "Pool Pekerja Aktif Hari Ini",
      "title": "Pool Pekerja Aktif Hari Ini",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-PRS-006: Sukses."
      ],
      "isArchived": false
    },
    {
      "moduleId": "02-penerimaan",
      "featureId": "terima-benih",
      "nodeId": "TB_01",
      "id": "TB_01",
      "code": "P-001",
      "nodeType": "start",
      "type": "start",
      "label": "Dokumen Pengeluaran Gudang Supplier",
      "title": "Dokumen Pengeluaran Gudang Supplier",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-RCV-001: Penerimaan benih pihak ke-3 wajib mengacu dokumen pengeluaran gudang."
      ],
      "isArchived": false
    },
    {
      "moduleId": "02-penerimaan",
      "featureId": "terima-benih",
      "nodeId": "TB_02",
      "id": "TB_02",
      "code": "P-002",
      "nodeType": "process",
      "type": "process",
      "label": "Tarik & Tampilkan Dokumen",
      "title": "Tarik & Tampilkan Dokumen",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-RCV-001: Data acuan dokumen wajib terisi."
      ],
      "isArchived": false
    },
    {
      "moduleId": "02-penerimaan",
      "featureId": "terima-benih",
      "nodeId": "TB_03",
      "id": "TB_03",
      "code": "P-003",
      "nodeType": "process",
      "type": "process",
      "label": "Catat Kuantitas Aktual Diterima",
      "title": "Catat Kuantitas Aktual Diterima",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-RCV-003: Tidak ada proses seleksi pada modul penerimaan benih."
      ],
      "isArchived": false
    },
    {
      "moduleId": "02-penerimaan",
      "featureId": "terima-benih",
      "nodeId": "TB_04",
      "id": "TB_04",
      "code": "P-004",
      "nodeType": "process",
      "type": "process",
      "label": "Dokumentasi Foto Fisik + Timestamp",
      "title": "Dokumentasi Foto Fisik + Timestamp",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-GLB-001: Foto + Timestamp wajib."
      ],
      "isArchived": false
    },
    {
      "moduleId": "02-penerimaan",
      "featureId": "terima-benih",
      "nodeId": "TB_05",
      "id": "TB_05",
      "code": "P-005",
      "nodeType": "process",
      "type": "process",
      "label": "Simpan & Verifikasi Asisten",
      "title": "Simpan & Verifikasi Asisten",
      "description": null,
      "role": "Asisten Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-GLB-003: Setelah diverifikasi, data menjadi dokumen sumber aktif untuk Penyemaian."
      ],
      "isArchived": false
    },
    {
      "moduleId": "02-penerimaan",
      "featureId": "terima-benih",
      "nodeId": "TB_END",
      "id": "TB_END",
      "code": "END",
      "nodeType": "end",
      "type": "end",
      "label": "Tersimpan di Production - Siap Disemai",
      "title": "Tersimpan di Production - Siap Disemai",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-SEM-001: 1 dokumen penerimaan dapat dialokasikan ke beberapa Bedengan."
      ],
      "isArchived": false
    },
    {
      "moduleId": "02-penerimaan",
      "featureId": "terima-kebun-sendiri",
      "nodeId": "KS_01",
      "id": "KS_01",
      "code": "CR-001",
      "nodeType": "start",
      "type": "start",
      "label": "Asisten Divisi Buat Permintaan Bibit",
      "title": "Asisten Divisi Buat Permintaan Bibit",
      "description": null,
      "role": "Asisten Divisi",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-RCV-004: Alur cross-role wajib review Asisten Kepala."
      ],
      "isArchived": false
    },
    {
      "moduleId": "02-penerimaan",
      "featureId": "terima-kebun-sendiri",
      "nodeId": "KS_02",
      "id": "KS_02",
      "code": "CR-002",
      "nodeType": "process",
      "type": "process",
      "label": "Asisten Kepala Review & Cek Stok",
      "title": "Asisten Kepala Review & Cek Stok",
      "description": null,
      "role": "Asisten Kepala",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-RCV-004: Asisten Kepala memiliki wewenang koreksi/pembatalan."
      ],
      "isArchived": false
    },
    {
      "moduleId": "02-penerimaan",
      "featureId": "terima-kebun-sendiri",
      "nodeId": "KS_DEC",
      "id": "KS_DEC",
      "code": "CR-003",
      "nodeType": "decision",
      "type": "decision",
      "label": "Keputusan Stok Cukup?",
      "title": "Keputusan Stok Cukup?",
      "description": null,
      "role": "Asisten Kepala",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-RCV-004: Keputusan approval mengunci kuota alokasi."
      ],
      "isArchived": false
    },
    {
      "moduleId": "02-penerimaan",
      "featureId": "terima-kebun-sendiri",
      "nodeId": "KS_03",
      "id": "KS_03",
      "code": "CR-004",
      "nodeType": "process",
      "type": "process",
      "label": "Mantri Bibitan Pengeluaran Bibit",
      "title": "Mantri Bibitan Pengeluaran Bibit",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-EXP-001: Pengeluaran bibit wajib divalidasi QR Batch dan foto dokumentasi."
      ],
      "isArchived": false
    },
    {
      "moduleId": "02-penerimaan",
      "featureId": "terima-kebun-sendiri",
      "nodeId": "KS_04",
      "id": "KS_04",
      "code": "CR-005",
      "nodeType": "process",
      "type": "process",
      "label": "Asisten Divisi Verifikasi Penerimaan",
      "title": "Asisten Divisi Verifikasi Penerimaan",
      "description": null,
      "role": "Asisten Divisi",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-RCV-004: Verifikasi penerimaan Asisten Divisi menutup siklus distribusi bibit."
      ],
      "isArchived": false
    },
    {
      "moduleId": "02-penerimaan",
      "featureId": "terima-kebun-sendiri",
      "nodeId": "KS_END",
      "id": "KS_END",
      "code": "END",
      "nodeType": "end",
      "type": "end",
      "label": "Penerimaan Bibit Tuntas",
      "title": "Penerimaan Bibit Tuntas",
      "description": null,
      "role": "Asisten Divisi",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-RCV-004: Siklus selesai."
      ],
      "isArchived": false
    },
    {
      "moduleId": "03-penyemaian",
      "featureId": "semai-bedengan",
      "nodeId": "SM_START",
      "id": "SM_START",
      "code": "START",
      "nodeType": "start",
      "type": "start",
      "label": "Pilih Dokumen Penerimaan Benih",
      "title": "Pilih Dokumen Penerimaan Benih",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-SEM-001: 1 receipt document dapat digunakan untuk beberapa Bedengan."
      ],
      "isArchived": false
    },
    {
      "moduleId": "03-penyemaian",
      "featureId": "semai-bedengan",
      "nodeId": "SM_01",
      "id": "SM_01",
      "code": "P-001",
      "nodeType": "process",
      "type": "process",
      "label": "Scan QR Bedengan",
      "title": "Scan QR Bedengan",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-SEM-002: QR Bedengan wajib dipindai. Manual hanya fallback jika QR rusak."
      ],
      "isArchived": false
    },
    {
      "moduleId": "03-penyemaian",
      "featureId": "semai-bedengan",
      "nodeId": "SM_02",
      "id": "SM_02",
      "code": "P-002",
      "nodeType": "process",
      "type": "process",
      "label": "Input Jumlah Disemai & Reject",
      "title": "Input Jumlah Disemai & Reject",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-SEM-003: Total disemai + reject tidak boleh melebihi kuota dokumen penerimaan."
      ],
      "isArchived": false
    },
    {
      "moduleId": "03-penyemaian",
      "featureId": "semai-bedengan",
      "nodeId": "SM_03",
      "id": "SM_03",
      "code": "P-003",
      "nodeType": "process",
      "type": "process",
      "label": "Foto Benih Tidak Layak + Timestamp",
      "title": "Foto Benih Tidak Layak + Timestamp",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-GLB-001: Foto + Timestamp wajib."
      ],
      "isArchived": false
    },
    {
      "moduleId": "03-penyemaian",
      "featureId": "semai-bedengan",
      "nodeId": "SM_04",
      "id": "SM_04",
      "code": "P-004",
      "nodeType": "process",
      "type": "process",
      "label": "Verifikasi Asisten & ±12–15 Hari Semai",
      "title": "Verifikasi Asisten & ±12–15 Hari Semai",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-SEM-005: Siklus penyemaian ke polybag berlangsung ±12–15 hari."
      ],
      "isArchived": false
    },
    {
      "moduleId": "03-penyemaian",
      "featureId": "semai-bedengan",
      "nodeId": "SM_05",
      "id": "SM_05",
      "code": "P-005",
      "nodeType": "process",
      "type": "process",
      "label": "Transplanting ke Polybag (1 Polybag = 2 Benih)",
      "title": "Transplanting ke Polybag (1 Polybag = 2 Benih)",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-SEM-006: 1 Polybag = 2 Benih/Bibit."
      ],
      "isArchived": false
    },
    {
      "moduleId": "03-penyemaian",
      "featureId": "semai-bedengan",
      "nodeId": "SM_06",
      "id": "SM_06",
      "code": "P-006",
      "nodeType": "process",
      "type": "process",
      "label": "Konsolidasi Multi-Bedengan ke Batch",
      "title": "Konsolidasi Multi-Bedengan ke Batch",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-SEM-007: 1 Batch dapat terdiri dari beberapa Bedengan."
      ],
      "isArchived": false
    },
    {
      "moduleId": "03-penyemaian",
      "featureId": "semai-bedengan",
      "nodeId": "SM_END",
      "id": "SM_END",
      "code": "END",
      "nodeType": "end",
      "type": "end",
      "label": "Batch Siap Masuk Siklus Okulasi",
      "title": "Batch Siap Masuk Siklus Okulasi",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-SEM-007: Siklus penyemaian selesai."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "grafting",
      "nodeId": "N_START",
      "id": "N_START",
      "code": "START",
      "nodeType": "start",
      "type": "start",
      "label": "Mulai",
      "title": "Mulai",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-001: Presensi wajib selesai sebelum transaksi operasional."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "grafting",
      "nodeId": "N_P001",
      "id": "N_P001",
      "code": "P-001",
      "nodeType": "process",
      "type": "process",
      "label": "Pilih Batch",
      "title": "Pilih Batch",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-002: Batch harus tervalidasi sebelum transaksi dilakukan."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "grafting",
      "nodeId": "N_P002",
      "id": "N_P002",
      "code": "P-002",
      "nodeType": "process",
      "type": "process",
      "label": "Scan QR Batch",
      "title": "Scan QR Batch",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-002: Batch wajib tervalidasi menggunakan QR Code fisik sebelum penginputan."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "grafting",
      "nodeId": "N_P003",
      "id": "N_P003",
      "code": "P-003",
      "nodeType": "process",
      "type": "process",
      "label": "Validasi Batch",
      "title": "Validasi Batch",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-002: Validasi objek fisik batch."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "grafting",
      "nodeId": "N_P004",
      "id": "N_P004",
      "code": "P-004",
      "nodeType": "process",
      "type": "process",
      "label": "Tampilkan Populasi",
      "title": "Tampilkan Populasi",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-003: Jumlah bibit diokulasi tidak boleh melebihi populasi aktif."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "grafting",
      "nodeId": "N_P005",
      "id": "N_P005",
      "code": "P-005",
      "nodeType": "process",
      "type": "process",
      "label": "Tentukan Pekerja",
      "title": "Tentukan Pekerja",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-004: Pekerja wajib terverifikasi dalam presensi harian."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "grafting",
      "nodeId": "N_P006",
      "id": "N_P006",
      "code": "P-006",
      "nodeType": "process",
      "type": "process",
      "label": "Pilih Plot Entres",
      "title": "Pilih Plot Entres",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-005: Stok mata entres menggunakan kombinasi Plot Entres + Clone."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "grafting",
      "nodeId": "N_P007",
      "id": "N_P007",
      "code": "P-007",
      "nodeType": "process",
      "type": "process",
      "label": "Scan QR Plot Entres",
      "title": "Scan QR Plot Entres",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-005: QR Code plot entres wajib divalidasi."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "grafting",
      "nodeId": "N_P008",
      "id": "N_P008",
      "code": "P-008",
      "nodeType": "process",
      "type": "process",
      "label": "Input Cabang Entres",
      "title": "Input Cabang Entres",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-006: Estimasi = Jumlah Cabang x Rata-rata Mata Entres per Cabang."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "grafting",
      "nodeId": "N_P009",
      "id": "N_P009",
      "code": "P-009",
      "nodeType": "process",
      "type": "process",
      "label": "Tampilkan Estimasi",
      "title": "Tampilkan Estimasi",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-006: Estimasi bukan stok resmi. Hanya mata entres aktual yang memotong stok."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "grafting",
      "nodeId": "N_P010",
      "id": "N_P010",
      "code": "P-010",
      "nodeType": "process",
      "type": "process",
      "label": "Input Mata Entres Aktual",
      "title": "Input Mata Entres Aktual",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-007: Mata entres aktual menjadi dasar pengurang stok setelah verifikasi."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "grafting",
      "nodeId": "N_P011",
      "id": "N_P011",
      "code": "P-011",
      "nodeType": "process",
      "type": "process",
      "label": "Dokumentasi Foto + Timestamp",
      "title": "Dokumentasi Foto + Timestamp",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-GLB-001: Setiap transaksi Mantri wajib menyertakan Foto + Timestamp."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "grafting",
      "nodeId": "N_P012",
      "id": "N_P012",
      "code": "P-012",
      "nodeType": "process",
      "type": "process",
      "label": "Submit Transaksi",
      "title": "Submit Transaksi",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-GLB-002: Semua transaksi Mantri memerlukan verifikasi Asisten Bibitan."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "grafting",
      "nodeId": "N_P013",
      "id": "N_P013",
      "code": "P-013",
      "nodeType": "process",
      "type": "process",
      "label": "Verifikasi Asisten Bibitan",
      "title": "Verifikasi Asisten Bibitan",
      "description": null,
      "role": "Asisten Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-GLB-003: Setelah diverifikasi Asisten, data diteruskan ke Server Production."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "grafting",
      "nodeId": "N_P014",
      "id": "N_P014",
      "code": "P-014",
      "nodeType": "process",
      "type": "process",
      "label": "Update Stok Mata Entres",
      "title": "Update Stok Mata Entres",
      "description": null,
      "role": "Sistem Database",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-007: Pengurangan stok hanya terjadi setelah verifikasi Asisten disetujui."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "grafting",
      "nodeId": "N_END",
      "id": "N_END",
      "code": "END",
      "nodeType": "end",
      "type": "end",
      "label": "Selesai",
      "title": "Selesai",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-GLB-003: Sinkronisasi server production sukses."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "regrafting",
      "nodeId": "RG_START",
      "id": "RG_START",
      "code": "START",
      "nodeType": "start",
      "type": "start",
      "label": "Mulai Regrafting",
      "title": "Mulai Regrafting",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-008: Regrafting dapat dilakukan berulang kali tanpa batasan hanya satu kali."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "regrafting",
      "nodeId": "RG_01",
      "id": "RG_01",
      "code": "P-001",
      "nodeType": "process",
      "type": "process",
      "label": "Pilih Batch & Sumber Pemeriksaan",
      "title": "Pilih Batch & Sumber Pemeriksaan",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-008: Sifat dinamis, sistem mencari dokumen berkewajiban pemeriksaan."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "regrafting",
      "nodeId": "RG_02",
      "id": "RG_02",
      "code": "P-002",
      "nodeType": "process",
      "type": "process",
      "label": "Scan QR Batch",
      "title": "Scan QR Batch",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-002: Batch wajib tervalidasi menggunakan QR Code."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "regrafting",
      "nodeId": "RG_03",
      "id": "RG_03",
      "code": "P-003",
      "nodeType": "process",
      "type": "process",
      "label": "Validasi Data Bibit Gagal",
      "title": "Validasi Data Bibit Gagal",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-008: Batas regrafting mengacu pada dokumen pemeriksaan sumber."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "regrafting",
      "nodeId": "RG_04",
      "id": "RG_04",
      "code": "P-004",
      "nodeType": "process",
      "type": "process",
      "label": "Input Kuantitas Regrafting",
      "title": "Input Kuantitas Regrafting",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-004: Pekerja harus terdaftar pada presensi harian."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "regrafting",
      "nodeId": "RG_05",
      "id": "RG_05",
      "code": "P-005",
      "nodeType": "process",
      "type": "process",
      "label": "Pilih Plot Entres & Scan QR",
      "title": "Pilih Plot Entres & Scan QR",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-005: Stok mata entres menggunakan Plot Entres + Clone."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "regrafting",
      "nodeId": "RG_06",
      "id": "RG_06",
      "code": "P-006",
      "nodeType": "process",
      "type": "process",
      "label": "Input Mata Entres Aktual",
      "title": "Input Mata Entres Aktual",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-007: Mata entres aktual menjadi dasar pengurang stok setelah verifikasi."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "regrafting",
      "nodeId": "RG_07",
      "id": "RG_07",
      "code": "P-007",
      "nodeType": "process",
      "type": "process",
      "label": "Dokumentasi Foto + Timestamp",
      "title": "Dokumentasi Foto + Timestamp",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-GLB-001: Foto dokumentasi + timestamp wajib disertakan pada seluruh transaksi Mantri."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "regrafting",
      "nodeId": "RG_08",
      "id": "RG_08",
      "code": "P-008",
      "nodeType": "process",
      "type": "process",
      "label": "Submit Transaksi",
      "title": "Submit Transaksi",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-GLB-002: Verifikasi Asisten Bibitan wajib sebelum data masuk server production."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "regrafting",
      "nodeId": "RG_09",
      "id": "RG_09",
      "code": "P-009",
      "nodeType": "process",
      "type": "process",
      "label": "Verifikasi Asisten Bibitan",
      "title": "Verifikasi Asisten Bibitan",
      "description": null,
      "role": "Asisten Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-GLB-003: Setelah disetujui, data dikirim ke Server Production."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "regrafting",
      "nodeId": "RG_10",
      "id": "RG_10",
      "code": "P-010",
      "nodeType": "process",
      "type": "process",
      "label": "Potong Stok Mata Entres",
      "title": "Potong Stok Mata Entres",
      "description": null,
      "role": "Sistem Database",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-007: Pengurangan stok mata entres hanya terjadi setelah verifikasi disetujui."
      ],
      "isArchived": false
    },
    {
      "moduleId": "04-okulasi",
      "featureId": "regrafting",
      "nodeId": "RG_END",
      "id": "RG_END",
      "code": "END",
      "nodeType": "end",
      "type": "end",
      "label": "Selesai Regrafting",
      "title": "Selesai Regrafting",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-008: Regrafting dapat berlanjut ke Pemeriksaan -> Berhasil / Gagal (Regrafting ulang / Reject)."
      ],
      "isArchived": false
    },
    {
      "moduleId": "05-pemeriksaan",
      "featureId": "periksa-grafting",
      "nodeId": "CHK_START",
      "id": "CHK_START",
      "code": "START",
      "nodeType": "start",
      "type": "start",
      "label": "Buka Pemeriksaan",
      "title": "Buka Pemeriksaan",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-008: Pemeriksaan bersifat dinamis dan dapat bertahap."
      ],
      "isArchived": false
    },
    {
      "moduleId": "05-pemeriksaan",
      "featureId": "periksa-grafting",
      "nodeId": "CHK_01",
      "id": "CHK_01",
      "code": "P-001",
      "nodeType": "process",
      "type": "process",
      "label": "Pilih Dokumen Okulasi",
      "title": "Pilih Dokumen Okulasi",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-008: Identifikasi tanggal, batch, dan transaksi sumber."
      ],
      "isArchived": false
    },
    {
      "moduleId": "05-pemeriksaan",
      "featureId": "periksa-grafting",
      "nodeId": "CHK_02",
      "id": "CHK_02",
      "code": "P-002",
      "nodeType": "process",
      "type": "process",
      "label": "Scan QR Batch",
      "title": "Scan QR Batch",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-002: Batch wajib divalidasi QR Code."
      ],
      "isArchived": false
    },
    {
      "moduleId": "05-pemeriksaan",
      "featureId": "periksa-grafting",
      "nodeId": "CHK_03",
      "id": "CHK_03",
      "code": "P-003",
      "nodeType": "process",
      "type": "process",
      "label": "Input Bibit Diperiksa Bertahap",
      "title": "Input Bibit Diperiksa Bertahap",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-008: Dokumen tetap muncul hingga seluruh bibit diperiksa."
      ],
      "isArchived": false
    },
    {
      "moduleId": "05-pemeriksaan",
      "featureId": "periksa-grafting",
      "nodeId": "CHK_04",
      "id": "CHK_04",
      "code": "P-004",
      "nodeType": "process",
      "type": "process",
      "label": "Input Berhasil & Gagal",
      "title": "Input Berhasil & Gagal",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-008: Rendemen okulasi tercatat otomatis."
      ],
      "isArchived": false
    },
    {
      "moduleId": "05-pemeriksaan",
      "featureId": "periksa-grafting",
      "nodeId": "CHK_05",
      "id": "CHK_05",
      "code": "P-005",
      "nodeType": "decision",
      "type": "decision",
      "label": "Tindak Lanjut Bibit Gagal",
      "title": "Tindak Lanjut Bibit Gagal",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-008: Gagal tidak otomatis reject final; Mantri berhak menentukan regrafting."
      ],
      "isArchived": false
    },
    {
      "moduleId": "05-pemeriksaan",
      "featureId": "periksa-grafting",
      "nodeId": "CHK_06",
      "id": "CHK_06",
      "code": "P-006",
      "nodeType": "process",
      "type": "process",
      "label": "Dokumentasi Foto + Timestamp",
      "title": "Dokumentasi Foto + Timestamp",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-GLB-001: Foto + Timestamp wajib pada transaksi Mantri."
      ],
      "isArchived": false
    },
    {
      "moduleId": "05-pemeriksaan",
      "featureId": "periksa-grafting",
      "nodeId": "CHK_07",
      "id": "CHK_07",
      "code": "P-007",
      "nodeType": "process",
      "type": "process",
      "label": "Submit & Verifikasi Asisten",
      "title": "Submit & Verifikasi Asisten",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-GLB-002: Verifikasi Asisten Bibitan wajib sebelum ke Server Production."
      ],
      "isArchived": false
    },
    {
      "moduleId": "05-pemeriksaan",
      "featureId": "periksa-grafting",
      "nodeId": "CHK_END",
      "id": "CHK_END",
      "code": "END",
      "nodeType": "end",
      "type": "end",
      "label": "Selesai Pemeriksaan",
      "title": "Selesai Pemeriksaan",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-008: Siklus pemeriksaan tuntas."
      ],
      "isArchived": false
    },
    {
      "moduleId": "06-penyeleksian",
      "featureId": "seleksi-batch",
      "nodeId": "SEL_START",
      "id": "SEL_START",
      "code": "START",
      "nodeType": "start",
      "type": "start",
      "label": "Buka Penyeleksian Kualitas",
      "title": "Buka Penyeleksian Kualitas",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-SEL-001: Bersifat dinamis dan dapat dilakukan berulang kali."
      ],
      "isArchived": false
    },
    {
      "moduleId": "06-penyeleksian",
      "featureId": "seleksi-batch",
      "nodeId": "SEL_01",
      "id": "SEL_01",
      "code": "P-001",
      "nodeType": "process",
      "type": "process",
      "label": "Pilih Dokumen Sumber",
      "title": "Pilih Dokumen Sumber",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-SEL-001: Penelusuran data: Source Document + Batch + Tanggal."
      ],
      "isArchived": false
    },
    {
      "moduleId": "06-penyeleksian",
      "featureId": "seleksi-batch",
      "nodeId": "SEL_02",
      "id": "SEL_02",
      "code": "P-002",
      "nodeType": "process",
      "type": "process",
      "label": "Scan QR Batch",
      "title": "Scan QR Batch",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-002: Batch wajib divalidasi QR Code."
      ],
      "isArchived": false
    },
    {
      "moduleId": "06-penyeleksian",
      "featureId": "seleksi-batch",
      "nodeId": "SEL_03",
      "id": "SEL_03",
      "code": "P-003",
      "nodeType": "process",
      "type": "process",
      "label": "Tampilkan Populasi Acuan",
      "title": "Tampilkan Populasi Acuan",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-SEL-001: Populasi acuan berasal dari verifikasi terakhir."
      ],
      "isArchived": false
    },
    {
      "moduleId": "06-penyeleksian",
      "featureId": "seleksi-batch",
      "nodeId": "SEL_04",
      "id": "SEL_04",
      "code": "P-004",
      "nodeType": "process",
      "type": "process",
      "label": "Deklarasi Nilai Seleksi",
      "title": "Deklarasi Nilai Seleksi",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-SEL-001: Reject/Mati BELUM langsung mengurangi populasi Batch."
      ],
      "isArchived": false
    },
    {
      "moduleId": "06-penyeleksian",
      "featureId": "seleksi-batch",
      "nodeId": "SEL_05",
      "id": "SEL_05",
      "code": "P-005",
      "nodeType": "process",
      "type": "process",
      "label": "Foto Dokumentasi + Timestamp",
      "title": "Foto Dokumentasi + Timestamp",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-GLB-001: Foto + Timestamp wajib."
      ],
      "isArchived": false
    },
    {
      "moduleId": "06-penyeleksian",
      "featureId": "seleksi-batch",
      "nodeId": "SEL_06",
      "id": "SEL_06",
      "code": "P-006",
      "nodeType": "process",
      "type": "process",
      "label": "Submit Menunggu Verifikasi",
      "title": "Submit Menunggu Verifikasi",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-GLB-002: Verifikasi Asisten Bibitan wajib."
      ],
      "isArchived": false
    },
    {
      "moduleId": "06-penyeleksian",
      "featureId": "seleksi-batch",
      "nodeId": "SEL_07",
      "id": "SEL_07",
      "code": "P-007",
      "nodeType": "process",
      "type": "process",
      "label": "Asisten Pemeriksaan Fisik Batch",
      "title": "Asisten Pemeriksaan Fisik Batch",
      "description": null,
      "role": "Asisten Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-SEL-001: Asisten membandingkan Transaksi vs Fisik."
      ],
      "isArchived": false
    },
    {
      "moduleId": "06-penyeleksian",
      "featureId": "seleksi-batch",
      "nodeId": "SEL_08",
      "id": "SEL_08",
      "code": "P-008",
      "nodeType": "process",
      "type": "process",
      "label": "Bandingkan Transaksi vs Fisik",
      "title": "Bandingkan Transaksi vs Fisik",
      "description": null,
      "role": "Asisten Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-SEL-001: Verifikasi fisik mutlak."
      ],
      "isArchived": false
    },
    {
      "moduleId": "06-penyeleksian",
      "featureId": "seleksi-batch",
      "nodeId": "SEL_09",
      "id": "SEL_09",
      "code": "P-009",
      "nodeType": "process",
      "type": "process",
      "label": "Verifikasi & Kurangi Batch",
      "title": "Verifikasi & Kurangi Batch",
      "description": null,
      "role": "Asisten Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-SEL-001: Nilai terverifikasi menjadi dasar pengurangan populasi Batch."
      ],
      "isArchived": false
    },
    {
      "moduleId": "06-penyeleksian",
      "featureId": "seleksi-batch",
      "nodeId": "SEL_END",
      "id": "SEL_END",
      "code": "END",
      "nodeType": "end",
      "type": "end",
      "label": "Populasi Batch Sah",
      "title": "Populasi Batch Sah",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-SEL-001: Sukses."
      ],
      "isArchived": false
    },
    {
      "moduleId": "07-kebun-entres",
      "featureId": "entres-menunas",
      "nodeId": "MN_START",
      "id": "MN_START",
      "code": "START",
      "nodeType": "start",
      "type": "start",
      "label": "Buka Menunas Entres",
      "title": "Buka Menunas Entres",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-ENT-001: Menunas Plot Entres."
      ],
      "isArchived": false
    },
    {
      "moduleId": "07-kebun-entres",
      "featureId": "entres-menunas",
      "nodeId": "MN_01",
      "id": "MN_01",
      "code": "P-001",
      "nodeType": "process",
      "type": "process",
      "label": "Scan QR Plot Entres",
      "title": "Scan QR Plot Entres",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-005: Objek = Plot Entres."
      ],
      "isArchived": false
    },
    {
      "moduleId": "07-kebun-entres",
      "featureId": "entres-menunas",
      "nodeId": "MN_02",
      "id": "MN_02",
      "code": "P-002",
      "nodeType": "process",
      "type": "process",
      "label": "Tampilkan Clone & Pokok",
      "title": "Tampilkan Clone & Pokok",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-ENT-001: Data clone melekat pada plot."
      ],
      "isArchived": false
    },
    {
      "moduleId": "07-kebun-entres",
      "featureId": "entres-menunas",
      "nodeId": "MN_03",
      "id": "MN_03",
      "code": "P-003",
      "nodeType": "process",
      "type": "process",
      "label": "Input Variabel Menunas",
      "title": "Input Variabel Menunas",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-ENT-001: Variabel: Perisai, Cabang, Panjang Meter."
      ],
      "isArchived": false
    },
    {
      "moduleId": "07-kebun-entres",
      "featureId": "entres-menunas",
      "nodeId": "MN_04",
      "id": "MN_04",
      "code": "P-004",
      "nodeType": "process",
      "type": "process",
      "label": "Hitung Rata-rata Otomatis",
      "title": "Hitung Rata-rata Otomatis",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-ENT-001: Hitung Rata-rata Perisai/Cabang dan Perisai/Meter."
      ],
      "isArchived": false
    },
    {
      "moduleId": "07-kebun-entres",
      "featureId": "entres-menunas",
      "nodeId": "MN_05",
      "id": "MN_05",
      "code": "P-005",
      "nodeType": "process",
      "type": "process",
      "label": "Foto + Timestamp & Verifikasi",
      "title": "Foto + Timestamp & Verifikasi",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-GLB-001: Foto + Timestamp; BR-GLB-002: Verifikasi Asisten."
      ],
      "isArchived": false
    },
    {
      "moduleId": "07-kebun-entres",
      "featureId": "entres-menunas",
      "nodeId": "MN_END",
      "id": "MN_END",
      "code": "END",
      "nodeType": "end",
      "type": "end",
      "label": "Menunas Selesai",
      "title": "Menunas Selesai",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-ENT-001: Sukses."
      ],
      "isArchived": false
    },
    {
      "moduleId": "08-panen-mata-entres",
      "featureId": "panen-entres",
      "nodeId": "PN_START",
      "id": "PN_START",
      "code": "START",
      "nodeType": "start",
      "type": "start",
      "label": "Buka Panen Mata Entres",
      "title": "Buka Panen Mata Entres",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-HAR-001: Objek panen = Plot Entres + Clone."
      ],
      "isArchived": false
    },
    {
      "moduleId": "08-panen-mata-entres",
      "featureId": "panen-entres",
      "nodeId": "PN_01",
      "id": "PN_01",
      "code": "P-001",
      "nodeType": "process",
      "type": "process",
      "label": "Scan QR Plot Entres",
      "title": "Scan QR Plot Entres",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-HAR-001: QR Plot Entres wajib."
      ],
      "isArchived": false
    },
    {
      "moduleId": "08-panen-mata-entres",
      "featureId": "panen-entres",
      "nodeId": "PN_02",
      "id": "PN_02",
      "code": "P-002",
      "nodeType": "process",
      "type": "process",
      "label": "Input Cabang & Rata-rata Mata",
      "title": "Input Cabang & Rata-rata Mata",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-006: Rumus: Cabang x Rata-rata Mata/Cabang = Estimasi Mata Entres."
      ],
      "isArchived": false
    },
    {
      "moduleId": "08-panen-mata-entres",
      "featureId": "panen-entres",
      "nodeId": "PN_03",
      "id": "PN_03",
      "code": "P-003",
      "nodeType": "process",
      "type": "process",
      "label": "Hitung Estimasi Mata Entres",
      "title": "Hitung Estimasi Mata Entres",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-006: Estimasi bukan stok resmi."
      ],
      "isArchived": false
    },
    {
      "moduleId": "08-panen-mata-entres",
      "featureId": "panen-entres",
      "nodeId": "PN_04",
      "id": "PN_04",
      "code": "P-004",
      "nodeType": "process",
      "type": "process",
      "label": "Input Mata Entres Aktual",
      "title": "Input Mata Entres Aktual",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-HAR-001: Hanya mata entres aktual yang diverifikasi yang masuk stok."
      ],
      "isArchived": false
    },
    {
      "moduleId": "08-panen-mata-entres",
      "featureId": "panen-entres",
      "nodeId": "PN_05",
      "id": "PN_05",
      "code": "P-005",
      "nodeType": "process",
      "type": "process",
      "label": "Dokumentasi Foto + Timestamp",
      "title": "Dokumentasi Foto + Timestamp",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-GLB-001: Foto + Timestamp wajib."
      ],
      "isArchived": false
    },
    {
      "moduleId": "08-panen-mata-entres",
      "featureId": "panen-entres",
      "nodeId": "PN_06",
      "id": "PN_06",
      "code": "P-006",
      "nodeType": "process",
      "type": "process",
      "label": "Verifikasi Asisten & Tambah Stok",
      "title": "Verifikasi Asisten & Tambah Stok",
      "description": null,
      "role": "Asisten Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-HAR-001: Panen mata entres terverifikasi menambah stok resmi."
      ],
      "isArchived": false
    },
    {
      "moduleId": "08-panen-mata-entres",
      "featureId": "panen-entres",
      "nodeId": "PN_END",
      "id": "PN_END",
      "code": "END",
      "nodeType": "end",
      "type": "end",
      "label": "Stok Mata Entres Tersedia",
      "title": "Stok Mata Entres Tersedia",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-HAR-001: Siklus panen selesai."
      ],
      "isArchived": false
    },
    {
      "moduleId": "09-material-bahan",
      "featureId": "monitoring-stok-entres",
      "nodeId": "MB_START",
      "id": "MB_START",
      "code": "START",
      "nodeType": "start",
      "type": "start",
      "label": "Buka Monitoring Material",
      "title": "Buka Monitoring Material",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-MAT-001: 1 Dokumen Gudang = 1 Heading Kerja."
      ],
      "isArchived": false
    },
    {
      "moduleId": "09-material-bahan",
      "featureId": "monitoring-stok-entres",
      "nodeId": "MB_01",
      "id": "MB_01",
      "code": "P-001",
      "nodeType": "process",
      "type": "process",
      "label": "Pilih Plot Entres + Clone",
      "title": "Pilih Plot Entres + Clone",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-005: Stok menggunakan Plot Entres + Clone."
      ],
      "isArchived": false
    },
    {
      "moduleId": "09-material-bahan",
      "featureId": "monitoring-stok-entres",
      "nodeId": "MB_02",
      "id": "MB_02",
      "code": "P-002",
      "nodeType": "process",
      "type": "process",
      "label": "Audit Mutasi Masuk & Keluar",
      "title": "Audit Mutasi Masuk & Keluar",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-MAT-002: Tidak boleh ada pengurangan stok manual."
      ],
      "isArchived": false
    },
    {
      "moduleId": "09-material-bahan",
      "featureId": "monitoring-stok-entres",
      "nodeId": "MB_03",
      "id": "MB_03",
      "code": "P-003",
      "nodeType": "process",
      "type": "process",
      "label": "Tarik Dokumen Gudang Material",
      "title": "Tarik Dokumen Gudang Material",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-MAT-001: 1 Dokumen Gudang = 1 Heading Kerja."
      ],
      "isArchived": false
    },
    {
      "moduleId": "09-material-bahan",
      "featureId": "monitoring-stok-entres",
      "nodeId": "MB_04",
      "id": "MB_04",
      "code": "P-004",
      "nodeType": "decision",
      "type": "decision",
      "label": "Matching Heading Kerja?",
      "title": "Matching Heading Kerja?",
      "description": null,
      "role": "Sistem",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-MAT-001: Dokumen tidak dapat digunakan jika heading tidak matching."
      ],
      "isArchived": false
    },
    {
      "moduleId": "09-material-bahan",
      "featureId": "monitoring-stok-entres",
      "nodeId": "MB_05",
      "id": "MB_05",
      "code": "P-005",
      "nodeType": "process",
      "type": "process",
      "label": "Lekatkan Dokumen & Verifikasi",
      "title": "Lekatkan Dokumen & Verifikasi",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-GLB-002: Verifikasi Asisten Bibitan wajib."
      ],
      "isArchived": false
    },
    {
      "moduleId": "09-material-bahan",
      "featureId": "monitoring-stok-entres",
      "nodeId": "MB_END",
      "id": "MB_END",
      "code": "END",
      "nodeType": "end",
      "type": "end",
      "label": "Material & Saldo Sah",
      "title": "Material & Saldo Sah",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-MAT-001: Selesai."
      ],
      "isArchived": false
    },
    {
      "moduleId": "10-rekam-pemeliharaan",
      "featureId": "pemeliharaan-heading",
      "nodeId": "PM_START",
      "id": "PM_START",
      "code": "START",
      "nodeType": "start",
      "type": "start",
      "label": "Buka Rekam Pemeliharaan",
      "title": "Buka Rekam Pemeliharaan",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-MNT-001: Berbasis Grup Heading dan Heading Kerja."
      ],
      "isArchived": false
    },
    {
      "moduleId": "10-rekam-pemeliharaan",
      "featureId": "pemeliharaan-heading",
      "nodeId": "PM_01",
      "id": "PM_01",
      "code": "P-001",
      "nodeType": "process",
      "type": "process",
      "label": "Pilih Grup & Heading Kerja",
      "title": "Pilih Grup & Heading Kerja",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-MNT-001: UOM mengikuti Heading Kerja."
      ],
      "isArchived": false
    },
    {
      "moduleId": "10-rekam-pemeliharaan",
      "featureId": "pemeliharaan-heading",
      "nodeId": "PM_02",
      "id": "PM_02",
      "code": "P-002",
      "nodeType": "process",
      "type": "process",
      "label": "Pilih Objek & Scan QR",
      "title": "Pilih Objek & Scan QR",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-002: QR Code objek wajib divalidasi."
      ],
      "isArchived": false
    },
    {
      "moduleId": "10-rekam-pemeliharaan",
      "featureId": "pemeliharaan-heading",
      "nodeId": "PM_03",
      "id": "PM_03",
      "code": "P-003",
      "nodeType": "process",
      "type": "process",
      "label": "Input Pekerja & Jumlah Output",
      "title": "Input Pekerja & Jumlah Output",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-PRS-006: Hanya pekerja hadir yang dapat dialokasikan."
      ],
      "isArchived": false
    },
    {
      "moduleId": "10-rekam-pemeliharaan",
      "featureId": "pemeliharaan-heading",
      "nodeId": "PM_04",
      "id": "PM_04",
      "code": "P-004",
      "nodeType": "process",
      "type": "process",
      "label": "Foto Dokumentasi + Timestamp",
      "title": "Foto Dokumentasi + Timestamp",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-GLB-001: Foto + Timestamp wajib."
      ],
      "isArchived": false
    },
    {
      "moduleId": "10-rekam-pemeliharaan",
      "featureId": "pemeliharaan-heading",
      "nodeId": "PM_05",
      "id": "PM_05",
      "code": "P-005",
      "nodeType": "process",
      "type": "process",
      "label": "Cek & Lekatkan Material Gudang",
      "title": "Cek & Lekatkan Material Gudang",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-MAT-001: Matching Heading Dokumen Gudang."
      ],
      "isArchived": false
    },
    {
      "moduleId": "10-rekam-pemeliharaan",
      "featureId": "pemeliharaan-heading",
      "nodeId": "PM_06",
      "id": "PM_06",
      "code": "P-006",
      "nodeType": "process",
      "type": "process",
      "label": "Submit & Verifikasi Asisten",
      "title": "Submit & Verifikasi Asisten",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-GLB-002: Verifikasi Asisten Bibitan wajib."
      ],
      "isArchived": false
    },
    {
      "moduleId": "10-rekam-pemeliharaan",
      "featureId": "pemeliharaan-heading",
      "nodeId": "PM_END",
      "id": "PM_END",
      "code": "END",
      "nodeType": "end",
      "type": "end",
      "label": "Pemeliharaan Selesai",
      "title": "Pemeliharaan Selesai",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-MNT-001: Sukses."
      ],
      "isArchived": false
    },
    {
      "moduleId": "11-pengeluaran",
      "featureId": "pengeluaran-bibit",
      "nodeId": "EXB_START",
      "id": "EXB_START",
      "code": "START",
      "nodeType": "start",
      "type": "start",
      "label": "Buka Pengeluaran Bibit",
      "title": "Buka Pengeluaran Bibit",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-EXP-001: Pengeluaran berbasis permintaan yang telah disetujui."
      ],
      "isArchived": false
    },
    {
      "moduleId": "11-pengeluaran",
      "featureId": "pengeluaran-bibit",
      "nodeId": "EXB_01",
      "id": "EXB_01",
      "code": "P-001",
      "nodeType": "process",
      "type": "process",
      "label": "Pilih Dokumen Permintaan",
      "title": "Pilih Dokumen Permintaan",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-EXP-001: Kuantitas muat tidak boleh melebihi SPB."
      ],
      "isArchived": false
    },
    {
      "moduleId": "11-pengeluaran",
      "featureId": "pengeluaran-bibit",
      "nodeId": "EXB_02",
      "id": "EXB_02",
      "code": "P-002",
      "nodeType": "process",
      "type": "process",
      "label": "Scan QR Batch Bibit",
      "title": "Scan QR Batch Bibit",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-OKL-002: Batch wajib divalidasi QR Code."
      ],
      "isArchived": false
    },
    {
      "moduleId": "11-pengeluaran",
      "featureId": "pengeluaran-bibit",
      "nodeId": "EXB_03",
      "id": "EXB_03",
      "code": "P-003",
      "nodeType": "process",
      "type": "process",
      "label": "Input Kuantitas Aktual Dimuat",
      "title": "Input Kuantitas Aktual Dimuat",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-EXP-001: Aktual menjadi dasar pemotongan populasi batch."
      ],
      "isArchived": false
    },
    {
      "moduleId": "11-pengeluaran",
      "featureId": "pengeluaran-bibit",
      "nodeId": "EXB_04",
      "id": "EXB_04",
      "code": "P-004",
      "nodeType": "process",
      "type": "process",
      "label": "Foto Muatan Armada + Timestamp",
      "title": "Foto Muatan Armada + Timestamp",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-GLB-001: Foto + Timestamp wajib."
      ],
      "isArchived": false
    },
    {
      "moduleId": "11-pengeluaran",
      "featureId": "pengeluaran-bibit",
      "nodeId": "EXB_05",
      "id": "EXB_05",
      "code": "P-005",
      "nodeType": "process",
      "type": "process",
      "label": "Verifikasi Asisten & Kurangi Populasi",
      "title": "Verifikasi Asisten & Kurangi Populasi",
      "description": null,
      "role": "Asisten Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-EXP-001: Verifikasi Asisten memotong populasi Batch secara sah."
      ],
      "isArchived": false
    },
    {
      "moduleId": "11-pengeluaran",
      "featureId": "pengeluaran-bibit",
      "nodeId": "EXB_END",
      "id": "EXB_END",
      "code": "END",
      "nodeType": "end",
      "type": "end",
      "label": "Bibit Diberangkatkan ke Kebun",
      "title": "Bibit Diberangkatkan ke Kebun",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-RCV-004: Menutup alur penyaluran bibit kebun."
      ],
      "isArchived": false
    },
    {
      "moduleId": "11-pengeluaran",
      "featureId": "pengeluaran-mata-entres",
      "nodeId": "EXM_START",
      "id": "EXM_START",
      "code": "START",
      "nodeType": "start",
      "type": "start",
      "label": "Buka Pengeluaran Mata Entres",
      "title": "Buka Pengeluaran Mata Entres",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-EXM-001: Clone sudah melekat pada dokumen permintaan."
      ],
      "isArchived": false
    },
    {
      "moduleId": "11-pengeluaran",
      "featureId": "pengeluaran-mata-entres",
      "nodeId": "EXM_01",
      "id": "EXM_01",
      "code": "P-001",
      "nodeType": "process",
      "type": "process",
      "label": "Scan QR Plot Entres",
      "title": "Scan QR Plot Entres",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-EXM-001: Tidak menggunakan Batch; objek = Plot Entres + Clone."
      ],
      "isArchived": false
    },
    {
      "moduleId": "11-pengeluaran",
      "featureId": "pengeluaran-mata-entres",
      "nodeId": "EXM_02",
      "id": "EXM_02",
      "code": "P-002",
      "nodeType": "process",
      "type": "process",
      "label": "Input Cabang & Catat Mata Aktual",
      "title": "Input Cabang & Catat Mata Aktual",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-EXM-002: Mata entres aktual memotong stok setelah verifikasi."
      ],
      "isArchived": false
    },
    {
      "moduleId": "11-pengeluaran",
      "featureId": "pengeluaran-mata-entres",
      "nodeId": "EXM_03",
      "id": "EXM_03",
      "code": "P-003",
      "nodeType": "process",
      "type": "process",
      "label": "Foto + Timestamp & Verifikasi",
      "title": "Foto + Timestamp & Verifikasi",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-EXM-002: Stok mata entres berkurang setelah verifikasi."
      ],
      "isArchived": false
    },
    {
      "moduleId": "11-pengeluaran",
      "featureId": "pengeluaran-mata-entres",
      "nodeId": "EXM_END",
      "id": "EXM_END",
      "code": "END",
      "nodeType": "end",
      "type": "end",
      "label": "Mata Entres Terkirim",
      "title": "Mata Entres Terkirim",
      "description": null,
      "role": "Mantri Bibitan",
      "linkedReqIds": [],
      "ruleIds": [
        "BR-EXM-002: Selesai."
      ],
      "isArchived": false
    }
  ],
  "flowEdges": [],
  "businessRules": [
    {
      "id": "BR-GLB-001",
      "title": "Mandatory Foto Dokumentasi + Timestamp",
      "desc": "Setiap transaksi operasional Mantri Bibitan wajib menyertakan foto fisik dokumentasi dengan watermark timestamp ISO dan geolokasi GPS yang valid.",
      "module": null,
      "category": null
    },
    {
      "id": "BR-GLB-002",
      "title": "Kewajiban Verifikasi Asisten Bibitan",
      "desc": "Semua transaksi yang diinput oleh Mantri Bibitan berstatus Menunggu Verifikasi dan belum memengaruhi saldo produksi sampai disetujui oleh Asisten Bibitan.",
      "module": null,
      "category": null
    },
    {
      "id": "BR-GLB-003",
      "title": "Promosi ke Server Production",
      "desc": "Hanya transaksi yang telah diverifikasi dan disetujui oleh Asisten Bibitan yang akan dikirim ke basis data Server Production.",
      "module": null,
      "category": null
    },
    {
      "id": "BR-PRS-001",
      "title": "Presensi Datang Sebagai Syarat Transaksi",
      "desc": "Presensi Datang supervisor wajib diselesaikan terlebih dahulu di pagi hari sebelum sistem mengizinkan transaksi operasional harian lainnya.",
      "module": null,
      "category": null
    },
    {
      "id": "BR-PRS-003",
      "title": "Prioritas Biometrik Face ID",
      "desc": "Face ID adalah metode biometrik utama untuk presensi supervisor. Foto manual hanya diizinkan sebagai fallback jika verifikasi Face ID mengalami kegagalan teknis.",
      "module": null,
      "category": null
    },
    {
      "id": "BR-OKL-001",
      "title": "Presensi Sebelum Okulasi",
      "desc": "Transaksi okulasi hanya dapat dibuka jika Mantri telah menyelesaikan presensi harian dan pekerja yang dialokasikan terdaftar hadir.",
      "module": null,
      "category": null
    },
    {
      "id": "BR-OKL-002",
      "title": "Validasi QR Code Objek Fisik",
      "desc": "Batch bibit wajib divalidasi menggunakan QR Code sebelum penginputan hasil kerja okulasi dilakukan. Pemilihan manual hanya jalur fallback.",
      "module": null,
      "category": null
    },
    {
      "id": "BR-OKL-005",
      "title": "Identitas Stok Mata Entres",
      "desc": "Stok mata entres dikelola berdasarkan kombinasi Plot Entres + Clone, bukan berdasarkan Batch.",
      "module": null,
      "category": null
    },
    {
      "id": "BR-OKL-006",
      "title": "Status Estimasi vs Stok Aktual",
      "desc": "Kalkulasi Jumlah Cabang x Rata-rata Mata Entres adalah estimasi referensi semata. Hanya mata entres aktual yang diverifikasi yang menjadi pengurang saldo stok.",
      "module": null,
      "category": null
    },
    {
      "id": "BR-OKL-007",
      "title": "Pengurangan Stok Pasca Verifikasi",
      "desc": "Pengurangan saldo stok mata entres terjadi secara otomatis hanya setelah berkas transaksi okulasi disetujui (diverifikasi) oleh Asisten Bibitan.",
      "module": null,
      "category": null
    },
    {
      "id": "BR-OKL-008",
      "title": "Regrafting Berulang Tanpa Batas Tunggal",
      "desc": "Proses regrafting pada bibit gagal tidak dibatasi hanya satu kali. Bibit yang gagal pada pemeriksaan regrafting dapat diregrafting kembali atau diputuskan reject oleh Mantri.",
      "module": null,
      "category": null
    },
    {
      "id": "BR-SEM-001",
      "title": "Alokasi Multi-Bedengan per Dokumen",
      "desc": "Satu dokumen penerimaan benih dapat dialokasikan ke beberapa bedengan perkecambahan (contoh: 10.000 benih dibagi ke Bedengan 001, 002, dan 003).",
      "module": null,
      "category": null
    },
    {
      "id": "BR-SEM-006",
      "title": "Standar 1 Polybag = 2 Benih/Bibit",
      "desc": "Kecambah yang ditransplanting dari bedengan ke kantong polybag wajib ditanami 2 kecambah per polybag untuk seleksi vigor selanjutnya.",
      "module": null,
      "category": null
    },
    {
      "id": "BR-SEM-007",
      "title": "Konsolidasi Multi-Bedengan ke 1 Batch",
      "desc": "Satu Batch bibit siap okulasi dapat dibentuk dari gabungan beberapa bedengan semaian dengan clone yang sama.",
      "module": null,
      "category": null
    },
    {
      "id": "BR-SEL-001",
      "title": "Verifikasi Fisik Sebelum Pengurangan Populasi Batch",
      "desc": "Deklarasi bibit reject/mati pada modul penyeleksian oleh Mantri tidak langsung mengurangi populasi Batch sampai Asisten Bibitan melakukan pemeriksaan fisik langsung dan menyetujuinya.",
      "module": null,
      "category": null
    },
    {
      "id": "BR-MAT-001",
      "title": "Integritas 1 Dokumen Gudang = 1 Heading Kerja",
      "desc": "Satu dokumen pengeluaran gudang hanya dapat dilekatkan pada satu aktivitas pemeliharaan dengan heading kerja yang sama (matching).",
      "module": null,
      "category": null
    }
  ],
  "traceability": [
    {
      "module": {
        "id": "01-presensi",
        "order": "01",
        "name": "Presensi",
        "roleId": "mantri-bibitan",
        "subtitle": "Presensi Harian Supervisor & Pekerja",
        "desc": "Pencatatan kehadiran harian Supervisor melalui Face ID (dengan fallback foto manual) dan verifikasi daftar kehadiran pekerja bibitan sebelum transaksi harian dimulai.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan",
        "features": [
          {
            "id": "presensi-supervisor",
            "name": "Presensi Supervisor"
          },
          {
            "id": "presensi-pekerja",
            "name": "Presensi Pekerja Bibitan"
          }
        ]
      },
      "feature": {
        "id": "presensi-supervisor",
        "name": "Presensi Supervisor"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-PRS-001",
          "title": "Presensi Datang Sebagai Syarat Transaksi"
        }
      ]
    },
    {
      "module": {
        "id": "01-presensi",
        "order": "01",
        "name": "Presensi",
        "roleId": "mantri-bibitan",
        "subtitle": "Presensi Harian Supervisor & Pekerja",
        "desc": "Pencatatan kehadiran harian Supervisor melalui Face ID (dengan fallback foto manual) dan verifikasi daftar kehadiran pekerja bibitan sebelum transaksi harian dimulai.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan",
        "features": [
          {
            "id": "presensi-supervisor",
            "name": "Presensi Supervisor"
          },
          {
            "id": "presensi-pekerja",
            "name": "Presensi Pekerja Bibitan"
          }
        ]
      },
      "feature": {
        "id": "presensi-supervisor",
        "name": "Presensi Supervisor"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-PRS-001",
          "title": "Presensi Datang Sebagai Syarat Transaksi"
        }
      ]
    },
    {
      "module": {
        "id": "01-presensi",
        "order": "01",
        "name": "Presensi",
        "roleId": "mantri-bibitan",
        "subtitle": "Presensi Harian Supervisor & Pekerja",
        "desc": "Pencatatan kehadiran harian Supervisor melalui Face ID (dengan fallback foto manual) dan verifikasi daftar kehadiran pekerja bibitan sebelum transaksi harian dimulai.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan",
        "features": [
          {
            "id": "presensi-supervisor",
            "name": "Presensi Supervisor"
          },
          {
            "id": "presensi-pekerja",
            "name": "Presensi Pekerja Bibitan"
          }
        ]
      },
      "feature": {
        "id": "presensi-supervisor",
        "name": "Presensi Supervisor"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-PRS-003",
          "title": "Prioritas Biometrik Face ID"
        }
      ]
    },
    {
      "module": {
        "id": "01-presensi",
        "order": "01",
        "name": "Presensi",
        "roleId": "mantri-bibitan",
        "subtitle": "Presensi Harian Supervisor & Pekerja",
        "desc": "Pencatatan kehadiran harian Supervisor melalui Face ID (dengan fallback foto manual) dan verifikasi daftar kehadiran pekerja bibitan sebelum transaksi harian dimulai.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan",
        "features": [
          {
            "id": "presensi-supervisor",
            "name": "Presensi Supervisor"
          },
          {
            "id": "presensi-pekerja",
            "name": "Presensi Pekerja Bibitan"
          }
        ]
      },
      "feature": {
        "id": "presensi-supervisor",
        "name": "Presensi Supervisor"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-PRS-003",
          "title": "Prioritas Biometrik Face ID"
        }
      ]
    },
    {
      "module": {
        "id": "01-presensi",
        "order": "01",
        "name": "Presensi",
        "roleId": "mantri-bibitan",
        "subtitle": "Presensi Harian Supervisor & Pekerja",
        "desc": "Pencatatan kehadiran harian Supervisor melalui Face ID (dengan fallback foto manual) dan verifikasi daftar kehadiran pekerja bibitan sebelum transaksi harian dimulai.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan",
        "features": [
          {
            "id": "presensi-supervisor",
            "name": "Presensi Supervisor"
          },
          {
            "id": "presensi-pekerja",
            "name": "Presensi Pekerja Bibitan"
          }
        ]
      },
      "feature": {
        "id": "presensi-supervisor",
        "name": "Presensi Supervisor"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "01-presensi",
        "order": "01",
        "name": "Presensi",
        "roleId": "mantri-bibitan",
        "subtitle": "Presensi Harian Supervisor & Pekerja",
        "desc": "Pencatatan kehadiran harian Supervisor melalui Face ID (dengan fallback foto manual) dan verifikasi daftar kehadiran pekerja bibitan sebelum transaksi harian dimulai.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan",
        "features": [
          {
            "id": "presensi-supervisor",
            "name": "Presensi Supervisor"
          },
          {
            "id": "presensi-pekerja",
            "name": "Presensi Pekerja Bibitan"
          }
        ]
      },
      "feature": {
        "id": "presensi-supervisor",
        "name": "Presensi Supervisor"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-PRS-001",
          "title": "Presensi Datang Sebagai Syarat Transaksi"
        }
      ]
    },
    {
      "module": {
        "id": "01-presensi",
        "order": "01",
        "name": "Presensi",
        "roleId": "mantri-bibitan",
        "subtitle": "Presensi Harian Supervisor & Pekerja",
        "desc": "Pencatatan kehadiran harian Supervisor melalui Face ID (dengan fallback foto manual) dan verifikasi daftar kehadiran pekerja bibitan sebelum transaksi harian dimulai.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan",
        "features": [
          {
            "id": "presensi-supervisor",
            "name": "Presensi Supervisor"
          },
          {
            "id": "presensi-pekerja",
            "name": "Presensi Pekerja Bibitan"
          }
        ]
      },
      "feature": {
        "id": "presensi-supervisor",
        "name": "Presensi Supervisor"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-PRS-001",
          "title": "Presensi Datang Sebagai Syarat Transaksi"
        }
      ]
    },
    {
      "module": {
        "id": "01-presensi",
        "order": "01",
        "name": "Presensi",
        "roleId": "mantri-bibitan",
        "subtitle": "Presensi Harian Supervisor & Pekerja",
        "desc": "Pencatatan kehadiran harian Supervisor melalui Face ID (dengan fallback foto manual) dan verifikasi daftar kehadiran pekerja bibitan sebelum transaksi harian dimulai.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan",
        "features": [
          {
            "id": "presensi-supervisor",
            "name": "Presensi Supervisor"
          },
          {
            "id": "presensi-pekerja",
            "name": "Presensi Pekerja Bibitan"
          }
        ]
      },
      "feature": {
        "id": "presensi-pekerja",
        "name": "Presensi Pekerja Bibitan"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "01-presensi",
        "order": "01",
        "name": "Presensi",
        "roleId": "mantri-bibitan",
        "subtitle": "Presensi Harian Supervisor & Pekerja",
        "desc": "Pencatatan kehadiran harian Supervisor melalui Face ID (dengan fallback foto manual) dan verifikasi daftar kehadiran pekerja bibitan sebelum transaksi harian dimulai.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan",
        "features": [
          {
            "id": "presensi-supervisor",
            "name": "Presensi Supervisor"
          },
          {
            "id": "presensi-pekerja",
            "name": "Presensi Pekerja Bibitan"
          }
        ]
      },
      "feature": {
        "id": "presensi-pekerja",
        "name": "Presensi Pekerja Bibitan"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "01-presensi",
        "order": "01",
        "name": "Presensi",
        "roleId": "mantri-bibitan",
        "subtitle": "Presensi Harian Supervisor & Pekerja",
        "desc": "Pencatatan kehadiran harian Supervisor melalui Face ID (dengan fallback foto manual) dan verifikasi daftar kehadiran pekerja bibitan sebelum transaksi harian dimulai.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan",
        "features": [
          {
            "id": "presensi-supervisor",
            "name": "Presensi Supervisor"
          },
          {
            "id": "presensi-pekerja",
            "name": "Presensi Pekerja Bibitan"
          }
        ]
      },
      "feature": {
        "id": "presensi-pekerja",
        "name": "Presensi Pekerja Bibitan"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "01-presensi",
        "order": "01",
        "name": "Presensi",
        "roleId": "mantri-bibitan",
        "subtitle": "Presensi Harian Supervisor & Pekerja",
        "desc": "Pencatatan kehadiran harian Supervisor melalui Face ID (dengan fallback foto manual) dan verifikasi daftar kehadiran pekerja bibitan sebelum transaksi harian dimulai.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan",
        "features": [
          {
            "id": "presensi-supervisor",
            "name": "Presensi Supervisor"
          },
          {
            "id": "presensi-pekerja",
            "name": "Presensi Pekerja Bibitan"
          }
        ]
      },
      "feature": {
        "id": "presensi-pekerja",
        "name": "Presensi Pekerja Bibitan"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-GLB-002",
          "title": "Kewajiban Verifikasi Asisten Bibitan"
        }
      ]
    },
    {
      "module": {
        "id": "01-presensi",
        "order": "01",
        "name": "Presensi",
        "roleId": "mantri-bibitan",
        "subtitle": "Presensi Harian Supervisor & Pekerja",
        "desc": "Pencatatan kehadiran harian Supervisor melalui Face ID (dengan fallback foto manual) dan verifikasi daftar kehadiran pekerja bibitan sebelum transaksi harian dimulai.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan",
        "features": [
          {
            "id": "presensi-supervisor",
            "name": "Presensi Supervisor"
          },
          {
            "id": "presensi-pekerja",
            "name": "Presensi Pekerja Bibitan"
          }
        ]
      },
      "feature": {
        "id": "presensi-pekerja",
        "name": "Presensi Pekerja Bibitan"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-benih",
        "name": "Penerimaan Benih / Biji Kelatak"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-benih",
        "name": "Penerimaan Benih / Biji Kelatak"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-benih",
        "name": "Penerimaan Benih / Biji Kelatak"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-benih",
        "name": "Penerimaan Benih / Biji Kelatak"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-GLB-001",
          "title": "Mandatory Foto Dokumentasi + Timestamp"
        }
      ]
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-benih",
        "name": "Penerimaan Benih / Biji Kelatak"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-GLB-003",
          "title": "Promosi ke Server Production"
        }
      ]
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-benih",
        "name": "Penerimaan Benih / Biji Kelatak"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-SEM-001",
          "title": "Alokasi Multi-Bedengan per Dokumen"
        }
      ]
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-kebun-sendiri",
        "name": "Penerimaan Bibit - Kebun Sendiri"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-kebun-sendiri",
        "name": "Penerimaan Bibit - Kebun Sendiri"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-kebun-sendiri",
        "name": "Penerimaan Bibit - Kebun Sendiri"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-kebun-sendiri",
        "name": "Penerimaan Bibit - Kebun Sendiri"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-kebun-sendiri",
        "name": "Penerimaan Bibit - Kebun Sendiri"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-kebun-sendiri",
        "name": "Penerimaan Bibit - Kebun Sendiri"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "03-penyemaian",
        "order": "03",
        "name": "Penyemaian",
        "roleId": "mantri-bibitan",
        "subtitle": "Penyemaian Bedengan & Transplanting Polybag",
        "desc": "Proses penaburan benih ke Bedengan berdasarkan dokumen penerimaan benih, pemeliharaan ±12–15 hari, hingga transplanting 2 benih/bibit per polybag dan konsolidasi Batch.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "semai-bedengan",
            "name": "Penyemaian ke Bedengan"
          },
          {
            "id": "transplanting-polybag",
            "name": "Transplanting ke Polybag (Batch)"
          }
        ]
      },
      "feature": {
        "id": "semai-bedengan",
        "name": "Penyemaian ke Bedengan"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-SEM-001",
          "title": "Alokasi Multi-Bedengan per Dokumen"
        }
      ]
    },
    {
      "module": {
        "id": "03-penyemaian",
        "order": "03",
        "name": "Penyemaian",
        "roleId": "mantri-bibitan",
        "subtitle": "Penyemaian Bedengan & Transplanting Polybag",
        "desc": "Proses penaburan benih ke Bedengan berdasarkan dokumen penerimaan benih, pemeliharaan ±12–15 hari, hingga transplanting 2 benih/bibit per polybag dan konsolidasi Batch.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "semai-bedengan",
            "name": "Penyemaian ke Bedengan"
          },
          {
            "id": "transplanting-polybag",
            "name": "Transplanting ke Polybag (Batch)"
          }
        ]
      },
      "feature": {
        "id": "semai-bedengan",
        "name": "Penyemaian ke Bedengan"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "03-penyemaian",
        "order": "03",
        "name": "Penyemaian",
        "roleId": "mantri-bibitan",
        "subtitle": "Penyemaian Bedengan & Transplanting Polybag",
        "desc": "Proses penaburan benih ke Bedengan berdasarkan dokumen penerimaan benih, pemeliharaan ±12–15 hari, hingga transplanting 2 benih/bibit per polybag dan konsolidasi Batch.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "semai-bedengan",
            "name": "Penyemaian ke Bedengan"
          },
          {
            "id": "transplanting-polybag",
            "name": "Transplanting ke Polybag (Batch)"
          }
        ]
      },
      "feature": {
        "id": "semai-bedengan",
        "name": "Penyemaian ke Bedengan"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "03-penyemaian",
        "order": "03",
        "name": "Penyemaian",
        "roleId": "mantri-bibitan",
        "subtitle": "Penyemaian Bedengan & Transplanting Polybag",
        "desc": "Proses penaburan benih ke Bedengan berdasarkan dokumen penerimaan benih, pemeliharaan ±12–15 hari, hingga transplanting 2 benih/bibit per polybag dan konsolidasi Batch.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "semai-bedengan",
            "name": "Penyemaian ke Bedengan"
          },
          {
            "id": "transplanting-polybag",
            "name": "Transplanting ke Polybag (Batch)"
          }
        ]
      },
      "feature": {
        "id": "semai-bedengan",
        "name": "Penyemaian ke Bedengan"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-GLB-001",
          "title": "Mandatory Foto Dokumentasi + Timestamp"
        }
      ]
    },
    {
      "module": {
        "id": "03-penyemaian",
        "order": "03",
        "name": "Penyemaian",
        "roleId": "mantri-bibitan",
        "subtitle": "Penyemaian Bedengan & Transplanting Polybag",
        "desc": "Proses penaburan benih ke Bedengan berdasarkan dokumen penerimaan benih, pemeliharaan ±12–15 hari, hingga transplanting 2 benih/bibit per polybag dan konsolidasi Batch.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "semai-bedengan",
            "name": "Penyemaian ke Bedengan"
          },
          {
            "id": "transplanting-polybag",
            "name": "Transplanting ke Polybag (Batch)"
          }
        ]
      },
      "feature": {
        "id": "semai-bedengan",
        "name": "Penyemaian ke Bedengan"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "03-penyemaian",
        "order": "03",
        "name": "Penyemaian",
        "roleId": "mantri-bibitan",
        "subtitle": "Penyemaian Bedengan & Transplanting Polybag",
        "desc": "Proses penaburan benih ke Bedengan berdasarkan dokumen penerimaan benih, pemeliharaan ±12–15 hari, hingga transplanting 2 benih/bibit per polybag dan konsolidasi Batch.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "semai-bedengan",
            "name": "Penyemaian ke Bedengan"
          },
          {
            "id": "transplanting-polybag",
            "name": "Transplanting ke Polybag (Batch)"
          }
        ]
      },
      "feature": {
        "id": "semai-bedengan",
        "name": "Penyemaian ke Bedengan"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-SEM-006",
          "title": "Standar 1 Polybag = 2 Benih/Bibit"
        }
      ]
    },
    {
      "module": {
        "id": "03-penyemaian",
        "order": "03",
        "name": "Penyemaian",
        "roleId": "mantri-bibitan",
        "subtitle": "Penyemaian Bedengan & Transplanting Polybag",
        "desc": "Proses penaburan benih ke Bedengan berdasarkan dokumen penerimaan benih, pemeliharaan ±12–15 hari, hingga transplanting 2 benih/bibit per polybag dan konsolidasi Batch.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "semai-bedengan",
            "name": "Penyemaian ke Bedengan"
          },
          {
            "id": "transplanting-polybag",
            "name": "Transplanting ke Polybag (Batch)"
          }
        ]
      },
      "feature": {
        "id": "semai-bedengan",
        "name": "Penyemaian ke Bedengan"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-SEM-007",
          "title": "Konsolidasi Multi-Bedengan ke 1 Batch"
        }
      ]
    },
    {
      "module": {
        "id": "03-penyemaian",
        "order": "03",
        "name": "Penyemaian",
        "roleId": "mantri-bibitan",
        "subtitle": "Penyemaian Bedengan & Transplanting Polybag",
        "desc": "Proses penaburan benih ke Bedengan berdasarkan dokumen penerimaan benih, pemeliharaan ±12–15 hari, hingga transplanting 2 benih/bibit per polybag dan konsolidasi Batch.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "semai-bedengan",
            "name": "Penyemaian ke Bedengan"
          },
          {
            "id": "transplanting-polybag",
            "name": "Transplanting ke Polybag (Batch)"
          }
        ]
      },
      "feature": {
        "id": "semai-bedengan",
        "name": "Penyemaian ke Bedengan"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-SEM-007",
          "title": "Konsolidasi Multi-Bedengan ke 1 Batch"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "grafting",
        "name": "Grafting (Okulasi Utama)"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-001",
          "title": "Presensi Sebelum Okulasi"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "grafting",
        "name": "Grafting (Okulasi Utama)"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-002",
          "title": "Validasi QR Code Objek Fisik"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "grafting",
        "name": "Grafting (Okulasi Utama)"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-002",
          "title": "Validasi QR Code Objek Fisik"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "grafting",
        "name": "Grafting (Okulasi Utama)"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-002",
          "title": "Validasi QR Code Objek Fisik"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "grafting",
        "name": "Grafting (Okulasi Utama)"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "grafting",
        "name": "Grafting (Okulasi Utama)"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "grafting",
        "name": "Grafting (Okulasi Utama)"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-005",
          "title": "Identitas Stok Mata Entres"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "grafting",
        "name": "Grafting (Okulasi Utama)"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-005",
          "title": "Identitas Stok Mata Entres"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "grafting",
        "name": "Grafting (Okulasi Utama)"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-006",
          "title": "Status Estimasi vs Stok Aktual"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "grafting",
        "name": "Grafting (Okulasi Utama)"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-006",
          "title": "Status Estimasi vs Stok Aktual"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "grafting",
        "name": "Grafting (Okulasi Utama)"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-007",
          "title": "Pengurangan Stok Pasca Verifikasi"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "grafting",
        "name": "Grafting (Okulasi Utama)"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-GLB-001",
          "title": "Mandatory Foto Dokumentasi + Timestamp"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "grafting",
        "name": "Grafting (Okulasi Utama)"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-GLB-002",
          "title": "Kewajiban Verifikasi Asisten Bibitan"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "grafting",
        "name": "Grafting (Okulasi Utama)"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-GLB-003",
          "title": "Promosi ke Server Production"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "grafting",
        "name": "Grafting (Okulasi Utama)"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-007",
          "title": "Pengurangan Stok Pasca Verifikasi"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "grafting",
        "name": "Grafting (Okulasi Utama)"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-GLB-003",
          "title": "Promosi ke Server Production"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "regrafting",
        "name": "Okulasi Janda / Regrafting"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-008",
          "title": "Regrafting Berulang Tanpa Batas Tunggal"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "regrafting",
        "name": "Okulasi Janda / Regrafting"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-008",
          "title": "Regrafting Berulang Tanpa Batas Tunggal"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "regrafting",
        "name": "Okulasi Janda / Regrafting"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-002",
          "title": "Validasi QR Code Objek Fisik"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "regrafting",
        "name": "Okulasi Janda / Regrafting"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-008",
          "title": "Regrafting Berulang Tanpa Batas Tunggal"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "regrafting",
        "name": "Okulasi Janda / Regrafting"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "regrafting",
        "name": "Okulasi Janda / Regrafting"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-005",
          "title": "Identitas Stok Mata Entres"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "regrafting",
        "name": "Okulasi Janda / Regrafting"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-007",
          "title": "Pengurangan Stok Pasca Verifikasi"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "regrafting",
        "name": "Okulasi Janda / Regrafting"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-GLB-001",
          "title": "Mandatory Foto Dokumentasi + Timestamp"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "regrafting",
        "name": "Okulasi Janda / Regrafting"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-GLB-002",
          "title": "Kewajiban Verifikasi Asisten Bibitan"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "regrafting",
        "name": "Okulasi Janda / Regrafting"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-GLB-003",
          "title": "Promosi ke Server Production"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "regrafting",
        "name": "Okulasi Janda / Regrafting"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-007",
          "title": "Pengurangan Stok Pasca Verifikasi"
        }
      ]
    },
    {
      "module": {
        "id": "04-okulasi",
        "order": "04",
        "name": "Okulasi",
        "roleId": "mantri-bibitan",
        "subtitle": "Grafting & Regrafting",
        "desc": "Proses perbanyakan tanaman karet dengan metode okulasi, mencakup grafting dan regrafting, termasuk penggunaan mata entres, pencatatan hasil, dan verifikasi oleh Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "grafting",
            "name": "Grafting (Okulasi Utama)"
          },
          {
            "id": "regrafting",
            "name": "Okulasi Janda / Regrafting"
          }
        ]
      },
      "feature": {
        "id": "regrafting",
        "name": "Okulasi Janda / Regrafting"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-008",
          "title": "Regrafting Berulang Tanpa Batas Tunggal"
        }
      ]
    },
    {
      "module": {
        "id": "05-pemeriksaan",
        "order": "05",
        "name": "Pemeriksaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeriksaan Hasil Okulasi (Grafting & Regrafting)",
        "desc": "Pemeriksaan berkala hasil okulasi secara dinamis dan bertahap. Bibit yang gagal dapat ditentukan untuk Regrafting berulang kali atau dinyatakan Reject oleh Mantri Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "periksa-grafting",
            "name": "Pemeriksaan Bertahap Grafting"
          },
          {
            "id": "periksa-regrafting",
            "name": "Pemeriksaan Regrafting"
          }
        ]
      },
      "feature": {
        "id": "periksa-grafting",
        "name": "Pemeriksaan Bertahap Grafting"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-008",
          "title": "Regrafting Berulang Tanpa Batas Tunggal"
        }
      ]
    },
    {
      "module": {
        "id": "05-pemeriksaan",
        "order": "05",
        "name": "Pemeriksaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeriksaan Hasil Okulasi (Grafting & Regrafting)",
        "desc": "Pemeriksaan berkala hasil okulasi secara dinamis dan bertahap. Bibit yang gagal dapat ditentukan untuk Regrafting berulang kali atau dinyatakan Reject oleh Mantri Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "periksa-grafting",
            "name": "Pemeriksaan Bertahap Grafting"
          },
          {
            "id": "periksa-regrafting",
            "name": "Pemeriksaan Regrafting"
          }
        ]
      },
      "feature": {
        "id": "periksa-grafting",
        "name": "Pemeriksaan Bertahap Grafting"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-008",
          "title": "Regrafting Berulang Tanpa Batas Tunggal"
        }
      ]
    },
    {
      "module": {
        "id": "05-pemeriksaan",
        "order": "05",
        "name": "Pemeriksaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeriksaan Hasil Okulasi (Grafting & Regrafting)",
        "desc": "Pemeriksaan berkala hasil okulasi secara dinamis dan bertahap. Bibit yang gagal dapat ditentukan untuk Regrafting berulang kali atau dinyatakan Reject oleh Mantri Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "periksa-grafting",
            "name": "Pemeriksaan Bertahap Grafting"
          },
          {
            "id": "periksa-regrafting",
            "name": "Pemeriksaan Regrafting"
          }
        ]
      },
      "feature": {
        "id": "periksa-grafting",
        "name": "Pemeriksaan Bertahap Grafting"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-002",
          "title": "Validasi QR Code Objek Fisik"
        }
      ]
    },
    {
      "module": {
        "id": "05-pemeriksaan",
        "order": "05",
        "name": "Pemeriksaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeriksaan Hasil Okulasi (Grafting & Regrafting)",
        "desc": "Pemeriksaan berkala hasil okulasi secara dinamis dan bertahap. Bibit yang gagal dapat ditentukan untuk Regrafting berulang kali atau dinyatakan Reject oleh Mantri Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "periksa-grafting",
            "name": "Pemeriksaan Bertahap Grafting"
          },
          {
            "id": "periksa-regrafting",
            "name": "Pemeriksaan Regrafting"
          }
        ]
      },
      "feature": {
        "id": "periksa-grafting",
        "name": "Pemeriksaan Bertahap Grafting"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-008",
          "title": "Regrafting Berulang Tanpa Batas Tunggal"
        }
      ]
    },
    {
      "module": {
        "id": "05-pemeriksaan",
        "order": "05",
        "name": "Pemeriksaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeriksaan Hasil Okulasi (Grafting & Regrafting)",
        "desc": "Pemeriksaan berkala hasil okulasi secara dinamis dan bertahap. Bibit yang gagal dapat ditentukan untuk Regrafting berulang kali atau dinyatakan Reject oleh Mantri Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "periksa-grafting",
            "name": "Pemeriksaan Bertahap Grafting"
          },
          {
            "id": "periksa-regrafting",
            "name": "Pemeriksaan Regrafting"
          }
        ]
      },
      "feature": {
        "id": "periksa-grafting",
        "name": "Pemeriksaan Bertahap Grafting"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-008",
          "title": "Regrafting Berulang Tanpa Batas Tunggal"
        }
      ]
    },
    {
      "module": {
        "id": "05-pemeriksaan",
        "order": "05",
        "name": "Pemeriksaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeriksaan Hasil Okulasi (Grafting & Regrafting)",
        "desc": "Pemeriksaan berkala hasil okulasi secara dinamis dan bertahap. Bibit yang gagal dapat ditentukan untuk Regrafting berulang kali atau dinyatakan Reject oleh Mantri Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "periksa-grafting",
            "name": "Pemeriksaan Bertahap Grafting"
          },
          {
            "id": "periksa-regrafting",
            "name": "Pemeriksaan Regrafting"
          }
        ]
      },
      "feature": {
        "id": "periksa-grafting",
        "name": "Pemeriksaan Bertahap Grafting"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-008",
          "title": "Regrafting Berulang Tanpa Batas Tunggal"
        }
      ]
    },
    {
      "module": {
        "id": "05-pemeriksaan",
        "order": "05",
        "name": "Pemeriksaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeriksaan Hasil Okulasi (Grafting & Regrafting)",
        "desc": "Pemeriksaan berkala hasil okulasi secara dinamis dan bertahap. Bibit yang gagal dapat ditentukan untuk Regrafting berulang kali atau dinyatakan Reject oleh Mantri Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "periksa-grafting",
            "name": "Pemeriksaan Bertahap Grafting"
          },
          {
            "id": "periksa-regrafting",
            "name": "Pemeriksaan Regrafting"
          }
        ]
      },
      "feature": {
        "id": "periksa-grafting",
        "name": "Pemeriksaan Bertahap Grafting"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-GLB-001",
          "title": "Mandatory Foto Dokumentasi + Timestamp"
        }
      ]
    },
    {
      "module": {
        "id": "05-pemeriksaan",
        "order": "05",
        "name": "Pemeriksaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeriksaan Hasil Okulasi (Grafting & Regrafting)",
        "desc": "Pemeriksaan berkala hasil okulasi secara dinamis dan bertahap. Bibit yang gagal dapat ditentukan untuk Regrafting berulang kali atau dinyatakan Reject oleh Mantri Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "periksa-grafting",
            "name": "Pemeriksaan Bertahap Grafting"
          },
          {
            "id": "periksa-regrafting",
            "name": "Pemeriksaan Regrafting"
          }
        ]
      },
      "feature": {
        "id": "periksa-grafting",
        "name": "Pemeriksaan Bertahap Grafting"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-GLB-002",
          "title": "Kewajiban Verifikasi Asisten Bibitan"
        }
      ]
    },
    {
      "module": {
        "id": "05-pemeriksaan",
        "order": "05",
        "name": "Pemeriksaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeriksaan Hasil Okulasi (Grafting & Regrafting)",
        "desc": "Pemeriksaan berkala hasil okulasi secara dinamis dan bertahap. Bibit yang gagal dapat ditentukan untuk Regrafting berulang kali atau dinyatakan Reject oleh Mantri Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "periksa-grafting",
            "name": "Pemeriksaan Bertahap Grafting"
          },
          {
            "id": "periksa-regrafting",
            "name": "Pemeriksaan Regrafting"
          }
        ]
      },
      "feature": {
        "id": "periksa-grafting",
        "name": "Pemeriksaan Bertahap Grafting"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-008",
          "title": "Regrafting Berulang Tanpa Batas Tunggal"
        }
      ]
    },
    {
      "module": {
        "id": "06-penyeleksian",
        "order": "06",
        "name": "Penyeleksian",
        "roleId": "mantri-bibitan",
        "subtitle": "Seleksi Kualitas & Verifikasi Fisik Batch",
        "desc": "Penyeleksian bibit afkir/mati secara dinamis berulang. Hasil deklarasi Mantri tidak langsung mengurangi populasi Batch sampai Asisten Bibitan melakukan verifikasi fisik.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Pemeriksaan Fisik & Verifikasi)",
        "features": [
          {
            "id": "seleksi-batch",
            "name": "Seleksi Kualitas Bibit Batch"
          }
        ]
      },
      "feature": {
        "id": "seleksi-batch",
        "name": "Seleksi Kualitas Bibit Batch"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-SEL-001",
          "title": "Verifikasi Fisik Sebelum Pengurangan Populasi Batch"
        }
      ]
    },
    {
      "module": {
        "id": "06-penyeleksian",
        "order": "06",
        "name": "Penyeleksian",
        "roleId": "mantri-bibitan",
        "subtitle": "Seleksi Kualitas & Verifikasi Fisik Batch",
        "desc": "Penyeleksian bibit afkir/mati secara dinamis berulang. Hasil deklarasi Mantri tidak langsung mengurangi populasi Batch sampai Asisten Bibitan melakukan verifikasi fisik.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Pemeriksaan Fisik & Verifikasi)",
        "features": [
          {
            "id": "seleksi-batch",
            "name": "Seleksi Kualitas Bibit Batch"
          }
        ]
      },
      "feature": {
        "id": "seleksi-batch",
        "name": "Seleksi Kualitas Bibit Batch"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-SEL-001",
          "title": "Verifikasi Fisik Sebelum Pengurangan Populasi Batch"
        }
      ]
    },
    {
      "module": {
        "id": "06-penyeleksian",
        "order": "06",
        "name": "Penyeleksian",
        "roleId": "mantri-bibitan",
        "subtitle": "Seleksi Kualitas & Verifikasi Fisik Batch",
        "desc": "Penyeleksian bibit afkir/mati secara dinamis berulang. Hasil deklarasi Mantri tidak langsung mengurangi populasi Batch sampai Asisten Bibitan melakukan verifikasi fisik.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Pemeriksaan Fisik & Verifikasi)",
        "features": [
          {
            "id": "seleksi-batch",
            "name": "Seleksi Kualitas Bibit Batch"
          }
        ]
      },
      "feature": {
        "id": "seleksi-batch",
        "name": "Seleksi Kualitas Bibit Batch"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-002",
          "title": "Validasi QR Code Objek Fisik"
        }
      ]
    },
    {
      "module": {
        "id": "06-penyeleksian",
        "order": "06",
        "name": "Penyeleksian",
        "roleId": "mantri-bibitan",
        "subtitle": "Seleksi Kualitas & Verifikasi Fisik Batch",
        "desc": "Penyeleksian bibit afkir/mati secara dinamis berulang. Hasil deklarasi Mantri tidak langsung mengurangi populasi Batch sampai Asisten Bibitan melakukan verifikasi fisik.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Pemeriksaan Fisik & Verifikasi)",
        "features": [
          {
            "id": "seleksi-batch",
            "name": "Seleksi Kualitas Bibit Batch"
          }
        ]
      },
      "feature": {
        "id": "seleksi-batch",
        "name": "Seleksi Kualitas Bibit Batch"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-SEL-001",
          "title": "Verifikasi Fisik Sebelum Pengurangan Populasi Batch"
        }
      ]
    },
    {
      "module": {
        "id": "06-penyeleksian",
        "order": "06",
        "name": "Penyeleksian",
        "roleId": "mantri-bibitan",
        "subtitle": "Seleksi Kualitas & Verifikasi Fisik Batch",
        "desc": "Penyeleksian bibit afkir/mati secara dinamis berulang. Hasil deklarasi Mantri tidak langsung mengurangi populasi Batch sampai Asisten Bibitan melakukan verifikasi fisik.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Pemeriksaan Fisik & Verifikasi)",
        "features": [
          {
            "id": "seleksi-batch",
            "name": "Seleksi Kualitas Bibit Batch"
          }
        ]
      },
      "feature": {
        "id": "seleksi-batch",
        "name": "Seleksi Kualitas Bibit Batch"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-SEL-001",
          "title": "Verifikasi Fisik Sebelum Pengurangan Populasi Batch"
        }
      ]
    },
    {
      "module": {
        "id": "06-penyeleksian",
        "order": "06",
        "name": "Penyeleksian",
        "roleId": "mantri-bibitan",
        "subtitle": "Seleksi Kualitas & Verifikasi Fisik Batch",
        "desc": "Penyeleksian bibit afkir/mati secara dinamis berulang. Hasil deklarasi Mantri tidak langsung mengurangi populasi Batch sampai Asisten Bibitan melakukan verifikasi fisik.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Pemeriksaan Fisik & Verifikasi)",
        "features": [
          {
            "id": "seleksi-batch",
            "name": "Seleksi Kualitas Bibit Batch"
          }
        ]
      },
      "feature": {
        "id": "seleksi-batch",
        "name": "Seleksi Kualitas Bibit Batch"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-GLB-001",
          "title": "Mandatory Foto Dokumentasi + Timestamp"
        }
      ]
    },
    {
      "module": {
        "id": "06-penyeleksian",
        "order": "06",
        "name": "Penyeleksian",
        "roleId": "mantri-bibitan",
        "subtitle": "Seleksi Kualitas & Verifikasi Fisik Batch",
        "desc": "Penyeleksian bibit afkir/mati secara dinamis berulang. Hasil deklarasi Mantri tidak langsung mengurangi populasi Batch sampai Asisten Bibitan melakukan verifikasi fisik.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Pemeriksaan Fisik & Verifikasi)",
        "features": [
          {
            "id": "seleksi-batch",
            "name": "Seleksi Kualitas Bibit Batch"
          }
        ]
      },
      "feature": {
        "id": "seleksi-batch",
        "name": "Seleksi Kualitas Bibit Batch"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-GLB-002",
          "title": "Kewajiban Verifikasi Asisten Bibitan"
        }
      ]
    },
    {
      "module": {
        "id": "06-penyeleksian",
        "order": "06",
        "name": "Penyeleksian",
        "roleId": "mantri-bibitan",
        "subtitle": "Seleksi Kualitas & Verifikasi Fisik Batch",
        "desc": "Penyeleksian bibit afkir/mati secara dinamis berulang. Hasil deklarasi Mantri tidak langsung mengurangi populasi Batch sampai Asisten Bibitan melakukan verifikasi fisik.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Pemeriksaan Fisik & Verifikasi)",
        "features": [
          {
            "id": "seleksi-batch",
            "name": "Seleksi Kualitas Bibit Batch"
          }
        ]
      },
      "feature": {
        "id": "seleksi-batch",
        "name": "Seleksi Kualitas Bibit Batch"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-SEL-001",
          "title": "Verifikasi Fisik Sebelum Pengurangan Populasi Batch"
        }
      ]
    },
    {
      "module": {
        "id": "06-penyeleksian",
        "order": "06",
        "name": "Penyeleksian",
        "roleId": "mantri-bibitan",
        "subtitle": "Seleksi Kualitas & Verifikasi Fisik Batch",
        "desc": "Penyeleksian bibit afkir/mati secara dinamis berulang. Hasil deklarasi Mantri tidak langsung mengurangi populasi Batch sampai Asisten Bibitan melakukan verifikasi fisik.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Pemeriksaan Fisik & Verifikasi)",
        "features": [
          {
            "id": "seleksi-batch",
            "name": "Seleksi Kualitas Bibit Batch"
          }
        ]
      },
      "feature": {
        "id": "seleksi-batch",
        "name": "Seleksi Kualitas Bibit Batch"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-SEL-001",
          "title": "Verifikasi Fisik Sebelum Pengurangan Populasi Batch"
        }
      ]
    },
    {
      "module": {
        "id": "06-penyeleksian",
        "order": "06",
        "name": "Penyeleksian",
        "roleId": "mantri-bibitan",
        "subtitle": "Seleksi Kualitas & Verifikasi Fisik Batch",
        "desc": "Penyeleksian bibit afkir/mati secara dinamis berulang. Hasil deklarasi Mantri tidak langsung mengurangi populasi Batch sampai Asisten Bibitan melakukan verifikasi fisik.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Pemeriksaan Fisik & Verifikasi)",
        "features": [
          {
            "id": "seleksi-batch",
            "name": "Seleksi Kualitas Bibit Batch"
          }
        ]
      },
      "feature": {
        "id": "seleksi-batch",
        "name": "Seleksi Kualitas Bibit Batch"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-SEL-001",
          "title": "Verifikasi Fisik Sebelum Pengurangan Populasi Batch"
        }
      ]
    },
    {
      "module": {
        "id": "06-penyeleksian",
        "order": "06",
        "name": "Penyeleksian",
        "roleId": "mantri-bibitan",
        "subtitle": "Seleksi Kualitas & Verifikasi Fisik Batch",
        "desc": "Penyeleksian bibit afkir/mati secara dinamis berulang. Hasil deklarasi Mantri tidak langsung mengurangi populasi Batch sampai Asisten Bibitan melakukan verifikasi fisik.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Pemeriksaan Fisik & Verifikasi)",
        "features": [
          {
            "id": "seleksi-batch",
            "name": "Seleksi Kualitas Bibit Batch"
          }
        ]
      },
      "feature": {
        "id": "seleksi-batch",
        "name": "Seleksi Kualitas Bibit Batch"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-SEL-001",
          "title": "Verifikasi Fisik Sebelum Pengurangan Populasi Batch"
        }
      ]
    },
    {
      "module": {
        "id": "07-kebun-entres",
        "order": "07",
        "name": "Kebun Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeliharaan Kebun Entres (Menunas & Topping)",
        "desc": "Pemeliharaan pokok induk entres pada Plot Entres melalui aktivitas Menunas dan Topping dengan perhitungan rasio perisai/cabang dan perisai/meter.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "entres-menunas",
            "name": "Menunas Plot Entres"
          },
          {
            "id": "entres-topping",
            "name": "Topping Plot Entres"
          }
        ]
      },
      "feature": {
        "id": "entres-menunas",
        "name": "Menunas Plot Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "07-kebun-entres",
        "order": "07",
        "name": "Kebun Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeliharaan Kebun Entres (Menunas & Topping)",
        "desc": "Pemeliharaan pokok induk entres pada Plot Entres melalui aktivitas Menunas dan Topping dengan perhitungan rasio perisai/cabang dan perisai/meter.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "entres-menunas",
            "name": "Menunas Plot Entres"
          },
          {
            "id": "entres-topping",
            "name": "Topping Plot Entres"
          }
        ]
      },
      "feature": {
        "id": "entres-menunas",
        "name": "Menunas Plot Entres"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-005",
          "title": "Identitas Stok Mata Entres"
        }
      ]
    },
    {
      "module": {
        "id": "07-kebun-entres",
        "order": "07",
        "name": "Kebun Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeliharaan Kebun Entres (Menunas & Topping)",
        "desc": "Pemeliharaan pokok induk entres pada Plot Entres melalui aktivitas Menunas dan Topping dengan perhitungan rasio perisai/cabang dan perisai/meter.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "entres-menunas",
            "name": "Menunas Plot Entres"
          },
          {
            "id": "entres-topping",
            "name": "Topping Plot Entres"
          }
        ]
      },
      "feature": {
        "id": "entres-menunas",
        "name": "Menunas Plot Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "07-kebun-entres",
        "order": "07",
        "name": "Kebun Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeliharaan Kebun Entres (Menunas & Topping)",
        "desc": "Pemeliharaan pokok induk entres pada Plot Entres melalui aktivitas Menunas dan Topping dengan perhitungan rasio perisai/cabang dan perisai/meter.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "entres-menunas",
            "name": "Menunas Plot Entres"
          },
          {
            "id": "entres-topping",
            "name": "Topping Plot Entres"
          }
        ]
      },
      "feature": {
        "id": "entres-menunas",
        "name": "Menunas Plot Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "07-kebun-entres",
        "order": "07",
        "name": "Kebun Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeliharaan Kebun Entres (Menunas & Topping)",
        "desc": "Pemeliharaan pokok induk entres pada Plot Entres melalui aktivitas Menunas dan Topping dengan perhitungan rasio perisai/cabang dan perisai/meter.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "entres-menunas",
            "name": "Menunas Plot Entres"
          },
          {
            "id": "entres-topping",
            "name": "Topping Plot Entres"
          }
        ]
      },
      "feature": {
        "id": "entres-menunas",
        "name": "Menunas Plot Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "07-kebun-entres",
        "order": "07",
        "name": "Kebun Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeliharaan Kebun Entres (Menunas & Topping)",
        "desc": "Pemeliharaan pokok induk entres pada Plot Entres melalui aktivitas Menunas dan Topping dengan perhitungan rasio perisai/cabang dan perisai/meter.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "entres-menunas",
            "name": "Menunas Plot Entres"
          },
          {
            "id": "entres-topping",
            "name": "Topping Plot Entres"
          }
        ]
      },
      "feature": {
        "id": "entres-menunas",
        "name": "Menunas Plot Entres"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-GLB-001",
          "title": "Mandatory Foto Dokumentasi + Timestamp"
        },
        {
          "id": "BR-GLB-002",
          "title": "Kewajiban Verifikasi Asisten Bibitan"
        }
      ]
    },
    {
      "module": {
        "id": "07-kebun-entres",
        "order": "07",
        "name": "Kebun Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeliharaan Kebun Entres (Menunas & Topping)",
        "desc": "Pemeliharaan pokok induk entres pada Plot Entres melalui aktivitas Menunas dan Topping dengan perhitungan rasio perisai/cabang dan perisai/meter.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "entres-menunas",
            "name": "Menunas Plot Entres"
          },
          {
            "id": "entres-topping",
            "name": "Topping Plot Entres"
          }
        ]
      },
      "feature": {
        "id": "entres-menunas",
        "name": "Menunas Plot Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "08-panen-mata-entres",
        "order": "08",
        "name": "Panen Mata Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemanenan Cabang & Registrasi Stok Mata Entres",
        "desc": "Pemanenan cabang entres per Plot Entres + Clone. Perhitungan estimasi vs input mata entres aktual, yang akan menambah stok resmi setelah diverifikasi Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "panen-entres",
            "name": "Panen Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "panen-entres",
        "name": "Panen Mata Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "08-panen-mata-entres",
        "order": "08",
        "name": "Panen Mata Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemanenan Cabang & Registrasi Stok Mata Entres",
        "desc": "Pemanenan cabang entres per Plot Entres + Clone. Perhitungan estimasi vs input mata entres aktual, yang akan menambah stok resmi setelah diverifikasi Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "panen-entres",
            "name": "Panen Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "panen-entres",
        "name": "Panen Mata Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "08-panen-mata-entres",
        "order": "08",
        "name": "Panen Mata Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemanenan Cabang & Registrasi Stok Mata Entres",
        "desc": "Pemanenan cabang entres per Plot Entres + Clone. Perhitungan estimasi vs input mata entres aktual, yang akan menambah stok resmi setelah diverifikasi Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "panen-entres",
            "name": "Panen Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "panen-entres",
        "name": "Panen Mata Entres"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-006",
          "title": "Status Estimasi vs Stok Aktual"
        }
      ]
    },
    {
      "module": {
        "id": "08-panen-mata-entres",
        "order": "08",
        "name": "Panen Mata Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemanenan Cabang & Registrasi Stok Mata Entres",
        "desc": "Pemanenan cabang entres per Plot Entres + Clone. Perhitungan estimasi vs input mata entres aktual, yang akan menambah stok resmi setelah diverifikasi Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "panen-entres",
            "name": "Panen Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "panen-entres",
        "name": "Panen Mata Entres"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-006",
          "title": "Status Estimasi vs Stok Aktual"
        }
      ]
    },
    {
      "module": {
        "id": "08-panen-mata-entres",
        "order": "08",
        "name": "Panen Mata Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemanenan Cabang & Registrasi Stok Mata Entres",
        "desc": "Pemanenan cabang entres per Plot Entres + Clone. Perhitungan estimasi vs input mata entres aktual, yang akan menambah stok resmi setelah diverifikasi Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "panen-entres",
            "name": "Panen Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "panen-entres",
        "name": "Panen Mata Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "08-panen-mata-entres",
        "order": "08",
        "name": "Panen Mata Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemanenan Cabang & Registrasi Stok Mata Entres",
        "desc": "Pemanenan cabang entres per Plot Entres + Clone. Perhitungan estimasi vs input mata entres aktual, yang akan menambah stok resmi setelah diverifikasi Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "panen-entres",
            "name": "Panen Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "panen-entres",
        "name": "Panen Mata Entres"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-GLB-001",
          "title": "Mandatory Foto Dokumentasi + Timestamp"
        }
      ]
    },
    {
      "module": {
        "id": "08-panen-mata-entres",
        "order": "08",
        "name": "Panen Mata Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemanenan Cabang & Registrasi Stok Mata Entres",
        "desc": "Pemanenan cabang entres per Plot Entres + Clone. Perhitungan estimasi vs input mata entres aktual, yang akan menambah stok resmi setelah diverifikasi Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "panen-entres",
            "name": "Panen Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "panen-entres",
        "name": "Panen Mata Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "08-panen-mata-entres",
        "order": "08",
        "name": "Panen Mata Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemanenan Cabang & Registrasi Stok Mata Entres",
        "desc": "Pemanenan cabang entres per Plot Entres + Clone. Perhitungan estimasi vs input mata entres aktual, yang akan menambah stok resmi setelah diverifikasi Asisten Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "panen-entres",
            "name": "Panen Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "panen-entres",
        "name": "Panen Mata Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "09-material-bahan",
        "order": "09",
        "name": "Material & Bahan",
        "roleId": "mantri-bibitan",
        "subtitle": "Monitoring Stok Mata Entres & Dokumen Gudang",
        "desc": "Pengawasan saldo mutasi stok mata entres (+ panen terverifikasi, - okulasi/pengeluaran) serta pelekatan dokumen pengeluaran gudang material matching 1 Heading Kerja.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi), Petugas Gudang",
        "features": [
          {
            "id": "monitoring-stok-entres",
            "name": "Monitoring Mutasi Stok Mata Entres"
          },
          {
            "id": "material-gudang-matching",
            "name": "Matching Material Dokumen Gudang"
          }
        ]
      },
      "feature": {
        "id": "monitoring-stok-entres",
        "name": "Monitoring Mutasi Stok Mata Entres"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-MAT-001",
          "title": "Integritas 1 Dokumen Gudang = 1 Heading Kerja"
        }
      ]
    },
    {
      "module": {
        "id": "09-material-bahan",
        "order": "09",
        "name": "Material & Bahan",
        "roleId": "mantri-bibitan",
        "subtitle": "Monitoring Stok Mata Entres & Dokumen Gudang",
        "desc": "Pengawasan saldo mutasi stok mata entres (+ panen terverifikasi, - okulasi/pengeluaran) serta pelekatan dokumen pengeluaran gudang material matching 1 Heading Kerja.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi), Petugas Gudang",
        "features": [
          {
            "id": "monitoring-stok-entres",
            "name": "Monitoring Mutasi Stok Mata Entres"
          },
          {
            "id": "material-gudang-matching",
            "name": "Matching Material Dokumen Gudang"
          }
        ]
      },
      "feature": {
        "id": "monitoring-stok-entres",
        "name": "Monitoring Mutasi Stok Mata Entres"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-005",
          "title": "Identitas Stok Mata Entres"
        }
      ]
    },
    {
      "module": {
        "id": "09-material-bahan",
        "order": "09",
        "name": "Material & Bahan",
        "roleId": "mantri-bibitan",
        "subtitle": "Monitoring Stok Mata Entres & Dokumen Gudang",
        "desc": "Pengawasan saldo mutasi stok mata entres (+ panen terverifikasi, - okulasi/pengeluaran) serta pelekatan dokumen pengeluaran gudang material matching 1 Heading Kerja.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi), Petugas Gudang",
        "features": [
          {
            "id": "monitoring-stok-entres",
            "name": "Monitoring Mutasi Stok Mata Entres"
          },
          {
            "id": "material-gudang-matching",
            "name": "Matching Material Dokumen Gudang"
          }
        ]
      },
      "feature": {
        "id": "monitoring-stok-entres",
        "name": "Monitoring Mutasi Stok Mata Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "09-material-bahan",
        "order": "09",
        "name": "Material & Bahan",
        "roleId": "mantri-bibitan",
        "subtitle": "Monitoring Stok Mata Entres & Dokumen Gudang",
        "desc": "Pengawasan saldo mutasi stok mata entres (+ panen terverifikasi, - okulasi/pengeluaran) serta pelekatan dokumen pengeluaran gudang material matching 1 Heading Kerja.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi), Petugas Gudang",
        "features": [
          {
            "id": "monitoring-stok-entres",
            "name": "Monitoring Mutasi Stok Mata Entres"
          },
          {
            "id": "material-gudang-matching",
            "name": "Matching Material Dokumen Gudang"
          }
        ]
      },
      "feature": {
        "id": "monitoring-stok-entres",
        "name": "Monitoring Mutasi Stok Mata Entres"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-MAT-001",
          "title": "Integritas 1 Dokumen Gudang = 1 Heading Kerja"
        }
      ]
    },
    {
      "module": {
        "id": "09-material-bahan",
        "order": "09",
        "name": "Material & Bahan",
        "roleId": "mantri-bibitan",
        "subtitle": "Monitoring Stok Mata Entres & Dokumen Gudang",
        "desc": "Pengawasan saldo mutasi stok mata entres (+ panen terverifikasi, - okulasi/pengeluaran) serta pelekatan dokumen pengeluaran gudang material matching 1 Heading Kerja.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi), Petugas Gudang",
        "features": [
          {
            "id": "monitoring-stok-entres",
            "name": "Monitoring Mutasi Stok Mata Entres"
          },
          {
            "id": "material-gudang-matching",
            "name": "Matching Material Dokumen Gudang"
          }
        ]
      },
      "feature": {
        "id": "monitoring-stok-entres",
        "name": "Monitoring Mutasi Stok Mata Entres"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-MAT-001",
          "title": "Integritas 1 Dokumen Gudang = 1 Heading Kerja"
        }
      ]
    },
    {
      "module": {
        "id": "09-material-bahan",
        "order": "09",
        "name": "Material & Bahan",
        "roleId": "mantri-bibitan",
        "subtitle": "Monitoring Stok Mata Entres & Dokumen Gudang",
        "desc": "Pengawasan saldo mutasi stok mata entres (+ panen terverifikasi, - okulasi/pengeluaran) serta pelekatan dokumen pengeluaran gudang material matching 1 Heading Kerja.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi), Petugas Gudang",
        "features": [
          {
            "id": "monitoring-stok-entres",
            "name": "Monitoring Mutasi Stok Mata Entres"
          },
          {
            "id": "material-gudang-matching",
            "name": "Matching Material Dokumen Gudang"
          }
        ]
      },
      "feature": {
        "id": "monitoring-stok-entres",
        "name": "Monitoring Mutasi Stok Mata Entres"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-GLB-002",
          "title": "Kewajiban Verifikasi Asisten Bibitan"
        }
      ]
    },
    {
      "module": {
        "id": "09-material-bahan",
        "order": "09",
        "name": "Material & Bahan",
        "roleId": "mantri-bibitan",
        "subtitle": "Monitoring Stok Mata Entres & Dokumen Gudang",
        "desc": "Pengawasan saldo mutasi stok mata entres (+ panen terverifikasi, - okulasi/pengeluaran) serta pelekatan dokumen pengeluaran gudang material matching 1 Heading Kerja.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi), Petugas Gudang",
        "features": [
          {
            "id": "monitoring-stok-entres",
            "name": "Monitoring Mutasi Stok Mata Entres"
          },
          {
            "id": "material-gudang-matching",
            "name": "Matching Material Dokumen Gudang"
          }
        ]
      },
      "feature": {
        "id": "monitoring-stok-entres",
        "name": "Monitoring Mutasi Stok Mata Entres"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-MAT-001",
          "title": "Integritas 1 Dokumen Gudang = 1 Heading Kerja"
        }
      ]
    },
    {
      "module": {
        "id": "10-rekam-pemeliharaan",
        "order": "10",
        "name": "Rekam Pemeliharaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pencatatan Aktivitas Berbasis Heading Kerja",
        "desc": "Pencatatan aktivitas perawatan dinamis berbasis Grup Heading dan Heading Kerja terhadap objek Batch, Bedengan, Plot Entres, atau Blok dengan auto-match Dokumen Gudang.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "pemeliharaan-heading",
            "name": "Rekam Aktivitas Pemeliharaan"
          }
        ]
      },
      "feature": {
        "id": "pemeliharaan-heading",
        "name": "Rekam Aktivitas Pemeliharaan"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "10-rekam-pemeliharaan",
        "order": "10",
        "name": "Rekam Pemeliharaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pencatatan Aktivitas Berbasis Heading Kerja",
        "desc": "Pencatatan aktivitas perawatan dinamis berbasis Grup Heading dan Heading Kerja terhadap objek Batch, Bedengan, Plot Entres, atau Blok dengan auto-match Dokumen Gudang.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "pemeliharaan-heading",
            "name": "Rekam Aktivitas Pemeliharaan"
          }
        ]
      },
      "feature": {
        "id": "pemeliharaan-heading",
        "name": "Rekam Aktivitas Pemeliharaan"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "10-rekam-pemeliharaan",
        "order": "10",
        "name": "Rekam Pemeliharaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pencatatan Aktivitas Berbasis Heading Kerja",
        "desc": "Pencatatan aktivitas perawatan dinamis berbasis Grup Heading dan Heading Kerja terhadap objek Batch, Bedengan, Plot Entres, atau Blok dengan auto-match Dokumen Gudang.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "pemeliharaan-heading",
            "name": "Rekam Aktivitas Pemeliharaan"
          }
        ]
      },
      "feature": {
        "id": "pemeliharaan-heading",
        "name": "Rekam Aktivitas Pemeliharaan"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-002",
          "title": "Validasi QR Code Objek Fisik"
        }
      ]
    },
    {
      "module": {
        "id": "10-rekam-pemeliharaan",
        "order": "10",
        "name": "Rekam Pemeliharaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pencatatan Aktivitas Berbasis Heading Kerja",
        "desc": "Pencatatan aktivitas perawatan dinamis berbasis Grup Heading dan Heading Kerja terhadap objek Batch, Bedengan, Plot Entres, atau Blok dengan auto-match Dokumen Gudang.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "pemeliharaan-heading",
            "name": "Rekam Aktivitas Pemeliharaan"
          }
        ]
      },
      "feature": {
        "id": "pemeliharaan-heading",
        "name": "Rekam Aktivitas Pemeliharaan"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "10-rekam-pemeliharaan",
        "order": "10",
        "name": "Rekam Pemeliharaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pencatatan Aktivitas Berbasis Heading Kerja",
        "desc": "Pencatatan aktivitas perawatan dinamis berbasis Grup Heading dan Heading Kerja terhadap objek Batch, Bedengan, Plot Entres, atau Blok dengan auto-match Dokumen Gudang.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "pemeliharaan-heading",
            "name": "Rekam Aktivitas Pemeliharaan"
          }
        ]
      },
      "feature": {
        "id": "pemeliharaan-heading",
        "name": "Rekam Aktivitas Pemeliharaan"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-GLB-001",
          "title": "Mandatory Foto Dokumentasi + Timestamp"
        }
      ]
    },
    {
      "module": {
        "id": "10-rekam-pemeliharaan",
        "order": "10",
        "name": "Rekam Pemeliharaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pencatatan Aktivitas Berbasis Heading Kerja",
        "desc": "Pencatatan aktivitas perawatan dinamis berbasis Grup Heading dan Heading Kerja terhadap objek Batch, Bedengan, Plot Entres, atau Blok dengan auto-match Dokumen Gudang.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "pemeliharaan-heading",
            "name": "Rekam Aktivitas Pemeliharaan"
          }
        ]
      },
      "feature": {
        "id": "pemeliharaan-heading",
        "name": "Rekam Aktivitas Pemeliharaan"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-MAT-001",
          "title": "Integritas 1 Dokumen Gudang = 1 Heading Kerja"
        }
      ]
    },
    {
      "module": {
        "id": "10-rekam-pemeliharaan",
        "order": "10",
        "name": "Rekam Pemeliharaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pencatatan Aktivitas Berbasis Heading Kerja",
        "desc": "Pencatatan aktivitas perawatan dinamis berbasis Grup Heading dan Heading Kerja terhadap objek Batch, Bedengan, Plot Entres, atau Blok dengan auto-match Dokumen Gudang.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "pemeliharaan-heading",
            "name": "Rekam Aktivitas Pemeliharaan"
          }
        ]
      },
      "feature": {
        "id": "pemeliharaan-heading",
        "name": "Rekam Aktivitas Pemeliharaan"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-GLB-002",
          "title": "Kewajiban Verifikasi Asisten Bibitan"
        }
      ]
    },
    {
      "module": {
        "id": "10-rekam-pemeliharaan",
        "order": "10",
        "name": "Rekam Pemeliharaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pencatatan Aktivitas Berbasis Heading Kerja",
        "desc": "Pencatatan aktivitas perawatan dinamis berbasis Grup Heading dan Heading Kerja terhadap objek Batch, Bedengan, Plot Entres, atau Blok dengan auto-match Dokumen Gudang.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "pemeliharaan-heading",
            "name": "Rekam Aktivitas Pemeliharaan"
          }
        ]
      },
      "feature": {
        "id": "pemeliharaan-heading",
        "name": "Rekam Aktivitas Pemeliharaan"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "11-pengeluaran",
        "order": "11",
        "name": "Pengeluaran",
        "roleId": "mantri-bibitan",
        "subtitle": "Distribusi Bibit & Mata Entres Berbasis Permintaan",
        "desc": "Pengeluaran bibit (ke kebun sendiri/komersil) dan mata entres berdasarkan dokumen permintaan (SPB/DO) yang telah disetujui, tervalidasi QR, foto, dan verifikasi Asisten.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi Peminta, Pengurus",
        "features": [
          {
            "id": "pengeluaran-bibit",
            "name": "Pengeluaran Bibit (SPB Disetujui)"
          },
          {
            "id": "pengeluaran-mata-entres",
            "name": "Pengeluaran Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "pengeluaran-bibit",
        "name": "Pengeluaran Bibit (SPB Disetujui)"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "11-pengeluaran",
        "order": "11",
        "name": "Pengeluaran",
        "roleId": "mantri-bibitan",
        "subtitle": "Distribusi Bibit & Mata Entres Berbasis Permintaan",
        "desc": "Pengeluaran bibit (ke kebun sendiri/komersil) dan mata entres berdasarkan dokumen permintaan (SPB/DO) yang telah disetujui, tervalidasi QR, foto, dan verifikasi Asisten.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi Peminta, Pengurus",
        "features": [
          {
            "id": "pengeluaran-bibit",
            "name": "Pengeluaran Bibit (SPB Disetujui)"
          },
          {
            "id": "pengeluaran-mata-entres",
            "name": "Pengeluaran Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "pengeluaran-bibit",
        "name": "Pengeluaran Bibit (SPB Disetujui)"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "11-pengeluaran",
        "order": "11",
        "name": "Pengeluaran",
        "roleId": "mantri-bibitan",
        "subtitle": "Distribusi Bibit & Mata Entres Berbasis Permintaan",
        "desc": "Pengeluaran bibit (ke kebun sendiri/komersil) dan mata entres berdasarkan dokumen permintaan (SPB/DO) yang telah disetujui, tervalidasi QR, foto, dan verifikasi Asisten.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi Peminta, Pengurus",
        "features": [
          {
            "id": "pengeluaran-bibit",
            "name": "Pengeluaran Bibit (SPB Disetujui)"
          },
          {
            "id": "pengeluaran-mata-entres",
            "name": "Pengeluaran Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "pengeluaran-bibit",
        "name": "Pengeluaran Bibit (SPB Disetujui)"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-OKL-002",
          "title": "Validasi QR Code Objek Fisik"
        }
      ]
    },
    {
      "module": {
        "id": "11-pengeluaran",
        "order": "11",
        "name": "Pengeluaran",
        "roleId": "mantri-bibitan",
        "subtitle": "Distribusi Bibit & Mata Entres Berbasis Permintaan",
        "desc": "Pengeluaran bibit (ke kebun sendiri/komersil) dan mata entres berdasarkan dokumen permintaan (SPB/DO) yang telah disetujui, tervalidasi QR, foto, dan verifikasi Asisten.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi Peminta, Pengurus",
        "features": [
          {
            "id": "pengeluaran-bibit",
            "name": "Pengeluaran Bibit (SPB Disetujui)"
          },
          {
            "id": "pengeluaran-mata-entres",
            "name": "Pengeluaran Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "pengeluaran-bibit",
        "name": "Pengeluaran Bibit (SPB Disetujui)"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "11-pengeluaran",
        "order": "11",
        "name": "Pengeluaran",
        "roleId": "mantri-bibitan",
        "subtitle": "Distribusi Bibit & Mata Entres Berbasis Permintaan",
        "desc": "Pengeluaran bibit (ke kebun sendiri/komersil) dan mata entres berdasarkan dokumen permintaan (SPB/DO) yang telah disetujui, tervalidasi QR, foto, dan verifikasi Asisten.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi Peminta, Pengurus",
        "features": [
          {
            "id": "pengeluaran-bibit",
            "name": "Pengeluaran Bibit (SPB Disetujui)"
          },
          {
            "id": "pengeluaran-mata-entres",
            "name": "Pengeluaran Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "pengeluaran-bibit",
        "name": "Pengeluaran Bibit (SPB Disetujui)"
      },
      "flowNodes": [],
      "businessRules": [
        {
          "id": "BR-GLB-001",
          "title": "Mandatory Foto Dokumentasi + Timestamp"
        }
      ]
    },
    {
      "module": {
        "id": "11-pengeluaran",
        "order": "11",
        "name": "Pengeluaran",
        "roleId": "mantri-bibitan",
        "subtitle": "Distribusi Bibit & Mata Entres Berbasis Permintaan",
        "desc": "Pengeluaran bibit (ke kebun sendiri/komersil) dan mata entres berdasarkan dokumen permintaan (SPB/DO) yang telah disetujui, tervalidasi QR, foto, dan verifikasi Asisten.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi Peminta, Pengurus",
        "features": [
          {
            "id": "pengeluaran-bibit",
            "name": "Pengeluaran Bibit (SPB Disetujui)"
          },
          {
            "id": "pengeluaran-mata-entres",
            "name": "Pengeluaran Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "pengeluaran-bibit",
        "name": "Pengeluaran Bibit (SPB Disetujui)"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "11-pengeluaran",
        "order": "11",
        "name": "Pengeluaran",
        "roleId": "mantri-bibitan",
        "subtitle": "Distribusi Bibit & Mata Entres Berbasis Permintaan",
        "desc": "Pengeluaran bibit (ke kebun sendiri/komersil) dan mata entres berdasarkan dokumen permintaan (SPB/DO) yang telah disetujui, tervalidasi QR, foto, dan verifikasi Asisten.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi Peminta, Pengurus",
        "features": [
          {
            "id": "pengeluaran-bibit",
            "name": "Pengeluaran Bibit (SPB Disetujui)"
          },
          {
            "id": "pengeluaran-mata-entres",
            "name": "Pengeluaran Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "pengeluaran-bibit",
        "name": "Pengeluaran Bibit (SPB Disetujui)"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "11-pengeluaran",
        "order": "11",
        "name": "Pengeluaran",
        "roleId": "mantri-bibitan",
        "subtitle": "Distribusi Bibit & Mata Entres Berbasis Permintaan",
        "desc": "Pengeluaran bibit (ke kebun sendiri/komersil) dan mata entres berdasarkan dokumen permintaan (SPB/DO) yang telah disetujui, tervalidasi QR, foto, dan verifikasi Asisten.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi Peminta, Pengurus",
        "features": [
          {
            "id": "pengeluaran-bibit",
            "name": "Pengeluaran Bibit (SPB Disetujui)"
          },
          {
            "id": "pengeluaran-mata-entres",
            "name": "Pengeluaran Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "pengeluaran-mata-entres",
        "name": "Pengeluaran Mata Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "11-pengeluaran",
        "order": "11",
        "name": "Pengeluaran",
        "roleId": "mantri-bibitan",
        "subtitle": "Distribusi Bibit & Mata Entres Berbasis Permintaan",
        "desc": "Pengeluaran bibit (ke kebun sendiri/komersil) dan mata entres berdasarkan dokumen permintaan (SPB/DO) yang telah disetujui, tervalidasi QR, foto, dan verifikasi Asisten.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi Peminta, Pengurus",
        "features": [
          {
            "id": "pengeluaran-bibit",
            "name": "Pengeluaran Bibit (SPB Disetujui)"
          },
          {
            "id": "pengeluaran-mata-entres",
            "name": "Pengeluaran Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "pengeluaran-mata-entres",
        "name": "Pengeluaran Mata Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "11-pengeluaran",
        "order": "11",
        "name": "Pengeluaran",
        "roleId": "mantri-bibitan",
        "subtitle": "Distribusi Bibit & Mata Entres Berbasis Permintaan",
        "desc": "Pengeluaran bibit (ke kebun sendiri/komersil) dan mata entres berdasarkan dokumen permintaan (SPB/DO) yang telah disetujui, tervalidasi QR, foto, dan verifikasi Asisten.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi Peminta, Pengurus",
        "features": [
          {
            "id": "pengeluaran-bibit",
            "name": "Pengeluaran Bibit (SPB Disetujui)"
          },
          {
            "id": "pengeluaran-mata-entres",
            "name": "Pengeluaran Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "pengeluaran-mata-entres",
        "name": "Pengeluaran Mata Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "11-pengeluaran",
        "order": "11",
        "name": "Pengeluaran",
        "roleId": "mantri-bibitan",
        "subtitle": "Distribusi Bibit & Mata Entres Berbasis Permintaan",
        "desc": "Pengeluaran bibit (ke kebun sendiri/komersil) dan mata entres berdasarkan dokumen permintaan (SPB/DO) yang telah disetujui, tervalidasi QR, foto, dan verifikasi Asisten.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi Peminta, Pengurus",
        "features": [
          {
            "id": "pengeluaran-bibit",
            "name": "Pengeluaran Bibit (SPB Disetujui)"
          },
          {
            "id": "pengeluaran-mata-entres",
            "name": "Pengeluaran Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "pengeluaran-mata-entres",
        "name": "Pengeluaran Mata Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "11-pengeluaran",
        "order": "11",
        "name": "Pengeluaran",
        "roleId": "mantri-bibitan",
        "subtitle": "Distribusi Bibit & Mata Entres Berbasis Permintaan",
        "desc": "Pengeluaran bibit (ke kebun sendiri/komersil) dan mata entres berdasarkan dokumen permintaan (SPB/DO) yang telah disetujui, tervalidasi QR, foto, dan verifikasi Asisten.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi Peminta, Pengurus",
        "features": [
          {
            "id": "pengeluaran-bibit",
            "name": "Pengeluaran Bibit (SPB Disetujui)"
          },
          {
            "id": "pengeluaran-mata-entres",
            "name": "Pengeluaran Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "pengeluaran-mata-entres",
        "name": "Pengeluaran Mata Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-kebun-sepupu",
        "name": "Penerimaan Bibit - Kebun Sepupu"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-kebun-sepupu",
        "name": "Penerimaan Bibit - Kebun Sepupu"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-kebun-sepupu",
        "name": "Penerimaan Bibit - Kebun Sepupu"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-kebun-sepupu",
        "name": "Penerimaan Bibit - Kebun Sepupu"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-kebun-sepupu",
        "name": "Penerimaan Bibit - Kebun Sepupu"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-kebun-sepupu",
        "name": "Penerimaan Bibit - Kebun Sepupu"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-mata-entres",
        "name": "Penerimaan Mata Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-mata-entres",
        "name": "Penerimaan Mata Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-mata-entres",
        "name": "Penerimaan Mata Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-mata-entres",
        "name": "Penerimaan Mata Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-mata-entres",
        "name": "Penerimaan Mata Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "02-penerimaan",
        "order": "02",
        "name": "Penerimaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Penerimaan Benih, Bibit & Mata Entres",
        "desc": "Penerimaan material biologis pembibitan dari pihak ke-3 (biji kelatak), kebun sendiri (cross-role dengan Asisten Divisi/Kepala), dan kebun sepupu dengan dokumentasi foto dan timestamp.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan, Asisten Divisi, Asisten Kepala",
        "features": [
          {
            "id": "terima-benih",
            "name": "Penerimaan Benih / Biji Kelatak"
          },
          {
            "id": "terima-kebun-sendiri",
            "name": "Penerimaan Bibit - Kebun Sendiri"
          },
          {
            "id": "terima-kebun-sepupu",
            "name": "Penerimaan Bibit - Kebun Sepupu"
          },
          {
            "id": "terima-mata-entres",
            "name": "Penerimaan Mata Entres"
          }
        ]
      },
      "feature": {
        "id": "terima-mata-entres",
        "name": "Penerimaan Mata Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "03-penyemaian",
        "order": "03",
        "name": "Penyemaian",
        "roleId": "mantri-bibitan",
        "subtitle": "Penyemaian Bedengan & Transplanting Polybag",
        "desc": "Proses penaburan benih ke Bedengan berdasarkan dokumen penerimaan benih, pemeliharaan ±12–15 hari, hingga transplanting 2 benih/bibit per polybag dan konsolidasi Batch.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "semai-bedengan",
            "name": "Penyemaian ke Bedengan"
          },
          {
            "id": "transplanting-polybag",
            "name": "Transplanting ke Polybag (Batch)"
          }
        ]
      },
      "feature": {
        "id": "transplanting-polybag",
        "name": "Transplanting ke Polybag (Batch)"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "03-penyemaian",
        "order": "03",
        "name": "Penyemaian",
        "roleId": "mantri-bibitan",
        "subtitle": "Penyemaian Bedengan & Transplanting Polybag",
        "desc": "Proses penaburan benih ke Bedengan berdasarkan dokumen penerimaan benih, pemeliharaan ±12–15 hari, hingga transplanting 2 benih/bibit per polybag dan konsolidasi Batch.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "semai-bedengan",
            "name": "Penyemaian ke Bedengan"
          },
          {
            "id": "transplanting-polybag",
            "name": "Transplanting ke Polybag (Batch)"
          }
        ]
      },
      "feature": {
        "id": "transplanting-polybag",
        "name": "Transplanting ke Polybag (Batch)"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "03-penyemaian",
        "order": "03",
        "name": "Penyemaian",
        "roleId": "mantri-bibitan",
        "subtitle": "Penyemaian Bedengan & Transplanting Polybag",
        "desc": "Proses penaburan benih ke Bedengan berdasarkan dokumen penerimaan benih, pemeliharaan ±12–15 hari, hingga transplanting 2 benih/bibit per polybag dan konsolidasi Batch.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "semai-bedengan",
            "name": "Penyemaian ke Bedengan"
          },
          {
            "id": "transplanting-polybag",
            "name": "Transplanting ke Polybag (Batch)"
          }
        ]
      },
      "feature": {
        "id": "transplanting-polybag",
        "name": "Transplanting ke Polybag (Batch)"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "03-penyemaian",
        "order": "03",
        "name": "Penyemaian",
        "roleId": "mantri-bibitan",
        "subtitle": "Penyemaian Bedengan & Transplanting Polybag",
        "desc": "Proses penaburan benih ke Bedengan berdasarkan dokumen penerimaan benih, pemeliharaan ±12–15 hari, hingga transplanting 2 benih/bibit per polybag dan konsolidasi Batch.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "semai-bedengan",
            "name": "Penyemaian ke Bedengan"
          },
          {
            "id": "transplanting-polybag",
            "name": "Transplanting ke Polybag (Batch)"
          }
        ]
      },
      "feature": {
        "id": "transplanting-polybag",
        "name": "Transplanting ke Polybag (Batch)"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "03-penyemaian",
        "order": "03",
        "name": "Penyemaian",
        "roleId": "mantri-bibitan",
        "subtitle": "Penyemaian Bedengan & Transplanting Polybag",
        "desc": "Proses penaburan benih ke Bedengan berdasarkan dokumen penerimaan benih, pemeliharaan ±12–15 hari, hingga transplanting 2 benih/bibit per polybag dan konsolidasi Batch.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "semai-bedengan",
            "name": "Penyemaian ke Bedengan"
          },
          {
            "id": "transplanting-polybag",
            "name": "Transplanting ke Polybag (Batch)"
          }
        ]
      },
      "feature": {
        "id": "transplanting-polybag",
        "name": "Transplanting ke Polybag (Batch)"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "03-penyemaian",
        "order": "03",
        "name": "Penyemaian",
        "roleId": "mantri-bibitan",
        "subtitle": "Penyemaian Bedengan & Transplanting Polybag",
        "desc": "Proses penaburan benih ke Bedengan berdasarkan dokumen penerimaan benih, pemeliharaan ±12–15 hari, hingga transplanting 2 benih/bibit per polybag dan konsolidasi Batch.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "semai-bedengan",
            "name": "Penyemaian ke Bedengan"
          },
          {
            "id": "transplanting-polybag",
            "name": "Transplanting ke Polybag (Batch)"
          }
        ]
      },
      "feature": {
        "id": "transplanting-polybag",
        "name": "Transplanting ke Polybag (Batch)"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "03-penyemaian",
        "order": "03",
        "name": "Penyemaian",
        "roleId": "mantri-bibitan",
        "subtitle": "Penyemaian Bedengan & Transplanting Polybag",
        "desc": "Proses penaburan benih ke Bedengan berdasarkan dokumen penerimaan benih, pemeliharaan ±12–15 hari, hingga transplanting 2 benih/bibit per polybag dan konsolidasi Batch.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "semai-bedengan",
            "name": "Penyemaian ke Bedengan"
          },
          {
            "id": "transplanting-polybag",
            "name": "Transplanting ke Polybag (Batch)"
          }
        ]
      },
      "feature": {
        "id": "transplanting-polybag",
        "name": "Transplanting ke Polybag (Batch)"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "03-penyemaian",
        "order": "03",
        "name": "Penyemaian",
        "roleId": "mantri-bibitan",
        "subtitle": "Penyemaian Bedengan & Transplanting Polybag",
        "desc": "Proses penaburan benih ke Bedengan berdasarkan dokumen penerimaan benih, pemeliharaan ±12–15 hari, hingga transplanting 2 benih/bibit per polybag dan konsolidasi Batch.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "semai-bedengan",
            "name": "Penyemaian ke Bedengan"
          },
          {
            "id": "transplanting-polybag",
            "name": "Transplanting ke Polybag (Batch)"
          }
        ]
      },
      "feature": {
        "id": "transplanting-polybag",
        "name": "Transplanting ke Polybag (Batch)"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "05-pemeriksaan",
        "order": "05",
        "name": "Pemeriksaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeriksaan Hasil Okulasi (Grafting & Regrafting)",
        "desc": "Pemeriksaan berkala hasil okulasi secara dinamis dan bertahap. Bibit yang gagal dapat ditentukan untuk Regrafting berulang kali atau dinyatakan Reject oleh Mantri Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "periksa-grafting",
            "name": "Pemeriksaan Bertahap Grafting"
          },
          {
            "id": "periksa-regrafting",
            "name": "Pemeriksaan Regrafting"
          }
        ]
      },
      "feature": {
        "id": "periksa-regrafting",
        "name": "Pemeriksaan Regrafting"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "05-pemeriksaan",
        "order": "05",
        "name": "Pemeriksaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeriksaan Hasil Okulasi (Grafting & Regrafting)",
        "desc": "Pemeriksaan berkala hasil okulasi secara dinamis dan bertahap. Bibit yang gagal dapat ditentukan untuk Regrafting berulang kali atau dinyatakan Reject oleh Mantri Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "periksa-grafting",
            "name": "Pemeriksaan Bertahap Grafting"
          },
          {
            "id": "periksa-regrafting",
            "name": "Pemeriksaan Regrafting"
          }
        ]
      },
      "feature": {
        "id": "periksa-regrafting",
        "name": "Pemeriksaan Regrafting"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "05-pemeriksaan",
        "order": "05",
        "name": "Pemeriksaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeriksaan Hasil Okulasi (Grafting & Regrafting)",
        "desc": "Pemeriksaan berkala hasil okulasi secara dinamis dan bertahap. Bibit yang gagal dapat ditentukan untuk Regrafting berulang kali atau dinyatakan Reject oleh Mantri Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "periksa-grafting",
            "name": "Pemeriksaan Bertahap Grafting"
          },
          {
            "id": "periksa-regrafting",
            "name": "Pemeriksaan Regrafting"
          }
        ]
      },
      "feature": {
        "id": "periksa-regrafting",
        "name": "Pemeriksaan Regrafting"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "05-pemeriksaan",
        "order": "05",
        "name": "Pemeriksaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeriksaan Hasil Okulasi (Grafting & Regrafting)",
        "desc": "Pemeriksaan berkala hasil okulasi secara dinamis dan bertahap. Bibit yang gagal dapat ditentukan untuk Regrafting berulang kali atau dinyatakan Reject oleh Mantri Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "periksa-grafting",
            "name": "Pemeriksaan Bertahap Grafting"
          },
          {
            "id": "periksa-regrafting",
            "name": "Pemeriksaan Regrafting"
          }
        ]
      },
      "feature": {
        "id": "periksa-regrafting",
        "name": "Pemeriksaan Regrafting"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "05-pemeriksaan",
        "order": "05",
        "name": "Pemeriksaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeriksaan Hasil Okulasi (Grafting & Regrafting)",
        "desc": "Pemeriksaan berkala hasil okulasi secara dinamis dan bertahap. Bibit yang gagal dapat ditentukan untuk Regrafting berulang kali atau dinyatakan Reject oleh Mantri Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "periksa-grafting",
            "name": "Pemeriksaan Bertahap Grafting"
          },
          {
            "id": "periksa-regrafting",
            "name": "Pemeriksaan Regrafting"
          }
        ]
      },
      "feature": {
        "id": "periksa-regrafting",
        "name": "Pemeriksaan Regrafting"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "05-pemeriksaan",
        "order": "05",
        "name": "Pemeriksaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeriksaan Hasil Okulasi (Grafting & Regrafting)",
        "desc": "Pemeriksaan berkala hasil okulasi secara dinamis dan bertahap. Bibit yang gagal dapat ditentukan untuk Regrafting berulang kali atau dinyatakan Reject oleh Mantri Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "periksa-grafting",
            "name": "Pemeriksaan Bertahap Grafting"
          },
          {
            "id": "periksa-regrafting",
            "name": "Pemeriksaan Regrafting"
          }
        ]
      },
      "feature": {
        "id": "periksa-regrafting",
        "name": "Pemeriksaan Regrafting"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "05-pemeriksaan",
        "order": "05",
        "name": "Pemeriksaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeriksaan Hasil Okulasi (Grafting & Regrafting)",
        "desc": "Pemeriksaan berkala hasil okulasi secara dinamis dan bertahap. Bibit yang gagal dapat ditentukan untuk Regrafting berulang kali atau dinyatakan Reject oleh Mantri Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "periksa-grafting",
            "name": "Pemeriksaan Bertahap Grafting"
          },
          {
            "id": "periksa-regrafting",
            "name": "Pemeriksaan Regrafting"
          }
        ]
      },
      "feature": {
        "id": "periksa-regrafting",
        "name": "Pemeriksaan Regrafting"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "05-pemeriksaan",
        "order": "05",
        "name": "Pemeriksaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeriksaan Hasil Okulasi (Grafting & Regrafting)",
        "desc": "Pemeriksaan berkala hasil okulasi secara dinamis dan bertahap. Bibit yang gagal dapat ditentukan untuk Regrafting berulang kali atau dinyatakan Reject oleh Mantri Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "periksa-grafting",
            "name": "Pemeriksaan Bertahap Grafting"
          },
          {
            "id": "periksa-regrafting",
            "name": "Pemeriksaan Regrafting"
          }
        ]
      },
      "feature": {
        "id": "periksa-regrafting",
        "name": "Pemeriksaan Regrafting"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "05-pemeriksaan",
        "order": "05",
        "name": "Pemeriksaan",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeriksaan Hasil Okulasi (Grafting & Regrafting)",
        "desc": "Pemeriksaan berkala hasil okulasi secara dinamis dan bertahap. Bibit yang gagal dapat ditentukan untuk Regrafting berulang kali atau dinyatakan Reject oleh Mantri Bibitan.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "periksa-grafting",
            "name": "Pemeriksaan Bertahap Grafting"
          },
          {
            "id": "periksa-regrafting",
            "name": "Pemeriksaan Regrafting"
          }
        ]
      },
      "feature": {
        "id": "periksa-regrafting",
        "name": "Pemeriksaan Regrafting"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "07-kebun-entres",
        "order": "07",
        "name": "Kebun Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeliharaan Kebun Entres (Menunas & Topping)",
        "desc": "Pemeliharaan pokok induk entres pada Plot Entres melalui aktivitas Menunas dan Topping dengan perhitungan rasio perisai/cabang dan perisai/meter.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "entres-menunas",
            "name": "Menunas Plot Entres"
          },
          {
            "id": "entres-topping",
            "name": "Topping Plot Entres"
          }
        ]
      },
      "feature": {
        "id": "entres-topping",
        "name": "Topping Plot Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "07-kebun-entres",
        "order": "07",
        "name": "Kebun Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeliharaan Kebun Entres (Menunas & Topping)",
        "desc": "Pemeliharaan pokok induk entres pada Plot Entres melalui aktivitas Menunas dan Topping dengan perhitungan rasio perisai/cabang dan perisai/meter.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "entres-menunas",
            "name": "Menunas Plot Entres"
          },
          {
            "id": "entres-topping",
            "name": "Topping Plot Entres"
          }
        ]
      },
      "feature": {
        "id": "entres-topping",
        "name": "Topping Plot Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "07-kebun-entres",
        "order": "07",
        "name": "Kebun Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeliharaan Kebun Entres (Menunas & Topping)",
        "desc": "Pemeliharaan pokok induk entres pada Plot Entres melalui aktivitas Menunas dan Topping dengan perhitungan rasio perisai/cabang dan perisai/meter.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "entres-menunas",
            "name": "Menunas Plot Entres"
          },
          {
            "id": "entres-topping",
            "name": "Topping Plot Entres"
          }
        ]
      },
      "feature": {
        "id": "entres-topping",
        "name": "Topping Plot Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "07-kebun-entres",
        "order": "07",
        "name": "Kebun Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeliharaan Kebun Entres (Menunas & Topping)",
        "desc": "Pemeliharaan pokok induk entres pada Plot Entres melalui aktivitas Menunas dan Topping dengan perhitungan rasio perisai/cabang dan perisai/meter.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "entres-menunas",
            "name": "Menunas Plot Entres"
          },
          {
            "id": "entres-topping",
            "name": "Topping Plot Entres"
          }
        ]
      },
      "feature": {
        "id": "entres-topping",
        "name": "Topping Plot Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "07-kebun-entres",
        "order": "07",
        "name": "Kebun Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeliharaan Kebun Entres (Menunas & Topping)",
        "desc": "Pemeliharaan pokok induk entres pada Plot Entres melalui aktivitas Menunas dan Topping dengan perhitungan rasio perisai/cabang dan perisai/meter.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "entres-menunas",
            "name": "Menunas Plot Entres"
          },
          {
            "id": "entres-topping",
            "name": "Topping Plot Entres"
          }
        ]
      },
      "feature": {
        "id": "entres-topping",
        "name": "Topping Plot Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "07-kebun-entres",
        "order": "07",
        "name": "Kebun Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeliharaan Kebun Entres (Menunas & Topping)",
        "desc": "Pemeliharaan pokok induk entres pada Plot Entres melalui aktivitas Menunas dan Topping dengan perhitungan rasio perisai/cabang dan perisai/meter.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "entres-menunas",
            "name": "Menunas Plot Entres"
          },
          {
            "id": "entres-topping",
            "name": "Topping Plot Entres"
          }
        ]
      },
      "feature": {
        "id": "entres-topping",
        "name": "Topping Plot Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "07-kebun-entres",
        "order": "07",
        "name": "Kebun Entres",
        "roleId": "mantri-bibitan",
        "subtitle": "Pemeliharaan Kebun Entres (Menunas & Topping)",
        "desc": "Pemeliharaan pokok induk entres pada Plot Entres melalui aktivitas Menunas dan Topping dengan perhitungan rasio perisai/cabang dan perisai/meter.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi)",
        "features": [
          {
            "id": "entres-menunas",
            "name": "Menunas Plot Entres"
          },
          {
            "id": "entres-topping",
            "name": "Topping Plot Entres"
          }
        ]
      },
      "feature": {
        "id": "entres-topping",
        "name": "Topping Plot Entres"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "09-material-bahan",
        "order": "09",
        "name": "Material & Bahan",
        "roleId": "mantri-bibitan",
        "subtitle": "Monitoring Stok Mata Entres & Dokumen Gudang",
        "desc": "Pengawasan saldo mutasi stok mata entres (+ panen terverifikasi, - okulasi/pengeluaran) serta pelekatan dokumen pengeluaran gudang material matching 1 Heading Kerja.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi), Petugas Gudang",
        "features": [
          {
            "id": "monitoring-stok-entres",
            "name": "Monitoring Mutasi Stok Mata Entres"
          },
          {
            "id": "material-gudang-matching",
            "name": "Matching Material Dokumen Gudang"
          }
        ]
      },
      "feature": {
        "id": "material-gudang-matching",
        "name": "Matching Material Dokumen Gudang"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "09-material-bahan",
        "order": "09",
        "name": "Material & Bahan",
        "roleId": "mantri-bibitan",
        "subtitle": "Monitoring Stok Mata Entres & Dokumen Gudang",
        "desc": "Pengawasan saldo mutasi stok mata entres (+ panen terverifikasi, - okulasi/pengeluaran) serta pelekatan dokumen pengeluaran gudang material matching 1 Heading Kerja.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi), Petugas Gudang",
        "features": [
          {
            "id": "monitoring-stok-entres",
            "name": "Monitoring Mutasi Stok Mata Entres"
          },
          {
            "id": "material-gudang-matching",
            "name": "Matching Material Dokumen Gudang"
          }
        ]
      },
      "feature": {
        "id": "material-gudang-matching",
        "name": "Matching Material Dokumen Gudang"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "09-material-bahan",
        "order": "09",
        "name": "Material & Bahan",
        "roleId": "mantri-bibitan",
        "subtitle": "Monitoring Stok Mata Entres & Dokumen Gudang",
        "desc": "Pengawasan saldo mutasi stok mata entres (+ panen terverifikasi, - okulasi/pengeluaran) serta pelekatan dokumen pengeluaran gudang material matching 1 Heading Kerja.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi), Petugas Gudang",
        "features": [
          {
            "id": "monitoring-stok-entres",
            "name": "Monitoring Mutasi Stok Mata Entres"
          },
          {
            "id": "material-gudang-matching",
            "name": "Matching Material Dokumen Gudang"
          }
        ]
      },
      "feature": {
        "id": "material-gudang-matching",
        "name": "Matching Material Dokumen Gudang"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "09-material-bahan",
        "order": "09",
        "name": "Material & Bahan",
        "roleId": "mantri-bibitan",
        "subtitle": "Monitoring Stok Mata Entres & Dokumen Gudang",
        "desc": "Pengawasan saldo mutasi stok mata entres (+ panen terverifikasi, - okulasi/pengeluaran) serta pelekatan dokumen pengeluaran gudang material matching 1 Heading Kerja.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi), Petugas Gudang",
        "features": [
          {
            "id": "monitoring-stok-entres",
            "name": "Monitoring Mutasi Stok Mata Entres"
          },
          {
            "id": "material-gudang-matching",
            "name": "Matching Material Dokumen Gudang"
          }
        ]
      },
      "feature": {
        "id": "material-gudang-matching",
        "name": "Matching Material Dokumen Gudang"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "09-material-bahan",
        "order": "09",
        "name": "Material & Bahan",
        "roleId": "mantri-bibitan",
        "subtitle": "Monitoring Stok Mata Entres & Dokumen Gudang",
        "desc": "Pengawasan saldo mutasi stok mata entres (+ panen terverifikasi, - okulasi/pengeluaran) serta pelekatan dokumen pengeluaran gudang material matching 1 Heading Kerja.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi), Petugas Gudang",
        "features": [
          {
            "id": "monitoring-stok-entres",
            "name": "Monitoring Mutasi Stok Mata Entres"
          },
          {
            "id": "material-gudang-matching",
            "name": "Matching Material Dokumen Gudang"
          }
        ]
      },
      "feature": {
        "id": "material-gudang-matching",
        "name": "Matching Material Dokumen Gudang"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "09-material-bahan",
        "order": "09",
        "name": "Material & Bahan",
        "roleId": "mantri-bibitan",
        "subtitle": "Monitoring Stok Mata Entres & Dokumen Gudang",
        "desc": "Pengawasan saldo mutasi stok mata entres (+ panen terverifikasi, - okulasi/pengeluaran) serta pelekatan dokumen pengeluaran gudang material matching 1 Heading Kerja.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi), Petugas Gudang",
        "features": [
          {
            "id": "monitoring-stok-entres",
            "name": "Monitoring Mutasi Stok Mata Entres"
          },
          {
            "id": "material-gudang-matching",
            "name": "Matching Material Dokumen Gudang"
          }
        ]
      },
      "feature": {
        "id": "material-gudang-matching",
        "name": "Matching Material Dokumen Gudang"
      },
      "flowNodes": [],
      "businessRules": []
    },
    {
      "module": {
        "id": "09-material-bahan",
        "order": "09",
        "name": "Material & Bahan",
        "roleId": "mantri-bibitan",
        "subtitle": "Monitoring Stok Mata Entres & Dokumen Gudang",
        "desc": "Pengawasan saldo mutasi stok mata entres (+ panen terverifikasi, - okulasi/pengeluaran) serta pelekatan dokumen pengeluaran gudang material matching 1 Heading Kerja.",
        "status": "Confirmed",
        "primaryRole": "Mantri Bibitan",
        "relatedRole": "Asisten Bibitan (Verifikasi), Petugas Gudang",
        "features": [
          {
            "id": "monitoring-stok-entres",
            "name": "Monitoring Mutasi Stok Mata Entres"
          },
          {
            "id": "material-gudang-matching",
            "name": "Matching Material Dokumen Gudang"
          }
        ]
      },
      "feature": {
        "id": "material-gudang-matching",
        "name": "Matching Material Dokumen Gudang"
      },
      "flowNodes": [],
      "businessRules": []
    }
  ],
  "revisions": [],
  "references": {
    "endToEndPipeline": [
      {
        "step": "01",
        "name": "Login & Presensi",
        "role": "Mantri Bibitan",
        "target": "Validasi Kehadiran & Hak Akses",
        "impact": "Geofencing"
      },
      {
        "step": "02",
        "name": "Penerimaan Benih",
        "role": "Mantri Bibitan & Gudang",
        "target": "Penerimaan Biji Kelatak (Dokumen Gudang)",
        "impact": "+ Benih Masuk"
      },
      {
        "step": "03",
        "name": "Penyemaian Bedengan",
        "role": "Mantri Bibitan",
        "target": "1 Dokumen -> Multi Bedengan (±12–15 Hari)",
        "impact": "+ Populasi Bedengan"
      },
      {
        "step": "04",
        "name": "Transplanting Polybag",
        "role": "Mantri Bibitan",
        "target": "1 Polybag = 2 Benih/Bibit -> Konsolidasi Batch",
        "impact": "Terbentuk Batch"
      },
      {
        "step": "05",
        "name": "Kebun Entres",
        "role": "Mantri Bibitan",
        "target": "Menunas & Topping Plot Entres",
        "impact": "Rasio Perisai Tunas"
      },
      {
        "step": "06",
        "name": "Panen Mata Entres",
        "role": "Mantri Bibitan",
        "target": "Pemanenan Cabang -> Estimasi -> Aktual",
        "impact": "+ Stok Mata Entres"
      },
      {
        "step": "07",
        "name": "Okulasi (Grafting)",
        "role": "Mantri Bibitan",
        "target": "Penempelan Mata Entres ke Batch Bibit",
        "impact": "- Stok Mata Entres"
      },
      {
        "step": "08",
        "name": "Pemeriksaan Bertahap",
        "role": "Mantri Bibitan",
        "target": "Pemeriksaan Berkala: Berhasil vs Gagal",
        "impact": "Tindak Lanjut Dinamis"
      },
      {
        "step": "09",
        "name": "Regrafting (Okulasi Janda)",
        "role": "Mantri Bibitan",
        "target": "Okulasi Ulang Bibit Gagal (Dapat Berulang)",
        "impact": "- Stok Mata Entres"
      },
      {
        "step": "10",
        "name": "Penyeleksian Kualitas",
        "role": "Mantri & Asisten",
        "target": "Deklarasi Mantri -> Verifikasi Fisik Asisten",
        "impact": "- Populasi Batch (Sah)"
      },
      {
        "step": "11",
        "name": "Rekam Pemeliharaan",
        "role": "Mantri Bibitan",
        "target": "Heading Kerja Matching Dokumen Gudang Material",
        "impact": "Penggunaan Material"
      },
      {
        "step": "12",
        "name": "Pengeluaran Bibit & Entres",
        "role": "Mantri & Asisten",
        "target": "Distribusi Berdasarkan Permintaan (SPB/DO Approved)",
        "impact": "Selesai Siklus Nursery"
      }
    ],
    "commonFeatures": [
      {
        "id": "cf-login",
        "name": "Login",
        "icon": "👤",
        "desc": "Autentikasi kredensial pengguna terdaftar dengan validasi sesi aktif."
      },
      {
        "id": "cf-emergency",
        "name": "Emergency Mode",
        "icon": "⚠️",
        "desc": "Peralihan mode darurat saat gangguan sistem untuk kontinuitas pencatatan."
      },
      {
        "id": "cf-sync",
        "name": "Sinkronisasi",
        "icon": "🔄",
        "desc": "Sinkronisasi offline storage SQLite/IndexedDB ke Database Server Production."
      },
      {
        "id": "cf-vpn",
        "name": "Koneksi VPN",
        "icon": "🔒",
        "desc": "Aktivasi jalur jaringan aman (status: Connected) sebelum akses sistem."
      }
    ],
    "functionalRequirementsSummary": [
      {
        "id": "KF-001",
        "title": "Sistem harus menyediakan autentikasi dan pengelolaan sesi pengguna berdasarkan role dan kewenangan.",
        "category": "Authentication & Session",
        "type": "Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Pengguna dengan kredensial valid dapat masuk ke sistem, sesi pengguna terbentuk, dan akses yang diberikan sesuai role serta kewenangannya."
      },
      {
        "id": "KF-002",
        "title": "Sistem harus menyediakan akses fitur dan transaksi sesuai hak akses masing-masing pengguna.",
        "category": "Role & Access",
        "type": "Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Pengguna hanya dapat mengakses fitur dan transaksi yang sesuai dengan hak akses role yang diberikan."
      },
      {
        "id": "KF-003",
        "title": "Sistem harus mencatat seluruh transaksi operasional pembibitan karet secara terstruktur dan real-time.",
        "category": "Operational Transaction",
        "type": "Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Transaksi operasional pembibitan dapat dicatat secara terstruktur dan data transaksi tersedia pada sistem sesuai mekanisme real-time yang ditetapkan."
      },
      {
        "id": "KF-004",
        "title": "Sistem harus mendukung identifikasi dan validasi fisik petak, bedengan, dan batch bibitan melalui QR Code.",
        "category": "QR Identification",
        "type": "Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Sistem dapat membaca QR Code pada petak, bedengan, dan batch, kemudian memvalidasi objek yang teridentifikasi terhadap data sistem."
      },
      {
        "id": "KF-005",
        "title": "Sistem harus memfasilitasi dokumentasi foto lapangan dan pencatatan timestamp pada setiap tahapan kegiatan.",
        "category": "Documentation",
        "type": "Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Sistem dapat menyimpan dokumentasi foto dan timestamp pada setiap tahapan kegiatan yang mewajibkan dokumentasi."
      },
      {
        "id": "KF-006",
        "title": "Sistem harus menerapkan validasi ambang batas dan verifikasi multi-level sebelum transaksi disahkan.",
        "category": "Validation & Verification",
        "type": "Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Sistem menjalankan validasi sebelum transaksi disahkan dan transaksi dapat melalui proses verifikasi multi-level sesuai kewenangan yang ditetapkan."
      },
      {
        "id": "KF-007",
        "title": "Sistem harus menyediakan alur persetujuan (approval/rejection) berjenjang dari verifikator (Asisten/Pimpinan).",
        "category": "Approval",
        "type": "Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Sistem dapat menjalankan proses approval maupun rejection sesuai alur dan kewenangan verifikator yang ditetapkan."
      },
      {
        "id": "KF-008",
        "title": "Sistem harus dapat beroperasi secara offline di area lapangan tanpa koneksi internet dengan penyimpanan lokal aman.",
        "category": "Offline Operation",
        "type": "Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Fungsi esensial yang mendukung operasional lapangan tetap dapat digunakan tanpa koneksi internet dan data tersimpan secara lokal dengan aman."
      },
      {
        "id": "KF-009",
        "title": "Sistem harus melakukan sinkronisasi otomatis dan rekonsiliasi data lokal ke server pusat saat koneksi tersedia.",
        "category": "Synchronization",
        "type": "Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Sistem dapat melakukan sinkronisasi data lokal ke server pusat ketika koneksi tersedia dan menjalankan rekonsiliasi sesuai mekanisme sinkronisasi yang ditetapkan."
      },
      {
        "id": "KF-010",
        "title": "Sistem harus mengkalkulasi mutasi stok material, entres, dan populasi bibit hidup secara otomatis dan akurat.",
        "category": "Stock / Population",
        "type": "Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Sistem dapat menghitung mutasi stok material, entres, dan populasi bibit hidup berdasarkan transaksi yang sah dan menghasilkan nilai yang akurat serta konsisten dengan transaksi sumber."
      },
      {
        "id": "KF-011",
        "title": "Sistem harus memberikan notifikasi dan peringatan dini atas anomali proses atau penolakan verifikasi.",
        "category": "Notification",
        "type": "Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Sistem memberikan notifikasi atau peringatan ketika ditemukan anomali proses atau transaksi mengalami penolakan verifikasi."
      },
      {
        "id": "KF-012",
        "title": "Sistem harus menghasilkan rekapitulasi data dan laporan performa proses bisnis pembibitan sesuai format standar.",
        "category": "Reporting",
        "type": "Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Sistem dapat menghasilkan rekapitulasi data dan laporan performa proses pembibitan sesuai format standar yang ditetapkan."
      },
      {
        "id": "KF-013",
        "title": "Sistem harus mencatat jejak audit (audit trail) yang tidak dapat dimanipulasi untuk setiap perubahan data.",
        "category": "Audit Trail",
        "type": "Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Sistem mencatat aktivitas perubahan data beserta identitas dan waktu aktivitas, dan audit trail tidak dapat diubah atau dimanipulasi secara tidak sah."
      },
      {
        "id": "KF-014",
        "title": "Sistem harus mendukung integrasi data dengan database ledger dan sistem ERP korporasi SOCFIN.",
        "category": "Integration",
        "type": "Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Sistem dapat melakukan pertukaran data dengan database ledger dan sistem ERP korporasi SOCFIN sesuai mekanisme integrasi yang ditetapkan."
      }
    ],
    "nonFunctionalRequirementsSummary": [
      {
        "id": "KNF-001",
        "title": "Sistem harus memiliki antarmuka yang sederhana, konsisten, dan mudah digunakan oleh personel operasional lapangan.",
        "category": "Usability",
        "type": "Non-Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Pengguna operasional dapat menjalankan fungsi utama sistem dengan antarmuka yang konsisten, sederhana, dan mudah dipahami."
      },
      {
        "id": "KNF-002",
        "title": "Waktu respon aplikasi untuk transaksi input dan pemindaian QR Code tidak boleh melebihi 2 detik.",
        "category": "Performance",
        "type": "Non-Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Waktu respon transaksi input dan pemindaian QR Code tidak melebihi 2 detik pada kondisi pengujian yang memenuhi spesifikasi sistem."
      },
      {
        "id": "KNF-003",
        "title": "Sistem harus mempertahankan ketersediaan fungsi esensial 100% saat tidak terdapat koneksi jaringan di kebun.",
        "category": "Offline & Connectivity",
        "type": "Non-Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Seluruh fungsi esensial yang ditetapkan untuk mode offline tetap tersedia dan dapat digunakan ketika koneksi jaringan tidak tersedia."
      },
      {
        "id": "KNF-004",
        "title": "Sistem harus menjaga integritas dan konsistensi data selama proses input, penyimpanan, sinkronisasi, dan integrasi.",
        "category": "Data Integrity",
        "type": "Non-Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Tidak terjadi kehilangan, duplikasi, perubahan tidak sah, atau inkonsistensi data selama input, penyimpanan, sinkronisasi, dan integrasi."
      },
      {
        "id": "KNF-005",
        "title": "Seluruh data kredensial dan transmisi komunikasi data harus dienkripsi dengan standar keamanan industri.",
        "category": "Security",
        "type": "Non-Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Data kredensial dan transmisi komunikasi data terlindungi menggunakan mekanisme enkripsi sesuai standar keamanan industri yang ditetapkan."
      },
      {
        "id": "KNF-006",
        "title": "Sistem harus memiliki keandalan tinggi (high availability) dengan mekanisme toleransi kesalahan dan auto-recovery.",
        "category": "Reliability",
        "type": "Non-Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Sistem dapat menangani gangguan dengan mekanisme toleransi kesalahan dan auto-recovery sesuai rancangan teknis yang ditetapkan."
      },
      {
        "id": "KNF-007",
        "title": "Arsitektur data harus mampu menangani pertumbuhan volume transaksi dan populasi bibitan tahunan tanpa degradasi performa.",
        "category": "Scalability",
        "type": "Non-Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Sistem dapat menangani pertumbuhan volume transaksi dan populasi bibitan tahunan tanpa degradasi performa yang melampaui batas yang ditetapkan."
      },
      {
        "id": "KNF-008",
        "title": "Kode dan struktur modul harus modular, terdokumentasi, dan mudah dipelihara atau dikembangkan di masa depan.",
        "category": "Maintainability",
        "type": "Non-Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Kode dan struktur modul memiliki dokumentasi yang memadai, bersifat modular, dan dapat dipelihara atau dikembangkan tanpa mengganggu fungsi yang sudah berjalan."
      },
      {
        "id": "KNF-009",
        "title": "Seluruh perubahan status, revisi data, dan aksi pengguna harus dapat dilacak dan diaudit secara independen.",
        "category": "Auditability",
        "type": "Non-Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Seluruh perubahan status, revisi data, dan aksi pengguna dapat ditelusuri melalui audit trail dan dapat diperiksa secara independen oleh pihak yang berwenang."
      },
      {
        "id": "KNF-010",
        "title": "Aplikasi harus kompatibel dengan perangkat mobile Android lapangan standar dan browser modern.",
        "category": "Compatibility",
        "type": "Non-Functional",
        "status": "Confirmed",
        "version": 1,
        "revision": "v1.0",
        "acceptance": "Aplikasi dapat digunakan pada perangkat Android lapangan yang memenuhi spesifikasi standar dan browser modern yang didukung oleh sistem."
      }
    ]
  }
}
```

## 5. Export Verification & Integrity

- **Payload Format:** JSON UTF-8 Embedded
- **Total JSON Characters:** 594,643
- **SHA-256 Checksum:** 3fcef5b662160f3232324b29dfe7e32b9e644806281a7cbeafd63fd6603cea3b
