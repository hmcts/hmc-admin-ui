import { type Page, expect } from '@playwright/test';

const DEFAULT_IDAM_PUBLIC_URL = 'https://hmcts-access.aat.platform.hmcts.net';
const IDAM_ORIGIN_TIMEOUT_MS = 10_000;

type PageWithUrl = Pick<Page, 'url'>;

export function isExpectedIdamOrigin(currentUrl: string, idamPublicUrl = configuredIdamPublicUrl()): boolean {
  return new URL(currentUrl).origin === new URL(idamPublicUrl).origin;
}

export async function expectIdamLoginOrigin(page: PageWithUrl): Promise<void> {
  await expect.poll(() => isExpectedIdamOrigin(page.url()), { timeout: IDAM_ORIGIN_TIMEOUT_MS }).toBe(true);
}

export async function signInThroughOidc(page: Page): Promise<void> {
  const username = process.env.TEST_IDAM_USERNAME;
  const password = process.env.TEST_IDAM_PASSWORD;
  if (!username || !password) {
    throw new Error('Missing required environment variables: TEST_IDAM_USERNAME and TEST_IDAM_PASSWORD');
  }

  await expectIdamLoginOrigin(page);
  await expect(page.getByRole('textbox', { name: /email|username/i })).toBeVisible();
  await page.getByRole('textbox', { name: /email|username/i }).fill(username);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expectIdamLoginOrigin(page);
  await expect(page.getByLabel(/password/i)).toBeVisible();
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: 'Continue' }).click();
}

function configuredIdamPublicUrl(): string {
  return process.env.IDAM_PUBLIC_URL ?? DEFAULT_IDAM_PUBLIC_URL;
}
