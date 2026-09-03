const { rmSync } = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';
const puppeteerCacheDir = path.join(projectRoot, '.cache', 'puppeteer');

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: {
      ...process.env,
      PUPPETEER_CACHE_DIR: puppeteerCacheDir,
    },
    shell: isWindows,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    return 1;
  }

  return result.status ?? 1;
}

rmSync(path.join(puppeteerCacheDir, 'chrome'), { recursive: true, force: true });

let testResult = run('yarn', ['puppeteer', 'browsers', 'install', 'chrome']);

if (testResult === 0) {
  testResult = run('jest', ['--detectOpenHandles', '-c', 'jest.a11y.config.js', '--maxWorkers', '15']);
}

process.exit(testResult);
