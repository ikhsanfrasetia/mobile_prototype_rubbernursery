# STOCK INTEGRITY CONTROL SELEKSI I, SELEKSI II, & SELEKSI III
## ARCHITECTURE AUDIT, SPECIFICATION, & IMPLEMENTATION PLAN

> **STATUS DOKUMEN:** `IMPLEMENTATION PLAN — NOT YET APPROVED FOR EXECUTION`  
> **Tanggal Revisi:** 12 Oktober 2026  
> **Otoritas Review:** Project Manager (PM) SIGMA Nursery  
> **Mode Repositori Saat Ini:** STRICT READ-ONLY (Implementasi kode belum diizinkan)

---

## 1. TUJUAN & LATAR BELAKANG
Dokumen ini merupakan catatan *knowledge record* resmi dan *Implementation Plan* final untuk implementasi **Stock Integrity Control** pada modul Seleksi Pembibitan (Seleksi I, Seleksi II, dan Seleksi III) di proyek SIGMA Nursery.

Tujuan utama sistem kontrol ini adalah:
1. Menjamin akurasi mutasi persediaan bibit akibat transaksi afkir seleksi tanpa adanya pengurangan ganda (*double deduction*).
2. Mendeteksi anomali selisih stok fisik versus stok sistem secara dini dengan batas toleransi nol (*zero tolerance*, selisih $\ge 1$ Pkk wajib ditangani).
3. Mengatur isolasi penguncian transaksi (*locking*) secara proporsional antara tingkat bedengan (*plot-level lock*) dan tingkat batch (*batch-level lock*).
4. Menyediakan alur persetujuan (*approval*) Asisten Pembibitan dan penyelesaian rekonsiliasi yang sah.
5. Menangani transaksi pending (*submitted*) yang terdampak anomali menggunakan kebijakan **Opsi A (Freeze, Re-evaluate, Auto-Return)**.
6. Menjamin koordinasi mutasi konkurensi antar-tab browser menggunakan kebijakan **Web Locks API (`navigator.locks`) + Fail-Closed**.
7. Menegakkan pemulihan kegagalan (*crash recovery*) yang deterministik tanpa pernah menghasilkan mutasi ganda atau *auto-approve* liar.

---

## 2. RUANG LINGKUP (SCOPE & NON-SCOPE)

### 2.1 Dalam Ruang Lingkup (In-Scope)
* Audit dan perbaikan engine mutasi stok di `js/core/batch-inventory-service.js`.
* Perbaikan bug runtime Temporal Dead Zone (TDZ) pada validasi form Seleksi II dan Seleksi III di `js/modules/selection/selection-manager.js`.
* Penerapan two-phase commit persistence boundaries (Decision Record $\rightarrow$ Mutation Intent $\rightarrow$ Journal Entry $\rightarrow$ Materialized Balance $\rightarrow$ Transaction Status).
* Penegakan penguncian form Mantri dan tombol Asisten di level API kernel `js/core/dependency-guard.js`.
* Penyajian visual badge penguncian, modal berita acara pemeriksaan (BAP) opname fisik, dan penanganan transaksi `APPROVAL_INTERRUPTED` di `js/modules/selection/selection-landing.js`.
* Pendaftaran key baru di `js/core/storage-registry.js`.
* Perancangan Integration Test komprehensif (20 skenario).

### 2.2 Di Luar Ruang Lingkup (Non-Scope / Prohibited)
* **DILARANG MENYENTUH `js/modules/maintenance/nursery-activity.js` DALAM KONDISI APA PUN.**
* Rasio polybag $\leftrightarrow$ bibit **BUKAN** merupakan syarat kelayakan saldo atau blocker sistem stok; data historis polybag dilarang dihapus.
* Tidak ada penambahan schema master baru untuk atribut yang belum didukung bisnis saat ini (`unallocatedQty`, `inTransitQty`).
* Tidak ada implementasi kode, migrasi database runtime, penulisan storage aplikasi, atau eksekusi mutatif Git dalam task ini.

---

## 3. FAKTA SOURCE CODE AKTUAL (HASIL AUDIT TERVERIFIKASI)

Berdasarkan audit statis terhadap repositori pada 12 Oktober 2026:

