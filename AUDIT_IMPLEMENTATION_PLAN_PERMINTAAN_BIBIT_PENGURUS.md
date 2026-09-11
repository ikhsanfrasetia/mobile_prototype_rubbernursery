# AUDIT & IMPLEMENTATION PLAN
# LANDING PAGE PERMINTAAN BIBIT — ROLE PENGURUS

**Dokumen:** Audit Komprehensif & Rencana Implementasi Landing Page Permintaan Bibit  
**Target Role:** `PENGURUS` (Pengurus Kebun / Pengurus Kebun Peminta)  
**Menu Utama:** Permintaan Bibit  
**Mode:** READ-ONLY / AUDIT + IMPLEMENTATION PLAN (NO CODE CHANGE)  
**Tanggal:** 12 September 2026  
**Status Baseline:** MASTER BASELINE CURRENT LOCKED  

---

## 1. Objective

Melakukan audit mendalam terhadap seluruh aset rute, komponen UI, requirement baseline, process flow nodes, data store, dan matriks kewenangan terkait menu **Permintaan Bibit** untuk Role **Pengurus**. 

Dokumen ini menyusun **Implementation Plan** formal yang aman dan presisi untuk membangun Landing Page Permintaan Bibit sebagai turunan dari card `[ Permintaan Bibit ]` pada Beranda Pengurus yang telah di-approve, tanpa mengubah perilaku aplikasi eksisting atau mengarang aturan bisnis.

---

## 2. Current State

1. **Beranda Pengurus (Final & Approved):**
   - Header putih (`#FFFFFF`), icon hamburger hijau (`#116834`), judul `"Beranda"` hitam.
   - 3 Card Menu dalam 1 baris: `[ Penerimaan ]` (`/reception`), `[ Permintaan Bibit ]` (`/request`), `[ Pengeluaran Bibit ]` (`/request`).
   - Tidak ada header greeting, tidak ada widget statistik tambahan.
