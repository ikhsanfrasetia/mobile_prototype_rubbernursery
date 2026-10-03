/**
 * js/core/attendance-gate-service.js
 * Global Presensi Gate Service untuk Seluruh Transaksi Modul Pembibitan (SIGMA / HARVEST - NURSERY)
 * 
 * Business Rules:
 * 1. Role MANTRI_TANAMAN wajib menyelesaikan:
 *    - Presensi Supervisor DATANG hari ini = HADIR
 *    - Minimal 1 Presensi Pekerja DATANG hari ini = HADIR
 * 2. Jika salah satu belum terpenuhi: transaksi baru DIBLOKIR.
 * 3. Jika keduanya terpenuhi: transaksi baru DIIZINKAN.
 * 4. Role lain (ASISTEN, ASISTEN_BIBITAN, ASKEP, PENGURUS, dll.) tidak terkena gate ini.
 * 5. View/Read-only landing tetap dibuka, creation/execution diblokir jika gate LOCKED.
 * 6. Bekerja secara Offline-First deterministik dari storage lokal / IndexedDB.
 */

import { session } from './session.js';
import { storage } from './storage.js';
import { ROLES } from './permissions.js';
import { todayISO, esc } from './utils.js';
import { getCurrentUserContext } from './user-context.js';
import { navigate } from './router.js';
import { toast } from '../components/toast.js';

export const ATTENDANCE_BLOCK_REASONS = Object.freeze({
  BOTH_NOT_DONE: 'BOTH_NOT_DONE',
  SUPERVISOR_NOT_DONE: 'SUPERVISOR_NOT_DONE',
  WORKER_NOT_DONE: 'WORKER_NOT_DONE',
  DATE_MISMATCH: 'DATE_MISMATCH'
});

export const ATTENDANCE_GATE_MESSAGES = Object.freeze({
  [ATTENDANCE_BLOCK_REASONS.BOTH_NOT_DONE]: 'Presensi Supervisor & Pekerja belum dilakukan. Silakan selesaikan Presensi Supervisor terlebih dahulu.',
  [ATTENDANCE_BLOCK_REASONS.SUPERVISOR_NOT_DONE]: 'Presensi Supervisor Datang wajib diselesaikan sebelum dapat membuat transaksi.',
  [ATTENDANCE_BLOCK_REASONS.WORKER_NOT_DONE]: 'Presensi Pekerja Bibitan belum dilakukan. Silakan catat presensi pekerja sebelum memulai transaksi.',
  [ATTENDANCE_BLOCK_REASONS.DATE_MISMATCH]: 'Presensi hari ini belum tercatat. Silakan lakukan presensi harian terlebih dahulu.'
});

/**
 * Mengevaluasi status Global Attendance Gate untuk user aktif dan tanggal spesifik.
 * 
 * @param {Object} [userContext] - User context opsional (default: getCurrentUserContext() / session.get())
 * @param {string} [targetDate] - Tanggal target format YYYY-MM-DD (default: todayISO())
 * @returns {Object} Canonical status object
 */
