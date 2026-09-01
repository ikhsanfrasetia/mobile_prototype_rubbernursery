import { navigate } from '../../core/router.js';
import { storage } from '../../core/storage.js';

export function renderBuddingLanding() {
  const app = document.getElementById('app');

  // Check pending grafting batches
  const seedingTxs = storage.get('seeding_transactions', []);
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

  app.innerHTML = `
    <div class="page budding-landing-page" style="display: flex; flex-direction: column; height: 100%; background: #F5F5F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <!-- HEADER -->
      <header style="display: flex; align-items: center; justify-content: space-between; height: 56px; padding: 0 16px; background: #FFFFFF; border-bottom: 1px solid #E5E7EB; flex-shrink: 0;">
        <div style="display: flex; align-items: center;">
          <button id="btn-back" type="button" aria-label="Kembali" style="padding: 8px; margin-left: -8px; background: transparent; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #116834;">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>
          <h1 style="font-size: 1.12rem; font-weight: 700; color: #111111; margin: 0 0 0 8px; letter-spacing: -0.01em;">Okulasi</h1>
        </div>
        <button id="btn-refresh" type="button" aria-label="Segarkan" style="background: none; border: none; cursor: pointer; padding: 6px; margin-right: -4px; display: flex; align-items: center; justify-content: center; color: #116834;">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
      </header>

      <!-- CONTENT -->
      <main style="flex: 1; padding: 16px; overflow-y: auto;">
        
        <!-- MENU KARTU OKULASI SESUAI UKURAN BERANDA (96px x 115px) -->
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          
          <!-- 1. OKULASI (GRAFTING) -->
          <button id="card-grafting" type="button" class="beranda-menu-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; width: 96px; height: 115px; padding: 8px 4px 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.03); cursor: pointer; text-align: center; box-sizing: border-box; transition: transform 0.15s ease, box-shadow 0.15s ease; position: relative;">
            <div style="width: 44px; height: 44px; margin-bottom: 6px; display: flex; align-items: center; justify-content: center;">
              <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="#116834" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 38V12a3 3 0 0 1 3-3h18a2 2 0 0 1 2 2v25a2 2 0 0 1-2 2H17a3 3 0 0 1-3-3z"></path>
                <path d="M14 16a3 3 0 0 1-3 3v16a3 3 0 0 0 3 3"></path>
                <line x1="21" y1="16" x2="31" y2="16"></line>
                <line x1="21" y1="21" x2="31" y2="21"></line>
                <line x1="21" y1="26" x2="31" y2="26"></line>
                <line x1="21" y1="31" x2="27" y2="31"></line>
              </svg>
            </div>
            <span style="font-size: 0.76rem; font-weight: 700; color: #116834; line-height: 1.2; text-align: center;">
              Okulasi<br>(Grafting)
            </span>
            ${hasPendingOkulasi ? `
              <div style="position: absolute; top: 12px; right: 12px; width: 11px; height: 11px; background-color: #D32F2F; border-radius: 50%; box-shadow: 0 0 0 2px #FFFFFF;"></div>
            ` : ''}
          </button>

          <!-- 2. OKULASI JANDA (REGRAFTING) -->
          <button id="card-regrafting" type="button" class="beranda-menu-card" style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px; width: 96px; height: 115px; padding: 8px 4px 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.03); cursor: pointer; text-align: center; box-sizing: border-box; transition: transform 0.15s ease, box-shadow 0.15s ease; position: relative;">
            <div style="width: 44px; height: 44px; margin-bottom: 6px; display: flex; align-items: center; justify-content: center;">
              <svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="#116834" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 38V12a3 3 0 0 1 3-3h18a2 2 0 0 1 2 2v25a2 2 0 0 1-2 2H17a3 3 0 0 1-3-3z"></path>
                <path d="M14 16a3 3 0 0 1-3 3v16a3 3 0 0 0 3 3"></path>
                <line x1="21" y1="16" x2="31" y2="16"></line>
                <line x1="21" y1="21" x2="31" y2="21"></line>
                <line x1="21" y1="26" x2="31" y2="26"></line>
                <line x1="21" y1="31" x2="27" y2="31"></line>
              </svg>
            </div>
            <span style="font-size: 0.76rem; font-weight: 700; color: #116834; line-height: 1.2; text-align: center;">
              Okulasi Janda<br>(Regrafting)
            </span>
            ${hasPendingRegrafting ? `
              <div style="position: absolute; top: 12px; right: 12px; width: 11px; height: 11px; background-color: #D32F2F; border-radius: 50%; box-shadow: 0 0 0 2px #FFFFFF;"></div>
            ` : ''}
          </button>

        </div>

      </main>
    </div>
  `;

  // Event Listeners
  app.querySelector('#btn-back').addEventListener('click', () => {
    navigate('/home');
  });

  app.querySelector('#btn-refresh')?.addEventListener('click', () => {
    renderBuddingLanding();
  });

  const cardGrafting = app.querySelector('#card-grafting');
  const cardRegrafting = app.querySelector('#card-regrafting');

  cardGrafting.addEventListener('mouseenter', () => {
    cardGrafting.style.transform = 'translateY(-2px)';
    cardGrafting.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)';
  });
  cardGrafting.addEventListener('mouseleave', () => {
    cardGrafting.style.transform = 'translateY(0)';
    cardGrafting.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
  });
  cardGrafting.addEventListener('click', () => {
    storage.set('budding_type', 'GRAFTING');
    navigate('/budding/grafting');
  });

  cardRegrafting.addEventListener('mouseenter', () => {
    cardRegrafting.style.transform = 'translateY(-2px)';
    cardRegrafting.style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)';
  });
  cardRegrafting.addEventListener('mouseleave', () => {
    cardRegrafting.style.transform = 'translateY(0)';
    cardRegrafting.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
  });
  cardRegrafting.addEventListener('click', () => {
    storage.set('budding_type', 'REGRAFTING');
    navigate('/budding/regrafting');
  });
}