1. **Flaw Agregasi Cacat di `syncBatchPopulationFromSeeding`**:
   - **Lokasi:** `js/core/batch-inventory-service.js` baris 178–212.
   - **Perilaku:** Menghitung `totalApprovedCull` dari `selection_transactions` dan `journalDeductions` dari `batch_inventory_journal`, lalu mengambil `effectiveDeductions = Math.max(totalApprovedCull, journalDeductions)`.
   - **Risiko:** Jika ada transaksi non-seleksi (misal DISPATCH 500 Pkk) di jurnal, mutasi seleksi dan non-seleksi bercampur. Pemanggilan sync berulang menimpa saldo riil dengan nilai yang tidak konsisten.
2. **Silent Clamping Saldo Negatif**:
   - **Lokasi:** `js/core/batch-inventory-service.js` baris 212.
   - **Perilaku:** `newAvailable = Math.max(0, totalDisemaiSum - effectiveDeductions)`.
   - **Risiko:** Menjepit saldo negatif menjadi nol menyamarkan defisit stok parah dan merusak integritas audit fisik.
3. **Ketiadaan Urutan & Idempotensi Jurnal di `deductBatchStock`**:
   - **Lokasi:** `js/core/batch-inventory-service.js` baris 580–597.
   - **Perilaku:** Jurnal di-*push* dengan ID acak `JRN-${Date.now()}-${rand}` tanpa sequence number monotonik (`batchSeq`), tanpa `idempotencyKey`, dan tanpa koordinasi multi-tab.
4. **Pewarisan Bertingkat Tanpa Mutasi Stok (Sudah Benar)**:
   - **Lokasi:** `js/modules/selection/selection-manager.js` baris 2642–2649 (Seleksi II) dan baris 2856–2863 (Seleksi III).
   - **Perilaku:** Pembuatan dokumen Seleksi II dan Seleksi III menyalin `totalLayak` dari tahap sebelumnya sebagai `sourceBibitQty`. Pembuatan dokumen tidak memotong saldo batch.
5. **Bug Runtime Temporal Dead Zone (TDZ)**:
   - **Lokasi 1 (Seleksi II):** `js/modules/selection/selection-manager.js` baris 4649 memanggil `existingBibitSelectedSum` sebelum dideklarasikan pada baris 4675 jika `matchedBed` bernilai falsy.
   - **Lokasi 2 (Seleksi III):** `js/modules/selection/selection-manager.js` baris 5213 memanggil `existingBibitSelectedSum` sebelum dideklarasikan pada baris 5239 jika `matchedBed` bernilai falsy.
   - **Risiko:** Melempar `ReferenceError` fatal yang merusak UI saat validasi form dijalankan tanpa alokasi bedengan spesifik.
6. **Ketiadaan Atomic Multi-Key pada Storage**:
   - **Lokasi:** `js/core/storage.js` baris 8–26.
   - **Perilaku:** Membungkus `localStorage` per-kunci JSON string. Tidak ada native atomic CAS atau transaksi multi-key lintas domain.

---

## 4. KEPUTUSAN BISNIS & TEKNIS PROJECT MANAGER (PM)

1. **Unit Utama Inventaris:** Jumlah bibit aktual dalam satuan **Pkk**. Rasio polybag tidak boleh menjadi blocker integritas stok.
2. **Koordinasi Konkurensi:** Menggunakan **Web Locks API (`navigator.locks`) + Fail-Closed**. Jika Web Locks tidak didukung runtime, seluruh mutasi stok ditolak demi mencegah *double allocation*.
3. **Penyelesaian Transaksi Pending (Opsi A):**
   - Transaksi pending dibekukan (*frozen*) saat anomali aktif.
   - Pasca-rekonsiliasi fisik: transaksi dengan stok cukup tetap pending menunggu review Asisten; transaksi dengan stok tidak cukup otomatis dikembalikan (**Auto-Return**) ke Mantri dengan audit log lengkap.
4. **Zero Tolerance Anomali:** Selisih fisik $\ge 1$ Pkk secara absolut memicu investigasi anomali dan mengunci bedengan terkait.
5. **Otoritas Approval & Recovery:** Bukti keputusan Asisten bersifat permanen dan tidak boleh dihapus demi rollback teknis. Pemulihan mutasi tertunda wajib memvalidasi ulang saldo terkini.

