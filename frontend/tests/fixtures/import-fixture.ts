/**
 * Excel fixture generator for import E2E tests.
 *
 * Generates a valid .xlsx workbook matching the parser's expected format:
 * - "members" sheet: name, code, start, end, skills, contract, desired, duty/month, leave
 * - "shifts" sheet: name, code, duty, mandatory_rest, start, end, staffing
 * - "schedule" sheet: Row 1 = "Worker" + date headers; data rows = worker name + shift codes
 *
 * The generated data matches what ImportMergeTestBase.setup() creates:
 * - Alice → matches existing "Alice Worker" (by name)
 * - Bob → new worker
 * - Charlie → new worker (used for skip-cascade tests)
 * - Morning shift (MS) → matches existing "Morning Shift" (by acronym)
 * - Night shift (NS) → new shift
 */

import * as XLSX from 'xlsx';

const SHEET_MEMBERS = 'members';
const SHEET_SHIFTS = 'shifts';
const SHEET_SCHEDULE = 'schedule';

// ── Public helpers ───────────────────────────────────────────────────────────

/**
 * Build a complete import Excel workbook as a Buffer.
 *
 * The schedule spans `numDays` starting from the first day of the
 * current month. Assignments are deterministically placed so tests
 * can assert on date ranges.
 */
export function buildImportExcel(numDays: number = 10): Buffer {
  const wb = XLSX.utils.book_new();

  const membersData = buildMembersData();
  const shiftsData = buildShiftsData();
  const scheduleData = buildScheduleData(membersData, shiftsData, numDays);

  const wsMembers = XLSX.utils.aoa_to_sheet(membersData);
  const wsShifts = XLSX.utils.aoa_to_sheet(shiftsData);
  const wsSchedule = XLSX.utils.aoa_to_sheet(scheduleData);

  XLSX.utils.book_append_sheet(wb, wsMembers, SHEET_MEMBERS);
  XLSX.utils.book_append_sheet(wb, wsShifts, SHEET_SHIFTS);
  XLSX.utils.book_append_sheet(wb, wsSchedule, SHEET_SCHEDULE);

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buf;
}

/**
 * Write an Excel Buffer to a temporary file and return its path.
 * Use with page.setInputFiles() in Playwright tests.
 */
export function writeExcelToTempFile(buf: Buffer, prefix: string = 'import-test'): string {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const filePath = path.join(os.tmpdir(), `${prefix}-${Date.now()}.xlsx`);
  fs.writeFileSync(filePath, buf);
  return filePath;
}

// ── Sheet builders ───────────────────────────────────────────────────────────

function buildMembersData(): unknown[][] {
  return [
    // Header row
    ['name', 'code', 'start', 'end', 'skills', 'contract', 'desired', 'duty/month', 'leave'],
    // Alice — will match existing "Alice Worker" by name
    ['Alice', 'AL', '2026-01-01', '', '', '40', '40', '4', '20'],
    // Bob — new worker
    ['Bob', 'BO', '2026-01-01', '', '', '35', '35', '3', '25'],
    // Charlie — new worker (used for skip-cascade tests)
    ['Charlie', 'CH', '2026-01-01', '', '', '40', '40', '4', '20'],
  ];
}

function buildShiftsData(): unknown[][] {
  return [
    // Header row
    ['name', 'code', 'duty', 'mandatory_rest', 'start', 'end', 'staffing'],
    // Morning — will match existing "Morning Shift" by acronym MS
    ['Morning', 'MS', '', '', '08:00', '16:00', ''],
    // Night — new shift
    ['Night', 'NS', '', '', '20:00', '08:00', ''],
  ];
}

/**
 * Build schedule data spanning `numDays` from the 1st of the current month.
 *
 * Assignment layout:
 *   Day 1: Alice → MS, Bob → MS
 *   Day 2: Alice → NS, Charlie → MS
 *   Day 3: Bob → NS
 *   Day 5: Charlie → NS  (day 4 empty)
 *   Day 7: Alice → MS (leave request — "leave" literal)
 *
 * This gives 4 assignments and 1 leave request spread across the period.
 */
function buildScheduleData(
  members: unknown[][],
  _shifts: unknown[][],
  numDays: number,
): unknown[][] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  // Build date headers
  const dates: Date[] = [];
  for (let d = 0; d < numDays; d++) {
    dates.push(new Date(year, month, d + 1));
  }

  // Header row: "Worker" + date strings (YYYY-MM-DD)
  const header: string[] = ['Worker'];
  for (const dt of dates) {
    header.push(formatDateISO(dt));
  }

  // Worker rows: worker name from members[1..] (skip header)
  const workerNames = members.slice(1).map((row) => String(row[0]));

  const dataRows: string[][] = [];

  for (const name of workerNames) {
    const row: string[] = new Array(dates.length + 1).fill('');
    row[0] = name;

    for (let i = 0; i < dates.length; i++) {
      const day = i + 1;
      if (name === 'Alice') {
        if (day === 1) row[i + 1] = 'MS';
        if (day === 2) row[i + 1] = 'NS';
        if (day === 7) row[i + 1] = 'leave'; // leave request
      } else if (name === 'Bob') {
        if (day === 1) row[i + 1] = 'MS';
        if (day === 3) row[i + 1] = 'NS';
      } else if (name === 'Charlie') {
        if (day === 2) row[i + 1] = 'MS';
        if (day === 5) row[i + 1] = 'NS';
      }
    }

    dataRows.push(row);
  }

  return [header, ...dataRows];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDateISO(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
