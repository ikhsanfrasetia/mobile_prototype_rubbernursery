/**
 * data/klon-master.js — Master Data Klon Terpusat.
 * Sumber Data Resmi: data/budwood-plot-klon.csv (57 clone_name unik resmi).
 *
 * Prinsip:
 * "SAFETY FIRST."
 * "SINGLE SOURCE OF TRUTH."
 * "DATASET PENGGUNA ADALAH SUMBER AKTUAL."
 * "BACKWARD COMPATIBILITY LAYER."
 * "ADD, DO NOT BREAK."
 */

/**
 * Status siklus hidup Klon
 */
export const KLON_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING_REVIEW: 'PENDING_REVIEW'
});

/**
 * Kategori penggunaan Klon (Rootstock / Entres / Both / General / Unclassified)
 */
export const KLON_USAGE = Object.freeze({
  ROOTSTOCK: 'ROOTSTOCK',
  ENTRES: 'ENTRES',
  BOTH: 'BOTH',
  GENERAL: 'GENERAL',
  UNCLASSIFIED: 'UNCLASSIFIED'
});

/**
 * Kategori klasifikasi Klon
 */
export const KLON_CATEGORY = Object.freeze({
  UNCLASSIFIED: 'UNCLASSIFIED',
  STANDARD: 'STANDARD',
  EXPERIMENTAL: 'EXPERIMENTAL'
});

/**
 * Dataset Master Klon Terpusat (57 Record Klon Resmi dari data/budwood-plot-klon.csv)
 */
