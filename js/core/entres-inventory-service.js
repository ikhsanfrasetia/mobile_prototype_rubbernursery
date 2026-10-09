/**
 * js/core/entres-inventory-service.js
 * Service Sentral Perhitungan Saldo Mata Entres & Alokasi FIFO
 * 
 * Business Rules:
 * 1. Saldo Perisai Klon = SUM(Topping.jumlahPerisai) - SUM(Grafting.jumlahMataEntres) - SUM(Regrafting.jumlahMataEntres) - SUM(Dispatch.jumlahMataEntresDikeluarkan)
 * 2. Process Order Konsumsi FIFO: GRAFTING -> REGRAFTING -> DISPATCH (PENGELUARAN MATA ENTRES)
 * 3. FIFO Source Selection: Batch Topping diurutkan createdAt ASC (fallback docNo ASC)
 * 4. Immutability: Topping.jumlahPerisai adalah historical harvest quantity (tidak pernah di-overwrite)
 * 5. Single Source of Truth: Kalkulasi deterministik on-the-fly berbasis storage
 * 6. Zero Heuristic Ratio: Pengurangan stok murni dari jumlahMataEntresDikeluarkan, bukan perkalian Batang.
 */

import { storage } from './storage.js';
import { normalizeKlonName } from '../data/klon-master.js';
import { resolveUserContext, ROLES, isScopeEstate, normalizeRole } from './user-context.js';
import { matchActor } from '../modules/verification/mantri-confirmation-service.js';

/**
 * Normalisasi string nama klon untuk perbandingan deterministik
 * @param {string} klonName
 * @returns {string}
 */
export function canonicalKlon(klonName) {
  if (!klonName || typeof klonName !== 'string') return '';
  const norm = normalizeKlonName(klonName);
  return (norm || klonName).trim().toUpperCase();
}

/**
 * Helper untuk pencocokan ID/kode Estate
 */
export function matchEstate(targetEstate, currentEstate) {
  if (!targetEstate || !currentEstate) return false;
  const cleanTarget = String(targetEstate).trim().toUpperCase().replace(/^EST-/, '');
  const cleanCurrent = String(currentEstate).trim().toUpperCase().replace(/^EST-/, '');
  return cleanTarget === cleanCurrent;
}

/**
 * Helper filter transaksi inventori berdasarkan konteks user aktif dan scope role
 * @param {Array<Object>} transactions
 * @param {Object} [userContext]
 * @param {string} [estateIdFilter]
 * @returns {Array<Object>}
 */
export function filterTransactionsByContext(transactions, userContext = null, estateIdFilter = null) {
  if (!Array.isArray(transactions)) return [];
  if (!userContext && !estateIdFilter) return transactions;

  const ctx = userContext ? resolveUserContext(userContext) : null;
  const normalizedRole = ctx ? normalizeRole(ctx.role || ctx.rawRole) : null;
  const effectiveEstateId = estateIdFilter || ctx?.estateId || null;

  return transactions.filter(t => {
    if (!t) return false;

    if (ctx) {
      // Role operasional (Mantri): isolasi personal menggunakan matchActor
      if (normalizedRole === ROLES.MANTRI_TANAMAN || normalizedRole === 'MANTRI_BIBITAN') {
        return matchActor(t, ctx);
      }

      // Role manajerial (Pengurus, Askep, Asisten Bibitan, KTU, Tekniker): isolasi per Estate
      if (isScopeEstate(ctx) || ctx.scopeType === 'ESTATE' || normalizedRole === ROLES.ASISTEN_BIBITAN || normalizedRole === ROLES.ASISTEN) {
        const tEstate = t.createdByEstateId || t.estateId || t.estateCode;
        if (tEstate && ctx.estateId) {
          return matchEstate(tEstate, ctx.estateId);
        }
        return matchActor(t, ctx);
      }
    }

    if (effectiveEstateId) {
      const tEstate = t.createdByEstateId || t.estateId || t.estateCode;
      return matchEstate(tEstate, effectiveEstateId);
    }

    return true;
  });
}

/**
 * Mengambil dan mengurutkan seluruh transaksi Topping untuk klon tertentu secara FIFO (createdAt ASC, fallback docNo ASC)
 * @param {string} klonKey
 * @param {Array<Object>} [toppingTxs=null]
 * @param {Object} [options={}]
 * @returns {Array<Object>}
 */
