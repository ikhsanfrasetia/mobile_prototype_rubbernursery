/**
 * modules/attendance/attendance-summary.js — Ringkasan Presensi.
 * Menampilkan daftar kehadiran harian lengkap dengan status hadir / absen.
 */

import { attendanceRepository, workerRepository } from '../../db/repositories.js';
import { todayISO, esc } from '../../core/utils.js';
import { navigate } from '../../core/router.js';

export async function renderAttendanceSummary() {
  const app = document.getElementById('app');
  const today = todayISO();
  const attendances = await attendanceRepository.list();
  const todayAtts = attendances.filter((a) => a.date === today);

  const supAtts = todayAtts.filter((a) => a.type === 'SUPERVISOR');
  const wrkAtts = todayAtts.filter((a) => a.type === 'WORKER');

  app.innerHTML = `
    <div class="page attendance-subpage">
      <header class="subpage-header">
        <button class="subpage-back-btn" id="sum-back" type="button">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="#1f2937" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 class="subpage-title">Ringkasan Presensi</h1>
      </header>

      <main class="subpage-body">
        <section class="summary-section-card">
          <h2 class="section-card-title">Supervisor (${supAtts.length})</h2>
          ${supAtts.length === 0 ? '<p class="text-muted">Belum ada presensi supervisor hari ini.</p>' : `
            <ul class="summary-record-list">
              ${supAtts.map((s) => `
                <li class="summary-record-item">
                  <div class="record-meta">
                    <strong>${esc(s.userName || s.userCode)}</strong>
                    <span class="text-muted">${esc(s.time)} WIB • ${esc(s.attendanceType || 'DATANG')}</span>
                  </div>
                  <span class="badge badge-ready">Hadir</span>
                </li>
              `).join('')}
            </ul>
          `}
        </section>

        <section class="summary-section-card">
          <h2 class="section-card-title">Pekerja Hadir (${wrkAtts.length})</h2>
          ${wrkAtts.length === 0 ? '<p class="text-muted">Belum ada pekerja dipresensi hari ini.</p>' : `
            <ul class="summary-record-list">
              ${wrkAtts.map((w) => `
                <li class="summary-record-item">
                  <div class="record-meta">
                    <strong>${esc(w.workerName || w.workerCode)}</strong>
                    <span class="text-muted">${esc(w.time)} WIB</span>
                  </div>
                  <span class="badge badge-ready">Hadir</span>
                </li>
              `).join('')}
            </ul>
          `}
        </section>
      </main>

      <footer class="subpage-footer">
        <button class="btn btn-outline btn-block" id="btn-back-landing" type="button">Kembali ke Presensi</button>
      </footer>
    </div>
  `;

  app.querySelector('#sum-back').addEventListener('click', () => {
    navigate('/attendance');
  });

  app.querySelector('#btn-back-landing').addEventListener('click', () => {
    navigate('/attendance');
  });
}