export const KLON_MASTER = Object.freeze([
  // 1. BPM Series
  {
    id: 'KLON-BPM-1',
    code: 'BPM1',
    canonicalName: 'BPM 1',
    shortName: 'BPM 1',
    aliases: Object.freeze(['BPM 1', 'BPM1', 'BPM-1', 'BPM-01']),
    normalizedKey: 'BPM1',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES, KLON_USAGE.GENERAL]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Katalog Klon Budwood Plot XXIIB'
  },
  {
    id: 'KLON-BPM-24',
    code: 'BPM24',
    canonicalName: 'BPM 24',
    shortName: 'BPM 24',
    aliases: Object.freeze(['BPM 24', 'BPM24', 'BPM-24']),
    normalizedKey: 'BPM24',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ROOTSTOCK, KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Katalog Klon Budwood Plot XXIIIB'
  },

  // 2. GT Series
  {
    id: 'KLON-GT-1',
    code: 'GT1',
    canonicalName: 'GT 1',
    shortName: 'GT 1',
    aliases: Object.freeze(['GT 1', 'GT1', 'GT-01', 'GT-1', 'GT 01']),
    normalizedKey: 'GT1',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ROOTSTOCK, KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Klon standar batang bawah dan entres Plot XXIVB & XXXXXXXVIIIB'
  },

  // 3. GYT / CYT Series
  {
    id: 'KLON-GYT-577',
    code: 'GYT577',
    canonicalName: 'GYT 577',
    shortName: 'GYT 577',
    aliases: Object.freeze(['GYT 577', 'GYT577', 'GYT-577', 'CYT 577', 'CYT577', 'CYT-577']),
    normalizedKey: 'GYT577',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES, KLON_USAGE.GENERAL]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Katalog Klon Budwood Plot XXVB'
  },

  // 4. IRCA Series
  {
    id: 'KLON-IRCA-1007',
    code: 'IRCA1007',
    canonicalName: 'IRCA 1007',
    shortName: 'IRCA 1007',
    aliases: Object.freeze(['IRCA 1007', 'IRCA1007', 'IRCA-1007']),
    normalizedKey: 'IRCA1007',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XVB & XXXXXXIXB'
  },
  {
    id: 'KLON-IRCA-101',
    code: 'IRCA101',
    canonicalName: 'IRCA 101',
    shortName: 'IRCA 101',
    aliases: Object.freeze(['IRCA 101', 'IRCA101', 'IRCA-101']),
    normalizedKey: 'IRCA101',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXIIIB'
  },
  {
    id: 'KLON-IRCA-109',
    code: 'IRCA109',
    canonicalName: 'IRCA 109',
    shortName: 'IRCA 109',
    aliases: Object.freeze(['IRCA 109', 'IRCA109', 'IRCA-109']),
    normalizedKey: 'IRCA109',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XIA'
  },
  {
    id: 'KLON-IRCA-111',
    code: 'IRCA111',
    canonicalName: 'IRCA 111',
    shortName: 'IRCA 111',
    aliases: Object.freeze(['IRCA 111', 'IRCA111', 'IRCA-111']),
    normalizedKey: 'IRCA111',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXIIB'
  },
  {
    id: 'KLON-IRCA-130',
    code: 'IRCA130',
    canonicalName: 'IRCA 130',
    shortName: 'IRCA 130',
    aliases: Object.freeze(['IRCA 130', 'IRCA130', 'IRCA-130']),
    normalizedKey: 'IRCA130',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXIB'
  },
  {
    id: 'KLON-IRCA-18',
    code: 'IRCA18',
    canonicalName: 'IRCA 18',
    shortName: 'IRCA 18',
    aliases: Object.freeze(['IRCA 18', 'IRCA18', 'IRCA-18']),
    normalizedKey: 'IRCA18',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXVIB'
  },
  {
    id: 'KLON-IRCA-19',
    code: 'IRCA19',
    canonicalName: 'IRCA 19',
    shortName: 'IRCA 19',
    aliases: Object.freeze(['IRCA 19', 'IRCA19', 'IRCA-19']),
    normalizedKey: 'IRCA19',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot IXB, VIIIA, XXXVB'
  },
  {
    id: 'KLON-IRCA-230',
    code: 'IRCA230',
    canonicalName: 'IRCA 230',
    shortName: 'IRCA 230',
    aliases: Object.freeze(['IRCA 230', 'IRCA230', 'IRCA-230']),
    normalizedKey: 'IRCA230',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXB'
  },
  {
    id: 'KLON-IRCA-317',
    code: 'IRCA317',
    canonicalName: 'IRCA 317',
    shortName: 'IRCA 317',
    aliases: Object.freeze(['IRCA 317', 'IRCA317', 'IRCA-317']),
    normalizedKey: 'IRCA317',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot VA, XVIA, XXIXB'
  },
  {
    id: 'KLON-IRCA-331',
    code: 'IRCA331',
    canonicalName: 'IRCA 331',
    shortName: 'IRCA 331',
    aliases: Object.freeze(['IRCA 331', 'IRCA331', 'IRCA-331']),
    normalizedKey: 'IRCA331',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot IA, IB, VIB, XXVIIIB'
  },
  {
    id: 'KLON-IRCA-41',
    code: 'IRCA41',
    canonicalName: 'IRCA 41',
    shortName: 'IRCA 41',
    aliases: Object.freeze(['IRCA 41', 'IRCA41', 'IRCA-41']),
    normalizedKey: 'IRCA41',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot IIA, IIIB, XXVA, XXXIVB'
  },
  {
    id: 'KLON-IRCA-427',
    code: 'IRCA427',
    canonicalName: 'IRCA 427',
    shortName: 'IRCA 427',
    aliases: Object.freeze(['IRCA 427', 'IRCA427', 'IRCA-427']),
    normalizedKey: 'IRCA427',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXVIIB'
  },
  {
    id: 'KLON-IRCA-733',
    code: 'IRCA733',
    canonicalName: 'IRCA 733',
    shortName: 'IRCA 733',
    aliases: Object.freeze(['IRCA 733', 'IRCA733', 'IRCA-733']),
    normalizedKey: 'IRCA733',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XIXA, XVIIIB, XXXXXXVIB'
  },
  {
    id: 'KLON-IRCA-804',
    code: 'IRCA804',
    canonicalName: 'IRCA 804',
    shortName: 'IRCA 804',
    aliases: Object.freeze(['IRCA 804', 'IRCA804', 'IRCA-804']),
    normalizedKey: 'IRCA804',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXVIB'
  },
  {
    id: 'KLON-IRCA-807',
    code: 'IRCA807',
    canonicalName: 'IRCA 807',
    shortName: 'IRCA 807',
    aliases: Object.freeze(['IRCA 807', 'IRCA807', 'IRCA-807']),
    normalizedKey: 'IRCA807',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XVIIB, XXXXXXVIIB'
  },
  {
    id: 'KLON-IRCA-825',
    code: 'IRCA825',
    canonicalName: 'IRCA 825',
    shortName: 'IRCA 825',
    aliases: Object.freeze(['IRCA 825', 'IRCA825', 'IRCA-825']),
    normalizedKey: 'IRCA825',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XVIIA'
  },
  {
    id: 'KLON-IRCA-986',
    code: 'IRCA986',
    canonicalName: 'IRCA 986',
    shortName: 'IRCA 986',
    aliases: Object.freeze(['IRCA 986', 'IRCA986', 'IRCA-986']),
    normalizedKey: 'IRCA986',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XVIB, XXXXXXVIIIB, XXXXXXXIB'
  },

  // 5. IRR Series
  {
    id: 'KLON-IRR-104',
    code: 'IRR104',
    canonicalName: 'IRR 104',
    shortName: 'IRR 104',
    aliases: Object.freeze(['IRR 104', 'IRR104', 'IRR-104']),
    normalizedKey: 'IRR104',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXXXXB'
  },
  {
    id: 'KLON-IRR-112',
    code: 'IRR112',
    canonicalName: 'IRR 112',
    shortName: 'IRR 112',
    aliases: Object.freeze(['IRR 112', 'IRR112', 'IRR-112']),
    normalizedKey: 'IRR112',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot IIB, XXXXXIVB'
  },
  {
    id: 'KLON-IRR-118',
    code: 'IRR118',
    canonicalName: 'IRR 118',
    shortName: 'IRR 118',
    aliases: Object.freeze(['IRR 118', 'IRR118', 'IRR-118']),
    normalizedKey: 'IRR118',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXXXVB'
  },
  {
    id: 'KLON-IRR-205',
    code: 'IRR205',
    canonicalName: 'IRR 205',
    shortName: 'IRR 205',
    aliases: Object.freeze(['IRR 205', 'IRR205', 'IRR-205']),
    normalizedKey: 'IRR205',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXXXXIIB'
  },
  {
    id: 'KLON-IRR-206',
    code: 'IRR206',
    canonicalName: 'IRR 206',
    shortName: 'IRR 206',
    aliases: Object.freeze(['IRR 206', 'IRR206', 'IRR-206']),
    normalizedKey: 'IRR206',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXXXXIIIB'
  },
  {
    id: 'KLON-IRR-207',
    code: 'IRR207',
    canonicalName: 'IRR 207',
    shortName: 'IRR 207',
    aliases: Object.freeze(['IRR 207', 'IRR207', 'IRR-207']),
    normalizedKey: 'IRR207',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXXXXIVB'
  },
  {
    id: 'KLON-IRR-208',
    code: 'IRR208',
    canonicalName: 'IRR 208',
    shortName: 'IRR 208',
    aliases: Object.freeze(['IRR 208', 'IRR208', 'IRR-208']),
    normalizedKey: 'IRR208',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXXXXVB'
  },
  {
    id: 'KLON-IRR-220',
    code: 'IRR220',
    canonicalName: 'IRR 220',
    shortName: 'IRR 220',
    aliases: Object.freeze(['IRR 220', 'IRR220', 'IRR-220']),
    normalizedKey: 'IRR220',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXB'
  },
  {
    id: 'KLON-IRR-221',
    code: 'IRR221',
    canonicalName: 'IRR 221',
    shortName: 'IRR 221',
    aliases: Object.freeze(['IRR 221', 'IRR221', 'IRR-221']),
    normalizedKey: 'IRR221',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XIXB'
  },
  {
    id: 'KLON-IRR-230',
    code: 'IRR230',
    canonicalName: 'IRR 230',
    shortName: 'IRR 230',
    aliases: Object.freeze(['IRR 230', 'IRR230', 'IRR-230']),
    normalizedKey: 'IRR230',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXXXXIB'
  },
  {
    id: 'KLON-IRR-425',
    code: 'IRR425',
    canonicalName: 'IRR 425',
    shortName: 'IRR 425',
    aliases: Object.freeze(['IRR 425', 'IRR425', 'IRR-425']),
    normalizedKey: 'IRR425',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXXXVIIIB'
  },
  {
    id: 'KLON-IRR-428',
    code: 'IRR428',
    canonicalName: 'IRR 428',
    shortName: 'IRR 428',
    aliases: Object.freeze(['IRR 428', 'IRR428', 'IRR-428']),
    normalizedKey: 'IRR428',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXXXIIIB'
  },
  {
    id: 'KLON-IRR-429',
    code: 'IRR429',
    canonicalName: 'IRR 429',
    shortName: 'IRR 429',
    aliases: Object.freeze(['IRR 429', 'IRR429', 'IRR-429']),
    normalizedKey: 'IRR429',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXXXVIB'
  },
  {
    id: 'KLON-IRR-434',
    code: 'IRR434',
    canonicalName: 'IRR 434',
    shortName: 'IRR 434',
    aliases: Object.freeze(['IRR 434', 'IRR434', 'IRR-434']),
    normalizedKey: 'IRR434',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXXXIXB'
  },
  {
    id: 'KLON-IRR-440',
    code: 'IRR440',
    canonicalName: 'IRR 440',
    shortName: 'IRR 440',
    aliases: Object.freeze(['IRR 440', 'IRR440', 'IRR-440']),
    normalizedKey: 'IRR440',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXXXVIIB'
  },
  {
    id: 'KLON-IRR-5',
    code: 'IRR5',
    canonicalName: 'IRR 5',
    shortName: 'IRR 5',
    aliases: Object.freeze(['IRR 5', 'IRR5', 'IRR-5', 'IRR-05']),
    normalizedKey: 'IRR5',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXXXIIB'
  },

  // 6. LBT Series
  {
    id: 'KLON-LBT-94',
    code: 'LBT94',
    canonicalName: 'LBT 94',
    shortName: 'LBT 94',
    aliases: Object.freeze(['LBT 94', 'LBT94', 'LBT-94']),
    normalizedKey: 'LBT94',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XA'
  },

  // 7. PB Series
  {
    id: 'KLON-PB-217',
    code: 'PB217',
    canonicalName: 'PB 217',
    shortName: 'PB 217',
    aliases: Object.freeze(['PB 217', 'PB217', 'PB-217']),
    normalizedKey: 'PB217',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot IIIA, IVA, IVB, VB, XIVA, XVA, XXXXIIB'
  },
  {
    id: 'KLON-PB-235',
    code: 'PB235',
    canonicalName: 'PB 235',
    shortName: 'PB 235',
    aliases: Object.freeze(['PB 235', 'PB235', 'PB-235']),
    normalizedKey: 'PB235',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ROOTSTOCK, KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot VIIA, VIIIB'
  },
  {
    id: 'KLON-PB-254',
    code: 'PB254',
    canonicalName: 'PB 254',
    shortName: 'PB 254',
    aliases: Object.freeze(['PB 254', 'PB254', 'PB-254']),
    normalizedKey: 'PB254',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot IXA, XB, XXXXIB'
  },
  {
    id: 'KLON-PB-260',
    code: 'PB260',
    canonicalName: 'PB 260',
    shortName: 'PB 260',
    aliases: Object.freeze(['PB 260', 'PB260', 'PB-260']),
    normalizedKey: 'PB260',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ROOTSTOCK, KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot VIA, VIIB, XVIIIA, XXXIXB'
  },
  {
    id: 'KLON-PB-330',
    code: 'PB330',
    canonicalName: 'PB 330',
    shortName: 'PB 330',
    aliases: Object.freeze(['PB 330', 'PB330', 'PB-330']),
    normalizedKey: 'PB330',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ROOTSTOCK, KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XIIB, XXIA, XXIIA, XXIIIA, XXIVA, XXXVIIIB'
  },
  {
    id: 'KLON-PB-340',
    code: 'PB340',
    canonicalName: 'PB 340',
    shortName: 'PB 340',
    aliases: Object.freeze(['PB 340', 'PB340', 'PB-340']),
    normalizedKey: 'PB340',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXXB'
  },

  // 8. PC / PM Series
  {
    id: 'KLON-PC-10',
    code: 'PC10',
    canonicalName: 'PC 10',
    shortName: 'PC 10',
    aliases: Object.freeze(['PC 10', 'PC10', 'PC-10']),
    normalizedKey: 'PC10',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXXIVB'
  },
  {
    id: 'KLON-PM-10',
    code: 'PM10',
    canonicalName: 'PM 10',
    shortName: 'PM 10',
    aliases: Object.freeze(['PM 10', 'PM10', 'PM-10']),
    normalizedKey: 'PM10',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXVIIB'
  },

  // 9. PR Series
  {
    id: 'KLON-PR-107',
    code: 'PR107',
    canonicalName: 'PR 107',
    shortName: 'PR 107',
    aliases: Object.freeze(['PR 107', 'PR107', 'PR-107']),
    normalizedKey: 'PR107',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XIIIA, XIVB, XXXXXXXB'
  },
  {
    id: 'KLON-PR-300',
    code: 'PR300',
    canonicalName: 'PR 300',
    shortName: 'PR 300',
    aliases: Object.freeze(['PR 300', 'PR300', 'PR-300']),
    normalizedKey: 'PR300',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXXIIIB'
  },

  // 10. RRIC Series
  {
    id: 'KLON-RRIC-100',
    code: 'RRIC100',
    canonicalName: 'RRIC 100',
    shortName: 'RRIC 100',
    aliases: Object.freeze(['RRIC 100', 'RRIC100', 'RRIC-100']),
    normalizedKey: 'RRIC100',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXIB'
  },

  // 11. RRIM Series
  {
    id: 'KLON-RRIM-2020',
    code: 'RRIM2020',
    canonicalName: 'RRIM 2020',
    shortName: 'RRIM 2020',
    aliases: Object.freeze(['RRIM 2020', 'RRIM2020', 'RRIM-2020']),
    normalizedKey: 'RRIM2020',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXXXIB'
  },
  {
    id: 'KLON-RRIM-600',
    code: 'RRIM600',
    canonicalName: 'RRIM 600',
    shortName: 'RRIM 600',
    aliases: Object.freeze(['RRIM 600', 'RRIM600', 'RRIM-600']),
    normalizedKey: 'RRIM600',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ROOTSTOCK, KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXA, XXXXVB'
  },
  {
    id: 'KLON-RRIM-703',
    code: 'RRIM703',
    canonicalName: 'RRIM703',
    shortName: 'RRIM 703',
    aliases: Object.freeze(['RRIM 703', 'RRIM703', 'RRIM-703']),
    normalizedKey: 'RRIM703',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XIIA, XIIIB, XXXXXXXIIB'
  },
  {
    id: 'KLON-RRIM-712',
    code: 'RRIM712',
    canonicalName: 'RRIM 712',
    shortName: 'RRIM 712',
    aliases: Object.freeze(['RRIM 712', 'RRIM712', 'RRIM-712']),
    normalizedKey: 'RRIM712',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXXVIIB'
  },
  {
    id: 'KLON-RRIM-901',
    code: 'RRIM901',
    canonicalName: 'RRIM 901',
    shortName: 'RRIM 901',
    aliases: Object.freeze(['RRIM 901', 'RRIM901', 'RRIM-901']),
    normalizedKey: 'RRIM901',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXXVIB'
  },
  {
    id: 'KLON-RRIM-908',
    code: 'RRIM908',
    canonicalName: 'RRIM 908',
    shortName: 'RRIM 908',
    aliases: Object.freeze(['RRIM 908', 'RRIM908', 'RRIM-908']),
    normalizedKey: 'RRIM908',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXVIIIB'
  },
  {
    id: 'KLON-RRIM-911',
    code: 'RRIM911',
    canonicalName: 'RRIM 911',
    shortName: 'RRIM 911',
    aliases: Object.freeze(['RRIM 911', 'RRIM911', 'RRIM-911']),
    normalizedKey: 'RRIM911',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXXIXB'
  },
  {
    id: 'KLON-RRIM-921',
    code: 'RRIM921',
    canonicalName: 'RRIM 921',
    shortName: 'RRIM 921',
    aliases: Object.freeze(['RRIM 921', 'RRIM921', 'RRIM-921']),
    normalizedKey: 'RRIM921',
    category: KLON_CATEGORY.STANDARD,
    usage: Object.freeze([KLON_USAGE.ENTRES]),
    status: KLON_STATUS.ACTIVE,
    source: 'data/budwood-plot-klon.csv',
    notes: 'Plot XXXXXB'
  }
]);

