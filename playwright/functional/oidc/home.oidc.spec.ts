import { expect, test } from '@playwright/test';

import { expectHomePage, openHomePage } from '../home';
import { signInThroughOidc } from '../oidc';

test.describe('HMC Admin UI protected home journeys', () => {
  test('signs in through OIDC and shows the home page', { tag: '@feature:authentication' }, async ({ page }) => {
    await openHomePage(page);
    await signInThroughOidc(page);
    await expectHomePage(page);
  });

  test(
    'signs in through OIDC and opens the protected singular selection page without submitting a request',
    { tag: '@feature:request-selection' },
    async ({ page }) => {
      await openHomePage(page);
      await signInThroughOidc(page);
      await expectHomePage(page);
      await page.getByRole('radio', { name: 'Singular' }).check();
      await page.getByRole('button', { name: 'Continue' }).click();

      await expect(page).toHaveURL(/\/singular$/);
      await expect(
        page.getByRole('heading', { name: 'What type of singular request would you like to make?' })
      ).toBeVisible();
    }
  );

  test(
    'signs in through OIDC and selects bulk upload from Support tools',
    { tag: '@feature:bulk-upload' },
    async ({ page }) => {
      await openHomePage(page);
      await signInThroughOidc(page);
      await expectHomePage(page);
      await page.getByRole('radio', { name: 'Bulk' }).check();
      await page.getByRole('button', { name: 'Continue' }).click();

      await expect(page).toHaveURL(/\/bulk-upload$/);
      await expect(page.getByRole('heading', { name: 'Bulk request' })).toBeVisible();
    }
  );

  test(
    'signs in through OIDC and opens the protected bulk upload form',
    { tag: '@feature:bulk-upload' },
    async ({ page }) => {
      await openHomePage(page);
      await signInThroughOidc(page);
      await page.goto('/bulk-upload?lng=en');

      await expect(page.getByRole('heading', { name: 'Bulk request' })).toBeVisible();
      await expect(page.getByLabel('Please upload a file')).toBeVisible();
    }
  );

  test(
    'signs in through OIDC and opens the protected final state form',
    { tag: '@feature:final-state-transition' },
    async ({ page }) => {
      await openHomePage(page);
      await signInThroughOidc(page);
      await page.goto('/singular/final-state-transition?lng=en');

      await expect(page.getByRole('heading', { name: 'Final state transition' })).toBeVisible();
      await expect(page.getByLabel('Status')).toBeVisible();
    }
  );

  test(
    'signs in through OIDC and opens the protected rollback form',
    { tag: '@feature:rollback' },
    async ({ page }) => {
      await openHomePage(page);
      await signInThroughOidc(page);
      await page.goto('/singular/rollback?lng=en');

      await expect(page.getByRole('heading', { name: 'Rollback' })).toBeVisible();
      await expect(page.getByLabel('Incident Number / Notes')).toBeVisible();
    }
  );

  test(
    'signs in through OIDC and preserves protected final-state validation errors',
    { tag: '@feature:final-state-transition' },
    async ({ page }) => {
      await openHomePage(page);
      await signInThroughOidc(page);
      await page.goto('/singular/final-state-transition?lng=en');
      await page.getByLabel('Hearing ID').fill('not-a-number');
      await page.getByLabel('CCD Case Reference Number').fill('not-a-case-reference');
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
      await expect(page.locator('#hearing-id-error')).toHaveText(/Hearing ID must be a number/);
      await expect(page.locator('#case-ref-error')).toHaveText(/must be a 16-digit number/);
      await expect(page.locator('#status-error')).toHaveText(/Select a status/);
      await expect(page.getByLabel('Hearing ID')).toHaveValue('not-a-number');
    }
  );
});
