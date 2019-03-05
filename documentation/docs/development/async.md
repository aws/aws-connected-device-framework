# Asynchronous Operations

As CDF is based on Node.js v8.10, the `async, await` constructs are used to handle asynchronous operations as if they were synchronous, vastly simplifying their implementation when compared to Promises and callbacks.

## Pattern:  Alternative to Promise chaining

```javascript
async function asyncTask () {
  try {
    const valueA = await chainedFunctionA()
    const valueB = await chainedFunctionB(valueA)
    const valueC = await chainedFunctionC(valueB)
    return await chainedFunctionD(valueC)
  } catch (err) {
    logger.error(err)
  }
}
```

## Pattern:  Asynchronous functions depending on other asynchronous functions

```javascript
async function executeAsyncTask () {
    const valueA = await functionA();
    const valueB = await functionB(valueA);
    return function3(valueA, valueB);
}
```

## Pattern:  Parallel requests

```javascript
async function executeParallelAsyncTasks () {
    const [ valueA, valueB, valueC ] = await Promise.all([ functionA(), functionB(), functionC() ])
        doSomethingWith(valueA);
        doSomethingElseWith(valueB);
        doAnotherThingWith(valueC);
    }
```