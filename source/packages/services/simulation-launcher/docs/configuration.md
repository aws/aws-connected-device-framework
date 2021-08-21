# SIMULATION LAUNCHER CONFIGURATION

## Mandatory Configuration

The following represents mandatory configuration that can be provided at time of deployment via the modules `{env}-config.json` file:

```json
{
  "aws": {
    "s3": {
      /*
        The S3 bucketname where documents are stored
      */
      "bucket": "?"
    }
}
```

## Optional Configuration

The following represents optional configuration that can be provided at time of deployment via the modules `{env}-config.json` file. If a value is listed, this is the value that is bundled into the application as a default. You only need to specify a configuration value from the following if you need to change it:


```json
{
  "logging": {
    /*
      Application logging level. Set to (in order) error, warn, info, verbose, debug 
      or silly.
    */
    "level": "debug"
  }
}
```

## Required Configuration For Running Locally

As part of the deployment flow there is some configuration that is auto-discovered and set. If running the module locally, the following configuration will need defining manually via the modules's `{env}-config.json` file.

```json
{
  "aws": {
    /*
      The AWS account ID
    */
    "accountId": "?",
    /*
      The AWS region code 
    */      
    "region": "?",
    "ecs": {
      /*
        ECS cluster ID
      */
      "clusterId": "?",
      /*
        ECS subnet ID
      */
      "subnetIds": "?",
      /*
        ECS security group ID
      */
      "securityGroupId": "?",
      /*
        ECS task definition arn
      */
      "taskDefinitionArn": "?"
    }
  }
}
```
