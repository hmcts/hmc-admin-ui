import { config as testConfig } from '../config';

const { I } = inject();

function getFunctionalTestCredentials(): { username: string; password: string } {
  const username = process.env.TEST_IDAM_USERNAME;
  const password = process.env.TEST_IDAM_PASSWORD;

  if (!username || !password) {
    throw new Error('Missing required environment variables: TEST_IDAM_USERNAME and TEST_IDAM_PASSWORD');
  }

  return { username, password };
}

export const iAmOnPage = (text: string): void => {
  const url = new URL(text, testConfig.TEST_URL);
  if (!url.searchParams.has('lng')) {
    url.searchParams.set('lng', 'en');
  }
  I.amOnPage(url.toString());
};
Given('I go to {string}', iAmOnPage);

When('I log in as the functional test user', () => {
  if (!testConfig.AuthEnabled) {
    return;
  }

  const { username, password } = getFunctionalTestCredentials();

  I.waitInUrl('hmcts-access');
  I.waitForElement('input[type="email"], input[name="username"], #username', testConfig.WaitForTimeout);
  I.fillField('input[type="email"], input[name="username"], #username', username);
  I.click('Continue');

  I.waitForElement('input[type="password"], input[name="password"], #password', testConfig.WaitForTimeout);
  I.fillField('input[type="password"], input[name="password"], #password', password);
  I.click('Continue');
});

Then('the page URL should be {string}', (url: string) => {
  I.waitInUrl(url);
});

Then('the page should include {string}', (text: string) => {
  I.waitForText(text);
});
