/**
 * modules/attendance/attendance-supervisor-result.js — Result Presensi Supervisor Datang (Page 2).
 * Sesuai screenshot referensi: docs/ui-reference/presensi-supervisor-datang.png (Right).
 * Menampilkan preview foto, detail presensi, dan konfirmasi Simpan ke IndexedDB.
 */

import { session } from '../../core/session.js';
import { attendanceRepository, photoRepository } from '../../db/repositories.js';
import { lastSupervisorCapture } from './attendance-supervisor.js';
import { getAttendanceTypeByHour } from './attendance-landing.js';
import { navigate } from '../../core/router.js';
import { toast } from '../../components/toast.js';
import { confirmDialog } from '../../components/modal.js';
import { formatFullDateIndonesian, nowISO, todayISO, nowTimeWithSeconds, uid, esc } from '../../core/utils.js';

export async function renderAttendanceSupervisorResult() {
  const app = document.getElementById('app');
  const user = session.get() || { name: 'Wagiman', code: '1405482', position: 'Mantri Bibitan', id: 'MNT001' };
  const attType = getAttendanceTypeByHour();
  const sessionLabel = attType === 'PULANG' ? 'Presensi Pulang' : 'Presensi Datang';
  const pageTitle = `Presensi Supervisor ${attType === 'PULANG' ? 'Pulang' : 'Datang'}`;

  // Ambil state hasil capture atau fallback default jika refresh langsung di route result
  const capture = lastSupervisorCapture || {
    user,
    userCode: user.code || user.id || '1405482',
    userName: user.name || 'Wagiman',
    position: user.position || 'Mantri Bibitan',
    photo: 'assets/icons/supervisor_wagiman.jpg',
    time: nowTimeWithSeconds(),
    date: todayISO(),
    iso: nowISO(),
    latitude: '3.1943859',
    longitude: '11.2312083',
    method: 'REKAM_DATA_WAJAH'
  };

  const formattedDate = formatFullDateIndonesian(capture.date);

  app.innerHTML = `
    <div class="page attendance-result-page">
      <!-- Header -->
      <header class="result-topbar">
        <button class="result-back-btn" id="result-back-btn" type="button" aria-label="Kembali">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="#116834" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 class="result-page-title">${pageTitle}</h1>
      </header>

      <!-- Body -->
      <main class="result-body-content">
        <!-- Identity Header Section -->
        <div class="result-user-header">
          <h2 class="result-user-name">${esc(capture.userName)}</h2>
          <div class="result-user-sub">${esc(capture.userCode)}-${esc(capture.position)}</div>
        </div>

        <!-- Photo Frame -->
        <div class="result-photo-container">
          <div class="result-photo-card">
            <img src="${capture.photo}" class="result-photo-img" alt="Foto Presensi" />
            <!-- Watermark Info Box on Photo -->
            <div class="result-photo-watermark">
              <span>${esc(capture.userCode)}-${esc(capture.userName)}</span>
              <span>${esc(capture.date)} ${esc(capture.time)}</span>
              <span>Lat: ${esc(capture.latitude)}</span>
              <span>Long: ${esc(capture.longitude)}</span>
            </div>
          </div>
        </div>

        <!-- Attendance Summary Box -->
        <div class="result-info-summary">
          <div class="result-att-label">${sessionLabel}</div>
          <div class="result-att-time">${esc(capture.time)}</div>
          <div class="result-att-date">${esc(formattedDate)}</div>
        </div>

        <!-- Detail Table -->
        <div class="result-detail-table">
          <div class="detail-table-row">
            <span class="detail-label">Nama Pekerja</span>
            <span class="detail-colon">:</span>
            <strong class="detail-value">${esc(capture.userName)}</strong>
          </div>
          <div class="detail-table-row">
            <span class="detail-label">Kode Pekerja</span>
            <span class="detail-colon">:</span>
            <strong class="detail-value">${esc(capture.userCode)}</strong>
          </div>
          <div class="detail-table-row">
            <span class="detail-label">Metode Presensi</span>
            <span class="detail-colon">:</span>
            <strong class="detail-value detail-method">
              Rekam Data Wajah <span class="check-badge">✓</span>
            </strong>
          </div>
        </div>
      </main>

      <!-- Bottom Button -->
      <footer class="result-footer-bar">
        <button class="btn-result-save" id="btn-result-save" type="button">
          Simpan
        </button>
      </footer>
    </div>
  `;

  const saveBtn = app.querySelector('#btn-result-save');
  const backBtn = app.querySelector('#result-back-btn');

  backBtn.addEventListener('click', () => {
    navigate('/attendance/supervisor');
  });

  saveBtn.addEventListener('click', async () => {
    const today = capture.date || todayISO();

    // Validasi Duplikasi: Pastikan belum ada data presensi supervisor untuk sesi ini hari ini
    try {
      const attendances = await attendanceRepository.list();
      const duplicate = attendances.some(
        (a) =>
          (a.date === today || (a.createdAt && a.createdAt.startsWith(today))) &&
          a.type === 'SUPERVISOR' &&
          (a.attendanceType === attType || (!a.attendanceType && attType === 'DATANG'))
      );

      if (duplicate) {
        toast.warning(`Data ${pageTitle} sudah tersimpan sebelumnya.`);
        navigate('/attendance', { replace: true });
        return;
      }
    } catch (errCheck) {
      console.warn('[save] Cek duplikasi error:', errCheck);
    }

    const confirmed = await confirmDialog({
      title: 'Simpan Presensi',
      message: `Data ${pageTitle.toLowerCase()} akan disimpan.`,
      confirmText: 'Simpan',
      cancelText: 'Batal'
    });

    if (!confirmed) return;

    saveBtn.disabled = true;
    saveBtn.textContent = 'Menyimpan...';

    try {
      const recordId = uid('ATT-SUP-');
      const photoId = `PHOTO-${recordId}`;

      // Simpan record presensi ke IndexedDB
      await attendanceRepository.create({
        id: recordId,
        type: 'SUPERVISOR',
        userId: user.id || 'MNT001',
        workerCode: capture.userCode || '1405482',
        workerName: capture.userName || 'Wagiman',
        role: user.role || 'MANTRI_TANAMAN',
        attendanceType: attType,
        method: 'REKAM_DATA_WAJAH',
        photoId,
        photo: capture.photo,
        capturedAt: capture.iso || nowISO(),
        date: today,
        time: capture.time || nowTimeWithSeconds(),
        latitude: capture.latitude || '3.1943859',
        longitude: capture.longitude || '11.2312083',
        createdAt: nowISO(),
        createdBy: user.id || 'MNT001',
        status: 'READY'
      });

      // Simpan referensi foto ke photo store jika ada
      try {
        await photoRepository.create({
          id: photoId,
          entityType: 'ATTENDANCE',
          entityId: recordId,
          data: capture.photo,
          createdAt: nowISO()
        });
      } catch (errPhoto) {
        console.warn('[photoRepository] Non-blocking photo save error:', errPhoto);
      }

      toast.success(`Data ${pageTitle.toLowerCase()} berhasil disimpan!`);
      navigate('/attendance', { replace: true });
    } catch (err) {
      console.error('[Attendance Save Error]', err);
      toast.danger('Gagal menyimpan data presensi.');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Simpan';
    }
  });
}
