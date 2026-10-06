/**
 * js/core/simulation-clock-service.js
 * Simulation Clock Service — Khusus untuk ROLES.MANTRI_TANAMAN.
 * 
 * Prinsip:
 * 1. Hanya menyimulasikan sumber waktu (Time Provider).
 * 2. Tidak membypass atau mengubah business rule & validator existing.
 * 3. Hanya aktif jika session role === ROLES.MANTRI_TANAMAN.
 * 4. Role selain MANTRI_TANAMAN selalu fallback ke waktu aktual perangkat.
 */

import { session } from './session.js';
import { ROLES } from './permissions.js';
import { todayISO, nowTimeWithSeconds, nowISO, pad, esc } from './utils.js';
import { openModal, closeModal } from '../components/modal.js';
import { toast } from '../components/toast.js';

export const SIMULATION_CLOCK_STORAGE_KEY = 'sigma_simulation_clock_mantri';

/**
 * Validasi string tanggal YYYY-MM-DD
 */
export function isValidDateString(dateStr) {
  if (typeof dateStr !== 'string') return false;
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dateObj = new Date(y, m - 1, d);
  return dateObj.getFullYear() === y && dateObj.getMonth() === m - 1 && dateObj.getDate() === d;
}

/**
 * Validasi string waktu HH:mm
 */
export function isValidTimeString(timeStr) {
  if (typeof timeStr !== 'string') return false;
  const match = timeStr.trim().match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;
  const [, h, min] = match.map(Number);
  return h >= 0 && h <= 23 && min >= 0 && min <= 59;
}

/**
 * Membaca raw state dari localStorage
 */
export function getSimulationState() {
  try {
    const raw = localStorage.getItem(SIMULATION_CLOCK_STORAGE_KEY);
    if (!raw) return { enabled: false, simulatedDate: null, simulatedTime: null, updatedAt: null };
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        enabled: Boolean(parsed.enabled),
        simulatedDate: isValidDateString(parsed.simulatedDate) ? parsed.simulatedDate.trim() : null,
        simulatedTime: isValidTimeString(parsed.simulatedTime) ? parsed.simulatedTime.trim() : null,
        updatedAt: parsed.updatedAt || null
      };
    }
  } catch (err) {
    console.warn('[simulation-clock] Gagal parse simulation state:', err);
  }
  return { enabled: false, simulatedDate: null, simulatedTime: null, updatedAt: null };
}

/**
 * Menyimpan simulation state ke localStorage setelah validasi
 */
