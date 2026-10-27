import { readDownloadedText } from '../downloads';
import { openHomePage } from '../home';
import { signInThroughOidc } from '../oidc';
import { expect, test } from '../protected-test';
import { downloadFromLink, submitForm, submitRejectedUpload } from '../submission-actions';
import {
  csvHeaders,
  firstRejectedUpload,
  headerOnlyResponseCsv,
  secondRejectedUpload,
  unavailableResponseCsv,
} from '../submission-data';
import { createUploadFile } from '../upload';

test.describe('HMC Admin UI protected rejected CSV lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await openHomePage(page);
    await signInThroughOidc(page);
    await page.goto('/bulk-upload?lng=en');
  });

  test(
    'preserves both invalid row outcomes in exact automatic and manual CSV downloads',
    { tag: ['@feature:bulk-upload-response', '@ticket:EXUI-5457'] },
    async ({ page }) => {
      const automatic = await submitRejectedUpload(page, firstRejectedUpload);

      await expect(page).toHaveURL(/\/bulk-upload(?:\?.*)?$/);
      await expect(page.getByRole('link', { name: /There were validation errors/ })).toBeVisible();
      expect(automatic.suggestedFilename()).toBe('bulk-upload-response.csv');
      expect(await readDownloadedText(automatic)).toBe(firstRejectedUpload.expectedCsv);
      const manual = await downloadFromLink(page, 'Download rejected CSV with issues again');
      expect(await readDownloadedText(manual)).toBe(firstRejectedUpload.expectedCsv);
    }
  );

  test(
    'replaces the previous rejected CSV when a different invalid upload is submitted',
    { tag: ['@feature:bulk-upload-response', '@ticket:EXUI-5457'] },
    async ({ page }) => {
      const first = await submitRejectedUpload(page, firstRejectedUpload);
      expect(await readDownloadedText(first)).toBe(firstRejectedUpload.expectedCsv);

      const replacement = await submitRejectedUpload(page, secondRejectedUpload);
      const replacementCsv = await readDownloadedText(replacement);
      expect(replacementCsv).toBe(secondRejectedUpload.expectedCsv);
      expect(replacementCsv).not.toContain(firstRejectedUpload.hearingMarker);
      expect(replacementCsv).not.toContain('Case Reference Number must be a 16-digit numeric value.');
      const manual = await downloadFromLink(page, 'Download rejected CSV with issues again');
      expect(await readDownloadedText(manual)).toBe(secondRejectedUpload.expectedCsv);
    }
  );

  test(
    'replaces rejected CSV state after a header-only recovery submission',
    { tag: ['@feature:bulk-upload-response', '@ticket:EXUI-5457'] },
    async ({ page }) => {
      const rejected = await submitRejectedUpload(page, firstRejectedUpload);
      expect(await readDownloadedText(rejected)).toBe(firstRejectedUpload.expectedCsv);
      await page
        .getByLabel('Please upload a file')
        .setInputFiles(createUploadFile('header-only-recovery.csv', 'text/csv', csvHeaders));
      const submitted = await submitForm(page, '/bulk-upload');

      expect(submitted.status()).toBe(303);
      await expect(page).toHaveURL(/\/bulk-upload\/response$/);
      await expect(page.getByRole('heading', { name: 'Bulk request response' })).toBeVisible();
      const recovered = await downloadFromLink(page, 'Download response CSV');
      const recoveredCsv = await readDownloadedText(recovered);
      expect(recoveredCsv).toBe(headerOnlyResponseCsv);
      expect(recoveredCsv).not.toContain(firstRejectedUpload.hearingMarker);
      expect(recoveredCsv).not.toContain('Validation Issue');
    }
  );

  test(
    'isolates rejected downloads between independently authenticated browser sessions',
    { tag: ['@feature:bulk-upload-response', '@ticket:EXUI-5457'] },
    async ({ page, browser, baseURL, ignoreHTTPSErrors }) => {
      const rejected = await submitRejectedUpload(page, firstRejectedUpload);
      expect(await readDownloadedText(rejected)).toBe(firstRejectedUpload.expectedCsv);
      const isolatedContext = await browser.newContext({ baseURL, ignoreHTTPSErrors });
      try {
        const isolatedPage = await isolatedContext.newPage();
        await openHomePage(isolatedPage);
        await signInThroughOidc(isolatedPage);
        await isolatedPage.goto('/bulk-upload/response?lng=en');
        await expect(isolatedPage.getByRole('heading', { name: 'Bulk request response' })).toBeVisible();
        const isolated = await downloadFromLink(isolatedPage, 'Download response CSV');
        const isolatedCsv = await readDownloadedText(isolated);
        expect(isolatedCsv).toBe(unavailableResponseCsv);
        expect(isolatedCsv).not.toContain(firstRejectedUpload.hearingMarker);

        const retained = await downloadFromLink(page, 'Download rejected CSV with issues again');
        expect(await readDownloadedText(retained)).toBe(firstRejectedUpload.expectedCsv);
      } finally {
        await isolatedContext.close();
      }
    }
  );
});
