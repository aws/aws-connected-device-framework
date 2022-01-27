# Asset Library Export: Walkthrough

## Introduction

The CDF Asset Library Export module is a module which exports the Asset Library Data to a S3 Bucket. From a 10,000 foot view, the module comprises a Step Function workflow which executes the Asset Library Export module to export the data in batches to an S3 bucket in JSON format.

The Core of the export process is the Asset Library Export module which can be configured pre-deployment to specify the criteria and fine-tune the export process. The configuration would include specifying criteria such as the export destination, fine-tuning the batch sizes.

The export process will rely on making 2-step queries to the Neptune database. The first one to create ranges for particular entities that are batched, with the second of queries performed per batch to retrieve the data in bulk. The 2-step query of the export process is designed to minimize the queries needed to be made to the Neptune Database and reduce the overall cost of execution. This also provides an added benefit of not overloading the database with unnecessary load incurred by the export process.

**Note** The Asset Library Export module can export entities upto 1 million records before optimization of batch sizes and Lambda concurrency and memory is required.

## Configuration

Once the Asset Library Export module is deployed, the `stateMachineArn` CloudFormation export value can be referenced to integrate the step function execution with an external trigger such as a CloudAatch alarm.

Workflows to execute upon the completion of the export process may be integrated via the SNS topic referenced by the `exportCompletionSnsTopic` CloudFormation export value.
