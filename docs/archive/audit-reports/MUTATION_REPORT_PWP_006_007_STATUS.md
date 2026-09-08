# MUTATION REPORT: PWP-006 & PWP-007 STATUS

## 1. Target Mutasi
Hanya `RN-PWP-006` dan `RN-PWP-007`.

## 2. Before / After Metadata Status
| Entity ID | Status Sebelum | isArchived Sebelum | Status Sesudah | isArchived Sesudah |
| :--- | :--- | :--- | :--- | :--- |
| **RN-PWP-006** | Deprecated | true | KONFIRMASI | true |
| **RN-PWP-007** | Deprecated | true | KONFIRMASI | true |

## 3. Post-Mutation Validation Check
- **Status KONFIRMASI**: Sukses (100% tersinkronisasi).
- **isArchived Verification**: Sukses (Kedua entitas terverifikasi tetap memegang *flag* `isArchived: true`).
- **Active / Isolation Constraint**: Sukses (Keduanya tidak mencuat ke daftar Active Requirement).
- **Role Constraint (KTU)**: Sukses (KTU tetap memiliki 0 active requirement, patuh pada Master Baseline).

## 4. Count Impact
| Metric | Sebelum Mutasi | Sesudah Mutasi | Delta |
| :--- | :--- | :--- | :--- |
| **Total Active Requirements** (Global) | 127 | 127 | **0** |
| **Total Archived Requirements** (Global) | 52 | 52 | **0** |
| **Active KTU Requirements** | 0 | 0 | **0** |

## 5. Isolation Check
- `RN-PRS-*` dan Requirement M01 lainnya: **UNTOUCHED**.
- Mobile Prototype Data: **UNTOUCHED**.
- Flow Nodes / Edges (Global): **UNTOUCHED**.
- Business Rules: **UNTOUCHED**.

## 6. Changed Entity Count
**2 entitas**. Sesuai instruksi dan target batas.

## 7. Final Status
**PASS**