---

## 5. RANCANGAN DETERMINISTIC JOURNAL ORDERING & RECOVERY

### 5.1 Skema Jurnal Baru
Setiap entri mutasi stok baru pada `batch_inventory_journal` wajib memuat:
* `id`: ID unik jurnal format `JRN-${batchId}-${batchSeq}`.
* `batchId` & `batchCode`: Identitas batch.
* `batchSeq`: Integer urutan monotonik naik per batch ($1, 2, 3, \dots$).
* `txType`: Tipe transaksi (`INITIAL_SOW`, `MIGRATION_BASELINE`, `SELECTION`, `DISPATCH`, `DESTRUCTION`, `ADJUSTMENT_DEFICIT`, `ADJUSTMENT_SURPLUS`).
* `qtyIn` & `qtyOut`: Angka non-negatif valid.
* `balance`: Saldo hasil proyeksi.
* `idempotencyKey`: Hash unik format `MUT-{batchId}-{stage}-{docNo}-{action}`.
* `refId`: Nomor dokumen bisnis terkait.
* `createdAt`: Timestamp ISO-8601.
* `createdBy`: Akun aktor pengeksekusi.

### 5.2 Koordinasi Web Locks API (Fail-Closed)
Seluruh mutasi stok diarahkan melalui satu gerbang fungsi:
```javascript
async function executeStockMutationWithLock(batchIds, mutationCallback) {
  if (typeof navigator === 'undefined' || !navigator.locks || !navigator.locks.request) {
    throw new StockConcurrencyError('MUTATION_REJECTED: Web Locks API tidak tersedia. Operasi ditolak secara fail-closed.');
  }
  
  // Sort leksikografis untuk mencegah deadlock pada transaksi multi-batch
  const sortedBatchIds = [...new Set(batchIds)].sort();
  
  // Helper chain acquisition
  const acquireRecursive = async (index) => {
    if (index >= sortedBatchIds.length) {
      return await mutationCallback();
    }
    const bId = sortedBatchIds[index];
    return await navigator.locks.request(`lock:batch:${bId}`, { mode: 'exclusive' }, async () => {
      return await acquireRecursive(index + 1);
    });
  };
  
  return await acquireRecursive(0);
}
```

### 5.3 Prosedur Kanonis Replay Ledger & Materialized Balance
Materialized balance (`batch_inventory_states`) diperbarui secara idempoten melalui prosedur log replay deterministik:
1. Temukan satu-satunya baseline aktif (`INITIAL_SOW` atau `MIGRATION_BASELINE`).
2. Urutkan seluruh entri jurnal pasca-cutover berdasarkan `batchSeq` menaik. Jika `batchSeq` identik atau data historis tanpa sequence, gunakan urutan string leksikografis `journalId` yang stabil.
3. Validasi keabsahan data:
   - Jika ditemukan dua entri dengan `idempotencyKey` sama dan payload identik $\rightarrow$ lewati duplikasi (skip).
   - Jika `idempotencyKey` sama tetapi payload berbeda $\rightarrow$ **Kunci Batch (`BATCH_LOCKED`)**.
   - Jika ditemukan nilai kuantitas negatif atau gap sequence yang tidak terjelaskan $\rightarrow$ **Kunci Batch (`BATCH_LOCKED`)**.
4. Hitung saldo kanonis:
   $$\text{ComputedBalance} = \text{BaselineQty} + \sum \text{QtyIn} - \sum \text{QtyOut}$$
5. Jika $\text{ComputedBalance} < 0 \rightarrow$ Lempar `StockIntegrityBreachError` dan kunci batch.
6. Commit hasil ke snapshot state: `state.availableQty = ComputedBalance`, `state.lastAppliedJournalId = lastJournal.id`.

---

## 6. PEMISAHAN SALDO BATCH VS ALOKASI BEDENGAN

1. **Saldo Batch (`batch_inventory_states`)**:
   - Sumber kebenaran: Baseline cutover + Jurnal pasca-cutover.
   - Menggambarkan kepemilikan legal seluruh bibit dalam nomor registrasi batch.
