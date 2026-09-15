/**
 * modules/attendance/attendance-landing.js — Halaman Landing Presensi (Role Mantri).
 * Menampilkan Ringkasan Kehadiran harian (Presensi Datang / Presensi Pulang)
 * dengan validasi waktu (<10:00 WIB Datang, >=14:00 WIB Pulang), pencegahan duplikasi presensi,
 * dan simulasi mengawankan data presensi (TASK-SIMULASI-CLOUD-ATTENDANCE-01).
 */

import { session } from '../../core/session.js';
import { storage } from '../../core/storage.js';
import { getCurrentUserContext } from '../../core/user-context.js';
import { getWorkersForUserContext } from '../../data/worker-master.js';
import { attendanceRepository, workerRepository } from '../../db/repositories.js';
import { todayISO, formatFullDateIndonesian, getAttendanceUniqueKey } from '../../core/utils.js';
import { navigate } from '../../core/router.js';
import { toast } from '../../components/toast.js';

export { getAttendanceUniqueKey };

export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function formatDisplayDate(dateInput) {
  try {
    const d = !dateInput ? new Date() : (typeof dateInput === 'string' ? new Date(dateInput) : (dateInput instanceof Date ? dateInput : new Date()));
    if (isNaN(d.getTime())) {
      const now = new Date();
      return `${now.getDate()} ${MONTH_NAMES_ID[now.getMonth()]} ${now.getFullYear()}`;
    }
    const month = MONTH_NAMES_ID[d.getMonth()] || '';
    return `${d.getDate()} ${month} ${d.getFullYear()}`;
  } catch (e) {
    const now = new Date();
    return `${now.getDate()} ${MONTH_NAMES_ID[now.getMonth()]} ${now.getFullYear()}`;
  }
}

export function formatAttendanceCloudDate(dateInput) {
  if (!dateInput) return '';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : (dateInput instanceof Date ? dateInput : new Date(dateInput));
    if (!(d instanceof Date) || isNaN(d.getTime())) return '';
    const day = d.getDate();
    const month = MONTH_NAMES_ID[d.getMonth()] || '';
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  } catch (e) {
    return '';
  }
}

export function getAttendanceCloudStorageKey(userId) {
  const cleanId = String(userId || 'DEFAULT_USER').trim();
  return `attendance_cloud_state_${cleanId}`;
}

export function getAttendanceCloudState(userId) {
  const defaultState = {
    lastAttendanceCloudAt: null,
    syncedAttendanceDate: null,
    count: 0
  };
  try {
    const key = getAttendanceCloudStorageKey(userId);
    const raw = storage.get(key, null);
    if (!raw || typeof raw !== 'object') {
      return defaultState;
    }
    return {
      lastAttendanceCloudAt: typeof raw.lastAttendanceCloudAt === 'string' ? raw.lastAttendanceCloudAt : null,
      syncedAttendanceDate: typeof raw.syncedAttendanceDate === 'string' ? raw.syncedAttendanceDate : null,
      count: typeof raw.count === 'number' && !isNaN(raw.count) ? raw.count : 0
    };
  } catch (err) {
    console.warn('[attendance-landing] Gagal membaca cloud state:', err);
    return defaultState;
  }
}

export function setAttendanceCloudState(userId, stateData) {
  const key = getAttendanceCloudStorageKey(userId);
  const payload = {
    lastAttendanceCloudAt: stateData?.lastAttendanceCloudAt || null,
    syncedAttendanceDate: stateData?.syncedAttendanceDate || null,
    count: typeof stateData?.count === 'number' ? stateData.count : 0
  };
  storage.set(key, payload);
  return payload;
}

export function getAttendanceTypeByHour() {
  const currentHour = new Date().getHours();
  // < 10:00 -> DATANG, >= 14:00 -> PULANG, 10:00-13:59 -> DATANG
  return currentHour >= 14 ? 'PULANG' : 'DATANG';
}

