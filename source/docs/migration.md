# Migrating from pre-open source version

NOTE: The initial release of this open source version does not include the _greengrass-provisioning_ and _greengrass-deployment_ modules as their current implementation is based on Greengrass V1. Once they have been upgraded to use Greengrass V2 they will be released. It is recommended that

## Introduction

Prior to this open source version of CDF, this CDF project had a different directory structure as well as a slightly differnt method of deploying. These changes were required as part of making CDF open source. 

Unfortunately, this introduces backwards incompatible changes to the deployment process. Note there are no changes to how the modules themselves function or the API's they expose, but for existing users who installed CDF prior to open sourcing, their CDF deployment must be updated to continue to be able to merge and deploy updates.

The intended upgrade path requires a backup of databases, the tearing down of existing CDF deployment, redeploying, and restoring the backups. This will require an outage therefore will need to be carried out as part of planned maintenance for production environments. 

It is highly recommended that any migration is tested in non-production environments before attempting to migrate in production!
### Required Changes Prior to Migration

#### Module configuration and deploy script changes (_cdf-infrastructure-*_ project)

**Pre open-source version**

A reference `cdf-infrastructure-demo` project was provided which had a configuration file per module per environment. This reference project was used as a base to configure modules unique to the deployed environment. 

This project also contained a `deploy.bash` script that in addition to deploying and configuring customer specific applications, was responsible for invoking `aws-connected-device-framework/source/infrastructure/deploy-core.bash` to deploy the core CDF modules.

**Open-source version**

As this project is open-sourced as as single `aws/aws-connected-device-framework` git repo, there is no accompanying reference `cdf-infrastructure-*` project. Instead, details of how to build this configuration is well documented at [application configuration](./application-configuration.md).

The `cdf-core` project is renamed to `aws-connected-device-framework`. 

The CDF modules within `aws-connected-device-framework` are now located at `source/packages/services/**`. Any references in deploy scripts will need to be updated.

**Change Required**

Any references to `cdf-core` from existing `cdf-infrasturcture-*/deploy.bash` scripts need to be updated as well as possibly updating the path to individual modules if referenced.

###  Consuming application changes (e.g. _cdf-facade-*_ projects)

**Change Required**

Depending on the implementation of the facade project, the new release could potentially affect the integration between the facade and cdf-core. To mitigate this risk, the integration point between
cdf-core and the facade should be reviewed and updated as needed.

> **Note**: Validate that your facade Cloudformation stack has no direct dependencies on the Cloudformation outputs of the old cdf-core

## Migration Steps
### Networking Migration

If CDF is configured to create its own VPC, the open-source version creates stricter `NetworkAclEntry` rules than the pre open-source version. If you have custom applications accessing the CDF VPC, you may need to add additional custom `NetworkAclEntry`'s (see `../infrastructure/cloudformation/cfn-networking.yaml`).

### SQS

Ensure that there are no unprocessed messages in the SQS queues before the database migration to avoid inconsistency. 

Sample command to retrieve the number of messages in the queue

```
aws sqs  get-queue-attributes --queue-url <queue url> --attribute-names ApproximateNumberOfMessages
```

You can do this by restricting any post or patch operation into the cdf modules specified below to prevent the modification or addition of new resources. 

List of modules and the related SQS resources

| CloudFormation template                     | Queue CloudFormation Resource         |
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

### Backup of Databases

CDF utilizes Amazon Neptune and DynamoDB as its datastores. This migration requires databases to be backed up and restored after the update.
#### Neptune

CDF Asset Library utilizes Amazon Neptune as its datastore. To migrate Neptune, navigate through the console and take the snapshot of the db writer instance. Refer to the [officia docs](https://docs.aws.amazon.com/neptune/latest/userguide/backup-restore-create-snapshot.html) for more info.

Alternatively, the `aws-cli` can be used:

```bash
$ aws neptune create-db-cluster-snapshot --db-cluster-identifier <neptune cluster identifier> --db-cluster-snapshot-identifier <snapshot-identifier>
```

>**DANGER!**:
> The `db-cluster-snapshot-identifier` is what names the generated snapshot. This value should be provided to the deploy scripts in order to create a new cluster based on the existing snapshot. Once a cluster has been created from a snapshot, that same snapshot identifier must be provided on all future runs of the deployment script. If not, a new cluster with an empty database will be created.

> **Its highly advised to take a snapshot of the Neptune database before performing any CDF upgrade (re-running of the deploy scripts). Once the "SnapshotIdentifier" configuration is set it should not be reverted** 

#### DynamoDB

CDF Commands, Greengrass Provisioning & Deployment, Asset Library History, Event Notifications, and the Bulk Certs modules utilize 1 or more DynamoDB tables. 

The CDF Notifications module (_events-processor_ and _events-alerts_ micro-services) uses DynamoDB streams. Before backing up and/or migrating, this stream must be disabled.

You can disable the stream from cli:
```sh
aws dynamodb update-table \
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

### Notifications module

The Notifications module is comprised of two micro-services, [events-processor](../packages/services/events-processor/README.md) and [events-alerts](../packages/services/events-alerts/README.md). 

**Events Alerts Stack** references Events Processor through Cloudformation import as shown below

```yaml
EventNotificationsSourceMapping:
  Type: AWS::Lambda::EventSourceMapping
  Properties: 
    EventSourceArn: 
      Fn::ImportValue: !Sub '${EventsProcessorStackName}-EventNotificationsStream'
    FunctionName: !Ref DynamoDBStreamLambdaFunction
    StartingPosition: LATEST
```

However, in this latest revision of the cfn-eventsProcessor, the export name is renamed as shown below

```yaml
EventNotificationsStreamArn:
  Description: Event Notifications database table stream
  Value: !GetAtt EventNotificationsTable.StreamArn
  Export:
    Name: !Sub 'cdf-eventsProcessor-${Environment}-EventNotificationsStreamArn'
```

When you deploy the latest version of events processor, it will fail as the previous export (which will be deleted) is being used by **Events Alert**. The easiest way to resolve is to delete the **Events Alert** stack and then update the **Events Processor** stack to the latest version before re-deploying **Events Alerts**

### Consuming applications (e.g. `cdf-facade-* projects`)

Once the data migration has been verified the last step is to re-deploy any consuming applications with a modified application configuration to include the updated CDF module REST API endpoints.
