/**
 * Konsolidasi hasil Rekam Aktivitas Mandoran untuk Mantri Bibitan.
 * Mengambil transaksi Mandoran milik pengguna aktif yang belum disimpan
 * sebagai hasil konsolidasi, lalu menyimpan snapshot beserta referensi sumber.
 */

import { navigate, getParams } from '../../core/router.js';
import { storage } from '../../core/storage.js';
import { toast } from '../../components/toast.js';
import { confirmDialog } from '../../components/modal.js';
import { esc } from '../../core/utils.js';
import { getCurrentUserContext, ROLES, normalizeRole } from '../../core/user-context.js';
import { applyTransactionActor, getAuthorizedTransactions } from '../../core/transaction-actor.js';
import { getWorkAllocationByCode } from '../../data/work-allocation-master.js';
import { getStandardWorkHoursForDate } from '../../data/standard-work-hour-master.js';
import { isTransactionOwnedByUser } from './nursery-activity.js';

const SOURCE_KEY = 'nursery_activity_records';
const CONSOLIDATION_KEY = 'nursery_mandoran_consolidations';

function getPendingMandoranRecords(userCtx = getCurrentUserContext()) {
  if (normalizeRole(userCtx?.role || userCtx?.rawRole) !== ROLES.MANTRI_TANAMAN) return [];
  const allRecords = storage.get(SOURCE_KEY, []);
  if (!Array.isArray(allRecords)) return [];
  return allRecords.filter((record) =>
    record?.activityEntryMode === 'MANDORAN' &&
    Array.isArray(record.pekerja) &&
    !record.mandoranConsolidationId &&
    isTransactionOwnedByUser(record, userCtx)
  );
}

function getSavedMandoranConsolidations(userCtx = getCurrentUserContext()) {
  const consolidations = storage.get(CONSOLIDATION_KEY, []);
  if (!Array.isArray(consolidations)) return [];
  return getAuthorizedTransactions(
    consolidations.filter((item) => item?.type === 'MANDORAN_RESULT_CONSOLIDATION'),
    userCtx
  ).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

export function getSavedMandoranConsolidationCount(userCtx = getCurrentUserContext()) {
  return getSavedMandoranConsolidations(userCtx).length;
}

function groupMandoranRecords(records) {
  const groups = new Map();
  records.forEach((record) => {
    const groupKey = `${record.allocationCode || ''}::${record.workGroupRoleCode || ''}`;
    const allocationMaster = getWorkAllocationByCode(record.allocationCode);
    const recordTaskQuantity = Number(record.taskQuantity);
    const taskQuantity = Number.isFinite(recordTaskQuantity) && recordTaskQuantity > 0
      ? recordTaskQuantity
      : Number(allocationMaster?.taskQuantity) || 0;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        key: groupKey,
        allocationCode: record.allocationCode || '-',
        allocationName: record.allocationName || record.workGroupRoleName || '-',
        roleCode: record.workGroupRoleCode || '-',
        roleName: record.workGroupRoleName || record.allocationName || '-',
        uom: record.uomCode || record.uom || '',
        taskQuantity,
        workers: new Map()
      });
    }
    const group = groups.get(groupKey);
    (record.pekerja || []).forEach((worker) => {
      const workerCode = worker.code || worker.workerCode || '';
      const workerName = worker.name || worker.workerName || 'Pekerja';
      const workerKey = worker.id || worker.workerId || `${workerCode}-${workerName}`;
      if (!group.workers.has(workerKey)) {
        group.workers.set(workerKey, {
          key: `${groupKey}::${workerKey}`,
          workerId: worker.id || worker.workerId || workerKey,
          code: workerCode,
          name: workerName,
          resultType: '',
          potongJamDecision: worker.potongJamDecision || '',
          potongJamReason: worker.potongJamReason || '',
          durationHours: Number(worker.durationHours || record.durationHours) || 0,
          total: 0,
          sources: []
        });
      }
      const summary = group.workers.get(workerKey);
      summary.total += Number(worker.inputHasil) || 0;
      const resultType = worker.resultType || worker.resultLabel || worker.paymentType || worker.taskItemName ||
        record.resultType || record.resultLabel || record.paymentType || record.taskItemName || '';
      if (resultType && !summary.resultType) summary.resultType = String(resultType);
      if (!summary.potongJamDecision && worker.potongJamDecision) summary.potongJamDecision = worker.potongJamDecision;
      if (!summary.potongJamReason && worker.potongJamReason) summary.potongJamReason = worker.potongJamReason;
      if (!summary.durationHours && Number(worker.durationHours || record.durationHours) > 0) {
        summary.durationHours = Number(worker.durationHours || record.durationHours);
      }
      summary.sources.push(record);
    });
  });

  return [...groups.values()].map((group) => ({
    ...group,
    workers: [...group.workers.values()]
  }));
}

function getWorkDateInfo(record) {
  const rawDate = record.activityDate || record.tanggal || record.date || record.createdAt;
  const date = rawDate instanceof Date ? new Date(rawDate) : new Date(rawDate || '');
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return { key: `${year}-${month}-${day}`, date };
}

