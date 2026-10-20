import { expect, test } from '@playwright/test';

import { auditPageAccessibility } from '../functional/accessibility';
import { openSingularSelection, selectSingularRequestType } from '../functional/journeys';

const hearingId = '12345678901234567890';
const caseReference = '1234567890123456';

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

    const results = await auditPageAccessibility(page, testInfo, 'singular-response-failure');
    expect(results.violations).toEqual([]);
  }
);
