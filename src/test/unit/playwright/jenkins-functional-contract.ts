import * as fs from 'node:fs';
import * as path from 'node:path';

const jenkinsfile = fs.readFileSync(path.resolve(__dirname, '../../../../Jenkinsfile_CNP'), 'utf8');

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
});
