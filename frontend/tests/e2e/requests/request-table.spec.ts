import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { RequestTestBase } from "../../utils/request-test-base";

dayjs.extend(utc);

test.describe("Request Table actions", () => {
  const base = new RequestTestBase();

  test.beforeEach(async ({ page }, testInfo) => {
    // Setup environment: create team, workers and shifts
    const workerIndex = 0;
    const testId = `${workerIndex}-${testInfo.title}-${Date.now()}`;
    await base.setupRequestTests(workerIndex, testId);
    await base.navigateToRequestsPage(page);

    // Create a single work request via the Request API by opening the panel and saving
    await base.openNewRequestPopover(page);
    await base.selectRequestType(page, "work");
    const workers = base.getTestWorkers(testId);
    await base.selectWorker(page, workers[0].name);
    const tomorrow = dayjs.utc().add(1, "day");
    await base.setStartDate(page, tomorrow);
    await base.setRequestPreference(page, "positive");
    await base.selectShiftOptions(page);
    await base.saveRequest(page);

    // Ensure the table shows the newly created request
    await expect(base.getRequestTable(page)).toBeVisible();
  });

  test.afterEach(async ({}, testInfo) => {
    // Cleanup any test data created for this run
    const testRunId = (testInfo as any).testRunId as string;
    // RequestTestBase created resources are cleaned per its maps; call cleanup if available
    try {
      // If the test stored a testId on testInfo, attempt cleanup
      if (testRunId) {
        await base.cleanupTestData(testRunId);
      }
    } catch (e) {
      // ignore
    }
  });

  test("Click on the edit button opens the edit request panel", async ({
    page,
  }) => {
    const table = base.getRequestTable(page);
    await expect(table).toBeVisible();

    // Find the first request id by locating the edit button inside the table
    const editButton = await page
      .locator('[data-testid^="edit-request-button-"]')
      .first();
    await expect(editButton).toBeVisible();
    await editButton.click();

    const popover = base.getRequestPanelPopover(page);
    await expect(popover).toBeVisible();
  });

  test("Click on the delete button deletes the request", async ({ page }) => {
    // Wait for a delete button to appear and click it
    const deleteButton = await page
      .locator('[data-testid^="delete-request-button-"]')
      .first();
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // The row should be removed from the table
    await expect(deleteButton).toHaveCount(0);
  });

  test("Click on the checkmark changes the request status to approved", async ({
    page,
  }) => {
    const approveButton = await page
      .locator('[data-testid^="approve-request-button-"]')
      .first();
    await expect(approveButton).toBeVisible();
    await approveButton.click();

    // Status chip should change to approved
    const statusChip = page.locator("text=/approved/i").first();
    await expect(statusChip).toBeVisible();
  });

  test("Click on the rescind button for an approved request reverts status to pending", async ({
    page,
  }) => {
    // Approve first
    const approveButton = await page
      .locator('[data-testid^="approve-request-button-"]')
      .first();
    await approveButton.click();

    // Rescind should appear
    const rescindButton = await page
      .locator('[data-testid^="rescind-request-button-"]')
      .first();
    await expect(rescindButton).toBeVisible();
    await rescindButton.click();

    // Status chip should be pending
    const pendingChip = page.locator("text=/pending/i").first();
    await expect(pendingChip).toBeVisible();
  });

  test("Click on the close icon changes the request status to rejected", async ({
    page,
  }) => {
    const rejectButton = await page
      .locator('[data-testid^="reject-request-button-"]')
      .first();
    await expect(rejectButton).toBeVisible();
    await rejectButton.click();

    const rejectedChip = page.locator("text=/rejected|denied/i").first();
    await expect(rejectedChip).toBeVisible();
  });
});
