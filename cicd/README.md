# CICD

## Examples deploying a new cicd pipeline:

### 'full' mode into an existing VPC
```sh
./deploy-cicd-pipeline.bash \
  -b cdf-157731826412-us-west-2 \
  -d cdf-157731826412-us-west-2-docs \
  -I cdf-infrastructure-cummins \
  -e development \
  -N \
  -m full \
  -v vpc-034b3ce7ffacce9d0 \
  -s sg-031fcef7b2821037e \
  -n subnet-0df8ef64dfa6dc825,subnet-0be681a72c7db1c2d \
  -t rtb-0fc5765aa27fc5fda,rtb-047e1214af8916769 \
  -p 157731826412 \
  -o subnet-0d819cf4a71c37aff,subnet-0975de9740ea67251 \
  -i 205.251.233.178/32 \
  -k dc00f56e-fc96-4c4e-8a78-ce033b7d5c8f \
  -P deanhart-1577 \
  -R us-west-2 
```

## Testing locally

Run all from the main root...

### filterproject_install.bash

To mimic the behavior of CodePipeline not using git, need to clone the latest then remove git:

```sh
cd /tmp
git clone --max-depth=1 ](git clone --depth=1 https://git-codecommit.us-west-2.amazonaws.com/v1/repos/cdf-core src
cd src
rm -rf .git
```

Then run the script, first setting the environment variables that are set by CodePipeline:
```fish
cd /tmp/src
set AWS_REGION 'us-west-2'; and set CDF_CODECOMMIT_USERNAME 'deanhart-at-157731826412';and set CDF_CODECOMMIT_PASSWORD 'ZhrIAjpn8OYR0d9fSQVMBCM/eUtv2KQqdOvmjcHQs/o=';and set CDF_CODECOMMIT_EMAIL 'deanhart@amazon.com'; and set CODEBUILD_SRC_DIR '/tmp/src'; and set REPO_NAME 'cdf-core'; and ./cicd/filterproject_install.bash
```
