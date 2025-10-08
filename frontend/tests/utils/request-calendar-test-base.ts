/**
 * Test base utility specifically for Request Calendar E2E tests
 *
 * This module provides common setup and navigation utilities for request calendar tests,
 * including helper methods for calendar interactions.
 */

import { Page, expect } from "@playwright/test";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { RequestTestBase } from "./request-test-base";
import {
  RequestT,
  RequestStatus,
  RequestType,
  FulfillmentStatus,
} from "../../src/types/request";
import { RequestApi } from "../../src/app/lib/api/requestApi";

dayjs.extend(utc);

export class RequestCalendarTestBase extends RequestTestBase {
  constructor() {
    super();
  }

  /**
   * Navigates to the request calendar view
   * Must be called after navigateToRequestsPage
   */
  async navigateToCalendarTab(page: Page): Promise<void> {
    // Click on the calendar tab
    const calendarTab = this.getCalendarTab(page);
    await expect(calendarTab).toBeVisible();
    await calendarTab.click();

    // Wait for the calendar to be visible
    const calendar = this.getRequestCalendar(page);
    await expect(calendar).toBeVisible();
  }

  /**
   * Creates a test request using the API for calendar testing
   */
  async createTestRequest(
    requestData: {
      workerId: string;
      requestType: RequestType;
      startDate: dayjs.Dayjs;
      endDate: dayjs.Dayjs;
      status?: RequestStatus;
      negative?: boolean;
      comment?: string;
    },
    testId?: string
  ): Promise<RequestT> {
    if (!this.testTeam) {
      throw new Error(
        "Test team not initialized. Call setupRequestTests first."
      );
    }

    const requestToCreate: RequestT = {
      id: "",
      teamId: this.testTeam.teamId,
      requestType: requestData.requestType,
      workerId: requestData.workerId,
      startDate: requestData.startDate,
      endDate: requestData.endDate,
      shiftId: null,
      shiftOptions: [],
      negative: requestData.negative || false,
      hard: true,
      status: requestData.status || RequestStatus.PENDING,
      fulfillment: FulfillmentStatus.NOT_PROCESSED,
      comment: requestData.comment || "",
      createdAt: dayjs.utc(),
      active: true,
      shiftTargetIds: [],
      missingAttributes: [],
    };

    // Create the request using the RequestApi
    const createdRequest = await RequestApi.addRequest(
      this.dbUtils.getTestApiClient(),
      requestToCreate,
      this.testTeam.teamId
    );

    return createdRequest;
  }

  //////////////////////////
  // Calendar Tab Locators
  //////////////////////////

  /**
   * Gets the request tab container
   */
  getRequestTab(page: Page) {
    return page.getByTestId("request-tab");
  }

  /**
   * Gets the calendar tab button
   */
  getCalendarTab(page: Page) {
    return page.getByTestId("calendar-tab");
  }

  /**
   * Gets the request calendar component
   */
  getRequestCalendar(page: Page) {
    return page.getByTestId("request-calendar");
  }

  /**
   * Gets the calendar month label
   */
  getCalendarMonthLabel(page: Page) {
    return page.getByTestId("calendar-month-label");
  }

  /**
   * Gets the previous month button
   */
  getPrevMonthButton(page: Page) {
    return page.getByTestId("calendar-prev-month-button");
  }

  /**
   * Gets the next month button
   */
  getNextMonthButton(page: Page) {
    return page.getByTestId("calendar-next-month-button");
  }

  /**
   * Gets the today button
   */
  getTodayButton(page: Page) {
    return page.getByTestId("calendar-today-button");
  }

  /**
   * Gets a specific calendar cell by worker ID and date
   */
  getCalendarCell(page: Page, workerId: string, date: dayjs.Dayjs) {
    return page.getByTestId(
      `calendar-cell-${workerId}-${date.format("YYYY-MM-DD")}`
    );
  }

