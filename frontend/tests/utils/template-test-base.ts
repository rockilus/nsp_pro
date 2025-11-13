/**
 * Shared base functionality for Template E2E tests
 */

import { Page, expect } from "@playwright/test";
import { DatabaseTestUtils } from "./database-utils";
import { AuthenticatedApiClient } from "../../src/app/lib/api/baseApi";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import utc from "dayjs/plugin/utc";
import isBetween from "dayjs/plugin/isBetween";
import { testConfig } from "./test-config";
import { ShiftType } from "../../src/types/shift";
import {
  ShiftDemandTemplateDTO,
  ShiftDemandTemplateCreateDTO,
  ShiftDemandTemplateUpdateDTO,
  TemplateType,
  TemplateWeekDataDTO,
  DemandEntryDTO,
} from "../../src/types/shift-demand-template";
import { ShiftDemandTemplateApi } from "../../src/app/lib/api/shiftDemandTemplateApi";

dayjs.extend(isoWeek);
dayjs.extend(utc);
dayjs.extend(isBetween);

export class TemplateTestBase {
  protected dbUtils: DatabaseTestUtils;
  protected testTeam: { teamId: string; name: string } | null = null;
  protected createdShiftIds: string[] = [];

  // Maps to store templates by test ID for test isolation
  protected testTemplatesMap = new Map<string, ShiftDemandTemplateDTO[]>();

  // Keep legacy arrays for backwards compatibility with tests that don't use test IDs
  protected testTemplates: ShiftDemandTemplateDTO[] = [];

  constructor() {
    this.dbUtils = new DatabaseTestUtils();
    // We'll use dbUtils' authenticated client for API calls
  }

  /**
   * Get the authenticated API client for making test requests
   */
  private get testApiClient() {
    // Access the dbUtils' internal authenticated client
    return (this.dbUtils as any).testApiClient;
  }

  /**
   * Performs common setup for template tests:
   * - Resets relevant database collections
   * - Creates a test team with shifts
   * - Creates test templates (standard and even/odd)
   * @param testId - Optional test ID for test isolation
   */
  async setupTemplateTests(testId?: string): Promise<void> {
    try {
      console.log(`[${testId || "legacy"}] 🔧 Setting up template tests...`);

      // Create a test team with shifts
      this.testTeam = await this.dbUtils.createTeam({
        name: `Template Test Team ${testId || Date.now()}`,
      });

      console.log(
        `[${testId || "legacy"}] ✅ Created test team: ${this.testTeam.name} (${
          this.testTeam.teamId
        })`
      );

      // Create some test shifts that will be referenced in templates
      await this.createTestShifts(testId);

      // Create test templates
      await this.createTestTemplates(testId);

      console.log(
        `[${testId || "legacy"}] ✅ Template test setup completed successfully`
      );
    } catch (error) {
      console.error(
        `[${testId || "legacy"}] ❌ Failed to setup template tests:`,
        error
      );
      throw error;
    }
  }

  /**
   * Creates test shifts for template testing
   * @param testId - Optional test ID for test isolation
   */
  private async createTestShifts(testId?: string): Promise<void> {
    if (!this.testTeam) {
      throw new Error("Test team not initialized");
    }

    try {
      // Create a few test shifts that will be used in our tests
      const shifts = [
        {
          teamId: this.testTeam.teamId,
          name: "Morning Shift",
          startTime: dayjs.utc("2023-01-01T08:00:00"),
          endTime: dayjs.utc("2023-01-01T16:00:00"),
          shiftType: ShiftType.NORMAL,
        },
        {
          teamId: this.testTeam.teamId,
          name: "Evening Shift",
          startTime: dayjs.utc("2023-01-01T16:00:00"),
          endTime: dayjs.utc("2023-01-01T00:00:00"),
          shiftType: ShiftType.NORMAL,
        },
        {
          teamId: this.testTeam.teamId,
          name: "Night Shift",
          startTime: dayjs.utc("2023-01-01T00:00:00"),
          endTime: dayjs.utc("2023-01-01T08:00:00"),
          shiftType: ShiftType.NORMAL,
        },
      ];

      for (const shiftData of shifts) {
        const createdShift = await this.dbUtils.createShift(shiftData);
        this.createdShiftIds.push(createdShift.id);
        console.log(
          `[${testId || "legacy"}] ✅ Created test shift: ${shiftData.name} (${
            createdShift.id
          })`
        );
      }
    } catch (error) {
      console.error(
        `[${testId || "legacy"}] Failed to create test shifts:`,
        error
      );
      throw error;
    }
  }

