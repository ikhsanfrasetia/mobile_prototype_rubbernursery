/**
 * db/seed.js — seed IndexedDB dengan data dummy.
 */

import {
  getAllFromStore,
  putMany,
  getMeta,
  setMeta,
  clearStore
} from './indexeddb.js';
import { buildSeedData } from '../data/demo-data.js';

export const SEED_VERSION = 4;

export async function needsSeeding() {
  const v = await getMeta('seedVersion');
  return !v || v < SEED_VERSION;
}

/** Seed semua store master jika belum dilakukan. */
export async function seedDatabase({ force = false } = {}) {
  const shouldSeed = force || (await needsSeeding());
  if (!shouldSeed) return { seeded: false, reason: 'already-seeded' };

  const data = buildSeedData();

  // seeds hanya untuk store master; store transaksi tetap kosong
  const masterMap = {
    users: data.users,
    roles: data.roles,
    divisions: data.divisions,
    estates: data.estates,
    programReplanting: data.programReplanting,
    programNursery: data.programNursery,
    clones: data.clones,
    workers: data.workers,
    suppliers: data.suppliers,
    warehouseStocks: data.warehouseStocks,
    growthStages: data.growthStages,
    beds: data.beds,
    reasons: data.reasons
  };

  for (const [store, records] of Object.entries(masterMap)) {
    if (force) await clearStore(store);
    if (records && records.length) {
      await putMany(store, records);
    }
  }

  await setMeta('seedVersion', SEED_VERSION);
  return { seeded: true };
}