// =========================================================================
// NORMALIZATION & LOOKUP HELPERS
// =========================================================================

/**
 * Normalisasi internal string kunci klon (uppercase, hapus spasi, tanda hubung, underscore, dan leading zeros).
 * Contoh: 'PB 260' -> 'PB260', 'GT-01' -> 'GT1', 'RRIM-600' -> 'RRIM600'
 *
 * @param {string} value
 * @returns {string}
 */
export function buildNormalizedKey(value) {
  if (!value || typeof value !== 'string') return '';
  let clean = value.toUpperCase().trim().replace(/[\s\-_]/g, '');
  clean = clean.replace(/^([A-Z]+)0+([1-9][0-9]*)$/, '$1$2');
  return clean;
}

/**
 * Mengambil seluruh data master Klon (57 Record Resmi).
 * @returns {Array<Object>}
 */
export function getAllKlons() {
  return [...KLON_MASTER];
}

/**
 * Mengambil seluruh data master Klon yang aktif.
 * @returns {Array<Object>}
 */
export function getActiveKlons() {
  return KLON_MASTER.filter((k) => k.status === KLON_STATUS.ACTIVE);
}

/**
 * Mengambil record Klon berdasarkan ID (mis. 'KLON-PB-260').
 * @param {string} id
 * @returns {Object|null}
 */
