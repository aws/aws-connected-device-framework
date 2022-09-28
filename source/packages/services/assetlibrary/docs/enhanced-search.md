# ASSET LIBRARY ENHANCED SEARCH

## Migrating from `full` mode to `enhanced` mode

Creating a new CDF Asset Library deployment is readily achieved by running the [CDF Installer](../../installer/README.md) which creates a Neptune database, an OpenSearch cluster, and serverless components that synchronize changes from Neptune to OpenSearch.
The migration of an _existing_ CDF Asset Library from `full` mode to `enhanced` mode, requires additional steps to import the existing data first.

There is no migration path from `lite` mode to `enhanced` mode.

The following instructions use the [Export Neptune to ElasticSearch](https://github.com/awslabs/amazon-neptune-tools/tree/master/export-neptune-to-elasticsearch) solution in a way that should be sufficient for most CDF Asset Library deployments.
Users are encouraged to review the solution's documentation for additional customization options and considerations related to large databases.

### Step 1: Update the CDF configuration file

1. Ensure that the [CDF Installer](../../installer/README.md) configuration file for the CDF deployment you want to migrate is available at the location where the CDF Installer expects it. For example, on Linux and macOS the CDF Installer expects the file to be located at a path formatted like: `~/aws-connected-device-framework/config/<aws-account-id>/<aws-region-name>/<cdf-environment-name>.json`. Recommended best practice is to check the configuration file(s) into source control.
2. [Configure your terminal/shell](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html) so that the AWS CLI has permissions to deploy CDF in the AWS account where the CDF deployment you wish to migrate is located. For example, you can set the `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_DEFAULT_REGION` environment variables.
3. Run the CDF Installer's configuration wizard: `cdf-cli deploy <cdf-environment-name> <aws-region-name> --dryrun`. The `--dryrun` option ensures that the CDF configuration file gets modified but the deployment is _not_ performed yet.

Confirm that the modified config file specifies `enhanced` mode and contains the configuration settings required to deploy enhanced search:

```json
{
  "environment": "<cdf-environment-name>",
  "region": "<aws-region-name>",
  "accountId": "<aws-account-id>",
  "assetLibrary": {
    "mode": "enhanced",
    "openSearchDataNodeInstanceType": "**.******.search",
    "openSearchDataNodeInstanceCount": x,
    "openSearchEBSVolumeSize": xx
  }
}
```

Note: In the configuration file snippet above, only relevant fields are shown for illustration. The actual file is much longer.

### Step 2: Pause Asset Library database changes

No changes should be made to the Asset Library database until the initial data import is complete.
Take the appropriate steps to temporarily stop write traffic to the Asset Library database, for example by switching your CDF Facade to maintenance mode.

### Step 3: Deploy the updated configuration file

Deploy the updated CDF configuration with the command

```sh
cdf-cli deploy <cdf-environment-name> <aws-region-name> -c ~/aws-connected-device-framework/config/<aws-account-id>/<aws-region-name>/<cdf-environment-name>.json
```

Confirm that this created a new CloudFormation stack named `cdf-assetlibrary-enhancedsearch-<cdf-environment-name>`.

### Step 4: Deploy the "Export Neptune to ElasticSearch" solution

1. Log into the AWS Console account that contains the CDF deployment you wish to migrate.
This ensures that clicking the link in the next step opens in the correct account.
2. Launch the Neptune-to-ElasticSearch CloudFormation stack.
You can do so by clicking the link for the AWS region that contains the CDF deployment you wish to migrate in the [installation instructions for the "Export Neptune to ElasticSearch" solution](https://github.com/awslabs/amazon-neptune-tools/blob/master/export-neptune-to-elasticsearch/readme.md#installation). The table below shows suggested values for the stack parameters. Keep the stack name as the default `neptune-index`.
3. Acknowledge the CloudFormation templates' use of IAM capabilities at the bottom of the form.

Stack parameters for the Neptune-to-ElasticSearch CloudFormation stack:

| Stack parameter | Value |
| --- | --- |
| _Network Configuration_ |
| VPC | The `VpcId` output of the stack `cdf-network-<cdf-environment-name>` |
| Subnet1 | The first comma-separated value in the `PrivateSubnetIds` of the stack `cdf-network-<cdf-environment-name>` |
| _Neptune Configuration_ |
| NeptuneEndpoint | The `DBClusterReadEndpoint` output of the stack `cdf-assetlibrary-neptune-<cdf-environment-name>` |
| NeptunePort | Keep default `8182`
| NeptuneEngine | Select `gremlin` |
| ExportScope | Select `all` |
| CloneCluster | Select `yes` |
| NeptuneClientSecurityGroup | The `NeptuneSecurityGroupID` output of the stack `cdf-assetlibrary-neptune-<cdf-environment-name>` |
| AdditionalParams | Leave empty |
| _ElasticSearch Configuration_ |
| ElasticSearchEndpoint | The `OpenSearchDomainEndpoint` output of the stack `cdf-assetlibrary-enhancedsearch-<cdf-environment-name>` _without the `https://` prefix_. |
| NumberOfShards | Keep default. Only change if you modified the `NumberOfReplica` parameter of the stack `cdf-assetlibrary-enhancedsearch-<cdf-environment-name>`. |
| NumberOfReplica | Keep default. Only change if you modified the `NumberOfShards` parameter of the stack `cdf-assetlibrary-enhancedsearch-<cdf-environment-name>`. |
| GeoLocationFields | Leave empty |
| ElasticSearchClientSecurityGroup | The `HTTPSAccessSG` output of the stack `cdf-assetlibrary-enhancedsearch-<cdf-environment-name>` |
| _Advanced_ |
| Concurrency | Keep default |
| KinesisShardCount | Keep default |
| BatchSize | Keep default |

Confirm that the CloudFormation stack `neptune-index` exists and has status `CREATE_COMPLETE`.

Note that the `neptune-index` CloudFormation stack contains a nested stack named `neptune-index-EbsVolumeSizeStack-xxxxxxxxxxxx`.
You will not interact with this nested stack directly.

### Step 5: Use the "Export Neptune to ElasticSearch" solution

Invoke the AWS Lambda function created as part of the `neptune-index` CloudFormation stack.

You can do either by navigating to the AWS Lambda console or the AWS CLI.

Using the AWS CLI, copy the invoke command from the `StartExportCommand` stack output of the `neptune-index` stack and run it from the terminal/shell configured in [Step 1](#step-1-update-the-cdf-configuration-file).

Alternatively, in the console, navigate to the function named `export-neptune-to-kinesis-xxxx` and invoke it.

### Step 6: Resume Asset Library database changes

At this point, all existing Asset Library data has been synchronized into the OpenSearch cluster and is available for search queries that include enhanced search operators (see [swagger.yml](./swagger.yml) for examples).
Incremental changes to the Amazon Neptune database content can resume.

Reverse the steps you have taken in [Step 2](#step-2-pause-asset-library-database-changes).

### Step 7: Clean Up

Delete the "Export Neptune to ElasticSearch" solution by removing the CloudFormation stack created in [Step 4](#step-4-deploy-the-export-neptune-to-elasticsearch-solution).
