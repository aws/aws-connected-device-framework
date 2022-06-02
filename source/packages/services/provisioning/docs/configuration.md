# PROVISIONING CONFIGURATION

The recommended way to create a local configuration file for the Provisioning service is through CDF's [installer](../../installer/README.md#deployment-using-wizard).
## Configuration for Running Locally

Once you have deployed CDF to your AWS account, you can generate `.env` file to be used for your local development.

The instructions to generate the local `.env` file can be found [here](../../installer/README.md#local-development). The `.env` file will be populated with resources and options that are specified during the deployment wizard flow.

## Optional Configuration

Default properties can be found in [here](../src/config/.env.defaults). Below are the properties that you can override.

```sh
# If using AWS ACM PCA, and PCA is configured in a separate account, specify the cross-account IAM role to assume
ACM_PCA_CROSS_ACCOUNT_ROLE_ARN=
# The S3 key prefix where bulk requests are stored
AWS_S3_BULKREQUESTS_PREFIX=bullkrequests/
# The S3 key prefix where templates are stored
AWS_S3_TEMPLATES_PREFIX=templates/
# The S3 key suffix where templates are stored
AWS_S3_TEMPLATES_SUFFIX=.json
# The allowed CORS origin to validate requests against.
CORS_ORIGIN=*
#  The allowed CORS headers to expose.
CORS_EXPOSED_HEADERS=content-type,location
# If a custom domain has been configured for this module, specifying its base path here will remove 
# the base path from the request to allow the module to map the incoming request to the correct lambda handler
CUSTOMDOMAIN_BASEPATH=
# he default expiration days for new certificates
DEVICE_CERTIFICATE_EXPIRY_DAYS=365
# Feature toggle. If enabled, will delete certificates when a thing is deleted and the certificate is no longer in use.
FEATURES_DELETE_CERTIFICATES=true
# Feature toggle. If enabled, will delete policies when a thing is deleted and the policiy is no longer in use.
FEATURES_DELETE_POLICIES=true
LOGGING_LEVEL=info
```

## AWS ACM PCA in a Multi-Account Environment

If using AWS ACM PCA, and PCA is configured in a separate account, you can specify the cross-account IAM role to assume. The steps to configure this are as follows:

1. Create an IAM role in the PCA account that grants access to `acm-pca:IssueCertificate` and `acm-pca:GetCertificate` actions.
2. Provide the IAM Role ARN from the previous step during the install of the CDF provisioning module.
3. Once the CDF provisioning module is deployed, obtain the Provisioning REST API lambda function execution role arn which is stored as the `LambdaExecutionRoleArn` output of the CDF provisioning module CloudFormation stack.
4. Modify the trust policy of the IAM role created in step 1 by adding the lambda execution role ARN from step 3 as an allowed principal of `sts:AssumeRole`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/cdf-provisioning-<env>-LambdaExecutionRole-<suffix>"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Refer to [How do I configure a Lambda function to assume an IAM role in another AWS account?](https://aws.amazon.com/premiumsupport/knowledge-center/lambda-function-assume-iam-role/) for further information.