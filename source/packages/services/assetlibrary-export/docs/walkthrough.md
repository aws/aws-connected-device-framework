# Asset Library Export: Walkthrough

## Introduction

The CDF Asset Library Export module is a module which exports the Asset Library Data to a S3 Bucket. From a 10,000 foot overview, 
the module comprises a Step Function workflow which executes the assetlibrary export module to export the data in 
batches to an S3 bucket in JSON format.

The Core of the export process is the CDF Export module which can be configured pre-deployment to specify the criteria 
and fine-tune the export process. The configuration would include specifying criteria such as the export destination, 
Fine-tuning the batch sizes.

The export process will rely on making a 2-step queries to the Neptune database, the first one to create ranges for particular
entities and will be batched and another set of query will be performed per batch to retrieve 
the data in bulk. The 2-step query of the export process is designed to minimize the queries needed to be made to 
Neptune Database and reduce the overall cost of execution. This also provides an added benefit of not overloading the 
database with unnecessary load incurred by the export process.

**Note** The Asset Library export module can export entities upto 1 million records before optimization of batch sizes 
and Lambda concurrency & memory is required.

## Configuration

Once the Asset library Export module is deployed, the user can reference the 'stateMachineArn' cloudformation export to 
integrate the step function execution with an external trigger such as a cloudwatch alarm.

The user could also integrate workflows which needs to be executed upon the completion of the export process by integrating
the cloud formation export sns topic 'exportCompletionSnsTopic'.
