# KLON VALUE INVENTORY — SIGMA RUBBER NURSERY

**Phase:** Phase 9J — Audit Konsistensi Data Klon Lintas Modul Transaksi  
**Status:** AUDIT ONLY (READ-ONLY)  
**Date:** 2026-09-12  

Dokumen ini menginventarisasi seluruh nilai (values) Klon yang ditemukan di seluruh codebase SIGMA Rubber Nursery tanpa melakukan penggabungan data.

---

## 1. Inventaris Nilai Klon & Pemetaan Sumber

| No | Nilai Klon (Asli) | Sumber File Asal | Modul Pengguna | Format Gaya | Status Konsistensi | Keterangan / Kandidat Duplikasi |
|:---|:---|:---|:---|:---|:---|:---|
| 1 | `PB 260` | `master-data.js`, `demo-data.js`, `budding-form.js`, `entres`, `request-form`, `history.js`, `review.js` | Budding, Entres, SPB, History, Review | Spaced | `FORMAT_INCONSISTENCY` | Identik dengan `PB260` dan `PB-260` |
| 2 | `PB260` | `receipt-sir.js`, `receipt-benih.js`, `selection-landing.js` | Penerimaan, Afkir | Condensed | `FORMAT_INCONSISTENCY` | Format condensed tanpa spasi |
| 3 | `PB-260` | `seeding-form.js` | Penyemaian | Hyphenated | `FORMAT_INCONSISTENCY` | Format dengan tanda hubung |
| 4 | `GT 1` | `master-data.js`, `demo-data.js`, `request-form`, `review.js`, `transactions.js` | SPB, Review, Master | Spaced | `FORMAT_INCONSISTENCY` | Identik dengan `GT1` dan `GT-01` |
| 5 | `GT1` | `receipt-sir.js`, `receipt-benih.js`, `budding-scan.js`, `inspection-scan.js` | Penerimaan, Budding Scan | Condensed | `FORMAT_INCONSISTENCY` | Format condensed tanpa spasi |
| 6 | `GT-01` | `seeding-form.js`, `seeding-scan.js`, `budding-form.js`, `inspection-form.js`, `history.js` | Penyemaian, Budding (Rootstock) | Hyphenated | `FORMAT_INCONSISTENCY` | Menggunakan leading zero dan hyphen |
| 7 | `RRIM 600` | `master-data.js`, `demo-data.js`, `request-form`, `transactions.js` | SPB, Master, Transaksi | Spaced | `FORMAT_INCONSISTENCY` | Identik dengan `RRIM600` dan `RRIM-600` |
| 8 | `RRIM600` | `receipt-sir.js` | Penerimaan SIR | Condensed | `FORMAT_INCONSISTENCY` | Format condensed |
| 9 | `RRIM-600` | `seeding-form.js` | Penyemaian | Hyphenated | `FORMAT_INCONSISTENCY` | Format hyphen |
| 10 | `PB 330` | `budding-form.js`, `entres` (Plot 05) | Budding, Kebun Entres | Spaced | `FORMAT_INCONSISTENCY` | Identik dengan `PB330` dan `PB-330` |
| 11 | `PB330` | `receipt-sir.js` | Penerimaan SIR | Condensed | `FORMAT_INCONSISTENCY` | Format condensed |
| 12 | `PB-330` | `seeding-form.js` | Penyemaian | Hyphenated | `FORMAT_INCONSISTENCY` | Format hyphen |
| 13 | `PB 235` / `PB235` / `PB-235` | `seeding-form.js`, `receipt-sir.js` | Penyemaian, Penerimaan SIR | Spaced/Condensed/Hyphen | `FORMAT_INCONSISTENCY` | Ditemukan dalam 3 variasi format |
| 14 | `IRR 300` / `IRR300` / `IRR-300` | `seeding-form.js`, `receipt-benih.js`, `history.js`, `selection-landing.js` | Penyemaian, Penerimaan Benih, Afkir | Spaced/Condensed/Hyphen | `FORMAT_INCONSISTENCY` | Ditemukan dalam 3 variasi format |
| 15 | `BPM 24` / `BPM24` / `BPM-24` | `seeding-form.js`, `receipt-sir.js` | Penyemaian, Penerimaan SIR | Spaced/Condensed/Hyphen | `FORMAT_INCONSISTENCY` | Ditemukan dalam 3 variasi format |
| 16 | `PR 261` / `PR-261` | `seeding-form.js` | Penyemaian | Hyphenated | `SAFE_TO_FIX_LATER` | Hanya di penyemaian |
| 17 | `IRR 215` | `budding-form.js`, `history.js` | Okulasi, Riwayat | Spaced | `CONSISTENT` | Format standar spaced |
| 18 | `RRIM 911` / `RRIM911` | `budding-form.js`, `entres` (Plot 04), `receipt-sir.js` | Okulasi, Kebun Entres, SIR | Spaced & Condensed | `FORMAT_INCONSISTENCY` | Spaced vs Condensed |
| 19 | `IRCA 317` / `IRCA317` | `budding-form.js`, `receipt-sir.js` | Okulasi, Penerimaan SIR | Spaced & Condensed | `FORMAT_INCONSISTENCY` | Spaced vs Condensed |
| 20 | `IRR 100` | `budding-form.js` | Okulasi | Spaced | `SAFE_TO_FIX_LATER` | Hanya di budding-form |
| 21 | `IRR 112` / `IRR112` | `budding-form.js`, `entres` (Plot 03), `receipt-sir.js` | Okulasi, Kebun Entres, SIR | Spaced & Condensed | `FORMAT_INCONSISTENCY` | Spaced vs Condensed |
| 22 | `RRIM 712` / `RRIM712` | `budding-form.js`, `receipt-sir.js` | Okulasi, Penerimaan SIR | Spaced & Condensed | `FORMAT_INCONSISTENCY` | Spaced vs Condensed |
| 23 | `PB 340` / `PB340` | `budding-form.js`, `receipt-sir.js` | Okulasi, Penerimaan SIR | Spaced & Condensed | `FORMAT_INCONSISTENCY` | Spaced vs Condensed |
| 24 | `IRR 104` / `IRR104` | `budding-form.js`, `entres` (Plot 06), `receipt-sir.js` | Okulasi, Kebun Entres, SIR | Spaced & Condensed | `FORMAT_INCONSISTENCY` | Spaced vs Condensed |
| 25 | `IRR 207` / `IRR207` | `budding-form.js`, `receipt-sir.js` | Okulasi, Penerimaan SIR | Spaced & Condensed | `FORMAT_INCONSISTENCY` | Spaced vs Condensed |
| 26 | `PB 217` / `PB217` | `budding-form.js`, `receipt-sir.js` | Okulasi, Penerimaan SIR | Spaced & Condensed | `FORMAT_INCONSISTENCY` | Spaced vs Condensed |
| 27 | `IRR 118` / `IRR118` | `budding-form.js`, `receipt-sir.js` | Okulasi, Penerimaan SIR | Spaced & Condensed | `FORMAT_INCONSISTENCY` | Spaced vs Condensed |
| 28 | `IRR 219` | `budding-form.js` | Okulasi | Spaced | `SAFE_TO_FIX_LATER` | Hanya di budding-form |
| 29 | `IRR 220` / `IRR220` | `budding-form.js`, `receipt-sir.js` | Okulasi, Penerimaan SIR | Spaced & Condensed | `FORMAT_INCONSISTENCY` | Spaced vs Condensed |
| 30 | `IRCA 19` / `IRCA19` | `budding-form.js`, `entres` (Plot 02), `receipt-sir.js`, `regraft-test` | Okulasi, Kebun Entres, SIR, Test | Spaced & Condensed | `FORMAT_INCONSISTENCY` | Spaced vs Condensed |
| 31 | `IRR 107` | `budding-form.js` | Okulasi | Spaced | `SAFE_TO_FIX_LATER` | Hanya di budding-form |
| 32 | `IRCA 101` / `IRCA101` | `budding-form.js`, `receipt-sir.js`, `regraft-test` | Okulasi, Penerimaan SIR, Test | Spaced & Condensed | `FORMAT_INCONSISTENCY` | Spaced vs Condensed |
| 33 | `IRR 221` / `IRR221` | `budding-form.js`, `receipt-sir.js` | Okulasi, Penerimaan SIR | Spaced & Condensed | `FORMAT_INCONSISTENCY` | Spaced vs Condensed |
| 34 | `IRCA120` | `receipt-benih.js` | Penerimaan Benih Dropdown | Condensed | `NEEDS_REQUIREMENT_REVIEW` | Hanya di benih form |
| 35 | Klon SIR Tambahan (40+ klon condensed) | `receipt-sir.js` (e.g. `CYT577`, `IRCA1007`, `IRCA109`, `IRCA111`, `IRCA130`, `IRCA18`, `IRCA230`, `IRCA331`, `IRCA41`, `IRCA427`, `IRCA733`, `IRCA804`, `IRCA807`, `IRCA825`, `IRCA986`, `IRR205`, `IRR206`, `IRR208`, `IRR230`, `IRR425`, `IRR428`, `IRR429`, `IRR434`, `IRR440`, `IRR5`, `LBT94`, `PB254`, `PC10`, `PM10`, `PR107`, `PR300`, `RRIC100`, `RRIM2020`, `RRIM703`, `RRIM901`, `RRIM908`, `RRIM921`) | Penerimaan SIR | Condensed | `NEEDS_REQUIREMENT_REVIEW` | Klon katalog SIR |

---

## 2. Analisis Pola Ketidakkonsistenan

1. **Format Tanda Baca & Spasi (Spacing/Hyphenation)**:
   - `PB 260` vs `PB-260` vs `PB260`
   - `GT 1` vs `GT-01` vs `GT1`
   - `RRIM 600` vs `RRIM-600` vs `RRIM600`
   - `IRR 112` vs `IRR112`
   - `IRCA 19` vs `IRCA19`
2. **Format Leading Zero**:
   - `GT 1` vs `GT-01` (pada rootstock / batang bawah)
3. **Katalog Klon Tidak Sinkron**:
   - Modul SPB / Master Data hanya menyediakan 3 klon.
   - Modul Penyemaian menyediakan 8 klon.
   - Modul Okulasi menyediakan 19 klon.
   - Modul Kebun Entres menyediakan 6 klon.
   - Modul Penerimaan SIR menyediakan 57 klon.
