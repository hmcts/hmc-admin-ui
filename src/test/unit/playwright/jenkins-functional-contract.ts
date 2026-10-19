import * as fs from 'node:fs';
import * as path from 'node:path';

const jenkinsfile = fs.readFileSync(path.resolve(__dirname, '../../../../Jenkinsfile_CNP'), 'utf8');
const nightlyJenkinsfile = fs.readFileSync(path.resolve(__dirname, '../../../../Jenkinsfile_nightly'), 'utf8');

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
  test('uses the CNP deployment environment, not the callback name, for the IDAM public origin', () => {
    expect(jenkinsfile).toContain("def deployedEnvironment = env.ENVIRONMENT_NAME ?: targetEnvironment ?: 'aat'");
    expect(jenkinsfile).toContain(
      'env.IDAM_PUBLIC_URL = "https://hmcts-access.${deployedEnvironment}.platform.hmcts.net"'
    );
    expect(jenkinsfile).not.toContain(
      'env.IDAM_PUBLIC_URL = "https://hmcts-access.${targetEnvironment}.platform.hmcts.net"'
    );
  });

  test.each(['preview', 'aat'])('configures and publishes the %s full functional stage', environment => {
    expect(jenkinsfile).toContain(`before('fullFunctionalTest:${environment}')`);
    expect(jenkinsfile).toContain(`configurePlaywrightFunctional('${environment}')`);
    expect(jenkinsfile).toContain(`afterAlways('fullFunctionalTest:${environment}')`);
  });

  test.each(['preview', 'aat'])('configures and publishes the %s normal functional stage', environment => {
    expect(jenkinsfile).toContain(`before('functionalTest:${environment}')`);
    expect(jenkinsfile).toContain(`configurePlaywrightFunctional('${environment}')`);
    expect(jenkinsfile).toContain(`afterAlways('functionalTest:${environment}')`);
  });

  test.each(['preview', 'aat'])('publishes the %s functional Odhín report', environment => {
    const body = callbackBody(`functionalTest:${environment}`);

    expect(body).toContain('publishTestReports()');
    expect(body).toContain(
      `publishPlaywrightFunctional('${environment.toUpperCase()} HMC Admin UI Playwright Functional Test')`
    );
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

  test.each(['preview', 'aat'])('keeps manual accessibility and smoke reports in one callback for %s', environment => {
    const callback = `afterAlways('smoketest:${environment}')`;
    const registrations = jenkinsfile.split(callback).length - 1;
    const section = smokeCallbackSection(environment);

    expect(registrations).toBe(1);
    expect(section).toContain('publishTestReports()');
    expect(section).toContain('runPlaywrightAccessibility');
    expect(jenkinsfile).not.toContain(`afterSuccess('smoketest:${environment}')`);
  });

  test('runs the same separate accessibility report on the nightly AAT contract', () => {
    expect(nightlyJenkinsfile).toContain('enableFullFunctionalTest(60)');
    expect(nightlyJenkinsfile).toContain("name: 'RUN_PLAYWRIGHT_ACCESSIBILITY'");
    expect(nightlyJenkinsfile).toContain("yarnBuilder.yarn('test:accessibility:playwright')");
    expect(nightlyJenkinsfile).toContain('functional-output/tests/playwright-accessibility');
    expect(nightlyJenkinsfile).toContain('Nightly HMC Admin UI Playwright Accessibility Test');
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
