# EVIDENCE BASELINE CLEANUP RESULT

## 1. Backup Information
- Backup Path: `js/data/process-mapping-baseline.js.backup-before-evidence-cleanup`
- Timestamp: 2026-09-07T17:15:48.906Z
- Size: 272828 bytes
- Hash: `43bad35ff98032376af555c9c3d35555bd5d3e52bca222884275eb4a332b7f10`

## 2. Before Dataset Metrics
- Active Requirements: 149
- Flow Required: 139
- Flow Covered: 108
- True Gap: 31

## 3. Changed Requirement IDs
- RN-OKL-004
- RN-OKL-009
- RN-OKL-014
- RN-RCV-KSP019
- RN-RCV-ME025
- RN-CHK-RG042
- RN-ENT-TOP045
- RN-ENT-TOP046
- RN-ENT-TOP047
- RN-ENT-TOP048
- RN-ENT-TOP049
- RN-MAT-MMG053
- RN-MAT-MMG055
- RN-MAT-MMG056
- RN-MAT-MMG058

## 4. Field-Level Changes
- **14 KONFIRMASI:** `status` -> "Open Point", `isArchived` -> true, `baselineStatus` -> "Unverified"
- **1 REVISI (RN-OKL-014):** `status` -> "Revisi", `requirement` -> "Belum didefinisikan pada baseline.", `baselineStatus` -> "Revisi"

## 5. Unauthorized Mutation Check
- Expected Changed IDs: 15
- Actual Changed IDs: 15
- Unexpected Changed IDs: 0
- Status: PASSED

## 6. After Dataset Metrics
- Total Unique Req: 179
- Active Requirements: 135
- Flow Required: 125
- Flow Covered: 108
- True Gap: 17

## 7. Gap Analysis Before/After
- **True Gap Berkurang:** Dari 31 menjadi 17.
- 14 Requirement KONFIRMASI berhasil dikeluarkan dari kalkulasi Gap karena diset sebagai `isArchived: true`.
- `RN-OKL-014` tetap terdeteksi sebagai Gap (1 Gap) namun dengan status Revisi.

## 8. RTM Before/After
- **Active RTM:** Berkurang dari 149 menjadi 135 requirements definitif.
- 14 Open Point tersedia di filter history/archived.

## 9. Baseline Integrity
- KTU Active: 0
- Tekniker I Active: 0
- Transplanting Active: 0
- RN-OKL-014: Status "Revisi"

## 10. Mobile Integrity
- Untouched. No mutations outside dataset.

## 11. Rollback Availability
- File backup aman dan utuh. Rollback dapat dilakukan via script atau git reset jika diperlukan di kemudian hari.

## 12. Final Verdict
**PASS**
