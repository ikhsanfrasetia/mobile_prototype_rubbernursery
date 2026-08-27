/**
 * modules/attendance/attendance-workers.js — Presensi Pekerja Datang.
 * Sesuai screenshot referensi: docs/ui-reference/presensi-pekerja-datang.png
 * Flat list, toggle switch, thumbnail foto capture per worker, indicator merah,
 * swipe to delete, section Tidak Hadir, dan simpan ke IndexedDB.
 */

import { session } from '../../core/session.js';
import { workerRepository, attendanceRepository, photoRepository } from '../../db/repositories.js';
import { todayISO, nowISO, nowTimeWithSeconds, uid, esc } from '../../core/utils.js';
import { navigate } from '../../core/router.js';
import { toast } from '../../components/toast.js';
import { confirmDialog, openModal, closeModal } from '../../components/modal.js';
import { getAttendanceTypeByHour } from './attendance-landing.js';

// Module-level persistent state
const workerSessionAttendance = new Map();
let activeWorkersList = null;
let absentWorkersList = null;
let activeMediaStream = null;

function stopWorkerCamera() {
  if (activeMediaStream) {
    activeMediaStream.getTracks().forEach((track) => track.stop());
    activeMediaStream = null;
  }
}

// Update DOM baris pekerja dan tombol Simpan secara instan tanpa jeda
function updateWorkerRowInDOM(workerId, photoData, isChecked) {
  const row = document.querySelector(`.worker-row-item[data-id="${workerId}"]`);
  if (row) {
    const rightArea = row.querySelector('.worker-row-right');
    const toggleBtn = row.querySelector('.worker-switch-toggle');
    let thumbWrap = row.querySelector('.worker-thumb-wrap');

    if (isChecked) {
      if (toggleBtn) {
        toggleBtn.classList.add('is-checked');
        toggleBtn.setAttribute('aria-pressed', 'true');
      }

      if (!thumbWrap && rightArea) {
        thumbWrap = document.createElement('div');
        thumbWrap.className = 'worker-thumb-wrap';
        thumbWrap.setAttribute('data-thumb-id', workerId);
        thumbWrap.setAttribute('role', 'button');
        thumbWrap.setAttribute('tabindex', '0');
        thumbWrap.innerHTML = `<img src="${photoData}" class="worker-photo-thumbnail" alt="Foto" />`;
        thumbWrap.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const targetWorker = activeWorkersList?.find((w) => w.id === workerId);
          if (targetWorker) openWorkerCamera(targetWorker);
        });
        rightArea.insertBefore(thumbWrap, toggleBtn);
      } else if (thumbWrap) {
        const img = thumbWrap.querySelector('img');
        if (img) img.src = photoData;
      }
    } else {
      if (toggleBtn) {
        toggleBtn.classList.remove('is-checked');
        toggleBtn.setAttribute('aria-pressed', 'false');
      }
      if (thumbWrap) {
        thumbWrap.remove();
      }
    }
  }

  // Update Tombol Simpan
  const saveBtn = document.querySelector('#btn-save-workers');
  if (saveBtn && activeWorkersList) {
    const checkedInCount = activeWorkersList.filter((w) => workerSessionAttendance.get(w.id)?.checkedIn).length;
    if (checkedInCount > 0) {
      saveBtn.classList.remove('is-disabled');
      saveBtn.classList.add('is-active');
      saveBtn.disabled = false;
    } else {
      saveBtn.classList.remove('is-active');
      saveBtn.classList.add('is-disabled');
      saveBtn.disabled = true;
    }
  }
}

