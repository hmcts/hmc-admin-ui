import * as fs from 'node:fs';
import * as path from 'node:path';

const {
  protectErrors,
  protectStep,
  protectResult,
} = require('../../../../playwright/reporters/protected-evidence.cjs');

describe('protected evidence projection', () => {
  test('projects existing and late errors without changing their count', () => {
    const errors = [{ message: 'synthetic-secret' }];
    protectErrors(errors, { file: 'test.ts', line: 1, column: 1 });
    expect(errors.push({ message: 'late-teardown-secret' })).toBe(2);
    expect(errors).toHaveLength(2);
    expect(JSON.stringify(errors)).not.toMatch(/synthetic-secret|late-teardown-secret/);
    expect(errors[0]).toMatchObject({ location: { file: 'test.ts', line: 1, column: 1 } });
  });

  test('projects nested failed steps without losing their timing or failure state', () => {
    const step = {
      title: 'Fill synthetic-secret',
      category: 'pw:api',
      duration: 20,
      params: { value: 'synthetic-secret' },
      subtitle: 'synthetic-secret',
      error: { message: 'synthetic-secret' },
      steps: [{ title: 'synthetic-secret', category: 'expect', duration: 3, error: { message: 'synthetic-secret' } }],
    };
    protectStep(step);
    expect(JSON.stringify(step)).not.toContain('synthetic-secret');
    expect(step.duration).toBe(20);
    expect(step.error).toBeDefined();
    expect(step.steps[0].error).toBeDefined();
  });

  test.each(['passed', 'failed', 'timedOut', 'interrupted', 'skipped'])(
    'preserves %s result and suppresses string/Buffer output',
    status => {
      const result = {
        status,
        duration: 10,
        retry: 1,
        errors: [{ message: 'synthetic-secret' }],
        stdout: ['synthetic-secret'],
        stderr: [Buffer.from('synthetic-secret')],
      };
      protectResult(result);
      expect(result).toMatchObject({ status, duration: 10, retry: 1, stdout: [], stderr: [] });
      expect(result.errors).toHaveLength(1);
      expect(JSON.stringify(result)).not.toContain('synthetic-secret');
    }
  );

  test('pins the installed failure insertion seam and guards suite assignments that bypass it', () => {
    expect(require('playwright/package.json').version).toBe('1.64.1');
    const worker = fs.readFileSync(
      path.join(path.dirname(require.resolve('playwright/package.json')), 'lib/worker/workerProcessEntry.js'),
      'utf8'
    );
    expect(worker).toContain('this.errors.push(serialized);');
    const root = path.resolve(__dirname, '../../../../playwright');
    for (const file of fs.readdirSync(root, { recursive: true }).filter(name => String(name).endsWith('.ts'))) {
      const source = fs.readFileSync(path.join(root, String(file)), 'utf8');
      expect(source).not.toMatch(/testInfo\.errors?\s*=/);
    }
  });
});
