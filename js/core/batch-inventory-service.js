/**
 * js/core/batch-inventory-service.js
 * INVENTORY LEDGER SERVICE TERPISAH DARI MASTER BATCH (TASK-REFACTOR-BATCH-INVENTORY-LEDGER-01)
 * 
 * Prinsip:
 * - SINGLE SOURCE OF TRUTH UNTUK SALDO & MUTASI STOK BATCH
 * - Memisahkan seluruh state stok/transaksi dari Master Batch
 * - Master Batch hanya menjadi identity / reference data
 * - Mencatat seluruh mutasi stok ke dalam Inventory Journal
 * - Menyediakan Compatibility Layer untuk consumer lama
 */

import { storage } from './storage.js';

export const STORAGE_KEY_INVENTORY_STATES = 'batch_inventory_states';
export const STORAGE_KEY_INVENTORY_JOURNAL = 'batch_inventory_journal';

export const INVENTORY_TX_TYPE = Object.freeze({
  RECEIPT: 'RECEIPT',
  DISPATCH: 'DISPATCH',
  SELECTION: 'SELECTION',
  DESTRUCTION: 'DESTRUCTION',
  ADJUSTMENT: 'ADJUSTMENT',
  INITIAL: 'INITIAL'
});

export const INVENTORY_STATUS = Object.freeze({
  CREATED: 'CREATED',
  AVAILABLE: 'AVAILABLE',
  EMPTY: 'EMPTY',
  INACTIVE: 'INACTIVE'
});

/**
 * Memuat seluruh state inventory dari storage
 */
function _loadInventoryStates() {
  const list = storage.get(STORAGE_KEY_INVENTORY_STATES, null);
  if (list === null || !Array.isArray(list)) {
    return [];
  }
  return list;
}

/**
 * Menyimpan seluruh state inventory ke storage
 */
function _saveInventoryStates(states) {
  storage.set(STORAGE_KEY_INVENTORY_STATES, states);
}

/**
 * Memuat seluruh jurnal inventory dari storage
 */
function _loadInventoryJournal() {
  const journal = storage.get(STORAGE_KEY_INVENTORY_JOURNAL, null);
  if (journal === null || !Array.isArray(journal)) {
    return [];
  }
  return journal;
}

/**
 * Menyimpan jurnal inventory ke storage
 */
function _saveInventoryJournal(journal) {
  storage.set(STORAGE_KEY_INVENTORY_JOURNAL, journal);
}

/**
 * Helper: Resolve batch identity dari storage nursery_batches jika diperlukan
 */
function _findBatchInMaster(batchIdOrCode) {
  if (!batchIdOrCode) return null;
  const batches = storage.get('nursery_batches', []);
  return batches.find(b => 
    b.id === batchIdOrCode || 
    b.batchId === batchIdOrCode || 
    b.batchCode === batchIdOrCode || 
    b.batchNo === batchIdOrCode ||
    b.kode === batchIdOrCode
  ) || null;
}

/**
 * Helper: Sinkronisasi backward-compatibility ke nursery_batches jika ada
 */
function _syncLegacyBatchStorage(batchIdOrCode, availableQty, receivedQty = null, status = null) {
  try {
    const batches = storage.get('nursery_batches', []);
    if (!Array.isArray(batches) || batches.length === 0) return;

    let modified = false;
    const updated = batches.map(b => {
      if (b.id === batchIdOrCode || b.batchId === batchIdOrCode || b.batchCode === batchIdOrCode || b.batchNo === batchIdOrCode || b.kode === batchIdOrCode) {
        modified = true;
        return {
          ...b,
          availableQty: availableQty,
          currentQty: availableQty,
          ...(receivedQty !== null ? { receivedQty: receivedQty } : {}),
          ...(status !== null ? { status: status } : (availableQty === 0 ? { status: 'EMPTY' } : {}))
        };
      }
      return b;
    });

    if (modified) {
      storage.set('nursery_batches', updated);
    }
  } catch (err) {
    console.warn('[BatchInventoryService] Failed to sync legacy storage:', err);
  }
}

/**
 * Mengambil state inventory dari sebuah batch
 * @param {string} batchIdOrCode - ID atau Kode Batch
 * @returns {Object|null}
 */