export async function renderAttendanceWorkers() {
  const app = document.getElementById('app');
  const user = session.get() || { name: 'Wagiman', code: '1405482', position: 'Mantri Bibitan', id: 'MNT001' };
  const today = todayISO();
  const attType = getAttendanceTypeByHour();

  // Muat data master dari DB jika belum diinisialisasi
  let allMasterWorkers = [];
  let existingAttendances = [];

  try {
    allMasterWorkers = await workerRepository.list();
    existingAttendances = await attendanceRepository.list();
  } catch (err) {
    console.warn('[attendance-workers] Gagal load data:', err);
  }

  // Otomatis perbarui posisi pekerja di IndexedDB menjadi 'Pekerja Bibitan' jika masih tersimpan data lama
  if (allMasterWorkers && allMasterWorkers.length > 0) {
    for (const w of allMasterWorkers) {
      if (w.position !== 'Pekerja Bibitan') {
        w.position = 'Pekerja Bibitan';
        try {
          await workerRepository.update(w.id, { position: 'Pekerja Bibitan' });
        } catch (errUpd) {
          console.warn('[workerRepository] Update position:', errUpd);
        }
      }
    }
  }

  // Filter presensi pekerja yang sudah tersimpan di IndexedDB hari ini
  const todayWorkerAtts = existingAttendances.filter(
    (a) => (a.date === today || (a.createdAt && a.createdAt.startsWith(today))) &&
           a.type === 'WORKER' &&
           (a.attendanceType === attType || (!a.attendanceType && attType === 'DATANG'))
  );

  // Inisialisasi daftar pekerja aktif jika belum ada
  if (!activeWorkersList) {
    activeWorkersList = allMasterWorkers
      .filter((w) => w.active !== false && !w.absentType)
      .map((w) => ({ ...w, position: 'Pekerja Bibitan' }));

    if (activeWorkersList.length === 0) {
      activeWorkersList = [
        { id: 'WRK-001', code: '1405739', name: 'Fadilah Yusuf Purba', position: 'Pekerja Bibitan', indicator: '1', defaultPhoto: 'assets/icons/worker_fadilah.jpg' },
        { id: 'WRK-002', code: '1405739', name: 'Adek Apria Syahputra', position: 'Pekerja Bibitan', defaultPhoto: 'assets/icons/worker_adek.jpg' },
        { id: 'WRK-003', code: '1405739', name: 'Bidara Iswanda', position: 'Pekerja Bibitan', defaultPhoto: 'assets/icons/worker_bidara.jpg' },
        { id: 'WRK-004', code: '1405739', name: 'Tugiman', position: 'Pekerja Bibitan', defaultPhoto: 'assets/icons/worker_tugiman.jpg' },
        { id: 'WRK-005', code: '1405810', name: 'Budi Santoso', position: 'Pekerja Bibitan', defaultPhoto: 'assets/icons/worker_fadilah.jpg' },
        { id: 'WRK-006', code: '1405811', name: 'Andi Wijaya', position: 'Pekerja Bibitan', defaultPhoto: 'assets/icons/worker_adek.jpg' },
        { id: 'WRK-007', code: '1405812', name: 'Joko Prasetyo', position: 'Pekerja Bibitan', defaultPhoto: 'assets/icons/worker_bidara.jpg' }
      ];
    }
  }

  if (!absentWorkersList) {
    absentWorkersList = allMasterWorkers
      .filter((w) => w.active === false || !!w.absentType)
      .map((w) => ({ ...w, position: 'Pekerja Bibitan' }));

    if (absentWorkersList.length === 0) {
      absentWorkersList = [
        { id: 'WRK-ABS-001', code: '1405739', name: 'Supriadi', position: 'Pekerja Bibitan', absentType: 'C', absentReason: 'Cuti' },
        { id: 'WRK-ABS-002', code: '1405739', name: 'Pahrul', position: 'Pekerja Bibitan', absentType: 'P4', absentReason: 'P4' }
      ];
    }
  }

  // Sinkronisasi record IndexedDB ke state sementara jika ada
  activeWorkersList.forEach((w) => {
    w.position = 'Pekerja Bibitan';
    const existing = todayWorkerAtts.find((a) => a.workerId === w.id);
    if (existing && !workerSessionAttendance.has(w.id)) {
      workerSessionAttendance.set(w.id, {
        checkedIn: true,
        photo: existing.photo || w.defaultPhoto || 'assets/icons/worker_fadilah.jpg',
        time: existing.time || nowTimeWithSeconds(),
        iso: existing.capturedAt || nowISO(),
        latitude: existing.latitude || '3.1943859',
        longitude: existing.longitude || '11.2312083'
      });
    }
  });

  const totalPekerja = activeWorkersList.length + absentWorkersList.length;
  const checkedInCount = activeWorkersList.filter((w) => workerSessionAttendance.get(w.id)?.checkedIn).length;
  const isSaveEnabled = checkedInCount > 0;
  const pageTitle = attType === 'PULANG' ? 'Presensi Pekerja Pulang' : 'Presensi Pekerja Datang';
  const saveBtnLabel = attType === 'PULANG' ? 'Simpan Presensi Pulang' : 'Simpan Presensi Datang';

  app.innerHTML = `
    <div class="page attendance-workers-page">
      <!-- Header -->
      <header class="workers-topbar">
        <button class="workers-back-btn" id="btn-workers-back" type="button" aria-label="Kembali">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="#116834" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 class="workers-page-title">${pageTitle}</h1>
        <button class="workers-add-btn" id="btn-add-worker" type="button" aria-label="Tambah Pekerja" title="Tambah Pekerja">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="#116834">
            <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </button>
      </header>

      <!-- Body -->
      <main class="workers-body-content">
        <!-- Info Supervisor / Mantri -->
        <div class="workers-mantri-card">
          <div class="mantri-left">
            <h2 class="mantri-name">${esc(user.name || 'Wagiman')}</h2>
            <div class="mantri-sub">${esc(user.code || '1405482')}-${esc(user.position || 'Mantri Bibitan')}</div>
          </div>
          <div class="mantri-right">
            <span class="mantri-total-num">${totalPekerja}</span>
            <span class="mantri-total-label">Total Pekerja</span>
          </div>
        </div>

        <!-- Section: Daftar Pekerja Aktif -->
        <div class="workers-section-header">
          <h3 class="workers-section-title">Daftar Pekerja Aktif (${activeWorkersList.length})</h3>
        </div>

        <div class="workers-list-container">
          <ul class="workers-flat-list" id="active-workers-list">
            ${activeWorkersList.map((w) => {
              w.position = 'Pekerja Bibitan';
              const state = workerSessionAttendance.get(w.id);
              const isChecked = state && state.checkedIn === true;
              const hasIndicator = !!w.indicator;
              const photoSrc = (state && state.photo) ? state.photo : (w.defaultPhoto || 'assets/icons/worker_fadilah.jpg');

              return `
                <li class="worker-row-item" data-id="${esc(w.id)}">
                  <div class="worker-row-left" data-swipe-target="true">
                    <strong class="worker-item-name">${esc(w.name)}</strong>
                    <span class="worker-item-meta">${esc(w.code || '1405739')} - Pekerja Bibitan</span>
                  </div>
                  <div class="worker-row-right">
                    ${hasIndicator ? `<span class="worker-badge-indicator">${esc(w.indicator)}</span>` : ''}
                    ${isChecked ? `
                      <div class="worker-thumb-wrap" data-thumb-id="${esc(w.id)}" role="button" tabindex="0" title="Foto presensi ${esc(w.name)}">
                        <img src="${photoSrc}" class="worker-photo-thumbnail" alt="Foto ${esc(w.name)}" />
                      </div>
                    ` : ''}
                    <button class="worker-switch-toggle ${isChecked ? 'is-checked' : ''}" type="button" data-toggle-id="${esc(w.id)}" aria-pressed="${isChecked}" aria-label="Toggle Presensi ${esc(w.name)}">
                      <span class="toggle-slider"></span>
                    </button>
                  </div>
                </li>
              `;
            }).join('')}
          </ul>
        </div>

        <!-- Section: Tidak Hadir -->
        <div class="workers-section-header not-present-header">
          <h3 class="workers-section-title">Tidak Hadir (${absentWorkersList.length})</h3>
        </div>

        <div class="absent-card-container">
          <ul class="absent-flat-list">
            ${absentWorkersList.map((w) => {
              w.position = 'Pekerja Bibitan';
              return `
                <li class="absent-row-item">
                  <div class="absent-row-left">
                    <strong class="absent-item-name">${esc(w.name)}</strong>
                    <span class="absent-item-meta">${esc(w.code || '1405739')} - Pekerja Bibitan</span>
                  </div>
                  <div class="absent-row-right">
                    <span class="absent-code-badge badge-${(w.absentType || 'C').toLowerCase()}">${esc(w.absentType || 'C')}</span>
                  </div>
                </li>
              `;
            }).join('')}
          </ul>
        </div>
      </main>

      <!-- Bottom Button -->
      <footer class="workers-footer-bar">
        <button class="btn-workers-save ${isSaveEnabled ? 'is-active' : 'is-disabled'}" id="btn-save-workers" type="button" ${!isSaveEnabled ? 'disabled' : ''}>
          ${saveBtnLabel}
        </button>
      </footer>
    </div>

    <!-- Kamera Overlay Modal (Hidden by default) -->
    <div id="worker-camera-modal" class="worker-camera-overlay" style="display: none;"></div>
  `;

  // Bind Event Listeners
  app.querySelector('#btn-workers-back').addEventListener('click', () => {
    navigate('/attendance');
  });

  app.querySelector('#btn-add-worker').addEventListener('click', () => {
    openAddWorkerModal(allMasterWorkers);
  });

  // Toggle Presensi Click Event
  app.querySelectorAll('.worker-switch-toggle').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const workerId = btn.getAttribute('data-toggle-id');
      const targetWorker = activeWorkersList.find((w) => w.id === workerId);
      const currentState = workerSessionAttendance.get(workerId);

      if (!targetWorker) return;

      if (currentState && currentState.checkedIn) {
        // Toggle OFF jika diklik kembali
        workerSessionAttendance.set(workerId, {
          checkedIn: false,
          photo: null,
          time: null,
          iso: null,
          latitude: '3.1943859',
          longitude: '11.2312083'
        });
        updateWorkerRowInDOM(workerId, null, false);
        toast.info(`Presensi ${targetWorker.name} dibatalkan.`);
      } else {
        // Buka Kamera untuk Worker ini
        openWorkerCamera(targetWorker);
      }
    });
  });

  // Retake Photo on Thumbnail Click
  app.querySelectorAll('.worker-thumb-wrap').forEach((thumb) => {
    thumb.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const workerId = thumb.getAttribute('data-thumb-id');
      const targetWorker = activeWorkersList.find((w) => w.id === workerId);
      if (targetWorker) {
        openWorkerCamera(targetWorker);
      }
    });
  });

  // Swipe to Delete Worker
  bindSwipeDelete();

  // Simpan Presensi Button
  app.querySelector('#btn-save-workers').addEventListener('click', async () => {
    const checkedInList = activeWorkersList.filter((w) => workerSessionAttendance.get(w.id)?.checkedIn);
    if (checkedInList.length === 0) {
      toast.warning('Belum ada pekerja yang dipresensi.');
      return;
    }

    const confirmed = await confirmDialog({
      title: 'Simpan Presensi Datang',
      message: `Simpan data presensi untuk ${checkedInList.length} pekerja?`,
      confirmText: 'Simpan',
      cancelText: 'Batal'
    });

    if (!confirmed) return;

    const saveBtn = app.querySelector('#btn-save-workers');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Menyimpan...';
    }

    try {
      const recordsToSave = [];
      const photosToSave = [];

      for (const w of checkedInList) {
        const state = workerSessionAttendance.get(w.id);
        const recordId = uid('ATT-WRK-');
        const photoId = `PHOTO-${recordId}`;
        const photoData = (state && state.photo) ? state.photo : (w.defaultPhoto || 'assets/icons/worker_fadilah.jpg');

        recordsToSave.push({
          id: recordId,
          type: 'WORKER',
          userId: user.id || 'MNT001',
          workerId: w.id,
          workerCode: w.code || '1405739',
          workerName: w.name,
          workerRole: 'Pekerja Bibitan',
          supervisorId: user.id || 'MNT001',
          attendanceType: attType,
          method: 'REKAM_DATA_WAJAH',
          photoId,
          photo: photoData,
          capturedAt: state?.iso || nowISO(),
          date: today,
          time: state?.time || nowTimeWithSeconds(),
          latitude: state?.latitude || '3.1943859',
          longitude: state?.longitude || '11.2312083',
          createdAt: nowISO(),
          createdBy: user.id || 'MNT001',
          status: 'READY'
        });

        if (photoData) {
          photosToSave.push({
            id: photoId,
            entityType: 'ATTENDANCE',
            entityId: recordId,
            data: photoData,
            createdAt: nowISO()
          });
        }
      }

      // Simpan batch ke IndexedDB dengan aman
      for (const record of recordsToSave) {
        await attendanceRepository.create(record);
      }

      // Non-blocking simpan foto
      if (photosToSave.length > 0) {
        Promise.all(photosToSave.map((p) => photoRepository.create(p))).catch((errPhoto) => {
          console.warn('[photoRepository] Non-blocking photo batch save:', errPhoto);
        });
      }

      // Reset session state setelah berhasil simpan
      workerSessionAttendance.clear();
      activeWorkersList = null;

      toast.success(`Data presensi ${checkedInList.length} pekerja berhasil disimpan!`);
      navigate('/attendance', { replace: true });
    } catch (err) {
      console.error('[Attendance Workers Save Error]', err);
      toast.danger('Gagal menyimpan data presensi pekerja.');
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Simpan Presensi Datang';
      }
    }
  });
}

