/**
 * server.js — Server Backend Dinamis Sigma Nursery
 * Menyajikan REST API untuk Catatan Perbaikan / Review & Feedback, Database,
 * Notifikasi Email, serta Frontend Progressive Web App (PWA).
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  initDB,
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  getStats
} from './server/db.js';
import { sendNewNoteNotification, sendStatusUpdateNotification, sendTestEmail } from './server/mailer.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Inisialisasi DB
initDB();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logger sederhana
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path} - ${new Date().toLocaleTimeString('id-ID')}`);
  }
  next();
});

// Menyajikan file statis PWA (HTML, CSS, JS, Assets, Manifest, SW)
app.use(express.static(__dirname));

/* -------------------------------------------------------------
 * API ROUTES: CATATAN PERBAIKAN & REVIEW FEEDBACK
 * ------------------------------------------------------------- */

/**
 * GET /api/notes — Mengambil seluruh daftar catatan perbaikan beserta statistik
 */
app.get('/api/notes', (req, res) => {
  try {
    const notes = getAllNotes();
    const stats = getStats();
    res.json({
      success: true,
      total: notes.length,
      stats,
      data: notes
    });
  } catch (err) {
    console.error('[API Error] Gagal mengambil notes:', err);
    res.status(500).json({ success: false, error: 'Gagal mengambil data catatan' });
  }
});

/**
 * GET /api/notes/:id — Mengambil detail satu catatan
 */
app.get('/api/notes/:id', (req, res) => {
  try {
    const note = getNoteById(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, error: 'Catatan tidak ditemukan' });
    }
    res.json({ success: true, data: note });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/notes — Menambahkan catatan perbaikan baru & mengirim notifikasi email
 */
app.post('/api/notes', async (req, res) => {
  try {
    const { author, creatorRole, email, page, pageTitle, description, status, marker } = req.body;

    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, error: 'Deskripsi catatan perbaikan wajib diisi' });
    }

    // 1. Simpan ke database
    const newNote = createNote({
      author: author ? author.trim() : 'Customer',
      creatorRole: creatorRole ? creatorRole.trim() : 'Customer / User Field',
      email: email ? email.trim() : '',
      page: page || '/home',
      pageTitle: pageTitle || 'Halaman',
      description: description.trim(),
      status: status || 'Baru',
      marker: marker || { x: 50.0, y: 40.0 }
    });

    console.log(`[API] Catatan baru #${newNote.number} berhasil disimpan oleh ${newNote.author}`);

    // 2. Kirim notifikasi email secara asinkron
    let emailResult = null;
    try {
      emailResult = await sendNewNoteNotification(newNote);
    } catch (mailErr) {
      console.warn('[API] Peringatan: Gagal mengirim email notifikasi:', mailErr);
      emailResult = { sent: false, error: mailErr.message };
    }

    res.status(201).json({
      success: true,
      message: 'Catatan perbaikan berhasil disimpan!',
      data: newNote,
      emailStatus: emailResult
    });
  } catch (err) {
    console.error('[API Error] Gagal menyimpan catatan:', err);
    res.status(500).json({ success: false, error: 'Terjadi kesalahan pada server saat menyimpan catatan' });
  }
});

/**
 * PATCH /api/notes/:id — Memperbarui status atau data catatan
 */
app.patch('/api/notes/:id', async (req, res) => {
  try {
    const currentNote = getNoteById(req.params.id);
    if (!currentNote) {
      return res.status(404).json({ success: false, error: 'Catatan tidak ditemukan' });
    }

    const oldStatus = currentNote.status;
    const isStatusChanged = req.body.status && req.body.status !== oldStatus;

    const updated = updateNote(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Gagal memperbarui catatan' });
    }

    let emailResult = null;
    if (isStatusChanged) {
      console.log(`[API] Status Catatan #${updated.number} berubah: ${oldStatus} -> ${updated.status}`);
      try {
        emailResult = await sendStatusUpdateNotification(updated, oldStatus, updated.status);
      } catch (mailErr) {
        console.warn('[API] Peringatan: Gagal mengirim email pembaruan status:', mailErr);
        emailResult = { sent: false, error: mailErr.message };
      }
    }

    res.json({
      success: true,
      message: 'Catatan berhasil diperbarui',
      data: updated,
      emailStatus: emailResult
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/notes/:id — Menghapus catatan perbaikan
 */
app.delete('/api/notes/:id', (req, res) => {
  try {
    const deleted = deleteNote(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Catatan tidak ditemukan' });
    }
    console.log(`[API] Catatan ${req.params.id} berhasil dihapus`);
    res.json({
      success: true,
      message: 'Catatan berhasil dihapus'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/notes/test-email — Endpoint pengujian email notifikasi
 */
app.post('/api/notes/test-email', async (req, res) => {
  try {
    const targetEmail = req.body?.email;
    const result = await sendTestEmail(targetEmail);
    res.json({
      success: true,
      message: 'Pengujian email selesai dijalankan',
      result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/health — Endpoint status server
 */
app.get('/api/health', (req, res) => {
  const isEmailConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_USER !== 'your-email@gmail.com');
  res.json({
    status: 'online',
    appName: 'Sigma Nursery PWA Backend',
    uptime: `${Math.floor(process.uptime())} detik`,
    emailConfigured: isEmailConfigured,
    adminEmail: process.env.ADMIN_NOTIFICATION_EMAIL || process.env.SMTP_USER || '(Belum diset)',
    database: 'SQLite/JSON Persistent Store OK',
    timestamp: new Date().toISOString()
  });
});

// Fallback untuk semua rute frontend PWA (SPA fallback)
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api')) {
    return res.sendFile(path.join(__dirname, 'index.html'));
  }
  next();
});

// Start Server
app.listen(PORT, () => {
  console.log('========================================================');
  console.log(`🌿 SIGMA NURSERY BACKEND SERVER BERJALAN`);
  console.log(`📡 URL Lokal      : http://localhost:${PORT}`);
  console.log(`📁 Database       : data/notes.json`);
  console.log(`📧 Notifikasi Email: ${process.env.ADMIN_NOTIFICATION_EMAIL || '(Atur di .env)'}`);
  console.log('========================================================');
});
