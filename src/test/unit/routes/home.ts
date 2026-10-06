import { Application, Request, Response } from 'express';

import homeRoute from '../../../main/routes/home';

type RouteHandler = (req: Request, res: Response) => void | Promise<void>;
type RegisteredRoute = [string, ...unknown[]];

describe('Home route', () => {
  let get: jest.Mock<void, RegisteredRoute>;
  let post: jest.Mock<void, RegisteredRoute>;
  let app: Application;

  beforeEach(() => {
    get = jest.fn<void, RegisteredRoute>();
    post = jest.fn<void, RegisteredRoute>();
    app = { get, post } as unknown as Application;

    homeRoute(app);
  });

  test('registers the home page route', () => {
    expect(get).toHaveBeenCalledWith('/', expect.any(Function));
  });

  test('renders the home page on GET', () => {
    const handler = get.mock.calls[0][1] as RouteHandler;
    const render = jest.fn();
    const res = { render } as unknown as Response;

    handler({} as Request, res);

    expect(render).toHaveBeenCalledWith('home');
  });

  test('registers the continue action route', () => {
    expect(post).toHaveBeenCalledWith('/', expect.any(Function));
  });

  test('redirects back to the home page when no request type is selected on POST', () => {
    const handler = post.mock.calls[0][1] as RouteHandler;
    const redirect = jest.fn();
    const res = { redirect } as unknown as Response;

    handler({ body: {} } as Request, res);

    expect(redirect).toHaveBeenCalledWith(303, '/');
  });

  test('redirects bulk requests to the bulk upload page on POST', () => {
    const handler = post.mock.calls[0][1] as RouteHandler;
    const redirect = jest.fn();
    const res = { redirect } as unknown as Response;

    handler({ body: { requestType: 'bulk' } } as Request, res);

    expect(redirect).toHaveBeenCalledWith(303, '/bulk-upload');
  });

  test('redirects singular requests to the singular request type page on POST', () => {
    const handler = post.mock.calls[0][1] as RouteHandler;
    const redirect = jest.fn();
    const res = { redirect } as unknown as Response;

    handler({ body: { requestType: 'singular' } } as Request, res);

    expect(redirect).toHaveBeenCalledWith(303, '/singular');
  });
});