function calculateWorkerDailyWorkHours(records, workerId) {
  const days = new Map();
  records.forEach((record) => {
    const sourceWorker = (record.pekerja || []).find((worker) => {
      const id = worker.id || worker.workerId || `${worker.code || worker.workerCode || ''}-${worker.name || worker.workerName || ''}`;
      return String(id) === String(workerId);
    });
    if (!sourceWorker) return;

    const workDate = getWorkDateInfo(record);
    if (!workDate) return;
    if (!days.has(workDate.key)) {
      const standard = getStandardWorkHoursForDate(workDate.date);
      days.set(workDate.key, {
        dateKey: workDate.key,
        date: workDate.date,
        dayName: standard?.dayName || workDate.date.toLocaleDateString('id-ID', { weekday: 'long' }),
        standardWorkHours: standard?.workHours ?? null,
        allocations: new Map()
      });
    }

    const daily = days.get(workDate.key);
    const allocationKey = `${record.allocationCode || ''}::${record.workGroupRoleCode || ''}`;
    const allocationMaster = getWorkAllocationByCode(record.allocationCode);
    const storedTaskQuantity = Number(record.taskQuantity);
    const baseStandardOutput = Number.isFinite(storedTaskQuantity) && storedTaskQuantity > 0
      ? storedTaskQuantity
      : Number(allocationMaster?.taskQuantity) || 0;
    // Jumat memakai standar output 5/7 dari task quantity normal. Bulatkan
    // hasilnya menjadi unit utuh sebelum menghitung pendapatan jam kerja.
    const standardOutput = daily.dayName === 'Jumat' && baseStandardOutput > 0
      ? Math.round((baseStandardOutput * 5) / 7)
      : baseStandardOutput;
    if (!daily.allocations.has(allocationKey)) {
      daily.allocations.set(allocationKey, {
        allocationCode: record.allocationCode || '-',
        roleCode: record.workGroupRoleCode || '-',
        allocationName: record.allocationName || record.workGroupRoleName || '-',
        uom: record.uomCode || record.uom || '',
        standardOutput,
        actualOutput: 0
      });
    }
    const allocation = daily.allocations.get(allocationKey);
    allocation.actualOutput += Number(sourceWorker.inputHasil) || 0;
    if (!allocation.standardOutput && standardOutput > 0) allocation.standardOutput = standardOutput;
  });

  return [...days.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey)).map((day) => {
    const allocations = [...day.allocations.values()].map((allocation) => ({
      ...allocation,
      incomeWorkHours: allocation.standardOutput > 0 && day.standardWorkHours !== null
        ? (allocation.actualOutput / allocation.standardOutput) * day.standardWorkHours
        : null
    }));
    const unavailable = allocations.some((allocation) => allocation.incomeWorkHours === null);
    return {
      ...day,
      allocations,
      totalIncomeWorkHours: unavailable ? null : allocations.reduce((sum, allocation) => sum + allocation.incomeWorkHours, 0)
    };
  });
}

function formatWorkHours(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'Belum tersedia';
  return `${Math.round(value).toLocaleString('id-ID')} Jam`;
}