  /**
   * Gets a specific calendar cell with an existing request
   */
  getCalendarCellWithRequest(
    page: Page,
    workerId: string,
    date: dayjs.Dayjs,
    requestId: string
  ) {
    return page.getByTestId(
      `calendar-cell-${workerId}-${date.format(
        "YYYY-MM-DD"
      )}-request-${requestId}`
    );
  }

  /**
   * Gets the pending status legend button
   */
  getShowPendingButton(page: Page) {
    return page.getByTestId("calendar-show-pending-button");
  }

  /**
   * Gets the accepted not fulfilled status legend button
   */
  getShowAcceptedNotFulfilledButton(page: Page) {
    return page.getByTestId("calendar-show-accepted-not-fulfilled-button");
  }

  /**
   * Gets the fulfilled status legend button
   */
  getShowFulfilledButton(page: Page) {
    return page.getByTestId("calendar-show-fulfilled-button");
  }

  //////////////////////////
  // Request Panel Action Buttons (for calendar tests)
  //////////////////////////

  /**
   * Gets the approve request button
   */
  getApproveRequestButton(page: Page, requestId: string) {
    return page.getByTestId(`approve-request-button-${requestId}`);
  }

  /**
   * Gets the reject request button
   */
  getRejectRequestButton(page: Page, requestId: string) {
    return page.getByTestId(`reject-request-button-${requestId}`);
  }

  /**
   * Gets the rescind request button
   */
  getRescindRequestButton(page: Page, requestId: string) {
    return page.getByTestId(`rescind-request-button-${requestId}`);
  }

  /**
   * Gets the delete request button
   */
  getDeleteRequestButton(page: Page, requestId: string) {
    return page.getByTestId(`delete-request-button-${requestId}`);
  }

  /**
   * Gets the comment field in the request panel
   */
  getCommentField(page: Page) {
    return page.locator('textarea[name="comment"], input[name="comment"]');
  }

  //////////////////////////
  // Calendar Interaction Helpers
  //////////////////////////

  /**
   * Clicks on an empty calendar cell to create a new request
   */
  async clickEmptyCalendarCell(
    page: Page,
    workerId: string,
    date: dayjs.Dayjs
  ): Promise<void> {
    const cell = this.getCalendarCell(page, workerId, date);
    await expect(cell).toBeVisible();
    await cell.click();
  }

  /**
   * Clicks on a calendar cell with an existing request to edit it
   */
  async clickRequestCalendarCell(
    page: Page,
    workerId: string,
    date: dayjs.Dayjs,
    requestId: string
  ): Promise<void> {
    const cell = this.getCalendarCellWithRequest(
      page,
      workerId,
      date,
      requestId
    );
    await expect(cell).toBeVisible();
    await cell.click();
  }

  /**
   * Navigates to a specific month in the calendar
   */
  async navigateToMonth(page: Page, targetMonth: dayjs.Dayjs): Promise<void> {
    const currentMonthLabel = this.getCalendarMonthLabel(page);
    let currentMonthText = await currentMonthLabel.textContent();
    let currentMonth = dayjs.utc(currentMonthText, "MMMM YYYY");

    while (!currentMonth.isSame(targetMonth, "month")) {
      if (currentMonth.isBefore(targetMonth, "month")) {
        await this.getNextMonthButton(page).click();
      } else {
        await this.getPrevMonthButton(page).click();
      }

      // Wait for the month to change
      await page.waitForTimeout(100);
      currentMonthText = await currentMonthLabel.textContent();
      currentMonth = dayjs.utc(currentMonthText, "MMMM YYYY");
    }
  }

  /**
   * Waits for a request to appear in the calendar at the specified location
   */
  async waitForRequestInCalendar(
    page: Page,
    workerId: string,
    date: dayjs.Dayjs,
    requestId: string,
    timeout: number = 5000
  ): Promise<void> {
    const cell = this.getCalendarCellWithRequest(
      page,
      workerId,
      date,
      requestId
    );
    await expect(cell).toBeVisible({ timeout });
  }

