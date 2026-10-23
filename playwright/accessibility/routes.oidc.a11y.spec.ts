import { auditPageAccessibility } from '../functional/accessibility';
import { openHomePage } from '../functional/home';
import { signInThroughOidc } from '../functional/oidc';
import { expect, test } from '../functional/protected-test';
import { createUploadFile } from '../functional/upload';

const hearingId = '12345678901234567890';
const validCsvHeaders = 'hearingId,caseRef,action,notes,state';

test.describe('HMC Admin UI protected route accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await openHomePage(page);
    await signInThroughOidc(page);
  });

  test(
    'audits the protected singular request selection page',
    { tag: '@feature:request-selection' },
    async ({ page }, testInfo) => {
      await page.goto('/singular?lng=en');
      await expect(
        page.getByRole('heading', { name: 'What type of singular request would you like to make?' })
      ).toBeVisible();
      await expect(page.getByRole('radio', { name: 'Final state transition' })).toBeVisible();
      await expect(page.getByRole('radio', { name: 'Rollback' })).toBeVisible();

      const results = await auditPageAccessibility(page, testInfo, 'oidc-singular-selection');
      expect(results.violations).toEqual([]);
    }
  );

  test(
    'audits protected singular selection validation',
    { tag: '@feature:request-selection' },
    async ({ page }, testInfo) => {
      await page.goto('/singular?lng=en');
      await page.getByRole('button', { name: 'Continue' }).click();

      await expect(page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
      await expect(page.locator('#singular-request-type-error')).toHaveText(/Select a singular request type/);

      const results = await auditPageAccessibility(page, testInfo, 'oidc-singular-selection-validation');
      expect(results.violations).toEqual([]);
    }
  );

  test(
    'audits the protected final state transition form',
    { tag: '@feature:final-state-transition' },
    async ({ page }, testInfo) => {
      await page.goto('/singular/final-state-transition?lng=en');
      await expect(page.getByRole('heading', { name: 'Final state transition' })).toBeVisible();
      await expect(page.getByLabel('Status')).toBeVisible();

      const results = await auditPageAccessibility(page, testInfo, 'oidc-final-state-transition');
      expect(results.violations).toEqual([]);
    }
  );

  test(
    'audits protected final state validation',
    { tag: '@feature:final-state-transition' },
    async ({ page }, testInfo) => {
      await page.goto('/singular/final-state-transition?lng=en');
      await page.getByLabel('Hearing ID').fill('not-a-number');
      await page.getByLabel('CCD Case Reference Number').fill('not-a-case-reference');
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page.locator('#hearing-id-error')).toHaveText(/Hearing ID must be a number/);
      await expect(page.locator('#case-ref-error')).toHaveText(/must be a 16-digit number/);
      await expect(page.locator('#status-error')).toHaveText(/Select a status/);

      const results = await auditPageAccessibility(page, testInfo, 'oidc-final-state-validation');
      expect(results.violations).toEqual([]);
    }
  );

  test(
    'audits the protected rollback form and validation',
    { tag: '@feature:rollback' },
    async ({ page }, testInfo) => {
      await page.goto('/singular/rollback?lng=en');
      await expect(page.getByRole('heading', { name: 'Rollback' })).toBeVisible();
      await expect(page.getByLabel('Status')).toHaveCount(0);
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page.locator('#hearing-id-error')).toHaveText(/Enter a hearing ID/);
      await expect(page.locator('#case-ref-error')).toHaveText(/Enter a CCD Case Reference Number/);

      const results = await auditPageAccessibility(page, testInfo, 'oidc-rollback-validation');
      expect(results.violations).toEqual([]);
    }
  );

  test('audits the protected bulk upload form', { tag: '@feature:bulk-upload' }, async ({ page }, testInfo) => {
    await page.goto('/bulk-upload?lng=en');
    await expect(page.getByRole('heading', { name: 'Bulk request' })).toBeVisible();
    await expect(page.getByLabel('Please upload a file')).toBeVisible();

    const results = await auditPageAccessibility(page, testInfo, 'oidc-bulk-upload');
    expect(results.violations).toEqual([]);
  });

  test(
    'audits protected bulk upload no-file validation',
    { tag: '@feature:bulk-upload' },
    async ({ page }, testInfo) => {
      await page.goto('/bulk-upload?lng=en');
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
      await expect(page.locator('#bulk-upload-file-error')).toHaveText(/A file must be uploaded/);

      const results = await auditPageAccessibility(page, testInfo, 'oidc-bulk-upload-no-file');
      expect(results.violations).toEqual([]);
    }
  );

  test(
    'audits protected bulk upload file-type validation',
    { tag: '@feature:bulk-upload' },
    async ({ page }, testInfo) => {
      await page.goto('/bulk-upload?lng=en');
      await page
        .getByLabel('Please upload a file')
        .setInputFiles(createUploadFile('requests.txt', 'text/plain', 'not csv'));
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page.locator('#bulk-upload-file-error')).toHaveText(/CSV file with \.csv extension/);

      const results = await auditPageAccessibility(page, testInfo, 'oidc-bulk-upload-file-type');
      expect(results.violations).toEqual([]);
    }
  );

  test('audits protected bulk upload row validation', { tag: '@feature:bulk-upload' }, async ({ page }, testInfo) => {
    await page.goto('/bulk-upload?lng=en');
    const csv = [
      validCsvHeaders,
      `${hearingId},not-a-case-reference,rollback,,`,
      'not-numeric,not-a-case-reference,not-an-action,notes,INVALID',
    ].join('\n');
    await page.getByLabel('Please upload a file').setInputFiles(createUploadFile('invalid-rows.csv', 'text/csv', csv));
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByRole('link', { name: /There were validation errors/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Download rejected CSV with issues again' })).toBeVisible();

    const results = await auditPageAccessibility(page, testInfo, 'oidc-bulk-upload-row-validation');
    expect(results.violations).toEqual([]);
  });

  test(
    'audits the protected singular service-problem page contract',
    { tag: '@feature:service-recovery' },
    async ({ page }, testInfo) => {
      const response = await page.goto('/singular/problem?lng=en');

      await expect(response?.status()).toBe(502);
      await expect(page.getByRole('heading', { name: 'Sorry, there is a problem with the service' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Try singular request again' })).toBeVisible();

      const results = await auditPageAccessibility(page, testInfo, 'oidc-singular-service-problem');
      expect(results.violations).toEqual([]);
    }
  );

  test(
    'audits the protected bulk service-problem page contract',
    { tag: '@feature:service-recovery' },
    async ({ page }, testInfo) => {
      const response = await page.goto('/bulk-upload/problem?lng=en');

      await expect(response?.status()).toBe(502);
      await expect(page.getByRole('heading', { name: 'Sorry, there is a problem with the service' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Try bulk upload again' })).toBeVisible();

      const results = await auditPageAccessibility(page, testInfo, 'oidc-bulk-service-problem');
      expect(results.violations).toEqual([]);
    }
  );

  test(
    'audits the protected bulk response page',
    { tag: '@feature:bulk-upload-response' },
    async ({ page }, testInfo) => {
      await page.goto('/bulk-upload/response?lng=en');
      await expect(page.getByRole('heading', { name: 'Bulk request response' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Download response CSV' })).toBeVisible();

      const results = await auditPageAccessibility(page, testInfo, 'oidc-bulk-response');
      expect(results.violations).toEqual([]);
    }
  );

  test('audits the protected not-found page', { tag: '@feature:not-found' }, async ({ page }, testInfo) => {
    const response = await page.goto('/route-that-does-not-exist?lng=en');

    await expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();

    const results = await auditPageAccessibility(page, testInfo, 'oidc-not-found');
    expect(results.violations).toEqual([]);
  });
});
