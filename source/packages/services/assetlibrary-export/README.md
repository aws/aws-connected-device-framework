# ASSET LIBRARY EXPORT SERVICE OVERVIEW

## Introduction
Asset Library export service exports the Asset Library Data to a S3 Bucket.

## Architecture

The following represents the architecture of the Asset Library Export Service

![Architecture](<docs/images/assetlibrary-export-design-hla.jpg>)

## Description

The CDF Asset Library Export Service is a service which exports the Asset Library Data to an S3 Bucket. From a 10,000 foot overview, the export process gets executed from a Cloudwatch event on a scheduled time. The trigger executes a Step Function workflow which executes the export service to export the data in batches to an S3 bucket in JSON format.

The Core of the export process is the CDF Export Service which can be configured pre-deployment to specify the criteria and fine-tune the export process. The configuration would include specifying criteria such as the export destination, criteria for versioning, Fine tuning the batch sizes, specifying the type of entities to be exported.

The export process will rely on making a 2 step queries to the Neptune database, the first one to grab all the devices ids and group paths, the ids, and paths will be batched and another set of query will be perform per batch to retrieve the data in bulk. The 2-step query of the export process is designed to minimize the queries needed to be made to Neptune Database and reduce the overall cost of execution. This also provides an added benefit of not overloading the database with unnecessary load incurred by the export process.

## Exported Data Structure

#### Exported Data S3 file path

```sh
{bucketname}/{prefix}/{partitionKey}/{entityType}/<batchId>.json

Example: s3://myexportbucket/assetlibrary-export/dt=2021-01-28/group/1c1fa080-611e-11eb-b2ad-bdf5c2fe0d72.json
```
#### Exported Data File Structure

```json
{
  "id":"0243f750-5fda-11eb-9f5c-19342fab816e",
  "type":"GROUP",
  "items":[{group}, ...]
}
```

## Additional Links

- [Application configuration](docs/configuration.md)
- [Design](docs/design.md)
