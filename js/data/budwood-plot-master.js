/**
 * data/budwood-plot-master.js — Master Data Plot Klon / Budwood Terpusat.
 * Sumber Data Resmi: data/budwood-plot-klon.csv (97 record plot resmi).
 *
 * Prinsip:
 * "SAFETY FIRST."
 * "SINGLE SOURCE OF TRUTH."
 * "DATASET PENGGUNA ADALAH SUMBER AKTUAL."
 * "SETIAP ROW SUMBER DIPERTAHANKAN."
 * "ADD, DO NOT BREAK."
 */

export const PLOT_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
});

/**
 * Dataset Master Plot Kebun Entres / Budwood (97 Record Resmi)
 */
export const BUDWOOD_PLOT_MASTER = Object.freeze([
  { id: 'PLOT-001', budwoodCode: '2021/BWG/001', plotName: 'IA', numberOfPlants: 425, yearOfPlanting: 2019, cloneName: 'IRCA331', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-002', budwoodCode: '2021/BWG/001', plotName: 'IB', numberOfPlants: 408, yearOfPlanting: 2019, cloneName: 'IRCA331', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-003', budwoodCode: '2021/BWG/001', plotName: 'IIA', numberOfPlants: 256, yearOfPlanting: 2019, cloneName: 'IRCA41', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-004', budwoodCode: '2021/BWG/001', plotName: 'IIB', numberOfPlants: 306, yearOfPlanting: 2019, cloneName: 'IRR112', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-005', budwoodCode: '2021/BWG/001', plotName: 'IIIA', numberOfPlants: 507, yearOfPlanting: 2018, cloneName: 'PB217', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-006', budwoodCode: '2021/BWG/001', plotName: 'IIIB', numberOfPlants: 285, yearOfPlanting: 2019, cloneName: 'IRCA41', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-007', budwoodCode: '2021/BWG/001', plotName: 'IVA', numberOfPlants: 211, yearOfPlanting: 2017, cloneName: 'PB217', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-008', budwoodCode: '2021/BWG/001', plotName: 'IVB', numberOfPlants: 582, yearOfPlanting: 2018, cloneName: 'PB217', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-009', budwoodCode: '2021/BWG/001', plotName: 'IXA', numberOfPlants: 9, yearOfPlanting: 2017, cloneName: 'PB254', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-010', budwoodCode: '2021/BWG/001', plotName: 'IXB', numberOfPlants: 42, yearOfPlanting: 2017, cloneName: 'IRCA19', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-011', budwoodCode: '2021/BWG/001', plotName: 'VA', numberOfPlants: 86, yearOfPlanting: 2017, cloneName: 'IRCA317', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-012', budwoodCode: '2021/BWG/001', plotName: 'VB', numberOfPlants: 235, yearOfPlanting: 2017, cloneName: 'PB217', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-013', budwoodCode: '2021/BWG/001', plotName: 'VIA', numberOfPlants: 540, yearOfPlanting: 2016, cloneName: 'PB260', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-014', budwoodCode: '2021/BWG/001', plotName: 'VIB', numberOfPlants: 93, yearOfPlanting: 2017, cloneName: 'IRCA331', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-015', budwoodCode: '2021/BWG/001', plotName: 'VIIA', numberOfPlants: 92, yearOfPlanting: 2017, cloneName: 'PB235', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-016', budwoodCode: '2021/BWG/001', plotName: 'VIIB', numberOfPlants: 543, yearOfPlanting: 2016, cloneName: 'PB260', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-017', budwoodCode: '2021/BWG/001', plotName: 'VIIIA', numberOfPlants: 94, yearOfPlanting: 2017, cloneName: 'IRCA19', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-018', budwoodCode: '2021/BWG/001', plotName: 'VIIIB', numberOfPlants: 41, yearOfPlanting: 2017, cloneName: 'PB235', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-019', budwoodCode: '2021/BWG/001', plotName: 'XA', numberOfPlants: 23, yearOfPlanting: 2017, cloneName: 'LBT94', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-020', budwoodCode: '2021/BWG/001', plotName: 'XB', numberOfPlants: 42, yearOfPlanting: 2017, cloneName: 'PB254', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-021', budwoodCode: '2021/BWG/001', plotName: 'XIA', numberOfPlants: 5, yearOfPlanting: 2017, cloneName: 'IRCA109', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-022', budwoodCode: '2021/BWG/001', plotName: 'XIIA', numberOfPlants: 16, yearOfPlanting: 2018, cloneName: 'RRIM703', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-023', budwoodCode: '2021/BWG/001', plotName: 'XIIB', numberOfPlants: 3, yearOfPlanting: 2011, cloneName: 'PB330', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-024', budwoodCode: '2021/BWG/001', plotName: 'XIIIA', numberOfPlants: 52, yearOfPlanting: 2018, cloneName: 'PR107', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-025', budwoodCode: '2021/BWG/001', plotName: 'XIIIB', numberOfPlants: 16, yearOfPlanting: 2019, cloneName: 'RRIM703', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-026', budwoodCode: '2021/BWG/001', plotName: 'XIVA', numberOfPlants: 24, yearOfPlanting: 2018, cloneName: 'PB217', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-027', budwoodCode: '2021/BWG/001', plotName: 'XIVB', numberOfPlants: 20, yearOfPlanting: 2019, cloneName: 'PR107', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-028', budwoodCode: '2021/BWG/001', plotName: 'XIXA', numberOfPlants: 4, yearOfPlanting: 2018, cloneName: 'IRCA733', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-029', budwoodCode: '2021/BWG/001', plotName: 'XIXB', numberOfPlants: 18, yearOfPlanting: 2017, cloneName: 'IRR221', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-030', budwoodCode: '2021/BWG/001', plotName: 'XVA', numberOfPlants: 4, yearOfPlanting: 2019, cloneName: 'PB217', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-031', budwoodCode: '2021/BWG/001', plotName: 'XVB', numberOfPlants: 20, yearOfPlanting: 2019, cloneName: 'IRCA1007', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-032', budwoodCode: '2021/BWG/001', plotName: 'XVIA', numberOfPlants: 5, yearOfPlanting: 2018, cloneName: 'IRCA317', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-033', budwoodCode: '2021/BWG/001', plotName: 'XVIB', numberOfPlants: 20, yearOfPlanting: 2019, cloneName: 'IRCA986', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-034', budwoodCode: '2021/BWG/001', plotName: 'XVIIA', numberOfPlants: 5, yearOfPlanting: 2019, cloneName: 'IRCA825', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-035', budwoodCode: '2021/BWG/001', plotName: 'XVIIB', numberOfPlants: 20, yearOfPlanting: 2019, cloneName: 'IRCA807', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-036', budwoodCode: '2021/BWG/001', plotName: 'XVIIIA', numberOfPlants: 7, yearOfPlanting: 2018, cloneName: 'PB260', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-037', budwoodCode: '2021/BWG/001', plotName: 'XVIIIB', numberOfPlants: 20, yearOfPlanting: 2019, cloneName: 'IRCA733', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-038', budwoodCode: '2021/BWG/001', plotName: 'XXA', numberOfPlants: 21, yearOfPlanting: 2017, cloneName: 'RRIM600', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-039', budwoodCode: '2021/BWG/001', plotName: 'XXB', numberOfPlants: 20, yearOfPlanting: 2017, cloneName: 'IRR220', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-040', budwoodCode: '2021/BWG/001', plotName: 'XXIA', numberOfPlants: 443, yearOfPlanting: 2016, cloneName: 'PB330', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-041', budwoodCode: '2021/BWG/001', plotName: 'XXIB', numberOfPlants: 18, yearOfPlanting: 2017, cloneName: 'RRIC100', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-042', budwoodCode: '2021/BWG/001', plotName: 'XXIIA', numberOfPlants: 171, yearOfPlanting: 2018, cloneName: 'PB330', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-043', budwoodCode: '2021/BWG/001', plotName: 'XXIIB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'BPM1', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-044', budwoodCode: '2021/BWG/001', plotName: 'XXIIIA', numberOfPlants: 745, yearOfPlanting: 2017, cloneName: 'PB330', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-045', budwoodCode: '2021/BWG/001', plotName: 'XXIIIB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'BPM24', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-046', budwoodCode: '2021/BWG/001', plotName: 'XXIVA', numberOfPlants: 120, yearOfPlanting: 2018, cloneName: 'PB330', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-047', budwoodCode: '2021/BWG/001', plotName: 'XXIVB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'GT1', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-048', budwoodCode: '2021/BWG/001', plotName: 'XXIXB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'IRCA317', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-049', budwoodCode: '2021/BWG/001', plotName: 'XXVA', numberOfPlants: 393, yearOfPlanting: 2019, cloneName: 'IRCA41', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-050', budwoodCode: '2021/BWG/001', plotName: 'XXVB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'GYT577', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-051', budwoodCode: '2021/BWG/001', plotName: 'XXVIB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'IRCA804', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-052', budwoodCode: '2021/BWG/001', plotName: 'XXVIIB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'IRCA427', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-053', budwoodCode: '2021/BWG/001', plotName: 'XXVIIIB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'IRCA331', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-054', budwoodCode: '2021/BWG/001', plotName: 'XXXB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'IRCA230', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-055', budwoodCode: '2021/BWG/001', plotName: 'XXXIB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'IRCA130', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-056', budwoodCode: '2021/BWG/001', plotName: 'XXXIIB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'IRCA111', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-057', budwoodCode: '2021/BWG/001', plotName: 'XXXIIIB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'IRCA101', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-058', budwoodCode: '2021/BWG/001', plotName: 'XXXIVB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'IRCA41', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-059', budwoodCode: '2021/BWG/001', plotName: 'XXXIXB', numberOfPlants: 20, yearOfPlanting: 2015, cloneName: 'PB260', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-060', budwoodCode: '2021/BWG/001', plotName: 'XXXVB', numberOfPlants: 19, yearOfPlanting: 2016, cloneName: 'IRCA19', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-061', budwoodCode: '2021/BWG/001', plotName: 'XXXVIB', numberOfPlants: 19, yearOfPlanting: 2016, cloneName: 'IRCA18', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-062', budwoodCode: '2021/BWG/001', plotName: 'XXXVIIB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'PM10', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-063', budwoodCode: '2021/BWG/001', plotName: 'XXXVIIIB', numberOfPlants: 20, yearOfPlanting: 2015, cloneName: 'PB330', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-064', budwoodCode: '2021/BWG/001', plotName: 'XXXXB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'PB340', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-065', budwoodCode: '2021/BWG/001', plotName: 'XXXXIB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'PB254', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-066', budwoodCode: '2021/BWG/001', plotName: 'XXXXIIB', numberOfPlants: 20, yearOfPlanting: 2015, cloneName: 'PB217', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-067', budwoodCode: '2021/BWG/001', plotName: 'XXXXIIIB', numberOfPlants: 19, yearOfPlanting: 2016, cloneName: 'PR300', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-068', budwoodCode: '2021/BWG/001', plotName: 'XXXXIVB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'PC10', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-069', budwoodCode: '2021/BWG/001', plotName: 'XXXXIXB', numberOfPlants: 19, yearOfPlanting: 2015, cloneName: 'RRIM911', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-070', budwoodCode: '2021/BWG/001', plotName: 'XXXXVB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'RRIM600', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-071', budwoodCode: '2021/BWG/001', plotName: 'XXXXVIB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'RRIM901', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-072', budwoodCode: '2021/BWG/001', plotName: 'XXXXVIIB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'RRIM712', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-073', budwoodCode: '2021/BWG/001', plotName: 'XXXXVIIIB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'RRIM908', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-074', budwoodCode: '2021/BWG/001', plotName: 'XXXXXB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'RRIM921', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-075', budwoodCode: '2021/BWG/001', plotName: 'XXXXXIB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'RRIM2020', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-076', budwoodCode: '2021/BWG/001', plotName: 'XXXXXIIB', numberOfPlants: 27, yearOfPlanting: 2016, cloneName: 'IRR5', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-077', budwoodCode: '2021/BWG/001', plotName: 'XXXXXIIIB', numberOfPlants: 73, yearOfPlanting: 2016, cloneName: 'IRR428', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-078', budwoodCode: '2021/BWG/001', plotName: 'XXXXXIVB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'IRR112', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-079', budwoodCode: '2021/BWG/001', plotName: 'XXXXXIXB', numberOfPlants: 52, yearOfPlanting: 2016, cloneName: 'IRR434', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-080', budwoodCode: '2021/BWG/001', plotName: 'XXXXXVB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'IRR118', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-081', budwoodCode: '2021/BWG/001', plotName: 'XXXXXVIB', numberOfPlants: 92, yearOfPlanting: 2016, cloneName: 'IRR429', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-082', budwoodCode: '2021/BWG/001', plotName: 'XXXXXVIIB', numberOfPlants: 60, yearOfPlanting: 2016, cloneName: 'IRR440', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-083', budwoodCode: '2021/BWG/001', plotName: 'XXXXXVIIIB', numberOfPlants: 40, yearOfPlanting: 2016, cloneName: 'IRR425', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-084', budwoodCode: '2021/BWG/001', plotName: 'XXXXXXB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'IRR104', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-085', budwoodCode: '2021/BWG/001', plotName: 'XXXXXXIB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'IRR230', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-086', budwoodCode: '2021/BWG/001', plotName: 'XXXXXXIIB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'IRR205', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-087', budwoodCode: '2021/BWG/001', plotName: 'XXXXXXIIIB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'IRR206', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-088', budwoodCode: '2021/BWG/001', plotName: 'XXXXXXIVB', numberOfPlants: 20, yearOfPlanting: 2016, cloneName: 'IRR207', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-089', budwoodCode: '2021/BWG/001', plotName: 'XXXXXXIXB', numberOfPlants: 17, yearOfPlanting: 2017, cloneName: 'IRCA1007', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-090', budwoodCode: '2021/BWG/001', plotName: 'XXXXXXVB', numberOfPlants: 19, yearOfPlanting: 2016, cloneName: 'IRR208', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-091', budwoodCode: '2021/BWG/001', plotName: 'XXXXXXVIB', numberOfPlants: 20, yearOfPlanting: 2017, cloneName: 'IRCA733', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-092', budwoodCode: '2021/BWG/001', plotName: 'XXXXXXVIIB', numberOfPlants: 20, yearOfPlanting: 2017, cloneName: 'IRCA807', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-093', budwoodCode: '2021/BWG/001', plotName: 'XXXXXXVIIIB', numberOfPlants: 20, yearOfPlanting: 2017, cloneName: 'IRCA986', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-094', budwoodCode: '2021/BWG/001', plotName: 'XXXXXXXB', numberOfPlants: 20, yearOfPlanting: 2017, cloneName: 'PR107', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-095', budwoodCode: '2021/BWG/001', plotName: 'XXXXXXXIB', numberOfPlants: 40, yearOfPlanting: 2018, cloneName: 'IRCA986', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-096', budwoodCode: '2021/BWG/001', plotName: 'XXXXXXXIIB', numberOfPlants: 17, yearOfPlanting: 2018, cloneName: 'RRIM703', status: PLOT_STATUS.ACTIVE },
  { id: 'PLOT-097', budwoodCode: '2021/BWG/001', plotName: 'XXXXXXXVIIIB', numberOfPlants: 120, yearOfPlanting: 2018, cloneName: 'GT1', status: PLOT_STATUS.ACTIVE }
]);