export function setSimulationState({ enabled = true, simulatedDate, simulatedTime }) {
  if (enabled) {
    if (!isValidDateString(simulatedDate)) {
      throw new Error('Format tanggal simulasi tidak valid. Wajib YYYY-MM-DD.');
    }
    if (!isValidTimeString(simulatedTime)) {
      throw new Error('Format waktu simulasi tidak valid. Wajib HH:mm.');
    }
  }

  const payload = {
    enabled: Boolean(enabled),
    simulatedDate: enabled ? simulatedDate.trim() : null,
    simulatedTime: enabled ? simulatedTime.trim() : null,
    updatedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(SIMULATION_CLOCK_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('[simulation-clock] Gagal simpan ke localStorage:', err);
    throw err;
  }

  return payload;
}

/**
 * Menghapus state simulation dari localStorage
 */
export function clearSimulationState() {
  try {
    localStorage.removeItem(SIMULATION_CLOCK_STORAGE_KEY);
  } catch (err) {
    console.warn('[simulation-clock] Gagal hapus simulation state:', err);
  }
}

/**
 * Mengecek apakah simulasi aktif dan role saat ini adalah ROLES.MANTRI_TANAMAN
 */
export function isSimulationActive() {
  const currentRole = session.getRole();
  // Role isolation ketat: Hanya aktif jika role canonical === ROLES.MANTRI_TANAMAN
  if (currentRole !== ROLES.MANTRI_TANAMAN) {
    return false;
  }

  const state = getSimulationState();
  return Boolean(
    state.enabled &&
    state.simulatedDate &&
    state.simulatedTime &&
    isValidDateString(state.simulatedDate) &&
    isValidTimeString(state.simulatedTime)
  );
}

/**
 * Mengambil tanggal efektif format YYYY-MM-DD
 */
export function getEffectiveDate() {
  if (isSimulationActive()) {
    const state = getSimulationState();
    return state.simulatedDate;
  }
  return todayISO();
}

/**
 * Mengambil jam efektif (integer 0–23)
 */
export function getEffectiveHour() {
  if (isSimulationActive()) {
    const state = getSimulationState();
    const parts = state.simulatedTime.split(':');
    return parseInt(parts[0], 10);
  }
  return new Date().getHours();
}

/**
 * Mengambil waktu efektif format HH:mm:ss
 */
export function getEffectiveTimeWithSeconds() {
  if (isSimulationActive()) {
    const state = getSimulationState();
    return `${state.simulatedTime}:00`;
  }
  return nowTimeWithSeconds();
}

/**
 * Mengambil ISO timestamp yang selaras dengan waktu simulasi
 */
export function getEffectiveISO() {
  if (isSimulationActive()) {
    const state = getSimulationState();
    const isoPrefix = `${state.simulatedDate}T${state.simulatedTime}:00`;
    const d = new Date(isoPrefix);
    if (!isNaN(d.getTime())) {
      return d.toISOString();
    }
  }
  return nowISO();
}

/**
 * Membuka Modal UI Pengaturan Simulation Clock
 * @param {Function} [onApplied] Callback yang dipanggil setelah simpan/reset
 */
export function openSimulationClockModal(onApplied = null) {
  const state = getSimulationState();
  const isActive = isSimulationActive();
  const defaultDate = state.simulatedDate || todayISO();
  const defaultTime = state.simulatedTime || (nowTimeWithSeconds() ? nowTimeWithSeconds().slice(0, 5) : '07:30');

  const modalBody = `
    <div class="simulation-clock-modal-body" style="display: flex; flex-direction: column; gap: 14px; font-size: 0.88rem; color: #1e293b;">
      <!-- Status Card -->
      <div style="background: ${isActive ? '#fffbeb' : '#f8fafc'}; border: 1px solid ${isActive ? '#fde68a' : '#e2e8f0'}; border-radius: 8px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div style="font-size: 0.72rem; font-weight: 700; color: ${isActive ? '#b45309' : '#64748b'}; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;">
            Status
          </div>
          <div style="font-weight: 700; font-size: 0.95rem; color: ${isActive ? '#92400e' : '#0f172a'}; display: flex; align-items: center; gap: 6px;">
            ${isActive ? '⚠ MODE SIMULASI AKTIF' : '● Mode Aktual Sistem'}
          </div>
        </div>
        <div style="font-size: 0.78rem; color: #64748b; text-align: right;">
          Role: <strong>Mantri Bibitan</strong>
        </div>
      </div>

      <!-- Form Input -->
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 4px;">
            Tanggal Simulasi
          </label>
          <input 
            type="date" 
            id="sim-input-date" 
            class="input input-block" 
            value="${esc(defaultDate)}"
            style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.88rem;"
          />
        </div>

        <div>
          <label style="display: block; font-size: 0.8rem; font-weight: 600; color: #475569; margin-bottom: 4px;">
            Waktu Simulasi (HH:mm)
          </label>
          <input 
            type="time" 
            id="sim-input-time" 
            class="input input-block" 
            value="${esc(defaultTime)}"
            style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.88rem;"
          />
        </div>
      </div>

      <!-- Informasi Virtual HP Clock -->
      <div style="font-size: 0.76rem; color: #475569; line-height: 1.45; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 12px; border-radius: 6px;">
        ℹ️ <strong>Informasi:</strong> Simulasi ini berfungsi sebagai <strong>Waktu Virtual HP</strong> untuk kebutuhan pengujian. Aplikasi akan memperlakukan tanggal dan waktu di atas sebagai waktu saat ini.
      </div>
    </div>
  `;

  const modalFooter = `
    <div style="display: flex; gap: 8px; width: 100%;">
      ${isActive ? `
        <button class="btn btn-outline" id="btn-sim-reset" type="button" style="color: #dc2626; border-color: #fca5a5; flex: 1;">
          Kembali ke Waktu Aktual
        </button>
      ` : ''}
      <button class="btn btn-primary" id="btn-sim-apply" type="button" style="flex: 1.5; background: #116834;">
        Terapkan Simulasi
      </button>
    </div>
  `;

  openModal({
    title: 'SIMULASI WAKTU',
    body: modalBody,
    footer: modalFooter,
    onClose: () => {}
  });

  const modalRoot = document.getElementById('modal-root');
  const dateInput = modalRoot?.querySelector('#sim-input-date');
  const timeInput = modalRoot?.querySelector('#sim-input-time');
  const applyBtn = modalRoot?.querySelector('#btn-sim-apply');
  const resetBtn = modalRoot?.querySelector('#btn-sim-reset');

  // Handle Apply
  applyBtn?.addEventListener('click', () => {
    const dateVal = dateInput?.value?.trim();
    const timeVal = timeInput?.value?.trim();

    if (!isValidDateString(dateVal)) {
      toast.warning('Tanggal tidak valid. Masukkan format YYYY-MM-DD yang valid.');
      return;
    }
    if (!isValidTimeString(timeVal)) {
      toast.warning('Waktu tidak valid. Masukkan format HH:mm yang valid (00:00 - 23:59).');
      return;
    }

    try {
      setSimulationState({
        enabled: true,
        simulatedDate: dateVal,
        simulatedTime: timeVal
      });
      closeModal();
      toast.success(`Mode simulasi aktif: ${dateVal} ${timeVal} WIB`);
      if (typeof onApplied === 'function') {
        onApplied();
      } else {
        window.location.reload();
      }
    } catch (err) {
      toast.danger(err.message || 'Gagal menerapkan simulasi.');
    }
  });

  // Handle Reset
  resetBtn?.addEventListener('click', () => {
    clearSimulationState();
    closeModal();
    toast.info('Simulasi dinonaktifkan. Kembali ke waktu aktual sistem.');
    if (typeof onApplied === 'function') {
      onApplied();
    } else {
      window.location.reload();
    }
  });
}
