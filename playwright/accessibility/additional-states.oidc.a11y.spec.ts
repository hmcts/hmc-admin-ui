import { expect, test } from '@playwright/test';

import { auditPageAccessibility } from '../functional/accessibility';
import { openHomePage } from '../functional/home';
import { signInThroughOidc } from '../functional/oidc';
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

test.describe('HMC Admin UI additional protected accessibility states', () => {
  test.beforeEach(async ({ page }) => {
    await openHomePage(page);
    await signInThroughOidc(page);
  });

  test(
    'audits the protected singular selection with final state transition chosen',
    { tag: '@feature:final-state-transition' },
    async ({ page }, testInfo) => {
      await page.getByRole('radio', { name: 'Singular' }).check();
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.getByRole('radio', { name: 'Final state transition' }).check();

      await expect(page.getByRole('radio', { name: 'Final state transition' })).toBeChecked();
      await expectNoAccessibilityViolations(page, testInfo, 'oidc-singular-selection-final-state-chosen');
    }
  );

  test(
    'audits the protected singular selection with rollback chosen',
    { tag: '@feature:rollback' },
    async ({ page }, testInfo) => {
      await page.getByRole('radio', { name: 'Singular' }).check();
      await page.getByRole('button', { name: 'Continue' }).click();
      await page.getByRole('radio', { name: 'Rollback' }).check();

      await expect(page.getByRole('radio', { name: 'Rollback' })).toBeChecked();
      await expectNoAccessibilityViolations(page, testInfo, 'oidc-singular-selection-rollback-chosen');
    }
  );

  test(
    'audits the protected final state form with valid values entered',
    { tag: '@feature:final-state-transition' },
    async ({ page }, testInfo) => {
      await page.goto('/singular/final-state-transition?lng=en');
      await page.getByLabel('Hearing ID').fill(hearingId);
      await page.getByLabel('CCD Case Reference Number').fill(caseReference);
      await page.getByLabel('Status').selectOption('CANCELLED');
      await page.getByLabel('Incident Number / Notes').fill('Accessibility populated form state');

      await expect(page.getByLabel('Status')).toHaveValue('CANCELLED');
      await expectNoAccessibilityViolations(page, testInfo, 'oidc-final-state-populated');
    }
  );

  test(
    'audits the protected rollback form with valid values entered',
    { tag: '@feature:rollback' },
    async ({ page }, testInfo) => {
      await page.goto('/singular/rollback?lng=en');
      await page.getByLabel('Hearing ID').fill(hearingId);
      await page.getByLabel('CCD Case Reference Number').fill(caseReference);
      await page.getByLabel('Incident Number / Notes').fill('Accessibility populated rollback state');

      await expect(page.getByLabel('Status')).toHaveCount(0);
      await expectNoAccessibilityViolations(page, testInfo, 'oidc-rollback-populated');
    }
  );

  test(
    'audits the protected bulk upload form after selecting a valid CSV',
    { tag: '@feature:bulk-upload' },
    async ({ page }, testInfo) => {
      await page.goto('/bulk-upload?lng=en');
      await page
        .getByLabel('Please upload a file')
        .setInputFiles(createUploadFile('accessibility-ready.csv', 'text/csv', `${validCsvHeaders}\n`));

      await expect(page.getByLabel('Please upload a file')).toHaveValue(/accessibility-ready\.csv$/);
      await expectNoAccessibilityViolations(page, testInfo, 'oidc-bulk-upload-file-selected');
    }
  );
});
