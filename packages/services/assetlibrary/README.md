# ASSET LIBRARY REST API

## Introduction

The Asset Library service is a device registry that allows you to manage your fleet of devices within multiple hierarchical groups.  Each one of the branches of the hierarchy can represent something meaningful to your business such as location, device types, firmware versions, etc.

The hierarchies within Asset Library are represented as Groups.  Each Group has a single parent, but can comprise of many groups and/or devices as its children.

Different Group Types can be created to align with your business, with each Group Type having its own attributes.  An example Group Type could be a `Site`, with its `address` being an example of an attribute.

Likewise, Device Types can be created to represent the different types of devices within your fleet, each with their own attributes.

## Neptune

Neptune runs behind a VPC, therefore for local development you need to open a tunnel via a bastion instance..

Within the `157731826412` account we have the following bastion:

- `ec2-52-35-43-252.us-west-2.compute.amazonaws.com`

Add your ip to the `bastion` security group which will allow access to the above bastion host.

To allow your application running locally to access Neptune, perform the following (contact Dean Hart if you need the `157731826412` key pair):

- Add the following to `~/.ssh.config`:

```sh
host neptune_local
 HostName ec2-52-35-43-252.us-west-2.compute.amazonaws.com
 Localforward 8182 neptunedbcluster-e077gyvb28vm.cluster-chb0ksjujpzh.us-west-2.neptune.amazonaws.com:8182
 User ec2-user
```

- Then open a tunnel:

```sh
ssh -i ~/.ssh/157731826412.pem neptune_local
```

## Quickstart

Refer to `/docs/development/local_development.md` of the `documentation` project.

## Known Issues

The `SchemaValidatorService` tests are failing when running via `npm run test`.  As part of this command, the typescript files are transpiled to javascript.  The `import * as Ajv from 'ajv'` statement functions fine in typescript, but is failing when transpiled to javascript.  Need to investigate further.