2. **Kondisi Aktual Rute `/request`:**
   - Ketika Pengurus menekan card `[ Permintaan Bibit ]`, router mengarah ke `#/request`.
   - Rute `/request` saat ini mengeksekusi `renderAnalysisPlaceholder` ([analysis-placeholder.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/modules/placeholder/analysis-placeholder.js#L20)), menampilkan layar *"Modul Sedang Dianalisis"*.
3. **Kebutuhan Bisnis Terencana:**
   - Bisnis merancang 4 sub-menu di bawah Permintaan Bibit:
     1. *Buat Permintaan Bibit Kebun Sepupu*
     2. *Buat Permintaan Mata Entres*
     3. *Persetujuan Permintaan Bibit Kebun Sepupu*
     4. *Persetujuan Permintaan Bibit Kebun Asal*

---

## 3. Existing Route Audit

| Atribut Audit | Temuan pada Codebase Aktual |
|:---|:---|
| **Route Registration** | [app.js:93](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/app.js#L93): `registerRoute('/request', renderAnalysisPlaceholder);` |
| **Route Handler** | [router.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/core/router.js): Hash-based router listener `#/request`. |
| **Renderer Eksisting** | `renderAnalysisPlaceholder` ([analysis-placeholder.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/modules/placeholder/analysis-placeholder.js)). |
| **Penggunaan Role Lain** | Card `Pengeluaran` pada Beranda Mantri Bibitan ([beranda.js:63](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/modules/dashboard/beranda.js#L63)) juga mengarah ke `/request`. |
| **Evaluasi Kebutuhan** | Rute `/request` **BUKAN** modul transaksi penuh saat ini, melainkan **Placeholder Hub**. Perlu dibuat **Landing Page Renderer Baru** (`renderRequestLanding`) yang membedakan tampilan berdasarkan peran (`user.role`). |

---

## 4. Existing Component Audit (Reusability Matrix)

| Komponen / Style | File Sumber | Klasifikasi | Rencana Penggunaan |
|:---|:---|:---:|:---|
| `.page`, `.beranda-page` | [pages.css:801](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/css/pages.css#L801) | REUSE ONLY | Container frame mobile HP |
| `.beranda-header` | [pages.css:827](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/css/pages.css#L827) | REUSE ONLY | Header putih dengan judul `"Permintaan Bibit"` |
| `#beranda-drawer-btn` | [drawer.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/components/drawer.js) | REUSE ONLY | Tombol hamburger hijau pemanggil `openDrawer()` |
| `.beranda-body` | [pages.css:850](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/css/pages.css#L850) | REUSE ONLY | Area konten scrollable padding standar |
| `.beranda-menu-card` | [pages.css:866](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/css/pages.css#L866) | REUSE ONLY | Card putih, border `#e2e8f0`, shadow halus |
| `.beranda-card-icon` | [pages.css:895](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/css/pages.css#L895) | REUSE ONLY | Container ikon SVG monokrom tanpa background circle |
| `.beranda-card-title` | [pages.css:913](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/css/pages.css#L913) | REUSE ONLY | Typography warna hijau `#116834`, font-weight 700 |
| `.request-grid` | [pages.css](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/css/pages.css) | MAY MODIFY | Grid 2-kolom simetris untuk menampung 4 card |

---

## 5. Requirement Mapping (Baseline Traceability)

Berdasarkan *Master Baseline Final* ([process-mapping-baseline.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/data/process-mapping-baseline.js)):

| Requirement ID | Aktor Baseline | Deskripsi Kebutuhan Bisnis | Sub-Menu Terkait | Status Keterkaitan |
|:---|:---|:---|:---|:---:|
| `RN-RCV-KSP016` | **Pengurus Kebun Peminta** | Mengajukan SPB bibit karet untuk penanaman di kebun. | Buat Permintaan Bibit Kebun Sepupu | ✅ **CONFIRMED** |
| `RN-RCV-KSP017` | **Asisten Kepala** | Meninjau permintaan bibit dan memeriksa ketersediaan stok bibit siap salur. | Alur Review Kebun Asal | ℹ️ Aktor: ASKEP |
| `RN-RCV-KSP018` | **Asisten Kepala** | Stok cukup: Approve & teruskan; Stok tidak cukup: Koreksi/Batalkan. | Persetujuan Permintaan Bibit | ⚠️ Aktor: ASKEP |
| `RN-RCV-KSP019` | **Mantri Bibitan** | Mengeksekusi muat bibit kebun sepupu sesuai kuota SPB. | Alur Pengeluaran | ℹ️ Aktor: MANTRI |
| `RN-RCV-KSP020` | **Pengurus Kebun Peminta** | Menerima bibit di lokasi tanam, memeriksa fisik, dan mengonfirmasi. | Penerimaan Lapangan | ℹ️ Modul Penerimaan |
| `RN-RCV-KSP021` | **Pengurus Kebun Peminta** | Status Terpenuhi setelah total quantity dan shipment tuntas. | Lifecycle Transaksi | ℹ️ Lifecycle Transaksi |
| `RN-RCV-ME022` | **Pengurus Kebun Peminta** | Mengajukan SPB mata entres karet untuk penanaman di kebun. | Buat Permintaan Mata Entres | ✅ **CONFIRMED** |
| `RN-RCV-ME023` | **Asisten Kepala** | Meninjau permintaan mata entres dan memeriksa ketersediaan stok. | Alur Review Kebun Asal | ℹ️ Aktor: ASKEP |
| `RN-RCV-ME024` | **Asisten Kepala** | Stok cukup: Approve & teruskan; Stok tidak cukup: Koreksi/Batalkan. | Persetujuan Permintaan Mata Entres | ⚠️ Aktor: ASKEP |
| `RN-RCV-ME025` | **Mantri Bibitan** | Memotong dan mengemas mata entres berdasarkan otorisasi. | Alur Pengeluaran | ℹ️ Aktor: MANTRI |
| `RN-RCV-ME026` | **Pengurus Kebun Peminta** | Menerima mata entres di lokasi tanam dan verifikasi fisik. | Penerimaan Lapangan | ℹ️ Modul Penerimaan |
| `RN-RCV-ME027` | **Pengurus Kebun Peminta** | Seluruh tahapan permohonan mata entres tuntas terverifikasi. | Lifecycle Transaksi | ℹ️ Lifecycle Transaksi |

---

## 6. Flow Mapping (Inter-Estate & Actor Segregation)

```
[ KEBUN PEMINTA ]                                  [ KEBUN ASAL / NURSERY ]
-----------------                                  ------------------------
Pengurus Kebun Peminta                             Asisten Kepala (ASKEP)
      │                                                      │
      ├─► 1. Buat SPB Bibit (RN-RCV-KSP016)                  │
      ├─► 2. Buat SPB Entres (RN-RCV-ME022)                  │
      │        │                                             │
      │        └──────────────( Kirim SPB )─────────────────►│
      │                                                      ├─► 3. Review & Cek Stok (KSP017 / ME023)
      │                                                      ├─► 4. APPROVAL / Koreksi (KSP018 / ME024)
      │                                                      │        │
      │                                            Mantri Bibitan     │
      │                                                  │            │
      │                                                  ├─► 5. Muat / Kemas Bibit (KSP019 / ME025)
      │                                                  │        │
      │◄────────────────( Pengiriman Armada )────────────┴────────┘
      │
Pengurus Kebun Peminta
      │
      ├─► 6. Terima Fisik & Konfirmasi (RN-RCV-KSP020 / ME026)
      └─► 7. Status SPB: Terpenuhi (RN-RCV-KSP021 / ME027)
```

---

## 7. Sub-Menu Validation (Hasil Audit 4 Item)

| Sub-Menu | Requirement Baseline | Aktor Utama | Status Evidence | Catatan Audit & Rekomendasi |
|:---|:---:|:---:|:---:|:---|
| **1. Buat Permintaan Bibit Kebun Sepupu** | `RN-RCV-KSP016` | Pengurus Kebun Peminta | **CONFIRMED** ✅ | Valid. Pengurus berwenang menginput form permohonan SPB bibit. |
| **2. Buat Permintaan Mata Entres** | `RN-RCV-ME022` | Pengurus Kebun Peminta | **CONFIRMED** ✅ | Valid. Pengurus berwenang menginput form permohonan SPB mata entres. |
| **3. Persetujuan Permintaan Bibit Kebun Sepupu** | `RN-RCV-KSP018` | Asisten Kepala (Baseline) | **NEEDS CLARIFICATION** ⚠️ | Pada baseline, approval operasional dilakukan oleh `ASKEP`. Untuk role Pengurus, card ini direkomendasikan sebagai **Daftar / Monitoring Status Permintaan (Read-Only Tracking)** kecuali jika ada pendelegasian otorisasi persetujuan tingkat Pengurus Kebun Asal. |
| **4. Persetujuan Permintaan Bibit Kebun Asal** | `RN-RCV-ME024` | Asisten Kepala (Baseline) | **NEEDS CLARIFICATION** ⚠️ | Sama halnya dengan item 3, approval stok berada di `ASKEP`. Pada tahap Landing Page, card tetap disediakan sebagai selector navigasi tanpa mengeksekusi mutasi approval. |

---

## 8. Role & Permission Audit

- **Role Key:** `ROLES.PENGURUS` (`'PENGURUS'`)
- **Display Label:** `ROLE_LABELS.PENGURUS` &rarr; `"Pengurus"` ([permissions.js:24](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/core/permissions.js#L24))
- **Capabilities Eksisting:** `['transaction:view', 'monitor:process', 'approval:future']`
- **Route Guard Strategy:**
  - Saat route `/request` diakses:
    - Jika `session.getRole() === ROLES.PENGURUS` &rarr; Tampilkan `renderRequestLanding()` (Landing Page Permintaan Bibit Pengurus).
    - Jika `session.getRole() === ROLES.MANTRI_TANAMAN` &rarr; Tampilkan placeholder atau rute pengeluaran mantri tanpa konflik.

---

## 9. Data & Storage Audit

| Aset Data Layer | Status di Codebase | Keterangan |
|:---|:---:|:---|
| **IndexedDB Store `requests`** | **EXISTING** ✅ | Terdaftar di `STORES` ([indexeddb.js:38](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/db/indexeddb.js#L38)) |
| **Repository `requestRepository`** | **EXISTING** ✅ | Terdaftar di [repositories.js:79](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/db/repositories.js#L79) |
| **LocalStorage `requests_transactions`** | **DORMANT** 🟡 | Terkonfigurasi di `transaction-manager.js`, belum ada data seeded |
| **Master Estates & Divisions** | **EXISTING** ✅ | Tersedia via `estateRepository` & `divisionRepository` |
| **Master Clones & Growth Stages** | **EXISTING** ✅ | Tersedia via `cloneRepository` & `growthStageRepository` |

---

## 10. UI/UX Recommendation

Direkomendasikan menggunakan layout **Grid 2-Kolom Simetris (2x2)** yang identik dengan card Beranda:

```
┌──────────────────────────────────────────────┐
│  [☰]  Permintaan Bibit                       │
├──────────────────────────────────────────────┤
│                                              │
│  ┌────────────────────┐ ┌──────────────────┐ │
│  │      [ ICON ]      │ │     [ ICON ]     │ │
│  │  Buat Permintaan   │ │  Buat Permintaan │ │
│  │    Bibit Kebun     │ │    Mata Entres   │ │
│  │      Sepupu        │ │                  │ │
│  └────────────────────┘ └──────────────────┘ │
│                                              │
│  ┌────────────────────┐ ┌──────────────────┐ │
│  │      [ ICON ]      │ │     [ ICON ]     │ │
│  │    Persetujuan     │ │    Persetujuan   │ │
│  │  Permintaan Bibit  │ │  Permintaan Bibit│ │
│  │    Kebun Sepupu    │ │    Kebun Asal    │ │
│  └────────────────────┘ └──────────────────┘ │
│                                              │
└──────────────────────────────────────────────┘
```

**Spesifikasi Card:**
- Background card putih murni (`#FFFFFF`), border `#e2e8f0`, border radius `12px`.
- Icon vector SVG monokrom warna hijau Socfindo (`#116834`), ukuran `44x44px`, tanpa background lingkaran.
- Teks label warna hijau `#116834`, font size `0.76rem`, font weight `700`, line-height `1.2`.

---

## 11. Proposed Route Structure

| Sub-Menu | Target Rute | Status Handler Tahap 1 |
|:---|:---|:---:|
| **Root Landing Hub** | `/request` | `renderRequestLanding` |
| **1. Buat Permintaan Bibit Kebun Sepupu** | `/request/kebun-sepupu/form` | *Placeholder / Toast Navigasi* |
| **2. Buat Permintaan Mata Entres** | `/request/mata-entres/form` | *Placeholder / Toast Navigasi* |
| **3. Persetujuan Permintaan Bibit Kebun Sepupu** | `/request/approval/kebun-sepupu` | *Placeholder / Toast Navigasi* |
| **4. Persetujuan Permintaan Bibit Kebun Asal** | `/request/approval/kebun-asal` | *Placeholder / Toast Navigasi* |

---

## 12. Proposed Screen Structure

Modul baru `js/modules/request/request-landing.js`:
- Mengimpor `session`, `ROLE_LABELS`, `ROLES`, `navigate`, `openDrawer`, `toast`.
- Memvalidasi sesi `user.role === ROLES.PENGURUS`.
- Merender markup `.page.beranda-page.request-landing-page`.
- Mengikat event listener drawer dan delegasi navigasi 4 card.

---

## 13. File Impact Analysis

| File Path | Kategori Dampak | Alasan Perubahan |
|:---|:---:|:---|
| `js/modules/request/request-landing.js` | **MUST CREATE** | Modul landing page baru Permintaan Bibit Pengurus |
| [js/app.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/app.js) | **MUST MODIFY** | Registrasi rute `/request` ke `renderRequestLanding` |
| [css/pages.css](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/css/pages.css) | **MAY MODIFY** | Utility styling grid 2 kolom `.request-grid` |
| [js/components/drawer.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/components/drawer.js) | **REUSE ONLY** | Sidebar navigasi dipanggil tanpa modifikasi |
| [js/core/permissions.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/core/permissions.js) | **DO NOT MODIFY** | Layer RBAC sudah stabil |
| [js/modules/dashboard/beranda.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/modules/dashboard/beranda.js) | **DO NOT MODIFY** | Beranda Pengurus sudah approved |

---

## 14. Implementation Phases

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: Landing Page Shell & Route Hub                    │
│ - Buat js/modules/request/request-landing.js                │
│ - Hubungkan route /request di app.js                        │
│ - Render 4 card menu 2x2 grid simetris                      │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ PHASE 2: Sub-Menu Action Binding                            │
│ - Hubungkan event click tiap card                           │
│ - Tampilkan feedback toast/placeholder terarah               │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ PHASE 3: Data Layer Preparation (Next Task)                 │
│ - Integrasi requestRepository untuk data SPB                │
│ - Pengisian master kebun & klon pada dropdown               │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│ PHASE 4: Form & Transaction Implementation (Future Task)    │
│ - Pembuatan Form SPB Bibit (RN-RCV-KSP016)                  │
│ - Pembuatan Form SPB Entres (RN-RCV-ME022)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 15. Risk & Dependency

| Risiko | Level | Mitigasi |
|:---|:---:|:---|
| **Multi-Role Collision pada `/request`** | Medium | `renderRequestLanding` memeriksa `user.role`. Jika bukan `PENGURUS`, arahkan ke fallback view sesuai role. |
| **Ambiguitas Approval Authority** | Medium | Tidak mengeksekusi logika mutasi approval pada tahap landing page; hanya menyediakan entry point visual. |
| **Service Worker Cache Stale** | Low | Modul diimpor langsung via ES Module graph di `app.js`. |

---

## 16. Acceptance Criteria

1. **Navigasi Beranda:** Dari Beranda Pengurus, klik `[ Permintaan Bibit ]` berhasil masuk ke `/request`.
2. **Visual Header:** Header putih, hamburger hijau berfungsi membuka drawer, judul `"Permintaan Bibit"`.
3. **Sub-Menu Items:** Menampilkan tepat 4 card menu dalam grid 2x2.
4. **Visual Style Card:** Card putih, border `#e2e8f0`, icon SVG hijau monokrom tanpa background circle, teks hijau `#116834`.
5. **No Regression:** Beranda Mantri Bibitan dan alur login tetap berjalan normal tanpa error di console.

---

## 17. Open Questions

1. **Otorisasi "Persetujuan":** Apakah role Pengurus akan memiliki wewenang approval SPB Kebun Asal di masa depan, ataukah kedua menu persetujuan berfungsi sebagai *Monitoring Status Permintaan* bagi Pengurus Peminta? *(Dapat diputuskan sebelum implementasi Form di Phase 4)*.

---

## 18. Final Recommendation

Implementasi Landing Page Permintaan Bibit dinyatakan **AMAN DAN SIAP DIJALANKAN (READY FOR IMPLEMENTATION)** karena scope dibatasi secara ketat pada **menu selector (Hub UI)** tanpa menyentuh mutasi database atau workflow approval yang masih membutuhkan klarifikasi.