/**
 * Mengambil seluruh data master Plot.
 * @returns {Array<Object>}
 */
export function getAllBudwoodPlots() {
  return [...BUDWOOD_PLOT_MASTER];
}

/**
 * Mengambil data Plot berdasarkan ID internal (mis. 'PLOT-001').
 * @param {string} id
 * @returns {Object|null}
 */
export function getPlotById(id) {
  if (!id) return null;
  const clean = String(id).trim().toUpperCase();
  return BUDWOOD_PLOT_MASTER.find((p) => p.id.toUpperCase() === clean) || null;
}

/**
 * Mengambil data Plot berdasarkan plotName (mis. 'IA', 'XXIVB', 'XXXXXXXVIIIB').
 * @param {string} plotName
 * @returns {Object|null}
 */
export function getPlotByName(plotName) {
  if (!plotName) return null;
  const clean = String(plotName).trim().toUpperCase();
  return BUDWOOD_PLOT_MASTER.find((p) => p.plotName.toUpperCase() === clean) || null;
}

/**
 * Mengambil seluruh Plot yang menanam klon tertentu.
 * @param {string} cloneName
 * @returns {Array<Object>}
 */
export function getPlotsByClone(cloneName) {
  if (!cloneName) return [];
  const clean = String(cloneName).trim().toUpperCase().replace(/[\s\-_]/g, '');
  return BUDWOOD_PLOT_MASTER.filter((p) => p.cloneName.toUpperCase().replace(/[\s\-_]/g, '') === clean);
}

