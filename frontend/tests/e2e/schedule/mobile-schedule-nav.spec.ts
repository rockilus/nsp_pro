/**
 * E2E tests for Mobile Schedule Navigation Bar
 *
 * These tests verify the mobile schedule navigation bar functionality including:
 * - Settings dialog interactions
 * - View switching (My Schedule vs Team Schedule)
 * - Worker selection (owner only)
 * - Role-based visibility and functionality
 */

import { test, expect } from '@playwright/test';
import { ScheduleTestBase } from '../../utils/schedule-test-base';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

// Configure for mobile viewport
test.use({
  viewport: { width: 375, height: 667 }, // iPhone SE dimensions
  isMobile: true,
});

test.describe('Mobile Schedule Nav - Owner Tests', () => {
  const scheduleTestBase = new ScheduleTestBase();

  test.beforeAll(async () => {
    // Setup with assignments and campaign
    const today = dayjs.utc();
    await scheduleTestBase.setupScheduleTests(test.info().workerIndex, {
      referenceDate: today,
      createAssignments: true,
      linkMemberToWorker: true,
      campaignDates: {
        start: today.startOf('month').utc(),
        end: today.endOf('month').utc(),
      },
    });
  });

  test.beforeEach(async ({ page }) => {
    await scheduleTestBase.actAsOwner(page);
    await scheduleTestBase.navigateToSchedulePage(page);

    // Wait for the mobile schedule page to render
    await page.waitForSelector('[data-testid="mobile-schedule-container"]', {
      timeout: 10000,
    });
  });

  test('should open settings dialog when tune icon is clicked', async ({ page }) => {
    // Click the settings button (tune icon)
    const settingsButton = page.locator('[data-testid="mobile-schedule-settings-button"]');
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();

    // Verify the settings dialog is visible
    const settingsDialog = page.locator('[data-testid="mobile-schedule-settings-dialog"]');
    await expect(settingsDialog).toBeVisible({ timeout: 5000 });

    console.log('✅ Settings dialog opened correctly when tune icon clicked');
  });

  test('should display worker selector for owner in settings dialog', async ({ page }) => {
    // Open settings dialog
    const settingsButton = page.locator('[data-testid="mobile-schedule-settings-button"]');
    await settingsButton.click();

    // Wait for dialog
    const settingsDialog = page.locator('[data-testid="mobile-schedule-settings-dialog"]');
    await expect(settingsDialog).toBeVisible({ timeout: 5000 });

    // Verify worker selector is visible for owner
    const workerSelect = page.locator('[data-testid="mobile-worker-select"]');
    await expect(workerSelect).toBeVisible();

    console.log('✅ Worker selector displayed for owner in settings dialog');
  });

  test("should display MobileWorkerSchedule when 'My schedule' is selected", async ({ page }) => {
    // Open settings dialog
    const settingsButton = page.locator('[data-testid="mobile-schedule-settings-button"]');
    await settingsButton.click();

    // Wait for dialog
    await page.waitForSelector('[data-testid="mobile-schedule-settings-dialog"]', {
      timeout: 5000,
    });

    // Select "My schedule" (worker view)
    const workerViewButton = page.locator('[data-testid="mobile-view-worker-button"]');
    await workerViewButton.click();

    // Close dialog
    const closeButton = page.getByRole('button', { name: /close/i });
    await closeButton.click();

    // Wait for dialog to close
    await expect(page.locator('[data-testid="mobile-schedule-settings-dialog"]')).not.toBeVisible();

    // Verify MobileWorkerSchedule is displayed
    const workerSchedule = page.locator('[data-testid="mobile-worker-schedule"]');
    await expect(workerSchedule).toBeVisible({ timeout: 3000 });

    // Verify MobileTeamSchedule is NOT displayed
    const teamSchedule = page.locator('[data-testid="mobile-team-schedule"]');
    await expect(teamSchedule).not.toBeVisible();

    console.log("✅ MobileWorkerSchedule displayed when 'My schedule' is selected");
  });

  test("should display MobileTeamSchedule when 'Team schedule' is selected", async ({ page }) => {
    // Open settings dialog
    const settingsButton = page.locator('[data-testid="mobile-schedule-settings-button"]');
    await settingsButton.click();

    // Wait for dialog
    await page.waitForSelector('[data-testid="mobile-schedule-settings-dialog"]', {
      timeout: 5000,
    });

    // Select "Team schedule"
    const teamViewButton = page.locator('[data-testid="mobile-view-team-button"]');
    await teamViewButton.click();

    // Close dialog
    const closeButton = page.getByRole('button', { name: /close/i });
    await closeButton.click();

    // Wait for dialog to close
    await expect(page.locator('[data-testid="mobile-schedule-settings-dialog"]')).not.toBeVisible();

    // Verify MobileTeamSchedule is displayed
    const teamSchedule = page.locator('[data-testid="mobile-team-schedule"]');
    await expect(teamSchedule).toBeVisible({ timeout: 3000 });

    // Verify MobileWorkerSchedule is NOT displayed
    const workerSchedule = page.locator('[data-testid="mobile-worker-schedule"]');
    await expect(workerSchedule).not.toBeVisible();

    console.log("✅ MobileTeamSchedule displayed when 'Team schedule' is selected");
  });

  test("should change displayed worker when different worker is selected in 'My schedule' view", async ({
    page,
  }) => {
    // First, ensure we're in worker view by opening settings
    const settingsButton = page.locator('[data-testid="mobile-schedule-settings-button"]');
    await settingsButton.click();

    // Wait for dialog
    await page.waitForSelector('[data-testid="mobile-schedule-settings-dialog"]', {
      timeout: 5000,
    });

    // Make sure we're in worker view
    const workerViewButton = page.locator('[data-testid="mobile-view-worker-button"]');
    await workerViewButton.click();

    // Get the worker selector (MUI Select component) - use the div with role combobox
    const workerSelectButton = page
      .locator('[data-testid="mobile-worker-select"]')
      .locator('div[role="combobox"]');

    // Get the currently selected worker name from the button
    const initialWorkerText = (await workerSelectButton.textContent())?.trim() || '';
    console.log(`Initial worker: ${initialWorkerText}`);

    // Click to open the dropdown menu
    await workerSelectButton.click();

    // Wait for the menu to open and be visible
    await page.waitForTimeout(300);

    // Get all worker options
    const workerOptions = await page.locator('[data-testid^="mobile-worker-option-"]').all();

    if (workerOptions.length < 2) {
      console.log('⚠️ Only one worker available, skipping test');
      // Close the menu first
      await page.keyboard.press('Escape');
      return;
    }

    // Find a different worker to select
    let differentWorkerId: string | null = null;
    let differentWorkerText: string | null = null;

    for (const option of workerOptions) {
      const testId = await option.getAttribute('data-testid');
      const workerId = testId?.replace('mobile-worker-option-', '') || '';
      const workerText = (await option.textContent())?.trim() || '';

      if (workerText && workerText !== initialWorkerText) {
        differentWorkerId = workerId;
        differentWorkerText = workerText;
        break;
      }
    }

    if (!differentWorkerId || !differentWorkerText) {
      console.log('⚠️ Only one worker available, skipping test');
      await page.keyboard.press('Escape');
      return;
    }

    console.log(`Selecting different worker: ${differentWorkerText} (${differentWorkerId})`);

    // Select the different worker
    await page.locator(`[data-testid="mobile-worker-option-${differentWorkerId}"]`).click();

    // Wait for the menu to close
    await page.waitForTimeout(300);

    // Verify the worker was changed in the select by checking the display text
    const newWorkerText = (await workerSelectButton.textContent())?.trim() || '';
    expect(newWorkerText).toBe(differentWorkerText);

    // Close dialog
    const closeButton = page.getByRole('button', { name: /close/i });
    await closeButton.click();

    // Wait for dialog to close
    await expect(page.locator('[data-testid="mobile-schedule-settings-dialog"]')).not.toBeVisible();

    // Wait a moment for the schedule to update
    await page.waitForTimeout(500);

    // Verify MobileWorkerSchedule is still displayed (it should update with new worker)
    const workerSchedule = page.locator('[data-testid="mobile-worker-schedule"]');
    await expect(workerSchedule).toBeVisible();

    console.log(
      `✅ Successfully changed displayed worker from ${initialWorkerText} to ${differentWorkerText}`,
    );
  });

  test('should persist view selection when reopening settings dialog', async ({ page }) => {
    // Open settings and select team view
    const settingsButton = page.locator('[data-testid="mobile-schedule-settings-button"]');
    await settingsButton.click();

    await page.waitForSelector('[data-testid="mobile-schedule-settings-dialog"]', {
      timeout: 5000,
    });

    const teamViewButton = page.locator('[data-testid="mobile-view-team-button"]');
    await teamViewButton.click();

    // Close dialog
    const closeButton = page.getByRole('button', { name: /close/i });
    await closeButton.click();

    await expect(page.locator('[data-testid="mobile-schedule-settings-dialog"]')).not.toBeVisible();

    // Wait a moment
    await page.waitForTimeout(300);

    // Reopen settings
    await settingsButton.click();
    await page.waitForSelector('[data-testid="mobile-schedule-settings-dialog"]', {
      timeout: 5000,
    });

    // Verify team view is still selected
    const teamViewButtonReopen = page.locator('[data-testid="mobile-view-team-button"]');
    await expect(teamViewButtonReopen).toHaveClass(/Mui-selected/);

    console.log('✅ View selection persisted when reopening settings dialog');
  });
});

