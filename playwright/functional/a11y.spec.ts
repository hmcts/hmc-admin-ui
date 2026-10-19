import { expect, test } from '@playwright/test';

import { auditPageAccessibility } from './accessibility';
import { expectHomePage, openHomePage } from './home';

const authDisabled = process.env.FUNCTIONAL_TEST_AUTH_ENABLED === 'false';

test('checks the local home page against WCAG 2.2 AA', async ({ page }, testInfo) => {
  test.skip(!authDisabled, 'The direct OIDC test is the authenticated functional contract.');

  await openHomePage(page);
  await expectHomePage(page);

  const results = await auditPageAccessibility(page, testInfo);

  expect(results.violations).toEqual([]);
});

test('checks the local final state validation state against WCAG 2.2 AA', async ({ page }, testInfo) => {
  test.skip(!authDisabled, 'This deterministic local form journey runs only with FUNCTIONAL_TEST_AUTH_ENABLED=false.');

  await page.goto('/singular/final-state-transition?lng=en');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('.govuk-error-message')).toHaveCount(3);

  const results = await auditPageAccessibility(page, testInfo, 'final-state-validation');

  expect(results.violations).toEqual([]);
});