/**
 * Mengambil seluruh Plot berdasarkan budwood_code.
 * @param {string} budwoodCode
 * @returns {Array<Object>}
 */
export function getPlotsByBudwoodCode(budwoodCode) {
  if (!budwoodCode) return [];
  const clean = String(budwoodCode).trim();
  return BUDWOOD_PLOT_MASTER.filter((p) => p.budwoodCode === clean);
}

/**
 * Mengambil seluruh Plot berdasarkan tahun tanam.
 * @param {number|string} year
 * @returns {Array<Object>}
 */
export function getPlotsByYear(year) {
  if (!year) return [];
  const numYear = parseInt(year, 10);
  return BUDWOOD_PLOT_MASTER.filter((p) => p.yearOfPlanting === numYear);
}

/**
 * Helper resolusi cerdas untuk mencari plot dari sembarang input
 * (baik nama plot 'IA', ID 'PLOT-001', maupun legacy format 'PLOT-ENT-01').
 *
 * @param {string} value
 * @returns {Object|null}
 */
export function resolvePlot(value) {
  if (!value) return null;
  const str = String(value).trim();
  
  // 1. Cari by ID langsung
  const byId = getPlotById(str);
  if (byId) return byId;

  // 2. Cari by plotName
  const byName = getPlotByName(str);
  if (byName) return byName;

  // 2b. Cari by stripped "Plot XX"
  const stripped = str.replace(/^Plot\s+/i, '').trim();
  const byStripped = getPlotByName(stripped) || getPlotById(stripped);
  if (byStripped) return byStripped;

  // 3. Mapping legacy kompatibilitas jika menerima format 'PLOT-ENT-XX'
  const legacyMatch = str.match(/^PLOT-ENT-(\d+)$/i);
  if (legacyMatch) {
    const idx = parseInt(legacyMatch[1], 10);
    if (idx >= 1 && idx <= BUDWOOD_PLOT_MASTER.length) {
      return BUDWOOD_PLOT_MASTER[idx - 1];
    }
  }

  return null;
}

/**
 * Mengembalikan ringkasan statistik plot (total plot, total tanaman, rentang tahun).
 * @returns {Object}
 */
export function getPlotStatistics() {
  const totalPlots = BUDWOOD_PLOT_MASTER.length;
  const totalPlants = BUDWOOD_PLOT_MASTER.reduce((acc, p) => acc + p.numberOfPlants, 0);
  const years = BUDWOOD_PLOT_MASTER.map((p) => p.yearOfPlanting);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  return {
    totalPlots,
    totalPlants,
    minYear,
    maxYear
  };
}
