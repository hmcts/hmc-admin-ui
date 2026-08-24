# hmc-admin-ui

## Getting Started

### Prerequisites

Running the application requires the following tools to be installed in your environment:

- [Node.js](https://nodejs.org/) v20.20.2, as specified in [.nvmrc](.nvmrc)
- [Yarn](https://yarnpkg.com/) v4.15.0, managed by Corepack
- [Docker](https://www.docker.com)

Enable Corepack before installing dependencies:

```bash
corepack enable
```

Install dependencies:

```bash
yarn install
```

### Building the application

Create a development build of the frontend assets:

```bash
yarn build
```

This runs Webpack using [webpack.config.js](webpack.config.js). The generated JavaScript and CSS assets are written to
`src/main/public`.

Create a production build:

```bash
yarn build:prod
```

The production build sets `NODE_ENV=production`, runs Webpack in production mode, and emits hashed asset filenames.

### Running the application locally

Start the application in development mode with Nodemon:

```bash
yarn start:dev
```

Start the application in production mode:

```bash
yarn start
```

The application's home page will be available at http://localhost:3000.

### Running with Docker

Create docker image:

```bash
docker-compose build
```

Run the application by executing the following command:

```bash
docker-compose up
```

This will start the frontend container exposing the application's port, `3000`.

In order to test if the application is up, you can visit http://localhost:3000 in your browser.

## Developing

### Code style

We use [ESLint](https://github.com/typescript-eslint/typescript-eslint)
alongside [Stylelint](https://stylelint.io/) and [Prettier](https://prettier.io/).

Run all lint checks:

```bash
yarn lint
```

Running the linting with auto fix:

```bash
yarn lint:fix
```

`yarn lint:fix` runs Prettier across the project and then applies ESLint auto-fixes. It does not run Stylelint fixes.

### Running the tests

This application uses [Jest](https://jestjs.io/) as the test engine. Run unit tests:

```bash
yarn test:unit
```

Run route tests:

```bash
yarn test:routes
```

Running accessibility tests:

```bash
yarn test:a11y
```

Make sure all the paths in your application are covered by accessibility tests (see [a11y.ts](src/test/a11y/a11y.ts)).

Run smoke tests against a deployed or locally running application:

```bash
TEST_URL=http://localhost:3000 yarn test:smoke
```

Run functional tests with CodeceptJS and Playwright:

```bash
yarn test:functional
```

Run the main local CI checks:

```bash
yarn cichecks
```

### Security

#### CSRF prevention

[Cross-Site Request Forgery](https://github.com/pillarjs/understanding-csrf) prevention has already been
set up in this template, at the application level. However, you need to make sure that CSRF token
is present in every HTML form that requires it. For that purpose you can use the `csrfProtection` macro,
included in this template app. Your njk file would look like this:

```
{% from "macros/csrf.njk" import csrfProtection %}
...
<form ...>
  ...
    {{ csrfProtection(csrfToken) }}
  ...
</form>
...
```

#### Helmet

This application uses [Helmet](https://helmetjs.github.io/), which adds various security-related HTTP headers
to the responses. Apart from default Helmet functions, following headers are set:

- [Referrer-Policy](https://helmetjs.github.io/docs/referrer-policy/)
- [Content-Security-Policy](https://helmetjs.github.io/docs/csp/)

There is a configuration section related with those headers, where you can specify:

- `referrerPolicy` - value of the `Referrer-Policy` header

Here's an example setup:

```json
    "security": {
      "referrerPolicy": "origin",
    }
```

Make sure you have those values set correctly for your application.

### Healthcheck

The application exposes a health endpoint (http://localhost:3000/health), created with the use of
[Nodejs Healthcheck](https://github.com/hmcts/nodejs-healthcheck) library. This endpoint is defined
in [health.ts](src/main/routes/health.ts) file. Make sure you adjust it correctly in your application.
In particular, remember to replace the sample check with checks specific to your frontend app,
e.g. the ones verifying the state of each service it depends on.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
