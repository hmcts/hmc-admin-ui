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
});
