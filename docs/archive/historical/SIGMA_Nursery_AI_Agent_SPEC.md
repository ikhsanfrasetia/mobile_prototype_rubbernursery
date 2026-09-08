# SIGMA NURSERY — AI AGENT PROJECT SPECIFICATION

> **Tujuan file ini:** menjadi single source of truth untuk AI Agent di VS Code.
> Agent harus membaca file ini sebelum membuat struktur, stack, fondasi PWA, database lokal, routing, role, workflow, dan modul.

---

## 1. Identitas Proyek

**Nama:** Sigma Nursery

**Platform prototype:** Mobile-first Progressive Web App (PWA)

**Tujuan prototype:**
1. Menggambarkan proses bisnis pembibitan.
2. Memvalidasi requirement dengan user.
3. Menjadi media demo kepada pihak user.

Prototype harus terasa seperti aplikasi Android, tetapi berjalan di browser dan dapat di-install sebagai PWA.

Fase awal **tanpa backend**. Seluruh simulasi menggunakan data lokal browser.

---

## 2. Role

Role utama:
- Mantri Tanaman
- Asisten
- Askep
- Pengurus

Semua role wajib memiliki:

```text
Splash Screen
    ↓
Login
    ↓
Sinkronisasi
    ↓
Beranda
```

Role menentukan menu dan kewenangan.

---

## 3. Stack

Gunakan stack minimal dependency:

- HTML5
- CSS3
- Vanilla JavaScript ES Modules
- IndexedDB untuk database utama
- localStorage untuk session/config kecil
- PWA Manifest
- Service Worker
- `navigator.mediaDevices.getUserMedia()` untuk kamera
- `navigator.geolocation` untuk lokasi

Development:
- VS Code
- Browser modern
- Chrome Android untuk demo

**Jangan menggunakan React, Vue, Angular, jQuery, Bootstrap, atau framework UI besar pada fase prototype.**

---

## 4. Arsitektur

Gunakan layer:

```text
Presentation
    ↓
Application / Workflow
    ↓
Repository / Data Access
    ↓
IndexedDB
```

Pisahkan:
- UI
- Business Logic
- Storage
- Workflow
- Permission
- Mock Data
- Device API

HTML tidak boleh berisi business logic besar.

---

## 5. Struktur Folder Wajib

```text
sigma-nursery/
│
├── index.html
├── manifest.webmanifest
├── sw.js
├── README.md
│
├── assets/
│   ├── icons/
│   └── images/
│
├── css/
│   ├── app.css
│   ├── components.css
│   └── pages.css
│
└── js/
    ├── app.js
    │
    ├── core/
    │   ├── router.js
    │   ├── session.js
    │   ├── permissions.js
    │   ├── workflow.js
    │   ├── storage.js
    │   └── utils.js
    │
    ├── db/
    │   ├── indexeddb.js
    │   ├── seed.js
    │   └── repositories.js
    │
    ├── data/
    │   ├── master-data.js
    │   └── demo-data.js
    │
    ├── components/
    │   ├── header.js
    │   ├── drawer.js
    │   ├── modal.js
    │   ├── bottom-action.js
    │   ├── card.js
    │   ├── status.js
    │   ├── form.js
    │   └── toast.js
    │
    └── modules/
        ├── auth/
        ├── dashboard/
        ├── attendance/
        ├── reception/
        ├── seeding/
        ├── budding/
        ├── inspection/
        ├── selection/
        ├── entres/
        ├── nursery-activity/
        └── request/
```

Agent boleh menambah file di dalam struktur tersebut, tetapi jangan mengganti arsitektur utama tanpa alasan.

---

## 6. Routing

Client-side router sederhana.

Route minimum:

```text
/splash
/login
/sync
/home

/attendance
/attendance/supervisor
/attendance/workers
/attendance/summary

/reception
/reception/create
/reception/review
/reception/detail/:id

/seeding
/seeding/create
/seeding/review

/budding
/inspection
/selection
/entres
/nursery-activity
/request
```

Route harus divalidasi melalui permission layer.

---

## 7. Session & Demo Role Switcher

Session minimal:

```text
userId
role
name
divisionId
divisionName
loginAt
isAuthenticated
```

Buat **Prototype Role Switcher** agar workflow antar-role bisa didemokan dalam satu browser:

```text
Mantri Tanaman
Asisten
Askep
Pengurus
```

Role switcher hanya untuk mode prototype/demo, dipisahkan dari login normal.

