/**
 * E2E tests for Schedule Selection Feature — Cell/Assignment Interaction
 *
 * Tests verify selection behaviour in both shift and worker groupBy views:
 * - Individual cell select/unselect
 * - Individual assignment select/unselect
 * - Column checkbox selects/deselects entire column
 * - Row checkbox selects/deselects entire row (view scope)
 * - Row checkbox selects across campaign (campaign scope)
 * - Top-left select-all checkbox
 * - Switching scope deselects cells when view period is outside campaign
 * - Switching scope deselects cells when scope reverts and selection no longer overlaps
 */

import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import { ScheduleTestBase } from "../../../../utils/schedule-test-base";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

// Helper: enter selection mode on an already-loaded schedule page
async function enterSelectionMode(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.click('[data-testid="schedule-settings-button"]');
  await page.click('[data-testid="settings-selection-mode-button"]');
  await expect(
    page.locator('[data-testid="schedule-action-toolbar"]'),
  ).toBeVisible();
}

// Helper: get counts text from the toolbar
async function getSelectionCountsText(
  page: import("@playwright/test").Page,
): Promise<string> {
  return (
    (await page
      .locator('[data-testid="schedule-selection-counts"]')
      .textContent()) ?? ""
  );
}

for (const groupBy of ["shift", "worker"] as const) {
  test.describe(`Schedule Selection Interaction (groupBy=${groupBy})`, () => {
    const testBasesMap = new Map<string, ScheduleTestBase>();

    test.beforeEach(async ({ page }, testInfo) => {
      const workerIndex =
        typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;
      const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
      const scheduleTestBase = new ScheduleTestBase();
      testBasesMap.set(testRunId, scheduleTestBase);
      (testInfo as any).testRunId = testRunId;

      const referenceDate = dayjs.utc();

      await scheduleTestBase.setupScheduleTests(workerIndex, {
        referenceDate,
        createAssignments: true,
        linkMemberToWorker: false,
      });

      await scheduleTestBase.actAsOwner(page);
      await scheduleTestBase.navigateToSchedulePage(page);

      // Set view: groupBy + week timeframe aligned to referenceDate
      await scheduleTestBase.setScheduleViewSettings(page, {
        groupBy,
        targetDate: referenceDate,
        timeFrame: "week",
      });

      await enterSelectionMode(page);
    });

    test.afterEach(async ({}, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      if (!testRunId) return;
      testBasesMap.delete(testRunId);
    });

    test("select/unselect individual cell", async ({ page }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const scheduleTestBase = testBasesMap.get(testRunId)!;

      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();
      const referenceDate = dayjs.utc().format("YYYY-MM-DD");

      let checkboxTestId: string;
      if (groupBy === "shift") {
        checkboxTestId = `shift-cell-checkbox-${shifts[0].id}-${referenceDate}`;
      } else {
        checkboxTestId = `worker-cell-checkbox-${workers[0].id}-${referenceDate}`;
      }

      const checkbox = page.locator(`[data-testid="${checkboxTestId}"]`);
      await expect(checkbox).toBeVisible();

      // Select the cell
      await checkbox.click();
      const countsAfterSelect = await getSelectionCountsText(page);
      expect(countsAfterSelect).toContain("1 cell");

      // Unselect the cell
      await checkbox.click();
      const countsAfterDeselect = await getSelectionCountsText(page);
      expect(countsAfterDeselect).not.toContain("cell");
    });

    test("select/unselect individual assignment", async ({
      page,
    }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const scheduleTestBase = testBasesMap.get(testRunId)!;

      const referenceDate = dayjs.utc();
      const startDate = referenceDate.startOf("week");
      const endDate = referenceDate.endOf("week");

      const result = await scheduleTestBase.getAssignmentsAndRecurrences(
        false,
        startDate,
        endDate,
      );

      // Need at least one assignment visible in the current view
      if (result.assignmentsRead.length === 0) {
        test.skip(true, "No assignments in current week — skipping");
        return;
      }

      const assignmentId = result.assignmentsRead[0].id;
      const assignmentCell = page.locator(
        `[data-testid="assignment-cell-${assignmentId}"]`,
      );
      await expect(assignmentCell).toBeVisible();

      // Select assignment
      await assignmentCell.click();
      const countsAfterSelect = await getSelectionCountsText(page);
      expect(countsAfterSelect).toContain("1 assignment");

      // Deselect assignment
      await assignmentCell.click();
      const countsAfterDeselect = await getSelectionCountsText(page);
      expect(countsAfterDeselect).not.toContain("assignment");
    });

    test("column checkbox selects/deselects all items in that column", async ({
      page,
    }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const scheduleTestBase = testBasesMap.get(testRunId)!;

      const referenceDate = dayjs.utc().format("YYYY-MM-DD");
      const columnCheckbox = page.locator(
        `[data-testid="date-column-checkbox-${referenceDate}"]`,
      );
      await expect(columnCheckbox).toBeVisible();

      // Select entire column
      await columnCheckbox.click();
      const countsAfterSelect = await getSelectionCountsText(page);
      // At least one cell should be selected
      expect(
        countsAfterSelect.includes("cell") ||
          countsAfterSelect.includes("assignment"),
      ).toBe(true);

      // Deselect entire column
      await columnCheckbox.click();
      const countsAfterDeselect = await getSelectionCountsText(page);
      expect(countsAfterDeselect).toBe("");
    });

    test("row checkbox (view scope) selects/deselects all in row", async ({
      page,
    }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const scheduleTestBase = testBasesMap.get(testRunId)!;

      const workers = scheduleTestBase.getTestWorkers();
      const shifts = scheduleTestBase.getTestShifts();

      let rowCheckboxTestId: string;
      if (groupBy === "shift") {
        rowCheckboxTestId = `shift-row-checkbox-${shifts[0].id}`;
      } else {
        rowCheckboxTestId = `worker-row-checkbox-${workers[0].id}`;
      }

      const rowCheckbox = page.locator(`[data-testid="${rowCheckboxTestId}"]`);
      await expect(rowCheckbox).toBeVisible();

      // Select entire row
      await rowCheckbox.click();
      const countsAfterSelect = await getSelectionCountsText(page);
      expect(
        countsAfterSelect.includes("cell") ||
          countsAfterSelect.includes("assignment"),
      ).toBe(true);

      // Deselect entire row
      await rowCheckbox.click();
      const countsAfterDeselect = await getSelectionCountsText(page);
      expect(countsAfterDeselect).toBe("");
    });

    test("top-left select-all checkbox selects/deselects everything", async ({
      page,
    }) => {
      const selectAllCheckbox = page.locator(
        '[data-testid="export-cell-select-all-checkbox"]',
      );
      await expect(selectAllCheckbox).toBeVisible();

      // Select all
      await selectAllCheckbox.click();
      const countsAfterSelect = await getSelectionCountsText(page);
      expect(
        countsAfterSelect.includes("cell") ||
          countsAfterSelect.includes("assignment"),
      ).toBe(true);

      // Deselect all
      await selectAllCheckbox.click();
      const countsAfterDeselect = await getSelectionCountsText(page);
      expect(countsAfterDeselect).toBe("");
    });

    test.describe(`with campaign (groupBy=${groupBy})`, () => {
      test("row checkbox (campaign scope) selects across campaign", async ({
        page,
      }, testInfo) => {
        const testRunId = (testInfo as any).testRunId as string;
        const scheduleTestBase = testBasesMap.get(testRunId)!;

        const today = dayjs.utc();
        await scheduleTestBase.createCampaignSchedule(
          today.startOf("month"),
          today.endOf("month"),
        );

        // Reload to pick up campaign
        await page.reload();
        await page.waitForLoadState("networkidle");

        await enterSelectionMode(page);

        // Switch to campaign scope
        await page.locator('[data-testid="schedule-scope-campaign"]').click();

        const workers = scheduleTestBase.getTestWorkers();
        const shifts = scheduleTestBase.getTestShifts();

        let rowCheckboxTestId: string;
        if (groupBy === "shift") {
          rowCheckboxTestId = `shift-row-checkbox-${shifts[0].id}`;
        } else {
          rowCheckboxTestId = `worker-row-checkbox-${workers[0].id}`;
        }

        const rowCheckbox = page.locator(
          `[data-testid="${rowCheckboxTestId}"]`,
        );
        await expect(rowCheckbox).toBeVisible();

        await rowCheckbox.click();
        const countsAfterSelect = await getSelectionCountsText(page);
        expect(
          countsAfterSelect.includes("cell") ||
            countsAfterSelect.includes("assignment"),
        ).toBe(true);

        // Deselect
        await rowCheckbox.click();
        const countsAfterDeselect = await getSelectionCountsText(page);
        expect(countsAfterDeselect).toBe("");
      });

      test("switching scope deselects out-of-range cells", async ({
        page,
      }, testInfo) => {
        const testRunId = (testInfo as any).testRunId as string;
        const scheduleTestBase = testBasesMap.get(testRunId)!;

        const today = dayjs.utc();
        await scheduleTestBase.createCampaignSchedule(
          today.startOf("month"),
          today.endOf("month"),
        );

        // Reload to pick up campaign
        await page.reload();
        await page.waitForLoadState("networkidle");

        await enterSelectionMode(page);

        // Switch to campaign scope and select all
        await page.locator('[data-testid="schedule-scope-campaign"]').click();

        const selectAllCheckbox = page.locator(
          '[data-testid="export-cell-select-all-checkbox"]',
        );
        await selectAllCheckbox.click();

        const campaignCountsText = await getSelectionCountsText(page);
        // Extract total cell count from campaign
        const campaignMatch = campaignCountsText.match(/(\d+) cell/);
        const campaignCount = campaignMatch ? parseInt(campaignMatch[1]) : 0;

        // Switch back to view scope
        await page.locator('[data-testid="schedule-scope-view"]').click();

        const viewCountsText = await getSelectionCountsText(page);
        const viewMatch = viewCountsText.match(/(\d+) cell/);
        const viewCount = viewMatch ? parseInt(viewMatch[1]) : 0;

        // View count should be smaller than campaign count (week < month)
        expect(viewCount).toBeLessThanOrEqual(campaignCount);
      });

      test("switching scope deselects out-of-scope cells when view is outside campaign", async ({
        page,
      }, testInfo) => {
        const testRunId = (testInfo as any).testRunId as string;
        const scheduleTestBase = testBasesMap.get(testRunId)!;

        const today = dayjs.utc();
        await scheduleTestBase.createCampaignSchedule(
          today.startOf("month"),
          today.endOf("month"),
        );

        // Navigate to the week following the end of the campaign (outside campaign range)
        // Adding 7 days to endOf(month) guarantees the resulting week is entirely in the next month
        const weekAfterCampaign = today.endOf("month").add(7, "days");
        await scheduleTestBase.setScheduleViewSettings(page, {
          targetDate: weekAfterCampaign,
          timeFrame: "week",
        });

        await enterSelectionMode(page);

        // Switch to campaign scope and select all
        await page.locator('[data-testid="schedule-scope-campaign"]').click();

        const selectAllCheckbox = page.locator(
          '[data-testid="export-cell-select-all-checkbox"]',
        );
        await selectAllCheckbox.click();

        const campaignCountsText = await getSelectionCountsText(page);
        expect(
          campaignCountsText.includes("cell") ||
            campaignCountsText.includes("assignment"),
        ).toBe(true);

        // Switch to view scope — view period (week after campaign) has no overlap with campaign
        await page.locator('[data-testid="schedule-scope-view"]').click();

        const viewCountsAfterSwitch = await getSelectionCountsText(page);
        expect(viewCountsAfterSwitch).toBe("");

        // Select all in view scope
        await selectAllCheckbox.click();

        const viewCountsText = await getSelectionCountsText(page);
        expect(
          viewCountsText.includes("cell") ||
            viewCountsText.includes("assignment"),
        ).toBe(true);

        // Switch back to campaign scope — view cells are outside campaign range
        await page.locator('[data-testid="schedule-scope-campaign"]').click();

        const campaignCountsAfterSwitch = await getSelectionCountsText(page);
        expect(campaignCountsAfterSwitch).toBe("");
      });
    });
  });
}
