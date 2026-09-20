/**
 * js/data/material-master.js
 * Master Material & Issue Gudang Data Access Layer (Task: Master Material & Simulasi Issue Gudang).
 *
 * Prinsip:
 * - SOURCE OF TRUTH: Material Issue.xlsx (via js/data/material-issue-data.js)
 * - 1 Item Code = 1 Master Material
 * - 1 Item Code = 1 UOM Master (Normalized, e.g. 7056599 -> BH)
 * - 1 No Issue = 1 Dokumen Issue Gudang (61 dokumen)
 * - Saldo Initial: usedQuantity = 0, remainingQuantity = quantityIssue, status = 'AVAILABLE'
 * - NO INTEGRATION TO OPERATIONAL TRANSACTIONS
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
 * Mengambil seluruh Dokumen Issue Gudang (61 documents).
 */
export function getAllIssueDocuments() {
  initMaterialMasterStorage();
  const stored = storage.get(STORAGE_KEYS.ISSUE_DOCUMENTS);
  return (Array.isArray(stored) && stored.length > 0) ? stored : INITIAL_ISSUE_DOCUMENTS;
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
 * Mengambil total kuantiti yang sudah digunakan pada Issue (initial = 0).
 */
export function getIssueUsedQuantity(issueIdOrNo) {
  const details = getIssueDetails(issueIdOrNo);
  return details.reduce((sum, item) => sum + (Number(item.usedQuantity) || 0), 0);
}

/**
 * Mengambil sisa kuantiti Issue (initial = quantityIssue).
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
  
  const totalIssue = doc.items.reduce((sum, item) => sum + (Number(item.quantityIssue) || 0), 0);
  const totalUsed = doc.items.reduce((sum, item) => sum + (Number(item.usedQuantity) || 0), 0);
  
  if (totalUsed === 0) return 'AVAILABLE';
  if (totalUsed >= totalIssue) return 'FULLY_USED';
  return 'PARTIALLY_USED';
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
    if (getIssueStatus(doc.id) === 'AVAILABLE') totalAvailableIssues++;
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
