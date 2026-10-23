const SAFE_FAILURE = 'Protected browser check failed; sensitive diagnostic values omitted.';

function safeError(location) {
  return { message: SAFE_FAILURE, ...(location ? { location } : {}) };
}

function protectErrors(errors, location) {
  errors.splice(0, errors.length, ...errors.map(() => safeError(location)));
  // Playwright 1.64.1 records failures via this public array, including late fixture teardown.
  errors.push = function (...items) {
    return Array.prototype.push.apply(
      this,
      items.map(() => safeError(location))
    );
  };
}

function protectStep(step) {
  step.title = step.category === 'expect' ? 'Protected assertion' : 'Protected browser operation';
  delete step.params;
  delete step.subtitle;
  delete step.annotations;
  if (step.error) step.error = safeError(step.location);
  for (const child of step.steps ?? []) protectStep(child);
}

function protectResult(result, location) {
  result.errors = (result.errors ?? []).map(() => safeError(location));
  if (result.error) result.error = safeError(location);
  result.stdout = [];
  result.stderr = [];
  for (const step of result.steps ?? []) protectStep(step);
}

module.exports = { safeError, protectErrors, protectStep, protectResult };