---

## 8. Permission

### Mantri Tanaman
- Create transaksi operasional
- Edit transaksi sebelum dikirim
- Hapus transaksi sebelum dikirim
- Review transaksi sendiri
- Submit/kirim transaksi

### Asisten
- View transaksi terkirim
- Buka transaksi satu per satu
- Koreksi field yang diizinkan
- Approve/verifikasi
- Monitoring proses sesuai kewenangan

### Askep
- View
- Monitoring
- Approval pada proses yang nanti ditetapkan

### Pengurus
- View
- Monitoring
- Approval/penentuan sumber pada skenario yang nanti ditetapkan

Jangan membuat kewenangan tambahan yang belum disepakati.

---

## 9. Workflow Engine

Status standar:

```text
DRAFT
  ↓
READY
  ↓
SUBMITTED
  ↓
UNDER_REVIEW
  ↓
CORRECTED
  ↓
APPROVED
```

Tidak semua modul wajib memakai semua status.

Minimal:
- DRAFT
- SUBMITTED
- UNDER_REVIEW
- APPROVED

Jika Asisten mengoreksi:

```text
UNDER_REVIEW
    ↓
CORRECTED
    ↓
APPROVED
```

Asisten **mengoreksi langsung**, bukan sekadar reject.

---

## 10. Ownership & Audit

Aturan transaksi:

```text
createdBy = Mantri
updatedBy = Asisten
```

Simpan metadata:

```text
createdAt
createdBy
updatedAt
updatedBy
submittedAt
approvedAt
approvedBy
```

Audit log minimum:

```json
{
  "transactionId": "REC-001",
  "action": "UPDATE",
  "userId": "AST-001",
  "role": "ASISTEN",
  "field": "quantity",
  "oldValue": 5000,
  "newValue": 4800,
  "timestamp": "..."
}
```

---

## 11. IndexedDB

Database:

```text
sigma-nursery-db
```

Object store minimum:

```text
users
roles
sessions

divisions
estates
programReplanting
programNursery
clones
workers
suppliers
warehouseStocks
growthStages
beds
reasons

attendance
receptions
seedings
transplantations
buddings
inspections
regraftings
selections
batchTransfers
stageTransfers
entresActivities
nurseryActivities
requests

batches
approvals
syncQueue
auditLogs
photos
```

UI tidak boleh mengakses IndexedDB secara langsung. Gunakan repository.

Contoh:

```js
receptionRepository.create(data)
receptionRepository.getById(id)
receptionRepository.update(id, data)
receptionRepository.list()
```

---

## 12. Sync Queue

Prototype harus sudah memiliki konsep sync walaupun belum ada API.

Store `syncQueue`:

```json
{
  "id": "SYNC-001",
  "entity": "receptions",
  "recordId": "REC-001",
  "action": "CREATE",
  "status": "PENDING",
  "createdAt": "..."
}
```

Status:

```text
PENDING
SYNCING
SYNCED
FAILED
```

Tombol Sinkronisasi harus bisa mensimulasikan:

```text
PENDING → SYNCING → SYNCED
```

Belum ada API sungguhan pada fase awal.

---

## 13. Master Data Dummy

Seed data minimal:

### Users
```text
MNT001
AST001
ASK001
PGS001
```

### Roles
```text
MANTRI_TANAMAN
ASISTEN
ASKEP
PENGURUS
```

### Program
Sediakan beberapa Program Nursery dummy.

### Clone
```text
PB 260
RRIM 600
GT 1
```

### Worker
Sediakan beberapa pekerja dummy.

### Supplier
Minimal 3 supplier.

### Warehouse Stock
Sediakan stok tanggal hari ini agar flow Supplier pada Penerimaan dapat dites.

---

## 14. Beranda Mantri Tanaman

Menu:

```text
Presensi
Penerimaan
Penyemaian
Okulasi
Pemeriksaan
Penyeleksian Bibit
Kebun Entres
Kegiatan Bibitan
Permintaan
```

Akses menu bersifat dinamis.

Prasyarat awal:

```text
Presensi Supervisor selesai
        +
Presensi Pekerja selesai
        ↓
Menu kegiatan dapat diakses
```

Untuk prototype saat ini tidak ada pembatasan tambahan setelah prasyarat terpenuhi.

---

## 15. Presensi

Struktur:

```text
Presensi
├── Presensi Supervisor
├── Presensi Pekerja
└── Ringkasan Presensi
```

