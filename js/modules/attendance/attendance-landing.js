/**
 * modules/attendance/attendance-landing.js — Halaman Landing Presensi (Role Mantri).
 * Menampilkan Ringkasan Kehadiran harian (Presensi Datang / Presensi Pulang)
 * dengan validasi waktu (<10:00 WIB Datang, >=14:00 WIB Pulang) dan pencegahan duplikasi presensi.
 */

import { session } from '../../core/session.js';
import { attendanceRepository, workerRepository } from '../../db/repositories.js';
import { todayISO, formatFullDateIndonesian } from '../../core/utils.js';
import { navigate } from '../../core/router.js';
import { toast } from '../../components/toast.js';

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function formatDisplayDate(date = new Date()) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return `${d.getDate()} ${MONTH_NAMES_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function getAttendanceTypeByHour() {
  const currentHour = new Date().getHours();
  // < 10:00 -> DATANG, >= 14:00 -> PULANG, 10:00-13:59 -> DATANG
  return currentHour >= 14 ? 'PULANG' : 'DATANG';
}

export async function renderAttendanceLanding() {
  const app = document.getElementById('app');
  const today = todayISO();
  const attType = getAttendanceTypeByHour();
  const pageTitle = attType === 'PULANG' ? 'Presensi Pulang' : 'Presensi Datang';

  // Ambil data pekerja dan presensi hari ini
  let workers = [];
  let attendances = [];

  try {
    workers = await workerRepository.list();
    attendances = await attendanceRepository.list();
  } catch (err) {
    console.warn('[attendance-landing] Gagal memuat data:', err);
  }

  // Filter presensi hari ini untuk tipe aktif (DATANG / PULANG)
  const todayAttendances = attendances.filter((a) => (a.date === today || (a.createdAt && a.createdAt.startsWith(today))));
  
  const supervisorRecord = todayAttendances.find((a) => a.type === 'SUPERVISOR' && (a.attendanceType === attType || (!a.attendanceType && attType === 'DATANG')));
  const isSupervisorDone = !!supervisorRecord;

  const supervisorHadir = isSupervisorDone ? 1 : 0;
  const pekerjaHadir = todayAttendances.filter((a) => a.type === 'WORKER' && (a.attendanceType === attType || (!a.attendanceType && attType === 'DATANG'))).length;
  const totalHadir = supervisorHadir + pekerjaHadir;

  const totalWorkersCount = workers.length > 0 ? workers.length : 5;
  const supervisorBelum = isSupervisorDone ? 0 : 1;
  const pekerjaBelum = Math.max(0, totalWorkersCount - pekerjaHadir);
  const totalBelum = supervisorBelum + pekerjaBelum;

  const totalTidakHadir = todayAttendances.filter((a) => a.status === 'ABSENT' || a.attendanceType === 'ABSENT').length;

  app.innerHTML = `
    <div class="page attendance-landing-page">
      <header class="attendance-topbar">
        <button class="attendance-icon-btn" id="attendance-back-btn" type="button" aria-label="Kembali">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="#1f2937" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 class="attendance-page-title">${pageTitle}</h1>
        <button class="attendance-icon-btn" id="attendance-cloud-btn" type="button" aria-label="Status Sinkronisasi">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="#2d6a4f">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
          </svg>
        </button>
      </header>

      <main class="attendance-body">
        <div class="attendance-summary-card">
          <!-- Header Ringkasan Kehadiran (Clickable) -->
          <div class="attendance-summary-header" id="attendance-summary-header" role="button" tabindex="0">
            <div class="attendance-summary-info">
              <h2 class="attendance-summary-title">Ringkasan Kehadiran</h2>
              <span class="attendance-summary-date">${formatDisplayDate()}</span>
            </div>
            <div class="attendance-summary-stat">
              <div class="attendance-total-box">
                <span class="attendance-total-num">${totalHadir}</span>
                <span class="attendance-total-label">Total</span>
              </div>
              <span class="attendance-chevron">›</span>
            </div>
          </div>

          <div class="attendance-divider"></div>

          <!-- Section: Presensi Datang / Pulang -->
          <div class="attendance-section-group">
            <h3 class="attendance-group-title">${pageTitle} (${totalHadir})</h3>
            <div class="attendance-stat-row">
              <span class="attendance-row-label">Supervisor</span>
              <span class="attendance-row-val">${supervisorHadir}</span>
            </div>
            <div class="attendance-stat-row">
              <span class="attendance-row-label">Pekerja</span>
              <span class="attendance-row-val">${pekerjaHadir}</span>
            </div>
          </div>

          <div class="attendance-divider"></div>

          <!-- Section: Belum Presensi Datang / Pulang -->
          <div class="attendance-section-group">
            <h3 class="attendance-group-title">Belum ${pageTitle} (${totalBelum})</h3>
            <div class="attendance-stat-row">
              <span class="attendance-row-label">Supervisor</span>
              <span class="attendance-row-val">${supervisorBelum}</span>
            </div>
            <div class="attendance-stat-row">
              <span class="attendance-row-label">Pekerja</span>
              <span class="attendance-row-val">${pekerjaBelum}</span>
            </div>
          </div>

          <div class="attendance-divider"></div>

          <!-- Section: Tidak Hadir -->
          <div class="attendance-section-group">
            <h3 class="attendance-group-title">Tidak Hadir</h3>
            <div class="attendance-stat-row">
              <span class="attendance-row-label">Jumlah tidak hadir</span>
              <span class="attendance-row-val">${totalTidakHadir}</span>
            </div>
          </div>
        </div>

        <div class="attendance-cloud-status">
          Belum data yang dapat diawankan
        </div>
      </main>

      <footer class="attendance-footer">
        <button class="attendance-btn-primary ${isSupervisorDone ? 'is-completed' : ''}" id="btn-presensi-supervisor" type="button">
          <span class="btn-primary-text">Presensi Supervisor ${isSupervisorDone ? '(Selesai ✓)' : ''}</span>
          <span class="btn-primary-arrow">›</span>
        </button>
        <button class="attendance-btn-primary" id="btn-presensi-pekerja" type="button">
          <span class="btn-primary-text">Presensi Pekerja</span>
          <span class="btn-primary-arrow">›</span>
        </button>
      </footer>
    </div>
  `;

  // Event Listeners
  app.querySelector('#attendance-back-btn').addEventListener('click', () => {
    navigate('/home');
  });

  app.querySelector('#attendance-cloud-btn').addEventListener('click', () => {
    toast.info('Belum ada data presensi yang perlu disinkronkan ke server.');
  });

  app.querySelector('#attendance-summary-header').addEventListener('click', () => {
    navigate('/attendance/summary');
  });

  app.querySelector('#btn-presensi-supervisor').addEventListener('click', () => {
    if (isSupervisorDone) {
      toast.info(`Anda sudah menyelesaikan ${pageTitle} untuk hari ini.`);
      return;
    }
    navigate('/attendance/supervisor');
  });

  app.querySelector('#btn-presensi-pekerja').addEventListener('click', () => {
    navigate('/attendance/workers');
  });
}
