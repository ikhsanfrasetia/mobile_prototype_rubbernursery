/**
 * modules/entres/topping-scan.js — Fitur Scan QR Code Plot Entres untuk Topping.
 * Mengadopsi pola persis seperti fitur scan QR Bedengan & Plot Menunas.
 * - Terbuka otomatis saat masuk ke #/entres/topping
 * - Dilengkapi kamera real-time, laser reticle, simulasi QR cepat
 * - Gagal scan 1x (auto 6s / manual uji) memunculkan tombol merah "Pilih Plot Manual"
 * - Bottom sheet pilihan manual untuk memilih Kode Plot, Nama Klon, dan Jlh Pokok
 * - Navigasi langsung ke #/entres/topping/form
 */

import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { toast } from '../../components/toast.js';

export const MASTER_PLOTS_ENTRES = [
  { kodePlot: 'PLOT-ENT-01', namaKlon: 'PB 260', jlhPokok: 200, lokasi: 'Kebun Entres Blok A1', tahunTanam: 2022 },
  { kodePlot: 'PLOT-ENT-02', namaKlon: 'IRCA 19', jlhPokok: 150, lokasi: 'Kebun Entres Blok A2', tahunTanam: 2022 },
  { kodePlot: 'PLOT-ENT-03', namaKlon: 'IRR 112', jlhPokok: 250, lokasi: 'Kebun Entres Blok B1', tahunTanam: 2023 },
  { kodePlot: 'PLOT-ENT-04', namaKlon: 'RRIM 911', jlhPokok: 180, lokasi: 'Kebun Entres Blok B2', tahunTanam: 2023 },
  { kodePlot: 'PLOT-ENT-05', namaKlon: 'PB 330', jlhPokok: 220, lokasi: 'Kebun Entres Blok C1', tahunTanam: 2024 },
  { kodePlot: 'PLOT-ENT-06', namaKlon: 'IRR 104', jlhPokok: 190, lokasi: 'Kebun Entres Blok C2', tahunTanam: 2024 }
];

