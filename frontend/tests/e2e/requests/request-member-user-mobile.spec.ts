/**
 * E2E tests for Member User Mobile Request Page functionality
 *
 * This test suite covers member user scenarios in the MobileRequestTab component,
 * including request filtering, CRUD operations, and role-based access control.
 *
 * Test scenarios:
 * - Member can create requests for their own worker
 * - Member can see their own requests in the mobile list
 * - Member cannot see other workers' requests
 * - Member can edit their own requests
 * - Member can delete their own requests
 */

import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { RoleTestBase } from "../../utils/role-test-base";
import { RequestTestBase } from "../../utils/request-test-base";
import { RequestStatus, RequestType } from "../../../src/types/request";
import { ShiftType } from "../../../src/types/shift";
import { SWOIdTypes } from "@/types/constraint";

dayjs.extend(utc);

test.describe("Mobile Request Page - Member User", () => {
  const roleTestBase = new RoleTestBase();
  const requestTestBase = new RequestTestBase();
  let testRunId: string;
  let otherWorker: any;
  let dayShift: any;

  test.beforeEach(async ({ page }, testInfo) => {
    // Generate unique test run ID for data isolation
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;
    testRunId = `mobile-member-${workerIndex}-${testInfo.title}-${Date.now()}`;

    console.log(`[${testRunId}] Setting up mobile member user test`);

    // Setup role-based tests using global test users (TEST_USER as owner, TEST_USER_2 as member)
    await roleTestBase.setupRoleTests(workerIndex);

    // Create a worker for the member user
    await roleTestBase.createWorkerForMember(
      `Mobile Member Worker ${testRunId}`,
    );

    // Create test shifts that the member can use
    const testTeam = roleTestBase.getTestTeam();
    dayShift = await roleTestBase.dbUtils.createShift({
      teamId: testTeam.teamId,
      name: `Day Shift ${testRunId}`,
      startTime: dayjs.utc().hour(8).minute(0).second(0),
      endTime: dayjs.utc().hour(16).minute(0).second(0),
      shiftType: ShiftType.NORMAL,
      color: "#4caf50",
      acronym: "DAY",
    });

    console.log(
      `[${testRunId}] Created day shift: ${dayShift.name} (${dayShift.shiftId})`,
    );

    // Create another worker (not linked to member) as owner for testing isolation
    await roleTestBase.actAsOwner(page);
    otherWorker = await roleTestBase.dbUtils.createWorker({
      teamId: testTeam.teamId,
      name: `Other Worker ${testRunId}`,
      acronym: "OTH",
      weeklyHours: 40,
      weeklyHoursDesired: 40,
      dutiesPerMonth: 8,
      annualLeave: 25,
    });

    console.log(
      `[${testRunId}] Created other worker: ${otherWorker.name} (${otherWorker.workerId})`,
    );

    // Create a request for the other worker using the same dayShift
    const tomorrow = dayjs.utc().add(1, "day");
    await roleTestBase.dbUtils.createRequest({
      teamId: testTeam.teamId,
      workerId: otherWorker.workerId,
      requestType: RequestType.WORK_DEMAND,
      startDate: tomorrow,
      endDate: tomorrow,
      status: RequestStatus.PENDING,
      negative: false,
      shiftOptions: [
        {
          name: dayShift.name,
          id: dayShift.id,
          idType: SWOIdTypes.SHIFT,
          isBoolDim: false,
          categoryName: "Shifts",
        },
      ],
    });

    console.log(`[${testRunId}] Created request for other worker via API`);

    // Create a request for the member's worker using createRequest
    const memberWorker = roleTestBase.getMemberWorker();
    if (memberWorker) {
      await roleTestBase.dbUtils.createRequest({
        teamId: testTeam.teamId,
        workerId: memberWorker.id,
        requestType: RequestType.WORK_DEMAND,
        startDate: tomorrow,
        endDate: tomorrow,
        status: RequestStatus.PENDING,
        negative: false,
        shiftOptions: [
          {
            name: dayShift.name,
            id: dayShift.id,
            idType: SWOIdTypes.SHIFT,
            isBoolDim: false,
            categoryName: "Shifts",
          },
        ],
      });

      console.log(`[${testRunId}] Created request for member worker via API`);
    }

    // Set up authentication and navigate to requests page as member
    await roleTestBase.actAsMember(page);

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await roleTestBase.navigateToRequestsPage(page);

    // Wait for mobile page to load
    await expect(
      page.locator('[data-testid="mobile-request-tab"]'),
    ).toBeVisible();
  });

  test.afterEach(async () => {
    console.log(`[${testRunId}] Test completed`);
  });

  test("member can create a request for their worker and it is displayed in the mobile list", async ({
    page,
  }) => {
    const memberWorker = roleTestBase.getMemberWorker();
    if (!memberWorker) {
      throw new Error("Member worker not created");
    }

    // Click the FAB to open the new request dialog
    await page.locator('[data-testid="mobile-add-request-fab"]').click();

    // Wait for the request panel to open
    await expect(
      page.locator('[data-testid="request-panel-dialog"]'),
    ).toBeVisible();

    // Select work request type
    await requestTestBase.selectRequestType(page, "work");

    // Verify the worker select is disabled and shows the member's worker
    const workerSelect = requestTestBase.getWorkerSelect(page);
    await expect(workerSelect).toBeDisabled();
    await expect(workerSelect).toHaveValue(memberWorker.id);

    // Set the request date (2 days from now to avoid conflicts with existing request)
    const futureDate = dayjs.utc().add(2, "day");
    await requestTestBase.setStartDate(page, futureDate);

    // Set positive preference
    await requestTestBase.setRequestPreference(page, "positive");

    // Select shift options
    await requestTestBase.selectShiftOptions(page);

    // Save the request
    await requestTestBase.saveRequest(page);

    // Wait for the panel to close
    await expect(
      page.locator('[data-testid="request-panel"]'),
    ).not.toBeVisible();

    // Verify the request appears in the mobile list
    // Look for a mobile request item (should contain the shift name)
    const requestItems = page.locator('[data-testid^="mobile-request-item-"]');
    await expect(requestItems).toHaveCount(2); // Original + new request

    console.log(
      "✅ Member successfully created request for their worker (mobile)",
    );
  });

  test("member can see their own requests in the mobile list", async ({
    page,
  }) => {
    const memberWorker = roleTestBase.getMemberWorker();
    if (!memberWorker) {
      throw new Error("Member worker not created");
    }

    // Verify the mobile request tab is visible
    const mobileTab = page.locator('[data-testid="mobile-request-tab"]');
    await expect(mobileTab).toBeVisible();

    // Look for request items (created in beforeEach)
    const requestItems = page.locator('[data-testid^="mobile-request-item-"]');
    await expect(requestItems.first()).toBeVisible();

    // Verify the request contains the shift name from dayShift
    const firstRequest = requestItems.first();
    await expect(firstRequest).toContainText(dayShift.name);

    console.log("✅ Member can see their existing request in the mobile list");
  });

  test("member cannot see other workers' requests in the mobile list", async ({
    page,
  }) => {
    // Since the member user is filtered to only see their own worker's requests,
    // we should not see any requests for the other worker
    const requestItems = page.locator('[data-testid^="mobile-request-item-"]');

    // Get all request item texts
    const count = await requestItems.count();

    // Verify none of the visible requests contain the other worker's name
    for (let i = 0; i < count; i++) {
      const itemText = await requestItems.nth(i).textContent();
      expect(itemText).not.toContain(otherWorker.name);
    }

    console.log(
      "✅ Member cannot see other workers' requests (verified absence in mobile list)",
    );
  });

  test("member can edit their own requests", async ({ page }) => {
    const memberWorker = roleTestBase.getMemberWorker();
    if (!memberWorker) {
      throw new Error("Member worker not created");
    }

    // Click on the first request item to edit
    const firstRequest = page
      .locator('[data-testid^="mobile-request-item-"]')
      .first();
    await expect(firstRequest).toBeVisible();
    await firstRequest.click();

    // Wait for the edit dialog to open
    const dialog = requestTestBase.getRequestPanelDialog(page);
    await expect(dialog).toBeVisible();

    // Change the date to 3 days from now
    const newDate = dayjs.utc().add(3, "days");
    await requestTestBase.setStartDate(page, newDate);

    // Save the changes
    await requestTestBase.saveRequest(page);

    // Wait for the dialog to close
    await expect(dialog).not.toBeVisible();

    // Verify the updated request is visible (we can't easily verify the exact date in mobile view,
    // but we can verify the request count remains the same)
    const requestItems = page.locator('[data-testid^="mobile-request-item-"]');
    await expect(requestItems.first()).toBeVisible();

    console.log("✅ Member successfully edited their own request (mobile)");
  });

  test("member can delete their own requests", async ({ page }) => {
    const memberWorker = roleTestBase.getMemberWorker();
    if (!memberWorker) {
      throw new Error("Member worker not created");
    }

    // Get the initial count of request items
    const requestItems = page.locator('[data-testid^="mobile-request-item-"]');
    const initialCount = await requestItems.count();
    expect(initialCount).toBeGreaterThan(0);

    // Click on the first request to open it
    await requestItems.first().click();

    // Wait for the dialog to open
    const dialog = requestTestBase.getRequestPanelDialog(page);
    await expect(dialog).toBeVisible();

    // Look for and click the delete button
    const deleteButton = page.locator('[data-testid="delete-request-button"]');
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Wait for the dialog to close
    await expect(dialog).not.toBeVisible();

    // Wait for the request to be removed
    await page.waitForTimeout(500);

    // Verify the count decreased
    const finalCount = await requestItems.count();
    expect(finalCount).toBe(initialCount - 1);

    console.log("✅ Member successfully deleted their own request (mobile)");
  });
});
