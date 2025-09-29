/**
 * Shared base functionality for Template E2E tests
 */

import { Page, expect } from "@playwright/test";
import { DatabaseTestUtils } from "./database-utils";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import utc from "dayjs/plugin/utc";
import isBetween from "dayjs/plugin/isBetween";
import { testConfig } from "./test-config";
import { ShiftType } from "../../src/types/shift";

dayjs.extend(isoWeek);
dayjs.extend(utc);
dayjs.extend(isBetween);

export class TemplateTestBase {
  protected dbUtils: DatabaseTestUtils;
  protected testTeam: { teamId: string; name: string } | null = null;

  constructor() {
    this.dbUtils = new DatabaseTestUtils();
  }

  /**
   * Performs common setup for template tests:
   * - Resets relevant database collections
   * - Creates a test team with shifts
   */
  async setupTemplateTests(): Promise<void> {
    console.log("🚀 Setting up template tests...");

    // Create a test team
    this.testTeam = await this.dbUtils.createTeam({
      name: "Template Test Team",
    });

    if (this.testTeam) {
      console.log(`✅ Test team created: ${this.testTeam.name}`);

      // Create shifts for the tests - using same shifts as shift demand tests for consistency
      await this.dbUtils.createShift({
        teamId: this.testTeam.teamId,
        name: "Morning Shift",
        startTime: dayjs.utc("2023-01-01T08:00:00"),
        endTime: dayjs.utc("2023-01-01T12:00:00"),
        shiftType: ShiftType.NORMAL,
      });
      await this.dbUtils.createShift({
        teamId: this.testTeam.teamId,
        name: "Afternoon Shift",
        startTime: dayjs.utc("2023-01-01T14:00:00"),
        endTime: dayjs.utc("2023-01-01T18:00:00"),
        shiftType: ShiftType.NORMAL,
      });
      await this.dbUtils.createShift({
        teamId: this.testTeam.teamId,
        name: "Duty 1",
        startTime: dayjs.utc("2023-01-01T08:00:00"),
        endTime: dayjs.utc("2023-01-02T08:00:00"),
        shiftType: ShiftType.DUTY,
      });
      await this.dbUtils.createShift({
        teamId: this.testTeam.teamId,
        name: "Duty 2",
        startTime: dayjs.utc("2023-01-01T08:00:00"),
        endTime: dayjs.utc("2023-01-02T08:00:00"),
        shiftType: ShiftType.DUTY,
      });

      console.log("✅ Test shifts created");
    }
  }

  /**
   * Navigates to the shift demands page for the test team
   */
  async navigateToShiftDemandsPage(page: Page): Promise<void> {
    if (!this.testTeam) {
      throw new Error(
        "No test team available. Did you forget to call setupTemplateTests()?"
      );
    }

    // Navigate to the application first to establish a valid document context
    await page.goto(`${testConfig.frontendUrl}/en/plan/shift-demands`);

    // Now set the selected team in localStorage with proper document context
    await page.evaluate((teamId) => {
      localStorage.setItem("selectedTeamId", teamId);
    }, this.testTeam.teamId);

    // Reload the page to apply the localStorage changes
    await page.reload();

    // Wait for the page to load and the team context to initialize
    await page.waitForLoadState("networkidle");

    // Wait for the main content to be visible using the data-testid attribute
    await expect(
      page.locator('[data-testid="shift-demand-tab"]')
    ).toBeVisible();
    console.log("✅ Navigated to shift demands page");
  }

  /**
   * Gets the template button in the ShiftDemandToolbar
   */
  getTemplateButton(page: Page) {
    return page.locator('[data-testid="shift-demand-template-button"]');
  }

  /**
   * Gets the TemplateManagementWindow dialog
   */
  getTemplateManagementWindow(page: Page) {
    return page.locator('[data-testid="template-management-window"]');
  }

  /**
   * Gets the close button in the TemplateManagementWindow
   */
  getTemplateManagementCloseButton(page: Page) {
    return page.locator('[data-testid="template-management-close-button"]');
  }

  /**
   * Gets the create template button in the TemplateList
   */
  getCreateTemplateButton(page: Page) {
    return page.locator('[data-testid="template-list-create-button"]');
  }

