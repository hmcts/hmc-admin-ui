import { expect, test } from '@playwright/test';

import { openHomePage } from '../home';
import { signInThroughOidc } from '../oidc';

test.describe('HMC Admin UI protected service recovery journeys', () => {
  test.beforeEach(async ({ page }) => {
    await openHomePage(page);
    await signInThroughOidc(page);
  });

  test(
    'returns a not-found response for an unknown protected route',
    { tag: '@feature:not-found' },
    async ({ page }) => {
      const response = await page.goto('/route-that-does-not-exist?lng=en');

      await expect(response?.status()).toBe(404);
      await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();
    }
  );
});
