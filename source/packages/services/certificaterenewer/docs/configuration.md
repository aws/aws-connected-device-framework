# CERTIFICATE RENEWER CONFIGURATION

## Required Configuration For Running Locally

As part of the deployment flow there is some configuration that is auto-discovered and set. If running the Asset Library locally, the following configuration will need defining manually via the Certificate Renewer's `{env}-config.json` file.

```json
{
  "aws": {
    "region": null,
    "accountId": null,
    "s3": {
      "certificates": {
        "bucket": null,
        "prefix": null,
        "suffix": null
      }
    },
    "dynamoDb": {
      "tables": {
        "certificates": null
      }
    }
  },
  "sqs": {
    "processingQueue": {
      "queueUrl": null,
      "batchSize": null
    },
    "dlqQueue": {
      "queueUrl": null
    }
  },
  "assetLibrary": {
    "mode": "lambda",
    "apiFunctionName": null,
    "enableValidation": false
  },
  "logging": {
    "level": "debug"
  }
}

```
