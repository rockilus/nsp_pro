/**
 * E2E tests for the Admin Panel
 *
 * Covers:
 *  - Access control: non-admin is redirected, admin can enter
 *  - Admin users page: lists all users, "access account" starts impersonation,
 *    banner is displayed, "stop impersonation" stops it and returns to admin
 *  - API-level authorization: all admin routes return 403 for non-admin callers
 *
 * The admin user (TEST_USER / "64e9b7f1e13e4a1a9c8b4567") is manually
 * configured with system_role = "super_admin" outside of test code and is
 * automatically preserved across every DB reset.
 *
 * TEST_USER_2 is the non-admin user, created fresh in beforeEach.
 */

import { randomUUID } from "crypto";
import { test, expect } from "@playwright/test";
import { AdminTestBase } from "../../utils/admin-test-base";
import { testConfig } from "../../utils/test-config";

test.describe("Admin Panel", () => {
  // Map of testRunId → AdminTestBase instance, keyed per-test for parallel safety
  const testBasesMap = new Map<string, AdminTestBase>();

  test.beforeEach(async ({ page }, testInfo) => {
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;

    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    console.log(`[Admin Test ${testRunId}] Starting setup`);

    const adminBase = new AdminTestBase();
    testBasesMap.set(testRunId, adminBase);
    (testInfo as any).testRunId = testRunId;

    await adminBase.setup(workerIndex);

    console.log(`[Admin Test ${testRunId}] Setup complete`);
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (testRunId) {
      testBasesMap.delete(testRunId);
      console.log(`[Admin Test ${testRunId}] Cleanup complete`);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Access control — navigation
  // ─────────────────────────────────────────────────────────────────────────

  test.describe("Access control", () => {
    test("non-admin is redirected to schedule page when visiting admin", async ({
      page,
    }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;

      await adminBase.actAsNonAdmin(page);
      await adminBase.navigateToAdminUsersPage(page);

      // SuperAdminGuard performs a client-side redirect to /plan/schedule
      await page.waitForURL(/\/plan\/schedule/, { timeout: 10_000 });

      expect(page.url()).toContain("/plan/schedule");
    });

    test("admin can access the admin panel", async ({ page }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;

      await adminBase.actAsAdmin(page);
      await adminBase.navigateToAdminUsersPage(page);

      // The admin users tab should be visible
      await expect(page.locator('[data-testid="admin-users-tab"]')).toBeVisible(
        { timeout: 10_000 },
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Admin users page
  // ─────────────────────────────────────────────────────────────────────────

  test.describe("Admin users page", () => {
    test("lists all users", async ({ page }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;
      const nonAdminUser = adminBase.getNonAdminUser();

      await adminBase.actAsAdmin(page);
      await adminBase.navigateToAdminUsersPage(page);

      // Wait for table to render
      await expect(
        page.locator('[data-testid="admin-users-table"]'),
      ).toBeVisible({ timeout: 10_000 });

      // TEST_USER_2 row must be present
      await expect(
        page.locator(`[data-testid="user-row-${nonAdminUser.user_id}"]`),
      ).toBeVisible();

      console.log("✅ Admin users table lists all users");
    });

    test("clicking 'access account' starts impersonation and shows banner", async ({
      page,
    }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;
      const nonAdminUser = adminBase.getNonAdminUser();

      await adminBase.actAsAdmin(page);
      await adminBase.navigateToAdminUsersPage(page);

      // Wait for the users table to be visible
      await expect(
        page.locator('[data-testid="admin-users-table"]'),
      ).toBeVisible({ timeout: 10_000 });

      // Click the "Access account" button for TEST_USER_2
      await page
        .locator(`[data-testid="access-account-btn-${nonAdminUser.user_id}"]`)
        .click();

      // The hook navigates to /<lang>/plan/workers after writing sessionStorage
      await page.waitForURL(/\/plan\/workers/, { timeout: 10_000 });

      // The impersonation banner should be visible on the new page
      await expect(
        page.locator('[data-testid="impersonation-banner"]'),
      ).toBeVisible({ timeout: 5_000 });

      console.log("✅ Impersonation started and banner is displayed");

      // ── Team creation via UI while impersonating ────────────────────────
      await adminBase.navigateToTeamsSettingsPage(page);
      await expect(
        page.locator('[data-testid="teams-page-heading"]'),
      ).toBeVisible({ timeout: 10_000 });

      const testTeamName = `Impersonation-Team-${Date.now()}`;

      await page.locator('[data-testid="new-team-btn"]').click();
      await expect(
        page.locator('[data-testid="create-team-submit-btn"]'),
      ).toBeVisible({ timeout: 5_000 });
      await page.locator('[data-testid="team-name-input"]').fill(testTeamName);
      await page.locator('[data-testid="create-team-submit-btn"]').click();

      // Wait for the team to appear in the list (dialog closes, team row shows)
      await expect(page.getByText(testTeamName, { exact: true })).toBeVisible({
        timeout: 10_000,
      });

      console.log(
        `✅ Team "${testTeamName}" created via UI while impersonating`,
      );

      // ── API verification ────────────────────────────────────────────────
      // TEST_USER_2 (the impersonated user) should own the team
      const nonAdminTeams = await adminBase.makeNonAdminRequest<
        Array<{ name: string }>
      >("GET", "/teams");
      expect(nonAdminTeams.some((t) => t.name === testTeamName)).toBe(true);
      console.log("✅ GET /teams as TEST_USER_2 includes the test team");

      // TEST_USER (the admin) should NOT own the team
      const adminTeams = await adminBase.makeAdminRequest<
        Array<{ name: string }>
      >("GET", "/teams");
      expect(adminTeams.some((t) => t.name === testTeamName)).toBe(false);
      console.log("✅ GET /teams as TEST_USER does not include the test team");
    });

    test("'stop impersonation' clears banner and returns to admin users page", async ({
      page,
    }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;
      const nonAdminUser = adminBase.getNonAdminUser();

      await adminBase.actAsAdmin(page);
      await adminBase.navigateToAdminUsersPage(page);

      // Start impersonation
      await expect(
        page.locator('[data-testid="admin-users-table"]'),
      ).toBeVisible({ timeout: 10_000 });

      await page
        .locator(`[data-testid="access-account-btn-${nonAdminUser.user_id}"]`)
        .click();

      await page.waitForURL(/\/plan\/workers/, { timeout: 10_000 });

      // Confirm banner is present
      const banner = page.locator('[data-testid="impersonation-banner"]');
      await expect(banner).toBeVisible({ timeout: 5_000 });

      // Stop impersonation
      await page.locator('[data-testid="stop-impersonation-btn"]').click();

      // Hook navigates to /en/admin/users
      await page.waitForURL(/\/admin\/users/, { timeout: 10_000 });

      // Banner must be gone
      await expect(banner).not.toBeVisible();

      // Should be back on the admin users page
      await expect(page.locator('[data-testid="admin-users-tab"]')).toBeVisible(
        { timeout: 5_000 },
      );

      console.log(
        "✅ Impersonation stopped, banner cleared, back on admin page",
      );
    });

    test("starting impersonation should set expected impersonation token in storage", async ({
      page,
    }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;
      const nonAdminUser = adminBase.getNonAdminUser();

      await adminBase.actAsAdmin(page);
      await adminBase.navigateToAdminUsersPage(page);

      await expect(
        page.locator('[data-testid="admin-users-table"]'),
      ).toBeVisible({ timeout: 10_000 });

      await page
        .locator(`[data-testid="access-account-btn-${nonAdminUser.user_id}"]`)
        .click();

      await page.waitForURL(/\/plan\/workers/, { timeout: 10_000 });

      const raw = await page.evaluate(
        (key) => sessionStorage.getItem(key),
        "admin_impersonation_target",
      );
      expect(raw).not.toBeNull();

      const stored = JSON.parse(raw!);
      expect(stored.userId).toBe(nonAdminUser.user_id);
      expect(stored.firstName).toBe(nonAdminUser.first_name);
      expect(stored.lastName).toBe(nonAdminUser.last_name);
      expect(stored.email).toBe(nonAdminUser.email);
      expect(typeof stored.token).toBe("string");
      expect(stored.token.length).toBeGreaterThan(0);

      console.log(
        "✅ Impersonation sessionStorage entry has expected shape and JWT token",
      );
    });

    test("stopping impersonation should remove impersonation token from storage", async ({
      page,
    }, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;
      const nonAdminUser = adminBase.getNonAdminUser();

      await adminBase.actAsAdmin(page);
      await adminBase.navigateToAdminUsersPage(page);

      await expect(
        page.locator('[data-testid="admin-users-table"]'),
      ).toBeVisible({ timeout: 10_000 });

      await page
        .locator(`[data-testid="access-account-btn-${nonAdminUser.user_id}"]`)
        .click();

      await page.waitForURL(/\/plan\/workers/, { timeout: 10_000 });

      // Pre-condition: token is present in storage after starting impersonation
      const rawBefore = await page.evaluate(
        (key) => sessionStorage.getItem(key),
        "admin_impersonation_target",
      );
      expect(rawBefore).not.toBeNull();

      // Stop impersonation
      await page.locator('[data-testid="stop-impersonation-btn"]').click();
      await page.waitForURL(/\/admin\/users/, { timeout: 10_000 });

      // Token must be removed from storage
      const rawAfter = await page.evaluate(
        (key) => sessionStorage.getItem(key),
        "admin_impersonation_target",
      );
      expect(rawAfter).toBeNull();

      console.log(
        "✅ Impersonation token removed from sessionStorage after stopping",
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // API-level authorization
  // ─────────────────────────────────────────────────────────────────────────

  test.describe("API authorization", () => {
    test("GET /admin/users returns 403 for non-admin user", async ({}, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;
      const adminUser = adminBase.getAdminUser();

      await expect(
        adminBase.makeNonAdminRequest("GET", "/admin/users"),
      ).rejects.toThrow("403");

      console.log("✅ GET /admin/users correctly returns 403 for non-admin");
    });

    test("POST /admin/users/:id/impersonate returns 403 for non-admin user", async ({}, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;
      const adminUser = adminBase.getAdminUser();

      // Non-admin tries to impersonate the admin user
      await expect(
        adminBase.makeNonAdminRequest(
          "POST",
          `/admin/users/${adminUser.user_id}/impersonate`,
        ),
      ).rejects.toThrow("403");

      console.log(
        "✅ POST /admin/users/:id/impersonate correctly returns 403 for non-admin",
      );
    });

    test("DELETE /admin/users/impersonate returns 403 for non-admin user", async ({}, testInfo) => {
      const testRunId = (testInfo as any).testRunId as string;
      const adminBase = testBasesMap.get(testRunId)!;

      await expect(
        adminBase.makeNonAdminRequest("DELETE", "/admin/users/impersonate"),
      ).rejects.toThrow("403");

      console.log(
        "✅ DELETE /admin/users/impersonate correctly returns 403 for non-admin",
      );
    });
  });
});
