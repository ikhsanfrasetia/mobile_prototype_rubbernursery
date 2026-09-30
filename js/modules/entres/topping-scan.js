/**
 * modules/entres/topping-scan.js — Fitur Scan QR Code Plot Entres untuk Topping (Panen Mata Entres).
 * 
 * Flow:
 * 1. Operator memindai QR Code patok fisik plot di kebun entres
 * 2. Sistem me-resolve identitas Plot & Klon langsung dari Master Plot
 * 3. Navigasi langsung ke Form Topping dengan identitas Plot & Klon ter-populate otomatis
 */

import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { toast } from '../../components/toast.js';
import { getAllBudwoodPlots, resolvePlot } from '../../data/budwood-plot-master.js';
import { normalizeKlonName } from '../../data/klon-master.js';

export function renderToppingScan() {
  const app = document.getElementById('app');
  if (!app) return;

  const masterPlots = getAllBudwoodPlots();
  const plots = masterPlots.map(p => ({
    id: p.id,
    kodePlot: `Plot ${p.plotName}`,
    plotName: p.plotName,
    namaKlon: p.cloneName,
    jlhPokok: p.numberOfPlants,
    lokasi: `Kebun Entres - Plot ${p.plotName}`,
    tahunTanam: p.yearOfPlanting,
    budwoodCode: p.budwoodCode
  }));

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
          <h1 style="font-size: 1rem; font-weight: 700; margin: 0; color: #FFFFFF; letter-spacing: -0.01em;">Identifikasi QR Plot Topping</h1>
          <div style="font-size: 0.68rem; color: #94A3B8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Kegiatan Panen Mata Entres (Topping)</div>
        </div>
        <button id="btn-toggle-flash" type="button" aria-label="Flashlight" style="padding: 8px; margin-right: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #FBBF24;">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        </button>
      </header>

      <!-- VIEWFINDER CAMERA AREA -->
      <main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 16px 16px 20px; position: relative; z-index: 5; overflow-y: auto;">
        
        <!-- INFO TARGET KEGIATAN -->
        <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 8px 14px; width: 100%; max-width: 320px; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; backdrop-filter: blur(4px);">
          <div>
            <div style="font-size: 0.66rem; color: #94A3B8;">Target Kegiatan:</div>
            <div style="font-size: 0.78rem; font-weight: 700; color: #F8FAFC;">Panen Topping (${plots.length} Plot)</div>
          </div>
          <span style="font-size: 0.65rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: rgba(34, 197, 94, 0.2); color: #4ADE80; border: 1px solid rgba(34, 197, 94, 0.3);">Scan Plot</span>
        </div>

        <!-- CAMERA FRAME / RETICLE -->
        <div style="position: relative; width: 220px; height: 220px; margin: auto 0; display: flex; align-items: center; justify-content: center;">
          <!-- Real Video Feed -->
          <video id="scan-video-feed" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover; border-radius: 16px; display: none;"></video>
          
          <!-- Mock Camera Background -->
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
          Arahkan kamera ke <strong>QR Code</strong> pada patok/tiang Plot Entres yang akan ditopping.
        </p>

        <!-- STATUS SCAN AKTIF -->
        <div id="scan-status-pill" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 20px; padding: 4px 12px; margin-bottom: 12px;">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #22C55E; box-shadow: 0 0 6px #22C55E; animation: pulse 1.5s infinite;"></span>
          <span style="font-size: 0.70rem; color: #86EFAC; font-weight: 600;">Memindai QR Code Plot...</span>
        </div>

        <!-- SIMULASI SCAN CEPAT (DEMO TOOLBOX) -->
        <div style="width: 100%; max-width: 320px; background: rgba(30, 41, 59, 0.85); border: 1px dashed rgba(34, 197, 94, 0.4); border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; box-sizing: border-box;">
          <div style="font-size: 0.68rem; font-weight: 700; color: #4ADE80; margin-bottom: 6px; text-transform: uppercase;">
            ⚡ Simulasi Scan QR Plot Fisik:
          </div>
          <div style="display: flex; gap: 6px; overflow-x: auto; padding-bottom: 2px; scrollbar-width: none;">
            ${plots.slice(0, 5).map(p => `
              <button type="button" class="btn-mock-qr-scan" data-plot="${p.plotName}" style="background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); color: #86EFAC; font-size: 0.70rem; font-weight: 600; padding: 4px 8px; border-radius: 6px; cursor: pointer; white-space: nowrap;">
                🏷️ ${p.kodePlot}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- TOMBOL PILIH MANUAL -->
        <button id="btn-manual-select-topping" type="button" style="width: 100%; max-width: 320px; height: 42px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 8px; color: #FFFFFF; font-size: 0.82rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
          Pilih Plot Manual
        </button>

      </main>

      <!-- MODAL BOTTOM SHEET: PILIH PLOT MANUAL -->
      <div id="overlay-manual-plot-sheet" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 50; backdrop-filter: blur(2px);"></div>
      
      <div id="sheet-manual-plot" style="display: none; position: fixed; left: 0; right: 0; bottom: 0; background: #FFFFFF; color: #111827; border-radius: 18px 18px 0 0; padding: 18px 16px 24px; z-index: 51; flex-direction: column; max-height: 75vh; box-shadow: 0 -8px 24px rgba(0,0,0,0.3); box-sizing: border-box;">
        <div style="width: 36px; height: 4px; background: #E2E8F0; border-radius: 2px; margin: 0 auto 12px;"></div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div>
            <h2 style="font-size: 0.95rem; font-weight: 800; color: #111827; margin: 0 0 2px;">Pilih Plot Kebun Entres</h2>
            <p style="font-size: 0.70rem; color: #64748B; margin: 0;">Pilih plot untuk kegiatan Topping (Panen Mata Entres).</p>
          </div>
          <button id="btn-close-manual-sheet" type="button" style="background: #F1F5F9; border: none; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #475569;">✕</button>
        </div>

        <div style="overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-top: 4px; padding-bottom: 10px;">
          ${plots.map((p, idx) => `
            <div class="card-pick-manual-plot" data-index="${idx}" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; cursor: pointer;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <div style="font-weight: 800; font-size: 0.86rem; color: #111827;">${p.kodePlot}</div>
                  <div style="font-size: 0.74rem; font-weight: 700; color: #116834; margin-top: 2px;">
                    Klon: ${p.namaKlon}
                  </div>
                  <div style="font-size: 0.68rem; color: #64748B; margin-top: 2px;">
                    Populasi: ${parseInt(p.jlhPokok || 0).toLocaleString('id-ID')} Pokok • Tanam: ${p.tahunTanam || '-'}
                  </div>
                </div>
                <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; background: #DCFCE7; color: #15803D;">
                  Pilih →
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

    </div>

    <!-- STYLE ANIMASI SCANNER -->
    <style>
      @keyframes scanLineAnim {
        0% { top: 10px; opacity: 0.8; }
        50% { top: 190px; opacity: 1; }
        100% { top: 10px; opacity: 0.8; }
      }
    </style>
  `;

  // Start real camera feed if available
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
        // Fallback gracefully
      });
  }

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
  };

  // Back Button
  app.querySelector('#btn-scan-back')?.addEventListener('click', () => {
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

  const proceedToForm = (plotData, verifiedMethod = 'QR_SCAN') => {
    stopCamera();

    const payload = {
      id: plotData.id,
      kodePlot: plotData.kodePlot || `Plot ${plotData.plotName}`,
      plotName: plotData.plotName,
      namaKlon: plotData.namaKlon || plotData.cloneName,
      jlhPokok: plotData.jlhPokok || plotData.numberOfPlants || 425,
      budwoodCode: plotData.budwoodCode || '2021/BWG/001',
      sourceMenunasDocNo: null,
      verifiedMethod: `${verifiedMethod}_VERIFIED`
    };

    storage.set('selected_topping_plot', payload);
    storage.set('selected_entres_plot', payload);
    storage.remove('selected_topping_menunas_source');
    storage.remove('editing_topping_index');

    toast(`Plot Terverifikasi: ${payload.kodePlot} (${payload.namaKlon})`, 'success');
    navigate('/entres/topping/form');
  };

  // Mock Barcode Quick Scan Buttons
  app.querySelectorAll('.btn-mock-qr-scan').forEach(btn => {
    btn.addEventListener('click', () => {
      const pName = btn.dataset.plot;
      const found = plots.find(p => p.plotName === pName || p.kodePlot === pName) || plots[0];
      proceedToForm(found, 'QR_SCAN');
    });
  });

  // Manual Select Modal Sheet
  const overlayManual = app.querySelector('#overlay-manual-plot-sheet');
  const sheetManual = app.querySelector('#sheet-manual-plot');

  const openManualSheet = () => {
    if (overlayManual) overlayManual.style.display = 'block';
    if (sheetManual) sheetManual.style.display = 'flex';
  };

  const closeManualSheet = () => {
    if (overlayManual) overlayManual.style.display = 'none';
    if (sheetManual) sheetManual.style.display = 'none';
  };

  app.querySelector('#btn-manual-select-topping')?.addEventListener('click', openManualSheet);
  overlayManual?.addEventListener('click', closeManualSheet);
  app.querySelector('#btn-close-manual-sheet')?.addEventListener('click', closeManualSheet);

  app.querySelectorAll('.card-pick-manual-plot').forEach(card => {
    card.addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.dataset.index, 10);
      const chosen = plots[idx];
      if (chosen) {
        closeManualSheet();
        proceedToForm(chosen, 'MANUAL_SELECT');
      }
    });
  });
}
