import { expect, test } from '@playwright/test';

import { auditPageAccessibility } from '../functional/accessibility';
import { openHomePage } from '../functional/home';
import { openSingularSelection, selectSingularRequestType } from '../functional/journeys';

const hearingId = '12345678901234567890';
const caseReference = '1234567890123456';

async function expectNoAccessibilityViolations(
  page: Parameters<typeof auditPageAccessibility>[0],
  testInfo: Parameters<typeof auditPageAccessibility>[1],
  evidenceName: string
): Promise<void> {
  const results = await auditPageAccessibility(page, testInfo, evidenceName);
  expect(results.violations).toEqual([]);
}

test.describe('HMC Admin UI local fallback accessibility', () => {
  test('audits the rollback response failure state', { tag: '@feature:rollback' }, async ({ page }, testInfo) => {
    await openSingularSelection(page);
    await selectSingularRequestType(page, 'Rollback');
    await page.getByLabel('Hearing ID').fill(hearingId);
    await page.getByLabel('CCD Case Reference Number').fill(caseReference);
    await page.getByLabel('Incident Number / Notes').fill('Accessibility response');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByRole('heading', { name: 'Rollback request unsuccessful' })).toBeVisible();
    await expect(page.getByRole('definition').filter({ hasText: hearingId })).toBeVisible();
    await expectNoAccessibilityViolations(page, testInfo, 'rollback-response-failure');
  });

  test(
    'audits the home page after returning from a completed local request',
    { tag: '@feature:request-selection' },
    async ({ page }, testInfo) => {
      await openHomePage(page);
      await page.getByRole('radio', { name: 'Singular' }).check();
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.getByRole('radio', { name: 'Final state transition' }).check();
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.getByLabel('Hearing ID').fill(hearingId);
      await page.getByLabel('CCD Case Reference Number').fill(caseReference);
      await page.getByLabel('Status').selectOption('CANCELLED');
      await page.getByRole('button', { name: 'Submit' }).click();
      await expect(page.getByRole('heading', { name: 'Final state transition request unsuccessful' })).toBeVisible();
      await page.getByRole('link', { name: 'Return to Support tools' }).click();

      await expect(page).toHaveURL(/\/$/);
      await expectNoAccessibilityViolations(page, testInfo, 'home-after-request');
    }
  );
});
