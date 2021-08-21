# CICD

## Examples deploying a new cicd pipeline:

This _CICD_ directory represents the AWS CodePipeline based CI/CD flow that is used internally, before pushing to the external Github repo. It can be used as a guide for creating CI/CD pipelines.

### 
```sh
./cicd/deploy-cicd-pipeline.bash \
  -e development \
  -s staging-cfn-bucket \
  -l live-cfn-bucket \
  -d docs-bucket \
  -p staging-keypair \
  -q live-keypair \
  -n us-west-2 \
  -k ci-user \
  -y templates-snippets-bucket \
  -P deanhart-1577 \
  -R us-west-2 
```

## Testing locally

Run all from the main root...

### filterproject_install.bash

To mimic the behavior of CodePipeline not using git, need to clone the latest then remove git:

```sh
cd /tmp
git clone --max-depth=1 ](git clone --depth=1 https://git-codecommit.us-west-2.amazonaws.com/v1/repos/aws-connected-device-framework src
cd src
rm -rf .git
```

Then run the script, first setting the environment variables that are set by CodePipeline:
```fish
cd /tmp/src
begin; set -lx AWS_REGION 'us-west-2'; and set -lx CDF_CODECOMMIT_USERNAME 'TODO';and set -lx CDF_CODECOMMIT_PASSWORD 'TODO';and set -lx CDF_CODECOMMIT_EMAIL ''; and set -lx CODEBUILD_SRC_DIR '/tmp/src'; and set -lx REPO_NAME 'aws-connected-device-framework'; cicd/filterproject_install.bash; end
```

### buildproject_postbuild.bash

```fish
begin; set -lx CODEBUILD_BUILD_SUCCEEDING 1; set -lx CDF_CODECOMMIT_USERNAME 'TODO'; set -lx CDF_CODECOMMIT_PASSWORD 'TODO'; cicd/buildproject_postbuild.bash; end
```

### deployproject_postbuild.bash

```fish
begin; set -lx CODEBUILD_BUILD_SUCCEEDING 1; and set -lx ENVIRONMENT development; and set -lx ARTIFACT_PUBLISH_LOCATION 's3://cdf-xxxxxxxxxxxx-us-east-1/releases'; and set -lx DOCUMENTATION_PUBLISH_LOCATION 's3://cdf-xxxxxxxxxxxx-us-east-1/releases'; cicd/deployproject_postbuild.bash; end
```

### integrationtestsproject_build.bash

```sh
export CODEBUILD_SRC_DIR_source_infrastructure='/Users/deanhart/git/cdf-ts/cdf-infrastructure-demo'
export CODEBUILD_BUILD_SUCCEEDING=1
export ENVIRONMENT='development-staging'
export DEPLOY_ARTIFACTS_STORE_BUCKET='cdf-xxxxxxxxxxxx-us-west-2'
export ASSETLIBRARY_MODE='full'
cicd/integrationtestsproject_build.bash
```