export function getKlonById(id) {
  if (!id) return null;
  const cleanId = String(id).trim().toUpperCase();
  return KLON_MASTER.find((k) => k.id.toUpperCase() === cleanId) || null;
}

/**
 * Mengambil record Klon berdasarkan kode (mis. 'PB260', 'GT1').
 * @param {string} code
 * @returns {Object|null}
 */
export function getKlonByCode(code) {
  if (!code) return null;
  const key = buildNormalizedKey(code);
  return KLON_MASTER.find((k) => k.normalizedKey === key || k.code.toUpperCase() === key) || null;
}

/**
 * Mengambil record Klon berdasarkan nama kanonikal atau shortName.
 * @param {string} name
 * @returns {Object|null}
 */
export function getKlonByName(name) {
  if (!name) return null;
  const cleanName = String(name).trim().toLowerCase();
  return (
    KLON_MASTER.find(
      (k) =>
        k.canonicalName.toLowerCase() === cleanName ||
        k.shortName.toLowerCase() === cleanName ||
        k.code.toLowerCase() === cleanName
    ) || null
  );
}

/**
 * Resolusi cerdas dari sembarang input (ID, code, nama, alias, condensed, hyphenated)
 * ke objek Klon kanonikal resmi.
 *
 * @param {string} value
 * @returns {Object|null} Objek Klon resmi atau null jika tidak dikenal
 */
