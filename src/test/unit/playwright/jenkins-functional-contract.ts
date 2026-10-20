import * as fs from 'node:fs';
import * as path from 'node:path';

const jenkinsfile = fs.readFileSync(path.resolve(__dirname, '../../../../Jenkinsfile_CNP'), 'utf8');
const nightlyJenkinsfile = fs.readFileSync(path.resolve(__dirname, '../../../../Jenkinsfile_nightly'), 'utf8');
const parameterizedJenkinsfile = fs.readFileSync(
  path.resolve(__dirname, '../../../../Jenkinsfile_parameterized'),
  'utf8'
);
const codeceptRunner = fs.readFileSync(path.resolve(__dirname, '../../../../bin/run-functional-tests.js'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../package.json'), 'utf8'));

function callbackBody(stage: string): string {
  const callback = jenkinsfile.match(new RegExp(`afterAlways\\('${stage}'\\)\\s*\\{([^}]*)\\}`));
  return callback?.[1] ?? '';
}

function smokeCallbackSection(environment: string): string {
  const start = jenkinsfile.indexOf(`afterAlways('smoketest:${environment}')`);
  const end = jenkinsfile.indexOf('\n  before(', start);
  return jenkinsfile.slice(start, end === -1 ? jenkinsfile.length : end);
}

describe('native Playwright CNP contract', () => {
  test('keeps the legacy Codecept functional command separate from native Playwright', () => {
    expect(packageJson.scripts['test:functional']).toBe('yarn test:functional:codecept');
    expect(packageJson.scripts['test:functional:codecept']).toBe('node bin/run-functional-tests.js');
    expect(packageJson.scripts['test:fullfunctional']).toBe('yarn test:functional');
    expect(packageJson.scripts['test:functional:local']).toContain('test:functional:codecept');
    expect(packageJson.scripts['test:a11y']).toBe('node bin/run-a11y-tests.js');
    expect(packageJson.scripts['test:playwright:functional']).toContain('npx playwright test');
    expect(packageJson.scripts['test:playwright:functional:local']).toBeUndefined();
    expect(packageJson.scripts['test:accessibility:local']).toBeUndefined();
    expect(packageJson.scripts['test:functional']).not.toContain('playwright');
  });

  test('keeps the retained Codecept runner on the Chromium-only browser contract', () => {
    expect(codeceptRunner).toContain("run('yarn', ['playwright', 'install', 'chromium'])");
    expect(codeceptRunner).not.toContain("run('yarn', ['playwright', 'install']);");
  });

  test('uses the CNP deployment environment, not the callback name, for the IDAM public origin', () => {
    expect(jenkinsfile).toContain("def deployedEnvironment = env.ENVIRONMENT_NAME ?: targetEnvironment ?: 'aat'");
    expect(jenkinsfile).toContain('def testUrl = env.TEST_URL');
    expect(jenkinsfile).toContain(
      "throw new IllegalStateException('CNP must provide TEST_URL for protected Playwright tests')"
    );
    expect(jenkinsfile).not.toContain('hmc-admin-ui.${deployedEnvironment}.platform.hmcts.net');
    expect(jenkinsfile).toContain('"IDAM_PUBLIC_URL=https://hmcts-access.${deployedEnvironment}.platform.hmcts.net"');
    expect(jenkinsfile).not.toContain(
      'env.IDAM_PUBLIC_URL = "https://hmcts-access.${targetEnvironment}.platform.hmcts.net"'
    );
  });

  test.each(['preview', 'aat'])('configures and publishes the %s normal functional stage', environment => {
    expect(jenkinsfile).toContain(`afterAlways('functionalTest:${environment}')`);
    expect(jenkinsfile).toContain(`runPlaywrightSuitesInParallel(\n      '${environment}'`);
    expect(jenkinsfile.split('runPlaywrightFunctional(targetEnvironment, functionalReportName)').length - 1).toBe(1);
    expect(jenkinsfile).not.toContain(`afterAlways('fullFunctionalTest:${environment}')`);
  });

  test.each(['preview', 'aat'])('publishes the %s functional Odhín report', environment => {
    const body = callbackBody(`functionalTest:${environment}`);

    expect(body).toContain('publishTestReports()');
    expect(body).toContain(`runPlaywrightSuitesInParallel(\n      '${environment}'`);
  });

  test('keeps accessibility in its own opt-in report lane', () => {
    expect(jenkinsfile).toContain("name: 'RUN_PLAYWRIGHT_ACCESSIBILITY'");
    expect(jenkinsfile).toContain(
      "def playwrightAccessibilityOutputRoot = 'functional-output/tests/playwright-accessibility'"
    );
    expect(jenkinsfile).toContain("yarnBuilder.yarn('test:accessibility:playwright')");
    expect(jenkinsfile).toContain('hmc-playwright-accessibility.html');
    expect(jenkinsfile).toContain('skipMarkingBuildUnstable: true');
  });

  test('keeps the CNP pipeline on the protected Playwright pack only', () => {
    expect(jenkinsfile).not.toContain('Playwright Functional Local Contract Test');
    expect(jenkinsfile).not.toContain('runPlaywrightFunctionalLocal');
    expect(jenkinsfile).not.toContain("yarnBuilder.yarn('test:playwright:functional:local')");
    expect(jenkinsfile).not.toContain('playwright-functional-local');
    expect(jenkinsfile).toContain("yarnBuilder.yarn('test:playwright:functional')");
  });

  test.each(['preview', 'aat'])(
    'keeps manual accessibility in the parallel functional callback for %s',
    environment => {
      const callback = `afterAlways('smoketest:${environment}')`;
      const registrations = jenkinsfile.split(callback).length - 1;
      const section = smokeCallbackSection(environment);

      expect(registrations).toBe(1);
      expect(section).toContain('publishTestReports()');
      expect(section).not.toContain('runPlaywrightAccessibility');
      const functionalSection = callbackBody(`functionalTest:${environment}`);
      expect(functionalSection).toContain('runPlaywrightSuitesInParallel');
      expect(jenkinsfile).toContain('parallel(suites)');
      expect(jenkinsfile).not.toContain(`afterSuccess('smoketest:${environment}')`);
    }
  );

  test('does not archive native Playwright roots through the generic report callback', () => {
    expect(jenkinsfile).toContain(
      'excludes: "${playwrightFunctionalOutputRoot}/**,${playwrightAccessibilityOutputRoot}/**"'
    );
    expect(jenkinsfile).toContain('withEnv(configurePlaywrightFunctional(targetEnvironment))');
    expect(jenkinsfile).toContain('withEnv(configurePlaywrightAccessibility(targetEnvironment))');
  });

  test('runs the same separate accessibility report on the nightly AAT contract', () => {
    expect(nightlyJenkinsfile).toContain('enableFullFunctionalTest(60)');
    expect(nightlyJenkinsfile).toContain("name: 'RUN_PLAYWRIGHT_ACCESSIBILITY'");
    expect(nightlyJenkinsfile).toContain("yarnBuilder.yarn('test:accessibility:playwright')");
    expect(nightlyJenkinsfile).toContain('functional-output/tests/playwright-accessibility');
    expect(nightlyJenkinsfile).toContain('Nightly HMC Admin UI Playwright Accessibility Test');
  });

  test('runs native Playwright after the retained nightly full-functional command', () => {
    expect(nightlyJenkinsfile).toContain("afterAlways('fullFunctionalTest')");
    expect(nightlyJenkinsfile).toContain('runPlaywrightFunctional()');
    expect(nightlyJenkinsfile).toContain("yarnBuilder.yarn('test:playwright:functional')");
  });

  test.each([
    ['CNP', jenkinsfile],
    ['nightly', nightlyJenkinsfile],
  ])('preflights the pinned Chromium runtime before %s Playwright stages', (_pipeline, source) => {
    expect(source).toContain('PLAYWRIGHT_BROWSERS_PATH=${env.WORKSPACE}/.cache/ms-playwright');
    expect(source).toContain("afterSuccess('checkout')");
    expect(source).toContain("yarnBuilder.yarn('test:setup:playwright-install-chromium')");
    expect(source).toContain("yarnBuilder.yarn('test:setup:playwright-verify-chromium')");
  });
});

describe('manual parameterized pipeline contract', () => {
  test('uses the sandbox job convention and HMC deployment identity', () => {
    expect(parameterizedJenkinsfile).toContain("name: 'ENVIRONMENT'");
    expect(parameterizedJenkinsfile).toContain("choices: 'saat\\nsandbox\\nsprod'");
    expect(parameterizedJenkinsfile).toContain("name: 'RUN_PLAYWRIGHT_ACCESSIBILITY'");
    expect(parameterizedJenkinsfile).toContain('defaultValue: false');
    expect(parameterizedJenkinsfile).toContain('@Library("Infrastructure@2.5.0")');
    expect(parameterizedJenkinsfile).toContain("def product = 'hmc'");
    expect(parameterizedJenkinsfile).toContain("def component = 'admin-ui'");
    expect(parameterizedJenkinsfile).toContain(
      "withParameterizedPipeline(type, product, component, params.ENVIRONMENT, 'sandbox')"
    );
  });

  test('loads the existing HMC test-user secrets without WebApp-only variables', () => {
    expect(parameterizedJenkinsfile).toContain("secret('hmc-admin-ui-test-user', 'TEST_IDAM_USERNAME')");
    expect(parameterizedJenkinsfile).toContain("secret('hmc-admin-ui-test-password', 'TEST_IDAM_PASSWORD')");
    expect(parameterizedJenkinsfile).not.toContain('ORG_USER_ASSIGNMENT_MODE');
    expect(parameterizedJenkinsfile).not.toContain('PW_ACCESSIBILITY_WORKERS');
  });

  test('installs and verifies the pinned workspace Chromium before native Playwright runs', () => {
    expect(parameterizedJenkinsfile).toContain('PLAYWRIGHT_BROWSERS_PATH=${env.WORKSPACE}/.cache/ms-playwright');
    expect(parameterizedJenkinsfile).toContain("yarnBuilder.yarn('test:setup:playwright-install-chromium')");
    expect(parameterizedJenkinsfile).toContain("yarnBuilder.yarn('test:setup:playwright-verify-chromium')");
  });

  test('adds native functional coverage alongside the retained Codecept functional stage', () => {
    expect(parameterizedJenkinsfile).toContain(
      "def playwrightFunctionalOutputRoot = 'functional-output/tests/playwright-functional'"
    );
    expect(parameterizedJenkinsfile).toContain('hmc-playwright-functional.html');
    expect(parameterizedJenkinsfile).toContain("yarnBuilder.yarn('test:playwright:functional')");
    expect(parameterizedJenkinsfile).toContain('node bin/verify-playwright-functional-report.js');
    expect(parameterizedJenkinsfile).toContain('allowMissing: false');
  });

  test.each(['preview', 'aat'])(
    'preserves the %s smoke and legacy functional publications while adding native Playwright lanes',
    environment => {
      const smokeCallback = `after('smoketest:${environment}')`;
      const callback = `after('functionalTest:${environment}')`;
      expect(parameterizedJenkinsfile.split(smokeCallback).length - 1).toBe(1);
      expect(parameterizedJenkinsfile).toContain(`publishSmokeTestReport('${environment.toUpperCase()}')`);
      const registrations = parameterizedJenkinsfile.split(callback).length - 1;

      expect(registrations).toBe(1);
      expect(parameterizedJenkinsfile).toContain('publishLegacyFunctionalReport');
      expect(parameterizedJenkinsfile).toContain(
        `runPlaywrightFunctional('${environment}', '${environment.toUpperCase()} HMC Admin UI Playwright Functional Test')`
      );
      const accessibilityCall = `runManualPlaywrightAccessibility('${environment}'`;
      expect(parameterizedJenkinsfile).toContain(accessibilityCall);
      const callbackStart = parameterizedJenkinsfile.indexOf(callback);
      const callbackEnd = parameterizedJenkinsfile.indexOf('\n  }', callbackStart);
      const callbackSource = parameterizedJenkinsfile.slice(callbackStart, callbackEnd);
      expect(callbackSource).toContain('try {');
      expect(callbackSource).toContain(`finally {\n      ${accessibilityCall}`);
    }
  );

  test('keeps manual accessibility evidence in its own report-only lane', () => {
    expect(parameterizedJenkinsfile).toContain(
      "def playwrightAccessibilityOutputRoot = 'functional-output/tests/playwright-accessibility'"
    );
    expect(parameterizedJenkinsfile).toContain('hmc-playwright-accessibility.html');
    expect(parameterizedJenkinsfile).toContain("yarnBuilder.yarn('test:accessibility:playwright')");
    expect(parameterizedJenkinsfile).toContain('junit allowEmptyResults: false, skipMarkingBuildUnstable: true');
    expect(parameterizedJenkinsfile).toContain('skipMarkingBuildUnstable: true');
    expect(parameterizedJenkinsfile).toContain("currentBuild.result = 'UNSTABLE'");
    expect(parameterizedJenkinsfile).toContain('FlowInterruptedException');
  });
});
