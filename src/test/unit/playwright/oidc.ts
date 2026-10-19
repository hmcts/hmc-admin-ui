import { isExpectedIdamOrigin } from '../../../../playwright/functional/oidc';

describe('isExpectedIdamOrigin', () => {
  test('accepts the configured IDAM public origin and an OIDC path', () => {
    expect(
      isExpectedIdamOrigin(
        'https://hmcts-access.aat.platform.hmcts.net/o/login',
        'https://hmcts-access.aat.platform.hmcts.net'
      )
    ).toBe(true);
  });

  test('rejects a lookalike origin', () => {
    expect(
      isExpectedIdamOrigin(
        'https://hmcts-access.aat.platform.hmcts.net.example.test/o/login',
        'https://hmcts-access.aat.platform.hmcts.net'
      )
    ).toBe(false);
  });

  test('uses IDAM_PUBLIC_URL when the deployed environment overrides the default', () => {
    const originalIdamPublicUrl = process.env.IDAM_PUBLIC_URL;
    process.env.IDAM_PUBLIC_URL = 'https://hmcts-access.preview.platform.hmcts.net';

    try {
      expect(isExpectedIdamOrigin('https://hmcts-access.preview.platform.hmcts.net/o/login')).toBe(true);
    } finally {
      if (originalIdamPublicUrl === undefined) {
        delete process.env.IDAM_PUBLIC_URL;
      } else {
        process.env.IDAM_PUBLIC_URL = originalIdamPublicUrl;
      }
    }
  });
});
