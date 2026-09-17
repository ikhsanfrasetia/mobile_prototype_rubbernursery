import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { session } from '../../core/session.js';
import { getCurrentUserContext } from '../../core/user-context.js';
import { formatDate, formatStandardDocNo, generateUniqueDocNo } from '../../core/utils.js';
import { getWorkersForUserContext, getWorkerById, isWorkerInScope } from '../../data/worker-master.js';
import { getActiveKlons, getKlonsForUsage, KLON_USAGE, normalizeKlonName, resolveKlon } from '../../data/klon-master.js';
import { formatBedenganCode } from './budding-grafting.js';

const MASTER_WORKERS = [
  { id: 'W001', name: 'Ahmad Rifai', code: '104521' },
  { id: 'W002', name: 'Bambang Sutrisno', code: '104522' },
  { id: 'W003', name: 'Candra Wijaya', code: '104523' },
  { id: 'W004', name: 'Dedi Kurniawan', code: '104524' },
  { id: 'W005', name: 'Eko Prasetyo', code: '104525' },
  { id: 'W006', name: 'Fajar Hidayat', code: '104526' },
  { id: 'W007', name: 'Guntur Saputra', code: '104527' },
  { id: 'W008', name: 'Hadi Firmansyah', code: '104528' },
  { id: 'W009', name: 'Irfan Maulana', code: '104529' },
  { id: 'W010', name: 'Joko Susilo', code: '104530' },
  { id: 'W011', name: 'Kusuma Wardana', code: '104531' },
  { id: 'W012', name: 'Lukman Hakim', code: '104532' }
];



