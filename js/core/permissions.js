/**
 * core/permissions.js — permission layer.
 * Role: MANTRI_TANAMAN, ASISTEN, ASKEP, PENGURUS.
 * Semua route/menu divalidasi lewat layer ini.
 */

import { session } from './session.js';

export const ROLES = Object.freeze({
  MANTRI_TANAMAN: 'MANTRI_TANAMAN',
  ASISTEN: 'ASISTEN',
  ASKEP: 'ASKEP',
  PENGURUS: 'PENGURUS'
});

export const ROLE_LABELS = Object.freeze({
  MANTRI_TANAMAN: 'Mantri Tanaman',
  ASISTEN: 'Asisten',
  ASKEP: 'Askep',
  PENGURUS: 'Pengurus'
});

/**
 * Capability — tindakan yang diperbolehkan per role (sesuai SPEC §8).
 * Jangan menambah kewenangan yang belum disepakati.
 */
const CAPABILITIES = {
  [ROLES.MANTRI_TANAMAN]: [
    'transaction:create',
    'transaction:edit-before-submit',
    'transaction:delete-before-submit',
    'transaction:review-own',
    'transaction:submit'
  ],
  [ROLES.ASISTEN]: [
    'transaction:view-submitted',
    'transaction:open-detail',
    'transaction:correct-allowed-fields',
    'transaction:approve',
    'monitor:process'
  ],
  [ROLES.ASKEP]: ['transaction:view', 'monitor:process', 'approval:future'],
  [ROLES.PENGURUS]: ['transaction:view', 'monitor:process', 'approval:future']
};

/** Route → kapabilitas minimum yang dibutuhkan. */
const ROUTE_PERMISSIONS = {
  '/home': 'home:access'
};

export const permissions = {
  hasCapability(role, capability) {
    return (CAPABILITIES[role] || []).includes(capability);
  },

  can(role, capability) {
    return this.hasCapability(role || session.getRole(), capability);
  },

  /** CanMantri: role aktif adalah Mantri Tanaman */
  isMantri(role) {
    return (role || session.getRole()) === ROLES.MANTRI_TANAMAN;
  },

  isAsisten(role) {
    return (role || session.getRole()) === ROLES.ASISTEN;
  },

  isViewer(role) {
    const r = role || session.getRole();
    return [ROLES.ASKEP, ROLES.PENGURUS].includes(r);
  },

  canAccessHome(role) {
    const r = role || session.getRole();
    return Object.values(ROLES).includes(r);
  },

  /** Validasi akses route. Return true jika boleh. */
  canAccessRoute(route) {
    const r = session.getRole();
    if (!r) return false;
    if (route.startsWith('/home')) return this.canAccessHome(r);
    if (route.startsWith('/splash')) return true; // Splash setelah login: semua role
    if (route.startsWith('/sync')) return true; // Sinkronisasi: semua role
    if (route.startsWith('/attendance')) return this.can(r, 'transaction:create') || this.can(r, 'transaction:view') || this.can(r, 'transaction:view-submitted');
    if (route.startsWith('/reception')) {
      if (route.includes('/review')) {
        return this.can(r, 'transaction:view-submitted') || this.can(r, 'transaction:create');
      }
      if (route.includes('/detail')) {
        return this.can(r, 'transaction:view-submitted') || this.can(r, 'transaction:view');
      }
      return this.can(r, 'transaction:create') || this.can(r, 'transaction:view-submitted') || this.can(r, 'transaction:view');
    }
    // Modul transaksi fase berikutnya: akses dibatasi sesuai kapabilitas
    return this.can(r, 'transaction:create') || this.can(r, 'transaction:view');
  }
};

/**
 * Route → menu (untuk drawer & beranda). Menu dikelompokkan per fase;
 * transaksi (Phase 5+) menampilkan placeholder "segera hadir".
 */
export function getMenusForRole(role) {
  const r = role || session.getRole();
  const isMantri = r === ROLES.MANTRI_TANAMAN;

  const transactionMenus = isMantri
    ? [
        { route: '/reception', icon: '📦', name: 'Penerimaan', desc: 'Penerimaan bibit' },
        { route: '/seeding', icon: '🌱', name: 'Penyemaian', desc: 'Penyemaian bibit' },
        { route: '/budding', icon: '🌿', name: 'Okulasi', desc: 'Okulasi bibit' },
        { route: '/inspection', icon: '🔍', name: 'Pemeriksaan', desc: 'Pemeriksaan bibit' },
        { route: '/selection', icon: '✅', name: 'Penyeleksian Bibit', desc: 'Seleksi bibit' },
        { route: '/entres', icon: '🌳', name: 'Kebun Entres', desc: 'Kegiatan entres' },
        { route: '/nursery-activity', icon: '🛠️', name: 'Kegiatan Bibitan', desc: 'Kegiatan bibit' },
        { route: '/request', icon: '📋', name: 'Permintaan', desc: 'Permintaan bibit' }
      ]
    : [
        { route: '/reception', icon: '📦', name: 'Penerimaan', desc: 'Monitoring' },
        { route: '/seeding', icon: '🌱', name: 'Penyemaian', desc: 'Monitoring' },
        { route: '/budding', icon: '🌿', name: 'Okulasi', desc: 'Monitoring' },
        { route: '/inspection', icon: '🔍', name: 'Pemeriksaan', desc: 'Monitoring' },
        { route: '/selection', icon: '✅', name: 'Penyeleksian Bibit', desc: 'Monitoring' },
        { route: '/entres', icon: '🌳', name: 'Kebun Entres', desc: 'Monitoring' },
        { route: '/nursery-activity', icon: '🛠️', name: 'Kegiatan Bibitan', desc: 'Monitoring' },
        { route: '/request', icon: '📋', name: 'Permintaan', desc: 'Monitoring' }
      ];

  return {
    attendance: isMantri
      ? [
          { route: '/attendance/supervisor', icon: '👷', name: 'Presensi Supervisor', desc: 'Presensi mandiri' },
          { route: '/attendance/workers', icon: '🧑‍🌾', name: 'Presensi Pekerja', desc: 'Presensi pekerja' },
          { route: '/attendance/summary', icon: '📊', name: 'Ringkasan Presensi', desc: 'Ringkasan hari ini' }
        ]
      : [{ route: '/attendance/summary', icon: '📊', name: 'Ringkasan Presensi', desc: 'Monitoring' }],
    transactions: transactionMenus
  };
}
