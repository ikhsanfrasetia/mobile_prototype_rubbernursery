/**
 * modules/seeding/seeding-issue-selector.js
 * Full Page Issue Gudang Selector — Pindah Semai (Polybag).
 *
 * Responsibilities:
 * - Shows all eligible POLYBAG Issue Items with item-level remaining balance.
 * - Filters by item name / noIssue / kodeAlokasi.
 * - On selection: writes selected issue+item data to storage keys and navigates back to /seeding/form.
 * - Stale-balance revalidation is NOT done here; it is done at submit-time in seeding-form.js.
 */

import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { getEligiblePolybagIssueDocuments } from './dederan-pindah-semai-adapter.js';
import { toast } from '../../components/toast.js';

export function renderSeedingIssueSelector() {
  const app = document.getElementById('app');

  const eligibleItems = getEligiblePolybagIssueDocuments();
  let filteredItems = [...eligibleItems];

  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

      <!-- HEADER -->
      <header style="display: flex; align-items: center; height: 50px; padding: 0 14px; background: #FFFFFF; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;">
        <button id="btn-issue-back" type="button" aria-label="Kembali" style="padding: 6px; margin-left: -6px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
          <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 style="font-size: 0.95rem; font-weight: 700; color: #111827; margin: 0 0 0 8px;">Pilih Issue Gudang Polybag</h1>
      </header>

      <!-- SEARCH BAR -->
      <div style="padding: 10px 14px; border-bottom: 1px solid #E5E7EB; background: #F9FAFB;">
        <div style="position: relative;">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="#9CA3AF" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); pointer-events: none;">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" id="input-search-issue" placeholder="Cari No Issue, Item, Alokasi..." style="width: 100%; height: 36px; padding: 0 10px 0 34px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 0.78rem; outline: none; background: #FFFFFF; box-sizing: border-box; color: #111827;">
        </div>
        <div style="font-size: 0.68rem; color: #6B7280; margin-top: 6px;">
          <span id="lbl-count">${eligibleItems.length}</span> Item Polybag tersedia
        </div>
      </div>

      <!-- SCROLLABLE LIST -->
      <main id="issue-list-container" style="flex: 1; overflow-y: auto; padding: 8px 14px 20px;">
        <!-- cards rendered dynamically -->
      </main>

    </div>
  `;

  const listContainer = app.querySelector('#issue-list-container');
  const inputSearch = app.querySelector('#input-search-issue');
  const lblCount = app.querySelector('#lbl-count');

  function renderList() {
    if (filteredItems.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #9CA3AF;">
          <svg viewBox="0 0 24 24" width="40" height="40" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 10px; display: block;">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <div style="font-size: 0.84rem; font-weight: 600; margin-bottom: 4px;">Tidak Ada Item Tersedia</div>
          <div style="font-size: 0.72rem; line-height: 1.4;">Semua Issue Gudang Polybag sudah habis digunakan atau tidak ditemukan.</div>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filteredItems.map((item, idx) => `
      <div class="card-issue-item" data-idx="${idx}" style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px; margin-bottom: 10px; cursor: pointer; transition: all 0.15s ease;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 0.82rem; font-weight: 700; color: #1E293B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.issueDocNo}</div>
            <div style="font-size: 0.68rem; color: #64748B; margin-top: 2px;">${item.tanggal || '-'} ${'\\u2022'} ${item.kodeAlokasi || ''}</div>
          </div>
          <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: #DCFCE7; color: #15803D; flex-shrink: 0; margin-left: 8px;">Tersedia</span>
        </div>

        <div style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 6px; padding: 8px 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 0.72rem; color: #4B5563; font-weight: 500;">${item.itemName}</span>
            <span style="font-size: 0.68rem; color: #6B7280;">${item.uom || 'LBR'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.72rem;">
            <span style="color: #6B7280;">Qty Issue: <strong style="color: #111827;">${Number(item.quantityIssue).toLocaleString('id-ID')}</strong></span>
            <span style="color: #6B7280;">Terpakai: <strong style="color: #F59E0B;">${Number(item.usedQuantity).toLocaleString('id-ID')}</strong></span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem; margin-top: 4px; padding-top: 4px; border-top: 1px solid #F3F4F6;">
            <span style="font-weight: 600; color: #116834;">Sisa Tersedia</span>
            <span style="font-weight: 800; color: #116834; font-size: 0.82rem;">${Number(item.remainingQuantity).toLocaleString('id-ID')} ${item.uom || 'LBR'}</span>
          </div>
        </div>

        <div style="text-align: right; margin-top: 8px;">
          <span style="font-size: 0.76rem; color: #116834; font-weight: 700;">Pilih Item \u2192</span>
        </div>
      </div>
    `).join('');

    // Attach card click handlers
    listContainer.querySelectorAll('.card-issue-item').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.idx, 10);
        const selected = filteredItems[idx];
        if (!selected) return;

        // Store selected issue item data
        storage.set('selected_issue_doc_no', selected.issueDocNo);
        storage.set('selected_issue_item_id', selected.issueItemId);
        storage.set('selected_issue_item_code', selected.itemCode);
        storage.set('selected_issue_item_name', selected.itemName);
        storage.set('selected_issue_uom', selected.uom || 'LBR');
        storage.set('selected_issue_qty', selected.quantityIssue);
        storage.set('selected_issue_remaining', selected.remainingQuantity);

        toast('Issue dipilih: ' + selected.issueDocNo + ' \u2014 ' + selected.itemName, 'info');

        setTimeout(() => {
          navigate('/seeding/form');
        }, 200);
      });

      // Hover effect
      card.addEventListener('mouseenter', () => {
        card.style.background = '#F0FDF4';
        card.style.borderColor = '#86EFAC';
      });
      card.addEventListener('mouseleave', () => {
        card.style.background = '#F8FAFC';
        card.style.borderColor = '#E2E8F0';
      });
    });
  }

  // Search handler
  inputSearch.addEventListener('input', () => {
    const q = inputSearch.value.trim().toLowerCase();
    if (!q) {
      filteredItems = [...eligibleItems];
    } else {
      filteredItems = eligibleItems.filter(item =>
        (item.issueDocNo || '').toLowerCase().includes(q) ||
        (item.itemName || '').toLowerCase().includes(q) ||
        (item.itemCode || '').toLowerCase().includes(q) ||
        (item.kodeAlokasi || '').toLowerCase().includes(q) ||
        (item.namaAlokasi || '').toLowerCase().includes(q)
      );
    }
    lblCount.textContent = filteredItems.length;
    renderList();
  });

  // Back button
  app.querySelector('#btn-issue-back').addEventListener('click', () => {
    navigate('/seeding/form');
  });

  // Initial render
  renderList();
}
