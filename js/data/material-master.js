/**
 * js/data/material-master.js
 * Master Material & Issue Gudang Data Access Layer (Task: Master Material & Simulasi Issue Gudang).
 *
 * Prinsip:
 * - SOURCE OF TRUTH: Material Issue.xlsx (via js/data/material-issue-data.js)
 * - 1 Item Code = 1 Master Material
 * - 1 Item Code = 1 UOM Master (Normalized, e.g. 7056599 -> BH)
 * - 1 No Issue = 1 Dokumen Issue Gudang (61 dokumen)
 * - Dynamic Usage & Remaining derived from operational transactions (seeding_transactions)
 * - DO NOT mutate original imported baseline quantityIssue
 */

import { storage } from '../core/storage.js';
import {
  INITIAL_MASTER_MATERIALS,
  INITIAL_ISSUE_DOCUMENTS,
  RAW_MATERIAL_ISSUE_RECORDS,
  UOM_NORMALIZATION_LOG
} from './material-issue-data.js';

const STORAGE_KEYS = {
  MASTER_MATERIALS: 'master_materials',
  ISSUE_DOCUMENTS: 'issue_documents',
  DATA_VERSION: 'material_data_version_v3_1'
};

/**
 * Inisialisasi storage baseline jika belum ada atau versi data berubah.
 */
export function initMaterialMasterStorage(force = false) {
  const versionMatches = storage.get(STORAGE_KEYS.DATA_VERSION) === '3.1.0';
  if (force || !versionMatches || !storage.has(STORAGE_KEYS.MASTER_MATERIALS)) {
    storage.set(STORAGE_KEYS.MASTER_MATERIALS, INITIAL_MASTER_MATERIALS);
    storage.set(STORAGE_KEYS.ISSUE_DOCUMENTS, INITIAL_ISSUE_DOCUMENTS);
    storage.set(STORAGE_KEYS.DATA_VERSION, '3.1.0');
  }
}

/**
 * Helper to match an operational transaction to a specific Issue document and Issue item.
 * @param {Object} tx - Transaction object (e.g. from seeding_transactions)
 * @param {Object} doc - Issue document object (has id, noIssue)
 * @param {Object} item - Issue item detail object (has id, itemCode)
 * @param {number} docItemCount - Number of items in the issue document
 * @returns {boolean}
 */
export function isTransactionMatchingIssueItem(tx, doc, item, docItemCount = 1) {
  if (!tx || !doc || !item) return false;

  const txIssue = String(tx.issueDocNo || tx.noIssue || '').trim().toUpperCase();
  const docId = String(doc.id || '').trim().toUpperCase();
  const docNo = String(doc.noIssue || '').trim().toUpperCase();

  const matchesDoc = txIssue && (txIssue === docId || txIssue === docNo);
  if (!matchesDoc) return false;

  // 1. Exact match via issueItemId if present in transaction
  if (tx.issueItemId && item.id) {
    return String(tx.issueItemId).trim().toUpperCase() === String(item.id).trim().toUpperCase();
  }

  // 2. Fallback via itemCode if present
  if (tx.itemCode && item.itemCode) {
    return String(tx.itemCode).trim().toUpperCase() === String(item.itemCode).trim().toUpperCase();
  }

  // 3. Fallback for single-item documents
  if (docItemCount === 1) {
    return true;
  }

  return false;
}

/**
 * Calculates total consumption (used quantity) for a specific Issue Item across transactions.
 * @param {Object} doc - Issue document
 * @param {Object} item - Issue item detail
 * @param {number} docItemCount - Total items in doc
 * @param {string|null} excludeTxDocNo - Optional tx docNo to exclude (for edit mode)
 * @returns {number} Total used quantity
 */
export function calculateIssueItemUsedQuantity(doc, item, docItemCount = 1, excludeTxDocNo = null) {
  const seedingTxs = storage.get('seeding_transactions', []);
  let usedQty = 0;

  seedingTxs.forEach(tx => {
    if (excludeTxDocNo && tx.docNo === excludeTxDocNo) return;
    if (isTransactionMatchingIssueItem(tx, doc, item, docItemCount)) {
      usedQty += parseInt(tx.totalPolybag || tx.rows?.[0]?.polybag || 0, 10);
    }
  });

  return usedQty;
}

