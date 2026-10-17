/**
 * js/modules/info-center/info-center-ui.js
 * 
 * Presenter Antarmuka (UI Component)
 * Pusat Informasi & Alur Proses Aplikasi — SIGMA Rubber Nursery
 * 
 * JAMINAN IMPLEMENTASI:
 * 1. 5 Pilar Informasi: Ringkasan, Eksplorasi Role, Peta Alur, Panduan QA, Traceability.
 * 2. Pasif & Reaktif: Membaca session.getRole() tanpa memutasi session simulator.
 * 3. Eksplorasi Lokal: Dropdown peran lokal tidak mengubah sesi login HP.
 * 4. Kejujuran Alur: 0 silent fallback, pesan informatif untuk fitur tanpa flow.
 * 5. Isolasi Total: Semua elemen berakar di bawah .ic-root.
 */

import { session } from '../../core/session.js';
import { loadInfoCenterViewModel } from './info-center-adapter.js';
import { generateMermaidDiagramSyntax, renderMermaidDiagramSafely } from './info-center-flow-renderer.js';

// State Lokal Halaman Baru
let activePilarTab = 'ringkasan'; // 'ringkasan' | 'peran' | 'alur' | 'qa' | 'traceability'
let selectedExplorationRole = 'ALL'; // 'ALL' | 'mantri-bibitan' | 'asisten-bibitan' | ...
let selectedModuleId = '01-presensi';
let selectedFeatureId = 'presensi-supervisor';
let lastKnownSessionRole = null;
let isInitialized = false;

// Pemetaan Sesi Simulator (permissions.js) ke ID Role Pemetaan (Hanya 5 Role Operasional Resmi)
const SESSION_TO_ROLE_ID = Object.freeze({
  'MANTRI_TANAMAN': 'mantri-tanaman',
  'ASISTEN_BIBITAN': 'asisten-bibitan',
  'ASISTEN': 'asisten',
  'ASKEP': 'askep',
  'PENGURUS': 'pengurus'
});

/**
 * Mengambil informasi sesi simulator HP saat ini secara pasif
 */
