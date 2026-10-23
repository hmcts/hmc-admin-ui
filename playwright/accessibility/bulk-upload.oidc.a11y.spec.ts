import { auditPageAccessibility } from '../functional/accessibility';
import { openHomePage } from '../functional/home';
import { signInThroughOidc } from '../functional/oidc';
import { expect, test } from '../functional/protected-test';
import { createUploadFile } from '../functional/upload';

const validCsvHeaders = 'hearingId,caseRef,action,notes,state';

test.describe('HMC Admin UI protected bulk upload accessibility edge states', () => {
  test.beforeEach(async ({ page }) => {
    await openHomePage(page);
    await signInThroughOidc(page);
  });

  test(
    'audits the protected bulk upload size-limit error state',
    { tag: '@feature:bulk-upload' },
    async ({ page }, testInfo) => {
      await page.goto('/bulk-upload?lng=en');
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

      const results = await auditPageAccessibility(page, testInfo, 'oidc-bulk-upload-size-limit');
      expect(results.violations).toEqual([]);
    }
  );

  test(
    'audits the protected bulk upload malformed content state',
    { tag: '@feature:bulk-upload' },
    async ({ page }, testInfo) => {
      await page.goto('/bulk-upload?lng=en');
      await page
        .getByLabel('Please upload a file')
        .setInputFiles(createUploadFile('malformed.csv', 'text/csv', `${validCsvHeaders}\n\u0000`));
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page.locator('#bulk-upload-file-error')).toHaveText(/valid CSV file/);

      const results = await auditPageAccessibility(page, testInfo, 'oidc-bulk-upload-malformed-content');
      expect(results.violations).toEqual([]);
    }
  );
});
