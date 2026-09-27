/**
 * db/repositories.js — repository layer (Data Access).
 * UI & modules TIDAK mengakses IndexedDB langsung; semua lewat repository di sini.
 * Workflow & permission dipakai oleh module, bukan oleh repository.
 */

import {
  putRecord,
  getRecord,
  getAllFromStore,
  deleteRecord,
  countStore
} from './indexeddb.js';
import { applyTransactionActor, AUDIT_EVENT_TYPES } from '../core/transaction-actor.js';

export const TRANSACTION_STORES = new Set([
  'attendance',
  'receptions',
  'seedings',
  'buddings',
  'inspections',
  'selections',
  'entresActivities',
  'nurseryActivities',
  'requests',
  'batches',
  'approvals',
  'syncQueue'
]);

/**
 * Membuat repository generik untuk sebuah store.
 * Semua method return Promise.
 */
export function createRepository(storeName) {
  return {
    storeName,

    async create(data, userContext = null) {
      const base = { ...data, id: data.id || `${storeName.toUpperCase()}:${Math.random().toString(36).slice(2, 8)}` };
      const record = TRANSACTION_STORES.has(storeName)
        ? applyTransactionActor(base, AUDIT_EVENT_TYPES.CREATE, userContext)
        : base;
      await putRecord(storeName, record);
      return record;
    },

    async update(id, patch, userContext = null, actionType = AUDIT_EVENT_TYPES.UPDATE, details = null) {
      const existing = await getRecord(storeName, id);
      if (!existing) throw new Error(`Record tidak ditemukan: ${id}`);
      const updatedData = { ...existing, ...patch, id };
      const auditDetail = details || patch?.auditDetails || patch?.details || null;
      const updated = TRANSACTION_STORES.has(storeName)
        ? applyTransactionActor(updatedData, actionType, userContext, auditDetail)
        : updatedData;
      await putRecord(storeName, updated);
      return updated;
    },

    async getById(id) {
      return getRecord(storeName, id);
    },

    async list() {
      return getAllFromStore(storeName);
    },

    async remove(id) {
      return deleteRecord(storeName, id);
    },

    async count() {
      return countStore(storeName);
    }
  };
}

/* ---- Repository spesifik per modul (SPEC §11 contoh method). ---- */

import { storage } from '../core/storage.js';
import { getAttendanceUniqueKey, todayISO } from '../core/utils.js';
import { getWorkerById, isWorkerActive, isWorkerInScope } from '../data/worker-master.js';
import { resolveUserContext } from '../core/user-context.js';

export const userRepository = createRepository('users');
export const roleRepository = createRepository('roles');
export const divisionRepository = createRepository('divisions');
export const estateRepository = createRepository('estates');
export const programReplantingRepository = createRepository('programReplanting');
export const programNurseryRepository = createRepository('programNursery');
export const cloneRepository = createRepository('clones');
export const workerRepository = createRepository('workers');
export const supplierRepository = createRepository('suppliers');
export const warehouseStockRepository = createRepository('warehouseStocks');
export const growthStageRepository = createRepository('growthStages');
export const bedRepository = createRepository('beds');
export const reasonRepository = createRepository('reasons');

export const attendanceRepository = {
  ...createRepository('attendance'),

  /**
   * Mengambil daftar pekerja yang telah hadir (presensi) pada tanggal tertentu
   * ter-deduplikasi berdasarkan workerId, ter-filter scope wilayah, dan tervalidasi master data.
   * 
   * @param {Object} [userContext=null] - Konteks user aktif (Estate & Divisi)
   * @param {string} [targetDate=null] - Tanggal target (default: todayISO())
   * @returns {Promise<Array<Object>>} Daftar pekerja eligible yang sudah presensi
   */
  async getPresentWorkers(userContext = null, targetDate = null) {
    const today = targetDate ? String(targetDate).trim().slice(0, 10) : todayISO();
    const ctx = userContext ? resolveUserContext(userContext) : null;

    let dbList = [];
    try {
      dbList = (await getAllFromStore('attendance')) || [];
    } catch (e) {
      console.warn('[attendanceRepository.getPresentWorkers] IndexedDB read error:', e);
      dbList = [];
    }

    let storageList = [];
    try {
      storageList = storage.get('attendance_transactions', []) || [];
    } catch (e) {
      console.warn('[attendanceRepository.getPresentWorkers] Storage read error:', e);
      storageList = [];
    }

    // 1. Deduplikasi record antara IndexedDB dan localStorage
    const unifiedMap = new Map();
    dbList.forEach((item) => {
      if (item) {
        const key = getAttendanceUniqueKey(item) || item.id;
        unifiedMap.set(key, item);
      }
    });
    storageList.forEach((item) => {
      if (item) {
        const key = getAttendanceUniqueKey(item) || item.id;
        if (!unifiedMap.has(key)) {
          unifiedMap.set(key, item);
        }
      }
    });

    const allAttendances = Array.from(unifiedMap.values());

    // 2. Filter & Deduplikasi Worker ID
    const presentWorkerIds = new Set();

    allAttendances.forEach((rec) => {
      if (!rec || typeof rec !== 'object') return;

      // Filter: Type harus 'WORKER'
      const isWorker = String(rec.type || '').toUpperCase() === 'WORKER';
      if (!isWorker) return;

      // Filter: Status harus 'HADIR' (tidak menerima Cuti/Izin/Alfa/kosong)
      const isHadir = String(rec.status || '').toUpperCase() === 'HADIR';
      if (!isHadir) return;

      // Filter: Tanggal harus sesuai targetDate
      const recDate = String(rec.date || rec.tanggal || (rec.createdAt ? String(rec.createdAt).slice(0, 10) : '')).trim().slice(0, 10);
      if (recDate !== today) return;

      // Filter: Scope Wilayah (Estate & Divisi)
      if (ctx) {
        if (ctx.estateId && rec.estateId && String(ctx.estateId).trim() !== String(rec.estateId).trim()) {
          return;
        }
        if (ctx.scopeType === 'DIVISION' && ctx.divisionId && rec.divisionId && String(ctx.divisionId).trim() !== String(rec.divisionId).trim()) {
          return;
        }
      }

      // Validasi workerId
      const wId = String(rec.workerId || '').trim();
      if (wId) {
        presentWorkerIds.add(wId);
      }
    });

    // 3. Resolve ke Objek WORKER_MASTER kanonikal dan validasi status aktif
    const eligibleWorkers = [];
    for (const wId of presentWorkerIds) {
      const canonical = getWorkerById(wId);
      if (!canonical) continue;
      if (!isWorkerActive(canonical.id)) continue;
      if (ctx && ctx.estateId && !isWorkerInScope(canonical.id, ctx.estateId, ctx.divisionId)) {
        continue;
      }
      eligibleWorkers.push({
        ...canonical,
        position: canonical.position || 'Pekerja Bibitan'
      });
    }

    return eligibleWorkers;
  }
};

export const receptionRepository = createRepository('receptions');
export const seedingRepository = createRepository('seedings');
export const buddingRepository = createRepository('buddings');
export const inspectionRepository = createRepository('inspections');
export const selectionRepository = createRepository('selections');
export const entresRepository = createRepository('entresActivities');
export const nurseryActivityRepository = createRepository('nurseryActivities');
export const requestRepository = createRepository('requests');
export const batchRepository = createRepository('batches');
export const approvalRepository = createRepository('approvals');
export const syncQueueRepository = createRepository('syncQueue');
export const auditLogRepository = createRepository('auditLogs');
export const photoRepository = createRepository('photos');