// Touch Swipe to Delete (Only targets .worker-row-left)
function bindSwipeDelete() {
  const swipeAreas = document.querySelectorAll('[data-swipe-target="true"]');
  swipeAreas.forEach((area) => {
    let startX = 0;
    let diffX = 0;
    const row = area.closest('.worker-row-item');
    if (!row) return;

    area.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      diffX = 0;
    }, { passive: true });

    area.addEventListener('touchmove', (e) => {
      const currentX = e.touches[0].clientX;
      diffX = currentX - startX;
    }, { passive: true });

    area.addEventListener('touchend', async () => {
      // Jika swipe ke kiri lebih dari 70px
      if (diffX < -70) {
        const workerId = row.dataset.id;
        const targetWorker = activeWorkersList.find((w) => w.id === workerId);
        if (!targetWorker) return;

        const confirmed = await confirmDialog({
          title: 'Hapus Pekerja',
          message: `Hapus pekerja "${targetWorker.name}" dari daftar presensi?`,
          confirmText: 'Hapus',
          cancelText: 'Batal',
          danger: true
        });

        if (confirmed) {
          activeWorkersList = activeWorkersList.filter((w) => w.id !== workerId);
          workerSessionAttendance.delete(workerId);
          toast.info(`Pekerja ${targetWorker.name} dihapus dari daftar.`);
          renderAttendanceWorkers();
        }
      }
    });
  });
}

