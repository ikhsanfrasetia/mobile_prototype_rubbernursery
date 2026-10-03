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
 * Sinkronisasi populasi Batch Pokok dari transaksi Pindah Semai (seeding_transactions)
 * Menghitung SUM(totalDisemai) dari seluruh transaksi SOW yang valid untuk batch tersebut.
 * Idempoten: Tidak akan melakukan double counting saat dipanggil berulang kali.
 * @param {string} batchIdOrCode
 * @returns {Object|null} State inventory yang telah disinkronkan
 */
export function syncBatchPopulationFromSeeding(batchIdOrCode) {
  if (!batchIdOrCode) return null;

  const targetCode = String(batchIdOrCode).trim();
  const masterBatch = _findBatchInMaster(targetCode);
  const possibleCodes = new Set([targetCode]);
  if (masterBatch) {
    if (masterBatch.id) possibleCodes.add(String(masterBatch.id).trim());
    if (masterBatch.batchId) possibleCodes.add(String(masterBatch.batchId).trim());
    if (masterBatch.batchCode) possibleCodes.add(String(masterBatch.batchCode).trim());
    if (masterBatch.batchNo) possibleCodes.add(String(masterBatch.batchNo).trim());
    if (masterBatch.kode) possibleCodes.add(String(masterBatch.kode).trim());
  }

  const seedings = storage.get('seeding_transactions', []);
  if (!Array.isArray(seedings) || seedings.length === 0) return null;

  // 1. Filter transaksi SOW (Pindah Semai) yang menunjuk ke batch ini
  const matchingSeedings = seedings.filter(tx => {
    if (tx.isDeleted || tx.deleted || tx.status === 'DELETED') return false;
    
    const rootIdMatch = tx.batchId && possibleCodes.has(String(tx.batchId).trim());
    const rootCodeMatch = (tx.batchCode && possibleCodes.has(String(tx.batchCode).trim())) || 
                          (tx.batchNo && possibleCodes.has(String(tx.batchNo).trim())) ||
                          (tx.batch_code && possibleCodes.has(String(tx.batch_code).trim()));
    
    let rowMatch = false;
    if (Array.isArray(tx.rows)) {
      rowMatch = tx.rows.some(r => 
        (r.batchId && possibleCodes.has(String(r.batchId).trim())) ||
        (r.batchNo && possibleCodes.has(String(r.batchNo).trim())) ||
        (r.batchCode && possibleCodes.has(String(r.batchCode).trim()))
      );
    }

    return rootIdMatch || rootCodeMatch || rowMatch;
  });

  if (matchingSeedings.length === 0) {
    return null;
  }

  // 2. Hitung total populasi pokok yang berhasil disemai (SUM totalDisemai)
  let totalDisemaiSum = 0;
  matchingSeedings.forEach(tx => {
    const qty = Number(
      tx.totalDisemai !== undefined ? tx.totalDisemai :
      (tx.disemai !== undefined ? tx.disemai :
      (tx.rows && tx.rows.length > 0 ? tx.rows.reduce((acc, r) => acc + Number(r.disemai || 0), 0) : 0))
    );
    if (!isNaN(qty) && qty > 0) {
      totalDisemaiSum += qty;
    }
  });

  // 3. Hitung total pengurang CULL yang sudah DISETUJUI / VERIFIED dengan mutasi APPLIED
  const selections = storage.get('selection_transactions', []);
  let totalApprovedCull = 0;
  if (Array.isArray(selections)) {
    selections.forEach(sel => {
      const isMatch = (
        (sel.batchId && possibleCodes.has(String(sel.batchId).trim())) ||
        (sel.batchCode && possibleCodes.has(String(sel.batchCode).trim())) ||
        (sel.batchNo && possibleCodes.has(String(sel.batchNo).trim())) ||
        (sel.sourceBatchCode && possibleCodes.has(String(sel.sourceBatchCode).trim()))
      );
      const s = String(sel.status || '').toUpperCase();
      const isApproved = s === 'DISETUJUI' || s === 'VERIFIED' || s === 'TERVERIFIKASI';
      if (isMatch && isApproved && sel.stockMutationStatus === 'APPLIED') {
        const cullQty = Number(sel.jumlahAfkir || sel.quantity || 0);
        if (!isNaN(cullQty) && cullQty > 0) {
          totalApprovedCull += cullQty;
        }
      }
    });
  }

  // Juga periksa jurnal mutasi jika ada pengurang selain CULL (misal dispatch/destruction)
  const journal = _loadInventoryJournal();
  let journalDeductions = 0;
  if (Array.isArray(journal)) {
    journal.forEach(j => {
      if ((possibleCodes.has(j.batchId) || possibleCodes.has(j.batchCode)) && Number(j.qtyOut || 0) > 0) {
        journalDeductions += Number(j.qtyOut || 0);
      }
    });
  }

  const effectiveDeductions = Math.max(totalApprovedCull, journalDeductions);
  const newAvailable = Math.max(0, totalDisemaiSum - effectiveDeductions);
  const now = new Date().toISOString();

  // 4. Update / init inventory state
  const states = _loadInventoryStates();
  let state = states.find(s => possibleCodes.has(s.batchId) || possibleCodes.has(s.batchCode));
  
  let bId = targetCode;
  let bCode = targetCode;
  if (masterBatch) {
    bId = masterBatch.id || masterBatch.batchId || targetCode;
    bCode = masterBatch.batchCode || masterBatch.batchNo || masterBatch.kode || bId;
  }

  if (!state) {
    state = {
      batchId: bId,
      batchCode: bCode,
      initialQty: totalDisemaiSum,
      receivedQty: totalDisemaiSum,
      availableQty: newAvailable,
      status: newAvailable > 0 ? INVENTORY_STATUS.AVAILABLE : INVENTORY_STATUS.EMPTY,
      createdAt: masterBatch?.createdAt || now,
      updatedAt: now
    };
    states.push(state);
  } else {
    state.initialQty = totalDisemaiSum;
    state.receivedQty = totalDisemaiSum;
    state.availableQty = newAvailable;
    state.status = newAvailable > 0 ? INVENTORY_STATUS.AVAILABLE : INVENTORY_STATUS.EMPTY;
    state.updatedAt = now;
  }

  _saveInventoryStates(states);
  _syncLegacyBatchStorage(bId, newAvailable, totalDisemaiSum, state.status);

  return { ...state };
}