/**
 * Calculates derived balance for a specific Issue Item.
 * @param {string} noIssue - Issue Document number or ID
 * @param {string} issueItemId - Specific item ID within Issue document
 * @param {string|null} itemCode - Optional itemCode fallback
 * @param {string|null} excludeDocNo - Optional seeding transaction docNo to exclude (edit mode)
 * @returns {{ quantityIssue: number, usedQuantity: number, remainingQuantity: number, status: string }}
 */
export function calculateRemainingIssueBalance(noIssue, issueItemId, itemCode = null, excludeDocNo = null) {
  initMaterialMasterStorage();
  const rawDocs = storage.get(STORAGE_KEYS.ISSUE_DOCUMENTS) || INITIAL_ISSUE_DOCUMENTS;
  const doc = rawDocs.find(d => 
    String(d.noIssue || '').trim().toUpperCase() === String(noIssue || '').trim().toUpperCase() || 
    String(d.id || '').trim().toUpperCase() === String(noIssue || '').trim().toUpperCase()
  );

  if (!doc) return { quantityIssue: 0, usedQuantity: 0, remainingQuantity: 0, status: 'NOT_FOUND' };

  const items = doc.items || [];
  const targetItem = items.find(it => String(it.id).trim() === String(issueItemId).trim()) ||
    (itemCode ? items.find(it => String(it.itemCode).trim() === String(itemCode).trim()) : null) ||
    items[0];

  if (!targetItem) return { quantityIssue: 0, usedQuantity: 0, remainingQuantity: 0, status: 'NOT_FOUND' };

  const quantityIssue = Number(targetItem.quantityIssue) || 0;
  const usedQty = calculateIssueItemUsedQuantity(doc, targetItem, items.length, excludeDocNo);
  const remainingQuantity = Math.max(0, quantityIssue - usedQty);

  let status = 'AVAILABLE';
  if (remainingQuantity === 0) status = 'FULLY_USED';
  else if (usedQty > 0) status = 'PARTIALLY_USED';

  return {
    quantityIssue,
    usedQuantity: usedQty,
    remainingQuantity,
    status
  };
}

/**
 * Mengambil seluruh data Master Material (13 records).
 */
export function getAllMaterials() {
  initMaterialMasterStorage();
  const stored = storage.get(STORAGE_KEYS.MASTER_MATERIALS);
  return (Array.isArray(stored) && stored.length > 0) ? stored : INITIAL_MASTER_MATERIALS;
}

/**
 * Mengambil Master Material berdasarkan Item Code.
 */
export function getMaterialByItemCode(itemCode) {
  if (!itemCode) return null;
  const materials = getAllMaterials();
  const codeStr = String(itemCode).trim();
  return materials.find(m => String(m.itemCode).trim() === codeStr) || null;
}

/**
 * Mengambil seluruh Dokumen Issue Gudang (61 documents) dengan derived usage & remaining real-time.
 * JANGAN memutasi original storage/imported record quantityIssue.
 */
