/**
 * server/db.js — Persistent Storage Manager untuk Sigma Nursery
 * Mengelola data catatan perbaikan (review notes) dan umpan balik secara aman dan persisten.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'notes.json');

// Catatan bawaan awal sesuai prototype
const DEFAULT_NOTES = [
  {
    id: 'FB-001',
    number: 1,
    createdAt: '26/08/2026',
    author: 'Budi Santoso',
    creatorRole: 'Customer / User Field',
    email: 'budi.santoso@example.com',
    page: '/login',
    pageTitle: 'Login',
    description: 'Logo PT SOCFINDO dan tombol masuk proporsinya sudah bagus.',
    status: 'Baru',
    marker: { x: 50.0, y: 19.5 },
    hidden: false
  },
  {
    id: 'FB-002',
    number: 2,
    createdAt: '26/08/2026',
    author: 'Ahmad Rivai',
    creatorRole: 'Asisten Lapangan',
    email: 'ahmad.rivai@example.com',
    page: '/sync',
    pageTitle: 'Sinkronisasi',
    description: 'Pilihan divisi kerja dan indikator centang sudah rapi.',
    status: 'Dalam Proses',
    marker: { x: 50.0, y: 18.0 },
    hidden: false
  },
  {
    id: 'FB-003',
    number: 3,
    createdAt: '26/08/2026',
    author: 'Wagiman',
    creatorRole: 'Mandor Semprot',
    email: 'wagiman@example.com',
    page: '/home',
    pageTitle: 'Beranda',
    description: 'Menu 3x3 Beranda mudah diakses dan teks tidak terpotong.',
    status: 'Selesai',
    marker: { x: 50.0, y: 22.0 },
    hidden: false
  }
];

// Pastikan direktori data ada
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Inisialisasi file DB bila belum ada
export function initDB() {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    saveData({ notes: DEFAULT_NOTES, lastNumber: DEFAULT_NOTES.length });
    console.log('[DB] File database notes.json berhasil diinisialisasi dengan data default.');
  }
}

// Membaca seluruh data dari disk
function readData() {
  ensureDataDir();
  try {
    if (!fs.existsSync(DB_FILE)) {
      initDB();
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.notes)) {
      parsed.notes = DEFAULT_NOTES;
    }
    return parsed;
  } catch (err) {
    console.error('[DB] Gagal membaca file database:', err);
    return { notes: DEFAULT_NOTES, lastNumber: DEFAULT_NOTES.length };
  }
}

// Menyimpan seluruh data ke disk secara aman (atomic write)
function saveData(data) {
  ensureDataDir();
  const tempFile = `${DB_FILE}.tmp`;
  try {
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('[DB] Gagal menulis file database:', err);
  }
}

/** Mengambil seluruh daftar catatan */
export function getAllNotes() {
  const data = readData();
  return data.notes;
}

/** Mengambil catatan berdasarkan ID */
export function getNoteById(id) {
  const data = readData();
  return data.notes.find((n) => n.id === id) || null;
}

/** Menambahkan catatan baru */
export function createNote(noteData) {
  const data = readData();
  const nextNumber = (data.lastNumber || data.notes.length) + 1;
  const now = new Date();
  const dateStr = noteData.createdAt || 
    `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  const newNote = {
    id: `FB-${String(nextNumber).padStart(3, '0')}-${Date.now().toString(36).toUpperCase()}`,
    number: nextNumber,
    createdAt: dateStr,
    author: noteData.author || 'Anonim',
    creatorRole: noteData.creatorRole || 'Customer / User Field',
    email: noteData.email || '',
    page: noteData.page || '/login',
    pageTitle: noteData.pageTitle || 'Halaman',
    description: noteData.description || '',
    status: noteData.status || 'Baru',
    marker: noteData.marker || { x: 50.0, y: 40.0 },
    hidden: Boolean(noteData.hidden),
    timestamp: now.toISOString()
  };

  data.notes.unshift(newNote);
  data.lastNumber = nextNumber;
  saveData(data);

  return newNote;
}

/** Memperbarui status / field catatan */
export function updateNote(id, updates) {
  const data = readData();
  const index = data.notes.findIndex((n) => n.id === id);
  if (index === -1) return null;

  const allowedFields = ['status', 'hidden', 'description', 'author', 'creatorRole', 'email', 'marker'];
  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      data.notes[index][key] = updates[key];
    }
  }
  data.notes[index].updatedAt = new Date().toISOString();

  saveData(data);
  return data.notes[index];
}

/** Menghapus catatan berdasarkan ID */
export function deleteNote(id) {
  const data = readData();
  const initialLength = data.notes.length;
  data.notes = data.notes.filter((n) => n.id !== id);

  if (data.notes.length !== initialLength) {
    saveData(data);
    return true;
  }
  return false;
}

/** Mendapatkan statistik catatan */
export function getStats() {
  const notes = getAllNotes();
  return {
    total: notes.length,
    baru: notes.filter((n) => n.status === 'Baru').length,
    proses: notes.filter((n) => n.status === 'Dalam Proses').length,
    selesai: notes.filter((n) => n.status === 'Selesai').length
  };
}
