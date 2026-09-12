/**
 * data/block-master.js — Master Data Block / Blok Terpusat.
 * Sumber Data Resmi: data/block-master.csv (40 record blok resmi).
 *
 * Prinsip:
 * "SAFETY FIRST."
 * "SINGLE SOURCE OF TRUTH."
 * "DATASET PENGGUNA ADALAH SUMBER AKTUAL."
 * "ADD, DO NOT BREAK."
 *
 * 4 Divisi × 10 Blok = 40 Blok Resmi.
 */

export const BLOCK_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  REPLANTING: 'REPLANTING'
});

/**
 * Dataset Master Block Resmi (40 Record Terverifikasi)
 */
export const BLOCK_MASTER = Object.freeze([
  // =========================================================================
  // TANAH BESIH (EST-TBS) — DIVISI I (DIV-001) [10 BLOK]
  // =========================================================================
  {
    id: 'BLK-001',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionCode: 'DIV-001',
    divisionName: 'Divisi I',
    blockCode: '001/91',
    blockName: 'Block 001/91',
    maturedArea: 34.79,
    immatureArea: 5.21,
    maturityAge: 35,
    firstHarvestingDate: '1996-01-01',
    plantingYear: 1991,
    plantAge: 35,
    cloneName: 'PC 10',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-002',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionCode: 'DIV-001',
    divisionName: 'Divisi I',
    blockCode: '002/87',
    blockName: 'Block 002/87',
    maturedArea: 23.58,
    immatureArea: 16.42,
    maturityAge: 39,
    firstHarvestingDate: '1993-01-01',
    plantingYear: 1987,
    plantAge: 39,
    cloneName: 'IRCA 109',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-003',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionCode: 'DIV-001',
    divisionName: 'Divisi I',
    blockCode: '003/24',
    blockName: 'Block 003/24',
    maturedArea: 24.38,
    immatureArea: 15.62,
    maturityAge: 2,
    firstHarvestingDate: '2029-01-01',
    plantingYear: 2024,
    plantAge: 2,
    cloneName: 'GT 1',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-004',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionCode: 'DIV-001',
    divisionName: 'Divisi I',
    blockCode: '004/18',
    blockName: 'Block 004/18',
    maturedArea: 25.22,
    immatureArea: 14.78,
    maturityAge: 8,
    firstHarvestingDate: '2025-01-01',
    plantingYear: 2018,
    plantAge: 8,
    cloneName: 'PR 107',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-005',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionCode: 'DIV-001',
    divisionName: 'Divisi I',
    blockCode: '005/93',
    blockName: 'Block 005/93',
    maturedArea: 23.73,
    immatureArea: 16.27,
    maturityAge: 33,
    firstHarvestingDate: '1999-01-01',
    plantingYear: 1993,
    plantAge: 33,
    cloneName: 'IRCA 1007',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-006',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionCode: 'DIV-001',
    divisionName: 'Divisi I',
    blockCode: '006/96',
    blockName: 'Block 006/96',
    maturedArea: 22.41,
    immatureArea: 17.59,
    maturityAge: 30,
    firstHarvestingDate: '2001-01-01',
    plantingYear: 1996,
    plantAge: 30,
    cloneName: 'RRIM 2020',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-007',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionCode: 'DIV-001',
    divisionName: 'Divisi I',
    blockCode: '007/95',
    blockName: 'Block 007/95',
    maturedArea: 29.03,
    immatureArea: 10.97,
    maturityAge: 31,
    firstHarvestingDate: '2000-01-01',
    plantingYear: 1995,
    plantAge: 31,
    cloneName: 'PB 340',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-008',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionCode: 'DIV-001',
    divisionName: 'Divisi I',
    blockCode: '008/11',
    blockName: 'Block 008/11',
    maturedArea: 26.91,
    immatureArea: 13.09,
    maturityAge: 15,
    firstHarvestingDate: '2016-01-01',
    plantingYear: 2011,
    plantAge: 15,
    cloneName: 'IRCA 101',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-009',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionCode: 'DIV-001',
    divisionName: 'Divisi I',
    blockCode: '009/19',
    blockName: 'Block 009/19',
    maturedArea: 34.11,
    immatureArea: 5.89,
    maturityAge: 7,
    firstHarvestingDate: '2024-01-01',
    plantingYear: 2019,
    plantAge: 7,
    cloneName: 'IRR 118',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-010',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionCode: 'DIV-001',
    divisionName: 'Divisi I',
    blockCode: '010/98',
    blockName: 'Block 010/98',
    maturedArea: 22.74,
    immatureArea: 17.26,
    maturityAge: 28,
    firstHarvestingDate: '2003-01-01',
    plantingYear: 1998,
    plantAge: 28,
    cloneName: 'IRR 207',
    status: BLOCK_STATUS.ACTIVE
  },

  // =========================================================================
  // TANAH BESIH (EST-TBS) — DIVISI II (DIV-002) [10 BLOK]
  // =========================================================================
  {
    id: 'BLK-011',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionCode: 'DIV-002',
    divisionName: 'Divisi II',
    blockCode: '001/06',
    blockName: 'Block 001/06',
    maturedArea: 28.42,
    immatureArea: 11.58,
    maturityAge: 20,
    firstHarvestingDate: '2013-01-01',
    plantingYear: 2006,
    plantAge: 20,
    cloneName: 'PR 300',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-012',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionCode: 'DIV-002',
    divisionName: 'Divisi II',
    blockCode: '002/25',
    blockName: 'Block 002/25',
    maturedArea: 21.01,
    immatureArea: 18.99,
    maturityAge: 1,
    firstHarvestingDate: '2032-01-01',
    plantingYear: 2025,
    plantAge: 1,
    cloneName: 'RRIM 911',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-013',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionCode: 'DIV-002',
    divisionName: 'Divisi II',
    blockCode: '003/10',
    blockName: 'Block 003/10',
    maturedArea: 32.5,
    immatureArea: 7.5,
    maturityAge: 16,
    firstHarvestingDate: '2017-01-01',
    plantingYear: 2010,
    plantAge: 16,
    cloneName: 'PB 235',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-014',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionCode: 'DIV-002',
    divisionName: 'Divisi II',
    blockCode: '004/07',
    blockName: 'Block 004/07',
    maturedArea: 23.43,
    immatureArea: 16.57,
    maturityAge: 19,
    firstHarvestingDate: '2014-01-01',
    plantingYear: 2007,
    plantAge: 19,
    cloneName: 'IRCA 733',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-015',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionCode: 'DIV-002',
    divisionName: 'Divisi II',
    blockCode: '005/23',
    blockName: 'Block 005/23',
    maturedArea: 21.66,
    immatureArea: 18.34,
    maturityAge: 3,
    firstHarvestingDate: '2028-01-01',
    plantingYear: 2023,
    plantAge: 3,
    cloneName: 'PB 340',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-016',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionCode: 'DIV-002',
    divisionName: 'Divisi II',
    blockCode: '006/26',
    blockName: 'Block 006/26',
    maturedArea: 25.42,
    immatureArea: 14.58,
    maturityAge: 0,
    firstHarvestingDate: '2031-01-01',
    plantingYear: 2026,
    plantAge: 0,
    cloneName: 'PB 260',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-017',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionCode: 'DIV-002',
    divisionName: 'Divisi II',
    blockCode: '007/03',
    blockName: 'Block 007/03',
    maturedArea: 28.08,
    immatureArea: 11.92,
    maturityAge: 23,
    firstHarvestingDate: '2008-01-01',
    plantingYear: 2003,
    plantAge: 23,
    cloneName: 'IRR 118',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-018',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionCode: 'DIV-002',
    divisionName: 'Divisi II',
    blockCode: '008/16',
    blockName: 'Block 008/16',
    maturedArea: 22.77,
    immatureArea: 17.23,
    maturityAge: 10,
    firstHarvestingDate: '2023-01-01',
    plantingYear: 2016,
    plantAge: 10,
    cloneName: 'IRR 220',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-019',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionCode: 'DIV-002',
    divisionName: 'Divisi II',
    blockCode: '009/12',
    blockName: 'Block 009/12',
    maturedArea: 20.61,
    immatureArea: 19.39,
    maturityAge: 14,
    firstHarvestingDate: '2018-01-01',
    plantingYear: 2012,
    plantAge: 14,
    cloneName: 'PB 330',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-020',
    estateCode: 'EST-TBS',
    estateName: 'Tanah Besih',
    divisionCode: 'DIV-002',
    divisionName: 'Divisi II',
    blockCode: '010/21',
    blockName: 'Block 010/21',
    maturedArea: 27.58,
    immatureArea: 12.42,
    maturityAge: 5,
    firstHarvestingDate: '2027-01-01',
    plantingYear: 2021,
    plantAge: 5,
    cloneName: 'IRCA 130',
    status: BLOCK_STATUS.ACTIVE
  },

  // =========================================================================
  // AEK PAMINGKE (EST-APM) — DIVISI I (DIV-APM-01) [10 BLOK]
  // =========================================================================
  {
    id: 'BLK-021',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionCode: 'DIV-APM-01',
    divisionName: 'Divisi I',
    blockCode: '001/15',
    blockName: 'Block 001/15',
    maturedArea: 25.36,
    immatureArea: 14.64,
    maturityAge: 11,
    firstHarvestingDate: '2021-01-01',
    plantingYear: 2015,
    plantAge: 11,
    cloneName: 'IRCA 427',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-022',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionCode: 'DIV-APM-01',
    divisionName: 'Divisi I',
    blockCode: '002/97',
    blockName: 'Block 002/97',
    maturedArea: 32.46,
    immatureArea: 7.54,
    maturityAge: 29,
    firstHarvestingDate: '2002-01-01',
    plantingYear: 1997,
    plantAge: 29,
    cloneName: 'IRR 425',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-023',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionCode: 'DIV-APM-01',
    divisionName: 'Divisi I',
    blockCode: '003/89',
    blockName: 'Block 003/89',
    maturedArea: 29.17,
    immatureArea: 10.83,
    maturityAge: 37,
    firstHarvestingDate: '1994-01-01',
    plantingYear: 1989,
    plantAge: 37,
    cloneName: 'PB 217',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-024',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionCode: 'DIV-APM-01',
    divisionName: 'Divisi I',
    blockCode: '004/13',
    blockName: 'Block 004/13',
    maturedArea: 35.99,
    immatureArea: 4.01,
    maturityAge: 13,
    firstHarvestingDate: '2019-01-01',
    plantingYear: 2013,
    plantAge: 13,
    cloneName: 'RRIM 901',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-025',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionCode: 'DIV-APM-01',
    divisionName: 'Divisi I',
    blockCode: '005/08',
    blockName: 'Block 005/08',
    maturedArea: 30.64,
    immatureArea: 9.36,
    maturityAge: 18,
    firstHarvestingDate: '2015-01-01',
    plantingYear: 2008,
    plantAge: 18,
    cloneName: 'RRIM 908',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-026',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionCode: 'DIV-APM-01',
    divisionName: 'Divisi I',
    blockCode: '006/22',
    blockName: 'Block 006/22',
    maturedArea: 32.67,
    immatureArea: 7.33,
    maturityAge: 4,
    firstHarvestingDate: '2028-01-01',
    plantingYear: 2022,
    plantAge: 4,
    cloneName: 'IRR 230',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-027',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionCode: 'DIV-APM-01',
    divisionName: 'Divisi I',
    blockCode: '007/05',
    blockName: 'Block 007/05',
    maturedArea: 34.35,
    immatureArea: 5.65,
    maturityAge: 21,
    firstHarvestingDate: '2011-01-01',
    plantingYear: 2005,
    plantAge: 21,
    cloneName: 'IRCA 101',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-028',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionCode: 'DIV-APM-01',
    divisionName: 'Divisi I',
    blockCode: '008/09',
    blockName: 'Block 008/09',
    maturedArea: 32.86,
    immatureArea: 7.14,
    maturityAge: 17,
    firstHarvestingDate: '2014-01-01',
    plantingYear: 2009,
    plantAge: 17,
    cloneName: 'RRIM 600',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-029',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionCode: 'DIV-APM-01',
    divisionName: 'Divisi I',
    blockCode: '009/04',
    blockName: 'Block 009/04',
    maturedArea: 35.47,
    immatureArea: 4.53,
    maturityAge: 22,
    firstHarvestingDate: '2009-01-01',
    plantingYear: 2004,
    plantAge: 22,
    cloneName: 'IRCA 317',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-030',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionCode: 'DIV-APM-01',
    divisionName: 'Divisi I',
    blockCode: '010/01',
    blockName: 'Block 010/01',
    maturedArea: 20.48,
    immatureArea: 19.52,
    maturityAge: 25,
    firstHarvestingDate: '2008-01-01',
    plantingYear: 2001,
    plantAge: 25,
    cloneName: 'IRR 221',
    status: BLOCK_STATUS.ACTIVE
  },

  // =========================================================================
  // AEK PAMINGKE (EST-APM) — DIVISI II (DIV-APM-02) [10 BLOK]
  // =========================================================================
  {
    id: 'BLK-031',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionCode: 'DIV-APM-02',
    divisionName: 'Divisi II',
    blockCode: '001/02',
    blockName: 'Block 001/02',
    maturedArea: 21.39,
    immatureArea: 18.61,
    maturityAge: 24,
    firstHarvestingDate: '2009-01-01',
    plantingYear: 2002,
    plantAge: 24,
    cloneName: 'IRCA 19',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-032',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionCode: 'DIV-APM-02',
    divisionName: 'Divisi II',
    blockCode: '002/20',
    blockName: 'Block 002/20',
    maturedArea: 20.99,
    immatureArea: 19.01,
    maturityAge: 6,
    firstHarvestingDate: '2027-01-01',
    plantingYear: 2020,
    plantAge: 6,
    cloneName: 'RRIM 901',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-033',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionCode: 'DIV-APM-02',
    divisionName: 'Divisi II',
    blockCode: '003/99',
    blockName: 'Block 003/99',
    maturedArea: 31.5,
    immatureArea: 8.5,
    maturityAge: 27,
    firstHarvestingDate: '2004-01-01',
    plantingYear: 1999,
    plantAge: 27,
    cloneName: 'RRIM 911',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-034',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionCode: 'DIV-APM-02',
    divisionName: 'Divisi II',
    blockCode: '004/92',
    blockName: 'Block 004/92',
    maturedArea: 28.02,
    immatureArea: 11.98,
    maturityAge: 34,
    firstHarvestingDate: '1997-01-01',
    plantingYear: 1992,
    plantAge: 34,
    cloneName: 'RRIM 921',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-035',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionCode: 'DIV-APM-02',
    divisionName: 'Divisi II',
    blockCode: '005/17',
    blockName: 'Block 005/17',
    maturedArea: 31.47,
    immatureArea: 8.53,
    maturityAge: 9,
    firstHarvestingDate: '2024-01-01',
    plantingYear: 2017,
    plantAge: 9,
    cloneName: 'RRIM 901',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-036',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionCode: 'DIV-APM-02',
    divisionName: 'Divisi II',
    blockCode: '006/88',
    blockName: 'Block 006/88',
    maturedArea: 34.34,
    immatureArea: 5.66,
    maturityAge: 38,
    firstHarvestingDate: '1994-01-01',
    plantingYear: 1988,
    plantAge: 38,
    cloneName: 'IRCA 807',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-037',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionCode: 'DIV-APM-02',
    divisionName: 'Divisi II',
    blockCode: '007/94',
    blockName: 'Block 007/94',
    maturedArea: 30.68,
    immatureArea: 9.32,
    maturityAge: 32,
    firstHarvestingDate: '1999-01-01',
    plantingYear: 1994,
    plantAge: 32,
    cloneName: 'IRR 428',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-038',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionCode: 'DIV-APM-02',
    divisionName: 'Divisi II',
    blockCode: '008/00',
    blockName: 'Block 008/00',
    maturedArea: 25.68,
    immatureArea: 14.32,
    maturityAge: 26,
    firstHarvestingDate: '2006-01-01',
    plantingYear: 2000,
    plantAge: 26,
    cloneName: 'IRCA 825',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-039',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionCode: 'DIV-APM-02',
    divisionName: 'Divisi II',
    blockCode: '009/14',
    blockName: 'Block 009/14',
    maturedArea: 30.46,
    immatureArea: 9.54,
    maturityAge: 12,
    firstHarvestingDate: '2021-01-01',
    plantingYear: 2014,
    plantAge: 12,
    cloneName: 'RRIM 921',
    status: BLOCK_STATUS.ACTIVE
  },
  {
    id: 'BLK-040',
    estateCode: 'EST-APM',
    estateName: 'Aek Pamingke',
    divisionCode: 'DIV-APM-02',
    divisionName: 'Divisi II',
    blockCode: '010/90',
    blockName: 'Block 010/90',
    maturedArea: 33.81,
    immatureArea: 6.19,
    maturityAge: 36,
    firstHarvestingDate: '1997-01-01',
    plantingYear: 1990,
    plantAge: 36,
    cloneName: 'IRCA 317',
    status: BLOCK_STATUS.ACTIVE
  }
]);

