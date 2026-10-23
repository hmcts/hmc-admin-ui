const { safeError, protectStep, protectResult } = require('./protected-evidence.cjs');

const odhinModule = require('odhin-reports-playwright');

const { normalizeOdhinReportFilename } = require('./odhin-filename.cjs');
const { createEmptyFeatureStat, deriveFeatureName, enhanceGeneratedReport } = require('./odhin-report-enhancer.cjs');

const OdhinReporter = odhinModule.default ?? odhinModule;
const terminalStatusesNoRetry = ['passed', 'flaky', 'skipped', 'interrupted'];

class HmcOdhinAdaptiveReporter {
  constructor(options = {}) {
    // Keep evidence beside the published report so a failing browser run cannot exceed V8's embedded-string limit.
    this.inner = new OdhinReporter({
      embedAttachments: false,
      ...options,
      indexFilename: normalizeOdhinReportFilename(options.indexFilename),
    });
    this.outputFolder = options.outputFolder;
    this.featureStats = new Map();
    this.testMetadata = [];
    this.pendingInnerCallbacks = Promise.resolve();
  }

  onBegin(...args) {
    return this.inner.onBegin?.(...args);
  }

  onTestBegin(...args) {
    return this.inner.onTestBegin?.(...args);
  }

  onTestEnd(...args) {
    const [test, result] = args;
    protectResult(result, test?.location);
    this.testMetadata.push({
      target: `#${test?.id}-${result?.retry ?? 0}`,
      feature: deriveFeatureName(test?.location?.file, test?.tags),
      tags: test?.tags ?? [],
      durationMs: result?.duration ?? 0,
      retry: result?.retry ?? 0,
    });
    this.recordFeatureStat(args[0], args[1]);
    this.enqueueInnerCallback(() => this.inner.onTestEnd?.(...args));
  }

  onStdOut() {}

  onStdErr() {}

  onStepBegin(test, result, step) {
    protectStep(step);
  }

  onStepEnd(test, result, step) {
    protectStep(step);
  }

  onError(error) {
    const projected = safeError();
    for (const key of Object.getOwnPropertyNames(error)) delete error[key];
    Object.assign(error, projected);
    return this.inner.onError?.(error);
  }

  onEnd(...args) {
    return this.flushInnerCallbacks()
      .then(() => this.inner.onEnd?.(...args))
      .then(() => {
        try {
          enhanceGeneratedReport(this.outputFolder, this.featureStats, this.testMetadata);
        } catch {
          process.stderr.write('[odhin] report enhancement failed; diagnostic values omitted.\n');
        }
      });
  }

  enqueueInnerCallback(invoke) {
    const run = () =>
      Promise.resolve()
        .then(invoke)
        .catch(() => {
          process.stderr.write('[odhin] inner reporter callback failed; diagnostic values omitted.\n');
        });
    this.pendingInnerCallbacks = this.pendingInnerCallbacks.then(run, run);
  }

  flushInnerCallbacks() {
    return this.pendingInnerCallbacks;
  }

  recordFeatureStat(test, result) {
    const finalStatus = normalizeFinalStatus(result?.status, result?.retry);
    if (!isFinalResult(finalStatus, result?.retry, test?.retries)) {
      return;
    }

    const featureName = deriveFeatureName(test?.location?.file, test?.tags);
    const current = this.featureStats.get(featureName) ?? createEmptyFeatureStat(featureName);
    current.totalTests += 1;
    current.durationMs += Number(result?.duration ?? 0);

    switch (finalStatus) {
      case 'passed':
        current.passed += 1;
        break;
      case 'failed':
        current.failed += 1;
        break;
      case 'timedOut':
        current.timedOut += 1;
        break;
      case 'skipped':
        current.skipped += 1;
        break;
      case 'interrupted':
        current.interrupted += 1;
        break;
      case 'flaky':
        current.flaky += 1;
        break;
      default:
        current.interrupted += 1;
        break;
    }

    this.featureStats.set(featureName, current);
  }
}

function normalizeFinalStatus(status, retry) {
  return status === 'passed' && Number(retry ?? 0) > 0 ? 'flaky' : status;
}

function isFinalResult(status, retry, retries) {
  return terminalStatusesNoRetry.includes(status) || Number(retry ?? 0) === Number(retries ?? 0);
}

module.exports = HmcOdhinAdaptiveReporter;
