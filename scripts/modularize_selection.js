import fs from 'fs';
import vm from 'vm';

const original = fs.readFileSync('js/modules/selection/selection-landing.js', 'utf8');
const lines = original.split('\n');

// 1. PreGrafting Section
const preGraftingContent = lines.slice(818, 2010).join('\n');

// 2. PascaSemai Section
const pascaSemaiContent = lines.slice(2012, 2084).join('\n');

// 3. PostGrafting Section
const postGraftingContent = lines.slice(2086, 2252).join('\n');

const helpers = `
function renderMantriPreGraftingSection(seleksi1Docs, seleksi2Docs, seleksi3Docs, activePreGraftingTab) {
  return \`
    <!-- SUB-TAB SELEKSI PRA-OKULASI: SELEKSI I vs SELEKSI II vs SELEKSI III -->
    <div style="display: flex; background: #F1F5F9; border-radius: 8px; padding: 4px; margin-bottom: 14px; gap: 4px;">
      <button id="subtab-seleksi-1" type="button" style="flex: 1; padding: 8px 4px; font-size: 0.78rem; font-weight: \${activePreGraftingTab === 'SELEKSI_1' ? '700' : '600'}; color: \${activePreGraftingTab === 'SELEKSI_1' ? '#116834' : '#64748B'}; background: \${activePreGraftingTab === 'SELEKSI_1' ? '#FFFFFF' : 'transparent'}; border: none; border-radius: 6px; cursor: pointer; box-shadow: \${activePreGraftingTab === 'SELEKSI_1' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'}; display: flex; align-items: center; justify-content: center; gap: 6px;">
        <span>Seleksi I</span>
        \${seleksi1Docs.length > 0 ? \`<span style="background: \${activePreGraftingTab === 'SELEKSI_1' ? '#116834' : '#94A3B8'}; color: #FFF; font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">\${seleksi1Docs.length}</span>\` : ''}
      </button>
      <button id="subtab-seleksi-2" type="button" style="flex: 1; padding: 8px 4px; font-size: 0.78rem; font-weight: \${activePreGraftingTab === 'SELEKSI_2' ? '700' : '600'}; color: \${activePreGraftingTab === 'SELEKSI_2' ? '#116834' : '#64748B'}; background: \${activePreGraftingTab === 'SELEKSI_2' ? '#FFFFFF' : 'transparent'}; border: none; border-radius: 6px; cursor: pointer; box-shadow: \${activePreGraftingTab === 'SELEKSI_2' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'}; display: flex; align-items: center; justify-content: center; gap: 6px;">
        <span>Seleksi II</span>
        \${seleksi2Docs.length > 0 ? \`<span style="background: \${activePreGraftingTab === 'SELEKSI_2' ? '#116834' : '#94A3B8'}; color: #FFF; font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">\${seleksi2Docs.length}</span>\` : ''}
      </button>
      <button id="subtab-seleksi-3" type="button" style="flex: 1; padding: 8px 4px; font-size: 0.78rem; font-weight: \${activePreGraftingTab === 'SELEKSI_3' ? '700' : '600'}; color: \${activePreGraftingTab === 'SELEKSI_3' ? '#116834' : '#64748B'}; background: \${activePreGraftingTab === 'SELEKSI_3' ? '#FFFFFF' : 'transparent'}; border: none; border-radius: 6px; cursor: pointer; box-shadow: \${activePreGraftingTab === 'SELEKSI_3' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'}; display: flex; align-items: center; justify-content: center; gap: 6px;">
        <span>Seleksi III</span>
        \${seleksi3Docs.length > 0 ? \`<span style="background: \${activePreGraftingTab === 'SELEKSI_3' ? '#116834' : '#94A3B8'}; color: #FFF; font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 999px;">\${seleksi3Docs.length}</span>\` : ''}
      </button>
    </div>

    \${activePreGraftingTab === 'SELEKSI_1' ? renderSeleksi1Section(seleksi1Docs) : (activePreGraftingTab === 'SELEKSI_2' ? renderSeleksi2Section(seleksi2Docs) : renderSeleksi3Section(seleksi3Docs))}
  \`;
}

function renderMantriPascaSemaiSection(pascaSemaiPool) {
  return \`
    <!-- VIEW: PASCA SEMAI (DEDERAN REJECTION DECLARATION) -->
    <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
      <h2 style="font-size: 0.88rem; font-weight: 700; color: #0F172A; margin: 0;">Bibit Tidak Berhasil Dederan (\${pascaSemaiPool.length})</h2>
    </div>

    \${pascaSemaiPool.length === 0 ? \`
      <div style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; padding: 40px 20px; text-align: center; margin-top: 10px;">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: #F1F5F9; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; color: #64748B;">
          🌱
        </div>
        <h3 style="font-size: 0.95rem; font-weight: 700; color: #0F172A; margin: 0 0 4px 0;">Belum Ada Bibit Afkir Pasca Semai</h3>
        <p style="font-size: 0.78rem; color: #64748B; margin: 0; line-height: 1.45;">
          Bibit tidak berhasil dari Pemeriksaan Dederan akan otomatis masuk ke sini sebagai <strong>PENDING_DECLARATION</strong> untuk dideklarasikan (Reject, Afkir, atau Mati).
        </p>
      </div>
    \` : \`
      <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
        \${pascaSemaiPool.map((item, idx) => {
          const isDeclared = item.status === 'DECLARED_CULLED';
          const qtyAfkir = parseInt(item.jumlahAfkir || item.quantity || 0, 10);
          let catBadge = isDeclared ? (item.category || 'Reject') : 'Belum Dideklarasikan';

          return \`
            <div class="card-pasca-semai-wrapper" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); display: flex; flex-direction: column;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                <div>
                  <span style="font-size: 0.65rem; font-weight: 700; background: #DCFCE7; color: #116834; padding: 2px 6px; border-radius: 4px; border: 1px solid #86EFAC;">
                    DEDERAN: \${item.bedenganCode || '-'}
                  </span>
                  <div style="font-weight: 800; font-size: 0.92rem; color: #0F172A; margin-top: 4px;">
                    \${item.docNo}
                  </div>
                </div>
                <span style="font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 4px; background: \${isDeclared ? '#F0FDF4' : '#FEF2F2'}; color: \${isDeclared ? '#15803D' : '#DC2626'}; border: 1px solid \${isDeclared ? '#BBF7D0' : '#FECACA'};">
                  \${isDeclared ? \`Dideklarasikan (\${catBadge})\` : 'Perlu Deklarasi'}
                </span>
              </div>

              <div style="font-size: 0.72rem; color: #64748B; margin-bottom: 8px;">
                Pemeriksaan Asal: <strong>\${item.sourceDocNo || '-'}</strong> • Deder: <strong>\${item.dederanDocNo || '-'}</strong>
              </div>

              <div style="background: #FEF2F2; border: 1px solid #FEE2E2; border-radius: 8px; padding: 8px 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-size: 0.65rem; font-weight: 800; color: #DC2626; text-transform: uppercase;">
                    TIDAK BERHASIL DEDERAN
                  </div>
                  <div style="font-size: 0.70rem; color: #4B5563; margin-top: 1px;">
                    \${item.alasan || 'Hasil Pemeriksaan Dederan Tidak Berhasil'}
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 1.25rem; font-weight: 900; color: #DC2626;">
                    \${qtyAfkir.toLocaleString('id-ID')}
                  </div>
                  <div style="font-size: 0.65rem; font-weight: 700; color: #991B1B;">Butir</div>
                </div>
              </div>

              \${!isDeclared ? \`
                <button type="button" class="btn-deklarasi-pasca-semai" data-id="\${item.id}" data-qty="\${qtyAfkir}" data-doc="\${item.docNo}" style="width: 100%; height: 38px; background: #116834; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.80rem; cursor: pointer; box-shadow: 0 1px 2px rgba(17,104,52,0.2);">
                  Deklarasi Pasca Semai (Reject / Afkir / Mati)
                </button>
              \` : \`
                <div style="font-size: 0.72rem; color: #15803D; font-weight: 700; text-align: center; padding: 4px 0;">
                  ✓ Dideklarasikan sebagai \${item.category} (\${item.declaredAt ? formatDate(item.declaredAt) : '-'})
                </div>
              \`}
            </div>
          \`;
        }).join('')}
      </div>
    \`}
  \`;
}
`;

console.log('Helpers created successfully.');
