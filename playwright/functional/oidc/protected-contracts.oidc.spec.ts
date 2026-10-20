import { expect, test } from '@playwright/test';

import { readDownloadedText } from '../downloads';
import { expectHomePage, openHomePage } from '../home';
import { signInThroughOidc } from '../oidc';
import { createUploadFile } from '../upload';

const validCsvHeaders = 'hearingId,caseRef,action,notes,state';

test.describe('HMC Admin UI protected shared contracts', () => {
  test.beforeEach(async ({ page }) => {
    await openHomePage(page);
    await signInThroughOidc(page);
  });

  test('renders a protected home form with CSRF protection', { tag: '@feature:authentication' }, async ({ page }) => {
    await expectHomePage(page);

    const form = page.locator('form[method="post"][action="/"]');
    await expect(form).toHaveCount(1);
    await expect(form.locator('input[type="hidden"][name="_csrf"]')).toHaveAttribute('value', /\S+/);
    await expect(page.getByRole('radio', { name: 'Bulk' })).toBeEnabled();
    await expect(page.getByRole('radio', { name: 'Singular' })).toBeEnabled();
  });

  test(
    'reports a missing protected request selection without changing route',
    { tag: '@feature:request-selection' },
    async ({ page }) => {
      await page.getByRole('button', { name: 'Continue' }).click();

      await expect(page).toHaveURL(/\/?(?:\?lng=en)?$/);
      await expectHomePage(page);
    }
  );

  test(
    'renders protected singular selection with CSRF and both request options',
    { tag: '@feature:request-selection' },
    async ({ page }) => {
      await page.goto('/singular?lng=en');

      const form = page.locator('form[method="post"][action="/singular"]');
      await expect(form).toHaveCount(1);
      await expect(form.locator('input[type="hidden"][name="_csrf"]')).toHaveAttribute('value', /\S+/);
      await expect(page.getByRole('radio', { name: 'Final state transition' })).toBeVisible();
      await expect(page.getByRole('radio', { name: 'Rollback' })).toBeVisible();
    }
  );

  test(
    'preserves quoted notes while reporting a protected bulk validation error',
    { tag: '@feature:bulk-upload' },
    async ({ page }) => {
      await page.goto('/bulk-upload?lng=en');
      const overlongQuotedNotes = `"${'quoted, '.repeat(700)}"`;
      const csv = [validCsvHeaders, `12345678901234567890,1234567890123456,rollback,${overlongQuotedNotes},`].join(
        '\n'
      );
      await page
        .getByLabel('Please upload a file')
        .setInputFiles(createUploadFile('quoted-invalid.csv', 'text/csv', csv));
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page.getByRole('link', { name: /There were validation errors/ })).toBeVisible();
      const rejectedDownload = page.waitForEvent('download');
      await page.getByRole('link', { name: 'Download rejected CSV with issues again' }).click();
      const response = await readDownloadedText(await rejectedDownload);

      await expect(response).toContain('Notes/Incident Number exceeds 5000 character limit.');
    }
  );

  test(
    'returns from the protected bulk response page to Support tools',
    { tag: '@feature:bulk-upload-response' },
    async ({ page }) => {
      await page.goto('/bulk-upload/response?lng=en');
      await expect(page.getByRole('heading', { name: 'Bulk request response' })).toBeVisible();
      await page.getByRole('link', { name: 'Return to Support tools' }).click();

      await expect(page).toHaveURL(/\/?(?:\?lng=en)?$/);
      await expectHomePage(page);
    }
  );
});
