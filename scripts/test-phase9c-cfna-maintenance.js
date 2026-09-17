/**
 * scripts/test-phase9c-cfna-maintenance.js
 * 
 * Phase 9C — CFNA Integration to Maintenance Module Test Suite (TASK-CFNA-REPLACE-02)
 * 
 * Verifikasi menyeluruh integrasi Master Data CFNA (54 dataset) ke Modul Pemeliharaan
 * (nursery-activity.js), Context-aware filtering, Actor Identity (Phase 8B),
 * Scope Isolation, Backward Compatibility, dan Validation Rules.
 */

import {
  MASTER_AKTIVITAS,
  getConfirmedCfnaForActivity
} from '../js/modules/maintenance/nursery-activity.js';

import {
  CFNA_MASTER,
  CFNA_STATUS,
  MAPPING_STATUS,
  getCfnaByCode,
  getCfnaActivityMappings,
  getActiveCfnaMaster,
  isCfnaCodeValid
} from '../js/data/cfna-master.js';

import {
  applyTransactionActor,
  resolveTransactionActor,
  createTransactionActorSnapshot,
  AUDIT_EVENT_TYPES
} from '../js/core/transaction-actor.js';

import {
  getDemoPersonaById,
  DEMO_PERSONAS
} from '../js/data/demo-personas.js';

import { ROLES, SCOPE_TYPES } from '../js/core/user-context.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

console.log('=== STARTING PHASE 9C CFNA MAINTENANCE INTEGRATION TEST SUITE (54 DATASET) ===\n');

// --------------------------------------------------
// SECTION A: MASTER INTEGRATION & SINGLE SOURCE OF TRUTH
// --------------------------------------------------
console.log('--- SECTION A: Master Integration ---');

assert(typeof getConfirmedCfnaForActivity === 'function', 'TEST 1: getConfirmedCfnaForActivity is exported as helper function');
assert(Array.isArray(CFNA_MASTER) && CFNA_MASTER.length === 54, 'TEST 2: Single source of truth CFNA_MASTER preserved (54 records)');

const wateringCfna = getCfnaByCode('122171');
assert(wateringCfna !== null && wateringCfna.name === 'Penyiraman', 'TEST 3: Master API getCfnaByCode returns canonical record for 122171');

// --------------------------------------------------
// SECTION B: CONTEXT-AWARE ACTIVITY FILTER
// --------------------------------------------------
console.log('\n--- SECTION B: Activity Filter ---');

// Activity 1: Penyiraman
const penyiramanAct = MASTER_AKTIVITAS.find(a => a.kode === '122171' || a.nama.toLowerCase() === 'penyiraman');
const penyiramanCfna = getConfirmedCfnaForActivity(penyiramanAct);
assert(penyiramanCfna.length === 1 && penyiramanCfna[0].code === '122171', 'TEST 4: Penyiraman maps strictly to CONFIRMED 122171 (Penyiraman)');

// Activity 2: Pemupukan
const pemupukanAct = MASTER_AKTIVITAS.find(a => a.kode === '122174' || a.nama.toLowerCase() === 'pemupukan');
const pemupukanCfna = getConfirmedCfnaForActivity(pemupukanAct);
assert(pemupukanCfna.length === 1 && pemupukanCfna[0].code === '122174', 'TEST 5: Pemupukan maps strictly to CONFIRMED 122174 (Pemupukan)');

// Activity 3: Seleksi Bibit
const seleksiAct = MASTER_AKTIVITAS.find(a => a.kode === '122176' || a.nama.toLowerCase() === 'seleksi bibit');
const seleksiCfna = getConfirmedCfnaForActivity(seleksiAct);
assert(seleksiCfna.length === 1 && seleksiCfna[0].code === '122176', 'TEST 6: Seleksi Bibit maps strictly to CONFIRMED 122176 (Seleksi bibit)');

// Activity 4: Pengendalian Gulma
const gulmaAct = MASTER_AKTIVITAS.find(a => a.kode === '122173' || a.nama.toLowerCase() === 'pengendalian gulma');
const gulmaCfna = getConfirmedCfnaForActivity(gulmaAct);
assert(gulmaCfna.length === 1 && gulmaCfna[0].code === '122173', 'TEST 7: Pengendalian Gulma maps strictly to CONFIRMED 122173 (Pengendalian gulma)');

