import { expect, test } from '@playwright/test';

import { openSingularSelection, selectSingularRequestType } from '../journeys';

const hearingId = '12345678901234567890';
const caseReference = '1234567890123456';

test.describe('HMC Admin UI local singular contracts', () => {
  test(
    'accepts the final state transition field boundaries',
    { tag: '@feature:final-state-transition' },
    async ({ page }) => {
      await openSingularSelection(page);
      await selectSingularRequestType(page, 'Final state transition');
      await page.getByLabel('Hearing ID').fill('1'.repeat(30));
      await page.getByLabel('CCD Case Reference Number').fill(caseReference);
      await page.getByLabel('Status').selectOption('COMPLETED');
      await page.getByLabel('Incident Number / Notes').fill('a'.repeat(5000));
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page).toHaveURL(/\/singular\/response$/);
      await expect(page.getByRole('heading', { name: 'Final state transition request unsuccessful' })).toBeVisible();
      await expect(page.getByRole('definition').filter({ hasText: '1'.repeat(30) })).toBeVisible();
    }
  );

  test(
    'accepts the rollback field boundaries without a status field',
    { tag: '@feature:rollback' },
    async ({ page }) => {
      await openSingularSelection(page);
      await selectSingularRequestType(page, 'Rollback');
      await page.getByLabel('Hearing ID').fill('2'.repeat(30));
      await page.getByLabel('CCD Case Reference Number').fill(caseReference);
      await page.getByLabel('Incident Number / Notes').fill('b'.repeat(5000));
      await expect(page.getByLabel('Status')).toHaveCount(0);
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page).toHaveURL(/\/singular\/response$/);
      await expect(page.getByRole('heading', { name: 'Rollback request unsuccessful' })).toBeVisible();
      await expect(page.getByRole('definition').filter({ hasText: '2'.repeat(30) })).toBeVisible();
    }
  );

  test(
    'submits a valid local final state transition and shows its fallback response',
    { tag: '@feature:final-state-transition' },
    async ({ page }) => {
      await openSingularSelection(page);
      await selectSingularRequestType(page, 'Final state transition');
      await page.getByLabel('Hearing ID').fill(hearingId);
      await page.getByLabel('CCD Case Reference Number').fill(caseReference);
      await page.getByLabel('Status').selectOption('CANCELLED');
      await page.getByLabel('Incident Number / Notes').fill('Local migration coverage');
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page).toHaveURL(/\/singular\/response$/);
      await expect(page.getByRole('heading', { name: 'Final state transition request unsuccessful' })).toBeVisible();
      await expect(page.getByRole('definition').filter({ hasText: hearingId })).toBeVisible();
      await expect(page.getByRole('definition').filter({ hasText: 'No response message returned' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Make another singular request' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Return to Support tools' })).toBeVisible();
    }
  );

  test(
    'submits each supported final state and shows the fallback response',
    { tag: '@feature:final-state-transition' },
    async ({ page }) => {
      for (const status of ['CANCELLED', 'ADJOURNED', 'COMPLETED']) {
        await openSingularSelection(page);
        await selectSingularRequestType(page, 'Final state transition');
        await page.getByLabel('Hearing ID').fill(hearingId);
        await page.getByLabel('CCD Case Reference Number').fill(caseReference);
        await page.getByLabel('Status').selectOption(status);
        await page.getByRole('button', { name: 'Submit' }).click();

        await expect(page).toHaveURL(/\/singular\/response$/);
        await expect(page.getByRole('heading', { name: 'Final state transition request unsuccessful' })).toBeVisible();
        await expect(page.getByRole('definition').filter({ hasText: hearingId })).toBeVisible();
      }
    }
  );

  test(
    'follows the response link to start another singular request',
    { tag: '@feature:rollback' },
    async ({ page }) => {
      await openSingularSelection(page);
      await selectSingularRequestType(page, 'Rollback');
      await page.getByLabel('Hearing ID').fill(hearingId);
      await page.getByLabel('CCD Case Reference Number').fill(caseReference);
      await page.getByRole('button', { name: 'Submit' }).click();
      await expect(page.getByRole('heading', { name: 'Rollback request unsuccessful' })).toBeVisible();

      await page.getByRole('link', { name: 'Make another singular request' }).click();

      await expect(page).toHaveURL(/\/singular$/);
      await expect(
        page.getByRole('heading', { name: 'What type of singular request would you like to make?' })
      ).toBeVisible();
    }
  );
});