// Buka Modal Tambah Pekerja dari Master Data
function openAddWorkerModal(allMasterWorkers) {
  const activeIds = new Set(activeWorkersList.map((w) => w.id));
  const availableWorkers = allMasterWorkers.filter((w) => !activeIds.has(w.id));

  const modalBody = `
    <div class="add-worker-modal-wrap">
      <input type="search" id="input-search-add-worker" class="add-worker-search-input" placeholder="Cari nama atau kode pekerja..." />
      <div class="add-worker-list-scroll">
        <ul class="add-worker-results" id="add-worker-results">
          ${renderAvailableWorkerRows(availableWorkers)}
        </ul>
      </div>
    </div>
  `;

  openModal({
    title: 'Tambah Pekerja',
    body: modalBody,
    onClose: () => {}
  });

  const searchInput = document.querySelector('#input-search-add-worker');
  const resultsUl = document.querySelector('#add-worker-results');

  searchInput?.focus();
  searchInput?.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const filtered = availableWorkers.filter((w) =>
      (w.name || '').toLowerCase().includes(q) || (w.code || '').toLowerCase().includes(q)
    );
    if (resultsUl) resultsUl.innerHTML = renderAvailableWorkerRows(filtered);
    bindAddWorkerClicks();
  });

  function renderAvailableWorkerRows(list) {
    if (list.length === 0) {
      return '<li class="no-worker-found">Tidak ada pekerja tersedia</li>';
    }
    return list.map((w) => `
      <li class="add-worker-item-btn" data-add-id="${esc(w.id)}">
        <div class="add-item-info">
          <strong>${esc(w.name)}</strong>
          <span>${esc(w.code || '1405739')} - Pekerja Bibitan</span>
        </div>
        <span class="add-icon-plus">+</span>
      </li>
    `).join('');
  }

  function bindAddWorkerClicks() {
    document.querySelectorAll('[data-add-id]').forEach((item) => {
      item.addEventListener('click', () => {
        const wId = item.dataset.addId;
        const found = allMasterWorkers.find((w) => w.id === wId);
        if (found) {
          activeWorkersList.push(found);
          closeModal();
          toast.success(`Pekerja ${found.name} ditambahkan.`);
          renderAttendanceWorkers();
        }
      });
    });
  }

  bindAddWorkerClicks();
}

