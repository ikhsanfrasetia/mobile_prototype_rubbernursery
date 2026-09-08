# ARCHIVE REPORT: M05 RG (PEMERIKSAAN REGRAFTING)

## 1. Target Archive
Kelompok 9 *Requirement* khusus `RN-CHK-RG036` s.d. `RN-CHK-RG044`.

## 2. Before / After Status
| Entity ID | Status Sebelum | isArchived Sebelum | Status Sesudah | isArchived Sesudah |
| :--- | :--- | :--- | :--- | :--- |
| **RN-CHK-RG036** | Confirmed | false | Archived | true |
| **RN-CHK-RG037** | Confirmed | false | Archived | true |
| **RN-CHK-RG038** | Confirmed | false | Archived | true |
| **RN-CHK-RG039** | Confirmed | false | Archived | true |
| **RN-CHK-RG040** | Confirmed | false | Archived | true |
| **RN-CHK-RG041** | Confirmed | false | Archived | true |
| **RN-CHK-RG042** | Open Point | true | Archived | true |
| **RN-CHK-RG043** | Confirmed | false | Archived | true |
| **RN-CHK-RG044** | Confirmed | false | Archived | true |

## 3. Count Impact
| Metric | Sebelum | Sesudah | Delta |
| :--- | :--- | :--- | :--- |
| **Total Active Requirements** (Global) | 135 | 127 | **-9** |
| **Total Archived Requirements** (Global) | 44 | 52 | **+9** |
| **Deleted Entities (Physical)** | 0 | 0 | **0** (Utuh) |

## 4. Traceability Impact
- **Aman**. Tidak ada *active flow node* yang tertaut langsung secara *hardcode* dan menyebabkan anomali akibat pengarsipan requirement target.
Histori relasi RTM requirement target tetap dibiarkan tersimpan di basis data tanpa dihapus fisiknya.

## 5. Isolation Check
- `RN-CHK-001` s.d. `RN-CHK-009`: **UNTOUCHED** (Tidak berubah).
- Requirement M01 s.d. M04: **UNTOUCHED** (Tidak berubah).
- Flow Nodes / Edges (M05 & Global): **UNTOUCHED** (Tidak berubah).
- Mobile Prototype Data: **UNTOUCHED** (Tidak disentuh).
- Business Rules: **UNTOUCHED**.

## 6. Deleted Entity Count
**0 (Nihil)**. Sesuai instruksi, mode eksekusi murni bersandar pada *Non-destructive Archiving* (mengubah `isArchived` *flag* dan atribut `status`).

## 7. Final Status
**PASS**