2. **Saldo Alokasi Bedengan (`bedengan.inspectedBibit` / alokasi baris dokumen)**:
   - Sumber kebenaran: Dokumen operasional di lapangan.
   - Replay jurnal batch **DILARANG SECARA OTOMATIS MENIMPA SALDO BEDENGAN**.
   - Pengurangan saldo bedengan HANYA terjadi jika transaksi afkir/dispatch secara eksplisit memiliki referensi `bedenganId` yang sah.
3. **Dokumentasi Gap Schema Eksisting**:
   - Source code saat ini **TIDAK MEMILIKI** schema `unallocatedQty` dan `inTransitQty`.
   - Sistem tidak boleh mengarang asumsi bahwa selisih batch dan total bedengan adalah stok in-transit. Invariant yang dapat dijamin saat ini adalah:
     $$\text{BatchAvailableQty} \equiv \text{Baseline} + \sum \text{QtyIn} - \sum \text{QtyOut} \ge 0$$
     $$\sum_{B \in \text{Allocated}} \text{BedenganAvailable}(B) \le \text{BatchAvailableQty}$$

---

## 7. MATRIKS CRASH RECOVERY PERSISTENCE BOUNDARIES

| Batas Crash | State di Storage | Analisis Bukti | Tindakan Recovery Deterministik | Status Dokumen & Lock State |
|---|---|---|---|---|
| **Boundary 1**:<br>Decision tersimpan, Intent belum ada. | Decision Record ada di `selection_approval_decisions`. Intent kosong. Jurnal kosong. | Ada keputusan Asisten, tapi proses terputus sebelum mutasi stok dimulai. | **Dilarang mutasi otomatis**. Tandai dokumen `APPROVAL_INTERRUPTED`. Saat Asisten membuka: validasi saldo terkini; jika cukup lanjutkan mutasi, jika kurang jalankan **Auto-Return (Opsi A)**. | Dokumen `APPROVAL_INTERRUPTED`. Saldo tidak berubah. Decision record utuh di audit log. |
| **Boundary 2**:<br>Intent ada tanpa Decision Record sah dan tanpa Jurnal. | Intent ada di `selection_mutation_intents`, Decision Record tidak ada, Jurnal tidak ada. | Intent yatim piatu (*orphan*) akibat crash sebelum otorisasi persisten. | **Tandai Intent `ABANDONED_ORPHAN`**. Catat ke audit trail. Dilarang mutasi stok. Kembalikan transaksi ke `SUBMITTED`. | Dokumen tetap `SUBMITTED`. Mutasi liar dicegah 100%. |
| **Boundary 3**:<br>Intent ada tanpa Decision Record, tetapi Jurnal SUDAH ADA. | Jurnal ada di disk tanpa bukti Decision Record sah Asisten. | **Anomali Kritis / Pelanggaran Otoritas**. | **KUNCI BATCH (`BATCH_LOCKED`)**. Tandai intent `CORRUPT_BREACH`. Tuntut audit investigasi manual. | Batch terkunci total. Operasi otomatis dihentikan. |
| **Boundary 4**:<br>Decision & Intent ada, Jurnal belum tersimpan. | Decision ada, Intent `IN_FLIGHT`, Jurnal belum ada di disk. | Terputus tepat sebelum commit jurnal. | Dokumen masuk status `APPROVAL_INTERRUPTED`. Intent ditandai `HALTED_RETRY_REQUIRED`. Memerlukan revalidasi saldo sebelum mutasi. | Dokumen `APPROVAL_INTERRUPTED`. Saldo belum terpotong. |
| **Boundary 5**:<br>Jurnal tersimpan, Materialized Balance / Status belum update. | Decision ada, Jurnal ada (`qtyOut = X`), Materialized Balance belum terpotong. | Jurnal sah bertanda tangan Asisten sudah committed. | **Forward Recovery Idempoten**: Reconciler menjalankan prosedur kanonis replay log, memperbarui materialized balance, dan menandai transaksi `DISETUJUI` + `APPLIED`. Intent `COMPLETED`. | Dokumen `DISETUJUI`. Saldo terpotong tepat 1 kali. Jurnal tidak diposting ulang. |
| **Boundary 6**:<br>Jurnal tersimpan tapi kuantitas tidak cocok dengan Decision. | Decision = 100 Pkk, Jurnal = 80 Pkk. | Terindikasi data korup / salah hitung. | **KUNCI BATCH (`BATCH_LOCKED`)**. Tandai intent `BREACH_TAMPERED`. Wajib audit manual. | Batch terkunci (`BATCH_LOCKED`). |
| **Boundary 7**:<br>Dua recovery memperebutkan batch sama (Multi-Tab boot). | Dua tab memicu startup recovery bersamaan. | Dilindungi Web Locks API. | Tab 1 memegang `lock:batch:{batchId}` dan menyelesaikan recovery. Tab 2 antre, lalu mendeteksi intent sudah `COMPLETED`, lalu keluar tanpa aksi (No-Op). | Terkoordinasi penuh tanpa race condition. |