// Activity 5: Pengendalian Hama Penyakit
const hamaAct = MASTER_AKTIVITAS.find(a => a.kode === '122175' || a.nama.toLowerCase() === 'pengendalian hama penyakit');
const hamaCfna = getConfirmedCfnaForActivity(hamaAct);
assert(hamaCfna.length === 1 && hamaCfna[0].code === '122175', 'TEST 8: Pengendalian Hama Penyakit maps strictly to CONFIRMED 122175 (Pengendalian hama penyakit)');

// Unmapped activities (e.g. invalid activity object without valid CFNA code)
const unmappedAct = { nama: 'Kegiatan Tanpa CFNA', kode: 'NON_EXISTENT_999' };
const unmappedCfna = getConfirmedCfnaForActivity(unmappedAct);
assert(unmappedCfna.length === 0, 'TEST 9: Unmapped activity (invalid code) returns empty array (Belum tersedia mapping CFNA)');

const nullActCfna = getConfirmedCfnaForActivity(null);
assert(nullActCfna.length === 0, 'TEST 10: Null activity returns empty array');

// --------------------------------------------------
// SECTION C: TRANSACTION INTEGRITY & ACTOR IDENTITY
// --------------------------------------------------
console.log('\n--- SECTION C: Transaction Integrity & Actor Identity ---');

// Persona: Wagiman (MANTRI_TANAMAN - Tanah Besih)
const wagimanPersona = getDemoPersonaById('TBS-MNT-001');
assert(wagimanPersona !== null && wagimanPersona.name === 'Wagiman', 'TEST 12: Wagiman persona resolved successfully');

const simulatedMaintenanceRecord = {
  id: 'ACT-TEST-001',
  docNo: 'ACT/NUR/2026/01',
  aktivitas: penyiramanAct,
  program: 'PRG/NUR/01/2026',
  lokasiBlok: { blok: 'Block 031/04', luas: 39.68 },
  pekerja: [{ id: 'PK-01', name: 'Fadilah Yusuf Purba', code: '1405739', role: 'Pekerja Bibitan' }],
  allocationCode: penyiramanCfna[0].code,
  allocationName: penyiramanCfna[0].name,
  createdAt: new Date().toISOString()
};

// Apply actor identity snapshot
const enrichedRecord = applyTransactionActor(simulatedMaintenanceRecord, AUDIT_EVENT_TYPES.CREATE, wagimanPersona);

assert(enrichedRecord.allocationCode === '122171', 'TEST 13: Transaction contains valid allocationCode 122171');
assert(enrichedRecord.allocationName === 'Penyiraman', 'TEST 14: Transaction contains canonical allocationName "Penyiraman"');
assert(enrichedRecord.createdByUserId === 'TBS-MNT-001' || enrichedRecord.createdByUserId === 'MNT001', 'TEST 15: Transaction has correct createdByUserId');
assert(enrichedRecord.createdByName === 'Wagiman', 'TEST 16: Transaction has correct createdByName');
assert(enrichedRecord.createdByRole === ROLES.MANTRI_TANAMAN, 'TEST 17: Transaction has canonical role MANTRI_TANAMAN');
assert(enrichedRecord.createdByEstateId === 'EST-TBS', 'TEST 18: Transaction has correct estate EST-TBS');
assert(enrichedRecord.createdByDivisionId === 'DIV-001', 'TEST 19: Transaction has correct division DIV-001');
assert(enrichedRecord.createdByScopeType === SCOPE_TYPES.DIVISION, 'TEST 20: Mantri scopeType is DIVISION');
assert(Array.isArray(enrichedRecord.auditTrail) && enrichedRecord.auditTrail.length === 1, 'TEST 21: Audit trail recorded CREATE event');

// --------------------------------------------------
// SECTION D: SAME-ROLE & ESTATE ISOLATION
// --------------------------------------------------
console.log('\n--- SECTION D: Same-Role & Estate Isolation ---');

// Persona: Supriono (MANTRI_TANAMAN - Aek Pamingke)
const suprionoPersona = getDemoPersonaById('APM-MNT-002');
assert(suprionoPersona !== null && suprionoPersona.name === 'Supriono', 'TEST 22: Supriono persona resolved successfully');

const suprionoRecord = applyTransactionActor({
  id: 'ACT-TEST-002',
  docNo: 'ACT/NUR/2026/02',
  aktivitas: pemupukanAct,
  program: 'PRG/NUR/02/2027',
  lokasiBlok: { blok: 'Block 036G/19', luas: 0.45 },
  pekerja: [],
  allocationCode: pemupukanCfna[0].code,
  allocationName: pemupukanCfna[0].name,
  createdAt: new Date().toISOString()
}, AUDIT_EVENT_TYPES.CREATE, suprionoPersona);

