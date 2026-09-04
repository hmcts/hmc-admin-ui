import { Application, Request, Response } from 'express';

import homeRoute from '../../../main/routes/home';

type RouteHandler = (req: Request, res: Response) => void;

describe('Home route', () => {
  let get: jest.Mock<void, [string, RouteHandler]>;
  let post: jest.Mock<void, [string, RouteHandler]>;
  let app: Application;

  beforeEach(() => {
    get = jest.fn<void, [string, RouteHandler]>();
    post = jest.fn<void, [string, RouteHandler]>();
    app = { get, post } as unknown as Application;

    homeRoute(app);
  });

  test('registers the home page route', () => {
    expect(get).toHaveBeenCalledWith('/', expect.any(Function));
  });

  test('renders the home page on GET', () => {
    const handler = get.mock.calls[0][1];
    const render = jest.fn();
    const res = { render } as unknown as Response;

    handler({} as Request, res);

    expect(render).toHaveBeenCalledWith('home');
  });

  test('registers the continue action route', () => {
    expect(post).toHaveBeenCalledWith('/', expect.any(Function));
  });

  test('redirects back to the home page on POST', () => {
    const handler = post.mock.calls[0][1];
    const redirect = jest.fn();
    const res = { redirect } as unknown as Response;

    handler({} as Request, res);

    expect(redirect).toHaveBeenCalledWith(303, '/');
  });
});
