import homeRoute from '../../../main/routes/home';

describe('home route', () => {
  test('renders the home view', () => {
    const get = jest.fn();
    const app = { get } as never;

    homeRoute(app);

    expect(get).toHaveBeenCalledWith('/', expect.any(Function));

    const handler = get.mock.calls[0][1];
    const render = jest.fn();

    handler({}, { render });

    expect(render).toHaveBeenCalledWith('home');
  });
});
