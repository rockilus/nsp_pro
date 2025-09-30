/**
 * Shared base functionality for constraint E2E tests
 *
 * This module provides common setup and navigation utilities for constraint tests,
 * reducing duplication across multiple constraint test files.
 */

import { Page } from "@playwright/test";
import { DatabaseTestUtils } from "./database-utils";
import { ConstraintT, TemplateT } from "../../src/types/constraint";
import {
  ShiftT,
  ShiftType,
  ShiftRestType,
  ShiftLeaveType,
} from "../../src/types/shift";
import { WorkerT } from "../../src/types/worker";
import dayjs from "dayjs";

export class ConstraintTestBase {
  protected dbUtils: DatabaseTestUtils;
  protected testTeam: { teamId: string; name: string } | null = null;

  constructor() {
    this.dbUtils = new DatabaseTestUtils();
  }

  /**
   * Performs the common setup for constraint tests:
   * - Waits for API ready
   * - Verifies test utilities are available
   * - Resets constraint-related database collections
   * - Creates a test team
   */
  async setupConstraintTests(workerIndex: number): Promise<void> {
    // Wait for API to be ready
    await this.dbUtils.waitForApiReady();

    // Verify test utilities are available
    const health = await this.dbUtils.checkHealth();
    if (!health.test_utilities_available) {
      throw new Error("Test utilities are not available");
    }

    // Reset constraint-related data (constraints, templates, workers, shifts, etc.)
    await this.dbUtils.resetSchedulingData();

    // Create a test team
    const teamName = `Constraint Test Team ${workerIndex}-${Date.now()}`;
    this.testTeam = await this.dbUtils.createTeam({ name: teamName });
    console.log(
      `Created test team: ${this.testTeam.name} (${this.testTeam.teamId})`
    );
  }

  /**
   * Sets the selected team directly in localStorage and navigates to constraints page
   * This bypasses the UI navigation for faster test execution
   */
  async navigateToConstraintsPageDirect(page: Page): Promise<void> {
    if (!this.testTeam) {
      throw new Error("No test team created. Call setupConstraintTests first.");
    }

    // Set the selected team in localStorage to bypass team selection
    await page.addInitScript((teamData) => {
      localStorage.setItem("selectedTeam", JSON.stringify(teamData));
    }, this.testTeam);

    // Navigate directly to the constraints page with the team context
    // Using the en language for consistency in tests
    await page.goto(`http://localhost:3000/en/plan/constraints`);

    // Wait for the page to load and the constraints tab to be visible
    await page.waitForSelector('[data-testid="constraint-tab"]', {
      timeout: 10000,
    });

    // Verify we're on the correct page
    const url = page.url();
    console.log(`Navigated to constraints page: ${url}`);

    // Wait for loading to complete
    await page
      .waitForSelector('[data-testid="constraints-loading"]', {
        state: "hidden",
        timeout: 5000,
      })
      .catch(() => {
        console.log("No loading indicator found or already hidden");
      });
  }

  /**
   * Navigates to the constraints page for the test team
   * This should be called in beforeEach for consistent navigation
   * Uses direct navigation for faster test execution
   */
  async navigateToConstraintsPage(page: Page): Promise<void> {
    await this.navigateToConstraintsPageDirect(page);
  }

  /**
   * Creates a test worker using the API
   */
  async createTestWorker(workerData: {
    name: string;
    acronym?: string;
    weeklyHours?: number;
    weeklyHoursDesired?: number;
    dutiesPerMonth?: number;
    annualLeave?: number;
  }): Promise<{ workerId: string; name: string; teamId: string }> {
    if (!this.testTeam) {
      throw new Error("No test team created. Call setupConstraintTests first.");
    }

    return await this.dbUtils.createWorker({
      teamId: this.testTeam.teamId,
      ...workerData,
    });
  }

  /**
   * Creates a test shift using the API
   */
  async createTestShift(shiftData: {
    name: string;
    startTime?: dayjs.Dayjs;
    endTime?: dayjs.Dayjs;
    shiftType?: ShiftType;
    restType?: ShiftRestType;
    leaveType?: ShiftLeaveType;
    color?: string;
    acronym?: string;
  }): Promise<ShiftT> {
    if (!this.testTeam) {
      throw new Error("No test team created. Call setupConstraintTests first.");
    }

    const defaultShiftData = {
      teamId: this.testTeam.teamId,
      startTime: dayjs().hour(9).minute(0).second(0),
      endTime: dayjs().hour(17).minute(0).second(0),
      shiftType: ShiftType.DUTY,
      restType: ShiftRestType.NONE,
      leaveType: ShiftLeaveType.NONE,
      color: "#1976d2",
      ...shiftData,
    };

    return await this.dbUtils.createShift(defaultShiftData);
  }

  /**
   * Deletes a test worker using the API
   */
  async deleteTestWorker(workerId: string): Promise<void> {
    if (!this.testTeam) {
      throw new Error("No test team created. Call setupConstraintTests first.");
    }

    return await this.dbUtils.deleteWorker(workerId, this.testTeam.teamId);
  }

  /**
   * Gets the add constraint button
   */
  getAddConstraintButton(page: Page) {
    return page.locator('[data-testid="add-constraint-button"]');
  }

