import { expect, test } from '@playwright/test';

import { auditPageAccessibility } from './accessibility';
import { expectHomePage, openHomePage } from './home';
import { openBulkUpload, openSingularSelection } from './journeys';
import { signInThroughOidc } from './oidc';

const authDisabled = process.env.FUNCTIONAL_TEST_AUTH_ENABLED === 'false';

test.describe('HMC Admin UI home', () => {
  test('renders the home journey with authentication disabled locally', async ({ page }) => {
    test.skip(!authDisabled, 'This deterministic home journey runs only with FUNCTIONAL_TEST_AUTH_ENABLED=false.');

    await openBulkUpload(page);
    await expect(page).toHaveURL(/\/bulk-upload$/);
    await expect(page.getByRole('heading', { name: 'Bulk request' })).toBeVisible();
  });

  test('opens the singular request selection page from home with authentication disabled locally', async ({ page }) => {
    test.skip(
      !authDisabled,
      'This deterministic local form journey runs only with FUNCTIONAL_TEST_AUTH_ENABLED=false.'
    );

    await openSingularSelection(page);

    await expect(page).toHaveURL(/\/singular$/);
    await expect(
      page.getByRole('heading', { name: 'What type of singular request would you like to make?' })
    ).toBeVisible();
  });

  test('shows the required singular request type error with authentication disabled locally', async ({ page }) => {
    test.skip(
      !authDisabled,
      'This deterministic local form journey runs only with FUNCTIONAL_TEST_AUTH_ENABLED=false.'
    );

    await openSingularSelection(page);
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Select a singular request type' })).toBeVisible();
    await expect(page.locator('#singular-request-type-error')).toHaveText(/Select a singular request type/);
  });

  test('signs in through OIDC, shows the home page, and meets WCAG 2.2 AA', async ({ page }, testInfo) => {
    test.skip(authDisabled, 'OIDC is intentionally not part of the authentication-disabled local journey.');

    await openHomePage(page);
    await signInThroughOidc(page);
    await expectHomePage(page);
    const results = await auditPageAccessibility(page, testInfo);

    expect(results.violations).toEqual([]);
  });

  test('signs in through OIDC and opens the protected singular selection page without submitting a request', async ({
    page,
  }) => {
    test.skip(authDisabled, 'OIDC is intentionally not part of the authentication-disabled local journey.');

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
});
