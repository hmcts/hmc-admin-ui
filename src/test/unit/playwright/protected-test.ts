jest.mock('@playwright/test', () => ({
  test: { extend: (fixtures: unknown) => fixtures, info: jest.fn() },
}));

const { test: base } = require('@playwright/test');

const { test: fixtures, requireProtectedEvidence } = require('../../../../playwright/functional/protected-test');

const fixture = fixtures.protectedEvidence[0];

describe('protected evidence fixture', () => {
  const previousEnvironment = { ...process.env };
  beforeEach(() => {
    process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1';
    delete process.env.DEBUG;
    delete process.env.PWDEBUG;
  });
  afterEach(() => {
    process.env = { ...previousEnvironment };
  });

  function info() {
    return {
      errors: [] as { message: string }[],
      file: '/repo/test.ts',
      line: 1,
      column: 1,
      config: {
        quiet: true,
        reporter: [['/repo/playwright/reporters/odhin-adaptive.reporter.cjs'], ['list'], ['junit']],
      },
    };
  }

  test('permits login only after profile setup and projects failures beyond fixture cleanup', async () => {
    const testInfo = info();
    base.info.mockReturnValue(testInfo);
    expect(requireProtectedEvidence).toThrow('credential-safe');
    await fixture(
      { trace: 'off', screenshot: 'off', video: 'off' },
      async () => {
        expect(requireProtectedEvidence).not.toThrow();
      },
      testInfo
    );
    testInfo.errors.push({ message: 'late-teardown-secret' });
    expect(testInfo.errors).toHaveLength(1);
    expect(JSON.stringify(testInfo.errors)).not.toContain('late-teardown-secret');
  });

  test.each(['trace', 'screenshot', 'video'])(
    'rejects an effective %s capture override before body/login',
    async option => {
      const use = jest.fn();
      await expect(
        fixture({ trace: 'off', screenshot: 'off', video: 'off', [option]: 'on' }, use, info())
      ).rejects.toThrow('capture off');
      expect(use).not.toHaveBeenCalled();
    }
  );

  test.each(['DEBUG', 'PWDEBUG'])('rejects %s debug logging before the body', async variable => {
    process.env[variable] = '1';
    const use = jest.fn();
    await expect(fixture({ trace: 'off', screenshot: 'off', video: 'off' }, use, info())).rejects.toThrow(
      'debug disabled'
    );
    expect(use).not.toHaveBeenCalled();
  });

  test('rejects reporter order and quiet overrides before the body', async () => {
    for (const override of [{ quiet: false }, { reporter: [['list'], ['junit']] }]) {
      const testInfo = info();
      Object.assign(testInfo.config, override);
      const use = jest.fn();
      await expect(fixture({ trace: 'off', screenshot: 'off', video: 'off' }, use, testInfo)).rejects.toThrow(
        'approved reporters'
      );
      expect(use).not.toHaveBeenCalled();
    }
  });
});
