/**
 * modules/dashboard/beranda.js — Halaman Beranda Mantri Bibitan.
 * Sesuai desain acuan: 3x3 Grid Menu (Presensi, Penerimaan, Penyemaian, Okulasi,
 * Pemeriksaan, Penyeleksian, Material & Bahan, Rekam Pemeliharaan, Permintaan)
 * dan 2 tombol bottom (Konfirmasi untuk Konsolidasi, Konfirmasi untuk Verifikasi).
 */

import { session } from '../../core/session.js';
import { storage } from '../../core/storage.js';
import { openDrawer } from '../../components/drawer.js';
import { toast } from '../../components/toast.js';
import { navigate } from '../../core/router.js';

/* SVG Icons sesuai desain acuan - proporsional & tajam */
const ICONS = {
  team: `
    <svg viewBox="2 3 26 22" width="56" height="56" fill="#116834">
      <circle cx="11" cy="9" r="4.3" fill="#116834"/>
      <path d="M4 23 C4 18 7.5 15.5 11 15.5 C14.5 15.5 18 18 18 23 Z" fill="#116834"/>
      <circle cx="21" cy="10.5" r="3.5" fill="#116834"/>
      <path d="M16.8 23 C17 19.8 18.8 17.8 21 17.8 C23.5 17.8 26.5 19.8 26.5 23 Z" fill="#116834"/>
    </svg>
  `,
  documentPlus: `
    <svg viewBox="3 2 26 27" width="56" height="56" fill="#116834">
      <rect x="5" y="4" width="22" height="24" rx="4.5" fill="#116834"/>
      <line x1="9" y1="12" x2="19" y2="12" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="9" y1="16" x2="19" y2="16" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="9" y1="20" x2="16" y2="20" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="23" cy="7" r="4.2" fill="#116834" stroke="#ffffff" stroke-width="1.5"/>
      <line x1="23" y1="4.8" x2="23" y2="9.2" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
      <line x1="20.8" y1="7" x2="25.2" y2="7" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `,
  sprout: `
    <svg viewBox="2 1.5 28 19" width="56" height="56" fill="#116834">
      <path d="M16 2.5 C16 2.5 11.5 8.5 11.5 14 C11.5 16.8 13.5 19 16 19 C18.5 19 20.5 16.8 20.5 14 C20.5 8.5 16 2.5 16 2.5 Z" fill="#116834"/>
      <path d="M13.2 19.5 C9.5 19.5 3.5 15.2 3.5 9 C9.5 8.5 13.8 13.2 13.8 17 C13.8 18 13.5 18.8 13.2 19.5 Z" fill="#116834"/>
      <path d="M18.8 19.5 C22.5 19.5 28.5 15.2 28.5 9 C22.5 8.5 18.2 13.2 18.2 17 C18.2 18 18.5 18.8 18.8 19.5 Z" fill="#116834"/>
    </svg>
  `,
  entres: `
    <svg viewBox="2 2 28 28" width="56" height="56" fill="#116834">
      <path d="M14 26 C14 26 14 13 14 9 C14 5.5 17.5 3 22 2.5 C22.5 7 19.5 10.5 15.8 11 C15.8 13 15.8 17 15.8 26 Z" fill="#116834"/>
      <path d="M14 16.5 C10.5 16.5 6.5 14 6 10 C10 9.5 13.5 12 14 15 Z" fill="#116834"/>
      <circle cx="14" cy="24" r="2.5" fill="#116834"/>
    </svg>
  `
};

const MENU_ITEMS = [
  { id: 'presensi', title: 'Presensi', icon: ICONS.team, route: '/attendance' },
  { id: 'penerimaan', title: 'Penerimaan', icon: ICONS.documentPlus, route: '/reception' },
  { id: 'penyemaian', title: 'Penyemaian', icon: ICONS.sprout, route: '/seeding' },
  { id: 'okulasi', title: 'Okulasi', icon: ICONS.sprout, route: '/budding' },
  { id: 'pemeriksaan', title: 'Pemeriksaan', icon: ICONS.documentPlus, route: '/inspection' },
  { id: 'penyeleksian', title: 'Penyeleksian', icon: ICONS.sprout, route: '/selection' },
  { id: 'kebun-entres', title: 'Kebun<br>Entres', icon: ICONS.entres, route: '/entres' },
  { id: 'material', title: 'Material &<br>Bahan', icon: ICONS.sprout, route: '/material' },
  { id: 'pemeliharaan', title: 'Rekam<br>Pemeliharaan', icon: ICONS.documentPlus, route: '/nursery-activity' },
  { id: 'pengeluaran', title: 'Pengeluaran', icon: ICONS.sprout, route: '/request' }
];