function formatWorkDate(date) {
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getWorkerTaskQuantity(worker, group) {
  if (!worker || !group) return Number(group?.taskQuantity) || 0;
  if (Number(worker.taskQuantity) > 0) return Number(worker.taskQuantity);
  const dailySummaries = calculateWorkerDailyWorkHours(worker.sources || [], worker.workerId);
  const adjustedTaskQuantity = dailySummaries.reduce((total, day) => total + day.allocations
    .filter((allocation) => allocation.allocationCode === group.allocationCode && allocation.roleCode === group.roleCode)
    .reduce((dayTotal, allocation) => dayTotal + allocation.standardOutput, 0), 0);
  return adjustedTaskQuantity > 0 ? adjustedTaskQuantity : Number(group.taskQuantity) || 0;
}

function getWorkersMissingPotongJamDecision(groups) {
  return groups.flatMap((group) => group.workers.filter((worker) => {
    const taskQuantity = getWorkerTaskQuantity(worker, group);
    return taskQuantity > 0 && worker.total < taskQuantity &&
      !['SETUJU', 'TIDAK_SETUJU'].includes(worker.potongJamDecision);
  }));
}

export function getPendingMandoranConsolidationCount(userCtx = getCurrentUserContext()) {
  return groupMandoranRecords(getPendingMandoranRecords(userCtx))
    .reduce((count, group) => count + group.workers.length, 0);
}

function mapSavedConsolidationToGroups(consolidation) {
  return (consolidation?.groups || []).map((group) => {
    const key = `${group.allocationCode || ''}::${group.workGroupRoleCode || ''}`;
    const savedWorkerSummaries = consolidation.dailyWorkHourSummaries || [];
    return {
      key,
      allocationCode: group.allocationCode || '-',
      allocationName: group.allocationName || group.workGroupRoleName || '-',
      roleCode: group.workGroupRoleCode || '-',
      roleName: group.workGroupRoleName || group.allocationName || '-',
      uom: group.uom || '',
      taskQuantity: Number(group.taskQuantity) || 0,
      workers: (group.workers || []).map((worker) => ({
        key: `${key}::${worker.workerId || worker.code || worker.name || ''}`,
        workerId: worker.workerId || worker.code || worker.name || '',
        code: worker.code || '',
        name: worker.name || 'Pekerja',
        resultType: worker.resultType || '',
        potongJamDecision: worker.potongJamDecision || '',
        potongJamReason: worker.potongJamReason || '',
        taskQuantity: Number(worker.taskQuantity) || savedWorkerSummaries
          .find((summary) => String(summary.workerId) === String(worker.workerId))?.days?.reduce((total, day) => total + (day.allocations || [])
            .filter((allocation) => allocation.allocationCode === group.allocationCode && allocation.allocationName === group.allocationName)
            .reduce((dayTotal, allocation) => dayTotal + (Number(allocation.standardOutput) || 0), 0), 0)
          || Number(group.taskQuantity) || 0,
        total: Number(worker.inputHasil) || 0,
        sources: [],
        detailRows: worker.detailRows || [],
        sourceTransactionIds: worker.sourceTransactionIds || []
      }))
    };
  });
}

export function renderMandoranPotongJamDetail() {
  const app = document.getElementById('app');
  if (!app) return;
  const { groupKey = '', workerId = '' } = getParams();
  const userCtx = getCurrentUserContext();
  const pendingRecords = getPendingMandoranRecords(userCtx);
  let records = pendingRecords;
  let groups = groupMandoranRecords(records);
  let group = groups.find((item) => item.key === groupKey);
  let worker = group?.workers.find((item) => String(item.workerId) === String(workerId));
  const isSavedView = !worker;
  if (isSavedView) {
    const savedConsolidations = getSavedMandoranConsolidations(userCtx);
    const savedGroup = savedConsolidations.flatMap((item) => mapSavedConsolidationToGroups(item))
      .find((item) => item.key === groupKey);
    group = savedGroup;
    worker = group?.workers.find((item) => String(item.workerId) === String(workerId));
    const sourceIds = new Set(worker?.sourceTransactionIds || []);
    const allRecords = storage.get(SOURCE_KEY, []);
    records = Array.isArray(allRecords)
      ? allRecords.filter((record) => sourceIds.has(record.id) || sourceIds.has(record.docNo))
      : [];
    if (worker && records.length) {
      const reconstructed = groupMandoranRecords(records).find((item) => item.key === groupKey)?.workers
        .find((item) => String(item.workerId) === String(workerId));
      if (reconstructed) {
        worker = {
          ...reconstructed,
          ...worker,
          sources: reconstructed.sources,
          durationHours: reconstructed.durationHours || worker.durationHours
        };
      }
    }
  }
  const taskQuantity = getWorkerTaskQuantity(worker, group);
  const isBelowTaskQuantity = Boolean(group && worker && taskQuantity > 0 && worker.total < taskQuantity);
  const isPotongJam = isBelowTaskQuantity && worker?.potongJamDecision !== 'TIDAK_SETUJU';

  if (!group || !worker) {
    toast('Rincian pekerja tidak tersedia.', 'info');
    navigate('/nursery-activity/consolidation');
    return;
  }

  const variance = worker.total - taskQuantity;
  const dailyWorkHours = calculateWorkerDailyWorkHours(records, worker.workerId);
  const hasCompleteWorkHours = dailyWorkHours.length > 0 && dailyWorkHours.every((day) =>
    day.standardWorkHours !== null && day.totalIncomeWorkHours !== null
  );
  const hasCompleteStandardHours = dailyWorkHours.length > 0 && dailyWorkHours.every((day) => day.standardWorkHours !== null);
  const standardIncomeWorkHours = hasCompleteStandardHours
    ? dailyWorkHours.reduce((total, day) => total + day.standardWorkHours, 0)
    : null;
  const durationText = worker.durationHours > 0
    ? `${worker.durationHours} Jam`
    : !isPotongJam ? formatWorkHours(standardIncomeWorkHours) : 'Belum dicatat';
  const potongJamHours = hasCompleteWorkHours
    ? Math.max(0, Math.round(dailyWorkHours.reduce((total, day) => total + day.standardWorkHours - day.totalIncomeWorkHours, 0)))
    : null;
  const decision = worker.potongJamDecision || '';
  const reason = worker.potongJamReason || '';
  const reasonOptions = [
    'Kondisi lapangan',
    'Kendala alat atau material',
    'Pekerjaan dihentikan atas instruksi',
    'Kondisi cuaca',
    'Lainnya'
  ];

  app.innerHTML = `
    <div class="page" style="position:relative; display:flex; flex-direction:column; height:100%; min-height:0; overflow:hidden; background:#EEEEEE; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <header style="height:52px; flex-shrink:0; display:flex; align-items:center; gap:10px; padding:0 14px; background:#FFFFFF; border-bottom:1px solid #D9DDE2;">
        <button id="btn-back-potong-jam" type="button" aria-label="Kembali" style="padding:6px; margin-left:-6px; border:0; background:transparent; color:#116834; cursor:pointer; display:flex;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <h1 style="font-size:1.12rem; font-weight:700; color:#111111; margin:0 0 0 8px; letter-spacing:-0.01em;">${isPotongJam ? 'Data Pekerja Bibitan' : 'Data Pekerja Pemeliharaan'}</h1>
      </header>
      <div style="flex-shrink:0; display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:10px; padding:11px 17px; background:#FFFFFF; border-bottom:1px solid #E1E1E1;">
        <div style="min-width:0;">
          <div style="font-size:.95rem; font-weight:800; color:#111111;">${esc(worker.name)}</div>
          <div style="margin-top:4px; font-size:.75rem; color:#7B8188;">${esc(worker.code || '-')}</div>
        </div>
        <div style="text-align:right;">
          <div id="potong-jam-hours-value" style="margin-top:4px; font-size:.86rem; line-height:1.2; color:${isPotongJam ? '#D71920' : '#43B649'}; font-weight:800;">${isPotongJam ? potongJamHours === null ? 'Belum tersedia' : potongJamHours.toLocaleString('id-ID') : esc(formatWorkHours(standardIncomeWorkHours))}</div>
          ${isPotongJam ? '<div id="potong-jam-status-label" style="margin-top:2px; font-size:.74rem; color:#D71920; font-weight:700;">Potong Jam</div>' : ''}
        </div>
      </div>
      <main style="flex:1; min-height:0; overflow-y:auto; padding:13px 15px 18px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin:0 0 10px;">
          <h2 style="margin:0; font-size:.94rem; font-weight:800; color:#111111;">Data Pemeliharaan</h2>
          ${isPotongJam ? '<span id="potong-jam-status-badge" style="padding:5px 7px; border-radius:4px; background:#F41424; color:#FFFFFF; font-size:.57rem; font-weight:900;">POTONG JAM</span>' : ''}
        </div>
        <section style="overflow:hidden; margin-bottom:18px; background:#FFFFFF; border:1px solid #DDDDDD; border-radius:9px; box-shadow:0 2px 4px rgba(0,0,0,.1);">
          <div style="display:flex; justify-content:space-between; gap:10px; padding:11px 13px; border-bottom:1px solid #E1E1E1; font-size:.83rem; font-weight:750; color:#111111;"><span>Durasi</span><span>${esc(durationText)}</span></div>
          <div style="display:flex; justify-content:space-between; gap:10px; padding:11px 13px; border-bottom:1px solid #E1E1E1; font-size:.83rem; font-weight:750; color:#111111;"><span style="min-width:0; overflow-wrap:anywhere;">${esc(group.allocationName)}</span><span style="flex-shrink:0;">${esc(group.uom)}</span></div>
          <div style="display:flex; justify-content:space-between; gap:10px; padding:11px 22px; border-bottom:1px solid #E1E1E1; font-size:.83rem; color:#111111;"><span style="font-weight:750;">${esc(worker.name)} <small style="font-weight:500; color:#555;">(${esc(worker.code || '-')})</small></span><span style="font-weight:800; color:${isPotongJam ? '#D71920' : '#43B649'};">${worker.total.toLocaleString('id-ID')}</span></div>
          <div style="display:flex; justify-content:space-between; gap:10px; padding:10px 22px; border-bottom:1px solid #E1E1E1; font-size:.81rem; color:#111111;"><span>Norma / Basis Borong</span><span style="font-weight:750;">${taskQuantity.toLocaleString('id-ID')} ${esc(group.uom)}</span></div>
          <div style="display:flex; justify-content:space-between; gap:10px; padding:10px 22px; border-bottom:1px solid #E1E1E1; font-size:.81rem; color:#111111;"><span>Lebih (Kurang) Basis</span><span style="font-weight:800; color:${variance < 0 ? '#D71920' : '#111111'};">${variance.toLocaleString('id-ID')} ${esc(group.uom)}</span></div>
          <div style="display:flex; justify-content:space-between; gap:10px; padding:10px 22px; font-size:.81rem; color:#111111;"><span>Nilai Lebih Basis</span><span style="font-weight:750;">${Math.max(0, variance).toLocaleString('id-ID')}</span></div>
        </section>
        ${isPotongJam ? `
        <h2 style="margin:0 0 9px; font-size:.9rem; font-weight:800; color:#111111;">Pendapatan Jam Kerja</h2>
        ${dailyWorkHours.length ? dailyWorkHours.map((day) => `
          <section style="overflow:hidden; margin-bottom:14px; background:#FFFFFF; border:1px solid #DDDDDD; border-radius:9px; box-shadow:0 2px 4px rgba(0,0,0,.1);">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:10px 13px; background:#F8FAFC; border-bottom:1px solid #E1E1E1;">
              <span style="font-size:.78rem; font-weight:800; color:#334155;">${esc(day.dayName)} • ${esc(formatWorkDate(day.date))}</span>
              <span style="flex-shrink:0; font-size:.72rem; font-weight:750; color:#475569;">Standar: ${day.standardWorkHours === null ? 'Belum tersedia' : `${day.standardWorkHours} Jam`}</span>
            </div>
            <div class="daily-income-total" data-standard-hours="${day.standardWorkHours ?? ''}" data-cut-income-hours="${day.totalIncomeWorkHours ?? ''}" style="display:flex; justify-content:space-between; gap:8px; padding:11px 13px; background:${decision === 'TIDAK_SETUJU' || (day.standardWorkHours !== null && day.totalIncomeWorkHours !== null && day.totalIncomeWorkHours >= day.standardWorkHours) ? '#F0FDF4' : '#FEF2F2'}; color:${decision === 'TIDAK_SETUJU' || (day.standardWorkHours !== null && day.totalIncomeWorkHours !== null && day.totalIncomeWorkHours >= day.standardWorkHours) ? '#116834' : '#D71920'}; font-size:.82rem; font-weight:800;">
              <span>Total Pendapatan Jam Kerja</span><span class="daily-income-total-value">${esc(formatWorkHours(decision === 'TIDAK_SETUJU' && day.standardWorkHours !== null ? day.standardWorkHours : day.totalIncomeWorkHours))}</span>
            </div>
          </section>
        `).join('') : `
          <div style="margin-bottom:14px; padding:13px; background:#FFFFFF; border:1px solid #DDDDDD; border-radius:9px; color:#64748B; font-size:.77rem;">Data tanggal transaksi belum tersedia untuk menghitung pendapatan jam kerja.</div>
        `}
        ` : ''}
        <h2 style="margin:0 0 9px; font-size:.9rem; font-weight:800; color:#111111;">Perolehan Premi</h2>
        <section style="overflow:hidden; margin-bottom:18px; background:#FFFFFF; border:1px solid #DDDDDD; border-radius:9px; box-shadow:0 2px 4px rgba(0,0,0,.1);">
          <div style="display:flex; justify-content:space-between; gap:10px; padding:12px 13px; border-bottom:1px solid #E1E1E1; font-size:.81rem; font-weight:700; color:#111111;"><span>Estimasi Total Premi</span><span style="color:#64748B;">Belum tersedia</span></div>
          <div style="display:flex; justify-content:space-between; gap:10px; padding:12px 13px; font-size:.81rem; font-weight:700; color:#111111;"><span>Estimasi s.d. Hari Ini</span><span style="color:#64748B;">Belum tersedia</span></div>
        </section>
        ${isPotongJam ? `
        <section style="margin-bottom:12px;">
          <h2 style="margin:0 0 10px; font-size:.9rem; font-weight:800; color:#111111;">Setujui Potong Jam</h2>
          <div style="display:flex; gap:34px; align-items:center;">
            <label style="display:flex; align-items:center; gap:8px; font-size:.86rem; color:#222; cursor:pointer;"><input type="radio" name="potong-jam-decision" value="TIDAK_SETUJU" ${decision === 'TIDAK_SETUJU' ? 'checked' : ''} style="width:20px; height:20px; accent-color:#43A047;">Tidak</label>
            <label style="display:flex; align-items:center; gap:8px; font-size:.86rem; color:#222; cursor:pointer;"><input type="radio" name="potong-jam-decision" value="SETUJU" ${decision === 'SETUJU' ? 'checked' : ''} style="width:20px; height:20px; accent-color:#43A047;">Ya</label>
          </div>
        </section>
        <label for="potong-jam-reason" style="display:block; margin:0 0 7px; font-size:.82rem; font-weight:750; color:#111111;">Alasan Tidak Potong Jam</label>
        <select id="potong-jam-reason" ${decision !== 'TIDAK_SETUJU' ? 'disabled' : ''} style="width:100%; height:42px; padding:0 10px; border:1px solid #BFC3C7; border-radius:5px; background:${decision !== 'TIDAK_SETUJU' ? '#F1F5F9' : '#FFFFFF'}; color:#334155; font-size:.78rem;">
          <option value="">Pilih Alasan</option>
          ${reasonOptions.map((option) => `<option value="${esc(option)}" ${reason === option ? 'selected' : ''}>${esc(option)}</option>`).join('')}
        </select>
        ` : ''}
      </main>
      <footer style="flex-shrink:0; padding:12px 16px 14px; background:#FFFFFF; border-top:1px solid #D9DDE2;">
        <button id="btn-save-potong-jam" type="button" style="width:100%; height:46px; border:0; border-radius:7px; background:#116834; color:#FFFFFF; font-size:.95rem; font-weight:700; cursor:pointer;">Simpan</button>
      </footer>
    </div>
  `;

  app.querySelector('#btn-back-potong-jam')?.addEventListener('click', () => navigate('/nursery-activity/consolidation'));
  const reasonSelect = app.querySelector('#potong-jam-reason');
  const updatePotongJamDecisionView = () => {
    const selectedDecision = app.querySelector('input[name="potong-jam-decision"]:checked')?.value || '';
    const noCutApproved = selectedDecision === 'TIDAK_SETUJU';
    const color = noCutApproved ? '#116834' : '#D71920';
    if (reasonSelect) {
      reasonSelect.disabled = !noCutApproved;
      reasonSelect.style.background = noCutApproved ? '#FFFFFF' : '#F1F5F9';
      if (!noCutApproved) reasonSelect.value = '';
    }

    const hoursValue = app.querySelector('#potong-jam-hours-value');
    const statusLabel = app.querySelector('#potong-jam-status-label');
    const statusBadge = app.querySelector('#potong-jam-status-badge');
    if (hoursValue) {
      hoursValue.textContent = noCutApproved ? formatWorkHours(standardIncomeWorkHours) : potongJamHours === null ? 'Belum tersedia' : potongJamHours.toLocaleString('id-ID');
      hoursValue.style.color = color;
    }
    if (statusLabel) {
      statusLabel.textContent = noCutApproved ? 'Normal' : 'Potong Jam';
      statusLabel.style.color = color;
    }
    if (statusBadge) {
      statusBadge.textContent = noCutApproved ? 'NORMAL' : 'POTONG JAM';
      statusBadge.style.backgroundColor = noCutApproved ? '#E8F5E9' : '#F41424';
      statusBadge.style.color = noCutApproved ? '#116834' : '#FFFFFF';
    }
    app.querySelectorAll('.daily-income-total').forEach((row) => {
      const standardHours = Number(row.dataset.standardHours);
      const cutIncomeHours = Number(row.dataset.cutIncomeHours);
      const hasStandard = row.dataset.standardHours !== '' && Number.isFinite(standardHours);
      const hasCutIncome = row.dataset.cutIncomeHours !== '' && Number.isFinite(cutIncomeHours);
      const displayedHours = noCutApproved && hasStandard ? standardHours : hasCutIncome ? cutIncomeHours : null;
      const belowStandard = !noCutApproved && hasStandard && hasCutIncome && cutIncomeHours < standardHours;
      row.style.backgroundColor = belowStandard ? '#FEF2F2' : '#F0FDF4';
      row.style.color = belowStandard ? '#D71920' : '#116834';
      const value = row.querySelector('.daily-income-total-value');
      if (value) value.textContent = formatWorkHours(displayedHours);
    });
  };
  if (isPotongJam) {
    app.querySelectorAll('input[name="potong-jam-decision"]').forEach((input) => {
      input.addEventListener('change', updatePotongJamDecisionView);
    });
    updatePotongJamDecisionView();
  }
  app.querySelector('#btn-save-potong-jam')?.addEventListener('click', () => {
    if (isSavedView) {
      toast('Rincian konsolidasi tersimpan.', 'info');
      navigate('/nursery-activity/consolidation');
      return;
    }
    if (!isPotongJam) {
      toast('Rincian hasil pekerja sudah sesuai Task Quantity.', 'success');
      navigate('/nursery-activity/consolidation');
      return;
    }
    const selectedDecision = app.querySelector('input[name="potong-jam-decision"]:checked')?.value || '';
    const selectedReason = app.querySelector('#potong-jam-reason')?.value || '';
    if (!selectedDecision) {
      toast('Pilih persetujuan Potong Jam terlebih dahulu.', 'warning');
      return;
    }
    if (selectedDecision === 'TIDAK_SETUJU' && !selectedReason) {
      toast('Pilih alasan jika Potong Jam tidak disetujui.', 'warning');
      return;
    }

    const allRecords = storage.get(SOURCE_KEY, []);
    const sourceIds = new Set(worker.sources.map((source) => source.id || source.docNo));
    const nextRecords = allRecords.map((record) => {
      if (!sourceIds.has(record.id || record.docNo)) return record;
      let updated = false;
      const workers = (record.pekerja || []).map((sourceWorker) => {
        const sourceWorkerId = sourceWorker.id || sourceWorker.workerId || `${sourceWorker.code || sourceWorker.workerCode || ''}-${sourceWorker.name || sourceWorker.workerName || ''}`;
        if (String(sourceWorkerId) !== String(worker.workerId)) return sourceWorker;
        updated = true;
        return {
          ...sourceWorker,
          potongJamDecision: selectedDecision,
          potongJamReason: selectedDecision === 'TIDAK_SETUJU' ? selectedReason : '',
          durationHours: worker.durationHours || null
        };
      });
      return updated ? { ...record, pekerja: workers, updatedAt: new Date().toISOString() } : record;
    });
    storage.set(SOURCE_KEY, nextRecords);
    toast('Persetujuan Potong Jam tersimpan.', 'success');
    navigate('/nursery-activity/consolidation');
  });
}

export function renderMandoranConsolidation() {
  const app = document.getElementById('app');
  if (!app) return;

  const userCtx = getCurrentUserContext();
  const records = getPendingMandoranRecords(userCtx);
  const savedConsolidation = records.length ? null : getSavedMandoranConsolidations(userCtx)[0] || null;
  const isSavedView = Boolean(savedConsolidation);
  const groups = isSavedView
    ? mapSavedConsolidationToGroups(savedConsolidation)
    : groupMandoranRecords(records);
  const hasConsolidationData = groups.length > 0;
  const workerCount = groups.reduce((count, group) => count + group.workers.length, 0);
  const workersMissingPotongJamDecision = getWorkersMissingPotongJamDecision(groups);
  const canSaveConsolidation = workersMissingPotongJamDecision.length === 0;

  app.innerHTML = `
    <div class="page" style="position:relative; display:flex; flex-direction:column; height:100%; min-height:0; overflow:hidden; background:#EEEEEE; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
      <header style="height:52px; flex-shrink:0; display:flex; align-items:center; gap:10px; padding:0 14px; background:#FFFFFF; border-bottom:1px solid #D9DDE2;">
        <button id="mandoran-consolidation-back" type="button" aria-label="Kembali" style="padding:6px; margin-left:-6px; border:0; background:transparent; color:#116834; cursor:pointer; display:flex;">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        </button>
        <h1 style="font-size:1.12rem; font-weight:700; color:#111111; margin:0 0 0 8px; letter-spacing:-0.01em;">Konsolidasi Hasil</h1>
      </header>
      <div style="flex-shrink:0; display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:10px; padding:10px 18px; background:#FFFFFF; border-bottom:1px solid #D9DDE2;">
        <div style="min-width:0;">
          <div style="font-size:.9rem; color:#111827; font-weight:800;">${esc(userCtx.name || 'Mantri')}</div>
          <div style="margin-top:4px; font-size:.72rem; color:#7B8188;">${esc(userCtx.code || userCtx.loginCode || userCtx.userId || '-')} • ${esc(userCtx.position || 'Mantri Bibitan')}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:.86rem; color:#111827; font-weight:800;">${workerCount}</div>
          <div style="font-size:.68rem; color:#7B8188;">Pekerja</div>
        </div>
      </div>
      <main style="flex:1; min-height:0; overflow-y:auto; padding:13px 12px 16px;">
        ${hasConsolidationData ? `
          <h2 style="margin:0 0 12px; font-size:.94rem; font-weight:800; color:#111827;">Pekerja Bibitan</h2>
          ${groups.map((group) => `
            <section style="overflow:hidden; margin-bottom:14px; background:#FFFFFF; border:1px solid #DDDDDD; border-radius:10px; box-shadow:0 2px 4px rgba(0,0,0,.12);">
              <div style="min-height:43px; box-sizing:border-box; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 13px; border-bottom:1px solid #E1E1E1;">
                <div style="min-width:0; font-size:1rem; line-height:1.35; font-weight:800; color:#111111; overflow-wrap:anywhere;">${esc(group.allocationCode)} - ${esc(group.allocationName)}</div>
                <span style="flex-shrink:0; font-size:.88rem; font-weight:800; color:#111111;">${esc(group.uom)}</span>
              </div>
              ${group.workers.map((worker, workerIndex) => {
                const taskQuantity = getWorkerTaskQuantity(worker, group);
                const isNormal = worker.potongJamDecision === 'TIDAK_SETUJU';
                const isPotongJam = !isNormal && taskQuantity > 0 && worker.total < taskQuantity;
                const hasTaskQuantity = taskQuantity > 0;
                const isBelowTaskQuantity = hasTaskQuantity && worker.total < taskQuantity;
                const isNormalStatus = isNormal || !isBelowTaskQuantity;
                const statusDotColor = isNormalStatus ? '#43B649' : '#F41424';
                const resultColor = isPotongJam ? '#D71920' : '#111111';
                return `
                  <div style="border-bottom:${workerIndex < group.workers.length - 1 ? '1px solid #E5E5E5' : '0'};">
                    <button class="mandoran-consolidation-worker" data-worker-key="${esc(worker.key)}" type="button" aria-expanded="false" style="width:100%; min-height:59px; display:grid; grid-template-columns:minmax(0,1fr) auto 18px; align-items:center; gap:9px; padding:9px 12px; text-align:left; border:0; background:#FFFFFF; cursor:pointer;">
                      <span style="min-width:0; display:flex; align-items:center; gap:8px;">
                        ${hasTaskQuantity ? `<span aria-label="${isNormalStatus ? 'Normal' : 'Di bawah Task Quantity'}" style="width:13px; height:13px; flex:0 0 13px; border-radius:50%; background:${statusDotColor};"></span>` : ''}
                        <span style="min-width:0; display:flex; flex-direction:column; gap:4px;">
                          <span style="font-size:.86rem; line-height:1.3; font-weight:800; color:#111111; overflow-wrap:anywhere;">${esc(worker.name)}</span>
                          <span style="font-size:.73rem; line-height:1.25; color:#555555;">${esc(worker.code || '')}</span>
                        </span>
                      </span>
                      <span style="display:flex; align-items:center; gap:8px; white-space:nowrap;">
                        ${isPotongJam ? `<span style="padding:5px 6px; border-radius:4px; background:#F41424; color:#FFFFFF; font-size:.56rem; line-height:1; font-weight:900;">POTONG JAM</span>` : ''}
                        <span style="font-size:.86rem; font-weight:800; color:${resultColor};">${worker.total.toLocaleString('id-ID')}</span>
                      </span>
                      <svg viewBox="0 0 24 24" width="18" height="18" stroke="#087A3C" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round" style="transition:transform .15s;"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                    ${!isSavedView ? `
                      <div class="mandoran-consolidation-worker-detail" data-worker-detail="${esc(worker.key)}" hidden style="padding:0 14px 10px; color:#68717A; font-size:.74rem; line-height:1.55;">
                        ${worker.sources.map((source) => `<div>${esc(source.workGroupRoleCode || source.docNo || '-')} · ${esc(source.program || '-')} · ${new Date(source.createdAt || Date.now()).toLocaleDateString('id-ID')}</div>`).join('')}
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </section>
          `).join('')}
        ` : `
          <div style="padding:32px 20px; text-align:center; background:#FFFFFF; border:1px solid #DDDDDD; border-radius:9px; color:#64748B; box-shadow:0 2px 4px rgba(0,0,0,.1);">
            <div style="font-size:.9rem; font-weight:750; color:#334155;">Belum ada hasil Mandoran untuk dikonsolidasikan</div>
            <div style="margin-top:7px; font-size:.77rem; line-height:1.5;">Transaksi Rekam Aktivitas Mandoran yang tersimpan akan tampil di sini.</div>
          </div>
        `}
      </main>
      ${records.length || isSavedView ? `
        <footer style="flex-shrink:0; padding:10px 16px 13px; background:#FFFFFF; border-top:1px solid #D9DDE2;">
          <button id="btn-save-mandoran-consolidation" type="button" ${isSavedView || !canSaveConsolidation ? 'disabled' : ''} aria-disabled="${isSavedView || !canSaveConsolidation}" style="width:100%; height:46px; padding:0 12px; border:0; border-radius:8px; background:${isSavedView || canSaveConsolidation ? '#116834' : '#AAB4AE'}; color:#FFFFFF; font-size:.90rem; font-weight:700; cursor:${isSavedView || canSaveConsolidation ? 'default' : 'not-allowed'}; opacity:${isSavedView || canSaveConsolidation ? '1' : '.75'};">${isSavedView ? 'Data Konsolidasi Tersimpan' : 'Simpan Data Konsolidasi'}</button>
        </footer>
      ` : ''}
    </div>
  `;

  app.querySelector('#mandoran-consolidation-back')?.addEventListener('click', async () => {
    if (!records.length) {
      navigate('/home');
      return;
    }
    const leaveWithoutSaving = await confirmDialog({
      title: 'Hasil Belum Dikonsolidasikan',
      message: 'Simpan hasil konsolidasi terlebih dahulu sebelum meninggalkan halaman ini. Jika keluar sekarang, data Mandoran tetap menunggu untuk dikonsolidasikan.',
      confirmText: 'Keluar Tanpa Simpan',
      cancelText: 'Kembali'
    });
    if (leaveWithoutSaving) navigate('/home');
  });
  app.querySelectorAll('.mandoran-consolidation-worker').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.workerKey;
      const group = groups.find((item) => item.workers.some((candidate) => candidate.key === key));
      const worker = group?.workers.find((candidate) => candidate.key === key);
      const taskQuantity = getWorkerTaskQuantity(worker, group);
      const isBelowTaskQuantity = taskQuantity > 0 && worker?.total < taskQuantity;
      const isTaskQuantityMet = taskQuantity > 0 && worker?.total >= taskQuantity;
      const isNormalDecision = worker?.potongJamDecision === 'TIDAK_SETUJU';
      if (group && worker && (isSavedView || isTaskQuantityMet || isNormalDecision || (isBelowTaskQuantity && !isNormalDecision))) {
        navigate(`/nursery-activity/consolidation/worker/${encodeURIComponent(group.key)}/${encodeURIComponent(worker.workerId)}`);
        return;
      }
      const detail = app.querySelector(`[data-worker-detail="${CSS.escape(key)}"]`);
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', String(!expanded));
      if (detail) detail.hidden = expanded;
      const icon = button.querySelector('svg');
      if (icon) icon.style.transform = expanded ? '' : 'rotate(90deg)';
    });
  });

  app.querySelector('#btn-save-mandoran-consolidation')?.addEventListener('click', () => {
    if (isSavedView) return;
    const currentPendingDecisions = getWorkersMissingPotongJamDecision(groupMandoranRecords(getPendingMandoranRecords(userCtx)));
    if (currentPendingDecisions.length) {
      toast(`Tentukan Setujui Potong Jam untuk ${currentPendingDecisions.length} pekerja terlebih dahulu.`, 'warning');
      return;
    }
    const currentRecords = getPendingMandoranRecords(userCtx);
    if (!currentRecords.length) {
      toast('Tidak ada transaksi Mandoran baru untuk dikonsolidasikan.', 'info');
      renderMandoranConsolidation();
      return;
    }

    const now = new Date().toISOString();
    const id = `MDC-${Date.now()}`;
    const currentGroups = groupMandoranRecords(currentRecords);
    const consolidation = applyTransactionActor({
      id,
      docNo: `KMD/${new Date().getFullYear()}/${String(Date.now()).slice(-6)}`,
      type: 'MANDORAN_RESULT_CONSOLIDATION',
      status: 'SAVED',
      sourceTransactionIds: currentRecords.map((record) => record.id || record.docNo).filter(Boolean),
      sourceDocumentNumbers: currentRecords.map((record) => record.docNo).filter(Boolean),
      workerCount: currentGroups.reduce((count, group) => count + group.workers.length, 0),
      dailyWorkHourSummaries: [...new Map(currentGroups.flatMap((group) => group.workers).map((worker) => [String(worker.workerId), worker])).values()]
        .map((worker) => {
          const decision = worker.potongJamDecision || '';
          return {
            workerId: worker.workerId,
            code: worker.code,
            name: worker.name,
            potongJamDecision: decision,
            potongJamReason: worker.potongJamReason || '',
            days: calculateWorkerDailyWorkHours(currentRecords, worker.workerId).map((day) => ({
              date: day.dateKey,
              dayName: day.dayName,
              standardWorkHours: day.standardWorkHours,
              cutIncomeWorkHours: day.totalIncomeWorkHours,
              totalIncomeWorkHours: decision === 'TIDAK_SETUJU' && day.standardWorkHours !== null
                ? day.standardWorkHours
                : day.totalIncomeWorkHours,
              allocations: day.allocations.map((allocation) => ({
                allocationCode: allocation.allocationCode,
                allocationName: allocation.allocationName,
                standardOutput: allocation.standardOutput,
                actualOutput: allocation.actualOutput,
                uom: allocation.uom,
                incomeWorkHours: allocation.incomeWorkHours
              }))
            }))
          };
        }),
      groups: currentGroups.map((group) => ({
        allocationCode: group.allocationCode,
        allocationName: group.allocationName,
        workGroupRoleCode: group.roleCode,
        workGroupRoleName: group.roleName,
        uom: group.uom,
        taskQuantity: group.taskQuantity,
        workers: group.workers.map((worker) => ({
          workerId: worker.workerId,
          code: worker.code,
          name: worker.name,
          resultType: worker.resultType,
          potongJamDecision: worker.potongJamDecision,
          potongJamReason: worker.potongJamReason,
          durationHours: worker.durationHours || null,
          taskQuantity: getWorkerTaskQuantity(worker, group),
          inputHasil: worker.total,
          sourceTransactionIds: worker.sources.map((source) => source.id || source.docNo).filter(Boolean)
        }))
      })),
      createdAt: now
    }, 'CREATE', userCtx, `Konsolidasi ${currentRecords.length} transaksi aktivitas Mandoran`);

    storage.set(CONSOLIDATION_KEY, [...storage.get(CONSOLIDATION_KEY, []), consolidation]);
    const currentIds = new Set(currentRecords.map((record) => record.id || record.docNo).filter(Boolean));
    storage.set(SOURCE_KEY, storage.get(SOURCE_KEY, []).map((record) =>
      currentIds.has(record.id || record.docNo)
        ? { ...record, mandoranConsolidationId: id, mandoranConsolidatedAt: now }
        : record
    ));
    toast('Hasil aktivitas Mandoran berhasil dikonsolidasikan.', 'success');
    navigate('/home');
  });
}
