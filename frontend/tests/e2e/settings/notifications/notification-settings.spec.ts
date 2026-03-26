import { test, expect } from "@playwright/test";
import { randomUUID } from "crypto";
import { DatabaseTestUtils, TEST_USER } from "../../../utils/database-utils";
import { testConfig } from "../../../utils/test-config";
import {
  NOTIFICATION_CATEGORY_ORDER,
  NOTIFICATION_KEYS,
  NOTIFICATION_REGISTRY,
} from "@/types/notification";
import type {
  NotificationKey,
  NotificationCategory,
} from "@/types/notification";
import { TeamMembershipRole } from "@/types/team";

const SETTINGS_URL = `${testConfig.frontendUrl}/en/plan/settings/notifications/`;

// --- Helpers -----------------------------------------------------------------

/** All keys visible to a given role, grouped by category. */
function visibleKeysByCategory(
  role: TeamMembershipRole,
): Partial<Record<NotificationCategory, NotificationKey[]>> {
  return NOTIFICATION_KEYS.filter((key) => {
    const { visibleTo } = NOTIFICATION_REGISTRY[key];
    return visibleTo.length === 0 || visibleTo.includes(role);
  }).reduce<Partial<Record<NotificationCategory, NotificationKey[]>>>(
    (acc, key) => {
      const { category } = NOTIFICATION_REGISTRY[key];
      (acc[category] ??= []).push(key);
      return acc;
    },
    {},
  );
}

// --- Context -----------------------------------------------------------------

interface NotifSettingsContext {
  dbUtils: DatabaseTestUtils;
  team: { teamId: string; name: string };
}

const testContextMap = new Map<string, NotifSettingsContext>();

// =============================================================================
// Owner role — full visibility
// =============================================================================

