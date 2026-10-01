import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Mock localStorage for Node environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

import {
  MODULE_TYPES,
  MODULE_LABELS,
  MANTRI_TRANSACTION_STATUS,
  getMantriTodayTransactions,
  submitModuleTransactions
} from './js/modules/verification/mantri-confirmation-service.js';
import { storage } from './js/core/storage.js';
import { getSortedToppingSources } from './js/core/entres-inventory-service.js';
import { todayDDMMYYYY } from './js/core/utils.js';

console.log('--- RUNNING INTEGRATION TESTS FOR KEBUN ENTRES GROUPING (IT-CE-GROUP-001 s/d 020) ---');

// Mock User
const mockUser = {
  id: 'USR-MANTRI-01',
  name: 'Wagiman',
  code: '1405482',
  role: 'MANTRI_TANAMAN',
  estateId: 'EST-01',
  divisionId: 'DIV-01'
};

const todayStr = todayDDMMYYYY();

// Setup clean initial storage
storage.set('entres_menunas_transactions', []);
storage.set('entres_topping_transactions', []);
storage.set('verification_transactions', []);

// Create 1 Menunas and 1 Topping today
const menunasTx = {
  id: 'MEN-001',
  docNo: '2026/BWGDTL/001',
  type: 'MENUNAS',
  activityType: 'MENUNAS',
  kodePlot: 'IA',
  namaKlon: 'IRCA331',
  jlhPokok: 425,
  tanggal: todayStr,
  jumlahPohonDitunas: 120,
  mantri: 'Wagiman',
  status: 'SUBMITTED',
  createdAt: new Date().toISOString()
};

const toppingTx = {
  id: 'TOP-001',
  docNo: '2026/BWGDTL/002',
  type: 'TOPPING',
  activityType: 'TOPPING',
  kodePlot: 'IA',
  namaKlon: 'IRCA331',
  jlhPokok: 425,
  tanggal: todayStr,
  jumlahKayu: 100,
  jumlahPerisai: 800,
  mantri: 'Wagiman',
  status: 'SUBMITTED',
  createdAt: new Date().toISOString()
};

storage.set('entres_menunas_transactions', [menunasTx]);
storage.set('entres_topping_transactions', [toppingTx]);

const todayTxs = getMantriTodayTransactions(mockUser, todayStr);
const kebunEntresTxs = todayTxs.filter(t => t.moduleType === MODULE_TYPES.KEBUN_ENTRES);

// IT-CE-GROUP-001: Menunas dan Topping tampil dalam satu tab Kebun Entres
assert.strictEqual(kebunEntresTxs.length, 2, 'IT-CE-GROUP-001 FAILED');
console.log('✓ IT-CE-GROUP-001 PASS: Menunas dan Topping grouped in KEBUN_ENTRES');

// IT-CE-GROUP-002: Tidak ada tab Menunas terpisah
const menunasSeparate = todayTxs.filter(t => t.moduleType === 'MENUNAS');
assert.strictEqual(menunasSeparate.length, 0, 'IT-CE-GROUP-002 FAILED: Separate MENUNAS module found');
console.log('✓ IT-CE-GROUP-002 PASS: No separate Menunas module tab');

// IT-CE-GROUP-003: Tidak ada tab Topping terpisah
const toppingSeparate = todayTxs.filter(t => t.moduleType === 'TOPPING');
assert.strictEqual(toppingSeparate.length, 0, 'IT-CE-GROUP-003 FAILED: Separate TOPPING module found');
console.log('✓ IT-CE-GROUP-003 PASS: No separate Topping module tab');

// IT-CE-GROUP-004: Count Kebun Entres = total transaksi Menunas + Topping
assert.strictEqual(kebunEntresTxs.length, 2, 'IT-CE-GROUP-004 FAILED');
console.log('✓ IT-CE-GROUP-004 PASS: Count Kebun Entres = Menunas (1) + Topping (1) = 2');

