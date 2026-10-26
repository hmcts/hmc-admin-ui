import { expectHomePage, openHomePage } from '../home';
import { signInThroughOidc } from '../oidc';
import { expect, test } from '../protected-test';

const invalidRequestType = 'unsupported-request-type';

test.describe('HMC Admin UI protected boundary contracts', () => {
  test.beforeEach(async ({ page }) => {
    await openHomePage(page);
    await signInThroughOidc(page);
  });

  test(
    'keeps an unsupported home request type on Support tools',
    { tag: '@feature:request-selection' },
    async ({ page }) => {
      await page.route('**/*', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (request.method() !== 'POST' || url.pathname !== '/') {
          await route.continue();
          return;
        }

        const form = new URLSearchParams(request.postData() ?? '');
        form.set('requestType', invalidRequestType);
        await route.continue({ postData: form.toString() });
      });

      await page.getByRole('button', { name: 'Continue' }).click();

      await expect(page).toHaveURL(/\/?(?:\?lng=en)?$/);
      await expectHomePage(page);
    }
  );

  test(
    'reports an unsupported singular request type without leaving selection',
    { tag: '@feature:request-selection' },
    async ({ page }) => {
      await page.goto('/singular?lng=en');
      await page.route('**/*', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (request.method() !== 'POST' || url.pathname !== '/singular') {
          await route.continue();
          return;
        }

        const form = new URLSearchParams(request.postData() ?? '');
        form.set('singularRequestType', invalidRequestType);
        await route.continue({ postData: form.toString() });
      });

      await page.getByRole('button', { name: 'Continue' }).click();

      await expect(page).toHaveURL(/\/singular$/);
      await expect(page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
      await expect(page.locator('#singular-request-type-error')).toHaveText(/Select a singular request type/);
      await expect(page.getByRole('radio', { name: 'Final state transition' })).toBeVisible();
      await expect(page.getByRole('radio', { name: 'Rollback' })).toBeVisible();
    }
  );

  test(
    'exposes the complete protected final state transition form contract',
    { tag: '@feature:final-state-transition' },
    async ({ page }) => {
      await page.goto('/singular/final-state-transition?lng=en');
      const form = page.locator('form[method="post"][action="/singular/final-state-transition"]');

      await expect(form).toHaveCount(1);
      await expect(form.locator('input[type="hidden"][name="_csrf"]')).toHaveAttribute('value', /\S+/);
      await expect(form.getByLabel('Hearing ID')).toHaveAttribute('name', 'hearingId');
      await expect(form.getByLabel('CCD Case Reference Number')).toHaveAttribute('name', 'caseRef');
      await expect(form.getByLabel('Incident Number / Notes')).toHaveAttribute('name', 'notes');
      await expect(form.getByLabel('Status')).toHaveValue('');
      await expect(form.getByLabel('Status').locator('option')).toHaveText([
        'Select status',
        'Cancelled',
        'Adjourned',
        'Completed',
      ]);
      await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/singular');
      await expect(page.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/');
    }
  );

  test(
    'exposes the protected rollback form without a status control',
    { tag: '@feature:rollback' },
    async ({ page }) => {
      await page.goto('/singular/rollback?lng=en');
      const form = page.locator('form[method="post"][action="/singular/rollback"]');

      await expect(form).toHaveCount(1);
      await expect(form.locator('input[type="hidden"][name="_csrf"]')).toHaveAttribute('value', /\S+/);
      await expect(form.getByLabel('Hearing ID')).toHaveAttribute('name', 'hearingId');
      await expect(form.getByLabel('CCD Case Reference Number')).toHaveAttribute('name', 'caseRef');
      await expect(form.getByLabel('Incident Number / Notes')).toHaveAttribute('name', 'notes');
      await expect(form.getByLabel('Status')).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/singular');
      await expect(page.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/');
    }
  );
});
