import { expect, test } from '@playwright/test';

import { openHomePage } from '../home';
import { openBulkUpload, openSingularSelection } from '../journeys';

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

  test(
    'renders the home journey with authentication disabled locally',
    { tag: '@feature:bulk-upload' },
    async ({ page }) => {
      await openBulkUpload(page);
      await expect(page).toHaveURL(/\/bulk-upload$/);
      await expect(page.getByRole('heading', { name: 'Bulk request' })).toBeVisible();
    }
  );

  test(
    'opens the singular request selection page from home with authentication disabled locally',
    { tag: '@feature:request-selection' },
    async ({ page }) => {
      await openSingularSelection(page);

      await expect(page).toHaveURL(/\/singular$/);
      await expect(
        page.getByRole('heading', { name: 'What type of singular request would you like to make?' })
      ).toBeVisible();
    }
  );

  test(
    'shows the required singular request type error with authentication disabled locally',
    { tag: '@feature:request-selection' },
    async ({ page }) => {
      await openSingularSelection(page);
      await page.getByRole('button', { name: 'Continue' }).click();

      await expect(page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Select a singular request type' })).toBeVisible();
      await expect(page.locator('#singular-request-type-error')).toHaveText(/Select a singular request type/);
    }
  );

  test(
    'returns to the home page when no request type is selected',
    { tag: '@feature:request-selection' },
    async ({ page }) => {
      await openHomePage(page);
      await page.getByRole('button', { name: 'Continue' }).click();

      await expect(page).toHaveURL(/\/?(?:\?lng=en)?$/);
      await expect(page.getByRole('heading', { name: 'What type of request would you like to make?' })).toBeVisible();
    }
  );

  test('returns from singular selection to home with Back', { tag: '@feature:request-selection' }, async ({ page }) => {
    await openSingularSelection(page);
    await page.getByRole('link', { name: 'Back' }).click();

    await expect(page).toHaveURL(/\/?(?:\?lng=en)?$/);
    await expect(page.getByRole('heading', { name: 'What type of request would you like to make?' })).toBeVisible();
  });
});