---

## 8. INTEGRATION TEST PLAN LENGKAP (20 SKENARIO)

| ID | Skenario Pengujian | Precondition | Langkah Pengujian | Expected Result & Invariant | Sumber Modul Terlibat |
|---|---|---|---|---|---|
| **IT-01** | Mutasi baru memperoleh `batchSeq` unik di bawah lock | Batch aktif memiliki saldo 1.000 Pkk, seq awal = 2. | Eksekusi mutasi afkir disetujui (50 Pkk). | Jurnal baru terbentuk dengan `batchSeq = 3`. Saldo menjadi 950 Pkk. | `batch-inventory-service.js` |
| **IT-02** | Dua operasi bersamaan terhadap batch yang sama | Saldo batch 100 Pkk. Tab 1 minta afkir 80 Pkk, Tab 2 minta 60 Pkk. | Eksekusi approval bersamaan di kedua tab. | Tab 1 berhasil (sisa 20 Pkk). Tab 2 antre di Web Lock, lalu revalidasi gagal karena sisa 20 < 60 Pkk. Tab 2 menolak mutasi. Saldo akhir tetap 20 Pkk (tidak negatif). | `batch-inventory-service.js`, `navigator.locks` |
| **IT-03** | Web Locks tidak tersedia: Fail-Closed | Simulasikan runtime tanpa Web Locks (`navigator.locks = undefined`). | Coba jalankan approval transaksi. | Operasi ditolak seketika dengan `StockConcurrencyError`. Stok tidak berubah sama sekali ($\Delta \text{Balance} == 0$). | `batch-inventory-service.js` |
| **IT-04** | Timestamp jurnal sama tetapi sequence valid | Disuntikkan 2 entri jurnal dengan string `createdAt` identik tetapi `batchSeq` 3 dan 4. | Jalankan replay kanonis log. | Replay mengurutkan berdasarkan `batchSeq` secara stabil deterministik. Saldo hasil replay konsisten. | Reconciler kanonis |
| **IT-05** | Jurnal historis tanpa sequence yang tidak dapat dibuktikan urutannya | Batch memiliki jurnal lama tanpa sequence dan referensi saling silang tidak jelas. | Jalankan startup audit reconciler. | Sistem menolak menebak urutan, menghentikan replay otomatis, dan menandai batch `AUDIT_REQUIRED`. | Reconciler kanonis |
| **IT-06** | Idempotency key duplikat dengan payload identik | Permintaan approval kedua membawa `idempotencyKey` yang sudah ada di jurnal dengan data identik. | Jalankan mutasi. | Permintaan kedua diskip (`IDEMPOTENT_SKIPPED`). Tidak ada penambahan baris jurnal baru. | `batch-inventory-service.js` |
| **IT-07** | Idempotency key duplikat dengan payload berbeda | Jurnal sudah memiliki kunci `MUT-01` (qty 50), request baru datang dengan `MUT-01` (qty 70). | Jalankan mutasi. | Sistem mendeteksi konflik kunci, menolak eksekusi, dan mengunci batch (`BATCH_LOCKED`). | `batch-inventory-service.js` |
| **IT-08** | Baseline ganda dan baseline tidak valid | Disuntikkan `INITIAL_SOW` dan `MIGRATION_BASELINE` sekaligus ke satu batch. | Panggil pembacaan saldo batch. | Sistem mendeteksi `BASELINE_CONFLICT_ERROR`, menolak replay, dan mengunci batch (`BATCH_LOCKED`). | `batch-inventory-service.js` |
| **IT-09** | Jurnal negatif, field wajib hilang, dan sequence gap | Entri jurnal memiliki `qtyOut: -20` atau sequence melompat dari 3 ke 5. | Jalankan replay kanonis log. | Replay berhenti seketika, melempar error integritas, dan mengunci batch (`BATCH_LOCKED`). | Reconciler kanonis |
| **IT-10** | Replay berulang tidak mengubah saldo secara kumulatif | Batch aktif memiliki baseline 1.000 Pkk dan jurnal afkir 100 Pkk. | Jalankan replay kanonis sebanyak 5 kali berturut-turut. | Saldo akhir tetap stabil di 900 Pkk di seluruh 5 run pengujian. | Reconciler kanonis |
| **IT-11** | Batch replay tidak menimpa saldo bedengan | Replay batch dijalankan karena sinkronisasi jurnal dispatch global. | Periksa saldo operasional bedengan sebelum dan sesudah replay. | Saldo bedengan tidak berubah atau tertimpa oleh kalkulasi replay batch. | `selection-manager.js`, `batch-inventory-service.js` |
| **IT-12** | Mutasi dengan referensi bedengan memperbarui saldo operasional tepat satu kali | Seleksi afkir 40 Pkk disetujui pada Bed-01. | Eksekusi approval. | Saldo batch berkurang 40 Pkk, saldo alokasi Bed-01 berkurang 40 Pkk. Entri jurnal mencatat `bedenganId`. | `selection-manager.js` |
| **IT-13** | Dispatch, destruction, dan mutasi lain memakai lock konsisten | Batch aktif memproses transaksi Dispatch dan Destruction. | Panggil fungsi mutasi terkait. | Seluruh fungsi terverifikasi memanggil `executeStockMutationWithLock` dengan urutan lock leksikografis. | `dispatch-landing.js`, `destruction-manager.js` |
| **IT-14** | Crash boundary recovery di setiap tahapan persistence | Simulasikan crash pada Boundary 1 hingga Boundary 6. | Jalankan startup recovery reconciler. | Seluruh tindakan recovery persis mematuhi Matriks Crash Recovery (Bagian 7). | Reconciler kanonis |
| **IT-15** | Recovery berulang tidak menyebabkan double deduction | Jurnal sudah ada di disk, crash terjadi sebelum update materialized balance. | Jalankan recovery 3 kali berturut-turut. | Saldo terpotong tepat 1 kali pada run pertama; run kedua dan ketiga tidak memotong saldo lagi. | Reconciler kanonis |
| **IT-16** | Recovery atas jurnal tanpa otorisasi valid mengunci batch | Disuntikkan jurnal mutasi tanpa adanya Decision Record Asisten yang sah. | Jalankan startup recovery reconciler. | Sistem mendeteksi jurnal liar, membatalkan auto-commit, dan seketika mengunci batch (`BATCH_LOCKED`). | Reconciler kanonis, `dependency-guard.js` |
| **IT-17** | Pending transaction tidak cukup saldo pasca rekonsiliasi (Opsi A) | Status `APPROVAL_INTERRUPTED` (butuh 100 Pkk). Saldo saat ini tersisa 40 Pkk pasca koreksi opname. | Asisten klik *"Selesaikan Mutasi Tertunda"*. | Dokumen otomatis **DIKEMBALIKAN (AUTO-RETURN)** ke Mantri dengan audit trail. Tidak ada potongan stok. | `selection-manager.js`, Opsi A |
| **IT-18** | Pending transaction cukup saldo tetap menunggu approval normal | Status `SUBMITTED` dibekukan saat anomali aktif. Rekonsiliasi selesai, sisa saldo cukup. | Buka kunci anomali pasca BAP disahkan. | Transaksi kembali ke status `SUBMITTED` murni (unfrozen) dan siap ditinjau normal oleh Asisten. | `selection-landing.js`, `selection-manager.js` |
| **IT-19** | Saldo negatif atau ledger inkonsisten tetap terkunci | Mutasi dipaksa melebihi sisa stok yang tersedia. | Eksekusi mutasi. | Sistem melempar `StockIntegrityBreachError`, batch masuk status `BATCH_LOCKED`, tidak di-clamp ke nol. | `batch-inventory-service.js` |
| **IT-20** | Bug TDZ Seleksi II & III terverifikasi aman | Form Seleksi II dan Seleksi III dibuka tanpa bedengan teralokasi (`matchedBed = null`). | Panggil fungsi validasi form. | Validasi berjalan mulus tanpa melempar `ReferenceError: Cannot access 'existingBibitSelectedSum' before initialization`. | `selection-manager.js` (L4649 & L5213) |

