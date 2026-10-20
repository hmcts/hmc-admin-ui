import { expect, test } from '@playwright/test';

import { readDownloadedText } from '../downloads';
import { openHomePage } from '../home';
import { signInThroughOidc } from '../oidc';
import { createUploadFile } from '../upload';

const hearingId = '12345678901234567890';
const caseReference = '1234567890123456';
const validCsvHeaders = 'hearingId,caseRef,action,notes,state';

test.describe('HMC Admin UI protected bulk upload journeys', () => {
  test.beforeEach(async ({ page }) => {
    await openHomePage(page);
    await signInThroughOidc(page);
    await page.goto('/bulk-upload?lng=en');
  });

  test('exposes the multipart CSV upload contract', { tag: '@feature:bulk-upload' }, async ({ page }) => {
    const form = page.locator('form[data-bulk-upload-form]');
    await expect(form).toHaveAttribute('method', 'post');
    await expect(form).toHaveAttribute('enctype', 'multipart/form-data');
    await expect(page.getByLabel('Please upload a file')).toHaveAttribute('accept', '.csv,text/csv');
    await expect(page.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/');
  });

  test('requires a CSV file before submitting a bulk request', { tag: '@feature:bulk-upload' }, async ({ page }) => {
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
    await expect(page.locator('#bulk-upload-file-error')).toHaveText(/A file must be uploaded/);
  });

  test('rejects a non-CSV upload', { tag: '@feature:bulk-upload' }, async ({ page }) => {
    await page
      .getByLabel('Please upload a file')
      .setInputFiles(createUploadFile('requests.txt', 'text/plain', 'not csv'));
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.locator('#bulk-upload-file-error')).toHaveText(/CSV file with \.csv extension/);
  });

  test('rejects CSV content without a header row', { tag: '@feature:bulk-upload' }, async ({ page }) => {
    await page
      .getByLabel('Please upload a file')
      .setInputFiles(createUploadFile('requests.csv', 'text/csv', 'not a csv'));
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.locator('#bulk-upload-file-error')).toHaveText(/must be a valid CSV file/);
  });

  test('rejects a CSV containing a NUL byte', { tag: '@feature:bulk-upload' }, async ({ page }) => {
    await page
      .getByLabel('Please upload a file')
      .setInputFiles(createUploadFile('requests.csv', 'text/csv', `${validCsvHeaders}\n\u0000`));
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.locator('#bulk-upload-file-error')).toHaveText(/must be a valid CSV file/);
  });

  test('rejects a CSV with an invalid header layout', { tag: '@feature:bulk-upload' }, async ({ page }) => {
    await page
      .getByLabel('Please upload a file')
      .setInputFiles(
        createUploadFile(
          'requests.csv',
          'text/csv',
          `${validCsvHeaders},unexpected\n${hearingId},${caseReference},rollback,,`
        )
      );
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.locator('#bulk-upload-file-error')).toHaveText(/correct header layout/);
  });

  test(
    'renders row validation errors before a request can be submitted',
    { tag: '@feature:bulk-upload' },
    async ({ page }) => {
      const csv = [
        validCsvHeaders,
        `${hearingId},not-a-case-reference,rollback,,`,
        'not-numeric,not-a-case-reference,not-an-action,notes,INVALID',
      ].join('\n');
      await page
        .getByLabel('Please upload a file')
        .setInputFiles(createUploadFile('invalid-rows.csv', 'text/csv', csv));
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page.getByRole('link', { name: /There were validation errors/ })).toBeVisible();
      const rejectedDownload = page.waitForEvent('download');
      await page.getByRole('link', { name: 'Download rejected CSV with issues again' }).click();
      await expect(await readDownloadedText(await rejectedDownload)).toContain(
        'Case Reference Number must be a 16-digit numeric value.'
      );
    }
  );

  test('rejects an upload larger than 10MB', { tag: '@feature:bulk-upload' }, async ({ page }) => {
    await page.getByLabel('Please upload a file').setInputFiles({
      name: 'oversized.csv',
      mimeType: 'text/csv',
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 'x'),
    });
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page).toHaveURL(/\/bulk-upload(?:\?.*)?$/);
    await expect(page.locator('#bulk-upload-file-error')).toHaveText(/must be smaller than 10MB/);
  });

  test(
    'renders the response page for a header-only upload without submitting a request',
    { tag: '@feature:bulk-upload-response' },
    async ({ page }) => {
      await page
        .getByLabel('Please upload a file')
        .setInputFiles(createUploadFile('headers-only.csv', 'text/csv', validCsvHeaders));
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page).toHaveURL(/\/bulk-upload\/response$/);
      await expect(page.getByRole('heading', { name: 'Bulk request response' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Download response CSV' })).toBeVisible();
    }
  );

  test('finds the CSV header after a short preamble', { tag: '@feature:bulk-upload' }, async ({ page }) => {
    const csv = ['HMC migration upload', 'Generated for test evidence', validCsvHeaders].join('\n');
    await page.getByLabel('Please upload a file').setInputFiles(createUploadFile('preamble.csv', 'text/csv', csv));
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page).toHaveURL(/\/bulk-upload\/response$/);
    await expect(page.getByRole('heading', { name: 'Bulk request response' })).toBeVisible();
  });

  for (const mimeType of ['application/csv', 'application/vnd.ms-excel']) {
    test(`accepts the ${mimeType} CSV MIME alias`, { tag: '@feature:bulk-upload' }, async ({ page }) => {
      await page
        .getByLabel('Please upload a file')
        .setInputFiles(createUploadFile(`${mimeType}.csv`, mimeType, validCsvHeaders));
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page).toHaveURL(/\/bulk-upload\/response$/);
      await expect(page.getByRole('heading', { name: 'Bulk request response' })).toBeVisible();
    });
  }

  test('cancels from bulk upload and returns to Support tools', { tag: '@feature:bulk-upload' }, async ({ page }) => {
    await page.getByRole('link', { name: 'Cancel' }).click();

    await expect(page).toHaveURL(/\/?(?:\?lng=en)?$/);
    await expect(page.getByRole('heading', { name: 'What type of request would you like to make?' })).toBeVisible();
  });

  test(
    'exposes the bulk service-problem page contract and retry links',
    { tag: '@feature:service-recovery' },
    async ({ page }) => {
      const response = await page.goto('/bulk-upload/problem?lng=en');

      await expect(response?.status()).toBe(502);
      await expect(page.getByRole('heading', { name: 'Sorry, there is a problem with the service' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Try bulk upload again' })).toHaveAttribute('href', '/bulk-upload');
      await expect(page.getByRole('link', { name: 'Return to Support tools' })).toHaveAttribute('href', '/');
    }
  );

  test(
    'renders an empty bulk response page with its fallback download',
    { tag: '@feature:bulk-upload-response' },
    async ({ page }) => {
      await page.goto('/bulk-upload/response?lng=en');
      await expect(page.getByRole('heading', { name: 'Bulk request response' })).toBeVisible();

      const responseDownload = page.waitForEvent('download');
      await page.getByRole('link', { name: 'Download response CSV' }).click();
      const download = await responseDownload;
      await expect(download.suggestedFilename()).toBe('bulk-upload-response.csv');
      await expect(await readDownloadedText(download)).toContain(
        'unavailable,unavailable,unavailable,unavailable,error,"No bulk upload response is available"'
      );
    }
  );
});
