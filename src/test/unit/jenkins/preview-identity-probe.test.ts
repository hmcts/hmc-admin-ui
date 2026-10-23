import { EventEmitter } from 'node:events';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vm from 'node:vm';

const jenkinsfile = fs.readFileSync(path.resolve(__dirname, '../../../../Jenkinsfile_CNP'), 'utf8');
const inlineProbe = jenkinsfile.match(/node <<'DIAGNOSTIC_NODE'\n([\s\S]*?)\nDIAGNOSTIC_NODE/);
if (!inlineProbe) {
  throw new Error('Expected the Preview identity probe in Jenkinsfile_CNP');
}
const probeSource = inlineProbe[1].replace(/\\\\/g, '\\');

const source = 'a'.repeat(40);
const pullRequest = '731';
const uid = '12345678-abcd-abcd-abcd-123456789abc';
const digest = 'sha256:' + 'a'.repeat(64);
const pod = 'hmc-admin-ui-pr-731-abc';
const pods = `${pod}\t${uid}\n${pod}\t${uid}\thmc-admin-ui\thmctspublic.azurecr.io/hmc/admin-ui:pr-731\tcontainerd://${digest}\ttrue\n`;
const environment = {
  GIT_COMMIT: source,
  CHANGE_ID: pullRequest,
  CHANGE_BRANCH: 'test/EXUI-5429-preview-diagnostic-20261023',
  CHANGE_TARGET: 'test/EXUI-5429-retire-codecept',
  BRANCH_NAME: 'PR-' + pullRequest,
  AKS_TEST_URL: 'https://hmc-admin-ui-pr-' + pullRequest + '.preview.platform.hmcts.net',
  TEAM_NAMESPACE: 'hmc',
  AKS_CLUSTER_NAME: 'cft-preview-00-aks',
  AKS_RESOURCE_GROUP: 'cft-preview-00-rg',
};

type ProbeOptions = {
  failure?:
    | 'context'
    | 'checkout'
    | 'pods-query'
    | 'pods-validation'
    | 'info-transport'
    | 'info-transport-sync'
    | 'info-response-error'
    | 'info-status'
    | 'info-status-response-error'
    | 'info-size'
    | 'info-json'
    | 'info-identity'
    | 'info-null';
  environment?: Record<string, string>;
};

async function runProbe(
  options: ProbeOptions = {}
): Promise<{ output: string; stderr: string; exitCode: number | undefined }> {
  let output = '';
  let stderr = '';
  const process = {
    env: { ...environment, ...options.environment },
    stdout: {
      write: (value: string) => {
        output += value;
        return true;
      },
    },
    stderr: {
      write: (value: string) => {
        stderr += value;
        return true;
      },
    },
    exitCode: undefined as number | undefined,
  };
  const childProcess = {
    execFileSync(command: string) {
      if (options.failure === 'checkout' && command === 'git') {
        throw new Error('secret checkout stderr');
      }
      if (command === 'git') {
        return source;
      }
      if (command === 'kubectl') {
        if (options.failure === 'pods-query') {
          throw new Error('secret pod stderr');
        }
        return options.failure === 'pods-validation' ? 'invalid projection' : pods;
      }
      throw new Error('unexpected command');
    },
  };
  const https = {
    get(
      _url: string,
      _requestOptions: unknown,
      onResponse: (response: EventEmitter & Record<string, unknown>) => void
    ) {
      if (options.failure === 'info-transport-sync') {
        throw new Error('secret synchronous transport detail');
      }
      const request = new EventEmitter();
      queueMicrotask(() => {
        if (options.failure === 'info-transport') {
          request.emit('error', new Error('secret transport detail'));
          return;
        }
        const response = new EventEmitter() as EventEmitter & Record<string, unknown>;
        response.statusCode =
          options.failure === 'info-status' || options.failure === 'info-status-response-error' ? 503 : 200;
        response.resume = () => undefined;
        response.destroy = () => undefined;
        onResponse(response);
        if (options.failure === 'info-response-error' || options.failure === 'info-status-response-error') {
          response.emit('error', new Error('secret response stream detail'));
        } else if (options.failure === 'info-size') {
          response.emit('data', Buffer.alloc(65 * 1024, 'x'));
        } else if (options.failure === 'info-json') {
          response.emit('data', Buffer.from('{'));
        } else if (options.failure === 'info-null') {
          response.emit('data', Buffer.from('null'));
        } else {
          response.emit(
            'data',
            Buffer.from(
              JSON.stringify({ build: { commit: options.failure === 'info-identity' ? 'b'.repeat(40) : source } })
            )
          );
        }
        response.emit('end');
      });
      return request;
    },
  };
  const executable = probeSource.replace('main().then(receipt =>', 'globalThis.probePromise = main().then(receipt =>');
  const context = vm.createContext({
    process,
    Buffer,
    AbortSignal,
    require: (name: string) => {
      if (name === 'node:child_process') {
        return childProcess;
      }
      if (name === 'node:https') {
        return https;
      }
      throw new Error('unexpected module');
    },
  });
  vm.runInContext(executable, context);
  await context.probePromise;
  return { output, stderr, exitCode: process.exitCode };
}