/**
 * Sinkronisasi seluruh batch populasi dari seeding_transactions
 * @returns {Array<Object>}
 */
export function syncAllBatchPopulationsFromSeeding() {
  const seedings = storage.get('seeding_transactions', []);
  if (!Array.isArray(seedings) || seedings.length === 0) return [];

  const batchCodes = new Set();
  seedings.forEach(tx => {
    if (tx.isDeleted || tx.deleted || tx.status === 'DELETED') return;
    if (tx.batchId) batchCodes.add(String(tx.batchId).trim());
    if (tx.batchCode) batchCodes.add(String(tx.batchCode).trim());
    if (tx.batchNo) batchCodes.add(String(tx.batchNo).trim());
    if (Array.isArray(tx.rows)) {
      tx.rows.forEach(r => {
        if (r.batchId) batchCodes.add(String(r.batchId).trim());
        if (r.batchNo) batchCodes.add(String(r.batchNo).trim());
        if (r.batchCode) batchCodes.add(String(r.batchCode).trim());
      });
    }
  });

  const results = [];
  batchCodes.forEach(code => {
    if (code) {
      const res = syncBatchPopulationFromSeeding(code);
      if (res) results.push(res);
    }
  });
  return results;
}

/**
 * Mengambil state inventory dari sebuah batch
 * @param {string} batchIdOrCode - ID atau Kode Batch
 * @returns {Object|null}
 */
export function getBatchInventory(batchIdOrCode) {
  if (!batchIdOrCode) return null;

  // 1. Sync dari seeding transactions jika batch memiliki record SOW
  const syncedFromSeeding = syncBatchPopulationFromSeeding(batchIdOrCode);
  if (syncedFromSeeding) {
    return syncedFromSeeding;
  }

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