export function getGlobalAttendanceGateStatus(userContext = null, targetDate = null) {
  const activeUser = userContext || getCurrentUserContext() || session.get() || {};
  const role = activeUser.role || session.getRole();
  const dateStr = (typeof targetDate === 'string' && targetDate.trim().length >= 10) 
    ? targetDate.trim().slice(0, 10) 
    : todayISO();

  // Role selain MANTRI_TANAMAN tidak terkena Global Attendance Gate
  if (role && role !== ROLES.MANTRI_TANAMAN) {
    return {
      date: dateStr,
      role,
      isSupervisorDone: true,
      isWorkerDone: true,
      isGateUnlocked: true,
      supervisorRecord: null,
      workerCount: 0,
      activeSession: 'DATANG',
      blockReason: null,
      errorMessage: null,
      isExempt: true
    };
  }

  // Ambil record presensi dari local storage
  const attendances = storage.get('attendance_transactions', []) || [];

  // Filter presensi untuk tanggal target (dan context jika relevan)
  const todayAttendances = attendances.filter((a) => {
    if (!a) return false;
    const aDate = a.date || a.tanggal || (a.createdAt ? String(a.createdAt).slice(0, 10) : '');
    const isMatchingDate = aDate === dateStr;
    if (!isMatchingDate) return false;

    // Filter status kehadiran (wajib HADIR atau tidak dibatalkan)
    if (a.status === 'ABSENT' || a.status === 'TIDAK_HADIR' || a.status === 'CANCELLED') {
      return false;
    }

    // Optional context filtering if defined in record
    if (activeUser?.estateId && a.estateId && a.estateId !== activeUser.estateId) return false;
    if (activeUser?.divisionId && a.divisionId && a.divisionId !== activeUser.divisionId) return false;

    return true;
  });

  // 1. Presensi Supervisor Datang
  const supervisorRecord = todayAttendances.find((a) => {
    const isSup = a.type === 'SUPERVISOR' || a.role === ROLES.MANTRI_TANAMAN || a.role === 'MANTRI_TANAMAN';
    const isDatang = (a.attendanceType || 'DATANG') === 'DATANG';
    return isSup && isDatang;
  }) || null;
  const isSupervisorDone = Boolean(supervisorRecord);

  // 2. Presensi Pekerja Datang (Minimal 1 Pekerja HADIR)
  const workerDatangRecords = todayAttendances.filter((a) => {
    const isWrk = a.type === 'WORKER' || a.position === 'Pekerja Bibitan' || (!a.type && a.workerId);
    const isDatang = (a.attendanceType || 'DATANG') === 'DATANG';
    return isWrk && isDatang;
  });
  const uniqueWorkerKeys = new Set();
  workerDatangRecords.forEach((w) => {
    const key = String(w.workerId || w.workerCode || w.code || w.name || w.id || '').trim();
    if (key) uniqueWorkerKeys.add(key);
  });
  const workerCount = uniqueWorkerKeys.size;
  const isWorkerDone = workerCount >= 1;

  // 3. Gate Status & Block Reason
  const isGateUnlocked = isSupervisorDone && isWorkerDone;
  let blockReason = null;
  let errorMessage = null;

  if (!isGateUnlocked) {
    if (!isSupervisorDone && !isWorkerDone) {
      blockReason = ATTENDANCE_BLOCK_REASONS.BOTH_NOT_DONE;
    } else if (!isSupervisorDone) {
      blockReason = ATTENDANCE_BLOCK_REASONS.SUPERVISOR_NOT_DONE;
    } else if (!isWorkerDone) {
      blockReason = ATTENDANCE_BLOCK_REASONS.WORKER_NOT_DONE;
    }
    errorMessage = ATTENDANCE_GATE_MESSAGES[blockReason] || 'Presensi harian belum lengkap.';
  }

  return {
    date: dateStr,
    role: role || ROLES.MANTRI_TANAMAN,
    isSupervisorDone,
    isWorkerDone,
    isGateUnlocked,
    supervisorRecord,
    workerCount,
    activeSession: 'DATANG',
    blockReason,
    errorMessage,
    isExempt: false
  };
}

/**
 * Memastikan gate presensi terbuka; jika terkunci untuk Mantri Tanaman, lemparkan error terkontrol.
 * 
 * @param {Object} [userContext] - User context
 * @param {string} [targetDate] - Tanggal target
 * @throws {Error} Jika transaksi diblokir oleh gate
 */
export function assertAttendanceGateOrThrow(userContext = null, targetDate = null) {
  const status = getGlobalAttendanceGateStatus(userContext, targetDate);
  if (!status.isGateUnlocked) {
    const err = new Error(status.errorMessage || 'Transaksi diblokir: Presensi harian belum selesai.');
    err.code = 'ERR_ATTENDANCE_GATE_LOCKED';
    err.blockReason = status.blockReason;
    err.gateStatus = status;
    throw err;
  }
  return true;
}

/**
 * Menampilkan Modal Dialog "Presensi Harian Diperlukan" yang terstandarisasi di UI.
 * 
 * @param {Object} [options]
 * @param {string} [options.targetModuleName] - Nama modul yang dicoba diakses
 * @param {Function} [options.onCancel] - Callback saat memilih 'Nanti'
 */
import { openModal, closeModal } from '../components/modal.js';

