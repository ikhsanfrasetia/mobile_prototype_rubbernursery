# PRODUCTION / DEPLOYMENT READINESS AUDIT
**Portal:** Pemetaan Alur Proses Aplikasi  
**Mode:** AUDIT / PLAN ONLY — STRICTLY READ-ONLY  
**Baseline Source of Truth:** `MASTER_BASELINE_CURRENT_SIGMA_RUBBER_NURSERY.md`  
**Reference Document:** `DEPLOYMENT.md`  
**Final Status:** READY WITH CONDITIONS 🚀

---

## 1. Current Local Architecture

Saat ini pada lingkungan lokal (localhost), arsitektur berjalan secara terpadu dalam satu runtime Node.js Express:

```
[ Browser UI / Portal SPA ]
           │
           ▼ (HTTP fetch via process-mapping-api.js)
[ REST API Router (server.js @ PORT 3000) ]
           │
           ▼ (Validation guards & in-process write lock)
[ Storage Engine (server/process-mapping-db.js) ]
     ├── Atomic Write (.tmp ➔ rename) ──► [ data/process-mapping-data.json ]
     ├── Backup Copy (.bak)            ──► [ data/process-mapping-data.json.bak ]
     └── Immutable Audit Logger        ──► [ data/process-mapping-audit-log.json ]
```

### Karakteristik Arsitektur Lokal:
- **Port Binding:** `process.env.PORT || 3000`.
- **Origin Handling:** Frontend `process-mapping-api.js` mendeteksi `window.location` dan menggunakan relative path (`/api/process-mapping/*`).
- **Write Lock:** Mutex in-memory dengan timeout otomatis 10 detik.
- **Data Persistence:** Atomic filesystem write dengan validasi JSON sebelum commit.

---

## 2. Target Production Architecture

Arsitektur target pada lingkungan server / cloud hosting (VPS Socfindo, Render, Railway, atau AWS/GCP):

```
[ Client Web / Mobile Browser ]
             │ (HTTPS / TLS 443)
             ▼
[ Reverse Proxy / Edge Gateway (Nginx / Caddy / Cloudflare) ]
             │ (Reverse Proxy / HTTP 3000)
             ▼
[ Node.js Process Manager (PM2 / Docker / systemd) ]
             │
   ┌─────────┴─────────┐
   ▼                   ▼
[ Static Assets ]   [ REST API Router (/api/*) ]
                       │
                       ▼
            [ Storage Engine & Validation ]
                       │
                       ▼
            [ Persistent Volume / Data Mount ]
                 ├── data/process-mapping-data.json
                 ├── data/process-mapping-data.json.bak
                 └── data/process-mapping-audit-log.json
```

### Perbedaan Utama Local vs Production:
1. **Security & TLS:** Production menggunakan HTTPS via Reverse Proxy (Nginx) atau Managed SSL.
2. **Process Management:** Production menggunakan Process Manager (PM2 / systemd) untuk auto-restart saat crash atau server reboot.
3. **Storage Persistence:** Pada lingkungan containerized (Docker/PaaS), direktori `data/` wajib dipasang (*mounted*) ke **Persistent Disk / Volume**.

---

## 3. GitHub Readiness

Audit pelacakan berkas repositori Git:

### Status Berkas Saat Ini:
- `data/notes.json` &rarr; Tracked in Git
- `data/process-mapping-data.json` &rarr; Tracked in Git (Kanonikal Seed v2.2.0)
- `data/process-mapping-audit-log.json` &rarr; Untracked (Runtime Mutation History)
- `data/*.bak`, `data/*.backup*` &rarr; Untracked (Backup Files)
- `.env` &rarr; Ignored via `.gitignore`
- `package.json` & `package-lock.json` &rarr; Tracked in Git
- `server.js` & `server/*.js` &rarr; Tracked in Git

### Rekomendasi Pengelompokan Repositori:

| Kategori | Nama Berkas / Direktori | Masuk Git? | Justifikasi |
|---|---|:---:|---|
| **Source Code** | `server.js`, `server/*.js`, `js/**`, `css/**`, `index.html` | **YA** | Inti logika aplikasi dan backend. |
| **Dependencies** | `package.json`, `package-lock.json` | **YA** | Menjamin instalasi dependency yang deterministik (`npm ci`). |
| **Configuration** | `.env.example` | **YA** | Template environment variables. |
| **Secrets** | `.env` | **TIDAK** | Kredensial SMTP, port, password. |
| **Canonical Seed** | `data/process-mapping-data.json` | **YA** | Dataset baseline awal saat clone pertama kali. |
| **Audit Log** | `data/process-mapping-audit-log.json` | **TIDAK** | Data transaksional murni yang terus bertambah di runtime. |
| **Temporary / Backup** | `data/*.tmp`, `data/*.bak`, `scratch/` | **TIDAK** | File sementara / rotasi backup storage engine. |

---

## 4. Runtime Data Strategy (Git vs Runtime Data)

### Analisis Opsi:
- **Opsi A (Tracked Git Only):** Jika setiap mutasi di-commit ke Git, akan terjadi *git conflict* saat production pull. **(TIDAK DISARANKAN)**
- **Opsi B (Runtime Only / Git Ignore):** Jika di-ignore total, fresh clone pada server baru tidak memiliki data requirement baseline. **(KURANG OPTIMAL)**
- **Opsi C (Tracked Initial Seed + Protected Runtime Persistence — RECOMMENDED):**
  1. `data/process-mapping-data.json` masuk Git sebagai **initial baseline seed**.
  2. Pada deployment server, file data di server berstatus *runtime source of truth*.
  3. Saat deployment update (`git pull`), script deployment melakukan backup runtime data terlebih dahulu, atau meletakkan direktori `data/` pada persistent volume terpisah di luar folder git checkout yang di-symlink (`ln -s /var/data/sigma-nursery/data ./data`).

---

## 5. Audit Log Strategy

- File: `data/process-mapping-audit-log.json`.
- Karakteristik: Append-only, immutable, memiliki batas rotasi `MAX_LOG_ENTRIES = 5000`.
- **Rekomendasi:** 
  - **TIDAK IKUT GIT** (masukkan ke `.gitignore`).
  - Dibuat otomatis saat runtime pertama kali oleh `server/audit-logger.js` (`ensureDataDir()`).
  - Tetap berada di volume persisten server agar riwayat koreksi user tersimpan permanen.

---

## 6. API / Domain Readiness

Audit kode `js/modules/process-mapping/process-mapping-api.js`:

```javascript
function resolveBaseUrl() {
  if (typeof window !== 'undefined' && window.location) {
    return ''; // Relative path di browser -> Same-Origin
  }
  if (typeof process !== 'undefined' && process.env && process.env.API_BASE_URL) {
    return process.env.API_BASE_URL.replace(/\/+$/, '');
  }
  return 'http://localhost:3000';
}
```

### Hasil Audit:
- **Zero Hardcoded Domain:** Di browser, seluruh request API menggunakan path relatif `/api/process-mapping/*`.
- **Domain Agnostic:** Bekerja otomatis pada domain apapun (`localhost:3000`, `nursery.socfindo.co.id`, `sigma-nursery.onrender.com`).
- **HTTPS Ready:** Protokol dan port mengikuti origin browser secara transparan.

---

## 7. Node Server Readiness (`server.js`)

- **Port Binding:** Menggunakan `process.env.PORT || 3000` (kompatibel dengan PaaS seperti Heroku/Render yang menyuntikkan variable `PORT` secara dinamis).
- **Filesystem Paths:** Menggunakan path absolut berbasis module URL (`import.meta.url` &rarr; `path.join(__dirname, '..', 'data')`). Tidak rentan terhadap perbedaan *working directory* saat dijalankan via PM2 atau systemd.
- **Request Limits:** Dikonfigurasi `express.json({ limit: '10mb' })` yang memadai untuk batch update diagram dan requirement.
- **SPA Fallback Routing:** Middleware fallback `res.sendFile(path.join(__dirname, 'index.html'))` memastikan routing deep-link portal PWA tetap bekerja normal saat di-refresh.

---

## 8. Nginx / Reverse Proxy Requirements

Jika di-deploy pada VPS Socfindo menggunakan Nginx, berikut konfigurasi proxy yang direkomendasikan:

