/**
 * core/export-screen.js — Fitur Export / Unduh Tangkapan Layar Frame HP (Screenshot)
 * Menggunakan Native Browser Engine (html-to-image) untuk menghasilkan tangkapan layar
 * yang 100% presisi piksel, teks harmonis & rapi di tengah tombol, ikon sejajar,
 * dan warna asli tajam (2x HD).
 */

import { getCurrent } from './router.js';
import { toast } from '../components/toast.js';

const ROUTE_LABELS = {
  '/login': 'Login',
  '/splash': 'Splash',
  '/sync': 'Sinkronisasi',
  '/home': 'Beranda',
  '/attendance': 'Presensi',
  '/attendance/supervisor': 'Presensi Mandor',
  '/attendance/supervisor/result': 'Hasil Presensi Mandor',
  '/attendance/workers': 'Presensi Pekerja',
  '/attendance/summary': 'Ringkasan Presensi',
  '/reception': 'Penerimaan',
  '/reception/benih': 'Penerimaan Benih',
  '/reception/benih/sir': 'Input SIR Benih',
  '/reception/benih/camera': 'Kamera Penerimaan',
  '/reception/summary': 'Ringkasan Penerimaan',
  '/seeding': 'Penyemaian',
  '/seeding/form': 'Form Penyemaian'
};

function getActivePageInfo() {
  const current = (getCurrent().route || '/login').split('?')[0];
  const label = ROUTE_LABELS[current] || 'Layar HP';
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return { route: current, label, slug };
}

/**
 * Update label nama halaman aktif pada toolbar di atas frame HP
 */
export function updateDeviceToolbarLabel() {
  const labelEl = document.getElementById('device-active-page-label');
  if (labelEl) {
    const info = getActivePageInfo();
    labelEl.textContent = info.label;
  }
}

/**
 * Menangkap tampilan layar HP dan mengunduhnya sebagai file gambar PNG beresolusi tinggi & harmonis
 * @param {Object} options - { withFrame: boolean, includeMarkers: boolean }
 */
export async function captureDeviceScreen(options = { withFrame: false, includeMarkers: false }) {
  const { label, slug } = getActivePageInfo();
  const targetId = options.withFrame ? 'device-frame' : 'device-screen';
  const targetEl = document.getElementById(targetId);

  if (!targetEl) {
    toast('Elemen layar HP tidak ditemukan.', 'danger');
    return;
  }

  const exportBtn = document.getElementById('btn-export-screen');
  if (exportBtn) {
    exportBtn.disabled = true;
    exportBtn.classList.add('is-loading');
    exportBtn.innerHTML = '⏳ Memproses...';
  }

  // Bersihkan sementara toast aktif
  const toastRoot = document.getElementById('toast-root');
  const toastPrevDisplay = toastRoot ? toastRoot.style.display : '';
  if (toastRoot) toastRoot.style.display = 'none';

  // Sembunyikan sementara marker pins jika tidak ingin disertakan
  const markerLayer = document.getElementById('marker-layer');
  const previousMarkerDisplay = markerLayer ? markerLayer.style.display : '';
  if (markerLayer && !options.includeMarkers) {
    markerLayer.style.display = 'none';
  }

  try {
    let dataUrl = '';

    // Prioritas 1: Gunakan htmlToImage (Native Browser Rendering Engine - Pixel Perfect)
    if (window.htmlToImage && typeof window.htmlToImage.toPng === 'function') {
      const filter = (node) => {
        if (!node || !node.id) return true;
        if (node.id === 'toast-root' || (node.classList && node.classList.contains('toast'))) return false;
        if (node.id === 'marker-layer' && !options.includeMarkers) return false;
        return true;
      };

      dataUrl = await window.htmlToImage.toPng(targetEl, {
        pixelRatio: 2,
        backgroundColor: options.withFrame ? null : '#ffffff',
        filter: filter,
        style: {
          transform: 'none',
          boxShadow: options.withFrame ? targetEl.style.boxShadow : 'none'
        }
      });
    } 
    // Fallback: html2canvas jika htmlToImage belum terpasang
    else if (typeof window.html2canvas === 'function') {
      const canvas = await window.html2canvas(targetEl, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: options.withFrame ? null : '#ffffff',
        logging: false
      });
      dataUrl = canvas.toDataURL('image/png');
    } else {
      throw new Error('Pustaka pengunduh layar belum siap, muat ulang halaman.');
    }

    if (!dataUrl) {
      throw new Error('Gagal menghasilkan data gambar.');
    }

    // Format nama file: sigma-nursery-[halaman]-[tanggal-jam].png
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const fileName = `sigma-nursery-${slug}-${dateStr}.png`;

    // Download ke browser
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast(`📸 Tangkapan layar "${label}" berhasil diunduh (Harmonis & Presisi)!`, 'success');

  } catch (err) {
    console.error('[Export Screen Error]:', err);
    toast('Gagal mengunduh tangkapan layar: ' + err.message, 'danger');
  } finally {
    // Kembalikan tampilan semula
    if (toastRoot) toastRoot.style.display = toastPrevDisplay;
    if (markerLayer) markerLayer.style.display = previousMarkerDisplay;

    if (exportBtn) {
      exportBtn.disabled = false;
      exportBtn.classList.remove('is-loading');
      exportBtn.innerHTML = '📸 Unduh Layar HP';
    }
  }
}

