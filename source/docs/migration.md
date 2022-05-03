# Migration of backward incompatible changes

While we endeavor to always make backward compatible changes, there may be times when we need to make changes that are not backward compatible. If these changes are made at the API level then the affected modules REST API vendor mime types will be versioned supporting both new and old versions, as well as the modules minor version bumped. But if the change affect something else such as how configuration is handled, or how applications are deployed, then the major versions of the modules will be bumped with migration notes added here.

## Migrating from Release <=1.0.10 to 1.0.11

### Asset Library is now optional modules

Since CDF version 1.0.6, `assetLibrary` is always deployed when you select `greengrass2Provisioning`, `commands` , or `commandAndControl` modules.

In this release, a new question is added to these modules to check if `assetLibrary` to make the dependency explicit. Now you can deploy these services without `assetLibrary` (removing the capability to select devices by assetLibrary query).

If you had deployed one of these modules (`greengrass2Provisioning`, `commands` , or `commandAndControl`) but did not use the functionality that `assetLibrary` provides, you can re-run the deployment wizard and answer `No`  for this question.

```bash
Greengrass V2 Provisioning...
? When using the Asset Library module as an enhanced device registry, the Greengrass2 Provisioning module can use it to help search across devices and
 groups to define the deployment targets. You have not chosen to install the Asset Library module - would you like to install it?
Note: as there is additional cost associated with installing the Asset Library module, ensure you familiarize yourself with its capabilities and benef
its in the online CDF github documentation
```

This should re-generate the new configuration file with the right settings. Once the deployment is finished, you can then manually delete the `assetLibrary` stack.

## Migrating from Release <=1.0.9 to 1.0.10

### Asset Library Fine Grained Access Control (FGAC)

These changes only affect Asset Library users who have FGAC enabled.

Prior to 1.0.10, FGAC authorization was carried out by traversing all outgoing relations from groups/devices until a group hierarchy a user is authorized to is found. This has been enhanced so now one can specify which outgoing relations are to be included in the checks thus making the authorization checks more efficient. This is carried out by setting the new `includeInAuth` property to `true` when defining a relation between 2 types. Refer to [Fine Grained Access Control](../packages/services/assetlibrary/docs/fine-grained-access-control.md) for more details.

## Migrating from Release <=1.0.5 to Release 1.0.6

### Application configuration

