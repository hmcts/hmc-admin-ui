import { expect, test } from '@playwright/test';

import { openSingularSelection, selectSingularRequestType } from '../journeys';

const hearingId = '12345678901234567890';
const caseReference = '1234567890123456';

test.describe('HMC Admin UI local form journeys', () => {
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
});