```nginx
server {
    listen 80;
    server_name nursery.socfindo.co.id;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name nursery.socfindo.co.id;

    ssl_certificate     /etc/ssl/certs/socfindo_cert.crt;
    ssl_certificate_key /etc/ssl/private/socfindo_key.key;

    client_max_body_size 10M;

    # Static Assets & SPA
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }
}
```

---

## 9. Filesystem Permission Requirements

Proses Node.js pada server (misal user `node` atau `www-data`) memerlukan izin akses:

- **READ / WRITE / CREATE / RENAME:**
  - Direktori `data/`
  - Berkas `data/process-mapping-data.json`
  - Berkas `data/process-mapping-audit-log.json`
  - Berkas temporer `data/*.tmp`
  - Berkas backup `data/*.bak`
- **Rekomendasi Linux Permission:**
  ```bash
  chmod 755 data/
  chmod 644 data/*.json
  ```

---

## 10. Backup & Recovery Strategy

### Minimal Backup Plan:
1. **Pre-Deployment Backup:**
   ```bash
   cp data/process-mapping-data.json data/backups/pm_$(date +%Y%m%d_%H%M%S).json
   cp data/process-mapping-audit-log.json data/backups/audit_$(date +%Y%m%d_%H%M%S).json
   ```
2. **Runtime Auto-Backup:**
   - Storage Engine secara otomatis menduplikasi file sebelum setiap operasi write ke `data/process-mapping-data.json.bak`.
3. **Disaster Recovery:**
   - Jika `process-mapping-data.json` korup atau tidak sengaja tertimpa, pulihkan dalam 1 langkah:
     ```bash
     cp data/process-mapping-data.json.bak data/process-mapping-data.json
     ```

---

## 11. Data Loss Scenarios & Mitigasi

| Skenario | Potensi Risiko | Tingkat Risiko | Mekanisme Perlindungan & Mitigasi |
|---|---|:---:|---|
| **Skenario A:** Local CRUD &rarr; Git push &rarr; Deploy | Timpaan data production | Medium | Gunakan Persistent Volume terpisah dari Git working tree pada server produksi. |
| **Skenario B:** Web CRUD &rarr; Server JSON berubah &rarr; `git pull` | Git merge conflict / local overwrite | High | Buat pre-pull backup script atau ignore runtime JSON di server via directory symlink. |
| **Skenario C:** Web CRUD &rarr; Redeploy application | Data hilang jika ephemeral disk | High pada PaaS gratis | Wajib pasang Persistent Disk/Mount (misal Render Disk / Railway Volume). Aman pada VPS biasa. |
| **Skenario D:** Web CRUD &rarr; Server restart / reboot | Data hilang dari RAM | Zero (Aman ✅) | Data tersimpan permanen di disk sebelum response 200 OK dikirim ke browser. |
| **Skenario E:** Deployment mengganti direktori proyek | Direktori `data/` terhapus | High | Mount direktori `data/` ke `/var/persistent/sigma-data` di luar path rilis. |

---

## 12. Production CRUD Readiness

- **Kemandirian Penyimpanan:** 100% data bisnis bersumber dan tersimpan di server. Tidak mengandalkan `localStorage` browser.
- **Integritas Konkurensi:** Mutex write-lock mencegah *race condition* penulisan file bersamaan.
- **Validasi Mutasi:** Seluruh input divalidasi dengan aturan ketat (`VALID_STATUSES`, duplicate ID check, referential integrity check).

---

## 13. Security Risks & Rekomendasi

1. **Authentication (Non-Blocking untuk internal prototype):**
   - Saat ini endpoint CRUD (`/api/process-mapping/*`) bersifat terbuka (*open write*).
   - *Rekomendasi Deployment:* Jika dibuka ke publik internet, tambahkan middleware autentikasi (misal Bearer token / session auth) atau batasi akses jaringan melalui VPN internal Socfindo.
2. **Path Traversal Protection (PASS ✅):**
   - Storage engine menggunakan path absolut hardcoded (`DATA_DIR`). Tidak menerima input nama file dari parameter URL/body.