test.describe("Notification Settings — owner role", () => {
  test.beforeEach(async ({}, testInfo) => {
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    (testInfo as any).testRunId = testRunId;

    const dbUtils = new DatabaseTestUtils();
    await dbUtils.resetDatabase({
      collections: ["teams", "team_memberships", "notification_preferences"],
    });

    // createTeam uses TEST_USER's auth client, making TEST_USER the owner.
    const team = await dbUtils.createTeam({
      name: `Notif Settings Team ${workerIndex}-${Date.now()}`,
    });

    testContextMap.set(testRunId, { dbUtils, team });
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testContextMap.delete(testRunId);
  });

  // 1 — All categories visible ------------------------------------------------

  test("all notification categories are visible", async ({ page }) => {
    await page.goto(SETTINGS_URL);
    await expect(page.locator("role=progressbar")).not.toBeVisible({
      timeout: 10_000,
    });

    for (const cat of NOTIFICATION_CATEGORY_ORDER) {
      await expect(
        page.locator(`[data-testid="notification-category-${cat}"]`),
      ).toBeVisible();
    }
  });

  // 2 — All owner-visible keys in correct categories -------------------------

  test("all owner-visible keys are visible in their correct categories", async ({
    page,
  }) => {
    await page.goto(SETTINGS_URL);
    await expect(page.locator("role=progressbar")).not.toBeVisible({
      timeout: 10_000,
    });

    const keysByCategory = visibleKeysByCategory(TeamMembershipRole.OWNER);

    for (const cat of NOTIFICATION_CATEGORY_ORDER) {
      const keys = keysByCategory[cat];
      if (!keys || keys.length === 0) continue;

      const categoryBox = page.locator(
        `[data-testid="notification-category-${cat}"]`,
      );

      for (const key of keys) {
        await expect(
          categoryBox.locator(`[data-testid="notification-accordion-${key}"]`),
        ).toBeVisible();
      }
    }
  });

  // 4 — Accordion expands and shows both switches with defaults --------------

  test("accordion for each visible key opens and shows in-app and email switches defaulting to on", async ({
    page,
  }) => {
    await page.goto(SETTINGS_URL);
    await expect(page.locator("role=progressbar")).not.toBeVisible({
      timeout: 10_000,
    });

    const keysByCategory = visibleKeysByCategory(TeamMembershipRole.OWNER);
    const ownerKeys = Object.values(keysByCategory).flat() as NotificationKey[];

    for (const key of ownerKeys) {
      // Verify the accordion is present in the correct category
      const { category } = NOTIFICATION_REGISTRY[key];
      const categoryBox = page.locator(
        `[data-testid="notification-category-${category}"]`,
      );
      await expect(
        categoryBox.locator(`[data-testid="notification-accordion-${key}"]`),
      ).toBeVisible();

      // Click summary to expand
      await page
        .locator(`[data-testid="notification-accordion-summary-${key}"]`)
        .click();

      // Both rows must appear
      await expect(
        page.locator(`[data-testid="notification-inapp-row-${key}"]`),
      ).toBeVisible();
      await expect(
        page.locator(`[data-testid="notification-email-row-${key}"]`),
      ).toBeVisible();

      // Both switches default to checked
      await expect(
        page
          .locator(`[data-testid="notification-inapp-row-${key}"]`)
          .locator("input[type=checkbox]"),
      ).toBeChecked();
      await expect(
        page
          .locator(`[data-testid="notification-email-row-${key}"]`)
          .locator("input[type=checkbox]"),
      ).toBeChecked();
    }
  });

  // 5 — Toggling inApp switch persists to API --------------------------------

  test("toggling in-app switch updates notification preferences via API", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils } = testContextMap.get(testRunId)!;

    await page.goto(SETTINGS_URL);
    await expect(page.locator("role=progressbar")).not.toBeVisible({
      timeout: 10_000,
    });

    const ownerKeys = NOTIFICATION_KEYS.filter((key) => {
      const { visibleTo } = NOTIFICATION_REGISTRY[key];
      return (
        visibleTo.length === 0 || visibleTo.includes(TeamMembershipRole.OWNER)
      );
    });

    for (const key of ownerKeys) {
      await page
        .locator(`[data-testid="notification-accordion-summary-${key}"]`)
        .click();
      await expect(
        page.locator(`[data-testid="notification-inapp-row-${key}"]`),
      ).toBeVisible();

      // Toggle OFF
      await Promise.all([
        page.waitForResponse(
          (res) =>
            res.url().includes("notification-preferences") &&
            res.request().method() === "PUT" &&
            res.status() === 200,
        ),
        page
          .locator(`[data-testid="notification-inapp-row-${key}"]`)
          .locator("input[type=checkbox]")
          .click({ force: true }),
      ]);

      let prefs = await dbUtils.getNotificationPreferencesAs(TEST_USER.user_id);
      expect(prefs.preferences[key].inApp).toBe(false);

      // Toggle ON
      await Promise.all([
        page.waitForResponse(
          (res) =>
            res.url().includes("notification-preferences") &&
            res.request().method() === "PUT" &&
            res.status() === 200,
        ),
        page
          .locator(`[data-testid="notification-inapp-row-${key}"]`)
          .locator("input[type=checkbox]")
          .click({ force: true }),
      ]);

      prefs = await dbUtils.getNotificationPreferencesAs(TEST_USER.user_id);
      expect(prefs.preferences[key].inApp).toBe(true);
    }
  });

  // 6 — Toggling email switch persists to API --------------------------------

  test("toggling email switch updates notification preferences via API", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils } = testContextMap.get(testRunId)!;

    await page.goto(SETTINGS_URL);
    await expect(page.locator("role=progressbar")).not.toBeVisible({
      timeout: 10_000,
    });

    const ownerKeys = NOTIFICATION_KEYS.filter((key) => {
      const { visibleTo } = NOTIFICATION_REGISTRY[key];
      return (
        visibleTo.length === 0 || visibleTo.includes(TeamMembershipRole.OWNER)
      );
    });

    for (const key of ownerKeys) {
      await page
        .locator(`[data-testid="notification-accordion-summary-${key}"]`)
        .click();
      await expect(
        page.locator(`[data-testid="notification-email-row-${key}"]`),
      ).toBeVisible();

      // Toggle OFF
      await Promise.all([
        page.waitForResponse(
          (res) =>
            res.url().includes("notification-preferences") &&
            res.request().method() === "PUT" &&
            res.status() === 200,
        ),
        page
          .locator(`[data-testid="notification-email-row-${key}"]`)
          .locator("input[type=checkbox]")
          .click({ force: true }),
      ]);

      let prefs = await dbUtils.getNotificationPreferencesAs(TEST_USER.user_id);
      expect(prefs.preferences[key].email).toBe(false);

      // Toggle ON
      await Promise.all([
        page.waitForResponse(
          (res) =>
            res.url().includes("notification-preferences") &&
            res.request().method() === "PUT" &&
            res.status() === 200,
        ),
        page
          .locator(`[data-testid="notification-email-row-${key}"]`)
          .locator("input[type=checkbox]")
          .click({ force: true }),
      ]);

      prefs = await dbUtils.getNotificationPreferencesAs(TEST_USER.user_id);
      expect(prefs.preferences[key].email).toBe(true);
    }
  });

  // 7 — Status subtitle reflects all four states ----------------------------

  test("accordion subtitle reflects all four channel preference combinations", async ({
    page,
  }, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    const { dbUtils } = testContextMap.get(testRunId)!;

    await page.goto(SETTINGS_URL);
    await expect(page.locator("role=progressbar")).not.toBeVisible({
      timeout: 10_000,
    });

    // Use schedule_published as it is visible to all roles and always present.
    const key = "schedule_published";
    const statusLocator = page.locator(
      `[data-testid="notification-status-${key}"]`,
    );

    // Expand the accordion
    await page
      .locator(`[data-testid="notification-accordion-summary-${key}"]`)
      .click();
    await expect(
      page.locator(`[data-testid="notification-inapp-row-${key}"]`),
    ).toBeVisible();

    // Default: both on → status_in_app_and_email
    await expect(statusLocator).toHaveAttribute(
      "data-status",
      "status_in_app_and_email",
    );

    // Turn inApp off → status_email_only
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("notification-preferences") &&
          res.request().method() === "PUT" &&
          res.status() === 200,
      ),
      page
        .locator(`[data-testid="notification-inapp-row-${key}"]`)
        .locator("input[type=checkbox]")
        .click({ force: true }),
    ]);
    await expect(statusLocator).toHaveAttribute(
      "data-status",
      "status_email_only",
    );

    // Turn email off → status_off
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("notification-preferences") &&
          res.request().method() === "PUT" &&
          res.status() === 200,
      ),
      page
        .locator(`[data-testid="notification-email-row-${key}"]`)
        .locator("input[type=checkbox]")
        .click({ force: true }),
    ]);
    await expect(statusLocator).toHaveAttribute("data-status", "status_off");

    // Verify via API
    const prefs = await dbUtils.getNotificationPreferencesAs(TEST_USER.user_id);
    expect(prefs.preferences[key].inApp).toBe(false);
    expect(prefs.preferences[key].email).toBe(false);

    // Turn inApp on → status_in_app_only
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("notification-preferences") &&
          res.request().method() === "PUT" &&
          res.status() === 200,
      ),
      page
        .locator(`[data-testid="notification-inapp-row-${key}"]`)
        .locator("input[type=checkbox]")
        .click({ force: true }),
    ]);
    await expect(statusLocator).toHaveAttribute(
      "data-status",
      "status_in_app_only",
    );
  });
});

