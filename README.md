# Sigma Nursery — Prototype PWA

Prototype mobile-first Progressive Web App untuk proses bisnis pembibitan (nursery).
Fase awal **tanpa backend** — seluruh data tersimpan di IndexedDB lokal browser.

## Stack

- HTML5 + CSS3 + Vanilla JavaScript (ES Modules)
- IndexedDB (database utama)
- localStorage (session/config kecil)
- PWA Manifest + Service Worker
- Kamera: `navigator.mediaDevices.getUserMedia()`
- Lokasi: `navigator.geolocation`

## Menjalankan Prototype

Gunakan HTTP server lokal (wajib, agar module & service worker jalan):

```bash
# Opsi 1: Menggunakan NPM (Direkomendasikan)
# Akan otomatis menjalankan server via npx http-server
npm run dev

# Opsi 2: Menjalankan manual via Node.js
npx http-server . -p 8080

# Opsi 3: Python
python -m http.server 8080
```

Buka `http://localhost:8080`.

> Catatan: membuka langsung via `file://` tidak akan berfungsi penuh
> karena ES Modules dan Service Worker membutuhkan protokol HTTP(S).

## Mode Demo & Role Switcher

- Login dummy tersedia dari halaman Login (mode demo).
- **Role Switcher** (prototype-only) terdapat di Drawer → menu "Mode Demo",
  untuk berpindah role tanpa logout: Mantri Tanaman / Asisten / Askep / Pengurus.
- Semua role membaca IndexedDB lokal yang sama.

## Struktur

```
sigma-nursery/
├── index.html
├── manifest.webmanifest
├── sw.js
├── assets/icons/
├── css/
│   ├── app.css
│   ├── components.css
│   └── pages.css
└── js/
    ├── app.js
    ├── core/       router, session, permissions, workflow, storage, utils
    ├── db/         indexeddb, seed, repositories
    ├── data/       master-data, demo-data
    ├── components/ header, drawer, modal, toast, status, form, card, list
    └── modules/    auth, dashboard (+ modul transaksi fase berikutnya)
```

## Status Fase

- [x] Phase 1 — Foundation
- [ ] Phase 2 — Shared UI (sebagian dibuat saat foundation)
- [ ] Phase 3 — Auth (Splash, Login, Sinkronisasi, Beranda)
- [ ] Phase 4+ — Modul transaksi (menunggu foundation stabil)

Referensi lengkap: `SIGMA_Nursery_AI_Agent_SPEC.md` (single source of truth).