3. **CORS Configuration:**
   - Saat ini `cors()` mengizinkan semua origin. Untuk produksi publik, dapat diperketat ke domain resmi perusahaan.

---

## 14. Mobile Prototype Isolation

- **Hasil Audit Isolasi:**
  - `js/app.js` &rarr; 0 dependency ke CRUD backend API.
  - `js/core/router.js` &rarr; 0 dependency ke CRUD backend API.
  - `js/pages/*` &rarr; 0 dependency ke CRUD backend API.
  - Mobile Prototype menggunakan mock data / IndexedDB terisolasi untuk transaksi lapangan simulasi.
  - **Kesimpulan:** Deployment backend dan portal web **100% aman dan tidak berdampak pada Mobile Prototype**.

---

## 15. Deployment Checklist

```markdown
[ ] 1. Repository: Pastikan branch main/release dalam status clean.
[ ] 2. .gitignore: Tambahkan data/process-mapping-audit-log.json, data/*.tmp, data/*.bak.
[ ] 3. Dependencies: Jalankan `npm ci --production` pada server target.
[ ] 4. Environment: Siapkan file `.env` produksi (PORT, SMTP, ADMIN_EMAIL).
[ ] 5. Node.js Runtime: Gunakan Node.js LTS (v18+ atau v20+).
[ ] 6. Process Manager: Konfigurasikan PM2 (`pm2 start server.js --name "sigma-nursery"`).
[ ] 7. Data Volume: Pastikan direktori `data/` memiliki persistent mount dan izin tulis (chmod 755).
[ ] 8. Backup Setup: Jalankan script backup data sebelum deploy rilis baru.
[ ] 9. Nginx / SSL: Konfigurasikan reverse proxy dan sertifikat SSL/HTTPS.
[ ] 10. Smoke Test API: Verifikasi `GET /api/health` dan `GET /api/process-mapping/data`.
[ ] 11. Smoke Test Portal: Buka Portal UI di browser, verifikasi render requirement, flow, dan rules.
[ ] 12. Smoke Test CRUD: Lakukan 1 uji edit requirement via Portal UI dan pastikan audit log tercatat.
[ ] 13. Mobile Prototype Check: Buka menu transaksi mobile prototype, pastikan berjalan lancar.
```

---

## 16. Blocking Issues

- **0 BLOCKING ISSUES 🚫 (NIL)**: Seluruh arsitektur backend, REST API, storage engine, adapter frontend, dan integrasi UI telah memenuhi seluruh standar fungsional dan integritas data.

---

## 17. Non-Blocking Issues (Syarat Infrastruktur Produksi)

1. **Persistent Volume Requirement (PaaS):** Jika di-deploy ke cloud container seperti Render/Railway/Heroku, wajib melampirkan *Persistent Disk* untuk direktori `data/`.
2. **Git Ignore Hardening:** `.gitignore` perlu diperbarui agar tidak melacak berkas audit log runtime dan backup temporer.
3. **Write Authentication (Optional):** Jika portal diakses publik internet terbuka, disarankan menambahkan autentikasi pada endpoint mutasi data.

---

## 18. Recommended Next Steps

1. **Langkah 1:** Tambahkan entri `.gitignore` untuk `data/process-mapping-audit-log.json`, `data/*.tmp`, `data/*.bak`.
2. **Langkah 2:** Setup server target (VPS Ubuntu Socfindo atau Cloud Web Service) dengan Node.js v20 LTS.
3. **Langkah 3:** Konfigurasikan PM2 dan Nginx sesuai panduan seksi 8.
4. **Langkah 4:** Jalankan checklist verifikasi pasca deployment (Seksi 15).

---

## 19. Final Readiness Status

```
================================================================================
FINAL DEPLOYMENT READINESS STATUS: READY WITH CONDITIONS 🚀
================================================================================
- Arsitektur CRUD dan Persistence: 100% SIAP.
- Frontend Data Adapter: 100% SIAP (Zero hardcoded domain).
- Isolasi Mobile Prototype: 100% TERJAGA.
- Catatan Syarat: Pastikan persistent disk/volume aktif di server produksi 
  agar data mutasi runtime tidak hilang saat redeploy.
================================================================================
```
