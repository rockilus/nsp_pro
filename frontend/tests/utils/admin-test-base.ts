/**
 * Admin Test Base Utilities
 *
 * This module provides utilities for E2E testing of the admin panel
 * functionality. It includes methods to:
 * - Set up clean database state for each test
 * - Authenticate as admin or non-admin user
 * - Perform direct API calls as a specific user (for authorization tests)
 * - Navigate to admin pages
 *
 * The admin user (TEST_USER / "64e9b7f1e13e4a1a9c8b4567") is preserved
 * across all DB resets by utils_routes.py and is manually configured
 * with system_role = "super_admin" outside of test code.
 *
 * TEST_USER_2 is the non-admin user, created fresh in each test's beforeEach.
 */

import { Page } from "@playwright/test";
import { DatabaseTestUtils, TEST_USER, TEST_USER_2 } from "./database-utils";
import { testConfig } from "./test-config";
import { UserT } from "../../src/types/user";

export class AdminTestBase {
  protected dbUtils: DatabaseTestUtils;

  constructor() {
    this.dbUtils = new DatabaseTestUtils();
  }

  /**
   * Setup a clean environment for an admin test.
   * - Resets all data (admin user is automatically preserved)
   * - Creates TEST_USER_2 as a regular (non-admin) user
   *
   * @param workerIndex - Playwright worker index for unique naming
   */
  async setup(workerIndex: number): Promise<void> {
    console.log(`[AdminTestBase] Setup starting (worker ${workerIndex})`);

    await this.dbUtils.waitForServicesReady(30_000);
    await this.dbUtils.resetAllData();

    // Create the non-admin test user
    await this.dbUtils.createTestUser({
      user_id: TEST_USER_2.user_id,
      email: TEST_USER_2.email,
      username: TEST_USER_2.username,
      first_name: TEST_USER_2.first_name,
      last_name: TEST_USER_2.last_name,
    });

    console.log(`[AdminTestBase] Setup complete (worker ${workerIndex})`);
  }

  /**
   * Authenticate the Playwright page as the admin user (TEST_USER).
   */
  async actAsAdmin(page: Page): Promise<void> {
    await this.dbUtils.authenticatePageAsUser(page, TEST_USER.user_id);
  }

  /**
   * Authenticate the Playwright page as the non-admin user (TEST_USER_2).
   */
  async actAsNonAdmin(page: Page): Promise<void> {
    await this.dbUtils.authenticatePageAsUser(page, TEST_USER_2.user_id);
  }

  /**
   * Navigate to the admin users page.
   */
  async navigateToAdminUsersPage(page: Page): Promise<void> {
    await page.goto(`${testConfig.frontendUrl}/en/admin/users`);
  }

  /**
   * Navigate to the admin root (which redirects to /admin/users).
   */
  async navigateToAdminRoot(page: Page): Promise<void> {
    await page.goto(`${testConfig.frontendUrl}/en/admin`);
  }

  /**
   * Make an HTTP request authenticated as the admin user (TEST_USER).
   * Throws on non-2xx responses — catch the error to inspect status.
   */
  async makeAdminRequest<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
    data?: any,
  ): Promise<T> {
    const client = this.dbUtils.createAuthenticatedClientForUser(
      TEST_USER.user_id,
    );
    switch (method) {
      case "GET":
        return client.get<T>(endpoint);
      case "POST":
        return client.post<T>(endpoint, data);
      case "PUT":
        return client.put<T>(endpoint, data);
      case "DELETE":
        return client.delete<T>(endpoint);
    }
  }

  /**
   * Make an HTTP request authenticated as the non-admin user (TEST_USER_2).
   * Throws on non-2xx responses — catch the error to test for 403s.
   */
  async makeNonAdminRequest<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
    data?: any,
  ): Promise<T> {
    const client = this.dbUtils.createAuthenticatedClientForUser(
      TEST_USER_2.user_id,
    );
    switch (method) {
      case "GET":
        return client.get<T>(endpoint);
      case "POST":
        return client.post<T>(endpoint, data);
      case "PUT":
        return client.put<T>(endpoint, data);
      case "DELETE":
        return client.delete<T>(endpoint);
    }
  }

  /**
   * Fetch all users via the admin API, authenticated as admin.
   * Useful for verifying DB state independently of the UI.
   */
  async getAdminUsersViaApi(): Promise<UserT[]> {
    return this.makeAdminRequest<UserT[]>("GET", "/admin/users");
  }

  /**
   * Return the admin test user constants for use in assertions.
   */
  getAdminUser() {
    return TEST_USER;
  }

  /**
   * Return the non-admin test user constants for use in assertions.
   */
  getNonAdminUser() {
    return TEST_USER_2;
  }
}