export function resolveKlon(value) {
  if (!value || typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;

  // 1. Coba pencocokan ID langsung
  const byId = getKlonById(raw);
  if (byId) return byId;

  // 2. Coba pencocokan nama kanonikal / shortName langsung
  const byName = getKlonByName(raw);
  if (byName) return byName;

  // 3. Coba pencocokan normalized key
  const normKey = buildNormalizedKey(raw);
  if (!normKey) return null;

  const byNormKey = KLON_MASTER.find((k) => k.normalizedKey === normKey);
  if (byNormKey) return byNormKey;

  // 4. Coba pencocokan alias terdaftar
  const byAlias = KLON_MASTER.find((k) =>
    k.aliases.some((alias) => buildNormalizedKey(alias) === normKey || alias.toLowerCase() === raw.toLowerCase())
  );
  if (byAlias) return byAlias;

  return null;
}

/**
 * Mengembalikan nama kanonikal resmi dari suatu input variasi nama klon.
 * Jika tidak ditemukan di master data, mengembalikan input asli yang telah di-trim (non-destructive).
 *
 * @param {string} value
 * @returns {string}
 */
export function normalizeKlonName(value) {
  if (!value || typeof value !== 'string') return '';
  const resolved = resolveKlon(value);
  if (resolved) {
    return resolved.canonicalName;
  }
  return value.trim();
}

/**
 * Mengambil seluruh alias yang terdaftar untuk Klon tertentu berdasarkan ID.
 * @param {string} id
 * @returns {Array<string>}
 */
export function getKlonAliases(id) {
  const klon = getKlonById(id);
  return klon && klon.aliases ? [...klon.aliases] : [];
}

/**
 * Memeriksa apakah suatu ID Klon berstatus ACTIVE.
 * @param {string} id
 * @returns {boolean}
 */
export function isKlonActive(id) {
  const klon = getKlonById(id);
  return klon !== null && klon.status === KLON_STATUS.ACTIVE;
}

/**
 * Memeriksa apakah suatu nilai input dikenal oleh Master Klon (baik sebagai ID, nama, kode, atau alias).
 * @param {string} value
 * @returns {boolean}
 */
export function isKnownKlon(value) {
  return resolveKlon(value) !== null;
}

/**
 * Mengambil daftar Klon berdasarkan kategori klasifikasi.
 * @param {string} category
 * @returns {Array<Object>}
 */
export function getKlonsByCategory(category) {
  if (!category) return [];
  const cleanCat = String(category).trim().toUpperCase();
  return KLON_MASTER.filter((k) => k.category === cleanCat);
}

/**
 * Mengambil daftar Klon berdasarkan peruntukan penggunaan (ROOTSTOCK, ENTRES, BOTH, GENERAL).
 * @param {string} usage
 * @returns {Array<Object>}
 */
export function getKlonsForUsage(usage) {
  if (!usage) return [];
  const cleanUsage = String(usage).trim().toUpperCase();
  return KLON_MASTER.filter((k) => {
    if (!k.usage) return false;
    return (
      k.usage.includes(cleanUsage) ||
      (cleanUsage === KLON_USAGE.ROOTSTOCK && k.usage.includes(KLON_USAGE.BOTH)) ||
      (cleanUsage === KLON_USAGE.ENTRES && k.usage.includes(KLON_USAGE.BOTH)) ||
      k.usage.includes(KLON_USAGE.GENERAL)
    );
  });
}
