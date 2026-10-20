import { expect, test } from '@playwright/test';

import { auditPageAccessibility } from '../functional/accessibility';
import { openBulkUpload, openSingularSelection, selectSingularRequestType } from '../functional/journeys';

const hearingId = '12345678901234567890';
const caseReference = '1234567890123456';

async function expectNoAccessibilityViolations(
  page: Parameters<typeof auditPageAccessibility>[0],
  testInfo: Parameters<typeof auditPageAccessibility>[1],
  evidenceName: string
): Promise<void> {
  const results = await auditPageAccessibility(page, testInfo, evidenceName);
  expect(results.violations).toEqual([]);
}

test(
  'checks singular request selection against WCAG 2.2 AA',
  { tag: '@feature:request-selection' },
  async ({ page }, testInfo) => {
    await openSingularSelection(page);
    await expect(
      page.getByRole('heading', { name: 'What type of singular request would you like to make?' })
    ).toBeVisible();

    await expectNoAccessibilityViolations(page, testInfo, 'singular-selection');
  }
);

test('checks rollback validation against WCAG 2.2 AA', { tag: '@feature:rollback' }, async ({ page }, testInfo) => {
  await openSingularSelection(page);
  await selectSingularRequestType(page, 'Rollback');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('.govuk-error-message')).toHaveCount(2);

  await expectNoAccessibilityViolations(page, testInfo, 'rollback-validation');
});

test('checks the bulk upload form against WCAG 2.2 AA', { tag: '@feature:bulk-upload' }, async ({ page }, testInfo) => {
  await openBulkUpload(page);
  await expect(page.getByRole('heading', { name: 'Bulk request' })).toBeVisible();

  await expectNoAccessibilityViolations(page, testInfo, 'bulk-upload');
});

test(
  'checks the bulk validation state against WCAG 2.2 AA',
  { tag: '@feature:bulk-upload' },
  async ({ page }, testInfo) => {
    await openBulkUpload(page);
    await page.getByLabel('Please upload a file').setInputFiles({
      name: 'invalid.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('not,a,valid,header\n'),
    });
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();

    await expectNoAccessibilityViolations(page, testInfo, 'bulk-validation');
  }
);

test(
  'checks the bulk response page against WCAG 2.2 AA',
  { tag: '@feature:bulk-upload' },
  async ({ page }, testInfo) => {
    await openBulkUpload(page);
    await page.getByLabel('Please upload a file').setInputFiles({
      name: 'valid.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(`hearingId,caseRef,action,notes,state\n${hearingId},${caseReference},rollback,,`),
    });
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByRole('heading', { name: 'Bulk request response' })).toBeVisible();

    await expectNoAccessibilityViolations(page, testInfo, 'bulk-response');
  }
);

test(
  'checks the singular response failure page against WCAG 2.2 AA',
  { tag: '@feature:final-state-transition' },
  async ({ page }, testInfo) => {
    await openSingularSelection(page);
    await selectSingularRequestType(page, 'Final state transition');
    await page.getByLabel('Hearing ID').fill(hearingId);
    await page.getByLabel('CCD Case Reference Number').fill(caseReference);
    await page.getByLabel('Status').selectOption('CANCELLED');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByRole('heading', { name: 'Final state transition request unsuccessful' })).toBeVisible();

    await expectNoAccessibilityViolations(page, testInfo, 'singular-response-failure');
  }
);
