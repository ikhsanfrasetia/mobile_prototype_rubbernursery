# SIGMA RUBBER NURSERY — PROCESS FLOW SPECIFICATION FINAL

**Version:** 1.0.0  
**Baseline Date:** 7 September 2026  
**Status:** FINAL / FOR REVIEW  
**Total Modul:** 11 Modules  
**Total Fitur Bisnis:** 21 Features  
**Total Active Nodes:** 175 Nodes  
**Total Active Edges:** 156 Edges  
**Total Cross-Flow Edges:** 5 Canonical Edges  

---

## 1. Canonical Cross-Flow Edges (CFE)

| CFE ID | Alur Asal (Source) | Alur Tujuan (Target) | Tujuan Integrasi Bisnis | Requirement Terkait |
| :---: | :--- | :--- | :--- | :--- |
| **`CFE-01`** | Penerimaan Benih Kelatak (`02-penerimaan`) | Penyemaian Biji Bedengan (`03-penyemaian`) | Alokasi benih lolos QC ke bedengan semai | `RN-RCV-006`, `RN-SEM-001` |
| **`CFE-02`** | Transplanting Polybag (`03-penyemaian`) | Okulasi Grafting Utama (`04-okulasi`) | Penyerahan batch seedling siap okulasi | `RN-SEM-TP036`, `RN-OKL-001` |
| **`CFE-03`** | Panen Kayu Entres (`08-panen-mata-entres`) | Okulasi Grafting Utama (`04-okulasi`) | Suplai kayu mata entres klonal murni | `RN-ENT-008`, `RN-OKL-002` |
| **`CFE-04`** | Pemeriksaan Okulasi (`05-pemeriksaan`) | Okulasi Regrafting (`04-okulasi`) | Pengalihan bibit gagal ke alur tempel ulang | `RN-OKL-018`, `BR-OKL-006` |
| **`CFE-05`** | Pengeluaran Bibit SPB (`11-pengeluaran`) | Penerimaan & Tanam Divisi (`11-pengeluaran`) | Verifikasi fisik & plotting polygon tanam | `RN-EXP-008`, `RN-EXP-004` |

---

## 2. Alur Proses per Modul & Fitur

### Modul 01: Presensi (`01-presensi`)
**Peran Utama:** Mantri Bibitan | **Peran Terkait:** Asisten Bibitan

#### Fitur: Presensi Supervisor (`presensi-supervisor`)

#### Fitur: Presensi Pekerja Bibitan (`presensi-pekerja`)


### Modul 02: Penerimaan (`02-penerimaan`)
**Peran Utama:** Mantri Bibitan | **Peran Terkait:** Asisten Bibitan, Asisten Divisi, Asisten Kepala

#### Fitur: Penerimaan Benih / Biji Kelatak (`terima-benih`)

#### Fitur: Penerimaan Bibit - Kebun Sendiri (`terima-kebun-sendiri`)

#### Fitur: Penerimaan Bibit - Kebun Sepupu (`terima-kebun-sepupu`)

#### Fitur: Penerimaan Mata Entres (`terima-mata-entres`)


### Modul 03: Penyemaian (`03-penyemaian`)
**Peran Utama:** Mantri Bibitan | **Peran Terkait:** Asisten Bibitan (Verifikasi)

#### Fitur: Penyemaian ke Bedengan (`semai-bedengan`)

#### Fitur: Transplanting ke Polybag (Batch) (`transplanting-polybag`)


### Modul 04: Okulasi (`04-okulasi`)
**Peran Utama:** Mantri Bibitan | **Peran Terkait:** Asisten Bibitan (Verifikasi)

#### Fitur: Grafting (Okulasi Utama) (`grafting`)

#### Fitur: Okulasi Janda / Regrafting (`regrafting`)


### Modul 05: Pemeriksaan (`05-pemeriksaan`)
**Peran Utama:** Mantri Bibitan | **Peran Terkait:** Asisten Bibitan (Verifikasi)

#### Fitur: Pemeriksaan Bertahap Grafting (`periksa-grafting`)

#### Fitur: Pemeriksaan Regrafting (`periksa-regrafting`)


### Modul 06: Penyeleksian (`06-penyeleksian`)
**Peran Utama:** Mantri Bibitan | **Peran Terkait:** Asisten Bibitan (Pemeriksaan Fisik & Verifikasi)

#### Fitur: Seleksi Kualitas Bibit Batch (`seleksi-batch`)


### Modul 07: Kebun Entres (`07-kebun-entres`)
**Peran Utama:** Mantri Bibitan | **Peran Terkait:** Asisten Bibitan (Verifikasi)

#### Fitur: Menunas Plot Entres (`entres-menunas`)

#### Fitur: Topping Plot Entres (`entres-topping`)


### Modul 08: Panen Mata Entres (`08-panen-mata-entres`)
**Peran Utama:** Mantri Bibitan | **Peran Terkait:** Asisten Bibitan (Verifikasi)

#### Fitur: Panen Mata Entres (`panen-entres`)


### Modul 09: Material & Bahan (`09-material-bahan`)
**Peran Utama:** Mantri Bibitan | **Peran Terkait:** Asisten Bibitan (Verifikasi), Petugas Gudang

#### Fitur: Monitoring Mutasi Stok Mata Entres (`monitoring-stok-entres`)

#### Fitur: Matching Material Dokumen Gudang (`material-gudang-matching`)


### Modul 10: Rekam Pemeliharaan (`10-rekam-pemeliharaan`)
**Peran Utama:** Mantri Bibitan | **Peran Terkait:** Asisten Bibitan (Verifikasi)

#### Fitur: Rekam Aktivitas Pemeliharaan (`pemeliharaan-heading`)


### Modul 11: Pengeluaran (`11-pengeluaran`)
**Peran Utama:** Mantri Bibitan | **Peran Terkait:** Asisten Bibitan, Asisten Divisi Peminta, Pengurus

#### Fitur: Pengeluaran Bibit (SPB Disetujui) (`pengeluaran-bibit`)

#### Fitur: Pengeluaran Mata Entres (`pengeluaran-mata-entres`)