describe('Preview identity probe diagnostics', () => {
  test.each([
    ['context', 'CONTEXT'],
    ['checkout', 'CHECKOUT'],
    ['pods-query', 'PODS_QUERY'],
    ['pods-validation', 'PODS_VALIDATE'],
    ['info-transport', 'INFO_TRANSPORT'],
    ['info-transport-sync', 'INFO_TRANSPORT'],
    ['info-response-error', 'INFO_TRANSPORT'],
    ['info-status', 'INFO_STATUS'],
    ['info-status-response-error', 'INFO_STATUS'],
    ['info-size', 'INFO_SIZE'],
    ['info-json', 'INFO_JSON'],
    ['info-identity', 'INFO_IDENTITY'],
    ['info-null', 'INFO_IDENTITY'],
  ] as const)('emits only the fixed %s failure code', async (failure, code) => {
    const result = await runProbe({
      failure,
      environment: failure === 'context' ? { AKS_CLUSTER_NAME: 'secret-cluster' } : undefined,
    });

    expect(result.output).toBe(`PROBE_FAILURE:${code}\n`);
    expect(result.output + result.stderr).not.toMatch(/secret|stderr|transport detail/);
    expect(result.exitCode).toBeUndefined();
  });

  test('returns the validated receipt only after all identity checks pass', async () => {
    const result = await runProbe();
    expect(result.output.startsWith('PROBE_OK:')).toBe(true);
    const receipt = JSON.parse(result.output.slice('PROBE_OK:'.length));
    expect(receipt.source).toBe(source);
    expect(receipt.release).toBe('hmc-admin-ui-pr-731');
    expect(receipt.app_pods).toHaveLength(1);
    expect(receipt.app_pods[0].imageID).toBe(digest);
  });

  test('defers identity rejection to the pre-native hook and gates the fault override', () => {
    const deployStart = jenkinsfile.indexOf("afterSuccess('akschartsinstall')");
    const functionalStart = jenkinsfile.indexOf("before('functionalTest:preview')", deployStart);
    const nativeGate = jenkinsfile.slice(
      functionalStart,
      jenkinsfile.indexOf("afterAlways('functionalTest:preview')", functionalStart)
    );
    const deployCallback = jenkinsfile.slice(deployStart, functionalStart);

    expect(deployCallback).toContain('diagnosticPreviewProbeFailure');
    expect(deployCallback).not.toContain("error('Preview identity probe failed");
    expect(nativeGate.indexOf('diagnosticPreviewProbeFailure')).toBeGreaterThanOrEqual(0);
    expect(nativeGate.indexOf('diagnosticPreviewProbeFailure')).toBeLessThan(
      nativeGate.indexOf("env.IDAM_PUBLIC_URL = 'https://controlled-failure.invalid'")
    );
    expect(nativeGate).toContain('diagnosticPreviewReceiptTarget');
  });

  test('resets callback state for retry and rejects a scope mismatch before probing', () => {
    const deployStart = jenkinsfile.indexOf("afterSuccess('akschartsinstall')");
    const functionalStart = jenkinsfile.indexOf("before('functionalTest:preview')", deployStart);
    const deployCallback = jenkinsfile.slice(deployStart, functionalStart);
    const resetFailure = deployCallback.indexOf('diagnosticPreviewProbeFailure = null');
    const resetReceipt = deployCallback.indexOf('diagnosticPreviewReceiptTarget = null');
    const contextGuard = deployCallback.indexOf("error('Diagnostic deployment/source/profile mismatch')");
    const probeExecution = deployCallback.indexOf("label: 'Read scoped Preview identity'");

    expect(resetFailure).toBeGreaterThanOrEqual(0);
    expect(resetReceipt).toBeGreaterThanOrEqual(0);
    expect(resetFailure).toBeLessThan(contextGuard);
    expect(resetReceipt).toBeLessThan(contextGuard);
    expect(contextGuard).toBeLessThan(probeExecution);
    expect(deployCallback).toContain("error('Diagnostic deployment/source/profile mismatch')");
  });

  test('validates the exact sanitized receipt schema before writing or archiving it', () => {
    const deployStart = jenkinsfile.indexOf("afterSuccess('akschartsinstall')");
    const functionalStart = jenkinsfile.indexOf("before('functionalTest:preview')", deployStart);
    const deployCallback = jenkinsfile.slice(deployStart, functionalStart);
    const successStart = deployCallback.indexOf("startsWith('PROBE_OK:')");
    const successBranch = deployCallback.slice(successStart);
    const validate = successBranch.indexOf('receiptValid');
    const write = successBranch.indexOf('writeFile(file:');
    const archive = successBranch.indexOf('archiveArtifacts(');

    expect(successBranch).toContain('new groovy.json.JsonSlurperClassic().parseText');
    expect(successBranch).toContain("diagnosticPreviewProbeFailure = 'RECEIPT'");
    expect(validate).toBeGreaterThanOrEqual(0);
    expect(validate).toBeLessThan(write);
    expect(write).toBeLessThan(archive);
    expect(successBranch).toContain(
      "def receiptKeys = ['observed_utc', 'source', 'target', 'namespace', 'release', 'cluster', 'resource_group', 'build', 'app_pods'] as Set"
    );
    expect(successBranch).toContain("def buildKeys = ['commit', 'version', 'number', 'date'] as Set");
    expect(successBranch).toContain("def podKeys = ['pod', 'uid', 'container', 'repository', 'imageID'] as Set");
    expect(successBranch).toContain('appPods instanceof List && !appPods.isEmpty()');
    expect(successBranch).toContain('app.repository == "hmc/admin-ui:pr-${diagnosticPullRequest}"');
    expect(successBranch).toContain('build.commit == diagnosticPreviewSource');
    expect(successBranch).toContain('receipt.target == diagnosticPreviewTarget');
    expect(successBranch).toContain("receipt.namespace == 'hmc'");
    expect(successBranch).toContain("receipt.cluster == 'cft-preview-00-aks'");
    expect(successBranch).toContain("receipt.resource_group == 'cft-preview-00-rg'");
    expect(successBranch).toContain('groovy.json.JsonOutput.toJson(receipt)');
  });
});
