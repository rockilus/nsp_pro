/**
 * Shared helpers for interacting with shadcn DatePicker components in E2E tests.
 */
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/**
 * Select a date by typing directly into the DatePicker input.
 *
 * The DatePicker component accepts input in DD/MM/YYYY format and parses it
 * on blur (or Enter key). This is more reliable in tests than hunting for
 * calendar day buttons across month navigation.
 */
export async function selectDate(
  page: Page,
  date: dayjs.Dayjs,
  testid = 'edit-assignment-date-picker',
) {
  const input = page.locator(`[data-testid="${testid}"]`);
  await input.waitFor({ state: 'visible' });
  await expect(input).toBeEnabled({ timeout: 5000 });

  const formatted = date.format('DD/MM/YYYY');

  // Triple-click to select all existing text, then type the new date
  await input.click({ clickCount: 3 });
  await input.fill(formatted);
  // Blur triggers parseAndCommit in the DatePicker
  await input.blur();

  // Verify the value took
  await expect(input).toHaveValue(formatted);
}
