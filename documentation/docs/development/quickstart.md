# Development Getting Started

## Introduction

The following describes the steps involved to initialize a CDF development environment from scratch, to build, run and test a project, then finally on how to commit modifications to the source code.

Due to the scripts used as part of both the build and deployment steps, only linux type environments (including macOS) are supported.

## Configuring the development environment

The following is a one-time setup to configure the CDF development environment:

+ ensure you have a [git client](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) installed
+ install [Node Version Manager](https://github.com/creationix/nvm#install--update-script):

```sh
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.37.2/install.sh | bash
```

+ using nvm installed from the previous step, install Node.js v12:

```sh
> nvm use v12
```

+ install [`rush`](https://rushjs.io) monorepo manager:

```sh
> npm install -g @microsoft/rush
```

+ clone the project:

```sh
> git clone https://git-codecommit.us-west-2.amazonaws.com/v1/repos/cdf-core
```

+ initialize the project dependencies:

```sh
> cd cdf-core
cdf-core> rush install
```

## Build

The CDF monorepo is managed by [rush](https://rushjs.io) which under the covers is configured to use [pnpm](http://pnpm.js.org) as its package manager. The following is a brief introduction of how to use _rush_:

```sh
# If this is your first time at using Rush for this project, remove any node_modules 
# that may have been installed as part of a non-Rush (npm/pnpm) release:
cdf-core> rm -rf node_modules

# One time setup only, initialize the project after cloning from git
cdf-core> rush install

# Install/refresh the dependencies
cdf-core> rush update

# When running the `clean`, `build`, `lint` or `test` commands you have the option to
# run globally (for all packages), or for a specific package. To run for all packages
# run as follows:
#
#           rush <command>
# 
# To run for a specific package you can either provide a target filter as follows:
#
#           rush <command> -t <package_name>
#
# or alternatively run the following within the package's directory (which is a shortcut
# for `rush <command> -t .`):
#
#           rushx <command>
#

# Taking the above comments into consideration, to build run the following. Note that the first build
# may take time, but subsequent builds will be quicker delta builds:
cdf-core> rush build

# To lint:
cdf-core> rush lint

# And to run unit tests:
cdf-core> rush test

# If you experience issues and need to reset everything you have the following 2 commands available:
#   To remove all build artifacts:
cdf-core> rush purge        # to purge all node_modules:
cdf-core> rush update       # refresh dependencies
cdf-core> rush clean        # perform a deep clean
cdf-core> rush update       # refresh dependencies again

```


## Running a module

Each service has its configuration properties stored in an external file.  We follow a convention of storing these property files within the customers _cdf-infrastructure-*_ project (e.g. _cdf-infrastructure-demo_), where the name of the property file is of the pattern "<environment\>-config.json".

When running locally, the first step is to define which configuration file to use.  There are 2 ways of doing this based on personal preference - persisted or temporary. As an example, to use the `development-local-config.json` configuration files located within each projects folder in the _cdf-infrastructure-*_ project we would set the environment locally as follows:

**Persisted (applicable for multiple starts)**

```sh
## persist the environment name to local npm config
npm config set {package name}:environment development-local

## e.g. for the asset library:
npm config set @cdf/assetlibrary:environment development-local

## start the project
CONFIG_LOCATION=<path to infrastructure project>; npm run start

## e.g.
CONFIG_LOCATION="../../../../cdf-infrastructure-demo"; npm run start
```
For reference, the above command stores this configuration in `~./npmrc`.

**Temporary (applicable for the current start only)**

```sh
## start the project
CONFIG_LOCATION=<path to infrastructure project>; npm run start --<package name>:environment=<environment name>

## e.g.
CONFIG_LOCATION="../../../../cdf-infrastructure-demo"; npm run start --@cdf/assetlibrary:environment=development-local
```

## Making changes to an existing module

We adhere to what is known as a [GitHub flow](https://guides.github.com/introduction/flow/) as far as our approach to branching is concerned.  Basically this boils down to:

+ The `master` branch always represents a working version of the code that may be deployed to a production environment
+ Under no circumstances ever commit directly to `master`!
+ When starting a new feature or fixing a bug, create a new branch from `master`. Name the branch `feat_***` for new features or `fix_***` for hotfixes:

```sh
cdf-core> git switch -c <new_branch_name>

Switched to a new branch '<new_branch_name>'
```

+ At suitable points, commit your work by running the following, and following the prompts to describe your commit:

```sh
cdf-core> git add -A
cdf-core> rush commit
```

+ When you have finished with your implementation, and ensured that all existing unit tests pass as well as creating any new tests, the following steps are required:

    + Merge changes with the `master` branch:

```sh
# pull in master into your branch
cdf-core> git merge origin/master

# once any conflicts have been resolved, test
cdf-core> rush test

# commit changes
cdf-core> git add -A
cdf-core> rush commit
```
+
    + Generate release notes. the `rush change` command will analyze all commits on the branch, filter out the projects that changed, then prompt you to enter release notes for the updated project:

```sh
# generate release notes
cdf-core> rush change

# commit release notes
cdf-core> git add -A
cdf-core> rush commit
```

+
    + Push the branch to CodeCommit

```sh
cdf-core> git push
```
+
  + Create a [CodeCommit Pull Request](https://docs.aws.amazon.com/codecommit/latest/userguide/how-to-create-pull-request.html) to have your work reviewed by peers.  Once created, send out the pull request link to other team members


+ Once your pull request has been reviewed, and any issues addressed, merge your implementation back into the main code branch.  Select the _squash merge_ option and provide a summary when merging to condense the various commits for the branch.

## Understanding the directory structure

Directory | Description
---|---
cdf-core/cicd/ | The CloudFormation template to deploy the cicd pipeline, along with the related CodeBuild scripts
cdf-core/common/ | All build and package manager related files
cdf-core/documentation/ | CDF core related documentation
cdf-core/infrastructure/ | The main deployment script for deploying the CDF core services, along with CloudFormation templates that are not specific to any service
cdf-core/packages/integration-tests/ | BDD related automated integration tests
cdf-core/packages/libraries/ | All internal libraries, as well as CDF client libraries
cdf-core/packages/services/ | Deployable services, such as the Asset Library
```

## FAQ

???+ question "Why do I have to use `rush commit` to commit my work instead of the usual `git commit`?"

    `rush commit` is configured to run the [commitizen command line utility](https://github.com/commitizen/cz-cli) which forces you to describe commits using a specific format.  This is vitally important, as there are steps in our CI/CD pipeline that analyze all git commits since the last release, use these specially formatted messages to intelligently increment the version numbers (e.g. understand if there's a breaking change), and finally auto generates a change log for the release.

???+ question "What is the need for using ([`rush`](https://rushjs.io)) and ([`pnpm`](https://pnpm.js.org) package manager)?  What's wrong with just `npm`?"
    The `cdf-core` git repo is what is known as a monorepo, a large single repository that contains many different projects.

    The decision to migrate CDF to a monorepo was made to:

    + simplify the development environment by removing the need for an npm private repo (e.g. verdaccio)
    + simplify the dependency management across projects (reduced the development environment footprint from >6GB to 300MB)
    + allow for atomic commits spanning multiple projects, simplifying branching, merging and code reviews

    `pnmp` in conjunction with `rush` have features that allow us to efficiently work with monorepos, while still being able to bundle individual services in the way required by AWS Lambda.

???+ question "I use the [fish shell](https://fishshell.com) on macOS (installed via homebrew) instead of the default shell.  How do I configure `nvm`?"

    Add the following to `cat ~/.config/fish/config.fish`, then open a new terminal:

    ```sh
    function nvm
       bass source (brew --prefix nvm)/nvm.sh --no-use ';' nvm $argv
    end
    set -x NVM_DIR ~/.nvm
    nvm use default --silent
    ```