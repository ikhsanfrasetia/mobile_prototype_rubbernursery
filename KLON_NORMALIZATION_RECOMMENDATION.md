# KLON NORMALIZATION RECOMMENDATION — SIGMA RUBBER NURSERY

**Phase:** Phase 9J — Audit Konsistensi Data Klon Lintas Modul Transaksi  
**Status:** RECOMMENDATION ONLY (NO IMPLEMENTATION IN THIS PHASE)  
**Date:** 2026-09-12  

Dokumen ini memuat rekomendasi teknis dan arsitektur untuk pembentukan Master Data Klon Terpusat pada fase berikutnya.

---

## 1. Kebutuhan Master Data Klon Terpusat

Berdasarkan audit Phase 9J, pembentukan Master Data Klon Terpusat (mis. `js/data/klon-master.js` atau penyempurnaan `master-data.js`) **SANGAT DIREKOMENDASIKAN** untuk:
1. Menghilangkan ketergantungan pada 5 array hardcoded lokal yang tersebar di `receipt-sir.js`, `receipt-benih.js`, `seeding-form.js`, `budding-form.js`, dan `master-data.js`.
2. Menstandarisasi format penamaan klon (mis. menggunakan format standar dengan spasi: `PB 260`, `GT 1`, `RRIM 600`, `IRR 112`, `IRCA 19`).
3. Memastikan modul baru dan form transaksi baru memilih dari katalog klon yang sama.

---

## 2. Rekomendasi Struktur Master Klon Terpusat

```javascript
/**
 * Struktur Entitas Master Klon yang Direkomendasikan
 */
export const KLON_MASTER = Object.freeze([
  {
    id: 'KLON-PB260',
    code: 'PB 260',
    name: 'PB 260',
    canonicalName: 'PB 260',
    category: 'ENTRES_AND_ROOTSTOCK', // 'ROOTSTOCK', 'ENTRES', 'ALL'
    aliases: Object.freeze(['PB260', 'PB-260']), // Untuk backward compatibility parser
    status: 'ACTIVE',
    description: 'Klon unggul produksi lateks dan kayu'
  },
  {
    id: 'KLON-GT1',
    code: 'GT 1',
    name: 'GT 1',
    canonicalName: 'GT 1',
    category: 'ROOTSTOCK',
    aliases: Object.freeze(['GT1', 'GT-01', 'GT-1']),
    status: 'ACTIVE',
    description: 'Klon standar batang bawah (rootstock)'
  },
  // ... katalog klon terstandarisasi lainnya
]);
```

### Rekomendasi Helper API:
- `getAllKlons()`
- `getKlonByCode(code)`
- `getKlonById(id)`
- `getKlonsByCategory(category)` // mis. Rootstock vs Entres
- `normalizeKlonString(inputStr)` // Mengonversi `PB260` atau `PB-260` -> `PB 260`

---

## 3. Strategi Kompatibilitas & Integrasi Bertahap

1. **Prinsip "ADD, DO NOT BREAK"**:
   - Master data dibangun terlebih dahulu sebagai foundation terisolasi (seperti Phase 9F-B untuk Worker Master dan Phase 9B untuk CFNA Master).
   - Integrasi ke modul transaksi dilakukan secara bertahap satu per satu (seperti Phase 9G Budding, 9H Presensi, 9I Maintenance).
2. **Backward Compatibility Alias**:
   - Setiap entitas klon memiliki daftar `aliases` untuk mendukung pembacaan atau pencocokan data historis yang menggunakan format condensed (`PB260`) atau hyphenated (`PB-260`).
3. **Historical Data Untouched**:
   - Tidak melakukan update atau mutasi terhadap database transaksi historis yang sudah tersimpan.

---

## 4. Urutan Prioritas Integrasi Modul

1. **Fase 1 (Foundation)**: Pembangunan Master Data Klon Terpusat (`klon-master.js`), helper API, alias mapping, dan test suite foundation.
2. **Fase 2 (Penerimaan & Penyemaian)**: Integrasi master klon ke `receipt-benih.js`, `receipt-sir.js`, dan `seeding-form.js`.
3. **Fase 3 (Okulasi & Kebun Entres)**: Integrasi master klon ke `budding-form.js`, `topping-form.js`, dan `menunas-form.js`.
4. **Fase 4 (SPB & Riwayat)**: Penyelarasan dropdown SPB `request-kebun-sepupu-form.js` dan agregasi pada `nursery-history.js`.

---

## 5. Pertanyaan Bisnis yang Perlu Dikonfirmasi (REQUIREMENT CLARIFICATION)

1. **Standar Penamaan Resmi**: Apakah format penamaan klon resmi Socfindo menggunakan spasi (`PB 260`, `GT 1`, `RRIM 600`) atau format lain?
2. **Batang Bawah vs Entres**: Apakah ada pembatasan klon tertentu yang hanya boleh digunakan sebagai Batang Bawah (Rootstock) dan klon tertentu yang hanya boleh untuk Mata Entres?
3. **Katalog Klon Lengkap**: Dari 57 klon pada daftar SIR, apakah seluruhnya aktif digunakan pada operasional pembibitan saat ini atau hanya subset tertentu?