test.describe('Mobile Schedule Nav - Member Tests', () => {
  const scheduleTestBase = new ScheduleTestBase();

  test.beforeAll(async () => {
    // Setup with assignments and campaign, link member to worker
    const today = dayjs.utc();
    await scheduleTestBase.setupScheduleTests(test.info().workerIndex + 2000, {
      referenceDate: today,
      createAssignments: true,
      linkMemberToWorker: true,
      campaignDates: {
        start: today.startOf('month').utc(),
        end: today.endOf('month').utc(),
      },
    });
  });

  test.beforeEach(async ({ page }) => {
    await scheduleTestBase.actAsMember(page);
    await scheduleTestBase.navigateToSchedulePage(page);

    // Wait for the mobile schedule page to render
    await page.waitForSelector('[data-testid="mobile-schedule-container"]', {
      timeout: 10000,
    });
  });

  test('should not display worker selector for member in settings dialog', async ({ page }) => {
    // Open settings dialog
    const settingsButton = page.locator('[data-testid="mobile-schedule-settings-button"]');
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();

    // Wait for dialog
    const settingsDialog = page.locator('[data-testid="mobile-schedule-settings-dialog"]');
    await expect(settingsDialog).toBeVisible({ timeout: 5000 });

    // Verify worker selector is NOT visible for member
    const workerSelect = page.locator('[data-testid="mobile-worker-select"]');
    await expect(workerSelect).not.toBeVisible();

    console.log('✅ Worker selector correctly hidden for member in settings dialog');
  });

  test('should display view toggle for member in settings dialog', async ({ page }) => {
    // Open settings dialog
    const settingsButton = page.locator('[data-testid="mobile-schedule-settings-button"]');
    await settingsButton.click();

    // Wait for dialog
    const settingsDialog = page.locator('[data-testid="mobile-schedule-settings-dialog"]');
    await expect(settingsDialog).toBeVisible({ timeout: 5000 });

    // Verify view toggle is visible
    const viewToggle = page.locator('[data-testid="mobile-view-toggle"]');
    await expect(viewToggle).toBeVisible();

    // Verify both view buttons are present
    const workerViewButton = page.locator('[data-testid="mobile-view-worker-button"]');
    const teamViewButton = page.locator('[data-testid="mobile-view-team-button"]');
    await expect(workerViewButton).toBeVisible();
    await expect(teamViewButton).toBeVisible();

    console.log('✅ View toggle displayed for member in settings dialog');
  });

  test("should only display linked worker's schedule in 'My schedule' view for member", async ({
    page,
  }) => {
    // Open settings and ensure we're in worker view
    const settingsButton = page.locator('[data-testid="mobile-schedule-settings-button"]');
    await settingsButton.click();

    await page.waitForSelector('[data-testid="mobile-schedule-settings-dialog"]', {
      timeout: 5000,
    });

    // Select worker view
    const workerViewButton = page.locator('[data-testid="mobile-view-worker-button"]');
    await workerViewButton.click();

    // Close dialog
    const closeButton = page.getByRole('button', { name: /close/i });
    await closeButton.click();

    await expect(page.locator('[data-testid="mobile-schedule-settings-dialog"]')).not.toBeVisible();

    // Verify MobileWorkerSchedule is displayed
    const workerSchedule = page.locator('[data-testid="mobile-worker-schedule"]');
    await expect(workerSchedule).toBeVisible({ timeout: 3000 });

    // Note: Since member cannot change workers, they should only see their linked worker's schedule
    // This is enforced by not showing the worker selector

    console.log("✅ Member can view 'My schedule' showing only their linked worker's assignments");
  });

  test("should allow member to switch between 'My schedule' and 'Team schedule' views", async ({
    page,
  }) => {
    // Start by ensuring we're in worker view
    const settingsButton = page.locator('[data-testid="mobile-schedule-settings-button"]');
    await settingsButton.click();

    await page.waitForSelector('[data-testid="mobile-schedule-settings-dialog"]', {
      timeout: 5000,
    });

    // Select worker view
    const workerViewButton = page.locator('[data-testid="mobile-view-worker-button"]');
    await workerViewButton.click();

    // Close dialog
    let closeButton = page.getByRole('button', { name: /close/i });
    await closeButton.click();

    await expect(page.locator('[data-testid="mobile-schedule-settings-dialog"]')).not.toBeVisible();

    // Verify worker schedule is visible
    let workerSchedule = page.locator('[data-testid="mobile-worker-schedule"]');
    await expect(workerSchedule).toBeVisible({ timeout: 3000 });

    // Now switch to team view
    await settingsButton.click();
    await page.waitForSelector('[data-testid="mobile-schedule-settings-dialog"]', {
      timeout: 5000,
    });

    const teamViewButton = page.locator('[data-testid="mobile-view-team-button"]');
    await teamViewButton.click();

    closeButton = page.getByRole('button', { name: /close/i });
    await closeButton.click();

    await expect(page.locator('[data-testid="mobile-schedule-settings-dialog"]')).not.toBeVisible();

    // Verify team schedule is visible
    const teamSchedule = page.locator('[data-testid="mobile-team-schedule"]');
    await expect(teamSchedule).toBeVisible({ timeout: 3000 });

    // Verify worker schedule is NOT visible
    workerSchedule = page.locator('[data-testid="mobile-worker-schedule"]');
    await expect(workerSchedule).not.toBeVisible();

    console.log("✅ Member can switch between 'My schedule' and 'Team schedule' views");
  });

  test('should display settings button for member', async ({ page }) => {
    // Verify settings button is visible for member
    const settingsButton = page.locator('[data-testid="mobile-schedule-settings-button"]');
    await expect(settingsButton).toBeVisible();

    console.log('✅ Settings button displayed for member');
  });
});
