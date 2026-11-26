# SonarQube remediation report — EXUI-5520

## Run identity

- Run mode: commit
- Target checkout: `/Users/anthony.dummer/WebstormProjects/hmc-admin-ui`
- Branch: `exui-5520-sonar-cloud-fixes`
- Revision at start: `04f92b3d8bb750adda6ce5168a556776f55d079f`
- Implementation commits: `fbe71e1`, `d16299b`, `701c2c7`, `f5edcc2`, `252cb74`, `2c668d8`, `0ae5efe`, `5bdbeeb`
- Sonar baseline: `master` at the same revision
- Sonar project: `hmc-admin-ui`
- Issue input: `/Users/anthony.dummer/Library/Application Support/JetBrains/WebStorm2026.1/scratches/sonar-issues.json`
- Snapshot: 21 open issues, page 1 of 1 (`pageSize=500`, `total=21`)
- Fresh Sonar analysis: not run
- Report: `sonar-remediation-report.md`

## Summary

All 21 reported findings have an implementation on the branch. Fourteen are logic/code-quality changes with no identified change to normal user-visible behavior. Seven are behavior-sensitive and are implemented but require heightened review:

- Redis health retry sequencing and health availability: issue 1.
- Bulk response status/message logic: issues 11–12.
- Singular form input normalization and validation behavior: issues 13–16.

Eight focused implementation commits have been created locally. The report is being committed separately. No remote push or pull request has been performed.

## Commit map

| Commit    | Scope                                          | Sonar issues                                                                                                        |
| --------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `fbe71e1` | Bound Redis health retries                     | `AaERiLlvbbMK4TlTD51Q`                                                                                              |
| `d16299b` | Remove redundant service-auth alias            | `AaERiLjjbbMK4TlTD51P`                                                                                              |
| `701c2c7` | Clean up bulk-route validation                 | `AaERiLmIbbMK4TlTD51R`, `AaERiLmIbbMK4TlTD51S`, `AaERiLmIbbMK4TlTD51T`, `AaERiLmIbbMK4TlTD51U`                      |
| `f5edcc2` | Name singular route registration               | `AaERiLoGbbMK4TlTD51V`                                                                                              |
| `252cb74` | Clean up home and info routes                  | `AaBiFbyR1iXn58QHKh9Q`, `AaBiFbyI1iXn58QHKh9N`, `AaBiFbyI1iXn58QHKh9O`, `AaBiFbyI1iXn58QHKh9P`                      |
| `2c668d8` | Simplify bulk-upload validation and CSV output | `AaERiLpmbbMK4TlTD51a`, `AaERiLpmbbMK4TlTD51b`, `AaERiLpbbMK4TlTD51c`, `AaERiLpbbMK4TlTD51d`, `AaERiLpbbMK4TlTD51e` |
| `0ae5efe` | Normalize singular form values                 | `AaERiLpJbbMK4TlTD51W`, `AaERiLpbbMK4TlTD51X`, `AaERiLpbbMK4TlTD51Y`, `AaERiLpbbMK4TlTD51Z`                         |
| `5bdbeeb` | Add assertion to accessibility dummy test      | `AaBiFbyb1iXn58QHKh9R`                                                                                              |

## Implemented issues

