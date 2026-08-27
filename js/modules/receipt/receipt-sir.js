import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';

export function renderReceiptSir() {
  const app = document.getElementById('app');

  // State
  let selectedSir = null;

  // Dummy Data
  const sirData = [
    {
      id: 'SIR-1',
      issueNo: 'ISSUE/2026/01/347',
      alokasi: '122111',
      item: 'KLATAK (BIJI KARET)',
      qty: '39250 BUTIR',
      date: '2026/08/26'
    },
    {
      id: 'SIR-2',
      issueNo: 'ISSUE/2026/01/348',
      alokasi: '122112',
      item: 'KLATAK (BIJI KARET)',
      qty: '20000 BUTIR',
      date: '2026/08/26'
    }
  ];

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
        <button type="button" aria-label="Refresh" style="padding: 8px; margin-right: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
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
          <label style="font-size: 1rem; font-weight: 700; color: #111111;">Pilih Issue</label>
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="#111111" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>
        
        <div style="position: relative; margin-bottom: 8px;">
          <input type="text" placeholder="Ketik nomor permintaan atau kode material" style="width: 100%; padding: 12px 40px 12px 12px; border: 1px solid #D9D9D9; border-radius: 4px; font-size: 0.9rem; background: #FAFAFA; box-sizing: border-box;" />
          <svg style="position: absolute; right: 12px; top: 12px;" viewBox="0 0 24 24" width="20" height="20" stroke="#999999" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>

        <a href="#" style="font-size: 0.85rem; color: #4A90E2; text-decoration: none;">Tampilkan semua permintaan hari ini</a>
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
  const btnSimpan = app.querySelector('#btn-simpan');
  const sirListContainer = app.querySelector('#sir-list');
  
  const overlayKlon = app.querySelector('#modal-overlay-klon');
  const sheetKlon = app.querySelector('#sheet-klon');
  const listKlonContainer = app.querySelector('#list-klon');
  const inputSearchKlon = app.querySelector('#input-search-klon');

  // Full Klon Data extracted from image
  const klonNames = [
    "BPM1", "BPM24", "CYT577", "GT1", "IRCA1007", "IRCA101", "IRCA109", "IRCA111", 
    "IRCA130", "IRCA18", "IRCA19", "IRCA230", "IRCA317", "IRCA331", "IRCA41", "IRCA427", 
    "IRCA733", "IRCA804", "IRCA807", "IRCA825", "IRCA986", "IRR104", "IRR112", "IRR118", 
    "IRR205", "IRR206", "IRR207", "IRR208", "IRR220", "IRR221", "IRR230", "IRR425", 
    "IRR428", "IRR429", "IRR434", "IRR440", "IRR5", "LBT94", "PB217", "PB235", "PB254", 
    "PB260", "PB330", "PB340", "PC10", "PM10", "PR107", "PR300", "RRIC100", "RRIM2020", 
    "RRIM600", "RRIM703", "RRIM712", "RRIM901", "RRIM908", "RRIM911", "RRIM921"
  ];
  
  const klonData = klonNames.map((name, idx) => ({ 
    id: 'K' + (idx + 1), 
    title: name, 
    sub: 'Klon-' + name.replace(/[^0-9]/g, '') || name 
  }));

  function renderList() {
    sirListContainer.innerHTML = sirData.map(item => {
      const isSelected = selectedSir && selectedSir.id === item.id;
      return `
        <div class="sir-item" data-id="${item.id}" style="display: flex; padding: 16px; background: #FFFFFF; border-bottom: 1px solid #E0E0E0; cursor: pointer;">
          <!-- Checkbox -->
          <div style="margin-right: 16px; padding-top: 4px;">
            <div style="width: 20px; height: 20px; border-radius: 4px; border: ${isSelected ? 'none' : '2px solid #999999'}; background: ${isSelected ? '#4A773C' : '#FFFFFF'}; display: flex; justify-content: center; align-items: center;">
              ${isSelected ? '<svg viewBox="0 0 24 24" width="14" height="14" stroke="#FFFFFF" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
            </div>
          </div>
          
          <!-- Content -->
          <div style="flex: 1;">
            <div style="font-size: 0.95rem; font-weight: 700; color: #111111; margin-bottom: 4px;">${item.issueNo}</div>
            <div style="font-size: 0.85rem; color: #666666; margin-bottom: 2px;">Alokasi: ${item.alokasi}</div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 0.85rem; color: #666666; margin-bottom: 2px;">Item: ${item.item}</div>
              <a href="#" style="font-size: 0.85rem; color: #4A90E2; text-decoration: none;">Detail</a>
            </div>
            <div style="font-size: 0.85rem; color: #666666; margin-bottom: 2px;">${item.qty}</div>
            <div style="font-size: 0.85rem; color: #666666;">${item.date}</div>
          </div>
        </div>
      `;
    }).join('');

    sirListContainer.querySelectorAll('.sir-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const item = sirData.find(d => d.id === id);
        
        // Toggle selection
        if (selectedSir && selectedSir.id === id) {
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

  btnBack.addEventListener('click', () => {
    navigate('/reception/benih');
  });

  function renderKlonList(filterText = '') {
    const filtered = klonData.filter(k => 
      k.title.toLowerCase().includes(filterText.toLowerCase()) || 
      k.sub.toLowerCase().includes(filterText.toLowerCase())
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
}
