/**
 * js/components/date-filter-modal.js
 * Standardized Date Filter Modal & Calendar Header Components for Sigma Nursery
 */

import { todayDDMMYYYY, todayISO, esc } from '../core/utils.js';

/**
 * Robust date string normalization into DD/MM/YYYY format.
 */
export function normalizeDateStr(dStr) {
  if (!dStr) return '';
  const s = String(dStr).trim();
  // If DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    return s;
  }
  // If YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  // Date object or ISO string fallback
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return s;
}

/**
 * Convert DD/MM/YYYY to YYYY-MM-DD for <input type="date">
 */
export function ddmmyyyyToIso(ddmmyyyy) {
  if (!ddmmyyyy) return todayISO();
  const parts = String(ddmmyyyy).split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return todayISO();
}

/**
 * Get Yesterday date in DD/MM/YYYY
 */
export function getYesterdayDDMMYYYY() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Render Header Calendar Icon Button HTML
 */
export function renderCalendarHeaderButton(param1 = 'btn-open-date-filter', param2 = todayDDMMYYYY(), param3 = 'btn-open-date-filter') {
  let btnId = 'btn-open-date-filter';
  let activeDate = todayDDMMYYYY();
  let isFiltered = false;

  if (typeof param1 === 'string' && (param1.startsWith('btn-') || !param1.includes('/'))) {
    btnId = param1;
    activeDate = param2 || todayDDMMYYYY();
    isFiltered = normalizeDateStr(activeDate) !== todayDDMMYYYY();
  } else {
    activeDate = param1 || todayDDMMYYYY();
    isFiltered = typeof param2 === 'boolean' ? param2 : (normalizeDateStr(activeDate) !== todayDDMMYYYY());
    btnId = param3 || 'btn-open-date-filter';
  }

  return `
    <button id="${btnId}" type="button" aria-label="Filter Kalender" style="padding: 6px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834; position: relative;">
      <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
      ${isFiltered ? `
        <div style="position: absolute; top: 4px; right: 4px; width: 8px; height: 8px; background-color: #057A55; border-radius: 50%; box-shadow: 0 0 0 2px #FFFFFF;"></div>
      ` : ''}
    </button>
  `;
}

/**
 * Render Date Filter Status Banner HTML (Shown when viewing a custom/filtered date)
 */
export function renderDateFilterBannerHtml(param1, param2 = 'btn-reset-date-filter', param3 = 'btn-reset-date-filter') {
  let activeDate = todayDDMMYYYY();
  let isFiltered = false;
  let resetBtnId = 'btn-reset-date-filter';

  if (typeof param2 === 'boolean') {
    activeDate = param1 || todayDDMMYYYY();
    isFiltered = param2;
    resetBtnId = param3 || 'btn-reset-date-filter';
  } else {
    activeDate = param1 || todayDDMMYYYY();
    isFiltered = normalizeDateStr(activeDate) !== todayDDMMYYYY();
    resetBtnId = typeof param2 === 'string' ? param2 : 'btn-reset-date-filter';
  }

  if (!isFiltered) return '';

  return `
    <div class="date-filter-status-banner" style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 6px 10px; margin: 10px 0; display: flex; align-items: center; justify-content: space-between; gap: 6px; box-sizing: border-box; width: 100%;">
      <div style="display: flex; align-items: center; gap: 6px; min-width: 0; flex: 1;">
        <svg viewBox="0 0 24 24" width="15" height="15" stroke="#15803D" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <div style="display: flex; align-items: baseline; gap: 4px; line-height: 1.2; flex-wrap: wrap;">
          <span style="font-size: 0.72rem; color: #166534; font-weight: 500; white-space: nowrap;">Menampilkan Data:</span>
          <strong style="font-size: 0.76rem; font-weight: 800; color: #14532D; white-space: nowrap;">${esc(normalizeDateStr(activeDate))}</strong>
        </div>
      </div>
      <button id="${resetBtnId}" type="button" style="flex-shrink: 0; white-space: nowrap; background: #FFFFFF; border: 1px solid #86EFAC; color: #15803D; font-size: 0.70rem; font-weight: 700; padding: 3px 8px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); line-height: 1.2;">
        <svg viewBox="0 0 24 24" width="10" height="10" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
        <span>Hari Ini</span>
      </button>
    </div>
  `;
}

/**
 * Render Date Picker Modal HTML
 */
