import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { WorkerTestBase } from '../../utils/worker-test-base';
import dayjs from 'dayjs';

test.describe('Worker Edit Dialog', () => {
  const testBasesMap = new Map<string, WorkerTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const workerTestBase = new WorkerTestBase();
    testBasesMap.set(testRunId, workerTestBase);
    (testInfo as any).testRunId = testRunId;

    await getTestBase(testInfo).setupWorkerTests(workerIndex);
    await getTestBase(testInfo).navigateToWorkersPage(page);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  function getTestBase(testInfo: any): WorkerTestBase {
    const testRunId = testInfo.testRunId as string;
    const tb = testBasesMap.get(testRunId);
    if (!tb) throw new Error('Test base not found');
    return tb;
  }

  test('should open the edit dialog when the edit button is clicked', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'Alice', weeklyHours: 39 });

    // Reload to see the API-created worker in the table
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Click the edit button
    await tb.openEditDialog(page, worker.id);

    // Verify dialog elements are visible
    await expect(page.locator('[data-testid="edit-worker-name-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="edit-worker-save-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="edit-worker-cancel-button"]')).toBeVisible();

    // Pre-filled name should match worker
    await expect(page.locator('[data-testid="edit-worker-name-input"]')).toHaveValue('Alice');

    console.log('✅ Edit dialog opened with correct pre-filled values');
  });

  test('should edit the name via the dialog and reflect in table and API', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'Bob' });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await tb.openEditDialog(page, worker.id);
    await tb.setDialogName(page, 'Robert');
    await tb.saveEditDialog(page);

    // Verify API — server-side state
    const updated = await tb.getWorkerById(worker.id);
    expect(updated.name).toBe('Robert');

    // Verify table — UI reflects the change
    const display = page.locator(`[data-testid="worker-name-display-${worker.id}"]`);
    await expect(display).toContainText('Robert');

    console.log('✅ Name updated via dialog — API and table both reflect the change');
  });

  test('should edit the acronym via dialog and verify in API and table', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'Carol', acronym: 'CAR' });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await tb.openEditDialog(page, worker.id);
    await tb.setDialogAcronym(page, 'CL');
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expect(updated.acronym).toBe('CL');

    const display = page.locator(`[data-testid="worker-acronym-display-${worker.id}"]`);
    await expect(display).toContainText('CL');

    console.log('✅ Acronym updated via dialog');
  });

  test('should edit employment start date via dialog and verify in API', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'Dave' });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    const newStart = '2025-01-15';
    await tb.openEditDialog(page, worker.id);
    await tb.setDialogEmploymentStartDate(page, newStart);
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expect(dayjs(updated.employmentStartDate).format('YYYY-MM-DD')).toBe(newStart);

    console.log('✅ Employment start date updated via dialog');
  });

  test('should set employment end date via dialog and verify in API and table', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'Eve' });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    const newEnd = '2026-12-31';
    await tb.openEditDialog(page, worker.id);

    // The end date input is disabled when "Permanent" is checked (no end date).
    // Uncheck "Permanent" to enable the date input.
    await tb.setDialogPermanentCheckbox(page, false);
    await page.waitForTimeout(100);
    await tb.setDialogEmploymentEndDate(page, newEnd);
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expect(dayjs(updated.employmentEndDate).format('YYYY-MM-DD')).toBe(newEnd);

    // Table should show the new end date
    const display = page.locator(`[data-testid="worker-employment-end-display-${worker.id}"]`);
    // The display format in the table is the user's localised format
    await expect(display).not.toContainText('Permanent');

    console.log('✅ Employment end date updated via dialog');
  });

  test('should mark worker as permanent (no end date) via dialog', async ({ page }, testInfo) => {
    const tb = getTestBase(testInfo);
    // Create a worker WITH an end date so we can clear it
    const worker = await tb.createTestWorker({
      name: 'Frank',
      employmentEndDate: dayjs('2027-06-01'),
    });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await tb.openEditDialog(page, worker.id);
    await tb.setDialogPermanentCheckbox(page, true);
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expect(updated.employmentEndDate).toBeNull();

    const display = page.locator(`[data-testid="worker-employment-end-display-${worker.id}"]`);
    await expect(display).toContainText('Permanent');

    console.log('✅ Worker marked as permanent via dialog');
  });

  test('should edit weekly hours via dialog and verify in API and table', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'Grace', weeklyHours: 39 });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await tb.openEditDialog(page, worker.id);
    await tb.setDialogWeeklyHours(page, 36);
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expect(updated.weeklyHours).toBe(36);

    const display = page.locator(`[data-testid="worker-weekly-hours-display-${worker.id}"]`);
    await expect(display).toContainText('36');

    console.log('✅ Weekly hours updated via dialog');
  });

  test('should edit desired weekly hours via dialog and verify in API and table', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({
      name: 'Hank',
      weeklyHours: 39,
      weeklyHoursDesired: 39,
    });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await tb.openEditDialog(page, worker.id);
    await tb.setDialogWeeklyHoursDesired(page, 30);
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expect(updated.weeklyHoursDesired).toBe(30);

    const display = page.locator(
      `[data-testid="worker-weekly-hours-desired-display-${worker.id}"]`,
    );
    await expect(display).toContainText('30');

    console.log('✅ Desired weekly hours updated via dialog');
  });

  test('should edit duties per month via dialog and verify in API and table', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'Ivy', dutiesPerMonth: 4 });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await tb.openEditDialog(page, worker.id);
    await tb.setDialogDutiesPerMonth(page, 6);
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expect(updated.dutiesPerMonth).toBe(6);

    const display = page.locator(`[data-testid="worker-duties-per-month-display-${worker.id}"]`);
    await expect(display).toContainText('6');

    console.log('✅ Duties per month updated via dialog');
  });

  test('should edit annual leave via dialog and verify in API and table', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'Jack', annualLeave: 25 });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await tb.openEditDialog(page, worker.id);
    await tb.setDialogAnnualLeave(page, 30);
    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expect(updated.annualLeave).toBe(30);

    const display = page.locator(`[data-testid="worker-annual-leave-display-${worker.id}"]`);
    await expect(display).toContainText('30');

    console.log('✅ Annual leave updated via dialog');
  });

  test('should edit all fields at once via dialog and verify in API and table', async ({
    page,
  }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({
      name: 'Kelly',
      acronym: 'KEL',
      weeklyHours: 39,
      weeklyHoursDesired: 39,
      dutiesPerMonth: 4,
      annualLeave: 25,
    });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await tb.openEditDialog(page, worker.id);

    await tb.setDialogName(page, 'Kendall');
    await tb.setDialogAcronym(page, 'KEN');
    await tb.setDialogWeeklyHours(page, 35);
    await tb.setDialogWeeklyHoursDesired(page, 32);
    await tb.setDialogDutiesPerMonth(page, 5);
    await tb.setDialogAnnualLeave(page, 28);

    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expect(updated.name).toBe('Kendall');
    expect(updated.acronym).toBe('KEN');
    expect(updated.weeklyHours).toBe(35);
    expect(updated.weeklyHoursDesired).toBe(32);
    expect(updated.dutiesPerMonth).toBe(5);
    expect(updated.annualLeave).toBe(28);

    // Verify all fields in the table
    await expect(page.locator(`[data-testid="worker-name-display-${worker.id}"]`)).toContainText(
      'Kendall',
    );
    await expect(page.locator(`[data-testid="worker-acronym-display-${worker.id}"]`)).toContainText(
      'KEN',
    );
    await expect(
      page.locator(`[data-testid="worker-weekly-hours-display-${worker.id}"]`),
    ).toContainText('35');
    await expect(
      page.locator(`[data-testid="worker-weekly-hours-desired-display-${worker.id}"]`),
    ).toContainText('32');
    await expect(
      page.locator(`[data-testid="worker-duties-per-month-display-${worker.id}"]`),
    ).toContainText('5');
    await expect(
      page.locator(`[data-testid="worker-annual-leave-display-${worker.id}"]`),
    ).toContainText('28');

    console.log('✅ All fields updated at once via dialog');
  });

  test('should cancel dialog without changing the worker', async ({ page }, testInfo) => {
    const tb = getTestBase(testInfo);
    const worker = await tb.createTestWorker({ name: 'Liam', weeklyHours: 40 });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    await tb.openEditDialog(page, worker.id);
    await tb.setDialogName(page, 'ChangedName');
    await tb.setDialogWeeklyHours(page, 99);
    await tb.cancelEditDialog(page);

    // API should still have original values
    const unchanged = await tb.getWorkerById(worker.id);
    expect(unchanged.name).toBe('Liam');
    expect(unchanged.weeklyHours).toBe(40);

    // Table should still show original values
    await expect(page.locator(`[data-testid="worker-name-display-${worker.id}"]`)).toContainText(
      'Liam',
    );
    await expect(
      page.locator(`[data-testid="worker-weekly-hours-display-${worker.id}"]`),
    ).toContainText('40');

    console.log('✅ Cancel discards changes — API and table unchanged');
  });

  test('should edit specialties via dialog and verify in API', async ({ page }, testInfo) => {
    const tb = getTestBase(testInfo);

    // Create two specialties
    const specialtyA = await tb.createTestSpecialty({ name: 'Surgery' });
    const specialtyB = await tb.createTestSpecialty({ name: 'Pediatrics' });

    const worker = await tb.createTestWorker({ name: 'Mia', weeklyHours: 39 });

    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Open dialog and add both specialties via the specialty edit component
    await tb.openEditDialog(page, worker.id);

    // The specialties section uses WorkerSpecialtyCellEdit.
    // Type in the search input to find and select a specialty.
    const specialtyInput = page.locator(
      '[data-testid="specialty-input-container"] input, [data-testid="worker-specialty-edit-popup"] input',
    );
    if (await specialtyInput.isVisible()) {
      // Add specialty A
      await specialtyInput.fill(specialtyA.name);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);

      // Add specialty B
      await specialtyInput.fill(specialtyB.name);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(200);
    }

    await tb.saveEditDialog(page);

    const updated = await tb.getWorkerById(worker.id);
    expect(updated.specialtyIds).toContain(specialtyA.id);
    expect(updated.specialtyIds).toContain(specialtyB.id);

    console.log('✅ Specialties updated via dialog');
  });
});