  /**
   * Gets the new constraint dialog
   */
  getNewConstraintDialog(page: Page) {
    return page.locator('[data-testid="new-constraint-dialog"]');
  }

  /**
   * Gets the constraint template list
   */
  getTemplateList(page: Page) {
    return page.locator('[data-testid="template-list"]');
  }

  /**
   * Gets a specific template item by index
   */
  getTemplateItem(page: Page, index: number = 0) {
    return page.locator(`[data-testid="template-item-${index}"]`);
  }

  /**
   * Gets the constraint edit form
   */
  getConstraintEditForm(page: Page) {
    return page.locator('[data-testid="constraint-edit-form"]');
  }

  /**
   * Gets the constraint block display by index
   */
  getConstraintBlock(page: Page, blockIndex: number) {
    return page.locator(`[data-testid="constraint-block-${blockIndex}"]`);
  }

  /**
   * Gets the constraint block placeholder by index
   */
  getConstraintBlockPlaceholder(page: Page, blockIndex: number) {
    return page.locator(
      `[data-testid="constraint-block-placeholder-${blockIndex}"]`
    );
  }

  /**
   * Gets the save/add constraint button in the edit form
   */
  getSaveConstraintButton(page: Page) {
    return page.locator('[data-testid="save-constraint-button"]');
  }

  /**
   * Gets the constraint list
   */
  getConstraintList(page: Page) {
    return page.locator('[data-testid="constraint-list"]');
  }

  /**
   * Gets a specific constraint item by index
   */
  getConstraintItem(page: Page, index: number = 0) {
    return page.locator(`[data-testid="constraint-item-${index}"]`);
  }

  /**
   * Gets the shift-worker option selection dialog
   */
  getShiftWorkerOptionDialog(page: Page) {
    return page.locator('[data-testid="shift-worker-option-dialog"]');
  }

  /**
   * Gets worker options in the selection dialog
   */
  getWorkerOptions(page: Page) {
    return page.locator('[data-testid="worker-option"]');
  }

  /**
   * Gets shift options in the selection dialog
   */
  getShiftOptions(page: Page) {
    return page.locator('[data-testid="shift-option"]');
  }

  /**
   * Gets the confirm selection button in dialogs
   */
  getConfirmSelectionButton(page: Page) {
    return page.locator('[data-testid="confirm-selection-button"]');
  }

  /**
   * Opens the add constraint dialog
   */
  async openAddConstraintDialog(page: Page): Promise<void> {
    const addButton = this.getAddConstraintButton(page);
    await addButton.click();

    // Wait for dialog to open
    const dialog = this.getNewConstraintDialog(page);
    await dialog.waitFor({ state: "visible" });
  }

  /**
   * Selects a template by index
   */
  async selectTemplate(page: Page, templateIndex: number = 0): Promise<void> {
    const templateItem = this.getTemplateItem(page, templateIndex);
    await templateItem.click();

    // Wait for the constraint edit form to appear
    const editForm = this.getConstraintEditForm(page);
    await editForm.waitFor({ state: "visible" });
  }

  /**
   * Clicks on a constraint block placeholder to open selection
   */
  async clickConstraintBlockPlaceholder(
    page: Page,
    blockIndex: number
  ): Promise<void> {
    const placeholder = this.getConstraintBlockPlaceholder(page, blockIndex);
    await placeholder.click();
  }

  /**
   * Selects workers in the shift-worker option dialog
   */
  async selectWorkers(page: Page, workerNames: string[]): Promise<void> {
    const dialog = this.getShiftWorkerOptionDialog(page);
    await dialog.waitFor({ state: "visible" });

    for (const workerName of workerNames) {
      const workerOption = page.locator(
        `[data-testid="worker-option"][text="${workerName}"]`
      );
      await workerOption.click();
    }

    const confirmButton = this.getConfirmSelectionButton(page);
    await confirmButton.click();
  }

  /**
   * Selects shifts in the shift-worker option dialog
   */
  async selectShifts(page: Page, shiftNames: string[]): Promise<void> {
    const dialog = this.getShiftWorkerOptionDialog(page);
    await dialog.waitFor({ state: "visible" });

    for (const shiftName of shiftNames) {
      const shiftOption = page.locator(
        `[data-testid="shift-option"][text="${shiftName}"]`
      );
      await shiftOption.click();
    }

    const confirmButton = this.getConfirmSelectionButton(page);
    await confirmButton.click();
  }

  /**
   * Saves the constraint
   */
  async saveConstraint(page: Page): Promise<void> {
    const saveButton = this.getSaveConstraintButton(page);
    await saveButton.click();
  }

  /**
   * Waits for the constraint to appear in the list
   */
  async waitForConstraintInList(
    page: Page,
    constraintText: string
  ): Promise<void> {
    const constraintList = this.getConstraintList(page);
    await constraintList
      .locator(`text=${constraintText}`)
      .waitFor({ state: "visible" });
  }

  /**
   * Checks if validation errors are displayed
   */
  async hasValidationErrors(page: Page): Promise<boolean> {
    const errorElements = page.locator(
      '[data-testid*="constraint-block-error"]'
    );
    const count = await errorElements.count();
    return count > 0;
  }

  /**
   * Gets validation error elements
   */
  getValidationErrors(page: Page) {
    return page.locator('[data-testid*="constraint-block-error"]');
  }
}
