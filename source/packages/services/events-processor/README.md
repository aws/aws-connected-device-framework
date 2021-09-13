# NOTIFICATIONS: Overview

## Introduction

The `Events Processor` module, along with the `Events Alerts` module form the CDF Notification module.

The `Events Processor` module receives events from a number of different event sources (e.g. IoT Core, DynamoDB Streams, API Gateway), and filters the events to generate alerts based on a subscriber's notification settings.  Any generated alerts are then forwarded by the `Events Alerts` module on to a number of different targets (e.g. AppSync, SNS, or republished to IoT Core) as configured.

## Status

The current version of the Events Processor / Events Alerts supports the following:

- Event Sources:
    - IoT Core
    - DynamoDB table
- Subscription Targets:
    - Email
    - SMS
    - Mobile Push
    - DynamoDB

The following are work-in-progress, awaiting prioritization by customer demand:

- Event Sources:
    - API Gateway
- Subscription Targets:
    - AppSync (GraphQL)

## Additional Links
- [Application configuration](docs/configuration.md)
- [Design](docs/design.md)
- [Walkthrough](docs/walkthrough.md)
- [Swagger](docs/swagger.yml)