export function getAllIssueDocuments() {
  initMaterialMasterStorage();
  const stored = storage.get(STORAGE_KEYS.ISSUE_DOCUMENTS);
  const rawDocs = (Array.isArray(stored) && stored.length > 0) ? stored : INITIAL_ISSUE_DOCUMENTS;

  // Return dynamically derived documents without mutating persistent baseline storage
  return rawDocs.map(doc => {
    const items = (doc.items || []).map(item => {
      const quantityIssue = Number(item.quantityIssue) || 0;
      const usedQuantity = calculateIssueItemUsedQuantity(doc, item, doc.items?.length || 1);
      const remainingQuantity = Math.max(0, quantityIssue - usedQuantity);

      let itemStatus = 'AVAILABLE';
      if (remainingQuantity === 0) {
        itemStatus = 'FULLY_USED';
      } else if (usedQuantity > 0) {
        itemStatus = 'PARTIALLY_USED';
      }

      return {
        ...item,
        quantityIssue,
        usedQuantity,
        remainingQuantity,
        status: doc.status === 'INACTIVE' ? 'INACTIVE' : itemStatus
      };
    });

    const totalQuantity = items.reduce((sum, it) => sum + (Number(it.quantityIssue) || 0), 0);
    const totalUsed = items.reduce((sum, it) => sum + (Number(it.usedQuantity) || 0), 0);
    const totalRemaining = items.reduce((sum, it) => sum + (Number(it.remainingQuantity) || 0), 0);

    let docStatus = 'AVAILABLE';
    if (doc.status === 'INACTIVE') {
      docStatus = 'INACTIVE';
    } else if (totalRemaining === 0 || totalUsed >= totalQuantity) {
      docStatus = 'FULLY_USED';
    } else if (totalUsed > 0) {
      docStatus = 'PARTIALLY_USED';
    }

    return {
      ...doc,
      items,
      quantityIssue: totalQuantity,
      usedQuantity: totalUsed,
      remainingQuantity: totalRemaining,
      status: docStatus
    };
  });
}

/**
 * Mengambil Dokumen Issue berdasarkan No Issue atau ID.
 */
export function getIssueByNoIssue(noIssueOrId) {
  if (!noIssueOrId) return null;
  const docs = getAllIssueDocuments();
  const query = String(noIssueOrId).trim().toUpperCase();
  return docs.find(d => 
    String(d.noIssue).trim().toUpperCase() === query || 
    String(d.id).trim().toUpperCase() === query
  ) || null;
}

/**
 * Mengambil list detail item dari Dokumen Issue.
 */
export function getIssueDetails(issueIdOrNo) {
  const doc = getIssueByNoIssue(issueIdOrNo);
  return doc?.items || [];
}

/**
 * Mengambil total kuantiti yang sudah digunakan pada Issue (real-time derived).
 */
export function getIssueUsedQuantity(issueIdOrNo) {
  const details = getIssueDetails(issueIdOrNo);
  return details.reduce((sum, item) => sum + (Number(item.usedQuantity) || 0), 0);
}

/**
 * Mengambil sisa kuantiti Issue (real-time derived).
 */
export function getIssueRemainingQuantity(issueIdOrNo) {
  const details = getIssueDetails(issueIdOrNo);
  return details.reduce((sum, item) => sum + (Number(item.remainingQuantity) || 0), 0);
}

/**
 * Mengambil status Dokumen Issue (AVAILABLE / PARTIALLY_USED / FULLY_USED).
 */
export function getIssueStatus(issueIdOrNo) {
  const doc = getIssueByNoIssue(issueIdOrNo);
  if (!doc) return 'NOT_FOUND';
  return doc.status || 'AVAILABLE';
}

/**
 * Mengambil seluruh data mentah source Excel (61 records).
 */
export function getRawSourceRecords() {
  return RAW_MATERIAL_ISSUE_RECORDS;
}

/**
 * Mengambil log normalisasi UOM.
 */
export function getUomNormalizationLog() {
  return UOM_NORMALIZATION_LOG;
}

/**
 * Summary statistik untuk header & dashboard.
 */
export function getMaterialSummaryStats() {
  const materials = getAllMaterials();
  const issues = getAllIssueDocuments();
  
  let totalAvailableIssues = 0;
  let totalItemsCount = 0;

  issues.forEach(doc => {
    if (doc.status === 'AVAILABLE') totalAvailableIssues++;
    totalItemsCount += (doc.items || []).length;
  });

  return {
    totalMasterMaterials: materials.length,
    totalIssueDocuments: issues.length,
    totalIssueDetails: totalItemsCount,
    totalAvailableIssues,
    sourceRecordsCount: RAW_MATERIAL_ISSUE_RECORDS.length
  };
}

