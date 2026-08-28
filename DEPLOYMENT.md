# Panduan Deployment Online & Konfigurasi Email — Sigma Nursery

Dokumen ini menjelaskan langkah-langkah untuk meng-onlinekan aplikasi **Sigma Nursery PWA** ke internet sehingga dapat diakses oleh pelanggan/pengguna dari perangkat apa pun, serta cara mengaktifkan notifikasi email otomatis ke inbox Anda.

---

## 1. Menjalankan Secara Lokal (Development)

Untuk menjalankan server backend sekaligus aplikasi PWA di komputer lokal:

```bash
# Jalankan server (Backend API + Frontend PWA di port 3000)
npm start
```

Buka browser di `http://localhost:3000`.

---

## 2. Cara Setting Notifikasi Email (Gmail SMTP / Resend)

Notifikasi email otomatis dikirim setiap kali pelanggan/user menambahkan catatan perbaikan baru.

### Opsi A: Menggunakan Akun Gmail (Gratis)

1. Buka akun Google Anda: [https://myaccount.google.com/security](https://myaccount.google.com/security).
2. Pastikan **Verifikasi 2 Langkah (2-Step Verification)** sudah aktif.
3. Cari menu **Sandi Aplikasi (App Passwords)**.
4. Buat sandi aplikasi baru dengan nama `Sigma Nursery`. Google akan memberikan 16 karakter password (misal: `abcd efgh ijkl mnop`).
5. Buka file `.env` di proyek ini dan masukkan:

```env
PORT=3000
APP_URL=http://localhost:3000
ADMIN_NOTIFICATION_EMAIL=email-anda@gmail.com

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=email-anda@gmail.com
SMTP_PASS=abcdefghijklmnop
MAIL_FROM="Sigma Nursery System" <email-anda@gmail.com>
```

6. Simpan file `.env` dan restart server (`npm start`).
7. Klik tombol **"✉️ Tes Email"** di panel Catatan Perbaikan aplikasi untuk memverifikasi.

---

## 3. Opsi Deploy ke Cloud (Online Gratis)

Aplikasi ini sudah berformat **Node.js Express Fullstack (Frontend + Backend + Database)**, sehingga sangat mudah dideploy ke berbagai platform cloud.

### Opsi 1: Render.com (Gratis & Direkomendasikan)

1. Upload/Push repositori ini ke **GitHub** atau **GitLab**.
2. Buka [https://render.com](https://render.com) dan buat akun.
3. Klik **New +** &rarr; Pilih **Web Service**.
4. Hubungkan ke repositori GitHub Anda.
5. Konfigurasi Service:
   * **Name:** `sigma-nursery`
   * **Runtime:** `Node`
   * **Build Command:** `npm install`
   * **Start Command:** `node server.js`
   * **Plan:** Free
6. Pada bagian **Environment Variables**, tambahkan:
   * `ADMIN_NOTIFICATION_EMAIL`: email Anda
   * `SMTP_HOST`: `smtp.gmail.com`
   * `SMTP_PORT`: `587`
   * `SMTP_USER`: email pengirim
   * `SMTP_PASS`: app password 16-digit
   * `APP_URL`: URL domain render Anda (misal `https://sigma-nursery.onrender.com`)
7. Klik **Deploy Web Service**. Dalam 1-2 menit, aplikasi sudah online dan bisa diakses oleh pelanggan di seluruh dunia!

---

### Opsi 2: Railway.app

1. Buka [https://railway.app](https://railway.app).
2. Klik **New Project** &rarr; **Deploy from GitHub repo**.
3. Pilih repositori `sigma-nursery`.
4. Tambahkan Environment Variables di menu **Variables**.
5. Railway akan mendeteksi `node server.js` secara otomatis dan membuatkan URL publik dengan HTTPS gratis.

---

### Opsi 3: VPS / Server Perusahaan (Ubuntu / Linux)

Bila di-hosting di server internal atau VPS Socfindo:

```bash
# 1. Clone repository
git clone <repo-url>
cd sigma-nursery

# 2. Install dependencies
npm install --production

# 3. Setup environment variables
cp .env.example .env
nano .env

# 4. Jalankan dengan Process Manager (PM2) agar berjalan 24/7 di background
npm install -g pm2
pm2 start server.js --name "sigma-nursery"
pm2 startup
pm2 save
```

---

## 4. Fitur-Fitur yang Sudah Terintegrasi

| Fitur | Deskripsi |
|---|---|
| **Database Server** | Menyimpan seluruh catatan perbaikan, posisi pin marker, nama pembuat, email, status, dan riwayat revisi secara persisten di `data/notes.json` / SQLite. |
| **Email Dispatcher** | Mengirimkan email notifikasi dengan template HTML Socfindo ke inbox admin secara instan saat catatan baru disubmit. |
| **Offline Resilience** | Jika pelanggan sedang tidak terhubung ke internet saat membuka aplikasi, data tetap tersimpan secara aman di browser dan disinkronkan saat kembali online. |
| **Live Status Tracker** | Memperbarui status (*Baru* &rarr; *Dalam Proses* &rarr; *Selesai*) secara langsung dari tabel atau card mobile. |
| **Marker Pin Interaktif** | Menancapkan catatan pin perbaikan langsung di halaman layar aplikasi. |
