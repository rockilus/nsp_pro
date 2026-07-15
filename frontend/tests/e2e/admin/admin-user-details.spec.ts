/**
 * E2E tests for the Admin User Details & Data Export feature
 *
 * Covers:
 *  - UI: navigating from the users table to a user's details page
 *  - UI: teams list with roles, empty states, error states
 *  - UI: export matrix behavior (cell / row / column checkbox selection)
 *  - UI: JSON file download with a complete check of the exported content
 *    against the `basic_coverage` scenario fixture (post-remap IDs)
 *  - API: authorization (403), validation (400) and not-found (404) checks
 *    for GET /admin/users/:id and POST /admin/users/:id/export
 *
 * The admin user (TEST_USER) is configured with system_role = "super_admin"
 * outside of test code and preserved across DB resets. TEST_USER_2 is the
 * non-admin target user, re-created in beforeEach.
 *
 * Parallel-safety rules:
 *  - Test state lives in a per-test map keyed by testRunId (no leakage).
 *  - Teams are created per test with unique names (top-level export keys are
 *    team names, so uniqueness prevents cross-test collisions).
 *  - Assertions are keyed by this test's team/user IDs only — TEST_USER_2
 *    accumulates teams from parallel tests, so no "only N teams" assertions.
 *  - Team creation seeds default (leave/rest) shifts, so shift assertions
 *    are containment-based, never exact counts.
 */

import * as fs from 'fs';
import { randomUUID } from 'crypto';
import { test, expect, Download, Page } from '@playwright/test';
import { AdminTestBase } from '../../utils/admin-test-base';
import { SolverScenarioResult } from '../../utils/database-utils';

// Must match EXPORTABLE_DATA_TYPES in the backend
// (backend/api_gateway/src/services/test_service.py) and EXPORT_DATA_TYPES in
// src/components/admin/admin-user-export-table.tsx
const EXPORT_DATA_TYPES = [
  'specialties',
  'workers',
  'shifts',
  'link_shifts',
  'dimensions',
  'dim_entries',
  'attributes',
  'shift_demand_templates',
  'shift_demands',
  'constraints',
  'requests',
  'schedules',
] as const;

const OBJECT_ID_RE = /^[0-9a-f]{24}$/;
const UNKNOWN_USER_ID = '000000000000000000000000';

interface ExportFixture {
  teamA: { teamId: string; name: string };
  teamB: { teamId: string; name: string };
  scenario: SolverScenarioResult | null;
}

/**
 * Create two uniquely-named teams owned by TEST_USER_2 and optionally load
 * the basic_coverage scenario into team A.
 */
async function seedExportFixture(
  adminBase: AdminTestBase,
  workerIndex: number,
  options: { loadScenario?: boolean } = {},
): Promise<ExportFixture> {
  const tag = `${workerIndex}-${randomUUID().slice(0, 8)}`;
  const teamA = await adminBase.createTeamForNonAdmin(`UD-${tag}-A`);
  const teamB = await adminBase.createTeamForNonAdmin(`UD-${tag}-B`);
  const scenario = options.loadScenario
    ? await adminBase.loadScenario(teamA.teamId, 'basic_coverage')
    : null;
  return { teamA, teamB, scenario };
}

