# SIGMA RUBBER NURSERY — REQUIREMENTS TRACEABILITY MATRIX (RTM) FINAL

**Version:** 1.0.0  
**Baseline Date:** 7 September 2026  
**Status:** FINAL / FOR REVIEW  
**Coverage Rate:** 172 / 172 (100.00% Zero Gap)  

| No | Requirement ID | Peran | Modul | Fitur | Flow Node | Business Rule | Trace Status |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| 1 | `RN-PRS-001` | Mantri Bibitan | Presensi | Presensi Supervisor | `START` | `BR-GLB-001, BR-PRS-001` | ✅ Covered |
| 2 | `RN-PRS-002` | Mantri Bibitan | Presensi | Presensi Supervisor | `P-001` | `BR-PRS-001` | ✅ Covered |
| 3 | `RN-PRS-003` | Mantri Bibitan | Presensi | Presensi Supervisor | `P-002` | `BR-PRS-003` | ✅ Covered |
| 4 | `RN-PRS-005` | Mantri Bibitan | Presensi | Presensi Supervisor | `FB-001, P-003` | `BR-GLB-001, BR-PRS-003` | ✅ Covered |
| 5 | `RN-PRS-006` | Mantri Bibitan | Presensi | Presensi Supervisor | `P-004` | `BR-GLB-001` | ✅ Covered |
| 6 | `RN-PRS-007` | Mantri Bibitan | Presensi | Presensi Supervisor | `END` | `BR-PRS-001` | ✅ Covered |
| 7 | `RN-PWP-001` | Mantri Bibitan | Presensi | Presensi Pekerja Bibitan | `START` | `BR-PRS-001` | ✅ Covered |
| 8 | `RN-PWP-002` | Mantri Bibitan | Presensi | Presensi Pekerja Bibitan | `P-001` | `BR-GLB-001` | ✅ Covered |
| 9 | `RN-PWP-003` | Mantri Bibitan | Presensi | Presensi Pekerja Bibitan | `P-002` | `BR-GLB-001` | ✅ Covered |
| 10 | `RN-PWP-004` | Mantri Bibitan | Presensi | Presensi Pekerja Bibitan | `P-003` | `BR-GLB-002` | ✅ Covered |
| 11 | `RN-PWP-005` | Mantri Bibitan | Presensi | Presensi Pekerja Bibitan | `END` | `BR-GLB-003` | ✅ Covered |
| 12 | `RN-RCV-002` | Mantri Bibitan | Penerimaan | Penerimaan Benih / Biji Kelatak | `START` | `BR-GLB-001` | ✅ Covered |
| 13 | `RN-RCV-003` | Mantri Bibitan | Penerimaan | Penerimaan Benih / Biji Kelatak | `P-003` | `BR-GLB-001` | ✅ Covered |
| 14 | `RN-RCV-004` | Mantri Bibitan | Penerimaan | Penerimaan Benih / Biji Kelatak | `P-004` | `BR-GLB-001` | ✅ Covered |
| 15 | `RN-RCV-005` | Asisten Bibitan | Penerimaan | Penerimaan Benih / Biji Kelatak | `P-005` | `BR-GLB-002` | ✅ Covered |
| 16 | `RN-RCV-006` | Mantri Bibitan | Penerimaan | Penerimaan Benih / Biji Kelatak | `END` | `BR-GLB-003, BR-SEM-001` | ✅ Covered |
| 17 | `RN-RCV-KS01` | Asisten Divisi | Penerimaan | Penerimaan Bibit - Kebun Sendiri | `CR-001` | `BR-GLB-002` | ✅ Covered |
| 18 | `RN-RCV-KS02` | Asisten Kepala | Penerimaan | Penerimaan Bibit - Kebun Sendiri | `CR-002` | `BR-GLB-002` | ✅ Covered |
| 19 | `RN-RCV-KS03` | Asisten Kepala | Penerimaan | Penerimaan Bibit - Kebun Sendiri | `CR-003` | `BR-GLB-002` | ✅ Covered |
| 20 | `RN-RCV-KS04` | Mantri Bibitan | Penerimaan | Penerimaan Bibit - Kebun Sendiri | `CR-004` | `BR-GLB-001` | ✅ Covered |
| 21 | `RN-RCV-KS05` | Asisten Divisi | Penerimaan | Penerimaan Bibit - Kebun Sendiri | `CR-005` | `BR-GLB-001` | ✅ Covered |
| 22 | `RN-RCV-KS06` | Asisten Divisi | Penerimaan | Penerimaan Bibit - Kebun Sendiri | `END` | `BR-GLB-003` | ✅ Covered |
| 23 | `RN-SEM-001` | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | `START` | `BR-SEM-001` | ✅ Covered |
| 24 | `RN-SEM-002` | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | `P-001` | `BR-OKL-002` | ✅ Covered |
| 25 | `RN-SEM-003` | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | `P-002` | `BR-SEM-001` | ✅ Covered |
| 26 | `RN-SEM-004` | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | `P-003` | `BR-GLB-001` | ✅ Covered |
| 27 | `RN-SEM-005` | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | `P-004` | `BR-GLB-002` | ✅ Covered |
| 28 | `RN-SEM-006` | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | `P-005` | `BR-SEM-006` | ✅ Covered |
| 29 | `RN-SEM-007` | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | `P-006` | `BR-SEM-007` | ✅ Covered |
| 30 | `RN-SEM-008` | Mantri Bibitan | Penyemaian | Penyemaian ke Bedengan | `END` | `BR-GLB-003` | ✅ Covered |
| 31 | `RN-OKL-001` | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | `START` | `BR-OKL-001` | ✅ Covered |
| 32 | `RN-OKL-002` | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | `P-002` | `BR-OKL-002` | ✅ Covered |
| 33 | `RN-OKL-003` | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | `P-003` | `BR-OKL-001` | ✅ Covered |
| 34 | `RN-OKL-004` | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | `P-004` | `BR-OKL-001` | ✅ Covered |
| 35 | `RN-OKL-005` | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | `P-005` | `BR-OKL-005` | ✅ Covered |
| 36 | `RN-OKL-006` | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | `P-006` | `BR-OKL-006` | ✅ Covered |
| 37 | `RN-OKL-007` | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | `P-007` | `BR-OKL-007` | ✅ Covered |
| 38 | `RN-OKL-008` | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | `P-008` | `BR-OKL-006` | ✅ Covered |
| 39 | `RN-OKL-009` | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | `P-009` | `BR-OKL-006` | ✅ Covered |
| 40 | `RN-OKL-010` | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | `P-010` | `BR-OKL-006` | ✅ Covered |
| 41 | `RN-OKL-011` | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | `P-011` | `BR-GLB-001` | ✅ Covered |
| 42 | `RN-OKL-012` | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | `P-012` | `BR-GLB-002` | ✅ Covered |
| 43 | `RN-OKL-013` | Asisten Bibitan | Okulasi | Grafting (Okulasi Utama) | `P-013` | `BR-GLB-002` | ✅ Covered |
| 44 | `RN-OKL-014` | Sistem Database | Okulasi | Grafting (Okulasi Utama) | `P-014` | `BR-OKL-007` | ✅ Covered |
| 45 | `RN-OKL-015` | Mantri Bibitan | Okulasi | Grafting (Okulasi Utama) | `END` | `BR-GLB-003` | ✅ Covered |
| 46 | `RN-REG-000` | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | `START` | `BR-OKL-008` | ✅ Covered |
| 47 | `RN-REG-001` | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | `P-001` | `BR-OKL-008` | ✅ Covered |
| 48 | `RN-REG-002` | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | `P-002` | `BR-OKL-002` | ✅ Covered |
| 49 | `RN-REG-003` | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | `P-003` | `BR-OKL-008` | ✅ Covered |
| 50 | `RN-REG-004` | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | `P-004` | `BR-OKL-001` | ✅ Covered |
| 51 | `RN-REG-005` | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | `P-005` | `BR-OKL-005` | ✅ Covered |
| 52 | `RN-REG-006` | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | `P-006` | `BR-OKL-006` | ✅ Covered |
| 53 | `RN-REG-007` | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | `P-007` | `BR-GLB-001` | ✅ Covered |
| 54 | `RN-REG-008` | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | `P-008` | `BR-GLB-002` | ✅ Covered |
| 55 | `RN-REG-009` | Asisten Bibitan | Okulasi | Okulasi Janda / Regrafting | `P-009` | `BR-GLB-002` | ✅ Covered |
| 56 | `RN-REG-010` | Sistem Database | Okulasi | Okulasi Janda / Regrafting | `P-010` | `BR-OKL-007` | ✅ Covered |
| 57 | `RN-REG-011` | Mantri Bibitan | Okulasi | Okulasi Janda / Regrafting | `END` | `BR-GLB-003` | ✅ Covered |
| 58 | `RN-CHK-001` | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | `START` | `BR-OKL-008` | ✅ Covered |
| 59 | `RN-CHK-002` | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | `P-001` | `BR-OKL-008` | ✅ Covered |
| 60 | `RN-CHK-003` | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | `P-002` | `BR-OKL-002` | ✅ Covered |
| 61 | `RN-CHK-004` | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | `P-003` | `BR-GLB-001` | ✅ Covered |
| 62 | `RN-CHK-005` | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | `P-004` | `BR-GLB-001` | ✅ Covered |
| 63 | `RN-CHK-006` | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | `P-005` | `BR-OKL-008` | ✅ Covered |
| 64 | `RN-CHK-007` | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | `P-006` | `BR-GLB-001` | ✅ Covered |
| 65 | `RN-CHK-008` | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | `P-007` | `BR-GLB-002` | ✅ Covered |
| 66 | `RN-CHK-009` | Mantri Bibitan | Pemeriksaan | Pemeriksaan Bertahap Grafting | `END` | `BR-GLB-003` | ✅ Covered |
| 67 | `RN-SEL-001` | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | `START` | `BR-SEL-001` | ✅ Covered |
| 68 | `RN-SEL-003` | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | `P-002` | `BR-OKL-002` | ✅ Covered |
| 69 | `RN-SEL-004` | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | `P-003` | `BR-SEL-001` | ✅ Covered |
| 70 | `RN-SEL-005` | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | `P-004` | `BR-SEL-001` | ✅ Covered |
| 71 | `RN-SEL-006` | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | `P-005` | `BR-GLB-001` | ✅ Covered |
| 72 | `RN-SEL-007` | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | `P-006` | `BR-GLB-002` | ✅ Covered |
| 73 | `RN-SEL-008` | Asisten Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | `P-007` | `BR-SEL-001` | ✅ Covered |
| 74 | `RN-SEL-009` | Asisten Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | `P-008` | `BR-SEL-001` | ✅ Covered |
| 75 | `RN-SEL-010` | Asisten Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | `P-009` | `BR-GLB-002` | ✅ Covered |
| 76 | `RN-SEL-011` | Mantri Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | `END` | `BR-GLB-003` | ✅ Covered |
| 77 | `RN-ENT-002` | Mantri Bibitan | Kebun Entres | Menunas Plot Entres | `START` | `BR-OKL-002` | ✅ Covered |
| 78 | `RN-ENT-003` | Mantri Bibitan | Kebun Entres | Menunas Plot Entres | `P-002` | `BR-OKL-005` | ✅ Covered |
| 79 | `RN-ENT-004` | Mantri Bibitan | Kebun Entres | Menunas Plot Entres | `P-003` | `BR-GLB-001` | ✅ Covered |
| 80 | `RN-ENT-005` | Mantri Bibitan | Kebun Entres | Menunas Plot Entres | `P-004` | `BR-GLB-001` | ✅ Covered |
| 81 | `RN-ENT-006` | Mantri Bibitan | Kebun Entres | Menunas Plot Entres | `P-005` | `BR-GLB-001, BR-GLB-002` | ✅ Covered |
| 82 | `RN-ENT-007` | Mantri Bibitan | Kebun Entres | Menunas Plot Entres | `END` | `BR-GLB-003` | ✅ Covered |
| 83 | `RN-HAR-001` | Mantri Bibitan | Panen Mata Entres | Panen Mata Entres | `START` | `BR-OKL-005, BR-OKL-007` | ✅ Covered |
| 84 | `RN-HAR-002` | Mantri Bibitan | Panen Mata Entres | Panen Mata Entres | `P-001` | `BR-OKL-002` | ✅ Covered |
| 85 | `RN-HAR-003` | Mantri Bibitan | Panen Mata Entres | Panen Mata Entres | `P-002` | `BR-OKL-006` | ✅ Covered |
| 86 | `RN-HAR-004` | Mantri Bibitan | Panen Mata Entres | Panen Mata Entres | `P-003` | `BR-OKL-006` | ✅ Covered |
| 87 | `RN-HAR-005` | Mantri Bibitan | Panen Mata Entres | Panen Mata Entres | `P-004` | `BR-OKL-006` | ✅ Covered |
| 88 | `RN-HAR-006` | Mantri Bibitan | Panen Mata Entres | Panen Mata Entres | `P-005` | `BR-GLB-001` | ✅ Covered |
| 89 | `RN-HAR-007` | Asisten Bibitan | Panen Mata Entres | Panen Mata Entres | `P-006` | `BR-GLB-002` | ✅ Covered |
| 90 | `RN-HAR-008` | Mantri Bibitan | Panen Mata Entres | Panen Mata Entres | `END` | `BR-GLB-003` | ✅ Covered |
| 91 | `RN-MAT-001` | Mantri Bibitan | Material & Bahan | Monitoring Mutasi Stok Mata Entres | `START` | `BR-MAT-001` | ✅ Covered |
| 92 | `RN-MAT-002` | Mantri Bibitan | Material & Bahan | Monitoring Mutasi Stok Mata Entres | `P-001` | `BR-OKL-005` | ✅ Covered |
| 93 | `RN-MAT-003` | Mantri Bibitan | Material & Bahan | Monitoring Mutasi Stok Mata Entres | `P-002` | `BR-OKL-007` | ✅ Covered |
| 94 | `RN-MAT-004` | Mantri Bibitan | Material & Bahan | Monitoring Mutasi Stok Mata Entres | `P-003` | `BR-MAT-001` | ✅ Covered |
| 95 | `RN-MAT-005` | Sistem | Material & Bahan | Monitoring Mutasi Stok Mata Entres | `P-004` | `BR-MAT-001` | ✅ Covered |
| 96 | `RN-MAT-006` | Mantri Bibitan | Material & Bahan | Monitoring Mutasi Stok Mata Entres | `P-005` | `BR-GLB-001` | ✅ Covered |
| 97 | `RN-MAT-007` | Mantri Bibitan | Material & Bahan | Monitoring Mutasi Stok Mata Entres | `END` | `BR-GLB-003` | ✅ Covered |
| 98 | `RN-MNT-001` | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | `START` | `BR-GLB-001` | ✅ Covered |
| 99 | `RN-MNT-002` | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | `P-001` | `BR-GLB-001` | ✅ Covered |
| 100 | `RN-MNT-003` | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | `P-002` | `BR-OKL-002` | ✅ Covered |
| 101 | `RN-MNT-004` | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | `P-003` | `BR-GLB-001` | ✅ Covered |
| 102 | `RN-MNT-005` | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | `P-004` | `BR-GLB-001` | ✅ Covered |
| 103 | `RN-MNT-006` | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | `P-005` | `BR-MAT-001` | ✅ Covered |
| 104 | `RN-MNT-007` | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | `P-006` | `BR-GLB-002` | ✅ Covered |
| 105 | `RN-MNT-008` | Mantri Bibitan | Rekam Pemeliharaan | Rekam Aktivitas Pemeliharaan | `END` | `BR-GLB-003` | ✅ Covered |
| 106 | `RN-EXP-001` | Asisten Divisi | Pengeluaran | Pengeluaran Bibit (SPB Disetujui) | `START` | `BR-GLB-002` | ✅ Covered |
| 107 | `RN-EXP-002` | Mantri Bibitan | Pengeluaran | Pengeluaran Bibit (SPB Disetujui) | `P-001` | `BR-GLB-002` | ✅ Covered |
| 108 | `RN-EXP-003` | Mantri Bibitan | Pengeluaran | Pengeluaran Bibit (SPB Disetujui) | `P-002` | `BR-OKL-002` | ✅ Covered |
| 109 | `RN-EXP-004` | Mantri Bibitan | Pengeluaran | Pengeluaran Bibit (SPB Disetujui) | `P-003` | `BR-GLB-001` | ✅ Covered |
| 110 | `RN-EXP-007` | Mantri Bibitan | Pengeluaran | Pengeluaran Bibit (SPB Disetujui) | `END` | `BR-GLB-003` | ✅ Covered |
| 111 | `RN-EXM-001` | Mantri Bibitan | Pengeluaran | Pengeluaran Mata Entres | `START` | `BR-GLB-002` | ✅ Covered |
| 112 | `RN-EXM-002` | Mantri Bibitan | Pengeluaran | Pengeluaran Mata Entres | `P-001` | `BR-OKL-002` | ✅ Covered |
| 113 | `RN-EXM-003` | Mantri Bibitan | Pengeluaran | Pengeluaran Mata Entres | `P-002` | `BR-OKL-006` | ✅ Covered |
| 114 | `RN-EXM-004` | Mantri Bibitan | Pengeluaran | Pengeluaran Mata Entres | `P-003` | `BR-GLB-001, BR-GLB-002` | ✅ Covered |
| 115 | `RN-EXM-005` | Mantri Bibitan | Pengeluaran | Pengeluaran Mata Entres | `END` | `BR-GLB-003` | ✅ Covered |
| 116 | `RN-RCV-KSP016` | Pengurus Kebun Peminta | Penerimaan | Penerimaan Bibit - Kebun Sepupu | `CR-002` | `BR-GLB-002` | ✅ Covered |
| 117 | `RN-RCV-KSP017` | Asisten Kepala | Penerimaan | Penerimaan Bibit - Kebun Sepupu | `CR-003` | `BR-GLB-002` | ✅ Covered |
| 118 | `RN-RCV-KSP018` | Asisten Kepala | Penerimaan | Penerimaan Bibit - Kebun Sepupu | `CR-005` | `BR-GLB-001` | ✅ Covered |
| 119 | `RN-RCV-KSP019` | Mantri Bibitan | Penerimaan | Penerimaan Bibit - Kebun Sepupu | `CR-004` | `BR-GLB-001` | ✅ Covered |
| 120 | `RN-RCV-KSP020` | Pengurus Kebun Peminta | Penerimaan | Penerimaan Bibit - Kebun Sepupu | `END` | `BR-GLB-003` | ✅ Covered |
| 121 | `RN-RCV-KSP021` | Pengurus Kebun Peminta | Penerimaan | Penerimaan Bibit - Kebun Sepupu | `START` | `BR-GLB-003` | ✅ Covered |
| 122 | `RN-RCV-ME022` | Pengurus Kebun Peminta | Penerimaan | Penerimaan Mata Entres | `CR-002` | `BR-GLB-002` | ✅ Covered |
| 123 | `RN-RCV-ME023` | Asisten Kepala | Penerimaan | Penerimaan Mata Entres | `CR-003` | `BR-GLB-002` | ✅ Covered |
| 124 | `RN-RCV-ME024` | Asisten Kepala | Penerimaan | Penerimaan Mata Entres | `CR-005` | `BR-GLB-001` | ✅ Covered |
| 125 | `RN-RCV-ME025` | Mantri Bibitan | Penerimaan | Penerimaan Mata Entres | `CR-004` | `BR-GLB-001` | ✅ Covered |
| 126 | `RN-RCV-ME026` | Pengurus Kebun Peminta | Penerimaan | Penerimaan Mata Entres | `END` | `BR-GLB-003` | ✅ Covered |
| 127 | `RN-RCV-ME027` | Pengurus Kebun Peminta | Penerimaan | Penerimaan Mata Entres | `START` | `BR-GLB-003` | ✅ Covered |
| 128 | `RN-SEM-TP028` | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | `START` | `BR-SEM-007` | ✅ Covered |
| 129 | `RN-SEM-TP029` | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | `P-001` | `BR-SEM-007` | ✅ Covered |
| 130 | `RN-SEM-TP030` | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | `P-002` | `BR-OKL-002` | ✅ Covered |
| 131 | `RN-SEM-TP031` | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | `P-003` | `BR-SEM-006` | ✅ Covered |
| 132 | `RN-SEM-TP032` | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | `P-006` | `BR-GLB-002` | ✅ Covered |
| 133 | `RN-SEM-TP033` | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | `P-004` | `BR-GLB-001` | ✅ Covered |
| 134 | `RN-SEM-TP034` | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | `P-005` | `BR-GLB-001` | ✅ Covered |
| 135 | `RN-SEM-TP035` | Mantri Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | `END` | `BR-GLB-003` | ✅ Covered |
| 136 | `RN-CHK-RG036` | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | `START` | `BR-OKL-008` | ✅ Covered |
| 137 | `RN-CHK-RG037` | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | `P-001` | `BR-OKL-008` | ✅ Covered |
| 138 | `RN-CHK-RG038` | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | `P-002` | `BR-OKL-002` | ✅ Covered |
| 139 | `RN-CHK-RG039` | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | `P-003` | `BR-GLB-001` | ✅ Covered |
| 140 | `RN-CHK-RG040` | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | `P-004` | `BR-GLB-001` | ✅ Covered |
| 141 | `RN-CHK-RG041` | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | `P-005` | `BR-OKL-008` | ✅ Covered |
| 142 | `RN-CHK-RG042` | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | `P-006` | `BR-GLB-001` | ✅ Covered |
| 143 | `RN-CHK-RG043` | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | `P-007` | `BR-GLB-002` | ✅ Covered |
| 144 | `RN-CHK-RG044` | Mantri Bibitan | Pemeriksaan | Pemeriksaan Regrafting | `END` | `BR-GLB-003` | ✅ Covered |
| 145 | `RN-ENT-TOP045` | Mantri Bibitan | Kebun Entres | Topping Plot Entres | `START` | `BR-GLB-001` | ✅ Covered |
| 146 | `RN-ENT-TOP046` | Mantri Bibitan | Kebun Entres | Topping Plot Entres | `P-001` | `BR-OKL-002` | ✅ Covered |
| 147 | `RN-ENT-TOP047` | Mantri Bibitan | Kebun Entres | Topping Plot Entres | `P-002` | `BR-OKL-005` | ✅ Covered |
| 148 | `RN-ENT-TOP048` | Mantri Bibitan | Kebun Entres | Topping Plot Entres | `P-003` | `BR-GLB-001` | ✅ Covered |
| 149 | `RN-ENT-TOP049` | Mantri Bibitan | Kebun Entres | Topping Plot Entres | `P-004` | `BR-GLB-001` | ✅ Covered |
| 150 | `RN-ENT-TOP050` | Mantri Bibitan | Kebun Entres | Topping Plot Entres | `P-005` | `BR-GLB-001, BR-GLB-002` | ✅ Covered |
| 151 | `RN-ENT-TOP051` | Mantri Bibitan | Kebun Entres | Topping Plot Entres | `END` | `BR-GLB-003` | ✅ Covered |
| 152 | `RN-MAT-MMG052` | Mantri Bibitan | Material & Bahan | Matching Material Dokumen Gudang | `START` | `BR-MAT-001` | ✅ Covered |
| 153 | `RN-MAT-MMG053` | Mantri Bibitan | Material & Bahan | Matching Material Dokumen Gudang | `P-001` | `BR-MAT-001` | ✅ Covered |
| 154 | `RN-MAT-MMG054` | Mantri Bibitan | Material & Bahan | Matching Material Dokumen Gudang | `P-003` | `BR-MAT-001` | ✅ Covered |
| 155 | `RN-MAT-MMG055` | Mantri Bibitan | Material & Bahan | Matching Material Dokumen Gudang | `P-002` | `BR-MAT-001` | ✅ Covered |
| 156 | `RN-MAT-MMG056` | Mantri Bibitan | Material & Bahan | Matching Material Dokumen Gudang | `P-004` | `BR-MAT-001` | ✅ Covered |
| 157 | `RN-MAT-MMG057` | Mantri Bibitan | Material & Bahan | Matching Material Dokumen Gudang | `P-007` | `BR-GLB-001` | ✅ Covered |
| 158 | `RN-MAT-MMG058` | Mantri Bibitan | Material & Bahan | Matching Material Dokumen Gudang | `END` | `BR-GLB-003` | ✅ Covered |
| 159 | `RN-PWP-006` | Asisten Bibitan | Presensi | Presensi Pekerja Bibitan | `P-004` | `BR-GLB-002` | ✅ Covered |
| 160 | `RN-MAT-MMG059` | Asisten Bibitan | Material & Bahan | Material Gudang Matching | `P-005` | `BR-GLB-002, BR-MAT-001` | ✅ Covered |
| 161 | `RN-EXP-008` | Asisten Divisi | Pengeluaran | Pengeluaran Bibit (SPB Disetujui) | `P-004` | `BR-GLB-001` | ✅ Covered |
| 162 | `RN-SEL-012` | Asisten Kepala | Penyeleksian | Seleksi Kualitas Bibit Batch | `P-010` | `BR-GLB-002, BR-SEL-001` | ✅ Covered |
| 163 | `RN-ENT-008` | Tekniker I | Kebun Entres | Menunas Plot Entres | `QC-001` | `BR-QAL-001` | ✅ Covered |
| 164 | `RN-OKL-029` | Tekniker I | Okulasi | Grafting (Okulasi Utama) | `QC-001` | `BR-QAL-001` | ✅ Covered |
| 165 | `RN-RCV-028` | Tekniker I | Penerimaan | Penerimaan Benih / Biji Kelatak | `QC-001` | `BR-QAL-001` | ✅ Covered |
| 166 | `RN-EXP-009` | KTU | Pengeluaran | Pengeluaran Bibit (SPB Disetujui) | `P-005` | `BR-GLB-003` | ✅ Covered |
| 167 | `RN-MAT-MMG060` | KTU | Material & Bahan | Material Gudang Matching | `P-006` | `BR-GLB-003, BR-MAT-001` | ✅ Covered |
| 168 | `RN-PWP-007` | KTU | Presensi | Presensi Pekerja Bibitan | `P-005` | `BR-GLB-003` | ✅ Covered |
| 169 | `RN-MNT-009` | Mantri Bibitan | Rekam Pemeliharaan | Pencatatan Heading Kerja | `P-007` | `BR-AUD-001` | ✅ Covered |
| 170 | `RN-SEM-TP036` | Asisten Bibitan | Penyemaian | Transplanting ke Polybag (Batch) | `P-007` | `BR-GLB-002` | ✅ Covered |
| 171 | `RN-SEL-013` | Asisten Bibitan | Penyeleksian | Seleksi Kualitas Bibit Batch | `P-011` | `BR-SEL-001` | ✅ Covered |
| 172 | `RN-SEL-014` | Asisten Kepala | Penyeleksian | Seleksi Kualitas Bibit Batch | `P-012` | `BR-SEL-001` | ✅ Covered |
