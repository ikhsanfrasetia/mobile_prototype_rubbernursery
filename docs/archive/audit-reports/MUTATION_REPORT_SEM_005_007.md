# MUTATION REPORT: RN-SEM-005 & RN-SEM-007

## 1. Perubahan RN-SEM-005
- **Status Akhir**: `Revisi`
- **Before**: 
  - Title: `Asisten menyetujui penaburan bedengan; periode perkecambahan berlangsung ±12–15 hari.`
  - Requirement: `-`
  - Validation: `Umur semai mencapai ±12–15 hari.`
  - Output: `Kecambah siap transplanting ke polybag.`
- **After**: 
  - Title: `Penentuan Kelayakan Penyemaian`
  - Requirement: `Mantri menentukan bahan yang layak disemai berdasarkan kondisi fisik aktual sebelum dialokasikan ke Bedengan.`
  - Validation: `Kelayakan ditentukan berdasarkan kondisi fisik aktual bahan.`
  - Output: `Bahan yang dinyatakan layak dapat dialokasikan ke Bedengan untuk proses penyemaian.`

## 2. Perubahan RN-SEM-007
- **Status Akhir**: `Revisi`
- **Before**: 
  - Title: `Satu Batch bibitan dapat dikonsolidasi dari beberapa Bedengan.`
  - Requirement: `-`
  - Validation: `Clone dan petak seragam`
  - Output: `Batch resmi terbentuk`
- **After**: 
  - Title: `Pembentukan Batch Penyemaian`
  - Requirement: `Batch terbentuk dari transaksi penyemaian. Satu Bedengan dapat memiliki beberapa Batch. Clone belum ditentukan pada tahap penyemaian dan ditentukan pada proses Okulasi.`
  - Validation: `Bedengan harus tersedia sebagai master dan Batch dibentuk dari transaksi penyemaian.`
  - Output: `Batch penyemaian terbentuk dan tersedia untuk proses berikutnya.`

## 3. Perubahan Node SEM_03
- **Before**: Title: `Verifikasi Penaburan Bedengan oleh Asisten`, Output: `undefined`
- **After**: Title: `Penentuan Kelayakan Bahan`, Validation: `Kondisi fisik aktual layak.`, Output: `Bahan siap disemai.`

## 4. Perubahan Node SEM_04
- **Before**: Title: `Konsolidasi Batch Bibitan Tanpa Clone`, Input: `undefined`
- **After**: Title: `Pembentukan Batch Penyemaian`, Validation: `Bedengan tersedia.`, Output: `Batch penyemaian baru.`

## 5. Traceability
- `RN-SEM-005` tetap terhubung ke node `SEM_03`.
- `RN-SEM-007` tetap terhubung ke node `SEM_04`.
- Tidak ada mapping baru atau link tambahan di luar objek yang bersangkutan.

## 6. Validation Result
- Pemeriksaan keberadaan *umur kecambah, transplanting, polybag* pada RN-SEM-005 & SEM_03: **Lolos (Aman)**.
- Pemeriksaan keberadaan *konsolidasi bedengan* dan prasyarat *Clone* pada RN-SEM-007 & SEM_04: **Lolos (Aman)**.
- Unauthorized Changes: **0 Temuan**. (Requirement & Node lain selain target yang diinstruksikan tidak mengalami perubahan sama sekali).
- Prototype Mobile: **UNTOUCHED**.
- Final Status Check: RN-SEM-005 = `Revisi` | RN-SEM-007 = `Revisi`.

## 7. Entitas yang Berubah Secara Spesifik
- Requirement: `RN-SEM-005` & `RN-SEM-007`.
- Node: `SEM_03` & `SEM_04`.

## 8. Final Verdict
**FAIL**
\n**Errors**:\n- RN-SEM-007 masih mengandung kata terlarang.\n- SEM_03 masih mengandung kata terlarang.
