import { type Download, type Page, type Response, type Route } from '@playwright/test';

import { createUploadFile } from './upload';

export async function submitForm(page: Page, pathname: string): Promise<Response> {
  const origin = new URL(page.url()).origin;
  const submitted = page.waitForResponse(response => {
    const url = new URL(response.url());
    return response.request().method() === 'POST' && url.origin === origin && url.pathname === pathname;
  });
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  return submitted;
}

export async function submitRejectedUpload(page: Page, upload: { name: string; csv: string }): Promise<Download> {
  await page.getByLabel('Please upload a file').setInputFiles(createUploadFile(upload.name, 'text/csv', upload.csv));
  const download = page.waitForEvent('download');
  await submitForm(page, '/bulk-upload');
  return download;
}

export async function downloadFromLink(page: Page, label: string): Promise<Download> {
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: label, exact: true }).click();
  return download;
}

export async function omitCsrfBodyToken(route: Route): Promise<void> {
  if (route.request().method() !== 'POST') {
    await route.continue();
    return;
  }
  const body = new URLSearchParams(route.request().postData() ?? '');
  body.delete('_csrf');
  await route.continue({ postData: body.toString() });
}

export async function omitCsrfQueryToken(route: Route): Promise<void> {
  if (route.request().method() !== 'POST') {
    await route.continue();
    return;
  }
  const url = new URL(route.request().url());
  url.searchParams.delete('_csrf');
  await route.continue({ url: url.toString() });
}
