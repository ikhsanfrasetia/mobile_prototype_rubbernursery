/**
 * components/status.js — status badge (prototype).
 */

import { statusLabel, badgeClass, esc } from '../core/utils.js';

export function statusBadge(status) {
  return `<span class="badge ${badgeClass(status)}">${esc(statusLabel(status))}</span>`;
}
