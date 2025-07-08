import 'jest-preset-angular/setup-jest';

// Optionally add global mocks here, e.g.:
Object.defineProperty(window, 'CSS', { value: null });
Object.defineProperty(document, 'doctype', {
  value: '<!DOCTYPE html>',
});
