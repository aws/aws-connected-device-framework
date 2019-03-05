# Tech Stack

Each application is written in [TypeScript 2.8](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html), and transpiled into [Node.js 8.10](https://nodejs.org/en/blog/release/v8.10.0/).

The REST API's are hosted within the [Express web framework](https://expressjs.com), using [aws-serverless-express](https://github.com/awslabs/aws-serverless-express) to allow the Express application to run within AWS Lambda.

[InversifyJS](https://github.com/inversify/InversifyJS) is handling dependency injection, along with [inversify-express-utils](https://github.com/inversify/inversify-express-utils) to handle the integration with Express.

12-factor app based config is managed via [config](https://github.com/lorenwest/node-config).

Logging is handled via [WinstonJs](https://github.com/winstonjs/winston).

Unit testing (along with mocking) is made possible via [Jest](https://facebook.github.io/jest/).

End to end integration testing (BDD - behavior driven development) is handled using [cucumber-js](https://github.com/cucumber/cucumber-js).