  /**
   * Gets the TemplateCreationDialog
   */
  getTemplateCreationDialog(page: Page) {
    return page.locator('[data-testid="template-creation-dialog"]');
  }

  /**
   * Gets form elements in the TemplateCreationDialog
   */
  getTemplateCreationFormElements(page: Page) {
    return {
      nameInput: page.locator('[data-testid="template-name-input"] input'),
      descriptionInput: page.locator(
        '[data-testid="template-description-input"] textarea:not([readonly])'
      ),
      createButton: page.locator(
        '[data-testid="template-creation-create-button"]'
      ),
      cancelButton: page.locator(
        '[data-testid="template-creation-cancel-button"]'
      ),
    };
  }

  /**
   * Gets template list item by template ID
   */
  getTemplateListItem(page: Page, templateId: string) {
    return page.locator(`[data-testid="template-list-item-${templateId}"]`);
  }

  /**
   * Gets template action buttons by template ID
   */
  getTemplateActionButtons(page: Page, templateId: string) {
    return {
      apply: page.locator(
        `[data-testid="template-apply-button-${templateId}"]`
      ),
      delete: page.locator(
        `[data-testid="template-delete-button-${templateId}"]`
      ),
    };
  }

  /**
   * Gets the template delete confirmation dialog
   */
  getTemplateDeleteConfirmationDialog(page: Page) {
    return page.locator('[data-testid="template-delete-confirmation-dialog"]');
  }

  /**
   * Gets buttons in the delete confirmation dialog
   */
  getDeleteConfirmationButtons(page: Page) {
    return {
      confirm: page.locator(
        '[data-testid="template-delete-confirmation-dialog-confirm-button"]'
      ),
      cancel: page.locator(
        '[data-testid="template-delete-confirmation-dialog-cancel-button"]'
      ),
    };
  }

  /**
   * Creates a test template via API for testing
   */
  async createTemplateViaAPI(templateData: {
    name: string;
    description?: string;
  }): Promise<string> {
    if (!this.testTeam) {
      throw new Error(
        "No test team available. Did you forget to call setupTemplateTests()?"
      );
    }

    // Use the database utils to create a template
    const template = await this.dbUtils.createShiftDemandTemplate({
      teamId: this.testTeam.teamId,
      name: templateData.name,
      description: templateData.description || "",
    });

    return template.templateId;
  }

  /**
   * Helper method to wait for template list to load
   */
  async waitForTemplateListLoaded(page: Page) {
    // Wait for either templates to appear or the empty state
    await Promise.race([
      page
        .waitForSelector('[data-testid^="template-list-item-"]', {
          timeout: 5000,
        })
        .catch(() => null),
      page
        .waitForSelector(".template-list-empty", { timeout: 5000 })
        .catch(() => null),
    ]);
  }

  /**
   * Helper method to open the template management window
   */
  async openTemplateManagementWindow(page: Page) {
    const templateButton = this.getTemplateButton(page);
    await templateButton.click();

    const templateWindow = this.getTemplateManagementWindow(page);
    await expect(templateWindow).toBeVisible();

    return templateWindow;
  }

  /**
   * Helper method to open the template creation dialog
   */
  async openTemplateCreationDialog(page: Page) {
    // First open the template management window
    await this.openTemplateManagementWindow(page);

    // Click the create template button
    const createButton = this.getCreateTemplateButton(page);
    await createButton.click();

    const creationDialog = this.getTemplateCreationDialog(page);
    await expect(creationDialog).toBeVisible();

    return creationDialog;
  }

  /**
   * Helper method to create a template through the UI
   */
  async createTemplateViaUI(
    page: Page,
    templateData: {
      name: string;
      description?: string;
    }
  ) {
    await this.openTemplateCreationDialog(page);

    const formElements = this.getTemplateCreationFormElements(page);

    // Fill in the form
    await formElements.nameInput.fill(templateData.name);
    if (templateData.description) {
      await formElements.descriptionInput.fill(templateData.description);
    }

    // Submit the form
    await formElements.createButton.click();

    // Wait for the dialog to close
    const creationDialog = this.getTemplateCreationDialog(page);
    await expect(creationDialog).not.toBeVisible();

    // Wait for template list to update
    await this.waitForTemplateListLoaded(page);
  }

