/**
 * modules/seeding/seeding-scan.js — Fitur Scan QR Code Bedengan untuk Penyemaian.
 * Terbuka otomatis saat Mantri memilih dokumen penyemaian di #/seeding.
 * Dilengkapi kamera real-time, simulasi barcode cepat, dan opsi manual fallback jika gagal scan 1x.
 */

import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { toast } from '../../components/toast.js';

export function renderSeedingScan() {
  const app = document.getElementById('app');

  const sourceIdx = storage.get('seeding_source_index', null);
  const txs = storage.get('receipt_transactions', []);
  const sourceTx = (sourceIdx !== null && txs[sourceIdx]) ? txs[sourceIdx] : {};
  const docIdxStr = (parseInt(sourceIdx || 0) + 1).toString().padStart(2, '0');
  const docNo = sourceTx.docNo || `RCV/SEEDS/2026/AGUS/${docIdxStr}`;
  const program = sourceTx.program || 'PRG/NUR/01/2026';
  const klon = sourceTx.klon || 'GT-01';

  const bedenganList = Array.from({ length: 10 }, (_, i) => {
    const num = (i + 1).toString().padStart(2, '0');
    return {
      name: `Bedengan ${num}`,
      code: `BED-${num}`,
      qrPayload: `SIGMA-BED-${num}`,
      capacity: '1.000 Polybag',
      status: i < 3 ? 'Tersedia' : (i === 3 ? 'Penuh' : 'Tersedia')
    };
  });

  app.innerHTML = `
    <div class="page seeding-scan-page" style="display: flex; flex-direction: column; height: 100%; background: #0F172A; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; position: relative; overflow: hidden;">
      
      <!-- TOP NAVIGATION BAR -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); border-bottom: 1px solid rgba(255,255,255,0.1); z-index: 10; flex-shrink: 0;">
        <button id="btn-scan-back" type="button" aria-label="Batal Scan" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #FFFFFF;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <div style="text-align: center; flex: 1; padding: 0 8px;">
          <h1 style="font-size: 1rem; font-weight: 700; margin: 0; color: #FFFFFF; letter-spacing: -0.01em;">Identifikasi QR Bedengan</h1>
          <div style="font-size: 0.68rem; color: #94A3B8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${docNo}</div>
        </div>
        <button id="btn-toggle-flash" type="button" aria-label="Flashlight" style="padding: 8px; margin-right: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #FBBF24;">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        </button>
      </header>

      <!-- VIEWFINDER CAMERA AREA -->
      <main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 16px 16px 20px; position: relative; z-index: 5;">
        
        <!-- INFO DOKUMEN PENYEMAIAN -->
        <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 8px 14px; width: 100%; max-width: 320px; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; backdrop-filter: blur(4px);">
          <div>
            <div style="font-size: 0.66rem; color: #94A3B8;">Program / Klon:</div>
            <div style="font-size: 0.78rem; font-weight: 700; color: #F8FAFC;">${program} • ${klon}</div>
          </div>
          <span style="font-size: 0.65rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: rgba(34, 197, 94, 0.2); color: #4ADE80; border: 1px solid rgba(34, 197, 94, 0.3);">Siap Semai</span>
        </div>

        <!-- CAMERA FRAME / RETICLE -->
        <div style="position: relative; width: 220px; height: 220px; margin: auto 0; display: flex; align-items: center; justify-content: center;">
          <!-- Real Video Feed (Simulasi / Stream) -->
          <video id="scan-video-feed" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; border-radius: 16px; display: none;"></video>
          
          <!-- Mock Camera Background with animated pulses -->
          <div id="scan-mock-bg" style="position: absolute; inset: 0; background: radial-gradient(circle, rgba(17,104,52,0.2) 0%, rgba(15,23,42,0.8) 100%); border-radius: 16px;"></div>

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
          Arahkan kamera ke <strong>QR Code</strong> pada patok/tiang Bedengan.
        </p>

        <!-- STATUS SCAN AKTIF -->
        <div id="scan-status-pill" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 20px; padding: 4px 12px; margin-bottom: 12px;">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #22C55E; box-shadow: 0 0 6px #22C55E; animation: pulse 1.5s infinite;"></span>
          <span style="font-size: 0.72rem; color: #86EFAC; font-weight: 600;">Memindai QR Code...</span>
        </div>

        <!-- SIMULASI SCAN CEPAT (DEMO TOOLBOX) -->
        <div style="width: 100%; max-width: 330px; background: rgba(30, 41, 59, 0.85); border: 1px dashed rgba(34, 197, 94, 0.4); border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; box-sizing: border-box;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.70rem; font-weight: 700; color: #4ADE80; text-transform: uppercase; letter-spacing: 0.04em;">
              ⚡ Simulasi Scan:
            </span>
            <button type="button" id="btn-mock-fail-scan" title="Simulasi jika pemindaian QR gagal 1 kali" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.35); color: #FCA5A5; font-size: 0.65rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              ⚠️ Uji Gagal Scan
            </button>
          </div>
          <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none;">
            ${bedenganList.slice(0, 6).map(b => `
              <button type="button" class="btn-mock-qr-scan" data-bedengan="${b.name}" data-code="${b.code}" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); color: #F1F5F9; font-size: 0.72rem; font-weight: 600; padding: 5px 9px; border-radius: 6px; cursor: pointer; white-space: nowrap; transition: all 0.15s ease;">
                🏷️ ${b.name}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- KOTAK PERINGATAN GAGAL SCAN (HANYA MUNCUL JIKA GAGAL SCAN 1 KALI) -->
        <div id="box-scan-failed" style="display: none; width: 100%; max-width: 330px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; text-align: center; box-sizing: border-box; animation: fadeIn 0.3s ease;">
          <div style="font-size: 0.82rem; font-weight: 800; color: #991B1B; margin-bottom: 2px;">
            ⚠️ Gagal Memindai QR Bedengan
          </div>
          <p style="font-size: 0.72rem; color: #7F1D1D; margin: 0 0 10px; line-height: 1.35;">
            QR Code tidak terbaca atau belum terpasang di bedengan. Silakan pilih bedengan dari daftar manual.
          </p>
          <button id="btn-pilih-manual" type="button" style="width: 100%; height: 42px; background: #DC2626; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 800; font-size: 0.84rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 2px 8px rgba(220,38,38,0.3);">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <span>Pilih Bedengan Manual</span>
          </button>
        </div>

      </main>

      <!-- BOTTOM SHEET: PILIH BEDENGAN MANUAL -->
      <div id="overlay-manual-sheet" style="display: none; position: absolute; inset: 0; background: rgba(0,0,0,0.65); z-index: 50; backdrop-filter: blur(2px);"></div>
      
      <div id="sheet-manual-bedengan" style="display: none; position: absolute; left: 0; right: 0; bottom: 0; background: #FFFFFF; color: #111827; border-radius: 18px 18px 0 0; padding: 20px 16px 24px; z-index: 51; flex-direction: column; max-height: 75vh; box-shadow: 0 -8px 24px rgba(0,0,0,0.3); transition: transform 0.25s ease;">
        <div style="width: 36px; height: 4px; background: #E2E8F0; border-radius: 2px; margin: 0 auto 14px;"></div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <h2 style="font-size: 0.98rem; font-weight: 800; color: #111827; margin: 0 0 2px;">Pilih Bedengan Manual</h2>
            <p style="font-size: 0.72rem; color: #64748B; margin: 0;">Gunakan opsi ini bila patok fisik belum dipasang barcode QR.</p>
          </div>
          <button id="btn-close-manual-sheet" type="button" style="background: #F1F5F9; border: none; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #475569;">✕</button>
        </div>

        <div style="overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-bottom: 10px;">
          ${bedenganList.map((b) => `
            <div class="card-pick-manual-bedengan" data-bedengan="${b.name}" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; transition: all 0.15s ease;">
              <div>
                <div style="font-weight: 800; font-size: 0.88rem; color: #1E293B;">${b.name}</div>
                <div style="font-size: 0.70rem; color: #64748B; margin-top: 2px;">Kapasitas: ${b.capacity} • Kode: ${b.code}</div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; background: #DCFCE7; color: #15803D;">Tersedia</span>
                <span style="font-size: 0.82rem; color: #116834; font-weight: 700;">Pilih →</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

    </div>

    <!-- SCAN LINE ANIMATION STYLES -->
    <style>
      @keyframes scanLineAnim {
        0% { top: 12px; opacity: 0.8; }
        50% { top: 190px; opacity: 1; }
        100% { top: 12px; opacity: 0.8; }
      }
      .card-pick-manual-bedengan:hover {
        background: #F0FDF4 !important;
        border-color: #86EFAC !important;
      }
    </style>
  `;

  // Start real camera feed if available (graceful fallback)
  const videoEl = app.querySelector('#scan-video-feed');
  const mockBg = app.querySelector('#scan-mock-bg');
  let mediaStream = null;

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        mediaStream = stream;
        if (videoEl) {
          videoEl.srcObject = stream;
          videoEl.style.display = 'block';
          if (mockBg) mockBg.style.display = 'none';
        }
      })
      .catch(() => {
        // Camera not permitted or desktop environment, fallback smoothly
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

    toast('Gagal memindai QR Bedengan (1x). Opsi pilih manual telah dibuka.', 'error');
  };

  // Trigger uji gagal scan manual
  app.querySelector('#btn-mock-fail-scan')?.addEventListener('click', triggerScanFailure);

  // Auto trigger gagal scan setelah 6 detik jika belum berhasil scan
  const failTimer = setTimeout(() => {
    triggerScanFailure();
  }, 6000);

  // Process Selection & Proceed to Form
  const proceedWithBedengan = (bedenganName, verifiedMethod = 'QR_SCAN') => {
    clearTimeout(failTimer);
    stopCamera();

    // Simpan ke storage untuk digunakan di seeding-form.js
    storage.set('scanned_bedengan', bedenganName);
    storage.set('bedengan_verified_method', verifiedMethod);
    storage.set('bedengan_verified_at', new Date().toLocaleTimeString('id-ID'));

    // Feedback visual
    toast(`Identifikasi: ${bedenganName}`, 'info');

    // Navigasi ke Form Penyemaian
    setTimeout(() => {
      navigate('/seeding/form');
    }, 200);
  };

  // Back Button
  app.querySelector('#btn-scan-back')?.addEventListener('click', () => {
    clearTimeout(failTimer);
    stopCamera();
    navigate('/seeding');
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
      const bName = btn.dataset.bedengan;
      proceedWithBedengan(bName, 'QR_SCAN');
    });
  });

  // Manual Sheet Logic
  const overlay = app.querySelector('#overlay-manual-sheet');
  const sheet = app.querySelector('#sheet-manual-bedengan');

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

  app.querySelectorAll('.card-pick-manual-bedengan').forEach(card => {
    card.addEventListener('click', () => {
      const bName = card.dataset.bedengan;
      closeSheet();
      proceedWithBedengan(bName, 'MANUAL');
    });
  });
}
