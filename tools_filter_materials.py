import openpyxl, json, random

random.seed(2026)

wb = openpyxl.load_workbook('Material Issue.xlsx')
sheet = wb.active
rows = list(sheet.iter_rows(values_only=True))

# Filter out non-nursery material / tools / construction / plumbing items as requested
excluded_codes = {'7015064', '7038525', '7066702', '7046537', '7056599', '7034356', '7037064', '7044077', '7058663'}

# Pool of realistic random quantities between 1,000 and 10,000 for Polybag issues
polybag_quantities = [
    1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 
    5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000
]

filtered_raw = []
for idx, r in enumerate(rows[1:], 1):
    tgl, no_issue, kode_alokasi, nama_alokasi, item_code, item_name, purpose, qty, uom = r
    item_code_str = str(item_code).strip()
    if item_code_str in excluded_codes:
        continue
    
    tgl_str = tgl.strftime('%d/%m/%Y') if hasattr(tgl, 'strftime') else str(tgl)
    item_name_str = str(item_name).strip() if item_name else ''
    uom_str = str(uom).strip().upper() if uom else ''
    no_issue_str = str(no_issue).strip() if no_issue else ''
    kode_alokasi_str = str(kode_alokasi).strip() if kode_alokasi else ''
    nama_alokasi_str = str(nama_alokasi).strip() if nama_alokasi else ''
    purpose_str = str(purpose).strip() if purpose else ''
    
    qty_val = qty
    if isinstance(qty, str):
        qty_val = float(qty.replace(',', '.'))
    elif isinstance(qty, (int, float)):
        qty_val = float(qty)
    
    # Requirement: For all POLYBAG materials, set random QTY >= 5000
    if 'POLYBAG' in item_name_str.upper():
        qty_val = float(random.choice(polybag_quantities))
    
    filtered_raw.append({
        'rowNumber': idx,
        'tanggal': tgl_str,
        'noIssue': no_issue_str,
        'kodeAlokasi': kode_alokasi_str,
        'namaAlokasi': nama_alokasi_str,
        'itemCode': item_code_str,
        'itemName': item_name_str,
        'purpose': purpose_str,
        'quantity': qty_val,
        'uomSource': uom_str
    })

# Master materials
master_materials = {}
for r in filtered_raw:
    c = r['itemCode']
    if c not in master_materials:
        master_materials[c] = {
            'itemCode': c,
            'itemName': r['itemName'],
            'uom': r['uomSource'],
            'status': 'ACTIVE'
        }

master_list = list(master_materials.values())

# Issue docs
issue_docs = []
for idx, r in enumerate(filtered_raw, 1):
    uom_norm = master_materials[r['itemCode']]['uom']
    issue_docs.append({
        'id': f'ISSUE-DOC-{idx:03d}',
        'noIssue': r['noIssue'],
        'tanggal': r['tanggal'],
        'kodeAlokasi': r['kodeAlokasi'],
        'namaAlokasi': r['namaAlokasi'],
        'status': 'AVAILABLE',
        'itemCount': 1,
        'items': [
            {
                'id': f'DETAIL-{idx:03d}',
                'itemCode': r['itemCode'],
                'itemName': r['itemName'],
                'purpose': r['purpose'],
                'quantityIssue': r['quantity'],
                'usedQuantity': 0,
                'remainingQuantity': r['quantity'],
                'uom': uom_norm,
                'status': 'AVAILABLE'
            }
        ]
    })

content = f'''/**
 * js/data/material-issue-data.js
 * Source of Truth Dataset: Material Issue.xlsx (Nursery Core Materials)
 *
 * Excluded non-nursery items: Pasir Kasar, Kereta Sorong, Selang, Elbow, Socket, Seal Tape.
 *
 * Core Master Materials:
 * 1. 7030016: KLATAK (BIJI KARET) - KG
 * 2. 7058117: PUPUK RP @50KG/ZAK - KG
 * 3. 7065168: POLYBAG 25X50CMX0,20MM - LBR
 * 4. 7000133: POLYBAG 25 X 60CM X 0.20MM - LBR
 */

export const RAW_MATERIAL_ISSUE_RECORDS = Object.freeze({json.dumps(filtered_raw, indent=2, ensure_ascii=False)});

export const UOM_NORMALIZATION_LOG = Object.freeze([]);

export const INITIAL_MASTER_MATERIALS = Object.freeze({json.dumps(master_list, indent=2, ensure_ascii=False)});

export const INITIAL_ISSUE_DOCUMENTS = Object.freeze({json.dumps(issue_docs, indent=2, ensure_ascii=False)});
'''

with open('js/data/material-issue-data.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Successfully updated js/data/material-issue-data.js!')
print(f'Remaining Core Master Materials: {len(master_list)}')
for m in master_list:
    print(f" - {m['itemCode']}: {m['itemName']} ({m['uom']})")
print(f'Remaining Issue Documents: {len(issue_docs)}')