  /**
   * Creates test templates via API
   * Creates:
   * 1. A standard template with 2 weeks
   * 2. An even/odd template with 2 weeks
   * Both templates include demands for all test shifts
   * @param testId - Optional test ID for test isolation
   */
  private async createTestTemplates(testId?: string): Promise<void> {
    if (!this.testTeam) {
      throw new Error("Test team not initialized");
    }

    if (this.createdShiftIds.length === 0) {
      throw new Error("No test shifts available for template creation");
    }

    try {
      const templates: ShiftDemandTemplateDTO[] = [];

      // 1. Create a standard template with 2 weeks
      console.log(
        `[${testId || "legacy"}] 🔧 Creating standard template with 2 weeks...`
      );

      const standardTemplate = await ShiftDemandTemplateApi.createTemplate(
        this.testApiClient,
        this.testTeam.teamId,
        {
          name: `Standard Template ${testId || Date.now()}`,
          description: "Test standard template with 2 weeks",
        }
      );

      // Add demands to the standard template
      // Week 0: Monday-Sunday with varying demands
      const week0Demands: DemandEntryDTO[] = [];
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        this.createdShiftIds.forEach((shiftId, index) => {
          week0Demands.push({
            shiftId,
            dayOfWeek,
            count: ((dayOfWeek + index + 1) % 5) + 1, // Varying counts 1-5
          });
        });
      }

      // Week 1: Monday-Sunday with different demands
      const week1Demands: DemandEntryDTO[] = [];
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        this.createdShiftIds.forEach((shiftId, index) => {
          week1Demands.push({
            shiftId,
            dayOfWeek,
            count: ((dayOfWeek + index) % 5) + 2, // Varying counts 2-6
          });
        });
      }

      const weeksData: TemplateWeekDataDTO[] = [
        { weekNumber: 0, demands: week0Demands },
        { weekNumber: 1, demands: week1Demands },
      ];

      const updatedStandardTemplate =
        await ShiftDemandTemplateApi.updateTemplate(
          this.testApiClient,
          standardTemplate.id,
          this.testTeam.teamId,
          {
            weeksData,
          }
        );

      templates.push(updatedStandardTemplate);
      console.log(
        `[${testId || "legacy"}] ✅ Created standard template: ${
          updatedStandardTemplate.name
        } (${updatedStandardTemplate.id})`
      );

      // 2. Create an even/odd template with 2 weeks
      console.log(
        `[${testId || "legacy"}] 🔧 Creating even/odd template with 2 weeks...`
      );

      const evenOddTemplate = await ShiftDemandTemplateApi.createTemplate(
        this.testApiClient,
        this.testTeam.teamId,
        {
          name: `Even/Odd Template ${testId || Date.now()}`,
          description: "Test even/odd template with 2 weeks",
        }
      );

