#!/bin/bash
set -e

#--------------------------------------------------------------------------------
#   Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
#
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
#  with the License. A copy of the License is located at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
#  and limitations under the License.
#---------------------------------------------------------------------------------


function help_message {
    cat << EOF

NAME
    deploy-cicd-pipeline.bash    

DESCRIPTION
    Deploys the CICD pipeline.

MANDATORY ARGUMENTS:
  -e (string)	  Name of environment.

  -s (string)   The name of the S3 bucket to deploy Staging CloudFormation templates to.
  -l (string)   The name of the S3 bucket to deploy Live CloudFormation templates to.
  -d (string)   The name of the S3 bucket to deploy cdf core documentation to.

  -p (string)   The name of the key pair to use to deploy the Bastion EC2 host for Staging Environment
  -q (string)   The name of the key pair to use to deploy the Bastion EC2 host for Live Environment
  -n (string)   Live Deployment Region Name i.e 'us-west-2 (should be the same as live cloudformation s3 bucket region)

  -y (string)   S3 uri base directory where Cloudformation template snippets are stored.

OPTIONAL ARGUMENTS
  -c (string)   Name of CodeCommit aws-connected-device-framework repo (defaults to aws-connected-device-framework).
  -g (string)   Name of CodeCommit aws-connected-device-framework git branch (defaults to master).
  -i (string)   Name of CodeCommit cdf-infrastructure-* repo (defaults to cdf-infrastructure-demo).
  -h (string)   Name of CodeCommit cdf-infrastructure-* git branch (defaults to master).
  -f (string)   Name of CodeCommit cdf-facade-* repo (defaults to cdf-facade-demo)
  -t (string)   Name of CodeCommit cdf-facade-* git branch (defaults to master).


  -z (string)   Name of API Gateway cloudformation template snippet. If none provided, all API Gateway instances are configured without authentication.
  -a (string)   API Gateway authorization type.
  -o (string)   Cognito user pool arn
  -A (string)   Lambda authorizer function arn.

  -R (string)   AWS region.
  -P (string)   AWS profile.
    
EOF
}

while getopts ":e:s:l:d:p:q:n:K:y:c:g:i:h:f:t:z:a:o:A:R:P:" opt; do
  case $opt in
	  e  ) export ENVIRONMENT=$OPTARG;;
	  s  ) export STAGING_ARTIFACT_STORE_BUCKET=$OPTARG;;
    l  ) export LIVE_ARTIFACT_STORE_BUCKET=$OPTARG;;
    d  ) export DOCUMENTATION_STORE_BUCKET=$OPTARG;;
    p  ) export STAGING_DEPLOYMENT_KEYPAIR=$OPTARG;;
    q  ) export LIVE_DEPLOYMENT_KEYPAIR=$OPTARG;;
    n  ) export LIVE_REGION=$OPTARG;;

    y  ) export TEMPLATE_SNIPPET_S3_URI_BASE=$OPTARG;;

    c  ) export CDF_CORE_REPO_NAME=$OPTARG;;
    g  ) export CDF_CORE_REPO_BRANCH=$OPTARG;;
    i  ) export INFRASTRUCTURE_REPO_NAME=$OPTARG;;
    h  ) export INFRASTRUCTURE_REPO_BRANCH=$OPTARG;;
    f  ) export FACADE_REPO_NAME=$OPTARG;;
    t  ) export FACADE_REPO_BRANCH=$OPTARG;;

    z  ) export API_GATEWAY_DEFINITION_TEMPLATE=$OPTARG;;
    a  ) export API_GATEWAY_AUTH=$OPTARG;;
    o  ) export COGNTIO_USER_POOL_ARN=$OPTARG;;
    A  ) export AUTHORIZER_FUNCTION_ARN=$OPTARG;;

    R  ) export AWS_REGION=$OPTARG;;
    P  ) export AWS_PROFILE=$OPTARG;;

    \? ) echo "Unknown option: -$OPTARG" >&2; help_message; exit 1;;
    :  ) echo "Missing option argument for -$OPTARG" >&2; help_message; exit 1;;
    *  ) echo "Unimplemented option: -$OPTARG" >&2; help_message; exit 1;;
  esac
