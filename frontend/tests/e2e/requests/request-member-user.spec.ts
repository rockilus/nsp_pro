/**
 * E2E tests for Member User Request Page functionality
 *
 * This test suite covers member user scenarios in the RequestTab component,
 * including request filtering, CRUD operations, and role-based access control.
 *
 * Test scenarios:
 * - Member can create requests for their own worker
 * - Member can see their own requests in the table
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

dayjs.extend(utc);

test.describe("Request Page - Member User", () => {
  const roleTestBase = new RoleTestBase();
  const requestTestBase = new RequestTestBase();
  let testRunId: string;

  test.beforeEach(async ({ page }, testInfo) => {
    // Generate unique test run ID for data isolation
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;
    testRunId = `member-${workerIndex}-${testInfo.title}-${Date.now()}`;

    console.log(`[${testRunId}] Setting up member user test`);

    // Setup role-based tests (creates team, owner, and member users)
    await roleTestBase.setupRoleTests(workerIndex);

    // Create a worker for the member user
    await roleTestBase.createWorkerForMember(`Member Worker ${testRunId}`);

    // Create test shifts that the member can use
    const testTeam = roleTestBase.getTestTeam();
    const dayShift = await roleTestBase.dbUtils.createShift({
      teamId: testTeam.teamId,
      name: `Day Shift ${testRunId}`,
      startTime: dayjs.utc().hour(8).minute(0).second(0),
      endTime: dayjs.utc().hour(16).minute(0).second(0),
      shiftType: ShiftType.NORMAL,
      color: "#4caf50",
      acronym: "DAY",
    });

    console.log(
      `[${testRunId}] Created day shift: ${dayShift.name} (${dayShift.shiftId})`
    );

    // Set up authentication and navigate to requests page as member
    await roleTestBase.actAsMember(page);
    await roleTestBase.navigateToRequestsPage(page);

    // Wait for page to load
    await expect(page.locator('[data-testid="request-tab"]')).toBeVisible();
  });

  test.afterEach(async () => {
    console.log(`[${testRunId}] Test completed`);
  });

  test("member can create a request for their worker and it is displayed in the table", async ({
    page,
  }) => {
    const memberWorker = roleTestBase.getMemberWorker();
    if (!memberWorker) {
      throw new Error("Member worker not created");
    }

    // Open the new request dialog
    await requestTestBase.openNewRequestPopover(page);

    // Select work request type
    await requestTestBase.selectRequestType(page, "work");

    // Select the member's worker (should be the only option)
    await requestTestBase.selectWorker(page, memberWorker.name);

    // Set the request date (tomorrow)
    const tomorrow = dayjs.utc().add(1, "day");
    await requestTestBase.setStartDate(page, tomorrow);

    // Set positive preference
    await requestTestBase.setRequestPreference(page, "positive");

    // Select shift options
    await requestTestBase.selectShiftOptions(page);

    // Save the request
    await requestTestBase.saveRequest(page);

    // Verify the request appears in the table
    await requestTestBase.verifyRequestInTable(page, {
      workerName: memberWorker.name,
      type: "work",
      date: tomorrow.format("YYYY-MM-DD"),
      preference: "positive",
    });

    console.log("✅ Member successfully created request for their worker");
  });

  test("member can see their existing requests in the table", async ({
    page,
  }) => {
    const memberWorker = roleTestBase.getMemberWorker();
    if (!memberWorker) {
      throw new Error("Member worker not created");
    }

    const testTeam = roleTestBase.getTestTeam();
    const memberUser = roleTestBase.getMemberUser();

    // Create a request via API for the member's worker
    const memberApiClient =
      roleTestBase.dbUtils.createAuthenticatedClientForUser(memberUser.userId);

    const { RequestApi } = await import("../../../src/app/lib/api/requestApi");
    const { ShiftApi } = await import("../../../src/app/lib/api/shiftApi");

    // Fetch shifts to get shift options
    const shifts = await ShiftApi.getAllShifts(
      memberApiClient,
      testTeam.teamId
    );
    const dayShift = shifts.find((s) => s.shiftType === ShiftType.NORMAL);

    if (!dayShift) {
      throw new Error("No day shift found for request creation");
    }

    const tomorrow = dayjs.utc().add(1, "day");
    const createdRequest = await RequestApi.addRequest(memberApiClient, {
      id: "",
      teamId: testTeam.teamId,
      workerId: memberWorker.workerId,
      requestType: RequestType.WORK_DEMAND,
      startDate: tomorrow,
      endDate: tomorrow,
      status: RequestStatus.PENDING,
      negative: false,
      shiftOptions: [
        {
          name: dayShift.name,
          id: dayShift.id,
          idType: "shift",
          isBoolDim: false,
          categoryName: "Shifts",
        },
      ],
      fulfillmentStatus: "unfulfilled",
      numAssignmentsFulfilled: 0,
      numAssignmentsDesired: 1,
    } as any);

    console.log(`[${testRunId}] Created request via API: ${createdRequest.id}`);

    // Reload the page to fetch the new request
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verify the request appears in the table
    const requestTable = requestTestBase.getRequestTable(page);
    await expect(requestTable).toBeVisible();

    // Look for a row containing the worker name
    const workerNameCell = page.locator(`text=${memberWorker.name}`).first();
    await expect(workerNameCell).toBeVisible();

    console.log("✅ Member can see their existing request in the table");
  });

  test("member cannot see other workers' requests in the table", async ({
    page,
  }) => {
    const memberWorker = roleTestBase.getMemberWorker();
    if (!memberWorker) {
      throw new Error("Member worker not created");
    }

    const testTeam = roleTestBase.getTestTeam();
    const ownerUser = roleTestBase.getOwnerUser();

    // Create another worker (not linked to member) as owner
    await roleTestBase.actAsOwner(page);
    const otherWorker = await roleTestBase.dbUtils.createWorker({
      teamId: testTeam.teamId,
      name: `Other Worker ${testRunId}`,
      acronym: "OTH",
      weeklyHours: 40,
      weeklyHoursDesired: 40,
      dutiesPerMonth: 8,
      annualLeave: 25,
    });

    console.log(
      `[${testRunId}] Created other worker: ${otherWorker.name} (${otherWorker.workerId})`
    );

    // Create a request for the other worker as owner
    const ownerApiClient =
      roleTestBase.dbUtils.createAuthenticatedClientForUser(ownerUser.userId);

    const { RequestApi } = await import("../../../src/app/lib/api/requestApi");
    const { ShiftApi } = await import("../../../src/app/lib/api/shiftApi");

    const shifts = await ShiftApi.getAllShifts(ownerApiClient, testTeam.teamId);
    const dayShift = shifts.find((s) => s.shiftType === ShiftType.NORMAL);

    if (!dayShift) {
      throw new Error("No day shift found for request creation");
    }

    const tomorrow = dayjs.utc().add(1, "day");
    const otherRequest = await RequestApi.addRequest(ownerApiClient, {
      id: "",
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
          idType: "shift",
          isBoolDim: false,
          categoryName: "Shifts",
        },
      ],
      fulfillmentStatus: "unfulfilled",
      numAssignmentsFulfilled: 0,
      numAssignmentsDesired: 1,
    } as any);

    console.log(
      `[${testRunId}] Created request for other worker via API: ${otherRequest.id}`
    );

    // Switch back to member user
    await roleTestBase.actAsMember(page);
    await roleTestBase.navigateToRequestsPage(page);

    // Wait for page to load
    await expect(page.locator('[data-testid="request-tab"]')).toBeVisible();

    // Verify the table does NOT contain the other worker's request
    const otherWorkerCell = page.locator(`text=${otherWorker.name}`);
    await expect(otherWorkerCell).not.toBeVisible();

    console.log(
      "✅ Member cannot see other workers' requests (verified absence)"
    );
  });

  test("member can edit their own requests", async ({ page }) => {
    const memberWorker = roleTestBase.getMemberWorker();
    if (!memberWorker) {
      throw new Error("Member worker not created");
    }

    const testTeam = roleTestBase.getTestTeam();
    const memberUser = roleTestBase.getMemberUser();

    // Create a request via API for the member's worker
    const memberApiClient =
      roleTestBase.dbUtils.createAuthenticatedClientForUser(memberUser.userId);

    const { RequestApi } = await import("../../../src/app/lib/api/requestApi");
    const { ShiftApi } = await import("../../../src/app/lib/api/shiftApi");

    const shifts = await ShiftApi.getAllShifts(
      memberApiClient,
      testTeam.teamId
    );
    const dayShift = shifts.find((s) => s.shiftType === ShiftType.NORMAL);

    if (!dayShift) {
      throw new Error("No day shift found for request creation");
    }

    const originalDate = dayjs.utc().add(1, "day");
    const createdRequest = await RequestApi.addRequest(memberApiClient, {
      id: "",
      teamId: testTeam.teamId,
      workerId: memberWorker.workerId,
      requestType: RequestType.WORK_DEMAND,
      startDate: originalDate,
      endDate: originalDate,
      status: RequestStatus.PENDING,
      negative: false,
      shiftOptions: [
        {
          name: dayShift.name,
          id: dayShift.id,
          idType: "shift",
          isBoolDim: false,
          categoryName: "Shifts",
        },
      ],
      fulfillmentStatus: "unfulfilled",
      numAssignmentsFulfilled: 0,
      numAssignmentsDesired: 1,
    } as any);

    console.log(`[${testRunId}] Created request via API: ${createdRequest.id}`);

    // Reload the page to fetch the new request
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Click the edit button for the request
    const editButton = page
      .locator(`[data-testid^="edit-request-button-"]`)
      .first();
    await expect(editButton).toBeVisible();
    await editButton.click();

    // Wait for the edit dialog to open
    const dialog = requestTestBase.getRequestPanelDialog(page);
    await expect(dialog).toBeVisible();

    // Change the date to 2 days from now
    const newDate = dayjs.utc().add(2, "days");
    await requestTestBase.setStartDate(page, newDate);

    // Save the changes
    await requestTestBase.saveRequest(page);

    // Verify the updated request appears in the table with new date
    await requestTestBase.verifyRequestInTable(page, {
      workerName: memberWorker.name,
      type: "work",
      date: newDate.format("YYYY-MM-DD"),
    });

    console.log("✅ Member successfully edited their own request");
  });

  test("member can delete their own requests", async ({ page }) => {
    const memberWorker = roleTestBase.getMemberWorker();
    if (!memberWorker) {
      throw new Error("Member worker not created");
    }

    const testTeam = roleTestBase.getTestTeam();
    const memberUser = roleTestBase.getMemberUser();

    // Create a request via API for the member's worker
    const memberApiClient =
      roleTestBase.dbUtils.createAuthenticatedClientForUser(memberUser.userId);

    const { RequestApi } = await import("../../../src/app/lib/api/requestApi");
    const { ShiftApi } = await import("../../../src/app/lib/api/shiftApi");

    const shifts = await ShiftApi.getAllShifts(
      memberApiClient,
      testTeam.teamId
    );
    const dayShift = shifts.find((s) => s.shiftType === ShiftType.NORMAL);

    if (!dayShift) {
      throw new Error("No day shift found for request creation");
    }

    const tomorrow = dayjs.utc().add(1, "day");
    const createdRequest = await RequestApi.addRequest(memberApiClient, {
      id: "",
      teamId: testTeam.teamId,
      workerId: memberWorker.workerId,
      requestType: RequestType.WORK_DEMAND,
      startDate: tomorrow,
      endDate: tomorrow,
      status: RequestStatus.PENDING,
      negative: false,
      shiftOptions: [
        {
          name: dayShift.name,
          id: dayShift.id,
          idType: "shift",
          isBoolDim: false,
          categoryName: "Shifts",
        },
      ],
      fulfillmentStatus: "unfulfilled",
      numAssignmentsFulfilled: 0,
      numAssignmentsDesired: 1,
    } as any);

    console.log(`[${testRunId}] Created request via API: ${createdRequest.id}`);

    // Reload the page to fetch the new request
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Get the initial row count
    const requestTable = requestTestBase.getRequestTable(page);
    await expect(requestTable).toBeVisible();

    const initialRows = await page
      .locator('[data-testid^="delete-request-button-"]')
      .count();

    expect(initialRows).toBeGreaterThan(0);

    // Click the delete button
    const deleteButton = page
      .locator(`[data-testid^="delete-request-button-"]`)
      .first();
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Wait for the request to be removed
    await page.waitForTimeout(500);

    // Verify the row count decreased
    const finalRows = await page
      .locator('[data-testid^="delete-request-button-"]')
      .count();

    expect(finalRows).toBe(initialRows - 1);

    console.log("✅ Member successfully deleted their own request");
  });
});
