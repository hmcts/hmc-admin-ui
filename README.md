# HMC ADMIN UI

## Overview

hmc-admin-ui is an HMCTS administrative web application. It is a Node.js and
TypeScript service that renders the user interface with Nunjucks and serves
frontend assets built by Webpack.

The application includes:

- Server-side routes and views in src/main/.
- Webpack-built JavaScript and CSS assets in src/main/public/.
- Environment-specific configuration in config/.
- OIDC and session handling for authentication.
- Service-to-service authentication for downstream HMCTS services.
- Redis-backed session support when enabled.
- CSRF protection and security headers.
- Jest, route, accessibility, smoke and functional test entry points.

The local application listens on port 3000 by default.

## Prerequisites

- Node.js 24.18.0, as specified by .nvmrc and package.json.
- Yarn 4.15.0, managed through Corepack.
- Docker, if you want to use the container workflow.
- Access to the HMCTS VPN and approved environment credentials when calling
  shared HMCTS services.
- Git Bash or WSL on Windows. Several scripts use POSIX-style environment
  variable syntax.

Enable Corepack and install the dependencies:

    corepack enable
    yarn install

## Configuration

Configuration is loaded by the Node config package. The repository contains
default, development, production and test configuration files in config/.
Secret values can be supplied through the configured properties-volume
mechanism and environment-specific deployment configuration.

Do not commit passwords, client secrets, session secrets, S2S secrets,
instrumentation keys or other live credentials. Use the approved local secret
process for the target environment.

Before connecting to shared services, confirm that the selected configuration
contains valid values for:

- IDAM client and service URLs.
- OIDC client credentials and callback settings.
- The application session secret.
- S2S service URL, microservice name and secret.
- Redis settings when Redis-backed sessions are enabled.
- HMC service endpoints.

## Build the application

Create a development build:

    yarn build

This runs Webpack using webpack.config.js and writes the generated frontend
assets to src/main/public/.

Create a production build:

    yarn build:prod

The production build sets NODE_ENV=production, enables Webpack production mode
and emits hashed asset filenames.

## Run locally

Development mode

Start the application with Nodemon so that server changes are reloaded:

    yarn start:dev

Open the application at:

    http://localhost:3000

Production-style mode

Start the compiled application with production configuration:

    yarn start

Demo-style local mode

Build the production assets and start the application using the local demo
configuration:

    yarn start:demo

The demo-style configuration must contain valid values for any external
services used by the selected user journey.

## Run with Docker

Build the container image:

    docker compose build

Start the application:

    docker compose up

The compose configuration maps the application to port 3000. Verify that it
is available at:

    http://localhost:3000

Stop the containers with Ctrl+C, or use the normal Docker Compose command for
the running project.

## Code quality

The repository uses ESLint, Stylelint and Prettier.

Run all lint checks:

    yarn lint

Apply the available automatic fixes:

    yarn lint:fix

The automatic-fix command runs Prettier and ESLint fixes. It does not apply
Stylelint fixes automatically; review any Stylelint findings separately.

## Tests

Unit tests

    yarn test:unit

The default test command is an alias for the unit-test suite:

    yarn test

Route tests

    yarn test:routes

Accessibility tests

    yarn test:a11y

Keep the route coverage and accessibility checks aligned with every new or
changed application path. The accessibility test entry point is configured in
src/test/a11y/a11y.ts.

Smoke tests

Run smoke tests against a local or deployed target by setting TEST_URL:

    TEST_URL=http://localhost:3000 yarn test:smoke

Functional tests

The repository retains these functional-test commands for compatibility:

    yarn test:functional
    yarn test:functional:local

At present, test:functional reports that functional tests are temporarily
disabled. test:functional:local sets FUNCTIONAL_TEST_AUTH_ENABLED=false and
targets http://localhost:3000, but it delegates to the same disabled command.
Confirm the functional-test implementation before treating these commands as
a release gate.

Run the main local CI checks:

    yarn cichecks

This installs immutable dependencies, builds the application, rebuilds
Puppeteer, runs lint, unit tests, route tests and accessibility tests.

## Health checks

The application exposes a health endpoint at:

    http://localhost:3000/health

The endpoint is implemented with the HMCTS Node.js health-check library in
src/main/routes/health.ts. It includes a readiness shutdown check and the
configured Redis check when Redis is enabled.

A healthy HTTP response confirms that the application can answer the health
request. It does not by itself confirm that every downstream service or user
journey is available.

After starting or deploying the service:

1. Check /health.
2. Check application logs for configuration or connection errors.
3. Test the login journey when OIDC is enabled.
4. Test the main administrative journey affected by the change.
5. Check downstream service health and telemetry when a journey fails.

## Security controls

CSRF protection

Cross-Site Request Forgery protection is enabled at application level. Every
HTML form that requires protection must include the CSRF token using the
csrfProtection macro from src/main/views/macros/csrf.njk:

    {% from "macros/csrf.njk" import csrfProtection %}
    <form ...>
      {{ csrfProtection(csrfToken) }}
    </form>

Helmet

Helmet adds security-related HTTP headers. The application configures, among
others:

- Referrer-Policy.
- Content-Security-Policy.

Review the security section of config/default.json and the environment-specific
configuration before changing these headers. A change can affect authentication,
embedded resources, external services or browser behaviour.

Authentication and sessions

OIDC, session cookies, application secrets, S2S credentials and Redis-backed
session storage are environment-sensitive. Never use production credentials
for local testing and never place live secrets in source control.

## Troubleshooting

Application does not start

- Check that Node.js and Yarn match .nvmrc and package.json.
- Run corepack enable and yarn install.
- Check the active configuration and required secret values.
- Look for port 3000 conflicts.

Port 3000 is already in use

- Stop the conflicting process, or set PORT to an approved alternative before
  starting the server.
- Update the browser URL and any test TEST_URL value to match the new port.

Health check is unhealthy

- Check the application logs.
- If Redis is enabled, verify the Redis connection string and network access.
- Check the readiness shutdown state during planned shutdowns or restarts.

Login or callback fails

- Check the IDAM URL, client ID, client secret and callback configuration.
- Confirm that the browser is using the expected environment.
- Clear stale local cookies and restart the application if required.
- Check VPN access for internal HMCTS services.

Form submission is rejected

- Confirm that the form includes the CSRF token.
- Check Content-Security-Policy and Referrer-Policy changes.
- Review the server log for the request and correlation information.

Tests fail before execution

- Confirm that the application target in TEST_URL is running and reachable.
- Install the required browser dependencies for the accessibility or smoke
  suite.
- Check that test credentials are loaded through the approved local process.

## Development workflow

1. Create a focused branch for the change.
2. Install dependencies with yarn install.
3. Run the application locally with yarn start:dev.
4. Run the relevant unit, route, accessibility and smoke tests.
5. Run yarn lint and review all changed files.
6. Run yarn cichecks before opening a pull request when practical.
7. Confirm that no credentials, generated assets or sensitive test output are
   included in the change.

## UK English and user-facing text

Use UK English in user-facing copy, support responses, tests and operational
documentation. Preferred examples include:

    authorise / authorisation
    behaviour
    colour
    customise / customisation
    licence (noun) / license (verb)
    prioritise
    programme, when the meaning is not a software program

Keep technical identifiers, package names, API fields, HTTP headers, route
names and external service names unchanged. For example, Authorization may be
an API header even when surrounding explanatory text uses authorisation.

## Licence

This project is licensed under the MIT Licence. See LICENSE for the full
licence text.