export function renderToppingScan() {
  const app = document.getElementById('app');
  if (!app) return;

  const plots = storage.get('entres_master_plots', MASTER_PLOTS_ENTRES);

  app.innerHTML = `
    <div class="page topping-scan-page" style="display: flex; flex-direction: column; height: 100%; background: #0F172A; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; position: relative; overflow: hidden;">
      
      <!-- TOP NAVIGATION BAR -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); border-bottom: 1px solid rgba(255,255,255,0.1); z-index: 10; flex-shrink: 0;">
        <button id="btn-scan-back" type="button" aria-label="Batal Scan" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #FFFFFF;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <div style="text-align: center; flex: 1; padding: 0 8px;">
          <h1 style="font-size: 1rem; font-weight: 700; margin: 0; color: #FFFFFF; letter-spacing: -0.01em;">Identifikasi QR Plot Entres</h1>
          <div style="font-size: 0.68rem; color: #94A3B8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Kegiatan Topping Entres</div>
        </div>
        <button id="btn-toggle-flash" type="button" aria-label="Flashlight" style="padding: 8px; margin-right: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #FBBF24;">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        </button>
      </header>

      <!-- VIEWFINDER CAMERA AREA -->
      <main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 16px 16px 20px; position: relative; z-index: 5;">
        
        <!-- INFO DOKUMEN / TARGET PLOT -->
        <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 8px 14px; width: 100%; max-width: 320px; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; backdrop-filter: blur(4px);">
          <div>
            <div style="font-size: 0.66rem; color: #94A3B8;">Target Kegiatan:</div>
            <div style="font-size: 0.78rem; font-weight: 700; color: #F8FAFC;">Topping Kebun Entres</div>
          </div>
          <span style="font-size: 0.65rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: rgba(34, 197, 94, 0.2); color: #4ADE80; border: 1px solid rgba(34, 197, 94, 0.3);">Scan Plot</span>
        </div>

        <!-- CAMERA FRAME / RETICLE -->
        <div style="position: relative; width: 220px; height: 220px; margin: auto 0; display: flex; align-items: center; justify-content: center;">
          <!-- Real Video Feed (Stream) -->
          <video id="scan-video-feed" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; border-radius: 16px; display: none;"></video>
          
          <!-- Mock Camera Background with animated pulses -->
          <div id="scan-mock-bg" style="position: absolute; inset: 0; background: radial-gradient(circle, rgba(17,104,52,0.25) 0%, rgba(15,23,42,0.85) 100%); border-radius: 16px;"></div>

          <!-- Targeting Frame Corners -->
          <div style="position: absolute; top: 0; left: 0; width: 32px; height: 32px; border-top: 4px solid #22C55E; border-left: 4px solid #22C55E; border-top-left-radius: 14px;"></div>
          <div style="position: absolute; top: 0; right: 0; width: 32px; height: 32px; border-top: 4px solid #22C55E; border-right: 4px solid #22C55E; border-top-right-radius: 14px;"></div>
          <div style="position: absolute; bottom: 0; left: 0; width: 32px; height: 32px; border-bottom: 4px solid #22C55E; border-left: 4px solid #22C55E; border-bottom-left-radius: 14px;"></div>
          <div style="position: absolute; bottom: 0; right: 0; width: 32px; height: 32px; border-bottom: 4px solid #22C55E; border-right: 4px solid #22C55E; border-bottom-right-radius: 14px;"></div>

          <!-- Scanning Laser Line -->
          <div id="laser-line" style="position: absolute; left: 10px; right: 10px; height: 2px; background: linear-gradient(90deg, transparent, #22C55E, #4ADE80, #22C55E, transparent); box-shadow: 0 0 12px #22C55E; animation: scanLineAnim 2s infinite ease-in-out;"></div>

          <!-- Central Icon Hint -->
          <div style="color: rgba(255,255,255,0.25); pointer-events: none;">
            <svg viewBox="0 0 24 24" width="54" height="54" stroke="currentColor" stroke-width="1.2" fill="none">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </div>
        </div>

        <p style="font-size: 0.76rem; color: #CBD5E1; text-align: center; margin: 0 0 8px; max-width: 270px; line-height: 1.4;">
          Arahkan kamera ke <strong>QR Code</strong> pada patok/tiang Plot Entres.
        </p>

        <!-- STATUS SCAN AKTIF -->
        <div id="scan-status-pill" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 20px; padding: 4px 12px; margin-bottom: 12px;">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #22C55E; box-shadow: 0 0 6px #22C55E; animation: pulse 1.5s infinite;"></span>
          <span style="font-size: 0.72rem; color: #86EFAC; font-weight: 600;">Memindai QR Code...</span>
        </div>

        <!-- TOMBOL PILIH MANUAL (MUNCUL JIKA GAGAL SCAN 1x) -->
        <div id="box-scan-failed" style="display: none; width: 100%; max-width: 320px; text-align: center; margin-bottom: 12px;">
          <button id="btn-pilih-manual" type="button" style="width: 100%; height: 44px; background: #DC2626; color: #FFFFFF; border: none; border-radius: 8px; font-size: 0.84rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 12px rgba(220,38,38,0.35);">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Pilih Plot Manual (QR Bermasalah)
          </button>
          <div style="font-size: 0.68rem; color: #FCA5A5; margin-top: 6px;">
            Scan QR gagal 1x. Anda diperbolehkan memilih plot secara manual.
          </div>
        </div>

        <!-- SIMULATOR CONTROL (UNTUK UJI REVIEW & SELEKSI CEPAT) -->
        <div style="width: 100%; max-width: 320px; background: rgba(30, 41, 59, 0.9); border: 1px dashed rgba(255,255,255,0.2); border-radius: 8px; padding: 10px; box-sizing: border-box;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.70rem; color: #94A3B8; font-weight: 600;">⚡ Quick Simulator (Uji Prototipe):</span>
            <button id="btn-mock-fail-scan" type="button" style="background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.4); color: #F87171; border-radius: 4px; padding: 2px 6px; font-size: 0.65rem; font-weight: 700; cursor: pointer;">
              Simulasi Gagal (1x)
            </button>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
            <button class="btn-mock-qr-scan" data-plot="PLOT-ENT-01" type="button" style="background: #1E293B; border: 1px solid #334155; color: #E2E8F0; padding: 6px; border-radius: 6px; font-size: 0.70rem; cursor: pointer; text-align: left;">
              <span style="display: block; font-weight: 700; color: #4ADE80;">Scan PLOT-ENT-01</span>
              <span style="font-size: 0.62rem; color: #94A3B8;">PB 260 • 200 Pkk</span>
            </button>
            <button class="btn-mock-qr-scan" data-plot="PLOT-ENT-02" type="button" style="background: #1E293B; border: 1px solid #334155; color: #E2E8F0; padding: 6px; border-radius: 6px; font-size: 0.70rem; cursor: pointer; text-align: left;">
              <span style="display: block; font-weight: 700; color: #4ADE80;">Scan PLOT-ENT-02</span>
              <span style="font-size: 0.62rem; color: #94A3B8;">IRCA 19 • 150 Pkk</span>
            </button>
          </div>
        </div>

      </main>

      <!-- BOTTOM SHEET: PILIH PLOT SECARA MANUAL -->
      <div id="overlay-manual-sheet" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 50; backdrop-filter: blur(2px);"></div>
      <div id="sheet-manual-plot" style="display: none; position: fixed; bottom: 0; left: 0; right: 0; background: #FFFFFF; color: #1E293B; border-top-left-radius: 16px; border-top-right-radius: 16px; z-index: 60; max-height: 80vh; flex-direction: column; box-shadow: 0 -4px 20px rgba(0,0,0,0.25); animation: slideUp 0.25s ease-out;">
        
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid #E2E8F0;">
          <div>
            <div style="font-size: 0.95rem; font-weight: 700; color: #111827;">Pilih Plot Entres (Manual)</div>
            <div style="font-size: 0.72rem; color: #64748B;">Pilih plot lokasi pengambilan kayu topping</div>
          </div>
          <button id="btn-close-manual-sheet" type="button" style="background: none; border: none; padding: 6px; cursor: pointer; color: #64748B;">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div style="flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 8px;">
          ${plots.map(p => `
            <div class="card-pick-manual-plot" data-plot="${p.kodePlot}" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.15s ease;">
              <div>
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span style="font-weight: 700; font-size: 0.85rem; color: #0F172A;">${p.kodePlot}</span>
                  <span style="background: #E8F5E9; color: #116834; font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px;">${p.namaKlon}</span>
                </div>
                <div style="font-size: 0.72rem; color: #64748B; margin-top: 2px;">
                  ${p.lokasi} • Thn Tanam: ${p.tahunTanam || 2023}
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 0.82rem; font-weight: 700; color: #116834;">${p.jlhPokok} Pkk</div>
                <span style="font-size: 0.65rem; color: #2563EB; font-weight: 600;">Pilih Plot →</span>
              </div>
            </div>
          `).join('')}
        </div>

      </div>

    </div>
  `;

  // Start Simulated Camera Video (Try WebCam, Fallback to Animated Canvas)
  const video = app.querySelector('#scan-video-feed');
  let mediaStream = null;

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia && video) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        mediaStream = stream;
        video.srcObject = stream;
        video.style.display = 'block';
        const mockBg = app.querySelector('#scan-mock-bg');
        if (mockBg) mockBg.style.display = 'none';
      })
      .catch(() => {
        // Fallback silently to mock visual camera
      });
  }

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
  };

  // Failure Logic (Gagal Scan 1x)
  let scanFailed = false;
  const boxFailed = app.querySelector('#box-scan-failed');
  const scanStatusPill = app.querySelector('#scan-status-pill');
  const laserLine = app.querySelector('#laser-line');

  const triggerScanFailure = () => {
    if (scanFailed) return;
    scanFailed = true;

    // Laser berubah ke merah
    if (laserLine) {
      laserLine.style.background = 'linear-gradient(90deg, transparent, #EF4444, #F87171, #EF4444, transparent)';
      laserLine.style.boxShadow = '0 0 12px #EF4444';
    }

    // Status pill
    if (scanStatusPill) {
      scanStatusPill.style.background = 'rgba(239, 68, 68, 0.15)';
      scanStatusPill.style.borderColor = 'rgba(239, 68, 68, 0.35)';
      scanStatusPill.innerHTML = `
        <span style="width: 7px; height: 7px; border-radius: 50%; background: #EF4444;"></span>
        <span style="font-size: 0.72rem; color: #FCA5A5; font-weight: 600;">Gagal Scan (1x Percobaan)</span>
      `;
    }

    // Tampilkan kotak opsi manual
    if (boxFailed) {
      boxFailed.style.display = 'block';
    }

    toast('Gagal memindai QR Plot (1x). Opsi pilih manual telah dibuka.', 'error');
  };

  // Trigger uji gagal scan manual
  app.querySelector('#btn-mock-fail-scan')?.addEventListener('click', triggerScanFailure);

  // Auto trigger gagal scan setelah 6 detik jika belum berhasil scan
  const failTimer = setTimeout(() => {
    triggerScanFailure();
  }, 6000);

  // Process Selection & Proceed to Form
  const proceedWithPlot = (plotData, verifiedMethod = 'QR_SCAN') => {
    clearTimeout(failTimer);
    stopCamera();

    // Simpan ke storage untuk digunakan di topping-form.js
    storage.set('selected_topping_plot', plotData);
    storage.set('selected_entres_plot', plotData);
    storage.set('plot_verified_method', verifiedMethod);
    storage.set('plot_verified_at', new Date().toLocaleTimeString('id-ID'));
    storage.remove('editing_topping_index');

    // Feedback visual
    toast(`Identifikasi: ${plotData.kodePlot} (${plotData.namaKlon})`, 'info');

    // Navigasi langsung ke Form Transaksi Topping
    navigate('/entres/topping/form');
  };

  // Back Button
  app.querySelector('#btn-scan-back')?.addEventListener('click', () => {
    clearTimeout(failTimer);
    stopCamera();
    navigate('/entres');
  });

  // Toggle Flash
  let flashOn = false;
  app.querySelector('#btn-toggle-flash')?.addEventListener('click', (e) => {
    flashOn = !flashOn;
    e.currentTarget.style.color = flashOn ? '#F59E0B' : '#FFFFFF';
    toast(flashOn ? 'Lampu Flash Aktif' : 'Lampu Flash Dimatikan', 'info');
  });

  // Mock Barcode Quick Scan Buttons
  app.querySelectorAll('.btn-mock-qr-scan').forEach(btn => {
    btn.addEventListener('click', () => {
      const pCode = btn.dataset.plot;
      const found = plots.find(p => p.kodePlot === pCode) || plots[0];
      proceedWithPlot(found, 'QR_SCAN');
    });
  });

  // Manual Sheet Logic
  const overlay = app.querySelector('#overlay-manual-sheet');
  const sheet = app.querySelector('#sheet-manual-plot');

  const openSheet = () => {
    overlay.style.display = 'block';
    sheet.style.display = 'flex';
  };

  const closeSheet = () => {
    overlay.style.display = 'none';
    sheet.style.display = 'none';
  };

  app.querySelector('#btn-pilih-manual')?.addEventListener('click', openSheet);
  overlay?.addEventListener('click', closeSheet);
  app.querySelector('#btn-close-manual-sheet')?.addEventListener('click', closeSheet);

  app.querySelectorAll('.card-pick-manual-plot').forEach(card => {
    card.addEventListener('click', () => {
      const pCode = card.dataset.plot;
      const found = plots.find(p => p.kodePlot === pCode) || plots[0];
      closeSheet();
      proceedWithPlot(found, 'MANUAL');
    });
  });
}