In prior release of CDF the modules use [node-config](https://github.com/node-config/node-config) to organize hierarchical configuration which allows us to define default parameters, and extend it to different deployment environments. There are some limitations with `node-config` that prevents [tree shaking](https://webpack.js.org/guides/tree-shaking/) to be applied to reduce the size of the lambda's bundles. As a first step for us to apply tree shaking to CDF services, `node-config` is now replaced with [dotenv flow](https://github.com/kerimdzhanov/dotenv-flow).

This change has 3 impacts: 
- The CDF infrastructure configuration project that contained a json configuration file per module per environment is now replaced with a single json configuration file per environment. This file is auto-created by the new `installer` module (see next section)
- All CloudFormation stacks that allow for application configuration passing to override defaults previously accepted a `node-config` json configuration file. These now accept a `dot-env` multi-line string comprising key–value pairs for properties (in the format of [INI](https://en.wikipedia.org/wiki/INI_file) files.  More details of this configuration can be found in `docs/configuration.md` within each CDF module folder.
- If deploying CDF using the new installer module then the installer will take care of creating the configuration file for you. However, if running a CDF module locally you need to define the application configuration. The installer has a mode where it can auo-generate the local application configuration for you based on an existing CDF deployment.

### New `installer` module

In prior release of CDF, the deployment of modules was carried out using bash scripts. We are introducing the [installer module](../packages/services/installer/README.md) to simplify the deployment process. The new installer will run through a sequence of questions to determine what `parameters` need to be provided to deploy each module. 

>**Its highly advised to run through the new installer in a non-production AWS environment to look at the generated CloudFormation (and its change sets) to understand the potential modification to your existing AWS resources.**  

There are no changes on the CloudFormation definition of the stateful resources and or on the CloudFormation stack name itself. If you had deployed CDF in the past, as long as your answer in the installer wizard matches with the your current deployment the upgrade process should be seamless. The main changes within CloudFormation are mainly related to application configuration changes specified in the section above.

>**In production environment, its highly advised to take a snapshot of the stateful resources (e.g Neptune, DynamoDB) before re-deploying the services with this new installer.**  
## Migrating from pre-open source version (CodeCommit repo) to open source version (GitHub repo)

NOTE: The initial release of this open source version did not include the _greengrass-provisioning_ and _greengrass-deployment_ modules as their implementation was based on Greengrass V1. New versions of these modules supporting Greengrass V2 were released at a later date.

### Introduction

Prior to this open source version of CDF, this CDF project had a different directory structure as well as a slightly different method of deploying. These changes were required as part of making CDF open source. 

Unfortunately, this introduces backwards incompatible changes to the deployment process. Note there are no changes to how the modules themselves function or the API's they expose, but for existing users who installed CDF prior to open sourcing, their CDF deployment must be updated to continue to be able to merge and deploy updates.

The intended upgrade path requires a backup of databases, the tearing down of existing CDF deployment, redeploying, and restoring the backups. This will require an outage therefore will need to be carried out as part of planned maintenance for production environments. 

It is highly recommended that any migration is tested in non-production environments before attempting to migrate in production!
#### Required Changes Prior to Migration

##### Module configuration and deploy script changes (_cdf-infrastructure-*_ project)

**Pre open-source version**

A reference `cdf-infrastructure-demo` project was provided which had a configuration file per module per environment. This reference project was used as a base to configure modules unique to the deployed environment. 

This project also contained a `deploy.bash` script that in addition to deploying and configuring customer specific applications, was responsible for invoking `aws-connected-device-framework/source/infrastructure/deploy-core.bash` to deploy the core CDF modules.

**Open-source version**

Until CDF version 1.0.5, a separate folder `cdf-infrastructure-*` outside this repo was expected to house configuration data in JSON format. This has now been replaced by the [CDF installer](../packages/services/installer/README.md).

The `cdf-core` project is renamed to `aws-connected-device-framework`. 

The CDF modules within `aws-connected-device-framework` are now located at `source/packages/services/**`. Any references in deploy scripts will need to be updated.

**Change Required**

Any references to `cdf-core` from existing `cdf-infrastructure-*/deploy.bash` scripts need to be updated as well as possibly updating the path to individual modules if referenced.

####  Consuming application changes (e.g. _cdf-facade-*_ projects)

**Change Required**

Depending on the implementation of the facade project, the new release could potentially affect the integration between the facade and cdf-core. To mitigate this risk, the integration point between cdf-core and the facade should be reviewed and updated as needed.

> **Note**: Validate that your facade Cloudformation stack has no direct dependencies on the Cloudformation outputs of the old cdf-core

### Migration Steps
#### Networking Migration

If CDF is configured to create its own VPC, the open-source version creates stricter `NetworkAclEntry` rules than the pre open-source version. If you have custom applications accessing the CDF VPC, you may need to add additional custom `NetworkAclEntry`'s (see `../infrastructure/cloudformation/cfn-networking.yaml`).

#### SQS

Ensure that there are no unprocessed messages in the SQS queues before the database migration to avoid inconsistency. 

Sample command to retrieve the number of messages in the queue

```bash
$ aws sqs  get-queue-attributes --queue-url <queue url> --attribute-names ApproximateNumberOfMessages
```

You can do this by restricting any post or patch operation into the cdf modules specified below to prevent the modification or addition of new resources. 

List of modules and the related SQS resources

| CloudFormation template     | Queue CloudFormation Resource     |
| --------------------------- | --------------------------------- |
| cfn-certificaterenewer      | CertificateRenewerProcessingQueue |
| cfn-eventProcessor          | AsyncProcessingQueue              |
| cfn-greengrass-deployment   | AgentbasedDeploymentQueue         |
| cfn-greengrass-deployment   | AgentlessDeploymentQueue          |
| cfn-greengrass-deployment   | SSMStateChangeEventsQueue         |
| cfn-greengrass-provisioning | GroupTasksQueue                   |
| cfn-greengrass-provisioning | DeviceAssociationQueue            |
| cfn-greengrass-provisioning | DeploymentsQueue                  |
| cfn-greengrass-provisioning | BulkDeploymentsStatusQueue        |
| cfn-greengrass-provisioning | DeploymentStatusQueue             |

#### Backup of Databases

CDF utilizes Amazon Neptune and DynamoDB as its datastores. This migration requires databases to be backed up and restored after the update.

##### Neptune

CDF Asset Library utilizes Amazon Neptune as its datastore. To migrate Neptune, navigate through the console and take the snapshot of the db writer instance. Refer to the [official docs](https://docs.aws.amazon.com/neptune/latest/userguide/backup-restore-create-snapshot.html) for more info.

Alternatively, the `aws-cli` can be used:

```bash
$ aws neptune create-db-cluster-snapshot --db-cluster-identifier <neptune cluster identifier> --db-cluster-snapshot-identifier <snapshot-identifier>
```

>**DANGER!**:
> The `db-cluster-snapshot-identifier` is what names the generated snapshot. This value should be provided to the deploy scripts in order to create a new cluster based on the existing snapshot. Once a cluster has been created from a snapshot, that same snapshot identifier must be provided on all future runs of the deployment script. If not, a new cluster with an empty database will be created.

> **Its highly advised to take a snapshot of the Neptune database before performing any CDF upgrade (re-running of the deploy scripts). Once the "SnapshotIdentifier" configuration is set it should not be reverted** 

##### DynamoDB

CDF Commands, Greengrass Provisioning & Deployment, Asset Library History, Event Notifications, and the Bulk Certs modules utilize 1 or more DynamoDB tables. 

The CDF Notifications module (_events-processor_ and _events-alerts_ micro-services) uses DynamoDB streams. Before backing up and/or migrating, this stream must be disabled.

You can disable the stream from cli:
```bash
$ aws dynamodb update-table \
    --table-name <tableName> \
    --stream-specification StreamEnabled=false
```
or alternatively using the [console](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html#Streams.Enabling).

To find the name of the table, lookup the `Physical ID` of the `EventNotificationsTable` resource of the deployed `cfn-eventProcessor-<env>` CloudFormation stack.

The migration of DynamoDB tables can be performed by using the [@cdf/ddb-migrator](../packages/libraries/tools/ddb-migrator) utility which can copy from source to destination tables. Refer to its [docs](../packages/libraries/tools/ddb-migrator/README.md) for more information on the usage of the tool.

To sue `@cdf/ddb-migrator` you need to make sure that the DynamoDB table from the previous deployment is not being deleted when you perform an update. To ensure that the table is not deleted you should update the cloudformation for all CDF modules that has DynamoDB to have the [UpdateReplacePolicy](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-updatereplacepolicy.html) set to **Retain**, as shown in the code snippet below.

```yaml
JobsTable:
  Type: AWS::DynamoDB::Table
  UpdateReplacePolicy: Retain
```

> **Note**: 
The [@cdf/ddb-migrator](../packages/libraries/tools/ddb-migrator) utility utilizes DynamoDB scan functionality to copy data from a source to destination table. As this tool is infrastructure agnostic, it is highly advised to understand the scale of the data before executing the module. If the amount of data within the table cannot be migrated by running the tool locally, then the tool must be executed as a Fargate container or within an EC2 instance.

#### Notifications module

The Notifications module is comprised of two micro-services, [events-processor](../packages/services/events-processor/README.md) and [events-alerts](../packages/services/events-alerts/README.md). 

**Events Alerts Stack** references Events Processor through Cloudformation import as shown below:

```yaml
EventNotificationsSourceMapping:
  Type: AWS::Lambda::EventSourceMapping
  Properties: 
    EventSourceArn: 
      Fn::ImportValue: !Sub '${EventsProcessorStackName}-EventNotificationsStream'
    FunctionName: !Ref DynamoDBStreamLambdaFunction
    StartingPosition: LATEST
```

However, in this latest revision of the cfn-eventsProcessor, the export name is renamed as shown below:

```yaml
EventNotificationsStreamArn:
  Description: Event Notifications database table stream
  Value: !GetAtt EventNotificationsTable.StreamArn
  Export:
    Name: !Sub 'cdf-eventsProcessor-${Environment}-EventNotificationsStreamArn'
```

When you deploy the latest version of events processor, it will fail as the previous export (which will be deleted) is being used by **Events Alert**. The easiest way to resolve is to delete the **Events Alert** stack and then update the **Events Processor** stack to the latest version before re-deploying **Events Alerts**

#### Consuming applications (e.g. `cdf-facade-* projects`)

Once the data migration has been verified the last step is to re-deploy any consuming applications with a modified application configuration to include the updated CDF module REST API endpoints.


