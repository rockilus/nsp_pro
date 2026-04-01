/**
 * End-to-end tests for TemplateToolbar in Shift Demands Template Management
 *
 * Tests cover:
 * - Adding weeks to templates
 * - Removing weeks from templates with confirmation dialog
 * - Week navigation button states and functionality
 * - Template type switching (Standard/Even-Odd) with different scenarios
 * - UI state consistency after toolbar operations
 */

import { test, expect } from "@playwright/test";
import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import isBetween from "dayjs/plugin/isBetween";
import utc from "dayjs/plugin/utc";
import { TemplateTestBase } from "../../utils/template-test-base";

dayjs.extend(isoWeek);
dayjs.extend(isBetween);
dayjs.extend(utc);

test.describe("Template Toolbar Period", () => {
  let templateTestBase: TemplateTestBase;

  test.beforeAll(async () => {
    // Setup once for all tests to avoid timeout issues
    templateTestBase = new TemplateTestBase();
    await templateTestBase.setupTemplateTests();
  });

  test.beforeEach(async ({ page }) => {
    // Navigate to the page since setup is already done
    await templateTestBase.navigateToShiftDemandsPage(page);
  });

  test.describe("Week Management", () => {
    test("should add a week when clicking the add button", async ({ page }) => {
      // Create a template to work with
      const templateName = `Test Template Add Week ${Date.now()}`;
      const templateId = await templateTestBase.createTemplateWithWeeks({
        name: templateName,
        weekCount: 1,
      });

      // Open template management and select the template
      await templateTestBase.openTemplateManagementWindow(page);
      await templateTestBase.selectTemplateInViewer(page, templateId);

      const toolbarElements = templateTestBase.getTemplateToolbarElements(page);

      // Verify initial state (1 week)
      const initialWeeks = templateTestBase.getTemplateTableWeeks(page);
      await expect(initialWeeks).toHaveCount(1);

      // Click the add week button
      await toolbarElements.addWeekButton.click();

      // Wait for the table to update and verify 2 weeks
      await templateTestBase.waitForTemplateTableUpdate(page, 2);
      const updatedWeeks = templateTestBase.getTemplateTableWeeks(page);
      await expect(updatedWeeks).toHaveCount(2);

      // Verify week display updated to show 2 weeks total
      await expect(toolbarElements.weekDisplay).toContainText("/2");
    });

    test("should remove a week when clicking remove button and confirming", async ({
      page,
    }) => {
      // Create a template with 1 week
      const templateName = `Test Template Remove Week ${Date.now()}`;
      const templateId = await templateTestBase.createTemplateWithWeeks({
        name: templateName,
        weekCount: 1,
      });

      // Open template management and select the template
      await templateTestBase.openTemplateManagementWindow(page);
      await templateTestBase.selectTemplateInViewer(page, templateId);

      // Add 2 more weeks to have 3 total using the helper method
      await templateTestBase.addWeekViaToolbar(page);
      await templateTestBase.waitForTemplateTableUpdate(page, 2);

      await templateTestBase.addWeekViaToolbar(page);
      await templateTestBase.waitForTemplateTableUpdate(page, 3);

      // Verify we have 3 weeks total (check toolbar display)
      const totalWeeks = await templateTestBase.getTotalWeekCount(page);
      expect(totalWeeks).toBe(3);

      // Remove one week using the helper method
      await templateTestBase.removeWeekViaToolbar(page, true);
      await templateTestBase.waitForTemplateTableUpdate(page, 2);

      // Verify we now have 2 weeks total
      const finalWeeks = await templateTestBase.getTotalWeekCount(page);
      expect(finalWeeks).toBe(2);
    });

    test("should cancel week removal when clicking cancel in confirmation dialog", async ({
      page,
    }) => {
      // Create a template with 1 week
      const templateName = `Test Template Cancel Remove ${Date.now()}`;
      const templateId = await templateTestBase.createTemplateWithWeeks({
        name: templateName,
        weekCount: 1,
      });

      // Open template management and select the template
      await templateTestBase.openTemplateManagementWindow(page);
      await templateTestBase.selectTemplateInViewer(page, templateId);

      // Add one more week to have 2 total
      await templateTestBase.addWeekViaToolbar(page);
      await templateTestBase.waitForTemplateTableUpdate(page, 2);

      // Try to remove a week but cancel
      await templateTestBase.removeWeekViaToolbar(page, false); // false = cancel

      // Verify we still have 2 weeks (no change)
      const weeks = templateTestBase.getTemplateTableWeeks(page);
      await expect(weeks).toHaveCount(2);
    });

    test("should disable remove button when only one week exists", async ({
      page,
    }) => {
      // Create a template with 1 week
      const templateName = `Test Template Single Week ${Date.now()}`;
      const templateId = await templateTestBase.createTemplateWithWeeks({
        name: templateName,
        weekCount: 1,
      });

      // Open template management and select the template
      await templateTestBase.openTemplateManagementWindow(page);
      await templateTestBase.selectTemplateInViewer(page, templateId);

      const toolbarElements = templateTestBase.getTemplateToolbarElements(page);

      // Verify remove button is disabled
      await expect(toolbarElements.removeWeekButton).toBeDisabled();

      // Verify we have 1 week
      const weeks = templateTestBase.getTemplateTableWeeks(page);
      await expect(weeks).toHaveCount(1);
    });
  });

  test.describe("Week Navigation", () => {
    test("should disable navigation buttons when 2 weeks or less", async ({
      page,
    }) => {
      // Create a template with 1 week
      const templateName = `Test Template Navigation 1 Week ${Date.now()}`;
      const templateId = await templateTestBase.createTemplateWithWeeks({
        name: templateName,
        weekCount: 1,
      });

      // Open template management and select the template
      await templateTestBase.openTemplateManagementWindow(page);
      await templateTestBase.selectTemplateInViewer(page, templateId);

      const toolbarElements = templateTestBase.getTemplateToolbarElements(page);

      // Both navigation buttons should be disabled with 1 week
      await expect(toolbarElements.previousWeekButton).toBeDisabled();
      await expect(toolbarElements.nextWeekButton).toBeDisabled();

      // Add one more week (total: 2 weeks)
      await toolbarElements.addWeekButton.click();
      await templateTestBase.waitForTemplateTableUpdate(page, 2);

      // Both navigation buttons should still be disabled with 2 weeks
      await expect(toolbarElements.previousWeekButton).toBeDisabled();
      await expect(toolbarElements.nextWeekButton).toBeDisabled();
    });

    test("should enable navigation buttons when more than 2 weeks exist", async ({
      page,
    }) => {
      // Create a template with 1 week, will add more via UI
      const templateName = `Test Template Navigation Multi Week ${Date.now()}`;
      const templateId = await templateTestBase.createTemplateWithWeeks({
        name: templateName,
        weekCount: 1,
      });

      // Open template management and select the template
      await templateTestBase.openTemplateManagementWindow(page);
      await templateTestBase.selectTemplateInViewer(page, templateId);

      const toolbarElements = templateTestBase.getTemplateToolbarElements(page);

      // Add weeks to get to 4 total
      await toolbarElements.addWeekButton.click();
      await templateTestBase.waitForTemplateTableUpdate(page, 2);
      await toolbarElements.addWeekButton.click();
      await templateTestBase.waitForTemplateTableUpdate(page, 3);
      await toolbarElements.addWeekButton.click();
      await templateTestBase.waitForTemplateTableUpdate(page, 4);

      // Verify we have 4 weeks total (check toolbar display)
      const totalWeeks = await templateTestBase.getTotalWeekCount(page);
      expect(totalWeeks).toBe(4);

      // Now navigation buttons should be enabled (we're at start, so only next is enabled)
      await expect(toolbarElements.previousWeekButton).toBeDisabled(); // At first week
      await expect(toolbarElements.nextWeekButton).not.toBeDisabled(); // Can go to next

      // Navigate forward
      await toolbarElements.nextWeekButton.click();

      // Now both buttons should be enabled (we're in the middle)
      await expect(toolbarElements.previousWeekButton).not.toBeDisabled();
      await expect(toolbarElements.nextWeekButton).not.toBeDisabled();

      // Navigate to the end
      await toolbarElements.nextWeekButton.click();

      // Now only previous should be enabled (we're at the last position)
      await expect(toolbarElements.previousWeekButton).not.toBeDisabled();
      await expect(toolbarElements.nextWeekButton).toBeDisabled(); // At last week
    });

    test("should update week display when navigating", async ({ page }) => {
      // Create a template with 1 week, will add more via UI
      const templateName = `Test Template Week Display ${Date.now()}`;
      const templateId = await templateTestBase.createTemplateWithWeeks({
        name: templateName,
        weekCount: 1,
      });

      // Open template management and select the template
      await templateTestBase.openTemplateManagementWindow(page);
      await templateTestBase.selectTemplateInViewer(page, templateId);

      const toolbarElements = templateTestBase.getTemplateToolbarElements(page);

      // Add weeks to get to 4 total
      for (let i = 1; i < 4; i++) {
        await toolbarElements.addWeekButton.click();
        await templateTestBase.waitForTemplateTableUpdate(page, i + 1);
      }

      // Initial display should show total of 4 weeks
      await expect(toolbarElements.weekDisplay).toContainText("/4");

      // Navigate forward
      await toolbarElements.nextWeekButton.click();

      // Should still show total of 4 weeks
      await expect(toolbarElements.weekDisplay).toContainText("/4");

      // Navigate forward again
      await toolbarElements.nextWeekButton.click();

      // Should still show total of 4 weeks (showing last position)
      await expect(toolbarElements.weekDisplay).toContainText("/4");

      // Navigate back
      await toolbarElements.previousWeekButton.click();

      // Should still show total of 4 weeks
      await expect(toolbarElements.weekDisplay).toContainText("/4");
    });
  });

  test.describe("Template Type Switching", () => {
    test("should switch to even/odd immediately when template has 2 or fewer weeks", async ({
      page,
    }) => {
      // Create a template with 2 weeks
      const templateName = `Test Template Even Odd 2 Weeks ${Date.now()}`;
      const templateId = await templateTestBase.createTemplateWithWeeks({
        name: templateName,
        weekCount: 1,
      });

      // Open template management and select the template
      await templateTestBase.openTemplateManagementWindow(page);
      await templateTestBase.selectTemplateInViewer(page, templateId);

      const toolbarElements = templateTestBase.getTemplateToolbarElements(page);

      // Add one more week to have 2 total
      await toolbarElements.addWeekButton.click();
      await templateTestBase.waitForTemplateTableUpdate(page, 2);

      // Verify standard type is currently selected
      await expect(toolbarElements.standardTypeButton).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(toolbarElements.evenOddTypeButton).toHaveAttribute(
        "aria-pressed",
        "false",
      );

      // Click even/odd type
      await toolbarElements.evenOddTypeButton.click();

      // Should switch immediately without confirmation dialog
      await expect(toolbarElements.evenOddTypeButton).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(toolbarElements.standardTypeButton).toHaveAttribute(
        "aria-pressed",
        "false",
      );

      // Table headers should show "Even Week" and "Odd Week"
      await expect(page.locator('th:has-text("Even Week")')).toBeVisible();
      await expect(page.locator('th:has-text("Odd Week")')).toBeVisible();
    });

    test("should switch to even/odd immediately and add week when template has 1 week", async ({
      page,
    }) => {
      // Create a template with 1 week
      const templateName = `Test Template Even Odd 1 Week ${Date.now()}`;
      const templateId = await templateTestBase.createTemplateWithWeeks({
        name: templateName,
        weekCount: 1,
      });

      // Open template management and select the template
      await templateTestBase.openTemplateManagementWindow(page);
      await templateTestBase.selectTemplateInViewer(page, templateId);

      const toolbarElements = templateTestBase.getTemplateToolbarElements(page);

      // Verify we start with 1 week
      let weeks = templateTestBase.getTemplateTableWeeks(page);
      await expect(weeks).toHaveCount(1);

      // Click even/odd type
      await toolbarElements.evenOddTypeButton.click();

      // Should switch immediately and add a week (total: 2 weeks)
      await templateTestBase.waitForTemplateTableUpdate(page, 2);
      weeks = templateTestBase.getTemplateTableWeeks(page);
      await expect(weeks).toHaveCount(2);

      // Type should be switched
      await expect(toolbarElements.evenOddTypeButton).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(toolbarElements.standardTypeButton).toHaveAttribute(
        "aria-pressed",
        "false",
      );

      // Table headers should show "Even Week" and "Odd Week"
      await expect(page.locator('th:has-text("Even Week")')).toBeVisible();
      await expect(page.locator('th:has-text("Odd Week")')).toBeVisible();
    });

    test("should show confirmation dialog when switching to even/odd with more than 2 weeks", async ({
      page,
    }) => {
      // Create a template with 1 week, will add more via UI
      const templateName = `Test Template Even Odd Confirmation ${Date.now()}`;
      const templateId = await templateTestBase.createTemplateWithWeeks({
        name: templateName,
        weekCount: 1,
      });

      // Open template management and select the template
      await templateTestBase.openTemplateManagementWindow(page);
      await templateTestBase.selectTemplateInViewer(page, templateId);

      const toolbarElements = templateTestBase.getTemplateToolbarElements(page);

      // Add weeks to get to 4 total
      for (let i = 1; i < 4; i++) {
        await toolbarElements.addWeekButton.click();
        await templateTestBase.waitForTemplateTableUpdate(page, i + 1);
      }

      // Verify we have 4 weeks total (check toolbar display)
      const totalWeeks = await templateTestBase.getTotalWeekCount(page);
      expect(totalWeeks).toBe(4);

      // Click even/odd type
      await toolbarElements.evenOddTypeButton.click();

      // Confirmation dialog should appear
      const conversionDialogElements =
        templateTestBase.getEvenOddConversionDialogElements(page);
      await expect(conversionDialogElements.dialog).toBeVisible();
      await expect(conversionDialogElements.dialog).toContainText("Week 3");
      await expect(conversionDialogElements.dialog).toContainText("Week 4");

      // Confirm the conversion
      await conversionDialogElements.confirmButton.click();

      // Wait for dialog to close and template to update
      await expect(conversionDialogElements.dialog).not.toBeVisible();
      await templateTestBase.waitForTemplateTableUpdate(page, 2);

      // Should now have 2 weeks (verify via toolbar display)
      const finalWeeks = await templateTestBase.getTotalWeekCount(page);
      expect(finalWeeks).toBe(2);

      // Type should be switched
      await expect(toolbarElements.evenOddTypeButton).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(toolbarElements.standardTypeButton).toHaveAttribute(
        "aria-pressed",
        "false",
      );

      // Table headers should show "Even Week" and "Odd Week"
      await expect(page.locator('th:has-text("Even Week")')).toBeVisible();
      await expect(page.locator('th:has-text("Odd Week")')).toBeVisible();
    });

    test("should cancel even/odd conversion when clicking cancel in confirmation dialog", async ({
      page,
    }) => {
      // Create a template with 1 week, will add more via UI
      const templateName = `Test Template Even Odd Cancel ${Date.now()}`;
      const templateId = await templateTestBase.createTemplateWithWeeks({
        name: templateName,
        weekCount: 1,
      });

      // Open template management and select the template
      await templateTestBase.openTemplateManagementWindow(page);
      await templateTestBase.selectTemplateInViewer(page, templateId);

      const toolbarElements = templateTestBase.getTemplateToolbarElements(page);

      // Add weeks to get to 3 total
      await toolbarElements.addWeekButton.click();
      await templateTestBase.waitForTemplateTableUpdate(page, 2);
      await toolbarElements.addWeekButton.click();
      await templateTestBase.waitForTemplateTableUpdate(page, 3);

      // Verify we have 3 weeks (check toolbar display)
      const initialWeeks = await templateTestBase.getTotalWeekCount(page);
      expect(initialWeeks).toBe(3);

      // Click even/odd type
      await toolbarElements.evenOddTypeButton.click();

      // Confirmation dialog should appear
      const conversionDialogElements =
        templateTestBase.getEvenOddConversionDialogElements(page);
      await expect(conversionDialogElements.dialog).toBeVisible();

      // Cancel the conversion
      await conversionDialogElements.cancelButton.click();

      // Wait for dialog to close
      await expect(conversionDialogElements.dialog).not.toBeVisible();

      // Should still have 3 weeks (no change - check toolbar display)
      const finalWeeks = await templateTestBase.getTotalWeekCount(page);
      expect(finalWeeks).toBe(3);

      // Type should remain standard
      await expect(toolbarElements.standardTypeButton).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(toolbarElements.evenOddTypeButton).toHaveAttribute(
        "aria-pressed",
        "false",
      );

      // Table headers should show standard week numbering (visible ones)
      await expect(page.locator('th:has-text("Week 1")')).toBeVisible();
      await expect(page.locator('th:has-text("Week 2")')).toBeVisible();
      // Week 3 exists but may not be visible due to 2-week display limit
    });

    test("should switch back from even/odd to standard", async ({ page }) => {
      // Create a template with 1 week and convert to even/odd first
      const templateName = `Test Template Standard Switch ${Date.now()}`;
      const templateId = await templateTestBase.createTemplateWithWeeks({
        name: templateName,
        weekCount: 1,
      });

      // Open template management and select the template
      await templateTestBase.openTemplateManagementWindow(page);
      await templateTestBase.selectTemplateInViewer(page, templateId);

      const toolbarElements = templateTestBase.getTemplateToolbarElements(page);

      // Switch to even/odd first (this should add a week)
      await toolbarElements.evenOddTypeButton.click();
      await templateTestBase.waitForTemplateTableUpdate(page, 2);

      // Verify even/odd is active
      await expect(toolbarElements.evenOddTypeButton).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(page.locator('th:has-text("Even Week")')).toBeVisible();
      await expect(page.locator('th:has-text("Odd Week")')).toBeVisible();

      // Switch back to standard
      await toolbarElements.standardTypeButton.click();

      // Should switch immediately
      await expect(toolbarElements.standardTypeButton).toHaveAttribute(
        "aria-pressed",
        "true",
      );
      await expect(toolbarElements.evenOddTypeButton).toHaveAttribute(
        "aria-pressed",
        "false",
      );

      // Table headers should show "Week 1" and "Week 2" (use specific table locator)
      await expect(page.locator('th:has-text("Week 1")')).toBeVisible();
      await expect(page.locator('th:has-text("Week 2")')).toBeVisible();
      // Even/Odd labels should be gone
      await expect(page.locator('th:has-text("Even Week")')).not.toBeVisible();
      await expect(page.locator('th:has-text("Odd Week")')).not.toBeVisible();
    });
  });

  test.describe("UI State Consistency", () => {
    test("should maintain consistent button states after multiple operations", async ({
      page,
    }) => {
      // Create a template
      const templateName = `Test Template Consistency ${Date.now()}`;
      const templateId = await templateTestBase.createTemplateWithWeeks({
        name: templateName,
        weekCount: 1,
      });

      // Open template management and select the template
      await templateTestBase.openTemplateManagementWindow(page);
      await templateTestBase.selectTemplateInViewer(page, templateId);

      const toolbarElements = templateTestBase.getTemplateToolbarElements(page);

      // Perform a series of operations that should work: add week, switch to even/odd, switch back to standard

      // 1. Add a week (1 -> 2 weeks)
      await toolbarElements.addWeekButton.click();
      await templateTestBase.waitForTemplateTableUpdate(page, 2);

      // Navigation should still be disabled (2 weeks)
      await expect(toolbarElements.previousWeekButton).toBeDisabled();
      await expect(toolbarElements.nextWeekButton).toBeDisabled();

      // 2. Switch to even/odd (this locks the template at 2 weeks)
      await toolbarElements.evenOddTypeButton.click();
      await expect(toolbarElements.evenOddTypeButton).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      // Wait for the type switch to complete
      await templateTestBase.waitForTemplateTableUpdate(page, 2);

      // In even/odd mode with 2 weeks, add/remove buttons should be disabled (locked state)
      await expect(toolbarElements.addWeekButton).toBeDisabled();
      await expect(toolbarElements.removeWeekButton).toBeDisabled();

      // 3. Switch back to standard (unlocks the template)
      await toolbarElements.standardTypeButton.click();
      await expect(toolbarElements.standardTypeButton).toHaveAttribute(
        "aria-pressed",
        "true",
      );

      // Wait for the switch to complete
      await templateTestBase.waitForTemplateTableUpdate(page, 2);

      // Now buttons should be enabled again (except navigation with 2 weeks)
      await expect(toolbarElements.addWeekButton).not.toBeDisabled();
      await expect(toolbarElements.removeWeekButton).not.toBeDisabled();
      await expect(toolbarElements.previousWeekButton).toBeDisabled();
      await expect(toolbarElements.nextWeekButton).toBeDisabled();

      // Template type should be standard
      await expect(toolbarElements.standardTypeButton).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    });

    test("should show correct week numbers in display after operations", async ({
      page,
    }) => {
      // Create a template
      const templateName = `Test Template Week Numbers ${Date.now()}`;
      const templateId = await templateTestBase.createTemplateWithWeeks({
        name: templateName,
        weekCount: 1,
      });

      // Open template management and select the template
      await templateTestBase.openTemplateManagementWindow(page);
      await templateTestBase.selectTemplateInViewer(page, templateId);

      const toolbarElements = templateTestBase.getTemplateToolbarElements(page);

      // Add weeks up to 5 total
      for (let i = 1; i < 5; i++) {
        await toolbarElements.addWeekButton.click();
        await templateTestBase.waitForTemplateTableUpdate(page, i + 1);

        // Check that week display shows correct total
        await expect(toolbarElements.weekDisplay).toContainText(`/${i + 1}`);
      }

      // Should display "Week 1, 2/5" (showing first 2 of 5)
      await expect(toolbarElements.weekDisplay).toContainText("1, 2");
      await expect(toolbarElements.weekDisplay).toContainText("/5");

      // Navigate to middle
      await toolbarElements.nextWeekButton.click();
      await expect(toolbarElements.weekDisplay).toContainText("2, 3");
      await expect(toolbarElements.weekDisplay).toContainText("/5");

      // Navigate to end
      await toolbarElements.nextWeekButton.click();
      await toolbarElements.nextWeekButton.click();
      await expect(toolbarElements.weekDisplay).toContainText("4, 5");
      await expect(toolbarElements.weekDisplay).toContainText("/5");

      // Remove a week (5 -> 4 weeks)
      await toolbarElements.removeWeekButton.click();
      const deleteDialogElements =
        templateTestBase.getDeleteWeekDialogElements(page);
      await deleteDialogElements.confirmButton.click();
      await templateTestBase.waitForTemplateTableUpdate(page, 4);

      // Should now display total count of 4 weeks (adjusted to valid range)
      await expect(toolbarElements.weekDisplay).toContainText("/4");
      const finalWeekCount = await templateTestBase.getTotalWeekCount(page);
      expect(finalWeekCount).toBe(4);
    });
  });
});
