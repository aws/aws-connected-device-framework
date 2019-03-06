# Development Quick Start

## Introduction

The following describes the steps involved to initialize a CDF development environment from scratch, to build, run and test the project, then finally on how to commit modifications to the source code.

Due to the scripts used as part of both the build and deployment steps, only linux type environments (including macOS) are supported.

## Configuring the development environment

The following is a one-time setup to configure the CDF development environment:

+ ensure you have a [git client](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) installed
+ install [Node Version Manager](https://github.com/creationix/nvm#install--update-script):

```sh
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
```

+ using nvm installed from the previous step, install Node.js v8.10:

```sh
> nvm use v8.10
```

+ install [pnpm](https://pnpm.js.org):

```sh
> npm install -g pnpm

+ clone the project:

```sh
> git clone https://git-codecommit.us-west-2.amazonaws.com/v1/repos/cdf-core
```

+ initialize the project dependencies:

```sh
> cd cdf-core
cdf-core> pnpm i
```

## Building the platform

To run a specific service:

```sh
cdf-core> pnpm 
```


## FAQ

> **I use the [fish shell](https://fishshell.com) on macOS (installed via homebrew) instead of the default shell.  How do I configure `nvm`?**

Add the following to `cat ~/.config/fish/config.fish`, then open a new terminal:

```sh
function nvm
   bass source (brew --prefix nvm)/nvm.sh --no-use ';' nvm $argv
end
set -x NVM_DIR ~/.nvm
nvm use default --silent
```