// Buka Kamera Capture untuk Pekerja Tertentu
async function openWorkerCamera(worker) {
  const modalEl = document.querySelector('#worker-camera-modal');
  if (!modalEl) return;

  modalEl.style.display = 'flex';
  modalEl.innerHTML = `
    <div class="worker-cam-fullscreen">
      <header class="camera-topbar">
        <button class="camera-icon-btn" id="btn-cam-close" type="button" aria-label="Tutup">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="#ffffff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <h1 class="camera-title">Presensi: ${esc(worker.name)}</h1>
        <div style="width: 32px;"></div>
      </header>

      <main class="camera-viewport-area">
        <video id="worker-video-stream" class="camera-video-feed" autoplay playsinline muted></video>
        <canvas id="worker-canvas-snapshot" style="display: none;"></canvas>
        <img id="worker-fallback-feed" src="${worker.defaultPhoto || 'assets/icons/worker_fadilah.jpg'}" class="camera-fallback-feed" alt="Fallback Feed" style="display: none;" />

        <div class="camera-overlay-container">
          <div class="camera-hint-banner">
            Posisikan wajah pekerja di dalam kotak panduan
          </div>

          <div class="camera-face-frame"></div>

          <div class="camera-identity-badge">
            ${esc(worker.code || '1405739')}-${esc(worker.name)}
          </div>
        </div>
      </main>

      <footer class="camera-bottom-bar">
        <button class="camera-shutter-btn" id="btn-worker-capture" type="button" aria-label="Ambil Foto">
          <span class="shutter-inner-circle"></span>
        </button>
      </footer>
    </div>
  `;

  const videoEl = modalEl.querySelector('#worker-video-stream');
  const canvasEl = modalEl.querySelector('#worker-canvas-snapshot');
  const fallbackImg = modalEl.querySelector('#worker-fallback-feed');
  const shutterBtn = modalEl.querySelector('#btn-worker-capture');
  const closeBtn = modalEl.querySelector('#btn-cam-close');

  let isCamActive = false;

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      activeMediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false
      });
      videoEl.srcObject = activeMediaStream;
      await videoEl.play();
      isCamActive = true;
    } else {
      throw new Error('Camera API not supported');
    }
  } catch {
    videoEl.style.display = 'none';
    fallbackImg.style.display = 'block';
  }

  const closeCamera = () => {
    stopWorkerCamera();
    modalEl.style.display = 'none';
    modalEl.innerHTML = '';
  };

  closeBtn.addEventListener('click', closeCamera);

  const onShutterCapture = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    shutterBtn.disabled = true;

    let photoData = '';
    if (isCamActive && videoEl && videoEl.videoWidth) {
      try {
        canvasEl.width = videoEl.videoWidth;
        canvasEl.height = videoEl.videoHeight;
        const ctx = canvasEl.getContext('2d');
        ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
        photoData = canvasEl.toDataURL('image/jpeg', 0.85);
      } catch (cErr) {
        console.warn('[capture] canvas error:', cErr);
        photoData = worker.defaultPhoto || 'assets/icons/worker_fadilah.jpg';
      }
    } else {
      photoData = worker.defaultPhoto || (fallbackImg ? fallbackImg.getAttribute('src') : '') || 'assets/icons/worker_fadilah.jpg';
    }

    // 1. Simpan ke state sementara pekerja
    workerSessionAttendance.set(worker.id, {
      checkedIn: true,
      photo: photoData,
      time: nowTimeWithSeconds(),
      iso: nowISO(),
      latitude: '3.1943859',
      longitude: '11.2312083'
    });

    // 2. Langsung update DOM baris pekerja seketika (toggle ON, thumbnail foto, save button aktif)
    updateWorkerRowInDOM(worker.id, photoData, true);

    // 3. Tutup overlay kamera
    closeCamera();
    toast.success(`Foto ${worker.name} berhasil diambil ✓`);
  };

  shutterBtn.addEventListener('click', onShutterCapture);
}
