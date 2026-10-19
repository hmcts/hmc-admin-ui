import { Page, expect } from '@playwright/test';

type HomePageNavigator = {
  goto: (url: string) => Promise<unknown>;
};

export async function openHomePage(page: HomePageNavigator): Promise<void> {
  await page.goto('/?lng=en');
}

export async function expectHomePage(page: Page): Promise<void> {
  await expect(page.getByText('Support tools', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What type of request would you like to make?' })).toBeVisible();
}
