import { expect, test } from '@playwright/test';

import { auditPageAccessibility } from '../functional/accessibility';
import { expectHomePage, openHomePage } from '../functional/home';
import { signInThroughOidc } from '../functional/oidc';

test('checks the protected home page against WCAG 2.2 AA', async ({ page }, testInfo) => {
  await openHomePage(page);
  await signInThroughOidc(page);
  await expectHomePage(page);
  await expect(page.getByRole('link', { name: 'Sign out' })).toHaveAttribute('href', '/logout');

  const results = await auditPageAccessibility(page, testInfo);

  expect(results.violations).toEqual([]);
});
