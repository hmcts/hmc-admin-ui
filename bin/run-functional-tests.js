const { spawnSync } = require('child_process');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: process.env,
    shell: isWindows,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(result.error.message);
    return 1;
  }

  return result.status ?? 1;
}

let testResult = run('yarn', ['playwright', 'install']);

if (testResult === 0) {
  testResult = run('codeceptjs', ['run', '--steps']);
}

const reportResult = run('node', ['bin/generate-functional-test-report.js']);

process.exit(testResult === 0 ? reportResult : testResult);