done

cwd=$(dirname "$0")
root_dir=$(pwd)

echo "root_dir:" $root_dir
echo "cwd:" $cwd

source $root_dir/infrastructure/common-deploy-functions.bash

DEPLOY_PARAMETERS=()

incorrect_args=$((incorrect_args+$(verifyMandatoryArgument ENVIRONMENT e $ENVIRONMENT)))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument TEMPLATE_SNIPPET_S3_URI_BASE y "$TEMPLATE_SNIPPET_S3_URI_BASE")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument STAGING_ARTIFACT_STORE_BUCKET s "$STAGING_ARTIFACT_STORE_BUCKET")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument LIVE_ARTIFACT_STORE_BUCKET l "$LIVE_ARTIFACT_STORE_BUCKET")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument DOCUMENTATION_STORE_BUCKET d "$DOCUMENTATION_STORE_BUCKET")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument STAGING_DEPLOYMENT_KEYPAIR p "$STAGING_DEPLOYMENT_KEYPAIR")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument LIVE_DEPLOYMENT_KEYPAIR q "$LIVE_DEPLOYMENT_KEYPAIR")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument LIVE_REGION n "$LIVE_REGION")))

API_GATEWAY_AUTH="$(defaultIfNotSet 'API_GATEWAY_AUTH' a ${API_GATEWAY_AUTH} 'None')"
incorrect_args=$((incorrect_args+$(verifyApiGatewayAuthType $API_GATEWAY_AUTH)))
if [[ "$API_GATEWAY_AUTH" = "Cognito" ]]; then
    incorrect_args=$((incorrect_args+$(verifyMandatoryArgument COGNTIO_USER_POOL_ARN C $COGNTIO_USER_POOL_ARN)))
fi
if [[ "$API_GATEWAY_AUTH" = "LambdaRequest" || "$API_GATEWAY_AUTH" = "LambdaToken" ]]; then
    incorrect_args=$((incorrect_args+$(verifyMandatoryArgument AUTHORIZER_FUNCTION_ARN A $AUTHORIZER_FUNCTION_ARN)))
fi

CDF_CORE_REPO_NAME="$(defaultIfNotSet 'CDF_CORE_REPO_NAME' c ${CDF_CORE_REPO_NAME} 'aws-connected-device-framework')"
CDF_CORE_REPO_BRANCH="$(defaultIfNotSet 'CDF_CORE_REPO_BRANCH' g ${CDF_CORE_REPO_BRANCH} 'master')"
INFRASTRUCTURE_REPO_NAME="$(defaultIfNotSet 'INFRASTRUCTURE_REPO_NAME' i ${INFRASTRUCTURE_REPO_NAME} 'cdf-infrastructure-demo')"
INFRASTRUCTURE_REPO_BRANCH="$(defaultIfNotSet 'INFRASTRUCTURE_REPO_BRANCH' h ${INFRASTRUCTURE_REPO_BRANCH} 'master')"
FACADE_REPO_NAME="$(defaultIfNotSet 'FACADE_REPO_NAME' f ${FACADE_REPO_NAME} 'cdf-facade-demo')"
FACADE_REPO_BRANCH="$(defaultIfNotSet 'FACADE_REPO_BRANCH' t ${FACADE_REPO_BRANCH} 'master')"
API_GATEWAY_DEFINITION_TEMPLATE="$(defaultIfNotSet 'API_GATEWAY_DEFINITION_TEMPLATE' z ${API_GATEWAY_DEFINITION_TEMPLATE} 'cfn-apiGateway-noAuth.yaml')"


