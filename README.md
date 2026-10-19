# hmc-admin-ui

## Getting Started

### Prerequisites

Running the application requires the following tools to be installed in your environment:

- [Node.js](https://nodejs.org/) v24.18.0, as specified in [.nvmrc](.nvmrc)
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

Start the application against demo-style local configuration:

```bash
yarn start:demo
```

### Running with Docker

Build the Docker image:

```bash
docker compose build
```

Run the application:

```bash
docker compose up
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

Run the native Playwright functional test against an OIDC-enabled deployed environment:

```bash
TEST_URL=https://your-environment.example TEST_IDAM_USERNAME=... TEST_IDAM_PASSWORD=... yarn test:functional
```

This command requires a non-local `TEST_URL` and the IDAM credentials. It fails when either is absent, when zero tests are selected, or when the JUnit/Odhín reports are missing. CNP supplies the credentials from Key Vault. Functional evidence is written beneath `functional-output/tests/playwright-functional/`.

Run the native Playwright accessibility test against an OIDC-enabled deployed environment:

```bash
TEST_URL=https://your-environment.example TEST_IDAM_USERNAME=... TEST_IDAM_PASSWORD=... yarn test:accessibility:playwright
```

This command uses the same OIDC prerequisites as the functional lane and writes Axe WCAG 2.2 AA evidence beneath `functional-output/tests/playwright-accessibility/`. CNP runs this report-only pack on its manual/nightly accessibility paths.

Run the deterministic local functional checks with authentication disabled:

```bash
yarn test:functional:local
```

This command starts the application with `AUTH_ENABLED=false` and runs the local functional journeys. Its JUnit and Odhín evidence is written beneath `functional-output/tests/playwright-functional/`. It proves local UI rendering only; it does not prove OIDC, roles, or Hearing Service calls.

Run the deterministic local accessibility checks with authentication disabled:

```bash
yarn test:accessibility:local
```

This command starts the application with `AUTH_ENABLED=false`, runs the local Axe WCAG 2.2 AA checks, and writes JUnit/Odhín output beneath `functional-output/tests/playwright-accessibility/`. Each accessibility audit persists JSON, HTML summary, and screenshot evidence in the accessibility output; CI archives these files with the published report. Legacy Codecept files remain as migration evidence until EXUI-5429 retires them.

Run the main local CI checks:

```bash
yarn cichecks
```

### Security

#### CSRF prevention

[Cross-Site Request Forgery](https://github.com/pillarjs/understanding-csrf) prevention is set up at the
application level. Make sure the CSRF token is present in every HTML form that requires it. Use the
`csrfProtection` macro from [csrf.njk](src/main/views/macros/csrf.njk):

```njk
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

Configuration lives in [default.json](config/default.json), for example:

```json
"security": {
  "referrerPolicy": "same-origin"
}
```

Make sure you have those values set correctly for your application.

### Healthcheck

The application exposes a health endpoint (http://localhost:3000/health), created with the use of
[Nodejs Healthcheck](https://github.com/hmcts/nodejs-healthcheck) library. This endpoint is defined
in [health.ts](src/main/routes/health.ts). It currently includes a readiness shutdown check and a basic
sample check; replace the sample check with dependency-specific checks when adding external service health
requirements.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
