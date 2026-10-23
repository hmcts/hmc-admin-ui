import { type TestInfo, type TestInfoError, test as base } from '@playwright/test';

const { protectErrors } = require('../reporters/protected-evidence.cjs') as {
  protectErrors: (errors: TestInfoError[], location: { file: string; line: number; column: number }) => void;
};
const activeProfiles = new WeakSet<TestInfo>();

export function requireProtectedEvidence(): void {
  if (!activeProfiles.has(base.info())) {
    throw new Error('Protected login requires the credential-safe evidence fixture.');
  }
}

export const test = base.extend<{ protectedEvidence: void }>({
  protectedEvidence: [
    async ({ trace, screenshot, video }, use, testInfo) => {
      protectErrors(testInfo.errors, { file: testInfo.file, line: testInfo.line, column: testInfo.column });
      const reporters = testInfo.config.reporter.map(([name]) => name);
      if (
        trace !== 'off' ||
        screenshot !== 'off' ||
        video !== 'off' ||
        !testInfo.config.quiet ||
        process.env.PLAYWRIGHT_NO_COPY_PROMPT !== '1' ||
        process.env.DEBUG ||
        process.env.PWDEBUG ||
        !reporters[0]?.endsWith('/playwright/reporters/odhin-adaptive.reporter.cjs') ||
        reporters.length !== 3 ||
        !['list', 'dot'].includes(reporters[1]) ||
        reporters[2] !== 'junit'
      ) {
        throw new Error(
          'Protected evidence requires capture off, approved reporters, quiet output and debug disabled.'
        );
      }
      activeProfiles.add(testInfo);
      await use();
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