export function showAttendanceRequirementModal(options = {}) {
  const gate = options.gateStatus || getGlobalAttendanceGateStatus();
  if (gate.isGateUnlocked) return;

  const targetModule = options.targetModuleName || 'Transaksi';
  const message = gate.errorMessage || 'Presensi harian belum lengkap.';

  const supStatusBadge = gate.isSupervisorDone
    ? `<span class="att-badge att-badge--success">Selesai ✓</span>`
    : `<span class="att-badge att-badge--error">Belum ✗</span>`;

  const wrkStatusBadge = gate.isWorkerDone
    ? `<span class="att-badge att-badge--success">Selesai (${gate.workerCount} Hadir) ✓</span>`
    : `<span class="att-badge att-badge--error">Belum ✗</span>`;

  const modalBodyHtml = `
    <div class="att-content">
      <div class="att-warning">
        <span class="att-warning__icon">⚠️</span>
        <div class="att-warning__body">
          <div class="att-warning__title">Prasyarat Transaksi Belum Lengkap</div>
          <div class="att-warning__msg">${esc(message)}</div>
        </div>
      </div>

      <div class="att-status-card">
        <div class="att-status-card__header">
          <span>STATUS PRESENSI HARI INI</span>
          <span class="att-status-card__date">${esc(gate.date || '')}</span>
        </div>
        <div class="att-status-row att-status-row--border">
          <span class="att-status-row__label">Presensi Supervisor</span>
          ${supStatusBadge}
        </div>
        <div class="att-status-row">
          <span class="att-status-row__label">Presensi Pekerja</span>
          ${wrkStatusBadge}
        </div>
      </div>
    </div>

    <style>
      /* ---- Scoped: Attendance Modal ---- */
      .attendance-modal .modal-foot {
        flex-direction: column;
        gap: 8px;
      }
      .attendance-modal .modal-foot .btn {
        flex: none;
        width: 100%;
      }
      .att-content {
        font-size: 0.85rem;
        color: var(--text, #111);
        line-height: 1.45;
      }
      .att-warning {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 12px;
        background: var(--warning-light, #fef4e8);
        border: 1px solid var(--border, #d9d9d9);
        border-radius: var(--radius, 6px);
        margin-bottom: 14px;
      }
      .att-warning__icon {
        font-size: 1rem;
        line-height: 1;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .att-warning__body {
        font-size: 0.8rem;
        color: var(--warning, #b54708);
        line-height: 1.45;
      }
      .att-warning__title {
        font-weight: 700;
        font-size: 0.82rem;
        margin-bottom: 2px;
      }
      .att-warning__msg {
        font-weight: 400;
      }
      .att-status-card {
        background: var(--surface-alt, #f7f7f7);
        border: 1px solid var(--border, #d9d9d9);
        border-radius: var(--radius, 6px);
        padding: 10px 12px;
      }
      .att-status-card__header {
        font-size: 0.7rem;
        font-weight: 700;
        color: var(--muted, #999);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .att-status-card__date {
        font-weight: 600;
        text-transform: none;
        font-size: 0.72rem;
      }
      .att-status-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 7px 0;
        font-size: 0.82rem;
      }
      .att-status-row--border {
        border-bottom: 1px solid var(--border, #d9d9d9);
      }
      .att-status-row__label {
        color: var(--text, #111);
        font-weight: 500;
      }
      .att-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 0.72rem;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: var(--radius-sm, 6px);
      }
      .att-badge--success {
        background: var(--success-light, #e8f3ec);
        color: var(--primary-700, #0a4522);
      }
      .att-badge--error {
        background: var(--danger-light, #fdecea);
        color: var(--danger, #e53935);
      }
    </style>
  `;

  const modalFooterHtml = `
    <button class="btn btn-ghost" id="btn-modal-att-cancel" type="button"
      style="border: 1px solid var(--border-strong, #c4c4c4); color: var(--text-secondary, #999); background: var(--white, #fff);">
      Kembali
    </button>
    <button class="btn btn-primary" id="btn-modal-att-now" type="button">
      Lanjut Presensi
    </button>
  `;

  openModal({
    title: 'Presensi Harian Diperlukan',
    body: modalBodyHtml,
    footer: modalFooterHtml,
    onClose: () => {
      if (typeof options.onCancel === 'function') {
        options.onCancel();
      }
    }
  });

  // Add scoped class to the .modal element for CSS isolation
  const modalRoot = document.getElementById('modal-root');
  const modalEl = modalRoot?.querySelector('.modal');
  if (modalEl) {
    modalEl.classList.add('attendance-modal');
  }

  modalRoot?.querySelector('#btn-modal-att-now')?.addEventListener('click', () => {
    closeModal();
    navigate('/attendance');
  });

  modalRoot?.querySelector('#btn-modal-att-cancel')?.addEventListener('click', () => {
    closeModal();
    if (typeof options.onCancel === 'function') {
      options.onCancel();
    }
  });
}
