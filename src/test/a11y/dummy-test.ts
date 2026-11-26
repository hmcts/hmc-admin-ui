describe('Fake test to work around an issue', () => {
  it('does nothing', async () => {
    // See https://github.com/facebook/jest/issues/5783#issuecomment-450626450
    expect(true).toBe(true);
  });
});