  //////////////////////////
  // Template Toolbar Testing Methods
  //////////////////////////

  /**
   * Gets the template toolbar elements
   */
  getTemplateToolbarElements(page: Page) {
    return {
      addWeekButton: page.locator(
        '[data-testid="template-toolbar-add-week-button"]'
      ),
      removeWeekButton: page.locator(
        '[data-testid="template-toolbar-remove-week-button"]'
      ),
      previousWeekButton: page.locator(
        '[data-testid="template-toolbar-previous-week-button"]'
      ),
      nextWeekButton: page.locator(
        '[data-testid="template-toolbar-next-week-button"]'
      ),
      weekDisplay: page.locator(
        '[data-testid="template-toolbar-week-display"]'
      ),
      typeToggle: page.locator('[data-testid="template-toolbar-type-toggle"]'),
      standardTypeButton: page.locator(
        '[data-testid="template-toolbar-standard-type-button"]'
      ),
      evenOddTypeButton: page.locator(
        '[data-testid="template-toolbar-even-odd-type-button"]'
      ),
      fromDemandsButton: page.locator(
        '[data-testid="template-toolbar-from-demands-button"]'
      ),
      selectButton: page.locator(
        '[data-testid="template-toolbar-select-button"]'
      ),
    };
  }

  /**
   * Gets the delete week confirmation dialog elements
   */
  getDeleteWeekDialogElements(page: Page) {
    return {
      dialog: page.locator(
        '[data-testid="template-toolbar-delete-week-dialog"]'
      ),
      cancelButton: page.locator(
        '[data-testid="template-toolbar-delete-week-cancel-button"]'
      ),
      confirmButton: page.locator(
        '[data-testid="template-toolbar-delete-week-confirm-button"]'
      ),
    };
  }

  /**
   * Gets the even/odd conversion dialog elements
   */
  getEvenOddConversionDialogElements(page: Page) {
    return {
      dialog: page.locator(
        '[data-testid="template-toolbar-even-odd-conversion-dialog"]'
      ),
      cancelButton: page.locator(
        '[data-testid="template-toolbar-even-odd-cancel-button"]'
      ),
      confirmButton: page.locator(
        '[data-testid="template-toolbar-even-odd-confirm-button"]'
      ),
    };
  }

  /**
   * Helper method to get template table week headers (to count weeks)
   */
  getTemplateTableWeeks(page: Page) {
    return page.locator('[data-testid^="template-table-week-header-"]');
  }

  /**
   * Helper method to select a template in the viewer
   */
  async selectTemplateInViewer(page: Page, templateId: string) {
    // Click on the template list item to select it and view it
    const templateItem = this.getTemplateListItem(page, templateId);
    await templateItem.click();

    // Wait for the toolbar to become visible
    const toolbar = page.locator(
      '[data-testid="template-toolbar-add-week-button"]'
    );
    await expect(toolbar).toBeVisible();
  }

  /**
   * Helper method to create a template with specific number of weeks via API
   * For now, just creates a basic template and relies on UI interactions to add weeks
   */
  async createTemplateWithWeeks(templateData: {
    name: string;
    description?: string;
    weekCount?: number;
  }): Promise<string> {
    if (!this.testTeam) {
      throw new Error("Test team not created");
    }

    // Create basic template first
    const template = await this.dbUtils.createShiftDemandTemplate({
      teamId: this.testTeam.teamId,
      name: templateData.name,
      description: templateData.description || "",
    });

    // Note: For now we just create a basic template (1 week)
    // Tests can use UI interactions to add more weeks as needed
    const weekCount = templateData.weekCount || 1;
    if (weekCount > 1) {
      console.log(
        `⚠️ Template created with 1 week, but ${weekCount} weeks requested. Use UI to add more weeks.`
      );
    }

    return template.templateId;
  }

  /**
   * Helper method to wait for template table to update after toolbar actions
   */
  async waitForTemplateTableUpdate(page: Page, expectedWeekCount?: number) {
    // Wait a bit for the update to propagate
    await page.waitForTimeout(500);

    if (expectedWeekCount !== undefined) {
      // Wait for the expected number of week headers
      const weeks = this.getTemplateTableWeeks(page);
      await expect(weeks).toHaveCount(expectedWeekCount);
    }
  }
}