export function renderDatePickerModalHtml(options = {}) {
  let modalId = 'modal-date-picker-overlay';
  let inputId = 'input-filter-date';
  let activeDate = todayDDMMYYYY();
  let title = 'Pilih Tanggal Transaksi';

  if (typeof options === 'string') {
    activeDate = options;
  } else if (typeof options === 'object' && options !== null) {
    if (options.modalId) modalId = options.modalId;
    if (options.inputId) inputId = options.inputId;
    if (options.activeDate) activeDate = options.activeDate;
    if (options.title) title = options.title;
  }

  return `
    <div id="${modalId}" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box;">
      <div id="dialog-date-picker" style="background: #FFFFFF; border-radius: 12px; max-width: 340px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.2); overflow: hidden;">
        <!-- Modal Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 1px solid #E5E7EB; background: #F9FAFB;">
          <div style="font-weight: 700; font-size: 0.92rem; color: #111827; display: flex; align-items: center; gap: 6px;">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="#116834" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            ${esc(title)}
          </div>
          <button id="btn-close-${modalId}" type="button" aria-label="Tutup" style="background: transparent; border: none; color: #9CA3AF; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center;">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <!-- Modal Body -->
        <div style="padding: 16px;">
          <div style="margin-bottom: 12px;">
            <label for="${inputId}" style="display: block; font-size: 0.78rem; font-weight: 600; color: #374151; margin-bottom: 6px;">
              Tanggal Transaksi:
            </label>
            <input 
              type="date" 
              id="${inputId}" 
              value="${ddmmyyyyToIso(activeDate)}"
              style="width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.88rem; font-family: inherit; color: #111827; outline: none;"
            />
          </div>

          <!-- Quick Preset Buttons -->
          <div style="display: flex; gap: 8px; margin-bottom: 16px;">
            <button id="btn-quick-today" type="button" class="btn-preset-today" style="flex: 1; padding: 6px 8px; background: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 6px; font-size: 0.76rem; font-weight: 600; color: #374151; cursor: pointer;">
              Hari Ini
            </button>
            <button id="btn-quick-yesterday" type="button" class="btn-preset-yesterday" style="flex: 1; padding: 6px 8px; background: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 6px; font-size: 0.76rem; font-weight: 600; color: #374151; cursor: pointer;">
              Kemarin
            </button>
          </div>

          <!-- Modal Footer Action Buttons -->
          <div style="display: flex; gap: 8px;">
            <button id="btn-cancel-${modalId}" type="button" style="flex: 1; padding: 9px; background: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 8px; font-size: 0.82rem; font-weight: 600; color: #4B5563; cursor: pointer;">
              Batal
            </button>
            <button id="btn-apply-${modalId}" type="button" style="flex: 1; padding: 9px; background: #116834; border: none; border-radius: 8px; font-size: 0.82rem; font-weight: 600; color: #FFFFFF; cursor: pointer; box-shadow: 0 1px 3px rgba(17, 104, 52, 0.3);">
              Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Attach Event Handlers for Date Picker Modal
 */
export function attachDatePickerModalEvents(options = {}) {
  const root = options.container || options.app || document.getElementById('app');
  if (!root) return;

  const modalId = options.modalId || 'modal-date-picker-overlay';
  const inputId = options.inputId || 'input-filter-date';
  const resetBtnId = options.resetBtnId || 'btn-reset-date-filter';
  const emptyResetBtnId = options.emptyResetBtnId || 'btn-empty-reset-today';
  const btnCalendarId = options.btnCalendarId || 'btn-open-date-filter';

  const getActiveDate = () => options.currentDateStr || (typeof options.getActiveDate === 'function' ? options.getActiveDate() : todayDDMMYYYY());
  const onSelect = options.onDateSelect || options.onDateSelected || (() => {});
  const onReset = options.onDateReset || options.onResetToday || (() => {});

  const modalOverlay = root.querySelector(`#${modalId}`);
  const inputEl = root.querySelector(`#${inputId}`);

  const openModal = () => {
    if (modalOverlay) {
      if (inputEl) {
        inputEl.value = ddmmyyyyToIso(getActiveDate());
      }
      modalOverlay.style.display = 'flex';
    }
  };

  const closeModal = () => {
    if (modalOverlay) {
      modalOverlay.style.display = 'none';
    }
  };

  // Trigger buttons (both by ID and by generic query selector)
  const btnCalendar = root.querySelector(`#${btnCalendarId}`) || root.querySelector('#btn-open-date-filter') || root.querySelector('#btn-calendar') || root.querySelector('[aria-label="Filter Kalender"]');
  if (btnCalendar) {
    btnCalendar.addEventListener('click', openModal);
  }

  const btnClose = root.querySelector(`#btn-close-${modalId}`);
  if (btnClose) {
    btnClose.addEventListener('click', closeModal);
  }

  const btnCancel = root.querySelector(`#btn-cancel-${modalId}`);
  if (btnCancel) {
    btnCancel.addEventListener('click', closeModal);
  }

  // Quick Presets
  const btnPresetToday = root.querySelector('#btn-quick-today') || root.querySelector(`.btn-preset-today`) || root.querySelector(`#btn-preset-today-${modalId}`);
  if (btnPresetToday && inputEl) {
    btnPresetToday.addEventListener('click', () => {
      inputEl.value = todayISO();
    });
  }

  const btnPresetYesterday = root.querySelector('#btn-quick-yesterday') || root.querySelector(`.btn-preset-yesterday`) || root.querySelector(`#btn-preset-yesterday-${modalId}`);
  if (btnPresetYesterday && inputEl) {
    btnPresetYesterday.addEventListener('click', () => {
      inputEl.value = ddmmyyyyToIso(getYesterdayDDMMYYYY());
    });
  }

  // Apply Button
  const btnApply = root.querySelector(`#btn-apply-${modalId}`);
  if (btnApply && inputEl) {
    btnApply.addEventListener('click', () => {
      const val = inputEl.value;
      const formatted = val ? normalizeDateStr(val) : todayDDMMYYYY();
      closeModal();
      onSelect(formatted);
    });
  }

  // Reset Buttons
  const btnReset = root.querySelector(`#${resetBtnId}`) || root.querySelector('#btn-reset-date-filter');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      onReset();
    });
  }

  const btnEmptyReset = root.querySelector(`#${emptyResetBtnId}`);
  if (btnEmptyReset) {
    btnEmptyReset.addEventListener('click', () => {
      onReset();
    });
  }
}

