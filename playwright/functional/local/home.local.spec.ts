import { expect, test } from '@playwright/test';

import { openHomePage } from '../home';

test.describe('HMC Admin UI local home journeys', () => {
  test(
    'exposes the semantic home-page contract and a CSRF-backed form',
    { tag: '@feature:request-selection' },
    async ({ page }) => {
      await openHomePage(page);

      await expect(page.getByText('Support tools', { exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'What type of request would you like to make?' })).toBeVisible();
      await expect(page.getByRole('radio', { name: 'Bulk' })).toBeVisible();
      await expect(page.getByRole('radio', { name: 'Singular' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
      const form = page.locator('form[method="post"][action="/"]');
      await expect(form).toHaveCount(1);
      await expect(form.locator('input[type="hidden"][name="_csrf"]')).toHaveAttribute('value', /\S+/);
      await expect(page.getByText('Sign out', { exact: true })).toHaveCount(0);
    }
  );
});