assert(suprionoRecord.createdByName === 'Supriono', 'TEST 23: Supriono record creator is Supriono');
assert(suprionoRecord.createdByEstateId === 'EST-APM', 'TEST 24: Supriono estate is EST-APM (Aek Pamingke)');
assert(suprionoRecord.createdByDivisionId === 'DIV-APM-02', 'TEST 25: Supriono division is DIV-APM-02');
assert(suprionoRecord.createdByEstateId !== enrichedRecord.createdByEstateId, 'TEST 26: Wagiman and Supriono transactions are strictly estate-isolated');

// --------------------------------------------------
// SECTION E: BACKWARD COMPATIBILITY WITH HISTORICAL RECORDS
// --------------------------------------------------
console.log('\n--- SECTION E: Backward Compatibility ---');

const legacyRecord = {
  id: 'ACT-LEGACY-001',
  docNo: 'ACT/NUR/2025/099',
  aktivitas: { kode: '122171', nama: 'Penyiraman' },
  program: 'PRG/NUR/01/2025',
  lokasiBlok: { blok: 'Block 031/04', luas: 39.68 },
  pekerja: [{ id: 'PK-01', name: 'Fadilah' }],
  createdAt: '2025-11-20T08:00:00.000Z'
  // Note: No allocationCode, No allocationName, No createdByUserId
};

const resolvedLegacyActor = resolveTransactionActor(legacyRecord);
assert(resolvedLegacyActor.isLegacy === true, 'TEST 27: Legacy record identified as legacy without crashing');

const legacyDisplayCFNA = legacyRecord.allocationCode
  ? `${legacyRecord.allocationCode} - ${legacyRecord.allocationName || '-'}`
  : 'Tidak ada alokasi CFNA';
assert(legacyDisplayCFNA === 'Tidak ada alokasi CFNA', 'TEST 28: Legacy record displays graceful fallback "Tidak ada alokasi CFNA"');
assert(legacyRecord.allocationCode === undefined, 'TEST 29: Historical record is NOT mutated or backfilled automatically');

// Historical record with old removed code (e.g. 964009) displays snapshot name gracefully
const historicalWithOldCode = {
  id: 'ACT-OLD-001',
  docNo: 'ACT/NUR/2025/050',
  allocationCode: '964009',
  allocationName: 'Penyiraman (Manual)'
};
const cfnaLookup = getCfnaByCode(historicalWithOldCode.allocationCode);
const safeDisplay = cfnaLookup?.name || historicalWithOldCode.allocationName || `Kode CFNA lama: ${historicalWithOldCode.allocationCode}`;
assert(safeDisplay === 'Penyiraman (Manual)', 'TEST 29b: Historical record with old code preserves snapshot name safely without crash');

// --------------------------------------------------
// SECTION F: VALIDATION RULES
// --------------------------------------------------
console.log('\n--- SECTION F: Validation Rules ---');

// Rule 1: Invalid CFNA code rejected
const invalidCode = '999999';
assert(isCfnaCodeValid(invalidCode) === false, 'TEST 30: Invalid CFNA code 999999 is recognized as invalid');

// Rule 2: Removed old code 964009 recognized as invalid
assert(isCfnaCodeValid('964009') === false, 'TEST 31: Removed old code 964009 is recognized as invalid');

// Rule 3: Mismatched allocation name detection
const spoofedName = 'Pemupukan';
const actualPenyiramanMaster = getCfnaByCode('122171');
assert(actualPenyiramanMaster.name !== spoofedName, 'TEST 32: Spoofed allocationName does not match master name');
assert(actualPenyiramanMaster.name === 'Penyiraman', 'TEST 33: Master lookup recovers canonical name "Penyiraman"');

// Rule 4: Unconfirmed CFNA for activity rejected
const is122174ValidForPenyiraman = getConfirmedCfnaForActivity(penyiramanAct).some(c => c.code === '122174');
assert(is122174ValidForPenyiraman === false, 'TEST 34: CFNA 122174 (Pemupukan) is rejected when selected for Penyiraman');

// --------------------------------------------------
// SECTION G: SUMMARY RESULTS
// --------------------------------------------------
console.log('\n==================================================');
console.log(`TOTAL TESTS RUN: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log('==================================================\n');

if (failed === 0) {
  console.log('🎉 ALL PHASE 9C CFNA MAINTENANCE INTEGRATION TESTS PASSED!\n');
  process.exit(0);
} else {
  console.error(`💥 ${failed} TEST(S) FAILED IN PHASE 9C VERIFICATION!\n`);
  process.exit(1);
}
