import { expect, test } from '@playwright/test';

import { auditPageAccessibility } from '../functional/accessibility';
import { expectHomePage, openHomePage } from '../functional/home';

test('checks the local home page against WCAG 2.2 AA', async ({ page }, testInfo) => {
  await openHomePage(page);
  await expectHomePage(page);

  const results = await auditPageAccessibility(page, testInfo);

  expect(results.violations).toEqual([]);
});

test('checks the local final state validation state against WCAG 2.2 AA', async ({ page }, testInfo) => {
  await page.goto('/singular/final-state-transition?lng=en');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('.govuk-error-message')).toHaveCount(3);

  const results = await auditPageAccessibility(page, testInfo, 'final-state-validation');

  expect(results.violations).toEqual([]);
});