### 15.1 Supervisor

Aturan waktu:

```text
< 10:00
→ otomatis Presensi Datang

> 14:00
→ otomatis Presensi Pulang

10:00–14:00
→ jalankan proses kegiatan sesuai rule yang sudah disepakati;
  jangan menebak rule tambahan.
```

Saat presensi:
- buka kamera
- ambil foto
- timestamp
- kode Mantri
- nama Mantri
- tanggal
- waktu
- latitude
- longitude

Flow:

```text
Camera
 ↓
Result
 ↓
Simpan
 ↓
Ringkasan Presensi
```

### 15.2 Pekerja

Tampilkan daftar pekerja dinamis.

Row minimum:

```text
Nama
Kode
Jabatan
Toggle
Foto jika sudah presensi
```

Aturan:
- tidak wajib semua pekerja dipresensi
- toggle ON membuka kamera
- foto + timestamp
- toggle menjadi hijau setelah sukses
- thumbnail foto tampil pada row
- dapat tambah pekerja lain
- tambah pekerja berdasarkan Divisi
- cari berdasarkan nama/kode
- swipe kiri menghapus row dari daftar proses setelah dialog konfirmasi

Flow:

```text
Presensi Pekerja
 ↓
Daftar pekerja
 ↓
Toggle
 ↓
Camera
 ↓
Foto + timestamp
 ↓
Toggle hijau + foto
 ↓
Simpan Data Presensi
 ↓
Dialog konfirmasi
 ↓
Simpan
 ↓
Ringkasan diperbarui
```

---

## 16. Penerimaan

Field:

```text
Program Pembibitan
Tipe Asal
Sumber Bibit
Jenis Klon
Jenis Penerimaan
Tahapan Penerimaan Bibit
Tanggal Penerimaan (otomatis)
Foto Dokumentasi
Catatan
```

### Tipe Asal

```text
Supplier
Own Estate
Others
```

### Sumber Bibit dinamis

```text
Supplier
→ Supplier

Own Estate
→ Kebun / Divisi sumber

Others
→ Kebun / Divisi berbeda sumber
```

### Jumlah

#### Supplier

Tidak input manual.

```text
Supplier
 ↓
Popup Stok Gudang
 ↓
Validasi tanggal = hari ini
 ↓
Boleh pilih lebih dari satu stok
 ↓
Klon boleh berbeda
```

Setiap stok terpilih menjadi **transaksi Penerimaan berbeda**.

Popup boleh multi-select untuk mempermudah input, tetapi penyimpanan dipisah per stok/transaksi.

#### Own Estate / Others

Jumlah diinput manual.

Satu layar boleh berisi beberapa klon, tetapi jumlah harus dicatat per klon.

Contoh:

```text
PB 260   → 5.000
RRIM600  → 3.000
GT 1     → 2.000
```

### Tahapan

Master:
```text
RMN
RAPM
```

Sistem memberi **rekomendasi** berdasarkan Program Pembibitan, periode, tanggal, dan master tahapan.

User boleh menyesuaikan hasil rekomendasi.

Jangan membuat rule RMN/RAPM menjadi hard-coded final.

### Penyimpanan

Setelah save:

```text
DRAFT / LOCAL
```

Belum final sampai dikirim dan diverifikasi.

---

## 17. Review & Kirim Penerimaan

Sediakan layar khusus:

```text
Penerimaan
  ↓
Tinjau & Kirim
```

Menampilkan transaksi Penerimaan dari menu yang belum dikirim.

Sebelum `Kirim ke Asisten`:
- Edit diperbolehkan
- Hapus diperbolehkan

Setelah kirim:

```text
SUBMITTED
```

dan Mantri tidak dapat mengedit lagi.

---

## 18. Verifikasi Asisten — Penerimaan

Asisten memeriksa berdasarkan transaksi yang dikirim oleh modul tersebut.

Asisten membuka transaksi **satu per satu**.

Field yang boleh dikoreksi:

```text
Program Pembibitan
Tipe Asal
Sumber Bibit
Jenis Klon
Jenis Penerimaan
Tahapan
Jumlah
```

Field lain belum dinyatakan boleh dikoreksi.

Flow:

```text
SUBMITTED
 ↓
UNDER_REVIEW
 ↓
Koreksi bila perlu
 ↓
CORRECTED
 ↓
APPROVED
```

Setelah approved:
- Mantri dapat view status final
- Askep dapat view
- Pengurus dapat view

---

