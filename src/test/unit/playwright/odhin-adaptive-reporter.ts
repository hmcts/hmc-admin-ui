import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const HmcOdhinAdaptiveReporter = require('../../../../playwright/reporters/odhin-adaptive.reporter.cjs');

describe('HMC Odhín adaptive reporter', () => {
  test('flushes asynchronous inner callbacks before report finalisation', async () => {
    const outputFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'hmc-odhin-adaptive-'));
    const events: string[] = [];
    const reporter = new HmcOdhinAdaptiveReporter({ outputFolder });
    reporter.inner = {
      onTestEnd: async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        events.push('test-end');
      },
      onEnd: async () => {
        events.push('end');
      },
    };

    try {
      reporter.onTestEnd(
        {
          id: 'test-id',
          retries: 0,
          tags: [],
          location: { file: '/workspace/playwright/functional/home.spec.ts' },
        },
        { duration: 1, retry: 0, status: 'passed' }
      );
      await reporter.onEnd({ status: 'passed' });

      expect(events).toEqual(['test-end', 'end']);
    } finally {
      fs.rmSync(outputFolder, { recursive: true, force: true });
    }
  });
});
