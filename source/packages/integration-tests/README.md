# Automated Integration Tests

Note - Never run automated integration tests in a production environment!

To run:

- Update the `{cdf-configurion-*}/integration-tests/{environment}-config.json` file
- 
- To run all integration tests:

```sh
cd packages/integration-tests
CONFIG_LOCATION="../../../../{cdf-configuration}" npm run integration-test
```

- To run tests for a specific feature:

```sh
cd packages/integration-tests
CONFIG_LOCATION="../../../../{cdf-configuration}" npm run integration-test -- features/commands/*.feature
```
