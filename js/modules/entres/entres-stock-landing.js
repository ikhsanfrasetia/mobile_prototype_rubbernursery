/**
 * modules/entres/entres-stock-landing.js — Halaman Stok Mata Entres (Read-Only Inventory)
 * Menampilkan ringkasan total stok mata entres, jumlah klon tersedia, dan daftar saldo per klon.
 * Sumber data: Single Source of Truth dari entres-inventory-service.js
 */

import { navigate } from '../../core/router.js';
import { getMataEntresBalances } from '../../core/entres-inventory-service.js';
import { esc } from '../../core/utils.js';

export function renderEntresStockLanding() {
  const app = document.getElementById('app');
  if (!app) return;

  // 1. Ambil data saldo inventori dari existing service
  const allBalances = getMataEntresBalances();

  // Hitung total agregat stok dan klon tersedia
  const totalMataEntres = allBalances.reduce((acc, b) => acc + (b.saldoMataEntres || 0), 0);
  const availableKlonsCount = allBalances.filter(b => (b.saldoMataEntres || 0) > 0).length;
  const totalKlonsCount = allBalances.length;

  let searchQuery = '';

  const renderContent = () => {
    const query = searchQuery.trim().toUpperCase();
    const filteredBalances = query
      ? allBalances.filter(b => (b.klonName || '').toUpperCase().includes(query))
      : allBalances;

    app.innerHTML = `
      <div class="page entres-stock-landing-page" style="display: flex; flex-direction: column; height: 100%; min-height: 0; background: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; position: relative;">
        
        <!-- HEADER (Fixed 56px) -->
        <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <button id="btn-stock-back" type="button" aria-label="Kembali ke Kebun Entres" style="background: transparent; border: none; padding: 6px; margin-left: -6px; color: #116834; cursor: pointer; display: flex; align-items: center; justify-content: center;">
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.3" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <h1 style="font-size: 1.05rem; font-weight: 800; color: #0F172A; margin: 0; line-height: 1.2;">Stok Mata Entres</h1>
          </div>
          <button id="btn-stock-refresh" type="button" aria-label="Segarkan Data" style="background: transparent; border: none; padding: 6px; margin-right: -6px; color: #116834; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </header>

        <!-- MAIN CONTENT (Scrollable) -->
        <main style="flex: 1; min-height: 0; overflow-y: auto; padding: 14px 16px 20px; display: flex; flex-direction: column; gap: 14px;">
          
          <!-- BAGIAN 1 — SUMMARY CARD (Hijau Soft) -->
          <div style="background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 12px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
            <div style="font-size: 0.84rem; font-weight: 700; color: #15803D; margin-bottom: 8px;">
              Total Stok Mata Entres
            </div>
            <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;">
              <div>
                <div style="font-size: 1.75rem; font-weight: 900; color: #0F172A; line-height: 1.1; letter-spacing: -0.5px;">
                  ${totalMataEntres.toLocaleString('id-ID')}
                </div>
                <div style="font-size: 0.76rem; color: #64748B; margin-top: 4px;">
                  Mata entres
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 1.75rem; font-weight: 900; color: #0F172A; line-height: 1.1;">
                  ${availableKlonsCount}
                </div>
                <div style="font-size: 0.76rem; color: #64748B; margin-top: 4px;">
                  Klon tersedia
                </div>
              </div>
            </div>
          </div>

          <!-- BAGIAN 2 — INFORMASI SINGKAT -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 14px; font-size: 0.76rem; color: #64748B; line-height: 1.45;">
            Saldo berasal dari hasil Topping, setelah dikurangi pemakaian Okulasi dan Okulasi Janda.
          </div>

          <!-- BAGIAN 3 — DAFTAR STOK PER KLON -->
          <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 2px;">
            <div style="font-size: 0.92rem; font-weight: 800; color: #0F172A;">
              Stok per Klon
            </div>

            <!-- SEARCH BAR -->
            <div style="position: relative; width: 100%;">
              <input id="input-search-klon" type="text" placeholder="Cari klon..." value="${esc(searchQuery)}" style="width: 100%; height: 40px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 0 12px 0 36px; font-size: 0.82rem; color: #0F172A; box-sizing: border-box; outline: none; transition: border-color 0.15s ease;" />
              <div style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94A3B8; display: flex; align-items: center; pointer-events: none;">
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
            </div>

            <!-- KLON LIST -->
            ${filteredBalances.length === 0 ? `
              <div style="background: #FFFFFF; border: 1px dashed #CBD5E1; border-radius: 10px; padding: 24px 16px; text-align: center; color: #64748B;">
                <div style="font-size: 0.86rem; font-weight: 700; color: #334155; margin-bottom: 4px;">
                  ${query ? 'Klon tidak ditemukan' : 'Belum ada stok mata entres'}
                </div>
                <div style="font-size: 0.75rem; color: #94A3B8; line-height: 1.4;">
                  ${query ? `Tidak ada data klon yang cocok dengan "${esc(searchQuery)}".` : 'Belum ada hasil panen Topping untuk membentuk stok mata entres.'}
                </div>
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${filteredBalances.map(b => {
                  const saldo = b.saldoMataEntres || 0;
                  const isAvailable = saldo > 0;
                  return `
                    <div class="card-klon-item" data-klon="${esc(b.klonName)}" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; transition: all 0.15s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                      <div style="min-width: 0; flex: 1;">
                        <div style="font-size: 0.90rem; font-weight: 800; color: #0F172A; line-height: 1.25;">
                          ${esc(b.klonName)}
                        </div>
                        <div style="font-size: 0.72rem; color: #64748B; margin-top: 2px;">
                          Mata entres tersedia
                        </div>
                      </div>
                      <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                        <span style="font-size: 0.95rem; font-weight: 800; color: ${isAvailable ? '#15803D' : '#94A3B8'};">
                          ${saldo.toLocaleString('id-ID')}
                        </span>
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="#94A3B8" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}

          </div>

          <!-- BOTTOM INFO NOTE -->
          <div style="display: flex; align-items: flex-start; gap: 8px; background: #F0FDF4; border: 1px solid #DCFCE7; border-radius: 8px; padding: 10px 12px; margin-top: 4px;">
            <div style="width: 18px; height: 18px; border-radius: 50%; background: #15803D; color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; flex-shrink: 0; margin-top: 1px;">
              i
            </div>
            <div style="font-size: 0.72rem; color: #166534; line-height: 1.4;">
              Pilih salah satu klon untuk melihat detail mutasi stok.
            </div>
          </div>

        </main>
      </div>
    `;

    // Attach Event Listeners
    app.querySelector('#btn-stock-back')?.addEventListener('click', () => {
      navigate('/entres');
    });

    app.querySelector('#btn-stock-refresh')?.addEventListener('click', () => {
      renderEntresStockLanding();
    });

    const searchInput = app.querySelector('#input-search-klon');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderContent();
        const nextInput = app.querySelector('#input-search-klon');
        if (nextInput) {
          nextInput.focus();
          nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
        }
      });
    }

    app.querySelectorAll('.card-klon-item').forEach(card => {
      card.addEventListener('click', () => {
        const klon = card.getAttribute('data-klon');
        if (klon) {
          navigate(`/entres/stock/detail?klon=${encodeURIComponent(klon)}`);
        }
      });
    });
  };

  renderContent();
}