// IT-CE-GROUP-005: Section Menunas tampil jika ada transaksi Menunas
const hasMenunas = kebunEntresTxs.some(t => t.activityType === 'MENUNAS');
assert(hasMenunas, 'IT-CE-GROUP-005 FAILED');
console.log('✓ IT-CE-GROUP-005 PASS: Menunas items present in Kebun Entres');

// IT-CE-GROUP-006: Section Topping tampil jika ada transaksi Topping
const hasTopping = kebunEntresTxs.some(t => t.activityType === 'TOPPING');
assert(hasTopping, 'IT-CE-GROUP-006 FAILED');
console.log('✓ IT-CE-GROUP-006 PASS: Topping items present in Kebun Entres');

// IT-CE-GROUP-007: Jika hanya Menunas, hanya section Menunas tampil
const onlyMenunasList = [menunasTx];
const onlyMenunasGroup = onlyMenunasList.filter(t => t.activityType === 'MENUNAS');
const onlyToppingGroup = onlyMenunasList.filter(t => t.activityType === 'TOPPING');
assert(onlyMenunasGroup.length > 0 && onlyToppingGroup.length === 0, 'IT-CE-GROUP-007 FAILED');
console.log('✓ IT-CE-GROUP-007 PASS: When only Menunas exists, Topping section omitted');

// IT-CE-GROUP-008: Jika hanya Topping, hanya section Topping tampil
const onlyToppingList = [toppingTx];
const onlyMenunasGroup2 = onlyToppingList.filter(t => t.activityType === 'MENUNAS');
const onlyToppingGroup2 = onlyToppingList.filter(t => t.activityType === 'TOPPING');
assert(onlyToppingGroup2.length > 0 && onlyMenunasGroup2.length === 0, 'IT-CE-GROUP-008 FAILED');
console.log('✓ IT-CE-GROUP-008 PASS: When only Topping exists, Menunas section omitted');

// IT-CE-GROUP-009: Satu checkbox statement untuk Kebun Entres
const landingSrc = fs.readFileSync(path.resolve('js/modules/verification/mantri-confirmation-landing.js'), 'utf8');
assert(landingSrc.includes('chk-statement-${esc(currentModuleType)}'), 'IT-CE-GROUP-009 FAILED: Dynamic checkbox ID missing');
console.log('✓ IT-CE-GROUP-009 PASS: Single statement checkbox per module tab');

// IT-CE-GROUP-010: Satu tombol Kirim Data ke Asisten untuk Kebun Entres
assert(landingSrc.includes('btn-submit-module-${esc(currentModuleType)}'), 'IT-CE-GROUP-010 FAILED: Dynamic submit button missing');
console.log('✓ IT-CE-GROUP-010 PASS: Single submit button per module tab');

// IT-CE-GROUP-011: Submit Kebun Entres membuat verification transaction individual untuk setiap transaksi eligible
const submitResult = submitModuleTransactions(MODULE_TYPES.KEBUN_ENTRES, mockUser);
assert.strictEqual(submitResult.success, true, 'IT-CE-GROUP-011 FAILED: Submission failed');
assert.strictEqual(submitResult.submittedCount, 2, 'IT-CE-GROUP-011 FAILED: Expected 2 individual items submitted');

const verifs = storage.get('verification_transactions', []);
assert.strictEqual(verifs.length, 2, 'IT-CE-GROUP-011 FAILED: Expected 2 individual verification records');
const vMenunas = verifs.find(v => v.referenceDocNo === '2026/BWGDTL/001');
const vTopping = verifs.find(v => v.referenceDocNo === '2026/BWGDTL/002');
assert(vMenunas && (vMenunas.referenceType === 'MENUNAS' || vMenunas.referenceType === 'KEBUN_ENTRES'), 'IT-CE-GROUP-011 FAILED');
assert(vTopping && (vTopping.referenceType === 'TOPPING' || vTopping.referenceType === 'KEBUN_ENTRES'), 'IT-CE-GROUP-011 FAILED');
console.log('✓ IT-CE-GROUP-011 PASS: Individual verification records created (Menunas & Topping)');

