# CI/CD
## Introduction

The CDF core modules are compiled, tested, and deployed, via a single AWS CodePipeline CI/CD pipeline.

## Deployment of Pipeline

The pipeline is deployed using the `{aws-connected-device-framework}/source/cicd/deploy-cicd-pipeline.bash` script.  Run the script with no arguments to view the help on the possible arguments:

```sh
aws-connected-device-framework> cicd/deploy-cicd-pipeline.bash

NAME
    deploy-cicd-pipeline.bash

DESCRIPTION
    Deploys the CICD pipeline.

MANDATORY ARGUMENTS:
  -b (string)   The name of the S3 bucket to deploy CloudFormation templates to.
  -d (string)   The name of the S3 bucket to deploy cdf core documentation to.
  -I (string)   Name of repo of cdf-infrastructure-* project
  -e (string)   Name of environment.

OPTIONAL ARGUMENTS
  -r (string)   Name of CodeCommit repo (defaults to aws-connected-device-framework).
  -g (string)   Name of git branch (defaults to master).
  -h (string)   Name of cdf-infrastructure-* git branch (defaults to master).

  -N (flag)     Use an existing VPC instead of creating a new one
  -m (string)   Asset library mode - 'full' or 'lite'.  Defaults to 'full'
  -v (string)   Id of VPC where Neptune resides (if running Asset Library in 'full' mode)
  -s (string)   Id of security group with access to Neptune (if running Asset Library in 'full' mode)
  -n (string)   Id of private subnets where Neptune resides (if running Asset Library in 'full' mode)
  -t (string)   Id of private route table ids where Neptune resides (if running Asset Library in 'full' mode)

  -p (string)   The name of the key pair to use to deploy the Bastion EC2 host.
  -o (string)   ID of public subnets (comma delimited) to deploy the Bastion into (required if -N set, and Asset Library 'full' mode)
  -i (string)   The remote access CIDR to configure Bastion SSH access (e.g. 1.2.3.4/32).
  -k (string)   The KMS Key id that the provisoning service will use to decrypt sensitive information.  If not provided, a new KMS key with the alias 'cdf' is created.

  -a (string)   Name of custom auth cloudformation stack (if running with custom auth enabled)

  -R (string)   AWS region.
  -P (string)   AWS profile.
```

As the CI/CD pipeline deploys the entire CDF core services, it needs the same parameters as what is used to deploy the core CDF services into an account.

## Implementation

The CodePipeline in constructed of a number of stages (CodeBuild projects), with each stage having a number of steps (CodeBuild phases).  Each of these steps executes a script as follows:

### `source` stage

Clones the main _aws-connected-device-framework_ monorepo along with an _infrastructure_ project as specified by the `-I` parameter of the deployment script.

### filter-commits stage

#### install step:  `cicd/filterproject_install.bash`

When CodePipeline uses CodeCommit as its source, it provides a snapshot of the latest version of the codebase instead of providing the git repository itself.  As we need tag the git repository downstream in the pipeline, this script configures the `aws-connected-device-framework` source as a git repository by replacing the source with a cloned version of the real git repository.

#### pre_build step:  `cicd/filterproject_prebuild.bash`

We do not want the CI/CD codepipline to process all commits.  One such example being when the pipeline itself commits an update to a version number we need to ignore it as as we don't end up in a loop.  This step retrieves the latest git commit message, and ignores the build by failing the build if the message contains the text `[skip ci]'`.

### build stage

#### install step:  `cicd/buildproject_install.bash`

Installs the `[pnpm](https://pnpm.js.org)` package manager.

#### pre_build step:  `cicd/buildproject_prebuild.bash`

Installs project dependencies.

#### build step:  `cicd/buildproject_build.bash`

Builds all projects, followed by running all unit tests.

#### post_build step:  `cicd/buildproject_postbuild.bash`

If unit tests were successful, a semantic release of all changed projects is performed by analyzing all the git commit messages since the last install.  Any updated version numbers are committed back to the git code repo.  All services are then bundled ready for deploy.

### deploy_staging stage

#### install step:  `cicd/deployproject_install.bash`

Downloads and installs `[jq](https://stedolan.github.io/jq/)`, `[mkdocs](https://www.mkdocs.org)` and any related mkdoc plugins.

#### build step:  `cicd/deployproject_build.bash`

Builds and executes the main `infrastructure/deploy-core.bash` script to deploy all updated services to the staging environment.

#### post_build step:  `cicd/deployproject_postbuild.bash`

Tags the staging release.

### integration-tests stage

#### install step:  `cicd/integrationtestsproject_install.bash`

Installs `[jq](https://stedolan.github.io/jq/)` and `[pnpm](https://pnpm.js.org)`.

#### pre_build step:  `cicd/integrationtestsproject_prebuild.bash`

Installs project dependencies.

#### build step:  `cicd/integrationtestsproject_build.bash`

Runs the integration tests against the deployed staging environment.

### deploy_live stage

#### install step:  `cicd/deployproject_install.bash`

Downloads and installs `[jq](https://stedolan.github.io/jq/)`, `[mkdocs](https://www.mkdocs.org)` and any related mkdoc plugins.

#### build step:  `cicd/deployproject_build.bash`

Builds and executes the main `infrastructure/deploy-core.bash` script to deploy all updated services to the live environment.

#### post_build step:  `cicd/deployproject_postbuild.bash`

Tags the live release, as well as publishing all artifacts to S3.