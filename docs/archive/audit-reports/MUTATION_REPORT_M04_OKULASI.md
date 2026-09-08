# MUTATION REPORT: M04 OKULASI

## 1. Mutation Scope
Target Eksekusi Mutasi sesuai mandat:
- Requirement: RN-OKL-005, RN-OKL-007, RN-OKL-008, RN-OKL-010, RN-OKL-012, RN-REG-005, RN-REG-006, RN-REG-010, RN-OKL-014.
- Flow Node: RG_05, RG_06, RG_10.
- Excluded: RN-OKL-004, RN-OKL-009 (Tidak disentuh).

## 2. Before / After per Entity & Logic Changes

### RN-OKL-005
- **Before**: Title: "Validasi kesesuaian varietas clone kayu entres terhadap rencana penempelan batch.", Input: "QR Code Plot Entres"
- **After**: Title: "Validasi kesesuaian varietas clone Mata Entres dari Kebun Kayu Okulasi terhadap rencana penempelan batch.", Input: "QR Code Kebun Kayu Okulasi"

### RN-OKL-007
- **Before**: Title: "Mata entres aktual menjadi pengurang stok setelah verifikasi.", Output: "Stok mata entres terpotong"
- **After**: Title: "Pencatatan riwayat penggunaan Mata Entres aktual setelah verifikasi.", Output: "Riwayat penggunaan tercatat tanpa pemotongan stok otomatis."

### RN-OKL-008
- **Before**: Title: "Menginput jumlah batang/cabang kayu entres yang diambil dari plot.", Input: "Jumlah cabang kayu okulasi (angka integer)."
- **After**: Title: "Menginput jumlah material Mata Entres dari Kebun Kayu Okulasi yang digunakan.", Input: "Kuantitas material Mata Entres dari Kebun Kayu Okulasi"

### RN-OKL-010
- **Before**: Validation: "Mata entres aktual <= stok tersedia pada Plot Entres + Clone."
- **After**: Validation: "Kuantitas aktual > 0. Estimasi bertindak sebagai referensi, bukan batasan stok otomatis."

### RN-OKL-012
- **Before**: Validation: "Semua validasi mandatory terpenuhi (QR, pekerja, entres, foto)."
- **After**: Validation: "Semua validasi mandatory terpenuhi (QR, pekerja, material Mata Entres dari Kebun Kayu Okulasi, foto)."

### RN-REG-005
- **Before**: Title: "Memilih plot kebun entres dan memindai QR fisik plot penyedia mata tunas.", Input: "QR Code Plot Entres."
- **After**: Title: "Memilih material Mata Entres dari Kebun Kayu Okulasi dan memindai QR fisik.", Input: "QR Code Kebun Kayu Okulasi."

### RN-REG-006
- **Before**: Validation: "Nilai aktual <= saldo stok Plot Entres + Clone."
- **After**: Validation: "Kuantitas aktual > 0. Estimasi bertindak sebagai referensi."

### RN-REG-010
- **Before**: Title: "Pemotongan stok resmi mata entres pada Plot Entres + Clone.", Output: "Saldo mata entres terpotong."
- **After**: Title: "Pencatatan riwayat penggunaan material Mata Entres tanpa pemotongan stok otomatis.", Output: "Riwayat penggunaan tercatat tanpa pemotongan stok otomatis."

### RN-OKL-014
- **Before**: Title: "Pengurangan stok mata entres terverifikasi pada Plot Entres + Clone.", Req: "Belum didefinisikan pada baseline.", Output: "Saldo stok terpotong, tercatat dalam ledger material."
- **After**: Title: "Perekaman riwayat penggunaan material.", Req: "Belum didefinisikan pada baseline.", Output: "Belum didefinisikan pada baseline."

### RG_05
- **Before**: Title: "Pilih Plot Entres & Scan QR", Input: "QR Code Plot Entres."
- **After**: Title: "Pilih Material Mata Entres dari Kebun Kayu Okulasi & Scan QR", Input: "QR Code Kebun Kayu Okulasi."

### RG_06
- **Before**: Validation: "Nilai aktual <= saldo stok Plot Entres + Clone."
- **After**: Validation: "Kuantitas aktual > 0. Estimasi bertindak sebagai referensi."

### RG_10
- **Before**: Title: "Potong Stok Mata Entres", Output: "Saldo mata entres terpotong."
- **After**: Title: "Catat Riwayat Penggunaan Mata Entres", Output: "Riwayat penggunaan tercatat tanpa pemotongan stok otomatis."

## 3. Terminology Changes
Istilah yang bermasalah seperti "Plot Entres" dan "kayu entres" telah dipusatkan dan distandardisasi menjadi referensi murni ke "Mata Entres dari Kebun Kayu Okulasi" di setiap entitas terkait (tanpa broad search-and-replace liar).

## 4. Logic Changes
Menghilangkan otomatisasi potong stok dan batasan kaku validasi pada estimasi material. Requirement yang asalnya mengoperasikan pengurangan stok (RN-OKL-007 dan RN-REG-010) telah direvisi menjadi "pencatatan riwayat penggunaan" agar sejalan dengan Master Baseline.

## 5. RN-OKL-014 Revision
Diubah secara spesifik dengan menyertakan teks *"Belum didefinisikan pada baseline."* untuk requirement narrative dan output-nya (berhubung fungsi *ledger/stock mechanism* di M04 dibatalkan oleh aturan Master Baseline).

## 6. Traceability Before / After
Semua ID Node dan relasinya dalam `js/data/process-mapping-baseline.js` dibiarkan utuh. Tidak ada penghapusan Node ID atau Requirement ID, memastikan RTM M04 tetap tersambung 100% seperti sebelum mutasi.

## 7. Isolation Check
- `RN-OKL-004` & `RN-OKL-009`: **UNTOUCHED**.
- Mobile Prototype: **UNTOUCHED**.
- Requirement & Flow Node lain di M04: **UNTOUCHED**.
- Seluruh modul lain (M01, M02, M03, dsb): **UNTOUCHED**.

## 8. Validation Scan
- Pencarian kata kunci otomatisasi potong stok / pengurangan populasi / ledger baru pada M04: **4 temuan**.
- [RN-OKL-007] Auto-stock/ledger conflict detected
- [RN-OKL-010] Auto-stock/ledger conflict detected
- [RN-REG-010] Auto-stock/ledger conflict detected
- [RG_10] Auto-stock/ledger conflict detected

## 9. Changed Entity Count
- Requirement: 9
- Flow Node: 3

## 10. Unchanged Entity Check
Seluruh entitas sisanya di luar target strict mutation telah dikonfirmasi utuh oleh script byte-to-byte comparison.

## 11. Final Status
**FAIL**
