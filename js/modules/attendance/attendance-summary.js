/**
 * modules/attendance/attendance-summary.js — Ringkasan Presensi.
 * Menampilkan daftar kehadiran harian lengkap dengan status hadir / absen.
 */

import { attendanceRepository, workerRepository } from '../../db/repositories.js';
import { storage } from '../../core/storage.js';
import { todayISO, esc, getAttendanceUniqueKey } from '../../core/utils.js';
import { navigate } from '../../core/router.js';
import { getCurrentUserContext } from '../../core/user-context.js';
import { session } from '../../core/session.js';

export async function renderAttendanceSummary(contextOrDate = null) {
  const app = document.getElementById('app');
  const userContext = getCurrentUserContext() || session.get() || {};
  let today = todayISO();
  if (typeof contextOrDate === 'string' && contextOrDate.trim().length >= 10) {
    today = contextOrDate.trim().slice(0, 10);
  }

  let attendances = [];
  try {
    const dbList = (await attendanceRepository.list()) || [];
    const storageList = storage.get('attendance_transactions', []) || [];

    const map = new Map();
    dbList.forEach((it) => {
      if (it) {
        const k = getAttendanceUniqueKey(it) || it.id;
        map.set(k, it);
      }
    });
    storageList.forEach((it) => {
      if (it) {
        const k = getAttendanceUniqueKey(it) || it.id;
        if (!map.has(k)) map.set(k, it);
      }
    });
    attendances = Array.from(map.values());
  } catch (err) {
    console.warn('[attendance-summary] Gagal load attendances:', err);
    attendances = [];
  }

  const todayAtts = attendances.filter((a) => {
    if (!a) return false;
    const aDate = a.date || a.tanggal || (a.createdAt ? String(a.createdAt).slice(0, 10) : '');
    const isToday = aDate === today;
    if (!isToday) return false;

    if (userContext?.estateId && a.estateId && a.estateId !== userContext.estateId) return false;
    if (userContext?.divisionId && a.divisionId && a.divisionId !== userContext.divisionId) return false;

    return true;
  });

  const supAtts = todayAtts.filter((a) => a.type === 'SUPERVISOR');
  
  // Deduplikasi pekerja unik
  const uniqueWrkMap = new Map();
  todayAtts.filter((a) => a.type === 'WORKER').forEach((w) => {
    const wKey = String(w.workerId || w.workerCode || w.code || w.name || w.id).trim();
    if (wKey) uniqueWrkMap.set(wKey, w);
  });
  const wrkAtts = Array.from(uniqueWrkMap.values());

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
