import { test, expect } from "@playwright/test";
import { WorkerTestBase } from "../../utils/worker-test-base";

const workerTestBase = new WorkerTestBase();

test.describe("Worker Specialty Cell", () => {
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
    const specialty3 = await workerTestBase.createTestSpecialty({
      name: `Orthopedics ${test.info().workerIndex}-${Date.now()}`,
    });
    testSpecialties.push(specialty1, specialty2, specialty3);

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
        console.warn(
          `Failed to delete test worker ${testWorker.workerId}:`,
          error
        );
      }
    }

    // Clean up specialties
    for (const specialty of testSpecialties) {
      try {
        await workerTestBase.deleteTestSpecialty(specialty.specialtyId);
        console.log(`Deleted test specialty: ${specialty.specialtyId}`);
      } catch (error) {
        console.warn(
          `Failed to delete test specialty ${specialty.specialtyId}:`,
          error
        );
      }
    }
  });

  test("should show popup when clicking on the specialty cell", async ({
    page,
  }) => {
    // Find the specialty cell
    const specialtyCell = page.locator('[data-testid="worker-specialty-cell"]');
    await expect(specialtyCell).toBeVisible();

    // Click on the specialty cell
    await specialtyCell.click();

    // Wait for the popup to appear
    const popup = page.locator('[data-testid="worker-specialty-edit-popup"]');
    await expect(popup).toBeVisible();

    console.log("✅ Popup appears when clicking on specialty cell");
  });

  test("should list all specialties in the popup", async ({ page }) => {
    // Click on the specialty cell to open popup
    const specialtyCell = page.locator('[data-testid="worker-specialty-cell"]');
    await specialtyCell.click();

    // Wait for the popup to appear
    const popup = page.locator('[data-testid="worker-specialty-edit-popup"]');
    await expect(popup).toBeVisible();

    // Verify all test specialties are listed
    const optionsList = page.locator('[data-testid="specialty-options-list"]');
    await expect(optionsList).toBeVisible();

    for (const specialty of testSpecialties) {
      const option = page.locator(
        `[data-testid="specialty-option-${specialty.specialtyId}"]`
      );
      await expect(option).toBeVisible();
      await expect(option).toContainText(specialty.name);
    }

    console.log("✅ All specialties are listed in the popup");
  });

  test("should add specialty as chip when clicking on it in the list", async ({
    page,
  }) => {
    // Click on the specialty cell to open popup
    const specialtyCell = page.locator('[data-testid="worker-specialty-cell"]');
    await specialtyCell.click();

    // Wait for the popup to appear
    const popup = page.locator('[data-testid="worker-specialty-edit-popup"]');
    await expect(popup).toBeVisible();

    // Click on a specialty to select it
    const specialty = testSpecialties[0];
    const option = page.locator(
      `[data-testid="specialty-option-${specialty.specialtyId}"]`
    );
    await option.click();

    // Verify the specialty appears as a selected chip
    const selectedChip = page.locator(
      `[data-testid="selected-specialty-chip-${specialty.specialtyId}"]`
    );
    await expect(selectedChip).toBeVisible();
    await expect(selectedChip).toContainText(specialty.name);

    console.log(`✅ Specialty "${specialty.name}" added as chip`);
  });

  test("should remove selected specialty when clicking delete cross", async ({
    page,
  }) => {
    // First, add a specialty to the worker
    await workerTestBase.updateTestWorker(testWorker.workerId, {
      name: testWorker.name,
    });

    // Update worker with a specialty
    const specialty = testSpecialties[0];
    const updatedWorker = await workerTestBase.updateTestWorker(
      testWorker.workerId,
      {
        specialtyIds: [specialty.specialtyId],
      }
    );

    // Refresh the page to see the updated worker
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Click on the specialty cell to open popup
    const specialtyCell = page.locator('[data-testid="worker-specialty-cell"]');
    await specialtyCell.click();

    // Wait for the popup to appear
    const popup = page.locator('[data-testid="worker-specialty-edit-popup"]');
    await expect(popup).toBeVisible();

    // Verify the specialty is selected
    const selectedChip = page.locator(
      `[data-testid="selected-specialty-chip-${specialty.specialtyId}"]`
    );
    await expect(selectedChip).toBeVisible();

    // Click the delete cross
    const deleteButton = page.locator(
      `[data-testid="remove-specialty-${specialty.specialtyId}"]`
    );
    await deleteButton.click();

    // Verify the chip is removed
    await expect(selectedChip).not.toBeVisible();

    console.log(`✅ Specialty "${specialty.name}" removed via delete cross`);
  });

  test("should filter specialties when typing in search input", async ({
    page,
  }) => {
    // Click on the specialty cell to open popup
    const specialtyCell = page.locator('[data-testid="worker-specialty-cell"]');
    await specialtyCell.click();

    // Wait for the popup to appear
    const popup = page.locator('[data-testid="worker-specialty-edit-popup"]');
    await expect(popup).toBeVisible();

    // Type in the search input to filter
    const searchInput = page.locator('[data-testid="specialty-search-input"]');
    await searchInput.fill("Card");

    // Verify only Cardiology appears in the filtered list
    const cardiologyOption = page.locator(
      `[data-testid="specialty-option-${testSpecialties[0].specialtyId}"]`
    );
    await expect(cardiologyOption).toBeVisible();

    // Verify other specialties are not visible
    const neurologyOption = page.locator(
      `[data-testid="specialty-option-${testSpecialties[1].specialtyId}"]`
    );
    await expect(neurologyOption).not.toBeVisible();

    console.log("✅ Search input filters specialties correctly");
  });

  test("should not show selected specialty in available options", async ({
    page,
  }) => {
    // Click on the specialty cell to open popup
    const specialtyCell = page.locator('[data-testid="worker-specialty-cell"]');
    await specialtyCell.click();

    // Wait for the popup to appear
    const popup = page.locator('[data-testid="worker-specialty-edit-popup"]');
    await expect(popup).toBeVisible();

    // Select a specialty
    const specialty = testSpecialties[0];
    const option = page.locator(
      `[data-testid="specialty-option-${specialty.specialtyId}"]`
    );
    await option.click();

    // Verify the specialty appears as selected
    const selectedChip = page.locator(
      `[data-testid="selected-specialty-chip-${specialty.specialtyId}"]`
    );
    await expect(selectedChip).toBeVisible();

    // Verify the specialty no longer appears in the options list
    await expect(option).not.toBeVisible();

    console.log(
      `✅ Selected specialty "${specialty.name}" no longer appears in options`
    );
  });

  test("should remove last selected specialty when pressing backspace in empty input", async ({
    page,
  }) => {
    // Click on the specialty cell to open popup
    const specialtyCell = page.locator('[data-testid="worker-specialty-cell"]');
    await specialtyCell.click();

    // Wait for the popup to appear
    const popup = page.locator('[data-testid="worker-specialty-edit-popup"]');
    await expect(popup).toBeVisible();

    // Select two specialties
    const specialty1 = testSpecialties[0];
    const specialty2 = testSpecialties[1];

    const option1 = page.locator(
      `[data-testid="specialty-option-${specialty1.specialtyId}"]`
    );
    const option2 = page.locator(
      `[data-testid="specialty-option-${specialty2.specialtyId}"]`
    );

    await option1.click();
    await option2.click();

    // Verify both are selected
    const selectedChip1 = page.locator(
      `[data-testid="selected-specialty-chip-${specialty1.specialtyId}"]`
    );
    const selectedChip2 = page.locator(
      `[data-testid="selected-specialty-chip-${specialty2.specialtyId}"]`
    );
    await expect(selectedChip1).toBeVisible();
    await expect(selectedChip2).toBeVisible();

    // Focus on search input, clear it, and press backspace
    const searchInput = page.locator('[data-testid="specialty-search-input"]');
    await searchInput.focus();
    await searchInput.fill(""); // Make sure input is empty
    await searchInput.press("Backspace");

    // Verify the last selected specialty (specialty2) is removed
    await expect(selectedChip2).not.toBeVisible();
    await expect(selectedChip1).toBeVisible();

    console.log("✅ Last selected specialty removed with backspace");
  });

  test("should close popup when clicking away", async ({ page }) => {
    // Click on the specialty cell to open popup
    const specialtyCell = page.locator('[data-testid="worker-specialty-cell"]');
    await specialtyCell.click();

    // Wait for the popup to appear
    const popup = page.locator('[data-testid="worker-specialty-edit-popup"]');
    await expect(popup).toBeVisible();

    // Click away from the popup (on the page title)
    const pageTitle = page.getByRole("heading", { name: "Workers" });
    await pageTitle.click();

    // Verify the popup is closed
    await expect(popup).not.toBeVisible();

    console.log("✅ Popup closes when clicking away");
  });

  test("should close popup when pressing escape", async ({ page }) => {
    // Click on the specialty cell to open popup
    const specialtyCell = page.locator('[data-testid="worker-specialty-cell"]');
    await specialtyCell.click();

    // Wait for the popup to appear
    const popup = page.locator('[data-testid="worker-specialty-edit-popup"]');
    await expect(popup).toBeVisible();

    // Press escape in the search input
    const searchInput = page.locator('[data-testid="specialty-search-input"]');
    await searchInput.focus();
    await searchInput.press("Escape");

    // Verify the popup is closed
    await expect(popup).not.toBeVisible();

    console.log("✅ Popup closes when pressing escape");
  });

  test("should show selected specialties in the specialty cell", async ({
    page,
  }) => {
    // Update worker with specialties
    const specialty1 = testSpecialties[0];
    const specialty2 = testSpecialties[1];
    await workerTestBase.updateTestWorker(testWorker.workerId, {
      specialtyIds: [specialty1.specialtyId, specialty2.specialtyId],
    });

    // Refresh the page to see the updated worker
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Verify the specialties appear as chips in the cell
    const chip1 = page.locator(
      `[data-testid="specialty-chip-${specialty1.specialtyId}"]`
    );
    const chip2 = page.locator(
      `[data-testid="specialty-chip-${specialty2.specialtyId}"]`
    );

    await expect(chip1).toBeVisible();
    await expect(chip1).toContainText(specialty1.name);
    await expect(chip2).toBeVisible();
    await expect(chip2).toContainText(specialty2.name);

    console.log("✅ Selected specialties appear in specialty cell");
  });

  test("should reflect changes in specialty cell after closing popup", async ({
    page,
  }) => {
    // Click on the specialty cell to open popup
    const specialtyCell = page.locator('[data-testid="worker-specialty-cell"]');
    await specialtyCell.click();

    // Wait for the popup to appear
    const popup = page.locator('[data-testid="worker-specialty-edit-popup"]');
    await expect(popup).toBeVisible();

    // Add a specialty
    const specialty = testSpecialties[0];
    const option = page.locator(
      `[data-testid="specialty-option-${specialty.specialtyId}"]`
    );
    await option.click();

    // Close popup by clicking away
    const pageTitle = page.getByRole("heading", { name: "Workers" });
    await pageTitle.click();

    // Wait for popup to close
    await expect(popup).not.toBeVisible();

    // Wait a moment for the update to process
    await page.waitForTimeout(500);

    // Verify the specialty now appears in the cell
    const chip = page.locator(
      `[data-testid="specialty-chip-${specialty.specialtyId}"]`
    );
    await expect(chip).toBeVisible();
    await expect(chip).toContainText(specialty.name);

    console.log("✅ Added specialty appears in cell after closing popup");
  });

  test("should reflect removal of specialty in cell after closing popup", async ({
    page,
  }) => {
    // First, add a specialty to the worker
    const specialty = testSpecialties[0];
    await workerTestBase.updateTestWorker(testWorker.workerId, {
      specialtyIds: [specialty.specialtyId],
    });

    // Refresh the page to see the updated worker
    await page.reload();
    await page.waitForSelector('[aria-label="worker table"]');

    // Verify the specialty chip is initially visible
    const chip = page.locator(
      `[data-testid="specialty-chip-${specialty.specialtyId}"]`
    );
    await expect(chip).toBeVisible();

    // Click on the specialty cell to open popup
    const specialtyCell = page.locator('[data-testid="worker-specialty-cell"]');
    await specialtyCell.click();

    // Wait for the popup to appear
    const popup = page.locator('[data-testid="worker-specialty-edit-popup"]');
    await expect(popup).toBeVisible();

    // Remove the specialty by clicking its delete button
    const deleteButton = page.locator(
      `[data-testid="remove-specialty-${specialty.specialtyId}"]`
    );
    await deleteButton.click();

    // Close popup by clicking away
    const pageTitle = page.getByRole("heading", { name: "Workers" });
    await pageTitle.click();

    // Wait for popup to close
    await expect(popup).not.toBeVisible();

    // Wait a moment for the update to process
    await page.waitForTimeout(1000);

    // Verify the specialty chip is no longer visible in the cell
    await expect(chip).not.toBeVisible();

    console.log(
      "✅ Removed specialty no longer appears in cell after closing popup"
    );
  });

  test("should allow selecting specialty with Enter key", async ({ page }) => {
    // Click on the specialty cell to open popup
    const specialtyCell = page.locator('[data-testid="worker-specialty-cell"]');
    await specialtyCell.click();

    // Wait for the popup to appear
    const popup = page.locator('[data-testid="worker-specialty-edit-popup"]');
    await expect(popup).toBeVisible();

    // Type to filter to a specific specialty
    const searchInput = page.locator('[data-testid="specialty-search-input"]');
    await searchInput.fill("Card");

    // Press Enter to select the first filtered option
    await searchInput.press("Enter");

    // Verify the specialty is selected
    const specialty = testSpecialties[0]; // Cardiology should be the first
    const selectedChip = page.locator(
      `[data-testid="selected-specialty-chip-${specialty.specialtyId}"]`
    );
    await expect(selectedChip).toBeVisible();

    console.log("✅ Specialty selected with Enter key");
  });

  test("should show empty specialty cell when no specialties are assigned", async ({
    page,
  }) => {
    // Verify the specialty cell is visible but empty (no chips)
    const specialtyCell = page.locator('[data-testid="worker-specialty-cell"]');
    await expect(specialtyCell).toBeVisible();

    // Verify no specialty chips are present
    const anyChip = page.locator('[data-testid^="specialty-chip-"]');
    await expect(anyChip).toHaveCount(0);

    console.log("✅ Empty specialty cell displayed correctly");
  });

  test("should navigate through options with arrow keys", async ({ page }) => {
    // Click on the specialty cell to open popup
    const specialtyCell = page.locator('[data-testid="worker-specialty-cell"]');
    await specialtyCell.click();

    // Wait for the popup to appear
    const popup = page.locator('[data-testid="worker-specialty-edit-popup"]');
    await expect(popup).toBeVisible();

    // Focus on search input
    const searchInput = page.locator('[data-testid="specialty-search-input"]');
    await searchInput.focus();

    // Press down arrow to select first option
    await searchInput.press("ArrowDown");

    // Verify first option is highlighted (selected state)
    const firstOption = page.locator(
      `[data-testid="specialty-option-${testSpecialties[0].specialtyId}"]`
    );
    await expect(firstOption).toHaveClass(/Mui-selected/);

    // Press down arrow again to move to second option
    await searchInput.press("ArrowDown");

    // Verify second option is highlighted
    const secondOption = page.locator(
      `[data-testid="specialty-option-${testSpecialties[1].specialtyId}"]`
    );
    await expect(secondOption).toHaveClass(/Mui-selected/);

    // Press up arrow to go back to first option
    await searchInput.press("ArrowUp");

    // Verify first option is highlighted again
    await expect(firstOption).toHaveClass(/Mui-selected/);

    console.log("✅ Arrow key navigation works correctly");
  });
});