export async function renderAttendanceLanding(contextOrDate = null) {
  const app = document.getElementById('app');
  if (!app) return;

  const userContext = getCurrentUserContext() || session.get() || {};
  const userId = userContext.userId || userContext.id || userContext.code || 'USR-MNT-TBS';

  // Resolusi tanggal aktif yang aman dari berbagai tipe input (string ISO, router context object { params, query }, null, dll)
  let today = todayISO();
  if (typeof contextOrDate === 'string' && contextOrDate.trim().length >= 10) {
    today = contextOrDate.trim().slice(0, 10);
  } else if (contextOrDate && typeof contextOrDate === 'object') {
    if (typeof contextOrDate.date === 'string' && contextOrDate.date.trim().length >= 10) {
      today = contextOrDate.date.trim().slice(0, 10);
    } else if (contextOrDate.params && typeof contextOrDate.params.date === 'string' && contextOrDate.params.date.trim().length >= 10) {
      today = contextOrDate.params.date.trim().slice(0, 10);
    }
  }

  const attType = getAttendanceTypeByHour();
  const pageTitle = attType === 'PULANG' ? 'Presensi Pulang' : 'Presensi Datang';

  // Ambil data pekerja dan presensi hari ini secara terpadu dan ter-deduplikasi
  let workers = [];
  let attendances = [];

  try {
    workers = (await workerRepository.list()) || [];
    const dbList = (await attendanceRepository.list()) || [];
    const storageList = storage.get('attendance_transactions', []) || [];

    // Deduplikasi record antara IndexedDB dan localStorage
    const attendanceMap = new Map();
    dbList.forEach((item) => {
      if (item) {
        const key = getAttendanceUniqueKey(item) || item.id;
        attendanceMap.set(key, item);
      }
    });
    storageList.forEach((item) => {
      if (item) {
        const key = getAttendanceUniqueKey(item) || item.id;
        if (!attendanceMap.has(key)) {
          attendanceMap.set(key, item);
        }
      }
    });
    attendances = Array.from(attendanceMap.values());
  } catch (err) {
    console.warn('[attendance-landing] Gagal memuat data:', err);
    workers = [];
    attendances = [];
  }

  // Filter presensi hari ini untuk tipe aktif (DATANG / PULANG) secara defensif
  const todayAttendances = attendances.filter((a) => {
    if (!a) return false;
    const aDate = a.date || a.tanggal || (a.createdAt ? String(a.createdAt).slice(0, 10) : '');
    const isToday = aDate === today;
    const aType = a.attendanceType || 'DATANG';
    const isMatchingType = aType === attType;
    if (!isToday || !isMatchingType) return false;

    if (userContext?.estateId && a.estateId && a.estateId !== userContext.estateId) return false;
    if (userContext?.divisionId && a.divisionId && a.divisionId !== userContext.divisionId) return false;

    return true;
  });
  
  const supervisorRecord = todayAttendances.find((a) => a.type === 'SUPERVISOR');
  const isSupervisorDone = !!supervisorRecord;
  const supervisorHadir = isSupervisorDone ? 1 : 0;

  // Deduplikasi pekerja unik yang hadir pada tanggal & tipe presensi ini
  const uniqueWorkerAtts = new Map();
  todayAttendances.filter((a) => a.type === 'WORKER').forEach((a) => {
    const wKey = String(a.workerId || a.workerCode || a.code || a.name || a.id).trim();
    if (wKey) uniqueWorkerAtts.set(wKey, a);
  });
  const pekerjaHadir = uniqueWorkerAtts.size;
  const totalHadir = supervisorHadir + pekerjaHadir;

  const scopedActiveWorkers = getWorkersForUserContext(userContext, { activeOnly: true }) || [];
  const totalWorkersCount = scopedActiveWorkers.length > 0 ? scopedActiveWorkers.length : (workers.length > 0 ? workers.length : 5);
  const supervisorBelum = isSupervisorDone ? 0 : 1;
  const pekerjaBelum = Math.max(0, totalWorkersCount - pekerjaHadir);
  const totalBelum = supervisorBelum + pekerjaBelum;

  const totalTidakHadir = todayAttendances.filter((a) => a.status === 'ABSENT' || a.attendanceType === 'ABSENT').length;

  // Cloud State & Status Label Logic
  const cloudState = getAttendanceCloudState(userId);
  const availableToCloudCount = totalHadir;
  const isCloudEnabled = availableToCloudCount >= 1;

  let initialCloudStatusText = 'Belum ada data yang diawankan';
  try {
    const hasValidTimestamp = Boolean(
      cloudState &&
      typeof cloudState.lastAttendanceCloudAt === 'string' &&
      !isNaN(new Date(cloudState.lastAttendanceCloudAt).getTime())
    );

    const isMatchingActiveDate = Boolean(
      cloudState &&
      (
        cloudState.syncedAttendanceDate === today ||
        (!cloudState.syncedAttendanceDate && typeof cloudState.lastAttendanceCloudAt === 'string' && cloudState.lastAttendanceCloudAt.startsWith(today))
      )
    );

    if (hasValidTimestamp && isMatchingActiveDate) {
      const formatted = formatAttendanceCloudDate(cloudState.lastAttendanceCloudAt);
      if (formatted) {
        initialCloudStatusText = `Terakhir disinkronkan: ${formatted}`;
      }
    }
  } catch (err) {
    console.warn('[attendance-landing] Gagal evaluasi status sinkronisasi:', err);
    initialCloudStatusText = 'Belum ada data yang diawankan';
  }

  app.innerHTML = `
    <div class="page attendance-landing-page">
      <header class="attendance-topbar">
        <button class="attendance-icon-btn ${!isCloudEnabled ? 'is-disabled' : ''}" id="attendance-back-btn" type="button" aria-label="Kembali">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="#1f2937" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 class="attendance-page-title">${pageTitle}</h1>
        <button 
          class="attendance-icon-btn ${!isCloudEnabled ? 'is-disabled' : ''}" 
          id="attendance-cloud-btn" 
          type="button" 
          aria-label="Status Sinkronisasi"
          ${!isCloudEnabled ? 'disabled' : ''}
          style="${!isCloudEnabled ? 'opacity: 0.35; cursor: not-allowed;' : 'opacity: 1; cursor: pointer;'}"
        >
          <svg class="attendance-cloud-icon" viewBox="0 0 24 24" width="24" height="24" fill="${!isCloudEnabled ? '#94a3b8' : '#2d6a4f'}" style="transition: transform 0.2s ease, opacity 0.2s ease;">
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
              <span class="attendance-summary-date">${formatDisplayDate(today)}</span>
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

        <div class="attendance-cloud-status" id="attendance-cloud-status">
          ${initialCloudStatusText}
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
  app.querySelector('#attendance-back-btn')?.addEventListener('click', () => {
    navigate('/home');
  });

  // Simulasi Mengawankan Data Presensi
  let isClouding = false;
  const cloudBtn = app.querySelector('#attendance-cloud-btn');
  const cloudStatusEl = app.querySelector('#attendance-cloud-status');
  const cloudIcon = cloudBtn ? cloudBtn.querySelector('svg') : null;

  cloudBtn?.addEventListener('click', async () => {
    if (isClouding) return;
    if (availableToCloudCount === 0) {
      toast.info('Belum ada data presensi yang dapat disinkronkan.');
      return;
    }

    // 1. Set uploading state
    isClouding = true;
    cloudBtn.disabled = true;
    cloudBtn.classList.add('attendance-cloud-animating');
    cloudBtn.style.opacity = '0.7';
    if (cloudIcon) cloudIcon.classList.add('attendance-cloud-animating');
    if (cloudStatusEl) cloudStatusEl.textContent = 'Menyinkronkan data...';

    // 2. Simulate upload process delay (1200ms)
    await new Promise(resolve => setTimeout(resolve, 1200));

    // 3. Complete and persist last sync timestamp
    const nowIso = new Date().toISOString();
    setAttendanceCloudState(userId, {
      lastAttendanceCloudAt: nowIso,
      syncedAttendanceDate: today,
      count: availableToCloudCount
    });

    if (cloudIcon) cloudIcon.classList.remove('attendance-cloud-animating');
    cloudBtn.classList.remove('attendance-cloud-animating');
    cloudBtn.disabled = false;
    cloudBtn.style.opacity = '1';
    
    if (cloudStatusEl) {
      cloudStatusEl.textContent = `Terakhir disinkronkan: ${formatAttendanceCloudDate(nowIso)}`;
    }

    toast.success(`${availableToCloudCount} data presensi berhasil disinkronkan.`);
    isClouding = false;
  });

  app.querySelector('#attendance-summary-header')?.addEventListener('click', () => {
    navigate('/attendance/summary');
  });

  app.querySelector('#btn-presensi-supervisor')?.addEventListener('click', () => {
    if (isSupervisorDone) {
      toast.info(`Anda sudah menyelesaikan ${pageTitle} untuk hari ini.`);
      return;
    }
    navigate('/attendance/supervisor');
  });

  app.querySelector('#btn-presensi-pekerja')?.addEventListener('click', () => {
    navigate('/attendance/workers');
  });
}
