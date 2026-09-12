# KLON SCHEMA COMPARISON — SIGMA RUBBER NURSERY

**Phase:** Phase 9J — Audit Konsistensi Data Klon Lintas Modul Transaksi  
**Status:** AUDIT ONLY (READ-ONLY)  
**Date:** 2026-09-12  

Dokumen ini membandingkan struktur skema field Klon pada seluruh payload transaksi dan state runtime.

---

## 1. Perbandingan Skema Field Antar Modul

| Modul | Nama Field Klon | Tipe Data | Struktur Penyimpanan | Sifat (Req/Opt) | Contoh Nilai Payload | Dampak Kompatibilitas |
|:---|:---|:---|:---|:---:|:---|:---|
| **Penerimaan (Receipt)** | `klon` | String | Flat field pada root transaksi & item tabel | Required | `klon: "PB 260"` atau `klon: "GT1"` | Nilai plain string langsung disimpan ke storage `receipt_transactions`. |
| **Penerimaan (Table Rows)** | `tableRows[].klon` | String | Array of objects per baris penerimaan | Optional / Required baris | `tableRows: [{ klon: "IRCA120", qty: 500, rejected: 10 }]` | Tiap baris tabel penerimaan menyimpan string klon spesifik. |
| **Penyemaian (Seeding)** | `klonAwal` | String | Flat field pada root transaksi (klon asal) | Required | `klonAwal: "GT-01"` | Menyimpan identitas klon rootstock batch semai. |
| **Penyemaian (Bedengan)** | `tableRows[].klon` | String | Array of objects per alokasi bedengan | Required | `tableRows: [{ bedengan: "Bedengan 01", klon: "GT-01", disemai: 1000 }]` | Menyimpan klon per nomor bedengan. |
| **Okulasi (Grafting)** | `klonRootstock` | String | Flat field root transaksi | Required | `klonRootstock: "GT-01"` | Klon batang bawah (diambil dari batch semai). |
| **Okulasi (Grafting)** | `klonEntres` | String | Flat field root transaksi | Required | `klonEntres: "PB 260"` | Klon mata entres okulasi. |
| **Okulasi Janda (Regraft)** | `klonAwal` | String | Flat field root transaksi | Required | `klonAwal: "IRCA 19"` | Klon okulasi pertama yang gagal tumbuh. |
| **Okulasi Janda (Regraft)** | `klonEntres` | String | Flat field root transaksi | Required | `klonEntres: "PB 260"` | Klon okulasi baru (regrafting). |
| **Pemeriksaan (Inspection)** | `klonEntres` & `klonRootstock` | String | Flat fields root transaksi | Required | `klonEntres: "PB 260", klonRootstock: "GT-01"` | Mengkopi snapshot klon dari data okulasi yang diperiksa. |
| **Penyeleksian (Afkir)** | `klon` | String | Flat field root transaksi | Required | `klon: "PB 260"` | Klon bibit yang diafkir dari selection pool. |
| **Kebun Entres (Topping)** | `namaKlon` & `kodePlot` | String | Flat fields root transaksi | Required | `namaKlon: "PB 260", kodePlot: "PLOT-ENT-01"` | Menghubungkan klon dengan plot kebun entres. |
| **Kebun Entres (Menunas)** | `namaKlon` & `kodePlot` | String | Flat fields root transaksi | Required | `namaKlon: "PB 260", kodePlot: "PLOT-ENT-01"` | Menghubungkan klon dengan plot kebun entres. |
| **Permintaan (SPB Kebun Sepupu)** | `klon` | String | Flat field root transaksi | Required | `klon: "PB 260"` | Klon pesanan bibit siap salur. |
| **Riwayat Data (History)** | `klon`, `rootstockKlon`, `latestOkulasiKlon`, `klonPopulations[]` | String & Array of Objects | Agregasi terkomputasi | Read-Only | `klonPopulations: [{ klon: "PB 260", type: "Okulasi Pokok", qty: 1500 }]` | Mengagregasi stok populasi klon dinamis dari seluruh tahapan. |

---

## 2. Analisis Perbedaan Kunci Skema

1. **Variasi Nama Field untuk Konsep yang Sama**:
   - Batang Bawah: `klon` vs `klonAwal` vs `klonRootstock`
   - Mata Entres: `klonEntres` vs `namaKlon` vs `klon`
   - Bibit Jadi: `klon` vs `klonEntres` vs `namaKlon`
2. **Tidak Ada ID Klon di Snapshot Transaksi**:
   - Seluruh modul transaksi (`receipt`, `seeding`, `budding`, `inspection`, `selection`, `entres`, `request`) menyimpan nilai klon sebagai **string literal** (bukan foreign key ID).
   - Ini merupakan pola desain snapshot historis yang sangat aman dari kerusakan relasional jika ID berubah di kemudian hari.