## 19. Penyemaian

Flow yang sudah ditetapkan:

```text
Pilih Penerimaan Terverifikasi
        ↓
Pilih Program Bibitan
        ↓
Tentukan Clone yang tersedia
        ↓
Catat histori realisasi
        ↓
Tentukan pemecahan Batch
        ↓
Tentukan Bedengan per Batch
        ↓
Batch sementara terbentuk
        ↓
Verifikasi seluruh histori oleh Asisten
        ↓
Batch Aktif + RMN
```

Jangan menambahkan field bisnis baru yang belum dikonfirmasi.

---

## 20. Traceability

Relasi utama:

```text
Program Replanting
      ↓
Program Nursery
      ↓
Penerimaan
      ↓
Penyemaian
      ↓
Batch
      ↓
Okulasi
      ↓
Pemeriksaan
      ↓
Regrafting
      ↓
Seleksi
      ↓
Transfer Batch
      ↓
RMN → RAPM
```

Gunakan ID/foreign key antar entity, jangan hanya text bebas.

---

## 21. UI / UX

Target utama Android mobile.

Gunakan:
- mobile-first
- touch-friendly control
- button besar
- bottom action
- drawer
- card
- list
- modal
- dialog konfirmasi
- toast

Warna dasar:

```text
Primary: #087333
Background: #F5F5F5
White: #FFFFFF
Danger: #E53935
Muted: #999999
```

Optimalkan minimal untuk:
```text
360×800
390×844
412×915
```

---

## 22. Kamera & Lokasi

Kamera:
```js
navigator.mediaDevices.getUserMedia({ video: true })
```

Lokasi:
```js
navigator.geolocation.getCurrentPosition(...)
```

Jika permission tidak tersedia, gunakan fallback/mock agar demo tetap bisa berlangsung.

Metadata foto:

```text
photoId
blob
createdAt
latitude
longitude
capturedBy
```

---

## 23. Data Model Minimal

### Penerimaan

```js
{
  id,
  transactionNo,
  programNurseryId,
  originType,
  sourceId,
  receiptType,
  recommendedStage,
  selectedStage,
  receiptDate,
  photoId,
  notes,
  details: [
    {
      cloneId,
      quantity,
      sourceStockId
    }
  ],
  status,
  createdBy,
  createdAt,
  updatedBy,
  updatedAt,
  submittedAt,
  approvedBy,
  approvedAt
}
```

### Penyemaian

```js
{
  id,
  receptionId,
  programNurseryId,
  cloneId,
  quantity,
  realization,
  batchSplits,
  status,
  createdBy,
  createdAt,
  updatedBy,
  updatedAt
}
```

### Batch

```js
{
  id,
  batchNo,
  programNurseryId,
  growthStage,
  bedId,
  cloneId,
  population,
  status,
  sourceSeedingId
}
```

---

## 24. Simulasi Multi-role

Prototype harus dapat mendemokan workflow dalam satu browser:

```text
MANTRI
 ↓
Create
 ↓
Local DB
 ↓
Submit
 ↓
ROLE SWITCHER
 ↓
ASISTEN
 ↓
Review
 ↓
Correction
 ↓
Approve
 ↓
ROLE SWITCHER
 ↓
ASKEP / PENGURUS
 ↓
View
```

Semua role membaca database lokal yang sama.

---

## 25. Development Sequence

Agent jangan langsung membuat semua modul.

### Phase 1 — Foundation
- folder structure
- index.html
- CSS foundation
- PWA manifest
- service worker
- router
- IndexedDB
- session
- permission
- role switcher
- seed data

### Phase 2 — Shared UI
- header
- drawer
- card
- list
- form
- modal
- confirmation dialog
- toast
- status badge
- bottom action

### Phase 3 — Auth
- Splash
- Login
- Sinkronisasi
- Beranda

### Phase 4 — Presensi
Implement full flow end-to-end.

### Phase 5 — Penerimaan
```text
Create
→ Local Draft
→ Review
→ Edit/Delete
→ Submit
```

### Phase 6 — Asisten
```text
Inbox
→ Detail
→ Allowed Edit
→ Save
→ Approve
```

### Phase 7 — Penyemaian
Implement flow yang sudah ditetapkan.

### Phase 8 — Modul lainnya
- Okulasi
- Pemeriksaan
- Seleksi
- Kebun Entres
- Kegiatan Bibitan
- Permintaan

---

## 26. Definition of Done — Foundation

