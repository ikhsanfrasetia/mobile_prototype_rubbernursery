# AUDIT CONTEXT: RN-SEM-005 & RN-SEM-007

## 1. RN-SEM-005
- **Req ID**: `RN-SEM-005`
- **Current Title**: Asisten menyetujui penaburan bedengan; periode perkecambahan berlangsung ±12–15 hari.
- **Current Requirement**: (Sama dengan Title)
- **Current Process**: Verifikasi Asisten & ±12–15 Hari Semai
- **Current Validation**: Umur semai mencapai ±12–15 hari.
- **Current Output**: Kecambah siap transplanting ke polybag.
- **Current Status**: Confirmed

**Analisis Konteks**:
- **Apakah "polybag" bermakna proses aktif?** Ya, secara historis mengacu pada tahapan berikutnya ("Kecambah siap transplanting ke polybag").
- **Apakah "transplanting" bermakna proses aktif?** Ya, masih menyebutkan "transplanting" sebagai proses keluaran (*output*).
- **Exact Baseline Evidence**:
  - "Umur/tahap kecambah dihapus dari narasi kelayakan."
  - "Seluruh proses Transplantasi ke Polybag dihapus."
  - "Kesiapan mengacu pada kondisi fisik."

**Kesimpulan**: 
Narasi pada *title* dan *validation* masih menggunakan acuan umur spesifik (±12–15 hari) dan *output*-nya menyebutkan proses transplanting ke polybag, yang keduanya sudah secara eksplisit dihapus dalam Master Baseline Current.

**Classification**: **REVISE**

---

## 2. RN-SEM-007
- **Req ID**: `RN-SEM-007`
- **Current Title**: Satu Batch bibitan dapat dikonsolidasi dari beberapa Bedengan.
- **Current Requirement**: (Kosong, default ke Title)
- **Current Process**: Konsolidasi Multi-Bedengan ke Batch
- **Current Input**: Kumpulan bedengan siap polybag
- **Current Validation**: Clone dan petak seragam
- **Current Output**: Batch resmi terbentuk
- **Current Status**: Confirmed

**Analisis Konteks**:
- **Apakah "polybag" bermakna proses aktif?** Ya, digunakan di kolom *input* ("Kumpulan bedengan siap polybag").
- **Apakah "transplanting" bermakna proses aktif?** Tidak ada kata *transplanting* pada entitas ini.
- **Exact Baseline Evidence**:
  - "Satu Bedengan dapat memiliki beberapa Batch."
  - "Batch dibuat tanpa Clone."
  - "Setiap alokasi penyemaian merupakan transaksi terpisah."

**Kesimpulan**: 
Requirement ini bukan sekadar mengandung residu kata "polybag" yang harus dihapus, tetapi secara substansial bertentangan (*baseline conflict*) dengan Master Baseline. Narasi lama mengizinkan "Satu Batch dikonsolidasi dari beberapa Bedengan" dengan validasi "Clone dan petak seragam". Sementara baseline aktif secara eksplisit menyebut "Satu Bedengan dapat memiliki beberapa Batch" dan "Batch dibuat tanpa Clone". 

**Classification**: **REVISE**
