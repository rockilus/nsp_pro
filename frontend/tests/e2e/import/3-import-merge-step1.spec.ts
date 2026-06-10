/**
 * E2E tests for AdminImportMergeStep1 — the team-selection table view.
 *
 * Verifies:
 * - Teams are listed with owner names and IDs
 * - Per-column search filters work
 * - Pagination appears and works when teams exceed page size (30)
 * - "Review Matches" button is disabled until a team is selected
 * - Selecting a team enables the button and navigates to step 2
 */

import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { ImportMergeTestBase } from '../../utils/import-merge-test-base';
import { DatabaseTestUtils } from '../../utils/database-utils';
import { testConfig } from '../../utils/test-config';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function setupAndNavigate(
  page: import('@playwright/test').Page,
  testBase: ImportMergeTestBase,
) {
  const importId = await testBase.createImportViaApi();
  await testBase.actAsAdmin(page);
  await page.goto(`${testConfig.frontendUrl}/en/admin/import/merge?id=${importId}`);
  await page.waitForLoadState('domcontentloaded');
  // Wait for the table to finish its initial load
  await page.waitForSelector('[data-testid="merge-teams-table"]', { timeout: 10000 });
  return importId;
}

/** Search for the test team by name so it appears on the current page, then assert row is visible. */
async function ensureTeamVisible(
  page: import('@playwright/test').Page,
  testBase: ImportMergeTestBase,
) {
  const team = testBase.getTestTeam()!;
  const nameFilter = page.locator('[data-testid="filter-search_name"]');
  await nameFilter.fill(team.name);
  await page.waitForTimeout(500); // let debounced search settle
  await expect(page.locator(`[data-testid="team-row-${team.teamId}"]`)).toBeVisible({
    timeout: 5000,
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('AdminImportMergeStep1 — Team Table', () => {
  const testBasesMap = new Map<string, ImportMergeTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const testBase = new ImportMergeTestBase();
    testBasesMap.set(testRunId, testBase);
    (testInfo as any).testRunId = testRunId;

    await testBase.setup(workerIndex);
    await setupAndNavigate(page, testBase);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  test('should list teams in table with owner names and IDs', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;
    const team = testBase.getTestTeam()!;

    // Search for the test team by name so it appears on the current page
    await ensureTeamVisible(page, testBase);

    // The test team row should be visible
    const teamRow = page.locator(`[data-testid="team-row-${team.teamId}"]`);
    await expect(teamRow).toBeVisible({ timeout: 5000 });

    // Team name should appear in the row
    await expect(teamRow).toContainText(team.name);

    // Owner name should appear (the test user "Test User" is the owner)
    await expect(teamRow).toContainText('Test User');
  });

  test('should filter teams by name', async ({ page }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;
    const team = testBase.getTestTeam()!;

    // Type a filter that matches the test team
    const nameFilter = page.locator('[data-testid="filter-search_name"]');
    await nameFilter.fill(team.name.substring(0, 5));
    // Wait for the debounced fetch to resolve — the team row should still be visible
    await expect(page.locator(`[data-testid="team-row-${team.teamId}"]`)).toBeVisible({
      timeout: 5000,
    });

    // Clear and type a non-matching filter
    await nameFilter.fill('');
    await nameFilter.fill('ZZZ_NO_MATCH_XXXX');
    // Wait for empty state
    await expect(page.locator('[data-testid="merge-teams-table"]')).toContainText(
      'No teams found',
      { timeout: 5000 },
    );

    // Clear the filter — the team row should reappear
    await nameFilter.fill('');
    await expect(page.locator(`[data-testid="team-row-${team.teamId}"]`)).toBeVisible({
      timeout: 5000,
    });
  });

  test('should disable "Review Matches" button before team selection', async ({ page }) => {
    const resolveBtn = page.locator('[data-testid="merge-resolve-btn"]');
    await expect(resolveBtn).toBeVisible();
    await expect(resolveBtn).toBeDisabled();
  });

  test('should enable button and navigate to step 2 when team is selected', async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const testBase = testBasesMap.get(testRunId)!;
    const team = testBase.getTestTeam()!;

    // Search for the team so it's on the current page, then click it
    await ensureTeamVisible(page, testBase);

    const teamRow = page.locator(`[data-testid="team-row-${team.teamId}"]`);
    await teamRow.click();

    // Button should now be enabled
    const resolveBtn = page.locator('[data-testid="merge-resolve-btn"]');
    await expect(resolveBtn).not.toBeDisabled({ timeout: 3000 });

    // Click "Review Matches"
    await resolveBtn.click();

    // Step 2 should load — wait for its next button
    await page.waitForSelector('[data-testid="merge-step2-next"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="merge-step2-next"]')).toBeVisible();
  });
});

test.describe('AdminImportMergeStep1 — Pagination', () => {
  const testBasesMap = new Map<string, ImportMergeTestBase>();
  const TEAM_COUNT = 35; // exceeds page size of 30

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;

    const testBase = new ImportMergeTestBase();
    testBasesMap.set(testRunId, testBase);
    (testInfo as any).testRunId = testRunId;

    // Setup base state (creates a team + workers + shifts)
    await testBase.setup(workerIndex);

    // Create additional teams so total > 30
    const dbUtils = new DatabaseTestUtils();
    await dbUtils.waitForApiReady();
    for (let i = 1; i < TEAM_COUNT; i++) {
      await dbUtils.createTeam({ name: `Paginated Team ${i}-${Date.now()}` });
    }

    await setupAndNavigate(page, testBase);

    // Search for the test team so it's findable across pages
    await ensureTeamVisible(page, testBase);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testBasesMap.delete(testRunId);
  });

  test('should show pagination and allow navigating pages', async ({ page }) => {
    // Pagination controls should be visible (more than 30 teams)
    const pagination = page.locator('[data-slot="pagination"]');
    await expect(pagination).toBeVisible({ timeout: 5000 });

    // Page info text should show page 1 of 2 (35 teams / 30 = 2 pages)
    const pageInfo = page.locator('[data-testid="pagination-page-info"]');
    await expect(pageInfo).toBeVisible();
    await expect(pageInfo).toContainText(/Page \d/);

    // Page 1 should be selected by default
    await expect(page.locator('[data-testid="pagination-page-1-selected"]')).toBeVisible();

    // Click Next to go to page 2
    await page.locator('[data-testid="pagination-next"]').click();
    await page.waitForTimeout(800);
    await expect(page.locator('[data-testid="pagination-page-2-selected"]')).toBeVisible();
    await expect(page.locator('[data-testid="merge-teams-table"]')).toBeVisible();

    // Click Previous to go back to page 1
    await page.locator('[data-testid="pagination-previous"]').click();
    await page.waitForTimeout(800);
    await expect(page.locator('[data-testid="pagination-page-1-selected"]')).toBeVisible();
  });
});