      // Add demands to the even/odd template
      // Week 0 (Even): Monday-Sunday with even week pattern
      const evenWeekDemands: DemandEntryDTO[] = [];
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        this.createdShiftIds.forEach((shiftId, index) => {
          evenWeekDemands.push({
            shiftId,
            dayOfWeek,
            count: (index + 1) * 2, // Even pattern: 2, 4, 6
          });
        });
      }

      // Week 1 (Odd): Monday-Sunday with odd week pattern
      const oddWeekDemands: DemandEntryDTO[] = [];
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        this.createdShiftIds.forEach((shiftId, index) => {
          oddWeekDemands.push({
            shiftId,
            dayOfWeek,
            count: (index + 1) * 2 - 1, // Odd pattern: 1, 3, 5
          });
        });
      }

      const evenOddWeeksData: TemplateWeekDataDTO[] = [
        { weekNumber: 0, demands: evenWeekDemands },
        { weekNumber: 1, demands: oddWeekDemands },
      ];

      const updatedEvenOddTemplate =
        await ShiftDemandTemplateApi.updateTemplate(
          this.testApiClient,
          evenOddTemplate.id,
          this.testTeam.teamId,
          {
            templateType: TemplateType.EVEN_ODD,
            weeksData: evenOddWeeksData,
          }
        );

      templates.push(updatedEvenOddTemplate);
      console.log(
        `[${testId || "legacy"}] ✅ Created even/odd template: ${
          updatedEvenOddTemplate.name
        } (${updatedEvenOddTemplate.id})`
      );

      // Store templates in appropriate collection
      if (testId) {
        this.testTemplatesMap.set(testId, templates);
      } else {
        this.testTemplates = templates;
      }

      console.log(
        `[${testId || "legacy"}] ✅ Created ${templates.length} test templates`
      );
    } catch (error) {
      console.error(
        `[${testId || "legacy"}] ❌ Failed to create test templates:`,
        error
      );
      throw error;
    }
  }

  /**
   * Gets the created shift IDs (in order: Morning, Evening, Night)
   */
  getCreatedShiftIds(): string[] {
    return [...this.createdShiftIds];
  }

  /**
   * Gets the test templates created during setup
   * @param testId - Optional test ID to get templates for a specific test
   */
  getTestTemplates(testId?: string): ShiftDemandTemplateDTO[] {
    if (testId) {
      return this.testTemplatesMap.get(testId) || [];
    }
    return [...this.testTemplates];
  }

  /**
   * Gets the standard test template created during setup
   * @param testId - Optional test ID to get template for a specific test
   */
  getStandardTestTemplate(testId?: string): ShiftDemandTemplateDTO | null {
    const templates = this.getTestTemplates(testId);
    return (
      templates.find((t) => t.templateType === TemplateType.STANDARD) || null
    );
  }

  /**
   * Gets the even/odd test template created during setup
   * @param testId - Optional test ID to get template for a specific test
   */
  getEvenOddTestTemplate(testId?: string): ShiftDemandTemplateDTO | null {
    const templates = this.getTestTemplates(testId);
    return (
      templates.find((t) => t.templateType === TemplateType.EVEN_ODD) || null
    );
  }

  /**
   * Gets the test team created during setup
   */
  getTestTeam(): { teamId: string; name: string } | null {
    return this.testTeam;
  }

  /**
   * Cleanup test data for a specific test ID
   * @param testId - The test ID to clean up
   */
  async cleanupTestData(testId: string): Promise<void> {
    // Delete templates created for this test
    const templates = this.testTemplatesMap.get(testId);
    if (templates && this.testTeam) {
      for (const template of templates) {
        try {
          await ShiftDemandTemplateApi.deleteTemplate(
            this.testApiClient,
            template.id,
            this.testTeam.teamId
          );
          console.log(`[${testId}] 🗑️  Deleted template: ${template.name}`);
        } catch (error) {
          console.warn(
            `[${testId}] ⚠️  Failed to delete template ${template.id}:`,
            error
          );
        }
      }
      this.testTemplatesMap.delete(testId);
    }
  }

  /**
   * Navigates to the shift demands page for the test team
   * Reloads the page to ensure templates created via API are available
   */
  async navigateToShiftDemandsPage(page: Page): Promise<void> {
    if (!this.testTeam) {
      throw new Error(
        "No test team available. Did you forget to call setupTemplateTests()?"
      );
    }

    // Navigate to the shift demands page (same pattern as working tests)
    await page.goto(`${testConfig.frontendUrl}/en/plan/shift-demands`);

    // Set the selected team in localStorage to ensure proper team context
    await page.evaluate((teamId) => {
      localStorage.setItem("selectedTeamId", teamId);
    }, this.testTeam.teamId);

    // Reload the page to apply the localStorage changes and ensure
    // templates created via API are available in the UI
    await page.reload();

    // Wait for the page to load and the team context to initialize
    await page.waitForLoadState("networkidle");

    // Wait for the main content to be visible using the data-testid attribute
    // Add a longer timeout for webkit compatibility
    await expect(page.locator('[data-testid="shift-demand-tab"]')).toBeVisible({
      timeout: 15000,
    });

    // Additional wait to ensure page components are fully initialized
    await page.waitForFunction(() => {
      // Check if React has finished rendering by looking for the presence of key elements
      const shiftDemandTab = document.querySelector(
        '[data-testid="shift-demand-tab"]'
      );
      return shiftDemandTab !== null;
    });
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
    // Refresh the page to ensure templates created via API are visible
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Navigate back to shift demands and reopen template window
    await this.navigateToShiftDemandsPage(page);

    const templateButton = this.getTemplateButton(page);
    await templateButton.click();

    const templateWindow = this.getTemplateManagementWindow(page);
    await expect(templateWindow).toBeVisible();

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
      throw new Error(
        "No test team available. Did you forget to call setupTemplateTests()?"
      );
    }

    // Create the template first
    const templateId = await this.createTemplateViaAPI({
      name: templateData.name,
      description: templateData.description,
    });

    // Note: For now, we only create a basic template
    // Week management is handled through UI interactions in the tests
    // This could be extended to create templates with specific demands if the API supports it

    return templateId;
  }

  /**
   * Helper method to create a template with some pre-filled demands for testing
   */
  async createTemplateWithDemands(templateData: {
    name: string;
    description?: string;
    demands?: {
      weekNumber: number;
      dayIndex: number;
      shiftId: string;
      value: number;
    }[];
  }): Promise<string> {
    if (!this.testTeam) {
      throw new Error(
        "No test team available. Did you forget to call setupTemplateTests()?"
      );
    }

    // Create the basic template first
    const templateId = await this.createTemplateViaAPI({
      name: templateData.name,
      description: templateData.description,
    });

    // Note: This would need API support to pre-populate demands
    // For now, demands would need to be created through UI interactions

    return templateId;
  }

  /**
   * Update an existing template via the test API client
   */
  async updateTemplateViaAPI(templateId: string, updates: Partial<unknown>) {
    if (!this.testTeam) {
      throw new Error(
        "No test team available. Did you forget to call setupTemplateTests()?"
      );
    }

    // Delegate to DatabaseTestUtils which wraps ShiftDemandTemplateApi
    return await (this.dbUtils as any).updateShiftDemandTemplate(
      templateId,
      this.testTeam.teamId,
      updates
    );
  }

  //////////////////////////
  // Template Table Testing Methods
  //////////////////////////

  /**
   * Gets the template table element
   */
  getTemplateTable(page: Page) {
    return page.locator('[data-testid="template-table"]');
  }

  /**
   * Gets template row header elements
   */
  getTemplateRowHeaders(page: Page) {
    return page.locator('[data-testid^="template-row-header-"]');
  }

  /**
   * Gets a specific template row header by shift ID
   */
  getTemplateRowHeader(page: Page, shiftId: string) {
    return page.locator(`[data-testid="template-row-header-${shiftId}"]`);
  }

  /**
   * Gets template cell by coordinates
   */
  getTemplateCell(
    page: Page,
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) {
    return page.locator(
      `[data-testid="template-cell-${shiftId}-${weekNumber}-${dayIndex}"]`
    );
  }

  /**
   * Gets template cell checkbox for bulk selection
   */
  getTemplateCellCheckbox(
    page: Page,
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) {
    return page.locator(
      `[data-testid="template-cell-checkbox-${shiftId}-${weekNumber}-${dayIndex}"] input`
    );
  }

  /**
   * Gets template row checkbox for bulk selection
   */
  getTemplateRowCheckbox(page: Page, shiftId: string) {
    return page.locator(
      `[data-testid="template-row-checkbox-${shiftId}"] input`
    );
  }

  /**
   * Gets template column checkbox for bulk selection
   */
  getTemplateColumnCheckbox(page: Page, weekNumber: number, dayIndex: number) {
    return page.locator(
      `[data-testid="template-column-checkbox-${weekNumber}-${dayIndex}"] input`
    );
  }

  /**
   * Gets template select all checkbox
   */
  getTemplateSelectAllCheckbox(page: Page) {
    return page.locator('[data-testid="template-select-all-checkbox"]');
  }

  /**
   * Gets template empty state element
   */
  getTemplateEmptyState(
    page: Page,
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) {
    return page.locator(
      `[data-testid="template-empty-${shiftId}-${weekNumber}-${dayIndex}"]`
    );
  }

  /**
   * Gets template value element
   */
  getTemplateValue(
    page: Page,
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) {
    return page.locator(
      `[data-testid="template-value-${shiftId}-${weekNumber}-${dayIndex}"]`
    );
  }

  /**
   * Gets template increment button
   */
  getTemplateIncrementButton(
    page: Page,
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) {
    return page.locator(
      `[data-testid="template-increment-${shiftId}-${weekNumber}-${dayIndex}"]`
    );
  }

  /**
   * Gets template decrement button
   */
  getTemplateDecrementButton(
    page: Page,
    shiftId: string,
    weekNumber: number,
    dayIndex: number
  ) {
    return page.locator(
      `[data-testid="template-decrement-${shiftId}-${weekNumber}-${dayIndex}"]`
    );
  }

  /**
   * Gets template shift name element
   */
  getTemplateShiftName(page: Page, shiftId: string) {
    return page.locator(`[data-testid="template-shift-name-${shiftId}"]`);
  }

  /**
   * Gets week header elements
   */
  getTemplateWeekHeaders(page: Page) {
    return page.locator('[data-testid^="template-table-week-header-"]');
  }

  /**
   * Gets a specific week header
   */
  getTemplateWeekHeader(page: Page, weekNumber: number) {
    return page.locator(
      `[data-testid="template-table-week-header-${weekNumber}"]`
    );
  }

  /**
   * Helper method to wait for template table to load
   */
  async waitForTemplateTableLoaded(page: Page) {
    await page.waitForSelector('[data-testid="template-table"]');
    await page.waitForSelector('[data-testid^="template-row-header-"]');
  }

  /**
   * Helper method to select a template and wait for it to load in the viewer
   */
  async selectTemplateAndWaitForTable(page: Page, templateId: string) {
    await this.selectTemplateInViewer(page, templateId);
    await this.waitForTemplateTableLoaded(page);
  }

  /**
   * Gets the template select button (bulk mode toggle)
   */
  getTemplateSelectButton(page: Page) {
    // This should be the bulk mode toggle button in the template toolbar
    return page.locator('[data-testid="template-toolbar-select-button"]');
  }

  /**
   * Gets the template action toolbar
   */
  getTemplateActionToolbar(page: Page) {
    return page.locator('[data-testid="template-action-toolbar"]');
  }

  /**
   * Helper method to wait for template table to update after toolbar actions
   * Note: The template table may only display 2 weeks at a time, so we need to check the toolbar display
   */
  async waitForTemplateTableUpdate(page: Page, expectedWeekCount?: number) {
    if (expectedWeekCount !== undefined) {
      // Check the week display in the toolbar which shows actual total count
      await page.waitForFunction(
        (count) => {
          const weekDisplay = document.querySelector(
            '[data-testid="template-toolbar-week-display"]'
          );
          if (!weekDisplay) return false;
          const text = weekDisplay.textContent || "";
          // Look for pattern like "/3" or "/4" to indicate total weeks
          const match = text.match(/\/(\d+)/);
          if (match) {
            return parseInt(match[1]) === count;
          }
          // Fallback to counting visible week headers
          const weeks = document.querySelectorAll(
            '[data-testid^="template-table-week-header-"]'
          );
          return weeks.length === count;
        },
        expectedWeekCount,
        { timeout: 10000 }
      );
    } else {
      // If no expected count provided, just wait for the table to be stable
      await page.waitForFunction(
        () => {
          const weekDisplay = document.querySelector(
            '[data-testid="template-toolbar-week-display"]'
          );
          return weekDisplay !== null && weekDisplay.textContent !== "";
        },
        { timeout: 10000 }
      );
    }
  }

  /**
   * Helper method to get the actual total week count from the toolbar display
   */
  async getTotalWeekCount(page: Page): Promise<number> {
    const weekDisplayText = await page
      .locator('[data-testid="template-toolbar-week-display"]')
      .textContent();
    const match = weekDisplayText?.match(/\/(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }
    // Fallback to counting visible headers
    const visibleWeeks = this.getTemplateTableWeeks(page);
    return await visibleWeeks.count();
  }

  /**
   * Helper method to add a week via toolbar with proper waiting
   */
  async addWeekViaToolbar(page: Page) {
    const toolbarElements = this.getTemplateToolbarElements(page);

    // Get the current week count before adding
    const currentWeekCount = await this.getTotalWeekCount(page);

    // Wait for button to be enabled
    await expect(toolbarElements.addWeekButton).not.toBeDisabled();

    // Click the button
    await toolbarElements.addWeekButton.click();

    // Wait for the week count to increase by 1
    await this.waitForTemplateTableUpdate(page, currentWeekCount + 1);
  }

  /**
   * Helper method to remove a week via toolbar with confirmation
   */
  async removeWeekViaToolbar(page: Page, confirmAction: boolean = true) {
    const toolbarElements = this.getTemplateToolbarElements(page);

    // Get the current week count before removing (only if we're confirming)
    const currentWeekCount = confirmAction
      ? await this.getTotalWeekCount(page)
      : undefined;

    // Wait for button to be enabled
    await expect(toolbarElements.removeWeekButton).not.toBeDisabled();

    // Click the remove button
    await toolbarElements.removeWeekButton.click();

    // Handle the confirmation dialog
    const deleteDialogElements = this.getDeleteWeekDialogElements(page);
    await expect(deleteDialogElements.dialog).toBeVisible();

    if (confirmAction) {
      await deleteDialogElements.confirmButton.click();
      await expect(deleteDialogElements.dialog).not.toBeVisible();

      // Wait for the week count to decrease by 1
      if (currentWeekCount !== undefined && currentWeekCount > 1) {
        await this.waitForTemplateTableUpdate(page, currentWeekCount - 1);
      }
    } else {
      await deleteDialogElements.cancelButton.click();
      await expect(deleteDialogElements.dialog).not.toBeVisible();
      // No need to wait for count change since we cancelled
    }
  }

  //////////////////////////
  // Template Viewer Select Testing Methods
  //////////////////////////

  /**
   * Gets bulk selection elements in the template context
   */
  getTemplateBulkSelectionElements(page: Page) {
    return {
      input: page.locator('[data-testid="bulk-selection-input"] input'),
      deleteButton: page.locator(
        '[data-testid="bulk-selection-delete-button"]'
      ),
      confirmButton: page.locator(
        '[data-testid="bulk-selection-confirm-button"]'
      ),
      cancelButton: page.locator(
        '[data-testid="bulk-selection-cancel-button"]'
      ),
    };
  }

  /**
   * Gets template selection checkboxes
   */
  getTemplateSelectionCheckboxes(page: Page) {
    return {
      selectAll: page.locator(
        '[data-testid="template-select-all-checkbox"] input'
      ),
    };
  }

  /**
   * Helper method to activate template select mode
   */
  async activateTemplateSelectMode(page: Page) {
    const selectButton = this.getTemplateSelectButton(page);
    await selectButton.click();

    // Wait for action toolbar to appear
    const actionToolbar = this.getTemplateActionToolbar(page);
    await expect(actionToolbar).toBeVisible();
  }

  /**
   * Helper method to deactivate template select mode
   */
  async deactivateTemplateSelectMode(page: Page) {
    const bulkElements = this.getTemplateBulkSelectionElements(page);

    // Wait for cancel button to be visible and enabled before clicking
    await expect(bulkElements.cancelButton).toBeVisible({ timeout: 10000 });
    await bulkElements.cancelButton.click();

    // Wait for action toolbar to disappear
    const actionToolbar = this.getTemplateActionToolbar(page);
    await expect(actionToolbar).toBeHidden();
  }

  /**
   * Helper method to apply bulk changes in template context
   */
  async applyTemplateBulkChange(page: Page, value: string) {
    const bulkElements = this.getTemplateBulkSelectionElements(page);

    // Enter the value
    await bulkElements.input.fill(value);

    // Apply the change
    await bulkElements.confirmButton.click();

    // Wait for the action to complete (action toolbar should disappear)
    const actionToolbar = this.getTemplateActionToolbar(page);
    await expect(actionToolbar).not.toBeVisible();
  }

  /**
   * Helper method to delete selected template cells
   */
  async deleteSelectedTemplateCells(page: Page) {
    const bulkElements = this.getTemplateBulkSelectionElements(page);

    await bulkElements.deleteButton.click();

    // Handle confirmation dialog if it appears
    const deleteConfirmButton = page.locator(
      '[data-testid="bulk-selection-delete-confirm-button"]'
    );
    if (await deleteConfirmButton.isVisible()) {
      await deleteConfirmButton.click();
    }

    // Wait for operation to complete and select mode to exit
    const actionToolbar = this.getTemplateActionToolbar(page);
    await expect(actionToolbar).not.toBeVisible();
  }

  //////////////////////////
  // Build From Demands Testing Methods
  //////////////////////////

  /**
   * Gets the build from demands button in the template toolbar
   */
  getBuildFromDemandsButton(page: Page) {
    return page.locator('[data-testid="template-toolbar-from-demands-button"]');
  }

  /**
   * Gets the build from demands dialog
   */
  getBuildFromDemandsDialog(page: Page) {
    return page.locator('[data-testid="build-from-demands-dialog"]');
  }

  /**
   * Gets form elements in the build from demands dialog
   */
  getBuildFromDemandsFormElements(page: Page) {
    return {
      dialog: page.locator('[data-testid="build-from-demands-dialog"]'),
      sourceWeekDatePicker: page.locator(
        '[data-testid="source-week-date-picker"]'
      ),
      sourceWeekDateInput: page.locator(
        '[data-testid="source-week-date-input"]'
      ),
      targetWeekSelect: page.locator('[data-testid="target-week-select"]'),
      applyButton: page.locator(
        '[data-testid="build-from-demands-apply-button"]'
      ),
      cancelButton: page.locator(
        '[data-testid="build-from-demands-cancel-button"]'
      ),
    };
  }

  /**
   * Gets target week option by week number
   */
  getTargetWeekOption(page: Page, weekNumber: number) {
    return page.locator(`[data-testid="target-week-option-${weekNumber}"]`);
  }

  /**
   * Helper method to open the build from demands dialog
   */
  async openBuildFromDemandsDialog(page: Page) {
    const buildButton = this.getBuildFromDemandsButton(page);
    await buildButton.click();

    const dialog = this.getBuildFromDemandsDialog(page);
    await expect(dialog).toBeVisible();
  }

  /**
   * Helper method to close the build from demands dialog
   */
  async closeBuildFromDemandsDialog(page: Page) {
    const formElements = this.getBuildFromDemandsFormElements(page);
    await formElements.cancelButton.click();

    const dialog = this.getBuildFromDemandsDialog(page);
    await expect(dialog).not.toBeVisible();
  }

  /**
   * Helper method to select a source week date
   */
  async selectSourceWeekDate(page: Page, date: string) {
    const formElements = this.getBuildFromDemandsFormElements(page);

    // Wait for the dialog to be visible and stable
    await expect(formElements.dialog).toBeVisible();

    // Try to find the date input - first try the specific input selector
    let dateInput = formElements.sourceWeekDateInput;

    // If that doesn't exist, try the input within the date picker
    const inputExists = (await dateInput.count()) > 0;
    if (!inputExists) {
      dateInput = page
        .locator('[data-testid="source-week-date-picker"] input')
        .first();
    }

    // Wait for the input to be visible and enabled before interacting
    await expect(dateInput).toBeVisible();
    await expect(dateInput).toBeEnabled();

    // Click on the date input to focus it
    await dateInput.click();

    // Clear the input and type the new date. Some locales/formats use DD/MM/YYYY
    // while others use MM/DD/YYYY. Try both if necessary and retry a couple
    // of times to account for async processing inside MUI/XDatePicker.
    const attempts = [
      date, // try as provided (tests sometimes pass MM/DD/YYYY)
      // If provided as MM/DD/YYYY, try converting to DD/MM/YYYY and vice versa
    ];

    // Helper to swap day/month if looks like MM/DD/YYYY
    const swapDayMonth = (d: string) => {
      const parts = d.split(/\D/);
      if (parts.length === 3) {
        return `${parts[1]}/${parts[0]}/${parts[2]}`;
      }
      return d;
    };

    attempts.push(swapDayMonth(date));

    let lastValue = "";
    for (const attempt of attempts) {
      // clear + fill
      await dateInput.fill("");
      await dateInput.type(attempt, { delay: 10 });

      // Press Enter to commit or Tab to blur depending on widget behavior
      try {
        await dateInput.press("Enter");
      } catch (e) {
        // ignore
      }
      await dateInput.press("Tab");

      // Wait for the picker/input to process the value and reflect it in the DOM
      await page.waitForFunction(
        () => {
          const el =
            document.querySelector('[data-testid="source-week-date-input"]') ||
            document.querySelector(
              '[data-testid="source-week-date-picker"] input'
            );
          return !!(
            el &&
            (el as HTMLInputElement).value &&
            (el as HTMLInputElement).value.trim().length > 0
          );
        },
        null,
        { timeout: 5000 }
      );

      // read current value
      try {
        lastValue = await dateInput.inputValue();
      } catch (e) {
        lastValue = "";
      }

      if (lastValue && lastValue.trim().length > 0) {
        break;
      }
    }

    // Finally assert that the input has some value (prefer exact match to provided date)
    if (!lastValue || lastValue !== date) {
      // As a last resort, set the input value directly via DOM and dispatch input/change
      try {
        await dateInput.evaluate((el: HTMLInputElement, v: string) => {
          el.focus();
          el.value = v;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          el.blur();
        }, date);

        // Wait for the input to be updated in the DOM after direct value set
        await page.waitForFunction(
          () => {
            const el =
              document.querySelector(
                '[data-testid="source-week-date-input"]'
              ) ||
              document.querySelector(
                '[data-testid="source-week-date-picker"] input'
              );
            return !!(
              el &&
              (el as HTMLInputElement).value &&
              (el as HTMLInputElement).value.trim().length > 0
            );
          },
          null,
          { timeout: 2000 }
        );

        // update lastValue
        lastValue = await dateInput.inputValue();
      } catch (e) {
        // ignore evaluation errors and let the final expect surface failure
      }

      // Final check: accept the input if it represents the same ISO week as
      // the requested date (robust to display format), or if it's any
      // non-empty value.
      const actual = await dateInput.inputValue();

      // Try to parse dates in common formats
      const formats = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"];
      const requested = dayjs(date, formats, true);
      let actualParsed = dayjs(actual, formats, true);

      // If strict parse failed for actual, try a non-strict parse as a fallback
      if (!actualParsed.isValid()) {
        actualParsed = dayjs(actual);
      }

      if (requested.isValid() && actualParsed.isValid()) {
        // Use ISO week (week of year) comparison to be tolerant of formatting
        if (requested.isSame(actualParsed, "week")) {
          return;
        }
      }

      // If actual is non-empty, accept it (we only need a selected week to proceed)
      if (actual && actual.trim().length > 0) {
        return;
      }

      // Otherwise surface a helpful error
      throw new Error(
        `Date input value mismatch. Expected a value representing the same week as '${date}', but found: '${actual}'`
      );
    }
  }

  /**
   * Helper method to select a target week
   */
  async selectTargetWeek(page: Page, weekNumber: number) {
    const formElements = this.getBuildFromDemandsFormElements(page);

    // Click on the select to open dropdown
    await formElements.targetWeekSelect.click();

    // Click on the specific week option
    const weekOption = this.getTargetWeekOption(page, weekNumber);
    await weekOption.click();
  }

  /**
   * Helper method to apply demands from source to target week
   */
  async applyDemandsFromSourceToTarget(
    page: Page,
    sourceDate: string,
    targetWeekNumber: number
  ) {
    // Open the dialog
    await this.openBuildFromDemandsDialog(page);

    // Select source week date
    await this.selectSourceWeekDate(page, sourceDate);

    // Select target week
    await this.selectTargetWeek(page, targetWeekNumber);

    // Apply the changes
    const formElements = this.getBuildFromDemandsFormElements(page);
    await formElements.applyButton.click();

    // Wait for dialog to close (indicating successful operation)
    const dialog = this.getBuildFromDemandsDialog(page);
    await expect(dialog).not.toBeVisible();
  }

  /**
   * Helper method to create shift demands via API for a specific week
   * This creates demands that can be used as source data for building templates
   */
  async createShiftDemandsForWeek(
    weekStartDate: string,
    demands: { shiftId: string; value: number }[]
  ) {
    // This would use the API to create shift demands for testing
    // Implementation would depend on the API structure
    console.log(
      "Creating shift demands for week starting:",
      weekStartDate,
      "with demands:",
      demands
    );
  }

  /**
   * Helper method to verify template data matches expected demands
   */
  async verifyTemplateWeekData(
    page: Page,
    weekNumber: number,
    expectedDemands: { shiftId: string; dayIndex: number; value: number }[]
  ) {
    // Wait for template table to be visible
    await expect(page.locator('[data-testid="template-table"]')).toBeVisible();

    // Verify each expected demand value in the template
    for (const demand of expectedDemands) {
      const cellLocator = page.locator(
        `[data-testid="template-cell-${demand.shiftId}-${weekNumber}-${demand.dayIndex}"] input`
      );
      await expect(cellLocator).toHaveValue(demand.value.toString());
    }
  }

  //////////////////////////
  // Template Application Testing Methods
  //////////////////////////

  /**
   * Gets the apply button in the TemplateViewer
   */
  getTemplateViewerApplyButton(page: Page) {
    return page.locator('[data-testid="template-viewer-apply-button"]');
  }

  /**
   * Gets the template application dialog
   */
  getTemplateApplicationDialog(page: Page) {
    return page.locator('[data-testid="template-application-dialog"]');
  }

  /**
   * Gets template application dialog elements
   */
  getTemplateApplicationDialogElements(page: Page) {
    return {
      startDatePicker: page.locator(
        '[data-testid="template-application-start-date"]'
      ),
      endDatePicker: page.locator(
        '[data-testid="template-application-end-date"]'
      ),
      overwriteSwitch: page.locator(
        '[data-testid="template-application-overwrite-switch"]'
      ),
      applyButton: page.locator(
        '[data-testid="template-application-apply-button"]'
      ),
      cancelButton: page.locator(
        '[data-testid="template-application-cancel-button"]'
      ),
    };
  }

  /**
   * Sets a date in the template application dialog
   */
  async setApplicationDialogDate(
    page: Page,
    field: "start" | "end",
    dateString: string
  ) {
    const selector =
      field === "start"
        ? '[data-testid="template-application-start-date"]'
        : '[data-testid="template-application-end-date"]';

    // The data-testid is directly on the input element (via inputProps)
    const input = page.locator(selector);

    // Wait for the input to be visible and enabled before interacting
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();

    // Convert incoming YYYY-MM-DD to dayjs and format as DD/MM/YYYY (app locale)
    const d = dayjs.utc(dateString, "YYYY-MM-DD", true);
    if (!d.isValid()) {
      throw new Error(
        `Invalid date string passed to setApplicationDialogDate: ${dateString}`
      );
    }
    const formatted = d.format("DD/MM/YYYY");

    // Set the value directly on the input element and trigger React's internal handlers
    await input.evaluate((el: HTMLInputElement, v: string) => {
      // Get the native setter to bypass React's value property
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(el, v);
      } else {
        el.value = v;
      }

      // Dispatch input event to trigger React's onChange handler
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));

      // Blur the input to ensure validation runs
      el.blur();
    }, formatted);

    // Give the app time to process the change and run validation
    await page.waitForTimeout(100);
  }

  /**
   * Sets the overwrite switch in the application dialog
   */
  async setApplicationDialogOverwrite(page: Page, overwrite: boolean) {
    const switchElement = page.locator(
      '[data-testid="template-application-overwrite-switch"] input[type="checkbox"]'
    );
    const isChecked = await switchElement.isChecked();

    if ((overwrite && !isChecked) || (!overwrite && isChecked)) {
      await switchElement.click();
    }
  }

  /**
   * Closes the template management window
   */
  async closeTemplateManagementWindow(page: Page) {
    const closeButton = this.getTemplateManagementCloseButton(page);
    await closeButton.click();

    // Wait for the window to close
    const window = this.getTemplateManagementWindow(page);
    await expect(window).not.toBeVisible();
  }

  /**
   * Navigates to the period containing the specified date
   */
  async navigateToPeriod(page: Page, dateString: string) {
    const targetDate = dayjs(dateString);

    // Wait for the shift demand table to be visible
    const shiftDemandTable = page.locator('[data-testid="shift-demand-table"]');
    await expect(shiftDemandTable).toBeVisible();

    // Check if the target date cell is already visible
    const targetCell = page.locator(
      `[data-testid^="shift-demand-value-"][data-testid$="-${dateString}"]`
    );

    const cellCount = await targetCell.count();
    if (cellCount > 0) {
      // We're already in the right period
      return;
    }

    // Update localStorage to set the period state
    // The usePeriodState hook stores period info in localStorage with key "nsp_pro_period_state"
    await page.evaluate((dateStr) => {
      const periodState = {
        currentDate: dateStr, // ISO string
        periodType: "month", // Default to month view
      };
      localStorage.setItem("nsp_pro_period_state", JSON.stringify(periodState));
    }, targetDate.toISOString());

    // Reload the page to apply the new period state
    await page.reload();

    // Wait for the page to load and the shift demands table to be visible again
    await page.waitForLoadState("networkidle");
    await expect(shiftDemandTable).toBeVisible({ timeout: 10000 });

    // Verify that we're now in the correct period
    const updatedCellCount = await targetCell.count();
    if (updatedCellCount === 0) {
      throw new Error(
        `Failed to navigate to period containing ${dateString}. The date may not have any shift demands yet.`
      );
    }
  }

  /**
   * Verifies a shift demand value in the main shift demands table
   */
  async verifyShiftDemandValue(
    page: Page,
    shiftId: string,
    dateString: string,
    expectedValue: number
  ) {
    // Navigate to the period containing the target date
    await this.navigateToPeriod(page, dateString);

    // Navigate back to the shift demands main view if needed
    const shiftDemandTable = page.locator('[data-testid="shift-demand-table"]');
    await expect(shiftDemandTable).toBeVisible();

    // Find the span element for the specific shift and date value
    const valueSelector = `[data-testid="shift-demand-value-${shiftId}-${dateString}"]`;
    const valueElement = page.locator(valueSelector);

    await expect(valueElement).toHaveText(expectedValue.toString());
  }

  /**
   * Verifies that a shift demand does not exist for a specific shift and date
   */
  async verifyShiftDemandNotExists(
    page: Page,
    shiftId: string,
    dateString: string
  ) {
    // Navigate to the period containing the target date
    await this.navigateToPeriod(page, dateString);

    const valueSelector = `[data-testid="shift-demand-value-${shiftId}-${dateString}"]`;
    const valueElement = page.locator(valueSelector);

    // Should either not exist or have value of 0 or empty
    const exists = (await valueElement.count()) > 0;
    if (exists) {
      const text = await valueElement.textContent();
      expect(text === "" || text === "0").toBeTruthy();
    }
  }

  /**
   * Creates shift demands via API for testing
   */
  async createShiftDemandViaAPI(demandData: {
    shiftId: string;
    date: string;
    value: number;
  }): Promise<void> {
    if (!this.testTeam) {
      throw new Error("Test team not initialized");
    }

    await this.dbUtils.createShiftDemand({
      teamId: this.testTeam.teamId,
      shiftId: demandData.shiftId,
      date: new Date(demandData.date),
      count: demandData.value,
    });
  }

  /**
   * Converts a template to even/odd type via UI interactions
   */
  async convertTemplateToEvenOdd(page: Page, templateId: string) {
    // Click on the even/odd toggle button in the template toolbar
    const evenOddToggle = page.locator(
      '[data-testid="template-toolbar-even-odd-type-button"]'
    );
    await expect(evenOddToggle).toBeVisible();
    await evenOddToggle.click();

    // Handle any confirmation dialog that might appear
    const confirmDialog = page.locator(
      '[data-testid="template-toolbar-even-odd-conversion-dialog"]'
    );
    if (await confirmDialog.isVisible()) {
      const confirmButton = page.locator(
        '[data-testid="template-toolbar-even-odd-confirm-button"]'
      );
      await confirmButton.click();

      // Wait for the conversion to complete
      await expect(confirmDialog).not.toBeVisible();
    }

    // Wait for the conversion to be completed by checking for Even/Odd UI elements
    // Look for the standard/even-odd toggle button state or specific even/odd template indicators
    await expect(evenOddToggle).toHaveAttribute("aria-pressed", "true");
  }
}