export function getSortedToppingSources(klonKey, toppingTxs = null, options = {}) {
  const rawTxs = toppingTxs || storage.get('entres_topping_transactions', []);
  const userCtx = options.userContext || options.user || null;
  const txs = filterTransactionsByContext(rawTxs, userCtx, options.estateId);
  const targetKey = canonicalKlon(klonKey);

  return txs
    .filter(t => {
      if (!t || t.status === 'VOID') return false;
      if (canonicalKlon(t.namaKlon) !== targetKey) return false;
      return true;
    })
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB && !isNaN(timeA) && !isNaN(timeB) && timeA > 0 && timeB > 0) {
        return timeA - timeB;
      }
      const docA = String(a.docNo || '');
      const docB = String(b.docNo || '');
      return docA.localeCompare(docB, undefined, { numeric: true, sensitivity: 'base' });
    });
}

/**
 * Menghitung rincian alokasi FIFO dan saldo Mata Entres per klon
 * @param {string} klonName
 * @param {Object} [options={}] - { excludeBuddingDocNo?: string, excludeToppingDocNo?: string, excludeDispatchDocNo?: string, estateId?: string, userContext?: Object }
 * @returns {Object}
 */
export function getFifoAllocationBreakdown(klonName, options = {}) {
  const targetKey = canonicalKlon(klonName);
  if (!targetKey) {
    return {
      klonName: '',
      totalPanenTopping: 0,
      totalPakaiGrafting: 0,
      totalPakaiRegrafting: 0,
      totalPakaiDispatch: 0,
      totalKonsumsi: 0,
      saldoMataEntres: 0,
      saldoSetelahGrafting: 0,
      isAvailable: false,
      sources: []
    };
  }

  const userCtx = options.userContext || options.user || null;
  const rawToppings = storage.get('entres_topping_transactions', []);
  const rawBuddings = storage.get('budding_transactions', []);
  const rawDispatches = storage.get('dispatch_transactions', []);

  const allToppings = filterTransactionsByContext(rawToppings, userCtx, options.estateId);
  const allBuddings = filterTransactionsByContext(rawBuddings, userCtx, options.estateId);
  const allDispatches = filterTransactionsByContext(rawDispatches, userCtx, options.estateId);

  const excludeBudDoc = options.excludeBuddingDocNo || null;
  const excludeTopDoc = options.excludeToppingDocNo || null;
  const excludeDspDoc = options.excludeDispatchDocNo || null;

  // 1. Ambil Topping sources
  const toppingList = allToppings
    .filter(t => {
      if (!t || t.status === 'VOID') return false;
      if (canonicalKlon(t.namaKlon) !== targetKey) return false;
      if (excludeTopDoc && t.docNo === excludeTopDoc) return false;
      return true;
    })
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeA !== timeB && !isNaN(timeA) && !isNaN(timeB) && timeA > 0 && timeB > 0) {
        return timeA - timeB;
      }
      return String(a.docNo || '').localeCompare(String(b.docNo || ''), undefined, { numeric: true, sensitivity: 'base' });
    });

  // 2. Inisialisasi state source Topping (immutable original harvest)
  const sources = toppingList.map(t => {
    const harvestQty = parseInt(t.jumlahPerisai || 0, 10) || 0;
    return {
      docNo: t.docNo,
      kodePlot: t.kodePlot || '',
      namaKlon: t.namaKlon || klonName,
      tanggal: t.tanggal || '',
      createdAt: t.createdAt || '',
      estateId: t.estateId || '',
      originalHarvestQty: harvestQty,
      consumedGrafting: 0,
      consumedRegrafting: 0,
      consumedDispatch: 0,
      totalConsumed: 0,
      remainingQty: harvestQty
    };
  });

  const totalPanenTopping = sources.reduce((acc, s) => acc + s.originalHarvestQty, 0);

  // 3. Ambil transaksi Okulasi aktif untuk klon ini (dipisahkan Grafting vs Regrafting)
  const relevantBuddings = allBuddings.filter(b => {
    if (!b || b.status === 'VOID') return false;
    if (canonicalKlon(b.klonEntres || b.klon || b.namaKlon || b.klonName) !== targetKey) return false;
    if (excludeBudDoc && b.docNo === excludeBudDoc) return false;
    if (estateIdFilter && !matchEstate(b.estateId || b.estateCode, estateIdFilter)) return false;
    return true;
  });

  const graftingTxs = relevantBuddings.filter(b => b.type === 'GRAFTING' || !b.type);
  const regraftingTxs = relevantBuddings.filter(b => b.type === 'REGRAFTING');

  // STEP 4: Alokasikan GRAFTING terlebih dahulu ke source Topping secara FIFO
  let totalPakaiGrafting = 0;
  for (const gTx of graftingTxs) {
    const perisaiUsed = parseInt(gTx.jumlahMataEntres !== undefined && gTx.jumlahMataEntres !== null ? gTx.jumlahMataEntres : (gTx.jumlah || 0), 10) || 0;
    totalPakaiGrafting += perisaiUsed;

    let demand = perisaiUsed;
    for (const src of sources) {
      if (demand <= 0) break;
      const availableInSrc = src.originalHarvestQty - src.totalConsumed;
      if (availableInSrc > 0) {
        const take = Math.min(availableInSrc, demand);
        src.consumedGrafting += take;
        src.totalConsumed += take;
        src.remainingQty = src.originalHarvestQty - src.totalConsumed;
        demand -= take;
      }
    }
  }

  const saldoSetelahGrafting = Math.max(0, totalPanenTopping - totalPakaiGrafting);

  // STEP 5: Alokasikan REGRAFTING dari sisa source Topping secara FIFO
  let totalPakaiRegrafting = 0;
  for (const rTx of regraftingTxs) {
    const perisaiUsed = parseInt(rTx.jumlahMataEntres !== undefined && rTx.jumlahMataEntres !== null ? rTx.jumlahMataEntres : (rTx.jumlah || 0), 10) || 0;
    totalPakaiRegrafting += perisaiUsed;

    let demand = perisaiUsed;
    for (const src of sources) {
      if (demand <= 0) break;
      const availableInSrc = src.originalHarvestQty - src.totalConsumed;
      if (availableInSrc > 0) {
        const take = Math.min(availableInSrc, demand);
        src.consumedRegrafting += take;
        src.totalConsumed += take;
        src.remainingQty = src.originalHarvestQty - src.totalConsumed;
        demand -= take;
      }
    }
  }

  // STEP 6: Alokasikan DISPATCH (Pengeluaran Mata Entres Antarkebun) dari sisa source Topping secara FIFO
  const relevantDispatches = allDispatches.filter(d => {
    if (!d || d.status === 'VOID') return false;
    const isMataEntres = d.type === 'MATA_ENTRES' || d.transactionType === 'PENGELUARAN_MATA_ENTRES';
    if (!isMataEntres) return false;
    const dKlon = d.details?.[0]?.klon || d.klon || d.klonName || '';
    if (canonicalKlon(dKlon) !== targetKey) return false;
    if (excludeDspDoc && (d.docNo === excludeDspDoc || d.dispatchNo === excludeDspDoc)) return false;
    return true;
  });

  let totalPakaiDispatch = 0;
  for (const dTx of relevantDispatches) {
    const mataUsed = parseInt(
      dTx.jumlahMataEntresDikeluarkan !== undefined && dTx.jumlahMataEntresDikeluarkan !== null
        ? dTx.jumlahMataEntresDikeluarkan
        : (dTx.details?.[0]?.mataQty || 0),
      10
    ) || 0;
    totalPakaiDispatch += mataUsed;

    let demand = mataUsed;
    for (const src of sources) {
      if (demand <= 0) break;
      const availableInSrc = src.originalHarvestQty - src.totalConsumed;
      if (availableInSrc > 0) {
        const take = Math.min(availableInSrc, demand);
        src.consumedDispatch += take;
        src.totalConsumed += take;
        src.remainingQty = src.originalHarvestQty - src.totalConsumed;
        demand -= take;
      }
    }
  }

  const sourcesWithAliases = sources.map(s => ({
    ...s,
    allocatedGrafting: s.consumedGrafting,
    allocatedRegrafting: s.consumedRegrafting,
    allocatedDispatch: s.consumedDispatch,
    remaining: s.remainingQty
  }));

  const totalKonsumsi = totalPakaiGrafting + totalPakaiRegrafting + totalPakaiDispatch;
  const saldoMataEntres = totalPanenTopping - totalKonsumsi;

  return {
    klonName: normalizeKlonName(klonName) || klonName,
    namaKlon: normalizeKlonName(klonName) || klonName,
    canonicalKey: targetKey,
    totalPanenTopping,
    totalPakaiGrafting,
    totalPakaiRegrafting,
    totalPakaiDispatch,
    totalKonsumsi,
    saldoSetelahGrafting,
    saldoMataEntres,
    finalBalance: saldoMataEntres,
    isAvailable: saldoMataEntres > 0,
    sources: sourcesWithAliases
  };
}