export function renderBeranda() {
  const app = document.getElementById('app');
  
  const txs = storage.get('receipt_transactions', []);
  const seedingTxs = storage.get('seeding_transactions', []);
  let hasPendingBenih = false;

  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i];
    if (tx.jenis === 'Benih / Biji Kelatak') {
      const qty = parseInt(tx.qty || 0);
      let accumulatedDisemai = 0;
      let accumulatedDitolak = 0;
      
      seedingTxs.forEach((s) => {
        if (s.sourceIndex == i) {
          accumulatedDisemai += parseInt(s.totalDisemai || 0);
          accumulatedDitolak += parseInt(s.ditolak || 0);
        }
      });
      
      const bibitTersedia = qty - accumulatedDisemai - accumulatedDitolak;
      if (bibitTersedia > 0) {
        hasPendingBenih = true;
        break;
      }
    }
  }

  const buddingTxs = storage.get('budding_transactions', []).filter(b => b.type === 'GRAFTING' || !b.type);
  let hasPendingOkulasi = false;

  for (let i = 0; i < seedingTxs.length; i++) {
    const stx = seedingTxs[i];
    const populasiBibit = parseInt(stx.totalDisemai || 0);
    const batchNo = stx.batchNo || `Batch-0${i + 1}`;
    let ttlRealized = 0;
    buddingTxs.filter(b => b.seedingIndex === i || b.batchNo === batchNo).forEach(b => {
      ttlRealized += parseInt(b.jumlah || 0) + parseInt(b.jumlahDitolak || 0);
    });
    if (populasiBibit - ttlRealized > 0) {
      hasPendingOkulasi = true;
      break;
    }
  }

  const allBuddingTxs = storage.get('budding_transactions', []);
  const inspectionTxs = storage.get('inspection_transactions', []);
  let hasPendingPemeriksaan = false;
  for (let i = 0; i < allBuddingTxs.length; i++) {
    const btx = allBuddingTxs[i];
    const populasiDiokulasi = parseInt(btx.jumlah || 0);
    let totalDiperiksa = 0;
    inspectionTxs.filter(insp => insp.buddingDocNo === btx.docNo || insp.buddingIndex === i).forEach(insp => {
      totalDiperiksa += parseInt(insp.totalDiperiksa || (parseInt(insp.jumlahJadi || 0) + parseInt(insp.jumlahGagal || 0)));
    });
    if (populasiDiokulasi - totalDiperiksa > 0) {
      hasPendingPemeriksaan = true;
      break;
    }
  }

  const regraftPool = storage.get('regrafting_pool', []);
  const regraftTxs = storage.get('budding_transactions', []).filter(b => b.type === 'REGRAFTING');
  let hasPendingRegrafting = false;
  for (let i = 0; i < regraftPool.length; i++) {
    const item = regraftPool[i];
    const qty = parseInt(item.jumlah || 0);
    let done = 0;
    regraftTxs.filter(r => r.regraftPoolDocNo === item.docNo || r.inspectionDocNo === item.inspectionDocNo).forEach(r => {
      done += parseInt(r.jumlah || 0);
    });
    if (qty - done > 0) {
      hasPendingRegrafting = true;
      break;
    }
  }

  // Hitung pending penyeleksian (dari pemeriksaan gagal, reject okulasi, dan reject penerimaan APM/benih)
  let pendingSelectionCount = 0;
  const culledTxs = storage.get('selection_transactions', []);
  const culledPoolDocs = new Set(culledTxs.map(c => c.selectionPoolDocNo).filter(Boolean));

  // 1. selection_pool eksisting
  const selectionPool = storage.get('selection_pool', []);
  selectionPool.forEach(s => {
    if (s.status !== 'DECLARED_CULLED' && !culledPoolDocs.has(s.docNo)) {
      pendingSelectionCount++;
    }
  });

  // 2. data reject dari receipt_transactions (Penerimaan Bibit APM / Benih)
  const receiptTxs = storage.get('receipt_transactions', []);
  receiptTxs.forEach((rtx, i) => {
    const rows = (rtx.rawState && rtx.rawState.tableRows) || [];
    if (rows.length > 0) {
      rows.forEach((row, rIdx) => {
        if (parseInt(row.rejected || 0) > 0) {
          const poolDocNo = `SEL/RCV/2026/0${i + 1}_${rIdx + 1}`;
          if (!culledPoolDocs.has(poolDocNo) && !selectionPool.some(s => s.docNo === poolDocNo && s.status === 'DECLARED_CULLED')) {
            pendingSelectionCount++;
          }
        }
      });
    } else if (parseInt(rtx.rejected || rtx.jumlahDitolak || 0) > 0) {
      const poolDocNo = `SEL/RCV/2026/0${i + 1}`;
      if (!culledPoolDocs.has(poolDocNo) && !selectionPool.some(s => s.docNo === poolDocNo && s.status === 'DECLARED_CULLED')) {
        pendingSelectionCount++;
      }
    }
  });

  // 3. data reject dari budding_transactions (Okulasi)
  const allBuddingForSel = storage.get('budding_transactions', []);
  allBuddingForSel.forEach((btx, i) => {
    if (parseInt(btx.jumlahDitolak || 0) > 0) {
      const poolDocNo = `SEL/REJ/2026/0${i + 1}`;
      if (!culledPoolDocs.has(poolDocNo) && !selectionPool.some(s => s.docNo === poolDocNo && s.status === 'DECLARED_CULLED')) {
        pendingSelectionCount++;
      }
    }
  });

  const menuCards = MENU_ITEMS.map((item) => {
    let badgeHtml = '';
    if (item.id === 'penyeleksian' && pendingSelectionCount > 0) {
      badgeHtml = `
        <div style="position: absolute; top: 10px; right: 10px; background: #DC2626; color: #FFFFFF; font-size: 0.68rem; font-weight: 800; min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; padding: 0 4px; box-shadow: 0 2px 4px rgba(220,38,38,0.4); border: 2px solid #FFFFFF; z-index: 5;">
          ${pendingSelectionCount}
        </div>
      `;
    } else if ((item.id === 'penyemaian' && hasPendingBenih) || (item.id === 'okulasi' && (hasPendingOkulasi || hasPendingRegrafting)) || (item.id === 'pemeriksaan' && hasPendingPemeriksaan)) {
      badgeHtml = `
        <div style="position: absolute; top: 12px; right: 12px; width: 11px; height: 11px; background-color: #D32F2F; border-radius: 50%; box-shadow: 0 0 0 2px #FFFFFF; z-index: 5;"></div>
      `;
    }

    return `
      <button class="beranda-menu-card" data-menu-id="${item.id}" data-route="${item.route}" type="button" style="position: relative;">
        <div class="beranda-card-icon">${item.icon}</div>
        <div class="beranda-card-title">${item.title}</div>
        ${badgeHtml}
      </button>
    `;
  }).join('');

  app.innerHTML = `
    <div class="page beranda-page">
      <header class="beranda-header">
        <button class="beranda-menu-btn" id="beranda-drawer-btn" type="button" aria-label="Menu">
          <svg viewBox="0 0 24 24" width="26" height="26" stroke="#116834" stroke-width="2.2" fill="none" stroke-linecap="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <h1 class="beranda-header-title">Beranda</h1>
      </header>

      <main class="beranda-body">
        <div class="beranda-grid">
          ${menuCards}
        </div>
      </main>

      <footer class="beranda-footer">
        <button class="beranda-action-btn" id="btn-konsolidasi" type="button">
          <span class="action-text">Konfirmasi untuk Konsolidasi</span>
          <span class="action-arrow">›</span>
        </button>
        <button class="beranda-action-btn" id="btn-verifikasi" type="button">
          <span class="action-text">Konfirmasi untuk Verifikasi</span>
          <span class="action-arrow">›</span>
        </button>
      </footer>
    </div>
  `;

  // Drawer Toggle
  app.querySelector('#beranda-drawer-btn').addEventListener('click', openDrawer);

  // Menu clicks
  app.querySelectorAll('.beranda-menu-card').forEach((card) => {
    card.addEventListener('click', () => {
      const route = card.dataset.route;
      if (route) {
        navigate(route);
      } else {
        const title = card.querySelector('.beranda-card-title')?.textContent.trim() || 'Modul';
        toast(`Modul ${title} akan segera dibuka`, 'info');
      }
    });
  });

  // Action buttons
  app.querySelector('#btn-konsolidasi').addEventListener('click', () => {
    toast('Belum ada transaksi untuk dikonsolidasi', 'info');
  });

  app.querySelector('#btn-verifikasi').addEventListener('click', () => {
    toast('Belum ada transaksi menunggu verifikasi', 'info');
  });
}
