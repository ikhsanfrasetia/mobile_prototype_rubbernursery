/**
 * modules/attendance/attendance-supervisor.js — Halaman Kamera Presensi Supervisor Datang (Page 1).
 * Kamera full-screen, overlay instruksi kedip mata, frame wajah dashed, identity badge,
 * dan tombol capture kamera konsentris.
 */

import { session } from '../../core/session.js';
import { navigate } from '../../core/router.js';
import { toast } from '../../components/toast.js';
import { attendanceRepository } from '../../db/repositories.js';
import { nowISO, nowTimeWithSeconds, todayISO } from '../../core/utils.js';
import { getAttendanceTypeByHour } from './attendance-landing.js';

// State sementara hasil capture untuk diteruskan ke result page
export let lastSupervisorCapture = null;

let currentMediaStream = null;

export function stopCamera() {
  if (currentMediaStream) {
    currentMediaStream.getTracks().forEach((track) => track.stop());
    currentMediaStream = null;
  }
}

export async function renderAttendanceSupervisor() {
  const app = document.getElementById('app');
  const user = session.get() || { name: 'Wagiman', code: '1405482', position: 'Mantri Bibitan', id: 'MNT001' };
  const userCode = user.code || user.id || '1405482';
  const userName = user.name || 'Wagiman';
  const identityText = `${userCode}-${userName}`;
  const today = todayISO();
  const attType = getAttendanceTypeByHour();
  const cameraTitle = attType === 'PULANG' ? 'Presensi Pulang' : 'Presensi Datang';

  // Validasi: Cek apakah sudah pernah presensi untuk sesi ini hari ini
  try {
    const attendances = await attendanceRepository.list();
    const alreadyDone = attendances.some(
      (a) =>
        (a.date === today || (a.createdAt && a.createdAt.startsWith(today))) &&
        a.type === 'SUPERVISOR' &&
        (a.attendanceType === attType || (!a.attendanceType && attType === 'DATANG'))
    );

    if (alreadyDone) {
      toast.warning(`Anda sudah melakukan ${cameraTitle} hari ini.`);
      navigate('/attendance', { replace: true });
      return;
    }
  } catch (err) {
    console.warn('[attendance-supervisor] Cek presensi error:', err);
  }

  app.innerHTML = `
    <div class="page attendance-camera-page">
      <!-- Topbar Kamera -->
      <header class="camera-topbar">
        <button class="camera-icon-btn" id="camera-back-btn" type="button" aria-label="Kembali">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="#ffffff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 class="camera-title">${cameraTitle}</h1>
        <button class="camera-icon-btn" id="camera-flash-btn" type="button" aria-label="Flash Mode">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="#ffffff">
            <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
            <text x="14" y="22" font-size="9" font-weight="bold" fill="#ffffff">A</text>
          </svg>
        </button>
      </header>

      <!-- Viewport Kamera & Overlay -->
      <main class="camera-viewport-area">
        <video id="camera-video-stream" class="camera-video-feed" autoplay playsinline muted></video>
        <canvas id="camera-snapshot-canvas" style="display: none;"></canvas>
        <img id="camera-fallback-img" src="assets/icons/supervisor_wagiman.jpg" class="camera-fallback-feed" alt="Camera Feed" style="display: none;" />

        <!-- Overlay Layer -->
        <div class="camera-overlay-container">
          <!-- Text Panduan Atas -->
          <div class="camera-hint-banner">
            Silakan kedipkan mata untuk mengambil foto anda
          </div>

          <!-- Frame Kotak Wajah (Dashed) -->
          <div class="camera-face-frame">
            <div class="face-corner-mark"></div>
          </div>

          <!-- Identity Tag Bawah Frame -->
          <div class="camera-identity-badge">
            ${identityText}
          </div>
        </div>
      </main>

      <!-- Bottom Bar Tombol Shutter -->
      <footer class="camera-bottom-bar">
        <button class="camera-shutter-btn" id="camera-shutter-btn" type="button" aria-label="Ambil Foto">
          <span class="shutter-inner-circle"></span>
        </button>
      </footer>
    </div>
  `;

  const videoEl = app.querySelector('#camera-video-stream');
  const canvasEl = app.querySelector('#camera-snapshot-canvas');
  const fallbackImg = app.querySelector('#camera-fallback-img');
  const shutterBtn = app.querySelector('#camera-shutter-btn');
  const backBtn = app.querySelector('#camera-back-btn');

  // Inisialisasi Kamera Depan
  let isCameraActive = false;

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      currentMediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 960 }
        },
        audio: false
      });
      videoEl.srcObject = currentMediaStream;
      await videoEl.play();
      isCameraActive = true;
    } else {
      throw new Error('Camera API tidak didukung');
    }
  } catch (err) {
    console.warn('[Camera] Fallback image digunakan:', err);
    videoEl.style.display = 'none';
    fallbackImg.style.display = 'block';
  }

  // Handle Capture Action
  const takeSnapshot = async () => {
    shutterBtn.disabled = true;

    let capturedPhotoData = '';
    const captureTime = nowTimeWithSeconds();
    const captureDate = todayISO();
    const capturedIso = nowISO();

    // Default GPS Coordinates (Kebun Socfindo)
    let latitude = '3.1943859';
    let longitude = '11.2312083';

    try {
      if (navigator.geolocation) {
        await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              latitude = pos.coords.latitude.toFixed(7);
              longitude = pos.coords.longitude.toFixed(7);
              resolve();
            },
            () => resolve(),
            { timeout: 1500 }
          );
        });
      }
    } catch {
      // Coords default
    }

    if (isCameraActive && videoEl.videoWidth) {
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      const ctx = canvasEl.getContext('2d');
      ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
      capturedPhotoData = canvasEl.toDataURL('image/jpeg', 0.85);
    } else {
      // Ambil gambar fallback
      capturedPhotoData = fallbackImg.src;
    }

    // Stop active camera
    stopCamera();

    // Simpan ke state sementara
    lastSupervisorCapture = {
      user,
      userCode,
      userName,
      position: user.position || 'Mantri Bibitan',
      photo: capturedPhotoData,
      time: captureTime,
      date: captureDate,
      iso: capturedIso,
      latitude,
      longitude,
      method: 'REKAM_DATA_WAJAH'
    };

    navigate('/attendance/supervisor/result');
  };

  shutterBtn.addEventListener('click', takeSnapshot);

  backBtn.addEventListener('click', () => {
    stopCamera();
    navigate('/attendance');
  });
}