/** Read and parse the JSON content of a Playwright download. */
async function readDownloadedJson(download: Download): Promise<any> {
  const filePath = await download.path();
  if (!filePath) throw new Error('Download path unavailable');
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/** Wait for the export matrix of the details page to be visible. */
async function waitForExportMatrix(page: Page): Promise<void> {
  await expect(page.locator('[data-testid="admin-user-export"]')).toBeVisible({
    timeout: 10_000,
  });
}

test.describe('Admin User Details & Export', () => {
  // Map of testRunId → AdminTestBase instance, keyed per-test for parallel safety
  const testBasesMap = new Map<string, AdminTestBase>();

  test.beforeEach(async ({}, testInfo) => {
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[User Details Test ${testRunId}] Starting setup`);

    const adminBase = new AdminTestBase();
    testBasesMap.set(testRunId, adminBase);
    (testInfo as any).testRunId = testRunId;

    await adminBase.setup(workerIndex);

    console.log(`[User Details Test ${testRunId}] Setup complete`);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (testRunId) {
      testBasesMap.delete(testRunId);
      console.log(`[User Details Test ${testRunId}] Cleanup complete`);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // UI — user details page
  // ─────────────────────────────────────────────────────────────────────────

  test.describe('User details page', () => {
    test("clicking 'view details' navigates to the user details page", async ({
      page,
    }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;
      const nonAdminUser = adminBase.getNonAdminUser();

      await adminBase.actAsAdmin(page);
      await adminBase.navigateToAdminUsersPage(page);

      await expect(page.locator('[data-testid="admin-users-table"]')).toBeVisible({
        timeout: 10_000,
      });

      await page.locator(`[data-testid="view-details-btn-${nonAdminUser.user_id}"]`).click();

      await page.waitForURL(new RegExp(`/admin/users/details\\?userId=${nonAdminUser.user_id}`), {
        timeout: 10_000,
      });

      const detailsTab = page.locator('[data-testid="admin-user-details-tab"]');
      await expect(detailsTab).toBeVisible({ timeout: 10_000 });
      await expect(detailsTab).toContainText(nonAdminUser.first_name);
      await expect(detailsTab).toContainText(nonAdminUser.last_name);
      await expect(detailsTab).toContainText(nonAdminUser.email);

      console.log('✅ View details navigates to the details page with user info');
    });

    test("lists the user's teams with their role", async ({ page }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;
      const nonAdminUser = adminBase.getNonAdminUser();
      const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;

      const { teamA, teamB } = await seedExportFixture(adminBase, workerIndex);

      await adminBase.actAsAdmin(page);
      await adminBase.navigateToAdminUserDetailsPage(page, nonAdminUser.user_id);

      const teamRowA = page.locator(`[data-testid="admin-user-team-${teamA.teamId}"]`);
      await expect(teamRowA).toBeVisible({ timeout: 10_000 });
      await expect(teamRowA).toContainText(teamA.name);
      await expect(teamRowA).toContainText('Owner');

      await expect(page.locator(`[data-testid="admin-user-team-${teamB.teamId}"]`)).toBeVisible();

      console.log('✅ Details page lists the seeded teams with the owner role');
    });

    test("'back to users' returns to the admin users page", async ({ page }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;
      const nonAdminUser = adminBase.getNonAdminUser();

      await adminBase.actAsAdmin(page);
      await adminBase.navigateToAdminUserDetailsPage(page, nonAdminUser.user_id);

      await expect(page.locator('[data-testid="admin-user-details-tab"]')).toBeVisible({
        timeout: 10_000,
      });

      await page.locator('[data-testid="back-to-users-btn"]').click();

      await page.waitForURL(/\/admin\/users/, { timeout: 10_000 });
      await expect(page.locator('[data-testid="admin-users-tab"]')).toBeVisible({
        timeout: 10_000,
      });

      console.log('✅ Back button returns to the admin users page');
    });

    test('shows a fallback when no userId param is provided', async ({ page }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;

      await adminBase.actAsAdmin(page);
      // Navigate without the userId query param
      await adminBase.navigateToAdminUserDetailsPage(page, '');

      await expect(page.locator('[data-testid="admin-user-details-no-user-id"]')).toBeVisible({
        timeout: 10_000,
      });

      console.log('✅ Missing userId param shows the fallback message');
    });

    test('shows an error state for an unknown user', async ({ page }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;

      await adminBase.actAsAdmin(page);
      await adminBase.navigateToAdminUserDetailsPage(page, UNKNOWN_USER_ID);

      await expect(page.locator('[data-testid="admin-user-details-error"]')).toBeVisible({
        timeout: 10_000,
      });

      console.log('✅ Unknown user shows the error state');
    });

    test('shows the no-teams state and hides the export section for a user without teams', async ({
      page,
    }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;

      const isolatedUser = await adminBase.createIsolatedUser();

      await adminBase.actAsAdmin(page);
      await adminBase.navigateToAdminUserDetailsPage(page, isolatedUser.user_id);

      await expect(page.locator('[data-testid="admin-user-no-teams"]')).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.locator('[data-testid="admin-user-export"]')).not.toBeVisible();

      console.log('✅ User without teams shows no-teams state and no export section');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // UI — export matrix behavior
  // ─────────────────────────────────────────────────────────────────────────

  test.describe('Export matrix', () => {
    test('export button is disabled until a cell is selected', async ({ page }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;
      const nonAdminUser = adminBase.getNonAdminUser();
      const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;

      const { teamA } = await seedExportFixture(adminBase, workerIndex);

      await adminBase.actAsAdmin(page);
      await adminBase.navigateToAdminUserDetailsPage(page, nonAdminUser.user_id);
      await waitForExportMatrix(page);

      const exportBtn = page.locator('[data-testid="export-user-data-btn"]');
      const cell = page.locator(`[data-testid="export-cell-checkbox-${teamA.teamId}-workers"]`);

      await expect(exportBtn).toBeDisabled();

      await cell.click();
      await expect(cell).toHaveAttribute('aria-checked', 'true');
      await expect(exportBtn).toBeEnabled();

      await cell.click();
      await expect(cell).toHaveAttribute('aria-checked', 'false');
      await expect(exportBtn).toBeDisabled();

      console.log('✅ Export button enable/disable follows cell selection');
    });

    test('column checkbox selects all data types for a team', async ({ page }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;
      const nonAdminUser = adminBase.getNonAdminUser();
      const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;

      const { teamA } = await seedExportFixture(adminBase, workerIndex);

      await adminBase.actAsAdmin(page);
      await adminBase.navigateToAdminUserDetailsPage(page, nonAdminUser.user_id);
      await waitForExportMatrix(page);

      const columnCheckbox = page.locator(`[data-testid="export-team-checkbox-${teamA.teamId}"]`);

      await columnCheckbox.click();
      await expect(columnCheckbox).toHaveAttribute('aria-checked', 'true');
      for (const dataType of EXPORT_DATA_TYPES) {
        await expect(
          page.locator(`[data-testid="export-cell-checkbox-${teamA.teamId}-${dataType}"]`),
        ).toHaveAttribute('aria-checked', 'true');
      }

      await columnCheckbox.click();
      await expect(columnCheckbox).toHaveAttribute('aria-checked', 'false');
      for (const dataType of EXPORT_DATA_TYPES) {
        await expect(
          page.locator(`[data-testid="export-cell-checkbox-${teamA.teamId}-${dataType}"]`),
        ).toHaveAttribute('aria-checked', 'false');
      }

      console.log('✅ Column select-all toggles every data type for the team');
    });

    test('row checkbox selects a data type across teams and shows indeterminate state', async ({
      page,
    }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;
      const nonAdminUser = adminBase.getNonAdminUser();
      const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;

      const { teamA, teamB } = await seedExportFixture(adminBase, workerIndex);

      await adminBase.actAsAdmin(page);
      await adminBase.navigateToAdminUserDetailsPage(page, nonAdminUser.user_id);
      await waitForExportMatrix(page);

      const rowCheckbox = page.locator('[data-testid="export-type-checkbox-workers"]');
      const cellA = page.locator(`[data-testid="export-cell-checkbox-${teamA.teamId}-workers"]`);
      const cellB = page.locator(`[data-testid="export-cell-checkbox-${teamB.teamId}-workers"]`);

      // Row select-all checks the cell for every team of this user
      await rowCheckbox.click();
      await expect(cellA).toHaveAttribute('aria-checked', 'true');
      await expect(cellB).toHaveAttribute('aria-checked', 'true');
      await expect(rowCheckbox).toHaveAttribute('aria-checked', 'true');

      // Unchecking one cell puts the row checkbox in the indeterminate state
      await cellA.click();
      await expect(rowCheckbox).toHaveAttribute('aria-checked', 'mixed');

      console.log('✅ Row select-all and indeterminate state work across teams');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // UI — download & exported content verification
  // ─────────────────────────────────────────────────────────────────────────

  test.describe('Export download', () => {
    test('downloads a JSON file with only the selected data types', async ({ page }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;
      const nonAdminUser = adminBase.getNonAdminUser();
      const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;

      const { teamA, scenario } = await seedExportFixture(adminBase, workerIndex, {
        loadScenario: true,
      });

      await adminBase.actAsAdmin(page);
      await adminBase.navigateToAdminUserDetailsPage(page, nonAdminUser.user_id);
      await waitForExportMatrix(page);

      await page.locator(`[data-testid="export-cell-checkbox-${teamA.teamId}-workers"]`).click();
      await page.locator(`[data-testid="export-cell-checkbox-${teamA.teamId}-shifts"]`).click();

      const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
      await page.locator('[data-testid="export-user-data-btn"]').click();
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toBe(`user-data-${nonAdminUser.user_id}.json`);

      const body = await readDownloadedJson(download);
      expect(Object.keys(body)).toEqual([teamA.name]);

      const teamData = body[teamA.name];
      expect(Object.keys(teamData).sort()).toEqual(['shifts', 'workers']);

      expect(teamData.workers).toHaveLength(scenario!.workers.length);
      const exportedWorkerIds = teamData.workers.map((w: any) => w._id).sort();
      const scenarioWorkerIds = scenario!.workers.map((w) => w.id).sort();
      expect(exportedWorkerIds).toEqual(scenarioWorkerIds);

      console.log('✅ Partial export contains exactly the selected data types');
    });

    test('full export contains all expected data and matches the API response', async ({
      page,
    }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;
      const nonAdminUser = adminBase.getNonAdminUser();
      const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;

      const { teamA, scenario } = await seedExportFixture(adminBase, workerIndex, {
        loadScenario: true,
      });

      await adminBase.actAsAdmin(page);
      await adminBase.navigateToAdminUserDetailsPage(page, nonAdminUser.user_id);
      await waitForExportMatrix(page);

      // Select everything for team A via the column checkbox
      await page.locator(`[data-testid="export-team-checkbox-${teamA.teamId}"]`).click();

      const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
      await page.locator('[data-testid="export-user-data-btn"]').click();
      const download = await downloadPromise;

      const body = await readDownloadedJson(download);
      expect(Object.keys(body)).toEqual([teamA.name]);
      const teamData = body[teamA.name];

      // 1. All 12 data type keys are present
      expect(Object.keys(teamData).sort()).toEqual([...EXPORT_DATA_TYPES].sort());

      // 2. Every exported document is a raw Mongo-shaped dict scoped to team A
      for (const dataType of EXPORT_DATA_TYPES) {
        expect(Array.isArray(teamData[dataType])).toBe(true);
        for (const doc of teamData[dataType]) {
          expect(doc._id).toMatch(OBJECT_ID_RE);
          if ('team' in doc) {
            expect(doc.team).toBe(teamA.teamId);
          }
        }
      }

      // 3. Workers: exactly the scenario workers (post-remap IDs, names, acronyms)
      expect(teamData.workers).toHaveLength(scenario!.workers.length);
      expect(teamData.workers.map((w: any) => w._id).sort()).toEqual(
        scenario!.workers.map((w) => w.id).sort(),
      );
      expect(teamData.workers.map((w: any) => w.name).sort()).toEqual(
        scenario!.workers.map((w) => w.name).sort(),
      );
      expect(teamData.workers.map((w: any) => w.acronym).sort()).toEqual(
        scenario!.workers.map((w) => w.acronym).sort(),
      );

      // 4. Shifts: scenario shifts are included (team creation adds default
      //    leave/rest shifts, so containment — not equality)
      const exportedShiftIds = new Set(teamData.shifts.map((s: any) => s._id));
      for (const shift of scenario!.shifts) {
        expect(exportedShiftIds.has(shift.id)).toBe(true);
      }

      // 5. Shift demands: same count as the scenario, referencing exported shifts
      expect(teamData.shift_demands).toHaveLength(scenario!.shift_demands.length);
      for (const demand of teamData.shift_demands) {
        expect(exportedShiftIds.has(demand.shift)).toBe(true);
      }

      // 6. Constraints: same count; shift-worker-option blocks reference
      //    exported workers (validates the loader's ID remapping round-trip)
      expect(teamData.constraints).toHaveLength(scenario!.constraints.length);
      const exportedWorkerIds = new Set(teamData.workers.map((w: any) => w._id));
      for (const constraint of teamData.constraints) {
        for (const block of constraint.blocks) {
          if (Array.isArray(block.value)) {
            for (const option of block.value) {
              if (option.id_type === 1) {
                expect(exportedWorkerIds.has(option.id)).toBe(true);
              }
            }
          }
        }
      }

      // 7. Requests: same count, referencing exported workers, approved by loader
      expect(teamData.requests).toHaveLength(scenario!.requests.length);
      for (const request of teamData.requests) {
        expect(exportedWorkerIds.has(request.worker)).toBe(true);
        expect(request.status).toBe('approved');
      }

      // 8. Schedules: same count, referencing exported constraints
      const exportedConstraintIds = new Set(teamData.constraints.map((c: any) => c._id));
      expect(teamData.schedules).toHaveLength(scenario!.schedules.length);
      for (const schedule of teamData.schedules) {
        for (const constraintId of schedule.constraint_builds) {
          expect(exportedConstraintIds.has(constraintId)).toBe(true);
        }
      }

      // 9. Data types empty in the basic_coverage scenario stay empty
      for (const dataType of [
        'specialties',
        'link_shifts',
        'dimensions',
        'dim_entries',
        'attributes',
        'shift_demand_templates',
      ]) {
        expect(teamData[dataType]).toEqual([]);
      }

      // 10. API parity: the downloaded file is a faithful dump of the API response
      const apiResponse = await adminBase.makeAdminRequest<Record<string, any>>(
        'POST',
        `/admin/users/${nonAdminUser.user_id}/export`,
        {
          selections: [{ teamId: teamA.teamId, dataTypes: [...EXPORT_DATA_TYPES] }],
        },
      );
      expect(body).toEqual(apiResponse);

      console.log('✅ Full export content verified and matches the API response');
    });

    test('multi-team export keys the file by team name with per-team selections', async ({
      page,
    }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;
      const nonAdminUser = adminBase.getNonAdminUser();
      const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;

      const { teamA, teamB, scenario } = await seedExportFixture(adminBase, workerIndex, {
        loadScenario: true,
      });

      await adminBase.actAsAdmin(page);
      await adminBase.navigateToAdminUserDetailsPage(page, nonAdminUser.user_id);
      await waitForExportMatrix(page);

      await page.locator(`[data-testid="export-cell-checkbox-${teamA.teamId}-workers"]`).click();
      await page.locator(`[data-testid="export-cell-checkbox-${teamB.teamId}-shifts"]`).click();

      const downloadPromise = page.waitForEvent('download', { timeout: 30_000 });
      await page.locator('[data-testid="export-user-data-btn"]').click();
      const download = await downloadPromise;

      const body = await readDownloadedJson(download);
      expect(Object.keys(body).sort()).toEqual([teamA.name, teamB.name].sort());

      expect(Object.keys(body[teamA.name])).toEqual(['workers']);
      expect(body[teamA.name].workers).toHaveLength(scenario!.workers.length);

      expect(Object.keys(body[teamB.name])).toEqual(['shifts']);
      // Team B has only its default (leave/rest) shifts — all scoped to team B
      expect(body[teamB.name].shifts.length).toBeGreaterThan(0);
      for (const shift of body[teamB.name].shifts) {
        expect(shift.team).toBe(teamB.teamId);
      }

      console.log('✅ Multi-team export contains per-team selections keyed by team name');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // API — authorization & validation
  // ─────────────────────────────────────────────────────────────────────────

  test.describe('API authorization and validation', () => {
    test('GET /admin/users/:id returns details for admin and 403 for non-admin', async ({}, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;
      const nonAdminUser = adminBase.getNonAdminUser();
      const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;

      const { teamA } = await seedExportFixture(adminBase, workerIndex);

      const details = await adminBase.makeAdminRequest<{
        user: { id: string; email: string };
        teams: Array<{ id: string; name: string; role: string }>;
      }>('GET', `/admin/users/${nonAdminUser.user_id}`);

      expect(details.user.id).toBe(nonAdminUser.user_id);
      expect(details.user.email).toBe(nonAdminUser.email);
      const teamEntry = details.teams.find((t) => t.id === teamA.teamId);
      expect(teamEntry).toBeDefined();
      expect(teamEntry!.name).toBe(teamA.name);
      expect(teamEntry!.role).toBe('owner');

      await expect(
        adminBase.makeNonAdminRequest('GET', `/admin/users/${nonAdminUser.user_id}`),
      ).rejects.toThrow('403');

      console.log('✅ GET /admin/users/:id — admin gets details, non-admin gets 403');
    });

    test('POST /admin/users/:id/export returns 403 for non-admin user', async ({}, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;
      const nonAdminUser = adminBase.getNonAdminUser();

      await expect(
        adminBase.makeNonAdminRequest('POST', `/admin/users/${nonAdminUser.user_id}/export`, {
          selections: [],
        }),
      ).rejects.toThrow('403');

      console.log('✅ POST /admin/users/:id/export correctly returns 403 for non-admin');
    });

    test('details and export return 404 for an unknown user', async ({}, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;

      await expect(
        adminBase.makeAdminRequest('GET', `/admin/users/${UNKNOWN_USER_ID}`),
      ).rejects.toThrow('404');

      await expect(
        adminBase.makeAdminRequest('POST', `/admin/users/${UNKNOWN_USER_ID}/export`, {
          selections: [],
        }),
      ).rejects.toThrow('404');

      console.log('✅ Unknown user returns 404 for details and export');
    });

    test('export returns 400 for a team not owned by the target user', async ({}, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;
      const adminUser = adminBase.getAdminUser();
      const nonAdminUser = adminBase.getNonAdminUser();
      const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;

      // Team owned by the admin — not by the export target (TEST_USER_2)
      const foreignTeam = await adminBase.createTeamForUser(
        `UD-${workerIndex}-${randomUUID().slice(0, 8)}-foreign`,
        adminUser.user_id,
      );

      await expect(
        adminBase.makeAdminRequest('POST', `/admin/users/${nonAdminUser.user_id}/export`, {
          selections: [{ teamId: foreignTeam.teamId, dataTypes: ['workers'] }],
        }),
      ).rejects.toThrow('400');

      console.log('✅ Export rejects a team that does not belong to the target user');
    });

    test('export returns 400 for an unknown data type', async ({}, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;
      const nonAdminUser = adminBase.getNonAdminUser();
      const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;

      const { teamA } = await seedExportFixture(adminBase, workerIndex);

      await expect(
        adminBase.makeAdminRequest('POST', `/admin/users/${nonAdminUser.user_id}/export`, {
          selections: [{ teamId: teamA.teamId, dataTypes: ['not_a_type'] }],
        }),
      ).rejects.toThrow('400');

      console.log('✅ Export rejects unknown data types');
    });
  });
});
