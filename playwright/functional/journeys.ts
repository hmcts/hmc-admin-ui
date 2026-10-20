import { type Page } from '@playwright/test';

import { openHomePage } from './home';

type HomeRequestType = 'Bulk' | 'Singular';

async function continueFromHome(page: Page, requestType: HomeRequestType): Promise<void> {
  await page.getByRole('radio', { name: requestType }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
}

export async function openSingularSelection(page: Page): Promise<void> {
  await openHomePage(page);
  await continueFromHome(page, 'Singular');
}

export async function openBulkUpload(page: Page): Promise<void> {
  await openHomePage(page);
  await continueFromHome(page, 'Bulk');
}

export async function selectSingularRequestType(
  page: Page,
  requestType: 'Final state transition' | 'Rollback'
): Promise<void> {
  await page.getByRole('radio', { name: requestType }).check();
  await page.getByRole('button', { name: 'Continue' }).click();
}