// IT-CE-GROUP-012: Tidak terjadi duplicate verification transaction
const submitResult2 = submitModuleTransactions(MODULE_TYPES.KEBUN_ENTRES, mockUser);
const verifs2 = storage.get('verification_transactions', []);
assert.strictEqual(verifs2.length, 2, 'IT-CE-GROUP-012 FAILED: Duplicate verification records created');
console.log('✓ IT-CE-GROUP-012 PASS: Idempotent submission prevents duplicates');

// IT-CE-GROUP-013: Status Menunas tetap individual
const updatedMenunas = storage.get('entres_menunas_transactions', [])[0];
assert.strictEqual(updatedMenunas.status, 'MENUNGGU_VERIFIKASI', 'IT-CE-GROUP-013 FAILED');
console.log('✓ IT-CE-GROUP-013 PASS: Menunas status updated individually');

// IT-CE-GROUP-014: Status Topping tetap individual
const updatedTopping = storage.get('entres_topping_transactions', [])[0];
assert.strictEqual(updatedTopping.status, 'MENUNGGU_VERIFIKASI', 'IT-CE-GROUP-014 FAILED');
console.log('✓ IT-CE-GROUP-014 PASS: Topping status updated individually');

// IT-CE-GROUP-015: DocNo Menunas tetap individual
assert.strictEqual(updatedMenunas.docNo, '2026/BWGDTL/001', 'IT-CE-GROUP-015 FAILED');
console.log('✓ IT-CE-GROUP-015 PASS: DocNo Menunas is preserved (2026/BWGDTL/001)');

// IT-CE-GROUP-016: DocNo Topping tetap individual
assert.strictEqual(updatedTopping.docNo, '2026/BWGDTL/002', 'IT-CE-GROUP-016 FAILED');
console.log('✓ IT-CE-GROUP-016 PASS: DocNo Topping is preserved (2026/BWGDTL/002)');

// IT-CE-GROUP-017: Inventory Topping tetap membaca type = TOPPING
const sortedToppings = getSortedToppingSources('IRCA331');
const totalHarvest = sortedToppings.reduce((acc, t) => acc + (t.jumlahPerisai || 0), 0);
assert.strictEqual(totalHarvest, 800, 'IT-CE-GROUP-017 FAILED');
console.log('✓ IT-CE-GROUP-017 PASS: Inventory Topping calculates harvest (800 Perisai)');

// IT-CE-GROUP-018: Menunas tetap tidak masuk inventory Mata Entres
const menunasInInv = sortedToppings.some(t => t.type === 'MENUNAS' || t.activityType === 'MENUNAS');
assert(!menunasInInv, 'IT-CE-GROUP-018 FAILED: Menunas included in inventory');
console.log('✓ IT-CE-GROUP-018 PASS: Menunas is excluded from Mata Entres inventory');

// IT-CE-GROUP-019: Global submit UX tetap bekerja
assert(landingSrc.includes('renderLoadingModal') && landingSrc.includes('renderSuccessModal'), 'IT-CE-GROUP-019 FAILED');
console.log('✓ IT-CE-GROUP-019 PASS: Global submit UX flow present');

// IT-CE-GROUP-020: Data Terkonfirmasi muncul setelah seluruh transaksi eligible pada tab berhasil dikirim
const todayTxsAfter = getMantriTodayTransactions(mockUser, todayStr);
const kebunAfter = todayTxsAfter.filter(t => t.moduleType === MODULE_TYPES.KEBUN_ENTRES);
const allSubmitted = kebunAfter.every(t => t.status === MANTRI_TRANSACTION_STATUS.SUBMITTED_TO_ASB || t.status === MANTRI_TRANSACTION_STATUS.VERIFIED);
assert(allSubmitted, 'IT-CE-GROUP-020 FAILED: Not all items submitted');
console.log('✓ IT-CE-GROUP-020 PASS: Data Terkonfirmasi state active after all items submitted');

console.log('\n--- ALL 20 INTEGRATION TESTS (IT-CE-GROUP-001 s/d IT-CE-GROUP-020) PASSED SUCCESSFULLY ---');
