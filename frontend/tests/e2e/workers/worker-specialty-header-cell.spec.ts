import { test, expect, Page } from "@playwright/test";
import { WorkerTestBase } from "../../utils/worker-test-base";

const workerTestBase = new WorkerTestBase();

test.describe("Worker Specialty Header Cell", () => {
  let testWorker: { workerId: string; name: string; teamId: string };
  let testSpecialties: { specialtyId: string; name: string; teamId: string }[];

  test.beforeEach(async ({ page }) => {
    // Setup the common worker test environment
    await workerTestBase.setupWorkerTests(test.info().workerIndex);

    // Create a test worker
    const workerName = `Test Worker ${test.info().workerIndex}-${Date.now()}`;
    testWorker = await workerTestBase.createTestWorker({
      name: workerName,
      weeklyHours: 40,
      weeklyHoursDesired: 40,
      dutiesPerMonth: 4,
      annualLeave: 25,
    });

    // Create some test specialties
    testSpecialties = [];
    const specialty1 = await workerTestBase.createTestSpecialty({
      name: `Cardiology ${test.info().workerIndex}-${Date.now()}`,
    });
    const specialty2 = await workerTestBase.createTestSpecialty({
      name: `Neurology ${test.info().workerIndex}-${Date.now()}`,
    });
    testSpecialties.push(specialty1, specialty2);

    console.log(
      `Created test worker: ${testWorker.name} (${testWorker.workerId})`
    );
    console.log(
      `Created test specialties: ${testSpecialties
        .map((s) => s.name)
        .join(", ")}`
    );

    // Navigate to the workers page
    await workerTestBase.navigateToWorkersPage(page);

    // Wait for the worker table to load
    await page.waitForSelector('[aria-label="worker table"]');
  });

  test.afterEach(async () => {
    // Clean up: delete the worker and specialties created for this test
    if (testWorker?.workerId) {
      try {
        await workerTestBase.deleteTestWorker(testWorker.workerId);
        console.log(`Deleted test worker: ${testWorker.workerId}`);
      } catch (error) {
        console.warn(`Failed to delete test worker: ${error}`);
      }
    }

    // Clean up specialties
    for (const specialty of testSpecialties) {
      try {
        await workerTestBase.deleteTestSpecialty(specialty.specialtyId);
        console.log(`Deleted test specialty: ${specialty.specialtyId}`);
      } catch (error) {
        console.warn(`Failed to delete test specialty: ${error}`);
      }
    }
  });

  test("should show popup with 'Update specialties' title when clicking on specialties header", async ({
    page,
  }) => {
    // Find the specialties header cell
    const specialtyHeaderCell = page.locator(
      '[data-testid="worker-specialty-header-cell"]'
    );
    await expect(specialtyHeaderCell).toBeVisible();

    // Click on the specialties header
    await specialtyHeaderCell.click();

    // Wait for the popup to appear
    const popup = page.locator('[data-testid="update-specialties-form"]');
    await expect(popup).toBeVisible();

    // Verify the popup has the correct title
    const title = page.locator('[data-testid="update-specialties-title"]');
    await expect(title).toBeVisible();
    await expect(title).toContainText("Update specialties");

    console.log(
      "✅ Popup with 'Update specialties' title appears when clicking header"
    );
  });

  test("should add new specialty when entering name and pressing enter", async ({
    page,
  }) => {
    // Click on the specialties header to open popup
    const specialtyHeaderCell = page.locator(
      '[data-testid="worker-specialty-header-cell"]'
    );
    await specialtyHeaderCell.click();

    // Wait for the popup to appear
    const popup = page.locator('[data-testid="update-specialties-form"]');
    await expect(popup).toBeVisible();

    // Find the input field for new specialty
    const newSpecialtyInput = page.locator(
      '[data-testid="new-specialty-input"]'
    );
    await expect(newSpecialtyInput).toBeVisible();

    // Type a new specialty name
    const newSpecialtyName = `Orthopedics ${
      test.info().workerIndex
    }-${Date.now()}`;
    await newSpecialtyInput.fill(newSpecialtyName);

    // Press Enter to add the specialty
    await newSpecialtyInput.press("Enter");

    // Wait a moment for the specialty to be added
    await page.waitForTimeout(500);

    // Verify the specialty appears in the list
    const specialtiesList = page.locator('[data-testid="specialties-list"]');
    await expect(specialtiesList).toContainText(newSpecialtyName);

    // Verify the input field is cleared
    await expect(newSpecialtyInput).toHaveValue("");

    console.log(`✅ New specialty "${newSpecialtyName}" added successfully`);
  });

  test("should show edit input when clicking edit button next to existing specialty", async ({
    page,
  }) => {
    // Use one of our pre-created test specialties
    const testSpecialty = testSpecialties[0];

    // Click on the specialties header to open popup
    const specialtyHeaderCell = page.locator(
      '[data-testid="worker-specialty-header-cell"]'
    );
    await specialtyHeaderCell.click();

    // Wait for the popup to appear
    const popup = page.locator('[data-testid="update-specialties-form"]');
    await expect(popup).toBeVisible();

    // Find the specialty in the list
    const specialtyItem = page.locator(
      `[data-testid="specialty-item-${testSpecialty.specialtyId}"]`
    );
    await expect(specialtyItem).toBeVisible();

    // Find and click the edit button
    const editButton = page.locator(
      `[data-testid="specialty-edit-button-${testSpecialty.specialtyId}"]`
    );
    await expect(editButton).toBeVisible();
    await editButton.click();

    // Verify the edit input appears with the current specialty name
    const editInput = page.locator(
      `[data-testid="specialty-edit-input-${testSpecialty.specialtyId}"]`
    );
    await expect(editInput).toBeVisible();
    await expect(editInput).toHaveValue(testSpecialty.name);

    // Verify the confirm and cancel buttons are visible
    const confirmButton = page.locator(
      `[data-testid="specialty-confirm-edit-${testSpecialty.specialtyId}"]`
    );
    const cancelButton = page.locator(
      `[data-testid="specialty-cancel-edit-${testSpecialty.specialtyId}"]`
    );
    await expect(confirmButton).toBeVisible();
    await expect(cancelButton).toBeVisible();

    console.log(`✅ Edit mode activated for specialty "${testSpecialty.name}"`);
  });

  test("should update specialty name when editing and clicking checkmark", async ({
    page,
  }) => {
    // Use one of our pre-created test specialties
    const testSpecialty = testSpecialties[0];

    // Click on the specialties header to open popup
    const specialtyHeaderCell = page.locator(
      '[data-testid="worker-specialty-header-cell"]'
    );
    await specialtyHeaderCell.click();

    // Wait for the popup to appear
    const popup = page.locator('[data-testid="update-specialties-form"]');
    await expect(popup).toBeVisible();

    // Click the edit button for the specialty
    const editButton = page.locator(
      `[data-testid="specialty-edit-button-${testSpecialty.specialtyId}"]`
    );
    await editButton.click();

    // Find the edit input and change the name
    const editInput = page.locator(
      `[data-testid="specialty-edit-input-${testSpecialty.specialtyId}"]`
    );
    await expect(editInput).toBeVisible();

    const newName = `Updated ${testSpecialty.name}`;
    await editInput.fill(newName);

    // Click the confirm button (checkmark)
    const confirmButton = page.locator(
      `[data-testid="specialty-confirm-edit-${testSpecialty.specialtyId}"]`
    );
    await confirmButton.click();

    // Wait for the update to complete
    await page.waitForTimeout(500);

    // Verify the specialty name is updated in the display
    const specialtyName = page.locator(
      `[data-testid="specialty-name-${testSpecialty.specialtyId}"]`
    );
    await expect(specialtyName).toContainText(newName);

    // Verify we're no longer in edit mode
    const editInputAfter = page.locator(
      `[data-testid="specialty-edit-input-${testSpecialty.specialtyId}"]`
    );
    await expect(editInputAfter).not.toBeVisible();

    console.log(
      `✅ Specialty name updated from "${testSpecialty.name}" to "${newName}"`
    );
  });

  test("should cancel editing and keep original name when clicking cross", async ({
    page,
  }) => {
    // Use one of our pre-created test specialties
    const testSpecialty = testSpecialties[0];
    const originalName = testSpecialty.name;

    // Click on the specialties header to open popup
    const specialtyHeaderCell = page.locator(
      '[data-testid="worker-specialty-header-cell"]'
    );
    await specialtyHeaderCell.click();

    // Wait for the popup to appear
    const popup = page.locator('[data-testid="update-specialties-form"]');
    await expect(popup).toBeVisible();

    // Click the edit button for the specialty
    const editButton = page.locator(
      `[data-testid="specialty-edit-button-${testSpecialty.specialtyId}"]`
    );
    await editButton.click();

    // Find the edit input and change the name
    const editInput = page.locator(
      `[data-testid="specialty-edit-input-${testSpecialty.specialtyId}"]`
    );
    await expect(editInput).toBeVisible();

    const tempName = `Temp Changed ${testSpecialty.name}`;
    await editInput.fill(tempName);

    // Click the cancel button (cross)
    const cancelButton = page.locator(
      `[data-testid="specialty-cancel-edit-${testSpecialty.specialtyId}"]`
    );
    await cancelButton.click();

    // Wait for the cancel to complete
    await page.waitForTimeout(500);

    // Verify the original specialty name is still displayed
    const specialtyName = page.locator(
      `[data-testid="specialty-name-${testSpecialty.specialtyId}"]`
    );
    await expect(specialtyName).toContainText(originalName);

    // Verify we're no longer in edit mode
    const editInputAfter = page.locator(
      `[data-testid="specialty-edit-input-${testSpecialty.specialtyId}"]`
    );
    await expect(editInputAfter).not.toBeVisible();

    console.log(
      `✅ Edit cancelled successfully, name remains "${originalName}"`
    );
  });

  test("should remove specialty from list when clicking delete button", async ({
    page,
  }) => {
    // Use one of our pre-created test specialties
    const testSpecialty = testSpecialties[0];

    // Click on the specialties header to open popup
    const specialtyHeaderCell = page.locator(
      '[data-testid="worker-specialty-header-cell"]'
    );
    await specialtyHeaderCell.click();

    // Wait for the popup to appear
    const popup = page.locator('[data-testid="update-specialties-form"]');
    await expect(popup).toBeVisible();

    // Verify the specialty is initially visible
    const specialtyItem = page.locator(
      `[data-testid="specialty-item-${testSpecialty.specialtyId}"]`
    );
    await expect(specialtyItem).toBeVisible();

    // Find and click the delete button
    const deleteButton = page.locator(
      `[data-testid="specialty-delete-button-${testSpecialty.specialtyId}"]`
    );
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Wait for the deletion to complete
    await page.waitForTimeout(500);

    // Verify the specialty is no longer visible in the list
    await expect(specialtyItem).not.toBeVisible();

    console.log(`✅ Specialty "${testSpecialty.name}" deleted successfully`);

    // Remove the deleted specialty from our test array to avoid cleanup errors
    const index = testSpecialties.findIndex(
      (s) => s.specialtyId === testSpecialty.specialtyId
    );
    if (index > -1) {
      testSpecialties.splice(index, 1);
    }
  });

  test("should handle keyboard interactions in edit mode", async ({ page }) => {
    // Use one of our pre-created test specialties
    const testSpecialty = testSpecialties[0];

    // Click on the specialties header to open popup
    const specialtyHeaderCell = page.locator(
      '[data-testid="worker-specialty-header-cell"]'
    );
    await specialtyHeaderCell.click();

    // Wait for the popup to appear
    const popup = page.locator('[data-testid="update-specialties-form"]');
    await expect(popup).toBeVisible();

    // Click the edit button for the specialty
    const editButton = page.locator(
      `[data-testid="specialty-edit-button-${testSpecialty.specialtyId}"]`
    );
    await editButton.click();

    // Find the edit input
    const editInput = page.locator(
      `[data-testid="specialty-edit-input-${testSpecialty.specialtyId}"]`
    );
    await expect(editInput).toBeVisible();

    // Test Enter key to confirm edit
    const newName = `Keyboard Updated ${testSpecialty.name}`;
    await editInput.fill(newName);
    await editInput.press("Enter");

    // Wait for the update to complete
    await page.waitForTimeout(500);

    // Verify the specialty name is updated
    const specialtyName = page.locator(
      `[data-testid="specialty-name-${testSpecialty.specialtyId}"]`
    );
    await expect(specialtyName).toContainText(newName);

    console.log(`✅ Enter key successfully updated specialty to "${newName}"`);

    // Test Escape key to cancel edit (using the second specialty)
    // const secondSpecialty = testSpecialties[1];
    // if (secondSpecialty) {
    //   const secondEditButton = page.locator(
    //     `[data-testid="specialty-edit-button-${secondSpecialty.specialtyId}"]`
    //   );
    //   await secondEditButton.click();

    //   const secondEditInput = page.locator(
    //     `[data-testid="specialty-edit-input-${secondSpecialty.specialtyId}"]`
    //   );
    //   await expect(secondEditInput).toBeVisible();

    //   // Change the name then press Escape
    //   await secondEditInput.fill(`Temp ${secondSpecialty.name}`);
    //   await secondEditInput.press("Escape");

    //   // Wait for the cancel to complete
    //   await page.waitForTimeout(500);

    //   // Verify the original name is preserved
    //   const secondSpecialtyName = page.locator(
    //     `[data-testid="specialty-name-${secondSpecialty.specialtyId}"]`
    //   );
    //   await expect(secondSpecialtyName).toContainText(secondSpecialty.name);

    //   console.log(`✅ Escape key successfully cancelled edit`);
    // }
  });

  test("should close popup when clicking save button", async ({ page }) => {
    // Click on the specialties header to open popup
    const specialtyHeaderCell = page.locator(
      '[data-testid="worker-specialty-header-cell"]'
    );
    await specialtyHeaderCell.click();

    // Wait for the popup to appear
    const popup = page.locator('[data-testid="update-specialties-form"]');
    await expect(popup).toBeVisible();

    // Click the save button
    const saveButton = page.locator('[data-testid="save-specialties-button"]');
    await expect(saveButton).toBeVisible();
    await saveButton.click();

    // Wait for the popup to close
    await page.waitForTimeout(500);

    // Verify the popup is no longer visible
    await expect(popup).not.toBeVisible();

    console.log("✅ Popup closed successfully when clicking save button");
  });
});
