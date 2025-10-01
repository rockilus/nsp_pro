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
  protected testWorkers: { workerId: string; name: string; teamId: string }[] =
    [];
  protected testShifts: ShiftT[] = [];

  constructor() {
    this.dbUtils = new DatabaseTestUtils();
  }

  /**
   * Performs the common setup for constraint tests:
   * - Waits for API ready
   * - Verifies test utilities are available
   * - Creates a test team
   * - Creates test workers and shifts
   */
  async setupConstraintTests(workerIndex: number): Promise<void> {
    // Wait for API to be ready
    await this.dbUtils.waitForApiReady();

    // Verify test utilities are available
    const health = await this.dbUtils.checkHealth();
    if (!health.test_utilities_available) {
      throw new Error("Test utilities are not available");
    }

    // Create a test team
    const teamName = `Constraint Test Team ${workerIndex}-${Date.now()}`;
    this.testTeam = await this.dbUtils.createTeam({ name: teamName });
    console.log(
      `Created test team: ${this.testTeam.name} (${this.testTeam.teamId})`
    );

    // Create test workers
    this.testWorkers = [];
    const worker1 = await this.createTestWorker({
      name: `Test Worker 1 ${workerIndex}-${Date.now()}`,
      weeklyHours: 40,
      weeklyHoursDesired: 40,
      dutiesPerMonth: 4,
      annualLeave: 25,
    });
    const worker2 = await this.createTestWorker({
      name: `Test Worker 2 ${workerIndex}-${Date.now()}`,
      weeklyHours: 35,
      weeklyHoursDesired: 35,
      dutiesPerMonth: 3,
      annualLeave: 30,
    });
    this.testWorkers.push(worker1, worker2);

    // Create test shifts
    this.testShifts = [];
    const shift1 = await this.createTestShift({
      name: `Morning Shift ${workerIndex}-${Date.now()}`,
      acronym: "MS",
    });
    const shift2 = await this.createTestShift({
      name: `Evening Shift ${workerIndex}-${Date.now()}`,
      acronym: "ES",
    });
    this.testShifts.push(shift1, shift2);

    console.log(
      `Created test workers: ${this.testWorkers.map((w) => w.name).join(", ")}`
    );
    console.log(
      `Created test shifts: ${this.testShifts.map((s) => s.name).join(", ")}`
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
   * Gets the test workers created during setup
   */
  getTestWorkers(): { workerId: string; name: string; teamId: string }[] {
    return this.testWorkers;
  }

  /**
   * Gets the test shifts created during setup
   */
  getTestShifts(): ShiftT[] {
    return this.testShifts;
  }

  /**
   * Deletes all test workers created during setup
   */
  async deleteAllTestWorkers(): Promise<void> {
    if (!this.testTeam) {
      throw new Error("No test team created. Call setupConstraintTests first.");
    }

    for (const worker of this.testWorkers) {
      try {
        await this.dbUtils.deleteWorker(worker.workerId, this.testTeam.teamId);
      } catch (error) {
        console.warn(`Failed to delete worker ${worker.name}:`, error);
      }
    }
    this.testWorkers = [];
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
   * Gets a specific constraint item by constraint ID
   */
  getConstraintItemById(page: Page, constraintId: string) {
    return page.locator(`[data-testid="constraint-item-${constraintId}"]`);
  }

  /**
   * Gets the constraint text for a specific constraint
   */
  getConstraintText(page: Page, constraintId: string) {
    return page.locator(`[data-testid="constraint-text-${constraintId}"]`);
  }

  /**
   * Gets the hard/soft button for a specific constraint
   */
  getConstraintHardSoftButton(page: Page, constraintId: string) {
    return page.locator(
      `[data-testid="constraint-hard-soft-button-${constraintId}"]`
    );
  }

  /**
   * Gets the edit button for a specific constraint
   */
  getConstraintEditButton(page: Page, constraintId: string) {
    return page.locator(
      `[data-testid="constraint-edit-button-${constraintId}"]`
    );
  }

  /**
   * Gets the delete button for a specific constraint
   */
  getConstraintDeleteButton(page: Page, constraintId: string) {
    return page.locator(
      `[data-testid="constraint-delete-button-${constraintId}"]`
    );
  }

  /**
   * Gets the edit popup (menu)
   */
  getConstraintEditPopup(page: Page) {
    return page.locator('[data-testid="constraint-edit-popup"]');
  }

  /**
   * Gets the save constraint button in the edit form
   */
  getConstraintSaveButton(page: Page) {
    return page.locator('[data-testid="save-constraint-button"]');
  }

  /**
   * Waits for constraint list to load
   */
  async waitForConstraintListLoad(page: Page): Promise<void> {
    await page.waitForSelector('[data-testid="constraint-list"]', {
      timeout: 10000,
    });
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
   * Fills a constraint placeholder with the first available option
   */
  async fillPlaceholderWithFirstOption(
    page: Page,
    placeholderIndex: number
  ): Promise<void> {
    console.log(`Attempting to fill placeholder ${placeholderIndex}...`);

    // Click on the placeholder
    const placeholders = page.locator(
      '[data-testid^="constraint-block-placeholder-"]'
    );
    const placeholder = placeholders.nth(placeholderIndex);
    await placeholder.click({ force: true });

    // Look for shift-worker option dialog (for worker/shift selections)
    const dialogSelectors = [
      '[data-testid^="shift-worker-option-dialog-"]',
      '[role="dialog"]:visible',
      ".MuiPopover-root:visible",
      ".MuiDialog-root:visible",
    ];

    for (const selector of dialogSelectors) {
      const dialog = page.locator(selector).first();
      if (await dialog.isVisible({ timeout: 2000 })) {
        console.log(
          `✅ Selection dialog opened for placeholder: "${await placeholder.textContent()}" using selector: ${selector}`
        );

        // Try to select the first available option
        const optionSelectors = [
          '[data-testid^="worker-option"]',
          '[data-testid^="shift-option"]',
          ".MuiMenuItem",
          '.MuiListItem[role="button"]',
          'li[role="option"]',
        ];

        for (const optionSelector of optionSelectors) {
          const options = dialog.locator(optionSelector);
          const optionCount = await options.count();
          if (optionCount > 0) {
            await options.first().click();
            console.log(
              `✅ Selected first option using selector: ${optionSelector}`
            );

            // Look for and click confirm button
            const confirmSelectors = [
              '[data-testid="confirm-selection-button"]',
              'button:has-text("Confirm")',
              'button:has-text("OK")',
              'button:has-text("Save")',
              'button:has-text("Apply")',
            ];

            for (const confirmSelector of confirmSelectors) {
              const confirmButton = dialog.locator(confirmSelector);
              if (await confirmButton.isVisible({ timeout: 1000 })) {
                await confirmButton.click();
                console.log(
                  `✅ Clicked confirm button using selector: ${confirmSelector}`
                );
                break;
              }
            }

            // Close the dialog if still open
            if (await dialog.isVisible({ timeout: 500 })) {
              await page.keyboard.press("Escape");
              // Wait for dialog to close
              await dialog.waitFor({ state: "hidden", timeout: 2000 });
            }

            // Double-check that no popover remains open
            const remainingPopovers = page.locator(".MuiPopover-root:visible");
            if ((await remainingPopovers.count()) > 0) {
              await page.keyboard.press("Escape");
              // Wait for popovers to close
              await page.waitForFunction(
                () => {
                  return (
                    document.querySelectorAll(".MuiPopover-root:visible")
                      .length === 0
                  );
                },
                { timeout: 2000 }
              );
            }

            return;
          }
        }
      }
    }

    console.log(
      `ℹ️ No selection dialog found for placeholder ${placeholderIndex}`
    );
  }

  /**
   * Fills a string block placeholder (dropdown with options)
   */
  async fillStringPlaceholder(
    page: Page,
    placeholderIndex: number
  ): Promise<void> {
    console.log(`Attempting to fill string placeholder ${placeholderIndex}...`);

    // Click on the placeholder
    const placeholder = page
      .locator('[data-testid^="constraint-block-placeholder-"]')
      .nth(placeholderIndex);
    const placeholderText = await placeholder.textContent();
    console.log(`Clicking string placeholder with text: "${placeholderText}"`);
    await placeholder.click({ force: true });

    // Look for the string option dialog
    const dialog = page.locator(".MuiPopover-root:visible").first();
    if (await dialog.isVisible({ timeout: 2000 })) {
      console.log("✅ Found string options dialog");

      // Look for string options with data-testid
      const stringOptions = dialog.locator('[data-testid^="string-option-"]');
      const optionCount = await stringOptions.count();
      console.log(`Found ${optionCount} string options`);

      if (optionCount > 0) {
        const firstOption = stringOptions.first();
        const optionText = await firstOption.textContent();
        console.log(`Selecting first string option: "${optionText}"`);
        await firstOption.click();
        console.log(
          `✅ Selected string option for placeholder ${placeholderIndex}`
        );
        return;
      }

      // Fallback: look for ListItemButton elements
      const listItems = dialog.locator(
        'button[role="button"], .MuiListItemButton-root'
      );
      const listItemCount = await listItems.count();
      if (listItemCount > 0) {
        const firstItem = listItems.first();
        const itemText = await firstItem.textContent();
        console.log(`Selecting first list item: "${itemText}"`);
        await firstItem.click();
        console.log(
          `✅ Selected list item for placeholder ${placeholderIndex}`
        );
        return;
      }
    }

    console.log(
      `⚠️ No string options found for placeholder ${placeholderIndex}`
    );
  }

  /**
   * Fills a constraint placeholder by text content (for shift-worker option blocks)
   */
  async fillPlaceholderByText(
    page: Page,
    placeholderText: string
  ): Promise<void> {
    console.log(
      `Attempting to fill placeholder with text "${placeholderText}"...`
    );

    // Find placeholder by text content
    const placeholder = page
      .locator('[data-testid^="constraint-block-placeholder-"]')
      .filter({ hasText: placeholderText });
    const count = await placeholder.count();

    if (count === 0) {
      console.log(`⚠️ No placeholder found with text "${placeholderText}"`);
      return;
    }

    if (count > 1) {
      console.log(
        `⚠️ Multiple placeholders found with text "${placeholderText}", using first one`
      );
    }

    await placeholder.first().click({ force: true });

    // Look for shift-worker option dialog (for worker/shift selections)
    const dialogSelectors = [
      '[data-testid^="shift-worker-option-dialog-"]',
      '[role="dialog"]:visible',
      ".MuiPopover-root:visible",
      ".MuiDialog-root:visible",
    ];

    for (const selector of dialogSelectors) {
      const dialog = page.locator(selector).first();
      if (await dialog.isVisible({ timeout: 3000 })) {
        console.log(
          `✅ Selection dialog opened for placeholder: "${placeholderText}" using selector: ${selector}`
        );

        // For shift-worker dialogs, we need to use the search input to trigger selection
        // Look for the input field within the dialog
        const searchInput = dialog.locator('input[type="text"]').first();
        if (await searchInput.isVisible({ timeout: 2000 })) {
          console.log(`Found search input in dialog for "${placeholderText}"`);

          // Focus the input and type a search term to filter options
          await searchInput.click();
          await searchInput.clear();

          // Type a search term based on what we're looking for
          let searchTerm = "";
          if (placeholderText.toLowerCase() === "jean") {
            searchTerm = "Test Worker"; // Search for test workers
          } else if (placeholderText.toLowerCase().includes("consultation")) {
            searchTerm = "Shift"; // Search for shifts
          } else {
            searchTerm = "Test"; // Generic search
          }

          await searchInput.fill(searchTerm);

          // Wait a moment for the search to process and then proceed
          // Look for any visible options in the dialog after typing
          // Wait for the input value to be set properly
          await searchInput.waitFor({ state: "visible" });

          // Try to find clickable options that match our search
          const searchResults = dialog
            .locator('[role="option"], [data-testid*="option"], li, div')
            .filter({
              hasText: new RegExp(searchTerm, "i"),
            })
            .filter({ hasNotText: /^$/ }); // Exclude empty text

          const resultCount = await searchResults.count();
          if (resultCount > 0) {
            console.log(
              `Found ${resultCount} search results, clicking first one`
            );
            try {
              await searchResults.first().click({ force: true });
              console.log(
                `✅ Selected option for "${placeholderText}" using search: "${searchTerm}"`
              );
              // Wait for dialog to close
              await dialog.waitFor({ state: "hidden", timeout: 3000 });
              return;
            } catch (error) {
              console.log(`Failed to click search result: ${error}`);
            }
          }

          // Fallback: try keyboard navigation
          console.log(`No clickable results found, trying keyboard navigation`);
          await searchInput.press("ArrowDown");
          await searchInput.press("Enter");

          console.log(
            `✅ Selected option for "${placeholderText}" using keyboard navigation`
          );

          // Wait for dialog to close
          try {
            await dialog.waitFor({ state: "hidden", timeout: 3000 });
          } catch (error) {
            console.log(
              `Dialog did not close after keyboard selection: ${error}`
            );
            // Force close by pressing Escape
            await searchInput.press("Escape");
          }
          return;
        }

        // Fallback: try to click on visible options without using the input
        const visibleOptions = dialog
          .locator('div[style*="cursor: pointer"]')
          .filter({
            has: page.locator("text").filter({ hasText: /Test|Worker|Shift/ }),
          });
        const optionCount = await visibleOptions.count();

        if (optionCount > 0) {
          console.log(
            `Found ${optionCount} visible options, clicking first one`
          );
          try {
            await visibleOptions.first().click({ force: true });
            console.log(
              `✅ Clicked first visible option for "${placeholderText}"`
            );

            // Wait for dialog to close
            await dialog.waitFor({ state: "hidden", timeout: 3000 });
            return;
          } catch (error) {
            console.log(`Failed to click visible option: ${error}`);
          }
        }
      }
    }

    console.log(
      `ℹ️ No selection dialog found for placeholder "${placeholderText}"`
    );
  }

  /**
   * Fills a string block placeholder by text content
   */
  async fillStringPlaceholderByText(
    page: Page,
    placeholderText: string
  ): Promise<void> {
    console.log(
      `Attempting to fill string placeholder with text "${placeholderText}"...`
    );

    // Find placeholder by text content
    const placeholder = page
      .locator('[data-testid^="constraint-block-placeholder-"]')
      .filter({ hasText: placeholderText });
    const count = await placeholder.count();

    if (count === 0) {
      console.log(`⚠️ No placeholder found with text "${placeholderText}"`);
      return;
    }

    await placeholder.first().click({ force: true });

    // Look for the string option dialog
    const dialog = page.locator(".MuiPopover-root:visible").first();
    if (await dialog.isVisible({ timeout: 3000 })) {
      console.log("✅ Found string options dialog");

      // Look for string options with data-testid
      const stringOptions = dialog.locator('[data-testid^="string-option-"]');
      const optionCount = await stringOptions.count();
      console.log(`Found ${optionCount} string options`);

      if (optionCount > 0) {
        const firstOption = stringOptions.first();
        const optionText = await firstOption.textContent();
        console.log(`Selecting first string option: "${optionText}"`);
        await firstOption.click();
        console.log(
          `✅ Selected string option for placeholder "${placeholderText}"`
        );

        // Wait for dialog to close
        await dialog.waitFor({ state: "hidden", timeout: 3000 });
        return;
      }

      // Fallback: look for ListItemButton elements
      const listItems = dialog.locator(
        'button[role="button"], .MuiListItemButton-root, .MuiListItem-button'
      );
      const listItemCount = await listItems.count();
      if (listItemCount > 0) {
        const firstItem = listItems.first();
        const itemText = await firstItem.textContent();
        console.log(`Selecting first list item: "${itemText}"`);
        await firstItem.click();
        console.log(
          `✅ Selected list item for placeholder "${placeholderText}"`
        );

        // Wait for dialog to close
        await dialog.waitFor({ state: "hidden", timeout: 3000 });
        return;
      }

      // Final fallback: any clickable element in dialog
      const anyClickable = dialog
        .locator('li, [role="option"], button')
        .first();
      if (await anyClickable.isVisible({ timeout: 1000 })) {
        const itemText = await anyClickable.textContent();
        console.log(`Selecting fallback clickable item: "${itemText}"`);
        await anyClickable.click();
        console.log(
          `✅ Selected fallback item for placeholder "${placeholderText}"`
        );

        // Wait for dialog to close
        await dialog.waitFor({ state: "hidden", timeout: 3000 });
        return;
      }
    }

    console.log(
      `⚠️ No string options found for placeholder "${placeholderText}"`
    );
  }

  /**
   * Fills a number block placeholder by text content
   */
  async fillNumberPlaceholderByText(
    page: Page,
    placeholderText: string,
    value: number = 3
  ): Promise<void> {
    console.log(
      `Attempting to fill number placeholder with text "${placeholderText}" with value ${value}...`
    );

    // Find placeholder by text content
    const placeholder = page
      .locator('[data-testid^="constraint-block-placeholder-"]')
      .filter({ hasText: placeholderText });
    const count = await placeholder.count();

    if (count === 0) {
      console.log(`⚠️ No placeholder found with text "${placeholderText}"`);
      return;
    }

    await placeholder.first().click({ force: true });

    // Check what dialogs are open after clicking
    const allDialogs = page.locator(
      '.MuiPopover-root:visible, .MuiDialog-root:visible, [role="dialog"]:visible'
    );
    const dialogCount = await allDialogs.count();
    console.log(
      `Found ${dialogCount} dialogs open after clicking number placeholder`
    );

    // Look for the number input with specific data-testid first
    let numberInput = page.locator('[data-testid="constraint-number-input"]');
    if (await numberInput.isVisible({ timeout: 3000 })) {
      console.log(`Found constraint-number-input for "${placeholderText}"`);
      await numberInput.clear();
      await numberInput.fill(value.toString());

      // Try multiple submission methods to ensure the value is accepted
      await numberInput.press("Enter"); // First try Enter

      // Wait for the input to reflect the value
      await page.waitForFunction(
        (expectedValue) => {
          const input = document.querySelector(
            '[data-testid="constraint-number-input"]'
          ) as HTMLInputElement;
          return input && input.value === expectedValue;
        },
        value.toString(),
        { timeout: 2000 }
      );

      console.log(
        `✅ Filled number input with ${value} for placeholder "${placeholderText}"`
      );
      return;
    }

    // If specific input not found, try to find any number or text input inside visible dialogs
    for (let i = 0; i < dialogCount; i++) {
      const dialog = allDialogs.nth(i);

      // Try number input first
      numberInput = dialog.locator('input[type="number"]');
      if (await numberInput.isVisible({ timeout: 1000 })) {
        console.log(
          `Found number input in dialog ${i} for "${placeholderText}"`
        );
        await numberInput.clear();
        await numberInput.fill(value.toString());
        await numberInput.press("Enter");

        // Wait for the input to be filled
        await numberInput.waitFor({ state: "attached", timeout: 2000 });
        console.log(
          `✅ Filled number input with ${value} for placeholder "${placeholderText}"`
        );
        return;
      }

      // Try any text input
      const textInput = dialog.locator('input[type="text"]');
      if (await textInput.isVisible({ timeout: 1000 })) {
        console.log(`Found text input in dialog ${i} for "${placeholderText}"`);
        await textInput.clear();
        await textInput.fill(value.toString());
        await textInput.press("Enter");

        // Wait for the input to be filled
        await textInput.waitFor({ state: "attached", timeout: 2000 });
        console.log(
          `✅ Filled text input with ${value} for placeholder "${placeholderText}"`
        );
        return;
      }

      // Try any input
      const anyInput = dialog.locator("input");
      if (await anyInput.isVisible({ timeout: 1000 })) {
        console.log(
          `Found generic input in dialog ${i} for "${placeholderText}"`
        );
        await anyInput.clear();
        await anyInput.fill(value.toString());
        await anyInput.press("Enter");

        // Wait for the input to be filled
        await anyInput.waitFor({ state: "attached", timeout: 2000 });
        console.log(
          `✅ Filled generic input with ${value} for placeholder "${placeholderText}"`
        );
        return;
      }
    }

    // Fallback: try to find input in the entire page
    const pageNumberInput = page.locator('input[type="number"]').first();
    if (await pageNumberInput.isVisible({ timeout: 2000 })) {
      console.log(`Found fallback number input for "${placeholderText}"`);
      await pageNumberInput.clear();
      await pageNumberInput.fill(value.toString());
      await pageNumberInput.press("Enter");

      // Wait for the input to reflect the value
      await page.waitForFunction(
        (expectedValue) => {
          const inputs = document.querySelectorAll('input[type="number"]');
          return Array.from(inputs).some(
            (input) => (input as HTMLInputElement).value === expectedValue
          );
        },
        value.toString(),
        { timeout: 2000 }
      );

      console.log(
        `✅ Filled fallback number input with ${value} for placeholder "${placeholderText}"`
      );
      return;
    }

    console.log(
      `❌ FAILED: No number input found for placeholder "${placeholderText}"`
    );
    throw new Error(
      `No number input found for placeholder "${placeholderText}"`
    );
  }

  //////////////////////////
  // Constraint API Methods
  //////////////////////////

  /**
   * Generates constraint blocks from a template with populated values
   * This method creates realistic constraint blocks based on the template structure
   *
   * @param template - The constraint template to base the blocks on
   * @param options - Optional customization for block values
   * @returns Array of constraint blocks ready for constraint creation
   */
  generateConstraintBlocksFromTemplate(
    template: TemplateT,
    options: {
      workerId?: string | "all";
      shiftId?: string | "all" | "duty" | "no-duty";
      numberValue?: number;
    } = {}
  ): any[] {
    const { workerId, shiftId, numberValue = 2 } = options;

    if (!template.blocks || !Array.isArray(template.blocks)) {
      throw new Error("Template must have blocks array");
    }

    const testWorkers = this.getTestWorkers();
    const testShifts = this.getTestShifts();

    return template.blocks.map((templateBlock) => {
      const block = {
        name: templateBlock.name,
        type: templateBlock.type,
        value: null as any,
      };

      // Handle different block types based on BlockTypeOptions
      switch (templateBlock.type) {
        case 0: // STRING
          // Use the placeholder from template (no overrides)
          block.value = templateBlock.placeholder;
          break;

        case 1: // NUMBER
          // Use positive integer (default or provided)
          block.value = numberValue;
          break;

        case 2: // LIST
          // Use first option from template options array
          if (templateBlock.options && templateBlock.options.length > 0) {
            block.value = templateBlock.options[0];
          } else {
            block.value = templateBlock.placeholder;
          }
          break;

        case 3: // SHIFT_WORKER_OPTION
          // Select appropriate option from template based on provided IDs or defaults
          if (templateBlock.options && templateBlock.options.length > 0) {
            let selectedOption = null;

            // Check if this block is for workers (name 4 = WORKER)
            if (templateBlock.name === 4) {
              if (workerId === "all") {
                // Look for "all workers" option
                selectedOption = templateBlock.options.find(
                  (opt: any) =>
                    opt.categoryName === "All" &&
                    opt.isBoolDim === false &&
                    (opt.name === "all workers" ||
                      opt.name.toLowerCase().includes("all"))
                );
              } else if (workerId) {
                // Look for specific worker by ID
                selectedOption = templateBlock.options.find(
                  (opt: any) =>
                    opt.id === workerId && opt.categoryName === "Workers"
                );
              } else {
                // Default: use first available worker
                const workerOption = templateBlock.options.find(
                  (opt: any) =>
                    opt.categoryName === "Workers" && opt.idType === 1
                );
                if (workerOption && testWorkers.length > 0) {
                  selectedOption = {
                    name: testWorkers[0].name,
                    id: testWorkers[0].workerId,
                    idType: (workerOption as any).idType,
                    isBoolDim: (workerOption as any).isBoolDim,
                    categoryName: (workerOption as any).categoryName,
                  };
                }
              }
            }

            // Check if this block is for shifts (name 3 = SHIFT)
            else if (templateBlock.name === 3) {
              if (shiftId === "all") {
                // Look for "all shifts" option
                selectedOption = templateBlock.options.find(
                  (opt: any) =>
                    opt.categoryName === "All" &&
                    opt.isBoolDim === false &&
                    (opt.name === "all shifts" ||
                      opt.name.toLowerCase().includes("all"))
                );
              } else if (shiftId === "duty") {
                // Look for duty option
                selectedOption = templateBlock.options.find(
                  (opt: any) =>
                    opt.categoryName === "Duties" &&
                    opt.isBoolDim === true &&
                    opt.name === true
                );
              } else if (shiftId === "no-duty") {
                // Look for no-duty option
                selectedOption = templateBlock.options.find(
                  (opt: any) =>
                    opt.categoryName === "Duties" &&
                    opt.isBoolDim === true &&
                    opt.name === false
                );
              } else if (shiftId) {
                // Look for specific shift by ID
                selectedOption = templateBlock.options.find(
                  (opt: any) =>
                    opt.id === shiftId && opt.categoryName === "Shifts"
                );
              } else {
                // Default: use first available shift
                const shiftOption = templateBlock.options.find(
                  (opt: any) =>
                    opt.categoryName === "Shifts" && opt.idType === 2
                );
                if (shiftOption && testShifts.length > 0) {
                  selectedOption = {
                    name: testShifts[0].name,
                    id: testShifts[0].id,
                    idType: (shiftOption as any).idType,
                    isBoolDim: (shiftOption as any).isBoolDim,
                    categoryName: (shiftOption as any).categoryName,
                  };
                }
              }
            }

            // Fallback to first option if no specific selection found
            if (!selectedOption) {
              selectedOption = templateBlock.options[0];
            }

            block.value = [selectedOption];
          } else {
            // Fallback: create a basic option if no template options
            if (templateBlock.name === 4 && testWorkers.length > 0) {
              // Worker block
              block.value = [
                {
                  name: testWorkers[0].name,
                  id: testWorkers[0].workerId,
                  idType: 1,
                  isBoolDim: false,
                  categoryName: "Workers",
                },
              ];
            } else if (templateBlock.name === 3 && testShifts.length > 0) {
              // Shift block
              block.value = [
                {
                  name: testShifts[0].name,
                  id: testShifts[0].id,
                  idType: 2,
                  isBoolDim: false,
                  categoryName: "Shifts",
                },
              ];
            } else {
              block.value = [];
            }
          }
          break;

        default:
          // Fallback to placeholder for unknown types
          block.value = templateBlock.placeholder;
          break;
      }

      return block;
    });
  }

  /**
   * Creates a test constraint using the API
   */
  async createTestConstraint(constraintData: {
    constraintType: number;
    templateId: string;
    language?: string;
    blocks: any[];
    text: string;
    hard?: boolean;
    priority?: string;
    active?: boolean;
  }): Promise<{ constraintId: string; teamId: string }> {
    if (!this.testTeam) {
      throw new Error("No test team created. Call setupConstraintTests first.");
    }

    return await this.dbUtils.createConstraint({
      teamId: this.testTeam.teamId,
      constraintType: constraintData.constraintType,
      templateId: constraintData.templateId,
      language: constraintData.language || "en",
      blocks: constraintData.blocks,
      text: constraintData.text,
      hard: constraintData.hard ?? true,
      priority: constraintData.priority || "medium",
      active: constraintData.active ?? true,
    });
  }

  /**
   * Creates a test constraint from a template with auto-generated blocks
   * This is a convenience method that combines template-based block generation
   * with constraint creation in a single call
   */
  async createTestConstraintFromTemplate(
    template: TemplateT,
    options: {
      workerId?: string | "all";
      shiftId?: string | "all" | "duty" | "no-duty";
      numberValue?: number;
      language?: string;
      text?: string;
      hard?: boolean;
      priority?: string;
      active?: boolean;
    } = {}
  ): Promise<{ constraintId: string; teamId: string }> {
    const {
      language = "en",
      text = "", // Will be populated by backend
      hard = true,
      priority = "medium",
      active = true,
      ...blockOptions
    } = options;

    // Generate blocks from template
    const blocks = this.generateConstraintBlocksFromTemplate(
      template,
      blockOptions
    );

    // Create the constraint
    return await this.createTestConstraint({
      constraintType: template.constraintType,
      templateId: template.id,
      language,
      blocks,
      text,
      hard,
      priority,
      active,
    });
  }

  /**
   * Updates a test constraint using the API
   */
  async updateTestConstraint(
    constraintId: string,
    updates: {
      constraintType?: number;
      templateId?: string;
      language?: string;
      blocks?: any[];
      text?: string;
      hard?: boolean;
      priority?: string;
      active?: boolean;
    }
  ): Promise<{ constraintId: string; teamId: string }> {
    if (!this.testTeam) {
      throw new Error("No test team created. Call setupConstraintTests first.");
    }

    return await this.dbUtils.updateConstraint(
      constraintId,
      this.testTeam.teamId,
      updates
    );
  }

  /**
   * Deletes a test constraint using the API
   */
  async deleteTestConstraint(constraintId: string): Promise<void> {
    if (!this.testTeam) {
      throw new Error("No test team created. Call setupConstraintTests first.");
    }

    await this.dbUtils.deleteConstraint(constraintId, this.testTeam.teamId);
  }

  /**
   * Gets all constraints for the test team
   */
  async getTestConstraints(): Promise<any[]> {
    if (!this.testTeam) {
      throw new Error("No test team created. Call setupConstraintTests first.");
    }

    return await this.dbUtils.getConstraints(this.testTeam.teamId);
  }

  /**
   * Gets constraint templates for the test team
   */
  async getTestConstraintTemplates(): Promise<any[]> {
    if (!this.testTeam) {
      throw new Error("No test team created. Call setupConstraintTests first.");
    }

    return await this.dbUtils.getConstraintTemplates(this.testTeam.teamId);
  }
}
