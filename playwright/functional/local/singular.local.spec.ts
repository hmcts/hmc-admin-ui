import { expect, test } from '@playwright/test';

import { openSingularSelection, selectSingularRequestType } from '../journeys';

const hearingId = '12345678901234567890';
const caseReference = '1234567890123456';

test.describe('HMC Admin UI local singular journeys', () => {
  test(
    'renders the final state transition form and its status choices',
    { tag: '@feature:final-state-transition' },
    async ({ page }) => {
      await openSingularSelection(page);
      await selectSingularRequestType(page, 'Final state transition');

      await expect(page).toHaveURL(/\/singular\/final-state-transition$/);
      await expect(page.getByRole('heading', { name: 'Final state transition' })).toBeVisible();
      await expect(page.getByLabel('Hearing ID')).toBeVisible();
      await expect(page.getByLabel('CCD Case Reference Number')).toBeVisible();
      await expect(page.getByLabel('Status')).toHaveValue('');
      await expect(page.locator('#status option')).toHaveText(['Select status', 'Cancelled', 'Adjourned', 'Completed']);
      await expect(page.getByLabel('Incident Number / Notes')).toBeVisible();
    }
  );

  test('renders the rollback form without a status field', { tag: '@feature:rollback' }, async ({ page }) => {
    await openSingularSelection(page);
    await selectSingularRequestType(page, 'Rollback');

    await expect(page).toHaveURL(/\/singular\/rollback$/);
    await expect(page.getByRole('heading', { name: 'Rollback' })).toBeVisible();
    await expect(page.getByLabel('Hearing ID')).toBeVisible();
    await expect(page.getByLabel('CCD Case Reference Number')).toBeVisible();
    await expect(page.getByLabel('Incident Number / Notes')).toBeVisible();
    await expect(page.getByLabel('Status')).toHaveCount(0);
  });

  test(
    'preserves invalid final state values and reports each server-side field error',
    { tag: '@feature:final-state-transition' },
    async ({ page }) => {
      await openSingularSelection(page);
      await selectSingularRequestType(page, 'Final state transition');
      await page.getByLabel('Hearing ID').fill('not-a-number');
      await page.getByLabel('CCD Case Reference Number').fill('not-a-case-reference');
      await page.getByLabel('Incident Number / Notes').fill('Incident details');
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page.locator('#hearing-id-error')).toHaveText(/Hearing ID must be a number/);
      await expect(page.locator('#case-ref-error')).toHaveText(/must be a 16-digit number/);
      await expect(page.locator('#status-error')).toHaveText(/Select a status/);
      await expect(page.getByLabel('Hearing ID')).toHaveValue('not-a-number');
      await expect(page.getByLabel('CCD Case Reference Number')).toHaveValue('not-a-case-refer');
      await expect(page.getByLabel('Incident Number / Notes')).toHaveValue('Incident details');
      await expect(page.getByLabel('Hearing ID')).toHaveAttribute('aria-describedby', 'hearing-id-error');
      await expect(page.getByLabel('CCD Case Reference Number')).toHaveAttribute(
        'aria-describedby',
        'case-ref-hint case-ref-error'
      );
      await expect(page.getByLabel('Status')).toHaveAttribute('aria-describedby', 'status-error');
    }
  );

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
    'preserves final state boundary values and reports each server-side validation error',
    { tag: '@feature:final-state-transition' },
    async ({ page }) => {
      await openSingularSelection(page);
      await selectSingularRequestType(page, 'Final state transition');

      const overlongHearingId = '1'.repeat(31);
      const overlongNotes = 'a'.repeat(5001);
      await page.route('**/singular/final-state-transition*', async route => {
        if (route.request().method() !== 'POST') {
          await route.continue();
          return;
        }

        const form = new URLSearchParams(route.request().postData() ?? '');
        form.set('hearingId', overlongHearingId);
        form.set('caseRef', caseReference);
        form.set('status', 'INVALID');
        form.set('notes', overlongNotes);
        await route.continue({ postData: form.toString() });
      });

      await page.getByLabel('Hearing ID').fill(hearingId);
      await page.getByLabel('CCD Case Reference Number').fill(caseReference);
      await page.getByLabel('Status').selectOption('CANCELLED');
      await page.getByLabel('Incident Number / Notes').fill('Boundary validation');
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page.locator('#hearing-id-error')).toHaveText(/Hearing ID must be 30 characters or fewer/);
      await expect(page.locator('#status-error')).toHaveText(/Status must be Cancelled, Adjourned or Completed/);
      await expect(page.locator('#notes-error')).toHaveText(
        /Incident Number \/ Notes must be 5000 characters or fewer/
      );
      await expect(page.getByLabel('Hearing ID')).toHaveValue(overlongHearingId);
      await expect(page.getByLabel('CCD Case Reference Number')).toHaveValue(caseReference);
      await expect(page.getByLabel('Incident Number / Notes')).toHaveValue(overlongNotes);
    }
  );

  test(
    'shows rollback mandatory errors without rendering a status error',
    { tag: '@feature:rollback' },
    async ({ page }) => {
      await openSingularSelection(page);
      await selectSingularRequestType(page, 'Rollback');
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page.locator('#hearing-id-error')).toHaveText(/Enter a hearing ID/);
      await expect(page.locator('#case-ref-error')).toHaveText(/Enter a CCD Case Reference Number/);
      await expect(page.locator('#status-error')).toHaveCount(0);
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
    'preserves rollback boundary values and reports validation errors without a status error',
    { tag: '@feature:rollback' },
    async ({ page }) => {
      await openSingularSelection(page);
      await selectSingularRequestType(page, 'Rollback');

      const overlongHearingId = '1'.repeat(31);
      const invalidCaseReference = 'not-a-case-reference';
      const overlongNotes = 'a'.repeat(5001);
      await page.route('**/singular/rollback*', async route => {
        if (route.request().method() !== 'POST') {
          await route.continue();
          return;
        }

        const form = new URLSearchParams(route.request().postData() ?? '');
        form.set('hearingId', overlongHearingId);
        form.set('caseRef', invalidCaseReference);
        form.set('notes', overlongNotes);
        await route.continue({ postData: form.toString() });
      });

      await page.getByLabel('Hearing ID').fill(hearingId);
      await page.getByLabel('CCD Case Reference Number').fill(caseReference);
      await page.getByLabel('Incident Number / Notes').fill('Boundary validation');
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page.locator('#hearing-id-error')).toHaveText(/Hearing ID must be 30 characters or fewer/);
      await expect(page.locator('#case-ref-error')).toHaveText(/must be a 16-digit number/);
      await expect(page.locator('#notes-error')).toHaveText(
        /Incident Number \/ Notes must be 5000 characters or fewer/
      );
      await expect(page.locator('#status-error')).toHaveCount(0);
      await expect(page.getByLabel('Hearing ID')).toHaveValue(overlongHearingId);
      await expect(page.getByLabel('CCD Case Reference Number')).toHaveValue(invalidCaseReference);
      await expect(page.getByLabel('Incident Number / Notes')).toHaveValue(overlongNotes);
    }
  );

  test(
    'returns from the final state transition form to singular selection with Back',
    { tag: '@feature:final-state-transition' },
    async ({ page }) => {
      await openSingularSelection(page);
      await selectSingularRequestType(page, 'Final state transition');
      await page.getByRole('link', { name: 'Back' }).click();

      await expect(page).toHaveURL(/\/singular$/);
      await expect(
        page.getByRole('heading', { name: 'What type of singular request would you like to make?' })
      ).toBeVisible();
    }
  );

  test('cancels a rollback and returns to Support tools', { tag: '@feature:rollback' }, async ({ page }) => {
    await openSingularSelection(page);
    await selectSingularRequestType(page, 'Rollback');
    await page.getByRole('link', { name: 'Cancel' }).click();

    await expect(page).toHaveURL(/\/?(?:\?lng=en)?$/);
    await expect(page.getByRole('heading', { name: 'What type of request would you like to make?' })).toBeVisible();
  });

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

  test(
    'redirects an uninitialised singular response page to Support tools',
    { tag: '@feature:service-recovery' },
    async ({ page }) => {
      await page.goto('/singular/response?lng=en');

      await expect(page).toHaveURL(/\/?(?:\?lng=en)?$/);
      await expect(page.getByRole('heading', { name: 'What type of request would you like to make?' })).toBeVisible();
    }
  );

  test('renders singular service recovery links', { tag: '@feature:service-recovery' }, async ({ page }) => {
    await page.goto('/singular/problem?lng=en');

    await expect(page.getByRole('heading', { name: 'Sorry, there is a problem with the service' })).toBeVisible();
    await expect(page.getByText('manage exceptions service is unavailable')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Try singular request again' })).toHaveAttribute('href', '/singular');
    await expect(page.getByRole('link', { name: 'Return to Support tools' })).toHaveAttribute('href', '/');
  });
});