DEPLOY_PARAMETERS+=( Environment=$ENVIRONMENT )
DEPLOY_PARAMETERS+=( CdfCoreRepoName=$CDF_CORE_REPO_NAME )
DEPLOY_PARAMETERS+=( CdfCoreBranch=$CDF_CORE_REPO_BRANCH )
DEPLOY_PARAMETERS+=( InfrastructureRepoName=$INFRASTRUCTURE_REPO_NAME )
DEPLOY_PARAMETERS+=( InfrastructureBranch=$INFRASTRUCTURE_REPO_BRANCH )
DEPLOY_PARAMETERS+=( FacadeRepoName=$FACADE_REPO_NAME )
DEPLOY_PARAMETERS+=( FacadeBranch=$FACADE_REPO_BRANCH )
DEPLOY_PARAMETERS+=( LiveRegion=$LIVE_REGION )
DEPLOY_PARAMETERS+=( StagingArtifactStoreBucketName=$STAGING_ARTIFACT_STORE_BUCKET )
DEPLOY_PARAMETERS+=( LiveArtifactStoreBucketName=$LIVE_ARTIFACT_STORE_BUCKET )
DEPLOY_PARAMETERS+=( DocumentationBucketName=$DOCUMENTATION_STORE_BUCKET )
DEPLOY_PARAMETERS+=( StagingKeyPairName=$STAGING_DEPLOYMENT_KEYPAIR )
DEPLOY_PARAMETERS+=( LiveKeyPairName=$LIVE_DEPLOYMENT_KEYPAIR )
DEPLOY_PARAMETERS+=( ApiGatewayAuth=$API_GATEWAY_AUTH )
DEPLOY_PARAMETERS+=( TemplateSnippetS3UriBase=$TEMPLATE_SNIPPET_S3_URI_BASE )
DEPLOY_PARAMETERS+=( APiGatewayDefinitionTemplate=$API_GATEWAY_DEFINITION_TEMPLATE )
DEPLOY_PARAMETERS+=( CodePipelineName= )


if [[ "incorrect_args" -gt 0 ]]; then
    help_message; exit 1;
fi

if [ -z "$AWS_REGION" ]; then
	AWS_REGION=$(aws configure get region $AWS_ARGS)
fi

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )
AWS_SCRIPT_ARGS=$(buildAwsScriptArgs "$AWS_REGION" "$AWS_PROFILE" )

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --output text --query 'Account' $AWS_ARGS)


echo '
**********************************************************
  Checking custom build image
**********************************************************
'
ecr_repos=$(aws ecr describe-repositories $AWS_ARGS)
ecr_repo_uri=$(echo $ecr_repos | jq -r '.repositories[] | select(.repositoryName=="cdf-codebuild") | .repositoryUri')

if [ -z "$ecr_repo_uri" ]; then

  echo '
  **********************************************************
    Building and uploading the custom build image
     (can take quite a while if the first time!)
  **********************************************************
  '
  ecr_repo=$(aws ecr create-repository --repository-name "cdf-codebuild" $AWS_ARGS)
  ecr_repo_uri=$(echo $ecr_repo | jq -r '. | .repository.repositoryUri')
  ecr_hub=$(echo $ecr_repo_uri | cut -f1 -d"/")

  pushd cdf-codebuild-docker-image
  docker build -t $ecr_repo_uri .

  docker_login_pwd=$(aws ecr get-login-password $AWS_ARGS)
  eval "echo $docker_login_pwd | docker login --username AWS --password-stdin $ecr_hub"
  docker push $ecr_repo_uri
  popd

fi


echo '
**********************************************************
  Packaging the CloudFormation template and uploading to S3...
**********************************************************
'
aws cloudformation package \
  --template-file $root_dir/cicd/codepipeline.yaml \
  --output-template-file $root_dir/cicd/codepipeline-packaged.yaml \
  --s3-bucket $STAGING_ARTIFACT_STORE_BUCKET \
  $AWS_ARGS

echo '
**********************************************************
  Deploying the CloudFormation template
**********************************************************
'

echo "DEPLOY PARAMETERS:"
printf "%s\n" "${DEPLOY_PARAMETERS[@]}"

aws cloudformation deploy \
  --stack-name $CDF_CORE_REPO_NAME-cicd-$ENVIRONMENT \
  --template-file $root_dir/cicd/codepipeline-packaged.yaml \
  --parameter-overrides "${DEPLOY_PARAMETERS[@]}" \
  --capabilities CAPABILITY_NAMED_IAM \
  $AWS_ARGS

echo '
**********************************************************
  Cleaning up
**********************************************************
'
echo Cleaning up
rm -f $root_dir/cicd/codepipeline-packaged.yaml


echo '
**********************************************************
  Done!
**********************************************************
'
