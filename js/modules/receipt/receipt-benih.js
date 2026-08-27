import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { session } from '../../core/session.js';
import { formatDate } from '../../core/utils.js';

export function renderReceiptBenih() {
  const app = document.getElementById('app');
  const user = session.get() || { name: 'Irwan Syah Putra', code: '1405482', position: 'Mantri Pembibitan' };
  const today = formatDate(new Date().toISOString());

  // Get initial state
  const originTypeRaw = storage.get('transaction_originType', 'KEBUN_SENDIRI');
  let originTypeDisplay = 'Kebun Sendiri';
  if (originTypeRaw === 'PIHAK_KE_III') originTypeDisplay = 'Pihak Ke-III';
  if (originTypeRaw === 'LAINNYA') originTypeDisplay = 'Lainnya';

  // State from storage to persist across navigations (like opening camera)
  const state = {
    programNurseryId: storage.get('benih_program_id', null),
    programNurseryCode: storage.get('benih_program_code', null),
    sourceId: storage.get('benih_source_id', null),
    sourceName: storage.get('benih_source_name', null),
    photos: storage.get('receipt_photos', [])
  };

  // Get Selected SIR if exists
  const selectedSir = storage.get('selected_sir', null);
  const selectedKlon = storage.get('selected_klon', null);

  // Form Sections
  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #FFFFFF; font-family: sans-serif;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #D9D9D9; flex-shrink: 0;">
        <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="#116834" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 style="font-size: 1.1rem; font-weight: 700; color: #111111; margin: 0 0 0 8px;">Penerimaan Benih / Biji Kelatak</h1>
      </header>

      <!-- SCROLLABLE CONTENT -->
      <main style="flex: 1; overflow-y: auto; padding-bottom: 24px;">
        
        <!-- INFORMASI MANTRI & TANGGAL -->
        <section style="display: flex; justify-content: space-between; align-items: flex-start; padding: 16px; border-bottom: 1px solid #D9D9D9; gap: 12px;">
          <div style="flex: 1;">
            <div style="font-size: 0.95rem; font-weight: 700; color: #111111; margin-bottom: 4px;">${user.name}</div>
            <div style="font-size: 0.8rem; color: #888888; line-height: 1.3;">${user.code} - ${user.position}</div>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <div style="font-size: 0.8rem; font-weight: 700; color: #111111; margin-bottom: 4px;">Tanggal Penerimaan</div>
            <div style="font-size: 0.95rem; color: #111111; font-weight: 700;">${today}</div>
          </div>
        </section>

        <!-- RINCIAN PENERIMAAN -->
        <section style="padding: 16px; border-bottom: 1px solid #D9D9D9;">
          <h2 style="font-size: 0.95rem; font-weight: 700; color: #111111; margin: 0 0 12px 0;">Rincian Penerimaan</h2>
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 8px;">
            <span style="font-size: 0.9rem; color: #666666; flex-shrink: 0;">Jenis Penerimaan</span>
            <span style="font-size: 0.9rem; color: #111111; font-weight: 700; text-align: right; word-break: break-word;">Benih / Biji Kelatak</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <span style="font-size: 0.9rem; color: #666666; flex-shrink: 0;">Tahapan Pertumbuhan</span>
            <span style="font-size: 0.9rem; color: #111111; font-weight: 700; text-align: right; word-break: break-word;">Rubber Main Nursery</span>
          </div>
        </section>

        <!-- FORM SECTIONS -->
        <section style="padding: 16px; display: flex; flex-direction: column; gap: 16px; border-bottom: 1px solid #D9D9D9;">
          
          <!-- PROGRAM PEMBIBITAN -->
          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #111111; margin-bottom: 6px;">Program Pembibitan</label>
            <button id="btn-program" type="button" style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #FFFFFF; border: 1px solid #D9D9D9; border-radius: 6px; font-size: 0.9rem; color: ${state.programNurseryCode ? '#111111' : '#999999'}; text-align: left; cursor: pointer;">
              <span id="label-program" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 8px;">${state.programNurseryCode || 'Pilih Program'}</span>
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="#111111" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>

          <!-- TIPE ASAL -->
          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #111111; margin-bottom: 6px;">Tipe Asal</label>
            <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #EFEFEF; border: 1px solid #D9D9D9; border-radius: 6px; font-size: 0.9rem; color: #111111;">
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 8px;">${originTypeDisplay}</span>
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="#111111" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>

          <!-- SUMBER PENERIMAAN -->
          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #111111; margin-bottom: 6px;">Asal Benih / Rekanan</label>
            <button id="btn-sumber" type="button" style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #FFFFFF; border: 1px solid #D9D9D9; border-radius: 6px; font-size: 0.9rem; color: ${state.sourceName ? '#111111' : '#999999'}; text-align: left; cursor: pointer;">
              <span id="label-sumber" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 8px;">${state.sourceName || 'Pilih Sumber'}</span>
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="#111111" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>
        </section>

        <!-- DETAIL DOKUMEN SIR -->
        <section style="padding: 16px; border-bottom: 1px solid #D9D9D9;">
          <h2 style="font-size: 0.95rem; font-weight: 700; color: #111111; margin: 0 0 12px 0;">Detail Dokumen SIR</h2>
          <div style="border: 1px solid #D9D9D9; border-radius: 6px; overflow: hidden;">
            <div style="padding: 12px 16px; min-height: 80px; font-size: 0.85rem; color: #111111; background: #FFFFFF;">
              ${selectedSir ?
      `<div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; gap: 8px;">
                   <span style="color: #666; flex-shrink: 0;">No Issue/SIR</span>
                   <span style="font-weight: 700; text-align: right; word-break: break-word;">${selectedSir.issueNo}</span>
                 </div>
                 <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; gap: 8px;">
                   <span style="color: #666; flex-shrink: 0;">Kode Alokasi</span>
                   <span style="font-weight: 700; text-align: right; word-break: break-word;">${selectedSir.alokasi}</span>
                 </div>
                 <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; gap: 8px;">
                   <span style="color: #666; flex-shrink: 0;">Nama Item</span>
                   <span style="font-weight: 700; text-align: right; word-break: break-word;">${selectedSir.item}</span>
                 </div>
                 <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; gap: 8px;">
                   <span style="color: #666; flex-shrink: 0;">Jumlah</span>
                   <span style="font-weight: 700; text-align: right; word-break: break-word;">${selectedSir.qty}</span>
                 </div>
                 <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; gap: 8px;">
                   <span style="color: #666; flex-shrink: 0;">Tanggal Issue</span>
                   <span style="font-weight: 700; text-align: right; word-break: break-word;">${selectedSir.date}</span>
                 </div>
                 <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                   <span style="color: #666; flex-shrink: 0;">Klon</span>
                   <span style="font-weight: 700; color: #4A773C; text-align: right; word-break: break-word;">${selectedKlon ? selectedKlon.title : '-'}</span>
                 </div>`
      : '<span style="color: #999;">Belum ada dokumen SIR dipilih</span>'}
            </div>
            <button id="btn-tambah-sir" type="button" style="width: 100%; padding: 12px 16px; background: #FFFFFF; border: none; border-top: 1px solid #D9D9D9; color: #4A90E2; font-size: 0.95rem; display: flex; justify-content: flex-end; align-items: center; cursor: pointer;">
              Tambah Dokumen
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="#4A90E2" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px;">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        </section>

        <!-- TAMBAH FOTO -->
        <section style="padding: 16px;">
          <h2 style="font-size: 0.95rem; font-weight: 700; color: #111111; margin: 0 0 8px 0;">Tambah Foto</h2>
          <p style="font-size: 0.8rem; color: #666666; margin: 0 0 16px 0; line-height: 1.4;">
            Praktik terbaik adalah menyertakan foto jarak dekat untuk detail Item dan foto jarak jauh untuk konteks area yang terpengaruh.
          </p>
          
          <div id="photo-preview-container" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;"></div>

          <button id="btn-tambah-foto" type="button" style="width: 100%; padding: 12px; background: #F8F9FA; border: 1px dashed #4A90E2; border-radius: 6px; color: #4A90E2; font-size: 0.95rem; display: flex; justify-content: center; align-items: center; gap: 8px; cursor: pointer;">
            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            Tambah Foto
          </button>
        </section>

      </main>

      <!-- BOTTOM ACTION -->
      <footer style="padding: 16px; background: #F5F5F5; border-top: 1px solid #D9D9D9; flex-shrink: 0;">
        <button id="btn-simpan" type="button" disabled style="width: 100%; height: 48px; background: #E0E0E0; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 1rem; display: flex; align-items: center; justify-content: center; cursor: not-allowed;">
          Simpan Penerimaan
        </button>
      </footer>

      <!-- OVERLAY -->
      <div id="modal-overlay" style="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100;"></div>

      <!-- BOTTOM SHEET PROGRAM -->
      <div id="sheet-program" style="display: none; position: absolute; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-radius: 12px 12px 0 0; padding: 24px 16px; z-index: 101; flex-direction: column; max-height: 70vh; overflow-y: auto;">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: #111111; text-align: center; margin: 0 0 16px 0;">Pilih Program Pembibitan</h3>
        <div id="list-program" style="display: flex; flex-direction: column; border: 1px solid #D9D9D9; border-radius: 6px; overflow: hidden;">
          <!-- Items injected via JS -->
        </div>
      </div>

      <!-- BOTTOM SHEET SUMBER -->
      <div id="sheet-sumber" style="display: none; position: absolute; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-radius: 12px 12px 0 0; padding: 24px 16px; z-index: 101; flex-direction: column; max-height: 70vh; overflow-y: auto;">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: #111111; text-align: center; margin: 0 0 16px 0;">Pilih Asal Benih / Rekanan</h3>
        <div id="list-sumber" style="display: flex; flex-direction: column; border: 1px solid #D9D9D9; border-radius: 6px; overflow: hidden;">
          <!-- Items injected via JS -->
        </div>
      </div>
    </div>
  `;

  // DATA DUMMY
  const programData = [
    { id: '1', code: 'PRG/NUR/01/2026' },
    { id: '2', code: 'PRG/NUR/02/2027' },
    { id: '3', code: 'PRG/NUR/03/2028' },
    { id: '4', code: 'PRG/NUR/08/2029' }
  ];

  const sumberData = [
    { id: 'S1', name: 'UD Ganang Jaya' },
    { id: 'S2', name: 'UD Semesta Benih' },
    { id: 'S3', name: 'UD Mitra Sejati' },
    { id: 'S4', name: 'UD Tani Makmur' },
    { id: 'S5', name: 'UD Sumber Rezeki' },
    { id: 'S6', name: 'UD Karya Benih' },
    { id: 'S7', name: 'UD Maju Bersama' },
    { id: 'S8', name: 'UD Berkah Tani' }
  ];

  // DOM ELEMENTS
  const btnBack = app.querySelector('#btn-back');
  const btnSimpan = app.querySelector('#btn-simpan');
  const labelProgram = app.querySelector('#label-program');
  const labelSumber = app.querySelector('#label-sumber');
  const btnProgram = app.querySelector('#btn-program');
  const btnSumber = app.querySelector('#btn-sumber');

  const overlay = app.querySelector('#modal-overlay');
  const sheetProgram = app.querySelector('#sheet-program');
  const sheetSumber = app.querySelector('#sheet-sumber');
  const listProgram = app.querySelector('#list-program');
  const listSumber = app.querySelector('#list-sumber');

  const btnTambahFoto = app.querySelector('#btn-tambah-foto');
  const photoPreviewContainer = app.querySelector('#photo-preview-container');
  const btnTambahSir = app.querySelector('#btn-tambah-sir');

  // RENDER LISTS
  function renderProgramList() {
    listProgram.innerHTML = programData.map((p, idx) => `
      <div class="item-program" data-id="${p.id}" data-code="${p.code}" style="display: flex; justify-content: space-between; padding: 16px; background: ${state.programNurseryId === p.id ? '#E8F5E9' : '#FFFFFF'}; border-bottom: ${idx === programData.length - 1 ? 'none' : '1px solid #D9D9D9'}; cursor: pointer;">
        <span style="font-size: 0.95rem; color: #111111; font-weight: ${state.programNurseryId === p.id ? '700' : '400'};">${p.code}</span>
        <span style="font-size: 0.95rem; color: #116834; font-weight: 600;">Pilih</span>
      </div>
    `).join('');

    listProgram.querySelectorAll('.item-program').forEach(el => {
      el.addEventListener('click', () => {
        state.programNurseryId = el.dataset.id;
        state.programNurseryCode = el.dataset.code;
        storage.set('benih_program_id', state.programNurseryId);
        storage.set('benih_program_code', state.programNurseryCode);
        
        labelProgram.textContent = state.programNurseryCode;
        labelProgram.style.color = '#111111';
        closeModals();
        validateForm();
      });
    });
  }

  function renderSumberList() {
    listSumber.innerHTML = sumberData.map((s, idx) => `
      <div class="item-sumber" data-id="${s.id}" data-name="${s.name}" style="display: flex; justify-content: space-between; padding: 16px; background: ${state.sourceId === s.id ? '#E8F5E9' : '#FFFFFF'}; border-bottom: ${idx === sumberData.length - 1 ? 'none' : '1px solid #D9D9D9'}; cursor: pointer;">
        <span style="font-size: 0.95rem; color: #111111; font-weight: ${state.sourceId === s.id ? '700' : '400'};">${s.name}</span>
        <span style="font-size: 0.95rem; color: #116834; font-weight: 600;">Pilih</span>
      </div>
    `).join('');

    listSumber.querySelectorAll('.item-sumber').forEach(el => {
      el.addEventListener('click', () => {
        state.sourceId = el.dataset.id;
        state.sourceName = el.dataset.name;
        storage.set('benih_source_id', state.sourceId);
        storage.set('benih_source_name', state.sourceName);
        
        labelSumber.textContent = state.sourceName;
        labelSumber.style.color = '#111111';
        closeModals();
        validateForm();
      });
    });
  }

  // MODAL LOGIC
  function closeModals() {
    overlay.style.display = 'none';
    sheetProgram.style.display = 'none';
    sheetSumber.style.display = 'none';
  }

  btnProgram.addEventListener('click', () => {
    renderProgramList();
    overlay.style.display = 'block';
    sheetProgram.style.display = 'flex';
  });

  btnSumber.addEventListener('click', () => {
    renderSumberList();
    overlay.style.display = 'block';
    sheetSumber.style.display = 'flex';
  });

  overlay.addEventListener('click', closeModals);

  // FOTO LOGIC
  btnTambahFoto.addEventListener('click', () => {
    navigate('/reception/benih/camera');
  });

  function renderPhotos() {
    photoPreviewContainer.innerHTML = state.photos.map((src, index) => `
      <div style="position: relative; width: 80px; height: 80px; border-radius: 6px; border: 1px solid #D9D9D9; margin-right: 8px; margin-bottom: 8px;">
        <img src="${src}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px;" />
        <button type="button" class="btn-hapus-foto" data-index="${index}" style="position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; background: #FFFFFF; border: 1px solid #D32F2F; border-radius: 50%; display: flex; justify-content: center; align-items: center; cursor: pointer; padding: 0;">
          <svg viewBox="0 0 24 24" width="12" height="12" stroke="#D32F2F" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
      </div>
    `).join('');

    photoPreviewContainer.querySelectorAll('.btn-hapus-foto').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        state.photos.splice(index, 1);
        storage.set('receipt_photos', state.photos); // sync to storage
        renderPhotos();
      });
    });
  }

  // VALIDATION
  function validateForm() {
    const isValid = state.programNurseryId && originTypeRaw && state.sourceId;
    if (isValid) {
      btnSimpan.disabled = false;
      btnSimpan.style.background = '#116834';
      btnSimpan.style.cursor = 'pointer';
    } else {
      btnSimpan.disabled = true;
      btnSimpan.style.background = '#E0E0E0';
      btnSimpan.style.cursor = 'not-allowed';
    }
  }

  // BUTTON ACTIONS
  btnBack.addEventListener('click', () => {
    navigate('/reception');
  });

  btnTambahSir.addEventListener('click', () => {
    navigate('/reception/benih/sir');
  });

  btnSimpan.addEventListener('click', () => {
    if (!btnSimpan.disabled) {
      console.log('Menyimpan Data Penerimaan', state);
      // Untuk task ini cukup log, karena workflow Ringkasan tidak diimplementasikan
    }
  });

  // Initial rendering
  renderPhotos();
  validateForm();
}
