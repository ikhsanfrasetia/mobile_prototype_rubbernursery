/**
 * scripts/test-task-standardized-date-filters.js
 * Comprehensive integration test verifying the standardization of:
 * - Date Filter Modal
 * - Calendar Header Button
 * - Date Status Banner
 * - Default Today filter for daily transactions across modules
 */

import {
  normalizeDateStr,
  ddmmyyyyToIso,
  getYesterdayDDMMYYYY,
  renderCalendarHeaderButton,
  renderDateFilterBannerHtml,
  renderDatePickerModalHtml
} from '../js/components/date-filter-modal.js';
import { todayDDMMYYYY } from '../js/core/utils.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('=== RUNNING STANDARDIZED DATE FILTER INTEGRATION TESTS ===\n');

// 1. Date utilities tests
console.log('Test Suite 1: Date Filter Utilities');
const today = todayDDMMYYYY();
const yesterday = getYesterdayDDMMYYYY();

assert(normalizeDateStr('05/10/2026') === '05/10/2026', 'Normalizes DD/MM/YYYY');
assert(normalizeDateStr('2026-10-05') === '05/10/2026', 'Normalizes ISO YYYY-MM-DD');
assert(normalizeDateStr('2026-10-05T08:30:00Z') === '05/10/2026', 'Normalizes ISO timestamp');
assert(ddmmyyyyToIso('05/10/2026') === '2026-10-05', 'Converts DD/MM/YYYY to ISO');
assert(yesterday !== today, 'Yesterday is different from today');

// 2. Component Renderers
console.log('\nTest Suite 2: Component Renderers');
const headerBtnToday = renderCalendarHeaderButton('btn-test-cal', today);
assert(headerBtnToday.includes('id="btn-test-cal"'), 'Header button has correct ID');
assert(!headerBtnToday.includes('border-radius: 50%'), 'Header button today has no active dot');

const headerBtnPast = renderCalendarHeaderButton('btn-test-cal', yesterday);
assert(headerBtnPast.includes('position: absolute'), 'Header button for past date renders active indicator dot');

const bannerToday = renderDateFilterBannerHtml(today, 'btn-reset');
assert(bannerToday === '', 'Banner returns empty string for today');

const bannerPast = renderDateFilterBannerHtml(yesterday, 'btn-reset');
assert(bannerPast.includes('Menampilkan Data:'), 'Banner renders date label for past date');
assert(bannerPast.includes('id="btn-reset"'), 'Banner renders reset button with specified ID');

const modalHtml = renderDatePickerModalHtml(today);
assert(modalHtml.includes('id="modal-date-picker-overlay"'), 'Modal contains overlay');
assert(modalHtml.includes('id="dialog-date-picker"'), 'Modal contains dialog');
assert(modalHtml.includes('id="btn-quick-today"'), 'Modal contains Hari Ini quick button');
assert(modalHtml.includes('id="btn-quick-yesterday"'), 'Modal contains Kemarin quick button');
assert(modalHtml.includes('id="input-filter-date"'), 'Modal contains filter date input');

// 3. Module Exports Verification
console.log('\nTest Suite 3: Module Exports Verification');
async function testModuleExports() {
  try {
    // Receipt
    const receiptModule = await import('../js/modules/receipt/receipt-landing.js');
    assert(typeof receiptModule.setSelectedReceiptDate === 'function', 'receipt-landing exports setSelectedReceiptDate');
    assert(typeof receiptModule.getSelectedReceiptDate === 'function', 'receipt-landing exports getSelectedReceiptDate');
    receiptModule.setSelectedReceiptDate(yesterday);
    assert(receiptModule.getSelectedReceiptDate() === yesterday, 'receipt-landing correctly stores selected date');
    receiptModule.setSelectedReceiptDate(today);

    // Nursery Activity
    const activityModule = await import('../js/modules/maintenance/nursery-activity.js');
    assert(typeof activityModule.setSelectedActivityDate === 'function', 'nursery-activity exports setSelectedActivityDate');
    assert(typeof activityModule.getSelectedActivityDate === 'function', 'nursery-activity exports getSelectedActivityDate');
    activityModule.setSelectedActivityDate(yesterday);
    assert(activityModule.getSelectedActivityDate() === yesterday, 'nursery-activity correctly stores selected date');
    activityModule.setSelectedActivityDate(today);

    // Seeding
    const seedingModule = await import('../js/modules/seeding/seeding-landing.js');
    assert(typeof seedingModule.setSelectedSeedingDate === 'function', 'seeding-landing exports setSelectedSeedingDate');
    assert(typeof seedingModule.getSelectedSeedingDate === 'function', 'seeding-landing exports getSelectedSeedingDate');
    seedingModule.setSelectedSeedingDate(yesterday);
    assert(seedingModule.getSelectedSeedingDate() === yesterday, 'seeding-landing correctly stores selected date');
    seedingModule.setSelectedSeedingDate(today);

    // Budding Grafting
    const graftingModule = await import('../js/modules/budding/budding-grafting.js');
    assert(typeof graftingModule.setSelectedGraftingDate === 'function', 'budding-grafting exports setSelectedGraftingDate');
    assert(typeof graftingModule.getSelectedGraftingDate === 'function', 'budding-grafting exports getSelectedGraftingDate');
    graftingModule.setSelectedGraftingDate(yesterday);
    assert(graftingModule.getSelectedGraftingDate() === yesterday, 'budding-grafting correctly stores selected date');
    graftingModule.setSelectedGraftingDate(today);

    // Budding Regrafting
    const regraftingModule = await import('../js/modules/budding/budding-regrafting.js');
    assert(typeof regraftingModule.setSelectedRegraftingDate === 'function', 'budding-regrafting exports setSelectedRegraftingDate');
    assert(typeof regraftingModule.getSelectedRegraftingDate === 'function', 'budding-regrafting exports getSelectedRegraftingDate');
    regraftingModule.setSelectedRegraftingDate(yesterday);
    assert(regraftingModule.getSelectedRegraftingDate() === yesterday, 'budding-regrafting correctly stores selected date');
    regraftingModule.setSelectedRegraftingDate(today);

    // Inspection
    const inspectionModule = await import('../js/modules/inspection/inspection-landing.js');
    assert(typeof inspectionModule.setSelectedInspectionDate === 'function', 'inspection-landing exports setSelectedInspectionDate');
    assert(typeof inspectionModule.getSelectedInspectionDate === 'function', 'inspection-landing exports getSelectedInspectionDate');
    inspectionModule.setSelectedInspectionDate(yesterday);
    assert(inspectionModule.getSelectedInspectionDate() === yesterday, 'inspection-landing correctly stores selected date');
    inspectionModule.setSelectedInspectionDate(today);

    // Selection
    const selectionModule = await import('../js/modules/selection/selection-landing.js');
    assert(typeof selectionModule.setSelectedSelectionDate === 'function', 'selection-landing exports setSelectedSelectionDate');
    assert(typeof selectionModule.getSelectedSelectionDate === 'function', 'selection-landing exports getSelectedSelectionDate');
    selectionModule.setSelectedSelectionDate(yesterday);
    assert(selectionModule.getSelectedSelectionDate() === yesterday, 'selection-landing correctly stores selected date');
    selectionModule.setSelectedSelectionDate(today);

  } catch (err) {
    console.error('Module export test error:', err);
    assert(false, `Module imports succeeded without errors: ${err.message}`);
  }

  console.log(`\n=== RESULTS: ${passedTests}/${totalTests} TESTS PASSED ===\n`);
  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

testModuleExports();
