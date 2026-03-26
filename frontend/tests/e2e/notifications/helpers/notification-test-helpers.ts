import { expect, Page, TestInfo } from "@playwright/test";
import { randomUUID } from "crypto";
import { DatabaseTestUtils, TestUser } from "../../../utils/database-utils";
import { testConfig } from "../../../utils/test-config";
import { NotificationTypeT } from "../../../../src/types/notification";

export interface NotifTestContext {
  dbUtils: DatabaseTestUtils;
  team: { teamId: string; name: string };
  user1?: TestUser;
  user2?: TestUser;
}

const NOTIFICATIONS_URL = `${testConfig.frontendUrl}/en/plan/notifications`;

/**
 * Prevents data leakage between parallel workers by keying context on a
 * per-test runId stored on the TestInfo object.
 */
export class NotificationTestContextMap<T> {
  private readonly map = new Map<string, T>();
  private readonly key = "__notifTestRunId";

  initRunId(testInfo: TestInfo): string {
    const workerIndex =
      typeof testInfo.workerIndex === "number" ? testInfo.workerIndex : 0;
    const runId = `${workerIndex}-${testInfo.title}-${randomUUID()}`;
    (testInfo as any)[this.key] = runId;
    return runId;
  }

  getRunId(testInfo: TestInfo): string {
    return (testInfo as any)[this.key] as string;
  }

  set(runId: string, ctx: T): void {
    this.map.set(runId, ctx);
  }

  get(runId: string): T {
    return this.map.get(runId)!;
  }

  delete(runId: string): void {
    this.map.delete(runId);
  }
}

export async function navigateToNotificationsAsUser(
  page: Page,
  dbUtils: DatabaseTestUtils,
  userId: string,
): Promise<void> {
  await dbUtils.authenticatePageAsUser(page, userId);
  await page.goto(NOTIFICATIONS_URL);
  await expect(page.locator('[data-testid="notifications-page"]')).toBeVisible({
    timeout: 10_000,
  });
}

export interface NotificationTestCase {
  type: NotificationTypeT;
  description: string;
  /**
   * Creates all required test data for this notification type.
   * Returns the userId of the user who should receive the notification.
   */
  setup: (
    dbUtils: DatabaseTestUtils,
    team: { teamId: string; name: string },
    user1: TestUser,
    user2: TestUser,
  ) => Promise<string>;
  expectedText: (teamName: string) => string;
  expectedUrlPattern: RegExp;
}
