import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { session } from '../../core/session.js';
import { formatDate, formatStandardDocNo, generateUniqueDocNo } from '../../core/utils.js';
import { toast } from '../../components/toast.js';

export function renderInspectionForm() {
  const app = document.getElementById('app');
  const user = session.get() || { name: 'Irwan Syah Putra', code: '1405482', position: 'Mantri Pembibitan' };
  const today = formatDate(new Date().toISOString());

  // Edit Mode Check
  const editingIdx = storage.get('editing_inspection_index', null);
  const isEditing = editingIdx !== null && editingIdx !== undefined && editingIdx !== '';
  const inspectionTxs = storage.get('inspection_transactions', []);
  const targetInsp = isEditing ? inspectionTxs[parseInt(editingIdx)] : null;

  // Selected budding transaction (supports both Grafting and Regrafting)
  const buddingTxs = storage.get('budding_transactions', []);
  const buddingIdx = storage.get('selected_inspection_budding_index', 0);
  const selectedBudding = buddingTxs[buddingIdx] || {
    batchNo: 'Batch-01',
    docNo: formatStandardDocNo(2026, 'OKL', 1),
    sourceDocNo: formatStandardDocNo(2026, 'APR', 1),
    type: 'GRAFTING',
    klonEntres: 'PB 260',
    klonRootstock: 'GT-01',
    bedengan: 'Bedengan 01',
    jumlah: 2000,
    tanggal: today,
    workers: [
      { id: 'W001', name: 'Ahmad Rifai', code: '104521', qty: 2000 }
    ]
  };

  const isRegrafting = selectedBudding.type === 'REGRAFTING';
  const batchNo = selectedBudding.batchNo || 'Batch-01';
  const docNo = selectedBudding.docNo || (isRegrafting ? 'OKL/REG/2026/01' : 'OKL/2026/01');
  const populasiDiokulasi = parseInt(selectedBudding.jumlah || 0);

  // Workers who performed grafting
  let workerList = selectedBudding.workers || [];
  if (workerList.length === 0) {
    workerList = [
      { id: 'W001', name: 'Ahmad Rifai', code: '104521', qty: populasiDiokulasi }
    ];
  }

  // Accumulated inspection stats for this budding record (excluding this transaction if editing)
  let alreadyInspected = 0;
  inspectionTxs.filter((insp, i) => {
    if (isEditing && i === parseInt(editingIdx)) return false;
    return insp.buddingDocNo === docNo;
  }).forEach(insp => {
    alreadyInspected += parseInt(insp.totalDiperiksa || (parseInt(insp.jumlahJadi || 0) + parseInt(insp.jumlahGagal || 0)));
  });

  const sisaBelumDiperiksa = Math.max(0, populasiDiokulasi - alreadyInspected);

  // Validasi: Jika status sudah selesai diperiksa dan bukan edit mode, blokir form dan redirect
  if (!isEditing && sisaBelumDiperiksa <= 0) {
    navigate('/inspection');
    return;
  }

  // Helper: Format Timestamp DD/MM/YYYY HH:mm:ss
  function getFormattedTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const day = pad(now.getDate());
    const month = pad(now.getMonth() + 1);
    const year = now.getFullYear();
    const hours = pad(now.getHours());
    const mins = pad(now.getMinutes());
    const secs = pad(now.getSeconds());
    return `${day}/${month}/${year} ${hours}:${mins}:${secs}`;
  }

  // Helper: Ambil Posisi GPS (Latitude & Longitude)
  function getGPSCoordinates() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ ok: false, error: 'Geolocation tidak didukung browser/perangkat ini.' });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6));
          const lng = parseFloat(pos.coords.longitude.toFixed(6));
          resolve({ ok: true, lat, lng });
        },
        (err) => {
          let errMsg = 'Gagal mengakses GPS.';
          if (err.code === 1) errMsg = 'Izin lokasi (GPS) belum diizinkan oleh pengguna.';
          else if (err.code === 2) errMsg = 'Posisi GPS tidak tersedia / tidak terdeteksi.';
          else if (err.code === 3) errMsg = 'Waktu permintaan GPS habis (Timeout).';
          resolve({ ok: false, error: errMsg });
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
      );
    });
  }

  // Form State dengan normalisasi metadata foto
  const state = {
    photos: (isEditing && targetInsp?.photos)
      ? targetInsp.photos.map((p) => {
          if (typeof p === 'string') {
            return {
              image: p,
              capturedAt: targetInsp.tanggal || today,
              latitude: null,
              longitude: null
            };
          }
          return {
            image: p.image || p,
            capturedAt: p.capturedAt || targetInsp?.tanggal || today,
            latitude: p.latitude !== undefined ? p.latitude : null,
            longitude: p.longitude !== undefined ? p.longitude : null
          };
        })
      : []
  };

  let pendingCapturedPhoto = null;

  app.innerHTML = `
    <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; overflow-x: hidden; box-sizing: border-box; position: relative;">
      
      <!-- HEADER -->
      <header style="display: flex; align-items: center; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #D9D9D9; flex-shrink: 0;">
        <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
        </button>
        <h1 style="font-size: 1.05rem; font-weight: 700; color: #111111; margin: 0 0 0 8px; letter-spacing: -0.01em;">
          ${isEditing ? 'Edit Pemeriksaan' : 'Rekam Pemeriksaan'}
        </h1>
      </header>

      <!-- SCROLLABLE CONTENT -->
      <main style="flex: 1; overflow-y: auto; overflow-x: hidden; padding-bottom: 24px; box-sizing: border-box;">
        
        <!-- INFORMASI MANTRI & TANGGAL -->
        <section style="display: flex; justify-content: space-between; align-items: flex-start; padding: 14px 16px; border-bottom: 1px solid #E5E7EB; gap: 12px;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 0.88rem; font-weight: 700; color: #111111; margin-bottom: 2px;">${user.name}</div>
            <div style="font-size: 0.74rem; color: #6B7280;">${user.code}-${user.position}</div>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <div style="font-size: 0.72rem; font-weight: 600; color: #6B7280; margin-bottom: 2px;">Tanggal Pemeriksaan</div>
            <div style="font-size: 0.85rem; color: #111111; font-weight: 700;">${isEditing && targetInsp?.tanggal ? targetInsp.tanggal : today}</div>
          </div>
        </section>

        <!-- INFORMASI BATCH OKULASI ASAL -->
        <section style="padding: 14px 16px; border-bottom: 1px solid #E5E7EB; background: #F9FAFB;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <h2 style="font-size: 0.88rem; font-weight: 700; color: #111111; margin: 0;">Informasi Batch Okulasi</h2>
              <span style="background: ${isRegrafting ? '#FFF8E1' : '#E8F5E9'}; color: ${isRegrafting ? '#B45309' : '#116834'}; font-size: 0.65rem; font-weight: 700; padding: 2px 6px; border-radius: 4px; border: ${isRegrafting ? '1px solid #FFE082' : '1px solid #C8E6C9'}; white-space: nowrap;">
                ${isRegrafting ? 'Okulasi Janda (Regrafting)' : 'Okulasi (Grafting)'}
              </span>
            </div>
            ${isEditing ? `
              <span style="background: #E0F2FE; color: #0284C7; font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; border: 1px solid #BAE6FD;">
                Mode Edit (${targetInsp?.docNo || '2026/INS/001'})
              </span>
            ` : ''}
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; font-size: 0.76rem;">
            <div>
              <span style="color: #6B7280;">Nomor Batch:</span>
              <div style="font-weight: 700; color: #116834; font-size: 0.84rem; margin-top: 1px;">${batchNo}</div>
            </div>
            <div>
              <span style="color: #6B7280;">Dokumen Okulasi:</span>
              <div style="font-weight: 700; color: #111; font-size: 0.80rem; margin-top: 1px; word-break: break-all;">${docNo}</div>
            </div>
            <div>
              <span style="color: #6B7280;">Lokasi Bedengan:</span>
              <div style="font-weight: 700; color: #111; font-size: 0.80rem; margin-top: 1px;">${selectedBudding.bedengan || 'Bedengan 01'}</div>
            </div>
            <div>
              <span style="color: #6B7280;">Klon Entres:</span>
              <div style="font-weight: 700; color: #116834; font-size: 0.80rem; margin-top: 1px;">${selectedBudding.klonEntres || 'PB 260'}</div>
            </div>
            <div>
              <span style="color: #6B7280;">Klon Batang Bawah:</span>
              <div style="font-weight: 700; color: #111; font-size: 0.80rem; margin-top: 1px;">${selectedBudding.klonRootstock || 'GT-01'}</div>
            </div>
            <div>
              <span style="color: #6B7280;">${isRegrafting ? 'Populasi Regrafting:' : 'Populasi Diokulasi:'}</span>
              <span style="font-weight: 700; color: #116834; font-size: 0.82rem; margin-left: 2px;">${populasiDiokulasi} Pkk</span>
            </div>
          </div>

          <div style="margin-top: 10px; padding: 8px 12px; background: #E8F5E9; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #C8E6C9;">
            <span style="font-size: 0.74rem; font-weight: 700; color: #116834;">Sisa Bibit Belum Diperiksa:</span>
            <span style="font-size: 0.88rem; font-weight: 800; color: #116834;">${sisaBelumDiperiksa} Pkk</span>
          </div>
        </section>

        <!-- FORM INPUT PEMERIKSAAN PER OKULATOR (WORKER) -->
        <section style="padding: 14px 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h2 style="font-size: 0.88rem; font-weight: 700; color: #111111; margin: 0;">Hasil Pemeriksaan Okulator</h2>
            <span style="font-size: 0.70rem; color: #6B7280; font-weight: 600;">${workerList.length} Pekerja</span>
          </div>

          <div id="workers-inspection-container" style="display: flex; flex-direction: column; gap: 12px;">
            ${workerList.map((w) => {
              const prevWorker = targetInsp && targetInsp.workers ? targetInsp.workers.find(pw => pw.id === w.id) : null;
              const initDiperiksa = prevWorker ? prevWorker.jlhDiperiksa : (workerList.length === 1 ? sisaBelumDiperiksa : '');
              const initBerhasil = prevWorker ? prevWorker.jlhBerhasil : '';
              const initGagal = prevWorker ? prevWorker.jlhTidakBerhasil : '';
              const initRegraft = prevWorker ? prevWorker.perluRegrafting !== false : true;

              return `
                <div class="worker-inspection-card" data-id="${w.id}" style="background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.03); box-sizing: border-box;">
                  
                  <!-- NAMA PEKERJA & TOTAL POPULASI OKULASINYA -->
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div>
                      <div style="font-size: 0.82rem; font-weight: 700; color: #111827;">${w.name}</div>
                      <div style="font-size: 0.70rem; color: #6B7280;">NIK: ${w.code || '-'}</div>
                    </div>
                    <div style="text-align: right;">
                      <span style="font-size: 0.68rem; color: #6B7280; display: block;">Total Diokulasi:</span>
                      <span style="font-size: 0.80rem; font-weight: 800; color: #116834;">${w.qty || 0} Pkk</span>
                    </div>
                  </div>

                  <!-- 3 KOLOM INPUT: DIPERIKSA | BERHASIL | TIDAK BERHASIL -->
                  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 6px;">
                    <div>
                      <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #374151; margin-bottom: 4px;">Jlh Diperiksa <span style="color:#D32F2F;">*</span></label>
                      <input type="text" inputmode="numeric" class="inp-insp-diperiksa" data-id="${w.id}" placeholder="0" value="${initDiperiksa}" style="width: 100%; height: 36px; border: 1px solid #D1D5DB; border-radius: 4px; padding: 0 8px; font-size: 0.82rem; font-weight: 700; text-align: center; outline: none; box-sizing: border-box;">
                    </div>
                    <div>
                      <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #116834; margin-bottom: 4px;">Jlh Berhasil <span style="color:#D32F2F;">*</span></label>
                      <input type="text" inputmode="numeric" class="inp-insp-berhasil" data-id="${w.id}" placeholder="0" value="${initBerhasil}" style="width: 100%; height: 36px; border: 1px solid #D1D5DB; border-radius: 4px; padding: 0 8px; font-size: 0.82rem; font-weight: 700; text-align: center; color: #116834; outline: none; box-sizing: border-box;">
                    </div>
                    <div>
                      <label style="display: block; font-size: 0.68rem; font-weight: 700; color: #D32F2F; margin-bottom: 4px;">Tdk Berhasil <span style="color:#D32F2F;">*</span></label>
                      <input type="text" inputmode="numeric" class="inp-insp-gagal" data-id="${w.id}" placeholder="0" value="${initGagal}" style="width: 100%; height: 36px; border: 1px solid #D1D5DB; border-radius: 4px; padding: 0 8px; font-size: 0.82rem; font-weight: 700; text-align: center; color: #D32F2F; outline: none; box-sizing: border-box;">
                    </div>
                  </div>

                  <!-- % KEBERHASILAN INDIVIDUAL PEKERJA -->
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 6px; border-top: 1px dashed #E5E7EB;">
                    <span style="font-size: 0.70rem; color: #6B7280; font-weight: 600;">% Keberhasilan Okulator:</span>
                    <span class="lbl-worker-persen" data-id="${w.id}" style="font-size: 0.78rem; font-weight: 800; color: #116834; background: #E8F5E9; padding: 2px 8px; border-radius: 4px; border: 1px solid #C8E6C9;">0%</span>
                  </div>

                  <!-- CHECKBOX RE-GRAFTING JIKA ADA GAGAL -->
                  <div class="regrafting-toggle-container" data-id="${w.id}" style="display: none; margin-top: 8px; padding: 6px 10px; background: #FFFDE7; border: 1px solid #FFE082; border-radius: 6px; box-sizing: border-box;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.72rem; font-weight: 700; color: #374151; user-select: none;">
                        <input type="checkbox" class="chk-regrafting" data-id="${w.id}" ${initRegraft ? 'checked' : ''} style="width: 15px; height: 15px; accent-color: #116834; cursor: pointer;">
                        <span>Perlu Okulasi Janda</span>
                      </label>
                      <span class="lbl-allocation-badge" data-id="${w.id}" style="font-size: 0.68rem; font-weight: 700; color: #116834; background: #E8F5E9; padding: 2px 6px; border-radius: 4px; border: 1px solid #C8E6C9; white-space: nowrap;">
                        ➔ Okulasi Janda
                      </span>
                    </div>
                  </div>

                </div>
              `;
            }).join('')}
          </div>

          <!-- REKAP KESELURUHAN HASIL PEMERIKSAAN -->
          <div style="background: #F0FDF4; border: 1px solid #C8E6C9; border-radius: 8px; padding: 12px; margin-top: 14px;">
            <div style="font-size: 0.76rem; font-weight: 700; color: #116834; margin-bottom: 8px;">Ringkasan Total Pemeriksaan:</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 0.74rem;">
              <span style="color: #4B5563;">Total Jlh Diperiksa:</span>
              <span id="lbl-total-diperiksa" style="font-weight: 800; color: #111;">0 Pkk</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 0.74rem;">
              <span style="color: #116834; font-weight: 600;">Total Jlh Berhasil:</span>
              <span id="lbl-total-berhasil" style="font-weight: 800; color: #116834;">0 Pkk (0%)</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 0.74rem;">
              <span style="color: #D32F2F; font-weight: 600;">Total Jlh Tidak Berhasil:</span>
              <span id="lbl-total-gagal" style="font-weight: 800; color: #D32F2F;">0 Pkk (0%)</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px dashed #A7F3D0;">
              <span style="font-size: 0.76rem; font-weight: 700; color: #116834;">Tingkat Keberhasilan Batch:</span>
              <span id="lbl-persen-total" style="font-size: 0.95rem; font-weight: 800; color: #116834;">0%</span>
            </div>
            <div id="lbl-regrafting-note" style="display: none; margin-top: 8px; padding: 6px 8px; background: #FFF8E1; border: 1px solid #FFE082; border-radius: 4px; font-size: 0.70rem; color: #374151; font-weight: 600; line-height: 1.3;">
            </div>
          </div>

          <!-- CATATAN PEMERIKSAAN -->
          <div style="margin-top: 14px;">
            <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #374151; margin-bottom: 6px;">Catatan / Kondisi Bibit</label>
            <textarea id="inp-catatan" placeholder="Contoh: Kondisi mata entres sehat, balutan dibuka dengan baik..." style="width: 100%; height: 60px; border: 1px solid #D1D5DB; border-radius: 6px; padding: 8px 10px; font-size: 0.78rem; outline: none; box-sizing: border-box; resize: none;">${targetInsp?.catatan || ''}</textarea>
          </div>

          <!-- FOTO DOKUMENTASI LAPANGAN (INLINE PREVIEW) -->
          <div style="margin-top: 14px; background: #FAFAFA; border: 1px solid #E5E7EB; border-radius: 8px; padding: 14px; box-sizing: border-box;">
            <div style="margin-bottom: 10px;">
              <div style="font-size: 0.82rem; font-weight: 700; color: #111827;">Foto Dokumentasi Lapangan</div>
              <div style="font-size: 0.72rem; color: #6B7280; margin-top: 2px;">Tarik foto bukti fisik dengan timestamp & GPS</div>
            </div>

            <button id="btn-tambah-foto" type="button" style="width: 100%; height: 40px; background: #FFFFFF; border: 1.5px dashed #116834; border-radius: 6px; color: #116834; font-size: 0.80rem; font-weight: 700; display: flex; justify-content: center; align-items: center; gap: 8px; cursor: pointer; box-sizing: border-box; margin-bottom: 8px;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
              </svg>
              + Ambil Foto Baru
            </button>

            <!-- INLINE PHOTO PREVIEW (GRID) -->
            <div id="inline-photo-grid" style="display: none; margin-top: 6px;"></div>
          </div>

        </section>

      </main>

      <!-- BOTTOM ACTION -->
      <footer style="padding: 14px 16px; background: #FFFFFF; border-top: 1px solid #D9D9D9; flex-shrink: 0; box-sizing: border-box;">
        <button id="btn-simpan-pemeriksaan" type="button" style="width: 100%; height: 44px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.90rem; cursor: pointer;">
          ${isEditing ? 'Simpan Perubahan Pemeriksaan' : 'Simpan Data Pemeriksaan'}
        </button>
      </footer>

      <!-- MODAL OVERLAY & DIALOG VALIDASI -->
      <div id="modal-overlay" style="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100;"></div>
      <div id="dialog-validation" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 88%; max-width: 320px; background: #FFFFFF; border-radius: 12px; z-index: 102; padding: 20px 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); box-sizing: border-box; text-align: center;">
        <div style="width: 46px; height: 46px; border-radius: 50%; background: #FEE2E2; color: #DC2626; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3 style="font-size: 1rem; font-weight: 700; color: #111827; margin: 0 0 6px 0;">Data Belum Lengkap</h3>
        <p style="font-size: 0.74rem; color: #6B7280; margin: 0 0 12px 0; line-height: 1.35;">
          Mohon lengkapi dan periksa kolom yang masih kosong atau belum valid berikut ini:
        </p>
        <div id="dialog-error-list" style="text-align: left; background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 6px; padding: 10px 12px; margin-bottom: 16px; font-size: 0.72rem; color: #B91C1C; display: flex; flex-direction: column; gap: 4px; max-height: 160px; overflow-y: auto;">
        </div>
        <button id="btn-close-validation-dialog" type="button" style="width: 100%; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-size: 0.82rem; font-weight: 700; cursor: pointer;">
          Lengkapi Data
        </button>
      </div>

      <!-- CAMERA OVERLAY -->
      <div id="camera-overlay" style="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: #000000; z-index: 200; flex-direction: column;">
        <header style="display: flex; justify-content: space-between; align-items: center; padding: 16px; position: absolute; top: 0; left: 0; right: 0; z-index: 201;">
          <button id="btn-close-camera" type="button" style="background: rgba(0,0,0,0.5); border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; justify-content: center; align-items: center; cursor: pointer; color: #ffffff;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="#ffffff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <div style="color: #FFFFFF; font-size: 0.84rem; font-weight: 700; text-shadow: 0 1px 3px rgba(0,0,0,0.8);">
            Dokumentasi ${batchNo}
          </div>
          <div style="width: 40px;"></div>
        </header>

        <main style="flex: 1; display: flex; justify-content: center; align-items: center; overflow: hidden; position: relative;">
          <video id="camera-video" autoplay playsinline muted style="width: 100%; height: 100%; object-fit: cover;"></video>
          <canvas id="camera-canvas" style="display: none;"></canvas>
          <div id="camera-error" style="display: none; color: white; text-align: center; padding: 20px;">
            <div style="font-size: 2rem; margin-bottom: 8px;">📷</div>
            <p style="font-size: 0.90rem; font-weight: 700; margin: 0 0 4px 0;">Kamera tidak tersedia</p>
            <p style="font-size: 0.76rem; color: #9CA3AF; margin: 0;">Ketuk tombol rana putih untuk mengambil foto dokumentasi dengan timestamp & koordinat GPS aktual.</p>
          </div>
          
          <div id="camera-gps-status" style="position: absolute; top: 68px; left: 16px; right: 16px; background: rgba(0,0,0,0.65); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; padding: 6px 10px; color: #FFFFFF; font-size: 0.70rem; display: flex; align-items: center; gap: 6px; z-index: 202;">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10B981;"></span>
            <span id="txt-camera-gps-info">Menyiapkan koordinat GPS...</span>
          </div>
        </main>

        <footer style="padding: 24px; display: flex; justify-content: center; align-items: center; position: absolute; bottom: 0; left: 0; right: 0; z-index: 201; background: linear-gradient(to top, rgba(0,0,0,0.85), transparent);">
          <button id="btn-shutter" type="button" style="width: 72px; height: 72px; border-radius: 50%; background: transparent; border: 4px solid #ffffff; display: flex; justify-content: center; align-items: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
            <div style="width: 56px; height: 56px; background: #ffffff; border-radius: 50%;"></div>
          </button>
        </footer>
      </div>

      <!-- POPUP / FULLSCREEN IMAGE VIEWER -->
      <div id="modal-fullscreen-overlay" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.90); z-index: 500; backdrop-filter: blur(4px);"></div>
      <div id="modal-fullscreen-viewer" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); max-width: 95vw; max-height: 90vh; z-index: 501; flex-direction: column; align-items: center; justify-content: center;">
        <button id="btn-close-fullscreen-viewer" type="button" aria-label="Tutup" style="position: absolute; top: -46px; right: 0; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; color: #FFFFFF; cursor: pointer;">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <img id="img-fullscreen-target" src="" alt="Foto Dokumentasi Fullscreen" style="max-width: 95vw; max-height: 85vh; object-fit: contain; border-radius: 8px; box-shadow: 0 12px 36px rgba(0,0,0,0.7);">
      </div>

    </div>
  `;

  // Validation Dialog Handlers
  const overlay = app.querySelector('#modal-overlay');
  const dialogValidation = app.querySelector('#dialog-validation');
  const dialogErrorList = app.querySelector('#dialog-error-list');
  const btnCloseValidationDialog = app.querySelector('#btn-close-validation-dialog');

  function showValidationErrorDialog(errors) {
    if (dialogErrorList) {
      dialogErrorList.innerHTML = errors.map((err, i) => `
        <div style="display: flex; align-items: flex-start; gap: 6px;">
          <span style="font-weight: 700;">${i + 1}.</span>
          <span style="line-height: 1.3;">${err}</span>
        </div>
      `).join('');
    }
    overlay.style.display = 'block';
    dialogValidation.style.display = 'block';
  }

  function closeValidationDialog() {
    dialogValidation.style.display = 'none';
    overlay.style.display = 'none';
  }

  btnCloseValidationDialog.addEventListener('click', closeValidationDialog);
  overlay.addEventListener('click', closeValidationDialog);

  // Helper to sanitize numeric inputs
  function sanitizeInput(inp, maxVal) {
    let raw = (inp.value || '').replace(/[^0-9]/g, '');
    if (raw === '') return '';
    const maxDigits = String(maxVal).length;
    if (raw.length > maxDigits) {
      raw = raw.slice(0, maxDigits);
    }
    let num = parseInt(raw);
    if (num > maxVal) {
      num = maxVal;
      raw = String(maxVal);
    }
    inp.value = raw;
    return raw;
  }

  // Calculation per worker and totals
  function updateWorkerCalculations() {
    let grandDiperiksa = 0;
    let grandBerhasil = 0;
    let grandGagal = 0;
    let totalToRegrafting = 0;
    let totalToSelection = 0;

    app.querySelectorAll('.worker-inspection-card').forEach(card => {
      const wid = card.dataset.id;
      const targetWorker = workerList.find(w => w.id === wid);
      const wMax = parseInt(targetWorker?.qty || 0);

      const inpDiperiksa = card.querySelector('.inp-insp-diperiksa');
      const inpBerhasil = card.querySelector('.inp-insp-berhasil');
      const inpGagal = card.querySelector('.inp-insp-gagal');
      const lblPersen = card.querySelector('.lbl-worker-persen');
      const regraftToggleContainer = card.querySelector('.regrafting-toggle-container');
      const chkRegrafting = card.querySelector('.chk-regrafting');
      const destBadge = card.querySelector('.lbl-allocation-badge');

      const diperiksaVal = inpDiperiksa?.value.trim();
      const berhasilVal = inpBerhasil?.value.trim();
      const gagalVal = inpGagal?.value.trim();

      const diperiksa = parseInt(diperiksaVal || 0);
      const berhasil = parseInt(berhasilVal || 0);
      const gagal = parseInt(gagalVal || 0);

      // Highlight boundary errors
      if (diperiksa > wMax && wMax > 0) {
        inpDiperiksa.style.borderColor = '#D32F2F';
        inpDiperiksa.style.color = '#D32F2F';
      } else {
        inpDiperiksa.style.borderColor = '#D1D5DB';
        inpDiperiksa.style.color = '#111111';
      }

      if (diperiksaVal !== '' && berhasilVal !== '' && gagalVal !== '' && (berhasil + gagal !== diperiksa)) {
        inpBerhasil.style.borderColor = '#D32F2F';
        inpGagal.style.borderColor = '#D32F2F';
      } else {
        inpBerhasil.style.borderColor = '#D1D5DB';
        inpGagal.style.borderColor = '#D1D5DB';
      }

      grandDiperiksa += diperiksa;
      grandBerhasil += berhasil;
      grandGagal += gagal;

      // Checkbox visibility & allocation badge
      if (gagal > 0) {
        if (regraftToggleContainer) regraftToggleContainer.style.display = 'block';
        const isRegraft = chkRegrafting ? chkRegrafting.checked : true;
        if (isRegraft) {
          totalToRegrafting += gagal;
          if (destBadge) {
            destBadge.textContent = '➔ Okulasi Janda';
            destBadge.style.color = '#116834';
            destBadge.style.background = '#E8F5E9';
            destBadge.style.borderColor = '#C8E6C9';
          }
        } else {
          totalToSelection += gagal;
          if (destBadge) {
            destBadge.textContent = '➔ Penyeleksian (Afkir)';
            destBadge.style.color = '#DC2626';
            destBadge.style.background = '#FEE2E2';
            destBadge.style.borderColor = '#FECACA';
          }
        }
      } else {
        if (regraftToggleContainer) regraftToggleContainer.style.display = 'none';
      }

      // Worker % success
      const workerPersen = diperiksa > 0 ? Math.round((berhasil / diperiksa) * 100) : 0;
      if (lblPersen) {
        lblPersen.textContent = `${workerPersen}%`;
        if (workerPersen >= 80) {
          lblPersen.style.color = '#116834';
          lblPersen.style.background = '#E8F5E9';
          lblPersen.style.borderColor = '#C8E6C9';
        } else if (workerPersen >= 60) {
          lblPersen.style.color = '#D97706';
          lblPersen.style.background = '#FEF3C7';
          lblPersen.style.borderColor = '#FDE68A';
        } else {
          lblPersen.style.color = '#DC2626';
          lblPersen.style.background = '#FEE2E2';
          lblPersen.style.borderColor = '#FECACA';
        }
      }
    });

    // Overall summary updates
    const lblGrandDiperiksa = app.querySelector('#lbl-total-diperiksa');
    const lblGrandBerhasil = app.querySelector('#lbl-total-berhasil');
    const lblGrandGagal = app.querySelector('#lbl-total-gagal');
    const lblPersenTotal = app.querySelector('#lbl-persen-total');
    const lblRegraftNote = app.querySelector('#lbl-regrafting-note');

    const persenGrand = grandDiperiksa > 0 ? Math.round((grandBerhasil / grandDiperiksa) * 100) : 0;
    const persenGagalGrand = grandDiperiksa > 0 ? Math.round((grandGagal / grandDiperiksa) * 100) : 0;

    if (lblGrandDiperiksa) lblGrandDiperiksa.textContent = `${grandDiperiksa} Pkk`;
    if (lblGrandBerhasil) lblGrandBerhasil.textContent = `${grandBerhasil} Pkk (${persenGrand}%)`;
    if (lblGrandGagal) lblGrandGagal.textContent = `${grandGagal} Pkk (${persenGagalGrand}%)`;
    if (lblPersenTotal) lblPersenTotal.textContent = `${persenGrand}%`;

    if (lblRegraftNote) {
      if (grandGagal > 0) {
        lblRegraftNote.style.display = 'block';
        const parts = [];
        if (totalToRegrafting > 0) parts.push(`<strong>${totalToRegrafting} Pkk</strong> dialokasikan ke antrean <em>Okulasi Janda</em>`);
        if (totalToSelection > 0) parts.push(`<strong>${totalToSelection} Pkk</strong> dialokasikan ke antrean <em>Penyeleksian (Afkir)</em>`);
        lblRegraftNote.innerHTML = `⚠️ Terdapat bibit tidak berhasil: ${parts.join(' dan ')}.`;
      } else {
        lblRegraftNote.style.display = 'none';
      }
    }

    return { grandDiperiksa, grandBerhasil, grandGagal, totalToRegrafting, totalToSelection };
  }

  // Attach input listeners
  app.querySelectorAll('.worker-inspection-card').forEach(card => {
    const wid = card.dataset.id;
    const targetWorker = workerList.find(w => w.id === wid);
    const wMax = parseInt(targetWorker?.qty || 0);

    const inpDiperiksa = card.querySelector('.inp-insp-diperiksa');
    const inpBerhasil = card.querySelector('.inp-insp-berhasil');
    const inpGagal = card.querySelector('.inp-insp-gagal');
    const chkRegrafting = card.querySelector('.chk-regrafting');

    inpDiperiksa.addEventListener('input', () => {
      const dVal = sanitizeInput(inpDiperiksa, wMax);
      const bVal = inpBerhasil.value.trim();
      const gVal = inpGagal.value.trim();
      if (dVal !== '') {
        const d = parseInt(dVal);
        if (bVal !== '' && gVal === '') {
          inpBerhasil.value = Math.min(d, parseInt(bVal));
          inpGagal.value = Math.max(0, d - parseInt(inpBerhasil.value));
        } else if (gVal !== '' && bVal === '') {
          inpGagal.value = Math.min(d, parseInt(gVal));
          inpBerhasil.value = Math.max(0, d - parseInt(inpGagal.value));
        }
      }
      updateWorkerCalculations();
    });

    inpBerhasil.addEventListener('input', () => {
      const dVal = inpDiperiksa.value.trim();
      const currentLimit = dVal !== '' ? parseInt(dVal) : wMax;
      const bVal = sanitizeInput(inpBerhasil, currentLimit);
      
      if (dVal !== '' && bVal !== '') {
        const d = parseInt(dVal);
        const b = parseInt(bVal);
        inpGagal.value = Math.max(0, d - b);
      }
      updateWorkerCalculations();
    });

    inpGagal.addEventListener('input', () => {
      const dVal = inpDiperiksa.value.trim();
      const currentLimit = dVal !== '' ? parseInt(dVal) : wMax;
      const gVal = sanitizeInput(inpGagal, currentLimit);
      
      if (dVal !== '' && gVal !== '') {
        const d = parseInt(dVal);
        const g = parseInt(gVal);
        inpBerhasil.value = Math.max(0, d - g);
      }
      updateWorkerCalculations();
    });

    if (chkRegrafting) {
      chkRegrafting.addEventListener('change', updateWorkerCalculations);
    }
  });

  // ==========================================
  // FOTO DOKUMENTASI LAPANGAN & INLINE PREVIEW
  // ==========================================
  const inlinePhotoGrid = app.querySelector('#inline-photo-grid');
  const btnTambahFoto = app.querySelector('#btn-tambah-foto');

  // Camera Elements
  const cameraOverlay = app.querySelector('#camera-overlay');
  const videoEl = app.querySelector('#camera-video');
  const canvasEl = app.querySelector('#camera-canvas');
  const errorEl = app.querySelector('#camera-error');
  const btnCloseCamera = app.querySelector('#btn-close-camera');
  const btnShutter = app.querySelector('#btn-shutter');
  const txtCameraGpsInfo = app.querySelector('#txt-camera-gps-info');
  let currentStream = null;
  let isCameraActive = false;

  // Fullscreen Image Viewer Modal Elements
  const modalFullscreenOverlay = app.querySelector('#modal-fullscreen-overlay');
  const modalFullscreenViewer = app.querySelector('#modal-fullscreen-viewer');
  const imgFullscreenTarget = app.querySelector('#img-fullscreen-target');
  const btnCloseFullscreenViewer = app.querySelector('#btn-close-fullscreen-viewer');

  // Helper Watermark Kanan Bawah
  function drawBottomRightWatermark(ctx, canvasWidth, canvasHeight, timeStr, dateStr, lat, lng) {
    const lines = [
      timeStr,
      dateStr,
      lat !== null && lat !== undefined ? `Lat: ${lat}` : 'Lat: -',
      lng !== null && lng !== undefined ? `Long: ${lng}` : 'Long: -'
    ];

    ctx.save();
    const fontSize = Math.max(11, Math.round(canvasWidth * 0.024));
    const lineHeight = fontSize + 4;
    const padX = Math.max(8, Math.round(canvasWidth * 0.02));
    const padY = Math.max(6, Math.round(canvasWidth * 0.015));

    ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace`;

    let maxTextWidth = 0;
    lines.forEach(l => {
      const w = ctx.measureText(l).width;
      if (w > maxTextWidth) maxTextWidth = w;
    });

    const boxWidth = maxTextWidth + (padX * 2);
    const boxHeight = (lines.length * lineHeight) + (padY * 2) - 4;
    const margin = Math.max(8, Math.round(canvasWidth * 0.02));
    const boxX = canvasWidth - boxWidth - margin;
    const boxY = canvasHeight - boxHeight - margin;

    // Background hitam/gelap transparan
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
      ctx.fill();
    } else {
      ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
    }

    // Teks putih
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    lines.forEach((l, i) => {
      ctx.fillText(l, boxX + padX, boxY + padY + (i * lineHeight));
    });
    ctx.restore();
  }

  // Fullscreen Viewer: Buka & Tutup
  function openFullscreenViewer(imgSrc) {
    if (!modalFullscreenViewer || !modalFullscreenOverlay || !imgFullscreenTarget) return;
    imgFullscreenTarget.src = imgSrc;
    modalFullscreenOverlay.style.display = 'block';
    modalFullscreenViewer.style.display = 'flex';
  }

  function closeFullscreenViewer() {
    if (modalFullscreenOverlay) modalFullscreenOverlay.style.display = 'none';
    if (modalFullscreenViewer) modalFullscreenViewer.style.display = 'none';
    if (imgFullscreenTarget) imgFullscreenTarget.src = '';
  }

  if (btnCloseFullscreenViewer) btnCloseFullscreenViewer.addEventListener('click', closeFullscreenViewer);
  if (modalFullscreenOverlay) modalFullscreenOverlay.addEventListener('click', closeFullscreenViewer);

  // Render Inline Photos (Grid / Multi-photo)
  function renderInlinePhotos() {
    if (!inlinePhotoGrid) return;

    if (state.photos.length === 0) {
      inlinePhotoGrid.style.display = 'none';
      inlinePhotoGrid.innerHTML = '';
      return;
    }

    inlinePhotoGrid.style.display = 'grid';
    if (state.photos.length === 1) {
      inlinePhotoGrid.style.gridTemplateColumns = '1fr';
    } else {
      inlinePhotoGrid.style.gridTemplateColumns = 'repeat(2, 1fr)';
    }
    inlinePhotoGrid.style.gap = '10px';

    inlinePhotoGrid.innerHTML = state.photos.map((p, idx) => {
      const imgSrc = p.image || p;
      return `
        <div class="inline-photo-card" data-index="${idx}" style="position: relative; border-radius: 8px; overflow: hidden; background: #000000; border: 1px solid #D1D5DB; box-shadow: 0 1px 3px rgba(0,0,0,0.12); aspect-ratio: 4/3; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <img src="${imgSrc}" class="btn-fullscreen-trigger" data-index="${idx}" alt="Foto ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;">
          <button type="button" class="btn-delete-inline-photo" data-index="${idx}" aria-label="Hapus Foto" style="position: absolute; top: 6px; right: 6px; background: rgba(220, 38, 38, 0.88); border: none; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; color: #FFFFFF; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.35); z-index: 10;">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
      `;
    }).join('');

    // Event listeners foto & hapus
    inlinePhotoGrid.querySelectorAll('.btn-fullscreen-trigger').forEach(img => {
      img.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index);
        const targetPhoto = state.photos[idx];
        const imgSrc = targetPhoto ? (targetPhoto.image || targetPhoto) : '';
        openFullscreenViewer(imgSrc);
      });
    });

    inlinePhotoGrid.querySelectorAll('.btn-delete-inline-photo').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(e.currentTarget.dataset.index);
        state.photos.splice(idx, 1);
        renderInlinePhotos();
      });
    });
  }

  // Kamera: Buka & Tutup
  async function openCamera() {
    if (!cameraOverlay) return;
    cameraOverlay.style.display = 'flex';
    if (txtCameraGpsInfo) txtCameraGpsInfo.textContent = 'Mendeteksi koordinat GPS aktual...';
    
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        videoEl.srcObject = currentStream;
        await videoEl.play();
        isCameraActive = true;
        errorEl.style.display = 'none';
        videoEl.style.display = 'block';

        const gps = await getGPSCoordinates();
        if (txtCameraGpsInfo) {
          if (gps.ok) {
            txtCameraGpsInfo.textContent = `GPS Terkunci: ${gps.lat}, ${gps.lng}`;
          } else {
            txtCameraGpsInfo.textContent = `GPS: ${gps.error}`;
          }
        }
      } else {
        throw new Error('Camera not supported');
      }
    } catch (e) {
      console.warn('[inspection-camera]', e);
      isCameraActive = false;
      errorEl.style.display = 'block';
      videoEl.style.display = 'none';
      if (txtCameraGpsInfo) {
        const gps = await getGPSCoordinates();
        if (gps.ok) txtCameraGpsInfo.textContent = `GPS Terkunci (Simulasi): ${gps.lat}, ${gps.lng}`;
        else txtCameraGpsInfo.textContent = `GPS: ${gps.error}`;
      }
    }
  }

  function stopCamera() {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
      currentStream = null;
    }
    if (cameraOverlay) {
      cameraOverlay.style.display = 'none';
    }
  }

  if (btnCloseCamera) btnCloseCamera.addEventListener('click', stopCamera);
  if (btnTambahFoto) btnTambahFoto.addEventListener('click', openCamera);

  // Shutter Capture: Ambil Foto + Datetime + GPS + Watermark Kanan Bawah -> Langsung ke state.photos & Render
  if (btnShutter) {
    btnShutter.addEventListener('click', async () => {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const capturedAt = `${dateStr} ${timeStr}`;
      
      // Ambil GPS aktual
      if (txtCameraGpsInfo) txtCameraGpsInfo.textContent = 'Mengunci koordinat GPS...';
      const gps = await getGPSCoordinates();

      let dataUrl = '';
      if (isCameraActive && videoEl.videoWidth) {
        canvasEl.width = videoEl.videoWidth;
        canvasEl.height = videoEl.videoHeight;
        const ctx = canvasEl.getContext('2d');
        ctx.drawImage(videoEl, 0, 0);
        
        // Watermark Kanan Bawah
        drawBottomRightWatermark(
          ctx,
          canvasEl.width,
          canvasEl.height,
          timeStr,
          dateStr,
          gps.ok ? gps.lat : null,
          gps.ok ? gps.lng : null
        );
        
        dataUrl = canvasEl.toDataURL('image/jpeg', 0.85);
      } else {
        // Fallback Canvas Simulasi
        canvasEl.width = 480;
        canvasEl.height = 360;
        const ctx = canvasEl.getContext('2d');
        ctx.fillStyle = '#116834';
        ctx.fillRect(0, 0, 480, 360);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FOTO DOKUMENTASI', 240, 160);
        ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(`Pemeriksaan Okulasi • ${batchNo}`, 240, 190);
        
        // Watermark Kanan Bawah
        drawBottomRightWatermark(
          ctx,
          480,
          360,
          timeStr,
          dateStr,
          gps.ok ? gps.lat : -3.593210,
          gps.ok ? gps.lng : 98.678420
        );
        
        dataUrl = canvasEl.toDataURL('image/jpeg', 0.85);
      }

      const newPhoto = {
        image: dataUrl,
        capturedAt,
        latitude: gps.ok ? gps.lat : null,
        longitude: gps.ok ? gps.lng : null
      };

      state.photos.push(newPhoto);
      stopCamera();
      renderInlinePhotos();
    });
  }

  // Initial calculations & inline photo render
  updateWorkerCalculations();
  renderInlinePhotos();

  // Back button
  app.querySelector('#btn-back').addEventListener('click', () => {
    stopCamera();
    closeFullscreenViewer();
    storage.remove('inspection_qr_verified');
    storage.remove('inspection_verified_at');
    storage.remove('inspection_verified_batch');
    navigate('/inspection');
  });

  // Save button with validation and routing
  app.querySelector('#btn-simpan-pemeriksaan').addEventListener('click', () => {
    const { grandDiperiksa, grandBerhasil, grandGagal, totalToRegrafting, totalToSelection } = updateWorkerCalculations();
    const catatan = app.querySelector('#inp-catatan')?.value || '';

    const validationErrors = [];
    const inspectedWorkersData = [];

    app.querySelectorAll('.worker-inspection-card').forEach(card => {
      const wid = card.dataset.id;
      const targetWorker = workerList.find(w => w.id === wid);
      const wName = targetWorker?.name || 'Pekerja';
      const wMax = parseInt(targetWorker?.qty || 0);

      const inpDiperiksa = card.querySelector('.inp-insp-diperiksa');
      const inpBerhasil = card.querySelector('.inp-insp-berhasil');
      const inpGagal = card.querySelector('.inp-insp-gagal');
      const chkRegrafting = card.querySelector('.chk-regrafting');

      const valDiperiksa = (inpDiperiksa?.value || '').trim();
      const valBerhasil = (inpBerhasil?.value || '').trim();
      const valGagal = (inpGagal?.value || '').trim();

      if (valDiperiksa === '') {
        validationErrors.push(`Kolom "Jlh Diperiksa" untuk ${wName} masih kosong.`);
      }
      if (valBerhasil === '') {
        validationErrors.push(`Kolom "Jlh Berhasil" untuk ${wName} masih kosong.`);
      }
      if (valGagal === '') {
        validationErrors.push(`Kolom "Tdk Berhasil" untuk ${wName} masih kosong.`);
      }

      const numDiperiksa = parseInt(valDiperiksa || 0);
      const numBerhasil = parseInt(valBerhasil || 0);
      const numGagal = parseInt(valGagal || 0);

      if (valDiperiksa !== '' && numDiperiksa > wMax && wMax > 0) {
        validationErrors.push(`Jlh Diperiksa untuk ${wName} (${numDiperiksa} Pkk) melebihi total diokulasi pekerja (${wMax} Pkk).`);
      }

      if (valDiperiksa !== '' && valBerhasil !== '' && valGagal !== '') {
        if (numBerhasil + numGagal !== numDiperiksa) {
          validationErrors.push(`Untuk ${wName}: Jlh Berhasil (${numBerhasil}) + Tdk Berhasil (${numGagal}) = ${numBerhasil + numGagal} Pkk harus sama dengan Jlh Diperiksa (${numDiperiksa} Pkk).`);
        }
      }

      const isRegraft = chkRegrafting ? chkRegrafting.checked : true;

      inspectedWorkersData.push({
        id: wid,
        name: wName,
        code: targetWorker?.code,
        totalDiokulasi: wMax,
        jlhDiperiksa: numDiperiksa,
        jlhBerhasil: numBerhasil,
        jlhTidakBerhasil: numGagal,
        perluRegrafting: isRegraft,
        persenBerhasil: numDiperiksa > 0 ? Math.round((numBerhasil / numDiperiksa) * 100) : 0,
        persenGagal: numDiperiksa > 0 ? Math.round((numGagal / numDiperiksa) * 100) : 0
      });
    });

    if (grandDiperiksa <= 0) {
      validationErrors.push('Total bibit yang diperiksa tidak boleh 0 Pkk.');
    }

    if (grandDiperiksa > sisaBelumDiperiksa && sisaBelumDiperiksa > 0) {
      validationErrors.push(`Total Diperiksa (${grandDiperiksa} Pkk) melebihi Sisa Belum Diperiksa (${sisaBelumDiperiksa} Pkk).`);
    }

    if (validationErrors.length > 0) {
      showValidationErrorDialog(validationErrors);
      return;
    }

    const txs = storage.get('inspection_transactions', []);
    let docNoInsp = isEditing && targetInsp && targetInsp.docNo
      ? targetInsp.docNo
      : generateUniqueDocNo('inspection', txs, 2026);
    if (docNoInsp) {
      docNoInsp = docNoInsp.replace('/PRK/', '/INS/').replace('/INSP/', '/INS/');
    }
    const persenTotal = grandDiperiksa > 0 ? Math.round((grandBerhasil / grandDiperiksa) * 100) : 0;

    const inspectionRecord = {
      ...(isEditing && targetInsp ? targetInsp : {}),
      docNo: docNoInsp,
      buddingIndex: parseInt(buddingIdx),
      buddingDocNo: docNo,
      buddingType: selectedBudding.type || 'GRAFTING',
      batchNo,
      sourceDocNo: selectedBudding.sourceDocNo,
      tanggal: isEditing && targetInsp?.tanggal ? targetInsp.tanggal : today,
      bedengan: selectedBudding.bedengan,
      klonEntres: selectedBudding.klonEntres,
      klonRootstock: selectedBudding.klonRootstock,
      workers: inspectedWorkersData,
      jumlahJadi: grandBerhasil,
      jumlahGagal: grandGagal,
      totalToRegrafting,
      totalToSelection,
      totalDiperiksa: grandDiperiksa,
      persenJadi: persenTotal,
      catatan,
      photos: state.photos
    };

    if (isEditing) {
      txs[parseInt(editingIdx)] = inspectionRecord;
    } else {
      txs.push(inspectionRecord);
    }
    storage.set('inspection_transactions', txs);

    // Save/Update to Regrafting Pool if checked
    let regraftPool = storage.get('regrafting_pool', []);
    if (isEditing) {
      regraftPool = regraftPool.filter(r => r.inspectionDocNo !== docNoInsp);
    }
    if (totalToRegrafting > 0) {
      regraftPool.push({
        docNo: generateUniqueDocNo('regrafting', regraftPool, 2026),
        inspectionDocNo: docNoInsp,
        batchNo,
        sourceBuddingDocNo: docNo,
        sourceDocNo: selectedBudding.sourceDocNo,
        tanggal: isEditing && targetInsp?.tanggal ? targetInsp.tanggal : today,
        bedengan: selectedBudding.bedengan,
        klonRootstock: selectedBudding.klonRootstock || 'GT-01',
        klonAwal: selectedBudding.klonEntres || 'PB 260',
        jumlah: totalToRegrafting,
        sisaRegrafting: totalToRegrafting,
        status: 'READY_TO_REGRAFT'
      });
    }
    storage.set('regrafting_pool', regraftPool);

    // Save/Update to Selection Pool if unchecked
    let selectionPool = storage.get('selection_pool', []);
    if (isEditing) {
      selectionPool = selectionPool.filter(s => s.inspectionDocNo !== docNoInsp);
    }
    if (totalToSelection > 0) {
      selectionPool.push({
        docNo: formatStandardDocNo(2026, 'CULL', selectionPool.length + 1),
        inspectionDocNo: docNoInsp,
        batchNo,
        sourceBuddingDocNo: docNo,
        sourceDocNo: selectedBudding.sourceDocNo,
        tanggal: isEditing && targetInsp?.tanggal ? targetInsp.tanggal : today,
        bedengan: selectedBudding.bedengan,
        klon: selectedBudding.klonEntres || 'PB 260',
        klonRootstock: selectedBudding.klonRootstock || 'GT-01',
        jumlahAfkir: totalToSelection,
        alasan: 'Gagal / Tidak Berhasil Okulasi (Ditolak Regrafting)',
        status: 'PENDING_CULLING'
      });
    }
    storage.set('selection_pool', selectionPool);

    stopCamera();
    closeFullscreenViewer();
    storage.remove('inspection_qr_verified');
    storage.remove('inspection_verified_at');
    storage.remove('inspection_verified_batch');
    storage.remove('editing_inspection_index');
    toast(isEditing ? 'Perubahan data pemeriksaan berhasil disimpan!' : 'Data pemeriksaan berhasil disimpan!', 'success');
    navigate('/inspection');
  });
}