/**
 * Inisialisasi Device Toolbar di atas Frame HP
 */
export function initExportScreenToolbar() {
  const container = document.getElementById('device-toolbar-container');
  if (!container) return;

  const info = getActivePageInfo();

  container.innerHTML = `
    <div class="device-preview-toolbar">
      <div class="device-toolbar-left">
        <span class="device-live-dot" title="Layar Aktif"></span>
        <span class="device-page-tag">
          Halaman: <strong id="device-active-page-label">${info.label}</strong>
        </span>
      </div>
      <div class="device-toolbar-right">
        <div class="export-dropdown-wrapper">
          <button class="btn-export-screen" id="btn-export-screen" type="button" title="Klik untuk unduh tangkapan layar presisi (PNG)">
            📸 Unduh Layar HP
          </button>
          <button class="btn-export-options" id="btn-export-options-toggle" type="button" title="Pilihan format unduhan">
            ▾
          </button>
          <div class="export-dropdown-menu" id="export-dropdown-menu">
            <button class="export-dropdown-item" id="opt-export-clean" type="button">
              🖼️ Hanya Tampilan Layar (Presisi & Rapi)
            </button>
            <button class="export-dropdown-item" id="opt-export-frame" type="button">
              📱 Lengkap dengan Bingkai HP (Mockup)
            </button>
            <button class="export-dropdown-item" id="opt-export-markers" type="button">
              📍 Sertakan Pin Marker Catatan
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach Event Listeners
  const btnExport = container.querySelector('#btn-export-screen');
  btnExport?.addEventListener('click', () => {
    captureDeviceScreen({ withFrame: false, includeMarkers: false });
  });

  const btnToggleMenu = container.querySelector('#btn-export-options-toggle');
  const menu = container.querySelector('#export-dropdown-menu');

  btnToggleMenu?.addEventListener('click', (e) => {
    e.stopPropagation();
    menu?.classList.toggle('is-open');
  });

  document.addEventListener('click', () => {
    menu?.classList.remove('is-open');
  });

  container.querySelector('#opt-export-clean')?.addEventListener('click', () => {
    menu?.classList.remove('is-open');
    captureDeviceScreen({ withFrame: false, includeMarkers: false });
  });

  container.querySelector('#opt-export-frame')?.addEventListener('click', () => {
    menu?.classList.remove('is-open');
    captureDeviceScreen({ withFrame: true, includeMarkers: false });
  });

  container.querySelector('#opt-export-markers')?.addEventListener('click', () => {
    menu?.classList.remove('is-open');
    captureDeviceScreen({ withFrame: false, includeMarkers: true });
  });

  // Update label saat berpindah halaman
  window.addEventListener('hashchange', () => {
    updateDeviceToolbarLabel();
  });
}
