# Deployment

Each deployable CDF service contains an `infrastructure/package.bash` and `infrastructure/deploy.bash` script to package and deploy the service to AWS.  Refer to each script for details on project specific options.

As each deployment may require environment specific properties, the `package.bash` and `deploy.bash` scripts accept a parameter providing the location to an external configuration file.

As an example, to deploy the asset library, the following external configuration file is required:

```sh
{
  "neptuneUrl": "",
  "aws": {
    "iot": {
      "endpoint": ""
    }
  }
}
```

The `deploy.bash` script would determine the correct information for the environment and automatically populate these values.

The deployment process would look as follows:

```sh
infrastructure/package-cfn.bash -b cdf-157731826412-us-east-1 -R us-east-1 -P deanhart-1577

./deploy.bash -e dean -p 157731826412 -i 0.0.0.0/0 -k 2d6d7741-3930-4556-ac69-2ea395bfec77 -b cdf-157731826412-us-east-1 -R us-east-1 -P deanhart-1577
```

In addition, a top level `deploy.bash` script orchestrates the deployment of the entire platform.  