---

## 9. DAFTAR FILE KANDIDAT BESERTA SCOPE PERUBAHAN

| File Path | Tanggung Jawab & Scope Perubahan | Alasan & Risiko |
|---|---|---|
| `js/modules/selection/selection-manager.js` | 1. Memperbaiki bug runtime TDZ baris 4649 dan 5213.<br>2. Mengintegrasikan two-phase commit persistence boundaries (Decision Record & Mutation Intent).<br>3. Menerapkan penanganan status `APPROVAL_INTERRUPTED` dan eksekusi Auto-Return Opsi A. | **Tinggi**: Modul transaksi inti seleksi. Perubahan TDZ menghilangkan crash runtime; approval flow diuji via IT-01 s.d IT-20. |
| `js/core/batch-inventory-service.js` | 1. Menghapus formula cacat `Math.max` (L211) dan silent clamp nol (L212).<br>2. Mengimplementasikan engine ledger tunggal berbasis baseline cutover + `batchSeq`.<br>3. Membungkus seluruh mutasi stok dengan Web Locks API koordinasi fail-closed.<br>4. Menyediakan reconciler log replay deterministik. | **Tinggi**: Jantung mutasi inventaris. Menghilangkan flaw double deduction secara tuntas. |
| `js/core/dependency-guard.js` | 1. Menambahkan guard API `assertBedenganNotLocked` dan `assertBatchNotLocked`.<br>2. Menolak submit form Mantri dan tombol approve Asisten jika target terkunci anomali. | **Sedang**: Proteksi kernel bisnis agar penguncian tidak dapat dibypass dari console browser. |
| `js/core/storage-registry.js` | Mendaftarkan 4 key baru dalam kategori `TRANSACTION`:<br>- `selection_approval_decisions`<br>- `selection_mutation_intents`<br>- `selection_stock_audits`<br>- `selection_anomaly_cases` | **Rendah**: Registri konfigurasi terpusat. |
| `js/modules/selection/selection-landing.js` | 1. Menyajikan visual badge `TERKUNCI: ANOMALI STOK`.<br>2. Menonaktifkan tombol approve transaksi yang berstatus `FROZEN`.<br>3. Menyediakan tombol Asisten *"Selesaikan Mutasi Tertunda"* untuk transaksi `APPROVAL_INTERRUPTED`. | **Sedang**: Antarmuka pengguna bagi Asisten dan Mantri. |

