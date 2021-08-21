# Tech Stack

Each application is written in [TypeScript 4.1.2](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html), and transpiled into Node.js v14.x.

The REST API's are hosted within the [Express web framework](https://expressjs.com), using [aws-serverless-express](https://github.com/awslabs/aws-serverless-express) (for older services) or [serverless-http](https://www.npmjs.com/package/serverless-http) (for newer services) to allow the Express application to run within AWS Lambda.

[InversifyJS](https://github.com/inversify/InversifyJS) is handling dependency injection, along with [inversify-express-utils](https://github.com/inversify/inversify-express-utils) to handle the integration with Express.

A 12-factor app approach is taken to manage [config](https://github.com/lorenwest/node-config).

Logging is handled via [WinstonJs](https://github.com/winstonjs/winston).

Unit testing (along with mocking) is made possible via [Jest](https://facebook.github.io/jest/).

End to end integration testing (BDD - behavior driven development) is handled using [cucumber-js](https://github.com/cucumber/cucumber-js).