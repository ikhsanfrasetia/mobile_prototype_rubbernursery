/**
 * core/workflow.js — workflow engine.
 * Status standar: DRAFT → READY → SUBMITTED → UNDER_REVIEW → (CORRECTED) → APPROVED
 * Tidak semua modul memakai semua status; minimal DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED.
 */

export const STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  READY: 'READY',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  CORRECTED: 'CORRECTED',
  APPROVED: 'APPROVED'
});

export const STATUS_ORDER = Object.freeze([
  STATUS.DRAFT,
  STATUS.READY,
  STATUS.SUBMITTED,
  STATUS.UNDER_REVIEW,
  STATUS.CORRECTED,
  STATUS.APPROVED
]);

/**
 * Workflow definition per module.
 * state: status yang diizinkan sebagai state penyimpanan.
 * transitions: daftar aksi {from, to}.
 */
const WORKFLOWS = {
  default: {
    state: [STATUS.DRAFT, STATUS.SUBMITTED, STATUS.UNDER_REVIEW, STATUS.CORRECTED, STATUS.APPROVED],
    transitions: [
      { action: 'submit', from: [STATUS.DRAFT, STATUS.READY], to: STATUS.SUBMITTED },
      { action: 'start-review', from: [STATUS.SUBMITTED], to: STATUS.UNDER_REVIEW },
      { action: 'correct', from: [STATUS.UNDER_REVIEW], to: STATUS.CORRECTED },
      { action: 'approve', from: [STATUS.UNDER_REVIEW, STATUS.CORRECTED], to: STATUS.APPROVED }
    ]
  }
};

export const workflow = {
  register(moduleKey, definition) {
    WORKFLOWS[moduleKey] = definition;
  },

  getDefinition(moduleKey) {
    return WORKFLOWS[moduleKey] || WORKFLOWS.default;
  },

  isStateAllowed(moduleKey, status) {
    const def = this.getDefinition(moduleKey);
    return def.state.includes(status);
  },

  /** Validasi transisi; return {ok, to} atau throw. */
  transition(moduleKey, fromStatus, action) {
    const def = this.getDefinition(moduleKey);
    const t = def.transitions.find(
      (tr) => tr.action === action && tr.from.includes(fromStatus)
    );
    if (!t) {
      throw new Error(
        `Transisi tidak valid: ${fromStatus} --(${action})--> ? (module: ${moduleKey})`
      );
    }
    return { ok: true, to: t.to };
  },

  next(moduleKey, fromStatus, action) {
    return this.transition(moduleKey, fromStatus, action).to;
  }
};

export function canEdit(moduleKey, status) {
  return [STATUS.DRAFT, STATUS.READY].includes(status);
}

export function canDelete(moduleKey, status) {
  return [STATUS.DRAFT, STATUS.READY].includes(status);
}
