import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { getActiveKlons } from '../../data/klon-master.js';
import { getRestrictedPihakIIIKlons } from './receipt-benih.js';
import { getAllIssueDocuments } from '../../data/material-master.js';
import { toast } from '../../components/toast.js';

export function renderReceiptSir() {
  const app = document.getElementById('app');

  // State
  let selectedSir = null;
  let searchQuery = '';

  function loadSirData() {
    const allIssues = getAllIssueDocuments();
    const list = [];
    allIssues.forEach(doc => {
      const isBijiKaret = doc.kodeAlokasi === '122111' || 
        (doc.items && doc.items.some(it => 
          String(it.itemName || '').toUpperCase().includes('KLATAK') || 
          String(it.itemName || '').toUpperCase().includes('BIJI KARET')
        ));

      if (isBijiKaret) {
        (doc.items || []).forEach(item => {
          const remQty = Number(item.remainingQuantity !== undefined ? item.remainingQuantity : item.quantityIssue) || 0;
          const isFullyUsed = remQty <= 0;
          list.push({
            id: `${doc.id}_${item.id}`,
            docId: doc.id,
            issueDocNo: doc.noIssue,
            issueNo: doc.noIssue,
            noIssue: doc.noIssue,
            alokasi: doc.kodeAlokasi,
            kodeAlokasi: doc.kodeAlokasi,
            namaAlokasi: doc.namaAlokasi,
            item: item.itemName,
            itemCode: item.itemCode,
            issueItemId: item.id,
            quantityIssue: item.quantityIssue,
            usedQuantity: item.usedQuantity || 0,
            remainingQuantity: remQty,
            rawQty: remQty,
            qty: `${remQty.toLocaleString('id-ID')} ${item.uom || 'BUTIR'}`,
            date: doc.tanggal,
            status: isFullyUsed ? 'FULLY_USED' : (item.status || 'AVAILABLE')
          });
        });
      }
    });
    return list;
  }

  let sirData = loadSirData();

  // Restore previously selected SIR if exists in storage
  const savedSir = storage.get('selected_sir', null);
  if (savedSir) {
    selectedSir = sirData.find(d => d.id === savedSir.id || d.issueNo === savedSir.issueNo || d.issueNo === savedSir.noIssue) || null;
  }

  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #F5F5F5; font-family: sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #D9D9D9; flex-shrink: 0;">
        <div style="display: flex; align-items: center;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="#4A773C" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.2rem; font-weight: 700; color: #111111; margin: 0 0 0 8px;">Tambah Dokumen SIR</h1>
        </div>
        <button id="btn-refresh-sir" type="button" aria-label="Refresh" style="padding: 8px; margin-right: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="#4A773C" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10"></polyline>
            <polyline points="23 20 23 14 17 14"></polyline>
            <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10"></path>
            <path d="M3.51 15A9 9 0 0 0 18.36 18.36L23 14"></path>
          </svg>
        </button>
      </header>

      <!-- SEARCH SECTION -->
      <section style="background: #FFFFFF; padding: 16px; border-bottom: 1px solid #D9D9D9;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <label style="font-size: 1rem; font-weight: 700; color: #111111;">Pilih Issue (Alokasi 122111)</label>
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="#111111" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        
        <div style="position: relative; margin-bottom: 8px;">
          <input id="input-search-sir" type="text" placeholder="Ketik nomor issue atau nama barang..." style="width: 100%; padding: 12px 40px 12px 12px; border: 1px solid #D9D9D9; border-radius: 4px; font-size: 0.9rem; background: #FAFAFA; box-sizing: border-box;" />
          <svg style="position: absolute; right: 12px; top: 12px;" viewBox="0 0 24 24" width="20" height="20" stroke="#999999" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>

        <a id="link-show-all-sir" href="#" style="font-size: 0.85rem; color: #4A90E2; text-decoration: none;">Tampilkan semua dokumen issue alokasi 122111</a>
      </section>

      <!-- LIST ITEMS -->
      <main id="sir-list" style="flex: 1; overflow-y: auto;">
        <!-- Injected by JS -->
      </main>

      <!-- BOTTOM ACTION -->
      <footer style="padding: 16px; background: #FFFFFF; flex-shrink: 0; border-top: 1px solid #D9D9D9;">
        <button id="btn-simpan" type="button" disabled style="width: 100%; height: 48px; background: #4A773C; color: #FFFFFF; border: none; border-radius: 4px; font-weight: 600; font-size: 1rem; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0.5;">
          Simpan
        </button>
      </footer>

      <!-- OVERLAY KLON -->
      <div id="modal-overlay-klon" style="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100;"></div>

      <!-- BOTTOM SHEET KLON -->
      <div id="sheet-klon" style="display: none; position: absolute; left: 0; right: 0; bottom: 0; background: #F5F5F5; border-radius: 12px 12px 0 0; z-index: 101; flex-direction: column; max-height: 80vh;">
        <div style="padding: 16px; background: #F8F9FA; border-radius: 12px 12px 0 0;">
           <h3 style="font-size: 1rem; font-weight: 700; color: #111111; text-align: center; margin: 0 0 16px 0;">Tentukan Klon Jenis Klon Diterima</h3>
           <div style="position: relative;">
             <input type="text" id="input-search-klon" placeholder="Cari Klon..." style="width: 100%; padding: 12px 40px 12px 12px; border: 1px solid #999999; border-radius: 4px; font-size: 1.1rem; box-sizing: border-box;" />
             <svg style="position: absolute; right: 12px; top: 12px;" viewBox="0 0 24 24" width="20" height="20" stroke="#999999" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
               <circle cx="11" cy="11" r="8"></circle>
               <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
             </svg>
           </div>
        </div>
        
        <div id="list-klon" style="padding: 16px; overflow-y: auto;">
           <!-- Injected by JS -->
        </div>
      </div>
    </div>
  `;

  const btnBack = app.querySelector('#btn-back');
  const btnRefresh = app.querySelector('#btn-refresh-sir');
  const btnSimpan = app.querySelector('#btn-simpan');
  const sirListContainer = app.querySelector('#sir-list');
  const inputSearchSir = app.querySelector('#input-search-sir');
  const linkShowAll = app.querySelector('#link-show-all-sir');
  
  const overlayKlon = app.querySelector('#modal-overlay-klon');
  const sheetKlon = app.querySelector('#sheet-klon');
  const listKlonContainer = app.querySelector('#list-klon');
  const inputSearchKlon = app.querySelector('#input-search-klon');

  const originTypeRaw = storage.get('transaction_originType', 'PIHAK_KE_III');
  const isPihakIII = originTypeRaw === 'PIHAK_KE_III';

  // Master Data Klon Terpusat (57 Klon Aktif Resmi untuk Non-Pihak Ke-III, 4 Klon Terbatas untuk Pihak Ke-III)
  let klonData = [];
  if (isPihakIII) {
    klonData = getRestrictedPihakIIIKlons();
  } else {
    const activeKlons = getActiveKlons();
    klonData = activeKlons.map((k) => ({ 
      id: k.id, 
      title: k.canonicalName, 
      code: k.code,
      canonicalName: k.canonicalName,
      sub: 'Klon-' + (k.canonicalName.replace(/[^0-9]/g, '') || k.code)
    }));
  }

  function renderList() {
    const q = searchQuery.trim().toLowerCase();
    const filtered = sirData.filter(item => {
      if (!q) return true;
      return (
        item.issueNo.toLowerCase().includes(q) ||
        item.alokasi.toLowerCase().includes(q) ||
        (item.namaAlokasi && item.namaAlokasi.toLowerCase().includes(q)) ||
        item.item.toLowerCase().includes(q) ||
        (item.itemCode && item.itemCode.toLowerCase().includes(q)) ||
        (item.date && item.date.toLowerCase().includes(q))
      );
    });

    if (filtered.length === 0) {
      sirListContainer.innerHTML = `
        <div style="padding: 40px 16px; text-align: center; color: #999;">
          <div style="font-size: 1rem; font-weight: 600; margin-bottom: 4px;">Tidak Ada Dokumen Issue Ditemukan</div>
          <div style="font-size: 0.85rem;">Silakan periksa kata kunci pencarian atau pastikan dokumen issue alokasi 122111 tersedia.</div>
        </div>
      `;
      return;
    }

    sirListContainer.innerHTML = filtered.map(item => {
      const isSelected = selectedSir && (selectedSir.id === item.id || selectedSir.issueNo === item.issueNo);
      const isFullyUsed = item.status === 'FULLY_USED' || item.remainingQuantity <= 0;
      return `
        <div class="sir-item" data-id="${item.id}" style="display: flex; padding: 16px; background: ${isFullyUsed ? '#F9FAFB' : '#FFFFFF'}; border-bottom: 1px solid #E0E0E0; cursor: ${isFullyUsed ? 'not-allowed' : 'pointer'}; opacity: ${isFullyUsed ? '0.7' : '1'};">
          <!-- Checkbox -->
          <div style="margin-right: 16px; padding-top: 4px;">
            <div style="width: 20px; height: 20px; border-radius: 4px; border: ${isSelected ? 'none' : (isFullyUsed ? '2px solid #CBD5E1' : '2px solid #999999')}; background: ${isSelected ? '#4A773C' : '#FFFFFF'}; display: flex; justify-content: center; align-items: center;">
              ${isSelected ? '<svg viewBox="0 0 24 24" width="14" height="14" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
            </div>
          </div>
          
          <!-- Content -->
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
              <div style="font-size: 0.95rem; font-weight: 700; color: #111111;">${item.issueNo}</div>
              ${isFullyUsed 
                ? '<span style="font-size: 0.72rem; padding: 2px 6px; background: #F1F5F9; color: #64748B; border-radius: 4px; font-weight: 700;">Habis Terpakai</span>' 
                : '<span style="font-size: 0.72rem; padding: 2px 6px; background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; border-radius: 4px; font-weight: 700;">Tersedia</span>'}
            </div>
            <div style="font-size: 0.85rem; color: #666666; margin-bottom: 2px;">Alokasi: ${item.alokasi} - ${item.namaAlokasi || 'Biaya Biji Karet'}</div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 0.85rem; color: #666666; margin-bottom: 2px;">Item: ${item.item} (${item.itemCode || '7030016'})</div>
            </div>
            <div style="font-size: 0.85rem; color: ${isFullyUsed ? '#94A3B8' : '#116834'}; font-weight: 700; margin-bottom: 2px;">
              Sisa Kuota: ${item.qty}
            </div>
            <div style="font-size: 0.85rem; color: #666666;">Tanggal: ${item.date}</div>
          </div>
        </div>
      `;
    }).join('');

    sirListContainer.querySelectorAll('.sir-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const item = sirData.find(d => d.id === id);
        if (!item) return;

        if (item.status === 'FULLY_USED' || item.remainingQuantity <= 0) {
          toast('Dokumen issue ini kuotanya sudah habis terpakai.', 'warning');
          return;
        }
        
        // Toggle selection
        if (selectedSir && (selectedSir.id === id || selectedSir.issueNo === item.issueNo)) {
          selectedSir = null;
        } else {
          selectedSir = item;
        }
        
        renderList();
        updateSimpanButton();
      });
    });
  }

  function updateSimpanButton() {
    if (selectedSir) {
      btnSimpan.disabled = false;
      btnSimpan.style.opacity = '1';
    } else {
      btnSimpan.disabled = true;
      btnSimpan.style.opacity = '0.5';
    }
  }

  inputSearchSir?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderList();
  });

  linkShowAll?.addEventListener('click', (e) => {
    e.preventDefault();
    searchQuery = '';
    if (inputSearchSir) inputSearchSir.value = '';
    renderList();
  });

  btnRefresh?.addEventListener('click', () => {
    sirData = loadSirData();
    renderList();
    toast('Data dokumen issue diperbarui.', 'info');
  });

  btnBack.addEventListener('click', () => {
    navigate('/reception/benih');
  });

  function renderKlonList(filterText = '') {
    const q = (filterText || '').trim().toLowerCase();
    const filtered = klonData.filter(k => 
      k.title.toLowerCase().includes(q) || 
      k.sub.toLowerCase().includes(q) ||
      (k.code && k.code.toLowerCase().includes(q))
    );

    if (filtered.length === 0) {
      listKlonContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: #999;">Tidak ditemukan</div>';
      return;
    }

    listKlonContainer.innerHTML = filtered.map(item => `
      <div class="item-klon" data-id="${item.id}" style="background: #FFFFFF; border: 1px solid #D9D9D9; border-radius: 4px; padding: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; cursor: pointer;">
        <div>
          <div style="font-weight: 700; font-size: 1rem; color: #111111; margin-bottom: 4px;">${item.title}</div>
          <div style="font-size: 0.9rem; color: #999999;">${item.sub}</div>
        </div>
        <div style="color: #2E7D32; font-weight: 700; font-size: 0.95rem;">Pilih</div>
      </div>
    `).join('');

    listKlonContainer.querySelectorAll('.item-klon').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const klon = klonData.find(k => k.id === id);
        
        if (selectedSir) {
          storage.set('selected_sir', selectedSir);
          storage.set('selected_klon', klon); // Save clone to state as well
          navigate('/reception/benih');
        }
      });
    });
  }

  inputSearchKlon.addEventListener('input', (e) => {
    renderKlonList(e.target.value);
  });

  overlayKlon.addEventListener('click', () => {
    overlayKlon.style.display = 'none';
    sheetKlon.style.display = 'none';
  });

  btnSimpan.addEventListener('click', () => {
    if (selectedSir) {
      inputSearchKlon.value = ''; // reset search on open
      renderKlonList();
      overlayKlon.style.display = 'block';
      sheetKlon.style.display = 'flex';
    }
  });

  renderList();
  updateSimpanButton();
}
