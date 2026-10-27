import { openHomePage } from '../home';
import { signInThroughOidc } from '../oidc';
import { expect, test } from '../protected-test';
import { submitForm } from '../submission-actions';
import { correctionForm } from '../submission-data';

test.describe('HMC Admin UI protected error-summary correction', () => {
  test.beforeEach(async ({ page }) => {
    await openHomePage(page);
    await signInThroughOidc(page);
  });

  test(
    'focuses final-state hearing errors and retains a partial correction on revalidation',
    { tag: ['@feature:final-state-transition', '@ticket:EXUI-5457'] },
    async ({ page }) => {
      await page.goto('/singular/final-state-transition?lng=en');
      await page.getByLabel('Incident Number / Notes').fill(correctionForm.notes);
      const invalid = await submitForm(page, '/singular/final-state-transition');
      expect(invalid.status()).toBe(400);
      const summary = page.locator('[data-module="govuk-error-summary"]');
      await expect(summary).toBeFocused();
      await expect(summary.getByRole('link')).toHaveText([
        'Enter a hearing ID',
        'Enter a CCD Case Reference Number',
        'Select a status',
      ]);
      await summary.getByRole('link', { name: 'Enter a hearing ID', exact: true }).click();
      await expect(page.getByLabel('Hearing ID')).toBeFocused();
      await page.getByLabel('Hearing ID').fill(correctionForm.hearingId);
      const corrected = await submitForm(page, '/singular/final-state-transition');

      expect(corrected.status()).toBe(400);
      await expect(summary).toBeFocused();
      await expect(summary.getByRole('link')).toHaveText(['Enter a CCD Case Reference Number', 'Select a status']);
      await expect(page.locator('#hearing-id-error')).toHaveCount(0);
      await expect(page.locator('#case-ref-error')).toHaveText('Error: Enter a CCD Case Reference Number');
      await expect(page.locator('#status-error')).toHaveText('Error: Select a status');
      await expect(page.getByLabel('Hearing ID')).toHaveValue(correctionForm.hearingId);
      await expect(page.getByLabel('Incident Number / Notes')).toHaveValue(correctionForm.notes);
    }
  );

  test(
    'focuses rollback case errors and retains a partial correction without adding status',
    { tag: ['@feature:rollback', '@ticket:EXUI-5457'] },
    async ({ page }) => {
      await page.goto('/singular/rollback?lng=en');
      await page.getByLabel('Incident Number / Notes').fill(correctionForm.notes);
      const invalid = await submitForm(page, '/singular/rollback');
      expect(invalid.status()).toBe(400);
      const summary = page.locator('[data-module="govuk-error-summary"]');
      await expect(summary).toBeFocused();
      await expect(summary.getByRole('link')).toHaveText(['Enter a hearing ID', 'Enter a CCD Case Reference Number']);
      await summary.getByRole('link', { name: 'Enter a CCD Case Reference Number', exact: true }).click();
      await expect(page.getByLabel('CCD Case Reference Number')).toBeFocused();
      await page.getByLabel('CCD Case Reference Number').fill(correctionForm.caseReference);
      const corrected = await submitForm(page, '/singular/rollback');

      expect(corrected.status()).toBe(400);
      await expect(summary).toBeFocused();
      await expect(summary.getByRole('link')).toHaveText(['Enter a hearing ID']);
      await expect(page.locator('#case-ref-error')).toHaveCount(0);
      await expect(page.locator('#hearing-id-error')).toHaveText('Error: Enter a hearing ID');
      await expect(page.getByLabel('CCD Case Reference Number')).toHaveValue(correctionForm.caseReference);
      await expect(page.getByLabel('Incident Number / Notes')).toHaveValue(correctionForm.notes);
      await expect(page.getByLabel('Status')).toHaveCount(0);
      await expect(page.locator('#status-error')).toHaveCount(0);
    }
  );
});
