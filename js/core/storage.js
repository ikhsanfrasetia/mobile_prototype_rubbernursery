/**
 * core/storage.js — localStorage wrapper untuk session & config kecil.
 * IndexedDB = data utama; localStorage hanya session/config.
 */

const PREFIX = 'sigma:';

export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },
  has(key) {
    return localStorage.getItem(PREFIX + key) !== null;
  }
};

export const KEYS = {
  SESSION: 'session',
  CONFIG: 'config'
};
