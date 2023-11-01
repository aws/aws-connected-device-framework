# Asset Library Integration Tests

After following the [general steps for setting up an environment for integration testing](../README.md), the commands below can be used to run integration tests for Asset Library in various configurations.
The tests are executed locally on your development environment and send HTTP requests to an Asset Library API deployed in an AWS account.

The subset of tests must match the mode and configuration of the Asset Library deployment at the URL configured in `ASSETLIBRARY_BASE_URL` in `path/to/local/.env`.
For example, integration tests in the `full-with-authz` folder only pass with an Asset Library deployment that is configured with `AUTHORIZATION_ENABLED=true`.

Note: Only the _full_ mode is currently tested as part of the CI/CD pipeline.

## Testing full/enhanced mode

To run integration tests for Asset Library in _full_ or _enhanced_ mode, irrespective of `AUTHORIZATION_ENABLED` setting:

```sh
$ source/packages/integration-tests> CONFIG_LOCATION="path/to/integrationtest/.env" pnpm run integration-test -- features/assetlibrary/full/*
```

## Testing full-with-authz mode

To run integration tests for Asset Library in _full_ mode, when `AUTHORIZATION_ENABLED` is set to `true`:

```sh
$ source/packages/integration-tests> CONFIG_LOCATION="path/to/integrationtest/.env" npm run integration-test  -- features/assetlibrary/full-with-authz/*
```

These tests are an addition to, not a superset of, "Testing full/enhanced mode".

## Testing enhanced mode

To run integration tests for Asset Library in _enhanced_ mode, irrespective of `AUTHORIZATION_ENABLED` setting:

```sh
$ source/packages/integration-tests> CONFIG_LOCATION="path/to/integrationtest/.env" npm run integration-test  -- features/assetlibrary/full-with-enhancedsearch/*
```

These tests are an addition to, not a superset of, "Testing full/enhanced mode".

## Testing lite mode

See the [special notes for running lite mode tests](lite/README.md).

To run integration tests for Asset Library in _lite_ mode:

```sh
$ source/packages/integration-tests> CONFIG_LOCATION="path/to/integrationtest/.env" npm run integration-test  -- features/assetlibrary/lite/*
```
