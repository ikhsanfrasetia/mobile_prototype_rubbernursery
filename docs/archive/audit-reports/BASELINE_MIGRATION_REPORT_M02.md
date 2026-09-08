# BASELINE MIGRATION REPORT M02: PENERIMAAN

## 1. Migration Scope
- Target: Modul M02 Penerimaan (Benih Kelatak, Bibit Kebun Sendiri, Bibit Kebun Sepupu, Mata Entres).
- Tujuan: Penyelarasan *baseline current* tanpa menyentuh modul lain, mempertahankan *Pengurus*, mematuhi batasan *Polygon* dan *Koreksi*, serta membersihkan jebakan *legacy* terkait relasi Request/Shipment/Batch.

## 2. Changed Requirements

### [RN-RCV-003]
- **Reason**: Sesuaikan dengan pencatatan quantity aktual; mismatch diterima dan fisik buruk dipisah sbg Reject.
- **Before Validation**: Tidak ada seleksi benih di Modul Penerimaan (seleksi dilakukan di Penyemaian).
- **After Validation**: Quantity mismatch tetap dapat diterima. Kondisi fisik buruk dapat dipisahkan sebagai Reject.
- **Before Output**: Kuantitas aktual tercatat.
- **After Output**: Kuantitas aktual tercatat.


### [RN-RCV-005]
- **Reason**: Sesuaikan mekanisme verifikasi Asisten dan koreksi dengan log nilai original.
- **Before Validation**: Jika disetujui, dokumen penerimaan terverifikasi dan siap disemai.
- **After Validation**: Verifikasi Asisten selesai. Koreksi quantity wajib mencatat originalValue, correctedValue, reason, correctedBy, dan correctedAt.
- **Before Output**: Dokumen penerimaan terverifikasi di database produksi.
- **After Output**: Dokumen penerimaan terverifikasi di database produksi.


### [RN-RCV-KS06]
- **Reason**: Penyesuaian status request: Disetujui -> Terpenuhi berdasar total quantity dan seluruh shipment diverifikasi.
- **Before Validation**: -
- **After Validation**: Status Terpenuhi hanya setelah total quantity kebutuhan tercapai dan seluruh shipment diverifikasi.
- **Before Output**: Data mutasi produksi tersinkron penuh.
- **After Output**: Status request berubah dari Disetujui menjadi Terpenuhi.


### [RN-RCV-KSP021]
- **Reason**: Penyesuaian status request: Disetujui -> Terpenuhi berdasar total quantity dan seluruh shipment diverifikasi.
- **Before Validation**: -
- **After Validation**: Status Terpenuhi hanya setelah total quantity kebutuhan tercapai dan seluruh shipment diverifikasi.
- **Before Output**: Data mutasi produksi tersinkron penuh.
- **After Output**: Status request berubah dari Disetujui menjadi Terpenuhi.


### [RN-RCV-ME027]
- **Reason**: Penyesuaian status request: Disetujui -> Terpenuhi berdasar total quantity dan seluruh shipment diverifikasi.
- **Before Validation**: -
- **After Validation**: Status Terpenuhi hanya setelah total quantity kebutuhan tercapai dan seluruh shipment diverifikasi.
- **Before Output**: Data mutasi produksi tersinkron penuh.
- **After Output**: Status request berubah dari Disetujui menjadi Terpenuhi.


## 3. Changed Flow Nodes
- Bebas konflik secara bawaan; tidak ada Node yang mengandung aturan *1-to-1 legacy* secara *hardcode*.

## 4. Unchanged Requirements
Entitas *Pengurus Kebun Peminta* diverifikasi utuh tanpa revisi narasi maupun fungsional:
- `RN-RCV-KSP016`
- `RN-RCV-KSP020`
- `RN-RCV-ME022`
- `RN-RCV-ME026`
Seluruh fungsi *Mobile Prototype* terkait modul ini berstatus **LOCKED** dan dijaga kemurniannya.

## 5. Polygon Handling
Tidak ada penambahan `RN-RCV-007` atau `RN-RCV-008`. 
Status informasi polygon pada *Master Baseline* ("Peta Penerimaan hanya untuk histori, tidak otomatis menghitung area / populasi") dicatat sebagai: 
> **"Belum memiliki Requirement ID pada baseline/data aktif."**

## 6. Before/After Metrics
- **Deleted Entity**: 0 (Sesuai mode Controlled Migration)
- **New Entity**: 0 (Sesuai instruksi)
- **Modified Requirement**: 5
- **Modified Flow Node**: 0

## 7. Traceability
- Tidak ada mapping *flow* ke *requirement* yang terputus (0 *orphan nodes / requirements*). Relasi RTM dipelihara 100%.
- Rantai `Request -> Shipment -> Batch` bebas beroperasi *one-to-many* tanpa terkendala batasan *1-to-1 legacy*.

## 8. Isolation Check
- **Mobile Prototype**: UNTOUCHED.
- **M01, M03 - M11**: UNTOUCHED.
- **Business Rule**: UNTOUCHED.

## 9. Validation Result
- Konflik M02 Aktif (Legacy Constraint): **CLEARED**.
- *Koreksi Asisten* terintegrasi ke dalam `RN-RCV-005` tanpa mengobrak-abrik struktur.

## 10. Unresolved Items
- Informasi Polygon Peta Penerimaan dibiarkan tanpa *Requirement ID* sebagai bentuk penguncian komite desain (*Locked*).

## 11. Final Status
**PASS**