/**
 * Mengambil seluruh data Master Block (40 blok).
 * @returns {Array<Object>}
 */
export function getAllBlocks() {
  return [...BLOCK_MASTER];
}

/**
 * Mengambil data Block yang berstatus ACTIVE.
 * @returns {Array<Object>}
 */
export function getActiveBlocks() {
  return BLOCK_MASTER.filter((b) => b.status === BLOCK_STATUS.ACTIVE);
}

/**
 * Mengambil data Block berdasarkan ID internal (mis. 'BLK-001').
 * @param {string} id
 * @returns {Object|null}
 */
export function getBlockById(id) {
  if (!id) return null;
  const cleanId = String(id).trim().toUpperCase();
  return BLOCK_MASTER.find((b) => b.id.toUpperCase() === cleanId) || null;
}

/**
 * Mengambil data Block berdasarkan blockCode (mis. '001/91', '001/19').
 * @param {string} code
 * @returns {Object|null}
 */
export function getBlockByCode(code) {
  if (!code) return null;
  const cleanCode = String(code).trim().toUpperCase();
  return BLOCK_MASTER.find((b) => b.blockCode.toUpperCase() === cleanCode) || null;
}

/**
 * Mengambil seluruh Block pada Estate tertentu (mis. 'EST-TBS' atau 'EST-APM').
 * @param {string} estateCode
 * @returns {Array<Object>}
 */
