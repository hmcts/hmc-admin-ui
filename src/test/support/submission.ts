import { Application, Request } from 'express';
import { parse } from 'node-html-parser';
import type { Agent, Test } from 'supertest';

export function attachSyntheticOidc(app: Application): void {
  app.use((req, _res, next) => {
    // Only identity issuance is synthetic; routes retain the real user-token extractor.
    req.oidc = { accessToken: { access_token: 'synthetic-user-token' } } as Request['oidc'];
    next();
  });
}

export async function getCsrfToken(agent: Agent, path: string): Promise<string> {
  const response = await agent.get(path).expect(200);
  const token = parse(response.text).querySelector('input[name="_csrf"]')?.getAttribute('value');
  if (!token) {
    throw new Error(`CSRF token missing from ${path}`);
  }
  return token;
}

export function renderedLink(html: string, label: string): string {
  const link = parse(html)
    .querySelectorAll('a')
    .find(anchor => anchor.textContent.trim() === label)
    ?.getAttribute('href');
  if (!link) {
    throw new Error(`Link missing: ${label}`);
  }
  return link;
}

export function uploadCsv(agent: Agent, csrfToken: string, csv: string): Test {
  return agent
    .post('/bulk-upload')
    .query({ _csrf: csrfToken })
    .attach('bulkUploadFile', Buffer.from(csv), { filename: 'synthetic-submission.csv', contentType: 'text/csv' });
}
