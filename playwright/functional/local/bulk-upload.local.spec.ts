import { expect, test } from '@playwright/test';

import { readDownloadedText } from '../downloads';
import { openBulkUpload } from '../journeys';

const hearingId = '12345678901234567890';
const caseReference = '1234567890123456';
const validCsvHeaders = 'hearingId,caseRef,action,notes,state';

function uploadFile(name: string, mimeType: string, contents: string) {
  return { name, mimeType, buffer: Buffer.from(contents) };
}

test.describe('HMC Admin UI local bulk upload journeys', () => {
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
      .setInputFiles(uploadFile('bulk-upload.txt', 'text/plain', 'not a csv'));
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
      .setInputFiles(uploadFile('bulk-upload.csv', 'text/csv', 'This is not a CSV file'));
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.locator('#bulk-upload-file-error')).toHaveText(/The selected file must be a valid CSV file/);
  });

  test('rejects CSV content containing a NUL byte', async ({ page }) => {
    await openBulkUpload(page);
    await page
      .getByLabel('Please upload a file')
      .setInputFiles(uploadFile('bulk-upload.csv', 'text/csv', `${validCsvHeaders}\n\u0000`));
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.locator('#bulk-upload-file-error')).toHaveText(/The selected file must be a valid CSV file/);
  });

  test('rejects CSV files with an invalid header layout', async ({ page }) => {
    await openBulkUpload(page);
    await page
      .getByLabel('Please upload a file')
      .setInputFiles(
        uploadFile(
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

  test('processes a valid final state transition CSV and downloads its response', async ({ page }) => {
    await openBulkUpload(page);
    await page
      .getByLabel('Please upload a file')
      .setInputFiles(
        uploadFile(
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
    await page.getByLabel('Please upload a file').setInputFiles(uploadFile('mixed.csv', 'text/csv', csv));
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

  test('renders the service problem page and offers retry and home links', async ({ page }) => {
    const response = await page.goto('/bulk-upload/problem');

    await expect(response?.status()).toBe(502);
    await expect(page.getByRole('heading', { name: 'Sorry, there is a problem with the service' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Try bulk upload again' })).toHaveAttribute('href', '/bulk-upload');
    await expect(page.getByRole('link', { name: 'Return to Support tools' })).toHaveAttribute('href', '/');
  });
});