export function getBlocksByEstate(estateCode) {
  if (!estateCode) return [];
  const clean = String(estateCode).trim().toUpperCase();
  return BLOCK_MASTER.filter(
    (b) => b.estateCode.toUpperCase() === clean || b.estateName.toUpperCase() === clean
  );
}

/**
 * Mengambil seluruh Block pada Divisi tertentu (mis. 'DIV-001', 'DIV-002', 'DIV-APM-01', 'DIV-APM-02').
 * @param {string} divisionCode
 * @returns {Array<Object>}
 */
export function getBlocksByDivision(divisionCode) {
  if (!divisionCode) return [];
  const clean = String(divisionCode).trim().toUpperCase();
  return BLOCK_MASTER.filter(
    (b) => b.divisionCode.toUpperCase() === clean || b.divisionName.toUpperCase() === clean
  );
}

/**
 * Mengambil seluruh Block yang menanam klon tertentu.
 * @param {string} cloneName
 * @returns {Array<Object>}
 */
export function getBlocksByClone(cloneName) {
  if (!cloneName) return [];
  const clean = String(cloneName).trim().toUpperCase().replace(/[\s\-_]/g, '');
  return BLOCK_MASTER.filter(
    (b) => b.cloneName.toUpperCase().replace(/[\s\-_]/g, '') === clean
  );
}

