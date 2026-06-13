/**
 * Shared helpers for interacting with shadcn DatePicker components in E2E tests.
 */
import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

export function englishOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Select a date using a shadcn DatePicker (popover-based, not an <input>).
 */
export async function selectDate(
  page: Page,
  date: dayjs.Dayjs,
  testid = 'edit-assignment-date-picker',
) {
  const datePicker = page.locator(`[data-testid="${testid}"]`);
  await datePicker.waitFor({ state: 'visible' });
  // Some pickers (recurrence-end-date-picker) start disabled.
  await expect(datePicker).toBeEnabled({ timeout: 5000 });
  await datePicker.click();

  // Wait for popover animation, then target the last calendar (most recently opened).
  await page.waitForTimeout(300);
  const calendar = page.locator('[data-slot="calendar"]').last();
  const status = calendar.locator('[role="status"]');
  await status.waitFor({ state: 'visible', timeout: 5000 });

  const targetMonthName = date.format('MMMM');
  const targetYear = date.format('YYYY');

  // Navigate to the target month.
  const nextBtn = calendar.locator('button[name="Go to the Next Month"]');
  for (let i = 0; i < 24; i++) {
    const currentStatus = await status.textContent();
    if (currentStatus?.includes(targetMonthName) && currentStatus?.includes(targetYear)) break;
    await nextBtn.waitFor({ state: 'visible', timeout: 5000 });
    await nextBtn.click();
    await page.waitForTimeout(200);
  }

  const dayName = [
    date.format('dddd'),
    ', ',
    targetMonthName,
    ' ',
    englishOrdinal(date.date()),
    ', ',
    targetYear,
  ].join('');

  const dayButton = page.getByRole('button', { name: dayName });
  await dayButton.waitFor({ state: 'visible' });
  await dayButton.click();

  await expect(datePicker).toContainText(date.format('D MMMM YYYY'));
}
