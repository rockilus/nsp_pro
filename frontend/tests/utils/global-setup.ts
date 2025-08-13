/**
 * Global setup for Playwright tests
 *
 * This file runs before all tests and ensures:
 * 1. Backend API is running and accessible
 * 2. Test utilities are available
 * 3. Database can be reset successfully
 */

import { chromium, FullConfig } from "@playwright/test";
import { DatabaseTestUtils } from "./database-utils";

async function globalSetup(config: FullConfig) {
  console.log("🚀 Starting global test setup...");

  const dbUtils = new DatabaseTestUtils();

  try {
    // Wait for API to be ready
    console.log("⏳ Waiting for API to be ready...");
    await dbUtils.waitForApiReady(15000); // 15 second timeout
    console.log("✅ API is ready");

    // Check test utilities health
    console.log("🔍 Checking test utilities health...");
    const health = await dbUtils.checkHealth();

    if (!health.test_utilities_available) {
      throw new Error(
        "Test utilities are not available. Please check environment configuration."
      );
    }
    console.log("✅ Test utilities are healthy and available");

    // Perform initial database reset to ensure clean state
    console.log("🗃️ Performing initial database reset...");
    const resetResult = await dbUtils.resetAllData();
    console.log(
      `✅ Initial database reset completed: ${resetResult.operation_id}`
    );
    console.log(`   Reset ${resetResult.collections_reset.length} collections`);

    // Optional: Verify we can create and query a browser for testing
    const browser = await chromium.launch();
    const page = await browser.newPage();

    // Quick connectivity test to the frontend
    try {
      await page.goto("http://localhost:3000", { timeout: 10000 });
      console.log("✅ Frontend is accessible");
    } catch (error) {
      console.warn("⚠️ Frontend may not be ready:", error);
      // Don't fail setup if frontend isn't ready - tests will handle this
    }

    await browser.close();

    console.log("🎉 Global setup completed successfully");
  } catch (error) {
    console.error("❌ Global setup failed:", error);

    if (error instanceof Error) {
      if (error.message.includes("not ready")) {
        console.error(
          "💡 Make sure the backend API Gateway is running on http://localhost:8000"
        );
      } else if (error.message.includes("test utilities")) {
        console.error(
          "💡 Make sure ENVIRONMENT=test or ENVIRONMENT=development is set"
        );
      }
    }

    throw error;
  }
}

export default globalSetup;