export function renderBuddingForm() {
  const app = document.getElementById('app');
  const user = session.get() || { name: 'Irwan Syah Putra', code: '1405482', position: 'Mantri Pembibitan' };
  const today = formatDate(new Date().toISOString());

  const buddingType = storage.get('budding_type', 'GRAFTING');
  const isRegrafting = buddingType === 'REGRAFTING';
  const themeColor = '#116834';

  const editingIdx = storage.get('editing_budding_index', null);
  const isEditing = editingIdx !== null;
  const allBuddingTxs = storage.get('budding_transactions', []);
  const editingTx = isEditing ? allBuddingTxs[parseInt(editingIdx)] : null;

  let title = isRegrafting ? 'Okulasi Janda (Regrafting)' : 'Rekam Okulasi (Grafting)';
  if (isEditing) {
    title = isRegrafting ? 'Edit Okulasi Janda' : 'Edit Okulasi (Grafting)';
  }

  let batchNo = 'Batch-01';
  let docNo = formatStandardDocNo(2026, 'APR', 1);
  let totalDisemai = 2000;
  let bedenganDisplay = 'Bedengan 01';
  let klonRootstock = 'GT 1';
  let poolDocNo = '';
  let inspectionDocNo = '';
  let selectedGraftingSourceDoc = null;

  const batchIdx = storage.get('selected_grafting_batch_index', 0);

  if (isRegrafting) {
    const regraftPool = storage.get('regrafting_pool', []);
    const regraftIdx = storage.get('selected_regraft_index', 0);
    const poolItem = regraftPool[regraftIdx] || {
      batchNo: 'Batch-01',
      docNo: formatStandardDocNo(2026, 'RGRF', 1),
      inspectionDocNo: formatStandardDocNo(2026, 'INS', 1),
      jumlah: 50,
      bedengan: 'Bedengan 01',
      klonRootstock: 'GT 1'
    };
    batchNo = poolItem.batchNo || 'Batch-01';
    docNo = poolItem.docNo || formatStandardDocNo(2026, 'RGRF', 1);
    poolDocNo = poolItem.docNo;
    inspectionDocNo = poolItem.inspectionDocNo;
    totalDisemai = parseInt(poolItem.jumlah || 0);
    bedenganDisplay = formatBedenganCode(poolItem.bedengan, poolItem.bedenganCode) || 'BED-001';
    klonRootstock = poolItem.klonRootstock ? normalizeKlonName(poolItem.klonRootstock) : 'GT 1';
  } else {
    const allSelectionDocs = storage.get('pre_grafting_selection_documents', []);
    const seleksi3FinalDocs = allSelectionDocs.filter(d => 
      (d.selectionStage === 'SELEKSI_III' || d.selectionStage === 'SELEKSI_3') &&
      (d.selectionType === 'PRA_OKULASI' || !d.selectionType) &&
      d.status === 'DISETUJUI' &&
      Boolean(d.isFinal)
    );

    const targetDocNo = storage.get('selected_grafting_batch_doc_no', null);
    const targetDocId = storage.get('selected_grafting_batch_id', null);

    let selectedBatchDoc = null;
    if (targetDocNo) {
      selectedBatchDoc = seleksi3FinalDocs.find(d => d.docNo === targetDocNo);
    }
    if (!selectedBatchDoc && targetDocId) {
      selectedBatchDoc = seleksi3FinalDocs.find(d => d.id === targetDocId);
    }
    if (!selectedBatchDoc && seleksi3FinalDocs.length > 0) {
      selectedBatchDoc = seleksi3FinalDocs[parseInt(batchIdx)] || seleksi3FinalDocs[0];
    }

    if (!selectedBatchDoc) {
      selectedBatchDoc = {
        batchNo: `Batch-0${parseInt(batchIdx) + 1}`,
        batchCode: `Batch-0${parseInt(batchIdx) + 1}`,
        docNo: formatStandardDocNo(2026, 'SEL-III', 1),
        programCode: 'PRG/NUR/01/2026',
        klon: 'GT 1',
        totalLayak: 2000,
        rows: [{ bedengan: 'Bedengan 01', bedenganCode: 'BED-001', disemai: 2000 }]
      };
    }

    selectedGraftingSourceDoc = selectedBatchDoc;
    batchNo = selectedBatchDoc.batchCode || selectedBatchDoc.batchNo || `Batch-0${parseInt(batchIdx) + 1}`;
    docNo = selectedBatchDoc.docNo || formatStandardDocNo(2026, 'SEL-III', 1);
    totalDisemai = parseInt(
      selectedBatchDoc.totalLayak !== undefined
        ? selectedBatchDoc.totalLayak
        : (selectedBatchDoc.finalBibitQty !== undefined ? selectedBatchDoc.finalBibitQty : (selectedBatchDoc.currentBibitQty || 0)),
      10
    );
    klonRootstock = selectedBatchDoc.klon ? normalizeKlonName(selectedBatchDoc.klon) : (selectedBatchDoc.clone ? normalizeKlonName(selectedBatchDoc.clone) : (selectedBatchDoc.klonAwal ? normalizeKlonName(selectedBatchDoc.klonAwal) : 'GT 1'));
    const rows = selectedBatchDoc.rows || [];
    const batchBedengan = rows.map(r => formatBedenganCode(r.bedengan, r.bedenganCode)).filter(Boolean);
    bedenganDisplay = batchBedengan.length > 0 ? Array.from(new Set(batchBedengan)).join(', ') : (formatBedenganCode(selectedBatchDoc.bedengan, selectedBatchDoc.bedenganCode) || 'BED-001');
  }

  // Calculate accumulated budding (correctly excluding the currently edited transaction)
  let totalDiokulasiSDHI = 0;
  allBuddingTxs.forEach((b, i) => {
    if (isEditing && i === parseInt(editingIdx)) return; // Exclude current transaction from quota calculation!
    if (b.type !== (isRegrafting ? 'REGRAFTING' : 'GRAFTING')) return;
    
    const isMatch = isRegrafting 
      ? ((b.regraftPoolDocNo && b.regraftPoolDocNo === poolDocNo) || (b.inspectionDocNo && inspectionDocNo && b.inspectionDocNo === inspectionDocNo)) 
      : ((b.sourceSelection3DocNo && b.sourceSelection3DocNo === docNo) ||
         (b.sourceSelection3DocumentId && selectedGraftingSourceDoc?.id && b.sourceSelection3DocumentId === selectedGraftingSourceDoc.id) ||
         (b.sourceDocNo && b.sourceDocNo === docNo) ||
         (b.seedingIndex === parseInt(batchIdx) && !b.sourceSelection3DocNo && !b.sourceDocNo) ||
         (b.batchNo === batchNo && !b.sourceSelection3DocNo && !b.sourceDocNo));
      
    if (isMatch) {
      totalDiokulasiSDHI += (parseInt(b.jumlah || 0) + parseInt(b.jumlahDitolak || 0));
    }
  });

  const sisaBelumDiokulasi = Math.max(0, totalDisemai - totalDiokulasiSDHI);

  // Current user context & available worker scope
  const userCtx = getCurrentUserContext();
  const availableScopedWorkers = getWorkersForUserContext(userCtx);

  // State
  let selectedKlon = editingTx ? (editingTx.klonEntres || editingTx.klon || '') : '';
  let selectedWorkers = editingTx && editingTx.workers && editingTx.workers.length > 0
    ? editingTx.workers.map(w => ({ id: w.id, name: w.name, code: w.code, qty: parseInt(w.qty || 0) }))
    : (availableScopedWorkers.length > 0
        ? [{ id: availableScopedWorkers[0].id, name: availableScopedWorkers[0].name, code: availableScopedWorkers[0].code, qty: 0 }]
        : []);

  function renderPage() {
    app.innerHTML = `
      <div class="page" style="display: flex; flex-direction: column; height: 100%; background: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; overflow-x: hidden; box-sizing: border-box; position: relative;">
        
        <!-- HEADER -->
        <header style="display: flex; align-items: center; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #D9D9D9; flex-shrink: 0;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: ${themeColor};">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.05rem; font-weight: 700; color: #111111; margin: 0 0 0 8px; letter-spacing: -0.01em;">${title}</h1>
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
              <div style="font-size: 0.72rem; font-weight: 600; color: #6B7280; margin-bottom: 2px;">Tanggal Kegiatan</div>
              <div style="font-size: 0.85rem; color: #111111; font-weight: 700;">${today}</div>
            </div>
          </section>

          <!-- INFORMASI BATCH SELEKSI III / REGRAFTING (OTOMATIS) -->
          <section style="padding: 14px 16px; border-bottom: 1px solid #E5E7EB; background: #F9FAFB;">
            <h2 style="font-size: 0.88rem; font-weight: 700; color: #111111; margin: 0 0 10px 0;">Informasi Batch Asal</h2>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; font-size: 0.76rem;">
              <div>
                <span style="color: #6B7280;">Nomor Batch:</span>
                <div style="font-weight: 700; color: #116834; font-size: 0.84rem; margin-top: 1px;">${batchNo}</div>
              </div>
              <div>
                <span style="color: #6B7280;">${isRegrafting ? 'Ref. Dokumen Pool:' : 'Dokumen Seleksi III FINAL:'}</span>
                <div style="font-weight: 700; color: #111; font-size: 0.80rem; margin-top: 1px; word-break: break-all;">${docNo}</div>
              </div>
              <div>
                <span style="color: #6B7280;">Lokasi Bedengan:</span>
                <div style="font-weight: 700; color: #111; font-size: 0.80rem; margin-top: 1px;">${bedenganDisplay}</div>
              </div>
              <div>
                <span style="color: #6B7280;">Klon Batang Bawah:</span>
                <div style="font-weight: 700; color: #111; font-size: 0.80rem; margin-top: 1px;">${klonRootstock}</div>
              </div>
              <div style="grid-column: span 2; padding-top: 2px;">
                <span style="color: #6B7280;">${isRegrafting ? 'Populasi Gagal Okulasi:' : 'Populasi Siap Okulasi (Layak):'}</span>
                <span style="font-weight: 700; color: #116834; font-size: 0.82rem; margin-left: 4px;">${totalDisemai.toLocaleString('id-ID')} Pkk</span>
              </div>
            </div>

            <div style="margin-top: 10px; padding: 8px 12px; background: #E8F5E9; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #C8E6C9;">
              <span style="font-size: 0.74rem; font-weight: 700; color: #116834;">${isRegrafting ? 'Sisa Belum Regrafting:' : 'Sisa Bibit Belum Diokulasi:'}</span>
              <span style="font-size: 0.88rem; font-weight: 800; color: #116834;">${sisaBelumDiokulasi.toLocaleString('id-ID')} Pkk</span>
            </div>
          </section>

          <!-- FORM INPUT REALISASI OKULASI -->
          <section style="padding: 14px 16px; border-bottom: 1px solid #E5E7EB;">
            
            <!-- PILIH KLON ENTRES DENGAN FITUR CARI / SEARCH -->
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #374151; margin-bottom: 6px;">Pilih Klon Entres Okulasi <span style="color:#D32F2F;">*</span></label>
              <div id="btn-open-klon-modal" style="width: 100%; height: 40px; border: 1px solid #D1D5DB; border-radius: 6px; padding: 0 12px; background: #FFFFFF; display: flex; align-items: center; justify-content: space-between; cursor: pointer; box-sizing: border-box; transition: border-color 0.15s ease;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 0.82rem; font-weight: ${selectedKlon ? '700' : '500'}; color: ${selectedKlon ? '#111111' : '#9CA3AF'};" id="text-selected-klon">${selectedKlon || '-- Pilih Klon Entres --'}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 6px; color: #116834;">
                  <span style="font-size: 0.72rem; font-weight: 600; color: #6B7280;">Cari / Ganti</span>
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
              </div>
            </div>

            <!-- PILIH PEKERJA OKULASI -->
            <div style="margin-bottom: 14px; background: #FAFAFA; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; box-sizing: border-box;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <label style="font-size: 0.76rem; font-weight: 700; color: #111111;">Pilih Pekerja Okulasi <span style="color:#D32F2F;">*</span></label>
                <span id="badge-total-pekerja" style="font-size: 0.70rem; font-weight: 700; color: #116834; background: #E8F5E9; padding: 2px 8px; border-radius: 4px; border: 1px solid #C8E6C9;">
                  ${selectedWorkers.length} Pekerja
                </span>
              </div>

              <!-- BUTTON PEMICU SEARCH MODAL PEKERJA -->
              <div style="margin-bottom: 10px;">
                <button id="btn-open-worker-modal" type="button" style="width: 100%; height: 38px; background: #FFFFFF; border: 1px dashed #116834; border-radius: 6px; padding: 0 12px; display: flex; align-items: center; justify-content: flex-start; gap: 8px; cursor: pointer; color: #116834; font-size: 0.78rem; font-weight: 700; text-align: left; transition: background 0.15s ease; box-sizing: border-box;">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  <span style="text-align: left;">Pilih Pekerja Okulasi</span>
                </button>
              </div>

              <!-- LIST PEKERJA YANG DIPILIH DENGAN INPUT JUMLAH POKOK -->
              <div id="workers-container" style="display: flex; flex-direction: column; gap: 8px;">
                ${selectedWorkers.length > 0 ? selectedWorkers.map((w) => `
                  <div class="worker-row" data-id="${w.id}" style="display: flex; align-items: center; justify-content: space-between; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 6px; padding: 8px 10px; gap: 8px; box-sizing: border-box;">
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-size: 0.80rem; font-weight: 700; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${w.name}</div>
                      <div style="font-size: 0.70rem; color: #6B7280; margin-top: 1px;">NIK: ${w.code}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
                      <div style="display: flex; align-items: center; gap: 4px;">
                        <input type="number" class="inp-worker-qty" data-id="${w.id}" value="${w.qty > 0 ? w.qty : ''}" placeholder="0" style="width: 65px; height: 32px; border: 1px solid #116834; border-radius: 4px; padding: 0 6px; font-size: 0.82rem; font-weight: 700; text-align: right; outline: none; box-sizing: border-box;">
                        <span style="font-size: 0.70rem; color: #6B7280; font-weight: 600;">Pkk</span>
                      </div>
                      <button type="button" class="btn-remove-worker" data-id="${w.id}" aria-label="Hapus pekerja" title="Hapus pekerja ini" style="background: #FEE2E2; border: 1px solid #FCA5A5; border-radius: 4px; padding: 6px; cursor: pointer; color: #DC2626; display: flex; align-items: center; justify-content: center;">
                        <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.2" fill="none">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                `).join('') : `
                  <div style="background: #FFFFFF; border: 1px dashed #D1D5DB; border-radius: 6px; padding: 14px 10px; text-align: center;">
                    <div style="font-size: 0.76rem; color: #6B7280; margin-bottom: 2px;">Belum ada pekerja okulasi dipilih</div>
                    <div style="font-size: 0.70rem; color: #116834; font-weight: 600;">Ketuk "Pilih Pekerja Okulasi" di atas untuk memilih pekerja</div>
                  </div>
                `}
              </div>

              <!-- TOTAL REALISASI DARI SEMUA PEKERJA -->
              <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #D1D5DB; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.74rem; font-weight: 700; color: #374151;">Total Diokulasi:</span>
                <span id="lbl-total-diokulasi" style="font-size: 0.88rem; font-weight: 800; color: #116834;">0 Pkk</span>
              </div>
            </div>

            <!-- JUMLAH KAYU OKULASI -->
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #374151; margin-bottom: 6px;">Jumlah Kayu Okulasi (Batang) <span style="color:#D32F2F;">*</span></label>
              <input type="number" id="inp-kayu" placeholder="0" min="1" value="${editingTx ? (editingTx.jumlahKayu || '') : ''}" style="width: 100%; height: 38px; border: 1px solid #D1D5DB; border-radius: 6px; padding: 0 10px; font-size: 0.8rem; outline: none; box-sizing: border-box;">
            </div>

            <!-- JLH MATA ENTRES -->
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #374151; margin-bottom: 6px;">Jlh Mata Entres</label>
              <input type="number" id="inp-mata-entres" readonly placeholder="0" value="${editingTx ? (editingTx.jumlahMataEntres !== undefined && editingTx.jumlahMataEntres !== null ? editingTx.jumlahMataEntres : (editingTx.jumlah || 0)) : 0}" style="width: 100%; height: 38px; border: 1px solid #E5E7EB; border-radius: 6px; padding: 0 10px; font-size: 0.82rem; font-weight: 700; color: #111827; background: #F9FAFB; cursor: not-allowed; outline: none; box-sizing: border-box;">
            </div>

            <!-- JUMLAH BIBIT DITOLAK -->
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #374151; margin-bottom: 6px;">Jumlah Bibit Ditolak (Pkk) <span style="color:#D32F2F;">*</span></label>
              <input type="number" id="inp-ditolak" placeholder="0" min="0" value="${editingTx ? (editingTx.jumlahDitolak || 0) : '0'}" style="width: 100%; height: 38px; border: 1px solid #D1D5DB; border-radius: 6px; padding: 0 10px; font-size: 0.8rem; outline: none; box-sizing: border-box; transition: background 0.15s ease;">
            </div>

            ${isRegrafting ? `
            <div style="margin-bottom: 14px;">
              <label style="display: block; font-size: 0.74rem; font-weight: 700; color: #F57F17; margin-bottom: 6px;">Penyebab Okulasi Ulang <span style="color:#D32F2F;">*</span></label>
              <select id="sel-alasan" style="width: 100%; height: 38px; border: 1px solid #FFE082; border-radius: 6px; padding: 0 10px; font-size: 0.8rem; outline: none; background: #FFFDE7; box-sizing: border-box;">
                <option value="Mata Entres Busuk / Mati" ${editingTx?.alasan === 'Mata Entres Busuk / Mati' ? 'selected' : ''}>Mata Entres Busuk / Mati</option>
                <option value="Okulasi Tidak Lengket (Gagal)" ${editingTx?.alasan === 'Okulasi Tidak Lengket (Gagal)' ? 'selected' : ''}>Okulasi Tidak Lengket (Gagal)</option>
                <option value="Kondisi Batang Bawah Rusak" ${editingTx?.alasan === 'Kondisi Batang Bawah Rusak' ? 'selected' : ''}>Kondisi Batang Bawah Rusak</option>
                <option value="Lainnya" ${editingTx?.alasan === 'Lainnya' ? 'selected' : ''}>Lainnya</option>
              </select>
            </div>
            ` : ''}

            <!-- RINCIAN REKONSILIASI & STATUS SISA OKULASI -->
            <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; box-sizing: border-box;">
              <div style="font-size: 0.76rem; font-weight: 700; color: #111827; margin-bottom: 8px;">
                <span>Rincian & Rekonsiliasi Realisasi:</span>
              </div>

              <div style="display: flex; flex-direction: column; gap: 5px; font-size: 0.73rem;">
                <div style="display: flex; justify-content: space-between; color: #6B7280;">
                  <span>Populasi Sisa Awal:</span>
                  <span style="font-weight: 700; color: #111827;">${sisaBelumDiokulasi} Pkk</span>
                </div>
                <div style="display: flex; justify-content: space-between; color: #6B7280;">
                  <span>Total Diokulasi:</span>
                  <span id="recon-diokulasi" style="font-weight: 700; color: #116834;">0 Pkk</span>
                </div>
                <div style="display: flex; justify-content: space-between; color: #6B7280;">
                  <span>Jumlah Bibit Ditolak:</span>
                  <span id="recon-ditolak" style="font-weight: 700; color: #DC2626;">0 Pkk</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 5px; border-top: 1px dashed #D1D5DB; color: #374151; font-weight: 700;">
                  <span>Total Realisasi (Diokulasi + Ditolak):</span>
                  <span id="recon-total-realisasi" style="color: #111827;">0 Pkk</span>
                </div>
              </div>

              <!-- STATUS BOX SISA BIBIT AKHIR -->
              <div id="recon-status-box" style="margin-top: 8px; padding: 8px 10px; border-radius: 6px; background: #E8F5E9; border: 1px solid #C8E6C9; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div id="recon-status-title" style="font-size: 0.72rem; font-weight: 700; color: #116834;">Sisa Bibit Belum Diokulasi:</div>
                  <div id="recon-status-desc" style="font-size: 0.68rem; color: #2E7D32; margin-top: 1px;">Realisasi Balance (Selesai 100% / Nilai Final)</div>
                </div>
                <div id="recon-sisa-val" style="font-size: 0.95rem; font-weight: 800; color: #116834;">0 Pkk</div>
              </div>
            </div>

          </section>

        </main>

        <!-- BOTTOM ACTION -->
        <footer style="padding: 14px 16px; background: #FFFFFF; border-top: 1px solid #D9D9D9; flex-shrink: 0; box-sizing: border-box;">
          <button id="btn-simpan" type="button" style="width: 100%; height: 44px; background: ${themeColor}; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.90rem; cursor: pointer;">
            ${isEditing ? 'Simpan Perubahan Okulasi' : 'Simpan Transaksi Okulasi'}
          </button>
        </footer>

        <!-- MODAL OVERLAY -->
        <div id="modal-overlay" style="display: none; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100;"></div>

        <!-- SEARCHABLE BOTTOM SHEET MODAL UNTUK KLON ENTRES -->
        <div id="sheet-klon" style="display: none; position: absolute; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-radius: 14px 14px 0 0; z-index: 101; flex-direction: column; max-height: 75vh; box-shadow: 0 -4px 16px rgba(0,0,0,0.15);">
          <div style="padding: 14px 16px; border-bottom: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center; background: #F9FAFB; border-radius: 14px 14px 0 0;">
            <h3 style="font-size: 0.95rem; font-weight: 700; color: #111111; margin: 0;">Pilih Klon Entres Okulasi</h3>
            <button id="btn-close-klon-sheet" type="button" style="background: none; border: none; font-size: 1.4rem; line-height: 1; color: #6B7280; cursor: pointer; padding: 4px;">&times;</button>
          </div>
          
          <div style="padding: 12px 16px 8px; background: #FFFFFF;">
            <div style="position: relative;">
              <input type="text" id="input-search-klon" placeholder="Cari nama klon (misal: IRR, PB, RRIM)..." style="width: 100%; height: 38px; padding: 0 36px 0 12px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 0.82rem; outline: none; box-sizing: border-box;" />
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="#9CA3AF" stroke-width="2" fill="none" style="position: absolute; right: 12px; top: 11px;">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
          </div>

          <div id="list-klon-items" style="flex: 1; overflow-y: auto; padding: 4px 16px 20px; display: flex; flex-direction: column; gap: 4px;">
          </div>
        </div>

        <!-- SEARCHABLE BOTTOM SHEET MODAL UNTUK PEKERJA OKULASI -->
        <div id="sheet-worker" style="display: none; position: absolute; left: 0; right: 0; bottom: 0; background: #FFFFFF; border-radius: 14px 14px 0 0; z-index: 101; flex-direction: column; max-height: 75vh; box-shadow: 0 -4px 16px rgba(0,0,0,0.15);">
          <div style="padding: 14px 16px; border-bottom: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center; background: #F9FAFB; border-radius: 14px 14px 0 0;">
            <h3 style="font-size: 0.95rem; font-weight: 700; color: #111111; margin: 0;">Pilih Pekerja Okulasi</h3>
            <button id="btn-close-worker-sheet" type="button" style="background: none; border: none; font-size: 1.4rem; line-height: 1; color: #6B7280; cursor: pointer; padding: 4px;">&times;</button>
          </div>
          
          <div style="padding: 12px 16px 8px; background: #FFFFFF;">
            <div style="position: relative;">
              <input type="text" id="input-search-worker" placeholder="Cari nama atau NIK pekerja..." style="width: 100%; height: 38px; padding: 0 36px 0 12px; border: 1px solid #D1D5DB; border-radius: 6px; font-size: 0.82rem; outline: none; box-sizing: border-box;" />
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="#9CA3AF" stroke-width="2" fill="none" style="position: absolute; right: 12px; top: 11px;">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
          </div>

          <div id="list-worker-items" style="flex: 1; overflow-y: auto; padding: 4px 16px 20px; display: flex; flex-direction: column; gap: 4px;">
          </div>
        </div>

        <!-- DIALOG VALIDASI MODAL -->
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
          <button id="btn-close-validation-dialog" type="button" style="width: 100%; height: 38px; background: ${themeColor}; color: #FFFFFF; border: none; border-radius: 6px; font-size: 0.82rem; font-weight: 700; cursor: pointer;">
            Lengkapi Data
          </button>
        </div>

      </div>
    `;

    // Elements & Handlers
    const overlay = app.querySelector('#modal-overlay');
    const sheetKlon = app.querySelector('#sheet-klon');
    const sheetWorker = app.querySelector('#sheet-worker');
    const dialogValidation = app.querySelector('#dialog-validation');
    const dialogErrorList = app.querySelector('#dialog-error-list');
    const btnCloseValidationDialog = app.querySelector('#btn-close-validation-dialog');

    // Dialog Validasi Helpers
    function showValidationErrorDialog(errors) {
      dialogErrorList.innerHTML = errors.map((err, i) => `
        <div style="display: flex; align-items: flex-start; gap: 6px;">
          <span style="font-weight: 700;">${i + 1}.</span>
          <span style="line-height: 1.3;">${err}</span>
        </div>
      `).join('');
      overlay.style.display = 'block';
      dialogValidation.style.display = 'block';
    }

    function closeValidationDialog() {
      dialogValidation.style.display = 'none';
      overlay.style.display = 'none';
    }

    btnCloseValidationDialog.addEventListener('click', closeValidationDialog);

    // Klon Search Sheet
    function openKlonSheet() {
      overlay.style.display = 'block';
      sheetKlon.style.display = 'flex';
      renderKlonList('');
      setTimeout(() => {
        app.querySelector('#input-search-klon')?.focus();
      }, 100);
    }

    function closeKlonSheet() {
      sheetKlon.style.display = 'none';
      overlay.style.display = 'none';
    }

    function renderKlonList(query) {
      const container = app.querySelector('#list-klon-items');
      const activeEntresKlons = getKlonsForUsage(KLON_USAGE.ENTRES);
      const q = (query || '').trim().toLowerCase();
      const filtered = activeEntresKlons.filter(k => 
        k.canonicalName.toLowerCase().includes(q) ||
        k.code.toLowerCase().includes(q) ||
        k.aliases.some(a => a.toLowerCase().includes(q))
      );
      
      if (filtered.length === 0) {
        container.innerHTML = `<div style="padding: 16px; text-align: center; color: #9CA3AF; font-size: 0.78rem;">Klon "${query}" tidak ditemukan</div>`;
        return;
      }

      container.innerHTML = filtered.map(k => {
        const isSel = k.canonicalName === selectedKlon || k.code === selectedKlon;
        return `
          <button type="button" class="btn-select-klon-item" data-klon="${k.canonicalName}" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: ${isSel ? '#E8F5E9' : '#FFFFFF'}; border: 1px solid ${isSel ? '#116834' : '#E5E7EB'}; border-radius: 6px; cursor: pointer; text-align: left;">
            <div>
              <span style="font-size: 0.82rem; font-weight: ${isSel ? '700' : '500'}; color: ${isSel ? '#116834' : '#111827'};">${k.canonicalName}</span>
              <span style="font-size: 0.72rem; color: #9CA3AF; margin-left: 6px;">(${k.code})</span>
            </div>
            ${isSel ? '<span style="color: #116834; font-weight: 700;">✓</span>' : ''}
          </button>
        `;
      }).join('');

      container.querySelectorAll('.btn-select-klon-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
          selectedKlon = e.currentTarget.dataset.klon;
          closeKlonSheet();
          renderPage();
        });
      });
    }

    app.querySelector('#btn-select-klon-trigger')?.addEventListener('click', openKlonSheet);
    app.querySelector('#btn-open-klon-modal')?.addEventListener('click', openKlonSheet);
    app.querySelector('#btn-close-klon-sheet')?.addEventListener('click', closeKlonSheet);
    app.querySelector('#input-search-klon')?.addEventListener('input', (e) => {
      renderKlonList(e.target.value.trim());
    });

    // Worker Search Sheet
    function openWorkerSheet() {
      overlay.style.display = 'block';
      sheetWorker.style.display = 'flex';
      renderWorkerList('');
      setTimeout(() => {
        app.querySelector('#input-search-worker')?.focus();
      }, 100);
    }

    function closeWorkerSheet() {
      sheetWorker.style.display = 'none';
      overlay.style.display = 'none';
    }

    function renderWorkerList(query) {
      const container = app.querySelector('#list-worker-items');
      const currentAvailable = getWorkersForUserContext(getCurrentUserContext());
      const filtered = currentAvailable.filter(w => 
        w.name.toLowerCase().includes(query.toLowerCase()) || 
        w.code.toLowerCase().includes(query.toLowerCase())
      );

      if (filtered.length === 0) {
        container.innerHTML = `<div style="padding: 16px; text-align: center; color: #9CA3AF; font-size: 0.78rem;">Pekerja "${query}" tidak ditemukan pada unit kerja Anda</div>`;
        return;
      }

      container.innerHTML = filtered.map(w => {
        const isAdded = selectedWorkers.some(sw => sw.id === w.id);
        return `
          <button type="button" class="btn-select-worker-item" data-id="${w.id}" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: ${isAdded ? '#E8F5E9' : '#FFFFFF'}; border: 1px solid ${isAdded ? '#116834' : '#E5E7EB'}; border-radius: 6px; cursor: pointer; text-align: left;">
            <div>
              <div style="font-size: 0.82rem; font-weight: 700; color: ${isAdded ? '#116834' : '#111827'};">${w.name}</div>
              <div style="font-size: 0.70rem; color: #6B7280; margin-top: 1px;">Kode: ${w.code} • ${w.divisionName || ''}</div>
            </div>
            ${isAdded ? '<span style="font-size: 0.72rem; color: #116834; font-weight: 700; background: #C8E6C9; padding: 3px 8px; border-radius: 4px;">✓ Terpilih</span>' : '<span style="color: #116834; font-size: 0.80rem; font-weight: 700; background: #F0FDF4; border: 1px solid #DCFCE7; padding: 3px 8px; border-radius: 4px;">+ Tambah</span>'}
          </button>
        `;
      }).join('');

      container.querySelectorAll('.btn-select-worker-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const wid = e.currentTarget.dataset.id;
          const isAdded = selectedWorkers.some(sw => sw.id === wid);
          if (isAdded) {
            // Deselect / Remove
            selectedWorkers = selectedWorkers.filter(sw => sw.id !== wid);
          } else {
            // Add canonical record from worker-master
            const wObj = getWorkerById(wid) || currentAvailable.find(m => m.id === wid);
            if (wObj) {
              selectedWorkers.push({ id: wObj.id, name: wObj.name, code: wObj.code, qty: 0 });
            }
          }
          closeWorkerSheet();
          renderPage();
        });
      });
    }

    app.querySelector('#btn-open-worker-modal')?.addEventListener('click', openWorkerSheet);
    app.querySelector('#btn-close-worker-sheet')?.addEventListener('click', closeWorkerSheet);
    app.querySelector('#input-search-worker')?.addEventListener('input', (e) => {
      renderWorkerList(e.target.value.trim());
    });

    overlay.addEventListener('click', () => {
      closeKlonSheet();
      closeWorkerSheet();
      closeValidationDialog();
    });

    // Helper: Hitung total diokulasi dan sinkronisasi status balance
    function updateTotal() {
      let totalDiokulasi = 0;
      app.querySelectorAll('.inp-worker-qty').forEach((inp) => {
        totalDiokulasi += parseInt(inp.value || 0);
      });

      const inpDitolak = app.querySelector('#inp-ditolak');

      // Jika seluruh sisa populasi awal sudah diokulasi, bibit ditolak otomatis 0 dan di-disable
      if (totalDiokulasi >= sisaBelumDiokulasi && sisaBelumDiokulasi > 0) {
        if (inpDitolak) {
          inpDitolak.value = '0';
          inpDitolak.disabled = true;
          inpDitolak.style.background = '#F3F4F6';
          inpDitolak.style.cursor = 'not-allowed';
          inpDitolak.style.color = '#6B7280';
        }
      } else {
        if (inpDitolak) {
          inpDitolak.disabled = false;
          inpDitolak.style.background = '#FFFFFF';
          inpDitolak.style.cursor = 'text';
          inpDitolak.style.color = '#111827';
        }
      }

      const ditolak = parseInt(inpDitolak?.value || 0);
      const totalRealisasi = totalDiokulasi + ditolak;
      const sisaAkhir = sisaBelumDiokulasi - totalRealisasi;

      // Sinkronisasi otomatis Jlh Mata Entres dengan Total Diokulasi
      const inpMataEntres = app.querySelector('#inp-mata-entres');
      if (inpMataEntres) {
        inpMataEntres.value = totalDiokulasi;
      }

      const lblTotalDiokulasi = app.querySelector('#lbl-total-diokulasi');
      if (lblTotalDiokulasi) {
        lblTotalDiokulasi.textContent = `${totalDiokulasi} Pkk`;
        lblTotalDiokulasi.style.color = (totalDiokulasi > sisaBelumDiokulasi && sisaBelumDiokulasi > 0) ? '#DC2626' : '#116834';
      }

      // Update Rincian Rekonsiliasi
      const reconDiokulasi = app.querySelector('#recon-diokulasi');
      const reconDitolak = app.querySelector('#recon-ditolak');
      const reconTotalReal = app.querySelector('#recon-total-realisasi');
      const reconBadge = app.querySelector('#reconcile-badge');
      const reconStatusBox = app.querySelector('#recon-status-box');
      const reconStatusTitle = app.querySelector('#recon-status-title');
      const reconStatusDesc = app.querySelector('#recon-status-desc');
      const reconSisaVal = app.querySelector('#recon-sisa-val');

      if (reconDiokulasi) reconDiokulasi.textContent = `${totalDiokulasi} Pkk`;
      if (reconDitolak) reconDitolak.textContent = `${ditolak} Pkk`;
      if (reconTotalReal) reconTotalReal.textContent = `${totalRealisasi} Pkk`;

      if (sisaAkhir === 0) {
        // Realisasi Selesai 100%
        if (reconStatusBox) {
          reconStatusBox.style.background = '#E8F5E9';
          reconStatusBox.style.borderColor = '#C8E6C9';
        }
        if (reconStatusTitle) {
          reconStatusTitle.textContent = 'Sisa Bibit Belum Diokulasi:';
          reconStatusTitle.style.color = '#116834';
        }
        if (reconStatusDesc) {
          reconStatusDesc.textContent = 'Realisasi Selesai 100%';
          reconStatusDesc.style.color = '#2E7D32';
        }
        if (reconSisaVal) {
          reconSisaVal.textContent = '0 Pkk';
          reconSisaVal.style.color = '#116834';
        }
      } else if (sisaAkhir > 0) {
        // Masih ada sisa yang perlu dilanjutkan
        if (reconStatusBox) {
          reconStatusBox.style.background = '#FFF8E1';
          reconStatusBox.style.borderColor = '#FFE082';
        }
        if (reconStatusTitle) {
          reconStatusTitle.textContent = 'Sisa Bibit Belum Diokulasi:';
          reconStatusTitle.style.color = '#B45309';
        }
        if (reconStatusDesc) {
          reconStatusDesc.textContent = `Sisa ${sisaAkhir} Pkk perlu dilanjutkan okulasi kembali`;
          reconStatusDesc.style.color = '#D97706';
        }
        if (reconSisaVal) {
          reconSisaVal.textContent = `${sisaAkhir} Pkk`;
          reconSisaVal.style.color = '#B45309';
        }
      } else {
        // Melebihi Kuota
        if (reconBadge) {
          reconBadge.textContent = 'Melebihi Kuota';
          reconBadge.style.background = '#FEE2E2';
          reconBadge.style.color = '#DC2626';
          reconBadge.style.borderColor = '#FCA5A5';
        }
        if (reconStatusBox) {
          reconStatusBox.style.background = '#FEE2E2';
          reconStatusBox.style.borderColor = '#FCA5A5';
        }
        if (reconStatusTitle) {
          reconStatusTitle.textContent = 'Kelebihan Input Realisasi:';
          reconStatusTitle.style.color = '#DC2626';
        }
        if (reconStatusDesc) {
          reconStatusDesc.textContent = `Total input melebihi sisa awal batch (+${Math.abs(sisaAkhir)} Pkk)`;
          reconStatusDesc.style.color = '#B91C1C';
        }
        if (reconSisaVal) {
          reconSisaVal.textContent = `+${Math.abs(sisaAkhir)} Pkk`;
          reconSisaVal.style.color = '#DC2626';
        }
      }

      return totalDiokulasi;
    }

    // Input listeners for workers with digit length validation based on sisaBelumDiokulasi
    const maxAllowedDigits = Math.max(1, sisaBelumDiokulasi.toString().length);

    app.querySelectorAll('.inp-worker-qty').forEach((inp) => {
      inp.addEventListener('input', (e) => {
        const wid = e.target.dataset.id;
        let rawStr = e.target.value.replace(/[^0-9]/g, '');
        
        // Batasi jumlah digit agar tidak melebihi panjang digit dari sisa kuota batch
        if (rawStr.length > maxAllowedDigits) {
          rawStr = rawStr.slice(0, maxAllowedDigits);
          e.target.value = rawStr;
        }

        const val = parseInt(rawStr || 0);
        const wItem = selectedWorkers.find(w => w.id === wid);
        if (wItem) wItem.qty = val;
        updateTotal();
      });
    });

    // Input listener for bibit ditolak
    app.querySelector('#inp-ditolak')?.addEventListener('input', (e) => {
      let rawStr = e.target.value.replace(/[^0-9]/g, '');
      if (rawStr.length > maxAllowedDigits) {
        rawStr = rawStr.slice(0, maxAllowedDigits);
        e.target.value = rawStr;
      }
      updateTotal();
    });

    updateTotal();

    // Remove worker button
    app.querySelectorAll('.btn-remove-worker').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const wid = e.currentTarget.dataset.id;
        selectedWorkers = selectedWorkers.filter(w => w.id !== wid);
        renderPage();
      });
    });

    // Back button
    app.querySelector('#btn-back').addEventListener('click', () => {
      storage.remove('editing_budding_index');
      navigate(isRegrafting ? '/budding/regrafting' : '/budding/grafting');
    });

    // Save button with comprehensive null/empty validation dialog
    app.querySelector('#btn-simpan').addEventListener('click', () => {
      const totalDiokulasi = updateTotal();
      const kayuVal = (app.querySelector('#inp-kayu')?.value || '').trim();
      const mataEntres = totalDiokulasi;
      const ditolakElem = app.querySelector('#inp-ditolak');
      const ditolakVal = (ditolakElem?.value || '').trim();
      const isDitolakDisabled = ditolakElem?.disabled;

      const validationErrors = [];

      // Validasi Klon
      if (!selectedKlon) validationErrors.push('Klon Entres belum dipilih.');

      // Validasi Pekerja
      if (selectedWorkers.length === 0) {
        validationErrors.push('Pekerja belum dipilih.');
      } else if (selectedWorkers.some(w => !w.qty || w.qty <= 0)) {
        validationErrors.push('Jumlah pekerja belum diisi dengan benar.');
      } else {
        // Validasi master worker & scope untuk worker non-legacy
        const currentCtx = getCurrentUserContext();
        for (const sw of selectedWorkers) {
          const isLegacyWorker = sw.id && sw.id.startsWith('W') && !sw.id.startsWith('WRK');
          if (!isLegacyWorker) {
            const masterRec = getWorkerById(sw.id);
            if (!masterRec) {
              validationErrors.push(`Pekerja ${sw.name || sw.id} tidak terdaftar di Master Pekerja.`);
            } else if (masterRec.status !== 'ACTIVE' || masterRec.active === false) {
              validationErrors.push(`Pekerja ${masterRec.name} berstatus tidak aktif.`);
            } else if (currentCtx && currentCtx.scopeType === 'DIVISION' && (masterRec.estateId !== currentCtx.estateId || masterRec.divisionId !== currentCtx.divisionId)) {
              validationErrors.push(`Pekerja ${masterRec.name} berada di luar cakupan unit kerja Anda.`);
            }
          }
        }
      }

      // Validasi Total
      if (totalDiokulasi <= 0) validationErrors.push('Total diokulasi tidak boleh 0.');
      if (totalDiokulasi > sisaBelumDiokulasi && sisaBelumDiokulasi > 0) {
        validationErrors.push(`Total diokulasi melebihi sisa (${sisaBelumDiokulasi} Pkk).`);
      }

      // Validasi Kayu & Ditolak
      if (kayuVal === '' || parseInt(kayuVal) <= 0) validationErrors.push('Jumlah kayu tidak valid.');
      if (!isDitolakDisabled && ditolakVal === '') validationErrors.push('Jumlah ditolak belum diisi.');

      if (isRegrafting && !app.querySelector('#sel-alasan')?.value) {
        validationErrors.push('Penyebab okulasi ulang belum dipilih.');
      }

      if (validationErrors.length > 0) {
        showValidationErrorDialog(validationErrors);
        return;
      }

      // Simpan data jika valid
      const kayu = parseInt(kayuVal || 0);
      const ditolak = isDitolakDisabled ? 0 : parseInt(ditolakVal || 0);

      // Pastikan data worker menggunakan data canonical master
      const canonicalWorkers = selectedWorkers.map(w => {
        const masterRec = getWorkerById(w.id);
        return {
          id: masterRec ? masterRec.id : w.id,
          name: masterRec ? masterRec.name : w.name,
          code: masterRec ? masterRec.code : w.code,
          qty: parseInt(w.qty || 0)
        };
      });

      const txs = storage.get('budding_transactions', []);
      const docModKey = isRegrafting ? 'regrafting' : 'budding';
      const docNoBudding = isEditing && txs[parseInt(editingIdx)] && txs[parseInt(editingIdx)].docNo
        ? txs[parseInt(editingIdx)].docNo
        : generateUniqueDocNo(docModKey, txs, 2026);

      if (isEditing && txs[parseInt(editingIdx)]) {
        txs[parseInt(editingIdx)] = {
          ...txs[parseInt(editingIdx)],
          klonEntres: normalizeKlonName(selectedKlon),
          workers: canonicalWorkers,
          jumlah: totalDiokulasi,
          jumlahKayu: kayu,
          jumlahMataEntres: mataEntres,
          jumlahDitolak: ditolak,
          alasan: isRegrafting ? app.querySelector('#sel-alasan')?.value : null
        };
        storage.set('budding_transactions', txs);
        storage.remove('editing_budding_index');
      } else {
        txs.push({
          docNo: docNoBudding,
          type: isRegrafting ? 'REGRAFTING' : 'GRAFTING',
          seedingIndex: parseInt(batchIdx),
          regraftPoolDocNo: poolDocNo,
          inspectionDocNo: inspectionDocNo,
          batchNo,
          sourceDocNo: docNo,
          sourceSelection3DocNo: !isRegrafting ? (selectedGraftingSourceDoc?.docNo || docNo) : null,
          sourceSelection3DocumentId: !isRegrafting ? (selectedGraftingSourceDoc?.id || null) : null,
          sourceSelection2DocNo: !isRegrafting ? (selectedGraftingSourceDoc?.sourceSelectionDocNo || selectedGraftingSourceDoc?.sourceDocNo || null) : null,
          sourceSelection1DocNo: !isRegrafting ? (selectedGraftingSourceDoc?.sourceSelection1DocNo || null) : null,
          sourceSeedingDocNo: !isRegrafting ? (selectedGraftingSourceDoc?.sourceSeedingDocNo || null) : null,
          programId: !isRegrafting ? (selectedGraftingSourceDoc?.programId || null) : null,
          programCode: !isRegrafting ? (selectedGraftingSourceDoc?.programCode || null) : null,
          estateId: !isRegrafting ? (selectedGraftingSourceDoc?.estateId || null) : null,
          divisionId: !isRegrafting ? (selectedGraftingSourceDoc?.divisionId || null) : null,
          tanggal: today,
          bedengan: bedenganDisplay,
          klonEntres: normalizeKlonName(selectedKlon),
          klonRootstock: klonRootstock ? normalizeKlonName(klonRootstock) : 'GT 1',
          workers: canonicalWorkers,
          jumlah: totalDiokulasi,
          jumlahKayu: kayu,
          jumlahMataEntres: mataEntres,
          jumlahDitolak: ditolak,
          alasan: isRegrafting ? app.querySelector('#sel-alasan')?.value : null
        });
        storage.set('budding_transactions', txs);
      }

      // SINKRONISASI KE REGRAFTING POOL UNTUK AKUMULASI KAYU ENTRES & SISA
      if (isRegrafting) {
        let pool = storage.get('regrafting_pool', []);
        pool = pool.map(p => {
          const isTarget = (p.docNo && p.docNo === poolDocNo) || (inspectionDocNo && p.inspectionDocNo && p.inspectionDocNo === inspectionDocNo);
          if (isTarget) {
            // Hitung akumulasi riil dari seluruh transaksi regrafting terkait dokumen pool ini
            const relatedTxs = txs.filter(t => t.type === 'REGRAFTING' && ((t.regraftPoolDocNo && t.regraftPoolDocNo === p.docNo) || (t.inspectionDocNo && p.inspectionDocNo && t.inspectionDocNo === p.inspectionDocNo)));
            let ttlDone = 0;
            let ttlKayu = 0;
            relatedTxs.forEach(t => {
              ttlDone += parseInt(t.jumlah || 0);
              ttlKayu += parseInt(t.jumlahKayu || 0);
            });
            const originalQty = parseInt(p.jumlah || 0);
            const newSisa = Math.max(0, originalQty - ttlDone);
            return {
              ...p,
              jumlahKayu: ttlKayu,
              sisaRegrafting: newSisa,
              status: newSisa <= 0 ? 'COMPLETED' : (ttlDone > 0 ? 'IN_PROGRESS' : 'READY_TO_REGRAFT')
            };
          }
          return p;
        });
        storage.set('regrafting_pool', pool);
      }

      // SINKRONISASI KE PENYELEKSIAN (SELECTION_POOL) UNTUK BIBIT DITOLAK SAAT OKULASI
      let selPool = storage.get('selection_pool', []);
      selPool = selPool.filter(s => !(s.buddingDocNo === docNoBudding && s.originType === 'REJECT_OKULASI'));
      if (ditolak > 0) {
        selPool.push({
          docNo: formatStandardDocNo(2026, 'CULL', selPool.length + 1),
          originType: 'REJECT_OKULASI',
          batchNo: batchNo,
          buddingDocNo: docNoBudding,
          inspectionDocNo: '-',
          klon: klonRootstock || 'GT-01',
          bedengan: bedenganDisplay,
          jumlahAfkir: ditolak,
          alasan: 'Bibit Ditolak saat Proses Okulasi (Grafting)',
          status: 'PENDING_DECLARATION'
        });
      }
      storage.set('selection_pool', selPool);

      storage.remove('budding_qr_verified');
      storage.remove('budding_verified_at');

      navigate(isRegrafting ? '/budding/regrafting' : '/budding/grafting');
    });
  }

  renderPage();
}
