/**
 * db/indexeddb.js — IndexedDB wrapper (sigma-nursery-db).
 * Object store sesuai SPEC §11. UI tidak boleh akses langsung.
 */

const DB_NAME = 'sigma-nursery-db';
const DB_VERSION = 1;

export const STORES = Object.freeze([
  // master
  'users',
  'roles',
  'sessions',
  'divisions',
  'estates',
  'programReplanting',
  'programNursery',
  'clones',
  'workers',
  'suppliers',
  'warehouseStocks',
  'growthStages',
  'beds',
  'reasons',
  // transaksi
  'attendance',
  'receptions',
  'seedings',
  'transplantations',
  'buddings',
  'inspections',
  'regraftings',
  'selections',
  'batchTransfers',
  'stageTransfers',
  'entresActivities',
  'nurseryActivities',
  'requests',
  // pendukung
  'batches',
  'approvals',
  'syncQueue',
  'auditLogs',
  'photos'
]);

let dbPromise = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB blocked (tab lain masih terbuka)'));
  });
}

export async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB();
  }
  return dbPromise;
}

/* Kebutuhan request-based (getAll, get, put, delete) ditangani helper di bawah. */

export async function putRecord(storeName, record) {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.put(record);

        let finished = false;
        const done = () => {
          if (!finished) {
            finished = true;
            resolve(record);
          }
        };

        req.onsuccess = done;
        tx.oncomplete = done;
        tx.onerror = done;
        tx.onabort = done;
        req.onerror = done;

        setTimeout(done, 1000);
      } catch (txErr) {
        console.warn('[putRecord] tx error:', txErr);
        resolve(record);
      }
    });
  } catch (err) {
    console.warn('[putRecord] DB error:', err);
    return record;
  }
}

export async function putMany(storeName, records) {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        for (const r of records) {
          store.put(r);
        }

        let finished = false;
        const done = () => {
          if (!finished) {
            finished = true;
            resolve(records);
          }
        };

        tx.oncomplete = done;
        tx.onerror = done;
        tx.onabort = done;

        setTimeout(done, 1200);
      } catch (txErr) {
        console.warn('[putMany] tx error:', txErr);
        resolve(records);
      }
    });
  } catch (err) {
    console.warn('[putMany] DB error:', err);
    return records;
  }
}

export async function getRecord(storeName, id) {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.get(id);

        let finished = false;
        const done = (res) => {
          if (!finished) {
            finished = true;
            resolve(res || null);
          }
        };

        req.onsuccess = () => done(req.result || null);
        req.onerror = () => done(null);
        tx.onerror = () => done(null);
        setTimeout(() => done(null), 1000);
      } catch (txErr) {
        console.warn('[getRecord] tx error:', txErr);
        resolve(null);
      }
    });
  } catch (err) {
    console.warn('[getRecord] DB error:', err);
    return null;
  }
}

export async function getAllFromStore(storeName) {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();

        let finished = false;
        const done = (res) => {
          if (!finished) {
            finished = true;
            resolve(res || []);
          }
        };

        req.onsuccess = () => done(req.result || []);
        req.onerror = () => done([]);
        tx.onerror = () => done([]);
        setTimeout(() => done([]), 1200);
      } catch (txErr) {
        console.warn('[getAllFromStore] tx error:', txErr);
        resolve([]);
      }
    });
  } catch (err) {
    console.warn('[getAllFromStore] DB error:', err);
    return [];
  }
}

export async function deleteRecord(storeName, id) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function clearStore(storeName) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function countStore(storeName) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Metadata db helper */
export async function setMeta(key, value) {
  return putRecord('meta', { key, value });
}

export async function getMeta(key) {
  const rec = await getRecord('meta', key);
  return rec ? rec.value : null;
}

export async function resetDatabase() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.concat(['meta']), 'readwrite');
    for (const store of STORES.concat(['meta'])) {
      tx.objectStore(store).clear();
    }
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
