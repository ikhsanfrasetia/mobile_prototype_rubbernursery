/**
 * core/session.js — session prototype & role switcher (demo-only).
 * Session fields: userId, role, name, divisionId, divisionName, loginAt, isAuthenticated
 */

import { storage, KEYS } from './storage.js';
import { ROLE_LABELS } from './permissions.js';
import { resolveUserContext } from './user-context.js';

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

  start({ id, userId, code, role, name, position, estateId, estateName, divisionId, divisionName, scopeType, isDemoSession = false }) {
    const finalUserId = userId || id || code || 'USR-001';
    const s = {
      id: finalUserId,
      userId: finalUserId,
      code: code || finalUserId,
      role,
      name,
      position: position || (ROLE_LABELS[role] || role),
      estateId: estateId || (divisionId && divisionId.includes('APM') ? 'EST-APM' : 'EST-TBS'),
      estateName: estateName || (divisionId && divisionId.includes('APM') ? 'Aek Pamingke' : 'Tanah Besih'),
      divisionId: divisionId || 'DIV-001',
      divisionName: divisionName || 'Tanah Besih - Divisi I',
      scopeType: scopeType || (['PENGURUS', 'ASKEP', 'TEKNIKER_I', 'KTU', 'PENGURUS_KEBUN_SEPUPU'].includes(role) ? 'ESTATE' : 'DIVISION'),
      isDemoSession: isDemoSession === true,
      loginAt: new Date().toISOString(),
      isAuthenticated: true
    };
    storage.set(KEYS.SESSION, s);
    return s;
  },

  /** Role switcher — mode demo/prototype. Mengganti role tanpa logout. */
  switchRole({ id, userId, code, role, name, position, estateId, estateName, divisionId, divisionName, scopeType }) {
    const current = this.get();
    const base = current && current.loginAt ? { loginAt: current.loginAt } : {};
    const finalUserId = userId || id || (current ? current.userId : null) || code || 'USR-001';
    const s = {
      id: finalUserId,
      userId: finalUserId,
      code: code || (current ? current.code : finalUserId),
      role,
      name,
      position: position || (ROLE_LABELS[role] || role),
      estateId: estateId || (current ? current.estateId : (divisionId && divisionId.includes('APM') ? 'EST-APM' : 'EST-TBS')),
      estateName: estateName || (current ? current.estateName : (divisionId && divisionId.includes('APM') ? 'Aek Pamingke' : 'Tanah Besih')),
      divisionId: divisionId || 'DIV-001',
      divisionName: divisionName || 'Tanah Besih - Divisi I',
      scopeType: scopeType || (current ? current.scopeType : (['PENGURUS', 'ASKEP', 'TEKNIKER_I', 'KTU', 'PENGURUS_KEBUN_SEPUPU'].includes(role) ? 'ESTATE' : 'DIVISION')),
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
    storage.remove(KEYS.SESSION);
  }
};

export { resolveUserContext, getCurrentUserContext } from './user-context.js';
