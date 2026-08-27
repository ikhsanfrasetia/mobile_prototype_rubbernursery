/**
 * core/session.js — session prototype & role switcher (demo-only).
 * Session fields: userId, role, name, divisionId, divisionName, loginAt, isAuthenticated
 */

import { storage, KEYS } from './storage.js';

export const session = {
  get() {
    return storage.get(KEYS.SESSION, null);
  },

  isAuthenticated() {
    const s = this.get();
    return !!s && s.isAuthenticated === true;
  },

  getRole() {
    const s = this.get();
    return s ? s.role : null;
  },

  getUserId() {
    const s = this.get();
    return s ? s.userId : null;
  },

  start({ userId, code, role, name, position, divisionId, divisionName, isDemoSession = false }) {
    const s = {
      userId,
      code: code || userId,
      role,
      name,
      position: position || (role === 'MANTRI_TANAMAN' ? 'Mantri Bibitan' : role),
      divisionId: divisionId || null,
      divisionName: divisionName || null,
      isDemoSession: isDemoSession === true,
      loginAt: new Date().toISOString(),
      isAuthenticated: true
    };
    storage.set(KEYS.SESSION, s);
    return s;
  },

  /** Role switcher — mode demo/prototype. Mengganti role tanpa logout. */
  switchRole({ userId, code, role, name, position, divisionId, divisionName }) {
    const current = this.get();
    const base = current && current.loginAt ? { loginAt: current.loginAt } : {};
    const s = {
      userId,
      code: code || (current ? current.code : userId),
      role,
      name,
      position: position || (role === 'MANTRI_TANAMAN' ? 'Mantri Bibitan' : role),
      divisionId: divisionId || null,
      divisionName: divisionName || null,
      ...base,
      switchedAt: new Date().toISOString(),
      isAuthenticated: true
    };
    storage.set(KEYS.SESSION, s);
    return s;
  },

  clear() {
    storage.remove(KEYS.SESSION);
  }
};
