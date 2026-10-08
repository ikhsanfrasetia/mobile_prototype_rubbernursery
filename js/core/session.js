/**
 * core/session.js — session prototype & role switcher (demo-only).
 * Session fields: userId, role, name, divisionId, divisionName, loginAt, isAuthenticated
 */

import { storage, KEYS } from './storage.js';
import { ROLE_LABELS } from './permissions.js';
import { resolveUserContext } from './user-context.js';
import { getDemoPersonaByCode, getDemoPersonas } from '../data/demo-personas.js';

export const session = {
  get() {
    return storage.get(KEYS.SESSION, null);
  },

  getUser() {
    return this.get();
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

  start(payload = {}) {
    const { id, userId, code, role, name } = payload || {};
    const lookupCode = code || userId || id;
    let registered = lookupCode ? getDemoPersonaByCode(lookupCode) : null;
    if (!registered && name) {
      registered = getDemoPersonas().find((p) => p.name === name) || null;
    }

    // Master persona fallback: Wagiman (TBS-MNT-001 / MNT001)
    const defaultPersona = getDemoPersonaByCode('MNT001') || {
      id: 'TBS-MNT-001',
      code: 'MNT001',
      role: 'MANTRI_TANAMAN',
      name: 'Wagiman',
      position: 'Mantri Bibitan',
      estateId: 'EST-TBS',
      estateName: 'Tanah Besih',
      divisionId: 'DIV-001',
      divisionName: 'Tanah Besih - Divisi I',
      scopeType: 'DIVISION'
    };

    const target = registered || defaultPersona;
    const sessionRole = (target.code === 'PGS002' && (role === 'PENGURUS_KEBUN_SEPUPU' || target.role === 'PENGURUS_KEBUN_SEPUPU'))
      ? 'PENGURUS_KEBUN_SEPUPU'
      : target.role;

    const s = {
      id: target.id,
      userId: target.code,
      code: target.code,
      loginCode: target.code,
      role: sessionRole,
      name: target.name,
      position: target.position || (ROLE_LABELS[sessionRole] || sessionRole),
      estateId: target.estateId,
      estateName: target.estateName,
      divisionId: target.divisionId,
      divisionName: target.divisionName,
      scopeType: target.scopeType,
      isDemoSession: true,
      loginAt: new Date().toISOString(),
      isAuthenticated: true
    };
    storage.set(KEYS.SESSION, s);
    return s;
  },

  /** Role switcher — mode demo/prototype. Mengganti role tanpa logout. */
  switchRole(payload = {}) {
    const current = this.get();
    const base = current && current.loginAt ? { loginAt: current.loginAt } : {};
    const { id, userId, code, role, name } = payload || {};
    const lookupCode = code || userId || id;
    let registered = lookupCode ? getDemoPersonaByCode(lookupCode) : null;
    if (!registered && name) {
      registered = getDemoPersonas().find((p) => p.name === name) || null;
    }

    const defaultPersona = getDemoPersonaByCode('MNT001') || {
      id: 'TBS-MNT-001',
      code: 'MNT001',
      role: 'MANTRI_TANAMAN',
      name: 'Wagiman',
      position: 'Mantri Bibitan',
      estateId: 'EST-TBS',
      estateName: 'Tanah Besih',
      divisionId: 'DIV-001',
      divisionName: 'Tanah Besih - Divisi I',
      scopeType: 'DIVISION'
    };

    const target = registered || (current ? (getDemoPersonaByCode(current.code) || defaultPersona) : defaultPersona);
    const sessionRole = (target.code === 'PGS002' && (role === 'PENGURUS_KEBUN_SEPUPU' || target.role === 'PENGURUS_KEBUN_SEPUPU'))
      ? 'PENGURUS_KEBUN_SEPUPU'
      : target.role;

    const s = {
      id: target.id,
      userId: target.code,
      code: target.code,
      loginCode: target.code,
      role: sessionRole,
      name: target.name,
      position: target.position || (ROLE_LABELS[sessionRole] || sessionRole),
      estateId: target.estateId,
      estateName: target.estateName,
      divisionId: target.divisionId,
      divisionName: target.divisionName,
      scopeType: target.scopeType,
      isDemoSession: true,
      ...base,
      switchedAt: new Date().toISOString(),
      isAuthenticated: true
    };
    storage.set(KEYS.SESSION, s);
    return s;
  },

  getUserContext() {
    return resolveUserContext(this.get());
  },

  clear() {
    try {
      localStorage.removeItem('sigma_simulation_clock_mantri');
    } catch (_) {}
    storage.remove(KEYS.SESSION);
  }
};

export { resolveUserContext, getCurrentUserContext } from './user-context.js';
