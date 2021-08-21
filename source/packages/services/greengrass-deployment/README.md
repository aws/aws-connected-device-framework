# GREENGRASS AGENTBASED CORE DEPLOYMENTS OVERVIEW

## Introduction

The _Greengrass Deployment_ service provides a scalable way to deploy greengrass core software to an actual physical device.

The service utilizes SSM to activate the device as a hybrid instance and creates state manager associations which run Ansible playbooks to remotely configure and install the greengrass core software on the physical device.

## Architecture

The following represents the architecture of the Greengrass Deployment Service

![Architecture](<docs/images/hla.png>)

## Pre-requisites
To successfully deploy greengrass core software on the device. There are a few pre-requisits that must be met.

+ Greengrass group successfully deployed
+ Greengrass Core Associated with the group
+ Ansible Playbook stored in S3 for SSM State Manager
+ SSM Agent, Ansible and any other device side dependencies such as (Python or Node) on the device.

## Additional Links

- [Application configuration](docs/configuration.md)
- [Design](docs/design.md)
- [Walkthrough](docs/walkthrough.md)
- [Swagger](docs/swagger.yaml)
