import { expect, test } from '@playwright/test';

import { readDownloadedText } from '../downloads';
import { openBulkUpload } from '../journeys';
import { createUploadFile } from '../upload';

const hearingId = '12345678901234567890';
const caseReference = '1234567890123456';
const validCsvHeaders = 'hearingId,caseRef,action,notes,state';

test.describe('HMC Admin UI local bulk upload journeys', { tag: '@feature:bulk-upload' }, () => {
  test('renders the CSV upload form contract', async ({ page }) => {
    await openBulkUpload(page);

    const form = page.locator('form[data-bulk-upload-form]');
    await expect(form).toHaveAttribute('action', /\/bulk-upload(?:\?_csrf=\S+)?$/);
    await expect(form).toHaveAttribute('method', 'post');
    await expect(form).toHaveAttribute('enctype', 'multipart/form-data');
    const fileInput = page.getByLabel('Please upload a file');
    await expect(fileInput).toHaveAttribute('name', 'bulkUploadFile');
    await expect(fileInput).toHaveAttribute('accept', '.csv,text/csv');
    await expect(fileInput).toHaveAttribute('aria-describedby', /bulk-upload-file-hint/);
    await expect(page.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/');
  });

  test('cancels from the bulk upload form and returns to Support tools', async ({ page }) => {
    await openBulkUpload(page);

    await page.getByRole('link', { name: 'Cancel' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'What type of request would you like to make?' })).toBeVisible();
  });

  test('rejects a file that is not a CSV', async ({ page }) => {
    await openBulkUpload(page);
    await page
      .getByLabel('Please upload a file')
      .setInputFiles(createUploadFile('bulk-upload.txt', 'text/plain', 'not a csv'));
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
    await expect(page.locator('#bulk-upload-file-error')).toHaveText(
      /The selected file must be a CSV file with \.csv extension/
    );
  });

  test('rejects CSV content without the required header row', async ({ page }) => {
    await openBulkUpload(page);
    await page
      .getByLabel('Please upload a file')
      .setInputFiles(createUploadFile('bulk-upload.csv', 'text/csv', 'This is not a CSV file'));
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.locator('#bulk-upload-file-error')).toHaveText(/The selected file must be a valid CSV file/);
  });

  test('rejects CSV content containing a NUL byte', async ({ page }) => {
    await openBulkUpload(page);
    await page
      .getByLabel('Please upload a file')
      .setInputFiles(createUploadFile('bulk-upload.csv', 'text/csv', `${validCsvHeaders}\n\u0000`));
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.locator('#bulk-upload-file-error')).toHaveText(/The selected file must be a valid CSV file/);
  });

  test('rejects CSV files with an invalid header layout', async ({ page }) => {
    await openBulkUpload(page);
    await page
      .getByLabel('Please upload a file')
      .setInputFiles(
        createUploadFile(
          'bulk-upload.csv',
          'text/csv',
          `${validCsvHeaders},unexpected\n${hearingId},${caseReference},rollback,,`
        )
      );
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.locator('#bulk-upload-file-error')).toHaveText(
      /There is a problem with the file\. Check the file has the correct header layout/
    );
  });

  test('reports when a CSV contains only its header row', async ({ page }) => {
    await openBulkUpload(page);
    await page
      .getByLabel('Please upload a file')
      .setInputFiles(createUploadFile('headers-only.csv', 'text/csv', validCsvHeaders));
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page).toHaveURL(/\/bulk-upload\/response$/);
    const responseDownload = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download response CSV' }).click();
    await expect(await readDownloadedText(await responseDownload)).toContain(
      'unavailable,unavailable,unavailable,unavailable,error,"No valid CSV hearing rows were found"'
    );
  });

  test('finds CSV headers after a short preamble', async ({ page }) => {
    await openBulkUpload(page);
    const csv = [
      'HMC migration upload',
      'Generated for test evidence',
      validCsvHeaders,
      `${hearingId},${caseReference},rollback,Migration preamble,`,
    ].join('\n');
    await page.getByLabel('Please upload a file').setInputFiles(createUploadFile('preamble.csv', 'text/csv', csv));
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page).toHaveURL(/\/bulk-upload\/response$/);
    const responseDownload = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download response CSV' }).click();
    await expect(await readDownloadedText(await responseDownload)).toContain(
      `${hearingId},${caseReference},rollback,,UNKNOWN,No response message returned`
    );
  });

  test('accepts quoted notes containing commas and quotes', async ({ page }) => {
    await openBulkUpload(page);
    const csv = `${validCsvHeaders}\n${hearingId},${caseReference},final_state_transition,"Migration, ""quoted"" note",COMPLETED`;
    await page.getByLabel('Please upload a file').setInputFiles(createUploadFile('quoted-notes.csv', 'text/csv', csv));
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page).toHaveURL(/\/bulk-upload\/response$/);
    const responseDownload = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download response CSV' }).click();
    await expect(await readDownloadedText(await responseDownload)).toContain(
      `${hearingId},${caseReference},final_state_transition,COMPLETED,UNKNOWN,No response message returned`
    );
  });

  test('processes every supported final state and rollback action in one upload', async ({ page }) => {
    await openBulkUpload(page);
    const rows = [
      `${hearingId},${caseReference},final_state_transition,,CANCELLED`,
      `${hearingId},${caseReference},final_state_transition,,ADJOURNED`,
      `${hearingId},${caseReference},final_state_transition,,COMPLETED`,
      `${hearingId},${caseReference},rollback,,`,
    ].join('\n');
    await page
      .getByLabel('Please upload a file')
      .setInputFiles(createUploadFile('all-supported-actions.csv', 'text/csv', `${validCsvHeaders}\n${rows}`));
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page).toHaveURL(/\/bulk-upload\/response$/);
    const responseDownload = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download response CSV' }).click();
    const response = await readDownloadedText(await responseDownload);
    for (const state of ['CANCELLED', 'ADJOURNED', 'COMPLETED']) {
      await expect(response).toContain(
        `${hearingId},${caseReference},final_state_transition,${state},UNKNOWN,No response message returned`
      );
    }
    await expect(response).toContain(`${hearingId},${caseReference},rollback,,UNKNOWN,No response message returned`);
  });

  test('rejects an upload larger than the configured 10MB limit', async ({ page }) => {
    await openBulkUpload(page);
    await page.getByLabel('Please upload a file').setInputFiles({
      name: 'oversized.csv',
      mimeType: 'text/csv',
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 'x'),
    });
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page).toHaveURL(/\/bulk-upload(?:\?.*)?$/);
    await expect(page.locator('#bulk-upload-file-error')).toHaveText(/must be smaller than 10MB/);
    await expect(page.getByRole('link', { name: 'Download response CSV' })).toHaveCount(0);
  });

  test('processes a valid final state transition CSV and downloads its response', async ({ page }) => {
    await openBulkUpload(page);
    await page
      .getByLabel('Please upload a file')
      .setInputFiles(
        createUploadFile(
          'final-state-transition.csv',
          'text/csv',
          `${validCsvHeaders}\n${hearingId},${caseReference},final_state_transition,Migration coverage,CANCELLED`
        )
      );
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page).toHaveURL(/\/bulk-upload\/response$/);
    await expect(page.getByRole('heading', { name: 'Bulk request response' })).toBeVisible();

    const responseDownload = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download response CSV' }).click();
    const download = await responseDownload;

    await expect(download.suggestedFilename()).toBe('bulk-upload-response.csv');
    await expect(await readDownloadedText(download)).toContain(
      `${hearingId},${caseReference},final_state_transition,CANCELLED,UNKNOWN,No response message returned`
    );
  });

  test('publishes valid and invalid row outcomes in a rejected mixed CSV', async ({ page }) => {
    await openBulkUpload(page);
    const invalidHearingId = 'not-numeric';
    const invalidCaseReference = 'not-a-case-reference';
    const longNotes = 'a'.repeat(5001);
    const csv = [
      validCsvHeaders,
      `${hearingId},${caseReference},rollback,,`,
      `${invalidHearingId},${invalidCaseReference},not-an-action,${longNotes},INVALID`,
      `${hearingId},${caseReference},final_state_transition,,`,
    ].join('\n');
    await page.getByLabel('Please upload a file').setInputFiles(createUploadFile('mixed.csv', 'text/csv', csv));
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByRole('link', { name: /There were validation errors/ })).toBeVisible();
    const rejectedDownload = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download rejected CSV with issues again' }).click();
    const download = await rejectedDownload;
    const response = await readDownloadedText(download);

    await expect(response).toContain('Validation Issue');
    await expect(response).toContain(`${hearingId},${caseReference},rollback,,VALID,,`);
    await expect(response).toContain('Hearing ID must be a numeric value.');
    await expect(response).toContain('Case Reference Number must be a 16-digit numeric value.');
    await expect(response).toContain("Action must be either 'final_state_transition' or 'rollback'.");
    await expect(response).toContain('State must be one of CANCELLED, COMPLETED, or ADJOURNED.');
    await expect(response).toContain('State is mandatory for final_state_transition requests.');
    await expect(response).toContain('Notes/Incident Number exceeds 5000 character limit.');
  });

  test('renders the response page when opened directly and provides the default CSV response', async ({ page }) => {
    await page.goto('/bulk-upload/response');

    await expect(page.getByRole('heading', { name: 'Bulk request response' })).toBeVisible();
    const responseDownload = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Download response CSV' }).click();
    const download = await responseDownload;

    await expect(download.suggestedFilename()).toBe('bulk-upload-response.csv');
    await expect(await readDownloadedText(download)).toContain(
      'unavailable,unavailable,unavailable,unavailable,error,"No bulk upload response is available"'
    );
  });

  test('returns to Support tools from the bulk response page', async ({ page }) => {
    await page.goto('/bulk-upload/response');
    await page.getByRole('link', { name: 'Return to Support tools' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'What type of request would you like to make?' })).toBeVisible();
  });

  test('renders the service problem page and offers retry and home links', async ({ page }) => {
    const response = await page.goto('/bulk-upload/problem');

    await expect(response?.status()).toBe(502);
    await expect(page.getByRole('heading', { name: 'Sorry, there is a problem with the service' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Try bulk upload again' })).toHaveAttribute('href', '/bulk-upload');
    await expect(page.getByRole('link', { name: 'Return to Support tools' })).toHaveAttribute('href', '/');
  });
});
