/**
 * modules/entres/entres-stock-detail.js — Halaman Detail Stok Klon (Read-Only Inventory Detail)
 * Menampilkan ringkasan saldo klon, ringkasan mutasi (Topping, Okulasi, Regrafting),
 * dan riwayat mutasi stok kronologis.
 * Sumber data: Single Source of Truth dari entres-inventory-service.js & storage transactions.
 */

import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { getFifoAllocationBreakdown, canonicalKlon } from '../../core/entres-inventory-service.js';
import { esc } from '../../core/utils.js';

function formatDisplayDate(rawDate) {
  if (!rawDate) return '-';
  if (typeof rawDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
    const parts = rawDate.substring(0, 10).split('-');
    const bulanNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const bIdx = parseInt(parts[1], 10) - 1;
    return `${parseInt(parts[2], 10)} ${bulanNames[bIdx] || parts[1]} ${parts[0]}`;
  }
  if (typeof rawDate === 'string' && /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(rawDate)) {
    const parts = rawDate.split(/[\/\-]/);
    const bulanNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const bIdx = parseInt(parts[1], 10) - 1;
    return `${parseInt(parts[0], 10)} ${bulanNames[bIdx] || parts[1]} ${parts[2]}`;
  }
  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const bulanNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${d.getDate()} ${bulanNames[d.getMonth()]} ${d.getFullYear()}`;
    }
  } catch (e) { /* ignore */ }
  return String(rawDate);
}

export function renderEntresStockDetail() {
  const app = document.getElementById('app');
  if (!app) return;

  // 1. Ekstrak query param klon dari hash URL (e.g. #/entres/stock/detail?klon=GT%201)
  const hash = window.location.hash || '';
  const queryIndex = hash.indexOf('?');
  const params = new URLSearchParams(queryIndex !== -1 ? hash.substring(queryIndex) : '');
  const klonName = params.get('klon') || 'GT 1';

  // 2. Ambil data breakdown saldo dari existing service
  const breakdown = getFifoAllocationBreakdown(klonName);
  const targetKey = canonicalKlon(klonName);

  // 3. Ambil data mutasi individual secara read-only dari storage
  const allToppings = storage.get('entres_topping_transactions', []);
  const allBuddings = storage.get('budding_transactions', []);

  // Filter Topping untuk klon ini (status !== 'VOID')
  const klonToppings = allToppings.filter(t => 
    t && t.status !== 'VOID' && canonicalKlon(t.namaKlon || t.klonName || t.klon) === targetKey
  );

  // Filter Budding (Okulasi / Regrafting) untuk klon ini (status !== 'VOID')
  const klonBuddings = allBuddings.filter(b => 
    b && b.status !== 'VOID' && canonicalKlon(b.klonEntres || b.klon || b.namaKlon || b.klonName) === targetKey
  );

  // Satukan mutasi ke dalam satu array kronologis
  const mutations = [
    ...klonToppings.map(t => ({
      type: 'TOPPING',
      label: 'Topping',
      isIncome: true,
      qty: parseInt(t.jumlahPerisai || 0, 10),
      date: t.tanggal || t.createdAt,
      createdAt: t.createdAt || t.tanggal || '',
      docNo: t.docNo || ''
    })),
    ...klonBuddings.map(b => {
      const isRegrafting = (b.type || '').toUpperCase() === 'REGRAFTING';
      const usedQty = parseInt(b.jumlahMataEntres !== undefined && b.jumlahMataEntres !== null ? b.jumlahMataEntres : (b.jumlah || 0), 10);
      return {
        type: isRegrafting ? 'REGRAFTING' : 'OKULASI',
        label: isRegrafting ? 'Regrafting' : 'Okulasi',
        isIncome: false,
        qty: usedQty,
        date: b.tanggal || b.createdAt,
        createdAt: b.createdAt || b.tanggal || '',
        docNo: b.docNo || ''
      };
    })
  ].sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    if (timeA !== timeB && !isNaN(timeA) && !isNaN(timeB) && timeA > 0 && timeB > 0) {
      return timeB - timeA; // Newest first
    }
    return String(b.date || '').localeCompare(String(a.date || ''));
  });

  app.innerHTML = `
    <div class="page entres-stock-detail-page" style="display: flex; flex-direction: column; height: 100%; min-height: 0; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; position: relative;">
      
      <!-- HEADER (Fixed 56px) -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <button id="btn-detail-back" type="button" aria-label="Kembali ke Stok Mata Entres" style="background: transparent; border: none; padding: 6px; margin-left: -6px; color: #116834; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 800; color: #0F172A; margin: 0; line-height: 1.2;">Detail Stok Klon</h1>
        </div>
        <button id="btn-detail-refresh" type="button" aria-label="Segarkan Data" style="background: transparent; border: none; padding: 6px; margin-right: -6px; color: #116834; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
      </header>

      <!-- MAIN CONTENT (Scrollable) -->
      <main style="flex: 1; min-height: 0; overflow-y: auto; padding: 14px 16px 20px; display: flex; flex-direction: column; gap: 14px;">
        
        <!-- CARD 1 — KLON SUMMARY (Hijau Soft) -->
        <div style="background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 12px; padding: 16px 18px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
          <div style="font-size: 1.15rem; font-weight: 900; color: #0F172A; line-height: 1.2;">
            ${esc(breakdown.klonName || klonName)}
          </div>
          <div style="font-size: 0.74rem; color: #64748B; margin-top: 2px;">
            Stok Mata Entres
          </div>

          <div style="font-size: 2.1rem; font-weight: 900; color: #15803D; margin-top: 10px; line-height: 1; letter-spacing: -0.5px;">
            ${(breakdown.saldoMataEntres || 0).toLocaleString('id-ID')}
          </div>
          <div style="font-size: 0.75rem; color: #64748B; margin-top: 6px;">
            Mata entres tersedia
          </div>
        </div>

        <!-- SECTION 2 — RINGKASAN MUTASI (3 Cards) -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 0.88rem; font-weight: 800; color: #0F172A;">
            Ringkasan Mutasi
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
            <!-- Masuk (Topping) -->
            <div style="background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 10px; padding: 12px 8px; text-align: center; display: flex; flex-direction: column; justify-content: center;">
              <div style="font-size: 1rem; font-weight: 800; color: #15803D; line-height: 1.2;">
                ${(breakdown.totalPanenTopping || 0).toLocaleString('id-ID')}
              </div>
              <div style="font-size: 0.68rem; color: #64748B; margin-top: 4px; line-height: 1.3;">
                Masuk<br>(Topping)
              </div>
            </div>

            <!-- Dipakai (Okulasi) -->
            <div style="background: #FEF2F2; border: 1px solid #FEE2E2; border-radius: 10px; padding: 12px 8px; text-align: center; display: flex; flex-direction: column; justify-content: center;">
              <div style="font-size: 1rem; font-weight: 800; color: #DC2626; line-height: 1.2;">
                ${(breakdown.totalPakaiGrafting || 0).toLocaleString('id-ID')}
              </div>
              <div style="font-size: 0.68rem; color: #64748B; margin-top: 4px; line-height: 1.3;">
                Dipakai<br>(Okulasi)
              </div>
            </div>

            <!-- Dipakai (Regrafting) -->
            <div style="background: #FEF2F2; border: 1px solid #FEE2E2; border-radius: 10px; padding: 12px 8px; text-align: center; display: flex; flex-direction: column; justify-content: center;">
              <div style="font-size: 1rem; font-weight: 800; color: #DC2626; line-height: 1.2;">
                ${(breakdown.totalPakaiRegrafting || 0).toLocaleString('id-ID')}
              </div>
              <div style="font-size: 0.68rem; color: #64748B; margin-top: 4px; line-height: 1.3;">
                Dipakai<br>(Regrafting)
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 3 — RIWAYAT MUTASI STOK -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 4px;">
          <div style="font-size: 0.88rem; font-weight: 800; color: #0F172A;">
            Riwayat Mutasi Stok
          </div>

          ${mutations.length === 0 ? `
            <div style="background: #FFFFFF; border: 1px dashed #CBD5E1; border-radius: 10px; padding: 20px 16px; text-align: center; color: #64748B; font-size: 0.78rem;">
              Belum ada riwayat mutasi untuk klon ini.
            </div>
          ` : `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${mutations.map(m => {
                const isTopping = m.isIncome;
                return `
                  <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                    <!-- LEFT ICON + TITLE & DATE -->
                    <div style="display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1;">
                      <div style="width: 32px; height: 32px; border-radius: 50%; background: ${isTopping ? '#F0FDF4' : '#FEF2F2'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        ${isTopping ? `
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#15803D" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 19V6"></path>
                            <path d="M12 11c3 0 7-2 8-5-4-1-7 2-8 5z"></path>
                            <path d="M12 14c-3 0-7-2-8-5 4-1 7 2 8 5z"></path>
                          </svg>
                        ` : `
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#DC2626" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="9"></circle>
                            <line x1="8" y1="12" x2="16" y2="12"></line>
                          </svg>
                        `}
                      </div>

                      <div style="min-width: 0; flex: 1;">
                        <div style="font-size: 0.84rem; font-weight: 800; color: #0F172A; line-height: 1.25;">
                          ${esc(m.label)}
                        </div>
                        <div style="font-size: 0.70rem; color: #64748B; margin-top: 2px;">
                          ${formatDisplayDate(m.date)}
                        </div>
                      </div>
                    </div>

                    <!-- RIGHT AMOUNT -->
                    <div style="text-align: right; flex-shrink: 0; margin-left: 8px;">
                      <div style="font-size: 0.86rem; font-weight: 800; color: ${isTopping ? '#15803D' : '#DC2626'};">
                        ${isTopping ? '+ ' : '- '}${m.qty.toLocaleString('id-ID')}
                      </div>
                      <div style="font-size: 0.68rem; color: #64748B; margin-top: 1px;">
                        Mata Entres
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- SECTION 4 — BOTTOM INFO BANNER -->
        <div style="display: flex; align-items: flex-start; gap: 8px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; margin-top: 4px;">
          <div style="width: 18px; height: 18px; border-radius: 50%; background: #64748B; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; flex-shrink: 0; margin-top: 1px;">
            i
          </div>
          <div style="font-size: 0.72rem; color: #475569; line-height: 1.4;">
            Saldo saat ini adalah hasil akumulasi Topping dikurangi pemakaian pada Okulasi dan Regrafting.
          </div>
        </div>

      </main>
    </div>
  `;

  // Attach Event Listeners
  app.querySelector('#btn-detail-back')?.addEventListener('click', () => {
    navigate('/entres/stock');
  });

  app.querySelector('#btn-detail-refresh')?.addEventListener('click', () => {
    renderEntresStockDetail();
  });
}
