import * as fs from 'node:fs';
import * as path from 'node:path';

const jenkinsfile = fs.readFileSync(path.resolve(__dirname, '../../../../Jenkinsfile_CNP'), 'utf8');
const nightlyJenkinsfile = fs.readFileSync(path.resolve(__dirname, '../../../../Jenkinsfile_nightly'), 'utf8');
const parameterizedJenkinsfile = fs.readFileSync(
  path.resolve(__dirname, '../../../../Jenkinsfile_parameterized'),
  'utf8'
);
const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../package.json'), 'utf8'));

function callbackBody(stage: string, source = jenkinsfile): string {
  const start = source.indexOf(`afterAlways('${stage}')`);
  const end = source.indexOf('\n  }', start);
  return source.slice(start, end === -1 ? source.length : end);
}

function smokeCallbackSection(environment: string): string {
  const start = jenkinsfile.indexOf(`afterAlways('smoketest:${environment}')`);
  const end = jenkinsfile.indexOf('\n  before(', start);
  return jenkinsfile.slice(start, end === -1 ? jenkinsfile.length : end);
}

describe('native Playwright CNP contract', () => {
  test('uses native functional through the inherited aliases', () => {
    expect(packageJson.scripts['test:functional']).toBe('yarn test:playwright:functional');
    expect(packageJson.scripts['test:fullfunctional']).toBe('yarn test:functional');
    expect(packageJson.scripts['test:functional:codecept']).toBeUndefined();
    expect(packageJson.scripts['test:functional:local']).toBeUndefined();
    expect(packageJson.scripts['test:a11y']).toBe('node bin/run-a11y-tests.js');
    expect(packageJson.scripts['test:playwright:functional']).toContain('npx playwright test');
    expect(packageJson.scripts['test:playwright:functional:local']).toBeUndefined();
    expect(packageJson.scripts['test:accessibility:local']).toBeUndefined();
  });

  test.each([
    ['CNP', jenkinsfile],
    ['nightly', nightlyJenkinsfile],
    ['parameterized', parameterizedJenkinsfile],
  ])('%s leaves functional execution to the inherited builder', (_name, source) => {
    expect(source).not.toContain("yarnBuilder.yarn('test:playwright:functional')");
    expect(source).toContain('node bin/verify-playwright-functional-report.js');
    expect(source).not.toContain('runPlaywrightFunctional');
    expect(source).not.toContain('functional-output/functional');
    expect(source).toContain('allowMissing');
    expect(source).toContain('allowEmptyResults: false');
    expect(source).toContain('allowEmptyArchive: false');
  });

  test('uses the CNP deployment environment, not the callback name, for the IDAM public origin', () => {
    expect(jenkinsfile).toContain("def deployedEnvironment = env.ENVIRONMENT_NAME ?: targetEnvironment ?: 'aat'");
    expect(jenkinsfile).toContain('def testUrl = env.TEST_URL');
    expect(jenkinsfile).toContain(
      "throw new IllegalStateException('CNP must provide TEST_URL for protected Playwright tests')"
    );
    expect(jenkinsfile).not.toContain('hmc-admin-ui.${deployedEnvironment}.platform.hmcts.net');
    expect(jenkinsfile).toContain(
      'env.IDAM_PUBLIC_URL = "https://hmcts-access.${deployedEnvironment}.platform.hmcts.net"'
    );
    expect(jenkinsfile).not.toContain(
      'env.IDAM_PUBLIC_URL = "https://hmcts-access.${targetEnvironment}.platform.hmcts.net"'
    );
  });

  test.each(['preview', 'aat'])('configures normal and full %s before the inherited runner', environment => {
    for (const stage of ['functionalTest', 'fullFunctionalTest']) {
      const beforeCallback = `before('${stage}:${environment}') {`;
      const beforeStart = jenkinsfile.indexOf(beforeCallback);
      expect(beforeStart).toBeGreaterThanOrEqual(0);
      const beforeEnd = jenkinsfile.indexOf('\n  }', beforeStart);
      const beforeSection = jenkinsfile.slice(beforeStart, beforeEnd);
      expect(beforeSection).toContain(`configurePlaywrightFunctional('${environment}')`);
      const body = callbackBody(`${stage}:${environment}`);
      expect(body).toContain(
        `publishPlaywrightFunctional('${environment.toUpperCase()} HMC Admin UI Playwright Functional Test')`
      );
      expect(body).toContain('publishTestReports()');
      expect(body).toContain('finally {');
      expect(body).toContain('if (params.RUN_PLAYWRIGHT_ACCESSIBILITY)');
      expect(body).toContain(`runPlaywrightAccessibility('${environment}'`);
    }
    expect(jenkinsfile).not.toContain('enableFullFunctionalTest(');
    expect(jenkinsfile).not.toContain('parallel(suites)');
  });

  test('gates the diagnostic Preview identity before native configuration', () => {
    const beforeStart = jenkinsfile.indexOf("before('functionalTest:preview') {");
    const beforeEnd = jenkinsfile.indexOf('\n  }', beforeStart);
    const beforeSection = jenkinsfile.slice(beforeStart, beforeEnd);
    const identityGate = beforeSection.indexOf('diagnosticPreviewProbeFailure');
    const nativeConfiguration = beforeSection.indexOf("configurePlaywrightFunctional('preview')");

    expect(identityGate).toBeGreaterThanOrEqual(0);
    expect(nativeConfiguration).toBeGreaterThanOrEqual(0);
    expect(identityGate).toBeLessThan(nativeConfiguration);
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
    expect(jenkinsfile).toContain("before('functionalTest:preview')");
  });

  test.each(['preview', 'aat'])('keeps manual accessibility in the functional callback for %s', environment => {
    const callback = `afterAlways('smoketest:${environment}')`;
    const registrations = jenkinsfile.split(callback).length - 1;
    const section = smokeCallbackSection(environment);

    expect(registrations).toBe(1);
    expect(section).toContain('publishTestReports()');
    expect(section).not.toContain('runPlaywrightAccessibility');
    const functionalSection = callbackBody(`functionalTest:${environment}`);
    expect(functionalSection).toContain('runPlaywrightAccessibility');
    expect(jenkinsfile).not.toContain(`afterSuccess('smoketest:${environment}')`);
  });

  test('does not archive native Playwright roots through the generic report callback', () => {
    expect(jenkinsfile).toContain(
      'excludes: "${playwrightFunctionalOutputRoot}/**,${playwrightAccessibilityOutputRoot}/**"'
    );
    expect(jenkinsfile).toContain('env.PLAYWRIGHT_OUTPUT_DIR =');
    expect(jenkinsfile).not.toContain('withEnv(configurePlaywrightFunctional');
    expect(jenkinsfile).toContain('withEnv(configurePlaywrightAccessibility(targetEnvironment))');
  });

  test('runs the same separate accessibility report on the nightly AAT contract', () => {
    expect(nightlyJenkinsfile).toContain('enableFullFunctionalTest(60)');
    expect(nightlyJenkinsfile).toContain("name: 'RUN_PLAYWRIGHT_ACCESSIBILITY'");
    expect(nightlyJenkinsfile).toContain("yarnBuilder.yarn('test:accessibility:playwright')");
    expect(nightlyJenkinsfile).toContain('functional-output/tests/playwright-accessibility');
    expect(nightlyJenkinsfile).toContain('Nightly HMC Admin UI Playwright Accessibility Test');
  });

  test('configures the nightly full-functional command before execution and strictly publishes after', () => {
    expect(nightlyJenkinsfile).toContain("before('fullFunctionalTest') {\n    configurePlaywrightFunctional()");
    const body = callbackBody('fullFunctionalTest', nightlyJenkinsfile);
    expect(body).toContain('publishPlaywrightFunctional()');
    expect(body).toContain('finally {');
    expect(body).toContain('runPlaywrightAccessibility()');
    expect(nightlyJenkinsfile).toContain(
      "env.TEST_URL = env.TEST_URL ?: 'https://hmc-admin-ui.aat.platform.hmcts.net'"
    );
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

  test('strictly publishes the inherited native functional report', () => {
    expect(parameterizedJenkinsfile).toContain(
      "def playwrightFunctionalOutputRoot = 'functional-output/tests/playwright-functional'"
    );
    expect(parameterizedJenkinsfile).toContain('hmc-playwright-functional.html');
    expect(parameterizedJenkinsfile).toContain('node bin/verify-playwright-functional-report.js');
    expect(parameterizedJenkinsfile).toContain('allowMissing: false');
  });

  test.each(['preview', 'aat'])('configures and publishes normal/full %s while retaining smoke', environment => {
    const smokeCallback = `after('smoketest:${environment}')`;
    expect(parameterizedJenkinsfile.split(smokeCallback)).toHaveLength(2);
    expect(parameterizedJenkinsfile).toContain(`publishSmokeTestReport('${environment.toUpperCase()}')`);
    for (const stage of ['functionalTest', 'fullFunctionalTest']) {
      expect(parameterizedJenkinsfile).toContain(
        `before('${stage}:${environment}') {\n    configurePlaywrightFunctional('${environment}')`
      );
      const body = callbackBody(`${stage}:${environment}`, parameterizedJenkinsfile);
      expect(body).toContain(
        `publishPlaywrightFunctional('${environment.toUpperCase()} HMC Admin UI Playwright Functional Test')`
      );
      expect(body).toContain('finally {');
      expect(body).toContain(`runManualPlaywrightAccessibility('${environment}'`);
    }
    expect(parameterizedJenkinsfile).toContain("env.ENVIRONMENT_NAME ?: params.ENVIRONMENT ?: 'sandbox'");
    expect(parameterizedJenkinsfile).not.toContain('publishLegacyFunctionalReport');
  });

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
