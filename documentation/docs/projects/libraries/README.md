# CDF Reusable Libraries

These are reusable libraries implementing common functionality needed by multiple CDF services

## Organization

- core : Core set of libraries, resuable across services
- dev : Libraries that may be needed for build/test activities but should not be included in deployments. These libraries will be part of 'devDependencies'
- data : Set of libraries that provide functionality to interact with various data/config stores
- config : Set of libraries for CDF configuration interactions
- auth : Set of libraries for authn/authz functionality

## Usage

Add "@cdf/library-name": "^1.0.0" to the dependencies section of the package.json file
Alternatively:

```sh
npm install @cdf/library-name
```

In the code, add the following statements:

```javascript
import { CDFLibrary } from '@cdf/library-name';
```
