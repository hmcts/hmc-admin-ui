import { expect, test } from '@playwright/test';

import { auditPageAccessibility } from '../functional/accessibility';
import { openHomePage } from '../functional/home';
import { openBulkUpload, openSingularSelection, selectSingularRequestType } from '../functional/journeys';
import { createUploadFile } from '../functional/upload';

const hearingId = '12345678901234567890';
const caseReference = '1234567890123456';
const validCsvHeaders = 'hearingId,caseRef,action,notes,state';

async function expectNoAccessibilityViolations(
  page: Parameters<typeof auditPageAccessibility>[0],
  testInfo: Parameters<typeof auditPageAccessibility>[1],
  evidenceName: string
): Promise<void> {
  const results = await auditPageAccessibility(page, testInfo, evidenceName);
  expect(results.violations).toEqual([]);
}

test.describe('HMC Admin UI local route accessibility', () => {
  test(
    'audits the singular request selection page before a choice is made',
    { tag: '@feature:request-selection' },
    async ({ page }, testInfo) => {
      await openSingularSelection(page);
      await expect(page.getByRole('radio', { name: 'Final state transition' })).toBeVisible();
      await expect(page.getByRole('radio', { name: 'Rollback' })).toBeVisible();

      await expectNoAccessibilityViolations(page, testInfo, 'singular-selection-default');
    }
  );

  test(
    'audits the singular request selection validation state',
    { tag: '@feature:request-selection' },
    async ({ page }, testInfo) => {
      await openSingularSelection(page);
      await page.getByRole('button', { name: 'Continue' }).click();

      await expect(page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
      await expect(page.locator('#singular-request-type-error')).toHaveText(/Select a singular request type/);

      await expectNoAccessibilityViolations(page, testInfo, 'singular-selection-validation');
    }
  );

  test(
    'audits the blank final state transition form',
    { tag: '@feature:final-state-transition' },
    async ({ page }, testInfo) => {
      await openSingularSelection(page);
      await selectSingularRequestType(page, 'Final state transition');
      await expect(page.getByRole('heading', { name: 'Final state transition' })).toBeVisible();

      await expectNoAccessibilityViolations(page, testInfo, 'final-state-transition-default');
    }
  );

  test(
    'audits final state transition validation with invalid values preserved',
    { tag: '@feature:final-state-transition' },
    async ({ page }, testInfo) => {
      await openSingularSelection(page);
      await selectSingularRequestType(page, 'Final state transition');
      await page.getByLabel('Hearing ID').fill('not-a-number');
      await page.getByLabel('CCD Case Reference Number').fill('not-a-case-reference');
      await page.getByLabel('Incident Number / Notes').fill('Accessibility validation');
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page.locator('#hearing-id-error')).toHaveText(/Hearing ID must be a number/);
      await expect(page.locator('#case-ref-error')).toHaveText(/must be a 16-digit number/);
      await expect(page.locator('#status-error')).toHaveText(/Select a status/);

      await expectNoAccessibilityViolations(page, testInfo, 'final-state-transition-invalid');
    }
  );

  test(
    'audits the final state transition service problem page',
    { tag: '@feature:service-recovery' },
    async ({ page }, testInfo) => {
      const response = await page.goto('/singular/problem?lng=en');

      await expect(response?.status()).toBe(502);
      await expect(page.getByRole('heading', { name: 'Sorry, there is a problem with the service' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Try singular request again' })).toBeVisible();

      await expectNoAccessibilityViolations(page, testInfo, 'singular-service-problem');
    }
  );

  test('audits the rollback form before submission', { tag: '@feature:rollback' }, async ({ page }, testInfo) => {
    await openSingularSelection(page);
    await selectSingularRequestType(page, 'Rollback');
    await expect(page.getByRole('heading', { name: 'Rollback' })).toBeVisible();
    await expect(page.getByLabel('Status')).toHaveCount(0);

    await expectNoAccessibilityViolations(page, testInfo, 'rollback-default');
  });

  test('audits the rollback response failure state', { tag: '@feature:rollback' }, async ({ page }, testInfo) => {
    await openSingularSelection(page);
    await selectSingularRequestType(page, 'Rollback');
    await page.getByLabel('Hearing ID').fill(hearingId);
    await page.getByLabel('CCD Case Reference Number').fill(caseReference);
    await page.getByLabel('Incident Number / Notes').fill('Accessibility response');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByRole('heading', { name: 'Rollback request unsuccessful' })).toBeVisible();
    await expect(page.getByRole('definition').filter({ hasText: hearingId })).toBeVisible();

    await expectNoAccessibilityViolations(page, testInfo, 'rollback-response-failure');
  });

  test(
    'audits the bulk upload form with no file selected',
    { tag: '@feature:bulk-upload' },
    async ({ page }, testInfo) => {
      await openBulkUpload(page);
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
      await expect(page.locator('#bulk-upload-file-error')).toHaveText(/A file must be uploaded/);

      await expectNoAccessibilityViolations(page, testInfo, 'bulk-upload-no-file');
    }
  );

  test('audits the bulk upload size-limit error state', { tag: '@feature:bulk-upload' }, async ({ page }, testInfo) => {
    await openBulkUpload(page);
    await page.getByLabel('Please upload a file').setInputFiles({
      name: 'oversized.csv',
      mimeType: 'text/csv',
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 'x'),
    });
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.locator('#bulk-upload-file-error')).toHaveText(/must be smaller than 10MB/);
    await expect(page.getByLabel('Please upload a file')).toHaveAttribute(
      'aria-describedby',
      /bulk-upload-file-hint bulk-upload-file-error/
    );

    await expectNoAccessibilityViolations(page, testInfo, 'bulk-upload-size-limit');
  });

  test(
    'audits the bulk upload invalid file type state',
    { tag: '@feature:bulk-upload' },
    async ({ page }, testInfo) => {
      await openBulkUpload(page);
      await page
        .getByLabel('Please upload a file')
        .setInputFiles(createUploadFile('requests.txt', 'text/plain', 'not csv'));
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page.locator('#bulk-upload-file-error')).toHaveText(/CSV file with \.csv extension/);

      await expectNoAccessibilityViolations(page, testInfo, 'bulk-upload-invalid-type');
    }
  );

  test(
    'audits the bulk upload malformed content state',
    { tag: '@feature:bulk-upload' },
    async ({ page }, testInfo) => {
      await openBulkUpload(page);
      await page
        .getByLabel('Please upload a file')
        .setInputFiles(createUploadFile('requests.csv', 'text/csv', `${validCsvHeaders}\n\u0000`));
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page.locator('#bulk-upload-file-error')).toHaveText(/valid CSV file/);

      await expectNoAccessibilityViolations(page, testInfo, 'bulk-upload-malformed-content');
    }
  );

  test('audits the bulk upload row validation state', { tag: '@feature:bulk-upload' }, async ({ page }, testInfo) => {
    await openBulkUpload(page);
    const invalidRows = [
      validCsvHeaders,
      `${hearingId},not-a-case-reference,rollback,,`,
      'not-numeric,not-a-case-reference,not-an-action,notes,INVALID',
    ].join('\n');
    await page
      .getByLabel('Please upload a file')
      .setInputFiles(createUploadFile('invalid-rows.csv', 'text/csv', invalidRows));
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByRole('link', { name: /There were validation errors/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Download rejected CSV with issues again' })).toBeVisible();

    await expectNoAccessibilityViolations(page, testInfo, 'bulk-upload-row-validation');
  });

  test(
    'audits the bulk upload service problem page',
    { tag: '@feature:service-recovery' },
    async ({ page }, testInfo) => {
      const response = await page.goto('/bulk-upload/problem?lng=en');

      await expect(response?.status()).toBe(502);
      await expect(page.getByRole('heading', { name: 'Sorry, there is a problem with the service' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Try bulk upload again' })).toBeVisible();

      await expectNoAccessibilityViolations(page, testInfo, 'bulk-upload-service-problem');
    }
  );

  test(
    'audits the bulk response page without a prior upload',
    { tag: '@feature:bulk-upload' },
    async ({ page }, testInfo) => {
      await page.goto('/bulk-upload/response?lng=en');
      await expect(page.getByRole('heading', { name: 'Bulk request response' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Download response CSV' })).toBeVisible();

      await expectNoAccessibilityViolations(page, testInfo, 'bulk-response-default');
    }
  );

  test('audits the not found page', { tag: '@feature:not-found' }, async ({ page }, testInfo) => {
    const response = await page.goto('/route-that-does-not-exist?lng=en');

    await expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();

    await expectNoAccessibilityViolations(page, testInfo, 'not-found');
  });

  test(
    'audits the home page after returning from a completed local request',
    { tag: '@feature:request-selection' },
    async ({ page }, testInfo) => {
      await openHomePage(page);
      await expect(page.getByRole('heading', { name: 'What type of request would you like to make?' })).toBeVisible();
      await page.getByRole('radio', { name: 'Singular' }).check();
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.getByRole('radio', { name: 'Final state transition' }).check();
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.getByLabel('Hearing ID').fill(hearingId);
      await page.getByLabel('CCD Case Reference Number').fill(caseReference);
      await page.getByLabel('Status').selectOption('CANCELLED');
      await page.getByRole('button', { name: 'Submit' }).click();
      await expect(page.getByRole('heading', { name: 'Final state transition request unsuccessful' })).toBeVisible();
      await page.getByRole('link', { name: 'Return to Support tools' }).click();

      await expect(page).toHaveURL(/\/$/);
      await expectNoAccessibilityViolations(page, testInfo, 'home-after-request');
    }
  );
});