/**
 * Mengambil ringkasan saldo seluruh klon yang memiliki riwayat Topping, Okulasi, atau Dispatch
 * @param {Object} [options={}] - { estateId?: string, userContext?: Object }
 * @returns {Array<Object>}
 */
export function getMataEntresBalances(options = {}) {
  const userCtx = options.userContext || options.user || null;
  const rawToppings = storage.get('entres_topping_transactions', []);
  const rawBuddings = storage.get('budding_transactions', []);
  const rawDispatches = storage.get('dispatch_transactions', []);

  const allToppings = filterTransactionsByContext(rawToppings, userCtx, options.estateId);
  const allBuddings = filterTransactionsByContext(rawBuddings, userCtx, options.estateId);
  const allDispatches = filterTransactionsByContext(rawDispatches, userCtx, options.estateId);

  const klonSet = new Set();

  allToppings.forEach(t => {
    if (t && (t.namaKlon || t.klonName || t.klon)) {
      klonSet.add(normalizeKlonName(t.namaKlon || t.klonName || t.klon));
    }
  });

  allBuddings.forEach(b => {
    if (b && (b.klonEntres || b.klon || b.namaKlon || b.klonName)) {
      klonSet.add(normalizeKlonName(b.klonEntres || b.klon || b.namaKlon || b.klonName));
    }
  });

  allDispatches.forEach(d => {
    const isMataEntres = d && (d.type === 'MATA_ENTRES' || d.transactionType === 'PENGELUARAN_MATA_ENTRES');
    if (isMataEntres) {
      const dKlon = d.details?.[0]?.klon || d.klon || d.klonName;
      if (dKlon) klonSet.add(normalizeKlonName(dKlon));
    }
  });

  const list = [];
  klonSet.forEach(k => {
    if (k) {
      const summary = getFifoAllocationBreakdown(k, options);
      list.push(summary);
    }
  });

  return list.sort((a, b) => a.klonName.localeCompare(b.klonName));
}