| Issue                                       | Impact class       | Location                                 | Change                                                                                                                 | Risk/status                                     |
| ------------------------------------------- | ------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `AaERiLlvbbMK4TlTD51Q` / `typescript:S9382` | External behavior  | `src/main/modules/redis-health/index.ts` | Replaced the retry loop with bounded async recursion, preserving three attempts and the 250ms delay.                   | Implemented; review health timing/availability. |
| `AaERiLjjbbMK4TlTD51P` / `typescript:S6564` | Logic/code quality | `src/main/modules/service-auth/index.ts` | Removed the redundant `LeaseResponse` alias and used `string` directly.                                                | Low risk.                                       |
| `AaERiLmIbbMK4TlTD51R` / `typescript:S7772` | Logic/code quality | `src/main/routes/bulk.ts`                | Changed the built-in `path` import to `node:path`.                                                                     | Low risk.                                       |
| `AaERiLmIbbMK4TlTD51S` / `typescript:S7776` | Logic/code quality | `src/main/routes/bulk.ts`                | Changed allowed CSV extensions to a `Set` and retained equivalent membership checks.                                   | Low risk.                                       |
| `AaERiLmIbbMK4TlTD51T` / `typescript:S7776` | Logic/code quality | `src/main/routes/bulk.ts`                | Changed allowed CSV MIME types to a `Set` and retained equivalent membership checks.                                   | Low risk.                                       |
| `AaERiLmIbbMK4TlTD51U` / `typescript:S7726` | Logic/code quality | `src/main/routes/bulk.ts`                | Named the default route registration function.                                                                         | Low risk.                                       |
| `AaERiLoGbbMK4TlTD51V` / `typescript:S7726` | Logic/code quality | `src/main/routes/singular.ts`            | Named the default route registration function.                                                                         | Low risk.                                       |
| `AaERiLpmbbMK4TlTD51a` / `typescript:S7776` | Logic/code quality | `src/main/services/bulk-upload.ts`       | Changed valid actions to a `Set` and retained equivalent membership checks.                                            | Low risk.                                       |
| `AaERiLpmbbMK4TlTD51b` / `typescript:S7776` | Logic/code quality | `src/main/services/bulk-upload.ts`       | Changed valid states to a `Set` and retained equivalent membership checks.                                             | Low risk.                                       |
| `AaERiLpbbMK4TlTD51c` / `typescript:S7760`  | Logic/code quality | `src/main/services/bulk-upload.ts`       | Used a default parameter in `csvEscape` while preserving empty output for `undefined`.                                 | Low risk.                                       |
| `AaERiLpbbMK4TlTD51d` / `typescript:S2301`  | External behavior  | `src/main/services/bulk-upload.ts`       | Inlined the equivalent validation/response branches instead of passing `isValid`.                                      | Implemented; review downloaded CSV output.      |
| `AaERiLpbbMK4TlTD51e` / `typescript:S2301`  | External behavior  | `src/main/services/bulk-upload.ts`       | Inlined the equivalent validation/message branches instead of passing `isValid`.                                       | Implemented; review downloaded CSV output.      |
| `AaERiLpJbbMK4TlTD51W` / `typescript:S6551` | External behavior  | `src/main/services/singular-request.ts`  | Added guarded form-value normalization for `hearingId`. Objects now become empty input instead of `"[object Object]"`. | Implemented; review validation behavior.        |
| `AaERiLpbbMK4TlTD51X` / `typescript:S6551`  | External behavior  | `src/main/services/singular-request.ts`  | Added guarded form-value normalization for `caseRef`.                                                                  | Implemented; review validation behavior.        |
| `AaERiLpbbMK4TlTD51Y` / `typescript:S6551`  | External behavior  | `src/main/services/singular-request.ts`  | Added guarded form-value normalization for `status`.                                                                   | Implemented; review validation behavior.        |
| `AaERiLpbbMK4TlTD51Z` / `typescript:S6551`  | External behavior  | `src/main/services/singular-request.ts`  | Added guarded form-value normalization for `notes`.                                                                    | Implemented; review validation behavior.        |
| `AaBiFbyR1iXn58QHKh9Q` / `typescript:S7726` | Logic/code quality | `src/main/routes/home.ts`                | Named the default route registration function.                                                                         | Low risk.                                       |
| `AaBiFbyI1iXn58QHKh9N` / `typescript:S7772` | Logic/code quality | `src/main/routes/info.ts`                | Changed the built-in `os` import to `node:os`.                                                                         | Low risk.                                       |
| `AaBiFbyI1iXn58QHKh9O` / `typescript:S7726` | Logic/code quality | `src/main/routes/info.ts`                | Named the default route registration function.                                                                         | Low risk.                                       |
| `AaBiFbyI1iXn58QHKh9P` / `typescript:S1135` | Logic/code quality | `src/main/routes/info.ts`                | Removed the stale TODO while retaining the empty downstream-info object.                                               | Low risk; no endpoint added.                    |
| `AaBiFbyb1iXn58QHKh9R` / `typescript:S2699` | Logic/code quality | `src/test/a11y/dummy-test.ts`            | Added a meaningful Jest assertion to the intentional dummy test.                                                       | Test-only; low user risk.                       |