export function getBatchInventory(batchIdOrCode) {
  if (!batchIdOrCode) return null;

  const states = _loadInventoryStates();
  let state = states.find(s => s.batchId === batchIdOrCode || s.batchCode === batchIdOrCode);

  if (state) {
    return { ...state };
  }

  // Fallback bootstrap dari master batch jika belum ada di state ledger
  const masterBatch = _findBatchInMaster(batchIdOrCode);
  if (masterBatch) {
    const bId = masterBatch.id || masterBatch.batchId || masterBatch.batchCode;
    const bCode = masterBatch.batchCode || masterBatch.batchNo || masterBatch.kode || bId;
    const initialQty = Number(masterBatch.initialQty ?? masterBatch.receivedQty ?? 0);
    const receivedQty = Number(masterBatch.receivedQty ?? initialQty);
    const availableQty = Number(masterBatch.availableQty ?? masterBatch.currentQty ?? initialQty);
    const status = masterBatch.status || (availableQty > 0 ? INVENTORY_STATUS.AVAILABLE : INVENTORY_STATUS.EMPTY);

    const newState = {
      batchId: bId,
      batchCode: bCode,
      initialQty: initialQty,
      receivedQty: receivedQty,
      availableQty: availableQty,
      status: status,
      createdAt: masterBatch.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    states.push(newState);
    _saveInventoryStates(states);
    return { ...newState };
  }

  return null;
}

/**
 * Mengambil jumlah saldo/stok tersedia dari sebuah batch
 * @param {string} batchIdOrCode 
 * @returns {number}
 */
export function getAvailableQty(batchIdOrCode) {
  const inv = getBatchInventory(batchIdOrCode);
  if (!inv) return 0;
  if (inv.status === INVENTORY_STATUS.INACTIVE) return 0;
  return Number(inv.availableQty || 0);
}

/**
 * Inisialisasi saldo inventory untuk Batch Baru
 * @param {string} batchId 
 * @param {string} batchCode 
 * @param {number} initialQty 
 * @param {Object} options 
 */
export function initBatchInventory(batchId, batchCode, initialQty = 0, options = {}) {
  const initQty = Number(initialQty || 0);
  const states = _loadInventoryStates();
  const existingIdx = states.findIndex(s => s.batchId === batchId || s.batchCode === batchCode);

  const now = new Date().toISOString();
  const stateObj = {
    batchId: batchId,
    batchCode: batchCode || batchId,
    initialQty: initQty,
    receivedQty: initQty,
    availableQty: initQty,
    status: initQty > 0 ? INVENTORY_STATUS.AVAILABLE : INVENTORY_STATUS.CREATED,
    createdAt: now,
    updatedAt: now
  };

  if (existingIdx !== -1) {
    states[existingIdx] = {
      ...states[existingIdx],
      ...stateObj,
      updatedAt: now
    };
  } else {
    states.push(stateObj);
  }

  _saveInventoryStates(states);

  // Jika initialQty > 0, catat jurnal awal
  if (initQty > 0) {
    const journal = _loadInventoryJournal();
    const journalId = `JRN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    journal.push({
      id: journalId,
      batchId: batchId,
      batchCode: batchCode || batchId,
      txType: INVENTORY_TX_TYPE.INITIAL,
      qtyIn: initQty,
      qtyOut: 0,
      balance: initQty,
      refId: options.refId || null,
      notes: options.notes || 'Inisialisasi stok awal batch',
      createdAt: now,
      createdBy: options.createdBy || 'SYSTEM'
    });
    _saveInventoryJournal(journal);
  }

  _syncLegacyBatchStorage(batchId, initQty, initQty, stateObj.status);
  return stateObj;
}

/**
 * Menambah stok Batch dari transaksi Penerimaan (Receipt / KSP)
 * @param {string} batchIdOrCode 
 * @param {number} qty 
 * @param {Object|string} receiptMetaOrId 
 * @param {Object|string} user 
 * @param {string} notes 
 */
export function addBatchStockFromReceipt(batchIdOrCode, qty, receiptMetaOrId = null, user = null, notes = '') {
  const addQty = Number(qty);
  if (isNaN(addQty) || addQty <= 0) {
    throw new Error('Kuantitas penambahan stok harus berupa angka lebih dari 0');
  }

  const states = _loadInventoryStates();
  let state = states.find(s => s.batchId === batchIdOrCode || s.batchCode === batchIdOrCode);

  let bId = batchIdOrCode;
  let bCode = batchIdOrCode;

  if (!state) {
    const masterBatch = _findBatchInMaster(batchIdOrCode);
    if (masterBatch) {
      bId = masterBatch.id || masterBatch.batchId || masterBatch.batchCode;
      bCode = masterBatch.batchCode || masterBatch.batchNo || masterBatch.kode || bId;
      state = {
        batchId: bId,
        batchCode: bCode,
        initialQty: 0,
        receivedQty: 0,
        availableQty: 0,
        status: INVENTORY_STATUS.CREATED,
        createdAt: masterBatch.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      states.push(state);
    } else {
      // Create new state automatically if not exists
      state = {
        batchId: bId,
        batchCode: bCode,
        initialQty: 0,
        receivedQty: 0,
        availableQty: 0,
        status: INVENTORY_STATUS.CREATED,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      states.push(state);
    }
  } else {
    bId = state.batchId;
    bCode = state.batchCode || state.batchId;
  }

  const newReceived = Number(state.receivedQty || 0) + addQty;
  const newAvailable = Number(state.availableQty || 0) + addQty;
  const now = new Date().toISOString();

  state.receivedQty = newReceived;
  state.availableQty = newAvailable;
  state.status = INVENTORY_STATUS.AVAILABLE;
  state.updatedAt = now;

  _saveInventoryStates(states);

  // Catat ke Jurnal Mutasi
  const refId = typeof receiptMetaOrId === 'object' && receiptMetaOrId !== null
    ? (receiptMetaOrId.id || receiptMetaOrId.receiptId || receiptMetaOrId.receiptDocNo || receiptMetaOrId.docNo)
    : receiptMetaOrId;

  const userName = typeof user === 'object' && user !== null
    ? (user.name || user.fullName || user.userId || user.username || 'SYSTEM')
    : (user || 'SYSTEM');

  const journal = _loadInventoryJournal();
  const journalId = `JRN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  journal.push({
    id: journalId,
    batchId: bId,
    batchCode: bCode,
    txType: INVENTORY_TX_TYPE.RECEIPT,
    qtyIn: addQty,
    qtyOut: 0,
    balance: newAvailable,
    refId: refId || null,
    notes: notes || `Penerimaan stok dari transaksi ${refId || ''}`.trim(),
    createdAt: now,
    createdBy: userName
  });

  _saveInventoryJournal(journal);

  // Sync backward compatibility
  _syncLegacyBatchStorage(bId, newAvailable, newReceived, INVENTORY_STATUS.AVAILABLE);

  return { ...state };
}

/**
 * Mengurangi stok Batch dari transaksi (Dispatch, Selection, Destruction, Adjustment)
 * @param {string} batchIdOrCode 
 * @param {number} qty 
 * @param {string} txType 
 * @param {Object|string} refIdOrMeta 
 * @param {Object|string} user 
 * @param {string} notes 
 */
export function deductBatchStock(batchIdOrCode, qty, txType = INVENTORY_TX_TYPE.DISPATCH, refIdOrMeta = null, user = null, notes = '') {
  const deductQty = Number(qty);
  if (isNaN(deductQty) || deductQty <= 0) {
    throw new Error('Kuantitas pengurangan stok harus berupa angka lebih dari 0');
  }

  const states = _loadInventoryStates();
  let state = states.find(s => s.batchId === batchIdOrCode || s.batchCode === batchIdOrCode);

  if (!state) {
    // Check fallback master batch
    const masterBatch = _findBatchInMaster(batchIdOrCode);
    if (!masterBatch) {
      throw new Error(`Batch '${batchIdOrCode}' tidak ditemukan di inventory ledger`);
    }

    const bId = masterBatch.id || masterBatch.batchId || masterBatch.batchCode;
    const bCode = masterBatch.batchCode || masterBatch.batchNo || masterBatch.kode || bId;
    const initialQty = Number(masterBatch.initialQty ?? masterBatch.receivedQty ?? 0);
    const receivedQty = Number(masterBatch.receivedQty ?? initialQty);
    const availableQty = Number(masterBatch.availableQty ?? masterBatch.currentQty ?? initialQty);
    const status = masterBatch.status || (availableQty > 0 ? INVENTORY_STATUS.AVAILABLE : INVENTORY_STATUS.EMPTY);

    state = {
      batchId: bId,
      batchCode: bCode,
      initialQty: initialQty,
      receivedQty: receivedQty,
      availableQty: availableQty,
      status: status,
      createdAt: masterBatch.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    states.push(state);
  }

  if (state.status === INVENTORY_STATUS.INACTIVE) {
    throw new Error(`Batch '${state.batchCode || state.batchId}' berstatus NONAKTIF dan tidak dapat digunakan untuk mutasi stok.`);
  }

  const currentAvailable = Number(state.availableQty || 0);
  if (currentAvailable < deductQty) {
    throw new Error(`Stok batch '${state.batchCode || state.batchId}' tidak mencukupi (Tersedia: ${currentAvailable}, Diminta: ${deductQty})`);
  }

  const newAvailable = currentAvailable - deductQty;
  const now = new Date().toISOString();

  state.availableQty = newAvailable;
  if (newAvailable === 0) {
    state.status = INVENTORY_STATUS.EMPTY;
  }
  state.updatedAt = now;

  _saveInventoryStates(states);

  const refId = typeof refIdOrMeta === 'object' && refIdOrMeta !== null
    ? (refIdOrMeta.id || refIdOrMeta.docNo || refIdOrMeta.dispatchId || refIdOrMeta.selectionId || refIdOrMeta.destructionId)
    : refIdOrMeta;

  const userName = typeof user === 'object' && user !== null
    ? (user.name || user.fullName || user.userId || user.username || 'SYSTEM')
    : (user || 'SYSTEM');

  const journal = _loadInventoryJournal();
  const journalId = `JRN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  journal.push({
    id: journalId,
    batchId: state.batchId,
    batchCode: state.batchCode || state.batchId,
    txType: txType || INVENTORY_TX_TYPE.DISPATCH,
    qtyIn: 0,
    qtyOut: deductQty,
    balance: newAvailable,
    refId: refId || null,
    notes: notes || `Pengurangan stok (${txType}) dari ref ${refId || ''}`.trim(),
    createdAt: now,
    createdBy: userName
  });

  _saveInventoryJournal(journal);

  // Sync backward compatibility
  _syncLegacyBatchStorage(state.batchId, newAvailable, null, state.status);

  return { ...state };
}

/**
 * Mengurangi stok multi-batch secara ATOMIK
 * @param {Array<{batchIdOrCode: string, qty: number}>} allocations 
 * @param {string} txType 
 * @param {string} refId 
 * @param {Object|string} user 
 */
export function deductMultiBatchStock(allocations, txType = INVENTORY_TX_TYPE.DISPATCH, refId = null, user = null) {
  if (!Array.isArray(allocations) || allocations.length === 0) {
    return { success: false, error: 'Daftar alokasi batch tidak boleh kosong.' };
  }

  // 1. Validasi kecukupan seluruh batch terlebih dahulu
  for (const alloc of allocations) {
    const bTarget = alloc.batchIdOrCode || alloc.batchCode || alloc.batchId;
    const deductQty = Number(alloc.qty);
    if (isNaN(deductQty) || deductQty <= 0) {
      return { success: false, error: `Kuantitas alokasi (${alloc.qty}) tidak valid.` };
    }

    const available = getAvailableQty(bTarget);
    if (available < deductQty) {
      return {
        success: false,
        error: `Stok batch ${bTarget} (${available.toLocaleString('id-ID')} Pkk) tidak mencukupi untuk alokasi ${deductQty.toLocaleString('id-ID')} Pkk.`
      };
    }
  }

  // 2. Eksekusi mutasi
  const results = [];
  for (const alloc of allocations) {
    const bTarget = alloc.batchIdOrCode || alloc.batchCode || alloc.batchId;
    const deductQty = Number(alloc.qty);
    const updated = deductBatchStock(bTarget, deductQty, txType, refId, user, alloc.notes || '');
    results.push(updated);
  }

  return { success: true, results };
}

/**
 * Mengambil histori mutasi / jurnal dari sebuah Batch
 * @param {string} batchIdOrCode 
 * @returns {Array<Object>}
 */
export function getBatchStockHistory(batchIdOrCode) {
  if (!batchIdOrCode) return [];
  const journal = _loadInventoryJournal();
  return journal.filter(j => j.batchId === batchIdOrCode || j.batchCode === batchIdOrCode);
}

/**
 * Mengambil seluruh data saldo inventory
 * @returns {Array<Object>}
 */
export function getAllInventoryStates() {
  return _loadInventoryStates();
}

/**
 * Mengambil seluruh catatan jurnal mutasi
 * @returns {Array<Object>}
 */
export function getAllJournalEntries() {
  return _loadInventoryJournal();
}

/**
 * Reset seluruh data ledger inventory ke baseline kosong
 */
export function resetInventoryToDefault() {
  storage.set(STORAGE_KEY_INVENTORY_STATES, []);
  storage.set(STORAGE_KEY_INVENTORY_JOURNAL, []);
}
