import { expectIdamLoginOrigin } from '../oidc';
import { expect, test } from '../protected-test';

test.describe('HMC Admin UI protected authentication boundary', () => {
  test(
    'redirects an unauthenticated user from a protected route to IDAM',
    { tag: '@feature:authentication' },
    async ({ page }) => {
      await page.goto('/singular?lng=en');

      await expectIdamLoginOrigin(page);
      await expect(page.getByRole('textbox', { name: /email|username/i })).toBeVisible();
    }
  );
});
