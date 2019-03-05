# Dependency Injection

Dependency injection is a technique that makes it easy to follow the [Single Responsibility Principle](https://en.wikipedia.org/wiki/Single_responsibility_principle) and [Open/Closed Principle](https://en.wikipedia.org/wiki/Open/closed_principle) of the [SOLID](https://en.wikipedia.org/wiki/SOLID) design principles, which allow for software designs to be more understandable, flexible, testable and maintainable.

[InversifyJS](http://inversify.io) is a lightweight dependency injection framework with full support for TypeScript.

## Adding to a project

The following dependencies are required:

- inversify
- inversify-binding-decorators
- inversify-express-utils

In addition, for unit testng, the following development dependencies are required:

- @types/jest
- jest
- jest-create-mock-instance
- ts-jest

## Configuring dependency injection

The following example describes how to wire a `Parent` class to consume a `Child` class via dependency injection.

First, let's create the `Child` class.  We mark the class as `@injectable()`:

```javascript
import { injectable } from 'inversify';

@injectable()
export class Child {
    public returnSomething() : string {
        return('Hello');
    }
}
```

Next, create a symbol to identify the `Child` class:

```javascript
export const TYPES = {
    Child: Symbol.for('Child')
};
```

Now, create the `Parent` class.  In addition to marking the class as `@injectable()`, we also inject an instance of `Child` into the constructor, annotating it with `@inject(TYPES.Child)`: 

```javascript
import { injectable, inject } from 'inversify';

@injectable()
export class Parent {

    constructor( @inject(TYPES.Child) private child: Child) {}

    public doSomething(): string {
        return child.returnSomething() + ' World';
    }
}
```

We need to configure InversifyJS on how to bind classes.  Within the CDF projects, this is handled in `/src/di/inversify,config.ts`:

```javascript
import { Container } from 'inversify';
import {TYPES} from './types';
import { Parent } from './parent';
import { Child } from './child';

// Load everything needed to the Container
export const container = new Container();
container.bind<Parent>(TYPES.Parent).to(Parent);
container.bind<Child>(TYPES.Child).to(Child);
```

The last piece of the puzzle is to pass our InversifyJS container into our Express server.  Within the CDF projects, this is handled in `/src/app.js`:

```javascript
import 'reflect-metadata';
import { container } from './di/inversify.config';
import { InversifyExpressServer } from 'inversify-express-utils';

// Start the Express server, passing in our dependency injection container
const server = new InversifyExpressServer(container);

// continue setting up the Express server as needed....
```

## Testing classes with mocked dependencies

Let's continue with the `Parent` and `Child` class examples above.

If the `Parent` class is run as is, it will call the `returnSomething()` method of `Child`, and return `Hello World`.  But when writing unit tests we need to isolate the `Parent` class, and not call the `Child` class.  The following is an exmaple of how to mock the `Child` class using the [jest](https://facebook.github.io/jest/) testing framework:

```javascript
import 'reflect-metadata';
import {} from 'jest';
import { createMockInstance } from 'jest-create-mock-instance';

import { Parent } from './parent';
import { Child } from './child';

describe('Parent', () => {
    let mockedChild: jest.Mocked<Child>;
    let classUnderTest: Parent;

    beforeEach(() => {
        mockedChild = createMockInstance(Child);
        classUnderTest = new Parent(mockedChild);
    });

    it('should return goodbye world', async () => {

        // Set the mocks on the dependent classes
        mockedChild.returnSomething.mockImplementationOnce(()=> {
            return 'Goodbye';
        });

        // Make the call
        const result = classUnderTest.doSomething();

        // Finally, verify the results
        expect(result).toBeDefined();
        expect(result).toEqual('Goodbye World');
    });
});
```

The important piece above is the use of `jest.Mocked<Child>`.  This will ensure that all requested instances of `Child` post the `jest.Mocked<Child>` return a mocked instance of `Child` instead of a real `Child`.

Next, as part of your test, use the `mockImplementationOnce()` method to configure the responses of your mocked classes.