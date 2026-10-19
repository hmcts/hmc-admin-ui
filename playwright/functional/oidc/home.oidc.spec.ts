import { expect, test } from '@playwright/test';

import { expectHomePage, openHomePage } from '../home';
import { signInThroughOidc } from '../oidc';

test.describe('HMC Admin UI protected home journeys', () => {
  test('signs in through OIDC and shows the home page', async ({ page }) => {
    await openHomePage(page);
    await signInThroughOidc(page);
    await expectHomePage(page);
  });

  test('signs in through OIDC and opens the protected singular selection page without submitting a request', async ({
    page,
  }) => {
    await openHomePage(page);
    await signInThroughOidc(page);
    await expectHomePage(page);
    await page.getByRole('radio', { name: 'Singular' }).check();
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page).toHaveURL(/\/singular$/);
    await expect(
      page.getByRole('heading', { name: 'What type of singular request would you like to make?' })
    ).toBeVisible();
  });

  test('signs in through OIDC and opens the protected bulk upload form', async ({ page }) => {
    await openHomePage(page);
    await signInThroughOidc(page);
    await page.goto('/bulk-upload?lng=en');

    await expect(page.getByRole('heading', { name: 'Bulk request' })).toBeVisible();
    await expect(page.getByLabel('Please upload a file')).toBeVisible();
  });

  test('signs in through OIDC and opens the protected final state form', async ({ page }) => {
    await openHomePage(page);
    await signInThroughOidc(page);
    await page.goto('/singular/final-state-transition?lng=en');

    await expect(page.getByRole('heading', { name: 'Final state transition' })).toBeVisible();
    await expect(page.getByLabel('Status')).toBeVisible();
  });

  test('signs in through OIDC and opens the protected rollback form', async ({ page }) => {
    await openHomePage(page);
    await signInThroughOidc(page);
    await page.goto('/singular/rollback?lng=en');

    await expect(page.getByRole('heading', { name: 'Rollback' })).toBeVisible();
    await expect(page.getByLabel('Incident Number / Notes')).toBeVisible();
  });
});
