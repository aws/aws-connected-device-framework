# Deploying the Commands service

## Deployment Steps

- Create an Artifact bucket 'sam-deploy-bucket-username' in S3 to hold your deployment artifacts
- Build and zip the lambda artifacts and dependencies
- Run ./infrastructure/package-cfn.bash passing in the above created artifact bucket as parameter. This will package all artifacts into S3 bucket. Pass in 'cdf-auth' flag for deployment with custom authorizer. Optionally pass aws parameters such as aws region and aws profile.
- Run ./infrastructure/deploy-cfn.bash passing in deployment env, customer config location and kms key id as parameters. Optionally pass aws parameters such as aws region and aws profile.

Eg:
```sh
npm install && npm run build
aws s3 mb s3://sam-deploy-bucket-username --profile cdf
./infrastructure/package-cfn.bash \
	--cdf-artifacts-bucket sam-deploy-bucket-username \
  	--cdf-auth \
	--profile cdf
./infrastructure/deploy-cfn.bash \
	--cdf-env development \
	--cdf-config-location ../cdf-infrastructure-customer/commands/development-config.json \
	--profile cdf
```
