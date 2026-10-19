import { openHomePage } from '../../../../playwright/functional/home';

describe('openHomePage', () => {
  test('uses the legacy English-language home route', async () => {
    const goto = jest.fn().mockResolvedValue(undefined);

    await openHomePage({ goto });

    expect(goto).toHaveBeenCalledWith('/?lng=en');
  });
});
