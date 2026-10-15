/**
 * Master alokasi kerja pembibitan yang diambil dari master_alokasi_kerja.xlsx.
 * Data bersifat deklaratif dan read-only. Kode disimpan sebagai string untuk
 * mempertahankan nilai alfanumerik seperti 1221A2.
 */

export const WORK_ALLOCATION_MASTER = Object.freeze([
  { accountGroupCode: '12212', accountGroupName: 'Seedbed', allocationCode: '122121', allocationName: 'Persiapan Bedengan', workGroupRoleCode: null, workGroupRoleName: null, taskRate: 0, taskQuantity: 0, overTaskRate: 0, taskItemName: null, uom: null, uomCode: null, isMaterial: false },
  { accountGroupCode: '12212', accountGroupName: 'Seedbed', allocationCode: '122122', allocationName: 'Pemeliharaan Bedengan', workGroupRoleCode: null, workGroupRoleName: null, taskRate: 0, taskQuantity: 0, overTaskRate: 0, taskItemName: null, uom: null, uomCode: null, isMaterial: false },
  { accountGroupCode: '12212', accountGroupName: 'Seedbed', allocationCode: '122123', allocationName: 'Penanaman Biji Di Bedengan', workGroupRoleCode: null, workGroupRoleName: null, taskRate: 0, taskQuantity: 0, overTaskRate: 0, taskItemName: null, uom: null, uomCode: null, isMaterial: true },
  { accountGroupCode: '12212', accountGroupName: 'Seedbed', allocationCode: '122124', allocationName: 'Penyiraman Di Bedengan', workGroupRoleCode: null, workGroupRoleName: null, taskRate: 0, taskQuantity: 0, overTaskRate: 0, taskItemName: null, uom: null, uomCode: null, isMaterial: false },
  { accountGroupCode: '12215', accountGroupName: 'Preparation', allocationCode: '122151', allocationName: 'Mencari Dan Mengumpulkan Tanah', workGroupRoleCode: '2026/MDKT/01/07', workGroupRoleName: 'Mencari Dan Mengumpulkan Tanah', taskRate: 0, taskQuantity: 5, overTaskRate: 0, taskItemName: null, uom: 'Ton', uomCode: 'Ton', isMaterial: false },
  { accountGroupCode: '12215', accountGroupName: 'Preparation', allocationCode: '122152', allocationName: 'Persiapan Media Dan Pengisian Polybag', workGroupRoleCode: '2026/PMPP/01/08', workGroupRoleName: 'Persiapan Media Dan Pengisian Polybag', taskRate: 0, taskQuantity: 60, overTaskRate: 0, taskItemName: null, uom: 'Polybag', uomCode: 'Plb', isMaterial: false },
  { accountGroupCode: '12215', accountGroupName: 'Preparation', allocationCode: '122153', allocationName: 'Pembuatan Parit', workGroupRoleCode: '2026/PBPT/01/09', workGroupRoleName: 'Pembuatan Parit', taskRate: 0, taskQuantity: 50, overTaskRate: 0, taskItemName: null, uom: 'Meter', uomCode: 'Mtr', isMaterial: false },
  { accountGroupCode: '12215', accountGroupName: 'Preparation', allocationCode: '122154', allocationName: 'Menyusun Polybag', workGroupRoleCode: '2026/MSPL/01/10', workGroupRoleName: 'Menyusun Polybag', taskRate: 0, taskQuantity: 200, overTaskRate: 0, taskItemName: null, uom: 'Polybag', uomCode: 'Plb', isMaterial: false },
  { accountGroupCode: '12215', accountGroupName: 'Preparation', allocationCode: '122155', allocationName: 'Ayak Tanah Dan Campur Dengan Pupuk RP', workGroupRoleCode: '2026/ATCP/01/11', workGroupRoleName: 'Ayak Tanah Dan Campur Dengan Pupuk RP', taskRate: 0, taskQuantity: 3, overTaskRate: 0, taskItemName: null, uom: 'Ton', uomCode: 'Ton', isMaterial: true },
  { accountGroupCode: '12216', accountGroupName: 'Planting', allocationCode: '122161', allocationName: 'Menanam Kecambah Di Polybag', workGroupRoleCode: '2026/MKPL/01/13', workGroupRoleName: 'Menanam Kecambah Di Polybag', taskRate: 0, taskQuantity: 800, overTaskRate: 0, taskItemName: null, uom: 'Bibit', uomCode: 'Pkk', isMaterial: false },
  { accountGroupCode: '12216', accountGroupName: 'Planting', allocationCode: '122162', allocationName: 'Tanam Entrys Baru', workGroupRoleCode: '2026/TEB/01/14', workGroupRoleName: 'Tanam Entrys Baru', taskRate: 0, taskQuantity: 50, overTaskRate: 0, taskItemName: null, uom: 'Pokok', uomCode: 'Pkk', isMaterial: false },
  { accountGroupCode: '12217', accountGroupName: 'Maintenance', allocationCode: '122171', allocationName: 'Penyiraman', workGroupRoleCode: '2026/PSR/01/15', workGroupRoleName: 'Penyiraman', taskRate: 0, taskQuantity: 10000, overTaskRate: 0, taskItemName: null, uom: 'Polybag', uomCode: 'Plb', isMaterial: false },
  { accountGroupCode: '12217', accountGroupName: 'Maintenance', allocationCode: '122172', allocationName: 'Penyisipan', workGroupRoleCode: null, workGroupRoleName: null, taskRate: 0, taskQuantity: 0, overTaskRate: 0, taskItemName: null, uom: null, uomCode: null, isMaterial: false },
  { accountGroupCode: '12217', accountGroupName: 'Maintenance', allocationCode: '122173', allocationName: 'Pengendalian Gulma', workGroupRoleCode: '2026/PGLM/01/17', workGroupRoleName: 'Pengendalian Gulma', taskRate: 0, taskQuantity: 10000, overTaskRate: 0, taskItemName: null, uom: 'Polybag', uomCode: 'Plb', isMaterial: true },
  { accountGroupCode: '12217', accountGroupName: 'Maintenance', allocationCode: '122174', allocationName: 'Pemupukan', workGroupRoleCode: '2026/PMPK/01/18', workGroupRoleName: 'Pemupukan', taskRate: 0, taskQuantity: 1000, overTaskRate: 0, taskItemName: null, uom: 'Polybag', uomCode: 'Plb', isMaterial: true },
  { accountGroupCode: '12217', accountGroupName: 'Maintenance', allocationCode: '122175', allocationName: 'Pengendalian Hama Penyakit', workGroupRoleCode: '2026/PHPT/01/19', workGroupRoleName: 'Pengendalian Hama Penyakit', taskRate: 0, taskQuantity: 10000, overTaskRate: 0, taskItemName: null, uom: 'Pokok', uomCode: 'Plb', isMaterial: true },
  { accountGroupCode: '12217', accountGroupName: 'Maintenance', allocationCode: '122176', allocationName: 'Seleksi Bibit', workGroupRoleCode: '2026/SLBT/01/20', workGroupRoleName: 'Seleksi Bibit', taskRate: 0, taskQuantity: 1000, overTaskRate: 0, taskItemName: null, uom: 'Pokok', uomCode: 'Pkk', isMaterial: false },
  { accountGroupCode: '12217', accountGroupName: 'Maintenance', allocationCode: '122177', allocationName: 'Perawatan Entrys Baru', workGroupRoleCode: '2026/PEB/01/21', workGroupRoleName: 'Perawatan Entrys Baru', taskRate: 0, taskQuantity: 0.5, overTaskRate: 0, taskItemName: null, uom: 'Ha', uomCode: 'HA', isMaterial: false },
  { accountGroupCode: '12217', accountGroupName: 'Maintenance', allocationCode: '122178', allocationName: 'Tunas Liar Dan Clipping', workGroupRoleCode: '2026/TLCP/01/22', workGroupRoleName: 'Tunas Liar Dan Clipping', taskRate: 0, taskQuantity: 0.5, overTaskRate: 0, taskItemName: null, uom: null, uomCode: null, isMaterial: false },
  { accountGroupCode: '12218', accountGroupName: 'Grafting', allocationCode: '122181', allocationName: 'Panen Entrys', workGroupRoleCode: '2026/PENT/01/23', workGroupRoleName: 'Panen Entrys', taskRate: 0, taskQuantity: 200, overTaskRate: 0, taskItemName: null, uom: 'Cabang', uomCode: 'Mtr', isMaterial: false },
  { accountGroupCode: '12218', accountGroupName: 'Grafting', allocationCode: '122182', allocationName: 'Okulasi', workGroupRoleCode: '2026/OKL/01/24', workGroupRoleName: 'Okulasi', taskRate: 0, taskQuantity: 10, overTaskRate: 0, taskItemName: null, uom: 'Pokok', uomCode: 'Pkk', isMaterial: false },
  { accountGroupCode: '12218', accountGroupName: 'Grafting', allocationCode: '122183', allocationName: 'Buka Perban Dan Pemeriksaan Okulasi', workGroupRoleCode: '2026/BPPO/01/25', workGroupRoleName: 'Buka Perban Dan Pemeriksaan Okulasi', taskRate: 0, taskQuantity: 300, overTaskRate: 0, taskItemName: null, uom: 'Pokok', uomCode: 'Pkk', isMaterial: false },
  { accountGroupCode: '12219', accountGroupName: 'Topping', allocationCode: '122191', allocationName: 'Topping', workGroupRoleCode: '2026/TPG/01/26', workGroupRoleName: 'Topping', taskRate: 0, taskQuantity: 250, overTaskRate: 0, taskItemName: null, uom: 'Pokok', uomCode: 'Pkk', isMaterial: false },
  { accountGroupCode: '12219', accountGroupName: 'Topping', allocationCode: '122193', allocationName: 'Treatment Dan Pengemasan', workGroupRoleCode: '2026/TDPP/01/27', workGroupRoleName: 'Treatment Dan Pengemasan', taskRate: 0, taskQuantity: 600, overTaskRate: 0, taskItemName: null, uom: 'Pokok', uomCode: 'Pkk', isMaterial: false },
  { accountGroupCode: '1221A', accountGroupName: 'Supervision', allocationCode: '1221A2', allocationName: 'Gaji Jaga Malam', workGroupRoleCode: null, workGroupRoleName: null, taskRate: 0, taskQuantity: 1000, overTaskRate: 0, taskItemName: null, uom: null, uomCode: null, isMaterial: false }
]);

export function getAllWorkAllocations() {
  return [...WORK_ALLOCATION_MASTER];
}

export function getWorkAllocationByCode(code) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  return WORK_ALLOCATION_MASTER.find(item => item.allocationCode.toUpperCase() === normalizedCode) || null;
}

export function getWorkAllocationsByAccountGroup(groupCode) {
  const normalizedCode = String(groupCode || '').trim().toUpperCase();
  return WORK_ALLOCATION_MASTER.filter(item => item.accountGroupCode.toUpperCase() === normalizedCode);
}

export function searchWorkAllocations(query = '') {
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!normalizedQuery) return getAllWorkAllocations();

  return WORK_ALLOCATION_MASTER.filter(item =>
    item.allocationCode.toLowerCase().includes(normalizedQuery) ||
    item.allocationName.toLowerCase().includes(normalizedQuery) ||
    item.accountGroupName.toLowerCase().includes(normalizedQuery) ||
    (item.workGroupRoleCode || '').toLowerCase().includes(normalizedQuery) ||
    (item.workGroupRoleName || '').toLowerCase().includes(normalizedQuery)
  );
}
