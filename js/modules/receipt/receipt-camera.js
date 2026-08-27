import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';

let currentMediaStream = null;

export function stopCamera() {
  if (currentMediaStream) {
    currentMediaStream.getTracks().forEach((track) => track.stop());
    currentMediaStream = null;
  }
}

export async function renderReceiptCamera() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="page camera-page" style="display: flex; flex-direction: column; height: 100%; background: #000000; position: relative;">
      
      <!-- Topbar -->
      <header style="display: flex; justify-content: space-between; align-items: center; padding: 16px; position: absolute; top: 0; left: 0; right: 0; z-index: 10;">
        <button id="btn-back-camera" type="button" aria-label="Kembali" style="background: rgba(0,0,0,0.5); border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; justify-content: center; align-items: center; cursor: pointer;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
      </header>

      <!-- Video Feed -->
      <main style="flex: 1; display: flex; justify-content: center; align-items: center; overflow: hidden; position: relative;">
        <video id="camera-video-stream" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover;"></video>
        <canvas id="camera-snapshot-canvas" style="display: none;"></canvas>
        <div id="camera-fallback" style="display: none; width: 100%; height: 100%; background: #333; color: #fff; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 20px;">
          <svg viewBox="0 0 24 24" width="48" height="48" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 16px;">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <span style="font-weight: 600; font-size: 1.1rem; margin-bottom: 8px;">Kamera Tidak Tersedia</span>
          <span style="font-size: 0.9rem; color: #aaa;">Browser mungkin memblokir akses atau perangkat tidak memiliki kamera yang sesuai.</span>
          <span style="font-size: 0.9rem; color: #4A90E2; margin-top: 12px; font-weight: 600;">(Ketuk tombol rana putih untuk mengambil foto simulasi)</span>
        </div>
        
        <!-- Framing Guide (Optional) -->
        <div style="position: absolute; width: 80%; height: 60%; border: 2px dashed rgba(255,255,255,0.5); border-radius: 12px; pointer-events: none;"></div>
      </main>

      <!-- Bottom Bar -->
      <footer style="padding: 24px; display: flex; justify-content: center; align-items: center; position: absolute; bottom: 0; left: 0; right: 0; z-index: 10; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);">
        <button id="btn-shutter" type="button" aria-label="Ambil Foto" style="width: 70px; height: 70px; border-radius: 50%; background: transparent; border: 4px solid #ffffff; display: flex; justify-content: center; align-items: center; cursor: pointer;">
          <div style="width: 54px; height: 54px; background: #ffffff; border-radius: 50%;"></div>
        </button>
      </footer>
    </div>
  `;

  const videoEl = app.querySelector('#camera-video-stream');
  const canvasEl = app.querySelector('#camera-snapshot-canvas');
  const fallbackEl = app.querySelector('#camera-fallback');
  const shutterBtn = app.querySelector('#btn-shutter');
  const backBtn = app.querySelector('#btn-back-camera');

  let isCameraActive = false;

  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        currentMediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 720 }, height: { ideal: 960 } },
          audio: false
        });
      } catch (errRear) {
        console.warn('Kamera belakang tidak ditemukan, mencoba kamera depan/kamera apapun:', errRear);
        currentMediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }
      
      videoEl.srcObject = currentMediaStream;
      await videoEl.play();
      isCameraActive = true;
    } else {
      throw new Error('Camera API tidak didukung');
    }
  } catch (err) {
    console.warn('[receipt-camera] Gagal membuka kamera:', err);
    videoEl.style.display = 'none';
    fallbackEl.style.display = 'flex';
  }

  const takeSnapshot = () => {
    shutterBtn.disabled = true;
    let capturedPhotoData = '';

    if (isCameraActive && videoEl.videoWidth) {
      canvasEl.width = videoEl.videoWidth;
      canvasEl.height = videoEl.videoHeight;
      const ctx = canvasEl.getContext('2d');
      ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);
      capturedPhotoData = canvasEl.toDataURL('image/jpeg', 0.85);
    } else {
      // Create a dummy image for fallback
      canvasEl.width = 400;
      canvasEl.height = 400;
      const ctx = canvasEl.getContext('2d');
      ctx.fillStyle = '#4A773C'; // Green background
      ctx.fillRect(0, 0, 400, 400);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Foto Simulasi', 200, 200);
      ctx.font = '16px sans-serif';
      ctx.fillText('Tidak ada akses kamera', 200, 230);
      capturedPhotoData = canvasEl.toDataURL('image/jpeg', 0.85);
    }

    stopCamera();

    // Save to receipt photos array in storage
    const currentPhotos = storage.get('receipt_photos', []);
    currentPhotos.push(capturedPhotoData);
    storage.set('receipt_photos', currentPhotos);

    navigate('/reception/benih');
  };

  shutterBtn.addEventListener('click', takeSnapshot);

  backBtn.addEventListener('click', () => {
    stopCamera();
    navigate('/reception/benih');
  });
}
