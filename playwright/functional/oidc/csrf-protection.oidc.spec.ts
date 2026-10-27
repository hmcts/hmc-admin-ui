import { readDownloadedText } from '../downloads';
import { openHomePage } from '../home';
import { signInThroughOidc } from '../oidc';
import { expect, test } from '../protected-test';
import { downloadFromLink, omitCsrfBodyToken, omitCsrfQueryToken, submitForm } from '../submission-actions';
import { csvHeaders, headerOnlyResponseCsv } from '../submission-data';
import { createUploadFile } from '../upload';

test.describe('HMC Admin UI protected browser CSRF enforcement', () => {
  test.beforeEach(async ({ page }) => {
    await openHomePage(page);
    await signInThroughOidc(page);
  });

  test(
    'rejects a singular POST without CSRF and permits fresh-token validation recovery',
    { tag: ['@feature:final-state-transition', '@ticket:EXUI-5457'] },
    async ({ page }) => {
      await page.goto('/singular/final-state-transition?lng=en');
      await page.route('**/singular/final-state-transition*', omitCsrfBodyToken);
      const forbidden = await submitForm(page, '/singular/final-state-transition');

      expect(forbidden.status()).toBe(403);
      await page.unroute('**/singular/final-state-transition*', omitCsrfBodyToken);
      await page.goto('/singular/final-state-transition?lng=en');
      const recovered = await submitForm(page, '/singular/final-state-transition');
      expect(recovered.status()).toBe(400);
      await expect(page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
      await expect(page.locator('#hearing-id-error')).toHaveText('Error: Enter a hearing ID');
      await expect(page.locator('#case-ref-error')).toHaveText('Error: Enter a CCD Case Reference Number');
      await expect(page.locator('#status-error')).toHaveText('Error: Select a status');
    }
  );

  test(
    'rejects multipart POST without its URL CSRF token and permits header-only recovery',
    { tag: ['@feature:bulk-upload', '@ticket:EXUI-5457'] },
    async ({ page }) => {
      await page.goto('/bulk-upload?lng=en');
      const form = page.locator('form[data-bulk-upload-form]');
      const hiddenToken = form.locator('input[type="hidden"][name="_csrf"]');
      await expect(hiddenToken).toHaveValue(/\S+/);
      const action = await form.getAttribute('action');
      expect(new URL(action ?? '', page.url()).searchParams.get('_csrf')).toBe(await hiddenToken.inputValue());
      // CSRF runs before multipart parsing, so its token is read from the form action URL.
      await page.route('**/bulk-upload*', omitCsrfQueryToken);
      await page
        .getByLabel('Please upload a file')
        .setInputFiles(createUploadFile('missing-csrf.csv', 'text/csv', csvHeaders));
      const forbidden = await submitForm(page, '/bulk-upload');

      expect(forbidden.status()).toBe(403);
      await page.unroute('**/bulk-upload*', omitCsrfQueryToken);
      await page.goto('/bulk-upload?lng=en');
      await page
        .getByLabel('Please upload a file')
        .setInputFiles(createUploadFile('fresh-csrf.csv', 'text/csv', csvHeaders));
      const recovered = await submitForm(page, '/bulk-upload');
      expect(recovered.status()).toBe(303);
      await expect(page).toHaveURL(/\/bulk-upload\/response$/);
      await expect(page.getByRole('heading', { name: 'Bulk request response' })).toBeVisible();
      const download = await downloadFromLink(page, 'Download response CSV');
      expect(await readDownloadedText(download)).toBe(headerOnlyResponseCsv);
    }
  );
});
