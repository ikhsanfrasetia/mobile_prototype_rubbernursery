/**
 * modules/inspection/inspection-scan.js — Fitur Scan QR Batch untuk Pemeriksaan Hasil Okulasi.
 * Berfungsi sebagai QR Batch Gateway sebelum membuka form pemeriksaan.
 * Memvalidasi identitas patok bedengan terhadap target batch terpilih.
 */

import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { toast } from '../../components/toast.js';
import { formatStandardDocNo } from '../../core/utils.js';

export function renderInspectionScan() {
  const app = document.getElementById('app');

  const batchIdx = storage.get('selected_inspection_budding_index', 0);
  const buddingTxs = storage.get('budding_transactions', []);
  const inspectionTxs = storage.get('inspection_transactions', []);

  const selectedBatch = buddingTxs[batchIdx] || {
    batchNo: 'Batch-01',
    docNo: formatStandardDocNo(2026, 'GRF', 1),
    sourceDocNo: formatStandardDocNo(2026, 'SOW', 1),
    type: 'GRAFTING',
    klonEntres: 'PB 260',
    klonRootstock: 'GT1',
    bedengan: 'Bedengan 01',
    jumlah: 2000,
    workers: []
  };

  const targetBatchNo = selectedBatch.batchNo || 'Batch-01';
  const targetDocNo = selectedBatch.docNo || formatStandardDocNo(2026, 'GRF', 1);
  const targetBedengan = selectedBatch.bedengan || 'Bedengan 01';
  const targetKlon = selectedBatch.klonEntres || selectedBatch.klon || 'PB 260';
  const targetRootstock = selectedBatch.klonRootstock || 'GT1';
  const isRegrafting = selectedBatch.type === 'REGRAFTING';
  const targetType = isRegrafting ? 'Okulasi Janda (Regrafting)' : 'Okulasi (Grafting)';
  const populasiDiokulasi = parseInt(selectedBatch.jumlah || 0);

  // Filter daftar batch aktif untuk fallback manual (hanya yang sisa > 0)
  const activeBatches = buddingTxs.map((btx, idx) => {
    const pop = parseInt(btx.jumlah || 0);
    const relatedInspections = inspectionTxs.filter(insp => insp.buddingDocNo === btx.docNo);
    let totalDip = 0;
    relatedInspections.forEach(insp => {
      totalDip += parseInt(insp.totalDiperiksa || (parseInt(insp.jumlahJadi || 0) + parseInt(insp.jumlahGagal || 0)));
    });
    const sisa = Math.max(0, pop - totalDip);
    return {
      ...btx,
      originalIndex: idx,
      sisaBelumDiperiksa: sisa
    };
  }).filter(b => b.sisaBelumDiperiksa > 0);

  app.innerHTML = `
    <div class="page inspection-scan-page" style="display: flex; flex-direction: column; height: 100%; background: #0F172A; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; position: relative; overflow: hidden;">
      
      <!-- TOP NAVIGATION BAR -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); border-bottom: 1px solid rgba(255,255,255,0.1); z-index: 10; flex-shrink: 0;">
        <button id="btn-scan-back" type="button" aria-label="Batal Scan" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #FFFFFF;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <div style="text-align: center; flex: 1; padding: 0 8px;">
          <h1 style="font-size: 1rem; font-weight: 700; margin: 0; color: #FFFFFF; letter-spacing: -0.01em;">Identifikasi QR Pemeriksaan</h1>
          <div style="font-size: 0.68rem; color: #94A3B8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${targetBatchNo} • ${targetDocNo}</div>
        </div>
        <button id="btn-toggle-flash" type="button" aria-label="Flashlight" style="padding: 8px; margin-right: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #FBBF24;">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        </button>
      </header>

      <!-- VIEWFINDER CAMERA AREA -->
      <main style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 16px 16px 20px; position: relative; z-index: 5;">
        
        <!-- INFO TARGET BATCH PEMERIKSAAN -->
        <div style="background: rgba(30, 41, 59, 0.75); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 10px 14px; width: 100%; max-width: 330px; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; backdrop-filter: blur(4px);">
          <div>
            <div style="font-size: 0.66rem; color: #94A3B8;">Target Batch Pemeriksaan:</div>
            <div style="font-size: 0.82rem; font-weight: 800; color: #F8FAFC; margin-top: 1px;">${targetBatchNo} • ${targetBedengan}</div>
            <div style="font-size: 0.68rem; color: #CBD5E1; margin-top: 1px;">Klon: ${targetKlon} (${targetType})</div>
          </div>
          <span style="font-size: 0.65rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; background: rgba(34, 197, 94, 0.2); color: #4ADE80; border: 1px solid rgba(34, 197, 94, 0.3);">
            ${populasiDiokulasi} Pkk
          </span>
        </div>

        <!-- CAMERA FRAME / RETICLE -->
        <div style="position: relative; width: 220px; height: 220px; margin: auto 0; display: flex; align-items: center; justify-content: center;">
          <!-- Real Video Feed (Stream) -->
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

        <p style="font-size: 0.76rem; color: #CBD5E1; text-align: center; margin: 0 0 8px; max-width: 280px; line-height: 1.4;">
          Arahkan kamera ke <strong>QR Code Patok Bedengan</strong> untuk memvalidasi <strong>${targetBatchNo}</strong>.
        </p>

        <!-- STATUS SCAN AKTIF -->
        <div id="scan-status-pill" style="display: inline-flex; align-items: center; gap: 6px; background: rgba(34, 197, 94, 0.15); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 20px; padding: 4px 12px; margin-bottom: 10px;">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: #22C55E; box-shadow: 0 0 6px #22C55E; animation: pulse 1.5s infinite;"></span>
          <span style="font-size: 0.72rem; color: #86EFAC; font-weight: 600;">Memindai QR Batch...</span>
        </div>

        <!-- SIMULASI QUICK SCAN (DEMO / DEV TOOLBOX) -->
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
            <button type="button" class="btn-mock-qr-scan" data-batch="${targetBatchNo}" data-doc="${targetDocNo}" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(34,197,94,0.4); color: #4ADE80; font-size: 0.74rem; font-weight: 700; padding: 5px 12px; border-radius: 6px; cursor: pointer; white-space: nowrap; transition: all 0.15s ease;">
              🏷️ ${targetBatchNo} (Valid)
            </button>
            <button type="button" class="btn-mock-qr-scan" data-batch="Batch-99" data-doc="2026/GRF/999" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(239,68,68,0.4); color: #FCA5A5; font-size: 0.74rem; font-weight: 700; padding: 5px 12px; border-radius: 6px; cursor: pointer; white-space: nowrap; transition: all 0.15s ease;">
              🏷️ Batch-99 (Invalid Test)
            </button>
          </div>
        </div>

        <!-- KOTAK PERINGATAN GAGAL SCAN (MUNCUL JIKA GAGAL SCAN MINIMAL 1 KALI) -->
        <div id="box-scan-failed" style="display: none; width: 100%; max-width: 330px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 12px 14px; margin-bottom: 8px; text-align: center; box-sizing: border-box; animation: fadeIn 0.3s ease;">
          <div style="font-size: 0.82rem; font-weight: 800; color: #991B1B; margin-bottom: 2px;">
            ⚠️ QR Code Tidak Terbaca
          </div>
          <p style="font-size: 0.72rem; color: #7F1D1D; margin: 0 0 10px; line-height: 1.35;">
            QR Code patok bedengan tidak terbaca atau rusak. Silakan coba kembali atau gunakan verifikasi manual nomor batch.
          </p>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button id="btn-retry-scan" type="button" style="width: 100%; height: 38px; background: #374151; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              <span>Coba Scan Lagi</span>
            </button>
            <button id="btn-open-manual-picker" type="button" style="width: 100%; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 800; font-size: 0.80rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 2px 6px rgba(17,104,52,0.3);">
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
              </svg>
              <span>Pilih Nomor Batch Manual</span>
            </button>
          </div>
        </div>

      </main>

      <!-- MODAL DIALOG PEMILIHAN NOMOR BATCH MANUAL -->
      <div id="modal-manual-picker-overlay" style="display: none; position: absolute; inset: 0; background: rgba(0,0,0,0.6); z-index: 100; backdrop-filter: blur(2px);"></div>
      
      <div id="dialog-manual-picker" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; max-width: 340px; background: #FFFFFF; color: #111827; border-radius: 12px; padding: 18px 16px; box-shadow: 0 12px 30px rgba(0,0,0,0.25); z-index: 101; box-sizing: border-box;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div>
            <h3 style="font-size: 0.95rem; font-weight: 800; color: #111827; margin: 0;">Pilih Nomor Batch</h3>
            <div style="font-size: 0.70rem; color: #6B7280; margin-top: 2px;">Target: <strong style="color: #116834;">${targetBatchNo}</strong> (${targetBedengan})</div>
          </div>
          <button id="btn-close-manual-dialog" type="button" aria-label="Tutup" style="background: #F3F4F6; border: none; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #4B5563;">
            ✕
          </button>
        </div>

        <p style="font-size: 0.72rem; color: #4B5563; margin: 0 0 10px 0; line-height: 1.35;">
          Pilih nomor batch patok bedengan tempat pemeriksaan berlangsung untuk verifikasi fisik:
        </p>

        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto; padding-right: 2px; margin-bottom: 12px;">
          ${activeBatches.map(b => {
            const isMatch = b.batchNo === targetBatchNo;
            return `
              <div class="manual-batch-option" data-batch="${b.batchNo}" data-doc="${b.docNo || ''}" data-index="${b.originalIndex}" style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.15s ease;">
                <div>
                  <div style="font-weight: 800; font-size: 0.84rem; color: #111827;">${b.batchNo}</div>
                  <div style="font-size: 0.70rem; color: #6B7280; margin-top: 1px;">${b.bedengan || 'Bedengan'} • ${b.klonEntres || b.klon || 'PB 260'}</div>
                </div>
                <div style="text-align: right;">
                  <span style="font-size: 0.65rem; font-weight: 700; color: #116834; background: #E8F5E9; padding: 2px 6px; border-radius: 4px; border: 1px solid #C8E6C9;">
                    Sisa ${b.sisaBelumDiperiksa} Pkk
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <button id="btn-cancel-manual-picker" type="button" style="width: 100%; height: 38px; background: #F3F4F6; color: #374151; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer;">
          Batal & Kembali ke Scanner
        </button>
      </div>

    </div>

    <!-- SCAN LINE ANIMATION STYLES -->
    <style>
      @keyframes scanLineAnim {
        0% { top: 12px; opacity: 0.8; }
        50% { top: 190px; opacity: 1; }
        100% { top: 12px; opacity: 0.8; }
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
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
        // Desktop or no permission, fallback to visual mock
      });
  }

  const stopCamera = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
    }
  };

  // State Cleanup & Back Navigation
  const cleanupAndGoBack = () => {
    clearTimeout(failTimer);
    stopCamera();
    storage.remove('inspection_qr_verified');
    storage.remove('inspection_verified_at');
    storage.remove('inspection_verified_batch');
    navigate('/inspection');
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

    // Tampilkan kotak opsi fallback
    if (boxFailed) {
      boxFailed.style.display = 'block';
    }

    toast('QR Code belum terbaca. Opsi verifikasi manual telah dibuka.', 'error');
  };

  // Trigger uji gagal scan manual
  app.querySelector('#btn-mock-fail-scan')?.addEventListener('click', triggerScanFailure);

  // Auto trigger gagal scan setelah 6 detik jika belum berhasil scan
  const failTimer = setTimeout(() => {
    triggerScanFailure();
  }, 6000);

  // Reset Scanner State (Coba Scan Lagi)
  const resetScannerState = () => {
    scanFailed = false;
    if (laserLine) {
      laserLine.style.background = 'linear-gradient(90deg, transparent, #22C55E, #4ADE80, #22C55E, transparent)';
      laserLine.style.boxShadow = '0 0 12px #22C55E';
    }
    if (scanStatusPill) {
      scanStatusPill.style.background = 'rgba(34, 197, 94, 0.15)';
      scanStatusPill.style.borderColor = 'rgba(34, 197, 94, 0.3)';
      scanStatusPill.innerHTML = `
        <span style="width: 7px; height: 7px; border-radius: 50%; background: #22C55E; box-shadow: 0 0 6px #22C55E; animation: pulse 1.5s infinite;"></span>
        <span style="font-size: 0.72rem; color: #86EFAC; font-weight: 600;">Memindai QR Batch...</span>
      `;
    }
    if (boxFailed) {
      boxFailed.style.display = 'none';
    }
    toast('Pemindai direset. Arahkan kamera ke patok bedengan.', 'info');
  };

  app.querySelector('#btn-retry-scan')?.addEventListener('click', resetScannerState);

  // Process Validated Result
  const handleValidationSuccess = (scannedBatch) => {
    clearTimeout(failTimer);
    stopCamera();

    storage.set('inspection_qr_verified', true);
    storage.set('inspection_verified_at', new Date().toLocaleTimeString('id-ID'));
    storage.set('inspection_verified_batch', targetBatchNo);

    toast(`Identifikasi Fisik Berhasil: ${targetBatchNo}`, 'info');

    setTimeout(() => {
      navigate('/inspection/form');
    }, 200);
  };

  const handleValidationMismatch = (scannedBatch) => {
    toast(`QR/Batch Tidak Sesuai: Terbaca [${scannedBatch}], Target [${targetBatchNo}]`, 'error');
  };

  // Mock Barcode Quick Scan Buttons
  app.querySelectorAll('.btn-mock-qr-scan').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const scannedBatch = e.currentTarget.dataset.batch || '';
      if (scannedBatch.trim().toUpperCase() === targetBatchNo.trim().toUpperCase()) {
        handleValidationSuccess(scannedBatch);
      } else {
        handleValidationMismatch(scannedBatch);
      }
    });
  });

  // Modal Manual Picker Handlers
  const modalPickerOverlay = app.querySelector('#modal-manual-picker-overlay');
  const dialogPicker = app.querySelector('#dialog-manual-picker');
  const btnOpenManual = app.querySelector('#btn-open-manual-picker');
  const btnCloseManual = app.querySelector('#btn-close-manual-dialog');
  const btnCancelManual = app.querySelector('#btn-cancel-manual-picker');

  const openManualPicker = () => {
    if (modalPickerOverlay) modalPickerOverlay.style.display = 'block';
    if (dialogPicker) dialogPicker.style.display = 'block';
  };

  const closeManualPicker = () => {
    if (modalPickerOverlay) modalPickerOverlay.style.display = 'none';
    if (dialogPicker) dialogPicker.style.display = 'none';
  };

  btnOpenManual?.addEventListener('click', openManualPicker);
  btnCloseManual?.addEventListener('click', closeManualPicker);
  btnCancelManual?.addEventListener('click', closeManualPicker);
  modalPickerOverlay?.addEventListener('click', closeManualPicker);

  // Selection inside Manual Picker
  app.querySelectorAll('.manual-batch-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      const pickedBatch = e.currentTarget.dataset.batch || '';
      closeManualPicker();

      if (pickedBatch.trim().toUpperCase() === targetBatchNo.trim().toUpperCase()) {
        handleValidationSuccess(pickedBatch);
      } else {
        handleValidationMismatch(pickedBatch);
      }
    });
  });

  // Back Button
  app.querySelector('#btn-scan-back')?.addEventListener('click', cleanupAndGoBack);

  // Toggle Flash
  let flashOn = false;
  app.querySelector('#btn-toggle-flash')?.addEventListener('click', (e) => {
    flashOn = !flashOn;
    e.currentTarget.style.color = flashOn ? '#F59E0B' : '#FFFFFF';
    toast(flashOn ? 'Lampu Flash Aktif' : 'Lampu Flash Dimatikan', 'info');
  });
}
