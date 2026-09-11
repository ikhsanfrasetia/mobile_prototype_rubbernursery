# PLAN: LANDING PAGE "PERMINTAAN BIBIT" ROLE PENGURUS

**Dokumen Perencanaan Teknis & Arsitektur**  
**Role:** Pengurus (Pengurus Kebun Peminta)  
**Menu Utama:** Permintaan Bibit  
**Mode:** READ-ONLY / IMPLEMENTATION PLAN ONLY  
**Tanggal:** 12 September 2026  

---

## 1. Current State

Saat ini, pada Beranda Role Pengurus ([beranda.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/modules/dashboard/beranda.js#L66-L70)), telah tersedia 3 card menu utama:
1. `Penerimaan` (Route: `/reception`)
2. `Permintaan Bibit` (Route: `/request`)
3. `Pengeluaran Bibit` (Route: `/request`)

Ketika pengguna dengan role `PENGURUS` menekan card **[ Permintaan Bibit ]**, router saat ini menavigasikan aplikasi ke hash route `#/request`. Pada rute tersebut, aplikasi masih menampilkan generic placeholder **"Modul Sedang Dianalisis" / "DALAM PENGEMBANGAN"** yang dirender oleh `renderAnalysisPlaceholder` ([analysis-placeholder.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/modules/placeholder/analysis-placeholder.js#L20)).

Tujuan dari plan ini adalah merancang Landing Page khusus menu **Permintaan Bibit** untuk Role Pengurus yang berfungsi sebagai menu selector (hub) menuju 4 sub-menu operasional.

---

## 2. Existing Route

### Audit Rute `/request`
- **Registrasi Rute ([app.js:93](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/app.js#L93)):**
  ```javascript
  registerRoute('/request', renderAnalysisPlaceholder);
  ```
- **Handler Router ([router.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/core/router.js)):**
  Menggunakan hash navigation window listener (`window.addEventListener('hashchange', ...)`).
- **Renderer Eksisting:**
  `renderAnalysisPlaceholder` ([analysis-placeholder.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/modules/placeholder/analysis-placeholder.js)).

### Mapping Transisi Rute:
- **CURRENT:** `/request` &rarr; `renderAnalysisPlaceholder` (Placeholder analisis generik)
- **TARGET:** `/request` &rarr; `renderRequestLanding` (Dispatching: Jika role `PENGURUS`, merender Landing Page Permintaan Bibit Pengurus dengan 4 sub-menu card; jika role lain/Mantri, fallback sesuai izin/placeholder).

---

## 3. Existing Components (Daftar Komponen Siap Pakai / Reuse)

Untuk mempertahankan konsistensi visual 100% tanpa membuat design system baru, landing page akan menggunakan kembali (*reuse*) komponen & token CSS existing:

1. **Layout & Container:**
   - `.page` & `.beranda-page` ([pages.css](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/css/pages.css#L801)): Container mobile screen frame dengan flexbox column.
   - `.beranda-body` ([pages.css](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/css/pages.css#L850)): Area body yang scrollable dengan padding standar (`12px 10px 14px`).
2. **Header Komponen:**
   - `.beranda-header` ([pages.css](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/css/pages.css#L827)): Header putih dengan tombol hamburger sidebar & judul halaman.
   - Tombol Drawer Hamburger: `#beranda-drawer-btn` mengikat event `openDrawer()` dari [drawer.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/components/drawer.js).
3. **Menu Grid & Cards:**
   - `.beranda-grid` ([pages.css](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/css/pages.css#L858)): CSS Grid responsif (dapat disesuaikan menjadi 2 kolom `grid-template-columns: repeat(2, 1fr)` atau grid standar untuk menampung 4 card secara simetris).
   - `.beranda-menu-card` ([pages.css](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/css/pages.css#L866)): Card putih dengan border `#e2e8f0`, border-radius `12px`, shadow halus, serta efek hover & active.
   - `.beranda-card-icon` ([pages.css](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/css/pages.css#L895)): Container icon SVG proporsional tanpa background box.
   - `.beranda-card-title` ([pages.css](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/css/pages.css#L913)): Teks judul warna hijau Socfindo (`#116834`), font-weight 700.
4. **Icon System:**
   - Menggunakan format SVG vector monokrom inline dengan stroke/fill hijau (`#116834`) konsisten dengan icon `documentPlus` dan `sprout`.

---

## 4. Existing Data Layer (Audit Kesiapan Storage)

Meskipun tahap Landing Page belum mengeksekusi mutasi database, audit terhadap data layer existing telah dilakukan untuk memastikan kesiapan integrasi tahap lanjutan:

1. **Object Store IndexedDB ([indexeddb.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/db/indexeddb.js#L38)):**
   - Store `'requests'` sudah terdaftar secara resmi di `STORES` IndexedDB `sigma-nursery-db`.
2. **Repository Abstraction ([repositories.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/db/repositories.js#L79)):**
   - `requestRepository = createRepository('requests')` sudah tersedia untuk operasi CRUD IndexedDB.
3. **Local Storage Key ([transaction-manager.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/modules/transactions/transaction-manager.js#L143)):**
   - Key `'requests_transactions'` digunakan sebagai fallback offline cache transaksi.
4. **Transaction Manager Config ([transaction-manager.js:138-147](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/modules/transactions/transaction-manager.js#L138-L147)):**
   - Modul `request` telah terkonfigurasi dengan unit `'Pkk'`, field `qtyDispatched`, dan ikon dokumen.

---

## 5. Role & Access

- **Target Otorisasi:** `ROLES.PENGURUS` (`'PENGURUS'`)
- **Single Source of Truth Role:** `ROLE_LABELS.PENGURUS` &rarr; `"Pengurus"` ([permissions.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/core/permissions.js#L24))
- **Session Check:** `session.getRole() === ROLES.PENGURUS`
- **Isolasi Role:**
  - Jika Pengurus membuka `/request`, tampilkan Landing Page Permintaan Bibit Pengurus.
  - Jika role selain Pengurus (misal Mantri Bibitan) membuka `/request`, arahkan ke modul transaksi atau placeholder terkait tanpa merusak alur role lain.

---

## 6. Sub-Menu Structure (4 Card Utama)

Landing Page Permintaan Bibit Role Pengurus memiliki tepat **4 Sub-Menu** sesuai baseline:

```
┌─────────────────────────────────────────────────────────┐
│                     PERMINTAAN BIBIT                    │
├────────────────────────────┬────────────────────────────┤
│ [ Card 1 ]                 │ [ Card 2 ]                 │
│ Icon: Dokumen SPB          │ Icon: Mata Entres          │
│ Judul:                     │ Judul:                     │
│ Buat Permintaan            │ Buat Permintaan            │
│ Bibit Kebun Sepupu         │ Mata Entres                │
├────────────────────────────┼────────────────────────────┤
│ [ Card 3 ]                 │ [ Card 4 ]                 │
│ Icon: Approval Check/Doc   │ Icon: Approval Kebun Asal  │
│ Judul:                     │ Judul:                     │
│ Persetujuan Permintaan     │ Persetujuan Permintaan     │
│ Bibit Kebun Sepupu         │ Bibit Kebun Asal           │
└────────────────────────────┴────────────────────────────┘
```

### Rincian Sub-Menu:
1. **Buat Permintaan Bibit Kebun Sepupu**
   - *Tujuan:* Pengajuan SPB bibit tanaman karet antar-kebun sepupu ([RN-RCV-KSP016](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/data/process-mapping-baseline.js#L5338)).
2. **Buat Permintaan Mata Entres**
   - *Tujuan:* Pengajuan SPB mata entres karet untuk kebutuhan okulasi/penanaman ([RN-RCV-ME022](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/data/process-mapping-baseline.js#L5448)).
3. **Persetujuan Permintaan Bibit Kebun Sepupu**
   - *Tujuan:* Peninjauan & approval alokasi kuota permintaan bibit kebun sepupu.
4. **Persetujuan Permintaan Bibit Kebun Asal**
   - *Tujuan:* Peninjauan & approval alokasi bibit dari kebun asal/induk.

---

## 7. Navigation Mapping

| No | Sub-Menu Label | Existing Route | Planned Target Route | Planned Renderer | Status Rute |
|:---:|:---|:---:|:---:|:---|:---:|
| 1 | **Buat Permintaan Bibit Kebun Sepupu** | Belum Ada | `/request/kebun-sepupu/form` | `renderAnalysisPlaceholder` / Form (Next Task) | *Planned* |
| 2 | **Buat Permintaan Mata Entres** | Belum Ada | `/request/mata-entres/form` | `renderAnalysisPlaceholder` / Form (Next Task) | *Planned* |
| 3 | **Persetujuan Permintaan Bibit Kebun Sepupu** | Belum Ada | `/request/approval/kebun-sepupu` | `renderAnalysisPlaceholder` / Approval (Next Task) | *Planned* |
| 4 | **Persetujuan Permintaan Bibit Kebun Asal** | Belum Ada | `/request/approval/kebun-asal` | `renderAnalysisPlaceholder` / Approval (Next Task) | *Planned* |

> *Catatan Tahap Plan:* Pada saat landing page diimplementasikan nanti, klik pada card dapat menampilkan toast informasi atau membuka rute placeholder terarah sambil menunggu pengerjaan form spesifik di task berikutnya.

---

## 8. UI Implementation Plan (Layout & Markup Blueprint)

### Struktur HTML Blueprint:
```html
<div class="page beranda-page request-landing-page">
  <!-- Header Konsisten dengan Beranda -->
  <header class="beranda-header">
    <button class="beranda-menu-btn" id="request-drawer-btn" type="button" aria-label="Menu">
      <svg viewBox="0 0 24 24" width="26" height="26" stroke="#116834" stroke-width="2.2" fill="none" stroke-linecap="round">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    </button>
    <h1 class="beranda-header-title">Permintaan Bibit</h1>
  </header>

  <!-- Body Grid (2 Kolom / 4 Kartu) -->
  <main class="beranda-body">
    <div class="request-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; max-width: 320px; margin: 0 auto;">
      <!-- Card 1 -->
      <button class="beranda-menu-card" data-sub-menu="create-ksp" style="width: 100%; height: 120px;">
        <div class="beranda-card-icon">${ICONS.spbBibit}</div>
        <div class="beranda-card-title">Buat Permintaan<br>Bibit Kebun Sepupu</div>
      </button>
      <!-- Card 2 -->
      <button class="beranda-menu-card" data-sub-menu="create-me" style="width: 100%; height: 120px;">
        <div class="beranda-card-icon">${ICONS.spbEntres}</div>
        <div class="beranda-card-title">Buat Permintaan<br>Mata Entres</div>
      </button>
      <!-- Card 3 -->
      <button class="beranda-menu-card" data-sub-menu="approve-ksp" style="width: 100%; height: 120px;">
        <div class="beranda-card-icon">${ICONS.approveKsp}</div>
        <div class="beranda-card-title">Persetujuan Permintaan<br>Bibit Kebun Sepupu</div>
      </button>
      <!-- Card 4 -->
      <button class="beranda-menu-card" data-sub-menu="approve-asal" style="width: 100%; height: 120px;">
        <div class="beranda-card-icon">${ICONS.approveAsal}</div>
        <div class="beranda-card-title">Persetujuan Permintaan<br>Bibit Kebun Asal</div>
      </button>
    </div>
  </main>
</div>
```

---

## 9. File yang Akan Diubah (Saat Tahap Implementasi Nanti)

1. [js/app.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/app.js):
   - Import `renderRequestLanding`.
   - Update registrasi `registerRoute('/request', renderRequestLanding);`.
2. [css/pages.css](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/css/pages.css):
   - Menambahkan utility styling minor `.request-grid` jika diperlukan tanpa mengubah styling global yang ada.

---

## 10. File yang Akan Dibuat (Saat Tahap Implementasi Nanti)

1. `js/modules/request/request-landing.js`
   - Berisi fungsi `renderRequestLanding()` yang mengecek role sesi Pengurus, merender 4 action card, dan mengikat handler event drawer & navigasi.

---

## 11. Dependency

- [js/core/session.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/core/session.js) &rarr; untuk membaca role aktif pengguna.
- [js/core/permissions.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/core/permissions.js) &rarr; untuk konstanta `ROLES.PENGURUS` dan `ROLE_LABELS`.
- [js/core/router.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/core/router.js) &rarr; untuk navigasi `navigate()`.
- [js/components/drawer.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/components/drawer.js) &rarr; untuk sidebar drawer toggle.
- [js/components/toast.js](file:///d:/PROJECT%20SOCFINDO/DATA%20SOCFIN/Project%20SIGMA/sigma-nursery/js/components/toast.js) &rarr; untuk feedback interaksi menu.

---

## 12. Scope Boundary (Batasan Ketat)

### DILARANG DALAM TAHAP INI & IMPLEMENTASI LANDING PAGE:
- ❌ Membuat form input permohonan SPB.
- ❌ Mengimplementasikan approval workflow / verifikasi digital.
- ❌ Membuat transaksi baru atau mutasi storage.
- ❌ Mengubah skema IndexedDB atau `requestRepository`.
- ❌ Mengubah business rule kuota / replanting.
- ❌ Mengubah tampilan atau card Beranda Pengurus yang sudah di-approve.
- ❌ Mengubah common flow (VPN, Login, Splash, Sync).
- ❌ Mengubah Service Worker cache strategy.

---

## 13. Acceptance Criteria

Halaman Landing Page Permintaan Bibit dinyatakan valid apabila:
1. Pengguna masuk sebagai role `Pengurus` &rarr; Beranda Pengurus &rarr; klik card `Permintaan Bibit` &rarr; halaman `/request` terbuka.
2. Halaman menampilkan judul header: **"Permintaan Bibit"** dengan tombol drawer hamburger di sebelah kiri.
3. Halaman menampilkan tepat **4 card menu**:
   - `Buat Permintaan Bibit Kebun Sepupu`
   - `Buat Permintaan Mata Entres`
   - `Persetujuan Permintaan Bibit Kebun Sepupu`
   - `Persetujuan Permintaan Bibit Kebun Asal`
4. Gaya visual card identik dengan baseline approved: card putih, ikon hijau monokrom, teks hijau (#116834), tanpa background kotak pada icon.
5. Tombol hamburger membuka sidebar drawer existing dengan benar.
6. Tidak ada error console di browser dan tidak ada regresi pada role Mantri/Asisten.

---

## 14. Risk / Potential Conflict

| Potensi Risiko | Mitigasi |
|:---|:---|
| **Rute `/request` dipakai bersama oleh role lain (misal Mantri atau Asisten)** | `renderRequestLanding` akan memeriksa `user.role`. Jika bukan `PENGURUS`, arahkan ke view yang sesuai atau tampilkan placeholder terarah tanpa merusak flow role lain. |
| **Penumpukan teks pada grid card 2 kolom** | Card menggunakan `min-height`, `letter-spacing: -0.015em`, dan `font-size: 0.74rem - 0.76rem` dengan line break `<br>` yang rapi sesuai acuan `pages.css`. |
| **Service Worker Browser Cache** | Modul baru diimpor melalui `app.js` dan didaftarkan pada route table standar. |