/**
 * Mengambil daftar klon yang memiliki saldo Mata Entres > 0 untuk pilihan Okulasi
 * @param {Object} [options={}] - { isRegrafting?: boolean, includeKlon?: string, editingDocNo?: string, estateId?: string }
 * @returns {Array<Object>}
 */
export function getAvailableKlonsForOkulasi(options = {}) {
  const allBalances = getMataEntresBalances(options);
  const includeKlonKey = options.includeKlon ? canonicalKlon(options.includeKlon) : null;
  const editingDocNo = options.editingDocNo || null;

  return allBalances
    .map(b => {
      // Jika ada editingDocNo, hitung ulang ketersediaan dengan mengecualikan dokumen yang sedang diedit
      if (editingDocNo) {
        const custom = getFifoAllocationBreakdown(b.klonName, { ...options, excludeBuddingDocNo: editingDocNo });
        return {
          ...b,
          namaKlon: b.klonName,
          saldoMataEntres: custom.saldoMataEntres,
          finalBalance: custom.saldoMataEntres,
          isAvailable: custom.saldoMataEntres > 0
        };
      }
      return {
        ...b,
        namaKlon: b.klonName
      };
    })
    .filter(b => b.saldoMataEntres > 0 || (includeKlonKey && canonicalKlon(b.klonName) === includeKlonKey));
}

/**
 * Mengambil saldo spesifik untuk satu klon
 * @param {string} klonName
 * @param {Object} [options={}] - { excludeBuddingDocNo?: string, excludeToppingDocNo?: string }
 * @returns {Object} breakdown object with .saldoMataEntres, .totalPanenTopping, etc.
 */
export function getKlonMataEntresBalance(klonName, options = {}) {
  return getFifoAllocationBreakdown(klonName, options);
}

/**
 * Validasi apakah permintaan konsumsi perisai untuk klon valid dan mencukupi
 * @param {string} klonName
 * @param {number} requestedPerisai
 * @param {string} [editingDocNo=null]
 * @param {boolean} [isRegrafting=false]
 * @returns {{ valid: boolean, message: string, availableBalance: number, totalPanen: number, currentConsumption: number }}
 */