Foundation selesai jika:

- PWA bisa dibuka.
- PWA dapat di-install.
- Splash tampil.
- Login dummy bekerja.
- Role terbaca.
- Sinkronisasi dapat dibuka.
- Beranda sesuai role.
- Sidebar bekerja.
- IndexedDB berhasil dibuat.
- Seed data masuk.
- Router bekerja.
- Role switcher demo bekerja.
- Tidak ada error JavaScript di console.

---

## 27. Definition of Done — Workflow Pertama

Workflow minimum:

```text
Mantri
 ↓
Presensi
 ↓
Supervisor
 ↓
Camera
 ↓
Result
 ↓
Save
 ↓
Pekerja
 ↓
Camera
 ↓
Save
 ↓
Summary
```

dan:

```text
Mantri
 ↓
Penerimaan
 ↓
Simpan Lokal
 ↓
Tinjau
 ↓
Kirim
 ↓
Role Switch → Asisten
 ↓
Review
 ↓
Koreksi
 ↓
Approve
```

Semua state harus berasal dari IndexedDB yang sama.

---

## 28. AI Agent Rules

AI Agent wajib:

1. Membaca dokumen ini sebelum coding.
2. Mengikuti stack yang ditetapkan.
3. Tidak menambahkan framework besar.
4. Tidak memasang dependency tanpa alasan.
5. Tidak mengarang business rule.
6. Menggunakan dummy/mock jika requirement belum final.
7. Memisahkan UI dan business logic.
8. Menggunakan status workflow.
9. Menyimpan createdBy/updatedBy.
10. Menggunakan IndexedDB.
11. Menggunakan repository layer.
12. Menggunakan workflow engine.
13. Menggunakan permission layer.
14. Mempertahankan mobile-first.
15. Tidak membuat backend pada fase prototype.
16. Menandai requirement yang belum final dengan `TODO: CONFIRM REQUIREMENT`.
17. Tidak mengubah requirement yang sudah terkonfirmasi.
18. Tidak menghapus Open Point atau mengubahnya menjadi keputusan tanpa konfirmasi.
19. Setiap milestone harus tetap bisa dijalankan dan didemokan.

Prioritas:

**Stabilitas prototype > jumlah fitur.**

---

## 29. Prompt Operasional untuk AI Agent

Saat mulai bekerja, Agent harus mengikuti urutan:

```text
1. Read SIGMA_Nursery_AI_Agent_SPEC.md
2. Inspect existing project files.
3. Compare current state with required architecture.
4. Create missing folders/files only.
5. Implement foundation first.
6. Run/validate the project.
7. Fix console/runtime errors.
8. Report what was created and what remains.
9. Proceed to next phase only after current phase is runnable.
```

Jangan membuat semua modul sekaligus.

---

## 30. Requirement Baseline

Baseline proses menggunakan dokumen Rekonsiliasi & Review Requirement Rubber Nursery yang disediakan user.

Dokumen tersebut menetapkan, antara lain:
- transaksi operasional dilakukan melalui Gawai dan dikirim/sinkronisasi ke ERP;
- Mantri melakukan input dan pelaksanaan kegiatan operasional Nursery/KKO;
- Asisten melakukan verifikasi dan review/koreksi transaksi yang diperbolehkan;
- Askep dan Pengurus memiliki fungsi monitoring/approval sesuai kewenangan;
- alur end-to-end mencakup Program Replanting → Program Bibitan → Penerimaan → Penyemaian/Batch → proses lanjutan;
- Penyemaian menggunakan Penerimaan terverifikasi dan menjadi dasar pembentukan Batch;
- detail tertentu masih Open Point dan tidak boleh diasumsikan sebagai keputusan final.

Gunakan dokumen requirement sebagai baseline proses bisnis, tetapi gunakan hasil wawancara terbaru sebagai keputusan prototype jika terdapat penajaman yang lebih spesifik.

---

# INSTRUKSI FINAL

**Mulai dengan Foundation. Jangan membuat modul transaksi sebelum Foundation dapat dijalankan.**

Output pertama Agent harus menciptakan struktur project, stack, PWA shell, router, IndexedDB, seed data, session, permission, Splash, Login, Sinkronisasi, Beranda, dan Sidebar.

Setelah Foundation stabil, lanjutkan Presensi.

Setelah Presensi stabil, lanjutkan workflow Penerimaan → Review → Kirim → Asisten → Koreksi → Approve.

Jangan melewati fase.
