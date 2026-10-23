import { openHomePage } from '../home';
import { signInThroughOidc } from '../oidc';
import { expect, test } from '../protected-test';

const hearingId = '12345678901234567890';
const caseReference = '1234567890123456';

test.describe('HMC Admin UI protected singular journeys', () => {
  test.beforeEach(async ({ page }) => {
    await openHomePage(page);
    await signInThroughOidc(page);
  });

  test(
    'requires a singular request type before continuing',
    { tag: '@feature:request-selection' },
    async ({ page }) => {
      await page.goto('/singular?lng=en');
      await page.getByRole('button', { name: 'Continue' }).click();

      await expect(page).toHaveURL(/\/singular$/);
      await expect(page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
      await expect(page.locator('#singular-request-type-error')).toHaveText(/Select a singular request type/);
      await expect(page.getByRole('radio', { name: 'Final state transition' })).toBeVisible();
      await expect(page.getByRole('radio', { name: 'Rollback' })).toBeVisible();
    }
  );

  test(
    'returns from singular selection to Support tools with Back',
    { tag: '@feature:request-selection' },
    async ({ page }) => {
      await page.goto('/singular?lng=en');
      await page.getByRole('link', { name: 'Back' }).click();

      await expect(page).toHaveURL(/\/?(?:\?lng=en)?$/);
      await expect(page.getByRole('heading', { name: 'What type of request would you like to make?' })).toBeVisible();
    }
  );

  test(
    'selects final state transition from the protected singular selection page',
    { tag: '@feature:final-state-transition' },
    async ({ page }) => {
      await page.goto('/singular?lng=en');
      await page.getByRole('radio', { name: 'Final state transition' }).check();
      await page.getByRole('button', { name: 'Continue' }).click();

      await expect(page).toHaveURL(/\/singular\/final-state-transition$/);
      await expect(page.getByRole('heading', { name: 'Final state transition' })).toBeVisible();
    }
  );

  test(
    'selects rollback from the protected singular selection page',
    { tag: '@feature:rollback' },
    async ({ page }) => {
      await page.goto('/singular?lng=en');
      await page.getByRole('radio', { name: 'Rollback' }).check();
      await page.getByRole('button', { name: 'Continue' }).click();

      await expect(page).toHaveURL(/\/singular\/rollback$/);
      await expect(page.getByRole('heading', { name: 'Rollback' })).toBeVisible();
    }
  );

  test(
    'reports all mandatory final state transition errors',
    { tag: '@feature:final-state-transition' },
    async ({ page }) => {
      await page.goto('/singular/final-state-transition?lng=en');
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
      await expect(page.locator('#hearing-id-error')).toHaveText(/Enter a hearing ID/);
      await expect(page.locator('#case-ref-error')).toHaveText(/Enter a CCD Case Reference Number/);
      await expect(page.locator('#status-error')).toHaveText(/Select a status/);
      await expect(page.locator('.govuk-error-message')).toHaveCount(3);
    }
  );

  test(
    'preserves final state boundary values and reports invalid status and notes',
    { tag: '@feature:final-state-transition' },
    async ({ page }) => {
      await page.goto('/singular/final-state-transition?lng=en');
      const overlongHearingId = '1'.repeat(31);
      const overlongNotes = 'a'.repeat(5001);

      await page.route('**/singular/final-state-transition*', async route => {
        if (route.request().method() !== 'POST') {
          await route.continue();
          return;
        }

        const form = new URLSearchParams(route.request().postData() ?? '');
        form.set('hearingId', overlongHearingId);
        form.set('caseRef', 'not-a-case-reference');
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
      await expect(page.locator('#case-ref-error')).toHaveText(/must be a 16-digit number/);
      await expect(page.locator('#status-error')).toHaveText(/Status must be Cancelled, Adjourned or Completed/);
      await expect(page.locator('#notes-error')).toHaveText(
        /Incident Number \/ Notes must be 5000 characters or fewer/
      );
      await expect(page.getByLabel('Hearing ID')).toHaveValue(overlongHearingId);
      await expect(page.getByLabel('CCD Case Reference Number')).toHaveValue('not-a-case-reference');
      await expect(page.getByLabel('Incident Number / Notes')).toHaveValue(overlongNotes);
    }
  );

  test(
    'returns from final state transition to singular selection with Back',
    { tag: '@feature:final-state-transition' },
    async ({ page }) => {
      await page.goto('/singular/final-state-transition?lng=en');
      await page.getByRole('link', { name: 'Back' }).click();

      await expect(page).toHaveURL(/\/singular$/);
      await expect(
        page.getByRole('heading', { name: 'What type of singular request would you like to make?' })
      ).toBeVisible();
    }
  );

  test(
    'cancels final state transition and returns to Support tools',
    { tag: '@feature:final-state-transition' },
    async ({ page }) => {
      await page.goto('/singular/final-state-transition?lng=en');
      await page.getByRole('link', { name: 'Cancel' }).click();

      await expect(page).toHaveURL(/\/?(?:\?lng=en)?$/);
      await expect(page.getByRole('heading', { name: 'What type of request would you like to make?' })).toBeVisible();
    }
  );

  test(
    'reports rollback mandatory errors without rendering a status field',
    { tag: '@feature:rollback' },
    async ({ page }) => {
      await page.goto('/singular/rollback?lng=en');
      await page.getByRole('button', { name: 'Submit' }).click();

      await expect(page.locator('#hearing-id-error')).toHaveText(/Enter a hearing ID/);
      await expect(page.locator('#case-ref-error')).toHaveText(/Enter a CCD Case Reference Number/);
      await expect(page.locator('#status-error')).toHaveCount(0);
      await expect(page.getByLabel('Status')).toHaveCount(0);
    }
  );

  test(
    'preserves rollback boundary values and reports invalid fields',
    { tag: '@feature:rollback' },
    async ({ page }) => {
      await page.goto('/singular/rollback?lng=en');
      const overlongHearingId = '1'.repeat(31);
      const overlongNotes = 'a'.repeat(5001);

      await page.route('**/singular/rollback*', async route => {
        if (route.request().method() !== 'POST') {
          await route.continue();
          return;
        }

        const form = new URLSearchParams(route.request().postData() ?? '');
        form.set('hearingId', overlongHearingId);
        form.set('caseRef', 'not-a-case-reference');
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
      await expect(page.getByLabel('CCD Case Reference Number')).toHaveValue('not-a-case-reference');
      await expect(page.getByLabel('Incident Number / Notes')).toHaveValue(overlongNotes);
    }
  );

  test('cancels rollback and returns to Support tools', { tag: '@feature:rollback' }, async ({ page }) => {
    await page.goto('/singular/rollback?lng=en');
    await page.getByRole('link', { name: 'Cancel' }).click();

    await expect(page).toHaveURL(/\/?(?:\?lng=en)?$/);
    await expect(page.getByRole('heading', { name: 'What type of request would you like to make?' })).toBeVisible();
  });

  test(
    'exposes the singular service-problem page contract and retry links',
    { tag: '@feature:service-recovery' },
    async ({ page }) => {
      const response = await page.goto('/singular/problem?lng=en');

      await expect(response?.status()).toBe(502);
      await expect(page.getByRole('heading', { name: 'Sorry, there is a problem with the service' })).toBeVisible();
      await expect(page.getByText('manage exceptions service is unavailable')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Try singular request again' })).toHaveAttribute('href', '/singular');
      await expect(page.getByRole('link', { name: 'Return to Support tools' })).toHaveAttribute('href', '/');
    }
  );

  test(
    'redirects an uninitialised singular response to Support tools',
    { tag: '@feature:final-state-transition' },
    async ({ page }) => {
      await page.goto('/singular/response?lng=en');

      await expect(page).toHaveURL(/\/?(?:\?lng=en)?$/);
      await expect(page.getByRole('heading', { name: 'What type of request would you like to make?' })).toBeVisible();
    }
  );
});
