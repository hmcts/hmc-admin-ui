const odhinModule = require('odhin-reports-playwright');

const { normalizeOdhinReportFilename } = require('./odhin-filename.cjs');

const OdhinReporter = odhinModule.default ?? odhinModule;

class HmcOdhinAdaptiveReporter {
  constructor(options = {}) {
    // Keep evidence beside the published report so a failing browser run cannot exceed V8's embedded-string limit.
    this.inner = new OdhinReporter({
      embedAttachments: false,
      ...options,
      indexFilename: normalizeOdhinReportFilename(options.indexFilename),
    });
  }

  onBegin(...args) {
    return this.inner.onBegin?.(...args);
  }

  onTestBegin(...args) {
    return this.inner.onTestBegin?.(...args);
  }

  onTestEnd(...args) {
    return this.inner.onTestEnd?.(...args);
  }

  onStdOut(...args) {
    return this.inner.onStdOut?.(...args);
  }

  onStdErr(...args) {
    return this.inner.onStdErr?.(...args);
  }

  onError(...args) {
    return this.inner.onError?.(...args);
  }

  onEnd(...args) {
    return this.inner.onEnd?.(...args);
  }
}

module.exports = HmcOdhinAdaptiveReporter;