// =============================================================================
// Member role — restricted visibility
// =============================================================================

test.describe("Notification Settings — member role", () => {
  test.beforeEach(async ({}, testInfo) => {
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;
    const testRunId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    (testInfo as any).testRunId = testRunId;

    const dbUtils = new DatabaseTestUtils();
    // No team created — selectedTeam will be null, role defaults to MEMBER.
    await dbUtils.resetDatabase({
      collections: ["teams", "team_memberships", "notification_preferences"],
    });

    testContextMap.set(testRunId, {
      dbUtils,
      team: { teamId: "", name: "" },
    });
  });

  test.afterEach(async ({}, testInfo) => {
    const testRunId = (testInfo as any).testRunId as string;
    if (!testRunId) return;
    testContextMap.delete(testRunId);
  });

  // 3 — Owner-only keys hidden for member ------------------------------------

  test("owner-only notification keys are hidden for member users", async ({
    page,
  }) => {
    await page.goto(SETTINGS_URL);
    await expect(page.locator("role=progressbar")).not.toBeVisible({
      timeout: 10_000,
    });

    const ownerOnlyKeys = NOTIFICATION_KEYS.filter(
      (key) =>
        NOTIFICATION_REGISTRY[key].visibleTo.length > 0 &&
        NOTIFICATION_REGISTRY[key].visibleTo.every(
          (r) => r === TeamMembershipRole.OWNER,
        ),
    );

    const memberVisibleKeys = NOTIFICATION_KEYS.filter((key) => {
      const { visibleTo } = NOTIFICATION_REGISTRY[key];
      return (
        visibleTo.length === 0 || visibleTo.includes(TeamMembershipRole.MEMBER)
      );
    });

    // Member-visible keys must be present
    for (const key of memberVisibleKeys) {
      await expect(
        page.locator(`[data-testid="notification-accordion-${key}"]`),
      ).toBeVisible();
    }

    // Owner-only keys must NOT be present
    for (const key of ownerOnlyKeys) {
      await expect(
        page.locator(`[data-testid="notification-accordion-${key}"]`),
      ).not.toBeVisible();
    }
  });
});
