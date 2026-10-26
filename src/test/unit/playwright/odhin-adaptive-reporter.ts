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

  test('continues finalisation when an inner callback rejects', async () => {
    const outputFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'hmc-odhin-adaptive-'));
    const events: string[] = [];
    const reporter = new HmcOdhinAdaptiveReporter({ outputFolder });
    reporter.inner = {
      onTestEnd: async () => {
        throw new Error('inner callback failure');
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

      expect(events).toEqual(['end']);
    } finally {
      fs.rmSync(outputFolder, { recursive: true, force: true });
    }
  });
  test('projects values before any downstream reporter can persist the shared result', () => {
    const reporter = new HmcOdhinAdaptiveReporter();
    reporter.inner = {};
    const result = {
      status: 'failed',
      retry: 0,
      duration: 3,
      errors: [{ message: 'synthetic-secret', stack: 'synthetic-secret' }],
      stdout: ['synthetic-secret'],
      stderr: [Buffer.from('synthetic-secret')],
      steps: [
        {
          title: 'Fill synthetic-secret',
          category: 'pw:api',
          params: { value: 'synthetic-secret' },
          duration: 2,
          error: { message: 'synthetic-secret' },
          steps: [],
        },
      ],
      attachments: [],
    };
    reporter.onTestEnd({ id: 'case', retries: 0, tags: [], location: { file: '/workspace/test.ts' } }, result);
    expect(JSON.stringify(result)).not.toContain('synthetic-secret');
    expect(result.status).toBe('failed');
    expect(result.errors).toHaveLength(1);
    expect(result.steps).toHaveLength(1);
  });
  test('projects worker errors synchronously including non-enumerable Error stacks', () => {
    const reporter = new HmcOdhinAdaptiveReporter();
    const received: unknown[] = [];
    reporter.inner = { onError: (error: unknown) => received.push(error) };
    const error = new Error('synthetic-worker-secret');
    reporter.onError(error);
    expect(error.message).not.toContain('synthetic-worker-secret');
    expect(error.stack).toBeUndefined();
    expect(received).toEqual([error]);
  });

  test('never forwards string or Buffer stdout/stderr to the inner reporter', async () => {
    const reporter = new HmcOdhinAdaptiveReporter();
    const onStdOut = jest.fn();
    const onStdErr = jest.fn();
    reporter.inner = { onStdOut, onStdErr };
    reporter.onStdOut('synthetic-secret');
    reporter.onStdErr(Buffer.from('synthetic-secret'));
    await reporter.flushInnerCallbacks();
    expect(onStdOut).not.toHaveBeenCalled();
    expect(onStdErr).not.toHaveBeenCalled();
  });
});
