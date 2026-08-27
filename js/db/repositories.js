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

/**
 * Membuat repository generik untuk sebuah store.
 * Semua method return Promise.
 */
export function createRepository(storeName) {
  return {
    storeName,

    async create(data) {
      const record = { ...data, id: data.id || `${storeName.toUpperCase()}:${Math.random().toString(36).slice(2, 8)}` };
      await putRecord(storeName, record);
      return record;
    },

    async update(id, patch) {
      const existing = await getRecord(storeName, id);
      if (!existing) throw new Error(`Record tidak ditemukan: ${id}`);
      const updated = { ...existing, ...patch, id };
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

export const attendanceRepository = createRepository('attendance');
export const receptionRepository = createRepository('receptions');
export const seedingRepository = createRepository('seedings');
export const buddingRepository = createRepository('buddings');
export const inspectionRepository = createRepository('inspections');
export const selectionRepository = createRepository('selections');
export const batchRepository = createRepository('batches');
export const approvalRepository = createRepository('approvals');
export const syncQueueRepository = createRepository('syncQueue');
export const auditLogRepository = createRepository('auditLogs');
export const photoRepository = createRepository('photos');
