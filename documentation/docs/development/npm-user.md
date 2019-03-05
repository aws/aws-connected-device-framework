
# NPM Private Repository

CDF utilizes (verdaccio)[https://www.verdaccio.org] as a private npm repository for sharing common private modules between the CDF services.

## Scope

All CDF package names should be prefixed with the scope `@cdf`.  As an example, the `assetlibrary` `package.json` contains the following:

```sh
{
  "name": "@cdf/assetlibrary"
  ...
}
```

## Creating a user

To use the npm registry, create a user as follows:

```sh
npm adduser --registry  http://ec2-54-202-45-80.us-west-2.compute.amazonaws.com
```

## Downloading dependencies from the NPM private repo

Log in to the NPM private repo as follows.  This will use our private repo for all packages scoped with `@cdf` only:

```sh
npm login --registry  http://ec2-54-202-45-80.us-west-2.compute.amazonaws.com --scope=@cdf
npm config set @cdf:registry http://ec2-54-202-45-80.us-west-2.compute.amazonaws.com
```

## Publishing to the NPM private repo

Once logged in, run the following:

```sh
npm publish --registry http://ec2-54-202-45-80.us-west-2.compute.amazonaws.com
```

## Verdaccio Portal

To view, ensure that the `cdf-verdaccio` allows access to your IP.  Then view the portal:

http://ec2-54-202-45-80.us-west-2.compute.amazonaws.com/#/