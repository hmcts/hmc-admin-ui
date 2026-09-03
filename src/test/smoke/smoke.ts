import { fail } from 'assert';

import axios, { AxiosResponse } from 'axios';
import { expect } from 'chai';

const testUrl = process.env.TEST_URL || 'http://localhost:3000';

describe('Smoke Test', () => {
  describe('Home page authentication', () => {
    test('redirects unauthenticated users to IDAM', async () => {
      try {
        const response: AxiosResponse = await axios.get(testUrl, {
          headers: {
            'Accept-Encoding': 'gzip',
          },
          maxRedirects: 0,
          validateStatus: status => status >= 300 && status < 400,
        });

        expect(response.status).to.equal(302);
        expect(response.headers.location).to.contain('hmcts-access');
        expect(response.headers.location).to.contain('/o/authorize');
      } catch {
        fail('IDAM redirect was not present and/or correct');
      }
    });
  });
});