*(File `js/modules/maintenance/nursery-activity.js` tetap **DILINDUNGI PENUH DAN TIDAK DISENTUH**).*

---

## 10. BATASAN & PANDUAN UNTUK AGENT IMPLEMENTASI BERIKUTNYA

Agent yang ditugaskan untuk melakukan implementasi kode di masa mendatang **WAJIB MEMATUHI KETENTUAN BERIKUT**:
1. **Dilarang memulai coding sebelum ada perintah eksplisit approval implementasi dari Project Manager.**
2. **Dilarang menyentuh `js/modules/maintenance/nursery-activity.js`.**
3. **Dilarang menggunakan `git checkout .` atau `git reset --hard` sebagai prosedur rollback.** Rollback harus berbasis patch terbalik selektif hanya pada file yang diubah dalam task ini.
4. **Dilarang mengaktifkan fallback mutasi tanpa koordinasi lock jika Web Locks API tidak tersedia (wajib fail-closed).**
5. **Dilarang menghapus Decision Record Asisten demi alasan rollback teknis.**
6. **Dilarang menggunakan `Math.max(0, ...)` untuk menyembunyikan saldo negatif.**
7. **Dilarang mengarang formula alokasi stok untuk atribut yang belum didukung schema master.**
8. **Seluruh 20 skenario Integration Test wajib diverifikasi di runtime setelah implementasi selesai.**