export function validateOkulasiPerisaiUsage(klonName, requestedPerisai, editingDocNo = null, isRegrafting = false) {
  const reqQty = parseInt(requestedPerisai || 0, 10);
  if (isNaN(reqQty) || reqQty <= 0) {
    return {
      valid: false,
      message: 'Jumlah Mata Entres yang digunakan harus lebih dari 0.',
      availableBalance: 0,
      totalPanen: 0,
      currentConsumption: 0
    };
  }

  const breakdown = getFifoAllocationBreakdown(klonName, { excludeBuddingDocNo: editingDocNo });
  const available = breakdown.saldoMataEntres;

  if (available <= 0) {
    return {
      valid: false,
      message: `Stok Mata Entres untuk klon ${breakdown.klonName} tidak tersedia (Saldo: 0 Perisai).`,
      availableBalance: available,
      totalPanen: breakdown.totalPanenTopping,
      currentConsumption: breakdown.totalKonsumsi
    };
  }

  if (reqQty > available) {
    const stageLabel = isRegrafting ? 'Okulasi Janda (Regrafting)' : 'Okulasi (Grafting)';
    return {
      valid: false,
      message: `Jumlah Mata Entres untuk ${stageLabel} (${reqQty.toLocaleString('id-ID')} Perisai) melebihi saldo panen Topping yang tersedia (${available.toLocaleString('id-ID')} Perisai) untuk klon ${breakdown.klonName}.`,
      availableBalance: available,
      totalPanen: breakdown.totalPanenTopping,
      currentConsumption: breakdown.totalKonsumsi
    };
  }

  return {
    valid: true,
    message: 'Valid',
    availableBalance: available,
    totalPanen: breakdown.totalPanenTopping,
    currentConsumption: breakdown.totalKonsumsi
  };
}

/**
 * Memeriksa apakah transaksi Topping aman untuk dihapus tanpa menyebabkan defisit konsumsi okulasi
 * @param {string} toppingDocNo
 * @returns {{ canDelete: boolean, valid: boolean, message: string, deficitQty: number }}
 */
export function validateToppingDeletion(toppingDocNo) {
  const allToppings = storage.get('entres_topping_transactions', []);
  const targetTop = allToppings.find(t => t && t.docNo === toppingDocNo);
  if (!targetTop) {
    return { canDelete: true, valid: true, message: 'OK', deficitQty: 0 };
  }

  const klon = targetTop.namaKlon;
  const breakdownWithout = getFifoAllocationBreakdown(klon, { excludeToppingDocNo: toppingDocNo });

  if (breakdownWithout.saldoMataEntres < 0) {
    const deficit = Math.abs(breakdownWithout.saldoMataEntres);
    return {
      canDelete: false,
      valid: false,
      message: `Transaksi Topping ${toppingDocNo} tidak dapat dihapus karena hasil panennya sudah terpakai pada kegiatan Okulasi (Defisit: ${deficit.toLocaleString('id-ID')} Perisai).`,
      deficitQty: deficit
    };
  }

  return { canDelete: true, valid: true, message: 'OK', deficitQty: 0 };
}

/**
 * Memeriksa apakah update transaksi Topping aman tanpa menyebabkan defisit konsumsi
 * @param {string} toppingDocNo
 * @param {number} newJumlahPerisai
 * @returns {{ canUpdate: boolean, valid: boolean, message: string, deficitQty: number, requiredMinHarvest: number }}
 */
export function validateToppingUpdate(toppingDocNo, newJumlahPerisai) {
  const allToppings = storage.get('entres_topping_transactions', []);
  const targetTop = allToppings.find(t => t && t.docNo === toppingDocNo);
  if (!targetTop) {
    return { canUpdate: true, valid: true, message: 'OK', deficitQty: 0, requiredMinHarvest: 0 };
  }

  const klon = targetTop.namaKlon;
  const breakdownWithout = getFifoAllocationBreakdown(klon, { excludeToppingDocNo: toppingDocNo });
  const simulatedTotalPanen = breakdownWithout.totalPanenTopping + (parseInt(newJumlahPerisai, 10) || 0);
  const simulatedSaldo = simulatedTotalPanen - breakdownWithout.totalKonsumsi;
  const requiredMin = Math.max(0, breakdownWithout.totalKonsumsi - breakdownWithout.totalPanenTopping);

  if (simulatedSaldo < 0) {
    const deficit = Math.abs(simulatedSaldo);
    return {
      canUpdate: false,
      valid: false,
      message: `Perubahan jumlah perisai Topping tidak dapat disimpan karena menyebabkan total panen lebih kecil dari total okulasi yang sudah berjalan (Defisit: ${deficit.toLocaleString('id-ID')} Perisai).`,
      deficitQty: deficit,
      requiredMinHarvest: requiredMin
    };
  }

  return { canUpdate: true, valid: true, message: 'OK', deficitQty: 0, requiredMinHarvest: requiredMin };
}