/**
 * Resolver cerdas untuk menemukan record Block dari sembarang input
 * (ID, BlockCode, BlockName, atau variasi string).
 * @param {string} value
 * @returns {Object|null}
 */
export function resolveBlock(value) {
  if (!value) return null;
  const str = String(value).trim();

  // 1. Cari by ID
  const byId = getBlockById(str);
  if (byId) return byId;

  // 2. Cari by blockCode langsung
  const byCode = getBlockByCode(str);
  if (byCode) return byCode;

  // 3. Cari by blockName
  const cleanName = str.toUpperCase();
  const byName = BLOCK_MASTER.find((b) => b.blockName.toUpperCase() === cleanName);
  if (byName) return byName;

  // 4. Cari dengan stripping "Block " atau "Blok "
  const stripped = str.replace(/^(?:Block|Blok)\s+/i, '').trim();
  const byStrippedCode = getBlockByCode(stripped);
  if (byStrippedCode) return byStrippedCode;

  // 5. Fallback pencocokan normalized code
  const normInput = str.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const byNorm = BLOCK_MASTER.find((b) => {
    const normBCode = b.blockCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const normBName = b.blockName.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return normBCode === normInput || normBName === normInput;
  });
  if (byNorm) return byNorm;

  return null;
}

/**
 * Memeriksa apakah suatu ID Block berstatus ACTIVE.
 * @param {string} id
 * @returns {boolean}
 */
export function isBlockActive(id) {
  const block = getBlockById(id) || resolveBlock(id);
  return block !== null && block.status === BLOCK_STATUS.ACTIVE;
}

/**
 * Ringkasan statistik Master Block.
 * @returns {Object}
 */
export function getBlockStatistics() {
  const totalBlocks = BLOCK_MASTER.length;
  const totalMatured = BLOCK_MASTER.reduce((acc, b) => acc + b.maturedArea, 0);
  const totalImmature = BLOCK_MASTER.reduce((acc, b) => acc + b.immatureArea, 0);
  const totalArea = Math.round((totalMatured + totalImmature) * 100) / 100;

  const estates = [...new Set(BLOCK_MASTER.map((b) => b.estateCode))];
  const divisions = [...new Set(BLOCK_MASTER.map((b) => b.divisionCode))];
  const clones = [...new Set(BLOCK_MASTER.map((b) => b.cloneName))];

  return {
    totalBlocks,
    totalArea,
    totalMatured: Math.round(totalMatured * 100) / 100,
    totalImmature: Math.round(totalImmature * 100) / 100,
    totalEstates: estates.length,
    totalDivisions: divisions.length,
    totalClones: clones.length
  };
}
