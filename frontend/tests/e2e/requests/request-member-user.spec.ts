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

import { test, expect } from '@playwright/test';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { RoleTestBase } from '../../utils/role-test-base';
import { RequestTestBase } from '../../utils/request-test-base';
import { RequestStatus, RequestType } from '../../../src/types/request';
import { ShiftType } from '../../../src/types/shift';
import { WorkerT } from '../../../src/types/worker';

dayjs.extend(utc);

test.describe('Request Page - Member User', () => {
  const roleTestBase = new RoleTestBase();
  const requestTestBase = new RequestTestBase();
  let testRunId: string;
  let otherWorker: WorkerT;

  test.beforeEach(async ({ page }, testInfo) => {
    // Generate unique test run ID for data isolation
    const workerIndex = typeof testInfo.workerIndex === 'number' ? testInfo.workerIndex : 0;
    testRunId = `member-${workerIndex}-${testInfo.title}-${Date.now()}`;

    console.log(`[${testRunId}] Setting up member user test`);

    // Setup role-based tests using global test users (TEST_USER as owner, TEST_USER_2 as member)
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
      color: '#4caf50',
      acronym: 'DAY',
    });

    console.log(`[${testRunId}] Created day shift: ${dayShift.name} (${dayShift.id})`);

    // Create another worker (not linked to member) as owner for testing isolation
    await roleTestBase.actAsOwner(page);
    otherWorker = await roleTestBase.dbUtils.createWorker({
      teamId: testTeam.teamId,
      name: `Other Worker ${testRunId}`,
      acronym: 'OTH',
      weeklyHours: 40,
      weeklyHoursDesired: 40,
      dutiesPerMonth: 8,
      annualLeave: 25,
    });

    console.log(`[${testRunId}] Created other worker: ${otherWorker.name} (${otherWorker.id})`);

    // Create a request for the other worker using the same dayShift
    expect(otherWorker).toBeDefined();

    const tomorrow = dayjs.utc().add(1, 'day');
    await roleTestBase.dbUtils.createRequest({
      teamId: testTeam.teamId,
      workerId: otherWorker.id,
      requestType: RequestType.WORK_DEMAND,
      startDate: tomorrow,
      endDate: tomorrow,
      status: RequestStatus.PENDING,
      negative: false,
      shiftOptions: [
        {
          name: dayShift.name,
          id: dayShift.id,
          idType: 2,
          isBoolDim: false,
          categoryName: 'Shifts',
        },
      ],
    });

    console.log(`[${testRunId}] Created request for other worker via API`);

    // Create a request for the member's worker using createRequest
    const memberWorker = roleTestBase.getMemberWorker();

    expect(memberWorker).toBeDefined();
    if (!memberWorker) {
      throw new Error('Member worker not created');
    }

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
          idType: 2,
          isBoolDim: false,
          categoryName: 'Shifts',
        },
      ],
    });

    console.log(`[${testRunId}] Created request for member worker via API`);

    // Set up authentication and navigate to requests page as member
    await roleTestBase.actAsMember(page);
    await roleTestBase.navigateToRequestsPage(page);

    // Wait for page to load and ensure the table shows the requests
    await expect(page.locator('[data-testid="request-tab"]')).toBeVisible();
    await expect(requestTestBase.getRequestTable(page)).toBeVisible();
  });

  test.afterEach(async () => {
    console.log(`[${testRunId}] Test completed`);
  });

  test('member can create a request for their worker and it is displayed in the table', async ({
    page,
  }) => {
    const memberWorker = roleTestBase.getMemberWorker();
    if (!memberWorker) {
      throw new Error('Member worker not created');
    }

    // Open the new request dialog
    await requestTestBase.openNewRequestPopover(page);

    // Select work request type
    await requestTestBase.selectRequestType(page, 'work');

    // Verify the worker select is disabled and shows the member's worker
    const workerSelect = requestTestBase.getWorkerSelect(page);
    await expect(workerSelect).toBeDisabled();
    await expect(workerSelect).toHaveValue(memberWorker.id);

    // Set the request date (the day after tomorrow)
    const tomorrow = dayjs.utc().add(2, 'day');
    await requestTestBase.setStartDate(page, tomorrow);

    // Set positive preference
    await requestTestBase.setRequestPreference(page, 'positive');

    // Select shift options
    await requestTestBase.selectShiftOptions(page);

    // Save the request
    await requestTestBase.saveRequest(page);

    // Verify the request appears in the table
    await requestTestBase.verifyRequestInTable(page, {
      workerName: memberWorker.name,
      type: 'work',
      date: tomorrow.format('YYYY-MM-DD'),
      preference: 'positive',
    });

    console.log('✅ Member successfully created request for their worker');
  });

  test('member can see their existing requests in the table', async ({ page }) => {
    const memberWorker = roleTestBase.getMemberWorker();
    if (!memberWorker) {
      throw new Error('Member worker not created');
    }

    // Verify the request appears in the table (created in beforeEach)
    const requestTable = requestTestBase.getRequestTable(page);
    await expect(requestTable).toBeVisible();

    // Look for a row containing the worker name
    const workerNameCell = page.locator(`text=${memberWorker.name}`).first();
    await expect(workerNameCell).toBeVisible();

    console.log('✅ Member can see their existing request in the table');
  });

  test("member cannot see other workers' requests in the table", async ({ page }) => {
    // Verify the table does NOT contain the other worker's request
    const otherWorkerCell = page.locator(`text=${otherWorker.name}`);
    await expect(otherWorkerCell).not.toBeVisible();

    console.log("✅ Member cannot see other workers' requests (verified absence)");
  });

  test('member can edit their own requests', async ({ page }) => {
    const memberWorker = roleTestBase.getMemberWorker();
    if (!memberWorker) {
      throw new Error('Member worker not created');
    }

    // Click the edit button for the request created in beforeEach
    const editButton = page.locator(`[data-testid^="edit-request-button-"]`).first();
    await expect(editButton).toBeVisible();
    await editButton.click();

    // Wait for the edit dialog to open
    const dialog = requestTestBase.getRequestPanelDialog(page);
    await expect(dialog).toBeVisible();

    // Change the date to 2 days from now
    const newDate = dayjs.utc().add(2, 'days');
    await requestTestBase.setStartDate(page, newDate);

    // Save the changes
    await requestTestBase.saveRequest(page);

    // Verify the updated request appears in the table with new date
    await requestTestBase.verifyRequestInTable(page, {
      workerName: memberWorker.name,
      type: 'work',
      date: newDate.format('YYYY-MM-DD'),
    });

    console.log('✅ Member successfully edited their own request');
  });

  test('member can delete their own requests', async ({ page }) => {
    const memberWorker = roleTestBase.getMemberWorker();
    if (!memberWorker) {
      throw new Error('Member worker not created');
    }

    // Get the initial row count (request created in beforeEach)
    const requestTable = requestTestBase.getRequestTable(page);
    await expect(requestTable).toBeVisible();

    const initialRows = await page.locator('[data-testid^="delete-request-button-"]').count();

    expect(initialRows).toBeGreaterThan(0);

    // Click the delete button for the first request (member's request from beforeEach)
    const deleteButton = page.locator(`[data-testid^="delete-request-button-"]`).first();
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Wait for the request to be removed
    await page.waitForTimeout(500);

    // Verify the row count decreased
    const finalRows = await page.locator('[data-testid^="delete-request-button-"]').count();

    expect(finalRows).toBe(initialRows - 1);

    console.log('✅ Member successfully deleted their own request');
  });
});
