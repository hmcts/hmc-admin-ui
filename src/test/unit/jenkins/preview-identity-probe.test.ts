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
const lastCommitTimestamp = '20261023123456';
const repository = `hmc/admin-ui:pr-${pullRequest}-${source.slice(0, 7)}-${lastCommitTimestamp}`;
const image = `hmctspublic.azurecr.io/${repository}`;
const podHeader = `${pod}\t${uid}\n`;
const appSpec = `${pod}\t${uid}\thmc-admin-ui\t${image}\n`;
const appStatus = `${pod}\t${uid}\thmc-admin-ui\t${image}\tcontainerd://${digest}\ttrue\n`;
const pods = podHeader + appSpec + appStatus;
const environment = {
  GIT_COMMIT: source,
  LAST_COMMIT_TIMESTAMP: lastCommitTimestamp + '\n',
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
  image?: string;
  podOutput?: string;
  infoCommit?: string;
};

async function runProbe(options: ProbeOptions = {}): Promise<{
  output: string;
  stderr: string;
  exitCode: number | undefined;
  commands: { command: string; args: string[] }[];
  targets: string[];
}> {
  let output = '';
  let stderr = '';
  const commands: { command: string; args: string[] }[] = [];
  const targets: string[] = [];
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
    execFileSync(command: string, args: string[]) {
      commands.push({ command, args });
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
        return options.failure === 'pods-validation'
          ? 'invalid projection'
          : options.podOutput ?? pods.split(image).join(options.image ?? image);
      }
      throw new Error('unexpected command');
    },
  };
  const https = {
    get(url: string, _requestOptions: unknown, onResponse: (response: EventEmitter & Record<string, unknown>) => void) {
      targets.push(url);
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
              JSON.stringify({
                build: {
                  commit: options.infoCommit ?? (options.failure === 'info-identity' ? 'b'.repeat(40) : source),
                },
              })
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
  return { output, stderr, exitCode: process.exitCode, commands, targets };
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
    expect(receipt).toEqual({
      observed_utc: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      source,
      target: environment.AKS_TEST_URL,
      namespace: 'hmc',
      release: 'hmc-admin-ui-pr-731',
      cluster: 'cft-preview-00-aks',
      resource_group: 'cft-preview-00-rg',
      build: { commit: source, version: null, number: null, date: null },
      app_pods: [{ pod, uid, container: 'hmc-admin-ui', repository, imageID: digest }],
    });
    expect(result.commands).toEqual([
      { command: 'git', args: ['rev-parse', 'HEAD'] },
      {
        command: 'kubectl',
        args: [
          'get',
          'pods',
          '--namespace',
          'hmc',
          '--selector',
          'app.kubernetes.io/instance=hmc-admin-ui-pr-731,!job-name',
          '--request-timeout=20s',
          '-o',
          expect.stringMatching(/^go-template=/),
        ],
      },
    ]);
    const projection = result.commands[1].args[8];
    for (const field of [
      '.metadata.name',
      '.metadata.uid',
      '.spec.containers',
      '.status.containerStatuses',
      '.image',
      '.imageID',
      '.ready',
    ]) {
      expect(projection).toContain(field);
    }
    expect(result.targets).toEqual([environment.AKS_TEST_URL + '/info']);
  });

  test.each([
    ['bare mutable tag', `hmctspublic.azurecr.io/hmc/admin-ui:pr-${pullRequest}`],
    ['wrong PR', image.replace('pr-731-', 'pr-732-')],
    ['wrong source SHA', image.replace(source.slice(0, 7), 'bbbbbbb')],
    ['wrong timestamp', image.replace(lastCommitTimestamp, '20261022123456')],
  ])('rejects an image with %s before requesting build identity', async (_description, wrongImage) => {
    const result = await runProbe({ image: wrongImage });

    expect(result.output).toBe('PROBE_FAILURE:PODS_VALIDATE\n');
    expect(result.targets).toEqual([]);
  });

  test.each(['', '20261023', '2026102312345x', '20261023\n123456'])(
    'rejects invalid build timestamp %j before querying pods',
    async value => {
      const result = await runProbe({ environment: { LAST_COMMIT_TIMESTAMP: value } });

      expect(result.output).toBe('PROBE_FAILURE:CONTEXT\n');
      expect(result.commands).toEqual([]);
      expect(result.targets).toEqual([]);
    }
  );

  test('rejects a stale full build commit even when its image tag has the expected short SHA', async () => {
    const result = await runProbe({ infoCommit: source.slice(0, 7) + 'b'.repeat(33) });

    expect(result.output).toBe('PROBE_FAILURE:INFO_IDENTITY\n');
    expect(result.targets).toEqual([environment.AKS_TEST_URL + '/info']);
  });

  test.each([
    ['unready app', pods.replace('\ttrue\n', '\tfalse\n')],
    ['missing app spec', podHeader + appStatus],
    ['missing app status', podHeader + appSpec],
    ['duplicate spec container name', podHeader + appSpec + appSpec + appStatus],
    ['duplicate status container name', pods + appStatus],
    ['status for a different container', podHeader + appSpec + appStatus.replace('hmc-admin-ui\t', 'sidecar\t')],
    ['status image differs from spec', podHeader + appSpec + appStatus.replace(lastCommitTimestamp, '20261022123456')],
    ['two app containers', pods + appSpec.replace('hmc-admin-ui\t', 'another-app\t')],
    [
      'mixed image digests',
      pods +
        pods
          .split(pod)
          .join(pod + '-other')
          .replace(digest, 'sha256:' + 'b'.repeat(64)),
    ],
  ])('rejects %s', async (_description, podOutput) => {
    const result = await runProbe({ podOutput });

    expect(result.output).toBe('PROBE_FAILURE:PODS_VALIDATE\n');
    expect(result.targets).toEqual([]);
  });

  test('joins the app status by name when status order differs from the pod spec', async () => {
    const sidecarSpec = `${pod}\t${uid}\tsidecar\texample.invalid/sidecar:1\n`;
    const sidecarStatus = `${pod}\t${uid}\tsidecar\texample.invalid/sidecar:1\tcontainerd://sha256:${'b'.repeat(
      64
    )}\ttrue\n`;
    const result = await runProbe({ podOutput: podHeader + appSpec + sidecarSpec + sidecarStatus + appStatus });

    expect(result.output.startsWith('PROBE_OK:')).toBe(true);
    const receipt = JSON.parse(result.output.slice('PROBE_OK:'.length));
    expect(receipt.app_pods).toHaveLength(1);
    expect(receipt.app_pods[0].container).toBe('hmc-admin-ui');
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
    expect(nativeGate).toContain('echo("Preview identity probe phase: ${diagnosticPreviewProbeFailure}")');
    expect(nativeGate.indexOf('echo(')).toBeLessThan(nativeGate.indexOf('error('));
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

  test('keeps receipt parsing, identity rejection, and artifact errors distinguishable', () => {
    const deployStart = jenkinsfile.indexOf("afterSuccess('akschartsinstall')");
    const functionalStart = jenkinsfile.indexOf("before('functionalTest:preview')", deployStart);
    const deployCallback = jenkinsfile.slice(deployStart, functionalStart);
    const successStart = deployCallback.indexOf("startsWith('PROBE_OK:')");
    const successBranch = deployCallback.slice(successStart);
    const nodeFailureBranch = deployCallback.slice(0, successStart);
    const parse = successBranch.indexOf(
      "steps.readJSON(text: probeOutput.substring('PROBE_OK:'.length()), returnPojo: true)"
    );
    const parseCatch = successBranch.indexOf("diagnosticPreviewProbeFailure = 'RECEIPT_PARSE'");
    const identityTry = successBranch.indexOf('receiptValid = receipt instanceof Map');
    const identityCatch = successBranch.indexOf("diagnosticPreviewProbeFailure = 'RECEIPT_IDENTITY'");
    const validate = successBranch.indexOf('receiptValid');
    const write = successBranch.indexOf('writeFile(file:');
    const archive = successBranch.indexOf('archiveArtifacts(');
    const artifactCatch = successBranch.indexOf("diagnosticPreviewProbeFailure = 'RECEIPT_ARTIFACT'");

    expect(nodeFailureBranch).toContain(
      "def allowedPhases = ['CONTEXT', 'CHECKOUT', 'PODS_QUERY', 'PODS_VALIDATE', 'INFO_TRANSPORT', 'INFO_STATUS', 'INFO_SIZE', 'INFO_JSON', 'INFO_IDENTITY', 'INTERNAL']"
    );
    expect(nodeFailureBranch).not.toContain('RECEIPT_PARSE');
    expect(nodeFailureBranch).not.toContain('RECEIPT_IDENTITY');
    expect(successBranch).not.toContain('JsonSlurperClassic');
    expect(parse).toBeGreaterThanOrEqual(0);
    expect(parseCatch).toBeGreaterThan(parse);
    expect(validate).toBeGreaterThanOrEqual(0);
    expect(parseCatch).toBeLessThan(validate);
    expect(identityTry).toBeGreaterThan(parseCatch);
    expect(identityCatch).toBeGreaterThan(identityTry);
    expect(validate).toBeLessThan(write);
    expect(write).toBeLessThan(archive);
    expect(successBranch).toContain("diagnosticPreviewProbeFailure = 'RECEIPT_IDENTITY'");
    expect(successBranch).toContain('appPods instanceof List && !appPods.isEmpty()');
    expect(successBranch).toContain('receipt.source == diagnosticPreviewSource');
    expect(successBranch).toContain('receipt.release == "hmc-admin-ui-pr-${diagnosticPullRequest}"');
    expect(successBranch).toContain('build.commit == diagnosticPreviewSource');
    expect(successBranch).toContain('receipt.target == diagnosticPreviewTarget');
    expect(successBranch).toContain("receipt.namespace == 'hmc'");
    expect(successBranch).toContain("receipt.cluster == 'cft-preview-00-aks'");
    expect(successBranch).toContain("receipt.resource_group == 'cft-preview-00-rg'");
    expect(successBranch).toContain('def receiptArtifact = [');
    expect(successBranch).toContain('app_pods: appPods.collect { app ->');
    for (const projectionField of [
      'observed_utc: receipt.observed_utc',
      'source: receipt.source',
      'target: receipt.target',
      'namespace: receipt.namespace',
      'release: receipt.release',
      'cluster: receipt.cluster',
      'resource_group: receipt.resource_group',
      'build: [commit: build.commit, version: build.version, number: build.number, date: build.date]',
      '[pod: app.pod, uid: app.uid, container: app.container, repository: app.repository, imageID: app.imageID]',
    ]) {
      expect(successBranch).toContain(projectionField);
    }
    expect(successBranch).toContain('groovy.json.JsonOutput.toJson(receiptArtifact)');
    expect(successBranch).not.toContain('groovy.json.JsonOutput.toJson(receipt)');
    expect(artifactCatch).toBeGreaterThan(archive);
    expect(successBranch).toContain('if (e instanceof org.jenkinsci.plugins.workflow.steps.FlowInterruptedException)');
  });
});