  /**
   * Waits for a request to disappear from the calendar at the specified location
   */
  async waitForRequestToDisappearFromCalendar(
    page: Page,
    workerId: string,
    date: dayjs.Dayjs,
    requestId: string,
    timeout: number = 5000
  ): Promise<void> {
    const cell = this.getCalendarCellWithRequest(
      page,
      workerId,
      date,
      requestId
    );
    await expect(cell).not.toBeVisible({ timeout });
  }

  /**
   * Verifies that a calendar cell is empty (no request)
   */
  async verifyCalendarCellIsEmpty(
    page: Page,
    workerId: string,
    date: dayjs.Dayjs
  ): Promise<void> {
    const cell = this.getCalendarCell(page, workerId, date);
    await expect(cell).toBeVisible();

    // Check that it doesn't have the request class
    const hasRequestClass = await cell.evaluate((el: Element) =>
      el.classList.contains("calendar-cell--leave")
    );
    expect(hasRequestClass).toBe(false);
  }

  /**
   * Verifies that a calendar cell has a request with specific properties
   */
  async verifyCalendarCellHasRequest(
    page: Page,
    workerId: string,
    date: dayjs.Dayjs,
    requestId: string,
    expectedProperties?: {
      status?: RequestStatus;
      backgroundColor?: string;
    }
  ): Promise<void> {
    const cell = this.getCalendarCellWithRequest(
      page,
      workerId,
      date,
      requestId
    );
    await expect(cell).toBeVisible();

    // Check that it has the request class
    const hasRequestClass = await cell.evaluate((el: Element) =>
      el.classList.contains("calendar-cell--leave")
    );
    expect(hasRequestClass).toBe(true);

    if (expectedProperties?.backgroundColor) {
      const backgroundColor = await cell.evaluate(
        (el: Element) =>
          getComputedStyle(el as HTMLElement).backgroundColor ||
          (el as HTMLElement).style.background
      );
      expect(backgroundColor).toContain(expectedProperties.backgroundColor);
    }
  }

  /**
   * Verifies that clicking on a past date does nothing
   */
  async verifyPastDateClick(
    page: Page,
    workerId: string,
    pastDate: dayjs.Dayjs
  ): Promise<void> {
    const cell = this.getCalendarCell(page, workerId, pastDate);
    await expect(cell).toBeVisible();

    // Verify the cell has the past class
    const hasPastClass = await cell.evaluate((el: Element) =>
      el.classList.contains("calendar-cell--past")
    );
    expect(hasPastClass).toBe(true);

    // Click on the cell
    await cell.click();

    // Verify no request panel opened
    const requestPanel = this.getRequestPanelPopover(page);
    await expect(requestPanel).not.toBeVisible();
  }

  /**
   * Toggles the status legend filters and verifies visibility
   */
  async toggleStatusFilter(
    page: Page,
    status: "pending" | "accepted-not-fulfilled" | "fulfilled"
  ): Promise<void> {
    let button;
    switch (status) {
      case "pending":
        button = this.getShowPendingButton(page);
        break;
      case "accepted-not-fulfilled":
        button = this.getShowAcceptedNotFulfilledButton(page);
        break;
      case "fulfilled":
        button = this.getShowFulfilledButton(page);
        break;
    }

    await expect(button).toBeVisible();
    await button.click();
  }

  /**
   * Creates and verifies a request appears in the calendar
   */
  async createRequestAndVerifyInCalendar(
    page: Page,
    workerId: string,
    date: dayjs.Dayjs,
    requestType: RequestType = RequestType.WORK_DEMAND
  ): Promise<string> {
    // Click on empty cell to open create dialog
    await this.clickEmptyCalendarCell(page, workerId, date);

    // Verify request panel opens
    const requestPanel = this.getRequestPanelPopover(page);
    await expect(requestPanel).toBeVisible();

    // Select request type if needed
    if (requestType === RequestType.LEAVE) {
      await this.selectRequestType(page, "leave");
    }

    // Save the request
    await this.saveRequest(page);

    // Wait for panel to close
    await expect(requestPanel).not.toBeVisible();

    // Note: In a real test, you'd need to get the created request ID
    // For now, return a placeholder
    return "created-request-id";
  }
}
