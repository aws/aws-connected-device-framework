# Unit testing

All unit tests are written in [Jest](https://facebook.github.io/jest/) which includes its own mocking functionality.

A great Jest cheat sheet can be found [here](https://devhints.io/jest).

Each unit test must adhere to these rules:

- Each test method should focus on one test
- Each test should focus on testing a single method, mocking all calls to dependent objects/methods
- Verify configured mocks execute as requested
- Assert that the actual response is as expected
- Never skip any unit tests

Refer to `assetlibrary/src/policies/policies.service.spec.ts` for an example.

Run unit tests using `npm run test`.