## QA navigation and access guidance

The route and role details below are derived from the application source and tests. Local development/test configurations disable authentication; deployed/default configuration enables OIDC. When authentication is enabled, a user must authenticate through IDAM and must have the configured `RBAC.access` role when that setting is non-empty. The exact deployed role value is environment configuration and is **unknown from this checkout**.

### Bulk upload and response checks — issues 4, 5, 8, 9, 10, 11 and 12

1. Start at `/`.
2. Select **Bulk** and choose **Continue**, or navigate directly to `/bulk-upload`.
3. Upload a CSV containing the required headers: `hearingId,caseRef,action,notes,state`.
4. For the normal success path, use a valid row such as `12345678901234567890,1234567890123456,final_state_transition,Incident,CANCELLED`.
5. For validation behavior, upload invalid file content, an invalid action/state, or an invalid case reference.
6. Verify the page error messages, the redirect to `/bulk-upload/response`, and the downloaded `/bulk-upload/response/download` CSV. Confirm status/message values remain unchanged for valid, invalid and service-response rows.

Authentication: **verified** in source as global OIDC middleware when enabled; required role value: **unknown/environment-dependent**. CSRF protection is enabled in the default configuration and should be obtained from the rendered page in an authenticated environment.

### Singular request form checks — issues 13–16

1. Start at `/`.
2. Select **Singular** and choose **Continue**, or navigate directly to `/singular`.
3. Select **Final state transition** to reach `/singular/final-state-transition`, or select **Rollback** to reach `/singular/rollback`.
4. Submit normal string values and confirm existing validation and redisplay behavior.
5. For the changed edge case, use an API/integration test or crafted request body containing object/array values. Confirm the values are treated as empty input and produce normal validation messages rather than `"[object Object]"`.

Authentication: **verified** in source as global OIDC middleware when enabled; required role value: **unknown/environment-dependent**. No feature flag was found for these routes.

### Redis health check — issue 1

Use the application health endpoint registered by `@hmcts/nodejs-healthcheck` through `src/main/routes/health.ts`. The exact health URL should be confirmed from the deployed healthcheck middleware or environment documentation. Test with Redis disabled, available, unavailable, and recovering, and confirm the check still makes at most three attempts with the existing delay and reports the same health state.

### Other changes — issues 2, 3, 6, 7, 17–21

No direct user navigation is required. These are type/import/function-name, TODO-comment, or test-assertion changes. Existing route and service checks remain the appropriate regression coverage.

## Validation receipt

Passed:

- TypeScript transpile/syntax check over all changed TypeScript files using the locally available TypeScript tool.
- Prettier check over all changed files.
- `git diff --check`.

Blocked/not run:

- `yarn lint` and Jest suites could not start because Corepack initially lacked permission to write its cache.
- Repository-pinned dependency installation with `yarn install --immutable` reached the package registry but failed with `unable to get local issuer certificate`.
- Offline immutable-cache installation failed because many required cache entries are absent.
- Full type-check, ESLint, unit tests and route tests therefore remain unverified.
- No fresh SonarCloud analysis was run; this report is based on local source inspection and checks only.

## Next actions

1. Review the seven behavior-sensitive implementations, especially CSV output, singular input validation and Redis health timing.
2. Run `node .yarn/releases/yarn-4.19.0.cjs install --immutable` in an environment with the approved corporate CA/registry access.
3. Run `yarn lint`, `yarn test:unit --runInBand`, `yarn test:routes --runInBand`, and the appropriate CI/build checks.
4. Run a new SonarCloud analysis from this branch and confirm all 21 issue keys are resolved.
5. Review the focused commits and behavior-sensitive changes before opening the PR; pushing and PR creation remain separate actions.
