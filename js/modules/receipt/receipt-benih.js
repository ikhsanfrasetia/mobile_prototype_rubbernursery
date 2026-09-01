import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { session } from '../../core/session.js';
import { formatDate } from '../../core/utils.js';

export function renderReceiptBenih() {
  const app = document.getElementById('app');
  const user = session.get() || { name: 'Irwan Syah Putra', code: '1405482', position: 'Mantri Pembibitan' };
  const today = formatDate(new Date().toISOString());

  // Guard against editing locked document that already has seeding transactions
  const editingIdx = storage.get('editing_transaction_index', null);
  if (editingIdx !== null) {
    const seedingTxs = storage.get('seeding_transactions', []);
    if (seedingTxs.some(s => s.sourceIndex == editingIdx)) {
      storage.remove('editing_transaction_index');
      navigate('/reception');
      return;
    }
  }

  // Get initial state
  const originTypeRaw = storage.get('transaction_originType', 'KEBUN_SENDIRI');
  let originTypeDisplay = 'Kebun Sendiri';
  if (originTypeRaw === 'PIHAK_KE_III') originTypeDisplay = 'Pihak Ke-III';
  if (originTypeRaw === 'LAINNYA') originTypeDisplay = 'Lainnya';

  // State from storage to persist across navigations (like opening camera)
  const state = {
    jenisPenerimaan: storage.get('benih_jenis', 'Benih / Biji Kelatak'),
    tahapanPertumbuhan: storage.get('benih_tahapan', 'Rubber Main Nursery'),
    programNurseryId: storage.get('benih_program_id', null),
    programNurseryCode: storage.get('benih_program_code', null),
    sourceId: storage.get('benih_source_id', null),
    sourceName: storage.get('benih_source_name', null),
    photos: storage.get('receipt_photos', []),
    tableRows: storage.get('benih_table_rows', [{ klon: '', qty: '', rejected: '', reason: '' }]),
    batchCode: storage.get('benih_batch_code', null)
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
        <h1 id="header-title" style="font-size: 1.1rem; font-weight: 700; color: #111111; margin: 0 0 0 8px;">${state.jenisPenerimaan === 'Bibit / Tanaman Muda' ? 'Penerimaan Bibit' : 'Penerimaan Benih / Biji Kelatak'}</h1>
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
        <!-- FORM SECTIONS -->
        <section style="padding: 16px; display: flex; flex-direction: column; gap: 16px; border-bottom: 1px solid #D9D9D9;">
          
          <!-- JENIS PENERIMAAN -->
          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #111111; margin-bottom: 6px;">Jenis Penerimaan</label>
            <button id="btn-jenis" type="button" style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #EFEFEF; border: 1px solid #D9D9D9; border-radius: 6px; font-size: 0.9rem; color: #111111; text-align: left; cursor: not-allowed;">
              <span id="label-jenis" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 8px;">${state.jenisPenerimaan}</span>
            </button>
          </div>

          <!-- TAHAPAN PERTUMBUHAN -->
          <div>
            <label style="display: block; font-size: 0.85rem; font-weight: 700; color: #111111; margin-bottom: 6px;">Tahapan Pertumbuhan</label>
            <button id="btn-tahapan" type="button" style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: ${state.jenisPenerimaan === 'Benih / Biji Kelatak' ? '#EFEFEF' : '#FFFFFF'}; border: 1px solid #D9D9D9; border-radius: 6px; font-size: 0.9rem; color: #111111; text-align: left; cursor: ${state.jenisPenerimaan === 'Benih / Biji Kelatak' ? 'not-allowed' : 'pointer'};">
              <span id="label-tahapan" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 8px;">${state.tahapanPertumbuhan}</span>
              <svg id="icon-tahapan" viewBox="0 0 24 24" width="18" height="18" stroke="#111111" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; display: ${state.jenisPenerimaan === 'Benih / Biji Kelatak' ? 'none' : 'block'};">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
          </div>

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
        <section id="section-detail-sir" style="padding: 16px; border-bottom: 1px solid #D9D9D9; display: ${(originTypeRaw === 'KEBUN_SENDIRI' || originTypeRaw === 'LAINNYA') ? 'none' : 'block'};">
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

        <!-- DETAIL PENERIMAAN TABLE -->
        <section id="section-detail-table" style="padding: 16px; border-bottom: 1px solid #D9D9D9; display: ${(originTypeRaw === 'KEBUN_SENDIRI' || originTypeRaw === 'LAINNYA') ? 'block' : 'none'};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h2 style="font-size: 1rem; font-weight: 700; color: #111111; margin: 0;">Detail Penerimaan</h2>
            <button id="btn-tambah-data" type="button" style="background: #356943; color: white; border: none; border-radius: 4px; padding: 6px 12px; font-size: 0.8rem; font-weight: 600; cursor: pointer;">Tambah Data</button>
          </div>
          
          <div style="background: #E8F5E9; border-radius: 6px 6px 0 0; padding: 10px 8px; display: grid; grid-template-columns: 1.1fr 1fr 1.5fr; gap: 6px; border: 1px solid #D1CDCD; border-bottom: none; text-align: center;">
            <div style="font-size: 0.78rem; font-weight: 700; color: #356943;">Klon *</div>
            <div style="font-size: 0.78rem; font-weight: 700; color: #356943;">Banyaknya *</div>
            <div style="font-size: 0.78rem; font-weight: 700; color: #356943;">Diseleksi</div>
          </div>
          
          <div id="container-receipt-rows" style="display: flex; flex-direction: column; border-left: 1px solid #D1CDCD; border-right: 1px solid #D1CDCD;">
             <!-- rows go here -->
          </div>
          
          <div style="background: #E8F5E9; border-radius: 0 0 6px 6px; padding: 10px 12px; border: 1px solid #D1CDCD; border-top: none;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-size: 0.82rem; font-weight: 600; color: #356943;">Total Jumlah Diterima</span>
              <span id="total-qty" style="font-size: 0.85rem; font-weight: 700; color: #111111;">0</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="font-size: 0.82rem; font-weight: 600; color: #356943;">Jumlah Diseleksi</span>
              <span id="total-rejected" style="font-size: 0.85rem; font-weight: 700; color: #111111;">0</span>
            </div>
          </div>
        </section>

        <!-- SCAN QR / BATCH MANUAL -->
        <section id="section-qr-batch" style="padding: 16px; border-bottom: 1px solid #D9D9D9; display: none;">
          <h2 style="font-size: 0.95rem; font-weight: 700; color: #111111; margin: 0 0 12px 0;">Scan QR Batch / Pilih Manual <span style="color: #D32F2F;">*</span></h2>
          
          <div style="display: flex; gap: 12px; margin-bottom: 12px;">
            <button id="btn-scan-qr" type="button" style="flex: 1; height: 44px; display: flex; justify-content: center; align-items: center; gap: 8px; background: #FFFFFF; border: 1px solid #116834; border-radius: 6px; color: #116834; font-weight: 600; font-size: 0.9rem; cursor: pointer;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M7 7h.01M17 7h.01M7 17h.01M17 17h.01"></path></svg>
              Scan QR Code
            </button>
            <button id="btn-pilih-batch" type="button" style="flex: 1; height: 44px; display: flex; justify-content: center; align-items: center; background: #FFFFFF; border: 1px solid #116834; border-radius: 6px; color: #116834; font-weight: 600; font-size: 0.9rem; cursor: pointer;">
              Pilih Manual
            </button>
          </div>
          
          <div id="selected-batch-container" style="display: none; background: #E8F5E9; padding: 12px; border-radius: 6px; border: 1px solid #C8E6C9; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 0.75rem; color: #356943; font-weight: 600; margin-bottom: 2px;">Batch Terpilih</div>
              <div id="selected-batch-text" style="font-size: 0.95rem; font-weight: 700; color: #111111;">-</div>
            </div>
            <button id="btn-hapus-batch" type="button" style="background: none; border: none; padding: 4px; cursor: pointer;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="#D32F2F" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
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

      <!-- BOTTOM SHEET JENIS -->
      <div id="sheet-jenis" style="display: none; position: absolute; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-radius: 12px 12px 0 0; padding: 24px 16px; z-index: 101; flex-direction: column;">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: #111111; text-align: center; margin: 0 0 16px 0;">Pilih Jenis Penerimaan</h3>
        <div id="list-jenis" style="display: flex; flex-direction: column; border: 1px solid #D9D9D9; border-radius: 6px; overflow-y: auto; max-height: 60vh;">
          <!-- Items injected via JS -->
        </div>
      </div>

      <!-- BOTTOM SHEET TAHAPAN -->
      <div id="sheet-tahapan" style="display: none; position: absolute; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-radius: 12px 12px 0 0; padding: 24px 16px; z-index: 101; flex-direction: column;">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: #111111; text-align: center; margin: 0 0 16px 0;">Pilih Tahapan Pertumbuhan</h3>
        <div id="list-tahapan" style="display: flex; flex-direction: column; border: 1px solid #D9D9D9; border-radius: 6px; overflow-y: auto; max-height: 60vh;">
          <!-- Items injected via JS -->
        </div>
      </div>

      <!-- BOTTOM SHEET PROGRAM -->
      <div id="sheet-program" style="display: none; position: absolute; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-radius: 12px 12px 0 0; padding: 24px 16px; z-index: 101; flex-direction: column;">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: #111111; text-align: center; margin: 0 0 16px 0;">Pilih Program Pembibitan</h3>
        <div id="list-program" style="display: flex; flex-direction: column; border: 1px solid #D9D9D9; border-radius: 6px; overflow-y: auto; max-height: 60vh;">
          <!-- Items injected via JS -->
        </div>
      </div>

      <!-- BOTTOM SHEET KEMBALI -->
      <div id="sheet-kembali" style="display: none; position: absolute; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-radius: 12px 12px 0 0; padding: 24px 16px; z-index: 101; flex-direction: column;">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: #111111; text-align: center; margin: 0 0 12px 0;">Simpan Perubahan?</h3>
        <p style="font-size: 0.95rem; color: #666666; text-align: center; margin: 0 0 24px 0;">Anda memiliki data yang sedang diisi/diubah. Apakah Anda ingin menyimpannya terlebih dahulu?</p>
        <div style="display: flex; gap: 12px; margin-bottom: 12px;">
          <button id="btn-kembali-batal" type="button" style="flex: 1; height: 48px; background: #FFFFFF; color: #D32F2F; border: 1px solid #D32F2F; border-radius: 6px; font-weight: 700; font-size: 1rem;">Buang</button>
          <button id="btn-kembali-simpan" type="button" style="flex: 1; height: 48px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 1rem;">Simpan</button>
        </div>
        <button id="btn-kembali-tutup" type="button" style="width: 100%; height: 48px; background: transparent; color: #116834; border: none; font-weight: 600; font-size: 0.95rem;">Kembali Edit</button>
      </div>

      <!-- BOTTOM SHEET SUMBER -->
      <div id="sheet-sumber" style="display: none; position: absolute; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-radius: 12px 12px 0 0; padding: 24px 16px; z-index: 101; flex-direction: column;">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: #111111; text-align: center; margin: 0 0 16px 0;">Pilih Asal Benih / Rekanan</h3>
        <div id="list-sumber" style="display: flex; flex-direction: column; border: 1px solid #D9D9D9; border-radius: 6px; overflow-y: auto; max-height: 60vh;">
          <!-- Items injected via JS -->
        </div>
      </div>

      <!-- BOTTOM SHEET BATCH MANUAL -->
      <div id="sheet-batch" style="display: none; position: absolute; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-radius: 12px 12px 0 0; padding: 24px 16px; z-index: 101; flex-direction: column;">
        <h3 style="font-size: 1.05rem; font-weight: 700; color: #111111; text-align: center; margin: 0 0 16px 0;">Pilih Batch Manual</h3>
        <div id="list-batch" style="display: flex; flex-direction: column; border: 1px solid #D9D9D9; border-radius: 6px; overflow-y: auto; max-height: 60vh;">
          <!-- Items injected via JS -->
        </div>
      </div>

      <!-- FAKE QR SCANNER OVERLAY -->
      <div id="qr-camera-overlay" style="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #000000; z-index: 200; flex-direction: column;">
        <header style="display: flex; align-items: center; justify-content: space-between; padding: 16px;">
          <button id="btn-close-qr" type="button" style="background: none; border: none; color: #FFFFFF; padding: 8px; cursor: pointer;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <span style="color: #FFFFFF; font-weight: 600; font-size: 1rem;">Scan QR Batch</span>
          <div style="width: 40px;"></div>
        </header>
        <div style="flex: 1; display: flex; align-items: center; justify-content: center; position: relative;">
          <div style="width: 250px; height: 250px; border: 2px solid #4CAF50; position: relative;">
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 2px; background: #4CAF50; animation: scan 2s linear infinite;"></div>
          </div>
        </div>
        <div style="padding: 32px; display: flex; justify-content: center;">
          <button id="btn-simulate-scan" type="button" style="background: #4CAF50; color: #FFFFFF; border: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; font-size: 1rem; cursor: pointer;">
            [Simulasi] Scan Berhasil (Batch-03)
          </button>
        </div>
        <style>
          @keyframes scan {
            0% { top: 0; }
            50% { top: 100%; }
            100% { top: 0; }
          }
        </style>
      </div>

      <!-- BOTTOM SHEET KONFIRMASI SIMPAN -->
      <div id="sheet-konfirmasi" style="display: none; position: absolute; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-radius: 16px 16px 0 0; padding: 32px 16px 24px; z-index: 101; flex-direction: column; align-items: center; box-shadow: 0 -4px 12px rgba(0,0,0,0.1);">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="#000000" style="margin-bottom: 16px;">
          <rect x="2" y="5" width="20" height="6" rx="1" />
          <circle cx="6" cy="8" r="2" fill="#FFFFFF" />
          <rect x="2" y="13" width="20" height="6" rx="1" />
          <circle cx="6" cy="16" r="2" fill="#FFFFFF" />
        </svg>
        <h3 style="font-size: 1.2rem; font-weight: 700; color: #111111; margin: 0 0 8px 0;">Konfirmasi Simpan</h3>
        <p style="font-size: 0.95rem; color: #333333; text-align: center; margin: 0 0 24px 0; line-height: 1.5;">
          Apakah anda setuju menyimpan<br><strong>Dokumen Penerimaan</strong> ini?
        </p>
        <div style="display: flex; gap: 12px; width: 100%;">
          <button id="btn-konfirm-batal" type="button" style="flex: 1; padding: 14px; background: #FFFFFF; border: 1px solid #356943; border-radius: 6px; color: #356943; font-weight: 700; font-size: 1rem; cursor: pointer;">Kembali</button>
          <button id="btn-konfirm-simpan" type="button" style="flex: 1; padding: 14px; background: #356943; border: none; border-radius: 6px; color: #FFFFFF; font-weight: 700; font-size: 1rem; cursor: pointer;">Simpan</button>
        </div>
      </div>
    </div>
  `;

  // DATA DUMMY
  const batchData = [
    'Batch-01', 'Batch-02', 'Batch-03', 'Batch-04', 'Batch-05'
  ];

  const programData = [
    { id: '1', code: 'PRG/NUR/01/2026' },
    { id: '2', code: 'PRG/NUR/02/2027' },
    { id: '3', code: 'PRG/NUR/03/2028' },
    { id: '4', code: 'PRG/NUR/08/2029' }
  ];

  let sumberData = [];
  if (originTypeRaw === 'KEBUN_SENDIRI') {
    sumberData = [
      { id: 'DIV1', name: 'Divisi I' },
      { id: 'DIV2', name: 'Divisi II' },
      { id: 'DIV3', name: 'Divisi III' },
      { id: 'DIVK', name: 'Divisi Kantor' },
      { id: 'DIVP', name: 'Divisi Pabrik' }
    ];
  } else if (originTypeRaw === 'LAINNYA') {
    sumberData = [
      { id: 'AL', name: 'AL - Aek Loba' },
      { id: 'AP', name: 'AP - Aek Pamienke' },
      { id: 'BB', name: 'BB - Bangun Bandar' },
      { id: 'LB', name: 'LB - Lae Butar' },
      { id: 'MP', name: 'MP - Mata Pao' },
      { id: 'NL', name: 'NL - Negeri Lama' },
      { id: 'SL', name: 'SL - Sei Liput' },
      { id: 'SG', name: 'SG - Seunagan' },
      { id: 'SY', name: 'SY - Seumanyam' },
      { id: 'SSPL', name: 'SSPL - Socfindo Seed Production & Laboratory' },
      { id: 'TB', name: 'TB - Tanah Besih' },
      { id: 'TG', name: 'TG - Tanah Gambus' }
    ];
  } else {
    sumberData = [
      { id: 'S1', name: 'UD Ganang Jaya' },
      { id: 'S2', name: 'UD Semesta Benih' },
      { id: 'S3', name: 'UD Mitra Sejati' },
      { id: 'S4', name: 'UD Tani Makmur' },
      { id: 'S5', name: 'UD Sumber Rezeki' },
      { id: 'S6', name: 'UD Karya Benih' },
      { id: 'S7', name: 'UD Maju Bersama' },
      { id: 'S8', name: 'UD Berkah Tani' }
    ];
  }

  // DOM ELEMENTS
  const btnBack = app.querySelector('#btn-back');
  const btnSimpan = app.querySelector('#btn-simpan');
  const labelJenis = app.querySelector('#label-jenis');
  const labelTahapan = app.querySelector('#label-tahapan');
  const labelProgram = app.querySelector('#label-program');
  const labelSumber = app.querySelector('#label-sumber');
  const btnJenis = app.querySelector('#btn-jenis');
  const btnTahapan = app.querySelector('#btn-tahapan');
  const iconTahapan = app.querySelector('#icon-tahapan');
  const btnProgram = app.querySelector('#btn-program');
  const btnSumber = app.querySelector('#btn-sumber');

  const overlay = app.querySelector('#modal-overlay');
  const sheetJenis = app.querySelector('#sheet-jenis');
  const sheetTahapan = app.querySelector('#sheet-tahapan');
  const sheetProgram = app.querySelector('#sheet-program');
  const sheetSumber = app.querySelector('#sheet-sumber');
  const listJenis = app.querySelector('#list-jenis');
  const listTahapan = app.querySelector('#list-tahapan');
  const listProgram = app.querySelector('#list-program');
  const listSumber = app.querySelector('#list-sumber');

  const btnTambahFoto = app.querySelector('#btn-tambah-foto');
  const photoPreviewContainer = app.querySelector('#photo-preview-container');
  const btnTambahSir = app.querySelector('#btn-tambah-sir');
  
  const containerReceiptRows = app.querySelector('#container-receipt-rows');
  const btnTambahData = app.querySelector('#btn-tambah-data');
  const totalQtyEl = app.querySelector('#total-qty');
  const totalRejectedEl = app.querySelector('#total-rejected');

  const sheetKonfirmasi = app.querySelector('#sheet-konfirmasi');
  const btnKonfirmBatal = app.querySelector('#btn-konfirm-batal');
  const btnKonfirmSimpan = app.querySelector('#btn-konfirm-simpan');
  
  const sectionQrBatch = app.querySelector('#section-qr-batch');
  const btnScanQr = app.querySelector('#btn-scan-qr');
  const btnPilihBatch = app.querySelector('#btn-pilih-batch');
  const selectedBatchContainer = app.querySelector('#selected-batch-container');
  const selectedBatchText = app.querySelector('#selected-batch-text');
  const btnHapusBatch = app.querySelector('#btn-hapus-batch');
  
  const sheetBatch = app.querySelector('#sheet-batch');
  const listBatch = app.querySelector('#list-batch');
  const qrCameraOverlay = app.querySelector('#qr-camera-overlay');
  
  function updateBatchVisibility() {
    if (state.jenisPenerimaan === 'Bibit / Tanaman Muda' && state.tahapanPertumbuhan === 'Rubber Advance Planting Material') {
      sectionQrBatch.style.display = 'block';
    } else {
      sectionQrBatch.style.display = 'none';
      state.batchCode = null;
      storage.remove('benih_batch_code');
    }
    
    if (state.batchCode) {
      selectedBatchContainer.style.display = 'flex';
      selectedBatchText.textContent = state.batchCode;
    } else {
      selectedBatchContainer.style.display = 'none';
    }
  }

  // RENDER LISTS
  function renderJenisList() {
    const jenisData = [
      'Benih / Biji Kelatak',
      'Bibit / Tanaman Muda'
    ];
    listJenis.innerHTML = jenisData.map((j, idx) => `
      <div class="item-jenis" data-val="${j}" style="display: flex; justify-content: space-between; padding: 16px; background: ${state.jenisPenerimaan === j ? '#E8F5E9' : '#FFFFFF'}; border-bottom: ${idx === jenisData.length - 1 ? 'none' : '1px solid #D9D9D9'}; cursor: pointer;">
        <span style="font-size: 0.95rem; color: #111111; font-weight: ${state.jenisPenerimaan === j ? '700' : '400'};">${j}</span>
        <span style="font-size: 0.95rem; color: #116834; font-weight: 600;">Pilih</span>
      </div>
    `).join('');

    listJenis.querySelectorAll('.item-jenis').forEach(el => {
      el.addEventListener('click', () => {
        state.jenisPenerimaan = el.dataset.val;
        storage.set('benih_jenis', state.jenisPenerimaan);
        
        labelJenis.textContent = state.jenisPenerimaan;
        const headerTitle = app.querySelector('#header-title');
        
        // Handle Tahapan Pertumbuhan Logic
        if (state.jenisPenerimaan === 'Benih / Biji Kelatak') {
          if (headerTitle) headerTitle.textContent = 'Penerimaan Benih / Biji Kelatak';
          state.tahapanPertumbuhan = 'Rubber Main Nursery';
          storage.set('benih_tahapan', state.tahapanPertumbuhan);
          labelTahapan.textContent = state.tahapanPertumbuhan;
          btnTahapan.style.background = '#EFEFEF';
          btnTahapan.style.cursor = 'not-allowed';
          iconTahapan.style.display = 'none';
        } else {
          if (headerTitle) headerTitle.textContent = 'Penerimaan Bibit';
          if (state.tahapanPertumbuhan === 'Rubber Advance Planting Material' && state.jenisPenerimaan === 'Bibit / Tanaman Muda') {
            labelTahapan.parentElement.style.background = '#FFFFFF';
            iconTahapan.style.display = 'block';
            labelTahapan.parentElement.style.cursor = 'pointer';
          }
          btnTahapan.style.background = '#FFFFFF';
          btnTahapan.style.cursor = 'pointer';
          iconTahapan.style.display = 'block';
        }
        
        updateBatchVisibility();
        closeModals();
        validateForm();
      });
    });
  }

  function renderTahapanList() {
    const tahapanData = [
      'Rubber Main Nursery',
      'Rubber Advance Planting Material'
    ];
    listTahapan.innerHTML = tahapanData.map((t, idx) => `
      <div class="item-tahapan" data-val="${t}" style="display: flex; justify-content: space-between; padding: 16px; background: ${state.tahapanPertumbuhan === t ? '#E8F5E9' : '#FFFFFF'}; border-bottom: ${idx === tahapanData.length - 1 ? 'none' : '1px solid #D9D9D9'}; cursor: pointer;">
        <span style="font-size: 0.95rem; color: #111111; font-weight: ${state.tahapanPertumbuhan === t ? '700' : '400'};">${t}</span>
        <span style="font-size: 0.95rem; color: #116834; font-weight: 600;">Pilih</span>
      </div>
    `).join('');

    listTahapan.querySelectorAll('.item-tahapan').forEach(el => {
      el.addEventListener('click', () => {
        state.tahapanPertumbuhan = el.dataset.val;
        storage.set('benih_tahapan', state.tahapanPertumbuhan);
        
        labelTahapan.textContent = state.tahapanPertumbuhan;
        updateBatchVisibility();
        closeModals();
        validateForm();
      });
    });
  }

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
  
  function renderBatchList() {
    listBatch.innerHTML = batchData.map((b, idx) => `
      <div class="item-batch" data-code="${b}" style="display: flex; justify-content: space-between; padding: 16px; background: ${state.batchCode === b ? '#E8F5E9' : '#FFFFFF'}; border-bottom: ${idx === batchData.length - 1 ? 'none' : '1px solid #D9D9D9'}; cursor: pointer;">
        <span style="font-size: 0.95rem; color: #111111; font-weight: ${state.batchCode === b ? '700' : '400'};">${b}</span>
        <span style="font-size: 0.95rem; color: #116834; font-weight: 600;">Pilih</span>
      </div>
    `).join('');

    listBatch.querySelectorAll('.item-batch').forEach(el => {
      el.addEventListener('click', () => {
        state.batchCode = el.dataset.code;
        storage.set('benih_batch_code', state.batchCode);
        
        updateBatchVisibility();
        closeModals();
        validateForm();
      });
    });
  }

  // TABLE LOGIC
  function renderTableRows() {
    containerReceiptRows.innerHTML = state.tableRows.map((row, index) => `
      <div class="receipt-row" data-index="${index}" style="display: grid; grid-template-columns: 1.1fr 1fr 1.5fr; border-bottom: 1px solid #D1CDCD; align-items: center; position: relative; background: #FFFFFF;">
        
        <!-- Klon -->
        <div style="padding: 8px 6px; border-right: 1px solid #D1CDCD; position: relative;">
           <select class="input-klon" data-index="${index}" style="width: 100%; border: 1px solid #D1D5DB; border-radius: 4px; background: #FFFFFF; font-size: 0.80rem; outline: none; appearance: none; padding: 6px 18px 6px 6px; color: ${row.klon ? '#111' : '#999'}; box-sizing: border-box;">
             <option value="" disabled ${!row.klon ? 'selected' : ''} hidden>Pilih Klon</option>
             <option value="IRCA120" ${row.klon === 'IRCA120' ? 'selected' : ''}>IRCA120</option>
             <option value="IRR300" ${row.klon === 'IRR300' ? 'selected' : ''}>IRR300</option>
             <option value="GT1" ${row.klon === 'GT1' ? 'selected' : ''}>GT1</option>
             <option value="PB260" ${row.klon === 'PB260' ? 'selected' : ''}>PB260</option>
           </select>
           <svg viewBox="0 0 24 24" width="12" height="12" stroke="#6B7280" stroke-width="2" fill="none" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none;"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
        
        <!-- Banyaknya -->
        <div style="padding: 8px 6px; border-right: 1px solid #D1CDCD; display: flex; align-items: center;">
           <input type="number" class="input-qty" data-index="${index}" placeholder="0" value="${row.qty || ''}" style="width: 100%; border: 1px solid #D1D5DB; border-radius: 4px; background: #FFFFFF; font-size: 0.80rem; outline: none; padding: 6px 6px; text-align: center; color: #111; box-sizing: border-box;" />
        </div>
        
        <!-- Diseleksi: Input Nilai + Alasan Simetris -->
        <div style="padding: 8px 6px; display: flex; gap: 4px; align-items: center; min-width: 0;">
           <input type="number" class="input-rejected" data-index="${index}" placeholder="0" value="${row.rejected !== undefined && row.rejected !== '' ? row.rejected : ''}" style="width: 52px; min-width: 48px; border: 1px solid #D1D5DB; border-radius: 4px; background: #FFFFFF; font-size: 0.80rem; outline: none; padding: 6px 4px; text-align: center; color: #111; box-sizing: border-box;" />
           
           <div style="position: relative; flex: 1; min-width: 0;">
             <select class="input-reason" data-index="${index}" style="width: 100%; border: 1px solid #D1D5DB; border-radius: 4px; background: ${parseInt(row.rejected || 0) > 0 ? '#FFFFFF' : '#F9FAFB'}; font-size: 0.76rem; outline: none; appearance: none; color: ${parseInt(row.rejected || 0) > 0 ? (row.reason ? '#111' : '#999') : '#9CA3AF'}; padding: 6px 16px 6px 4px; box-sizing: border-box;" ${parseInt(row.rejected || 0) > 0 ? '' : 'disabled'}>
               <option value="" disabled ${!row.reason ? 'selected' : ''} hidden>Alasan</option>
               <option value="Rusak" ${row.reason === 'Rusak' ? 'selected' : ''}>Rusak</option>
               <option value="Mati" ${row.reason === 'Mati' ? 'selected' : ''}>Mati</option>
               <option value="Afkir" ${row.reason === 'Afkir' ? 'selected' : ''}>Afkir</option>
             </select>
             <svg viewBox="0 0 24 24" width="12" height="12" stroke="#6B7280" stroke-width="2" fill="none" style="position: absolute; right: 4px; top: 50%; transform: translateY(-50%); pointer-events: none;"><polyline points="6 9 12 15 18 9"></polyline></svg>
           </div>
        </div>
        
        ${index > 0 ? `
        <!-- Hapus baris (Opsional) -->
        <button type="button" class="btn-hapus-row" data-index="${index}" style="position: absolute; top: -5px; right: -5px; width: 18px; height: 18px; background: #FFFFFF; border: 1px solid #D32F2F; border-radius: 50%; display: flex; justify-content: center; align-items: center; cursor: pointer; padding: 0; z-index: 10;">
          <svg viewBox="0 0 24 24" width="10" height="10" stroke="#D32F2F" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        ` : ''}
      </div>
    `).join('');

    bindTableEvents();
    calculateTotals();
  }

  function bindTableEvents() {
    containerReceiptRows.querySelectorAll('.input-klon').forEach(el => {
      el.addEventListener('change', (e) => {
        const index = e.target.dataset.index;
        state.tableRows[index].klon = e.target.value;
        e.target.style.color = '#111';
        saveTableState();
      });
    });
    
    containerReceiptRows.querySelectorAll('.input-qty').forEach(el => {
      el.addEventListener('input', (e) => {
        const index = e.target.dataset.index;
        state.tableRows[index].qty = e.target.value;
        saveTableState();
        calculateTotals();
      });
    });

    containerReceiptRows.querySelectorAll('.input-rejected').forEach(el => {
      el.addEventListener('input', (e) => {
        const index = e.target.dataset.index;
        const rawVal = e.target.value.trim();
        const val = rawVal === '' ? '' : parseInt(rawVal || 0);
        state.tableRows[index].rejected = val;
        
        const rowEl = e.target.closest('.receipt-row');
        const reasonSelect = rowEl ? rowEl.querySelector('.input-reason') : null;
        if (reasonSelect) {
          const hasReject = typeof val === 'number' && val > 0;
          reasonSelect.disabled = !hasReject;
          reasonSelect.style.background = hasReject ? '#FFFFFF' : '#F9FAFB';
          if (!hasReject) {
            state.tableRows[index].reason = '';
            reasonSelect.value = '';
            reasonSelect.style.color = '#9CA3AF';
          } else {
            reasonSelect.style.color = state.tableRows[index].reason ? '#111' : '#999';
          }
        }
        
        saveTableState();
        calculateTotals();
      });
    });

    containerReceiptRows.querySelectorAll('.input-reason').forEach(el => {
      el.addEventListener('change', (e) => {
        const index = e.target.dataset.index;
        state.tableRows[index].reason = e.target.value;
        e.target.style.color = '#111';
        saveTableState();
      });
    });
    
    containerReceiptRows.querySelectorAll('.btn-hapus-row').forEach(el => {
      el.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        state.tableRows.splice(index, 1);
        saveTableState();
        renderTableRows();
      });
    });
  }

  function calculateTotals() {
    let tQty = 0;
    let tRej = 0;
    state.tableRows.forEach(r => {
      tQty += parseInt(r.qty || 0);
      tRej += parseInt(r.rejected || 0);
    });
    totalQtyEl.textContent = tQty;
    totalRejectedEl.textContent = tRej;
  }

  function saveTableState() {
    storage.set('benih_table_rows', state.tableRows);
    validateForm();
  }

  btnTambahData?.addEventListener('click', () => {
    state.tableRows.push({ klon: '', qty: '', rejected: '', reason: '' });
    saveTableState();
    renderTableRows();
  });

  // MODAL LOGIC
  function closeModals() {
    overlay.style.display = 'none';
    sheetJenis.style.display = 'none';
    sheetTahapan.style.display = 'none';
    sheetProgram.style.display = 'none';
    sheetSumber.style.display = 'none';
    sheetKonfirmasi.style.display = 'none';
    sheetBatch.style.display = 'none';
    if (app.querySelector('#sheet-kembali')) app.querySelector('#sheet-kembali').style.display = 'none';
  }

  btnJenis.addEventListener('click', () => {
    // Disabled permanently per user requirement (now set via landing page buttons)
    return;
  });

  btnTahapan.addEventListener('click', () => {
    if (state.jenisPenerimaan === 'Benih / Biji Kelatak') return;
    renderTahapanList();
    overlay.style.display = 'block';
    sheetTahapan.style.display = 'flex';
  });

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
  
  btnPilihBatch.addEventListener('click', () => {
    renderBatchList();
    overlay.style.display = 'block';
    sheetBatch.style.display = 'flex';
  });
  
  btnScanQr.addEventListener('click', () => {
    qrCameraOverlay.style.display = 'flex';
  });
  
  app.querySelector('#btn-close-qr').addEventListener('click', () => {
    qrCameraOverlay.style.display = 'none';
  });
  
  app.querySelector('#btn-simulate-scan').addEventListener('click', () => {
    qrCameraOverlay.style.display = 'none';
    state.batchCode = 'Batch-03';
    storage.set('benih_batch_code', state.batchCode);
    updateBatchVisibility();
    validateForm();
  });
  
  btnHapusBatch.addEventListener('click', () => {
    state.batchCode = null;
    storage.remove('benih_batch_code');
    updateBatchVisibility();
    validateForm();
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
    let isValid = state.programNurseryId && originTypeRaw && state.sourceId;
    
    // Validate table if Kebun Sendiri or Lainnya
    if (originTypeRaw === 'KEBUN_SENDIRI' || originTypeRaw === 'LAINNYA') {
      const hasValidRow = state.tableRows.every(r => {
        if (!r.klon || parseInt(r.qty || 0) <= 0) return false;
        if (parseInt(r.rejected || 0) > 0 && !r.reason) return false;
        return true;
      });
      if (!hasValidRow || state.tableRows.length === 0) isValid = false;
    }
    
    // Validasi Foto: Wajib minimal 1 foto
    if (!state.photos || state.photos.length === 0) {
      isValid = false;
    }
    
    // Validasi Batch: jika wajib
    if (state.jenisPenerimaan === 'Bibit / Tanaman Muda' && state.tahapanPertumbuhan === 'Rubber Advance Planting Material') {
      if (!state.batchCode) {
        isValid = false;
      }
    }
    
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
    // Show confirmation dialog before going back
    overlay.style.display = 'block';
    app.querySelector('#sheet-kembali').style.display = 'flex';
  });
  
  app.querySelector('#btn-kembali-tutup').addEventListener('click', closeModals);
  
  app.querySelector('#btn-kembali-batal').addEventListener('click', () => {
    // Clear temp form storage and clear edit index
    storage.remove('benih_jenis');
    storage.remove('benih_tahapan');
    storage.remove('benih_program_id');
    storage.remove('benih_program_code');
    storage.remove('benih_source_id');
    storage.remove('benih_source_name');
    storage.remove('receipt_photos');
    storage.remove('selected_sir');
    storage.remove('selected_klon');
    storage.remove('benih_table_rows');
    storage.remove('benih_batch_code');
    storage.remove('editing_transaction_index');
    
    closeModals();
    navigate('/reception');
  });
  
  app.querySelector('#btn-kembali-simpan').addEventListener('click', () => {
    closeModals();
    if (!btnSimpan.disabled) {
      overlay.style.display = 'block';
      sheetKonfirmasi.style.display = 'flex';
    } else {
      // Show toast error
      const toast = document.createElement('div');
      toast.style.cssText = 'position: fixed; bottom: 24px; left: 16px; right: 16px; background: #D32F2F; color: #FFFFFF; padding: 16px; border-radius: 8px; font-weight: 600; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
      toast.textContent = 'Data belum lengkap untuk disimpan!';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    }
  });

  btnTambahSir.addEventListener('click', () => {
    navigate('/reception/benih/sir');
  });

  btnSimpan.addEventListener('click', () => {
    if (!btnSimpan.disabled) {
      overlay.style.display = 'block';
      sheetKonfirmasi.style.display = 'flex';
    }
  });

  btnKonfirmBatal.addEventListener('click', closeModals);

  btnKonfirmSimpan.addEventListener('click', () => {
    // Simpan dummy data ke storage untuk ditampilkan di landing page
    const today = new Date();
    const formattedDate = today.getDate().toString().padStart(2, '0') + '/' + (today.getMonth()+1).toString().padStart(2, '0') + '/' + today.getFullYear();
    
    let totalQtyTable = 0;
    if (originTypeRaw === 'KEBUN_SENDIRI' || originTypeRaw === 'LAINNYA') {
       state.tableRows.forEach(r => totalQtyTable += parseInt(r.qty || 0));
    }
    
    const newTx = {
      jenis: state.jenisPenerimaan,
      tahapan: state.tahapanPertumbuhan,
      program: state.programNurseryCode,
      klon: (originTypeRaw === 'KEBUN_SENDIRI' || originTypeRaw === 'LAINNYA') 
             ? (state.tableRows[0]?.klon || 'Klon GT-01') 
             : (selectedKlon ? selectedKlon.title : 'Klon GT-01'),
      tanggal: formattedDate,
      tipeAsal: originTypeDisplay,
      sumber: state.sourceName || '-',
      sir: (originTypeRaw === 'KEBUN_SENDIRI' || originTypeRaw === 'LAINNYA') ? '-' : (selectedSir ? selectedSir.issueNo : '-'),
      qty: (originTypeRaw === 'KEBUN_SENDIRI' || originTypeRaw === 'LAINNYA') ? totalQtyTable : (selectedSir ? selectedSir.qty : '-'),
      rawState: {
        originTypeRaw,
        jenisPenerimaan: state.jenisPenerimaan,
        tahapanPertumbuhan: state.tahapanPertumbuhan,
        programNurseryId: state.programNurseryId,
        programNurseryCode: state.programNurseryCode,
        sourceId: state.sourceId,
        sourceName: state.sourceName,
        photos: state.photos,
        tableRows: state.tableRows,
        batchCode: state.batchCode,
        selectedSir,
        selectedKlon
      }
    };
    
    const txs = storage.get('receipt_transactions', []);
    const editingIdx = storage.get('editing_transaction_index', null);
    
    if (editingIdx !== null) {
      txs[editingIdx] = newTx;
      storage.remove('editing_transaction_index');
    } else {
      txs.push(newTx);
    }
    storage.set('receipt_transactions', txs);
    
    // Clear temp form storage
    storage.remove('benih_jenis');
    storage.remove('benih_tahapan');
    storage.remove('benih_program_id');
    storage.remove('benih_program_code');
    storage.remove('benih_source_id');
    storage.remove('benih_source_name');
    storage.remove('receipt_photos');
    storage.remove('selected_sir');
    storage.remove('selected_klon');
    storage.remove('benih_table_rows');
    storage.remove('benih_batch_code');
    
    closeModals();
    
    // Show banner success
    const banner = document.createElement('div');
    banner.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; background: #689F38; color: white; text-align: center; padding: 12px; font-weight: 600; font-size: 0.95rem; z-index: 1000; transition: top 0.3s ease-out;';
    banner.textContent = 'Data berhasil disimpan';
    app.querySelector('.page').appendChild(banner);
    
    setTimeout(() => {
      navigate('/reception');
    }, 1000);
  });

  // Initial rendering
  if (originTypeRaw === 'KEBUN_SENDIRI' || originTypeRaw === 'LAINNYA') {
    renderTableRows();
  }
  renderPhotos();
  updateBatchVisibility();
  validateForm();
}
