import { expect, test } from '@playwright/test';

import { openHomePage } from '../home';
import { signInThroughOidc } from '../oidc';

test.describe('HMC Admin UI protected recovery navigation', () => {
  test.beforeEach(async ({ page }) => {
    await openHomePage(page);
    await signInThroughOidc(page);
  });

  test(
    'retries a failed singular request from the service problem page',
    { tag: '@feature:service-recovery' },
    async ({ page }) => {
      const response = await page.goto('/singular/problem?lng=en');

      await expect(response?.status()).toBe(502);
      await page.getByRole('link', { name: 'Try singular request again' }).click();

      await expect(page).toHaveURL(/\/singular$/);
      await expect(
        page.getByRole('heading', { name: 'What type of singular request would you like to make?' })
      ).toBeVisible();
    }
  );

  test(
    'retries a failed bulk request from the service problem page',
    { tag: '@feature:service-recovery' },
    async ({ page }) => {
      const response = await page.goto('/bulk-upload/problem?lng=en');

      await expect(response?.status()).toBe(502);
      await page.getByRole('link', { name: 'Try bulk upload again' }).click();

      await expect(page).toHaveURL(/\/bulk-upload$/);
      await expect(page.getByRole('heading', { name: 'Bulk request' })).toBeVisible();
      await expect(page.getByLabel('Please upload a file')).toBeVisible();
    }
  );

  test(
    'returns from the protected rollback form to singular request selection with Back',
    { tag: '@feature:rollback' },
    async ({ page }) => {
      await page.goto('/singular/rollback?lng=en');
      await page.getByRole('link', { name: 'Back' }).click();

      await expect(page).toHaveURL(/\/singular$/);
      await expect(
        page.getByRole('heading', { name: 'What type of singular request would you like to make?' })
      ).toBeVisible();
    }
  );

  test(
    'returns from the protected bulk upload form to Support tools with Back',
    { tag: '@feature:bulk-upload' },
    async ({ page }) => {
      await page.goto('/bulk-upload?lng=en');
      await page.getByRole('link', { name: 'Back' }).click();

      await expect(page).toHaveURL(/\/?(?:\?lng=en)?$/);
      await expect(page.getByRole('heading', { name: 'What type of request would you like to make?' })).toBeVisible();
    }
  );
});
