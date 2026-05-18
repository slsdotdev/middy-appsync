# E2E test suite

This suite deploys the example AppSync API (with API_KEY auth) and a DynamoDB
backend, drives it over HTTPS, then tears the stack down.

## Prerequisites

- AWS credentials available to the shell (`AWS_PROFILE` or env vars).
- The target account must be CDK-bootstrapped (`npx cdk bootstrap`).
- Node >= 22.16, npm >= 10.9.

## Run

From `examples/graphql`:

```sh
npm run test:e2e
```

Single command: deploys → runs vitest → destroys.

## Faster local iteration

To avoid the deploy/destroy round-trip while iterating on tests:

```sh
npm run infra:deploy            # deploys + writes infra/outputs.json
SKIP_DEPLOY=1 npm run test:e2e  # runs tests against the existing stack
npm run infra:destroy           # when done
```

## Layout

- `globalSetup.ts` — `cdk deploy` + capture outputs (`GRAPHQL_URL`, `API_KEY`,
  `USERS_TABLE`, `POSTS_TABLE`, `Region`) → teardown `cdk destroy`.
- `helpers/client.ts` — minimal `fetch`-based GraphQL client (POST with
  `x-api-key`).
- `helpers/ddb.ts` — `clearAllTables()` for between-test isolation.
- `helpers/seed.ts` — typed `createUser`/`createPost` mutation helpers.
- `tests/` — one file per concern: queries, mutations, field resolvers, batch,
  errors.