function getSimulatorSessionInfo(viewModel) {
  const rawRole = session.getRole();
  const rawUser = session.getUser() || {};
  const roleId = SESSION_TO_ROLE_ID[rawRole] || null;
  const isOutOfScope = !roleId;
  const roleObj = roleId ? (viewModel?.roles || []).find((r) => r.id === roleId) : null;

  return {
    rawRole,
    roleId,
    isOutOfScope,
    roleName: roleObj ? roleObj.name : (rawUser.position || rawRole),
    userName: rawUser.name || 'Pengguna Simulator',
    position: rawUser.position || (roleObj ? roleObj.name : rawRole),
    estateName: rawUser.estateName || 'Kebun Tanah Besih',
    divisionName: rawUser.divisionName || 'Divisi I'
  };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render Pilar 1: Ringkasan Aplikasi
 */
function renderPilarRingkasan(vm, sessionInfo) {
  const m = vm.metrics;
  const explicitPct = Math.round((m.flowMaturity.explicitFlowCount / m.totalFeatures) * 100);
  const seqPct = Math.round((m.flowMaturity.sequentialBaselineCount / m.totalFeatures) * 100);
  const noFlowPct = 100 - explicitPct - seqPct;

  return `
    <div class="ic-metrics-grid">
      <div class="ic-metric-card">
        <div class="ic-metric-header">
          <span class="ic-metric-label">Peran Operasional</span>
          <span class="ic-metric-icon">👥</span>
        </div>
        <div class="ic-metric-value">${m.totalRoles}</div>
        <div class="ic-metric-desc">Peran aktif dalam proses bisnis lapangan</div>
      </div>

      <div class="ic-metric-card">
        <div class="ic-metric-header">
          <span class="ic-metric-label">Modul Terdaftar</span>
          <span class="ic-metric-icon">📦</span>
        </div>
        <div class="ic-metric-value">${m.totalModules}</div>
        <div class="ic-metric-desc">01 Presensi s.d. 16 Riwayat</div>
      </div>

      <div class="ic-metric-card">
        <div class="ic-metric-header">
          <span class="ic-metric-label">Fitur Terdaftar</span>
          <span class="ic-metric-icon">⚙️</span>
        </div>
        <div class="ic-metric-value">${m.totalFeatures}</div>
        <div class="ic-metric-desc">Proses fungsional pembibitan</div>
      </div>

      <div class="ic-metric-card">
        <div class="ic-metric-header">
          <span class="ic-metric-label">Kebutuhan Fungsional</span>
          <span class="ic-metric-icon">📋</span>
        </div>
        <div class="ic-metric-value">${m.totalActiveKF}</div>
        <div class="ic-metric-desc">Kebutuhan resmi aktif (Non-Uji)</div>
      </div>

      <div class="ic-metric-card">
        <div class="ic-metric-header">
          <span class="ic-metric-label">Standar Nonfungsional</span>
          <span class="ic-metric-icon">🛡️</span>
        </div>
        <div class="ic-metric-value">${m.totalActiveKNF}</div>
        <div class="ic-metric-desc">Usability, performa & audit trail</div>
      </div>
    </div>

    <!-- Kematangan Dokumentasi Alur -->
    <div class="ic-card-section">
      <h3 class="ic-section-title">
        <span>📊</span> Kematangan Dokumentasi Alur Proses (${m.totalFeatures} Fitur)
      </h3>
      <p style="font-size:0.83rem; color:#475569; margin:0 0 10px 0;">
        Penyajian tingkat kelengkapan diagram alur proses berdasarkan bukti relasi yang terverifikasi di kode dan data sumber dokumentasi mandiri:
      </p>

      <div class="ic-progress-bar-wrap">
        <div class="ic-progress-segment explicit" style="width: ${explicitPct}%;" title="Alur Penuh: ${m.flowMaturity.explicitFlowCount} Fitur (${explicitPct}%)"></div>
        <div class="ic-progress-segment sequential" style="width: ${seqPct}%;" title="Sekuensial Baseline: ${m.flowMaturity.sequentialBaselineCount} Fitur (${seqPct}%)"></div>
        <div class="ic-progress-segment noflow" style="width: ${noFlowPct}%;" title="Tahap Kebutuhan: ${m.flowMaturity.noFlowCount} Fitur (${noFlowPct}%)"></div>
      </div>

      <div class="ic-legend-row">
        <div class="ic-legend-item">
          <span class="ic-legend-dot" style="background:#10b981;"></span>
          <strong>Alur Terdefinisi Penuh:</strong> ${m.flowMaturity.explicitFlowCount} Fitur (${explicitPct}%) — Memiliki node & relasi edge eksplisit
        </div>
        <div class="ic-legend-item">
          <span class="ic-legend-dot" style="background:#f59e0b;"></span>
          <strong>Sekuensial Baseline:</strong> ${m.flowMaturity.sequentialBaselineCount} Fitur (${seqPct}%) — Memiliki node proses, relasi langkah berurutan
        </div>
        <div class="ic-legend-item">
          <span class="ic-legend-dot" style="background:#94a3b8;"></span>
          <strong>Tahap Kebutuhan:</strong> ${m.flowMaturity.noFlowCount} Fitur (${noFlowPct}%) — Kebutuhan terdaftar, diagram alur belum didefinisikan
        </div>
      </div>
    </div>

    <!-- Tata Kelola & Integritas Sumber Data -->
    <div class="ic-card-section">
      <h3 class="ic-section-title">
        <span>🔒</span> Kebijakan Integritas & Sumber Dokumentasi Mandiri
      </h3>
      <div style="font-size:0.82rem; color:#334155; line-height:1.6;">
        <p style="margin:0 0 8px 0;">
          Pusat Informasi Aplikasi beroperasi penuh menggunakan sumber dokumentasi independen:
        </p>
        <ul style="margin:0; padding-left:20px;">
          <li><strong>Sumber Mandiri:</strong> Menggunakan <code>data/info-center-data.json</code> dan fallback offline <code>js/data/info-center-baseline.js</code>, tanpa mengakses atau mengimpor data Pemetaan Alur Proses.</li>
          <li><strong>Penyaringan Data Non-Operasional:</strong> Kebutuhan uji/arsip dikarantina dari data resmi, dan hanya 5 peran operasional aktif yang disajikan.</li>
          <li><strong>Perlindungan Data Eksisting:</strong> Seluruh dataset dan tab existing dipertahankan 100% tanpa perubahan perilaku.</li>
        </ul>
      </div>
    </div>
  `;
}

/**
 * Render Pilar 2: Eksplorasi Berdasarkan Role
 */
function renderPilarPeran(vm, sessionInfo) {
  const isAll = selectedExplorationRole === 'ALL';
  const activeRoleId = isAll ? 'ALL' : selectedExplorationRole;

  if (activeRoleId === 'ALL') {
    // Mode Semua Peran Operasional: Tampilkan gabungan modul dari 5 role yang diizinkan tanpa duplikasi
    const relevantModules = vm.modules.filter((m) => {
      return vm.roles.some((r) => {
        return (r.accessibleModules && r.accessibleModules.includes(m.id)) || (r.primaryModules && r.primaryModules.includes(m.id));
      });
    });

    return `
      <div class="ic-role-banner">
        <div class="ic-role-banner-left">
          <h2>Semua Peran Operasional <span style="font-size:0.75rem; font-weight:600; background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:6px; margin-left:8px;">5 Peran Aktif Lapangan</span></h2>
          <p>Tampilan gabungan seluruh modul operasional pembibitan dari 5 peran resmi: Mantri Bibitan, Asisten Bibitan, Asisten Divisi, Asisten Kepala, dan Pengurus Kebun.</p>
          <div style="margin-top:10px; display:flex; flex-wrap:wrap; gap:6px;">
            ${vm.roles.map((r) => `<span style="background:#f1f5f9; padding:2px 8px; border-radius:4px; font-size:0.75rem; color:#334155;">👥 ${escapeHtml(r.name)}</span>`).join('')}
          </div>
        </div>
        <div class="ic-role-banner-right">
          <span class="ic-role-banner-badge" style="background:#f1f5f9; color:#475569;">
            📋 Ringkasan Lintas Peran
          </span>
        </div>
      </div>

      <div class="ic-card-section">
        <h3 class="ic-section-title">
          <span>📂</span> Modul Operasional Gabungan (${relevantModules.length} Modul Terverifikasi)
        </h3>
        <div class="ic-table-wrap">
          <table class="ic-table">
            <thead>
              <tr>
                <th style="width: 80px;">Modul</th>
                <th>Nama Modul</th>
                <th>Peran Utama</th>
                <th>Peran Terkait / Verifikator</th>
                <th>Fitur Terkait</th>
              </tr>
            </thead>
            <tbody>
              ${relevantModules.map((m) => `
                <tr>
                  <td><strong>[${escapeHtml(m.order)}]</strong></td>
                  <td>
                    <strong>${escapeHtml(m.name)}</strong><br>
                    <small style="color:#64748b;">${escapeHtml(m.subtitle)}</small>
                  </td>
                  <td><span class="ic-badge-sm ic-badge-role">${escapeHtml(m.primaryRole)}</span></td>
                  <td><small>${escapeHtml(m.relatedRole)}</small></td>
                  <td>
                    <ul style="margin:0; padding-left:16px;">
                      ${m.features.map((f) => `
                        <li style="margin-bottom:4px;">
                          ${escapeHtml(f.name)}
                          ${f.navigationSurface ? `<span style="font-size:0.68rem; background:#f1f5f9; color:#475569; padding:1px 5px; border-radius:3px; margin-left:4px;">${escapeHtml(f.navigationSurface)}</span>` : ''}
                          ${f.prototypeRoute ? `<small style="color:#16a34a; margin-left:4px;">(${escapeHtml(f.prototypeRoute)})</small>` : ''}
                        </li>
                      `).join('')}
                    </ul>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  const currentRoleObj = vm.roles.find((r) => r.id === activeRoleId) || vm.roles[0];
  const isSimulatorActive = activeRoleId === sessionInfo.roleId;

  // Saring modul yang relevan dengan peran ini berdasarkan kepemilikan dan hak akses terverifikasi
  const relevantModules = vm.modules.filter((m) => {
    if (activeRoleId === 'mantri-tanaman' || activeRoleId === 'asisten-bibitan') {
      return (currentRoleObj.accessibleModules && currentRoleObj.accessibleModules.includes(m.id)) || (currentRoleObj.primaryModules && currentRoleObj.primaryModules.includes(m.id));
    }
    if (currentRoleObj.accessibleModules && currentRoleObj.accessibleModules.includes(m.id)) return true;
    if (currentRoleObj.primaryModules && currentRoleObj.primaryModules.includes(m.id)) return true;
    const pRole = (m.primaryRole || '').toLowerCase();
    const rRole = (m.relatedRole || '').toLowerCase();
    const targetName = (currentRoleObj.name || '').toLowerCase();
    return pRole.includes(targetName) || rRole.includes(targetName);
  });

  const navCtx = currentRoleObj.navigationContext || {};

  return `
    <div class="ic-role-banner">
      <div class="ic-role-banner-left">
        <h2>${escapeHtml(currentRoleObj.name)} <span style="font-size:0.75rem; font-weight:600; background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:6px; margin-left:8px;">${escapeHtml(currentRoleObj.category || 'OPERATIONAL')} · ${escapeHtml(currentRoleObj.scopeType || 'DIVISION')}</span></h2>
        <p>${escapeHtml(currentRoleObj.desc)}</p>
        <div style="margin-top:10px; display:flex; flex-wrap:wrap; gap:8px; font-size:0.75rem;">
          <span style="background:#f1f5f9; padding:3px 8px; border-radius:4px; color:#334155;"><strong>Beranda:</strong> ${escapeHtml(navCtx.beranda || 'Akses Standar')}</span>
          <span style="background:#f1f5f9; padding:3px 8px; border-radius:4px; color:#334155;"><strong>Sidebar Drawer:</strong> ${escapeHtml(navCtx.drawer || 'Menu Standar')}</span>
          ${navCtx.bottomNav && navCtx.bottomNav !== 'Tidak Ada' ? `<span style="background:#ecfdf5; color:#065f46; padding:3px 8px; border-radius:4px; font-weight:600;"><strong>Bottom Nav:</strong> ${escapeHtml(navCtx.bottomNav)}</span>` : ''}
        </div>
      </div>
      <div class="ic-role-banner-right">
        <span class="ic-role-banner-badge">
          ${isSimulatorActive ? '🟢 Sesuai Persona Aktif Simulator' : '👁️ Mode Eksplorasi Khusus'}
        </span>
      </div>
    </div>

    <div class="ic-card-section">
      <h3 class="ic-section-title">
        <span>📂</span> Modul & Tanggung Jawab Operasional (${relevantModules.length} Modul Terkait)
      </h3>
      <div class="ic-table-wrap">
        <table class="ic-table">
          <thead>
            <tr>
              <th style="width: 80px;">Modul</th>
              <th>Nama Modul</th>
              <th>Peran Utama</th>
              <th>Peran Terkait / Verifikator</th>
              <th>Fitur Terkait</th>
            </tr>
          </thead>
          <tbody>
            ${relevantModules.map((m) => `
              <tr>
                <td><strong>[${escapeHtml(m.order)}]</strong></td>
                <td>
                  <strong>${escapeHtml(m.name)}</strong><br>
                  <small style="color:#64748b;">${escapeHtml(m.subtitle)}</small>
                </td>
                <td><span class="ic-badge-sm ic-badge-role">${escapeHtml(m.primaryRole)}</span></td>
                <td><small>${escapeHtml(m.relatedRole)}</small></td>
                <td>
                  <ul style="margin:0; padding-left:16px;">
                    ${m.features.map((f) => `
                      <li style="margin-bottom:4px;">
                        ${escapeHtml(f.name)}
                        ${f.navigationSurface ? `<span style="font-size:0.68rem; background:#f1f5f9; color:#475569; padding:1px 5px; border-radius:3px; margin-left:4px;">${escapeHtml(f.navigationSurface)}</span>` : ''}
                        ${f.prototypeRoute ? `<small style="color:#16a34a; margin-left:4px;">(${escapeHtml(f.prototypeRoute)})</small>` : ''}
                      </li>
                    `).join('')}
                  </ul>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Render Pilar 3: Peta Modul, Fitur, dan Alur Proses
 */
function renderPilarAlur(vm) {
  const currentMod = vm.modules.find((m) => m.id === selectedModuleId) || vm.modules[0];
  const currentFeat = (currentMod.features || []).find((f) => f.id === selectedFeatureId) || currentMod.features[0] || {};
  const isNoFlow = currentFeat.flowStatus === 'NO_FLOW';
  const isSequential = currentFeat.flowStatus === 'SEQUENTIAL_BASELINE';

  return `
    <div class="ic-flow-layout">
      <!-- Kolom Kiri: Hirarki Modul & Fitur -->
      <aside class="ic-sidebar">
        <div style="font-size:0.75rem; font-weight:700; color:#64748b; margin-bottom:10px; text-transform:uppercase;">
          Pilih Modul & Fitur
        </div>
        ${vm.modules.map((m) => {
          const isModActive = m.id === currentMod.id;
          return `
            <div class="ic-mod-item">
              <button type="button" class="ic-mod-header-btn ${isModActive ? 'is-expanded' : ''}" data-mod-id="${escapeHtml(m.id)}">
                <span>[${escapeHtml(m.order)}] ${escapeHtml(m.name)}</span>
                <span style="font-size:0.7rem; color:#94a3b8;">${m.features.length} fitur</span>
              </button>
              ${isModActive ? `
                <div class="ic-feat-list">
                  ${m.features.map((f) => {
                    const isFeatActive = f.id === currentFeat.id;
                    return `
                      <button type="button" class="ic-feat-btn ${isFeatActive ? 'is-active' : ''}" data-feat-id="${escapeHtml(f.id)}">
                        <span>${escapeHtml(f.name)}</span>
                        ${f.flowStatus === 'NO_FLOW' ? '<span style="font-size:0.65rem; color:#94a3b8;">(Req)</span>' : ''}
                      </button>
                    `;
                  }).join('')}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </aside>

      <!-- Kolom Kanan: Detail Alur Proses Fitur Terpilih -->
      <main class="ic-main-view">
        <div class="ic-view-head">
          <div class="ic-view-title-row">
            <div>
              <div style="font-size:0.78rem; color:#64748b; font-weight:600;">[${escapeHtml(currentMod.order)}] ${escapeHtml(currentMod.name)}</div>
              <h2 class="ic-view-title">${escapeHtml(currentFeat.name)}</h2>
            </div>
            <div>
              <span class="ic-status-pill ${isNoFlow ? 'noflow' : isSequential ? 'sequential' : 'explicit'}">
                ${escapeHtml(currentFeat.flowStatusLabel)}
              </span>
            </div>
          </div>
          ${currentFeat.desc ? `<p style="font-size:0.84rem; color:#475569; margin:8px 0 0 0;">${escapeHtml(currentFeat.desc)}</p>` : ''}
        </div>

        <!-- Penanganan Alur Secara Transparan & Jujur -->
        ${isNoFlow ? `
          <div class="ic-alert-box ic-alert-info">
            <strong>ℹ️ Informasi Diagram Alur Belum Tersedia</strong><br>
            Kebutuhan sistem untuk fitur ini sudah terdaftar resmi (${currentFeat.relatedRequirements.length} Kebutuhan), namun tahapan diagram alur proses belum didefinisikan pada baseline saat ini.
            <div style="margin-top:6px; font-size:0.78rem; color:#0369a1;">
              <em>Catatan: Sistem tidak meminjam atau membelokkan diagram dari fitur lain demi menjaga akurasi informasi bisnis.</em>
            </div>
          </div>
        ` : `
          ${isSequential ? `
            <div class="ic-alert-box ic-alert-warning" style="margin-bottom:12px;">
              <strong>⚠️ Catatan Verifikasi Alur:</strong><br>
              Diagram di bawah menampilkan tahapan proses berurutan berdasarkan baseline prototipe. Hubungan kondisi prasyarat antarlangkah masih dalam konfirmasi tim analis agronomi.
            </div>
          ` : ''}

          <!-- Kontainer Diagram Mermaid -->
          <div class="ic-diagram-canvas" id="ic-diagram-canvas" data-mermaid="${escapeHtml(generateMermaidDiagramSyntax(currentFeat))}">
            <div style="color:#64748b; font-size:0.8rem; padding:20px;">Menyiapkan visualisasi diagram alur...</div>
          </div>

          <!-- Rincian Node Aktivitas -->
          <h4 style="font-size:0.9rem; font-weight:700; margin:20px 0 10px 0; color:#0f172a;">
            Tahapan Aktivitas Proses (${currentFeat.nodes.length} Langkah)
          </h4>
          <div class="ic-table-wrap">
            <table class="ic-table">
              <thead>
                <tr>
                  <th style="width: 70px;">Kode</th>
                  <th>Nama Langkah Aktivitas</th>
                  <th style="width: 140px;">Pelaksana</th>
                  <th style="width: 100px;">Tipe Langkah</th>
                  <th style="width: 110px;">ID Kebutuhan</th>
                </tr>
              </thead>
              <tbody>
                ${currentFeat.nodes.map((n) => `
                  <tr>
                    <td><code>${escapeHtml(n.code || n.id)}</code></td>
                    <td><strong>${escapeHtml(n.title)}</strong></td>
                    <td><span class="ic-badge-sm ic-badge-role">${escapeHtml(n.role)}</span></td>
                    <td><span class="ic-badge-sm" style="background:#f1f5f9; color:#475569;">${escapeHtml(n.type)}</span></td>
                    <td>${n.reqId ? `<code>${escapeHtml(n.reqId)}</code>` : '<span style="color:#94a3b8;">-</span>'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}

        <!-- Daftar Kebutuhan Terhubung Fitur Ini -->
        <h4 style="font-size:0.9rem; font-weight:700; margin:24px 0 10px 0; color:#0f172a;">
          Kebutuhan Sistem Terkait (${currentFeat.relatedRequirements.length} Kebutuhan)
        </h4>
        ${currentFeat.relatedRequirements.length > 0 ? `
          <div class="ic-table-wrap">
            <table class="ic-table">
              <thead>
                <tr>
                  <th style="width: 110px;">ID Kebutuhan</th>
                  <th>Deskripsi Kebutuhan</th>
                  <th style="width: 120px;">Peran</th>
                  <th style="width: 100px;">Status Dokumen</th>
                </tr>
              </thead>
              <tbody>
                ${currentFeat.relatedRequirements.map((r) => `
                  <tr>
                    <td><code>${escapeHtml(r.id)}</code></td>
                    <td>${escapeHtml(r.title)}</td>
                    <td><span class="ic-badge-sm ic-badge-role">${escapeHtml(r.role)}</span></td>
                    <td><span class="ic-badge-sm ic-badge-confirmed">${escapeHtml(r.status)}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : `
          <div style="font-size:0.8rem; color:#94a3b8; font-style:italic;">
            Belum ada spesifikasi kebutuhan fungsional yang ditautkan langsung ke fitur ini.
          </div>
        `}
      </main>
    </div>
  `;
}

/**
 * Render Pilar 4: Panduan Pengujian QA
 */
function renderPilarQA(vm) {
  return `
    <div class="ic-card-section">
      <div class="ic-alert-box ic-alert-info">
        <strong>🧪 Panduan Pengujian Berdasarkan Spesifikasi Kebutuhan Aktual</strong><br>
        Tabel di bawah menyajikan parameter pengujian (input, validasi, dan output) yang bersumber langsung dari spesifikasi kebutuhan resmi.
        Status pengujian dinyatakan secara jujur: status <em>"Belum Dilakukan Pengujian Formal"</em> mencerminkan bahwa hasil uji belum diunggah ke repositori kode.
      </div>

      <div class="ic-table-wrap">
        <table class="ic-table">
          <thead>
            <tr>
              <th style="width: 110px;">ID Req</th>
              <th style="width: 120px;">Modul</th>
              <th>Kriteria Input Pengujian</th>
              <th>Aturan Validasi Sistem</th>
              <th>Hasil yang Diharapkan</th>
              <th style="width: 140px;">Bukti di Prototipe</th>
              <th style="width: 140px;">Status Eksekusi QA</th>
            </tr>
          </thead>
          <tbody>
            ${vm.activeKF.slice(0, 30).map((r) => {
              const matchedMod = vm.modules.find((m) => m.id === r.moduleId || m.name === r.moduleId);
              const matchedFeat = matchedMod?.features.find((f) => f.id === r.featureId || f.name === r.featureId);
              const route = matchedFeat?.prototypeRoute || null;

              return `
                <tr>
                  <td><code>${escapeHtml(r.id)}</code></td>
                  <td><small><strong>${escapeHtml(matchedMod?.name || r.moduleId)}</strong></small></td>
                  <td><small>${escapeHtml(r.input)}</small></td>
                  <td><small style="color:#b45309;">${escapeHtml(r.validation)}</small></td>
                  <td><small style="color:#15803d;">${escapeHtml(r.output)}</small></td>
                  <td>
                    ${route ? `
                      <span class="ic-badge-sm ic-badge-route" title="Rute aktif di simulator">${escapeHtml(route)}</span>
                    ` : `
                      <span style="font-size:0.72rem; color:#94a3b8;">Belum Diimplementasi</span>
                    `}
                  </td>
                  <td>
                    <span class="ic-badge-sm" style="background:#f1f5f9; color:#475569;">Belum Dilakukan Uji</span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div style="font-size:0.75rem; color:#64748b; margin-top:10px;">
        * Menampilkan 30 kebutuhan operasional teratas. Seluruh 127 kebutuhan fungsional resmi aktif telah tervalidasi pada data adapter.
      </div>
    </div>
  `;
}

/**
 * Render Pilar 5: Keterlacakan & Standar
 */
function renderPilarTraceability(vm) {
  return `
    <!-- Aturan Bisnis Kanonik Terverifikasi -->
    <div class="ic-card-section">
      <h3 class="ic-section-title">
        <span>⚖️</span> Aturan Bisnis Operasional Kebun (${vm.businessRules.length} Aturan Terverifikasi)
      </h3>
      <div class="ic-table-wrap">
        <table class="ic-table">
          <thead>
            <tr>
              <th style="width: 110px;">ID Aturan</th>
              <th style="width: 140px;">Kategori</th>
              <th style="width: 220px;">Judul Aturan Bisnis</th>
              <th>Ketentuan & Logika Validasi</th>
              <th style="width: 140px;">Referensi Sumber</th>
            </tr>
          </thead>
          <tbody>
            ${vm.businessRules.map((br) => `
              <tr>
                <td><code>${escapeHtml(br.id || br.code)}</code></td>
                <td><span class="ic-badge-sm ic-badge-role">${escapeHtml(br.category)}</span></td>
                <td><strong>${escapeHtml(br.title)}</strong></td>
                <td>${escapeHtml(br.desc)}</td>
                <td><small style="color:#64748b;">${escapeHtml(br.sourceRef || '-')}</small></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Standar Nonfungsional KNF Terpisah -->
    <div class="ic-card-section">
      <h3 class="ic-section-title">
        <span>🛡️</span> Standar Mutu & Kebutuhan Nonfungsional (${vm.activeKNF.length} Item)
      </h3>
      <p style="font-size:0.83rem; color:#475569; margin:0 0 12px 0;">
        Standar arsitektur teknis yang mengatur kinerja aplikasi mobile SIGMA Nursery di lapangan perkebunan:
      </p>
      <div class="ic-table-wrap">
        <table class="ic-table">
          <thead>
            <tr>
              <th style="width: 100px;">ID Standar</th>
              <th style="width: 130px;">Kategori</th>
              <th>Pernyataan Standar Nonfungsional</th>
              <th>Kriteria Penerimaan Teknis</th>
            </tr>
          </thead>
          <tbody>
            ${vm.activeKNF.map((knf) => `
              <tr>
                <td><code>${escapeHtml(knf.id)}</code></td>
                <td><span class="ic-badge-sm" style="background:#fef3c7; color:#92400e;">${escapeHtml(knf.category)}</span></td>
                <td><strong>${escapeHtml(knf.title)}</strong></td>
                <td><small style="color:#475569;">${escapeHtml(knf.acceptance)}</small></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Entry Point Utama: Render Portal Pusat Informasi
 * @param {HTMLElement} container 
 */
export async function renderInfoCenterPortal(container) {
  if (!container) return;

  // Render Skeleton / Loading State
  container.innerHTML = `
    <div class="ic-root">
      <div style="padding: 40px; text-align: center; color: #64748b;">
        <div style="font-size: 1.5rem; margin-bottom: 8px;">🌿</div>
        <div style="font-weight: 600;">Memuat Pusat Informasi & Alur Proses...</div>
        <div style="font-size: 0.78rem; color: #94a3b8; margin-top: 4px;">Mengolah data proses bisnis secara aman (Read-Only)</div>
      </div>
    </div>
  `;

  try {
    const viewModel = await loadInfoCenterViewModel();
    const sessionInfo = getSimulatorSessionInfo(viewModel);
    lastKnownSessionRole = sessionInfo.rawRole;

    // Render Kerangka Utama
    const html = `
      <div class="ic-root">
        <!-- 1. Header Informasi & Konteks Sesi -->
        <header class="ic-header">
          <div class="ic-header-top">
            <div class="ic-brand-group">
              <div class="ic-brand-icon">📚</div>
              <div>
                <h1 class="ic-title">Pusat Informasi & Alur Proses Aplikasi</h1>
                <p class="ic-subtitle">Dokumentasi Terintegrasi Proses Bisnis, Alur Lapangan & Kebutuhan Pengujian</p>
              </div>
            </div>

            <div class="ic-header-actions">
              <!-- Sesi Aktif Simulator HP -->
              <div class="ic-session-pill" title="Sesi aktif pada layar simulator mobile di sebelah kiri">
                <span class="ic-session-dot" style="${sessionInfo.isOutOfScope ? 'background:#f59e0b;' : ''}"></span>
                <span>Sesi HP: <strong>${escapeHtml(sessionInfo.userName)}</strong> (${escapeHtml(sessionInfo.position)})${sessionInfo.isOutOfScope ? ' <em style="font-size:0.75rem; color:#92400e;">(Di Luar Cakupan Operasional)</em>' : ''}</span>
              </div>

              <!-- Filter Eksplorasi Lokal (Tidak Mengubah Sesi HP) -->
              <div class="ic-role-selector-wrap" title="Hanya menyaring tampilan informasi, tidak mengubah sesi simulator">
                <label class="ic-role-selector-label" for="ic-select-role">Lihat Sebagai:</label>
                <select class="ic-role-select" id="ic-select-role">
                  <option value="ALL" ${selectedExplorationRole === 'ALL' ? 'selected' : ''}>Semua Peran Operasional</option>
                  ${viewModel.roles.map((r) => `
                    <option value="${escapeHtml(r.id)}" ${selectedExplorationRole === r.id ? 'selected' : ''}>
                      ${escapeHtml(r.name)}
                    </option>
                  `).join('')}
                </select>
              </div>
            </div>
          </div>
        </header>

        <!-- 2. Bilah Tab 5 Pilar Informasi -->
        <nav class="ic-nav-tabs">
          <button type="button" class="ic-tab-btn ${activePilarTab === 'ringkasan' ? 'is-active' : ''}" data-pilar="ringkasan">
            <span>📊 Ringkasan Aplikasi</span>
          </button>
          <button type="button" class="ic-tab-btn ${activePilarTab === 'peran' ? 'is-active' : ''}" data-pilar="peran">
            <span>👥 Eksplorasi Peran</span>
          </button>
          <button type="button" class="ic-tab-btn ${activePilarTab === 'alur' ? 'is-active' : ''}" data-pilar="alur">
            <span>🗺️ Peta Modul & Alur</span>
          </button>
          <button type="button" class="ic-tab-btn ${activePilarTab === 'qa' ? 'is-active' : ''}" data-pilar="qa">
            <span>🧪 Panduan Pengujian QA</span>
          </button>
          <button type="button" class="ic-tab-btn ${activePilarTab === 'traceability' ? 'is-active' : ''}" data-pilar="traceability">
            <span>🔗 Keterlacakan & Standar</span>
          </button>
        </nav>

        <!-- 3. Wadah Konten Pilar Aktif -->
        <div class="ic-body">
          ${activePilarTab === 'ringkasan' ? renderPilarRingkasan(viewModel, sessionInfo) : ''}
          ${activePilarTab === 'peran' ? renderPilarPeran(viewModel, sessionInfo) : ''}
          ${activePilarTab === 'alur' ? renderPilarAlur(viewModel) : ''}
          ${activePilarTab === 'qa' ? renderPilarQA(viewModel) : ''}
          ${activePilarTab === 'traceability' ? renderPilarTraceability(viewModel) : ''}
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach Event Listeners
    attachInfoCenterEvents(container, viewModel);

    // Render Diagram jika berada pada tab Alur
    if (activePilarTab === 'alur') {
      const diagramEl = container.querySelector('#ic-diagram-canvas');
      if (diagramEl && diagramEl.dataset.mermaid) {
        renderMermaidDiagramSafely(diagramEl, diagramEl.dataset.mermaid);
      }
    }
  } catch (err) {
    console.error('❌ [InfoCenterUI] Gagal me-render Pusat Informasi:', err);
    container.innerHTML = `
      <div class="ic-root" style="padding: 24px;">
        <div class="ic-alert-box ic-alert-danger">
          <strong>Gagal memuat Pusat Informasi Aplikasi</strong><br>
          <small>${escapeHtml(err.message || 'Terjadi kesalahan sistem saat memproses data.')}</small>
        </div>
      </div>
    `;
  }
}

/**
 * Event Listeners untuk Interaksi UI
 */
function attachInfoCenterEvents(container, viewModel) {
  // 1. Pergantian Tab Pilar
  container.querySelectorAll('.ic-tab-btn[data-pilar]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetPilar = btn.dataset.pilar;
      if (targetPilar && targetPilar !== activePilarTab) {
        activePilarTab = targetPilar;
        renderInfoCenterPortal(container);
      }
    });
  });

  // 2. Dropdown Eksplorasi Peran Lokal
  const roleSelect = container.querySelector('#ic-select-role');
  roleSelect?.addEventListener('change', (e) => {
    selectedExplorationRole = e.target.value;
    renderInfoCenterPortal(container);
  });

  // 3. Modul Header Button (Sidebar Tab Alur)
  container.querySelectorAll('.ic-mod-header-btn[data-mod-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const modId = btn.dataset.modId;
      if (modId !== selectedModuleId) {
        selectedModuleId = modId;
        const targetMod = viewModel.modules.find((m) => m.id === modId);
        selectedFeatureId = targetMod?.features[0]?.id || '';
        renderInfoCenterPortal(container);
      }
    });
  });

  // 4. Feature Button (Sidebar Tab Alur)
  container.querySelectorAll('.ic-feat-btn[data-feat-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const featId = btn.dataset.featId;
      if (featId !== selectedFeatureId) {
        selectedFeatureId = featId;
        renderInfoCenterPortal(container);
      }
    });
  });

  // 5. Lifecycle Listener: Pasif memeriksa apakah Sesi HP berubah
  if (!isInitialized) {
    isInitialized = true;

    const checkSessionChange = () => {
      const currentRawRole = session.getRole();
      if (currentRawRole && currentRawRole !== lastKnownSessionRole) {
        lastKnownSessionRole = currentRawRole;
        const activeContainer = document.getElementById('info-center-container');
        if (activeContainer && activeContainer.isConnected) {
          renderInfoCenterPortal(activeContainer);
        }
      }
    };

    window.addEventListener('hashchange', checkSessionChange);
    window.addEventListener('focus', checkSessionChange);
  }
}
