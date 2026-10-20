import { expect, test } from '@playwright/test';

import { readDownloadedText } from '../downloads';
import { openBulkUpload, openSingularSelection, selectSingularRequestType } from '../journeys';

const hearingId = '12345678901234567890';
const caseReference = '1234567890123456';

test.describe('HMC Admin UI local form journeys', () => {
  test(
    'shows three visible field errors when final state transition is submitted blank',
    { tag: '@feature:final-state-transition' },
    async ({ page }) => {
      await openSingularSelection(page);
      await selectSingularRequestType(page, 'Final state transition');
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page.locator('.govuk-error-message')).toHaveCount(3);
      await expect(page.locator('#hearing-id-error')).toHaveText(/Enter a hearing ID/);
      await expect(page.locator('#case-ref-error')).toHaveText(/Enter a CCD Case Reference Number/);
      await expect(page.locator('#status-error')).toHaveText(/Select a status/);
    }
  );

  test(
    'submits a valid local rollback and shows its fallback response',
    { tag: '@feature:rollback' },
    async ({ page }) => {
      await openSingularSelection(page);
      await selectSingularRequestType(page, 'Rollback');
      await page.getByLabel('Hearing ID').fill(hearingId);
      await page.getByLabel('CCD Case Reference Number').fill(caseReference);
      await page.getByLabel('Incident Number / Notes').fill('Local migration coverage');
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page).toHaveURL(/\/singular\/response$/);
      await expect(page.getByRole('heading', { name: 'Rollback request unsuccessful' })).toBeVisible();
      await expect(page.getByRole('definition').filter({ hasText: hearingId })).toBeVisible();
      await expect(page.getByRole('definition').filter({ hasText: 'No response message returned' })).toBeVisible();
    }
  );

  test('shows the bulk no-file error', { tag: '@feature:bulk-upload' }, async ({ page }) => {
    await openBulkUpload(page);
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
    await expect(page.locator('#bulk-upload-file-error')).toHaveText(/A file must be uploaded/);
  });

  test(
    'shows validation errors and inspects the rejected CSV download',
    { tag: '@feature:bulk-upload' },
    async ({ page }) => {
      await openBulkUpload(page);
      await page.getByLabel('Please upload a file').setInputFiles({
        name: 'invalid-bulk-upload.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from('hearingId,caseRef,action,notes,state\n12345678901234567890,not-a-case-ref,rollback,,'),
      });
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(
        page.getByText('There were validation errors. Please check and edit the csv file and try again', {
          exact: true,
        })
      ).toBeVisible();
      const rejectedDownload = page.waitForEvent('download');
      await page.getByRole('link', { name: 'Download rejected CSV with issues again' }).click();
      const download = await rejectedDownload;

      await expect(download.suggestedFilename()).toBe('bulk-upload-response.csv');
      await expect(await readDownloadedText(download)).toContain(
        '12345678901234567890,not-a-case-ref,rollback,,INVALID,Validation failed,Case Reference Number must be a 16-digit numeric value.'
      );
    }
  );

  test(
    'shows the bulk response screen and inspects its response CSV download',
    { tag: '@feature:bulk-upload' },
    async ({ page }) => {
      await openBulkUpload(page);
      await page.getByLabel('Please upload a file').setInputFiles({
        name: 'valid-bulk-upload.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(`hearingId,caseRef,action,notes,state\n${hearingId},${caseReference},rollback,,`),
      });
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page).toHaveURL(/\/bulk-upload\/response$/);
      await expect(page.getByRole('heading', { name: 'Bulk request response' })).toBeVisible();
      const responseDownload = page.waitForEvent('download');
      await page.getByRole('link', { name: 'Download response CSV' }).click();
      const download = await responseDownload;

      await expect(download.suggestedFilename()).toBe('bulk-upload-response.csv');
      await expect(await readDownloadedText(download)).toContain(
        `${hearingId},${caseReference},rollback,,UNKNOWN,No response message returned`
      );
    }
  );
});
